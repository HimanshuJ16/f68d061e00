"""Deterministic UTC normalization, cutoff selection, and retrospective metrics."""

from __future__ import annotations

from bisect import bisect_right
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
import hashlib
import json
import math
from pathlib import Path
import re
from zoneinfo import ZoneInfo

UTC = timezone.utc
LONDON = ZoneInfo("Europe/London")
FIRST = date(2026, 1, 1)
LAST = date(2026, 1, 31)
ASSUMPTIONS = [
    "Civil-day pilot: each January 2026 decision date buys the next UK calendar day; exchange delivery schedules are not modelled.",
    "WINDFOR is hourly. Each hourly MW value is held constant for its two half-hours; this is an explicit alignment assumption, not two independent forecasts.",
    "FUELHH WIND actuals are hindsight and may be revised. They never influence forecast selection. WINDFOR and FUELHH may have different wind coverage; their difference is not a pure forecast-skill measure.",
    "Elexon publishTime is the eligibility timestamp; source ingestion latency is not reconstructed.",
    "Default 09:00 Europe/London is a pre-auction planning assumption. Half-hour errors include within-hour actual variability against a repeated hourly forecast.",
]


def stamp(value: str) -> datetime:
    if not isinstance(value, str):
        raise ValueError("Timestamp must be a string")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Timestamp requires an explicit UTC offset")
    return parsed.astimezone(UTC)


def iso(value: datetime) -> str:
    return (
        value.astimezone(UTC)
        .isoformat(timespec="microseconds" if value.microsecond else "seconds")
        .replace("+00:00", "Z")
    )


def cutoff_value(value: str) -> time:
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
        raise ValueError("cutoff must be HH:mm from 00:00 to 23:59")
    return time.fromisoformat(value)


def decision_value(value: str) -> date:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("decision_date must be YYYY-MM-DD in January 2026")
    result = date.fromisoformat(value)
    if not FIRST <= result <= LAST:
        raise ValueError("decision_date must be in January 2026")
    return result


def number(value):
    if value is None:
        return None
    if (
        isinstance(value, bool)
        or not isinstance(value, (int, float))
        or not math.isfinite(value)
        or value < 0
    ):
        raise ValueError("generation must be a finite non-negative number or null")
    return float(value)


def targets(delivery: date) -> list[datetime]:
    start = datetime.combine(delivery, time(), LONDON).astimezone(UTC)
    end = datetime.combine(delivery + timedelta(days=1), time(), LONDON).astimezone(UTC)
    return [
        start + timedelta(minutes=30 * n)
        for n in range(int((end - start).total_seconds() / 1800))
    ]


def normalize(forecasts: list[dict], actuals: list[dict]):
    """Collapse identical duplicates; conflicting same-key values become null, never arbitrary."""
    warnings = []
    output = []
    for kind, rows in (("WINDFOR", forecasts), ("FUELHH", actuals)):
        grouped = defaultdict(list)
        rejected = 0
        for row in rows:
            try:
                if not isinstance(row, dict):
                    raise ValueError("Source row must be an object")
                if row.get("dataset", kind) != kind or (
                    kind == "FUELHH" and row.get("fuelType", "WIND") != "WIND"
                ):
                    continue
                start = stamp(row["startTime"])
                publish = stamp(row["publishTime"])
                if (
                    start.second
                    or start.microsecond
                    or start.minute not in ((0,) if kind == "WINDFOR" else (0, 30))
                ):
                    raise ValueError("Unaligned timestamp")
                value = number(row.get("generation"))
                if kind == "WINDFOR" and not datetime(
                    2025, 12, 31, tzinfo=UTC
                ) <= publish < datetime(2026, 2, 1, tzinfo=UTC):
                    continue
                if kind == "FUELHH" and "settlementDate" in row:
                    delivery = date.fromisoformat(row["settlementDate"])
                    day_targets = targets(delivery)
                    period = row["settlementPeriod"]
                    if (
                        isinstance(period, bool)
                        or not isinstance(period, int)
                        or not 1 <= period <= len(day_targets)
                        or day_targets[period - 1] != start
                    ):
                        raise ValueError("Settlement period does not match startTime")
                if (
                    date(2026, 1, 2)
                    <= start.astimezone(LONDON).date()
                    <= date(2026, 2, 1)
                ):
                    grouped[(iso(start), iso(publish))].append(value)
            except (KeyError, TypeError, ValueError, OverflowError):
                rejected += 1
        duplicate_count = sum(len(v) - 1 for v in grouped.values())
        conflicts = sum(len(set(v)) > 1 for v in grouped.values())
        if rejected:
            warnings.append(f"{kind}: rejected {rejected} invalid source rows.")
        if duplicate_count:
            warnings.append(
                f"{kind}: collapsed {duplicate_count} duplicate rows; {conflicts} conflicting keys set to null."
            )
        output.append(
            [
                {
                    "startTime": key[0],
                    "publishTime": key[1],
                    "generation": values[0] if len(set(values)) == 1 else None,
                }
                for key, values in sorted(
                    grouped.items(),
                    key=lambda item: (stamp(item[0][0]), stamp(item[0][1])),
                )
            ]
        )
    return *output, warnings


