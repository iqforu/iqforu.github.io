// =====================================================================
//  IQ FOR U – Admin Panel (loaded only when "Admin login" is opened)
//  Upload this file to GitHub next to index.html. Do not rename it.
// =====================================================================
import { GoogleAuthProvider, signInWithPopup, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, writeBatch, addDoc, orderBy, limit,
         serverTimestamp, Timestamp, getCountFromServer, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let C, db, auth, $, $$, esc, ms, fmtDT, fmtD, r2, toast;
let EX = [];
let ROLE = 'owner', TEAMDOC = {};   // 'owner' (admin Gmail in Rules) or 'editor' (team member)
// ---- phone Back button: every admin screen gets its own history step
let POP = false, REPL = false, QE = null;
const VIEWS = {};
// ---- live listeners (auto-update screens). Stopped whenever the admin moves to another screen.
let UNSUB = [];
function stopLive() { UNSUB.forEach(f => { try { f(); } catch (e) {} }); UNSUB = []; }
function mark(name, args) {
  stopLive();
  if (POP) return;
  const st = { adm: name, args: args || [] };
  try { if (REPL || !(history.state && history.state.adm)) history.replaceState(st, '', '#/admin'); else history.pushState(st, '', '#/admin'); } catch (e) {}
  REPL = false;
}
const replace = f => { REPL = true; f(); };
window.addEventListener('popstate', e => {
  if (QE) { const q = QE; QE = null; q.close(); return; }   // Back button closes the question editor (changes are kept)
  if (!C || !e.state || !e.state.adm || !location.hash.startsWith('#/admin')) { stopLive(); return; }
  try { C.stopExam(); } catch (er) {}
  document.querySelectorAll('.ov').forEach(o => o.remove());
  let ok = false; try { ok = !!sessionStorage.getItem(SESS) && !!auth.currentUser; } catch (er) {}
  if (!ok) return gate();
  const f = VIEWS[e.state.adm]; if (!f) return;
  POP = true; try { f(...(e.state.args || [])); } finally { POP = false; }
});
const LOCK = 'iq_adm_lock', SESS = 'iq_adm_ok';

export function openAdmin(ctx) {
  C = ctx; db = ctx.db; auth = ctx.auth; $ = ctx.$; $$ = ctx.$$; esc = ctx.esc; ms = ctx.ms; fmtDT = ctx.fmtDT; fmtD = ctx.fmtD; r2 = ctx.r2; toast = ctx.toast;
  css(); gate();
}

// ------------------------------------------------------------------ look
function css() {
  if (document.getElementById('admcss')) return;
  const s = document.createElement('style'); s.id = 'admcss';
  s.textContent = `.aw{max-width:1000px;margin:auto;padding:12px 14px 60px}
  .ast{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .ast div{background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center}
  .ast b{display:block;font-size:22px;font-weight:900} .ast small{font-size:11.5px;color:var(--mut);font-weight:600}
  .at{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}
  @media(min-width:700px){.at{grid-template-columns:repeat(8,1fr)}}
  .acts{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
  @media(min-width:700px){.acts{grid-template-columns:repeat(4,1fr)}}
  .tbl{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:12px}
  .tbl table{width:100%;border-collapse:collapse;font-size:13px}
  .tbl th{background:var(--ink);color:var(--y);text-align:left;padding:8px 7px;font-size:12px;white-space:nowrap}
  .tbl td{padding:7px;border-bottom:1px solid var(--line);vertical-align:top}
  .tbl .n{text-align:right}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:8px} .g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  textarea.tsv{min-height:170px;font-family:ui-monospace,Consolas,monospace;font-size:12px;white-space:pre}
  .code{letter-spacing:12px;font-size:24px;text-align:center;font-weight:900}
  .bar2{height:10px;border-radius:5px;overflow:hidden;display:flex;background:#EEF0F3;margin-top:5px}
  .bar2 i{display:block;height:100%}
  .sw{display:flex;align-items:center;gap:10px;font-weight:700;margin-top:12px}
  .sw input{width:22px;height:22px}
  .ast.six{grid-template-columns:repeat(3,minmax(0,1fr))} .ast .up{color:var(--ok)} .ast button{font:inherit;color:inherit;cursor:pointer;background:#fff;border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center;min-width:0} .ast button:active{background:var(--y2)} .ast small{overflow-wrap:anywhere}
  .at{grid-template-columns:repeat(3,1fr)} @media(min-width:700px){.at{grid-template-columns:repeat(6,1fr)}}
  .livepill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:800;color:#15803D;background:var(--ok2);border-radius:20px;padding:2px 9px}
  .livepill i{width:7px;height:7px;border-radius:50%;background:#16A34A;animation:pl 1.3s infinite}
  .impb{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0 8px} @media(max-width:520px){.impb{grid-template-columns:1fr 1fr}}
  .qe{align-items:stretch!important;justify-content:stretch!important;background:var(--bg)!important;z-index:70!important;overflow:auto;display:block!important}
  .qe .hd{position:sticky;top:0;z-index:2;background:var(--ink);color:#fff;padding:9px 12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .qe .hd b{color:var(--y)}
  .qe .bd{max-width:900px;margin:auto;padding:10px 12px 80px}
  .qc{background:#fff;border:1.5px solid var(--line);border-radius:13px;padding:10px;margin-bottom:10px}
  .qc.bad{border-color:var(--no);background:#FFF5F5}
  .qc .r1{display:flex;gap:6px;align-items:center;margin-bottom:6px}
  .qc .r1 b{font-size:14px;min-width:34px}
  .qc input,.qc textarea,.qc select{width:100%;border:1.5px solid var(--line);border-radius:9px;padding:7px 9px;font-size:14px;background:#fff;outline:0}
  .qc textarea{min-height:54px;resize:vertical;font-weight:600}
  .qc .op4{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px}
  .qc .op4 label{display:flex;gap:5px;align-items:center;font-weight:800;font-size:13px}
  .qc .op4 label.ok input{border-color:var(--ok);background:#F0FDF4}
  .qc .pr{font-size:12px;color:var(--no);font-weight:700;margin-top:5px}
  @media(max-width:520px){.qc .op4{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
function top(title, back, right) {
  $('#top').classList.remove('hide'); $('#bn').classList.add('hide'); document.body.classList.remove('inexam'); document.body.classList.add('adm');
  $('#topin').innerHTML = `${back ? '<button class="back" id="ab" type="button" aria-label="Back">←</button>' : '<img src="logo.png" alt="">'}
    <div style="min-width:0"><div class="${back ? 'ttl' : 't1'}">${esc(title)}</div>${back ? '' : '<div class="t2">IQ FOR U · Admin</div>'}</div><div class="sp"></div>${right || ''}`;
  if (back) $('#ab').onclick = () => history.back();
}
function page(html) { $('#app').innerHTML = `<div class="aw fade">${html}</div>`; window.scrollTo(0, 0); }
const loading = t => page(`<div class="card center mut">${esc(t || 'Loading…')}</div>`);
const msg = (el, t, k) => { el.innerHTML = `<div class="msg ${k || 'err'}">${t}</div>`; };
const errText = e => { const c = (e && e.code) || ''; if (c.includes('permission-denied')) return 'Permission denied. Login with the admin Gmail (the one in Firestore Rules).'; return C.errText(e); };

// ------------------------------------------------------------------ gate: Google + 8-digit code
async function sha(code) {
  const u = auth.currentUser, b = new TextEncoder().encode('iqforu|' + u.uid + '|' + code);
  const h = await crypto.subtle.digest('SHA-256', b);
  return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('');
}
function lockInfo() { try { return JSON.parse(localStorage.getItem(LOCK) || '{}'); } catch (e) { return {}; } }
function setLock(v) { try { localStorage.setItem(LOCK, JSON.stringify(v)); } catch (e) {} }

function loginShell(inner) {
  $('#top').classList.add('hide'); $('#bn').classList.add('hide');
  $('#app').innerHTML = `<div class="auth fade"><img class="lg" src="logo.png" alt="" style="width:84px;height:84px"><h1 style="font-size:21px">Admin Login</h1><div class="tg">Only for IQ FOR U team</div>
    <div class="box">${inner}</div><a href="#/home" style="color:#fff;font-weight:700;margin-top:16px;font-size:13px">← Back to student app</a></div>`;
}
async function gate() {
  const u = auth.currentUser;
  const isGoogle = u && (u.providerData || []).some(p => p.providerId === 'google.com');
  let adminDoc = null, allowed = false;
  if (u && isGoogle) {
    loginShell('<div class="center mut">Checking…</div>');
    try { const s = await getDoc(doc(db, 'settings', 'admin')); allowed = true; adminDoc = s.exists() ? s.data() : null; ROLE = 'owner'; }
    catch (e) {
      allowed = false;
      try { const t = await getDoc(doc(db, 'team', (u.email || '').toLowerCase())); if (t.exists()) { allowed = true; ROLE = 'editor'; TEAMDOC = t.data(); adminDoc = t.data().hash ? { hash: t.data().hash } : null; } } catch (e2) {}
    }
  }
  if (!allowed) {
    loginShell(`<div class="tiny mut" style="font-weight:800">STEP 1 · ADMIN GMAIL</div>
      <button class="gbtn" id="g" type="button" style="margin-top:6px"><b>G</b> Continue with Google</button>
      ${u ? `<div class="msg err">${esc(u.email || 'This account')} is ${isGoogle ? 'not an admin / team Gmail' : 'a student login'}. Tap the button above and choose the <b>admin Gmail</b>.</div>` : ''}
      <div class="tiny mut" style="font-weight:800;margin-top:14px">STEP 2 · 8-DIGIT SECURITY CODE</div><div class="tiny mut">Comes after Step 1.</div><div id="gm"></div>`);
    $('#g').onclick = async () => {
      try { if (u) await signOut(auth); await signInWithPopup(auth, new GoogleAuthProvider()); }
      catch (e) { msg($('#gm'), esc(C.errText(e))); }
    };
    return;
  }
  // session already unlocked?
  try { if (adminDoc && sessionStorage.getItem(SESS) === adminDoc.hash.slice(0, 16) + u.uid) return dash(); } catch (e) {}
  if (!adminDoc) {   // first time: set the code
    loginShell(`<div class="msg ok" style="margin:0 0 10px">✓ ${esc(u.email)}</div>
      <div style="font-weight:900;font-size:17px">Set your 8-digit security code</div><div class="small mut">First time only. Do not share it with anyone. Do not use your birth date or mobile number.</div>
      <label class="l" for="c1">New code</label><input class="inp code" id="c1" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password">
      <label class="l" for="c2">Re-enter code</label><input class="inp code" id="c2" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password">
      <button class="btn dk block" id="cs" type="button" style="margin-top:14px">💾 Save code &amp; open panel</button><div id="cm"></div>`);
    ['#c1', '#c2'].forEach(s => $(s).oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });
    $('#cs').onclick = async () => {
      const a = $('#c1').value, b = $('#c2').value;
      if (!/^\d{8}$/.test(a)) return msg($('#cm'), 'Code must be exactly 8 digits.');
      if (/^(\d)\1{7}$/.test(a) || a === '12345678' || a === '87654321') return msg($('#cm'), 'Too easy to guess. Choose another code.');
      if (a !== b) return msg($('#cm'), 'Both codes must match.');
      try { const h = await sha(a);
        if (ROLE === 'owner') await setDoc(doc(db, 'settings', 'admin'), { hash: h, setAt: serverTimestamp() });
        else await updateDoc(doc(db, 'team', (u.email || '').toLowerCase()), { hash: h, setAt: serverTimestamp() });
        sessionStorage.setItem(SESS, h.slice(0, 16) + u.uid); toast('Security code saved ✓', 'ok'); dash(); }
      catch (e) { msg($('#cm'), esc(errText(e))); }
    };
    return;
  }
  loginShell(`<div class="tiny mut" style="font-weight:800">STEP 1 · ADMIN GMAIL</div><div class="msg ok" style="margin:6px 0 0">✓ ${esc(u.email)}</div>
    <div class="tiny mut" style="font-weight:800;margin-top:14px">STEP 2 · 8-DIGIT SECURITY CODE</div>
    <input class="inp code" id="cc" type="password" inputmode="numeric" maxlength="8" autocomplete="off" style="margin-top:6px" placeholder="••••••••">
    <button class="btn dk block" id="co" type="button" style="margin-top:12px">🔓 Open Admin Panel</button><div id="cm"></div>
    <div class="tiny mut center" style="margin-top:8px">3 wrong codes → wait 15 minutes · <button class="link tiny" id="cx" type="button">Use another Gmail</button></div>`);
  $('#cc').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); };
  $('#cx').onclick = async () => { await signOut(auth); gate(); };
  const tryCode = async () => {
    const L = lockInfo();
    if (L.until && Date.now() < L.until) return msg($('#cm'), `Too many wrong codes. Try again after ${Math.ceil((L.until - Date.now()) / 60000)} min.`);
    const v = $('#cc').value; if (v.length !== 8) return msg($('#cm'), 'Enter all 8 digits.');
    const h = await sha(v);
    if (h === adminDoc.hash) { setLock({}); try { sessionStorage.setItem(SESS, h.slice(0, 16) + u.uid); } catch (e) {} dash(); }
    else { const n = (L.n || 0) + 1; setLock(n >= 3 ? { n: 0, until: Date.now() + 15 * 60000 } : { n }); $('#cc').value = ''; msg($('#cm'), n >= 3 ? 'Wrong code 3 times. Locked for 15 minutes.' : `Wrong code. ${3 - n} tries left.`); }
  };
  $('#co').onclick = tryCode; $('#cc').onkeydown = e => { if (e.key === 'Enter') tryCode(); };
}
async function logout() { try { sessionStorage.removeItem(SESS); } catch (e) {} await signOut(auth); C.go('home'); }

// ------------------------------------------------------------------ dashboard
async function loadEx() {
  const s = await getDocs(collection(db, 'exams'));
  EX = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.startAt) - ms(a.startAt));
}
const resOpen = x => !x.resultsHold && (x.resultsOut || (x.resultAt && Date.now() >= ms(x.resultAt)));
function stChip(x) {
  const t = Date.now();
  if (!x.published) return '<span class="chip">DRAFT (hidden)</span>';
  if (t < ms(x.startAt)) return '<span class="chip">UPCOMING</span>';
  if (t <= ms(x.endAt)) return '<span class="chip c-live"><span class="dot"></span>LIVE</span>';
  if (resOpen(x)) return x.calcAt ? '<span class="chip c-done">RESULT OUT</span>' : '<span class="chip c-live">RESULT TIME – NOT CALCULATED</span>';
  return x.calcAt ? '<span class="chip c-paid">CALCULATED · opens at result time</span>' : '<span class="chip c-paid">CLOSED – calculate result</span>';
}
const needsPass = x => x.access === 'pass' || (x.access !== 'free' && (x.price || 0) > 0);
const accChip = x => needsPass(x) ? '<span class="chip c-pass">🎟 PASS</span>' : '<span class="chip c-free">FREE</span>';
const dayStart = d => { const t = new Date(d || Date.now()); t.setHours(0, 0, 0, 0); return t; };
const fmtJ = t => t ? new Date(ms(t)).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
async function edDash() {
  top('Team Panel', null, '<button class="btn gh sm" id="sv" type="button" style="box-shadow:none">Student view</button><button class="btn gh sm" id="lo" type="button" style="box-shadow:none">Logout</button>');
  $('#sv').onclick = () => C.go('home'); $('#lo').onclick = logout;
  loading('Loading mocks…');
  try { await loadEx(); } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  page(`<div class="card small">👋 <b>${esc(auth.currentUser.email)}</b> · ✏️ Editor<br>You can add &amp; edit <b>draft</b> mocks. The owner checks and publishes them.</div>
    <div class="at" style="grid-template-columns:1fr 1fr"><button class="tl" type="button" data-a="new"><span>＋</span>New Live Mock</button><button class="tl" type="button" data-a="practice"><span>📚</span>Practice Library</button></div>
    ${TEAMDOC.canPublish ? '<div class="card small">✅ The owner allowed you to <b>publish results</b>. The server calculates them – students\' mobile / Gmail stay hidden from you.</div>' : ''}
    <div class="sec">Live mocks (${EX.length})</div>
    ${EX.map(x => `<div class="xc"><div style="display:flex;gap:5px;flex-wrap:wrap">${x.published ? '<span class="chip c-free">Published</span>' : '<span class="chip c-paid">Draft</span>'}<span class="chip c-cat">${esc(x.category || 'Other')}</span>${x.resultsOut ? '<span class="chip c-free">RESULT OUT</span>' : ''}</div>
      <h3>${esc(x.title)}</h3><div class="meta"><span>${x.count} Q · ${x.duration} min</span><span>📅 Result: ${x.resultAt ? esc(fmtDT(x.resultAt)) : 'not set'}</span>${x.createdBy ? `<span>✏️ ${esc(x.createdBy)}</span>` : ''}</div>
      ${x.published && TEAMDOC.canPublish ? `<div class="acts"><button class="btn sm" type="button" data-cr="${esc(x.id)}" ${Date.now() < ms(x.endAt) ? 'disabled title="Mock is still open"' : ''}>🧮 Calculate &amp; Publish now</button>
        <button class="btn ${x.autoCalc ? 'dk' : 'gh'} sm" type="button" data-ac="${esc(x.id)}">⏰ Publish on time: ${x.autoCalc ? 'ON' : 'OFF'}</button></div>
        ${x.calcReq && !x.calcReq.done ? '<div class="tiny" style="color:var(--or);font-weight:700;margin-top:6px">⏳ Requested – the server publishes within ~5 minutes.</div>' : ''}` : ''}
      <div class="acts">${x.published ? '<span class="tiny mut">Published – only the owner can change it</span>' : `<button class="btn gh sm" type="button" data-edit="${esc(x.id)}">✏️ Edit draft</button>`}</div></div>`).join('') || '<div class="card mut">No mocks yet.</div>'}`);
  $$('[data-a]').forEach(b => b.onclick = () => b.dataset.a === 'new' ? editMock(null) : practiceAdmin());
  $$('[data-edit]').forEach(b => b.onclick = () => editMock(b.dataset.edit));
  $$('[data-cr]').forEach(b => b.onclick = async () => { const x = EX.find(e => e.id === b.dataset.cr);
    if (!await C.confirmBox(`<h3 style="margin:0 0 6px">Publish result of ${esc(x.title)}?</h3><p class="small">The server calculates ranks and opens the result for students within ~5 minutes, with a notification.</p>`, 'Publish')) return;
    try { await updateDoc(doc(db, 'exams', x.id), { calcReq: { publish: true, by: auth.currentUser.email, at: Timestamp.now(), done: false } }); toast('✓ Requested – result in ~5 minutes', 'ok'); edDash(); } catch (e) { toast(errText(e), 'err'); } });
  $$('[data-ac]').forEach(b => b.onclick = async () => { const x = EX.find(e => e.id === b.dataset.ac);
    try { await updateDoc(doc(db, 'exams', x.id), { autoCalc: !x.autoCalc }); toast(!x.autoCalc ? '⏰ ON – result publishes automatically at the result time' : 'Auto publish OFF', 'ok'); edDash(); } catch (e) { toast(errText(e), 'err'); } });
}
async function dash() {
  mark('dash');
  if (ROLE !== 'owner') return edDash();
  top('Admin Panel', null, '<button class="btn gh sm" id="sv" type="button" style="box-shadow:none">Student view</button><button class="btn gh sm" id="lo" type="button" style="box-shadow:none">Logout</button>');
  $('#sv').onclick = () => C.go('home'); $('#lo').onclick = logout;
  loading('Loading mocks…');
  try { await loadEx(); } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  const live = EX.filter(x => x.published && Date.now() >= ms(x.startAt) && Date.now() <= ms(x.endAt));
  const latest = live[0] || EX.find(x => Date.now() >= ms(x.startAt));
  const box = (id, l) => `<button type="button" id="${id}"><b>…</b><small>${l}</small></button>`;
  page(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b class="small">📈 Registrations</b><span class="livepill"><i></i>auto-updates every minute</span></div>
    <div class="ast six">${box('k1', 'Registered')}${box('k2', '🎟 Pass students')}${box('k3', 'Last 7 days')}</div>
    <div class="ast six" style="margin-top:8px">${box('k6', '⏳ Pass ends in 3 days')}${box('k7', '📚 Practice today')}${box('k4', 'Latest mock')}</div>
    ${latest ? `<div class="tiny mut" style="margin-top:4px">Latest mock: <b>${esc(latest.title)}</b>${live.length ? ` · <b style="color:var(--no)">${live.length} live now</b>` : ''} · <button class="link tiny" id="la" type="button">👥 Live attempts ›</button></div>` : ''}
    <div class="tiny mut" style="margin-top:2px">Tap a box to see the students.</div>
    <div class="at">
      <button class="tl" type="button" data-a="new"><span>＋</span>New Mock</button>
      <button class="tl" type="button" data-a="practice"><span>📚</span>Practice<em id="pdc" class="hide">0</em></button>
      <button class="tl" type="button" data-a="students"><span>👥</span>Students</button>
      <button class="tl" type="button" data-a="passes"><span>🎟</span>Passes</button>
      <button class="tl" type="button" data-a="feedback"><span>💬</span>Feedback</button>
      <button class="tl" type="button" data-a="analysis"><span>📊</span>Analysis</button>
      <button class="tl" type="button" data-a="reports"><span>🚩</span>Reports</button>
      <button class="tl" type="button" data-a="notify"><span>🔔</span>Notify</button>
      <button class="tl" type="button" data-a="notice"><span>📢</span>Notice</button>
      <button class="tl" type="button" data-a="payments"><span>💳</span>Payments</button>
      <button class="tl" type="button" data-a="team"><span>🧑‍🤝‍🧑</span>Team</button>
      <button class="tl" type="button" data-a="settings"><span>⚙️</span>Settings</button>
    </div>
    ${EX.some(x => !x.published && x.createdBy) ? `<div class="msg info">📝 <b>${EX.filter(x => !x.published && x.createdBy).length}</b> live mock draft(s) from your team are waiting – check below and publish.</div>` : ''}
    <div class="sec">My mocks (${EX.length})</div>
    ${EX.map(x => `<div class="xc"><div style="display:flex;gap:5px;flex-wrap:wrap">${stChip(x)}<span class="chip c-cat">${esc(x.category || 'Other')}</span>${accChip(x)}</div>
      <h3>${esc(x.title)}</h3><div class="meta"><span>🗓 ${esc(fmtDT(x.startAt))} → ${esc(fmtDT(x.endAt))}</span><span>${x.count} Q · ${x.duration} min · −${x.neg}</span><span>📅 Result: ${x.resultAt ? esc(fmtDT(x.resultAt)) : 'not set'}</span></div>
      <div class="acts"><button class="btn sm" type="button" data-res="${esc(x.id)}">🧮 Calculate &amp; Publish</button><button class="btn gh sm" type="button" data-res="${esc(x.id)}">🏆 Merit list · CSV</button>
        <button class="btn gh sm" type="button" data-edit="${esc(x.id)}">✏️ Edit</button><button class="btn gh sm" type="button" data-tools="${esc(x.id)}">🧰 Tools · Attempts</button></div></div>`).join('') || '<div class="card mut">No mocks yet. Tap <b>＋ New Mock</b>.</div>'}`);
  getCountFromServer(query(collection(db, 'pexams'), where('published', '==', false))).then(c => { const n = c.data().count, el = $('#pdc'); if (el && n) { el.textContent = n + ' draft'; el.classList.remove('hide'); } }).catch(() => {});
  $$('[data-a]').forEach(b => b.onclick = () => ({ new: () => editMock(null), practice: () => practiceAdmin(), team: teamView, students, passes: passesView, feedback: () => pick('feedback'), analysis: () => pick('analysis'),
    reports: () => pick('reports'), notice, notify: notifyView, payments, settings })[b.dataset.a]());
  $$('[data-res]').forEach(b => b.onclick = () => resultsPage(b.dataset.res));
  $$('[data-edit]').forEach(b => b.onclick = () => editMock(b.dataset.edit));
  $$('[data-tools]').forEach(b => b.onclick = () => tools(b.dataset.tools));
  if ($('#la')) $('#la').onclick = () => attempts(latest.id);
  const set = (id, v, l) => { const el = $('#' + id); if (el) el.innerHTML = `<b>${v}</b><small>${l}</small>`; };
  const refresh = async () => {
    if (!$('#k1')) return;
    try {
      const users = collection(db, 'users'), wk = dayStart(); wk.setDate(wk.getDate() - 6);
      const [u, ps, w, a, s, stt] = await Promise.all([getCountFromServer(users),
        getDocs(collection(db, 'passes')),
        getCountFromServer(query(users, where('createdAt', '>=', Timestamp.fromDate(wk)))),
        latest ? getCountFromServer(collection(db, 'attempts', latest.id, 'u')) : null,
        latest ? getCountFromServer(query(collection(db, 'attempts', latest.id, 'u'), where('submitted', '==', true))) : null,
        getDoc(doc(db, 'settings', 'stats')).catch(() => null)]);
      const N = u.data().count, A = a ? a.data().count : 0, S = s ? s.data().count : 0, PS = ps.docs.map(d => d.data());
      const soon = PS.filter(p => passOn(p) && p.until != null && ms(p.until) - Date.now() < 3 * 86400000).length;
      const today = new Date().toLocaleDateString('en-CA'), sd = stt && stt.exists() ? stt.data() : {};
      set('k1', N.toLocaleString('en-IN'), 'Registered');
      set('k2', PS.filter(passOn).length, '🎟 Pass students');
      set('k3', '<span class="up">+' + w.data().count + '</span>', 'Last 7 days');
      set('k6', soon ? `<span style="color:var(--or)">${soon}</span>` : '0', '⏳ Pass ends in 3 days');
      set('k7', sd.pday === today ? sd.pcount || 0 : 0, '📚 Practice today');
      set('k4', latest ? `${A}${N ? ` <span class="tiny mut">· ${Math.round(A / N * 100)}%</span>` : ''}` : '–', latest ? `wrote · ${S} submitted` : 'Latest mock');
      // keep the Home badge count fresh (written only when it changes)
      const p = C.getPub() || {};
      if (p.regCount !== N) { try { await savePub({ regCount: N }); } catch (e) {} }
    } catch (e) {}
  };
  refresh();
  $('#k1').onclick = () => allStudents(); $('#k2').onclick = () => passesView('on'); $('#k3').onclick = () => allStudents('week');
  $('#k6').onclick = () => passesView('soon'); $('#k7').onclick = () => practiceAdmin(); $('#k4').onclick = () => latest ? attempts(latest.id) : toast('No mock yet', 'info');
  const iv = setInterval(() => { if (!$('#k1')) return stopLive(); refresh(); }, 60000);
  UNSUB.push(() => clearInterval(iv));
}
function pick(kind) {
  mark('pick', [kind]);
  const title = { feedback: 'Feedback', analysis: 'Question analysis', reports: 'Reported questions' }[kind];
  const fn = { feedback: feedbackView, analysis: analysisView, reports: reportsView }[kind];
  top(title, dash);
  page(`<div class="small mut" style="margin-bottom:8px">Choose a mock:</div>${EX.map(x => `<button class="xc" type="button" data-p="${esc(x.id)}" style="width:100%;text-align:left">${stChip(x)}<h3>${esc(x.title)}</h3><div class="meta">${esc(fmtD(x.startAt))} · ${x.count} Q</div></button>`).join('') || '<div class="card mut">No mocks yet.</div>'}`);
  $$('[data-p]').forEach(b => b.onclick = () => fn(b.dataset.p));
}

