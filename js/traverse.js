/* Traverse — daily travel strategy game. Seeded, deterministic per UTC day. */
(function () {
  'use strict';
  const C = window.TRAVERSE_CITIES.map(a => ({ id: a[0], name: a[1], country: a[2], flag: a[3], lat: a[4], lon: a[5], hub: a[6], coastal: a[7], rail: a[8], iata: a[9] }));
  const byId = {}; C.forEach(c => (byId[c.id] = c));
  const STORE = 'traverse.v1';
  const DAY_MS = 86400000;
  const EPOCH = Date.UTC(2026, 9, 7); // day #1 = 7 Oct 2026 UTC (launch day)

  const dayNumber = (t = Date.now()) => Math.floor((t - EPOCH) / DAY_MS) + 1;
  const dayKey = n => new Date(EPOCH + (n - 1) * DAY_MS).toISOString().slice(0, 10);

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
      if ((a.id === 'dub') || (b.id === 'dub')) return false;
      return false;
    }
    const grp = id => water.findIndex(g => g.includes(id));
    const ga = grp(a.id), gb = grp(b.id);
    if (ga === -1 && gb === -1) return true; // Europe/N. Africa/Middle east mainland
    if (ga === gb) return true;
    // Europe <-> Middle East/Türkiye corridor
    const eu = x => x === -1, me = x => x === 19;
    if ((eu(ga) && me(gb)) || (eu(gb) && me(ga))) return d < 2200;
    return false;
  };
  const crossesMed = (a, b) => (['tun','alg','cas','mar','tan','cai','alx','tel','bei'].includes(a.id) !== ['tun','alg','cas','mar','tan','cai','alx','tel','bei'].includes(b.id));

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

  /* Legs available between a and b on a given day. Deterministic. */
  /* modelled flight for a pair (before calibration) */
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
  /* how far the day's live fares sit from the model: median ratio, applied to modelled flights so both worlds agree */
  const CAL = {};
  function calibration(seed) {
    if (CAL[seed]) return CAL[seed];
    const L = window.TRAVERSE_LIVE, rc = [], rh = [];
    if (L && L.date === dayKey(parseInt(seed.slice(1), 10))) {
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
  function legs(a, b, daySeed) {
    if (a.id === b.id) return [];
    const noFly = BLOCKED[daySeed] === [a.id, b.id].sort().join('-');
    if (noFly) return []; // never a direct link between the day's start and destination: at least one stop is always required
    const d = km(a, b), r = rng(hash(daySeed + '|' + [a.id, b.id].sort().join('-')));
    const out = [];
    const jitter = () => 0.8 + r() * 0.45;
    const land = sameLand(a, b) && !crossesMed(a, b);
    const add = (m, cost, hours, note) => out.push({ mode: m, icon: MODES[m].icon, name: MODES[m].name, cost: Math.round(cost), hours: Math.round(hours * 12) / 12, note });

    // live averaged fare for this pair (daily snapshot), else modelled and calibrated to the day's live fares
    const L = window.TRAVERSE_LIVE, lk = a.id + '-' + b.id;
    const live = L && L.date === dayKey(parseInt(daySeed.slice(1), 10)) && L.routes[lk];
    if (live && !noFly) {
      out.push({ mode: 'plane', icon: MODES.plane.icon, name: 'Flight', cost: live.cost, hours: live.hours, note: 'avg of ' + live.n + ' live fares', live: true, nonstop: live.nonstop, min: live.min });
    } else if (d > 220 && !noFly) {
      const pl = modelPlane(a, b, d, r), cal = calibration(daySeed);
      if (pl) add('plane', pl.cost * cal.cost, pl.hours * cal.hours, pl.note);
    }
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
    return out;
  }

  /* ---------- daily challenge ---------- */

  function challenge(n) {
    const r = rng(hash('traverse-day-' + n));
    let a, b, tries = 0;
    do {
      a = C[Math.floor(r() * C.length)]; b = C[Math.floor(r() * C.length)];
      tries++;
    } while ((a.id === b.id || km(a, b) < 700 || km(a, b) > 4200 || a.hub + b.hub < 2) && tries < 400);
    BLOCKED['d' + n] = [a.id, b.id].sort().join('-');
    return { n, key: dayKey(n), seed: 'd' + n, from: a, to: b };
  }

  /* ---------- benchmarks (Dijkstra) ---------- */
  function graph(seed) {
    const g = {};
    C.forEach(a => { g[a.id] = []; C.forEach(b => { legs(a, b, seed).forEach(l => g[a.id].push({ to: b.id, cost: l.cost, hours: l.hours, mode: l.mode })); }); });
    return g;
  }
  function dijkstra(g, from, to, w) {
    const dist = {}, prev = {}, done = {}; C.forEach(c => (dist[c.id] = Infinity)); dist[from] = 0;
    for (;;) {
      let u = null; for (const k in dist) if (!done[k] && (u === null || dist[k] < dist[u])) u = k;
      if (u === null || dist[u] === Infinity) break; if (u === to) break; done[u] = true;
      g[u].forEach(e => { const nd = dist[u] + w(e); if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = { from: u, e }; } });
    }
    const path = []; let cur = to; while (prev[cur]) { path.unshift({ from: prev[cur].from, to: cur, ...prev[cur].e }); cur = prev[cur].from; }
    return { cost: path.reduce((a, e) => a + e.cost, 0), hours: path.reduce((a, e) => a + e.hours, 0), path };
  }
  function benchmarks(ch) {
    const g = graph(ch.seed);
    const cheap = dijkstra(g, ch.from.id, ch.to.id, e => e.cost + e.hours * 0.01);
    const fast = dijkstra(g, ch.from.id, ch.to.id, e => e.hours + e.cost * 0.0001);
    return { cheapest: cheap.cost, fastest: fast.hours, cheapPath: cheap.path, fastPath: fast.path };
  }

  /* ---------- scoring (intentionally not shown to players) ---------- */
  function score(cost, hours, secs, bm) {
    if (!(cost > 0) || !(hours > 0)) return 0;
    const costF = Math.pow(Math.min(1, bm.cheapest / cost), 1.1);
    const timeF = Math.pow(Math.min(1, bm.fastest / hours), 1.1);
    const decF = Math.exp(-Math.max(0, secs - 8) / 150);
    const blend = 0.38 * costF + 0.38 * timeF + 0.24 * decF;
    // routes that are good at *both* money and time beat routes that max out only one
    const synergy = 0.85 + 0.15 * Math.sqrt(costF * timeF);
    return Math.round(10000 * Math.min(1, blend * synergy));
  }

  /* ---------- simulated global field (no backend) ---------- */
  function field(ch, bm) {
    const r = rng(hash('field-' + ch.seed)); const n = 1800 + Math.floor(r() * 2400);
    const scores = [];
    for (let i = 0; i < n; i++) {
      const skill = r(); // 0..1
      const cost = bm.cheapest * (1.04 + (1 - skill) * (0.2 + r() * 2.2));
      const hrs = bm.fastest * (1.03 + (1 - skill) * (0.1 + r() * 2.5));
      const secs = 15 + (1 - skill) * 200 * r() + r() * 60;
      scores.push(score(cost, hrs, secs, bm));
    }
    return scores.sort((x, y) => y - x);
  }
  const rankOf = (s, fld) => { let i = 0; while (i < fld.length && fld[i] > s) i++; return { rank: i + 1, of: fld.length + 1 }; };

  /* ---------- storage ---------- */
  const load = () => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {} };

  /* ---------- names & flags (flag emoji → ISO code → image, so it works on every device) ---------- */
  const iso = c => { const cp = Array.from(c.flag).map(ch => ch.codePointAt(0) - 0x1F1E6 + 65); return cp.length === 2 ? String.fromCharCode(cp[0], cp[1]).toLowerCase() : ''; };
  const flagImg = (c, h) => { const code = iso(c); return code ? `<img class="fl" src="https://flagcdn.com/h${h >= 40 ? 40 : 20}/${code}.png" alt="" onerror="this.style.display='none'" width="${Math.round((h || 20) * 1.4)}" height="${h || 20}" loading="lazy">` : ''; };
  const place = c => `${flagImg(c)}<span>${esc(c.name)}, ${esc(c.country)}</span>`;
  const placeText = c => `${c.name}, ${c.country}`;

  /* ---------- formatting ---------- */
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const dur = h => { const m = Math.round(h * 60); const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60; return (d ? d + 'd ' : '') + (hh || !d ? hh + 'h ' : '') + (mm || (!d && !hh) ? mm + 'm' : '').trim(); };
  const secsF = s => s < 60 ? Math.round(s) + 's' : Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  window.Traverse = { live: () => window.TRAVERSE_LIVE || null, iso, flagImg, place, placeText, C, byId, km, legs, MODES, dayNumber, dayKey, challenge, benchmarks, score, field, rankOf, load, save, money, dur, secsF, esc, rng, hash };
})();
