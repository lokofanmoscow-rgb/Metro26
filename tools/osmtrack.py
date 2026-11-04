# Оси путей метро из OSM: цепочки путей линии, участки тоннель/мост/наземный, станции
import math
from collections import defaultdict
class Proj:
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.kx = 111320 * math.cos(math.radians(lat0)); self.kz = 110540
    def __call__(self, lat, lon): return ((lon - self.lon0) * self.kx, -(lat - self.lat0) * self.kz)
    def inv(self, x, z): return (self.lat0 - z / self.kz, self.lon0 + x / self.kx)

def chains(nodes, ways, line_name):
    """Цепочки сегментов пути линии (без служебных путей), склеенные по общим узлам."""
    segs = {w: (nd, t) for w, (nd, t) in ways.items() if t.get('railway') == 'subway' and 'service' not in t and (t.get('name') == line_name or t.get('name:ru') == line_name)}
    ends = defaultdict(list)
    for w, (nd, t) in segs.items():
        ends[nd[0]].append(w); ends[nd[-1]].append(w)
    used, out = set(), []
    for w in segs:
        if w in used: continue
        # идём от w в обе стороны
        chain = [(w, False)]; used.add(w)
        for direction in (1, -1):
            cur = w; node = segs[w][0][-1] if direction == 1 else segs[w][0][0]
            while True:
                cand = [x for x in ends[node] if x not in used]
                if len(cand) != 1: break
                x = cand[0]; used.add(x)
                nd = segs[x][0]
                rev = nd[-1] == node
                if direction == 1: chain.append((x, rev)); node = nd[0] if rev else nd[-1]
                else: chain.insert(0, (x, not rev)); node = nd[-1] if rev else nd[0]
        pts = []
        for x, rev in chain:
            nd, t = segs[x]
            seq = nd[::-1] if rev else nd
            kind = 'tunnel' if t.get('tunnel') == 'yes' else 'bridge' if t.get('bridge') == 'yes' else 'covered' if t.get('covered') == 'yes' else 'open'
            for i, n in enumerate(seq):
                if pts and i == 0: continue
                if n in nodes: pts.append((nodes[n][0], nodes[n][1], kind, n))
        out.append(pts)
    return out
