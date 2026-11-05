# Подготовка окружения открытых участков из OpenStreetMap для игры:
# ось пути между порталами, мосты, здания (высоты), деревья, растровая «карта местности»
# (дороги, тротуары, газоны, лес, вода, площадки) и маска воды для рельефа.
import sys, os, json, math, random
from collections import defaultdict
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
from osmload import load
from osmtrack import Proj

OSM_DIR, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
random.seed(26)

AREAS = {
  # zone: ось пути между порталами (две линии путей, порталы задаются точками на оси)
  'nag': dict(line='Замоскворецкая линия', anchor='Технопарк', zone=True, portals=[(-273, -913), (86, 1082)], spacing=4.6),
  'luzh': dict(line='Сокольническая линия', anchor='Воробьёвы горы', zone=True, portals=None, spacing=None),
  'sal': dict(line='Сокольническая линия', anchor='Филатов Луг', zone=True, portals=None, spacing=None, px=2.4),
  # focus — точка (широта, долгота) внутри открытого участка, если станция-якорь вне его
  'preo': dict(line='Сокольническая линия', anchor='Преображенская площадь', zone=True, portals=None, spacing=None, focus=(55.7966, 37.7016)),
  'myak': dict(line='Арбатско-Покровская линия', anchor='Мякинино', zone=True, portals=None, spacing=None),
  'kunc': dict(line='Арбатско-Покровская линия', anchor='Кунцевская', zone=True, portals=None, spacing=None),
  'izm': dict(line='Арбатско-Покровская линия', anchor='Измайловская', zone=True, portals=None, spacing=None),
  # Филёвская линия (данные загрузки filv, у «Кунцевской» — ещё kunc); участки обрезаются вокруг оси (crop)
  # Смоленский метромост: подходы к нему проходят под зданиями (tunnel=building_passage) — это тоннель
  'fsmol': dict(line='Филёвская линия', anchor='Смоленская', src=['filv'], zone=True, portals=None, spacing=None, focus=(55.7482, 37.5750), passage_tunnel=True, crop=650),
  'fstud': dict(line='Филёвская линия', anchor='Студенческая', src=['filv'], zone=True, portals=None, spacing=None, crop=650),
  'fkut': dict(line='Филёвская линия', anchor='Кутузовская', src=['filv'], zone=True, portals=None, spacing=None, focus=(55.7441, 37.5242), crop=650),
  'ffili': dict(line='Филёвская линия', anchor='Фили', src=['filv', 'kunc'], zone=True, portals=None, spacing=None, crop=650, px=2.0, extend=(0, 340)),
  # Таганско-Краснопресненская: открытый участок между «Волгоградским проспектом» и «Текстильщиками»; «Выхино»
  'tkuz': dict(line='Таганско-Краснопресненская линия', anchor='Текстильщики', src=['tkuz'], zone=True, portals=None, spacing=None, focus=(55.7130, 37.7170), crop=600),
  'vykh': dict(line='Таганско-Краснопресненская линия', anchor='Выхино', src=['vykh'], zone=True, portals=None, spacing=None, crop=600),
  # Бутовская: эстакада и конечная «Бунинская аллея» (пути продолжаются в тупики)
  'butv': dict(line='Бутовская линия', anchor='Бульвар Адмирала Ушакова', src=['butv'], zone=True, portals=None, spacing=None, crop=600, extend=(0, 340)),
  # Солнцевская: мост между «Рассказовкой» и «Пыхтино»
  'pykh': dict(line='Солнцевская линия', anchor='Пыхтино', src=['pykh'], zone=True, portals=None, spacing=None, focus=(55.6222, 37.2900), crop=600),
}
PX = 1.6  # м на пиксель наземной текстуры

ROAD_W = {'motorway': 22, 'trunk': 20, 'primary': 15, 'secondary': 12, 'tertiary': 9, 'unclassified': 7, 'residential': 7,
          'living_street': 5, 'service': 4.5, 'motorway_link': 8, 'trunk_link': 8, 'primary_link': 7, 'secondary_link': 7,
          'tertiary_link': 6, 'pedestrian': 6, 'footway': 2.4, 'path': 1.8, 'cycleway': 2.2, 'steps': 2.4, 'track': 3.5, 'construction': 6}
