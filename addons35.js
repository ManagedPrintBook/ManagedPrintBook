/* ===== Add-on 35: invoice form polish =====
   1. Salesperson is remembered: the last name used becomes the default on every new invoice / quote.
   2. Salesperson box is the same size as the Customer Name box.
   3. Item row works like Zoho: click the item box (or type even ONE letter, e.g. "V") and every matching item is listed below it,
      starting-with matches first, then "contains" matches, each with stock availability. ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id), KEY='xa_last_sp';
const getLast=()=>{ try{ return localStorage.getItem(KEY)||''; }catch(e){ return ''; } };
const setLast=v=>{ v=String(v||'').trim(); if(!v) return; try{ localStorage.setItem(KEY,v); }catch(e){} try{ if(window.DB&&DB.company&&DB.company.lastSP!==v){ DB.company.lastSP=v; if(typeof save==='function') save(); } }catch(e){} };
const lastSP=()=>getLast()||((window.DB&&DB.company&&(DB.company.lastSP||DB.company.salesPerson))||'');

/* 1+2: default salesperson + same width as Customer Name */
function tidy(id){ const inp=g(id); if(!inp) return;
  const w=inp.parentNode; if(w&&w.style&&w.dataset&&!w.dataset.w35&&w!==inp.closest('.zc')){ w.dataset.w35=1; w.style.width='100%'; w.style.maxWidth='440px'; }
  inp.style.width='100%';
  if(!inp.dataset.sp35){ inp.dataset.sp35=1; inp.addEventListener('change',()=>setLast(inp.value)); inp.addEventListener('blur',()=>setLast(inp.value)); } }
function fillDefault(){ ['sl_sp','q_sp'].forEach(id=>{ const el=g(id); if(el&&!el.value.trim()&&lastSP()) el.value=lastSP(); }); }
const hook=(name,fn)=>{ const o=window[name]; if(typeof o!=='function'||o.__x35) return; const w=function(){ const r=o.apply(this,arguments); try{ fn.apply(this,arguments); }catch(e){} return r; }; w.__x35=1; window[name]=w; };
const beforeSave=(name)=>{ const o=window[name]; if(typeof o!=='function'||o.__x35b) return; const w=function(){ try{ ['sl_sp','q_sp'].forEach(i=>g(i)&&setLast(g(i).value)); }catch(e){} return o.apply(this,arguments); }; w.__x35b=1; window[name]=w; };
setInterval(function(){ try{
  ['sl_sp','q_sp'].forEach(tidy);
  hook('pNew',()=>setTimeout(fillDefault,0)); hook('qNew',()=>setTimeout(fillDefault,0)); hook('qFill',()=>setTimeout(fillDefault,0));
  beforeSave('slAdd'); beforeSave('qSave');
}catch(e){} },700);

/* 3: Zoho-style item search - works from the first letter, and shows the list when the box is clicked */
function wrapSug(){ const o=window.qSug; if(typeof o!=='function'||o.__x35) return;
  const w=function(inp,i,ctx){ const raw=String(inp.value||'').trim();
    if(raw.length!==1) return o.apply(this,arguments);
    window.qCtx=ctx||'q'; try{ qCtx=ctx||'q'; }catch(e){}
    const box=g('qSug'); if(!box||typeof qProducts!=='function') return;
    const q=raw.toLowerCase(), all=qProducts(), starts=[], has=[];
    all.forEach(p=>{ const n=String(p.n||'').toLowerCase(), s=String(p.sku||'').toLowerCase(); if(n.startsWith(q)||s.startsWith(q)||n.split(/[^a-z0-9]+/).some(x=>x.startsWith(q))) starts.push(p); else if((n+' '+s).includes(q)) has.push(p); });
    const sorter=(a,b)=>String(a.n).localeCompare(String(b.n)); starts.sort(sorter); has.sort(sorter);
    const list=starts.concat(has).slice(0,80); try{ qSugList=list; }catch(e){}
    const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s));
    const st=p=>{ const s=(window.DB&&DB.stock||[]).find(x=>String(x.item||'').trim().toLowerCase()===String(p.n||'').trim().toLowerCase()), qty=p.stock!=null?+p.stock:(s?+s.qty:null);
      if(qty==null) return ''; return qty>0?'<span style="background:#dcfce7;color:#166534;border-radius:6px;padding:1px 7px;font-size:.74rem;font-weight:700">'+qty+' in stock</span>':'<span style="background:#fee2e2;color:#b91c1c;border-radius:6px;padding:1px 7px;font-size:.74rem;font-weight:700">Out of stock</span>'; };
    box.innerHTML=list.length?'<div style="padding:7px 12px;background:#f3f5f8;border-bottom:1px solid #e3e6ec;position:sticky;top:0"><b>'+list.length+'</b> item(s) starting with “'+E(raw)+'”</div>'+list.map((p,k)=>'<div onclick="qPick('+i+','+k+')" style="padding:7px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #f0f2f5" onmouseover="this.style.background=\'#eaf1ff\'" onmouseout="this.style.background=\'\'"><span>'+(p.sku?'<b>'+E(p.sku)+'</b> · ':'')+E(p.n)+'</span><span style="white-space:nowrap">'+st(p)+'</span></div>').join(''):'<div style="padding:10px;color:#667">No item starts with “'+E(raw)+'”.</div>';
    box.style.width='520px'; const rc=inp.getBoundingClientRect(); box.style.left=Math.max(4,Math.min(rc.left,innerWidth-540))+'px'; box.style.top=Math.min(rc.bottom+2,innerHeight-350)+'px'; box.style.display=''; };
  Object.keys(o).forEach(k=>{ w[k]=o[k]; }); w.__x35=1; window.qSug=w; }
setInterval(function(){ try{ wrapSug(); }catch(e){} },700);
/* clicking an already-filled item box shows the list again (Zoho behaviour) */
document.addEventListener('click',function(e){ const t=e.target; if(!t||t.tagName!=='INPUT') return; const tr=t.closest('#pRows tr,#qRows tr'); if(!tr||t.cellIndex>0&&t.parentNode.cellIndex>0) return; if(t.parentNode!==tr.cells[0]) return;
  const ctx=tr.closest('#pRows')?'p':'q', i=tr.rowIndex-(tr.closest('table').tHead?tr.closest('table').tHead.rows.length:0); if(typeof window.qSug==='function'&&!t.dataset.x35c){ t.dataset.x35c=1; setTimeout(()=>{ delete t.dataset.x35c; },300); try{ window.qSug(t,i,ctx); }catch(_){} } },true);
})();
