const V='shell-v3';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
/* Network-first for the app shell only (never serve a stale copy while online); customer data lives in Supabase and is never cached here. */
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;
  e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{ if(r.mode==='navigate'){ const c=res.clone(); caches.open(V).then(k=>k.put('/',c)); } return res; }).catch(()=>caches.match(r.mode==='navigate'?'/':r))); });
