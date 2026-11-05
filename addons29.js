/* ===== Add-on 29: Equipment ID types (MT-RM / MT-L / MT-CM / MT-SM / MT-SMF + more) - Default landed cost allocation (purchase bills)
   - Sales Returns with attachments - Shipment By Item report - Edit/Delete permissions for approved records - Custom report permissions ===== */
(function(){
'use strict';
if(!window.XA||typeof DB==='undefined') return;
const XA=window.XA, g=id=>document.getElementById(id), X29=window.X29={};
const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
const num=v=>parseFloat(v)||0, r2=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const M=v=>(typeof fmtM==='function'?fmtM(v):r2(v).toFixed(2));
const role=()=>{ const m=window.curUser&&window.curUser(); return m?m.role:null; };
const isAdmin=()=>role()==='admin';
const arr=k=>(DB[k]=DB[k]||[]);
const today=()=>(typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10));
const sv=()=>{ try{ XA.save(); }catch(e){ try{ save(); }catch(_){} } };
const H=(t,b)=>'<div class="sec" style="margin-top:0"><h2>'+t+'</h2><span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">'+(b||'')+'</span></div>';
const B=(l,f,c)=>'<button class="btn '+(c||'')+'" onclick="'+f+'">'+l+'</button>';
const NO='<div class="card pad"><div class="empty">Only the Admin can open this page.</div></div>';
const cfg=()=>{ const c=(DB.ctl29=DB.ctl29||{}); c.landed=c.landed||'value'; c.appr=c.appr||{manager:{edit:true,del:true},sales:{edit:false,del:false}}; c.rpMake=c.rpMake||{manager:true,sales:false}; return c; };
const can=(kind)=>{ const r=role(); if(!r||r==='admin') return true; const a=cfg().appr[r]; return !!(a&&a[kind]); };
const denied=(w)=>{ toast('Your role is not allowed to '+w+' approved records. Ask the Admin (Admin -> Control Settings).',true); };
const cname=id=>{ const c=(DB.customers||[]).find(x=>x.id===id); return c?c.name:'(deleted)'; };

/* ---------------- 1. Equipment ID types ---------------- */
const EQC=[['MT-RM','Rental Machine'],['MT-L','Lease Machine'],['MT-CM','Customer Machine (AMC / customer-owned)'],['MT-SM','Sale Machine'],['MT-SMF','Sale Machine with FSMA contract'],
 ['MT-SB','Standby / loaner machine'],['MT-WH','Warehouse stock machine'],['MT-UM','Used / trade-in machine'],['MT-DM','Demo machine']];
const eqMax=()=>{ const mx={}; EQC.forEach(e=>mx[e[0]]=0); (DB.customers||[]).forEach(c=>(c.machines||[]).forEach(m=>{ const x=/^(MT-[A-Z]+)-(\d+)$/i.exec(String(m.eqid||'').trim()); if(x){ const p=x[1].toUpperCase(); if(p in mx) mx[p]=Math.max(mx[p],parseInt(x[2],10)); } })); return mx; };
const fmtEq=(p,n)=>p+'-'+String(n).padStart(4,'0');
const nextEq=p=>fmtEq(p,eqMax()[p]+1);
const prefOf=v=>{ const x=/^(MT-[A-Z]+)-\d+$/i.exec(String(v||'').trim()); if(!x) return ''; const p=x[1].toUpperCase(); return EQC.some(e=>e[0]===p)?p:''; };
function injectEq(){ const inp=g('m_eqid'); if(!inp) return;
  if(!g('m_eqcat')){ const fld=inp.closest('.field')||inp.parentNode; const w=document.createElement('div'); w.className='field';
    w.innerHTML='<label>Equipment type (fills the next Equipment ID)</label><select id="m_eqcat"><option value="">-- choose --</option>'+EQC.map(e=>'<option value="'+e[0]+'">'+e[0]+' - '+E(e[1])+'</option>').join('')+'</select>';
    fld.parentNode.insertBefore(w,fld); g('m_eqcat').onchange=function(){ if(!this.value) return; inp.value=nextEq(this.value); this.dataset.v=inp.value; }; }
  const s=g('m_eqcat'); if(document.activeElement!==s&&s.dataset.v!==inp.value){ s.value=prefOf(inp.value); s.dataset.v=inp.value; } }
const kindOf=(c,m)=>{ if(m.status==='Warehouse') return 'MT-WH'; if(m.status&&m.status!=='Active') return ''; let t=''; try{ const k=kOf(c,m); t=String((k&&k.type)||'').toLowerCase(); }catch(e){}
  return /fsma/.test(t)?'MT-SMF':/ors|sale/.test(t)?'MT-SM':/amc/.test(t)?'MT-CM':/rent/.test(t)?'MT-RM':/lease/.test(t)?'MT-L':''; };
X29.eqAssign=function(){ if(!isAdmin()){ toast('Only the Admin can do this.',true); return; } const mx=eqMax(); let n=0; const plan=[];
  (DB.customers||[]).forEach(c=>(c.machines||[]).forEach(m=>{ if(String(m.eqid||'').trim()) return; const p=kindOf(c,m); if(p) plan.push([m,p]); }));
  if(!plan.length){ toast('Every machine that can be classified already has an Equipment ID.'); return; }
  askConfirm('Give an Equipment ID to '+plan.length+' machine(s) that have none (by contract type)? Existing IDs are not changed.',()=>{ plan.forEach(([m,p])=>{ mx[p]++; m.eqid=fmtEq(p,mx[p]); n++; }); sv(); toast(n+' Equipment ID(s) assigned.'); XA.refresh(); }); };
function cvHist(){ const L=[]; (DB.customers||[]).forEach(c=>(c.machines||[]).forEach(m=>(m.eqHist||[]).forEach(h=>L.push({c,m,h})))); L.sort((a,b)=>b.h.date.localeCompare(a.h.date)); return '<h3 style="margin:14px 0 6px">Conversion history</h3>'+(L.length?'<div class="card" style="overflow:auto"><table><thead><tr><th>Date</th><th>Customer</th><th>Machine</th><th>Old ID</th><th>New ID</th><th>By</th><th>Note</th></tr></thead><tbody>'+L.map(x=>'<tr><td>'+E(x.h.date)+'</td><td>'+E(x.c.name)+'</td><td>'+E((x.m.model||'')+' '+(x.m.serial||''))+'</td><td>'+E(x.h.from||'-')+'</td><td><b>'+E(x.h.to)+'</b></td><td>'+E(x.h.by)+'</td><td>'+E(x.h.note||'')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="xa-hint">No conversions yet. Use the Convert button on a machine row.</div>'); }
XA.reg('eqi',{title:'Equipment ID types',render(){ if(!isAdmin()) return NO; const mx=eqMax(); let blank=0; (DB.customers||[]).forEach(c=>(c.machines||[]).forEach(m=>{ if(!String(m.eqid||'').trim()) blank++; }));
  return H('Equipment ID types',B('Auto-assign blank IDs','X29.eqAssign()'))+'<div class="hint" style="margin:6px 0">In <b>Add Machine</b> pick the Equipment type and the next number is filled (you can still edit it). IDs look like <b>MT-L-0001</b>. Auto-assign uses each machine\'s contract type (Lease -> MT-L, Sale (ORS) -> MT-SM, FSMA -> MT-SMF, AMC -> MT-CM, Warehouse status -> MT-WH). <b>'+blank+'</b> machine(s) currently have no Equipment ID.</div>'
   +'<div class="card" style="overflow:auto"><table><thead><tr><th>Prefix</th><th>Meaning</th><th class="n">Highest used</th><th>Next ID</th></tr></thead><tbody>'+EQC.map(e=>'<tr><td><b>'+e[0]+'</b></td><td>'+E(e[1])+'</td><td class="n">'+mx[e[0]]+'</td><td>'+nextEq(e[0])+'</td></tr>').join('')+'</tbody></table></div>'+cvHist(); }});

/* ---------------- 2. Landed cost on purchase bills ---------------- */
const LM=[['value','By value (cost of each line)'],['qty','By quantity'],['equal','Equally per line']];
function allocate(rows,amt,method){ const w=rows.map(r=>method==='qty'?num(r.qty):method==='equal'?1:num(r.qty)*num(r.rate)); const t=w.reduce((a,b)=>a+b,0)||1; const o=rows.map((r,i)=>r2(amt*w[i]/t)); const d=r2(amt-o.reduce((a,b)=>a+b,0)); if(o.length) o[o.length-1]=r2(o[o.length-1]+d); return o; }
function injectLanded(id){ const lab=g('pb_stock')&&g('pb_stock').parentNode; if(!lab) return; let box=g('pbLanded');
  if(!box){ box=document.createElement('div'); box.id='pbLanded'; box.style.cssText='margin-top:10px;padding:8px 10px;border:1px dashed #9aa5bd;border-radius:8px;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end';
    box.innerHTML='<div style="flex:1 1 150px"><label style="font-size:.8rem">Landed costs (freight, customs, other) AED</label><input class="xa-in" type="number" step="any" id="pbl_amt" placeholder="0.00"></div><div style="flex:1 1 220px"><label style="font-size:.8rem">Allocate to items</label><select class="xa-in" id="pbl_m">'+LM.map(m=>'<option value="'+m[0]+'">'+m[1]+'</option>').join('')+'</select></div><div class="xa-hint" style="flex:2 1 240px">Added to each item\'s cost price (stock cost = rate + its share). The bill total is not changed.</div>';
    lab.parentNode.insertBefore(box,lab); }
  const b=id&&arr('purchases').find(x=>x.id===id); g('pbl_amt').value=b&&b.landed?b.landed.amt:''; g('pbl_m').value=b&&b.landed?b.landed.method:cfg().landed; }
function wrapPb(){ if(!XA.pbOpen||XA.pbOpen.__g29||!XA.pbSave) return;
  const po=XA.pbOpen; XA.pbOpen=function(id){ if(id&&!can('edit')){ denied('edit'); return; } const r=po.apply(this,arguments); try{ injectLanded(id); }catch(e){} return r; }; XA.pbOpen.__g29=1;
  const ps=XA.pbSave; XA.pbSave=function(){ const amt=num(g('pbl_amt')&&g('pbl_amt').value), meth=g('pbl_m')?g('pbl_m').value:cfg().landed, pid=XA.pb&&XA.pb.id, tick=!!(g('pb_stock')&&g('pb_stock').checked&&g('pb_stock').parentNode.style.display!=='none'), P=arr('purchases'), n0=P.length;
    ps.apply(this,arguments); const bill=pid?P.find(x=>x.id===pid):(P.length>n0?P[P.length-1]:null); if(!bill) return;
    if(!(amt>0)){ if(bill.landed){ delete bill.landed; bill.rows.forEach(r=>{ delete r.lc; }); sv(); } return; }
    const lc=allocate(bill.rows,amt,meth); bill.rows.forEach((r,i)=>{ r.lc=lc[i]; }); bill.landed={amt:r2(amt),method:meth};
    if(!pid&&tick) bill.rows.forEach(r=>{ const key=(r.desc||r.code).toLowerCase(); const s=DB.stock.find(x=>(x.code&&r.code&&x.code.toLowerCase()===r.code.toLowerCase())||String(x.item||'').toLowerCase()===key); if(s&&r.qty>0) s.cost=r2(r.rate+r.lc/r.qty); });
    sv(); toast('Landed cost of AED '+M(amt)+' allocated '+(LM.find(m=>m[0]===meth)||[0,''])[1].toLowerCase()+'.'); };
  XA.pbSave.__g29=1;
  const pd=XA.pbDel; if(pd&&!pd.__g29){ XA.pbDel=function(){ if(!can('del')){ denied('delete'); return; } return pd.apply(this,arguments); }; XA.pbDel.__g29=1; } }

/* ---------------- 3. Approved records: edit / delete permission ---------------- */
function guard(name,kind,what){ const o=window[name]; if(typeof o!=='function'||o.__g29) return; const f=function(){ if(!can(kind)){ denied(what); return; } return o.apply(this,arguments); }; f.__g29=1; window[name]=f; }
function guards(){ guard('invDel','del','delete'); guard('deleteLedger','del','delete'); guard('invEdit','edit','edit'); }

/* ---------------- 4. Custom report permissions ---------------- */
function wrapRp(){ if(typeof window.rpAll==='function'&&!window.rpAll.__g29){ const o=window.rpAll; const f=function(){ const L=o.apply(this,arguments); const r=role(); if(!r||r==='admin') return L; const V=DB.rpVis||{}; return L.filter(x=>{ if(!x.custom) return true; const v=V[x.id]||'all'; return v==='all'||(v==='mgr'&&r==='manager'); }); }; f.__g29=1; window.rpAll=f; }
  ['rpSaveCustom','rpDelCustom','rpEdSave'].forEach(n=>{ const o=window[n]; if(typeof o!=='function'||o.__g29) return; const f=function(){ const r=role(); if(r&&r!=='admin'&&!cfg().rpMake[r]){ toast('Only the Admin can create, edit or delete custom reports (Admin -> Control Settings).',true); return; } return o.apply(this,arguments); }; f.__g29=1; window[n]=f; }); }

XA.reg('ctl29',{title:'Control settings',render(){ if(!isAdmin()) return NO; const c=cfg(), V=DB.rpVis||{}, rs=[['manager','Manager'],['sales','Sales Executive']];
  const sec=(t,b)=>'<div class="card pad" style="margin-bottom:12px"><h3 style="margin:0 0 6px">'+t+'</h3>'+b+'</div>';
  return H('Control settings')
   +sec('Default Landed Cost Allocation Method','<div class="xa-hint" style="margin:0 0 6px">Used when you enter landed costs (freight, customs) on a purchase bill. You can still change it per bill.</div><select class="xa-in" style="max-width:280px" onchange="X29.setLanded(this.value)">'+LM.map(m=>'<option value="'+m[0]+'"'+(c.landed===m[0]?' selected':'')+'>'+m[1]+'</option>').join('')+'</select>')
   +sec('Edit and delete approved records','<div class="xa-hint" style="margin:0 0 6px">Applies to issued invoices, payments / credit notes and purchase bills. Admin can always edit and delete.</div><table><thead><tr><th>Role</th><th>Can edit</th><th>Can delete</th></tr></thead><tbody>'+rs.map(r=>'<tr><td>'+r[1]+'</td>'+['edit','del'].map(k=>'<td><input type="checkbox" '+((c.appr[r[0]]||{})[k]?'checked':'')+' onchange="X29.setAppr(\''+r[0]+'\',\''+k+'\',this.checked)"></td>').join('')+'</tr>').join('')+'</tbody></table>')
   +sec('Custom reports','<div class="xa-hint" style="margin:0 0 6px">Who may create, rename or delete custom reports, and who can see each one.</div><table><thead><tr><th>Role</th><th>Can create / edit / delete custom reports</th></tr></thead><tbody>'+rs.map(r=>'<tr><td>'+r[1]+'</td><td><input type="checkbox" '+(c.rpMake[r[0]]?'checked':'')+' onchange="X29.setMake(\''+r[0]+'\',this.checked)"></td></tr>').join('')+'</tbody></table>'
     +((DB.rpCustom||[]).length?'<table style="margin-top:10px"><thead><tr><th>Custom report</th><th>Visible to</th></tr></thead><tbody>'+DB.rpCustom.map(x=>'<tr><td>'+E(x.n)+'</td><td><select class="xa-in" onchange="X29.setVis(\''+x.id+'\',this.value)">'+[['all','Everyone'],['mgr','Manager and Admin'],['admin','Admin only']].map(o=>'<option value="'+o[0]+'"'+((V[x.id]||'all')===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></td></tr>').join('')+'</tbody></table>':'<div class="xa-hint" style="margin-top:8px">No custom reports saved yet (Reports -> open a report -> Save as custom).</div>')); }});
X29.setLanded=v=>{ cfg().landed=v; sv(); };
X29.setAppr=(r,k,v)=>{ const c=cfg(); (c.appr[r]=c.appr[r]||{})[k]=v; sv(); };
X29.setMake=(r,v)=>{ cfg().rpMake[r]=v; sv(); };
X29.setVis=(id,v)=>{ (DB.rpVis=DB.rpVis||{})[id]=v; sv(); };

/* ---------------- 5. Sales Returns (with attached files) ---------------- */
const SR=()=>arr('salesReturns'); let sr=null;
function shrink(file){ return new Promise(res=>{ if(/^image\//.test(file.type)){ const r=new FileReader(); r.onload=()=>{ const im=new Image(); im.onload=()=>{ const k=Math.min(1,1400/Math.max(im.width,im.height)), c=document.createElement('canvas'); c.width=Math.round(im.width*k); c.height=Math.round(im.height*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height); const d=c.toDataURL('image/jpeg',.6); res({id:uid(),name:file.name.replace(/\.\w+$/,'')+'.jpg',mime:'image/jpeg',kb:Math.round(d.length*.75/1024),data:d,added:today()}); }; im.onerror=()=>res(null); im.src=r.result; }; r.readAsDataURL(file); }
  else if(file.type==='application/pdf'){ if(file.size>900*1024){ toast(file.name+' is over 900 KB, not attached.',true); res(null); return; } const r=new FileReader(); r.onload=()=>res({id:uid(),name:file.name,mime:'application/pdf',kb:Math.round(file.size/1024),data:r.result,added:today()}); r.readAsDataURL(file); }
  else { toast('Only photos or PDF files can be attached.',true); res(null); } }); }
async function readAll(list){ const o=[]; for(const f of Array.from(list||[])){ const x=await shrink(f); if(x) o.push(x); } return o; }
const sumR=rows=>r2(rows.reduce((s,r)=>s+num(r.qty)*num(r.rate)*(1+num(r.tax)/100),0));
const invList=cid=>{ const s=new Set(); (DB.invoices||[]).forEach(i=>{ if(i.cid===cid&&i.no) s.add(i.no); }); (DB.sales||[]).forEach(l=>{ if(l.cid===cid&&l.inv) s.add(l.inv); }); return Array.from(s); };
function srOv(){ let ov=g('x29Sr'); if(ov) return ov; ov=document.createElement('div'); ov.className='overlay'; ov.id='x29Sr'; document.body.appendChild(ov); return ov; }
function srDraw(){ const ov=srOv(); const cs=(DB.customers||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  ov.innerHTML='<div class="modal" style="max-width:900px;width:96vw"><h3>New sales return</h3><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px"><div style="flex:2 1 220px"><label style="font-size:.8rem">Customer</label><select class="xa-in" onchange="X29.srCust(this.value)"><option value="">-- choose --</option>'+cs.map(c=>'<option value="'+c.id+'"'+(sr.cid===c.id?' selected':'')+'>'+E(c.name)+'</option>').join('')+'</select></div><div style="flex:1 1 130px"><label style="font-size:.8rem">Return date</label><input class="xa-in" type="date" value="'+sr.date+'" onchange="X29.sr.date=this.value"></div><div style="flex:1 1 170px"><label style="font-size:.8rem">Invoice #</label><input class="xa-in" list="x29Inv" value="'+E(sr.inv)+'" oninput="X29.sr.inv=this.value"><datalist id="x29Inv">'+invList(sr.cid).map(n=>'<option value="'+E(n)+'">').join('')+'</datalist></div></div>'
   +'<div class="xa-bar"><button class="btn sm ghost" onclick="X29.srLoad()">Load lines of this invoice</button><button class="btn sm ghost" onclick="X29.srAdd()">+ Add row</button></div><datalist id="x29Items">'+(DB.stock||[]).map(s=>'<option value="'+E(s.item)+'">').join('')+'</datalist>'
   +'<div class="tw"><table class="xa-tbl"><thead><tr><th style="min-width:200px">Item</th><th>Qty returned</th><th>Rate (excl. VAT)</th><th>VAT %</th><th class="n">Amount</th><th></th></tr></thead><tbody>'+sr.rows.map((r,i)=>'<tr><td><input class="xa-in" list="x29Items" value="'+E(r.item)+'" oninput="X29.sr.rows['+i+'].item=this.value"></td><td><input class="xa-in" type="number" step="any" value="'+r.qty+'" oninput="X29.sr.rows['+i+'].qty=(parseFloat(this.value)||0);X29.srTot()"></td><td><input class="xa-in" type="number" step="any" value="'+r.rate+'" oninput="X29.sr.rows['+i+'].rate=(parseFloat(this.value)||0);X29.srTot()"></td><td><input class="xa-in" type="number" step="any" value="'+r.tax+'" oninput="X29.sr.rows['+i+'].tax=(parseFloat(this.value)||0);X29.srTot()"></td><td class="n">'+M(num(r.qty)*num(r.rate)*(1+num(r.tax)/100))+'</td><td><button class="btn sm ghost" onclick="X29.srDel('+i+')">x</button></td></tr>').join('')+'</tbody></table></div>'
   +'<div style="text-align:right;font-weight:700;margin:6px 0" id="x29Tot">Credit note total AED '+M(sumR(sr.rows))+'</div>'
   +'<div style="display:flex;gap:8px;flex-wrap:wrap"><div style="flex:2 1 260px"><label style="font-size:.8rem">Reason</label><input class="xa-in" value="'+E(sr.reason)+'" oninput="X29.sr.reason=this.value" placeholder="Damaged, wrong item, not needed..."></div><div style="flex:2 1 260px"><label style="font-size:.8rem">Attach files (photos / PDF, e.g. return note, damage photo)</label><input type="file" id="x29F" multiple accept="image/*,application/pdf"></div></div>'
   +'<label style="display:inline-flex;gap:6px;align-items:center;margin-top:8px;font-size:.85rem"><input type="checkbox" '+(sr.restock?'checked':'')+' onchange="X29.sr.restock=this.checked"> Add the returned quantities back to stock</label><div class="xa-hint">Saving also creates a Credit Note on the customer account, so statements and ageing reflect it.</div>'
   +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn ghost" onclick="closeModal(\'x29Sr\')">Cancel</button><button class="btn" onclick="X29.srSave()">Save sales return</button></div></div>'; }
X29.srOpen=function(){ if(!XA.needFin()) return; sr=X29.sr={cid:'',date:today(),inv:'',reason:'',restock:true,rows:[{item:'',qty:1,rate:0,tax:5}]}; srDraw(); openModal('x29Sr'); };
X29.srCust=v=>{ sr.cid=v; srDraw(); };
X29.srAdd=()=>{ sr.rows.push({item:'',qty:1,rate:0,tax:5}); srDraw(); };
X29.srDel=i=>{ sr.rows.splice(i,1); if(!sr.rows.length) sr.rows.push({item:'',qty:1,rate:0,tax:5}); srDraw(); };
X29.srTot=()=>{ const t=g('x29Tot'); if(t) t.textContent='Credit note total AED '+M(sumR(sr.rows)); };
X29.srLoad=()=>{ const n=(sr.inv||'').trim(); const L=(DB.sales||[]).filter(l=>l.inv===n&&(!sr.cid||l.cid===sr.cid)); if(!L.length){ toast('No item lines found for that invoice number (lease invoices have no item lines).',true); return; } if(!sr.cid) sr.cid=L[0].cid; sr.rows=L.map(l=>({item:l.item,qty:num(l.qty),rate:num(l.rate)*(1-num(l.disc)/100),tax:num(l.taxp)})); srDraw(); };
X29.srSave=async function(){ if(!sr.cid){ toast('Choose a customer.',true); return; } const rows=sr.rows.filter(r=>String(r.item||'').trim()&&num(r.qty)>0); if(!rows.length){ toast('Add at least one item with a quantity.',true); return; } const total=sumR(rows); if(!(total>0)){ toast('Enter the rate of the returned items.',true); return; }
  const files=await readAll(g('x29F')&&g('x29F').files); const id=uid(), no='SR-'+String(DB.srSeq=(DB.srSeq||0)+1).padStart(4,'0'); const restocked=[];
  if(sr.restock) rows.forEach(r=>{ const s=(DB.stock||[]).find(x=>String(x.item||'').toLowerCase()===r.item.trim().toLowerCase()); if(s&&!(window.isSvcItem&&window.isSvcItem(s))){ s.qty=num(s.qty)+num(r.qty); restocked.push({item:s.item,qty:num(r.qty)}); } });
  const lid=uid(); (DB.ledger=DB.ledger||[]).push({id:lid,cid:sr.cid,date:sr.date,type:'credit',amount:total,method:'',ref:no+(sr.inv?' / '+sr.inv:''),note:sr.reason||'Sales return',srId:id});
  SR().push({id,no,cid:sr.cid,date:sr.date,inv:sr.inv.trim(),reason:sr.reason.trim(),rows:rows.map(r=>({item:r.item.trim(),qty:num(r.qty),rate:r2(r.rate),tax:num(r.tax)})),amount:total,restocked,files,lid,by:(window.curUser&&curUser()||{}).name||''});
  closeModal('x29Sr'); sv(); try{ renderAll(); }catch(e){} toast('Sales return '+no+' saved'+(files.length?' with '+files.length+' file(s)':'')+'.'); XA.refresh(); };
X29.srFiles=function(id){ const r=SR().find(x=>x.id===id); if(!r) return; const can_=XA.needFin&&role()!=='sales'&&role()!=='viewer';
  XA.html('Files - '+r.no,'<div id="x29Fl">'+(r.files&&r.files.length?'<table><thead><tr><th>File</th><th>Added</th><th class="n">Size</th><th></th></tr></thead><tbody>'+r.files.map(f=>'<tr><td>'+E(f.name)+'</td><td>'+E(f.added)+'</td><td class="n">'+f.kb+' KB</td><td><button class="btn sm ghost" onclick="X29.fView(\''+id+'\',\''+f.id+'\')">View</button> '+(can_?'<button class="btn sm danger" onclick="X29.fDel(\''+id+'\',\''+f.id+'\')">Remove</button>':'')+'</td></tr>').join('')+'</tbody></table>':'<div class="xa-hint">No files attached.</div>')+'</div>'+(can_?'<div style="margin-top:10px"><input type="file" id="x29Fa" multiple accept="image/*,application/pdf"> <button class="btn sm" onclick="X29.fAdd(\''+id+'\')">Attach</button></div>':''),640); };
X29.fView=(id,fid)=>{ const r=SR().find(x=>x.id===id), f=r&&r.files.find(x=>x.id===fid); if(f&&typeof dataBlobUrl==='function') window.open(dataBlobUrl(f.data),'_blank'); };
X29.fAdd=async function(id){ const r=SR().find(x=>x.id===id); const el=g('x29Fa'); if(!r||!el||!el.files.length){ toast('Choose a file first.',true); return; } const fs=await readAll(el.files); (r.files=r.files||[]).push(...fs); sv(); toast(fs.length+' file(s) attached.'); XA.refresh(); X29.srFiles(id); };
X29.fDel=(id,fid)=>{ if(!can('del')){ denied('delete files of'); return; } const r=SR().find(x=>x.id===id); if(!r) return; r.files=r.files.filter(f=>f.id!==fid); sv(); XA.refresh(); X29.srFiles(id); };
X29.srRemove=function(id){ if(!can('del')){ denied('delete'); return; } const r=SR().find(x=>x.id===id); if(!r) return; askConfirm('Delete sales return '+r.no+'? Its credit note is removed'+((r.restocked||[]).length?' and the returned quantities are taken out of stock again':'')+'.',()=>{ (r.restocked||[]).forEach(x=>{ const s=(DB.stock||[]).find(y=>y.item===x.item); if(s) s.qty=num(s.qty)-x.qty; }); DB.ledger=(DB.ledger||[]).filter(l=>l.id!==r.lid&&l.srId!==r.id); DB.salesReturns=SR().filter(x=>x.id!==id); sv(); try{ renderAll(); }catch(e){} XA.refresh(); toast('Sales return deleted.'); }); };
XA.reg('srt',{title:'Sales Returns',render(){ const L=SR().slice().sort((a,b)=>b.date.localeCompare(a.date)||b.no.localeCompare(a.no)); const tot=r2(L.reduce((s,r)=>s+r.amount,0));
  return H('Sales Returns',B('+ New sales return','X29.srOpen()'))+XA.kpis(XA.kpi('Returns',L.length,'')+XA.kpi('Credited','AED '+M(tot),'')+XA.kpi('With files',L.filter(r=>(r.files||[]).length).length,''))
   +(L.length?'<div class="card" style="overflow:auto"><table><thead><tr><th>Return #</th><th>Date</th><th>Customer</th><th>Invoice</th><th>Items</th><th class="n">Credit (incl. VAT)</th><th>Stock</th><th>Files</th><th></th></tr></thead><tbody>'+L.map(r=>'<tr><td><b>'+E(r.no)+'</b></td><td>'+E(typeof fmtDMY==='function'?fmtDMY(r.date):r.date)+'</td><td>'+E(cname(r.cid))+'</td><td>'+E(r.inv||'-')+'</td><td style="max-width:260px">'+E(r.rows.map(x=>x.qty+' x '+x.item).join(', '))+(r.reason?'<div class="xa-hint">'+E(r.reason)+'</div>':'')+'</td><td class="n">'+M(r.amount)+'</td><td>'+((r.restocked||[]).length?XA.pill('good','Restocked'):XA.pill('','Not restocked'))+'</td><td><button class="btn sm ghost" onclick="X29.srFiles(\''+r.id+'\')">Files ('+(r.files||[]).length+')</button></td><td><button class="btn sm danger" onclick="X29.srRemove(\''+r.id+'\')">Delete</button></td></tr>').join('')+'</tbody></table></div>':'<div class="card pad"><div class="empty">No sales returns yet. Use + New sales return.</div></div>'); }});

/* ---------------- 6. Shipment By Item report ---------------- */
const sh=X29.sh={from:'',to:'',cid:'',q:'',open:''};
const d0=()=>{ const d=new Date(); d.setDate(d.getDate()-89); return d.toISOString().slice(0,10); };
function shData(){ if(!sh.from) sh.from=d0(); if(!sh.to) sh.to=today(); const q=sh.q.trim().toLowerCase(), m={};
  const inR=d=>d>=sh.from&&d<=sh.to;
  (DB.sales||[]).forEach(l=>{ if(!l.item||!inR(l.date)||(sh.cid&&l.cid!==sh.cid)||(q&&!String(l.item).toLowerCase().includes(q))) return; const k=l.item, o=m[k]=m[k]||{item:k,qty:0,ret:0,amt:0,inv:new Set(),cus:new Set(),last:'',lines:[]}; o.qty+=num(l.qty); o.amt+=num(l.net!=null?l.net:l.amount); o.inv.add(l.inv); o.cus.add(l.cid); if(l.date>o.last) o.last=l.date; o.lines.push(l); });
  SR().forEach(r=>{ if(!inR(r.date)||(sh.cid&&r.cid!==sh.cid)) return; r.rows.forEach(x=>{ const o=m[x.item]; if(o) o.ret+=x.qty; }); });
  return Object.values(m).sort((a,b)=>b.qty-a.qty); }
X29.shSet=(k,v)=>{ sh[k]=v; sh.open=''; XA.refresh(); };
X29.shOpen=i=>{ sh.open=sh.open===i?'':i; XA.refresh(); };
const dmy=d=>typeof fmtDMY==='function'?fmtDMY(d):d;
X29.shCsv=function(){ const R=shData(); const q=v=>'"'+String(v).replace(/"/g,'""')+'"'; const t=[['Item','Qty shipped','Qty returned','Net qty','Net amount (excl. VAT)','Invoices','Customers','Last shipped'].map(q).join(',')].concat(R.map(o=>[o.item,o.qty,o.ret,o.qty-o.ret,r2(o.amt),o.inv.size,o.cus.size,o.last].map(q).join(','))); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+t.join('\r\n')],{type:'text/csv'})); a.download='Shipment_By_Item_'+sh.from+'_to_'+sh.to+'.csv'; document.body.appendChild(a); a.click(); a.remove(); };
X29.shPrint=function(){ const R=shData(); XA.print('<h2>Shipment By Item</h2><div>'+E(dmy(sh.from))+' to '+E(dmy(sh.to))+(sh.cid?' - '+E(cname(sh.cid)):'')+'</div><table border="1" cellpadding="4"><tr><th>Item</th><th>Shipped</th><th>Returned</th><th>Net</th><th>Net amount</th><th>Invoices</th><th>Last shipped</th></tr>'+R.map(o=>'<tr><td>'+E(o.item)+'</td><td>'+o.qty+'</td><td>'+o.ret+'</td><td>'+(o.qty-o.ret)+'</td><td>'+M(o.amt)+'</td><td>'+o.inv.size+'</td><td>'+E(dmy(o.last))+'</td></tr>').join('')+'</table>'); };
XA.reg('shi',{title:'Shipment By Item',render(){ const R=shData(), cs=(DB.customers||[]).slice().sort((a,b)=>a.name.localeCompare(b.name));
  return H('Shipment By Item',B('Excel (CSV)','X29.shCsv()','ghost')+B('Print / PDF','X29.shPrint()','ghost'))
   +'<div class="xa-bar"><label>From <input class="xa-in" type="date" style="width:auto" value="'+sh.from+'" onchange="X29.shSet(\'from\',this.value)"></label><label>To <input class="xa-in" type="date" style="width:auto" value="'+sh.to+'" onchange="X29.shSet(\'to\',this.value)"></label><select class="xa-in" style="width:auto" onchange="X29.shSet(\'cid\',this.value)"><option value="">All customers</option>'+cs.map(c=>'<option value="'+c.id+'"'+(sh.cid===c.id?' selected':'')+'>'+E(c.name)+'</option>').join('')+'</select><input class="xa-in" style="width:200px" placeholder="Search item..." value="'+E(sh.q)+'" onchange="X29.shSet(\'q\',this.value)"></div>'
   +XA.kpis(XA.kpi('Items shipped',R.length,'')+XA.kpi('Units shipped',R.reduce((s,o)=>s+o.qty,0),'')+XA.kpi('Units returned',R.reduce((s,o)=>s+o.ret,0),'')+XA.kpi('Net amount','AED '+M(R.reduce((s,o)=>s+o.amt,0)),''))
   +(R.length?'<div class="card" style="overflow:auto"><table><thead><tr><th>Item</th><th class="n">Shipped</th><th class="n">Returned</th><th class="n">Net</th><th class="n">Net amount</th><th class="n">Invoices</th><th class="n">Customers</th><th>Last shipped</th></tr></thead><tbody>'+R.map((o,i)=>'<tr style="cursor:pointer" onclick="X29.shOpen('+i+')"><td><b>'+E(o.item)+'</b></td><td class="n">'+o.qty+'</td><td class="n">'+(o.ret||'')+'</td><td class="n">'+(o.qty-o.ret)+'</td><td class="n">'+M(o.amt)+'</td><td class="n">'+o.inv.size+'</td><td class="n">'+o.cus.size+'</td><td>'+E(dmy(o.last))+'</td></tr>'+(sh.open===i?'<tr><td colspan="8" style="background:#f6f8fc"><table><thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead><tbody>'+o.lines.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(l=>'<tr><td>'+E(dmy(l.date))+'</td><td>'+E(l.inv)+'</td><td>'+E(cname(l.cid))+'</td><td class="n">'+l.qty+'</td><td class="n">'+M(l.rate)+'</td><td class="n">'+M(l.amount)+'</td></tr>').join('')+'</tbody></table></td></tr>':'')).join('')+'</tbody></table></div>':'<div class="card pad"><div class="empty">No items shipped in this period.</div></div>')+'<div class="xa-hint" style="margin-top:6px">Built from sales invoice lines in the date range, less sales returns. Click an item to see every shipment.</div>'; }});


/* ---------------- 7. Wrong-prefix warning on Add / Edit Machine ---------------- */
const OKP={lease:['MT-L','MT-RM'],fsma:['MT-SMF'],sale:['MT-SM'],amc:['MT-CM']};
function expectPref(c,kno){ const K=(c&&c.contracts)||[]; let k=kno?K.find(x=>String(x.ref||x.no||'').trim().toLowerCase()===kno.toLowerCase()):null; if(!k&&K.length===1) k=K[0]; if(!k) return null; const t=String(k.type||'').toLowerCase(); const key=/fsma/.test(t)?'fsma':/ors|sale/.test(t)?'sale':/amc/.test(t)?'amc':/lease|rent/.test(t)?'lease':''; return key?{type:k.type,ok:OKP[key]}:null; }
function wrapSave(){ const o=window.saveMachine; if(typeof o!=='function'||o.__g29) return; const f=function(){ try{ const eq=String((g('m_eqid')||{}).value||'').trim(), p=prefOf(eq), c=(DB.customers||[]).find(x=>x.id===activeCustomerId);
    if(p&&c&&!window.__eqOk){ const e=expectPref(c,String((g('m_kno')||{}).value||'').trim()); if(e&&!e.ok.includes(p)){ askConfirm('Equipment ID '+eq+' ('+p+') does not match this '+e.type+' contract, which normally uses '+e.ok.join(' or ')+'. Save anyway?',()=>{ window.__eqOk=1; try{ o(); } finally{ window.__eqOk=0; } }); return; } } }catch(err){} return o.apply(this,arguments); }; f.__g29=1; window.saveMachine=f; }

/* ---------------- 8. Landed-cost column on Purchase Bills list ---------------- */
function wrapPur(){ const v=XA.views.pur; if(!v||v.__g29b) return; v.__g29b=1; const rd=v.render; v.render=function(){ let h=rd.apply(this,arguments); if(typeof h!=='string') return h; const L={}; arr('purchases').forEach(b=>{ L[b.no]=b.landed?b.landed.amt:0; });
  h=h.replace('<th class="n">Total</th>','<th class="n">Landed cost</th><th class="n">Total</th>').replace('colspan="10"','colspan="11"');
  return h.replace(/<tr>(?:(?!<\/tr>).)*?<b>(PB-\d+)<\/b>(?:(?!<\/tr>).)*?<\/tr>/g,row=>{ const no=/<b>(PB-\d+)<\/b>/.exec(row)[1], a=L[no]; return row.replace('<td class="n">','<td class="n">'+(a>0?M(a):'-')+'</td><td class="n">'); }); }; }


/* ---------------- 9. Convert machine type in one click (keeps the old Equipment ID in history) ---------------- */
X29.cvPick=function(sel){ const ov=g('xaFm'); if(!ov) return; const inp=ov.querySelector('[data-k="eq"]'); if(inp&&sel.value) inp.value=nextEq(sel.value); };
X29.cvOpen=function(cid,mid){ if(role()==='sales'||role()==='viewer'){ toast('Only a Manager or Admin can convert a machine.',true); return; } if(!can('edit')){ denied('edit'); return; }
  const c=(DB.customers||[]).find(x=>x.id===cid), m=c&&c.machines.find(x=>x.id===mid); if(!m) return;
  const cur=prefOf(m.eqid), def=kindOf(c,m)&&kindOf(c,m)!==cur?kindOf(c,m):'', ks=c.contracts||[];
  const kl=k=>(k.type||'Contract')+(k.ref||k.no?' '+(k.ref||k.no):'')+(k.start?' ('+k.start+')':'');
  const html='<div class="xa-hint" style="margin:0 0 8px">Machine <b>'+E(m.model||'')+'</b> - Sr.# '+E(m.serial||'-')+'<br>Current Equipment ID: <b>'+E(m.eqid||'none')+'</b></div>'
   +'<label style="font-size:.8rem">New equipment type</label><select class="xa-in" data-k="t" onchange="X29.cvPick(this)"><option value="">-- choose --</option>'+EQC.map(e=>'<option value="'+e[0]+'"'+(e[0]===def?' selected':'')+'>'+e[0]+' - '+E(e[1])+'</option>').join('')+'</select>'
   +'<label style="font-size:.8rem;display:block;margin-top:8px">New Equipment ID (you can edit it)</label><input class="xa-in" data-k="eq" value="'+E(def?nextEq(def):'')+'">'
   +'<label style="font-size:.8rem;display:block;margin-top:8px">Move to contract (optional)</label><select class="xa-in" data-k="kid"><option value="">Keep current contract</option>'+ks.map(k=>'<option value="'+k.id+'"'+(k.id===m.contractId?' disabled':'')+'>'+E(kl(k))+'</option>').join('')+'</select>'
   +'<label style="font-size:.8rem;display:block;margin-top:8px">Reason / note</label><input class="xa-in" data-k="note" placeholder="e.g. rental bought by customer, moved to FSMA">';
  XA.fm('Convert machine type',[{k:'_h',type:'html',html:html}],o=>{ const eq=String(o.eq||'').trim(); if(!eq){ toast('Enter the new Equipment ID.',true); return false; }
    if(eq.toLowerCase()===String(m.eqid||'').toLowerCase()&&!o.kid){ toast('Nothing to change.',true); return false; }
    const dup=(DB.customers||[]).some(cc=>(cc.machines||[]).some(x=>x!==m&&String(x.eqid||'').trim().toLowerCase()===eq.toLowerCase())); if(dup){ toast('Equipment ID '+eq+' is already used by another machine.',true); return false; }
    (m.eqHist=m.eqHist||[]).push({date:today(),from:m.eqid||'',to:eq,by:(window.curUser&&curUser()||{}).name||'',note:String(o.note||'').trim(),kfrom:m.contractId||'',kto:o.kid||''});
    m.eqid=eq; if(o.kid) m.contractId=o.kid; sv(); try{ renderAll(); }catch(e){} toast('Converted: '+(m.eqHist[m.eqHist.length-1].from||'none')+' -> '+eq+'. Old ID kept in history.'); XA.refresh(); },{w:520,note:'The old Equipment ID is kept in the machine\'s conversion history (Admin -> Equipment ID Types).'}); };

/* ---------------- menu + role access + timers ---------------- */
['srt'].forEach(k=>{ if(XA.FIN&&!XA.FIN.includes(k)) XA.FIN.push(k); });
function menu(){ if(typeof SD==='undefined'||SD.__x29||!SD.__xa) return; const grp=n=>SD.find(x=>x.g===n); if(!['Items','Sales','Admin'].every(n=>grp(n))) return; SD.__x29=1; const add=(n,l,k)=>{ const G=grp(n); if(G&&!G.items.some(i=>i[2]===k)) G.items.push([l,'xa',k]); };
  add('Items','Shipment By Item','shi'); add('Sales','Sales Returns','srt'); add('Admin','Control Settings','ctl29'); add('Admin','Equipment ID Types','eqi'); try{ sdBuild(); sdSync('xa'); }catch(e){} }
setInterval(()=>{ menu(); injectEq(); wrapPb(); guards(); wrapRp(); wrapSave(); wrapPur(); },800);
menu(); wrapPb(); guards(); wrapRp(); wrapSave(); wrapPur();
})();
