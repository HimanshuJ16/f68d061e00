import csv
import io
from fastapi.testclient import TestClient
import pytest
from backend import app as module


@pytest.fixture
def client():
    return TestClient(module.app)


def test_real_snapshot_health_and_shape(client):
    assert client.get("/api/health").json()["dataLoaded"] is True
    response = client.get("/api/analysis?cutoff=09:00")
    assert response.status_code == 200
    result = response.json()
    assert result["timezone"] == "Europe/London"
    assert len(result["days"]) == 31
    assert result["metrics"]["expectedIntervals"] == 1488
    assert result["metrics"]["forecastIntervals"] == 1488
    assert result["metrics"]["actualIntervals"] == 1488
    assert result["provenance"]["snapshotId"].startswith("sha256:")
    assert len(result["provenance"]["sources"]) == 63


@pytest.mark.parametrize(
    "query",
    [
        "cutoff=24:00",
        "cutoff=9:00",
        "cutoff=abc",
        "decision_date=2026-02-01",
        "decision_date=2026-01-32",
        "decision_date=2026-1-2",
    ],
)
def test_query_validation(client, query):
    assert client.get("/api/export?" + query).status_code == 422
    if query.startswith("cutoff"):
        assert client.get("/api/analysis?" + query).status_code == 422


def test_csv_matches_json(client):
    response = client.get("/api/export?cutoff=09:00&decision_date=2026-01-01")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert (
        'filename="windshift-2026-01-01-0900.csv"'
        in response.headers["content-disposition"]
    )
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert len(rows) == 48
    day = client.get("/api/analysis?cutoff=09:00").json()["days"][0]
    assert rows[0]["start_time_utc"] == day["intervals"][0]["startTime"]
    assert float(rows[0]["forecast_mw"]) == day["intervals"][0]["forecastMw"]
    assert rows[0]["publish_time_utc"] == day["intervals"][0]["publishTime"]
    assert "hourly" in rows[0]["forecast_alignment"]
    assert (
        len(list(csv.DictReader(io.StringIO(client.get("/api/export").text)))) == 1488
    )


def test_missing_snapshot_returns_503(client, monkeypatch, tmp_path):
    module.load_snapshot.cache_clear()
    monkeypatch.setattr(module, "SNAPSHOT_PATH", tmp_path / "missing.json")
    assert client.get("/api/health").json()["dataLoaded"] is False
    assert client.get("/api/analysis").status_code == 503
    assert client.get("/api/export").status_code == 503
    module.load_snapshot.cache_clear()


def test_corrupt_snapshot_returns_503(client, monkeypatch, tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text('{"schemaVersion":99}', encoding="utf-8")
    module.load_snapshot.cache_clear()
    monkeypatch.setattr(module, "SNAPSHOT_PATH", bad)
    assert client.get("/api/analysis").status_code == 503
    module.load_snapshot.cache_clear()


def test_unknown_api_not_spa(client):
    assert client.get("/api/missing").status_code == 404


@pytest.mark.skipif(
    not (module.DIST / "index.html").is_file(), reason="Frontend build not present"
)
def test_production_spa_and_asset_range(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert '<div id="root">' in response.text
    assert client.get("/decision-replay").text == response.text
    asset = next((module.DIST / "assets").glob("*.js"))
    served = client.get(f"/assets/{asset.name}")
    assert served.status_code == 200
    assert served.content == asset.read_bytes()
    partial = client.get(f"/assets/{asset.name}", headers={"Range": "bytes=0-15"})
    assert partial.status_code == 206
    assert partial.content == asset.read_bytes()[:16]


@pytest.mark.parametrize("invalid", ["[]", "null", '"bad"', "123"])
def test_non_object_snapshot_returns_503(client, monkeypatch, tmp_path, invalid):
    bad = tmp_path / "bad.json"
    bad.write_text(invalid, encoding="utf-8")
    module.load_snapshot.cache_clear()
    monkeypatch.setattr(module, "SNAPSHOT_PATH", bad)
    assert client.get("/api/analysis").status_code == 503
    assert client.get("/api/health").json()["dataLoaded"] is False
    module.load_snapshot.cache_clear()


def test_snapshot_integrity_failure_returns_503(client, monkeypatch, tmp_path):
    import json

    content = json.loads(module.SNAPSHOT_PATH.read_text(encoding="utf-8"))
    content["forecasts"][0]["generation"] += 1
    bad = tmp_path / "mutated.json"
    bad.write_text(json.dumps(content), encoding="utf-8")
    module.load_snapshot.cache_clear()
    monkeypatch.setattr(module, "SNAPSHOT_PATH", bad)
    assert client.get("/api/analysis").status_code == 503
    module.load_snapshot.cache_clear()
