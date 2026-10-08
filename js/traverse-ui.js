/* TraversleDaily play UI: the chart, two or three route choices at a time, a decisions counter, the ending, the result and your week. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search), today = T.dayNumber();
  let mode = 'today', ch;
  if (params.get('seed')) { ch = T.challengeRandom(params.get('seed')); mode = 'random'; }
  else if (params.get('day') && +params.get('day') >= 1 && +params.get('day') < today) { ch = T.challenge(+params.get('day')); mode = 'archive'; }
  else ch = T.challenge(today);
  const M = T.mission(ch), tw = ch.twist, DEC = T.decisionsFor(M), WAYS = M.ways;
  // the ways to win: from each stop on a way, the legs that carry on along it; every stop that sits on any way
  const wayStops = {}; WAYS.forEach((w, wi) => w.path.forEach(e => (wayStops[e.from] = wayStops[e.from] || []).push({ wi, e })));
  const wayCity = new Set(WAYS.flatMap(w => w.path.map(e => e.to)));
  const wayName = i => i === 0 ? "Planner's route" : 'Route ' + (i + 1);
  let shownWay = -1; // which way is drawn on the chart after the game, -1 for none
  const wayPath = () => WAYS[Math.max(0, shownWay)].path;
  const LIVE = T.liveFor(ch.seed);
  let st = T.load(); st.results = st.results || {};
  if (params.get('reset') === '1' && mode === 'today') { delete st.results[ch.key]; T.save(st); history.replaceState(null, '', location.pathname); }
  const official = mode === 'today' ? st.results[ch.key] : null;
  let practice = mode !== 'today' || !!official;

  /* ---------- state ---------- */
  let route = [], t0 = 0, playing = false, found = new Set(), showPar = false, drawn = false, dealT = null, parPending = false;
  let choices = [], sel = null, riding = false, ended = false, decisions = DEC;
  const subs = {}; const emit = (e, d) => (subs[e] || []).forEach(f => { try { f(d); } catch (x) {} });
  window.tdGame = { on: (e, f) => { (subs[e] = subs[e] || []).push(f); }, mode: () => mode, dest: () => ch.to };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEEP = ['born', 'pop', 'no'];
  function markCity(id, cls, ms) { gCities.selectAll('circle').filter(c => c.id === id).classed(cls, true); setTimeout(() => gCities.selectAll('circle').filter(c => c.id === id).classed(cls, false), ms); }
  /* a run in progress survives a refresh or an accidental back swipe: saved after every move, picked up from the mission card */
  const RUN_KEY = 'traverse.run'; let resume = null;
  try { const r = JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); if (r && r.key === ch.key && mode === 'today' && !official && Array.isArray(r.route) && r.route.length) resume = r; } catch (e) {}
  function saveRun() { if (mode !== 'today' || practice || !playing) return; try { localStorage.setItem(RUN_KEY, JSON.stringify({ key: ch.key, route, found: [...found], secs: elapsed(), decisions })); } catch (e) {} }
  function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }
  const buzz = pat => { try { if (navigator.vibrate && !reducedMotion) navigator.vibrate(pat); } catch (e) {} };
  const at = () => route.length ? T.byId[route[route.length - 1].to] : ch.from;
  const atDest = () => at().id === ch.to.id;
  const totals = () => route.reduce((a, r) => ({ cost: a.cost + r.leg.cost, hours: a.hours + r.leg.hours }), { cost: 0, hours: 0 });
  const elapsed = () => playing ? (performance.now() - t0) / 1000 : 0;
  const onRouteIds = () => new Set([ch.from.id, ...route.map(r => r.to)]);
  const twState = () => route.reduce((s, r) => tw.state(s, r.leg), 0);
  const dealKey = (a, b, l) => a.id + '-' + b.id + '|' + l.mode;
  const kmToGo = () => Math.round(T.km(at(), ch.to));
  const travelled = () => Math.round(route.reduce((a, r) => a + T.km(T.byId[r.from], T.byId[r.to]), 0));

  /* ---------- the legs you may take: the day's rule filters them, nothing else does ---------- */
  const allowed = (a, b) => T.legs(a, b, ch.seed).filter(l => tw.allow(l, twState(), b.id === ch.to.id));
  /* one leg per destination: the planner's own leg where the planner went that way, otherwise the best balance of money and time,
     with the day's rule tipping the choice (a ferry on Sea legs, a train on Rail pass, a new kind of transport on Mix it up) */
  function pickLeg(a, b, ls) {
    const onWay = (wayStops[a.id] || []).find(x => x.e.to === b.id); if (onWay) { const l = ls.find(x => x.mode === onWay.e.mode); if (l) return l; }
    const s = twState(), used = new Set(route.map(r => r.leg.mode));
    const bal = l => l.cost / M.budget + l.hours / M.deadline;
    const pref = l => (tw.id === 'ferry' && !tw.done(s) && l.mode === 'ferry') || (tw.id === 'rail' && !tw.done(s) && l.mode === 'train') || (tw.id === 'threemodes' && !used.has(l.mode) && used.size < 3) ? -0.35 : 0;
    return ls.slice().sort((x, y) => (bal(x) + pref(x)) - (bal(y) + pref(y)))[0];
  }
  /* the fewest legs from each city to the finish: along a way once you are on one, and first the legs it takes to
     reach a way. Built once, used to keep every step honest about what can still finish within your decisions. */
  let fin = null;
  function finishTable() {
    if (fin) return fin;
    const rev = {}; T.C.forEach(c => (rev[c.id] = []));
    T.C.forEach(a => T.C.forEach(b => { if (a.id !== b.id && T.legs(a, b, ch.seed).some(l => tw.allow(l, 0, b.id === ch.to.id))) rev[b.id].push(a.id); }));
    fin = { [ch.to.id]: 0 };
    WAYS.forEach(w => w.path.forEach((e, i) => { const left = w.legs - i; if (fin[e.from] === undefined || left < fin[e.from]) fin[e.from] = left; }));
    for (let round = 0; round < DEC; round++) { let moved = false; Object.keys(fin).forEach(x => rev[x].forEach(y => { if (fin[y] === undefined || fin[y] > fin[x] + 1) { fin[y] = fin[x] + 1; moved = true; } })); if (!moved) break; }
    return fin;
  }
  /* two or three ways onward: every way that carries on from here is always among them (the destination only when a
     way ends there), then detours: first ones you could still recover from, closest to the finish, then the rest */
  function choicesFrom(cur) {
    const F = finishTable(), on = onRouteIds(), left = decisions - 1, toGo = T.km(cur, ch.to);
    const nexts = (wayStops[cur.id] || []).map(x => x.e.to).filter(id => !on.has(id));
    let cands = T.C.filter(c => !on.has(c.id) && c.id !== cur.id && (c.id !== ch.to.id || nexts.includes(c.id))).map(c => { const ls = allowed(cur, c); if (!ls.length) return null; const leg = pickLeg(cur, c, ls); const f = F[c.id]; return { c, leg, fin: f === undefined ? 99 : f, safe: f !== undefined && f <= left, gain: toGo - T.km(c, ch.to) }; }).filter(Boolean);
    // never offer a dead end: a stop with no way onward to somewhere new (the destination is always fine)
    const s0 = twState(), onward = x => x.c.id === ch.to.id || T.C.some(c => c.id !== x.c.id && c.id !== cur.id && !on.has(c.id) && T.legs(x.c, c, ch.seed).some(l => tw.allow(l, tw.state(s0, x.leg), c.id === ch.to.id)));
    const live = cands.filter(onward); if (live.length) cands = live;
    const out = [], take = x => { if (x && !out.some(o => o.c.id === x.c.id) && out.length < 3) out.push(x); };
    nexts.forEach(id => take(cands.find(x => x.c.id === id)));
    // while you stand on a way, a detour never jumps straight onto another way's stops: that would be a fourth way
    const rest = cands.filter(x => !out.includes(x) && (!nexts.length || !wayCity.has(x.c.id)));
    const safe = rest.filter(x => x.safe).sort((p, q) => q.gain - p.gain), unsafe = rest.filter(x => !x.safe).sort((p, q) => q.gain - p.gain);
    if (safe.length) { take(safe[0]); take(safe.slice().sort((p, q) => p.leg.cost - q.leg.cost)[0]); }
    safe.forEach(take); unsafe.forEach(take);
    return out;
  }

  function noteDeals(a, b, ls) {
    ls.forEach(l => { if (l.deal) { const k = dealKey(a, b, l); if (!found.has(k)) { found.add(k); if (playing) { dealReveal(a, b, l); saveRun(); } } } });
  }
  /* finding a secret fare should feel like finding something */
  function dealReveal(a, b, l) {
    const el = $('#tv-deal'), full = l.full || l.cost, saved = full - l.cost;
    el.innerHTML = `<div class="ticket"><p class="k">🎟️ Secret fare</p><b><s>${T.money(full)}</s><i>→</i><span class="new">${T.money(l.cost)}</span></b><small>${l.icon} ${T.esc(l.name)} · ${T.esc(a.name)} → ${T.esc(b.name)}</small><em>Save ${T.money(saved)} · ${Math.round(l.deal * 100)}% off</em></div>`;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(dealT); dealT = setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 350); }, 3000);
    markCity(b.id, 'pop', 1600); buzz([15, 40, 25]); emit('deal', { from: a, to: b, leg: l, found: found.size });
  }

  /* ---------- static bits ---------- */
  const dayLabel = ch.n ? new Date(ch.key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Random expedition';
  const title = ch.n ? 'Puzzle #' + ch.n : 'Expedition ' + ch.seed.slice(1).toUpperCase();
  const resetIn = () => { const ms = T.untilReset(); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; };
  const pips = () => Array.from({ length: DEC }, (_, j) => `<i class="${j < decisions ? 'on' : 'off'}"></i>`).join('');
  /* the mission strip: where you are going, how many decisions are left, how far there is to go */
  function renderBrief() {
    const go = kmToGo();
    $('#tv-brief').innerHTML = `<p class="k">${title} · ${dayLabel}</p>
      <div class="route"><span class="pin s"></span><b>${T.flagImg(ch.from)} ${T.esc(ch.from.name)}<small class="cty">${T.esc(ch.from.country)}</small></b>
      <span class="ln"></span><span></span>
      <span class="pin d"></span><b>${T.flagImg(ch.to)} ${T.esc(ch.to.name)}<small class="cty">${T.esc(ch.to.country)}</small></b></div>
      <div class="dec" aria-label="${decisions} of ${DEC} decisions left"><span class="pips">${pips()}</span><b>${decisions}</b><small>decision${decisions === 1 ? '' : 's'} left</small></div>
      <p class="meta"><span class="diff ${M.difficulty.toLowerCase()}" title="${WAYS.length === 1 ? 'One route gets you there' : WAYS.length + ' routes get you there'}">${M.difficulty}</span><span>${atDest() ? '<b>Arrived</b>' : playing && route.length ? `<b>${go.toLocaleString()} km</b> to go` : `<b>${go.toLocaleString()} km</b> apart`}</span>${tw.id !== 'open' ? `<span class="twist" title="${T.esc(tw.desc)}">${tw.icon} ${T.esc(tw.name)}</span>` : ''}${found.size ? `<span title="Secret fares found">🎟️ ${found.size}</span>` : ''}</p>`;
  }
  renderBrief();
  const rhythm = ch.n ? T.rhythmOf(ch.n) : null;
  $('#tv-gate-day').textContent = title + ' · ' + dayLabel + (rhythm && rhythm.twist.id === tw.id ? ' · ' + rhythm.label : '');
  $('#tv-gate-title').innerHTML = `<span class="city">${T.flagImg(ch.from, 40)} <span>${T.esc(ch.from.name)}<small class="cty">${T.esc(ch.from.country)}</small></span></span><span class="arr">→</span><span class="city">${T.flagImg(ch.to, 40)} <span>${T.esc(ch.to.name)}<small class="cty">${T.esc(ch.to.country)}</small></span></span>`;
  $('#tv-gate-sub').textContent = `${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km, no direct route. You have ${DEC} decisions to get there.${ch.blurb ? ' ' + ch.blurb : ''}`;
  $('#tv-gate-mission').innerHTML = `
    <div class="mi big"><span class="ic">🧭</span><b>${DEC}</b><span>decisions</span></div>
    <div class="mi diff ${M.difficulty.toLowerCase()}"><span class="ic lv" aria-hidden="true"><i></i><i></i><i></i></span><b>${M.difficulty}</b><span>${WAYS.length === 1 ? 'one route gets you there' : WAYS.length + ' routes get you there'}</span></div>
    <div class="mi"><span class="ic">${tw.icon}</span><b>${T.esc(tw.name)}</b><span>${T.esc(tw.desc)}</span></div>
    <div class="mi"><span class="ic">🎟️</span><b>${M.deals} secret fare${M.deals === 1 ? '' : 's'}</b><span>cheap legs, if you look</span></div>`;
  $('#tv-gate-rules').innerHTML = `<li>Each step shows a few ways onward. Pick one and you travel there. Every pick costs a decision.</li><li>Reach ${T.esc(ch.to.name)} before the decisions run out. Spend less and arrive sooner than the planner for a better score.</li>`;
  $('#tv-gate-note').textContent = mode === 'random' ? 'Random start and destination. Practice only, not scored.' : mode === 'archive' ? 'A past puzzle. Practice only, not scored.' : practice ? "You've already played today. This run is practice." : 'Everyone playing today gets this same route, and one scored attempt.';
  if (resume) { $('#tv-start').textContent = 'Continue the journey'; $('#tv-gate-note').textContent = `You left with ${resume.route.length} leg${resume.route.length === 1 ? '' : 's'} in place and ${resume.decisions} decision${resume.decisions === 1 ? '' : 's'} left.`; }
  const locked = mode === 'archive' && T.dayLocked(ch.n);
  if (locked) {
    $('#tv-gate-mission').innerHTML = `<div class="tv-lock"><span class="ic">🔒</span><b>This puzzle is in the Traversle + archive</b><p>The last ${T.FREE_DAYS} days are free to replay. Traversle + opens every puzzle since day one.</p><a class="btn primary" href="plus.html">See Traversle +</a> <a class="btn ghost" href="archive.html">Back to the archive</a></div>`;
    $('#tv-gate-rules').hidden = true; $('#tv-start').hidden = true; $('#tv-gate-note').hidden = true;
  }
  $('#tv-source').textContent = LIVE
    ? `Flights: average of real one-way economy fares for ${LIVE.depart}, fetched ${new Date(LIVE.fetched).toUTCString().slice(5, 22)} UTC. Ground and sea legs: modelled from distance and calibrated to those fares.`
    : 'No live fares for this puzzle, so flights are modelled from distance.';

  /* ---------- map ---------- */
  const svg = d3.select('#tv-svg');
  const proj = d3.geoNaturalEarth1().fitSize([960, 500], { type: 'Sphere' });
  const path = d3.geoPath(proj);
  const feats = topojson.feature(WORLD_TOPO, WORLD_TOPO.objects.countries).features;
  // the chart itself (sea, graticule, rhumb lines, coasts, land, country names) lives in its own svg, so the
  // pulsing and flowing bits on the interactive svg above it never make the heavy chart repaint
  const chart = d3.select('#tv-chart'), gc = chart.append('g');
  const g = svg.append('g');
  gc.append('path').attr('class', 'tv-sphere').attr('d', path({ type: 'Sphere' }));
  // an old chart: graticule, water lines along the coast, then the land
  gc.append('path').attr('class', 'tv-grat').attr('d', path(d3.geoGraticule().step([10, 10])()));
  // rhumb lines radiating from compass roses out at sea, as on a portolan chart
  const ROSES = [[-40, 25], [-30, -30], [70, -15], [170, 10], [-150, -30], [20, 60]];
  const rh = gc.append('g');
  ROSES.forEach(([lo, la]) => { const [x, y] = proj([lo, la]); for (let a = 0; a < 32; a++) { const t = a * Math.PI / 16; rh.append('line').attr('class', 'tv-rhumb').attr('x1', x).attr('y1', y).attr('x2', x + Math.cos(t) * 700).attr('y2', y + Math.sin(t) * 700); } });
  rh.attr('clip-path', null);
  ROSES.slice(0, 4).forEach(([lo, la]) => { const [x, y] = proj([lo, la]); const r = 9; let d = ''; for (let i = 0; i < 16; i++) { const t = i * Math.PI / 8, L = i % 2 ? r * .55 : r, w = i % 2 ? r * .08 : r * .14; d += `M${x + Math.cos(t) * L},${y + Math.sin(t) * L}L${x + Math.cos(t + Math.PI / 2) * w},${y + Math.sin(t + Math.PI / 2) * w}L${x + Math.cos(t - Math.PI / 2) * w},${y + Math.sin(t - Math.PI / 2) * w}Z`; } gc.append('path').attr('class', 'tv-rose').attr('d', d); });
  // the water lines along the coast are wide soft strokes, so they use the simplified outline and hide while the chart moves
  const LITE = window.WORLD_LITE || WORLD_TOPO;
  const landAll = topojson.merge(LITE, LITE.objects.countries.geometries);
  ['tv-coast c3', 'tv-coast c2', 'tv-coast'].forEach(c => gc.append('path').attr('class', c).attr('d', path(landAll)));
  gc.append('g').selectAll('path').data(feats).join('path').attr('class', 'tv-land').attr('d', path);
  const gCountry = gc.append('g');
  gCountry.selectAll('text').data(feats.filter(f => path.area(f) > 60)).join('text').attr('class', 'tv-cname')
    .attr('transform', f => { const c = path.centroid(f); return `translate(${c[0]},${c[1]})`; }).text(f => (f.properties.name || '').toUpperCase()).style('display', 'none');
  const gSpokes = g.append('g'), gCourse = g.append('g'), gPar = g.append('g'), gLinks = g.append('g'), gBadges = g.append('g'), gHits = g.append('g'), gCities = g.append('g'), gLabels = g.append('g');
  const pos = c => proj([c.lon, c.lat]);
  const tip = $('#tv-tip'), stage = $('#tv-stage');
  g.append('g').attr('class', 'tv-pulse-g').attr('transform', `translate(${pos(ch.to)[0]},${pos(ch.to)[1]})`).append('circle').attr('class', 'tv-pulse');
  gCities.selectAll('circle').data(T.C).join('circle')
    .attr('class', 'tv-city').attr('r', c => 2 + c.hub * 0.5)
    .attr('cx', c => pos(c)[0]).attr('cy', c => pos(c)[1]).style('pointer-events', 'none');
  // generous hit targets so cities are easy to tap, with the label part of the target too
  const wire = sel => sel.on('click', (e, c) => { e.stopPropagation(); hideTip(); tapCity(c); })
    .on('mouseenter', (e, c) => { if (e.pointerType !== 'touch') showTip(c, e); }).on('mousemove', e => moveTip(e)).on('mouseleave', hideTip)
    .on('touchstart', (e, c) => { e.stopPropagation(); showTip(c, e.touches[0]); }, { passive: true });
  wire(gHits.selectAll('circle').data(T.C).join('circle').attr('class', 'tv-hit').attr('r', 9).attr('cx', c => pos(c)[0]).attr('cy', c => pos(c)[1]));
  wire(gLabels.selectAll('text').data(T.C).join('text').attr('class', c => 'tv-label' + (c.hub >= 2 ? '' : ' minor'))
    .attr('x', c => pos(c)[0] + 5).attr('y', c => pos(c)[1] + 3.2).text(c => c.name));
  svg.on('click', hideTip);

  let k = 1;
  const strokeW = d => (d.cls === 'ghost' ? 1.4 : d.cls === 'flow' ? 1.2 : d.cls === 'par' ? 1.6 : 2.2) / k;
  // dash patterns in screen pixels, whatever the zoom
  const DASH = { spoke: [2, 3], ghost: [3, 4], par: [6, 4], train: [7, 4], bus: [3, 3], ferry: [1, 4], car: [10, 3, 2, 3], ride: [10, 3, 2, 3] };
  const dashFor = cls => { const d = DASH[cls]; return d ? d.map(x => x / k).join(' ') : null; };
  // while the chart swoops in on start, only the transform moves; labels and routes are relaid at the end
  const relayout = () => {
    const s = k;
    drawMap();
    gLabels.selectAll('text').style('font-size', (9.5 / s) + 'px').attr('x', c => pos(c)[0] + 5 / s).attr('y', c => pos(c)[1] + 3.2 / s);
    gHits.selectAll('circle').attr('r', 9 / s);
    gCountry.selectAll('text').style('display', k >= 2.6 ? null : 'none').style('font-size', (7 / s * 1.2) + 'px');
    gBadges.selectAll('g').attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / s})`);
    g.select('.tv-pulse-g').attr('transform', `translate(${pos(ch.to)[0]},${pos(ch.to)[1]}) scale(${1 / s})`); g.select('.tv-pulse').style('stroke-width', 1);
    layoutLabels();
  };
  const zoom = d3.zoom().scaleExtent([1, 14]).translateExtent([[-80, -40], [1040, 540]]).on('zoom', e => {
    g.attr('transform', e.transform); gc.attr('transform', e.transform); k = e.transform.k;
    moving();
    if (!stage.classList.contains('zooming')) relayout();
    else { // mid-swoop: only the cheap bits follow the zoom, so markers keep their size while the chart moves
      gCities.selectAll('circle').attr('r', c => (2 + c.hub * 0.5 + (c.id === ch.from.id || c.id === ch.to.id ? 1 : 0)) / k).style('stroke-width', 1 / k);
      g.select('.tv-pulse-g').attr('transform', `translate(${pos(ch.to)[0]},${pos(ch.to)[1]}) scale(${1 / k})`);
    }
  }).on('start', () => { svg.classed('dragging', true); hideTip(); }).on('end', () => svg.classed('dragging', false));
  svg.call(zoom);
  // while the chart moves the coast glow is off, then it fades back in once the chart settles
  let moveT = null;
  function moving() { stage.classList.add('moving'); clearTimeout(moveT); moveT = setTimeout(() => stage.classList.remove('moving'), 180); }

  const parIds = () => new Set(showPar ? wayPath().map(e => e.to) : []);
  const labelOn = c => c.id === ch.from.id || c.id === ch.to.id || onRouteIds().has(c.id) || parIds().has(c.id) || choiceIds().has(c.id) || (c.hub >= 3 && k >= 1.8) || (c.hub >= 2 && k >= 2.6) || (c.hub >= 1 && k >= 3.6) || k >= 5;
  function layoutLabels() {
    const s = k, boxes = [], vis = {};
    const pri = c => (c.id === ch.from.id || c.id === ch.to.id ? 100 : choiceIds().has(c.id) ? 95 : onRouteIds().has(c.id) ? 90 : parIds().has(c.id) ? 80 : c.hub * 10);
    T.C.filter(labelOn).sort((a, b) => pri(b) - pri(a)).forEach(c => {
      const [x, y] = pos(c); const w = c.name.length * 5.6 / s, h = 11 / s;
      const bx = { x0: x + 4 / s, y0: y - h / 2, x1: x + 4 / s + w, y1: y + h / 2 };
      if (!boxes.some(b => bx.x0 < b.x1 && bx.x1 > b.x0 && bx.y0 < b.y1 && bx.y1 > b.y0)) { boxes.push(bx); vis[c.id] = true; }
    });
    gLabels.selectAll('text').style('display', c => vis[c.id] ? null : 'none');
  }
  $('#tv-zin').onclick = () => svg.transition().call(zoom.scaleBy, 1.6);
  $('#tv-zout').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.6);
  $('#tv-zfit').onclick = () => fitRoute();
  document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === '+' || e.key === '=') $('#tv-zin').click(); else if (e.key === '-') $('#tv-zout').click(); else if (e.key === 'Escape') { if (!$('#tv-modal').hidden) closeModal(); else unselect(); } else if (/^[1-3]$/.test(e.key) && playing && !riding && choices[+e.key - 1]) { if (sel === +e.key - 1) travel(sel); else select(+e.key - 1); } else if (e.key === 'Enter' && sel !== null && playing && !riding) travel(sel); });
  function fitTo(points, pad, dur, ease, delay, offset) {
    const xs = points.map(p => pos(p)[0]), ys = points.map(p => pos(p)[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const r = stage.getBoundingClientRect(); const aspect = r.width / r.height;
    const vw = aspect > 960 / 500 ? 960 : 500 * aspect, vh = aspect > 960 / 500 ? 960 / aspect : 500;
    const w = Math.max(60, (x1 - x0) * (pad || 1.6)), h = Math.max(40, (y1 - y0) * (pad || 1.6));
    const kk = Math.min(12, Math.max(1, Math.min(vw / w, vh / h) * 0.9));
    const cx = (x0 + x1) / 2 + (window.innerWidth > 900 ? (offset == null ? 120 : offset) / kk : 0);
    // on a phone the planning sheet covers the lower part of the chart, so the route lands in the strip above it
    // the choice dock covers the lower part of the chart while you decide, so the picture lands in the strip above it
    const dk = $('#tv-choices'), docked = dk && !dk.hidden, cy = docked ? (window.innerWidth <= 900 ? 150 : 205) : 250;
    return svg.transition().delay(delay || 0).duration(dur == null ? 750 : dur).ease(ease || d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity.translate(480 - kk * cx, cy - kk * (y0 + y1) / 2).scale(kk));
  }
  function fitRoute() { fitTo([ch.from, ch.to, ...route.map(r => T.byId[r.to]), ...(showPar ? wayPath().map(e => T.byId[e.to]) : [])], 1.8); }
  const arc = (a, b) => path({ type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] });
  const mid = (a, b) => proj(d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(0.5));

  /* ---------- the chart: where you are, where you can go, where you have been ---------- */
  const choiceIds = () => new Set(choices.map(x => x.c.id));
  function drawMap() {
    const cur = at(), on = onRouteIds(), par = parIds(), opts = choiceIds();
    const live = playing && !atDest() && !ended;
    // spokes: the ways onward from where you stand; the one you are looking at stays bright
    const spokes = live ? choices.map((x, i) => ({ cls: 'spoke' + (sel !== null && sel !== i ? ' dim' : '') + (x.leg.deal ? ' deal' : '') + (x.c.id === ch.to.id ? ' fin' : ''), d: arc(cur, x.c) })) : [];
    gSpokes.selectAll('path').data(spokes).join('path').attr('class', d => 'tv-spoke ' + d.cls).attr('d', d => d.d).style('stroke-width', 1.1 / k).style('stroke-dasharray', dashFor('spoke'));
    const picked = sel !== null && choices[sel] ? choices[sel].c.id : null;
    gCities.selectAll('circle').attr('class', function (c) { return 'tv-city'
      + (c.id === cur.id && live ? ' cur' : c.id === ch.from.id ? ' start' : c.id === ch.to.id ? ' dest' : on.has(c.id) ? ' on' : c.id === picked ? ' pend' : live && opts.has(c.id) ? ' opt' : par.has(c.id) ? ' par' : live ? ' far' : '')
      + KEEP.filter(k => this.classList.contains(k)).map(k => ' ' + k).join(''); });
    gLabels.selectAll('text').classed('far', c => live && !opts.has(c.id) && c.id !== ch.to.id && c.id !== ch.from.id && !on.has(c.id));
    gCities.selectAll('circle').attr('r', c => (2 + c.hub * 0.5 + (c.id === cur.id && live ? 1.5 : live && opts.has(c.id) ? 1.2 : c.id === ch.from.id || c.id === ch.to.id || on.has(c.id) || par.has(c.id) ? 1 : 0)) / k).style('stroke-width', c => ((c.id === cur.id && live) ? 8 : c.id === picked ? 6 : 1) / k);
    layoutLabels();
    const plinks = showPar ? wayPath().map(e => ({ cls: 'par', d: arc(T.byId[e.from], T.byId[e.to]) })) : [];
    gPar.selectAll('path').data(plinks).join('path').attr('class', function () { return 'tv-link par' + (this.classList.contains('draw') ? ' draw' : ''); }).attr('d', d => d.d).style('stroke-width', strokeW).style('stroke-dasharray', function () { return this.classList.contains('draw') ? '1' : dashFor('par'); });
    const links = [];
    route.forEach(r => { const a = T.byId[r.from], b = T.byId[r.to]; links.push({ cls: r.leg.mode, d: arc(a, b), col: T.MODES[r.leg.mode].color }); links.push({ cls: 'flow', d: arc(a, b) }); });
    if (picked) links.push({ cls: 'ghost', d: arc(cur, T.byId[picked]) });
    gLinks.selectAll('path').data(links).join('path').attr('class', function (d) { return 'tv-link ' + d.cls + (this.classList.contains('draw') ? ' draw' : '') + (this.classList.contains('undraw') ? ' undraw' : ''); }).attr('d', d => d.d).style('stroke', d => d.col || null).style('stroke-width', strokeW).style('stroke-dasharray', function (d) { return this.classList.contains('draw') ? '1' : dashFor(d.cls); });
    const badges = route.map((r, i) => { const [x, y] = mid(T.byId[r.from], T.byId[r.to]); return { x, y, cls: '', txt: `${i + 1} · ${r.leg.icon} ${T.money(r.leg.cost)} · ${T.dur(r.leg.hours)}${r.leg.deal ? ' 🎟️' : ''}` }; });
    if (showPar) wayPath().forEach(e => { if (route.some(r => r.from === e.from && r.to === e.to && r.leg.mode === e.mode)) return; const [x, y] = mid(T.byId[e.from], T.byId[e.to]); badges.push({ x, y: y + 14 / k, cls: 'par', txt: `${T.MODES[e.mode].icon} ${T.money(e.cost)} · ${T.dur(e.hours)}` }); });
    const bsel = gBadges.selectAll('g').data(badges).join(enter => { const gg = enter.append('g'); gg.append('rect'); gg.append('text'); return gg; });
    bsel.attr('class', d => 'tv-badge ' + d.cls).attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / k})`);
    bsel.select('text').text(d => d.txt).attr('y', 3);
    bsel.select('rect').each(function (d) { const w = d.txt.length * 4.9 + 12; d3.select(this).attr('x', -w / 2).attr('y', -8).attr('width', w).attr('height', 16).attr('rx', 8); });
  }

  /* ---------- tooltip: a city's name, and the leg there when it is one of the ways onward ---------- */
  function showTip(c, ev) {
    if (ev && ev.clientX !== undefined) moveTip(ev);
    const x = choices.find(o => o.c.id === c.id);
    tip.innerHTML = `<b>${T.flagImg(c)} ${T.esc(c.name)}</b><small>${T.esc(c.country)}</small>${x ? `<div class="modes"><span class="${x.leg.deal ? 'deal' : ''}">${x.leg.icon} ${T.esc(x.leg.name)} · <em>${T.money(x.leg.cost)}</em> · ${T.dur(x.leg.hours)}</span></div>` : ''}`;
    tip.hidden = false;
  }
  function moveTip(e) { const r = stage.getBoundingClientRect(); tip.style.left = Math.min(r.width - 230, e.clientX - r.left + 14) + 'px'; tip.style.top = Math.max(8, e.clientY - r.top - 10) + 'px'; }
  function hideTip() { tip.hidden = true; }
  function tapCity(c) {
    if (!playing || riding || ended || atDest()) return;
    const i = choices.findIndex(x => x.c.id === c.id);
    if (i < 0) { markCity(c.id, 'no', 600); return; }
    if (sel === i) travel(i); else select(i);
  }

  /* ---------- the choices: a few ways onward, one card each ---------- */
  const dock = $('#tv-choices');
  function renderChoices() {
    const cur = at();
    if (!playing || ended || atDest() || !choices.length) { dock.hidden = true; dock.innerHTML = ''; return; }
    dock.hidden = false;
    dock.innerHTML = `<p class="tv-choices-h"><span>From <b>${T.esc(cur.name)}</b></span><span class="n">${choices.length === 1 ? 'the only way onward · ' : ''}${decisions} decision${decisions === 1 ? '' : 's'} left</span></p>
      <div class="tv-cards">${choices.map((x, i) => { const l = x.leg, fin = x.c.id === ch.to.id, gain = Math.round(x.gain); return `<button class="tv-choice${sel === i ? ' sel' : ''}${fin ? ' fin' : ''}${l.deal ? ' deal' : ''}" data-i="${i}" aria-pressed="${sel === i}">
        <span class="key">${i + 1}</span>
        <span class="city">${T.flagImg(x.c)} <b>${T.esc(x.c.name)}</b><small>${fin ? 'Destination' : T.esc(x.c.country)}</small></span>
        <span class="leg"><i>${l.icon}</i> ${T.esc(l.name)}${l.deal ? ' <em>secret fare</em>' : ''}</span>
        <span class="nums"><b>${l.deal ? `<s>${T.money(l.full)}</s> ` : ''}${T.money(l.cost)}</b><span>${T.dur(l.hours)}</span></span>
        <span class="dist ${gain >= 0 ? 'closer' : 'farther'}">${fin ? 'arrives' : (gain >= 0 ? Math.abs(gain).toLocaleString() + ' km closer' : Math.abs(gain).toLocaleString() + ' km farther')}</span>
        <span class="go">${fin ? 'Arrive' : 'Travel'} →</span>
      </button>`; }).join('')}</div>`;
    dock.querySelectorAll('.tv-choice').forEach(b => { b.onclick = () => { const i = +b.dataset.i; if (sel === i) travel(i); else select(i); }; b.onmouseenter = () => { if (sel === null) preview(+b.dataset.i); }; b.onmouseleave = () => { if (sel === null) preview(null); }; });
  }
  let hover = null;
  function preview(i) { hover = i; gSpokes.selectAll('path').classed('hot', (d, j) => j === i); }
  function select(i) {
    if (riding || ended) return; sel = i; const x = choices[i];
    renderChoices(); drawMap(); hideTip();
    fitTo([at(), x.c], 2.2, 600); emit('select', x);
  }
  function unselect() { if (sel === null) return; sel = null; renderChoices(); drawMap(); }
  /* a step: work out the ways onward, show them, bring the chart to them; a secret fare on one of them is found by looking */
  function step() {
    choices = choicesFrom(at()); sel = null;
    choices.forEach(x => noteDeals(at(), x.c, [x.leg]));
    renderBrief(); renderChoices(); drawMap(); fresh();
    if (!choices.length) { fail('No way onward from ' + at().name + '.'); return; }
    fitTo([at(), ...choices.map(x => x.c)], 1.9, 800);
    emit('step', { from: at(), choices, decisions });
  }
  /* travel: the leg draws itself, a rider follows it, the decision is spent, then the next step or the ending */
  function travel(i) {
    const x = choices[i]; if (!x || riding || ended) return;
    riding = true; sel = null; const from = at(); decisions--;
    route.push({ from: from.id, to: x.c.id, leg: x.leg }); choices = [];
    renderBrief(); renderChoices(); saveRun(); buzz(12); hideTip();
    const burn = $('#tv-brief .pips i.on:last-of-type'); if (burn) burn.classList.add('burn');
    drawMap(); drawNewLeg(x.c.id);
    stage.classList.add('riding');
    const dur = reducedMotion ? 0 : 1000;
    fitTo([from, x.c], 2.0, Math.min(dur, 700));
    ride(from, x.c, x.leg, dur, () => {
      stage.classList.remove('riding'); riding = false; markCity(x.c.id, 'born', 700);
      emit('travel', { to: x.c, legs: route.length, decisions });
      if (atDest()) arrive(); else if (decisions <= 0) fail(); else setTimeout(step, reducedMotion ? 0 : 150);
    });
  }
  /* the rider: a small marker that runs along the new leg */
  const gRider = g.append('g').attr('class', 'tv-rider').style('display', 'none');
  gRider.append('circle').attr('r', 7); gRider.append('text').attr('y', 3.5);
  function ride(a, b, leg, dur, done) {
    if (!dur) { done(); return; }
    const p = gCourse.append('path').attr('d', arc(a, b)).style('display', 'none').node(), L = p.getTotalLength();
    gRider.style('display', null).select('text').text(leg.icon);
    const t0r = performance.now();
    const f = now => { const t = Math.min(1, (now - t0r) / dur), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, pt = p.getPointAtLength(L * e); gRider.attr('transform', `translate(${pt.x},${pt.y}) scale(${1 / k})`); if (t < 1) requestAnimationFrame(f); else { gRider.style('display', 'none'); p.remove(); done(); } };
    requestAnimationFrame(f);
  }
  function drawNewLeg(toId) {
    const ps = gLinks.selectAll('path').filter(d => d.cls !== 'flow' && d.cls !== 'ghost').nodes(), p = ps[ps.length - 1]; if (!p || reducedMotion) return;
    stage.classList.add('drawing'); p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.classList.add('draw');
    setTimeout(() => { p.classList.remove('draw'); p.removeAttribute('pathLength'); stage.classList.remove('drawing'); drawMap(); }, 620);
  }
  let freshT = null; function fresh() { if (reducedMotion) return; stage.classList.remove('fresh'); void stage.offsetWidth; stage.classList.add('fresh'); clearTimeout(freshT); freshT = setTimeout(() => stage.classList.remove('fresh'), 900); }
  let toastT; function toast(m, kind) { let t = $('.tv-toast'); if (!t) { t = document.createElement('div'); t.className = 'tv-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.classList.toggle('no', kind === 'no'); if (kind === 'no') buzz(30); t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), kind === 'no' ? 2600 : 2200); }
  /* a stamp across the chart: you made it, or the expedition ended */
  function stamp(kicker, text, sub, cls) { const el = $('#tv-stamp'); el.innerHTML = `<small>${T.esc(kicker)}</small><b>${T.esc(text)}</b><span>${T.esc(sub)}</span>`; el.className = 'tv-stamp ' + cls; el.hidden = false; }

  /* ---------- the two endings ---------- */
  function arrive() {
    ended = true; playing = false; clearRun(); clearInterval(timer);
    const secs = sinceStart; stage.classList.add('arrived'); buzz([10, 30, 10]); justPlayed = true; hideTip();
    stamp('Expedition complete', 'You made it', `${ch.to.name} in ${DEC - decisions} decision${DEC - decisions === 1 ? '' : 's'}`, 'won'); renderBrief(); renderChoices();
    fitRoute(); emit('arrive', at());
    setTimeout(() => finish(secs, false), reducedMotion ? 300 : 1700);
  }
  function fail(reason) {
    ended = true; playing = false; clearRun(); clearInterval(timer);
    const secs = sinceStart; stage.classList.add('lost'); buzz([40, 60, 40]); hideTip();
    stamp('Expedition ended', reason ? 'No way onward' : 'Out of decisions', `Stranded in ${at().name} · ${kmToGo().toLocaleString()} km short`, 'lost'); renderBrief(); renderChoices(); drawMap();
    fitRoute(); emit('fail', { at: at(), reason });
    setTimeout(() => finish(secs, true, reason), reducedMotion ? 300 : 1900);
  }
  let sinceStart = 0, timer = null, justPlayed = false;
  function finish(secs, failed, reason) {
    const tt = totals(); const sc = failed ? 0 : T.score(tt.cost, tt.hours, secs, M), tr = failed ? { name: 'Stranded', icon: '🧭' } : T.tier(sc, M);
    const res = { from: ch.from.id, score: sc, tier: tr.name, cost: Math.round(tt.cost), hours: tt.hours, secs: Math.round(secs * 10) / 10, route: route.map(r => ({ to: r.to, mode: r.leg.mode, cost: r.leg.cost, hours: r.leg.hours, deal: r.leg.deal || 0 })),
      deals: { found: found.size, total: M.deals, used: route.filter(r => r.leg.deal).length }, decisions: DEC - decisions, decisionsTotal: DEC, par: { cost: M.par.cost, hours: M.par.hours, legs: M.par.legs }, parMatch: !failed && tt.cost <= M.par.cost + 1 && tt.hours <= M.par.hours + 0.05, twist: tw.id, at: Date.now() };
    if (failed) { res.failed = true; res.endedAt = at().id; res.kmShort = kmToGo(); res.reason = reason || null; }
    if (!practice) {
      st = T.load(); st.results = st.results || {};
      const before = T.progression(st.results), prior = Object.assign({}, st.results);
      if (!st.results[ch.key]) { st.results[ch.key] = res; T.save(st); }
      practice = true;
      showResult(res, false, T.progression(st.results).xp - before.xp, false, T.newlyEarned(prior, st.results));
    } else showResult(res, true, 0);
  }

  /* ---------- flow ---------- */
  function start() {
    route = []; sel = null; choices = []; playing = false; ended = false; riding = false; found = new Set(); showPar = false; shownWay = -1; drawn = false; decisions = DEC;
    const picked = resume; resume = null; if (!picked) clearRun();
    if (picked) { route = picked.route; found = new Set(picked.found || []); decisions = Math.max(1, picked.decisions); }
    stage.classList.remove('arrived', 'lost', 'intro'); $('#tv-stamp').hidden = true; hideTip();
    $('#tv-result').hidden = true; $('#tv-board').hidden = true; dock.hidden = true;
    const gate = $('#tv-gate'); gate.classList.add('off'); stage.classList.add('zooming');
    gCourse.selectAll('path').remove();
    const dur = reducedMotion ? 0 : 1100;
    fitTo([ch.from, ch.to], 1.8, dur, d3.easeCubicOut).on('end interrupt', () => {
      gate.hidden = true; gate.classList.remove('off'); stage.classList.remove('zooming'); relayout();
      playing = true; t0 = performance.now() - (picked ? picked.secs * 1000 : 0); emit('start');
      clearInterval(timer); timer = setInterval(() => { sinceStart = elapsed(); }, 250);
      renderBrief();
      if (picked) toast(`Picked up where you left off: ${route.length} leg${route.length === 1 ? '' : 's'} in place.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (atDest()) arrive(); else setTimeout(step, reducedMotion ? 0 : 200);
    });
  }
  $('#tv-start').onclick = start;

  /* ---------- the expedition report: journey, performance, route vs planner, score breakdown ---------- */
  const factors = res => {
    const mF = Math.pow(Math.min(1, M.cheapest / res.cost), 1.1), tF = Math.pow(Math.min(1, M.fastest / res.hours), 1.1);
    const decF = Math.exp(-Math.max(0, res.secs - 30) / 240), dF = M.deals ? (res.deals ? res.deals.found : 0) / M.deals : 1;
    return { cost: Math.round(100 * mF), time: Math.round(100 * tF), deals: Math.round(100 * dF), eff: Math.round(100 * Math.sqrt(mF * tF)), speed: Math.round(20 * decF), mF, tF, dF };
  };
  const parMatchOf = res => res.cost <= M.par.cost + 1 && res.hours <= M.par.hours + 0.05;
  function verdict(res) {
    const ps = T.score(res.cost, res.hours, 0, M), pp = M.par.score;
    const dc = res.cost - M.par.cost, dh = res.hours - M.par.hours;
    if (parMatchOf(res)) return { cls: 'tie', h: "🎯 You found the planner's route", t: "That's the best balance of money and time anyone could find today." };
    if (ps > pp + 5) return { cls: 'win', h: '🧠 You outsmarted the planner', t: dc < -0.5 ? `You saved ${T.money(-dc)}${dh < -0.05 ? ' and ' + T.dur(-dh) : ''}.` : `You got there ${T.dur(-dh)} faster.` };
    return { cls: 'lose', h: '🧭 The planner wins this one', t: dc > 0.5 ? `You were ${T.money(dc)} more expensive${dh > 0.05 ? ' and ' + T.dur(dh) + ' slower' : ''}.` : dh > 0.05 ? `You were ${T.dur(dh)} slower.` : 'Just behind on the balance of money and time.' };
  }
  const routeCol = (title, rt, cost, hours, cls) => `<div class="col ${cls}"><h5>${title}</h5><ol>${[ch.from, ...rt.map(r => T.byId[r.to])].map((c, i) => (i ? `<li class="lg"><span class="ar">↓</span><span>${T.MODES[rt[i - 1].mode].icon} ${T.MODES[rt[i - 1].mode].name}${rt[i - 1].deal ? ' 🎟️' : ''}</span><small>${T.money(rt[i - 1].cost)} · ${T.dur(rt[i - 1].hours)}</small></li>` : '') + `<li class="st${i === 0 ? ' s' : i === rt.length ? ' d' : ''}">${T.esc(c.name)}</li>`).join('')}</ol><div class="tot"><b>${T.money(cost)}</b><span>${T.dur(hours)}</span><span>${rt.length} legs</span></div></div>`;
  /* the daily loop: what tomorrow brings, when, and how the streak stands */
  function tomorrowLine() {
    const R = (st && st.results) || {}, S = T.stats(R, today), nx = ch.n ? T.rhythmOf(ch.n + 1) : null;
    const y = ch.n > 1 ? R[T.dayKey(ch.n - 1)] : null, t = R[ch.key], yd = y && t ? t.score - y.score : 0;
    return `${nx ? `Tomorrow is <b>${T.esc(nx.label)}</b> · ` : ''}next puzzle in <b>${resetIn()}</b>${S.streak > 1 ? ` · <b>${S.streak}-day</b> streak` : ''}${y && t ? `<br>Yesterday you scored <b>${y.score.toLocaleString()}</b>${yd ? ` · today <b>${yd > 0 ? '+' : '−'}${Math.abs(yd).toLocaleString()}</b>` : ''}` : ''}`;
  }
  function buildSummary(res, isPractice, xpGain, earned, full) {
    const tr = T.tier(res.score, M), ofPar = Math.round(100 * res.score / Math.max(1, M.par.score)), f = factors(res), v = verdict(res);
    const prog = T.progression(T.load().results || {}), lvlPct = prog.next ? Math.round(100 * prog.into / prog.span) : 100;
    const parRoute = M.par.path.map(e => ({ to: e.to, mode: e.mode, cost: e.cost, hours: e.hours, deal: e.deal }));
    const found = res.deals ? res.deals.found : 0, parDeals = M.par.path.filter(e => e.deal).length;
    const modesUsed = Object.keys(T.MODES).filter(m => res.route.some(r => r.mode === m)).map(m => T.MODES[m].icon).join(' ');
    const stops = [ch.from, ...res.route.map(r => T.byId[r.to])];
    const chain = stops.map(c => `<span>${T.esc(c.name)}</span>`).join('<i>→</i>');
    const km = Math.round(stops.slice(1).reduce((a, c, i) => a + T.km(stops[i], c), 0)), nations = new Set(stops.map(c => c.country)).size;
    const perf = (lab, you, best, ok, delta) => `<div class="prow ${ok ? 'good' : 'bad'}"><span class="l">${lab}</span><span class="y"><small>You</small><b>${you}</b></span><span class="b"><small>Best</small><b>${best}</b></span><i>${ok ? '✓' : delta}</i></div>`;
    const bar = (lab, val, cls) => `<div class="brow ${cls || ''}"><span>${lab}</span><div class="bar"><i style="width:${val}%" data-w="${val}"></i></div><b><span data-count="${val}">${val}</span> <small>/ 100</small></b></div>`;
    const tags = [res.cost < M.par.cost - 0.5 ? ['you', 'Cheaper'] : res.cost > M.par.cost + 0.5 ? ['par', 'Planner cheaper'] : ['tie', 'Same cost'], res.hours < M.par.hours - 0.05 ? ['you', 'Faster'] : res.hours > M.par.hours + 0.05 ? ['par', 'Planner faster'] : ['tie', 'Same time'], res.route.length < M.par.legs ? ['you', 'Fewer legs'] : res.route.length > M.par.legs ? ['par', 'Planner fewer legs'] : ['tie', 'Same legs'], [found >= parDeals ? 'you' : 'par', `Deals ${res.deals ? res.deals.used : 0} vs ${parDeals} used`]];
    return `
      <p class="kicker"><b>Journey complete</b> · ${isPractice ? (mode === 'today' ? 'practice run, not scored' : mode === 'archive' ? 'archive practice, not scored' : 'random expedition, not scored') : 'official result · ' + dayLabel}</p>
      <section class="rs-journey">
        <p class="lab">Your journey</p>
        <div class="chain">${chain}</div>
        <p class="rs-dist"><b data-count="${km}" data-fmt="km">${km.toLocaleString()} km</b> across <b>${nations} ${nations === 1 ? 'country' : 'countries'}</b></p>
        <div class="rs-stats"><div><b data-count="${Math.round(res.cost)}" data-fmt="money">${T.money(res.cost)}</b><span>spent</span></div><div><b>${T.dur(res.hours)}</b><span>travel time</span></div><div><b>${res.decisions || res.route.length}/${res.decisionsTotal || DEC}</b><span>decisions</span></div><div><b class="ic">${modesUsed}</b><span>modes</span></div><div><b>${found}/${M.deals}</b><span>secret fares</span></div></div>
      </section>
      <section class="rs-top">
        <div class="rs-rating ${tr.name.toLowerCase()}"><span class="ic">${tr.icon}</span><div><b>${tr.name}</b><small>${ofPar}% of the planner's score (${M.par.score.toLocaleString()})${isPractice ? ' · practice' : ''}</small></div></div>
        <div class="rs-big"><b data-count="${res.score}">${res.score.toLocaleString()}</b><small>score</small>${!isPractice && mode === 'today' ? `<span>${tomorrowLine()}</span>` : ''}</div>
      </section>
      ${earned && earned.length ? `<section class="rs-badges"><p class="lab">New badge${earned.length === 1 ? '' : 's'}</p><div>${earned.map(a => `<a href="achievements.html" class="nb${a.tier ? ' t-' + a.tier.toLowerCase() : ''}"><span>${a.ic}</span><b>${T.esc(a.name)}</b><small>${a.tier || (a.secret ? 'Secret badge' : 'Unlocked')}</small></a>`).join('')}</div></section>` : ''}
      <section class="rs-perf"><p class="lab">Your performance</p>
        ${perf('Cost', T.money(res.cost), T.money(M.cheapest), res.cost <= M.cheapest + 1, '+' + T.money(res.cost - M.cheapest))}
        ${perf('Time', T.dur(res.hours), T.dur(M.fastest), res.hours <= M.fastest + 0.05, '+' + T.dur(res.hours - M.fastest))}
        ${perf('Deals', found + '/' + M.deals, M.deals + '/' + M.deals, found >= M.deals, (M.deals - found) + ' missed')}
      </section>
      <section class="rs-vs"><p class="lab">You vs the planner</p>
        <div class="duel">
          <div class="side you"><h5>Your route</h5><b data-count="${Math.round(res.cost)}" data-fmt="money">${T.money(res.cost)}</b><span>${T.dur(res.hours)} · ${res.route.length} leg${res.route.length === 1 ? '' : 's'}</span></div>
          <span class="vs">vs</span>
          <div class="side par"><h5>The planner</h5><b data-count="${Math.round(M.par.cost)}" data-fmt="money">${T.money(M.par.cost)}</b><span>${T.dur(M.par.hours)} · ${M.par.legs} legs</span></div>
        </div>
        <p class="verdict ${v.cls}"><b>${v.h}</b><small>${v.t}</small></p>
        <details class="rs-legs"><summary>Compare the routes leg by leg${WAYS.length > 1 ? ` · ${WAYS.length} routes got there today` : ''}</summary>
          ${WAYS.length > 1 ? `<div class="rs-waytabs" role="group" aria-label="Which route to compare">${WAYS.map((w, i) => `<button type="button" class="${i ? '' : 'on'}" data-w="${i}">${i === 0 ? 'Planner' : 'Route ' + (i + 1)}</button>`).join('')}</div>` : ''}
          <div class="cols">${routeCol('Your route', res.route, res.cost, res.hours, 'you')}<span class="vs">vs</span><div class="waycols">${WAYS.map((w, i) => `<div class="wc" data-w="${i}"${i ? ' hidden' : ''}>${routeCol(wayName(i), wayRoute(w), w.cost, w.hours, 'par')}</div>`).join('')}</div></div>
          <div class="tags">${tags.map(t => `<span class="${t[0]}">${t[1]}</span>`).join('')}</div>
        </details>
      </section>
      <section class="rs-score"><p class="lab">Score breakdown</p>
        <div class="final"><b data-count="${res.score}">${res.score.toLocaleString()}</b><span>final score</span></div>
        ${bar('Cost', f.cost)}${bar('Time', f.time)}${bar('Deals', f.deals)}${bar('Efficiency', f.eff)}
        <div class="brow bonus"><span>Speed bonus</span><div class="bar"><i style="width:${f.speed * 5}%" data-w="${f.speed * 5}"></i></div><b>+${f.speed}%</b></div>
        <p class="note">Cost and time are measured against the best routes that fit today's mission. Efficiency rewards doing well at both. Deciding quickly adds a bonus, up to 20%, and never takes anything away.</p>
      </section>
      ${!isPractice ? `<div class="level"><span>Level ${prog.level} · ${prog.title}${xpGain ? ` · <b>+<span data-count="${xpGain}">${xpGain}</span> XP</b>` : ''}</span><div class="bar"><i style="width:${lvlPct}%" data-w="${lvlPct}"></i></div><small>${prog.next ? (prog.next - prog.xp) + ' XP to ' + prog.nextTitle : 'Top level'}</small></div>` : ''}
      <div class="actions"><button class="btn primary big tv-share">Share result</button><button class="btn ghost tv-map">See the map</button><button class="btn ghost tv-stats">Stats</button>${full ? `<button class="btn ghost tv-again">Practice again</button>${mode !== 'today' ? '<a class="btn ghost" href="play.html">Today\'s puzzle</a>' : `<a class="btn ghost" href="play.html?seed=${Math.random().toString(36).slice(2, 8)}">Random expedition</a>`}` : ''}</div>`;
  }
  /* the routes that got there today, as tabs: tap one to draw it on the chart, tap again to clear it */
  const wayRoute = w => w.path.map(e => ({ to: e.to, mode: e.mode, cost: e.cost, hours: e.hours, deal: e.deal }));
  function waysHtml() {
    return `<div class="rs-ways" role="group" aria-label="Routes on the chart"><span class="lab">On the chart</span>${WAYS.map((w, i) => `<button type="button" class="wt${shownWay === i ? ' on' : ''}" data-w="${i}" aria-pressed="${shownWay === i}">${wayName(i)}<small>${T.money(w.cost)} · ${T.dur(w.hours)} · ${w.legs} legs</small></button>`).join('')}</div>`;
  }
  function setWay(i) {
    shownWay = i; showPar = i >= 0; parPending = false;
    document.querySelectorAll('.rs-ways .wt').forEach(b => { const on = +b.dataset.w === i; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    drawMap(); if (i >= 0) animateRoutes('par'); else fitRoute();
    $('#tv-stage').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
  function wireWays(root) {
    root.querySelectorAll('.rs-ways .wt').forEach(b => (b.onclick = () => setWay(shownWay === +b.dataset.w ? -1 : +b.dataset.w)));
    root.querySelectorAll('.rs-waytabs button').forEach(b => (b.onclick = () => { const box = b.closest('.rs-legs'); box.querySelectorAll('.rs-waytabs button').forEach(x => x.classList.toggle('on', x === b)); box.querySelectorAll('.wc').forEach(x => (x.hidden = x.dataset.w !== b.dataset.w)); }));
  }
  function wireSummary(root, res) {
    wireWays(root);
    root.querySelectorAll('.tv-share').forEach(b => (b.onclick = () => share(res)));
    root.querySelectorAll('.tv-map').forEach(b => (b.onclick = () => { closeModal(); $('#tv-stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    root.querySelectorAll('.tv-stats').forEach(b => (b.onclick = showStats));
    root.querySelectorAll('.tv-again').forEach(b => (b.onclick = () => { closeModal(); stage.classList.remove('lost'); $('#tv-stamp').hidden = true; start(); }));
  }
  /* the shareable card: performance without the solution */
  function shareText(res) {
    const tr = T.tier(res.score, M), f = factors(res);
    const bar = x => { const n = Math.round(Math.max(0, Math.min(1, x)) * 10); return '█'.repeat(n) + '░'.repeat(10 - n); };
    const modes = Object.keys(T.MODES).filter(m => res.route.some(r => r.mode === m)).map(m => T.MODES[m].icon).join(' ');
    const dc = res.cost - M.par.cost, dh = res.hours - M.par.hours, ps = res.score, pp = M.par.score;
    const vs = parMatchOf(res) ? "🎯 Matched the planner's route" : ps > pp + 5 ? `🧠 Beat the planner${dc < -0.5 ? ' · ' + T.money(-dc) + ' cheaper' : ''}${dh < -0.05 ? ' · ' + T.dur(-dh) + ' faster' : ''}` : `🧭 Planner wins${dc > 0.5 ? ' · ' + T.money(dc) + ' behind' : dh > 0.05 ? ' · ' + T.dur(dh) + ' slower' : ''}`;
    const S = mode === 'today' ? T.stats((st && st.results) || {}, today) : null, streak = S && S.streak > 1 ? `\n🔥 ${S.streak}-day streak` : '';
    return `🌎 TRAVERSLE ${ch.n ? '#' + String(ch.n).padStart(3, '0') : 'EXPEDITION'} · ${M.difficulty}\n${ch.from.name} → ${ch.to.name}\n💰 ${T.money(res.cost)} · ⏱️ ${T.dur(res.hours)} · 🎟️ ${res.deals ? res.deals.found : 0}/${M.deals} deals\n${tr.icon} ${tr.name.toUpperCase()} · ${res.score.toLocaleString()}\n💰 ${bar(f.mF)}\n⏱️ ${bar(f.tF)}\n🎟️ ${bar(f.dF)}\n${vs}\n${res.decisions || res.route.length}/${res.decisionsTotal || DEC} decisions · ${modes}${streak}\ntraversledaily.com`;
  }
  function share(res) {
    const txt = shareText(res);
    const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied. Paste it where your friends will see it.'), () => prompt('Copy your result:', txt));
    if (navigator.share) navigator.share({ text: txt }).catch(e => { if (!e || e.name !== 'AbortError') copy(); }); else copy();
  }
  function showModal(res, isPractice, xpGain, earned) {
    $('#tv-modal').innerHTML = `<div class="tv-modal-card rs" role="dialog" aria-modal="true" aria-label="Expedition report"><button class="tv-modal-x" id="tv-modal-close" aria-label="Close">✕</button>${buildSummary(res, isPractice, xpGain, earned)}</div>`;
    $('#tv-modal').hidden = false; document.body.classList.add('tv-modal-open');
    $('#tv-modal-close').onclick = closeModal;
    $('#tv-modal').onclick = e => { if (e.target === $('#tv-modal')) closeModal(); };
    wireSummary($('#tv-modal'), res);
    animateReport($('#tv-modal .rs')); emit('report', res);
    $('#tv-modal-close').focus({ preventScroll: true });
  }
  /* the report reveals itself: sections in turn, numbers counting up, bars filling, badges springing in */
  function animateReport(root) {
    if (reducedMotion || !root) return;
    const STEP = 0.2, delays = new Map();
    Array.from(root.children).filter(el => el.tagName !== 'BUTTON').forEach((el, i) => { const d = 0.1 + i * STEP; el.classList.add('rv'); el.style.animationDelay = d + 's'; delays.set(el, d); });
    const delayOf = el => { let n = el; while (n && n !== root) { if (delays.has(n)) return delays.get(n); n = n.parentElement; } return 0; };
    root.querySelectorAll('.rs-badges .nb').forEach((el, i) => { el.style.animationDelay = (delayOf(el) + 0.2 + i * 0.12) + 's'; });
    const fmt = (v, f) => f === 'money' ? T.money(v) : f === 'km' ? v.toLocaleString() + ' km' : v.toLocaleString();
    root.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, f = el.dataset.fmt, dur = 800, begin = performance.now() + delayOf(el) * 1000 + 150;
      el.textContent = fmt(0, f);
      const step = now => { const p = Math.max(0, Math.min(1, (now - begin) / dur)), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(Math.round(to * e), f); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    const verdict = root.querySelector('.rs-vs .verdict'); if (verdict) verdict.style.animationDelay = (delayOf(verdict) + 0.55) + 's';
    root.querySelectorAll('.bar i[data-w]').forEach(el => { el.style.transition = 'none'; el.style.width = '0%'; });
    requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.bar i[data-w]').forEach((el, i) => { el.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1) ' + (delayOf(el) + 0.2 + i * 0.06) + 's'; el.style.width = el.dataset.w + '%'; })));
  }
  function closeModal() {
    $('#tv-modal').hidden = true; document.body.classList.remove('tv-modal-open');
    if (parPending) { setWay(0); }
    else if (showPar && !drawn) animateRoutes('both'); else fitRoute();
  }
  /* draw your route and/or the planner's across the map, leg by leg; returns how long it takes */
  function animateRoutes(which) {
    drawn = true; fitRoute();
    if (reducedMotion) return 0;
    const mine = which === 'par' ? [] : gLinks.selectAll('path').filter(d => d.cls !== 'flow' && d.cls !== 'ghost').nodes(), par = which === 'mine' ? [] : gPar.selectAll('path').nodes();
    stage.classList.add('drawing');
    mine.forEach((p, i) => { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.classList.add('draw'); p.style.animationDelay = (0.5 + i * 0.45) + 's'; });
    par.forEach((p, i) => { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.classList.add('draw'); p.style.animationDelay = (0.5 + mine.length * 0.45 + (mine.length ? 0.5 : 0) + i * 0.45) + 's'; });
    const total = ((mine.length + par.length) * 0.45 + (mine.length && par.length ? 0.5 : 0) + 1.1) * 1000;
    setTimeout(() => { mine.concat(par).forEach(p => { p.classList.remove('draw'); p.removeAttribute('pathLength'); p.style.animationDelay = ''; }); stage.classList.remove('drawing'); drawMap(); }, total);
    return total;
  }

  /* personal stats pop-up (the thing people screenshot) */
  function showStats() {
    const R = (T.load().results) || {}, S = T.stats(R, today), runs = S.runs;
    const tiers = ['Perfect', 'Expert', 'Navigator', 'Wayfarer', 'Arrived'], counts = tiers.map(t => S.tiers[t] || 0), mx = Math.max(1, ...counts);
    const cur = S.streak, max = S.maxStreak, avg = S.avg, best = S.best ? S.best.score : 0;
    const prog = T.progression(R);
    const todayRes = R[T.dayKey(today)];
    $('#tv-modal').innerHTML = `<div class="tv-modal-card stats" role="dialog" aria-modal="true" aria-label="Your stats">
      <button class="tv-modal-x" id="tv-modal-close" aria-label="Close">✕</button>
      <p class="kicker">Your stats</p>
      <div class="st-grid"><div><b>${runs.length}</b><span>played</span></div><div><b>${runs.length ? Math.round(100 * runs.filter(r => r.tier === 'Perfect' || r.tier === 'Expert').length / runs.length) : 0}%</b><span>expert or better</span></div><div><b>${cur}</b><span>streak</span></div><div><b>${max}</b><span>best streak</span></div><div><b>${best ? best.toLocaleString() : '—'}</b><span>best score</span></div><div><b>${avg ? avg.toLocaleString() : '—'}</b><span>average</span></div></div>
      <p class="st-lab">Ratings</p>
      <div class="st-dist">${tiers.map((t, i) => `<div class="row${todayRes && (todayRes.tier || 'Arrived') === t ? ' me' : ''}"><span>${T.TIERS[i][2]} ${t}</span><div class="bar"><i style="width:${Math.max(4, 100 * counts[i] / mx)}%"></i></div><b>${counts[i]}</b></div>`).join('')}</div>
      <div class="level"><span>Level ${prog.level} · ${prog.title}</span><div class="bar"><i style="width:${prog.next ? Math.round(100 * prog.into / prog.span) : 100}%"></i></div><small>${prog.next ? (prog.next - prog.xp) + ' XP to ' + prog.nextTitle : 'Top level'}</small></div>
      <div class="actions">${todayRes ? '<button class="btn primary" id="tv-stats-share">Share today</button>' : ''}<a class="btn ghost" href="stats.html">Full stats</a><span class="st-next">Next puzzle in <b>${resetIn()}</b></span></div>
    </div>`;
    $('#tv-modal').hidden = false; document.body.classList.add('tv-modal-open');
    $('#tv-modal-close').onclick = closeModal; $('#tv-modal').onclick = e => { if (e.target === $('#tv-modal')) closeModal(); };
    const sh = $('#tv-stats-share'); if (sh) sh.onclick = () => share(todayRes);
  }
  { const b = $('#td-stats'); if (b) b.onclick = showStats; }


  /* ---------- the other ending: out of decisions ---------- */
  function buildFail(res, isPractice, full) {
    const endAt = T.byId[res.endedAt] || ch.from, stops = [ch.from, ...res.route.map(r => T.byId[r.to])];
    const chain = stops.map(c => `<span>${T.esc(c.name)}</span>`).join('<i>→</i>');
    const km = Math.round(stops.slice(1).reduce((a, c, i) => a + T.km(stops[i], c), 0)), short = res.kmShort != null ? res.kmShort : Math.round(T.km(endAt, ch.to));
    return `
      <p class="kicker"><b>Expedition ended</b> · ${isPractice ? 'practice run' : 'official result · ' + dayLabel}</p>
      <section class="rs-top lost">
        <div class="rs-rating stranded"><span class="ic">🧭</span><div><b>Out of decisions</b><small>${res.reason ? T.esc(res.reason) : `You used all ${res.decisionsTotal || DEC} decisions before reaching ${T.esc(ch.to.name)}.`}</small></div></div>
        <div class="rs-big"><b>${short.toLocaleString()}<small class="u">km</small></b><small>short of ${T.esc(ch.to.name)}</small></div>
      </section>
      <section class="rs-journey">
        <p class="lab">Where you got to</p>
        <div class="chain">${chain}<i>→</i><span class="x">✕ ${T.esc(ch.to.name)}</span></div>
        <div class="rs-stats"><div><b data-count="${km}" data-fmt="km">${km.toLocaleString()} km</b><span>travelled</span></div><div><b>${res.decisions || res.route.length}/${res.decisionsTotal || DEC}</b><span>decisions</span></div><div><b>${T.esc(endAt.name)}</b><span>final stop</span></div><div><b data-count="${Math.round(res.cost)}" data-fmt="money">${T.money(res.cost)}</b><span>spent</span></div><div><b>${T.dur(res.hours)}</b><span>travel time</span></div></div>
      </section>
      <section class="rs-vs"><p class="lab">${WAYS.length === 1 ? 'The one way there' : 'The ' + WAYS.length + ' ways there'}</p>
        <div class="rs-waylist">${WAYS.map((w, i) => `<div class="wl"><b>${wayName(i)}</b><span class="chain">${[ch.from, ...w.path.map(e => T.byId[e.to])].map(c => `<span>${T.esc(c.name)}</span>`).join('<i>→</i>')}</span><small>${T.money(w.cost)} · ${T.dur(w.hours)} · ${w.legs} legs</small></div>`).join('')}</div>
        <p class="rs-note">${isPractice || mode !== 'today' ? '' : 'Today counts as played, so your streak is safe. '}Try again as practice and see if you can find one of them.</p></section>
      <div class="actions"><button class="btn primary big tv-again">Try again</button><button class="btn ghost tv-map">See the map</button><button class="btn ghost tv-par">See the routes</button>${full && mode !== 'today' ? '<a class="btn ghost" href="play.html">Today\'s puzzle</a>' : ''}</div>`;
  }
  function showFail(res, isPractice, quiet) {
    route = res.route.map((r, i) => ({ from: i ? res.route[i - 1].to : ch.from.id, to: r.to, leg: { mode: r.mode, cost: r.cost, hours: r.hours, icon: T.MODES[r.mode].icon, deal: r.deal } }));
    stage.classList.add('lost'); drawMap();
    const wire = root => { root.querySelectorAll('.tv-again').forEach(b => (b.onclick = () => { closeModal(); stage.classList.remove('lost'); $('#tv-stamp').hidden = true; start(); })); root.querySelectorAll('.tv-map').forEach(b => (b.onclick = () => { closeModal(); $('#tv-stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); })); root.querySelectorAll('.tv-par').forEach(b => (b.onclick = () => { closeModal(); setWay(0); $('#tv-stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); })); wireWays(root); };
    shownWay = -1;
    $('#tv-result').innerHTML = `<div class="rs">${waysHtml()}${buildFail(res, isPractice, true)}</div>`; $('#tv-result').hidden = false; wire($('#tv-result'));
    st = T.load(); st.results = st.results || {}; if (mode === 'today') showBoard();
    if (quiet) { fitRoute(); return; }
    $('#tv-modal').innerHTML = `<div class="tv-modal-card rs" role="dialog" aria-modal="true" aria-label="Expedition ended"><button class="tv-modal-x" id="tv-modal-close" aria-label="Close">✕</button>${buildFail(res, isPractice)}</div>`;
    $('#tv-modal').hidden = false; document.body.classList.add('tv-modal-open');
    $('#tv-modal-close').onclick = closeModal; $('#tv-modal').onclick = e => { if (e.target === $('#tv-modal')) closeModal(); };
    wire($('#tv-modal')); animateReport($('#tv-modal .rs')); emit('report', res);
    $('#tv-modal-close').focus({ preventScroll: true });
  }

  function showResult(res, isPractice, xpGain, quiet, earned) {
    dock.hidden = true; sel = null; choices = []; drawn = false; ended = true; playing = false; stage.classList.remove('arrived'); $('#tv-stamp').hidden = true;
    if (res.decisionsTotal) decisions = Math.max(0, res.decisionsTotal - res.decisions); renderBrief();
    if (res.failed) { showFail(res, isPractice, quiet); return; }
    showPar = !!quiet; parPending = !quiet; // on a fresh submit the planner's route waits until the report closes
    route = res.route.map((r, i) => ({ from: i ? res.route[i - 1].to : ch.from.id, to: r.to, leg: { mode: r.mode, cost: r.cost, hours: r.hours, icon: T.MODES[r.mode].icon, deal: r.deal } }));
    drawMap();
    shownWay = quiet ? 0 : -1;
    $('#tv-result').innerHTML = `<div class="rs">${waysHtml()}${buildSummary(res, isPractice, xpGain, earned, true)}</div>`;
    $('#tv-result').hidden = false;
    wireSummary($('#tv-result'), res);
    st = T.load(); st.results = st.results || {}; showBoard();
    if (quiet) { setTimeout(() => animateRoutes('both'), 150); return; }
    // your finished route draws itself across the chart, then the report arrives
    const wait = justPlayed ? (fitRoute(), drawn = true, 500) : animateRoutes('mine'); justPlayed = false;
    setTimeout(() => showModal(res, isPractice, xpGain, earned), Math.max(0, wait - 400));
  }

  /* your week: the last seven puzzles, played or not, with links to replay them */
  function showBoard() {
    const R = st.results || {}, S = T.stats(R, today);
    const days = []; for (let i = 6; i >= 0; i--) { const n = today - i; if (n < 1) continue; const key = T.dayKey(n), r = R[key]; days.push(`<a class="d ${r ? 'p' : ''}" href="play.html${n === today ? '' : '?day=' + n}" title="${key}${r ? ' · ' + r.score.toLocaleString() : ''}">#${n}<small>${r ? r.score.toLocaleString() : '—'}</small></a>`); }
    $('#tv-board').innerHTML = `<div class="card"><h3>Your week</h3><p class="sub">🔥 ${S.streak}-day streak · best ${S.maxStreak} · ${S.played} day${S.played === 1 ? '' : 's'} played. Tap a day to replay it.</p>
      ${mode === 'today' ? `<p class="sub tomorrow">${tomorrowLine()}</p>` : ''}
      <div class="tv-hist">${days.join('')}</div>
      <p class="sub"><a href="profile.html">Your profile</a> · <a href="achievements.html">Badges</a> · <a href="archive.html">Past puzzles</a></p></div>`;
    $('#tv-board').hidden = false;
  }

  /* ---------- initial ---------- */
  drawMap();
  if (official) { $('#tv-gate').hidden = true; stage.classList.add('landed'); showResult(official, false, 0, true); }
  else {
    // the chart opens on the whole world, then carries you to today's region; the course line draws once it lands
    gCourse.append('path').attr('class', 'tv-course').attr('d', arc(ch.from, ch.to)).attr('pathLength', 1);
    stage.classList.add('zooming'); stage.classList.add('intro');
    setTimeout(() => fitTo([ch.from, ch.to], 3.2, reducedMotion ? 0 : 2300, d3.easeCubicInOut, reducedMotion ? 0 : 450, window.innerWidth >= 1100 ? 250 : 120).on('end interrupt', () => { stage.classList.remove('zooming'); relayout(); stage.classList.add('landed'); }), 50);
  }
})();
