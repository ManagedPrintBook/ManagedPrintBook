/* ===== Add-on 13: print lock (individual invoice only), Excel / Joseph Group import, month-wise Billing Calendar with "reading collected" ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const XA=window.XA;
const UNL=1e9;

/* ---------------- 1. PRINT LOCK: only an individual invoice can be printed ---------------- */
(function(){
  const st=document.createElement('style');
  st.textContent='@media print{html.noprintpage body{display:none!important}html.noprintpage{background:#fff!important}}';
  document.head.appendChild(st);
  const ok=()=>{ const o=g('invOverlay'); return !!(o&&o.classList.contains('show')&&typeof curDoc!=='undefined'&&curDoc&&curDoc.kind==='invoice'); };
  const apply=()=>{ document.documentElement.classList.toggle('noprintpage',!ok()); };
  window.addEventListener('beforeprint',apply);
  window.addEventListener('afterprint',()=>document.documentElement.classList.remove('noprintpage'));
  apply(); setInterval(apply,1000);
  /* print buttons for statements / reports on the main page are neutralised too */
  const wp=window.print; window.print=function(){ apply(); return wp.apply(this,arguments); };
})();

/* ---------------- helpers ---------------- */
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>y+'-'+pad(m)+'-'+pad(d);
function addMonthsISO(s,n){ const [y,m,d]=s.split('-').map(Number); const t=(y*12+(m-1))+n, ny=Math.floor(t/12), nm=t%12+1; const dim=new Date(ny,nm,0).getDate(); return iso(ny,nm,Math.min(d,dim)); }
function parseDMY(v){ if(v==null||v==='') return ''; if(v instanceof Date&&!isNaN(v)){ const d=new Date(v.getTime()+12*36e5); return iso(d.getFullYear(),d.getMonth()+1,d.getDate()); }
  const s=String(v).trim(); let m=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/); if(m){ let y=+m[3]; if(y<100) y+=2000; return iso(y,+m[2],+m[1]); }
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m?m[0]:''; }
const CYC={monthly:1,quarterly:3,'half yearly':6,halfyearly:6,'semi annual':6,yearly:12,annual:12,annually:12};
const stepOf=m=>{ const c=String(m.leaseCycle||'').toLowerCase(); return CYC[c]||0; };   /* 0 = one-time / custom */
const fmt=s=>s?fmtDMY(s):'';
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monLabel=ym=>{ const [y,m]=ym.split('-'); return MON[+m-1]+' '+y; };

