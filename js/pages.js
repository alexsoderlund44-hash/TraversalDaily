/* Home, Achievements, Stats and Profile tabs. Reads the same localStorage the game writes. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const st = T.load(); const R = st.results || {};
  const days = Object.keys(R).filter(k => /^\d{4}-/.test(k)).sort();
  const runs = days.map(k => R[k]);
  const today = T.dayNumber();
  const prof = (() => { try { return JSON.parse(localStorage.getItem('traverse.profile')) || {}; } catch (e) { return {}; } })();
  const saveProf = p => { try { localStorage.setItem('traverse.profile', JSON.stringify(p)); } catch (e) {} };
  const nameOf = () => prof.name || 'Traveller';
  const dayOf = k => Math.round((Date.parse(k) - T.EPOCH) / 86400000) + 1;
  const fmtDay = k => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  const streak = (() => { let n = 0, d = today; if (!R[T.dayKey(d)]) d--; while (d >= 1 && R[T.dayKey(d)]) { n++; d--; } return n; })();
  const best = runs.length ? Math.max(...runs.map(r => r.score)) : 0;
  const avg = runs.length ? Math.round(runs.reduce((a, r) => a + r.score, 0) / runs.length) : 0;
  const modeCount = {}; runs.forEach(r => r.route.forEach(l => (modeCount[l.mode] = (modeCount[l.mode] || 0) + 1)));
  const favMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0];
  const legs = runs.reduce((a, r) => a + r.route.length, 0);
  const spent = runs.reduce((a, r) => a + r.cost, 0), hours = runs.reduce((a, r) => a + r.hours, 0);
  const modesUsed = Object.keys(modeCount);
  const prog = T.progression(R);
  const tiers = runs.map(r => r.tier || '');
  const twistsPlayed = new Set(runs.map(r => r.twist).filter(Boolean)).size;
  const parDays = runs.filter(r => r.parMatch).length;
  const dealDays = runs.filter(r => r.deals && r.deals.total && r.deals.found === r.deals.total).length;

  const ACH = [
    ['first', '🧭', 'First Departure', 'Submit your first journey.', runs.length >= 1, runs.length, 1],
    ['par', '🎯', "Planner's Match", "Find the planner's route on any day.", parDays >= 1, parDays, 1],
    ['deals', '🏷️', 'Deal Hunter', 'Find every hidden deal in a single day.', dealDays >= 1, dealDays, 1],
    ['perfect', '🏆', 'Perfect Day', 'Earn a Perfect rating.', tiers.includes('Perfect'), tiers.filter(t => t === 'Perfect').length, 1],
    ['expert3', '🥇', 'Consistent', 'Rate Expert or better on three days.', tiers.filter(t => t === 'Perfect' || t === 'Expert').length >= 3, tiers.filter(t => t === 'Perfect' || t === 'Expert').length, 3],
    ['streak3', '🔥', 'Three in a Row', 'Play three days running.', streak >= 3, streak, 3],
    ['streak7', '📅', 'A Full Week', 'Play seven days running.', streak >= 7, streak, 7],
    ['twists', '🎲', 'Rule Bender', 'Play four different twists.', twistsPlayed >= 4, twistsPlayed, 4],
    ['multimodal', '🚆', 'Mixed Company', 'Use four different transport types across your journeys.', modesUsed.length >= 4, modesUsed.length, 4],
    ['noplane', '🚌', 'Grounded', 'Finish a journey without flying.', runs.some(r => !r.route.some(l => l.mode === 'plane')), runs.filter(r => !r.route.some(l => l.mode === 'plane')).length, 1],
    ['ferry', '🚢', 'Sea Legs', 'Take a ferry on any journey.', !!modeCount.ferry, modeCount.ferry || 0, 1],
    ['quick', '⚡', 'Snap Decision', 'Submit in under 45 seconds.', runs.some(r => r.secs < 45), runs.filter(r => r.secs < 45).length, 1],
    ['scenic', '🗺️', 'The Scenic Route', 'Finish a journey with five or more legs.', runs.some(r => r.route.length >= 5), Math.max(0, ...runs.map(r => r.route.length)), 5],
    ['level3', '🧳', 'Navigator', 'Reach level 3.', prog.level >= 3, prog.level, 3],
    ['ten', '🎒', 'Seasoned', 'Play ten days.', runs.length >= 10, runs.length, 10],
    ['thrifty', '💰', 'Thrifty', 'Finish a journey for under $100.', runs.some(r => r.cost < 100), runs.filter(r => r.cost < 100).length, 1],
  ];
  const unlocked = ACH.filter(a => a[4]).length;
  const levelHTML = () => { const pct = prog.next ? Math.round(100 * prog.into / prog.span) : 100; return `<div class="lvl"><div class="lvl-row"><b>Level ${prog.level} · ${prog.title}</b><span>${prog.xp.toLocaleString()} XP${prog.next ? ' · ' + (prog.next - prog.xp).toLocaleString() + ' to ' + prog.nextTitle : ''}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`; };

  const page = document.body.dataset.page;
  const plus = T.plus();
  const archiveRow = n => { const key = T.dayKey(n), c = T.challenge(n), r = R[key], lock = T.dayLocked(n); return `<a class="arow${lock ? ' locked' : ''}" href="${lock ? 'plus.html' : 'play.html?day=' + n}"><span class="n">#${n}<small>${fmtDay(key)}</small></span><span class="rt">${T.flagImg(c.from)} ${T.esc(c.from.name)} <i>→</i> ${T.flagImg(c.to)} ${T.esc(c.to.name)}<small>${c.twist.icon} ${T.esc(c.twist.name)}</small></span><span class="sc">${r ? `<b>${r.score.toLocaleString()}</b><small>${r.tier || 'played'}</small>` : '<small>not played</small>'}</span><span class="go">${lock ? '🔒 Traversle +' : r ? 'Replay' : 'Play'}</span></a>`; };
  if (page === 'index') {
    const g = i => document.getElementById(i), ch = T.challenge(today);
    const resetIn = () => { const ms = (today * 86400000 + T.EPOCH) - Date.now(); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; };
    g('hm-day').textContent = 'Puzzle #' + ch.n + ' · ' + new Date(ch.key).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    g('hm-route').innerHTML = `<span class="pin s"></span><b>${T.flagImg(ch.from, 40)}<span>${T.esc(ch.from.name)}<small class="cty">${T.esc(ch.from.country)}</small></span></b><span class="ln"></span><span></span><span class="pin d"></span><b>${T.flagImg(ch.to, 40)}<span>${T.esc(ch.to.name)}<small class="cty">${T.esc(ch.to.country)}</small></span></b>`;
    g('hm-h1').innerHTML = `Can you get from <em>${T.esc(ch.from.name)}</em> to <em>${T.esc(ch.to.name)}</em> on a budget?`;
    const mis = M => `<div class="mi"><span class="ic">💰</span><b>${M ? T.money(M.budget) : '…'}</b><span>budget</span></div><div class="mi"><span class="ic">⏱️</span><b>${M ? T.dur(M.deadline) : '…'}</b><span>deadline</span></div><div class="mi" title="${T.esc(ch.twist.desc)}"><span class="ic">${ch.twist.icon}</span><b>${T.esc(ch.twist.name)}</b><span>twist</span></div><div class="mi"><span class="ic">🏷️</span><b>${M ? M.deals : 3}</b><span>hidden deals</span></div>`;
    g('hm-mission').innerHTML = mis(null);
    setTimeout(() => { const M = T.mission(ch); g('hm-mission').innerHTML = mis(M); g('hm-h1').innerHTML = `Can you get from <em>${T.esc(ch.from.name)}</em> to <em>${T.esc(ch.to.name)}</em> for under <em>${T.money(M.budget)}</em>?`; }, 30);
    const meta = () => g('hm-meta').innerHTML = `<span><b>${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km</b> apart</span><span>new puzzle in <b>${resetIn()}</b></span>`; meta(); setInterval(meta, 30000);
    if (R[ch.key]) { g('hm-play').textContent = 'See your result'; g('hm-sub').innerHTML = `${R[ch.key].tier ? R[ch.key].tier + ' · ' : ''}you scored <b>${R[ch.key].score.toLocaleString()}</b> today`; }
    else if (streak) g('hm-sub').textContent = `🔥 ${streak}-day streak. Play today to keep it.`;
    if (runs.length) { g('hm-level').innerHTML = levelHTML(); g('hm-level').hidden = false; }
    const how = g('hm-howmodal'), open = o => { how.hidden = !o; document.body.classList.toggle('td-modal-open', o); if (!o && location.hash === '#how') history.replaceState(null, '', location.pathname); };
    g('hm-how').onclick = () => open(true); g('hm-how-close').onclick = () => open(false); g('hm-how-ok').onclick = () => open(false);
    how.onclick = e => { if (e.target === how) open(false); };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !how.hidden) open(false); });
    window.addEventListener('hashchange', () => { if (location.hash === '#how') open(true); });
    if (location.hash === '#how') open(true);
  }
  if (page === 'achievements') {
    $('#ach-summary').textContent = `${unlocked} of ${ACH.length} unlocked`;
    const lv = $('#ach-level'); if (lv) lv.innerHTML = levelHTML();
    $('#ach-grid').innerHTML = ACH.map(([id, ic, n, d, ok, v, g]) => `<div class="ach${ok ? ' on' : ''}"><span class="ic">${ic}</span><b>${n}</b><p>${d}</p><div class="prog"><i style="width:${Math.min(100, 100 * v / g)}%"></i></div><small>${ok ? 'Unlocked' : (typeof v === 'number' ? Math.min(v, g).toLocaleString() + ' / ' + g.toLocaleString() : '')}</small></div>`).join('');
  }
  if (page === 'stats') {
    const f = (sel, v) => { const e = $(sel); if (e) e.textContent = v; };
    f('#st-played', runs.length); f('#st-streak', streak); f('#st-best', best ? best.toLocaleString() : '—'); f('#st-avg', avg ? avg.toLocaleString() : '—');
    f('#st-legs', legs); f('#st-spent', T.money(spent)); f('#st-hours', T.dur(hours)); f('#st-mode', favMode ? T.MODES[favMode[0]].icon + ' ' + T.MODES[favMode[0]].name : '—');
    f('#st-par', parDays); f('#st-deals', runs.reduce((a, r) => a + (r.deals ? r.deals.found : 0), 0));
    const lv = $('#st-level'); if (lv) lv.innerHTML = levelHTML();
    const hist = $('#st-history');
    if (hist) hist.innerHTML = runs.length ? days.slice().reverse().map(k => { const r = R[k]; const n = dayOf(k); const ch = T.challenge(n); return `<tr><td><a href="play.html${n === today ? '' : '?day=' + n}">#${n}</a><small>${k}</small></td><td>${T.esc(ch.from.name)} → ${T.esc(ch.to.name)}<small>${ch.twist.icon} ${T.esc(ch.twist.name)}</small></td><td>${r.route.map(l => T.MODES[l.mode].icon).join(' ')}</td><td class="r">${T.money(r.cost)}</td><td class="r">${T.dur(r.hours)}</td><td class="r">${T.secsF(r.secs)}</td><td class="r"><b>${r.score.toLocaleString()}</b><small>${r.tier || ''}${r.parMatch ? ' · 🎯' : ''}</small></td></tr>`; }).join('') : '<tr><td colspan="7" class="empty">No journeys yet. Play today\'s puzzle to start your log.</td></tr>';
    const bars = $('#st-modes');
    if (bars) { const tot = Object.values(modeCount).reduce((a, b) => a + b, 0) || 1; bars.innerHTML = Object.entries(modeCount).sort((a, b) => b[1] - a[1]).map(([m, n]) => `<div class="mrow"><span>${T.MODES[m].icon} ${T.MODES[m].name}</span><div class="track"><i style="width:${100 * n / tot}%;background:${T.MODES[m].color}"></i></div><b>${n}</b></div>`).join('') || '<p class="empty">Your transport mix appears here after your first journey.</p>'; }
  }
  if (page === 'profile') {
    const inp = $('#pf-name'); inp.value = prof.name || '';
    const refresh = () => { $('#pf-initials').textContent = nameOf().trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(); $('#pf-display').textContent = nameOf(); };
    refresh();
    $('#pf-save').onclick = () => { prof.name = inp.value.trim().slice(0, 24); saveProf(prof); refresh(); const t = $('#pf-saved'); t.hidden = false; setTimeout(() => (t.hidden = true), 1500); };
    $('#pf-played').textContent = runs.length; $('#pf-streak').textContent = streak; $('#pf-best').textContent = best ? best.toLocaleString() : '—'; $('#pf-badges').textContent = unlocked + ' / ' + ACH.length;
    $('#pf-since').textContent = days.length ? new Date(days[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'today';
    $('#pf-level').innerHTML = levelHTML();
    $('#pf-reset-today').onclick = () => { const key = T.dayKey(today); if (!R[key]) { alert('No official run saved for today yet.'); return; } if (confirm("Reset today's puzzle? Your official score for today will be erased so you can play it again.")) { delete st.results[key]; T.save(st); location.href = 'play.html'; } };
    $('#pf-reset').onclick = () => { if (confirm('Erase every saved journey, badge and your name from this browser? This cannot be undone.')) { try { localStorage.removeItem('traverse.v1'); localStorage.removeItem('traverse.profile'); } catch (e) {} location.reload(); } };
  }
})();

(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s), page = document.body.dataset.page;
  if (page !== 'archive' && page !== 'plus' && page !== 'profile') return;
  const st = T.load(), R = st.results || {}, today = T.dayNumber(), plus = T.plus();
  const fmtDay = k => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const plusBadge = () => plus.active ? `<span class="plus-on">✦ Traversle + member${plus.since ? ' since ' + new Date(plus.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>` : '';
  if (page === 'archive') {
    const q = $('#ar-q'); let filter = '';
    const render = () => {
      const groups = {}; let shown = 0, locked = 0;
      for (let n = today - 1; n >= 1; n--) {
        const key = T.dayKey(n), c = T.challenge(n), r = R[key], lock = T.dayLocked(n);
        if (filter && !(c.from.name + ' ' + c.to.name + ' ' + c.from.country + ' ' + c.to.country + ' ' + c.twist.name).toLowerCase().includes(filter)) continue;
        const month = new Date(key).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        (groups[month] = groups[month] || []).push(`<a class="arow${lock ? ' locked' : ''}" href="${lock ? 'plus.html' : 'play.html?day=' + n}"><span class="n">#${n}<small>${fmtDay(key)}</small></span><span class="rt">${T.flagImg(c.from)} ${T.esc(c.from.name)} <i>→</i> ${T.flagImg(c.to)} ${T.esc(c.to.name)}<small>${c.twist.icon} ${T.esc(c.twist.name)} · ${Math.round(T.km(c.from, c.to)).toLocaleString()} km</small></span><span class="sc">${r ? `<b>${r.score.toLocaleString()}</b><small>${r.tier || 'played'}</small>` : '<small>not played</small>'}</span><span class="go">${lock ? '🔒 Traversle +' : r ? 'Replay' : 'Play'}</span></a>`);
        shown++; if (lock) locked++;
      }
      $('#ar-list').innerHTML = shown ? Object.entries(groups).map(([m, rows]) => `<h2 class="ar-month">${m}</h2><div class="alist">${rows.join('')}</div>`).join('') : `<div class="alist"><p class="empty">${today <= 1 ? 'Today is puzzle #1. From tomorrow, every past puzzle collects here.' : 'No puzzles match that search.'}</p></div>`;
      $('#ar-summary').innerHTML = `${Math.max(0, today - 1)} past puzzle${today === 2 ? '' : 's'} · ${Object.keys(R).length} played${plus.active ? ' · ' + plusBadge() : locked ? ` · <a href="plus.html">${locked} locked, unlock with Traversle +</a>` : ''}`;
    };
    if (q) q.oninput = () => { filter = q.value.trim().toLowerCase(); render(); };
    render();
  }
  if (page === 'plus') {
    const stat = $('#pl-status');
    stat.innerHTML = plus.active ? `<div class="plus-active"><span class="ic">✦</span><b>You're a Traversle + member${plus.plan === 'life' ? ' for life' : ''}.</b><p>Every puzzle since day one is open in the <a href="archive.html">archive</a>. Thank you for backing the game.</p></div>` : '';
    document.querySelectorAll('[data-checkout]').forEach(b => {
      if (plus.active) { b.textContent = plus.plan === b.dataset.checkout || plus.plan === 'life' ? 'Active' : b.textContent; if (plus.plan === 'life' || plus.plan === b.dataset.checkout) b.classList.add('disabled'); return; }
      if (!b.getAttribute('href') || b.getAttribute('href') === '#') b.addEventListener('click', e => { e.preventDefault(); const n = $('#pl-soon'); n.hidden = false; n.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    });
  }
  if (page === 'profile') { const el = $('#pf-plus'); if (el) el.innerHTML = plus.active ? plusBadge() + ' · <a href="archive.html">open the archive</a>' : `Free plan · <a href="plus.html">get Traversle +</a> for the full archive`; }
})();
