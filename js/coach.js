/* Traversle: the coach. On a first visit it rides along with the real game: one short tip at a time, a ring around
   the thing it talks about, and nothing to read until the player has something to do. Skippable at any point. */
(function () {
  const G = window.tdGame; if (!G) return;
  let seen = true; try { seen = !!localStorage.getItem('traverse.seen'); } catch (e) {}
  const gate = document.getElementById('tv-gate');
  if (seen || !gate || gate.hidden) return;
  try { localStorage.setItem('traverse.seen', '1'); } catch (e) {}
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const stage = $('#tv-stage'), plan = $('#tv-plan');
  let cap = null, ring = null, anchor = null, raf = 0, timer = 0, live = true, step = '';

  function clear() { if (cap) cap.remove(); if (ring) ring.remove(); cap = ring = anchor = null; cancelAnimationFrame(raf); clearTimeout(timer); stage.classList.remove('coach-reach'); }
  function stop() { live = false; clear(); }

  /* a tip near an element, or in the chart's free corner when it is about the chart as a whole */
  function tip(text, el, opts) {
    if (!live) return; clear(); step = text; opts = opts || {};
    cap = document.createElement('div'); cap.className = 'coach-cap' + (el ? '' : ' stage');
    cap.innerHTML = `<span></span><button type="button" class="coach-skip" aria-label="Skip the tips">Skip tips</button>`;
    cap.firstChild.textContent = text; cap.querySelector('.coach-skip').onclick = stop;
    document.body.appendChild(cap);
    if (el) { ring = document.createElement('div'); ring.className = 'coach-ring'; document.body.appendChild(ring); anchor = el; }
    if (opts.reach) stage.classList.add('coach-reach');
    place(); if (!reduced) follow();
    if (opts.after) timer = setTimeout(opts.after, opts.ms || 3200);
  }
  function place() {
    if (!cap) return;
    const vw = window.innerWidth, vh = window.innerHeight, m = 10;
    if (anchor) {
      let r = anchor.getBoundingClientRect();
      const box = anchor.closest('.tv-picker'); if (box) { const b = box.getBoundingClientRect(); r = { left: Math.max(r.left, b.left), top: Math.max(r.top, b.top), right: Math.min(r.right, b.right), bottom: Math.min(r.bottom, b.bottom) }; r.width = r.right - r.left; r.height = r.bottom - r.top; } // the picker scrolls, so the ring stays inside its window
      if (r.width <= 0 || r.height < 16) { cap.style.opacity = ''; ring.style.opacity = 0; if (!box) cap.style.opacity = 0; return; }
      cap.style.opacity = ''; ring.style.opacity = '';
      ring.style.left = r.left - 4 + 'px'; ring.style.top = r.top - 4 + 'px'; ring.style.width = r.width + 8 + 'px'; ring.style.height = r.height + 8 + 'px';
      const cw = cap.offsetWidth, chh = cap.offsetHeight, pr = plan && plan.contains(anchor) ? plan.getBoundingClientRect() : null;
      let top, left;
      if (pr && vw <= 900) { left = pr.left + 10; top = pr.top + 10; cap.style.maxWidth = pr.width - 20 + 'px'; } // on a phone the plan fills the bottom and the chart strip is spoken for, so the tip sits over the plan's own heading
      else if (pr && vw > 900 && pr.left - cw - 16 > m) { left = pr.left - cw - 16; top = Math.min(vh - m - chh, Math.max(m, r.top + r.height / 2 - chh / 2)); } // beside the plan, on the chart
      else { top = r.bottom + 12; if (top + chh > vh - m) top = r.top - chh - 12; if (top < m) top = m; left = r.left; if (left + cw > vw - m) left = vw - m - cw; if (left < m) left = m; }
      cap.style.left = left + 'px'; cap.style.top = top + 'px';
    } else {
      const s = stage.getBoundingClientRect(), narrow = vw <= 900, pr = plan && !plan.hidden ? plan.getBoundingClientRect() : null;
      const tools = $('.tv-maptools'), tr = tools ? tools.getBoundingClientRect() : null;
      let bottom = Math.min(s.bottom, vh, narrow && pr ? pr.top : vh) - 12;
      if (tr && tr.height && !narrow && tr.top < bottom && tr.top > s.top) bottom = tr.top - 10; // keep off the zoom buttons
      cap.style.left = Math.max(m, s.left + 12) + 'px'; cap.style.top = bottom - cap.offsetHeight + 'px';
    }
  }
  function follow() { raf = requestAnimationFrame(() => { place(); follow(); }); }
  window.addEventListener('resize', place); window.addEventListener('scroll', place, true);

  const dest = () => (G.dest() || {}).name || 'the destination';
  const deals = G.deals ? G.deals() : 3;

  G.on('start', () => tip('Tap a bright city on the chart to add your first stop.', null, { reach: true }));
  let dealAt = 0; G.on('deal', () => { dealAt = Date.now(); });
  G.on('pick', () => tip(Date.now() - dealAt < 800 ? 'You found a secret fare. It stays cheap now. Tap an option, then Add this leg.' : 'Choose how to get there. Tap an option, then Add this leg.', $('.tv-opts')));
  G.on('select', () => { const b = $('#tv-addleg'); if (b) tip('Now tap Add this leg.', b); });
  G.on('commit', d => {
    if (d.legs === 1) tip('That is one leg. Keep going toward ' + dest() + '.', null, { reach: true, after: () => tip(deals + ' fares today are secretly cheap. You find one by looking at the city it goes to.', null, { reach: true }), ms: 3200 });
    else tip('Keep going toward ' + dest() + '.', null, { reach: true });
  });
  G.on('undo', () => tip('Leg removed. Try another way toward ' + dest() + '.', null, { reach: true }));
  G.on('arrive', () => tip('You made it. Submit when you are happy, or undo a leg to try another idea.', $('#tv-submit')));
  G.on('submit', stop); G.on('report', stop);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') stop(); });
})();
