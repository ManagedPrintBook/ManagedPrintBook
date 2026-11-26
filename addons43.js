/* ===== Add-on 43 (v20261126a): Zoho-style short dates (06.11.26) on Invoices, invoice documents and Reports =====
   The date style is switched on only while the Invoice list, invoice/sales-invoice documents and report screens are drawn,
   so contracts, readings and other pages keep their existing dd-mm-yyyy format. */
(function(){
'use strict';
const ISO=/\b(\d{4})-(\d{2})-(\d{2})\b/g, DMY=/\b(\d{2})-(\d{2})-(\d{4})\b/g;
const conv=t=>String(t).replace(DMY,(m,d,mo,y)=>d+'.'+mo+'.'+y.slice(2)).replace(ISO,(m,y,mo,d)=>d+'.'+mo+'.'+y.slice(2));
/* convert dates in visible text only (never inside tags/attributes) */
const convHtml=h=>String(h||'').replace(/>([^<]+)</g,(m,t)=>'>'+conv(t)+'<');
function convDom(root){ if(!root) return; const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null); const L=[]; let n; while((n=w.nextNode())){ const p=n.parentNode&&n.parentNode.nodeName; if(p==='SCRIPT'||p==='STYLE') continue; L.push(n); } L.forEach(t=>{ const v=conv(t.nodeValue); if(v!==t.nodeValue) t.nodeValue=v; }); }

/* run fn with short dates on (restores the previous state even on error) */
function wrap(name,after){
  const f=window[name]; if(typeof f!=='function'||f.__xa43) return;
  const w=function(){ const prev=__zd; __zd=true; try{ const r=f.apply(this,arguments); if(after) try{ after(); }catch(e){} return r; } finally{ __zd=prev; } };
  w.__xa43=true; window[name]=w;
}

function install(){
  /* 1. Invoice History list (Date, Due Date and the period line under the customer name) */
  wrap('renderInvoices',()=>convDom(document.getElementById('invTable')));
  /* 2. Invoice documents: new invoices are built in the short style, saved/old ones are converted when opened */
  ['invoiceHTML','siDocHtml'].forEach(n=>wrap(n));
  if(typeof window.showDoc==='function'&&!window.showDoc.__xa43){
    const f=window.showDoc; const w=function(html,doc){ const a=Array.prototype.slice.call(arguments); if(doc&&(doc.kind==='invoice'||doc.kind==='sale')) a[0]=convHtml(html); const prev=__zd; __zd=true; try{ return f.apply(this,a); } finally{ __zd=prev; } };
    w.__xa43=true; window.showDoc=w;
  }
  /* sales invoices open through their own viewer */
  ['siView','viewInvoice','siMail','siWA'].forEach(n=>wrap(n));
  /* 3. Reports (table, drill-down, print/PDF, CSV/Excel) */
  ['rpRun','rpTable','rpTab','rpPrint','rpCsv','rpDrill','rpChart','rpBill','rpInv','rpBal','rpAge','rpQte','rpItm','rpAmc','rpCatRep','rpGroup'].forEach(n=>wrap(n));
  /* 4. Editing an invoice date: stored HTML may hold the old style, so convert it first so the find/replace still matches */
  if(typeof window.iedSave==='function'&&!window.iedSave.__xa43){
    const f=window.iedSave; const w=function(){ try{ if(typeof iedKind!=='undefined'&&iedKind==='L'){ const v=DB.invoices[iedKey]; if(v&&v.html) v.html=convHtml(v.html); } }catch(e){} const prev=__zd; __zd=true; try{ return f.apply(this,arguments); } finally{ __zd=prev; } };
    w.__xa43=true; window.iedSave=w;
  }
}
install();
/* later add-ons may re-wrap these functions – install again once everything has loaded and refresh what is on screen */
window.addEventListener('load',()=>{ setTimeout(()=>{ try{ install(); }catch(e){} try{ if(document.getElementById('invTable')&&document.getElementById('invTable').innerHTML) renderInvoices(); }catch(e){} try{ if(typeof rpCur!=='undefined'&&rpCur) rpRun(); }catch(e){} },600); });
})();
