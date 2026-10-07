/* Shared logic for the Achievements, Stats and Profile tabs. Reads the same localStorage the game writes. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const st = T.load(); const R = st.results || {};
  const days = Object.keys(R).sort();
  const runs = days.map(k => R[k]);
  const prof = (() => { try { return JSON.parse(localStorage.getItem('traverse.profile')) || {}; } catch (e) { return {}; } })();
  const saveProf = p => { try { localStorage.setItem('traverse.profile', JSON.stringify(p)); } catch (e) {} };
  const nameOf = () => prof.name || 'Traveller';

  // streak: consecutive day keys ending today or yesterday
  const streak = (() => { let n = 0, d = T.dayNumber(); if (!R[T.dayKey(d)]) d--; while (d >= 1 && R[T.dayKey(d)]) { n++; d--; } return n; })();
  const best = runs.length ? Math.max(...runs.map(r => r.score)) : 0;
  const avg = runs.length ? Math.round(runs.reduce((a, r) => a + r.score, 0) / runs.length) : 0;
  const modeCount = {}; runs.forEach(r => r.route.forEach(l => (modeCount[l.mode] = (modeCount[l.mode] || 0) + 1)));
  const favMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0];
  const legs = runs.reduce((a, r) => a + r.route.length, 0);
  const spent = runs.reduce((a, r) => a + r.cost, 0), hours = runs.reduce((a, r) => a + r.hours, 0);
  const modesUsed = Object.keys(modeCount);

  const ACH = [
    ['first', '🧭', 'First Departure', 'Submit your first journey.', runs.length >= 1, runs.length, 1],
    ['streak3', '🔥', 'Three in a Row', 'Play three days running.', streak >= 3, streak, 3],
    ['streak7', '📅', 'A Full Week', 'Play seven days running.', streak >= 7, streak, 7],
    ['score8k', '🏅', 'Top Form', 'Score 8,000 or more in a day.', best >= 8000, best, 8000],
    ['score9k', '🥇', 'Near Perfect', 'Score 9,000 or more in a day.', best >= 9000, best, 9000],
    ['multimodal', '🚆', 'Mixed Company', 'Use four different transport types across your journeys.', modesUsed.length >= 4, modesUsed.length, 4],
    ['noplane', '🚌', 'Grounded', 'Finish a journey without flying.', runs.some(r => !r.route.some(l => l.mode === 'plane')), runs.filter(r => !r.route.some(l => l.mode === 'plane')).length, 1],
    ['ferry', '🚢', 'Sea Legs', 'Take a ferry on any journey.', !!modeCount.ferry, modeCount.ferry || 0, 1],
    ['quick', '⚡', 'Snap Decision', 'Submit in under 30 seconds.', runs.some(r => r.secs < 30), runs.filter(r => r.secs < 30).length, 1],
    ['scenic', '🗺️', 'The Scenic Route', 'Finish a journey with four or more legs.', runs.some(r => r.route.length >= 4), Math.max(0, ...runs.map(r => r.route.length)), 4],
    ['ten', '🎒', 'Seasoned', 'Play ten days.', runs.length >= 10, runs.length, 10],
    ['thrifty', '💰', 'Thrifty', 'Finish a journey for under $100.', runs.some(r => r.cost < 100), runs.filter(r => r.cost < 100).length, 1],
  ];
  const unlocked = ACH.filter(a => a[4]).length;

  const page = document.body.dataset.page;
  if (page === 'achievements') {
    $('#ach-summary').textContent = `${unlocked} of ${ACH.length} unlocked`;
    $('#ach-grid').innerHTML = ACH.map(([id, ic, n, d, ok, v, g]) => `<div class="ach${ok ? ' on' : ''}"><span class="ic">${ic}</span><b>${n}</b><p>${d}</p><div class="prog"><i style="width:${Math.min(100, 100 * v / g)}%"></i></div><small>${ok ? 'Unlocked' : (typeof v === 'number' ? Math.min(v, g).toLocaleString() + ' / ' + g.toLocaleString() : '')}</small></div>`).join('');
  }
  if (page === 'stats') {
    const f = (sel, v) => { const e = $(sel); if (e) e.textContent = v; };
    f('#st-played', runs.length); f('#st-streak', streak); f('#st-best', best ? best.toLocaleString() : '—'); f('#st-avg', avg ? avg.toLocaleString() : '—');
    f('#st-legs', legs); f('#st-spent', T.money(spent)); f('#st-hours', T.dur(hours)); f('#st-mode', favMode ? T.MODES[favMode[0]].icon + ' ' + T.MODES[favMode[0]].name : '—');
    const hist = $('#st-history');
    if (hist) hist.innerHTML = runs.length ? days.slice().reverse().map(k => { const r = R[k]; const n = Math.round((Date.parse(k) - Date.UTC(2026, 9, 7)) / 86400000) + 1; const ch = T.challenge(n); return `<tr><td>#${n}<small>${k}</small></td><td>${T.esc(ch.from.name)} → ${T.esc(ch.to.name)}</td><td>${r.route.map(l => T.MODES[l.mode].icon).join(' ')}</td><td class="r">${T.money(r.cost)}</td><td class="r">${T.dur(r.hours)}</td><td class="r">${T.secsF(r.secs)}</td><td class="r"><b>${r.score.toLocaleString()}</b></td></tr>`; }).join('') : '<tr><td colspan="7" class="empty">No journeys yet. Play today\'s puzzle to start your log.</td></tr>';
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
    $('#pf-reset').onclick = () => { if (confirm('Erase every saved journey, badge and your name from this browser? This cannot be undone.')) { try { localStorage.removeItem('traverse.v1'); localStorage.removeItem('traverse.profile'); } catch (e) {} location.reload(); } };
  }
})();
