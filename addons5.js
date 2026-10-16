/* ===== Add-on 5: Zoho-style quote & invoice editors (item description, auto-map by code, bulk add, customer combo, edit invoice in full editor) ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id), num=x=>parseFloat(String(x==null?'':x).replace(/,/g,''))||0;
const X=window.XA5={}, R=c=>c==='p'?pRows:qRows, calc=c=>c==='p'?pCalc():qCalc(), draw=c=>c==='p'?pDraw():qDraw();
const blank=()=>({item:'',desc:'',unit:'nos',qty:1,rate:0,disc:0,tax:5,cost:0});

/* ---- item rows: name + description underneath ---- */
function rowHtml(l,i,c){ const q=c==='q', nm=(f,t,w,ex)=>'<input type="number" '+(ex||'')+' class="zin" style="width:'+w+'px" value="'+l[f]+'" oninput="XA5.set(\''+c+'\','+i+',\''+f+'\',this)">';
 return '<tr><td style="vertical-align:top"><input class="zin" style="width:100%" value="'+esc(l.item)+'" placeholder="Type or click to select an item (name or SKU, e.g. CK-8315)" oninput="XA5.set(\''+c+'\','+i+',\'item\',this);XA5.sug(this,\''+c+'\','+i+')" onfocus="XA5.sug(this,\''+c+'\','+i+')" onkeydown="XA5.itemKey(event,this,\''+c+'\','+i+')" onblur="XA5.blur(\''+c+'\','+i+')"><textarea class="zin" rows="'+Math.max(2,String(l.desc||'').split('\n').length)+'" style="width:100%;margin-top:4px;resize:vertical;font-size:.85em" placeholder="Add a description to your item (Shift+Enter = next line)" oninput="XA5.set(\''+c+'\','+i+',\'desc\',this)" onkeydown="XA5.descKey(event,\''+c+'\','+i+')">'+esc(l.desc||'')+'</textarea></td>'
 +'<td style="vertical-align:top">'+nm('qty','',72,'min="1"')+'</td>'+(q?'<td style="vertical-align:top"><input class="zin" style="width:70px" value="'+esc(l.unit||'nos')+'" oninput="XA5.set(\'q\','+i+',\'unit\',this)"></td>':'')
 +'<td style="vertical-align:top">'+nm('rate','',100,'step="0.01"')+'</td><td style="vertical-align:top">'+nm('disc','',64)+'</td><td style="vertical-align:top"><select class="zin" onchange="XA5.set(\''+c+'\','+i+',\'tax\',this)"><option value="0"'+(l.tax==0?' selected':'')+'>No tax</option><option value="5"'+(l.tax==5?' selected':'')+'>VAT 5%</option></select></td><td class="n" style="vertical-align:top" id="'+(q?'qa':'pa')+i+'"></td><td style="vertical-align:top"><button class="btn sm ghost" onclick="XA5.del(\''+c+'\','+i+')">✕</button></td></tr>'; }
window.pDraw=function(){ g('pRows').innerHTML=pRows.map((l,i)=>rowHtml(l,i,'p')).join(''); pCalc(); };
window.qDraw=function(){ g('qRows').innerHTML=qRows.map((l,i)=>rowHtml(l,i,'q')).join(''); qCalc(); };
window.pAddRow=function(){ pRows.push(blank()); pDraw(); }; window.qAddRow=function(){ qRows.push(blank()); qDraw(); };
X.set=function(c,i,k,el){ const l=R(c)[i]; if(!l) return; l[k]=(k==='item'||k==='desc'||k==='unit')?el.value:(+el.value||0); if(k==='desc') el.rows=Math.max(2,el.value.split('\n').length); if(k!=='item'&&k!=='desc'&&k!=='unit') calc(c); };
X.del=function(c,i){ R(c).splice(i,1); if(!R(c).length) R(c).push(blank()); draw(c); };
X.sug=function(el,c,i){ qSug(el,i,c==='p'?'p':undefined); };
function find(t,loose){ t=String(t||'').trim().toLowerCase(); if(!t) return null; const P=qProducts(); let m=P.find(p=>(p.sku||'').toLowerCase()===t)||P.find(p=>p.n.toLowerCase()===t); if(m) return m; if(!loose) return null; const w=t.split(/\s+/); const a=P.filter(p=>w.every(x=>(p.n+' '+(p.sku||'')).toLowerCase().includes(x))); return a.length===1?a[0]:(loose==='first'&&a[0]?a[0]:null); }
function apply(c,i,p){ const l=R(c)[i]; l.item=p.n; if(p.rate) l.rate=p.rate; if(p.cost) l.cost=p.cost; if(p.desc&&!l.desc) l.desc=p.desc; if(p.unit) l.unit=p.unit; qSugHide(); draw(c); }
X.blur=function(c,i){ setTimeout(function(){ const l=R(c)[i]; if(!l) return; const p=find(l.item,true); if(p&&p.n!==l.item) apply(c,i,p); },180); setTimeout(qSugHide,200); };
function focusQty(c,i){ const tb=g(c==='p'?'pRows':'qRows'), r=tb&&tb.rows[i]; if(r){ const q=r.querySelector('input[type=number]'); if(q){ q.focus(); q.select(); } } }
X.itemKey=function(e,el,c,i){ if(e.key==='Enter'){ e.preventDefault(); const p=find(el.value,'first'); if(p) apply(c,i,p); setTimeout(function(){ focusQty(c,i); },30); } };
X.descKey=function(e,c,i){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); focusQty(c,i); } };   /* Shift+Enter = new line in the description */

