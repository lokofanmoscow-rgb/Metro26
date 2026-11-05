// Детальные кабины машиниста трёх поездов (по фотографиям с Викисклада):
//  81-717 «Номерной» — кремовые блоки пульта на синем основании, стрелочный скоростемер
//    с лампами АРС, манометры, тумблеры, контроллер КВ-70 и кран машиниста с коричневой ручкой;
//  81-775 «Москва-2020» — центральный пост: три экрана, панели круглых кнопок, джойстик,
//    манометры на стойке, эргономичное кресло;
//  81-740 «Русич» — светло-серый ступенчатый пульт, красный цифровой скоростемер,
//    зелёный дисплей БУП с клавиатурой, рычаг контроллера в прорези, мониторы камер.
// Локальная система кабины: z = 0 — лобовая стенка, z растёт назад, x — вправо, y — от головки рельса.
import * as THREE from 'three';
import { makeCanvas, canvasTex, mergeGeoms, boxGeom, cylGeom, mulberry32 } from './util.js';

const FLOOR_Y = 1.15;
const ZB = 2.45; // задняя стенка кабины
const std = (color, roughness = 0.6, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
const glow = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });

function tex(w, h, draw, opts = {}) {
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'), w, h);
  const t = canvasTex(c, { aniso: 8, ...opts });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// циферблат стрелочного прибора (статичный): шкала, цифры, подпись
function dialTex(label, { max = 10, step = 1, major = 2, red = null, face = '#f2f0e6' } = {}) {
  return tex(256, 256, (x, W) => {
    const c = W / 2, r = W / 2 - 6;
    x.fillStyle = '#111'; x.beginPath(); x.arc(c, c, r + 6, 0, 7); x.fill();
    x.fillStyle = face; x.beginPath(); x.arc(c, c, r, 0, 7); x.fill();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    if (red != null) { x.strokeStyle = '#c81e1e'; x.lineWidth = 10; x.beginPath(); x.arc(c, c, r - 12, a0 + (a1 - a0) * red / max, a1); x.stroke(); }
    x.strokeStyle = '#111'; x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let v = 0; v <= max + 1e-6; v += step) {
      const a = a0 + (a1 - a0) * v / max, big = Math.abs(v / major - Math.round(v / major)) < 1e-6;
      x.lineWidth = big ? 4 : 2;
      x.beginPath(); x.moveTo(c + Math.cos(a) * (r - 4), c + Math.sin(a) * (r - 4)); x.lineTo(c + Math.cos(a) * (r - (big ? 22 : 13)), c + Math.sin(a) * (r - (big ? 22 : 13))); x.stroke();
      if (big) { x.font = '700 24px Arial'; x.fillText(String(Math.round(v * 10) / 10), c + Math.cos(a) * (r - 42), c + Math.sin(a) * (r - 42)); }
    }
    x.font = '700 20px Arial'; x.fillText(label, c, c + 58);
  });
}

// круглый прибор: корпус, циферблат, стекло, стрелка (поворот вокруг оси z прибора)
function gauge(r, face, bezel) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(cylGeom(r * 1.12, r * 1.12, 0.04, 28, 0, 0, -0.02, Math.PI / 2, 0, 0), bezel));
  const f = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ map: face, roughness: 0.5 }));
  f.position.z = 0.002; g.add(f);
  const needle = new THREE.Group();
  needle.add(new THREE.Mesh(boxGeom(r * 0.07, r * 0.85, 0.004, 0, r * 0.38, 0), std(0x111111, 0.4)));
  needle.position.z = 0.006;
  g.add(needle);
  g.add(new THREE.Mesh(cylGeom(r * 0.1, r * 0.1, 0.01, 12, 0, 0, 0.008, Math.PI / 2, 0, 0), std(0x111111, 0.4)));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(r * 1.02, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2 }));
  glass.position.z = 0.014; g.add(glass);
  // угол стрелки: v от 0 до 1 — дуга 270°
  g.userData.set = (v) => { needle.rotation.z = Math.PI * 0.75 - Math.PI * 1.5 * Math.max(0, Math.min(1, v)); };
  g.userData.set(0);
  return g;
}

