import { createHmac, timingSafeEqual } from 'node:crypto';
const fallbackSecret='sahanova-demo-only-session-secret-change-in-production';
function secret(){return process.env.SESSION_SECRET||fallbackSecret}
function b64(v){return Buffer.from(v).toString('base64url')}
function unb64(v){return Buffer.from(v,'base64url').toString('utf8')}
function signature(payload){return createHmac('sha256',secret()).update(payload).digest('base64url')}
export function makeSession(user,maxAgeSeconds=604800){const payload=b64(JSON.stringify({id:user.id,email:user.email,displayName:user.displayName||user.name,role:user.role||'manager',exp:Date.now()+maxAgeSeconds*1000}));return `${payload}.${signature(payload)}`}
export function verifySession(token){if(!token||!token.includes('.'))return null;const [payload,sig]=token.split('.');const expected=signature(payload);try{if(!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;const data=JSON.parse(unb64(payload));if(!data.exp||Date.now()>data.exp)return null;return data}catch{return null}}
export function cookieValue(req,name){const pairs=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).filter(Boolean);for(const pair of pairs){const i=pair.indexOf('=');if(i>0&&pair.slice(0,i)===name)return decodeURIComponent(pair.slice(i+1))}return null}
export function sessionFromRequest(req){return verifySession(cookieValue(req,'sn_session'))}
export function sessionCookie(token,maxAgeSeconds=604800){const secure=process.env.NODE_ENV==='production'?'; Secure':'';return `sn_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax${secure}; Path=/; Max-Age=${maxAgeSeconds}`}
export function clearSessionCookie(){const secure=process.env.NODE_ENV==='production'?'; Secure':'';return `sn_session=; HttpOnly; SameSite=Lax${secure}; Path=/; Max-Age=0`}
