/* ===== Add-on 28 (v20261102b): customer page → "Bill" per contract (reading → invoice popup) · customer Data Check (duplicates & mistakes) ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const E=s=>(typeof esc==='function'?esc(String(s===undefined||s===null?'':s)):String(s));
const num=v=>parseFloat(v)||0;
const iso=s=>{ s=String(s==null?'':s).trim(); return /^\d{4}-\d{2}-\d{2}/.test(s); };
const norm=s=>String(s||'').replace(/[\s\-_.\/]/g,'').toUpperCase();
const XB=window.XB=window.XB||{};

/* ---------------- 1. Bill: readings of the contract's machines, then the invoice popup ---------------- */
const machinesOf=(c,k)=>(c.machines||[]).filter(m=>m.status==='Active'&&m.contractId===k.id);
const needsReading=(c,k,ms)=>{ if(k.unlimited) return false; return ms.some(m=>[m.rateMono,m.rateColor,m.ratePlot].some(v=>num(v)>0))||[c.rateMono,c.rateColor,c.ratePlot].some(v=>num(v)>0); };
XB.q=null;
XB.start=function(cid,kid){
  const c=custById(cid), k=c&&(c.contracts||[]).find(x=>x.id===kid); if(!k) return;
  if(k.cancelled){ toast('This contract is cancelled.',true); return; }
  const ms=machinesOf(c,k); if(!ms.length){ toast('This contract has no active machine yet — use ＋ Machine first.',true); return; }
  const ym=todayISO().slice(0,7);
  const todo=needsReading(c,k,ms)?ms.filter(m=>!(m.readings||[]).some(r=>r.month===ym)):[];
  XB.q={cid,kid,ym,list:todo.map(m=>m.id),total:todo.length,i:0,t0:0};
  if(!todo.length){ if(needsReading(c,k,ms)) toast('This month\'s readings are already entered — opening the bill.'); XB.bill(); return; }
  XB.next();
};
XB.next=function(){
  const q=XB.q; if(!q) return; if(q.i>=q.list.length){ XB.bill(); return; }
  openReading(q.cid,q.list[q.i],q.ym);
  const d=g('rd_date'); if(d&&!d.value) d.value=todayISO();
  const t=g('readingTitle'); if(t) t.textContent+=' — machine '+(q.i+1)+' of '+q.total+' (then the bill opens)';
  q.t0=Date.now(); XB.poll();
};
XB.poll=function(){
  clearInterval(XB._p); XB._p=setInterval(()=>{ const q=XB.q; if(!q){ clearInterval(XB._p); return; }
    const c=custById(q.cid), m=c&&c.machines.find(x=>x.id===q.list[q.i]); if(!m){ XB.q=null; clearInterval(XB._p); return; }
    const saved=(m.readings||[]).some(r=>r.month===q.ym), ov=g('readingOverlay'), open=ov&&ov.classList.contains('show'), dup=g('dupOverlay')&&g('dupOverlay').classList.contains('show');
    if(saved&&!open){ clearInterval(XB._p); q.i++; setTimeout(XB.next,350); }
    else if(!saved&&!open&&!dup&&Date.now()-q.t0>2500&&!document.querySelector('.overlay.show,.modal-overlay.show')){ XB.q=null; clearInterval(XB._p); }
  },400); };
XB.bill=function(){
  const q=XB.q; XB.q=null; clearInterval(XB._p); if(!q) return;
  try{ selectCustomer(q.cid); }catch(e){ toast('Could not open the bill page.',true); return; }
  setTimeout(()=>{ const bx=document.querySelectorAll('#detailArea .bk_on'); bx.forEach(x=>{ x.checked=(x.value===q.kid); });
    try{ if(typeof bkApply==='function') bkApply(); }catch(e){}
    try{ genClick('invoice'); }catch(e){ toast('Open Generate Bill and press Generate Tax Invoice.',true); } },250);
};

