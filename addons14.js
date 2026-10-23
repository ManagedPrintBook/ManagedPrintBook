/* ===== Add-on 14: overall duplicate scan (notification bell) — same/similar Sr.#, repeated Equipment ID / contract ref, similar customer names;
   details window with customer data + Remove record / Merge customers / Delete customer ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const E=s=>(typeof esc==='function'?esc(String(s===undefined||s===null?'':s)):String(s));
const nz=v=>(v===undefined||v===null||v==='')?'—':v;
const NS=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const kid=s=>String(s).replace(/[^\w]/g,'').slice(0,60);
const live=m=>m&&m.status==='Active';

/* ---------------- scan ---------------- */
const STOP=new Set(['llc','fze','fzc','fzco','co','company','ltd','limited','est','establishment','the','group','and','of','dubai','uae','trading','inc','branch','dept','department','office']);
function nameTok(n){ return String(n||'').toLowerCase().replace(/\(.*?\)/g,' ').replace(/l\.\s*l\.\s*c\.?/g,' ').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(t=>t&&!STOP.has(t)); }
const LOOK=['O0','I1','L1','S5','B8','Z2','G6','Q0','D0'];
function lev1(a,b){ if(a===b) return false; const la=a.length, lb=b.length; if(Math.abs(la-lb)>1) return false;
  if(la!==lb){ let i=0; while(i<la&&i<lb&&a[i]===b[i]) i++; return la>lb?a.slice(i+1)===b.slice(i):b.slice(i+1)===a.slice(i); }  /* one character missing / extra */
  const d=[]; for(let i=0;i<la;i++) if(a[i]!==b[i]) d.push(i);
  if(d.length===1) return LOOK.some(p=>(p[0]===a[d[0]]&&p[1]===b[d[0]])||(p[1]===a[d[0]]&&p[0]===b[d[0]]));  /* look-alike character: 8/B, 0/O, 1/I ... */
  return d.length===2&&d[1]===d[0]+1&&a[d[0]]===b[d[1]]&&a[d[1]]===b[d[0]]; }  /* two neighbouring characters swapped */
