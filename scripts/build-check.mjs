import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const required=[
 'public/index.html','public/styles.css','public/js/app.js','public/js/domain.js','public/js/data.js','public/js/admin.js',
 'public/manifest.webmanifest','public/sw.js','public/offline.html','public/assets/icon-192.png','public/assets/icon-512.png','public/admin/index.html',
 'server.mjs','src/node-session.js','src/worker.js','wrangler.jsonc','migrations/0001_initial.sql','README.md','.env.example','.dev.vars.example','.gitignore',
 '.github/workflows/quality.yml','CLOUDFLARE_DEPLOY.md','CLOUDFLARE_AI_PROMPT.md'
];
for(const f of required)await access(f);
JSON.parse(await readFile('public/manifest.webmanifest','utf8'));
const wrangler=await readFile('wrangler.jsonc','utf8');
if(!wrangler.includes('sahanova-db')||!wrangler.includes('src/worker.js')||!wrangler.includes('single-page-application'))throw new Error('Cloudflare Wrangler config incomplete');
const migration=await readFile('migrations/0001_initial.sql','utf8');
if(!migration.includes('CREATE TABLE IF NOT EXISTS users')||!migration.includes('CREATE TABLE IF NOT EXISTS app_state'))throw new Error('D1 migration incomplete');
for(const f of ['public/js/app.js','public/js/data.js','public/js/domain.js','public/js/state.js','public/js/i18n.js','public/js/icons.js','public/js/admin.js','server.mjs','src/node-session.js','src/worker.js']){
 const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0){console.error(r.stderr);process.exit(r.status||1)}
}
console.log(`Build check OK — ${required.length} required artifacts, Cloudflare config/D1 migration, and JavaScript syntax validated.`);
