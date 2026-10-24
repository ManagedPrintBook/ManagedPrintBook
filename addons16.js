/* ===== Add-on 16: Cancel / Delete a contract (✕ in the contracts list) · Generate Bill dates follow the contract's own cycle · warning dialog ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const E=s=>(typeof esc==='function'?esc(String(s===undefined||s===null?'':s)):String(s));
const num=v=>parseFloat(v)||0;
const role=()=>{ const m=window.curUser&&window.curUser(); return m?m.role:null; };
const who=()=>{ const m=window.curUser&&window.curUser(); return m?m.name:'Offline'; };
const addM=(s,n)=>{ const [y,m,d]=s.split('-').map(Number); const t=(y*12+(m-1))+n, ny=Math.floor(t/12), nm=t%12+1, dim=new Date(ny,nm,0).getDate(); return ny+'-'+String(nm).padStart(2,'0')+'-'+String(Math.min(d,dim)).padStart(2,'0'); };
const addD=(s,n)=>{ const d=new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const CYC={monthly:1,quarterly:3,'half-yearly':6,halfyearly:6,'semi-annual':6,yearly:12,annual:12};
const stepWord=n=>n===1?'Monthly':n===3?'Quarterly':n===6?'Half-yearly':n===12?'Yearly':n+'-monthly';

/* ---------- warning dialog ---------- */
window.xaWarn=function(title,msg){ let o=g('xaWarn'); if(!o){ o=document.createElement('div'); o.className='overlay'; o.id='xaWarn'; document.body.appendChild(o); }
  o.innerHTML='<div class="modal" style="max-width:460px"><h3 style="color:#b45309">⚠ '+E(title)+'</h3><p style="line-height:1.5">'+E(msg)+'</p><div class="modal-actions"><button class="btn" onclick="closeModal(\'xaWarn\')">OK, understood</button></div></div>'; openModal('xaWarn'); };

/* ---------- Cancel / Delete contract ---------- */
function refresh(){ try{ renderAll(); }catch(e){} try{ ctRender(); }catch(e){} try{ fillCustSelects(); }catch(e){} try{ renderBell(); }catch(e){} try{ XA.refresh(); }catch(e){} }
function audit(a,kind,ref){ DB.audit=DB.audit||[]; DB.audit.push({t:new Date().toISOString(),u:who(),a,k:kind,ref}); }
window.ctDel=function(cid,kid){ if(role()==='sales'||role()==='viewer'){ toast('You do not have permission to cancel or delete contracts.',true); return; }
  const c=custById(cid), k=c&&c.contracts.find(x=>x.id===kid); if(!k) return; const ms=c.machines.filter(m=>m.contractId===kid), act=ms.filter(m=>m.status==='Active');
  let o=g('xaKd'); if(!o){ o=document.createElement('div'); o.className='overlay'; o.id='xaKd'; document.body.appendChild(o); }
  const lab=kLabel(c,k), box='border:1px solid #d5d9e2;border-radius:10px;padding:12px;margin:10px 0';
  o.innerHTML='<div class="modal" style="max-width:560px"><h3>'+E(lab)+'</h3><div class="hint" style="margin:0 0 8px">'+E(c.name)+' · '+E(k.type||'')+' · '+ms.length+' machine(s), '+act.length+' active</div>'
   +(k.cancelled?'<div style="'+box+'"><b>This contract is cancelled</b> ('+E(k.cancelledOn||'')+(k.cancelReason?' · '+E(k.cancelReason):'')+').<div class="hint">Reactivate it if it was cancelled by mistake'+((k.cancelMachines||[]).length?' — its '+k.cancelMachines.length+' machine(s) become active again':'')+'.</div><button class="btn" onclick="ctReact(\''+cid+'\',\''+kid+'\')">↺ Reactivate contract</button></div>'
    :'<div style="'+box+'"><b>Cancel this contract</b><div class="hint">Keeps the contract and its history, shows it as <b>CANCELLED</b> and stops all reading reminders and renewal notifications. Use this when the customer has ended the contract.</div>'
     +'<div class="field"><label>Reason (optional)</label><input id="xk_why" placeholder="e.g. Customer closed down / machines returned"></div>'
     +(act.length?'<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="xk_rm" checked style="width:auto"> Also mark its '+act.length+' active machine(s) as Removed (stops billing)</label>':'')
     +'<button class="btn" onclick="ctCancel(\''+cid+'\',\''+kid+'\')">Cancel contract</button></div>')
   +'<div style="'+box+';border-color:#f3b4b4"><b style="color:#b91c1c">Delete this contract</b><div class="hint">For a contract entered by mistake or twice. '+(ms.length?'Its '+ms.length+' machine(s) with their readings are deleted too. ':'')+'It is recorded in Admin → Audit log and can be restored from Admin → Recycle bin.</div><button class="btn" style="background:#dc2626;color:#fff" onclick="ctRemove(\''+cid+'\',\''+kid+'\')">🗑 Delete contract'+(ms.length?' and '+ms.length+' machine(s)':'')+'</button></div>'
   +'<div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'xaKd\')">Close</button></div></div>'; openModal('xaKd'); };