/* ---------------- 2. IMPORT (Joseph Group built-in data + any Excel with the same columns) ---------------- */
const JOSEPH=[["MT-NM-L25-1932","MT/LC-684/25","2025-09-08","2028-09-07","Unlimited","Lease","Quarterly","","Joseph Industries LLC","HR","146006","Epson","AM-C4000","XFA8002399"],
["MT-NM-L25-1941","MT/LC-684/25","2025-09-26","2028-09-25","Unlimited","Lease","Quarterly","","Joseph Industries LLC","ART","145916","Canon","iR ADV C3922i","4MT14804"],
["MT-NM-L25-1951","MT/LC-698/25","2025-10-17","2028-10-16","Unlimited","Lease","Quarterly","","Joseph Industries LLC","ADV Accounts 1st Floor","146235","Canon","iR ADV C3922i","4MT14665"],
["MT-NM-L25-1966","MT/LC-711/25","2025-11-13","2028-11-12","Unlimited","Lease","Quarterly","","Joseph Decorative Glass LLC","","119216","Canon","iR ADV C3922i","4MT14830"],
["MT-NM-L26-2181","MT/LC-779/26","2026-04-15","2029-04-14","Unlimited","Lease","Quarterly","","Joseph Decorative Glass LLC","RAK","120105","Canon","iR ADV C3922i","4MT14950"],
["MT-NM-L26-2212","MT/LC-805/26","2026-05-25","2029-05-24","Unlimited","Lease","Quarterly","Received","Joseph Industries LLC","JA FACTORY","149168","Canon","iR ADV C3922i","4MT14968"],
["MT-NM-L26-2213","MT/LC-807/26","2026-06-02","2029-06-01","Unlimited","Lease","Quarterly","Received","Joseph Industries LLC","PROJECT/CAD DEPT","149197","Canon","iR ADV C3922i","4MT14924"],
["MT-NM-L26-2214","MT/LC-808/26","2026-06-02","2029-06-01","Unlimited","Lease","Quarterly","Received","Joseph Industries LLC","ABU DHABI","149198","Canon","iR ADV C3922i","4MT14970"],
["MT-NM-L26-2223","MT/LC-817/26","2026-06-25","2029-06-24","Unlimited","Lease","Quarterly","Received","Joseph Industries LLC","JA FACTORY - 3","149631","Canon","iR ADV C3922i","4MT14931"],
["MT-NM-L26-2240","MT/LC-834/26","2026-07-24","2029-07-23","Unlimited","Lease","Quarterly","Received","Joseph Projects & Traffic Signs","Project & Traffic Signs","121762","Canon","iR ADV C3922","4MT14915"],
["MT-NM-L26-2254","INV/SJ/26/04031","2026-08-11","2027-08-10","","Sale","One Time","","Joseph Advertisers LLC","ADV PROJECT","149045","Epson","SC-T5100M","X9HB0001585"],
["MT-NM-L26-2261","MT/LC-854/26","2026-08-26","2029-08-25","Unlimited","Lease","Quarterly","Received","The Art Source Decore Products Manufacturing L.L.C. (Joseph Group)","ART SOURCE","1022026","Canon","iR ADV C3922","4MT14823"],
["MT-NM-L26-2274","MT/LC-873/26","2026-09-21","2029-09-20","Unlimited","Lease","Quarterly","","Joseph Industries","Ind Accounts","41000130","Canon","iR ADV C3935i","4LQ11063"],
["MT-NM-L26-2283","MT/LC-877/26","2026-09-29","2029-09-28","Unlimited","Lease","Quarterly","","Joseph Projects & Traffic Signs-Jebel Ali Industrial Area","Project & Traffic Signs","122174","Canon","iR ADV C3922i","4MT14928"],
["MT-NM-L26-2304","MT/LC-884/26","2026-10-14","2029-10-13","Unlimited","Lease","Quarterly","","Joseph Decorative Glass LLC","","430000535","Canon","iR ADV C3922i","4MT14938"]];
const COLS=['eqid','ref','start','end','free','type','cycle','status','customer','dept','lpo','brand','model','serial'];
let IMP={rows:[],group:'Joseph Group'};
const HEAD={eqid:/equipment/i,ref:/contract|invoice no/i,start:/start/i,end:/end date/i,free:/free/i,type:/type of contract/i,cycle:/billing cycle/i,status:/contract status/i,customer:/customer/i,dept:/department/i,lpo:/lpo/i,brand:/brand/i,model:/model/i,serial:/serial/i};
function rowObj(a){ const o={}; COLS.forEach((k,i)=>{ o[k]=a[i]==null?'':a[i]; }); return o; }
function fromSheet(ws){ const A=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,cellDates:true,defval:''}); if(!A.length) return [];
  const hi=A.findIndex(r=>r.some(c=>/serial/i.test(String(c)))); if(hi<0) return []; const map={}; A[hi].forEach((h,i)=>{ const s=String(h); for(const k of COLS){ if(map[k]===undefined&&HEAD[k].test(s)){ map[k]=i; break; } } });
  return A.slice(hi+1).filter(r=>r.some(c=>String(c).trim()!=='')).map(r=>{ const o={}; COLS.forEach(k=>{ o[k]=map[k]===undefined?'':r[map[k]]; });
    o.start=parseDMY(o.start); o.end=parseDMY(o.end); ['eqid','ref','free','type','cycle','status','customer','dept','brand','model','serial'].forEach(k=>{ o[k]=String(o[k]==null?'':o[k]).replace(/\s+/g,' ').trim(); }); o.lpo=String(o.lpo==null?'':o.lpo).trim(); return o; }); }