const fix=s=>s.replace(/O/g,'0').replace(/[IL]/g,'1').replace(/^0+/,'');
let cache={sig:'',res:[]};
window.dupScan=function(){
  const C=(window.DB&&DB.customers)||[]; const sig=C.map(c=>c.id+'~'+c.name+'~'+(c.machines||[]).map(m=>m.id+'~'+m.serial+'~'+m.status+'~'+(m.eqid||'')).join(',')+'~'+(c.contracts||[]).map(k=>k.ref||'').join(',')).join('|');
  if(sig===cache.sig) return cache.res; const out=[];
  const all=[]; C.forEach(c=>(c.machines||[]).forEach(m=>{ if(live(m)){ const k=NS(m.serial); if(k.length>=3) all.push({c,m,k}); } }));
  /* 1+2: exact Sr.# (two customers / same customer twice) */
  const by={}; all.forEach(x=>(by[x.k]=by[x.k]||[]).push(x));
  Object.keys(by).forEach(k=>{ const L=by[k]; if(L.length<2) return; const cross=new Set(L.map(x=>x.c.id)).size>1;
    out.push({key:(cross?'sr':'ss')+kid(k),kind:cross?'sr':'ss',sev:'high',title:cross?'Same Sr.# under '+new Set(L.map(x=>x.c.id)).size+' customers':'Same Sr.# entered twice',line:'Sr.# '+L[0].m.serial+' · '+(L[0].m.model||''),sub:'Active under: '+[...new Set(L.map(x=>x.c.name))].join(' & ')+' — billed twice',sig:String(L.length),recs:L,sr:k}); });
  /* 3: similar Sr.# (typo / O-0 / I-1 / leading zeros) */
  const keys=Object.keys(by).filter(k=>k.length>=6), seen=new Set();
  for(let i=0;i<keys.length;i++) for(let j=i+1;j<keys.length;j++){ const a=keys[i], b=keys[j]; if(Math.abs(a.length-b.length)>1) continue; if(!(lev1(a,b)||fix(a)===fix(b))) continue;
    const id=[a,b].sort().join('+'); if(seen.has(id)) continue; seen.add(id); const L=by[a].concat(by[b]);
    out.push({key:'sl'+kid(id),kind:'sl',sev:'warn',title:'Very similar Sr.# (typo?)',line:by[a][0].m.serial+'  ≈  '+by[b][0].m.serial,sub:'Under: '+[...new Set(L.map(x=>x.c.name))].join(' & ')+' — could be the same machine entered twice',sig:String(L.length),recs:L}); }
  /* 4: same Equipment ID on different machines */
  const eq={}; all.forEach(x=>{ const e=NS(x.m.eqid); if(e.length>=3) (eq[e]=eq[e]||[]).push(x); });
  Object.keys(eq).forEach(e=>{ const L=eq[e]; if(L.length<2||new Set(L.map(x=>x.k)).size<2) return; out.push({key:'eq'+kid(e),kind:'eq',sev:'warn',title:'Same Equipment ID on different machines',line:'Equipment ID '+L[0].m.eqid,sub:L.map(x=>x.c.name+' · '+x.m.serial).join(' | '),sig:String(L.length),recs:L}); });
  /* 5: same contract no. under different customers (any contract, with or without machines) */
  const cr={}; C.forEach(c=>(c.contracts||[]).forEach(k=>{ const r=NS(k.ref); if(r.length>=4&&/[0-9]/.test(r)) (cr[r]=cr[r]||[]).push({c,k}); }));
  const used=new Set();
  Object.keys(cr).forEach(r=>{ const L=cr[r]; const cs=new Set(L.map(x=>x.c.id)); if(cs.size>=2){ out.push({key:'cr'+kid(r),kind:'cr',sev:'high',title:'Same contract no. under '+cs.size+' customers',line:'Contract '+L[0].k.ref,sub:[...new Set(L.map(x=>x.c.name))].join(' & '),sig:String(L.length),ks:L}); L.forEach(x=>used.add(x.k.id)); } });
  /* 5b: contract entered twice inside one customer (same no., or same type + dates with one of them empty) */
  const mcount=(c,k)=>(c.machines||[]).filter(m=>m.contractId===k.id).length;
  C.forEach(c=>{ const K=c.contracts||[]; const grp={}; K.forEach(k=>{ const r=NS(k.ref); if(r.length>=4) (grp['r'+r]=grp['r'+r]||[]).push(k); });
    const sd={}; K.forEach(k=>{ if(k.start&&k.end){ const kk='d'+[k.type,k.start,k.end].join('|'); (sd[kk]=sd[kk]||[]).push(k); } });
    Object.keys(sd).forEach(kk=>{ const L=sd[kk]; if(L.length>1&&L.some(k=>!mcount(c,k))) grp[kk]=L; });
    Object.keys(grp).forEach(g=>{ const L=grp[g]; if(L.length<2) return; out.push({key:'dc'+kid(c.id+g),kind:'dc',sev:'high',title:'Contract entered twice',line:c.name+' · '+L.map(k=>kLabel(c,k)).join('  ↔  '),sub:L.map(k=>mcount(c,k)+' machine(s)').join(' · '),sig:L.map(k=>k.id+':'+mcount(c,k)).join(','),ks:L.map(k=>({c,k}))}); L.forEach(k=>used.add(k.id)); }); });
  /* 5c: empty contract next to contracts that do have machines */
  C.forEach(c=>{ const K=c.contracts||[]; if(!K.some(k=>mcount(c,k)>0)) return; K.forEach(k=>{ if(mcount(c,k)>0||used.has(k.id)||String(k.type||'').startsWith('Sale')&&false) return; out.push({key:'ec'+kid(c.id+k.id),kind:'ec',sev:'warn',title:'Contract with no machines',line:c.name+' · '+kLabel(c,k),sub:(k.type||'')+' · '+(k.start||'')+' → '+(k.end||'')+(k.minMonthly?' · minimum '+k.minMonthly:''),sig:k.id,ks:[{c,k}]}); }); });
  /* 6: customers that look like the same company */
  const T=C.map(c=>({c,t:nameTok(c.name)})).filter(x=>x.t.length>=2||(x.t.length===1&&x.t[0].length>=5));
  for(let i=0;i<T.length;i++) for(let j=i+1;j<T.length;j++){ const a=T[i], b=T[j], sa=new Set(a.t), sb=new Set(b.t); const sub=a.t.every(t=>sb.has(t)), sup=b.t.every(t=>sa.has(t)); if(!sub&&!sup) continue; const small=sub?a.t:b.t; if(small.length<2&&!(a.t.length===b.t.length)) continue;
    const same=a.t.length===b.t.length; out.push({key:'nm'+kid(a.c.id+b.c.id),kind:'nm',sev:same?'high':'warn',title:same?'Same customer entered twice':'Customers that look like the same company',line:a.c.name+'  ↔  '+b.c.name,sub:(a.c.machines||[]).length+' and '+(b.c.machines||[]).length+' machine(s)',sig:a.c.machines.length+'/'+b.c.machines.length,custs:[a.c,b.c]}); }
  out.sort((x,y)=>(x.sev==='high'?0:1)-(y.sev==='high'?0:1));
  cache={sig,res:out}; return out; };

