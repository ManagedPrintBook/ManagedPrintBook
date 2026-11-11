/* ===== Add-on 37 (v20261111b): Change password · Set-new-password screen (reset email) · other devices signed out + Admin alert =====
   Needs supabase/phase5.sql and supabase/phase6.sql (run once). ===== */
(function(){
'use strict';
const g=id=>document.getElementById(id);
const cu=()=>window.curUser&&window.curUser();
const SB=()=>(window.__cloud&&window.__cloud.sb)?window.__cloud.sb():null;
const devId=()=>{ try{ return localStorage.getItem('xa_dev_id')||''; }catch(e){ return ''; } };
const tst=(m,bad)=>{ try{ toast(m,bad); }catch(e){ alert(m); } };

const st=document.createElement('style'); st.textContent='.x37-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(20,33,61,.82);display:none;align-items:center;justify-content:center;padding:16px}.x37-bx{background:#fff;border-radius:14px;padding:22px;width:100%;max-width:400px;box-shadow:0 10px 40px rgba(0,0,0,.4)}.x37-bx h3{margin:0 0 4px}.x37-f{position:relative;margin:8px 0}.x37-f input{width:100%;box-sizing:border-box;padding:11px 56px 11px 12px;border:1px solid #cfd4dc;border-radius:9px;font-size:1rem}.x37-f button{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:none;cursor:pointer;font-size:.8rem;color:#2f6fed;padding:6px}.x37-msg{min-height:20px;font-size:.84rem;color:#dc2626;margin:6px 0}.x37-msg.ok{color:#15803d}'; document.head.appendChild(st);

function field(id,ph,ac){ return '<div class="x37-f"><input id="'+id+'" type="password" placeholder="'+ph+'" autocomplete="'+ac+'"><button type="button" onclick="x37Eye(\''+id+'\',this)">Show</button></div>'; }
window.x37Eye=function(id,b){ const i=g(id); i.type=i.type==='password'?'text':'password'; b.textContent=i.type==='password'?'Show':'Hide'; };
function overlay(){ let o=g('x37Ov'); if(!o){ o=document.createElement('div'); o.id='x37Ov'; o.className='x37-ov'; document.body.appendChild(o); } return o; }
const okPw=(a,b)=>!a||a.length<6?'New password must be at least 6 characters.':a!==b?'The two new passwords do not match.':'';

/* ---------- 1. Change password (button next to Logout) ---------- */
window.x37Open=function(){ if(!cu()) return; const o=overlay();
  o.innerHTML='<div class="x37-bx"><h3>🔑 Change password</h3><div class="hint" style="margin:0 0 8px;font-size:.82rem;color:#5b6478">Enter your current password, then the new one twice. Your other devices will be signed out.</div>'+field('x37Cur','Current password','current-password')+field('x37N1','New password (min 6 characters)','new-password')+field('x37N2','Type the new password again','new-password')+'<div class="x37-msg" id="x37Msg"></div><div style="display:flex;gap:8px"><button class="btn" id="x37Go" style="flex:1" onclick="x37Save()">Change password</button><button class="btn ghost" onclick="x37Close()">Cancel</button></div></div>';
  o.style.display='flex'; setTimeout(()=>{ try{ g('x37Cur').focus(); }catch(e){} },50);
  o.onkeydown=e=>{ if(e.key==='Enter') x37Save(); if(e.key==='Escape') x37Close(); }; };
window.x37Close=function(){ const o=g('x37Ov'); if(o) o.style.display='none'; };
const msg=(t,ok)=>{ const m=g('x37Msg'); if(m){ m.textContent=t||''; m.className='x37-msg'+(ok?' ok':''); } };
let busy=false;
async function applyNew(sb,pw){ let r=await sb.auth.updateUser({password:pw});
  if(r.error&&/aal2|multi-factor|authenticator/i.test(r.error.message||'')&&window.xaMfaGate){ const ov=g('x37Ov'); if(ov) ov.style.display='none'; const ok=await window.xaMfaGate(sb,cu()||{}); if(ov) ov.style.display='flex'; if(ok) r=await sb.auth.updateUser({password:pw}); }
  return r; }
async function after(sb,via){ const m=cu()||{}; try{ await sb.rpc('password_changed',{p_device:devId(),p_name:m.name||null,p_email:m.email||null,p_via:via}); }catch(e){}
  try{ await sb.auth.signOut({scope:'others'}); }catch(e){} }
window.x37Save=async function(){ if(busy) return; const sb=SB(); if(!sb||!cu()){ msg('Please sign in first.'); return; }
  const cur=g('x37Cur').value, n1=g('x37N1').value, n2=g('x37N2').value;
  if(!cur){ msg('Enter your current password.'); return; } const e=okPw(n1,n2); if(e){ msg(e); return; } if(n1===cur){ msg('The new password must be different from the current one.'); return; }
  busy=true; msg('Checking…',true);
  try{ const v=typeof window.cloudVerifyPw==='function'?await window.cloudVerifyPw(cur):false; if(!v){ msg('Current password is wrong.'); busy=false; return; }
    const r=await applyNew(sb,n1); if(r.error){ msg(r.error.message||'Could not change the password.'); busy=false; return; }
    await after(sb,'change'); x37Close(); tst('Password changed. Your other devices were signed out.'); }
  catch(x){ msg(x.message||String(x)); } busy=false; };

setInterval(()=>{ try{ const chip=g('userChip'); if(!chip||chip.style.display==='none'||g('x37Btn')) return; const out=chip.querySelector('button'); if(!out) return;
  const b=document.createElement('button'); b.id='x37Btn'; b.type='button'; b.title='Change password'; b.textContent='🔑 Password'; b.style.cssText=out.style.cssText; b.onclick=window.x37Open; chip.insertBefore(b,out); }catch(e){} },1000);

/* ---------- 2. Set new password screen (opened from the reset email) ---------- */
function recoveryScreen(){ if(g('x37Rc')) return; const o=document.createElement('div'); o.id='x37Rc'; o.className='x37-ov'; o.style.display='flex'; o.style.background='#14213d';
  o.innerHTML='<div class="x37-bx"><h3>Set a new password</h3><div style="margin:0 0 8px;font-size:.84rem;color:#5b6478">You opened a password-reset link. Choose your new password for Managed Print Book.</div>'+field('x37R1','New password (min 6 characters)','new-password')+field('x37R2','Type the new password again','new-password')+'<div class="x37-msg" id="x37RMsg"></div><div style="display:flex;gap:8px"><button class="btn" style="flex:1" onclick="x37Reset()">Save new password</button><button class="btn ghost" onclick="x37RCancel()">Cancel</button></div></div>';
  document.body.appendChild(o); o.onkeydown=e=>{ if(e.key==='Enter') x37Reset(); }; setTimeout(()=>{ try{ g('x37R1').focus(); }catch(e){} },80); }
const rmsg=(t,ok)=>{ const m=g('x37RMsg'); if(m){ m.textContent=t||''; m.className='x37-msg'+(ok?' ok':''); } };
window.x37RCancel=async function(){ const sb=SB(); try{ if(sb) await sb.auth.signOut(); }catch(e){} try{ sessionStorage.clear(); }catch(e){} location.replace(location.origin+location.pathname); };
window.x37Reset=async function(){ if(busy) return; const sb=SB(); if(!sb){ rmsg('Still loading — try again in a moment.'); return; }
  const a=g('x37R1').value, b=g('x37R2').value, e=okPw(a,b); if(e){ rmsg(e); return; } busy=true; rmsg('Saving…',true);
  try{ const r=await sb.auth.updateUser({password:a}); if(r.error){ rmsg((r.error.message||'Could not save.')+(/aal2/i.test(r.error.message||'')?' (Your account uses two-step login — ask the Admin to reset it.)':'')); busy=false; return; }
    let nm=null,em=null; try{ const u=(await sb.auth.getUser()).data.user; em=u&&u.email; nm=u&&u.user_metadata&&u.user_metadata.display_name; }catch(x){}
    try{ await sb.rpc('password_changed',{p_device:'',p_name:nm,p_email:em,p_via:'reset'}); }catch(x){}
    try{ await sb.auth.signOut({scope:'global'}); }catch(x){} try{ sessionStorage.clear(); }catch(x){}
    rmsg('Password updated. Please sign in with your new password.',true); setTimeout(()=>location.replace(location.origin+location.pathname),1500); }
  catch(x){ rmsg(x.message||String(x)); busy=false; } };
const isRec=window.XA_RECOVERY||/type=recovery/.test(location.hash+location.search);
if(isRec){ const t=setInterval(()=>{ if(document.body){ clearInterval(t); recoveryScreen(); } },50); }
let hooked=false; setInterval(()=>{ const sb=SB(); if(!sb||hooked) return; hooked=true; try{ sb.auth.onAuthStateChange(ev=>{ if(ev==='PASSWORD_RECOVERY') recoveryScreen(); }); }catch(e){} },800);
})();
