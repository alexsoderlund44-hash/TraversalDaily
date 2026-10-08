# TraversleDaily — project brief (for reviewers)

**What it is.** A daily travel puzzle with an old-chart, Oregon-Trail-flavoured look (the Expedition Chart theme). Each calendar day everyone gets the same start city, destination, budget, deadline and one twist. Nothing goes there directly and the obvious two-leg hop never fits the budget. You chain trains, buses, ferries, rideshares, cars and flights across a world map, hunt three hidden fare deals, and submit one official run. Then the planner's route (the best balance of money and time that fits the mission) is revealed next to yours.

**Scoring.** Money spent and travel time measured against the best feasible routes, blended with decision speed (seconds from start to submit). 0–10,000. Ratings relative to the planner's score: Perfect, Expert, Navigator, Wayfarer, Arrived. XP and eight levels. Three undos and two hints (+45 s each) per run. Streaks and best streak, 18 tiered achievements plus 5 secret ones, a profile with best game, calendar and a passport of countries visited, personal stats pop-up with a rating distribution, emoji share text.

**Business.** Daily puzzle free. Traversle + ($20 one-time, no subscription for now) unlocks the full archive beyond the free last seven days. Payments not wired yet.

**Tech.** Static site, no build step: vanilla JS, d3 + topojson (vendored), Natural Earth topology, ~130 cities. Deterministic seeded generation per day (`js/traverse.js`): a Pareto route search picks an intended 3+ leg mixed-mode route, hides deals on it so it undercuts the two-leg hop, then sets the budget just above it. Flights use a daily live-fare snapshot (SlickTrip) when present; ground and sea legs are modelled from distance and calibrated to those fares. No rankings until a backend exists; results are compared with the planner's score instead. Weekday twists and a pre-checked two-year schedule (`data/schedule.js`, `tools/build-schedule.js`). Pages are generated from `tools/build-designs.py`. Play UI in `js/traverse-ui.js`, tabs in `js/pages.js`, theme in `css/atlas.css`.

**Known gaps.** No backend (real leaderboard, accounts, payments). Link preview image is og.png (rebuild with `node tools/build-og.js` from tools/og.html).

**Questions worth a second opinion.** Is the mission (budget + deadline + twist + deals) too much to read before playing? Is "one attempt, three undos, two hints" the right pressure? Does the planner's route reveal feel fair? What would make the share text spread?
