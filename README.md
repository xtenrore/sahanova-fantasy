# SahaNova Fantasy Football

SahaNova is an original, independent Turkish-first fantasy-football PWA inspired by modern mobile sports experiences. It is **not affiliated with TFF** and does not copy TFF logos, artwork or proprietary UI. Bundled clubs, players, fixtures, scores and rankings are demo data.

## Production target: Railway

This repository is deployed on **Railway** from `xtenrore/sahanova-fantasy` → `main`.

- Node.js HTTP server: `server.mjs`
- Static PWA: `public/`
- Persistent app data: Railway volume mounted at `/data`
- Signed HttpOnly sessions: `SESSION_SECRET`
- Health check: `/api/health`
- GitHub Actions: `npm run qa` on pushes and pull requests

The Railway service start command replaces the bundled `data/` directory with a symlink to `/data`, so accounts, admin configuration and overrides persist across deployments.

## Product features

### Core fantasy game
- Fullscreen-first immersive entry with iOS fallback
- Turkish default and English language support
- Seven-step onboarding
- 15-player squad: 2 GK / 5 DEF / 5 MID / 3 FWD
- 100M starting budget and maximum three players per club
- Standard formations plus the `2-5-3` attacking formation when the Attack+ manager card is active
- Captain, vice-captain, ordered bench and automatic-substitution rules
- Unlimited gameweek transfers subject to squad rules and budget, with manager-card exceptions
- Save-squad gameweek bonus and deadline locking
- Player sheets, form/price charts, status and fixture difficulty
- Match Center, fixtures and richer matchday pulse UI

### Parity+ competition systems
- **Nostradamus** match predictions for all nine gameweek fixtures, including completion and correct-result scoring
- **Five manager cards:** 3x Captain, 4x Captain, Bench Boost, Attack+, Unlimited Budget
- Classic private leagues and head-to-head league schedule views
- Three automatic-league categories in the SahaNova demo experience
- Three knockout cup experiences
- Rewards / mini-league hub (free demo competition; no real-money prize promise)
- Weekly-points history with average, high score, gameweek rank and Nostradamus contribution
- Status / deadline center showing gameweek lock, squad save, predictions and active card
- Discover / Scout feed with form, status and game-guide signals

### Better-than-parity SahaNova features
- **Nova IQ Manager HQ** with projected XI points, squad health, captain edge and fixture edge
- Smart positive-gain transfer targets
- Three-gameweek transfer and captain planner
- Local data-provider abstraction with server health/bootstrap fallback
- Original responsive SahaNova visual layer; no paid third-party UI framework
- PWA offline cache, install manifest and safe-area support
- Dark/light/system themes, sound, reduced motion and keyboard accessibility
- Protected admin configuration/data override surface

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

The v1.3 suite validates responsive/PWA/fullscreen behavior, Nova IQ, official-rule parity logic, manager cards, Nostradamus, auto substitutions, H2H/cups, multiweek planning, session security and Railway Node-server integration.

## Railway production configuration

See `RAILWAY_DEPLOY.md` for the exact service configuration. Required production variables:

- `NODE_ENV=production`
- `SESSION_SECRET=<strong random secret>`

Optional:

- `DATA_PATH=/data/db.json` (the existing production start command already symlinks `data/` to `/data`)

Never commit the real `SESSION_SECRET`.

## Security notes

- Production sessions use HMAC-SHA256 with `SESSION_SECRET`.
- Passwords use Node.js `scrypt` with per-user random salts.
- Session cookies are HttpOnly, SameSite=Lax and Secure in production.
- Admin API routes check the signed session role server-side.
- API responses use no-store and the app sends CSP, frame, content-type, referrer and permissions headers.
- The special-card and prediction systems in this repository are free demo game mechanics; they do not implement gambling or cash payouts.
