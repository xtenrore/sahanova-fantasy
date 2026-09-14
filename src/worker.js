const encoder = new TextEncoder();
const decoder = new TextDecoder();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
const attempts = new Map();
const DEFAULT_CONFIG = {
  season: '2026/27',
  gameweek: 5,
  maxPerClub: 3,
  initialBudget: 100,
  scoring: {
    appearance: 1, sixtyMinutes: 1, goalGK: 6, goalDEF: 6, goalMID: 5, goalFWD: 4,
    assist: 3, cleanSheetGK: 4, cleanSheetDEF: 4, cleanSheetMID: 1, cleanSheetFWD: 0,
    penaltySaved: 5, penaltyMissed: -2, ownGoal: -2, yellow: -1, red: -3,
    savesEvery3: 1, captainMultiplier: 2
  }
};
const EMPTY_OVERRIDES = { clubs: {}, players: {}, fixtures: {} };
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
function textToBase64Url(value) { return toBase64Url(encoder.encode(value)); }
function base64UrlToText(value) { return decoder.decode(fromBase64Url(value)); }
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function hmac(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}
async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16)), iterations = 150000) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return { salt: toBase64Url(salt), hash: toBase64Url(new Uint8Array(bits)), iterations };
}
async function verifyPassword(password, salt, expectedHash, iterations = 150000) {
  const next = await hashPassword(password, fromBase64Url(salt), iterations);
  return constantTimeEqual(next.hash, expectedHash);
}
function publicUser(row) { return { id: row.id, email: row.email, displayName: row.name, role: row.role }; }
function cookieValue(request, name) {
  const raw = request.headers.get('cookie') || '';
  for (const pair of raw.split(';')) {
    const [key, ...rest] = pair.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
function secureCookie(request) {
  const url = new URL(request.url);
  return url.protocol === 'https:' && url.hostname !== 'localhost' ? '; Secure' : '';
}
function sessionCookie(request, token, maxAge = 604800) {
  return `sn_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax${secureCookie(request)}; Path=/; Max-Age=${maxAge}`;
}
function clearSessionCookie(request) {
  return `sn_session=; HttpOnly; SameSite=Lax${secureCookie(request)}; Path=/; Max-Age=0`;
}
async function makeSession(user, secret, maxAge = 604800) {
  const payload = textToBase64Url(JSON.stringify({ id: user.id, email: user.email, displayName: user.displayName || user.name, role: user.role || 'manager', exp: Date.now() + maxAge * 1000 }));
  return `${payload}.${await hmac(payload, secret)}`;
}
async function verifySession(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = await hmac(payload, secret);
  if (!constantTimeEqual(signature, expected)) return null;
  try {
    const data = JSON.parse(base64UrlToText(payload));
    return data.exp && Date.now() <= data.exp ? data : null;
  } catch { return null; }
}
function json(status, data, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...SECURITY_HEADERS, ...extra } });
}
function withSecurity(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
async function readBody(request) {
  const raw = await request.text();
  if (raw.length > 100_000) throw new Error('too_large');
  return raw ? JSON.parse(raw) : {};
}
function rateAllowed(request, key) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const id = `${ip}:${key}`;
  let record = attempts.get(id) || { count: 0, started: now };
  if (now - record.started > RATE_WINDOW_MS) record = { count: 0, started: now };
  record.count++;
  attempts.set(id, record);
  return record.count <= RATE_MAX;
}
function requireBindings(env) {
  if (!env.DB) throw new Error('missing_db_binding');
  if (!env.SESSION_SECRET || String(env.SESSION_SECRET).length < 32) throw new Error('missing_session_secret');
}
async function ensureDemoUsers(env) {
  const demos = [
    { id: 'demo-user', email: 'demo@sahanova.local', name: 'SahaNova Demo', password: 'demo1234', role: 'manager' },
    { id: 'demo-admin', email: 'admin@sahanova.local', name: 'SahaNova Admin', password: 'admin1234', role: 'admin' }
  ];
  for (const demo of demos) {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(demo.email).first();
    if (existing) continue;
    const password = await hashPassword(demo.password);
    await env.DB.prepare('INSERT INTO users (id,email,name,role,password_salt,password_hash,password_iterations) VALUES (?,?,?,?,?,?,?)')
      .bind(demo.id, demo.email, demo.name, demo.role, password.salt, password.hash, password.iterations).run();
  }
}
async function stateValue(env, key, fallback) {
  const row = await env.DB.prepare('SELECT value_json FROM app_state WHERE key = ?').bind(key).first();
  if (!row?.value_json) return structuredClone(fallback);
  try { return JSON.parse(row.value_json); } catch { return structuredClone(fallback); }
}
async function saveStateValue(env, key, value) {
  await env.DB.prepare(`INSERT INTO app_state(key,value_json,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=CURRENT_TIMESTAMP`)
    .bind(key, JSON.stringify(value)).run();
}
async function sessionUser(request, env) {
  const session = await verifySession(cookieValue(request, 'sn_session'), env.SESSION_SECRET);
  if (!session) return null;
  const row = await env.DB.prepare('SELECT id,email,name,role FROM users WHERE id = ? LIMIT 1').bind(session.id).first();
  return row || null;
}
function normalizeConfig(value) {
  const next = { ...DEFAULT_CONFIG, ...value, scoring: { ...DEFAULT_CONFIG.scoring, ...(value?.scoring || {}) } };
  next.season = String(next.season || '2026/27').slice(0, 20);
  next.gameweek = Math.max(1, Math.min(50, Number(next.gameweek) || 5));
  next.maxPerClub = Math.max(1, Math.min(6, Number(next.maxPerClub) || 3));
  next.initialBudget = Math.max(50, Math.min(200, Number(next.initialBudget) || 100));
  for (const key of Object.keys(DEFAULT_CONFIG.scoring)) next.scoring[key] = Math.max(-20, Math.min(20, Number(next.scoring[key]) || 0));
  return next;
}
function normalizeOverrides(value) {
  const out = { clubs: {}, players: {}, fixtures: {} };
  for (const section of Object.keys(out)) {
    const src = value?.[section];
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    for (const [id, item] of Object.entries(src)) {
      if (!/^[a-z0-9-]{1,64}$/i.test(id) || !item || typeof item !== 'object' || Array.isArray(item)) continue;
      out[section][id] = item;
    }
  }
  return out;
}
async function handleApi(request, env, url) {
  try { requireBindings(env); } catch (error) { return json(503, { error: error.message }); }
  if (!rateAllowed(request, url.pathname)) return json(429, { error: 'rate_limited' });
  if (url.pathname === '/api/health' && request.method === 'GET') {
    try {
      await env.DB.prepare('SELECT 1 AS ok').first();
      return json(200, { ok: true, app: 'SahaNova', platform: 'cloudflare-workers', database: 'd1', time: new Date().toISOString() });
    } catch { return json(503, { ok: false, error: 'database_unavailable' }); }
  }
  if (url.pathname === '/api/public/bootstrap' && request.method === 'GET') {
    const [config, overrides] = await Promise.all([stateValue(env, 'config', DEFAULT_CONFIG), stateValue(env, 'overrides', EMPTY_OVERRIDES)]);
    return json(200, { config: normalizeConfig(config), overrides: normalizeOverrides(overrides) });
  }
  if (url.pathname === '/api/auth/login' && request.method === 'POST') {
    await ensureDemoUsers(env);
    const body = await readBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const row = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1').bind(email).first();
    if (!row || !await verifyPassword(password, row.password_salt, row.password_hash, row.password_iterations)) return json(401, { error: 'invalid_credentials' });
    const user = publicUser(row);
    const token = await makeSession(user, env.SESSION_SECRET);
    return json(200, { user }, { 'set-cookie': sessionCookie(request, token) });
  }
  if (url.pathname === '/api/auth/signup' && request.method === 'POST') {
    const body = await readBody(request);
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim().slice(0, 40);
    const password = String(body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || name.length < 2 || password.length < 6 || password.length > 128) return json(400, { error: 'invalid_input' });
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1').bind(email).first();
    if (existing) return json(409, { error: 'email_exists' });
    const hashed = await hashPassword(password);
    const id = `u_${crypto.randomUUID().replace(/-/g, '')}`;
    await env.DB.prepare('INSERT INTO users (id,email,name,role,password_salt,password_hash,password_iterations) VALUES (?,?,?,?,?,?,?)')
      .bind(id, email, name, 'manager', hashed.salt, hashed.hash, hashed.iterations).run();
    const user = { id, email, displayName: name, role: 'manager' };
    const token = await makeSession(user, env.SESSION_SECRET);
    return json(201, { user }, { 'set-cookie': sessionCookie(request, token) });
  }
  if (url.pathname === '/api/auth/forgot' && request.method === 'POST') return json(200, { ok: true, message: 'Reset request accepted in demo mode.' });
  if (url.pathname === '/api/auth/logout' && request.method === 'POST') return json(200, { ok: true }, { 'set-cookie': clearSessionCookie(request) });
  if (url.pathname === '/api/auth/session' && request.method === 'GET') {
    const user = await sessionUser(request, env);
    return user ? json(200, { user: publicUser(user) }) : json(401, { error: 'no_session' });
  }
  if (url.pathname === '/api/admin/config') {
    const user = await sessionUser(request, env);
    if (!user || user.role !== 'admin') return json(403, { error: 'forbidden' });
    if (request.method === 'GET') return json(200, { config: normalizeConfig(await stateValue(env, 'config', DEFAULT_CONFIG)) });
    if (request.method === 'POST') {
      const config = normalizeConfig(await readBody(request));
      await saveStateValue(env, 'config', config);
      return json(200, { config });
    }
  }
  if (url.pathname === '/api/admin/overrides') {
    const user = await sessionUser(request, env);
    if (!user || user.role !== 'admin') return json(403, { error: 'forbidden' });
    if (request.method === 'GET') return json(200, { overrides: normalizeOverrides(await stateValue(env, 'overrides', EMPTY_OVERRIDES)) });
    if (request.method === 'POST') {
      const overrides = normalizeOverrides(await readBody(request));
      await saveStateValue(env, 'overrides', overrides);
      return json(200, { overrides });
    }
  }
  return json(404, { error: 'not_found' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url);
      return withSecurity(await env.ASSETS.fetch(request));
    } catch (error) {
      console.error('SahaNova Worker error', error);
      return json(500, { error: 'internal_error' });
    }
  }
};

export const __test = { toBase64Url, fromBase64Url, hashPassword, verifyPassword, makeSession, verifySession, normalizeConfig, normalizeOverrides };
