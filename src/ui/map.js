// Схема метро (из MHT-файла moscowmap.ru, без МЦК и МЦД) с положением поезда.
import { SCHEME } from '../data/scheme.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent = null) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};

export class MetroMap {
  constructor(container) {
    this.root = container;
    this.svg = el('svg', { class: 'scheme', xmlns: NS });
    container.appendChild(this.svg);
    this.colors = Object.fromEntries(SCHEME.lines.map((l) => [l.id, l.color]));
    this.st = Object.fromEntries(SCHEME.stations.map((s) => [s.id, s]));
    this.vb = { x: 0, y: 0, w: SCHEME.viewBox[2], h: SCHEME.viewBox[3] };
    this._draw();
    this._bind();
    this.active = null;
  }

  _draw() {
    const svg = this.svg;
    el('rect', { x: -2000, y: -2000, width: 6000, height: 6000, fill: 'var(--map-bg, #f4f4f4)' }, svg);
    this.gLines = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-width': 5 }, svg);
    this.segEls = [];
    for (const s of SCHEME.segs) {
      const p = el('path', { d: s.d, stroke: this.colors[s.l], 'data-line': s.l }, this.gLines);
      if (s.uc) { p.setAttribute('stroke-dasharray', '8 6'); p.setAttribute('opacity', '0.45'); }
      this.segEls.push({ seg: s, el: p });
    }
    const gc = el('g', { fill: '#ffffff', stroke: '#666', 'stroke-width': 1.2 }, svg);
    for (const c of SCHEME.conns) el('path', { d: c.d }, gc);
    this.gSt = el('g', {}, svg);
    for (const s of SCHEME.stations) {
      const c = this.colors[s.line];
      const r = s.uc ? 3 : 4.5;
      el('circle', {
        cx: s.x, cy: s.y, r,
        fill: s.t ? '#ffffff' : c, stroke: s.t ? c : '#ffffff', 'stroke-width': s.t ? 2.4 : 1.4,
        opacity: s.uc ? 0.5 : 1, 'data-line': s.line, 'data-id': s.id,
      }, this.gSt);
    }
    this.gTxt = el('g', { 'font-family': 'PT Sans, Arial, sans-serif', 'font-size': 12.5, fill: '#333' }, svg);
    for (const l of SCHEME.labels) {
      const uc = l.ids.every((i) => this.st[i]?.uc);
      const t = el('text', { x: l.x, y: l.y, 'text-anchor': l.a, opacity: uc ? 0.5 : 1, 'data-lines': l.ids.map((i) => this.st[i]?.line).join(' ') }, this.gTxt);
      t.textContent = l.t;
    }
    // значки линий у конечных
    this.gBadges = el('g', {}, svg);
    for (const ln of SCHEME.lines) {
      const ids = SCHEME.stations.filter((s) => s.line === ln.id).map((s) => s.id);
      const deg = new Map(ids.map((i) => [i, 0]));
      for (const s of SCHEME.segs) if (s.l === ln.id) { deg.set(s.a, (deg.get(s.a) || 0) + 1); deg.set(s.b, (deg.get(s.b) || 0) + 1); }
      const ends = ids.filter((i) => deg.get(i) === 1);
      for (const id of ends) {
        const s = this.st[id];
        const g = el('g', { transform: `translate(${s.x},${s.y - 22})` }, this.gBadges);
        el('circle', { r: 10, fill: ln.color }, g);
        const t = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-size': ln.num.length > 1 ? 10 : 12, 'font-weight': 700, 'font-family': 'Arial' }, g);
        t.textContent = ln.num;
      }
    }
    // маркер поезда
    this.marker = el('g', { class: 'train-marker', visibility: 'hidden' }, svg);
    el('circle', { r: 16, class: 'pulse' }, this.marker);
    el('circle', { r: 8, fill: '#111', stroke: '#fff', 'stroke-width': 2.5 }, this.marker);
    el('circle', { r: 3, fill: '#ffd23a' }, this.marker);
    this._apply();
  }

  _apply() {
    const v = this.vb;
    this.svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
  }

