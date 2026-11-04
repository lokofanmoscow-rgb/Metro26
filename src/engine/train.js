// Модели поездов: 81-717/714 «Номерной», 81-775/776 «Москва-2020», 81-740/741 «Русич».
// Система вагона: начало — центр кузова на уровне головки рельса; вперёд = -Z, вправо = +X.
import * as THREE from 'three';
import { makeCanvas, canvasTex, mergeGeoms, boxGeom, cylGeom, mulberry32 } from './util.js';

const HALF_W = 1.35, BODY_Y0 = 0.62, SIDE_TOP = 3.15, ROOF_TOP = 3.62;
export const FLOOR_Y = 1.15;

export const LIVERY = {
  '717': { body: '#3f8296', dark: '#2a5967', stripe: '#ece6cf', roof: '#bfc3c2', door: '#3f8296', winBand: null },
  '775': { body: '#e8eaeb', dark: '#2b2f33', stripe: '#d0202c', roof: '#cfd3d5', door: '#d8dadb', winBand: '#16191c' },
  '740': { body: '#bcc0c4', dark: '#8a8f94', stripe: '#2a62b8', roof: '#aeb3b7', door: '#c4c8cc', winBand: null },
};

// Компоновка дверей/окон секции (z центров дверей по длине кузова Lb, кабина спереди — dz)
function doorLayout(type, Lb, cab) {
  const n = type === '740' ? 2 : 4;
  const out = [];
  const z0 = -Lb / 2 + (cab ? 3.0 : 0.9), z1 = Lb / 2 - 0.9;
  const usable = z1 - z0;
  for (let i = 0; i < n; i++) out.push(z0 + usable * ((i + 0.5) / n));
  return out;
}

function sideTexture(type, Lb, doors, doorW, cab, number) {
  const L = LIVERY[type];
  const PX = 64; // px/м
  const W = Math.ceil(Lb * PX), H = Math.ceil((SIDE_TOP - BODY_Y0) * PX);
  const c = makeCanvas(W, H), e = makeCanvas(W, H);
  const ctx = c.getContext('2d'), etx = e.getContext('2d');
  const Y = (y) => (SIDE_TOP - y) * PX; // высота -> px
  const Z = (z) => (z + Lb / 2) * PX;
  etx.fillStyle = '#000'; etx.fillRect(0, 0, W, H);
  ctx.fillStyle = L.body; ctx.fillRect(0, 0, W, H);
  // полосы
  if (type === '717') {
    ctx.fillStyle = L.dark; ctx.fillRect(0, Y(1.0), W, Y(BODY_Y0) - Y(1.0));
    ctx.fillStyle = L.stripe; ctx.fillRect(0, Y(1.72), W, 0.07 * PX);
  } else if (type === '775') {
    ctx.fillStyle = L.winBand; ctx.fillRect(0, Y(2.95), W, Y(1.7) - Y(2.95));
    ctx.fillStyle = L.stripe; ctx.fillRect(0, Y(0.95), W, Y(0.72) - Y(0.95));
    ctx.fillStyle = '#9aa0a4'; ctx.fillRect(0, Y(0.72), W, H);
  } else {
    ctx.fillStyle = L.stripe; ctx.fillRect(0, Y(1.05), W, Y(0.72) - Y(1.05));
    ctx.fillRect(0, Y(1.78), W, 0.05 * PX);
    // гофр нержавейки
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let x = 0; x < W; x += 6) ctx.fillRect(x, Y(1.7), 2, Y(1.08) - Y(1.7));
  }
  // окна между дверями
  const win = (z0, z1) => {
    if (z1 - z0 < 0.6) return;
    const y0 = type === '775' ? 1.78 : 1.85, y1 = type === '775' ? 2.9 : 2.78;
    ctx.fillStyle = '#20262b'; ctx.fillRect(Z(z0), Y(y1), (z1 - z0) * PX, (y1 - y0) * PX);
    // светлый салон
    const g = ctx.createLinearGradient(0, Y(y1), 0, Y(y0));
    g.addColorStop(0, '#fff6dc'); g.addColorStop(0.25, '#d9d2bd'); g.addColorStop(1, '#8a8574');
    ctx.fillStyle = g; ctx.fillRect(Z(z0) + 3, Y(y1) + 3, (z1 - z0) * PX - 6, (y1 - y0) * PX - 6);
    etx.fillStyle = '#7a7466'; etx.fillRect(Z(z0) + 3, Y(y1) + 3, (z1 - z0) * PX - 6, (y1 - y0) * PX - 6);
    etx.fillStyle = '#b8b09a'; etx.fillRect(Z(z0) + 3, Y(y1) + 3, (z1 - z0) * PX - 6, 0.18 * PX);
    // поручни и силуэты пассажиров
    const rng = mulberry32(Math.floor(z0 * 100) + number);
    for (let z = z0 + 0.3; z < z1 - 0.3; z += 0.55) {
      if (rng() < 0.45) {
        const x = Z(z), top = Y(y0 + 0.6 + rng() * 0.3);
        ctx.fillStyle = `rgba(${40 + rng() * 60},${40 + rng() * 50},${50 + rng() * 60},0.85)`;
        ctx.beginPath(); ctx.arc(x, top, 0.11 * PX, 0, 7); ctx.fill();
        ctx.fillRect(x - 0.17 * PX, top + 0.1 * PX, 0.34 * PX, Y(y0) - top);
        etx.fillStyle = '#000'; etx.beginPath(); etx.arc(x, top, 0.11 * PX, 0, 7); etx.fill(); etx.fillRect(x - 0.17 * PX, top + 0.1 * PX, 0.34 * PX, Y(y0) - top);
      }
    }
    ctx.strokeStyle = type === '740' ? '#1d1f22' : '#2a2f33'; ctx.lineWidth = 4; ctx.strokeRect(Z(z0), Y(y1), (z1 - z0) * PX, (y1 - y0) * PX);
    // форточки
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(Z(z0), Y(y1) + 0.22 * PX, (z1 - z0) * PX, 3);
  };
  const edges = [cab ? -Lb / 2 + 2.6 : -Lb / 2 + 0.3, ...doors.flatMap((d) => [d - doorW / 2 - 0.25, d + doorW / 2 + 0.25]), Lb / 2 - 0.3];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i], b = edges[i + 1];
    // большие окна, разделённые простенками
    const n = Math.max(1, Math.round((b - a) / 1.35));
    const w = (b - a) / n;
    for (let k = 0; k < n; k++) win(a + k * w + 0.06, a + (k + 1) * w - 0.06);
  }
  // проёмы дверей: тамбур, видимый при открытых дверях
  for (const d of doors) {
    const x = Z(d - doorW / 2), w = doorW * PX;
    const g = ctx.createLinearGradient(0, Y(3.05), 0, Y(FLOOR_Y));
    g.addColorStop(0, '#fff3d4'); g.addColorStop(0.3, '#cfc6ae'); g.addColorStop(0.9, '#7c7666'); g.addColorStop(1, '#3a3834');
    ctx.fillStyle = g; ctx.fillRect(x, Y(3.05), w, Y(FLOOR_Y) - Y(3.05));
    ctx.fillStyle = '#c9c9c4'; ctx.fillRect(x + w / 2 - 3, Y(3.0), 6, Y(FLOOR_Y) - Y(3.0)); // поручень
    etx.fillStyle = '#9a9384'; etx.fillRect(x, Y(3.05), w, Y(FLOOR_Y) - Y(3.05));
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3; ctx.strokeRect(x - 2, Y(3.07), w + 4, Y(FLOOR_Y) - Y(3.07));
  }
  // кабина: боковая дверь машиниста
  if (cab) {
    const z0 = -Lb / 2 + 0.75;
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 3; ctx.strokeRect(Z(z0), Y(3.0), 0.75 * PX, Y(1.0) - Y(3.0));
    ctx.fillStyle = '#20262b'; ctx.fillRect(Z(z0) + 6, Y(2.85), 0.75 * PX - 12, 0.85 * PX);
    ctx.fillStyle = '#20262b'; ctx.fillRect(Z(-Lb / 2 + 1.65), Y(2.8), 0.8 * PX, 0.8 * PX);
  }
  // номер вагона и логотип
  ctx.fillStyle = type === '775' ? '#2b2f33' : '#f4f4f0';
  ctx.font = `700 ${0.2 * PX}px Arial`; ctx.textAlign = 'center';
  ctx.fillText(String(number), Z(Lb / 2 - 1.4), Y(1.25));
  if (type === '775') { ctx.fillStyle = '#d0202c'; ctx.font = `700 ${0.22 * PX}px Arial`; ctx.fillText('МОСКВА', Z(0), Y(1.35)); }
  if (type === '740') { ctx.fillStyle = '#2a62b8'; ctx.font = `700 ${0.2 * PX}px Arial`; ctx.fillText('РУСИЧ', Z(0), Y(1.38)); }
  // грязь/блики
  const gg = ctx.createLinearGradient(0, 0, 0, H);
  gg.addColorStop(0, 'rgba(255,255,255,0.12)'); gg.addColorStop(0.6, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
  const t = canvasTex(c), te = canvasTex(e);
  t.wrapS = t.wrapT = te.wrapS = te.wrapT = THREE.ClampToEdgeWrapping;
  return { map: t, emissive: te };
}

