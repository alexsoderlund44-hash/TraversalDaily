---
name: weekly-marketing-review
description: Run Traversle's weekly measure-learn loop: pull GSC, analytics and social numbers (or ask Alex for the few that need pasting), log them, compare against targets, write learnings, and re-score the backlog. Use every Monday or when asked how marketing is going.
---

# Weekly marketing review

Writes `MKT/reviews/YYYY-Www.md`, appends `MKT/kpi-log.csv`, updates `MKT/content-ideas.csv` results and `MKT/07-backlog.csv`. Rules and paths: `MKT/00-system.md`; metric definitions and targets: `MKT/09-measurement.md`.

## 1. Collect (connected tools first, then ask)

| Source | How | Metrics |
|---|---|---|
| Google Search Console | MCP if connected, else Alex pastes the Performance export (Queries + Pages, last 7 days vs previous 7) into `MKT/sources/` | impressions, clicks, CTR, avg position, indexed pages |
| Site analytics (Cloudflare Web Analytics or GA4) | MCP/API if connected, else export | visitors, top referrers, landing pages |
| Game events (once instrumented) | analytics custom events | `puzzle_start`, `puzzle_complete`, `share_click`, `plus_view`, `plus_checkout` |
| TikTok / Instagram / YouTube | Metricool MCP if the accounts are linked (`getAnalyticsDataByMetrics`), else Alex pastes per-post numbers from each app's analytics | views, avg watch time / 2-second hold, completion, shares, saves, comments, profile visits, link taps, follows |
| Reddit | post URLs in calendar | upvotes, comments, referral visits from analytics |
| Email/Discord | provider dashboard | subscribers, open/click, members |

Never estimate a missing number. Record it as blank with the reason.

## 2. Analyse

- Week over week for the **north-star** (weekly players who completed a puzzle) and the three drivers in `09-measurement.md`: new visitors by channel, completion rate, D7 return rate.
- For each video: compare against the account median, not against other accounts. Tag the top and bottom performer with a one-line hypothesis why (hook, topic, length, posting time).
- For SEO: new queries with ≥10 impressions, pages whose position moved by ≥5, pages indexed vs submitted.
- Check each running experiment in `MKT/experiments.csv` against its stop rule.

## 3. Decide and write

`MKT/reviews/YYYY-Www.md` (max ~40 lines): numbers table, 3 learnings labelled FACT/INFERENCE, experiments started/stopped, next week's 3 priorities. Update confidence ratings in the backlog where the evidence changed, then run `python3 .claude/skills/marketing-priorities/score.py MKT/07-backlog.csv --write --md MKT/07-backlog.md`. Append any lasting decision to `MKT/decisions.md`.

Report to Alex in five lines: north-star change, best and worst piece, one thing to stop, one to double down on.
