/* ===== Add-on 11: Transfer machines / contracts to another company (e.g. RAK Properties -> One Facilities) ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id), P2=n=>String(n).padStart(2,'0');
const XT=window.XT={};
const S={mode:'single',cid:'',mids:new Set(),toId:'',nc:{name:'',trn:'',addr:'',email:'',phone:'',contact:'',tel:''},ok:false,date:'',carry:true,pstart:'',cm:'',cc:''};
const MS=[['ms','me'],['ms3','me3'],['cs','ce'],['cs3','ce3'],['pls','ple'],['p0s','p0e'],['p1s','p1e'],['p2s','p2e']];
const lastRd=m=>m.readings.slice().sort((a,b)=>a.month.localeCompare(b.month)).pop();
const fromC=()=>custById(S.cid);
const toC=()=>S.toId==='__new'?null:custById(S.toId);
const activeOf=c=>(c?c.machines:[]).filter(m=>m.status==='Active');
const escRe=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

/* ---------- styles ---------- */
if(!g('xtCss')){ const st=document.createElement('style'); st.id='xtCss'; st.textContent=
'.xt-sec{border:1px solid #e1e5ee;border-radius:8px;padding:10px 12px;margin:10px 0;background:#fff}.xt-sec h4{margin:0 0 8px;font-size:.9rem}.xt-mach label{display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #eef0f5;font-size:.85rem}.xt-ver{border:2px solid #f59e0b;background:#fffbeb;border-radius:8px;padding:10px 12px;margin:10px 0}.xt-ver.done{border-color:#16a34a;background:#f0fdf4}.xt-kv{display:grid;grid-template-columns:140px 1fr;gap:3px 10px;font-size:.85rem}.xt-kv div:nth-child(odd){color:#52607d}.xt-tl{border-left:3px solid #cbd5e1;margin:6px 0 10px 6px;padding-left:12px;font-size:.84rem}.xt-tl div{margin:4px 0}.xt-prev{opacity:.62;filter:grayscale(.35)}.xt-warn{border-left:4px solid #d97706;background:#fffbeb;padding:8px 10px;margin:8px 0;font-size:.84rem;border-radius:4px}.xt-block{border-left-color:#b3261e;background:#fef2f2}';
document.head.appendChild(st); }

/* ---------- modal shell ---------- */
function shell(){ if(g('xtOverlay')) return; const d=document.createElement('div'); d.className='overlay'; d.id='xtOverlay';
  d.innerHTML='<div class="modal w" style="max-width:880px;width:96vw"><h3>⇄ Transfer machines to another company</h3>'
  +'<div class="hint">Moves the machine(s) and contract to the new company from an effective date. The old company keeps its history and old invoices; it is not billed for the machine after that date.</div>'
  +'<div class="xt-sec"><div style="display:flex;gap:18px;flex-wrap:wrap"><label class="tk"><input type="radio" name="xt_mode" value="single" onchange="XT.mode(this.value)"> Single machine</label><label class="tk"><input type="radio" name="xt_mode" value="bulk" onchange="XT.mode(this.value)"> Bulk transfer (several machines)</label></div>'
  +'<div class="grid2"><div class="field"><label>From company</label><select id="xt_from" onchange="XT.from(this.value)"></select></div><div class="field"><label>Effective date (new company from this date)</label><input id="xt_date" type="date" onchange="XT.date(this.value)"></div></div>'
  +'<div id="xt_mach" class="xt-mach"></div></div>'
  +'<div class="xt-sec"><h4>New company</h4><div class="field"><label>To company</label><select id="xt_to" onchange="XT.to(this.value)"></select></div><div id="xt_new"></div><div id="xt_ver"></div></div>'
  +'<div class="xt-sec"><h4>Free allowance &amp; counters</h4><label class="tk"><input type="checkbox" id="xt_carry" onchange="XT.carry()"> Carry over the free allowance already used in the current excess period (tick = carry over, untick = restart with a full allowance on the new contract)</label>'
  +'<div class="grid2" id="xt_ps_row"><div class="field"><label>Current excess period started on</label><input id="xt_ps" type="date" onchange="XT.ps(this.value)"></div><div></div></div>'
  +'<div id="xt_close" class="grid2"><div class="field"><label>Closing mono counter at transfer (optional)</label><input id="xt_cm" type="number" oninput="XT.cnt()"></div><div class="field"><label>Closing colour counter at transfer (optional)</label><input id="xt_cc" type="number" oninput="XT.cnt()"></div></div></div>'
  +'<div class="xt-sec"><h4>Preview</h4><div id="xt_prev"></div></div>'
  +'<div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'xtOverlay\')">Cancel</button><button class="btn" onclick="XT.go()">Confirm transfer</button></div></div>';
  document.body.appendChild(d); }

