"""FastAPI API and production SPA, served entirely from the local snapshot."""

from __future__ import annotations

import csv
import io
import os
from pathlib import Path
from functools import lru_cache

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from .engine import Snapshot, cutoff_value, decision_value

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = Path(
    os.environ.get("WINDSHIFT_SNAPSHOT", str(ROOT / "data" / "snapshot.json"))
)
app = FastAPI(title="Windshift", version="1.0.0")


@lru_cache(maxsize=1)
def load_snapshot():
    return Snapshot.load(SNAPSHOT_PATH)


def get_snapshot():
    try:
        return load_snapshot()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(
            503,
            "Snapshot unavailable or invalid. Run the explicit refresh CLI and restart the server.",
        ) from exc


def validate(cutoff, decision_date=None):
    try:
        cutoff_value(cutoff)
        if decision_date is not None:
            decision_value(decision_date)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.get("/api/health")
def health():
    try:
        snapshot = load_snapshot()
        return {
            "status": "ok",
            "dataLoaded": True,
            "snapshotId": snapshot.provenance["snapshotId"],
        }
    except (OSError, ValueError, KeyError, TypeError):
        return {"status": "degraded", "dataLoaded": False}


@app.get("/api/analysis")
def analysis(cutoff: str = Query(default="09:00")):
    validate(cutoff)
    return get_snapshot().analyze(cutoff)


@app.get("/api/export")
def export(cutoff: str = Query(default="09:00"), decision_date: str | None = None):
    validate(cutoff, decision_date)
    result = get_snapshot().analyze(cutoff)
    output = io.StringIO(newline="")
    fields = [
        "decision_date",
        "delivery_date",
        "cutoff_local",
        "timezone",
        "start_time_utc",
        "settlement_period",
        "forecast_mw",
        "actual_mw",
        "error_mw",
        "publish_time_utc",
        "lead_hours",
        "snapshot_id",
        "forecast_alignment",
    ]
    writer = csv.writer(output)
    writer.writerow(fields)
    for day in result["days"]:
        if decision_date is not None and day["decisionDate"] != decision_date:
            continue
        for i in day["intervals"]:
            writer.writerow(
                [
                    day["decisionDate"],
                    day["deliveryDate"],
                    day["cutoffTime"],
                    result["timezone"],
                    i["startTime"],
                    i["settlementPeriod"],
                    i["forecastMw"],
                    i["actualMw"],
                    i["errorMw"],
                    i["publishTime"],
                    i["leadHours"],
                    result["provenance"]["snapshotId"],
                    "hourly value held for two half-hours",
                ]
            )
    filename = (
        f"windshift-{decision_date or 'january-2026'}-{cutoff.replace(':', '')}.csv"
    )
    return Response(
        output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Windshift-Snapshot": result["provenance"]["snapshotId"],
        },
    )


DIST = ROOT / "frontend" / "dist"
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path == "api" or path.startswith("api/"):
        raise HTTPException(404, "API route not found")
    candidate = (DIST / path).resolve()
    if candidate.is_relative_to(DIST.resolve()) and candidate.is_file():
        return FileResponse(candidate)
    if (DIST / "index.html").is_file():
        return FileResponse(DIST / "index.html")
    raise HTTPException(404, "Frontend build missing. Run npm run build in frontend/.")
