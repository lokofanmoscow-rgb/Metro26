# Подготовка новых линий: порядок станций по схеме, длины перегонов по осям путей OSM (Overpass),
# участки «не тоннель» вдоль линии. Запуск: python3 linesprep.py <subway.json из Overpass> <выход.json>
import json, math, re, sys, heapq
from collections import defaultdict
SRC = open('src/data/scheme.js', encoding='utf-8').read()
S = json.loads(re.search(r'export const SCHEME = (\{.*\});', SRC).group(1))
OV = json.load(open(sys.argv[1]))['elements']
LINES = {
  'ln5': dict(osm=['Кольцевая линия'], ring=True, start='Комсомольская'),
  'ln7': dict(osm=['Таганско-Краснопресненская линия'], start='Планерная'),
  'ln8': dict(osm=['Калининская линия', 'Калининско-Солнцевская линия', 'Солнцевская линия'], parts=[('Новокосино',), ('Деловой Центр',)]),
  'ln9': dict(osm=['Серпуховско-Тимирязевская линия'], start='Алтуфьево'),
  'ln10': dict(osm=['Люблинско-Дмитровская линия'], start='Физтех'),
  'ln11': dict(osm=['Большая кольцевая линия'], ring=True, start='Савёловская'),
  'ln12': dict(osm=['Бутовская линия'], start='Битцевский Парк'),
  'ln15': dict(osm=['Некрасовская линия'], start='Нижегородская'),
  'ln17': dict(osm=['Рублёво-Архангельская линия'], start='Деловой Центр'),
}
lat0 = 55.75
KX, KZ = 111320 * math.cos(math.radians(lat0)), 110540
P = lambda la, lo: ((lo - 37.6) * KX, -(la - lat0) * KZ)
norm = lambda s: re.sub(r'[^а-яa-z0-9]', '', s.lower().replace('ё', 'е'))
st_by_id = {s['id']: s for s in S['stations']}
out = {}
for ln, cfg in LINES.items():
    ids = [s['id'] for s in S['stations'] if s['line'] == ln and not s.get('uc')]
    adj = defaultdict(list)
    for g in S['segs']:
        if g['l'] == ln and g['a'] in ids and g['b'] in ids: adj[g['a']].append(g['b']); adj[g['b']].append(g['a'])
    def walk(a):
        seq = [a]; prev = None
        while True:
            nx = [x for x in adj[seq[-1]] if x != prev and x not in seq]
            if not nx: break
            prev = seq[-1]; seq.append(nx[0])
        return seq
    name2id = {norm(st_by_id[i]['name']): i for i in ids}
    seqs = []
    if cfg.get('ring'):
        a = name2id[norm(cfg['start'])]
        s1 = walk(a)
        # по часовой стрелке (на схеме y вниз): знак площади
        pts = [(st_by_id[i]['x'], st_by_id[i]['y']) for i in s1]
        area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
        if area < 0: s1 = [s1[0]] + s1[1:][::-1]
        seqs.append(s1 + [s1[0]])
    elif cfg.get('parts'):
        for (nm,) in cfg['parts']: seqs.append(walk(name2id[norm(nm)]))
    else:
        seqs.append(walk(name2id[norm(cfg['start'])]))
    # граф путей линии
    ways = [e for e in OV if e['type'] == 'way' and e['tags'].get('railway') == 'subway' and 'service' not in e['tags'] and e['tags'].get('name') in cfg['osm']]
    nodes = {}; G = defaultdict(list); segs = []
    for w in ways:
        t = w['tags']
        kind = 'tunnel' if t.get('tunnel') in ('yes', 'building_passage') else 'bridge' if t.get('bridge') in ('yes', 'viaduct') else 'covered' if t.get('covered') == 'yes' else 'open'
        g = w['geometry']; nd = [(round(q['lat'], 7), round(q['lon'], 7)) for q in g]
        for i in range(len(nd)):
            nodes[nd[i]] = P(g[i]['lat'], g[i]['lon'])
        for i in range(len(nd) - 1):
            a, b = nd[i], nd[i + 1]; d = math.dist(nodes[a], nodes[b])
            G[a].append((b, d)); G[b].append((a, d)); segs.append((a, b, kind))
    snodes = [e for e in OV if e['type'] == 'node' and e['tags'].get('railway') == 'station']
    plats = [e for e in OV if e['type'] == 'way' and e['tags'].get('railway') == 'platform']
    def projs(p, R=90, k=4):
        # проекции точки на ближайшие рёбра (обычно оба пути)
        out = []
        for a, b, kk in segs:
            A, B = nodes[a], nodes[b]; dx, dz = B[0] - A[0], B[1] - A[1]; L2 = dx * dx + dz * dz or 1e-9
            t = max(0, min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dz) / L2))
            q = (A[0] + dx * t, A[1] + dz * t); d = math.dist(q, p)
            if d < R: out.append((d, (a, b, t, math.sqrt(L2))))
        out.sort(key=lambda x: x[0])
        return out[:k]
    def where(name):
        cands = [P(e['lat'], e['lon']) for e in snodes if norm(e['tags'].get('name', '')) == norm(name)]
        for e in plats:
            if norm(e['tags'].get('name', '')) == norm(name):
                g = e['geometry']; cands.append(P(sum(q['lat'] for q in g) / len(g), sum(q['lon'] for q in g) / len(g)))
        if not cands: return None, [], 1e9
        best = None
        for c in cands:
            pr = projs(c, 400, 1)
            if pr and (best is None or pr[0][0] < best[0]): best = (pr[0][0], c)
        if best is None: return cands[0], [], 1e9
        # точка на оси пути у станции и проекции на соседние пути
        c = best[1]
        return c, projs(c, best[0] + 40, 4), best[0]
    def gdist(pa, pb):
        (a1, b1, t1, L1), (a2, b2, t2, L2) = pa, pb
        if (a1, b1) == (a2, b2): return abs(t1 - t2) * L1
        src = {a1: t1 * L1, b1: (1 - t1) * L1}; dst = {a2: t2 * L2, b2: (1 - t2) * L2}
        D = dict(src); pq = [(v, k) for k, v in src.items()]; heapq.heapify(pq); best = 1e18
        while pq:
            d, u = heapq.heappop(pq)
            if d > D.get(u, 1e18) or d > best: continue
            if u in dst: best = min(best, d + dst[u])
            for v, w in G[u]:
                if d + w < D.get(v, 1e18): D[v] = d + w; heapq.heappush(pq, (d + w, v))
        return best
    def dist(A, B):
        (ca, pa, da), (cb, pb, db) = A, B
        if ca is None or cb is None: return None, 'нет станции'
        straight = math.dist(ca, cb)
        best = 1e18
        for _, x in pa:
            for _, y in pb: best = min(best, gdist(x, y))
        if best < 2.0 * straight + 300 and da < 150 and db < 150: return best, 'osm'
        return straight * 1.08, 'прямая'
    res = []
    for seq in seqs:
        lst = []
        locs = [where(st_by_id[i]['name']) for i in seq]
        for k, i in enumerate(seq):
            s_ = st_by_id[i]
            d, how = (0, '') if k == len(seq) - 1 else dist(locs[k], locs[k + 1])
            c = locs[k][0]
            lst.append({'n': s_['name'], 'sid': i, 'd': None if d is None else round(d), 'how': how, 'xy': [round(c[0]), round(c[1])] if c else None})
        res.append(lst)
    # участки «не тоннель» (метры пути по двум путям)
    nt = defaultdict(float)
    for a, b, k in segs:
        if k != 'tunnel': nt[k] += math.dist(nodes[a], nodes[b])
    out[ln] = {'seqs': res, 'nontunnel': {k: round(v) for k, v in nt.items()}}
    print(ln, [len(r) for r in res], {k: round(v) for k, v in nt.items()}, file=sys.stderr)
    for r in res:
        print('   ', ' | '.join(f"{x['n']} {x['d']}{'' if x['how'] in ('osm', '') else '*'}" for x in r), file=sys.stderr)
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
