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

(function(){ const st=document.createElement('style'); st.textContent='.bcs{max-height:72vh;overflow:auto}.bcs thead th{position:sticky;top:0;z-index:5;background:var(--card,#fff);box-shadow:0 1px 0 var(--border,#e2e5ec)}.bcy tbody td:first-child{position:sticky;left:0;z-index:2;background:var(--card,#fff);box-shadow:1px 0 0 var(--border,#e2e5ec)}.bcy thead th:first-child{left:0;z-index:6}.bcy tbody tr.grp td{position:static!important}'; document.head.appendChild(st); })();
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
    return '<tr'+(dup||bad?' style="background:#fff7ed"':'')+'><td><input type="checkbox" '+(dup||bad?'':'checked')+' data-i="'+i+'" class="xi_on" style="width:auto"></td><td><input class="zin" style="min-width:230px" value="'+esc(r.customer)+'" onchange="XA.impSet('+i+',\'customer\',this.value)"></td><td>'+esc(r.dept||'—')+'</td><td>'+esc(r.brand)+' '+esc(r.model)+'<div class="kdept">'+esc(r.serial)+' · '+esc(r.eqid)+'</div></td><td>'+esc(r.ref)+'<div class="kdept">LPO '+esc(r.lpo||'—')+'</div></td><td>'+fmt(r.start)+' → '+fmt(r.end)+'</td><td>'+esc(r.type)+' · '+esc(r.cycle)+'<div class="kdept">'+(/unl/i.test(r.free)?'Mono &amp; Colour unlimited':'—')+'</div></td><td>'+(/sale/i.test(r.type)?'—':'<input type="number" min="0" step="0.01" style="width:110px" value="'+esc(r.price||'')+'" onchange="XA.impSet('+i+',\'price\',this.value)">')+'</td><td>'+(dup?'<span class="badge bad">Sr.# already Active at '+esc(dup)+' — skipped</span>':bad?'<span class="badge bad">Missing Sr.# or dates</span>':'<span class="badge good">New</span>')+'</td></tr>'; }).join('');
  const custs=[...new Set(IMP.rows.map(r=>r.customer))];
  return head+'<div class="card"><div class="pad"><div style="display:flex;gap:8px;align-items:end;flex-wrap:wrap;margin-bottom:8px"><div class="field" style="margin:0"><label>Set lease amount per billing cycle for all lease rows (AED, ex-VAT)</label><input id="xi_pall" type="number" min="0" step="0.01" style="width:160px"></div><button class="btn sm ghost" onclick="XA.impPriceAll()">Apply to all</button><span class="kdept">The Excel has no prices. Without a lease amount the machine cannot be billed (“No billable lease or excess charges”).</span></div><b>'+IMP.rows.length+'</b> row(s) · <b>'+custs.length+'</b> customer name(s). Fix a customer name here if two spellings are the same company (e.g. “Joseph Industries” and “Joseph Industries LLC”) — rows with the same name are put under one customer.</div><div class="tw"><table><thead><tr><th></th><th>Customer / division</th><th>Department</th><th>Machine</th><th>Contract</th><th>Contract period</th><th>Billing</th><th>Lease / cycle (AED)</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div><div class="pad"><button class="btn" onclick="XA.impGo()">Import ticked rows</button></div></div>'; }});
XA.impGrp=v=>{ IMP.group=v; };
XA.impPriceAll=()=>{ const v=g('xi_pall').value; IMP.rows.forEach(r=>{ if(!/sale/i.test(r.type)) r.price=v; }); XA.refresh(); };
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
      monthlyLease:mo?(parseFloat(r.price)||0):0,billM:mo,billQ:q,billY:yr,priceM:0,priceQ:q?(parseFloat(r.price)||0):0,priceY:yr?(parseFloat(r.price)||0):0,leaseCycle:sale?'Custom (Date Wise)':q?'Quarterly':mo?'Monthly':yr?'Yearly':'Quarterly',excessCycle:q?'Quarterly':mo?'Monthly':'Quarterly',leaseFrom:'',leaseTo:'',excessFrom:'',excessTo:'',billAnchor:r.start,billCycleName:r.cycle,contractStatus:r.status};
    c.machines.push(mac); nm++; ex[normSr(r.serial)]=c.name; if(typeof addModel==='function') addModel({model:mac.model,brand:r.brand}); });
  save(); try{ renderAll(); }catch(e){} IMP.rows=[]; toast(nm+' machine(s), '+nk+' new contract(s) and '+nc+' new customer(s) imported.'); XA.refresh(); };

