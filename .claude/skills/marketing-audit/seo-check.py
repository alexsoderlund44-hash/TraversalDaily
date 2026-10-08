#!/usr/bin/env python3
"""Mechanical on-page SEO check for a static site folder.

Usage: python3 seo-check.py SITE_DIR [--base https://traversledaily.com]
Prints one row per HTML page and a list of site-level issues. No network use.
"""
import os, re, sys
from collections import Counter

site = sys.argv[1] if len(sys.argv) > 1 else '.'
pages = sorted(f for f in os.listdir(site) if f.endswith('.html'))
get = lambda pat, s: (re.search(pat, s, re.I | re.S) or [None, None])[1]
rows, descs, issues = [], Counter(), []
for p in pages:
    h = open(os.path.join(site, p), encoding='utf-8').read()
    title = get(r'<title>(.*?)</title>', h)
    desc = get(r'<meta name="description" content="([^"]*)"', h)
    canon = get(r'<link rel="canonical" href="([^"]*)"', h)
    robots = get(r'<meta name="robots" content="([^"]*)"', h)
    h1 = get(r'<h1[^>]*>(.*?)</h1>', h)
    h1txt = re.sub('<[^>]+>', '', h1 or '').strip()
    body = re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>', ' ', h, flags=re.S)
    words = len(body.split())
    ld = len(re.findall('application/ld\\+json', h))
    descs[desc] += 1
    rows.append((p, len(title or ''), len(desc or ''), 'y' if canon else '-', robots or '-', 'y' if h1txt else 'EMPTY', words, ld))
print(f"{'page':<20}{'title':>6}{'desc':>6}{'canon':>7}{'robots':>12}{'h1':>7}{'words':>7}{'ld':>4}")
for r in rows:
    print(f"{r[0]:<20}{r[1]:>6}{r[2]:>6}{r[3]:>7}{r[4]:>12}{r[5]:>7}{r[6]:>7}{r[7]:>4}")
for d, n in descs.items():
    if n > 1:
        issues.append(f'{n} pages share one meta description')
for f in ['robots.txt', 'sitemap.xml', '404.html', 'CNAME', 'manifest.webmanifest']:
    if not os.path.exists(os.path.join(site, f)):
        issues.append(f'missing {f}')
for r in rows:
    if r[3] == '-':
        issues.append(f'{r[0]}: no canonical')
    if r[5] == 'EMPTY':
        issues.append(f'{r[0]}: H1 empty in static HTML')
    if r[1] > 60:
        issues.append(f'{r[0]}: title {r[1]} chars (may truncate)')
    if r[2] and not 70 <= r[2] <= 160:
        issues.append(f'{r[0]}: description {r[2]} chars')
analytics = any(re.search('gtag\\(|googletagmanager|cloudflareinsights|umami|plausible|goatcounter|posthog', open(os.path.join(site, p), encoding='utf-8').read()) for p in pages)
if not analytics:
    issues.append('no analytics snippet on any page')
print('\nIssues:')
for i in issues:
    print(' -', i)
