/* Shared helpers for the frame-rendered reels. Every scene exposes window.render(t) (seconds),
   which must draw the frame for time t from scratch so frames can be rendered in any order. */
const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const P = (t, start, dur) => clamp((t - start) / dur);           // 0..1 progress of a segment
const E = {
  out: t => 1 - Math.pow(1 - t, 3),
  out5: t => 1 - Math.pow(1 - t, 5),
  inOut: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: t => t * t * t,
  back: t => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  // damped spring that settles at 1 (for slams and pops)
  spring: t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(11 * t),
};
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
function css(el, o) { for (const k in o) el.style[k] = o[k]; }

/* visibility window helper: fade/scale in at a, out at b */
function inOut(t, a, b, fin = .25, fout = .2) {
  if (t < a || t > b + fout) return 0;
  return Math.min(E.out(P(t, a, fin)), 1 - E.in(P(t, b, fout)));
}

/* word-by-word caption: <div class="cap" data-words="..."> -> spans; reveal(t, start, perWord) */
function buildCaption(el) {
  const words = el.dataset.words.split(' ');
  el.innerHTML = words.map(w => {
    const hot = w.startsWith('*'); const txt = hot ? w.slice(1) : w;
    return `<span class="w${hot ? ' hot' : ''}">${txt}</span>`;
  }).join(' ');
  return Array.from(el.querySelectorAll('.w'));
}
function revealWords(spans, t, start, per = .11) {
  spans.forEach((s, i) => {
    const p = P(t, start + i * per, .28), e = E.spring(p);
    css(s, { opacity: p > 0 ? 1 : 0, transform: `translateY(${(1 - E.out(p)) * 26}px) scale(${lerp(.55, 1, e)})` });
  });
}

