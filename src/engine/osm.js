// Реальное окружение открытых участков по данным OpenStreetMap (© участники OpenStreetMap, ODbL):
// ось пути, рельеф с руслом реки, здания с настоящими контурами и высотами, деревья,
// автомобильные мосты и наземная «карта местности» (дороги, тротуары, газоны, вода).
// Система координат участка (OSM-кадр): x — на восток, z — на юг, метры от центра участка.
import * as THREE from 'three';
import { mergeGeoms, boxGeom, cylGeom, makeCanvas, canvasTex, mulberry32 } from './util.js';
import nag from '../assets/osm/nag.json';
import luzh from '../assets/osm/luzh.json';
import nagG from '../assets/osm/nag_ground.jpg';
import luzhG from '../assets/osm/luzh_ground.jpg';
import nagW from '../assets/osm/nag_water.png';
import preo from '../assets/osm/preo.json';
import preoG from '../assets/osm/preo_ground.jpg';
import preoW from '../assets/osm/preo_water.png';
import myak from '../assets/osm/myak.json';
import myakG from '../assets/osm/myak_ground.jpg';
import myakW from '../assets/osm/myak_water.png';
import kunc from '../assets/osm/kunc.json';
import kuncG from '../assets/osm/kunc_ground.jpg';
import kuncW from '../assets/osm/kunc_water.png';
import izm from '../assets/osm/izm.json';
import izmG from '../assets/osm/izm_ground.jpg';
import izmW from '../assets/osm/izm_water.png';
import sal from '../assets/osm/sal.json';
import salG from '../assets/osm/sal_ground.jpg';
import salW from '../assets/osm/sal_water.png';
import luzhW from '../assets/osm/luzh_water.png';

export const OSM = {
  nag: { data: nag, ground: nagG, water: nagW },
  luzh: { data: luzh, ground: luzhG, water: luzhW },
  preo: { data: preo, ground: preoG, water: preoW },
  myak: { data: myak, ground: myakG, water: myakW },
  kunc: { data: kunc, ground: kuncG, water: kuncW },
  izm: { data: izm, ground: izmG, water: izmW },
  sal: { data: sal, ground: salG, water: salW },
};

// Сглаживание оси участка: в данных OSM встречаются изломы (стыки путей), а в метро радиусы
// кривых не меньше ~300 м. Гауссово сглаживание с сохранением концов; положения станции и мостов
// пересчитываются пропорционально новой длине.
function smoothZone(z) {
  if (!z || z._smooth) return;
  const c = z.center;
  let P = [];
  for (let i = 0; i < c.length; i += 2) P.push([c[i], c[i + 1]]);
  // равномерно через 2 м
  const R = [P[0]]; let need = 2;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t = 0;
    while (L - t >= need) { t += need; R.push([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L]); need = 2; }
    need -= L - t;
  }
  R.push(P[P.length - 1]);
  const n = R.length, K = 20, sig = 9;
  const w = []; for (let k = -K; k <= K; k++) w.push(Math.exp(-(k * k) / (2 * sig * sig)));
  const at = (A, i) => (i < 0 ? [2 * A[0][0] - A[-i][0], 2 * A[0][1] - A[-i][1]] : i >= n ? [2 * A[n - 1][0] - A[2 * n - 2 - i][0], 2 * A[n - 1][1] - A[2 * n - 2 - i][1]] : A[i]);
  let A = R;
  for (let pass = 0; pass < 4; pass++) {
    const B = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, ws = 0;
      for (let k = -K; k <= K; k++) { const q = at(A, i + k); x += q[0] * w[k + K]; y += q[1] * w[k + K]; ws += w[k + K]; }
      B.push([x / ws, y / ws]);
    }
    B[0] = R[0]; B[n - 1] = R[n - 1];
    A = B;
  }
  let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(A[i][0] - A[i - 1][0], A[i][1] - A[i - 1][1]);
  const f = L / z.length;
  z.center = A.flat();
  z.station *= f;
  z.bridges = z.bridges.map(([a, b]) => [a * f, Math.min(L, b * f)]);
  z.length = L;
  z._smooth = true;
}
for (const a of Object.values(OSM)) smoothZone(a.data.zone);

export const GROUND_Y = -1.25; // земля относительно головки рельса на наземном участке
const WATER_DEPTH = 6.0; // урез воды ниже набережной
const BED_DEPTH = 9.0;

// Декодирование растров (вызывается при запуске, асинхронно)
export function loadOSM() {
  const jobs = [];
  for (const a of Object.values(OSM)) {
    jobs.push(new Promise((res) => {
      const im = new Image();
      im.onload = () => { a.groundImg = im; res(); };
      im.onerror = () => res();
      im.src = a.ground;
    }));
    jobs.push(new Promise((res) => {
      const im = new Image();
      im.onload = () => {
        const c = makeCanvas(im.width, im.height);
        const ctx = c.getContext('2d');
        ctx.drawImage(im, 0, 0);
        const d = ctx.getImageData(0, 0, im.width, im.height).data;
        const m = new Uint8Array(im.width * im.height);
        for (let i = 0; i < m.length; i++) m[i] = d[i * 4];
        a.waterMask = { w: im.width, h: im.height, m };
        res();
      };
      im.onerror = () => res();
      im.src = a.water;
    }));
  }
  return Promise.all(jobs);
}

