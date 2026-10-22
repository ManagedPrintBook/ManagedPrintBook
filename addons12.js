/* ===== Add-on 12: safer backups (encrypted + weekly cloud snapshots), duplicate Sr.# check, item-type fixer, view-only role ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const XA=window.XA;
function ov(id,html){ let o=g(id); if(!o){ o=document.createElement('div'); o.className='overlay'; o.id=id; document.body.appendChild(o); } o.innerHTML=html; openModal(id); }

/* ---------------- 1. BACKUPS: always encrypted, prominent weekly reminder, rolling cloud snapshots ---------------- */
window.bkCheck=function(){ const el=g('backupBar'); if(!el||!DB.backup) return; const d=bkDays(), due=d===null||d>=(DB.backup.days||7);
  if(!due||bkDismissed||!DB.customers.length){ el.style.display='none'; return; }
  el.style.display=''; el.innerHTML='💾 <b>'+(d===null?'No backup has been made yet':'Last backup was '+d+' day(s) ago')+'</b> — protect your invoices, payments and bank details. Backups are password-encrypted. <button class="btn sm" onclick="backupJSON()">Back up now</button> <button class="btn sm ghost" onclick="bkDismissed=true;bkCheck()">Later</button>'; };
const bk1=window.backupJSON; window.backupJSON=function(){ return bk1.call(this,false); };   /* never a silent, unencrypted download */
const bi0=window.bkInfo;
window.bkInfo=function(){ if(bi0) bi0.apply(this,arguments); const on=g('bk_on'); if(on){ const l=on.closest('label'); if(l&&l.lastChild) l.lastChild.textContent=' Show a reminder bar when a backup is due (every backup is password-encrypted)'; }
  const inf=g('bk_info'); if(inf){ inf.textContent=inf.textContent.replace(/ Automatic download happens.*$/,''); if(!g('bkSnap')){ inf.insertAdjacentHTML('afterend','<div id="bkSnap" style="margin-top:10px"></div>'); } snapUI(); } };

let snapOff=false, snapErr='';
async function snapshot(force){ const C=window.__cloud, me=window.curUser&&curUser(); if(!C||!C.ready()||!me||me.role==='viewer'||(snapOff&&!force)) return false;
  const last=DB.backup&&DB.backup.snapAt; if(!force&&last&&daysBetween(last.slice(0,10),todayISO())<7) return false;
  const sb=C.sb(); const r=await sb.from('app_snapshots').insert({owner:C.uid(),data:DB,note:force?'manual':'weekly'}).select('id,taken_at').single();
  if(r.error){ snapErr=r.error.message||String(r.error); snapOff=true; return false; }
  snapOff=false; DB.backup=DB.backup||{}; DB.backup.snapAt=r.data.taken_at; save();
  const l=await sb.from('app_snapshots').select('id').eq('owner',C.uid()).order('taken_at',{ascending:false}); if(!l.error&&l.data.length>8) await sb.from('app_snapshots').delete().in('id',l.data.slice(8).map(x=>x.id));
  return true; }
setInterval(()=>{ snapshot(false).then(ok=>{ if(ok) snapUI(); }).catch(()=>{}); },60000);
async function snapUI(){ const box=g('bkSnap'); if(!box) return; const C=window.__cloud;
  if(!C||!C.ready()){ box.innerHTML='<div class="hint">Cloud snapshots appear here once you are signed in.</div>'; return; }
  const l=await C.sb().from('app_snapshots').select('id,taken_at,note').eq('owner',C.uid()).order('taken_at',{ascending:false});
  if(l.error){ box.innerHTML='<div class="hint" style="border-left:3px solid #d97706;padding-left:8px"><b>Weekly cloud snapshots are not switched on yet.</b> Ask the Admin to run <code>supabase/phase2.sql</code> once in Supabase → SQL Editor. ('+esc(l.error.message)+')</div>'; snapOff=true; return; }
  box.innerHTML='<h4 style="margin:6px 0">Cloud snapshots <small style="font-weight:400;color:#6b7893">— automatic every 7 days, last 8 kept</small></h4><button class="btn sm ghost" onclick="XA.snapNow()">☁ Snapshot now</button>'
   +(l.data.length?'<div class="tw" style="margin-top:6px"><table><thead><tr><th>Taken</th><th>Type</th><th></th></tr></thead><tbody>'+l.data.map(s=>'<tr><td>'+esc(new Date(s.taken_at).toLocaleString('en-GB'))+'</td><td>'+esc(s.note||'')+'</td><td><button class="btn sm ghost" onclick="XA.snapRestore(\''+s.id+'\')">Restore</button></td></tr>').join('')+'</tbody></table></div>':'<div class="hint">No snapshot yet — the first one is taken automatically.</div>'); }