/* ---------- the vintage chart ---------- */
function makeChart(svg, bounds) {
  // bounds: [[lon0, lat0], [lon1, lat1]] fitted to the full frame width
  const proj = d3.geoMercator().fitExtent([[0, 0], [W, H]], { type: 'MultiPoint', coordinates: bounds });
  const path = d3.geoPath(proj);
  const T = window.WORLD_LITE, land = topojson.feature(T, T.objects.countries);
  const borders = topojson.mesh(T, T.objects.countries, (a, b) => a !== b);
  const ns = 'http://www.w3.org/2000/svg';
  const g = document.createElementNS(ns, 'g'); g.id = 'cam'; svg.appendChild(g);
  const add = (tag, attrs, parent = g) => { const e = document.createElementNS(ns, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  // sea texture: rhumb lines from two wind roses
  const rl = add('g', { stroke: 'rgba(43,29,18,.16)', 'stroke-width': 1.4, fill: 'none' });
  [[-150, 30], [-60, 22]].forEach(c => {
    const [x, y] = proj(c);
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; add('line', { x1: x, y1: y, x2: x + Math.cos(a) * 4000, y2: y + Math.sin(a) * 4000 }, rl); }
  });
  add('path', { d: path(d3.geoGraticule().step([10, 10])()), stroke: 'rgba(43,29,18,.13)', 'stroke-width': 1.2, fill: 'none', 'stroke-dasharray': '6 6' });
  // coast glow + land
  add('path', { d: path(land), fill: 'none', stroke: 'rgba(94,62,12,.25)', 'stroke-width': 16, 'stroke-linejoin': 'round' });
  add('path', { d: path(land), fill: '#EFE0B8', stroke: '#5E4A35', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
  add('path', { d: path(borders), fill: 'none', stroke: 'rgba(94,74,53,.45)', 'stroke-width': 1.6, 'stroke-dasharray': '5 5' });
  const layer = add('g', {});
  return { proj, g, add, layer, ns };
}
/* camera: keep geographic point [lon,lat] at screen (cx,cy) at zoom k */
function camTo(chart, lonlat, k, cx = W / 2, cy = H / 2) {
  const [x, y] = Array.isArray(lonlat.xy) ? lonlat.xy : chart.proj(lonlat);
  camXY(chart, x, y, k, cx, cy);
}
function camXY(chart, x, y, k, cx = W / 2, cy = H / 2) {
  chart.cam = { tx: cx - x * k, ty: cy - y * k, k };
  chart.g.setAttribute('transform', `translate(${chart.cam.tx},${chart.cam.ty}) scale(${k})`);
}
/* map-space point -> screen point under the current camera */
function scr(chart, xy) { const c = chart.cam; return [xy[0] * c.k + c.tx, xy[1] * c.k + c.ty]; }
function lerpLL(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }

/* curved leg path between two projected points; returns the path element (dash-drawable) */
function legPath(chart, a, b, bend, attrs) {
  const [x1, y1] = chart.proj(a), [x2, y2] = chart.proj(b);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const p = chart.add('path', Object.assign({ d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, fill: 'none' }, attrs), chart.layer);
  p._len = p.getTotalLength();
  return p;
}
function drawPath(p, f) { p.setAttribute('stroke-dasharray', `${p._len} ${p._len}`); p.setAttribute('stroke-dashoffset', p._len * (1 - f)); }
function pointOn(p, f) { const q = p.getPointAtLength(p._len * clamp(f)); return [q.x, q.y]; }

const money = v => '$' + Math.round(v).toLocaleString('en-US');

/* today's real route (puzzle #8, from the game engine) */
const CITY = {
  can: { n: 'Cancún', ll: [-86.85, 21.16] }, mia: { n: 'Miami', ll: [-80.19, 25.76] }, atl: { n: 'Atlanta', ll: [-84.39, 33.75] },
  dal: { n: 'Dallas', ll: [-96.80, 32.78] }, den: { n: 'Denver', ll: [-104.99, 39.74] }, lax: { n: 'Los Angeles', ll: [-118.24, 34.05] },
  sfo: { n: 'San Francisco', ll: [-122.42, 37.77] },
  // the other places the game offers along the way (choices at each decision)
  hav: { n: 'Havana', ll: [-82.37, 23.11] }, chi: { n: 'Chicago', ll: [-87.63, 41.88] }, tor: { n: 'Toronto', ll: [-79.38, 43.65] },
  // game v18 (408 cities): the stops and choices on puzzle #8 now
  hou: { n: 'Houston', ll: [-95.37, 29.76] }, aus: { n: 'Austin', ll: [-97.74, 30.27] }, phx: { n: 'Phoenix', ll: [-112.07, 33.45] },
  nol: { n: 'New Orleans', ll: [-90.07, 29.95] }, mex: { n: 'Mexico City', ll: [-99.13, 19.43] }, abq: { n: 'Albuquerque', ll: [-106.65, 35.08] },
  sat: { n: 'San Antonio', ll: [-98.49, 29.42] }, sac: { n: 'Sacramento', ll: [-121.49, 38.58] }, sdg: { n: 'San Diego', ll: [-117.16, 32.72] },
};
const PERFECT = [
  { a: 'can', b: 'hou', mode: '🚌', name: 'Bus', cost: 76 },
  { a: 'hou', b: 'aus', mode: '🚌', name: 'Bus', cost: 15 },
  { a: 'aus', b: 'phx', mode: '🚆', name: 'Train', cost: 91, deal: '-30%' },
  { a: 'phx', b: 'lax', mode: '🚆', name: 'Train', cost: 44, deal: '-35%' },
  { a: 'lax', b: 'sfo', mode: '🚘', name: 'Rideshare', cost: 36 },
];

/* ---------- QA: TikTok safe zones + overlapping text ----------
   Text-bearing blocks are found by selector (or [data-qa]); [data-qa-skip] opts out.
   Unsafe zones for 1080x1920 (TikTok/Reels overlays): top tabs y<200, caption/buttons y>1480,
   right action rail x>930 for 860<y<1560. */
const QA_SEL = '.veh,#ticket,.url,.cap .w,.pill,.hud .box,.huge,.hook,.sub,.rule-k,.rule-v,.chip,.lbl,.stampx,#stamp,.share,.meter,.receipt,.phone,.card,[data-qa]';
function qaVisible(el) {
  let o = 1;
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
    o *= +cs.opacity;
  }
  return o;
}
window.qaScan = function (t) {
  const els = $$(QA_SEL).filter(e => !e.closest('[data-qa-skip]') && qaVisible(e) > .35);
  const R = els.map(e => ({ e, r: e.getBoundingClientRect(), name: (e.id ? '#' + e.id : '.' + e.className.split(' ')[0]) + ' "' + (e.dataset.qaName || (e.textContent || '').trim().replace(/[\d$,]+/g, '#').slice(0, 22)) + '"' }))
    .filter(o => o.r.width > 2 && o.r.height > 2 && o.r.right > 0 && o.r.left < W && o.r.bottom > 0 && o.r.top < H);
  const out = [];
  R.forEach(o => {
    const r = o.r, z = [];
    if (r.top < 200) z.push('top ' + Math.round(r.top));
    if (r.bottom > 1480) z.push('bottom ' + Math.round(r.bottom));
    if (r.left < 40) z.push('left ' + Math.round(r.left));
    if (r.right > 1040) z.push('right ' + Math.round(r.right));
    else if (r.right > 930 && r.bottom > 860 && r.top < 1560) z.push('rail ' + Math.round(r.right));
    if (z.length && !o.e.closest('[data-qa-edge]') && !o.e.classList.contains('lbl')) out.push(`zone ${o.name}: ${z.join(', ')}`);
  });
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const a = R[i], b = R[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const sa = a.e.closest('.scene'), sb = b.e.closest('.scene');
    if (sa && sb && sa !== sb) continue; // a wipe covers the old scene
    if (a.e.dataset.qaGroup && a.e.dataset.qaGroup === b.e.dataset.qaGroup) continue;
    const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (ix > 6 && iy > 6) {
      const small = Math.min(a.r.width * a.r.height, b.r.width * b.r.height);
      if (ix * iy > small * .02) out.push(`overlap ${a.name} x ${b.name}`);
    }
  }
  return out;
};
