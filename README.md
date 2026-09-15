# SahaNova Fantasy Football

SahaNova is an original, independent Turkish-first fantasy-football PWA inspired by modern mobile sports experiences. It is **not affiliated with TFF**. Bundled clubs, players, fixtures, scores and rankings are demo data.

## Production target: Railway

This repository is deployed on **Railway** from `xtenrore/sahanova-fantasy` → `main`.

- Node.js HTTP server: `server.mjs`
- Static PWA: `public/`
- Persistent app data: Railway volume mounted at `/data`
- Signed HttpOnly sessions: `SESSION_SECRET`
- Health check: `/api/health`
- GitHub Actions: `npm run qa` on pushes and pull requests

The Railway service start command replaces the bundled `data/` directory with a symlink to `/data`, so accounts, admin configuration and overrides persist across deployments.

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
- Responsive layouts from mobile through desktop

## Demo accounts

Manager: `demo@sahanova.local` / `demo1234`

Admin: `admin@sahanova.local` / `admin1234`

These are public demo credentials. Passwords are stored as scrypt hashes in the persistent JSON store; the production session signing key is supplied through Railway and is not committed.

## Local development

```bash
npm run dev
```

Open `http://localhost:3000`.

Local development uses `data/db.json`. Railway production uses its persistent volume.

## Quality checks

```bash
npm run qa
```

This runs static product checks, domain/session tests, syntax validation and Railway Node-server integration checks.

## Railway production configuration

See `RAILWAY_DEPLOY.md` for the exact service configuration. Required production variables:

- `NODE_ENV=production`
- `SESSION_SECRET=<strong random secret>`

Never commit the real `SESSION_SECRET`.

## Security notes

- Production sessions use HMAC-SHA256 with `SESSION_SECRET`.
- Passwords use Node.js `scrypt` with per-user random salts.
- Session cookies are HttpOnly, SameSite=Lax and Secure in production.
- Admin API routes check the signed session role server-side.
- API responses use no-store and the app sends CSP, frame, content-type, referrer and permissions headers.
