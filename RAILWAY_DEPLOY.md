# SahaNova Railway deployment

Production service: `sahanova-fantasy`

## Source

- GitHub repo: `xtenrore/sahanova-fantasy`
- Branch: `main`
- Start command: `rm -rf data && ln -s /data data && npm start`
- Health check path: `/api/health`
- Restart policy: on failure

## Persistence

Attach a Railway persistent volume named `sahanova-data` at `/data`.

The start command symlinks the application's `data/` directory to that volume. This makes `db.json` persist across deployments while preserving the same local development code path.

## Production variables

Set these in Railway:

- `NODE_ENV=production`
- `SESSION_SECRET` — strong random secret, at least 32 characters

Do not commit the secret.

## Verification

After deploy:

1. `GET /api/health` returns HTTP 200 and `{ "ok": true }`.
2. `/` loads the fullscreen-first SahaNova UI.
3. Manager login works with `demo@sahanova.local` / `demo1234`.
4. Admin login works with `admin@sahanova.local` / `admin1234`.
5. Admin configuration changes survive a redeploy.
6. `/manifest.webmanifest` and `/sw.js` load successfully.