/* ---------- open / state ---------- */
XT.open=function(cid,mid){ shell(); const c=custById(cid); if(!c) return;
  S.cid=cid; S.mode=mid?'single':'bulk'; S.mids=new Set(mid?[mid]:activeOf(c).map(m=>m.id)); if(S.mode==='single'&&!mid) S.mids=new Set(activeOf(c).slice(0,1).map(m=>m.id));
  S.toId=''; S.nc={name:'',trn:'',addr:'',email:'',phone:'',contact:'',tel:''}; S.ok=false; S.carry=true; S.cm=''; S.cc='';
  S.date=/rak/i.test(c.name)?'2026-07-01':todayISO(); S.pstart=defStart(S.date,mid?c.machines.find(m=>m.id===mid):activeOf(c)[0]);
  g('xt_from').innerHTML=DB.customers.map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join(''); g('xt_from').value=cid;
  g('xt_date').value=S.date; g('xt_ps').value=S.pstart; g('xt_carry').checked=true; g('xt_cm').value=''; g('xt_cc').value='';
  document.querySelectorAll('input[name=xt_mode]').forEach(r=>{ r.checked=r.value===S.mode; });
  fillTo(); draw(); openModal('xtOverlay'); };
function defStart(date,m){ const n=m?(({Monthly:1,Quarterly:3,Yearly:12})[m.excessCycle]||3):3, mo=+date.slice(5,7), s=n>=12?1:mo-((mo-1)%n); return date.slice(0,4)+'-'+P2(s)+'-01'; }
function fillTo(){ const f=S.cid; g('xt_to').innerHTML='<option value="">— choose company —</option>'+DB.customers.filter(x=>x.id!==f).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join('')+'<option value="__new">＋ New company…</option>'; g('xt_to').value=S.toId; }
XT.mode=v=>{ S.mode=v; const c=fromC(); if(v==='single'){ const f=[...S.mids][0]||(activeOf(c)[0]||{}).id; S.mids=new Set(f?[f]:[]); } else if(!S.mids.size||S.mids.size<2) S.mids=new Set(activeOf(c).map(m=>m.id)); draw(); };
XT.from=v=>{ S.cid=v; const c=fromC(); S.mids=new Set(S.mode==='single'?activeOf(c).slice(0,1).map(m=>m.id):activeOf(c).map(m=>m.id)); if(S.toId===v) S.toId=''; fillTo(); draw(); };
XT.date=v=>{ S.date=v; const m=fromC().machines.find(x=>S.mids.has(x.id)); S.pstart=defStart(v||todayISO(),m); g('xt_ps').value=S.pstart; draw(); };
XT.ps=v=>{ S.pstart=v; draw(); };
XT.carry=()=>{ S.carry=g('xt_carry').checked; draw(); };
XT.cnt=()=>{ S.cm=g('xt_cm').value; S.cc=g('xt_cc').value; draw(); };
XT.pick=(id,on)=>{ if(S.mode==='single'){ S.mids=new Set([id]); } else { on?S.mids.add(id):S.mids.delete(id); } draw(); };
XT.all=on=>{ S.mids=on?new Set(activeOf(fromC()).map(m=>m.id)):new Set(); draw(); };
XT.to=v=>{ S.toId=v; S.ok=false; draw(); };
XT.nf=(k,v)=>{ S.nc[k]=v; const d=g('xt_ver'); if(d) verCard(); };
XT.ok=v=>{ S.ok=v; verCard(); };