/* ---- Add items in bulk ---- */
X.bulk=function(c){ let ov=g('xa5Bulk'); if(!ov){ ov=document.createElement('div'); ov.className='overlay'; ov.id='xa5Bulk'; document.body.appendChild(ov); } ov.classList.add('show'); ov.style.display='flex';
 ov.innerHTML='<div class="modal" style="max-width:560px"><h3>Add items in bulk</h3><div class="hint">One item per line: <b>item name or SKU, quantity</b> — e.g. <i>CK-8315, 2</i>. Saved items fill their price and description automatically.</div><textarea id="xb_t" class="zin" rows="8" style="width:100%" placeholder="CK-8315, 2&#10;TK-5239K 1"></textarea><div id="xb_r" class="hint" style="margin-top:6px"></div><div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end"><button class="btn sm ghost" onclick="document.getElementById(\'xa5Bulk\').style.display=\'none\'">Cancel</button><button class="btn sm" onclick="XA5.bulkAdd(\''+c+'\')">Add items</button></div></div>'; setTimeout(function(){ g('xb_t').focus(); },50); };
X.bulkAdd=function(c){ const L=g('xb_t').value.split('\n').map(x=>x.trim()).filter(Boolean), A=R(c); let miss=0; if(A.length===1&&!A[0].item.trim()) A.length=0;
 L.forEach(function(line){ const m=line.match(/^(.*?)[\s,;|\t]+x?\s*(\d+(?:\.\d+)?)\s*$/i), name=(m?m[1]:line).replace(/[,;|]+$/,'').trim(), qty=m?+m[2]:1, p=find(name,true), l=blank(); l.qty=qty||1; if(p){ l.item=p.n; if(p.rate) l.rate=p.rate; if(p.cost) l.cost=p.cost; l.desc=p.desc||''; l.unit=p.unit||'nos'; } else { l.item=name; miss++; } A.push(l); });
 if(!A.length) A.push(blank()); g('xa5Bulk').style.display='none'; draw(c); if(miss) toast(miss+' item(s) are not in your item list — added as typed; set their price.',true); };

/* ---- salesperson list (select or add) ---- */
function spList(){ let d=g('spList'); if(!d){ d=document.createElement('datalist'); d.id='spList'; document.body.appendChild(d); } const S={}; if(DB.company&&DB.company.salesPerson) S[DB.company.salesPerson]=1; (DB.quotes||[]).forEach(q=>{ if(q.sales) S[q.sales]=1; }); (DB.sales||[]).forEach(x=>{ if(x.sp) S[x.sp]=1; }); const h=Object.keys(S).sort().map(n=>'<option value="'+esc(n)+'">').join(''); if(d.innerHTML!==h) d.innerHTML=h; const q=g('q_sp'); if(q&&!q.getAttribute('list')) q.setAttribute('list','spList'); }

/* ---- customer: search + expandable list ---- */
function cbx(id,ph){ const sel=g(id); if(!sel||sel.dataset.cbx) return; sel.dataset.cbx=1; sel.style.display='none'; const w=document.createElement('div'); w.style.cssText='position:relative;width:100%;max-width:520px';
 w.innerHTML='<input class="zin" autocomplete="off" placeholder="'+ph+'" style="width:100%;padding-right:32px"><button type="button" tabindex="-1" style="position:absolute;right:2px;top:2px;bottom:2px;width:30px;border:0;background:none;cursor:pointer;font-size:14px">▾</button><div style="display:none;position:absolute;left:0;right:0;top:100%;z-index:9000;background:#fff;color:#222;border:1px solid #cfd4dc;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.18);max-height:280px;overflow:auto"></div>';
 sel.parentNode.insertBefore(w,sel.nextSibling); const inp=w.children[0], btn=w.children[1], dd=w.children[2], txt=()=>{ const o=sel.options[sel.selectedIndex]; return o?o.text:''; };
 const show=all=>{ const t=inp.value.trim().toLowerCase(), ws=(all?'':t).split(/\s+/).filter(Boolean), O=Array.prototype.slice.call(sel.options).filter(o=>o.value&&ws.every(x=>o.text.toLowerCase().includes(x)));
   dd.innerHTML=O.length?(all?'':'<div style="padding:5px 10px;color:#667;border-bottom:1px solid #eee">'+O.length+' match(es)</div>')+O.map(o=>'<div data-v="'+esc(o.value)+'" style="padding:7px 12px;cursor:pointer" onmouseover="this.style.background=\'#eaf1ff\'" onmouseout="this.style.background=\'\'">'+esc(o.text)+'</div>').join(''):'<div style="padding:10px;color:#667">No customer matches.</div>'; dd.style.display=''; };
 const pick=v=>{ sel.value=v; sel.dispatchEvent(new Event('change')); inp.value=txt(); dd.style.display='none'; };
 dd.onmousedown=e=>{ e.preventDefault(); const d=e.target.closest('[data-v]'); if(d) pick(d.getAttribute('data-v')); };
 btn.onmousedown=e=>{ e.preventDefault(); if(dd.style.display==='none'){ inp.focus(); show(true); } else dd.style.display='none'; };
 inp.oninput=()=>show(false); inp.onfocus=()=>{ inp.select(); show(true); }; inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); const f=dd.querySelector('[data-v]'); if(f) pick(f.getAttribute('data-v')); } else if(e.key==='Escape') dd.style.display='none'; };
 inp.onblur=()=>{ dd.style.display='none'; inp.value=txt(); };
 setInterval(()=>{ inp.disabled=sel.disabled; btn.disabled=sel.disabled; if(document.activeElement!==inp&&inp.value!==txt()) inp.value=txt(); },400); }