// ---------- ось пути ----------
// Полилиния нашего пути (правый путь по ходу движения) в OSM-кадре, в порядке движения.
export function trackPolyline(id, reversed) {
  const z = OSM[id].data.zone;
  const c = z.center;
  let pts = [];
  for (let i = 0; i < c.length; i += 2) pts.push({ x: c[i], z: c[i + 1] });
  if (reversed) pts.reverse();
  const half = z.spacing / 2;
  // смещение вправо по ходу на половину междупутья
  const off = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1;
    const fx = dx / L, fz = dz / L;
    return { x: p.x - fz * half, z: p.z + fx * half };
  });
  // равномерно через 1 м
  const out = [off[0]];
  let need = 1;
  for (let i = 0; i < off.length - 1; i++) {
    const a = off[i], b = off[i + 1];
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    let t = 0;
    while (L - t >= need) { t += need; out.push({ x: a.x + (b.x - a.x) * t / L, z: a.z + (b.z - a.z) * t / L }); need = 1; }
    need -= L - t;
  }
  // курсы и кривизна (сглаженные)
  const n = out.length;
  const hs = new Float64Array(n), ks = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = out[Math.max(0, i - 6)], b = out[Math.min(n - 1, i + 6)];
    hs[i] = Math.atan2(-(b.x - a.x), -(b.z - a.z));
  }
  for (let i = 1; i < n; i++) { while (hs[i] - hs[i - 1] > Math.PI) hs[i] -= 2 * Math.PI; while (hs[i] - hs[i - 1] < -Math.PI) hs[i] += 2 * Math.PI; }
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 20), b = Math.min(n - 1, i + 20);
    ks[i] = (hs[b] - hs[a]) / Math.max(1, b - a);
  }
  const L = n - 1;
  const station = reversed ? z.length - z.station : z.station;
  const bridges = z.bridges.map(([a, b]) => (reversed ? [z.length - b, z.length - a] : [a, b]));
  return { pts: out, hs, ks, length: L, station, bridges, spacing: z.spacing };
}

// Индекс оси участка (в OSM-кадре): ближайшая точка оси и её расстояние вдоль оси от начала данных
export function corridorIndex(id) {
  const c = OSM[id].data.zone.center;
  const P = [];
  for (let i = 0; i < c.length; i += 2) P.push([c[i], c[i + 1]]);
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const C = 20, grid = new Map();
  for (let i = 0; i < P.length - 1; i++) {
    const k = Math.floor((P[i][0] + P[i + 1][0]) / 2 / C) + ',' + Math.floor((P[i][1] + P[i + 1][1]) / 2 / C);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  const L = cum[cum.length - 1];
  return {
    L, P, cum,
    near(x, z, R) {
      const r = Math.ceil(R / C) + 1, cx = Math.floor(x / C), cz = Math.floor(z / C);
      let bd = R, bs = -1;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        const list = grid.get((cx + dx) + ',' + (cz + dz));
        if (!list) continue;
        for (const i of list) {
          const a = P[i], b = P[i + 1];
          const ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez || 1;
          const t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
          const d = Math.hypot(x - a[0] - ex * t, z - a[1] - ez * t);
          if (d < bd) { bd = d; bs = cum[i] + t * Math.sqrt(l2); }
        }
      }
      return bs < 0 ? null : { d: bd, s: bs };
    },
  };
}

// Преобразование OSM-кадра в мир: поворот вокруг Y на beta, затем перенос
export function frameMatrix(beta, px, pz, wx, wy, wz) {
  const m = new THREE.Matrix4().makeRotationY(beta);
  m.setPosition(wx, wy, wz);
  return m.multiply(new THREE.Matrix4().makeTranslation(-px, 0, -pz));
}