/* ---------- drawing ---------- */
function draw(){ const c=fromC(); if(!c) return; const am=activeOf(c), single=S.mode==='single';
  g('xt_mach').innerHTML=(am.length?(single?'':'<div style="margin-bottom:4px"><a style="cursor:pointer;color:#1d4ed8" onclick="XT.all(true)">Select all</a> · <a style="cursor:pointer;color:#1d4ed8" onclick="XT.all(false)">Clear</a></div>')
    +am.map(m=>'<label><input type="'+(single?'radio':'checkbox')+'" name="xt_m" '+(S.mids.has(m.id)?'checked':'')+' onchange="XT.pick(\''+m.id+'\',this.checked)"> <span><b>'+esc(m.serial||'no Sr.#')+'</b> · '+esc(m.model)+' · '+esc(m.department||'—')+'<br><small>'+esc(kLabelSafe(c,m))+'</small></span></label>').join(''):'<div class="hint">No active machines on this company.</div>');
  g('xt_new').innerHTML=S.toId==='__new'?'<div class="grid2">'+['name:Company name','trn:TRN','addr:Address','email:Email','phone:Phone','contact:Contact person','tel:Contact tel / WhatsApp'].map(x=>{ const [k,l]=x.split(':'); return '<div class="field"><label>'+l+'</label><input value="'+esc(S.nc[k])+'" oninput="XT.nf(\''+k+'\',this.value)"></div>'; }).join('')+'</div>':'';
  g('xt_ps_row').style.display=S.carry?'':'none'; g('xt_close').style.display=S.mode==='single'?'':'none';
  verCard(); prev(); }
function kLabelSafe(c,m){ try{ const k=kOf(c,m); return (k.ref||k.type||'Contract')+(k.end?' · to '+fmtDMY(k.end):''); }catch(e){ return ''; } }
function verCard(){ const d=g('xt_ver'); if(!d) return; if(!S.toId){ d.innerHTML=''; return; }
  const t=toC(), v=t?{name:t.name,trn:t.trn,addr:t.addr,email:t.email,phone:t.phone||t.tel,contact:t.contact||((t.persons||[])[0]||{}).name,tel:t.tel||((t.persons||[])[0]||{}).mobile}:S.nc;
  const kv=[['Company',v.name],['TRN',v.trn],['Address',v.addr],['Email',v.email],['Phone',v.phone],['Contact person',v.contact],['Contact tel',v.tel]];
  if(t) kv.push(['Existing contracts',(t.contracts||[]).length+' · machines '+(t.machines||[]).length],['Terms',t.terms]);
  d.innerHTML='<div class="xt-ver'+(S.ok?' done':'')+'"><b>Verify the new company details (shown once)</b><div class="xt-kv" style="margin:8px 0">'+kv.map(x=>'<div>'+x[0]+'</div><div>'+(esc(x[1]||'')||'<span style="color:#b3261e">— missing —</span>')+'</div>').join('')+'</div>'
   +(t?'<a style="cursor:pointer;color:#1d4ed8;font-size:.82rem" onclick="closeModal(\'xtOverlay\');openCustomerModal(\''+t.id+'\')">Edit these details</a>':'')
   +'<label class="tk" style="margin-top:6px"><input type="checkbox" '+(S.ok?'checked':'')+' onchange="XT.ok(this.checked)"> I have verified these details</label></div>'; }
function usedIn(c,m,from,to){ let mono=0,col=0; if(!from||from>to) return {mono,col}; lineOf(c,m).forEach(x=>x.readings.forEach(r=>{ if(inR(r,from,to)){ const q=rc(x,r); mono+=q.mono; col+=q.color; } })); return {mono,col}; }
function infoOf(c,m){ const last=lastRd(m), ld=last&&(last.date||last.month+'-01'), n=poolMonths(m,lineOf(c,m)), fm=(m.freeMono||0)*n, fc=(m.freeColor||0)*n, u=S.carry?usedIn(c,m,S.pstart,addDays(S.date,-1)):{mono:0,col:0}, cm=Math.min(u.mono,fm), cc=Math.min(u.col,fc);
  return {m,last,ld,stale:!last||daysBetween(ld,S.date)>35,fm,fc,cm,cc,nm:Math.max(0,fm-cm),nc:Math.max(0,fc-cc)}; }