function prepare(rows){ IMP.rows=rows.map(r=>Object.assign({},r)); }
function existingSerials(){ const s={}; DB.customers.forEach(c=>c.machines.forEach(m=>{ if(m.status==='Active'&&m.serial) s[normSr(m.serial)]=c.name; })); return s; }
XA.reg('ximp',{title:'Import from Excel',render(){
  const ex=existingSerials();
  const head='<div class="sec" style="margin-top:0"><h2>Import contracts &amp; machines from Excel</h2></div>'
   +'<div class="card pad"><div class="hint">Columns used: Equipment ID, Contract / Invoice No, Start Date, End Date, Free Copies, Type of Contract, Billing Cycle, Contract Status, Customer Name, Department, LPO #, Brand, Model, Serial No. Every customer name becomes a customer under the group below; every row becomes a machine with its own contract start / end dates and billing cycle. <b>Unlimited</b> rows get unlimited free mono &amp; colour and no excess charge.</div>'
   +'<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;margin-top:10px"><div class="field" style="margin:0"><label>Group name</label><input id="xi_grp" value="'+esc(IMP.group)+'" style="width:220px" oninput="XA.impGrp(this.value)"></div>'
   +'<div class="field" style="margin:0"><label>Excel file (.xlsx)</label><input type="file" id="xi_file" accept=".xlsx,.xls,.csv" onchange="XA.impFile(this)"></div>'
   +'<button class="btn ghost" onclick="XA.impJoseph()">Load Joseph Group data (built in)</button></div></div>';
  if(!IMP.rows.length) return head+'<div class="card pad"><div class="empty">Choose the Excel file, or press “Load Joseph Group data”. You will see a preview here before anything is saved.</div></div>';
  const body=IMP.rows.map((r,i)=>{ const dup=ex[normSr(r.serial)]; const bad=!r.serial||!r.start||!r.end;
    return '<tr'+(dup||bad?' style="background:#fff7ed"':'')+'><td><input type="checkbox" '+(dup||bad?'':'checked')+' data-i="'+i+'" class="xi_on" style="width:auto"></td><td><input class="zin" style="min-width:230px" value="'+esc(r.customer)+'" onchange="XA.impSet('+i+',\'customer\',this.value)"></td><td>'+esc(r.dept||'—')+'</td><td>'+esc(r.brand)+' '+esc(r.model)+'<div class="kdept">'+esc(r.serial)+' · '+esc(r.eqid)+'</div></td><td>'+esc(r.ref)+'<div class="kdept">LPO '+esc(r.lpo||'—')+'</div></td><td>'+fmt(r.start)+' → '+fmt(r.end)+'</td><td>'+esc(r.type)+' · '+esc(r.cycle)+'<div class="kdept">'+(/unl/i.test(r.free)?'Mono &amp; Colour unlimited':'—')+'</div></td><td>'+(dup?'<span class="badge bad">Sr.# already Active at '+esc(dup)+' — skipped</span>':bad?'<span class="badge bad">Missing Sr.# or dates</span>':'<span class="badge good">New</span>')+'</td></tr>'; }).join('');
  const custs=[...new Set(IMP.rows.map(r=>r.customer))];
  return head+'<div class="card"><div class="pad"><b>'+IMP.rows.length+'</b> row(s) · <b>'+custs.length+'</b> customer name(s). Fix a customer name here if two spellings are the same company (e.g. “Joseph Industries” and “Joseph Industries LLC”) — rows with the same name are put under one customer.</div><div class="tw"><table><thead><tr><th></th><th>Customer / division</th><th>Department</th><th>Machine</th><th>Contract</th><th>Contract period</th><th>Billing</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div><div class="pad"><button class="btn" onclick="XA.impGo()">Import ticked rows</button></div></div>'; }});
