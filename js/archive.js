/* Archive: a month calendar with a tile per day, colored by how you did, and a panel for the picked day.
   Days after today are empty dates and never link anywhere. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const root = $('#ar-cal'); if (!root) return;
  const R = (T.load().results) || {}, today = T.dayNumber(), plus = T.plus().active;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first
  const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const LOCK = '<svg class="ar-lock" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor"/><path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
  const dayOfKey = k => Math.round((Date.parse(k) - T.EPOCH) / 86400000) + 1;
  const fmt = (n, o) => new Date(T.dayKey(n)).toLocaleDateString('en-US', Object.assign({ month: 'short', day: 'numeric', timeZone: 'UTC' }, o || {}));
  const lv = d => `<span class="ar-lv ${d ? d.toLowerCase() : ''}" aria-hidden="true"><i></i><i></i><i></i></span>`;
  const themeOf = n => { const c = T.challenge(n), rh = T.rhythmOf(n); return rh.twist.id === c.twistId ? rh.name : c.twist.name; };

  /* difficulty and decisions per day: worked out in a worker, kept in localStorage against the day's schedule entry */
  const META_KEY = 'traverse.archmeta', S = window.TRAVERSE_SCHEDULE || { days: {} };
  const sig = n => JSON.stringify(S.days[n] || n) + '|' + Object.keys(T.byId).length;
  let meta = {}; try { meta = JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) {}
  const metaOf = n => { const m = meta[n]; return m && m.s === sig(n) ? m : null; };
  const putMeta = (n, m) => { if (!m) return; meta[n] = Object.assign({ s: sig(n) }, m); try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} };
  { const M = T.mission(T.challenge(today)); meta[today] = { s: sig(today), d: M.difficulty, k: T.decisionsFor(M), w: M.ways.length }; } // today is worked out fresh, like the home page does
  let worker = null;
  try { worker = new Worker(document.querySelector('script[src*="js/archive.js"]').src.replace(/archive\.js.*$/, 'archive-worker.js')); worker.onmessage = e => { putMeta(e.data.n, e.data.m); paintMeta(e.data.n); }; worker.onerror = () => { worker = null; asked.forEach(n => { if (!metaOf(n)) queue.push(n); }); idle(); }; } catch (e) { worker = null; }
  const queue = [], asked = new Set();
  function need(ns) {
    ns = ns.filter(n => !metaOf(n) && !asked.has(n)); if (!ns.length) return;
    ns.forEach(n => asked.add(n));
    if (worker) worker.postMessage(ns); else { queue.push(...ns); idle(); }
  }
  function idle() { // no worker (opened from disk, or blocked): one day per idle slot on the main thread
    const go = () => { const n = queue.shift(); if (n === undefined) return; const M = T.mission(T.challenge(n)); putMeta(n, { d: M.difficulty, k: T.decisionsFor(M), w: M.ways.length }); paintMeta(n); if (queue.length) idle(); };
    (window.requestIdleCallback || (f => setTimeout(f, 30)))(go);
  }

  const status = n => { const r = R[T.dayKey(n)]; if (n > today) return 'fut'; if (r) return r.failed ? 'failed' : r.tier === 'Perfect' ? 'perfect' : 'solved'; if (n === today) return 'today'; return T.dayLocked(n) ? 'locked' : 'open'; };
  const playable = n => n <= today && !T.dayLocked(n);
  const href = n => !playable(n) ? 'plus.html' : n === today ? 'play.html' : 'play.html?day=' + n;

  const months = []; { const d = new Date(T.dayKey(1)), end = new Date(T.dayKey(today)); for (let y = d.getUTCFullYear(), m = d.getUTCMonth(); y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth()); m === 11 ? (y++, m = 0) : m++) months.push([y, m]); }
  let mi = months.length - 1, sel = today;

  function render() {
    const [y, m] = months[mi], first = Date.UTC(y, m, 1), len = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const lead = (new Date(first).getUTCDay() + 6) % 7, n0 = dayOfKey(new Date(first).toISOString().slice(0, 10));
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<span class="ar-d pad" aria-hidden="true"></span>';
    const c = { solved: 0, failed: 0, open: 0, locked: 0 }, shown = [];
    for (let k = 1; k <= len; k++) {
      const n = n0 + k - 1, s = n < 1 ? 'fut' : status(n);
      if (s === 'fut') { cells += `<span class="ar-d fut"${n > today ? ` aria-label="${fmt(n)}, not out yet"` : ' aria-hidden="true"'}><span class="dn">${k}</span></span>`; continue; }
      shown.push(n); c[s === 'perfect' ? 'solved' : s === 'today' ? 'open' : s]++;
      const r = R[T.dayKey(n)], ch = T.challenge(n), mt = metaOf(n);
      const mk = s === 'solved' || s === 'perfect' ? `<span class="mk">${s === 'perfect' ? '★' : '✓'}</span><span class="sc">${r.score.toLocaleString()}</span>` : s === 'failed' ? '<span class="mk">✕</span>' : s === 'locked' ? LOCK : s === 'today' ? '<span class="mk">Today</span>' : '<span class="mk">Play</span>';
      const lab = `Puzzle ${n}, ${fmt(n, { weekday: 'long', month: 'long' })}, ${ch.from.name} to ${ch.to.name}, ${{ solved: 'solved', perfect: 'solved, perfect', failed: 'out of decisions', today: "today's puzzle", locked: 'needs Traversle +', open: 'not played' }[s]}`;
      cells += `<button type="button" class="ar-d ${s === 'perfect' ? 'solved perfect' : s}" data-n="${n}" aria-pressed="${n === sel}" aria-label="${T.esc(lab)}"><span class="dn">${k}</span>${mk}${lv(mt && mt.d)}</button>`;
    }
    const tot = shown.length || 1;
    root.innerHTML = `
    <div class="ar-cal-main">
      <div class="ar-top"><button type="button" class="ar-nav" id="ar-prev" aria-label="Previous month"${mi ? '' : ' disabled'}>‹</button><h2 id="ar-month" aria-live="polite">${MONTHS[m]} ${y}</h2><button type="button" class="ar-nav" id="ar-next" aria-label="Next month"${mi < months.length - 1 ? '' : ' disabled'}>›</button></div>
      <p class="ar-prog"><span><b>${c.solved}</b> solved</span><span><b>${c.failed}</b> out of decisions</span><span><b>${c.open}</b> to play</span>${c.locked ? `<span><b>${c.locked}</b> need Traversle +</span>` : ''}</p>
      <div class="ar-bar" aria-hidden="true"><i style="width:${100 * c.solved / tot}%" class="s"></i><i style="width:${100 * c.failed / tot}%" class="f"></i></div>
      <div class="ar-grid" role="group" aria-labelledby="ar-month">${WEEK.map(w => `<span class="ar-wd" aria-hidden="true"><b>${SHORT[w]}</b><small>${T.esc(rhythmName(w))}</small></span>`).join('')}${cells}</div>
      <p class="ar-leg"><span><i class="s"></i>Solved</span><span><i class="p"></i>Perfect</span><span><i class="f"></i>Out of decisions</span><span><i class="o"></i>Not played</span>${plus ? '' : '<span><i class="l"></i>Needs Traversle +</span>'}<span>${lv('Hard')}Difficulty</span></p>
    </div>
    <aside class="ar-pick" id="ar-pick" aria-live="polite"></aside>`;
    $('#ar-prev').onclick = () => go(mi - 1); $('#ar-next').onclick = () => go(mi + 1);
    root.querySelectorAll('.ar-d[data-n]').forEach(b => b.onclick = () => pick(+b.dataset.n));
    root.querySelector('.ar-grid').addEventListener('keydown', key);
    panel(); need(shown.slice().reverse());
  }
  function rhythmName(wd) { for (let n = 1; n <= 7; n++) if (new Date(T.dayKey(n)).getUTCDay() === wd) return T.rhythmOf(n).name; return ''; }
  function go(i) { mi = i; const [y, m] = months[mi]; const ns = []; for (let n = 1; n <= today; n++) { const d = new Date(T.dayKey(n)); if (d.getUTCFullYear() === y && d.getUTCMonth() === m) ns.push(n); } sel = ns.length ? ns[ns.length - 1] : sel; render(); }
  function pick(n) { sel = n; root.querySelectorAll('.ar-d[data-n]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.n === n)); panel(); }
  function key(e) { // arrow keys move a day or a week inside the month
    const b = e.target.closest('.ar-d[data-n]'); if (!b) return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]; if (!step) return;
    const t = root.querySelector(`.ar-d[data-n="${+b.dataset.n + step}"]`); if (t) { e.preventDefault(); t.focus(); pick(+t.dataset.n); }
  }
  function paintMeta(n) {
    const b = root.querySelector(`.ar-d[data-n="${n}"] .ar-lv`), mt = metaOf(n) || meta[n];
    if (b && mt) b.className = 'ar-lv ' + mt.d.toLowerCase();
    if (n === sel) panel();
  }
  function panel() {
    const el = $('#ar-pick'); if (!el) return;
    const n = sel, ch = T.challenge(n), r = R[T.dayKey(n)], s = status(n), mt = metaOf(n) || meta[n];
    const stop = r && r.endedAt && T.byId[r.endedAt], short = r && r.kmShort ? `, ${Math.round(r.kmShort).toLocaleString()} km short` : '';
    const res = r ? (r.failed ? `<p class="ar-res bad"><b>${r.reason ? 'Expedition ended.' : 'Out of decisions.'}</b> ${stop ? `You were stranded in ${T.esc(stop.name)}${short}.` : `You didn't reach ${T.esc(ch.to.name)}.`}</p>`
      : `<p class="ar-res ok"><b>Solved.</b> You scored ${r.score.toLocaleString()} (${T.esc(r.tier)})${r.decisionsTotal ? ` and used ${r.decisions} of ${r.decisionsTotal} decisions` : ''}.</p>`)
      : s === 'locked' ? '<p class="ar-res">This one is more than a week old. Traversle + opens every puzzle since day one.</p>' : '<p class="ar-res">Not played yet.</p>';
    const btn = !playable(n) ? `<a class="btn primary" href="plus.html">${LOCK} Unlock with Traversle +</a>`
      : n === today ? `<a class="btn primary" href="play.html">${r ? 'See your report' : "Play today's puzzle"}</a>`
      : `<a class="btn${r ? '' : ' primary'}" href="${href(n)}">${r ? (r.failed ? 'Try again' : 'Replay') : 'Play #' + n}</a>`;
    el.innerHTML = `
      <p class="ar-meta"><span>#${n} · ${fmt(n, { weekday: 'short' })}</span><span>${T.esc(themeOf(n))}</span>${mt ? `<span class="ar-diff ${mt.d.toLowerCase()}">${lv(mt.d)}${mt.d}</span>` : ''}</p>
      <h3 class="ar-route"><span>${T.flagImg(ch.from, 22)} ${T.esc(ch.from.name)}<small>${T.esc(ch.from.country)}</small></span><span class="to">to</span><span>${T.flagImg(ch.to, 22)} ${T.esc(ch.to.name)}<small>${T.esc(ch.to.country)}</small></span></h3>
      ${ch.title ? `<p class="ar-title">${T.esc(ch.title)}</p>` : ''}
      <dl class="ar-facts"><div><dt>Decisions</dt><dd>${mt ? mt.k : '…'}</dd></div><div><dt>Charted ${mt && mt.w === 1 ? 'route' : 'routes'}</dt><dd>${mt ? mt.w : '…'}</dd></div><div><dt>Distance</dt><dd>${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km</dd></div></dl>
      ${res}<div class="ar-acts">${btn}</div>`;
    need([n]);
  }

  const played = Object.keys(R).filter(k => /^\d{4}-/.test(k)).length, locked = (() => { let l = 0; for (let n = 1; n < today; n++) if (T.dayLocked(n)) l++; return l; })();
  $('#ar-summary').textContent = `${Math.max(0, today - 1)} past puzzle${today === 2 ? '' : 's'} · ${played} played${plus ? ' · Traversle + member' : ''}`;
  const strip = $('#ar-plus'); if (strip) { if (plus) strip.hidden = true; else if (locked) strip.querySelector('h2').textContent = `${locked} older puzzle${locked === 1 ? ' is' : 's are'} waiting`; }
  render();
})();
