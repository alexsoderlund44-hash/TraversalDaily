---
name: keyword-research
description: Find and size the searches Traversle could realistically rank for using free first-party and public data (Search Console, autocomplete, SERPs, Reddit), and update the keyword table. Use when planning pages or when GSC shows new queries.
---

# Keyword research (free stack)

Produces evidence-backed rows in `MKT/keywords.csv`. `MKT` and the evidence rules are defined in `MKT/00-system.md` (`/mnt/project-files/marketing/` in Claude Projects, else `marketing/data/`). Never write a search volume you did not read from a tool; leave the `volume` column blank or name the source (`gsc:impr28d=…`, `kwplanner:100-1K`).

## Inputs, best first

1. **Google Search Console** (when connected; look for an MCP tool mentioning search console or analytics): last 28 days of queries with impressions, clicks, CTR and position. This is the only true demand data for us. Pull queries with position 5–30 and ≥10 impressions first: those are the realistic wins.
2. **Bing Webmaster Tools keyword research** (free, needs a verified site; Alex runs it in the browser and pastes the export into `MKT/sources/`).
3. **Google autocomplete** via WebFetch, no key: `https://suggestqueries.google.com/complete/search?client=firefox&q=<seed>`. Expand each seed with the alphabet and question prefixes using `expand.py` in this folder: it prints the URLs to fetch; fetch each and save the raw JSON lists into `MKT/sources/autocomplete-YYYY-MM-DD.md`. Autocomplete is evidence that a query exists, not of its size.
4. **SERP inspection** via WebSearch for each candidate: who ranks (game sites, listicles, Reddit, app stores, news "answer today" pages), whether any result is a small site, and the result type. That decides difficulty, not a third-party score.
5. **Reddit / Hacker News questions**: WebSearch `site:reddit.com <topic>` and the HN Algolia API (`https://hn.algolia.com/api/v1/search?query=<q>`) for phrasing real people use.
6. **Google Trends** in the browser (no reliable API): compare 3–5 terms over 12 months; record only the relative shape and the date.

Seeds live in `MKT/keywords.csv` (`seed=y`). Current seed families: brand (traversle, traversle daily), category (daily geography game, geography games like wordle, travle, map game), travel-puzzle (travel puzzle game, route planning game, budget travel game), weekday series (train route game / eurorail, island hopping), and per-puzzle travel questions (`<city> to <city> without flying`).

## Classify each keyword

Columns: `keyword, cluster, intent (play|compare|answer|learn|travel), source, evidence, serp_type, small_site_ranks (y/n), difficulty (1-5, from the SERP), relevance (1-5), target_page, status, date`.

- Difficulty comes from the SERP you saw: 1 = forums/thin pages/small sites rank; 5 = NYT, Wikipedia, app stores and big publishers only.
- Relevance: would someone searching this enjoy playing today's puzzle?
- Drop travel-intent queries where our page would pretend to be real travel advice; the game's ground fares are modelled, not live (see README "Live fares").

## Output

Update `MKT/keywords.csv`, then append any page idea that has ≥2 keywords with difficulty ≤3 to `MKT/seo-pages.csv` (the `content-opportunities` skill scores it). Tell the user the 5 best new opportunities with the SERP evidence for each, in under 10 lines.