  _bind() {
    const svg = this.svg;
    const pts = new Map();
    let last = null;
    const toSvg = (cx, cy) => {
      const r = svg.getBoundingClientRect();
      const sx = this.vb.w / r.width, sy = this.vb.h / r.height;
      const s = Math.max(sx, sy);
      const ox = (r.width * s - this.vb.w) / 2, oy = (r.height * s - this.vb.h) / 2;
      return { x: this.vb.x - ox + (cx - r.left) * s, y: this.vb.y - oy + (cy - r.top) * s, s };
    };
    svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); last = null; });
    svg.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        const { s } = toSvg(e.clientX, e.clientY);
        this.vb.x -= (e.clientX - prev.x) * s; this.vb.y -= (e.clientY - prev.y) * s;
        this._apply();
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (last) this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, last / d);
        last = d;
      }
    });
    const up = (e) => { pts.delete(e.pointerId); last = null; };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    this._toSvg = toSvg;
  }

  zoomAt(cx, cy, f) {
    const p = this._toSvg(cx, cy);
    const nw = Math.min(3000, Math.max(120, this.vb.w * f));
    const k = nw / this.vb.w;
    this.vb.x = p.x - (p.x - this.vb.x) * k; this.vb.y = p.y - (p.y - this.vb.y) * k;
    this.vb.w = nw; this.vb.h *= k;
    this._apply();
  }

  zoomBy(f) { const r = this.svg.getBoundingClientRect(); this.zoomAt(r.left + r.width / 2, r.top + r.height / 2, f); }

  centerOn(x, y, w = 520) {
    const r = this.svg.getBoundingClientRect();
    const asp = r.height / Math.max(1, r.width) || 1.4;
    this.vb.w = w; this.vb.h = w * asp;
    this.vb.x = x - w / 2; this.vb.y = y - this.vb.h / 2;
    this._apply();
  }

  showAll() {
    const r = this.svg.getBoundingClientRect();
    const asp = r.height / Math.max(1, r.width) || 1.4;
    const W = SCHEME.viewBox[2], H = SCHEME.viewBox[3];
    if (H / W > asp) { this.vb.h = H; this.vb.w = H / asp; } else { this.vb.w = W; this.vb.h = W * asp; }
    this.vb.x = (W - this.vb.w) / 2; this.vb.y = (H - this.vb.h) / 2;
    this._apply();
  }

  highlight(lineId) {
    this.active = lineId;
    const dim = (e, l) => e.setAttribute('opacity', !lineId || l === lineId ? (e.dataset.uc ? 0.45 : 1) : 0.28);
    for (const { seg, el: p } of this.segEls) {
      if (!seg.uc) dim(p, seg.l);
    }
    for (const c of this.gSt.children) if (!this.st[c.dataset.id]?.uc) c.setAttribute('opacity', !lineId || c.dataset.line === lineId ? 1 : 0.35);
    for (const t of this.gTxt.children) t.setAttribute('opacity', !lineId || t.dataset.lines.split(' ').includes(lineId) ? 1 : 0.4);
  }

  // положение поезда между станциями: sidA -> sidB, f — доля пути
  trainPos(sidA, sidB, f) {
    const A = this.st[sidA], B = this.st[sidB];
    if (!A) return null;
    if (!B || f <= 0) return { x: A.x, y: A.y };
    if (f >= 1) return { x: B.x, y: B.y };
    const s = this.segEls.find(({ seg }) => (seg.a === sidA && seg.b === sidB) || (seg.a === sidB && seg.b === sidA));
    if (s) {
      const p = s.el;
      const L = p.getTotalLength();
      // ориентация пути: от какого конца начинается
      const p0 = p.getPointAtLength(0);
      const fromA = Math.hypot(p0.x - A.x, p0.y - A.y) < Math.hypot(p0.x - B.x, p0.y - B.y);
      const pt = p.getPointAtLength((fromA ? f : 1 - f) * L);
      return { x: pt.x, y: pt.y };
    }
    return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f };
  }

  setTrain(pos) {
    if (!pos) { this.marker.setAttribute('visibility', 'hidden'); return; }
    this.marker.setAttribute('visibility', 'visible');
    this.marker.setAttribute('transform', `translate(${pos.x},${pos.y})`);
    this.trainXY = pos;
  }

  stationXY(sid) { const s = this.st[sid]; return s ? { x: s.x, y: s.y } : null; }
}