/* ---------------- details window ---------------- */
function shell(){ let o=g('xaDup'); if(o) return o; o=document.createElement('div'); o.className='overlay'; o.id='xaDup'; document.body.appendChild(o); return o; }
function row(k,v){ return '<div style="display:flex;gap:8px;font-size:.82rem;margin:2px 0"><span style="min-width:112px;color:#6b7893">'+E(k)+'</span><span style="flex:1;word-break:break-word">'+v+'</span></div>'; }
function acc(c){ let bal=0, inv=0; try{ const a=acct(c.id); bal=a.balance; inv=a.debits.filter(d=>d.type==='Invoice').length; }catch(e){} return {bal,inv}; }
function custLines(c){ const a=acc(c), ps=(c.persons||[]).map(p=>E([p.name,p.position,p.phone||p.tel||p.mobile].filter(Boolean).join(' · '))).join('<br>')||'—';
  return row('Company',E(nz(c.company)))+row('TRN',E(nz(c.trn)))+row('Address',E(nz(c.addr)))+row('Email',E(nz(c.email)))+row('Phone',E(nz(c.phone)))+row('Contact',E(nz([c.contact,c.tel].filter(Boolean).join(' · ')||'')))+row('Contact persons',ps)
   +row('Account','Balance AED '+(typeof fmtM==='function'?fmtM(a.bal):a.bal)+' · '+a.inv+' invoice(s) · '+(c.machines||[]).filter(live).length+' active machine(s) · '+(c.contracts||[]).length+' contract(s)'); }
function machLines(c,m){ const ct=(typeof kOf==='function')?kOf(c,m):null, rds=(m.readings||[]).slice().sort((a,b)=>String(a.month).localeCompare(String(b.month))), last=rds[rds.length-1];
  const lt=last?E(last.month||'')+(last.date?' ('+E(fmtDMY(last.date))+')':'')+' — '+Object.keys(last).filter(q=>typeof last[q]==='number').slice(0,6).map(q=>E(q)+' '+(typeof fmtN==='function'?fmtN(last[q]):last[q])).join(' · '):'No readings';
  const kt=ct?E((typeof kLabel==='function'?kLabel(c,ct):ct.ref||'')+' · '+(ct.type||'')+' · '+(ct.start?fmtDMY(ct.start):'')+' → '+(ct.end?fmtDMY(ct.end):'no end date')):'—';
  return row('Machine',E(m.model||'—')+' · Sr.# <b>'+E(m.serial)+'</b>')+row('Equipment ID',E(nz(m.eqid)))+row('Department',E(nz(m.department)))+row('Status',E(m.status))+row('Start date',E(m.startDate?fmtDMY(m.startDate):'—'))+row('Contract',kt)+row('Readings',rds.length+' saved · last: '+lt); }
const BX='border:1px solid #d5d9e2;border-radius:10px;padding:12px;margin:10px 0';
function btns(k,c,m,other){ return '<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm ghost" onclick="dupOpenCust(\''+c.id+'\')">Open customer</button>'
  +(m?'<button class="btn sm ghost" onclick="dupRemoveRec(\''+k+'\',\''+c.id+'\',\''+m.id+'\')">Remove this machine record</button>':'')
  +(other?'<button class="btn sm" onclick="dupMerge(\''+c.id+'\',\''+other.id+'\')">Merge into “'+E(other.name)+'”</button>':'')
  +'<button class="btn sm" style="background:#dc2626;color:#fff" onclick="dupDelCust(\''+c.id+'\')">🗑 Delete this customer…</button></div>'; }
