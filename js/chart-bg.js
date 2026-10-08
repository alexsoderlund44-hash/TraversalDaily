/* The home-page globe: a vintage chart painted once onto an equirectangular texture, then wrapped on a
   sphere by a tiny WebGL shader and turned accurately on its axis. Without WebGL the chart is drawn once, still.
   d3, topojson and a simplified world outline load lazily after the page has painted. */
(function () {
  'use strict';
  const cv = document.getElementById('hm-bg'); if (!cv) return;
  const base = (document.currentScript && document.currentScript.src || '').replace(/js\/chart-bg\.js.*$/, '');
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = base + src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  const ready = () => (window.d3 ? Promise.resolve() : load('vendor/d3.min.js')).then(() => window.topojson ? null : load('vendor/topojson-client.min.js')).then(() => window.WORLD_LITE ? null : load('data/world-lite.js'));
  const go = () => ready().then(start).catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 200);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SHIPS = [[-40, 30], [-25, -20], [-150, 10], [-120, -35], [75, -25], [160, -40], [-60, 45], [100, 5], [20, -45], [-170, 50], [45, 10], [-10, 60]];
  const OCEANS = [['OCEANVS ATLANTICVS', -35, 20], ['OCEANVS PACIFICVS', -150, -5], ['OCEANVS INDICVS', 80, -25], ['MARE DEL ZVR', -105, -30], ['OCEANVS AETHIOPICVS', -12, -28], ['OCEANVS ARCTICVS', -20, 80], ['TERRA AVSTRALIS', 60, -75], ['MARE PACIFICVM', 165, 20]];

  function ship(ctx, x, y, sc, flip) {
    ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -sc : sc, sc); ctx.strokeStyle = 'rgba(60,35,10,.85)'; ctx.fillStyle = 'rgba(60,35,10,.75)'; ctx.lineWidth = 1 / sc;
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.quadraticCurveTo(-10, 8, 0, 8); ctx.lineTo(12, 8); ctx.quadraticCurveTo(18, 6, 20, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-4, -22); ctx.moveTo(8, 0); ctx.lineTo(8, -18); ctx.stroke();
    ctx.fillStyle = 'rgba(250,243,225,.9)'; ctx.beginPath(); ctx.moveTo(-4, -21); ctx.quadraticCurveTo(-14, -13, -4, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -17); ctx.quadraticCurveTo(0, -10, 8, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  /* the chart itself, painted flat: W x W/2 pixels, longitude across, latitude down */
  function paintChart(W, F) {
    const H = W / 2, c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    const T = window.WORLD_LITE, feats = topojson.feature(T, T.objects.countries).features;
    const land = topojson.merge(T, T.objects.countries.geometries), borders = topojson.mesh(T, T.objects.countries, (a, b) => a !== b);
    const proj = d3.geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]), path = d3.geoPath(proj, ctx);
    const k = W / 4096; // everything below is tuned for a 4096-wide chart
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#CDAF6E'); g.addColorStop(.5, '#E4CD97'); g.addColorStop(1, '#C9A862'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const x = Math.random() * W, y = Math.random() * H, r = W * (0.02 + Math.random() * 0.06); const bl = ctx.createRadialGradient(x, y, 0, x, y, r); bl.addColorStop(0, 'rgba(120,80,30,' + (0.05 + Math.random() * 0.08) + ')'); bl.addColorStop(1, 'rgba(120,80,30,0)'); ctx.fillStyle = bl; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
    ctx.beginPath(); path(d3.geoGraticule().step([10, 10])()); ctx.strokeStyle = 'rgba(70,40,10,.22)'; ctx.lineWidth = 1.2 * k; ctx.stroke();
    // rhumb lines from roses at sea
    ctx.lineWidth = 1 * k;
    [[-35, 20], [-150, -5], [80, -25], [-110, -40], [-20, -30], [170, 25]].forEach(([lo, la]) => { const [rx, ry] = proj([lo, la]); for (let a = 0; a < 32; a++) { const t = a * Math.PI / 16; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + Math.cos(t) * W * 0.5, ry + Math.sin(t) * W * 0.5); ctx.strokeStyle = a % 4 === 0 ? 'rgba(70,40,10,.2)' : a % 2 === 0 ? 'rgba(70,40,10,.12)' : 'rgba(120,50,30,.1)'; ctx.stroke(); } });
    ctx.lineJoin = 'round';
    [[40, .05], [24, .08], [11, .14]].forEach(([w, a]) => { ctx.beginPath(); path(land); ctx.lineWidth = w * k; ctx.strokeStyle = 'rgba(90,50,12,' + a + ')'; ctx.stroke(); });
    ctx.beginPath(); path(land); ctx.fillStyle = '#EEDFB4'; ctx.fill(); ctx.lineWidth = 2 * k; ctx.strokeStyle = 'rgba(60,35,10,.8)'; ctx.stroke();
    ctx.save(); ctx.beginPath(); path(land); ctx.clip(); ctx.beginPath(); path(land); ctx.lineWidth = 22 * k; ctx.strokeStyle = 'rgba(160,120,60,.3)'; ctx.stroke(); ctx.restore();
    ctx.beginPath(); path(borders); ctx.lineWidth = 1.4 * k; ctx.setLineDash([8 * k, 6 * k]); ctx.strokeStyle = 'rgba(60,35,10,.45)'; ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '.22em';
    feats.forEach(f => { const b = path.bounds(f), w = b[1][0] - b[0][0], h = b[1][1] - b[0][1]; if (w < 150 * k || h < 60 * k || w > W * 0.6) return; const cen = path.centroid(f), name = (f.properties.name || '').toUpperCase(); if (!name || !isFinite(cen[0])) return;
      const fs = Math.max(16 * k, Math.min(44 * k, w / (name.length * 0.95))); ctx.fillStyle = 'rgba(60,35,10,.55)'; ctx.font = 'italic 700 ' + fs + 'px Alegreya, Georgia, serif'; ctx.fillText(name, cen[0], cen[1]); });
    ctx.letterSpacing = '.35em'; ctx.font = '500 ' + 52 * k + 'px Alegreya, Georgia, serif'; ctx.fillStyle = 'rgba(70,40,10,.5)';
    OCEANS.forEach(([n, lo, la]) => { const p = proj([lo, la]); ctx.fillText(n, p[0], p[1]); });
    SHIPS.forEach(([lo, la], i) => { const p = proj([lo, la]); ship(ctx, p[0], p[1], 2.4 * k, i % 2 === 1); });
    // today's course and its two pins
    ctx.beginPath(); path({ type: 'LineString', coordinates: [[F.from.lon, F.from.lat], [F.to.lon, F.to.lat]] }); ctx.setLineDash([6 * k, 12 * k]); ctx.lineWidth = 4 * k; ctx.strokeStyle = 'rgba(161,58,42,.8)'; ctx.stroke(); ctx.setLineDash([]);
    [[F.from, '#26696D'], [F.to, '#A13A2A']].forEach(([q, col]) => { const p = proj([q.lon, q.lat]); ctx.beginPath(); ctx.arc(p[0], p[1], 11 * k, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = '#F4EAD2'; ctx.lineWidth = 4 * k; ctx.stroke(); });
    return c;
  }

  const VS = 'attribute vec2 a;varying vec2 v;void main(){v=a;gl_Position=vec4(a,0.,1.);}';
  const FS = `precision highp float;varying vec2 v;uniform sampler2D t;uniform float lon,tilt,ring;
    void main(){float r2=dot(v,v);
      if(r2>ring*ring){gl_FragColor=vec4(0.);return;}
      if(r2>1.){float a=smoothstep(ring,1.004,sqrt(r2));gl_FragColor=vec4(0.43,0.29,0.06,1.)*a*0.75;return;}
      float z=sqrt(1.-r2);
      /* tilt about the x axis, then spin about the polar axis */
      float ct=cos(tilt),st=sin(tilt);vec3 p=vec3(v.x,v.y*ct-z*st,v.y*st+z*ct);
      float cl=cos(lon),sl=sin(lon);p=vec3(p.x*cl+p.z*sl,p.y,-p.x*sl+p.z*cl);
      float lat=asin(clamp(p.y,-1.,1.)),ln=atan(p.x,p.z);
      vec2 uv=vec2(ln/6.2831853+0.5,0.5-lat/3.1415926);
      vec3 c=texture2D(t,uv).rgb;
      float r=sqrt(r2);float limb=1.-0.55*smoothstep(0.7,1.,r);float light=1.+0.10*(1.-smoothstep(0.,1.2,length(v-vec2(-0.45,0.5))));
      c*=limb*light;gl_FragColor=vec4(c,1.);}`;

  function start() {
    const F = window.TD_FOCUS; if (!F) return;
    const mid = d3.geoInterpolate([F.from.lon, F.from.lat], [F.to.lon, F.to.lat])(0.5);
    const tilt = Math.max(-35, Math.min(35, mid[1] * 0.75)) * Math.PI / 180;
    const gl = cv.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true });
    /* power-of-two width: WebGL 1 only wraps (REPEAT) power-of-two textures, and the chart must wrap at the antimeridian */
    const maxTex = gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 4096;
    const big = Math.min(maxTex, Math.max(innerWidth, innerHeight) * 2.2 > 2560 ? 4096 : 2048);
    const chart = paintChart(big, F);
    if (!gl) { drawStill(chart, mid, tilt); return; }
    let R, size, dpr;
    function fit() { R = Math.max(innerWidth, innerHeight) * 0.62; size = Math.ceil(R * 2 + 40); dpr = Math.min(2, devicePixelRatio || 1); cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px'; gl.viewport(0, 0, cv.width, cv.height); }
    fit();
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { drawStill(chart, mid, tilt); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const ext = (R + 20) / R; gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-ext, -ext, ext, -ext, -ext, ext, ext, ext]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, chart);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const uLon = gl.getUniformLocation(prog, 'lon'), uTilt = gl.getUniformLocation(prog, 'tilt'), uRing = gl.getUniformLocation(prog, 'ring');
    gl.uniform1f(uTilt, tilt); gl.uniform1f(uRing, (R + 7) / R); gl.clearColor(0, 0, 0, 0);
    const SPEED = (2 * Math.PI) / 240; // one full turn every four minutes, like a desk globe given a push
    let lon = mid[0] * Math.PI / 180, last = performance.now(), raf = 0;
    const draw = () => { gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(uLon, lon); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    const frame = now => { const dt = Math.min(0.1, (now - last) / 1000); last = now; lon += SPEED * dt; draw(); raf = requestAnimationFrame(frame); };
    draw(); cv.classList.add('on');
    if (!reduced) {
      raf = requestAnimationFrame(frame);
      document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } });
    }
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { fit(); gl.uniform1f(uRing, (R + 7) / R); draw(); }, 150); });
  }

  /* no WebGL: one still frame of the globe */
  function drawStill(chart, mid, tilt) {
    const R = Math.max(innerWidth, innerHeight) * 0.62, size = Math.ceil(R * 2 + 40), dpr = 1;
    cv.width = size; cv.height = size; cv.style.width = cv.style.height = size + 'px';
    const ctx = cv.getContext('2d'), img = ctx.createImageData(size, size), d = img.data, cd = chart.getContext('2d').getImageData(0, 0, chart.width, chart.height).data, W = chart.width, H = chart.height;
    const ct = Math.cos(tilt), st = Math.sin(tilt), cl = Math.cos(mid[0] * Math.PI / 180), sl = Math.sin(mid[0] * Math.PI / 180);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const vx = (x - size / 2) / R, vy = -(y - size / 2) / R, r2 = vx * vx + vy * vy; if (r2 > 1) continue;
      const z = Math.sqrt(1 - r2); const py = vy * ct - z * st, pz0 = vy * st + z * ct; const px = vx * cl + pz0 * sl, pz = -vx * sl + pz0 * cl;
      const lat = Math.asin(py), ln = Math.atan2(px, pz); const u = Math.floor((ln / (2 * Math.PI) + 0.5) * W) % W, v = Math.floor((0.5 - lat / Math.PI) * H);
      const si = (v * W + u) * 4, di = (y * size + x) * 4, limb = 1 - 0.55 * Math.max(0, (Math.sqrt(r2) - 0.7) / 0.3);
      d[di] = cd[si] * limb; d[di + 1] = cd[si + 1] * limb; d[di + 2] = cd[si + 2] * limb; d[di + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); cv.classList.add('on');
  }
})();
