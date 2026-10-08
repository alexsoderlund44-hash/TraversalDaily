/* Player accounts: optional sign-in that keeps a player's progress in Supabase so it follows them across devices.
   Guests play exactly as before. With no keys in js/account-config.js this file does nothing beyond defining
   window.TraverseAccount, and the Supabase library is only downloaded once keys are set.
   Sync is a merge, never an overwrite: the server keeps the first official result for each day and adds new days
   (see save_progress in supabase/schema.sql), and the browser keeps whatever the server sends back. */
(function () {
  'use strict';
  const T = window.Traverse; if (!T) return;
  const cfg = window.TRAVERSE_ACCOUNT || {};
  const enabled = !!(cfg.url && cfg.key);
  const PROFILE = 'traverse.profile', LINK = 'traverse.account';
  const BASE = document.currentScript ? document.currentScript.src.replace(/js\/account\.js(\?.*)?$/, '') : '';
  const read = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const subs = [];
  const A = window.TraverseAccount = { enabled, user: null, state: enabled ? 'loading' : 'off', error: '', syncedAt: 0, onChange: fn => subs.push(fn) };
  const set = patch => { Object.assign(A, patch); subs.forEach(fn => { try { fn(A); } catch (e) {} }); render(); };

  /* ---------- hooks into the game's own saves (no edits needed in traverse.js) ---------- */
  const origSave = T.save, origSetPlus = T.setPlus;
  let timer = 0;
  const soon = () => { if (!A.user) return; clearTimeout(timer); timer = setTimeout(sync, 800); };
  T.save = s => { origSave(s); soon(); };
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#pf-save')) setTimeout(soon, 0); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); sync(); } });

  let sb = null;
  if (enabled) {
    const s = document.createElement('script');
    s.src = BASE + 'vendor/supabase.min.js';
    s.onload = start;
    s.onerror = () => set({ state: 'error', error: "Couldn't reach the sign-in service. Your progress is still saved in this browser." });
    document.head.appendChild(s);
  }
  render();

  function start() {
    sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    sb.auth.onAuthStateChange((event, session) => {
      const user = session ? session.user : null;
      const was = A.user && A.user.id;
      set({ user, state: user ? 'in' : (A.state === 'sent' ? 'sent' : 'guest') });
      if (user && user.id !== was) setTimeout(() => sync(true), 0); // outside the auth callback, as Supabase recommends
    });
  }

  /* ---------- sync: send this browser's results, keep the merged copy that comes back ---------- */
  let busy = null;
  async function sync(first) {
    if (!sb || !A.user) return;
    if (busy) return busy;
    timer = 0;
    busy = (async () => {
      const uid = A.user.id, link = read(LINK), prof = read(PROFILE), st = T.load(), local = st.results || {};
      const fresh = link.uid !== uid;
      // send the name when it changed here since the last sync, or when this browser is new to the account
      const name = (prof.name || '').trim();
      const sendName = name && (fresh || name !== link.name) ? name : null;
      const { data, error } = await sb.rpc('save_progress', { p_results: local, p_name: sendName });
      if (error) { set({ error: "Couldn't save to your account just now. We'll try again next time you play." }); return; }
      const merged = Object.assign({}, local, data.results || {});
      const changed = JSON.stringify(merged) !== JSON.stringify(local);
      if (changed) { st.results = merged; origSave(st); }
      let nameChanged = false;
      if (data.display_name && data.display_name !== prof.name) { prof.name = data.display_name; write(PROFILE, prof); nameChanged = true; }
      write(LINK, { uid, name: data.display_name || '', at: Date.now() });
      await plusFromAccount();
      set({ error: '', syncedAt: Date.now() });
      // pages draw from localStorage once on load, so redraw them when the account brought something new
      if ((changed || nameChanged) && document.body.dataset.page !== 'play') reloadOnce();
    })();
    try { await busy; } finally { busy = null; }
  }

  /* Traversle + bought on an account follows the account. Only a payment webhook can grant it (see schema.sql). */
  async function plusFromAccount() {
    const { data } = await sb.from('entitlements').select('plus, plus_since').maybeSingle();
    const cur = T.plus();
    if (data && data.plus) { if (!cur.active || cur.source !== 'account') origSetPlus({ active: true, plan: 'life', since: data.plus_since ? Date.parse(data.plus_since) : Date.now(), source: 'account' }); }
    else if (cur.active && cur.source === 'account') origSetPlus({ active: false });
  }

  function reloadOnce() {
    try { if (Date.now() - (+sessionStorage.getItem('traverse.redrawn') || 0) < 15000) return; sessionStorage.setItem('traverse.redrawn', Date.now()); } catch (e) { return; }
    location.reload();
  }

  /* ---------- actions ---------- */
  const back = () => location.origin + location.pathname;
  A.sendLink = async email => {
    set({ error: '' });
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: back() } });
    if (error) return set({ error: /rate|seconds/i.test(error.message) ? 'Too many sign-in emails in a short time. Wait a minute and try again.' : "That didn't work. Check the email address and try again." });
    set({ state: 'sent', email });
  };
  A.google = async () => { const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } }); if (error) set({ error: "Google sign-in isn't working right now. Try the email link instead." }); };
  A.signOut = async () => { await sync(); await sb.auth.signOut(); write(LINK, null); if (T.plus().source === 'account') origSetPlus({ active: false }); set({ user: null, state: 'guest' }); };
  A.deleteAccount = async () => {
    const { error } = await sb.rpc('delete_my_account');
    if (error) return set({ error: "Couldn't delete your account. Try again, or email us and we'll do it by hand." });
    await sb.auth.signOut(); write(LINK, null); if (T.plus().source === 'account') origSetPlus({ active: false });
    set({ user: null, state: 'deleted' });
  };
  A.sync = sync;

  /* ---------- the Account card on the profile page ---------- */
  function render() {
    if (!enabled || document.body.dataset.page !== 'profile') return;
    let card = document.getElementById('pf-account');
    if (!card) {
      const anchor = document.querySelector('.card.profile'); if (!anchor) return;
      injectStyle();
      card = document.createElement('section'); card.className = 'card pf-account'; card.id = 'pf-account';
      anchor.insertAdjacentElement('afterend', card);
      const lede = document.querySelector('.page-head p'); if (lede) lede.textContent = 'Sign in to keep your streak, badges and puzzle history on every device.';
    }
    const esc = T.esc, err = A.error ? `<p class="acc-err" role="alert">${esc(A.error)}</p>` : '';
    const privacy = '<p class="muted">We keep your email address so you can sign in, plus your display name and your puzzle results. Nothing else, and we never share it. You can delete your account here at any time.</p>';
    if (A.state === 'loading') card.innerHTML = '<h2>Account</h2><p class="muted">Checking whether you\'re signed in…</p>';
    else if (A.state === 'in') {
      const when = A.syncedAt ? 'Saved to your account just now.' : 'Saving to your account…';
      card.innerHTML = `<h2>Account</h2><p>Signed in as <b>${esc(A.user.email || 'your Google account')}</b>. ${when}</p>${err}
        <div class="acc-row"><button class="btn ghost" id="acc-out">Sign out</button><button class="btn ghost" id="acc-del">Delete my account</button></div>
        <p class="muted">Signing out keeps a copy of your progress in this browser. Deleting your account erases the saved copy on our side for good.</p>`;
      card.querySelector('#acc-out').onclick = () => A.signOut();
      card.querySelector('#acc-del').onclick = () => { if (confirm('Delete your account? Your saved results, badges and streak will be erased from our servers. This browser keeps its own copy. This cannot be undone.')) A.deleteAccount(); };
    } else if (A.state === 'sent') {
      card.innerHTML = `<h2>Check your email</h2><p>We sent a sign-in link to <b>${esc(A.email)}</b>. Open it on this device and you'll land back here, signed in.</p>${err}
        <div class="acc-row"><button class="btn ghost" id="acc-again">Use a different email</button></div><p class="muted">Nothing there? Check your spam folder. The link works once and expires after an hour.</p>`;
      card.querySelector('#acc-again').onclick = () => set({ state: 'guest', error: '' });
    } else if (A.state === 'error') card.innerHTML = `<h2>Account</h2>${err}`;
    else {
      const done = A.state === 'deleted' ? '<p class="acc-ok" role="status">Your account is deleted. Your progress is still saved in this browser.</p>' : '';
      card.innerHTML = `<h2>Save your progress</h2>${done}<p>Make a free account to keep your streak and badges if you clear your browser or switch to your phone. Everything you've played here comes with you.</p>${err}
        <form class="acc-form" id="acc-form" novalidate><label class="field"><span>Email</span><input id="acc-email" type="email" autocomplete="email" inputmode="email" required placeholder="you@example.com" value="${esc(A.draft || '')}"></label>
        <div class="acc-row"><button class="btn primary" type="submit">Email me a sign-in link</button>${cfg.google ? '<button class="btn ghost" type="button" id="acc-google">Continue with Google</button>' : ''}</div></form>${privacy}`;
      card.querySelector('#acc-form').onsubmit = e => {
        e.preventDefault(); const v = A.draft = card.querySelector('#acc-email').value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return set({ error: 'That email address looks incomplete.' });
        e.submitter && (e.submitter.disabled = true); A.sendLink(v);
      };
      const g = card.querySelector('#acc-google'); if (g) g.onclick = () => A.google();
    }
  }
  function injectStyle() {
    const css = '.pf-account{margin-top:18px}.pf-account p{margin:0 0 12px}.pf-account .muted{margin:12px 0 0}.acc-form{display:grid;gap:12px}' +
      '.acc-row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.acc-err{color:var(--red);font-weight:700}.acc-ok{color:var(--teal);font-weight:700}';
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  }
})();