XA.impGrp=v=>{ IMP.group=v; };
XA.impSet=(i,k,v)=>{ IMP.rows[i][k]=v.trim(); };
XA.impJoseph=()=>{ prepare(JOSEPH.map(rowObj)); XA.refresh(); };
XA.impFile=inp=>{ const f=inp.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=e=>{ try{ const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true}); const rows=fromSheet(wb.Sheets[wb.SheetNames[0]]); if(!rows.length){ toast('No rows with a “Serial No” column found.',true); return; } prepare(rows); XA.refresh(); }catch(err){ toast('Could not read the file: '+err.message,true); } }; rd.readAsArrayBuffer(f); };
XA.impGo=()=>{ const on=[...document.querySelectorAll('.xi_on:checked')].map(c=>+c.dataset.i); if(!on.length){ toast('Tick at least one row.',true); return; }
  const grp=(IMP.group||'').trim(); let nc=0,nm=0,nk=0; const ex=existingSerials();
  on.forEach(i=>{ const r=IMP.rows[i]; if(ex[normSr(r.serial)]) return;
    let c=DB.customers.find(x=>x.name.trim().toLowerCase()===r.customer.trim().toLowerCase());
    if(!c){ const k0=Object.assign(kBase(),{id:newKid()}); c={id:uid(),name:r.customer,machines:[],monthlyLease:0,leaseCycle:'Quarterly',excessCycle:'Quarterly',leaseFrom:'',leaseTo:'',excessFrom:'',excessTo:'',freeMono:0,freeColor:0,rateMono:0,rateColor:0,contracts:[k0],contract:k0,_fresh:true}; DB.customers.push(c); nc++; }
    if(grp) c.group=grp;
    const sale=/sale/i.test(r.type), type=sale?'Sale (ORS)':/amc/i.test(r.type)?'AMC':/fsma/i.test(r.type)?'FSMA':'Lease';
    let k=c.contracts.find(x=>x.ref===r.ref&&x.start===r.start&&x.end===r.end);
    if(!k&&c._fresh&&c.contracts.length===1&&!c.contracts[0].ref&&!c.contracts[0].start){ k=c.contracts[0]; Object.assign(k,{ref:r.ref,type,start:r.start,end:r.end}); }
    if(!k){ const dupRef=c.contracts.some(x=>x.ref===r.ref); k=Object.assign(kBase(),{id:newKid(),ref:dupRef?r.ref+' ('+(r.dept||r.serial)+')':r.ref,type,start:r.start,end:r.end}); c.contracts.push(k); nk++; }
    k.lpo=k.lpo||r.lpo; if(r.status) k.statusNote=r.status; delete c._fresh; c.contract=c.contracts[0];
    const unl=/unl/i.test(r.free), plot=/SC-?T|plotter/i.test(r.model), q=/quarter/i.test(r.cycle), mo=/month/i.test(r.cycle), yr=/year|annual/i.test(r.cycle);
    const mac={id:uid(),contractId:k.id,type:plot?'Plotter':'Printer',status:'Active',department:r.dept,model:(r.brand&&!r.model.toLowerCase().startsWith(r.brand.toLowerCase())?r.brand+' ':'')+r.model,serial:r.serial,eqid:r.eqid,desc:'',remarks:'LPO '+r.lpo,lpo:r.lpo,startDate:r.start,endDate:r.end,a3Factor:2,plotUnit:'sqm',freeBasis:'period',
      freeMono:unl?UNL:0,freeColor:unl?UNL:0,rateMono:0,rateColor:0,freePlot:0,ratePlot:0,rateA0:0,rateA1:0,rateA2:0,readings:[],events:[],
      monthlyLease:0,billM:mo,billQ:q,billY:yr,priceM:0,priceQ:0,priceY:0,leaseCycle:sale?'Custom (Date Wise)':q?'Quarterly':mo?'Monthly':yr?'Yearly':'Quarterly',excessCycle:q?'Quarterly':mo?'Monthly':'Quarterly',leaseFrom:'',leaseTo:'',excessFrom:'',excessTo:'',billAnchor:r.start,billCycleName:r.cycle,contractStatus:r.status};
    c.machines.push(mac); nm++; ex[normSr(r.serial)]=c.name; if(typeof addModel==='function') addModel({model:mac.model,brand:r.brand}); });
  save(); try{ renderAll(); }catch(e){} IMP.rows=[]; toast(nm+' machine(s), '+nk+' new contract(s) and '+nc+' new customer(s) imported.'); XA.refresh(); };

