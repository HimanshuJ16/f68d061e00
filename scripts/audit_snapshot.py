"""Independent January 2026 raw-cache audit; Python standard library only.

Run from any directory:
    python scripts/audit_snapshot.py --api-url http://127.0.0.1:8000
No backend modules are imported. No network request occurs unless --api-url is set.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
import hashlib
import json
import math
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
UTC = timezone.utc
WINDOW_START = datetime(2026, 1, 2, tzinfo=UTC)
WINDOW_END = datetime(2026, 2, 2, tzinfo=UTC)


def stamp(value):
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    assert parsed.tzinfo is not None, f"Naive timestamp: {value}"
    return parsed.astimezone(UTC)


def iso(value):
    return value.isoformat().replace("+00:00", "Z")


def valid_number(value):
    return value is None or (
        isinstance(value, (int, float)) and not isinstance(value, bool)
        and math.isfinite(value) and value >= 0
    )


def close(actual, expected, location):
    if expected is None:
        assert actual is None, f"{location}: {actual} != null"
    else:
        assert actual is not None and math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-8), (
            f"{location}: {actual} != {expected}"
        )


def metrics(rows):
    # Independent arithmetic, deliberately not importing the application engine.
    errors = [r["forecastMw"] - r["actualMw"] for r in rows
              if r["forecastMw"] is not None and r["actualMw"] is not None]
    absolute = sorted(abs(e) for e in errors)
    n = len(errors)
    rank = (n - 1) * 0.9 if n else 0
    low, high = math.floor(rank), math.ceil(rank)
    p90 = absolute[low] + (absolute[high] - absolute[low]) * (rank - low) if n else None
    fc = [r["forecastMw"] for r in rows if r["forecastMw"] is not None]
    ac = [r["actualMw"] for r in rows if r["actualMw"] is not None]
    return {
        "pairedIntervals": n, "expectedIntervals": len(rows),
        "forecastIntervals": len(fc), "actualIntervals": len(ac),
        "maeMw": sum(absolute) / n if n else None,
        "biasMw": sum(errors) / n if n else None,
        "rmseMw": math.sqrt(sum(e * e for e in errors) / n) if n else None,
        "p90AbsoluteErrorMw": p90,
        "maxOverforecastMw": max(0, max(errors)) if n else None,
        "forecastEnergyMwh": sum(fc) * 0.5 if len(fc) == len(rows) else None,
        "actualEnergyMwh": sum(ac) * 0.5 if len(ac) == len(rows) else None,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", help="Optional running API origin for independent output comparison")
    parser.add_argument("--report", type=Path, default=ROOT / "docs" / "DATA-AUDIT.md")
    args = parser.parse_args()
    started = datetime.now(UTC)
    snapshot_bytes = (ROOT / "data" / "snapshot.json").read_bytes()
    snapshot = json.loads(snapshot_bytes)
    assert snapshot["schemaVersion"] == 1
    canonical_payload = json.dumps(
        {"forecasts": snapshot["forecasts"], "actuals": snapshot["actuals"]},
        sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")
    assert snapshot["provenance"]["snapshotId"] == "sha256:" + hashlib.sha256(canonical_payload).hexdigest()
    raw_sets, source_counts, source_files, duplicates = {}, Counter(), {}, Counter()

    for dataset in ("WINDFOR", "FUELHH"):
        normalized = {}
        files = sorted((ROOT / "work" / "source-cache").glob(f"{dataset}-????-??-??.json"))
        assert len(files) == (32 if dataset == "WINDFOR" else 31), f"Unexpected {dataset} file count"
        for path in files:
            raw = json.loads(path.read_bytes())
            assert isinstance(raw, list), f"Non-array raw response: {path.name}"
            meta = json.loads(path.with_suffix(".meta.json").read_bytes())
            assert meta["url"].startswith("https://data.elexon.co.uk/bmrs/api/v1/datasets/" + dataset + "/stream?")
            source_files[meta["url"]] = len(raw)
            source_counts[dataset] += len(raw)
            for row in raw:
                assert row["dataset"] == dataset
                if dataset == "FUELHH":
                    assert row["fuelType"] == "WIND"
                target, publication = stamp(row["startTime"]), stamp(row["publishTime"])
                assert target.second == 0 and target.microsecond == 0
                assert target.minute == 0 if dataset == "WINDFOR" else target.minute in (0, 30)
                value = row["generation"]
                assert valid_number(value), f"Invalid raw generation in {path.name}"
                if dataset == "FUELHH":
                    assert row["settlementDate"] == target.date().isoformat()
                    assert row["settlementPeriod"] == target.hour * 2 + target.minute // 30 + 1
                if not WINDOW_START <= target < WINDOW_END:
                    continue
                key = (target, publication)
                if key in normalized:
                    duplicates[dataset] += 1
                    assert normalized[key] == value, f"Conflicting raw duplicate: {key}"
                normalized[key] = value
        raw_sets[dataset] = normalized

    for dataset, field in (("WINDFOR", "forecasts"), ("FUELHH", "actuals")):
        observed = {}
        for row in snapshot[field]:
            key = (stamp(row["startTime"]), stamp(row["publishTime"]))
            assert key not in observed, f"Duplicate normalized key in {field}"
            observed[key] = row["generation"]
        assert observed == raw_sets[dataset], f"Snapshot {field} differs from raw cache"

    sources = snapshot["provenance"]["sources"]
    assert len(sources) == len(source_files) == 63
    assert {s["url"]: s["records"] for s in sources} == source_files
    assert sum(s["records"] for s in sources) == sum(source_counts.values())

    by_hour = defaultdict(list)
    for (target, publication), value in raw_sets["WINDFOR"].items():
        by_hour[target].append((publication, value))
    actual_by_target = {}
    for (target, publication), value in sorted(raw_sets["FUELHH"].items()):
        if target not in actual_by_target or publication > actual_by_target[target][0]:
            actual_by_target[target] = (publication, value)
    assert len(actual_by_target) == 1488

    days, all_rows = [], []
    for day_number in range(1, 32):
        decision = date(2026, 1, day_number)
        # January and these delivery dates are GMT: UK 09:00 equals 09:00 UTC.
        # This fixed-period audit does not claim to validate DST calendar helpers.
        cutoff = datetime.combine(decision, time(9), tzinfo=UTC)
        delivery = decision + timedelta(days=1)
        first = datetime.combine(delivery, time(), tzinfo=UTC)
        rows = []
        for sp in range(1, 49):
            target = first + timedelta(minutes=30 * (sp - 1))
            source_hour = target.replace(minute=0)
            eligible = [p for p in by_hour[source_hour] if p[0] <= cutoff]
            assert eligible, f"No eligible raw forecast for {target}"
            publication, forecast = max(eligible, key=lambda p: p[0])
            assert publication <= cutoff < target, f"Future forecast leakage: {target}"
            assert target - source_hour in (timedelta(0), timedelta(minutes=30))
            assert (source_hour, publication) in raw_sets["WINDFOR"]
            actual = actual_by_target[target][1]
            rows.append({"startTime": iso(target), "settlementPeriod": sp,
                         "sourceStartTime": iso(source_hour), "forecastMw": forecast,
                         "actualMw": actual, "errorMw": forecast - actual,
                         "publishTime": iso(publication),
                         "leadHours": (target - publication).total_seconds() / 3600})
        for left, right in zip(rows[::2], rows[1::2]):
            assert left["forecastMw"] == right["forecastMw"]
            assert left["publishTime"] == right["publishTime"]
            assert left["sourceStartTime"] == right["sourceStartTime"]
        days.append({"decisionDate": decision.isoformat(), "deliveryDate": delivery.isoformat(),
                     "intervals": rows, "metrics": metrics(rows)})
        all_rows.extend(rows)
    assert len(all_rows) == 1488
    assert len({r["startTime"] for r in all_rows}) == 1488
    assert all_rows[0]["startTime"] == "2026-01-02T00:00:00Z"
    assert all_rows[-1]["startTime"] == "2026-02-01T23:30:00Z"
    overall = metrics(all_rows)

    comparison = "Not requested; raw cache and packaged snapshot compared offline."
    if args.api_url:
        url = args.api_url.rstrip("/") + "/api/analysis?cutoff=09%3A00"
        with urllib.request.urlopen(url, timeout=30) as response:
            api = json.load(response)
        assert api["cutoff"] == "09:00" and api["timezone"] == "Europe/London"
        assert len(api["days"]) == 31
        for key, value in overall.items():
            close(api["metrics"][key], value, "month." + key)
        for expected, observed in zip(days, api["days"]):
            assert expected["decisionDate"] == observed["decisionDate"]
            assert expected["deliveryDate"] == observed["deliveryDate"]
            assert len(observed["intervals"]) == 48
            for key, value in expected["metrics"].items():
                close(observed["metrics"][key], value, expected["decisionDate"] + "." + key)
            for expected_row, observed_row in zip(expected["intervals"], observed["intervals"]):
                for key, value in expected_row.items():
                    if value is None or isinstance(value, (int, float)):
                        close(observed_row[key], value, expected_row["startTime"] + "." + key)
                    else:
                        assert observed_row[key] == value, f"API mismatch: {key} at {expected_row['startTime']}"
        comparison = "PASS: independently derived month/day metrics and all 1,488 interval values, publications, leads and source-hour lineage equal the running API output."

    lines = ["# Independent data audit", "", f"Audit UTC: {datetime.now(UTC).isoformat()}", "",
             "Reproduce from the project root:", "", "```sh",
             "python scripts/audit_snapshot.py" + (f" --api-url {args.api_url}" if args.api_url else ""), "```", "",
             "Omit `--api-url` for a fully offline audit. This script uses only Python's standard library and imports no backend code. Raw caches under `work/source-cache` are required. The January-specific cutoff uses GMT explicitly; this audit does not validate DST behavior.", "",
             "## Results", "", "PASS: snapshot forecast/actual key-value records exactly reconstruct from all 63 cached Elexon response arrays, provenance URLs/counts match cache metadata, and the provenance snapshot ID equals the canonical SHA256 of the normalized forecast/actual payload.", "",
             f"Raw rows: WINDFOR {source_counts['WINDFOR']:,}; FUELHH WIND {source_counts['FUELHH']:,}. In delivery window: {len(raw_sets['WINDFOR']):,} unique forecast target/publication rows; {len(raw_sets['FUELHH']):,} actual rows. Collapsed same-key raw duplicates in window: {dict(duplicates) or 'none'}.", "",
             "PASS: 31 decision days (January 1–31), each with 48 delivery half-hours; 1,488 distinct consecutive intervals from January 2 00:00 UTC through February 1 23:30 UTC. Every interval has a forecast and actual. No nulls, invalid numbers, conflicting duplicates or missing expected intervals were found in this snapshot.", "",
             "PASS: every selected forecast publication is at or before its decision's 09:00 UK cutoff, every delivery interval follows that cutoff, and the publication is the latest eligible raw vintage for its source hour. Actuals are hindsight and do not participate in forecast selection.", "",
             "PASS: every selected value has raw hourly WINDFOR lineage. The explicit alignment is a step hold: the source hour's MW value and publication are reused unchanged at :00 and :30. There is no interpolation or invented source half-hour forecast.", "", comparison, "",
             "## Default 09:00 metrics", "", "| Metric | Independently recomputed value |", "|---|---:|"]
    for key, value in overall.items():
        lines.append(f"| {key} | {value:,.12f} |" if isinstance(value, float) else f"| {key} | {value:,} |")
    lines.extend(["", "Error = forecast − actual MW. Positive bias is an aggregate wind shortfall against the forecast. Energy is the sum of each MW value times 0.5 h. P90 uses linear interpolation of sorted absolute errors; it is a historical statistic.", "", "## Boundary spot checks", "",
                  "| Decision | Delivery target UTC | Source hour UTC | Publication UTC | Forecast MW | Actual MW | Lead h |", "|---|---|---|---|---:|---:|---:|"])
    for day in (days[0], days[-1]):
        for row in (day["intervals"][0], day["intervals"][1], day["intervals"][-1]):
            lines.append(f"| {day['decisionDate']} | {row['startTime']} | {row['sourceStartTime']} | {row['publishTime']} | {row['forecastMw']:,} | {row['actualMw']:,} | {row['leadHours']:.1f} |")
    elapsed = (datetime.now(UTC) - started).total_seconds()
    lines.extend(["", f"Snapshot provenance ID: `{snapshot['provenance']['snapshotId']}`.",
                  f"Snapshot file SHA256: `{hashlib.sha256(snapshot_bytes).hexdigest()}`.", "",
                  "Scope: this validates reproducibility and as-of selection against cached primary responses. It does not independently measure wind output, certify Elexon historical publication latency, or establish that operational metering is final settlement data.", "",
                  f"Script execution: {elapsed:.3f} seconds. Human/agent verification effort is recorded separately in EFFORT.md.", ""])
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"status": "PASS", "metrics": overall, "report": str(args.report)}, indent=2))


if __name__ == "__main__":
    main()
