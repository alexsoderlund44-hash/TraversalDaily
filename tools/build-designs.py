#!/usr/bin/env python3
"""Assemble the two design directions from shared page bodies + per-design shells.
   Writes designs/<name>/*.html. Shared js/data/vendor are referenced as ../../."""
import os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = {
 'journal': 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Caveat:wght@500;700&display=swap',
 'atlas':   'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&display=swap',
}
TITLE = {'index':'TraversleDaily – The daily travel strategy game','play':'Play today – TraversleDaily','achievements':'Achievements – TraversleDaily','stats':'Stats – TraversleDaily','profile':'Profile – TraversleDaily'}
NAV = [('index','Home'),('play','Play'),('achievements','Achievements'),('stats','Stats'),('profile','Profile')]

MARK = '<svg class="td-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="20" cy="20" r="2" fill="currentColor"/><path d="M20 4 L23 20 L20 36 L17 20 Z" fill="currentColor" opacity=".9"/><path d="M4 20 L20 17 L36 20 L20 23 Z" fill="currentColor" opacity=".5"/></svg>'

def shell(design, page, body, scripts, wide=False):
    nav = ''.join(f'<a href="{p}.html"{" class=on" if p==page else ""}>{n}</a>' for p,n in NAV)
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE[page]}</title>
<meta name="description" content="TraversleDaily: one start city, one destination, every day. Chain buses, trains, rideshares, ferries and flights into the cheapest, fastest route and beat players worldwide.">
<meta property="og:title" content="{TITLE[page]}"><meta property="og:type" content="website">
<link rel="icon" href="../../favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="{FONTS[design]}" rel="stylesheet">
<link rel="stylesheet" href="css/theme.css">
</head><body class="p-{page}" data-page="{page}">
<header class="td-head"><div class="td-wrap">
  <a class="td-brand" href="index.html" aria-label="TraversleDaily home">{MARK}<span>Traversle<b>Daily</b></span></a>
  <nav class="td-nav" aria-label="Sections">{nav}</nav>
  <button class="td-burger" id="td-burger" aria-label="Menu" aria-expanded="false">☰</button>
</div></header>
{body}
<footer class="td-foot"><div class="td-wrap"><span>TraversleDaily</span><span>Map data from Natural Earth via world-atlas. Your runs are saved in this browser.</span></div></footer>
<script src="../../data/cities.js"></script>{scripts}
<script>document.getElementById('td-burger').onclick=function(){{var n=document.querySelector('.td-nav');var o=n.classList.toggle('open');this.setAttribute('aria-expanded',o);}};</script>
</body></html>'''

# ----- shared page bodies (design-neutral markup; themes do the rest) -----
HOME = '''
<main class="td-home">
  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow" id="hm-day"></p>
      <h1>Get there <em>smarter</em> than everyone else.</h1>
      <p class="lead">Every day, the whole world gets the same start city and destination. Nothing goes there directly. Chain buses, trains, rideshares, ferries and flights into the journey that spends the least, takes the least time, and is decided fastest.</p>
      <div class="ctas"><a class="btn primary big" href="play.html" id="hm-play">Play today's game</a><span class="sub" id="hm-sub">One official run per day</span></div>
    </div>
    <aside class="today" id="hm-today">
      <p class="k">Today's challenge</p>
      <div class="route" id="hm-route"></div>
      <p class="meta" id="hm-meta"></p>
    </aside>
  </section>
  <section id="how" class="steps" aria-label="How to play">
    <div class="step"><span class="n">1</span><h3>Start the clock</h3><p>Press play and the decision timer begins. Every second you spend thinking counts against you.</p></div>
    <div class="step"><span class="n">2</span><h3>Add a stop</h3><p>Search a city or tap one on the map. You'll see every way to get there from where you are, priced and timed.</p></div>
    <div class="step"><span class="n">3</span><h3>Pick how you travel</h3><p>Bus, train, rideshare, ferry, car or flight. A cheap bus then a train can beat a plane. The combination is the game.</p></div>
    <div class="step"><span class="n">4</span><h3>Arrive and submit</h3><p>Reach the destination and lock it in. Your first submission of the day is your official score.</p></div>
  </section>
  <section id="scoring" class="scoring">
    <div><h2>Three dials, one score</h2><p>Your Traversle score blends how much you spent, how long the journey takes, and how quickly you decided. Winning on one dial alone won't take you to the top.</p><p>Flight prices and times are averages of real fares for the day's cities, refreshed every morning. Land and sea legs are modelled from distance and calibrated to those fares.</p></div>
    <div class="dials"><div class="dial"><span class="ic">💰</span><b>Money spent</b><span>Every leg's price, added up.</span></div><div class="dial"><span class="ic">⏱️</span><b>Travel time</b><span>Hours on the move, including layovers.</span></div><div class="dial"><span class="ic">⚡</span><b>Decision time</b><span>Seconds from pressing play to submitting.</span></div></div>
  </section>
  <section class="faq" aria-label="Questions">
    <details><summary>When does the challenge change?</summary><p>At 00:00 UTC, the same moment for everyone.</p></details>
    <details><summary>Can I play more than once?</summary><p>Replay as practice as often as you like, but only your first submission of the day counts.</p></details>
    <details><summary>Why is there never a direct route?</summary><p>Because then there'd be nothing to plan. Every day needs at least one stop.</p></details>
    <details><summary>Where do the prices come from?</summary><p>Flights are averaged from real one-way economy fares. Trains, buses, rideshares, ferries and cars are modelled from distance and calibrated to those fares.</p></details>
  </section>