AREA_COL = [
  # (тег, значение, цвет, порядок)
  ('landuse', 'residential', (186, 180, 168), 0), ('landuse', 'commercial', (184, 178, 170), 0), ('landuse', 'retail', (184, 176, 168), 0),
  ('landuse', 'industrial', (170, 166, 158), 0), ('landuse', 'railway', (150, 144, 134), 0), ('landuse', 'construction', (176, 164, 136), 1),
  ('landuse', 'garages', (150, 150, 148), 1), ('amenity', 'parking', (108, 110, 112), 3), ('landuse', 'grass', (104, 138, 70), 2),
  ('leisure', 'park', (96, 132, 66), 1), ('leisure', 'garden', (98, 134, 66), 2), ('landuse', 'meadow', (126, 146, 78), 1), ('natural', 'grassland', (122, 144, 76), 1),
  ('natural', 'scrub', (88, 118, 60), 2), ('landuse', 'forest', (64, 96, 50), 2), ('natural', 'wood', (64, 96, 50), 2), ('landuse', 'recreation_ground', (100, 136, 68), 1),
  ('leisure', 'pitch', (72, 128, 70), 3), ('leisure', 'stadium', (110, 140, 90), 2), ('leisure', 'playground', (150, 120, 90), 3), ('natural', 'sand', (214, 198, 150), 2),
  ('natural', 'beach', (214, 198, 150), 2), ('landuse', 'brownfield', (160, 150, 128), 1), ('landuse', 'farmland', (150, 150, 92), 1), ('leisure', 'track', (170, 90, 70), 3),
  ('amenity', 'school', (180, 174, 160), 1), ('amenity', 'university', (180, 174, 160), 1), ('landuse', 'cemetery', (96, 120, 72), 1), ('leisure', 'sports_centre', (150, 146, 138), 2),
]
WATER = (52, 84, 104)


def ring_from_rel(members, ways, allow_open=False):
    """Склеивает внешние контуры мультиполигона из имеющихся путей. Неполные (уходящие за край
    загруженного участка) пропускает, а для лесов и парков (allow_open) замыкает прямой."""
    parts = [list(ways[r][0]) for t, r, role in members if t == 'way' and role in ('outer', '') and r in ways]
    rings = []
    while parts:
        cur = parts.pop()
        changed = True
        while changed and cur[0] != cur[-1]:
            changed = False
            for i, p in enumerate(parts):
                if p[0] == cur[-1]: cur += p[1:]
                elif p[-1] == cur[-1]: cur += p[::-1][1:]
                elif p[-1] == cur[0]: cur = p[:-1] + cur
                elif p[0] == cur[0]: cur = p[::-1][:-1] + cur
                else: continue
                parts.pop(i); changed = True; break
        if cur[0] == cur[-1]: rings.append(cur)
        elif allow_open and len(cur) > 8: rings.append(cur + [cur[0]])
    return rings


def poly_len(pts):
    return sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))


