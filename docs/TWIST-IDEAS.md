# Twist ideas (parked, to refine later)

A twist is a rule the route search can verify, so every day still has a guaranteed planner's route that fits the budget.
Shipped so far: Open road, Grounded (no flights), One ticket (one flight max), Sea legs (ferry required), Rail pass (two trains),
Overland arrival (no flying into the destination), Mix it up (three modes).

## Transport passes
- **Eurail Day.** Rail only. Trains cost a flat pass fare ($49 pass, $0 per leg). Pure routing puzzle. Only on days where both cities are in rail countries.
- **Interrail Flex.** The pass covers 3 train legs; everything else full price. Spend the free legs on the expensive segments.
- **Coach Pass.** Buses cheap and slow, so the deadline does the work.
- **Island Hopper.** Ferries free, flights banned. Only when start and destination are both coastal.

## Restriction days
- **Night Owl.** Legs over 6 hours are overnight and cost no deadline time (you sleep on the train).
- **Carry-on only.** Flights carry a $45 bag fee, so ground legs compete on short hops.
- **Strike day.** One mode is on strike all day (trains in one country, or all buses). The brief says which.
- **Border tax.** Every country crossing costs $15. Rewards routes that stay inside big countries.
- **No hubs.** The three biggest hub cities on the corridor are closed. Forces secondary cities.

## Objective days
- **Slow travel.** Money only, generous deadline. Cheapest wins.
- **Red eye.** Time only, generous budget. Fastest wins.
- **Carbon cap.** Each mode has a CO2 figure and the day has an emissions budget beside the money budget.
- **Scenic route.** Must pass through at least N stops.

## Discovery days
- **Flash sale.** Six deals, deeper discounts, each vanishes 20 seconds after you first see it.
- **Fog of war.** Fares hidden until you hover; suggested stops turned off. Closest to MapTap.
- **Mystery destination.** Destination shown only as a region until you reach a city within 500 km. Needs new UI.

## Weekly rhythm (shipped)
Open Road Monday · Southern Crossing Tuesday · Island Hopper Wednesday · Road Trip Thursday · Mix It Up Friday · Eurorail Saturday · Grand Tour Sunday.
Each theme fixes the twist and the part of the world (`RHYTHM` in `js/traverse.js`); new twists above could replace a weekday's rule or run as occasional specials.

## Quickest to build
Eurail Day, Interrail Flex, Night Owl, Carry-on only, Strike day: a pricing hook per twist, no new search logic.
Objective days: a small scoring change. Mystery destination: real new UI.
