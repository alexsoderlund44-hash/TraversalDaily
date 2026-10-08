# Marketing system

Traversle's marketing research, plans and numbers live outside the code so every session builds on the last one instead of starting over.

**Data folder (`MKT`):** `/mnt/project-files/marketing/` in the Claude project. If that folder is not available (a local checkout), use `marketing/data/` here and copy the files across.

Start with `MKT/00-system.md`: the evidence rules (FACT / INFERENCE / HYPOTHESIS, no invented numbers, $0 by default) and the file map. The current priorities are always `MKT/07-backlog.md`.

## Skills (in `.claude/skills/`)

| Skill | Use it to | Writes |
|---|---|---|
| `marketing-audit` | Re-audit the site, SEO, tracking and presence (`seo-check.py` does the mechanical checks) | `01-baseline.md` |
| `keyword-research` | Find rankable queries from GSC, autocomplete (`expand.py`), SERPs and Reddit | `keywords.csv` |
| `competitor-research` | Refresh FlightQ, Travle, MapTap and others | `03-competitors.md`, `link-targets.csv` |
| `content-opportunities` | Score page ideas against a quality gate | `seo-pages.csv`, `04-seo-opportunity-map.md` |
| `short-video-ideas` | Generate TikTok / Reels / Shorts concepts and briefs from the puzzle schedule | `content-ideas.csv`, `scripts/` |
| `content-calendar` | Plan 2–4 weeks and repurpose each core piece | `calendar.csv` |
| `weekly-marketing-review` | Log the week's numbers, learn, re-score | `reviews/`, `kpi-log.csv` |
| `marketing-priorities` | Score and rank the backlog (`score.py`) | `07-backlog.csv`, `07-backlog.md` |

Loop: audit → research → score → execute → weekly review → re-score.

Also vendored from coreyhaines31/marketingskills (see `.claude/skills/THIRD-PARTY.md`): `programmatic-seo`, `schema`, `referrals`, `social`, `launch`, `directory-submissions`, `ai-seo`, `influencer-marketing`. They read `.claude/product-marketing.md`.

## Tooling in the repo

| What | File | Setup still needed |
|---|---|---|
| Google Search Console MCP (`mcp-search-console` 0.4.1 via `uvx`) | `.mcp.json`, `tools/mcp/gsc.sh` | Verify the Domain property, create a Google Cloud service account, add it in Search Console as a **Restricted** user, and store its key JSON as the environment secret `GSC_SERVICE_ACCOUNT_JSON` (cloud) or point `GSC_OAUTH_CLIENT_SECRETS_FILE` at an OAuth client file (local) |
| Lighthouse CI on every PR (warn-only, report as an artifact) | `.github/workflows/lighthouse.yml`, `lighthouserc.json` | None |
| IndexNow ping on pushes to main (Bing, Yandex and others) | `.github/workflows/indexnow.yml`, `<key>.txt` at the root | None; it skips until the site is live and has a `sitemap.xml` |
