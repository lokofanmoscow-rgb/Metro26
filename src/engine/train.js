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


// =====================================================================
// Детальный кузов: проёмы окон и дверей, стёкла, салон, места для пассажиров
// =====================================================================
const WALL_T = 0.07; // толщина боковины
const IN_X = HALF_W - WALL_T - 0.012; // внутренняя поверхность салона
const DOOR_TOP = 3.02;

export const INTERIOR = {
  '717': { wall: '#d8cdb2', ceil: '#ece6d6', floor: '#5d5249', seat: '#7b4a2f', seatBase: '#3b3530', pole: '#c9c9c4', poleMetal: 0.9, lamp: 0xfff0d2 },
  '775': { wall: '#e9ecee', ceil: '#f4f5f6', floor: '#5a5f63', seat: '#34538c', seatBase: '#8e959b', pole: '#d9dcde', poleMetal: 0.85, lamp: 0xf4f7ff },
  '740': { wall: '#d6dadd', ceil: '#eef0f1', floor: '#4f5458', seat: '#2a5aa8', seatBase: '#5d6368', pole: '#d6b13a', poleMetal: 0.6, lamp: 0xf8f4ea },
};
const WIN_Y = { '717': [1.86, 2.78], '775': [1.74, 2.93], '740': [1.86, 2.8] };

// оконные проёмы между дверями
function windowSpans(type, Lb, doors, doorW, cabF, cabR) {
  const edges = [cabF ? -Lb / 2 + 2.7 : -Lb / 2 + 0.35, ...doors.flatMap((d) => [d - doorW / 2 - 0.28, d + doorW / 2 + 0.28]), cabR ? Lb / 2 - 2.7 : Lb / 2 - 0.35];
  const out = [];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i], b = edges[i + 1];
    if (b - a < 0.5) continue;
    const n = type === '775' ? Math.max(1, Math.round((b - a) / 2.2)) : Math.max(1, Math.round((b - a) / 1.3));
    const w = (b - a) / n;
    for (let k = 0; k < n; k++) out.push([a + k * w + 0.07, a + (k + 1) * w - 0.07]);
  }
  return out;
}

function roundRectPath(p, x0, y0, x1, y1, r) {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r);
  p.lineTo(x1, y1 - r); p.quadraticCurveTo(x1, y1, x1 - r, y1); p.lineTo(x0 + r, y1);
  p.quadraticCurveTo(x0, y1, x0, y1 - r); p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
}

// перевернуть треугольники (после зеркального отражения геометрии)
function flipWinding(g) {
  if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } return g; }
  for (const k of Object.keys(g.attributes)) {
    const at = g.attributes[k], n = at.itemSize, arr = at.array;
    for (let i = 0; i < at.count; i += 3) for (let c = 0; c < n; c++) { const t = arr[(i + 1) * n + c]; arr[(i + 1) * n + c] = arr[(i + 2) * n + c]; arr[(i + 2) * n + c] = t; }
  }
  return g;
}

function mirrorX(g) { g.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1)); return flipWinding(g); }

// фигура боковины в плоскости (z, y) с отверстиями окон, дверей и бокового окна кабины
function sideShape(type, Lb, spans, doors, doorW, cabF, cabR) {
  const [wy0, wy1] = WIN_Y[type];
  const sh = new THREE.Shape();
  sh.moveTo(-Lb / 2, BODY_Y0); sh.lineTo(Lb / 2, BODY_Y0); sh.lineTo(Lb / 2, SIDE_TOP); sh.lineTo(-Lb / 2, SIDE_TOP); sh.lineTo(-Lb / 2, BODY_Y0);
  const holes = [];
  for (const [a, b] of spans) holes.push(roundRectPath(new THREE.Path(), a, wy0, b, wy1, 0.08));
  for (const d of doors) holes.push(roundRectPath(new THREE.Path(), d - doorW / 2, FLOOR_Y, d + doorW / 2, DOOR_TOP, 0.04));
  // боковое окно кабины (совпадает с окном в модели кабины)
  const cw = type === '775' ? [1.75, 3.0] : [1.95, 2.9];
  if (cabF) holes.push(roundRectPath(new THREE.Path(), -Lb / 2 + 0.35, cw[0], -Lb / 2 + 1.55, cw[1], 0.06));
  if (cabR) holes.push(roundRectPath(new THREE.Path(), Lb / 2 - 1.55, cw[0], Lb / 2 - 0.35, cw[1], 0.06));
  sh.holes.push(...holes);
  return { shape: sh, holes };
}