/* ---------------- 3. BILLING CALENDAR / READING TRACKER (all lease customers) ---------------- */
const num=v=>parseFloat(v)||0;
const kOf=(c,m)=>(c.contracts||[]).find(x=>x.id===m.contractId)||(c.contracts||[])[0]||{};
const isLease=(c,m,k)=>/lease/i.test(k.type||'')||num(m.monthlyLease)>0||num(c.monthlyLease)>0;
const anchorOf=(c,m,k)=>m.startDate||k.start||'';
function leaseStep(c,m){ const own=num(m.monthlyLease)>0||m.billM||m.billQ||m.billY; const cyc=own?m.leaseCycle:(num(c.monthlyLease)>0?c.leaseCycle:m.leaseCycle); return CYC[String(cyc||'').toLowerCase()]||1; }
function hasExcess(c,m){ return [m.rateMono,m.rateColor,m.ratePlot,m.rateA0,m.rateA1,m.rateA2,c.rateMono,c.rateColor].some(v=>num(v)>0); }
function excessStep(c,m){ if(!hasExcess(c,m)) return 0; const cyc=num(m.rateMono)+num(m.rateColor)+num(m.ratePlot)>0?m.excessCycle:(c.excessCycle||m.excessCycle); return CYC[String(cyc||'').toLowerCase()]||0; }
/* reading dates of one machine: lease bill dates and excess bill dates, from the contract start date until the contract end date */
function schedule(m,c,k){ c=c||{}; k=k||{}; const st=anchorOf(c,m,k); if(!st) return []; const end=m.endDate||k.end||''; const lim=end||addMonthsISO(todayISO(),24); const by={};
  const gen=(step,tag)=>{ if(!step) return; for(let i=0;i<600;i++){ const d=addMonthsISO(st,i*step); if(d>lim) break; (by[d]=by[d]||{}).date=d; by[d][tag]=true; } };
  gen(leaseStep(c,m),'L'); gen(excessStep(c,m),'E');
  return Object.values(by).sort((a,b)=>a.date.localeCompare(b.date)).map(x=>({date:x.date,tag:x.L&&x.E?'Lease + Excess':x.L?'Lease':'Excess'})); }
XA.schedule=schedule;
const marks=m=>(m.readMarks=m.readMarks||{});
function collected(m,row){ const mk=marks(m)[row.date]; if(mk&&mk.done) return {by:'mark',on:mk.on}; const ym=row.date.slice(0,7); const r=(m.readings||[]).find(x=>x.month===ym); if(r) return {by:'reading',on:r.date||''}; return null; }
const BC={view:'month',month:todayISO().slice(0,7),grp:'',cust:'',st:'all',kind:'lease',q:''};
function build(){ const rows=[],missing=[]; const q=BC.q.toLowerCase();
  DB.customers.forEach(c=>{ if(BC.grp&&(c.group||'')!==BC.grp) return; if(BC.cust&&c.id!==BC.cust) return;
    c.machines.forEach(m=>{ if(m.status!=='Active') return; const k=kOf(c,m); if(BC.kind==='lease'&&!isLease(c,m,k)) return;
      if(q&&!(c.name+' '+(m.department||'')+' '+(m.model||'')+' '+(m.serial||'')+' '+(k.ref||'')+' '+(m.eqid||'')).toLowerCase().includes(q)) return;
      const sc=schedule(m,c,k); if(!sc.length){ missing.push({c,m,k}); return; }
      sc.forEach(s=>rows.push({c,m,k,date:s.date,tag:s.tag,col:collected(m,s)})); }); });
  rows.sort((a,b)=>a.date.localeCompare(b.date)||a.c.name.localeCompare(b.c.name)||(a.m.department||'').localeCompare(b.m.department||'')); return {rows,missing}; }
