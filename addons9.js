/* ===== Add-on 9: Zoho-style Purchase Bill + PO receive -> bill -> stock + available qty on Quote/Invoice ===== */
(function(){
'use strict';
const XA=window.XA; if(!XA) return;
const g=id=>document.getElementById(id), num=x=>parseFloat(String(x==null?'':x).replace(/,/g,''))||0, r2=x=>Math.round(x*100)/100, arr=k=>(DB[k]=DB[k]||[]);
const low=s=>String(s==null?'':s).trim().toLowerCase(), today=()=>todayISO();
const {kpi,kpis,pill,aed}=XA;
const addD=(d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
const sname=id=>(arr('suppliers').find(s=>s.id===id)||{}).name||'—';
const termsOf=sid=>{ const s=arr('suppliers').find(x=>x.id===sid); return s&&s.terms!=null&&s.terms!==''?num(s.terms):30; };
const paidOf=b=>r2((b.pays||[]).reduce((s,p)=>s+num(p.amt),0));
const ym=d=>String(d||'').slice(0,7);
const blank=()=>({code:'',desc:'',note:'',qty:1,rate:0,disc:0,vat:5});

/* ---------- stock helpers ---------- */
const stockFind=(code,name)=>{ const c=low(code), n=low(name); return arr('stock').find(s=>(c&&(low(s.sku)===c||low(s.code)===c))||(n&&low(s.item)===n))||null; };
const stockItem=name=>{ const n=low(name); if(!n) return null; return arr('stock').find(s=>low(s.item)===n||(s.sku&&low(s.sku)===n))||null; };
const keyOf=r=>low(r.code)||low(r.desc);
function syncStock(newRows,oldRows){
  const m={}; (oldRows||[]).forEach(r=>{ const k=keyOf(r); if(!k) return; (m[k]=m[k]||{row:r,d:0}).d-=num(r.qty); });
  (newRows||[]).forEach(r=>{ const k=keyOf(r); if(!k) return; const o=m[k]=m[k]||{row:r,d:0}; o.row=r; o.d+=num(r.qty); });
  Object.keys(m).forEach(k=>{ const o=m[k], r=o.row, s=stockFind(r.code,r.desc);
    if(s){ if(o.d) s.qty=num(s.qty)+o.d; if((newRows||[]).includes(r)) s.cost=num(r.rate); if(!s.sku&&r.code) s.sku=r.code; }
    else if(o.d>0) arr('stock').push({id:uid(),item:r.desc||r.code,sku:r.code||'',desc:r.note||'',qty:o.d,min:0,cost:num(r.rate),price:0,unit:''}); });
}

/* ================== PURCHASE BILL (Zoho style) ================== */
let pb=null, sugList=[];
const rowNet=r=>num(r.qty)*num(r.rate)*(1-num(r.disc)/100);
const totals=rows=>{ let sub=0,vat=0; rows.forEach(r=>{ const n=rowNet(r); sub+=n; vat+=n*num(r.vat)/100; }); return {sub:r2(sub),vat:r2(vat),total:r2(sub+vat)}; };
const sup9=()=>{ let b=g('xaSug9'); if(!b){ b=document.createElement('div'); b.id='xaSug9'; b.style.cssText='position:fixed;display:none;z-index:100005;background:#fff;border:1px solid #cfd6e4;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.2);max-height:340px;overflow:auto;width:520px;max-width:96vw;font-size:.85rem'; document.body.appendChild(b); } return b; };
const hideSug=()=>{ const b=g('xaSug9'); if(b) b.style.display='none'; };
function products(){ return arr('stock').filter(s=>(s.item||s.sku)).map(s=>({s,n:s.item||'',sku:s.sku||'',brand:(s.brand||(s.item||'').split(/\s+/)[0]||'').toUpperCase(),stock:num(s.qty),cost:num(s.cost),desc:s.desc||''})); }
XA.pb9Sug=function(inp,i){ const w=inp.value.trim().toLowerCase().split(/\s+/).filter(Boolean); const all=products().filter(p=>!w.length||w.every(x=>(p.n+' '+p.sku+' '+p.desc+' '+p.brand).toLowerCase().includes(x)));
  sugList=all.sort((a,b)=>a.n.localeCompare(b.n)).slice(0,150); const box=sup9(), gp={}; sugList.forEach((p,k)=>{ (gp[p.brand||'OTHER']=gp[p.brand||'OTHER']||[]).push([p,k]); });
  box.innerHTML=sugList.length?'<div style="padding:6px 10px;color:#667;border-bottom:1px solid #eee">'+all.length+' matching stock item(s)'+(all.length>150?' (showing 150 — keep typing)':'')+' — click a group to expand</div>'+Object.entries(gp).map(([b,a])=>'<details'+(w.length?' open':'')+'><summary style="padding:6px 10px;background:#f3f5f8;cursor:pointer;font-weight:600">'+esc(b)+' ('+a.length+')</summary>'+a.map(([p,k])=>{ const bf=p.sku&&XA.bestFor?XA.bestFor(p.sku):null, best=bf&&bf.list[0]?' · best '+fmtM(bf.list[0].price):''; return '<div onmousedown="XA.pb9Pick('+i+','+k+')" style="padding:6px 14px;cursor:pointer;display:flex;justify-content:space-between;gap:10px" onmouseover="this.style.background=\'#eaf1ff\'" onmouseout="this.style.background=\'\'"><span>'+(p.sku?'<b>'+esc(p.sku)+'</b> · ':'')+esc(p.n)+'</span><span style="color:'+(p.stock>0?'#1e7e34':'#c0392b')+';white-space:nowrap">stock '+p.stock+'<span style="color:#667"> · cost '+fmtM(p.cost)+best+'</span></span></div>'; }).join('')+'</details>').join(''):'<div style="padding:10px;color:#667">No stock item matches — keep typing to add it as a new item (it will be created in Stock &amp; Pricing when you save with the stock box ticked).</div>';
  const r=inp.getBoundingClientRect(); box.style.left=Math.max(4,Math.min(r.left,innerWidth-530))+'px'; box.style.top=Math.min(r.bottom+2,innerHeight-350)+'px'; box.style.display=''; };
XA.pb9Pick=function(i,k){ const p=sugList[k]; if(!p) return; const r=pb.rows[i]; grab(); r.code=p.sku; r.desc=p.n; if(p.desc&&!r.note) r.note=p.desc; let rate=p.cost; if(p.sku&&XA.bestFor){ const bf=XA.bestFor(p.sku); if(bf){ const mine=bf.list.find(x=>x.sid===pb.sid); rate=(mine||bf.list[0]).price; } } r.rate=rate; hideSug(); rows9(); };
XA.pb9Typed=function(i,el){ const r=pb.rows[i]; r.desc=el.value; r.code=''; XA.pb9Sug(el,i); calc9(); };
XA.pb9Blur=function(i,el){ setTimeout(()=>{ hideSug(); const v=low(el.value); if(!v||!pb||!pb.rows[i]) return; const s=arr('stock').find(x=>x.sku&&low(x.sku)===v); if(s&&pb.rows[i].code!==s.sku){ const p=products().find(x=>x.s===s); sugList=[p]; XA.pb9Pick(i,0); } },180); };
XA.pb9Row=function(i,k,v){ pb.rows[i][k]=(k==='note')?v:num(v); calc9(); };
XA.pb9Add=function(){ grab(); pb.rows.push(blank()); rows9(); };
XA.pb9Del=function(i){ grab(); pb.rows.splice(i,1); if(!pb.rows.length) pb.rows.push(blank()); rows9(); };
function grab(){ if(!pb||!g('pb9_sid')) return; pb.sid=g('pb9_sid').value; pb.date=g('pb9_date').value||today(); pb.due=g('pb9_due').value; pb.sno=g('pb9_sno').value; pb.po=g('pb9_po').value; pb.notes=g('pb9_notes').value; }
XA.pb9Sup=function(){ grab(); pb.due=addD(pb.date,termsOf(pb.sid)); g('pb9_due').value=pb.due; };
function stockCell(r,tick){ const s=stockFind(r.code,r.desc); if(!s) return (r.desc||r.code)?'<span class="xa-hint">new item</span>':''; const a=num(s.qty); return '<b style="color:'+(a>0?'#1e7e34':'#c0392b')+'">'+a+'</b>'+(tick&&num(r.qty)>0?'<div class="xa-hint" style="margin:0">→ '+(a+num(r.qty))+' after save</div>':''); }
function calc9(){ if(!pb) return; const tick=g('pb9_stock')&&g('pb9_stock').checked&&!pb.stocked; pb.rows.forEach((r,i)=>{ const a=g('pb9a'+i); if(a) a.textContent=fmtM(rowNet(r)); const s=g('pb9s'+i); if(s) s.innerHTML=stockCell(r,tick); }); const t=totals(pb.rows), d=r2(pb.rows.reduce((s,r)=>s+num(r.qty)*num(r.rate)*num(r.disc)/100,0)); const e=g('pb9_tot'); if(e) e.innerHTML='Sub total: <b>'+fmtM(t.sub+d)+'</b><br>Discount: <b>−'+fmtM(d)+'</b><br>VAT: <b>'+fmtM(t.vat)+'</b><br><span style="font-size:1.1rem">Total (AED): <b>'+fmtM(t.total)+'</b></span>'; }
function rows9(){ const tb=g('pb9_rows'); if(!tb) return; tb.innerHTML=pb.rows.map((r,i)=>'<tr><td style="min-width:300px"><input class="xa-in" style="width:100%" placeholder="Type SKU or description to search stock" value="'+esc(r.desc||'')+'" oninput="XA.pb9Typed('+i+',this)" onfocus="XA.pb9Sug(this,'+i+')" onblur="XA.pb9Blur('+i+',this)">'+(r.code?'<div class="xa-hint" style="margin:2px 0 0">SKU: <b>'+esc(r.code)+'</b></div>':'')+'</td><td class="n" style="min-width:90px" id="pb9s'+i+'"></td><td><input class="xa-in" type="number" step="any" style="width:80px" value="'+num(r.qty)+'" oninput="XA.pb9Row('+i+',\'qty\',this.value)"></td><td><input class="xa-in" type="number" step="any" style="width:100px" value="'+num(r.rate)+'" oninput="XA.pb9Row('+i+',\'rate\',this.value)"></td><td><input class="xa-in" type="number" step="any" style="width:70px" value="'+num(r.disc)+'" oninput="XA.pb9Row('+i+',\'disc\',this.value)"></td><td><input class="xa-in" type="number" step="any" style="width:70px" value="'+num(r.vat)+'" oninput="XA.pb9Row('+i+',\'vat\',this.value)"></td><td class="n" id="pb9a'+i+'"></td><td><button class="btn sm ghost" onclick="XA.pb9Del('+i+')">✕</button></td></tr>').join(''); calc9(); }
function draw9(){ let o=g('xaPb9'); if(!o){ o=document.createElement('div'); o.className='overlay'; o.id='xaPb9'; document.body.appendChild(o); }
  const lab=(t,inner,fl)=>'<div style="flex:'+(fl||'1 1 170px')+'"><label style="font-size:.8rem">'+t+'</label>'+inner+'</div>';
  o.innerHTML='<div class="modal" style="max-width:1100px;width:97vw;max-height:94vh;overflow:auto"><h3>'+(pb.id?'Edit bill '+esc(pb.no):'New bill')+(pb.po?' <span class="xa-hint">· from '+esc(pb.po)+'</span>':'')+'</h3>'
   +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">'+lab('Vendor name *','<select class="xa-in" id="pb9_sid" onchange="XA.pb9Sup()">'+arr('suppliers').map(s=>'<option value="'+s.id+'"'+(pb.sid===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select>','2 1 240px')
   +lab('Supplier invoice #','<input class="xa-in" id="pb9_sno" value="'+esc(pb.sno)+'">')+lab('Order / PO #','<input class="xa-in" id="pb9_po" value="'+esc(pb.po)+'">')+lab('Bill date','<input class="xa-in" type="date" id="pb9_date" value="'+esc(pb.date)+'" onchange="XA.pb9Sup()">')+lab('Due date','<input class="xa-in" type="date" id="pb9_due" value="'+esc(pb.due)+'">')+'</div>'
   +'<div style="overflow:auto"><table class="xa-tbl"><thead><tr><th>Item details (SKU / description)</th><th class="n">In stock</th><th>Qty</th><th>Rate (excl. VAT)</th><th>Disc %</th><th>VAT %</th><th class="n">Amount</th><th></th></tr></thead><tbody id="pb9_rows"></tbody></table></div>'
   +'<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:8px"><button class="btn ghost sm" onclick="XA.pb9Add()">⊕ Add new row</button><div style="min-width:260px;line-height:1.7" id="pb9_tot"></div></div>'
   +'<div style="margin-top:8px"><label style="font-size:.8rem">Notes</label><textarea class="xa-in" id="pb9_notes" rows="2">'+esc(pb.notes)+'</textarea></div>'
   +(pb.stocked?'<div class="xa-hint" style="margin-top:8px">✔ Quantities of this bill are already in Stock &amp; Pricing — changing quantities here adjusts stock by the difference.</div>':'<label style="display:inline-flex;gap:6px;align-items:center;margin-top:8px;font-size:.9rem"><input type="checkbox" id="pb9_stock" onchange="XA.pb9Tick()"'+(pb.tick?' checked':'')+'> Add the quantities to Stock &amp; Pricing (updates cost price)</label>')
   +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn ghost" onclick="XA.pb9Close()">Cancel</button><button class="btn" onclick="XA.pb9Save()">💾 Save bill</button></div></div>';
  o.classList.add('show'); o.style.display='flex'; rows9(); }
XA.pb9Tick=function(){ calc9(); };
XA.pb9Close=function(){ hideSug(); const o=g('xaPb9'); if(o){ o.classList.remove('show'); o.style.display='none'; } };
XA.pbOpen=function(id){ if(!XA.needFin()) return; if(!arr('suppliers').length){ toast('Add a supplier first (Suppliers → Supplier Details).',true); return; }
  const b=id?arr('purchases').find(x=>x.id===id):null;
  pb={id:b?b.id:null,no:b?b.no:'PB-'+String((DB.pbSeq||0)+1).padStart(4,'0'),sid:b?b.sid:arr('suppliers')[0].id,date:b?b.date:today(),due:b?b.due:'',sno:b&&b.sno?b.sno:'',po:b&&b.po?b.po:'',notes:b&&b.notes?b.notes:'',stocked:!!(b&&b.stocked),stockedRows:b&&b.stockedRows?JSON.parse(JSON.stringify(b.stockedRows)):[],tick:!b||!!b.pending,
    rows:b?b.rows.map(r=>({code:r.code||'',desc:r.desc||'',note:r.note||'',qty:num(r.qty),rate:r.list!=null?num(r.list):num(r.rate),disc:num(r.disc),vat:r.vat==null?5:num(r.vat)})):[blank()]};
  if(!pb.due) pb.due=addD(pb.date,termsOf(pb.sid)); draw9(); };
XA.pb9Save=function(){ grab(); const rows=pb.rows.filter(r=>(r.code||r.desc)&&num(r.qty)>0); if(!rows.length){ toast('Add at least one item with a quantity.',true); return; } if(!pb.sid){ toast('Select a vendor.',true); return; }
  const t=totals(rows), tick=!!(g('pb9_stock')&&g('pb9_stock').checked);
  const stored=rows.map(r=>({code:(r.code||'').trim(),desc:(r.desc||'').trim(),note:r.note||'',qty:num(r.qty),rate:r2(num(r.rate)*(1-num(r.disc)/100)),vat:num(r.vat),list:num(r.rate),disc:num(r.disc)}));
  const rec={sid:pb.sid,date:pb.date,due:pb.due||pb.date,sno:(pb.sno||'').trim(),po:pb.po||'',notes:pb.notes||'',rows:stored,sub:t.sub,vat:t.vat,total:t.total};
  let b=pb.id?arr('purchases').find(x=>x.id===pb.id):null;
  if(b){ Object.assign(b,rec); delete b.pending; } else { b=Object.assign({id:uid(),no:'PB-'+String(DB.pbSeq=(DB.pbSeq||0)+1).padStart(4,'0'),pays:[]},rec); arr('purchases').push(b); }
  if(b.stocked){ syncStock(stored,b.stockedRows||[]); b.stockedRows=stored.map(r=>({code:r.code,desc:r.desc,qty:r.qty})); }
  else if(tick){ syncStock(stored,[]); b.stocked=true; b.stockedRows=stored.map(r=>({code:r.code,desc:r.desc,qty:r.qty})); }
  if(b.fromPo){ const p=arr('pos').find(x=>x.id===b.fromPo); if(p){ p.st='Billed'; p.billNo=b.no; p.stocked=!!b.stocked; } }
  XA.pb9Close(); XA.save(); toast('Bill '+b.no+' saved'+(b.stocked&&tick?' — quantities added to Stock & Pricing.':'.')); };
XA.pbStock=function(id){ const b=arr('purchases').find(x=>x.id===id); if(!b||b.stocked) return; askConfirm('Add the quantities of '+b.no+' to Stock & Pricing and update the cost prices?',()=>{ syncStock(b.rows,[]); b.stocked=true; b.stockedRows=b.rows.map(r=>({code:r.code,desc:r.desc,qty:r.qty})); const p=b.fromPo&&arr('pos').find(x=>x.id===b.fromPo); if(p) p.stocked=true; XA.save(); toast('Stock updated from '+b.no+'.'); }); };

/* purchase bills list (adds Stock column + action) */
XA.reg('pur',{render(){ const P=arr('purchases'), t=today(), f=XA.pf||{}; let rows=P.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))); if(f.sid) rows=rows.filter(b=>b.sid===f.sid); if(f.st) rows=rows.filter(b=>{ const o=r2(b.total-paidOf(b)); return f.st==='paid'?o<=0:f.st==='overdue'?(o>0&&b.due<t):f.st==='nostock'?!b.stocked:o>0; });
  const open=P.filter(b=>b.total-paidOf(b)>0.005), od=open.filter(b=>b.due<t), ns=P.filter(b=>!b.stocked);
  let h='<div class="sec" style="margin-top:0;flex-wrap:wrap;gap:8px"><h2>Purchase Bills</h2><span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><select class="xa-in" style="width:auto" onchange="XA.pf=Object.assign(XA.pf||{},{sid:this.value});XA.refresh()"><option value="">All suppliers</option>'+arr('suppliers').map(s=>'<option value="'+s.id+'"'+(f.sid===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select><select class="xa-in" style="width:auto" onchange="XA.pf=Object.assign(XA.pf||{},{st:this.value});XA.refresh()">'+[['','All'],['open','Unpaid'],['overdue','Overdue'],['paid','Paid'],['nostock','Not added to stock']].map(o=>'<option value="'+o[0]+'"'+((f.st||'')===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select><button class="btn" onclick="XA.pbOpen()">+ New Purchase Bill</button></span></div>';
  h+=kpis(kpi('Payable',aed(open.reduce((s,b)=>s+b.total-paidOf(b),0)),open.length+' unpaid bill(s)')+kpi('Overdue',aed(od.reduce((s,b)=>s+b.total-paidOf(b),0)),od.length+' bill(s)')+kpi('Purchased this month',aed(P.filter(b=>ym(b.date)===ym(t)).reduce((s,b)=>s+b.total,0)),'')+kpi('Not in stock yet',ns.length,'bill(s) to complete'));
  h+='<div class="card"><div class="tw"><table><thead><tr><th>Date</th><th>Bill #</th><th>Supplier inv. / PO</th><th>Supplier</th><th>Due</th><th class="n">Total</th><th class="n">Paid</th><th class="n">Balance</th><th>Status</th><th>Stock</th><th></th></tr></thead><tbody>'+(rows.length?rows.map(b=>{ const p=paidOf(b), o=r2(b.total-p); return '<tr><td>'+fmtDMY(b.date)+'</td><td><b>'+esc(b.no)+'</b></td><td>'+esc(b.sno||'')+(b.po?'<div class="xa-hint" style="margin:0">PO '+esc(b.po)+'</div>':'')+'</td><td>'+esc(sname(b.sid))+'</td><td>'+fmtDMY(b.due)+'</td><td class="n">'+fmtM(b.total)+'</td><td class="n">'+fmtM(p)+'</td><td class="n"><b>'+fmtM(o)+'</b></td><td>'+(b.pending?pill('warn','To complete'):o<=0.005?pill('good','Paid'):b.due<t?pill('bad','Overdue'):p>0?pill('warn','Part paid'):pill('','Unpaid'))+'</td><td>'+(b.stocked?pill('good','In stock'):pill('warn','Not added'))+'</td><td style="white-space:nowrap">'+(b.stocked?'':'<button class="btn sm ghost" onclick="XA.pbStock(\''+b.id+'\')">📦 Add to stock</button> ')+(o>0.005?'<button class="btn sm ghost" onclick="XA.pbPay(\''+b.id+'\')">💰 Pay</button> ':'')+'<button class="btn sm ghost" onclick="XA.pbOpen(\''+b.id+'\')">✎</button> <button class="btn sm ghost" onclick="XA.pbDel(\''+b.id+'\')">🗑</button></td></tr>'; }).join(''):'<tr><td colspan="11" class="empty">No purchase bills.</td></tr>')+'</tbody></table></div></div>'; return h; }});

/* ================== PURCHASE ORDER: receive -> bill (stock is added on the bill) ================== */
function mkBill(p){ const rows=(p.rows||[]).map(r=>{ const nm=(r.item||r.code||r.desc||'').trim(), s=stockItem(nm), list=num(r.rate), disc=num(r.disc); return {code:s?(s.sku||''):'',desc:s?s.item:nm,note:(r.desc&&r.desc!==nm)?r.desc:'',qty:num(r.qty),rate:r2(list*(1-disc/100)),vat:r.vat==null?5:num(r.vat),list,disc}; });
  const t=totals(rows.map(r=>({qty:r.qty,rate:r.list,disc:r.disc,vat:r.vat})));
  const b={id:uid(),no:'PB-'+String(DB.pbSeq=(DB.pbSeq||0)+1).padStart(4,'0'),sid:p.sid,date:today(),due:addD(today(),p.terms==null||p.terms===''?termsOf(p.sid):num(p.terms)),sno:'',po:p.no,rows,sub:t.sub,vat:t.vat,total:t.total,pays:[],fromPo:p.id,stocked:!!p.stocked,pending:true};
  arr('purchases').push(b); p.billNo=b.no; return b; }
XA.poRecv=id=>{ const p=arr('pos').find(x=>x.id===id); if(!p) return; const ex=p.billNo&&arr('purchases').find(x=>x.no===p.billNo);
  if(ex){ if(p.st!=='Billed') p.st='Received'; p.recvDate=p.recvDate||today(); XA.save(); XA.pbOpen(ex.id); return; }
  askConfirm('Mark '+p.no+' as received? A supplier purchase bill is created automatically (Suppliers → Purchase Bills) — enter the supplier invoice details there, tick “Add the quantities to Stock & Pricing” and save.',()=>{ const b=mkBill(p); p.st='Received'; p.recvDate=today(); XA.save(); toast(p.no+' received — bill '+b.no+' created.'); setTimeout(()=>XA.pbOpen(b.id),60); }); };
XA.poBill=id=>{ const p=arr('pos').find(x=>x.id===id); if(!p) return; let b=p.billNo&&arr('purchases').find(x=>x.no===p.billNo); if(!b){ b=mkBill(p); XA.save(); } XA.pbOpen(b.id); };

/* PO list: button to raise a PO from a customer quote */
XA.poFromQuote=function(){ const Q=(DB.quotes||[]).filter(q=>{ const s=typeof qStat==='function'?qStat(q):q.status; return s!=='Invoiced'&&s!=='Declined'&&s!=='Expired'; }); if(!Q.length){ toast('No open customer quotes.',true); return; } if(!arr('suppliers').length){ toast('Add a supplier first.',true); return; }
  const lb=q=>q.no+' · '+(typeof cn==='function'?cn(q.cid):'')+' · AED '+fmtM(qTot(q).total);
  XA.fm('Raise purchase order from a customer quote',[{k:'q',label:'Customer quote',type:'select',opts:Q.map(lb),val:lb(Q[0])},{k:'s',label:'Supplier',type:'select',opts:arr('suppliers').map(s=>s.name),val:arr('suppliers')[0].name}],v=>{ const q=Q.find(x=>lb(x)===v.q), sp=arr('suppliers').find(x=>x.name===v.s); if(!q||!sp){ toast('Pick a quote and a supplier.',true); return false; }
    const rows=q.lines.map(qLn).filter(l=>l.item&&l.qty>0).map(l=>{ const s=stockItem(l.item); let rate=s?num(s.cost):num(l.cost); if(s&&s.sku&&XA.bestFor){ const bf=XA.bestFor(s.sku); if(bf){ const mine=bf.list.find(x=>x.sid===sp.id); rate=(mine||bf.list[0]).price; } } return {code:l.item,item:l.item,desc:l.desc||l.item,qty:num(l.qty),rate:num(rate),disc:0,vat:5}; });
    let sub=0,vat=0; rows.forEach(r=>{ const n=r.qty*r.rate; sub+=n; vat+=n*r.vat/100; }); DB.poSeq=(DB.poSeq||0)+1;
    const po={id:uid(),no:'PO-'+String(DB.poSeq).padStart(4,'0'),sid:sp.id,date:today(),exp:'',terms:termsOf(sp.id),rows,st:'Draft',notes:'',tc:(DB.company||{}).poTerms||'',ref:q.no,subject:'For customer quote '+q.no,sub:r2(sub),disc:0,vat:r2(vat),total:r2(sub+vat),srcQuote:q.id};
    arr('pos').push(po); XA.save(); toast('Draft '+po.no+' created from '+q.no+' — check the supplier rates and issue it.'); setTimeout(()=>XA.poEdit(po.id),60); }); };
const po0=XA.views.po; if(po0&&!po0.__xa9){ const r0=po0.render; XA.views.po=Object.assign({},po0,{__xa9:1,render(){ return String(r0.apply(this,arguments)).replace('➕ New purchase order</button>','➕ New purchase order</button><button class="btn sm ghost" onclick="XA.poFromQuote()">📥 From customer quote</button>'); }}); }

/* ================== AVAILABLE QUANTITY on Quote + Invoice, stock reduction on invoice ================== */
const availOf=(item,editIds)=>{ const s=stockItem(item); if(!s) return null; let a=num(s.qty); (editIds||[]).length&&arr('sales').forEach(x=>{ if(editIds.includes(x.id)&&(x.stk||x.qno)&&low(x.item)===low(item)) a+=num(x.qty); }); return a; };
function decorate(tbId,getRows,getEdit){ const tb=g(tbId), R=getRows(); if(!tb||!R) return; Array.from(tb.rows).forEach((tr,i)=>{ const l=R[i]; if(!l||!tr.cells[0]) return; const td=tr.cells[0]; let d=td.querySelector('.xaAv'); if(!d){ d=document.createElement('div'); d.className='xaAv'; d.style.cssText='font-size:.75rem;margin-top:2px'; td.appendChild(d); }
    const a=l.item?availOf(l.item,getEdit()):null; if(a==null){ d.innerHTML=''; return; } const q=num(l.qty), ok=q<=a; d.innerHTML='<span style="color:'+(ok?'#1e7e34':'#c0392b')+'">Available: <b>'+a+'</b>'+(ok?'':' — short by '+(q-a))+'</span>'; }); }
const dq=()=>decorate('qRows',()=>qRows,()=>[]), dp=()=>decorate('pRows',()=>pRows,()=>(typeof slEditIds!=='undefined'?slEditIds:[]));
const wrap=(name,fn)=>{ const o=window[name]; if(typeof o!=='function'||o.__xa9) return; const w=function(){ const r=o.apply(this,arguments); try{ fn(); }catch(e){} return r; }; w.__xa9=1; window[name]=w; };
wrap('qDraw',dq); wrap('qCalc',dq); wrap('pDraw',dp); wrap('pCalc',dp);

/* new invoice / edited invoice: reduce (or re-balance) stock */
if(typeof window.slAdd==='function'&&!window.slAdd.__xa9){ const slAdd0=window.slAdd; const w=function(){
    const editIds=(typeof slEditIds!=='undefined'?slEditIds:[]).slice(), before=new Set(arr('sales').map(x=>x.id)), old=arr('sales').filter(x=>editIds.includes(x.id)).map(x=>Object.assign({},x)), wasStk=old.some(x=>x.stk||x.qno);
    try{ const need={}; (pRows||[]).forEach(l=>{ const it=low(l.item); if(it&&num(l.qty)>0) need[it]=(need[it]||0)+num(l.qty); }); const short=[]; Object.keys(need).forEach(k=>{ const s=stockItem(k); if(!s) return; let a=num(s.qty); if(wasStk) old.forEach(x=>{ if((x.stk||x.qno)&&low(x.item)===k) a+=num(x.qty); }); if(need[k]>a) short.push(s.item+' — need '+need[k]+', available '+a); }); if(short.length&&!(editIds.length&&!wasStk)&&!confirm('Not enough stock for:\n'+short.join('\n')+'\n\nSave the invoice anyway?')) return; }catch(e){}
    const r=slAdd0.apply(this,arguments);
    try{ const fresh=arr('sales').filter(x=>!before.has(x.id)); if(!fresh.length) return r; if(editIds.length&&!wasStk) return r;
      if(wasStk) old.forEach(x=>{ if(!(x.stk||x.qno)) return; const s=stockItem(x.item); if(s) s.qty=num(s.qty)+num(x.qty); });
      fresh.forEach(x=>{ const s=stockItem(x.item); if(s){ s.qty=num(s.qty)-num(x.qty); x.stk=true; } });
      save(); if(typeof renderSales==='function') renderSales(); if(typeof renderBell==='function') renderBell(); }catch(e){}
    return r; }; w.__xa9=1; window.slAdd=w; }

/* delete invoice: put the quantities back in stock */
if(typeof window.siDel==='function'&&!window.siDel.__xa9){ const w=function(no){ const old=String(no).charAt(0)==='~';
    askConfirm('Delete '+(old?'this old sales record':'sales invoice '+no)+'? Stocked quantities go back to Stock & Pricing. It can be restored from Admin → Recycle bin.',()=>{ let back=0; arr('sales').filter(x=>old?x.id===String(no).slice(1):x.inv===no).forEach(x=>{ if(x.stk||x.qno){ const s=stockItem(x.item); if(s){ s.qty=num(s.qty)+num(x.qty); back++; } } });
      DB.sales=DB.sales.filter(x=>old?x.id!==String(no).slice(1):x.inv!==no); save(); renderSales(); renderBell(); renderInvoices(); toast('Invoice deleted'+(back?' — stock restored.':'.')); }); }; w.__xa9=1; window.siDel=w; }

/* ================== RECEIVABLES: Sales / Other invoices now count in ledger, payments and aging ================== */
function saleDocs(cid){ const g={}; arr('sales').filter(x=>x.cid===cid&&x.inv&&!/^Q-/.test(x.inv)).forEach(x=>{ const r=g[x.inv]=g[x.inv]||{no:x.inv,date:x.date,amt:0,ref:x.ref||'Consumable'}; r.amt+=num(x.amount); }); return Object.values(g); }
window.acct=function(cid){
  const c=custById(cid), td=termDays(c), docs=[];
  DB.invoices.filter(v=>v.cid===cid).forEach(v=>docs.push({date:v.date,type:'Invoice',ref:v.no,debit:v.total,credit:0,due:addDays(v.date,td),inv:v}));
  saleDocs(cid).forEach(sv=>docs.push({date:sv.date,type:'Invoice',ref:sv.no,debit:r2(sv.amt),credit:0,due:addDays(sv.date,td),sale:sv}));
  DB.ledger.filter(l=>l.cid===cid).forEach(l=>{ const d=(l.type==='latefee'||l.type==='opening'); docs.push({date:l.date,type:LTYPE[l.type],ref:[l.ref,l.note].filter(Boolean).join(' · '),debit:d?l.amount:0,credit:d?0:l.amount,due:d?addDays(l.date,td):null,led:l}); });
  docs.sort((a,b)=>String(a.date).localeCompare(String(b.date))); let bal=0; docs.forEach(d=>{ bal+=d.debit-d.credit; d.bal=r2(bal); });
  const debits=docs.filter(d=>d.debit>0), t=todayISO(); debits.forEach(d=>{ d.paid=0; });
  let pool=0; docs.filter(d=>d.led&&d.credit>0).forEach(d=>{ let rest=d.credit; (d.led.alloc||[]).forEach(al=>{ const tg=debits.find(x=>x.type==='Invoice'&&x.ref===al.ref); if(tg){ const a=Math.min(num(al.amt),tg.debit-tg.paid,rest); if(a>0){ tg.paid=r2(tg.paid+a); rest=r2(rest-a); } } }); pool=r2(pool+rest); });
  debits.forEach(d=>{ const a=Math.min(pool,d.debit-d.paid); d.paid=r2(d.paid+a); pool=r2(pool-a); d.open=r2(d.debit-d.paid); d.age=d.open>0?daysBetween(d.due,t):0; d.overdue=d.open>0&&d.due<t; });
  return {c,docs,debits,balance:r2(bal),overdue:r2(debits.filter(d=>d.overdue).reduce((s,d)=>s+d.open,0)),unapplied:Math.max(0,pool),terms:td};
};
/* All Invoices list: give Sales rows a real status / due date / balance */
(function(){ const r0=window.renderInvoices; if(typeof r0!=='function'||r0.__xa9) return; const w=function(){ const r=r0.apply(this,arguments); try{ const cache={}; document.querySelectorAll('#invTable tbody tr').forEach(tr=>{ const a=tr.querySelector('a[onclick*="siView("]'); if(!a||tr.cells.length<8) return; const m=(a.getAttribute('onclick')||'').match(/siView\('([^']*)'/); if(!m) return; const no=m[1].replace(/&amp;/g,'&'), row=arr('sales').find(x=>x.inv===no); if(!row||!custById(row.cid)) return; const ac=cache[row.cid]||(cache[row.cid]=acct(row.cid)), d=ac.debits.find(x=>x.type==='Invoice'&&x.ref===no); if(!d) return; const days=daysBetween(todayISO(),d.due); tr.cells[4].innerHTML=d.open<=0?'<span class="badge good">PAID</span>':d.overdue?'<span class="badge bad">OVERDUE BY '+(-days)+' DAYS</span>':'<span class="badge blue">DUE IN '+days+' DAYS</span>'; tr.cells[5].textContent=fmtDMY(d.due); tr.cells[7].textContent='AED'+fmtM(d.open); }); }catch(e){} return r; }; w.__xa9=1; window.renderInvoices=w; })();

/* ================== PAYMENT RECEIVED (Zoho style) ================== */
let rp=null;
const dueDocs=cid=>{ try{ return acct(cid).debits.filter(d=>d.type==='Invoice'&&d.open>0.004).sort((a,b)=>String(a.date).localeCompare(String(b.date))); }catch(e){ return []; } };
function rpAuto(){ let left=num(rp.amount); rp.docs.forEach(d=>{ const a=Math.min(left,d.open); rp.alloc[d.ref]=a>0?r2(a):0; left=r2(left-a); }); }
function rpSums(){ const used=r2(Object.values(rp.alloc).reduce((s,v)=>s+num(v),0)); return {used,excess:r2(num(rp.amount)-used)}; }
function rpCalc(){ const s=rpSums(), e=g('rp_sum'); if(e) e.innerHTML='<div style="display:flex;justify-content:space-between"><span>Amount received</span><b>'+fmtM(num(rp.amount))+'</b></div><div style="display:flex;justify-content:space-between"><span>Amount used for payments</span><b>'+fmtM(s.used)+'</b></div><div style="display:flex;justify-content:space-between;color:'+(s.excess<0?'#c0392b':'#1e7e34')+'"><span>'+(s.excess<0?'Applied more than received':'Amount in excess (advance)')+'</span><b>'+fmtM(s.excess)+'</b></div>'; }
function rpRows(){ const tb=g('rp_rows'); if(!tb) return; tb.innerHTML=rp.docs.length?rp.docs.map((d,i)=>'<tr><td>'+fmtDMY(d.date)+'</td><td><b>'+esc(d.ref)+'</b><div class="xa-hint" style="margin:0">'+esc(d.sale?(d.sale.ref||'Sales'):(d.inv&&d.inv.ref)||'Lease')+'</div></td><td>'+fmtDMY(d.due)+(d.overdue?' <span class="badge bad">overdue</span>':'')+'</td><td class="n">'+fmtM(d.debit)+'</td><td class="n">'+fmtM(d.open)+'</td><td><input class="xa-in" type="number" step="any" style="width:120px" value="'+(num(rp.alloc[d.ref])||'')+'" oninput="XA.rpRow('+i+',this.value)"></td></tr>').join(''):'<tr><td colspan="6" class="empty">No unpaid invoices for this customer — the full amount will be kept as an advance.</td></tr>'; rpCalc(); }
XA.rpRow=(i,v)=>{ const d=rp.docs[i]; rp.alloc[d.ref]=Math.min(num(v),d.open); rpCalc(); };
XA.rpAmt=v=>{ rp.amount=num(v); rpAuto(); rpRows(); };
XA.rpClear=()=>{ rp.alloc={}; rpRows(); };
XA.rpApply=()=>{ rpAuto(); rpRows(); };
XA.rpCust=()=>{ rp.cid=g('rp_cust').value; rp.docs=dueDocs(rp.cid); rp.alloc={}; rpAuto(); const t=g('rp_due'); if(t) t.textContent='Outstanding: AED '+fmtM(rp.docs.reduce((s,d)=>s+d.open,0)); rpRows(); };
XA.rpClose=()=>{ const o=g('xaRp'); if(o){ o.classList.remove('show'); o.style.display='none'; } };
XA.rpSave=()=>{ rp.date=g('rp_date').value; rp.method=g('rp_mode').value; rp.dep=g('rp_dep').value; rp.ref=g('rp_ref').value.trim(); rp.note=g('rp_note').value.trim(); rp.no=g('rp_no').value.trim();
  if(!rp.cid){ toast('Select a customer.',true); return; } if(!(num(rp.amount)>0)){ toast('Enter the amount received.',true); return; } if(!rp.date){ toast('Pick the payment date.',true); return; }
  const s=rpSums(); if(s.excess<-0.005){ toast('Applied amount is more than the amount received.',true); return; }
  const alloc=rp.docs.filter(d=>num(rp.alloc[d.ref])>0).map(d=>({ref:d.ref,amt:r2(num(rp.alloc[d.ref]))}));
  const m=String(rp.no).match(/(\d+)$/); if(m) DB.prSeq=Math.max(DB.prSeq||0,parseInt(m[1],10));
  DB.ledger.push({id:uid(),cid:rp.cid,date:rp.date,type:'payment',amount:r2(rp.amount),method:rp.method,ref:rp.ref,note:[rp.no,rp.note].filter(Boolean).join(' · '),dep:rp.dep,alloc,pno:rp.no});
  save(); XA.rpClose(); try{ const pc=g('pay_cust'); if(pc) pc.value=rp.cid; }catch(e){} if(typeof renderAll==='function') renderAll(); toast('Payment '+rp.no+' recorded'+(s.excess>0.005?' — AED '+fmtM(s.excess)+' kept as advance.':'.')); };
const openLedger0=window.openLedger;
window.openLedger=function(type,cid,amount,ref){
  if(type!=='payment'&&typeof openLedger0==='function') return openLedger0.apply(this,arguments);
  const cid0=cid||(g('pay_cust')&&g('pay_cust').value)||(DB.customers[0]||{}).id; if(!cid0){ toast('Add a customer first.',true); return; }
  rp={cid:cid0,amount:num(amount)||0,date:today(),method:'Bank transfer',dep:'Bank account',ref:'',note:'',no:'PR-'+String((DB.prSeq||0)+1).padStart(4,'0'),docs:[],alloc:{}};
  rp.docs=dueDocs(cid0); if(ref&&rp.docs.some(d=>d.ref===ref)&&rp.amount>0){ rp.alloc[ref]=Math.min(rp.amount,rp.docs.find(d=>d.ref===ref).open); } else rpAuto();
  let o=g('xaRp'); if(!o){ o=document.createElement('div'); o.className='overlay'; o.id='xaRp'; document.body.appendChild(o); }
  const lab=(t,inner,fl)=>'<div style="flex:'+(fl||'1 1 170px')+'"><label style="font-size:.8rem">'+t+'</label>'+inner+'</div>', sel=(id,arr_,cur)=>'<select class="xa-in" id="'+id+'">'+arr_.map(x=>'<option'+(x===cur?' selected':'')+'>'+x+'</option>').join('')+'</select>';
  o.innerHTML='<div class="modal" style="max-width:980px;width:97vw;max-height:94vh;overflow:auto"><h3>Payment received</h3>'
   +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">'+lab('Customer name *','<select class="xa-in" id="rp_cust" onchange="XA.rpCust()">'+DB.customers.map(c=>'<option value="'+c.id+'"'+(c.id===cid0?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select><div class="xa-hint" id="rp_due" style="margin:2px 0 0">Outstanding: AED '+fmtM(rp.docs.reduce((s,d)=>s+d.open,0))+'</div>','2 1 260px')
   +lab('Amount received (AED) *','<input class="xa-in" type="number" step="any" id="rp_amt" value="'+(rp.amount||'')+'" oninput="XA.rpAmt(this.value)">')+lab('Payment date *','<input class="xa-in" type="date" id="rp_date" value="'+rp.date+'">')+'</div>'
   +'<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">'+lab('Payment #','<input class="xa-in" id="rp_no" value="'+rp.no+'">')+lab('Payment mode',sel('rp_mode',['Bank transfer','Cash','Cheque','Card','Online payment','Other'],rp.method))+lab('Deposit to',sel('rp_dep',['Bank account','Petty cash','Undeposited funds'],rp.dep))+lab('Reference #','<input class="xa-in" id="rp_ref" placeholder="Cheque / transfer no.">')+'</div>'
   +'<div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 4px"><b>Unpaid invoices</b><span><button class="btn sm ghost" onclick="XA.rpApply()">Auto-apply (oldest first)</button> <button class="btn sm ghost" onclick="XA.rpClear()">Clear applied amount</button></span></div>'
   +'<div style="overflow:auto"><table class="xa-tbl"><thead><tr><th>Date</th><th>Invoice #</th><th>Due date</th><th class="n">Invoice amount</th><th class="n">Amount due</th><th>Payment</th></tr></thead><tbody id="rp_rows"></tbody></table></div>'
   +'<div style="display:flex;justify-content:flex-end;margin-top:8px"><div style="min-width:300px;line-height:1.8" id="rp_sum"></div></div>'
   +'<div style="margin-top:8px"><label style="font-size:.8rem">Notes</label><textarea class="xa-in" id="rp_note" rows="2"></textarea></div>'
   +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="btn ghost" onclick="XA.rpClose()">Cancel</button><button class="btn" onclick="XA.rpSave()">💾 Save payment</button></div></div>';
  o.classList.add('show'); o.style.display='flex'; rpRows(); };

/* ================== QUOTE TEMPLATES: Standard / Proforma (PI) / Arabic / Lite ================== */
const QT=[['std','Standard'],['pi','Proforma Invoice (PI)'],['ar','Arabic (bilingual)'],['lite','Lite']];
const QAR={'QUOTE':'عرض سعر','PROFORMA INVOICE':'فاتورة مبدئية','Bill To':'فاتورة إلى','Ship To':'شحن إلى','Quote#':'رقم العرض','PI#':'رقم الفاتورة المبدئية','Quote Date':'تاريخ العرض','PI Date':'التاريخ','Sales person':'مندوب المبيعات','Subject :':'الموضوع','Item &amp; Description':'الصنف والوصف','Qty':'الكمية','Rate':'السعر','Disc':'الخصم','Tax':'الضريبة','Amount':'المبلغ','Sub Total':'المجموع الفرعي','Total Taxable Amount':'المبلغ الخاضع للضريبة','Total':'الإجمالي','Terms &amp; Conditions':'الشروط والأحكام','Reference#':'المرجع'};
function qTplHtml(q,tpl){ let h=qDocBase(q);
  if(tpl==='pi'){ h=h.replace('>QUOTE<','>PROFORMA INVOICE<').replace('>Quote#<','>PI#<').replace('>Quote Date<','>PI Date<'); const co=DB.company||{}; const bank=(co.bankName||co.bankAcNo||co.bankIBAN)?'<div class="tc"><h4>Bank details</h4><div>'+[co.bankName&&('Bank: '+esc(co.bankName)),co.bankAccName&&('Account name: '+esc(co.bankAccName)),co.bankAcNo&&('Account no.: '+esc(co.bankAcNo)),co.bankIBAN&&('IBAN: '+esc(co.bankIBAN)),co.bankSwift&&('Swift: '+esc(co.bankSwift))].filter(Boolean).join('<br>')+'</div></div>':'';
    h=h.replace('<div class="tc"><h4>Terms','<div style="margin-top:16px;padding:8px 12px;border:1px dashed #bbb;background:#fafafa"><b>Proforma invoice — not a tax invoice.</b> Goods / services are released against payment. A tax invoice will be issued once payment is received.</div>'+bank+'<div class="tc"><h4>Terms'); }
  else if(tpl==='ar'){ Object.keys(QAR).sort((a,b)=>b.length-a.length).forEach(k=>{ const esk=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); h=h.replace(new RegExp('(>\\s*)'+esk+'(\\s*<)','g'),'$1'+k+' / '+QAR[k]+'$2'); }); h=h.replace('<style>','<style>body{font-family:"Segoe UI",Tahoma,Arial,sans-serif}'); }
  else if(tpl==='lite'){ h=h.replace('</style>','.top img{display:none}.top{justify-content:flex-end}body{font-size:11px;padding:20px 26px 50px}.ttl{margin:4px 0 10px}.ttl span{font-size:17px}th,td{padding:5px 8px}.bar div,.vals div{padding:5px 8px}.two{margin-bottom:10px}.tc h4{font-size:12px}.tc{margin-top:12px;font-size:10px}</style>'); }
  return h; }
const qDocBase=window.qDocHtml;
window.qDocHtml=function(q){ const t=q.tpl||(DB.company||{}).qTpl||'std'; return t==='std'?qDocBase(q):qTplHtml(q,t); };
XA._rp=()=>rp; XA._tpl=qTplHtml;
XA.qTpl=function(id,v){ const q=DB.quotes.find(x=>x.id===id); if(!q) return; q.tpl=v; save(); qView(id); };
const qView0=window.qView;
window.qView=function(id){ qView0.apply(this,arguments); try{ const q=DB.quotes.find(x=>x.id===id), t=q.tpl||(DB.company||{}).qTpl||'std'; g('dvBtns').insertAdjacentHTML('afterbegin','<select title="Quote template" onchange="XA.qTpl(\''+id+'\',this.value)" style="width:auto;padding:4px 6px;margin-right:6px">'+QT.map(x=>'<option value="'+x[0]+'"'+(x[0]===t?' selected':'')+'>'+x[1]+'</option>').join('')+'</select>'); }catch(e){} };

/* New Customer: the Contract tab is removed (contracts are added from Contracts / Add Machine) */
if(!g('xaCss9')){ const st=document.createElement('style'); st.id='xaCss9'; st.textContent='#zt_contract{display:none!important}'; document.head.appendChild(st); }
})();