function doorTexture(type, doorW) {
  const L = LIVERY[type];
  const PX = 96;
  const W = Math.ceil(doorW / 2 * PX), H = Math.ceil((3.05 - FLOOR_Y) * PX);
  const c = makeCanvas(W, H), e = makeCanvas(W, H);
  const ctx = c.getContext('2d'), etx = e.getContext('2d');
  ctx.fillStyle = L.door; ctx.fillRect(0, 0, W, H);
  etx.fillStyle = '#000'; etx.fillRect(0, 0, W, H);
  if (type === '775') { ctx.fillStyle = '#3a3f44'; ctx.fillRect(0, 0, W, H); }
  const wy0 = type === '775' ? 0.08 : 0.25, wy1 = type === '775' ? 0.85 : 0.62;
  ctx.fillStyle = '#20262b'; ctx.fillRect(8, H * (1 - wy1 - 0.0) - H * 0 + 0, 0, 0);
  const g = ctx.createLinearGradient(0, H * (1 - wy1), 0, H * (1 - wy0));
  g.addColorStop(0, '#fff2d0'); g.addColorStop(1, '#8a8574');
  ctx.fillStyle = '#1e2226'; ctx.fillRect(6, H * (1 - wy1) - 4, W - 12, H * (wy1 - wy0) + 8);
  ctx.fillStyle = g; ctx.fillRect(10, H * (1 - wy1), W - 20, H * (wy1 - wy0));
  etx.fillStyle = '#6a6458'; etx.fillRect(10, H * (1 - wy1), W - 20, H * (wy1 - wy0));
  if (type === '717') { ctx.fillStyle = L.dark; ctx.fillRect(0, H - 0.18 * PX, W, 0.18 * PX); ctx.fillStyle = L.stripe; ctx.fillRect(0, H - (1.72 - FLOOR_Y) * PX, W, 0.07 * PX); }
  if (type === '740') { ctx.fillStyle = L.stripe; ctx.fillRect(0, H - 0.12 * PX, W, 0.12 * PX); }
  if (type === '775') { ctx.fillStyle = '#d0202c'; ctx.fillRect(0, 0, 6, H); }
  ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.strokeRect(1, 1, W - 2, H - 2);
  const t = canvasTex(c), te = canvasTex(e);
  t.wrapS = t.wrapT = te.wrapS = te.wrapT = THREE.ClampToEdgeWrapping;
  return { map: t, emissive: te };
}