// ------------------------------------------------------------------ Excel paste parser
function parseTSV(text) {
  const rows = []; let row = [], f = '', q = false;
  text = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"' && f === '') q = true;
    else if (c === '\t') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => String(x).trim() !== ''));
}
function toQuestions(text) {
  const rows = parseTSV(text), out = [], errs = [];
  rows.forEach((r, i) => {
    const c = r.map(x => String(x).trim());
    if (i === 0 && /section/i.test(c[0]) && c.some(v => /answer/i.test(v))) return;
    if (c.length < 8) { errs.push(`Row ${i + 1}: needs 8 columns (Section, Topic, Question, A, B, C, D, Answer) – found ${c.length}`); return; }
    let ans = c[7].toUpperCase().replace(/[^A-D1-4]/g, '');
    if (/^[1-4]$/.test(ans)) ans = 'ABCD'[+ans - 1];
    if (!/^[A-D]$/.test(ans)) { errs.push(`Row ${i + 1}: Answer must be A, B, C or D – found "${c[7]}"`); return; }
    if (!c[2]) { errs.push(`Row ${i + 1}: Question is empty`); return; }
    if (c.slice(3, 7).some(o => o === '')) { errs.push(`Row ${i + 1}: an option is empty`); return; }
    out.push({ sec: c[0] || 'General', topic: c[1], q: c[2], o: c.slice(3, 7), ans, exp: (c[8] || '').slice(0, 600) });
  });
  return { qs: out, errs };
}
function toTSV(qs, key, exp) {
  const cell = v => { v = String(v ?? ''); return /[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const E = exp && Object.values(exp).some(Boolean);
  return ['Section\tTopic\tQuestion\tA\tB\tC\tD\tAnswer' + (E ? '\tExplanation' : '')].concat(qs.map(q => [q.sec, q.topic, q.q, ...q.o, key[q.id] || ''].concat(E ? [exp[q.id] || ''] : []).map(cell).join('\t'))).join('\n');
}
const toLocal = t => { const d = new Date(ms(t)); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// ------------------------------------------------------------------ create / edit mock
async function editMock(id, copy) {
  mark('edit', [id, copy || null]);
  const x = id ? EX.find(e => e.id === id) : (copy || null);
  top(id ? 'Edit Mock' : 'New Mock', id && ROLE === 'owner' ? () => tools(id) : dash);
  if (id && ROLE !== 'owner' && x && x.published) { toast('Only the owner can edit a published mock.', 'info'); return dash(); }
  loading();
  let tsv = '';
  const srcId = id || (copy && copy.srcId);
  if (srcId) {
    try { const [p, k] = await Promise.all([getDoc(doc(db, 'exams', srcId, 'paper', 'main')), getDoc(doc(db, 'keys', srcId))]); tsv = toTSV(p.exists() ? p.data().questions : [], k.exists() ? k.data().ans : {}); }
    catch (e) { toast(errText(e), 'err'); }
  }
  const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); d.setHours(10, 0, 0, 0);
  const e2 = new Date(d); e2.setHours(22, 0, 0, 0); const r0 = new Date(d); r0.setDate(r0.getDate() + 1); r0.setHours(18, 0, 0, 0);
  const sA = x ? x.startAt : d, eA = x ? x.endAt : e2, rA = x && x.resultAt ? x.resultAt : (x ? new Date(ms(x.endAt) + 20 * 3600000) : r0);
  const cancelled = (x && !copy && x.cancelled) || [];
  page(`<div class="card">
    <label class="l" for="ti">Title</label><input class="inp" id="ti" maxlength="90" value="${esc(x ? x.title : 'IQ FOR U Mock – ')}">
    <label class="l" for="de">Short description (optional)</label><input class="inp" id="de" maxlength="160" value="${esc(x ? x.desc || '' : '')}" placeholder="Maths · Reasoning · Computer · previous papers">
    <label class="l" for="ca">Exam category</label><select class="inp" id="ca">${(x && x.category && !C.CATS.includes(x.category) ? [x.category] : []).concat(C.CATS).map(c => `<option ${(x ? x.category || 'Other' : C.CATS[0]) === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <div class="g2"><div><label class="l" for="sa">Opens</label><input class="inp" id="sa" type="datetime-local" value="${toLocal(sA)}"></div><div><label class="l" for="ea">Closes</label><input class="inp" id="ea" type="datetime-local" value="${toLocal(eA)}"></div></div>
    <div class="g3"><div><label class="l" for="du">Minutes</label><input class="inp" id="du" type="number" min="5" max="300" value="${x ? x.duration : 60}"></div><div><label class="l" for="mk">+ Mark</label><input class="inp" id="mk" type="number" step="0.25" min="0.25" value="${x ? x.mark : 1}"></div><div><label class="l" for="ng">− Neg</label><input class="inp" id="ng" type="number" step="0.05" min="0" value="${x ? x.neg : 0.25}"></div></div>
    <label class="l" for="ra">Result date &amp; time</label><input class="inp" id="ra" type="datetime-local" value="${toLocal(rA)}" style="background:var(--y2)">
    <label class="sw"><input type="checkbox" id="aco" ${!x || x.autoCalc ? 'checked' : ''}> ⏰ Calculate &amp; publish the result <b>automatically</b> at this time</label>
    <div class="tiny mut">The server (Apps Script) does it within ~5 minutes after the result time and sends the “Result out” notification. You can still calculate yourself any time.</div>
    <div><label class="l" for="ac">Who can write this mock?</label><select class="inp" id="ac" style="font-weight:700"><option value="free" ${x && needsPass(x) ? '' : 'selected'}>🆓 Free for all</option><option value="pass" ${x && needsPass(x) ? 'selected' : ''}>🎟 Monthly Pass required</option></select></div>
    <div class="g2"><div><label class="l" for="qset">Question paper sets</label><select class="inp" id="qset"><option value="1">Only 1 set (same order for all)</option><option value="2" ${x && x.sets === 2 ? 'selected' : ''}>2 sets – A, B</option><option value="4" ${x && x.sets === 4 ? 'selected' : ''}>4 sets – A, B, C, D</option></select></div>
      <div><label class="l">&nbsp;</label><label class="sw" style="margin-top:0"><input type="checkbox" id="qso" ${x && x.shuffleOpts ? 'checked' : ''}> Also mix options (A–D)</label></div></div>
    <div class="tiny mut" style="margin-top:4px">📑 Sets: every student automatically gets one set – same questions, different order (sections stay together). You keep ONE answer key; results, merit list and response sheets are correct for every set. Options with “All / None / Both …” are never moved.</div>
    <div class="tiny mut" style="margin-top:4px">Students can start any time between Opens and Closes; each gets the full minutes but the test always ends at Closes. <b>Free</b> mocks also show in the students' <b>🆓 Free</b> tab. <b>Pass</b> mocks open only for students with a Monthly Pass (give it in Students → 🎁 Give Pass).</div>
    ${id ? `<label class="l" for="cx">Cancel questions (bonus +mark to everyone) – question numbers</label><input class="inp" id="cx" placeholder="Example: 23, 47" value="${esc(cancelled.map(q => q.replace('q', '')).join(', '))}">` : ''}
    <label class="l">Add questions</label>
    <div class="impb"><button class="btn gh sm" type="button" id="ipdf">📄 Import PDF</button><button class="btn gh sm" type="button" id="ixl">📊 Import Excel</button><button class="btn gh sm" type="button" id="itx">📋 Paste text</button><button class="btn sm" type="button" id="ied">👁 Preview &amp; edit</button></div>
    <input type="file" id="fpdf" accept="application/pdf,.pdf" class="hide"><input type="file" id="fxl" accept=".xlsx,.xls,.csv" class="hide">
    <label class="l" for="qs">Questions (Excel format · 8 columns: Section | Topic | Question | A | B | C | D | Answer) – you can also copy from Excel &amp; paste here</label>
    <textarea class="inp tsv" id="qs" spellcheck="false" placeholder="Maths\tRatio\tThe ratio of ...\t10\t20\t30\t40\tB">${esc(tsv)}</textarea><div id="pv"></div>
    ${ROLE !== 'owner' ? '<div class="tiny mut" style="margin-top:8px">💾 Saved as <b>Draft</b> – the owner will check and publish.</div><input type="checkbox" id="pb" class="hide">' : `<label class="sw"><input type="checkbox" id="pb" ${x && x.published && !copy ? 'checked' : ''}> Published (students can see it)</label>
    ${x && x.notifiedAt && !copy ? '<div class="tiny mut" style="margin-top:4px">🔔 Students were already told about this mock.</div>' : `<label class="sw"><input type="checkbox" id="ntf" checked> 🔔 Tell students when published (“New mock” now + “LIVE now” at open time)</label>`}`}
    ${x && x.createdBy ? `<div class="tiny mut" style="margin-top:4px">✏️ Added by ${esc(x.createdBy)}</div>` : ''}
    <button class="btn dk block" id="sv" type="button" style="margin-top:14px">💾 Save Mock</button><div id="sm"></div></div>`);
  const preview = () => {
    const { qs, errs } = toQuestions($('#qs').value), secs = {}, ans = { A: 0, B: 0, C: 0, D: 0 };
    qs.forEach(q => { secs[q.sec] = (secs[q.sec] || 0) + 1; ans[q.ans]++; });
    $('#pv').innerHTML = `<div class="msg ${errs.length ? 'err' : (qs.length ? 'ok' : 'info')}">${qs.length ? '✓ ' : ''}<b>${qs.length}</b> questions detected · ${Object.keys(secs).map(k => `${esc(k)} ${secs[k]}`).join(' · ') || '—'} · Answers A${ans.A} B${ans.B} C${ans.C} D${ans.D}
      ${errs.length ? '<br>' + errs.slice(0, 8).map(esc).join('<br>') + (errs.length > 8 ? `<br>… ${errs.length - 8} more` : '') : ''}</div>`;
    return { qs, errs };
  };
  $('#qs').oninput = preview; preview();
  importButtons(preview);
  // show every date in Indian format below the box (the box itself follows the computer's language setting)
  const IN = v => { const d = new Date(v); return isNaN(d) ? '' : '🇮🇳 ' + d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); };
  ['#sa', '#ea', '#ra'].forEach(id => { const el = $(id), h = document.createElement('div'); h.className = 'tiny'; h.style.cssText = 'margin-top:4px;font-weight:700;color:var(--ink2)';
    el.after(h); const f = () => { h.textContent = IN(el.value); }; el.addEventListener('input', f); el.addEventListener('change', f); f(); });
  $('#sv').onclick = async () => {
    const { qs, errs } = preview(), m = $('#sm');
    const title = $('#ti').value.trim(), sa = new Date($('#sa').value), ea = new Date($('#ea').value), ra = new Date($('#ra').value);
    const duration = parseInt($('#du').value, 10), mark = Number($('#mk').value), neg = Number($('#ng').value), access = $('#ac').value === 'pass' ? 'pass' : 'free', price = 0;
    if (!title) return msg(m, 'Enter a title.');
    if (isNaN(sa) || isNaN(ea) || ea <= sa) return msg(m, 'Closes must be after Opens.');
    if (isNaN(ra)) return msg(m, 'Set the result date & time.');
    if (ra < ea && !confirm('Result time is BEFORE the test closes. Students who write late will see answers early. Save anyway?')) return;
    if (!(duration >= 5)) return msg(m, 'Minutes must be at least 5.');
    if (!(mark > 0) || neg < 0) return msg(m, 'Check + Mark and − Neg.');
    if (!qs.length || errs.length) return msg(m, 'Fix the questions first (see the red box).');
    if (id && Date.now() >= ms(x.startAt) && !confirm('This mock has already started. Changing questions now can confuse students. Save anyway?')) return;
    const eid = id || 'mock-' + sa.toISOString().slice(0, 10) + '-' + Math.random().toString(36).slice(2, 6);
    const secs = [], cnt = {}; qs.forEach(q => { if (!secs.includes(q.sec)) secs.push(q.sec); cnt[q.sec] = (cnt[q.sec] || 0) + 1; });
    const paper = qs.map((q, i) => ({ id: 'q' + (i + 1), sec: q.sec, topic: q.topic, q: q.q, o: q.o }));
    const key = {}; qs.forEach((q, i) => key['q' + (i + 1)] = q.ans);
    let can = [];
    if (id && $('#cx')) can = $('#cx').value.split(/[^0-9]+/).filter(Boolean).map(n => +n).filter(n => n >= 1 && n <= qs.length).map(n => 'q' + n);
    $('#sv').disabled = true;
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'exams', eid), { title, desc: $('#de').value.trim(), category: $('#ca').value, startAt: Timestamp.fromDate(sa), endAt: Timestamp.fromDate(ea), resultAt: Timestamp.fromDate(ra),
        duration, mark, neg, price, access, count: qs.length, total: r2(qs.length * mark), sections: secs, secs: secs.map(s => ({ name: s, count: cnt[s] })), cancelled: [...new Set(can)],
        published: $('#pb').checked, resultsOut: id ? !!x.resultsOut : false, resultsHold: id ? !!x.resultsHold : false, calcAt: id && x.calcAt ? x.calcAt : null, updatedAt: serverTimestamp(),
        sets: +$('#qset').value > 1 ? +$('#qset').value : 1, shuffleOpts: +$('#qset').value > 1 && $('#qso').checked, autoCalc: $('#aco').checked,
        notifiedAt: id && x.notifiedAt ? x.notifiedAt : null, liveNote: id && x.liveNote ? x.liveNote : null, resultNote: id && x.resultNote ? x.resultNote : null,
        createdBy: x && x.createdBy && !copy ? x.createdBy : (ROLE === 'owner' ? '' : auth.currentUser.email) });
      b.set(doc(db, 'exams', eid, 'paper', 'main'), { questions: paper });
      b.set(doc(db, 'keys', eid), { ans: key });
      await b.commit();
      if (ROLE === 'owner') try {
        const ex2 = { id: eid, title, startAt: Timestamp.fromDate(sa), count: qs.length, duration, access, liveNote: id && x.liveNote };
        if ($('#pb').checked && $('#ntf') && $('#ntf').checked) await announceMock(ex2);
        else if (id && x.liveNote && ms(x.startAt) !== sa.getTime()) await updateDoc(doc(db, 'notices', x.liveNote), { at: Timestamp.fromDate(sa), pushed: false });   // open time changed
      } catch (e) { toast('Saved, but notification failed: ' + errText(e), 'err'); }
      msg(m, 'Saved ✓' + (id && x.calcAt ? ' Answer key / cancelled questions changed? Go to Results → Re-calculate.' : ''), 'ok');
      await loadEx(); setTimeout(() => { if (ROLE !== 'owner') return replace(dash); if (id && history.state && history.state.adm === 'edit') history.back(); else replace(() => tools(eid)); }, 700);
    } catch (e) { $('#sv').disabled = false; msg(m, esc(errText(e))); }
  };
}

// ------------------------------------------------------------------ 📄 PDF · 📊 Excel · 📋 Paste import + 👁 editable preview
// One question = { sec, topic, q, o: [A, B, C, D], ans: 'A'..'D' or '' }
// readers are loaded only when you press Import (cdnjs first, jsDelivr as a backup)
const LIBS = {
  xlsx: [['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'], 'XLSX'],
  pdf: [['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js'], 'pdfjsLib']
};
const LOADED = {};
function loadLib([urls, name]) {
  if (window[name]) return Promise.resolve(window[name]);
  const one = url => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url; s.async = true;
    s.onload = () => { if (window[name]) { LOADED[name] = url; res(window[name]); } else rej(new Error('x')); };
    s.onerror = () => { s.remove(); rej(new Error('x')); };
    document.head.appendChild(s);
  });
  return urls.reduce((p, u) => p.catch(() => one(u)), Promise.reject(new Error('start')))
    .catch(() => { throw new Error('Could not load the reader. Check your internet and try again.'); });
}
const normA = v => String(v ?? '').replace(/\s+/g, ' ').trim();
// answer cell → 'A'..'D' (accepts: b, (B), 2, Option B, Ans: c, or the option text itself)
function ansOf(v, opts) {
  const t = normA(v); if (!t) return '';
  let m = t.match(/^(?:ans(?:wer)?\s*[:.\-–]?\s*)?(?:option\s*)?\(?([a-dA-D1-4])\)?\.?$/i);
  if (m) return /[1-4]/.test(m[1]) ? 'ABCD'[+m[1] - 1] : m[1].toUpperCase();
  const low = t.toLowerCase().replace(/^(?:ans(?:wer)?\s*[:.\-–]?\s*)/, '');
  const i = (opts || []).findIndex(o => normA(o).toLowerCase() === low);
  return i >= 0 && i < 4 ? 'ABCD'[i] : '';
}
function problems(q) {
  const p = [];
  if (!normA(q.q)) p.push('Question is empty');
  if (q.extra) p.push(`Found ${q.extra} options – only 4 kept, please check`);
  const e = [0, 1, 2, 3].filter(i => !normA(q.o[i])).map(i => 'ABCD'[i]);
  if (e.length) p.push('Option ' + e.join(', ') + ' empty');
  if (!/^[A-D]$/.test(q.ans || '')) p.push('Answer missing');
  return p;
}
const fix4 = o => { o = (o || []).map(normA); while (o.length < 4) o.push(''); return o.slice(0, 4); };

// ---- Excel rows (first sheet) → questions. Works with or without a header row.
function fromRows(rows) {
  rows = rows.map(r => (r || []).map(v => normA(v))).filter(r => r.some(Boolean));
  if (!rows.length) return [];
  const h = rows[0].map(v => v.toLowerCase());
  const find = (...res) => h.findIndex(c => res.some(re => re.test(c)));
  let C2;
  const qi = find(/question|^ques|^q\.?$/);
  if (qi >= 0) {
    C2 = { sec: find(/section|subject/), topic: find(/topic|chapter/), q: qi,
      a: find(/^\(?a\)?$/, /option\s*\(?a\)?$/, /opt\.?\s*\(?a\)?$/, /option\s*1$/, /^\(?1\)?$/),
      b: find(/^\(?b\)?$/, /option\s*\(?b\)?$/, /opt\.?\s*\(?b\)?$/, /option\s*2$/, /^\(?2\)?$/),
      c: find(/^\(?c\)?$/, /option\s*\(?c\)?$/, /opt\.?\s*\(?c\)?$/, /option\s*3$/, /^\(?3\)?$/),
      d: find(/^\(?d\)?$/, /option\s*\(?d\)?$/, /opt\.?\s*\(?d\)?$/, /option\s*4$/, /^\(?4\)?$/),
      ans: find(/answer|^ans|correct|^key/) };
    if (C2.a < 0) { C2.a = qi + 1; C2.b = qi + 2; C2.c = qi + 3; C2.d = qi + 4; }
    rows = rows.slice(1);
  } else {
    if (rows.every(r => /^\d+\.?$/.test(r[0] || ''))) rows = rows.map(r => r.slice(1));   // first column is just S.No
    const n = Math.max(...rows.map(r => r.length));
    C2 = n >= 8 ? { sec: 0, topic: 1, q: 2, a: 3, b: 4, c: 5, d: 6, ans: 7 } : n === 7 ? { sec: 0, topic: -1, q: 1, a: 2, b: 3, c: 4, d: 5, ans: 6 } : { sec: -1, topic: -1, q: 0, a: 1, b: 2, c: 3, d: 4, ans: 5 };
  }
  const g = (r, i) => i >= 0 ? (r[i] || '') : '';
  return rows.map(r => { const o = fix4([g(r, C2.a), g(r, C2.b), g(r, C2.c), g(r, C2.d)]);
    return { sec: g(r, C2.sec) || 'General', topic: g(r, C2.topic), q: g(r, C2.q), o, ans: ansOf(g(r, C2.ans), o) }; })
    .filter(q => q.q || q.o.some(Boolean));
}
// the TSV box (Excel paste) → questions, keeping rows that still have problems so they can be fixed
function tsvModel(text) {
  return parseTSV(text).filter((r, i) => !(i === 0 && /section/i.test(r[0] || '') && r.some(v => /answer/i.test(v || ''))))
    .map(r => { const c = r.map(v => String(v ?? '').trim()), o = fix4(c.slice(3, 7)); return { sec: c[0] || 'General', topic: c[1] || '', q: c[2] || '', o, ans: ansOf(c[7], o), exp: c[8] || '' }; });
}
const modelTSV = L => toTSV(L.map((q, i) => ({ id: 'm' + i, sec: q.sec || 'General', topic: q.topic || '', q: q.q, o: fix4(q.o) })), Object.fromEntries(L.map((q, i) => ['m' + i, q.ans || ''])), Object.fromEntries(L.map((q, i) => ['m' + i, q.exp || ''])));

// ---- text copied from a PDF / Word → questions
const SUBJ = /\b(general\s*knowledge|general\s*awareness|general\s*studies|general\s*science|g\.?\s?k|g\.?\s?s|static\s*gk|reasoning|mental\s*ability|logical|maths?|mathematics|quantitative|aptitude|arithmetic|numerical|computer|current\s*affairs|english|science|history|geography|polity|economy)\b/i;
function cleanSec(t) {
  t = t.replace(/^\s*(section|part|subject|sec\.?)\s*[-–:.]?\s*(?:\(?([A-Z0-9]{1,2}|[IVX]{1,4})\)?(?=[\s:\-–.)]|$))?\s*[-–:.)]?\s*/i, '').replace(/[\s:\-–.]+$/, '').trim();
  if (t && t === t.toUpperCase()) t = t.split(/\s+/).map(w => w.length <= 3 && !/^(AND|OF|THE)$/.test(w) ? w : w[0] + w.slice(1).toLowerCase()).join(' ').replace(/\b(And|Of|The)\b/g, m => m.toLowerCase());
  return t.slice(0, 40) || 'General';
}
const Q_RE1 = /^(?:Q(?:uestion)?\s*\.?\s*(?:No\.?\s*)?)(\d{1,3})\s*[.):\]\-–]?\s*(.*)$/i;
const Q_RE2 = /^(\d{1,3})\s*(?:[.):\]]\s+|[.):\]](?=\D)|[.):\]]$)(.*)$/;
const OPT_RE = /^(?:\(([a-dA-D1-4])\)|\[([a-dA-D])\]|([a-dA-D])[.)](?=\s|$))\s*/;
const ANS_RE = /^(?:ans(?:wer)?|correct\s*(?:answer|option)|right\s*answer)\s*(?:is)?\s*[:.\-–=)]*\s*(.*)$/i;
const KEYPAIR = /(\d{1,3})\s*[.\-:)=]?\s*\(?([a-dA-D])\)?(?![a-zA-Z])/g;
const JUNK = /^(page\s*\d+(\s*of\s*\d+)?|\d{1,4}|[-–_=*•.]{3,})$|www\.|https?:\/\/|t\.me\/|telegram|whatsapp|join\s+us|download\s+(the\s+)?app|youtube/i;
// split "(a) 10 (b) 20 (c) 30 (d) 40" that are on one line
function splitOpts(rest, k, upper, num) {
  const out = []; let cur = rest;
  while (k < 3) {
    const L = num ? String(k + 2) : (upper ? 'ABCD' : 'abcd')[k + 1];
    const D = String(k + 2);   // also accept "2) 3) 4)" mixed with letters, and "C)1023" without a space
    const re = num ? new RegExp('\\s\\(' + L + '\\)\\s*') : new RegExp('\\s(?:\\(' + L + '\\)|\\[' + L + '\\]|' + L + '\\)|' + L + '\\.(?=\\s)|\\(' + D + '\\)|' + D + '\\))\\s*');
    const m = cur.match(re); if (!m) break;
    out.push(cur.slice(0, m.index).trim()); cur = cur.slice(m.index + m[0].length); k++;
  }
  out.push(cur.trim()); return out;
}
function parseText(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').split('\n').map(l => l.replace(/\s+/g, ' ').trim());
  const Qs = [], key = []; let cur = null, sec = 'General', keyMode = false, skip = false, dir = null, prev = '';
  const startQ = (n, t) => { cur = { n, sec, topic: '', q: '', o: [], ans: '', ansText: '' }; Qs.push(cur); skip = false;
    if (dir && dir.to && (n < dir.from || n > dir.to)) dir = null;
    if (dir) cur.q = dir.text + '\n'; if (dir && (!dir.to || n >= dir.to)) dir = null; addQ(t); };
  const addQ = t => { if (!t) return; inlineOpts(t) || (cur.q += (cur.q && !cur.q.endsWith('\n') ? (/^(\(?[ivx]+[.)]|statement|assertion|reason|conclusion|\d+[.)])/i.test(t) || /[:?]$/.test(prev) ? '\n' : ' ') : '') + t); };
  // question text that also contains the options: "What is 2+2? (a) 3 (b) 4 (c) 5 (d) 6"
  const inlineOpts = t => {
    const m = t.match(/(?:^|\s)(?:\((a|A|1)\)|(a|A)\))\s+/); if (!m) return false;
    const L = m[1] || m[2], num = L === '1', up = L === 'A';
    const nx = num ? /\s\(2\)\s*/ : up ? /\s(?:\(B\)|B\))\s*/ : /\s(?:\(b\)|b\))\s*/;
    const rest = t.slice(m.index + m[0].length); if (!nx.test(rest)) return false;
    const before = t.slice(0, m.index).trim(); if (before) cur.q += (cur.q && !cur.q.endsWith('\n') ? ' ' : '') + before;
    cur.o.push(...splitOpts(rest, 0, up, num)); return true;
  };
  for (const ln of lines) {
    if (!ln || JUNK.test(ln)) continue;
    // option line
    const om = ln.match(OPT_RE);
    if (om && cur && !keyMode && cur.o.length < 4) {
      const raw = om[1] || om[2] || om[3], num = /[1-4]/.test(raw), idx = num ? +raw - 1 : 'abcd'.indexOf(raw.toLowerCase());
      if (idx === cur.o.length) { cur.up = raw === raw.toUpperCase() && !num; cur.num = num; cur.o.push(...splitOpts(ln.slice(om[0].length), idx, cur.up, num)); skip = false; prev = ln; continue; }
    }
    // answer key section
    if (/^(answer\s*key|answers?|answer\s*sheet|key\s*answers?|solutions?\s*key)\s*[:\-–]?\s*$/i.test(ln)) { keyMode = true; cur = null; continue; }
    const lnK = ln.replace(/^(answer\s*key|answers?|key)\s*[:\-–]\s*/i, ''), pairs = [...lnK.matchAll(KEYPAIR)];
    if (pairs.length && (keyMode || (pairs.length >= 3 && lnK.replace(KEYPAIR, '').replace(/[\s,;|.\-]/g, '').length <= 3))) {
      keyMode = true; pairs.forEach(p => key.push([+p[1], p[2].toUpperCase()])); continue;
    }
    if (keyMode && !Q_RE1.test(ln)) continue;
    // answer line
    const am = ln.match(ANS_RE);
    if (am && cur) { const a = ansOf(am[1].replace(/^\(?([a-dA-D1-4])\)?(?=[\s.,)]|$).*/, '$1'), cur.o); if (a) cur.ans = a; else cur.ansText = am[1]; skip = true; prev = ln; continue; }
    // explanation → ignore till next question
    if (/^(explanation|solution|sol\.|sol:|exp\.|exp:|hint)\b/i.test(ln)) { skip = true; continue; }
    // directions for a group of questions
    const dm = ln.match(/^directions?\b.*?(?:(\d{1,3})\s*(?:-|–|to)\s*(\d{1,3}))?/i);
    if (dm && /^directions?\s*[(:\-–.]/i.test(ln)) { const r = ln.match(/(\d{1,3})\s*(?:-|–|to)\s*(\d{1,3})/); dir = { text: ln, from: r ? +r[1] : 0, to: r ? +r[2] : 0 }; cur = null; skip = false; prev = ln; continue; }
    // numbered line: question, or "1) 2) 3) 4)" options
    const qm = ln.match(Q_RE1) || ln.match(Q_RE2);
    if (qm) {
      const n = +qm[1];
      if (cur && !Q_RE1.test(ln) && cur.o.length < 4 && cur.q && n === cur.o.length + 1 && (cur.o.length > 0 || n !== cur.n + 1)) { cur.o.push(qm[2].trim()); prev = ln; continue; }
      keyMode = false; startQ(n, qm[2].trim()); prev = ln; continue;
    }
    // section heading
    const short = ln.length <= 45 && !/[?]/.test(ln) && ln.split(' ').length <= 6;
    if (short && (/^(section|part|subject)\b/i.test(ln) || (SUBJ.test(ln) && (!cur || cur.o.length >= 4)))) { sec = cleanSec(ln); cur = null; dir = null; skip = false; prev = ln; continue; }
    if (skip) continue;
    if (dir && !cur) { dir.text += ' ' + ln; prev = ln; continue; }
    if (!cur) { prev = ln; continue; }
    if (!cur.o.length) {
      const nA = splitOpts(ln, 0, true, false);
      if (cur.q && nA.length === 4 && nA.every(Boolean)) { cur.up = true; cur.o.push(...nA); }
      else addQ(ln);
    }
    else if (cur.o.length < 4) { const last = cur.o.pop() + ' ' + ln, k = cur.o.length; cur.o.push(...splitOpts(last, k, cur.up !== false, !!cur.num)); }
    else cur.o[3] += ' ' + ln;
    prev = ln;
  }
  // answer key at the end: by question number (or by order if numbers repeat in every section)
  if (key.length) {
    const nums = Qs.map(q => q.n), unique = new Set(nums).size === nums.length;
    if (unique) { const K = new Map(key); Qs.forEach(q => { if (!q.ans && K.has(q.n)) q.ans = K.get(q.n); }); }
    else if (key.length === Qs.length) Qs.forEach((q, i) => { if (!q.ans) q.ans = key[i][1]; });
  }
  return Qs.map(q => { const extra = q.o.length > 4 ? q.o.length : 0, o = fix4(q.o); return { sec: q.sec, topic: '', q: q.q.trim(), o, ans: q.ans || ansOf(q.ansText, o), extra }; });
}

// ---- PDF → text (text PDFs only; scanned/photo PDFs have no text). Handles 2-column pages.
async function pdfText(file) {
  const lib = await loadLib(LIBS.pdf); if (!lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = (LOADED.pdfjsLib || LIBS.pdf[0][0]).replace(/pdf\.min\.js$/, 'pdf.worker.min.js');
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const pg = await pdf.getPage(p), W = pg.getViewport({ scale: 1 }).width, tc = await pg.getTextContent();
    const items = tc.items.filter(it => it.str && it.str.trim()).map(it => ({ x: it.transform[4], y: it.transform[5], h: it.height || Math.abs(it.transform[3]) || 10, w: it.width || 0, s: it.str }));
    const group = B => { const rows = []; B.forEach(it => { let r = rows.find(r => Math.abs(r.y - it.y) < Math.max(2, it.h * 0.45)); if (!r) rows.push(r = { y: it.y, it: [] }); r.it.push(it); }); return rows; };
    // two-column page? → many rows have a left part and a separate right part, and questions start in the right half too
    const mid = W / 2, all = group(items), isQ = t => /^\s*(?:Q(?:uestion)?\s*\.?\s*)?\d{1,3}\s*[.):]/i.test(t);
    const split = all.filter(r => r.it.some(i => i.x >= mid - 2) && r.it.some(i => i.x < mid - 2 && i.x + i.w < mid + 5)).length;
    const twoCol = items.filter(i => i.x >= mid - 2 && isQ(i.s)).length >= 2 && split >= Math.max(3, all.length * 0.3);
    const blocks = twoCol ? [items.filter(i => i.x < mid - 2), items.filter(i => i.x >= mid - 2)] : [items];
    blocks.forEach(B => {
      const rows = group(B);
      rows.sort((a, b) => b.y - a.y).forEach(r => { r.it.sort((a, b) => a.x - b.x); let s = '', end = null;
        r.it.forEach(t => { if (end != null && t.x - end > 1 && !/\s$/.test(s) && !/^\s/.test(t.s)) s += ' '; s += t.s; end = t.x + t.w; }); out.push(s); });
    });
    out.push('');
  }
  return out.join('\n');
}
async function excelRows(file) {
  const X = await loadLib(LIBS.xlsx), wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' });
  return X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
}

// ---- Add or Replace when questions already exist
function addOrReplace(n, have) {
  if (!have) return Promise.resolve('replace');
  return new Promise(res => {
    const o = C.sheet(`<h3 style="margin:0 0 6px">${n} questions found</h3><p class="small">The mock already has <b>${have}</b> questions. What do you want?</p>
      <div style="display:grid;gap:8px"><button class="btn dk" data-m="add" type="button">➕ Add at the end (total ${have + n})</button><button class="btn red" data-m="replace" type="button">♻ Replace all with the new ${n}</button><button class="btn gh" data-m="" type="button">Cancel</button></div>`, true);
    o.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { o.remove(); res(b.dataset.m || null); } else if (e.target === o) res(null); });
  });
}
function importButtons(preview) {
  const box = $('#qs');
  const take = async (list, from) => {
    if (!list.length) { C.sheet(`<h3 style="margin:0 0 6px">No questions found</h3><p class="small">Could not find questions in this ${from}.</p><div class="note">Works best when questions look like <b>1. Question…</b> with options <b>(a) (b) (c) (d)</b> or <b>A. B. C. D.</b>, and answers as <b>Ans: b</b> or an answer key like <b>1-b, 2-c</b>.${from === 'PDF' ? ' Scanned (photo) PDFs have no text – they cannot be read.' : ''}</div><button class="btn gh block" style="margin-top:10px" type="button" onclick="this.closest('.ov').remove()">OK</button>`); return; }
    if (list.length > 100 && $('#pno')) return C.sheet(`<h3 style="margin:0 0 6px">${list.length} questions found</h3><p class="small">One practice mock should have 30 / 50 / 100 questions. To split this into many mocks automatically, go back and use <b>🗂 Question Bank</b> → <b>📄 PDF file</b>.</p><button class="btn dk block" type="button" onclick="this.closest('.ov').remove()">OK</button>`);
    const old = tsvModel(box.value), mode = await addOrReplace(list.length, old.length); if (!mode) return;
    const L = mode === 'add' ? old.concat(list) : list;
    const bad = list.filter(q => problems(q).length).length;
    toast(`✓ ${list.length} questions read from ${from}${bad ? ` · ${bad} need checking (red)` : ''}`, bad ? 'info' : 'ok');
    editor(L, preview);
  };
  const busy = (b, on) => { b.disabled = on; b.dataset.t = b.dataset.t || b.innerHTML; b.innerHTML = on ? '⏳ Reading…' : b.dataset.t; };
  $('#ipdf').onclick = () => $('#fpdf').click();
  $('#ixl').onclick = () => $('#fxl').click();
  $('#fpdf').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const b = $('#ipdf'); busy(b, true);
    try { const t = await pdfText(f); if (t.replace(/\s/g, '').length < 30) { busy(b, false); return C.sheet('<h3 style="margin:0 0 6px">This PDF has no text</h3><p class="small">It looks like a scanned / photo PDF. Only PDFs where you can select and copy text can be imported. Type the questions in Excel instead.</p><button class="btn gh block" type="button" onclick="this.closest(\'.ov\').remove()">OK</button>'); }
      busy(b, false); await take(parseText(t), 'PDF'); } catch (er) { busy(b, false); toast(er.message || String(er), 'err'); } };
  $('#fxl').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const b = $('#ixl'); busy(b, true);
    try { const rows = await excelRows(f); busy(b, false); await take(fromRows(rows), 'Excel'); } catch (er) { busy(b, false); toast(er.message || String(er), 'err'); } };
  $('#itx').onclick = () => {
    const o = C.sheet(`<h3 style="margin:0 0 4px">📋 Paste questions</h3><div class="small mut">Copy questions from a PDF or Word file and paste below. Options (a)(b)(c)(d), answers like “Ans: b” and an answer key at the end (1-b, 2-c…) are detected automatically.</div>
      <textarea class="inp" id="ptx" rows="10" style="margin-top:8px;font-size:13px" placeholder="1. Who is known as the Father of the Indian Constitution?\n(a) Mahatma Gandhi (b) B. R. Ambedkar\n(c) Jawaharlal Nehru (d) Rajendra Prasad\nAns: b"></textarea>
      <button class="btn dk block" id="pgo" type="button" style="margin-top:10px">🔍 Find questions</button>`);
    o.querySelector('#pgo').onclick = async () => { const t = o.querySelector('#ptx').value; o.remove(); await take(parseText(t), 'pasted text'); };
  };
  $('#ied').onclick = () => { const L = tsvModel(box.value); if (!L.length) return toast('No questions yet. Import a PDF / Excel or paste first.', 'info'); editor(L, preview); };
}

// ---- 👁 editable preview (rows with problems are red). Apply → goes into the questions box.
function editor(list, preview) {
  const L = list.map(q => ({ sec: q.sec || 'General', topic: q.topic || '', q: q.q || '', o: fix4(q.o), ans: q.ans || '', exp: q.exp || '', extra: q.extra || 0 }));
  let only = false;
  const o = document.createElement('div'); o.className = 'ov qe'; document.body.appendChild(o);
  try { history.pushState({ adm: 'qe' }, '', '#/admin'); } catch (e) {}
  const apply = () => { $('#qs').value = modelTSV(L.filter(q => q.q || q.o.some(Boolean))); preview(); };
  QE = { close: () => { apply(); o.remove(); toast('Questions updated in the mock ✓ (not saved yet – press 💾 Save Mock)', 'ok'); } };
  const card = (q, i) => { const pr = problems(q);
    return `<div class="qc ${pr.length ? 'bad' : ''}" data-i="${i}"><div class="r1"><b>#${i + 1}</b><input data-f="sec" value="${esc(q.sec)}" placeholder="Section" style="max-width:220px"><span style="flex:1"></span><button class="btn red sm" type="button" data-del="${i}">🗑</button></div>
      <textarea data-f="q" placeholder="Question">${esc(q.q)}</textarea>
      <div class="op4">${q.o.map((v, j) => `<label class="${q.ans === 'ABCD'[j] ? 'ok' : ''}">${'ABCD'[j]}<input data-f="o${j}" value="${esc(v)}" placeholder="Option ${'ABCD'[j]}"></label>`).join('')}</div>
      <div class="r1" style="margin:6px 0 0"><span class="small" style="font-weight:800">Answer</span><select data-f="ans" style="max-width:90px">${['', 'A', 'B', 'C', 'D'].map(a => `<option ${q.ans === a ? 'selected' : ''} value="${a}">${a || '–'}</option>`).join('')}</select></div>
      <div class="pr">${pr.map(esc).join(' · ')}</div></div>`; };
  const head = () => { const bad = L.filter(q => problems(q).length).length, secs = {}; L.forEach(q => secs[q.sec] = (secs[q.sec] || 0) + 1);
    return `<span><b>${L.length}</b> questions · ${bad ? `<b style="color:#FCA5A5">${bad} need fixing</b>` : '✓ all OK'}<br><span class="tiny" style="color:#BFC3CC">${Object.keys(secs).map(k => esc(k) + ' ' + secs[k]).join(' · ')}</span></span>`; };
  const draw = () => {
    o.innerHTML = `<div class="hd"><div id="qh" style="flex:1;min-width:150px">${head()}</div>
        <label class="small" style="display:flex;gap:5px;align-items:center;color:#fff"><input type="checkbox" id="qo" ${only ? 'checked' : ''}> Only problems</label>
        <button class="btn gh sm" id="qsct" type="button">Set section…</button><button class="btn sm" id="qok" type="button">✓ Done</button></div>
      <div class="bd"><div class="tiny mut" style="margin-bottom:8px">Fix the red ones, delete junk rows, set sections, then press <b>✓ Done</b>. Total questions, minutes and marks are set on the mock form.</div>
        ${L.map((q, i) => only && !problems(q).length ? '' : card(q, i)).join('') || '<div class="card center mut">Nothing to show.</div>'}</div>`;
    o.querySelector('#qo').onchange = e => { only = e.target.checked; draw(); };
    o.querySelector('#qok').onclick = () => history.back();
    o.querySelector('#qsct').onclick = () => {
      const s2 = C.sheet(`<h3 style="margin:0 0 6px">Set section for a range</h3><div class="g3"><div><label class="l">From #</label><input class="inp" id="sf" type="number" min="1" value="1"></div><div><label class="l">To #</label><input class="inp" id="st2" type="number" min="1" value="${L.length}"></div><div><label class="l">Section</label><input class="inp" id="sn" placeholder="Reasoning"></div></div><button class="btn dk block" id="sok" type="button" style="margin-top:10px">Apply</button>`, true);
      s2.querySelector('#sok').onclick = () => { const a = Math.max(1, +s2.querySelector('#sf').value || 1), b = Math.min(L.length, +s2.querySelector('#st2').value || L.length), n = s2.querySelector('#sn').value.trim().slice(0, 40);
        if (!n) return; for (let i = a - 1; i < b; i++) L[i].sec = n; s2.remove(); draw(); };
    };
    o.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { L.splice(+b.dataset.del, 1); draw(); });
    o.querySelectorAll('.qc').forEach(el => {
      const i = +el.dataset.i, q = L[i];
      el.querySelectorAll('[data-f]').forEach(inp => inp[inp.tagName === 'SELECT' ? 'onchange' : 'oninput'] = () => {
        const f = inp.dataset.f, v = inp.value;
        if (f === 'sec') q.sec = v.trim().slice(0, 40) || 'General'; else if (f === 'q') q.q = v; else if (f === 'ans') q.ans = v; else q.o[+f.slice(1)] = v;
        if (f === 'ans' || f.startsWith('o')) q.extra = 0;
        const pr = problems(q); el.classList.toggle('bad', !!pr.length); el.querySelector('.pr').textContent = pr.join(' · ');
        el.querySelectorAll('.op4 label').forEach((lb, j) => lb.classList.toggle('ok', q.ans === 'ABCD'[j]));
        o.querySelector('#qh').innerHTML = head();
      });
    });
  };
  draw(); o.scrollTop = 0;
}

// ------------------------------------------------------------------ tools page (one mock)
async function tools(id) {
  mark('tools', [id]);
  if (!EX.length) { try { await loadEx(); } catch (e) {} }
  const x = EX.find(e => e.id === id); if (!x) return dash();
  top(x.title, dash);
  page(`<div class="xc">${stChip(x)}<h3>${esc(x.title)}</h3><div class="meta"><span>${esc(x.category || 'Other')}</span><span>🗓 ${esc(fmtDT(x.startAt))} → ${esc(fmtDT(x.endAt))}</span><span>📅 Result ${x.resultAt ? esc(fmtDT(x.resultAt)) : '—'}</span></div></div>
    <div class="menu">
      <button type="button" data-t="pre">👁 Preview as student<span class="ar">›</span></button>
      <button type="button" data-t="edit">✏️ Edit mock / questions / cancel Qs<span class="ar">›</span></button>
      <button type="button" data-t="dup">📋 Duplicate mock<span class="ar">›</span></button>
      <button type="button" data-t="att">👥 Attempts · Reset attempt<span class="ar" id="ac">›</span></button>
      <button type="button" data-t="res">🧮 Results · Calculate &amp; Publish · CSV<span class="ar">›</span></button>
      <button type="button" data-t="fb">💬 Feedback<span class="ar">›</span></button>
      <button type="button" data-t="rep">🚩 Reported questions<span class="ar">›</span></button>
      <button type="button" data-t="ana">📊 Question analysis<span class="ar">›</span></button>
      <button type="button" data-t="pub">${x.published ? '🙈 Unpublish (hide from students)' : '📢 Publish (show to students)'}<span class="ar">›</span></button>
      <button type="button" data-t="del" style="color:var(--no)">🗑 Delete mock<span class="ar">›</span></button>
    </div>`);
  const A = { pre: () => previewMock(id), edit: () => editMock(id), dup: () => duplicate(x), att: () => attempts(id), res: () => resultsPage(id),
    fb: () => feedbackView(id), rep: () => reportsView(id), ana: () => analysisView(id),
    pub: async () => {
      let tell = false;
      if (!x.published && !x.notifiedAt) tell = await C.confirmBox('<h3 style="margin:0 0 6px">📢 Publish this mock</h3><p class="small">Also send a 🔔 notification to students (“New mock” now + “LIVE now” at open time)?</p>', 'Publish + Notify', 'Publish only');
      try { await updateDoc(doc(db, 'exams', id), { published: !x.published }); x.published = !x.published; if (tell) await announceMock(x); toast(x.published ? 'Published ✓' + (tell ? ' · students notified 🔔' : '') : 'Hidden ✓', 'ok'); replace(() => tools(id)); } catch (e) { toast(errText(e), 'err'); } },
    del: async () => {
      if (!await C.confirmBox(`<h3 style="margin:0 0 6px">Delete “${esc(x.title)}”?</h3><p class="small">Questions, answer key and the mock will be deleted. This cannot be undone.</p>`, 'Delete')) return;
      try { await deleteDoc(doc(db, 'exams', id, 'paper', 'main')); await deleteDoc(doc(db, 'keys', id)); await deleteDoc(doc(db, 'exams', id)); toast('Deleted', 'ok'); await loadEx(); replace(dash); } catch (e) { toast(errText(e), 'err'); }
    } };
  $$('[data-t]').forEach(b => b.onclick = A[b.dataset.t]);
}
async function previewMock(id) {
  mark('preview', [id]);
  if (!EX.length) { try { await loadEx(); } catch (e) {} }
  const x = EX.find(e => e.id === id); if (!x) return;
  try {
    const [p, k] = await Promise.all([getDoc(doc(db, 'exams', x.id, 'paper', 'main')), getDoc(doc(db, 'keys', x.id))]);
    const qs = p.exists() ? p.data().questions : [];
    if (!qs.length) return toast('No questions.', 'err');
    C.runExam({ x, qs, ans: {}, marked: new Set(), visited: new Set(), preview: true, key: k.exists() ? k.data().ans : {}, startedAt: Date.now(), end: Date.now() + 3600000, back: () => history.back() });
  } catch (e) { toast(errText(e), 'err'); }
}
async function duplicate(x) {
  const wk = 7 * 86400000;
  const copy = Object.assign({}, x, { srcId: x.id, title: x.title + ' (copy)', published: false,
    startAt: new Date(ms(x.startAt) + wk), endAt: new Date(ms(x.endAt) + wk), resultAt: x.resultAt ? new Date(ms(x.resultAt) + wk) : null });
  editMock(null, copy);
  toast('Copy loaded – change title, dates & questions, then Save.', 'info');
}

// ------------------------------------------------------------------ attempts
async function attempts(id) {
  mark('attempts', [id]);
  if (!EX.length) { try { await loadEx(); } catch (e) {} }
  const x = EX.find(e => e.id === id); if (!x) return dash();
  top('Attempts', () => tools(id));
  page(`<div class="ast" id="aS"><div><b>…</b><small>Started</small></div><div><b>…</b><small>Submitted</small></div><div><b>…</b><small>Writing / not submitted</small></div></div>
    <p class="small mut">${esc(x.title)} · <span class="livepill"><i></i>LIVE – updates automatically</span><br><b>Reset</b> deletes a student's attempt so they can write again (use only for genuine problems like power cut / net issue).</p>
    <div class="tbl"><table><thead><tr><th>#</th><th>Name</th><th>State</th><th>Started</th><th>Status</th><th class="n">Answered</th><th></th></tr></thead><tbody id="aT"><tr><td colspan="7" class="mut">Loading…</td></tr></tbody></table></div>`);
  let A = [];
  const draw = () => {
    if (!$('#aT')) return stopLive();
    A.sort((a, b) => ms(b.startedAt) - ms(a.startedAt));
    const sub = A.filter(a => a.submitted).length;
    $('#aS').innerHTML = `<div><b>${A.length}</b><small>Started</small></div><div><b>${sub}</b><small>Submitted</small></div><div><b>${A.length - sub}</b><small>Writing / not submitted</small></div>`;
    $('#aT').innerHTML = A.map((a, i) => `<tr><td>${A.length - i}</td><td><b>${esc(a.name)}</b></td><td>${esc(a.state || '')}</td><td>${a.startedAt ? esc(fmtDT(a.startedAt)) : '…'}</td><td>${a.submitted ? '<span class="chip c-free">Submitted</span>' : '<span class="chip c-paid">Writing / not submitted</span>'}</td><td class="n">${Object.keys(a.answers || {}).length}</td><td><button class="btn red sm" type="button" data-r="${esc(a.uid)}">Reset</button></td></tr>`).join('') || '<tr><td colspan="7" class="mut">No attempts yet. New attempts appear here automatically.</td></tr>';
    $$('[data-r]').forEach(b => b.onclick = async () => {
      const a = A.find(z => z.uid === b.dataset.r); if (!a) return;
      if (!await C.confirmBox(`<h3 style="margin:0 0 6px">Reset ${esc(a.name)}?</h3><p class="small">Their answers for this mock will be deleted and they can start again.</p>`, 'Reset')) return;
      try { await resetAttempt(id, a.uid); toast('Reset ✓', 'ok'); } catch (e) { toast(errText(e), 'err'); }
    });
  };
  const un = onSnapshot(collection(db, 'attempts', id, 'u'), sn => { A = sn.docs.map(d => ({ uid: d.id, ...d.data() })); draw(); },
    e => { if ($('#aT')) $('#aT').innerHTML = `<tr><td colspan="7"><div class="msg err">${esc(errText(e))}</div></td></tr>`; });
  UNSUB.push(un);
}
async function resetAttempt(id, uid) {
  await deleteDoc(doc(db, 'attempts', id, 'u', uid));
  try { await deleteDoc(doc(db, 'myresults', id, 'u', uid)); } catch (e) {}
}

// ------------------------------------------------------------------ results: calculate & publish
async function resultsPage(id) {
  mark('results', [id]);
  if (!EX.length) { try { await loadEx(); } catch (e) {} }
  const x = EX.find(e => e.id === id);
  top('Results · ' + x.title, dash); loading();
  let R = null; try { const r = await getDoc(doc(db, 'adminresults', id)); R = r.exists() ? r.data() : null; } catch (e) {}
  const closed = Date.now() > ms(x.endAt), open = resOpen(x);
  page(`${closed ? '' : `<div class="msg info" style="margin-top:0">⏳ This mock is still open (closes ${esc(fmtDT(x.endAt))}). Calculate only after it closes, so every student is counted.</div>`}
    <div class="card"><div class="small">📅 Result date: <b>${x.resultAt ? esc(fmtDT(x.resultAt)) : 'not set'}</b> · Status: ${open && R ? '<b style="color:var(--ok)">Visible to students</b>' : open ? '<b style="color:var(--no)">Result time reached – not calculated yet</b>' : R ? '<b>Calculated – opens automatically at result time</b>' : '<b>Not calculated</b>'}${x.resultsHold ? ' · <b style="color:var(--no)">HIDDEN by you</b>' : ''}</div>
      <div class="acts" style="grid-template-columns:1fr 1fr">
        <button class="btn" id="cp" type="button">🧮 Calculate &amp; Publish now</button>
        <button class="btn gh" id="co" type="button">🧮 Calculate only (opens at result time)</button>
        ${R ? `<button class="btn ${x.resultsHold ? 'dk' : 'red'}" id="hd" type="button">${x.resultsHold ? '📢 Un-hide results' : '🙈 Hide results'}</button><button class="btn gh" id="csv" type="button">⬇ Download Excel (CSV)</button><button class="btn dk" id="t10" type="button">🏆 Top 10 image</button><button class="btn" id="wa" type="button" style="background:#25D366;color:#fff;border-color:#128C7E">💬 WhatsApp message</button>` : ''}
      </div><div id="rm"></div>
      <label class="sw"><input type="checkbox" id="aut" ${x.autoCalc ? 'checked' : ''}> ⏰ Publish on time – the server calculates &amp; publishes automatically at the result time</label>
      ${x.calcReq && !x.calcReq.done ? `<div class="tiny" style="color:var(--or);font-weight:700">⏳ ${esc(x.calcReq.by || 'Team')} asked the server to publish – within ~5 minutes.</div>` : ''}
      ${R ? '<button class="btn dk block" id="rsa" type="button" style="margin-top:8px">📄 Response sheets – view · print · download (all students)</button>' : ''}
      <div class="tiny mut" style="margin-top:8px">Fixed an answer key or cancelled a question? Just calculate again – ranks update.</div></div>
    ${R ? `<p class="small mut">Calculated ${esc(fmtDT(R.calcAt))} · Participants <b>${R.n}</b> · Highest ${R.high} · Average ${R.avg}</p>
      <div class="tbl"><table><tr><th>Rank</th><th>Roll No.</th><th>Name</th>${x.sets > 1 ? '<th>Set</th>' : ''}<th>State</th><th>Mobile</th><th>Gmail</th>${(R.sections || []).map(s => `<th class="n">${esc(s)}</th>`).join('')}<th class="n">Score</th><th class="n">Acc.</th><th class="n">✓</th><th class="n">✗</th><th class="n">Min</th></tr>
      ${(R.all || []).map(t => `<tr><td>${t.rank}</td><td style="white-space:nowrap">${esc(t.roll || '')}</td><td><b>${esc(t.name)}</b>${t.submitted ? '' : ' <span class="chip c-paid">auto</span>'}</td>${x.sets > 1 ? `<td>${esc(t.set || '')}</td>` : ''}<td>${esc(t.state || '')}</td><td>${esc(t.mobile || '')}</td><td>${esc(t.email || '')}</td>
        ${(R.sections || []).map(s => `<td class="n">${t.secs && t.secs[s] ? t.secs[s].score : '–'}</td>`).join('')}<td class="n"><b>${t.score}</b></td><td class="n">${t.acc}%</td><td class="n">${t.cor}</td><td class="n">${t.wrong}</td><td class="n">${t.mins}</td></tr>`).join('')}</table></div>` : '<p class="mut">Not calculated yet.</p>'}`);
  $('#cp').onclick = () => calculate(x, true);
  $('#co').onclick = () => calculate(x, false);
  $('#aut').onchange = async e => { try { await updateDoc(doc(db, 'exams', id), { autoCalc: e.target.checked }); x.autoCalc = e.target.checked; toast(e.target.checked ? '⏰ Auto publish ON' : 'Auto publish OFF', 'ok'); } catch (er) { e.target.checked = !e.target.checked; toast(errText(er), 'err'); } };
  if ($('#rsa')) $('#rsa').onclick = () => responseSheets(x);
  if ($('#hd')) $('#hd').onclick = async () => { try { const h = !x.resultsHold; await updateDoc(doc(db, 'exams', id), h ? { resultsHold: true, resultsOut: false } : { resultsHold: false }); x.resultsHold = h; if (h) x.resultsOut = false; replace(() => resultsPage(id)); } catch (e) { toast(errText(e), 'err'); } };
  if ($('#t10')) $('#t10').onclick = () => top10Image(x, R);
  if ($('#wa')) $('#wa').onclick = () => { const t = waText(x, R); window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank'); };
  if ($('#csv')) $('#csv').onclick = () => {
    const secs = R.sections || [];
    csv((x.title.replace(/[^\w]+/g, '_') || 'results') + '.csv', [['Rank', 'Roll No.', 'Name', 'Set', 'State', 'Mobile', 'Gmail', ...secs, 'Score', 'Accuracy %', 'Correct', 'Wrong', 'Not answered', 'Minutes', 'Submitted']]
      .concat((R.all || []).map(t => [t.rank, t.roll || '', t.name, t.set || '', t.state || '', t.mobile || '', t.email || '', ...secs.map(s => t.secs && t.secs[s] ? t.secs[s].score : ''), t.score, t.acc, t.cor, t.wrong, t.skip, t.mins, t.submitted ? 'Yes' : 'Auto'])));
  };
}
// 📄 Response sheets of all students (owner only): view one, or print / save all as one PDF (one page per student)
async function responseSheets(x) {
  const o = C.sheet('<div class="center mut">Loading answer sheets…</div>');
  let L = [];
  try {
    const [rs, ps, my, at] = await Promise.all([getDoc(doc(db, 'results', x.id)), getDoc(doc(db, 'exams', x.id, 'paper', 'main')), getDocs(collection(db, 'myresults', x.id, 'u')), getDocs(collection(db, 'attempts', x.id, 'u'))]);
    if (!rs.exists()) { o.remove(); return toast('Calculate the result first.', 'info'); }
    const R = rs.data(), qs = ps.data().questions, A = Object.fromEntries(at.docs.map(d => [d.id, d.data()]));
    const ar = (await getDoc(doc(db, 'adminresults', x.id))).data() || {}, byUid = Object.fromEntries((ar.all || []).filter(t => t.uid).map(t => [t.uid, t]));
    L = my.docs.map(d => { const M = d.data(), a = A[d.id] || {}, t = byUid[d.id] || {}; return { uid: d.id, M: Object.assign({}, M, { rank: t.rank || M.rank }), p: { name: a.name || t.name || '', state: a.state || t.state || '', roll: t.roll || '' }, date: a.startedAt }; })
      .sort((a, b) => a.M.rank - b.M.rank);
    const page1 = s => C.rsHtml({ x, P: C.setPaper(x, qs, C.examSet(x, s.uid)), R, M: s.M, p: s.p, uid: s.uid, date: s.date, rankTxt: '#' + s.M.rank });
    o.querySelector('.sheet').innerHTML = `<h3 style="margin:0 0 4px">📄 Response sheets · ${esc(x.title)}</h3><div class="small mut">${L.length} students · rank order. Print → choose <b>Save as PDF</b> to download.</div>
      <button class="btn dk block" id="pall" type="button" style="margin:10px 0">🖨 Print / PDF – all ${L.length} students</button>
      <div style="max-height:55vh;overflow:auto">${L.map((s, i) => `<div style="display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--line);padding:7px 0"><b style="width:38px">#${s.M.rank}</b><div style="flex:1;min-width:0"><b>${esc(s.p.name)}</b><div class="tiny mut">${esc(s.p.roll || '')} · ${s.M.score} marks</div></div><button class="btn gh sm" type="button" data-one="${i}">📄 View / Print</button></div>`).join('') || '<div class="mut">No students.</div>'}</div>`;
    o.querySelector('#pall').onclick = () => { o.remove(); C.printSheets(L.map(page1)); };
    o.querySelectorAll('[data-one]').forEach(b => b.onclick = () => { o.remove(); C.printSheets([page1(L[+b.dataset.one])]); });
  } catch (e) { o.remove(); toast(errText(e), 'err'); }
}
function csv(name, lines) {
  const s = '﻿' + lines.map(r => r.map(v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv' })); a.download = name; a.click();
}
// ---- result calculation core (same code runs in the Apps Script for "Publish on time")
// atts: [{ uid, a: { name, state, answers, submitted, startedAt, savedAt, submittedAt (ms numbers) } }], prof: { uid: user profile }
function calcCore(X2, key, qs, atts, prof) {
  const can = X2.cancelled || [], mark = X2.mark, neg = X2.neg, rr = v => Math.round(v * 100) / 100;
  const secs = []; qs.forEach(q => { if (!secs.includes(q.sec)) secs.push(q.sec); });
  const QS = {}; qs.forEach(q => QS[q.id] = { A: 0, B: 0, C: 0, D: 0, s: 0, c: 0 });
  const rows = atts.map(({ uid, a }) => {
    const ans = a.answers || {}; let cor = 0, wrong = 0, bonus = 0; const S = {};
    secs.forEach(s => S[s] = { c: 0, w: 0, n: 0, b: 0 });
    qs.forEach(q => {
      const s = S[q.sec], u = ans[q.id]; s.n++;
      if (u) QS[q.id][u] = (QS[q.id][u] || 0) + 1; else QS[q.id].s++;
      if (u && u === key[q.id]) QS[q.id].c++;
      if (can.includes(q.id)) { bonus += mark; s.b += mark; return; }
      if (!u) return; if (u === key[q.id]) { cor++; s.c++; } else { wrong++; s.w++; }
    });
    const SS = {}; secs.forEach(k => { const s = S[k]; SS[k] = { c: s.c, w: s.w, score: rr(s.c * mark - s.w * neg + s.b), total: rr(s.n * mark) }; });
    const end = a.submittedAt ? a.submittedAt : Math.min(a.savedAt, a.startedAt + X2.duration * 60000);
    const p = prof[uid] || {}, att = cor + wrong, secsUsed = Math.max(0, Math.round((end - a.startedAt) / 1000));
    return { uid, name: a.name, state: a.state || '', email: p.email || '', mobile: p.mobile || '', roll: p.roll || '', hide: !!p.hideName, submitted: !!a.submitted,
      cor, wrong, skip: qs.length - can.length - att, bonus: rr(bonus), score: rr(cor * mark - wrong * neg + bonus), acc: att ? Math.round(cor / att * 1000) / 10 : 0,
      secs: SS, answers: ans, mins: Math.round(secsUsed / 60), tsec: secsUsed };
  }).sort((a, b) => b.score - a.score || b.acc - a.acc || a.tsec - b.tsec);   // same score → accuracy → less time
  rows.forEach((r, i) => { const p = rows[i - 1]; r.rank = i > 0 && r.score === p.score && r.acc === p.acc && r.tsec === p.tsec ? p.rank : i + 1; });
  const n = rows.length, high = n ? rows[0].score : 0, avg = n ? rr(rows.reduce((s, r) => s + r.score, 0) / n) : 0;
  const merit = rows.slice(0, 50).map(r => ({ r: r.rank, n: r.hide ? 'IQ Student 🔒' : r.name, st: r.state, s: r.score, a: r.acc, k: r.uid.slice(0, 8) }));
  return { rows, secs, QS, n, high, avg, merit };
}
async function calculate(x, publish) {
  const m = $('#rm'); msg(m, 'Calculating… please wait, do not close this page.', 'info'); $$('#cp,#co').forEach(b => b.disabled = true);
  try {
    const [ks, ps, as, ex] = await Promise.all([getDoc(doc(db, 'keys', x.id)), getDoc(doc(db, 'exams', x.id, 'paper', 'main')), getDocs(collection(db, 'attempts', x.id, 'u')), getDoc(doc(db, 'exams', x.id))]);
    const X2 = ex.data(), key = ks.data().ans, qs = ps.data().questions, can = X2.cancelled || [], mark = X2.mark, neg = X2.neg;
    // profiles (mobile, Gmail) only for students who attempted
    const prof = {}, uids = as.docs.map(d => d.id);
    for (let i = 0; i < uids.length; i += 50) await Promise.all(uids.slice(i, i + 50).map(async u => { try { const s = await getDoc(doc(db, 'users', u)); prof[u] = s.exists() ? s.data() : {}; } catch (e) { prof[u] = {}; } }));
    const atts = as.docs.map(d => { const a = d.data(); return { uid: d.id, a: Object.assign({}, a, { startedAt: ms(a.startedAt), savedAt: ms(a.savedAt), submittedAt: a.submittedAt ? ms(a.submittedAt) : 0 }) }; });
    const { rows, secs, QS, n, high, avg, merit } = calcCore(X2, key, qs, atts, prof);
    // students see only the Top 50 + their own rank. Total count & ranks above 100 stay hidden unless "Show total participants" is ON.
    const showTotal = !!(await readPub()).showTotal, nPub = showTotal ? { n } : {};
    for (let i = 0; i < rows.length; i += 400) {
      const b = writeBatch(db);
      rows.slice(i, i + 400).forEach(r => b.set(doc(db, 'myresults', x.id, 'u', r.uid),
        { rank: showTotal ? r.rank : Math.min(r.rank, 101), ...nPub, score: r.score, cor: r.cor, wrong: r.wrong, skip: r.skip, bonus: r.bonus, acc: r.acc, secs: r.secs, answers: r.answers, mins: r.mins }));
      await b.commit();
      msg(m, `Calculating… ${Math.min(i + 400, rows.length)} / ${rows.length} students saved`, 'info');
    }
    await setDoc(doc(db, 'results', x.id), { title: X2.title, total: X2.total, ...nPub, high, avg, sections: secs, key, cancelled: can, calcAt: serverTimestamp(),
      merit });
    await setDoc(doc(db, 'adminresults', x.id), { title: X2.title, total: X2.total, n, high, avg, sections: secs, calcAt: serverTimestamp(),
      qstats: qs.map(q => Object.assign({ id: q.id }, QS[q.id])),
      all: rows.map(r => ({ uid: r.uid, roll: r.roll, set: (X2.sets || 1) > 1 ? 'ABCD'[C.examSet({ id: x.id, sets: X2.sets }, r.uid)] : '', rank: r.rank, name: r.name, state: r.state, email: r.email, mobile: r.mobile, score: r.score, acc: r.acc, cor: r.cor, wrong: r.wrong, skip: r.skip, mins: r.mins, submitted: r.submitted,
        secs: Object.fromEntries(secs.map(s => [s, { score: r.secs[s].score }])) })) });
    await updateDoc(doc(db, 'exams', x.id), publish ? { calcAt: serverTimestamp(), resultsOut: true, resultsHold: false } : { calcAt: serverTimestamp() });
    // 🔔 "Result out" – only to students who wrote this mock; at the result time (or now when publishing)
    try {
      const when = publish || !X2.resultAt || ms(X2.resultAt) < Date.now() ? Timestamp.now() : X2.resultAt;
      const nt = { kind: 'result', title: '📊 Result out: ' + X2.title, body: 'Your score, rank, merit list and response sheet are ready. Tap to see.', aud: 'exam', exam: x.id, link: '#/results/' + x.id, at: when, pushed: false };
      if (X2.resultNote) { const r0 = await getDoc(doc(db, 'notices', X2.resultNote)); if (r0.exists() && r0.data().pushed && ms(r0.data().at) <= Date.now()) {} else await setDoc(doc(db, 'notices', X2.resultNote), nt); }
      else { const r1 = await addDoc(collection(db, 'notices'), nt); await updateDoc(doc(db, 'exams', x.id), { resultNote: r1.id }); }
    } catch (e) {}
    msg(m, `Done ✓ ${n} students. Students see the Top 50${showTotal ? '' : ' (total count hidden)'}. ${publish ? 'Results are now visible to students.' : 'Results will open automatically at the result time.'}`, 'ok');
    await loadEx(); setTimeout(() => replace(() => resultsPage(x.id)), 900);
  } catch (e) { $$('#cp,#co').forEach(b => b.disabled = false); msg(m, esc(errText(e))); }
}

// ------------------------------------------------------------------ students
async function students() {
  mark('students');
  top('Students', dash);
  page(`<div class="card"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="flex:1;min-width:180px"><b style="font-size:16px">📋 All registered students</b><div class="tiny mut" id="cnt">Counting…</div></div>
      <button class="btn dk" id="all" type="button">Show all students</button></div></div>
    <div class="card"><input class="inp" id="q" placeholder="🔍 Search name / mobile / Gmail" autocomplete="off">
    <button class="btn dk block" id="go" type="button" style="margin-top:8px">Search</button>
    <div class="tiny mut" style="margin-top:6px">Mobile and Gmail: type the full number / Gmail. Name: type the starting letters (capital letters matter, e.g. “Ram”). The list loads only after you search – this saves the free quota.</div></div><div id="sr"></div>`);
  const run = async () => {
    const v = $('#q').value.trim(), out = $('#sr'); if (!v) return;
    out.innerHTML = '<div class="card center mut">Searching…</div>';
    const col = collection(db, 'users'); let docs = [];
    try {
      if (/^\+?\d[\d\s]{8,}$/.test(v)) docs = (await getDocs(query(col, where('mobile', '==', v.replace(/\D/g, '').slice(-10))))).docs;
      else if (v.includes('@')) docs = (await getDocs(query(col, where('email', '==', v.toLowerCase())))).docs;
      else {
        const forms = [...new Set([v, v.replace(/\b\w/g, c => c.toUpperCase()), v.toUpperCase()])];
        const seen = {};
        for (const f of forms) (await getDocs(query(col, where('name', '>=', f), where('name', '<=', f + '')))).docs.forEach(d => { if (!seen[d.id]) { seen[d.id] = 1; docs.push(d); } });
      }
    } catch (e) { out.innerHTML = `<div class="msg err">${esc(errText(e))}</div>`; return; }
    out.innerHTML = docs.length ? docs.slice(0, 50).map(d => { const u = d.data(); return `<button class="xc" type="button" data-u="${esc(d.id)}" style="width:100%;text-align:left;display:flex;gap:10px;align-items:center"><div style="width:36px;height:36px;border-radius:50%;background:var(--y);border:1.5px solid var(--ink);display:grid;place-items:center;font-weight:900;flex:none">${esc((u.name || '?')[0].toUpperCase())}</div><div style="min-width:0"><b>${esc(u.name)}</b><div class="tiny mut">${esc(u.state)} · ${esc(u.mobile)} · ${esc(u.email)}<br>Joined ${esc(fmtJ(u.createdAt))}</div></div></button>`; }).join('') : '<div class="card mut center">No student found.</div>';
    $$('[data-u]').forEach(b => b.onclick = () => student(b.dataset.u));
  };
  $('#go').onclick = run; $('#q').onkeydown = e => { if (e.key === 'Enter') run(); };
  let N = 0;
  getCountFromServer(collection(db, 'users')).then(c => { N = c.data().count; if ($('#cnt')) $('#cnt').textContent = `${N.toLocaleString('en-IN')} students · opens full list with Excel & Print (uses ${N.toLocaleString('en-IN')} reads of your free 50,000/day)`; }).catch(() => {});
  $('#all').onclick = allStudents;
}
async function allStudents(per0) {
  mark('allStudents', [per0]);
  top('All students', students); loading('Loading all students…');
  let L = [];
  try { L = (await getDocs(collection(db, 'users'))).docs.map(d => ({ uid: d.id, ...d.data() })); }
  catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  try { const n = await assignRolls(L); if (n) toast(`🎫 Roll numbers updated for ${n} student(s)`, 'ok'); } catch (e) {}
  let F = L, st = 'All', per = per0 || 'all', sort = 'new';
  const states = ['All', ...[...new Set(L.map(u => u.state || '—'))].sort()];
  const jt = u => u.createdAt ? fmtJ(u.createdAt) : '—';
  const t0 = dayStart().getTime(), w0 = t0 - 6 * 86400000;
  const nT = L.filter(u => ms(u.createdAt) >= t0).length, nW = L.filter(u => ms(u.createdAt) >= w0).length;
  const draw = () => {
    const q = ($('#fq') ? $('#fq').value : '').trim().toLowerCase();
    F = L.filter(u => (st === 'All' || (u.state || '—') === st) && (per === 'all' || ms(u.createdAt) >= (per === 'today' ? t0 : w0))
      && (!q || [u.name, u.mobile, u.email, u.state, u.roll].some(v => String(v || '').toLowerCase().includes(q))));
    // newest first (students who joined before the joined-time update have no time → at the end)
    F.sort(sort === 'name' ? (a, b) => String(a.name || '').localeCompare(String(b.name || '')) : (a, b) => ms(b.createdAt) - ms(a.createdAt) || ms(b.updatedAt) - ms(a.updatedAt));
    $('#tb').innerHTML = F.map((u, i) => `<tr data-u="${esc(u.uid)}" style="cursor:pointer"><td>${i + 1}</td><td style="white-space:nowrap">${esc(u.roll || '—')}</td><td><b>${esc(u.name || '')}</b>${u.hideName ? ' 🔒' : ''}</td><td>${esc(u.state || u.district || '')}</td><td>${esc(u.mobile || '')}</td><td>${esc(u.email || '')}</td><td style="white-space:nowrap">${esc(jt(u))}</td></tr>`).join('') || '<tr><td colspan="7" class="mut">No students.</td></tr>';
    $('#fc').textContent = `${F.length} of ${L.length} students`;
    $$('[data-u]').forEach(r => r.onclick = () => student(r.dataset.u));
  };
  page(`<div class="ast"><div><b>${L.length.toLocaleString('en-IN')}</b><small>Total</small></div><div><b class="up">+${nT}</b><small>Joined today</small></div><div><b class="up">+${nW}</b><small>Last 7 days</small></div></div>
    <div class="card" style="margin-top:10px"><input class="inp" id="fq" placeholder="🔍 Filter by name / mobile / Gmail / roll no.">
      <div class="g3" style="margin-top:8px"><select class="inp" id="fs">${states.map(s => `<option>${esc(s)}</option>`).join('')}</select>
        <select class="inp" id="fp"><option value="all">Joined: any time</option><option value="today" ${per === 'today' ? 'selected' : ''}>Joined today</option><option value="week" ${per === 'week' ? 'selected' : ''}>Last 7 days</option></select>
        <select class="inp" id="fo"><option value="new">Newest first</option><option value="name">Name A–Z</option></select></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><b id="fc" class="small" style="flex:1"></b>
      <button class="btn gh sm" id="xl" type="button">⬇ Excel (CSV)</button><button class="btn dk sm" id="pr" type="button">🖨 Print / PDF</button></div>
      <div class="tiny mut" style="margin-top:6px">🔒 This list has mobile numbers &amp; Gmails – keep the Excel / PDF private. Tap a student to Give Pass / Reset / Block. “—” = joined before join-time was recorded.</div></div>
    <div class="tbl"><table><tr><th>#</th><th>Roll No.</th><th>Name</th><th>State</th><th>Mobile</th><th>Gmail</th><th>Joined</th></tr><tbody id="tb"></tbody></table></div>`);
  $('#fq').oninput = draw; $('#fs').onchange = e => { st = e.target.value; draw(); }; $('#fp').onchange = e => { per = e.target.value; draw(); }; $('#fo').onchange = e => { sort = e.target.value; draw(); };
  draw();
  $('#xl').onclick = () => csv('IQFORU_students.csv', [['#', 'Roll No.', 'Name', 'State', 'Mobile', 'Gmail', 'Joined', 'Updated']].concat(F.map((u, i) => [i + 1, u.roll || '', u.name || '', u.state || u.district || '', u.mobile || '', u.email || '', jt(u), u.updatedAt ? fmtJ(u.updatedAt) : ''])));
  $('#pr').onclick = () => {
    const P = document.getElementById('print');
    P.innerHTML = `<div class="ph"><img src="logo.png" alt=""><div><div style="font-weight:900;font-size:18px">IQ FOR U</div><div style="color:#666">Registered students${st !== 'All' ? ' · ' + esc(st) : ''}${per !== 'all' ? ' · ' + (per === 'today' ? 'joined today' : 'last 7 days') : ''}</div></div><div class="tag">${F.length} STUDENTS</div></div>
      <table class="qt2" style="margin-top:10px"><tr><th style="width:30px">#</th><th>Roll No.</th><th>Name</th><th>State</th><th>Mobile</th><th>Gmail</th><th>Joined</th></tr>
      ${F.map((u, i) => `<tr><td>${i + 1}</td><td>${esc(u.roll || '')}</td><td>${esc(u.name || '')}</td><td>${esc(u.state || u.district || '')}</td><td>${esc(u.mobile || '')}</td><td>${esc(u.email || '')}</td><td>${esc(jt(u))}</td></tr>`).join('')}</table>
      <div class="ft"><span>Private – admin only</span><span>Printed ${esc(new Date().toLocaleString('en-IN'))}</span></div>`;
    window.onafterprint = () => document.body.classList.remove('printing');
    const img = P.querySelector('img'), go = () => { document.body.classList.add('printing'); setTimeout(() => window.print(), 50); };
    if (img.complete) go(); else { img.onload = go; img.onerror = go; }
  };
}
// 🎫 Roll numbers like IQ26-48213 (v6.1: jumbled, so nobody can guess how many students joined). Never changed once given.
// n = joining serial (kept secret in settings/rollctr). x⁵ mod prime 89989 mixes the numbers; every n (up to 89988 students) gives a different 5-digit code.
const rollNo = n => { const P = 89989; let b = (n + 4321) % (P - 1) + 1, r = 1; for (let i = 0; i < 5; i++) r = (r * b) % P; return String(r + 10000); };
const rollOf = (n, t) => 'IQ' + String(new Date(t || Date.now()).getFullYear()).slice(2) + '-' + rollNo(n);
const OLDROLL = /^IQ(\d\d)-(\d{4})$/;   // v5.1 style IQ26-0001 → converted once to the jumbled style (same serial)
async function assignRolls(L) {
  const old = L.filter(u => OLDROLL.test(u.roll || '')), need = L.filter(u => !u.roll && u.name);
  if (!need.length && !old.length) return 0;
  const c = await getDoc(doc(db, 'settings', 'rollctr')), C0 = c.exists() ? c.data() : {};
  let n = Math.max(C0.n || 0, ...old.map(u => parseInt(u.roll.match(OLDROLL)[2], 10)));
  need.sort((a, b) => (ms(a.createdAt) || 0) - (ms(b.createdAt) || 0) || a.uid.localeCompare(b.uid));
  const W = [];
  old.forEach(u => { const m = u.roll.match(OLDROLL); u.roll = 'IQ' + m[1] + '-' + rollNo(parseInt(m[2], 10)); W.push(u); });
  need.forEach(u => { u.roll = rollOf(++n, ms(u.createdAt) || Date.now()); W.push(u); });
  for (let i = 0; i < W.length; i += 400) { const b = writeBatch(db); W.slice(i, i + 400).forEach(u => b.update(doc(db, 'users', u.uid), { roll: u.roll })); await b.commit(); }
  await setDoc(doc(db, 'settings', 'rollctr'), { n, v: 2, lastAt: Math.max(C0.lastAt || 0, ...L.map(u => ms(u.createdAt) || 0)) });
  return W.length;
}
async function student(uid) {
  mark('student', [uid]);
  top('Student', students); loading();
  if (!EX.length) { try { await loadEx(); } catch (e) {} }
  let u, blocked = false, pass = null; const rows = [];
  try {
    const s = await getDoc(doc(db, 'users', uid)); u = s.exists() ? s.data() : {};
    blocked = (await getDoc(doc(db, 'blocked', uid))).exists();
    const ps = await getDoc(doc(db, 'passes', uid)); pass = ps.exists() ? ps.data() : null;
    await Promise.all(EX.filter(x => Date.now() >= ms(x.startAt)).map(async x => {
      const a = await getDoc(doc(db, 'attempts', x.id, 'u', uid)); if (!a.exists()) return;
      const r = await getDoc(doc(db, 'myresults', x.id, 'u', uid));
      rows.push({ x, a: a.data(), r: r.exists() ? r.data() : null });
    }));
  } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  rows.sort((p, q) => ms(q.x.startAt) - ms(p.x.startAt));
  page(`<div class="card"><div style="display:flex;gap:10px;align-items:center"><div style="width:44px;height:44px;border-radius:50%;background:var(--y);border:1.5px solid var(--ink);display:grid;place-items:center;font-weight:900;font-size:18px">${esc((u.name || '?')[0].toUpperCase())}</div>
      <div><b style="font-size:16px">${esc(u.name)}</b><div class="tiny mut">${esc(u.state)} · joined ${esc(fmtJ(u.createdAt))}${u.updatedAt ? ' · updated ' + esc(fmtD(u.updatedAt)) : ''}</div></div>${blocked ? '<span class="chip c-live" style="margin-left:auto">BLOCKED</span>' : '<span class="chip c-free" style="margin-left:auto">Active</span>'}</div>
      <div class="small" style="margin-top:10px;line-height:1.7">🎫 Roll No. <b>${esc(u.roll || '—')}</b><br>📱 ${esc(u.mobile || '')}<br>✉ ${esc(u.email || '')}</div>
      <label class="sw"><input type="checkbox" id="hn" ${u.hideName ? 'checked' : ''}> 🔒 Hide name in merit lists / Top 10 (shows “IQ Student 🔒”)</label></div>
    <div class="card" style="${passOn(pass) ? 'border:1.5px solid var(--ink);background:var(--y2)' : ''}"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:180px"><b>🎟 Monthly Pass</b><div class="small">${passTxt(pass)}</div>${pass && pass.note ? `<div class="tiny mut">Note: ${esc(pass.note)}</div>` : ''}</div>
      <button class="btn dk sm" id="gp" type="button">🎁 ${passOn(pass) ? 'Extend pass' : 'Give Pass'}</button>${pass ? '<button class="btn red sm" id="rp" type="button">Remove pass</button>' : ''}</div></div>
    <div class="tbl"><table><tr><th>Mock</th><th>Status</th><th class="n">Score</th><th class="n">Rank</th><th></th></tr>
      ${rows.map(o => `<tr><td>${esc(o.x.title)}</td><td>${o.a.submitted ? 'Submitted' : 'Not submitted'}</td><td class="n">${o.r ? o.r.score : '–'}</td><td class="n">${o.r ? '#' + o.r.rank : '–'}</td><td><button class="btn red sm" type="button" data-rs="${esc(o.x.id)}">Reset</button></td></tr>`).join('') || '<tr><td colspan="5" class="mut">No attempts.</td></tr>'}</table></div>
    <button class="btn ${blocked ? 'dk' : 'red'} block" id="bl" type="button" style="margin-top:12px">${blocked ? '✅ Unblock student' : '⛔ Block student'}</button>`);
  $$('[data-rs]').forEach(b => b.onclick = async () => { if (!await C.confirmBox('<h3 style="margin:0">Reset this attempt?</h3><p class="small">The student can write this mock again.</p>', 'Reset')) return; try { await resetAttempt(b.dataset.rs, uid); toast('Reset ✓', 'ok'); replace(() => student(uid)); } catch (e) { toast(errText(e), 'err'); } });
  $('#gp').onclick = () => givePass(uid, u, pass);
  $('#hn').onchange = async e => { try { await updateDoc(doc(db, 'users', uid), { hideName: e.target.checked }); toast(e.target.checked ? 'Name hidden ✓ – applies from the next Calculate' : 'Name visible ✓', 'ok'); } catch (er) { e.target.checked = !e.target.checked; toast(errText(er), 'err'); } };
  if ($('#rp')) $('#rp').onclick = async () => { if (!await C.confirmBox(`<h3 style="margin:0">Remove ${esc(u.name)}'s pass?</h3><p class="small">🎟 Pass mocks will be locked for this student again.</p>`, 'Remove')) return;
    try { await deleteDoc(doc(db, 'passes', uid)); toast('Pass removed', 'ok'); replace(() => student(uid)); } catch (e) { toast(errText(e), 'err'); } };
  $('#bl').onclick = async () => {
    try { if (blocked) await deleteDoc(doc(db, 'blocked', uid)); else { if (!await C.confirmBox(`<h3 style="margin:0">Block ${esc(u.name)}?</h3><p class="small">They cannot start any new test.</p>`, 'Block')) return; await setDoc(doc(db, 'blocked', uid), { at: serverTimestamp(), name: u.name || '' }); }
      toast(blocked ? 'Unblocked ✓' : 'Blocked ✓', 'ok'); replace(() => student(uid)); } catch (e) { toast(errText(e), 'err'); }
  };
}

// ------------------------------------------------------------------ 🎟 Monthly Pass (admin gives; Razorpay later)
const passOn = p => !!(p && (p.until == null || Date.now() < ms(p.until)));
const passTxt = p => !p ? 'No pass' : p.until == null ? '<b style="color:var(--ok)">Active · no expiry</b>' : passOn(p) ? `<b style="color:var(--ok)">Active</b> till <b>${esc(fmtJ(p.until))}</b>` : `<b style="color:var(--no)">Expired</b> on ${esc(fmtJ(p.until))}`;
function givePass(uid, u, cur) {
  const on = passOn(cur);
  const o = C.sheet(`<h3 style="margin:0 0 4px">🎁 ${on ? 'Extend' : 'Give'} Monthly Pass</h3><div class="small mut">${esc(u.name || '')} · ${esc(u.email || '')}</div>
    ${on && cur.until != null ? `<div class="note">Current pass is valid till <b>${esc(fmtJ(cur.until))}</b>. New days are added after that date.</div>` : ''}
    <div class="tagc one" id="gd" style="margin-top:10px">${[[1, '1 day'], [3, '3 days'], [30, '30 days'], [90, '90 days'], [365, '365 days'], [0, 'No expiry']].map(([d, l]) => `<button type="button" data-d="${d}" class="${d === 30 ? 'on' : ''}">${l}</button>`).join('')}</div>
    <label class="l" for="gn">Note (optional – only admin sees)</label><input class="inp" id="gn" maxlength="80" placeholder="Special student / paid by UPI on 24 Nov">
    <label class="l" for="gm2">Message to student (optional – added to the 🎉 congratulations)</label><input class="inp" id="gm2" maxlength="200" placeholder="Keep practising daily!">
    <div class="tiny mut" id="gw" style="margin-top:6px"></div>
    <button class="btn dk block" id="gk" type="button" style="margin-top:12px">🎁 Give Pass</button>`);
  let days = 30;
  const base = () => on && cur.until != null ? ms(cur.until) : Date.now();
  const show = () => { o.querySelector('#gw').innerHTML = days ? `Valid till <b>${esc(fmtJ(base() + days * 86400000))}</b>` : 'Valid <b>forever</b> (until you remove it).'; };
  o.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { days = +b.dataset.d; o.querySelectorAll('[data-d]').forEach(z => z.classList.toggle('on', z === b)); show(); });
  show();
  o.querySelector('#gk').onclick = async () => {
    o.querySelector('#gk').disabled = true;
    try {
      await setDoc(doc(db, 'passes', uid), { until: days ? Timestamp.fromMillis(base() + days * 86400000) : null, days, note: o.querySelector('#gn').value.trim().slice(0, 80) || (cur && cur.note) || '',
        name: u.name || '', email: u.email || '', mobile: u.mobile || '', since: cur && cur.since ? cur.since : serverTimestamp(), at: serverTimestamp(), by: 'admin' });
      const till = days ? fmtJ(base() + days * 86400000) : '';
      try { await personal(uid, { kind: 'pass', title: on ? `🎟 Your Monthly Pass is extended!` : `🎉 Congratulations ${(u.name || '').split(' ')[0]}!`,
        body: (on ? 'Your IQ FOR U Monthly Pass is extended' : 'You got the IQ FOR U Monthly Pass') + (till ? ` – valid till ${till}.` : ' – no expiry.') + ' All 🎟 PASS mocks are open for you. All the best! 💪' + (o.querySelector('#gm2').value.trim() ? '\n\n' + o.querySelector('#gm2').value.trim().slice(0, 200) : ''), link: '#/profile' }); } catch (e) {}
      o.remove(); toast('🎟 Pass given ✓ Congratulations message sent 🎉', 'ok'); replace(() => student(uid));
    } catch (e) { o.querySelector('#gk').disabled = false; toast(errText(e), 'err'); }
  };
}
async function passesView(f) {
  mark('passes', [f]);
  top(f === 'soon' ? '⏳ Pass ends in 3 days' : f === 'on' ? '🎟 Active pass students' : 'Monthly Pass students', dash); loading();
  let P = [];
  try { P = (await getDocs(collection(db, 'passes'))).docs.map(d => ({ uid: d.id, ...d.data() })); } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  if (f === 'on') P = P.filter(passOn); else if (f === 'soon') P = P.filter(p => passOn(p) && p.until != null && ms(p.until) - Date.now() < 3 * 86400000);
  P.sort((a, b) => (passOn(b) - passOn(a)) || (b.until == null) - (a.until == null) || ms(a.until) - ms(b.until));
  const act = P.filter(passOn).length, soon = P.filter(p => passOn(p) && p.until != null && ms(p.until) - Date.now() < 7 * 86400000).length;
  page(`<div class="ast"><div><b>${act}</b><small>Active passes</small></div><div><b style="color:var(--or)">${soon}</b><small>Expire in 7 days</small></div><div><b>${P.length - act}</b><small>Expired</small></div></div>
    ${f ? '<div class="card small" style="margin-top:10px">Showing: <b>' + (f === 'soon' ? 'passes ending in the next 3 days – remind them on WhatsApp to renew' : 'active passes only') + '</b> · <button class="link small" id="pa" type="button">Show all passes</button></div>' : ''}
    <div class="card small" style="margin-top:10px">To give a pass: <b>Students</b> → search the student → <b>🎁 Give Pass</b>. Online pass payment (Razorpay) comes later. <button class="btn dk sm" id="ps" type="button" style="margin-left:6px">👥 Students</button></div>
    <div class="tbl"><table><tr><th>Name</th><th>Mobile</th><th>Gmail</th><th>Status</th><th>Note</th></tr>
      ${P.map(p => `<tr data-u="${esc(p.uid)}" style="cursor:pointer"><td><b>${esc(p.name || '')}</b></td><td>${esc(p.mobile || '')}</td><td>${esc(p.email || '')}</td><td style="white-space:nowrap">${passTxt(p)}</td><td>${esc(p.note || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="mut">No passes given yet.</td></tr>'}</table></div>`);
  $('#ps').onclick = students; if ($('#pa')) $('#pa').onclick = () => passesView();
  $$('[data-u]').forEach(r => r.onclick = () => student(r.dataset.u));
}

// ------------------------------------------------------------------ 🔔 Notifications
// notices/{id}  → everyone (aud 'all'), Monthly Pass students ('pass') or students who wrote one mock ('exam').
//                 'at' in the future = shown (and sent to phones) only at that time.
// inbox/{uid}/m → one student's own messages (pass given …). pushq/{id} → phone alert queue for one student.
// The Apps Script sender (IQ FOR U Notify) sends phone alerts for both every 5 minutes.
async function notice2(n) { return addDoc(collection(db, 'notices'), Object.assign({ pushed: false, at: Timestamp.now(), link: '#/home' }, n)); }
async function personal(uid, m) {
  const d = Object.assign({ at: Timestamp.now() }, m);
  await addDoc(collection(db, 'inbox', uid, 'm'), d);
  try { await addDoc(collection(db, 'pushq'), { to: uid, title: d.title, body: d.body, link: d.link || '#/home', at: d.at }); } catch (e) {}
}
async function announceMock(x) {
  const aud = needsPass(x) ? 'pass' : 'all', start = ms(x.startAt), soon = start > Date.now();
  await notice2({ kind: 'mock', aud, exam: x.id, link: '#/tests', title: '📢 New mock: ' + x.title,
    body: `${soon ? 'Opens ' + fmtDT(x.startAt) : 'LIVE now'} · ${x.count} questions · ${x.duration} min · ${needsPass(x) ? '🎟 Monthly Pass' : '🆓 FREE'}` });
  let live = x.liveNote || null;
  if (soon) {
    const nt = { kind: 'live', aud, exam: x.id, link: '#/start/' + x.id, title: '⏰ ' + x.title + ' is LIVE now', body: 'The test is open. Tap to start – all the best! 💪', at: Timestamp.fromMillis(start), pushed: false };
    if (live) await setDoc(doc(db, 'notices', live), nt); else live = (await addDoc(collection(db, 'notices'), nt)).id;
  }
  await updateDoc(doc(db, 'exams', x.id), { notifiedAt: serverTimestamp(), liveNote: live });
  x.notifiedAt = Date.now(); x.liveNote = live;
}
async function notifyView() {
  mark('notify');
  top('Send notification', dash); loading();
  if (!EX.length) { try { await loadEx(); } catch (e) {} }
  let N = [];
  try { N = (await getDocs(query(collection(db, 'notices'), orderBy('at', 'desc'), limit(40)))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) {}
  const audTxt = n => n.aud === 'pass' ? '🎟 Pass students' : n.aud === 'exam' ? '📝 ' + esc((EX.find(e => e.id === n.exam) || {}).title || 'one mock') : '👥 All students';
  page(`<div class="card"><div style="font-weight:800">🔔 New notification</div>
      <label class="l" for="nt1">Title</label><input class="inp" id="nt1" maxlength="60" placeholder="📢 Mock 2 this Sunday!">
      <label class="l" for="nb1">Message</label><textarea class="inp" id="nb1" rows="3" maxlength="300" placeholder="History + Polity · 100 questions · 10 AM. Be ready! 💪"></textarea>
      <div class="g2"><div><label class="l" for="na1">Send to</label><select class="inp" id="na1"><option value="all">👥 All students</option><option value="pass">🎟 Monthly Pass students</option>${EX.filter(x => Date.now() >= ms(x.startAt)).map(x => `<option value="x:${esc(x.id)}">📝 Wrote: ${esc(x.title)}</option>`).join('')}</select></div>
        <div><label class="l" for="nl1">When tapped, open</label><select class="inp" id="nl1"><option value="#/home">Home</option><option value="#/tests">Mock Tests</option><option value="#/results">My Results</option><option value="#/profile">Profile</option></select></div></div>
      <button class="btn dk block" id="ns1" type="button" style="margin-top:12px">🔔 Send now</button><div id="nm1"></div>
      <div class="tiny mut" style="margin-top:6px">Students see it in the app 🔔 bell. Students who turned on phone alerts also get it on their phone (within ~5 minutes, through the Apps Script sender).</div></div>
    <div class="sec">Sent &amp; scheduled (${N.length})</div>
    ${N.map(n => `<div class="card" style="padding:10px 12px"><div style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1;min-width:0"><b>${esc(n.title)}</b><div class="small" style="white-space:pre-wrap">${esc(n.body || '')}</div>
      <div class="tiny mut" style="margin-top:3px">${audTxt(n)} · ${ms(n.at) > Date.now() ? '⏳ scheduled ' + esc(fmtDT(n.at)) : esc(fmtDT(n.at))} · ${n.pushed ? '📲 sent to phones' : '📲 phone: waiting'}</div></div>
      <button class="btn red sm" type="button" data-nd="${esc(n.id)}">🗑</button></div></div>`).join('') || '<div class="card mut">Nothing sent yet.</div>'}`);
  $('#ns1').onclick = async () => {
    const t = $('#nt1').value.trim(), b = $('#nb1').value.trim(), a = $('#na1').value;
    if (!t) return msg($('#nm1'), 'Write a title.');
    if (!await C.confirmBox(`<h3 style="margin:0 0 6px">Send this notification?</h3><p class="small"><b>${esc(t)}</b><br>${esc(b)}</p><p class="small mut">To: ${a === 'all' ? 'All students' : a === 'pass' ? 'Monthly Pass students' : 'students who wrote the mock'}</p>`, '🔔 Send')) return;
    $('#ns1').disabled = true;
    try { await notice2(Object.assign({ kind: 'admin', title: t.slice(0, 60), body: b.slice(0, 300), link: $('#nl1').value }, a.startsWith('x:') ? { aud: 'exam', exam: a.slice(2) } : { aud: a }));
      toast('🔔 Sent ✓', 'ok'); replace(notifyView); } catch (e) { $('#ns1').disabled = false; msg($('#nm1'), esc(errText(e))); }
  };
  $$('[data-nd]').forEach(b => b.onclick = async () => { if (!await C.confirmBox('<h3 style="margin:0">Delete this notification?</h3><p class="small">It disappears from the students\' 🔔 bell.</p>', 'Delete')) return;
    try { await deleteDoc(doc(db, 'notices', b.dataset.nd)); toast('Deleted', 'ok'); replace(notifyView); } catch (e) { toast(errText(e), 'err'); } });
}

// ------------------------------------------------------------------ 🏆 Top 10 image + WhatsApp message (for groups / Instagram)
function waText(x, R) {
  const L = (R.all || []).slice(0, 10), md = ['🥇', '🥈', '🥉'];
  return `🏆 *${x.title}* – Result\n\n` + L.map((t, i) => `${md[t.rank - 1] || t.rank + '.'} ${t.name}${t.state ? ' (' + t.state + ')' : ''} – ${t.score}/${R.total}`).join('\n') +
    `\n\nCongratulations to all toppers! 🎉\nCheck your score, rank & response sheet 👉 ${location.origin}\n${C.IG_HANDLE ? '📷 Follow @' + C.IG_HANDLE + ' for the next mock' : ''}`;
}
async function top10Image(x, R) {
  const L = (R.all || []).slice(0, 10); if (!L.length) return toast('No students yet.', 'info');
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
  g.fillStyle = '#FFE51F'; g.fillRect(0, 0, 1080, 1350);
  const logo = new Image(); logo.src = 'logo.png'; await new Promise(r => { logo.onload = r; logo.onerror = r; });
  try { g.drawImage(logo, 60, 50, 150, 150); } catch (e) {}
  g.fillStyle = '#111318'; g.font = '900 64px Inter, sans-serif'; g.fillText('IQ FOR U', 235, 125); g.font = '700 30px Inter, sans-serif'; g.fillText('Mocks for All Competitive Exams', 237, 172);
  g.fillRect(60, 240, 960, 1000);
  g.fillStyle = '#FFE51F'; g.textAlign = 'center'; g.font = '900 54px Inter, sans-serif'; g.fillText('🏆 TOP 10 🏆', 540, 315);
  g.fillStyle = '#BFC3CC'; g.font = '600 32px Inter, sans-serif'; g.fillText(x.title.length > 46 ? x.title.slice(0, 45) + '…' : x.title, 540, 365);
  const md = ['🥇', '🥈', '🥉'];
  L.forEach((t, i) => {
    const y = 445 + i * 78; g.textAlign = 'left';
    if (i % 2 === 0) { g.fillStyle = '#1C1F26'; g.fillRect(90, y - 50, 900, 72); }
    g.fillStyle = t.rank <= 3 ? '#FFE51F' : '#fff'; g.font = '900 38px Inter, sans-serif'; g.fillText(md[t.rank - 1] || '#' + t.rank, 110, y);
    g.fillStyle = '#fff'; g.font = '800 36px Inter, sans-serif'; const nm = t.name.length > 22 ? t.name.slice(0, 21) + '…' : t.name; g.fillText(nm, 220, y);
    const w = g.measureText(nm).width; g.fillStyle = '#9CA3AF'; g.font = '600 24px Inter, sans-serif';
    if (t.state && 220 + w + 16 + g.measureText(t.state).width < 880) g.fillText(t.state, 220 + w + 16, y);
    g.textAlign = 'right'; g.fillStyle = '#FFE51F'; g.font = '900 38px Inter, sans-serif'; g.fillText(String(t.score), 965, y);
  });
  g.textAlign = 'center'; g.fillStyle = '#111318'; g.font = '900 40px Inter, sans-serif'; g.fillText('Congratulations! 🎉  Next mock: ' + location.host, 540, 1295);
  c.toBlob(async b => {
    const f = new File([b], 'IQFORU-top10.png', { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: waText(x, R) }); return; } } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'IQFORU-top10.png'; a.click(); toast('Top 10 image downloaded – share it on WhatsApp / Instagram 📸', 'ok');
  }, 'image/png');
}

// ------------------------------------------------------------------ 📚 PRACTICE LIBRARY (admin)
const PG = { gs: { n: 'General Studies', e: '📚' }, sci: { n: 'General Science', e: '🔬' }, apt: { n: 'Aptitude', e: '🧮' }, ca: { n: 'Current Affairs', e: '📰' }, mix: { n: 'Combined Mocks', e: '🎯' } };
const DEF_SUBJ = { gs: ['History', 'Geography', 'Polity', 'Economics', 'Art & Culture', 'EVS'], sci: ['Physics', 'Chemistry', 'Biology'], apt: ['Maths', 'Reasoning', 'Computer'], mix: ['OSSSC Full Mock', 'SSC Full Mock', 'Railway Full Mock'] };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pSubjects = (g, P) => g === 'ca' ? [] : ((P.psubj && P.psubj[g] && P.psubj[g].length) ? P.psubj[g] : DEF_SUBJ[g]);
const pYears = P => (P.cayears && P.cayears.length ? P.cayears : [2026]).map(Number).sort((a, b) => b - a);
const pName = (g, s) => g === 'ca' ? (MONTHS[+s.split('-')[1] - 1] || s) + ' ' + s.split('-')[0] : s;
const defMin = n => n <= 30 ? 20 : n <= 50 ? 30 : n <= 100 ? 60 : Math.round(n * 0.6);
const owner = () => ROLE === 'owner';
const pFreeN = P => { const n = parseInt(P.pfree, 10); return n >= 0 ? n : 3; };   // ⚙️ Settings → Free mocks per subject (default 3)
const isFreeP = (x, P) => x.access === 'free' || x.no <= pFreeN(P);
// published practice mocks are listed in settings/pindex (students read the whole library with ONE read)
const pEntry = (id, d) => ({ id, g: d.g, s: d.s, no: d.no, ch: d.ch || '', c: d.count, d: d.duration, m: d.mark, n: d.neg, a: d.access, t: d.title });
async function pIndexPatch(changes) {   // changes: { id: data | null }
  const s = await getDoc(doc(db, 'settings', 'pindex')); let L = s.exists() ? (s.data().list || []) : [];
  Object.entries(changes).forEach(([id, d]) => { L = L.filter(e => e.id !== id); if (d && d.published) L.push(pEntry(id, d)); });
  L.sort((a, b) => (a.g + a.s).localeCompare(b.g + b.s) || a.no - b.no);
  await setDoc(doc(db, 'settings', 'pindex'), { list: L, updatedAt: serverTimestamp() });
}
async function pIndexRebuild() {
  const s = await getDocs(query(collection(db, 'pexams'), where('published', '==', true)));
  const L = s.docs.map(d => pEntry(d.id, d.data())).sort((a, b) => (a.g + a.s).localeCompare(b.g + b.s) || a.no - b.no);
  await setDoc(doc(db, 'settings', 'pindex'), { list: L, updatedAt: serverTimestamp() });
  return L.length;
}
async function practiceAdmin(g) {
  mark('practice', [g || null]);
  top('📚 Practice Library', dash); loading();
  const P = await readPub(); g = g || 'gs';
  let L = [];
  try { L = (await getDocs(query(collection(db, 'pexams'), where('g', '==', g)))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  const subs = g === 'ca' ? pYears(P).flatMap(y => MONTHS.map((m, i) => y + '-' + String(i + 1).padStart(2, '0'))) : pSubjects(g, P);
  page(`<div class="tabs">${Object.keys(PG).map(k => `<button type="button" data-g="${k}" class="${k === g ? 'on' : ''}">${PG[k].e} ${PG[k].n}</button>`).join('')}</div>
    <div class="card small">Each subject: <b>${pFreeN(P) === 1 ? 'Mock 1' : 'first ' + pFreeN(P) + ' mocks'} = FREE</b> (change in ⚙️ Settings), others need the Monthly Pass. ${owner() ? 'Drafts from your team wait here until you <b>Publish</b>.' : 'You save mocks as <b>Draft</b>; the owner checks and publishes.'}
      ${owner() ? '<button class="link tiny" id="rbi" type="button" style="margin-left:6px">🔄 Repair student list</button>' : ''}</div>
    ${subs.map(s => { const M = L.filter(x => x.s === s), pub = M.filter(x => x.published).length, dr = M.length - pub;
      return `<button type="button" class="xc" data-s="${esc(s)}" style="width:100%;text-align:left;display:flex;align-items:center;gap:10px"><b style="flex:1">${esc(pName(g, s))}</b><span class="tiny mut">${pub} published${dr ? ` · <b style="color:var(--or)">${dr} draft</b>` : ''}</span><span>›</span></button>`; }).join('')}
    ${g !== 'ca' && owner() ? '<div class="tiny mut" style="margin-top:6px">＋ Add subjects in ⚙️ Settings → 📚 Practice subjects.</div>' : ''}`);
  $$('[data-g]').forEach(b => b.onclick = () => replace(() => practiceAdmin(b.dataset.g)));
  $$('[data-s]').forEach(b => b.onclick = () => practiceSubject(g, b.dataset.s));
  if ($('#rbi')) $('#rbi').onclick = async () => { try { const n = await pIndexRebuild(); toast(`✓ Student list rebuilt – ${n} published mocks`, 'ok'); } catch (e) { toast(errText(e), 'err'); } };
}
async function practiceSubject(g, s) {
  mark('psubj', [g, s]);
  top(pName(g, s), () => practiceAdmin(g)); loading();
  let L = [];
  try { L = (await getDocs(query(collection(db, 'pexams'), where('g', '==', g), where('s', '==', s)))).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.no - b.no); }
  catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  const next = (L.reduce((m, x) => Math.max(m, x.no), 0) || 0) + 1, P = await readPub();
  page(`<div class="impb" style="grid-template-columns:repeat(3,1fr)"><button class="btn dk sm" id="pn" type="button">＋ New mock</button><button class="btn gh sm" id="pbx" type="button">📊 Bulk Excel</button><button class="btn gh sm" id="pqb" type="button">🗂 Question Bank</button></div>
    ${L.map(x => `<div class="xc"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>Mock ${x.no}</b>${x.ch ? `<span class="tiny mut">${esc(x.ch)}</span>` : ''}
        ${isFreeP(x, P) ? '<span class="chip c-free">FREE</span>' : '<span class="chip c-pass">🎟 PASS</span>'}${x.published ? '<span class="chip c-free">Published</span>' : '<span class="chip c-paid">Draft</span>'}</div>
      <div class="meta"><span>${x.count} Q · ${x.duration} min · +${x.mark} / −${x.neg}</span>${x.createdBy ? `<span>✏️ ${esc(x.createdBy)}</span>` : ''}</div>
      <div class="acts"><button class="btn gh sm" type="button" data-pe="${esc(x.id)}">✏️ Edit</button><button class="btn gh sm" type="button" data-pv="${esc(x.id)}">👁 Preview</button>
        ${owner() ? `<button class="btn ${x.published ? 'gh' : ''} sm" type="button" data-pp="${esc(x.id)}">${x.published ? 'Hide' : '✅ Publish'}</button><button class="btn red sm" type="button" data-pd="${esc(x.id)}">🗑</button>` : ''}</div></div>`).join('') || '<div class="card mut">No mocks yet. Tap <b>＋ New mock</b>, <b>📊 Bulk Excel</b> or <b>🗂 Question Bank</b>.</div>'}
    ${owner() && L.some(x => !x.published) ? '<button class="btn block" id="pall" type="button" style="margin-top:8px">✅ Publish all drafts</button>' : ''}`);
  $('#pn').onclick = () => pEdit(null, { g, s, no: next });
  $('#pbx').onclick = () => pBulk(g, s, L);
  $('#pqb').onclick = () => pBank(g, s, L);
  $$('[data-pe]').forEach(b => b.onclick = () => { const x = L.find(z => z.id === b.dataset.pe); if (!owner() && x.published) return toast('Only the owner can edit a published mock.', 'info'); pEdit(x.id, x); });
  $$('[data-pv]').forEach(b => b.onclick = () => pPreview(b.dataset.pv, L.find(z => z.id === b.dataset.pv)));
  $$('[data-pp]').forEach(b => b.onclick = async () => { const x = L.find(z => z.id === b.dataset.pp);
    try { await updateDoc(doc(db, 'pexams', x.id), { published: !x.published, updatedAt: serverTimestamp() }); x.published = !x.published; await pIndexPatch({ [x.id]: x }); toast(x.published ? 'Published ✓ Students can see it' : 'Hidden ✓', 'ok'); replace(() => practiceSubject(g, s)); }
    catch (e) { toast(errText(e), 'err'); } });
  $$('[data-pd]').forEach(b => b.onclick = async () => { const x = L.find(z => z.id === b.dataset.pd);
    if (!await C.confirmBox(`<h3 style="margin:0 0 6px">Delete Mock ${x.no}?</h3><p class="small">Questions and answers of this practice mock will be deleted.</p>`, 'Delete')) return;
    try { const bt = writeBatch(db); bt.delete(doc(db, 'pexams', x.id, 'paper', 'main')); bt.delete(doc(db, 'pexams', x.id, 'akey', 'main')); bt.delete(doc(db, 'pexams', x.id)); await bt.commit(); await pIndexPatch({ [x.id]: null }); toast('Deleted', 'ok'); replace(() => practiceSubject(g, s)); }
    catch (e) { toast(errText(e), 'err'); } });
  if ($('#pall')) $('#pall').onclick = async () => {
    const D = L.filter(x => !x.published); if (!await C.confirmBox(`<h3 style="margin:0 0 6px">Publish ${D.length} drafts?</h3><p class="small">Check the questions first (👁 Preview).</p>`, 'Publish')) return;
    try { const bt = writeBatch(db); D.forEach(x => { bt.update(doc(db, 'pexams', x.id), { published: true, updatedAt: serverTimestamp() }); x.published = true; }); await bt.commit();
      await pIndexPatch(Object.fromEntries(D.map(x => [x.id, x]))); toast(`✓ ${D.length} mocks published`, 'ok'); replace(() => practiceSubject(g, s)); } catch (e) { toast(errText(e), 'err'); }
  };
}
const pid = (g, s, no) => ('p-' + g + '-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '') + '-' + no + '-' + Math.random().toString(36).slice(2, 5));
// write one practice mock (doc + paper + answer key) in a batch
function pWrite(b, id, meta, qs) {
  const paper = qs.map((q, i) => ({ id: 'q' + (i + 1), sec: q.sec || meta.s, topic: q.topic || '', q: q.q, o: q.o }));
  const ans = {}, exp = {}; qs.forEach((q, i) => { ans['q' + (i + 1)] = q.ans; if (q.exp) exp['q' + (i + 1)] = q.exp; });
  const d = Object.assign({ count: qs.length, total: r2(qs.length * meta.mark), updatedAt: serverTimestamp(), updatedBy: auth.currentUser.email }, meta);
  b.set(doc(db, 'pexams', id), d); b.set(doc(db, 'pexams', id, 'paper', 'main'), { questions: paper }); b.set(doc(db, 'pexams', id, 'akey', 'main'), { ans, exp });
  return d;
}
async function pEdit(id, x) {
  mark('pedit', [id, x]);
  top(id ? `Edit · ${pName(x.g, x.s)} Mock ${x.no}` : `New · ${pName(x.g, x.s)}`, () => practiceSubject(x.g, x.s)); loading();
  let tsv = '';
  if (id) { try { const [p, k] = await Promise.all([getDoc(doc(db, 'pexams', id, 'paper', 'main')), getDoc(doc(db, 'pexams', id, 'akey', 'main'))]);
    tsv = toTSV(p.exists() ? p.data().questions : [], k.exists() ? k.data().ans : {}, k.exists() ? k.data().exp || {} : {}); } catch (e) { toast(errText(e), 'err'); } }
  page(`<div class="card"><div class="g3"><div><label class="l" for="pno">Mock No.</label><input class="inp" id="pno" type="number" min="1" value="${x.no || 1}"></div><div style="grid-column:span 2"><label class="l" for="pch">Chapter (optional)</label><input class="inp" id="pch" maxlength="40" value="${esc(x.ch || '')}" placeholder="Ancient India"></div></div>
    <div class="g3"><div><label class="l" for="du">Minutes</label><input class="inp" id="du" type="number" min="5" max="300" value="${x.duration || ''}" placeholder="auto"></div><div><label class="l" for="mk">+ Mark</label><input class="inp" id="mk" type="number" step="0.25" min="0.25" value="${x.mark || 1}"></div><div><label class="l" for="ng">− Neg</label><input class="inp" id="ng" type="number" step="0.05" min="0" value="${x.neg ?? 0.25}"></div></div>
    <label class="l" for="ac">Access</label><select class="inp" id="ac"><option value="pass" ${x.access !== 'free' ? 'selected' : ''}>Automatic – first mocks free, others 🎟 Pass (⚙️ Settings)</option><option value="free" ${x.access === 'free' ? 'selected' : ''}>🆓 Always FREE (any mock number)</option></select>
    <label class="l">Add questions (30 / 50 / 100 – any number)</label>
    <div class="impb"><button class="btn gh sm" type="button" id="ipdf">📄 Import PDF</button><button class="btn gh sm" type="button" id="ixl">📊 Import Excel</button><button class="btn gh sm" type="button" id="itx">📋 Paste text</button><button class="btn sm" type="button" id="ied">👁 Preview &amp; edit</button></div>
    <input type="file" id="fpdf" accept="application/pdf,.pdf" class="hide"><input type="file" id="fxl" accept=".xlsx,.xls,.csv" class="hide">
    <label class="l" for="qs">Questions (Section | Topic | Question | A | B | C | D | Answer | Explanation – last column optional)</label>
    <textarea class="inp tsv" id="qs" spellcheck="false">${esc(tsv)}</textarea><div id="pv"></div>
    ${owner() ? `<label class="sw"><input type="checkbox" id="pb" ${x.published ? 'checked' : ''}> Published (students can see it)</label>` : '<div class="tiny mut" style="margin-top:8px">💾 Saved as <b>Draft</b> – the owner will check and publish.</div>'}
    <button class="btn dk block" id="sv" type="button" style="margin-top:14px">💾 ${owner() ? 'Save' : 'Save Draft'}</button><div id="sm"></div></div>`);
  const preview = () => { const { qs, errs } = toQuestions($('#qs').value), ans = { A: 0, B: 0, C: 0, D: 0 }; qs.forEach(q => ans[q.ans]++);
    $('#pv').innerHTML = `<div class="msg ${errs.length ? 'err' : (qs.length ? 'ok' : 'info')}"><b>${qs.length}</b> questions · ${qs.filter(q => q.exp).length} explanations · Answers A${ans.A} B${ans.B} C${ans.C} D${ans.D}${qs.length && !$('#du').value ? ` · ⏱ ${defMin(qs.length)} min (auto)` : ''}${errs.length ? '<br>' + errs.slice(0, 8).map(esc).join('<br>') : ''}</div>`; return { qs, errs }; };
  $('#qs').oninput = preview; $('#du').oninput = preview; preview(); importButtons(preview);
  $('#sv').onclick = async () => {
    const { qs, errs } = preview(), m = $('#sm'), no = parseInt($('#pno').value, 10), mark2 = Number($('#mk').value), neg = Number($('#ng').value);
    if (!(no >= 1)) return msg(m, 'Mock No. must be 1 or more.');
    if (!qs.length || errs.length) return msg(m, 'Fix the questions first (see the red box).');
    if (qs.length > 100) return msg(m, `A practice mock can have at most <b>100</b> questions (now ${qs.length}). To split many questions into mocks, go back and use <b>🗂 Question Bank</b>.`);
    if (!(mark2 > 0) || neg < 0) return msg(m, 'Check + Mark and − Neg.');
    const duration = parseInt($('#du').value, 10) || defMin(qs.length), pubd = owner() ? $('#pb').checked : false, nid = id || pid(x.g, x.s, no);
    const meta = { title: pName(x.g, x.s) + ' · Mock ' + no, g: x.g, s: x.s, no, ch: $('#pch').value.trim(), duration, mark: mark2, neg, access: $('#ac').value, published: pubd, createdBy: x.createdBy || auth.currentUser.email };
    $('#sv').disabled = true;
    try { const b = writeBatch(db); const d = pWrite(b, nid, meta, qs); await b.commit(); if (owner()) await pIndexPatch({ [nid]: d });
      msg(m, 'Saved ✓', 'ok'); setTimeout(() => replace(() => practiceSubject(x.g, x.s)), 600); }
    catch (e) { $('#sv').disabled = false; msg(m, esc(errText(e))); }
  };
}
async function pPreview(id, x) {
  try { const [p, k] = await Promise.all([getDoc(doc(db, 'pexams', id, 'paper', 'main')), getDoc(doc(db, 'pexams', id, 'akey', 'main'))]);
    const qs = p.exists() ? p.data().questions : []; if (!qs.length) return toast('No questions.', 'info');
    $('#top').classList.add('hide'); C.runExam({ x: { id, title: x.title + ' (preview)', mark: x.mark, neg: x.neg, duration: x.duration }, qs, ans: {}, marked: new Set(), visited: new Set(), end: Date.now() + 3600000, preview: true, key: k.exists() ? k.data().ans : {}, back: () => { $('#top').classList.remove('hide'); practiceSubject(x.g, x.s); } });
  } catch (e) { toast(errText(e), 'err'); }
}
// 📊 Bulk Excel: Mock No | Chapter | Question | A | B | C | D | Answer | Explanation  → many mocks at once
function bulkRows(rows) {
  rows = rows.map(r => (r || []).map(v => String(v ?? '').trim())).filter(r => r.some(Boolean));
  if (rows.length && /mock/i.test(rows[0][0] || '') && !/^\d+$/.test(rows[0][0])) rows = rows.slice(1);
  const out = [], errs = [];
  rows.forEach((c, i) => { const no = parseInt(c[0], 10), o = c.slice(3, 7), ans = ansOf(c[7], o);
    if (!(no >= 1)) return errs.push(`Row ${i + 1}: Mock No missing`);
    if (!c[2] || o.some(v => !v) || !ans) return errs.push(`Row ${i + 1}: question / option / answer missing`);
    out.push({ no, ch: c[1] || '', q: c[2], o, ans, exp: c[8] || '' }); });
  return { out, errs };
}
function pBulk(g, s, L) {
  const o = C.sheet(`<h3 style="margin:0 0 4px">📊 Bulk Excel – many mocks</h3><div class="small mut">Columns: <b>Mock No | Chapter | Question | A | B | C | D | Answer | Explanation</b> (explanation optional). Choose the .xlsx file or copy all rows from Excel and paste.</div>
    <button class="btn gh block" id="bxf" type="button" style="margin-top:8px">📁 Choose Excel file</button><input type="file" id="bxi" accept=".xlsx,.xls,.csv" class="hide">
    <textarea class="inp tsv" id="bxt" rows="6" placeholder="Mock No\tChapter\tQuestion\tA\tB\tC\tD\tAnswer\tExplanation" style="margin-top:8px"></textarea>
    <div class="g3"><div><label class="l">− Neg</label><input class="inp" id="bxn" type="number" step="0.05" value="0.25"></div><div><label class="l">Minutes</label><input class="inp" id="bxd" type="number" placeholder="auto"></div><div><label class="l">&nbsp;</label>${owner() ? '<label class="sw" style="margin:0"><input type="checkbox" id="bxp"> Publish</label>' : '<div class="tiny mut">Draft</div>'}</div></div>
    <div id="bxm"></div><button class="btn dk block" id="bxg" type="button" style="margin-top:10px">🔍 Check</button>`);
  let rows = null;
  o.querySelector('#bxf').onclick = () => o.querySelector('#bxi').click();
  o.querySelector('#bxi').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { rows = await excelRows(f); o.querySelector('#bxt').value = ''; o.querySelector('#bxm').innerHTML = `<div class="msg ok">${esc(f.name)} – ${rows.length} rows read</div>`; } catch (er) { toast(er.message || String(er), 'err'); } };
  o.querySelector('#bxg').onclick = async () => {
    const R0 = rows || parseTSV(o.querySelector('#bxt').value), { out, errs } = bulkRows(R0), by = {};
    out.forEach(q => (by[q.no] = by[q.no] || []).push(q));
    const nos = Object.keys(by).map(Number).sort((a, b) => a - b), clash = nos.filter(n => L.some(x => x.no === n));
    const box = o.querySelector('#bxm');
    if (!out.length) return box.innerHTML = `<div class="msg err">No questions found.${errs.length ? '<br>' + errs.slice(0, 6).map(esc).join('<br>') : ''}</div>`;
    box.innerHTML = `<div class="msg ${errs.length ? 'err' : 'ok'}">✓ ${out.length} questions → <b>${nos.length} mocks</b> (${nos.map(n => 'Mock ' + n + ': ' + by[n].length + 'Q').join(', ')})${errs.length ? '<br>⚠ ' + errs.length + ' rows skipped: ' + errs.slice(0, 4).map(esc).join(' · ') : ''}${clash.length ? `<br>⚠ Mock ${clash.join(', ')} already exist – they will be <b>skipped</b>.` : ''}</div>`;
    const bt = o.querySelector('#bxg'); bt.textContent = `✨ Create ${nos.length - clash.length} mocks`;
    bt.onclick = async () => {
      bt.disabled = true; const neg = Number(o.querySelector('#bxn').value) || 0, dm = parseInt(o.querySelector('#bxd').value, 10), pub = owner() && o.querySelector('#bxp') && o.querySelector('#bxp').checked, idx = {};
      try { let b = writeBatch(db), n = 0;
        for (const no of nos) { if (clash.includes(no)) continue; const qs = by[no], id = pid(g, s, no);
          idx[id] = pWrite(b, id, { title: pName(g, s) + ' · Mock ' + no, g, s, no, ch: qs[0].ch, duration: dm || defMin(qs.length), mark: 1, neg, access: 'pass', published: pub, createdBy: auth.currentUser.email }, qs);
          if (++n % 120 === 0) { await b.commit(); b = writeBatch(db); } }
        await b.commit(); if (pub) await pIndexPatch(idx);
        o.remove(); toast(`✓ ${Object.keys(idx).length} mocks created${pub ? ' & published' : ' as drafts'}`, 'ok'); replace(() => practiceSubject(g, s)); }
      catch (e) { bt.disabled = false; toast(errText(e), 'err'); }
    };
  };
}
// 🗂 Question Bank: all questions of a subject once → app makes 30 / 50 / 100 Q mocks (duplicates removed)
const normQ = t => String(t || '').toLowerCase().replace(/[^a-z0-9ऀ-෿]+/g, ' ').trim();
// read questions → Excel (Section | Topic | Question | A–D | Answer | Explanation) so the admin can fix answers and upload again
async function bankXlsx(list, name) {
  try { const X = await loadLib(LIBS.xlsx);
    const aoa = [['Section', 'Topic', 'Question', 'A', 'B', 'C', 'D', 'Answer', 'Explanation', 'Problem']].concat(list.map(q => { const o = fix4(q.o); return [q.sec || name, q.topic || '', q.q || '', o[0], o[1], o[2], o[3], q.ans || '', q.exp || '', problems(q).join(', ')]; }));
    const wb = X.utils.book_new(), ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 60 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 8 }, { wch: 30 }, { wch: 28 }];
    X.utils.book_append_sheet(wb, ws, 'Questions'); X.writeFile(wb, 'IQFORU_' + String(name).replace(/\W+/g, '_') + '_questions.xlsx');
    toast('Excel downloaded ✓ Fill the empty Answer cells, delete the Problem column if you like, then choose it with 📊 Excel file.', 'ok'); }
  catch (e) { toast(e.message || String(e), 'err'); }
}
function pBank(g, s, L) {
  const nextNo = (L.reduce((m, x) => Math.max(m, x.no), 0) || 0) + 1;
  const o = C.sheet(`<h3 style="margin:0 0 4px">🗂 Question Bank · ${esc(pName(g, s))}</h3><div class="small mut">Give all questions of this subject – <b>Excel</b>, <b>PDF</b> (text PDF, not scanned) or <b>paste</b> text. The app makes mocks automatically.</div>
    <div class="g2" style="margin-top:8px"><button class="btn gh" id="qbf" type="button">📊 Excel file</button><button class="btn gh" id="qbpdf" type="button">📄 PDF file</button></div>
    <input type="file" id="qbi" accept=".xlsx,.xls,.csv" class="hide"><input type="file" id="qbpi" accept="application/pdf,.pdf" class="hide">
    <textarea class="inp tsv" id="qbt" rows="6" style="margin-top:8px" placeholder="Or paste here: copied from Excel, or questions like&#10;1. Question…&#10;(a) … (b) … (c) … (d) …&#10;Ans: b"></textarea>
    <label class="l">Make mocks of</label><div class="tagc one" id="qbs">${[30, 50, 100].map(n => `<button type="button" data-n="${n}" class="${n === 50 ? 'on' : ''}">${n} Q</button>`).join('')}</div>
    <div class="g3"><div><label class="l">Start at Mock No.</label><input class="inp" id="qbno" type="number" value="${nextNo}"></div><div><label class="l">− Neg</label><input class="inp" id="qbn" type="number" step="0.05" value="0.25"></div><div><label class="l">&nbsp;</label>${owner() ? '<label class="sw" style="margin:0"><input type="checkbox" id="qbp"> Publish</label>' : '<div class="tiny mut">Draft</div>'}</div></div>
    <label class="sw"><input type="checkbox" id="qbc" checked> Chapter name = Topic column</label>
    <div id="qbm"></div><button class="btn dk block" id="qbg" type="button" style="margin-top:10px">🔍 Check questions</button>`);
  let size = 50, rows = null;
  o.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { size = +b.dataset.n; o.querySelectorAll('[data-n]').forEach(z => z.classList.toggle('on', z === b)); o.querySelector('#qbg').textContent = '🔍 Check questions'; o.querySelector('#qbg').onclick = check; });
  o.querySelector('#qbf').onclick = () => o.querySelector('#qbi').click();
  const got = (f, from) => { const bad = rows.filter(q => problems(q).length).length; o.querySelector('#qbt').value = '';
    o.querySelector('#qbm').innerHTML = `<div class="msg ${rows.length ? (bad ? 'info' : 'ok') : 'err'}">${esc(f)} – <b>${rows.length}</b> questions read from ${from}${bad ? `<br>⚠ <b>${bad}</b> have a problem (answer / option missing) – they will be skipped. <button class="btn gh sm" type="button" id="qbx">⬇ Download Excel to fix</button>` : ''}${!rows.length ? '<br>Questions should look like <b>1. Question…</b> with options <b>(a) (b) (c) (d)</b> and answers <b>Ans: b</b> or an answer key <b>1-b, 2-c</b>.' : ''}</div>`;
    const x = o.querySelector('#qbx'); if (x) x.onclick = () => bankXlsx(rows, pName(g, s)); };
  o.querySelector('#qbi').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { rows = fromRows(await excelRows(f)); got(f.name, 'Excel'); } catch (er) { toast(er.message || String(er), 'err'); } };
  o.querySelector('#qbpdf').onclick = () => o.querySelector('#qbpi').click();
  o.querySelector('#qbpi').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; const b = o.querySelector('#qbpdf'), t0 = b.innerHTML; b.disabled = true; b.innerHTML = '⏳ Reading PDF…';
    try { const t = await pdfText(f); b.disabled = false; b.innerHTML = t0;
      if (t.replace(/\s/g, '').length < 30) { rows = null; o.querySelector('#qbm').innerHTML = '<div class="msg err">This PDF has no text (scanned / photo PDF). Only PDFs where you can select and copy text can be read.</div>'; return; }
      rows = parseText(t); got(f.name, 'PDF'); }
    catch (er) { b.disabled = false; b.innerHTML = t0; toast(er.message || String(er), 'err'); } };
  o.querySelector('#qbt').oninput = () => { rows = null; };
  const check = async () => {
    const tx = o.querySelector('#qbt').value; if (!rows && tx.trim() && !tx.includes('\t')) rows = parseText(tx);
    const box = o.querySelector('#qbm'), list = rows || toQuestions(tx).qs, bad = rows ? rows.filter(q => problems(q).length) : toQuestions(tx).errs;
    const good = (rows ? list.filter(q => !problems(q).length) : list);
    box.innerHTML = '<div class="msg info">Checking duplicates with existing mocks…</div>';
    const seen = new Set(); let dupOld = 0, dupNew = 0;
    try { for (const x of L) { const p = await getDoc(doc(db, 'pexams', x.id, 'paper', 'main')); (p.exists() ? p.data().questions : []).forEach(q => seen.add(normQ(q.q))); } } catch (e) {}
    const oldSet = new Set(seen), fin = [];
    good.forEach(q => { const k = normQ(q.q); if (oldSet.has(k)) { dupOld++; return; } if (seen.has(k)) { dupNew++; return; } seen.add(k); fin.push(q); });
    const n = Math.floor(fin.length / size), left = fin.length - n * size, start = parseInt(o.querySelector('#qbno').value, 10) || nextNo;
    box.innerHTML = `<div class="msg ${n ? 'ok' : 'err'}"><b>${fin.length}</b> questions ready · ⚠ ${dupNew} repeated in this list · ⚠ ${dupOld} already in old mocks · ${bad.length} with errors (skipped)<br>→ <b>${n} mocks</b> of ${size} Q (Mock ${start}–${start + n - 1})${left ? ` · ${left} questions left for the next time` : ''}</div>`;
    const bt = o.querySelector('#qbg'); if (!n) return; bt.textContent = `✨ Create ${n} mocks`;
    bt.onclick = async () => {
      bt.disabled = true; const neg = Number(o.querySelector('#qbn').value) || 0, pub = owner() && o.querySelector('#qbp') && o.querySelector('#qbp').checked, idx = {}, useCh = o.querySelector('#qbc').checked;
      try { let b = writeBatch(db);
        for (let i = 0; i < n; i++) { const no = start + i, qs = fin.slice(i * size, (i + 1) * size).map(q => Object.assign({}, q, { sec: s })), id = pid(g, s, no);
          idx[id] = pWrite(b, id, { title: pName(g, s) + ' · Mock ' + no, g, s, no, ch: useCh ? (qs[0].topic || '') : '', duration: defMin(size), mark: 1, neg, access: 'pass', published: pub, createdBy: auth.currentUser.email }, qs);
          if ((i + 1) % 120 === 0) { await b.commit(); b = writeBatch(db); } }
        await b.commit(); if (pub) await pIndexPatch(idx);
        o.remove(); toast(`✓ ${n} mocks created${pub ? ' & published' : ' as drafts'}`, 'ok'); replace(() => practiceSubject(g, s)); }
      catch (e) { bt.disabled = false; toast(errText(e), 'err'); }
    };
  };
  o.querySelector('#qbg').onclick = check;
}

// ------------------------------------------------------------------ 👥 TEAM (owner adds editors by Gmail)
async function teamView() {
  mark('team');
  top('👥 Team', dash); loading();
  let T = [];
  try { T = (await getDocs(collection(db, 'team'))).docs.map(d => ({ id: d.id, ...d.data() })); } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  page(`<div class="card"><b>✏️ Editors</b><div class="small mut" style="margin:2px 0 8px">Editors log in at <b>${esc(location.host)}/#/admin</b> with their <b>own Gmail</b> (Google) and set their <b>own 8-digit code</b>. They can add &amp; edit <b>draft</b> mocks only. You check and publish.</div>
      <div class="tbl"><table><tr><th>Gmail</th><th>Name</th><th>Code set</th><th>✅ Results</th><th></th></tr>${T.map(t => `<tr><td>${esc(t.id)}</td><td>${esc(t.name || '')}</td><td>${t.hash ? '✓' : '—'}</td><td><label class="sw" style="margin:0"><input type="checkbox" data-cp="${esc(t.id)}" ${t.canPublish ? 'checked' : ''}> can publish</label></td><td><button class="btn red sm" type="button" data-rm="${esc(t.id)}">Remove</button></td></tr>`).join('') || '<tr><td colspan="5" class="mut">No editors yet.</td></tr>'}</table></div>
      <div class="tiny mut" style="margin-top:6px">✅ <b>can publish</b> = this editor can press <b>Calculate &amp; Publish now</b> and turn on <b>Publish on time</b> for live mocks. The server calculates – the editor never sees students' mobile / Gmail.</div>
      <div class="g2" style="margin-top:10px"><div><label class="l" for="te">Friend's Gmail</label><input class="inp" id="te" type="email" placeholder="friend@gmail.com"></div><div><label class="l" for="tn">Name</label><input class="inp" id="tn" maxlength="40" placeholder="Ravi"></div></div>
      <button class="btn dk block" id="ta" type="button" style="margin-top:10px">＋ Add editor</button><div id="tm"></div></div>
    <div class="card small"><b>Editor can:</b> ✅ create / edit draft mocks (live &amp; practice), import Excel / PDF, preview<br><b>Editor cannot:</b> ❌ publish · students data · passes · results · notifications · settings · payments · team</div>`);
  $('#ta').onclick = async () => { const e = $('#te').value.trim().toLowerCase(), n = $('#tn').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return msg($('#tm'), 'Enter a valid Gmail.');
    if (e === (auth.currentUser.email || '').toLowerCase()) return msg($('#tm'), 'That is your own owner Gmail.');
    try { await setDoc(doc(db, 'team', e), { name: n, addedAt: serverTimestamp(), hash: '' }); toast('Editor added ✓ Ask them to open ' + location.host + '/#/admin', 'ok'); replace(teamView); } catch (er) { msg($('#tm'), esc(errText(er))); } };
  $$('[data-cp]').forEach(c => c.onchange = async () => { try { await updateDoc(doc(db, 'team', c.dataset.cp), { canPublish: c.checked }); toast(c.checked ? '✓ Can publish results' : 'Result permission removed', 'ok'); } catch (e) { c.checked = !c.checked; toast(errText(e), 'err'); } });
  $$('[data-rm]').forEach(b => b.onclick = async () => { if (!await C.confirmBox(`<h3 style="margin:0">Remove ${esc(b.dataset.rm)}?</h3><p class="small">Their access stops immediately.</p>`, 'Remove')) return;
    try { await deleteDoc(doc(db, 'team', b.dataset.rm)); toast('Removed', 'ok'); replace(teamView); } catch (e) { toast(errText(e), 'err'); } });
}

// ------------------------------------------------------------------ feedback
async function feedbackView(id) {
  mark('feedbackView', [id]);
  const x = EX.find(e => e.id === id);
  top('Feedback · ' + x.title, true); loading();
  let F = [];
  try { F = (await getDocs(collection(db, 'feedback', id, 'u'))).docs.map(d => d.data()); } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  if (!F.length) { page('<div class="card center mut">No feedback yet.</div>'); return; }
  F.sort((a, b) => ms(b.at) - ms(a.at));
  const n = F.length, avg = r2(F.reduce((s, f) => s + f.stars, 0) / n), st = [5, 4, 3, 2, 1].map(k => F.filter(f => f.stars === k).length);
  const D = { Easy: 0, Moderate: 0, Hard: 0 }; F.forEach(f => { if (f.diff in D) D[f.diff]++; }); const dn = D.Easy + D.Moderate + D.Hard || 1;
  const T = {}; F.forEach(f => (f.tags || []).forEach(t => T[t] = (T[t] || 0) + 1));
  const star = k => '★'.repeat(k) + '☆'.repeat(5 - k);
  page(`<div class="card" style="display:flex;gap:16px;align-items:center"><div class="center"><div style="font-size:34px;font-weight:900">${avg}</div><div style="color:#F5B400">${star(Math.round(avg))}</div><div class="tiny mut">${n} feedbacks</div></div>
      <div style="flex:1">${st.map((c, i) => `<div style="display:flex;gap:6px;align-items:center;font-size:12px">${5 - i}★<div class="bar2" style="flex:1;margin:3px 0"><i style="width:${c / n * 100}%;background:#F5B400"></i></div>${c}</div>`).join('')}</div></div>
    <div class="sec">Difficulty votes</div>
    <div class="bar2" style="height:22px;font-size:11px;font-weight:800;color:#fff;text-align:center;line-height:22px"><i style="width:${D.Easy / dn * 100}%;background:#22C55E">${D.Easy ? Math.round(D.Easy / dn * 100) + '% Easy' : ''}</i><i style="width:${D.Moderate / dn * 100}%;background:var(--ink);color:var(--y)">${D.Moderate ? Math.round(D.Moderate / dn * 100) + '% Moderate' : ''}</i><i style="width:${D.Hard / dn * 100}%;background:var(--no)">${D.Hard ? Math.round(D.Hard / dn * 100) + '% Hard' : ''}</i></div>
    <div class="sec">Top tags</div><div style="display:flex;gap:6px;flex-wrap:wrap">${Object.keys(T).sort((a, b) => T[b] - T[a]).map(t => `<span class="chip ${t === 'App problem' || t === 'Wrong question' ? 'c-live' : ''}">${esc(t)} ${T[t]}</span>`).join('') || '<span class="tiny mut">No tags</span>'}</div>
    <div class="sec">Comments <button type="button" id="fc">⬇ CSV</button></div>
    ${F.filter(f => f.comment).map(f => `<div class="card" style="padding:10px 12px"><b>${esc(f.name)}</b> <span class="tiny mut">· ${esc(f.state)} · ${f.at ? esc(fmtDT(f.at)) : ''}</span> <span style="color:#F5B400">${star(f.stars)}</span><div class="small" style="margin-top:3px">${esc(f.comment)}</div></div>`).join('') || '<div class="tiny mut">No comments.</div>'}`);
  $('#fc').onclick = () => csv('feedback_' + id + '.csv', [['Name', 'State', 'Stars', 'Difficulty', 'Tags', 'Comment', 'Time']].concat(F.map(f => [f.name, f.state, f.stars, f.diff, (f.tags || []).join('; '), f.comment, f.at ? fmtDT(f.at) : ''])));
}

// ------------------------------------------------------------------ question analysis
async function analysisView(id) {
  mark('analysisView', [id]);
  const x = EX.find(e => e.id === id);
  top('Analysis · ' + x.title, true); loading();
  let R, P;
  try { const [r, p] = await Promise.all([getDoc(doc(db, 'adminresults', id)), getDoc(doc(db, 'exams', id, 'paper', 'main'))]); R = r.exists() ? r.data() : null; P = p.exists() ? p.data().questions : []; }
  catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  if (!R || !R.qstats) { page('<div class="card center mut">Calculate the result first (Results → Calculate). Analysis comes from that.</div>'); return; }
  const N = R.n || 1, Q = R.qstats.map((s, i) => { const q = P.find(z => z.id === s.id) || {}; const ans = s.A + s.B + s.C + s.D, wr = ans - s.c;
    return { i: i + 1, q, s, wrongP: Math.round(wr / N * 100), skipP: Math.round(s.s / N * 100), corP: Math.round(s.c / N * 100) }; });
  let tab = 'w';
  const draw = () => {
    let body = '';
    if (tab === 's2') {
      const secs = R.sections || []; body = `<div class="card">${secs.map(k => { const vals = (R.all || []).map(t => t.secs && t.secs[k] ? t.secs[k].score : 0), av = vals.length ? r2(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, tot = P.filter(q => q.sec === k).length * x.mark;
        return `<div class="sbar"><div class="t"><b>${esc(k)}</b><span>avg ${av} / ${tot}</span></div><div class="tr"><i style="width:${tot ? Math.max(0, av / tot * 100) : 0}%"></i></div></div>`; }).join('')}</div>`;
    } else {
      const L = [...Q].sort((a, b) => tab === 'w' ? b.wrongP - a.wrongP : b.skipP - a.skipP).slice(0, 30);
      body = L.map(o => `<div class="card" style="padding:10px 12px"><div style="display:flex;justify-content:space-between"><b>Q${o.i} · ${esc(o.q.sec || '')}</b><b style="color:var(--no)">${tab === 'w' ? o.wrongP + '% wrong' : o.skipP + '% skipped'}</b></div>
        <div class="small" style="margin:3px 0">${esc((o.q.q || '').slice(0, 140))}${(o.q.q || '').length > 140 ? '…' : ''}</div>
        <div class="bar2"><i style="width:${o.corP}%;background:var(--ok)"></i><i style="width:${o.wrongP}%;background:var(--no)"></i><i style="width:${o.skipP}%;background:#C9CDD4"></i></div>
        <div class="tiny mut" style="margin-top:4px">✓ ${o.corP}% · ✗ ${o.wrongP}% · – ${o.skipP}% · Options chosen: A ${o.s.A || 0}, B ${o.s.B || 0}, C ${o.s.C || 0}, D ${o.s.D || 0}</div></div>`).join('');
    }
    page(`<div class="tabs">${[['w', 'Most wrong'], ['s', 'Most skipped'], ['s2', 'Section-wise']].map(([k, l]) => `<button type="button" data-tb="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="banner n" style="margin-bottom:10px">🎬 <b>Reel idea:</b> “${Q.length ? [...Q].sort((a, b) => b.wrongP - a.wrongP)[0].wrongP : 0}% students got this wrong — can you solve it?” Use the top questions for Instagram.</div>${body}`);
    $$('[data-tb]').forEach(b => b.onclick = () => { tab = b.dataset.tb; draw(); });
  };
  draw();
}

// ------------------------------------------------------------------ reported questions
async function reportsView(id) {
  mark('reportsView', [id]);
  const x = EX.find(e => e.id === id);
  top('Reports · ' + x.title, true); loading();
  let RP = [], P = [], K = {};
  try {
    const [r, p, k] = await Promise.all([getDocs(collection(db, 'reports', id, 'r')), getDoc(doc(db, 'exams', id, 'paper', 'main')), getDoc(doc(db, 'keys', id))]);
    RP = r.docs.map(d => ({ _id: d.id, ...d.data() })); P = p.exists() ? p.data().questions : []; K = k.exists() ? k.data().ans : {};
  } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  const G = {}; RP.forEach(r => { (G[r.qid] = G[r.qid] || []).push(r); });
  const can = x.cancelled || [];
  const ids = Object.keys(G).sort((a, b) => G[b].length - G[a].length);
  page(`<div class="card small">Students' 🚩 reports. Fix the answer key or cancel a question, then <b>Results → Calculate</b> again.<div class="acts" style="grid-template-columns:1fr"><button class="btn" id="rc" type="button">🧮 Go to Results / Re-calculate</button></div></div>
    ${ids.map(qid => { const q = P.find(z => z.id === qid) || { q: '(question not found)', o: [] }, no = P.findIndex(z => z.id === qid) + 1, L = G[qid];
      return `<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><b>Q${no} · ${esc(q.sec || '')}</b><span class="chip c-live">${L.length} report${L.length > 1 ? 's' : ''}</span></div>
        <div class="small" style="margin:6px 0;white-space:pre-wrap">${esc(q.q)}</div>
        <div class="small">${(q.o || []).map((o, j) => `<div ${'ABCD'[j] === K[qid] ? 'style="color:var(--ok);font-weight:800"' : ''}>(${'ABCD'[j]}) ${esc(o)}${'ABCD'[j] === K[qid] ? ' ✓ current key' : ''}</div>`).join('')}</div>
        <div style="margin:8px 0">${L.map(r => `<div class="tiny" style="border-left:3px solid var(--line);padding-left:8px;margin:4px 0"><b>${esc(r.reason)}</b>${r.text ? ' – “' + esc(r.text) + '”' : ''} <span class="mut">· ${esc(r.name)}</span></div>`).join('')}</div>
        <div class="acts"><select class="inp" data-k="${qid}" style="padding:7px">${['A', 'B', 'C', 'D'].map(L2 => `<option ${L2 === K[qid] ? 'selected' : ''}>${L2}</option>`).join('')}</select>
          <button class="btn sm" type="button" data-fix="${qid}">✏️ Save answer key</button>
          <button class="btn gh sm" type="button" data-can="${qid}">${can.includes(qid) ? '↩ Un-cancel question' : '🎁 Cancel Q (+' + x.mark + ' all)'}</button>
          <button class="btn red sm" type="button" data-dr="${qid}">🗑 Clear reports</button></div></div>`; }).join('') || '<div class="card center mut">No reports. 👍</div>'}`);
  $('#rc').onclick = () => resultsPage(id);
  $$('[data-fix]').forEach(b => b.onclick = async () => { const q = b.dataset.fix, v = document.querySelector(`[data-k="${q}"]`).value; try { K[q] = v; await setDoc(doc(db, 'keys', id), { ans: K }); toast('Answer key saved ✓ Now re-calculate.', 'ok'); replace(() => reportsView(id)); } catch (e) { toast(errText(e), 'err'); } });
  $$('[data-can]').forEach(b => b.onclick = async () => { const q = b.dataset.can, c = new Set(x.cancelled || []); c.has(q) ? c.delete(q) : c.add(q); try { await updateDoc(doc(db, 'exams', id), { cancelled: [...c] }); x.cancelled = [...c]; toast('Saved ✓ Now re-calculate.', 'ok'); replace(() => reportsView(id)); } catch (e) { toast(errText(e), 'err'); } });
  $$('[data-dr]').forEach(b => b.onclick = async () => { try { for (const r of G[b.dataset.dr]) await deleteDoc(doc(db, 'reports', id, 'r', r._id)); toast('Cleared', 'ok'); replace(() => reportsView(id)); } catch (e) { toast(errText(e), 'err'); } });
}

// ------------------------------------------------------------------ notice + settings + payments
function regLabel(n) { n = Math.floor(n || 0); if (n >= 1000) { const k = Math.floor(n / 100) / 10; return (k % 1 ? k.toFixed(1) : String(k)) + 'K+'; } return (n >= 20 ? Math.floor(n / 10) * 10 : n) + '+'; }
async function readPub() { try { const s = await getDoc(doc(db, 'settings', 'public')); return s.exists() ? s.data() : {}; } catch (e) { return {}; } }
async function savePub(patch) { const p = Object.assign(await readPub(), patch, { updatedAt: serverTimestamp() }); await setDoc(doc(db, 'settings', 'public'), p); C.setPub(p); }
async function notice() {
  mark('notice');
  top('Home announcement', dash); loading();
  const p = await readPub();
  page(`<div class="card"><label class="l" for="nt">Announcement text (shows on top of the student Home)</label><textarea class="inp" id="nt" rows="3" maxlength="200" placeholder="Mock 2 this Sunday 10 AM – free for all! 🔥">${esc(p.notice || '')}</textarea>
    <label class="sw"><input type="checkbox" id="no" ${p.noticeOn ? 'checked' : ''}> Show on Home</label>
    <button class="btn dk block" id="ns" type="button" style="margin-top:12px">💾 Save</button><div id="nm"></div></div>`);
  $('#ns').onclick = async () => { try { await savePub({ notice: $('#nt').value.trim().slice(0, 200), noticeOn: $('#no').checked }); msg($('#nm'), 'Saved ✓', 'ok'); } catch (e) { msg($('#nm'), esc(errText(e))); } };
}
async function settings() {
  mark('settings');
  top('Settings', dash); loading();
  const p = await readPub();
  page(`<div class="card"><div style="font-weight:800">📞 Contact details (shown on Contact, Refund &amp; Privacy pages – Razorpay checks these)</div>
      <label class="l" for="se">Contact email</label><input class="inp" id="se" type="email" maxlength="120" value="${esc(p.contactEmail || '')}" placeholder="support email">
      <label class="l" for="sp">Phone / WhatsApp</label><input class="inp" id="sp" maxlength="20" value="${esc(p.contactPhone || '')}">
      <label class="l" for="sa">Address (city, state)</label><input class="inp" id="sa" maxlength="160" value="${esc(p.contactAddress || '')}" placeholder="City, District, State, PIN">
      <label class="l" for="sd">Policy “Last updated” date</label><input class="inp" id="sd" maxlength="40" value="${esc(p.policyDate || '')}" placeholder="e.g. 25 Nov 2026">
      <button class="btn dk block" id="ss" type="button" style="margin-top:12px">💾 Save contact details</button><div id="sm"></div></div>
    <div class="card"><div style="font-weight:800">🏠 Home badge &amp; 🏆 results</div>
      <label class="sw"><input type="checkbox" id="hr" ${p.showRegCount ? 'checked' : ''}> Show “👥 students registered” badge on Home</label>
      <label class="l" for="hm">Show the badge only when students are at least</label><input class="inp" id="hm" type="number" min="0" max="1000000" value="${p.regMin ?? 100}">
      <div class="tiny mut" id="hn" style="margin-top:4px">Now: ${p.regCount != null ? `<b>${p.regCount}</b> students → badge shows “${regLabel(p.regCount)} students registered”` : 'open the Dashboard once to count'} (real count, rounded down – never a fake number).</div>
      <label class="sw"><input type="checkbox" id="ht" ${p.showTotal ? 'checked' : ''}> Show total participants to students</label>
      <div class="tiny mut">OFF (recommended): students see only the Top 50 merit list, their own rank (1–100 as “#56”, above 100 as “100+”) – nobody knows how many wrote. You always see everything here. After changing this, press <b>Calculate</b> again for old mocks.</div>
      <button class="btn dk block" id="hs" type="button" style="margin-top:12px">💾 Save</button><div id="hmm"></div></div>
    <div class="card"><div style="font-weight:800">📲 Phone notifications (Firebase Cloud Messaging)</div>
      <label class="l" for="vk">Web Push key (Firebase → ⚙️ Project settings → Cloud Messaging → Web Push certificates → Key pair)</label><input class="inp" id="vk" maxlength="200" value="${esc(p.vapidKey || '')}" placeholder="BExxxxxxxx…" style="font-family:ui-monospace,monospace;font-size:12.5px">
      <div class="tiny mut" id="vkn" style="margin-top:4px">This key is public (safe). Without it, students still get notifications inside the app 🔔 – phone alerts need this key + the Apps Script sender (see the v4 guide).</div>
      <button class="btn dk block" id="vks" type="button" style="margin-top:10px">💾 Save key</button><div id="vkm"></div></div>
    <div class="card"><div style="font-weight:800">🔗 Home links</div><div class="tiny mut">Empty → the tile shows SOON. Changing a link needs no code update.</div>
      ${[['pyq', '📄 PYQs (Google Drive link)', 'https://drive.google.com/…'], ['notes', '🛒 Buy Notes (store link)', 'https://…'], ['tg', '🆓 Free Notes (Telegram link)', 'https://t.me/…'], ['wa', '🎁 Buy Combo (WhatsApp Business link or number)', 'https://wa.me/91XXXXXXXXXX or 91XXXXXXXXXX'], ['ig', '📷 Instagram', 'https://instagram.com/…'], ['combo', '🎁 Combo Pack link (empty = uses WhatsApp above)', 'https://…'], ['tgc', '✈️ Telegram channel (empty = uses Free Notes link)', 'https://t.me/…'], ['yt', '▶️ YouTube', 'https://youtube.com/@…']].map(([k, l, ph]) => `<label class="l" for="lk_${k}">${l}</label><input class="inp" id="lk_${k}" value="${esc((p.links || {})[k] || '')}" placeholder="${esc(ph)}">`).join('')}
      <button class="btn dk block" id="lks" type="button" style="margin-top:10px">💾 Save links</button><div id="lkm"></div></div>
    <div class="card"><div style="font-weight:800">📚 Practice subjects</div><div class="tiny mut">＋ Add a subject, then add mocks to it. A subject can be removed (✕) only while it has no mocks.</div>
      <div id="psx"></div>
      <label class="l" for="pfn">🆓 Free mocks per subject</label><input class="inp" id="pfn" type="number" min="0" max="50" value="${pFreeN(p)}" style="max-width:120px">
      <div class="tiny mut">Mock 1 … this number are FREE in every subject; the rest need the Monthly Pass. Applies to old mocks too.</div>
      <label class="l" for="ps_ca">Current Affairs years</label><input class="inp" id="ps_ca" value="${esc(pYears(p).join(', '))}" placeholder="2026, 2027">
      <button class="btn dk block" id="pss" type="button" style="margin-top:10px">💾 Save subjects</button><div id="psm"></div></div>
    <div class="card"><div style="font-weight:800">💳 Online payments (Razorpay)</div>
      <div class="tiny mut">Key <b>ID</b> only here (it is public). The Key <b>Secret</b> goes ONLY into Apps Script → Script properties → <b>RZP_SECRET</b>.</div>
      <label class="l" for="rk">Razorpay Key ID</label><input class="inp" id="rk" value="${esc(p.rzpKey || '')}" placeholder="rzp_test_… or rzp_live_…" autocomplete="off">
      <label class="l" for="ru">Payment web app URL (Apps Script → Deploy → Web app)</label><input class="inp" id="ru" value="${esc(p.payUrl || '')}" placeholder="https://script.google.com/macros/s/…/exec">
      <label class="l">Plans <span class="tiny mut">(name · days · ₹ price · ON)</span></label><div id="plx"></div>
      <button class="btn gh sm" type="button" id="pla" style="margin-top:6px">＋ Add plan</button>
      <label class="sw"><input type="checkbox" id="pon" ${p.payOff ? '' : 'checked'}> Show “Get Pass” to students (payments ON)</label>
      <div class="tiny mut" id="pmode"></div>
      <button class="btn dk block" id="pys" type="button" style="margin-top:10px">💾 Save payments</button><div id="pym"></div></div>
    <div class="card"><div style="font-weight:800">🔐 Change 8-digit security code</div>
      <label class="l" for="k0">Current code</label><input class="inp code" id="k0" type="password" inputmode="numeric" maxlength="8">
      <label class="l" for="k1">New code</label><input class="inp code" id="k1" type="password" inputmode="numeric" maxlength="8">
      <label class="l" for="k2">Re-enter new code</label><input class="inp code" id="k2" type="password" inputmode="numeric" maxlength="8">
      <button class="btn block" id="ks" type="button" style="margin-top:12px">Change code</button><div id="km"></div></div>`);
  $('#hs').onclick = async () => { try { await savePub({ showRegCount: $('#hr').checked, regMin: Math.max(0, Math.round(+$('#hm').value || 0)), showTotal: $('#ht').checked }); msg($('#hmm'), 'Saved ✓', 'ok'); } catch (e) { msg($('#hmm'), esc(errText(e))); } };
  $('#lks').onclick = async () => { const L = {}; ['pyq', 'notes', 'tg', 'wa', 'ig', 'combo', 'tgc', 'yt'].forEach(k => L[k] = $('#lk_' + k).value.trim().slice(0, 300));
    const bad = Object.entries(L).filter(([k, v]) => v && !/^https?:\/\//i.test(v) && !(k === 'wa' && /^\+?\d[\d\s-]{8,}$/.test(v)));
    if (bad.length) return msg($('#lkm'), 'Links must start with https:// (WhatsApp can also be a number like 919876543210).');
    try { await savePub({ links: L }); msg($('#lkm'), 'Saved ✓', 'ok'); } catch (e) { msg($('#lkm'), esc(errText(e))); } };
  // subject chips: ＋ Add · ✕ remove (only when the subject has no mocks)
  const SUB = Object.fromEntries(['gs', 'sci', 'apt', 'mix'].map(k => [k, pSubjects(k, p).slice()]));
  const drawSub = () => { $('#psx').innerHTML = ['gs', 'sci', 'apt', 'mix'].map(k => `<label class="l">${PG[k].e} ${PG[k].n}</label><div style="display:flex;flex-wrap:wrap;gap:6px">${SUB[k].map((n, i) => `<span class="chip" style="font-size:13px;padding:5px 6px 5px 10px">${esc(n)} <button type="button" class="link" data-rm="${k}|${i}" aria-label="Remove" style="margin-left:4px;font-weight:900;text-decoration:none">✕</button></span>`).join('')}</div>
      <div style="display:flex;gap:6px;margin-top:6px"><input class="inp" id="na_${k}" maxlength="30" placeholder="New subject name" style="flex:1"><button class="btn gh sm" type="button" data-add="${k}">＋ Add</button></div>`).join('');
    $$('[data-add]').forEach(b => b.onclick = () => { const k = b.dataset.add, v = $('#na_' + k).value.trim().replace(/\s+/g, ' ');
      if (!v) return; if (SUB[k].some(z => z.toLowerCase() === v.toLowerCase())) return toast('Already in the list', 'info'); if (SUB[k].length >= 20) return toast('Max 20 subjects', 'info');
      SUB[k].push(v); drawSub(); msg($('#psm'), 'Added – press 💾 Save subjects', 'info'); });
    $$('[data-rm]').forEach(b => b.onclick = async () => { const [k, i] = b.dataset.rm.split('|'), n = SUB[k][+i];
      try { const q = await getDocs(query(collection(db, 'pexams'), where('g', '==', k), where('s', '==', n), limit(1)));
        if (!q.empty) return toast(`“${n}” has mocks – delete its mocks first.`, 'err'); } catch (e) { return toast(errText(e), 'err'); }
      SUB[k].splice(+i, 1); drawSub(); msg($('#psm'), 'Removed – press 💾 Save subjects', 'info'); }); };
  drawSub();
  // 💳 plans editor
  const PL = (p.plans || [{ id: 'd1', name: '1 Day Pass', days: 1, price: 4 }, { id: 'm1', name: '1 Month Pass', days: 30, price: 49 }, { id: 'm3', name: '3 Months Pass', days: 90, price: 99 }, { id: 'm6', name: '6 Months Pass', days: 180, price: 149 }]).map(x => Object.assign({ on: true }, x));
  const drawPl = () => { $('#plx').innerHTML = PL.map((x, i) => `<div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,.7fr) minmax(0,.8fr) auto;gap:6px;margin-top:6px;align-items:center">
      <input class="inp" data-pf="name|${i}" value="${esc(x.name)}" maxlength="30" aria-label="Plan name"><input class="inp" data-pf="days|${i}" type="number" min="1" max="3650" value="${x.days}" aria-label="Days"><input class="inp" data-pf="price|${i}" type="number" min="1" max="100000" value="${x.price}" aria-label="Price ₹">
      <label class="sw" style="margin:0"><input type="checkbox" data-pf="on|${i}" ${x.on !== false ? 'checked' : ''}> ON</label></div>`).join('');
    $$('[data-pf]').forEach(el => el.oninput = el.onchange = () => { const [k, i] = el.dataset.pf.split('|'); PL[+i][k] = k === 'on' ? el.checked : k === 'name' ? el.value : +el.value; }); };
  drawPl();
  const mode = () => { const k = $('#rk').value.trim(); $('#pmode').innerHTML = k.startsWith('rzp_live_') ? '🟢 <b>LIVE</b> – real money' : k.startsWith('rzp_test_') ? '🟠 <b>TEST mode</b> – no real money. Change to the rzp_live_ key after KYC.' : ''; };
  $('#rk').oninput = mode; mode();
  $('#pla').onclick = () => { PL.push({ id: 'p' + Date.now().toString(36), name: 'New plan', days: 7, price: 19, on: true }); drawPl(); };
  $('#pys').onclick = async () => { const k = $('#rk').value.trim(), u = $('#ru').value.trim(), m = $('#pym');
    if (k && !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(k)) return msg(m, 'Key ID should look like rzp_test_XXXX (not the Secret!).');
    if (u && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(u)) return msg(m, 'Web app URL should start with https://script.google.com/macros/s/ and end with /exec');
    const bad = PL.find(x => !x.name.trim() || !(x.days >= 1) || !(x.price >= 1)); if (bad) return msg(m, 'Every plan needs a name, days ≥ 1 and price ≥ ₹1.');
    try { await savePub({ rzpKey: $('#pon').checked ? k : '', rzpKeySaved: k, payUrl: u, payOff: !$('#pon').checked, plans: PL.map(x => ({ id: x.id, name: x.name.trim(), days: Math.round(x.days), price: Math.round(x.price), on: x.on !== false })) }); msg(m, 'Saved ✓', 'ok'); }
    catch (e) { msg(m, esc(errText(e))); } };
  if (!p.rzpKey && p.rzpKeySaved) $('#rk').value = p.rzpKeySaved;
  $('#pss').onclick = async () => { const sp = v => [...new Set(v.split(',').map(z => z.trim()).filter(Boolean))].slice(0, 20);
    const yrs = sp($('#ps_ca').value).map(Number).filter(y => y >= 2020 && y <= 2100), fn = Math.max(0, Math.min(50, parseInt($('#pfn').value, 10) || 0));
    try { await savePub({ psubj: SUB, cayears: yrs.length ? yrs : [2026], pfree: fn }); msg($('#psm'), 'Saved ✓', 'ok'); } catch (e) { msg($('#psm'), esc(errText(e))); } };
  $('#vks').onclick = async () => { const v = $('#vk').value.trim(); if (v && !/^[A-Za-z0-9_-]{60,120}$/.test(v)) return msg($('#vkm'), 'This does not look like a Web Push key (long text starting with B…).');
    try { await savePub({ vapidKey: v }); msg($('#vkm'), 'Saved ✓', 'ok'); } catch (e) { msg($('#vkm'), esc(errText(e))); } };
  getCountFromServer(collection(db, 'tokens')).then(c => { if ($('#vkn')) $('#vkn').innerHTML += ` <b>${c.data().count}</b> students have turned on phone alerts.`; }).catch(() => {});
  ['#k0', '#k1', '#k2'].forEach(s => $(s).oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });
  $('#ss').onclick = async () => { try { await savePub({ contactEmail: $('#se').value.trim(), contactPhone: $('#sp').value.trim(), contactAddress: $('#sa').value.trim(), policyDate: $('#sd').value.trim() }); msg($('#sm'), 'Saved ✓', 'ok'); } catch (e) { msg($('#sm'), esc(errText(e))); } };
  $('#ks').onclick = async () => {
    const a = $('#k0').value, b = $('#k1').value, c = $('#k2').value, m = $('#km');
    try {
      const s = await getDoc(doc(db, 'settings', 'admin'));
      if (!s.exists() || await sha(a) !== s.data().hash) return msg(m, 'Current code is wrong.');
      if (!/^\d{8}$/.test(b)) return msg(m, 'New code must be 8 digits.');
      if (/^(\d)\1{7}$/.test(b) || b === '12345678' || b === '87654321') return msg(m, 'Too easy to guess.');
      if (b !== c) return msg(m, 'New codes do not match.');
      const h = await sha(b); await setDoc(doc(db, 'settings', 'admin'), { hash: h, setAt: serverTimestamp() }); sessionStorage.setItem(SESS, h.slice(0, 16) + auth.currentUser.uid); msg(m, 'Code changed ✓', 'ok');
    } catch (e) { msg(m, esc(errText(e))); }
  };
}
async function payments() {
  mark('payments');
  top('💳 Payments', dash); loading();
  let L = [];
  try { L = (await getDocs(query(collection(db, 'payments'), orderBy('at', 'desc'), limit(1000)))).docs.map(d => ({ id: d.id, ...d.data() })); }
  catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  const paid = L.filter(x => x.status === 'paid'), live = paid.filter(x => x.mode !== 'test'), d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const m0 = new Date(d0.getFullYear(), d0.getMonth(), 1), sum = a => a.reduce((t, x) => t + (x.amount || 0), 0);
  let F = 'paid';
  const draw = () => {
    const S = F === 'all' ? L : F === 'paid' ? paid : L.filter(x => x.status !== 'paid');
    $('#ptb').innerHTML = S.map(x => `<tr data-u="${esc(x.uid)}" style="cursor:pointer"><td style="white-space:nowrap">${esc(fmtDT(x.paidAt || x.at))}</td><td><b>${esc(x.name || '')}</b><div class="tiny mut">${esc(x.roll || '')}</div></td><td>${esc(x.planName || '')}</td><td><b>₹${x.amount}</b></td>
      <td>${x.status === 'paid' ? '<span class="chip c-free">PAID</span>' : x.status === 'created' ? '<span class="chip c-paid">started</span>' : '<span class="chip">' + esc(x.status) + '</span>'}${x.mode === 'test' ? ' <span class="chip">TEST</span>' : ''}</td>
      <td class="tiny">${esc(x.pid || x.id)}</td><td class="tiny">${esc(x.mobile || '')}<br>${esc(x.email || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="mut">Nothing here.</td></tr>';
    $$('#ptb [data-u]').forEach(r => r.onclick = () => student(r.dataset.u));
  };
  page(`<div class="ast six"><div><b>₹${sum(live.filter(x => ms(x.paidAt) >= d0))}</b><small>Today</small></div><div><b>₹${sum(live.filter(x => ms(x.paidAt) >= m0))}</b><small>This month</small></div><div><b>₹${sum(live)}</b><small>All time (${live.length})</small></div></div>
    ${paid.length > live.length ? `<div class="tiny mut" style="margin-top:4px">+ ${paid.length - live.length} TEST payments (not counted – no real money)</div>` : ''}
    <div class="tagc one" id="pf" style="margin-top:10px"><button type="button" data-f="paid" class="on">✅ Paid</button><button type="button" data-f="other">⏳ Started / not paid</button><button type="button" data-f="all">All</button></div>
    <button class="btn gh sm" type="button" id="pcsv" style="margin:8px 0">⬇ CSV</button>
    <div class="tbl"><table><tr><th>Date</th><th>Student</th><th>Plan</th><th>₹</th><th>Status</th><th>Payment ID</th><th>Contact</th></tr><tbody id="ptb"></tbody></table></div>
    <div class="card small" style="margin-top:10px">Paid but pass not given? The server checks every 5 minutes and gives it automatically. “Started / not paid” = student opened the payment window but did not pay. Money settles to the bank account in Razorpay → Settlements.</div>`);
  draw();
  $$('#pf [data-f]').forEach(b => b.onclick = () => { F = b.dataset.f; $$('#pf [data-f]').forEach(z => z.classList.toggle('on', z === b)); draw(); });
  $('#pcsv').onclick = () => csv('IQFORU_payments.csv', [['Date', 'Name', 'Roll No.', 'Mobile', 'Gmail', 'Plan', 'Days', 'Amount', 'Status', 'Mode', 'Payment ID', 'Order ID', 'Valid till']].concat(L.map(x => [fmtDT(x.paidAt || x.at), x.name || '', x.roll || '', x.mobile || '', x.email || '', x.planName || '', x.days || '', x.amount, x.status, x.mode || '', x.pid || '', x.id, x.until ? fmtJ(x.until) : ''])));
}

Object.assign(VIEWS, { practice: g => practiceAdmin(g), psubj: practiceSubject, pedit: pEdit, team: teamView, notify: notifyView, dash, pick, edit: editMock, tools, preview: previewMock, attempts, results: resultsPage, students, allStudents, student,
  feedbackView, analysisView, reportsView, notice, settings, payments, passes: passesView });
