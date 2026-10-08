/* The home-page chart: an old map of today's region, drawn once to a canvas and drifted slowly by CSS.
   d3 and the world topology load lazily after the page has painted. */
(function () {
  'use strict';
  const cv = document.getElementById('hm-bg'); if (!cv) return;
  const base = (document.currentScript && document.currentScript.src || '').replace(/js\/chart-bg\.js.*$/, '');
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = base + src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const ready = () => (window.d3 ? Promise.resolve() : load('vendor/d3.min.js')).then(() => window.WORLD_TOPO ? null : load('data/world.js')).then(() => window.topojson ? null : load('vendor/topojson-client.min.js'));
  const go = () => ready().then(draw).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 200);

  function draw() {
    const F = window.TD_FOCUS; if (!F) return;
    const size = Math.ceil(Math.max(innerWidth, innerHeight) * 1.5), dpr = Math.min(1.5, devicePixelRatio || 1);
    cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const mid = d3.geoInterpolate([F.from.lon, F.from.lat], [F.to.lon, F.to.lat])(0.5);
    const span = Math.max(6, d3.geoDistance([F.from.lon, F.from.lat], [F.to.lon, F.to.lat]) * 180 / Math.PI);
    // a conic chart centred on the route, zoomed so the journey spans about a third of the canvas
    const proj = d3.geoConicConformal().parallels([mid[1] - 10, mid[1] + 10]).rotate([-mid[0], 0]).center([0, mid[1]])
      .scale(size * 0.34 * 57.3 / span).translate([size / 2, size / 2]);
    const path = d3.geoPath(proj, ctx);
    const feats = topojson.feature(WORLD_TOPO, WORLD_TOPO.objects.countries).features;
    const land = topojson.merge(WORLD_TOPO, WORLD_TOPO.objects.countries.geometries);
    const borders = topojson.mesh(WORLD_TOPO, WORLD_TOPO.objects.countries, (a, b) => a !== b);
    // sea
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.75);
    g.addColorStop(0, '#D8DECE'); g.addColorStop(1, '#B9C3B1'); ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    // graticule
    ctx.beginPath(); path(d3.geoGraticule().step([5, 5])()); ctx.strokeStyle = 'rgba(43,29,18,.14)'; ctx.lineWidth = .8; ctx.stroke();
    // rhumb lines from a compass rose
    const rose = [size * 0.78, size * 0.3];
    ctx.save(); ctx.strokeStyle = 'rgba(43,29,18,.16)'; ctx.lineWidth = .7;
    for (let a = 0; a < 32; a++) { const t = a * Math.PI / 16; ctx.beginPath(); ctx.moveTo(rose[0], rose[1]); ctx.lineTo(rose[0] + Math.cos(t) * size, rose[1] + Math.sin(t) * size); ctx.stroke(); }
    ctx.restore();
    // water lines: the coast stroked wide and faint beneath the land
    ctx.lineJoin = 'round';
    [[26, .05], [16, .08], [8, .14]].forEach(([w, a]) => { ctx.beginPath(); path(land); ctx.lineWidth = w; ctx.strokeStyle = 'rgba(43,29,18,' + a + ')'; ctx.stroke(); });
    ctx.beginPath(); path(land); ctx.fillStyle = '#EADAB1'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(43,29,18,.75)'; ctx.stroke();
    ctx.beginPath(); path(borders); ctx.lineWidth = .9; ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(43,29,18,.4)'; ctx.stroke(); ctx.setLineDash([]);
    // country names, engraved
    ctx.fillStyle = 'rgba(43,29,18,.42)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    feats.forEach(f => {
      const b = path.bounds(f), w = b[1][0] - b[0][0], h = b[1][1] - b[0][1]; if (w < 110 || h < 40 || b[1][0] < 0 || b[0][0] > size || b[1][1] < 0 || b[0][1] > size) return;
      const c = path.centroid(f), name = (f.properties.name || '').toUpperCase(); if (!name || !isFinite(c[0])) return;
      const fs = Math.max(12, Math.min(34, w / (name.length * 0.95)));
      ctx.font = 'italic 700 ' + fs + 'px Alegreya, Georgia, serif'; ctx.letterSpacing = '.22em'; ctx.fillText(name, c[0], c[1]);
    });
    // the compass rose
    ctx.save(); ctx.translate(rose[0], rose[1]); ctx.strokeStyle = 'rgba(43,29,18,.7)'; ctx.fillStyle = 'rgba(43,29,18,.7)'; ctx.lineWidth = 1.2;
    const R = Math.max(40, size * 0.045);
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * .72, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4, L = i % 2 ? R * .62 : R * 1.08, w = i % 2 ? R * .07 : R * .13;
      ctx.beginPath(); ctx.moveTo(Math.cos(t) * L, Math.sin(t) * L); ctx.lineTo(Math.cos(t + Math.PI / 2) * w, Math.sin(t + Math.PI / 2) * w); ctx.lineTo(Math.cos(t - Math.PI / 2) * w, Math.sin(t - Math.PI / 2) * w); ctx.closePath();
      if (i === 6) ctx.fill(); else ctx.stroke(); }
    ctx.font = '700 ' + Math.round(R * .42) + 'px Alegreya, Georgia, serif'; ctx.fillText('N', 0, -R * 1.32);
    ctx.restore();
    // today's two cities: a faint dotted course between them
    const a = proj([F.from.lon, F.from.lat]), b = proj([F.to.lon, F.to.lat]);
    ctx.beginPath(); path({ type: 'LineString', coordinates: [[F.from.lon, F.from.lat], [F.to.lon, F.to.lat]] }); ctx.setLineDash([3, 7]); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(161,58,42,.55)'; ctx.stroke(); ctx.setLineDash([]);
    [[a, '#2F7F84'], [b, '#A13A2A']].forEach(([p, col]) => { ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#F4EAD2'; ctx.lineWidth = 2; ctx.stroke(); });
    cv.classList.add('on');
  }
})();
