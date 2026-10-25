# Manual publication and submission checklist

The application and anonymous public repository were published on 25 October 2026 after the user's explicit authorizations, and GitHub is connected to Vercel. Video recording/upload and form submission remain Himanshu's actions. This work has not purchased a hosting plan or add-on.

## Review locally

- [ ] Read README, methodology, AI disclosure and verification evidence; understand and amend the implementation as needed.
- [ ] Start the app, inspect real January data, change cutoff and inspect a publication time.
- [ ] Check the Jan 31 decision -> Feb 1 delivery boundary and the outcome overlay.
- [ ] Run backend tests, frontend tests and production build.
- [x] Start Docker Desktop/daemon and run the documented Docker build and smoke check. Completed 25 October: healthy container, browser/API/CSV checks and independent data audit passed.
- [ ] Confirm your total assignment effort, including your own review/recording/publication, remains within the brief's 16-hour cap. The effort log covers only observed assistant work and must not replace your own time record.

## Repository

- [x] Create public repository with an anonymous/random name: [HimanshuJ16/f68d061e00](https://github.com/HimanshuJ16/f68d061e00).
- [x] Publish the reviewed clean manifest; exclude `.venv`, `node_modules`, caches/logs, credentials, `.vercel/` and unrelated personal files.
- [x] Include source, locks, real snapshot/provenance, Docker/Vercel configuration, tests and documentation. The private challenge DOCX is excluded.
- [x] Preserve AI disclosure and the verified live application URL in README.
- [x] Push to `main` and connect the repository to the existing Vercel project.

## Application deployment

- [x] Deploy React and Python FastAPI to Vercel using the existing Hobby project space.
- [x] Verify `/api/health`, root page, cutoff change, actual overlay and CSV download in production.
- [x] Confirm static assets load and API URLs remain same-origin.
- [x] Add verified application URL to README: [windshift-january-2026.vercel.app](https://windshift-january-2026.vercel.app).
- [ ] Run the final signed-out incognito check below immediately before submission.

The Heroku container route remains documented as an alternative; it is not required for this Vercel deployment. Docker build/run is now verified locally, with the container available at `http://127.0.0.1:8001` while it remains running.

## Video

- [ ] Record your own demo using `docs/DEMO.md`, keeping customer pitch <=5 minutes and technical review <=5 minutes, total <=10 minutes.
- [ ] Explain assumptions and limitations honestly. Read real figures from the app, not an invented script.
- [ ] Upload manually as unlisted YouTube. Check picture/audio, processing completion and link access.
- [ ] Video URL: **not recorded or uploaded**.

## Final incognito verification and form

- [ ] Open the public GitHub URL in a fresh incognito window while signed out; confirm the repository and README are readable. Anonymous HTTP access to README was checked during publication; the final incognito pass remains yours.
- [ ] Open the deployed application in incognito; check data and interactions without credentials.
- [ ] Open the unlisted YouTube URL in incognito; confirm video playback and full duration.
- [ ] Recheck all three URLs immediately before submission. Do not claim access verification until these checks actually pass.
- [ ] Fill and submit the challenge form yourself with the real URLs. No form has been filled or submitted by the assistant.
