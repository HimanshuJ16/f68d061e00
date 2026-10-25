# Demo script — target 9 minutes

Record the working application and your own narration after reviewing the code and assumptions. Do not present generated assistance as unaided personal authorship. The README discloses AI use. No video has been recorded or uploaded by this build.

This sequence targets the verified 25 October interface and live Vercel deployment. Read the latest dated verification record and use the production URL for the recording. The video itself remains to be recorded and uploaded by Himanshu.

## Customer walkthrough — about 4 minutes 30 seconds

**0:00–0:40 — The buying question.** “Windshift answers two questions: what wind forecast was available at our buying cutoff, and how far did that expectation differ from outturn? It uses the Elexon data requested for this pilot. It is a wind decision aid; it cannot infer our customer demand or thermal purchase quantity.”

**0:40–1:35 — Replay one decision.** Open Decision replay at 1 January, 09:00. Use the horizontal date strip and point to the large decision date and separate next-day delivery timeline. Move across the chart, then use an arrow key to select a half-hour. Read the adjacent Interval inspector's forecast MW, source publication time, original source hour and lead time. Explain that later publications are excluded even though today's archive contains them.

**1:35–2:20 — Change what was knowable.** Edit the cutoff to 10:00 and select Apply cutoff. Show that editing alone leaves the earlier analysis in place until applied. Inspect the first interval's changed publication and value, then restore 09:00. Do not promise the later forecast is always better. Mention that 09:00 is a planning assumption before a morning auction and must match the team's actual workflow.

**2:20–3:15 — Reveal the outcome.** Turn on Reveal actuals. Show the outcome line, inspector comparison and daily hindsight summary. Explain that positive forecast minus actual means wind fell short of expectation. Select a real interval from the ledger and state that the hourly forecast is held across two half-hours. Outcomes were unavailable at the buying cutoff.

**3:15–4:05 — Review the month.** Open January review. Read the displayed metrics with MW units and sample size. Switch the daily comparison from Mean bias to MAE to explain direction versus magnitude. State that P90 is a historical sample statistic, not guaranteed future coverage. Select a day to return to its replay.

**4:05–4:30 — Practical handoff.** Select 31 January to show February 1 delivery, download its CSV and point to coverage and Method & sources. Close with what the pilot establishes: transparent forecast selection and an auditable error review. Customer demand, portfolio allocation and out-of-sample uncertainty calibration remain future inputs outside this wind-only brief.

## Technical review — about 4 minutes 30 seconds

**4:30–5:15 — Architecture.** Show the directory tree and one diagram from the README. A reproducible offline snapshot separates upstream API reliability from UI responsiveness. Python owns normalization, cutoff eligibility and metrics. React owns navigation, visualization and inspection. The live Vercel project serves the interface and a Python FastAPI function on one domain. Docker provides a separate local/container route.

**5:15–6:20 — The correctness seam.** Show the forecast-selection function and tests. Focus on exact-cutoff inclusion, excluding later publications, selecting independently per target, preserving missing values, and January decision boundaries. Explain the hourly step-hold assumption and why no percentage accuracy is used.

**6:20–7:10 — Ingestion.** Show the refresh command and provenance rather than rerunning it during the recording. WINDFOR uses publication-time windows; FUELHH uses settlement-date windows and WIND. Show bounded requests, retries/cache, duplicate policy and snapshot identity. Explain that archived availability is approximated by publishTime, not measured customer ingestion latency.

**7:10–8:00 — Tests and UI behavior.** Show the latest dated test and browser evidence in `docs/VERIFICATION.md`. Briefly explain the 15-second client request limit, explicit analysis retry, and export preparation/failure states; demonstrate only checks completed in final QA. Show the source-hour lineage and a missing-data state if time permits. Distinguish the completed Vercel checks from the Docker runtime check still pending.

**8:00–8:45 — Deployment and tradeoffs.** Show the Vercel manifest, Python dependency manifest and separate Dockerfile. The Vercel app is live; local Docker execution remains unverified. Explain why the fixed January snapshot makes the demo deterministic and how to refresh it. Connect the instrument layout to its purpose: one delivery curve and a persistent selected-interval reading. Discuss labelled hindsight, the absence of a forecast confidence band, and next steps for production monitoring and rolling validation.

**8:45–9:00 — Disclosure and handoff.** Point to AI assistance disclosure, effort log and manual publication checklist. Show the verified production URL, and preserve the final incognito access checks before submission. End before 10 minutes total, with each part under 5 minutes.
