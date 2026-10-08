#!/usr/bin/env node
/* Writes data/world-lite.js: the same Natural Earth topology as data/world.js with every arc simplified
   (Douglas-Peucker in quantized units) so the home-page globe can redraw at 60 fps. Run: node tools/build-world-lite.js [tolerance] */
const fs = require('fs'), path = require('path');
global.window = {}; eval(fs.readFileSync(path.join(__dirname, '..', 'data', 'world.js'), 'utf8'));
const W = window.WORLD_TOPO, TOL = +process.argv[2] || 5;
const decode = arc => { let x = 0, y = 0; return arc.map(([dx, dy]) => [x += dx, y += dy]); };
const encode = pts => { let x = 0, y = 0; return pts.map(([px, py]) => { const d = [px - x, py - y]; x = px; y = py; return d; }); };
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let best = -1, bd = 0;
    for (let i = a + 1; i < b; i++) { const [px, py] = pts[i]; const d = len === 1 && dx === 0 && dy === 0 ? Math.hypot(px - ax, py - ay) : Math.abs(dy * px - dx * py + bx * ay - by * ax) / len; if (d > bd) { bd = d; best = i; } }
    if (best > 0 && bd > tol) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
let before = 0, after = 0;
const arcs = W.arcs.map(arc => { const pts = decode(arc); before += pts.length; const s = dp(pts, TOL); after += s.length; return encode(s); });
const out = { type: 'Topology', transform: W.transform, arcs, objects: { countries: { type: 'GeometryCollection', geometries: W.objects.countries.geometries.map(g => ({ type: g.type, arcs: g.arcs, id: g.id, properties: { name: g.properties.name } })) } } };
const js = 'window.WORLD_LITE=' + JSON.stringify(out) + ';';
fs.writeFileSync(path.join(__dirname, '..', 'data', 'world-lite.js'), js);
console.log(`points ${before} -> ${after}, ${(js.length / 1024).toFixed(0)} KB`);
