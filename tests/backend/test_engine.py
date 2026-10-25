from datetime import date, timedelta
import copy
import math
import pytest

from backend.engine import (
    Snapshot,
    cutoff_value,
    decision_value,
    metrics,
    normalize,
    stamp,
    targets,
)


def row(start="2026-01-02T00:00:00Z", publish="2026-01-01T09:00:00Z", value=100):
    return {"startTime": start, "publishTime": publish, "generation": value}


def snapshot(forecasts=None, actuals=None):
    return Snapshot(
        {
            "schemaVersion": 1,
            "forecasts": forecasts or [row()],
            "actuals": actuals or [row(publish="2026-01-02T00:30:00Z", value=80)],
            "provenance": {
                "retrievedAt": "2026-10-24T00:00:00Z",
                "snapshotId": "test",
                "sources": [{"dataset": "test", "url": "test", "records": 1}],
                "warnings": [],
            },
        }
    )


def test_inclusive_cutoff_and_no_lookahead_per_target():
    data = snapshot(
        [
            row(publish="2025-12-31T22:30:00Z", value=70),
            row(value=100),
            row(publish="2026-01-01T09:00:01Z", value=999),
            row(start="2026-01-02T01:00:00Z", publish="2026-01-01T07:30:00Z", value=50),
        ]
    )
    before = data.analyze("08:59")["days"][0]["intervals"]
    at = data.analyze("09:00")["days"][0]["intervals"]
    assert before[0]["forecastMw"] == 70
    assert at[0]["forecastMw"] == 100
    assert at[1]["forecastMw"] == 100
    assert at[1]["sourceStartTime"] == at[0]["startTime"]
    assert at[2]["forecastMw"] == 50
    assert at[2]["publishTime"] == "2026-01-01T07:30:00Z"
    assert all(
        i["publishTime"] is None
        or stamp(i["publishTime"]) <= stamp("2026-01-01T09:00:00Z")
        for i in at
    )
    assert at[0]["leadHours"] == 15
    assert at[0]["errorMw"] == 20


def test_later_actuals_cannot_change_forecast_selection():
    first = snapshot().analyze("09:00")
    changed = snapshot(actuals=[row(publish="2026-02-02T00:00:00Z", value=0)]).analyze(
        "09:00"
    )
    assert (
        first["days"][0]["intervals"][0]["forecastMw"]
        == changed["days"][0]["intervals"][0]["forecastMw"]
    )


def test_fractional_publication_never_rounds_into_cutoff():
    data = snapshot(
        [row(value=10), row(publish="2026-01-01T09:00:00.500000Z", value=999)]
    )
    assert data.analyze("09:00")["days"][0]["intervals"][0]["forecastMw"] == 10
    assert data.forecasts[-1]["publishTime"] == "2026-01-01T09:00:00.500000Z"
    assert data.analyze("09:01")["days"][0]["intervals"][0]["forecastMw"] == 999


def test_next_midnight_publications_excluded_from_pilot():
    forecasts, _, _ = normalize(
        [row(), row(publish="2026-02-01T00:00:00Z", value=999)], []
    )
    assert len(forecasts) == 1


def test_null_latest_does_not_fall_back_and_zero_is_real():
    data = snapshot(
        [row(value=10, publish="2026-01-01T08:00:00Z"), row(value=None)], [row(value=0)]
    )
    interval = data.analyze("09:00")["days"][0]["intervals"][0]
    assert interval["forecastMw"] is None
    assert interval["publishTime"] == "2026-01-01T09:00:00Z"
    assert interval["actualMw"] == 0
    assert interval["errorMw"] is None


def test_missing_no_forward_or_cross_day_fill():
    result = snapshot().analyze("00:00")
    assert len(result["days"]) == 31
    assert result["days"][0]["deliveryDate"] == "2026-01-02"
    assert result["days"][-1]["deliveryDate"] == "2026-02-01"
    assert result["metrics"]["expectedIntervals"] == 1488
    assert result["metrics"]["forecastIntervals"] == 0
    assert result["metrics"]["maeMw"] is None
    assert result["metrics"]["forecastEnergyMwh"] is None
    assert result["days"][0]["intervals"][2]["actualMw"] is None


