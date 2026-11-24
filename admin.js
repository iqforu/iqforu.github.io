// =====================================================================
//  IQ FOR U – Admin Panel (loaded only when "Admin login" is opened)
//  Upload this file to GitHub next to index.html. Do not rename it.
// =====================================================================
import { GoogleAuthProvider, signInWithPopup, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, writeBatch,
         serverTimestamp, Timestamp, getCountFromServer }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let C, db, auth, $, $$, esc, ms, fmtDT, fmtD, r2, toast;
let EX = [];
// ---- phone Back button: every admin screen gets its own history step
let POP = false, REPL = false;
const VIEWS = {};
function mark(name, args) {
  if (POP) return;
  const st = { adm: name, args: args || [] };
  try { if (REPL || !(history.state && history.state.adm)) history.replaceState(st, '', '#/admin'); else history.pushState(st, '', '#/admin'); } catch (e) {}
  REPL = false;
}
const replace = f => { REPL = true; f(); };
window.addEventListener('popstate', e => {
  if (!C || !e.state || !e.state.adm || !location.hash.startsWith('#/admin')) return;
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
  .sw input{width:22px;height:22px}`;
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
    try { const s = await getDoc(doc(db, 'settings', 'admin')); allowed = true; adminDoc = s.exists() ? s.data() : null; }
    catch (e) { allowed = false; }
  }
  if (!allowed) {
    loginShell(`<div class="tiny mut" style="font-weight:800">STEP 1 · ADMIN GMAIL</div>
      <button class="gbtn" id="g" type="button" style="margin-top:6px"><b>G</b> Continue with Google</button>
      ${u ? `<div class="msg err">${esc(u.email || 'This account')} is ${isGoogle ? 'not an admin Gmail' : 'a student login'}. Tap the button above and choose the <b>admin Gmail</b>.</div>` : ''}
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
      try { const h = await sha(a); await setDoc(doc(db, 'settings', 'admin'), { hash: h, setAt: serverTimestamp() }); sessionStorage.setItem(SESS, h.slice(0, 16) + u.uid); toast('Security code saved ✓', 'ok'); dash(); }
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
async function dash() {
  mark('dash');
  top('Admin Panel', null, '<button class="btn gh sm" id="sv" type="button" style="box-shadow:none">Student view</button><button class="btn gh sm" id="lo" type="button" style="box-shadow:none">Logout</button>');
  $('#sv').onclick = () => C.go('home'); $('#lo').onclick = logout;
  loading('Loading mocks…');
  try { await loadEx(); } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  const live = EX.filter(x => x.published && Date.now() >= ms(x.startAt) && Date.now() <= ms(x.endAt));
  const latest = EX.find(x => Date.now() >= ms(x.startAt));
  page(`<div class="ast" id="ast"><div><b>…</b><small>Students</small></div><div><b>${live.length}</b><small>Live mocks</small></div><div><b>…</b><small>Attempts${latest ? ' (latest)' : ''}</small></div></div>
    <div class="at">
      <button class="tl" type="button" data-a="new"><span>＋</span>New Mock</button>
      <button class="tl" type="button" data-a="students"><span>👥</span>Students</button>
      <button class="tl" type="button" data-a="feedback"><span>💬</span>Feedback</button>
      <button class="tl" type="button" data-a="analysis"><span>📊</span>Analysis</button>
      <button class="tl" type="button" data-a="reports"><span>🚩</span>Reports</button>
      <button class="tl" type="button" data-a="notice"><span>📢</span>Notice</button>
      <button class="tl" type="button" data-a="payments"><span>💳</span>Payments<em>STEP 3</em></button>
      <button class="tl" type="button" data-a="settings"><span>⚙️</span>Settings</button>
    </div>
    <div class="sec">My mocks (${EX.length})</div>
    ${EX.map(x => `<div class="xc"><div style="display:flex;gap:5px;flex-wrap:wrap">${stChip(x)}<span class="chip c-cat">${esc(x.category || 'Other')}</span>${(x.price || 0) > 0 ? `<span class="chip c-paid">₹${esc(x.price)}</span>` : '<span class="chip c-free">FREE</span>'}</div>
      <h3>${esc(x.title)}</h3><div class="meta"><span>🗓 ${esc(fmtDT(x.startAt))} → ${esc(fmtDT(x.endAt))}</span><span>${x.count} Q · ${x.duration} min · −${x.neg}</span><span>📅 Result: ${x.resultAt ? esc(fmtDT(x.resultAt)) : 'not set'}</span></div>
      <div class="acts"><button class="btn sm" type="button" data-res="${esc(x.id)}">🧮 Calculate &amp; Publish</button><button class="btn gh sm" type="button" data-res="${esc(x.id)}">🏆 Merit list · CSV</button>
        <button class="btn gh sm" type="button" data-edit="${esc(x.id)}">✏️ Edit</button><button class="btn gh sm" type="button" data-tools="${esc(x.id)}">🧰 Tools · Attempts</button></div></div>`).join('') || '<div class="card mut">No mocks yet. Tap <b>＋ New Mock</b>.</div>'}`);
  $$('[data-a]').forEach(b => b.onclick = () => ({ new: () => editMock(null), students, feedback: () => pick('feedback'), analysis: () => pick('analysis'),
    reports: () => pick('reports'), notice, payments, settings })[b.dataset.a]());
  $$('[data-res]').forEach(b => b.onclick = () => resultsPage(b.dataset.res));
  $$('[data-edit]').forEach(b => b.onclick = () => editMock(b.dataset.edit));
  $$('[data-tools]').forEach(b => b.onclick = () => tools(b.dataset.tools));
  try {
    const [u, a] = await Promise.all([getCountFromServer(collection(db, 'users')), latest ? getCountFromServer(collection(db, 'attempts', latest.id, 'u')) : null]);
    if ($('#ast')) { const d = $('#ast').children; d[0].innerHTML = `<b>${u.data().count.toLocaleString('en-IN')}</b><small>Students</small>`; d[2].innerHTML = `<b>${a ? a.data().count : 0}</b><small>Attempts${latest ? ' · ' + esc(latest.title.slice(0, 18)) : ''}</small>`; }
  } catch (e) {}
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
    if (i === 0 && /section/i.test(c[0]) && /answer/i.test(c[c.length - 1] || '')) return;
    if (c.length < 8) { errs.push(`Row ${i + 1}: needs 8 columns (Section, Topic, Question, A, B, C, D, Answer) – found ${c.length}`); return; }
    let ans = c[7].toUpperCase().replace(/[^A-D1-4]/g, '');
    if (/^[1-4]$/.test(ans)) ans = 'ABCD'[+ans - 1];
    if (!/^[A-D]$/.test(ans)) { errs.push(`Row ${i + 1}: Answer must be A, B, C or D – found "${c[7]}"`); return; }
    if (!c[2]) { errs.push(`Row ${i + 1}: Question is empty`); return; }
    if (c.slice(3, 7).some(o => o === '')) { errs.push(`Row ${i + 1}: an option is empty`); return; }
    out.push({ sec: c[0] || 'General', topic: c[1], q: c[2], o: c.slice(3, 7), ans });
  });
  return { qs: out, errs };
}
function toTSV(qs, key) {
  const cell = v => { v = String(v ?? ''); return /[\t\n"]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return ['Section\tTopic\tQuestion\tA\tB\tC\tD\tAnswer'].concat(qs.map(q => [q.sec, q.topic, q.q, ...q.o, key[q.id] || ''].map(cell).join('\t'))).join('\n');
}
const toLocal = t => { const d = new Date(ms(t)); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

// ------------------------------------------------------------------ create / edit mock
async function editMock(id, copy) {
  mark('edit', [id, copy || null]);
  const x = id ? EX.find(e => e.id === id) : (copy || null);
  top(id ? 'Edit Mock' : 'New Mock', id ? () => tools(id) : dash);
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
    <label class="l" for="ca">Exam category</label><select class="inp" id="ca">${C.CATS.map(c => `<option ${(x ? x.category || 'Other' : C.CATS[0]) === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
    <div class="g2"><div><label class="l" for="sa">Opens</label><input class="inp" id="sa" type="datetime-local" value="${toLocal(sA)}"></div><div><label class="l" for="ea">Closes</label><input class="inp" id="ea" type="datetime-local" value="${toLocal(eA)}"></div></div>
    <div class="g3"><div><label class="l" for="du">Minutes</label><input class="inp" id="du" type="number" min="5" max="300" value="${x ? x.duration : 60}"></div><div><label class="l" for="mk">+ Mark</label><input class="inp" id="mk" type="number" step="0.25" min="0.25" value="${x ? x.mark : 1}"></div><div><label class="l" for="ng">− Neg</label><input class="inp" id="ng" type="number" step="0.05" min="0" value="${x ? x.neg : 0.25}"></div></div>
    <div class="g2"><div><label class="l" for="ra">Result date &amp; time</label><input class="inp" id="ra" type="datetime-local" value="${toLocal(rA)}" style="background:var(--y2)"></div><div><label class="l" for="pr">Price ₹ (0 = Free)</label><input class="inp" id="pr" type="number" min="0" max="5000" step="1" value="${x ? x.price || 0 : 0}"></div></div>
    <div class="tiny mut" style="margin-top:4px">Students can start any time between Opens and Closes; each gets the full minutes but the test always ends at Closes. Paid price works after Razorpay (Step 3) – keep 0 till then.</div>
    ${id ? `<label class="l" for="cx">Cancel questions (bonus +mark to everyone) – question numbers</label><input class="inp" id="cx" placeholder="Example: 23, 47" value="${esc(cancelled.map(q => q.replace('q', '')).join(', '))}">` : ''}
    <label class="l" for="qs">Questions – copy from Excel &amp; paste (8 columns: Section | Topic | Question | A | B | C | D | Answer)</label>
    <textarea class="inp tsv" id="qs" spellcheck="false" placeholder="Maths\tRatio\tThe ratio of ...\t10\t20\t30\t40\tB">${esc(tsv)}</textarea><div id="pv"></div>
    <label class="sw"><input type="checkbox" id="pb" ${x && x.published && !copy ? 'checked' : ''}> Published (students can see it)</label>
    <button class="btn dk block" id="sv" type="button" style="margin-top:14px">💾 Save Mock</button><div id="sm"></div></div>`);
  const preview = () => {
    const { qs, errs } = toQuestions($('#qs').value), secs = {}, ans = { A: 0, B: 0, C: 0, D: 0 };
    qs.forEach(q => { secs[q.sec] = (secs[q.sec] || 0) + 1; ans[q.ans]++; });
    $('#pv').innerHTML = `<div class="msg ${errs.length ? 'err' : (qs.length ? 'ok' : 'info')}">${qs.length ? '✓ ' : ''}<b>${qs.length}</b> questions detected · ${Object.keys(secs).map(k => `${esc(k)} ${secs[k]}`).join(' · ') || '—'} · Answers A${ans.A} B${ans.B} C${ans.C} D${ans.D}
      ${errs.length ? '<br>' + errs.slice(0, 8).map(esc).join('<br>') + (errs.length > 8 ? `<br>… ${errs.length - 8} more` : '') : ''}</div>`;
    return { qs, errs };
  };
  $('#qs').oninput = preview; preview();
  // show every date in Indian format below the box (the box itself follows the computer's language setting)
  const IN = v => { const d = new Date(v); return isNaN(d) ? '' : '🇮🇳 ' + d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }); };
  ['#sa', '#ea', '#ra'].forEach(id => { const el = $(id), h = document.createElement('div'); h.className = 'tiny'; h.style.cssText = 'margin-top:4px;font-weight:700;color:var(--ink2)';
    el.after(h); const f = () => { h.textContent = IN(el.value); }; el.addEventListener('input', f); el.addEventListener('change', f); f(); });
  $('#sv').onclick = async () => {
    const { qs, errs } = preview(), m = $('#sm');
    const title = $('#ti').value.trim(), sa = new Date($('#sa').value), ea = new Date($('#ea').value), ra = new Date($('#ra').value);
    const duration = parseInt($('#du').value, 10), mark = Number($('#mk').value), neg = Number($('#ng').value), price = Math.max(0, Math.round(Number($('#pr').value) || 0));
    if (!title) return msg(m, 'Enter a title.');
    if (isNaN(sa) || isNaN(ea) || ea <= sa) return msg(m, 'Closes must be after Opens.');
    if (isNaN(ra)) return msg(m, 'Set the result date & time.');
    if (ra < ea && !confirm('Result time is BEFORE the test closes. Students who write late will see answers early. Save anyway?')) return;
    if (!(duration >= 5)) return msg(m, 'Minutes must be at least 5.');
    if (!(mark > 0) || neg < 0) return msg(m, 'Check + Mark and − Neg.');
    if (!qs.length || errs.length) return msg(m, 'Fix the questions first (see the red box).');
    if (price > 0 && !confirm('Price is more than 0. Online payment comes in Step 3 – until then students cannot unlock this mock (you can unlock manually). Continue?')) return;
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
        duration, mark, neg, price, count: qs.length, total: r2(qs.length * mark), sections: secs, secs: secs.map(s => ({ name: s, count: cnt[s] })), cancelled: [...new Set(can)],
        published: $('#pb').checked, resultsOut: id ? !!x.resultsOut : false, resultsHold: id ? !!x.resultsHold : false, calcAt: id && x.calcAt ? x.calcAt : null, updatedAt: serverTimestamp() });
      b.set(doc(db, 'exams', eid, 'paper', 'main'), { questions: paper });
      b.set(doc(db, 'keys', eid), { ans: key });
      await b.commit();
      msg(m, 'Saved ✓' + (id && x.calcAt ? ' Answer key / cancelled questions changed? Go to Results → Re-calculate.' : ''), 'ok');
      await loadEx(); setTimeout(() => { if (id && history.state && history.state.adm === 'edit') history.back(); else replace(() => tools(eid)); }, 700);
    } catch (e) { $('#sv').disabled = false; msg(m, esc(errText(e))); }
  };
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
    pub: async () => { try { await updateDoc(doc(db, 'exams', id), { published: !x.published }); x.published = !x.published; toast(x.published ? 'Published ✓' : 'Hidden ✓', 'ok'); replace(() => tools(id)); } catch (e) { toast(errText(e), 'err'); } },
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
  const x = EX.find(e => e.id === id);
  top('Attempts', () => tools(id)); loading();
  let A = [];
  try { const s = await getDocs(collection(db, 'attempts', id, 'u')); A = s.docs.map(d => ({ uid: d.id, ...d.data() })); }
  catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  A.sort((a, b) => ms(a.startedAt) - ms(b.startedAt));
  const sub = A.filter(a => a.submitted).length;
  page(`<div class="ast"><div><b>${A.length}</b><small>Started</small></div><div><b>${sub}</b><small>Submitted</small></div><div><b>${A.length - sub}</b><small>Writing / not submitted</small></div></div>
    <p class="small mut">${esc(x.title)} · <b>Reset</b> deletes a student's attempt so they can write again (use only for genuine problems like power cut / net issue). <button class="link small" id="rf" type="button">↻ Refresh</button></p>
    <div class="tbl"><table><tr><th>#</th><th>Name</th><th>State</th><th>Started</th><th>Status</th><th class="n">Answered</th><th></th></tr>
    ${A.map((a, i) => `<tr><td>${i + 1}</td><td><b>${esc(a.name)}</b></td><td>${esc(a.state || '')}</td><td>${esc(fmtDT(a.startedAt))}</td><td>${a.submitted ? '<span class="chip c-free">Submitted</span>' : '<span class="chip c-paid">Not submitted</span>'}</td><td class="n">${Object.keys(a.answers || {}).length}</td><td><button class="btn red sm" type="button" data-r="${esc(a.uid)}">Reset</button></td></tr>`).join('') || '<tr><td colspan="7" class="mut">No attempts yet.</td></tr>'}</table></div>`);
  $('#rf').onclick = () => replace(() => attempts(id));
  $$('[data-r]').forEach(b => b.onclick = async () => {
    const a = A.find(z => z.uid === b.dataset.r);
    if (!await C.confirmBox(`<h3 style="margin:0 0 6px">Reset ${esc(a.name)}?</h3><p class="small">Their answers for this mock will be deleted and they can start again.</p>`, 'Reset')) return;
    try { await resetAttempt(id, a.uid); toast('Reset ✓', 'ok'); replace(() => attempts(id)); } catch (e) { toast(errText(e), 'err'); }
  });
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
        ${R ? `<button class="btn ${x.resultsHold ? 'dk' : 'red'}" id="hd" type="button">${x.resultsHold ? '📢 Un-hide results' : '🙈 Hide results'}</button><button class="btn gh" id="csv" type="button">⬇ Download Excel (CSV)</button>` : ''}
      </div><div id="rm"></div>
      <div class="tiny mut" style="margin-top:8px">Fixed an answer key or cancelled a question? Just calculate again – ranks update.</div></div>
    ${R ? `<p class="small mut">Calculated ${esc(fmtDT(R.calcAt))} · Participants <b>${R.n}</b> · Highest ${R.high} · Average ${R.avg}</p>
      <div class="tbl"><table><tr><th>Rank</th><th>Name</th><th>State</th><th>Mobile</th><th>Gmail</th>${(R.sections || []).map(s => `<th class="n">${esc(s)}</th>`).join('')}<th class="n">Score</th><th class="n">Acc.</th><th class="n">✓</th><th class="n">✗</th><th class="n">Min</th></tr>
      ${(R.all || []).map(t => `<tr><td>${t.rank}</td><td><b>${esc(t.name)}</b>${t.submitted ? '' : ' <span class="chip c-paid">auto</span>'}</td><td>${esc(t.state || '')}</td><td>${esc(t.mobile || '')}</td><td>${esc(t.email || '')}</td>
        ${(R.sections || []).map(s => `<td class="n">${t.secs && t.secs[s] ? t.secs[s].score : '–'}</td>`).join('')}<td class="n"><b>${t.score}</b></td><td class="n">${t.acc}%</td><td class="n">${t.cor}</td><td class="n">${t.wrong}</td><td class="n">${t.mins}</td></tr>`).join('')}</table></div>` : '<p class="mut">Not calculated yet.</p>'}`);
  $('#cp').onclick = () => calculate(x, true);
  $('#co').onclick = () => calculate(x, false);
  if ($('#hd')) $('#hd').onclick = async () => { try { const h = !x.resultsHold; await updateDoc(doc(db, 'exams', id), h ? { resultsHold: true, resultsOut: false } : { resultsHold: false }); x.resultsHold = h; if (h) x.resultsOut = false; replace(() => resultsPage(id)); } catch (e) { toast(errText(e), 'err'); } };
  if ($('#csv')) $('#csv').onclick = () => {
    const secs = R.sections || [];
    csv((x.title.replace(/[^\w]+/g, '_') || 'results') + '.csv', [['Rank', 'Name', 'State', 'Mobile', 'Gmail', ...secs, 'Score', 'Accuracy %', 'Correct', 'Wrong', 'Not answered', 'Minutes', 'Submitted']]
      .concat((R.all || []).map(t => [t.rank, t.name, t.state || '', t.mobile || '', t.email || '', ...secs.map(s => t.secs && t.secs[s] ? t.secs[s].score : ''), t.score, t.acc, t.cor, t.wrong, t.skip, t.mins, t.submitted ? 'Yes' : 'Auto'])));
  };
}
function csv(name, lines) {
  const s = '﻿' + lines.map(r => r.map(v => { v = String(v ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv' })); a.download = name; a.click();
}
async function calculate(x, publish) {
  const m = $('#rm'); msg(m, 'Calculating… please wait, do not close this page.', 'info'); $$('#cp,#co').forEach(b => b.disabled = true);
  try {
    const [ks, ps, as, ex] = await Promise.all([getDoc(doc(db, 'keys', x.id)), getDoc(doc(db, 'exams', x.id, 'paper', 'main')), getDocs(collection(db, 'attempts', x.id, 'u')), getDoc(doc(db, 'exams', x.id))]);
    const X2 = ex.data(), key = ks.data().ans, qs = ps.data().questions, can = X2.cancelled || [], mark = X2.mark, neg = X2.neg;
    // profiles (mobile, Gmail) only for students who attempted
    const prof = {}, uids = as.docs.map(d => d.id);
    for (let i = 0; i < uids.length; i += 50) await Promise.all(uids.slice(i, i + 50).map(async u => { try { const s = await getDoc(doc(db, 'users', u)); prof[u] = s.exists() ? s.data() : {}; } catch (e) { prof[u] = {}; } }));
    const secs = []; qs.forEach(q => { if (!secs.includes(q.sec)) secs.push(q.sec); });
    const QS = {}; qs.forEach(q => QS[q.id] = { A: 0, B: 0, C: 0, D: 0, s: 0, c: 0 });
    const rows = as.docs.map(d => {
      const a = d.data(), ans = a.answers || {}; let cor = 0, wrong = 0, bonus = 0; const S = {};
      secs.forEach(s => S[s] = { c: 0, w: 0, n: 0, b: 0 });
      qs.forEach(q => {
        const s = S[q.sec], u = ans[q.id]; s.n++;
        if (u) QS[q.id][u] = (QS[q.id][u] || 0) + 1; else QS[q.id].s++;
        if (u && u === key[q.id]) QS[q.id].c++;
        if (can.includes(q.id)) { bonus += mark; s.b += mark; return; }
        if (!u) return; if (u === key[q.id]) { cor++; s.c++; } else { wrong++; s.w++; }
      });
      const SS = {}; secs.forEach(k => { const s = S[k]; SS[k] = { c: s.c, w: s.w, score: r2(s.c * mark - s.w * neg + s.b), total: r2(s.n * mark) }; });
      const end = a.submittedAt ? ms(a.submittedAt) : Math.min(ms(a.savedAt), ms(a.startedAt) + X2.duration * 60000);
      const p = prof[d.id] || {}, att = cor + wrong;
      return { uid: d.id, name: a.name, state: a.state || '', email: p.email || '', mobile: p.mobile || '', submitted: !!a.submitted,
        cor, wrong, skip: qs.length - can.length - att, bonus: r2(bonus), score: r2(cor * mark - wrong * neg + bonus), acc: att ? Math.round(cor / att * 1000) / 10 : 0,
        secs: SS, answers: ans, mins: Math.max(0, Math.round((end - ms(a.startedAt)) / 60000)) };
    }).sort((a, b) => b.score - a.score || b.acc - a.acc);
    rows.forEach((r, i) => r.rank = i > 0 && r.score === rows[i - 1].score && r.acc === rows[i - 1].acc ? rows[i - 1].rank : i + 1);
    const n = rows.length, high = n ? rows[0].score : 0, avg = n ? r2(rows.reduce((s, r) => s + r.score, 0) / n) : 0;
    for (let i = 0; i < rows.length; i += 400) {
      const b = writeBatch(db);
      rows.slice(i, i + 400).forEach(r => b.set(doc(db, 'myresults', x.id, 'u', r.uid),
        { rank: r.rank, n, score: r.score, cor: r.cor, wrong: r.wrong, skip: r.skip, bonus: r.bonus, acc: r.acc, secs: r.secs, answers: r.answers, mins: r.mins }));
      await b.commit();
      msg(m, `Calculating… ${Math.min(i + 400, rows.length)} / ${rows.length} students saved`, 'info');
    }
    await setDoc(doc(db, 'results', x.id), { title: X2.title, total: X2.total, n, high, avg, sections: secs, key, cancelled: can, calcAt: serverTimestamp(),
      merit: rows.slice(0, 6000).map(r => ({ r: r.rank, n: r.name, st: r.state, s: r.score, a: r.acc })) });
    await setDoc(doc(db, 'adminresults', x.id), { title: X2.title, total: X2.total, n, high, avg, sections: secs, calcAt: serverTimestamp(),
      qstats: qs.map(q => Object.assign({ id: q.id }, QS[q.id])),
      all: rows.map(r => ({ rank: r.rank, name: r.name, state: r.state, email: r.email, mobile: r.mobile, score: r.score, acc: r.acc, cor: r.cor, wrong: r.wrong, skip: r.skip, mins: r.mins, submitted: r.submitted,
        secs: Object.fromEntries(secs.map(s => [s, { score: r.secs[s].score }])) })) });
    await updateDoc(doc(db, 'exams', x.id), publish ? { calcAt: serverTimestamp(), resultsOut: true, resultsHold: false } : { calcAt: serverTimestamp() });
    msg(m, `Done ✓ ${n} students. ${publish ? 'Results are now visible to students.' : 'Results will open automatically at the result time.'}`, 'ok');
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
    out.innerHTML = docs.length ? docs.slice(0, 50).map(d => { const u = d.data(); return `<button class="xc" type="button" data-u="${esc(d.id)}" style="width:100%;text-align:left;display:flex;gap:10px;align-items:center"><div style="width:36px;height:36px;border-radius:50%;background:var(--y);border:1.5px solid var(--ink);display:grid;place-items:center;font-weight:900;flex:none">${esc((u.name || '?')[0].toUpperCase())}</div><div style="min-width:0"><b>${esc(u.name)}</b><div class="tiny mut">${esc(u.state)} · ${esc(u.mobile)} · ${esc(u.email)}</div></div></button>`; }).join('') : '<div class="card mut center">No student found.</div>';
    $$('[data-u]').forEach(b => b.onclick = () => student(b.dataset.u));
  };
  $('#go').onclick = run; $('#q').onkeydown = e => { if (e.key === 'Enter') run(); };
  let N = 0;
  getCountFromServer(collection(db, 'users')).then(c => { N = c.data().count; if ($('#cnt')) $('#cnt').textContent = `${N.toLocaleString('en-IN')} students · opens full list with Excel & Print (uses ${N.toLocaleString('en-IN')} reads of your free 50,000/day)`; }).catch(() => {});
  $('#all').onclick = allStudents;
}
async function allStudents() {
  mark('allStudents');
  top('All students', students); loading('Loading all students…');
  let L = [];
  try { L = (await getDocs(collection(db, 'users'))).docs.map(d => ({ uid: d.id, ...d.data() })); }
  catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  L.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  let F = L, st = 'All';
  const states = ['All', ...[...new Set(L.map(u => u.state || '—'))].sort()];
  const dt = u => u.updatedAt ? fmtD(u.updatedAt) : '';
  const draw = () => {
    const q = ($('#fq') ? $('#fq').value : '').trim().toLowerCase();
    F = L.filter(u => (st === 'All' || (u.state || '—') === st) && (!q || [u.name, u.mobile, u.email, u.state].some(v => String(v || '').toLowerCase().includes(q))));
    $('#tb').innerHTML = F.map((u, i) => `<tr data-u="${esc(u.uid)}" style="cursor:pointer"><td>${i + 1}</td><td><b>${esc(u.name || '')}</b></td><td>${esc(u.state || u.district || '')}</td><td>${esc(u.mobile || '')}</td><td>${esc(u.email || '')}</td><td>${esc(dt(u))}</td></tr>`).join('') || '<tr><td colspan="6" class="mut">No students.</td></tr>';
    $('#fc').textContent = `${F.length} of ${L.length} students`;
    $$('[data-u]').forEach(r => r.onclick = () => student(r.dataset.u));
  };
  page(`<div class="card"><div class="g2"><input class="inp" id="fq" placeholder="🔍 Filter by any part of name / mobile / Gmail"><select class="inp" id="fs">${states.map(s => `<option>${esc(s)}</option>`).join('')}</select></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><b id="fc" class="small" style="flex:1"></b>
      <button class="btn gh sm" id="xl" type="button">⬇ Excel (CSV)</button><button class="btn dk sm" id="pr" type="button">🖨 Print / PDF</button></div>
      <div class="tiny mut" style="margin-top:6px">🔒 This list has mobile numbers &amp; Gmails – keep the Excel / PDF private. Tap a student to Reset / Block.</div></div>
    <div class="tbl"><table><tr><th>#</th><th>Name</th><th>State</th><th>Mobile</th><th>Gmail</th><th>Updated</th></tr><tbody id="tb"></tbody></table></div>`);
  $('#fq').oninput = draw; $('#fs').onchange = e => { st = e.target.value; draw(); };
  draw();
  $('#xl').onclick = () => csv('IQFORU_students.csv', [['#', 'Name', 'State', 'Mobile', 'Gmail', 'Updated']].concat(F.map((u, i) => [i + 1, u.name || '', u.state || u.district || '', u.mobile || '', u.email || '', dt(u)])));
  $('#pr').onclick = () => {
    const P = document.getElementById('print');
    P.innerHTML = `<div class="ph"><img src="logo.png" alt=""><div><div style="font-weight:900;font-size:18px">IQ FOR U</div><div style="color:#666">Registered students${st !== 'All' ? ' · ' + esc(st) : ''}</div></div><div class="tag">${F.length} STUDENTS</div></div>
      <table class="qt2" style="margin-top:10px"><tr><th style="width:30px">#</th><th>Name</th><th>State</th><th>Mobile</th><th>Gmail</th><th>Updated</th></tr>
      ${F.map((u, i) => `<tr><td>${i + 1}</td><td>${esc(u.name || '')}</td><td>${esc(u.state || u.district || '')}</td><td>${esc(u.mobile || '')}</td><td>${esc(u.email || '')}</td><td>${esc(dt(u))}</td></tr>`).join('')}</table>
      <div class="ft"><span>Private – admin only</span><span>Printed ${esc(new Date().toLocaleString('en-IN'))}</span></div>`;
    window.onafterprint = () => document.body.classList.remove('printing');
    const img = P.querySelector('img'), go = () => { document.body.classList.add('printing'); setTimeout(() => window.print(), 50); };
    if (img.complete) go(); else { img.onload = go; img.onerror = go; }
  };
}
async function student(uid) {
  mark('student', [uid]);
  top('Student', students); loading();
  if (!EX.length) { try { await loadEx(); } catch (e) {} }
  let u, blocked = false; const rows = [];
  try {
    const s = await getDoc(doc(db, 'users', uid)); u = s.exists() ? s.data() : {};
    blocked = (await getDoc(doc(db, 'blocked', uid))).exists();
    await Promise.all(EX.filter(x => Date.now() >= ms(x.startAt)).map(async x => {
      const a = await getDoc(doc(db, 'attempts', x.id, 'u', uid)); if (!a.exists()) return;
      const r = await getDoc(doc(db, 'myresults', x.id, 'u', uid));
      rows.push({ x, a: a.data(), r: r.exists() ? r.data() : null });
    }));
  } catch (e) { page(`<div class="msg err">${esc(errText(e))}</div>`); return; }
  rows.sort((p, q) => ms(q.x.startAt) - ms(p.x.startAt));
  page(`<div class="card"><div style="display:flex;gap:10px;align-items:center"><div style="width:44px;height:44px;border-radius:50%;background:var(--y);border:1.5px solid var(--ink);display:grid;place-items:center;font-weight:900;font-size:18px">${esc((u.name || '?')[0].toUpperCase())}</div>
      <div><b style="font-size:16px">${esc(u.name)}</b><div class="tiny mut">${esc(u.state)}${u.updatedAt ? ' · updated ' + esc(fmtD(u.updatedAt)) : ''}</div></div>${blocked ? '<span class="chip c-live" style="margin-left:auto">BLOCKED</span>' : '<span class="chip c-free" style="margin-left:auto">Active</span>'}</div>
      <div class="small" style="margin-top:10px;line-height:1.7">📱 ${esc(u.mobile || '')}<br>✉ ${esc(u.email || '')}</div></div>
    <div class="tbl"><table><tr><th>Mock</th><th>Status</th><th class="n">Score</th><th class="n">Rank</th><th></th></tr>
      ${rows.map(o => `<tr><td>${esc(o.x.title)}</td><td>${o.a.submitted ? 'Submitted' : 'Not submitted'}</td><td class="n">${o.r ? o.r.score : '–'}</td><td class="n">${o.r ? '#' + o.r.rank : '–'}</td><td><button class="btn red sm" type="button" data-rs="${esc(o.x.id)}">Reset</button></td></tr>`).join('') || '<tr><td colspan="5" class="mut">No attempts.</td></tr>'}</table></div>
    <button class="btn ${blocked ? 'dk' : 'red'} block" id="bl" type="button" style="margin-top:12px">${blocked ? '✅ Unblock student' : '⛔ Block student'}</button>`);
  $$('[data-rs]').forEach(b => b.onclick = async () => { if (!await C.confirmBox('<h3 style="margin:0">Reset this attempt?</h3><p class="small">The student can write this mock again.</p>', 'Reset')) return; try { await resetAttempt(b.dataset.rs, uid); toast('Reset ✓', 'ok'); replace(() => student(uid)); } catch (e) { toast(errText(e), 'err'); } });
  $('#bl').onclick = async () => {
    try { if (blocked) await deleteDoc(doc(db, 'blocked', uid)); else { if (!await C.confirmBox(`<h3 style="margin:0">Block ${esc(u.name)}?</h3><p class="small">They cannot start any new test.</p>`, 'Block')) return; await setDoc(doc(db, 'blocked', uid), { at: serverTimestamp(), name: u.name || '' }); }
      toast(blocked ? 'Unblocked ✓' : 'Blocked ✓', 'ok'); replace(() => student(uid)); } catch (e) { toast(errText(e), 'err'); }
  };
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
    <div class="card"><div style="font-weight:800">🔐 Change 8-digit security code</div>
      <label class="l" for="k0">Current code</label><input class="inp code" id="k0" type="password" inputmode="numeric" maxlength="8">
      <label class="l" for="k1">New code</label><input class="inp code" id="k1" type="password" inputmode="numeric" maxlength="8">
      <label class="l" for="k2">Re-enter new code</label><input class="inp code" id="k2" type="password" inputmode="numeric" maxlength="8">
      <button class="btn block" id="ks" type="button" style="margin-top:12px">Change code</button><div id="km"></div></div>`);
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
function payments() {
  mark('payments');
  top('Payments', dash);
  page(`<div class="card center"><div style="font-size:40px">💳</div><div style="font-weight:900;font-size:18px">Payments – coming in Step 3</div>
    <p class="small mut">After Razorpay is connected, every payment will show here: name, mobile, Gmail, mock, amount, Razorpay payment ID, unlock status, today / month totals, “Need check” list with Verify and Manual unlock, and Excel download.</p></div>`);
}

Object.assign(VIEWS, { dash, pick, edit: editMock, tools, preview: previewMock, attempts, results: resultsPage, students, allStudents, student,
  feedbackView, analysisView, reportsView, notice, settings, payments });
