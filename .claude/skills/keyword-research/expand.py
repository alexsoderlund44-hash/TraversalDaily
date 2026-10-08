#!/usr/bin/env python3
"""Print Google autocomplete URLs for seed expansion (fetch them with WebFetch).

Usage: python3 expand.py "daily geography game" ["map game" ...] [--alpha] [--questions]
"""
import sys, urllib.parse
seeds = [a for a in sys.argv[1:] if not a.startswith('--')]
variants = []
for s in seeds:
    variants.append(s)
    if '--alpha' in sys.argv:
        variants += [f'{s} {c}' for c in 'abcdefghijklmnopqrstuvwxyz']
    if '--questions' in sys.argv:
        variants += [f'{q} {s}' for q in ('how', 'what', 'why', 'is', 'best', 'free', 'like', 'vs')]
for v in variants:
    print('https://suggestqueries.google.com/complete/search?client=firefox&q=' + urllib.parse.quote_plus(v))