// Лобовая маска (текстура) — общий вид каждой модели
function frontTexture(type, dest, rear = false) {
  const PX = 160;
  const W = Math.ceil(2 * HALF_W * PX), H = Math.ceil((ROOF_TOP - 0.3) * PX);
  const c = makeCanvas(W, H), e = makeCanvas(W, H);
  const ctx = c.getContext('2d'), etx = e.getContext('2d');
  const X = (x) => (x + HALF_W) * PX, Y = (y) => (ROOF_TOP - y) * PX;
  const L = LIVERY[type];
  etx.fillStyle = '#000'; etx.fillRect(0, 0, W, H);
  const lamp = (x, y, r, col = '#fffbe8', glow = '#fff7d6') => {
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(X(x), Y(y), r * PX + 5, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(x), Y(y), r * PX, 0, 7); ctx.fill();
    etx.fillStyle = glow; etx.beginPath(); etx.arc(X(x), Y(y), r * PX, 0, 7); etx.fill();
  };
  const glass = (x0, y0, x1, y1, r = 0) => {
    const g = ctx.createLinearGradient(0, Y(y1), 0, Y(y0));
    g.addColorStop(0, '#2c3a44'); g.addColorStop(0.5, '#17202a'); g.addColorStop(1, '#0d1217');
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(X(x0), Y(y1), (x1 - x0) * PX, (y1 - y0) * PX, r * PX); else ctx.rect(X(x0), Y(y1), (x1 - x0) * PX, (y1 - y0) * PX);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(X(x0), Y(y1)); ctx.lineTo(X(x0 + (x1 - x0) * 0.45), Y(y1)); ctx.lineTo(X(x0 + (x1 - x0) * 0.15), Y(y0)); ctx.lineTo(X(x0), Y(y0)); ctx.fill();
  };
  if (type === '717') {
    ctx.fillStyle = L.body; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = L.dark; ctx.fillRect(0, Y(1.0), W, H);
    // чёрная рамка маски
    ctx.fillStyle = '#141617';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(X(-1.28), Y(3.42), 2.56 * PX, 2.4 * PX, 0.12 * PX); else ctx.rect(X(-1.28), Y(3.42), 2.56 * PX, 2.4 * PX); ctx.fill();
    glass(-0.78, 1.98, 0.78, 2.98, 0.04);
    glass(-1.2, 2.02, -0.88, 2.98, 0.03);
    glass(0.88, 2.02, 1.2, 2.98, 0.03);
    // маршрутный указатель
    if (!rear) {
      ctx.fillStyle = '#f2c41a'; ctx.fillRect(X(-0.62), Y(2.32), 1.24 * PX, 0.28 * PX);
      etx.fillStyle = '#4a3a05'; etx.fillRect(X(-0.62), Y(2.32), 1.24 * PX, 0.28 * PX);
      ctx.fillStyle = '#111'; ctx.font = `700 ${0.17 * PX}px "PT Sans Narrow","Arial Narrow",Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = dest.toUpperCase();
      const tw = ctx.measureText(label).width; const sx = Math.min(1, 1.18 * PX / tw);
      ctx.save(); ctx.translate(X(0), Y(2.18)); ctx.scale(sx, 1); ctx.fillText(label, 0, 0); ctx.restore();
    }
    // логотип «М» и номер маршрута
    ctx.fillStyle = '#d9d9d5'; ctx.font = `700 ${0.22 * PX}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('М', X(0), Y(3.2));
    // габаритные огни
    lamp(-1.05, 3.22, 0.05, rear ? '#ff3b2a' : '#ff5a3a', rear ? '#ff2a1a' : '#661a10');
    lamp(1.05, 3.22, 0.05, rear ? '#ff3b2a' : '#ff5a3a', rear ? '#ff2a1a' : '#661a10');
    // фары: две крупные по бокам и четыре малые в ряд
    ctx.fillStyle = '#141617'; ctx.fillRect(X(-1.28), Y(1.82), 2.56 * PX, 0.5 * PX);
    if (rear) {
      lamp(-0.95, 1.58, 0.1, '#ff3b2a', '#ff2a1a'); lamp(0.95, 1.58, 0.1, '#ff3b2a', '#ff2a1a');
    } else {
      lamp(-0.95, 1.58, 0.12); lamp(0.95, 1.58, 0.12);
      for (const x of [-0.39, -0.13, 0.13, 0.39]) lamp(x, 1.58, 0.085);
    }
    ctx.fillStyle = '#e8e8e4'; ctx.fillRect(X(-0.32), Y(1.12), 0.64 * PX, 0.14 * PX);
    ctx.fillStyle = '#111'; ctx.font = `700 ${0.11 * PX}px Arial`; ctx.fillText(String(10000 + Math.floor(Math.random() * 400)), X(0), Y(1.05));
  } else if (type === '775') {
    ctx.fillStyle = '#111417'; ctx.fillRect(0, 0, W, H);
    glass(-1.25, 1.62, 1.25, 3.25, 0.15);
    // красная «улыбка» снизу
    ctx.fillStyle = '#d0202c';
    ctx.beginPath(); ctx.moveTo(0, Y(1.55)); ctx.quadraticCurveTo(X(0), Y(1.2), W, Y(1.55)); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#9b1620'; ctx.fillRect(0, Y(0.75), W, H);
    // светодиодные фары-полосы
    const strip = (x0, x1, y, col, glow) => {
      ctx.strokeStyle = col; ctx.lineWidth = 0.05 * PX; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X(x0), Y(y)); ctx.lineTo(X(x1), Y(y - 0.06)); ctx.stroke();
      etx.strokeStyle = glow; etx.lineWidth = 0.05 * PX; etx.lineCap = 'round';
      etx.beginPath(); etx.moveTo(X(x0), Y(y)); etx.lineTo(X(x1), Y(y - 0.06)); etx.stroke();
    };
    if (rear) { strip(-1.2, -0.75, 1.48, '#ff2a1a', '#ff2a1a'); strip(1.2, 0.75, 1.48, '#ff2a1a', '#ff2a1a'); }
    else { strip(-1.2, -0.7, 1.48, '#fffbe8', '#fff7d6'); strip(1.2, 0.7, 1.48, '#fffbe8', '#fff7d6'); lamp(-0.95, 1.3, 0.06); lamp(0.95, 1.3, 0.06); }
    // табло маршрута над стеклом
    if (!rear) {
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(X(-0.9), Y(3.42), 1.8 * PX, 0.16 * PX);
      ctx.fillStyle = '#ffb21f'; ctx.font = `700 ${0.11 * PX}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(dest, X(0), Y(3.34));
      etx.fillStyle = '#ffb21f'; etx.font = ctx.font; etx.textAlign = 'center'; etx.textBaseline = 'middle'; etx.fillText(dest, X(0), Y(3.34));
    }
    ctx.fillStyle = '#ffffff'; ctx.font = `700 ${0.1 * PX}px Arial`; ctx.textAlign = 'center'; ctx.fillText('МОСКВА', X(0), Y(1.0));
    ctx.fillStyle = '#d0202c'; ctx.beginPath(); ctx.arc(X(0), Y(1.72), 0.08 * PX, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${0.1 * PX}px Arial`; ctx.fillText('М', X(0), Y(1.71));
  } else {
    ctx.fillStyle = '#9ea3a8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2a62b8'; ctx.fillRect(0, Y(1.05), W, 0.33 * PX);
    ctx.fillStyle = '#3c4146';
    ctx.beginPath(); ctx.moveTo(X(-1.3), Y(3.4)); ctx.lineTo(X(1.3), Y(3.4)); ctx.lineTo(X(1.3), Y(1.75)); ctx.lineTo(X(-1.3), Y(1.75)); ctx.fill();
    glass(-1.2, 1.85, 1.2, 2.98, 0.06);
    if (!rear) {
      ctx.fillStyle = '#060a06'; ctx.fillRect(X(-1.1), Y(3.35), 2.2 * PX, 0.28 * PX);
      ctx.fillStyle = '#4dff7a'; ctx.font = `700 ${0.16 * PX}px "Courier New",monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = dest.toUpperCase();
      ctx.fillText(label.length > 18 ? label.slice(0, 18) : label, X(0.12), Y(3.21));
      etx.fillStyle = '#4dff7a'; etx.font = ctx.font; etx.textAlign = 'center'; etx.textBaseline = 'middle'; etx.fillText(label.length > 18 ? label.slice(0, 18) : label, X(0.12), Y(3.21));
      ctx.fillStyle = '#ff3b2a'; ctx.fillText('■', X(-0.98), Y(3.21)); etx.fillStyle = '#ff3b2a'; etx.fillText('■', X(-0.98), Y(3.21));
    }
    if (rear) { lamp(-1.0, 1.5, 0.08, '#ff3b2a', '#ff2a1a'); lamp(1.0, 1.5, 0.08, '#ff3b2a', '#ff2a1a'); }
    else { for (const x of [-1.05, -0.82, 0.82, 1.05]) lamp(x, 1.5, 0.08); lamp(-0.6, 1.5, 0.05, '#ff5a3a', '#551a10'); lamp(0.6, 1.5, 0.05, '#ff5a3a', '#551a10'); }
    ctx.fillStyle = '#e8e8e4'; ctx.font = `700 ${0.2 * PX}px Arial`; ctx.textAlign = 'center'; ctx.fillText('М', X(0), Y(1.55));
  }
  // сцепка/нижняя часть
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, Y(0.7), W, H);
  const t = canvasTex(c), te = canvasTex(e);
  t.wrapS = t.wrapT = te.wrapS = te.wrapT = THREE.ClampToEdgeWrapping;
  return { map: t, emissive: te };
}

function roofGeom(Lb, nose = 0) {
  const pts = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    pts.push({ x: Math.cos(a) * HALF_W, y: SIDE_TOP + Math.sin(a) * (ROOF_TOP - SIDE_TOP) });
  }
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= n; j++) for (const z of [-Lb / 2 + nose, Lb / 2]) { pos.push(pts[j].x, pts[j].y, z); uv.push(j / n, z / 4); }
  for (let j = 0; j < n; j++) { const a = j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// торец вагона: плоская «шапка» сечения кузова
function endCapGeom(z, facing) {
  const sh = new THREE.Shape();
  sh.moveTo(-HALF_W, BODY_Y0); sh.lineTo(HALF_W, BODY_Y0); sh.lineTo(HALF_W, SIDE_TOP);
  for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI; sh.lineTo(Math.cos(a) * HALF_W, SIDE_TOP + Math.sin(a) * (ROOF_TOP - SIDE_TOP)); }
  sh.lineTo(-HALF_W, BODY_Y0);
  const g = new THREE.ShapeGeometry(sh, 4);
  // UV: 0..1 по ширине/высоте
  const uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + HALF_W) / (2 * HALF_W), (p.getY(i) - 0.3) / (ROOF_TOP - 0.3));
  if (facing < 0) { g.rotateY(Math.PI); }
  g.translate(0, 0, z);
  return g;
}

function bogieGeom() {
  const parts = [boxGeom(2.1, 0.32, 2.7, 0, 0.42, 0), boxGeom(0.18, 0.2, 2.9, -0.95, 0.4, 0), boxGeom(0.18, 0.2, 2.9, 0.95, 0.4, 0)];
  for (const z of [-1.05, 1.05]) for (const x of [-0.72, 0.72]) parts.push(cylGeom(0.39, 0.39, 0.12, 16, x, 0.39, z, 0, 0, Math.PI / 2));
  parts.push(boxGeom(1.6, 0.08, 0.08, 0, 0.39, -1.05), boxGeom(1.6, 0.08, 0.08, 0, 0.39, 1.05));
  return mergeGeoms(parts);
}

function underGeom(Lb) {
  const parts = [boxGeom(2.5, 0.28, Lb - 1, 0, 0.62, 0)];
  const rng = mulberry32(Math.round(Lb * 10));
  for (let z = -Lb / 2 + 4.5; z < Lb / 2 - 4.5; z += 1.6) if (rng() < 0.7) parts.push(boxGeom(1.8 + rng() * 0.5, 0.35 + rng() * 0.2, 1.1, 0, 0.36, z));
  return mergeGeoms(parts);
}

// ---------- кабина машиниста ----------
function cabPanelCanvas() { return makeCanvas(1024, 512); }

export function buildCab(type) {
  const grp = new THREE.Group();
  const isNew = type !== '717';
  const wallCol = type === '717' ? 0x9aa39a : type === '775' ? 0xd4d7d9 : 0xb7bec4;
  const wall = new THREE.MeshLambertMaterial({ color: wallCol, side: THREE.DoubleSide });
  const dark = new THREE.MeshLambertMaterial({ color: type === '717' ? 0x3e4a46 : 0x2b2f33, side: THREE.DoubleSide });
  const floor = new THREE.MeshLambertMaterial({ color: 0x3a3a38, side: THREE.DoubleSide });
  const zF = 0; // передняя стенка кабины (лобовая маска) — в координатах кабины
  const zB = 2.45; // задняя стенка кабины
  // пол, потолок, задняя стенка с дверью в салон
  grp.add(new THREE.Mesh(boxGeom(2.6, 0.04, zB, 0, FLOOR_Y, zB / 2), floor));
  grp.add(new THREE.Mesh(boxGeom(2.6, 0.04, zB, 0, 3.32, zB / 2), wall));
  grp.add(new THREE.Mesh(boxGeom(2.6, 2.2, 0.05, 0, FLOOR_Y + 1.1, zB), wall));
  grp.add(new THREE.Mesh(boxGeom(0.7, 1.9, 0.06, 0.55, FLOOR_Y + 0.95, zB - 0.03), dark));
  // плафон освещения
  const lampM = new THREE.MeshBasicMaterial({ color: 0xfff1d0 });
  grp.add(new THREE.Mesh(boxGeom(0.5, 0.03, 0.25, 0, 3.29, 1.4), lampM));
  // боковые стенки с окнами и боковыми дверями
  const sideWin = { y0: type === '775' ? 1.75 : 1.95, y1: type === '775' ? 3.0 : 2.9 };
  for (const sx of [-1, 1]) {
    const x = sx * 1.3;
    grp.add(new THREE.Mesh(mergeGeoms([
      boxGeom(0.05, sideWin.y0 - FLOOR_Y, zB, x, (FLOOR_Y + sideWin.y0) / 2, zB / 2),
      boxGeom(0.05, 3.32 - sideWin.y1, zB, x, (sideWin.y1 + 3.32) / 2, zB / 2),
      boxGeom(0.05, sideWin.y1 - sideWin.y0, 0.35, x, (sideWin.y0 + sideWin.y1) / 2, 0.15),
      boxGeom(0.05, sideWin.y1 - sideWin.y0, 0.3, x, (sideWin.y0 + sideWin.y1) / 2, 1.6),
      boxGeom(0.05, sideWin.y1 - sideWin.y0, zB - 2.2, x, (sideWin.y0 + sideWin.y1) / 2, 2.2 + (zB - 2.2) / 2),
    ]), wall));
    // зеркало заднего вида снаружи
    const mir = new THREE.Mesh(boxGeom(0.03, 0.26, 0.16, x + sx * 0.36, 2.35, 0.1), new THREE.MeshLambertMaterial({ color: 0x5a6a72, emissive: 0x111111 }));
    grp.add(mir);
    grp.add(new THREE.Mesh(boxGeom(0.34, 0.03, 0.03, x + sx * 0.18, 2.25, 0.1), dark));
  }
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fb4bf, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
  // лобовое стекло и стойки
  const ws = type === '775' ? { y0: 1.62, y1: 3.15, pillars: [] } : type === '740' ? { y0: 1.85, y1: 2.98, pillars: [] } : { y0: 1.98, y1: 2.98, pillars: [-0.83, 0.83] };
  grp.add(new THREE.Mesh(boxGeom(2.6, ws.y0 - FLOOR_Y, 0.06, 0, (FLOOR_Y + ws.y0) / 2, zF + 0.02), dark));
  grp.add(new THREE.Mesh(boxGeom(2.6, 3.32 - ws.y1, 0.06, 0, (ws.y1 + 3.32) / 2, zF + 0.02), dark));
  const pil = ws.pillars.map((x) => boxGeom(0.1, ws.y1 - ws.y0, 0.08, x, (ws.y0 + ws.y1) / 2, zF + 0.03));
  pil.push(boxGeom(0.1, ws.y1 - ws.y0, 0.1, -1.27, (ws.y0 + ws.y1) / 2, zF + 0.03), boxGeom(0.1, ws.y1 - ws.y0, 0.1, 1.27, (ws.y0 + ws.y1) / 2, zF + 0.03));
  grp.add(new THREE.Mesh(mergeGeoms(pil), dark));
  grp.add(new THREE.Mesh(boxGeom(2.5, ws.y1 - ws.y0, 0.01, 0, (ws.y0 + ws.y1) / 2, zF - 0.01), glass));
  // дворник
  const wiper = new THREE.Mesh(boxGeom(0.025, 0.85, 0.02, 0, 0.42, 0), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  const wiperG = new THREE.Group(); wiperG.add(wiper); wiperG.position.set(-0.45, ws.y0 + 0.02, zF - 0.04); wiperG.rotation.z = 1.2;
  grp.add(wiperG);

  // пульт машиниста (слева) и правая часть пульта
  const consoleMat = new THREE.MeshLambertMaterial({ color: type === '717' ? 0x55625c : type === '775' ? 0x3a3f44 : 0x4a5258 });
  const dashTop = ws.y0 - 0.02;
  grp.add(new THREE.Mesh(mergeGeoms([
    boxGeom(2.5, dashTop - FLOOR_Y - 0.5, 0.55, 0, FLOOR_Y + 0.25 + (dashTop - FLOOR_Y - 0.5) / 2, zF + 0.3),
    boxGeom(2.5, 0.06, 0.75, 0, dashTop - 0.08, zF + 0.38),
  ]), consoleMat));
  // наклонная приборная панель с текстурой
  const pc = cabPanelCanvas();
  const pTex = canvasTex(pc, { mip: false });
  pTex.wrapS = pTex.wrapT = THREE.ClampToEdgeWrapping;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: pTex }));
  panel.position.set(-0.5, dashTop - 0.02, zF + 0.62);
  panel.rotation.x = -0.95;
  grp.add(panel);
  const pBack = new THREE.Mesh(boxGeom(1.12, 0.57, 0.04, 0, 0, -0.025), consoleMat);
  pBack.position.copy(panel.position); pBack.rotation.copy(panel.rotation);
  grp.add(pBack);
  // контроллер машиниста: рукоятка
  const ctrl = new THREE.Group();
  const handleMat = new THREE.MeshLambertMaterial({ color: type === '717' ? 0x1a1a1a : 0x202428 });
  if (type === '717') {
    // КВ-70: поворотная рукоятка слева
    ctrl.add(new THREE.Mesh(cylGeom(0.09, 0.09, 0.06, 16, 0, 0, 0), handleMat));
    ctrl.add(new THREE.Mesh(boxGeom(0.05, 0.03, 0.3, 0, 0.03, -0.15), handleMat));
    ctrl.add(new THREE.Mesh(cylGeom(0.025, 0.025, 0.1, 8, 0, 0.08, -0.29), new THREE.MeshLambertMaterial({ color: 0x8a1a1a })));
    ctrl.position.set(-1.08, dashTop + 0.02, zF + 0.75);
  } else {
    // джойстик контроллера
    ctrl.add(new THREE.Mesh(cylGeom(0.02, 0.02, 0.22, 8, 0, 0.11, 0), handleMat));
    ctrl.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8).translate(0, 0.23, 0), new THREE.MeshLambertMaterial({ color: type === '775' ? 0xd0202c : 0x2a62b8 })));
    ctrl.position.set(-1.05, dashTop + 0.0, zF + 0.85);
  }
  grp.add(ctrl);
  // кран машиниста / кнопки справа
  const btnCols = [0x2aa84a, 0xd0202c, 0xe8c22a, 0x2a62b8, 0xe8e8e8];
  const btns = [];
  for (let i = 0; i < 10; i++) btns.push({ g: cylGeom(0.025, 0.025, 0.03, 10, 0.25 + (i % 5) * 0.12, dashTop + 0.0, zF + 0.55 + Math.floor(i / 5) * 0.14), c: btnCols[i % 5] });
  for (const b of btns) grp.add(new THREE.Mesh(b.g, new THREE.MeshBasicMaterial({ color: b.c })));
  if (type === '717') {
    const crane = new THREE.Group();
    crane.add(new THREE.Mesh(cylGeom(0.11, 0.13, 0.12, 16, 0, 0, 0), new THREE.MeshLambertMaterial({ color: 0x222222 })));
    crane.add(new THREE.Mesh(boxGeom(0.04, 0.03, 0.26, 0.0, 0.07, -0.12), handleMat));
    crane.position.set(0.95, dashTop + 0.06, zF + 0.6);
    grp.add(crane);
  }
  // кресло машиниста
  const seatM = new THREE.MeshLambertMaterial({ color: type === '717' ? 0x5a3a2a : 0x2b2f33 });
  grp.add(new THREE.Mesh(mergeGeoms([
    boxGeom(0.55, 0.12, 0.5, -0.5, FLOOR_Y + 0.55, 1.85), boxGeom(0.55, 0.65, 0.1, -0.5, FLOOR_Y + 0.95, 2.15), cylGeom(0.05, 0.05, 0.5, 8, -0.5, FLOOR_Y + 0.25, 1.85),
  ]), seatM));
  // радиостанция и прочее
  grp.add(new THREE.Mesh(boxGeom(0.3, 0.18, 0.2, 0.9, 3.1, 0.35), dark));
  grp.add(new THREE.Mesh(boxGeom(0.4, 0.5, 0.25, 1.05, FLOOR_Y + 1.3, 2.2), dark));
  const cabLight = new THREE.PointLight(0xffe8c8, 1.6, 4, 1.5);
  cabLight.position.set(0, 3.1, 1.3);
  grp.add(cabLight);
  return {
    group: grp, panelCanvas: pc, panelTex: pTex, ctrl, wiper: wiperG, isNew, type,
    eye: new THREE.Vector3(-0.5, FLOOR_Y + 1.32, 1.6),
  };
}

// отрисовка приборной панели
export function drawPanel(cab, s) {
  const c = cab.panelCanvas, ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const t = cab.type;
  ctx.fillStyle = t === '717' ? '#55625c' : t === '775' ? '#2a2e33' : '#3e464c';
  ctx.fillRect(0, 0, W, H);
  if (t === '717') {
    // аналоговый скоростемер с лампами АРС
    const cx = 260, cy = 270, r = 190;
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, r + 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2f0e6'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    for (let v = 0; v <= 100; v += 5) {
      const a = a0 + (a1 - a0) * v / 100;
      const big = v % 10 === 0;
      ctx.lineWidth = big ? 5 : 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); ctx.lineTo(cx + Math.cos(a) * (r - (big ? 30 : 18)), cy + Math.sin(a) * (r - (big ? 30 : 18))); ctx.stroke();
      if (big) { ctx.font = '700 30px Arial'; ctx.fillText(String(v), cx + Math.cos(a) * (r - 58), cy + Math.sin(a) * (r - 58)); }
    }
    const lim = s.limit;
    const al = a0 + (a1 - a0) * Math.min(lim, 100) / 100;
    ctx.strokeStyle = '#d0202c'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cy, r - 8, al - 0.03, al + 0.03); ctx.stroke();
    const av = a0 + (a1 - a0) * Math.min(s.speed, 100) / 100;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(av) * (r - 25), cy + Math.sin(av) * (r - 25)); ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill();
    ctx.font = '700 26px Arial'; ctx.fillText('км/ч', cx, cy + 80);
    // лампы АРС
    const ars = [[0, '0', '#d0202c'], [40, '40', '#ffd23a'], [60, '60', '#ffd23a'], [70, '70', '#ffd23a'], [80, '80', '#3aff6a']];
    ars.forEach(([v, lab, col], i) => {
      const x = 560 + i * 86, y = 90;
      const on = lim === v || (v === 80 && lim > 80);
      ctx.fillStyle = on ? col : '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
      ctx.fillStyle = on ? '#111' : '#777'; ctx.font = '700 26px Arial'; ctx.fillText(lab, x, y + 1);
    });
    const lamp = (x, y, on, col, lab) => {
      ctx.fillStyle = on ? col : '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8e8e4'; ctx.font = '700 20px Arial'; ctx.fillText(lab, x, y + 46);
    };
    lamp(580, 230, s.doorsClosed, '#3aff6a', 'ДВЕРИ');
    lamp(680, 230, s.traction > 0.05, '#ffd23a', 'ХОД');
    lamp(780, 230, s.brake > 0.05, '#ff7a3a', 'ТОРМ');
    lamp(880, 230, s.overspeed, '#d0202c', 'АРС');
    // манометры
    for (const [x, v, lab] of [[620, 0.6 + s.brake * 0.25, 'ТМ'], [820, 0.78, 'НМ']]) {
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, 400, 62, 0, 7); ctx.fill();
      ctx.fillStyle = '#efeee6'; ctx.beginPath(); ctx.arc(x, 400, 54, 0, 7); ctx.fill();
      const a = Math.PI * 0.8 + v * Math.PI * 1.4;
      ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, 400); ctx.lineTo(x + Math.cos(a) * 44, 400 + Math.sin(a) * 44); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.font = '700 16px Arial'; ctx.fillText(lab, x, 430);
    }
  } else {
    // экраны МФДУ
    const scr = (x, y, w, h) => {
      ctx.fillStyle = '#0c0f12'; ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, t === '775' ? '#10233a' : '#0e1a14'); g.addColorStop(1, '#060a0e');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    };
    scr(30, 30, 520, 450);
    scr(590, 30, 400, 450);
    const acc = t === '775' ? '#59b8ff' : '#4dff7a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff'; ctx.font = '700 150px Arial'; ctx.fillText(String(Math.round(s.speed)), 250, 190);
    ctx.font = '700 34px Arial'; ctx.fillStyle = acc; ctx.fillText('км/ч', 250, 290);
    // шкала скорости
    const bx = 60, by = 340, bw = 460;
    ctx.fillStyle = '#222'; ctx.fillRect(bx, by, bw, 34);
    ctx.fillStyle = s.overspeed ? '#ff3b2a' : acc; ctx.fillRect(bx, by, bw * Math.min(1, s.speed / 100), 34);
    ctx.fillStyle = '#ff3b2a'; ctx.fillRect(bx + bw * Math.min(1, s.limit / 100) - 3, by - 10, 6, 54);
    ctx.fillStyle = '#ddd'; ctx.font = '700 28px Arial'; ctx.fillText(`АРС ${s.limit}`, 140, 430);
    ctx.fillText(s.doorsClosed ? 'ДВЕРИ ЗАКР.' : 'ДВЕРИ ОТКР.', 400, 430);
    // правый экран: следующая станция, схема дверей
    ctx.textAlign = 'left'; ctx.fillStyle = acc; ctx.font = '700 28px Arial'; ctx.fillText('Следующая:', 615, 75);
    ctx.fillStyle = '#fff'; ctx.font = '700 32px Arial';
    const nm = s.next || '';
    ctx.fillText(nm.length > 20 ? nm.slice(0, 19) + '…' : nm, 615, 120);
    ctx.fillStyle = '#ddd'; ctx.font = '700 30px Arial';
    ctx.fillText(s.dist != null ? `до остановки: ${Math.max(0, Math.round(s.dist))} м` : '', 615, 175);
    const n = s.cars || 8;
    for (let i = 0; i < n; i++) {
      const x = 615 + i * (350 / n);
      ctx.fillStyle = s.doorsClosed ? '#2aa84a' : '#e8c22a';
      ctx.fillRect(x, 230, 350 / n - 6, 40);
    }
    ctx.fillStyle = '#ddd'; ctx.font = '700 26px Arial';
    ctx.fillText(`Ход ${Math.round(s.traction * 100)}%`, 615, 330);
    ctx.fillText(`Тормоз ${Math.round(s.brake * 100)}%`, 615, 370);
    ctx.fillText(s.time || '', 615, 430);
  }
  cab.panelTex.needsUpdate = true;
}

// ---------- поезд ----------
export class Train {
  constructor(def, dest = '') {
    this.def = def;
    this.type = def.id;
    this.group = new THREE.Group();
    this.sections = [];
    this.doorLeaves = [];
    this.dest = dest;
    const L = LIVERY[this.type];
    const nCars = def.cars, sec = def.sections;
    const carLen = def.carLen;
    const secLen = carLen / sec;
    this.length = nCars * carLen;
    const bogie = bogieGeom();
    const bogieMat = new THREE.MeshLambertMaterial({ color: 0x232323 });
    const underMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const roofMat = new THREE.MeshLambertMaterial({ color: L.roof });
    const endMat = new THREE.MeshLambertMaterial({ color: L.body });
    const gangMat = new THREE.MeshLambertMaterial({ color: 0x1e1e1e });
    let off = 0;
    for (let ci = 0; ci < nCars; ci++) {
      for (let k = 0; k < sec; k++) {
        const first = ci === 0 && k === 0;
        const last = ci === nCars - 1 && k === sec - 1;
        const art = sec > 1;
        const gapF = art && k > 0 ? 0.25 : 0.45, gapR = art && k < sec - 1 ? 0.25 : 0.45;
        const Lb = secLen - gapF - gapR;
        const g = new THREE.Group();
        const cabFront = first, cabRear = last;
        const doors = doorLayout(this.type, Lb, cabFront || cabRear);
        if (cabRear && !cabFront) for (let i = 0; i < doors.length; i++) doors[i] = -doors[i];
        doors.sort((a, b) => a - b);
        const num = 10000 + Math.floor(Math.random() * 9000);
        const tex = sideTexture(this.type, Lb, cabRear && !cabFront ? doors.map((d) => -d).sort((a, b) => a - b) : doors, def.doorW, cabFront || cabRear, num);
        const sideMat = new THREE.MeshLambertMaterial({ map: tex.map, emissiveMap: tex.emissive, emissive: 0xffffff });
        for (const sx of [-1, 1]) {
          const pg = new THREE.PlaneGeometry(Lb, SIDE_TOP - BODY_Y0);
          pg.rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2);
          // правая сторона смотрит в +X: развёртка по -Z; левая — по +Z
          if (sx > 0) { const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
          if (cabRear && !cabFront) { const uv = pg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
          pg.translate(sx * HALF_W, (BODY_Y0 + SIDE_TOP) / 2, 0);
          g.add(new THREE.Mesh(pg, sideMat));
        }
        g.add(new THREE.Mesh(roofGeom(Lb), roofMat));
        g.add(new THREE.Mesh(underGeom(Lb), underMat));
        // торцы
        if (cabFront) {
          const ft = frontTexture(this.type, dest, false);
          this.frontTex = ft;
          const fm = new THREE.MeshLambertMaterial({ map: ft.map, emissiveMap: ft.emissive, emissive: 0xffffff });
          const fg = endCapGeom(-Lb / 2, -1);
          g.add(new THREE.Mesh(fg, fm));
          this.frontMat = fm;
          this.frontLb = Lb;
          // сцепка и выступающие детали
          g.add(new THREE.Mesh(mergeGeoms([boxGeom(0.3, 0.25, 0.5, 0, 0.75, -Lb / 2 - 0.25), boxGeom(0.5, 0.35, 0.12, 0, 0.75, -Lb / 2 - 0.5)]), underMat));
        } else {
          g.add(new THREE.Mesh(endCapGeom(-Lb / 2, -1), endMat));
          g.add(new THREE.Mesh(boxGeom(1.0, 2.0, gapF + 0.02, 0, 2.05, -Lb / 2 - gapF / 2), gangMat));
        }
        if (cabRear) {
          const rt = frontTexture(this.type, dest, true);
          g.add(new THREE.Mesh(endCapGeom(Lb / 2, 1), new THREE.MeshLambertMaterial({ map: rt.map, emissiveMap: rt.emissive, emissive: 0xffffff })));
        } else {
          g.add(new THREE.Mesh(endCapGeom(Lb / 2, 1), endMat));
        }
        // тележки
        const bz = art ? [-(Lb / 2) + 1.2, Lb / 2 - 1.2] : [-(Lb / 2 - 2.6), Lb / 2 - 2.6];
        for (const z of bz) { const b = new THREE.Mesh(bogie, bogieMat); b.position.z = z; g.add(b); }
        // двери (левые и правые створки)
        const dtex = doorTexture(this.type, def.doorW);
        const dMat = new THREE.MeshLambertMaterial({ map: dtex.map, emissiveMap: dtex.emissive, emissive: 0xffffff });
        const leaves = [];
        for (const zc of doors) {
          for (const sx of [-1, 1]) {
            for (const h of [-1, 1]) {
              const dg = new THREE.PlaneGeometry(def.doorW / 2, 3.05 - FLOOR_Y);
              if (h > 0) { const uv = dg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
              dg.rotateY(sx > 0 ? Math.PI / 2 : -Math.PI / 2);
              const m = new THREE.Mesh(dg, dMat);
              const z0 = zc + h * def.doorW / 4;
              m.position.set(sx * (HALF_W + 0.012), (FLOOR_Y + 3.05) / 2, z0);
              m.userData = { z0, h, sx };
              g.add(m);
              leaves.push(m);
            }
          }
        }
        this.doorLeaves.push(...leaves);
        // красные/белые огни на торцах (меши для «свечения»)
        this.group.add(g);
        const sObj = { group: g, Lb, off: off + gapF, doors, bogieZ: bz, car: ci };
        this.sections.push(sObj);
        off += secLen;
      }
    }
    // фары
    this.head = new THREE.SpotLight(0xfff2d8, 5, 160, 0.3, 0.7, 0.9);
    this.head.position.set(0, 1.3, -this.sections[0].Lb / 2 - 0.1);
    this.head.target.position.set(0, 0.6, -this.sections[0].Lb / 2 - 60);
    this.sections[0].group.add(this.head, this.head.target);
    this.headGlow = new THREE.PointLight(0xfff2d8, 0.8, 9, 1.6);
    this.headGlow.position.set(0, 1.4, -this.sections[0].Lb / 2 - 1.5);
    this.sections[0].group.add(this.headGlow);
    this.cab = buildCab(this.type);
    this.cab.group.position.z = -this.sections[0].Lb / 2;
    this.sections[0].group.add(this.cab.group);
    this.cab.group.visible = false;
    this.doorOpen = 0;
  }

  setDestination(dest) {
    if (dest === this.dest) return;
    this.dest = dest;
    const ft = frontTexture(this.type, dest, false);
    this.frontMat.map.dispose(); this.frontMat.emissiveMap.dispose();
    this.frontMat.map = ft.map; this.frontMat.emissiveMap = ft.emissive; this.frontMat.needsUpdate = true;
  }

  // f: 0..1 — степень открытия левых (со стороны платформы) дверей
  setDoors(f, side = -1) {
    this.doorOpen = f;
    const w = this.def.doorW / 2;
    for (const m of this.doorLeaves) {
      const { z0, h, sx } = m.userData;
      const k = sx === side ? f : 0;
      const plug = this.type === '775' ? Math.min(1, k * 4) * 0.06 : 0;
      m.position.z = z0 + h * w * 0.98 * k;
      m.position.x = sx * (HALF_W + 0.012 + plug + (this.type === '717' ? -0.0 : 0));
    }
  }

  // размещение по трассе; sHead — координата головы поезда
  update(route, sHead) {
    const f1 = {}, f2 = {};
    const m = new THREE.Matrix4();
    const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), back = new THREE.Vector3();
    for (const sc of this.sections) {
      const sc0 = sHead - sc.off - sc.Lb / 2; // центр кузова
      const sF = sc0 - sc.bogieZ[0], sR = sc0 - sc.bogieZ[1];
      route.frameAt(sF, f1); const pF = f1.pos.clone();
      route.frameAt(sR, f2); const pR = f2.pos.clone();
      fwd.subVectors(pF, pR).normalize();
      up.copy(f1.up).add(f2.up).normalize();
      right.crossVectors(fwd, up).normalize();
      up.crossVectors(right, fwd).normalize();
      back.copy(fwd).negate();
      m.makeBasis(right, up, back);
      const c = pF.add(pR).multiplyScalar(0.5);
      m.setPosition(c);
      sc.group.matrixAutoUpdate = false;
      sc.group.matrix.copy(m);
      sc.group.matrixWorldNeedsUpdate = true;
    }
  }

  // мировые координаты центров левых дверей на уровне пола
  doorWorld() {
    const out = [];
    for (const sc of this.sections) {
      sc.group.updateMatrixWorld(true);
      for (const z of sc.doors) out.push(new THREE.Vector3(-HALF_W, FLOOR_Y, z).applyMatrix4(sc.group.matrixWorld));
    }
    return out;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const mm of ms) { if (mm.map) mm.map.dispose(); if (mm.emissiveMap) mm.emissiveMap.dispose(); mm.dispose(); } }
    });
  }
}
