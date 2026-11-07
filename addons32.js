/* ===== Add-on 32: Bills Due fixed per MACHINE (lease) + EXCESS copies due · due popup on every company in Contracts · bell alerts ·
   "+ Bill" next to "Enter reading" in the Billing Calendar · bill-preview warnings (unbilled lease / double billing) · reading label check ===== */
(function(){
'use strict';
if(!window.XA||typeof XA.reg!=='function') return;
const num=v=>parseFloat(v)||0, r2=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
const E=s=>(typeof esc==='function'?esc(String(s==null?'':s)):String(s==null?'':s));
const M=v=>(typeof fmtM==='function'?fmtM(v):r2(v).toFixed(2)), dmy=d=>(d?(typeof fmtDMY==='function'?fmtDMY(d):d):'—');
const addM=(s,n)=>{ const [y,m,d]=s.split('-').map(Number); const t=(y*12+(m-1))+n, ny=Math.floor(t/12), nm=t%12+1, dim=new Date(ny,nm,0).getDate(); return ny+'-'+String(nm).padStart(2,'0')+'-'+String(Math.min(d,dim)).padStart(2,'0'); };
const addD=(s,n)=>{ const d=new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const CYC={monthly:1,quarterly:3,'half-yearly':6,halfyearly:6,'semi-annual':6,yearly:12,annual:12};
const stepL=(c,m)=>{ const own=num(m.monthlyLease)>0||m.billM||m.billQ||m.billY; const cyc=own?m.leaseCycle:(num(c.monthlyLease)>0?c.leaseCycle:m.leaseCycle); return CYC[String(cyc||'').toLowerCase()]||1; };
const hasRate=(c,m)=>[m.rateMono,m.rateColor,m.ratePlot,m.rateA0,m.rateA1,m.rateA2,c.rateMono,c.rateColor].some(v=>num(v)>0);
const stepE=(c,m)=>{ const cyc=num(m.rateMono)+num(m.rateColor)>0?m.excessCycle:(c.excessCycle||m.excessCycle); return CYC[String(cyc||'').toLowerCase()]||1; };
const leaseish=(c,m,k)=>/lease/i.test((k&&k.type)||'')||num(m.monthlyLease)>0||m.billM||m.billQ||m.billY||num(c.monthlyLease)>0;
const toISO=s=>{ const x=/(\d{2})-(\d{2})-(\d{4})/.exec(s||''); return x?x[3]+'-'+x[2]+'-'+x[1]:''; };
const PER=/(\d{2}-\d{2}-\d{4})\s+to\s+(\d{2}-\d{2}-\d{4})/;

/* ---------- what each saved invoice really covers (read from the invoice lines, per machine) ---------- */
const covCache=new Map();
function cov(v){ const key=(v.no||'')+'|'+(v.html||'').length; if(covCache.has(key)) return covCache.get(key);
  const o={lease:[],excess:[],parsed:false}; const html=v.html||'';
  html.split('</tr>').forEach(row=>{ if(!/<td/.test(row)) return; const t=row.replace(/<br\s*\/?>/gi,' | ').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
    if(/Lease Charge/i.test(t)){ const p=PER.exec(t.replace(/^.*?(Rental|Bill) Period:/i,'$1 Period:')); if(p){ o.lease.push({from:toISO(p[1]),to:toISO(p[2]),txt:t.toLowerCase()}); o.parsed=true; } }
    else if(/Print\/Copies|Plotter/i.test(t)){ const p=/Period:\s*(\d{2}-\d{2}-\d{4})\s+to\s+(\d{2}-\d{2}-\d{4})/.exec(t), s=/Serial:\s*([A-Za-z0-9\-]+)/.exec(t); if(p){ o.excess.push({from:toISO(p[1]),to:toISO(p[2]),serial:s?s[1]:'',txt:t.toLowerCase()}); o.parsed=true; } } });
  covCache.set(key,o); return o; }
const match=(row,m)=>{ const t=row.txt; if(/all machines/.test(t)) return true; if(m.serial&&t.includes(String(m.serial).toLowerCase())) return true; if(m.eqid&&t.includes(String(m.eqid).toLowerCase())) return true; const d=String(m.department||'').toLowerCase().trim(); return !!d&&t.includes(d); };
const invsOf=c=>(DB.invoices||[]).filter(v=>v.cid===c.id&&!v.cancelled&&v.from&&v.to);
function leaseBilled(invs,m,s){ return invs.some(v=>{ const cv=cov(v); if(!cv.lease.length) return v.from<=s&&v.to>=s; return cv.lease.some(l=>l.from<=s&&l.to>=s&&match(l,m)); }); }
function lastExcess(invs,m){ let last=''; invs.forEach(v=>{ if(v.exTo&&v.exTo>last) last=v.exTo; }); invs.forEach(v=>cov(v).excess.forEach(x=>{ if(x.serial&&m.serial&&x.serial.toLowerCase()===String(m.serial).toLowerCase()&&x.to>last) last=x.to; })); return last; }
const hasUse=(m,r)=>{ try{ const q=rc(m,r); return num(q.mono)+num(q.color)+num(q.plot)+num(q.p0)+num(q.p1)+num(q.p2)>0; }catch(e){ return false; } };

/* ---------- the due list: lease cycles per machine + excess copies per customer ---------- */
function dueCore(o){ o=o||{}; const t=todayISO(), lo=o.lo||addD(t,-60), hi=o.hi||addD(t,o.days==null?7:o.days), skips=DB.billSkips||{}, out=[];
  (DB.customers||[]).forEach(c=>{ const invs=invsOf(c), byL={}, exMs=[]; let exEf='', exEt='';
    (c.machines||[]).forEach(m=>{ if(m.status!=='Active') return; const k=kOf(c,m); if(!k||k.cancelled) return;
      if(leaseish(c,m,k)){ const a=m.startDate||k.start; if(a){ const st=stepL(c,m), end=m.endDate||k.end||'';
        for(let i=0;i<500;i++){ const s=addM(a,i*st); if(s>hi) break; if(s<lo) continue; const e=addD(addM(a,(i+1)*st),-1);
          if(skips[c.id+'|'+s+'|'+e]||leaseBilled(invs,m,s)) continue;
          const r=byL[s+'|'+e]=byL[s+'|'+e]||{c,from:s,to:e,ms:[],ks:new Set(),exp:false}; r.ms.push(m); r.ks.add(k.id); if(end&&s>end) r.exp=true; } } }
      if(hasRate(c,m)&&!k.unlimited){ const le=lastExcess(invs,m), rs=(m.readings||[]).filter(r=>r.date&&hasUse(m,r)&&(!le||r.date>le)).sort((x,y)=>x.date.localeCompare(y.date)); if(!rs.length) return;
        const first=(m.readings||[]).map(r=>r.date).filter(Boolean).sort()[0]||rs[0].date, start=le||first, st=stepE(c,m), nextEnd=addD(addM(start,st),-1), lastD=rs[rs.length-1].date;
        if(lastD<nextEnd) return;      /* a quarterly / half-yearly excess cycle is not finished yet */
        exMs.push({m,k}); const ef=le||rs[0].date; if(!exEf||ef<exEf) exEf=ef; if(!exEt||lastD>exEt) exEt=lastD; } });
    const lrows=Object.values(byL).sort((a,b)=>a.from.localeCompare(b.from));
    if(exMs.length&&skips[c.id+'|X|'+exEt]) exMs.length=0;
    if(exMs.length){ const ks=new Set(exMs.map(x=>x.k.id)); if(lrows.length){ const L=lrows[0]; L.ef=exEf; L.et=exEt; L.exMs=exMs.map(x=>x.m); exMs.forEach(x=>L.ks.add(x.k.id)); }
      else lrows.push({c,from:'',to:'',ef:exEf,et:exEt,ms:[],exMs:exMs.map(x=>x.m),ks,exp:false}); }
    lrows.forEach(r=>out.push(r)); });
  if(o.est) out.forEach(r=>{ r.estL=null; r.estE=null; try{ const mode=(typeof hasInd==='function'&&hasInd(r.c))?'ind':'overall', b=buildBill(r.c,{lf:r.from||'',lt:r.to||'',ef:r.ef||'',et:r.et||'',comb:true,nFree:0,kids:[...r.ks]},mode); let l=0,x=0; (b.items||[]).forEach(i=>{ if(i.kind==='copy') x+=num(i.taxable); else l+=num(i.taxable); }); r.estL=l; r.estE=x; }catch(e){} });
  return out.sort((a,b)=>((a.from||a.et||'')).localeCompare(b.from||b.et||'')||a.c.name.localeCompare(b.c.name)); }
window.dueRowsM=dueCore; window.dueRows=function(days,f,t){ return dueCore({days,lo:f,hi:t}).filter(r=>r.from); };

/* ---------- prefill the Generate Bill screen with lease cycle + excess period ---------- */
function force(r){ window.__billForce={cid:r.c.id,lf:r.from||'',lt:r.to||'',ef:r.ef||'',et:r.et||'',kids:[...r.ks],x32:1}; selectCustomer(r.c.id); }
(function(){ const rd=window.renderDetail; if(typeof rd!=='function') return; window.renderDetail=function(){ const F=window.__billForce&&window.__billForce.x32?window.__billForce:null, fk=F?Object.assign({},F):null; const res=rd.apply(this,arguments);
  try{ if(fk&&fk.cid===(typeof billPage!=='undefined'?billPage:null)){ const g=id=>document.getElementById(id); window.__billForce=null; ['lf','lt','ef','et'].forEach(k=>{ if(g('r_'+k)) g('r_'+k).value=fk[k]||''; }); document.querySelectorAll('#detailArea .bk_on').forEach(x=>{ x.checked=fk.kids.includes(x.value); }); } }catch(e){} return res; }; })();
let ROWS=[]; window.xbBill=i=>{ const r=ROWS[i]; if(r) force(r); };
window.xbBillCid=cid=>{ const r=dueCore({days:7}).find(x=>x.c.id===cid); if(r) force(r); else selectCustomer(cid); };
window.xbSkip=i=>{ const r=ROWS[i]; if(!r) return; askConfirm('Mark '+r.c.name+(r.from?' · lease '+dmy(r.from)+' → '+dmy(r.to):'')+(r.et?' · excess up to '+dmy(r.et):'')+' as already billed outside the app? It will not show here again.',()=>{ const s=DB.billSkips=DB.billSkips||{}; if(r.from) s[r.c.id+'|'+r.from+'|'+r.to]=1; if(r.et) s[r.c.id+'|X|'+r.et]=1; save(); try{ XA.refresh(); }catch(e){} try{ renderBell(); }catch(e){} },'Yes, skip'); };
window.xbDays=n=>{ window.__bdDays=+n; XA.refresh(); };

/* ---------- Bills Due page (lease + excess, per machine) ---------- */
const CARD='background:#fff;border:1px solid #e3e6ec;border-radius:12px;padding:16px';
const kpi=(t,v,s,col)=>'<div style="'+CARD+';flex:1;min-width:160px"><div style="font-size:.76rem;color:#6b7893;text-transform:uppercase;letter-spacing:.05em">'+t+'</div><div style="font-size:1.4rem;font-weight:700;margin:4px 0;color:'+(col||'#14213d')+'">'+v+'</div><div style="font-size:.8rem;color:#6b7893">'+s+'</div></div>';
function labelMismatch(){ const out=[]; (DB.customers||[]).forEach(c=>(c.machines||[]).forEach(m=>(m.readings||[]).forEach(r=>{ const dm=(r.date||'').slice(0,7), lb=r.month||''; if(!dm){ out.push({c,m,r,why:'no date'}); return; } if(dm===lb) return; const diff=(+dm.slice(0,4)*12+ +dm.slice(5))-(+lb.slice(0,4)*12+ +lb.slice(5)); if(diff===1&&+r.date.slice(8)<=10) return; out.push({c,m,r,why:'label '+lb+' ≠ date '+dm}); }))); return out; }
XA.reg('bdue',{title:'Bills Due',render(){ const days=window.__bdDays||7, t=todayISO(); ROWS=dueCore({days,est:true}); const late=ROWS.filter(r=>(r.from&&r.from<t)||(!r.from&&r.et<=t)).length, tot=ROWS.reduce((s,r)=>s+num(r.estL)+num(r.estE),0);
  const rows=ROWS.map((r,i)=>{ const cs=[...r.ks].map(id=>{ const k=r.c.contracts.find(x=>x.id===id); return k?kLabel(r.c,k):''; }).filter(Boolean).join(', '), d=r.from?Math.round((new Date(r.from)-new Date(t))/864e5):0;
    const st=!r.from?'<span class="badge warn">EXCESS READY</span>':r.from<t?'<span class="badge bad">LEASE STARTED '+(-d)+' D AGO</span>':d===0?'<span class="badge warn">STARTS TODAY</span>':'<span class="badge blue">IN '+d+' DAYS</span>';
    const mach=(r.ms.length?r.ms.map(m=>E(m.department||m.model)).join(', '):'')+(r.exMs?'<div class="kdept">Excess: '+r.exMs.map(m=>E((m.department||m.model)+' '+(m.serial||''))).join(', ')+'</div>':'');
    return '<tr><td><b>'+E(r.c.name)+'</b></td><td>'+E(cs)+'</td><td>'+(r.from?'<div>Lease '+E(dmy(r.from))+' → '+E(dmy(r.to))+'</div>':'')+(r.et?'<div>Excess '+E(dmy(r.ef))+' → '+E(dmy(r.et))+'</div>':'')+'</td><td>'+mach+'</td><td class="n">'+(r.estL!=null?(r.from?'<div>Lease AED '+M(r.estL)+'</div>':'')+(r.et?'<div>Excess AED '+M(r.estE)+'</div>':''):'—')+'</td><td>'+st+(r.exp?' <span class="badge bad">CONTRACT EXPIRED</span>':'')+'</td><td style="white-space:nowrap"><button class="btn sm" onclick="xbBill('+i+')">Bill ▶</button> <button class="btn sm ghost" title="Already billed outside the app" onclick="xbSkip('+i+')">Skip</button></td></tr>'; });
  const mm=labelMismatch(), mmH=mm.length?'<div style="'+CARD+';margin-top:14px"><b>Reading check</b><div class="hint" style="margin:4px 0 8px">These readings have a month label that does not match their date (or no date). The Billing Calendar matches readings by the month label, so they can hide a bill. Open the machine and correct the date or month.</div><div class="tw"><table><thead><tr><th>Customer</th><th>Machine</th><th>Reading date</th><th>Month label</th><th>Problem</th></tr></thead><tbody>'+mm.slice(0,40).map(x=>'<tr><td>'+E(x.c.name)+'</td><td>'+E((x.m.department||'')+' · '+(x.m.serial||''))+'</td><td>'+E(dmy(x.r.date))+'</td><td>'+E(x.r.month||'—')+'</td><td>'+E(x.why)+'</td></tr>').join('')+'</tbody></table></div></div>':'';
  return '<div class="sec" style="margin-top:0;flex-wrap:wrap;gap:8px"><h2>Bills due</h2><span style="margin-left:auto;display:flex;gap:8px;align-items:center">Next <select onchange="xbDays(this.value)" style="width:auto">'+[7,14,30].map(n=>'<option value="'+n+'"'+(n===days?' selected':'')+'>'+n+' days</option>').join('')+'</select>'+(ROWS.length?'<button class="btn" onclick="xbBill(0)">Bill next ▶</button>':'')+'<button class="btn ghost" onclick="go(\'xa\',\'bcal\')">Billing Calendar →</button></span></div>'
   +'<div class="hint" style="margin:0 0 10px">Checked <b>machine by machine</b>: a machine shows here when its own lease cycle (contract start + monthly / quarterly / yearly) has no invoice line, and when meter readings are in but their excess copies are not billed yet (quarterly excess waits for the end of the quarter). Several contracts of one customer are listed as one bill.</div>'
   +'<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">'+kpi('To bill',ROWS.length,'customers waiting')+kpi('Already late',late,'lease started or excess ready',late?'#dc2626':'')+kpi('Estimated value','AED '+M(tot),'lease + excess before VAT')+'</div>'
   +'<div style="'+CARD+'"><div class="tw"><table><thead><tr><th>Customer</th><th>Contract(s)</th><th>Billing period</th><th>Machines</th><th class="n">Estimated</th><th>Status</th><th></th></tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td colspan="7" class="empty">Nothing due. 🎉</td></tr>')+'</tbody></table></div></div>'+mmH; }});

/* ---------- bell: bills due ---------- */
const rb=window.renderBell; if(typeof rb==='function') window.renderBell=function(){ const res=rb.apply(this,arguments);
  try{ const rows=dueCore({days:3}); window.__xbBell=rows; const cnt=document.getElementById('bellCount'), p=document.getElementById('bellPanel'); if(!rows.length||!cnt||!p) return res; const t=todayISO();
    cnt.textContent=(parseInt(cnt.textContent)||0)+rows.length; cnt.classList.add('on'); if(rows.some(r=>r.from&&r.from<t)) cnt.style.background='#dc2626';
    const h='<div class="bsec"><span>🧾 Bills due</span><span class="badge '+(rows.some(r=>r.from&&r.from<t)?'bad':'warn')+'">'+rows.length+'</span></div>'+rows.slice(0,12).map((r,i)=>'<div class="bitem" style="cursor:pointer;padding:8px 12px;border-bottom:1px solid #eef0f4" onclick="closeBell();xbBell('+i+')"><b>'+E(r.c.name)+'</b><div class="kdept">'+(r.from?'Lease '+E(dmy(r.from))+(r.from<t?' · <span style="color:#dc2626">late</span>':''):'')+(r.et?(r.from?' · ':'')+'Excess copies ready ('+E(dmy(r.et))+')':'')+' — click to bill</div></div>').join('');
    const hd=p.querySelector('.bp-h'); if(hd) hd.insertAdjacentHTML('afterend',h); else p.insertAdjacentHTML('afterbegin',h); }catch(e){} return res; };
window.xbBell=i=>{ const r=(window.__xbBell||[])[i]; if(r) force(r); };

/* ---------- Contracts list: small due popup above the company name ---------- */
const cl=window.ctList; if(typeof cl==='function') window.ctList=function(){ const res=cl.apply(this,arguments);
  try{ const by={}; dueCore({days:7}).forEach(r=>{ (by[r.c.id]=by[r.c.id]||[]).push(r); }); const t=todayISO(), tb=document.getElementById('ctTable'); if(!tb) return res;
    tb.querySelectorAll('a[onclick*="ctOpen("]').forEach(a=>{ const m=/ctOpen\('([^']+)'/.exec(a.getAttribute('onclick')||''); if(!m||!by[m[1]]||a.dataset.dp) return; a.dataset.dp=1; const rs=by[m[1]], L=rs.filter(r=>r.from).map(r=>r.from).sort()[0], X=rs.some(r=>r.et), late=L&&L<t;
      a.insertAdjacentHTML('beforebegin','<div onclick="xbBillCid(\''+m[1]+'\')" title="Click to generate the bill" style="display:inline-block;background:'+(late?'#fef2f2':'#fffbeb')+';color:'+(late?'#b91c1c':'#92400e')+';border:1px solid '+(late?'#fecaca':'#fde68a')+';border-radius:8px;padding:1px 8px;font-size:.7rem;font-weight:700;margin-bottom:3px;cursor:pointer">⚠ '+(L?'Lease due '+E(dmy(L)):'')+(L&&X?' · ':'')+(X?'Excess ready':'')+'</div><br>'); }); }catch(e){} return res; };

/* ---------- Billing Calendar: "+ Bill" next to "Enter reading" ---------- */
const bc=XA.views&&XA.views.bcal; if(bc&&typeof bc.render==='function'&&!bc.__x32){ bc.__x32=1; const rd=bc.render; bc.render=function(){ let h=rd.apply(this,arguments); try{ h=h.replace(/(<button class="btn sm ghost" onclick="XA\.bcRead\('([^']+)','([^']+)','([^']+)'\)">Enter reading<\/button>)/g,(a,b,cid)=>b+' <button class="btn sm" onclick="xbBillCid(\''+cid+'\')">+ Bill</button>'); }catch(e){} return h; }; }

/* ---------- Generate Bill preview: unbilled lease / double billing warnings ---------- */
if(window.XT&&typeof XT.billWarn==='function'&&!XT.billWarn.__g32){ const o0=XT.billWarn; XT.billWarn=function(c,o){ const w=o0.apply(this,arguments)||[];
  try{ const invs=invsOf(c), lf=o&&o.lf, lt=o&&o.lt;
    if(lf&&lt){ (c.machines||[]).forEach(m=>{ if(m.status!=='Active') return; const k=kOf(c,m); if(!k||k.cancelled||!leaseish(c,m,k)) return; if(o.kids&&o.kids.length&&!o.kids.includes(k.id)) return; if(leaseBilled(invs,m,lf)) w.push({t:'info',msg:'<b>Possible double billing:</b> '+E((m.department||m.model)+' · '+(m.serial||''))+' already has a lease line for a period containing '+E(dmy(lf))+'. Untick its contract if it should not be billed again.'}); }); }
    dueCore({days:0,lo:addD(todayISO(),-120)}).filter(r=>r.c.id===c.id&&r.from&&(!lf||r.from<lf)).slice(0,4).forEach(r=>w.push({t:'info',msg:'<b>Earlier lease not billed:</b> '+E(r.ms.map(m=>(m.department||m.model)+' · '+(m.serial||'')).join('; '))+' — cycle '+E(dmy(r.from))+' → '+E(dmy(r.to))+' has no invoice.'})); }catch(e){} return w; };
  XT.billWarn.__g32=1; }

/* ---------- reading save: ask when the month label does not match the date ---------- */
const sr=window.saveReading; if(typeof sr==='function'&&!sr.__g32){ window.saveReading=function(){ try{ const r=readingFromForm(); if(r&&r.date&&r.month&&r.date.slice(0,7)!==r.month){ const diff=(+r.date.slice(0,4)*12+ +r.date.slice(5,7))-(+r.month.slice(0,4)*12+ +r.month.slice(5)); const key=r.date+'|'+r.month; if(!(diff===1&&+r.date.slice(8)<=10)&&!window.__x32ok){ askConfirm('This reading is dated '+dmy(r.date)+' but is labelled for '+r.month+'. Bills pick readings up by this month label, so it may be billed in the wrong cycle. Save anyway?',()=>{ window.__x32ok=1; try{ window.saveReading(); } finally{ window.__x32ok=0; } },'Yes, save'); return; } } }catch(e){} return sr.apply(this,arguments); }; window.saveReading.__g32=1; }
})();
