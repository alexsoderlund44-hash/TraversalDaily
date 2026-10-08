---
name: marketing-audit
description: Re-audit Traversle's site, SEO, tracking, social presence and brand, and update the Marketing Baseline with what changed. Use before planning, after a launch or redesign, or monthly.
---

# Marketing audit

Rebuilds the Marketing Baseline from what can actually be observed, then records the delta against the last one. It does not give advice; it produces the facts every other marketing skill reads.

## Where things live

`MKT` is the marketing data folder: `/mnt/project-files/marketing/` when it exists (Claude Projects), otherwise `marketing/data/` in this repo. Read `MKT/00-system.md` first: it holds the evidence rules (FACT / INFERENCE / HYPOTHESIS, no invented numbers) and the file map. Every skill in this family follows it.

## Steps

1. **Read the previous baseline** `MKT/01-baseline.md` and `MKT/decisions.md` so you report change, not a fresh essay.
2. **Audit the code** on the branch that is (or will be) live. Check, with file:line evidence:
   - every `*.html`: `<title>`, meta description (flag duplicates), canonical, robots meta, OG/Twitter tags, JSON-LD, H1 present in static HTML (not only JS-filled), word count of static text;
   - presence of `robots.txt`, `sitemap.xml`, `404.html`, `CNAME`, web manifest, apple-touch-icon;
   - crawlable URLs for puzzles (static pages vs `?day=` parameters), internal links between them;
   - analytics/tag snippets (GA4 `gtag`, Cloudflare beacon, Umami, etc.) and any consent banner;
   - share text in `js/traverse-ui.js` (`shareText`) and whether it carries a link that can be attributed.
   Use `seo-check.py` in this skill folder for the mechanical part: `python3 .claude/skills/marketing-audit/seo-check.py .`
3. **Audit the live site** if it is live: fetch the home page, `robots.txt`, `sitemap.xml` with WebFetch; run PageSpeed Insights (`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=mobile`, no key needed for light use) and record LCP/CLS/INP field or lab values with the date.
4. **Search presence:** WebSearch `site:traversledaily.com`, `"traversle"`, `traversle daily`; note what ranks for the brand and whether Google autocorrects to Travle/Traverser. If Google Search Console is connected (an MCP tool whose name mentions search console), pull indexed pages, top queries and pages for the last 28 days instead.
5. **Social presence:** check each handle in `MKT/00-system.md` (TikTok, Instagram, YouTube, Reddit, Discord). If a platform blocks fetching, say "unverified" rather than guessing. If Metricool is connected and has the brand, pull follower and reach totals.
6. **Write** `MKT/01-baseline.md` in the same section order as before, each row labelled, and append a dated "Changes since last audit" section at the top (max 10 bullets). Move anything that changes priorities into `MKT/07-backlog.csv` as a new row (then run the `marketing-priorities` skill).

## Output to the user

Five lines at most: what changed, what is now the biggest gap, which backlog rows were added. Link the baseline file.