/* ---- invoices: edit opens the full Zoho-style editor (no small pop-up) ---- */
X.lease=null;
const unlock=()=>{ X.lease=null; const c=g('sl_cust'); if(c) c.disabled=false; const n=g('slN'); if(n) n.classList.remove('xa5-lock'); };
const _pNew=window.pNew; window.pNew=function(){ unlock(); _pNew.apply(this,arguments); ['sl_po','sl_proj','sl_sp','sl_subj'].forEach(i=>{ if(g(i)) g(i).value=''; }); };
const _slEdit=window.slEdit; window.slEdit=function(id){ unlock(); _slEdit.apply(this,arguments); const s=DB.sales.find(x=>x.id===id); if(s){ g('sl_po').value=s.po||''; g('sl_proj').value=s.proj||''; g('sl_sp').value=s.sp||''; if(!g('sl_subj').value) g('sl_subj').value=s.subj||''; } };
window.invEdit=function(kind,key){ if(kind!=='L'){ const L=DB.sales.filter(x=>x.inv===key); if(L[0]){ window.slEdit(L[0].id); return; } }
 const v=DB.invoices[key]; if(!v) return; go('sales','N'); window.pNew(); g('sl_cust').value=v.cid; g('sl_date').value=v.date; g('sl_inv').value=v.no; g('sl_ref').value=v.ref||'Lease'; g('sl_po').value=v.po||''; g('sl_proj').value=v.proj||''; g('sl_sp').value=v.sp||''; g('sl_subj').value=v.subj||'';
 pRows=[{item:'Lease invoice '+v.no,desc:'Amount and customer are fixed — the printed lease invoice and the customer ledger depend on them.',unit:'nos',qty:1,rate:v.total,disc:0,tax:0,cost:0}]; pDraw();
 X.lease=key; g('sl_cust').disabled=true; g('slN').classList.add('xa5-lock'); g('pTitle').textContent='Edit lease invoice '+v.no; g('sl_addbtn').textContent='✔ Update invoice'; };
const _slAdd=window.slAdd; window.slAdd=function(){ if(X.lease==null) return _slAdd.apply(this,arguments);
 const v=DB.invoices[X.lease]; if(!v){ unlock(); return; } const no=g('sl_inv').value.trim(), date=g('sl_date').value; if(!no||!date){ toast('Invoice # and date are required.',true); return; }
 if(no!==v.no&&(DB.invoices.some(x=>x.no===no)||DB.sales.some(x=>x.inv===no))){ toast('Invoice number '+no+' already exists.',true); return; }
 const on=v.no, od=v.date; v.no=no; v.date=date; v.ref=g('sl_ref').value; v.po=g('sl_po').value.trim(); v.proj=g('sl_proj').value.trim(); v.sp=g('sl_sp').value.trim(); v.subj=g('sl_subj').value.trim();
 if(v.html){ v.html=v.html.split(on).join(no); if(od!==date) v.html=v.html.split(fmtDMY(od)).join(fmtDMY(date)); }
 save(); unlock(); renderAll(); renderInvoices(); try{ if(rpCur) rpRun(); }catch(e){} slView('I'); toast('Invoice updated.'); };

/* ---- styles + init ---- */
const st=document.createElement('style'); st.textContent='#slN.xa5-lock #pRows input,#slN.xa5-lock #pRows textarea,#slN.xa5-lock #pRows select,#slN.xa5-lock #pRows button{pointer-events:none;opacity:.6}#slN.xa5-lock button[onclick*="pAddRow"],#slN.xa5-lock button[onclick*="XA5.bulk"]{display:none}#pRows td,#qRows td{padding:6px 8px}'; document.head.appendChild(st);
setInterval(function(){ try{ spList(); cbx('sl_cust','Select or search a customer'); cbx('q_cust','Select or search a customer'); if(g('sl_sp')&&!g('sl_sp').getAttribute('list')) g('sl_sp').setAttribute('list','spList'); }catch(e){} },800);
})();
