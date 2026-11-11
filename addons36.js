/* ===== Add-on 36 (v20261111a): Trusted devices · last login device · Admin alerts =====
   Admin → "Trusted Devices": every user's devices with last-login time. Tick = trusted (works). Untick = that device is signed
   out of the web app within ~15 seconds and the Admin gets a notification in the 🔔 bell. Needs supabase/phase5.sql (run once). */
(function(){
'use strict';
const XA=window.XA; if(!XA) return;
const g=id=>document.getElementById(id);
const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
const cu=()=>window.curUser&&window.curUser();
const isAdmin=()=>{ const m=cu(); return !!m&&m.role==='admin'; };
const SB=()=>(window.__cloud&&window.__cloud.sb)?window.__cloud.sb():null;
const UID=()=>(window.__cloud&&window.__cloud.uid)?window.__cloud.uid():null;
const st={rows:null,err:'',loading:false,alerts:[]};

/* ---- this device ---- */
function devId(){ try{ let v=localStorage.getItem('xa_dev_id'); if(!v){ v=(crypto.randomUUID?crypto.randomUUID():('d'+Date.now().toString(36)+Math.random().toString(36).slice(2,10))); localStorage.setItem('xa_dev_id',v); } return v; }catch(e){ return 'nostore-'+(navigator.userAgent||'').length; } }
function devName(){ const u=navigator.userAgent||'';
  const b=/Edg\//.test(u)?'Edge':/OPR\//.test(u)?'Opera':/SamsungBrowser/.test(u)?'Samsung Internet':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'Browser';
  const o=/Windows/.test(u)?'Windows PC':/Android/.test(u)?'Android phone':/iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Mac OS/.test(u)?'Mac':/Linux/.test(u)?'Linux PC':'Device';
  let m=''; const mm=u.match(/Android[^;)]*;\s*([^;)]+?)\s*(?:Build|\))/); if(mm&&mm[1]&&!/^(K|Linux)$/i.test(mm[1])) m=' ('+mm[1].trim()+')';
  return o+m+' · '+b+' · '+screen.width+'×'+screen.height; }

/* ---- sign this device out (un-trusted) ---- */
let kicking=false;
async function kick(){ if(kicking) return; kicking=true; const s=SB();
  try{ await s.rpc('device_kicked',{p_device:devId()}); }catch(e){}
  try{ window.__dirty=false; await s.auth.signOut(); }catch(e){}
  try{ sessionStorage.clear(); }catch(e){}
  alert('This device is no longer trusted, so you have been signed out of Managed Print Book.\n\nPlease contact the Admin.');
  location.reload(); }

/* ---- at sign-in: register device; if it is not trusted, stop right here ---- */
const oLog=window.xaLoginLog;
window.xaLoginLog=async function(sb,ME){ try{ if(oLog) await oLog(sb,ME); }catch(e){}
  try{ const r=await sb.rpc('device_register',{p_device:devId(),p_device_name:devName(),p_name:ME&&ME.name,p_email:ME&&ME.email,p_role:ME&&ME.role});
    if(!r.error&&r.data&&r.data.trusted===false){ await kick(); } }catch(e){} };

/* ---- while signed in: check every 15 s and when the tab comes back ---- */
async function check(){ const s=SB(); if(!s||!UID()||kicking) return;
  try{ const r=await s.rpc('device_check',{p_device:devId()}); if(!r.error&&r.data===false) await kick(); }catch(e){} }
setInterval(check,15000); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) check(); }); window.addEventListener('focus',check);

/* ---- Admin: list ---- */
async function load(){ const s=SB(); if(!s||!UID()||st.loading) return; st.loading=true;
  try{ const r=await s.from('trusted_devices').select('id,user_id,name,email,role,device_id,device_name,trusted,last_login,last_seen').order('last_login',{ascending:false}).limit(300);
    if(r.error){ st.rows=null; st.err=r.error.message; } else { st.rows=r.data; st.err=''; } }catch(e){ st.rows=null; st.err=e.message||String(e); }
  st.loading=false; st.loaded=true; if(XA.cur==='devs') XA.refresh(); }
window.devReload=()=>{ st.loaded=false; st.rows=null; load(); };
window.devTrust=async function(id,on){ const s=SB(); if(!s) return; const row=(st.rows||[]).find(x=>String(x.id)===String(id)); const me=row&&row.device_id===devId()&&row.user_id===UID();
  if(!on&&me&&!confirm('This is the device you are using now. Unticking it signs YOU out. Continue?')){ XA.refresh(); return; }
  try{ const r=await s.rpc('device_set_trust',{p_id:id,p_trusted:!!on}); if(r.error) throw r.error; if(row) row.trusted=!!on;
    toast(on?'Device trusted.':'Device blocked — it will be signed out within about 15 seconds. Admin notification saved.'); pollAlerts(); XA.refresh(); if(!on&&me) check(); }
  catch(e){ toast('Could not change: '+(e.message||e),true); XA.refresh(); } };
