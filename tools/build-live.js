/* Build data/live/<date>.js + latest.js from a raw fares file.
   Usage: node tools/build-live.js <raw.js> <YYYY-MM-DD> <fromId> <toId> <departDate>
   raw.js exports { 'from-to': { p:[prices], m:[minutes], ns:[price,minutes]|null } }   */
const fs = require('fs'), path = require('path');
const [raw, date, from, to, depart] = process.argv.slice(2);
const R = require(path.resolve(raw));
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const routes = {};
for (const k in R) {
  const r = R[k];
  routes[k] = { cost: Math.round(avg(r.p)), hours: Math.round(avg(r.m) / 60 * 12) / 12, n: r.p.length, min: Math.min(...r.p), nonstop: r.ns ? { cost: r.ns[0], hours: Math.round(r.ns[1] / 60 * 12) / 12 } : null };
}
const out = { date, from, to, depart, source: 'SlickTrip live fares, one-way economy, 1 traveller, averaged over the cheapest itineraries returned', fetched: new Date().toISOString(), routes };
const js = 'window.TRAVERSE_LIVE = ' + JSON.stringify(out, null, 1) + ';\n';
fs.mkdirSync('data/live', { recursive: true });
fs.writeFileSync(`data/live/${date}.js`, js);
fs.writeFileSync('data/live/latest.js', js);
console.log('wrote data/live/' + date + '.js with', Object.keys(routes).length, 'routes');