function prev(){ const c=fromC(), ms=c.machines.filter(m=>S.mids.has(m.id)), d=g('xt_prev'); if(!ms.length){ d.innerHTML='<div class="hint">Select at least one machine.</div>'; return; }
  d.innerHTML='<div class="tw"><table><thead><tr><th>Sr.#</th><th>Model</th><th>Last reading</th><th class="n">Opening mono / colour at new company</th><th class="n">Free (mono / colour) for first period</th></tr></thead><tbody>'+ms.map(m=>{ const i=infoOf(c,m); return '<tr><td>'+esc(m.serial||'—')+'</td><td>'+esc(m.model)+'</td><td>'+(i.last?fmtDMY(i.ld)+(i.stale&&S.mode==='bulk'?' <span class="badge warn">old</span>':''):'<span class="badge bad">none</span>')+'</td><td class="n">'+(S.mode==='single'&&(S.cm!==''||S.cc!=='')?fmtN(S.cm!==''?+S.cm:(i.last||{}).me)+' / '+fmtN(S.cc!==''?+S.cc:(i.last||{}).ce):(i.last?fmtN(i.last.me)+' / '+fmtN(i.last.ce):'—'))+'</td><td class="n">'+(S.carry?fmtN(i.nm)+' / '+fmtN(i.nc)+'<br><small>(already used '+fmtN(i.cm)+' / '+fmtN(i.cc)+')</small>':fmtN(i.fm)+' / '+fmtN(i.fc)+'<br><small>(restart)</small>')+'</td></tr>'; }).join('')+'</tbody></table></div>'
   +'<div class="hint" style="margin-top:6px">After confirming: '+esc(c.name)+' stops being billed for these machines from '+fmtDMY(S.date)+'; the new company is billed from that date. Old invoices stay with '+esc(c.name)+'.</div>'; }

/* ---------- perform ---------- */
function closeRd(m,cdate,vals){ const mon=cdate.slice(0,7); let r=m.readings.find(x=>x.month===mon);
  if(!r){ const pv=m.readings.filter(x=>x.month<mon).sort((a,b)=>a.month.localeCompare(b.month)).pop(); if(!pv) return null; r={month:mon,date:cdate}; RF.forEach(k=>{ r[k]=0; }); MS.forEach(([a,b])=>{ r[a]=r[b]=pv[b]||0; }); m.readings.push(r); }
  if(vals.me!=null) r.me=vals.me; if(vals.ce!=null) r.ce=vals.ce; r.date=cdate; m.readings.sort((a,b)=>a.month.localeCompare(b.month)); return r; }
