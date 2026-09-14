# SahaNova — Cloudflare Deployment Checklist

This is the production handoff for the prepared Cloudflare stack. Do not deploy this project to Vercel.

## 1. Repository

Use a GitHub repository named `sahanova-fantasy` and put the contents of this project at the repository root. The default branch should be `main`.

Before deployment, run:

```bash
npm run qa
```

## 2. Create D1

From the repository root while authenticated to Cloudflare:

```bash
npx wrangler@latest d1 create sahanova-db --location eeur
```

Cloudflare returns a `database_id`. Replace only this placeholder in `wrangler.jsonc`:

```text
REPLACE_WITH_D1_DATABASE_ID
```

Keep:

- binding: `DB`
- database name: `sahanova-db`
- migrations directory: `migrations`

## 3. Create the session secret

Generate a cryptographically strong random secret of at least 32 characters and store it as the Worker secret `SESSION_SECRET`. Do not commit it.

Example interactive command:

```bash
npx wrangler@latest secret put SESSION_SECRET
```

For local Wrangler development only, copy `.dev.vars.example` to `.dev.vars` and use a separate development secret.

## 4. Apply D1 migrations

```bash
npx wrangler@latest d1 migrations apply sahanova-db --remote
```

This should create:

- `users`
- `app_state`

The migration also seeds the default fantasy configuration and empty catalog overrides. Demo manager/admin user hashes are created by the Worker on first login, not stored as plaintext in SQL.

## 5. Deploy

```bash
npx wrangler@latest deploy
```

The Worker is configured to serve `public/` through Workers Static Assets, use SPA fallback routing, and run Worker code first so security headers apply to both API and assets.

## 6. Verify production

Check these in order:

1. `GET /api/health` returns `200`, `ok: true`, `platform: cloudflare-workers`, `database: d1`.
2. Opening `/` shows the SahaNova fullscreen-first gate and PWA assets load without console errors.
3. Login with `demo@sahanova.local` / `demo1234` works.
4. Opening `/admin/` and logging in with `admin@sahanova.local` / `admin1234` works.
5. Change a fantasy rule in Admin, refresh in a clean tab/browser, and confirm the value persists through D1.
6. Change a club/player/fixture override in Admin, reload the main app, and confirm `/api/public/bootstrap` returns it and the app applies it.
7. Signup creates a D1 user and the session survives navigation/refresh.
8. Logout clears the session.
9. A manager session receives `403` from `/api/admin/config` and `/api/admin/overrides`.
10. The service worker and `manifest.webmanifest` install successfully.

## 7. GitHub-connected Cloudflare builds

If using Cloudflare's Git integration, connect the `sahanova-fantasy` repository and let Cloudflare deploy the Worker project from its Wrangler configuration. Do not configure this as a Pages-only static project; the backend requires a Worker with D1 and a secret binding.

## 8. Optional custom domain

After the worker is healthy, attach the desired custom domain from the Worker settings. Keep HTTPS enabled. Do not expose a direct origin or add external hosting unless there is a specific need.

## Acceptance condition

Deployment is complete only when the live URL passes the production checks above. Do not replace D1 with browser-only/localStorage persistence, do not remove authentication checks, and do not redesign the SahaNova UI during deployment.