// правая боковина (x = +HALF_W), снаружи — краска, внутри — панель салона
function sideGeoms(shapeInfo, Lb) {
  const ext = new THREE.ExtrudeGeometry(shapeInfo.shape, { depth: WALL_T, bevelEnabled: false, curveSegments: 4 });
  ext.rotateY(-Math.PI / 2); ext.translate(HALF_W, 0, 0);
  const p = ext.attributes.position, uv = ext.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getZ(i) + Lb / 2) / Lb, (p.getY(i) - BODY_Y0) / (SIDE_TOP - BODY_Y0));
  const panel = new THREE.ShapeGeometry(shapeInfo.shape, 4);
  panel.rotateY(-Math.PI / 2); panel.translate(HALF_W - WALL_T - 0.006, 0, 0);
  const pu = panel.attributes.uv, pp = panel.attributes.position;
  for (let i = 0; i < pp.count; i++) pu.setXY(i, pp.getZ(i) / 1.5, pp.getY(i) / 1.5);
  const glass = mergeGeoms(shapeInfo.holes.map((h) => { const g = new THREE.ShapeGeometry(new THREE.Shape(h.getPoints(6)), 2); g.rotateY(-Math.PI / 2); g.translate(HALF_W - 0.025, 0, 0); return g; }));
  return { ext, panel, glass };
}

function liveryTexture(type, Lb, number, cabF) {
  const L = LIVERY[type];
  const PX = 64;
  const W = Math.ceil(Lb * PX), H = Math.ceil((SIDE_TOP - BODY_Y0) * PX);
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  const Y = (y) => (SIDE_TOP - y) * PX, Z = (z) => (z + Lb / 2) * PX;
  ctx.fillStyle = L.body; ctx.fillRect(0, 0, W, H);
  if (type === '717') {
    ctx.fillStyle = L.dark; ctx.fillRect(0, Y(1.0), W, H);
    ctx.fillStyle = L.stripe; ctx.fillRect(0, Y(1.74), W, 0.07 * PX);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, Y(SIDE_TOP) , W, 4);
  } else if (type === '775') {
    ctx.fillStyle = L.winBand; ctx.fillRect(0, Y(3.0), W, Y(1.66) - Y(3.0));
    ctx.fillStyle = L.stripe; ctx.fillRect(0, Y(0.95), W, Y(0.72) - Y(0.95));
    ctx.fillStyle = '#9aa0a4'; ctx.fillRect(0, Y(0.72), W, H);
  } else {
    ctx.fillStyle = L.stripe; ctx.fillRect(0, Y(1.05), W, Y(0.72) - Y(1.05));
    ctx.fillRect(0, Y(1.79), W, 0.05 * PX);
  }
  // кабина: дверь машиниста
  if (cabF) {
    const z0 = -Lb / 2 + 1.7;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.strokeRect(Z(z0), Y(3.0), 0.72 * PX, Y(1.0) - Y(3.0));
  }
  ctx.fillStyle = type === '775' ? '#2b2f33' : '#f4f4f0';
  ctx.font = `700 ${0.2 * PX}px Arial`; ctx.textAlign = 'center';
  ctx.fillText(String(number), Z(Lb / 2 - 1.4), Y(1.25));
  if (type === '775') { ctx.fillStyle = '#d0202c'; ctx.font = `700 ${0.22 * PX}px Arial`; ctx.fillText('МОСКВА', Z(0), Y(1.35)); }
  if (type === '740') { ctx.fillStyle = '#2a62b8'; ctx.font = `700 ${0.2 * PX}px Arial`; ctx.fillText('РУСИЧ', Z(0), Y(1.4)); }
  // лёгкое загрязнение снизу
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,30,20,0.25)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const t = canvasTex(c, { aniso: 8 });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// гофр нержавеющей стали «Русича» — карта нормалей
let corrTex = null;
function corrugationNormal() {
  if (corrTex) return corrTex;
  const c = makeCanvas(64, 4); const ctx = c.getContext('2d');
  for (let x = 0; x < 64; x++) { const s = Math.sin(x / 64 * Math.PI * 8); const r = 128 + s * 90; ctx.fillStyle = `rgb(${r},128,255)`; ctx.fillRect(x, 0, 1, 4); }
  corrTex = canvasTex(c, { srgb: false }); corrTex.repeat.set(40, 1);
  return corrTex;
}

