/* TraversleDaily: a 30-second guided example for first-time players. Renders into #hm-howmodal.
   Six steps on a tiny atlas: start and destination, budget and deadline, add a stop, pick a ride, find a secret fare, submit. */
(function () {
  'use strict';
  const box = document.getElementById('hm-howmodal'); if (!box) return;
  const onPlay = document.body.dataset.page === 'play';
  const STEPS = [
    { k: 'A start. A destination.', t: 'Today you begin in <b>Lisbon</b> and need to reach <b>Barcelona</b>. Nothing goes there directly.' },
    { k: 'A budget. A deadline.', t: 'Stay under <b>$80</b> and arrive within <b>12 hours</b>. Both must hold, or the route doesn\'t count.' },
    { k: 'Tap a city to add a stop.', t: 'Hover or tap <b>Madrid</b>. Lit-up cities are ones you can reach from where you stand.' },
    { k: 'Pick how you get there.', t: 'Every ride trades money for time. The train is quick, the bus is cheap. Choose, then move on.' },
    { k: 'Three fares are secretly cheap.', t: 'They only show when you look at a city. Two of them sit on the route the planner had in mind.' },
    { k: 'Reach the end and submit.', t: 'Then the planner\'s route appears next to yours. One official run a day. Make it count.' },
  ];
  let i = 0, first = false;
  const svg = `<svg class="tut-map" viewBox="0 0 320 190" aria-hidden="true">
    <g class="grat">${[30, 70, 110, 150].map(y => `<line x1="0" y1="${y}" x2="320" y2="${y}"/>`).join('')}${[60, 120, 180, 240].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="190"/>`).join('')}</g>
    <path class="land" d="M18 150 C 40 95, 95 60, 150 45 C 205 32, 262 55, 300 85 C 312 110, 290 150, 250 165 C 190 185, 80 180, 18 150 Z"/>
    <path class="spoke s1" d="M52 118 L158 72"/><path class="spoke s2" d="M158 72 L268 108"/>
    <path class="route r1" pathLength="1" d="M52 118 L158 72"/><path class="route r2" pathLength="1" d="M158 72 L268 108"/>
    <g class="city dest" transform="translate(268,108)"><circle class="pulse" r="6"/><circle r="4.5"/><text x="-10" y="18" text-anchor="end">Barcelona</text></g>
    <g class="city stop" transform="translate(158,72)"><circle class="ring" r="9"/><circle r="4"/><text x="10" y="-6">Madrid</text></g>
    <g class="city start" transform="translate(52,118)"><circle r="4.5"/><text x="-8" y="18">Lisbon</text></g>
    <g class="tap" transform="translate(158,72)"><circle r="3"/></g>
  </svg>`;
  const gauges = `<div class="tut-gauges"><div><span>Budget</span><b>$80</b><i><em style="width:0"></em></i></div><div><span>Deadline</span><b>12h</b><i><em style="width:0"></em></i></div></div>`;
  const opts = `<div class="tut-opts"><div class="o train"><span>🚆</span><b>Train</b><em>$48 · 3h 10m</em></div><div class="o bus"><span>🚌</span><b>Bus</b><em>$19 · 7h 20m</em></div></div>`;
  const deal = `<div class="tut-deal"><p class="k">🎟️ Secret fare found</p><b><s>$48</s> → $21</b><small>You saved $27 · 56% off</small></div>`;
  const submit = `<div class="tut-submit"><span class="btn primary">Submit journey</span><small>$40 · 10h 30m · 2 legs</small></div>`;
  function render() {
    const s = STEPS[i];
    box.innerHTML = `<div class="td-modal-card tut" role="dialog" aria-modal="true" aria-label="How to play" data-step="${i}">
      <button class="td-modal-x" id="tut-x" aria-label="Close">✕</button>
      <p class="kicker">How to play · ${i + 1} of ${STEPS.length}</p>
      <div class="tut-stage">${svg}<div class="tut-over">${i === 1 ? gauges : i === 3 ? opts : i === 4 ? deal : i === 5 ? submit : ''}</div></div>
      <h2>${s.k}</h2><p class="tut-t">${s.t}</p>
      <div class="tut-foot">
        <div class="dots">${STEPS.map((_, j) => `<i class="${j === i ? 'on' : j < i ? 'done' : ''}"></i>`).join('')}</div>
        <div class="btns">${i > 0 ? '<button class="btn ghost" id="tut-back">Back</button>' : '<button class="btn ghost" id="tut-skip">Skip</button>'}<button class="btn primary" id="tut-next">${i < STEPS.length - 1 ? 'Next' : (onPlay ? 'Start today\'s puzzle' : 'Play today\'s puzzle')}</button></div>
      </div>
    </div>`;
    const q = s => box.querySelector(s);
    q('#tut-x').onclick = () => open(false);
    const sk = q('#tut-skip'); if (sk) sk.onclick = () => open(false);
    const bk = q('#tut-back'); if (bk) bk.onclick = () => { i--; render(); };
    q('#tut-next').onclick = () => { if (i < STEPS.length - 1) { i++; render(); } else { open(false); if (!onPlay) location.href = 'play.html'; } };
    requestAnimationFrame(() => { const c = box.querySelector('.tut'); if (c) c.classList.add('go'); });
  }
  function open(o) {
    box.hidden = !o; document.body.classList.toggle('td-modal-open', o);
    if (o) { i = 0; render(); } else { box.innerHTML = ''; try { localStorage.setItem('traverse.seen', '1'); } catch (e) {} if (location.hash === '#how') history.replaceState(null, '', location.pathname + location.search); }
  }
  window.tdTutorial = open;
  box.onclick = e => { if (e.target === box) open(false); };
  document.addEventListener('keydown', e => { if (box.hidden) return; if (e.key === 'Escape') open(false); else if (e.key === 'ArrowRight' || e.key === 'Enter') { const n = box.querySelector('#tut-next'); if (n && e.target.tagName !== 'INPUT') n.click(); } else if (e.key === 'ArrowLeft') { const b = box.querySelector('#tut-back'); if (b) b.click(); } });
})();
