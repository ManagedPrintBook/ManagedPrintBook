/* ===== Add-on 18: picking a customer in a report / payments page opens the customer page; "Statement" opens the Zoho-style statement ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const E=s=>(typeof esc==='function'?esc(String(s===undefined||s===null?'':s)):String(s));
/* 1. Statement button → customer page, Statement tab (This Year) */
window.openStatement=function(){ const s=g('pay_cust'), cid=s&&s.value; if(!cid){ toast('Select a customer.',true); return; } const u=window.curUser&&window.curUser(), fin=!u||(u.role!=='sales'&&u.role!=='viewer'); XA.csGo(cid,fin?'stmt':'overview',fin?'year':undefined); };
/* 2. Payments page: choosing a customer moves to that customer's page */
const _rp=window.renderPay; if(typeof _rp==='function') window.renderPay=function(){ const s=g('pay_cust'); if(s&&s.value&&document.activeElement===s){ const id=s.value; s.blur(); setTimeout(()=>XA.csGo(id),0); return; } return _rp.apply(this,arguments); };
/* 3. Reports: every customer name in a report is a link to the customer page; the customer filter gets an "Open page" link */
function nameMap(){ const m={}; (DB.customers||[]).forEach(c=>{ const n=(c.name||'').trim(); if(n) m[n]=c.id; }); return m; }
let obs=null, tm=null;
function linkify(){ const o=g('rpOut'); if(!o) return; if(obs) obs.disconnect(); try{ const M=nameMap(); o.querySelectorAll('td').forEach(td=>{ if(td.dataset.xl||td.children.length) return; const id=M[td.textContent.trim()]; if(id){ td.dataset.xl='1'; td.innerHTML='<a style="color:#1d4ed8;font-weight:600;cursor:pointer" title="Open customer page" onclick="XA.csGo(\''+id+'\')">'+td.innerHTML+'</a>'; } }); }catch(e){} if(obs&&g('rpOut')) obs.observe(g('rpOut'),{childList:true,subtree:true}); }
function start(){ const o=g('rpOut'); if(!o){ setTimeout(start,800); return; } obs=new MutationObserver(()=>{ clearTimeout(tm); tm=setTimeout(linkify,120); }); obs.observe(o,{childList:true,subtree:true}); linkify(); }
start();
document.addEventListener('change',e=>{ const s=e.target; if(!s||s.id!=='rp_cust') return; let a=g('rpOpenC'); if(!a){ a=document.createElement('a'); a.id='rpOpenC'; a.style.cssText='display:block;margin-top:4px;font-size:.8rem;color:#1d4ed8;cursor:pointer'; s.parentNode.appendChild(a); } if(s.value){ const c=custById(s.value); a.textContent='Open '+(c?c.name:'customer')+' page →'; a.onclick=()=>XA.csGo(s.value); a.style.display=''; } else a.style.display='none'; });
})();
