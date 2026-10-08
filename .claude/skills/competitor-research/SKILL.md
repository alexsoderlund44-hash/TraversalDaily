---
name: competitor-research
description: Profile Traversle's competitors (Travle, Worldle, Globle, Krillion, MapTap and newcomers) across SEO, links, social and product, and update the competitor file with dated evidence. Use quarterly, when a new daily game appears, or before a launch push.
---

# Competitor research

Updates `MKT/03-competitors.md` and `MKT/competitors.csv`. Rules and paths: `MKT/00-system.md`. Compare against the last version and report only what changed.

## For each competitor (list in `competitors.csv`)

1. **Site and SEO** (WebFetch): title, meta description, JSON-LD types, `robots.txt`, `sitemap.xml` (count URLs, note page templates such as `/archive/123`, `/how-to-play`, `/country/<x>`). Which templates are indexable is the clearest view of their SEO strategy we can get for free.
2. **What ranks**: WebSearch `site:<domain>` and their brand plus "answer", "hint", "today", "unlimited", "archive". Note third-party "answer today" pages (gaming news sites); they show search demand around the game.
3. **Links and PR**: WebSearch for listicles and press that mention them ("games like wordle geography", "best daily puzzle games 2026", NPR/Guardian/Verge roundups). Record outlet, URL, date in `MKT/link-targets.csv`; these are our outreach list. If the Ahrefs connector works, add referring domains and top pages, labelled `ahrefs-estimate`.
4. **Social**: official TikTok/Instagram/YouTube/Reddit/Discord; follower counts only when seen, with date. Note their last 10 posts' formats and hooks in `MKT/sources/social-<name>-YYYY-MM-DD.md`.
5. **Product and monetization**: free vs paid, archive, ads, app, share format.

## Synthesis

End the file with: where each one is weak that Traversle is strong (and the reverse), content gaps we can fill, and any new threat. Add actionable gaps as backlog rows (`MKT/07-backlog.csv`) and re-score with `marketing-priorities`.

Use the `marketing:competitive-brief` skill if available for the positioning section, but feed it this evidence instead of letting it generalize.
