#!/usr/bin/env python3
"""Score and rank the marketing backlog.

Usage: python3 score.py BACKLOG.csv [--write] [--md OUT.md]

Each row is rated 1-5 on: impact, confidence, fit, compounding (higher is better)
and effort, time, cost (higher is worse). The score rewards value, discounts it by
confidence, and divides by drag:

    value = 2*impact + fit + compounding            (4..20)
    drag  = effort + time + cost                     (3..15)
    score = round(10 * value * (confidence / 5) / drag, 1)

Priority bands: P0 >= 35, P1 >= 22, P2 >= 12, else P3. Rows whose status is
done or dropped are kept but listed last. --write rewrites the score and
priority columns in place; --md writes a markdown table sorted by score.
"""
import csv, sys

RATED = ['impact', 'confidence', 'fit', 'compounding', 'effort', 'time', 'cost']


def score(r):
    v = {k: int(r[k]) for k in RATED}
    for k, x in v.items():
        if not 1 <= x <= 5:
            raise ValueError(f"{r.get('id')}: {k}={x} is outside 1-5")
    value = 2 * v['impact'] + v['fit'] + v['compounding']
    drag = v['effort'] + v['time'] + v['cost']
    return round(10 * value * (v['confidence'] / 5) / drag, 1)


def band(s):
    return "P0" if s >= 35 else "P1" if s >= 22 else "P2" if s >= 12 else "P3"


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    path = args[0]
    with open(path, newline='') as f:
        rows = list(csv.DictReader(f))
        fields = rows[0].keys() if rows else []
    for r in rows:
        r['score'] = score(r)
        r['priority'] = band(r['score'])
    closed = lambda r: r.get('status', '') in ('done', 'dropped')
    rows.sort(key=lambda r: (closed(r), -r['score']))
    if '--write' in args:
        with open(path, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=list(fields))
            w.writeheader()
            w.writerows(rows)
    if '--md' in args:
        out = args[args.index('--md') + 1]
        cols = ['priority', 'score', 'id', 'action', 'channel', 'cost_usd', 'effort', 'impact', 'confidence', 'status']
        with open(out, 'w') as f:
            f.write('| ' + ' | '.join(cols) + ' |\n|' + '---|' * len(cols) + '\n')
            for r in rows:
                f.write('| ' + ' | '.join(str(r.get(c, '')) for c in cols) + ' |\n')
    for r in rows[:15]:
        if not closed(r):
            print(f"{r['priority']} {r['score']:>5}  {r['id']:<6} {r['action'][:80]}")


if __name__ == '__main__':
    main()