def percentile(values: list[float], q: float):
    ordered = sorted(values)
    index = (len(ordered) - 1) * q
    lo = int(index)
    hi = math.ceil(index)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (index - lo)


def metrics(intervals: list[dict]) -> dict:
    errors = [i["errorMw"] for i in intervals if i["errorMw"] is not None]
    forecasts = [i["forecastMw"] for i in intervals if i["forecastMw"] is not None]
    actuals = [i["actualMw"] for i in intervals if i["actualMw"] is not None]
    return {
        "pairedIntervals": len(errors),
        "expectedIntervals": len(intervals),
        "forecastIntervals": len(forecasts),
        "actualIntervals": len(actuals),
        "maeMw": sum(map(abs, errors)) / len(errors) if errors else None,
        "biasMw": sum(errors) / len(errors) if errors else None,
        "rmseMw": (
            math.sqrt(sum(e * e for e in errors) / len(errors)) if errors else None
        ),
        "p90AbsoluteErrorMw": (
            percentile(list(map(abs, errors)), 0.9) if errors else None
        ),
        "maxOverforecastMw": max(0.0, max(errors)) if errors else None,
        "forecastEnergyMwh": (
            sum(forecasts) * 0.5
            if len(forecasts) == len(intervals) and intervals
            else None
        ),
        "actualEnergyMwh": (
            sum(actuals) * 0.5 if len(actuals) == len(intervals) and intervals else None
        ),
    }


