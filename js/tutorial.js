/* TraversleDaily: the how-to-play walkthrough for first-time players. Renders into #hm-howmodal.
   Six steps played out on a miniature of the real game screen (the Iberian corner of the chart and the
   instrument panel, built from the same markup and styles the play page uses) with an animated pointer
   that taps what you would tap, plus callouts that point at the thing the step is about. Every step loops. */
(function () {
  'use strict';
  const box = document.getElementById('hm-howmodal'); if (!box) return;
  const T = window.Traverse, MAP = window.TUTORIAL_MAP; if (!T || !MAP) return;
  const onPlay = document.body.dataset.page === 'play';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = {}; MAP.cities.forEach(c => (C[c.id] = c));
  const flag = c => T.flagImg(c, 20);
  const place = c => `${flag(c)} ${c.name}`;
  const MODES = T.MODES;
  // the example expedition: Lisbon to Barcelona with $80 and 12 hours, one stop in Madrid
  const LEG1 = { mode: 'train', cost: 48, hours: 3.17, name: 'Train' }, LEG2 = { mode: 'train', cost: 21, full: 48, hours: 2.75, name: 'Train', deal: .56 };
  const OPTS1 = [{ mode: 'bus', cost: 19, hours: 7.33 }, { mode: 'ride', cost: 31, hours: 6 }, { mode: 'train', cost: 48, hours: 3.17 }];
  const OPTS2 = [{ mode: 'train', cost: 21, full: 48, hours: 2.75, deal: .56 }, { mode: 'bus', cost: 26, hours: 6.5 }, { mode: 'plane', cost: 95, hours: 1.4, off: 'over budget' }];
  const BUDGET = 80, DEADLINE = 12;

  const STEPS = [
    { k: 'A start. A destination. A budget.', t: 'Every day the whole world gets the same puzzle. Here you begin in <b>Lisbon</b> and must reach <b>Barcelona</b> with <b>$80</b> and <b>12 hours</b>. The clock starts the moment you press Begin.' },
    { k: 'Tap a city to add a stop.', t: 'Lit cities are the ones you can reach from where you stand; faded ones are out of range. Hover or tap one to see its fares, then tap it to make it your next stop.' },
    { k: 'Pick how you get there.', t: 'Every ride trades money for time: the train is quick, the bus is cheap. Tap an option to see what it does to your budget and deadline, then add the leg.' },
    { k: 'Mind the budget, the clock, and your pace.', t: 'The panel tracks what you have left. Anything that would break the budget or the deadline is grayed out. Deciding fast earns a bonus of up to 20%.' },
    { k: 'Secret fares hide on the chart.', t: 'Three fares a day are quietly cheap. They only show when you look at a city, and two of them sit on the route the planner had in mind.' },
    { k: 'Reach the end and submit.', t: 'Arrive, submit, and the expedition report scores your money, time and speed, then shows the planner\'s route beside yours. One official run a day. Make it count.' },
  ];
  let i = 0, timers = [], loopT = null, started = 0, raf = 0;

  /* ---------- the miniature screen ---------- */
  const arc = (a, b) => { const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; return `M${a.x},${a.y} Q${mx - dy / L * L * .12},${my + dx / L * L * .12} ${b.x},${b.y}`; };
  const money = v => T.money(v), dur = h => T.dur(h);
  function chartSvg() {
    const cities = MAP.cities.map(c => `<circle class="tv-city" data-c="${c.id}" cx="${c.x}" cy="${c.y}" r="${3.2 + c.hub * .6}"/>`).join('');
    const labels = MAP.cities.map(c => `<text class="tv-label" data-l="${c.id}" x="${c.x + 7}" y="${c.y + 3.5}">${c.name}</text>`).join('');
    return `<svg class="tut-svg" viewBox="0 0 ${MAP.w} ${MAP.h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path class="tv-grat" d="${MAP.grat}"/>
      <path class="tv-coast c3" d="${MAP.land}"/><path class="tv-coast c2" d="${MAP.land}"/><path class="tv-coast" d="${MAP.land}"/>
      <path class="tv-land" d="${MAP.land}"/>
      <g class="spokes"></g><g class="links"></g><g class="badges"></g>
      <g class="pulse" transform="translate(${C.bcn.x},${C.bcn.y})"><circle class="tv-pulse" r="4"/></g>
      ${cities}${labels}</svg>`;
  }
  function planHtml() {
    return `<div class="tut-plan">
      <header class="tv-plan-head"><div><h2>Your journey</h2><p class="tv-plan-sub" data-sub>You're in Lisbon.</p></div></header>
      <div class="tv-gauges">
        <div class="tv-gauge" data-g="cost"><span class="lab">Budget</span><b>$0</b><small>$80 left of $80</small><div class="bar"><i style="width:0"></i></div></div>
        <div class="tv-gauge" data-g="time"><span class="lab">Deadline</span><b>0h</b><small>12h left of 12h</small><div class="bar"><i style="width:0"></i></div></div>
        <div class="tv-gauge clock" data-g="clock"><span class="lab">Deciding</span><b data-clock>0s</b><small>bonus +20%</small></div>
      </div>
      <div class="tv-estimate" data-est hidden><span>Score estimate</span><b>9,120</b><div class="bar"><i style="width:91%"></i></div></div>
      <ol class="tv-stops" data-stops></ol>
      <div class="tv-picker" data-picker></div>
      <footer class="tv-plan-foot"><button class="btn ghost" type="button" tabindex="-1">Undo · 3 left</button><button class="btn ghost" type="button" tabindex="-1">Hint · +45 s</button><button class="btn primary" type="button" tabindex="-1" data-submit disabled>Submit journey</button></footer>
    </div>`;
  }
  function gateHtml() {
    return `<div class="tut-gate"><div class="tv-gate-card tut-gate-card">
      <p class="tv-gate-day">Example puzzle · Eurorail Saturday</p>
      <h2 class="tv-gate-title"><span class="city">${T.flagImg(C.lis, 40)} <span>Lisbon<small class="cty">Portugal</small></span></span><span class="arr">→</span><span class="city">${T.flagImg(C.bcn, 40)} <span>Barcelona<small class="cty">Spain</small></span></span></h2>
      <p class="tv-gate-sub">1,000 km. No direct route. Get there under budget and before the deadline.</p>
      <div class="tv-mission"><div class="mi"><span class="ic">💰</span><b>$80</b><span>budget</span></div><div class="mi"><span class="ic">⏱️</span><b>12h</b><span>deadline</span></div><div class="mi"><span class="ic">🏷️</span><b>3 deals</b><span>hidden on the map</span></div></div>
      <button class="btn primary big" type="button" tabindex="-1" data-begin>Begin the journey</button>
      <p class="tv-gate-note">The clock starts the moment you begin.</p>
    </div></div>`;
  }
  const screenHtml = () => `<div class="tut-wrap"><div class="tut-screen">
      <div class="tut-chart">${chartSvg()}<div class="tv-tip" data-tip hidden></div><div class="tv-deal" data-deal><div class="ticket"><p class="k">🎟️ Secret fare found</p><b><s>$48</s> → $21</b><small>Train to Barcelona · 56% off</small></div></div></div>
      ${planHtml()}
      <div class="tut-report" data-report hidden></div>
      <svg class="tut-arrows" data-arrows aria-hidden="true"></svg>
      <div class="tut-cursor" data-cursor><svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 3 L19 12 L12 13.5 L15.5 20.5 L13 21.5 L9.5 14.5 L5 18 Z" fill="#2B1D12" stroke="#FFF4DC" stroke-width="1.6" stroke-linejoin="round"/></svg><span class="ring"></span></div>
    </div></div>`;

  /* ---------- state painters ---------- */
  const q = s => box.querySelector(s), qa = s => box.querySelectorAll(s);
  const svgEl = () => q('.tut-svg');
  function cityState(st) { // st: { cur, on:[], pend, reach:[], far:[] }
    qa('.tv-city').forEach(el => { const id = el.dataset.c; let cls = 'tv-city';
      if (id === 'lis') cls += ' start'; if (id === 'bcn') cls += ' dest';
      if (id === st.cur) cls += ' cur'; else if ((st.on || []).includes(id)) cls += ' on'; else if (id === st.pend) cls += ' pend'; else if ((st.reach || []).includes(id)) cls += ' reach'; else if ((st.far || []).includes(id)) cls += ' far';
      el.setAttribute('class', cls); });
    qa('.tv-label').forEach(el => el.classList.toggle('far', (st.far || []).includes(el.dataset.l)));
  }
  function spokes(from, tos, dim) { q('.spokes').innerHTML = tos.map(t => `<path class="tv-spoke${dim ? ' dim' : ''}${t === 'bcn' ? ' fin' : ''}" d="${arc(C[from], C[t])}"/>`).join(''); }
  function links(legs, ghost) { // legs: [{from,to,leg,draw}]
    q('.links').innerHTML = legs.map(l => `<path class="tv-link ${l.leg.mode}${l.draw ? ' draw' : ''}" style="stroke:${MODES[l.leg.mode].color}" d="${arc(C[l.from], C[l.to])}" pathLength="1"/>`).join('') + (ghost ? `<path class="tv-link ghost" d="${arc(C[ghost[0]], C[ghost[1]])}"/>` : '');
    q('.badges').innerHTML = legs.map((l, n) => { const a = C[l.from], b = C[l.to], x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, txt = `${n + 1} · ${MODES[l.leg.mode].icon} ${money(l.leg.cost)} · ${dur(l.leg.hours)}${l.leg.deal ? ' 🎟️' : ''}`, w = txt.length * 5.4 + 14; return `<g class="tv-badge${l.draw ? ' late' : ''}" transform="translate(${x},${y})"><rect x="${-w / 2}" y="-9" width="${w}" height="18" rx="9"/><text y="3.5">${txt}</text></g>`; }).join('');
  }
  function stops(legs, atEnd) {
    let h = `<li class="start"><span class="dot"></span><div class="stop">${place(C.lis)}<small>start</small></div>`;
    legs.forEach((l, n) => { const c = C[l.to], m = MODES[l.leg.mode]; h += `<div class="leg" style="border-color:${m.color}"><span>${m.icon}</span><span><b>${money(l.leg.cost)}</b> · ${dur(l.leg.hours)}${l.leg.deal ? ` <em class="deal">−${Math.round(l.leg.deal * 100)}%</em>` : ''}<br><span class="n">${m.name}</span></span><span></span></div></li><li class="${c.id === 'bcn' ? 'dest' : ''}"><span class="dot"></span><div class="stop">${place(c)}<small>${c.id === 'bcn' ? 'arrived' : 'stop ' + (n + 1)}</small></div>`; });
    h += atEnd ? '</li>' : `</li><li class="dest ghost"><span class="dot"></span><div class="stop">${place(C.bcn)}<small>destination</small></div></li>`;
    q('[data-stops]').innerHTML = h;
  }
  function gauges(cost, hours) {
    const set = (g, v, cap, fmt) => { const el = q(`[data-g="${g}"]`); el.querySelector('b').textContent = fmt(v); el.querySelector('small').textContent = fmt(cap - v) + ' left of ' + fmt(cap); el.querySelector('.bar i').style.width = Math.min(100, 100 * v / cap) + '%'; el.classList.toggle('warn', v / cap > .8); };
    set('cost', cost, BUDGET, money); set('time', hours, DEADLINE, dur);
  }
  const stopRow = (c, modes, from, dealSeen, fin) => `<button class="tv-stoprow${fin ? ' finish' : ''}" type="button" tabindex="-1" data-row="${c.id}"><span class="nm">${place(c)}<small>${fin ? 'destination' : Math.round(Math.hypot(c.x - C.bcn.x, c.y - C.bcn.y) * 2.3).toLocaleString() + ' km to Barcelona'}</small></span><span class="modes">${modes.map(m => `<i>${MODES[m].icon}</i>`).join('')}${dealSeen ? '<i class="dl">🎟️</i>' : ''}</span><span class="from">from <b>${money(from)}</b></span></button>`;
  function pickerList(cur, rows) { q('[data-picker]').scrollTop = 0; q('[data-picker]').innerHTML = `<div class="tv-pick-head"><b>Add a stop</b><small>${rows.length} places fit from ${C[cur].name}</small></div><div class="tv-stoplist">${rows.map(r => stopRow(C[r[0]], r[1], r[2], r[3], r[0] === 'bcn')).join('')}</div><p class="tv-pick-hint">Lit cities on the map are reachable. Secret fares only show when you look.</p>`; }
  function pickerOpts(cur, to, opts, sel, used) {
    const bc = Math.min(...opts.filter(o => !o.off).map(o => o.cost)), bt = Math.min(...opts.filter(o => !o.off).map(o => o.hours));
    const card = sel == null ? '' : (o => `<div class="tv-legcard" style="border-left-color:${MODES[o.mode].color}"><div class="hd"><span class="ic">${MODES[o.mode].icon}</span><div><b>${MODES[o.mode].name}</b><small>${C[cur].name} → ${C[to].name}</small></div></div>
      <dl><div><dt>Cost</dt><dd>${money(o.cost)}${o.full ? ` <s>${money(o.full)}</s>` : ''}</dd></div><div><dt>Time</dt><dd>${dur(o.hours)}</dd></div><div><dt>Budget after</dt><dd>${money(BUDGET - used.cost - o.cost)} left</dd></div><div><dt>Deadline after</dt><dd>${dur(DEADLINE - used.hours - o.hours)} left</dd></div></dl>
      ${o.deal ? `<p class="dl">🎟️ Secret fare · ${Math.round(o.deal * 100)}% off</p>` : ''}<button class="btn primary" type="button" tabindex="-1" data-addleg>Add this leg · ${money(o.cost)}</button></div>`)(opts[sel]);
    q('[data-picker]').innerHTML = `<div class="tv-pick-head"><span class="muted">How do you get to</span><b>${place(C[to])}</b><small>${Math.round(Math.hypot(C[cur].x - C[to].x, C[cur].y - C[to].y) * 2.3)} km</small><span class="lnk">change stop</span></div>
      <div class="tv-opts">${opts.map((o, n) => `<button class="tv-opt${o.off ? ' off' : ''}${!o.off && o.cost === bc ? ' best-cost' : ''}${!o.off && o.hours === bt ? ' best-time' : ''}${o.deal ? ' deal' : ''}${sel === n ? ' sel' : ''}" type="button" tabindex="-1" data-opt="${n}" style="border-left-color:${o.off ? 'transparent' : MODES[o.mode].color}"><span class="ic">${MODES[o.mode].icon}</span><span class="nm">${MODES[o.mode].name}${o.deal ? ` <em class="deal">🎟️ −${Math.round(o.deal * 100)}%</em>` : ''}<small class="${o.off ? 'off' : ''}">${o.off ? o.off : 'modelled'}</small></span><span class="nums"><b>${money(o.cost)}${o.full ? ` <s>${money(o.full)}</s>` : ''}</b><span>${dur(o.hours)}</span></span></button>`).join('')}</div>${card}${sel == null ? '<p class="tv-pick-hint">Tap an option to see the details, tap again to take it.</p>' : ''}`;
    const lc = q('.tv-legcard'); if (lc) requestAnimationFrame(() => reveal(lc)); else q('[data-picker]').scrollTop = 0;
  }
  function tip(id, html) { const t = q('[data-tip]'); if (!id) { t.hidden = true; return; } const c = C[id], r = chartPos(c.x, c.y); t.innerHTML = html; t.hidden = false; const W = q('.tut-chart').clientWidth, half = t.offsetWidth / 2 + 8; t.style.left = Math.max(half, Math.min(W - half, r[0])) + 'px'; t.style.top = r[1] + 'px'; }
  // chart coordinates to screen coordinates (the svg is sliced to fill the chart box)
  function chartPos(x, y) { const ch = q('.tut-chart'), W = ch.clientWidth, H = ch.clientHeight, s = Math.max(W / MAP.w, H / MAP.h); return [(x - MAP.w / 2) * s + W / 2, (y - MAP.h / 2) * s + H / 2]; }
  function sub(t) { q('[data-sub]').innerHTML = t; }

  /* ---------- pointer and callouts ---------- */
  let scale = 1;
  function centre(el) { const s = q('.tut-screen').getBoundingClientRect(), r = el.getBoundingClientRect(); return [(r.left + r.width / 2 - s.left) / scale, (r.top + r.height / 2 - s.top) / scale]; }
  function cursorTo(el, dx, dy) { const c = q('[data-cursor]'); if (!c || !el) return; reveal(el); const [x, y] = centre(el); c.style.transform = `translate(${x + (dx || 0)}px,${y + (dy || 0)}px)`; c.classList.add('on'); }
  function cursorOff() { const c = q('[data-cursor]'); if (c) { c.classList.remove('on'); c.style.transform = 'translate(-60px,-60px)'; } }
  function click() { const c = q('[data-cursor]'); if (!c) return; c.classList.remove('click'); void c.offsetWidth; c.classList.add('click'); }
  function callout(text, el, at, side) { // a label with a hand-drawn arrow to the element
    if (!el) return; reveal(el);
    const scr = q('.tut-screen'), s = scr.getBoundingClientRect(), r = el.getBoundingClientRect();
    // on phones the chart is a short strip, so notes show one at a time in its top-left corner and never cover the panel
    if (scr.classList.contains('col')) { clearCallouts(); at = [8, 8]; side = 'bottom'; }
    const tx = (r.left - s.left) / scale, ty = (r.top - s.top) / scale, tw = r.width / scale, th = r.height / scale;
    const n = document.createElement('div'); n.className = 'tut-note'; n.textContent = text; n.style.left = at[0] + 'px'; n.style.top = at[1] + 'px'; scr.appendChild(n);
    const nr = n.getBoundingClientRect(), nx = (nr.left - s.left) / scale, ny = (nr.top - s.top) / scale, nw = nr.width / scale, nh = nr.height / scale;
    let from = side === 'left' ? [nx, ny + nh / 2] : side === 'right' ? [nx + nw, ny + nh / 2] : side === 'top' ? [nx + nw / 2, ny] : [nx + nw / 2, ny + nh];
    const cx = tx + tw / 2, cy = ty + th / 2, plan = el.closest('.tut-plan'), col = scr.classList.contains('col');
    let to, c1;
    if (plan && !col) { // a panel target: the arrow stops at the panel's edge, level with the row, instead of crossing the panel's words
      const pr = plan.getBoundingClientRect(), pl = (pr.left - s.left) / scale; to = [pl - 5, cy - 10 + 20 * ((tx - pl) / (pr.width / scale))]; from = [nx + nw, ny + nh / 2];
      c1 = [(from[0] + to[0]) / 2 + 20, from[1] + (to[1] - from[1]) * .15];
    } else if (plan) { // on phones the panel is below the note: the arrow runs down the panel's left margin to the row
      from = [nx + 2, ny + nh]; to = [tx - 5, cy]; c1 = [from[0] - 8, (from[1] + to[1]) / 2];
    } else {
      to = Math.abs(cx - from[0]) > Math.abs(cy - from[1]) ? [cx < from[0] ? tx + tw + 6 : tx - 6, cy] : [cx, cy < from[1] ? ty + th + 6 : ty - 6];
      const mx = (from[0] + to[0]) / 2, my = (from[1] + to[1]) / 2, dx = to[0] - from[0], dy = to[1] - from[1];
      c1 = [mx - dy * .25, my + dx * .25];
    }
    const ang = Math.atan2(to[1] - c1[1], to[0] - c1[0]) * 180 / Math.PI;
    const NS = 'http://www.w3.org/2000/svg', p = document.createElementNS(NS, 'path'); p.setAttribute('d', `M${from[0]},${from[1]} Q${c1[0]},${c1[1]} ${to[0]},${to[1]}`); q('[data-arrows]').appendChild(p);
    const h = document.createElementNS(NS, 'path'); h.setAttribute('class', 'ah'); h.setAttribute('d', 'M-9,-5.5 L0,0 L-9,5.5'); h.setAttribute('transform', `translate(${to[0]},${to[1]}) rotate(${ang})`); q('[data-arrows]').appendChild(h);
  }
  // the picker clips like the real one, so whatever a step points at or taps is scrolled into view first
  function reveal(el) { const bx = el && el.closest('.tv-picker'); if (!bx) return; const top = el.getBoundingClientRect().top - bx.getBoundingClientRect().top; const y = top / scale + bx.scrollTop - 10; if (top / scale < 0 || (top + el.getBoundingClientRect().height) / scale > bx.clientHeight) bx.scrollTop = Math.max(0, y); }
  function clearCallouts() { qa('.tut-note').forEach(n => n.remove()); const a = q('[data-arrows]'); if (a) a.querySelectorAll('path').forEach(p => p.remove()); }

  /* ---------- the scenes: each one is a looping timeline ---------- */
  // Alex (2026-10-08): the walkthrough should move about five times slower than the game and hold each state ten times longer
  const SLOW = 5, HOLD = 10;
  const at = (ms, fn) => { ms *= SLOW; timers.push(setTimeout(fn, reduced ? Math.min(ms, 2000 + ms * .25) : ms)); };
  function clearScene() { timers.forEach(clearTimeout); timers = []; clearTimeout(loopT); cancelAnimationFrame(raf); clearCallouts(); }
  function loop(len, fn) { fn(); loopT = setTimeout(() => { clearScene(); loop(len, fn); }, reduced ? Math.max(12000, len * 2.5) : len * HOLD); }
  const baseLeg1 = () => { cityState({ cur: 'mad', on: ['lis'], reach: ['bcn', 'sev', 'por'], far: ['mrs', 'alg', 'tan'] }); spokes('mad', ['bcn', 'sev', 'por']); links([{ from: 'lis', to: 'mad', leg: LEG1 }]); stops([{ to: 'mad', leg: LEG1 }]); gauges(48, 3.17); sub("You're in Madrid. <span class=\"pace good\">Ahead of pace</span>"); q('.tut-plan').classList.remove('arrived'); q('[data-submit]').disabled = true; q('[data-submit]').classList.remove('ready'); q('[data-est]').hidden = true; };
  const clockFrom = sec => { const el = q('[data-clock]'); if (!el) return; started = performance.now() - sec * 1000; const tick = () => { if (!el.isConnected) return; el.textContent = T.secsF((performance.now() - started) / 1000); timers.push(setTimeout(tick, 250)); }; tick(); };
  const SCENES = [
    // 0: the mission card, then Begin
    () => loop(4600, () => { const g = q('.tut-gate'); g.classList.remove('go'); q('.tut-screen').classList.remove('swoop'); cursorOff(); cityState({ cur: 'lis', far: ['mrs', 'alg', 'tan'] }); spokes('lis', []); links([]); stops([]); gauges(0, 0); pickerList('lis', [['mad', ['train', 'bus', 'ride'], 19], ['por', ['train', 'bus'], 12], ['sev', ['train', 'bus'], 22]]); sub("You're in Lisbon.");
      at(500, () => cursorTo(q('[data-begin]'), 30, 8)); at(1500, click); at(1700, () => { g.classList.add('go'); q('.tut-screen').classList.add('swoop'); clockFrom(0); }); at(2000, cursorOff); }),
    // 1: tap a city
    () => loop(5200, () => { q('.tut-gate').classList.add('go'); cursorOff(); cityState({ cur: 'lis', reach: ['mad', 'por', 'sev'], far: ['mrs', 'alg', 'tan', 'bcn'] }); spokes('lis', ['mad', 'por', 'sev']); links([]); stops([]); gauges(0, 0); tip(null); sub("You're in Lisbon."); pickerList('lis', [['mad', ['train', 'bus', 'ride'], 19], ['por', ['train', 'bus'], 12], ['sev', ['train', 'bus'], 22]]); clockFrom(4);
      at(300, () => callout('Lit cities are within reach', q('[data-c="por"]'), [14, 14], 'bottom'));
      at(900, () => cursorTo(q('[data-c="mad"]'), 0, 0)); at(1700, () => tip('mad', `<b>${place(C.mad)}</b><small>Spain</small><div class="modes"><span>🚆 <em>$48</em></span><span>🚌 <em>$19</em></span><span>🚘 <em>$31</em></span></div><small class="hint">tap to add as a stop</small>`));
      at(2600, () => { click(); tip(null); cityState({ cur: 'lis', pend: 'mad', reach: ['por', 'sev'], far: ['mrs', 'alg', 'tan', 'bcn'] }); spokes('lis', ['por', 'sev'], true); links([], ['lis', 'mad']); pickerOpts('lis', 'mad', OPTS1, null, { cost: 0, hours: 0 }); });
      at(3000, () => callout('Your options appear here', q('[data-opt="0"]'), [250, 300], 'right')); }),
    // 2: pick a ride, add the leg
    () => loop(6400, () => { q('.tut-gate').classList.add('go'); cursorOff(); cityState({ cur: 'lis', pend: 'mad', reach: ['por', 'sev'], far: ['mrs', 'alg', 'tan', 'bcn'] }); spokes('lis', ['por', 'sev'], true); links([], ['lis', 'mad']); stops([]); gauges(0, 0); tip(null); sub("You're in Lisbon."); pickerOpts('lis', 'mad', OPTS1, null, { cost: 0, hours: 0 }); clockFrom(9);
      at(700, () => cursorTo(q('[data-opt="2"]'), 40, 0)); at(1500, () => { click(); pickerOpts('lis', 'mad', OPTS1, 2, { cost: 0, hours: 0 }); });
      at(1900, () => callout('What the leg does to your budget and deadline', q('.tv-legcard dl'), [120, 30], 'right'));
      at(2900, () => cursorTo(q('[data-addleg]'), 20, 4)); at(3700, () => { click(); clearCallouts(); cityState({ cur: 'mad', on: ['lis'], reach: ['bcn', 'sev', 'por'], far: ['mrs', 'alg', 'tan'] }); spokes('mad', []); links([{ from: 'lis', to: 'mad', leg: LEG1, draw: true }]); stops([{ to: 'mad', leg: LEG1 }]); gauges(48, 3.17); sub("You're in Madrid. <span class=\"pace good\">Ahead of pace</span>"); pickerList('mad', [['bcn', ['train', 'bus', 'plane'], 21, false], ['sev', ['train', 'bus'], 28], ['por', ['train', 'bus'], 24]]); });
      at(4300, () => { spokes('mad', ['bcn', 'sev', 'por']); cursorOff(); }); }),
    // 3: the gauges
    () => loop(6000, () => { q('.tut-gate').classList.add('go'); cursorOff(); baseLeg1(); tip(null); pickerOpts('mad', 'bcn', OPTS2, null, { cost: 48, hours: 3.17 }); clockFrom(14);
      at(400, () => callout('$32 left to spend', q('[data-g="cost"]'), [250, 60], 'right'));
      at(1300, () => callout('8h 50m before the deadline', q('[data-g="time"]'), [40, 120], 'top'));
      at(2200, () => callout('Decide fast for a bonus', q('[data-g="clock"]'), [240, 262], 'top'));
      at(3300, () => callout('Grayed out: it would break the budget', q('[data-opt="2"]'), [232, 302], 'right')); }),
    // 4: secret fares
    () => loop(5600, () => { q('.tut-gate').classList.add('go'); cursorOff(); baseLeg1(); tip(null); q('[data-deal]').classList.remove('show'); pickerList('mad', [['bcn', ['train', 'bus', 'plane'], 26, false], ['sev', ['train', 'bus'], 28], ['por', ['train', 'bus'], 24]]); clockFrom(21);
      at(700, () => cursorTo(q('[data-c="bcn"]'), 0, 0)); at(1500, () => tip('bcn', `<b>${place(C.bcn)}</b><small>Spain · destination</small><div class="modes"><span class="deal">🚆 <em>$21</em> 🏷️</span><span>🚌 <em>$26</em></span><span class="off">✈️ <em>$95</em></span></div><small class="hint">tap to add as a stop</small>`));
      at(2100, () => { q('[data-deal]').classList.add('show'); pickerList('mad', [['bcn', ['train', 'bus', 'plane'], 21, true], ['sev', ['train', 'bus'], 28], ['por', ['train', 'bus'], 24]]); });
      at(2700, () => { tip(null); callout('Found one: it stays cheap for you', q('[data-row="bcn"] .dl'), [232, 296], 'right'); }); }),
    // 5: finish and submit
    () => loop(9000, () => { q('.tut-gate').classList.add('go'); cursorOff(); baseLeg1(); tip(null); q('[data-deal]').classList.remove('show'); q('[data-report]').hidden = true; pickerList('mad', [['bcn', ['train', 'bus', 'plane'], 21, true], ['sev', ['train', 'bus'], 28], ['por', ['train', 'bus'], 24]]); clockFrom(24);
      at(600, () => cursorTo(q('[data-c="bcn"]'), 0, 0)); at(1300, () => { click(); cityState({ cur: 'mad', on: ['lis'], pend: 'bcn', reach: ['sev', 'por'], far: ['mrs', 'alg', 'tan'] }); spokes('mad', ['sev', 'por'], true); links([{ from: 'lis', to: 'mad', leg: LEG1 }], ['mad', 'bcn']); pickerOpts('mad', 'bcn', OPTS2, null, { cost: 48, hours: 3.17 }); });
      at(2100, () => cursorTo(q('[data-opt="0"]'), 40, 0)); at(2800, () => { click(); pickerOpts('mad', 'bcn', OPTS2, 0, { cost: 48, hours: 3.17 }); });
      at(3600, () => cursorTo(q('[data-addleg]'), 20, 4)); at(4300, () => { click(); cityState({ cur: 'bcn', on: ['lis', 'mad'], far: ['mrs', 'alg', 'tan', 'sev', 'por'] }); spokes('bcn', []); links([{ from: 'lis', to: 'mad', leg: LEG1 }, { from: 'mad', to: 'bcn', leg: LEG2, draw: true }]); stops([{ to: 'mad', leg: LEG1 }, { to: 'bcn', leg: LEG2 }], true); gauges(69, 5.92); sub('You made it. Submit when you are ready.'); q('[data-picker]').innerHTML = ''; q('[data-est]').hidden = false; q('.tut-plan').classList.add('arrived'); const s = q('[data-submit]'); s.disabled = false; s.classList.add('ready'); });
      at(5300, () => cursorTo(q('[data-submit]'), 30, 6)); at(6100, () => { click(); const r = q('[data-report]'); r.innerHTML = `<div class="rs"><p class="kicker">Expedition report</p><div class="rs-top"><div class="rs-rating expert"><span class="ic">🧭</span><div><b>Expert</b><small>96% of the planner's score</small></div></div><div class="rs-big"><b data-n="9120">0</b><small>score</small></div><p class="rs-verdict tie"><b>🎯 You found the planner's route</b> The best balance of money and time on the board today.</p></div><div class="chain"><span>Lisbon</span><i>→</i><span>Madrid</span><i>→</i><span>Barcelona</span></div><p class="rs-dist"><b>1,130 km</b> · $69 · 5h 55m · 1 secret fare</p></div>`; r.hidden = false; cursorOff(); const b = r.querySelector('[data-n]'), t0 = performance.now(); const run = () => { const p = Math.min(1, (performance.now() - t0) / (900 * SLOW)); b.textContent = Math.round(9120 * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1) requestAnimationFrame(run); }; requestAnimationFrame(run); }); }),
  ];

  /* ---------- the card ---------- */
  function fit() {
    const wrap = q('.tut-wrap'), scr = q('.tut-screen'); if (!wrap || !scr) return;
    const col = wrap.clientWidth < 520; scr.classList.toggle('col', col);
    const bw = col ? 400 : 720; scale = Math.min(1, wrap.clientWidth / bw);
    // the instructions must stay on screen beside the animation, so the miniature also shrinks to fit the viewport height
    const card = wrap.closest('.tut'); wrap.style.height = '0px';
    const spare = innerHeight - 32 - card.offsetHeight; if (spare < scr.offsetHeight * scale) scale = Math.max(.38, spare / scr.offsetHeight);
    scr.style.transform = `scale(${scale})`; wrap.style.height = Math.round(scr.offsetHeight * scale) + 'px';
  }
  function render(dir) {
    const s = STEPS[i]; clearScene();
    const had = q('.tut-screen');
    if (!had) box.innerHTML = `<div class="td-modal-card tut" role="dialog" aria-modal="true" aria-label="How to play" data-step="${i}">
      <button class="td-modal-x" id="tut-x" aria-label="Close">✕</button>
      <p class="kicker" data-kick></p>
      ${screenHtml()}${gateHtml()}
      <h2 data-k></h2><p class="tut-t" data-t></p>
      <div class="tut-foot"><div class="dots" data-dots></div><div class="btns" data-btns></div></div></div>`;
    const card = q('.tut'); card.dataset.step = i;
    q('[data-kick]').textContent = `How to play · ${i + 1} of ${STEPS.length}`;
    q('[data-k]').innerHTML = s.k; q('[data-t]').innerHTML = s.t;
    q('[data-dots]').innerHTML = STEPS.map((_, j) => `<i class="${j === i ? 'on' : j < i ? 'done' : ''}"></i>`).join('');
    q('[data-btns]').innerHTML = `${i > 0 ? '<button class="btn ghost" id="tut-back">Back</button>' : '<button class="btn ghost" id="tut-skip">Skip</button>'}<button class="btn primary" id="tut-next">${i < STEPS.length - 1 ? 'Next' : (onPlay ? 'Start today\'s puzzle' : 'Play today\'s puzzle')}</button>`;
    q('#tut-x').onclick = () => open(false);
    const sk = q('#tut-skip'); if (sk) sk.onclick = () => open(false);
    const bk = q('#tut-back'); if (bk) bk.onclick = () => { i--; render(-1); };
    q('#tut-next').onclick = () => { if (i < STEPS.length - 1) { i++; render(1); } else { open(false); if (!onPlay) location.href = 'play.html'; } };
    const tx = q('[data-k]').parentElement.querySelectorAll('[data-k],[data-t]'); tx.forEach(el => { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); });
    // the gate card only shows on the first step; the report overlay only on the last
    q('.tut-gate').hidden = false; if (i !== 0) q('.tut-gate').classList.add('go');
    q('[data-report]').hidden = true; q('[data-deal]').classList.remove('show');
    raf = requestAnimationFrame(() => { if (box.hidden || !q('.tut-screen')) return; card.classList.add('go'); fit(); SCENES[i](); });
  }
  function open(o) {
    box.hidden = !o; document.body.classList.toggle('td-modal-open', o);
    if (o) { i = 0; render(0); addEventListener('resize', fit); }
    else { clearScene(); box.innerHTML = ''; removeEventListener('resize', fit); try { localStorage.setItem('traverse.seen', '1'); } catch (e) {} if (location.hash === '#how') history.replaceState(null, '', location.pathname + location.search); }
  }
  window.tdTutorial = open;
  box.onclick = e => { if (e.target === box) open(false); };
  document.addEventListener('keydown', e => { if (box.hidden) return; if (e.key === 'Escape') open(false); else if (e.key === 'ArrowRight' || e.key === 'Enter') { const n = box.querySelector('#tut-next'); if (n && e.target.tagName !== 'INPUT') n.click(); } else if (e.key === 'ArrowLeft') { const b = box.querySelector('#tut-back'); if (b) b.click(); } });
})();
