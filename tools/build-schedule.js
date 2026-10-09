#!/usr/bin/env node
/* Writes data/schedule.js: the start, destination and twist for each day, checked ahead of time.
   A day is kept only if the planner's route has three or more legs, the weekday's twist survives the
   mission search, and at least three routes fit the mission. Otherwise the next city pair is tried.
   Days up to and including today are copied from the existing data/schedule.js, so a re-run never rewrites a puzzle
   people have already played. A city pair is not repeated within PAIR_GAP days, no city starts or ends two puzzles
   within CITY_GAP days, and cities in AVOID countries are never a start or destination (they stay on the chart as stops).
   Usage: node tools/build-schedule.js [days=730]. Re-run after changing EPOCH, the cities or the twists. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: k => delete store[k] };
global.window = global;
require(path.join(ROOT, 'data/cities.js'));
window.TRAVERSE_SCHEDULE = { epoch: '', days: {} }; // build from scratch, never from the old file
require(path.join(ROOT, 'js/traverse.js'));
const T = window.Traverse;
window.TRAVERSE_SCHEDULE.epoch = T.dayKey(1); // so the hand-made days below are what challenge(n) sees while they are checked
const N = +process.argv[2] || 730, MAX_TRIES = 48;
const PAIR_GAP = 120, CITY_GAP = 7;
/* Countries whose cities make awkward subjects for a daily puzzle and its promotion while conflicts are active.
   They stay in data/cities.js and can still be stops on a route; they are just never the start or the destination. */
const AVOID = new Set(['Ukraine', 'Russia', 'Iran', 'Israel', 'Lebanon', 'Myanmar']);
/* Days already published: read from the committed schedule so a rebuild keeps every day up to and including today. */
const FROZEN = (() => {
  try {
    const m = fs.readFileSync(path.join(ROOT, 'data/schedule.js'), 'utf8').match(/window\.TRAVERSE_SCHEDULE = (\{[\s\S]*\});/);
    const old = m && JSON.parse(m[1]); if (!old || old.epoch !== T.dayKey(1)) return {};
    const out = {}; const today = T.dayNumber();
    for (let n = 1; n <= today; n++) if (old.days[n]) out[n] = old.days[n];
    return out;
  } catch (e) { return {}; }
})();
const pairKey = (a, b) => [a, b].sort().join('-');
const lastPair = {}, lastCity = {}; // key -> most recent day number it was used
function clash(n, a, b) { // true when this pair or either endpoint was used too recently
  if (AVOID.has(T.byId[a].country) || AVOID.has(T.byId[b].country)) return 'avoid';
  if (n - (lastPair[pairKey(a, b)] || -1e9) <= PAIR_GAP) return 'pair';
  if (n - Math.max(lastCity[a] || -1e9, lastCity[b] || -1e9) <= CITY_GAP) return 'city';
  return '';
}
function note(n, a, b) { lastPair[pairKey(a, b)] = n; lastCity[a] = n; lastCity[b] = n; }
/* Hand-made days: [start, destination, twist, title, blurb]. Each must still pass the checks below. */
const HANDMADE = {
  1: ['sea', 'den', 'nofly', 'Coast to the Rockies', 'Seattle to Denver with no flights at all. Trains, buses and a long way round through California.'],
  2: ['tok', 'sel', 'threemodes', 'Across the Sea of Japan', 'Tokyo to Seoul with flights at double the price. The bullet train is only the start.'],
  3: ['sto', 'mil', 'rail', 'North to South', 'Stockholm to Milan with trains at half price. A classic rail crossing of Europe.'],
  4: ['cai', 'mad', 'oneflight', 'Nile to the Tagus', 'Cairo to Madrid with one flight at most. Pick the hop that makes the rest cheap.'],
  5: ['cpt', 'dar', 'open', 'Cape to the Swahili Coast', 'Cape Town to Dar es Salaam, no extra rule. The direct flight never fits the budget, so look for a stop along the way.'],
  6: ['rio', 'bue', 'overland', 'Tango by Land', 'Rio de Janeiro to Buenos Aires, but you cannot fly into the city. Find the last overland leg.'],
  7: ['ath', 'bcn', 'ferry', 'The Mediterranean', 'Athens to Barcelona with ferries at half price. Somewhere along the coast there is a boat worth taking.'],
};
const days = {}; let imperfect = 0; const t0 = Date.now();
for (let n = 1; n <= N; n++) {
  const want = T.rhythmOf(n).twist.id; let pick = null;
  if (FROZEN[n]) { days[n] = FROZEN[n]; note(n, FROZEN[n][0], FROZEN[n][1]); continue; } // published days stay as they were, hand-made ones included
  if (HANDMADE[n]) {
    const h = HANDMADE[n]; window.TRAVERSE_SCHEDULE.days[n] = h; T.forget('d' + n);
    if (h[2] !== want) { console.error('hand-made day ' + n + ' (' + h[3] + ') is a ' + h[2] + ' day but ' + T.rhythmOf(n).label + ' needs ' + want); process.exit(1); }
    const ch = T.challenge(n), M = T.mission(ch);
    if (!(ch.twistId === h[2] && M.par.legs >= 3 && M.routes >= 3)) { console.error('hand-made day ' + n + ' (' + h[3] + ') fails the checks: twist ' + ch.twistId + ', legs ' + M.par.legs + ', routes ' + M.routes); process.exit(1); }
    days[n] = h; note(n, h[0], h[1]); T.forget('d' + n); continue;
  }
  for (let salt = 0; salt < MAX_TRIES; salt++) {
    const ch = T.challenge(n, salt); let M;
    if (clash(n, ch.from.id, ch.to.id)) { T.forget('d' + n); continue; }
    try { M = T.mission(ch); } catch (e) { console.warn('\nday ' + n + ' try ' + salt + ' (' + ch.from.name + ' to ' + ch.to.name + '): ' + e.message); T.forget('d' + n); continue; }
    const good = ch.twistId === want && M.par.legs >= 3 && M.routes >= 3;
    const cand = { e: [ch.from.id, ch.to.id, ch.twistId], good, rank: (ch.twistId === want) * 4 + (M.par.legs >= 3) * 2 + (M.routes >= 3) };
    if (!pick || cand.rank > pick.rank) pick = cand;
    T.forget('d' + n);
    if (good) break;
  }
  if (!pick) { console.error('\nday ' + n + ': every candidate pair was a repeat or in an avoided country; raise MAX_TRIES'); process.exit(1); }
  days[n] = pick.e; note(n, pick.e[0], pick.e[1]);
  if (!pick.good) { imperfect++; console.warn('\nday ' + n + ': no pair passed every check, kept the closest'); }
  if (n % 50 === 0) process.stdout.write('.');
}
const out = '/* Generated by tools/build-schedule.js. Day number -> [start, destination, twist, title?, blurb?], checked ahead of time. */\n'
  + 'window.TRAVERSE_SCHEDULE = ' + JSON.stringify({ epoch: T.dayKey(1), days }) + ';\n';
fs.writeFileSync(path.join(ROOT, 'data/schedule.js'), out);
console.log(`\nwrote ${N} days from ${T.dayKey(1)} in ${Math.round((Date.now() - t0) / 1000)}s; ${imperfect} kept without passing every check`);
