# Dependency audit

Checked on 24 October 2026 using npm's advisory service and pip-audit 2.10.1. Findings describe known advisories returned by those services on that date; a clean result is not a complete security assessment.

## Frontend

The initial full audit reported five affected dependency packages: two critical, one high, and two moderate. Development dependencies included Vite 6.1.0, Vitest 3.0.5 and their toolchain dependencies. The runtime-only audit (`npm audit --omit=dev`) was already clear.

After upgrading Vite to 6.4.5 and Vitest to 4.1.12, an independent `npm audit --json` returned **zero known vulnerabilities**, including development dependencies (230 total dependencies reported). The application container uses Node only to build static assets; the production image runs Python and does not ship the Node toolchain.

The upgrade covers [Vite arbitrary file reading](https://github.com/advisories/GHSA-p9ff-h696-f583), [Vitest UI file access/execution](https://github.com/advisories/GHSA-5xrq-8626-4rwp), and [mocker code injection](https://github.com/advisories/GHSA-qxg6-89mg-rqv8). Vitest 3.2.7 alone would not address the newest mocker advisory, which requires 4.1.12 or a patched newer major version. Audit severity is conditional on each advisory's affected configuration; the project uses local Vite development and `vitest run`.

Reproduce from `frontend/`:

```sh
npm audit
npm audit --omit=dev
```

## Python

The initial pinned requirements audit returned 14 advisory entries in Starlette 0.41.3, representing seven distinct advisory groups with duplicate GHSA/PYSEC aliases. No other pinned Python package was flagged. [FileResponse Range-header denial of service](https://github.com/advisories/GHSA-7f5h-v6xp-fcq8) is relevant to serving this application's static assets. Later [form parsing](https://github.com/advisories/GHSA-82w8-qh3p-5jfq) and [URL parsing](https://github.com/advisories/GHSA-jp82-jpqv-5vv3) advisories require versions through 1.3.1 to clear all known groups; their exploit conditions differ.

After upgrading to FastAPI 0.162.0 and Starlette 1.9.0, an independent pip-audit rerun against all 16 explicit runtime pins returned **no known vulnerabilities**. The backend's existing 51 tests also passed after this dependency update, as reported by its implementation owner. Audit JSON was retained as a local verification artifact.

Reproduce with pip-audit installed in a separate tools environment, from the project root:

```sh
python -m pip_audit --no-deps --disable-pip -r requirements.txt
```

The requirements file pins the runtime dependency closure. `--no-deps --disable-pip` audits those explicit pins without resolving or installing application packages. The audit tool was installed separately and was not added to application requirements.
