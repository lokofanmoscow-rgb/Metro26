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
import luzhW from '../assets/osm/luzh_water.png';

export const OSM = {
  nag: { data: nag, ground: nagG, water: nagW },
  luzh: { data: luzh, ground: luzhG, water: luzhW },
};

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
let FAC = null;
function facades() {
  if (FAC) return FAC;
  const mk = (base, win, frame, opts = {}) => {
    const c = makeCanvas(256, 256);
    const ctx = c.getContext('2d');
    const rng = mulberry32(opts.seed || 3);
    ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
    if (opts.brick) {
      for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < 256; x += 16) { ctx.fillStyle = `rgba(0,0,0,${0.05 + rng() * 0.08})`; ctx.fillRect(x, y, 15, 7); }
    }
    if (opts.panel) { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2; for (let i = 0; i <= 256; i += 128) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); } }
    // окна: 2×2 ячейки (u — 3 м, v — этаж 3.1 м)
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const x = i * 128, y = j * 128;
      const ww = opts.glass ? 120 : 64, wh = opts.glass ? 116 : 70;
      const ox = x + (128 - ww) / 2, oy = y + (opts.glass ? 6 : 26);
      const lit = rng();
      const g = ctx.createLinearGradient(0, oy, 0, oy + wh);
      g.addColorStop(0, lit < 0.15 ? '#d9c79a' : win[0]); g.addColorStop(1, lit < 0.15 ? '#a8946a' : win[1]);
      ctx.fillStyle = g; ctx.fillRect(ox, oy, ww, wh);
      ctx.strokeStyle = frame; ctx.lineWidth = opts.glass ? 3 : 5; ctx.strokeRect(ox, oy, ww, wh);
      if (!opts.glass) { ctx.beginPath(); ctx.moveTo(ox + ww / 2, oy); ctx.lineTo(ox + ww / 2, oy + wh); ctx.stroke(); }
      if (opts.balcony && rng() < 0.5) { ctx.fillStyle = opts.balcony; ctx.fillRect(ox - 6, oy + wh - 6, ww + 12, 26); }
    }
    const t = canvasTex(c, { aniso: 8 });
    t.userData.shared = true;
    return t;
  };
  FAC = [
    mk('#d9d4c8', ['#566876', '#2e3a44'], '#eeeae2', { panel: true, balcony: '#c9c3b6', seed: 1 }), // панельный жилой
    mk('#9a5b44', ['#4e5e6a', '#2a343c'], '#e8e2d8', { brick: true, seed: 2 }), // кирпич
    mk('#7f95a4', ['#5f7f97', '#2f4658'], '#3b4650', { glass: true, seed: 3 }), // стекло
    mk('#a7a9a8', ['#5b666e', '#3a434a'], '#8a8d8e', { panel: true, seed: 4 }), // промышленный
    mk('#e7dcc0', ['#4d5c66', '#2a3238'], '#f4ecd8', { seed: 5 }), // исторический
  ];
  const r = makeCanvas(128, 128); const rc = r.getContext('2d');
  rc.fillStyle = '#6d6c69'; rc.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) { rc.fillStyle = `rgba(${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},${Math.random() < 0.5 ? 0 : 255},0.05)`; rc.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
  FAC.roof = canvasTex(r); FAC.roof.userData.shared = true;
  return FAC;
}

const KIND_TINT = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#ffffff'];

