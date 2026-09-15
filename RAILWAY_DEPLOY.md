# SahaNova Railway deployment

Production service: `sahanova-fantasy`

## Source
- GitHub repo: `xtenrore/sahanova-fantasy`
- Branch: `main`
- Start command: `rm -rf data && ln -s /data data && npm start`
- Health check path: `/api/health`
- Restart policy: on failure

## Persistence
Attach the persistent Railway volume `sahanova-data` at `/data`.
The start command symlinks the application's `data/` directory to that volume so accounts, admin config and overrides survive deployments.

`server.mjs` also supports `DATA_PATH` when an explicit JSON database path is preferred.

## Production variables
- `NODE_ENV=production`
- `SESSION_SECRET` — strong random secret, at least 32 characters
- optional `DATA_PATH=/data/db.json`

Do not commit secret values.

## v1.3 verification
1. `npm run qa` passes all domain, session, Nova IQ and Parity+ tests.
2. `GET /api/health` returns HTTP 200 and `{ "ok": true }`.
3. `/` loads the fullscreen-first SahaNova UI.
4. Manager login works with `demo@sahanova.local` / `demo1234`.
5. Admin login works with `admin@sahanova.local` / `admin1234`.
6. Admin configuration changes survive a redeploy.
7. `/manifest.webmanifest` and `/sw.js` load successfully.
8. `public/sw.js` serves cache `sahanova-v4` and includes the Parity+ assets.
9. More → Nostradamus / Manager Cards / Status / Cups / Rewards / Discover / 3-Week Planner opens correctly.
10. Team page shows deadline, ordered bench and active-card state.
11. Transfers are unlimited; budget/card rules still apply.
