/* ===== Add-on 33: smart item suggestions when raising an invoice / quote =====
   Type a keyword, a model (C5550i) or a whole item description and the list shows every RELATED stock item with its availability
   (in stock / low / out of stock / service), best match first. A model number also finds ranges such as "C5535/40/50/60". ===== */
(function(){
'use strict';
if(typeof window.qSug!=='function'||typeof window.qProducts!=='function') return;
const esc2=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
const STOP=new Set(['ref','for','the','and','with','of','a','an','to','in','on','sku','nos','pcs','unit','genuine','mfp','printer','multifunctional','advance','image','imagerunner','ir','ADV'.toLowerCase()]);
const BRANDS=['canon','konica','minolta','kyocera','hp','ricoh','xerox','sharp','epson','brother','samsung','toshiba','lexmark','oki'];
const tok=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
const SERVICE=/^(lease charge|print\/copies|fsma|annual maintenance|service\/repair|amc)|^(lc|fsma|amc|sr)\//i;

/* every model number an item name mentions, ranges expanded: "5535/40/50/60" -> 5535 5540 5550 5560 ; "C5535/5560" -> 5535 5560 */
function models(text){ const out=new Set(), t=String(text||'').toLowerCase();
  (t.match(/\d{3,}(?:\s*\/\s*\d{2,}[a-z]*)*/g)||[]).forEach(g=>{ const parts=g.split('/').map(x=>x.replace(/[^0-9]/g,'')).filter(Boolean); if(!parts.length) return; const base=parts[0]; out.add(base);
    parts.slice(1).forEach(p=>{ out.add(p.length>=base.length?p:base.slice(0,base.length-p.length)+p); }); });
  (t.match(/\d{3,}/g)||[]).forEach(x=>out.add(x)); return out; }
const brandsIn=ts=>BRANDS.filter(b=>ts.includes(b));
const stockOf=name=>{ const n=String(name||'').trim().toLowerCase(); return (DB.stock||[]).find(s=>String(s.item||'').trim().toLowerCase()===n); };

function search(q,list){ const qt=tok(q); if(!qt.length) return {hits:[],more:[]};
  const qm=[...new Set(qt.filter(x=>/\d{3,}/.test(x)).map(x=>x.replace(/[^0-9]/g,'')).filter(x=>x.length>=3))], words=qt.filter(x=>!STOP.has(x)&&!/\d{3,}/.test(x)&&x.length>=2), qb=brandsIn(qt), full=String(q).trim().toLowerCase();
  const hits=[], more=[], cmp0=x=>String(x).toLowerCase().replace(/[^a-z0-9]/g,''), qc=cmp0(q), isCode=qt.length<=3&&qc.length>=4&&/\d/.test(qc)&&/[a-z]/.test(qc);
  list.forEach(p=>{ const hay=(p.n+' '+(p.sku||'')+' '+(p.desc||'')).toLowerCase(), ht=tok(hay), hs=new Set(ht), pm=models(hay); let sc=0;
    const ib=brandsIn(ht); if(qb.length&&ib.length&&!ib.some(b=>qb.includes(b))) return;         /* a Canon search never lists Konica / Kyocera parts */
    if(isCode&&cmp0(hay).includes(qc)){ hits.push({p,sc:30+(p.n.trim().toLowerCase()===full?50:0),mh:1,cover:1}); return; }   /* part code typed with or without dash/space: TK-8525, TK8525, EXV 51 */
    const mh=qm.filter(m=>pm.has(m)).length; sc+=mh*10;
    const wh=words.filter(w=>hs.has(w)||hay.includes(w)).length; sc+=wh;
    if(p.n.trim().toLowerCase()===full) sc+=50;
    const cover=words.length?wh/words.length:1;
    if(qm.length){ if(mh>0) hits.push({p,sc,mh,cover}); else if(words.length>=2&&cover>=0.75&&!/\d{3,}/.test(p.n)) more.push({p,sc,mh,cover}); }
    else if(words.length){ if(cover>=0.999||(words.length>=4&&cover>=0.7)) hits.push({p,sc,mh,cover}); else if(cover>=0.5) more.push({p,sc,mh,cover}); } });
  if(isCode&&hits.some(h=>h.sc>=30)){ more.length=0;   /* related products: other items for the same machines the matched parts fit (same brand) */
    const hm=new Map(), hb=new Set(), inH=new Set(hits.map(h=>h.p)); hits.forEach(h=>{ const t=(h.p.n+' '+(h.p.sku||'')+' '+(h.p.desc||'')).toLowerCase(); brandsIn(tok(t)).forEach(b=>hb.add(b)); models(t).forEach(m=>{ if(m.length>=4&&!qc.includes(m)) hm.set(m,(hm.get(m)||0)+1); }); });
    list.forEach(p=>{ if(inH.has(p)) return; const t=(p.n+' '+(p.sku||'')+' '+(p.desc||'')).toLowerCase(), ib=brandsIn(tok(t)); if(hb.size&&ib.length&&!ib.some(b=>hb.has(b))) return; const pm=models(t); let k=0; hm.forEach((c,m)=>{ if(pm.has(m)) k++; }); if(k) more.push({p,sc:k,mh:k,cover:0}); });
    more.sort((a,b)=>b.sc-a.sc||a.p.n.localeCompare(b.p.n)); more.length=Math.min(more.length,30); }
  const cmp=(a,b)=>b.sc-a.sc||a.p.n.localeCompare(b.p.n); hits.sort(cmp); more.sort(cmp); return {hits,more}; }

function avail(p){ const s=stockOf(p.n), qty=p.stock!=null?+p.stock:(s?+s.qty:null), min=s?+s.min||0:0;
  if(SERVICE.test(p.n)||SERVICE.test(p.sku||'')) return {t:'Service · no stock',c:'#667',bg:'#eef0f4',k:'svc',qty:null};
  if(qty==null) return {t:'Not in stock list',c:'#667',bg:'#eef0f4',k:'none',qty:null};
  if(qty<0) return {t:'Out of stock ('+qty+')',c:'#b91c1c',bg:'#fee2e2',k:'out',qty};
  if(qty===0) return {t:'Out of stock',c:'#b91c1c',bg:'#fee2e2',k:'out',qty};
  if(min>0&&qty<=min) return {t:'Low · '+qty+' left',c:'#92400e',bg:'#fef3c7',k:'low',qty};
  return {t:'● '+qty+' in stock',c:'#166534',bg:'#dcfce7',k:'in',qty}; }

window.qSug=function(inp,i,ctx){ window.qCtx=ctx||'q'; try{ qCtx=ctx||'q'; }catch(e){}
  const raw=inp.value.trim(), box=document.getElementById('qSug'); if(!box) return;
  const all=qProducts(), r=search(raw,all), list=raw?r.hits.concat(r.more).map(x=>x.p):all.slice().sort((a,b)=>a.n.localeCompare(b.n)).slice(0,60);
  try{ qSugList=list; }catch(e){}
  const row=(p,k,rel)=>{ const a=avail(p); return '<div onclick="qPick('+i+','+k+')" style="padding:7px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;border-bottom:1px solid #f0f2f5" onmouseover="this.style.background=\'#eaf1ff\'" onmouseout="this.style.background=\'\'"><span style="min-width:0">'+(p.sku?'<b>'+esc2(p.sku)+'</b> · ':'')+esc2(p.n)+(rel?'<div style="font-size:.72rem;color:#667">'+rel+'</div>':'')+'</span><span style="text-align:right;white-space:nowrap"><span style="display:inline-block;background:'+a.bg+';color:'+a.c+';border-radius:6px;padding:1px 7px;font-size:.74rem;font-weight:700">'+esc2(a.t)+'</span>'+(p.rate?'<div style="color:#667;font-size:.78rem">'+(typeof fmtM==='function'?fmtM(p.rate):p.rate)+'</div>':'')+'</span></div>'; };
  let html='';
  if(!list.length){ html='<div style="padding:10px;color:#667">No saved item matches — keep typing to use it as a new item (add it under Stock to save price/cost).</div>'; }
  else{ const nH=raw?r.hits.length:list.length, av=list.slice(0,nH).map(avail), inS=av.filter(a=>a.k==='in'||a.k==='low'), tot=inS.reduce((s,a)=>s+(a.qty||0),0), out=av.filter(a=>a.k==='out').length;
    html='<div style="padding:7px 12px;background:#f3f5f8;border-bottom:1px solid #e3e6ec;position:sticky;top:0"><b>'+nH+'</b> '+(raw?'related':'')+' item(s) · <span style="color:#166534"><b>'+inS.length+'</b> available ('+tot+' pcs)</span> · <span style="color:#b91c1c"><b>'+out+'</b> out of stock</span></div>';
    list.forEach((p,k)=>{ if(raw&&k===r.hits.length&&r.more.length) html+='<div style="padding:6px 12px;background:#fafbfc;color:#667;font-weight:600;border-bottom:1px solid #eee">Related products</div>'; html+=row(p,k,raw&&k<r.hits.length&&k===0&&r.hits[0].sc>=50?'Exact match':''); }); }
  box.innerHTML=html; box.style.width='520px'; const rc2=inp.getBoundingClientRect(); box.style.left=Math.max(4,Math.min(rc2.left,innerWidth-540))+'px'; box.style.top=Math.min(rc2.bottom+2,innerHeight-350)+'px'; box.style.display=''; };
window.qSug.__g33=1; window.__g33=search;
})();