def test_duplicate_conflicts_are_deterministic_nulls():
    a = [row(value=1), row(value=1), row(value=2)]
    forecast, actual, warnings = normalize(a, [])
    reverse, _, _ = normalize(list(reversed(a)), [])
    assert forecast == reverse
    assert forecast[0]["generation"] is None
    assert "1 conflicting keys" in warnings[0]
    identical, _, _ = normalize([row(), row()], [])
    assert len(identical) == 1 and identical[0]["generation"] == 100


def test_actual_latest_revision_not_row_order():
    data = snapshot(
        actuals=[
            row(value=2, publish="2026-01-04T00:00:00Z"),
            row(value=1, publish="2026-01-03T00:00:00Z"),
        ]
    )
    assert data.analyze("09:00")["days"][0]["intervals"][0]["actualMw"] == 2


@pytest.mark.parametrize("value", [-1, float("nan"), float("inf"), True, "10"])
def test_invalid_generation_is_audited(value):
    forecasts, _, warnings = normalize([row(value=value)], [])
    assert not forecasts and "rejected 1 invalid" in warnings[0]


def test_naive_and_unaligned_timestamps_rejected():
    forecasts, _, warnings = normalize(
        [row(publish="2026-01-01T09:00:00"), row(start="2026-01-02T00:30:00Z")], []
    )
    assert forecasts == [] and "rejected 2" in warnings[0]
    with pytest.raises(ValueError):
        stamp("2026-01-02T00:00:00")
    assert stamp("2026-01-02T01:00:00+01:00") == stamp("2026-01-02T00:00:00Z")


def test_actual_settlement_consistency():
    _, actuals, warnings = normalize(
        [],
        [dict(row(), fuelType="WIND", settlementDate="2026-01-02", settlementPeriod=2)],
    )
    assert not actuals and warnings


def test_uk_calendar_handles_dst():
    assert len(targets(date(2026, 3, 29))) == 46
    assert len(targets(date(2026, 10, 25))) == 50
    assert all(
        b - a == timedelta(minutes=30)
        for a, b in zip(targets(date(2026, 10, 25)), targets(date(2026, 10, 25))[1:])
    )


def test_metrics_signed_errors_energy_and_p90():
    intervals = [
        {"forecastMw": f, "actualMw": a, "errorMw": f - a}
        for f, a in [(0, 0), (10, 20), (30, 10)]
    ]
    result = metrics(intervals)
    assert result["maeMw"] == 10
    assert result["biasMw"] == pytest.approx(10 / 3)
    assert result["rmseMw"] == pytest.approx(math.sqrt(500 / 3))
    assert result["p90AbsoluteErrorMw"] == 18
    assert result["maxOverforecastMw"] == 20
    assert result["forecastEnergyMwh"] == 20
    assert result["actualEnergyMwh"] == 15
    intervals.append({"forecastMw": None, "actualMw": 0, "errorMw": None})
    result = metrics(intervals)
    assert result["pairedIntervals"] == 3 and result["forecastEnergyMwh"] is None
    assert result["actualEnergyMwh"] == 15
    assert (
        metrics([{"forecastMw": 1, "actualMw": 2, "errorMw": -1}])["maxOverforecastMw"]
        == 0
    )


@pytest.mark.parametrize(
    "value", ["9:00", "24:00", "12:60", "00:00:00", "09:00Z", " 09:00"]
)
def test_invalid_cutoff(value):
    with pytest.raises(ValueError):
        cutoff_value(value)


@pytest.mark.parametrize(
    "value", ["2026-02-01", "2026-01-32", "2026-1-01", "2025-01-01", "x"]
)
def test_invalid_date(value):
    with pytest.raises(ValueError):
        decision_value(value)


def test_cutoff_edges():
    assert cutoff_value("00:00").hour == 0
    assert cutoff_value("23:59").minute == 59
