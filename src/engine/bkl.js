// Детальные станции Большой кольцевой линии. Оформление каждой станции описано в src/data/bkl.js
// (по сферическим панорамам станций с сайта i.transport.mos.ru/bkl: формы и облицовка колонн,
// путевые стены, потолки, светильники, пол, названия). Сами снимки в игре не используются:
// все текстуры процедурные (canvas) или фото-текстуры CC0 из assets/tex с перекраской.
import * as THREE from 'three';
import { HQ, pbr, lampMat, marble, recolor, imgTex, glossyFloor, heightCanvasToNormal } from './hq.js';
import { mergeGeoms, makeCanvas, mulberry32, hashStr } from './util.js';

// ---------- текстуры станции (освобождаются, когда станция выгружается) ----------
const TX = new Map(); // `${станция}|${ключ}` → текстура
const OWN = new Map(); // станция → ключи HQ.cache, созданные при её постройке
let CUR = '';
function T(key, fn) {
  const k = CUR + '|' + key;
  if (TX.has(k)) return TX.get(k);
  const t = fn();
  t.userData.shared = true;
  TX.set(k, t);
  return t;
}
export function releaseBKL(name) {
  for (const [k, t] of TX) if (k.startsWith(name + '|')) { t.dispose(); TX.delete(k); }
  for (const k of OWN.get(name) || []) {
    const t = HQ.cache.get(k);
    if (t && t.dispose) { if (t.userData && t.userData.rt) t.userData.rt.dispose(); t.dispose(); }
    HQ.cache.delete(k);
  }
  OWN.delete(name);
}
function cvTex(c, pu, pv, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.repeat.set(1 / pu, 1 / pv);
  return t;
}
function vnoise(seed) {
  const r = mulberry32(seed);
  const P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = r();
  const g = (i, j) => P[((j & 255) << 8) | (i & 255)];
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return (g(xi, yi) * (1 - u) + g(xi + 1, yi) * u) * (1 - v) + (g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u) * v;
  };
  return (x, y, o = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); a *= 0.5; f *= 2; } return s / (1 - Math.pow(0.5, o)); };
}
function speckle(x, W, H, rng, n = 3000, a = 0.05) {
  for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${rng() < 0.5 ? 0 : 255},${rng() < 0.5 ? 0 : 255},${rng() < 0.5 ? 0 : 255},${a * rng()})`; x.fillRect(rng() * W, rng() * H, 2, 2); }
}
function shadeHex(hex, k) {
  const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k)));
  return '#' + c.getHexString();
}

// генераторы: возвращают { map, nrm? }; pu, pv — метры на один повтор
const G = {
  // глазурованная плитка «кабанчик»
  tile({ c = '#f1f0eb', grout = '#b8b6af', tw = 0.6, th = 0.3, v = 0.03, seed = 1, stagger = true }) {
    const W = 512, H = 512, cols = 4;
    const nr = Math.max(2, Math.round((cols * tw) / th)); // рядов на квадрат текстуры
    const c2 = makeCanvas(W, H), x = c2.getContext('2d'), r = mulberry32(seed);
    x.fillStyle = grout; x.fillRect(0, 0, W, H);
    const cw = W / cols, rh = H / nr;
    for (let j = 0; j < nr; j++) for (let i = -1; i <= cols; i++) {
      const off = stagger && (j & 1) ? cw / 2 : 0;
      const col = shadeHex(c, (r() - 0.5) * v * 2);
      const gx = i * cw + off + 2, gy = j * rh + 2;
      const gr = x.createLinearGradient(gx, gy, gx, gy + rh);
      gr.addColorStop(0, shadeHex(col, 0.03)); gr.addColorStop(1, shadeHex(col, -0.02));
      x.fillStyle = gr; x.fillRect(gx, gy, cw - 4, rh - 4);
    }
    speckle(x, W, H, r, 1500, 0.03);
    return { map: cvTex(c2, cols * tw, nr * th) };
  },
  // горизонтальные «пласты» оттенков серого («Авиамоторная»)
  stripesH({ pal, seed = 2, pu = 8, pv = 4 }) {
    const W = 1024, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed);
    let y = 0;
    while (y < H) {
      const h = 3 + Math.floor(r() * 12);
      let xx = 0;
      while (xx < W) {
        const len = 60 + r() * 380;
        x.fillStyle = pal[Math.floor(r() * pal.length)];
        x.fillRect(xx, y, len + 1, h);
        xx += len;
      }
      y += h;
    }
    speckle(x, W, H, r, 2500, 0.04);
    return { map: cvTex(c, pu, pv) };
  },
  // вертикальные полосы, сходящиеся «ёлочкой» («Лефортово»)
  stripesV({ pal, seed = 3, pu = 6, pv = 4 }) {
    const W = 1024, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed);
    x.fillStyle = pal[0]; x.fillRect(0, 0, W, H);
    const seg = W / 4;
    for (let k = 0; k < 4; k++) {
      const tilt = (k & 1 ? 1 : -1) * 0.16;
      let xx = k * seg;
      while (xx < (k + 1) * seg) {
        const w = 3 + r() * 22;
        x.fillStyle = pal[Math.floor(r() * pal.length)];
        x.beginPath();
        const cx = k * seg + seg / 2, dx0 = (xx - cx) * tilt, dx1 = (xx + w - cx) * tilt;
        x.moveTo(xx, 0); x.lineTo(xx + w, 0); x.lineTo(xx + w + dx1, H); x.lineTo(xx + dx0, H); x.closePath(); x.fill();
        xx += w;
      }
    }
    speckle(x, W, H, r, 2000, 0.04);
    return { map: cvTex(c, pu, pv) };
  },
  // смальтовая мозаика: «вихрь» (Электрозаводская) или диагональные полосы («ЦСКА»)
  mosaic({ pal, seed = 4, kind = 'swirl', cell = 8, pu = 8, pv = 4 }) {
    const W = 1024, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed), n = vnoise(seed);
    x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, W, H);
    for (let j = 0; j < H / cell; j++) for (let i = 0; i < W / cell; i++) {
      const u = i * cell / W, v = j * cell / H;
      let t;
      if (kind === 'bands') { const w = n(u * 4, v * 3) * 0.6; t = (u * 2.4 + v * 1.6 + w) % 1; }
      else { const q = n(u * 3 + 5, v * 3, 3), qq = n(u * 3, v * 3 + 7, 3); t = n(u * 4 + q * 2.5, v * 4 + qq * 2.5, 4); }
      const k = Math.min(pal.length - 1, Math.floor(t * pal.length * 0.999 + (r() - 0.5) * 0.25));
      x.fillStyle = shadeHex(pal[Math.max(0, k)], (r() - 0.5) * 0.12);
      x.fillRect(i * cell + 1, j * cell + 1, cell - 1.5, cell - 1.5);
    }
    return { map: cvTex(c, pu, pv) };
  },
  // «пиксельные» сине-белые панели («Аминьевская»)
  pixel({ c1 = '#e7ebf0', pal = ['#2f5fa8', '#5f8fcf', '#9dbde6'], seed = 5, pu = 4, pv = 2 }) {
    const W = 512, H = 256, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed), n = vnoise(seed);
    x.fillStyle = c1; x.fillRect(0, 0, W, H);
    const s = 5;
    for (let j = 0; j < H / s; j++) for (let i = 0; i < W / s; i++) {
      const d = n(i * s / W * 3, j * s / H * 10);
      if (r() < Math.pow(d, 1.6) * 0.9) { x.fillStyle = pal[Math.floor(r() * pal.length)]; x.fillRect(i * s, j * s, s - 1, s - 1); }
    }
    return { map: cvTex(c, pu, pv) };
  },
  // панели со швами (глянцевые, каменные, металлические)
  panel({ c, seam = 'rgba(0,0,0,0.35)', pw = 1.2, ph = 2.4, nz = 0.03, seed = 6, veins = 0 }) {
    const W = 512, H = Math.max(64, Math.min(1024, Math.round(512 * ph / pw))), c2 = makeCanvas(W, H), x = c2.getContext('2d'), r = mulberry32(seed);
    const gr = x.createLinearGradient(0, 0, W, H); gr.addColorStop(0, shadeHex(c, 0.02)); gr.addColorStop(1, shadeHex(c, -0.03));
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
    for (let i = 0; i < veins; i++) {
      x.strokeStyle = `rgba(90,90,90,${0.05 + r() * 0.12})`; x.lineWidth = 1 + r() * 1.5;
      x.beginPath(); const y0 = r() * H; x.moveTo(0, y0); x.bezierCurveTo(W * 0.3, y0 + (r() - 0.5) * 200, W * 0.6, y0 + (r() - 0.5) * 200, W, y0 + (r() - 0.5) * 160); x.stroke();
    }
    speckle(x, W, H, r, 1800, nz);
    x.fillStyle = seam; x.fillRect(0, 0, 2, H); x.fillRect(0, 0, W, 2);
    return { map: cvTex(c2, pw, ph) };
  },
  // вертикальные деревянные рейки
  wood({ c1 = '#7a5236', c2 = '#5a3a24', gap = '#1e140e', n = 12, seed = 7, pu = 1.2, pv = 1.2 }) {
    const W = 512, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed);
    x.fillStyle = gap; x.fillRect(0, 0, W, H);
    const sw = W / n;
    for (let i = 0; i < n; i++) {
      const col = r() < 0.5 ? c1 : c2;
      x.fillStyle = shadeHex(col, (r() - 0.5) * 0.06); x.fillRect(i * sw + 3, 0, sw - 6, H);
      for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(0,0,0,${0.06 + r() * 0.1})`; x.lineWidth = 1; const xx = i * sw + 4 + r() * (sw - 8); x.beginPath(); x.moveTo(xx, 0); x.bezierCurveTo(xx + (r() - 0.5) * 6, H * 0.3, xx + (r() - 0.5) * 6, H * 0.7, xx, H); x.stroke(); }
    }
    return { map: cvTex(c, pu, pv) };
  },
  // полосы под углом (пол «Новаторской», «зебра» «Мичуринского проспекта»)
  zebra({ c1 = '#f0efeb', c2 = '#1d1d1f', ang = 0, frac = 0.5, pu = 1.2, pv = 1.2, n = 2 }) {
    // ang = 0 — вертикальные полосы, иначе — диагональ 45° (бесшовно при повторе)
    const W = 512, H = 512, c = makeCanvas(W, H), x = c.getContext('2d');
    const A = new THREE.Color(c1), B = new THREE.Color(c2);
    const a = [A.r, A.g, A.b].map((v) => Math.pow(v, 1 / 2.2) * 255), b = [B.r, B.g, B.b].map((v) => Math.pow(v, 1 / 2.2) * 255);
    const d = x.createImageData(W, H), P = W / n;
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const t = ((ang ? xx + y : xx) % P) / P, k = t < frac ? b : a, i = (y * W + xx) * 4;
      d.data[i] = k[0]; d.data[i + 1] = k[1]; d.data[i + 2] = k[2]; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return { map: cvTex(c, pu, pv) };
  },
  // терраццо / зернистый гранит
  terrazzo({ base = '#e9e8e4', chips = ['#2a2a2a', '#8a8a88', '#c9c6c0'], dens = 9000, sz = 3, seed = 8, pu = 1.5, pv = 1.5 }) {
    const W = 512, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed);
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    for (let i = 0; i < dens; i++) { x.fillStyle = chips[Math.floor(r() * chips.length)]; const s = 0.6 + r() * sz; x.beginPath(); x.ellipse(r() * W, r() * H, s, s * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2); x.fill(); }
    return { map: cvTex(c, pu, pv) };
  },
  // белый барельеф («Давыдково»: спасатели, техника, вихри)
  relief({ base = '#ece9e2', seed = 9, pu = 8, pv = 3.2 }) {
    const W = 1024, H = 410, h = makeCanvas(W, H), x = h.getContext('2d'), r = mulberry32(seed);
    x.fillStyle = '#808080'; x.fillRect(0, 0, W, H);
    x.filter = 'blur(3px)';
    for (let i = 0; i < 26; i++) { // ленты-вихри
      x.strokeStyle = `rgb(${150 + r() * 80},${150 + r() * 80},${150 + r() * 80})`; x.lineWidth = 6 + r() * 22; x.lineCap = 'round';
      x.beginPath(); const x0 = r() * W, y0 = r() * H; x.moveTo(x0, y0); x.bezierCurveTo(x0 + (r() - 0.5) * 400, y0 + (r() - 0.5) * 300, x0 + (r() - 0.5) * 400, y0 + (r() - 0.5) * 300, x0 + (r() - 0.5) * 500, y0 + (r() - 0.5) * 200); x.stroke();
    }
    for (let i = 0; i < 30; i++) { // фигуры
      const cx = r() * W, cy = H * (0.25 + r() * 0.6), s = 14 + r() * 26, v = 170 + r() * 70;
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.beginPath(); x.ellipse(cx, cy - s * 1.6, s * 0.45, s * 0.5, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(cx, cy, s * 0.6, s * 1.15, (r() - 0.5) * 0.6, 0, Math.PI * 2); x.fill();
      x.fillRect(cx - s * 0.5, cy + s * 0.6, s * 0.35, s * 1.4); x.fillRect(cx + s * 0.15, cy + s * 0.6, s * 0.35, s * 1.4);
    }
    for (let i = 0; i < 10; i++) { const v = 60 + r() * 40; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.arc(r() * W, r() * H, 8 + r() * 30, 0, Math.PI * 2); x.fill(); }
    x.filter = 'none';
    const nrm = heightCanvasToNormal(h, 5);
    const hd = x.getImageData(0, 0, W, H).data;
    const m = makeCanvas(W, H), mx = m.getContext('2d'), md = mx.createImageData(W, H);
    const B = new THREE.Color(base);
    const b = [B.r, B.g, B.b].map((v) => Math.pow(v, 1 / 2.2) * 255);
    for (let y = 1; y < H - 1; y++) for (let xx = 1; xx < W - 1; xx++) {
      const i = (y * W + xx) * 4;
      const dx = hd[i + 4] - hd[i - 4], dy = hd[i + W * 4] - hd[i - W * 4];
      const sh = Math.max(0.55, Math.min(1.12, 0.92 - (dx + dy) * 0.004));
      md.data[i] = b[0] * sh; md.data[i + 1] = b[1] * sh; md.data[i + 2] = b[2] * sh; md.data[i + 3] = 255;
    }
    mx.putImageData(md, 0, 0);
    nrm.repeat.set(1 / pu, 1 / pv);
    return { map: cvTex(m, pu, pv), nrm };
  },
  // коллаж в духе конструктивистских плакатов («Сокольники»)
  posters({ seed = 10, pu = 16, pv = 3.2 }) {
    const W = 1024, H = 205, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed);
    const pal = ['#c8202a', '#1f3f8f', '#141414', '#efe8d8', '#d8c9a8', '#8f2a24', '#3f6fb4'];
    x.fillStyle = '#e9e1cf'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      x.fillStyle = pal[Math.floor(r() * pal.length)];
      x.save(); x.translate(r() * W, r() * H); x.rotate((r() < 0.3 ? (r() - 0.5) * 0.9 : 0));
      x.fillRect(-r() * 80, -r() * 50, 20 + r() * 140, 10 + r() * 90); x.restore();
    }
    for (let i = 0; i < 26; i++) { const v = 40 + r() * 140; x.fillStyle = `rgba(${v},${v},${v},0.85)`; x.fillRect(r() * W, r() * H, 18 + r() * 50, 22 + r() * 60); }
    const words = ['МЕТРО', 'МОСКВА', '1935', 'МЕТРОСТРОЙ', 'СТАХАНОВЦЫ', 'РЕКОРД', 'СЛАВА'];
    for (let i = 0; i < 9; i++) { x.fillStyle = r() < 0.5 ? '#ffffff' : '#c8202a'; x.font = `900 ${22 + r() * 34}px Arial Black, Arial, sans-serif`; x.fillText(words[Math.floor(r() * words.length)], r() * (W - 120), 30 + r() * (H - 30)); }
    return { map: cvTex(c, pu, pv) };
  },
  // вертикальные каннелюры («Терехово»)
  flutes({ c = '#e8e8e5', pu = 0.6, pv = 1, n = 4 }) {
    const W = 256, H = 64, h = makeCanvas(W, H), x = h.getContext('2d');
    const sw = W / n;
    for (let i = 0; i < W; i++) { const t = (i % sw) / sw; const v = Math.round(255 * Math.sin(t * Math.PI)); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1, H); }
    const nrm = heightCanvasToNormal(h, 3);
    nrm.repeat.set(1 / pu, 1 / pv);
    const m = makeCanvas(W, H), mx = m.getContext('2d');
    for (let i = 0; i < W; i++) { const t = (i % sw) / sw; mx.fillStyle = shadeHex(c, (Math.sin(t * Math.PI) - 0.7) * 0.1); mx.fillRect(i, 0, 1, H); }
    return { map: cvTex(m, pu, pv), nrm };
  },
  // медно-оранжевая плитка разной высоты («Проспект Вернадского»)
  copper({ seed = 11, pu = 3, pv = 3, pal = ['#a64f1e', '#c2662a', '#d97c32', '#e8964a', '#b85a24', '#f0a860'] }) {
    const W = 512, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed);
    x.fillStyle = '#3a1e0e'; x.fillRect(0, 0, W, H);
    const cw = W / 6;
    for (let i = 0; i < 6; i++) { let y = 0; while (y < H) { const h = 40 + r() * 90; const gr = x.createLinearGradient(i * cw, y, i * cw + cw, y + h); const col = pal[Math.floor(r() * pal.length)]; gr.addColorStop(0, shadeHex(col, 0.06)); gr.addColorStop(1, shadeHex(col, -0.05)); x.fillStyle = gr; x.fillRect(i * cw + 2, y + 2, cw - 4, h - 4); y += h; } }
    return { map: cvTex(c, pu, pv) };
  },
  // шахматка из квадратов серого, серебристого и чёрного (потолок «Проспекта Вернадского»)
  checker({ seed = 12, pal = ['#1d1e20', '#3a3c3f', '#6d7074', '#9a9ea2', '#c6c9cc'], pu = 6, pv = 6, n = 5 }) {
    const W = 512, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(seed);
    const s = W / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { x.fillStyle = pal[Math.floor(r() * pal.length)]; x.fillRect(i * s + 1, j * s + 1, s - 2, s - 2); }
    return { map: cvTex(c, pu, pv) };
  },
  // тюбинги (кольца обделки) — u вдоль дуги свода, v вдоль зала
  tubbing({ c = '#1e1f22', rib = '#34363a', pu = 2.0, pv = 1.4 }) {
    const W = 256, H = 256, h = makeCanvas(W, H), x = h.getContext('2d');
    x.fillStyle = '#606060'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#d0d0d0'; x.fillRect(0, 0, W, 20); x.fillRect(0, 0, 16, H);
    x.fillStyle = '#9a9a9a'; for (const [a, b] of [[70, 128], [180, 128]]) { x.beginPath(); x.arc(a, b, 9, 0, Math.PI * 2); x.fill(); }
    const nrm = heightCanvasToNormal(h, 4); nrm.repeat.set(1 / pu, 1 / pv);
    const m = makeCanvas(W, H), mx = m.getContext('2d');
    mx.fillStyle = c; mx.fillRect(0, 0, W, H); mx.fillStyle = rib; mx.fillRect(0, 0, W, 20); mx.fillRect(0, 0, 16, H);
    return { map: cvTex(m, pu, pv), nrm };
  },
  // белый мрамор с ромбической раскладкой («Кленовый бульвар»)
  rhomb({ c = '#e9e8e4', seam = 'rgba(120,120,120,0.45)', pu = 1.6, pv = 1.6, seed = 13 }) {
    const W = 512, H = 512, cc = makeCanvas(W, H), x = cc.getContext('2d'), r = mulberry32(seed);
    x.fillStyle = c; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) { x.strokeStyle = `rgba(110,110,110,${0.05 + r() * 0.1})`; x.lineWidth = 1 + r() * 2; x.beginPath(); const y0 = r() * H; x.moveTo(0, y0); x.bezierCurveTo(W / 3, y0 + (r() - 0.5) * 160, W * 2 / 3, y0 + (r() - 0.5) * 160, W, y0); x.stroke(); }
    x.strokeStyle = seam; x.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * W, 0); x.lineTo(k * W + W, H); x.stroke(); x.beginPath(); x.moveTo(k * W + W, 0); x.lineTo(k * W, H); x.stroke(); }
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W, H / 2); x.lineTo(W / 2, H); x.lineTo(0, H / 2); x.closePath(); x.stroke();
    return { map: cvTex(cc, pu, pv) };
  },
  // бетон с пятнами и швами панелей («Печатники», «Мнёвники»)
  concrete({ c = '#c9c8c4', pw = 2.4, ph = 1.2, seed = 14, blot = 0.08 }) {
    const W = 512, H = 256, cc = makeCanvas(W, H), x = cc.getContext('2d'), r = mulberry32(seed), n = vnoise(seed);
    const C = new THREE.Color(c); const b = [C.r, C.g, C.b].map((v) => Math.pow(v, 1 / 2.2) * 255);
    const d = x.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      const f = 1 + (n(xx / 60, y / 60, 4) - 0.5) * blot * 2 + (r() - 0.5) * 0.04;
      const i = (y * W + xx) * 4; d.data[i] = b[0] * f; d.data[i + 1] = b[1] * f; d.data[i + 2] = b[2] * f; d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    x.fillStyle = 'rgba(40,40,40,0.35)'; x.fillRect(0, 0, 2, H); x.fillRect(0, 0, W, 2);
    return { map: cvTex(cc, pw, ph) };
  },
};

