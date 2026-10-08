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
    // the aged chart: golden parchment, burnt edges
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.72);
    g.addColorStop(0, '#E6D09C'); g.addColorStop(.6, '#D4B97C'); g.addColorStop(1, '#B08F4E'); ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    // blotches of age
    for (let i = 0; i < 26; i++) { const x = Math.random() * size, y = Math.random() * size, r = size * (0.04 + Math.random() * 0.12); const bl = ctx.createRadialGradient(x, y, 0, x, y, r); bl.addColorStop(0, 'rgba(120,80,30,' + (0.05 + Math.random() * 0.08) + ')'); bl.addColorStop(1, 'rgba(120,80,30,0)'); ctx.fillStyle = bl; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    // graticule
    ctx.beginPath(); path(d3.geoGraticule().step([5, 5])()); ctx.strokeStyle = 'rgba(70,40,10,.18)'; ctx.lineWidth = .8; ctx.stroke();
    // rhumb lines from several roses, as on a portolan chart
    const roses = [[size * 0.8, size * 0.28], [size * 0.18, size * 0.74], [size * 0.5, size * 0.5], [size * 0.86, size * 0.82], [size * 0.14, size * 0.2]];
    ctx.save(); ctx.lineWidth = .7;
    roses.forEach(([rx, ry], ri) => { for (let a = 0; a < 32; a++) { const t = a * Math.PI / 16; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(t) * size * 1.5, ry + Math.sin(t) * size * 1.5); ctx.strokeStyle = a % 4 === 0 ? 'rgba(70,40,10,.22)' : a % 2 === 0 ? 'rgba(70,40,10,.14)' : 'rgba(120,50,30,.12)'; ctx.stroke(); } });
    ctx.restore();
    // water lines: the coast stroked wide and faint beneath the land
    ctx.lineJoin = 'round';
    [[30, .05], [18, .08], [9, .14]].forEach(([w, a]) => { ctx.beginPath(); path(land); ctx.lineWidth = w; ctx.strokeStyle = 'rgba(90,50,12,' + a + ')'; ctx.stroke(); });
    ctx.beginPath(); path(land); ctx.fillStyle = '#EEDFB4'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(60,35,10,.8)'; ctx.stroke();
    // inland shading: a second, inset tone so the land reads as paper laid over paper
    ctx.save(); ctx.beginPath(); path(land); ctx.clip(); ctx.beginPath(); path(land); ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(160,120,60,.28)'; ctx.stroke(); ctx.restore();
    ctx.beginPath(); path(borders); ctx.lineWidth = .9; ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(60,35,10,.45)'; ctx.stroke(); ctx.setLineDash([]);
    // country names, engraved
    ctx.fillStyle = 'rgba(60,35,10,.5)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    feats.forEach(f => {
      const b = path.bounds(f), w = b[1][0] - b[0][0], h = b[1][1] - b[0][1]; if (w < 110 || h < 40 || b[1][0] < 0 || b[0][0] > size || b[1][1] < 0 || b[0][1] > size) return;
      const c = path.centroid(f), name = (f.properties.name || '').toUpperCase(); if (!name || !isFinite(c[0])) return;
      const fs = Math.max(12, Math.min(34, w / (name.length * 0.95)));
      ctx.font = 'italic 700 ' + fs + 'px Alegreya, Georgia, serif'; ctx.letterSpacing = '.22em'; ctx.fillText(name, c[0], c[1]);
    });
    // oceans, named the old way
    const OCEANS = [['OCEANVS ATLANTICVS', -35, 25], ['OCEANVS PACIFICVS', -150, 0], ['OCEANVS INDICVS', 75, -20], ['MARE MEDITERRANEVM', 16, 35], ['OCEANVS AETHIOPICVS', -15, -25], ['MARE DEL ZVR', -110, -30], ['OCEANVS ARCTICVS', 0, 78]];
    ctx.font = '500 ' + Math.round(size * 0.02) + 'px Alegreya, Georgia, serif'; ctx.fillStyle = 'rgba(70,40,10,.5)'; ctx.letterSpacing = '.35em';
    OCEANS.forEach(([n, lo, la]) => { const q = proj([lo, la]); if (q && q[0] > 0 && q[0] < size && q[1] > 0 && q[1] < size) ctx.fillText(n, q[0], q[1]); });
    // compass roses
    const rose = (cx, cy, R, big) => {
      ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = 'rgba(60,35,10,.8)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * .72, 0, Math.PI * 2); ctx.stroke();
      if (big) { ctx.beginPath(); ctx.arc(0, 0, R * 1.12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(0, 0, R * .92, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      for (let i = 0; i < 16; i++) { const t = i * Math.PI / 8, L = i % 4 === 0 ? R * 1.05 : i % 2 === 0 ? R * .7 : R * .42, w = i % 4 === 0 ? R * .13 : R * .07;
        ctx.beginPath(); ctx.moveTo(Math.cos(t) * L, Math.sin(t) * L); ctx.lineTo(Math.cos(t + Math.PI / 2) * w, Math.sin(t + Math.PI / 2) * w); ctx.lineTo(Math.cos(t - Math.PI / 2) * w, Math.sin(t - Math.PI / 2) * w); ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? 'rgba(60,35,10,.8)' : '#A13A2A'; if (i % 4 === 0 || i % 2) ctx.fill(); else ctx.stroke(); }
      ctx.fillStyle = 'rgba(60,35,10,.85)'; ctx.font = '700 ' + Math.round(R * .38) + 'px Alegreya, Georgia, serif'; ctx.fillText('N', 0, -R * 1.35);
      ctx.restore();
    };
    rose(roses[0][0], roses[0][1], Math.max(40, size * 0.045), false);
    rose(roses[1][0], roses[1][1], Math.max(60, size * 0.075), true);
    // ships at sea
    const ship = (x, y, sc, flip) => {
      ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -sc : sc, sc); ctx.strokeStyle = 'rgba(60,35,10,.85)'; ctx.fillStyle = 'rgba(60,35,10,.75)'; ctx.lineWidth = 1 / sc;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-10, 8, 0, 8); ctx.lineTo(12, 8); ctx.quadraticCurveTo(18, 6, 20, -2); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, -22); ctx.moveTo(8, 0); ctx.lineTo(8, -18); ctx.stroke();
      ctx.fillStyle = 'rgba(250,243,225,.9)'; ctx.beginPath(); ctx.moveTo(-4, -21); ctx.quadraticCurveTo(-14, -13, -4, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, -17); ctx.quadraticCurveTo(0, -10, 8, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    };
    const seaSpots = []; for (let t = 0; t < 400 && seaSpots.length < 5; t++) { const x = size * (0.08 + Math.random() * 0.84), y = size * (0.08 + Math.random() * 0.84); const ll = proj.invert([x, y]); if (!ll) continue; if (d3.geoContains(land, ll)) continue; if (Math.hypot(x - size / 2, y - size / 2) < size * 0.18) continue; if (seaSpots.some(s => Math.hypot(s[0] - x, s[1] - y) < size * 0.15)) continue; seaSpots.push([x, y]); }
    seaSpots.forEach(([x, y], i) => ship(x, y, Math.max(1.2, size / 900), i % 2 === 1));
    // today's two cities: a faint dotted course between them
    const a = proj([F.from.lon, F.from.lat]), b = proj([F.to.lon, F.to.lat]);
    ctx.beginPath(); path({ type: 'LineString', coordinates: [[F.from.lon, F.from.lat], [F.to.lon, F.to.lat]] }); ctx.setLineDash([3, 7]); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(161,58,42,.6)'; ctx.stroke(); ctx.setLineDash([]);
    [[a, '#26696D'], [b, '#A13A2A']].forEach(([p, col]) => { ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#F4EAD2'; ctx.lineWidth = 2; ctx.stroke(); });
    // burnt edges and a ruled frame
    const v = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.72); v.addColorStop(0, 'rgba(60,30,5,0)'); v.addColorStop(1, 'rgba(60,30,5,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(60,35,10,.6)'; ctx.lineWidth = 3; ctx.strokeRect(size * 0.03, size * 0.03, size * 0.94, size * 0.94); ctx.lineWidth = 1; ctx.strokeRect(size * 0.036, size * 0.036, size * 0.928, size * 0.928);
    cv.classList.add('on');
  }
})();