// лицевая панель блока пульта: «бумажная» шильда с надписями и рамкой
function plateTex(w, h, base, draw) {
  const W = Math.round(w * 800), H = Math.round(h * 800);
  return tex(W, H, (x) => {
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    const r = mulberry32(W * 7 + H);
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(0,0,0,${0.02 * r()})`; x.fillRect(r() * W, r() * H, 2, 2); }
    if (draw) draw(x, W, H);
  });
}

// блок пульта: корпус, лицевая шильда, детали на нём (в локальной системе блока: лицо смотрит на +z)
function panelBlock(w, h, d, bodyMat, faceTex, edgeMat = null) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(boxGeom(w, h, d, 0, 0, -d / 2), bodyMat));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.012, h - 0.012), new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.55 }));
  face.position.z = 0.001; g.add(face);
  if (edgeMat) {
    g.add(new THREE.Mesh(mergeGeoms([boxGeom(w + 0.01, 0.012, 0.01, 0, h / 2, 0), boxGeom(w + 0.01, 0.012, 0.01, 0, -h / 2, 0), boxGeom(0.012, h, 0.01, -w / 2, 0, 0), boxGeom(0.012, h, 0.01, w / 2, 0, 0)]), edgeMat));
  }
  return g;
}

// мелкие органы управления на лице блока
const PARTS = {
  button: (r = 0.016) => mergeGeoms([cylGeom(r * 1.35, r * 1.35, 0.006, 16, 0, 0, 0.003, Math.PI / 2, 0, 0), cylGeom(r, r, 0.018, 16, 0, 0, 0.012, Math.PI / 2, 0, 0)]),
  toggle: () => mergeGeoms([cylGeom(0.012, 0.012, 0.012, 10, 0, 0, 0.006, Math.PI / 2, 0, 0), cylGeom(0.0045, 0.003, 0.045, 8, 0, 0.012, 0.03, Math.PI / 2 - 0.6, 0, 0)]),
  knob: () => mergeGeoms([cylGeom(0.024, 0.026, 0.02, 18, 0, 0, 0.01, Math.PI / 2, 0, 0), boxGeom(0.006, 0.03, 0.006, 0, 0.006, 0.022)]),
  lamp: (r = 0.011) => cylGeom(r, r, 0.012, 14, 0, 0, 0.006, Math.PI / 2, 0, 0),
  key: () => boxGeom(0.032, 0.024, 0.01, 0, 0, 0.005),
};
function place(g, geom, mat, list) {
  const gs = list.map(([x, y]) => geom.clone().translate(x, y, 0.001));
  if (gs.length) g.add(new THREE.Mesh(mergeGeoms(gs), mat));
}

// объединение статичных деталей по материалу (меньше вызовов отрисовки)
function bakeStatic(grp, keep) {
  grp.updateMatrixWorld(true);
  const inv = grp.matrixWorld.clone().invert();
  const by = new Map();
  const dead = [];
  grp.traverse((o) => {
    if (!o.isMesh || o.userData.dyn || keep.some((k) => isUnder(o, k))) return;
    if (o.material.transparent || o.material.map) return;
    const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid;
    if (!by.has(key)) by.set(key, { m: o.material, gs: [] });
    by.get(key).gs.push(g.index ? g.toNonIndexed() : g);
    dead.push(o);
  });
  for (const o of dead) o.parent.remove(o);
  for (const { m, gs } of by.values()) {
    for (const g of gs) { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); }
    grp.add(new THREE.Mesh(mergeGeoms(gs), m));
  }
}
function isUnder(o, k) { for (let p = o; p; p = p.parent) if (p === k) return true; return false; }

// ---------- общий каркас кабины ----------
function shell(grp, type, P) {
  const wall = std(P.wall, 0.75, 0, { side: THREE.DoubleSide });
  const trim = std(P.trim, 0.55, 0.1, { side: THREE.DoubleSide });
  const floorM = std(P.floor, 0.9);
  // пол с рифлёным покрытием, потолок, задняя стенка с дверью в салон
  const fl = tex(256, 256, (x, W) => { x.fillStyle = '#' + P.floor.toString(16).padStart(6, '0'); x.fillRect(0, 0, W, W); x.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < W; i += 16) for (let j = (i / 16) % 2 ? 8 : 0; j < W; j += 16) x.fillRect(i, j, 10, 3); }, { mip: true });
  fl.wrapS = fl.wrapT = THREE.RepeatWrapping; fl.repeat.set(4, 4);
  floorM.map = fl;
  grp.add(new THREE.Mesh(boxGeom(2.6, 0.04, ZB, 0, FLOOR_Y, ZB / 2), floorM));
  grp.add(new THREE.Mesh(boxGeom(2.6, 0.04, ZB, 0, 3.32, ZB / 2), std(P.ceil, 0.8, 0, { side: THREE.DoubleSide })));
  grp.add(new THREE.Mesh(boxGeom(2.6, 2.2, 0.05, 0, FLOOR_Y + 1.1, ZB), wall));
  // дверь в салон с окном
  const door = new THREE.Group();
  door.add(new THREE.Mesh(mergeGeoms([boxGeom(0.72, 0.9, 0.05, 0, 0.45, 0), boxGeom(0.72, 0.45, 0.05, 0, 1.68, 0), boxGeom(0.12, 0.33, 0.05, -0.3, 1.27, 0), boxGeom(0.12, 0.33, 0.05, 0.3, 1.27, 0)]), std(P.door, 0.5, 0.2)));
  door.add(new THREE.Mesh(boxGeom(0.48, 0.33, 0.01, 0, 1.27, 0), new THREE.MeshStandardMaterial({ color: 0x9fb4bf, transparent: true, opacity: 0.25, roughness: 0.05 })));
  door.add(new THREE.Mesh(boxGeom(0.03, 0.18, 0.05, -0.28, 0.98, -0.04), std(0xb8bcbf, 0.25, 0.9)));
  door.position.set(P.doorX, FLOOR_Y, ZB - 0.04);
  grp.add(door);
  // светильник: плафон с рассеивателем
  grp.add(new THREE.Mesh(boxGeom(0.7, 0.05, 0.3, P.eyeX, 3.27, 1.45), trim));
  grp.add(new THREE.Mesh(boxGeom(0.62, 0.02, 0.24, P.eyeX, 3.24, 1.45), glow(0xfff4dc, 1.1)));
  // боковые стенки с окнами
  const sw = P.sideWin;
  for (const sx of [-1, 1]) {
    const x = sx * 1.3;
    grp.add(new THREE.Mesh(mergeGeoms([
      boxGeom(0.05, sw.y0 - FLOOR_Y, ZB, x, (FLOOR_Y + sw.y0) / 2, ZB / 2),
      boxGeom(0.05, 3.32 - sw.y1, ZB, x, (sw.y1 + 3.32) / 2, ZB / 2),
      boxGeom(0.05, sw.y1 - sw.y0, 0.35, x, (sw.y0 + sw.y1) / 2, 0.15),
      boxGeom(0.05, sw.y1 - sw.y0, 0.3, x, (sw.y0 + sw.y1) / 2, 1.6),
      boxGeom(0.05, sw.y1 - sw.y0, ZB - 2.2, x, (sw.y0 + sw.y1) / 2, 2.2 + (ZB - 2.2) / 2),
    ]), wall));
    // уплотнители окна
    grp.add(new THREE.Mesh(mergeGeoms([boxGeom(0.07, 0.04, 1.3, x - sx * 0.01, sw.y0, 0.98), boxGeom(0.07, 0.04, 1.3, x - sx * 0.01, sw.y1, 0.98)]), std(0x1b1c1d, 0.8)));
    // зеркало заднего вида
    grp.add(new THREE.Mesh(boxGeom(0.03, 0.26, 0.16, x + sx * 0.36, 2.35, 0.1), std(0x6c7d86, 0.1, 0.8)));
    grp.add(new THREE.Mesh(boxGeom(0.34, 0.03, 0.03, x + sx * 0.18, 2.25, 0.1), std(0x222222, 0.5)));
  }
  // лобовое окно и стойки
  const ws = P.ws, dark = std(P.front, 0.6, 0.1, { side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(boxGeom(2.6, ws.y0 - FLOOR_Y, 0.06, 0, (FLOOR_Y + ws.y0) / 2, 0.02), dark));
  grp.add(new THREE.Mesh(boxGeom(2.6, 3.32 - ws.y1, 0.06, 0, (ws.y1 + 3.32) / 2, 0.02), dark));
  const pil = ws.pillars.map((x) => boxGeom(0.1, ws.y1 - ws.y0, 0.08, x, (ws.y0 + ws.y1) / 2, 0.03));
  pil.push(boxGeom(0.12, ws.y1 - ws.y0, 0.12, -1.26, (ws.y0 + ws.y1) / 2, 0.04), boxGeom(0.12, ws.y1 - ws.y0, 0.12, 1.26, (ws.y0 + ws.y1) / 2, 0.04));
  grp.add(new THREE.Mesh(mergeGeoms(pil), dark));
  grp.add(new THREE.Mesh(boxGeom(2.5, ws.y1 - ws.y0, 0.01, 0, (ws.y0 + ws.y1) / 2, -0.01), new THREE.MeshStandardMaterial({ color: 0x9fb4bf, transparent: true, opacity: 0.07, roughness: 0.02, depthWrite: false, side: THREE.DoubleSide })));
  // солнцезащитная шторка (скатана под потолком)
  grp.add(new THREE.Mesh(cylGeom(0.035, 0.035, 2.2, 12, 0, ws.y1 + 0.06, 0.1, 0, 0, Math.PI / 2), trim));
  // дворник
  const wiper = new THREE.Group();
  wiper.add(new THREE.Mesh(boxGeom(0.025, 0.85, 0.02, 0, 0.42, 0), std(0x111111, 0.6)));
  wiper.position.set(P.eyeX + 0.05, ws.y0 + 0.02, -0.04); wiper.rotation.z = 1.2;
  grp.add(wiper);
  // огнетушитель у задней стенки
  grp.add(new THREE.Mesh(cylGeom(0.075, 0.075, 0.5, 14, 1.12, FLOOR_Y + 0.35, ZB - 0.18), std(0xc41e1e, 0.35, 0.1)));
  grp.add(new THREE.Mesh(cylGeom(0.03, 0.03, 0.08, 10, 1.12, FLOOR_Y + 0.64, ZB - 0.18), std(0x222222, 0.4, 0.5)));
  const light = new THREE.PointLight(0xffe8c8, 1.7, 4.2, 1.5);
  light.position.set(P.eyeX, 3.05, 1.3);
  grp.add(light);
  return { wiper };
}

// кресло машиниста
function seat(grp, x, z, fabric, frame, { head = false } = {}) {
  const s = new THREE.Group();
  s.add(new THREE.Mesh(mergeGeoms([boxGeom(0.52, 0.12, 0.5, 0, 0.55, 0), boxGeom(0.5, 0.68, 0.11, 0, 0.98, 0.27)]), fabric));
  if (head) s.add(new THREE.Mesh(boxGeom(0.32, 0.2, 0.1, 0, 1.45, 0.3), fabric));
  s.add(new THREE.Mesh(mergeGeoms([cylGeom(0.04, 0.04, 0.46, 10, 0, 0.26, 0), boxGeom(0.5, 0.04, 0.06, 0, 0.03, 0), boxGeom(0.06, 0.04, 0.5, 0, 0.03, 0), boxGeom(0.05, 0.05, 0.36, -0.29, 0.72, 0.02), boxGeom(0.05, 0.05, 0.36, 0.29, 0.72, 0.02)]), frame));
  s.position.set(x, FLOOR_Y, z);
  grp.add(s);
}

// ткань «Русича»: красно-чёрный узор
function fabricTex(a, b) {
  const t = tex(128, 128, (x, W) => {
    x.fillStyle = a; x.fillRect(0, 0, W, W);
    const r = mulberry32(5);
    for (let i = 0; i < 60; i++) { x.fillStyle = r() < 0.5 ? b : '#2a2a2a'; x.save(); x.translate(r() * W, r() * W); x.rotate(r() * 3); x.fillRect(-10, -3, 20, 6); x.restore(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

// =====================================================================
// 81-717 «Номерной»
// =====================================================================
function cab717(grp, P) {
  const blue = std(0x2b4472, 0.55, 0.15);
  const cream = std(0xe6dfc6, 0.6);
  const edge = std(0x2f5aa8, 0.4, 0.2);
  const chrome = std(0xc9cdd0, 0.2, 0.9);
  // основание пульта и полка
  const shelfY = 1.66;
  grp.add(new THREE.Mesh(mergeGeoms([
    boxGeom(1.62, shelfY - FLOOR_Y, 0.45, -0.46, (FLOOR_Y + shelfY) / 2, 0.3),
    boxGeom(1.66, 0.04, 0.62, -0.46, shelfY, 0.42),
    boxGeom(0.95, 0.5, 0.42, 0.82, FLOOR_Y + 0.25, 0.3), // правый шкаф помощника
    boxGeom(0.95, 0.04, 0.48, 0.82, FLOOR_Y + 0.52, 0.33),
  ]), blue));
  // поручень перед полкой
  grp.add(new THREE.Mesh(mergeGeoms([cylGeom(0.012, 0.012, 1.5, 10, -0.46, shelfY + 0.06, 0.76, 0, 0, Math.PI / 2), cylGeom(0.012, 0.012, 0.1, 8, -1.2, shelfY + 0.02, 0.76), cylGeom(0.012, 0.012, 0.1, 8, 0.28, shelfY + 0.02, 0.76)]), chrome));
  // ряды кремовых блоков пульта: наклонены к машинисту
  const rack = new THREE.Group();
  rack.position.set(-0.46, shelfY + 0.02, 0.2);
  rack.rotation.x = -0.32;
  grp.add(rack);
  const dyn = {};
  const lampOff = std(0x3a3a38, 0.4);
  const lampCols = { r: 0xff3b2a, y: 0xffd23a, g: 0x3aff6a, w: 0xf4f4ea };
  const blackKnob = std(0x161616, 0.35), redBtn = std(0xc81e1e, 0.35), whiteBtn = std(0xe9e6dc, 0.4), blackBtn = std(0x1d1d1d, 0.35);
  const mk = (w, h, x, y, draw) => { const b = panelBlock(w, h, 0.07, cream, plateTex(w, h, '#e6dfc6', draw), edge); b.position.set(x, y, 0); rack.add(b); return b; };
  const label = (x, txt, px, py, size = 18) => { x.fillStyle = '#2a2a2a'; x.font = `700 ${size}px Arial`; x.textAlign = 'center'; x.fillText(txt, px, py); };
  // нижний ряд
  const b1 = mk(0.42, 0.26, -0.52, 0.13, (x, W, H) => { label(x, 'АЛС-АРС', W / 2, 28); x.fillStyle = '#0d0f0d'; x.fillRect(W * 0.12, H * 0.25, W * 0.42, H * 0.2); for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { x.fillStyle = '#6b665a'; x.beginPath(); x.arc(W * 0.7 + i * 10, H * 0.62 + j * 10, 3, 0, 7); x.fill(); } });
  const b2 = mk(0.5, 0.26, -0.05, 0.13, (x, W) => { label(x, 'УПРАВЛЕНИЕ', W / 2, 28); ['ДВЕРИ ЛЕВ', 'ДВЕРИ ПР', 'ФАРЫ', 'ВЕНТ.', 'КОМПР.'].forEach((t, i) => label(x, t, 40 + i * 76, 190, 13)); });
  const b3 = mk(0.42, 0.26, 0.43, 0.13, (x, W) => { label(x, 'СКОРОСТЬ', W / 2 - 50, 28); label(x, 'РЕЗЕРВ', W - 60, 28, 14); });
  // верхний ряд
  const t1 = mk(0.42, 0.2, -0.52, 0.37, (x, W) => { label(x, 'СИГНАЛИЗАЦИЯ', W / 2, 24); });
  const t2 = mk(0.5, 0.2, -0.05, 0.37, (x, W) => { label(x, 'ЛАМПЫ АРС', W / 2, 24); ['ОЧ', '0', '40', '60', '70', '80'].forEach((t, i) => label(x, t, 46 + i * 62, 140, 16)); });
  const t3 = mk(0.42, 0.2, 0.43, 0.37, (x, W) => { label(x, 'ТМ        НМ', W / 2, 24); });
  // скоростемер (живой) — на правом нижнем блоке
  const spd = tex(512, 512, () => {});
  const spdCanvas = spd.image;
  const sp = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), new THREE.MeshBasicMaterial({ map: spd }));
  sp.position.set(-0.06, -0.01, 0.012); b3.add(sp);
  b3.add(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.009, 10, 40).translate(-0.06, -0.01, 0.012), std(0x151515, 0.4, 0.3)));
  b3.add(new THREE.Mesh(cylGeom(0.095, 0.095, 0.01, 32, -0.06, -0.01, 0.002, Math.PI / 2, 0, 0), std(0x151515, 0.4, 0.3)));
  sp.position.z = 0.009;
  place(b3, PARTS.button(0.016), redBtn, [[0.12, 0.06], [0.12, -0.02], [0.12, -0.09]]);
  // манометры ТМ/НМ
  const tm = gauge(0.06, dialTex('ТМ', { max: 10, step: 0.5, major: 2 }), std(0x111111, 0.4, 0.4)); tm.position.set(-0.09, -0.02, 0.008); t3.add(tm);
  const nm = gauge(0.06, dialTex('НМ', { max: 10, step: 0.5, major: 2 }), std(0x111111, 0.4, 0.4)); nm.position.set(0.09, -0.02, 0.008); t3.add(nm);
  nm.userData.set(0.8);
  // лампы АРС (живые)
  const arsVals = [-1, 0, 40, 60, 70, 80];
  const arsCols = [lampCols.w, lampCols.r, lampCols.y, lampCols.y, lampCols.y, lampCols.g];
  dyn.ars = arsVals.map((v, i) => { const m = new THREE.Mesh(PARTS.lamp(0.016), lampOff); m.position.set(-0.19 + i * 0.077, 0.0, 0.001); m.userData.dyn = true; t2.add(m); return { m, v, on: glow(arsCols[i], 1.4) }; });
  // сигнальные лампы
  const sig = [['ДВЕРИ', lampCols.g], ['ХОД', lampCols.y], ['ТОРМ', 0xff7a3a], ['АРС', lampCols.r], ['РП', lampCols.r], ['ЛСН', lampCols.w]];
  dyn.sig = sig.map(([, c], i) => { const m = new THREE.Mesh(PARTS.lamp(0.013), lampOff); m.position.set(-0.15 + (i % 3) * 0.15, (i < 3 ? 0.025 : -0.04), 0.001); m.userData.dyn = true; t1.add(m); return { m, on: glow(c, 1.4) }; });
  // тумблеры, кнопки, переключатели на нижних блоках
  place(b2, PARTS.toggle(), chrome, [[-0.2, 0.0], [-0.1, 0.0], [0.0, 0.0], [0.1, 0.0], [0.2, 0.0], [-0.2, 0.06], [-0.1, 0.06]]);
  place(b2, PARTS.button(0.017), blackBtn, [[-0.2, -0.07], [-0.1, -0.07], [0.0, -0.07]]);
  place(b2, PARTS.button(0.017), redBtn, [[0.1, -0.07], [0.2, -0.07], [0.0, 0.06]]);
  place(b2, PARTS.button(0.017), whiteBtn, [[0.1, 0.06], [0.2, 0.06]]);
  place(b1, PARTS.knob(), blackKnob, [[-0.12, -0.05], [0.05, -0.05]]);
  place(b1, PARTS.button(0.013), whiteBtn, [[0.15, -0.08], [0.15, 0.0]]);
  // контроллер КВ-70: поворотная рукоятка слева на полке
  const ctrl = new THREE.Group();
  ctrl.add(new THREE.Mesh(cylGeom(0.1, 0.11, 0.08, 20, 0, 0, 0), std(0x1b1b1b, 0.45, 0.3)));
  ctrl.add(new THREE.Mesh(boxGeom(0.05, 0.035, 0.32, 0, 0.05, -0.16), std(0x111111, 0.4, 0.4)));
  ctrl.add(new THREE.Mesh(cylGeom(0.026, 0.026, 0.11, 10, 0, 0.11, -0.3), std(0x8a1a1a, 0.4)));
  ctrl.position.set(-1.08, shelfY + 0.05, 0.62);
  grp.add(ctrl);
  // кран машиниста № 013: корпус и коричневая рукоятка
  const crane = new THREE.Group();
  crane.add(new THREE.Mesh(mergeGeoms([cylGeom(0.09, 0.11, 0.14, 18, 0, 0, 0), cylGeom(0.035, 0.035, 0.3, 10, 0, -0.2, 0)]), std(0x3a3a3a, 0.45, 0.5)));
  crane.add(new THREE.Mesh(mergeGeoms([boxGeom(0.045, 0.04, 0.26, 0.08, 0.09, -0.08), cylGeom(0.04, 0.035, 0.1, 12, 0.16, 0.12, -0.2)]), std(0x8a4a22, 0.35, 0.1)));
  crane.position.set(0.2, shelfY + 0.08, 0.6);
  crane.rotation.y = -0.6;
  grp.add(crane);
  // задний щиток с автоматами (как на фото)
  const fuse = tex(512, 640, (x, W, H) => {
    x.fillStyle = '#a7acae'; x.fillRect(0, 0, W, H);
    const cols = ['#d93a2a', '#ffffff', '#f2c53d', '#3d6fa8', '#2aa84a'];
    for (let r = 0; r < 3; r++) {
      const y = 70 + r * 200;
      for (let i = 0; i < 12; i++) { x.fillStyle = '#1f1f1f'; x.fillRect(30 + i * 38, y, 30, 60); x.fillStyle = '#ddd'; x.fillRect(38 + i * 38, y + 18, 14, 22); }
      for (let i = 0; i < 12; i++) { x.fillStyle = cols[(i + r) % 5]; x.fillRect(30 + i * 38, y + 74, 34, 26); }
    }
  });
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), new THREE.MeshStandardMaterial({ map: fuse, roughness: 0.6, metalness: 0.2 }));
  fp.position.set(-0.75, FLOOR_Y + 1.25, ZB - 0.03); fp.rotation.y = Math.PI; grp.add(fp);
  seat(grp, -0.5, 1.4, std(0x6b3f2c, 0.7), std(0x2a2a2a, 0.4, 0.5));
  // радиостанция под потолком, переговорное устройство
  grp.add(new THREE.Mesh(boxGeom(0.34, 0.2, 0.22, 0.9, 3.08, 0.35), std(0x2c2f31, 0.5, 0.2)));
  grp.add(new THREE.Mesh(boxGeom(0.08, 0.16, 0.05, 0.75, 2.92, 0.48), std(0x111111, 0.5)));
  return {
    ctrl, keep: [ctrl, ...dyn.ars.map((a) => a.m), ...dyn.sig.map((a) => a.m), tm, nm, sp],
    update(s) {
      // скоростемер
      const x = spdCanvas.getContext('2d'), W = 512, c = W / 2, r = 236;
      x.fillStyle = '#f2f0e6'; x.fillRect(0, 0, W, W);
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      x.strokeStyle = '#111'; x.fillStyle = '#111'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let v = 0; v <= 100; v += 5) {
        const a = a0 + (a1 - a0) * v / 100, big = v % 10 === 0;
        x.lineWidth = big ? 6 : 3;
        x.beginPath(); x.moveTo(c + Math.cos(a) * (r - 8), c + Math.sin(a) * (r - 8)); x.lineTo(c + Math.cos(a) * (r - (big ? 40 : 24)), c + Math.sin(a) * (r - (big ? 40 : 24))); x.stroke();
        if (big) { x.font = '700 38px Arial'; x.fillText(String(v), c + Math.cos(a) * (r - 74), c + Math.sin(a) * (r - 74)); }
      }
      const al = a0 + (a1 - a0) * Math.min(s.limit, 100) / 100;
      x.strokeStyle = '#d0202c'; x.lineWidth = 12; x.beginPath(); x.arc(c, c, r - 12, al - 0.04, al + 0.04); x.stroke();
      const av = a0 + (a1 - a0) * Math.min(s.speed, 100) / 100;
      x.strokeStyle = '#111'; x.lineWidth = 9; x.beginPath(); x.moveTo(c, c); x.lineTo(c + Math.cos(av) * (r - 34), c + Math.sin(av) * (r - 34)); x.stroke();
      x.beginPath(); x.arc(c, c, 20, 0, 7); x.fill();
      x.font = '700 30px Arial'; x.fillText('км/ч', c, c + 100);
      spd.needsUpdate = true;
      for (const a of dyn.ars) a.m.material = (s.limit === a.v || (a.v === 80 && s.limit > 80) || (a.v === -1 && s.limit === 0)) ? a.on : lampOff;
      const st = [s.doorsClosed, s.traction > 0.05, s.brake > 0.05, s.overspeed, false, true];
      dyn.sig.forEach((l, i) => { l.m.material = st[i] ? l.on : lampOff; });
      tm.userData.set(0.5 + s.brake * 0.25);
    },
  };
}

// =====================================================================
// 81-775 «Москва-2020»: центральный пост
// =====================================================================
function screenTex(w, h) { const t = tex(w, h, (x) => { x.fillStyle = '#05080c'; x.fillRect(0, 0, w, h); }); return t; }
function cab775(grp, P) {
  const desk = std(0xd9dcde, 0.45, 0.05);
  const black = std(0x15171a, 0.25, 0.3);
  const grey = std(0x8f969b, 0.4, 0.3);
  // стол-пульт: изогнутая столешница перед креслом, по центру кабины
  const deskY = 1.58;
  grp.add(new THREE.Mesh(mergeGeoms([
    boxGeom(2.1, deskY - FLOOR_Y - 0.02, 0.5, 0, (FLOOR_Y + deskY) / 2, 0.32),
    boxGeom(0.55, deskY - FLOOR_Y - 0.02, 0.5, -0.86, (FLOOR_Y + deskY) / 2, 0.8),
    boxGeom(0.55, deskY - FLOOR_Y - 0.02, 0.5, 0.86, (FLOOR_Y + deskY) / 2, 0.8),
  ]), desk));
  grp.add(new THREE.Mesh(mergeGeoms([boxGeom(2.14, 0.04, 0.72, 0, deskY, 0.42), boxGeom(0.6, 0.04, 0.55, -0.86, deskY, 0.9), boxGeom(0.6, 0.04, 0.55, 0.86, deskY, 0.9)]), std(0x3a3e42, 0.35, 0.2)));
  // три экрана в чёрной рамке, наклонены к машинисту
  const scr = [];
  const mkScreen = (x, ry, w = 0.36, h = 0.26) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(boxGeom(w + 0.04, h + 0.04, 0.05, 0, 0, -0.025), black));
    const t = screenTex(512, 372);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
    m.position.z = 0.002; g.add(m);
    g.add(new THREE.Mesh(boxGeom(0.05, 0.14, 0.05, 0, -h / 2 - 0.07, -0.05), black));
    g.position.set(x, deskY + 0.2, 0.3); g.rotation.set(-0.28, ry, 0);
    grp.add(g); scr.push({ t, g, m });
    return t;
  };
  const sL = mkScreen(-0.46, 0.25), sC = mkScreen(0, 0), sR = mkScreen(0.46, -0.25);
  // джойстик контроллера слева
  const ctrl = new THREE.Group();
  ctrl.add(new THREE.Mesh(cylGeom(0.018, 0.022, 0.2, 12, 0, 0.1, 0), black));
  ctrl.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12).scale(1, 1.4, 1).translate(0, 0.23, 0), std(0x1c1e21, 0.3, 0.2)));
  ctrl.add(new THREE.Mesh(cylGeom(0.012, 0.012, 0.012, 10, 0, 0.29, 0.02), std(0xd0202c, 0.3, 0, { emissive: 0x500000 })));
  ctrl.position.set(-0.62, deskY + 0.02, 0.78);
  grp.add(ctrl);
  grp.add(new THREE.Mesh(boxGeom(0.16, 0.03, 0.2, -0.62, deskY + 0.02, 0.78), black));
  // клавиатура/сенсорная панель справа, трубка связи
  grp.add(new THREE.Mesh(boxGeom(0.26, 0.02, 0.16, 0.58, deskY + 0.03, 0.85), black));
  const keys = []; for (let i = 0; i < 12; i++) keys.push(boxGeom(0.034, 0.01, 0.03, 0.5 + (i % 4) * 0.052, deskY + 0.045, 0.8 + Math.floor(i / 4) * 0.045));
  grp.add(new THREE.Mesh(mergeGeoms(keys), grey));
  grp.add(new THREE.Mesh(mergeGeoms([boxGeom(0.06, 0.05, 0.22, 0.95, deskY + 0.06, 0.62), boxGeom(0.09, 0.04, 0.06, 0.95, deskY + 0.05, 0.5), boxGeom(0.09, 0.04, 0.06, 0.95, deskY + 0.05, 0.74)]), black));
  // стойка слева с тремя манометрами
  const post = new THREE.Group();
  post.add(new THREE.Mesh(boxGeom(0.2, 0.68, 0.05, 0, 0, -0.025), std(0xe7e9ea, 0.5)));
  const gs = [];
  for (let i = 0; i < 3; i++) { const g = gauge(0.05, dialTex(['ТМ', 'НМ', 'ТЦ'][i], { max: 10, step: 0.5, major: 2 }), std(0x333333, 0.4, 0.5)); g.position.set(0, 0.2 - i * 0.2, 0.004); g.userData.set([0.5, 0.8, 0.0][i]); post.add(g); gs.push(g); }
  post.position.set(-1.18, 2.25, 0.32); post.rotation.y = 0.9;
  grp.add(post);
  seat(grp, 0, 1.78, std(0x1d1f22, 0.7), std(0x3a3e42, 0.4, 0.5), { head: true });
  return {
    ctrl, keep: [ctrl, ...scr.map((s) => s.g), post],
    update(s) {
      // центральный экран: скорость, дуга, АРС
      let x = sC.image.getContext('2d'); const W = 512, H = 372;
      x.fillStyle = '#071019'; x.fillRect(0, 0, W, H);
      const cx = W / 2, cy = 210, r = 150, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
      x.lineWidth = 22; x.strokeStyle = '#1b2a38'; x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke();
      x.strokeStyle = s.overspeed ? '#ff3b2a' : '#ff8a1e'; x.beginPath(); x.arc(cx, cy, r, a0, a0 + (a1 - a0) * Math.min(1, s.speed / 100)); x.stroke();
      const al = a0 + (a1 - a0) * Math.min(1, s.limit / 100);
      x.strokeStyle = '#ff2a2a'; x.lineWidth = 30; x.beginPath(); x.arc(cx, cy, r, al - 0.02, al + 0.02); x.stroke();
      x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 110px Arial'; x.fillText(String(Math.round(s.speed)), cx, cy - 6);
      x.font = '700 28px Arial'; x.fillStyle = '#59b8ff'; x.fillText('км/ч', cx, cy + 60);
      x.fillStyle = '#e9edf2'; x.font = '700 26px Arial'; x.fillText(`АРС ${s.limit}`, cx, 36);
      x.textAlign = 'left'; x.fillText(s.time || '', 16, H - 22); x.textAlign = 'right'; x.fillText(s.doorsClosed ? 'ДВЕРИ ЗАКР.' : 'ДВЕРИ ОТКР.', W - 16, H - 22);
      sC.needsUpdate = true;
      // правый экран: состояние вагонов (цветная сетка), следующая станция
      x = sR.image.getContext('2d');
      x.fillStyle = '#071019'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#59b8ff'; x.font = '700 24px Arial'; x.textAlign = 'left'; x.fillText('Следующая:', 18, 34);
      x.fillStyle = '#fff'; x.font = '700 28px Arial'; const nmT = s.next || ''; x.fillText(nmT.length > 22 ? nmT.slice(0, 21) + '…' : nmT, 18, 70);
      x.fillStyle = '#cfd6dd'; x.font = '700 24px Arial'; x.fillText(s.dist != null ? `до остановки ${Math.max(0, Math.round(s.dist))} м` : '', 18, 104);
      const n = s.cars || 8;
      for (let i = 0; i < n; i++) for (let j = 0; j < 6; j++) {
        x.fillStyle = j === 0 ? (s.doorsClosed ? '#2aa84a' : '#e8c22a') : (j === 3 && s.brake > 0.05) ? '#ff7a3a' : (j === 2 && s.traction > 0.05) ? '#3aa0ff' : '#1f6a3a';
        x.fillRect(18 + i * (476 / n), 130 + j * 36, 476 / n - 6, 30);
      }
      sR.needsUpdate = true;
      // левый экран: камера видеонаблюдения за платформой (тёмная картинка с перспективой)
      x = sL.image.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2b3036'); g.addColorStop(1, '#14171a');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(220,230,240,0.35)'; x.lineWidth = 3;
      for (let i = -4; i <= 4; i++) { x.beginPath(); x.moveTo(W / 2 + i * 12, 120); x.lineTo(W / 2 + i * 120, H); x.stroke(); }
      x.fillStyle = '#e8eef2'; x.font = '700 20px Arial'; x.textAlign = 'left'; x.fillText('КАМ 1  ' + (s.time || ''), 12, 26);
      sL.needsUpdate = true;
      gs[0].userData.set(0.5 + s.brake * 0.25); gs[2].userData.set(s.brake * 0.4);
    },
  };
}

// =====================================================================
// 81-740 «Русич»
// =====================================================================
function cab740(grp, P) {
  const body = std(0xaeb2b4, 0.45, 0.3);
  const face = std(0xc2c5c6, 0.5, 0.2);
  const dark = std(0x2a2d30, 0.4, 0.3);
  const deskY = 1.6;
  // основной пульт: нижний корпус, наклонная средняя панель, верхняя панель под окном
  grp.add(new THREE.Mesh(mergeGeoms([
    boxGeom(1.55, deskY - FLOOR_Y, 0.55, -0.42, (FLOOR_Y + deskY) / 2, 0.33),
    boxGeom(0.75, deskY - FLOOR_Y - 0.05, 0.5, 0.78, (FLOOR_Y + deskY - 0.05) / 2, 0.3),
  ]), body));
  const upper = new THREE.Group();
  upper.position.set(-0.42, deskY + 0.12, 0.14); upper.rotation.x = -0.5; grp.add(upper);
  const lower = new THREE.Group();
  lower.position.set(-0.42, deskY + 0.01, 0.62); lower.rotation.x = -1.25; grp.add(lower);
  const up = panelBlock(1.45, 0.24, 0.08, body, plateTex(1.45, 0.24, '#c2c5c6', (x, W) => { x.fillStyle = '#333'; x.font = '700 14px Arial'; ['ЛПТ', 'РП', 'ДВ', 'ОЧ', 'ЛСН', 'ТМ', 'ПСН', 'КК', 'ВЗ'].forEach((t, i) => x.fillText(t, 40 + i * 120, 30)); }));
  upper.add(up);
  const lo = panelBlock(1.45, 0.42, 0.06, body, plateTex(1.45, 0.42, '#bfc2c3', (x, W, H) => { x.fillStyle = '#1b1b1b'; x.fillRect(W * 0.41, H * 0.18, W * 0.04, H * 0.62); x.fillStyle = '#333'; x.font = '700 16px Arial'; x.fillText('ХОД', W * 0.47, H * 0.25); x.fillText('ТОРМОЗ', W * 0.47, H * 0.78); }));
  lower.add(lo);
  // красный цифровой скоростемер (живой)
  // экран посередине: сколько метров до остановки
  const seg = tex(512, 160, (x) => { x.fillStyle = '#100404'; x.fillRect(0, 0, 512, 160); });
  const segM = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.106), new THREE.MeshBasicMaterial({ map: seg }));
  segM.position.set(0, 0.0, 0.014); up.add(segM);
  up.add(new THREE.Mesh(boxGeom(0.37, 0.13, 0.016, 0, 0, 0.002), dark));
  // кнопки и тумблеры на нижней панели, рычаг контроллера в прорези
  place(lo, PARTS.button(0.02), std(0x2aa84a, 0.35, 0, { emissive: 0x0a3a14 }), [[0.2, 0.08], [0.26, 0.08], [0.32, 0.08]]);
  place(lo, PARTS.button(0.02), std(0xd0202c, 0.35, 0, { emissive: 0x3a0808 }), [[0.2, 0.0], [0.26, 0.0], [0.32, 0.0]]);
  place(lo, PARTS.toggle(), std(0xc9cdd0, 0.25, 0.9), [[-0.5, 0.05], [-0.42, 0.05], [-0.34, 0.05], [-0.26, 0.05], [-0.5, -0.06], [-0.42, -0.06]]);
  place(lo, PARTS.button(0.016), std(0x1d1d1d, 0.35), [[0.45, 0.1], [0.52, 0.1], [0.59, 0.1], [0.45, 0.02], [0.52, 0.02], [0.59, 0.02]]);
  const ctrl = new THREE.Group();
  ctrl.add(new THREE.Mesh(cylGeom(0.014, 0.014, 0.18, 10, 0, 0.09, 0), std(0x9a9ea2, 0.3, 0.8)));
  ctrl.add(new THREE.Mesh(boxGeom(0.11, 0.05, 0.05, 0, 0.19, 0), std(0x141414, 0.4)));
  ctrl.position.set(-0.42 - 0.14, deskY + 0.03, 0.62);
  grp.add(ctrl);
  // правый блок: зелёный дисплей БУП и клавиатура
  const bup = tex(384, 192, (x) => { x.fillStyle = '#0b1a0b'; x.fillRect(0, 0, 384, 192); });
  const bb = new THREE.Group();
  bb.add(new THREE.Mesh(boxGeom(0.4, 0.34, 0.1, 0, 0, -0.05), body));
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.12), new THREE.MeshBasicMaterial({ map: bup }));
  bm.position.set(0, 0.08, 0.002); bb.add(bm);
  const keys = []; for (let i = 0; i < 16; i++) keys.push(boxGeom(0.04, 0.03, 0.012, -0.09 + (i % 4) * 0.06, -0.04 - Math.floor(i / 4) * 0.035, 0.006));
  bb.add(new THREE.Mesh(mergeGeoms(keys), std(0xd8d0b4, 0.5)));
  bb.position.set(0.75, deskY + 0.12, 0.25); bb.rotation.x = -0.55;
  grp.add(bb);
  // мониторы камер на пульте
  const mon = (x, ry) => { const g = new THREE.Group(); g.add(new THREE.Mesh(boxGeom(0.3, 0.22, 0.14, 0, 0, -0.07), std(0x9a9ea2, 0.5, 0.2))); const t = screenTex(256, 190); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.18), new THREE.MeshBasicMaterial({ map: t })); m.position.z = 0.002; g.add(m); g.position.set(x, deskY + 0.42, 0.2); g.rotation.set(-0.15, ry, 0); grp.add(g); return { g, t }; };
  const m1 = mon(-1.0, 0.3), m2 = mon(0.52, -0.25);
  // два манометра на стойке слева
  const post = new THREE.Group();
  post.add(new THREE.Mesh(boxGeom(0.18, 0.42, 0.04, 0, 0, -0.02), std(0xe2dcc6, 0.6)));
  const g1 = gauge(0.055, dialTex('ТМ', { max: 10, step: 0.5, major: 2 }), std(0x333333, 0.4, 0.5)); g1.position.set(0, 0.1, 0.004); post.add(g1);
  const g2 = gauge(0.055, dialTex('НМ', { max: 10, step: 0.5, major: 2 }), std(0x333333, 0.4, 0.5)); g2.position.set(0, -0.1, 0.004); g2.userData.set(0.8); post.add(g2);
  post.position.set(-1.18, 2.45, 0.32); post.rotation.y = 0.9;
  grp.add(post);
  // телефон связи
  grp.add(new THREE.Mesh(mergeGeoms([boxGeom(0.22, 0.06, 0.16, 0.75, deskY - 0.05, 0.62), boxGeom(0.05, 0.05, 0.2, 0.7, deskY, 0.62)]), dark));
  seat(grp, -0.5, 1.85, new THREE.MeshStandardMaterial({ map: fabricTex('#6a1010', '#c4282b'), roughness: 0.9 }), std(0x3a3e42, 0.4, 0.5));
  return {
    ctrl, keep: [ctrl, segM, bm, m1.g, m2.g, post],
    update(s) {
      let x = seg.image.getContext('2d');
      x.fillStyle = '#100404'; x.fillRect(0, 0, 512, 160);
      x.fillStyle = '#ff2a1a'; x.textBaseline = 'middle';
      const dm = s.dist != null ? Math.max(0, Math.round(s.dist)) : null;
      x.font = '700 104px "Courier New",monospace'; x.textAlign = 'right';
      x.fillText(dm != null ? String(dm) : '----', 400, 86);
      x.font = '700 46px "Courier New",monospace'; x.textAlign = 'left'; x.fillText('м', 412, 104);
      x.font = '700 24px Arial'; x.fillStyle = '#9a2a1a'; x.textAlign = 'left'; x.fillText('ДО ОСТАНОВКИ', 14, 22);
      seg.needsUpdate = true;
      x = bup.image.getContext('2d');
      x.fillStyle = '#0b1a0b'; x.fillRect(0, 0, 384, 192);
      x.fillStyle = '#7dff5a'; x.font = '700 26px "Courier New",monospace'; x.textAlign = 'left';
      x.fillText(`АРС ${String(s.limit).padStart(2, ' ')}  ${s.doorsClosed ? 'ДВ ЗАКР' : 'ДВ ОТКР'}`, 12, 40);
      const nmT = (s.next || '').toUpperCase(); x.fillText(nmT.length > 17 ? nmT.slice(0, 16) + '.' : nmT, 12, 90);
      x.fillText(s.dist != null ? `ДО ОСТ ${Math.max(0, Math.round(s.dist))} М` : '', 12, 135);
      x.fillText(s.time || '', 12, 178);
      bup.needsUpdate = true;
      for (const m of [m1, m2]) {
        x = m.t.image.getContext('2d');
        const g = x.createLinearGradient(0, 0, 0, 190); g.addColorStop(0, '#3a4046'); g.addColorStop(1, '#1a1d20');
        x.fillStyle = g; x.fillRect(0, 0, 256, 190);
        x.strokeStyle = 'rgba(230,235,240,0.3)'; x.lineWidth = 2;
        for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(128 + i * 8, 60); x.lineTo(128 + i * 60, 190); x.stroke(); }
        m.t.needsUpdate = true;
      }
      g1.userData.set(0.5 + s.brake * 0.25);
    },
  };
}

const PRESETS = {
  '717': { eyeZ: 1.12, wall: 0xc3cbce, trim: 0x9aa4a8, ceil: 0xe2e4e2, floor: 0x37393b, door: 0xb9c1c4, front: 0x30353a, eyeX: -0.5, doorX: 0.55, sideWin: { y0: 1.95, y1: 2.9 }, ws: { y0: 1.98, y1: 2.98, pillars: [-0.83, 0.83] } },
  '775': { wall: 0xe3e5e6, trim: 0xb9bec2, ceil: 0xf0f1f1, floor: 0x3b3e41, door: 0xd2d6d9, front: 0x24272a, eyeX: 0, doorX: 0.7, sideWin: { y0: 1.75, y1: 3.0 }, ws: { y0: 1.62, y1: 3.15, pillars: [] } },
  '740': { wall: 0xdccfa9, trim: 0xb9ad8a, ceil: 0xebe4cf, floor: 0x3e4f4a, door: 0xd8cca8, front: 0x3a3d40, eyeX: -0.5, doorX: 0.55, sideWin: { y0: 1.95, y1: 2.9 }, ws: { y0: 1.85, y1: 2.98, pillars: [] } },
};

export function buildCab(type) {
  const grp = new THREE.Group();
  const P = PRESETS[type] || PRESETS['717'];
  const { wiper } = shell(grp, type, P);
  const inner = type === '775' ? cab775(grp, P) : type === '740' ? cab740(grp, P) : cab717(grp, P);
  bakeStatic(grp, [...inner.keep, wiper]);
  return {
    group: grp, ctrl: inner.ctrl, wiper, type, isNew: type !== '717', update: inner.update,
    eye: new THREE.Vector3(P.eyeX, FLOOR_Y + 1.32, P.eyeZ ?? 1.6),
  };
}

export function drawPanel(cab, s) { if (cab.update) cab.update(s); }
