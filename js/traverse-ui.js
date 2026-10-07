/* Traverse UI: layered map, on-map transport picker, planning dashboard, result & ranking. */
(function () {
  'use strict';
  const T = window.Traverse, $ = s => document.querySelector(s);
  const ch = T.challenge(T.dayNumber());
  const bm = T.benchmarks(ch);
  const fld = T.field(ch, bm);
  const LIVE = T.live();
  const liveToday = LIVE && LIVE.date === ch.key;
  let st = T.load(); st.results = st.results || {};
  const official = st.results[ch.key];
  let practice = !!official;

  /* ---------- state ---------- */
  let route = [], pendingTo = null, t0 = 0, timer = null, playing = false;
  const at = () => route.length ? T.byId[route[route.length - 1].to] : ch.from;
  const atDest = () => at().id === ch.to.id;
  const totals = () => route.reduce((a, r) => ({ cost: a.cost + r.leg.cost, hours: a.hours + r.leg.hours }), { cost: 0, hours: 0 });
  const elapsed = () => playing ? (performance.now() - t0) / 1000 : 0;
  const onRouteIds = () => new Set([ch.from.id, ...route.map(r => r.to)]);

  /* ---------- static header bits ---------- */
  const dayLabel = new Date(ch.key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const resetIn = () => { const ms = (T.dayNumber() * 86400000 + Date.UTC(2026, 0, 1)) - Date.now(); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; };
  $('#tv-brief').innerHTML = `<p class="k">Traverse Daily #${ch.n} · ${dayLabel}</p>
    <div class="route"><span class="pin s"></span><b>${ch.from.flag} ${T.esc(ch.from.name)}<small>${T.esc(ch.from.country)}</small></b>
    <span class="ln"></span><span></span>
    <span class="pin d"></span><b>${ch.to.flag} ${T.esc(ch.to.name)}<small>${T.esc(ch.to.country)}</small></b></div>
    <p class="meta"><span><b>${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km</b> direct</span><span>no direct flight today</span><span>resets in <b>${resetIn()}</b></span></p>`;
  $('#tv-gate-day').textContent = '#' + ch.n + ' · ' + dayLabel;
  $('#tv-gate-title').innerHTML = `${ch.from.flag} ${T.esc(ch.from.name)}<span class="arr">→</span>${ch.to.flag} ${T.esc(ch.to.name)}`;
  $('#tv-gate-sub').textContent = `${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km as the crow flies, and no direct flight today. Find the smartest way across.`;
  $('#tv-gate-note').textContent = practice ? 'You already have an official score for today. This run is practice.' : 'One official run per day. The decision clock starts when you press the button.';
  $('#tv-legend').innerHTML = Object.entries(T.MODES).filter(([k]) => k !== 'walk' && k !== 'bike').map(([k, m]) => `<span><i style="border-color:${m.color}"></i>${m.icon} ${m.name}</span>`).join('');
  $('#td-nav-score').style.display = official ? '' : 'none';
  $('#tv-source').textContent = liveToday
    ? `Flight prices and times are averages of real one-way economy fares (${LIVE.source.split(',')[0]}) for departures on ${LIVE.depart}, fetched ${new Date(LIVE.fetched).toUTCString().slice(5, 22)} UTC. Trains, buses, ferries and cars are modelled from distance and calibrated to the day's fares. Rankings are simulated.`
    : 'No live fare snapshot for today, so flights are modelled from distance. Rankings are simulated.';

  /* ---------- map ---------- */
  const svg = d3.select('#tv-svg');
  const proj = d3.geoNaturalEarth1().fitSize([960, 500], { type: 'Sphere' });
  const path = d3.geoPath(proj);
  const feats = topojson.feature(WORLD_TOPO, WORLD_TOPO.objects.countries).features;
  const g = svg.append('g');
  g.append('path').attr('class', 'tv-sphere').attr('d', path({ type: 'Sphere' }));
  g.append('path').attr('class', 'tv-grat').attr('d', path(d3.geoGraticule10()));
  const gLand = g.append('g');
  gLand.selectAll('path').data(feats).join('path').attr('class', 'tv-land').attr('d', path);
  // country names appear when zoomed in
  const gCountry = g.append('g');
  gCountry.selectAll('text').data(feats.filter(f => path.area(f) > 60)).join('text').attr('class', 'tv-cname')
    .attr('transform', f => { const c = path.centroid(f); return `translate(${c[0]},${c[1]})`; }).text(f => (f.properties.name || '').toUpperCase()).style('display', 'none');
  const gCand = g.append('g'), gLinks = g.append('g'), gBadges = g.append('g'), gCities = g.append('g'), gLabels = g.append('g');
  const pos = c => proj([c.lon, c.lat]);
  const tip = $('#tv-tip'), pop = $('#tv-pop'), stage = $('#tv-stage');
  g.append('circle').attr('class', 'tv-pulse').attr('cx', pos(ch.to)[0]).attr('cy', pos(ch.to)[1]);
  gCities.selectAll('circle').data(T.C).join('circle')
    .attr('class', c => 'tv-city' + (c.hub >= 2 ? ' hub' : '')).attr('r', c => 2.4 + c.hub * 0.7)
    .attr('cx', c => pos(c)[0]).attr('cy', c => pos(c)[1])
    .on('click', (e, c) => { e.stopPropagation(); pick(c); })
    .on('mouseenter', (e, c) => showTip(c)).on('mousemove', e => moveTip(e)).on('mouseleave', hideTip);
  gLabels.selectAll('text').data(T.C).join('text').attr('class', c => 'tv-label' + (c.hub >= 2 ? '' : ' minor'))
    .attr('x', c => pos(c)[0] + 5).attr('y', c => pos(c)[1] + 3.2).text(c => c.name);

  let k = 1;
  const zoom = d3.zoom().scaleExtent([1, 14]).translateExtent([[-80, -40], [1040, 540]]).on('zoom', e => {
    g.attr('transform', e.transform); k = e.transform.k; const s = Math.sqrt(k);
    gCities.selectAll('circle').attr('r', c => (2.4 + c.hub * 0.7) / s).attr('stroke-width', c => 1 / s);
    gLabels.selectAll('text').style('font-size', (9.5 / s) + 'px').attr('x', c => pos(c)[0] + 5 / s).attr('y', c => pos(c)[1] + 3.2 / s); layoutLabels();
    gCountry.selectAll('text').style('display', k >= 2.6 ? null : 'none').style('font-size', (7 / s * 1.2) + 'px');
    gLinks.selectAll('path').style('stroke-width', d => (d.cls === 'ghost' ? 1 : d.cls === 'flow' ? 1.2 : 2.2) / s);
    gCand.selectAll('path').style('stroke-width', 1.2 / s);
    gBadges.selectAll('g').attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / s})`);
    g.select('.tv-pulse').style('stroke-width', 1 / s);
    positionPop();
  }).on('start', () => { svg.classed('dragging', true); hideTip(); }).on('end', () => svg.classed('dragging', false));
  svg.call(zoom).on('click', () => closePop());
  function layoutLabels() {
    const s = Math.sqrt(k), boxes = [];
    const pri = c => (c.id === ch.from.id || c.id === ch.to.id ? 100 : onRouteIds().has(c.id) ? 90 : (pendingTo && c.id === pendingTo.id) ? 85 : c.hub * 10);
    const vis = {};
    T.C.filter(labelOn).sort((a, b) => pri(b) - pri(a)).forEach(c => {
      const [x, y] = pos(c); const w = c.name.length * 5.6 / s, h = 11 / s;
      const bx = { x0: x + 4 / s, y0: y - h / 2, x1: x + 4 / s + w, y1: y + h / 2 };
      const hit = boxes.some(b => bx.x0 < b.x1 && bx.x1 > b.x0 && bx.y0 < b.y1 && bx.y1 > b.y0);
      if (!hit) { boxes.push(bx); vis[c.id] = true; }
    });
    gLabels.selectAll('text').style('display', c => vis[c.id] ? null : 'none');
  }
  const labelOn = c => c.id === ch.from.id || c.id === ch.to.id || onRouteIds().has(c.id) || (pendingTo && c.id === pendingTo.id) || c.hub >= 3 || (c.hub >= 2 && k >= 1.6) || (c.hub >= 1 && k >= 2.8) || k >= 4.5;
  $('#tv-zin').onclick = () => svg.transition().call(zoom.scaleBy, 1.6);
  $('#tv-zout').onclick = () => svg.transition().call(zoom.scaleBy, 1 / 1.6);
  $('#tv-zfit').onclick = () => fitRoute();
  function fitTo(points, pad) {
    const xs = points.map(p => pos(p)[0]), ys = points.map(p => pos(p)[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const r = stage.getBoundingClientRect(); const aspect = r.width / r.height; // viewBox is 960x500 with slice
    const vw = aspect > 960 / 500 ? 960 : 500 * aspect, vh = aspect > 960 / 500 ? 960 / aspect : 500;
    const w = Math.max(60, (x1 - x0) * (pad || 1.6)), h = Math.max(40, (y1 - y0) * (pad || 1.6));
    const kk = Math.min(12, Math.max(1, Math.min(vw / w, vh / h) * 0.9));
    const cx = (x0 + x1) / 2 + (window.innerWidth > 900 ? 120 / kk : 0); // leave room for the plan panel
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(480 - kk * cx, 250 - kk * (y0 + y1) / 2).scale(kk));
  }
  function fitRoute() { fitTo([ch.from, ch.to, ...route.map(r => T.byId[r.to])]); }
  const arc = (a, b) => path({ type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] });
  const mid = (a, b) => { const i = d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(0.5); return proj(i); };

  function drawMap() {
    const cur = at(), on = onRouteIds();
    const reach = atDest() ? new Set() : new Set(T.C.filter(c => !on.has(c.id) && T.legs(cur, c, ch.seed).length).map(c => c.id));
    gCities.selectAll('circle').attr('class', c => 'tv-city' + (c.hub >= 2 ? ' hub' : '')
      + (c.id === cur.id && playing ? ' cur' : c.id === ch.from.id ? ' start' : c.id === ch.to.id ? ' dest' : on.has(c.id) ? ' on' : '')
      + (reach.has(c.id) ? ' reach' : '') + (playing && !reach.has(c.id) && !on.has(c.id) && c.id !== ch.to.id ? ' dim' : ''));
    layoutLabels();
    // candidate spokes from the current city (faint)
    const cand = playing && !atDest() ? T.C.filter(c => reach.has(c.id) && (c.hub >= 2 || c.id === ch.to.id)).map(c => arc(cur, c)) : [];
    gCand.selectAll('path').data(cand).join('path').attr('class', 'tv-link cand').attr('d', d => d).style('stroke-width', 1.2 / Math.sqrt(k));
    // route links
    const links = [];
    route.forEach(r => { const a = T.byId[r.from], b = T.byId[r.to]; links.push({ cls: r.leg.mode, d: arc(a, b), col: T.MODES[r.leg.mode].color }); links.push({ cls: 'flow', d: arc(a, b) }); });
    if (pendingTo) links.push({ cls: 'ghost', d: arc(cur, pendingTo) });
    if (!atDest()) links.push({ cls: 'ghost', d: arc(pendingTo || cur, ch.to) });
    gLinks.selectAll('path').data(links).join('path').attr('class', d => 'tv-link ' + d.cls).attr('d', d => d.d).style('stroke', d => d.col || null).style('stroke-width', d => (d.cls === 'ghost' ? 1 : d.cls === 'flow' ? 1.2 : 2.2) / Math.sqrt(k));
    // badges at leg midpoints
    const badges = route.map(r => { const [x, y] = mid(T.byId[r.from], T.byId[r.to]); return { x, y, txt: `${r.leg.icon} ${T.money(r.leg.cost)} · ${T.dur(r.leg.hours)}` }; });
    const bsel = gBadges.selectAll('g').data(badges).join(enter => { const gg = enter.append('g').attr('class', 'tv-badge'); gg.append('rect'); gg.append('text'); return gg; });
    bsel.attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / Math.sqrt(k)})`);
    bsel.select('text').text(d => d.txt).attr('y', 3);
    bsel.select('rect').each(function (d) { const w = d.txt.length * 4.9 + 12; d3.select(this).attr('x', -w / 2).attr('y', -8).attr('width', w).attr('height', 16).attr('rx', 8); });
  }

  /* ---------- tooltip ---------- */
  function showTip(c) {
    if (pop.hidden === false && pendingTo && pendingTo.id === c.id) return;
    const cur = at(), on = onRouteIds();
    let modes = '';
    if (playing && !atDest() && !on.has(c.id)) {
      const ls = T.legs(cur, c, ch.seed);
      modes = ls.length ? `<div class="modes">${ls.map(l => `<span>${l.icon} <em>${T.money(l.cost)}</em></span>`).join('')}</div>` : `<div class="modes"><span>no direct link from ${T.esc(cur.name)}</span></div>`;
    }
    tip.innerHTML = `<b>${c.flag} ${T.esc(c.name)}</b><small>${T.esc(c.country)}${c.id === ch.from.id ? ' · start' : c.id === ch.to.id ? ' · destination' : ''}</small>${modes}`;
    tip.hidden = false;
  }
  function moveTip(e) { const r = stage.getBoundingClientRect(); tip.style.left = (e.clientX - r.left) + 'px'; tip.style.top = (e.clientY - r.top) + 'px'; }
  function hideTip() { tip.hidden = true; }

  /* ---------- popover: choose transport ---------- */
  function openPop(c) {
    const cur = at(), opts = T.legs(cur, c, ch.seed);
    const bc = Math.min(...opts.map(o => o.cost)), bt = Math.min(...opts.map(o => o.hours));
    pop.innerHTML = `<header><b>${c.flag} ${T.esc(c.name)}</b><small>${Math.round(T.km(cur, c)).toLocaleString()} km from ${T.esc(cur.name)}</small><button class="x" aria-label="Close">×</button></header>
      <div class="tv-opts">${opts.map((o, i) => `<button class="tv-opt${o.cost === bc ? ' best-cost' : ''}${o.hours === bt ? ' best-time' : ''}" data-i="${i}">
        <span class="ic">${o.icon}</span><span class="nm">${o.name}<small class="${o.live ? 'live' : ''}">${o.live ? 'avg of ' + T.esc(String(o.note).replace('avg of ', '')) + (o.nonstop ? ' · nonstop from ' + T.money(o.nonstop.cost) : '') : (o.note || 'modelled')}</small></span>
        <span class="nums"><b>${T.money(o.cost)}</b><span>${T.dur(o.hours)}</span></span></button>`).join('')}</div>`;
    pop.querySelector('.x').onclick = e => { e.stopPropagation(); closePop(); };
    pop.querySelectorAll('.tv-opt').forEach(b => (b.onclick = e => { e.stopPropagation(); commit(c, opts[+b.dataset.i]); }));
    pop.onclick = e => e.stopPropagation();
    pop.hidden = false; hideTip(); positionPop();
  }
  function positionPop() {
    if (pop.hidden || !pendingTo) return;
    const tr = d3.zoomTransform(svg.node()); const [x, y] = pos(pendingTo);
    const r = stage.getBoundingClientRect(), sw = r.width, sh = r.height;
    const scale = Math.max(sw / 960, sh / 500); const ox = (sw - 960 * scale) / 2, oy = (sh - 500 * scale) / 2; // slice fit
    const px = ox + (tr.x + tr.k * x) * scale, py = oy + (tr.y + tr.k * y) * scale;
    const flip = py > sh * 0.55;
    pop.classList.toggle('flip', flip);
    pop.style.left = Math.max(160, Math.min(sw - 160, px)) + 'px'; pop.style.top = py + 'px';
  }
  function closePop() { pop.hidden = true; if (pendingTo) { pendingTo = null; refresh(); } }

  /* ---------- actions ---------- */
  function pick(c) {
    if (!playing || atDest()) return;
    const cur = at();
    if (c.id === cur.id) return;
    if (onRouteIds().has(c.id)) return toast(c.name + ' is already on your route');
    if (!T.legs(cur, c, ch.seed).length) return toast('No direct connection from ' + cur.name + ' to ' + c.name + ' today');
    pendingTo = c; refresh(); openPop(c);
  }
  function commit(c, leg) {
    route.push({ from: at().id, to: c.id, leg }); pendingTo = null; pop.hidden = true; refresh();
    if (atDest()) $('#tv-plan').classList.remove('collapsed');
    if (!atDest()) fitTo([c, ch.to]); else fitRoute();
  }
  function refresh() { renderPlan(); drawMap(); }
  let toastT; function toast(m) { let t = $('.tv-toast'); if (!t) { t = document.createElement('div'); t.className = 'tv-toast'; document.body.appendChild(t); } t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }

  /* ---------- planning dashboard ---------- */
  function renderPlan() {
    const tt = totals(), cur = at();
    $('#tv-cost').textContent = T.money(tt.cost);
    $('#tv-time').textContent = route.length ? T.dur(tt.hours) : '0h';
    const vs = (v, best, el, fmt) => { if (!route.length) { el.textContent = ''; el.className = ''; return; } const d = v / best; el.textContent = d <= 1.02 ? 'matches today\'s best' : (fmt(v - best) + ' over best'); el.className = d <= 1.15 ? 'good' : d <= 1.6 ? '' : 'bad'; };
    vs(tt.cost, bm.cheapest, $('#tv-cost-vs'), x => '+' + T.money(x));
    vs(tt.hours, bm.fastest, $('#tv-time-vs'), x => '+' + T.dur(x));
    const est = atDest() ? T.score(tt.cost, tt.hours, elapsed(), bm) : null;
    $('#tv-est b').textContent = est === null ? '—' : est.toLocaleString();
    $('#tv-est .bar i').style.width = (est === null ? 0 : est / 100) + '%';
    $('#tv-plan-sub').textContent = atDest() ? 'You\'ve arrived. Submit, or undo a leg to try another idea.' : route.length ? `Now in ${cur.name}. Choose the next stop on the map.` : 'Choose your first stop on the map.';
    $('#tv-submit').disabled = !atDest(); $('#tv-undo').disabled = !route.length;

    let h = `<li class="start"><span class="dot"></span><div class="stop">${ch.from.flag} ${T.esc(ch.from.name)}<small>start</small></div>`;
    route.forEach((r, i) => {
      const c = T.byId[r.to], m = T.MODES[r.leg.mode];
      h += `<div class="leg" style="border-color:${m.color}"><span>${r.leg.icon}</span><span><b>${T.money(r.leg.cost)}</b> · ${T.dur(r.leg.hours)}<br><span class="n">${m.name}${r.leg.note ? ' · ' + T.esc(r.leg.note) : ''}</span></span><span></span>${i === route.length - 1 ? `<button class="x" title="Remove this leg" data-i="${i}">✕</button>` : ''}</div></li>
        <li class="${c.id === ch.to.id ? 'dest' : ''}"><span class="dot"></span><div class="stop">${c.flag} ${T.esc(c.name)}<small>${c.id === ch.to.id ? 'arrived' : 'stop ' + (i + 1)}</small></div>`;
    });
    if (!atDest()) h += `<div class="hint">${pendingTo ? 'Pick how to travel to ' + T.esc(pendingTo.name) : 'Tap a highlighted city…'}</div></li><li class="dest ghost"><span class="dot"></span><div class="stop">${ch.to.flag} ${T.esc(ch.to.name)}<small>destination</small></div></li>`;
    else h += '</li>';
    $('#tv-stops').innerHTML = h;
    $('#tv-stops').querySelectorAll('.x').forEach(b => (b.onclick = () => { route.splice(+b.dataset.i); pendingTo = null; pop.hidden = true; refresh(); }));

    // split by mode
    const byMode = {}; route.forEach(r => { const o = byMode[r.leg.mode] || (byMode[r.leg.mode] = { cost: 0, hours: 0 }); o.cost += r.leg.cost; o.hours += r.leg.hours; });
    const track = key => Object.entries(byMode).map(([m, o]) => `<i style="width:${100 * o[key] / (tt[key] || 1)}%;background:${T.MODES[m].color}" title="${T.MODES[m].name}"></i>`).join('');
    $('#tv-split').innerHTML = route.length ? `<h4>Where it goes</h4><div class="row"><span>Money</span><div class="track">${track('cost')}</div></div><div class="row"><span>Hours</span><div class="track">${track('hours')}</div></div>` : '';
  }
  $('#tv-plan-toggle').onclick = () => $('#tv-plan').classList.toggle('collapsed');

  /* ---------- flow ---------- */
  function start() {
    route = []; pendingTo = null; pop.hidden = true; playing = true;
    $('#tv-gate').hidden = true; $('#tv-result').hidden = true; $('#tv-board').hidden = true; $('#tv-plan').hidden = false;
    $('#tv-plan').classList.toggle('collapsed', window.innerWidth <= 900);
    t0 = performance.now();
    clearInterval(timer); timer = setInterval(() => { $('#tv-timer').textContent = T.secsF(elapsed()); if (atDest()) { const tt = totals(); const est = T.score(tt.cost, tt.hours, elapsed(), bm); $('#tv-est b').textContent = est.toLocaleString(); $('#tv-est .bar i').style.width = est / 100 + '%'; } }, 250);
    refresh(); fitRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#tv-start').onclick = start;
  $('#tv-undo').onclick = () => { route.pop(); pendingTo = null; pop.hidden = true; refresh(); };
  $('#tv-clear').onclick = () => { route = []; pendingTo = null; pop.hidden = true; refresh(); fitRoute(); };
  $('#tv-submit').onclick = () => {
    if (!atDest()) return;
    const secs = elapsed(); clearInterval(timer); playing = false;
    const tt = totals();
    const res = { score: T.score(tt.cost, tt.hours, secs, bm), cost: Math.round(tt.cost), hours: tt.hours, secs: Math.round(secs * 10) / 10, route: route.map(r => ({ to: r.to, mode: r.leg.mode, cost: r.leg.cost, hours: r.leg.hours })), at: Date.now() };
    if (!practice) {
      st = T.load(); st.results = st.results || {};
      if (!st.results[ch.key]) { st.results[ch.key] = res; T.save(st); }
      practice = true;
      showResult(res, false);
    } else showResult(res, true);
  };

  function showResult(res, isPractice) {
    $('#tv-plan').hidden = true; pop.hidden = true;
    // keep the map showing the finished route
    route = res.route.map((r, i) => ({ from: i ? res.route[i - 1].to : ch.from.id, to: r.to, leg: { mode: r.mode, cost: r.cost, hours: r.hours, icon: T.MODES[r.mode].icon } }));
    drawMap(); fitRoute();
    const rk = T.rankOf(res.score, fld), pct = Math.max(1, Math.round(100 * rk.rank / rk.of));
    const grade = (v, best, good, ok) => v <= best * good ? 'good' : v <= best * ok ? 'ok' : 'poor';
    const pathHTML = [ch.from, ...res.route.map(r => T.byId[r.to])].map((c, i) => (i ? `<span class="lg">${T.MODES[res.route[i - 1].mode].icon} ${T.money(res.route[i - 1].cost)} · ${T.dur(res.route[i - 1].hours)}</span>` : '') + `<span>${c.flag} ${T.esc(c.name)}</span>`).join('');
    const insight = res.cost > bm.cheapest * 1.6 ? `A much cheaper way existed. The thriftiest journey today costs about <b>${T.money(bm.cheapest)}</b>.`
      : res.hours > bm.fastest * 1.6 ? `A much faster way existed. The quickest journey today takes about <b>${T.dur(bm.fastest)}</b>.`
      : res.secs > 120 ? `Strong route, but you took <b>${T.secsF(res.secs)}</b> to decide. Faster calls score higher.`
      : `Excellent. You were close to the best balance of money, time and speed today.`;
    $('#tv-result').innerHTML = `
      <div class="hero">
        ${isPractice ? '<span class="tag prac">Practice run · not scored</span>' : '<span class="tag lock">Official score for ' + ch.key + ' saved</span>'}
        <p class="lbl">Traverse score</p><div class="score">${res.score.toLocaleString()}</div>
        <p class="rank">${isPractice ? `Would rank <b>#${rk.rank.toLocaleString()}</b> of ${rk.of.toLocaleString()}` : `Global rank <b>#${rk.rank.toLocaleString()}</b> of ${rk.of.toLocaleString()} · top ${pct}%`}</p>
        <p class="insight">${insight}</p>
        <div class="actions"><button class="tv-btn primary" id="tv-share" style="margin:0">Copy result</button><button class="tv-btn ghost" id="tv-again">Practice again</button></div>
      </div>
      <div class="stats">
        <div class="st ${grade(res.cost, bm.cheapest, 1.15, 1.6)}"><span class="lab">Money spent</span><b>${T.money(res.cost)}</b><span class="vs">best today<br>≈ ${T.money(bm.cheapest)}</span></div>
        <div class="st ${grade(res.hours, bm.fastest, 1.15, 1.6)}"><span class="lab">Travel time</span><b>${T.dur(res.hours)}</b><span class="vs">best today<br>≈ ${T.dur(bm.fastest)}</span></div>
        <div class="st ${res.secs <= 45 ? 'good' : res.secs <= 120 ? 'ok' : 'poor'}"><span class="lab">Decision time</span><b>${T.secsF(res.secs)}</b><span class="vs">${res.route.length} leg${res.route.length > 1 ? 's' : ''}</span></div>
      </div>
      <div class="path">${pathHTML}</div>`;
    $('#tv-result').hidden = false;
    $('#tv-again').onclick = start;
    $('#tv-share').onclick = () => {
      const modes = res.route.map(r => T.MODES[r.mode].icon).join('');
      const txt = `Traverse Daily #${ch.n} ${ch.from.flag}→${ch.to.flag}\n${modes}\n🏆 ${res.score.toLocaleString()} · #${rk.rank.toLocaleString()}\n💰 ${T.money(res.cost)} ⏱️ ${T.dur(res.hours)} ⚡ ${T.secsF(res.secs)}\n${location.origin}${location.pathname}`;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied'), () => { prompt('Copy your result:', txt); });
    };
    showBoard(st.results[ch.key] || res);
    $('#tv-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const days = []; for (let i = 6; i >= 0; i--) { const key = T.dayKey(ch.n - i); days.push(`<div class="d ${st.results[key] ? 'p' : ''}" title="${key}${st.results[key] ? ' · ' + st.results[key].score.toLocaleString() : ''}">${new Date(key).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</div>`); }
    $('#tv-board').innerHTML = `<div class="card"><h3>Today's field</h3><p class="sub">Simulated global ranking for Traverse Daily #${ch.n}, ${rk.of.toLocaleString()} journeys. Your official score is the first one you submitted today.</p>
      <table><thead><tr><th>#</th><th>Traveller</th><th class="r">Score</th></tr></thead><tbody>
      ${rows.map(x => `<tr${x.me ? ' class="me"' : ''}><td>${x.rank.toLocaleString()}</td><td>${x.name}</td><td class="r">${x.score.toLocaleString()}</td></tr>`).join('')}</tbody></table>
      <div class="dist">${bins.map((b, i) => `<i class="${i === myBin ? 'me' : ''}" style="height:${Math.max(3, 100 * b / mx)}%" title="${(i * 500).toLocaleString()}–${(i * 500 + 499).toLocaleString()}: ${b}"></i>`).join('')}</div>
      <div class="axis"><span>0</span><span>Score distribution</span><span>10,000</span></div>
      <div class="tv-hist">${days.join('')}<span style="font-size:.8rem;color:var(--tv-mute);margin-left:6px">${played.length} day${played.length === 1 ? '' : 's'} played</span></div></div>`;
    $('#tv-board').hidden = false;
  }

  /* ---------- initial ---------- */
  window.addEventListener('resize', positionPop);
  drawMap();
  if (official) { $('#tv-gate').hidden = true; showResult(official, false); }
  else setTimeout(() => fitTo([ch.from, ch.to], 1.4), 50);
})();