// салон: сиденья, поручни, перегородки, плафоны, пол, потолок, торцы
function interiorGeoms(type, Lb, doors, doorW, cabF, cabR) {
  const z0 = cabF ? -Lb / 2 + 2.5 : -Lb / 2 + 0.12, z1 = cabR ? Lb / 2 - 2.5 : Lb / 2 - 0.12;
  const G = { floor: [], ceil: [], seat: [], base: [], pole: [], glass: [], lamp: [], ends: [], ads: [] };
  G.floor.push(boxGeom(2 * IN_X, 0.03, z1 - z0, 0, FLOOR_Y - 0.015, (z0 + z1) / 2));
  // потолок — дуга
  const pts = [];
  for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; pts.push({ x: Math.cos(a) * IN_X, y: SIDE_TOP - 0.15 + Math.sin(a) * (ROOF_TOP - SIDE_TOP - 0.05) }); }
  const pos = [], idx = [];
  for (let j = 0; j <= 12; j++) for (const z of [z0, z1]) pos.push(pts[j].x, pts[j].y, z);
  for (let j = 0; j < 12; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setIndex(idx); cg.computeVertexNormals();
  cg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  G.ceil.push(cg.toNonIndexed());
  G.ceil.push(boxGeom(2 * IN_X, 0.5, z1 - z0, 0, SIDE_TOP - 0.15 - 0.25, (z0 + z1) / 2).translate(0, 0, 0)); // карниз над окнами (только торцы видимы)
  G.ceil.pop();
  // плафоны вдоль потолка
  for (const sx of [-1, 1]) G.lamp.push(boxGeom(0.16, 0.035, z1 - z0 - 0.6, sx * 0.62, SIDE_TOP - 0.15 + (ROOF_TOP - SIDE_TOP - 0.05) * 0.84 - 0.03, (z0 + z1) / 2));
  // скамьи между дверями
  const sorted = [...doors].sort((a, b) => a - b);
  const bounds = [z0 + 0.1, ...sorted.flatMap((d) => [d - doorW / 2 - 0.12, d + doorW / 2 + 0.12]), z1 - 0.1];
  const spots = [];
  for (let i = 0; i < bounds.length; i += 2) {
    const a = bounds[i], b = bounds[i + 1];
    const L = b - a;
    if (L < 0.8) continue;
    const zc = (a + b) / 2;
    for (const sx of [-1, 1]) {
      const xs = sx * (IN_X - 0.26);
      G.seat.push(boxGeom(0.5, 0.11, L - 0.06, xs, FLOOR_Y + 0.44, zc));
      G.seat.push(boxGeom(0.08, 0.5, L - 0.06, sx * (IN_X - 0.05), FLOOR_Y + 0.78, zc, 0, 0, sx * 0.12));
      G.base.push(boxGeom(0.42, 0.38, L - 0.1, xs + sx * 0.02, FLOOR_Y + 0.19, zc));
      // торцевые перегородки у дверей
      for (const ze of [a, b]) {
        G.glass.push(boxGeom(0.55, 1.05, 0.025, sx * (IN_X - 0.3), FLOOR_Y + 0.95, ze));
        G.pole.push(cylGeom(0.018, 0.018, ROOF_TOP - 0.3 - FLOOR_Y, 8, sx * (IN_X - 0.58), FLOOR_Y + (ROOF_TOP - 0.3 - FLOOR_Y) / 2, ze));
      }
      // сидячие места
      const n = Math.floor((L - 0.1) / 0.5);
      for (let k = 0; k < n; k++) spots.push({ x: sx * (IN_X - 0.38), z: a + 0.3 + k * ((L - 0.6) / Math.max(1, n - 1 || 1)), yaw: sx > 0 ? -Math.PI / 2 : Math.PI / 2, sit: true });
    }
    // рекламные/схемные панели над окнами
    for (const sx of [-1, 1]) G.ads.push(boxGeom(0.02, 0.28, Math.min(L - 0.3, 1.4), sx * (IN_X - 0.01), 3.0, zc));
  }
  // горизонтальные поручни над сиденьями и стойки у дверей
  for (const sx of [-1, 1]) G.pole.push(cylGeom(0.016, 0.016, z1 - z0 - 0.4, 8, sx * 0.78, FLOOR_Y + 1.82, (z0 + z1) / 2, Math.PI / 2, 0, 0));
  for (const d of sorted) {
    if (type !== '717') G.pole.push(cylGeom(0.02, 0.02, ROOF_TOP - 0.3 - FLOOR_Y, 8, 0, FLOOR_Y + (ROOF_TOP - 0.3 - FLOOR_Y) / 2, d));
    // стоячие места у дверей
    for (const dz of [-0.45, 0, 0.45]) for (const x of [-0.55, 0.35]) spots.push({ x, z: d + dz, yaw: Math.random() * Math.PI * 2, sit: false });
  }
  for (let z = z0 + 1.2; z < z1 - 1; z += 1.6) spots.push({ x: 0, z, yaw: Math.random() < 0.5 ? 0 : Math.PI, sit: false });
  // торцевые стенки салона с дверью в соседний вагон
  for (const [ze, f] of [[z0, 1], [z1, -1]]) {
    G.ends.push(boxGeom(2 * IN_X, ROOF_TOP - FLOOR_Y, 0.04, 0, (FLOOR_Y + ROOF_TOP) / 2, ze - f * 0.02));
    G.base.push(boxGeom(0.75, 1.9, 0.05, 0, FLOOR_Y + 0.95, ze + f * 0.01));
  }
  return { G, spots, z0, z1 };
}

