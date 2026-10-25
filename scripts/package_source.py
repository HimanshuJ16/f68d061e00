"""Create a deterministic clean-source ZIP using the Python standard library.

Run after documentation is finalized:
    python scripts/package_source.py

Output: ../windshift-source.zip, containing a top-level windshift/ directory.
Archive order, timestamps and permissions are fixed. Identical included bytes and
the same Python/zlib implementation produce identical archive bytes.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import re
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT.parent / "windshift-source.zip"
ROOT_FILES = {
    ".dockerignore", ".gitignore", "Dockerfile", "Procfile", "README.md",
    "docker-compose.yml", "heroku.yml", "requirements.txt", "requirements-dev.txt",
    "vercel.json", "pyproject.toml", ".python-version", ".vercelignore",
}
ROOT_DIRECTORIES = {"backend", "data", "docs", "frontend", "scripts", "tests"}
EXCLUDED_DIRECTORIES = {
    ".git", ".vercel", ".venv", "venv", "node_modules", "dist", "work", "cache", ".cache",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", "htmlcov",
    "coverage", "playwright-report", "test-results",
}
EXCLUDED_FILES = {
    ".coverage", ".ds_store", "thumbs.db", ".npmrc", ".pypirc", "pip.conf",
    "credentials.json", "token.json", "id_rsa", "id_ed25519",
}
PRIVATE_KEY = re.compile(rb"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----")
PROVIDER_TOKEN = re.compile(
    rb"(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|"
    rb"sk-(?:proj-)?[A-Za-z0-9_-]{40,}|AKIA[0-9A-Z]{16})"
)


def include(path: Path) -> bool:
    relative = path.relative_to(ROOT)
    parts = relative.parts
    if any(part.lower() in EXCLUDED_DIRECTORIES for part in parts[:-1]):
        return False
    if len(parts) == 1:
        if parts[0] not in ROOT_FILES:
            return False
    elif parts[0] not in ROOT_DIRECTORIES:
        return False
    name = path.name.lower()
    if name in EXCLUDED_FILES or (name.startswith(".env") and name != ".env.example"):
        return False
    if any(word in name for word in ("secret", "credential")):
        return False
    if name.endswith((".pyc", ".pyo", ".tsbuildinfo", ".log", ".pem", ".p12", ".pfx", ".key")):
        return False
    return True


def main() -> None:
    files = sorted(
        (path for path in ROOT.rglob("*") if path.is_file() and include(path)),
        key=lambda path: path.relative_to(ROOT).as_posix(),
    )
    required = {
        "README.md", "requirements.txt", "frontend/package.json",
        "frontend/package-lock.json", "data/snapshot.json", "docs/EFFORT.md",
        "docs/VERIFICATION.md", "scripts/package_source.py",
    }
    names = {path.relative_to(ROOT).as_posix() for path in files}
    missing = required - names
    if missing:
        raise RuntimeError("Required source files missing: " + ", ".join(sorted(missing)))
    payloads = []
    for path in files:
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT.resolve()):
            raise RuntimeError("Refusing linked or out-of-project source file: " + str(path))
        content = path.read_bytes()
        if PRIVATE_KEY.search(content) or PROVIDER_TOKEN.search(content):
            # Report the filename only; never print a potential secret's bytes.
            raise RuntimeError("Potential credential found; archive not written: " + path.relative_to(ROOT).as_posix())
        payloads.append(("windshift/" + path.relative_to(ROOT).as_posix(), content))

    # Build a temporary sibling, validate it, then atomically replace the deliverable.
    with tempfile.NamedTemporaryFile(dir=DESTINATION.parent, suffix=".zip", delete=False) as temporary:
        temporary_path = Path(temporary.name)
    try:
        with zipfile.ZipFile(temporary_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for name, content in payloads:
                info = zipfile.ZipInfo(name, date_time=(2000, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, content, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        with zipfile.ZipFile(temporary_path) as archive:
            if archive.testzip() is not None:
                raise RuntimeError("Archive CRC verification failed")
            if archive.namelist() != [name for name, _ in payloads]:
                raise RuntimeError("Archive manifest differs from selected source files")
        temporary_path.replace(DESTINATION)
    finally:
        temporary_path.unlink(missing_ok=True)
    digest = hashlib.sha256(DESTINATION.read_bytes()).hexdigest()
    print(f"Created {DESTINATION.name}: {len(files)} files, {DESTINATION.stat().st_size:,} bytes")
    print(f"SHA256 {digest}")


if __name__ == "__main__":
    main()