window.ctCancel=function(cid,kid){ const c=custById(cid), k=c&&c.contracts.find(x=>x.id===kid); if(!k) return; const why=((g('xk_why')||{}).value||'').trim(), rm=!!(g('xk_rm')||{}).checked, t=todayISO(); closeModal('xaKd');
  k.cancelled=true; k.cancelledOn=t; k.cancelReason=why; k.cancelMachines=[];
  if(rm) c.machines.filter(m=>m.contractId===kid&&m.status==='Active').forEach(m=>{ k.cancelMachines.push({id:m.id,status:m.status,endDate:m.endDate||''}); m.status='Removed'; m.endDate=t; m.events=m.events||[]; m.events.push({id:uid(),date:t,type:'Move',note:'Contract cancelled'+(why?' — '+why:''),qty:0}); });
  audit('cancelled','Contract',kLabel(c,k)+' · '+c.name+(why?' · '+why:'')); save(); refresh(); toast('Contract cancelled. Use ✕ → Reactivate if this was a mistake.'); };
window.ctReact=function(cid,kid){ const c=custById(cid), k=c&&c.contracts.find(x=>x.id===kid); if(!k) return; closeModal('xaKd');
  (k.cancelMachines||[]).forEach(r=>{ const m=c.machines.find(x=>x.id===r.id); if(m){ m.status=r.status||'Active'; if(r.endDate) m.endDate=r.endDate; else delete m.endDate; m.events=m.events||[]; m.events.push({id:uid(),date:todayISO(),type:'Move',note:'Contract reactivated',qty:0}); } });
  delete k.cancelled; delete k.cancelledOn; delete k.cancelReason; delete k.cancelMachines; audit('reactivated','Contract',kLabel(c,k)+' · '+c.name); save(); refresh(); toast('Contract reactivated.'); };
window.ctRemove=function(cid,kid){ const c=custById(cid), k=c&&c.contracts.find(x=>x.id===kid); if(!k) return; const ms=c.machines.filter(m=>m.contractId===kid); closeModal('xaKd');
  askConfirm('Delete contract "'+kLabel(c,k)+'" of '+c.name+(ms.length?' with its '+ms.length+' machine(s) and all their readings':'')+'? You can restore it from Admin → Recycle bin.',()=>{
    if(window.nestTrashX) nestTrashX('Contract',kLabel(c,k)+' · '+c.name,cid,'kdelfull',{k:JSON.parse(JSON.stringify(k)),machines:JSON.parse(JSON.stringify(ms))});
    c.machines=c.machines.filter(m=>m.contractId!==kid); c.contracts=c.contracts.filter(x=>x.id!==kid);
    if(!c.contracts.length&&typeof kBase==='function'){ const k0=Object.assign(kBase(),{id:(typeof newKid==='function'?newKid():uid())}); c.contracts=[k0]; }
    save(); refresh(); toast('Contract deleted. It can be restored from Admin → Recycle bin.'); },'Yes, delete'); };

