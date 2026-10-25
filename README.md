# Windshift

A decision replay and forecast-error review for a UK day-ahead power buying team. Choose a January 2026 decision date and a London-time cutoff, inspect the latest eligible Elexon wind forecast, then optionally reveal the delivery outcome. January review quantifies how those frozen forecasts performed over the month.

**Live application:** [windshift-january-2026.vercel.app](https://windshift-january-2026.vercel.app). **Source:** [HimanshuJ16/f68d061e00](https://github.com/HimanshuJ16/f68d061e00). React and Python FastAPI run together on Vercel. Deployment and public repository creation were explicitly authorized by the user. No video upload or challenge submission has been made.

**25 October redesign:** the interface now uses an editorial graphite/ivory/citron design, self-hosted typography, a horizontal decision timeline and a persistent interval inspector. The production build, 52 backend tests, 12 frontend tests and responsive browser checks passed. See the dated [verification record](docs/VERIFICATION.md) and [brief-to-product checklist](docs/REQUIREMENTS.md).

## Run locally

Requirements: Python 3.11 or 3.12, Node 22 and npm. Docker uses Python 3.11; Vercel uses Python 3.12. Both runtimes were tested. No API key or external service is needed to run the included snapshot. Use a current Node 22 patch release when setting up a new machine.

From this directory on Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
cd frontend
npm.cmd ci
npm.cmd run build
cd ..
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

On macOS/Linux, use `.venv/bin/python` and `npm` in place of the Windows executables. Open [http://127.0.0.1:8000](http://127.0.0.1:8000). Build the frontend before starting Python so the asset directory is mounted. Restart Python after rebuilding or refreshing the snapshot.

For frontend development, keep the Python API running on port 8000 and run `npm run dev` in `frontend/`. Vite serves [http://127.0.0.1:5173](http://127.0.0.1:5173) and proxies `/api` to Python. The production build uses same-origin requests and needs no CORS or separate backend URL configuration.

With Docker's Linux engine running:

```sh
docker compose up --build
```

Open port 8000; stop with `docker compose down`. The image builds React, installs Python dependencies and runs one non-root FastAPI process serving both assets and API. It honours `PORT` (default 8000). Docker configuration was validated, but image build/run could not be tested because the local Docker daemon was unavailable. See [deployment instructions](docs/DEPLOYMENT.md) for the manual Heroku container route.

## A useful first walkthrough

1. Open **Decision replay** and choose **1 January** from the horizontal date strip. The large decision date and delivery timeline distinguish the **09:00** decision from **2 January** delivery.
2. Move across the delivery curve or select a half-hour with the keyboard. Read the persistent **Interval inspector** beside the chart on desktop: forecast MW, original source hour, publication time and delivery lead time.
3. Edit the cutoff to **10:00**, then select **Apply cutoff**. Until applied, the displayed analysis keeps its previous cutoff. For the first target, the eligible issue changes from 07:30 to 09:30. A later issue is not necessarily more accurate.
4. Restore **09:00** and **Reveal actuals** to see retrospective outcomes in the chart, inspector, ledger and daily error summary. At 2 January 00:00, the forecast is 18,781 MW and outturn is 15,228 MW: a positive 3,553 MW forecast-minus-actual error.
5. Open **January review**. Switch the daily comparison between **Mean bias** and **MAE** to distinguish direction from magnitude. Select a day to return to its replay.
6. Export the daily ledger or month as CSV. The export control shows preparation progress and a retry message if the request fails. CSV contains hindsight actual/error columns even while the overlay is hidden.
7. Try **00:00**: the older forecast horizon leaves four half-hours per delivery day unavailable. Gaps remain gaps and whole-day forecast energy becomes unavailable.
8. Choose **31 January** from the strip or date controls: delivery correctly extends to **1 February**. Open **Method & sources** for the alignment assumption, metric definitions and provenance.

## The important choices

- **Decision dates, not delivery dates:** 1–31 January decisions buy the next UK civil day, giving 2 January–1 February delivery. This civil-day assumption is explicit and is not a full exchange contract schedule.
- **No forecast look-ahead:** for each target independently, choose the greatest `publishTime <= cutoff`. Publication timestamps retain fractional precision. Later forecast vintages and actuals cannot affect selection.
- **A declared cutoff:** 09:00 Europe/London is an illustrative planning time before the documented N2EX morning gate closure. It is adjustable and must be matched to the customer's actual buying process. January is GMT.
- **Honest resolution:** January WINDFOR is hourly; FUELHH is half-hourly. Each hourly forecast is held unchanged across its two half-hours, with original source lineage. This assumption is visible in the chart, API and export.
- **Hindsight stays labelled:** actuals are initially hidden. Monthly error statistics use later outcomes and were not available to early-January buyers. P90 is an observed sample statistic, not a future confidence guarantee.
- **Wind-only scope:** these datasets describe Elexon's reporting population, not all UK wind or a supplier portfolio. No demand, price, thermal procurement quantity, cost saving or AI-generated insight is invented.

Read [methodology](docs/METHODOLOGY.md) for definitions, units, population/revision caveats and primary references. Error is **forecast minus actual**; positive means less wind arrived than expected. MAE, bias, RMSE, P90 absolute error and maximum overforecast are in MW and use paired intervals only. Energy is MW × 0.5 hours, summed only for complete periods. Zero is valid; missing values are null. No MAPE or misleading percentage accuracy is used.

## Architecture and files

```mermaid
flowchart LR
  E[Elexon WINDFOR and FUELHH WIND] -->|explicit refresh CLI| C[Daily cache and validation]
  C --> S[Versioned JSON snapshot with provenance]
  S --> P[Python cutoff selection and metrics]
  P -->|analysis and CSV API| R[React replay and review]
```

| Path | Responsibility |
|---|---|
| `backend/engine.py` | UTC parsing, normalization, duplicate policy, snapshot integrity, as-of selection and metrics |
| `backend/refresh.py` | Bounded daily Elexon requests, timeouts/retries, cache and atomic snapshot replacement |
| `backend/app.py` | FastAPI endpoints, query validation, CSV and built frontend serving |
| `frontend/src/` | Typed React date navigation, delivery curve, persistent interval inspector, ledger, review and request states |
| `data/snapshot.json` | Real normalized hourly forecast vintages and half-hour actuals with 63 source-request records |
| `data/README.md` | Retrieval windows, normalization and operational details |
| `tests/backend/`, `frontend/src/*.test.*` | Data/decision invariants, API behavior and frontend interactions |
| `scripts/audit_snapshot.py` | Independent standard-library audit against raw source cache; no backend calculation imports |
| `Dockerfile`, `docker-compose.yml`, `heroku.yml`, `Procfile` | Container, local orchestration and manual hosting configuration |
| `vercel.json`, `pyproject.toml`, `.python-version`, `.vercelignore` | Vercel FastAPI entrypoint, Python 3.12 runtime, pinned cloud dependencies, frontend build and deployment exclusions |
| `requirements*.txt`, `frontend/package-lock.json` | Pinned dependency inputs |
| `docs/` | Methodology, research, verification, data audit, effort, demo and manual release checklist |

The snapshot avoids an upstream network dependency during a customer demo. It also makes results reproducible, reviewable and fast without adding a database or background scheduler to this fixed-month pilot. Python owns all decision and metric logic; the browser formats and explores the result. No authentication or write API is needed for this read-only public-data pilot.

## API and refresh

| Endpoint | Behavior |
|---|---|
| `GET /api/analysis?cutoff=09:00` | 31 decisions, 1,488 expected half-hours, metrics and provenance |
| `GET /api/export?cutoff=09:00&decision_date=2026-01-31` | Daily CSV; omit decision date for the month |
| `GET /api/health` | Reachability plus `dataLoaded` and snapshot identity; inspect body for readiness |
| `GET /docs` | FastAPI interactive API documentation |

Invalid cutoff/date queries return 422. Analysis/export return 503 if the snapshot is absent, malformed or fails its content hash. Unknown API routes return 404. CSV blanks mean missing; it includes retrospective actual/error columns even when the UI outcome overlay is hidden.

The frontend bounds analysis and export requests at 15 seconds, distinguishes a timeout from an HTTP failure and offers retry. Applying another cutoff cancels the previous analysis request. Focused tests cover stalled requests and export failure/retry; live browser checks cover successful downloads. Static method/recovery guidance remains available when analysis cannot load.

Explicit refresh, from the project root:

```powershell
.\.venv\Scripts\python.exe -m backend.refresh
# To refetch rather than reuse successful daily cache entries:
.\.venv\Scripts\python.exe -m backend.refresh --force
```

Only Elexon's two prescribed datasets are fetched. WINDFOR uses publication-time windows including the prior day; FUELHH uses delivery settlement dates and WIND. The streams expose no pagination parameters, so the client uses small daily chunks. Failures leave the existing snapshot intact. Raw cache lives in ignored `work/source-cache`; refresh recreates it for a fresh checkout. Restart the API to load a changed snapshot. `WINDSHIFT_SNAPSHOT` can point to an alternate local snapshot for testing.

## Verification

```powershell
.\.venv\Scripts\python.exe -m pytest tests/backend -q
cd frontend
npm.cmd test
npm.cmd run build
cd ..
.\.venv\Scripts\python.exe scripts/audit_snapshot.py --api-url http://127.0.0.1:8000
docker compose config --quiet
```

The independent audit needs the raw cache; run refresh first if starting from a clean source checkout. Omit `--api-url` for an offline audit. See [verification evidence](docs/VERIFICATION.md) for the dated commands, results, screenshots and unverified deployment/container steps, and [data audit](docs/DATA-AUDIT.md) for independently recomputed real figures. The latest verification covers the 25 October redesign; the earlier record is retained separately.

At 09:00, the included snapshot has 1,488/1,488 pairs: MAE **2,041.96 MW**, bias **+1,747.89 MW**, RMSE **2,509.06 MW**, P90 absolute error **4,140.10 MW**. These are descriptive comparisons under the stated scope and alignment, not a claim about pure weather skill, future risk or savings.

## AI assistance disclosure

This project was built with substantial AI assistance through OpenAI Codex. Astra High contributed the original domain reasoning, architecture, product design, integration and review; GPT-6.1 Sol High agents contributed implementation, source research, documentation and verification. The 25 October redesign is coordinated by GPT-6.1 Sol High, with an Astra High agent providing visual direction and Sol High agents implementing and checking the work. The code and documentation are AI-assisted work. Himanshu must review and understand the result, amend this disclosure if needed, and make his own presentation and submission. No user research, commercial results or deployment success has been fabricated.

## Manual completion

Use the [nine-minute demo script](docs/DEMO.md) and [manual publication/submission checklist](docs/MANUAL-RELEASE.md). Remaining challenge deliverables are an unlisted YouTube demo <=10 minutes (each part <=5 minutes) and manual form submission after incognito access checks. The [effort log](docs/EFFORT.md) records observed work; include your own review and publication time within the 16-hour limit.
