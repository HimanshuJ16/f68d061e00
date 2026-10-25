"""Explicit network refresh: python -m backend.refresh (never invoked by the API)."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .engine import ASSUMPTIONS, Snapshot, iso, normalize, snapshot_id, stamp

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"


def request_url(dataset, day):
    if dataset == "WINDFOR":
        # Elexon bounds are inclusive. Overlap at midnight is intentional and
        # normalized duplicate handling removes any boundary repetition.
        query = {
            "publishDateTimeFrom": f"{day}T00:00:00Z",
            "publishDateTimeTo": f"{day + timedelta(days=1)}T00:00:00Z",
        }
    else:
        query = {
            "settlementDateFrom": str(day),
            "settlementDateTo": str(day),
            "fuelType": "WIND",
        }
    return f"{BASE}/{dataset}/stream?{urlencode(query)}"


def fetch(dataset, day, cache, force=False):
    url = request_url(dataset, day)
    cache_file = cache / f"{dataset}-{day}.json"
    metadata_file = cache_file.with_suffix(".meta.json")
    rows = None
    if not force:
        try:
            metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
            cached_rows = json.loads(cache_file.read_text(encoding="utf-8"))
            stamp(metadata["retrievedAt"])
            if (
                metadata.get("url") == url
                and isinstance(cached_rows, list)
                and cached_rows
                and all(isinstance(row, dict) for row in cached_rows)
            ):
                rows, retrieved = cached_rows, metadata["retrievedAt"]
        except (OSError, ValueError, KeyError, TypeError):
            pass  # A damaged or outdated cache is refetched, including under --force.
    if rows is None:
        for attempt in range(3):
            try:
                with urlopen(
                    Request(
                        url,
                        headers={
                            "Accept": "application/json",
                            "User-Agent": "Windshift-local-research/1.0",
                        },
                    ),
                    timeout=45,
                ) as response:
                    rows = json.load(response)
                if (
                    not isinstance(rows, list)
                    or not rows
                    or any(not isinstance(row, dict) for row in rows)
                ):
                    raise ValueError(
                        f"{dataset} {day}: expected a non-empty stream list"
                    )
                retrieved = iso(datetime.now(timezone.utc))
                cache_file.write_text(
                    json.dumps(rows, separators=(",", ":")), encoding="utf-8"
                )
                metadata_file.write_text(
                    json.dumps({"url": url, "retrievedAt": retrieved}), encoding="utf-8"
                )
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(1.5 * (attempt + 1))
    if not isinstance(rows, list) or not rows:
        raise ValueError(f"Empty cached stream: {cache_file}")
    return (
        dataset,
        rows,
        {
            "dataset": dataset,
            "url": url,
            "records": len(rows),
            "retrievedAt": retrieved,
        },
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cache-dir", type=Path, default=ROOT / "work" / "source-cache"
    )
    parser.add_argument("--output", type=Path, default=ROOT / "data" / "snapshot.json")
    parser.add_argument(
        "--force", action="store_true", help="Refetch every day, ignoring cache"
    )
    parser.add_argument("--workers", type=int, default=4, choices=range(1, 9))
    args = parser.parse_args()
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    jobs = [("WINDFOR", date(2025, 12, 31) + timedelta(days=n)) for n in range(32)]
    jobs += [("FUELHH", date(2026, 1, 2) + timedelta(days=n)) for n in range(31)]
    rows = {"WINDFOR": [], "FUELHH": []}
    sources = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [
            pool.submit(fetch, dataset, day, args.cache_dir, args.force)
            for dataset, day in jobs
        ]
        for future in as_completed(futures):
            dataset, values, source = future.result()
            rows[dataset].extend(values)
            sources.append(source)
            print(
                f"{len(sources)}/{len(jobs)} {source['dataset']} {source['records']} rows",
                flush=True,
            )
    forecasts, actuals, warnings = normalize(rows["WINDFOR"], rows["FUELHH"])
    content = {
        "schemaVersion": 1,
        "forecasts": forecasts,
        "actuals": actuals,
        "provenance": {
            "retrievedAt": max(s["retrievedAt"] for s in sources),
            "snapshotId": snapshot_id(forecasts, actuals),
            "sources": sorted(sources, key=lambda s: (s["dataset"], s["url"])),
            "warnings": ASSUMPTIONS + warnings,
        },
    }
    Snapshot(content)  # Never replace a working snapshot with invalid output.
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(content, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    temporary.replace(args.output)
    print(
        f"Saved {len(forecasts)} hourly forecast versions and {len(actuals)} actual versions in {time.monotonic()-started:.1f}s to {args.output}"
    )


if __name__ == "__main__":
    main()