function bogieGeomHQ() {
  const parts = [boxGeom(2.0, 0.26, 2.6, 0, 0.5, 0), boxGeom(0.16, 0.3, 3.0, -0.98, 0.42, 0), boxGeom(0.16, 0.3, 3.0, 0.98, 0.42, 0)];
  for (const z of [-1.05, 1.05]) {
    parts.push(cylGeom(0.07, 0.07, 1.7, 10, 0, 0.39, z, 0, 0, Math.PI / 2)); // ось
    for (const x of [-0.76, 0.76]) {
      parts.push(cylGeom(0.39, 0.39, 0.11, 22, x, 0.39, z, 0, 0, Math.PI / 2)); // колесо
      parts.push(cylGeom(0.42, 0.42, 0.025, 22, x + Math.sign(x) * -0.06, 0.39, z, 0, 0, Math.PI / 2)); // гребень
      parts.push(boxGeom(0.22, 0.2, 0.3, x * 1.32, 0.42, z)); // букса
      parts.push(boxGeom(0.12, 0.3, 0.12, x * 1.25, 0.12 + 0.55, z * 0.55)); // пружины
    }
  }
  return mergeGeoms(parts);
}

const geoCache = new Map();
function carGeoms(type, Lb, doors, doorW, cabF, cabR) {
  const key = [type, Lb.toFixed(2), doors.map((d) => d.toFixed(2)).join(','), cabF, cabR].join('|');
  if (geoCache.has(key)) return geoCache.get(key);
  const spans = windowSpans(type, Lb, doors, doorW, cabF, cabR);
  const right = sideGeoms(sideShape(type, Lb, spans, doors, doorW, cabF, cabR), Lb);
  // левая боковина — зеркальная копия
  const leftShape = sideShape(type, Lb, spans.map(([a, b]) => [a, b]), doors, doorW, cabF, cabR);
  const left = sideGeoms(leftShape, Lb);
  mirrorX(left.ext); mirrorX(left.panel); mirrorX(left.glass);
  const sideExt = mergeGeomsGroups([right.ext, left.ext]);
  const inter = interiorGeoms(type, Lb, doors, doorW, cabF, cabR);
  const res = {
    sideExt, panel: mergeGeoms([right.panel, left.panel]), glass: mergeGeoms([right.glass, left.glass]),
    interior: Object.fromEntries(Object.entries(inter.G).map(([k, v]) => [k, v.length ? mergeGeoms(v) : null])),
    spots: inter.spots, spans,
  };
  geoCache.set(key, res);
  return res;
}

// объединение геометрий с группами материалов (крышки/торцы — 0, стенки проёмов — 1)
function mergeGeomsGroups(list) {
  const out = new THREE.BufferGeometry();
  const ni = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(ni[0].attributes);
  const groups = [];
  const arrays = Object.fromEntries(names.map((n) => [n, []]));
  let off = 0;
  for (const g of ni) {
    for (const gr of g.groups) groups.push({ start: off + gr.start, count: gr.count, materialIndex: gr.materialIndex });
    for (const n of names) arrays[n].push(g.attributes[n].array);
    off += g.attributes.position.count;
  }
  for (const n of names) {
    const item = ni[0].attributes[n].itemSize;
    const total = arrays[n].reduce((t, a) => t + a.length, 0);
    const arr = new Float32Array(total); let o = 0;
    for (const a of arrays[n]) { arr.set(a, o); o += a.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, item));
  }
  for (const g of groups) out.addGroup(g.start, g.count, g.materialIndex);
  return out;
}

