# Verification record

## Production deployment — 25 October 2026

Application: [windshift-january-2026.vercel.app](https://windshift-january-2026.vercel.app). React assets and the Python FastAPI backend are deployed together in a Vercel Hobby project. Successful deployment ID: `dpl_F7pwrqXwwASUujeX5sE3CTYjsQHA`.

- The Python 3.12 environment passed **54 backend tests** (1.22 seconds), including two deployment regression tests for matching pinned dependencies and excluding local state. The existing 12 frontend tests remain passing, for 66 tests overall. Runtime dependency compatibility check passed.
- The Vercel Linux build installed the pinned dependencies, built the React interface and completed successfully. An initial function import failure was repaired by adding explicit runtime dependencies to `pyproject.toml`; the production URL now points to the verified successful deployment.
- Plain HTTP requests without authentication returned 200 for root HTML, `/api/health`, default analysis and Jan 31 daily CSV. Health reported `status: ok` and `dataLoaded: true`, with the expected snapshot identity.
- The independent audit compared all 1,488 production intervals, source-hour lineage, forecast publication eligibility, daily/monthly metrics and snapshot identity with the cached Elexon responses. It passed; the exact production audit command is recorded in [DATA-AUDIT.md](DATA-AUDIT.md).
- The production browser loaded fonts/assets, changed the Jan 1 cutoff to 10:00, selected the 09:30 publication and showed forecast 18,699 MW, actual 15,228 MW and error +3,471 MW. January review displayed 10:00 MAE 2,016 MW and P90 4,197 MW after rounding.
- A real production month CSV download contained 1,488 data rows, decision dates Jan 1–31, delivery through Feb 1 and cutoff 10:00. The snapshot data itself did not change.

[Production screenshot](screenshots/production.jpg) was captured from the verified public deployment; the production browser reported no console errors during the check.

Repository publication, video/upload and form submission were not performed. Public HTTP access was verified; the final incognito checklist for all submitted URLs remains manual. Docker runtime validation remains pending because the local daemon was unavailable.

## Latest verification — 25 October 2026 redesign

Follow-up cutoff usability check: the control now explicitly says “Applied ✓” when its current time is already applied, announces the applied UK time, and offers an inline explanation. Changing 09:00 to 10:00 enabled Apply, selected the 09:30 issue, and changed the first Jan 1 decision forecast from 18,781 to 18,699 MW. Browser behavior was verified; all 12 frontend tests and the production build passed again. See [cutoff explanation](screenshots/cutoff-help.jpg).

The revised interface was built and tested locally through the Python server on port 8000. The server remains available for user review.

- **52 backend tests passed in 1.80 seconds**, including production SPA/assets and HTTP Range behavior. One upstream Starlette TestClient deprecation warning remains.
- **12 frontend tests passed**: the existing replay/retry/keyboard/source tests plus explicit day coverage, original-hour/freshness presentation, bias-versus-MAE semantics, 15-second timeout recovery and export progress/failure/retry. The frontend test command took 3.71 seconds; test execution was 1.33 seconds. The TypeScript check then caught one invalid test-query option, which was removed before the successful final production build.
- Final `npm run build` passed (Vite phase 756 ms). Output includes approximately 221 kB JavaScript (69 kB gzip), 46 kB CSS (9 kB gzip) and 60 kB of self-hosted font files. Actual font licence notices are included under `frontend/public/licenses/`.
- `npm audit --json` returned **zero known vulnerabilities** across 232 reported dependencies. The earlier Python runtime audit remains applicable; Python dependencies did not change in the redesign.
- The independent data audit was rerun against raw cache and the running API. All 1,488 default-cutoff intervals, lineage, publication eligibility and metrics match. See [DATA-AUDIT.md](DATA-AUDIT.md).
- Docker daemon availability was checked again: unavailable. `docker compose config --quiet` passes; image build/run remains unverified.

Browser checks covered replay at 1440×1000/1100, 900×1000, 390×844 and 320×800. Review and method were checked on mobile; review was also inspected on desktop. Client widths after scrollbars were 1425, 885, 375 and 305 pixels respectively, with no page-level overflow after the narrow-screen fix. The date strip and ledger intentionally scroll within their own containers.

| Workflow | New observed evidence |
|---|---|
| Publication and freshness | At 09:00 on Jan 1, 18,781 MW is from 07:30: 1.5 hours old at cutoff and 16.5 hours before first delivery. |
| Keyboard inspector | ArrowRight moved to 00:30 / SP 02; original source hour stayed 00:00, lead became 17 hours, actual was 15,505 MW and error +3,276 MW. |
| January boundary | Jan 31 decision shows Feb 1 delivery. At 10:00 its first forecast is 10,474 MW from 09:30; actual 8,724 MW, error +1,750 MW. |
| Daily hindsight summaries | Revealing actuals exposes selected-day MAE, RMSE and bias with paired coverage. |
| Bias / MAE selector | MAE uses a zero-to-positive magnitude scale and “Larger error” guide; bias retains directional surplus/shortfall labels. |
| Early cutoff | Jan 1 at 00:00 displays 44/48 forecasts, four missing in the accessible day label, and unavailable energy. |
| Sorting | All 48 forecast values sorted ascending, from 17,541 to 18,895 MW for Jan 1 at 09:00. |
| Real month download | New async export downloaded 1,488 data rows at 10:00; first/last decisions and Jan 2–Feb 1 targets were checked from the downloaded CSV. |
| Source view | Two grouped datasets, all 63 request links, full snapshot identity and assumptions remain available. |
| Browser console | No error logs were returned during the final redesigned interface check. |

Fresh visual evidence: [desktop preview](screenshots/desktop-preview.jpg), [desktop replay](screenshots/desktop-replay.jpg), [desktop review](screenshots/desktop-review.jpg), [mobile replay](screenshots/mobile-replay.jpg) and [mobile review](screenshots/mobile-review.jpg). Motion respects `prefers-reduced-motion` in CSS; a separate browser emulation of that preference was not performed.

The earlier API-unavailable screenshot below is retained as historical evidence of the prior design. New failure/recovery behavior is covered by focused tests. This local redesign check preceded the production deployment recorded above; video, repository publication, final incognito access checks and submission remain manual.

## Earlier verification — 24 October 2026

The following checks describe the earlier interface. They were assembled on 25 October from observed results.

## Automated checks

- Final backend run: **52 tests passed in 1.14 seconds**. One upstream Starlette warning concerned deprecated httpx usage. `pip check` reported no broken requirements.
- Frontend: **8 tests passed** and the production TypeScript/Vite build passed.
- Final dependency checks: full `npm audit` and runtime `pip-audit` reported **zero known vulnerabilities**. See [dependency audit](DEPENDENCY-AUDIT.md).
- The independent [data audit](DATA-AUDIT.md) reconstructed the snapshot from cached primary responses and matched all 1,488 default-cutoff intervals, publication eligibility, hourly lineage and metrics.
- `docker compose config` passed. Docker's Linux daemon was unavailable, so the image was **never built or run**. Configuration validation is not container-runtime validation.

## Browser checks

Replay, review and method views were inspected at 1440 × 1000 and 390 × 844. The mobile viewport had a 375 px client width after its scrollbar. No page-level horizontal overflow was observed.

| Interaction | Observed result |
|---|---|
| Default 09:00 cutoff, first interval | Forecast 18,781 MW; actual 15,228 MW; error +3,553 MW. |
| Change cutoff to 10:00 | Eligible publication changed from 07:30 to 09:30; first forecast changed to 18,699 MW. |
| Change cutoff to 00:00 | Coverage was 44/48; missing forecast energy stayed null. |
| January 31 decision | Delivery correctly advanced to February 1. |
| Chart ArrowRight | Selection advanced to settlement period 2. |
| January 1 surplus filter | Displayed an empty result. |
| Daily CSV download | Download contained 48 data rows; its first row matched the displayed selection. |
| Backend stopped | Vite returned HTTP 500; UI displayed “Analysis unavailable.” |
| Backend restarted and retry selected | Analysis recovered. |
| Production server on port 8000 | Built SPA loaded and was checked through the Python server. |

One transient development HMR console error occurred while files were being refactored. No fresh production error was observed during the production check.

Saved browser evidence: [desktop replay](screenshots/desktop-replay.jpg), [desktop preview](screenshots/desktop-preview.jpg), [mobile review](screenshots/mobile-review.jpg), and [API unavailable state](screenshots/api-unavailable.jpg).

No public URL, deployment, incognito check, video, or submission was completed. Heroku instructions are a manual handoff path, not evidence of a live deployment.