XT.go=function(){ const from=fromC(); if(!from) return; const ms=from.machines.filter(m=>S.mids.has(m.id)&&m.status==='Active');
  if(!S.toId){ toast('Choose the new company.',true); return; } if(!S.date){ toast('Enter the effective date.',true); return; } if(!ms.length){ toast('Select at least one active machine.',true); return; }
  let to=toC(); if(S.toId==='__new'){ if(!S.nc.name.trim()){ toast('Enter the new company name.',true); return; } }
  if(!S.ok){ toast('Tick "I have verified these details" first.',true); return; }
  if(to&&to.id===from.id){ toast('Choose a different company.',true); return; }
  const date=S.date, cdate=addDays(date,-1), noteBase=' (effective '+fmtDMY(date)+')'; let createdNew=false;
  if(!to){ const n=S.nc; to={id:uid(),name:n.name.trim(),company:n.name.trim(),trn:n.trn.trim(),addr:n.addr.trim(),email:n.email.trim(),phone:n.phone.trim(),contact:n.contact.trim(),tel:n.tel.trim(),contracts:[],machines:[],persons:[]};
    ['leaseCycle','excessCycle','freeMono','freeColor','rateMono','rateColor','monthlyLease','terms'].forEach(k=>{ if(from[k]!==undefined) to[k]=from[k]; }); DB.customers.push(to); createdNew=true; }
  const kmap={}, newKs=[], single=S.mode==='single';
  ms.forEach(m=>{ const info=infoOf(from,m); let closing=lastRd(m);
    if(single&&(S.cm!==''||S.cc!=='')){ const r=closeRd(m,cdate,{me:S.cm!==''?+S.cm:null,ce:S.cc!==''?+S.cc:null}); if(r) closing=r; else toast('Closing counters not saved — '+(m.serial||m.model)+' has no earlier reading.',true); }
    const ok=kOf(from,m); if(!kmap[ok.id]){ const nk=JSON.parse(JSON.stringify(ok)); nk.id=newKid(); nk.start=date; nk.history=[]; nk.files=[]; if(nk.ref&&from.name) nk.ref=nk.ref.replace(new RegExp(escRe(from.name),'i'),to.name); nk.transferredFrom={cid:from.id,name:from.name,kid:ok.id,date}; kmap[ok.id]=nk.id; newKs.push(nk); }
    const n=JSON.parse(JSON.stringify(m)); n.id=uid(); n.status='Active'; n.contractId=kmap[ok.id]; delete n.lineId; delete n.replaces; delete n.endDate; delete n.transferredTo; n.startDate=date; n.transferredFrom={cid:from.id,mid:m.id,name:from.name,date};
    n.events=[{id:uid(),date,type:'Move',note:'Transferred from '+from.name+noteBase+(S.carry?' — free allowance carried over':' — free allowance restarted'),qty:0}]; n.readings=[];
    if(closing){ const o={month:date.slice(0,7),date}; RF.forEach(k=>{ o[k]=0; }); MS.forEach(([a,b])=>{ o[a]=o[b]=closing[b]||0; }); if(S.carry&&(info.cm||info.cc)) o.carry={mono:info.cm,color:info.cc,from:S.pstart,note:'already used under '+from.name}; n.readings=[o]; }
    m.events=m.events||[]; m.status='Moved out'; m.endDate=date; m.transferredTo={cid:to.id,mid:n.id,name:to.name,date}; m.events.push({id:uid(),date,type:'Move',note:'Transferred to '+to.name+noteBase,qty:0});
    to.machines.push(n); });
  to.contracts=to.contracts||[]; if(createdNew) to.contracts=newKs.concat(to.contracts.filter(k=>k.id)); else newKs.forEach(k=>to.contracts.push(k));
  from.contracts.forEach(k=>{ if(!kmap[k.id]) return; if(from.machines.some(x=>x.contractId===k.id&&isActive(x))) return; k.history=k.history||[]; k.history.push({start:k.start,end:k.end,on:todayISO(),ref:k.ref,factor:1,note:'Transferred to '+to.name+noteBase}); if(!k.end||k.end>cdate) k.end=cdate; k.transferred={toId:to.id,name:to.name,date}; });
  normalizeData(); save(); closeModal('xtOverlay'); renderAll(); try{ renderBell(); }catch(e){}
  toast(ms.length+' machine(s) transferred to '+to.name+' from '+fmtDMY(date)+'.'); };

