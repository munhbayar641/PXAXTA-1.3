// rha_auth.js — Auth guard v2. Load AFTER supabase.min.js
(async function(){
  const SB_URL='https://skpitxwtpqwoaydoltft.supabase.co';
  const SB_KEY='sb_publishable_0WG4j8BScWCUcbfJ77s8aA_gu2M7fuu';
  const VIEWER_MS=60*60*1000;
  const LOGIN_PAGE='rha_login.html';
  const LS_TIME='rha_login_time';

  const sb=window.supabase.createClient(SB_URL,SB_KEY);

  // 1. Session check
  const{data:{session}}=await sb.auth.getSession();
  if(!session){location.href=LOGIN_PAGE;return;}

  // 2. Profile/role
  const{data:profile}=await sb.from('profiles')
    .select('role,full_name,username')
    .eq('id',session.user.id)
    .single();

  const role=(profile?.role||'viewer').toLowerCase();
  const name=profile?.full_name||profile?.username||session.user.email||'Хэрэглэгч';
  window.RHA_USER={id:session.user.id,email:session.user.email,role,name,session};

  // 3. Viewer timeout
  let loginTime=0;
  if(role==='viewer'){
    loginTime=parseInt(localStorage.getItem(LS_TIME)||'0');
    if(!loginTime){loginTime=Date.now();localStorage.setItem(LS_TIME,String(loginTime));}
    const elapsed=Date.now()-loginTime;
    if(elapsed>=VIEWER_MS){
      await sb.auth.signOut();localStorage.removeItem(LS_TIME);
      alert('Таны нэвтрэх хугацаа (1 цаг) дууслаа. Дахин нэвтэрнэ үү.');
      location.href=LOGIN_PAGE;return;
    }
    setTimeout(async()=>{
      await sb.auth.signOut();localStorage.removeItem(LS_TIME);
      alert('Таны нэвтрэх хугацаа (1 цаг) дууслаа. Дахин нэвтэрнэ үү.');
      location.href=LOGIN_PAGE;
    },VIEWER_MS-elapsed);
  } else {
    localStorage.removeItem(LS_TIME);
  }

  window.RHA_LOGOUT=async function(){
    await sb.auth.signOut();localStorage.removeItem(LS_TIME);location.href=LOGIN_PAGE;
  };

  function esc(s=''){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');}

  function inject(){
    // Replace "Login" nav link with "Профайл" style label
    document.querySelectorAll('.nav a[href="rha_login.html"]').forEach(a=>{
      a.style.display='none';
    });

    const tr=document.querySelector('.topbar-right');
    if(!tr||tr.querySelector('#rha-chip'))return;

    const BADGE={
      admin:`<span style="background:linear-gradient(135deg,#ff4d7d,#8b5bff);color:#fff;padding:2px 10px;border-radius:99px;font-size:10px;font-weight:900;letter-spacing:.3px">ADMIN</span>`,
      editor:`<span style="background:linear-gradient(135deg,#4bd6ff,#3cffb2);color:#001018;padding:2px 10px;border-radius:99px;font-size:10px;font-weight:900;letter-spacing:.3px">EDITOR</span>`,
      viewer:`<span style="background:rgba(255,255,255,.18);color:#e8efff;padding:2px 10px;border-radius:99px;font-size:10px;font-weight:900;letter-spacing:.3px">VIEWER</span>`
    };

    const timerHtml=role==='viewer'
      ?`<span id="rha-timer" style="font-size:11px;color:#f5a623;font-family:monospace;font-weight:900;min-width:52px">⏱ 60:00</span>`
      :'';

    const chip=document.createElement('div');
    chip.id='rha-chip';
    chip.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 10px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.05)';
    chip.innerHTML=`
      ${timerHtml}
      ${BADGE[role]||BADGE.viewer}
      <span style="font-size:12px;color:var(--muted);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(name)}">${esc(name)}</span>
      <button onclick="window.RHA_LOGOUT()"
        style="background:rgba(255,77,125,.12);border:1px solid rgba(255,77,125,.3);border-radius:8px;
               padding:4px 10px;color:#ff4d7d;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap">
        ↩ Гарах
      </button>`;

    tr.insertBefore(chip,tr.firstChild);

    // Countdown for viewer
    if(role==='viewer'){
      const timerEl=document.getElementById('rha-timer');
      setInterval(()=>{
        const rem=VIEWER_MS-(Date.now()-loginTime);
        if(rem<=0){if(timerEl)timerEl.textContent='⏱ 00:00';return;}
        const m=Math.floor(rem/60000),s=Math.floor((rem%60000)/1000);
        if(timerEl)timerEl.textContent=`⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      },1000);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',inject);
  } else {
    inject();
  }
})();