</main>'''
HOME_JS = '''<script src="../../js/traverse.js"></script>
<script>
(function(){const T=window.Traverse,ch=T.challenge(T.dayNumber());const g=i=>document.getElementById(i);
const resetIn=()=>{const ms=(T.dayNumber()*86400000+Date.UTC(2026,9,7))-Date.now();return Math.floor(ms/3600000)+'h '+Math.floor(ms%3600000/60000)+'m';};
g('hm-day').textContent='Puzzle #'+ch.n+' · '+new Date(ch.key).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
g('hm-route').innerHTML=`<span class="pin s"></span><b>${T.flagImg(ch.from,40)}<span>${T.esc(ch.from.name)}<small>${T.esc(ch.from.country)}</small></span></b><span class="ln"></span><span></span><span class="pin d"></span><b>${T.flagImg(ch.to,40)}<span>${T.esc(ch.to.name)}<small>${T.esc(ch.to.country)}</small></span></b>`;
const meta=()=>g('hm-meta').innerHTML=`<span><b>${Math.round(T.km(ch.from,ch.to)).toLocaleString()} km</b> apart</span><span>no direct route</span><span>new puzzle in <b>${resetIn()}</b></span>`;meta();setInterval(meta,30000);
let st={};try{st=JSON.parse(localStorage.getItem('traverse.v1'))||{}}catch(e){}
if(st.results&&st.results[ch.key]){g('hm-play').textContent='See your result';g('hm-sub').textContent='You scored '+st.results[ch.key].score.toLocaleString()+' today';}
})();</script>'''

PLAY = '''
<main class="tv">
  <section class="tv-stage" id="tv-stage">
    <svg id="tv-svg" viewBox="0 0 960 500" preserveAspectRatio="xMidYMid slice" aria-label="World map"></svg>
    <div class="tv-brief" id="tv-brief"></div>
    <div class="tv-maptools"><button id="tv-zin" aria-label="Zoom in">+</button><button id="tv-zout" aria-label="Zoom out">−</button><button id="tv-zfit" aria-label="Fit route" title="Fit the route">⤢</button></div>
    <div class="tv-tip" id="tv-tip" hidden></div>
    <div class="tv-gate" id="tv-gate"><div class="tv-gate-card">
      <p class="tv-gate-kicker">Puzzle <span id="tv-gate-day"></span></p>
      <h1 id="tv-gate-title"></h1>
      <p class="tv-gate-sub" id="tv-gate-sub"></p>
      <ul class="tv-gate-rules"><li>Add stops one at a time, then pick how you travel each leg.</li><li>Flights use today's real average fares. Land and sea legs are modelled and calibrated to them.</li><li>Money, hours and how fast you decide all count. One official run per day.</li></ul>
      <button class="btn primary big" id="tv-start">Start the clock</button>
      <p class="tv-gate-note" id="tv-gate-note"></p>
    </div></div>
  </section>
  <aside class="tv-plan" id="tv-plan" hidden>
    <header class="tv-plan-head"><div><h2>Your journey</h2><p class="tv-plan-sub" id="tv-plan-sub"></p></div><button class="tv-plan-collapse" id="tv-plan-toggle" aria-label="Collapse">▾</button></header>
    <div class="tv-totals">
      <div class="tv-total"><span class="lab">Spent</span><b id="tv-cost">$0</b><i id="tv-cost-vs"></i></div>
      <div class="tv-total"><span class="lab">Travel</span><b id="tv-time">0h</b><i id="tv-time-vs"></i></div>
      <div class="tv-total"><span class="lab">Deciding</span><b id="tv-timer">0s</b><i></i></div>
    </div>
    <div class="tv-estimate" id="tv-est"><span>Score estimate</span><b>—</b><div class="bar"><i style="width:0"></i></div></div>
    <ol class="tv-stops" id="tv-stops"></ol>
    <div class="tv-picker" id="tv-picker"></div>
    <div class="tv-split" id="tv-split"></div>
    <footer class="tv-plan-foot"><button class="btn ghost" id="tv-undo">Undo leg</button><button class="btn ghost" id="tv-clear">Clear</button><button class="btn primary" id="tv-submit" disabled>Submit journey</button></footer>
  </aside>
  <section id="tv-result" class="tv-result" hidden></section>
  <section id="tv-board" class="tv-board" hidden></section>
  <p class="tv-source" id="tv-source"></p>