// ---------- материалы ----------
// описание: '#цвет' | { c, r, m, e } | { g: [тёмный, светлый] } — перекрашенный гранит |
// { mb: {...} } — процедурный мрамор | { t: 'генератор', ...параметры }
function makeMaterial(d) {
  if (typeof d === 'string') d = { c: d };
  const o = { roughness: d.r ?? 0.35, metalness: d.m ?? 0, emissive: d.e ?? 0.08, envI: d.env ?? 1, side: d.ds ? THREE.DoubleSide : THREE.FrontSide };
  if (d.g) {
    const t = recolor('graniteCol', d.g[0], d.g[1]).clone(); t.needsUpdate = true; t.repeat.set(1 / (d.gs || 3), 1 / (d.gs || 3)); t.userData.shared = false;
    o.map = t;
    // карта нормалей — одна общая копия на каждый масштаб (иначе на каждой станции новая текстура)
    const nk = 'gn:' + (d.gs || 3);
    let nm = HQ.cache.get(nk);
    if (!nm) { nm = imgTex('graniteNrm', false).clone(); nm.needsUpdate = true; nm.repeat.copy(t.repeat); nm.userData.shared = true; HQ.cache.set(nk, nm); }
    o.normalMap = nm; o.normalScale = d.ns ?? 0.35;
  } else if (d.mb) {
    const t = marble('bkl:' + CUR + ':' + JSON.stringify(d.mb).slice(0, 80), { size: 512, slabX: 0.5, slabY: 0.5, scale: 3, veinSharp: 14, veinAmt: 0.6, darkAmt: 0.3, seed: hashStr(CUR) % 97, ...d.mb });
    t.repeat.set(1 / (d.gs || 2.4), 1 / (d.gs || 2.4));
    o.map = t;
  } else if (d.t) {
    const k = d.t + ':' + JSON.stringify(d);
    const r = T(k, () => { const res = G[d.t](d); if (res.nrm) { res.map.userData.nrm = res.nrm; res.nrm.userData.shared = true; TX.set(CUR + '|' + k + ':n', res.nrm); } return res.map; });
    o.map = r;
    if (r.userData.nrm) { o.normalMap = r.userData.nrm; o.normalScale = d.ns ?? 1; }
  } else o.color = d.c ?? '#ffffff';
  const m = pbr(o);
  if (d.op != null) { m.transparent = true; m.opacity = d.op; m.depthWrite = false; }
  return m;
}
// часто используемые материалы
const K = {
  black: { c: '#111214', r: 0.12 },
  blackG: { g: ['#0b0b0c', '#2c2c2e'], r: 0.12 },
  steel: { c: '#c3c7cb', m: 0.92, r: 0.22, e: 0.03 },
  steelD: { c: '#8e9297', m: 0.9, r: 0.3, e: 0.02 },
  white: { c: '#eeeeec', r: 0.5 },
  whiteP: { c: '#f2f2f0', r: 0.6, e: 0.14 },
  greyC: { c: '#3a3c40', r: 0.5 },
  glass: { c: '#b9cfd6', r: 0.05, op: 0.25 },
  wood: { c: '#a8784c', r: 0.45 },
};
function resolve(d) { return typeof d === 'string' && K[d] ? K[d] : d; }

