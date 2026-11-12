/* ===== Add-on 42 (v20261112e): Contracts menu order (All Contracts · Reading Run · Billing Calendar · …) ·
   Billing Calendar: "+ Bill" shows ✓ Billed (invoice no.) and asks before a second invoice for the same cycle ===== */
(function(){
'use strict';
const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
const dmy=d=>(d?(typeof fmtDMY==='function'?fmtDMY(d):d):'—');
const addD=(s,n)=>{ const d=new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };

/* ---------- 1. Contracts sub-menu order ---------- */
const FIRST=['All Contracts','Reading Run','Billing Calendar'];
function reorder(){ try{ if(typeof SD==='undefined') return; const C=SD.find(x=>x.g==='Contracts'); if(!C) return; const head=FIRST.map(l=>C.items.find(i=>i[0]===l)).filter(Boolean); if(head.length<FIRST.length) return;
  const ok=FIRST.every((l,ix)=>C.items[ix]&&C.items[ix][0]===l); if(ok) return; C.items=head.concat(C.items.filter(i=>!FIRST.includes(i[0]))); try{ sdBuild(); sdSync('xa'); }catch(e){ try{ sdBuild(); }catch(_){} } }catch(e){} }
setInterval(reorder,1200); setTimeout(reorder,300);

/* ---------- 2. Billing Calendar: already-billed check next to "+ Bill" ---------- */
function mentions(v,m){ const h=String(v.html||'').toLowerCase(); if(!h) return true; if(/all machines/.test(h)) return true; if(m.serial&&h.includes(String(m.serial).toLowerCase())) return true; if(m.eqid&&h.includes(String(m.eqid).toLowerCase())) return true; const d=String(m.department||'').toLowerCase().trim(); return !!d&&h.includes(d); }
function billedFor(c,m,ym){ let k=null; try{ k=kOf(c,m); }catch(e){} if(!window.XA||!XA.schedule) return null; const row=XA.schedule(m,c,k).find(r=>r.date.slice(0,7)===ym); if(!row) return null; const d=row.date, lease=/lease/i.test(row.tag), exc=/excess/i.test(row.tag);
  const invs=(DB.invoices||[]).map((v,i)=>({v,i})).filter(x=>x.v.cid===c.id&&!x.v.cancelled&&mentions(x.v,m));
  if(lease){ const hit=invs.find(x=>x.v.from&&x.v.to&&x.v.from<=d&&x.v.to>=d); if(hit) return {inv:hit.v,i:hit.i,txt:'lease '+dmy(hit.v.from)+' → '+dmy(hit.v.to),date:d}; }
  if(exc&&!lease){ const hit=invs.find(x=>x.v.exTo&&x.v.exTo>=addD(d,-5)); if(hit) return {inv:hit.v,i:hit.i,txt:'excess copies up to '+dmy(hit.v.exTo),date:d}; }
  return null; }
window.xbBillChk=function(cid,mid,ym){ const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid); const b=c&&m&&billedFor(c,m,ym);
  if(!b){ if(typeof xbBillCid==='function') xbBillCid(cid); return; }
  askConfirm('Already billed: invoice '+b.inv.no+' ('+b.txt+') dated '+dmy(b.inv.date)+' covers '+(m.serial||m.model)+' for '+dmy(b.date)+'. Generating another bill will create a DOUBLE invoice. Bill anyway?',()=>xbBillCid(cid),'Bill anyway'); };
window.xbBillView=function(i){ try{ viewInvoice(i); }catch(e){} };
const bc=window.XA&&XA.views&&XA.views.bcal; if(bc&&typeof bc.render==='function'&&!bc.__x42){ bc.__x42=1; const rd=bc.render;
  bc.render=function(){ let h=rd.apply(this,arguments);
    try{ h=h.replace(/onclick="XA\.bcRead\('([^']+)','([^']+)','([^']+)'\)">Enter reading<\/button>\s*<button class="btn sm" onclick="xbBillCid\('([^']+)'\)">\+ Bill<\/button>/g,(a,cid,mid,ym)=>{ const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid), b=c&&m&&billedFor(c,m,ym);
      const btn='onclick="XA.bcRead(\''+cid+'\',\''+mid+'\',\''+ym+'\')">Enter reading</button> <button class="btn sm'+(b?' ghost':'')+'" onclick="xbBillChk(\''+cid+'\',\''+mid+'\',\''+ym+'\')">+ Bill</button>';
      return btn+(b?' <a href="#" class="badge good" title="'+E('Invoice '+b.inv.no+' · '+b.txt)+'" style="text-decoration:none" onclick="xbBillView('+b.i+');return false">✓ Billed '+E(b.inv.no)+'</a>':''); }); }catch(e){ console.warn('x42',e); }
    return h; }; }
})();