function kCard(key,x,all){ const c=x.c, k=x.k, ms=(c.machines||[]).filter(m=>m.contractId===k.id), others=all.filter(y=>y.c===c&&y.k!==k);
  const tgt=others.sort((a,b)=>((b.c.machines||[]).filter(m=>m.contractId===b.k.id).length)-((a.c.machines||[]).filter(m=>m.contractId===a.k.id).length))[0];
  return '<div style="'+BX+'"><div style="font-weight:700;font-size:1rem;margin-bottom:6px">👤 '+E(c.name)+'</div>'+row('Contract',E(kLabel(c,k)))+row('Type',E(k.type||'—'))+row('Period',E((k.start?fmtDMY(k.start):'—')+' → '+(k.end?fmtDMY(k.end):'—')))+row('Minimum monthly',E(k.minMonthly?'AED '+fmtM(k.minMonthly):'—'))+row('Machines',ms.length?ms.map(m=>E(m.model||'')+' · Sr.# <b>'+E(m.serial)+'</b> · '+E(m.department||'—')+' · '+E(m.status)).join('<br>'):'<i>none</i>')
   +'<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm ghost" onclick="dupOpenCust(\''+c.id+'\')">Open customer</button>'
   +(tgt?'<button class="btn sm" onclick="dupKMerge(\''+c.id+'\',\''+k.id+'\',\''+tgt.k.id+'\')">Merge into “'+E(kLabel(c,tgt.k))+'”</button>':'')
   +(ms.length?'':'<button class="btn sm" style="background:#dc2626;color:#fff" onclick="dupKDel(\''+c.id+'\',\''+k.id+'\')">🗑 Delete this empty contract…</button>')+'</div></div>'; }
window.dupView=function(k){ const I=(window.dupScan?dupScan():[]).find(d=>d.key===k), o=shell(); try{ closeBell(); }catch(e){}
  if(!I){ o.innerHTML='<div class="modal w"><h3>Duplicate check</h3><div class="empty">This is no longer flagged — it has been fixed.</div><div class="modal-actions"><button class="btn" onclick="closeModal(\'xaDup\')">Close</button></div></div>'; openModal('xaDup'); return; }
  let body='', hint='';
  if(I.ks){ hint=I.kind==='cr'?'The same contract number exists under different customers. If these customers are the same company, merge the customers first (see the customer warning), then merge the duplicate contract.':I.kind==='dc'?'The same contract is entered more than once for this customer. Keep the one that has the machines: merge the empty one into it (its minimum / escalation values are carried across), or delete the empty one.':'This contract has no machines while the customer has other contracts with machines. If it is not needed, delete it.';
    body=I.ks.map(x=>kCard(k,x,I.ks)).join(''); }
  else if(I.recs){ hint=I.kind==='sr'?'The same Sr.# is Active under more than one customer, so it would be billed twice.':I.kind==='ss'?'This Sr.# is entered more than once under the same customer.':I.kind==='sl'?'These Sr.# are almost identical (one character different, O/0 or I/1, or leading zero). Check the machine label to see if it is one machine entered twice.':'These machines share the same Equipment ID.';
    body=I.recs.map(x=>'<div style="'+BX+'"><div style="font-weight:700;font-size:1rem;margin-bottom:6px">👤 '+E(x.c.name)+'</div>'+custLines(x.c)+'<div style="border-top:1px dashed #d5d9e2;margin:8px 0"></div>'+machLines(x.c,x.m)+btns(k,x.c,x.m,null)+'</div>').join(''); }
  else { hint=I.kind==='nm'?'These two customers look like the same company. If so, merge one into the other — its machines, contracts, contact persons, invoices and payments move across — or delete the one you do not need.':'The same contract number is used under different customers.';
    body=I.custs.map((c,i)=>{ const other=I.kind==='nm'?I.custs[1-i]:null; return '<div style="'+BX+'"><div style="font-weight:700;font-size:1rem;margin-bottom:6px">👤 '+E(c.name)+'</div>'+custLines(c)
      +'<div style="border-top:1px dashed #d5d9e2;margin:8px 0"></div>'+(c.machines||[]).map(m=>'<div style="font-size:.8rem;margin:2px 0">• '+E(m.model||'')+' · Sr.# <b>'+E(m.serial)+'</b> · '+E(m.department||'—')+' · '+E(m.status)+'</div>').join('')+btns(k,c,null,other)+'</div>'; }).join(''); }
  o.innerHTML='<div class="modal w" style="max-width:780px;max-height:88vh;overflow:auto"><h3>⚠ '+E(I.title)+'</h3><div class="hint">'+E(hint)+' Deleted customers can be restored from Admin → Recycle bin; invoices and payments already recorded stay in history.</div>'+body
   +'<div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'xaDup\')">Close</button>'+(I.kind==='sr'?'<button class="btn" onclick="closeModal(\'xaDup\');XT.resolve(\''+I.sr+'\')">Resolve as transfer (company changed)</button>':'')+'</div></div>';
  openModal('xaDup'); };