// ---------- геометрия ----------
function uvMeters(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
    else if (ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  return g;
}
function box(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return uvMeters(g); }
function wallG(x, y0, y1, z0, z1, f) { const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0); g.rotateY(f > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2); return uvMeters(g); }
function floorG(y, x0, x1, z0, z1, up = true) { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(up ? -Math.PI / 2 : Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); return uvMeters(g); }
function zWall(x0, x1, y0, y1, z, f) { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); if (f < 0) g.rotateY(Math.PI); g.translate((x0 + x1) / 2, (y0 + y1) / 2, z); return uvMeters(g); }
function quad(a, b, c, d) { // четырёхугольник по точкам (против часовой — лицом к наблюдателю)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2));
  g.computeVertexNormals();
  return uvMeters(g);
}
function instanced(geom, mat, items) {
  const im = new THREE.InstancedMesh(geom, mat, items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  items.forEach((it, i) => {
    e.set(it.rx || 0, it.ry || 0, it.rz || 0); q.setFromEuler(e);
    s.set(it.sx || 1, it.sy || 1, it.sz || 1); p.set(it.x, it.y || 0, it.z);
    m.compose(p, q, s); im.setMatrixAt(i, m);
    if (it.c && im.setColorAt) im.setColorAt(i, new THREE.Color(it.c));
  });
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}
// колонна высотой H от y = 0
function colGeom(c, H) {
  const w = c.w ?? 0.9, d = c.d ?? w;
  let g;
  if (c.shape === 'round') { g = new THREE.CylinderGeometry(w / 2, w / 2, H, 28, 1); g.translate(0, H / 2, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * w, uv.getY(i) * H); return g; }
  if (c.shape === 'oct') { g = new THREE.CylinderGeometry(w / 2, w / 2, H, 8, 1); g.rotateY(Math.PI / 8); g.translate(0, H / 2, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * w, uv.getY(i) * H); return g; }
  g = new THREE.BoxGeometry(w, H, d, 1, c.shape === 'facet' ? 2 : 1, 1);
  g.translate(0, H / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i), t = y / H;
    let x = p.getX(i), z = p.getZ(i);
    if (c.shape === 'tilt') { const k = 1 + ((c.top ?? 1.4) - 1) * t, kd = 1 + ((c.topD ?? 1) - 1) * t; x *= k; z *= kd; }
    if (c.shape === 'facet') {
      // гранёная «скрученная» колонна: середина шире, верх повёрнут
      const a = (c.twist ?? 0.45) * t, k = t > 0.3 && t < 0.7 ? 1.18 : 1;
      const xx = x * k, zz = z * k;
      x = xx * Math.cos(a) - zz * Math.sin(a); z = xx * Math.sin(a) + zz * Math.cos(a);
    }
    p.setXYZ(i, x, y, z);
  }
  g = g.toNonIndexed(); g.computeVertexNormals();
  return uvMeters(g);
}
function textTex(text, { fg = '#1e1e1e', bg = null, font = '600 96px "PT Sans","Arial",sans-serif', spacing = 0.18, w = 2048, h = 160, upper = true, glow = null }) {
  return T('txt:' + text + fg + bg + font + spacing + w, () => {
    const c = makeCanvas(w, h), x = c.getContext('2d');
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
    x.font = font; x.textBaseline = 'middle';
    const label = upper ? text.toUpperCase() : text;
    const chars = [...label], widths = chars.map((ch) => x.measureText(ch).width), gap = spacing * h;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let cx = (w - total) / 2;
    if (glow) { x.shadowColor = glow; x.shadowBlur = 18; }
    x.fillStyle = fg;
    chars.forEach((ch, i) => { x.fillText(ch, cx, h / 2 + 4); cx += widths[i] + gap; });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.userData.text = true; t.userData.aspect = total / h + 0.4;
    return t;
  });
}
function lace() {
  return T('lace', () => {
    const W = 512, H = 256, c = makeCanvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff'; x.strokeStyle = '#fff';
    for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
      const cx = i * 64 + 32 + (j & 1 ? 32 : 0), cy = j * 64 + 32;
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.beginPath(); x.ellipse(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, 9, 4, a, 0, Math.PI * 2); x.fill(); }
      x.beginPath(); x.arc(cx, cy, 6, 0, Math.PI * 2); x.fill();
      x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 28, 0, Math.PI * 2); x.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
    return t;
  });
}
// рыба из смальты (альфа по силуэту)
function fishTex(kind) {
  return T('fish' + kind, () => {
    const W = 512, H = 200, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(31 + kind);
    const L = kind === 0 ? 0.92 : kind === 1 ? 0.7 : 0.8, Hh = kind === 0 ? 0.28 : kind === 1 ? 0.62 : 0.45;
    x.beginPath();
    x.ellipse(W * 0.45, H / 2, W * L * 0.42, H * Hh * 0.5, 0, 0, Math.PI * 2);
    x.moveTo(W * (0.45 + L * 0.38), H / 2); x.lineTo(W * 0.98, H * 0.2); x.lineTo(W * 0.94, H / 2); x.lineTo(W * 0.98, H * 0.8); x.closePath();
    x.moveTo(W * 0.38, H * (0.5 - Hh * 0.45)); x.lineTo(W * 0.5, H * 0.04); x.lineTo(W * 0.6, H * (0.5 - Hh * 0.42)); x.closePath();
    x.save(); x.clip();
    const pal = kind === 1 ? ['#5d6b4a', '#7e8a5e', '#3e4632', '#9aa27a', '#b8905a'] : ['#6e7378', '#8e9398', '#4a4e52', '#b2b6ba', '#7a5a44'];
    for (let j = 0; j < H; j += 7) for (let i = 0; i < W; i += 7) { x.fillStyle = pal[Math.floor(r() * pal.length)]; x.fillRect(i, j, 6, 6); }
    x.restore();
    x.fillStyle = '#101010'; x.beginPath(); x.arc(W * (0.45 - L * 0.3), H * 0.45, 7, 0, Math.PI * 2); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// ---------- основное: зал станции ----------
// g: { PLs: [[x0, x1]], TR: [x], xMin, xMax, PL, HZ, PLAT_Y, BED_Y, info, name, our, spots }
export function* buildBKL(grp, g, s) {
  CUR = g.name;
  const before = new Set(HQ.cache.keys());
  const { PLs, TR, xMin, xMax, PL, HZ, BED_Y, info } = g;
  const PY = g.PLAT_Y;
  const H = s.h ?? 5.0, Yc = PY + H;
  info.ceilY = Yc; info.customNames = true; info.noCamSet = true; info.noCam = [];
  info.hq = true; info.bkl = true;
  const cacheM = new Map();
  const M = (d) => { d = resolve(d); const k = JSON.stringify(d); if (!cacheM.has(k)) cacheM.set(k, makeMaterial(d)); return cacheM.get(k); };
  const add = (geoms, mat) => { if (geoms.length) grp.add(new THREE.Mesh(mergeGeoms(geoms), M(mat))); };
  const near = (a, b) => Math.abs(a - b) < 0.08;
  const edgesOf = ([a, b]) => ({ L: TR.some((x) => near(x + 1.48, a)), R: TR.some((x) => near(x - 1.48, b)) });
  const our = g.our;
  yield;

  // ----- пол платформ -----
  const fl = s.floor || {};
  const flMat = fl.t ? { ...fl, t: fl.t } : { g: fl.g || ['#7f7f7c', '#cfcfcb'], r: fl.r ?? 0.18 };
  add(PLs.map(([a, b]) => floorG(PY, a, b, -PL, PL)), flMat);
  const flDark = { g: fl.g2 || ['#262627', '#4a4a4b'], r: 0.16 };
  const fx = [];
  for (const P of PLs) {
    const [a, b] = P, e = edgesOf(P);
    if (fl.pat === 'edge') { if (e.L) fx.push(floorG(PY + 0.002, a + 1.0, a + 1.5, -PL, PL)); if (e.R) fx.push(floorG(PY + 0.002, b - 1.5, b - 1.0, -PL, PL)); }
    if (fl.pat === 'sides') { if (e.L) fx.push(floorG(PY + 0.002, a + 0.95, a + (fl.w ?? 3.0), -PL, PL)); if (e.R) fx.push(floorG(PY + 0.002, b - (fl.w ?? 3.0), b - 0.95, -PL, PL)); }
    if (fl.pat === 'center') fx.push(floorG(PY + 0.002, (a + b) / 2 - (fl.w ?? 1.2), (a + b) / 2 + (fl.w ?? 1.2), -PL, PL));
    if (fl.pat === 'cross') for (let z = -PL + 4; z < PL - 2; z += fl.step ?? 8) fx.push(floorG(PY + 0.002, a + 1, b - 1, z, z + (fl.w ?? 0.6)));
  }
  add(fx, flDark);
  if (our) { info.reflector = glossyFloor(our[0], our[1], -PL, PL, PY, fl.gl ?? 0.3); grp.add(info.reflector); }
  yield;

  // ----- стены (у островной — путевые, у береговых — за платформами) -----
  const bands = s.wall || [[H, 'white']];
  for (const [x, f] of [[xMin, 1], [xMax, -1]]) {
    let y0 = BED_Y - 0.4;
    for (const [top, mat] of bands) {
      const y1 = PY + (top === 'top' ? H : top);
      if (y1 > y0 + 0.01) add([wallG(x, y0, Math.min(y1, Yc), -HZ, HZ, f)], mat);
      y0 = y1;
    }
    if (y0 < Yc) add([wallG(x, y0, Yc, -HZ, HZ, f)], bands[bands.length - 1][1]);
  }
  // цветные глянцевые участки стен («Нижегородская»: оранжевый, жёлтый, зелёный, синий)
  if (s.wallSeg) {
    const WS = s.wallSeg, byCol = new Map();
    for (const [x, f] of [[xMin, 1], [xMax, -1]]) {
      let k = f > 0 ? 0 : 2;
      for (let z = -HZ; z < HZ - 0.1; z += WS.len, k++) {
        const col = WS.cols[k % WS.cols.length];
        if (!byCol.has(col)) byCol.set(col, []);
        byCol.get(col).push(wallG(x + f * 0.02, PY + WS.y0, PY + WS.y1, z, Math.min(HZ, z + WS.len), f));
      }
    }
    for (const [col, gs] of byCol) add(gs, { t: 'panel', c: col, pw: 1.2, ph: WS.y1 - WS.y0, r: 0.08, e: 0.12 });
  }
  // проёмы-«иллюминаторы» в верхней части стен («Электрозаводская»)
  if (s.portholes) {
    const P = s.portholes, ring = new THREE.TorusGeometry(P.r, 0.07, 10, 40), disc = new THREE.CircleGeometry(P.r - 0.03, 40);
    const items = [], ditems = [];
    for (let z = -PL + P.step / 2; z < PL; z += P.step) for (const [x, f] of [[xMin, 1], [xMax, -1]]) { items.push({ x: x + f * 0.05, y: PY + P.y, z, ry: Math.PI / 2 }); ditems.push({ x: x + f * 0.03, y: PY + P.y, z, ry: f > 0 ? Math.PI / 2 : -Math.PI / 2 }); }
    grp.add(instanced(ring, M('steel'), items));
    grp.add(instanced(disc, lampMat(1.6, 0xf4f6f8), ditems));
  }
  // светящаяся полоса у основания стен («Текстильщики»)
  if (s.baseGlow) {
    const bg = [];
    for (const [x, f] of [[xMin, 1], [xMax, -1]]) bg.push(box(0.04, 0.08, 2 * PL, x + f * 0.04, PY + 0.18, 0));
    grp.add(new THREE.Mesh(mergeGeoms(bg), lampMat(2.6, new THREE.Color(s.baseGlow).getHex())));
  }
  yield;

  // ----- световые короба над путями -----
  const sf = s.soffit;
  if (sf) {
    const sb = [], led = [], lbox = [];
    for (const x of TR) {
      let x0 = x - 1.7, x1 = x + 1.7;
      if (xMax - x1 < 1.4) x1 = xMax; if (x0 - xMin < 1.4) x0 = xMin;
      const y0 = PY + sf.y;
      sb.push(floorG(y0, x0, x1, -HZ, HZ, false));
      if (x1 < xMax - 0.01) { sb.push(wallG(x1, y0, Yc, -HZ, HZ, 1)); if (sf.led !== false) led.push(box(0.08, 0.05, 2 * HZ, x1 - 0.06, y0 - 0.02, 0)); if (sf.box) lbox.push(wallG(x1 + 0.005, y0 + 0.05, y0 + 0.05 + sf.box, -PL, PL, 1)); }
      if (x0 > xMin + 0.01) { sb.push(wallG(x0, y0, Yc, -HZ, HZ, -1)); if (sf.led !== false) led.push(box(0.08, 0.05, 2 * HZ, x0 + 0.06, y0 - 0.02, 0)); if (sf.box) lbox.push(wallG(x0 - 0.005, y0 + 0.05, y0 + 0.05 + sf.box, -PL, PL, -1)); }
    }
    add(sb, sf.mat || 'black');
    if (led.length) grp.add(new THREE.Mesh(mergeGeoms(led), lampMat(sf.i ?? 4.5, 0xfafcff)));
    if (lbox.length) grp.add(new THREE.Mesh(mergeGeoms(lbox), lampMat(sf.bi ?? 2.4, 0xf6f8ff)));
  }
  yield;

  // ----- колонны -----
  const C = s.cols ? { ...s.cols } : null;
  const rows = [];
  if (C) {
    for (const P of PLs) {
      const [a, b] = P, e = edgesOf(P), off = C.off ?? 2.6;
      if (C.rows === 'isl' || !C.rows) { if (b - a >= 6) { if (e.L) rows.push({ x: a + off, y0: PY }); if (e.R) rows.push({ x: b - off, y0: PY }); } }
      if (C.rows === 'edge') { if (e.L) rows.push({ x: a + 0.9, y0: PY }); if (e.R) rows.push({ x: b - 0.9, y0: PY }); }
      if (C.rows === 'center') rows.push({ x: (a + b) / 2, y0: PY });
    }
    let midGap = 99;
    if (C.rows === 'mid') { const ts = [...TR].sort((p, q) => p - q); for (let i = 0; i < ts.length - 1; i++) if (ts[i + 1] - ts[i] > 3 && !PLs.some(([a, b]) => a > ts[i] && b < ts[i + 1])) { rows.push({ x: (ts[i] + ts[i + 1]) / 2, y0: BED_Y }); midGap = Math.min(midGap, ts[i + 1] - ts[i]); } }
    // габарит подвижного состава: колонны между путями не шире междупутья минус 2 × (1,35 + 0,2) м
    if (midGap < 99) {
      const mw = midGap - 3.1, w0 = Math.min(C.w ?? 0.9, mw);
      C.w = w0; if (C.shape === 'tilt') C.top = Math.min(C.top ?? 1.4, mw / w0);
      if (C.shape === 'facet') C.shape = 'rect';
    }
    const step = C.step ?? 8;
    const zs = []; for (let z = -PL + (C.z0 ?? step * 0.75); z < PL - step * 0.4; z += step) zs.push(z);
    const top = sf && !C.full ? PY + sf.y : Yc;
    for (const r of rows) {
      const Hc = (C.rows === 'mid' ? Yc : top) - r.y0;
      const geo = colGeom(C, Hc);
      const pos = zs.map((z) => ({ x: r.x, y: r.y0, z }));
      grp.add(instanced(geo, M(C.mat), pos));
      if (C.base) grp.add(instanced(colGeom({ ...C, shape: C.shape === 'tilt' || C.shape === 'facet' ? 'rect' : C.shape, w: (C.w ?? 0.9) + 0.08, d: (C.d ?? C.w ?? 0.9) + 0.08 }, 0.16), M(C.base), pos.map((p) => ({ ...p, y: Math.max(p.y, PY) }))));
      if (C.edge) { // металлические рёбра на углах
        const w = (C.w ?? 0.9) / 2, d = (C.d ?? C.w ?? 0.9) / 2, eg = [];
        for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) eg.push(box(0.06, Hc, 0.06, sx * w, Hc / 2, sz * d));
        const egm = mergeGeoms(eg);
        if (C.shape === 'tilt') { const p = egm.attributes.position; for (let i = 0; i < p.count; i++) { const t = p.getY(i) / Hc; p.setX(i, p.getX(i) * (1 + ((C.top ?? 1.4) - 1) * t)); } }
        grp.add(instanced(egm, C.edge === 'led' ? lampMat(3.4, 0xffffff) : M('steel'), pos));
      }
      if (C.slit) { // световая V-прорезь на гранях вдоль зала
        const d = (C.d ?? C.w ?? 0.9) / 2 + 0.006, sg = [];
        const tri = quad([-0.02, 0.4, d], [0.02, 0.4, d], [0.17, Hc - 0.1, d], [-0.17, Hc - 0.1, d]);
        sg.push(tri, tri.clone().rotateY(Math.PI));
        grp.add(instanced(mergeGeoms(sg), lampMat(3.0, 0xfffbf2), pos));
      }
      if (C.names) { // вертикальное название на пилонах между путями («Давыдково»)
        const tt = textTex(g.title, { fg: C.names, font: '700 110px "PT Sans",Arial,sans-serif', spacing: 0.08, w: 2048, h: 150 });
        const ng = [];
        for (const p of pos.filter((_, i) => i % 2 === 0)) for (const f of [1, -1]) {
          const w = 3.2, hh = 0.36; const q = new THREE.PlaneGeometry(w, hh); q.rotateZ(Math.PI / 2); q.rotateY(f > 0 ? Math.PI / 2 : -Math.PI / 2);
          q.translate(r.x + f * ((C.w ?? 1) / 2 + 0.02), PY + 2.6, p.z + 0.4 * f); ng.push(q);
        }
        grp.add(new THREE.Mesh(mergeGeoms(ng), new THREE.MeshBasicMaterial({ map: tt, transparent: true, color: 0xdddddd })));
      }
      if (C.emblem) {
        const disc = new THREE.CircleGeometry(0.45, 32), it = [];
        for (const p of pos.filter((_, i) => i % 2 === 1)) for (const f of [1, -1]) it.push({ x: r.x + f * ((C.w ?? 1) / 2 + 0.02), y: PY + 3.6, z: p.z, ry: f > 0 ? Math.PI / 2 : -Math.PI / 2 });
        grp.add(instanced(disc, M({ c: '#f2f1ec', r: 0.5, e: 0.2 }), it));
      }
      if (C.tubes) { // пучки стальных труб в нишах («Текстильщики»)
        const tg = [];
        for (let k = 0; k < 4; k++) tg.push(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12).translate(-0.18 + k * 0.12, PY + 2.1 + (k % 2) * 0.25, 0));
        const tm = mergeGeoms(tg), it = [];
        for (const p of pos) for (const f of [1, -1]) it.push({ x: r.x + f * ((C.w ?? 1) / 2 + 0.065), y: 0, z: p.z, ry: Math.PI / 2 });
        grp.add(instanced(tm, M('steel'), it));
      }
    }
    // крайние колонны другого цвета («Мнёвники»: оранжевые у лестниц)
    if (C.ends) {
      const pe = []; for (const r of rows) for (const z of [zs[0], zs[zs.length - 1]]) pe.push({ x: r.x, y: r.y0, z });
      grp.add(instanced(colGeom({ ...C, w: (C.w ?? 0.9) + 0.02, d: (C.d ?? C.w ?? 0.9) + 0.02 }, top - PY), M(C.ends), pe));
    }
    info.colRows = rows.map((r) => r.x);
    g.colZ = zs; g.rows = rows;
  }
  yield;

  // ----- потолок -----
  const ce = s.ceil || {};
  const naves = PLs.map(([a, b]) => { const rr = rows.filter((r) => r.x > a - 0.1 && r.x < b + 0.1).map((r) => r.x).sort((p, q) => p - q); return rr.length >= 2 ? [rr[0], rr[rr.length - 1]] : [a + 0.6, b - 0.6]; });
  if (ce.kind === 'tilt') {
    // общий потолок — только вне приподнятых нефов (иначе он закрыл бы их снизу)
    const cuts = [...naves].sort((p, q) => p[0] - q[0]), parts = [];
    let x0 = xMin;
    for (const [a, b] of cuts) { if (a > x0 + 0.01) parts.push(floorG(Yc, x0, a, -HZ, HZ, false)); x0 = Math.max(x0, b); }
    if (xMax > x0 + 0.01) parts.push(floorG(Yc, x0, xMax, -HZ, HZ, false));
    add(parts, ce.mat || 'whiteP');
    // за торцами платформ неф закрыт обычным потолком
    add(naves.flatMap(([a, b]) => [floorG(Yc, a, b, -HZ, -PL + 0.5, false), floorG(Yc, a, b, PL - 0.5, HZ, false)]), ce.mat || 'whiteP');
  } else add([floorG(Yc, xMin, xMax, -HZ, HZ, false)], ce.mat || 'whiteP');
  const zsC = g.colZ || [];
  const rng = mulberry32(hashStr(g.name) + 5);
  if (ce.kind === 'slatsX' || ce.kind === 'slatsZ') {
    const it = [], st = ce.step ?? 0.3, dep = ce.d ?? 0.22;
    if (ce.kind === 'slatsX') { const gx = box(xMax - xMin, dep, 0.06, 0, 0, 0); for (let z = -HZ + 0.1; z < HZ; z += st) it.push({ x: (xMin + xMax) / 2, y: Yc - dep / 2 - 0.01, z }); grp.add(instanced(gx, M(ce.slat || 'greyC'), it)); }
    else { const gz = box(0.06, dep, 2 * HZ, 0, 0, 0); for (let x = xMin + 0.15; x < xMax; x += st) it.push({ x, y: Yc - dep / 2 - 0.01, z: 0 }); grp.add(instanced(gz, M(ce.slat || 'greyC'), it)); }
  }
  if (ce.kind === 'coffer') {
    const bm = [];
    for (const [a, b] of naves) { for (const z of zsC) bm.push(box(b - a + 0.6, ce.bh ?? 0.5, 0.45, (a + b) / 2, Yc - (ce.bh ?? 0.5) / 2, z)); }
    for (const r of rows) bm.push(box(0.6, ce.bh ?? 0.5, 2 * HZ, r.x, Yc - (ce.bh ?? 0.5) / 2, 0));
    add(bm, ce.beam || 'whiteP');
  }
  if (ce.kind === 'tilt') { // приподнятый центральный неф с наклонными панелями и тёмными ригелями
    const lift = ce.lift ?? 0.9, tg = [], fr = [];
    for (const [a, b] of naves) {
      const m0 = a + (b - a) * 0.28, m1 = b - (b - a) * 0.28;
      const z0 = -PL + 0.5, z1 = PL - 0.5;
      tg.push(quad([a, Yc - 0.01, z0], [m0, Yc + lift, z0], [m0, Yc + lift, z1], [a, Yc - 0.01, z1]));
      tg.push(quad([m1, Yc + lift, z0], [b, Yc - 0.01, z0], [b, Yc - 0.01, z1], [m1, Yc + lift, z1]));
      tg.push(floorG(Yc + lift, m0, m1, z0, z1, false));
      for (const [z, f] of [[z0, 1], [z1, -1]]) { const e = new THREE.Shape(); e.moveTo(a, Yc); e.lineTo(b, Yc); e.lineTo(m1, Yc + lift); e.lineTo(m0, Yc + lift); e.closePath(); const eg = new THREE.ShapeGeometry(e); if (f < 0) { eg.rotateY(Math.PI); eg.translate(a + b, 0, 0); } eg.translate(0, 0, z); fr.push(uvMeters(eg)); }
      fr.push(box(0.55, 0.45, 2 * HZ, a, Yc - 0.2, 0), box(0.55, 0.45, 2 * HZ, b, Yc - 0.2, 0));
      for (const z of zsC) fr.push(box(b - a, 0.08, 0.35, (a + b) / 2, Yc + lift * 0.5, z));
    }
    add(tg, ce.panel || 'whiteP');
    add(fr, ce.frame || 'black');
    if (ce.art) add(naves.map(([a, b]) => { const m0 = a + (b - a) * 0.3, m1 = b - (b - a) * 0.3; return floorG(Yc + lift - 0.01, m0, m1, -PL + 6, PL - 6, false); }), ce.art);
  }
  if (ce.kind === 'discs') { // массив наклонных дисков («Воронцовская»)
    const dg = new THREE.CylinderGeometry(0.26, 0.26, 0.04, 20), it = [];
    for (const [a, b] of naves) for (let z = -PL; z < PL; z += 0.62) for (let x = a + 0.4; x < b - 0.3; x += 0.62) it.push({ x: x + (rng() - 0.5) * 0.12, y: Yc - 0.25 - rng() * 0.25, z, rx: Math.sin(z * 0.35 + x) * 0.6, rz: Math.cos(z * 0.21 - x * 0.7) * 0.6 });
    grp.add(instanced(dg, M(ce.disc || { c: '#c9c9c6', r: 0.45, e: 0.1 }), it));
  }
  if (ce.kind === 'facets') { // гранёные панели («Зюзино»)
    const fg = box(1.3, 0.05, 1.3, 0, 0, 0), it = [];
    for (const [a, b] of naves) for (let z = -PL; z < PL; z += 1.4) for (let x = a + 0.7; x < b; x += 1.4) it.push({ x, y: Yc - 0.25 - rng() * 0.2, z, rx: (rng() - 0.5) * 0.5, rz: (rng() - 0.5) * 0.5 });
    grp.add(instanced(fg, M(ce.facet || { c: '#5a4c42', r: 0.5 }), it));
  }
  if (ce.kind === 'hanging') { // подвесные глянцевые пластины («Новаторская»)
    const pg = box(1.9, 0.04, 0.55, 0, 0, 0), it = [], pal = ce.pal || ['#f3a21a', '#f7c52a', '#e8781c', '#f9d860'];
    for (const [a, b] of naves) for (let z = -PL; z < PL; z += 0.75) for (let x = a + 0.2; x < b; x += 2.1) it.push({ x: x + 0.9, y: Yc - 0.4 - rng() * 0.5, z: z + rng() * 0.3, rz: (rng() - 0.5) * 0.35, rx: (rng() - 0.5) * 0.2, c: pal[Math.floor(rng() * pal.length)] });
    const mm = pbr({ color: 0xffffff, roughness: 0.18, metalness: 0.1, emissive: 0, envI: 1.4 }); mm.emissive.set(0x3a2000);
    grp.add(instanced(pg, mm, it));
  }
  if (ce.kind === 'vault') { // плавный свод с продольными бороздками («Кленовый бульвар»)
    const n = 24, pts = []; for (let i = 0; i <= n; i++) { const t = i / n; pts.push([xMin + (xMax - xMin) * t, Yc - 0.9 + Math.sin(t * Math.PI) * 0.9]); }
    const vg = []; for (let i = 0; i < n; i++) vg.push(quad([pts[i][0], pts[i][1], -HZ], [pts[i + 1][0], pts[i + 1][1], -HZ], [pts[i + 1][0], pts[i + 1][1], HZ], [pts[i][0], pts[i][1], HZ]));
    const vgm = mergeGeoms(vg); vgm.index && vgm.toNonIndexed();
    const pa = vgm.attributes.position; for (let i = 0; i < pa.count; i += 3) { /* обход по часовой — разворачиваем лицом вниз */ const x1 = pa.getX(i + 1), y1 = pa.getY(i + 1), z1 = pa.getZ(i + 1); pa.setXYZ(i + 1, pa.getX(i + 2), pa.getY(i + 2), pa.getZ(i + 2)); pa.setXYZ(i + 2, x1, y1, z1); }
    vgm.computeVertexNormals();
    add([vgm], ce.panel || 'whiteP');
    const gr = []; for (let i = 2; i < n - 1; i += 2) gr.push(box(0.03, 0.03, 2 * HZ, pts[i][0], pts[i][1] - 0.02, 0));
    add(gr, 'greyC');
  }
  if (ce.kind === 'lace') { // ажурные светящиеся короба («Мичуринский проспект»)
    const lg = box(1.1, 0.42, 4.2, 0, 0, 0), it = [];
    const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(2.2), alphaMap: lace(), alphaTest: 0.4, side: THREE.DoubleSide });
    lm.userData.hq = true;
    for (const [a, b] of naves) for (let z = -PL + 4; z < PL - 2; z += 6) for (const x of [a - 1.2, b + 1.2]) it.push({ x, y: Yc - 0.8, z, ry: (rng() - 0.5) * 0.3 });
    grp.add(instanced(lg, lm, it));
  }
  if (ce.kind === 'balcony' || s.balcony) { // галереи над путями (верхний ярус) — «Петровский парк», «Деловой центр», «Сокольники»
    const B = s.balcony || ce, by = PY + (B.y ?? 4.6), bd = B.d ?? 2.4, sl = [], gl = [], rail = [];
    for (const [x, f] of [[xMin, 1], [xMax, -1]]) {
      const xe = x + f * bd;
      sl.push(box(bd, 0.35, 2 * PL, (x + xe) / 2, by, 0));
      sl.push(wallG(xe, by - 0.55, by + 0.18, -PL, PL, -f));
      gl.push(wallG(xe, by + 0.18, by + 1.2, -PL, PL, -f));
      rail.push(box(0.06, 0.06, 2 * PL, xe, by + 1.2, 0));
      for (let z = -PL; z <= PL; z += 2.5) rail.push(box(0.05, 1.0, 0.05, xe, by + 0.7, z));
    }
    add(sl, B.mat || 'white'); add(gl, 'glass'); add(rail, 'steel');
    if (B.name) { const tt = textTex(g.title, { fg: B.name, font: '600 96px "PT Sans",Arial,sans-serif', spacing: 0.2 }); const ng = []; for (const z of [-50, 0, 50]) for (const [x, f] of [[xMin + bd + 0.02, -1], [xMax - bd - 0.02, 1]]) { const q = new THREE.PlaneGeometry(6, 0.42); q.rotateY(f > 0 ? -Math.PI / 2 : Math.PI / 2); q.translate(x - f * 0.01, by - 0.2, z); ng.push(q); } grp.add(new THREE.Mesh(mergeGeoms(ng), new THREE.MeshBasicMaterial({ map: tt, transparent: true }))); }
  }
  yield;

  // ----- светильники -----
  const lampG = [];
  const lamp = (geom, i = 4.0, col = 0xfafcff) => grp.add(new THREE.Mesh(mergeGeoms(geom), lampMat(i, col)));
  for (const L of s.lights || []) {
    const gs = [];
    const drop = ce.kind === 'slatsX' || ce.kind === 'slatsZ' ? (ce.d ?? 0.22) + 0.02 : 0;
    const yl = Yc - 0.03 - drop + (L.dy ?? 0);
    const spans = L.at === 'rows' ? rows.map((r) => [r.x, r.x]) : L.at === 'hall' ? [[xMin + 1, xMax - 1]] : naves;
    if (L.k === 'lines') {
      for (const [a, b] of spans) { const cx = (a + b) / 2 + (L.x ?? 0), n = L.n ?? 1, sp = L.sp ?? 0.4; for (let k = 0; k < n; k++) gs.push(box(L.w ?? 0.08, 0.04, 2 * PL - 4, cx + (k - (n - 1) / 2) * sp, yl, 0)); }
    }
    if (L.k === 'zig') {
      for (const [a, b] of spans) { const cx = (a + b) / 2, amp = L.amp ?? ((b - a) / 2 - 0.5), per = L.per ?? 6; for (let z = -PL; z < PL - per / 2; z += per / 2) { const k = Math.round((z + PL) / (per / 2)) % 2 ? 1 : -1; const x0 = cx - k * amp, x1 = cx + k * amp, len = Math.hypot(x1 - x0, per / 2); const gq = box(0.07, 0.04, len, 0, 0, 0); gq.rotateY(Math.atan2(x1 - x0, per / 2)); gq.translate((x0 + x1) / 2, yl, z + per / 4); gs.push(gq); } }
    }
    if (L.k === 'cross') for (const [a, b] of spans) for (let z = -PL + 2; z < PL; z += L.step ?? 3) gs.push(box(b - a - 0.4, 0.04, L.w ?? 0.12, (a + b) / 2, yl, z));
    if (L.k === 'down' || L.k === 'squares') {
      for (const [a, b] of spans) { const n = L.n ?? 2; for (let z = -PL + 2; z < PL; z += L.step ?? 4) for (let k = 0; k < n; k++) { const x = a + (b - a) * (k + 0.5) / n; if (L.k === 'down') { const d = new THREE.CircleGeometry(L.r ?? 0.3, 28); d.rotateX(Math.PI / 2); d.translate(x, yl - 0.01, z); gs.push(d); } else gs.push(box(L.s ?? 0.6, 0.04, L.s ?? 0.6, x, yl, z)); } }
    }
    if (L.k === 'rings') { // кольцевые люстры («Терехово»)
      for (const [a, b] of spans) for (let z = -PL + 6; z < PL - 4; z += L.step ?? 9) (L.r || [1.1, 0.75]).forEach((r, i) => { const t = new THREE.TorusGeometry(r, 0.045, 8, 48); t.rotateX(Math.PI / 2); t.translate((a + b) / 2, yl - 0.9 - i * 0.35, z); gs.push(t); });
    }
    if (L.k === 'ovals') { // продолговатые световые кессоны («Текстильщики»)
      for (const [a, b] of spans) for (let z = -PL + 3; z < PL - 2; z += L.step ?? 3.2) { const sh = new THREE.Shape(); const w = (b - a) * 0.38, r = L.w ?? 0.45; sh.moveTo(-w, -r); sh.lineTo(w, -r); sh.absarc(w, 0, r, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(-w, r); sh.absarc(-w, 0, r, Math.PI / 2, Math.PI * 1.5, false); const og = new THREE.ShapeGeometry(sh, 10); og.rotateX(Math.PI / 2); og.translate((a + b) / 2, yl - 0.01, z); gs.push(og); }
    }
    if (L.k === 'tri') { // треугольные световые «осколки» у колонн («Авиамоторная»)
      for (const r of rows) for (const z of zsC) for (const f of [1, -1]) gs.push(quad([r.x, yl, z + f * 0.5], [r.x + 0.9, yl, z + f * 2.4], [r.x - 0.9, yl, z + f * 2.4], [r.x, yl, z + f * 0.5]).rotateX(0));
    }
    if (L.k === 'cove') for (const [x, f] of [[xMin, 1], [xMax, -1]]) gs.push(box(0.06, 0.05, 2 * HZ, x + f * 0.08, Yc - 0.05 + (L.dy ?? 0), 0));
    if (L.k === 'under') for (const P of PLs) { const e = edgesOf(P); if (e.L) gs.push(box(0.03, 0.05, 2 * PL - 2, P[0] - 0.02, PY - 0.25, 0)); if (e.R) gs.push(box(0.03, 0.05, 2 * PL - 2, P[1] + 0.02, PY - 0.25, 0)); }
    if (L.k === 'wall') for (const [x, f] of [[xMin, 1], [xMax, -1]]) for (const y of L.ys || [3.4]) gs.push(box(0.05, 0.05, 2 * HZ, x + f * 0.05, PY + y, 0));
    if (gs.length) lamp(gs, L.i ?? 4.2, L.c ? new THREE.Color(L.c).getHex() : 0xfafcff);
  }
  void lampG;
  yield;

  // ----- названия станции -----
  const N = s.name || {};
  const tt = textTex(g.title, { fg: N.fg || '#1d1d1d', bg: N.bg || null, font: N.font || '600 96px "PT Sans","Arial",sans-serif', spacing: N.sp ?? 0.2, glow: N.glow || null });
  const nh = N.h ?? 0.5, nw = Math.min(N.w ?? 99, nh * (tt.userData.aspect || 8));
  const zsN = N.zs || [-54, -18, 18, 54];
  const ng = [];
  for (const z of zsN) for (const [x, f] of [[xMin + 0.03, 1], [xMax - 0.03, -1]]) {
    const q = new THREE.PlaneGeometry(N.bg ? nw + 0.6 : nw, nh * (N.bg ? 1.5 : 1)); q.rotateY(f > 0 ? Math.PI / 2 : -Math.PI / 2); q.translate(x, PY + (N.y ?? 2.6), z); ng.push(q);
  }
  const nm = N.bg ? new THREE.MeshStandardMaterial({ map: tt, roughness: 0.35, emissiveMap: tt, emissive: new THREE.Color(0.25, 0.25, 0.25) }) : new THREE.MeshStandardMaterial({ map: tt, transparent: true, roughness: 0.3, metalness: N.metal ? 0.7 : 0, emissiveMap: tt, emissive: new THREE.Color(0.2, 0.2, 0.2) });
  nm.userData.hq = true;
  grp.add(new THREE.Mesh(mergeGeoms(ng), nm));
  yield;

  // ----- особые элементы -----
  if (s.fish) { // смальтовые рыбы на стенах («Нагатинский Затон»)
    for (let kind = 0; kind < 3; kind++) {
      const fg = [];
      for (let z = -PL + 10 + kind * 13; z < PL - 6; z += 39) for (const [x, f] of [[xMin + 0.04, 1], [xMax - 0.04, -1]]) { const q = new THREE.PlaneGeometry(kind === 0 ? 4.2 : 3.0, kind === 0 ? 1.4 : 1.6); q.rotateY(f > 0 ? Math.PI / 2 : -Math.PI / 2); q.translate(x, PY + 2.8 + (kind === 1 ? 0.3 : 0), z); fg.push(q); }
      const mm = new THREE.MeshStandardMaterial({ map: fishTex(kind), transparent: true, alphaTest: 0.1, roughness: 0.45, emissive: new THREE.Color(0.12, 0.12, 0.12), emissiveMap: fishTex(kind) });
      mm.userData.hq = true;
      grp.add(new THREE.Mesh(mergeGeoms(fg), mm));
    }
  }
  if (s.figures) { // бронзовые фигуры спортсменов в центре зала («ЦСКА»)
    const br = M({ c: '#5a3e26', m: 0.85, r: 0.35, e: 0.04 }), parts = [];
    const fig = () => mergeGeoms([new THREE.SphereGeometry(0.16, 12, 10).translate(0, 1.72, 0), new THREE.CylinderGeometry(0.17, 0.13, 0.75, 10).translate(0, 1.25, 0), new THREE.CylinderGeometry(0.06, 0.07, 0.85, 8).rotateZ(0.25).translate(-0.12, 0.45, 0), new THREE.CylinderGeometry(0.06, 0.07, 0.85, 8).rotateZ(-0.35).translate(0.16, 0.45, 0), new THREE.CylinderGeometry(0.045, 0.05, 0.7, 8).rotateZ(1.2).translate(-0.42, 1.48, 0), new THREE.CylinderGeometry(0.045, 0.05, 0.7, 8).rotateZ(-0.6).translate(0.38, 1.62, 0)]);
    for (const [a, b] of naves) for (const z of [-48, -16, 16, 48]) parts.push({ x: (a + b) / 2, y: PY + 0.6, z, ry: rng() * 6 });
    grp.add(instanced(fig(), br, parts));
    grp.add(instanced(box(1.0, 0.6, 1.0, 0, 0.3, 0), M({ g: ['#1a1a1b', '#3c3c3e'], r: 0.15 }), parts.map((p) => ({ ...p, y: PY }))));
  }
  // скамейки между колоннами
  if (s.benches !== false) {
    const bt = [], bl = [];
    const bz = zsC.length > 2 ? zsC : (() => { const a = []; for (let z = -PL + 8; z < PL - 6; z += 9) a.push(z); return a; })();
    PLs.forEach(([a0, b0], pi) => {
      const e = edgesOf([a0, b0]);
      // у береговой платформы скамейки стоят у стены, у островной — по оси
      const cx = e.L && e.R ? (naves[pi][0] + naves[pi][1]) / 2 : e.L ? b0 - 0.65 : a0 + 0.65;
      for (let i = 0; i < bz.length - 1; i += 2) { const z = (bz[i] + bz[i + 1]) / 2; bt.push(box(0.6, 0.08, 2.6, cx, PY + 0.44, z)); bl.push(box(0.5, 0.4, 0.1, cx, PY + 0.2, z - 1.1), box(0.5, 0.4, 0.1, cx, PY + 0.2, z + 1.1)); }
    });
    add(bt, s.bench || 'wood'); add(bl, 'steelD');
  }

  // свет для пула точечных ламп, точки ожидания пассажиров
  const lights = [];
  for (const [a, b] of naves) for (let z = -PL + 8; z < PL; z += 16) lights.push(new THREE.Vector3((a + b) / 2, Yc - 0.8, z));
  for (const x of TR) for (let z = -PL + 16; z < PL; z += 32) lights.push(new THREE.Vector3(x, Yc - 1.0, z));
  info.lights = lights;
  info.hemi = s.hemi ?? 0.5;
  info.poolI = s.poolI ?? 9;
  if (g.spots && our) for (let z = -PL + 8; z < PL - 6; z += 9) info.spots.push({ x: (our[0] + our[1]) / 2 + (rows.some((r) => Math.abs(r.x - (our[0] + our[1]) / 2) < 0.9) ? 1.2 : 0), z });
  OWN.set(CUR, [...(OWN.get(CUR) || []), ...[...HQ.cache.keys()].filter((k) => !before.has(k) && !k.startsWith('gn:'))]);
}