const stOK=r=>BC.st==='all'||(BC.st==='done')===!!r.col;
const groups=()=>[...new Set(DB.customers.map(c=>c.group).filter(Boolean))];
const sel=(id,opts,val,fn)=>'<select id="'+id+'" onchange="'+fn+'" style="width:auto">'+opts.map(o=>'<option value="'+esc(o[0])+'"'+(o[0]===val?' selected':'')+'>'+esc(o[1])+'</option>').join('')+'</select>';
const tabBtn=(v,l)=>'<button class="btn sm '+(BC.view===v?'':'ghost')+'" onclick="XA.bcSet(\'view\',\''+v+'\')">'+l+'</button>';
XA.reg('bcal',{title:'Billing Calendar',render(){
  const D=build(), G=groups();
  const head='<div class="sec" style="margin-top:0;flex-wrap:wrap;gap:8px"><h2>Billing Calendar · Reading Tracker</h2><span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
   +sel('bc_kind',[['lease','Lease customers'],['all','All active machines']],BC.kind,'XA.bcSet(\'kind\',this.value)')
   +sel('bc_grp',[['','All groups']].concat(G.map(x=>[x,x])),BC.grp,'XA.bcSet(\'grp\',this.value)')
   +sel('bc_cust',[['','All customers']].concat(DB.customers.filter(c=>!BC.grp||c.group===BC.grp).map(c=>[c.id,c.name])),BC.cust,'XA.bcSet(\'cust\',this.value)')
   +sel('bc_st',[['all','All readings'],['pend','Pending'],['done','Collected']],BC.st,'XA.bcSet(\'st\',this.value)')
   +'<input id="bc_q" placeholder="Search customer, dept, model, Sr.#…" value="'+esc(BC.q)+'" style="width:230px" oninput="XA.bcQ(this.value)"></span></div>'
   +'<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">'+tabBtn('month','Month list')+tabBtn('year','Year overview')+tabBtn('missing','Missing start dates'+(D.missing.length?' ('+D.missing.length+')':''))+tabBtn('price','Lease prices'+(noPrice().length?' ('+noPrice().length+')':''))+'</div>';
  return head+(BC.view==='year'?yearView(D):BC.view==='missing'?missingView(D):BC.view==='price'?priceView():monthView(D)); }});
