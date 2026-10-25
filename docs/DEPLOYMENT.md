# Deployment

## Vercel

[Production application](https://windshift-january-2026.vercel.app) · [GitHub repository](https://github.com/HimanshuJ16/f68d061e00)

The repository is connected to the Vercel project `windshift-january-2026`, with production branch `main` and root directory `.`. Pushes to `main` trigger the production build.

React assets and the FastAPI backend share one domain. Vercel runs the backend as a Python 3.12 function; Docker is a separate deployment option.

- `pyproject.toml` declares pinned runtime dependencies and the `backend.app:app` entrypoint.
- `vercel.json` builds the React frontend and includes `data/snapshot.json` in the function bundle.
- `.vercelignore` excludes local environments, caches and development material from CLI uploads.
- `requirements.txt` and `pyproject.toml` contain the same runtime dependency pins, checked by a regression test.

A fresh checkout can be linked using the Vercel CLI:

```sh
npx vercel login
npx vercel link --project windshift-january-2026
```

## Docker

The multi-stage image builds React with Node 22, installs the pinned Python dependencies into Python 3.11 and serves the frontend and API through FastAPI. The runtime uses non-root UID/GID 10001 and listens on `PORT`, defaulting to 8000. Requests use the included snapshot without contacting Elexon.

With Docker's Linux engine running:

```sh
docker compose up --build -d --wait --wait-timeout 120
docker compose ps
```

Open [localhost:8000](http://127.0.0.1:8000). The host port is bound to loopback only. To use port 8001 instead, set `APP_PORT` before starting Compose:

```powershell
$env:APP_PORT = '8001'
docker compose up --build -d --wait --wait-timeout 120
```

Stop the service with `docker compose down`. To refresh the packaged data, run the refresh command described in the README and rebuild the image.

## Health and validation

`GET /api/health` must return both `status: ok` and `dataLoaded: true`. The Docker healthcheck checks these fields; an HTTP 200 response alone does not indicate readiness.

On 25 October 2026, the Linux/amd64 image built successfully and Compose reported a healthy container. Browser cutoff changes, hindsight rendering, monthly/daily CSV exports and API input validation passed. An independent data audit matched all 1,488 default-cutoff intervals and daily/monthly metrics against raw Elexon responses. A separate container also passed startup with `PORT=9000` and external networking disabled.

The public Vercel deployment also passed frontend, API and export checks. Docker image publication to a registry is not required for the current Vercel deployment.
