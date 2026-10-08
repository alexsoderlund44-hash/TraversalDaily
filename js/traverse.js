/* TraversleDaily engine. Seeded, deterministic per UTC day: cities, transport legs, the day's mission
   (budget, deadline, twist, hidden deals), the planner's route and scoring. No backend. */
(function () {
  'use strict';
  const C = window.TRAVERSE_CITIES.map(a => ({ id: a[0], name: a[1], country: a[2], flag: a[3], lat: a[4], lon: a[5], hub: a[6], coastal: a[7], rail: a[8], iata: a[9] }));
  const byId = {}; C.forEach(c => (byId[c.id] = c));
  const STORE = 'traverse.v1';
  const DAY_MS = 86400000;
  const EPOCH = Date.UTC(2026, 9, 1); // day #1 = 1 Oct 2026 UTC; launch day (7 Oct) is puzzle #7 so the archive opens with a week

  // a new puzzle at midnight on the player's own clock (like Wordle), numbered by calendar date
  const dayNumber = (t = Date.now()) => { const d = new Date(t); return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / DAY_MS) + 1; };
  const dayKey = n => new Date(EPOCH + (n - 1) * DAY_MS).toISOString().slice(0, 10);
  const untilReset = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime(); };

  /* ---------- seeded random ---------- */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let s = seed || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------- geography ---------- */
  const R = 6371;
  function km(a, b) {
    const dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const sameLand = (a, b) => { // crude: can you drive/rail between them?
    const d = km(a, b);
    if (d > 2600) return false;
    const water = [['rey'], ['dub'], ['hnl'], ['akl'], ['bal'], ['mnl'], ['cmb'], ['hav'], ['pal'], ['jkt'], ['tpe'], ['sin','kul','bkk','sgn','han'], ['tok','osa'], ['syd','mel','per'], ['cpt','jnb','dar','nbo','adb'], ['lag','acc','dak'], ['sao','rio','bue','scl','lim','bog','pty'], ['mex','can'], ['nyc','bos','wdc','chi','mia','lax','sfo','sea','den','dal','atl','tor','mtl','van','anc'], ['dxb','doh','ryh','mct','teh','amm','bei','tel','cai','alx','kar','del','bom','blr'], ['pek','sha','sel','hkg']];
    const isle = ['rey','dub','hnl','akl','bal','mnl','cmb','hav','pal','jkt','tpe','tok','osa','sin'];
    if (isle.includes(a.id) || isle.includes(b.id)) {
      if ((a.id === 'tok' && b.id === 'osa') || (a.id === 'osa' && b.id === 'tok')) return true;
      if ((a.id === 'sin' && b.id === 'kul') || (a.id === 'kul' && b.id === 'sin')) return true;
      return false;
    }
    const grp = id => water.findIndex(g => g.includes(id));
    const ga = grp(a.id), gb = grp(b.id);
    if (ga === -1 && gb === -1) return true; // Europe/N. Africa/Middle east mainland
    if (ga === gb) return true;
    const eu = x => x === -1, me = x => x === 19;
    if ((eu(ga) && me(gb)) || (eu(gb) && me(ga))) return d < 2200;
    return false;
  };
  const MED_S = ['tun','alg','cas','mar','tan','cai','alx','tel','bei'];
  const crossesMed = (a, b) => MED_S.includes(a.id) !== MED_S.includes(b.id);

  /* ---------- transport modes ---------- */
  const MODES = {
    plane: { icon: '✈️', name: 'Flight', color: '#F5B544', speed: 820, over: 1.6, fixed: 55, perKm: 0.075 },
    train: { icon: '🚆', name: 'Train', color: '#39C6B0', speed: 150, over: 0.5, fixed: 12, perKm: 0.09 },
    bus:   { icon: '🚌', name: 'Bus', color: '#8FB4FF',   speed: 72,  over: 0.4, fixed: 6,  perKm: 0.045 },
    ferry: { icon: '🚢', name: 'Ferry', color: '#7BE0FF', speed: 38,  over: 1.2, fixed: 20, perKm: 0.08 },
    ride:  { icon: '🚘', name: 'Rideshare', color: '#C98BFF', speed: 78, over: 0.6, fixed: 8, perKm: 0.065 },
    car:   { icon: '🚗', name: 'Car', color: '#FF8C6B',   speed: 85,  over: 0.2, fixed: 40, perKm: 0.13 },
    bike:  { icon: '🚲', name: 'Bicycle', color: '#C9D6C0', speed: 18, over: 0, fixed: 0, perKm: 0.012 },
    walk:  { icon: '🚶', name: 'Walking', color: '#C9D6C0', speed: 4.5, over: 0, fixed: 0, perKm: 0.03 },
  };
  const MODE_BIT = { plane: 1, train: 2, bus: 4, ferry: 8, ride: 16, car: 32, bike: 64, walk: 128 };

  /* ---------- twists: one rule that changes the puzzle for the day ---------- */
  const TWISTS = [
    { id: 'open', icon: '🧭', name: 'Open road', desc: 'No extra rule today. Beat the budget and the clock.', state: () => 0, allow: () => true, done: () => true, status: () => '' },
    { id: 'nofly', icon: '🚫', name: 'Grounded', desc: 'No flights today. Ground and sea only.', state: () => 0, allow: l => l.mode !== 'plane', done: () => true, status: () => 'no flights allowed' },
    { id: 'oneflight', icon: '🎫', name: 'One ticket', desc: 'One flight, no more.', state: (s, l) => Math.min(2, s + (l.mode === 'plane' ? 1 : 0)), allow: (l, s) => !(l.mode === 'plane' && s >= 1), done: () => true, status: s => s >= 1 ? 'your one flight is used' : 'one flight still available' },
    { id: 'ferry', icon: '🚢', name: 'Sea legs', desc: 'Take a ferry somewhere along the way.', state: (s, l) => s | (l.mode === 'ferry' ? 1 : 0), allow: () => true, done: s => s === 1, status: s => s ? 'ferry taken ✓' : 'still needs a ferry' },
    { id: 'rail', icon: '🚆', name: 'Rail pass', desc: 'Take the train at least twice.', state: (s, l) => Math.min(2, s + (l.mode === 'train' ? 1 : 0)), allow: () => true, done: s => s >= 2, status: s => s >= 2 ? 'two trains ✓' : (2 - s) + ' more train leg' + (s === 1 ? '' : 's') + ' needed' },
    { id: 'overland', icon: '🛬', name: 'Overland arrival', desc: "You can't fly into the destination.", state: () => 0, allow: (l, s, toDest) => !(toDest && l.mode === 'plane'), done: () => true, status: () => 'no flying into the destination' },
    { id: 'threemodes', icon: '🎲', name: 'Mix it up', desc: 'Use three different kinds of transport.', state: (s, l) => s | MODE_BIT[l.mode], allow: () => true, done: s => pop(s) >= 3, status: s => pop(s) >= 3 ? 'three modes ✓' : (3 - pop(s)) + ' more mode' + (pop(s) === 2 ? '' : 's') + ' needed' },
  ];
  const pop = x => { let n = 0; while (x) { n += x & 1; x >>= 1; } return n; };
  const twistById = {}; TWISTS.forEach(t => (twistById[t.id] = t));

  /* ---------- legs ---------- */
  function modelPlane(a, b, d, r) {
    const jitter = () => 0.8 + r() * 0.45, m = MODES.plane;
    const hubScore = a.hub + b.hub + r() * 3;
    const direct = d < 3500 ? hubScore >= 2.5 : hubScore >= 4.2;
    if (direct) {
      const cheapHub = (a.hub + b.hub) >= 4 ? 0.82 : 1;
      return { cost: (m.fixed + d * m.perKm * (d > 4000 ? 0.75 : 1)) * jitter() * cheapHub, hours: m.over + d / m.speed + (d > 5000 ? 0.6 : 0), note: 'direct' };
    }
    if (d > 900 && hubScore >= 1.8) return { cost: (m.fixed + d * m.perKm) * jitter() * 1.05, hours: m.over + d / m.speed + 2.2 + r() * 1.5, note: '1 stop' };
    return null;
  }
  const liveFor = seed => { const L = window.TRAVERSE_LIVE; const n = parseInt(String(seed).slice(1), 10); return (L && n > 0 && L.date === dayKey(n)) ? L : null; };
  /* how far the day's live fares sit from the model: median ratio, applied to modelled flights so both worlds agree */
  const CAL = {};
  function calibration(seed) {
    if (CAL[seed]) return CAL[seed];
    const L = liveFor(seed), rc = [], rh = [];
    if (L) {
      for (const k in L.routes) {
        const [x, y] = k.split('-'); const a = byId[x], b = byId[y]; if (!a || !b) continue;
        const d = km(a, b), r = rng(hash(seed + '|' + [a.id, b.id].sort().join('-')));
        const pl = modelPlane(a, b, d, r); if (!pl) continue;
        rc.push(L.routes[k].cost / pl.cost); rh.push(L.routes[k].hours / pl.hours);
      }
    }
    const med = v => { if (!v.length) return 1; v = v.slice().sort((p, q) => p - q); return v[Math.floor(v.length / 2)]; };
    return (CAL[seed] = { cost: med(rc), hours: med(rh) });
  }
  const BLOCKED = {}; // seed -> 'x-y' pair with no direct link at all (every day needs at least one stop)
  const DEALS = {};   // seed -> { 'a-b|mode': pct }
  const TWIST = {};   // seed -> twist id (edge-level rules are applied inside legs())
  function legs(a, b, seed) {
    if (a.id === b.id) return [];
    if (BLOCKED[seed] === [a.id, b.id].sort().join('-')) return []; // never a direct link between start and destination
    const d = km(a, b), r = rng(hash(seed + '|' + [a.id, b.id].sort().join('-')));
    const out = [];
    const jitter = () => 0.8 + r() * 0.45;
    const land = sameLand(a, b) && !crossesMed(a, b);
    const add = (m, cost, hours, note, extra) => out.push(Object.assign({ mode: m, icon: MODES[m].icon, name: MODES[m].name, cost: Math.round(cost), hours: Math.round(hours * 12) / 12, note }, extra));

    const L = liveFor(seed), lk = a.id + '-' + b.id, live = L && L.routes[lk];
    if (live) add('plane', live.cost, live.hours, 'avg of ' + live.n + ' live fares', { live: true, nonstop: live.nonstop, min: live.min });
    else if (d > 220) { const pl = modelPlane(a, b, d, r), cal = calibration(seed); if (pl) add('plane', pl.cost * cal.cost, pl.hours * cal.hours, pl.note); }
    if (land) {
      if (a.rail && b.rail && d < 1400) {
        const m = MODES.train, hs = (a.hub + b.hub >= 3 && d < 900) ? 1.5 : 1; // high-speed corridors
        add('train', (m.fixed + d * m.perKm * (hs > 1 ? 1.25 : 1)) * jitter(), m.over + d / (m.speed * hs) + (d > 700 ? 1.5 : 0), hs > 1 ? 'high-speed' : null);
      }
      if (d < 1300) { const m = MODES.bus; add('bus', (m.fixed + d * m.perKm) * jitter(), m.over + d / m.speed + (d > 500 ? 1 : 0)); }
      if (d < 900) { const m = MODES.ride; add('ride', (m.fixed + d * m.perKm) * jitter(), m.over + d / m.speed + (d > 400 ? 0.5 : 0), 'shared ride'); }
      if (d < 1200) { const m = MODES.car; add('car', (m.fixed + d * m.perKm) * jitter(), m.over + d / m.speed + Math.floor(d / 600) * 0.75, 'rental'); }
      if (d < 180) { const m = MODES.bike; add('bike', m.fixed + d * m.perKm, d / m.speed); }
      if (d < 45) { const m = MODES.walk; add('walk', d * m.perKm, d / m.speed); }
    }
    if (a.coastal && b.coastal && d < 1100 && (!land || d < 500 || crossesMed(a, b))) {
      const m = MODES.ferry; add('ferry', (m.fixed + d * m.perKm) * jitter(), m.over + d / m.speed);
    }
    // the day's hidden deals: a discounted fare on a few specific legs
    const D = DEALS[seed];
    if (D) out.forEach(l => { const p = D[lk + '|' + l.mode]; if (p) { l.full = l.cost; l.cost = Math.max(1, Math.round(l.cost * (1 - p))); l.deal = p; } });
    // edge-level twist rules (nofly) are removed here so every list a player sees is already legal
    if (TWIST[seed] === 'nofly') return out.filter(l => l.mode !== 'plane');
    return out;
  }

  /* ---------- the day's challenge ---------- */
  const CONTINENT = {};
  [['Africa', 'Egypt Tunisia Algeria Morocco Nigeria Ghana Senegal Kenya Ethiopia Tanzania'], ['North America', 'USA Canada Mexico Cuba Panama'],
   ['South America', 'Colombia Peru Chile Argentina Brazil'], ['Oceania', 'Australia New Zealand'],
   ['Asia', 'Georgia Azerbaijan Armenia Israel Jordan Lebanon UAE Qatar Iran Oman India Pakistan Thailand Vietnam Malaysia Singapore Indonesia Philippines China Japan Taiwan']
  ].forEach(([k, v]) => v.split(' ').forEach(c => (CONTINENT[c] = k)));
  Object.assign(CONTINENT, { 'South Africa': 'Africa', 'Saudi Arabia': 'Asia', 'Sri Lanka': 'Asia', 'Hong Kong': 'Asia', 'South Korea': 'Asia' });
  const continentOf = c => CONTINENT[c.country] || 'Europe';
  const COUNTRIES = Array.from(new Set(C.map(c => c.country)));
  const CONTINENTS = ['Europe', 'Asia', 'Africa', 'North America', 'South America', 'Oceania'];
  /* weekly rhythm: each weekday has a named theme, a twist and a part of the world, so "Eurorail Saturday" becomes a habit.
     Sunday first, like getUTCDay(). region: continents both cities must be in (null = anywhere); minKm: a long-haul floor. */
  const RHYTHM = [
    { twist: 'oneflight', name: 'Grand Tour', region: null, minKm: 2600, desc: 'A long way to go and one flight at most.' },
    { twist: 'open', name: 'Open Road', region: null, desc: 'No extra rule. Anywhere in the world.' },
    { twist: 'overland', name: 'Southern Crossing', region: ['South America', 'Africa'], desc: 'South America or Africa, and no flying into the destination.' },
    { twist: 'ferry', name: 'Island Hopper', region: ['Asia', 'Europe', 'North America'], coastal: true, desc: 'Coast to coast, with at least one ferry.' },
    { twist: 'nofly', name: 'Road Trip', region: ['North America', 'South America'], desc: 'The Americas with no flights at all.' },
    { twist: 'threemodes', name: 'Mix It Up', region: ['Asia'], desc: 'Asia, with three kinds of transport.' },
    { twist: 'rail', name: 'Eurorail', region: ['Europe'], desc: 'Europe by train, at least twice.' },
  ];
  const DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const rhythmOf = n => { const wd = new Date(dayKey(n)).getUTCDay(), r = RHYTHM[wd]; return { twist: twistById[r.twist], day: DAYNAMES[wd], name: r.name, label: r.name + ' ' + DAYNAMES[wd], desc: r.desc, rule: r }; };
  // a quick check that a city pair can host a twist at all (the mission search has the final say)
  const fits = (tw, a, b) => tw === 'nofly' ? (sameLand(a, b) && !crossesMed(a, b)) || (a.coastal && b.coastal)
    : tw === 'rail' ? a.rail && b.rail && sameLand(a, b) : tw === 'ferry' ? a.coastal || b.coastal : true;
  /* daily schedule (data/schedule.js, written by tools/build-schedule.js): a start, destination and twist per day,
     each checked ahead of time to have a planner's route of three or more legs that keeps the day's twist */
  // in Node (the schedule builder, the live-fares routine) pick the schedule up from disk so every tool sees the same days
  if (!window.TRAVERSE_SCHEDULE && typeof require === 'function' && typeof __dirname === 'string') { try { require(__dirname + '/../data/schedule.js'); } catch (e) {} }
  const scheduled = n => { const S = window.TRAVERSE_SCHEDULE; return S && S.epoch === dayKey(1) && S.days[n] ? S.days[n] : null; };
  function challenge(n, salt) {
    const s = salt === undefined ? scheduled(n) : null;
    if (s) return build('d' + n, '', n, null, { from: byId[s[0]], to: byId[s[1]], twist: twistById[s[2]], title: s[3] || '', blurb: s[4] || '' });
    const rh = rhythmOf(n);
    return build('d' + n, 'traverse-day-' + n + (salt ? '-' + salt : ''), n, null, { twist: rh.twist, rule: rh.rule });
  }
  // random expeditions: try a few city pairs (deterministic from the tag) until one has a real multi-leg puzzle
  function challengeRandom(tag) {
    const t = String(tag || Math.random().toString(36).slice(2, 8)), seed = 'r' + t;
    if (CH[seed]) return CH[seed];
    for (let k = 0; k < 4; k++) {
      const ch = build(seed, 'traverse-random-' + t + (k ? '-' + k : ''), 0, t);
      if (k === 3 || mission(ch).par.legs >= 3) return ch;
      forget(seed);
    }
  }
  const CH = {};
  function build(seed, hashKey, n, tag, fixed) {
    if (CH[seed]) return CH[seed];
    fixed = fixed || {};
    const r = rng(hash(hashKey || seed));
    let a = fixed.from, b = fixed.to, tries = 0;
    if (!a || !b) {
      const rule = fixed.rule || {}, pool = rule.region ? C.filter(c => rule.region.includes(continentOf(c)) && (!rule.coastal || c.coastal)) : C;
      const minKm = rule.minKm || 1000;
      do { a = pool[Math.floor(r() * pool.length)]; b = pool[Math.floor(r() * pool.length)]; tries++; }
      while ((a.id === b.id || km(a, b) < minKm || km(a, b) > 4200 || a.hub + b.hub < 2 || (fixed.twist && tries < 300 && !fits(fixed.twist.id, a, b))) && tries < 400);
    }
    BLOCKED[seed] = [a.id, b.id].sort().join('-');
    const twist = fixed.twist || TWISTS[Math.floor(r() * TWISTS.length)];
    TWIST[seed] = twist.id;
    const ch = { n, key: n ? dayKey(n) : 'random-' + tag, seed, from: a, to: b, twistId: twist.id, twist, random: !n, title: fixed.title || '', blurb: fixed.blurb || '' };
    return (CH[seed] = ch);
  }

  function forget(seed) { [CH, BLOCKED, DEALS, TWIST, MIS, CAL].forEach(o => delete o[seed]); }

  /* ---------- route search: every sensible route, kept as a Pareto frontier of (cost, hours) ---------- */
  function corridor(ch) { // cities worth considering: not a huge detour off the straight line
    const D = km(ch.from, ch.to);
    return C.filter(c => c.id === ch.from.id || c.id === ch.to.id || km(ch.from, c) + km(c, ch.to) < D * 1.8 + 300);
  }
  function graph(ch, cities) {
    const g = {};
    cities.forEach(a => { g[a.id] = []; cities.forEach(b => { if (a.id !== b.id) legs(a, b, ch.seed).forEach(l => g[a.id].push({ from: a.id, to: b.id, cost: l.cost, hours: l.hours, mode: l.mode, deal: l.deal || 0 })); }); });
    return g;
  }
  function frontier(ch, g, cities, capCost, capHours, maxLegs, minLegs) {
    const tw = ch.twist, dest = ch.to.id, EC = 6, EH = 0.4, CAP = 24, BEAM = 1000;
    const front = {};
    const insert = (key, c) => {
      const arr = front[key] || (front[key] = []);
      for (let i = 0; i < arr.length; i++) { const l = arr[i]; if (l.cost <= c.cost + EC && l.hours <= c.hours + EH) return false; }
      for (let i = arr.length - 1; i >= 0; i--) { const l = arr[i]; if (c.cost <= l.cost && c.hours <= l.hours) arr.splice(i, 1); }
      arr.push(c);
      if (arr.length > CAP) { let w = 0, wi = 0; arr.forEach((l, i) => { const v = l.cost / capCost + l.hours / capHours; if (v > w) { w = v; wi = i; } }); arr.splice(wi, 1); if (wi === arr.length) return false; }
      return true;
    };
    let layer = [{ cost: 0, hours: 0, legs: 0, path: [], st: 0, city: ch.from.id, seen: [ch.from.id] }];
    front[ch.from.id + '|0'] = layer.slice();
    const out = [];
    for (let L = 1; L <= maxLegs; L++) {
      const next = [];
      for (const lb of layer) {
        if (lb.city === dest) continue;
        for (const e of g[lb.city]) {
          if (lb.seen.includes(e.to)) continue;
          if (e.to === dest && L < (minLegs || 1)) continue;
          if (!tw.allow(e, lb.st, e.to === dest)) continue;
          const nc = lb.cost + e.cost, nh = lb.hours + e.hours;
          if (nc > capCost || nh > capHours) continue;
          const ns = tw.state(lb.st, e), k = e.to + '|' + ns + (minLegs > 1 ? '|' + L : '');
          const arr = front[k]; let dom = false;
          if (arr) for (let i = 0; i < arr.length; i++) { const l = arr[i]; if (l.cost <= nc + EC && l.hours <= nh + EH) { dom = true; break; } }
          if (dom) continue;
          const c = { cost: nc, hours: nh, legs: L, path: lb.path.concat(e), st: ns, city: e.to, seen: lb.seen.concat(e.to) };
          if (insert(k, c)) { next.push(c); if (e.to === dest && tw.done(ns)) out.push(c); }
        }
      }
      if (next.length > BEAM) { next.sort((x, y) => (x.cost / capCost + x.hours / capHours) - (y.cost / capCost + y.hours / capHours)); next.length = BEAM; }
      layer = next;
    }
    return out;
  }
  const routeScore = (cost, hours, cheapest, fastest) => {
    const mF = Math.pow(Math.min(1, cheapest / cost), 1.1), tF = Math.pow(Math.min(1, fastest / hours), 1.1);
    return (0.4 * mF + 0.4 * tF + 0.2) * (0.85 + 0.15 * Math.sqrt(mF * tF));
  };
  const modesOf = p => new Set(p.map(e => e.mode)).size;

  /* ---------- the mission: budget, deadline, deals and the planner's route ----------
     The planner picks an intended route (3+ legs, mixed transport), hides deals along it so it undercuts the
     obvious two-leg hop, then sets a budget just above it. Finding that route is the puzzle. */
  const MIS = {};
  const key = e => e.from + '-' + e.to + '|' + e.mode;
  function mission(ch) {
    if (MIS[ch.seed]) return MIS[ch.seed];
    const r = rng(hash('mission-' + ch.seed));
    let cities = corridor(ch);
    let g = null, caps = null;
    const search = (minLegs) => {
      if (!g) { g = graph(ch, cities); const quick = frontier(ch, g, cities, 1e9, 1e9, 2); caps = [quick.length ? Math.min(...quick.map(x => x.cost)) * 2.6 : 4000, quick.length ? Math.min(...quick.map(x => x.hours)) * 3.6 : 110]; }
      return frontier(ch, g, cities, caps[0], caps[1], 6, minLegs);
    };
    let routes = search();
    if (routes.length < 3) { cities = C; g = null; routes = search(); }
    if (routes.length < 2 && ch.twistId !== 'open') { ch.twist = twistById.open; ch.twistId = 'open'; TWIST[ch.seed] = 'open'; cities = corridor(ch); g = null; routes = search(); if (routes.length < 3) { cities = C; g = null; routes = search(); } }
    const sc0 = (x, cheap, fast) => routeScore(x.cost, x.hours, cheap, fast);
    const cheap = Math.min(...routes.map(x => x.cost)), fast = Math.min(...routes.map(x => x.hours));
    const sorted = routes.slice().sort((x, y) => sc0(y, cheap, fast) - sc0(x, cheap, fast));
    // candidate intended routes: 3+ legs (searched separately, since the two-leg hop usually dominates them)
    const short = routes.filter(x => x.legs <= 2);
    const bestShort = short.length ? Math.min(...short.map(x => x.cost)) : Infinity;
    const long = search(3).filter(x => x.hours <= fast * 2.6 || ch.twistId === 'nofly');
    const MAXD = 0.65;
    const endLeg = e => e.from === ch.from.id || e.to === ch.to.id;
    // a deal on an end leg must not hand a two-leg route the same discount
    const leaks = e => (e.from === ch.from.id && legs(byId[e.to], ch.to, ch.seed).length > 0) || (e.to === ch.to.id && legs(ch.from, byId[e.from], ch.seed).length > 0);
    const legsSorted = x => x.path.filter(e => !leaks(e)).sort((p, q) => (endLeg(p) - endLeg(q)) || ((p.mode === 'plane') - (q.mode === 'plane')) || (q.cost - p.cost));
    const dealable = x => x.cost - legsSorted(x).slice(0, 3).reduce((a, e) => a + e.cost * MAXD, 0);
    const mixed = long.filter(x => modesOf(x.path) >= 2);
    const pool = (mixed.length ? mixed : long).map(x => ({ x, s: sc0(x, cheap, fast), d: dealable(x) }));
    const under = pool.filter(p => p.d <= bestShort * 0.78).sort((a, b) => b.s - a.s);
    const intended = under.length ? under[0].x : pool.length ? pool.sort((a, b) => a.d - b.d)[0].x : sorted[0];
    // deals: discount up to three legs of the intended route (middle legs first) so it undercuts the best short route
    const deals = {};
    const target = Math.min(intended.cost * 0.9, (isFinite(bestShort) ? bestShort : intended.cost * 1.3) * 0.76);
    let need = intended.cost - target;
    const own = legsSorted(intended);
    for (const e of own.slice(0, 3)) { if (need <= 0) break; const p = Math.round(Math.min(MAXD, Math.max(0.25, need / e.cost)) * 20) / 20; deals[key(e)] = p; need -= e.cost * p; }
    for (const e of own) { if (Object.keys(deals).length >= 2) break; if (!deals[key(e)]) deals[key(e)] = Math.round((0.25 + r() * 0.15) * 20) / 20; }
    // decoys: discounted legs on other good routes, never on an end leg (that would cheapen the two-leg hop)
    const onIntended = e => intended.path.some(o => o.from === e.from && o.to === e.to);
    const decoys = []; const seen = new Set(Object.keys(deals));
    sorted.slice(0, 30).forEach(rt => { if (rt === intended) return; rt.path.forEach(e => { const k = key(e); if (!seen.has(k) && !endLeg(e) && !onIntended(e)) { seen.add(k); decoys.push(e); } }); });
    decoys.sort((x, y) => (x.mode === 'plane') - (y.mode === 'plane'));
    if (!decoys.length) cities.forEach(a => { if (a.id === ch.from.id || a.id === ch.to.id) return; g[a.id].forEach(e => { if (!endLeg(e) && e.mode !== 'plane' && !seen.has(key(e))) { seen.add(key(e)); decoys.push(e); } }); });
    while (Object.keys(deals).length < 3 && decoys.length) { const e = decoys.splice(Math.floor(r() * Math.min(decoys.length, 8)), 1)[0]; deals[key(e)] = Math.round((0.3 + r() * 0.25) * 20) / 20; }
    DEALS[ch.seed] = deals;
    for (const k in deals) { const [pair, mode] = k.split('|'), [fa, tb] = pair.split('-'); g[fa].forEach(e => { if (e.to === tb && e.mode === mode) { e.cost = Math.max(1, Math.round(e.cost * (1 - deals[k]))); e.deal = deals[k]; } }); }
    routes = search();
    const short2 = routes.filter(x => x.legs <= 2), bestShort2 = short2.length ? Math.min(...short2.map(x => x.cost)) : Infinity;
    const icost = intended.path.reduce((a, e) => a + (deals[key(e)] ? Math.max(1, Math.round(e.cost * (1 - deals[key(e)]))) : e.cost), 0), ihours = intended.hours;
    // budget just above the intended route, deadline with some slack; loosen only until the puzzle has a few answers
    const MB = [1.12, 1.2, 1.3, 1.42, 1.55, 1.7, 1.9], MD = [1.15, 1.3, 1.45, 1.65, 1.9, 2.2, 2.6];
    const cands = []; MB.forEach((mb, i) => MD.forEach((md, j) => cands.push({ mb, md, loose: i + j + r() * 0.9 })));
    cands.sort((x, y) => x.loose - y.loose);
    const evalC = (mb, md) => {
      const B = Math.ceil(icost * mb / 10) * 10, D = Math.ceil(ihours * md);
      const feas = routes.filter(x => x.cost <= B && x.hours <= D);
      if (!feas.length) return null;
      const c0 = Math.min(...feas.map(x => x.cost)), f0 = Math.min(...feas.map(x => x.hours));
      let par = null, ps = -1; feas.forEach(x => { const s = sc0(x, c0, f0); if (s > ps) { ps = s; par = x; } });
      return { B, D, feas, par, cheapest: c0, fastest: f0, parScore: ps };
    };
    const ok = (m, k) => m && m.feas.length >= k && m.par.legs >= 3 && modesOf(m.par.path) >= 2;
    let pick = null;
    for (const c of cands) { const m = evalC(c.mb, c.md); if (ok(m, 4) && m.B < bestShort2 && m.par.path.some(e => e.deal)) { pick = m; break; } }
    if (!pick) for (const c of cands) { const m = evalC(c.mb, c.md); if (ok(m, 3) && m.B < bestShort2) { pick = m; break; } }
    if (!pick) for (const c of cands) { const m = evalC(c.mb, c.md); if (ok(m, 3)) { pick = m; break; } }
    if (!pick) for (const c of cands) { const m = evalC(c.mb, c.md); if (m && m.feas.length >= 2) { pick = m; break; } }
    if (!pick) { const m = evalC(1.9, 2.6); pick = m || { B: Math.ceil(icost * 2), D: Math.ceil(ihours * 3), feas: routes, par: routes[0] || intended, cheapest: cheap, fastest: fast, parScore: 1 }; }
    const M = { budget: pick.B, deadline: pick.D, cheapest: pick.cheapest, fastest: pick.fastest, twist: ch.twist, deals: Object.keys(deals).length, dealKeys: Object.keys(deals),
      par: { cost: pick.par.cost, hours: pick.par.hours, legs: pick.par.legs, path: pick.par.path, score: Math.round(10000 * Math.min(1, pick.parScore)) },
      routes: pick.feas.length };
    return (MIS[ch.seed] = M);
  }

  /* ---------- scoring ---------- */
  function score(cost, hours, secs, M) {
    if (!(cost > 0) || !(hours > 0)) return 0;
    const mF = Math.pow(Math.min(1, M.cheapest / cost), 1.1), tF = Math.pow(Math.min(1, M.fastest / hours), 1.1);
    const decF = Math.exp(-Math.max(0, secs - 30) / 240);
    const blend = 0.4 * mF + 0.4 * tF + 0.2 * decF;
    return Math.round(10000 * Math.min(1, blend * (0.85 + 0.15 * Math.sqrt(mF * tF))));
  }
  const TIERS = [[0.97, 'Perfect', '🏆'], [0.9, 'Expert', '🧭'], [0.8, 'Navigator', '🗺️'], [0.65, 'Wayfarer', '🎒'], [0, 'Arrived', '🏁']];
  const tier = (s, M) => { const q = s / Math.max(1, M.par.score); const t = TIERS.find(x => q >= x[0]); return { name: t[1], icon: t[2], q }; };

  /* ---------- progression ---------- */
  const LEVELS = [[0, 'Backpacker'], [600, 'Wayfarer'], [1600, 'Navigator'], [3200, 'Pathfinder'], [5500, 'Cartographer'], [8500, 'Voyager'], [12500, 'Globetrotter'], [18000, 'Legend']];
  function progression(results) {
    const keys = Object.keys(results || {}).filter(k => /^\d{4}-/.test(k)).sort();
    let xp = 0, run = 0, prev = null;
    keys.forEach(k => { const d = Math.round((Date.parse(k) - EPOCH) / DAY_MS) + 1; run = (prev !== null && d === prev + 1) ? run + 1 : 1; prev = d; const rres = results[k]; xp += Math.round(rres.score / 10) + Math.min(run, 7) * 25 + (rres.tier === 'Perfect' ? 150 : rres.tier === 'Expert' ? 60 : 0) + (rres.deals && rres.deals.found === rres.deals.total && rres.deals.total ? 50 : 0); });
    let li = 0; LEVELS.forEach((l, i) => { if (xp >= l[0]) li = i; });
    const next = LEVELS[li + 1];
    return { xp, level: li + 1, title: LEVELS[li][1], next: next ? next[0] : null, nextTitle: next ? next[1] : null, into: xp - LEVELS[li][0], span: next ? next[0] - LEVELS[li][0] : 1 };
  }

  /* ---------- player stats: one source for the profile, stats page, achievements and the stats pop-up ---------- */
  const dayOfKey = k => Math.round((Date.parse(k) - EPOCH) / DAY_MS) + 1;
  function stats(results, now) {
    results = results || {}; const today = now || dayNumber();
    const keys = Object.keys(results).filter(k => /^\d{4}-/.test(k)).sort(), runs = keys.map(k => results[k]);
    let maxStreak = 0, run = 0, prev = null, gapReturn = false;
    keys.forEach(k => { const d = dayOfKey(k); if (prev !== null && d - prev > 7) gapReturn = true; run = (prev !== null && d === prev + 1) ? run + 1 : 1; prev = d; maxStreak = Math.max(maxStreak, run); });
    let streak = 0; { let d = today; if (!results[dayKey(d)]) d--; while (d >= 1 && results[dayKey(d)]) { streak++; d--; } }
    const countries = new Set(), continents = new Set(), modeCount = {}; let kmTot = 0, legs = 0, spent = 0, hours = 0, best = null;
    keys.forEach(k => {
      const r = results[k], start = byId[r.from] || challenge(dayOfKey(k)).from; let at = start;
      countries.add(start.country); continents.add(continentOf(start));
      r.route.forEach(l => { const c = byId[l.to]; if (!c) return; kmTot += km(at, c); at = c; countries.add(c.country); continents.add(continentOf(c)); modeCount[l.mode] = (modeCount[l.mode] || 0) + 1; });
      legs += r.route.length; spent += r.cost; hours += r.hours;
      if (!best || r.score > best.score) best = { score: r.score, key: k, n: dayOfKey(k), tier: r.tier };
    });
    const tiers = {}; TIERS.forEach(t => (tiers[t[1]] = 0)); runs.forEach(r => (tiers[r.tier || 'Arrived'] = (tiers[r.tier || 'Arrived'] || 0) + 1));
    const hourOf = r => r.at ? new Date(r.at).getHours() : 12;
    return {
      keys, runs, played: runs.length, streak, maxStreak, best, avg: runs.length ? Math.round(runs.reduce((a, r) => a + r.score, 0) / runs.length) : 0,
      tiers, expert: tiers.Perfect + tiers.Expert, perfect: tiers.Perfect,
      parDays: runs.filter(r => r.parMatch).length, dealDays: runs.filter(r => r.deals && r.deals.total && r.deals.found === r.deals.total).length,
      dealsFound: runs.reduce((a, r) => a + (r.deals ? r.deals.found : 0), 0),
      countries, continents, km: Math.round(kmTot), legs, spent, hours, modeCount,
      twists: new Set(runs.map(r => r.twist).filter(Boolean)), noFly: runs.filter(r => !r.route.some(l => l.mode === 'plane')).length,
      ferryLegs: modeCount.ferry || 0, quick: runs.filter(r => r.secs < 45).length, maxLegs: runs.reduce((a, r) => Math.max(a, r.route.length), 0),
      thrifty: runs.filter(r => r.cost < 100).length, level: progression(results).level,
      early: runs.some(r => hourOf(r) < 7), late: runs.some(r => hourOf(r) >= 23),
      flawless: runs.some(r => r.tier === 'Perfect' && !r.hints && !r.undos), quickPar: runs.some(r => r.parMatch && r.secs < 60), gapReturn,
    };
  }

  /* ---------- achievements: tiered (bronze, silver, gold) so there is always a next goal, plus a few secret ones ---------- */
  const TIER_NAMES = ['Bronze', 'Silver', 'Gold'];
  const ACH = [
    { id: 'first', ic: '🧭', name: 'First Departure', what: 'Submit your first journey', v: s => s.played, t: [1] },
    { id: 'streak', ic: '🔥', name: 'On a Roll', what: 'Play {n} days in a row', v: s => s.maxStreak, t: [7, 30, 100] },
    { id: 'played', ic: '🎒', name: 'Seasoned', what: 'Play {n} days', v: s => s.played, t: [10, 50, 200] },
    { id: 'par', ic: '🎯', name: "Planner's Match", what: "Find the planner's route {n}", v: s => s.parDays, t: [1, 10, 50], times: true },
    { id: 'deals', ic: '🏷️', name: 'Deal Hunter', what: 'Find every hidden deal in a day {n}', v: s => s.dealDays, t: [1, 10, 50], times: true },
    { id: 'perfect', ic: '🏆', name: 'Perfect Day', what: 'Earn a Perfect rating {n}', v: s => s.perfect, t: [1, 5, 25], times: true },
    { id: 'expert', ic: '🥇', name: 'Consistent', what: 'Rate Expert or better on {n} days', v: s => s.expert, t: [3, 15, 60] },
    { id: 'passport', ic: '🛂', name: 'Passport', what: 'Pass through {n} countries', v: s => s.countries.size, t: [10, 25, 50] },
    { id: 'continents', ic: '🌍', name: 'Continental', what: 'Travel on {n} continents', v: s => s.continents.size, t: [2, 4, 6] },
    { id: 'distance', ic: '🛰️', name: 'Long Haul', what: 'Travel {n} km in total', v: s => s.km, t: [10000, 40075, 384400], note: ['', 'once round the Earth', 'as far as the Moon'] },
    { id: 'twists', ic: '🎲', name: 'Rule Bender', what: 'Play {n} different twists', v: s => s.twists.size, t: [3, 5, 7] },
    { id: 'modes', ic: '🚆', name: 'Mixed Company', what: 'Use {n} kinds of transport', v: s => Object.keys(s.modeCount).length, t: [3, 5, 7] },
    { id: 'noplane', ic: '🚌', name: 'Grounded', what: 'Finish {n} without flying', v: s => s.noFly, t: [1, 10, 30], journeys: true },
    { id: 'ferry', ic: '🚢', name: 'Sea Legs', what: 'Take {n} ferries', v: s => s.ferryLegs, t: [1, 10, 30] },
    { id: 'quick', ic: '⚡', name: 'Snap Decision', what: 'Submit in under 45 seconds {n}', v: s => s.quick, t: [1, 10, 30], times: true },
    { id: 'scenic', ic: '🗺️', name: 'The Scenic Route', what: 'Finish a journey with {n} legs', v: s => s.maxLegs, t: [4, 5, 6] },
    { id: 'thrifty', ic: '💰', name: 'Thrifty', what: 'Finish {n} for under $100', v: s => s.thrifty, t: [1, 10, 30], journeys: true },
    { id: 'level', ic: '🧳', name: 'Climbing', what: 'Reach level {n}', v: s => s.level, t: [3, 5, 8] },
    { id: 'flawless', ic: '💎', name: 'Flawless', what: 'A Perfect rating with no hints and no undos', v: s => +s.flawless, t: [1], secret: true },
    { id: 'quickpar', ic: '🚀', name: 'Back of an Envelope', what: "Find the planner's route in under a minute", v: s => +s.quickPar, t: [1], secret: true },
    { id: 'early', ic: '🌅', name: 'Early Bird', what: 'Submit a journey before 7 am', v: s => +s.early, t: [1], secret: true },
    { id: 'late', ic: '🌙', name: 'Last Train', what: 'Submit a journey after 11 pm', v: s => +s.late, t: [1], secret: true },
    { id: 'return', ic: '🔁', name: 'Back on the Road', what: 'Come back after more than a week away', v: s => +s.gapReturn, t: [1], secret: true },
  ];
  const goalText = (a, n) => { const num = n.toLocaleString('en-US'); return a.what.replace('{n}', a.times ? (n === 1 ? 'once' : num + ' times') : a.journeys ? (n === 1 ? 'a journey' : num + ' journeys') : num); };
  function achievements(results, now) {
    const s = stats(results, now);
    return ACH.map(a => {
      const v = a.v(s), level = a.t.filter(x => v >= x).length, next = a.t[level];
      return { id: a.id, ic: a.ic, name: a.name, secret: !!a.secret, value: v, level, max: a.t.length, done: level === a.t.length,
        tier: a.t.length > 1 && level ? TIER_NAMES[level - 1] : '', goal: next !== undefined ? goalText(a, next) : goalText(a, a.t[a.t.length - 1]),
        target: next !== undefined ? next : a.t[a.t.length - 1], note: a.note && next !== undefined ? a.note[level] : '' };
    });
  }
  /* badges or tiers earned by a new result (for the "unlocked" line on the expedition report) */
  function newlyEarned(before, after) {
    const b = {}; achievements(before).forEach(a => (b[a.id] = a.level));
    return achievements(after).filter(a => a.level > (b[a.id] || 0));
  }

  /* ---------- storage ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {} };
  // test builds: bump TEST_RESET to wipe today's official run once per browser (remove before launch)
  const TEST_RESET = 'reset-3';
  try { if (localStorage.getItem('traverse.reset') !== TEST_RESET) { const s = load(); if (s.results) { delete s.results[dayKey(dayNumber())]; save(s); } localStorage.setItem('traverse.reset', TEST_RESET); } } catch (e) {}

  /* ---------- TraversleDaily Plus: the paid archive ----------
     The last FREE_DAYS puzzles are free to replay; older ones need Plus. Membership is stored in this browser.
     Plan: $2.99 once for lifetime access, no subscription. Checkout is wired in plus.html once a payment provider is connected. */
  const FREE_DAYS = 7;
  const PLUS_STORE = 'traverse.plus';
  const PLANS = { life: { name: 'Traversle +', price: '$2.99', per: 'once, for life' } };
  const plus = () => { try { const p = JSON.parse(localStorage.getItem(PLUS_STORE)); return p && p.active ? p : { active: false }; } catch (e) { return { active: false }; } };
  const setPlus = p => { try { localStorage.setItem(PLUS_STORE, JSON.stringify(p)); } catch (e) {} };
  const dayLocked = n => n < dayNumber() - FREE_DAYS && !plus().active;

  /* ---------- names & flags (flag emoji → ISO code → image, so it works on every device) ---------- */
  const iso = c => { const cp = Array.from(c.flag).map(ch => ch.codePointAt(0) - 0x1F1E6 + 65); return cp.length === 2 ? String.fromCharCode(cp[0], cp[1]).toLowerCase() : ''; };
  // flags ship with the site (vendor/flags, from flag-icons, MIT) so they work offline; paths resolve from this script's folder
  const BASE = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src.replace(/js\/traverse\.js(\?.*)?$/, '') : '';
  const flagImg = (c, h) => { const code = c && iso(c); h = h || 20; return code ? `<img class="fl" src="${BASE}vendor/flags/${code}.svg" alt="" onerror="this.style.display='none'" width="${Math.round(h * 4 / 3)}" height="${h}" loading="lazy">` : ''; };
  const place = c => `${flagImg(c)}<span>${esc(c.name)}, ${esc(c.country)}</span>`;
  const placeText = c => `${c.name}, ${c.country}`;

  /* ---------- formatting ---------- */
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const dur = h => { const m = Math.round(h * 60); if (!m) return '0h'; const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60; return ((d ? d + 'd ' : '') + (hh || !d ? hh + 'h ' : '') + (mm || (!d && !hh) ? mm + 'm' : '')).trim(); };
  const secsF = s => s < 60 ? Math.round(s) + 's' : Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  window.Traverse = { live: () => window.TRAVERSE_LIVE || null, liveFor, iso, flagImg, place, placeText, C, byId, km, legs, MODES, TWISTS, twistById, dayNumber, dayKey, untilReset, EPOCH, challenge, challengeRandom, mission, benchmarks: mission, score, tier, TIERS, progression, LEVELS, stats, achievements, newlyEarned, COUNTRIES, CONTINENTS, continentOf, rhythmOf, forget, load, save, FREE_DAYS, PLANS, plus, setPlus, dayLocked, money, dur, secsF, esc, rng, hash };
})();