/* ---------- Generate Bill: lease / excess period follows the TICKED contract(s), their start date and billing cycle ---------- */
const stepOf=(c,m)=>{ const own=num(m.monthlyLease)>0||m.billM||m.billQ||m.billY; const cyc=own?m.leaseCycle:(num(c.monthlyLease)>0?c.leaseCycle:m.leaseCycle); return CYC[String(cyc||'').toLowerCase()]||1; };
const exCycOf=(c,m)=>{ const cyc=(num(m.rateMono)+num(m.rateColor)+num(m.ratePlot)>0)?m.excessCycle:(c.excessCycle||m.excessCycle); return CYC[String(cyc||'').toLowerCase()]||CYC[String(m.leaseCycle||'').toLowerCase()]||3; };
const hasEx=(c,m,k)=>{ if(k&&k.unlimited) return false; return [m.rateMono,m.rateColor,m.ratePlot].some(v=>num(v)>0)||[c.rateMono,c.rateColor,c.ratePlot].some(v=>num(v)>0); };
window.__lease=null;
function leaseDefault(c,kset){ const t=todayISO(), hi=addD(t,31); const inv=(DB.invoices||[]).filter(v=>v.cid===c.id&&v.from&&v.to&&!v.cancelled&&!v.void&&v.status!=='cancelled'), skips=DB.billSkips||{}; const covered=(s,e)=>inv.some(v=>v.from<=s&&v.to>=s)||!!skips[c.id+'|'+s+'|'+e]; const picks=[];
  (c.machines||[]).forEach(m=>{ if(m.status!=='Active') return; const k=kOf(c,m); if(!k||k.cancelled) return; if(kset&&!kset.has(k.id)) return; if(!(/lease/i.test(k.type||'')||num(m.monthlyLease)>0||m.billM||m.billQ||m.billY||num(c.monthlyLease)>0)) return;
    const a=m.startDate||k.start; if(!a) return; const st=stepOf(c,m); let pick=null; const miss=[];
    for(let i=0;i<500;i++){ const s=addM(a,i*st); const e=addD(addM(a,(i+1)*st),-1); if(s>hi){ if(!pick) pick={from:s,to:e}; break; } if(!covered(s,e)){ if(!pick) pick={from:s,to:e}; else if(s<=t) miss.push({from:s,to:e}); } }
    if(!pick) return; const ex=hasEx(c,m,k); let exr=null; if(ex){ const es=exCycOf(c,m), P=addM(pick.from,-es); if(P>=a) exr={ef:P,et:addD(pick.from,-1)}; }
    picks.push({from:pick.from,to:pick.to,step:st,m,k,ex,exr,miss,start:a}); });
  if(!picks.length) return null; const cnt={}; picks.forEach(p=>{ cnt[p.from]=(cnt[p.from]||0)+1; }); const top=picks.slice().sort((x,y)=>(cnt[y.from]-cnt[x.from])||x.from.localeCompare(y.from))[0], grp=picks.filter(p=>p.from===top.from);
  const exP=grp.find(p=>p.ex&&p.exr); return {from:top.from,to:top.to,step:top.step,m:top.m,k:top.k,exr:exP?exP.exr:null,unl:!grp.some(p=>p.ex),miss:top.miss,refs:[...new Set(grp.map(p=>kLabel(c,p.k)))],start:top.start}; }
