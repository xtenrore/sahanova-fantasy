import http from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { makeSession, sessionFromRequest, sessionCookie, clearSessionCookie } from './src/node-session.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const PUBLIC=path.join(__dirname,'public');
const DATA=process.env.DATA_PATH||path.join(__dirname,'data','db.json');
const PORT=Number(process.env.PORT||3000);
const attempts=new Map();

const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const securityHeaders={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'"};
const hashPassword=(password,salt=randomBytes(16).toString('hex'))=>({salt,hash:scryptSync(password,salt,64).toString('hex')});
function safeEqual(a,b){try{return timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))}catch{return false}}
async function ensureDb(){if(existsSync(DATA)){try{const current=JSON.parse(await readFile(DATA,'utf8'));if(Array.isArray(current.users)&&current.users.length>0)return}catch{}}await mkdir(path.dirname(DATA),{recursive:true});const d={users:[],adminConfig:{season:'2026/27',gameweek:5,maxPerClub:3,initialBudget:100,scoring:{appearance:1,sixtyMinutes:1,goalGK:10,goalDEF:6,goalMID:5,goalFWD:4,assist:3,cleanSheetGK:4,cleanSheetDEF:4,cleanSheetMID:1,cleanSheetFWD:0,penaltySaved:5,penaltyMissed:-2,ownGoal:-2,yellow:-1,red:-3,savesEvery3:1,captainMultiplier:2}}};for(const u of [{id:'demo-user',email:'demo@sahanova.local',name:'SahaNova Demo',password:'demo1234',role:'manager'},{id:'demo-admin',email:'admin@sahanova.local',name:'SahaNova Admin',password:'admin1234',role:'admin'}]){const p=hashPassword(u.password);d.users.push({id:u.id,email:u.email,name:u.name,role:u.role,...p})}await writeFile(DATA,JSON.stringify(d,null,2));}
async function getDb(){await ensureDb();const db=JSON.parse(await readFile(DATA,'utf8'));db.adminOverrides=db.adminOverrides||{clubs:{},players:{},fixtures:{}};return db}
async function putDb(db){await writeFile(DATA,JSON.stringify(db,null,2))}
function sessionUser(req,db){const session=sessionFromRequest(req);if(!session)return null;return db.users.find(u=>u.id===session.id)||null}
function publicUser(u){return {id:u.id,email:u.email,displayName:u.name,role:u.role}}
function json(res,status,data,headers={}){res.writeHead(status,{...securityHeaders,'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});res.end(JSON.stringify(data))}
async function body(req){let raw='';for await(const c of req){raw+=c;if(raw.length>100000)throw new Error('too_large')}return raw?JSON.parse(raw):{}}
function allowed(ip,key){const k=`${ip}:${key}`,now=Date.now(),rec=attempts.get(k)||{n:0,t:now};if(now-rec.t>60000){rec.n=0;rec.t=now}rec.n++;attempts.set(k,rec);return rec.n<=20}
async function handleApi(req,res,url){
 const db=await getDb(); const ip=req.socket.remoteAddress||'local';
 if(!allowed(ip,url.pathname))return json(res,429,{error:'rate_limited'});
 if(url.pathname==='/api/health')return json(res,200,{ok:true,app:'SahaNova',mode:'demo',time:new Date().toISOString()});
 if(url.pathname==='/api/public/bootstrap'&&req.method==='GET')return json(res,200,{config:db.adminConfig,overrides:db.adminOverrides||{clubs:{},players:{},fixtures:{}}});
 if(url.pathname==='/api/auth/login'&&req.method==='POST'){const b=await body(req);const email=String(b.email||'').trim().toLowerCase();const pass=String(b.password||'');const u=db.users.find(x=>x.email===email);if(!u)return json(res,401,{error:'invalid_credentials'});const test=scryptSync(pass,u.salt,64).toString('hex');if(!safeEqual(test,u.hash))return json(res,401,{error:'invalid_credentials'});const token=makeSession(publicUser(u));return json(res,200,{user:publicUser(u)},{'set-cookie':sessionCookie(token)});}
 if(url.pathname==='/api/auth/signup'&&req.method==='POST'){const b=await body(req);const email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim().slice(0,40),pass=String(b.password||'');if(!/^\S+@\S+\.\S+$/.test(email)||pass.length<6||name.length<2)return json(res,400,{error:'invalid_input'});if(db.users.some(u=>u.email===email))return json(res,409,{error:'email_exists'});const p=hashPassword(pass),u={id:'u_'+randomBytes(8).toString('hex'),email,name,role:'manager',...p};db.users.push(u);await putDb(db);const token=makeSession(publicUser(u));return json(res,201,{user:publicUser(u)},{'set-cookie':sessionCookie(token)});}
 if(url.pathname==='/api/auth/forgot'&&req.method==='POST')return json(res,200,{ok:true,message:'Demo mode: reset request accepted.'});
 if(url.pathname==='/api/auth/logout'&&req.method==='POST')return json(res,200,{ok:true},{'set-cookie':clearSessionCookie()});
 if(url.pathname==='/api/auth/session'&&req.method==='GET'){const u=sessionUser(req,db);return u?json(res,200,{user:publicUser(u)}):json(res,401,{error:'no_session'});}
 if(url.pathname==='/api/admin/config'){
  const u=sessionUser(req,db);if(!u||u.role!=='admin')return json(res,403,{error:'forbidden'});
  if(req.method==='GET')return json(res,200,{config:db.adminConfig});
  if(req.method==='POST'){const b=await body(req);const next={...db.adminConfig,...b};next.gameweek=Math.max(1,Math.min(50,Number(next.gameweek)||5));next.maxPerClub=Math.max(1,Math.min(6,Number(next.maxPerClub)||3));next.initialBudget=Math.max(50,Math.min(200,Number(next.initialBudget)||100));db.adminConfig=next;await putDb(db);return json(res,200,{config:next});}
 }
 if(url.pathname==='/api/admin/overrides'){
  const u=sessionUser(req,db);if(!u||u.role!=='admin')return json(res,403,{error:'forbidden'});
  if(req.method==='GET')return json(res,200,{overrides:db.adminOverrides||{clubs:{},players:{},fixtures:{}}});
  if(req.method==='POST'){const b=await body(req);db.adminOverrides={clubs:{},players:{},fixtures:{},...b};await putDb(db);return json(res,200,{overrides:db.adminOverrides});}
 }
 return json(res,404,{error:'not_found'});
}
async function serve(req,res,url){let rel=decodeURIComponent(url.pathname);if(rel==='/')rel='/index.html';if(rel==='/admin'||rel==='/admin/')rel='/admin/index.html';let file=path.resolve(PUBLIC,'.'+rel);if(!file.startsWith(PUBLIC))return json(res,403,{error:'forbidden'});try{let st=await stat(file);if(st.isDirectory())file=path.join(file,'index.html');st=await stat(file);res.writeHead(200,{...securityHeaders,'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':path.extname(file)==='.html'?'no-cache':'public, max-age=3600'});createReadStream(file).pipe(res)}catch{try{const fallback=path.join(PUBLIC,'index.html');res.writeHead(200,{...securityHeaders,'content-type':'text/html; charset=utf-8','cache-control':'no-cache'});createReadStream(fallback).pipe(res)}catch{res.writeHead(404);res.end('Not found')}}}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);if(url.pathname.startsWith('/api/'))return await handleApi(req,res,url);return await serve(req,res,url)}catch(e){console.error(e);json(res,500,{error:'internal_error'})}});
server.listen(PORT,()=>console.log(`SahaNova running on http://localhost:${PORT}`));
