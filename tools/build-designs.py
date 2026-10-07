#!/usr/bin/env python3
"""Assemble the site pages from shared page bodies + a design shell.
   The chosen design (Night Atlas) is written to the repo root; the Field Journal alternative stays in designs/journal."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = {
 'journal': 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Caveat:wght@500;700&display=swap',
 'atlas':   'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap',
}
TITLE = {'index':'TraversleDaily – The daily travel strategy game','play':'Play today – TraversleDaily','archive':'Archive – TraversleDaily','achievements':'Achievements – TraversleDaily','stats':'Stats – TraversleDaily','profile':'Profile – TraversleDaily','plus':'Traversle + – the full archive'}
NAV = [('index','Home'),('play','Play today'),('archive','Archive'),('achievements','Achievements'),('stats','Stats'),('profile','Profile'),('plus','✦ Traversle +')]
MARK = '<svg class="td-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="2" fill="currentColor"/><path d="M20 4 L23 20 L20 36 L17 20 Z" fill="currentColor" opacity=".9"/><path d="M4 20 L20 17 L36 20 L20 23 Z" fill="currentColor" opacity=".5"/></svg>'

def shell(design, page, body, scripts, prefix, css):
    nav = ''.join(f'<a href="{p}.html" class="{"on " if p==page else ""}{"plus" if p=="plus" else ""}">{n}</a>' for p,n in NAV) + '<a href="index.html#how">How to play</a>'
    canon = '<link rel="canonical" href="https://traversledaily.com/">' if (page=='index' and prefix=='') else ''
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE[page]}</title>
<meta name="description" content="TraversleDaily: one start city, one destination, every day. Beat the budget and the deadline, find the hidden deals, and out-plan the world.">
<meta property="og:title" content="{TITLE[page]}"><meta property="og:type" content="website"><meta property="og:description" content="Same start, same destination, for everyone on Earth today. Plan the smartest journey under budget and before the deadline.">
<meta name="theme-color" content="#0A1220">{canon}
<link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS[design]}" rel="stylesheet">
<link rel="stylesheet" href="{css}">
</head><body class="p-{page}" data-page="{page}">
<header class="td-head"><div class="td-wrap">
  <a class="td-brand" href="index.html" aria-label="TraversleDaily home">{MARK}<span>Traversle<b>Daily</b></span></a>
  <button class="td-burger" id="td-burger" aria-label="Menu" aria-expanded="false" aria-controls="td-menu"><span></span><span></span><span></span></button>
  <nav class="td-menu" id="td-menu" aria-label="Sections" hidden>{nav}</nav>
</div></header>
{body}
<footer class="td-foot"><div class="td-wrap"><span>TraversleDaily</span><span>Map data from Natural Earth via world-atlas. Your runs are saved in this browser.</span></div></footer>
<script src="{prefix}data/cities.js"></script>{scripts.replace('@/', prefix)}
<script>(function(){{var b=document.getElementById('td-burger'),m=document.getElementById('td-menu');function set(o){{m.hidden=!o;b.setAttribute('aria-expanded',o);b.classList.toggle('open',o);document.body.classList.toggle('td-menu-open',o);}}b.onclick=function(e){{e.stopPropagation();set(m.hidden);}};m.addEventListener('click',function(e){{if(e.target.closest('a'))set(false);}});document.addEventListener('click',function(e){{if(!m.hidden&&!m.contains(e.target))set(false);}});document.addEventListener('keydown',function(e){{if(e.key==='Escape'&&!m.hidden)set(false);}});}})();</script>
</body></html>'''

# ----- shared page bodies (design-neutral markup; themes do the rest) -----
HOME = '''
<main class="td-home-min">
  <header class="hm-head"><h1 class="hm-h1" id="hm-h1">Can you get there cheaper, faster and smarter than everyone else?</h1><p class="hm-pitch">One start city, one destination and one budget, the same for everyone on Earth today. Chain trains, buses, ferries and flights across the map, find the hidden deals, and beat the deadline before the clock runs out.</p></header>
  <section class="hm-card">
    <p class="eyebrow" id="hm-day"></p>
    <div class="route" id="hm-route"></div>
    <div class="mission" id="hm-mission"></div>
    <a class="btn primary big wide" href="play.html" id="hm-play">Play today's puzzle</a>
    <p class="sub" id="hm-sub">One official run per day</p>
    <div id="hm-level" class="hm-level" hidden></div>
    <p class="meta" id="hm-meta"></p>
  </section>
  <div class="hm-links"><button class="lnk" id="hm-how">How to play</button><a class="lnk" href="archive.html">Past puzzles</a><a class="lnk plus" href="plus.html">✦ Traversle +</a></div>
  <div class="td-modal" id="hm-howmodal" hidden><div class="td-modal-card" role="dialog" aria-modal="true" aria-label="How to play">
    <button class="td-modal-x" id="hm-how-close" aria-label="Close">✕</button>
    <p class="kicker">How to play</p>
    <h2>Same start, same destination, for everyone on Earth today.</h2>
    <ol class="how-steps">
      <li><b>Read the mission.</b> A budget, a deadline and one twist, like no flights or a ferry required. The decision clock starts when you press play.</li>
      <li><b>Add a stop.</b> Search a city or tap one on the map. You see every way to get there, priced and timed. Anything that breaks the mission is greyed out. The obvious two-leg hop never fits the budget.</li>
      <li><b>Hunt the deals.</b> Three legs are secretly discounted. Two sit on the planner's route. You only see a deal when you look at that city.</li>
      <li><b>Arrive and compare.</b> Submit and see the planner's route next to yours. Rate Perfect, Expert, Navigator or Wayfarer, earn XP, keep your streak.</li>
    </ol>
    <p class="how-score">Your score blends <b>money spent</b>, <b>travel time</b> and <b>decision time</b>, measured against the best routes that fit the mission. One official run per day; practice as much as you like.</p>
    <button class="btn primary" id="hm-how-ok">Got it</button>
  </div></div>
</main>'''
HOME_JS = '<script src="@/data/live/latest.js"></script><script src="@/js/traverse.js"></script><script src="@/js/pages.js"></script>'

PLAY = '''
<main class="tv">
  <section class="tv-stage" id="tv-stage">
    <svg id="tv-svg" viewBox="0 0 960 500" preserveAspectRatio="xMidYMid slice" aria-label="World map"></svg>
    <div class="tv-brief" id="tv-brief"></div>
    <div class="tv-maptools"><button id="tv-zin" aria-label="Zoom in">+</button><button id="tv-zout" aria-label="Zoom out">−</button><button id="tv-zfit" aria-label="Fit route" title="Fit the route">⤢</button></div>
    <div class="tv-tip" id="tv-tip" hidden></div>
    <div class="tv-gate" id="tv-gate"><div class="tv-gate-card">
      <p class="tv-gate-kicker" id="tv-gate-day"></p>
      <h1 id="tv-gate-title"></h1>
      <p class="tv-gate-sub" id="tv-gate-sub"></p>
      <div class="tv-mission" id="tv-gate-mission"></div>
      <ul class="tv-gate-rules" id="tv-gate-rules"></ul>
      <button class="btn primary big" id="tv-start">Start the clock</button>
      <p class="tv-gate-note" id="tv-gate-note"></p>
    </div></div>
  </section>
  <aside class="tv-plan" id="tv-plan" hidden>
    <header class="tv-plan-head"><div><h2>Your journey</h2><p class="tv-plan-sub" id="tv-plan-sub"></p></div><button class="tv-plan-collapse" id="tv-plan-toggle" aria-label="Collapse">▾</button></header>
    <div class="tv-gauges">
      <div class="tv-gauge" id="tv-g-cost"><span class="lab">Budget</span><b>$0</b><small></small><div class="bar"><i></i></div></div>
      <div class="tv-gauge" id="tv-g-time"><span class="lab">Deadline</span><b>0h</b><small></small><div class="bar"><i></i></div></div>
      <div class="tv-gauge clock"><span class="lab">Deciding</span><b id="tv-timer">0s</b><small id="tv-pace"></small></div>
    </div>
    <div class="tv-twist" id="tv-twist"></div>
    <div class="tv-estimate" id="tv-est" hidden><span>Score estimate</span><b>—</b><div class="bar"><i style="width:0"></i></div></div>
    <ol class="tv-stops" id="tv-stops"></ol>
    <div class="tv-picker" id="tv-picker"></div>
    <footer class="tv-plan-foot"><button class="btn ghost" id="tv-undo">Undo leg</button><button class="btn ghost" id="tv-clear">Clear</button><button class="btn primary" id="tv-submit" disabled>Submit journey</button></footer>
  </aside>
  <div class="tv-modal" id="tv-modal" hidden></div>
  <section id="tv-result" class="tv-result" hidden></section>
  <section id="tv-board" class="tv-board" hidden></section>
  <p class="tv-source" id="tv-source"></p>
</main>'''
PLAY_JS = '<script src="@/vendor/d3.min.js"></script><script src="@/vendor/topojson-client.min.js"></script><script src="@/data/world.js"></script><script src="@/data/live/latest.js"></script><script src="@/js/traverse.js"></script><script src="@/js/traverse-ui.js"></script>'

ACH = '''
<main class="td-page">
  <header class="page-head"><h1>Achievements</h1><p id="ach-summary"></p></header>
  <div class="lvl-wrap" id="ach-level"></div>
  <section class="ach-grid" id="ach-grid"></section>
</main>'''
STATS = '''
<main class="td-page">
  <header class="page-head"><h1>Your stats</h1><p>Every journey you've logged in this browser.</p></header>
  <div class="lvl-wrap" id="st-level"></div>
  <section class="stat-tiles">
    <div class="tile"><span>Days played</span><b id="st-played">0</b></div>
    <div class="tile"><span>Current streak</span><b id="st-streak">0</b></div>
    <div class="tile"><span>Best score</span><b id="st-best">—</b></div>
    <div class="tile"><span>Average score</span><b id="st-avg">—</b></div>
    <div class="tile"><span>Planner's routes found</span><b id="st-par">0</b></div>
    <div class="tile"><span>Deals found</span><b id="st-deals">0</b></div>
    <div class="tile"><span>Legs travelled</span><b id="st-legs">0</b></div>
    <div class="tile"><span>Favourite transport</span><b id="st-mode">—</b></div>
  </section>
  <section class="two">
    <div class="card"><h2>Transport mix</h2><div id="st-modes"></div><p class="muted"><span id="st-spent">$0</span> spent and <span id="st-hours">0h</span> on the move in total.</p></div>
    <div class="card"><h2>Journey log</h2><div class="tbl"><table><thead><tr><th>Day</th><th>Route</th><th>Legs</th><th class="r">Spent</th><th class="r">Time</th><th class="r">Decided</th><th class="r">Score</th></tr></thead><tbody id="st-history"></tbody></table></div></div>
  </section>
</main>'''
PROFILE = '''
<main class="td-page narrow">
  <header class="page-head"><h1>Profile</h1><p>Saved in this browser. Accounts and cloud sync are coming.</p></header>
  <section class="card profile">
    <div class="avatar" id="pf-initials">T</div>
    <div class="who"><b id="pf-display">Traveller</b><span>Travelling since <em id="pf-since">today</em></span><span class="pf-plus" id="pf-plus"></span></div>
    <div class="lvl-wrap" id="pf-level"></div>
    <div class="facts"><div><b id="pf-played">0</b><span>days played</span></div><div><b id="pf-streak">0</b><span>day streak</span></div><div><b id="pf-best">—</b><span>best score</span></div><div><b id="pf-badges">0</b><span>badges</span></div></div>
    <label class="field"><span>Display name</span><input id="pf-name" type="text" maxlength="24" placeholder="How should we call you?"></label>
    <div class="row"><button class="btn primary" id="pf-save">Save name</button><span class="saved" id="pf-saved" hidden>Saved</span></div>
  </section>
  <section class="card danger"><h2>Reset</h2><p>Reset today's puzzle to play it again from scratch, or erase every journey, badge and your name from this browser.</p><div class="row"><button class="btn ghost" id="pf-reset-today">Reset today's puzzle</button><button class="btn ghost" id="pf-reset">Erase my data</button></div></section>
</main>'''
ARCHIVE = '''
<main class="td-page">
  <header class="page-head"><h1>The archive</h1><p id="ar-summary"></p></header>
  <div class="ar-tools"><input type="search" id="ar-q" placeholder="Search a city, country or twist…" autocomplete="off"><a class="btn ghost" href="play.html">Today's puzzle</a></div>
  <div id="ar-list"></div>
  <section class="plus-strip"><div><h2>Every puzzle since day one</h2><p>The last seven days are free to replay. Traversle + opens the whole archive, forever.</p></div><a class="btn primary" href="plus.html">See Traversle +</a></section>
</main>'''
PLUS = '''
<main class="td-page narrow plus-page">
  <header class="page-head"><p class="eyebrow">✦ Traversle +</p><h1>Every expedition, <em>forever.</em></h1><p>The daily puzzle stays free. Traversle + is for the people who want more of it.</p></header>
  <div id="pl-status"></div>
  <section class="prices">
    <div class="price"><p class="k">Monthly</p><b>$2.99</b><span>per month, cancel any time</span><ul><li>The full archive, every puzzle since day one</li><li>Archive stats and ratings on your profile</li><li>Early access to new twists and modes</li></ul><a class="btn ghost" data-checkout="month" href="#">Choose monthly</a></div>
    <div class="price best"><p class="k">Lifetime · best value</p><b>$20</b><span>once, yours forever</span><ul><li>Everything in monthly, with no renewals</li><li>Founder badge on your profile</li><li>Pays for itself in seven months</li></ul><a class="btn primary" data-checkout="life" href="#">Get lifetime access</a></div>
  </section>
  <p class="pl-note" id="pl-soon" hidden>Payments open soon. Today's puzzle and the last seven days stay free in the meantime.</p>
  <section class="faq" aria-label="Questions">
    <details><summary>What stays free?</summary><p>Today's puzzle, your official score, ranking, streaks, achievements, random expeditions and the last seven days of the archive. Always.</p></details>
    <details><summary>What does Traversle + unlock?</summary><p>Every past puzzle, playable as practice with the planner's route reveal, plus archive stats and the founder badge on lifetime.</p></details>
    <details><summary>Monthly or lifetime?</summary><p>Monthly is $2.99 and cancels any time. Lifetime is $20 once and never renews, so it pays for itself in seven months.</p></details>
    <details><summary>Where is my membership stored?</summary><p>In this browser for now. Accounts with sync across devices are coming, and Plus will carry over.</p></details>
  </section>
</main>'''
PAGES_JS = '<script src="@/data/live/latest.js"></script><script src="@/js/traverse.js"></script><script src="@/js/pages.js"></script>'
PAGES = (('index',HOME,HOME_JS),('play',PLAY,PLAY_JS),('archive',ARCHIVE,PAGES_JS),('achievements',ACH,PAGES_JS),('stats',STATS,PAGES_JS),('profile',PROFILE,PAGES_JS),('plus',PLUS,PAGES_JS))

for page, body, js in PAGES:
    open(os.path.join(ROOT, page+'.html'),'w').write(shell('atlas', page, body, js, '', 'css/atlas.css'))
d = os.path.join(ROOT,'designs','journal')
if os.path.isdir(d):
    for page, body, js in PAGES:
        open(os.path.join(d,page+'.html'),'w').write(shell('journal', page, body, js, '../../', 'css/theme.css'))
print('built root (atlas) and designs/journal')