/* ---------------- 3. BILLING CALENDAR (month-wise) + reading collected ---------------- */
/* schedule of one machine: invoice 1 on start date, then every cycle until the contract end date */
function schedule(m){ const st=m.startDate||m.billAnchor; if(!st) return []; const step=stepOf(m); const end=m.endDate||''; const out=[];
  if(!step){ out.push({n:1,date:st,of:1}); return out; }
  for(let i=0;i<400;i++){ const d=addMonthsISO(st,i*step); if(end&&d>end) break; out.push({n:i+1,date:d}); }
  out.forEach(x=>{ x.of=out.length; }); return out; }
XA.schedule=schedule;
const marks=m=>(m.readMarks=m.readMarks||{});
function collected(m,row){ const mk=marks(m)[row.date]; if(mk&&mk.done) return {by:'mark',on:mk.on}; const ym=row.date.slice(0,7); const r=(m.readings||[]).find(x=>x.month===ym); if(r) return {by:'reading',on:r.date||''}; return null; }
function allRows(f){ const rows=[]; DB.customers.forEach(c=>{ if(f.grp&&(c.group||'')!==f.grp) return; if(f.cust&&c.id!==f.cust) return;
  c.machines.forEach(m=>{ if(m.status!=='Active'&&m.status!=='Replaced') return; if(m.status==='Replaced') return; const k=(c.contracts||[]).find(x=>x.id===m.contractId)||c.contracts[0]||{};
    schedule(m).forEach(s=>{ rows.push({c,m,k,date:s.date,n:s.n,of:s.of,col:collected(m,s)}); }); }); }); return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.c.name.localeCompare(b.c.name)); }
const BC={view:'month',month:todayISO().slice(0,7),grp:'',cust:'',st:'all',q:''};
function filt(rows){ const q=BC.q.toLowerCase(); return rows.filter(r=>(BC.st==='all'||(BC.st==='done')===!!r.col)&&(!q||(r.c.name+' '+(r.m.department||'')+' '+r.m.model+' '+r.m.serial+' '+(r.k.ref||'')+' '+(r.m.eqid||'')).toLowerCase().includes(q))); }
function groups(){ return [...new Set(DB.customers.map(c=>c.group).filter(Boolean))]; }
XA.reg('bcal',{title:'Billing Calendar',render(){
  const G=groups(), rows0=allRows({grp:BC.grp,cust:BC.cust});
  const sel=(id,opts,val,fn)=>'<select id="'+id+'" onchange="'+fn+'" style="width:auto">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===val?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
  const bar='<div class="sec" style="margin-top:0;flex-wrap:wrap;gap:8px"><h2>Billing Calendar</h2><span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
   +sel('bc_view',[['month','By month'],['machine','By machine (all invoices)']],BC.view,'XA.bcSet(\'view\',this.value)')
   +sel('bc_grp',[['','All groups']].concat(G.map(x=>[x,x])),BC.grp,'XA.bcSet(\'grp\',this.value)')
   +sel('bc_cust',[['','All customers']].concat(DB.customers.filter(c=>!BC.grp||c.group===BC.grp).map(c=>[c.id,c.name])),BC.cust,'XA.bcSet(\'cust\',this.value)')
   +sel('bc_st',[['all','All'],['pend','Reading pending'],['done','Reading collected']],BC.st,'XA.bcSet(\'st\',this.value)')
   +'<input id="bc_q" placeholder="Search dept, model, Sr.#, contract…" value="'+esc(BC.q)+'" style="width:230px" oninput="XA.bcQ(this.value)"></span></div>'
   +'<div class="hint" style="margin:0 0 8px">First invoice is on the machine’s contract start date, then every billing cycle (e.g. start 08-09-2025, quarterly → 08-09-2025, 08-12-2025, 08-03-2026, 08-06-2026 …) until the contract end date. Tick <b>Reading collected</b> once that period’s meter reading is taken (a reading saved for that month in Reading Run is counted automatically).</div>';
  if(BC.view==='machine') return bar+byMachine();
  return bar+byMonth(rows0); }});
