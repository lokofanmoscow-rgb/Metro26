// Трасса линии: план (прямые и круговые кривые), продольный профиль, зоны
// (станции, тоннели, открытые участки) и ограничения скорости.
// Система координат поезда/станции: вперёд = -Z, вправо = +X, вверх = +Y.
import * as THREE from 'three';
import { mulberry32, hashStr, clamp } from './util.js';

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

export function stationLevel(st) {
  if (st.t === 'ground' || st.t === 'bridge') return 0;
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
    const scale = shortSpans ? 0.5 : 1;
    const dist = (i) => Math.max(shortSpans ? 650 : 700, Math.round(fwd[i].d * scale / 10) * 10);
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
      const a = toRoute(cf[byName[o.from[0]]] + o.from[1]);
      const b = toRoute(cf[byName[o.to[0]]] + o.to[1]);
      return { s0: Math.min(a, b), s1: Math.max(a, b), kind: o.kind };
    });
    this._buildPlan();
    this._buildProfile();
    this._buildZones();
  }

  _buildPlan() {
    const rng = mulberry32(hashStr(this.line.id + ':' + this.dir));
    const straight = [];
    for (const st of this.stations) straight.push([st.c - ZONE_HALF, st.c + ZONE_HALF]);
    for (const o of this.outdoor) straight.push([o.s0 - 40, o.s1 + 40]);
    straight.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const iv of straight) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([...iv]);
    }
    const segs = []; // {len, k}
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
    for (const [a, b] of merged) {
      const a2 = Math.max(a, 0), b2 = Math.min(b, this.length);
      if (a2 > s) pushFree(s, a2);
      if (b2 > Math.max(s, a2)) segs.push({ len: b2 - Math.max(s, a2), k: 0 });
      s = Math.max(s, b2);
    }
    if (s < this.length) segs.push({ len: this.length - s, k: 0 });
    // интегрирование плана
    this.pieces = [];
    let x = 0, z = 0, h = 0; s = 0;
    for (const sg of segs) {
      if (sg.len <= 0.01) continue;
      this.pieces.push({ s0: s, len: sg.len, k: sg.k, x0: x, z0: z, h0: h });
      const p = this._piecePos(this.pieces[this.pieces.length - 1], sg.len);
      x = p.x; z = p.z; h = p.h; s += sg.len;
    }
  }

  _piecePos(pc, t) {
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
    ctrl.push({ s: -1000, y: st[0].level });
    for (let i = 0; i < st.length; i++) {
      ctrl.push({ s: st[i].c - ZONE_HALF, y: st[i].level });
      ctrl.push({ s: st[i].c + ZONE_HALF, y: st[i].level });
      if (i < st.length - 1) {
        const a = st[i].c + ZONE_HALF, b = st[i + 1].c - ZONE_HALF;
        const outs = this.outdoor.filter((o) => o.s1 > a && o.s0 < b);
        for (const o of outs) {
          if (o.s0 > a) ctrl.push({ s: o.s0, y: 0 });
          if (o.s1 < b) ctrl.push({ s: o.s1, y: 0 });
        }
        if (!outs.length && st[i].level < -1 && st[i + 1].level < -1) {
          const L = b - a;
          const dip = clamp(L * 0.0045, 1.5, 7);
          ctrl.push({ s: (a + b) / 2, y: Math.min(st[i].level, st[i + 1].level) - dip });
        }
      }
    }
    ctrl.push({ s: this.length + 1000, y: st[st.length - 1].level });
    ctrl.sort((p, q) => p.s - q.s);
    // убрать подземные точки внутри открытых участков
    this.yCtrl = ctrl.filter((p) => !(inOut(p.s) && p.y !== 0));
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
    for (const o of this.outdoor) cuts.push({ s0: o.s0, s1: o.s1, kind: 'outdoor', out: o.kind });
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
    this.zones = zones;
    this.innerStations = cuts.filter((c) => c.kind === 'station' && isInOutdoor(c));
  }

  isOutdoor(s) { return this.outdoor.some((o) => s >= o.s0 && s <= o.s1); }
  outdoorAt(s) { return this.outdoor.find((o) => s >= o.s0 && s <= o.s1) || null; }

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
    const R = Math.abs(pc.k) > 1e-9 ? 1 / Math.abs(pc.k) : Infinity;
    if (R < 700) lim = 60; else if (R < 1000) lim = 70;
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
