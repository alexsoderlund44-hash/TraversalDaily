/* TraversleDaily play UI: quiet map, mission gauges, stop picker, deals, the planner's route, result and ranking. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search), today = T.dayNumber();
  let mode = 'today', ch;
  if (params.get('seed')) { ch = T.challengeRandom(params.get('seed')); mode = 'random'; }
  else if (params.get('day') && +params.get('day') >= 1 && +params.get('day') < today) { ch = T.challenge(+params.get('day')); mode = 'archive'; }
  else ch = T.challenge(today);
  const M = T.mission(ch), tw = ch.twist;
  const fld = T.field(ch, M);
  const LIVE = T.liveFor(ch.seed);
  let st = T.load(); st.results = st.results || {};
  const official = mode === 'today' ? st.results[ch.key] : null;
  let practice = mode !== 'today' || !!official;

  /* ---------- state ---------- */
  let route = [], pendingTo = null, t0 = 0, timer = null, playing = false, found = new Set(), showPar = false;
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
  function noteDeals(a, b, ls) {
    ls.forEach(l => { if (l.deal) { const k = dealKey(a, b, l); if (!found.has(k)) { found.add(k); if (playing) { toast('🏷️ Deal found: ' + l.name + ' to ' + b.name + ', ' + Math.round(l.deal * 100) + '% off'); renderBrief(); } } } });
  }

  /* ---------- static bits ---------- */
  const dayLabel = ch.n ? new Date(ch.key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Random expedition';
  const title = ch.n ? 'Puzzle #' + ch.n : 'Expedition ' + ch.seed.slice(1).toUpperCase();
  const resetIn = () => { const ms = (today * 86400000 + T.EPOCH) - Date.now(); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; };
  const twistPill = () => `<span class="twist" title="${T.esc(tw.desc)}">${tw.icon} ${T.esc(tw.name)}</span>`;
  function renderBrief() {
    $('#tv-brief').innerHTML = `<p class="k">${title} · ${dayLabel}</p>
      <div class="route"><span class="pin s"></span><b>${T.flagImg(ch.from)} ${T.esc(ch.from.name)}<small>${T.esc(ch.from.country)}</small></b>
      <span class="ln"></span><span></span>
      <span class="pin d"></span><b>${T.flagImg(ch.to)} ${T.esc(ch.to.name)}<small>${T.esc(ch.to.country)}</small></b></div>
      <p class="meta"><span>💰 <b>${T.money(M.budget)}</b></span><span>⏱️ <b>${T.dur(M.deadline)}</b></span>${twistPill()}<span title="Hidden fare deals discovered">🏷️ <b>${found.size}</b>/${M.deals}</span></p>`;
  }
  renderBrief();
  $('#tv-gate-day').textContent = title + ' · ' + dayLabel;
  $('#tv-gate-title').innerHTML = `<span class="city">${T.flagImg(ch.from, 40)} ${T.esc(ch.from.name)}<small>${T.esc(ch.from.country)}</small></span><span class="arr">→</span><span class="city">${T.flagImg(ch.to, 40)} ${T.esc(ch.to.name)}<small>${T.esc(ch.to.country)}</small></span>`;
  $('#tv-gate-sub').textContent = `${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km apart and nothing goes there directly. Get there under budget, before the deadline, and find the route the planner had in mind.`;
  $('#tv-gate-mission').innerHTML = `
    <div class="mi"><span class="ic">💰</span><b>${T.money(M.budget)}</b><span>budget</span></div>
    <div class="mi"><span class="ic">⏱️</span><b>${T.dur(M.deadline)}</b><span>deadline</span></div>
    <div class="mi"><span class="ic">${tw.icon}</span><b>${T.esc(tw.name)}</b><span>${T.esc(tw.desc)}</span></div>
    <div class="mi"><span class="ic">🏷️</span><b>${M.deals} deal${M.deals === 1 ? '' : 's'}</b><span>hidden on the map. Look around to find them.</span></div>`;
  $('#tv-gate-rules').innerHTML = `<li>Add stops one at a time and pick how you travel each leg. Anything over budget or past the deadline is greyed out.</li>
    <li>Two of the hidden deals sit on the planner's route. Hover cities or open a stop to reveal its fares.</li>
    <li>Money, hours and how fast you decide all count. ${mode === 'today' ? 'One official run per day.' : 'This is a practice expedition.'}</li>`;
  $('#tv-gate-note').textContent = mode === 'random' ? 'Practice run with a random start and destination. It is not scored.' : mode === 'archive' ? 'Archive puzzle. Practice only, your official score stays with the day you played.' : practice ? 'You already have an official score for today. This run is practice.' : 'The decision clock starts when you press the button.';
  const locked = mode === 'archive' && T.dayLocked(ch.n);
  if (locked) {
    $('#tv-gate-mission').innerHTML = `<div class="tv-lock"><span class="ic">🔒</span><b>This puzzle is in the Plus archive</b><p>The last ${T.FREE_DAYS} days are free to replay. Every puzzle since day one, plus future archive features, comes with TraversleDaily Plus.</p><a class="btn primary" href="plus.html">See TraversleDaily Plus</a> <a class="btn ghost" href="archive.html">Back to the archive</a></div>`;
    $('#tv-gate-rules').hidden = true; $('#tv-start').hidden = true; $('#tv-gate-note').hidden = true;
  }
  $('#tv-source').textContent = LIVE
    ? `Flight prices and times are averages of real one-way economy fares for departures on ${LIVE.depart}, fetched ${new Date(LIVE.fetched).toUTCString().slice(5, 22)} UTC. Trains, buses, rideshares, ferries and cars are modelled from distance and calibrated to the day's fares. Rankings are simulated.`
    : 'No live fare snapshot for this puzzle, so flights are modelled from distance. Rankings are simulated.';

  /* ---------- map ---------- */
  const svg = d3.select('#tv-svg');
  const proj = d3.geoNaturalEarth1().fitSize([960, 500], { type: 'Sphere' });
  const path = d3.geoPath(proj);
  const feats = topojson.feature(WORLD_TOPO, WORLD_TOPO.objects.countries).features;
  const g = svg.append('g');
  g.append('path').attr('class', 'tv-sphere').attr('d', path({ type: 'Sphere' }));
  g.append('g').selectAll('path').data(feats).join('path').attr('class', 'tv-land').attr('d', path);
  const gCountry = g.append('g');
  gCountry.selectAll('text').data(feats.filter(f => path.area(f) > 60)).join('text').attr('class', 'tv-cname')
    .attr('transform', f => { const c = path.centroid(f); return `translate(${c[0]},${c[1]})`; }).text(f => (f.properties.name || '').toUpperCase()).style('display', 'none');
  const gPar = g.append('g'), gLinks = g.append('g'), gBadges = g.append('g'), gHits = g.append('g'), gCities = g.append('g'), gLabels = g.append('g');
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
  const strokeW = d => (d.cls === 'ghost' ? 1 : d.cls === 'flow' ? 1.2 : d.cls === 'par' ? 1.6 : 2.2) / k;
  const zoom = d3.zoom().scaleExtent([1, 14]).translateExtent([[-80, -40], [1040, 540]]).on('zoom', e => {
    g.attr('transform', e.transform); k = e.transform.k; const s = k;
    drawMap();
    gLabels.selectAll('text').style('font-size', (9.5 / s) + 'px').attr('x', c => pos(c)[0] + 5 / s).attr('y', c => pos(c)[1] + 3.2 / s);
    gHits.selectAll('circle').attr('r', 9 / s);
    gCountry.selectAll('text').style('display', k >= 2.6 ? null : 'none').style('font-size', (7 / s * 1.2) + 'px');
    gBadges.selectAll('g').attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / s})`);
    g.select('.tv-pulse-g').attr('transform', `translate(${pos(ch.to)[0]},${pos(ch.to)[1]}) scale(${1 / s})`); g.select('.tv-pulse').style('stroke-width', 1);
    layoutLabels();
  }).on('start', () => { svg.classed('dragging', true); hideTip(); }).on('end', () => svg.classed('dragging', false));
  svg.call(zoom);

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
  function fitTo(points, pad) {
    const xs = points.map(p => pos(p)[0]), ys = points.map(p => pos(p)[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const r = stage.getBoundingClientRect(); const aspect = r.width / r.height;
    const vw = aspect > 960 / 500 ? 960 : 500 * aspect, vh = aspect > 960 / 500 ? 960 / aspect : 500;
    const w = Math.max(60, (x1 - x0) * (pad || 1.6)), h = Math.max(40, (y1 - y0) * (pad || 1.6));
    const kk = Math.min(12, Math.max(1, Math.min(vw / w, vh / h) * 0.9));
    const cx = (x0 + x1) / 2 + (window.innerWidth > 900 ? 120 / kk : 0);
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(480 - kk * cx, 250 - kk * (y0 + y1) / 2).scale(kk));
  }
  function fitRoute() { fitTo([ch.from, ch.to, ...route.map(r => T.byId[r.to]), ...(showPar ? M.par.path.map(e => T.byId[e.to]) : [])], 1.8); }
  const arc = (a, b) => path({ type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] });
  const mid = (a, b) => proj(d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(0.5));

  function drawMap() {
    const cur = at(), on = onRouteIds(), par = parIds();
    const live = playing && !atDest();
    const reach = live ? new Set(T.C.filter(c => !on.has(c.id) && c.id !== cur.id && usable(cur, c).length).map(c => c.id)) : null;
    gCities.selectAll('circle').attr('class', c => 'tv-city'
      + (c.id === cur.id && live ? ' cur' : c.id === ch.from.id ? ' start' : c.id === ch.to.id ? ' dest' : on.has(c.id) ? ' on' : pendingTo && c.id === pendingTo.id ? ' pend' : par.has(c.id) ? ' par' : reach ? (reach.has(c.id) ? ' reach' : ' far') : ''));
    gLabels.selectAll('text').classed('far', c => !!reach && !reach.has(c.id) && c.id !== ch.to.id && c.id !== ch.from.id && !on.has(c.id));
    gCities.selectAll('circle').attr('r', c => (2 + c.hub * 0.5 + (c.id === cur.id && playing && !atDest() ? 1.5 : c.id === ch.from.id || c.id === ch.to.id || on.has(c.id) || par.has(c.id) ? 1 : 0)) / k).style('stroke-width', c => ((c.id === cur.id && playing && !atDest()) ? 8 : (pendingTo && c.id === pendingTo.id) ? 6 : 1) / k);
    layoutLabels();
    const plinks = showPar ? M.par.path.map(e => ({ cls: 'par', d: arc(T.byId[e.from], T.byId[e.to]) })) : [];
    gPar.selectAll('path').data(plinks).join('path').attr('class', 'tv-link par').attr('d', d => d.d).style('stroke-width', strokeW);
    const links = [];
    route.forEach(r => { const a = T.byId[r.from], b = T.byId[r.to]; links.push({ cls: r.leg.mode, d: arc(a, b), col: T.MODES[r.leg.mode].color }); links.push({ cls: 'flow', d: arc(a, b) }); });
    if (pendingTo) links.push({ cls: 'ghost', d: arc(cur, pendingTo) });
    gLinks.selectAll('path').data(links).join('path').attr('class', d => 'tv-link ' + d.cls).attr('d', d => d.d).style('stroke', d => d.col || null).style('stroke-width', strokeW);
    const badges = route.map(r => { const [x, y] = mid(T.byId[r.from], T.byId[r.to]); return { x, y, cls: '', txt: `${r.leg.icon} ${T.money(r.leg.cost)} · ${T.dur(r.leg.hours)}${r.leg.deal ? ' 🏷️' : ''}` }; });
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
    if (!all.length) return toast('Nothing runs from ' + cur.name + ' to ' + c.name + ' today');
    if (!all.some(l => !blocked(l, c))) return toast('Nothing from ' + cur.name + ' to ' + c.name + ' fits: ' + blocked(all.slice().sort((x, y) => x.cost - y.cost)[0], c));
    pendingTo = c; refresh(); fitTo([cur, c], 2.2);
    $('#tv-plan').classList.remove('collapsed');
    const el = $('#tv-picker'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function commit(c, leg) {
    if (blocked(leg, c)) return toast('That option is ' + blocked(leg, c));
    route.push({ from: at().id, to: c.id, leg }); pendingTo = null; refresh();
    if (!atDest()) fitTo([c, ch.to], 1.8); else fitRoute();
  }
  function refresh() { renderPlan(); drawMap(); }
  let toastT; function toast(m) { let t = $('.tv-toast'); if (!t) { t = document.createElement('div'); t.className = 'tv-toast'; document.body.appendChild(t); } t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

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
    const [pt, pc] = pace(); const pe = $('#tv-pace'); pe.textContent = pt; pe.className = pc;
    const ts = twState(), done = tw.done(ts);
    $('#tv-twist').innerHTML = tw.id === 'open' ? `<span>${tw.icon} ${T.esc(tw.name)}</span><small>${T.esc(tw.desc)}</small>` : `<span>${tw.icon} ${T.esc(tw.name)}</span><small class="${done ? 'good' : ''}">${T.esc(tw.status(ts))}</small>`;
    const est = atDest() ? T.score(tt.cost, tt.hours, elapsed(), M) : null;
    $('#tv-est').hidden = est === null; $('#tv-est b').textContent = est === null ? '—' : est.toLocaleString(); $('#tv-est .bar i').style.width = (est === null ? 0 : est / 100) + '%';
    $('#tv-plan-sub').textContent = atDest() ? (done ? 'You\'ve arrived. Submit, or undo a leg to try another idea.' : 'Arrived, but the twist isn\'t met: ' + tw.status(ts) + '.') : `You're in ${cur.name}.`;
    $('#tv-submit').disabled = !(atDest() && done); $('#tv-undo').disabled = !route.length;

    let h = `<li class="start"><span class="dot"></span><div class="stop">${T.place(ch.from)}<small>start</small></div>`;
    route.forEach((r, i) => {
      const c = T.byId[r.to], m = T.MODES[r.leg.mode];
      h += `<div class="leg" style="border-color:${m.color}"><span>${r.leg.icon}</span><span><b>${T.money(r.leg.cost)}</b> · ${T.dur(r.leg.hours)}${r.leg.deal ? ` <em class="deal">−${Math.round(r.leg.deal * 100)}%</em>` : ''}<br><span class="n">${m.name}${r.leg.note ? ' · ' + T.esc(r.leg.note) : ''}</span></span><span></span>${i === route.length - 1 ? `<button class="x" title="Remove this leg" data-i="${i}">✕</button>` : ''}</div></li>
        <li class="${c.id === ch.to.id ? 'dest' : ''}"><span class="dot"></span><div class="stop">${T.place(c)}<small>${c.id === ch.to.id ? 'arrived' : 'stop ' + (i + 1)}</small></div>`;
    });
    if (!atDest()) h += `</li><li class="dest ghost"><span class="dot"></span><div class="stop">${T.place(ch.to)}<small>destination</small></div></li>`;
    else h += '</li>';
    $('#tv-stops').innerHTML = h;
    $('#tv-stops').querySelectorAll('.x').forEach(b => (b.onclick = () => { route.splice(+b.dataset.i); pendingTo = null; refresh(); }));
    renderPicker();
  }

  /* the stop picker: choose the next city, then how to get there */
  function renderPicker() {
    const box = $('#tv-picker'), cur = at();
    if (!playing || atDest()) { box.innerHTML = ''; return; }
    if (pendingTo) {
      const opts = T.legs(cur, pendingTo, ch.seed).slice().sort((a, b) => a.cost - b.cost); noteDeals(cur, pendingTo, opts);
      const okOpts = opts.filter(o => !blocked(o, pendingTo));
      const bc = Math.min(...okOpts.map(o => o.cost)), bt = Math.min(...okOpts.map(o => o.hours));
      box.innerHTML = `<div class="tv-pick-head"><span class="muted">How do you get to</span><b>${T.place(pendingTo)}</b><small>${Math.round(T.km(cur, pendingTo)).toLocaleString()} km</small><button class="lnk" id="tv-unpick">change stop</button></div>
        <div class="tv-opts">${opts.map((o, i) => { const b = blocked(o, pendingTo); return `<button class="tv-opt${b ? ' off' : ''}${!b && o.cost === bc ? ' best-cost' : ''}${!b && o.hours === bt ? ' best-time' : ''}${o.deal ? ' deal' : ''}" data-i="${i}" ${b ? 'disabled' : ''}>
          <span class="ic">${o.icon}</span><span class="nm">${o.name}${o.deal ? ` <em class="deal">🏷️ Deal −${Math.round(o.deal * 100)}%</em>` : ''}<small class="${b ? 'off' : o.live ? 'live' : ''}">${b ? b : o.live ? 'avg of ' + T.esc(String(o.note).replace('avg of ', '')) + (o.nonstop ? ' · nonstop from ' + T.money(o.nonstop.cost) : '') : (o.note || 'modelled')}</small></span>
          <span class="nums"><b>${T.money(o.cost)}${o.deal ? ` <s>${T.money(o.full)}</s>` : ''}</b><span>${T.dur(o.hours)}</span></span></button>`; }).join('')}</div>`;
      box.querySelectorAll('.tv-opt:not(.off)').forEach(b => (b.onclick = () => commit(pendingTo, opts[+b.dataset.i])));
      $('#tv-unpick').onclick = () => { pendingTo = null; refresh(); };
      return;
    }
    const on = onRouteIds();
    const reach = T.C.filter(c => !on.has(c.id) && usable(cur, c).length);
    const row = c => { const ls = usable(cur, c); const dealSeen = T.legs(cur, c, ch.seed).some(l => l.deal && found.has(dealKey(cur, c, l))); return `<button class="tv-stoprow${c.id === ch.to.id ? ' finish' : ''}" data-id="${c.id}"><span class="nm">${T.place(c)}<small>${c.id === ch.to.id ? 'destination' : Math.round(T.km(c, ch.to)).toLocaleString() + ' km to ' + T.esc(ch.to.name)}</small></span><span class="modes">${ls.map(l => `<i title="${l.name}">${l.icon}</i>`).join('')}${dealSeen ? '<i title="Deal found here">🏷️</i>' : ''}</span><span class="from">${ls.length} option${ls.length === 1 ? '' : 's'}</span></button>`; };
    const finish = reach.find(c => c.id === ch.to.id);
    const destLegs = T.legs(cur, ch.to, ch.seed);
    const suggested = reach.filter(c => c.id !== ch.to.id)
      .map(c => ({ c, score: T.km(c, ch.to) + (usable(cur, c).length < 2 ? 400 : 0) - c.hub * 80 }))
      .sort((a, b) => a.score - b.score).slice(0, 6).map(x => x.c);
    box.innerHTML = `<div class="tv-pick-head"><b>Add a stop</b><small>${reach.length} places fit from ${T.esc(cur.name)}</small></div>
      <div class="tv-search"><input type="search" id="tv-q" placeholder="Search any city…" autocomplete="off"><ul class="tv-results" id="tv-res" hidden></ul></div>
      <div class="tv-stoplist">${finish ? row(finish) : destLegs.length ? `<div class="tv-stoprow finish off"><span class="nm">${T.place(ch.to)}<small>reachable, but nothing fits: ${T.esc(blocked(destLegs.slice().sort((x, y) => x.cost - y.cost)[0], ch.to) || '')}</small></span></div>` : ''}${suggested.map(row).join('')}</div>
      <p class="tv-pick-hint">Or hover and tap cities on the map. Hidden deals show up when you look.</p>`;
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
    route = []; pendingTo = null; playing = true; found = new Set(); showPar = false;
    renderBrief();
    $('#tv-gate').hidden = true; $('#tv-result').hidden = true; $('#tv-board').hidden = true; $('#tv-plan').hidden = false;
    $('#tv-plan').classList.toggle('collapsed', window.innerWidth <= 900);
    t0 = performance.now();
    clearInterval(timer); timer = setInterval(() => { $('#tv-timer').textContent = T.secsF(elapsed()); if (atDest()) { const tt = totals(); const est = T.score(tt.cost, tt.hours, elapsed(), M); $('#tv-est b').textContent = est.toLocaleString(); $('#tv-est .bar i').style.width = est / 100 + '%'; } }, 250);
    refresh(); fitRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#tv-start').onclick = start;
  $('#tv-undo').onclick = () => { route.pop(); pendingTo = null; refresh(); };
  $('#tv-clear').onclick = () => { route = []; pendingTo = null; refresh(); fitRoute(); };
  $('#tv-submit').onclick = () => {
    if (!atDest() || !tw.done(twState())) return;
    const secs = elapsed(); clearInterval(timer); playing = false;
    const tt = totals(); const sc = T.score(tt.cost, tt.hours, secs, M), tr = T.tier(sc, M);
    const res = { score: sc, tier: tr.name, cost: Math.round(tt.cost), hours: tt.hours, secs: Math.round(secs * 10) / 10, route: route.map(r => ({ to: r.to, mode: r.leg.mode, cost: r.leg.cost, hours: r.leg.hours, deal: r.leg.deal || 0 })),
      deals: { found: found.size, total: M.deals, used: route.filter(r => r.leg.deal).length }, par: { cost: M.par.cost, hours: M.par.hours, legs: M.par.legs }, parMatch: tt.cost <= M.par.cost + 1 && tt.hours <= M.par.hours + 0.05, twist: tw.id, at: Date.now() };
    if (!practice) {
      st = T.load(); st.results = st.results || {};
      const before = T.progression(st.results);
      if (!st.results[ch.key]) { st.results[ch.key] = res; T.save(st); }
      practice = true;
      showResult(res, false, T.progression(st.results).xp - before.xp);
    } else showResult(res, true, 0);
  };

  /* the summary that pops up the moment you submit */
  function showModal(res, isPractice, xpGain) {
    const rk = T.rankOf(res.score, fld), pct = Math.max(1, Math.round(100 * rk.rank / rk.of)), tr = T.tier(res.score, M);
    const prog = T.progression(T.load().results || {});
    const grade = (v, best, good, ok) => v <= best * good ? 'good' : v <= best * ok ? 'ok' : 'poor';
    const gLabel = { good: 'Excellent', ok: 'Decent', poor: 'Costly' };
    const mG = grade(res.cost, M.par.cost, 1.08, 1.3), tG = grade(res.hours, M.par.hours, 1.08, 1.3), dG = res.secs <= 60 ? 'good' : res.secs <= 150 ? 'ok' : 'poor';
    const dial = (lab, val, sub, g, pctFill, txt) => `<div class="dial ${g}"><span class="lab">${lab}</span><b>${val}</b><small>${sub}</small><div class="bar"><i style="width:${Math.max(4, Math.min(100, pctFill))}%"></i></div><em>${txt}</em></div>`;
    const legs = res.route.map((r, i) => { const a = i ? T.byId[res.route[i - 1].to] : ch.from, b = T.byId[r.to], m = T.MODES[r.mode]; return `<li><span class="n">${i + 1}</span><span class="ic">${m.icon}</span><span class="where">${T.esc(a.name)} <i>→</i> ${T.esc(b.name)}<small>${m.name}${r.deal ? ` · <em class="deal">deal −${Math.round(r.deal * 100)}%</em>` : ''}</small></span><span class="num">${T.money(r.cost)}</span><span class="num">${T.dur(r.hours)}</span></li>`; }).join('');
    const parMatch = res.parMatch || (res.cost <= M.par.cost + 1 && res.hours <= M.par.hours + 0.05);
    const vsPar = parMatch ? `<span class="good">✓ You matched the planner's route</span>` : `<span>Planner: ${T.money(M.par.cost)} · ${T.dur(M.par.hours)} · ${M.par.legs} legs</span><span class="${res.cost > M.par.cost ? 'bad' : 'good'}">${res.cost > M.par.cost ? '+' + T.money(res.cost - M.par.cost) : 'cheaper'}</span><span class="${res.hours > M.par.hours ? 'bad' : 'good'}">${res.hours > M.par.hours + 0.05 ? '+' + T.dur(res.hours - M.par.hours) : 'as fast or faster'}</span>`;
    const lvlPct = prog.next ? Math.round(100 * prog.into / prog.span) : 100;
    $('#tv-modal').innerHTML = `<div class="tv-modal-card" role="dialog" aria-modal="true" aria-label="Journey summary">
      <button class="tv-modal-x" id="tv-modal-close" aria-label="Close">✕</button>
      <p class="kicker">${isPractice ? (mode === 'today' ? 'Practice run · not scored' : mode === 'archive' ? 'Archive practice · not scored' : 'Random expedition · not scored') : 'Official result · ' + ch.key}</p>
      <div class="top">
        <div class="tier"><span class="ic">${tr.icon}</span><b>${tr.name}</b><small>${title} · ${T.esc(ch.from.name)} → ${T.esc(ch.to.name)}</small></div>
        <div class="pts"><b>${res.score.toLocaleString()}</b><small>Traversle score</small><span>${isPractice ? 'would rank' : 'rank'} <b>#${rk.rank.toLocaleString()}</b> of ${rk.of.toLocaleString()} · top ${pct}%</span></div>
      </div>
      <div class="dials">
        ${dial('Money', T.money(res.cost), 'of ' + T.money(M.budget) + ' budget', mG, 100 * res.cost / M.budget, gLabel[mG])}
        ${dial('Time', T.dur(res.hours), 'of ' + T.dur(M.deadline) + ' deadline', tG, 100 * res.hours / M.deadline, gLabel[tG])}
        ${dial('Decision', T.secsF(res.secs), res.route.length + ' legs · ' + (res.deals ? res.deals.found : 0) + '/' + M.deals + ' deals found', dG, Math.min(100, 100 * res.secs / 240), dG === 'good' ? 'Quick' : dG === 'ok' ? 'Steady' : 'Slow')}
      </div>
      <ol class="legs">${legs}<li class="total"><span class="n"></span><span class="ic">Σ</span><span class="where">Total<small>${tw.icon} ${T.esc(tw.name)}</small></span><span class="num">${T.money(res.cost)}</span><span class="num">${T.dur(res.hours)}</span></li></ol>
      <div class="vs">${vsPar}</div>
      ${!isPractice ? `<div class="level"><span>Level ${prog.level} · ${prog.title}${xpGain ? ` · <b>+${xpGain} XP</b>` : ''}</span><div class="bar"><i style="width:${lvlPct}%"></i></div><small>${prog.next ? (prog.next - prog.xp) + ' XP to ' + prog.nextTitle : 'Top level'}</small></div>` : ''}
      <div class="actions"><button class="btn primary" id="tv-modal-share">Copy result</button><button class="btn ghost" id="tv-modal-map">See the planner's route</button><button class="btn ghost" id="tv-modal-again">Practice again</button></div>
    </div>`;
    $('#tv-modal').hidden = false; document.body.classList.add('tv-modal-open');
    $('#tv-modal-close').onclick = closeModal; $('#tv-modal-map').onclick = closeModal;
    $('#tv-modal').onclick = e => { if (e.target === $('#tv-modal')) closeModal(); };
    $('#tv-modal-again').onclick = () => { closeModal(); start(); };
    $('#tv-modal-share').onclick = () => $('#tv-share').click();
  }
  function closeModal() { $('#tv-modal').hidden = true; document.body.classList.remove('tv-modal-open'); fitRoute(); }

  function showResult(res, isPractice, xpGain, quiet) {
    $('#tv-plan').hidden = true; pendingTo = null; showPar = true;
    route = res.route.map((r, i) => ({ from: i ? res.route[i - 1].to : ch.from.id, to: r.to, leg: { mode: r.mode, cost: r.cost, hours: r.hours, icon: T.MODES[r.mode].icon, deal: r.deal } }));
    drawMap(); fitRoute();
    const rk = T.rankOf(res.score, fld), pct = Math.max(1, Math.round(100 * rk.rank / rk.of));
    const tr = T.tier(res.score, M), prog = T.progression(T.load().results || {});
    const pathHTML = rt => [ch.from, ...rt.map(r => T.byId[r.to])].map((c, i) => (i ? `<span class="lg">${T.MODES[rt[i - 1].mode].icon} ${T.money(rt[i - 1].cost)} · ${T.dur(rt[i - 1].hours)}${rt[i - 1].deal ? ' 🏷️' : ''}</span>` : '') + `<span class="pl">${T.place(c)}</span>`).join('');
    const parRoute = M.par.path.map(e => ({ to: e.to, mode: e.mode, cost: e.cost, hours: e.hours, deal: e.deal }));
    const parMatch = res.parMatch || (res.cost <= M.par.cost + 1 && res.hours <= M.par.hours + 0.05);
    const parStops = M.par.path.slice(0, -1).map(e => T.byId[e.to].name);
    const insight = parMatch ? `You found the planner's route${res.secs > 120 ? `, but took <b>${T.secsF(res.secs)}</b> to decide. Faster calls score higher.` : '. That is the best balance of money and time today.'}`
      : res.cost > M.par.cost * 1.25 ? `The planner spent <b>${T.money(M.par.cost)}</b> going through ${parStops.join(' and ')}${M.par.path.some(e => e.deal) ? ', using a hidden deal' : ''}. You spent ${T.money(res.cost - M.par.cost)} more.`
      : res.hours > M.par.hours * 1.25 ? `The planner got there in <b>${T.dur(M.par.hours)}</b> via ${parStops.join(' and ')}. Your route took ${T.dur(res.hours - M.par.hours)} longer.`
      : (res.deals && res.deals.found < M.deals) ? `Close. You found <b>${res.deals.found} of ${M.deals}</b> hidden deals. The planner's route uses ${M.par.path.filter(e => e.deal).length}.`
      : `Strong route, within a whisker of the planner. ${res.secs > 90 ? 'Deciding faster is where the rest of the points are.' : ''}`;
    const cmp = (a, b, fmt, lowerBetter) => `<td class="r">${fmt(a)}</td><td class="r">${fmt(b)}</td><td class="r ${a <= b ? 'good' : 'bad'}">${a <= b ? '✓' : (lowerBetter ? '+' + fmt(a - b) : '')}</td>`;
    const lvlPct = prog.next ? Math.round(100 * prog.into / prog.span) : 100;
    $('#tv-result').innerHTML = `
      <div class="hero">
        ${isPractice ? `<span class="tag prac">${mode === 'today' ? 'Practice run · not scored' : mode === 'archive' ? 'Archive practice · not scored' : 'Random expedition · not scored'}</span>` : '<span class="tag lock">Official score for ' + ch.key + ' saved</span>'}
        <p class="tier">${tr.icon} ${tr.name}</p>
        <p class="lbl">Traversle score</p><div class="score">${res.score.toLocaleString()}</div>
        <p class="rank">${isPractice ? `Would rank <b>#${rk.rank.toLocaleString()}</b> of ${rk.of.toLocaleString()}` : `Global rank <b>#${rk.rank.toLocaleString()}</b> of ${rk.of.toLocaleString()} · top ${pct}%`}</p>
        <p class="insight">${insight}</p>
        ${!isPractice ? `<div class="level"><span>Level ${prog.level} · ${prog.title}${xpGain ? ` · <b>+${xpGain} XP</b>` : ''}</span><div class="bar"><i style="width:${lvlPct}%"></i></div><small>${prog.next ? (prog.next - prog.xp) + ' XP to ' + prog.nextTitle : 'Top level'}</small></div>` : ''}
        <div class="actions"><button class="btn primary" id="tv-share" style="margin:0">Copy result</button><button class="btn ghost" id="tv-again">Practice again</button><a class="btn ghost" href="play.html?seed=${Math.random().toString(36).slice(2, 8)}">Random expedition</a>${mode !== 'today' ? '<a class="btn ghost" href="play.html">Today\'s puzzle</a>' : ''}</div>
      </div>
      <div class="compare">
        <table><thead><tr><th></th><th class="r">You</th><th class="r">Planner</th><th class="r"></th></tr></thead><tbody>
          <tr><td>Spent <small>budget ${T.money(M.budget)}</small></td>${cmp(res.cost, M.par.cost, T.money, true)}</tr>
          <tr><td>Travel time <small>deadline ${T.dur(M.deadline)}</small></td>${cmp(res.hours, M.par.hours, T.dur, true)}</tr>
          <tr><td>Legs</td><td class="r">${res.route.length}</td><td class="r">${M.par.legs}</td><td></td></tr>
          <tr><td>Deals found</td><td class="r">${res.deals ? res.deals.found : 0} of ${M.deals}</td><td class="r">${M.par.path.filter(e => e.deal).length} used</td><td></td></tr>
          <tr><td>Decided in</td><td class="r">${T.secsF(res.secs)}</td><td class="r">—</td><td></td></tr>
        </tbody></table>
      </div>
      <div class="path"><h4>Your route</h4>${pathHTML(res.route)}</div>
      <div class="path par"><h4>The planner's route <button class="lnk" id="tv-par-toggle">hide on map</button></h4>${pathHTML(parRoute)}</div>`;
    $('#tv-result').hidden = false;
    $('#tv-again').onclick = start;
    $('#tv-par-toggle').onclick = () => { showPar = !showPar; $('#tv-par-toggle').textContent = showPar ? 'hide on map' : 'show on map'; drawMap(); fitRoute(); };
    $('#tv-share').onclick = () => {
      const modes = res.route.map(r => T.MODES[r.mode].icon).join('');
      const txt = `TraversleDaily ${ch.n ? '#' + ch.n : 'expedition'} ${T.placeText(ch.from)} → ${T.placeText(ch.to)}\n${modes} ${res.route.length} legs · 🏷️ ${res.deals ? res.deals.found : 0}/${M.deals} · ${tw.icon} ${tw.name}\n${tr.icon} ${tr.name} · ${res.score.toLocaleString()} · #${rk.rank.toLocaleString()} of ${rk.of.toLocaleString()}\n💰 ${T.money(res.cost)}/${T.money(M.budget)} ⏱️ ${T.dur(res.hours)}/${T.dur(M.deadline)} ⚡ ${T.secsF(res.secs)}\n${location.origin}${location.pathname}`;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied'), () => { prompt('Copy your result:', txt); });
    };
    showBoard(mode === 'today' ? (st.results[ch.key] || res) : res);
    if (!quiet) showModal(res, isPractice, xpGain);
  }

  function showBoard(mine) {
    const rk = T.rankOf(mine.score, fld), r = T.rng(T.hash('names-' + ch.seed));
    const FIRST = ['Mara', 'Jonas', 'Aiko', 'Diego', 'Nia', 'Luca', 'Priya', 'Sam', 'Elif', 'Tomás', 'Zara', 'Kai', 'Ines', 'Noor', 'Ravi', 'Sofie', 'Owen', 'Lena', 'Yusuf', 'Hana'];
    const FLAGS = ['🇺🇸', '🇬🇧', '🇩🇪', '🇯🇵', '🇧🇷', '🇮🇳', '🇫🇷', '🇪🇸', '🇨🇦', '🇦🇺', '🇰🇷', '🇲🇽', '🇳🇱', '🇸🇪', '🇹🇷', '🇳🇬', '🇮🇹', '🇵🇱', '🇦🇷', '🇿🇦'];
    const name = () => FIRST[Math.floor(r() * FIRST.length)] + ' ' + String.fromCharCode(65 + Math.floor(r() * 26)) + '. ' + FLAGS[Math.floor(r() * FLAGS.length)];
    const all = fld.slice(0, 5).map((s, i) => ({ rank: i + 1, name: name(), score: s })).concat([{ rank: rk.rank, name: 'You', score: mine.score, me: true }]);
    if (rk.rank > 7) { all.push({ rank: rk.rank - 1, name: name(), score: fld[rk.rank - 2] }); all.push({ rank: rk.rank + 1, name: name(), score: fld[rk.rank - 1] }); }
    const seen = new Set(), rows = []; all.sort((a, b) => a.rank - b.rank || (a.me ? -1 : 1)).forEach(x => { if (!seen.has(x.rank) || x.me) { seen.add(x.rank); rows.push(x); } });
    const bins = new Array(20).fill(0); fld.forEach(s => bins[Math.min(19, Math.floor(s / 500))]++);
    const myBin = Math.min(19, Math.floor(mine.score / 500)), mx = Math.max(...bins);
    const played = Object.keys(st.results || {});
    const days = []; for (let i = 6; i >= 0; i--) { const n = today - i; if (n < 1) continue; const key = T.dayKey(n); days.push(`<a class="d ${st.results[key] ? 'p' : ''}" href="play.html${n === today ? '' : '?day=' + n}" title="${key}${st.results[key] ? ' · ' + st.results[key].score.toLocaleString() : ''}">#${n}</a>`); }
    $('#tv-board').innerHTML = `<div class="card"><h3>${ch.n ? 'Today\'s field' : 'Expedition field'}</h3><p class="sub">Simulated global ranking for ${ch.n ? 'TraversleDaily #' + ch.n : 'this expedition'}, ${rk.of.toLocaleString()} journeys. ${mode === 'today' ? 'Your official score is the first one you submitted today.' : ''}</p>
      <table><thead><tr><th>#</th><th>Traveller</th><th class="r">Score</th></tr></thead><tbody>
      ${rows.map(x => `<tr${x.me ? ' class="me"' : ''}><td>${x.rank.toLocaleString()}</td><td>${x.name}</td><td class="r">${x.score.toLocaleString()}</td></tr>`).join('')}</tbody></table>
      <div class="dist">${bins.map((b, i) => `<i class="${i === myBin ? 'me' : ''}" style="height:${Math.max(3, 100 * b / mx)}%" title="${(i * 500).toLocaleString()}–${(i * 500 + 499).toLocaleString()}: ${b}"></i>`).join('')}</div>
      <div class="axis"><span>0</span><span>Score distribution</span><span>10,000</span></div>
      <div class="tv-hist">${days.join('')}<span style="font-size:.8rem;color:var(--cream-3);margin-left:6px">${played.length} day${played.length === 1 ? '' : 's'} played · tap a day to replay it</span></div></div>`;
    $('#tv-board').hidden = false;
  }

  /* ---------- initial ---------- */
  drawMap();
  if (official) { $('#tv-gate').hidden = true; showResult(official, false, 0, true); }
  else setTimeout(() => fitTo([ch.from, ch.to], 1.6), 50);
})();
