#!/usr/bin/env python3
"""Assemble the site pages from shared page bodies + a design shell.
   The chosen design (Night Atlas) is written to the repo root; the Field Journal alternative stays in designs/journal."""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = {
 'journal': 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Caveat:wght@500;700&display=swap',
 'atlas':   'https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Alegreya:ital,wght@0,400..900;1,400..900&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;0,800;1,400;1,700&display=swap',
}
TITLE = {'index':'TraversleDaily – A new travel puzzle every day','play':"Play today's puzzle – TraversleDaily",'archive':'Archive – TraversleDaily','achievements':'Achievements – TraversleDaily','stats':'Your stats – TraversleDaily','profile':'Profile – TraversleDaily','plus':'Traversle + – Every puzzle, forever','how':'How to play – TraversleDaily'}
DESC = "A daily travel puzzle. Everyone gets the same start, destination and budget. Pick your way across trains, buses, ferries and flights, one decision at a time, and see if you can beat the planner."
LD = '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"TraversleDaily","alternateName":"Traversle Daily","url":"https://traversledaily.com/","applicationCategory":"GameApplication","operatingSystem":"Web","description":"The daily travel puzzle. One start city, one destination, one budget. Plan the smartest route across trains, buses, ferries and flights, then compare it with the planner.","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"genre":["puzzle","geography","travel"]}</script>'
NAV = [('index','Home'),('play','Play'),('how','How to play'),('archive','Archive'),('achievements','Achievements'),('stats','Stats'),('profile','Profile'),('plus','✦ Traversle +')]
MARK = '<svg class="td-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="2" fill="currentColor"/><path d="M20 4 L23 20 L20 36 L17 20 Z" fill="currentColor" opacity=".9"/><path d="M4 20 L20 17 L36 20 L20 23 Z" fill="currentColor" opacity=".5"/></svg>'

def shell(design, page, body, scripts, prefix, css):
    body = body.replace('@HOW@', HOW_MODAL)
    icons = '<div class="td-icons"><button id="td-help" aria-label="How to play" title="How to play">?</button><button id="td-stats" aria-label="Your stats" title="Your stats"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="2" y="10" width="4" height="8" fill="currentColor"/><rect x="8" y="4" width="4" height="14" fill="currentColor"/><rect x="14" y="7" width="4" height="11" fill="currentColor"/></svg></button></div>' if page == 'play' else ''
    nav = ''.join(f'<a href="{p}.html" class="{"on " if p==page else ""}{"plus" if p=="plus" else ""}">{n}</a>' for p,n in NAV)
    topnav = ''  # every page lives in the menu; nothing sits loose in the header
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
<link rel="stylesheet" href="{css}">{'<link rel="stylesheet" href="'+prefix+'css/archive.css">' if page=='archive' else ''}
</head><body class="p-{page}" data-page="{page}">
<header class="td-head"><div class="td-wrap">
  <a class="td-brand" href="index.html" aria-label="TraversleDaily home">{MARK}<span>Traversle<b>Daily</b></span></a>
  {topnav}{icons}<button class="td-burger" id="td-burger" aria-label="Menu" aria-expanded="false" aria-controls="td-menu"><span></span><span></span><span></span></button>
  <nav class="td-menu" id="td-menu" aria-label="Sections" hidden>{nav}</nav>
