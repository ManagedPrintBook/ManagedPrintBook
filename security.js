/* ===== Secure key v2: admin sets it ONCE (server-side, hashed); everyone else only enters it. Needs addons.js ===== */
(function(){
'use strict';
const XA=window.XA; if(!XA) return;
const SB_URL='https://zaogpwfobqvayeejfvxc.supabase.co', SB_KEY='sb_publishable_NWe7FFqt7_C0qOOZoqvsFQ_tH9qBCty';
const g=id=>document.getElementById(id);
const IDLE_MS=60*1000, AWAY_MS=2*60*1000;
const legacyInit=window.lockInit;
let mode='unknown', locked=false, idleT=null, awayAt=0, lastAct=Date.now(), busy=false;
const me=()=>window.curUser&&window.curUser();
function token(){ try{ for(const k of Object.keys(sessionStorage)){ if(/^sb-.*-auth-token$/.test(k)){ const j=JSON.parse(sessionStorage.getItem(k)); return (j&&(j.access_token||(j.currentSession&&j.currentSession.access_token)))||''; } } }catch(e){} return ''; }
async function rpc(name,args){ const t=token(); if(!t) throw new Error('Not signed in'); const r=await fetch(SB_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:SB_KEY,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(args||{})}); const j=await r.json().catch(()=>null); if(!r.ok) throw new Error((j&&j.message)||('HTTP '+r.status)); return j; }

/* ---- lock screen ---- */
function box(){ let b=g('xaLock'); if(b) return b; b=document.createElement('div'); b.id='xaLock'; b.style.cssText='position:fixed;inset:0;z-index:100000;background:#14213d;display:none;align-items:center;justify-content:center;padding:16px';
  b.innerHTML='<div style="background:#fff;border-radius:16px;padding:26px;width:100%;max-width:360px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.4)"><img id="xaLkLogo" style="height:46px;margin-bottom:8px;display:none"><div style="font-weight:700;font-size:1.1rem;color:#14213d">🔒 App locked</div><div style="color:#5b6478;font-size:.85rem;margin:6px 0 14px">Enter the secure key to continue.</div><input id="xaLkKey" type="password" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="Secure key" style="width:100%;padding:12px;border:1px solid #d5d9e2;border-radius:9px;font-size:1.2rem;text-align:center;letter-spacing:.3em"><div id="xaLkMsg" style="min-height:20px;color:#dc2626;font-size:.82rem;margin:8px 0"></div><button id="xaLkGo" style="width:100%;padding:11px;background:#f2a541;color:#14213d;border:0;border-radius:9px;font-weight:700;cursor:pointer">Unlock</button><div style="margin-top:12px"><a href="#" id="xaLkOut" style="color:#5b6478;font-size:.82rem">Sign out instead</a></div></div>'; document.body.appendChild(b);
  g('xaLkGo').onclick=tryUnlock; g('xaLkKey').addEventListener('keydown',e=>{ if(e.key==='Enter') tryUnlock(); }); g('xaLkOut').onclick=e=>{ e.preventDefault(); try{ sessionStorage.removeItem('plc_locked'); }catch(x){} locked=false; b.style.display='none'; if(window.cloudOut) cloudOut(); else location.reload(); }; return b; }
function lock(){ if(locked||mode!=='on'||!me()) return; locked=true; try{ sessionStorage.setItem('plc_locked','1'); }catch(e){} const b=box(); try{ const lg=document.querySelector('.logo-box img'); if(lg&&lg.src){ g('xaLkLogo').src=lg.src; g('xaLkLogo').style.display='inline-block'; } }catch(e){} g('xaLkKey').value=''; g('xaLkMsg').textContent=''; b.style.display='flex'; setTimeout(()=>g('xaLkKey').focus(),60); }
async function tryUnlock(){ if(busy) return; const v=g('xaLkKey').value.replace(/\D/g,''); if(v.length<6){ g('xaLkMsg').textContent='Enter your 6–8 digit key.'; return; } busy=true; g('xaLkMsg').textContent='Checking…';
  try{ const r=await rpc('secure_key_verify',{p_key:v}); if(r&&r.ok){ locked=false; try{ sessionStorage.removeItem('plc_locked'); }catch(e){} g('xaLock').style.display='none'; lastAct=Date.now(); g('xaLkMsg').textContent=''; } else { g('xaLkKey').value=''; g('xaLkMsg').textContent=r&&r.wait>0?'Too many wrong tries. Wait '+Math.ceil(r.wait/60)+' minute(s).':'Wrong key.'+(r&&r.left!=null?' '+r.left+' tries left.':''); } }
  catch(e){ g('xaLkMsg').textContent='Could not check the key: '+e.message; } busy=false; }
window.lockNow=lock;

/* ---- triggers: idle, switching tab/window, reload ---- */
['mousemove','mousedown','keydown','touchstart','scroll','click'].forEach(e=>document.addEventListener(e,()=>{ if(!locked) lastAct=Date.now(); },{passive:true}));
setInterval(()=>{ if(document.hidden) return; if(mode==='on'&&!locked&&me()&&Date.now()-lastAct>=IDLE_MS) lock(); },5000);
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ awayAt=Date.now(); return; } if(mode==='on'&&!locked&&me()&&awayAt&&Date.now()-awayAt>=AWAY_MS) lock(); else if(!locked) lastAct=Date.now(); awayAt=0; });
window.addEventListener('pagehide',()=>{ try{ if(mode==='on'&&me()) sessionStorage.setItem('plc_locked','1'); }catch(e){} });
const ca=window.cloudAuth; if(typeof ca==='function') window.cloudAuth=function(){ try{ sessionStorage.removeItem('plc_locked'); }catch(e){} return ca.apply(this,arguments); };

