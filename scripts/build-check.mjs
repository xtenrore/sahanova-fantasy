import { access, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const required=[
 'public/index.html','public/styles.css','public/enhancements.css','public/parity.css','public/js/app.js','public/js/domain.js','public/js/data.js','public/js/insights.js','public/js/enhancements.js','public/js/parity.js','public/js/planner.js','public/js/provider.js','public/js/parity-ui.js','public/js/admin.js',
 'public/manifest.webmanifest','public/sw.js','public/offline.html','public/assets/icon-192.png','public/assets/icon-512.png','public/admin/index.html',
 'server.mjs','src/node-session.js','README.md','.env.example','.gitignore','.github/workflows/quality.yml','RAILWAY_DEPLOY.md','package-lock.json'
];
for(const f of required)await access(f);
JSON.parse(await readFile('public/manifest.webmanifest','utf8'));
const server=await readFile('server.mjs','utf8');
if(!server.includes("process.env.PORT||3000")||!server.includes("/api/health")||!server.includes("/api/admin/overrides"))throw new Error('Railway Node server markers incomplete');
for(const f of ['public/js/app.js','public/js/data.js','public/js/domain.js','public/js/state.js','public/js/i18n.js','public/js/icons.js','public/js/insights.js','public/js/enhancements.js','public/js/parity.js','public/js/planner.js','public/js/provider.js','public/js/parity-ui.js','public/js/admin.js','server.mjs','src/node-session.js']){
 const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0){console.error(r.stderr);process.exit(r.status||1)}
}
console.log(`Build check OK — ${required.length} required artifacts, Nova IQ + Parity modules, and Railway Node server JavaScript syntax validated.`);
