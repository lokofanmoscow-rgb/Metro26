// Трасса линии: план (прямые и круговые кривые), продольный профиль, зоны
// (станции, тоннели, открытые участки) и ограничения скорости.
// Система координат поезда/станции: вперёд = -Z, вправо = +X, вверх = +Y.
import * as THREE from 'three';
import { mulberry32, hashStr, clamp } from './util.js';
import { trackPolyline, frameMatrix } from './osm.js';

export const PLATFORM_LEN = 162;
export const STOP_OFFSET = 78; // от центра платформы до остановочной отметки (голова поезда)
const ZONE_HALF = 120; // прямой и горизонтальный участок вокруг станции
export const HALL_HALF = 84; // длина зала станции / 2

function ease(t, b = 0.28) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const k = 1 / (2 * b * (1 - b));
  if (t < b) return t * t * k;
  if (t > 1 - b) return 1 - (1 - t) * (1 - t) * k;
  return (t - b / 2) / (1 - b);
}

export const BRIDGE_RISE = 5; // подъём пути на открытых метромостах над землёй
export const PORTAL_D = 6.5; // глубина пути у портала (рампа ниже уровня земли)
export const GLASS_TYPES = ['ground', 'bridge', 'side'];
// развилка (вилочное движение): стрелка в FORK_D м от центра станции, камера съезда длиной FORK_LC,
// затем пути расходятся по отдельным тоннелям; отклоняющий путь — кривая радиусом FORK_R
export const FORK_D = 300, FORK_LC = 52, FORK_R = 250, FORK_ARC = 120, FORK_FIX = 270;

export function stationLevel(st) {
  if (GLASS_TYPES.includes(st.t)) return 0;
  const dp = st.dp || 8;
  return -(5 + Math.min(dp, 55) * 0.42);
}

export class Route {
  constructor(line, dir, { shortSpans = false } = {}) {
    this.line = line;
    this.dir = dir;
    this.shortSpans = shortSpans;
    const fwd = line.stations;
    const n = fwd.length;
    const minSpan = line.minSpan ?? 700;
    const dist = (i) => Math.max(minSpan, line.exactD ? fwd[i].d : Math.round(fwd[i].d / 10) * 10);
    // центры станций в «прямых» координатах
    const cf = [260];
    for (let i = 0; i < n - 1; i++) cf.push(cf[i] + dist(i));
    const totalF = cf[n - 1] + 320;
    const order = dir === 0 ? fwd.map((_, i) => i) : fwd.map((_, i) => n - 1 - i);
    const toRoute = (sF) => (dir === 0 ? sF : totalF - sF);
    this.length = totalF;
    this.stations = order.map((fi, k) => {
      const st = fwd[fi];
      const c = toRoute(cf[fi]);
      return {
        k, fi, name: st.n, sid: st.sid, style: st, c,
        stop: c + STOP_OFFSET, p0: c - PLATFORM_LEN / 2, p1: c + PLATFORM_LEN / 2,
        deep: !!st.deep, level: stationLevel(st),
      };
    });
    const byName = Object.fromEntries(fwd.map((s, i) => [s.n, i]));
    this.outdoor = (line.outdoor || []).map((o) => {
      if (o.osm) {
        // реальная ось из OpenStreetMap; участок привязан к станции внутри него
        const poly = trackPolyline(o.osm, !!o.rev !== (dir === 1));
        const c = toRoute(cf[byName[o.anchor]]);
        const s0 = c - poly.station;
        // глубина пути у порталов: одна для обоих концов или [у начала участка OSM, у конца]
        const rv = !!o.rev !== (dir === 1);
        const pa = Array.isArray(o.portal) ? o.portal : [o.portal ?? PORTAL_D, o.portal ?? PORTAL_D];
        const pd0 = rv ? pa[1] : pa[0], pd1 = rv ? pa[0] : pa[1];
        return { s0, s1: s0 + poly.length, kind: o.kind, osm: o.osm, poly, oppX: o.kind === 'open' || o.kind === 'gallery' ? -poly.spacing : -12.96, rev: rv, pd0, pd1, pd: Math.max(pd0, pd1), rise: o.rise ?? BRIDGE_RISE, portalBuilding: !!o.portalBuilding, elev: !!o.elev };
      }
      const a = toRoute(cf[byName[o.from[0]]] + o.from[1]);
      const b = toRoute(cf[byName[o.to[0]]] + o.to[1]);
      return { s0: Math.min(a, b), s1: Math.max(a, b), kind: o.kind, oppX: -12.96 };
    });
    this.polyZones = this.outdoor.filter((o) => o.poly);
    // станции на эстакаде/метромосту реального участка — на высоте пролётов
    for (const o of this.polyZones) for (const st of this.stations) {
      const x = st.c - o.s0;
      if (x > 0 && x < o.s1 - o.s0 && o.poly.bridges.some(([a, b]) => x > a - 30 && x < b + 30) && o.rise > 0.5) { st.level = o.rise; st.elev = true; }
    }
    // развилка за станцией line.fork.at: по ходу от начала линии ответвление — после станции
    this.fork = null;
    if (line.fork) {
      const st = this.stations.find((x) => x.name === line.fork.at);
      const sg = dir === 0 ? 1 : -1;
      const J = st.c + sg * FORK_D;
      this.fork = { st, sg, J, turn: line.fork.turn, a: sg > 0 ? J : J - FORK_LC, b: sg > 0 ? J + FORK_LC : J };
    }
    // на открытом участке у станции с островной платформой встречный путь отходит на ширину платформы
    for (const o of this.polyZones) {
      const isl = this.stations.filter((st) => st.c > o.s0 && st.c < o.s1 && st.style.t !== 'side' && st.style.t !== 'bridge');
      const base = o.oppX;
      if (!isl.length || (o.kind !== 'open' && o.kind !== 'gallery')) { o.oppAt = () => base; continue; }
      const X = -12.96, B = 110;
      o.oppAt = (s) => {
        let v = base;
        for (const st of isl) {
          const d = Math.abs(s - st.c) - HALL_HALF;
          const t = d <= 0 ? 0 : d >= B ? 1 : ease(d / B, 0.5);
          v = Math.min(v, X + (base - X) * t);
        }
        return v;
      };
    }
    this._buildPlan();
    this._buildProfile();
    this._buildZones();
  }

