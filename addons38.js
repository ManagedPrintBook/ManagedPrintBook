/* ===== Add-on 38 (v20261112a): Reading due follows each contract's START DATE and reading cycle =====
   Start 12-11-2026 -> 11-11-2027:  Monthly = every 12th · Quarterly = 12-02-2027, 12-05-2027 ... · Yearly = 11-11-2027
   A cycle whose reading is already entered never pops up again (no more month-end popup).
   Machines without a start date keep the old behaviour. Colours stay navy blue + yellow (unchanged). ===== */
(function(){
'use strict';
if(typeof pendingReadings!=='function'||typeof readDate!=='function') return;
const origPending=pendingReadings, origReadDate=readDate;
const addM=(s,n)=>{ const [y,m,d]=s.split('-').map(Number); const t=(y*12+(m-1))+n, ny=Math.floor(t/12), nm=t%12+1, dim=new Date(ny,nm,0).getDate(); return ny+'-'+String(nm).padStart(2,'0')+'-'+String(Math.min(d,dim)).padStart(2,'0'); };
const addD=(s,n)=>{ const d=new Date(s+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const diff=(a,b)=>Math.round((Date.parse(a)-Date.parse(b))/864e5);
const startOf=(c,m)=>{ let k=null; try{ k=kOf(c,m); }catch(e){} return m.startDate||(k&&k.start)||''; };
const num=v=>parseFloat(v)||0, CYC={monthly:1,quarterly:3,'half-yearly':6,halfyearly:6,'semi-annual':6,yearly:12,annual:12};
const isSale=k=>!!k&&String(k.type||'').startsWith('Sale');
const kk=(c,m)=>{ try{ return kOf(c,m); }catch(e){ return null; } };
/* Reading Run mode of a contract: cycle (default) | once (start + warranty end) | none. Sale (ORS) = none unless changed on the contract page. */
window.xaReadMode=function(c,m){ const k=kk(c,m); if(!k) return 'cycle'; if(k.readMode) return k.readMode; return isSale(k)?'none':'cycle'; };
window.xaWarrantyEnd=function(k){ if(!k||!k.start) return ''; if(k.warrantyEnd) return k.warrantyEnd; const y=num(k.warrantyYears)||1; return addD(addM(k.start,12*y),-1); };
/* cycle = the machine's excess cycle when it has excess rates, otherwise its lease billing cycle (yearly contract -> yearly) */
const stepOf=(m,c)=>{ const hasR=[m.rateMono,m.rateColor,m.ratePlot,m.rateA0,m.rateA1,m.rateA2].some(v=>num(v)>0)||(c&&[c.rateMono,c.rateColor].some(v=>num(v)>0));
  let cy=hasR?m.excessCycle:(m.billY?'yearly':m.billQ?'quarterly':m.billM?'monthly':(m.leaseCycle||(c&&c.leaseCycle)||m.excessCycle)); cy=String(cy||'monthly').toLowerCase();
  return CYC[cy]||(cy.startsWith('year')||cy.startsWith('annual')?12:cy.startsWith('half')?6:cy.startsWith('quarter')?3:1); };
const endOf=(c,m)=>{ let k=null; try{ k=kOf(c,m); }catch(e){} return m.endDate||(k&&k.end)||''; };

/* i-th due date (i>=1). Yearly = last day of the contract year (11-11-2027); others = start day repeated (12th). */
function dueN(s,step,i){ return step===12?addD(addM(s,12*i),-1):addM(s,step*i); }
function dues(c,m){ const s=startOf(c,m); if(!s) return null; const mode=window.xaReadMode(c,m); if(mode==='none') return null; const k=kk(c,m), e=endOf(c,m), t=todayISO(), out=[];
  if(mode==='once'){ const w=window.xaWarrantyEnd(k)||e; out.push({i:0,d:s,prev:addD(s,-30)}); if(w&&w>s) out.push({i:1,d:w,prev:s}); return {s,step:12,list:out,once:true}; }
  const step=stepOf(m,c);
  for(let i=1;i<400;i++){ const d=dueN(s,step,i); if(e&&i>1&&dueN(s,step,i-1)>=e) break; out.push({i,d,prev:i>1?dueN(s,step,i-1):addD(s,-1)}); if(d>addD(t,400)) break; }
  return {s,step,list:out}; }
const rdate=r=>r.date||(r.month?r.month+'-01':'');
function doneFor(m,due){ const mid=addD(due.d,-Math.max(1,Math.floor(diff(due.d,due.prev)/2))); return (m.readings||[]).some(r=>{ const x=rdate(r); return x&&x>mid; }); }

/* nearest relevant due for a machine: the oldest unfinished due date that is overdue or within the lead days */
function openDue(c,m){ const D=dues(c,m); if(!D) return null; const t=todayISO(), lead=(typeof runLead==='function'?runLead():7), s=D.s;
  for(const x of D.list){ if(x.d<s) continue; if(doneFor(m,x)) continue; if(diff(x.d,t)<=lead) return x; return null; }
  return null; }

window.readDate=function(c,m,month){ const D=dues(c,m); if(!D) return origReadDate(c,m,month);
  const f=D.list.find(x=>x.d.slice(0,7)===month)||D.list.find(x=>x.d.slice(0,7)>month); return f?f.d:origReadDate(c,m,month); };
readDate=window.readDate;

window.pendingReadings=function(month){ const base=origPending(month).filter(x=>!startOf(x.c,x.m)&&window.xaReadMode(x.c,x.m)!=='none'), out=base.slice(), cur=(typeof ymNow==='function'?ymNow():todayISO().slice(0,7)), t=todayISO();
  DB.customers.forEach(c=>(c.machines||[]).forEach(m=>{ if(m.status!=='Active'||!startOf(c,m)) return; const D=dues(c,m); if(!D) return;
    const lead=(typeof runLead==='function'?runLead():7), lo=addD(t,-(D.once?400:D.step*31+7));
    const hit=D.list.some(x=>x.d>=lo&&!doneFor(m,x)&&diff(x.d,t)<=lead&&(x.d.slice(0,7)===month||month===cur));
    if(hit) out.push({c,m,last:(m.readings||[]).slice().sort((a,b)=>(a.month||'').localeCompare(b.month||'')).pop()}); }));
  return out; };
pendingReadings=window.pendingReadings;

/* the due date and the way it was worked out is shown on the machine's reading row when the Reading Run page opens */
window.xaReadingDue=openDue; window.xaDues=dues; window.xaDoneFor=doneFor;

try{ if(window.XA&&XA.refresh) XA.refresh(); }catch(e){}
try{ if(typeof renderBell==='function') renderBell(); if(typeof updateNav==='function') updateNav(); }catch(e){}
})();
