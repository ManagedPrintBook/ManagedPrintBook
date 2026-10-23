/* ===== Add-on 14: same Sr.# under two customers — full details + remove record / delete customer (opened from the notification bell) ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const nz=v=>(v===undefined||v===null||v==='')?'—':v;
const E=s=>(typeof esc==='function'?esc(String(s===undefined||s===null?'':s)):String(s));
function shell(){ let o=g('xaDup'); if(o) return o; o=document.createElement('div'); o.className='overlay'; o.id='xaDup'; document.body.appendChild(o); return o; }
function row(k,v){ return '<div style="display:flex;gap:8px;font-size:.82rem;margin:2px 0"><span style="min-width:112px;color:#6b7893">'+E(k)+'</span><span style="flex:1;word-break:break-word">'+v+'</span></div>'; }
function card(x,k){ const c=x.c, m=x.m; let bal=0, inv=0, ac=null; try{ ac=acct(c.id); bal=ac.balance; inv=ac.debits.filter(d=>d.type==='Invoice').length; }catch(e){}
  const act=c.machines.filter(y=>y.status==='Active').length, ct=(typeof kOf==='function')?kOf(c,m):null;
  const rds=(m.readings||[]).slice().sort((a,b)=>String(a.month).localeCompare(String(b.month))), last=rds[rds.length-1];
  const lastTxt=last?E(last.month||'')+(last.date?' ('+E(typeof fmtDMY==='function'?fmtDMY(last.date):last.date)+')':'')+' — '+Object.keys(last).filter(q=>typeof last[q]==='number'&&q!=='ts').slice(0,6).map(q=>E(q)+' '+(typeof fmtN==='function'?fmtN(last[q]):last[q])).join(' · '):'No readings';
  const ps=(c.persons||[]).map(p=>E([p.name,p.position,p.phone||p.tel||p.mobile].filter(Boolean).join(' · '))).join('<br>')||'—';
  const kt=ct?E((typeof kLabel==='function'?kLabel(c,ct):ct.ref||'')+' · '+(ct.type||'')+' · '+(ct.start?fmtDMY(ct.start):'')+' → '+(ct.end?fmtDMY(ct.end):'no end date')):'—';
  return '<div class="xt-block" style="border:1px solid #d5d9e2;border-radius:10px;padding:12px;margin:10px 0">'
   +'<div style="font-weight:700;font-size:1rem;margin-bottom:6px">👤 '+E(c.name)+'</div>'
   +row('Company',E(nz(c.company)))+row('TRN',E(nz(c.trn)))+row('Address',E(nz(c.addr)))+row('Email',E(nz(c.email)))+row('Phone',E(nz(c.phone)))+row('Contact',E(nz([c.contact,c.tel].filter(Boolean).join(' · ')||'')))+row('Contact persons',ps)
   +row('Account','Balance AED '+(typeof fmtM==='function'?fmtM(bal):bal)+' · '+inv+' invoice(s) · '+act+' active machine(s) · '+(c.contracts||[]).length+' contract(s)')
   +'<div style="border-top:1px dashed #d5d9e2;margin:8px 0"></div>'
   +row('Machine',E(m.model||'—')+' · Sr.# <b>'+E(m.serial)+'</b>')+row('Department',E(nz(m.department)))+row('Status',E(m.status))+row('Start date',E(m.startDate?fmtDMY(m.startDate):'—'))+row('Contract',kt)+row('Readings',rds.length+' saved · last: '+lastTxt)
   +'<div class="actions" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm ghost" onclick="dupOpenCust(\''+c.id+'\')">Open customer</button>'
   +'<button class="btn sm ghost" onclick="dupRemoveRec(\''+k+'\',\''+c.id+'\',\''+m.id+'\')">Remove this machine record</button>'
   +'<button class="btn sm" style="background:#dc2626;color:#fff" onclick="dupDelCust(\''+c.id+'\')">🗑 Delete this customer…</button></div></div>'; }
window.dupView=function(k){ const D=(window.XA&&XA.findDups)?XA.findDups().find(d=>d.k===k):null; const o=shell();
  if(!D||!D.cross){ o.innerHTML='<div class="modal w"><h3>Sr.# check</h3><div class="empty">This Sr.# is no longer active under two customers.</div><div class="modal-actions"><button class="btn" onclick="closeModal(\'xaDup\')">Close</button></div></div>'; openModal('xaDup'); try{ closeBell(); }catch(e){} return; }
  o.innerHTML='<div class="modal w" style="max-width:760px;max-height:88vh;overflow:auto"><h3>⚠ Sr.# '+E(D.list[0].m.serial)+' is Active under '+D.list.length+' customers</h3>'
   +'<div class="hint">It would be billed twice. Review both customers below, then choose: it moved from one company to the other (resolve as transfer), the record is wrong (remove it), or a customer is not needed at all (delete it). Deleted customers can be restored from Admin → Recycle bin; invoices and payments already recorded stay in history.</div>'
   +D.list.map(x=>card(x,k)).join('')
   +'<div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'xaDup\')">Close</button><button class="btn" onclick="closeModal(\'xaDup\');XT.resolve(\''+k+'\')">Resolve as transfer (company changed)</button></div></div>';
  try{ closeBell(); }catch(e){} openModal('xaDup'); };
window.dupOpenCust=function(cid){ closeModal('xaDup'); if(typeof openFromBell==='function') openFromBell(cid); };
window.dupRemoveRec=function(k,cid,mid){ const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid); if(!m) return;
  askConfirm('Remove Sr.# '+m.serial+' from '+c.name+'? The record is kept in history as "Removed" and it stops being billed there.',()=>{ m.status='Removed'; m.endDate=todayISO(); m.events=m.events||[]; m.events.push({id:uid(),date:todayISO(),type:'Move',note:'Duplicate record removed (Sr.# notification)',qty:0}); save(); try{ renderAll(); renderBell(); }catch(e){} toast('Record removed.'); dupView(k); },'Yes, remove'); };
window.dupDelCust=function(cid){ const c=custById(cid); if(!c) return; const n=c.machines.length; closeModal('xaDup');
  askConfirm('Delete customer "'+c.name+'" with all '+n+' machine(s) and readings? Invoices and payments already recorded stay in history. You can restore it from Admin → Recycle bin.',()=>{ DB.customers=DB.customers.filter(x=>x.id!==cid); if(typeof activeCustomerId!=='undefined'&&activeCustomerId===cid) activeCustomerId=null; save(); try{ renderAll(); fillCustSelects(); renderBell(); }catch(e){} toast('Customer deleted.'); },'Yes, delete customer'); };
})();