// ---------- текстуры фасадов ----------
// Ячейка текстуры — 4 окна × 4 этажа (12 × 12,4 м). Виды: 0 — панельный дом, 1 — кирпичный,
// 2 — стекло (офисы), 3 — промышленный, 4 — исторический (штукатурка, высокие окна), 5 — первый этаж.
let FAC = null;
function facades() {
  if (FAC) return FAC;
  const S = 512, CW = S / 4, CH = S / 4;
  const noise = (ctx, a, n = 2200, sz = 3) => { const r = mulberry32(n); for (let i = 0; i < n; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${r() < 0.5 ? 0 : 255},${a * r()})`; ctx.fillRect(r() * S, r() * S, sz, sz); } };
  const glassG = (ctx, x, y, w, h, r, lit) => {
    const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
    if (lit) { g.addColorStop(0, '#e9d7a8'); g.addColorStop(1, '#b8996a'); }
    else { g.addColorStop(0, `rgb(${120 + r * 40},${142 + r * 40},${160 + r * 35})`); g.addColorStop(0.55, '#3b4a56'); g.addColorStop(1, '#27313a'); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  const mk = (seed, draw) => {
    const c = makeCanvas(S, S); const ctx = c.getContext('2d');
    draw(ctx, mulberry32(seed));
    const t = canvasTex(c, { aniso: 8 }); t.userData.shared = true; return t;
  };
  const windows = (ctx, rng, { w = 0.46, h = 0.5, y = 0.24, frame = '#f2f0ea', fw = 4, split = true, sill = null, balc = null }) => {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const ww = CW * w, wh = CH * h, x = i * CW + (CW - ww) / 2, yy = j * CH + CH * y;
      glassG(ctx, x, yy, ww, wh, rng(), rng() < 0.12);
      ctx.strokeStyle = frame; ctx.lineWidth = fw; ctx.strokeRect(x, yy, ww, wh);
      if (split) { ctx.beginPath(); ctx.moveTo(x + ww * 0.5, yy); ctx.lineTo(x + ww * 0.5, yy + wh); ctx.moveTo(x, yy + wh * 0.32); ctx.lineTo(x + ww, yy + wh * 0.32); ctx.stroke(); }
      if (rng() < 0.25) { ctx.fillStyle = 'rgba(240,236,226,0.55)'; ctx.fillRect(x + 3, yy + 3, ww * (0.3 + rng() * 0.4), wh - 6); } // шторы
      if (sill) { ctx.fillStyle = sill; ctx.fillRect(x - 4, yy + wh, ww + 8, 6); }
      if (balc && rng() < 0.55) { ctx.fillStyle = balc; ctx.fillRect(x - 10, yy + wh * 0.55, ww + 20, wh * 0.5); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 10, yy + wh * 0.55, ww + 20, 4); }
    }
  };
  FAC = [
    mk(1, (ctx, rng) => { // панельный: светлые панели со швами, лоджии
      ctx.fillStyle = '#dcd8cf'; ctx.fillRect(0, 0, S, S); noise(ctx, 0.05);
      ctx.strokeStyle = 'rgba(60,60,60,0.28)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * CW, 0); ctx.lineTo(i * CW, S); ctx.moveTo(0, i * CH); ctx.lineTo(S, i * CH); ctx.stroke(); }
      windows(ctx, rng, { w: 0.5, h: 0.52, frame: '#eceae4', balc: '#cfcabe' });
    }),
    mk(2, (ctx, rng) => { // кирпич
      ctx.fillStyle = '#9b5a43'; ctx.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 8) for (let x = (y / 8) % 2 ? -10 : 0; x < S; x += 20) { const v = rng(); ctx.fillStyle = `rgba(${v < 0.3 ? 40 : 0},0,0,${0.05 + v * 0.12})`; ctx.fillRect(x, y, 19, 7); }
      ctx.fillStyle = 'rgba(230,220,200,0.25)'; for (let y = 7; y < S; y += 8) ctx.fillRect(0, y, S, 1);
      windows(ctx, rng, { w: 0.4, h: 0.5, frame: '#ece6da', sill: '#d8d0c0' });
    }),
    mk(3, (ctx, rng) => { // стекло: витраж с импостами и отражением неба
      const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#8fb0c4'); g.addColorStop(0.5, '#4f6f84'); g.addColorStop(1, '#7c98aa');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) if (rng() < 0.2) { ctx.fillStyle = 'rgba(230,215,170,0.35)'; ctx.fillRect(i * S / 8 + 2, j * CH + 2, S / 8 - 4, CH - 4); }
      ctx.strokeStyle = '#30393f'; ctx.lineWidth = 4;
      for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * S / 8, 0); ctx.lineTo(i * S / 8, S); ctx.stroke(); }
      ctx.lineWidth = 7; for (let j = 0; j <= 4; j++) { ctx.beginPath(); ctx.moveTo(0, j * CH); ctx.lineTo(S, j * CH); ctx.stroke(); }
    }),
    mk(4, (ctx, rng) => { // промышленный: профлист и ленточное остекление
      ctx.fillStyle = '#a9aca9'; ctx.fillRect(0, 0, S, S);
      for (let x = 0; x < S; x += 8) { ctx.fillStyle = x % 16 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'; ctx.fillRect(x, 0, 4, S); }
      noise(ctx, 0.06);
      for (const j of [1, 3]) { for (let i = 0; i < 4; i++) glassG(ctx, i * CW + 6, j * CH + CH * 0.3, CW - 12, CH * 0.35, rng(), false); ctx.fillStyle = '#5d6266'; ctx.fillRect(0, j * CH + CH * 0.3 - 4, S, 4); }
    }),
    mk(5, (ctx, rng) => { // исторический: штукатурка, высокие окна с наличниками, карнизы
      ctx.fillStyle = '#e3d6b4'; ctx.fillRect(0, 0, S, S); noise(ctx, 0.05);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let j = 0; j < 4; j++) ctx.fillRect(0, j * CH, S, 6);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(i * CW, 0, 10, S); }
      windows(ctx, rng, { w: 0.36, h: 0.6, y: 0.2, frame: '#f6efe0', fw: 8, sill: '#f4ecda' });
    }),
    mk(6, (ctx, rng) => { // первый этаж: витрины и входы
      ctx.fillStyle = '#8c8880'; ctx.fillRect(0, 0, S, S); noise(ctx, 0.06);
      for (let i = 0; i < 4; i++) {
        const shop = rng() < 0.6;
        const x = i * CW + 8, w = CW - 16, y = shop ? CH * 0.12 : CH * 0.3, h = CH * (shop ? 0.78 : 0.5);
        glassG(ctx, x, y, w, h, rng(), shop && rng() < 0.5);
        ctx.strokeStyle = '#2e3236'; ctx.lineWidth = 5; ctx.strokeRect(x, y, w, h);
        if (shop) { ctx.fillStyle = ['#a8322d', '#2f6fa8', '#3b7a5a', '#c9a24a'][Math.floor(rng() * 4)]; ctx.fillRect(x, 0, w, CH * 0.1); }
      }
      ctx.drawImage(ctx.canvas, 0, 0, S, CH, 0, CH, S, CH); ctx.drawImage(ctx.canvas, 0, 0, S, 2 * CH, 0, 2 * CH, S, 2 * CH);
    }),
  ];
  const r = makeCanvas(256, 256); const rc = r.getContext('2d');
  rc.fillStyle = '#5f5e5b'; rc.fillRect(0, 0, 256, 256);
  const rr = mulberry32(9);
  for (let i = 0; i < 2500; i++) { rc.fillStyle = `rgba(${rr() < 0.5 ? 0 : 255},${rr() < 0.5 ? 0 : 255},${rr() < 0.5 ? 0 : 255},${0.05 * rr()})`; rc.fillRect(rr() * 256, rr() * 256, 4, 4); }
  rc.strokeStyle = 'rgba(0,0,0,0.18)'; rc.lineWidth = 2; for (let i = 0; i < 256; i += 64) { rc.beginPath(); rc.moveTo(i, 0); rc.lineTo(i, 256); rc.stroke(); }
  FAC.roof = canvasTex(r); FAC.roof.userData.shared = true;
  return FAC;
}

// палитры по типу здания (оттенок умножается на текстуру фасада)
const PALETTE = [
  ['#ffffff', '#f2efe8', '#e8ecef', '#f3ead9', '#e9e4ef', '#e2ebe2'],
  ['#ffffff', '#e8c9a8', '#f0dcb4', '#d8a890', '#f4e4c8'],
  ['#ffffff', '#d8e4ec', '#c9dcd4', '#e6e0d0'],
  ['#ffffff', '#e6e2d4', '#d4dce0', '#e8d8c4'],
  ['#ffffff', '#f6e7bf', '#f2d9c6', '#e9eef0', '#f4e1a8'],
];

// Выдавливание контуров зданий. ground(x, z) — высота рельефа: здания стоят на земле, а не над ней.
function buildBuildings(list, groundY, ground) {
  const g = buildBuildingsSteps(list, groundY, ground); let r; do { r = g.next(); } while (!r.done); return r.value;
}

function* buildBuildingsSteps(list, groundY, ground) {
  const walls = [[], [], [], [], [], []], roofs = [], parapets = [];
  const tmp = new THREE.Color(), white = new THREE.Color('#ffffff');
  let bi = 0;
  for (const b of list) {
    if (++bi % 200 === 0) yield;
    const [h, mh0, kind0] = b;
    const col = b[3];
    let ring = [];
    for (let i = 4; i < b.length; i += 2) ring.push(new THREE.Vector2(b[i] / 10, b[i + 1] / 10));
    if (ring.length < 3) continue;
    let A2 = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], c = ring[(i + 1) % ring.length]; A2 += a.x * c.y - c.x * a.y; }
    if (A2 < 0) ring.reverse(); // против часовой (в координатах x, z): снаружи — справа
    let gmin = 1e9, gsum = 0;
    for (const p of ring) { const g = ground ? ground(p.x, p.y) : groundY; gmin = Math.min(gmin, g); gsum += g; }
    const gmean = gsum / ring.length;
    const mh = mh0 > 0.5 ? mh0 : 0;
    const y0 = mh ? gmean + mh : gmin - 0.6, y1 = gmean + Math.max(h, mh + 2);
    const seed = Math.abs(b[4] * 7 + b[5] * 13) % 997;
    let kind = kind0;
    // жилые 5-этажки и ниже — чаще кирпичные, высокие — панельные
    if (kind === 0 && h < 18 && seed % 3 === 0) kind = 1;
    const pal = PALETTE[kind];
    const tint = new THREE.Color(col && /^#[0-9a-f]{6}$|^[a-z]+$/i.test(col) ? col : pal[seed % pal.length]);
    if (col) tint.lerp(white, 0.4);
    const base = (kind === 0 || kind === 4 || kind === 2) && h > 9 && !mh; // первый этаж — витрины и входы
    const yb = base ? Math.min(y1, gmean + 3.6) : y0;
    let u = 0;
    const per = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const dx = c.x - a.x, dz = c.y - a.y, L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const nx = dz / L, nz = -dx / L;
      per.push([a, c, L, nx, nz, u]);
      u += L;
    }
    const quad = (arr, y0q, y1q, vOff, tintC, ext = 0) => {
      const pos = [], nor = [], uv = [], colr = [];
      for (const [a, c, L, nx, nz, u0] of per) {
        const ax = a.x + nx * ext, az = a.y + nz * ext, cx = c.x + nx * ext, cz = c.y + nz * ext;
        const U0 = u0 / 12, U1 = (u0 + L) / 12, V0 = (y0q - vOff) / 12.4, V1 = (y1q - vOff) / 12.4;
        // снаружи — справа: обход (a0, c1, c0) смотрит наружу
        const q = [[ax, y0q, az, U0, V0], [cx, y1q, cz, U1, V1], [cx, y0q, cz, U1, V0], [ax, y0q, az, U0, V0], [ax, y1q, az, U0, V1], [cx, y1q, cz, U1, V1]];
        for (const v of q) { pos.push(v[0], v[1], v[2]); nor.push(nx, 0, nz); uv.push(v[3], v[4]); colr.push(tintC.r, tintC.g, tintC.b); }
      }
      arr.push({ pos, nor, uv, colr });
    };
    if (base && yb > y0 + 0.5) quad(walls[5], y0, yb, gmean, white);
    quad(walls[kind] || walls[0], yb, y1, gmean, tint);
    // парапет по краю крыши
    if (h > 6) quad(parapets, y1, y1 + 0.7, y1, tmp.copy(tint).multiplyScalar(0.82), 0.02);
    // крыша
    let tri;
    try { tri = THREE.ShapeUtils.triangulateShape(ring, []); } catch (e) { tri = []; }
    const rp = [], rn = [], ru = [];
    for (const [i0, i1, i2] of tri) {
      const p0 = ring[i0], p1 = ring[i1], p2 = ring[i2];
      const up = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x) < 0; // обход, при котором нормаль смотрит вверх
      for (const p of up ? [p0, p1, p2] : [p0, p2, p1]) { rp.push(p.x, y1 + 0.05, p.y); rn.push(0, 1, 0); ru.push(p.x / 16, p.y / 16); }
    }
    roofs.push({ pos: rp, nor: rn, uv: ru });
  }
  const toGeo = (arr, withColor) => {
    let n = 0; for (const a of arr) n += a.pos.length;
    if (!n) return null;
    const P = new Float32Array(n), N = new Float32Array(n), U = new Float32Array(n / 3 * 2), C = withColor ? new Float32Array(n) : null;
    let o = 0, ou = 0;
    for (const a of arr) { P.set(a.pos, o); N.set(a.nor, o); U.set(a.uv, ou); if (C) C.set(a.colr, o); o += a.pos.length; ou += a.uv.length; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
    if (C) g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    g.computeBoundingSphere();
    return g;
  };
  const F = facades();
  const grp = new THREE.Group();
  walls.forEach((arr, k) => {
    const g = toGeo(arr, true);
    if (!g) return;
    const m = new THREE.MeshStandardMaterial({ map: F[k], vertexColors: true, roughness: k === 2 ? 0.2 : 0.85, metalness: k === 2 ? 0.35 : 0 });
    grp.add(new THREE.Mesh(g, m));
  });
  const pg = toGeo(parapets, true);
  if (pg) grp.add(new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: 0xbdb8ae, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })));
  const rg = toGeo(roofs, false);
  if (rg) grp.add(new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: F.roof, roughness: 0.95 })));
  return grp;
}

// Рельеф: сетка с понижением в русле реки по маске воды
function buildTerrain(area, groundY, cut, cor) {
  const d = area.data, b = d.bounds, tex = d.tex;
  // шаг сетки рельефа: на больших участках крупнее (не больше ~60 тыс. узлов)
  const step = Math.max(10, Math.round(Math.sqrt((b[2] - b[0]) * (b[3] - b[1]) / 60000)));
  const nx = Math.ceil((b[2] - b[0]) / step) + 1, nz = Math.ceil((b[3] - b[1]) / step) + 1;
  const wm = area.waterMask;
  const wAt = (x, z) => {
    if (!wm) return 0;
    const u = (x - tex.x0) / (tex.x1 - tex.x0) * (wm.w - 1), v = (z - tex.z0) / (tex.z1 - tex.z0) * (wm.h - 1);
    const i = Math.max(0, Math.min(wm.w - 2, Math.floor(u))), j = Math.max(0, Math.min(wm.h - 2, Math.floor(v)));
    const fu = Math.min(1, Math.max(0, u - i)), fv = Math.min(1, Math.max(0, v - j));
    const m = wm.m, W = wm.w;
    return ((m[j * W + i] * (1 - fu) + m[j * W + i + 1] * fu) * (1 - fv) + (m[(j + 1) * W + i] * (1 - fu) + m[(j + 1) * W + i + 1] * fu) * fv) / 255;
  };
  const pos = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const x = b[0] + i * step, z = b[1] + j * step;
    // сглаженная маска воды: среднее по окрестности
    let w = 0; for (const [dx, dz] of [[0, 0], [6, 0], [-6, 0], [0, 6], [0, -6]]) w += wAt(x + dx, z + dz); w /= 5;
    const t = Math.min(1, Math.max(0, (w - 0.15) / 0.5));
    let y = groundY - BED_DEPTH * t * t * (3 - 2 * t);
    if (cut) y = Math.min(y, cut(x, z, y));
    const k = j * nx + i;
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
    uv[k * 2] = (x - tex.x0) / (tex.x1 - tex.x0); uv[k * 2 + 1] = 1 - (z - tex.z0) / (tex.z1 - tex.z0);
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    // в выемке (рампа к порталу) клетки рельефа убираются — их место занимают подпорные стенки и полоса земли
    if (cor && cor.isCut(b[0] + (i + 0.5) * step, b[1] + (j + 0.5) * step, cor.halfW + 6)) continue;
    const a = j * nx + i, c = a + nx; idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  let map = null;
  if (area.groundImg) {
    map = new THREE.Texture(area.groundImg); map.needsUpdate = true; map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  }
  const m = new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : 0x8a8f7a, roughness: 0.95 });
  // мелкая детализация поверх карты местности (асфальт, трава), чтобы вблизи земля не была размытой
  const det = detailTexture();
  const rep = new THREE.Vector2((tex.x1 - tex.x0) / 6, (tex.z1 - tex.z0) / 6);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.detMap = { value: det }; sh.uniforms.detRep = { value: rep };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detMap; uniform vec2 detRep;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n#ifdef USE_MAP\n{ float d = texture2D(detMap, vMapUv * detRep).r; float d2 = texture2D(detMap, vMapUv * detRep * 0.23).g; diffuseColor.rgb *= 0.78 + 0.32 * d + 0.12 * (d2 - 0.5); }\n#endif');
  };
  m.customProgramCacheKey = () => 'osm-terrain';
  const mesh = new THREE.Mesh(g, m);
  // поверхность воды
  // поверхность воды — только над руслом (иначе плоскость воды прорезала бы тоннели)
  const wp = [], wy = groundY - WATER_DEPTH;
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const x = b[0] + (i + 0.5) * step, z = b[1] + (j + 0.5) * step;
    let ww = 0; for (const [dx, dz] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8]]) ww = Math.max(ww, wAt(x + dx, z + dz));
    if (ww < 0.08) continue;
    const x0 = x - step / 2, x1 = x + step / 2, z0 = z - step / 2, z1 = z + step / 2;
    wp.push(x0, wy, z0, x0, wy, z1, x1, wy, z0, x1, wy, z0, x0, wy, z1, x1, wy, z1);
  }
  const grp = new THREE.Group();
  grp.add(mesh);
  // высота рельефа в точке (билинейно по сетке) — для посадки зданий и деревьев
  grp.userData.height = (x, z) => {
    const fi = Math.max(0, Math.min(nx - 1.001, (x - b[0]) / step)), fj = Math.max(0, Math.min(nz - 1.001, (z - b[1]) / step));
    const i = Math.floor(fi), j = Math.floor(fj), u = fi - i, v = fj - j;
    const Y = (ii, jj) => pos[(jj * nx + ii) * 3 + 1];
    return (Y(i, j) * (1 - u) + Y(i + 1, j) * u) * (1 - v) + (Y(i, j + 1) * (1 - u) + Y(i + 1, j + 1) * u) * v;
  };
  if (wp.length) {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
    wg.computeVertexNormals();
    grp.add(new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0x3c5a6e, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.92, side: THREE.DoubleSide })));
  }
  if (cor) {
    const strip = corridorStrip(cor, groundY, tex);
    if (strip) grp.add(new THREE.Mesh(strip, Object.assign(m.clone(), { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  }
  return grp;
}

// Полоса земли вдоль выемки: от подпорной стенки до края убранных клеток рельефа
function corridorStrip(cor, groundY, tex) {
  const { P, cum } = cor.index;
  const pos = [], uv = [], idx = [];
  const W0 = cor.halfW, W1 = cor.halfW + 24;
  let run = -1;
  const step = 3;
  let prevCut = false;
  for (let s = 0; s <= cor.index.L; s += step) {
    const c = cor.cutAt(s);
    // точка и нормаль оси
    let i = 0; while (i < cum.length - 2 && cum[i + 1] < s) i++;
    const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = (s - cum[i]) / l;
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    const nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;
    if (!c) { prevCut = false; continue; }
    const base = pos.length / 3;
    for (const w of [-W1, -W0, W0, W1]) {
      const px = x + nx * w, pz = z + nz * w;
      pos.push(px, groundY + 0.03, pz);
      uv.push((px - tex.x0) / (tex.x1 - tex.x0), 1 - (pz - tex.z0) / (tex.z1 - tex.z0));
    }
    if (prevCut) {
      const p = base - 4;
      idx.push(p, base, p + 1, p + 1, base, base + 1, p + 2, base + 2, p + 3, p + 3, base + 2, base + 3);
    }
    prevCut = true;
  }
  if (!idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // нормали вверх независимо от направления обхода
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

let DET = null;
function detailTexture() {
  if (DET) return DET;
  const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S), r = mulberry32(41);
  // r — мелкое зерно, g — крупные пятна
  const big = new Float32Array(17 * 17); for (let i = 0; i < big.length; i++) big[i] = r();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const fx = x / S * 16, fy = y / S * 16, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const B = (a, b) => big[(b % 16) * 17 + (a % 16)];
    const g = (B(ix, iy) * (1 - u) + B(ix + 1, iy) * u) * (1 - v) + (B(ix, iy + 1) * (1 - u) + B(ix + 1, iy + 1) * u) * v;
    const k = (y * S + x) * 4;
    img.data[k] = 128 + (r() - 0.5) * 200; img.data[k + 1] = g * 255; img.data[k + 2] = 128; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  DET = canvasTex(c, { srgb: false, aniso: 8 }); DET.userData.shared = true;
  return DET;
}

function crown(r, y, x = 0, z = 0) {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const p = g.attributes.position, rr = mulberry32(Math.round((r + y + x) * 100));
  for (let i = 0; i < p.count; i++) { const k = 0.85 + rr() * 0.3; p.setXYZ(i, p.getX(i) * k + x, p.getY(i) * k * 0.85 + y, p.getZ(i) * k + z); }
  g.deleteAttribute('uv');
  return g.toNonIndexed();
}
function treeGeos() {
  const trunk = (h) => { const g = cylGeom(0.16, 0.24, h, 6, 0, h / 2, 0); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; };
  const leaf = mergeGeoms([trunk(3.2), crown(2.6, 5.2), crown(1.9, 6.6, 0.9, 0.4), crown(1.8, 5.6, -1.0, -0.6)]); // липа, клён, тополь
  const birch = mergeGeoms([trunk(4.2), crown(1.6, 5.6, 0, 0), crown(1.3, 7.0, 0.3, 0.2)]);
  const fir = mergeGeoms([trunk(2.4), cylGeom(0.0, 2.2, 5.2, 8, 0, 4.6, 0), cylGeom(0.0, 1.7, 3.4, 8, 0, 7.0, 0)].map((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; }));
  return [leaf, birch, fir];
}

function buildTrees(list, groundY, max, ground) {
  const n = Math.min(max, list.length / 2);
  if (!n) return null;
  const grp = new THREE.Group();
  const geos = treeGeos();
  const share = [0.72, 0.18, 0.10];
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const rng = mulberry32(7);
  const pick = []; for (let i = 0; i < n; i++) { const r = rng(); pick.push(r < share[0] ? 0 : r < share[0] + share[1] ? 1 : 2); }
  geos.forEach((geo, t) => {
    const idx = []; pick.forEach((v, i) => { if (v === t) idx.push(i); });
    if (!idx.length) return;
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    const inst = new THREE.InstancedMesh(geo, m, idx.length);
    const r2 = mulberry32(11 + t);
    idx.forEach((i, k) => {
      const sc = 0.75 + r2() * 0.8;
      s.set(sc, sc * (0.85 + r2() * 0.4), sc);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r2() * 6.28);
      const x = list[i * 2] / 10, z = list[i * 2 + 1] / 10;
      p.set(x, (ground ? ground(x, z) : groundY) - 0.1, z);
      M.compose(p, q, s); inst.setMatrixAt(k, M);
      const hue = t === 2 ? 0.33 : 0.22 + r2() * 0.08;
      inst.setColorAt(k, c.setHSL(hue, 0.35 + r2() * 0.2, t === 2 ? 0.16 + r2() * 0.06 : 0.22 + r2() * 0.12));
    });
    inst.computeBoundingSphere();
    grp.add(inst);
  });
  return grp;
}

function buildRoadBridges(list, groundY) {
  const deck = [], piers = [];
  for (const r of list) {
    const w = r[0];
    for (let i = 1; i + 3 < r.length; i += 2) {
      const ax = r[i] / 10, az = r[i + 1] / 10, bx = r[i + 2] / 10, bz = r[i + 3] / 10;
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.5) continue;
      const g = boxGeom(w, 1.4, L + 0.3, 0, 0, 0);
      g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.atan2(bx - ax, bz - az)));
      g.translate((ax + bx) / 2, groundY - 0.5, (az + bz) / 2);
      deck.push(g);
      if (L > 30) piers.push(boxGeom(2.0, 9, 3.0, (ax + bx) / 2, groundY - 5.6, (az + bz) / 2));
    }
  }
  if (!deck.length) return null;
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(mergeGeoms(deck), new THREE.MeshStandardMaterial({ color: 0x8f8e8a, roughness: 0.8 })));
  if (piers.length) grp.add(new THREE.Mesh(mergeGeoms(piers), new THREE.MeshStandardMaterial({ color: 0xa6a39c, roughness: 0.85 })));
  return grp;
}

// Главное здание МГУ (за пределами загруженного участка, но видно с Лужнецкого моста)
function msu(area, groundY) {
  const P = area.data.origin;
  const x = (37.5303 - P[1]) * 111320 * Math.cos(P[0] * Math.PI / 180), z = -(55.7033 - P[0]) * 110540;
  const m = new THREE.MeshStandardMaterial({ color: 0xd9cfb8, roughness: 0.85 });
  const g = mergeGeoms([
    boxGeom(70, 70, 50, 0, 35, 0), boxGeom(44, 60, 36, 0, 100, 0), boxGeom(30, 40, 26, 0, 150, 0), boxGeom(18, 20, 18, 0, 180, 0), cylGeom(0.6, 6, 50, 8, 0, 215, 0),
    boxGeom(90, 45, 36, -85, 22, 0), boxGeom(90, 45, 36, 85, 22, 0), boxGeom(26, 40, 26, -135, 60, 0), boxGeom(26, 40, 26, 135, 60, 0),
    boxGeom(60, 30, 80, -80, 15, -60), boxGeom(60, 30, 80, 80, 15, -60),
  ]);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, groundY + 55, z); // здание стоит на Воробьёвых горах
  return mesh;
}

// Окружение участка в OSM-кадре; matrix — перевод в мир. cut(x,z,y) — понижение рельефа (под путь)
// corridor: { index, halfW (половина ширины выемки), clearB, clearT, cutAt(sData) }
export function buildOsmEnv(id, matrix, opts = {}) {
  const g = buildOsmEnvSteps(id, matrix, opts); let r; do { r = g.next(); } while (!r.done); return r.value;
}

// по частям: фильтр, рельеф, здания (порциями), деревья — чтобы не останавливать игру
export function* buildOsmEnvSteps(id, matrix, { cut = null, maxTrees = 6000, corridor = null } = {}) {
  const area = OSM[id];
  const d = area.data;
  const g = new THREE.Group();
  let blds = d.buildings, trees = d.trees;
  if (corridor) {
    const ix = corridor.index;
    corridor.isCut = (x, z, R) => { const q = ix.near(x, z, R); return !!q && q.s > 0.5 && q.s < ix.L - 0.5 && corridor.cutAt(q.s); };
    const ex = corridor.extra || [];
    const nearEx = (x, z, R) => ex.some((p) => Math.abs(p[0] - x) < R && Math.abs(p[1] - z) < R && Math.hypot(p[0] - x, p[1] - z) < R);
    blds = blds.filter((b) => { for (let i = 4; i < b.length; i += 2) { const x = b[i] / 10, z = b[i + 1] / 10; if (ix.near(x, z, corridor.clearB) || nearEx(x, z, 30)) return false; } return true; });
    const tr = [];
    for (let i = 0; i < trees.length; i += 2) if (!ix.near(trees[i] / 10, trees[i + 1] / 10, corridor.clearT)) tr.push(trees[i], trees[i + 1]);
    trees = tr;
  }
  yield;
  const terr = buildTerrain(area, GROUND_Y, cut, corridor);
  g.add(terr);
  yield;
  const H = terr.userData.height;
  g.add(yield* buildBuildingsSteps(blds, GROUND_Y, H));
  yield;
  const t = buildTrees(trees, GROUND_Y, maxTrees, H);
  if (t) g.add(t);
  const rb = buildRoadBridges(d.roadBridges, GROUND_Y);
  if (rb) g.add(rb);
  if (id === 'luzh') g.add(msu(area, GROUND_Y));
  g.applyMatrix4(matrix);
  g.updateMatrixWorld(true);
  g.userData.osm = id;
  return g;
}

// Окружение «вокруг станции»: OSM-точка станции совмещается с центром станции и её осью
export function anchorMatrix(id, wx, wy, wz, heading, reversed) {
  const a = OSM[id].data.anchor;
  const tx = reversed ? -a.tx : a.tx, tz = reversed ? -a.tz : a.tz;
  const hOsm = Math.atan2(-tx, -tz);
  return frameMatrix(heading - hOsm, a.x, a.z, wx, wy, wz);
}
