---
name: short-video-ideas
description: Generate, refine and log TikTok, Instagram Reels and YouTube Shorts concepts for Traversle from today's puzzle, the schedule and what is working, each with hook, script outline, visuals, on-screen text and CTA. Use when planning the next batch of short videos or when a video over-performs.
---

# Short-video ideas (TikTok / Reels / Shorts)

Writes rows to `MKT/content-ideas.csv` and briefs to `MKT/scripts/`. Rules and paths: `MKT/00-system.md`. Read `MKT/05-social-system.md` first: it has the formats, the series and the learnings so far. Argument: optional `tiktok`, `reels` or `shorts`, and a count (default 5).

## Steps

1. **Pull fresh material from the game**: the next 14 days in `data/schedule.js` (start, destination, twist, title/blurb), the weekday theme for each (`RHYTHM` in `js/traverse.js`), and the live fare snapshot (`data/live/latest.js`). Each future puzzle is a ready-made hook ("Seattle to Denver, $X, no flights"). Never reveal the planner's route for a puzzle before its day ends.
2. **Check what worked**: the `results` columns in `content-ideas.csv` and the latest `MKT/reviews/*.md`. Prefer remixing a format with above-median 2-second hold or shares over inventing a new one. If Metricool is connected, pull last 30 days of per-post metrics first.
3. **Check trends cheaply** (optional): TikTok Creative Center trending hashtags/sounds in the browser (Alex pastes them) or WebSearch for this week's travel/geography trends. Trend-dependent ideas must be marked `trend` and given an expiry date.
4. **Write each concept** with every column: `id, format, platform, hook (first 1.5 s, spoken + on-screen), concept, script_outline (beats with seconds), visuals (screen recording / map animation / stock / face), on_screen_text, cta, length_s, difficulty (1-5), why_it_could_work (cite a learning or source), product_link (how the game appears), evergreen_or_trend, series, status`.
5. **Production brief** for the ones Alex picks: `MKT/scripts/<id>.md` with shot list, exact on-screen text per beat, caption, 3–5 hashtags, pinned comment, and the capture recipe (Playwright frame-stepped capture of `play.html?day=N` with `localStorage traverse.seen=1`, ffmpeg to 1080×1920; see `/mnt/project-files/promo/caption.md` for the first promo).

## Rules

- One idea, one question the viewer wants answered. The answer arrives after the hook, never before it.
- Every video shows the actual game UI for at least a third of its length; the product is the content.
- Same video can go to all three platforms, but upload natively without another platform's watermark (Instagram has said it deprioritizes visibly recycled content; see `05-social-system.md` sources).
- CTA is the comment or the game, not "follow": "drop your score", "what would you have taken?", "today's route is in my bio".
