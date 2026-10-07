# TraversleDaily

The daily travel strategy game. Every day at 00:00 UTC every player gets the same start city and destination and must plan the best journey across the world: cheapest, fastest, and decided quickly.

Static site, no build step:

    cd traverse-daily && python3 -m http.server   # open http://localhost:8000

## Layout
- `index.html` – the game (map, planning dashboard, result, simulated field)
- `js/traverse.js` – engine: seeded daily challenge, transport legs, Dijkstra benchmarks, hidden score
- `js/traverse-ui.js` – d3 map, on-map transport picker, dashboard, result
- `data/cities.js` – ~130 cities (coords, hub tier, coastal, rail, IATA)
- `data/live/latest.js` – today's **live flight-fare snapshot** (averaged one-way fares per route); `data/live/<date>.js` archive
- `tools/build-live.js` – turns a raw fares file into the snapshot
- `data/world.js`, `vendor/` – Natural Earth topology, d3, topojson

## Live fares
A daily routine fetches real one-way economy fares for start → hubs → destination, averages the returned itineraries per route, and commits the snapshot. Modelled legs (train, bus, ferry, car) are calibrated to the day's fares so the two agree. Rankings are simulated client-side; there is no backend.

## Competitive integrity
One official score per UTC day, locked in `localStorage` under `traverse.v1`. Later runs are labelled practice.
