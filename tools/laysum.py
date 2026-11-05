# Сводка разрезов: наш путь, платформа слева/справа, прочие пути в зале
import json, sys
L = json.load(open(sys.argv[1])); IN = json.load(open(sys.argv[2]))
SH = {}
for ln, v in IN.items():
    for n in v['osm']: SH[n] = ln
out = {}
for key, s in L.items():
    ln, name, d = key.split(':')
    mine = [t for t in s['tracks'] if SH.get(t['line']) == ln]
    if not mine: out[key] = {'err': 'no track'}; continue
    owm = [t for t in mine if t['ow']]
    cand = [t for t in mine if t['ow'] and t['same']]
    if cand: our = min(cand, key=lambda t: abs(t['x']))
    else: our = max(mine, key=lambda t: t['x']) if len(mine) > 1 else mine[0]
    x0 = our['x']
    trs = [{**t, 'x': round(t['x'] - x0, 2)} for t in s['tracks']]
    pls = [[round(a - x0, 2), round(b - x0, 2), own] for a, b, own in s['plats']]
    # платформа у нашего пути: край в пределах 1..2.6 м слева или справа
    left = [p for p in pls if -3.2 < p[1] < -0.6]
    right = [p for p in pls if 0.6 < p[0] < 3.2]
    out[key] = {'tracks': trs, 'plats': pls, 'left': bool(left), 'right': bool(right), 'lin': [round(x - x0, 2) for x in s['linplats']]}
json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False)
def fmt(v):
    t = ' '.join(f"{tr['x']:+.1f}{'' if SH.get(tr['line']) is None else SH[tr['line']].replace('ln','L')}{'>' if tr['same'] else '<'}{'' if tr['ow'] else '?'}" for tr in v['tracks'])
    p = ' '.join(f"[{a:+.1f},{b:+.1f}{'' if own else '*'}]" for a, b, own in v['plats'])
    return f"T: {t} | P: {p}"
for key, v in out.items():
    if 'err' in v: print('ERR', key); continue
    std = v['left'] and not v['right'] and len([t for t in v['tracks'] if abs(t['x']) < 30]) == 2
    if not std: print(key, '|', 'L' if v['left'] else '-', 'R' if v['right'] else '-', '|', fmt(v))