XA.snapNow=async function(){ const ok=await snapshot(true); toast(ok?'Cloud snapshot saved.':'Snapshot failed: '+(snapErr||'not signed in'),!ok); snapUI(); };
XA.snapRestore=function(id){ askConfirm('Restore this snapshot? Your current data is replaced (a safety snapshot of it is taken first).',async()=>{ try{ await snapshot(true); const r=await window.__cloud.sb().from('app_snapshots').select('data').eq('id',id).single(); if(r.error) throw r.error; DB=r.data.data; normalizeData(); save(); renderAll(); toast('Snapshot restored.'); }catch(e){ toast('Restore failed: '+(e.message||e),true); } },'Yes, restore'); };

/* ---------------- 2. DUPLICATE Sr.# CHECK (whole list) ---------------- */
function findDups(){ const by={}; DB.customers.forEach(c=>c.machines.forEach(m=>{ if(m.status!=='Active') return; const k=normSr(m.serial); if(k.length<3) return; (by[k]=by[k]||[]).push({c,m}); }));
  return Object.keys(by).filter(k=>by[k].length>1).map(k=>({k,list:by[k],cross:new Set(by[k].map(x=>x.c.id)).size>1})); }
XA.findDups=findDups;
XA.reg('dups',{title:'Duplicate Sr.# Check',render(){ const D=findDups();
  const kl=(c,m)=>{ try{ const k=kOf(c,m); return k.ref||k.type||''; }catch(e){ return ''; } };
  if(!D.length) return '<div class="card pad"><div class="empty">✔ No Sr.# is Active in more than one place.</div></div>';
  return '<div class="card"><div class="pad"><div class="hint">A machine should be Active in only one place. <b>'+D.length+'</b> Sr.# are Active more than once, so they could be billed twice.</div></div><div class="tw"><table><thead><tr><th>Sr.#</th><th>Model</th><th>Active under</th><th>Problem</th><th></th></tr></thead><tbody>'
   +D.map(d=>'<tr><td><b>'+esc(d.list[0].m.serial)+'</b></td><td>'+esc(d.list[0].m.model)+'</td><td>'+d.list.map(x=>esc(x.c.name)+' · '+esc(x.m.department||'—')+' · '+esc(kl(x.c,x.m))).join('<br>')+'</td><td>'+(d.cross?'<span class="badge bad">Two companies</span>':'<span class="badge warn">Same company</span>')+'</td><td>'+(d.cross?'<button class="btn sm" onclick="XT.resolve(\''+d.k+'\')">Resolve as transfer</button>':'<button class="btn sm" onclick="XA.dupKeep(\''+d.k+'\')">Keep one…</button>')+'</td></tr>').join('')+'</tbody></table></div></div>'; }});
XA.dupKeep=function(k){ const L=findDups().find(d=>d.k===k); if(!L) return;
  ov('xaDupKeep','<div class="modal w"><h3>Keep one record</h3><div class="hint">Choose the record that stays Active. The others are set to <b>Removed</b> from the date below (their history is kept).</div>'
   +L.list.map((x,i)=>'<label class="tk" style="display:block;margin:6px 0"><input type="radio" name="dk_keep" value="'+i+'" '+(i===L.list.length-1?'checked':'')+'> '+esc(x.c.name)+' · '+esc(x.m.department||'—')+' · '+(x.m.readings||[]).length+' reading(s)</label>').join('')
   +'<div class="field"><label>Date</label><input id="dk_date" type="date" value="'+todayISO()+'"></div><div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'xaDupKeep\')">Cancel</button><button class="btn" onclick="XA.dupKeepGo(\''+k+'\')">Apply</button></div></div>'); };
XA.dupKeepGo=function(k){ const L=findDups().find(d=>d.k===k); if(!L) return; const keep=+document.querySelector('input[name=dk_keep]:checked').value, date=g('dk_date').value||todayISO();
  L.list.forEach((x,i)=>{ if(i===keep) return; x.m.status='Removed'; x.m.endDate=date; x.m.events=x.m.events||[]; x.m.events.push({id:uid(),date,type:'Move',note:'Duplicate record removed (Sr.# check)',qty:0}); });
  save(); closeModal('xaDupKeep'); renderAll(); if(XA.refresh) XA.refresh(); toast('Duplicates cleaned.'); };
let menuDone=false, warned=false;
setInterval(()=>{ try{ if(!menuDone&&typeof SD!=='undefined'){ const G=SD.find(x=>x.g==='Contracts'); if(G){ if(!G.items.some(i=>i[2]==='dups')) G.items.push(['Duplicate Sr.# Check','xa','dups']); menuDone=true; sdBuild(); try{ sdSync('contracts'); }catch(e){} } }
  if(!warned&&window.__cloud&&window.__cloud.ready()&&DB&&DB.customers&&DB.customers.length){ warned=true; const n=findDups().length; if(n) setTimeout(()=>toast('⚠ '+n+' Sr.# are Active in more than one place — see Contracts → Duplicate Sr.# Check.',true),2500); } }catch(e){} },1500);

