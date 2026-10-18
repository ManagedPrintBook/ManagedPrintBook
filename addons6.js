/* ===== Add-on 6: credit limits, customer timeline, lead pipeline, VAT output summary, backup & restore ===== */
(function(){
'use strict';
const XA=window.XA; if(!XA) return;
const g=id=>document.getElementById(id), num=x=>parseFloat(String(x==null?'':x).replace(/,/g,''))||0, arr=k=>(DB[k]=DB[k]||[]);
const {kpi,kpis,pill,aed,fm}=XA, today=()=>todayISO(), cn=id=>{ const c=custById(id); return c?c.name:'(deleted)'; };
const H=(t,b)=>'<div class="sec" style="margin-top:0"><h2>'+t+'</h2><span style="margin-left:auto">'+(b||'')+'</span></div>';
const B=(l,f)=>'<button class="btn sm ghost" onclick="'+f+'">'+l+'</button>';
const tbl=(h,rows)=>rows.length?'<div class="card" style="overflow:auto"><table><thead><tr>'+h.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<div class="card pad"><div class="empty">Nothing here yet.</div></div>';
XA.FIN.push('crl','tl','lead','vat','bak');

/* ---------- Credit limit & hold ---------- */
XA.reg('crl',{render(){ const rows=DB.customers.map(c=>({c,a:acct(c.id),lim:num(c.creditLimit)})).sort((a,b)=>b.a.overdue-a.a.overdue);
 return H('Credit limits & hold')+kpis(kpi('Over limit',rows.filter(r=>r.lim>0&&r.a.balance>r.lim).length,'customer(s)')+kpi('On hold',DB.customers.filter(c=>c.hold).length,'customer(s)'))
 +tbl(['Customer','Balance','Overdue','Credit limit','Status',''],rows.map(({c,a,lim})=>{ const over=lim>0&&a.balance>lim; return [esc(c.name),fmtM(a.balance),fmtM(a.overdue),lim?fmtM(lim):'—',c.hold?pill('bad','On hold'):over?pill('warn','Over limit'):pill('good','OK'),B('Set limit','XA.crlSet(\''+c.id+'\')')+' '+B(c.hold?'Release':'Hold','XA.crlHold(\''+c.id+'\')')];})); }});
XA.crlSet=id=>{ const c=custById(id); fm('Credit limit — '+c.name,[{k:'l',label:'Credit limit (AED, 0 = none)',type:'number',val:c.creditLimit||0}],o=>{ c.creditLimit=num(o.l); XA.save(); }); };
XA.crlHold=id=>{ const c=custById(id); c.hold=!c.hold; XA.save(); };

/* ---------- Customer activity timeline ---------- */
XA.reg('tl',{render(){ const cid=XA.tlCid||(DB.customers[0]||{}).id, ev=[];
 if(cid){ DB.invoices.filter(i=>i.cid===cid).forEach(i=>ev.push([i.date,'🧾','Invoice '+i.no,fmtM(i.total)]));
  arr('ledger').filter(l=>l.cid===cid).forEach(l=>ev.push([l.date,l.type==='payment'?'💰':'📒',(l.type==='payment'?'Payment ':'Entry ')+(l.ref||''),fmtM(l.amount)]));
  arr('tickets').filter(t=>t.cid===cid).forEach(t=>ev.push([String(t.date||t.at||'').slice(0,10),'🛠','Ticket '+(t.no||''),t.st||'']));
  arr('follow').filter(f=>f.cid===cid).forEach(f=>ev.push([String(f.at||'').slice(0,10),'📞','Follow-up',f.note||'']));
  arr('pdcs').filter(p=>p.cid===cid).forEach(p=>ev.push([p.date,'🏦','Cheque '+p.no,p.st+' · '+fmtM(p.amt)])); }
 ev.sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
 return H('Customer timeline')+'<div class="card pad"><select class="xa-in" style="width:auto" onchange="XA.tlCid=this.value;XA.refresh()">'+DB.customers.map(c=>'<option value="'+c.id+'"'+(c.id===cid?' selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></div>'
 +tbl(['Date','','Activity','Detail'],ev.map(e=>[e[0]?fmtDMY(e[0]):'',e[1],esc(e[2]),esc(String(e[3]))])); }});

/* ---------- Lead pipeline ---------- */
const STG=['New','Contacted','Quoted','Won','Lost'];
XA.reg('lead',{render(){ const L=arr('leads');
 return H('Lead pipeline',B('➕ Add lead','XA.leadEdit()'))+kpis(STG.map(s=>kpi(s,L.filter(l=>l.st===s).length,aed(L.filter(l=>l.st===s).reduce((t,l)=>t+num(l.val),0)))).join(''))
 +tbl(['Company','Contact','Phone','Expected value','Stage','Follow-up',''],L.map(l=>[esc(l.co),esc(l.ct||''),esc(l.ph||''),fmtM(l.val),'<select class="xa-in" style="width:auto" onchange="XA.leadSt(\''+l.id+'\',this.value)">'+STG.map(s=>'<option'+(s===l.st?' selected':'')+'>'+s+'</option>').join('')+'</select>',l.fu?(l.fu<=today()&&l.st!=='Won'&&l.st!=='Lost'?'<b style="color:#c0392b">'+fmtDMY(l.fu)+'</b>':fmtDMY(l.fu)):'—',B('🗑','XA.leadDel(\''+l.id+'\')')])); }});
XA.leadEdit=()=>fm('Add lead',[{k:'co',label:'Company *'},{k:'ct',label:'Contact person',half:1},{k:'ph',label:'Phone / WhatsApp',half:1},{k:'val',label:'Expected value (AED)',type:'number',half:1},{k:'fu',label:'Follow-up date',type:'date',val:today(),half:1}],o=>{ if(!o.co.trim()){ toast('Enter company name.',true); return false; } arr('leads').push({id:uid(),co:o.co.trim(),ct:o.ct,ph:o.ph,val:num(o.val),fu:o.fu,st:'New'}); XA.save(); });
XA.leadSt=(id,s)=>{ const l=arr('leads').find(x=>x.id===id); if(l){ l.st=s; XA.save(); } };
XA.leadDel=id=>askConfirm('Delete this lead?',()=>{ DB.leads=arr('leads').filter(x=>x.id!==id); XA.save(); });

/* ---------- VAT output summary (UAE) ---------- */
XA.reg('vat',{render(){ const by={}; DB.invoices.forEach(i=>{ const m=String(i.date).slice(0,7); const r=by[m]=by[m]||{n:0,sub:0,vat:0,tot:0}; r.n++; r.sub+=num(i.sub); r.vat+=num(i.vat); r.tot+=num(i.total); });
 const ms=Object.keys(by).sort().reverse();
 return H('VAT summary — output tax on invoices')+'<div class="hint" style="margin:6px 0">Output VAT only (from your invoices). Add your purchase VAT from the supplier bills before filing the VAT 201 return.</div>'+tbl(['Month','Invoices','Taxable amount','VAT (5%)','Total'],ms.map(m=>[m,by[m].n,fmtM(by[m].sub),fmtM(by[m].vat),fmtM(by[m].tot)])); }});

/* ---------- Backup & restore ---------- */
XA.reg('bak',{render(){ return H('Backup & restore')+'<div class="card pad"><p>Download a full copy of all your data, or restore from a copy you downloaded earlier.</p><button class="btn" onclick="XA.bakDl()">⬇ Download backup</button> <label class="btn ghost" style="cursor:pointer">⬆ Restore from file<input type="file" accept=".json" style="display:none" onchange="XA.bakUp(this.files[0])"></label></div>'; }});
XA.bakDl=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(DB)],{type:'application/json'})); a.download='ManagedPrintBook-backup-'+today()+'.json'; a.click(); };
XA.bakUp=f=>{ if(!f) return; const r=new FileReader(); r.onload=()=>{ let d; try{ d=JSON.parse(r.result); if(!d||!Array.isArray(d.customers)) throw 0; }catch(e){ toast('This is not a valid backup file.',true); return; }
 askConfirm('Replace ALL current data with this backup ('+d.customers.length+' customers)? Download a backup of the current data first.',()=>{ Object.keys(DB).forEach(k=>delete DB[k]); Object.assign(DB,d); XA.save(); location.reload(); }); }; r.readAsText(f); };

/* ---------- menu ---------- */
function patch(){ if(typeof SD==='undefined'||SD.__xa6||!SD.__xa4) return; SD.__xa6=1; const add=(grp,items)=>{ const G=SD.find(x=>x.g===grp); if(G) items.forEach(it=>G.items.push([it[0],'xa',it[1]])); };
 add('Accounts',[['Credit Limits & Hold','crl'],['VAT Summary','vat'],['Backup & Restore','bak']]); add('Customers',[['Customer Timeline','tl']]); add('Sales',[['Lead Pipeline','lead']]); sdBuild(); }
setInterval(patch,800);
})();
