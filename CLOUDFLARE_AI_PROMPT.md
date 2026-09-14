You are operating as the production deployment engineer for an existing finished web application named **SahaNova Fantasy Football**.

Your task is to deploy the provided GitHub repository to **Cloudflare only** and finish all Cloudflare infrastructure/configuration required for the application to work. Do not use Vercel, Netlify, Firebase Hosting, Supabase, or any alternate hosting platform.

## Repository / architecture

The repository should be named `sahanova-fantasy` and its default branch is `main`.

The code is already implemented. Do not redesign, rewrite, replace, simplify, or convert the application to another framework. Preserve the existing product UI and functionality.

Production architecture already prepared in the repository:

- `public/` = PWA frontend and static assets
- `src/worker.js` = Cloudflare Worker API and asset gateway
- `wrangler.jsonc` = Workers Static Assets + D1 production config
- `migrations/0001_initial.sql` = D1 schema/default app state
- `/api/health` = health check
- `/api/public/bootstrap` = public shared configuration/overrides
- `/api/auth/login`, `/api/auth/signup`, `/api/auth/session`, `/api/auth/logout`, `/api/auth/forgot` = auth endpoints
- `/api/admin/config` = protected admin configuration
- `/api/admin/overrides` = protected shared demo-data overrides

Authentication uses PBKDF2-SHA256 password hashing, HMAC-SHA256 signed HttpOnly sessions, SameSite=Lax cookies, and a secret called `SESSION_SECRET`.

## Required work

Perform all of the following. Do not stop after giving me instructions if you can perform the action yourself inside Cloudflare.

1. Import/connect the GitHub repository as a **Cloudflare Worker project with Static Assets**, not as a static-only Pages project.
2. Preserve the Worker name `sahanova-fantasy` unless Cloudflare requires a collision-safe variation.
3. Create a Cloudflare D1 database named exactly `sahanova-db`. Prefer an Eastern Europe location hint (`eeur`) if Cloudflare asks for a location and it is available.
4. Bind that D1 database to the Worker using the binding name exactly `DB`.
5. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the real D1 database UUID. Do not change the binding name or migrations directory.
6. Create a cryptographically strong random production secret of at least 32 characters and store it as a Cloudflare Worker **secret** named exactly `SESSION_SECRET`. Never put the secret in source code, GitHub, normal plaintext vars, logs, or your response.
7. Apply all remote D1 migrations from the `migrations/` directory. Confirm the `users` and `app_state` tables exist.
8. Run the repository QA command before deployment: `npm run qa`. If it fails, fix only deployment/runtime issues necessary for Cloudflare compatibility; do not redesign product behavior.
9. Deploy using the repository's `wrangler.jsonc`. The application must run as a Worker plus Workers Static Assets with D1 attached.
10. Ensure production serves the existing SPA/PWA correctly, including `/admin/`, service worker, manifest, icons, JS modules and CSS.
11. Do not remove `assets.not_found_handling: "single-page-application"` or the `ASSETS` binding. Keep Worker-first routing so the existing security headers apply.
12. Do not weaken server-side admin authorization. Manager accounts must not be able to write `/api/admin/*` endpoints.
13. Do not replace D1 persistence with localStorage-only persistence. Browser localStorage is only an offline/cache layer; D1 is the production source for users and shared admin state.
14. Do not introduce paid third-party services. Use Cloudflare's available free-compatible stack for this deployment.

## Production verification — mandatory

After deploying, test the actual live deployment rather than assuming it works.

- `GET /api/health` must return HTTP 200 with `ok: true`, `platform: "cloudflare-workers"`, and `database: "d1"`.
- Load `/` and verify the SahaNova fullscreen-first screen renders and all static assets load.
- Test manager login using the public demo account `demo@sahanova.local` / `demo1234`.
- Test admin login at `/admin/` using `admin@sahanova.local` / `admin1234`.
- From Admin, change a fantasy rule, reload, and verify the change is persisted from D1.
- From Admin, change at least one club/player/fixture override; then reload the main app and confirm `/api/public/bootstrap` returns it and the app reflects it.
- Create a new test manager through signup, refresh, and verify the authenticated session persists.
- Log out and confirm `/api/auth/session` returns 401 afterward.
- With a manager session, verify `/api/admin/config` and `/api/admin/overrides` return 403.
- Confirm `manifest.webmanifest` and `/sw.js` load successfully and the PWA has no fatal console errors.
- Confirm the response security headers remain present, including CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and HSTS on HTTPS.

If any check fails, diagnose it from Cloudflare logs/configuration, fix the issue, redeploy, and retest before declaring completion.

## Final result I want from you

When everything is complete, give me only a concise deployment report containing:

- the final live `workers.dev` or custom-domain URL
- Worker name
- D1 database name and binding name (never secret values)
- migration status
- result of `npm run qa`
- a short checklist showing each production verification above as PASS/FAIL
- any limitation that genuinely remains

Do not expose secret values. Do not claim success unless the live deployment has actually been tested.