function monthNav(){ const y=+BC.month.slice(0,4), mo=+BC.month.slice(5); const prev=addMonthsISO(BC.month+'-01',-1).slice(0,7), next=addMonthsISO(BC.month+'-01',1).slice(0,7);
  return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn sm ghost" onclick="XA.bcSet(\'month\',\''+prev+'\')">◀</button><b style="font-size:1.15rem;min-width:110px;text-align:center">'+MON[mo-1]+' '+y+'</b><button class="btn sm ghost" onclick="XA.bcSet(\'month\',\''+next+'\')">▶</button><button class="btn sm ghost" onclick="XA.bcSet(\'month\',\''+todayISO().slice(0,7)+'\')">This month</button><button class="btn sm ghost" style="margin-left:auto" onclick="XA.bcExport()">Export month to Excel</button></div>'; }
function monthView(D){ const today=todayISO(), all=D.rows.filter(r=>r.date.slice(0,7)===BC.month), L=all.filter(stOK), done=all.filter(r=>r.col).length;
  const from=addMonthsISO(today,-6), od=D.rows.filter(r=>!r.col&&r.date<today.slice(0,7)+'-01'&&r.date>=from).length;
  const kp=(b,l,c)=>'<div class="stat"'+(c?' style="border-color:'+c+'"':'')+'><b>'+b+'</b><span>'+l+'</span></div>';
  const stats='<div class="stats" style="margin:10px 0">'+kp(all.length,'Readings due in '+monLabel(BC.month))+kp(done,'Collected','#16a34a')+kp(all.length-done,'Pending','#d97706')+kp(od,'Overdue (earlier 6 months)',od?'#dc2626':'')+'</div>';
  let body=''; let last='';
  L.forEach(r=>{ if(r.c.id!==last){ last=r.c.id; const mine=all.filter(x=>x.c.id===r.c.id); body+='<tr style="background:var(--bg,#f5f6f8)"><td colspan="7"><b>'+esc(r.c.name)+'</b>'+(r.c.group?' <span class="kdept">· '+esc(r.c.group)+'</span>':'')+' <span class="badge '+(mine.every(x=>x.col)?'good':'warn')+'" style="float:right">'+mine.filter(x=>x.col).length+'/'+mine.length+' collected</span></td></tr>'; }
    const late=!r.col&&r.date<today;
    body+='<tr><td><b>'+fmt(r.date)+'</b>'+(late?'<div><span class="badge bad">Past due</span></div>':'')+'</td><td>'+esc(r.m.department||'—')+'</td><td>'+esc(r.m.model||'')+'<div class="kdept">'+esc(r.m.serial||'')+'</div></td><td>'+esc(r.k.ref||'—')+'<div class="kdept">'+fmt(anchorOf(r.c,r.m,r.k))+' → '+fmt(r.m.endDate||r.k.end)+'</div></td><td>'+esc(r.tag)+'</td><td>'+tick(r)+'</td><td><button class="btn sm ghost" onclick="XA.bcRead(\''+r.c.id+'\',\''+r.m.id+'\',\''+r.date.slice(0,7)+'\')">Enter reading</button></td></tr>'; });
  return '<div class="card"><div class="pad">'+monthNav()+stats+'</div>'+(L.length?'<div class="tw bcs"><table><thead><tr><th>Date</th><th>Department</th><th>Machine</th><th>Contract</th><th>Reading for</th><th>Reading collected</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div>':'<div class="empty">Nothing due in this month'+(BC.st!=='all'||BC.q?' for the current filters':'')+'.</div>')+'</div>'; }
function tick(r){ const auto=r.col&&r.col.by==='reading';
  return '<label style="margin:0;display:flex;gap:6px;align-items:center;cursor:'+(auto?'default':'pointer')+'"><input type="checkbox" '+(r.col?'checked':'')+(auto?' disabled':'')+' onchange="XA.bcMark(\''+r.c.id+'\',\''+r.m.id+'\',\''+r.date+'\',this.checked)" style="width:auto">'+(r.col?'<span class="badge good">Collected'+(r.col.on?' '+fmt(String(r.col.on).slice(0,10)):'')+(auto?' · reading saved':'')+'</span>':'<span class="badge warn">Pending</span>')+'</label>'; }
function yearView(D){ const y=+BC.month.slice(0,4), today=todayISO(); const byM={};
  D.rows.filter(r=>r.date.slice(0,4)==y&&stOK(r)).forEach(r=>{ (byM[r.m.id]=byM[r.m.id]||{c:r.c,m:r.m,k:r.k,cells:{}}).cells[+r.date.slice(5,7)]=r; });
  const list=Object.values(byM).sort((a,b)=>a.c.name.localeCompare(b.c.name)||(a.m.department||'').localeCompare(b.m.department||''));
  const th=MON.map(x=>'<th style="text-align:center">'+x+'</th>').join(''); const tot=Array(13).fill(0), dn=Array(13).fill(0); let last='',body='';
  list.forEach(o=>{ if(o.c.id!==last){ last=o.c.id; body+='<tr class="grp" style="background:var(--bg,#f5f6f8)"><td colspan="13"><b>'+esc(o.c.name)+'</b>'+(o.c.group?' <span class="kdept">· '+esc(o.c.group)+'</span>':'')+'</td></tr>'; }
    let cells=''; for(let mo=1;mo<=12;mo++){ const r=o.cells[mo]; if(!r){ cells+='<td></td>'; continue; } tot[mo]++; let bg,txt,col; if(r.col){ dn[mo]++; bg='#dcfce7'; col='#166534'; txt='✓ '+r.date.slice(8); } else if(r.date<today){ bg='#fee2e2'; col='#991b1b'; txt='! '+r.date.slice(8); } else { bg='#fef3c7'; col='#92400e'; txt=r.date.slice(8); }
      cells+='<td style="text-align:center;padding:2px"><button title="'+fmt(r.date)+' · '+esc(r.tag)+'" onclick="XA.bcJump(\''+r.date.slice(0,7)+'\')" style="border:0;border-radius:6px;background:'+bg+';color:'+col+';font-weight:600;padding:5px 8px;cursor:pointer;min-width:44px">'+txt+'</button></td>'; }
    body+='<tr><td style="white-space:nowrap">'+esc(o.m.department||'—')+'<div class="kdept">'+esc(o.m.model||'')+' · '+esc(o.m.serial||'')+'</div></td>'+cells+'</tr>'; });
  const foot='<tr><td><b>Collected / due</b></td>'+Array.from({length:12},(_,i)=>'<td style="text-align:center"><b>'+(tot[i+1]?dn[i+1]+'/'+tot[i+1]:'—')+'</b></td>').join('')+'</tr>';
  return '<div class="card"><div class="pad" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn sm ghost" onclick="XA.bcSet(\'month\',\''+(y-1)+'-'+BC.month.slice(5)+'\')">◀</button><b style="font-size:1.15rem">'+y+'</b><button class="btn sm ghost" onclick="XA.bcSet(\'month\',\''+(y+1)+'-'+BC.month.slice(5)+'\')">▶</button><span class="kdept">Day of month shown · <span class="badge good">✓ collected</span> <span class="badge warn">upcoming</span> <span class="badge bad">! overdue</span> · click a cell to open that month</span></div>'
   +(list.length?'<div class="tw bcs bcy"><table><thead><tr><th>Department / machine</th>'+th+'</tr></thead><tbody>'+body+foot+'</tbody></table></div>':'<div class="empty">No readings for '+y+' with the current filters.</div>')+'</div>'; }
function missingView(D){ const body=D.missing.map(o=>'<tr><td>'+esc(o.c.name)+'</td><td>'+esc(o.m.department||'—')+'</td><td>'+esc(o.m.model||'')+'<div class="kdept">'+esc(o.m.serial||'')+'</div></td><td><input type="date" id="bs_'+o.m.id+'" style="width:auto"></td><td><button class="btn sm" onclick="XA.bcStart(\''+o.c.id+'\',\''+o.m.id+'\')">Save</button></td></tr>').join('');
  return '<div class="card"><div class="pad"><div class="hint">These machines have no machine start date and no contract start date, so their reading dates cannot be worked out. Enter the date billing starts (the day of the month becomes the billing day).</div></div>'+(D.missing.length?'<div class="tw"><table><thead><tr><th>Customer</th><th>Department</th><th>Machine</th><th>Billing start date</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div>':'<div class="empty">Every machine has a start date. ✓</div>')+'</div>'; }
/* lease price per billing cycle (needed for advance lease bills) */
function ownPrice(c,m){ return !(num(m.monthlyLease)>0||m.billM||m.billQ||m.billY)&&num(c.monthlyLease)>0; }
function priceOf(c,m){ const st=leaseStep(c,m); return st===3?num(m.priceQ):st===12?num(m.priceY):num(m.monthlyLease)*st; }
function noPrice(){ const out=[]; DB.customers.forEach(c=>{ if(BC.grp&&(c.group||'')!==BC.grp) return; if(BC.cust&&c.id!==BC.cust) return; c.machines.forEach(m=>{ if(m.status!=='Active') return; const k=kOf(c,m); if(!/lease/i.test(k.type||'')&&!(num(m.monthlyLease)>0)) return; if(ownPrice(c,m)) return; if(priceOf(c,m)>0) return; out.push({c,m,k,st:leaseStep(c,m)}); }); }); return out; }
const cycName=st=>st===1?'Monthly':st===3?'Quarterly':st===12?'Yearly':st+' months';
function priceView(){ const L=noPrice(); const body=L.map(o=>'<tr><td>'+esc(o.c.name)+'</td><td>'+esc(o.m.department||'—')+'</td><td>'+esc(o.m.model||'')+'<div class="kdept">'+esc(o.m.serial||'')+'</div></td><td>'+cycName(o.st)+' · advance</td><td><input type="number" min="0" step="0.01" id="pr_'+o.m.id+'" style="width:120px"></td><td><button class="btn sm" onclick="XA.bcPrice(\''+o.c.id+'\',\''+o.m.id+'\')">Save</button></td></tr>').join('');
  return '<div class="card"><div class="pad"><div class="hint">Lease bills are raised in advance (monthly / quarterly / yearly). A machine with no lease amount gives “No billable lease or excess charges”, even when its copies are unlimited. Enter the lease amount for one billing cycle (AED, ex-VAT).</div>'+(L.length?'<div style="display:flex;gap:8px;align-items:end;margin-top:8px;flex-wrap:wrap"><div class="field" style="margin:0"><label>Same amount for all machines listed</label><input type="number" min="0" step="0.01" id="pr_all" style="width:160px"></div><button class="btn sm ghost" onclick="XA.bcPriceAll()">Save for all listed</button></div>':'')+'</div>'+(L.length?'<div class="tw bcs"><table><thead><tr><th>Customer</th><th>Department</th><th>Machine</th><th>Billing</th><th>Lease per cycle (AED)</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div>':'<div class="empty">Every lease machine has a lease amount. ✓</div>')+'</div>'; }
function setPrice(c,m,v){ const st=leaseStep(c,m); if(st===3){ m.priceQ=v; m.billQ=true; } else if(st===12){ m.priceY=v; m.billY=true; } else { m.monthlyLease=v/st; m.billM=true; } }
XA.bcPrice=(cid,mid)=>{ const v=parseFloat((g('pr_'+mid)||{}).value); if(!(v>0)){ toast('Enter the lease amount first.',true); return; } const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid); if(!m) return; setPrice(c,m,v); save(); XA.refresh(); toast('Lease price saved.'); };
XA.bcPriceAll=()=>{ const v=parseFloat((g('pr_all')||{}).value); if(!(v>0)){ toast('Enter the lease amount first.',true); return; } let n=0; noPrice().forEach(o=>{ setPrice(o.c,o.m,v); n++; }); save(); XA.refresh(); toast('Lease price saved for '+n+' machine(s).'); };
/* clearer message when a bill finds nothing because lease prices are missing */
const _toast=window.toast; window.toast=function(msg,err){ try{ if(/No billable lease or excess/.test(String(msg))&&typeof activeCustomerId!=='undefined'){ const c=custById(activeCustomerId), o=billOpts(); if(c&&o.lf&&o.lt){ const n=monthsIn(o.lf,o.lt), la=m=>(n===12&&m.priceY>0)?m.priceY:(n===3&&m.priceQ>0)?m.priceQ:(m.monthlyLease||0)*n, bad=c.machines.filter(m=>isActive(m)&&leaseOn(m,o.lf,o.lt)&&!(la(m)>0)); if(bad.length&&!num(c.monthlyLease)) msg='No lease amount is set for '+bad.length+' machine(s) ('+bad.slice(0,3).map(m=>m.department||m.model).join(', ')+(bad.length>3?'…':'')+'). Enter it in Accounts → Billing Calendar → Lease prices, then generate the advance bill again.'; } } }catch(e){} return _toast.call(this,msg,err); };
XA.bcSet=(k,v)=>{ BC[k]=v; if(k==='grp') BC.cust=''; XA.refresh(); };
XA.bcJump=ym=>{ BC.month=ym; BC.view='month'; XA.refresh(); };
let qT; XA.bcQ=v=>{ BC.q=v; clearTimeout(qT); qT=setTimeout(()=>{ XA.refresh(); const i=g('bc_q'); if(i){ i.focus(); i.setSelectionRange(v.length,v.length); } },350); };
XA.bcMark=(cid,mid,date,on)=>{ const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid); if(!m) return; const mk=marks(m); if(on) mk[date]={done:true,on:todayISO()}; else delete mk[date]; save(); XA.refresh(); toast(on?'Reading marked as collected for '+monLabel(date.slice(0,7))+'.':'Mark removed.'); };
XA.bcRead=(cid,mid,ym)=>{ try{ openReading(cid,mid,ym); }catch(e){ toast('Open Contracts → Reading Run to enter this reading.',true); } };
XA.bcStart=(cid,mid)=>{ const v=(g('bs_'+mid)||{}).value; if(!v){ toast('Pick a date first.',true); return; } const c=custById(cid), m=c&&c.machines.find(x=>x.id===mid); if(!m) return; m.startDate=v; save(); XA.refresh(); toast('Start date saved.'); };
XA.bcExport=()=>{ const D=build(); const L=D.rows.filter(r=>r.date.slice(0,7)===BC.month&&stOK(r)); if(!L.length){ toast('Nothing to export.',true); return; }
  const data=L.map(r=>({'Billing Date':fmt(r.date),'Customer':r.c.name,'Group':r.c.group||'','Department':r.m.department||'','Brand / Model':r.m.model||'','Serial No':r.m.serial||'','Contract':r.k.ref||'','Contract Start':fmt(anchorOf(r.c,r.m,r.k)),'Contract End':fmt(r.m.endDate||r.k.end),'Reading For':r.tag,'Reading Collected':r.col?'Yes':'No'}));
  const ws=XLSX.utils.json_to_sheet(data), wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Readings '+BC.month); XLSX.writeFile(wb,'Reading-Tracker-'+BC.month+'.xlsx'); };

/* menu entries */
let menuDone=false;
setInterval(()=>{ try{ if(menuDone||typeof SD==='undefined') return; const A=SD.find(x=>x.g==='Accounts'), C=SD.find(x=>x.g==='Contracts'); if(!A||!C) return;
  if(!A.items.some(i=>i[2]==='bcal')){ const ix=A.items.findIndex(i=>i[0]==='Billing Report'); A.items.splice(ix<0?A.items.length:ix+1,0,['Billing Calendar','xa','bcal']); }
  if(!C.items.some(i=>i[2]==='ximp')) C.items.push(['Import from Excel','xa','ximp']);
  menuDone=true; sdBuild(); try{ sdSync('xa'); }catch(e){} }catch(e){} },1500);
})();