/* ---------- resolve machines already registered under two companies ---------- */
function resShell(){ if(g('xtRes')) return; const d=document.createElement('div'); d.className='overlay'; d.id='xtRes'; d.innerHTML='<div class="modal w"><h3>Resolve duplicate Sr.#</h3><div id="xtResBody"></div><div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'xtRes\')">Cancel</button><button class="btn" onclick="XT.resGo()">Apply</button></div></div>'; document.body.appendChild(d); }
let R=null;
XT.resolve=function(sr){ resShell(); const L=allMachines().filter(x=>normSr(x.m.serial)===sr&&x.m.status==='Active'); if(L.length<2){ toast('Nothing to resolve.',true); return; }
  L.sort((a,b)=>(firstD(a.m)).localeCompare(firstD(b.m))); R={L,sr}; g('xtResBody').innerHTML='<div class="hint">Sr.# '+esc(L[0].m.serial)+' is Active under '+L.length+' companies. Choose which company it left and from which date; it is then closed there and counted only for the other company.</div>'
   +'<div class="field"><label>Old company (machine leaves from)</label><select id="xr_old">'+L.map((x,i)=>'<option value="'+i+'">'+esc(x.c.name)+'</option>').join('')+'</select></div><div class="field"><label>Effective date</label><input id="xr_date" type="date" value="'+(/rak/i.test(L[0].c.name)?'2026-07-01':todayISO())+'"></div>'; openModal('xtRes'); };
const firstD=m=>((m.readings.slice().sort((a,b)=>a.month.localeCompare(b.month))[0]||{}).date)||m.startDate||'9999';
XT.resGo=function(){ if(!R) return; const i=+g('xr_old').value, date=g('xr_date').value; if(!date){ toast('Enter the date.',true); return; } const o=R.L[i], nw=R.L.find((x,j)=>j!==i); if(!nw) return;
  o.m.status='Moved out'; o.m.endDate=date; o.m.transferredTo={cid:nw.c.id,mid:nw.m.id,name:nw.c.name,date}; o.m.events=o.m.events||[]; o.m.events.push({id:uid(),date,type:'Move',note:'Transferred to '+nw.c.name+' (effective '+fmtDMY(date)+')',qty:0});
  nw.m.startDate=date; nw.m.transferredFrom={cid:o.c.id,mid:o.m.id,name:o.c.name,date}; nw.m.events=nw.m.events||[]; nw.m.events.push({id:uid(),date,type:'Move',note:'Received from '+o.c.name+' (effective '+fmtDMY(date)+')',qty:0});
  const k=kOf(o.c,o.m); if(k&&!o.c.machines.some(x=>x.contractId===k.id&&isActive(x))){ const ce=addDays(date,-1); k.history=k.history||[]; k.history.push({start:k.start,end:k.end,on:todayISO(),ref:k.ref,factor:1,note:'Transferred to '+nw.c.name}); if(!k.end||k.end>ce) k.end=ce; k.transferred={toId:nw.c.id,name:nw.c.name,date}; }
  save(); closeModal('xtRes'); renderAll(); try{ renderBell(); }catch(e){} if(g('serOverlay')&&g('serOverlay').classList.contains('show')) window.serialSearch(R.L[0].m.serial); toast('Resolved: '+o.c.name+' → '+nw.c.name+' from '+fmtDMY(date)+'.'); };

/* ---------- Sr.# search: current company first, previous greyed, ownership timeline ---------- */
window.serialSearch=function(q){ const n=normSr(q); if(n.length<3){ toast('Type at least 3 characters of the Sr.#',true); return; }
  const hits=allMachines().filter(x=>normSr(x.m.serial).includes(n)), by={}; hits.forEach(x=>{ const k=normSr(x.m.serial); (by[k]=by[k]||[]).push(x); });
  const keys=Object.keys(by); $('serTitle').textContent='Sr.# '+q+' — '+keys.length+' machine(s), '+hits.length+' record(s)';
  $('serBody').innerHTML=keys.length?keys.map(k=>block(k,by[k])).join(''):'<div class="empty">No machine with this Sr.#.</div>'; openModal('serOverlay'); };
