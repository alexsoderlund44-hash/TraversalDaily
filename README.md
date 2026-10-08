# TraversleDaily

**The daily travel strategy game.** Every UTC day, everyone on Earth gets the same start city, the same destination and the same mission: a budget, a deadline and one twist. Nothing goes there directly, and the obvious two-leg hop never fits the budget. Chain buses, trains, ferries, rideshares and flights, find the three hidden fare deals, and get closer to the planner's route than anyone else.

Live at the repo root: `index.html` (home), `play.html`, `achievements.html`, `stats.html`, `profile.html`. Static site, no build step: vanilla JS, d3 + topojson (vendored), Natural Earth topology.

## How a day is built (`js/traverse.js`)

1. **Cities and legs.** ~130 cities. For each pair, `legs()` lists every direct option (flight, train, bus, ferry, rideshare, car, bike, walk) with a cost and hours, seeded from the day so everyone sees the same prices. Flights use the day's live fare snapshot (`data/live/latest.js`, fetched by the daily routine) where available; everything else is modelled from distance and calibrated to those fares.
2. **Mission.** `mission()` searches every sensible route (a Pareto frontier of cost × hours, up to six legs) under the day's **twist** (Open road, Grounded, One ticket, Sea legs, Rail pass, Overland arrival, Mix it up). It picks an **intended route** with three or more legs that mixes transport, hides **deals** (two on that route, one decoy) so it undercuts the best two-leg hop, then sets the **budget** just above it and a **deadline** with some slack. Over 30 test days, 27 force a route of three legs or more.
3. **Score.** Money and time are measured against the best feasible routes, blended with decision speed. Ratings: Perfect, Expert, Navigator, Wayfarer, Arrived, relative to the planner's route score.
4. **Progression.** XP per official day (score, streak, rating, all deals found), levels from Backpacker to Legend, 18 tiered achievements (bronze, silver, gold) plus 5 secret ones. Past week of puzzles replayable from the archive (`play.html?day=N`); random expeditions (`play.html?seed=…`) for unlimited practice.

## The daily schedule

Each weekday is a named theme with its own twist and part of the world (`RHYTHM` in `js/traverse.js`): Open Road Monday (anywhere, no rule), Southern Crossing Tuesday (South America or Africa, Overland arrival), Island Hopper Wednesday (coastal cities, Sea legs), Road Trip Thursday (the Americas, Grounded), Mix It Up Friday (Asia, three modes), Eurorail Saturday (Europe, Rail pass) and Grand Tour Sunday (2,600 km or more, One ticket). `data/schedule.js` holds the start, destination, twist and, for hand-made days, a title and blurb for each day (the first week is hand-made in `HANDMADE` inside the tool), written by `node tools/build-schedule.js [days]` (default 730). It keeps a city pair only if the planner's route has three or more legs, the weekday's twist survives the mission search and at least three routes fit; otherwise it tries the next pair for that day. Re-run it after changing `EPOCH`, the cities or the twists. Days past the end of the file fall back to the same generator, unchecked.

Day #1 is 1 Oct 2026 and launch day (7 Oct) is puzzle #7, so the archive opens with a week of puzzles.

## Player profile and stats

`Traverse.stats(results)` is the single source for the profile, stats page, stats pop-up and achievements: streak and best streak, best game, average, planner matches, distance travelled, and a passport of the countries and continents your routes passed through. The profile adds a 20-week calendar coloured by rating.

## TraversleDaily Plus (paid archive)

The last 7 puzzles are free to replay. Older ones are locked behind Plus (`plus.html`, `archive.html`): $2.99 a month or $20 once for lifetime. Membership is read from `localStorage` under `traverse.plus` (`{active:true, plan:'month'|'life', since}`); nothing in the site writes it yet, so the plan buttons show a "payments open soon" note.

To take real payments on a static site: create Stripe Payment Links for the two prices, put the URLs in the two `data-checkout` buttons in `tools/build-designs.py` (PLUS body), and have each link redirect to `plus.html?session_id={CHECKOUT_SESSION_ID}`. A small serverless function (Cloudflare Worker or Vercel function) verifies the session with your Stripe secret key and the page then stores the membership. Accounts with sync are the longer-term answer, so a purchase follows the player across devices.

Testing: Profile → "Reset today's puzzle" (or `play.html?reset=1`) erases today's official run so it can be played again.

## Live fares

`tools/build-live.js` averages raw SlickTrip results into `data/live/<date>.js` and `latest.js`. A daily routine fetches fares for the next day's start, hubs and destination.

## Design

The site uses the **Expedition Chart** theme (`css/atlas.css`): parchment paper, sepia ink, ox-blood route marks, Alfa Slab One + Alegreya + Alegreya Sans. The home page draws an old chart of today's region onto a canvas (`js/chart-bg.js`, loads d3 and the world topology lazily) and drifts it slowly; pressing start on the play page swoops the chart in on the day's region before the clock runs. The earlier **Field Journal** direction lives in `designs/journal/` (its home page markup is now out of date). Pages are generated from shared bodies by `tools/build-designs.py`; the link preview image comes from `tools/og.html` via `node tools/build-og.js`.
