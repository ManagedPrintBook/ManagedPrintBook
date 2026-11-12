/* ===== Add-on 40 (v20261112c): Contracts lists – frozen header + scrollbar on top, "R" reading mark in Period ·
   Reading mode per contract (Sale (ORS) = no monthly reading; optional one-time at start + warranty end) · Warranty-end AMC proposal alert ·
   Reading Run custom From–To dates ===== */
(function(){
'use strict';
const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
const g=id=>document.getElementById(id);
const dmy=d=>(d?(typeof fmtDMY==='function'?fmtDMY(d):d):'—');
const kk=(c,m)=>{ try{ return kOf(c,m); }catch(e){ return null; } };
const cust=id=>(DB.customers||[]).find(x=>x.id===id);

/* ---------- 1. frozen header + moving scale above the header ---------- */
const st=document.createElement('style'); st.textContent='#ctTable,#ctMTable,#ctRTable{max-height:calc(100vh - 290px);overflow:auto!important}#ctTable thead th,#ctMTable thead th,#ctRTable thead th{position:sticky;top:0;z-index:3;background:#f0f2f7;box-shadow:0 1px 0 #dde3ee}#ctTable::-webkit-scrollbar:horizontal,#ctMTable::-webkit-scrollbar:horizontal,#ctRTable::-webkit-scrollbar:horizontal{height:0}.xtop{overflow-x:auto;overflow-y:hidden;height:15px;margin:0 0 2px}.xtop>div{height:1px}.rchip{display:inline-block;font-size:.62rem;font-weight:800;line-height:1;padding:2px 5px;border-radius:5px;margin:0 0 3px;cursor:help;background:#f2a541;color:#14213d}.rchip.ok{background:#e7f8f1;color:#0d9260}';
document.head.appendChild(st);
function frost(id){ const host=g(id); if(!host) return; let top=host.previousElementSibling; if(!(top&&top.classList.contains('xtop'))){ top=document.createElement('div'); top.className='xtop'; top.innerHTML='<div></div>'; host.parentNode.insertBefore(top,host);
    let lock=0; top.addEventListener('scroll',()=>{ if(lock){ lock=0; return; } lock=1; host.scrollLeft=top.scrollLeft; }); host.addEventListener('scroll',()=>{ if(lock){ lock=0; return; } lock=1; top.scrollLeft=host.scrollLeft; }); }
  const w=host.scrollWidth; top.firstChild.style.width=w+'px'; top.style.display=w>host.clientWidth+2?'':'none'; }
const frostAll=()=>['ctTable','ctMTable','ctRTable'].forEach(id=>{ try{ if(g(id)&&g(id).offsetParent) frost(id); }catch(e){} });
setInterval(frostAll,900); window.addEventListener('resize',frostAll);

/* ---------- 2. "R" mark above the Period date ---------- */
function rState(c,k){ const ym=todayISO().slice(0,7); let need=0,done=0,first=''; (c.machines||[]).forEach(m=>{ if(m.status!=='Active'||(kk(c,m)||{}).id!==k.id||!window.xaDues) return; const D=window.xaDues(c,m); if(!D) return; const x=D.list.find(y=>y.d.slice(0,7)===ym); if(!x) return; need++; if(window.xaDoneFor(m,x)||(m.readings||[]).some(r=>r.month===ym)) done++; if(!first||x.d<first) first=x.d; }); return need?{need,done,first}:null; }
function addR(){ const host=g('ctTable'); const tb=host&&host.querySelector('table'); if(!tb||!tb.tHead||tb.dataset.r40) return; tb.dataset.r40=1; const ths=[...tb.tHead.rows[0].cells], ix=ths.findIndex(t=>t.textContent.trim()==='Period'); if(ix<0) return;
  [...tb.tBodies[0].rows].forEach(r=>{ const b=r.querySelector('button[onclick*="ctOpen"],a[onclick*="ctOpen"]'), m=b&&/ctOpen\('([^']+)','([^']+)'\)/.exec(b.getAttribute('onclick')||''); if(!m) return; const c=cust(m[1]), k=c&&c.contracts.find(x=>x.id===m[2]); if(!k) return; const s=rState(c,k); if(!s) return;
    const cell=r.cells[ix]; if(!cell) return; const all=s.done>=s.need; cell.insertAdjacentHTML('afterbegin','<div><span class="rchip'+(all?' ok':'')+'" title="'+(all?'Reading for this month is entered':'Reading required this month ('+(s.need-s.done)+' of '+s.need+' machine(s) pending) · due '+dmy(s.first))+'">R'+(all?' ✓':' · '+dmy(s.first).slice(0,5))+'</span></div>'); }); }
['ctList','ctRenewals','ctMachines'].forEach(n=>{ if(typeof window[n]!=='function') return; const o=window[n]; window[n]=function(){ const r=o.apply(this,arguments); setTimeout(()=>{ try{ if(n==='ctList') addR(); frostAll(); }catch(e){ console.warn(n,e); } },350); return r; }; try{ eval(n+'=window.'+n); }catch(e){} });

/* ---------- 3. contract page: Reading Run mode ---------- */
window.xaSetReadMode=function(cid,kid,v){ const c=cust(cid), k=c&&c.contracts.find(x=>x.id===kid); if(!k) return; if(v) k.readMode=v; else delete k.readMode; save(); try{ renderBell(); updateNav(); }catch(e){} try{ ctDetail(); }catch(e){} if(typeof toast==='function') toast('Reading mode saved.'); };
if(typeof ctDetail==='function'){ const o=ctDetail; window.ctDetail=function(){ const r=o.apply(this,arguments); try{ const c=cust(ctCid), k=c&&c.contracts.find(x=>x.id===ctKid), host=g('ctDet'); const card=host&&host.querySelector('.card.pad'); if(k&&card){ const sale=String(k.type||'').startsWith('Sale'), cur=k.readMode||'', we=window.xaWarrantyEnd(k);
    card.insertAdjacentHTML('beforeend','<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)"><div class="hint" style="margin:0 0 4px"><b>Meter readings (Reading Run)</b>'+(sale&&we?' · warranty ends '+dmy(we)+' — an AMC proposal alert appears 30 days before':'')+'</div><select onchange="xaSetReadMode(\''+c.id+'\',\''+k.id+'\',this.value)" style="max-width:520px"><option value=""'+(cur?'':' selected')+'>Default — '+(sale?'no reading (toner / ink tracking only)':'every billing cycle from the start date')+'</option><option value="cycle"'+(cur==='cycle'?' selected':'')+'>Every cycle (monthly / quarterly / yearly from the start date)</option><option value="once"'+(cur==='once'?' selected':'')+'>One-time: at the start date and at the warranty end date only</option><option value="none"'+(cur==='none'?' selected':'')+'>No reading required</option></select></div>'); } }catch(e){ console.warn('rm',e); } return r; }; ctDetail=window.ctDetail; }

/* ---------- 4. warranty end of Sale (ORS) contracts -> bell alert "send AMC proposal" ---------- */
const wItems=()=>{ const t=todayISO(), out=[]; (DB.customers||[]).forEach(c=>(c.contracts||[]).forEach(k=>{ if(!String(k.type||'').startsWith('Sale')||k.cancelled||k.amcDone) return; const we=window.xaWarrantyEnd(k); if(!we) return; if(typeof daysBetween==='function'&&daysBetween(t,we)>30) return;
  if((DB.msales||[]).some(x=>x.cid===c.id&&x.wEnd===we)) return; const ms=(c.machines||[]).filter(m=>(kk(c,m)||{}).id===k.id&&m.status==='Active'); if(!ms.length) return;
  out.push({t:'amc',m:{id:'kw_'+k.id,cid:c.id,wEnd:we,model:ms.length===1?(ms[0].model||''):ms.length+' machines',serial:ms.map(m=>m.serial).filter(Boolean).join(', '),kw:{c,k}}}); })); return out; };
if(typeof slExtra==='function'){ const o=slExtra; window.slExtra=function(){ return o.apply(this,arguments).concat(wItems()); }; slExtra=window.slExtra; }
if(typeof msAmc==='function'){ const o=msAmc; window.msAmc=function(id){ if(String(id).indexOf('kw_')!==0) return o.apply(this,arguments); const it=wItems().find(x=>x.m.id===id); if(!it) return; const m=it.m, co=DB.company||{};
  slSend(m.cid,'Dear '+(typeof cn==='function'?cn(m.cid):'')+',\n\nThe warranty on your '+m.model+(m.serial?' (Sr.# '+m.serial+')':'')+(m.wEnd<todayISO()?' ended on ':' ends on ')+dmy(m.wEnd)+'. We would be glad to send you an AMC proposal to keep it running smoothly.\n\n'+(co.name||''),'m:'+id); }; msAmc=window.msAmc; }
if(typeof msDone==='function'){ const o=msDone; window.msDone=function(id){ if(String(id).indexOf('kw_')!==0) return o.apply(this,arguments); const kid=String(id).slice(3); (DB.customers||[]).forEach(c=>(c.contracts||[]).forEach(k=>{ if(k.id===kid) k.amcDone=true; })); save(); try{ renderBell(); }catch(e){} }; msDone=window.msDone; }

/* ---------- 5. Reading Run: custom From – To dates ---------- */
function runRange(){ const f=g('run_from')&&g('run_from').value, t=g('run_to')&&g('run_to').value; return f&&t&&f<=t?{f,t}:null; }
function drawRange(R){ const cf=g('run_cust').value, sf=g('run_status').value, q=((g('run_q')||{}).value||'').toLowerCase().trim(), today=todayISO(), lead=typeof runLead==='function'?runLead():7, rows=[];
  const months=[]; { let y=+R.f.slice(0,4), mo=+R.f.slice(5,7); while((y+'-'+String(mo).padStart(2,'0'))<=R.t.slice(0,7)){ months.push(y+'-'+String(mo).padStart(2,'0')); mo++; if(mo>12){ mo=1; y++; } } }
  (DB.customers||[]).forEach(c=>{ if(cf&&cf!=='all'&&c.id!==cf) return; (c.machines||[]).forEach(m=>{ if(m.status!=='Active'||window.xaReadMode(c,m)==='none') return; let items=[]; const D=window.xaDues(c,m);
    if(D) items=D.list.filter(x=>x.d>=R.f&&x.d<=R.t).map(x=>({d:x.d,month:x.d.slice(0,7)})); else items=months.map(mm=>({d:readDate(c,m,mm),month:mm})).filter(x=>x.d>=R.f&&x.d<=R.t);
    items.forEach(it=>{ const r=(m.readings||[]).find(x=>x.month===it.month), dl=Math.round((Date.parse(it.d)-Date.parse(today))/864e5), k=r?'done':dl<0?'over':dl<=lead?'due':'later'; rows.push({c,m,r,it,k,dl}); }); }); });
  rows.sort((a,b)=>a.it.d.localeCompare(b.it.d)||a.c.name.localeCompare(b.c.name));
  const list=rows.filter(x=>(sf==='due'||sf==='all'||(sf==='done'&&x.r)||(sf==='pending'&&!x.r)||(sf==='over'&&x.k==='over')||(sf==='later'&&x.k==='later'))&&(!q||(x.c.name+' '+(x.m.department||'')+' '+x.m.model+' '+(x.m.serial||'')).toLowerCase().includes(q)));
  const badge=x=>x.k==='done'?'<span class="badge good">Done</span>':x.k==='over'?'<span class="badge bad">Overdue '+(-x.dl)+'d</span>':x.k==='due'?'<span class="badge warn">'+(x.dl===0?'Due today':'Due in '+x.dl+'d')+'</span>':'<span class="badge gray">Not yet due</span>';
  g('run_progress').textContent=dmy(R.f)+' → '+dmy(R.t)+': '+rows.filter(x=>x.r).length+' read · '+rows.filter(x=>!x.r).length+' pending (of '+rows.length+')'; if(g('runBanner')) g('runBanner').innerHTML='';
  g('runTable').innerHTML=list.length?'<table><thead><tr><th>Customer</th><th>Department</th><th>Machine</th><th>Serial</th><th>Reading date</th><th>Status</th><th>Consumption</th><th></th></tr></thead><tbody>'+list.map(({c,m,r,it,k,dl})=>{ const qq=r?rc(m,r):null, cons=qq?(m.type==='Plotter'?fmtN(usage(m,qq)):fmtN(qq.mono)+' mono / '+fmtN(qq.color)+' colour'):'—';
    return '<tr><td>'+E(c.name)+'</td><td>'+E(m.department||'—')+'</td><td>'+E(m.model)+'</td><td>'+E(m.serial||'—')+'</td><td>'+dmy(it.d)+'<div class="hint" style="margin:0">'+it.month+'</div></td><td>'+badge({r,k,dl})+'</td><td>'+cons+'</td><td><button class="btn sm '+(r?'ghost':'')+'" onclick="openReading(\''+c.id+'\',\''+m.id+'\',\''+it.month+'\')">'+(r?'Edit':'Enter')+' reading</button></td></tr>'; }).join('')+'</tbody></table>':'<div class="empty">No readings fall between these dates.</div>'; }
if(typeof renderRun==='function'){ const o=renderRun; window.renderRun=function(){ const r=o.apply(this,arguments); try{ const R=runRange(); if(R) drawRange(R); }catch(e){ console.warn('range',e); } return r; }; renderRun=window.renderRun; }
})();
