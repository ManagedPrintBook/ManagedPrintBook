self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
/* Network-first for the app shell only; customer data lives in Supabase and is never cached here. */
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET'||new URL(r.url).origin!==location.origin) return;
  e.respondWith(fetch(r).then(res=>{ if(r.mode==='navigate'){ const c=res.clone(); caches.open('shell-v1').then(k=>k.put('/',c)); } return res; }).catch(()=>caches.match(r.mode==='navigate'?'/':r))); });