/* ---------------- 3. STOCK: fix item types (Goods / Service) in bulk ---------------- */
const SVC=/(maintenance|service contract|\bamc\b|\bfsma\b|installation|service charge|labou?r|support|warranty)/i;
XA.itemTypes=function(){ const S=DB.stock.map((s,i)=>({s,i})).filter(x=>x.s.item);
  const sug=x=>x.s.type!=='Service'&&SVC.test(x.s.item); S.sort((a,b)=>(sug(b)-sug(a))||a.s.item.localeCompare(b.s.item));
  const n=S.filter(sug).length;
  ov('xaTypes','<div class="modal w" style="max-width:860px"><h3>Fix item types (Goods / Service)</h3><div class="hint">Service items (e.g. Annual Maintenance/Service Contract) are never stock-checked or reduced. <b>'+n+'</b> item(s) look like services but are not marked Service — they are shown first and pre-set to Service. Change anything, then Apply.</div>'
   +'<input class="xa-in" style="margin:6px 0;max-width:280px" placeholder="Search items…" oninput="XA.itFilter(this.value)">'
   +'<div class="tw" style="max-height:52vh;overflow:auto"><table><thead><tr><th>Item</th><th>SKU</th><th>Type</th></tr></thead><tbody>'+S.map(x=>'<tr class="it-r" data-q="'+esc((x.s.item+' '+(x.s.sku||'')).toLowerCase())+'"><td'+(sug(x)?' style="background:#fffbeb"':'')+'>'+esc(x.s.item)+'</td><td>'+esc(x.s.sku||'')+'</td><td><select class="it-t" data-i="'+x.i+'"><option'+((sug(x)||x.s.type==='Service')?'':' selected')+'>Goods</option><option'+((sug(x)||x.s.type==='Service')?' selected':'')+'>Service</option></select></td></tr>').join('')+'</tbody></table></div>'
   +'<div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'xaTypes\')">Cancel</button><button class="btn" onclick="XA.itApply()">Apply</button></div></div>'); };
XA.itFilter=function(q){ q=String(q||'').toLowerCase(); document.querySelectorAll('#xaTypes .it-r').forEach(r=>{ r.style.display=!q||r.dataset.q.includes(q)?'':'none'; }); };
XA.itApply=function(){ let ch=0; document.querySelectorAll('#xaTypes .it-t').forEach(sel=>{ const s=DB.stock[+sel.dataset.i]; if(!s) return; const nv=sel.value, cur=s.type==='Service'?'Service':'Goods'; if(nv!==cur||(!s.type&&nv)){ if(nv!==cur) ch++; s.type=nv; } }); save(); closeModal('xaTypes'); try{ window.stRender&&window.stRender(); }catch(e){} toast(ch+' item type(s) changed.'); };

/* ---------------- 4. VIEW-ONLY role (server-side enforced by supabase/phase2.sql; this is the screen side) ---------------- */
if(!g('xa12Css')){ const st=document.createElement('style'); st.id='xa12Css'; st.textContent=
 'body.ro-view button[onclick*="save"],body.ro-view button[onclick*="Save"],body.ro-view button[onclick*="delete"],body.ro-view button[onclick*="Delete"],body.ro-view button[onclick*="remove"],body.ro-view button[onclick*="Remove"],body.ro-view button[onclick*="Add"],body.ro-view button[onclick*="add"],body.ro-view button[onclick*="New"],body.ro-view button[onclick*="new"],body.ro-view button[onclick*="Edit"],body.ro-view button[onclick*="edit"],body.ro-view button[onclick*="Import"],body.ro-view button[onclick*="import"],body.ro-view button[onclick*="Transfer"],body.ro-view button[onclick*="Convert"],body.ro-view button[onclick*="Pay"],body.ro-view button[onclick*="Restore"],body.ro-view .btn.danger,body.ro-view label.btn:has(input[type=file]),body.ro-view .modal-actions .btn:not(.ghost){display:none!important}'
 +'body.ro-view .ro-ok{display:inline-flex!important}';
 document.head.appendChild(st); }
const save0=window.save; let firstSeen=0, lastWarn=0;
window.save=function(){ const me=window.curUser&&window.curUser(); if(me&&me.role==='viewer'){ const n=Date.now(); firstSeen=firstSeen||n; if(n-firstSeen>5000&&n-lastWarn>4000){ lastWarn=n; toast('View-only access — changes are not saved.',true); } return; } return save0.apply(this,arguments); };
})();
