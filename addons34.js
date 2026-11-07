/* ===== Add-on 34: easy salesperson picker on invoices and quotes =====
   The small browser list (datalist) was hard to click and only showed names matching what was already typed.
   Now: click the box (or the arrow) and ALL salespeople show in big rows; typing filters; "+ Use new name" adds a new one. ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id), E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
function names(){ const S={}, add=n=>{ n=String(n||'').trim(); if(n) S[n.toLowerCase()]=S[n.toLowerCase()]||n; };
  if(window.DB){ if(DB.company) add(DB.company.salesPerson); (DB.customers||[]).forEach(c=>add(c.sp)); Object.keys(DB.targets||{}).forEach(add); (DB.quotes||[]).forEach(q=>add(q.sales)); (DB.sales||[]).forEach(x=>add(x.sp)); (DB.invoices||[]).forEach(v=>{ add(v.sp); add(v.sales); }); }
  return Object.values(S).sort((a,b)=>a.localeCompare(b)); }
function wire(id){ const inp=g(id); if(!inp||inp.dataset.sp34) return; inp.dataset.sp34=1; inp.setAttribute('list','spNone'); inp.setAttribute('autocomplete','off');
  const w=document.createElement('div'); w.style.cssText='position:relative;display:inline-block;width:260px;max-width:100%'; inp.parentNode.insertBefore(w,inp); w.appendChild(inp); inp.style.width='100%'; inp.style.paddingRight='34px';
  const btn=document.createElement('button'); btn.type='button'; btn.tabIndex=-1; btn.textContent='▾'; btn.title='Show all salespeople'; btn.style.cssText='position:absolute;right:1px;top:1px;bottom:1px;width:34px;border:0;background:none;cursor:pointer;font-size:16px';
  const dd=document.createElement('div'); dd.style.cssText='display:none;position:absolute;left:0;right:0;top:100%;z-index:9500;background:#fff;color:#222;border:1px solid #cfd4dc;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);max-height:300px;overflow:auto;margin-top:2px';
  w.appendChild(btn); w.appendChild(dd);
  const pick=n=>{ inp.value=n; ['input','change'].forEach(t=>inp.dispatchEvent(new Event(t,{bubbles:true}))); hide(); };
  const hide=()=>{ dd.style.display='none'; };
  function show(filter){ const all=names(), f=(filter||'').trim().toLowerCase(), cur=inp.value.trim().toLowerCase(), L=f?all.filter(n=>n.toLowerCase().includes(f)):all;
    let h=L.map(n=>'<div data-n="'+E(n)+'" style="padding:11px 14px;cursor:pointer;border-bottom:1px solid #f0f2f5;font-size:.95rem'+(n.toLowerCase()===cur?';background:#eaf1ff;font-weight:700':'')+'">'+E(n)+'</div>').join('');
    if(f&&!all.some(n=>n.toLowerCase()===f)) h+='<div data-n="'+E(filter.trim())+'" style="padding:11px 14px;cursor:pointer;color:#1d4ed8;font-weight:600">＋ Use new name “'+E(filter.trim())+'”</div>';
    if(!h) h='<div style="padding:11px 14px;color:#667">No salespeople yet — type a name.</div>';
    dd.innerHTML=h; dd.style.display=''; }
  dd.addEventListener('mousedown',e=>{ e.preventDefault(); const t=e.target.closest('[data-n]'); if(t) pick(t.getAttribute('data-n')); });
  dd.addEventListener('touchstart',e=>{ const t=e.target.closest('[data-n]'); if(t){ e.preventDefault(); pick(t.getAttribute('data-n')); } },{passive:false});
  inp.addEventListener('focus',()=>show('')); inp.addEventListener('click',()=>show(dd.style.display==='none'?'':inp.value));
  inp.addEventListener('input',()=>show(inp.value)); inp.addEventListener('blur',()=>setTimeout(hide,150));
  inp.addEventListener('keydown',e=>{ if(e.key==='Escape') hide(); if(e.key==='Enter'&&dd.style.display!=='none'){ const f=dd.querySelector('[data-n]'); if(f){ e.preventDefault(); pick(f.getAttribute('data-n')); } } });
  btn.addEventListener('mousedown',e=>{ e.preventDefault(); if(dd.style.display==='none'){ inp.focus(); show(''); } else hide(); }); }
setInterval(function(){ try{ wire('sl_sp'); wire('q_sp'); }catch(e){} },700);
})();
