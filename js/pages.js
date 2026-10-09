/* Home, Achievements, Stats and Profile tabs. Reads the same localStorage the game writes. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const st = T.load(); const R = st.results || {};
  const today = T.dayNumber();
  const prof = (() => { try { return JSON.parse(localStorage.getItem('traverse.profile')) || {}; } catch (e) { return {}; } })();
  const saveProf = p => { try { localStorage.setItem('traverse.profile', JSON.stringify(p)); } catch (e) {} };
  const nameOf = () => prof.name || 'Traveler';
  const dayOf = k => Math.round((Date.parse(k) - T.EPOCH) / 86400000) + 1;
  const fmtDay = k => new Date(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

  const S = T.stats(R, today), runs = S.runs, days = S.keys;
  const { streak, maxStreak, avg, modeCount, legs, spent, hours } = S, best = S.best ? S.best.score : 0;
  const favMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0];
  const prog = T.progression(R);
  const ACH = T.achievements(R, today);
  const unlocked = ACH.filter(a => a.level).length, tiersEarned = ACH.reduce((n, a) => n + a.level, 0), tiersAll = ACH.reduce((n, a) => n + a.max, 0);
  const levelHTML = () => { const pct = prog.next ? Math.round(100 * prog.into / prog.span) : 100; return `<div class="lvl"><div class="lvl-row"><b>Level ${prog.level} · ${prog.title}</b><span>${prog.xp.toLocaleString()} XP${prog.next ? ' · ' + (prog.next - prog.xp).toLocaleString() + ' to ' + prog.nextTitle : ''}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`; };

  const page = document.body.dataset.page;
  const plus = T.plus();
  const archiveRow = n => { const key = T.dayKey(n), c = T.challenge(n), r = R[key], lock = T.dayLocked(n); return `<a class="arow${lock ? ' locked' : ''}" href="${lock ? 'plus.html' : 'play.html?day=' + n}"><span class="n">#${n}<small>${fmtDay(key)}</small></span><span class="rt">${T.flagImg(c.from)} ${T.esc(c.from.name)} <i>→</i> ${T.flagImg(c.to)} ${T.esc(c.to.name)}<small>${c.twist.icon} ${T.esc(c.twist.name)}</small></span><span class="sc">${r ? `<b>${r.score.toLocaleString()}</b><small>${r.tier || 'played'}</small>` : '<small>not played</small>'}</span><span class="go">${lock ? '🔒 Traversle +' : r ? 'Replay' : 'Play'}</span></a>`; };
  if (page === 'index') {
    const g = i => document.getElementById(i), ch = T.challenge(today);
    const resetIn = () => { const ms = T.untilReset(); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; };
    g('hm-day').textContent = 'Puzzle #' + ch.n + ' · ' + new Date(ch.key).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    g('hm-route').innerHTML = `<span class="pin s"></span><b>${T.flagImg(ch.from, 40)}<span>${T.esc(ch.from.name)}<small class="cty">${T.esc(ch.from.country)}</small></span></b><span class="ln"></span><span></span><span class="pin d"></span><b>${T.flagImg(ch.to, 40)}<span>${T.esc(ch.to.name)}<small class="cty">${T.esc(ch.to.country)}</small></span></b>`;
    g('hm-h1').innerHTML = `Can you get from <em>${T.esc(ch.from.name)}</em> to <em>${T.esc(ch.to.name)}</em> in a handful of decisions?`; g('hm-h1').classList.add('live');
    const mis = M => `<div class="mi"><span class="ic">🧭</span><b>${M ? T.decisionsFor(M) : '…'}</b><span>decisions</span></div><div class="mi diff ${M ? M.difficulty.toLowerCase() : ''}"><span class="ic lv" aria-hidden="true"><i></i><i></i><i></i></span><b>${M ? M.difficulty : '…'}</b><span>${M ? (M.ways.length === 1 ? 'one charted route' : M.ways.length + ' charted routes') : 'difficulty'}</span></div><div class="mi" title="${T.esc(ch.twist.desc)}"><span class="ic">${ch.twist.icon}</span><b>${T.esc(ch.twist.name)}</b><span>twist</span></div><div class="mi"><span class="ic">🎟️</span><b>${M ? M.deals : 3}</b><span>secret fares</span></div>`;
    g('hm-mission').innerHTML = mis(null);
    const rh = T.rhythmOf(ch.n); if (rh.twist.id === ch.twistId) g('hm-day').textContent += ' · ' + rh.label;
    if (ch.title) { g('hm-theme').innerHTML = `<b>${T.esc(ch.title)}.</b> ${T.esc(ch.blurb)}`; g('hm-theme').hidden = false; }
    window.TD_FOCUS = { from: ch.from, to: ch.to };
    // leaving for the game: the page lifts away and the globe comes closer before the mission screen arrives
    g('hm-play').addEventListener('click', e => { if (e.metaKey || e.ctrlKey || e.shiftKey || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = g('hm-play').href; }, 380); });
    setTimeout(() => { const M = T.mission(ch); g('hm-mission').innerHTML = mis(M); g('hm-h1').innerHTML = `Can you get from <em>${T.esc(ch.from.name)}</em> to <em>${T.esc(ch.to.name)}</em> in <em>${T.decisionsFor(M)} decisions</em>?`; }, 30);
    const meta = () => g('hm-meta').innerHTML = `<span><b>${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km</b> apart</span><span>next puzzle in <b>${resetIn()}</b></span>${R[ch.key] ? `<span>tomorrow is <b>${T.esc(T.rhythmOf(ch.n + 1).label)}</b></span>` : ''}`; meta(); setInterval(meta, 30000);
    if (R[ch.key]) { g('hm-play').textContent = 'See your expedition report'; g('hm-sub').innerHTML = `${R[ch.key].tier ? R[ch.key].tier + ' · ' : ''}you scored <b>${R[ch.key].score.toLocaleString()}</b> today`; }
    else if (streak) g('hm-sub').textContent = `🔥 ${streak} days in a row. Keep it going.`;
    if (runs.length) { g('hm-level').innerHTML = levelHTML(); g('hm-level').hidden = false; }
    const wk = g('hm-week'); if (wk) { const wd = new Date(ch.key).getUTCDay(); wk.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => { const rh = T.rhythmOf(ch.n + ((d - wd + 7) % 7)); return `<li class="${d === wd ? 'now' : ''}"><span class="ic">${rh.twist.icon}</span><b>${T.esc(rh.label)}</b><span>${T.esc(rh.desc)}</span></li>`; }).join(''); }
  }
  if (page === 'index') { const hl = $('#hm-howlink'); if (hl && !runs.length) { hl.textContent = 'New here? How to play'; hl.classList.add('new'); } }
  if (page === 'how') {
    const KIND = { open: 'none', nofly: 'hard', oneflight: 'hard', overland: 'hard', ferry: 'soft', rail: 'soft', threemodes: 'soft' };
    const WHAT = {
      open: 'Nothing is removed and nothing is tilted. Every leg the chart has is on the table.',
      nofly: 'No flight is ever offered. Every leg is a bus, train, ferry, rideshare or car.',
      oneflight: 'Once you have flown, no more flights are offered for the rest of the journey.',
      overland: 'No flight into the destination is offered. You can fly earlier, but the last leg is on the ground or at sea.',
      ferry: 'Where a ferry runs, it is the fare you are shown until you have taken one. The charted routes all take a ferry somewhere.',
      rail: 'Where a train runs, it is the fare you are shown until you have taken two. The charted routes all ride the train at least twice.',
      threemodes: 'A kind of transport you have not used yet is the fare you are shown, until you have used three. The charted routes all mix three.'
    };
    const PLAY = {
      open: 'Pure money against time. Look for the secret fares and judge each detour on how much closer it gets you.',
      nofly: 'Long legs get slow. Favour the big hops that keep moving forward, and count your decisions before a scenic detour.',
      oneflight: 'Save the flight for the longest gap. One well-placed flight can buy you two decisions.',
      overland: 'Fly early if you fly at all, then line up a city with a road, rail or sea leg into the finish.',
      ferry: 'Coast to coast. A ferry is usually slow but cheap, so take it where it carries you a long way.',
      rail: 'Europe by train. Trains are fast between big cities, so string two of them along the way.',
      threemodes: 'Three kinds of transport. Mix a bus, a train and a ferry early so you are not forced into an odd leg at the end.'
    };
    const tw = $('#how-twists'); if (tw) tw.innerHTML = T.TWISTS.map(t => `<div class="how-twist"><span class="ic">${t.icon}</span><b>${T.esc(t.name)}</b><p class="what"><em class="${KIND[t.id] || 'hard'}">${KIND[t.id] === 'none' ? 'No rule' : KIND[t.id] === 'soft' ? 'Tilts the fares' : 'Removes legs'}</em>${T.esc(WHAT[t.id] || t.desc)}</p><p class="how"><b>Play it:</b> ${T.esc(PLAY[t.id] || '')}</p></div>`).join('');
    const wk = $('#how-week'); if (wk) { const wd = new Date(T.dayKey(today)).getUTCDay(); wk.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => { const rh = T.rhythmOf(today + ((d - wd + 7) % 7)); return `<li class="${d === wd ? 'now' : ''}"><span class="ic">${rh.twist.icon}</span><b>${T.esc(rh.label)}</b><span>${T.esc(rh.desc)}${d === wd ? ' · today' : ''}</span></li>`; }).join(''); }
  }
  if (page === 'achievements') {
    $('#ach-summary').textContent = `${unlocked} of ${ACH.length} badges · ${tiersEarned} of ${tiersAll} tiers earned`;
    const lv = $('#ach-level'); if (lv) lv.innerHTML = levelHTML();
    const card = a => {
      const hide = a.secret && !a.level, pct = a.done ? 100 : Math.min(100, 100 * a.value / a.target);
      const pips = a.max > 1 ? `<span class="pips">${['bronze', 'silver', 'gold'].map((t, i) => `<i class="${t}${i < a.level ? ' on' : ''}" title="${t}"></i>`).join('')}</span>` : '';
      return `<div class="ach${a.level ? ' on' : ''}${a.tier ? ' t-' + a.tier.toLowerCase() : ''}${hide ? ' secret' : ''}"><span class="ic">${hide ? '❔' : a.ic}</span><b>${hide ? 'Secret badge' : T.esc(a.name)}</b>${pips}
        <p>${hide ? 'Keep playing to find out.' : a.done ? T.esc(a.goal) + '.' : 'Next: ' + T.esc(a.goal) + (a.note ? ' (' + a.note + ')' : '') + '.'}</p>
        ${hide ? '' : `<div class="prog"><i style="width:${pct}%"></i></div><small>${a.done ? (a.tier ? a.tier + ' · complete' : 'Unlocked') : Math.min(a.value, a.target).toLocaleString() + ' / ' + a.target.toLocaleString()}${!a.done && a.tier ? ' · ' + a.tier + ' earned' : ''}</small>`}</div>`;
    };
    $('#ach-grid').innerHTML = ACH.filter(a => !a.secret).map(card).join('');
    const sec = $('#ach-secret'); if (sec) sec.innerHTML = ACH.filter(a => a.secret).map(card).join('');
  }
  if (page === 'stats') {
    const f = (sel, v) => { const e = $(sel); if (e) e.textContent = v; };
    f('#st-played', runs.length); f('#st-streak', streak); f('#st-best', best ? best.toLocaleString() : '—'); f('#st-avg', avg ? avg.toLocaleString() : '—');
    f('#st-legs', legs); f('#st-spent', T.money(spent)); f('#st-hours', T.dur(hours)); f('#st-mode', favMode ? T.MODES[favMode[0]].icon + ' ' + T.MODES[favMode[0]].name : '—');
    f('#st-par', S.parDays); f('#st-deals', S.dealsFound); f('#st-max', maxStreak); f('#st-km', S.km.toLocaleString() + ' km'); f('#st-countries', S.countries.size + ' / ' + T.COUNTRIES.length);
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
    const setT = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    setT('#pf-played', runs.length); setT('#pf-streak', streak); setT('#pf-max', maxStreak); setT('#pf-avg', avg ? avg.toLocaleString() : '—');
    setT('#pf-badges', unlocked + ' / ' + ACH.length); setT('#pf-par', S.parDays); setT('#pf-km', S.km.toLocaleString());
    const bestEl = $('#pf-best');
    if (bestEl) bestEl.innerHTML = S.best ? `<a href="play.html${S.best.n === today ? '' : '?day=' + S.best.n}">${S.best.score.toLocaleString()}</a>` : '—';
    setT('#pf-best-sub', S.best ? `best · #${S.best.n} ${S.best.tier || ''}` : 'best game');
    setT('#pf-since', days.length ? new Date(days[0]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'today');
    /* calendar: the last 20 weeks, one square per day, coloured by rating */
    const cal = $('#pf-cal');
    if (cal) {
      const WEEKS = 20, tierCls = { Perfect: 't5', Expert: 't4', Navigator: 't3', Wayfarer: 't2', Arrived: 't1' };
      const weekEnd = today + (6 - new Date(T.dayKey(today)).getUTCDay()); // fill to the end of this week (weeks run Sunday to Saturday)
      let h = '';
      for (let w = WEEKS - 1; w >= 0; w--) {
        h += '<div class="wk">';
        for (let d = 6; d >= 0; d--) {
          const n = weekEnd - w * 7 - d, key = T.dayKey(n), r = n >= 1 && n <= today ? R[key] : null;
          const cls = n > today || n < 1 ? 'x' : r ? tierCls[r.tier] || 't1' : '';
          h += `<i class="${cls}${n === today ? ' now' : ''}" title="${n >= 1 && n <= today ? key + (r ? ' · ' + r.score.toLocaleString() + ' · ' + (r.tier || '') : ' · not played') : ''}"></i>`;
        }
        h += '</div>';
      }
      cal.innerHTML = h;
    }
    /* passport: every country a submitted route passed through */
    const pp = $('#pf-passport');
    if (pp) {
      setT('#pf-pp-count', `${S.countries.size} of ${T.COUNTRIES.length} countries · ${S.continents.size} of ${T.CONTINENTS.length} continents`);
      const flagOf = name => T.C.find(c => c.country === name);
      pp.innerHTML = S.countries.size ? Array.from(S.countries).sort().map((cn, i) => `<span class="stamp" style="--r:${((i * 7) % 9) - 4}deg">${T.flagImg(flagOf(cn))}${T.esc(cn)}</span>`).join('')
        : '<p class="empty">Every country your routes pass through gets a stamp here.</p>';
      const ct = $('#pf-continents'); if (ct) ct.innerHTML = T.CONTINENTS.map(c => `<span class="${S.continents.has(c) ? 'on' : ''}">${c}</span>`).join('');
    }
    $('#pf-level').innerHTML = levelHTML();
    $('#pf-reset-today').onclick = () => { const key = T.dayKey(today); if (!R[key]) { alert("You haven't played today yet."); return; } if (confirm("Reset today's puzzle? Your official score for today will be erased so you can play it again.")) { delete st.results[key]; T.save(st); location.href = 'play.html'; } };
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
        (groups[month] = groups[month] || []).push(`<a class="arow${lock ? ' locked' : ''}" href="${lock ? 'plus.html' : 'play.html?day=' + n}"><span class="n">#${n}<small>${fmtDay(key)}</small></span><span class="rt">${T.flagImg(c.from)} ${T.esc(c.from.name)} <i>→</i> ${T.flagImg(c.to)} ${T.esc(c.to.name)}<small>${c.twist.icon} ${T.esc(T.rhythmOf(n).twist.id === c.twistId ? T.rhythmOf(n).label : c.twist.name)}${c.title ? ' · ' + T.esc(c.title) : ''} · ${Math.round(T.km(c.from, c.to)).toLocaleString()} km</small></span><span class="sc">${r ? `<b>${r.score.toLocaleString()}</b><small>${r.tier || 'played'}</small>` : '<small>not played</small>'}</span><span class="go">${lock ? '🔒 Traversle +' : r ? 'Replay' : 'Play'}</span></a>`);
        shown++; if (lock) locked++;
      }
      $('#ar-list').innerHTML = shown ? Object.entries(groups).map(([m, rows]) => `<h2 class="ar-month">${m}</h2><div class="alist">${rows.join('')}</div>`).join('') : `<div class="alist"><p class="empty">${today <= 1 ? "Today is puzzle #1. Past puzzles will show up here from tomorrow." : 'No puzzles match that search.'}</p></div>`;
      $('#ar-summary').innerHTML = `${Math.max(0, today - 1)} past puzzle${today === 2 ? '' : 's'} · ${Object.keys(R).length} played${plus.active ? ' · ' + plusBadge() : locked ? ` · <a href="plus.html">${locked} locked, unlock with Traversle +</a>` : ''}`;
    };
    if (q) q.oninput = () => { filter = q.value.trim().toLowerCase(); render(); };
    render();
  }
  if (page === 'plus') {
    const stat = $('#pl-status');
    stat.innerHTML = plus.active ? `<div class="plus-active"><span class="ic">✦</span><b>You're a Traversle + member for life.</b><p>Every puzzle since day one is open in the <a href="archive.html">archive</a>. Thank you for backing the game.</p></div>` : '';
    document.querySelectorAll('[data-checkout]').forEach(b => {
      if (plus.active) { b.textContent = 'Active'; b.classList.add('disabled'); return; }
      if (!b.getAttribute('href') || b.getAttribute('href') === '#') b.addEventListener('click', e => { e.preventDefault(); const n = $('#pl-soon'); n.hidden = false; n.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    });
  }
  if (page === 'profile') { const el = $('#pf-plus'); if (el) el.innerHTML = plus.active ? plusBadge() + ' · <a href="archive.html">open the archive</a>' : `Free plan · <a href="plus.html">get Traversle +</a> for the full archive`; }
})();
