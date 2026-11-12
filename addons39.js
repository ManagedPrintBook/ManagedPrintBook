/* ===== Add-on 39 (v20261112b): Sr.# column in the Contracts lists (+ Customize columns) · Canon counter codes 112 / 113 / 122 / 123 in readings =====
   Canon: 113 Mono Small = x1 A4 · 112 Mono Large = x2 A4 · 123 Colour Small = x1 A4 · 122 Colour Large = x2 A4 ===== */
(function(){
'use strict';
const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));

/* ---------- 1. Sr.# column in the Contracts lists ---------- */
function addSr(tableId,afterLabel){ const host=document.getElementById(tableId); if(!host) return; const tb=host.querySelector('table'); if(!tb||!tb.tHead||tb.tHead.querySelector('th[data-sr]')) return;
  const ths=[...tb.tHead.rows[0].cells], ix=ths.findIndex(t=>t.textContent.trim()===afterLabel); if(ix<0) return;
  const th=document.createElement('th'); th.textContent='Sr.#'; th.setAttribute('data-sr','1'); ths[ix].after(th);
  [...tb.tBodies[0].rows].forEach(r=>{ const b=r.querySelector('button[onclick*="ctOpen"],a[onclick*="ctOpen"]'), m=b&&/ctOpen\('([^']+)','([^']+)'\)/.exec(b.getAttribute('onclick')||'');
    const td=document.createElement('td'); td.style.cssText='white-space:normal;font-size:.76rem;max-width:190px';
    if(m){ const c=(DB.customers||[]).find(x=>x.id===m[1]); if(c){ const ms=(c.machines||[]).filter(x=>{ try{ return kOf(c,x).id===m[2]; }catch(e){ return false; } });
      const sr=ms.map(x=>x.serial).filter(Boolean); td.innerHTML=sr.length?sr.map(E).join('<br>'):'—'; } else td.textContent='—'; } else td.textContent='—';
    r.cells[ix]?r.cells[ix].after(td):r.appendChild(td); }); }
if(typeof ctList==='function'){ const o=ctList; window.ctList=function(){ const r=o.apply(this,arguments); try{ addSr('ctTable','Contract'); }catch(e){ console.warn('sr',e); } return r; }; ctList=window.ctList; }
if(typeof ctRenewals==='function'){ const o=ctRenewals; window.ctRenewals=function(){ const r=o.apply(this,arguments); try{ addSr('ctRTable','Contract'); }catch(e){ console.warn('sr',e); } return r; }; ctRenewals=window.ctRenewals; }

/* ---------- 2. Canon counter codes in the reading form ---------- */
const isCanon=m=>/canon/i.test((m&&(m.brand||''))+' '+(m&&m.model||''));
const LBL=[['113 · Mono Small (1 = 1 A4)'],['112 · Mono Large (1 = 2 A4)'],['123 · Colour Small (1 = 1 A4)'],['122 · Colour Large (1 = 2 A4)']];
function relabel(){ let m=null; try{ m=curMachine().m; }catch(e){} const sp=[...document.querySelectorAll('#rdPrinter .rdgrid > span')].slice(0,4); if(!sp.length) return;
  sp.forEach((s,i)=>{ if(!s.dataset.o) s.dataset.o=s.textContent; s.textContent=(m&&isCanon(m))?LBL[i][0]:s.dataset.o; });
  if(m&&isCanon(m)) m.a3Factor=2; }
if(typeof openReading==='function'){ const o=openReading; window.openReading=function(){ const r=o.apply(this,arguments); try{ relabel(); }catch(e){} return r; }; openReading=window.openReading; }
if(typeof updatePreview==='function'){ const o=updatePreview; window.updatePreview=function(){ const r=o.apply(this,arguments); try{ const {m}=curMachine(), b=document.getElementById('rd_preview'); if(m&&isCanon(m)&&b&&m.type!=='Plotter'){
    b.innerHTML=b.innerHTML.replace(/Mono: A4 (\S+) \+ A3/,'Mono: 113 × 1 = $1 + 112 × 2 →').replace(/Colour: A4 (\S+) \+ A3/,'Colour: 123 × 1 = $1 + 122 × 2 →'); } }catch(e){} return r; }; updatePreview=window.updatePreview; }
})();