function byMonth(rows0){
  const y=+BC.month.slice(0,4), strip=[]; for(let mo=1;mo<=12;mo++){ const ym=y+'-'+pad(mo), L=rows0.filter(r=>r.date.slice(0,7)===ym), d=L.filter(r=>r.col).length; strip.push('<button class="btn sm '+(ym===BC.month?'':'ghost')+'" style="min-width:86px;text-align:center" onclick="XA.bcSet(\'month\',\''+ym+'\')">'+MON[mo-1]+'<br><small>'+(L.length?d+'/'+L.length+' read':'—')+'</small></button>'); }
  const nav='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><button class="btn sm ghost" onclick="XA.bcSet(\'month\',\''+(y-1)+'-'+BC.month.slice(5)+'\')">◀</button><b style="font-size:1.1rem">'+y+'</b><button class="btn sm ghost" onclick="XA.bcSet(\'month\',\''+(y+1)+'-'+BC.month.slice(5)+'\')">▶</button><span style="display:flex;gap:4px;flex-wrap:wrap">'+strip.join('')+'</span></div>';
  const L=filt(rows0.filter(r=>r.date.slice(0,7)===BC.month)), done=L.filter(r=>r.col).length, today=todayISO();
  const tr=L.map(r=>{ const late=!r.col&&r.date<today; return '<tr><td><b>'+fmt(r.date)+'</b>'+(late?'<div><span class="badge bad">Past due</span></div>':'')+'</td><td>'+esc(r.c.name)+(r.c.group?'<div class="kdept">'+esc(r.c.group)+'</div>':'')+'</td><td>'+esc(r.m.department||'—')+'</td><td>'+esc(r.m.model)+'<div class="kdept">'+esc(r.m.serial||'')+'</div></td><td>'+esc(r.k.ref||'—')+'<div class="kdept">'+fmt(r.m.startDate)+' → '+fmt(r.m.endDate)+'</div></td><td>Invoice '+r.n+' of '+r.of+'<div class="kdept">'+esc(r.m.leaseCycle||'')+'</div></td><td>'+tick(r)+'</td><td><button class="btn sm ghost" onclick="XA.bcRead(\''+r.c.id+'\',\''+r.m.id+'\',\''+r.date.slice(0,7)+'\')">Enter reading</button></td></tr>'; }).join('');
  return '<div class="card"><div class="pad">'+nav+'<b>'+monLabel(BC.month)+'</b> — '+L.length+' invoice(s) due · <span class="badge good">'+done+' reading collected</span> <span class="badge warn">'+(L.length-done)+' pending</span></div>'
   +(L.length?'<div class="tw"><table><thead><tr><th>Billing date</th><th>Customer</th><th>Department</th><th>Machine</th><th>Contract</th><th>Invoice</th><th>Reading collected</th><th></th></tr></thead><tbody>'+tr+'</tbody></table></div>':'<div class="empty">No invoices fall in this month.</div>')+'</div>'; }
function tick(r){ const id='bk_'+r.m.id+'_'+r.date; const auto=r.col&&r.col.by==='reading';
  return '<label class="tk" style="margin:0;cursor:'+(auto?'default':'pointer')+'"><input type="checkbox" '+(r.col?'checked':'')+(auto?' disabled':'')+' onchange="XA.bcMark(\''+r.c.id+'\',\''+r.m.id+'\',\''+r.date+'\',this.checked)" style="width:auto"> '+(r.col?'<span class="badge good">Collected'+(r.col.on?' '+fmt(String(r.col.on).slice(0,10)):'')+(auto?' (reading saved)':'')+'</span>':'<span class="badge warn">Pending</span>')+'</label>'; }