/* ---------------- 2. Data check card on the customer page ---------------- */
function issues(c){
  const out=[], K=c.contracts||[], M=c.machines||[], kids=new Set(K.map(k=>k.id)), lab=k=>(typeof kLabel==='function'?kLabel(c,k):(k.ref||k.id));
  const act=M.filter(m=>m.status==='Active');
  /* unlinked machines */
  act.filter(m=>!kids.has(m.contractId)).forEach(m=>out.push({lv:'hi',t:'Machine <b>'+E(m.serial||m.model)+'</b> is not linked to any contract (it is being counted under the first contract).',fix:{type:'link',mid:m.id}}));
  /* same Sr.# twice in this customer or active at another customer */
  const bySr={}; act.forEach(m=>{ const n=norm(m.serial); if(n) (bySr[n]=bySr[n]||[]).push(m); });
  Object.keys(bySr).forEach(n=>{ if(bySr[n].length>1) out.push({lv:'hi',t:'Sr.# <b>'+E(bySr[n][0].serial)+'</b> is entered '+bySr[n].length+' times under this customer.',go:1}); });
  const other={}; (DB.customers||[]).forEach(o=>{ if(o.id===c.id) return; (o.machines||[]).forEach(m=>{ if(m.status!=='Active') return; const n=norm(m.serial); if(n) (other[n]=other[n]||[]).push(o.name); }); });
  Object.keys(bySr).forEach(n=>{ if(other[n]) out.push({lv:'hi',t:'Sr.# <b>'+E(bySr[n][0].serial)+'</b> is also Active under <b>'+E([...new Set(other[n])].join(', '))+'</b>.',go:1}); });
  /* same specification twice: same model + department + contract, different Sr.# or none */
  const spec={}; act.forEach(m=>{ const key=[norm(m.model),norm(m.department),m.contractId].join('|'); if(norm(m.model)) (spec[key]=spec[key]||[]).push(m); });
  Object.values(spec).forEach(a=>{ if(a.length>1&&new Set(a.map(m=>norm(m.serial))).size<a.length||(a.length>1&&a.some(m=>!norm(m.serial)))) out.push({lv:'md',t:'Same specification entered '+a.length+' times: <b>'+E(a[0].model)+'</b>'+(a[0].department?' · '+E(a[0].department):'')+' — check it is not a double entry.',go:1}); });
  /* duplicate contracts / empty contracts */
  const kk={}; K.filter(k=>!k.cancelled).forEach(k=>{ const key=[k.type,k.start,k.end,norm(k.ref||k.no||'')].join('|'); (kk[key]=kk[key]||[]).push(k); });
  Object.values(kk).forEach(a=>{ if(a.length>1) out.push({lv:'md',t:'Contracts <b>'+a.map(lab).map(E).join(' / ')+'</b> have the same type, dates and number — possible duplicate.',go:1}); });
  K.filter(k=>!k.cancelled&&!M.some(m=>m.contractId===k.id)).forEach(k=>out.push({lv:'lo',t:'Contract <b>'+E(lab(k))+'</b> has no machines.',go:1}));
  /* readings: same month twice, same counters in two months */
  M.forEach(m=>{ const r=m.readings||[], seen={}, cnt={}; r.forEach(x=>{ seen[x.month]=(seen[x.month]||0)+1; const key=['me','ce','me3','ce3'].map(f=>num(x[f])).join('/'); if(key!=='0/0/0/0') (cnt[key]=cnt[key]||[]).push(x.month); });
    Object.keys(seen).forEach(mo=>{ if(seen[mo]>1) out.push({lv:'hi',t:'<b>'+E(m.serial||m.model)+'</b>: reading for '+E(mo)+' is entered '+seen[mo]+' times.',go:1}); });
    Object.keys(cnt).forEach(k2=>{ if(cnt[k2].length>1) out.push({lv:'md',t:'<b>'+E(m.serial||m.model)+'</b>: identical closing counters in '+cnt[k2].map(E).join(' and ')+' (consumption will be 0 for the later month).',go:1}); }); });
  /* invoices: same period twice */
  const iv={}; (DB.invoices||[]).filter(v=>v.cid===c.id&&!v.cancelled&&!v.void&&v.status!=='cancelled').forEach(v=>{ const key=[v.from,v.to,v.exFrom,v.exTo,v.total].join('|'); (iv[key]=iv[key]||[]).push(v); });
  Object.values(iv).forEach(a=>{ if(a.length>1) out.push({lv:'hi',t:'Invoices <b>'+a.map(v=>E(v.no)).join(' and ')+'</b> bill the same period and amount.',inv:1}); });
  /* unreadable dates */
  K.forEach(k=>{ if((k.start&&!iso(k.start))||(k.end&&!iso(k.end))) out.push({lv:'hi',t:'Contract <b>'+E(lab(k))+'</b> has a date that is not in a readable format — re-enter it.',go:1}); });
  M.filter(m=>m.status==='Active').forEach(m=>{ if(m.startDate&&!iso(m.startDate)) out.push({lv:'hi',t:'Machine <b>'+E(m.serial||m.model)+'</b> has an unreadable start date — re-enter it.',go:1}); });
  /* active machines under an expired / cancelled contract */
  K.filter(k=>k.cancelled).forEach(k=>{ const a=act.filter(m=>m.contractId===k.id); if(a.length) out.push({lv:'md',t:'Cancelled contract <b>'+E(lab(k))+'</b> still has '+a.length+' active machine(s).',go:1}); });
  return out;
}
XB.checkHTML=function(c){ let L; try{ L=issues(c); }catch(e){ return ''; }
  const col={hi:'#b91c1c',md:'#b45309',lo:'#52607d'}, ic={hi:'●',md:'●',lo:'○'}, K=(c.contracts||[]);
  const head='<div class="zc-card" style="margin-top:14px"><h4 style="display:flex;justify-content:space-between;align-items:center"><span>Data check — duplicates &amp; mistakes</span><span class="hint" style="margin:0">'+(L.length?L.length+' item(s) to look at':'')+'</span></h4>';
  if(!L.length) return head+'<div style="color:#0d6e4b;font-size:.84rem">✔ No duplicate machines, readings, contracts or invoices found for this customer.</div></div>';
  return head+L.map(x=>'<div style="display:flex;gap:8px;align-items:center;padding:5px 0;border-top:1px solid #eef0f5;font-size:.82rem"><span style="color:'+col[x.lv]+'">'+ic[x.lv]+'</span><span style="flex:1">'+x.t+'</span>'
    +(x.fix&&x.fix.type==='link'?'<select class="xb_link" data-c="'+c.id+'" data-m="'+x.fix.mid+'"><option value="">link to…</option>'+K.map(k=>'<option value="'+k.id+'">'+E(typeof kLabel==='function'?kLabel(c,k):k.id)+'</option>').join('')+'</select>':'')
    +(x.go?'<a style="cursor:pointer;color:#1d4ed8" onclick="ctForCust(\''+c.id+'\')">Open contracts</a>':'')
    +(x.inv?'<a style="cursor:pointer;color:#1d4ed8" onclick="XA.csTab&&XA.csTab(\'tx\')">See invoices</a>':'')+'</div>').join('')+'</div>'; };
document.addEventListener('change',e=>{ const x=e.target; if(!x||!x.classList||!x.classList.contains('xb_link')||!x.value) return; const c=custById(x.dataset.c), m=c&&c.machines.find(y=>y.id===x.dataset.m); if(!m) return; m.contractId=x.value; save(); toast('Machine linked to the contract.'); try{ XA.csRight(); }catch(_){ try{ renderAll(); }catch(__){} } });

/* ---------------- 3. bell: duplicate summary count is left to the existing notifications ---------------- */
})();
