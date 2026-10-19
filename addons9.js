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

/* New Customer: the Contract tab is removed (contracts are added from Contracts / Add Machine) */
if(!g('xaCss9')){ const st=document.createElement('style'); st.id='xaCss9'; st.textContent='#zt_contract{display:none!important}'; document.head.appendChild(st); }
})();