</main>'''
PLAY_JS = '''<script src="../../vendor/d3.min.js"></script><script src="../../vendor/topojson-client.min.js"></script><script src="../../data/world.js"></script><script src="../../data/live/latest.js"></script><script src="../../js/traverse.js"></script><script src="../../js/traverse-ui.js"></script>'''

ACH = '''
<main class="td-page">
  <header class="page-head"><h1>Achievements</h1><p id="ach-summary"></p></header>
  <section class="ach-grid" id="ach-grid"></section>
</main>'''
STATS = '''
<main class="td-page">
  <header class="page-head"><h1>Your stats</h1><p>Every journey you've logged in this browser.</p></header>
  <section class="stat-tiles">
    <div class="tile"><span>Days played</span><b id="st-played">0</b></div>
    <div class="tile"><span>Current streak</span><b id="st-streak">0</b></div>
    <div class="tile"><span>Best score</span><b id="st-best">—</b></div>
    <div class="tile"><span>Average score</span><b id="st-avg">—</b></div>
    <div class="tile"><span>Legs travelled</span><b id="st-legs">0</b></div>
    <div class="tile"><span>Total spent</span><b id="st-spent">$0</b></div>
    <div class="tile"><span>Hours on the move</span><b id="st-hours">0h</b></div>
    <div class="tile"><span>Favourite transport</span><b id="st-mode">—</b></div>
  </section>
  <section class="two">
    <div class="card"><h2>Transport mix</h2><div id="st-modes"></div></div>
    <div class="card"><h2>Journey log</h2><div class="tbl"><table><thead><tr><th>Day</th><th>Route</th><th>Legs</th><th class="r">Spent</th><th class="r">Time</th><th class="r">Decided</th><th class="r">Score</th></tr></thead><tbody id="st-history"></tbody></table></div></div>
  </section>
</main>'''
PROFILE = '''
<main class="td-page narrow">
  <header class="page-head"><h1>Profile</h1><p>Saved in this browser. Accounts and cloud sync are coming.</p></header>
  <section class="card profile">
    <div class="avatar" id="pf-initials">T</div>
    <div class="who"><b id="pf-display">Traveller</b><span>Travelling since <em id="pf-since">today</em></span></div>
    <div class="facts"><div><b id="pf-played">0</b><span>days played</span></div><div><b id="pf-streak">0</b><span>day streak</span></div><div><b id="pf-best">—</b><span>best score</span></div><div><b id="pf-badges">0</b><span>badges</span></div></div>
    <label class="field"><span>Display name</span><input id="pf-name" type="text" maxlength="24" placeholder="How should we call you?"></label>
    <div class="row"><button class="btn primary" id="pf-save">Save name</button><span class="saved" id="pf-saved" hidden>Saved</span></div>
  </section>
  <section class="card danger"><h2>Reset</h2><p>Erase every journey, badge and your name from this browser.</p><button class="btn ghost" id="pf-reset">Erase my data</button></section>
</main>'''
PAGES_JS = '<script src="../../js/traverse.js"></script><script src="../../js/pages.js"></script>'

for design in ('journal','atlas'):
    d = os.path.join(ROOT,'designs',design); os.makedirs(os.path.join(d,'css'),exist_ok=True)
    for page, body, js in (('index',HOME,HOME_JS),('play',PLAY,PLAY_JS),('achievements',ACH,PAGES_JS),('stats',STATS,PAGES_JS),('profile',PROFILE,PAGES_JS)):
        open(os.path.join(d,page+'.html'),'w').write(shell(design,page,body,js))
print('built pages for journal and atlas')
