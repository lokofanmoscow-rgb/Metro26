# Поперечные разрезы станций по данным OSM (Overpass): пути всех линий и платформы на
# перпендикуляре к нашему пути через центр станции — для каждой станции и каждого направления.
# Запуск: python3 layouts.py <subway.json> <станции.json из node> <выход.json>
import json, math, re, sys
OV = json.load(open(sys.argv[1]))['elements']
LST = json.load(open(sys.argv[2]))  # {line: {osm: [...], seqs: [[{n, sid}]]}}
lat0 = 55.75
KX, KZ = 111320 * math.cos(math.radians(lat0)), 110540
P = lambda la, lo: ((lo - 37.6) * KX, -(la - lat0) * KZ)
norm = lambda s: re.sub(r'[^а-яa-z0-9]', '', (s or '').lower().replace('ё', 'е'))
tracks = []  # (pts, name, oneway, service)
for e in OV:
    if e['type'] != 'way': continue
    t = e['tags']; g = [P(q['lat'], q['lon']) for q in e['geometry']]
    if t.get('railway') == 'subway' and t.get('service') not in ('yard', 'siding', 'spur'):
        ow = t.get('oneway') == 'yes' or t.get('railway:preferred_direction') == 'forward'
        tracks.append((g, t.get('name', ''), ow, t.get('service')))
plats = []
for e in OV:
    if e['type'] == 'way' and e['tags'].get('railway') == 'platform':
        g = [P(q['lat'], q['lon']) for q in e['geometry']]
        plats.append((g, norm(e['tags'].get('name')), len(g) > 3 and g[0] == g[-1]))
snodes = [(P(e['lat'], e['lon']), norm(e['tags'].get('name'))) for e in OV if e['type'] == 'node']
def segs(pts):
    for i in range(len(pts) - 1): yield pts[i], pts[i + 1]
def nearest(p, pts):
    best = (1e18, None, None)
    for a, b in segs(pts):
        dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9
        t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
        q = (a[0] + dx * t, a[1] + dz * t); d = math.dist(p, q)
        if d < best[0]: best = (d, q, (dx / math.sqrt(L2), dz / math.sqrt(L2)))
    return best
def cross(P0, r, pts):
    # точки пересечения прямой P0 + r*x с ломаной; x и направление отрезка
    out = []
    for a, b in segs(pts):
        dx, dz = b[0] - a[0], b[1] - a[1]
        den = r[0] * dz - r[1] * dx
        if abs(den) < 1e-9: continue
        ax, az = a[0] - P0[0], a[1] - P0[1]
        x = (ax * dz - az * dx) / den
        u = (ax * r[1] - az * r[0]) / den
        if 0 <= u <= 1: out.append((x, (dx, dz)))
    return out
res = {}
for ln, cfg in LST.items():
    for seq in cfg['seqs']:
        for k, st in enumerate(seq):
            nm = norm(st['n'])
            mine = [t for t in tracks if t[1] in cfg['osm']]
            # центр станции: платформы с этим названием у путей линии, иначе узел станции
            cands = [g for g, n, c in plats if n == nm]
            cen = None
            for g in cands:
                c = (sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g))
                d = min(nearest(c, t[0])[0] for t in mine) if mine else 1e9
                if d < 30 and (cen is None or d < cen[1]): cen = (c, d)
            if cen is None:
                ns = [p for p, n in snodes if n == nm]
                best = None
                for c in ns:
                    d = min(nearest(c, t[0])[0] for t in mine)
                    if best is None or d < best[1]: best = (c, d)
                if best is None or best[1] > 120: continue
                cen = best
            c = cen[0]
            # касательная нашего пути и направление движения (от предыдущей станции к следующей)
            d0, q, tan = min((nearest(c, t[0]) for t in mine), key=lambda x: x[0])
            def spos(j):
                j = max(0, min(len(seq) - 1, j)); nmj = norm(seq[j]['n'])
                for p, n in snodes:
                    if n == nmj: return p
                return None
            a, b = spos(k - 1), spos(k + 1)
            if k == 0: a = c
            if k == len(seq) - 1: b = c
            if a is None or b is None: continue
            v = (b[0] - a[0], b[1] - a[1])
            if tan[0] * v[0] + tan[1] * v[1] < 0: tan = (-tan[0], -tan[1])
            for dname, f in (('d0', tan), ('d1', (-tan[0], -tan[1]))):
                r = (-f[1], f[0])  # вправо по ходу (x — восток, z — юг)
                # несколько разрезов вдоль станции (в данных бывают разрывы путей) — объединяем
                hits = []
                for off in (-45, -25, -8, 8, 25, 45):
                    q2 = (q[0] + f[0] * off, q[1] + f[1] * off)
                    # вдоль нашего пути: ближайшая точка пути к сдвинутой
                    d2, q3, _ = min((nearest(q2, t[0]) for t in mine), key=lambda x: x[0])
                    for g, name, ow, svc in tracks:
                        for x, (dx, dz) in cross(q3, r, g):
                            if abs(x) > 80: continue
                            cs = (dx * f[0] + dz * f[1]) / (math.hypot(dx, dz) or 1)
                            if abs(cs) < 0.94: continue
                            hits.append((x, name, ow, cs > 0, svc, off))
                hits.sort()
                cl = []
                for h in hits:
                    if cl and abs(cl[-1][-1][0] - h[0]) < 1.2 and cl[-1][-1][1] == h[1]: cl[-1].append(h)
                    else: cl.append([h])
                ded = []
                for c in cl:
                    xs = sorted(h[0] for h in c)
                    ded.append({'x': round(xs[len(xs) // 2], 2), 'line': c[0][1], 'ow': c[0][2], 'same': sum(1 for h in c if h[3]) * 2 > len(c), 'svc': c[0][4], 'n': len({h[5] for h in c})})
                pls = []
                for g, n, closed in plats:
                    if not closed: continue
                    xs = sorted(x for x, _ in cross(q, r, g) if abs(x) < 80)
                    for i in range(0, len(xs) - 1, 2): pls.append([round(xs[i], 2), round(xs[i + 1], 2), n == nm])
                lin = [x for g, n, closed in plats if not closed for x, _ in cross(q, r, g) if abs(x) < 80]
                res[f"{ln}:{st['n']}:{dname}"] = {'tracks': ded, 'plats': sorted(pls), 'linplats': [round(x, 2) for x in sorted(lin)]}
json.dump(res, open(sys.argv[3], 'w'), ensure_ascii=False)
print(len(res), 'sections', file=sys.stderr)