</div></header>
{body}
<footer class="td-foot"><div class="td-wrap"><span>© 2026 TraversleDaily. A new travel puzzle every day.</span><span>Map data from Natural Earth. Your progress is saved in this browser.</span></div></footer>
<script src="{prefix}data/cities.js"></script>{scripts.replace('@/', prefix)}
<script>(function(){{var b=document.getElementById('td-burger'),m=document.getElementById('td-menu');function set(o){{m.hidden=!o;b.setAttribute('aria-expanded',o);b.classList.toggle('open',o);document.body.classList.toggle('td-menu-open',o);}}b.onclick=function(e){{e.stopPropagation();set(m.hidden);}};m.addEventListener('click',function(e){{if(e.target.closest('a'))set(false);}});document.addEventListener('click',function(e){{if(!m.hidden&&!m.contains(e.target))set(false);}});document.addEventListener('keydown',function(e){{if(e.key==='Escape'&&!m.hidden)set(false);}});
var how=document.getElementById('hm-howmodal');if(how){{window.tdHow=function(o){{if(window.tdTutorial)return window.tdTutorial(o);how.hidden=!o;}};['hm-how','td-help'].forEach(function(id){{var el=document.getElementById(id);if(el)el.onclick=function(){{tdHow(true);}};}});window.addEventListener('hashchange',function(){{if(location.hash==='#how')tdHow(true);}});if(location.hash==='#how')tdHow(true);}}}})();</script>
</body></html>'''

HOW_MODAL = '''<div class="td-modal" id="hm-howmodal" hidden><div class="td-modal-card how" role="dialog" aria-modal="true" aria-label="How to play"><button class="td-modal-x" onclick="tdHow(false)" aria-label="Close">✕</button>
  <p class="kicker">How to play</p>
  <ol class="hm-how"><li><b>Get from A to B.</b> Every day has one start, one destination and one budget, the same for everyone.</li><li><b>Each step shows a few ways onward.</b> Every card says its fare, its time and how many decisions the rest of the trip needs. Pick one and you travel there; every pick spends a decision.</li><li><b>Reach the destination before the decisions run out.</b> Money is half the score, time 30% and decisions 20%. Stay under budget.</li></ol>
  <p class="sub">Some legs are secretly cheap. You find them by looking. <a href="how.html">The full guide</a> has the rules, the twists and a worked example.</p>
</div></div>'''

# ----- shared page bodies (design-neutral markup; themes do the rest) -----
HOME = '''
<canvas class="hm-bg" id="hm-bg" aria-hidden="true"></canvas>
<div class="hm-fade" aria-hidden="true"></div>
<main class="td-home-min hm">
  <header class="hm-hero">
    <h1 class="hm-brand" aria-label="Traversle Daily"><span class="hm-word">Traversle</span><span class="hm-stamp">Daily</span>
      <svg class="hm-trail" viewBox="0 0 420 36" aria-hidden="true"><path class="rt" d="M12 22 C 90 -2, 160 42, 240 14 S 340 30, 400 8"/><circle class="s" cx="12" cy="22" r="4.5"/><path class="d" d="M400 8 m-6 0 a6 6 0 1 1 12 0 c0 5 -6 12 -6 12 s-6 -7 -6 -12z"/></svg></h1>
    <p class="hm-tag" id="hm-h1">Same start, same destination, same budget for everyone today. Can you beat the planner?</p>
  </header>
  <section class="hm-card" aria-label="Today's expedition">
    <p class="hm-kicker" id="hm-day"></p>
    <div class="route" id="hm-route"></div>
    <p class="hm-theme" id="hm-theme" hidden></p>
    <div class="mission" id="hm-mission"></div>
    <a class="btn primary big wide" href="play.html" id="hm-play">Play today's puzzle</a>
    <p class="sub" id="hm-sub">One scored attempt a day, and everyone plays the same puzzle.</p>
    <p class="hm-new" id="hm-new" hidden>New here? <a href="how.html">How to play</a> takes two minutes, or just press Play and learn by doing.</p>
    <div id="hm-level" class="hm-level" hidden></div>
    <p class="meta" id="hm-meta"></p>
  </section>
  <a class="hm-plus" href="plus.html"><span class="mark">✦</span><span><b>Traversle +</b><small>Every puzzle since day one, with the planner's route shown. $2.99 once, no subscription.</small></span><span class="go">See it</span></a>
  @HOW@
</main>'''
HOME_JS = '<script src="@/data/live/latest.js"></script><script src="@/data/schedule.js"></script><script src="@/js/traverse.js"></script><script src="@/js/pages.js"></script><script src="@/js/chart-bg.js" defer></script>'

PLAY = '''
<main class="tv">
  <section class="tv-stage" id="tv-stage">
    <svg id="tv-chart" class="tv-chart" viewBox="0 0 960 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"></svg>
    <svg id="tv-svg" viewBox="0 0 960 500" preserveAspectRatio="xMidYMid slice" aria-label="World map"></svg>
    <div class="tv-brief" id="tv-brief"></div>
    <div class="tv-maptools"><button id="tv-zin" aria-label="Zoom in">+</button><button id="tv-zout" aria-label="Zoom out">−</button><button id="tv-zfit" aria-label="Fit route" title="Fit the route">⤢</button></div>
    <div class="tv-tip" id="tv-tip" hidden></div>
    <div class="tv-deal" id="tv-deal" hidden aria-live="polite"></div>
    <div class="tv-stamp" id="tv-stamp" hidden></div>
    <div class="tv-choices" id="tv-choices" hidden aria-live="polite"></div>
    <div class="tv-ways" id="tv-ways" hidden></div>
    <div class="tv-gate" id="tv-gate"><div class="tv-gate-card">
      <p class="tv-gate-kicker" id="tv-gate-day"></p>
      <h1 id="tv-gate-title"></h1>
      <p class="tv-gate-sub" id="tv-gate-sub"></p>
      <div class="tv-mission" id="tv-gate-mission"></div>
      <ul class="tv-gate-rules" id="tv-gate-rules"></ul>
      <button class="btn primary big" id="tv-start">Begin the journey</button>
      <p class="tv-gate-note" id="tv-gate-note"></p>
    </div></div>
  </section>
  <div class="tv-modal" id="tv-modal" hidden></div>
  <section id="tv-result" class="tv-result" hidden></section>
  <section id="tv-board" class="tv-board" hidden></section>
  <p class="tv-source" id="tv-source"></p>
  @HOW@