function applyLease(c,b,d){ d=d||{}; if(!b){ window.__lease=null; return d; } d.lf=b.from; d.lt=b.to; d.ef=b.exr?b.exr.ef:''; d.et=b.exr?b.exr.et:''; window.__lease={step:b.step,ref:b.refs.join(', '),start:b.start,miss:b.miss,unl:b.unl,hasExr:!!b.exr}; return d; }
const _dr=window.defRanges;
if(typeof _dr==='function') window.defRanges=function(c){ const d=_dr.apply(this,arguments); window.__lease=null; try{ applyLease(c,leaseDefault(c,null),d); }catch(e){} return d; };
function noteHTML(L){ return '📅 Period follows the contract <b>'+E(L.ref)+'</b> · start date <b>'+E(typeof fmtDMY==='function'?fmtDMY(L.start):L.start)+'</b> · <b>'+stepWord(L.step)+'</b> billing <button type="button" class="btn sm ghost" onclick="bkShift(-1)">◀ Previous cycle</button><button type="button" class="btn sm ghost" onclick="bkShift(1)">Next cycle ▶</button><button type="button" class="btn sm ghost" onclick="bkNow()">Current cycle</button>'
   +((L.miss||[]).length?'<div style="flex-basis:100%;color:#b45309">⚠ '+L.miss.length+' later cycle(s) up to today also have no invoice: '+L.miss.slice(0,3).map(x=>E(fmtDMY(x.from))+' → '+E(fmtDMY(x.to))).join(', ')+(L.miss.length>3?' …':'')+' — use <b>Next cycle ▶</b> after this one, or <b>Current cycle</b> if the earlier ones were billed outside the app.</div>':'')
   +(L.unl?'<div style="flex-basis:100%;color:#0d6e4b">♾ Unlimited copies — no excess billing for the ticked contract(s), so the Excess period is left empty.</div>':''); }
function bkNote(){ const L=window.__lease, lf=g('r_lf'), old=g('bkCyc'); if(old) old.remove(); if(!L||!lf) return; const row=lf.closest('.grid2'); if(!row) return;
  row.insertAdjacentHTML('beforebegin','<div id="bkCyc" class="hint" style="margin:0 0 8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+noteHTML(L)+'</div>'); }
function tickedSet(){ const bx=document.querySelectorAll('#detailArea .bk_on'); return bx.length?new Set([...bx].filter(x=>x.checked).map(x=>x.value)):null; }
window.bkApply=function(){ const c=custById(typeof billPage!=='undefined'?billPage:null); if(!c) return; const ks=tickedSet(); if(ks&&!ks.size){ return; } const b=leaseDefault(c,ks), d=applyLease(c,b,{}); if(!b){ bkNote(); return; } ['r_lf','r_lt','r_ef','r_et'].forEach((id,i)=>{ const el=g(id); if(el) el.value=[d.lf,d.lt,d.ef,d.et][i]||''; }); bkNote(); };
window.bkShift=function(dir){ const L=window.__lease, lf=g('r_lf'), lt=g('r_lt'); if(!L||!lf||!lf.value) return; const f=addM(lf.value,dir*L.step); lf.value=f; lt.value=addD(addM(f,L.step),-1); const ef=g('r_ef'), et=g('r_et'); if(ef&&et&&L.hasExr){ ef.value=addM(f,-L.step); et.value=addD(f,-1); } };
window.bkNow=function(){ const L=window.__lease, lf=g('r_lf'), lt=g('r_lt'); if(!L||!lf||!lt) return; const a=L.start, t=todayISO(); let s=a; for(let i=0;i<600;i++){ const n=addM(a,i*L.step); if(n>t) break; s=n; } lf.value=s; lt.value=addD(addM(s,L.step),-1); const ef=g('r_ef'), et=g('r_et'); if(ef&&et&&L.hasExr){ const P=addM(s,-L.step); ef.value=P>=a?P:''; et.value=P>=a?addD(s,-1):''; } };
document.addEventListener('change',e=>{ const x=e.target; if(!x) return; if(x.classList&&x.classList.contains('bk_on')){ bkApply(); return; } const L=window.__lease; if(L&&x.id==='r_lf'&&x.value){ const lt=g('r_lt'); if(lt) lt.value=addD(addM(x.value,L.step),-1); } });
const _rd=window.renderDetail; if(typeof _rd==='function') window.renderDetail=function(){ const r=_rd.apply(this,arguments); try{ bkNote(); }catch(e){} return r; };
})();