// Выдавливание контуров зданий в одну геометрию на тип фасада
function buildBuildings(list, groundY) {
  const walls = [[], [], [], [], []], roofs = [];
  for (const b of list) {
    const [h, mh, kind] = b;
    const col = b[3];
    const ring = [];
    for (let i = 4; i < b.length; i += 2) ring.push(new THREE.Vector2(b[i] / 10, b[i + 1] / 10));
    if (ring.length < 3) continue;
    const y0 = groundY + mh, y1 = groundY + Math.max(h, mh + 1);
    const W = walls[kind] || walls[0];
    const pos = [], nor = [], uv = [], colr = [];
    const tint = new THREE.Color(col && /^#|^[a-z]+$/i.test(col) ? col : KIND_TINT[kind]);
    if (col) tint.lerp(new THREE.Color('#ffffff'), 0.35);
    let u = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], c = ring[(i + 1) % ring.length];
      const dx = c.x - a.x, dz = c.y - a.y, L = Math.hypot(dx, dz);
      if (L < 0.05) continue;
      const nx = dz / L, nz = -dx / L; // наружу (контур против часовой в кадре x,z)
      const u0 = u / 3, u1 = (u + L) / 3, v0 = (y0 - groundY) / 3.1, v1 = (y1 - groundY) / 3.1;
      const quad = [[a.x, y0, a.y, u0, v0], [c.x, y0, c.y, u1, v0], [c.x, y1, c.y, u1, v1], [a.x, y0, a.y, u0, v0], [c.x, y1, c.y, u1, v1], [a.x, y1, a.y, u0, v1]];
      for (const q of quad) { pos.push(q[0], q[1], q[2]); nor.push(nx, 0, nz); uv.push(q[3] / 2, q[4] / 2); colr.push(tint.r, tint.g, tint.b); }
      u += L;
    }
    W.push({ pos, nor, uv, colr });
    // крыша
    let tri;
    try { tri = THREE.ShapeUtils.triangulateShape(ring, []); } catch (e) { tri = []; }
    const rp = [], rn = [], ru = [];
    for (const [i0, i1, i2] of tri) for (const k of [i0, i2, i1]) { rp.push(ring[k].x, y1, ring[k].y); rn.push(0, 1, 0); ru.push(ring[k].x / 8, ring[k].y / 8); }
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
    const m = new THREE.MeshStandardMaterial({ map: F[k], vertexColors: true, roughness: k === 2 ? 0.25 : 0.85, metalness: k === 2 ? 0.3 : 0, side: THREE.DoubleSide });
    grp.add(new THREE.Mesh(g, m));
  });
  const rg = toGeo(roofs, false);
  if (rg) grp.add(new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: F.roof, roughness: 0.95 })));
  return grp;
}

// Рельеф: сетка с понижением в русле реки по маске воды
function buildTerrain(area, groundY, cut, cor) {
  const d = area.data, b = d.bounds, tex = d.tex;
  const step = 10;
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
  const mesh = new THREE.Mesh(g, m);
  // поверхность воды
  const water = new THREE.Mesh(new THREE.PlaneGeometry(b[2] - b[0], b[3] - b[1]).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3c5a6e, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.92 }));
  water.position.set((b[0] + b[2]) / 2, groundY - WATER_DEPTH, (b[1] + b[3]) / 2);
  const grp = new THREE.Group();
  grp.add(mesh, water);
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

function treeGeo() {
  return mergeGeoms([cylGeom(0.14, 0.2, 2.4, 6, 0, 1.2, 0), cylGeom(0.0, 2.3, 5.2, 8, 0, 4.6, 0), cylGeom(0.0, 1.8, 3.4, 8, 0, 7.0, 0)]);
}

function buildTrees(list, groundY, max) {
  const n = Math.min(max, list.length / 2);
  if (!n) return null;
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const inst = new THREE.InstancedMesh(treeGeo(), m, n);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  const rng = mulberry32(7);
  for (let i = 0; i < n; i++) {
    const k = 0.8 + rng() * 0.9;
    s.set(k, k * (0.8 + rng() * 0.5), k);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28);
    p.set(list[i * 2] / 10, groundY, list[i * 2 + 1] / 10);
    M.compose(p, q, s); inst.setMatrixAt(i, M);
    inst.setColorAt(i, c.setHSL(0.25 + rng() * 0.08, 0.35 + rng() * 0.2, 0.2 + rng() * 0.12));
  }
  inst.computeBoundingSphere();
  return inst;
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
export function buildOsmEnv(id, matrix, { cut = null, maxTrees = 6000, corridor = null } = {}) {
  const area = OSM[id];
  const d = area.data;
  const g = new THREE.Group();
  let blds = d.buildings, trees = d.trees;
  if (corridor) {
    const ix = corridor.index;
    corridor.isCut = (x, z, R) => { const q = ix.near(x, z, R); return !!q && q.s > 0.5 && q.s < ix.L - 0.5 && corridor.cutAt(q.s); };
    blds = blds.filter((b) => { for (let i = 4; i < b.length; i += 2) if (ix.near(b[i] / 10, b[i + 1] / 10, corridor.clearB)) return false; return true; });
    const tr = [];
    for (let i = 0; i < trees.length; i += 2) if (!ix.near(trees[i] / 10, trees[i + 1] / 10, corridor.clearT)) tr.push(trees[i], trees[i + 1]);
    trees = tr;
  }
  g.add(buildTerrain(area, GROUND_Y, cut, corridor));
  g.add(buildBuildings(blds, GROUND_Y));
  const t = buildTrees(trees, GROUND_Y, maxTrees);
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