</main>'''
PLAY_JS = '<script src="@/vendor/d3.min.js"></script><script src="@/vendor/topojson-client.min.js"></script><script src="@/data/world.js"></script><script src="@/data/world-lite.js"></script><script src="@/data/live/latest.js"></script><script src="@/data/schedule.js"></script><script src="@/js/traverse.js"></script><script src="@/js/traverse-ui.js"></script>'

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
  <header class="page-head"><h1>Your stats</h1><p>Every journey you've played so far. It's saved in this browser.</p></header>
  <div class="lvl-wrap" id="st-level"></div>
  <section class="stat-tiles">
    <div class="tile"><span>Days played</span><b id="st-played">0</b></div>
    <div class="tile"><span>Current streak</span><b id="st-streak">0</b></div>
    <div class="tile"><span>Best streak</span><b id="st-max">0</b></div>
    <div class="tile"><span>Best score</span><b id="st-best">—</b></div>
    <div class="tile"><span>Planner's routes found</span><b id="st-par">0</b></div>
    <div class="tile"><span>Secret fares found</span><b id="st-deals">0</b></div>
    <div class="tile"><span>Legs traveled</span><b id="st-legs">0</b></div>
    <div class="tile"><span>Distance</span><b id="st-km">0 km</b></div>
    <div class="tile"><span>Countries</span><b id="st-countries">0</b></div>
    <div class="tile"><span>Average score</span><b id="st-avg">—</b></div>
    <div class="tile"><span>Favorite transport</span><b id="st-mode">—</b></div>
  </section>
  <section class="two">
    <div class="card"><h2>How you travel</h2><div id="st-modes"></div><p class="muted"><span id="st-spent">$0</span> spent and <span id="st-hours">0h</span> on the move in total.</p></div>
    <div class="card"><h2>Journey log</h2><div class="tbl"><table><thead><tr><th>Day</th><th>Route</th><th>Legs</th><th class="r">Spent</th><th class="r">Time</th><th class="r">Decided in</th><th class="r">Score</th></tr></thead><tbody id="st-history"></tbody></table></div></div>
  </section>
</main>'''
PROFILE = '''
<main class="td-page narrow">
  <header class="page-head"><h1>Profile</h1><p>Your profile lives in this browser for now. Accounts that sync across devices are coming.</p></header>
  <section class="card profile">
    <div class="avatar" id="pf-initials">T</div>
    <div class="who"><b id="pf-display">Traveler</b><span>Traveling since <em id="pf-since">today</em></span><span class="pf-plus" id="pf-plus"></span></div>
    <div class="lvl-wrap" id="pf-level"></div>
    <div class="facts">
      <div><b id="pf-streak">0</b><span>day streak</span></div><div><b id="pf-max">0</b><span>best streak</span></div>
      <div><b id="pf-best">—</b><span id="pf-best-sub">best game</span></div><div><b id="pf-avg">—</b><span>average</span></div>
      <div><b id="pf-played">0</b><span>days played</span></div><div><b id="pf-par">0</b><span>planner matches</span></div>
      <div><b id="pf-km">0</b><span>km traveled</span></div><div><b id="pf-badges">0</b><span><a href="achievements.html">badges</a></span></div>
    </div>
  </section>
  <section class="card pf-cal-card"><h2>Last 20 weeks</h2><div class="pf-cal" id="pf-cal"></div>
    <p class="pf-legend"><span><i class="t1"></i>Arrived</span><span><i class="t2"></i>Wayfarer</span><span><i class="t3"></i>Navigator</span><span><i class="t4"></i>Expert</span><span><i class="t5"></i>Perfect</span></p></section>
  <section class="card"><h2>Passport</h2><p class="muted" id="pf-pp-count"></p><div class="pf-continents" id="pf-continents"></div><div class="pf-stamps" id="pf-passport"></div></section>
  <section class="card"><h2>Name</h2>
    <label class="field"><span>Display name</span><input id="pf-name" type="text" maxlength="24" placeholder="What should we call you?"></label>
    <div class="row"><button class="btn primary" id="pf-save">Save name</button><span class="saved" id="pf-saved" hidden>Saved</span></div>
  </section>
  <section class="card danger"><h2>Reset</h2><p>Replay today from scratch, or wipe everything saved in this browser.</p><div class="row"><button class="btn ghost" id="pf-reset-today">Reset today's puzzle</button><button class="btn ghost" id="pf-reset">Erase my data</button></div></section>
</main>'''
HOW = '''
<main class="td-page narrow how-page">
  <header class="page-head"><p class="eyebrow">How to play</p><h1>One route a day. <em>Choose well.</em></h1><p>Everyone gets the same start, the same destination, the same budget and the same handful of decisions. Every step is a trade between money, time and the decisions you have left. Spend less and arrive sooner than the planner, and compare your score with everyone else's. A game takes about five minutes.</p>
    <p class="how-cta"><a class="btn primary big" href="play.html">Play today's puzzle</a></p></header>

  <section class="how-sec" id="loop"><h2>A day in three moves</h2>
    <ol class="how-steps">
      <li><span class="n">1</span><b>Look.</b><p>The chart shows where you are and lights up two or three places you can go next. Each card tells you the fare, the travel time, what it leaves of your budget and how many decisions the rest of the trip needs. A label such as Cheapest, Fastest or Detour sums it up, and a line underneath says what you save and what you give up against the other cards.</p></li>
      <li><span class="n">2</span><b>Choose.</b><p>Tap a place to pick it, then tap Travel. Every pick spends one decision, and you only have a handful. No card ever leads somewhere you could not finish from, but a card marked Risky needs every decision you have left.</p></li>
      <li><span class="n">3</span><b>Travel.</b><p>The leg draws itself across the chart and the next choices light up. Reach the destination before the decisions run out and the expedition is complete.</p></li>
    </ol>
    <p class="how-note">You never plan the whole route up front. You decide one leg at a time, and every card gives up something to get something: the cheapest leg is rarely the fastest, and the biggest step forward is rarely the cheapest. A long, cheap crawl and a short, pricey hop can both arrive; the score decides which was the better journey.</p>
  </section>

  <section class="how-sec" id="decisions"><h2>Decisions, difficulty and charted routes</h2>
    <div class="how-grid">
      <div class="how-card"><span class="ic">🧭</span><b>Decisions</b><p>Your scarcest resource. The counter shows how many are left, and every card says how many the rest of the trip needs from there. The day gives you one more than its longest charted route, and never fewer than four.</p></div>
      <div class="how-card"><span class="ic lv"><i></i><i></i><i></i></span><b>Difficulty</b><p>Each day has one, two or three charted routes that reach the destination. Three means Easy, two Medium, one Hard. You can see each one on the chart after you finish.</p></div>
      <div class="how-card"><span class="ic">🏁</span><b>Any way that arrives wins</b><p>The charted routes are the planner's answers, not the only ones. Any path that reaches the destination within your decisions is a finish.</p></div>
      <div class="how-card"><span class="ic">🛑</span><b>Out of decisions</b><p>Run out before you arrive and the expedition ends where you stand. The day still counts as played, your streak is safe, and you can try again as practice.</p></div>
    </div>
  </section>

  <section class="how-sec" id="score"><h2>Money, time, decisions and score</h2>
    <p>Three things are measured when you arrive, and each is compared with the best route that fits the day. <b>Money is half the score:</b> the cheapest route that fits sets the bar, and the closer your spending gets to it, the more of the 5,000 points you keep. <b>Time is 30%</b>, measured the same way against the fastest route. <b>Decisions are 20%</b>, against the fewest legs any route needs. Match a bar and that part is full. How fast you decide never counts.</p>
    <div class="how-grid two">
      <div class="how-card"><span class="ic">💰</span><b>The budget</b><p>Every day comes with a budget, shown on the mission strip and on every card as what it would leave you. Going over it does not end the run, but it scales the whole score down by budget ÷ spent: $50 over a $400 budget costs about 11%.</p></div>
      <div class="how-card"><span class="ic">🎟️</span><b>Secret fares</b><p>A few legs each day carry a hidden discount. You find one when it turns up among your choices, and the ticket shows the saving and what your budget would look like if you took it. Finding every secret fare of the day earns extra XP.</p></div>
      <div class="how-card"><span class="ic">🗺️</span><b>Beat the planner</b><p>The planner's route is the balanced charted route, scored by the same rule as yours. Your rating is your score against the planner's: Perfect at 97% or more, then Expert, Navigator, Wayfarer and Arrived. Score above the planner and you win the duel.</p></div>
      <div class="how-card"><span class="ic">📋</span><b>The report</b><p>When you arrive you see your rating and score, what you spent against the budget, your travel time, decisions used and secret fares found, one line on what would have scored higher, and your route leg by leg against the charted ones.</p></div>
    </div>
    <p class="how-note">Scores run from 0 to 10,000. A score, a streak day, a Perfect or Expert rating and a full set of secret fares each add XP, which carries you from Backpacker to Legend and unlocks badges.</p>
  </section>

  <section class="how-sec" id="twists"><h2>Every day has a rule</h2>
    <p>The day's rule changes the trade. Some rules remove legs outright: no flights, one flight, or no flying into the destination. Others change the fares: ferries or trains at half price, or flights at double. A repriced leg says so on its card, and the charted routes are found under the same rule.</p>
    <div class="how-twists" id="how-twists"></div>
    <h3>The week</h3>
    <p>Each weekday has its own rule and its own part of the world, so the week has a rhythm.</p>
    <ol class="how-week" id="how-week"></ol>
  </section>

  <section class="how-sec" id="example"><h2>One decision, worked through</h2>
    <p>Puzzle #8 ran from Cancún to San Francisco with six decisions and no flights. This is the first step.</p>
    <figure class="how-ex">
      <svg viewBox="0 0 560 230" role="img" aria-label="From Cancún, three choices: Houston, Mexico City and New Orleans. Houston is picked.">
        <defs><pattern id="hx-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(70,40,10,.12)" stroke-width=".6"/></pattern></defs>
        <rect width="560" height="230" fill="#E3CC96"/><rect width="560" height="230" fill="url(#hx-grid)"/>
        <path d="M120 30 C 160 70, 200 90, 250 95 S 360 110, 420 150 S 470 200, 430 230 L 560 230 L 560 0 L 120 0 Z" fill="#D9BE84" opacity=".55"/>
        <g class="spoke"><path d="M400 180 L 300 70" /><path d="M400 180 L 170 150" /><path d="M400 180 L 460 60" /></g>
        <g class="opt"><circle cx="300" cy="70" r="7"/><text x="312" y="74">Houston</text><text class="fare" x="312" y="90">$76 · 19h 10m · bus</text></g>
        <g class="opt"><circle cx="170" cy="150" r="7"/><text x="100" y="140">Mexico City</text><text class="fare" x="100" y="156">$66 · 19h 25m · bus</text></g>
        <g class="opt"><circle cx="460" cy="60" r="7"/><text x="430" y="42">New Orleans</text><text class="fare" x="430" y="58" dx="-16">$53 · 15h 40m · bus</text></g>
        <g class="cur"><circle cx="400" cy="180" r="9"/><text x="412" y="196">Cancún · you are here</text></g>
        <g class="pick"><path d="M400 180 L 300 70"/><text x="322" y="120">picked</text></g>
        <g class="dec"><rect x="14" y="14" width="150" height="34" rx="4"/><text x="26" y="36">6 decisions left</text></g>
      </svg>
      <figcaption>Houston is the biggest step forward and sits on a charted route. New Orleans is the cheapest and fastest leg, but it is a detour: it leaves five decisions and needs four more of them to finish. Pick Houston and the counter drops to five with $76 gone from the budget.</figcaption>
    </figure>
  </section>

  <section class="how-sec" id="faq"><h2>Questions</h2>
    <div class="faq">
      <details><summary>How many times can I play a day?</summary><p>Once for a score. After that, today's puzzle and the last seven days replay as practice, which is never scored. Random expeditions are practice too.</p></details>
      <details><summary>Is everyone playing the same puzzle?</summary><p>Yes. The start, the destination, the rule, the fares and the secret fares are the same for everyone on the same UTC day. That is what makes the scores comparable.</p></details>
      <details><summary>Why is the shortest route not always best?</summary><p>Money is half the score, time 30% and decisions 20%. A two-leg hop that costs more and a five-leg crawl that costs less can both arrive, and the score decides which was the better journey. Fewer legs help, but a cheap route beats a short one.</p></details>
      <details><summary>Can I get stuck?</summary><p>No. A card is only offered if the rest of the journey can still be finished from there within your decisions, and each card says how many it needs. Run the counter to zero without arriving and the expedition ends, but it never traps you a step earlier.</p></details>
      <details><summary>Do I have to follow a charted route?</summary><p>No. They are the planner's answers and they set the difficulty. Any route that arrives within your decisions is a finish, and you can see the charted ones on the chart afterward.</p></details>
      <details><summary>What happens when I run out of decisions?</summary><p>The expedition ends where you are. The day counts as played, your streak is safe, and you can try again as practice.</p></details>
      <details><summary>Where is my progress saved?</summary><p>In this browser. Scores, streaks, badges and your profile stay on this device for now.</p></details>
    </div>
    <p class="how-cta end"><a class="btn primary big" href="play.html">Play today's puzzle</a> <a class="btn ghost" href="archive.html">Past puzzles</a></p>
  </section>
</main>'''
ARCHIVE = '''
<main class="td-page">
  <header class="page-head"><h1>Archive</h1><p id="ar-summary"></p></header>
  <div class="ar-cal" id="ar-cal"></div>
  <section class="plus-strip" id="ar-plus"><div><h2>Missed a day?</h2><p>The last seven days are free to replay. Traversle + opens every puzzle since day one for one payment of $2.99.</p></div><a class="btn primary" href="plus.html">Get Traversle +</a></section>
</main>'''
PLUS = '''
<main class="td-page narrow plus-page">
  <header class="page-head"><p class="eyebrow">✦ Traversle +</p><h1>Every puzzle, <em>forever.</em></h1><p>Today's puzzle is always free. Traversle + unlocks the whole archive for one payment of $2.99. No subscription and nothing to cancel.</p></header>
  <div id="pl-status"></div>
  <section class="prices one">
    <div class="price best"><p class="k">Lifetime access</p><b>$2.99</b><span>Pay once and it's yours for good.</span><ul><li>Every puzzle since day one, with the planner's route revealed</li><li>Archive stats and ratings on your profile</li><li>Founder badge on your profile</li><li>Early access to new twists and modes</li></ul><a class="btn primary" data-checkout="life" href="#">Get Traversle +</a></div>
  </section>
  <p class="pl-note" id="pl-soon" hidden>Payments open soon. Until then, today's puzzle and the last seven days are free.</p>
  <section class="faq" aria-label="Questions">
    <details><summary>What stays free?</summary><p>Today's puzzle, your scores, streaks, stats and achievements, plus the last seven days of past puzzles. That never changes.</p></details>
    <details><summary>What does Traversle + unlock?</summary><p>Every past puzzle with the planner's route shown, archive stats on your profile, and a founder badge.</p></details>
    <details><summary>Is it a subscription?</summary><p>No. You pay $2.99 once and keep it for life. There's nothing to cancel and nothing renews.</p></details>
    <details><summary>Where is my membership stored?</summary><p>In this browser for now. When accounts arrive, your membership comes with you.</p></details>
  </section>
</main>'''
PAGES_JS = '<script src="@/data/live/latest.js"></script><script src="@/data/schedule.js"></script><script src="@/js/traverse.js"></script><script src="@/js/pages.js"></script>'
ARCHIVE_JS = PAGES_JS + '<script src="@/js/archive.js"></script>'
PAGES = (('index',HOME,HOME_JS),('play',PLAY,PLAY_JS),('how',HOW,PAGES_JS),('archive',ARCHIVE,ARCHIVE_JS),('achievements',ACH,PAGES_JS),('stats',STATS,PAGES_JS),('profile',PROFILE,PAGES_JS),('plus',PLUS,PAGES_JS))

for page, body, js in PAGES:
    open(os.path.join(ROOT, page+'.html'),'w').write(shell('atlas', page, body, js, '', 'css/atlas.css'))
d = os.path.join(ROOT,'designs','journal')
if os.path.isdir(d):
    for page, body, js in PAGES:
        open(os.path.join(d,page+'.html'),'w').write(shell('journal', page, body, js, '../../', 'css/theme.css'))
print('built root (atlas) and designs/journal')