// ---------- пилонные станции глубокого заложения («Савёловская», «Марьина Роща», «Рижская») ----------
export function* buildBKLPylon(grp, c, s) {
  CUR = c.name;
  const before = new Set(HQ.cache.keys());
  const { PLAT_Y: PY, EDGE_X, xFar, rightWall, leftWall, PL, HZ, BED_Y, info } = c;
  const cacheM = new Map();
  const M = (d) => { d = resolve(d); const k = JSON.stringify(d); if (!cacheM.has(k)) cacheM.set(k, makeMaterial(d)); return cacheM.get(k); };
  const add = (geoms, mat) => { if (geoms.length) grp.add(new THREE.Mesh(mergeGeoms(geoms), M(mat))); };
  info.customNames = true; info.hq = true; info.bkl = true;
  const xPy0 = -4.3, xPy1 = -7.0, xPy2 = xFar + 2.7, xPy3 = xFar + 5.4;
  const Ys = PY + (s.wallH ?? 2.6); // верх путевой стены (начало свода)
  yield;
  // пол
  const fl = s.floor || {};
  add([floorG(PY, xFar, EDGE_X, -PL, PL)], { g: fl.g || ['#7f7f7c', '#cfcfcb'], r: 0.16 });
  info.reflector = glossyFloor(xPy0, EDGE_X, -PL, PL, PY, fl.gl ?? 0.28); grp.add(info.reflector);
  if (s.tube) {
    yield* buildTubePylon(grp, c, s, M);
    OWN.set(CUR, [...(OWN.get(CUR) || []), ...[...HQ.cache.keys()].filter((k) => !before.has(k) && !k.startsWith('gn:'))]);
    return;
  }
  // путевые стены
  for (const [x, f] of [[rightWall, -1], [leftWall, 1]]) {
    let y0 = BED_Y - 0.4;
    for (const [top, mat] of s.wall || [[2.6, 'black']]) { const y1 = PY + top; add([wallG(x, y0, y1, -HZ, HZ, f)], mat); y0 = y1; }
  }
  yield;
  // своды боковых залов и центрального
  const sideVault = (x0, x1) => { const cx = (x0 + x1) / 2, r = Math.abs(x1 - x0) / 2, pts = []; for (let i = 0; i <= 28; i++) { const a = Math.PI * i / 28; pts.push([cx + Math.cos(a) * r, Ys + Math.sin(a) * r * 0.9]); } return pts; };
  const vaultMesh = (pts, z0, z1, su, mat) => {
    const pos = [], uv = [], idx = []; let ul = 0;
    for (let j = 0; j < pts.length; j++) { if (j) ul += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); for (const z of [z0, z1]) { pos.push(pts[j][0], pts[j][1], z); uv.push(ul, z); } }
    for (let j = 0; j < pts.length - 1; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(idx); gg.computeVertexNormals();
    const m = M(mat); m.side = THREE.DoubleSide;
    grp.add(new THREE.Mesh(gg, m));
    return ul;
  };
  vaultMesh(sideVault(rightWall, xPy0), -HZ, HZ, 1, s.vault || 'whiteP');
  vaultMesh(sideVault(xPy2, leftWall), -HZ, HZ, 1, s.vault || 'whiteP');
  const cY = PY + (s.centerY ?? 3.6), cx = (xPy1 + xPy3) / 2, cr = (xPy1 - xPy3) / 2;
  const cpts = []; for (let i = 0; i <= 36; i++) { const a = Math.PI * i / 36; cpts.push([cx + Math.cos(a) * cr, cY + Math.sin(a) * cr * 0.75]); }
  vaultMesh(cpts, -PL, PL, 1, s.center || 'whiteP');
  info.ceilY = cY + cr * 0.75;
  yield;
  // пилоны с проёмами
  const cs = s.step ?? 9, pass = s.pass ?? 4.2, hTop = s.openH ?? 3.4;
  const lining = M(s.lining || s.pylon || 'white');
  const pm = M(s.pylon || 'white');
  const outline = [];
  for (const [xa, xb] of [[xPy1, xPy0], [xPy2, xPy3]]) {
    const sh = new THREE.Shape();
    sh.moveTo(-PL, PY); sh.lineTo(PL, PY); sh.lineTo(PL, Ys + 3.2); sh.lineTo(-PL, Ys + 3.2); sh.lineTo(-PL, PY);
    for (let z = -PL + cs; z < PL - cs * 0.4; z += cs) {
      const h = new THREE.Path(), a = z - pass / 2, b = z + pass / 2;
      if (s.opening === 'pill') { const r = pass / 2; h.moveTo(a, PY + r * 0.6); h.absarc(z, PY + r * 0.6, r, Math.PI, 0, false); h.lineTo(b, PY + hTop - r); h.absarc(z, PY + hTop - r, r, 0, Math.PI, false); h.lineTo(a, PY + r * 0.6); }
      else if (s.opening === 'rect') { const r = 0.4; h.moveTo(a, PY); h.lineTo(b, PY); h.lineTo(b, PY + hTop - r); h.quadraticCurveTo(b, PY + hTop, b - r, PY + hTop); h.lineTo(a + r, PY + hTop); h.quadraticCurveTo(a, PY + hTop, a, PY + hTop - r); h.lineTo(a, PY); }
      else { h.moveTo(a, PY); h.lineTo(b, PY); h.lineTo(b, PY + hTop - pass / 2); h.absarc(z, PY + hTop - pass / 2, pass / 2, 0, Math.PI, false); h.lineTo(a, PY); }
      sh.holes.push(h);
      if (s.led) { const pts = h.getPoints(24).map((p) => new THREE.Vector3(0, p.y, p.x)); for (const xo of [xa - 0.03, xb + 0.03]) { const cur = new THREE.CatmullRomCurve3(pts.map((p) => p.clone().setX(xo)), true); outline.push(new THREE.TubeGeometry(cur, 64, 0.03, 6, true)); } }
      info.spots.push({ x: (xa + xb) / 2 + (xa > -10 ? 2.2 : -2.2), z: z + cs / 2 });
    }
    const gE = new THREE.ExtrudeGeometry(sh, { depth: xb - xa, bevelEnabled: false, curveSegments: 10 });
    gE.rotateY(-Math.PI / 2); gE.translate(xb, 0, 0);
    const uv = gE.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
    grp.add(new THREE.Mesh(gE, [pm, lining]));
  }
  if (outline.length) grp.add(new THREE.Mesh(mergeGeoms(outline), lampMat(3.6, 0xfff8ee)));
  yield;
  // светильники: линия по оси центрального свода и над краями платформ
  const lg = [box(0.25, 0.04, 2 * PL - 4, cx, info.ceilY - 0.06, 0)];
  if (s.ring) for (let z = -PL + 10; z < PL; z += 20) { const t = new THREE.TorusGeometry(1.2, 0.06, 8, 48); t.rotateX(Math.PI / 2); t.translate(cx, info.ceilY - 0.4, z); lg.push(t); }
  for (const x of [(rightWall + xPy0) / 2, (xPy2 + leftWall) / 2]) lg.push(box(0.12, 0.04, 2 * HZ - 4, x + 0.8, Ys + Math.abs(rightWall - xPy0) / 2 * 0.9 - 0.08, 0));
  grp.add(new THREE.Mesh(mergeGeoms(lg), lampMat(4.2, 0xfafcff)));
  // название — на путевых стенах / тюбингах
  const N = s.name || {};
  const tt = textTex(c.title, { fg: N.fg || '#d9d9d6', font: N.font || '600 96px "PT Sans",Arial,sans-serif', spacing: 0.22 });
  const ng = [];
  for (const z of [-54, -18, 18, 54]) for (const [x, f] of [[rightWall - 0.03, -1], [leftWall + 0.03, 1]]) { const q = new THREE.PlaneGeometry(0.5 * (tt.userData.aspect || 8), 0.5); q.rotateY(f > 0 ? Math.PI / 2 : -Math.PI / 2); q.translate(x, PY + (N.y ?? 2.2), z); ng.push(q); }
  const nm = new THREE.MeshStandardMaterial({ map: tt, transparent: true, roughness: 0.3, metalness: 0.6, emissiveMap: tt, emissive: new THREE.Color(0.25, 0.25, 0.25) }); nm.userData.hq = true;
  grp.add(new THREE.Mesh(mergeGeoms(ng), nm));
  const lights = [];
  for (let z = -PL + 8; z < PL; z += 16) lights.push(new THREE.Vector3(cx, info.ceilY - 1.2, z), new THREE.Vector3((rightWall + xPy0) / 2, Ys + 1.5, z + 8));
  info.lights = lights; info.hemi = s.hemi ?? 0.5; info.poolI = s.poolI ?? 9;
  OWN.set(CUR, [...(OWN.get(CUR) || []), ...[...HQ.cache.keys()].filter((k) => !before.has(k) && !k.startsWith('gn:'))]);
}

