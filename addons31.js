/* ===== Add-on 31: "Why is there no excess line?" - explains, inside the Generate Invoice popup, what the excess calculation found for each machine ===== */
(function(){
'use strict';
if(!window.XT||typeof XT.billWarn!=='function'||XT.billWarn.__g31) return;
const o0=XT.billWarn, N=v=>(typeof fmtN==='function'?fmtN(v):String(Math.round(v))), D=d=>(typeof fmtDMY==='function'?fmtDMY(d):d);
XT.billWarn=function(c,o){ const w=o0.apply(this,arguments)||[];
  try{ const ef=o&&o.ef, et=o&&o.et; if(!ef||!et){ if(o&&(o.lf||o.lt)) w.push({t:'info',msg:'<b>Excess:</b> the Excess Copies dates are empty, so no excess is billed. Enter the From and To dates of the reading period.'}); return w; }
    const n=Math.max(1,Math.round(((new Date(et)-new Date(ef))/864e5+1)/30.4375)); let any=false, ovrAll=false;
    (c.machines||[]).forEach(m=>{ if(m.type==='Plotter') return; const rs=(m.readings||[]).filter(r=>inR(r,ef,et)), nm=(window.esc?esc(m.serial||m.model||''):(m.serial||m.model||'')), act=(typeof isActive==='function')?isActive(m):true;
      if(!rs.length){ if(!act) return; const last=(m.readings||[]).map(r=>r.date||r.month).sort().slice(-3).map(D).join(', ');
        w.push({t:'info',msg:'<b>Excess:</b> Sr.# '+nm+' has <b>no meter reading dated between '+D(ef)+' and '+D(et)+'</b>'+(last?' (latest readings: '+last+')':' (no readings entered)')+'. Add a reading inside this period, or adjust the Excess dates.'}); return; }
      any=true; const t=consume(m,r=>inR(r,ef,et)), fm=Math.max(0,(m.freeMono||0)*n-(t.cm||0)), fc=Math.max(0,(m.freeColor||0)*n-(t.cc||0)), em=Math.max(0,t.mono-fm), ec=Math.max(0,t.color-fc);
      if(!(c.freeMono||c.freeColor)||m.freeMono||m.freeColor){ if(em<=0&&ec<=0) w.push({t:'info',msg:'<b>Excess:</b> Sr.# '+nm+' used '+N(t.mono)+' mono / '+N(t.color)+' colour against a free allowance of '+N(fm)+' / '+N(fc)+' for '+n+' month(s) - <b>within the free allowance, so no excess line.</b>'}); }
      else ovrAll=true;
      if((em>0&&!m.rateMono&&!(c.rateMono))||(ec>0&&!m.rateColor&&!(c.rateColor))) w.push({t:'block',msg:'<b>Excess:</b> Sr.# '+nm+' has excess copies but <b>no excess rate</b> is set (mono / colour). Set the rate on the machine or the contract.'});
      if(t.mono<0||t.color<0) w.push({t:'block',msg:'<b>Excess:</b> Sr.# '+nm+' has a reading where the closing meter is lower than the opening meter, giving negative usage. Correct the reading.'}); });
    if(ovrAll&&any) w.push({t:'info',msg:'<b>Excess:</b> this contract uses an overall free allowance, so excess is worked out on the total of all machines; if the total is under the free copies, no excess line appears.'});
  }catch(e){} return w; };
XT.billWarn.__g31=1;
})();