def resample(pts, step):
    out = [pts[0]]; acc = 0.0
    seg = [(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    need = step
    for a, b in seg:
        L = math.hypot(b[0] - a[0], b[1] - a[1]); t = 0.0
        while L - t >= need - 1e-9:
            t += need
            out.append((a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L))
            need = step
        need -= (L - t)
    if math.hypot(out[-1][0] - pts[-1][0], out[-1][1] - pts[-1][1]) > step * 0.3: out.append(pts[-1])
    return out


def nearest_on(poly, p):
    best = (1e18, 0, None)
    s = 0.0
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]
        dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9
        t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
        q = (a[0] + dx * t, a[1] + dz * t)
        d = math.hypot(q[0] - p[0], q[1] - p[1])
        if d < best[0]: best = (d, s + math.sqrt(L2) * t, q)
        s += math.sqrt(L2)
    return best


def smooth(pts, n=3):
    for _ in range(n):
        pts = [pts[0]] + [((pts[i - 1][0] + 2 * pts[i][0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[i + 1][1]) / 4) for i in range(1, len(pts) - 1)] + [pts[-1]]
    return pts


def build(area, cfg):
    global PX
    PX = cfg.get('px', 1.6)  # большие участки — с меньшим разрешением карты местности
    nodes, ways, rels = {}, {}, {}
    for src in cfg.get('src', [area]):
        n_, w_, r_ = load(src, OSM_DIR); nodes.update(n_); ways.update(w_); rels.update(r_)
    lats = [v[0] for v in nodes.values()]; lons = [v[1] for v in nodes.values()]
    # границы — по квадратам загрузки (узлы путей выходят за них)
    import glob
    bb = [1e9, 1e9, -1e9, -1e9]
    for fn in [f for src in cfg.get('src', [area]) for f in glob.glob(os.path.join(OSM_DIR, src + '_*.osm'))]:
        _, la, lo = os.path.basename(fn)[:-4].split('_')
        la, lo = float(la), float(lo)
        bb = [min(bb[0], la), min(bb[1], lo), max(bb[2], la + 0.006), max(bb[3], lo + 0.010)]
    lat0, lon0 = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    P = Proj(lat0, lon0)
    X0, Z0 = P(bb[2], bb[1]); X1, Z1 = P(bb[0], bb[3])
    XY = {n: P(v[0], v[1]) for n, v in nodes.items()}
    def wpts(nd): return [XY[n] for n in nd if n in XY]

    # ---------- пути линии ----------
    subway = [(w, nd, t) for w, (nd, t) in ways.items() if t.get('railway') == 'subway' and 'service' not in t and cfg['line'] in (t.get('name'), t.get('name:ru'))]
    segs = []  # (a, b, kind)
    for w, nd, t in subway:
        kind = 'tunnel' if t.get('tunnel') == 'yes' or (cfg.get('passage_tunnel') and t.get('tunnel') == 'building_passage') else 'bridge' if t.get('bridge') == 'yes' else 'covered' if t.get('covered') == 'yes' else 'open'
        p = wpts(nd)
        for i in range(len(p) - 1): segs.append((p[i], p[i + 1], kind))
    # станция-якорь: платформы и узлы станций с этим названием; берём ближайшие к путям линии
    def seg_d(p):
        best = 1e18
        for a, b, k in segs:
            dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1e-9
            t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
            best = min(best, math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]))
        return best
    cands = []
    for w, (nd, t) in ways.items():
        if (t.get('railway') == 'platform' or t.get('public_transport') == 'platform') and t.get('name') == cfg['anchor']:
            q = wpts(nd)
            if q: cands.append((sum(v[0] for v in q) / len(q), sum(v[1] for v in q) / len(q)))
    for n, (la, lo, t) in nodes.items():
        if t.get('railway') == 'station' and t.get('name') == cfg['anchor']: cands.append(XY[n])
    cands.sort(key=seg_d)
    near = [c for c in cands if seg_d(c) < seg_d(cands[0]) + 15 and math.hypot(c[0] - cands[0][0], c[1] - cands[0][1]) < 120]
    pc = [sum(c[0] for c in near) / len(near), sum(c[1] for c in near) / len(near)]
    # касательная пути у станции: ближайший сегмент
    bestd, tang = 1e9, (0, 1)
    for a, b, k in segs:
        mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        d = math.hypot(mx - pc[0], mz - pc[1])
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if d < bestd and L > 5: bestd, tang = d, ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    res = {'id': area, 'origin': [lat0, lon0], 'bounds': [round(X0), round(Z0), round(X1), round(Z1)],
           'anchor': {'name': cfg['anchor'], 'x': round(pc[0], 2), 'z': round(pc[1], 2), 'tx': round(tang[0], 5), 'tz': round(tang[1], 5)}}

    # ---------- ось открытого участка ----------
    if cfg['zone']:
        # граф путей: цепочка через соседние сегменты, ориентированная по касательной у станции
        adj = defaultdict(list)
        key = lambda p: (round(p[0], 2), round(p[1], 2))
        for a, b, k in segs:
            adj[key(a)].append((b, k)); adj[key(b)].append((a, k))
        def walk(start, direction):
            pts = [start]; kinds = []
            cur, prev_dir = start, direction
            seen = {key(start)}
            for _ in range(5000):
                cand = [(b, k) for b, k in adj[key(cur)] if key(b) not in seen]
                if not cand: break
                def score(c):
                    b = c[0]; dx, dz = b[0] - cur[0], b[1] - cur[1]; L = math.hypot(dx, dz) or 1
                    return -(dx * prev_dir[0] + dz * prev_dir[1]) / L
                b, k = min(cand, key=score)
                dx, dz = b[0] - cur[0], b[1] - cur[1]; L = math.hypot(dx, dz) or 1
                if (dx * prev_dir[0] + dz * prev_dir[1]) / L < 0.3: break
                pts.append(b); kinds.append(k); seen.add(key(b)); prev_dir = (dx / L, dz / L); cur = b
            return pts, kinds
        # ближайшая к станции точка каждого пути: начинаем с узла ближайшего сегмента
        starts = sorted({key(a): a for a, b, k in segs}.values(), key=lambda p: math.hypot(p[0] - pc[0], p[1] - pc[1]))
        tracks = []
        for s0 in starts[:40]:
            if any(nearest_on(t, s0)[0] < 1.0 for t, _ in tracks): continue
            fw, kf = walk(s0, tang); bw, kb = walk(s0, (-tang[0], -tang[1]))
            pts = bw[::-1] + fw[1:]; kinds = kb[::-1] + kf
            if poly_len(pts) > 800: tracks.append((pts, kinds))
            if len(tracks) == 2: break
        # участок между порталами по каждому пути: максимальный непрерывный «не тоннель» вокруг станции
        fc = P(*cfg['focus']) if cfg.get('focus') else pc
        def open_part(pts, kinds):
            d, s_st, q = nearest_on(pts, fc)
            s = 0; segs_s = []
            for i in range(len(pts) - 1):
                L = math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs_s.append((s, s + L, kinds[i])); s += L
            i0 = next(i for i, (a, b, k) in enumerate(segs_s) if a <= s_st <= b)
            lo = i0
            while lo > 0 and segs_s[lo - 1][2] != 'tunnel': lo -= 1
            hi = i0
            while hi < len(segs_s) - 1 and segs_s[hi + 1][2] != 'tunnel': hi += 1
            return pts[lo:hi + 2], [(a, b, k) for a, b, k in segs_s[lo:hi + 1]], segs_s[lo][0]
        parts = [open_part(p, k) for p, k in tracks]
        A = max(parts, key=lambda x: poly_len(x[0]))
        B = min(parts, key=lambda x: poly_len(x[0])) if len(parts) > 1 else A
        ref = resample(A[0], 2.0)
        other = resample(B[0], 2.0)
        # средняя линия между путями
        center, spac = [], []
        for p in ref:
            d, s, q = nearest_on(other, p)
            if d < 25: center.append(((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)); spac.append(d)
            else: center.append(p)
        center = smooth(resample(center, 4.0), 4)
        spacing = cfg.get('spacing') or round(sorted(spac)[len(spac) // 2], 2) if spac else 4.2
        # порталы: заданные точки или концы «не тоннеля»
        if cfg.get('portals'):
            s_p = sorted(nearest_on(center, p)[1] for p in cfg['portals'])
        else:
            s_p = [0, poly_len(center)]
        # обрезаем ось по порталам
        cut = []
        s = 0
        for i in range(len(center) - 1):
            a, b = center[i], center[i + 1]; L = math.hypot(b[0] - a[0], b[1] - a[1])
            if s + L >= s_p[0] and s <= s_p[1]:
                t0 = max(0, (s_p[0] - s) / L); t1 = min(1, (s_p[1] - s) / L)
                if not cut: cut.append((a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0))
                cut.append((a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1))
            s += L
        center = resample(cut, 2.0)
        # продление оси по прямой (конечная станция у края участка: пути дальше — в тупики/депо)
        e0, e1 = cfg.get('extend', (0, 0))
        if e1 > 0:
            (ax, az), (bx, bz) = center[-6], center[-1]; L = math.hypot(bx - ax, bz - az)
            center += [(bx + (bx - ax) / L * d, bz + (bz - az) / L * d) for d in range(2, int(e1) + 1, 2)]
        if e0 > 0:
            (ax, az), (bx, bz) = center[5], center[0]; L = math.hypot(bx - ax, bz - az)
            center = [(bx + (bx - ax) / L * d, bz + (bz - az) / L * d) for d in range(int(e0), 0, -2)] + center
        # направление «вперёд по линии» (dir 0): по касательной у станции и порядку станций задаётся в игре; ось — от одного портала к другому
        Lc = poly_len(center)
        s_station = nearest_on(center, pc)[1]
        if cfg.get('focus'):
            # станция вне участка: расстояние вдоль пути от начала участка до станции (со знаком)
            tr = resample(A[0] if False else tracks[0][0], 2.0)
            s_c0 = nearest_on(tr, center[0])[1]; s_c1 = nearest_on(tr, center[-1])[1]; s_pc = nearest_on(tr, pc)[1]
            s_station = (s_pc - s_c0) if s_c1 > s_c0 else (s_c0 - s_pc)
        # мосты: проекции мостовых сегментов обоих путей на ось
        br = []
        for pts, kinds in tracks:
            for i in range(len(pts) - 1):
                if kinds[i] == 'bridge':
                    sa = nearest_on(center, pts[i])[1]; sb = nearest_on(center, pts[i + 1])[1]
                    br.append((min(sa, sb), max(sa, sb)))
        br.sort(); mb = []
        for a, b in br:
            if mb and a <= mb[-1][1] + 8: mb[-1][1] = max(mb[-1][1], b)
            else: mb.append([a, b])
        mb = [[round(a, 1), round(b, 1)] for a, b in mb if b - a > 15]
        res['zone'] = {'center': [round(v, 2) for p in center for v in p], 'length': round(Lc, 1), 'station': round(s_station, 1), 'spacing': spacing, 'bridges': mb}
        # станции линии на оси участка (для длин перегонов)
        seen_st = {}
        for n, (la, lo, t) in nodes.items():
            if t.get('railway') == 'station' and t.get('station') == 'subway' and t.get('name'):
                d_, s_, q_ = nearest_on(center, XY[n])
                if d_ < 30 and (t['name'] not in seen_st or d_ < seen_st[t['name']][0]): seen_st[t['name']] = (d_, s_)
        print(area, 'stations on axis', sorted(((round(v[1]), k) for k, v in seen_st.items())), file=sys.stderr)
        if cfg.get('crop'):
            xs, zs = center[0::1], None
            cx = [p[0] for p in center]; cz = [p[1] for p in center]; mg = cfg['crop']
            X0, Z0 = max(X0, min(cx) - mg), max(Z0, min(cz) - mg)
            X1, Z1 = min(X1, max(cx) + mg), min(Z1, max(cz) + mg)
            res['bounds'] = [round(X0), round(Z0), round(X1), round(Z1)]
        print(area, 'zone', round(Lc), 'm, station at', round(s_station), 'spacing', spacing, 'bridges', mb, file=sys.stderr)

    # ---------- растровая карта местности ----------
    W = int((X1 - X0) / PX) + 1; H = int((Z1 - Z0) / PX) + 1
    img = Image.new('RGB', (W, H), (176, 170, 156))
    dr = ImageDraw.Draw(img)
    water = Image.new('L', (W, H), 0); wdr = ImageDraw.Draw(water)
    green = Image.new('L', (W, H), 0); gdr = ImageDraw.Draw(green)  # 1 — парк, 2 — лес
    def px(p): return ((p[0] - X0) / PX, (p[1] - Z0) / PX)
    polys = []
    for w, (nd, t) in ways.items():
        if len(nd) > 3 and nd[0] == nd[-1]:
            polys.append((t, wpts(nd)))
    for r, (mem, t) in rels.items():
        if t.get('type') == 'multipolygon':
            land = t.get('landuse') in ('forest', 'grass', 'meadow', 'recreation_ground') or t.get('natural') in ('wood', 'scrub', 'grassland') or t.get('leisure') in ('park', 'garden')
            for ring in ring_from_rel(mem, ways, allow_open=land): polys.append((t, wpts(ring)))
    # площади по порядку
    layered = []
    for t, pts in polys:
        for k, v, col, order in AREA_COL:
            if t.get(k) == v: layered.append((order, col, pts, t)); break
    for order, col, pts, t in sorted(layered, key=lambda x: x[0]):
        if len(pts) > 2: dr.polygon([px(p) for p in pts], fill=col)
        if t.get('leisure') in ('park', 'garden') or t.get('landuse') in ('grass', 'recreation_ground', 'meadow', 'cemetery'):
            gdr.polygon([px(p) for p in pts], fill=1)
        if t.get('landuse') == 'forest' or t.get('natural') in ('wood', 'scrub'):
            gdr.polygon([px(p) for p in pts], fill=2)
    # вода: закрытые водоёмы + заливка от оси реки до берегов
    for t, pts in polys:
        if t.get('natural') == 'water' or t.get('waterway') == 'riverbank' or t.get('landuse') in ('reservoir', 'basin'):
            wdr.polygon([px(p) for p in pts], fill=255)
    banks = Image.new('L', (W, H), 0); bdr = ImageDraw.Draw(banks)
    river_pts = []
    for r, (mem, t) in rels.items():
        if t.get('natural') == 'water' and t.get('water') == 'river':
            for typ, ref, role in mem:
                if typ == 'way' and ref in ways: bdr.line([px(p) for p in wpts(ways[ref][0])], fill=255, width=3)
    def open_river(t): return t.get('waterway') == 'river' and t.get('tunnel') not in ('culvert', 'yes') and not str(t.get('layer', '0')).startswith('-')
    for w, (nd, t) in ways.items():
        if open_river(t): river_pts += wpts(nd)
    if river_pts:
        import collections
        bd = banks.load(); wm = water.load()
        q = collections.deque()
        for p in river_pts:
            x, y = map(int, px(p))
            if 0 <= x < W and 0 <= y < H and bd[x, y] == 0 and wm[x, y] == 0: wm[x, y] = 255; q.append((x, y))
        while q:
            x, y = q.popleft()
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < W and 0 <= ny < H and wm[nx, ny] == 0 and bd[nx, ny] == 0: wm[nx, ny] = 255; q.append((nx, ny))
        # если берег не замкнулся и вода разлилась на всю карту — откат к широкой линии по оси реки
        # ширина реки: тег width или по названию (Москва-река ~200 м, малые реки ~35 м)
        def rw(t):
            try: return float(str(t.get('width')).replace(',', '.'))
            except ValueError: return 200 if 'Москва' in t.get('name', '') else 35
        exp_area = 0
        def inb(p): return X0 <= p[0] <= X1 and Z0 <= p[1] <= Z1
        for w, (nd, t) in ways.items():
            if open_river(t):
                pts = wpts(nd)
                # только часть реки внутри карты участка
                for i in range(len(pts) - 1):
                    if inb(pts[i]) or inb(pts[i + 1]): exp_area += math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) * rw(t)
        wat_area = sum(1 for v in water.getdata() if v) * PX * PX
        if wat_area > 2.5 * exp_area:
            water = Image.new('L', (W, H), 0); wdr = ImageDraw.Draw(water)
            for w, (nd, t) in ways.items():
                if open_river(t): wdr.line([px(p) for p in wpts(nd)], fill=255, width=max(3, int(rw(t) / PX)))
        water = water.filter(ImageFilter.MaxFilter(3))
    img.paste(WATER, mask=water)
    # дороги: сначала тротуары/дорожки, затем проезжая часть
    roads = [(t, wpts(nd)) for w, (nd, t) in ways.items() if 'highway' in t and t.get('area') != 'yes']
    def width(t):
        w = ROAD_W.get(t['highway'], 0)
        try:
            if 'lanes' in t and t['highway'] not in ('footway', 'path', 'cycleway', 'steps'): w = max(w, float(t['lanes'].split(';')[0]) * 3.4)
            if 'width' in t: w = float(t['width'].replace(',', '.').split()[0])
        except ValueError: pass
        return w
    for t, pts in roads:
        if t['highway'] in ('footway', 'path', 'steps', 'cycleway', 'pedestrian', 'track') and t.get('tunnel') != 'yes':
            col = (168, 160, 148) if t['highway'] != 'cycleway' else (150, 92, 80)
            dr.line([px(p) for p in pts], fill=col, width=max(1, int(width(t) / PX)), joint='curve')
    for t, pts in roads:
        h = t['highway']
        if h in ('footway', 'path', 'steps', 'cycleway', 'pedestrian', 'track') or t.get('tunnel') == 'yes': continue
        w = width(t)
        if w <= 0: continue
        dr.line([px(p) for p in pts], fill=(150, 148, 144), width=int((w + 1.6) / PX), joint='curve')  # бордюр
        dr.line([px(p) for p in pts], fill=(74, 76, 80), width=max(1, int(w / PX)), joint='curve')
    # разметка на широких дорогах
    for t, pts in roads:
        if t.get('highway') in ('primary', 'secondary', 'trunk', 'tertiary') and t.get('tunnel') != 'yes':
            dr.line([px(p) for p in pts], fill=(200, 198, 190), width=1)
    # железные дороги и трамвай
    for w, (nd, t) in ways.items():
        if t.get('railway') in ('rail', 'tram', 'light_rail') and t.get('tunnel') != 'yes':
            dr.line([px(p) for p in wpts(nd)], fill=(110, 104, 96), width=int(4 / PX))
            dr.line([px(p) for p in wpts(nd)], fill=(60, 58, 54), width=1)
    # шум, чтобы земля не была «плоской заливкой»
    noise = Image.effect_noise((W, H), 18).convert('L')
    img = Image.composite(img, Image.blend(img, Image.merge('RGB', (noise, noise, noise)), 0.12), Image.new('L', (W, H), 200))
    img = img.filter(ImageFilter.SMOOTH)
    scale = min(1.0, 2048 / max(W, H))
    tw, th = int(W * scale), int(H * scale)
    img.resize((tw, th), Image.LANCZOS).save(os.path.join(OUT, f'{area}_ground.jpg'), quality=80, optimize=True)
    wm_small = water.resize((max(2, int(W * PX / 5)), max(2, int(H * PX / 5))), Image.BILINEAR)
    wm_small.save(os.path.join(OUT, f'{area}_water.png'), optimize=True)
    res['tex'] = {'x0': round(X0, 1), 'z0': round(Z0, 1), 'x1': round(X0 + W * PX, 1), 'z1': round(Z0 + H * PX, 1)}

    # ---------- здания ----------
    def num(v, d=None):
        try: return float(str(v).replace(',', '.').split(';')[0].split()[0])
        except (ValueError, IndexError): return d
    blds = []
    cand = []
    def add_b(t, pts):
        if len(pts) < 4: return
        lv = num(t.get('building:levels'))
        h = num(t.get('height'))
        bt = t.get('building', t.get('building:part', 'yes'))
        if h is None:
            if lv is not None: h = lv * 3.1 + 1.5
            else: h = {'garage': 3, 'garages': 3, 'shed': 3, 'kiosk': 3, 'roof': 5, 'house': 7, 'detached': 7, 'industrial': 9, 'warehouse': 9, 'church': 18,
                       'apartments': 30, 'residential': 30, 'commercial': 14, 'retail': 7, 'school': 12, 'office': 20, 'service': 4, 'hangar': 10, 'construction': 12}.get(bt, 9)
        mh = num(t.get('min_height'), 0) or ((num(t.get('building:min_level'), 0) or 0) * 3.1)
        if bt == 'roof': mh = max(mh, h - 1.2)
        kind = 0  # 0 — панельный/жилой, 1 — кирпич, 2 — офисное стекло, 3 — промышленный, 4 — исторический/церковь
        mat = t.get('building:material', '')
        if bt in ('industrial', 'warehouse', 'garage', 'garages', 'shed', 'hangar', 'service'): kind = 3
        elif bt in ('office', 'commercial') or 'glass' in mat or (h > 45 and bt not in ('apartments', 'residential')): kind = 2
        elif 'brick' in mat or bt in ('house', 'detached', 'school', 'kindergarten'): kind = 1
        elif bt in ('church', 'cathedral', 'chapel') or t.get('historic'): kind = 4
        col = t.get('building:colour', '')
        ring = pts[:-1] if pts[0] == pts[-1] else pts
        # ориентация против часовой (для выдавливания)
        a2 = sum(ring[i][0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * ring[i][1] for i in range(len(ring)))
        if a2 > 0: ring = ring[::-1]
        if abs(a2) / 2 < 6: return
        if bt in ('roof', 'bridge', 'carport') or t.get('building') == 'roof': return  # навесы на опорах «висели» бы в воздухе
        cand.append({'h': h, 'mh': mh, 'kind': kind, 'col': col, 'ring': ring, 'part': 'building:part' in t and 'building' not in t, 'outline': 'building' in t})
    parts_outline = set()
    for w, (nd, t) in ways.items():
        if 'building:part' in t: parts_outline.add(w)
    for w, (nd, t) in ways.items():
        if nd[0] == nd[-1] and ('building' in t or 'building:part' in t):
            if 'building' in t and t.get('building') != 'no':
                # здание с частями — рисуем только части (иначе внешний контур закроет их)
                if t.get('building:part') or any(w2 in parts_outline for w2 in []): pass
                add_b(t, wpts(nd))
            elif 'building:part' in t:
                add_b(t, wpts(nd))
    for r, (mem, t) in rels.items():
        if t.get('type') == 'multipolygon' and 'building' in t:
            for ring in ring_from_rel(mem, ways): add_b(t, wpts(ring))
    # фильтрация: контур здания с частями не рисуем (части задают форму и высоты);
    # часть с min_height без опоры под ней опускаем на землю
    def inside(pt, ring):
        x, z = pt; c = False
        for i in range(len(ring)):
            a, b = ring[i], ring[(i + 1) % len(ring)]
            if (a[1] > z) != (b[1] > z) and x < (b[0] - a[0]) * (z - a[1]) / ((b[1] - a[1]) or 1e-9) + a[0]: c = not c
        return c
    def centroid(r): return (sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r))
    parts = [b for b in cand if b['part']]
    pc_list = [(centroid(b['ring']), b) for b in parts]
    keep = []
    for b in cand:
        if b['outline'] and not b['part']:
            xs = [p[0] for p in b['ring']]; zs = [p[1] for p in b['ring']]
            if any(min(xs) <= c[0] <= max(xs) and min(zs) <= c[1] <= max(zs) and inside(c, b['ring']) for c, _ in pc_list): continue
        keep.append(b)
    for b in keep:
        if b['mh'] > 0.5:
            c = centroid(b['ring'])
            ok = any(o is not b and o['h'] >= b['mh'] - 1.5 and o['mh'] < b['mh'] - 0.5 and inside(c, o['ring']) for o in keep)
            if not ok: b['mh'] = 0
    keep = [b for b in keep if X0 <= centroid(b['ring'])[0] <= X1 and Z0 <= centroid(b['ring'])[1] <= Z1]
    for b in keep:
        blds.append([round(b['h'], 1), round(b['mh'], 1), b['kind'], b['col']] + [int(round(v * 10)) for p in b['ring'] for v in p])
    res['buildings'] = blds
    # ---------- мосты дорог ----------
    rb = []
    for t, pts in roads:
        if t.get('bridge') == 'yes' and t['highway'] not in ('footway', 'path', 'steps', 'cycleway'):
            rb.append([round(max(5, width(t) + 2), 1)] + [int(round(v * 10)) for p in pts for v in p])
    res['roadBridges'] = rb
    # ---------- деревья ----------
    trees = []
    for n, (la, lo, t) in nodes.items():
        if t.get('natural') == 'tree':
            x, z = XY[n]
            if X0 <= x <= X1 and Z0 <= z <= Z1: trees.append((x, z))
    gm = green.load(); wmL = water.load()
    for i in range(int((X1 - X0) * (Z1 - Z0) / 90)):
        x = random.uniform(X0, X1); z = random.uniform(Z0, Z1)
        u, v = int((x - X0) / PX), int((z - Z0) / PX)
        if not (0 <= u < W and 0 <= v < H) or wmL[u, v]: continue
        g = gm[u, v]
        if g == 2 or (g == 1 and random.random() < 0.18): trees.append((x, z))
    # не сажаем деревья на пути метро и рядом
    if cfg['zone']:
        c = res['zone']['center']; cl = [(c[i], c[i + 1]) for i in range(0, len(c), 2)]
        trees = [p for p in trees if nearest_on(cl, p)[0] > 9]
    random.shuffle(trees)
    if cfg['zone']:
        # ближе к трассе — гуще (их видно из кабины), дальше — реже
        cl2 = resample(cl, 20.0)
        def dist(p): return min(math.hypot(p[0] - q[0], p[1] - q[1]) for q in cl2)
        trees.sort(key=lambda p: dist(p) + random.random() * 250)
    trees = trees[:7000]
    res['trees'] = [int(round(v * 10)) for p in trees for v in p]
    print(area, len(blds), 'buildings', len(trees), 'trees', len(rb), 'road bridges', f'{W}x{H} px ground', file=sys.stderr)
    json.dump(res, open(os.path.join(OUT, f'{area}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


for a, cfg in AREAS.items():
    if len(sys.argv) > 3 and a not in sys.argv[3:]: continue
    build(a, cfg)