function byMachine(){ let out=''; DB.customers.forEach(c=>{ if(BC.grp&&c.group!==BC.grp) return; if(BC.cust&&c.id!==BC.cust) return;
  c.machines.forEach(m=>{ if(m.status!=='Active') return; const k=(c.contracts||[]).find(x=>x.id===m.contractId)||c.contracts[0]||{}; const rows=schedule(m).map(s=>({c,m,k,date:s.date,n:s.n,of:s.of,col:collected(m,s)})); const L=filt(rows); const q=BC.q.toLowerCase(); if(q&&!(c.name+' '+(m.department||'')+' '+m.model+' '+m.serial+' '+(k.ref||'')).toLowerCase().includes(q)) return; if(!L.length) return;
    out+='<div class="card" style="margin-bottom:10px"><div class="pad"><b>'+esc(c.name)+'</b> · '+esc(m.department||'—')+' · '+esc(m.model)+' <span class="kdept">'+esc(m.serial||'')+'</span><div class="kdept">'+esc(k.ref||'')+' · '+fmt(m.startDate)+' → '+fmt(m.endDate)+' · '+esc(m.leaseCycle||'')+' · '+rows.filter(r=>r.col).length+'/'+rows.length+' readings collected</div></div><div class="tw"><table><thead><tr><th>#</th><th>Billing date</th><th>Month</th><th>Reading collected</th><th></th></tr></thead><tbody>'
     +L.map(r=>'<tr><td>'+r.n+'/'+r.of+'</td><td>'+fmt(r.date)+'</td><td>'+monLabel(r.date.slice(0,7))+'</td><td>'+tick(r)+'</td><td><button class="btn sm ghost" onclick="XA.bcRead(\''+c.id+'\',\''+m.id+'\',\''+r.date.slice(0,7)+'\')">Enter reading</button></td></tr>').join('')+'</tbody></table></div></div>'; }); });
  return out||'<div class="card pad"><div class="empty">No machines with a start date match. Add a start date on the machine, or import from Excel.</div></div>'; }
XA.bcSet=(k,v)=>{ BC[k]=v; if(k==='grp') BC.cust=''; XA.refresh(); };
let qT; XA.bcQ=v=>{ BC.q=v; clearTimeout(qT); qT=setTimeout(()=>{ XA.refresh(); const i=g('bc_q'); if(i){ i.focus(); i.setSelectionRange(v.length,v.length); } },350); };
XA.bcMark=(cid,mid,date,on)=>{ const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid); if(!m) return; const mk=marks(m); if(on) mk[date]={done:true,on:todayISO()}; else delete mk[date]; save(); XA.refresh(); toast(on?'Reading marked as collected for '+monLabel(date.slice(0,7))+'.':'Mark removed.'); };
XA.bcRead=(cid,mid,ym)=>{ try{ openReading(cid,mid,ym); }catch(e){ toast('Open Contracts → Reading Run to enter this reading.',true); } };

/* menu entries */
let menuDone=false;
setInterval(()=>{ try{ if(menuDone||typeof SD==='undefined') return; const A=SD.find(x=>x.g==='Accounts'), C=SD.find(x=>x.g==='Contracts'); if(!A||!C) return;
  if(!A.items.some(i=>i[2]==='bcal')){ const ix=A.items.findIndex(i=>i[0]==='Billing Report'); A.items.splice(ix<0?A.items.length:ix+1,0,['Billing Calendar','xa','bcal']); }
  if(!C.items.some(i=>i[2]==='ximp')) C.items.push(['Import from Excel','xa','ximp']);
  menuDone=true; sdBuild(); try{ sdSync('xa'); }catch(e){} }catch(e){} },1500);
})();
