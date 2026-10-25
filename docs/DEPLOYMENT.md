# Container operation and manual deployment

## Current Vercel deployment

Production: [https://windshift-january-2026.vercel.app](https://windshift-january-2026.vercel.app). Deployed on 25 October 2026 following the user's explicit authorization, in the existing Hobby project space. No paid plan or add-on was purchased.

Source repository: [HimanshuJ16/f68d061e00](https://github.com/HimanshuJ16/f68d061e00), public with the anonymous name required by the challenge. It is connected through Vercel's GitHub integration to this existing project, with production branch `main` and root directory `.`. Pushes to `main` use the tracked manifests and update production. No Vercel CLI credentials or local `.vercel/` state are committed. Commit authors use the account's GitHub no-reply address.

The root `pyproject.toml` declares the Python 3.12 dependency set and `backend.app:app` entrypoint. `vercel.json` builds React with npm, configures the FastAPI function, and includes `data/snapshot.json`. `.vercelignore` prevents uploading virtual environments, raw caches, tests, development dependencies and internal documentation. Built assets and font licence notices are generated from the tracked frontend. API requests and frontend URLs use the same origin.

The same pinned runtime dependencies appear in `requirements.txt` (local/Docker) and `pyproject.toml` (Vercel); a regression test prevents drift. When a pyproject manifest is present, Vercel installs from it, so its explicit dependencies are essential. The backend does not run Docker on Vercel: it runs as a Python function. The Docker configuration remains a separate supported deployment route.

After local review and tests, normally commit and push to `main` to update this connected project. The CLI remains available for an explicitly intended direct deployment:

```sh
npx vercel login
npx vercel link --project windshift-january-2026
npx vercel deploy --prod
```

These commands use your normal CLI account; never paste tokens into source files or chat. The existing local directory is already linked. `.vercel/` is ignored and excluded from the source archive. A fresh checkout needs to be linked again.

Public HTTP checks passed without authentication for `/`, `/api/health`, `/api/analysis?cutoff=09:00` and daily CSV export. Browser checks verified cutoff changes, hindsight review and the full 1,488-row month download. The independent raw-data audit matches the production API. See [VERIFICATION.md](VERIFICATION.md) for evidence. Repository publication is complete; video/form actions and final incognito checks remain on the release checklist.

Primary platform references: [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi), [Python runtime](https://vercel.com/docs/functions/runtimes/python), [function configuration](https://vercel.com/docs/project-configuration/vercel-json).

The Dockerfile builds `frontend/dist` with Node 22, installs the pinned Python requirements into Python 3.11, and serves both the API and frontend through FastAPI. It runs as a non-root user, listens on `0.0.0.0`, and honors `PORT` with a default of 8000. The packaged snapshot is read locally; serving requests does not refresh upstream data.

## Local container

From the project root, with Docker's Linux engine running:

```sh
docker compose up --build
```

Open `http://127.0.0.1:8000`. Set `APP_PORT` to change the local host port. `docker compose down` stops the service. The Docker healthcheck requests `/api/health` using Python's standard library and requires both `status: ok` and `dataLoaded: true`; an HTTP 200 response with degraded data is unhealthy.

The image build and container execution passed on 25 October 2026 with Docker Engine 28.0.4, Linux/amd64 and Python 3.11.17. Compose reported healthy; the app served its bundled frontend, API and CSV exports, and all 1,488 default-cutoff intervals matched the independent raw-data audit. A separate container also served health successfully with `PORT=9000` and `--network none`. See [verification evidence](VERIFICATION.md) and [container data audit](DOCKER-DATA-AUDIT.md).

The verified local instance uses port 8001 because the existing Python test server occupies port 8000. To reproduce this configuration in PowerShell:

```powershell
$env:APP_PORT = '8001'
docker compose -p windshift up --build -d --wait --wait-timeout 120
docker compose -p windshift ps
Invoke-RestMethod http://127.0.0.1:8001/api/health
```

Open [http://127.0.0.1:8001](http://127.0.0.1:8001). Stop this instance with `docker compose -p windshift down`. Its host binding is loopback only. Docker Desktop initially failed on a stale telemetry socket; its runtime directory was preserved under a backup name and recreated before the successful start. Existing Docker images, volumes and application data were not reset.

## Heroku container registry: manual path

These commands are instructions only. No application was created, no image was pushed, and no release was made. They target an existing Heroku application and do not provision resources.

```sh
heroku login
heroku container:login
heroku stack:set container --app YOUR_EXISTING_APP
docker build --platform linux/amd64 --provenance=false -t registry.heroku.com/YOUR_EXISTING_APP/web .
docker push registry.heroku.com/YOUR_EXISTING_APP/web
heroku container:release web --app YOUR_EXISTING_APP
heroku open --app YOUR_EXISTING_APP
```

Heroku sets `PORT`; its container runtime uses the Dockerfile's startup command. The provided `Procfile` is a convenience for local process tools and is ignored by Heroku container deployments. The provided `heroku.yml` supports Heroku's alternate Git-based container build flow and inherits the same Dockerfile command because it has no `run` override.

Heroku uses an ephemeral filesystem. Refresh the snapshot locally and rebuild the image to update its packaged data. Heroku ignores Dockerfile `EXPOSE` and `HEALTHCHECK`; the application still needs to listen on the assigned `PORT`. Its runtime requires `linux/amd64` images and Docker v2 schema-2 manifests. The build command disables default provenance attestations, following [Heroku's BuildKit compatibility guidance](https://help.heroku.com/74S3XXMP/workaround-for-docker-push-error-405-method-not-allowed-using-buildkit-0-11). That guidance also describes Docker Desktop image-store incompatibility if a push returns HTTP 405.

Primary deployment references, checked 24 October 2026: [Heroku Container Registry and Runtime](https://devcenter.heroku.com/articles/container-registry-and-runtime), [heroku.yml builds](https://devcenter.heroku.com/articles/build-docker-images-heroku-yml), [container startup commands](https://help.heroku.com/YNG7SACF/how-do-i-define-a-start-command-for-an-app-using-docker-images), [Dockerfile reference](https://docs.docker.com/reference/dockerfile/), and [Compose configuration](https://docs.docker.com/compose/gettingstarted/).
