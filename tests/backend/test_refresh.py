import io
import json
from datetime import date
import pytest
from backend import refresh


def test_daily_stream_parameters():
    forecast = refresh.request_url("WINDFOR", date(2025, 12, 31))
    actual = refresh.request_url("FUELHH", date(2026, 2, 1))
    assert "publishDateTimeFrom=2025-12-31T00%3A00%3A00Z" in forecast
    assert "publishDateTimeTo=2026-01-01T00%3A00%3A00Z" in forecast
    assert "settlementDateFrom=2026-02-01" in actual and "fuelType=WIND" in actual


def test_fetch_cache_and_timeout(tmp_path, monkeypatch):
    calls = []
    data = [{"dataset": "WINDFOR", "generation": 0}]

    def open_fake(request, timeout):
        calls.append(timeout)
        return io.BytesIO(json.dumps(data).encode())

    monkeypatch.setattr(refresh, "urlopen", open_fake)
    first = refresh.fetch("WINDFOR", date(2026, 1, 1), tmp_path)
    cached = refresh.fetch("WINDFOR", date(2026, 1, 1), tmp_path)
    assert calls == [45]
    assert first == cached
    assert first[2]["records"] == 1


def test_bounded_retries(tmp_path, monkeypatch):
    calls = []
    sleeps = []

    def fail(*args, **kwargs):
        calls.append(1)
        raise TimeoutError("offline")

    monkeypatch.setattr(refresh, "urlopen", fail)
    monkeypatch.setattr(refresh.time, "sleep", sleeps.append)
    with pytest.raises(TimeoutError):
        refresh.fetch("FUELHH", date(2026, 1, 2), tmp_path)
    assert len(calls) == 3
    assert sleeps == [1.5, 3.0]
    assert not list(tmp_path.iterdir())


def test_changed_request_url_invalidates_cache(tmp_path, monkeypatch):
    data = [{"dataset": "WINDFOR", "generation": 1}]
    (tmp_path / "WINDFOR-2026-01-01.json").write_text(
        json.dumps(data), encoding="utf-8"
    )
    (tmp_path / "WINDFOR-2026-01-01.meta.json").write_text(
        json.dumps({"url": "old-query", "retrievedAt": "2026-01-01T00:00:00Z"}),
        encoding="utf-8",
    )
    calls = []

    def open_fake(request, timeout):
        calls.append(request.full_url)
        return io.BytesIO(json.dumps(data).encode())

    monkeypatch.setattr(refresh, "urlopen", open_fake)
    refresh.fetch("WINDFOR", date(2026, 1, 1), tmp_path)
    assert calls == [refresh.request_url("WINDFOR", date(2026, 1, 1))]


@pytest.mark.parametrize("force", [False, True])
def test_damaged_cache_can_be_refreshed(tmp_path, monkeypatch, force):
    (tmp_path / "WINDFOR-2026-01-01.json").write_text("broken", encoding="utf-8")
    (tmp_path / "WINDFOR-2026-01-01.meta.json").write_text("broken", encoding="utf-8")
    monkeypatch.setattr(
        refresh, "urlopen", lambda *args, **kwargs: io.BytesIO(b'[{"generation": 0}]')
    )
    _, rows, _ = refresh.fetch("WINDFOR", date(2026, 1, 1), tmp_path, force)
    assert rows == [{"generation": 0}]
