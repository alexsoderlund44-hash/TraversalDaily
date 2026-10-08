---
name: content-calendar
description: Build the next 2–4 weeks of Traversle marketing from the puzzle schedule and backlog, turning each core piece into its derivatives (page, TikTok, Reel, carousel, Reddit post, email, internal links). Use at the start of each fortnight or after the weekly review.
---

# Content calendar and repurposing engine

Writes `MKT/calendar.csv` and reads `MKT/06-content-engine.md` (the repurposing map). Rules and paths: `MKT/00-system.md`.

## Steps

1. **Anchor on the game's own calendar.** For each date in the window, read the puzzle from `data/schedule.js` and its weekday theme. The weekday series (Eurorail Saturday, Island Hopper Wednesday…) are the backbone; one recurring video slot per series beats daily one-offs for one person.
2. **Pick 1–2 core pieces per week** from `MKT/07-backlog.csv` (P0/P1, status `todo`) and `MKT/content-ideas.csv` (status `approved`). A core piece is research-heavy: a puzzle deep-dive, a "how the planner thinks" breakdown, a real-travel story behind a route.
3. **Explode each core piece** using the derivative table in `06-content-engine.md`: list each derivative as its own calendar row with `parent_id`, so effort is reused, not repeated.
4. **Capacity check.** Alex is one person. Default budget: 5 hours/week marketing in days 1–30, 7 in 31–90. Sum `est_hours`; cut the lowest-priority rows until it fits. Say what was cut.
5. **Columns:** `date, slot (tiktok|reels|shorts|carousel|reddit|page|email|discord), parent_id, title, hook, asset_source, est_hours, owner, status, url, kpi`.
6. **Reddit rows** must name the subreddit and the rule that allows the post (see `MKT/05-social-system.md` community table). No Reddit row may be a bare link drop.

If Metricool is connected and Alex asks, schedule the approved video rows with `createScheduledPostForReview` (never publish directly). Otherwise output the calendar only.
