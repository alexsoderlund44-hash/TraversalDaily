/* TraversleDaily play UI: quiet map, mission gauges, stop picker, deals, the planner's route, the result and your week. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search), today = T.dayNumber();
  let mode = 'today', ch;
  if (params.get('seed')) { ch = T.challengeRandom(params.get('seed')); mode = 'random'; }
  else if (params.get('day') && +params.get('day') >= 1 && +params.get('day') < today) { ch = T.challenge(+params.get('day')); mode = 'archive'; }
  else ch = T.challenge(today);
  const M = T.mission(ch), tw = ch.twist;
  const LIVE = T.liveFor(ch.seed);
  let st = T.load(); st.results = st.results || {};
  if (params.get('reset') === '1' && mode === 'today') { delete st.results[ch.key]; T.save(st); history.replaceState(null, '', location.pathname); }
  const official = mode === 'today' ? st.results[ch.key] : null;
  let practice = mode !== 'today' || !!official;

  /* ---------- state ---------- */
  let route = [], pendingTo = null, selOpt = null, t0 = 0, timer = null, playing = false, found = new Set(), showPar = false, drawn = false, dealT = null, parPending = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* a short-lived class on one city marker (born, pop, no), kept across redraws */
  const KEEP = ['born', 'pop', 'no'];
  function markCity(id, cls, ms) { gCities.selectAll('circle').filter(c => c.id === id).classed(cls, true); setTimeout(() => gCities.selectAll('circle').filter(c => c.id === id).classed(cls, false), ms); }
  const UNDOS = 3, HINTS = 2, HINT_SECS = 45; let undos = UNDOS, hints = HINTS;
  const at = () => route.length ? T.byId[route[route.length - 1].to] : ch.from;
  const atDest = () => at().id === ch.to.id;
  const totals = () => route.reduce((a, r) => ({ cost: a.cost + r.leg.cost, hours: a.hours + r.leg.hours }), { cost: 0, hours: 0 });
  const elapsed = () => playing ? (performance.now() - t0) / 1000 : 0;
  const onRouteIds = () => new Set([ch.from.id, ...route.map(r => r.to)]);
  const twState = () => route.reduce((s, r) => tw.state(s, r.leg), 0);
  const dealKey = (a, b, l) => a.id + '-' + b.id + '|' + l.mode;
  /* why an option can't be taken right now (null = fine) */
  function blocked(leg, to) {
    const tt = totals();
    if (tt.cost + leg.cost > M.budget) return 'over budget';
    if (tt.hours + leg.hours > M.deadline) return 'misses deadline';
    if (!tw.allow(leg, twState(), to.id === ch.to.id)) return tw.name + ' rule';
    return null;
  }
  const usable = (a, b) => T.legs(a, b, ch.seed).filter(l => !blocked(l, b));
  const why = b => b === 'over budget' ? 'is over budget' : b === 'misses deadline' ? 'misses the deadline' : 'breaks the ' + b;
  function noteDeals(a, b, ls) {
    ls.forEach(l => { if (l.deal) { const k = dealKey(a, b, l); if (!found.has(k)) { found.add(k); if (playing) { dealReveal(a, b, l); renderBrief(); renderCounts(); } } } });
  }
  const dealDots = () => Array.from({ length: M.deals }, (_, j) => `<i class="${j < found.size ? 'on' : ''}"></i>`).join('');
  /* finding a secret fare should feel like finding something */
  function dealReveal(a, b, l) {
    const el = $('#tv-deal'), full = l.full || l.cost, saved = full - l.cost;
    el.innerHTML = `<div class="ticket"><p class="k">🎟️ Secret fare found</p><b><s>${T.money(full)}</s><i>→</i>${T.money(l.cost)}</b><small>${l.icon} ${T.esc(l.name)} · ${T.esc(a.name)} → ${T.esc(b.name)}</small><em>You saved ${T.money(saved)} · ${Math.round(l.deal * 100)}% off</em><span class="dots">${dealDots()} ${found.size}/${M.deals} found</span></div>`;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(dealT); dealT = setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 350); }, 3200);
    markCity(b.id, 'pop', 1600);
  }

  /* ---------- static bits ---------- */
  const dayLabel = ch.n ? new Date(ch.key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Random expedition';
  const title = ch.n ? 'Puzzle #' + ch.n : 'Expedition ' + ch.seed.slice(1).toUpperCase();
  const resetIn = () => { const ms = T.untilReset(); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; };
  const twistPill = () => `<span class="twist" title="${T.esc(tw.desc)}">${tw.icon} ${T.esc(tw.name)}</span>`;
  function renderBrief() {
    $('#tv-brief').innerHTML = `<p class="k">${title} · ${dayLabel}</p>
      <div class="route"><span class="pin s"></span><b>${T.flagImg(ch.from)} ${T.esc(ch.from.name)}<small class="cty">${T.esc(ch.from.country)}</small></b>
      <span class="ln"></span><span></span>
      <span class="pin d"></span><b>${T.flagImg(ch.to)} ${T.esc(ch.to.name)}<small class="cty">${T.esc(ch.to.country)}</small></b></div>
      <p class="meta"><span>💰 <b>${T.money(M.budget)}</b></span><span>⏱️ <b>${T.dur(M.deadline)}</b></span>${twistPill()}<span class="deals" title="Secret fares found">🎟️ ${dealDots()}</span></p>`;
  }
  renderBrief();
  const rhythm = ch.n ? T.rhythmOf(ch.n) : null;
  $('#tv-gate-day').textContent = title + ' · ' + dayLabel + (rhythm && rhythm.twist.id === tw.id ? ' · ' + rhythm.label : '');
  $('#tv-gate-title').innerHTML = `<span class="city">${T.flagImg(ch.from, 40)} <span>${T.esc(ch.from.name)}<small class="cty">${T.esc(ch.from.country)}</small></span></span><span class="arr">→</span><span class="city">${T.flagImg(ch.to, 40)} <span>${T.esc(ch.to.name)}<small class="cty">${T.esc(ch.to.country)}</small></span></span>`;
  $('#tv-gate-sub').textContent = ch.blurb ? (ch.title ? ch.title + '. ' : '') + ch.blurb : `${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km with no direct route. Get there under budget and before the deadline.`;
  $('#tv-gate-mission').innerHTML = `
    <div class="mi"><span class="ic">💰</span><b>${T.money(M.budget)}</b><span>budget</span></div>
    <div class="mi"><span class="ic">⏱️</span><b>${T.dur(M.deadline)}</b><span>deadline</span></div>
    <div class="mi"><span class="ic">${tw.icon}</span><b>${T.esc(tw.name)}</b><span>${T.esc(tw.desc)}</span></div>
    <div class="mi"><span class="ic">🏷️</span><b>${M.deals} deal${M.deals === 1 ? '' : 's'}</b><span>hidden on the map</span></div>`;
  const parDeals = M.par.path.filter(e => e.deal).length, word = n => ['no', 'one', 'two', 'three', 'four', 'five'][n] || String(n);
  $('#tv-gate-rules').innerHTML = `<li>Tap a city to add a stop, then pick how to get there. Anything you can't afford, or that would miss the deadline, is grayed out.</li>
    <li>Fares show when you look at a city, and so do hidden deals. ${!parDeals ? '' : parDeals === M.deals ? (M.deals === 1 ? 'The deal is' : M.deals === 2 ? 'Both deals are' : 'All ' + word(M.deals) + ' deals are') + " on the planner's route." : word(parDeals).replace(/^./, c => c.toUpperCase()) + ' of the ' + word(M.deals) + ' deals ' + (parDeals === 1 ? 'is' : 'are') + " on the planner's route."}</li>
    <li>You're scored on money, time and how quickly you decide. ${mode === 'today' ? 'Everyone playing today has this same puzzle, and you get one scored attempt.' : 'This one is just practice.'}</li>`;
  $('#tv-gate-note').textContent = mode === 'random' ? 'Random start and destination. Practice only, not scored.' : mode === 'archive' ? 'A past puzzle. Practice only, not scored.' : practice ? "You've already played today. This run is practice." : 'The timer starts when you press Begin.';
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
  const wire = sel => sel.on('click', (e, c) => { e.stopPropagation(); hideTip(); pick(c); })
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

  const parIds = () => new Set(showPar ? M.par.path.map(e => e.to) : []);
  const labelOn = c => c.id === ch.from.id || c.id === ch.to.id || onRouteIds().has(c.id) || parIds().has(c.id) || (pendingTo && c.id === pendingTo.id) || (c.hub >= 3 && k >= 1.8) || (c.hub >= 2 && k >= 2.6) || (c.hub >= 1 && k >= 3.6) || k >= 5;
  function layoutLabels() {
    const s = k, boxes = [], vis = {};
    const pri = c => (c.id === ch.from.id || c.id === ch.to.id ? 100 : onRouteIds().has(c.id) ? 90 : (pendingTo && c.id === pendingTo.id) ? 85 : parIds().has(c.id) ? 80 : c.hub * 10);
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
  document.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === '+' || e.key === '=') $('#tv-zin').click(); else if (e.key === '-') $('#tv-zout').click(); else if (e.key === 'Escape') { if (!$('#tv-modal').hidden) closeModal(); else if (pendingTo) { pendingTo = null; refresh(); } } });
  function fitTo(points, pad, dur, ease, delay, offset) {
    const xs = points.map(p => pos(p)[0]), ys = points.map(p => pos(p)[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const r = stage.getBoundingClientRect(); const aspect = r.width / r.height;
    const vw = aspect > 960 / 500 ? 960 : 500 * aspect, vh = aspect > 960 / 500 ? 960 / aspect : 500;
    const w = Math.max(60, (x1 - x0) * (pad || 1.6)), h = Math.max(40, (y1 - y0) * (pad || 1.6));
    const kk = Math.min(12, Math.max(1, Math.min(vw / w, vh / h) * 0.9));
    const cx = (x0 + x1) / 2 + (window.innerWidth > 900 ? (offset == null ? 120 : offset) / kk : 0);
    // on a phone the planning sheet covers the lower part of the chart, so the route lands in the strip above it
    const plan = $('#tv-plan'), sheet = window.innerWidth <= 900 && plan && !plan.hidden, cy = sheet ? (plan.classList.contains('collapsed') ? 200 : 110) : 250;
    return svg.transition().delay(delay || 0).duration(dur == null ? 750 : dur).ease(ease || d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity.translate(480 - kk * cx, cy - kk * (y0 + y1) / 2).scale(kk));
  }
  function fitRoute() { fitTo([ch.from, ch.to, ...route.map(r => T.byId[r.to]), ...(showPar ? M.par.path.map(e => T.byId[e.to]) : [])], 1.8); }
  const arc = (a, b) => path({ type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] });
  const mid = (a, b) => proj(d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(0.5));

  /* where can I go from here? the destination if it fits, then six sensible stops */
  function suggestFrom(cur) {
    const on = onRouteIds();
    const reach = T.C.filter(c => !on.has(c.id) && usable(cur, c).length);
    const finish = reach.find(c => c.id === ch.to.id);
    const suggested = reach.filter(c => c.id !== ch.to.id).map(c => ({ c, score: T.km(c, ch.to) + (usable(cur, c).length < 2 ? 400 : 0) - c.hub * 80 })).sort((a, b) => a.score - b.score).slice(0, 6).map(x => x.c);
    return { reach, finish, suggested };
  }
  function drawMap() {
    const cur = at(), on = onRouteIds(), par = parIds();
    const live = playing && !atDest();
    // spokes: the connections that matter from where you stand; they fade when you focus on one
    const spokes = [];
    if (live) { const sg = suggestFrom(cur); (sg.finish ? [sg.finish] : []).concat(sg.suggested).forEach(c => { if (pendingTo && c.id === pendingTo.id) return; const hasDeal = T.legs(cur, c, ch.seed).some(l => l.deal && found.has(dealKey(cur, c, l))); spokes.push({ cls: 'spoke' + (pendingTo ? ' dim' : '') + (hasDeal ? ' deal' : '') + (c.id === ch.to.id ? ' fin' : ''), d: arc(cur, c) }); }); }
    gSpokes.selectAll('path').data(spokes).join('path').attr('class', d => 'tv-spoke ' + d.cls).attr('d', d => d.d).style('stroke-width', 0.9 / k).style('stroke-dasharray', dashFor('spoke'));
    const reach = live ? new Set(T.C.filter(c => !on.has(c.id) && c.id !== cur.id && usable(cur, c).length).map(c => c.id)) : null;
    gCities.selectAll('circle').attr('class', function (c) { return 'tv-city'
      + (c.id === cur.id && live ? ' cur' : c.id === ch.from.id ? ' start' : c.id === ch.to.id ? ' dest' : on.has(c.id) ? ' on' : pendingTo && c.id === pendingTo.id ? ' pend' : par.has(c.id) ? ' par' : reach ? (reach.has(c.id) ? ' reach' : ' far') : '')
      + KEEP.filter(k => this.classList.contains(k)).map(k => ' ' + k).join(''); });
    gLabels.selectAll('text').classed('far', c => !!reach && !reach.has(c.id) && c.id !== ch.to.id && c.id !== ch.from.id && !on.has(c.id));
    gCities.selectAll('circle').attr('r', c => (2 + c.hub * 0.5 + (c.id === cur.id && playing && !atDest() ? 1.5 : c.id === ch.from.id || c.id === ch.to.id || on.has(c.id) || par.has(c.id) ? 1 : 0)) / k).style('stroke-width', c => ((c.id === cur.id && playing && !atDest()) ? 8 : (pendingTo && c.id === pendingTo.id) ? 6 : 1) / k);
    layoutLabels();
    const plinks = showPar ? M.par.path.map(e => ({ cls: 'par', d: arc(T.byId[e.from], T.byId[e.to]) })) : [];
    gPar.selectAll('path').data(plinks).join('path').attr('class', function () { return 'tv-link par' + (this.classList.contains('draw') ? ' draw' : ''); }).attr('d', d => d.d).style('stroke-width', strokeW).style('stroke-dasharray', function () { return this.classList.contains('draw') ? '1' : dashFor('par'); });
    const links = [];
    route.forEach(r => { const a = T.byId[r.from], b = T.byId[r.to]; links.push({ cls: r.leg.mode, d: arc(a, b), col: T.MODES[r.leg.mode].color }); links.push({ cls: 'flow', d: arc(a, b) }); });
    if (pendingTo) links.push({ cls: 'ghost', d: arc(cur, pendingTo) });
    gLinks.selectAll('path').data(links).join('path').attr('class', function (d) { return 'tv-link ' + d.cls + (this.classList.contains('draw') ? ' draw' : ''); }).attr('d', d => d.d).style('stroke', d => d.col || null).style('stroke-width', strokeW).style('stroke-dasharray', function (d) { return this.classList.contains('draw') ? '1' : dashFor(d.cls); });
    const badges = route.map((r, i) => { const [x, y] = mid(T.byId[r.from], T.byId[r.to]); return { x, y, cls: '', txt: `${i + 1} · ${r.leg.icon} ${T.money(r.leg.cost)} · ${T.dur(r.leg.hours)}${r.leg.deal ? ' 🎟️' : ''}` }; });
    if (pendingTo && live) { const o = usable(cur, pendingTo).slice().sort((a, b) => a.cost - b.cost)[0]; if (o) { const [x, y] = mid(cur, pendingTo); badges.push({ x, y, cls: 'pend', txt: `${o.icon} from ${T.money(o.cost)} · ${T.dur(o.hours)}` }); } }
    if (showPar) M.par.path.forEach(e => { if (route.some(r => r.from === e.from && r.to === e.to && r.leg.mode === e.mode)) return; const [x, y] = mid(T.byId[e.from], T.byId[e.to]); badges.push({ x, y: y + 14 / k, cls: 'par', txt: `${T.MODES[e.mode].icon} ${T.money(e.cost)} · ${T.dur(e.hours)}` }); });
    const bsel = gBadges.selectAll('g').data(badges).join(enter => { const gg = enter.append('g'); gg.append('rect'); gg.append('text'); return gg; });
    bsel.attr('class', d => 'tv-badge ' + d.cls).attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / k})`);
    bsel.select('text').text(d => d.txt).attr('y', 3);
    bsel.select('rect').each(function (d) { const w = d.txt.length * 4.9 + 12; d3.select(this).attr('x', -w / 2).attr('y', -8).attr('width', w).attr('height', 16).attr('rx', 8); });
  }

  /* ---------- tooltip: hovering a city reveals its fares (and any hidden deal) ---------- */
  function showTip(c, ev) {
    const cur = at(), on = onRouteIds();
    if (ev && ev.clientX !== undefined) moveTip(ev);
    let modes = '';
    if (playing && !atDest() && !on.has(c.id)) {
      const ls = T.legs(cur, c, ch.seed); noteDeals(cur, c, ls);
      modes = ls.length ? `<div class="modes">${ls.map(l => { const b = blocked(l, c); return `<span class="${b ? 'off' : ''}${l.deal ? ' deal' : ''}">${l.icon} <em>${T.money(l.cost)}</em>${l.deal ? ' 🏷️' : ''}</span>`; }).join('')}</div>` : `<div class="modes"><span>no direct link from ${T.esc(cur.name)}</span></div>`;
    }
    tip.innerHTML = `<b>${T.flagImg(c)} ${T.esc(c.name)}</b><small>${T.esc(c.country)}${c.id === ch.from.id ? ' · start' : c.id === ch.to.id ? ' · destination' : ''}</small>${modes}${playing && !atDest() && !on.has(c.id) && c.id !== cur.id ? '<small class="hint">tap to add as a stop</small>' : ''}`;
    tip.hidden = false;
  }
  function moveTip(e) { const r = stage.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; }
  function hideTip() { tip.hidden = true; }

  /* ---------- actions ---------- */
  function pick(c) {
    if (!playing || atDest()) return;
    const cur = at();
    if (c.id === cur.id) return;
    if (onRouteIds().has(c.id)) return toast(c.name + ' is already on your route');
    const all = T.legs(cur, c, ch.seed); noteDeals(cur, c, all);
    if (!all.length) { markCity(c.id, 'no', 700); return toast('Nothing runs from ' + cur.name + ' to ' + c.name + ' today'); }
    if (!all.some(l => !blocked(l, c))) { markCity(c.id, 'no', 700); return toast('Nothing from ' + cur.name + ' to ' + c.name + ' fits: the cheapest ' + why(blocked(all.slice().sort((x, y) => x.cost - y.cost)[0], c))); }
    pendingTo = c; selOpt = null; refresh(); fitTo([cur, c], 2.2);
    $('#tv-plan').classList.remove('collapsed');
    const el = $('#tv-picker'); if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function commit(c, leg) {
    if (blocked(leg, c)) return toast('That option ' + why(blocked(leg, c)));
    route.push({ from: at().id, to: c.id, leg }); pendingTo = null; selOpt = null; refresh();
    drawNewLeg(c.id);
    if (!atDest()) fitTo([c, ch.to], 1.8); else { fitRoute(); stage.classList.add('arrived'); }
  }
  /* the leg you just took draws itself across the chart and the stop marker springs up */
  function drawNewLeg(toId) {
    if (reducedMotion) return;
    const mine = gLinks.selectAll('path').filter(d => d.cls !== 'flow' && d.cls !== 'ghost').nodes(), p = mine[mine.length - 1];
    const flow = gLinks.selectAll('path').filter(d => d.cls === 'flow').nodes().pop();
    if (p) { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.classList.add('draw'); if (flow) flow.style.opacity = 0; setTimeout(() => { p.classList.remove('draw'); p.removeAttribute('pathLength'); if (flow) flow.style.opacity = ''; drawMap(); }, 620); }
    setTimeout(() => markCity(toId, 'born', 700), 380);
  }
  function refresh() { renderPlan(); drawMap(); }
  let toastT; function toast(m) { let t = $('.tv-toast'); if (!t) { t = document.createElement('div'); t.className = 'tv-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

  /* ---------- planning dashboard ---------- */
  function pace() {
    if (!route.length) return ['', ''];
    if (atDest()) return ['Arrived', 'good'];
    const tt = totals(), prog = Math.max(0, Math.min(1, 1 - T.km(at(), ch.to) / T.km(ch.from, ch.to)));
    const b = tt.cost / M.budget, h = tt.hours / M.deadline, worst = Math.max(b, h);
    if (worst < prog - 0.05) return ['Ahead of pace', 'good'];
    if (worst <= prog + 0.15) return ['On pace', ''];
    return [b >= h ? 'Burning budget' : 'Running late', 'bad'];
  }
  function renderPlan() {
    const tt = totals(), cur = at();
    const gauge = (id, v, cap, fmt) => { const left = cap - v, el = $(id); el.querySelector('b').textContent = fmt(v); el.querySelector('small').textContent = left >= 0 ? fmt(left) + ' left of ' + fmt(cap) : fmt(-left) + ' over'; el.querySelector('.bar i').style.width = Math.min(100, 100 * v / cap) + '%'; el.classList.toggle('warn', v / cap > 0.8); el.classList.toggle('over', v > cap); };
    gauge('#tv-g-cost', tt.cost, M.budget, T.money); gauge('#tv-g-time', tt.hours, M.deadline, T.dur);
    const [pt, pc] = pace(); $('#tv-pace').textContent = speedNote();
    const ts = twState(), done = tw.done(ts);
    $('#tv-twist').innerHTML = tw.id === 'open' ? `<span>${tw.icon} ${T.esc(tw.name)}</span><small>${T.esc(tw.desc)}</small>` : `<span>${tw.icon} ${T.esc(tw.name)}</span><small class="${done ? 'good' : ''}">${T.esc(tw.status(ts))}</small>`;
    renderCounts();
    $('#tv-hint').disabled = !hints || found.size >= M.deals || atDest();
    const est = atDest() ? T.score(tt.cost, tt.hours, elapsed(), M) : null;
    $('#tv-est').hidden = est === null; $('#tv-est b').textContent = est === null ? '—' : est.toLocaleString(); $('#tv-est .bar i').style.width = (est === null ? 0 : est / 100) + '%';
    $('#tv-plan-sub').innerHTML = atDest() ? (done ? (undos ? 'You made it. Submit, or undo a leg and try another idea.' : 'You made it. Submit when you are ready.') : 'You made it, but the twist isn\'t met: ' + T.esc(tw.status(ts)) + '.') : `You're in ${T.esc(cur.name)}.${pt ? ` <span class="pace ${pc}">${pt}</span>` : ''}`;
    $('#tv-submit').disabled = !(atDest() && done); $('#tv-submit').classList.toggle('ready', atDest() && done); $('#tv-undo').disabled = !route.length || !undos;
    $('#tv-undo').textContent = undos ? `Undo · ${undos} left` : 'No undos left';

    let h = `<li class="start"><span class="dot"></span><div class="stop">${T.place(ch.from)}<small>start</small></div>`;
    route.forEach((r, i) => {
      const c = T.byId[r.to], m = T.MODES[r.leg.mode];
      h += `<div class="leg" style="border-color:${m.color}"><span>${r.leg.icon}</span><span><b>${T.money(r.leg.cost)}</b> · ${T.dur(r.leg.hours)}${r.leg.deal ? ` <em class="deal">−${Math.round(r.leg.deal * 100)}%</em>` : ''}<br><span class="n">${m.name}${r.leg.note ? ' · ' + T.esc(r.leg.note) : ''}</span></span><span></span>${i === route.length - 1 ? `<button class="x" title="Remove this leg" data-i="${i}">✕</button>` : ''}</div></li>
        <li class="${c.id === ch.to.id ? 'dest' : ''}"><span class="dot"></span><div class="stop">${T.place(c)}<small>${c.id === ch.to.id ? 'arrived' : 'stop ' + (i + 1)}</small></div>`;
    });
    if (!atDest()) h += `</li><li class="dest ghost"><span class="dot"></span><div class="stop">${T.place(ch.to)}<small>destination</small></div></li>`;
    else h += '</li>';
    $('#tv-stops').innerHTML = h;
    $('#tv-stops').querySelectorAll('.x').forEach(b => (b.onclick = () => undo()));
    renderPicker();
  }

  /* deciding fast earns a bonus; it never costs anything, and the clock says so */
  const speedNote = () => 'bonus +' + Math.round(20 * Math.exp(-Math.max(0, elapsed() - 30) / 240)) + '%';
  function renderCounts() { $('#tv-counts').innerHTML = `<span><b>${route.length}</b> leg${route.length === 1 ? '' : 's'}</span><span><b>${undos}</b> undo${undos === 1 ? '' : 's'}</span><span><b>${hints}</b> hint${hints === 1 ? '' : 's'}</span><span class="deals" title="Secret fares found">🎟️ ${dealDots()} <b>${found.size}</b>/${M.deals}</span>`; }
  /* what a leg means for the twist */
  function twNote(o) {
    const ts = twState();
    if (tw.id === 'oneflight' && o.mode === 'plane') return 'Uses your one flight.';
    if (tw.id === 'ferry' && o.mode === 'ferry') return 'Satisfies the Sea legs twist.';
    if (tw.id === 'rail' && o.mode === 'train') return `Train ${Math.min(2, ts + 1)} of 2 for Rail pass.`;
    if (tw.id === 'threemodes' && !(ts & { plane: 1, train: 2, bus: 4, ferry: 8, ride: 16, car: 32, bike: 64, walk: 128 }[o.mode])) return 'A new kind of transport for Mix it up.';
    return '';
  }
  /* the stop picker: choose the next city, then how to get there */
  function renderPicker() {
    const box = $('#tv-picker'), cur = at();
    if (!playing || atDest()) { box.innerHTML = ''; return; }
    if (pendingTo) {
      const opts = T.legs(cur, pendingTo, ch.seed).slice().sort((a, b) => a.cost - b.cost); noteDeals(cur, pendingTo, opts);
      const okOpts = opts.filter(o => !blocked(o, pendingTo));
      const bc = Math.min(...okOpts.map(o => o.cost)), bt = Math.min(...okOpts.map(o => o.hours));
      const tt = totals();
      const card = selOpt !== null && opts[selOpt] ? (o => { const leftC = M.budget - tt.cost - o.cost, leftH = M.deadline - tt.hours - o.hours, note = twNote(o); return `<div class="tv-legcard" style="border-left-color:${T.MODES[o.mode].color}">
          <div class="hd"><span class="ic">${o.icon}</span><div><b>${T.esc(o.name)}</b><small>${T.esc(cur.name)} → ${T.esc(pendingTo.name)} · ${Math.round(T.km(cur, pendingTo)).toLocaleString()} km</small></div></div>
          <dl><div><dt>Cost</dt><dd>${T.money(o.cost)}${o.deal ? ` <s>${T.money(o.full)}</s>` : ''}</dd></div><div><dt>Time</dt><dd>${T.dur(o.hours)}</dd></div><div><dt>Budget after</dt><dd class="${leftC < M.budget * 0.15 ? 'warn' : ''}">${T.money(leftC)} left</dd></div><div><dt>Deadline after</dt><dd class="${leftH < M.deadline * 0.15 ? 'warn' : ''}">${T.dur(leftH)} left</dd></div></dl>
          ${o.deal ? `<p class="dl">🎟️ Secret fare · ${Math.round(o.deal * 100)}% off</p>` : ''}${note ? `<p class="nt">${tw.icon} ${T.esc(note)}</p>` : ''}
          <button class="btn primary" id="tv-addleg">Add this leg · ${T.money(o.cost)}</button></div>`; })(opts[selOpt]) : '';
      box.innerHTML = `<div class="tv-pick-head"><span class="muted">How do you get to</span><b>${T.place(pendingTo)}</b><small>${Math.round(T.km(cur, pendingTo)).toLocaleString()} km</small><button class="lnk" id="tv-unpick">change stop</button></div>
        <div class="tv-opts">${opts.map((o, i) => { const b = blocked(o, pendingTo); return `<button class="tv-opt${b ? ' off' : ''}${!b && o.cost === bc ? ' best-cost' : ''}${!b && o.hours === bt ? ' best-time' : ''}${o.deal ? ' deal' : ''}${selOpt === i ? ' sel' : ''}" data-i="${i}" ${b ? 'disabled' : ''} style="border-left-color:${b ? 'transparent' : T.MODES[o.mode].color}">
          <span class="ic">${o.icon}</span><span class="nm">${o.name}${o.deal ? ` <em class="deal">🎟️ −${Math.round(o.deal * 100)}%</em>` : ''}<small class="${b ? 'off' : o.live ? 'live' : ''}">${b ? b : o.live ? 'avg of ' + T.esc(String(o.note).replace('avg of ', '')) + (o.nonstop ? ' · nonstop from ' + T.money(o.nonstop.cost) : '') : (o.note || 'modelled')}</small></span>
          <span class="nums"><b>${T.money(o.cost)}${o.deal ? ` <s>${T.money(o.full)}</s>` : ''}</b><span>${T.dur(o.hours)}</span></span></button>`; }).join('')}</div>
        ${card}${selOpt === null ? '<p class="tv-pick-hint">Tap an option to see the details, tap again to take it.</p>' : ''}`;
      box.querySelectorAll('.tv-opt:not(.off)').forEach(b => (b.onclick = () => { const i = +b.dataset.i; if (selOpt === i) commit(pendingTo, opts[i]); else { selOpt = i; renderPicker(); const c = $('.tv-legcard'); if (c) box.scrollTo({ top: Math.max(0, c.offsetTop - box.offsetTop - 8), behavior: 'smooth' }); } }));
      const add = $('#tv-addleg'); if (add) add.onclick = () => commit(pendingTo, opts[selOpt]);
      $('#tv-unpick').onclick = () => { pendingTo = null; selOpt = null; refresh(); };
      return;
    }
    const on = onRouteIds();
    const { reach, finish, suggested } = suggestFrom(cur);
    const row = c => { const ls = usable(cur, c); const dealSeen = T.legs(cur, c, ch.seed).some(l => l.deal && found.has(dealKey(cur, c, l))); return `<button class="tv-stoprow${c.id === ch.to.id ? ' finish' : ''}" data-id="${c.id}"><span class="nm">${T.place(c)}<small>${c.id === ch.to.id ? 'destination' : Math.round(T.km(c, ch.to)).toLocaleString() + ' km to ' + T.esc(ch.to.name)}</small></span><span class="modes">${ls.map(l => `<i title="${l.name}">${l.icon}</i>`).join('')}${dealSeen ? '<i class="dl" title="Secret fare found here">🎟️</i>' : ''}</span><span class="from">from <b>${T.money(Math.min(...ls.map(l => l.cost)))}</b></span></button>`; };
    const destLegs = T.legs(cur, ch.to, ch.seed);
    box.innerHTML = `<div class="tv-pick-head"><b>Add a stop</b><small>${reach.length} places fit from ${T.esc(cur.name)}</small></div>
      <div class="tv-search"><input type="search" id="tv-q" placeholder="Search any city…" autocomplete="off"><ul class="tv-results" id="tv-res" hidden></ul></div>
      <div class="tv-stoplist">${finish ? row(finish) : destLegs.length ? `<div class="tv-stoprow finish off"><span class="nm">${T.place(ch.to)}<small>reachable, but the cheapest option ${T.esc(why(blocked(destLegs.slice().sort((x, y) => x.cost - y.cost)[0], ch.to) || ''))}</small></span></div>` : ''}${suggested.map(row).join('')}</div>
      <p class="tv-pick-hint">Lit cities on the map are reachable. Secret fares only show when you look.</p>`;
    box.querySelectorAll('.tv-stoprow[data-id]').forEach(b => (b.onclick = () => pick(T.byId[b.dataset.id])));
    const q = $('#tv-q'), res = $('#tv-res');
    q.oninput = () => {
      const v = q.value.trim().toLowerCase(); if (!v) { res.hidden = true; return; }
      const m = T.C.filter(c => !on.has(c.id) && (c.name.toLowerCase().includes(v) || c.country.toLowerCase().includes(v))).slice(0, 8);
      res.innerHTML = m.map(c => { const all = T.legs(cur, c, ch.seed).length, ok = usable(cur, c).length; return `<li data-id="${c.id}" class="${ok ? '' : 'off'}">${T.place(c)}<span>${ok ? '' : all ? 'nothing fits' : 'no link today'}</span></li>`; }).join('') || '<li class="off">No match</li>';
      res.hidden = false;
      res.querySelectorAll('li[data-id]:not(.off)').forEach(li => (li.onclick = () => pick(T.byId[li.dataset.id])));
    };
    q.onkeydown = e => { if (e.key === 'Enter') { const li = res.querySelector('li[data-id]:not(.off)'); if (li) li.click(); } };
  }
  $('#tv-plan-toggle').onclick = () => $('#tv-plan').classList.toggle('collapsed');

  /* ---------- flow ---------- */
  function start() {
    route = []; pendingTo = null; selOpt = null; playing = false; found = new Set(); showPar = false; drawn = false; undos = UNDOS; hints = HINTS;
    renderBrief(); hideTip();
    $('#tv-result').hidden = true; $('#tv-board').hidden = true; $('#tv-plan').hidden = true;
    // the chart swoops in on today's region, then the clock starts
    const gate = $('#tv-gate'), plan = $('#tv-plan'); gate.classList.add('off'); stage.classList.add('zooming'); stage.classList.remove('arrived'); stage.classList.remove('intro');
    gCourse.selectAll('path').remove();
    const dur = reducedMotion ? 0 : 1200;
    fitTo([ch.from, ch.to], 1.8, dur, d3.easeCubicOut).on('end interrupt', () => {
      gate.hidden = true; gate.classList.remove('off'); stage.classList.remove('zooming'); relayout();
      plan.hidden = false; plan.classList.remove('leave'); plan.classList.toggle('collapsed', window.innerWidth <= 900); plan.classList.add('arrive');
      playing = true; t0 = performance.now();
      clearInterval(timer); timer = setInterval(() => { $('#tv-timer').textContent = T.secsF(elapsed()); $('#tv-pace').textContent = speedNote(); if (atDest()) { const tt = totals(); const est = T.score(tt.cost, tt.hours, elapsed(), M); $('#tv-est b').textContent = est.toLocaleString(); $('#tv-est .bar i').style.width = est / 100 + '%'; } }, 250);
      refresh();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  $('#tv-start').onclick = start;
  function undo() {
    if (!route.length) return;
    if (!undos) return toast('No undos left, so this route is final.');
    undos--; route.pop(); pendingTo = null; refresh();
    if (!undos) toast('That was your last undo.');
  }
  $('#tv-undo').onclick = undo;
  $('#tv-hint').onclick = () => {
    if (!hints || !playing) return;
    const hidden = M.dealKeys.filter(k => !found.has(k)); if (!hidden.length) return toast('You have found every deal.');
    const k = hidden[Math.floor(T.rng(T.hash(ch.seed + '|hint|' + hints))() * hidden.length)];
    const [pair, modeId] = k.split('|'), [fa, tb] = pair.split('-'); const a = T.byId[fa], b = T.byId[tb], m = T.MODES[modeId];
    const leg = T.legs(a, b, ch.seed).find(l => l.mode === modeId);
    hints--; t0 -= HINT_SECS * 1000; found.add(k); if (leg) dealReveal(a, b, leg); renderBrief(); refresh();
    toast(`Hint used: +${HINT_SECS}s on your clock.`);
    fitTo([a, b], 2.4);
  };
  $('#tv-submit').onclick = () => {
    if (!atDest() || !tw.done(twState())) return;
    const secs = elapsed(); clearInterval(timer); playing = false;
    $('#tv-plan').classList.add('leave'); hideTip();
    const tt = totals(); const sc = T.score(tt.cost, tt.hours, secs, M), tr = T.tier(sc, M);
    const res = { from: ch.from.id, score: sc, tier: tr.name, cost: Math.round(tt.cost), hours: tt.hours, secs: Math.round(secs * 10) / 10, route: route.map(r => ({ to: r.to, mode: r.leg.mode, cost: r.leg.cost, hours: r.leg.hours, deal: r.leg.deal || 0 })),
      deals: { found: found.size, total: M.deals, used: route.filter(r => r.leg.deal).length }, hints: HINTS - hints, undos: UNDOS - undos, par: { cost: M.par.cost, hours: M.par.hours, legs: M.par.legs }, parMatch: tt.cost <= M.par.cost + 1 && tt.hours <= M.par.hours + 0.05, twist: tw.id, at: Date.now() };
    if (!practice) {
      st = T.load(); st.results = st.results || {};
      const before = T.progression(st.results), prior = Object.assign({}, st.results);
      if (!st.results[ch.key]) { st.results[ch.key] = res; T.save(st); }
      practice = true;
      showResult(res, false, T.progression(st.results).xp - before.xp, false, T.newlyEarned(prior, st.results));
    } else showResult(res, true, 0);
  };

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
      <p class="kicker">${isPractice ? (mode === 'today' ? 'Practice run · not scored' : mode === 'archive' ? 'Archive practice · not scored' : 'Random expedition · not scored') : 'Official result · ' + dayLabel}</p>
      <section class="rs-top">
        <div class="rs-rating ${tr.name.toLowerCase()}"><span class="ic">${tr.icon}</span><div><b>${tr.name}</b><small>${ofPar}% of the planner's score (${M.par.score.toLocaleString()})${isPractice ? ' · practice' : ''}</small></div></div>
        <div class="rs-big"><b data-count="${res.score}">${res.score.toLocaleString()}</b><small>score</small>${!isPractice && mode === 'today' ? `<span>Next puzzle in <b>${resetIn()}</b></span>` : ''}</div>
        <p class="rs-verdict ${v.cls}"><b>${v.h}</b> ${v.t}</p>
      </section>
      <section class="rs-journey">
        <p class="lab">Your journey</p>
        <div class="chain">${chain}</div>
        <p class="rs-dist"><b data-count="${km}" data-fmt="km">${km.toLocaleString()} km</b> across <b>${nations} ${nations === 1 ? 'country' : 'countries'}</b></p>
        <div class="rs-stats"><div><b data-count="${Math.round(res.cost)}" data-fmt="money">${T.money(res.cost)}</b><span>spent</span></div><div><b>${T.dur(res.hours)}</b><span>travel time</span></div><div><b>${res.route.length}</b><span>legs</span></div><div><b class="ic">${modesUsed}</b><span>modes</span></div><div><b>${found}/${M.deals}</b><span>deals</span></div></div>
      </section>
      ${earned && earned.length ? `<section class="rs-badges"><p class="lab">New badge${earned.length === 1 ? '' : 's'}</p><div>${earned.map(a => `<a href="achievements.html" class="nb${a.tier ? ' t-' + a.tier.toLowerCase() : ''}"><span>${a.ic}</span><b>${T.esc(a.name)}</b><small>${a.tier || (a.secret ? 'Secret badge' : 'Unlocked')}</small></a>`).join('')}</div></section>` : ''}
      <section class="rs-perf"><p class="lab">Your performance</p>
        ${perf('Cost', T.money(res.cost), T.money(M.cheapest), res.cost <= M.cheapest + 1, '+' + T.money(res.cost - M.cheapest))}
        ${perf('Time', T.dur(res.hours), T.dur(M.fastest), res.hours <= M.fastest + 0.05, '+' + T.dur(res.hours - M.fastest))}
        ${perf('Deals', found + '/' + M.deals, M.deals + '/' + M.deals, found >= M.deals, (M.deals - found) + ' missed')}
      </section>
      <section class="rs-vs"><p class="lab">Your route vs the planner</p>
        <div class="cols">${routeCol('Your route', res.route, res.cost, res.hours, 'you')}<span class="vs">vs</span>${routeCol("Planner's route", parRoute, M.par.cost, M.par.hours, 'par')}</div>
        <div class="tags">${tags.map(t => `<span class="${t[0]}">${t[1]}</span>`).join('')}</div>
      </section>
      <section class="rs-score"><p class="lab">Score breakdown</p>
        <div class="final"><b data-count="${res.score}">${res.score.toLocaleString()}</b><span>final score</span></div>
        ${bar('Cost', f.cost)}${bar('Time', f.time)}${bar('Deals', f.deals)}${bar('Efficiency', f.eff)}
        <div class="brow bonus"><span>Speed bonus</span><div class="bar"><i style="width:${f.speed * 5}%" data-w="${f.speed * 5}"></i></div><b>+${f.speed}%</b></div>
        <p class="note">Cost and time are measured against the best routes that fit today's mission. Efficiency rewards doing well at both. Deciding quickly adds a bonus, up to 20%, and never takes anything away.</p>
      </section>
      ${!isPractice ? `<div class="level"><span>Level ${prog.level} · ${prog.title}${xpGain ? ` · <b>+${xpGain} XP</b>` : ''}</span><div class="bar"><i style="width:${lvlPct}%" data-w="${lvlPct}"></i></div><small>${prog.next ? (prog.next - prog.xp) + ' XP to ' + prog.nextTitle : 'Top level'}</small></div>` : ''}
      <div class="actions"><button class="btn primary big tv-share">Share result</button><button class="btn ghost tv-map">See the map</button><button class="btn ghost tv-stats">Stats</button>${full ? `<button class="btn ghost tv-again">Practice again</button>${mode !== 'today' ? '<a class="btn ghost" href="play.html">Today\'s puzzle</a>' : `<a class="btn ghost" href="play.html?seed=${Math.random().toString(36).slice(2, 8)}">Random expedition</a>`}` : ''}</div>`;
  }
  function wireSummary(root, res) {
    root.querySelectorAll('.tv-share').forEach(b => (b.onclick = () => share(res)));
    root.querySelectorAll('.tv-map').forEach(b => (b.onclick = () => { closeModal(); $('#tv-stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    root.querySelectorAll('.tv-stats').forEach(b => (b.onclick = showStats));
    root.querySelectorAll('.tv-again').forEach(b => (b.onclick = () => { closeModal(); start(); }));
  }
  /* the shareable card: performance without the solution */
  function shareText(res) {
    const tr = T.tier(res.score, M), f = factors(res);
    const bar = x => { const n = Math.round(Math.max(0, Math.min(1, x)) * 10); return '█'.repeat(n) + '░'.repeat(10 - n); };
    const modes = Object.keys(T.MODES).filter(m => res.route.some(r => r.mode === m)).map(m => T.MODES[m].icon).join(' ');
    return `🌎 TRAVERSLE ${ch.n ? '#' + String(ch.n).padStart(3, '0') : 'EXPEDITION'}\n${ch.from.name} → ${ch.to.name}\n💰 ${T.money(res.cost)} · ⏱️ ${T.dur(res.hours)} · 🎟️ ${res.deals ? res.deals.found : 0}/${M.deals} deals\n${tr.icon} ${tr.name.toUpperCase()} · ${res.score.toLocaleString()}\n💰 ${bar(f.mF)}\n⏱️ ${bar(f.tF)}\n🎟️ ${bar(f.dF)}\n${res.route.length} legs · ${modes}\ntraversledaily.com`;
  }
  function share(res) {
    const txt = shareText(res);
    const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied. Paste it wherever you like.'), () => prompt('Copy your result:', txt));
    if (navigator.share) navigator.share({ text: txt }).catch(e => { if (!e || e.name !== 'AbortError') copy(); }); else copy();
  }
  function showModal(res, isPractice, xpGain, earned) {
    $('#tv-modal').innerHTML = `<div class="tv-modal-card rs" role="dialog" aria-modal="true" aria-label="Expedition report"><button class="tv-modal-x" id="tv-modal-close" aria-label="Close">✕</button>${buildSummary(res, isPractice, xpGain, earned)}</div>`;
    $('#tv-modal').hidden = false; document.body.classList.add('tv-modal-open');
    $('#tv-modal-close').onclick = closeModal;
    $('#tv-modal').onclick = e => { if (e.target === $('#tv-modal')) closeModal(); };
    wireSummary($('#tv-modal'), res);
    animateReport($('#tv-modal .rs'));
    $('#tv-modal-close').focus({ preventScroll: true });
  }
  /* the report reveals itself: sections in turn, numbers counting up, bars filling, badges springing in */
  function animateReport(root) {
    if (reducedMotion || !root) return;
    Array.from(root.children).filter(el => el.tagName !== 'BUTTON').forEach((el, i) => { el.classList.add('rv'); el.style.animationDelay = (0.05 + i * 0.11) + 's'; });
    root.querySelectorAll('.rs-badges .nb').forEach((el, i) => { el.style.animationDelay = (0.5 + i * 0.12) + 's'; });
    const fmt = (v, f) => f === 'money' ? T.money(v) : f === 'km' ? v.toLocaleString() + ' km' : v.toLocaleString();
    root.querySelectorAll('[data-count]').forEach((el, i) => {
      const to = +el.dataset.count, f = el.dataset.fmt, dur = 900, begin = performance.now() + 250 + i * 60;
      el.textContent = fmt(0, f);
      const step = now => { const p = Math.max(0, Math.min(1, (now - begin) / dur)), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(Math.round(to * e), f); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    root.querySelectorAll('.bar i[data-w]').forEach(el => { el.style.transition = 'none'; el.style.width = '0%'; });
    requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('.bar i[data-w]').forEach((el, i) => { el.style.transition = 'width .9s cubic-bezier(.2,.8,.2,1) ' + (0.35 + i * 0.08) + 's'; el.style.width = el.dataset.w + '%'; })));
  }
  function closeModal() {
    $('#tv-modal').hidden = true; document.body.classList.remove('tv-modal-open');
    if (parPending) { parPending = false; showPar = true; drawMap(); const t = $('#tv-par-toggle'); if (t) t.textContent = "Hide the planner's route on the map"; animateRoutes('par'); }
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

  function showResult(res, isPractice, xpGain, quiet, earned) {
    const planEl = $('#tv-plan'); if (quiet || reducedMotion) planEl.hidden = true; else setTimeout(() => { planEl.hidden = true; }, 450);
    pendingTo = null; selOpt = null; drawn = false; stage.classList.remove('arrived');
    showPar = !!quiet; parPending = !quiet; // on a fresh submit the planner's route waits until the report closes
    route = res.route.map((r, i) => ({ from: i ? res.route[i - 1].to : ch.from.id, to: r.to, leg: { mode: r.mode, cost: r.cost, hours: r.hours, icon: T.MODES[r.mode].icon, deal: r.deal } }));
    drawMap();
    $('#tv-result').innerHTML = `<div class="rs">${buildSummary(res, isPractice, xpGain, earned, true)}<p class="rs-maptoggle"><button class="lnk" id="tv-par-toggle">${showPar ? 'Hide' : 'Show'} the planner's route on the map</button></p></div>`;
    $('#tv-result').hidden = false;
    wireSummary($('#tv-result'), res);
    $('#tv-par-toggle').onclick = () => { showPar = !showPar; parPending = false; $('#tv-par-toggle').textContent = (showPar ? 'Hide' : 'Show') + " the planner's route on the map"; drawMap(); fitRoute(); };
    st = T.load(); st.results = st.results || {}; showBoard();
    if (quiet) { setTimeout(() => animateRoutes('both'), 150); return; }
    // your finished route draws itself across the chart, then the report arrives
    const wait = animateRoutes('mine');
    setTimeout(() => showModal(res, isPractice, xpGain, earned), Math.max(0, wait - 400));
  }

  /* your week: the last seven puzzles, played or not, with links to replay them */
  function showBoard() {
    const R = st.results || {}, S = T.stats(R, today);
    const days = []; for (let i = 6; i >= 0; i--) { const n = today - i; if (n < 1) continue; const key = T.dayKey(n), r = R[key]; days.push(`<a class="d ${r ? 'p' : ''}" href="play.html${n === today ? '' : '?day=' + n}" title="${key}${r ? ' · ' + r.score.toLocaleString() : ''}">#${n}<small>${r ? r.score.toLocaleString() : '—'}</small></a>`); }
    $('#tv-board').innerHTML = `<div class="card"><h3>Your week</h3><p class="sub">🔥 ${S.streak}-day streak · best ${S.maxStreak} · ${S.played} day${S.played === 1 ? '' : 's'} played. Tap a day to replay it.</p>
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
    let introRan = false;
    const intro = () => { if (introRan) return; introRan = true; setTimeout(() => fitTo([ch.from, ch.to], 3.2, reducedMotion ? 0 : 2300, d3.easeCubicInOut, reducedMotion ? 0 : 450, window.innerWidth >= 1100 ? 250 : 120).on('end interrupt', () => { stage.classList.remove('zooming'); relayout(); stage.classList.add('landed'); }), 50); };
    let firstTime = false; try { firstTime = !localStorage.getItem('traverse.seen'); } catch (e) {}
    if (firstTime && window.tdTutorial) {
      // the first visit gets the tutorial first; the chart's arrival waits until it closes
      const tut = window.tdTutorial; window.tdTutorial = o => { tut(o); if (!o) intro(); }; tut(true);
      try { localStorage.setItem('traverse.seen', '1'); } catch (e) {}
    } else intro();
  }
})();