function block(sr,list){ const act=list.filter(x=>x.m.status==='Active'), prev=list.filter(x=>x.m.status!=='Active');
  const tl=list.slice().sort((a,b)=>firstD(a.m).localeCompare(firstD(b.m))).map(x=>{ const m=x.m, f=m.startDate||(firstD(m)==='9999'?'':firstD(m)); return '<div><b>'+esc(x.c.name)+'</b> — '+(f?fmtDMY(f):'start')+' → '+(m.endDate?fmtDMY(m.endDate):'now')+' '+(m.status==='Active'?'<span class="badge good">Current</span>':'<span class="badge gray">'+esc(m.status)+'</span>')+'</div>'; }).join('');
  const dup=act.length>1?'<div class="xt-warn xt-block"><b>⚠ Active under '+act.length+' companies ('+act.map(x=>esc(x.c.name)).join(', ')+').</b> It would be billed twice. <button class="btn sm" onclick="XT.resolve(\''+sr+'\')">Resolve as transfer</button></div>':'';
  return '<div class="card pad" style="margin-bottom:12px"><b>Sr.# '+esc(list[0].m.serial)+'</b> · '+esc(list[0].m.model)+'<div class="xt-tl">'+tl+'</div>'+dup
   +act.map(x=>'<div><div style="text-align:right;margin-bottom:-4px"><span class="badge good">Current</span> <button class="btn sm ghost" onclick="closeModal(\'serOverlay\');XT.open(\''+x.c.id+'\',\''+x.m.id+'\')">⇄ Transfer to another company</button></div>'+machineCard(x.c,x.m)+'</div>').join('')
   +prev.map(x=>'<div class="xt-prev"><div class="hint" style="margin:4px 0"><b>Previous company'+(x.m.endDate?' (until '+fmtDMY(x.m.endDate)+')':'')+'</b></div>'+machineCard(x.c,x.m)+'</div>').join('')+'</div>'; }

/* ---------- bill guard ---------- */
const spanOf=m=>[m.startDate||'0000-00-00',m.endDate||'9999-12-31'];
XT.billWarn=function(c,o){ const w=[]; const lf=o.lf, lt=o.lt;
  c.machines.forEach(m=>{ const nm=esc(m.serial||m.model);
    if(m.transferredTo&&m.endDate){ if(lf&&lt&&m.endDate>lf&&m.endDate<=lt) w.push({t:'info',msg:'Sr.# '+nm+' moved to '+esc(m.transferredTo.name)+' on '+fmtDMY(m.endDate)+' — its lease is billed to '+esc(c.name)+' for the whole period; adjust the dates if you need to split it.'}); }
    if(m.transferredFrom&&m.startDate){ if(lf&&lt&&m.startDate>lf&&m.startDate<=lt) w.push({t:'info',msg:'Sr.# '+nm+' came from '+esc(m.transferredFrom.name)+' on '+fmtDMY(m.startDate)+' — its lease is billed to '+esc(c.name)+' for the whole period; adjust the dates if you need to split it.'}); }
    if(lf&&lt&&m.serial&&leaseOn(m,lf,lt)) DB.customers.forEach(oc=>{ if(oc.id===c.id) return; oc.machines.forEach(om=>{ if(normSr(om.serial)!==normSr(m.serial)||!leaseOn(om,lf,lt)) return; const a=spanOf(m), b=spanOf(om); if(a[0]<b[1]&&b[0]<a[1]) w.push({t:'block',msg:'Sr.# '+nm+' is also billable to '+esc(oc.name)+' for the same dates. Resolve it with "Transfer" (or the Sr.# search) before billing.'}); }); }); });
  return w; };
XT.warnHTML=w=>(w||[]).map(x=>'<div class="xt-warn'+(x.t==='block'?' xt-block':'')+'">'+(x.t==='block'?'⛔ ':'ℹ️ ')+x.msg+'</div>').join('');
})();

