#!/usr/bin/env python3
"""Assemble the site pages from shared page bodies + a design shell.
   The chosen design (Night Atlas) is written to the repo root; the Field Journal alternative stays in designs/journal."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = {
 'journal': 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Caveat:wght@500;700&display=swap',
 'atlas':   'https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;0,800;1,400;1,700&display=swap',
}
TITLE = {'index':'TraversleDaily – A new travel puzzle every day','play':"Play today's puzzle – TraversleDaily",'archive':'Past puzzles – TraversleDaily','achievements':'Achievements – TraversleDaily','stats':'Your stats – TraversleDaily','profile':'Profile – TraversleDaily','plus':'Traversle + – every puzzle, forever'}
DESC = "The daily travel puzzle. One start city, one destination, one budget. Chain trains, buses, ferries and flights, beat the deadline, and out-plan the world."
LD = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"TraversleDaily","alternateName":"Traversle Daily","url":"https://traversledaily.com/","applicationCategory":"GameApplication","operatingSystem":"Web","description":"The daily travel puzzle. One start city, one destination, one budget. Plan the smartest route across trains, buses, ferries and flights, then compare it with the planner.","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"genre":["puzzle","geography","travel"]}</script>'
NAV = [('index','Home'),('archive','Archive'),('achievements','Achievements'),('stats','Stats'),('profile','Profile'),('plus','✦ Traversle +')]
MARK = '<svg class="td-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="2" fill="currentColor"/><path d="M20 4 L23 20 L20 36 L17 20 Z" fill="currentColor" opacity=".9"/><path d="M4 20 L20 17 L36 20 L20 23 Z" fill="currentColor" opacity=".5"/></svg>'

def shell(design, page, body, scripts, prefix, css):
    body = body.replace('@HOW@', HOW_MODAL)
    icons = '<div class="td-icons"><button id="td-help" aria-label="How to play" title="How to play">?</button><button id="td-stats" aria-label="Your stats" title="Your stats"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2" y="10" width="4" height="8" fill="currentColor"/><rect x="8" y="4" width="4" height="14" fill="currentColor"/><rect x="14" y="7" width="4" height="11" fill="currentColor"/></svg></button></div>' if page == 'play' else ''
    nav = ''.join(f'<a href="{p}.html" class="{"on " if p==page else ""}{"plus" if p=="plus" else ""}">{n}</a>' for p,n in NAV) + '<a href="index.html#how">How to play</a>'
    canon = '<link rel="canonical" href="https://traversledaily.com/">' if (page=='index' and prefix=='') else ''
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE[page]}</title>
<meta name="description" content="{DESC}">
<meta property="og:title" content="{TITLE[page]}"><meta property="og:type" content="website"><meta property="og:site_name" content="TraversleDaily"><meta property="og:description" content="{DESC}"><meta property="og:image" content="https://traversledaily.com/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="TraversleDaily: a route drawn across a map of Europe"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="https://traversledaily.com/og.png">
<meta name="theme-color" content="{'#E8D9B5' if design=='atlas' else '#0A1220'}">{canon}{LD if page=='index' else ''}
<link rel="icon" href="{prefix}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS[design]}" rel="stylesheet">
<link rel="stylesheet" href="{css}">
</head><body class="p-{page}" data-page="{page}">
<header class="td-head"><div class="td-wrap">
  <a class="td-brand" href="index.html" aria-label="TraversleDaily home">{MARK}<span>Traversle<b>Daily</b></span></a>
  {icons}<button class="td-burger" id="td-burger" aria-label="Menu" aria-expanded="false" aria-controls="td-menu"><span></span><span></span><span></span></button>
  <nav class="td-menu" id="td-menu" aria-label="Sections" hidden>{nav}</nav>
</div></header>
{body}
<footer class="td-foot"><div class="td-wrap"><span>TraversleDaily · a new travel puzzle every day</span><span>Map data: Natural Earth. Your runs stay in this browser.</span></div></footer>
<script src="{prefix}data/cities.js"></script>{scripts.replace('@/', prefix)}
<script>(function(){{var b=document.getElementById('td-burger'),m=document.getElementById('td-menu');function set(o){{m.hidden=!o;b.setAttribute('aria-expanded',o);b.classList.toggle('open',o);document.body.classList.toggle('td-menu-open',o);}}b.onclick=function(e){{e.stopPropagation();set(m.hidden);}};m.addEventListener('click',function(e){{if(e.target.closest('a'))set(false);}});document.addEventListener('click',function(e){{if(!m.hidden&&!m.contains(e.target))set(false);}});document.addEventListener('keydown',function(e){{if(e.key==='Escape'&&!m.hidden)set(false);}});
var how=document.getElementById('hm-howmodal');if(how){{window.tdHow=function(o){{if(window.tdTutorial)return window.tdTutorial(o);how.hidden=!o;}};['hm-how','td-help'].forEach(function(id){{var el=document.getElementById(id);if(el)el.onclick=function(){{tdHow(true);}};}});window.addEventListener('hashchange',function(){{if(location.hash==='#how')tdHow(true);}});if(location.hash==='#how')tdHow(true);}}}})();</script>
</body></html>'''

HOW_MODAL = '''<div class="td-modal" id="hm-howmodal" hidden></div>'''

# ----- shared page bodies (design-neutral markup; themes do the rest) -----
HOME = '''
<canvas class="hm-bg" id="hm-bg" aria-hidden="true"></canvas>
<main class="td-home-min hm">
  <header class="hm-hero">
    <h1 class="hm-brand" aria-label="Traversle Daily"><span class="hm-word">Traversle</span><span class="hm-stamp">Daily</span>
      <svg class="hm-trail" viewBox="0 0 420 44" aria-hidden="true"><path class="rt" d="M10 32 C 80 -6, 150 54, 230 16 S 350 30, 396 10"/><circle class="s" cx="10" cy="32" r="4.5"/><path class="d" d="M396 10 m-6 0 a6 6 0 1 1 12 0 c0 5 -6 12 -6 12 s-6 -7 -6 -12z"/></svg></h1>
    <p class="hm-tag" id="hm-h1">One start. One destination. One budget. Out-plan the planner.</p>
  </header>
  <section class="hm-card" aria-label="Today's expedition">
    <p class="hm-kicker" id="hm-day"></p>
    <div class="route" id="hm-route"></div>
    <p class="hm-theme" id="hm-theme" hidden></p>
    <div class="mission" id="hm-mission"></div>
    <a class="btn primary big wide" href="play.html" id="hm-play">Begin the journey</a>
    <p class="sub" id="hm-sub">You get one attempt. Make it count.</p>
    <div id="hm-level" class="hm-level" hidden></div>
    <p class="meta" id="hm-meta"></p>
  </section>
  <section class="hm-panels">
    <article class="hm-panel" id="how"><h2>How to play</h2>
      <ol class="hm-how"><li><b>Tap a city</b> on the chart to add a stop, then choose train, bus, ferry, car or plane.</li><li><b>Reach the destination</b> under budget and before the deadline. Hidden deals cut the cost.</li><li><b>Beat the planner.</b> Money, time and how fast you decide all count towards your score.</li></ol>
      <button class="lnk" id="hm-how">Walk me through it</button></article>
    <article class="hm-panel hm-week" aria-label="The week"><h2>Every day has its own rule</h2><ol id="hm-week"></ol></article>
    <article class="hm-panel hm-plus"><h2>Traversle +</h2><p>Today's puzzle is free, always. Traversle + opens every past puzzle since day one, with the planner's route revealed, plus archive stats on your profile.</p><a class="btn" href="plus.html">See Traversle +</a><a class="lnk" href="archive.html">Browse past puzzles</a></article>
  </section>
  @HOW@
</main>'''
HOME_JS = '<script src="@/data/live/latest.js"></script><script src="@/data/schedule.js"></script><script src="@/js/traverse.js"></script><script src="@/js/tutorial.js"></script><script src="@/js/pages.js"></script><script src="@/js/chart-bg.js" defer></script>'

PLAY = '''
<main class="tv">
  <section class="tv-stage" id="tv-stage">
    <svg id="tv-svg" viewBox="0 0 960 500" preserveAspectRatio="xMidYMid slice" aria-label="World map"></svg>
    <div class="tv-brief" id="tv-brief"></div>
    <div class="tv-maptools"><button id="tv-zin" aria-label="Zoom in">+</button><button id="tv-zout" aria-label="Zoom out">−</button><button id="tv-zfit" aria-label="Fit route" title="Fit the route">⤢</button></div>
    <div class="tv-tip" id="tv-tip" hidden></div>
    <div class="tv-deal" id="tv-deal" hidden></div>
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
    <div class="tv-counts" id="tv-counts"></div>
    <div class="tv-estimate" id="tv-est" hidden><span>Score estimate</span><b>—</b><div class="bar"><i style="width:0"></i></div></div>
    <ol class="tv-stops" id="tv-stops"></ol>
    <div class="tv-picker" id="tv-picker"></div>
    <footer class="tv-plan-foot"><button class="btn ghost" id="tv-undo" title="Remove the last leg">Undo</button><button class="btn ghost" id="tv-hint" title="Reveal a hidden deal. Adds 45 seconds to your clock.">Hint</button><button class="btn primary" id="tv-submit" disabled>Submit journey</button></footer>
  </aside>
  <div class="tv-modal" id="tv-modal" hidden></div>
  <section id="tv-result" class="tv-result" hidden></section>
  <section id="tv-board" class="tv-board" hidden></section>
  <p class="tv-source" id="tv-source"></p>
  @HOW@
</main>'''
PLAY_JS = '<script src="@/vendor/d3.min.js"></script><script src="@/vendor/topojson-client.min.js"></script><script src="@/data/world.js"></script><script src="@/data/live/latest.js"></script><script src="@/data/schedule.js"></script><script src="@/js/traverse.js"></script><script src="@/js/tutorial.js"></script><script src="@/js/traverse-ui.js"></script>'

ACH = '''
<main class="td-page">
  <header class="page-head"><h1>Achievements</h1><p id="ach-summary"></p></header>
  <div class="lvl-wrap" id="ach-level"></div>
  <section class="ach-grid" id="ach-grid"></section>
  <h2 class="ach-h">Secret badges</h2>
  <section class="ach-grid" id="ach-secret"></section>
</main>'''
STATS = '''
<main class="td-page">
  <header class="page-head"><h1>Your stats</h1><p>Every journey you've logged, saved in this browser.</p></header>
  <div class="lvl-wrap" id="st-level"></div>
  <section class="stat-tiles">
    <div class="tile"><span>Days played</span><b id="st-played">0</b></div>
    <div class="tile"><span>Current streak</span><b id="st-streak">0</b></div>
    <div class="tile"><span>Best streak</span><b id="st-max">0</b></div>
    <div class="tile"><span>Best score</span><b id="st-best">—</b></div>
    <div class="tile"><span>Planner's routes found</span><b id="st-par">0</b></div>
    <div class="tile"><span>Deals found</span><b id="st-deals">0</b></div>
    <div class="tile"><span>Legs travelled</span><b id="st-legs">0</b></div>
    <div class="tile"><span>Distance</span><b id="st-km">0 km</b></div>
    <div class="tile"><span>Countries</span><b id="st-countries">0</b></div>
    <div class="tile"><span>Average score</span><b id="st-avg">—</b></div>
    <div class="tile"><span>Favourite transport</span><b id="st-mode">—</b></div>
  </section>
  <section class="two">
    <div class="card"><h2>How you travel</h2><div id="st-modes"></div><p class="muted"><span id="st-spent">$0</span> spent and <span id="st-hours">0h</span> on the move in total.</p></div>
    <div class="card"><h2>Journey log</h2><div class="tbl"><table><thead><tr><th>Day</th><th>Route</th><th>Legs</th><th class="r">Spent</th><th class="r">Time</th><th class="r">Decided</th><th class="r">Score</th></tr></thead><tbody id="st-history"></tbody></table></div></div>
  </section>
</main>'''
PROFILE = '''
<main class="td-page narrow">
  <header class="page-head"><h1>Profile</h1><p>Saved in this browser. Accounts that sync across devices are coming.</p></header>
  <section class="card profile">
    <div class="avatar" id="pf-initials">T</div>
    <div class="who"><b id="pf-display">Traveller</b><span>Travelling since <em id="pf-since">today</em></span><span class="pf-plus" id="pf-plus"></span></div>
    <div class="lvl-wrap" id="pf-level"></div>
    <div class="facts">
      <div><b id="pf-streak">0</b><span>day streak</span></div><div><b id="pf-max">0</b><span>best streak</span></div>
      <div><b id="pf-best">—</b><span id="pf-best-sub">best game</span></div><div><b id="pf-avg">—</b><span>average</span></div>
      <div><b id="pf-played">0</b><span>days played</span></div><div><b id="pf-par">0</b><span>planner matches</span></div>
      <div><b id="pf-km">0</b><span>km travelled</span></div><div><b id="pf-badges">0</b><span><a href="achievements.html">badges</a></span></div>
    </div>
  </section>
  <section class="card pf-cal-card"><h2>Last 20 weeks</h2><div class="pf-cal" id="pf-cal"></div>
    <p class="pf-legend"><span><i class="t1"></i>Arrived</span><span><i class="t2"></i>Wayfarer</span><span><i class="t3"></i>Navigator</span><span><i class="t4"></i>Expert</span><span><i class="t5"></i>Perfect</span></p></section>
  <section class="card"><h2>Passport</h2><p class="muted" id="pf-pp-count"></p><div class="pf-continents" id="pf-continents"></div><div class="pf-stamps" id="pf-passport"></div></section>
  <section class="card"><h2>Name</h2>
    <label class="field"><span>Display name</span><input id="pf-name" type="text" maxlength="24" placeholder="How should we call you?"></label>
    <div class="row"><button class="btn primary" id="pf-save">Save name</button><span class="saved" id="pf-saved" hidden>Saved</span></div>
  </section>
  <section class="card danger"><h2>Reset</h2><p>Replay today from scratch, or wipe everything saved in this browser.</p><div class="row"><button class="btn ghost" id="pf-reset-today">Reset today's puzzle</button><button class="btn ghost" id="pf-reset">Erase my data</button></div></section>
</main>'''
ARCHIVE = '''
<main class="td-page">
  <header class="page-head"><h1>Past puzzles</h1><p id="ar-summary"></p></header>
  <div class="ar-tools"><input type="search" id="ar-q" placeholder="Search a city, country or twist…" autocomplete="off"><a class="btn ghost" href="play.html">Today's puzzle</a></div>
  <div id="ar-list"></div>
  <section class="plus-strip"><div><h2>Missed a day?</h2><p>Replay the last seven free. Traversle + opens every puzzle since day one.</p></div><a class="btn primary" href="plus.html">See Traversle +</a></section>
</main>'''
PLUS = '''
<main class="td-page narrow plus-page">
  <header class="page-head"><p class="eyebrow">✦ Traversle +</p><h1>Every puzzle, <em>forever.</em></h1><p>Today's puzzle is free, always. Traversle + is the whole archive.</p></header>
  <div id="pl-status"></div>
  <section class="prices">
    <div class="price"><p class="k">Monthly</p><b>$2.99</b><span>per month, cancel any time</span><ul><li>Every puzzle since day one</li><li>Archive stats and ratings on your profile</li><li>Early access to new twists and modes</li></ul><a class="btn ghost" data-checkout="month" href="#">Choose monthly</a></div>
    <div class="price best"><p class="k">Lifetime · best value</p><b>$20</b><span>once, yours forever</span><ul><li>Everything in monthly, no renewals</li><li>Founder badge on your profile</li><li>Pays for itself in seven months</li></ul><a class="btn primary" data-checkout="life" href="#">Get lifetime access</a></div>
  </section>
  <p class="pl-note" id="pl-soon" hidden>Payments open soon. Until then, today's puzzle and the last seven days are free.</p>
  <section class="faq" aria-label="Questions">
    <details><summary>What stays free?</summary><p>Today's puzzle, your score, streaks, stats and achievements. The last seven days of past puzzles too. Always.</p></details>
    <details><summary>What does Traversle + unlock?</summary><p>Every past puzzle, with the planner's route reveal. Archive stats on your profile. The founder badge on lifetime.</p></details>
    <details><summary>Monthly or lifetime?</summary><p>Monthly is $2.99, cancel any time. Lifetime is $20 once and never renews. It pays for itself in seven months.</p></details>
    <details><summary>Where is my membership stored?</summary><p>In this browser for now. Accounts that sync across devices are coming, and your membership carries over.</p></details>
  </section>
</main>'''
PAGES_JS = '<script src="@/data/live/latest.js"></script><script src="@/data/schedule.js"></script><script src="@/js/traverse.js"></script><script src="@/js/pages.js"></script>'
PAGES = (('index',HOME,HOME_JS),('play',PLAY,PLAY_JS),('archive',ARCHIVE,PAGES_JS),('achievements',ACH,PAGES_JS),('stats',STATS,PAGES_JS),('profile',PROFILE,PAGES_JS),('plus',PLUS,PAGES_JS))

for page, body, js in PAGES:
    open(os.path.join(ROOT, page+'.html'),'w').write(shell('atlas', page, body, js, '', 'css/atlas.css'))
d = os.path.join(ROOT,'designs','journal')
if os.path.isdir(d):
    for page, body, js in PAGES:
        open(os.path.join(d,page+'.html'),'w').write(shell('journal', page, body, js, '../../', 'css/theme.css'))
print('built root (atlas) and designs/journal')