function doorLeafGeoms(type, doorW) {
  const w = doorW / 2, h = DOOR_TOP - FLOOR_Y;
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, h); sh.lineTo(-w / 2, h); sh.lineTo(-w / 2, 0);
  const wy0 = type === '775' ? 0.12 : 0.72, wy1 = type === '775' ? h - 0.1 : h - 0.25;
  const hole = roundRectPath(new THREE.Path(), -w / 2 + 0.08, wy0, w / 2 - 0.08, wy1, 0.05);
  sh.holes.push(hole);
  const leaf = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false, curveSegments: 3 });
  // фигура: x — вдоль вагона, y — вверх; выдавливание наружу (+x мира)
  leaf.rotateY(-Math.PI / 2);
  const uv = leaf.attributes.uv, p = leaf.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getZ(i) + w / 2) / w, p.getY(i) / h);
  const glass = new THREE.ShapeGeometry(new THREE.Shape(hole.getPoints(6)), 2);
  glass.rotateY(-Math.PI / 2); glass.translate(-0.018, 0, 0);
  return { leaf, glass };
}

function doorLeafTexture(type) {
  const L = LIVERY[type];
  const c = makeCanvas(64, 256); const ctx = c.getContext('2d');
  ctx.fillStyle = type === '775' ? '#3a3f44' : L.door; ctx.fillRect(0, 0, 64, 256);
  const h = DOOR_TOP - FLOOR_Y;
  if (type === '717') { ctx.fillStyle = L.dark; ctx.fillRect(0, 256 - 0.15 / h * 256, 64, 256); ctx.fillStyle = L.stripe; ctx.fillRect(0, 256 - (1.74 - FLOOR_Y) / h * 256, 64, 5); }
  if (type === '740') { ctx.fillStyle = L.stripe; ctx.fillRect(0, 256 - 0.1 / h * 256, 64, 256); }
  if (type === '775') { ctx.fillStyle = '#d0202c'; ctx.fillRect(0, 0, 4, 256); }
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 3; ctx.strokeRect(1, 1, 62, 254);
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export class Train {
  constructor(def, dest = '') {
    this.def = def;
    this.type = def.id;
    this.group = new THREE.Group();
    this.sections = [];
    this.dest = dest;
    const L = LIVERY[this.type], I = INTERIOR[this.type];
    const nCars = def.cars, sec = def.sections;
    const carLen = def.carLen, secLen = carLen / sec;
    this.length = nCars * carLen;
    // общие материалы поезда
    const env = (m) => { m.envMapIntensity = 1.0; return m; };
    const paintParams = this.type === '740'
      ? { color: 0xffffff, metalness: 0.75, roughness: 0.32, normalMap: corrugationNormal(), normalScale: new THREE.Vector2(0.35, 0.35) }
      : { color: 0xffffff, metalness: 0.1, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.18 };
    this.mats = {
      reveal: env(new THREE.MeshStandardMaterial({ color: 0x2a2d30, roughness: 0.6 })),
      panel: new THREE.MeshStandardMaterial({ color: I.wall, roughness: 0.7, emissive: new THREE.Color(I.wall).multiplyScalar(0.42) }),
      glass: env(new THREE.MeshStandardMaterial({ color: 0xaab8c0, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide })),
      roof: env(new THREE.MeshStandardMaterial({ color: L.roof, roughness: 0.65, metalness: 0.2 })),
      under: new THREE.MeshStandardMaterial({ color: 0x23211f, roughness: 0.9 }),
      bogie: new THREE.MeshStandardMaterial({ color: 0x1e1d1c, roughness: 0.75, metalness: 0.4 }),
      floor: new THREE.MeshStandardMaterial({ color: I.floor, roughness: 0.85, emissive: new THREE.Color(I.floor).multiplyScalar(0.3) }),
      ceil: new THREE.MeshStandardMaterial({ color: I.ceil, roughness: 0.8, emissive: new THREE.Color(I.ceil).multiplyScalar(0.55), side: THREE.DoubleSide }),
      seat: new THREE.MeshStandardMaterial({ color: I.seat, roughness: 0.75, emissive: new THREE.Color(I.seat).multiplyScalar(0.3) }),
      base: new THREE.MeshStandardMaterial({ color: I.seatBase, roughness: 0.6, emissive: new THREE.Color(I.seatBase).multiplyScalar(0.3) }),
      pole: env(new THREE.MeshStandardMaterial({ color: I.pole, metalness: I.poleMetal, roughness: 0.22, emissive: new THREE.Color(I.pole).multiplyScalar(0.25) })),
      partition: new THREE.MeshStandardMaterial({ color: 0xc9d6da, transparent: true, opacity: 0.35, roughness: 0.1, emissive: 0x334044, depthWrite: false }),
      lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(I.lamp).multiplyScalar(2.4) }),
      ends: new THREE.MeshStandardMaterial({ color: I.wall, roughness: 0.7, emissive: new THREE.Color(I.wall).multiplyScalar(0.4) }),
      ads: new THREE.MeshStandardMaterial({ color: 0x8aa3c8, roughness: 0.5, emissive: 0x3a4a66 }),
      gang: new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.95 }),
      door: null, doorGlass: null,
    };
    this.mats.door = env(new THREE.MeshPhysicalMaterial({ ...paintParams, map: doorLeafTexture(this.type), normalMap: null }));
    this.mats.doorGlass = this.mats.glass;
    const bogie = bogieGeomHQ();
    const leafG = doorLeafGeoms(this.type, def.doorW);
    this.leafGeo = leafG;
    this.doorLeaves = []; // {sec, z0, h, sx}
    let off = 0;
    for (let ci = 0; ci < nCars; ci++) {
      for (let k = 0; k < sec; k++) {
        const first = ci === 0 && k === 0;
        const last = ci === nCars - 1 && k === sec - 1;
        const art = sec > 1;
        const gapF = art && k > 0 ? 0.25 : 0.45, gapR = art && k < sec - 1 ? 0.25 : 0.45;
        const Lb = secLen - gapF - gapR;
        const g = new THREE.Group();
        const cabF = first, cabR = last && !first;
        let doors = doorLayout(this.type, Lb, cabF || cabR);
        if (cabR) doors = doors.map((d) => -d);
        doors.sort((a, b) => a - b);
        const num = 10000 + Math.floor(Math.random() * 9000);
        const cg = carGeoms(this.type, Lb, doors, def.doorW, cabF, cabR);
        const paint = env(new THREE.MeshPhysicalMaterial({ ...paintParams, map: liveryTexture(this.type, Lb, num, cabF) }));
        paint.userData.own = true;
        g.add(new THREE.Mesh(cg.sideExt, [paint, this.mats.reveal]));
        g.add(new THREE.Mesh(cg.panel, this.mats.panel));
        const gl = new THREE.Mesh(cg.glass, this.mats.glass); gl.renderOrder = 3; g.add(gl);
        g.add(new THREE.Mesh(roofGeom(Lb), this.mats.roof));
        g.add(new THREE.Mesh(underGeom(Lb), this.mats.under));
        const im = cg.interior;
        const add = (geo, m, ro) => { if (geo) { const mesh = new THREE.Mesh(geo, m); if (ro) mesh.renderOrder = ro; g.add(mesh); } };
        add(im.floor, this.mats.floor); add(im.ceil, this.mats.ceil); add(im.seat, this.mats.seat); add(im.base, this.mats.base);
        add(im.pole, this.mats.pole); add(im.lamp, this.mats.lamp); add(im.ends, this.mats.ends); add(im.ads, this.mats.ads); add(im.glass, this.mats.partition, 2);
        // крышевое оборудование
        g.add(new THREE.Mesh(mergeGeoms([boxGeom(0.9, 0.12, 1.4, 0, ROOF_TOP + 0.04, -Lb / 4), boxGeom(0.9, 0.12, 1.4, 0, ROOF_TOP + 0.04, Lb / 4)]), this.mats.roof));
        // торцы
        if (cabF) {
          const ft = frontTexture(this.type, dest, false);
          this.frontTex = ft;
          const fm = new THREE.MeshStandardMaterial({ map: ft.map, emissiveMap: ft.emissive, emissive: 0xffffff, roughness: 0.35, metalness: 0.2 });
          g.add(new THREE.Mesh(endCapGeom(-Lb / 2, -1), fm));
          this.frontMat = fm;
          this.frontLb = Lb;
          // стекло на лобовой маске — блики
          const ws = this.type === '775' ? [1.62, 3.25, 1.25] : this.type === '740' ? [1.85, 2.98, 1.2] : [1.98, 2.98, 1.2];
          const wg = new THREE.Mesh(new THREE.PlaneGeometry(ws[2] * 2, ws[1] - ws[0]), this.mats.glass);
          wg.rotation.y = Math.PI; wg.position.set(0, (ws[0] + ws[1]) / 2, -Lb / 2 - 0.015); wg.renderOrder = 3;
          g.add(wg);
          // фары с хромированными ободками и сцепка
          const ring = env(new THREE.MeshStandardMaterial({ color: 0xbfc3c6, metalness: 1, roughness: 0.25 }));
          const lens = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff6dc).multiplyScalar(2.2) });
          const hl = this.type === '717' ? [[-0.95, 1.58, 0.12], [0.95, 1.58, 0.12], [-0.39, 1.58, 0.085], [-0.13, 1.58, 0.085], [0.13, 1.58, 0.085], [0.39, 1.58, 0.085]]
            : this.type === '740' ? [[-1.05, 1.5, 0.08], [-0.82, 1.5, 0.08], [0.82, 1.5, 0.08], [1.05, 1.5, 0.08]] : [[-0.95, 1.3, 0.06], [0.95, 1.3, 0.06]];
          g.add(new THREE.Mesh(mergeGeoms(hl.map(([x, y, r]) => cylGeom(r + 0.03, r + 0.03, 0.08, 18, x, y, -Lb / 2 - 0.04, Math.PI / 2, 0, 0))), ring));
          g.add(new THREE.Mesh(mergeGeoms(hl.map(([x, y, r]) => cylGeom(r, r, 0.02, 18, x, y, -Lb / 2 - 0.085, Math.PI / 2, 0, 0))), lens));
          g.add(new THREE.Mesh(mergeGeoms([boxGeom(0.28, 0.22, 0.6, 0, 0.78, -Lb / 2 - 0.3), boxGeom(0.46, 0.32, 0.14, 0, 0.78, -Lb / 2 - 0.62), boxGeom(1.8, 0.5, 0.08, 0, 0.42, -Lb / 2 + 0.05)]), this.mats.bogie));
        } else {
          g.add(new THREE.Mesh(endCapGeom(-Lb / 2, -1), new THREE.MeshPhysicalMaterial({ ...paintParams, color: L.body, normalMap: null })));
          // гармошка межвагонного перехода
          const gang = [];
          for (let r = 0; r < 6; r++) gang.push(boxGeom(1.15 - (r % 2) * 0.06, 2.1 - (r % 2) * 0.06, gapF / 6 + 0.01, 0, 2.15, -Lb / 2 - gapF * (r + 0.5) / 6));
          g.add(new THREE.Mesh(mergeGeoms(gang), this.mats.gang));
        }
        if (cabR) {
          const rt = frontTexture(this.type, dest, true);
          g.add(new THREE.Mesh(endCapGeom(Lb / 2, 1), new THREE.MeshStandardMaterial({ map: rt.map, emissiveMap: rt.emissive, emissive: 0xffffff, roughness: 0.35 })));
        } else {
          g.add(new THREE.Mesh(endCapGeom(Lb / 2, 1), new THREE.MeshPhysicalMaterial({ ...paintParams, color: L.body, normalMap: null })));
        }
        const bz = art ? [-(Lb / 2) + 1.2, Lb / 2 - 1.2] : [-(Lb / 2 - 2.6), Lb / 2 - 2.6];
        for (const z of bz) { const b = new THREE.Mesh(bogie, this.mats.bogie); b.position.z = z; g.add(b); }
        g.matrixAutoUpdate = false;
        this.group.add(g);
        const sObj = { group: g, Lb, off: off + gapF, doors, bogieZ: bz, car: ci, spots: cg.spots.map((p) => ({ ...p, used: false })), paint };
        this.sections.push(sObj);
        for (const zc of doors) for (const sx of [-1, 1]) for (const h of [-1, 1]) this.doorLeaves.push({ sec: this.sections.length - 1, z0: zc + h * def.doorW / 4, h, sx });
        off += secLen;
      }
    }
    // створки дверей — экземпляры (обновляются вместе с поездом)
    const n = this.doorLeaves.length;
    this.leafMesh = new THREE.InstancedMesh(leafG.leaf, this.mats.door, n);
    this.leafGlass = new THREE.InstancedMesh(leafG.glass, this.mats.glass, n);
    this.leafGlass.renderOrder = 3;
    this.leafMesh.frustumCulled = this.leafGlass.frustumCulled = false;
    this.group.add(this.leafMesh, this.leafGlass);
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
    this.doorOpen = 0; this.doorSide = -1;
    this._tmpM = new THREE.Matrix4(); this._tmpL = new THREE.Matrix4();
  }

  // карта отражений (станции или нейтральная)
  setEnv(env, intensity = 1) {
    if (this._env === env && this._envI === intensity) return;
    this._env = env; this._envI = intensity;
    const ms = [this.mats.reveal, this.mats.glass, this.mats.roof, this.mats.pole, this.mats.door, this.frontMat];
    for (const sc of this.sections) { ms.push(sc.paint); }
    this.group.traverse((o) => { if (o.material && !Array.isArray(o.material) && o.material.isMeshPhysicalMaterial) ms.push(o.material); });
    for (const m of new Set(ms)) { if (!m) continue; const had = !!m.envMap; m.envMap = env; m.envMapIntensity = intensity; if (had !== !!env) m.needsUpdate = true; }
  }

  setDestination(dest) {
    if (dest === this.dest) return;
    this.dest = dest;
    const ft = frontTexture(this.type, dest, false);
    this.frontMat.map.dispose(); this.frontMat.emissiveMap.dispose();
    this.frontMat.map = ft.map; this.frontMat.emissiveMap = ft.emissive; this.frontMat.needsUpdate = true;
  }

  // f: 0..1 — степень открытия дверей со стороны side (-1 — левая, к платформе)
  setDoors(f, side = -1) { this.doorOpen = f; this.doorSide = side; this._placeLeaves(); }

  _placeLeaves() {
    const w = this.def.doorW / 2;
    const M = this._tmpM, Lm = this._tmpL;
    this.doorLeaves.forEach((d, i) => {
      const sc = this.sections[d.sec];
      const k = d.sx === this.doorSide ? this.doorOpen : 0;
      const plug = this.type === '775' ? Math.min(1, k * 4) * 0.05 : 0;
      const z = d.z0 + d.h * w * 0.98 * k;
      const x = d.sx * (HALF_W + 0.004 + plug);
      Lm.makeTranslation(x, FLOOR_Y, z);
      if (d.sx < 0) Lm.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      M.multiplyMatrices(sc.group.matrix, Lm);
      this.leafMesh.setMatrixAt(i, M); this.leafGlass.setMatrixAt(i, M);
    });
    this.leafMesh.instanceMatrix.needsUpdate = true; this.leafGlass.instanceMatrix.needsUpdate = true;
  }

  update(route, sHead) {
    const f1 = {}, f2 = {};
    const m = new THREE.Matrix4();
    const fwd = new THREE.Vector3(), up = new THREE.Vector3(), right = new THREE.Vector3(), back = new THREE.Vector3();
    for (const sc of this.sections) {
      const sc0 = sHead - sc.off - sc.Lb / 2;
      const sF = sc0 - sc.bogieZ[0], sR = sc0 - sc.bogieZ[1];
      route.frameAt(sF, f1); const pF = f1.pos.clone();
      route.frameAt(sR, f2); const pR = f2.pos.clone();
      fwd.subVectors(pF, pR).normalize();
      up.copy(f1.up).add(f2.up).normalize();
      right.crossVectors(fwd, up).normalize();
      up.crossVectors(right, fwd).normalize();
      back.copy(fwd).negate();
      m.makeBasis(right, up, back);
      m.setPosition(pF.add(pR).multiplyScalar(0.5));
      sc.group.matrix.copy(m);
      sc.group.matrixWorldNeedsUpdate = true;
    }
    this._placeLeaves();
  }

  // произвольная расстановка секций (для встречного поезда): fn(sc) -> Matrix4
  placeSections(fn) {
    for (const sc of this.sections) { sc.group.matrix.copy(fn(sc)); sc.group.matrixWorldNeedsUpdate = true; }
    this._placeLeaves();
  }

  // мировые координаты центров дверей на уровне пола (side: -1 — левые)
  doorWorld(side = -1) {
    const out = [];
    for (const [si, sc] of this.sections.entries()) {
      for (const z of sc.doors) { const v = new THREE.Vector3(side * HALF_W, FLOOR_Y, z).applyMatrix4(sc.group.matrix); v.sec = si; v.lz = z; out.push(v); }
    }
    return out;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry && !o.isInstancedMesh && !this._isCached(o.geometry)) o.geometry.dispose();
      if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; for (const mm of ms) { if (mm.map && mm.userData.own !== false) mm.map.dispose(); if (mm.emissiveMap) mm.emissiveMap.dispose(); mm.dispose(); } }
    });
    this.leafMesh.dispose(); this.leafGlass.dispose();
  }

  _isCached(g) {
    for (const v of geoCache.values()) { if (v.sideExt === g || v.panel === g || v.glass === g || Object.values(v.interior).includes(g)) return true; }
    return false;
  }
}
