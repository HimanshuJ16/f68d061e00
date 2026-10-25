# Brief-to-product checklist

The functional core is complete and [deployed on Vercel](https://windshift-january-2026.vercel.app): Windshift shows decision-time Elexon wind forecasts and quantifies their retrospective errors. Repository, video and submission deliverables remain manual and pending. Docker execution remains unverified. This is not a claim of full challenge completion.

The original challenge DOCX was reread on 25 October 2026. This checklist maps its requirements to the current local implementation. Existing test/browser evidence is in [VERIFICATION.md](VERIFICATION.md); this document does not claim a new test run.

| Brief requirement | Current evidence / status |
|---|---|
| Help a UK day-ahead buying team understand forecast wind available at its decision time | Decision replay: choose a January decision date and applied UK-time cutoff; inspect delivery curve, exact interval MW, publication and lead time. `frontend/src/App.tsx`, `components/WindChart.tsx`, `components/IntervalTable.tsx`. |
| Select the latest forecast available when the purchase decision is made | `backend/engine.py`, `Snapshot.analyze`: greatest `publishTime <= cutoff`, independently per target; later vintages and actuals cannot affect selection. Exact boundary and fractional-second tests in `tests/backend/test_engine.py`. |
| Evaluate forecast accuracy quantitatively | January review shows MAE, signed bias, RMSE, P90 absolute error, maximum overforecast and paired coverage. Reveal actuals for interval error. `components/Review.tsx`, `backend/engine.py`. |
| Support decisions considering quantified error | Forecast/error inspection and sign explanations are implemented. Historical errors remain labelled hindsight; no future-confidence guarantee or unsupported purchase recommendation is implied. See [METHODOLOGY.md](METHODOLOGY.md). |
| Use only Elexon national-level wind actuals and forecasts | `backend/refresh.py` retrieves only WINDFOR and FUELHH WIND; real `data/snapshot.json` includes provenance. Source reporting coverage is qualified; no utility demand, portfolio, price or thermal quantity is invented. |
| FUELHH `/stream`, `fuelType=WIND`, half-hour `startTime` and `generation` | Refresh filters WIND; engine validates half-hour timestamps and settlement periods. Actuals are the retrieved hindsight view. `data/README.md`, `backend/refresh.py`, `backend/engine.py`. |
| WINDFOR `/stream`, target `startTime`, `publishTime`, `generation` | Retained and used in eligibility/lineage. Observed WINDFOR is hourly: each hourly MW value is explicitly held for its two half-hours, without interpolation or gap filling. Chart/method/API/CSV disclose this. |
| Data relevant to January 2026 purchase decisions | Jan 1–31 decisions map to Jan 2–Feb 1 delivery under the documented next-UK-civil-day assumption. Dec 31 forecasts support early Jan 1 cutoffs. `backend/engine.py`, refresh windows and boundary tests. |
| React frontend | React/TypeScript source and pinned packages in `frontend/`; production Vite build. |
| Python backend | FastAPI API, deterministic engine and explicit refresh CLI in `backend/`. |
| Explicitly disclose AI assistance in README | README “AI assistance disclosure” identifies assistance and the user's review/presentation responsibility. |
| Use Docker | Multi-stage `Dockerfile`, `docker-compose.yml`, healthcheck and non-root runtime provided. Configuration validation passed previously; image build/run was not completed because the Docker daemon was unavailable. **Execution unverified.** |
| Deploy on Vercel or Heroku | **Completed on Vercel**, with React assets and a Python 3.12 FastAPI function. Anonymous HTTP checks, live workflow and independent production data audit passed. See [DEPLOYMENT.md](DEPLOYMENT.md). |
| Stay within 16 hours | [EFFORT.md](EFFORT.md) records observed work, interruptions and approximate parallel effort. Add redesign and the user's own review/recording/publication time; total human effort is not certified here. |
| Present/pitch to client | Working UI, README walkthrough and customer segment in [DEMO.md](DEMO.md). Actual presentation/recording remains manual. |
| Explain architecture, design, analysis, code and development practices to technical lead | README diagram/file map, methodology, tests, independent data/dependency audits and technical demo segment. Actual recorded presentation remains pending. |
| Unlisted YouTube demo, <=10 minutes, customer overview <=5 minutes and technical overview <=5 minutes | Nine-minute script allocates about 4m30s to each segment. **No video recorded/uploaded; actual duration and access unverified.** The original requires the video before submission. |
| Public GitHub repository with anonymous/random repository name | Clean-source packaging script and release checklist supplied. **No public repository created/pushed; manual pending.** |
| README describes files/directories and how to start | README file-responsibility table, local/dev/production/Docker commands and refresh instructions provided. |
| README links deployed application | **Completed:** README links the verified production application URL. |
| Submit details in the supplied form | [MANUAL-RELEASE.md](MANUAL-RELEASE.md) provides the final checklist. **No form filled/submitted; manual pending.** |
| Open every submitted URL in incognito and verify access | Application access passed unauthenticated HTTP and browser checks. Final incognito checks for all submitted URLs remain manual; repository and video URLs are not yet created. |

The 25 October redesign completed and verified these additional refinements:

- Selected-day MAE/RMSE/bias appear with the hindsight overlay; January review switches between signed bias and MAE without reusing directional labels for magnitude.
- Analysis requests time out after 15 seconds, with clear retry and stale-request cancellation; a focused fake-timer test verifies recovery presentation.
- CSV downloads show progress and failure feedback; tests verify failure/retry and the browser downloaded the complete 1,488-row month export.
- Static method/recovery guidance is accessible in the error state and covered by the retry test.
- The interval inspector exposes the original source hour, publication, delivery lead and issue age at the buying cutoff. Browser keyboard checks verified a :30 target retains its :00 source hour.
- New screenshots, walkthrough/demo references and the dated verification record describe the redesigned result. A fresh clean-source archive is generated after final documentation.

Current UI already has loading, API failure/retry, no-decision, no-values, empty-filter and partial-coverage states; keyboard chart/table inspection; source provenance; and explicit hindsight reveal. Zero is valid, unavailable values stay null, and error is **forecast minus actual**: positive means wind shortfall versus expectation. A missing demand/thermal purchase calculator is a deliberate consequence of the brief's wind-only data scope, not an omitted supported feature.
