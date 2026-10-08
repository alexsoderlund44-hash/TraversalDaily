/* static slideshow helpers: each .scene is one photo; render(t) shows slide floor(t) */
const NS = 'http://www.w3.org/2000/svg';
function mapIn(scene, bounds) {
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'chart'); svg.setAttribute('viewBox', '0 0 1080 1920');
  scene.prepend(svg); const ch = makeChart(svg, bounds); ch.scene = scene; return ch;
}
function fitView(ch, ids, cx, cy, w, h, maxK = 9) {
  const p = ids.map(id => ch.proj(CITY[id].ll)), xs = p.map(q => q[0]), ys = p.map(q => q[1]);
  const k = Math.min(maxK, w / Math.max(1, Math.max(...xs) - Math.min(...xs)), h / Math.max(1, Math.max(...ys) - Math.min(...ys)));
  camXY(ch, (Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2, k, cx, cy);
}
const at = (ch, id) => scr(ch, ch.proj(CITY[id].ll));
function put(ch, cls, html, xy, dx = 0, dy = 0) {
  const d = document.createElement('div'); d.className = cls; if (html != null) d.innerHTML = html; if (cls === 'bub') d.dataset.qa = '';
  d.style.left = (xy[0] + dx) + 'px'; d.style.top = (xy[1] + dy) + 'px'; ch.scene.appendChild(d); return d;
}
/* city label: side = 'r' | 'l' | 'b' | 't' */
function label(ch, id, side = 'r', text) {
  ch.scene.style.display = 'block'; const d = put(ch, 'lbl', text || CITY[id].n, at(ch, id)); const r = d.getBoundingClientRect();
  const o = { r: [26, -r.height / 2], l: [-26 - r.width, -r.height / 2], b: [-r.width / 2, 22], t: [-r.width / 2, -22 - r.height] }[side];
  d.style.left = (parseFloat(d.style.left) + o[0]) + 'px'; d.style.top = (parseFloat(d.style.top) + o[1]) + 'px'; return d;
}
function leg(ch, a, b, bend, attrs) {
  return legPath(ch, CITY[a].ll, CITY[b].ll, bend, Object.assign({ 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round' }, attrs));
}
function midOf(ch, p) { const q = p.getPointAtLength(p._len / 2); return scr(ch, [q.x, q.y]); }
function showSlides() {
  const S = $$('.scene'); window.DUR = S.length - .001;
  window.render = t => { const i = Math.max(0, Math.min(S.length - 1, Math.floor(t + 1e-6))); S.forEach((s, j) => s.style.display = j === i ? 'block' : 'none'); };
  $$('.cap').forEach(c => { const w = buildCaption(c); revealWords(w, 99, 0, 0); });
  window.render(0);
}
