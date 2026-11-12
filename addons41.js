/* ===== Add-on 41 (v20261112d): Generate Bill – Customer PO / Reference and Project name fill automatically from the ticked contract(s),
   each with an "Auto-fill" tick box (untick to type your own) ===== */
(function(){
'use strict';
if(typeof window.renderDetail!=='function') return;
const g=id=>document.getElementById(id);
const AUTO={po:true,proj:true};
function chosen(c){ const on=[...document.querySelectorAll('#detailArea .bk_on')]; let ids=on.filter(x=>x.checked).map(x=>x.value); const ks=c.contracts||[]; let L=ks.filter(k=>ids.includes(k.id)); if(!L.length) L=on.length?[]:ks; return L; }
const uniq=a=>[...new Set(a.filter(Boolean))];
function wanted(c){ const L=chosen(c); const po=uniq(L.map(k=>String(k.lpo||'').trim())).join(', ');
  let proj=uniq(L.map(k=>String(k.projectName||k.ref||'').trim())).join(', ');
  if(!proj){ proj=uniq(L.flatMap(k=>(c.machines||[]).filter(m=>{ try{ return kOf(c,m).id===k.id; }catch(e){ return false; } }).map(m=>String(m.department||'').trim()))).join(', '); }
  return {po,proj}; }
function put(inp,val,on){ if(!inp) return; if(!on) return; const prev=inp.dataset.auto||''; if(inp.value===''||inp.value===prev){ inp.value=val; inp.dataset.auto=val; } }
function fill(){ const c=custById(typeof billPage!=='undefined'?billPage:null); if(!c) return; const w=wanted(c); put(g('r_ref'),w.po,AUTO.po); put(g('r_proj'),w.proj,AUTO.proj); }
function tick(inp,key,label){ if(!inp||g('x41_'+key)) return; const lab=inp.parentNode.querySelector('label'); if(!lab) return;
  lab.insertAdjacentHTML('beforeend',' <label style="display:inline-flex;gap:4px;align-items:center;font-weight:600;margin-left:8px;white-space:nowrap"><input type="checkbox" id="x41_'+key+'" '+(AUTO[key]?'checked':'')+'> '+label+'</label>');
  g('x41_'+key).addEventListener('change',e=>{ AUTO[key]=e.target.checked; if(e.target.checked){ inp.dataset.auto='\u0000'; fill(); } }); }
const o=window.renderDetail; window.renderDetail=function(){ const r=o.apply(this,arguments); try{ tick(g('r_ref'),'po','Auto-fill from contract LPO #'); tick(g('r_proj'),'proj','Auto-fill from contract'); fill(); }catch(e){ console.warn('x41',e); } return r; }; renderDetail=window.renderDetail;
document.addEventListener('change',e=>{ const t=e.target; if(t&&t.classList&&t.classList.contains('bk_on')){ try{ fill(); }catch(_){} } });
})();