window.dupOpenCust=function(cid){ closeModal('xaDup'); if(typeof openFromBell==='function') openFromBell(cid); };
function refresh(){ try{ renderAll(); }catch(e){} try{ fillCustSelects(); }catch(e){} try{ renderBell(); }catch(e){} }
function who(){ const m=window.curUser&&window.curUser(); return m?m.name:'Offline'; }
function nestTrash(kind,label,cid,sub,data){ DB.trash=DB.trash||[]; DB.audit=DB.audit||[]; const t=new Date().toISOString(), u=who(); DB.trash.push({id:uid(),t,u,coll:'nested',sub,cid,kind,label,data:JSON.parse(JSON.stringify(data))}); DB.audit.push({t,u,a:'deleted',k:kind,ref:label}); }
const _tr=window.trashRestore; window.trashRestore=function(id){ const e=(DB.trash||[]).find(x=>x.id===id); if(!e||e.coll!=='nested') return _tr&&_tr.apply(this,arguments);
  const c=custById(e.cid); if(!c){ toast('The customer of this record no longer exists — restore the customer first.',true); return; }
  if(e.sub==='contract'){ if((c.contracts||[]).some(k=>k.id===e.data.id)){ toast('This contract already exists.',true); return; } (c.contracts=c.contracts||[]).push(e.data); (e.moved||[]).forEach(()=>{}); }
  else if(e.sub==='machine'){ const m=(c.machines||[]).find(x=>x.id===e.data.id); if(!m){ toast('Machine record not found.',true); return; } Object.assign(m,e.data); }
  else if(e.sub==='kmerge'){ const to=(c.contracts||[]).find(k=>k.id===e.data.toId); if(!to){ toast('The contract it was merged into no longer exists.',true); return; } (c.contracts=c.contracts||[]).push(e.data.k); (e.data.mids||[]).forEach(mid=>{ const m=c.machines.find(x=>x.id===mid); if(m) m.contractId=e.data.k.id; }); if(e.data.minBefore!==undefined) to.minMonthly=e.data.minBefore; }
  DB.trash=DB.trash.filter(x=>x.id!==id); DB.audit.push({t:new Date().toISOString(),u:who(),a:'restored',k:e.kind,ref:e.label}); save(); refresh(); toast('Restored: '+e.label); };
window.dupKDel=function(cid,kid){ const c=custById(cid), k=c&&(c.contracts||[]).find(x=>x.id===kid); if(!k) return; if((c.machines||[]).some(m=>m.contractId===kid)){ toast('This contract still has machines — merge it instead.',true); return; }
  closeModal('xaDup'); askConfirm('Delete the empty contract "'+kLabel(c,k)+'" of '+c.name+'? It is recorded in Admin → Audit log and can be restored from Admin → Recycle bin.',()=>{ const lab=kLabel(c,k)+' · '+c.name; nestTrash('Contract',lab,cid,'contract',k); c.contracts=c.contracts.filter(x=>x.id!==kid); if(!c.contracts.length&&typeof kBase==='function'){ const k0=Object.assign(kBase(),{id:(typeof newKid==='function'?newKid():uid())}); c.contracts=[k0]; } save(); refresh(); toast('Contract deleted. It can be restored from Admin → Recycle bin.'); },'Yes, delete'); };