/* ---- set / change key (admin only) ---- */
function askKey(title,withOld,done){ XA.fm(title,(withOld?[{k:'old',label:'Current secure key',type:'password'}]:[]).concat([{k:'a',label:'New secure key (6–8 digits)',type:'password'},{k:'b',label:'Type it again',type:'password'}]),o=>{ const a=(o.a||'').replace(/\D/g,''), b=(o.b||'').replace(/\D/g,''); if(!/^\d{6,8}$/.test(a)){ toast('Use 6 to 8 digits.',true); return false; } if(a!==b){ toast('The two keys do not match.',true); return false; }
  rpc('secure_key_set',{p_new:a,p_old:withOld?(o.old||'').replace(/\D/g,''):null}).then(r=>{ if(r&&r.ok){ toast('Secure key saved.'); mode='on'; cleanLegacy(); done&&done(true); } else { toast((r&&r.error)||'Could not save the key.',true); done&&done(false); } }).catch(e=>{ toast(e.message,true); done&&done(false); }); },{ok:'Save key',noFocus:false,note:'Share this key only with your team. Only the admin can set or change it. Staff will only ever be asked to enter it.'}); }
function cleanLegacy(){ try{ if(DB.company&&(DB.company.lockv2||DB.company.lock)){ delete DB.company.lockv2; delete DB.company.lock; save(); } }catch(e){} }

/* ---- startup ---- */
window.lockInit=async function(){ clearTimeout(idleT); let st; try{ st=await rpc('secure_key_status'); }catch(e){ mode='legacy'; if(legacyInit) legacyInit(); const u=me(); if(u&&u.role==='admin') toast('Admin: run supabase/security.sql in Supabase to turn on the new secure key.',true); return; }
  if(st&&st.set){ mode='on'; cleanLegacy(); let was=false; try{ was=!!sessionStorage.getItem('plc_locked'); }catch(e){} lastAct=Date.now(); if(was) lock(); return; }
  mode='off'; const u=me(); if(u&&u.role==='admin') askKey('Set the secure key (one time)',false); else toast('The admin has not set the secure key yet. Ask the admin to sign in once.',true); };
window.lockChange=function(){ askKey('Change secure key',true); };
window.admSecurity=function(isA){ const el=g('admSec'); if(!el) return; if(!isA){ el.innerHTML=''; return; }
  el.innerHTML='<div class="card pad"><div class="sec" style="margin:0 0 10px"><h2>🔒 Security — secure key</h2><span style="margin-left:auto" class="badge '+(mode==='on'?'good':'warn')+'">'+(mode==='on'?'ON':'NOT SET UP')+'</span></div><div class="hint" style="margin:0 0 12px">One company-wide key, set only by the admin and checked on the server. The app asks for it after 1 minute idle, when you come back from another tab or window after more than 2 minutes away, and after a page reload. Closing the browser tab signs you out completely (email + password needed).</div>'+(mode==='on'?'<button class="btn" onclick="lockChange()">Change secure key</button> <button class="btn ghost" onclick="lockNow()">Lock now</button>':'<div class="hint">Run <code>supabase/security.sql</code> in the Supabase SQL Editor, then sign in again to set the key.</div>')+'</div>'; };
})();
