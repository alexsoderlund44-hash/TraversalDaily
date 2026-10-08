---
name: marketing-priorities
description: Add, rate and re-rank Traversle's marketing backlog with a fixed scoring rubric (impact, confidence, fit, compounding vs effort, time, cost) and return the highest-leverage next actions. Use when deciding what to do next or after new evidence arrives.
---

# Marketing priorities

The backlog is `MKT/07-backlog.csv` (paths and rules: `MKT/00-system.md`). `score.py` in this folder is the only thing that computes scores, so rankings stay consistent across sessions.

## Rubric (1–5 each)

| Field | 1 | 3 | 5 |
|---|---|---|---|
| impact | barely moves weekly players | noticeable on one channel | step change in acquisition or retention |
| confidence | pure hypothesis | indirect evidence (peers, docs) | our own data or a direct precedent |
| fit | generic tactic | fits the audience | only Traversle can do it (uses the game's data/mechanics) |
| compounding | one-off spike | lasts weeks | keeps paying (indexed page, series, owned list, links) |
| effort | under 1 h, no skill needed | a day of work | multi-day build or new skill |
| time | result this week | 1–2 months | 3+ months to see anything |
| cost | $0 | ≤$20 | >$50 |

`score = 10 × (2·impact + fit + compounding) × (confidence/5) / (effort + time + cost)`; P0 ≥ 35, P1 ≥ 22, P2 ≥ 12, else P3 (calibrated on the first backlog so P0 holds only the foundation).

## Steps

1. For new actions, append rows with every column: `id, action, channel, impact, confidence, fit, compounding, effort, time, cost, cost_usd, hours, score, priority, status (todo|doing|done|dropped), owner, kpi, evidence, depends_on`. The `evidence` cell must point at a source or file; if there is none, confidence is 1 or 2.
2. Run `python3 .claude/skills/marketing-priorities/score.py MKT/07-backlog.csv --write --md MKT/07-backlog.md`.
3. Sanity-check the top 10: dependencies satisfied? two rows doing the same thing? Merge duplicates rather than letting them both rank.
4. Report the top 5 `todo` rows not blocked by a dependency, each with why, cost, how to test cheaply and what success looks like (from the row's kpi).
