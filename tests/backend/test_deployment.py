"""Keep container and serverless runtime dependencies in sync."""

import json
from pathlib import Path
import tomllib

ROOT = Path(__file__).resolve().parents[2]


def test_vercel_runtime_has_the_same_pinned_dependencies_as_docker():
    manifest = tomllib.loads((ROOT / "pyproject.toml").read_text())
    requirements = {
        line.strip()
        for line in (ROOT / "requirements.txt").read_text().splitlines()
        if line.strip() and not line.startswith("#")
    }
    assert set(manifest["project"]["dependencies"]) == requirements
    assert any(pin.startswith("fastapi==") for pin in requirements)
    assert manifest["tool"]["vercel"]["entrypoint"] == "backend.app:app"


def test_vercel_snapshot_is_included_and_local_state_is_excluded():
    config = json.loads((ROOT / "vercel.json").read_text())
    function = config["functions"]["backend/app.py"]
    assert function["includeFiles"] == "data/snapshot.json"
    assert (ROOT / function["includeFiles"]).is_file()
    ignored = (ROOT / ".vercelignore").read_text().splitlines()
    assert {".venv", "work", "frontend/node_modules", ".vercel"} <= set(ignored)