/* ===== Quote description type-ahead + "ask date" when converting a quote to an invoice ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
let list=[], row=-1, ctxK='q';
const box=()=>{ let b=g('qDescSug'); if(!b){ b=document.createElement('div'); b.id='qDescSug'; b.style.cssText='position:fixed;z-index:9999;background:#fff;border:1px solid #d5dae5;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.18);max-height:300px;overflow:auto;display:none;font-size:.85rem'; document.body.appendChild(b); } return b; };
function cands(){ const seen=new Set(), out=[]; const add=(t,p)=>{ t=String(t==null?'':t).trim(); if(!t) return; const k=t.replace(/\s+/g,' ').toLowerCase(); if(seen.has(k)) return; seen.add(k); out.push({t,k,p:p||null}); };
  (DB.stock||[]).forEach(s=>{ add(s.item,s); add(s.desc,null); });
  (DB.quotes||[]).forEach(q=>(q.lines||[]).forEach(l=>{ add(l.item); add(l.desc); }));
  (DB.sales||[]).forEach(x=>{ add(x.item); add(x.desc); }); return out; }
window.qDescHide=()=>{ const b=g('qDescSug'); if(b) b.style.display='none'; };
window.qDescSug=function(inp,i,ctx){ ctxK=ctx==='p'?'p':'q'; const q=inp.value.replace(/\s+/g,' ').trim().toLowerCase(); if(q.length<2){ qDescHide(); return; }
  const w=q.split(' '); row=i;
  list=cands().filter(c=>c.k!==q&&w.every(x=>c.k.includes(x))).sort((a,b)=>(b.k.startsWith(q)-a.k.startsWith(q))||a.t.length-b.t.length).slice(0,12);
  const b=box(); if(!list.length){ b.style.display='none'; return; }
  b.innerHTML=list.map((c,k)=>'<div onmousedown="event.preventDefault();qDescPick('+k+')" style="padding:7px 12px;cursor:pointer;border-bottom:1px solid #eef0f5" onmouseover="this.style.background=\'#eaf1ff\'" onmouseout="this.style.background=\'\'">'+esc(c.t.length>160?c.t.slice(0,160)+'…':c.t)+'</div>').join('');
  const r=inp.getBoundingClientRect(); b.style.left=Math.max(8,Math.min(r.left,innerWidth-480))+'px'; b.style.top=Math.min(r.bottom+2,innerHeight-320)+'px'; b.style.width=Math.max(r.width,440)+'px'; b.style.display=''; };
window.qDescPick=function(k){ const c=list[k], RR=ctxK==='p'?pRows:qRows; if(!c||row<0||!RR[row]) return; const R=RR[row]; R.desc=c.t;
  if(c.p&&!String(R.item||'').trim()){ R.item=c.p.item; if(c.p.price&&!R.rate) R.rate=c.p.price; if(c.p.cost) R.cost=c.p.cost; if(c.p.unit) R.unit=c.p.unit; }
  qDescHide(); if(ctxK==='p') pDraw(); else qDraw(); };
window.addEventListener('scroll',()=>{ const b=g('qDescSug'); if(b) b.style.display='none'; },true);

/* ---- ask the invoice date (and reference) before a quote becomes an invoice ---- */
window.qcAsk=function(id){ const q=DB.quotes.find(x=>x.id===id); if(!q) return;
  let o=g('qcOverlay'); if(!o){ o=document.createElement('div'); o.className='overlay'; o.id='qcOverlay'; document.body.appendChild(o); }
  const c=custById(q.cid)||{};
  o.innerHTML='<div class="modal" style="max-width:460px"><h3>Convert quote to invoice</h3><div class="hint">Quote <b>'+esc(q.no)+'</b> · '+esc(c.name||'')+' → invoice <b>'+esc(slNextInv())+'</b>. Stock is reduced for goods only (services are not stock).</div>'
   +'<div class="field" style="margin-top:10px"><label>Invoice date</label><input id="qc_date" type="date" value="'+todayISO()+'"></div>'
   +'<div class="field"><label>Internal reference</label><select id="qc_ref">'+REFS.map(r=>'<option'+(r==='Consumable'?' selected':'')+'>'+r+'</option>').join('')+'</select></div>'
   +'<div class="modal-actions"><button class="btn ghost" onclick="closeModal(\'qcOverlay\')">Cancel</button><button class="btn" onclick="qcGo(\''+id+'\')">Create invoice</button></div></div>';
  openModal('qcOverlay'); };
window.qcGo=function(id){ const d=g('qc_date').value, r=g('qc_ref').value; if(!d){ toast('Choose the invoice date.',true); return; } closeModal('qcOverlay'); try{ dvClose(); }catch(e){} qInvoice(id,d,r); };
})();