// Пилонная станция в чугунных тюбингах («Марьина Роща»): боковые залы — круглые тоннели,
// над путём видна обделка (кольцевые и продольные рёбра — объёмные), над платформой — белый свод
// со световой линией; пилоны — мраморные «капсулы» со скруглёнными углами, в проходах — кольцевые светильники.
// Координата u в каждом боковом зале: 0 — ось пути, к платформе — минус; x = x0 + sg·u.
function* buildTubePylon(grp, c, s, M) {
  const { PLAT_Y: PY, EDGE_X, xFar, oppX, PL, HZ, BED_Y, info } = c;
  const T = s.tube, uc = T.uc ?? -0.6, yc = T.yc ?? 1.6, R = T.R ?? 4.0, d = T.d ?? 0.22;
  const hP = s.openH ?? 3.3, cs = s.step ?? 8, pass = s.pass ?? 3.0, bev = 0.28;
  const yB = BED_Y - 0.4;
  const th0 = Math.asin((yB - yc) / R), thB = Math.acos(((T.edgeU ?? -1.2) - uc) / R);
  const sides = [
    { x0: 0, sg: 1, face: EDGE_X - 2.82, back: EDGE_X - 5.52 },
    { x0: oppX, sg: -1, face: -(xFar + 2.7 - oppX), back: -(xFar + 5.4 - oppX) },
  ];
  const cir = (r, a) => [uc + r * Math.cos(a), yc + r * Math.sin(a)];
  const soup = () => ({ p: [], push(sd, pts) { for (const [u, y, z] of pts) this.p.push(sd.x0 + sd.sg * u, y, z); } });
  const quad = (S, sd, a, b, c2, d2) => S.push(sd, [a, b, c2, a, c2, d2]);
  const toMesh = (S, mat) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(S.p, 3)); g.computeVertexNormals();
    const m = M(mat); m.side = THREE.DoubleSide; grp.add(new THREE.Mesh(g, m));
  };
  const skin = soup(), ribs = soup();
  const NS = 22, ring = T.ring ?? 0.9, tw = 0.08, lw = 0.06, ribStep = T.rib ?? 0.62;
  for (const sd of sides) {
    // оболочка
    for (let j = 0; j < NS; j++) {
      const a0 = th0 + (thB - th0) * j / NS, a1 = th0 + (thB - th0) * (j + 1) / NS;
      const [u0, y0] = cir(R, a0), [u1, y1] = cir(R, a1);
      quad(skin, sd, [u0, y0, -HZ], [u1, y1, -HZ], [u1, y1, HZ], [u0, y0, HZ]);
    }
    // кольцевые рёбра
    for (let z = -HZ + ring / 2; z < HZ; z += ring) {
      const za = z - tw / 2, zb = z + tw / 2;
      for (let j = 0; j < NS; j++) {
        const a0 = th0 + (thB - th0) * j / NS, a1 = th0 + (thB - th0) * (j + 1) / NS;
        const [pu0, py0] = cir(R, a0), [pu1, py1] = cir(R, a1), [iu0, iy0] = cir(R - d, a0), [iu1, iy1] = cir(R - d, a1);
        quad(ribs, sd, [iu0, iy0, za], [iu1, iy1, za], [iu1, iy1, zb], [iu0, iy0, zb]);
        quad(ribs, sd, [pu0, py0, za], [pu1, py1, za], [iu1, iy1, za], [iu0, iy0, za]);
        quad(ribs, sd, [pu0, py0, zb], [pu1, py1, zb], [iu1, iy1, zb], [iu0, iy0, zb]);
      }
    }
    // продольные рёбра (стыки блоков кольца) и торец обделки у белого свода
    for (let a = th0 + 0.35 / R; a < thB - 0.2 / R; a += ribStep / R) {
      const a1 = a - lw / 2 / R, a2 = a + lw / 2 / R;
      const [p1u, p1y] = cir(R, a1), [p2u, p2y] = cir(R, a2), [i1u, i1y] = cir(R - d, a1), [i2u, i2y] = cir(R - d, a2);
      quad(ribs, sd, [i1u, i1y, -HZ], [i2u, i2y, -HZ], [i2u, i2y, HZ], [i1u, i1y, HZ]);
      quad(ribs, sd, [p1u, p1y, -HZ], [i1u, i1y, -HZ], [i1u, i1y, HZ], [p1u, p1y, HZ]);
      quad(ribs, sd, [p2u, p2y, -HZ], [i2u, i2y, -HZ], [i2u, i2y, HZ], [p2u, p2y, HZ]);
    }
    const [eu, ey] = cir(R, thB), [bu, by] = cir(R - d - 0.04, thB);
    quad(ribs, sd, [eu, ey, -HZ], [bu, by, -HZ], [bu, by, HZ], [eu, ey, HZ]);
    // дно лотка между краем пути и обделкой
    const [gu] = cir(R, Math.asin((BED_Y - yc) / R));
    quad(skin, sd, [2.2, BED_Y + 0.002, -HZ], [gu, BED_Y + 0.002, -HZ], [gu, BED_Y + 0.002, HZ], [2.2, BED_Y + 0.002, HZ]);
  }
  toMesh(skin, T.skin || { c: '#232427', r: 0.62, m: 0.35, e: 0.02 });
  toMesh(ribs, T.ribs || { c: '#3a3c40', r: 0.5, m: 0.45, e: 0.03 });
  yield;
  // белый свод над платформой: от края обделки к верху пилонов
  const shellPts = [];
  const [Bu, By] = cir(R - d - 0.04, thB), tg = [-Math.sin(thB), Math.cos(thB)];
  for (const sd of sides) {
    const P0 = [Bu, By], P1 = [Bu + tg[0] * 1.3, By + tg[1] * 1.3], P3 = [sd.face + 0.03, PY + hP], P2 = [P3[0], P3[1] + 1.0];
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, m = 1 - t, b = [m * m * m, 3 * m * m * t, 3 * m * t * t, t * t * t];
      const u = b[0] * P0[0] + b[1] * P1[0] + b[2] * P2[0] + b[3] * P3[0], y = b[0] * P0[1] + b[1] * P1[1] + b[2] * P2[1] + b[3] * P3[1];
      pts.push([sd.x0 + sd.sg * u, y]);
    }
    shellPts.push(pts);
  }
  const strip = (pts, z0, z1, mat) => {
    const pos = [], uv = [], idx = []; let ul = 0;
    for (let j = 0; j < pts.length; j++) { if (j) ul += Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); for (const z of [z0, z1]) { pos.push(pts[j][0], pts[j][1], z); uv.push(ul, z); } }
    for (let j = 0; j < pts.length - 1; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gg.setIndex(idx); gg.computeVertexNormals();
    const m = M(mat); m.side = THREE.DoubleSide; grp.add(new THREE.Mesh(gg, m));
  };
  for (const pts of shellPts) strip(pts, -HZ, HZ, s.vault || 'whiteP');
  // центральный зал
  const xPy1 = sides[0].back, xPy3 = oppX - sides[1].back;
  const cY = PY + (s.centerY ?? 3.8), cx = (xPy1 + xPy3) / 2, cr = (xPy1 - xPy3) / 2;
  const cpts = []; for (let i = 0; i <= 36; i++) { const a = Math.PI * i / 36; cpts.push([cx + Math.cos(a) * cr, cY + Math.sin(a) * cr * 0.75]); }
  strip(cpts, -PL, PL, s.center || 'whiteP');
  info.ceilY = cY + cr * 0.75;
  yield;
  // пилоны-«капсулы», перемычки над проходами, светильники
  const rr = (x0, x1, z0, z1, r) => {
    const sh = new THREE.Shape(), a = x0, b = x1, c0 = -z1, c1 = -z0;
    r = Math.max(0.02, Math.min(r, (b - a) / 2 - 0.01, (c1 - c0) / 2 - 0.01));
    sh.moveTo(a + r, c0); sh.lineTo(b - r, c0); sh.absarc(b - r, c0 + r, r, -Math.PI / 2, 0, false);
    sh.lineTo(b, c1 - r); sh.absarc(b - r, c1 - r, r, 0, Math.PI / 2, false);
    sh.lineTo(a + r, c1); sh.absarc(a + r, c1 - r, r, Math.PI / 2, Math.PI, false);
    sh.lineTo(a, c0 + r); sh.absarc(a + r, c0 + r, r, Math.PI, Math.PI * 1.5, false);
    return sh;
  };
  const Z = []; for (let z = -PL + cs; z < PL - cs * 0.4; z += cs) Z.push(z);
  const spans = []; let zs = -PL;
  for (const z of Z) { spans.push([zs, z - pass / 2]); zs = z + pass / 2; }
  spans.push([zs, PL]);
  const rc = s.pylonR ?? 0.95;
  const pyl = [], glow = [], lint = [], rings = [], dots = [], benchB = [], benchS = [];
  for (const sd of sides) {
    const xa = Math.min(sd.x0 + sd.sg * sd.face, sd.x0 + sd.sg * sd.back), xb = Math.max(sd.x0 + sd.sg * sd.face, sd.x0 + sd.sg * sd.back), xm = (xa + xb) / 2;
    for (const [z0, z1] of spans) {
      const end0 = z0 <= -PL + 0.01, end1 = z1 >= PL - 0.01;
      const za = end0 ? z0 - 0.5 : z0, zb = end1 ? z1 + 0.5 : z1;
      const g = new THREE.ExtrudeGeometry(rr(xa + bev, xb - bev, za + bev, zb - bev, rc - bev), { depth: hP - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 });
      g.rotateX(-Math.PI / 2); g.translate(0, PY + bev, 0); pyl.push(g);
      const ring2 = new THREE.ShapeGeometry((() => { const o = rr(xa - 0.05, xb + 0.05, za - 0.05, zb + 0.05, rc + 0.05); o.holes.push(rr(xa + bev * 0.6, xb - bev * 0.6, za + bev * 0.6, zb - bev * 0.6, rc - bev * 0.6)); return o; })(), 8);
      ring2.rotateX(-Math.PI / 2); ring2.translate(0, PY + 0.006, 0); glow.push(ring2);
      // скамья у пилона со стороны пути: гранитное основание, деревянное сиденье
      if (!end0 && !end1 && z1 - z0 > 3) {
        const bx = sd.x0 + sd.sg * (sd.face + 0.42), bl = Math.min(2.6, z1 - z0 - 2.2), bz = (z0 + z1) / 2;
        benchB.push(box(0.5, 0.36, bl, bx, PY + 0.18, bz));
        benchS.push(box(0.56, 0.09, bl - 0.06, bx, PY + 0.405, bz));
      }
    }
    lint.push(box(xb - xa, 2.6, 2 * PL, xm, PY + hP + 1.3, 0));
    for (const z of Z) {
      const t = new THREE.TorusGeometry(Math.min(0.9, (xb - xa) / 2 - 0.35), 0.055, 4, 32); t.rotateX(Math.PI / 2); t.translate(xm, PY + hP - 0.05, z); rings.push(t);
      const f = new THREE.TorusGeometry(0.2, 0.022, 3, 16); f.scale(1, 1, 0.3); f.rotateX(Math.PI / 2); f.translate(xm, PY + 0.008, z); dots.push(f);
      info.spots.push({ x: xm + (sd.sg > 0 ? 2.4 : -2.4), z: z + cs / 2 });
    }
  }
  grp.add(new THREE.Mesh(mergeGeoms(pyl), M(s.pylon || 'white')));
  add(grp, M, lint, s.lintel || s.center || 'whiteP');
  add(grp, M, benchB, { g: ['#9a9a98', '#d0d0cc'], r: 0.2 });
  add(grp, M, benchS, { t: 'wood', r: 0.45 });
  grp.add(new THREE.Mesh(mergeGeoms(glow), lampMat(2.2, 0xfff6ea)));
  grp.add(new THREE.Mesh(mergeGeoms([...rings, ...dots]), lampMat(4.0, 0xfafcff)));
  yield;
  // световые линии: на краю белого свода, под карнизом пилонов, по оси центрального зала
  const lg = [box(0.25, 0.04, 2 * PL - 4, cx, info.ceilY - 0.06, 0)];
  for (const sd of sides) {
    const ux = sd.x0 + sd.sg * (Bu - 0.06);
    lg.push(box(0.16, 0.06, 2 * PL, ux, By - 0.05, 0));
    lg.push(box(0.07, 0.03, 2 * PL, sd.x0 + sd.sg * (sd.face + 0.1), PY + hP - 0.02, 0));
  }
  if (s.ring) for (let z = -PL + 10; z < PL; z += 20) { const t = new THREE.TorusGeometry(1.2, 0.06, 8, 48); t.rotateX(Math.PI / 2); t.translate(cx, info.ceilY - 0.4, z); lg.push(t); }
  grp.add(new THREE.Mesh(mergeGeoms(lg), lampMat(4.4, 0xfafcff)));
  // название на стальной трубе вдоль обделки
  const N = s.name || {};
  const tt = textTex(c.title, { fg: N.fg || '#d9d9d6', font: N.font || '600 96px "PT Sans",Arial,sans-serif', spacing: 0.22 });
  const yN = PY + (N.y ?? 2.75), hN = N.h ?? 0.55, ng = [], rail = [];
  // буквы — перед рёбрами обделки по всей высоте (свод выше центра наклоняется к пути)
  const ribU = (y) => uc + Math.sqrt(Math.max(0, (R - d) ** 2 - (y - yc) ** 2));
  const uN = ribU(yN + hN / 2) - 0.08, yR = yN - hN / 2 - 0.05;
  for (const sd of sides) {
    const xr = sd.x0 + sd.sg * uN;
    const cyl = new THREE.CylinderGeometry(0.05, 0.05, 2 * PL, 10); cyl.rotateX(Math.PI / 2); cyl.translate(xr, yR, 0); rail.push(cyl);
    // кронштейны трубы к рёбрам
    const br = ribU(yR) - uN;
    for (let z = -PL + 2; z < PL; z += 3.6) rail.push(box(br, 0.05, 0.05, sd.x0 + sd.sg * (uN + br / 2), yR, z));
    for (const z of [-54, -18, 18, 54]) { const q = new THREE.PlaneGeometry(hN * (tt.userData.aspect || 8), hN); q.rotateY(sd.sg > 0 ? -Math.PI / 2 : Math.PI / 2); q.translate(xr - sd.sg * 0.01, yN, z); ng.push(q); }
  }
  add(grp, M, rail, 'steel');
  const nm = new THREE.MeshStandardMaterial({ map: tt, transparent: true, roughness: 0.3, metalness: 0.6, emissiveMap: tt, emissive: new THREE.Color(0.25, 0.25, 0.25) }); nm.userData.hq = true;
  grp.add(new THREE.Mesh(mergeGeoms(ng), nm));
  const lights = [];
  for (let z = -PL + 8; z < PL; z += 16) for (const sd of sides) lights.push(new THREE.Vector3(sd.x0 + sd.sg * -1.0, PY + 3.4, z + (sd.sg > 0 ? 0 : 8)));
  for (let z = -PL + 8; z < PL; z += 16) lights.push(new THREE.Vector3(cx, info.ceilY - 1.2, z));
  info.lights = lights; info.hemi = s.hemi ?? 0.5; info.poolI = s.poolI ?? 9;
}
function add(grp, M, geoms, mat) { if (geoms.length) grp.add(new THREE.Mesh(mergeGeoms(geoms), M(mat))); }