class Snapshot:
    def __init__(self, content: dict):
        if not isinstance(content, dict):
            raise ValueError("Snapshot root must be an object")
        if content.get("schemaVersion") != 1:
            raise ValueError("Unsupported snapshot schema")
        self.provenance = content["provenance"]
        if (
            not isinstance(self.provenance, dict)
            or not isinstance(content["forecasts"], list)
            or not isinstance(content["actuals"], list)
        ):
            raise ValueError("Malformed snapshot structure")
        stamp(self.provenance["retrievedAt"])
        sources = self.provenance.get("sources")
        identifier = self.provenance.get("snapshotId")
        if (
            not isinstance(sources, list)
            or not sources
            or not isinstance(identifier, str)
            or not identifier
        ):
            raise ValueError("Missing provenance")
        for source in sources:
            if (
                not isinstance(source, dict)
                or not all(isinstance(source.get(k), str) for k in ("dataset", "url"))
                or type(source.get("records")) is not int
                or source["records"] < 0
            ):
                raise ValueError("Invalid source provenance")
        if not isinstance(self.provenance.get("warnings", []), list) or not all(
            isinstance(w, str) for w in self.provenance.get("warnings", [])
        ):
            raise ValueError("Invalid audit warnings")
        if identifier.startswith("sha256:") and identifier != snapshot_id(
            content["forecasts"], content["actuals"]
        ):
            raise ValueError("Snapshot integrity hash mismatch")
        self.forecasts, self.actuals, audit = normalize(
            content["forecasts"], content["actuals"]
        )
        if audit:
            # Snapshot must already be normalized. Reject corrupt committed input.
            raise ValueError("Invalid normalized snapshot: " + "; ".join(audit))
        if not self.forecasts or not self.actuals:
            raise ValueError("Snapshot has no usable forecasts or actuals")
        self.index = defaultdict(list)
        for row in self.forecasts:
            for offset in (0, 30):
                start = stamp(row["startTime"]) + timedelta(minutes=offset)
                self.index[start].append((stamp(row["publishTime"]), row["generation"]))
        for rows in self.index.values():
            rows.sort(key=lambda r: r[0])
        self.actual_index = {}
        for row in self.actuals:
            start, publish = stamp(row["startTime"]), stamp(row["publishTime"])
            if start not in self.actual_index or publish > self.actual_index[start][0]:
                self.actual_index[start] = (publish, row["generation"])

    @classmethod
    def load(cls, path: Path):
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def analyze(self, cutoff: str) -> dict:
        cut = cutoff_value(cutoff)
        days = []
        for day_index in range((LAST - FIRST).days + 1):
            decision = FIRST + timedelta(days=day_index)
            delivery = decision + timedelta(days=1)
            deadline = datetime.combine(decision, cut, LONDON).astimezone(UTC)
            intervals = []
            for period, start in enumerate(targets(delivery), 1):
                candidates = self.index.get(start, [])
                # The publication boundary is inclusive and independently evaluated for every target.
                pick = bisect_right([r[0] for r in candidates], deadline) - 1
                publish, forecast = candidates[pick] if pick >= 0 else (None, None)
                actual = self.actual_index.get(start, (None, None))[1]
                intervals.append(
                    {
                        "startTime": iso(start),
                        "settlementPeriod": period,
                        "sourceStartTime": (
                            iso(start.replace(minute=0)) if publish else None
                        ),
                        "forecastMw": forecast,
                        "actualMw": actual,
                        "errorMw": (
                            forecast - actual
                            if forecast is not None and actual is not None
                            else None
                        ),
                        "publishTime": iso(publish) if publish else None,
                        "leadHours": (
                            (start - publish).total_seconds() / 3600
                            if publish
                            else None
                        ),
                    }
                )
            days.append(
                {
                    "decisionDate": decision.isoformat(),
                    "deliveryDate": delivery.isoformat(),
                    "cutoffTime": deadline.astimezone(LONDON).isoformat(),
                    "intervals": intervals,
                    "metrics": metrics(intervals),
                }
            )
        all_intervals = [i for d in days for i in d["intervals"]]
        provenance = dict(self.provenance)
        provenance["warnings"] = list(
            dict.fromkeys(ASSUMPTIONS + provenance.get("warnings", []))
        )
        missing_f = sum(i["forecastMw"] is None for i in all_intervals)
        missing_a = sum(i["actualMw"] is None for i in all_intervals)
        if missing_f or missing_a:
            provenance["warnings"].append(
                f"At cutoff {cutoff}, {missing_f} forecast and {missing_a} actual half-hours are unavailable; no gaps are interpolated."
            )
        return {
            "cutoff": cutoff,
            "timezone": "Europe/London",
            "days": days,
            "metrics": metrics(all_intervals),
            "provenance": provenance,
        }


def snapshot_id(forecasts, actuals):
    return (
        "sha256:"
        + hashlib.sha256(
            json.dumps(
                {"forecasts": forecasts, "actuals": actuals},
                sort_keys=True,
                separators=(",", ":"),
            ).encode()
        ).hexdigest()
    )
