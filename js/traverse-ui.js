/* TraversleDaily UI: quiet map, stop picker, planning dashboard, result & ranking. */
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
  const resetIn = () => { const ms = (T.dayNumber() * 86400000 + Date.UTC(2026, 9, 7)) - Date.now(); return Math.floor(ms / 3600000) + 'h ' + Math.floor(ms % 3600000 / 60000) + 'm'; };
  $('#tv-brief').innerHTML = `<p class="k">TraversleDaily #${ch.n} · ${dayLabel}</p>
    <div class="route"><span class="pin s"></span><b>${T.flagImg(ch.from)} ${T.esc(ch.from.name)}<small>${T.esc(ch.from.country)}</small></b>
    <span class="ln"></span><span></span>
    <span class="pin d"></span><b>${T.flagImg(ch.to)} ${T.esc(ch.to.name)}<small>${T.esc(ch.to.country)}</small></b></div>
    <p class="meta"><span><b>${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km</b> apart</span><span>no direct route</span><span>resets in <b>${resetIn()}</b></span></p>`;
  $('#tv-gate-day').textContent = '#' + ch.n + ' · ' + dayLabel;
  $('#tv-gate-title').innerHTML = `<span class="city">${T.flagImg(ch.from, 40)} ${T.esc(ch.from.name)}<small>${T.esc(ch.from.country)}</small></span><span class="arr">→</span><span class="city">${T.flagImg(ch.to, 40)} ${T.esc(ch.to.name)}<small>${T.esc(ch.to.country)}</small></span>`;
  $('#tv-gate-sub').textContent = `${Math.round(T.km(ch.from, ch.to)).toLocaleString()} km apart and nothing goes there directly. Chain buses, trains, rideshares, ferries and flights into the smartest journey.`;
  $('#tv-gate-note').textContent = practice ? 'You already have an official score for today. This run is practice.' : 'One official run per day. The decision clock starts when you press the button.';
  $('#td-nav-score').style.display = official ? '' : 'none';
  $('#tv-source').textContent = liveToday
    ? `Flight prices and times are averages of real one-way economy fares for departures on ${LIVE.depart}, fetched ${new Date(LIVE.fetched).toUTCString().slice(5, 22)} UTC. Trains, buses, rideshares, ferries and cars are modelled from distance and calibrated to the day's fares. Rankings are simulated.`
    : 'No live fare snapshot for today, so flights are modelled from distance. Rankings are simulated.';

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
  const gLinks = g.append('g'), gBadges = g.append('g'), gCities = g.append('g'), gLabels = g.append('g');
  const pos = c => proj([c.lon, c.lat]);
  const tip = $('#tv-tip'), stage = $('#tv-stage');
  g.append('g').attr('class', 'tv-pulse-g').attr('transform', `translate(${pos(ch.to)[0]},${pos(ch.to)[1]})`).append('circle').attr('class', 'tv-pulse');
  gCities.selectAll('circle').data(T.C).join('circle')
    .attr('class', 'tv-city').attr('r', c => 2 + c.hub * 0.5)
    .attr('cx', c => pos(c)[0]).attr('cy', c => pos(c)[1])
    .on('click', (e, c) => { e.stopPropagation(); pick(c); })
    .on('mouseenter', (e, c) => showTip(c)).on('mousemove', e => moveTip(e)).on('mouseleave', hideTip);
  gLabels.selectAll('text').data(T.C).join('text').attr('class', c => 'tv-label' + (c.hub >= 2 ? '' : ' minor'))
    .attr('x', c => pos(c)[0] + 5).attr('y', c => pos(c)[1] + 3.2).text(c => c.name);

  let k = 1;
  const zoom = d3.zoom().scaleExtent([1, 14]).translateExtent([[-80, -40], [1040, 540]]).on('zoom', e => {
    g.attr('transform', e.transform); k = e.transform.k; const s = k;
    drawMap();
    gLabels.selectAll('text').style('font-size', (9.5 / s) + 'px').attr('x', c => pos(c)[0] + 5 / s).attr('y', c => pos(c)[1] + 3.2 / s);
    gCountry.selectAll('text').style('display', k >= 2.6 ? null : 'none').style('font-size', (7 / s * 1.2) + 'px');
    gLinks.selectAll('path').style('stroke-width', d => (d.cls === 'ghost' ? 1 : d.cls === 'flow' ? 1.2 : 2.2) / s);
    gBadges.selectAll('g').attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / s})`);
    g.select('.tv-pulse-g').attr('transform', `translate(${pos(ch.to)[0]},${pos(ch.to)[1]}) scale(${1 / s})`); g.select('.tv-pulse').style('stroke-width', 1);
    layoutLabels();
  }).on('start', () => { svg.classed('dragging', true); hideTip(); }).on('end', () => svg.classed('dragging', false));
  svg.call(zoom);

  // which labels may show: the journey itself always; other cities only as you zoom in
  const labelOn = c => c.id === ch.from.id || c.id === ch.to.id || onRouteIds().has(c.id) || (pendingTo && c.id === pendingTo.id) || (c.hub >= 3 && k >= 1.8) || (c.hub >= 2 && k >= 2.6) || (c.hub >= 1 && k >= 3.6) || k >= 5;
  function layoutLabels() {
    const s = k, boxes = [], vis = {};
    const pri = c => (c.id === ch.from.id || c.id === ch.to.id ? 100 : onRouteIds().has(c.id) ? 90 : (pendingTo && c.id === pendingTo.id) ? 85 : c.hub * 10);
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
  function fitRoute() { fitTo([ch.from, ch.to, ...route.map(r => T.byId[r.to])], 1.8); }
  const arc = (a, b) => path({ type: 'LineString', coordinates: [[a.lon, a.lat], [b.lon, b.lat]] });
  const mid = (a, b) => proj(d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(0.5));

  function drawMap() {
    const cur = at(), on = onRouteIds();
    gCities.selectAll('circle').attr('class', c => 'tv-city'
      + (c.id === cur.id && playing && !atDest() ? ' cur' : c.id === ch.from.id ? ' start' : c.id === ch.to.id ? ' dest' : on.has(c.id) ? ' on' : pendingTo && c.id === pendingTo.id ? ' pend' : ''));
    gCities.selectAll('circle').attr('r', c => (2 + c.hub * 0.5 + (c.id === cur.id && playing && !atDest() ? 1.5 : c.id === ch.from.id || c.id === ch.to.id || on.has(c.id) ? 1 : 0)) / k).style('stroke-width', c => ((c.id === cur.id && playing && !atDest()) ? 8 : (pendingTo && c.id === pendingTo.id) ? 6 : 1) / k);
    layoutLabels();
    const links = [];
    route.forEach(r => { const a = T.byId[r.from], b = T.byId[r.to]; links.push({ cls: r.leg.mode, d: arc(a, b), col: T.MODES[r.leg.mode].color }); links.push({ cls: 'flow', d: arc(a, b) }); });
    if (pendingTo) links.push({ cls: 'ghost', d: arc(cur, pendingTo) });
    gLinks.selectAll('path').data(links).join('path').attr('class', d => 'tv-link ' + d.cls).attr('d', d => d.d).style('stroke', d => d.col || null).style('stroke-width', d => (d.cls === 'ghost' ? 1 : d.cls === 'flow' ? 1.2 : 2.2) / k);
    const badges = route.map(r => { const [x, y] = mid(T.byId[r.from], T.byId[r.to]); return { x, y, txt: `${r.leg.icon} ${T.money(r.leg.cost)} · ${T.dur(r.leg.hours)}` }; });
    const bsel = gBadges.selectAll('g').data(badges).join(enter => { const gg = enter.append('g').attr('class', 'tv-badge'); gg.append('rect'); gg.append('text'); return gg; });
    bsel.attr('transform', d => `translate(${d.x},${d.y}) scale(${1 / k})`);
    bsel.select('text').text(d => d.txt).attr('y', 3);
    bsel.select('rect').each(function (d) { const w = d.txt.length * 4.9 + 12; d3.select(this).attr('x', -w / 2).attr('y', -8).attr('width', w).attr('height', 16).attr('rx', 8); });
  }

  /* ---------- tooltip ---------- */
  function showTip(c) {
    const cur = at(), on = onRouteIds();
    let modes = '';
    if (playing && !atDest() && !on.has(c.id)) {
      const ls = T.legs(cur, c, ch.seed);
      modes = ls.length ? `<div class="modes">${ls.map(l => `<span>${l.icon} <em>${T.money(l.cost)}</em></span>`).join('')}</div>` : `<div class="modes"><span>no direct link from ${T.esc(cur.name)}</span></div>`;
    }
    tip.innerHTML = `<b>${T.flagImg(c)} ${T.esc(c.name)}</b><small>${T.esc(c.country)}${c.id === ch.from.id ? ' · start' : c.id === ch.to.id ? ' · destination' : ''}</small>${modes}`;
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
    if (!T.legs(cur, c, ch.seed).length) return toast('Nothing runs from ' + cur.name + ' to ' + c.name + ' today');
    pendingTo = c; refresh(); fitTo([cur, c], 2.2);
    $('#tv-plan').classList.remove('collapsed');
    const el = $('#tv-picker'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function commit(c, leg) {
    route.push({ from: at().id, to: c.id, leg }); pendingTo = null; refresh();
    if (!atDest()) fitTo([c, ch.to], 1.8); else fitRoute();
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
    $('#tv-plan-sub').textContent = atDest() ? 'You\'ve arrived. Submit, or undo a leg to try another idea.' : `You're in ${cur.name}.`;
    $('#tv-submit').disabled = !atDest(); $('#tv-undo').disabled = !route.length;

    let h = `<li class="start"><span class="dot"></span><div class="stop">${T.place(ch.from)}<small>start</small></div>`;
    route.forEach((r, i) => {
      const c = T.byId[r.to], m = T.MODES[r.leg.mode];
      h += `<div class="leg" style="border-color:${m.color}"><span>${r.leg.icon}</span><span><b>${T.money(r.leg.cost)}</b> · ${T.dur(r.leg.hours)}<br><span class="n">${m.name}${r.leg.note ? ' · ' + T.esc(r.leg.note) : ''}</span></span><span></span>${i === route.length - 1 ? `<button class="x" title="Remove this leg" data-i="${i}">✕</button>` : ''}</div></li>
        <li class="${c.id === ch.to.id ? 'dest' : ''}"><span class="dot"></span><div class="stop">${T.place(c)}<small>${c.id === ch.to.id ? 'arrived' : 'stop ' + (i + 1)}</small></div>`;
    });
    if (!atDest()) h += `</li><li class="dest ghost"><span class="dot"></span><div class="stop">${T.place(ch.to)}<small>destination</small></div></li>`;
    else h += '</li>';
    $('#tv-stops').innerHTML = h;
    $('#tv-stops').querySelectorAll('.x').forEach(b => (b.onclick = () => { route.splice(+b.dataset.i); pendingTo = null; refresh(); }));

    renderPicker();

    const byMode = {}; route.forEach(r => { const o = byMode[r.leg.mode] || (byMode[r.leg.mode] = { cost: 0, hours: 0 }); o.cost += r.leg.cost; o.hours += r.leg.hours; });
    const track = key => Object.entries(byMode).map(([m, o]) => `<i style="width:${100 * o[key] / (tt[key] || 1)}%;background:${T.MODES[m].color}" title="${T.MODES[m].name}"></i>`).join('');
    $('#tv-split').innerHTML = route.length ? `<h4>Where it goes</h4><div class="row"><span>Money</span><div class="track">${track('cost')}</div></div><div class="row"><span>Hours</span><div class="track">${track('hours')}</div></div>` : '';
  }

  /* the stop picker: choose the next city, then how to get there */
  function renderPicker() {
    const box = $('#tv-picker'), cur = at();
    if (!playing || atDest()) { box.innerHTML = ''; return; }
    if (pendingTo) {
      const opts = T.legs(cur, pendingTo, ch.seed);
      const bc = Math.min(...opts.map(o => o.cost)), bt = Math.min(...opts.map(o => o.hours));
      box.innerHTML = `<div class="tv-pick-head"><span class="muted">How do you get to</span><b>${T.place(pendingTo)}</b><small>${Math.round(T.km(cur, pendingTo)).toLocaleString()} km</small><button class="lnk" id="tv-unpick">change stop</button></div>
        <div class="tv-opts">${opts.map((o, i) => `<button class="tv-opt${o.cost === bc ? ' best-cost' : ''}${o.hours === bt ? ' best-time' : ''}" data-i="${i}">
          <span class="ic">${o.icon}</span><span class="nm">${o.name}<small class="${o.live ? 'live' : ''}">${o.live ? 'avg of ' + T.esc(String(o.note).replace('avg of ', '')) + (o.nonstop ? ' · nonstop from ' + T.money(o.nonstop.cost) : '') : (o.note || 'modelled')}</small></span>
          <span class="nums"><b>${T.money(o.cost)}</b><span>${T.dur(o.hours)}</span></span></button>`).join('')}</div>`;
      box.querySelectorAll('.tv-opt').forEach(b => (b.onclick = () => commit(pendingTo, opts[+b.dataset.i])));
      $('#tv-unpick').onclick = () => { pendingTo = null; refresh(); };
      return;
    }
    const on = onRouteIds();
    const reach = T.C.filter(c => !on.has(c.id) && T.legs(cur, c, ch.seed).length);
    const row = c => { const ls = T.legs(cur, c, ch.seed); const cheap = Math.min(...ls.map(l => l.cost)); return `<button class="tv-stoprow${c.id === ch.to.id ? ' finish' : ''}" data-id="${c.id}"><span class="nm">${T.place(c)}<small>${c.id === ch.to.id ? 'destination' : Math.round(T.km(c, ch.to)).toLocaleString() + ' km to ' + T.esc(ch.to.name)}</small></span><span class="modes">${ls.map(l => `<i title="${l.name}">${l.icon}</i>`).join('')}</span><span class="from">from <b>${T.money(cheap)}</b></span></button>`; };
    const finish = reach.find(c => c.id === ch.to.id);
    const suggested = reach.filter(c => c.id !== ch.to.id)
      .map(c => ({ c, score: T.km(c, ch.to) + (T.legs(cur, c, ch.seed).length < 2 ? 400 : 0) - c.hub * 80 }))
      .sort((a, b) => a.score - b.score).slice(0, 6).map(x => x.c);
    box.innerHTML = `<div class="tv-pick-head"><b>Add a stop</b><small>${reach.length} places reachable from ${T.esc(cur.name)}</small></div>
      <div class="tv-search"><input type="search" id="tv-q" placeholder="Search any city…" autocomplete="off"><ul class="tv-results" id="tv-res" hidden></ul></div>
      <div class="tv-stoplist">${finish ? row(finish) : ''}${suggested.map(row).join('')}</div>
      <p class="tv-pick-hint">Or tap a city on the map.</p>`;
    box.querySelectorAll('.tv-stoprow').forEach(b => (b.onclick = () => pick(T.byId[b.dataset.id])));
    const q = $('#tv-q'), res = $('#tv-res');
    q.oninput = () => {
      const v = q.value.trim().toLowerCase(); if (!v) { res.hidden = true; return; }
      const m = T.C.filter(c => !on.has(c.id) && (c.name.toLowerCase().includes(v) || c.country.toLowerCase().includes(v))).slice(0, 8);
      res.innerHTML = m.map(c => { const ok = T.legs(cur, c, ch.seed).length; return `<li data-id="${c.id}" class="${ok ? '' : 'off'}">${T.place(c)}<span>${ok ? '' : 'no link today'}</span></li>`; }).join('') || '<li class="off">No match</li>';
      res.hidden = false;
      res.querySelectorAll('li[data-id]:not(.off)').forEach(li => (li.onclick = () => pick(T.byId[li.dataset.id])));
    };
    q.onkeydown = e => { if (e.key === 'Enter') { const li = res.querySelector('li[data-id]:not(.off)'); if (li) li.click(); } };
  }
  $('#tv-plan-toggle').onclick = () => $('#tv-plan').classList.toggle('collapsed');

  /* ---------- flow ---------- */
  function start() {
    route = []; pendingTo = null; playing = true;
    $('#tv-gate').hidden = true; $('#tv-result').hidden = true; $('#tv-board').hidden = true; $('#tv-plan').hidden = false;
    $('#tv-plan').classList.toggle('collapsed', window.innerWidth <= 900);
    t0 = performance.now();
    clearInterval(timer); timer = setInterval(() => { $('#tv-timer').textContent = T.secsF(elapsed()); if (atDest()) { const tt = totals(); const est = T.score(tt.cost, tt.hours, elapsed(), bm); $('#tv-est b').textContent = est.toLocaleString(); $('#tv-est .bar i').style.width = est / 100 + '%'; } }, 250);
    refresh(); fitRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#tv-start').onclick = start;
  $('#tv-undo').onclick = () => { route.pop(); pendingTo = null; refresh(); };
  $('#tv-clear').onclick = () => { route = []; pendingTo = null; refresh(); fitRoute(); };
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
    $('#tv-plan').hidden = true; pendingTo = null;
    route = res.route.map((r, i) => ({ from: i ? res.route[i - 1].to : ch.from.id, to: r.to, leg: { mode: r.mode, cost: r.cost, hours: r.hours, icon: T.MODES[r.mode].icon } }));
    drawMap(); fitRoute();
    const rk = T.rankOf(res.score, fld), pct = Math.max(1, Math.round(100 * rk.rank / rk.of));
    const grade = (v, best, good, ok) => v <= best * good ? 'good' : v <= best * ok ? 'ok' : 'poor';
    const pathHTML = [ch.from, ...res.route.map(r => T.byId[r.to])].map((c, i) => (i ? `<span class="lg">${T.MODES[res.route[i - 1].mode].icon} ${T.money(res.route[i - 1].cost)} · ${T.dur(res.route[i - 1].hours)}</span>` : '') + `<span class="pl">${T.place(c)}</span>`).join('');
    const insight = res.cost > bm.cheapest * 1.6 ? `A much cheaper way existed. The thriftiest journey today costs about <b>${T.money(bm.cheapest)}</b>.`
      : res.hours > bm.fastest * 1.6 ? `A much faster way existed. The quickest journey today takes about <b>${T.dur(bm.fastest)}</b>.`
      : res.secs > 120 ? `Strong route, but you took <b>${T.secsF(res.secs)}</b> to decide. Faster calls score higher.`
      : `Excellent. You were close to the best balance of money, time and speed today.`;
    $('#tv-result').innerHTML = `
      <div class="hero">
        ${isPractice ? '<span class="tag prac">Practice run · not scored</span>' : '<span class="tag lock">Official score for ' + ch.key + ' saved</span>'}
        <p class="lbl">Traversle score</p><div class="score">${res.score.toLocaleString()}</div>
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
      const txt = `TraversleDaily #${ch.n} ${T.placeText(ch.from)} → ${T.placeText(ch.to)}\n${modes}\n🏆 ${res.score.toLocaleString()} · #${rk.rank.toLocaleString()}\n💰 ${T.money(res.cost)} ⏱️ ${T.dur(res.hours)} ⚡ ${T.secsF(res.secs)}\n${location.origin}${location.pathname}`;
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
    const days = []; for (let i = 6; i >= 0; i--) { const n = ch.n - i; if (n < 1) continue; const key = T.dayKey(n); days.push(`<div class="d ${st.results[key] ? 'p' : ''}" title="${key}${st.results[key] ? ' · ' + st.results[key].score.toLocaleString() : ''}">#${n}</div>`); }
    $('#tv-board').innerHTML = `<div class="card"><h3>Today's field</h3><p class="sub">Simulated global ranking for TraversleDaily #${ch.n}, ${rk.of.toLocaleString()} journeys. Your official score is the first one you submitted today.</p>
      <table><thead><tr><th>#</th><th>Traveller</th><th class="r">Score</th></tr></thead><tbody>
      ${rows.map(x => `<tr${x.me ? ' class="me"' : ''}><td>${x.rank.toLocaleString()}</td><td>${x.name}</td><td class="r">${x.score.toLocaleString()}</td></tr>`).join('')}</tbody></table>
      <div class="dist">${bins.map((b, i) => `<i class="${i === myBin ? 'me' : ''}" style="height:${Math.max(3, 100 * b / mx)}%" title="${(i * 500).toLocaleString()}–${(i * 500 + 499).toLocaleString()}: ${b}"></i>`).join('')}</div>
      <div class="axis"><span>0</span><span>Score distribution</span><span>10,000</span></div>
      <div class="tv-hist">${days.join('')}<span style="font-size:.8rem;color:var(--tv-mute);margin-left:6px">${played.length} day${played.length === 1 ? '' : 's'} played</span></div></div>`;
    $('#tv-board').hidden = false;
  }

  /* ---------- initial ---------- */
  drawMap();
  if (official) { $('#tv-gate').hidden = true; showResult(official, false); }
  else setTimeout(() => fitTo([ch.from, ch.to], 1.6), 50);
})();
