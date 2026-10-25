# Manual publication and submission checklist

The application was deployed to Vercel on 25 October 2026 after explicit user authorization. Repository publication, video recording/upload and form submission remain Himanshu's actions. This work has not purchased a hosting plan or add-on.

## Review locally

- [ ] Read README, methodology, AI disclosure and verification evidence; understand and amend the implementation as needed.
- [ ] Start the app, inspect real January data, change cutoff and inspect a publication time.
- [ ] Check the Jan 31 decision -> Feb 1 delivery boundary and the outcome overlay.
- [ ] Run backend tests, frontend tests and production build.
- [ ] Start Docker Desktop/daemon and run the documented Docker build and smoke check if container execution was unavailable during development.
- [ ] Confirm your total assignment effort, including your own review/recording/publication, remains within the brief's 16-hour cap. The effort log covers only observed assistant work and must not replace your own time record.

## Repository

- [ ] Create a new public GitHub repository with an anonymous/random name (the product can still be called Windshift).
- [ ] Review files before publication. Exclude `.venv`, `node_modules`, cache/logs, local credentials and unrelated personal files. The supplied `.gitignore` is a starting point.
- [ ] Include source, lockfiles, real snapshot/provenance, Docker configuration, tests and documentation. Do not upload the private challenge DOCX.
- [ ] Preserve the explicit AI assistance disclosure. Replace any pending deployment status with the actual verified application URL.
- [ ] Push manually. Repository URL: **not created**.

## Application deployment

- [x] Deploy React and Python FastAPI to Vercel using the existing Hobby project space.
- [x] Verify `/api/health`, root page, cutoff change, actual overlay and CSV download in production.
- [x] Confirm static assets load and API URLs remain same-origin.
- [x] Add verified application URL to README: [windshift-january-2026.vercel.app](https://windshift-january-2026.vercel.app).
- [ ] Run the final signed-out incognito check below immediately before submission.

The Heroku container route remains documented as an alternative; it is not required for this Vercel deployment. Docker build/run is still unverified locally because its daemon was unavailable.

## Video

- [ ] Record your own demo using `docs/DEMO.md`, keeping customer pitch <=5 minutes and technical review <=5 minutes, total <=10 minutes.
- [ ] Explain assumptions and limitations honestly. Read real figures from the app, not an invented script.
- [ ] Upload manually as unlisted YouTube. Check picture/audio, processing completion and link access.
- [ ] Video URL: **not recorded or uploaded**.

## Final incognito verification and form

- [ ] Open the public GitHub URL in a fresh incognito window while signed out; confirm the repository and README are readable.
- [ ] Open the deployed application in incognito; check data and interactions without credentials.
- [ ] Open the unlisted YouTube URL in incognito; confirm video playback and full duration.
- [ ] Recheck all three URLs immediately before submission. Do not claim access verification until these checks actually pass.
- [ ] Fill and submit the challenge form yourself with the real URLs. No form has been filled or submitted by the assistant.
