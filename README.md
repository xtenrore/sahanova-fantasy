# SahaNova Fantasy Football

SahaNova is an original, independent Turkish-first fantasy-football PWA inspired by modern mobile sports experiences. It is **not affiliated with TFF**. Bundled clubs, players, fixtures, scores and rankings are demo data.

## Production target: Cloudflare

This repository is prepared specifically for Cloudflare and does **not** use Vercel.

- **Cloudflare Workers + Static Assets** — serves the PWA and API in one deployment
- **Cloudflare D1** — users, admin configuration and shared demo-data overrides
- **Worker Secrets** — `SESSION_SECRET` for signed HttpOnly sessions
- **GitHub Actions** — dependency-free QA on pushes and pull requests
- **PWA** — service worker, offline shell, install manifest, iOS safe-area support

The production entrypoint is `src/worker.js`; the static app lives in `public/`; D1 migrations live in `migrations/`.

## Main product features

- Fullscreen-first immersive entry with iOS fallback
- Turkish default and English language support
- Seven-step onboarding
- 15-player squad management and seven legal formations
- Captain/vice-captain and bench swaps
- Transfer market with budget, club and position validation
- Player detail sheets, form/price charts and fixture difficulty
- Match Center, fixtures, leagues, profile and achievements
- Configurable fantasy scoring rules
- Protected admin surface
- Original SahaNova visual identity and assets
- Dark/light/system themes, sounds, reduced motion and keyboard accessibility
- Responsive layouts from mobile through 1920px desktop

## Demo accounts

Manager: `demo@sahanova.local` / `demo1234`

Admin: `admin@sahanova.local` / `admin1234`

The Cloudflare Worker creates these demo users lazily in D1 on first login, with PBKDF2 password hashes. They are public demo credentials, not secrets.

## Local zero-dependency preview

The original Node demo server remains available for fast offline development and QA. It uses `data/db.json` and has no runtime package dependency.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run qa
```

This runs static product checks, domain/session tests and syntax/config validation, including Cloudflare Worker + D1 integration markers.

## Cloudflare deployment

The detailed handoff is in `CLOUDFLARE_DEPLOY.md`. In short:

1. Create a D1 database named `sahanova-db`.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with its UUID.
3. Add a Worker secret named `SESSION_SECRET` with a strong random value of at least 32 characters.
4. Apply D1 migrations.
5. Deploy the Worker.
6. Verify `/api/health`, manager login and admin persistence.

Wrangler commands are already included in `package.json` for local Worker development, migration and deployment.

## Important production files

```text
src/worker.js                 Cloudflare Worker/API
wrangler.jsonc                Worker, Static Assets and D1 bindings
migrations/0001_initial.sql   D1 schema + initial app state
public/                       PWA frontend
public/admin/                 protected admin frontend
.github/workflows/quality.yml GitHub QA
CLOUDFLARE_AI_PROMPT.md       exact handoff prompt for Cloudflare AI
CLOUDFLARE_DEPLOY.md          human deployment checklist
```

## Security notes

- Production sessions are signed with HMAC-SHA256 using `SESSION_SECRET`.
- Passwords use PBKDF2-SHA256 with per-user random salts.
- Cookies are HttpOnly and SameSite=Lax, and Secure on production HTTPS.
- Admin API writes verify the D1-backed session role server-side.
- API responses are no-store and the app includes CSP, frame, content-type, referrer and permissions headers.
- `SESSION_SECRET` must never be committed. `.dev.vars`, `.env`, Wrangler state and logs are gitignored.
- Demo auth is appropriate for this fantasy-demo product; production email verification/password reset can be added later if the app becomes a public account system.

## GitHub

Recommended repository name: `sahanova-fantasy`.

The repo includes a GitHub Actions quality workflow. The connected GitHub account available to this ChatGPT session is `xtenrore`, but repository creation is not exposed by the current GitHub connector, so the repository itself must first exist before I can write to it through the connector.
