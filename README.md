# TraversleDaily

**The daily travel strategy game.** Every UTC day, everyone on Earth gets the same start city, the same destination and the same mission: a budget, a deadline and one twist. Nothing goes there directly, and the obvious two-leg hop never fits the budget. Chain buses, trains, ferries, rideshares and flights, find the three hidden fare deals, and get closer to the planner's route than anyone else.

Live at the repo root: `index.html` (home), `play.html`, `achievements.html`, `stats.html`, `profile.html`. Static site, no build step: vanilla JS, d3 + topojson (vendored), Natural Earth topology.

## How a day is built (`js/traverse.js`)

1. **Cities and legs.** ~130 cities. For each pair, `legs()` lists every direct option (flight, train, bus, ferry, rideshare, car, bike, walk) with a cost and hours, seeded from the day so everyone sees the same prices. Flights use the day's live fare snapshot (`data/live/latest.js`, fetched by the daily routine) where available; everything else is modelled from distance and calibrated to those fares.
2. **Mission.** `mission()` searches every sensible route (a Pareto frontier of cost × hours, up to six legs) under the day's **twist** (Open road, Grounded, One ticket, Sea legs, Rail pass, Overland arrival, Mix it up). It picks an **intended route** with three or more legs that mixes transport, hides **deals** (two on that route, one decoy) so it undercuts the best two-leg hop, then sets the **budget** just above it and a **deadline** with some slack. Over 30 test days, 27 force a route of three legs or more.
3. **Score.** Money and time are measured against the best feasible routes, blended with decision speed. Ratings: Perfect, Expert, Navigator, Wayfarer, Arrived, relative to the planner's route score.
4. **Progression.** XP per official day (score, streak, rating, all deals found), levels from Backpacker to Legend, 16 achievements. Past week of puzzles replayable from the archive (`play.html?day=N`); random expeditions (`play.html?seed=…`) for unlimited practice.

## Live fares

`tools/build-live.js` averages raw SlickTrip results into `data/live/<date>.js` and `latest.js`. A daily routine fetches fares for the next day's start, hubs and destination.

## Design

The site uses the **Night Atlas** theme (`css/atlas.css`): ink navy, brass hairlines, Cormorant Garamond + Nunito Sans. The alternative **Field Journal** direction lives in `designs/journal/`. Pages are generated from shared bodies by `tools/build-designs.py`.
