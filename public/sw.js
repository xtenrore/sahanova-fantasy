const CACHE='sahanova-v2';
const ASSETS=['/','/index.html','/styles.css','/js/app.js','/js/data.js','/js/domain.js','/js/state.js','/js/i18n.js','/js/icons.js','/admin/','/admin/index.html','/js/admin.js','/assets/logo-mark.svg','/assets/icon-192.png','/assets/icon-512.png','/offline.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;if(new URL(e.request.url).pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('/offline.html'))))});