window.dupKMerge=function(cid,fromId,toId){ const c=custById(cid), f=c&&c.contracts.find(x=>x.id===fromId), t=c&&c.contracts.find(x=>x.id===toId); if(!f||!t||f===t) return; closeModal('xaDup');
  const ms=c.machines.filter(m=>m.contractId===f.id); askConfirm('Merge contract "'+kLabel(c,f)+'" into "'+kLabel(c,t)+'"? '+ms.length+' machine(s) move across'+(f.minMonthly&&!t.minMonthly?' and the minimum monthly AED '+fmtM(f.minMonthly)+' is copied':'')+'. The merged contract is recorded in Admin → Audit log and can be restored from the Recycle bin.',()=>{
    const minBefore=t.minMonthly; ms.forEach(m=>{ m.contractId=t.id; }); if(!t.minMonthly&&f.minMonthly) t.minMonthly=f.minMonthly; ['escPct','minQty','warrantyYears'].forEach(q=>{ if(!t[q]&&f[q]) t[q]=f[q]; }); if((f.files||[]).length){ t.files=(t.files||[]).concat(f.files); }
    nestTrash('Contract (merged)',kLabel(c,f)+' → '+kLabel(c,t)+' · '+c.name,cid,'kmerge',{k:f,toId:t.id,mids:ms.map(m=>m.id),minBefore}); c.contracts=c.contracts.filter(x=>x.id!==f.id); save(); refresh(); toast('Contracts merged.'); },'Yes, merge'); };
window.dupRemoveRec=function(k,cid,mid){ const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid); if(!m) return;
  askConfirm('Remove Sr.# '+m.serial+' from '+c.name+'? The record is kept in history as "Removed" and stops being billed there. It is logged in Admin → Audit log and can be restored from the Recycle bin.',()=>{ nestTrash('Machine record',m.serial+' · '+(m.model||'')+' · '+c.name,cid,'machine',{id:m.id,status:m.status,endDate:m.endDate||'',events:(m.events||[]).slice()}); m.status='Removed'; m.endDate=todayISO(); m.events=m.events||[]; m.events.push({id:uid(),date:todayISO(),type:'Move',note:'Duplicate record removed (duplicate check)',qty:0}); save(); refresh(); toast('Record removed.'); dupView(k); },'Yes, remove'); };
window.dupDelCust=function(cid){ const c=custById(cid); if(!c) return; closeModal('xaDup');
  askConfirm('Delete customer "'+c.name+'" with all '+c.machines.length+' machine(s) and readings? Invoices and payments already recorded stay in history. You can restore the customer from Admin → Recycle bin.',()=>{ DB.customers=DB.customers.filter(x=>x.id!==cid); if(typeof activeCustomerId!=='undefined'&&activeCustomerId===cid) activeCustomerId=null; save(); refresh(); toast('Customer deleted.'); },'Yes, delete customer'); };
window.dupMerge=function(fromId,toId){ const f=custById(fromId), t=custById(toId); if(!f||!t||f===t) return; closeModal('xaDup');
  const n=k=>(DB[k]||[]).filter(o=>o&&o.cid===f.id).length;
  askConfirm('Merge "'+f.name+'" into "'+t.name+'"? '+f.machines.length+' machine(s), '+(f.contracts||[]).length+' contract(s), '+n('invoices')+' invoice(s), '+n('ledger')+' payment/ledger entr(ies), '+n('sales')+' sales record(s) and the contact persons move to "'+t.name+'", then "'+f.name+'" is removed (restorable from Admin → Recycle bin). Machines with the same Sr.# will then show up as duplicates to clean.',()=>{
    t.contracts=t.contracts||[]; (f.contracts||[]).forEach(k=>{ if(!t.contracts.some(x=>x.id===k.id)) t.contracts.push(k); });
    t.machines=t.machines||[]; (f.machines||[]).forEach(m=>t.machines.push(m));
    t.persons=t.persons||[]; (f.persons||[]).forEach(p=>{ if(!t.persons.some(q=>q.name===p.name&&String(q.phone||'')===String(p.phone||''))) t.persons.push(p); });
    ['company','trn','addr','email','phone','contact','tel','group','shipAddr'].forEach(k=>{ if(!t[k]&&f[k]) t[k]=f[k]; });
    Object.keys(DB).forEach(key=>{ const a=DB[key]; if(!Array.isArray(a)||key==='customers'||key==='trash'||key==='audit') return; a.forEach(o=>{ if(o&&typeof o==='object'&&o.cid===f.id) o.cid=t.id; }); });
    DB.customers=DB.customers.filter(x=>x.id!==f.id); if(typeof activeCustomerId!=='undefined'&&activeCustomerId===f.id) activeCustomerId=t.id;
    try{ normalizeData(); }catch(e){} save(); refresh(); toast('Merged "'+f.name+'" into "'+t.name+'".'); },'Yes, merge'); };
})();