const fmt=d=>{ try{ return new Date(d).toLocaleString('en-GB'); }catch(e){ return d||''; } };
XA.reg('devs',{title:'Trusted Devices',render(){
  if(!isAdmin()) return '<div class="card pad"><div class="empty">Only the Admin can open this page.</div></div>';
  if(!st.loaded&&!st.loading) setTimeout(load,0);
  let h='<div class="sec" style="margin-top:0"><h2>📱 Trusted Devices &amp; last login</h2><span style="margin-left:auto"><button class="btn ghost" onclick="devReload()">↻ Refresh</button></span></div>';
  h+='<div class="hint" style="margin:0 0 10px">Every device a user signs in from is listed with its last login time. <b>Ticked = trusted</b> (works). <b>Unticked = that device is signed out</b> of the web app within about 15 seconds, cannot sign in again, and you get a notification in the 🔔 bell.</div>';
  if(st.rows===null) return h+'<div class="card pad"><div class="empty">'+(st.loading?'Loading…':'Trusted devices are not set up yet. The Admin runs <b>supabase/phase5.sql</b> once in Supabase → SQL Editor.'+(st.err?'<br><small>'+E(st.err)+'</small>':''))+'</div></div>';
  const first={}; st.rows.forEach(r=>{ if(!first[r.user_id]) first[r.user_id]=r.id; }); const mine=devId();
  h+='<div class="card"><div class="tw"><table><thead><tr><th>User</th><th>Device name</th><th>Last login</th><th>Last active</th><th style="text-align:center">Trusted</th></tr></thead><tbody>'+(st.rows.length?st.rows.map(r=>'<tr'+(r.trusted?'':' style="background:#fff1f1"')+'><td><b>'+E(r.name||'')+'</b><div class="hint" style="margin:0">'+E(r.email||'')+' · '+E(r.role||'')+'</div></td><td>'+E(r.device_name||'Unknown')+(r.device_id===mine&&r.user_id===UID()?' <span class="xa-pill good">this device</span>':'')+(first[r.user_id]===r.id?' <span class="xa-pill warn">last login</span>':'')+'</td><td>'+E(fmt(r.last_login))+'</td><td>'+E(fmt(r.last_seen))+'</td><td style="text-align:center"><input type="checkbox" '+(r.trusted?'checked':'')+' style="width:20px;height:20px;cursor:pointer" onchange="devTrust(\''+r.id+'\',this.checked)"></td></tr>').join(''):'<tr><td colspan="5" class="empty">No devices recorded yet. They appear the next time each user signs in.</td></tr>')+'</tbody></table></div></div>';
  return h; }});

/* ---- Admin notifications in the 🔔 bell ---- */
async function pollAlerts(){ const s=SB(); if(!s||!UID()||!isAdmin()) return;
  try{ const r=await s.from('device_alerts').select('id,at,kind,message').eq('seen',false).order('at',{ascending:false}).limit(30); if(r.error) return; const n=JSON.stringify(r.data); if(n!==JSON.stringify(st.alerts)){ st.alerts=r.data; if(typeof renderBell==='function') renderBell(); } }catch(e){} }
window.devAlertSeen=async function(id){ const s=SB(); if(!s) return; try{ await s.rpc('device_alert_seen',{p_id:id}); }catch(e){} st.alerts=id==null?[]:st.alerts.filter(a=>String(a.id)!==String(id)); renderBell(); const p=g('bellPanel'); if(p) p.classList.add('show'); };
setInterval(pollAlerts,20000); setTimeout(pollAlerts,4000);
const oBell=window.renderBell;
if(typeof oBell==='function'&&!oBell.__x36){ const w=function(){ const r=oBell.apply(this,arguments);
  try{ if(isAdmin()&&st.alerts.length){ const cnt=g('bellCount'), pn=g('bellPanel'); if(cnt&&pn){ cnt.textContent=(parseInt(cnt.textContent)||0)+st.alerts.length; cnt.classList.add('on'); cnt.style.background='#dc2626';
      const ic={new:'🆕',untrusted:'🚫',kicked:'⛔',trusted:'✅'};
      (pn.querySelector('.bp-h')||pn).insertAdjacentHTML(pn.querySelector('.bp-h')?'afterend':'afterbegin','<div class="bsec"><span>📱 Device security</span><span class="badge bad">'+st.alerts.length+'</span></div>'+st.alerts.map(a=>'<div class="bitem '+(a.kind==='trusted'?'warn':'bad')+'"><div><b>'+(ic[a.kind]||'📱')+' '+E(a.message)+'</b><div class="kdept">'+E(fmt(a.at))+'</div></div><div class="actions"><button class="btn sm ghost" onclick="devAlertSeen('+a.id+')">✕ Close</button><button class="btn sm ghost" onclick="closeBell();go(\'xa\',\'devs\')">Devices</button></div></div>').join('')); } } }catch(e){}
  return r; }; w.__x36=1; try{ renderBell=w; }catch(e){} window.renderBell=w; }

/* ---- menu entry (Admin group) ---- */
setInterval(()=>{ try{ if(typeof SD==='undefined') return; const A=SD.find(x=>x.g==='Admin'); if(A&&!A.items.some(i=>i[2]==='devs')){ A.items.push(['Trusted Devices','xa','devs']); try{ sdBuild(); sdSync('xa'); }catch(e){} }
  document.querySelectorAll('#nav .nd a[data-t="xa"]').forEach(a=>{ if(a.dataset.v==='devs'&&!isAdmin()) a.style.display='none'; }); }catch(e){} },1200);
})();