  _buildPlan() {
    const rng = mulberry32(hashStr(this.line.id + ':' + this.dir));
    const polys = [...this.polyZones].sort((a, b) => a.s0 - b.s0);
    const inPoly = (a, b) => polys.filter((p) => b > p.s0 && a < p.s1);
    // прямые участки: станции и прочие наземные участки, кроме попавших на реальную ось
    let straight = [];
    for (const st of this.stations) straight.push([st.c - ZONE_HALF, st.c + ZONE_HALF]);
    for (const o of this.outdoor) if (!o.poly) straight.push([o.s0 - 40, o.s1 + 40]);
    straight.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const iv of straight) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([...iv]);
    }
    // вычитаем участки с реальной осью
    straight = [];
    for (const [a, b] of merged) {
      let parts = [[a, b]];
      for (const p of inPoly(a, b)) {
        const next = [];
        for (const [x, y] of parts) { if (y <= p.s0 || x >= p.s1) next.push([x, y]); else { if (x < p.s0) next.push([x, p.s0]); if (y > p.s1) next.push([p.s1, y]); } }
        parts = next;
      }
      straight.push(...parts);
    }
    const fixed = [...straight.map(([a, b]) => ({ a, b, type: 's' })), ...polys.map((p) => ({ a: p.s0, b: p.s1, type: 'p', zone: p }))];
    if (this.fork) {
      // от станции до стрелки и после неё — заданный план (прямая; у ответвления — кривая вправо),
      // одинаковый для обоих маршрутов линии, чтобы второй путь развилки совпадал с нашим
      const F = this.fork, c = F.st.c, sg = F.sg;
      const k = F.turn ? F.turn / FORK_R : 0;
      const parts = sg > 0
        ? [[c + ZONE_HALF, F.J, 0], [F.J, F.J + FORK_ARC, k], [F.J + FORK_ARC, F.J + FORK_FIX, 0]]
        : [[F.J - FORK_FIX, F.J - FORK_ARC, 0], [F.J - FORK_ARC, F.J, -k], [F.J, c - ZONE_HALF, 0]];
      const free = (x) => !fixed.some((f) => x > f.a + 0.01 && x < f.b - 0.01);
      for (const [a, b, kk] of parts) if (free((a + b) / 2) && b > a) fixed.push({ a, b, type: 'k', k: kk });
    }
    fixed.sort((x, y) => x.a - y.a);
    const segs = []; // {len, k} или {len, poly}
    let s = 0;
    const pushFree = (a, b) => {
      const L = b - a;
      if (L < 260) { segs.push({ len: L, k: 0 }); return; }
      const nc = L > 1300 ? (rng() < 0.7 ? 2 : 1) : (rng() < 0.75 ? 1 : 0);
      if (nc === 0) { segs.push({ len: L, k: 0 }); return; }
      const arcs = [];
      let sign = rng() < 0.5 ? -1 : 1;
      for (let i = 0; i < nc; i++) {
        const R = 450 + rng() * 1100;
        const A = Math.min(R * (0.12 + rng() * 0.35), L * 0.33 / nc + 60);
        arcs.push({ len: A, k: sign / R });
        if (rng() < 0.7) sign = -sign;
      }
      const used = arcs.reduce((t, a) => t + a.len, 0);
      const gaps = nc + 1;
      const free = L - used;
      const w = []; for (let i = 0; i < gaps; i++) w.push(0.6 + rng());
      const wsum = w.reduce((t, x) => t + x, 0);
      for (let i = 0; i < gaps; i++) {
        segs.push({ len: free * w[i] / wsum, k: 0 });
        if (i < nc) segs.push(arcs[i]);
      }
    };
    for (const f of fixed) {
      const a2 = Math.max(f.a, 0), b2 = Math.min(f.b, this.length);
      if (a2 > s) pushFree(s, a2);
      const st = Math.max(s, a2);
      // участок OSM, начинающийся до начала трассы, — с пропуском своей начальной части
      if (b2 > st) segs.push(f.type === 'p' ? { len: b2 - st, zone: f.zone, skip: Math.max(0, Math.round(st - f.a)) } : { len: b2 - st, k: f.k || 0 });
      s = Math.max(s, b2);
    }
    if (s < this.length) segs.push({ len: this.length - s, k: 0 });
    // интегрирование плана
    this.pieces = [];
    let x = 0, z = 0, h = 0; s = 0;
    for (const sg of segs) {
      if (sg.len <= 0.01) continue;
      const pc = { s0: s, len: sg.len, k: sg.k || 0, x0: x, z0: z, h0: h };
      if (sg.zone) {
        // реальная ось: поворачиваем полилинию OSM так, чтобы её начало продолжило трассу
        const P = sg.zone.poly;
        const sk = Math.min(sg.skip || 0, P.pts.length - 2);
        const beta = h - P.hs[sk];
        const cb = Math.cos(beta), sb = Math.sin(beta);
        const n = P.pts.length - sk;
        const wx = new Float64Array(n), wz = new Float64Array(n), wh = new Float64Array(n);
        const p0 = P.pts[sk];
        for (let i = 0; i < n; i++) {
          const dx = P.pts[sk + i].x - p0.x, dz = P.pts[sk + i].z - p0.z;
          wx[i] = x + cb * dx + sb * dz; wz[i] = z - sb * dx + cb * dz; wh[i] = P.hs[sk + i] + beta;
        }
        pc.poly = { wx, wz, wh, ks: sk ? P.ks.slice(sk) : P.ks };
        sg.zone.envMatrix = frameMatrix(beta, p0.x, p0.z, x, 0, z);
      }
      this.pieces.push(pc);
      const p = this._piecePos(pc, sg.len);
      x = p.x; z = p.z; h = p.h; s += sg.len;
    }
  }

  _piecePos(pc, t) {
    if (pc.poly) {
      const P = pc.poly, n = P.wx.length;
      const tt = clamp(t, 0, n - 1);
      const i = Math.min(n - 2, Math.floor(tt)), f = tt - i;
      if (t > n - 1) { // за концом полилинии — по прямой
        const e = t - (n - 1);
        return { x: P.wx[n - 1] - Math.sin(P.wh[n - 1]) * e, z: P.wz[n - 1] - Math.cos(P.wh[n - 1]) * e, h: P.wh[n - 1] };
      }
      return { x: P.wx[i] + (P.wx[i + 1] - P.wx[i]) * f, z: P.wz[i] + (P.wz[i + 1] - P.wz[i]) * f, h: P.wh[i] + (P.wh[i + 1] - P.wh[i]) * f };
    }
    const { k, x0, z0, h0 } = pc;
    if (Math.abs(k) < 1e-9) return { x: x0 - Math.sin(h0) * t, z: z0 - Math.cos(h0) * t, h: h0 };
    const h = h0 + k * t;
    return { x: x0 + (Math.cos(h) - Math.cos(h0)) / k, z: z0 - (Math.sin(h) - Math.sin(h0)) / k, h };
  }

  _piece(s) {
    const P = this.pieces;
    let lo = 0, hi = P.length - 1;
    if (s <= 0) return P[0];
    if (s >= P[hi].s0) return P[hi];
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (P[mid].s0 <= s) lo = mid; else hi = mid - 1;
    }
    return P[lo];
  }

  _buildProfile() {
    const ctrl = [];
    const st = this.stations;
    const inOut = (s) => this.outdoor.some((o) => s >= o.s0 - 1 && s <= o.s1 + 1);
    const done = new Set();
    ctrl.push({ s: -1000, y: st[0].level });
    for (let i = 0; i < st.length; i++) {
      ctrl.push({ s: st[i].c - ZONE_HALF, y: st[i].level });
      ctrl.push({ s: st[i].c + ZONE_HALF, y: st[i].level });
      if (i < st.length - 1) {
        const a = st[i].c + ZONE_HALF, b = st[i + 1].c - ZONE_HALF;
        const outs = this.outdoor.filter((o) => o.s1 > a && o.s0 < b);
        for (const o of outs) {
          if (!done.has(o) && o.poly) { done.add(o); this._buryBeyond(o, ctrl); }
          if ((o.kind === 'open' || o.kind === 'gallery') && o.poly) { if (!done.has('p:' + o.s0)) { done.add('p:' + o.s0); this._openProfile(o, o.s0 > 1, o.s1 < this.length - 1, ctrl); } continue; }
          if (o.s0 > a) ctrl.push({ s: o.s0, y: 0, keep: true });
          if (o.s1 < b) ctrl.push({ s: o.s1, y: 0, keep: true });
        }
        if (!outs.length && st[i].level < -1 && st[i + 1].level < -1) {
          const L = b - a;
          const dip = clamp(L * 0.0045, 1.5, 7);
          ctrl.push({ s: (a + b) / 2, y: Math.min(st[i].level, st[i + 1].level) - dip });
        }
      }
    }
    if (this.fork) { const F = this.fork; ctrl.push({ s: F.J + F.sg * (FORK_LC + 40), y: F.st.level, keep: true }); }
    ctrl.push({ s: this.length + 1000, y: st[st.length - 1].level });
    ctrl.sort((p, q) => p.s - q.s);
    for (let i = ctrl.length - 1; i > 0; i--) if (ctrl[i].s - ctrl[i - 1].s < 0.5) ctrl.splice(ctrl[i].keep ? i - 1 : i, 1);
    // убрать подземные точки внутри открытых участков
    this.yCtrl = ctrl.filter((p) => p.keep || !(inOut(p.s) && p.y !== 0));
  }

  // Портал на уровне земли: тоннель за ним быстро заглубляется (иначе он торчал бы из рельефа,
  // а земля и дома реального окружения оказывались бы внутри тоннеля)
  _buryBeyond(o, ctrl) {
    const D = 190, Y = -6.4;
    const free = (x) => x > 40 && x < this.length - 40 && this.stations.every((st) => Math.abs(x - st.c) > ZONE_HALF + 40);
    const pd0 = o.kind === 'bridge' ? 0 : o.pd0 ?? o.pd, pd1 = o.kind === 'bridge' ? 0 : o.pd1 ?? o.pd;
    if (pd0 <= 0.5 && o.s0 > 1 && free(o.s0 - D)) ctrl.push({ s: o.s0 - D, y: Y, keep: true });
    if (pd1 <= 0.5 && o.s1 < this.length - 1 && free(o.s1 + D)) ctrl.push({ s: o.s1 + D, y: Y, keep: true });
  }

  // Профиль реального открытого участка: рампы от порталов, подъёмы на метромосты.
  // o.brEff — фактические пролёты мостов (локальные s), укороченные, чтобы уместились уклоны.
  _openProfile(o, portal0, portal1, ctrl) {
    const L = o.s1 - o.s0;
    const G = 0.035;
    const RISE = o.rise;
    const r0 = portal0 ? o.pd0 ?? o.pd : 0, r1 = portal1 ? o.pd1 ?? o.pd : 0;
    const br = [];
    for (const [x0, y0] of o.poly.bridges) {
      const x = Math.max(x0, portal0 ? (r0 + RISE) / G : 0);
      const y = Math.min(y0, portal1 ? L - (r1 + RISE) / G : L);
      if (y - x > 20) br.push([x, y]);
    }
    o.brEff = br;
    const key = [{ s: 0, y: portal0 ? -r0 : (br.length && br[0][0] < 1 ? RISE : 0) }];
    for (const [x, y] of br) { key.push({ s: x, y: RISE, open: true }, { s: y, y: RISE }); }
    key.push({ s: L, y: portal1 ? -r1 : (br.length && br[br.length - 1][1] > L - 1 ? RISE : 0) });
    const pts = [key[0]];
    for (let i = 1; i < key.length; i++) {
      const p = key[i - 1], q = key[i];
      const need = (Math.abs(p.y) + Math.abs(q.y)) / G;
      if (!p.open && q.s - p.s > need + 20) {
        if (p.y !== 0) pts.push({ s: p.s + Math.abs(p.y) / G, y: 0 });
        if (q.y !== 0) pts.push({ s: q.s - Math.abs(q.y) / G, y: 0 });
      }
      pts.push(q);
    }
    for (const p of pts) ctrl.push({ s: o.s0 + p.s, y: p.y, keep: true });
  }

  y(s) {
    const C = this.yCtrl;
    let lo = 0, hi = C.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (C[mid].s <= s) lo = mid; else hi = mid;
    }
    const a = C[lo], b = C[hi];
    const t = (s - a.s) / (b.s - a.s);
    return a.y + (b.y - a.y) * ease(t);
  }

  grade(s) { return (this.y(s + 1) - this.y(s - 1)) / 2; }

  _buildZones() {
    const zones = [];
    const st = this.stations;
    const cuts = [];
    for (const x of st) cuts.push({ s0: x.c - HALL_HALF, s1: x.c + HALL_HALF, kind: 'station', st: x });
    for (const o of this.outdoor) if (o.kind !== 'box') cuts.push({ s0: o.s0, s1: o.s1, kind: 'outdoor', out: o.kind, zone: o });
    cuts.sort((a, b) => a.s0 - b.s0);
    // тоннели между вырезами, станции внутри открытых участков — отдельно
    const deepAt = (s) => {
      let i = 0;
      while (i < st.length - 1 && st[i + 1].c < s) i++;
      if (s < st[0].c) return st[0].deep;
      if (i >= st.length - 1) return st[st.length - 1].deep;
      const mid = (st[i].c + st[i + 1].c) / 2;
      return s < mid ? st[i].deep : st[i + 1].deep;
    };
    this.deepAt = deepAt;
    let s = 0;
    const tunnel = (a, b) => {
      if (b - a < 0.5) return;
      // разрез по смене типа тоннеля
      const pts = [a];
      for (let i = 0; i < st.length - 1; i++) {
        const mid = (st[i].c + st[i + 1].c) / 2;
        if (mid > a && mid < b && st[i].deep !== st[i + 1].deep) pts.push(mid);
      }
      pts.push(b);
      for (let i = 0; i < pts.length - 1; i++) {
        const m = (pts[i] + pts[i + 1]) / 2;
        zones.push({ s0: pts[i], s1: pts[i + 1], kind: 'tunnel', deep: deepAt(m) });
      }
    };
    const outdoorCuts = cuts.filter((c) => c.kind === 'outdoor');
    const isInOutdoor = (c) => outdoorCuts.some((o) => c.s0 >= o.s0 && c.s1 <= o.s1);
    const top = cuts.filter((c) => c.kind === 'outdoor' || !isInOutdoor(c));
    for (const c of top) {
      if (c.s0 > s) tunnel(s, c.s0);
      zones.push(c);
      s = Math.max(s, c.s1);
    }
    if (s < this.length) tunnel(s, this.length);
    if (this.fork) {
      const F = this.fork;
      const i = zones.findIndex((z) => z.kind === 'tunnel' && z.s0 <= F.a && z.s1 >= F.b);
      if (i >= 0) {
        const z = zones[i];
        zones.splice(i, 1, { ...z, s1: F.a }, { s0: F.a, s1: F.b, kind: 'fork', deep: false }, { ...z, s0: F.b });
      }
    }
    this.zones = zones.filter((z) => z.s1 - z.s0 > 0.01);
    this.innerStations = cuts.filter((c) => c.kind === 'station' && isInOutdoor(c));
  }

  // «под открытым небом»: открытые и крытые остеклённые участки, а также наземные станции
  outdoorAt(s) {
    const o = this.outdoor.find((z) => z.kind !== 'box' && s >= z.s0 && s <= z.s1);
    if (o) return o;
    const st = this.stations.find((x) => GLASS_TYPES.includes(x.style.t) && Math.abs(s - x.c) < HALL_HALF + 6);
    return st ? { kind: 'glass', s0: st.c - HALL_HALF, s1: st.c + HALL_HALF } : null;
  }
  isOutdoor(s) { return !!this.outdoorAt(s); }
  // поправка рельефа: участок с реальным окружением, внутри которого лежит точка
  osmZoneAt(s) { return this.polyZones.find((z) => s >= z.s0 - 600 && s <= z.s1 + 600) || null; }

  // Кадр трассы: положение и оси в точке s
  frameAt(s, out = {}) {
    const pc = this._piece(s);
    const t = clamp(s - pc.s0, 0, pc.len + 1000);
    const p = this._piecePos(pc, t);
    const y = this.y(s);
    const g = this.grade(s);
    out.pos = (out.pos || new THREE.Vector3()).set(p.x, y, p.z);
    out.heading = p.h;
    out.curv = pc.k;
    const fwd = (out.fwd || new THREE.Vector3()).set(-Math.sin(p.h), g, -Math.cos(p.h)).normalize();
    const right = (out.right || new THREE.Vector3()).set(Math.cos(p.h), 0, -Math.sin(p.h));
    const back = (out.back || new THREE.Vector3()).copy(fwd).negate();
    const up = (out.up || new THREE.Vector3()).crossVectors(back, right).normalize();
    out.fwd = fwd; out.right = right; out.back = back; out.up = up;
    return out;
  }

  // Матрица мира для локальной системы (X=вправо, Y=вверх, Z=назад) в точке s
  matrixAt(s, m = new THREE.Matrix4(), level = false) {
    const f = this.frameAt(s);
    if (level) {
      f.fwd.y = 0; f.fwd.normalize(); f.back.copy(f.fwd).negate(); f.up.set(0, 1, 0);
    }
    m.makeBasis(f.right, f.up, f.back);
    m.setPosition(f.pos);
    return m;
  }

  // Ограничение скорости АРС (км/ч) для головы поезда в точке s
  speedLimit(s) {
    const pc = this._piece(s + 60);
    let lim = 80;
    let kk = pc.k;
    if (pc.poly) { const i = clamp(Math.floor(s + 60 - pc.s0), 0, pc.poly.ks.length - 1); kk = pc.poly.ks[i]; }
    const R = Math.abs(kk) > 1e-9 ? 1 / Math.abs(kk) : Infinity;
    if (R < 700) lim = 60; else if (R < 1000) lim = 70;
    // отклонение стрелки на ответвление — не более 40 км/ч
    if (this.fork && this.fork.turn) {
      const F = this.fork, a0 = F.sg > 0 ? F.J - 5 : F.J - FORK_ARC, a1 = F.sg > 0 ? F.J + FORK_ARC : F.J + 5;
      if (s + 60 > a0 && s - 160 < a1) lim = Math.min(lim, 40);
    }
    const last = this.stations[this.stations.length - 1];
    if (s > last.stop - 320) lim = Math.min(lim, 60);
    if (s > last.stop + 4) lim = 0;
    const first = this.stations[0];
    if (s < first.stop - 1) lim = Math.min(lim, 40);
    return lim;
  }

  nextStationIndex(s) {
    for (let i = 0; i < this.stations.length; i++) if (this.stations[i].stop > s + 12) return i;
    return this.stations.length - 1;
  }

  stationAt(s) {
    for (const st of this.stations) if (s >= st.p0 - 20 && s <= st.p1 + 25) return st;
    return null;
  }
}
