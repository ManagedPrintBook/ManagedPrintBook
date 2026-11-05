/* ===== Add-on 30: Rebrand (product name, palette, white-label) + two editions: "ManagePrint Book" (MPS billing core) and "ManagePrint ERP" (MPS + office automation) ===== */
(function(){
'use strict';
if(!window.XA||typeof DB==='undefined') return;
const XA=window.XA, g=id=>document.getElementById(id), X30=window.X30={};
const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
const role=()=>{ const m=window.curUser&&window.curUser(); return m?m.role:null; };
const sv=()=>{ try{ XA.save(); }catch(e){ try{ save(); }catch(_){} } };
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
const hex2=h=>{ h=String(h||'').replace('#',''); if(h.length===3) h=h.replace(/./g,'$&$&'); return [0,2,4].map(i=>parseInt(h.substr(i,2),16)||0); };
const toHex=a=>'#'+a.map(v=>clamp(v).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>{ const x=hex2(a),y=hex2(b); return toHex(x.map((v,i)=>v+(y[i]-v)*t)); };
const PRESETS={
  teal:{n:'ManagePrint Teal',primary:'#0f3d3e',accent:'#14b8a6'},
  indigo:{n:'Indigo',primary:'#1e1b4b',accent:'#6366f1'},
  graphite:{n:'Graphite',primary:'#1f2937',accent:'#f59e0b'},
  classic:{n:'Classic (navy and amber)',primary:'#14213d',accent:'#f2a541'}};
const EDS={book:'ManagePrint Book',erp:'ManagePrint ERP'};
const B=()=>{ const b=(DB.brand=DB.brand||{}); b.product=b.product||'ManagePrint'; b.tag=b.tag==null?'Managed print and office automation':b.tag; if(!b.primary){ b.primary=PRESETS.teal.primary; b.accent=PRESETS.teal.accent; } b.edition=b.edition||'erp'; return b; };
function applyColors(){ const b=B(), r=document.documentElement.style, P=b.primary, A=b.accent;
  r.setProperty('--navy',P); r.setProperty('--navy2',mix(P,'#ffffff',.12)); r.setProperty('--amber',A); r.setProperty('--amber-d',mix(A,'#000000',.15)); r.setProperty('--amber-soft',mix(A,'#ffffff',.85)); r.setProperty('--blue',mix(A,'#000000',.1)); r.setProperty('--blue-soft',mix(A,'#ffffff',.88));
  const t=document.querySelector('meta[name=theme-color]'); if(t) t.setAttribute('content',P); }
const ERP_X=['po','bank','cpl','zoho','srt','shi','rma','loc','qlnk','wl','qfu','lead'];
const ERP_G=['Items','Sales','Suppliers'];
function isErpLink(gname,a){ const t=a.dataset.t, v=a.dataset.v||''; if(t==='xa'&&ERP_X.includes(v)) return true; if(!ERP_G.includes(gname)) return false; return !(t==='sales'&&(v==='M'||v==='main')); }
function applyEdition(){ const nav=g('nav'); if(!nav) return; const book=B().edition==='book';
  nav.querySelectorAll('.nv').forEach(n=>{ const G=(typeof SD!=='undefined'&&SD[+n.dataset.g])||null, gname=G?G.g:''; let vis=0;
    n.querySelectorAll('.nd a').forEach(a=>{ const hide=book&&isErpLink(gname,a); a.style.display=hide?'none':''; if(!hide) vis++; });
    n.style.display=vis?'':'none'; }); }
function applyText(){ const b=B(), t=document.querySelector('.hdr .ttl'); if(t){ const want=b.product+' '+(b.edition==='book'?'Book':'ERP'); if(t.dataset.b!==want){ t.dataset.b=want; t.innerHTML=E(want)+(b.tag?'<small style="display:block;font-weight:400;font-size:.68rem;opacity:.75;letter-spacing:.3px">'+E(b.tag)+'</small>':''); } }
  const full=b.product+(b.edition==='book'?' Book':' ERP'); if(document.title!==full) document.title=full;
  const c=g('cl_title'); if(c&&c.dataset.b!==full){ c.dataset.b=full; c.textContent='Sign in to '+full; } }
function applyAll(){ try{ applyColors(); applyText(); applyEdition(); }catch(e){} }
const sb=window.sdBuild; if(typeof sb==='function'&&!sb.__g30){ window.sdBuild=function(){ const r=sb.apply(this,arguments); applyEdition(); return r; }; window.sdBuild.__g30=1; }
X30.preset=k=>{ const p=PRESETS[k]; if(!p) return; const b=B(); b.primary=p.primary; b.accent=p.accent; sv(); applyAll(); XA.refresh(); };
X30.color=(k,v)=>{ B()[k]=v; sv(); applyAll(); };
X30.text=(k,v)=>{ B()[k]=v.trim(); sv(); applyAll(); };
X30.edition=v=>{ B().edition=v; sv(); applyAll(); try{ if(typeof sdBuild==='function') sdBuild(); }catch(e){} XA.refresh(); };
XA.reg('brand',{title:'Branding and edition',render(){ if(role()!=='admin') return '<div class="card pad"><div class="empty">Only the Admin can open this page.</div></div>'; const b=B();
  const sec=(t,h)=>'<div class="card pad" style="margin-bottom:12px"><h3 style="margin:0 0 8px">'+t+'</h3>'+h+'</div>';
  const inp=(l,k,ph)=>'<div style="flex:1 1 240px"><label style="font-size:.8rem">'+l+'</label><input class="xa-in" value="'+E(b[k])+'" placeholder="'+ph+'" onchange="X30.text(\''+k+'\',this.value)"></div>';
  return '<div class="sec" style="margin-top:0"><h2>Branding and edition</h2></div>'
   +sec('Edition','<div class="xa-hint" style="margin:0 0 8px">Choose which product this installation presents. The menu adapts at once.</div>'
     +['book','erp'].map(k=>'<label style="display:block;margin:6px 0;cursor:pointer"><input type="radio" name="ed30" '+(b.edition===k?'checked':'')+' onchange="X30.edition(\''+k+'\')"> <b>'+E(b.product)+' '+(k==='book'?'Book':'ERP')+'</b> - '+(k==='book'?'the managed print billing core: customers, contracts, machines, meter readings, excess billing, invoices, payments, statements, tickets, toner, reports and customer portal.':'everything in Book plus sales quotes and invoices, stock and pricing, suppliers and purchase bills, landed cost, sales returns, purchase orders, bank reconciliation, leads and win / loss.')+'</label>').join(''))
   +sec('Product identity','<div style="display:flex;gap:10px;flex-wrap:wrap">'+inp('Product name','product','ManagePrint')+inp('Tagline (shown under the name)','tag','Managed print and office automation')+'</div><div class="xa-hint" style="margin-top:6px">Shown in the header, browser tab and sign-in page. Your company name and logo on invoices still come from Company settings.</div>')
   +sec('Colours','<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">'+Object.keys(PRESETS).map(k=>'<button class="btn sm ghost" onclick="X30.preset(\''+k+'\')"><span style="display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px;margin-right:6px;background:linear-gradient(135deg,'+PRESETS[k].primary+' 50%,'+PRESETS[k].accent+' 50%)"></span>'+E(PRESETS[k].n)+'</button>').join('')+'</div>'
     +'<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"><label>Header colour <input type="color" value="'+b.primary+'" onchange="X30.color(\'primary\',this.value)"></label><label>Accent colour <input type="color" value="'+b.accent+'" onchange="X30.color(\'accent\',this.value)"></label></div>'); }});
function menu(){ if(typeof SD==='undefined'||SD.__x30) return; const G=SD.find(x=>x.g==='Admin'); if(!G) return; SD.__x30=1; if(!G.items.some(i=>i[2]==='brand')) G.items.push(['Branding & Edition','xa','brand']); try{ sdBuild(); }catch(e){} }
setInterval(()=>{ menu(); applyAll(); },1000);
applyAll(); menu();
})();
