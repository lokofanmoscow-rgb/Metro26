// Генерация станции по описанию оформления (см. data/lines.js).
// Локальная система станции: начало — центр платформы на оси нашего пути, уровень головки рельса;
// вперёд по ходу = -Z, вправо = +X. Платформа островная — слева от поезда.
import * as THREE from 'three';
import { wallTexture, floorTexture, ceilingTexture, columnTexture, pylonTexture, nameTexture, signTexture, glowTexture, concreteTexture } from './textures.js';
import { sharedMats, TUBE_R, TUBE_CY, BED_Y, BOX_W, BOX_TOP } from './tunnel.js';
import { mergeGeoms, boxGeom, cylGeom, shade, mulberry32, hashStr, makeCanvas, canvasTex } from './util.js';
import { HALL_HALF, STOP_OFFSET } from './route.js';
import { GROUND_Y } from './osm.js';
import { HQ, HQ_BUILDERS, pbr, recolor, imgTex, lampMat } from './hq.js';
import { buildBKL, buildBKLPylon } from './bkl.js';

export const EDGE_X = -1.48;
export const PLAT_Y = 1.1;
const PL = 81; // половина длины платформы
const HZ = HALL_HALF;

function mat(map, k = 0.5, extra = {}) {
  return new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: new THREE.Color(k, k, k), ...extra });
}

function scaleUV(g, su, sv) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

// вертикальная стена в плоскости x = const; facing = +1 (смотрит в +X) или -1
function wallX(x, y0, y1, z0, z1, facing, uLen = 4) {
  const g = new THREE.PlaneGeometry(z1 - z0, y1 - y0);
  scaleUV(g, (z1 - z0) / uLen, 1);
  g.rotateY(facing > 0 ? Math.PI / 2 : -Math.PI / 2);
  g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

function planeY(y, x0, x1, z0, z1, up = true, uLen = 4, vLen = 4) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
  scaleUV(g, (x1 - x0) / uLen, (z1 - z0) / vLen);
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return g;
}

// протяжка профиля вдоль Z (прямой участок)
function profileZ(profile, z0, z1, uScale = 4, vScale = 4) {
  const m = profile.length;
  const pos = [], uv = [], idx = [];
  let ul = 0;
  for (let j = 0; j < m; j++) {
    if (j) ul += Math.hypot(profile[j].x - profile[j - 1].x, profile[j].y - profile[j - 1].y);
    for (const z of [z0, z1]) { pos.push(profile[j].x, profile[j].y, z); uv.push(ul / uScale, z / vScale); }
  }
  for (let j = 0; j < m - 1; j++) { const a = j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function arc(cx, cy, rx, ry, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); }
  return pts;
}

// стенка-торец с проёмами тоннелей
function endWall(z, x0, x1, y0, y1, holes, deep, facing, rects = []) {
  // контур стены обязательно охватывает проёмы с запасом — иначе триангуляция
  // ломается и проём тоннеля оказывается заложен сплошной стеной
  const hw = deep ? TUBE_R : BOX_W;
  x0 = Math.min(x0, Math.min(...holes) - hw - 0.4);
  x1 = Math.max(x1, Math.max(...holes) + hw + 0.4);
  y0 = Math.min(y0, TUBE_CY - TUBE_R - 0.6);
  y1 = Math.max(y1, (deep ? TUBE_CY + TUBE_R : BOX_TOP) + 0.4);
  const sh = new THREE.Shape();
  sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.lineTo(x0, y0);
  // проёмы соседних путей, которые перекрываются (пути ближе ширины тоннеля), — один общий проём:
  // перекрывающиеся отверстия ломают триангуляцию, и стена перегораживает путь
  const groups = [];
  for (const h of [...holes].sort((p, q) => p - q)) {
    const g = groups[groups.length - 1];
    if (g && h - g[1] < 2 * hw + 0.1) g[1] = h; else groups.push([h, h]);
  }
  for (const [ha, hb] of groups) {
    const p = new THREE.Path();
    if (deep && ha === hb) p.absarc(ha, TUBE_CY, TUBE_R, 0, Math.PI * 2, true);
    else if (deep) {
      p.moveTo(ha, TUBE_CY - TUBE_R); p.lineTo(hb, TUBE_CY - TUBE_R);
      p.absarc(hb, TUBE_CY, TUBE_R, -Math.PI / 2, Math.PI / 2, false);
      p.lineTo(ha, TUBE_CY + TUBE_R);
      p.absarc(ha, TUBE_CY, TUBE_R, Math.PI / 2, Math.PI * 1.5, false);
    } else { p.moveTo(ha - BOX_W, BED_Y - 0.5); p.lineTo(ha - BOX_W, BOX_TOP); p.lineTo(hb + BOX_W, BOX_TOP); p.lineTo(hb + BOX_W, BED_Y - 0.5); p.lineTo(ha - BOX_W, BED_Y - 0.5); }
    sh.holes.push(p);
  }
  for (const [xa, xb, ya, yb] of rects) {
    const p = new THREE.Path();
    p.moveTo(xa, ya); p.lineTo(xb, ya); p.lineTo(xb, yb); p.lineTo(xa, yb); p.lineTo(xa, ya);
    sh.holes.push(p);
  }
  const g = new THREE.ShapeGeometry(sh, 24);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
  void facing;
  g.translate(0, 0, z);
  return g;
}

function straightTrack(grp, x, z0, z1, third = 0) {
  const m = sharedMats();
  const L = z1 - z0, zc = (z0 + z1) / 2;
  const rails = [];
  for (const rx of [-0.762, 0.762]) {
    rails.push(boxGeom(0.07, 0.16, L, x + rx, -0.08, zc));
  }
  grp.add(new THREE.Mesh(mergeGeoms(rails), m.rail));
  const tops = [];
  for (const rx of [-0.762, 0.762]) tops.push(planeY(0.002, x + rx - 0.036, x + rx + 0.036, z0, z1));
  grp.add(new THREE.Mesh(mergeGeoms(tops), m.railTop));
  const n = Math.floor(L / 0.75);
  const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 0.13, 0.24), m.sleeper, n);
  const mm = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { mm.makeTranslation(x, -0.22, z0 + 0.4 + i * 0.75); sl.setMatrixAt(i, mm); }
  grp.add(sl);
  // контактный рельс — со стороны стены
  const sgn = third || (x < -5 ? -1 : 1);
  grp.add(new THREE.Mesh(boxGeom(0.1, 0.11, L, x + sgn * 1.52, 0.115, zc), m.third));
  grp.add(new THREE.Mesh(boxGeom(0.32, 0.03, L, x + sgn * 1.56, 0.27, zc), m.cover));
}

// Часы-интервальник над тоннелем
export function makeClock() {
  const c = makeCanvas(352, 64);
  const tex = canvasTex(c, { mip: false });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.userData.text = true;
  const ctx = c.getContext('2d');
  let last = '';
  const draw = (time, interval) => {
    const p = (n) => String(Math.floor(n)).padStart(2, '0');
    const t = `${p(time / 3600 % 24)}:${p(time / 60 % 60)}:${p(time % 60)}`;
    const iv = `${p(interval / 60 % 100)}:${p(interval % 60)}`;
    const key = t + iv;
    if (key === last) return;
    last = key;
    ctx.fillStyle = '#0b0b0b'; ctx.fillRect(0, 0, 352, 64);
    ctx.font = '700 32px "Courier New",monospace'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff3b1f'; ctx.textAlign = 'left'; ctx.fillText(t, 10, 33);
    ctx.fillStyle = '#ffb21f'; ctx.textAlign = 'right'; ctx.fillText(iv, 342, 33);
    tex.needsUpdate = true;
  };
  draw(0, 0);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.4), new THREE.MeshBasicMaterial({ map: tex }));
  return { mesh, draw, tex };
}

function buildColumns(style, positions, H, y0) {
  const tex = columnTexture(style);
  const m = mat(tex, 0.45);
  let g;
  const sh = style.csh || 'sq';
  if (sh === 'rnd') g = cylGeom(0.36, 0.36, H, 20, 0, H / 2, 0);
  else if (sh === 'fac') g = cylGeom(0.4, 0.4, H, 8, 0, H / 2, 0);
  else if (sh === 'flare') {
    g = mergeGeoms([cylGeom(0.34, 0.34, H - 1.1, 10, 0, (H - 1.1) / 2, 0), cylGeom(1.25, 0.34, 1.1, 10, 0, H - 0.55, 0, 0, 0, 0, true)]);
  } else if (sh === 'frame') g = boxGeom(0.7, H, 0.7, 0, H / 2, 0);
  else g = boxGeom(0.62, H, 0.62, 0, H / 2, 0);
  const inst = new THREE.InstancedMesh(g, m, positions.length);
  const mm = new THREE.Matrix4();
  positions.forEach((p, i) => { mm.makeTranslation(p.x, y0, p.z); inst.setMatrixAt(i, mm); });
  inst.computeBoundingSphere();
  return inst;
}

function buildTrees(positions, y0, H, color) {
  // «деревья» Тропарёва: ствол и ветви из блестящего металла
  const parts = [cylGeom(0.12, 0.2, H * 0.55, 8, 0, H * 0.275, 0)];
  const rng = mulberry32(5);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, tilt = 0.5 + rng() * 0.4, len = H * 0.55;
    const g = cylGeom(0.03, 0.08, len, 6, 0, len / 2, 0);
    g.applyMatrix4(new THREE.Matrix4().makeRotationZ(tilt));
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(a));
    g.translate(0, H * 0.5, 0);
    parts.push(g);
  }
  const m = new THREE.MeshLambertMaterial({ color, emissive: new THREE.Color(color).multiplyScalar(0.35) });
  const inst = new THREE.InstancedMesh(mergeGeoms(parts), m, positions.length);
  const mm = new THREE.Matrix4();
  positions.forEach((p, i) => { mm.makeTranslation(p.x, y0, p.z); inst.setMatrixAt(i, mm); });
  inst.computeBoundingSphere();
  return inst;
}

function lampsMesh(geom, positions, color = 0xfff4dc) {
  const inst = new THREE.InstancedMesh(geom, new THREE.MeshBasicMaterial({ color }), positions.length);
  const mm = new THREE.Matrix4();
  positions.forEach((p, i) => { mm.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(i, mm); });
  inst.computeBoundingSphere();
  return inst;
}

function chandelier() {
  const parts = [cylGeom(0.03, 0.03, 1.2, 6, 0, 0.6, 0), cylGeom(0.5, 0.2, 0.35, 12, 0, 0, 0)];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    parts.push(cylGeom(0.08, 0.12, 0.25, 8, Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55));
  }
  return mergeGeoms(parts);
}

function nameBoards(grp, style, x, facing, y, zs, scale = 1) {
  const tex = nameTexture(style.n, style.nm === 'metal' ? 'metal' : 'plate');
  const h = (style.nm === 'metal' ? 0.6 : 0.5) * scale;
  const w = h * tex.userData.aspect;
  const m = new THREE.MeshLambertMaterial({ map: tex, transparent: !!tex.userData.transparent, emissiveMap: tex, emissive: new THREE.Color(0.55, 0.55, 0.55), depthWrite: !tex.userData.transparent });
  const gs = zs.map((z) => {
    const g = new THREE.PlaneGeometry(w, h);
    g.rotateY(facing > 0 ? Math.PI / 2 : -Math.PI / 2);
    g.translate(x + facing * 0.03, y, z);
    return g;
  });
  grp.add(new THREE.Mesh(mergeGeoms(gs), m));
}

// Станция строится по частям (генератор): поток подгрузки продолжает постройку в следующих
// кадрах, чтобы тяжёлая станция не останавливала игру на десятки и сотни миллисекунд.
export function buildStation(route, st, line) {
  const g = buildStationSteps(route, st, line);
  let r;
  do { r = g.next(); } while (!r.done);
  return r.value;
}

// островная раскладка из LAYOUTS: одна платформа у нашего пути и путь за ней (возможно справа)
function islandOf(L) {
  if (!L || !L.tr) return null;
  if (L.tr.length !== 2 || !L.pl || L.pl.length !== 1) return null;
  const [p0, p1] = L.pl[0], other = L.tr.find((t) => t[1] !== 'me');
  if (Math.abs(p1 + 1.48) < 0.05 && Math.abs(other[0] - (p0 - 1.48)) < 0.3) return { mirror: false, W: p1 - p0, other };
  if (Math.abs(p0 - 1.48) < 0.05 && Math.abs(other[0] - (p1 + 1.48)) < 0.3) return { mirror: true, W: p1 - p0, other };
  return null;
}

// текст на табличках, часах и указателях при зеркальной сборке: развернуть по горизонтали
function unmirrorText(grp) {
  grp.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const mt = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mt || !mt.map || !mt.map.userData.text) return;
    const uv = o.geometry.attributes.uv;
    if (!uv || o.geometry.userData.unmirrored) return;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    uv.needsUpdate = true;
    o.geometry.userData.unmirrored = true;
  });
}

// поставить группу станции в точку трассы; mirror — собрана в отражённой системе (наша платформа слева)
function placeStation(grp, route, st, mirror) {
  if (mirror) {
    unmirrorText(grp);
    grp.scale.x = -1;
    grp.updateMatrix();
    grp.matrix.premultiply(route.matrixAt(st.c, new THREE.Matrix4(), true));
    grp.matrix.decompose(grp.position, grp.quaternion, grp.scale);
  } else grp.applyMatrix4(route.matrixAt(st.c, new THREE.Matrix4(), true));
  grp.updateMatrixWorld(true);
}

export function* buildStationSteps(route, st, line) {
  if (st.style.t === 'side') { yield; return buildSideStation(route, st, line); }
  const LAY = st.lay;
  const ISL = islandOf(LAY);
  if (LAY && LAY.tr && !ISL) return yield* buildMultiSteps(route, st, line, LAY);
  const style = st.style;
  const grp = new THREE.Group();
  grp.name = 'station:' + st.name;
  const rng = mulberry32(hashStr(st.name));
  const t = style.t;
  const deep = !!style.deep;
  const info = { spots: [], exits: [], lights: [], signal: null, clock: null, oppX: 0 };
  // детальная модель станции по фотографиям (если есть и текстуры загружены)
  const BK = st.bkl && HQ.ready && HQ.renderer ? st.bkl : null;
  const hq = BK ? 'bkl' : style.hq && HQ.ready && HQ.renderer ? HQ_BUILDERS[style.hq] : null;
  info.hq = !!hq;

  // геометрия поперечника по типу
  let W = 10; // ширина платформы
  if (t === 'pylon' || t === 'cold') W = 19;
  if (t === 'bridge') W = 14;
  if (st.W) W = st.W;
  if (LAY && LAY.W) W = LAY.W;
  if (ISL) W = ISL.W;
  const mirror = !!(ISL && ISL.mirror);
  const glassSide = LAY && LAY.glass ? (LAY.glass === 'R') !== mirror ? 'R' : 'L' : null; // в системе сборки
  const xFar = EDGE_X - W; // дальний край платформы
  const oppX = xFar - 1.48; // ось встречного пути
  info.oppX = oppX;
  const ch = style.ch || (t === 'span' ? 4.8 : 4.2);
  const yC = PLAT_Y + ch;
  const rightWall = t === 'pylon' || t === 'cold' ? 2.3 : 2.25;
  const leftWall = oppX - (rightWall);

  const wallH = (t === 'pylon' || t === 'cold') ? 4.2 - (BED_Y - 0.4) : (t === 'vault' ? 3.4 - (BED_Y - 0.4) : yC - (BED_Y - 0.4));
  yield;
  const wTex = wallTexture(style, Math.round(wallH * 10) / 10, 2.1);
  yield;
  const wallMat = style.wp === 'glass'
    ? new THREE.MeshLambertMaterial({ color: style.w, transparent: true, opacity: 0.28, emissive: 0x223333, side: THREE.DoubleSide, depthWrite: false })
    : mat(wTex, 0.5);
  const floorMat = mat(floorTexture(style), 0.45);
  yield;
  const ceilMat = mat(ceilingTexture(style), 0.55, { side: THREE.DoubleSide });
  yield;
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2826 });
  const edgeMat = new THREE.MeshLambertMaterial({ color: 0xd8d6cf, emissive: 0x3a3a38 });

  yield; // постройка по частям: следующий кусок — в следующем кадре
  // пути
  straightTrack(grp, 0, -HZ, HZ);
  straightTrack(grp, oppX, -HZ, HZ);
  // лотки путей
  const pitMat = new THREE.MeshLambertMaterial({ color: 0x34312d });
  grp.add(new THREE.Mesh(mergeGeoms([planeY(BED_Y, EDGE_X, rightWall, -HZ, HZ), planeY(BED_Y, leftWall, xFar, -HZ, HZ)]), pitMat));

  // платформа
  if (!hq) grp.add(new THREE.Mesh(planeY(PLAT_Y, xFar, EDGE_X, -PL, PL), floorMat));
  const edgeG = [planeY(PLAT_Y + 0.003, EDGE_X - 0.35, EDGE_X, -PL, PL, true, 1, 1), planeY(PLAT_Y + 0.003, xFar, xFar + 0.35, -PL, PL, true, 1, 1)];
  grp.add(new THREE.Mesh(mergeGeoms(edgeG), edgeMat));
  grp.add(new THREE.Mesh(mergeGeoms([
    wallX(EDGE_X, BED_Y, PLAT_Y, -PL, PL, 1), wallX(xFar, BED_Y, PLAT_Y, -PL, PL, -1),
    endWallBox(xFar, EDGE_X, BED_Y, PLAT_Y, -PL), endWallBox(xFar, EDGE_X, BED_Y, PLAT_Y, PL),
  ]), darkMat));
  // тактильная полоса на новых станциях
  if (style.y >= 2010) grp.add(new THREE.Mesh(mergeGeoms([planeY(PLAT_Y + 0.005, EDGE_X - 0.95, EDGE_X - 0.6, -PL, PL, true, 1, 1), planeY(PLAT_Y + 0.005, xFar + 0.6, xFar + 0.95, -PL, PL, true, 1, 1)]), new THREE.MeshLambertMaterial({ color: 0xe8c22a, emissive: 0x3a3008 })));

  yield; // постройка по частям: следующий кусок — в следующем кадре
  // путевые стены
  if (t !== 'ground' && t !== 'bridge' && !hq) {
    const top = (t === 'pylon' || t === 'cold') ? 4.2 : t === 'vault' ? 3.4 : yC;
    const walls = [];
    if (glassSide !== 'R') walls.push(wallX(rightWall, BED_Y - 0.4, top, -HZ, HZ, -1));
    if (glassSide !== 'L') walls.push(wallX(leftWall, BED_Y - 0.4, top, -HZ, HZ, 1));
    grp.add(new THREE.Mesh(mergeGeoms(walls), wallMat));
    if (glassSide) buildPanorama(grp, glassSide === 'R' ? rightWall : leftWall, glassSide === 'R' ? 1 : -1, top, style);
  }

  const colRows = [];
  const lampsP = [];
  const lampGeom = { strip: new THREE.BoxGeometry(0.25, 0.05, 2.6), ball: new THREE.SphereGeometry(0.28, 12, 8), led: new THREE.BoxGeometry(0.12, 0.04, 6) };

  yield; // постройка по частям: следующий кусок — в следующем кадре
  if (BK && BK.type === 'pylon') yield* buildBKLPylon(grp, { PLAT_Y, EDGE_X, xFar, oppX, rightWall, leftWall, PL, HZ, BED_Y, info, style, name: st.name, title: style.n }, BK);
  else if (BK) yield* buildBKL(grp, { PLs: [[xFar, EDGE_X]], TR: [0, oppX], xMin: leftWall, xMax: rightWall, PL, HZ, PLAT_Y, BED_Y, info, name: st.name, title: style.n, our: [xFar, EDGE_X], spots: true }, BK);
  else if (hq) hq(grp, { PLAT_Y, EDGE_X, xFar, oppX, rightWall, leftWall, PL, HZ, BED_Y, info, style, yC });
  yield;
  if (st.elev) {
    // станция на эстакаде: плита под путями и платформой, ригели и стойки до земли
    const gl = GROUND_Y - route.y(st.c);
    const x0 = leftWall - 0.6, x1 = rightWall + 0.6, xc = (x0 + x1) / 2;
    const concM = new THREE.MeshLambertMaterial({ map: concreteTexture('#a8a49a'), color: 0xd0d0cc });
    const sub = [boxGeom(x1 - x0, 1.0, 2 * HZ, xc, BED_Y - 0.55, 0), boxGeom(0.3, 1.3, 2 * HZ, x0 + 0.15, BED_Y + 0.2, 0), boxGeom(0.3, 1.3, 2 * HZ, x1 - 0.15, BED_Y + 0.2, 0)];
    for (let z = -HZ + 8; z <= HZ - 8; z += 22) {
      sub.push(boxGeom(x1 - x0 - 1, 1.2, 1.8, xc, BED_Y - 1.65, z));
      for (const x of [x0 + (x1 - x0) * 0.25, x0 + (x1 - x0) * 0.75]) sub.push(cylGeom(0.7, 0.8, BED_Y - 2.2 - gl, 14, x, (BED_Y - 2.2 + gl) / 2, z));
    }
    grp.add(new THREE.Mesh(mergeGeoms(sub), concM));
  }

  if (!hq && (t === 'col' || t === 'span' || t === 'ground' || t === 'bridge')) {
    // потолок
    if (t === 'ground' || t === 'bridge') {
      buildShed(grp, style, rightWall, leftWall, yC, t);
    } else {
      grp.add(new THREE.Mesh(planeY(yC, leftWall, rightWall, -HZ, HZ, false), ceilMat));
    }
    // колонны
    if (t === 'col') {
      const cs = style.cs || 6;
      const xr = [EDGE_X - 2.15, xFar + 2.15];
      const pos = [];
      for (let z = -PL + cs * 0.75; z < PL - cs * 0.5; z += cs) for (const x of xr) pos.push({ x, z });
      grp.add(buildColumns(style, pos, ch, PLAT_Y));
      colRows.push(...xr);
      // ригели
      const beam = new THREE.MeshLambertMaterial({ color: shade(style.ce || '#e8e8e4', -0.08), emissive: new THREE.Color(style.ce || '#e8e8e4').multiplyScalar(0.4) });
      grp.add(new THREE.Mesh(mergeGeoms(xr.map((x) => boxGeom(0.7, 0.45, 2 * HZ, x, yC - 0.22, 0))), beam));
      if (style.csh === 'flare') {
        // свет из капителей
        const glow = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0c8 });
        const gg = pos.map((p) => planeY(yC - 0.02, p.x - 1.6, p.x + 1.6, p.z - 1.6, p.z + 1.6, false, 3.2, 3.2));
        const gm = mergeGeoms(gg); const uv = gm.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) - Math.floor(uv.getX(i)), uv.getY(i) - Math.floor(uv.getY(i)));
        grp.add(new THREE.Mesh(gm, glow));
      }
      for (let i = 0; i < pos.length; i += 6) info.spots.push({ x: (xr[0] + xr[1]) / 2, z: pos[i].z });
    }
    // светильники
    const lz = [];
    for (let z = -PL + 4; z < PL; z += (style.l === 'led' ? 7 : 4)) lz.push(z);
    const xm = (EDGE_X + xFar) / 2;
    if (style.l === 'strip' || style.l === 'led' || style.l === 'niche' || style.l === 'capital') {
      const xs = t === 'col' ? [xm - 1.2, xm + 1.2, EDGE_X + 1.6, xFar - 1.6, EDGE_X - 1.1, xFar + 1.1] : [xm - 2, xm + 2, EDGE_X + 1.6, xFar - 1.6, EDGE_X - 2.5];
      const g = style.l === 'led' ? lampGeom.led : lampGeom.strip;
      for (const z of lz) for (const x of xs) lampsP.push({ x, y: (t === 'ground' || t === 'bridge') ? yC - 0.6 : yC - 0.03, z });
      grp.add(lampsMesh(g, lampsP));
    } else if (style.l === 'ball' || style.l === 'chand') {
      const pts = [];
      for (let z = -PL + 6; z < PL; z += 8) pts.push({ x: xm, y: yC - 1.1, z });
      if (style.l === 'ball') {
        grp.add(lampsMesh(lampGeom.ball, pts));
        grp.add(lampsMesh(lampGeom.strip, lz.map((z) => ({ x: EDGE_X + 1.2, y: yC - 0.03, z })).concat(lz.map((z) => ({ x: EDGE_X - 1.2, y: yC - 0.03, z })))));
      } else {
        const cg = chandelier();
        const inst = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ color: 0xffeec4 }), pts.length);
        const mm = new THREE.Matrix4(); pts.forEach((p, i) => { mm.makeTranslation(p.x, p.y + 0.3, p.z); inst.setMatrixAt(i, mm); });
        grp.add(inst);
        grp.add(lampsMesh(lampGeom.strip, lz.map((z) => ({ x: EDGE_X + 1.2, y: yC - 0.03, z }))));
      }
    }
    // скамейки
    const bench = [];
    for (let z = -PL + 14; z < PL - 10; z += 18) bench.push(boxGeom(0.5, 0.45, 2.4, xm, PLAT_Y + 0.22, z));
    grp.add(new THREE.Mesh(mergeGeoms(bench), new THREE.MeshLambertMaterial({ color: style.n === 'Румянцево' ? 0xd42a2a : 0x6a4a2e, emissive: 0x1a120a })));
    if (t !== 'col') for (let z = -PL + 10; z < PL; z += 16) info.spots.push({ x: xm, z });
  }

  yield; // постройка по частям: следующий кусок — в следующем кадре
  if (!hq && (t === 'pylon' || t === 'cold')) {
    // боковые залы — своды
    const xPy0 = -4.3, xPy1 = -7.0; // пилоны со стороны нашего пути
    const xc = (rightWall + xPy0) / 2, rS = (rightWall - xPy0) / 2;
    const vaultR = arc(xc, 4.2, rS, rS * 0.85, 0, Math.PI, 20);
    const xPy2 = xFar + 2.7, xPy3 = xFar + 5.4;
    const xc2 = (leftWall + xPy2) / 2; const rS2 = (xPy2 - leftWall) / 2;
    const vaultL = arc(xc2, 4.2, rS2, rS2 * 0.85, 0, Math.PI, 20);
    const cx = (xPy1 + xPy3) / 2, cr = (xPy1 - xPy3) / 2;
    const vaultC = arc(cx, 4.5, cr, cr * 0.9, 0, Math.PI, 24);
    grp.add(new THREE.Mesh(mergeGeoms([profileZ(vaultR, -HZ, HZ), profileZ(vaultL, -HZ, HZ), profileZ(vaultC, -PL, PL)]), ceilMat));
    // ряды пилонов с арочными проходами
    const cs = style.cs || 9;
    const pass = t === 'cold' ? cs - 1.1 : Math.min(3.2, cs * 0.36);
    const pTex = pylonTexture(style);
    const pMat = mat(pTex, 0.45);
    for (const [xa, xb] of [[xPy1, xPy0], [xPy2, xPy3]]) {
      const sh = new THREE.Shape();
      sh.moveTo(-PL, PLAT_Y); sh.lineTo(PL, PLAT_Y); sh.lineTo(PL, 7.2); sh.lineTo(-PL, 7.2); sh.lineTo(-PL, PLAT_Y);
      const hTop = t === 'cold' ? 3.5 : 3.3;
      for (let z = -PL + cs; z < PL - cs * 0.4; z += cs) {
        const h = new THREE.Path();
        const a = z - pass / 2, b = z + pass / 2;
        h.moveTo(a, PLAT_Y); h.lineTo(b, PLAT_Y); h.lineTo(b, PLAT_Y + hTop - pass / 2);
        h.absarc(z, PLAT_Y + hTop - pass / 2, pass / 2, 0, Math.PI, false);
        h.lineTo(a, PLAT_Y);
        sh.holes.push(h);
        info.spots.push({ x: (xa + xb) / 2 + (xa > -10 ? 2.2 : -2.2), z: z + cs / 2 });
      }
      const g = new THREE.ExtrudeGeometry(sh, { depth: xb - xa, bevelEnabled: false, curveSegments: 7 });
      // экструзия идёт вдоль +Z фигуры; поворачиваем: фигура (z,y) -> мир (x)
      g.rotateY(-Math.PI / 2);
      g.translate(xb, 0, 0);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
      grp.add(new THREE.Mesh(g, pMat));
      if (style.l === 'cornice' || style.l === 'capital') {
        const glow = [boxGeom(0.06, 0.1, 2 * PL, xb + 0.03, 4.05, 0), boxGeom(0.06, 0.1, 2 * PL, xa - 0.03, 4.25, 0)];
        grp.add(new THREE.Mesh(mergeGeoms(glow), new THREE.MeshBasicMaterial({ color: 0xfff2d2 })));
      }
    }
    // пол центрального зала уже покрыт платформой; люстры/светильники
    const pts = [];
    for (let z = -PL + cs / 2; z < PL; z += cs) pts.push({ x: cx, y: 7.2, z });
    if (style.l === 'chand' || style.l === 'ball') {
      const inst = new THREE.InstancedMesh(style.l === 'chand' ? chandelier() : new THREE.SphereGeometry(0.35, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffeec4 }), pts.length);
      const mm = new THREE.Matrix4(); pts.forEach((p, i) => { mm.makeTranslation(p.x, style.l === 'chand' ? 6.4 : 6.8, p.z); inst.setMatrixAt(i, mm); });
      grp.add(inst);
    } else {
      grp.add(lampsMesh(lampGeom.strip, pts.map((p) => ({ x: p.x, y: 8.4, z: p.z }))));
    }
    // светильники боковых залов
    const side = [];
    for (let z = -PL + 3; z < PL; z += 6) side.push({ x: xc, y: 4.2 + rS * 0.85 - 0.08, z }, { x: xc2, y: 4.2 + rS2 * 0.85 - 0.08, z });
    grp.add(lampsMesh(lampGeom.strip, side));
    lampsP.push(...side);
    for (let z = -PL + 8; z < PL; z += 12) info.spots.push({ x: cx + (rng() - 0.5) * 4, z });
    // скамейки у пилонов в центральном зале
    const bench = [];
    for (let z = -PL + cs; z < PL - cs * 0.4; z += cs) bench.push(boxGeom(0.5, 0.45, 2.4, xPy1 - 0.4, PLAT_Y + 0.22, z + cs / 2), boxGeom(0.5, 0.45, 2.4, xPy3 + 0.4, PLAT_Y + 0.22, z + cs / 2));
    grp.add(new THREE.Mesh(mergeGeoms(bench), new THREE.MeshLambertMaterial({ color: 0x5a3d28 })));
  }

  yield; // постройка по частям: следующий кусок — в следующем кадре
  if (!hq && t === 'vault') {
    const xc = (rightWall + leftWall) / 2, rx = (rightWall - leftWall) / 2;
    const v = arc(xc, 3.4, rx, 4.6, 0, Math.PI, 36);
    grp.add(new THREE.Mesh(profileZ(v, -HZ, HZ, 4, 4), ceilMat));
    // светильники в нишах/пазах свода
    const pts = [];
    for (let z = -PL + 3; z < PL; z += 6) for (const a of [0.55, 1.1, Math.PI - 1.1, Math.PI - 0.55]) pts.push({ x: xc + Math.cos(a) * rx * 0.985, y: 3.4 + Math.sin(a) * 4.6 * 0.985, z });
    grp.add(lampsMesh(lampGeom.strip, pts));
    lampsP.push(...pts);
    if (style.l === 'ball') grp.add(lampsMesh(lampGeom.ball, (() => { const a = []; for (let z = -PL + 6; z < PL; z += 9) a.push({ x: xc, y: 6.6, z }); return a; })()));
    if (style.csh === 'tree') {
      const pos = [];
      for (let z = -PL + 10; z < PL - 5; z += 13) pos.push({ x: xc, z });
      grp.add(buildTrees(pos, PLAT_Y, 6.4, style.c));
    }
    const bench = [];
    for (let z = -PL + 16; z < PL - 10; z += 13) bench.push(boxGeom(0.5, 0.45, 2.4, xc + 1.6, PLAT_Y + 0.22, z));
    grp.add(new THREE.Mesh(mergeGeoms(bench), new THREE.MeshLambertMaterial({ color: 0x6a4a2e })));
    for (let z = -PL + 10; z < PL; z += 14) info.spots.push({ x: xc, z });
  }

  yield; // постройка по частям: следующий кусок — в следующем кадре
  // торцевые стены с проёмами тоннелей
  if (t !== 'ground' && t !== 'bridge') {
    const topY = Math.max((t === 'pylon' || t === 'cold') ? 9.5 : t === 'vault' ? 8.2 : yC, hq && info.ceilY ? info.ceilY + 0.3 : 0);
    const endMat = mat(concreteTexture('#d4d2cc'), 0.4, { side: THREE.DoubleSide }); // общая текстура, цвет станции — через color
    endMat.color = new THREE.Color(style.wp === 'glass' ? '#cccccc' : style.w);
    const xm = (EDGE_X + xFar) / 2;
    // выход: марш лестницы к проёму в торце платформы, коридор и наклонный ход в вестибюль
    const rise = Math.max(1.2, Math.min(2.04, topY - PLAT_Y - 2.6));
    const LH = PLAT_Y + rise; // уровень площадки и коридора
    const CH = 2.5; // высота коридора
    const hw = 2.1; // полуширина прохода
    const rect = [[xm - hw, xm + hw, LH, LH + CH]];
    const ewx = BK && BK.tube ? 1.6 : 0; // круглый тоннель в тюбингах шире путевых стен
    grp.add(new THREE.Mesh(mergeGeoms([
      endWall(-HZ, leftWall - ewx, rightWall + ewx, BED_Y - 0.4, topY, [0, oppX], deep, 1, rect),
      endWall(HZ, leftWall - ewx, rightWall + ewx, BED_Y - 0.4, topY, [0, oppX], deep, -1, rect),
    ]), endMat));
    // торцы платформы с проёмом выхода
    const ew = mat(wTex, 0.45, { side: THREE.DoubleSide });
    grp.add(new THREE.Mesh(mergeGeoms([wallZHole(xFar, EDGE_X, BED_Y - 0.4, topY, -PL, rect[0]), wallZHole(xFar, EDGE_X, BED_Y - 0.4, topY, PL, rect[0])]), ew));
    // закрываем «карман» между концом платформы и торцевой стеной зала
    grp.add(new THREE.Mesh(mergeGeoms([
      wallX(EDGE_X, BED_Y - 0.4, topY, -HZ, -PL, 1), wallX(EDGE_X, BED_Y - 0.4, topY, PL, HZ, 1),
      wallX(xFar, BED_Y - 0.4, topY, -HZ, -PL, -1), wallX(xFar, BED_Y - 0.4, topY, PL, HZ, -1),
    ]), endMat));
    info.stairs = [];
    const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1d6).multiplyScalar(2.2) });
    for (const zz of [-PL, PL]) {
      const dir = zz < 0 ? 1 : -1; // от торца внутрь зала
      const o = -dir; // наружу
      const nSteps = Math.round(rise / 0.17);
      const sh = rise / nSteps;
      const land = 1.6; // площадка у проёма
      const steps = [];
      for (let i = 0; i < nSteps; i++) {
        const h = sh * (nSteps - i);
        const zc = zz + dir * (land + 0.32 * i + 0.16);
        steps.push(boxGeom(4.2, h, 0.32, xm, PLAT_Y + h / 2, zc));
      }
      steps.push(boxGeom(4.2, rise, land, xm, PLAT_Y + rise / 2, zz + dir * land / 2));
      grp.add(new THREE.Mesh(mergeGeoms(steps), floorMat));
      const flightEnd = zz + dir * (land + 0.32 * nSteps);
      info.stairs.push({ x0: xm - 2.1, x1: xm + 2.1, zBottom: flightEnd, zTop: zz + dir * land, yBottom: PLAT_Y, yTop: LH, zWall: zz, o });
      // боковые парапеты и поручни марша
      const par = [];
      for (const sx of [-1, 1]) {
        const shp = new THREE.Shape();
        shp.moveTo(0, 0); shp.lineTo(land + 0.32 * nSteps, 0); shp.lineTo(land, rise + 0.9); shp.lineTo(0, rise + 0.9); shp.lineTo(0, 0);
        const g = new THREE.ExtrudeGeometry(shp, { depth: 0.14, bevelEnabled: false });
        g.rotateY(dir > 0 ? -Math.PI / 2 : Math.PI / 2);
        g.translate(xm + sx * 2.17 - (dir > 0 ? 0.07 : -0.07) * 0, PLAT_Y, zz);
        par.push(g);
      }
      grp.add(new THREE.Mesh(mergeGeoms(par), mat(columnTexture(style), 0.4)));
      const rails = [];
      for (const sx of [-1, 1]) {
        const len = Math.hypot(0.32 * nSteps, rise);
        const g = cylGeom(0.03, 0.03, len, 8, 0, 0, 0, 0, 0, 0);
        g.rotateX(-dir * Math.atan2(0.32 * nSteps, rise));
        g.translate(xm + sx * 2.17, PLAT_Y + rise / 2 + 1.0, zz + dir * (land + 0.16 * nSteps));
        rails.push(g);
      }
      grp.add(new THREE.Mesh(mergeGeoms(rails), new THREE.MeshLambertMaterial({ color: 0x2a2a2a })));
      // коридор за проёмом: до торцевой стены зала и ещё 4 м дальше
      const zA = zz, zB = o * (HZ + 4);
      const z0 = Math.min(zA, zB), z1 = Math.max(zA, zB);
      const cor = [];
      cor.push(planeY(LH + 0.002, xm - hw, xm + hw, z0, z1));
      grp.add(new THREE.Mesh(mergeGeoms(cor), floorMat));
      grp.add(new THREE.Mesh(mergeGeoms([wallX(xm - hw, LH, LH + CH, z0, z1, 1), wallX(xm + hw, LH, LH + CH, z0, z1, -1)]), mat(wTex, 0.5)));
      grp.add(new THREE.Mesh(planeY(LH + CH, xm - hw, xm + hw, z0, z1, false), ceilMat));
      grp.add(lampsMesh(new THREE.BoxGeometry(0.3, 0.04, 2.2), (() => { const a = []; for (let z = z0 + 1.5; z < z1; z += 3.5) a.push({ x: xm, y: LH + CH - 0.03, z }); return a; })()));
      // наклонный ход вверх (эскалаторы на глубоких станциях, лестница — на мелких)
      const deepSt = (style.dp || 8) > 20;
      const riseUp = deepSt ? Math.min(26, (style.dp || 30) * 0.55) : Math.max(4, (style.dp || 8) * 0.6);
      grp.add(buildIncline(xm, LH, zB, o, riseUp, deepSt, { floorMat, wallMat: mat(wTex, 0.5), ceilMat, lampM, style }));
      // стенка на стыке коридора и наклонного хода (закрывает щели по бокам и сверху)
      const iw = deepSt ? 3.0 : 2.1;
      grp.add(new THREE.Mesh(wallZHole(xm - iw - 0.2, xm + iw + 0.2, LH - 0.5, LH + 4.4, zB, [xm - hw, xm + hw, LH - 0.1, LH + CH]), endMat));
      info.exits.push({ x: xm, z: zz + o * 3, y: LH });
      const exitSign = signTexture(['Выход в город'], { bg: '#1f2733', w: 512, h: 96 });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.48), new THREE.MeshBasicMaterial({ map: exitSign }));
      sg.position.set(xm, Math.min(topY - 0.4, LH + CH + 0.45), zz + dir * 0.08);
      if (dir < 0) sg.rotation.y = Math.PI;
      grp.add(sg);
    }
  } else {
    for (const zz of [-PL, PL]) info.exits.push({ x: (EDGE_X + xFar) / 2, z: zz + (zz < 0 ? 3 : -3), y: PLAT_Y });
  }

  yield; // постройка по частям: следующий кусок — в следующем кадре
  // название станции на путевых стенах
  const nameY = t === 'vault' ? 2.6 : 2.7;
  const zs = [];
  for (let z = -PL + 12; z < PL - 5; z += 26) zs.push(z);
  if (t !== 'ground' && t !== 'bridge' && !info.customNames) {
    if (glassSide !== 'R') nameBoards(grp, style, rightWall, -1, nameY, zs);
    if (glassSide !== 'L') nameBoards(grp, style, leftWall, 1, nameY, zs);
  }
  yield; // постройка по частям: следующий кусок — в следующем кадре
  // подвесные указатели над краем платформы
  const sTex = signTexture([st.name], { bg: '#1f2733', w: 1024, h: 128, line });
  const signMat = new THREE.MeshBasicMaterial({ map: sTex });
  const sgns = [];
  const sy = (t === 'pylon' || t === 'cold') ? 3.85 : Math.min(yC - 0.7, 4.2);
  for (let z = -PL + 20; z < PL; z += 40) {
    sgns.push(...signPair(3.6, 0.45, EDGE_X - 0.6, sy, z), ...signPair(3.6, 0.45, xFar + 0.6, sy, z));
  }
  grp.add(new THREE.Mesh(mergeGeoms(sgns), signMat));

  // остановочный знак «СТОП» и выходной светофор — на путевой стене / над тоннелем
  // (у наземных станций стены нет — там их не ставим)
  const m = sharedMats();
  if (t === 'ground' || t === 'bridge') info.signal = { set() {} };
  else {
  const stopTex = signTexture(['СТОП'], { bg: '#ffffff', fg: '#c81e1e', w: 256, h: 128 });
  const stop = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: stopTex }));
  stop.rotation.y = -Math.PI / 2;
  stop.position.set((glassSide === 'R' ? EDGE_X + 0.05 : rightWall - 0.05), 2.4, -STOP_OFFSET - 1.5);
  if (glassSide === 'R') stop.rotation.y = Math.PI / 2;
  grp.add(stop);
  const sig = new THREE.Group();
  sig.add(new THREE.Mesh(boxGeom(0.3, 0.75, 0.2, 0, 0, 0), m.sigPost));
  const red = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), m.red);
  const green = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), m.off);
  red.position.set(0, 0.17, -0.105); green.position.set(0, -0.17, -0.105);
  red.rotation.y = Math.PI; green.rotation.y = Math.PI;
  sig.add(red, green);
  sig.position.set(Math.min(rightWall, 2.2) - 0.35, 2.6, -HZ - 2);
  grp.add(sig);
  info.signal = {
    set(ok) { red.material = ok ? m.off : m.red; green.material = ok ? m.green : m.off; },
  };
  }
  // часы над тоннелем
  if (t !== 'ground' && t !== 'bridge') {
    const clk = makeClock();
    clk.mesh.position.set(0, deep ? 4.75 : Math.min(yC - 0.35, 4.6), -HZ + 0.05);
    grp.add(clk.mesh);
    info.clock = clk;
  }

  // позиции точечных светильников для пула освещения
  const xm = (EDGE_X + xFar) / 2;
  if (!hq) for (let z = -PL + 15; z < PL; z += 33) info.lights.push(new THREE.Vector3(xm, yC - 0.6, z), new THREE.Vector3(1.0, Math.min(yC, 5) - 0.6, z + 12));
  info.platform = { x0: xFar + 0.6, x1: EDGE_X - 0.5, z0: -PL + 3, z1: PL - 3, y: PLAT_Y };
  // полосы, куда нельзя ставить камеру «вид снаружи» (толща пилонов)
  if (!info.noCamSet) info.noCam = (t === 'pylon' || t === 'cold') ? [[-7.15, -4.15], [xFar + 2.55, xFar + 5.55]] : [];
  info.colRows = colRows;
  info.W = W;
  if (!hq) info.ceilY = yC;
  if (t === 'bridge') info.camY = 5.1; // камера «вид снаружи» — под перекрытием моста
  if (mirror) info.side = 1; // платформа справа по ходу — двери справа
  info.layOpp = oppX * (mirror ? -1 : 1); // путь за платформой в системе трассы

  placeStation(grp, route, st, mirror);
  return { group: grp, info, st };
}

// табличка, читаемая с обеих сторон (две односторонние плоскости вдоль Z)
function signPair(w, h, x, y, z) {
  const a = new THREE.PlaneGeometry(w, h); a.rotateY(Math.PI / 2); a.translate(x + 0.01, y, z);
  const b = new THREE.PlaneGeometry(w, h); b.rotateY(-Math.PI / 2); b.translate(x - 0.01, y, z);
  return [a, b];
}

// стенка поперёк зала (плоскость z = const) с прямоугольным проёмом
function wallZHole(x0, x1, y0, y1, z, [xa, xb, ya, yb]) {
  const sh = new THREE.Shape();
  sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.lineTo(x0, y0);
  const h = new THREE.Path();
  h.moveTo(xa, ya); h.lineTo(xb, ya); h.lineTo(xb, yb); h.lineTo(xa, yb); h.lineTo(xa, ya);
  sh.holes.push(h);
  const g = new THREE.ShapeGeometry(sh, 4);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, (uv.getY(i) - y0) / (y1 - y0));
  g.translate(0, 0, z);
  return g;
}

let escTex = null;
function escalatorTexture() {
  if (escTex) return escTex;
  const c = makeCanvas(128, 256);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3c3e'; ctx.fillRect(0, 0, 128, 256);
  for (let y = 0; y < 256; y += 32) { ctx.fillStyle = '#d6b23a'; ctx.fillRect(0, y, 128, 3); ctx.fillStyle = '#1e1f20'; ctx.fillRect(0, y + 3, 128, 3); }
  for (let x = 0; x < 128; x += 6) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x, 0, 2, 256); }
  escTex = canvasTex(c);
  escTex.userData.shared = true;
  return escTex;
}

// Наклонный ход из коридора наверх: o — направление наружу (±1 по Z)
function buildIncline(xm, y0, z0, o, rise, escal, { floorMat, wallMat, ceilMat, lampM, style }) {
  const ang = escal ? Math.PI / 6 : Math.PI / 6.5;
  const L = rise / Math.sin(ang);
  const w = escal ? 3.0 : 2.1;
  const inner = new THREE.Group();
  // в локальной системе: вперёд (вверх по ходу) = -Z, пол на y = 0
  const parts = { floor: [], wall: [], ceil: [], belt: [], bal: [], rail: [], lamps: [] };
  parts.wall.push(wallX(-w, 0, 3.0, -L, 0.6, 1), wallX(w, 0, 3.0, -L, 0.6, -1));
  const vault = arc(0, 3.0, w, 0.9, 0, Math.PI, 14);
  parts.ceil.push(profileZ(vault, -L, 0.6, 4, 4));
  if (escal) {
    // три ленты эскалаторов, балюстрады и светильники-«торшеры»
    for (const bx of [-1.75, 0, 1.75]) parts.belt.push(planeY(0.02, bx - 0.55, bx + 0.55, -L, 0.6, true, 1.1, 1.2));
    for (const bx of [-2.55, -0.875, 0.875, 2.55]) {
      parts.bal.push(boxGeom(bx === -2.55 || bx === 2.55 ? 0.9 : 0.55, 0.95, L + 0.6, bx, 0.47, -L / 2 + 0.3));
      parts.rail.push(boxGeom(0.1, 0.06, L + 0.6, bx + (Math.abs(bx) > 2 ? -Math.sign(bx) * 0.4 : -0.25), 1.0, -L / 2 + 0.3), boxGeom(0.1, 0.06, L + 0.6, bx + (Math.abs(bx) > 2 ? -Math.sign(bx) * 0.4 : 0.25), 1.0, -L / 2 + 0.3));
    }
    for (let z = -2; z > -L; z -= 3.2) for (const bx of [-0.875, 0.875]) {
      parts.rail.push(cylGeom(0.025, 0.025, 0.7, 6, bx, 1.3, z));
      parts.lamps.push(cylGeom(0.07, 0.07, 0.28, 10, bx, 1.75, z));
    }
  } else {
    // широкая лестница: ступени вдоль наклона
    const n = Math.round(L / 0.36);
    for (let i = 0; i < n; i++) parts.floor.push(boxGeom(2 * w - 0.1, 0.17, 0.33, 0, 0.0, -0.18 - i * 0.36));
    parts.rail.push(boxGeom(0.06, 0.06, L, -w + 0.15, 0.95, -L / 2), boxGeom(0.06, 0.06, L, w - 0.15, 0.95, -L / 2), boxGeom(0.06, 0.06, L, 0, 0.95, -L / 2));
  }
  for (let z = -1.5; z > -L; z -= 4) parts.lamps.push(boxGeom(0.35, 0.05, 1.6, 0, 3.86, z));
  const mk = (list, m) => { if (list.length) inner.add(new THREE.Mesh(mergeGeoms(list), m)); };
  mk(parts.floor, floorMat); mk(parts.wall, wallMat); mk(parts.ceil, ceilMat);
  mk(parts.belt, new THREE.MeshLambertMaterial({ map: escalatorTexture(), emissiveMap: escalatorTexture(), emissive: 0x555555 }));
  mk(parts.bal, new THREE.MeshLambertMaterial({ color: 0xc8b089, emissive: 0x2a2418 }));
  mk(parts.rail, new THREE.MeshLambertMaterial({ color: 0x151515 }));
  mk(parts.lamps, lampM);
  // наверху — светлый вестибюль
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2 * w, 3.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff4e0).multiplyScalar(1.6) }));
  glow.position.set(0, 1.9, -L - 0.4);
  inner.add(glow);
  const tilt = new THREE.Group();
  tilt.add(inner);
  // пол наклонного хода не должен «висеть» над коридором: опускаем начало на ступень
  inner.rotation.x = ang;
  const outer = new THREE.Group();
  outer.add(tilt);
  outer.position.set(xm, y0, z0);
  if (o > 0) outer.rotation.y = Math.PI;
  void style;
  return outer;
}

function endWallBox(x0, x1, y0, y1, z) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  if (z > 0) g.rotateY(0); else g.rotateY(Math.PI);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return g;
}

function wallZ(x0, x1, y0, y1, z) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  scaleUV(g, (x1 - x0) / 4, 1);
  if (z > 0) g.rotateY(Math.PI);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, z);
  return g;
}

// Наземная крытая станция и станция на метромосту: стеклянные стены и навес
function buildShed(grp, style, xr, xl, yC, t) {
  if (style.open) return buildCanopy(grp, style);
  const glass = new THREE.MeshLambertMaterial({ color: 0xbcd8e0, transparent: true, opacity: 0.22, emissive: 0x203030, side: THREE.DoubleSide, depthWrite: false });
  const frame = new THREE.MeshLambertMaterial({ color: t === 'bridge' ? 0x8f9593 : 0xf2f2f0, emissive: 0x2a2a2a });
  const acc = new THREE.MeshLambertMaterial({ color: style.c2 || '#f2c53d', emissive: new THREE.Color(style.c2 || '#f2c53d').multiplyScalar(0.3) });
  const top = t === 'bridge' ? 5.6 : 8.5;
  const hGlass = t === 'bridge' ? 5.4 : 6.0;
  // стеклянные стены
  grp.add(new THREE.Mesh(mergeGeoms([wallX(xr + 0.5, BED_Y, hGlass, -HZ, HZ, -1), wallX(xl - 0.5, BED_Y, hGlass, -HZ, HZ, 1)]), glass));
  // стойки витражей
  const posts = [];
  for (let z = -HZ; z <= HZ; z += 3) { posts.push(boxGeom(0.12, hGlass - BED_Y, 0.12, xr + 0.5, (hGlass + BED_Y) / 2, z), boxGeom(0.12, hGlass - BED_Y, 0.12, xl - 0.5, (hGlass + BED_Y) / 2, z)); }
  posts.push(boxGeom(0.1, 0.1, 2 * HZ, xr + 0.5, 1.9, 0), boxGeom(0.1, 0.1, 2 * HZ, xl - 0.5, 1.9, 0));
  grp.add(new THREE.Mesh(mergeGeoms(posts), frame));
  if (t === 'bridge') {
    // перекрытие — низ проезжей части моста; опоры моста проходят через зал
    const deck = new THREE.MeshLambertMaterial({ color: 0x9a9890, emissive: 0x3a3a36, side: THREE.DoubleSide });
    grp.add(new THREE.Mesh(planeY(top, xl - 0.6, xr + 0.6, -HZ, HZ, false), deck));
    const beams = [];
    for (let z = -HZ; z <= HZ; z += 6) beams.push(boxGeom(xr - xl + 1.2, 0.5, 0.4, (xr + xl) / 2, top - 0.25, z));
    grp.add(new THREE.Mesh(mergeGeoms(beams), deck));
    const piers = [];
    const xm = (EDGE_X + xl + 1.48) / 2;
    for (const z of [-55, 0, 55]) piers.push(boxGeom(3.2, top - PLAT_Y, 2.2, xm, (top + PLAT_Y) / 2, z));
    const pMat = mat(columnTexture({ ...style, c: '#e8e8e4', c2: '#3b7a5a', csh: 'sq' }), 0.5);
    grp.add(new THREE.Mesh(mergeGeoms(piers), pMat));
    // пол под путями — плита моста
    grp.add(new THREE.Mesh(planeY(BED_Y - 0.6, xl - 0.6, xr + 0.6, -HZ, HZ, false), deck));
    grp.add(new THREE.Mesh(mergeGeoms([wallX(xr + 0.6, BED_Y - 1.6, BED_Y, -HZ, HZ, 1), wallX(xl - 0.6, BED_Y - 1.6, BED_Y, -HZ, HZ, -1)]), deck));
    // название — на табличках в центре зала
    const tex = nameTexture(style.n, 'plate');
    const nm = new THREE.MeshBasicMaterial({ map: tex });
    grp.add(new THREE.Mesh(mergeGeoms([-28, 28].flatMap((z) => signPair(0.7 * tex.userData.aspect, 0.7, xm, 3.2, z))), nm));
  } else {
    // арочный навес в духе старинных вокзалов
    const span = xr - xl + 1;
    const xc = (xr + xl) / 2;
    const arches = [];
    for (let z = -HZ; z <= HZ; z += 6) {
      const pts = arc(xc, hGlass, span / 2, top - hGlass, 0, Math.PI, 18);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const g = boxGeom(len, 0.18, 0.18, 0, 0, 0);
        g.rotateZ(Math.atan2(b.y - a.y, b.x - a.x));
        g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, z);
        arches.push(g);
      }
    }
    grp.add(new THREE.Mesh(mergeGeoms(arches), frame));
    const roof = arc(xc, hGlass, span / 2, top - hGlass, 0, Math.PI, 18);
    const rg = profileZ(roof, -HZ, HZ, 4, 4);
    grp.add(new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ color: 0xdfe9ec, transparent: true, opacity: 0.5, emissive: 0x404848, side: THREE.DoubleSide, depthWrite: false })));
    // акцентные элементы (кассы/выходы)
    const xm = (EDGE_X + xl + 1.48) / 2;
    const acc1 = [];
    for (const z of [-60, -20, 20, 60]) acc1.push(boxGeom(1.8, 2.6, 1.2, xm, PLAT_Y + 1.3, z));
    grp.add(new THREE.Mesh(mergeGeoms(acc1), acc));
    // растения в кадках (Филатов Луг)
    const pl = [];
    for (let z = -70; z <= 70; z += 20) pl.push(cylGeom(0.4, 0.3, 0.6, 10, xm + 3, PLAT_Y + 0.3, z), cylGeom(0.05, 0.6, 1.4, 8, xm + 3, PLAT_Y + 1.3, z));
    grp.add(new THREE.Mesh(mergeGeoms(pl), new THREE.MeshLambertMaterial({ color: 0x4f7a3a, emissive: 0x10200a })));
    const tex = nameTexture(style.n, 'plate');
    const nm = new THREE.MeshBasicMaterial({ map: tex });
    grp.add(new THREE.Mesh(mergeGeoms([-40, 0, 40].flatMap((z) => signPair(0.6 * tex.userData.aspect, 0.6, xm, 4.2, z))), nm));
  }
}

// ---------- Наземная станция с боковыми платформами (Технопарк) ----------
// Строится в «зеркальной» локальной системе: наша платформа слева (x < EDGE_X), как у островных
// станций, встречный путь — справа (x = +S); затем группа отражается по X, и в мире платформа
// оказывается справа по ходу, а встречный путь — слева. Тексты на табличках отражены заранее.
const SIDE_W = 6.0;
let SIDE_TEX = null;
function sideTextures() {
  if (SIDE_TEX) return SIDE_TEX;
  // вертикальный сайдинг цвета металлик
  const c = makeCanvas(256, 256), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 32, 0);
  g.addColorStop(0, '#9da3a8'); g.addColorStop(0.45, '#c9ced2'); g.addColorStop(0.55, '#b7bcc0'); g.addColorStop(1, '#8e9499');
  for (let i = 0; i < 256; i += 32) { x.save(); x.translate(i, 0); x.fillStyle = g; x.fillRect(0, 0, 32, 256); x.restore(); }
  x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 256; i += 32) x.fillRect(i, 0, 2, 256);
  const siding = canvasTex(c, { aniso: 8 }); siding.userData.shared = true;
  // решётчатый подвесной потолок
  const c2 = makeCanvas(256, 256), y = c2.getContext('2d');
  y.fillStyle = '#5d6166'; y.fillRect(0, 0, 256, 256);
  y.strokeStyle = '#a9adb1'; y.lineWidth = 5;
  for (let i = 0; i <= 256; i += 32) { y.beginPath(); y.moveTo(i, 0); y.lineTo(i, 256); y.moveTo(0, i); y.lineTo(256, i); y.stroke(); }
  const grate = canvasTex(c2, { aniso: 8 }); grate.userData.shared = true;
  SIDE_TEX = { siding, grate };
  return SIDE_TEX;
}
let GRATE_A = null;
function gratingAlpha() {
  if (GRATE_A) return GRATE_A;
  const S = 256, c = makeCanvas(S, S), x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
  x.fillStyle = '#fff';
  const n = 8, w = S / n;
  for (let i = 0; i <= n; i++) { x.fillRect(i * w - 3, 0, 6, S); x.fillRect(0, i * w - 3, S, 6); }
  GRATE_A = canvasTex(c, { srgb: false, aniso: 8 }); GRATE_A.userData.shared = true;
  return GRATE_A;
}
function flipU(g) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); return g; }

function buildSideStation(route, st, line) {
  const style = st.style;
  const grp = new THREE.Group();
  grp.name = 'station:' + st.name;
  const zone = route.outdoorAt(st.c);
  const S = zone && zone.oppX ? -zone.oppX : 4.6; // междупутье
  const info = { spots: [], exits: [], lights: [], signal: null, clock: null, oppX: S, side: 1, hq: false };
  const T = sideTextures();
  const xP0 = EDGE_X - SIDE_W, xP1 = EDGE_X; // наша платформа
  const xQ0 = S + 1.48, xQ1 = S + 1.48 + SIDE_W; // встречная
  const xW0 = xP0 - 0.15, xW1 = xQ1 + 0.15;
  const ceilY = style.open ? PLAT_Y + 3.6 : 6.0, roofY = 9.2, glassY = PLAT_Y + 3.0;
  const GY = GROUND_Y;
  // детальный вариант (фото-текстуры и PBR): гранит, металлик, глянцевые вставки, открытая решётка потолка
  const hqOn = !!(style.hq && HQ.ready && HQ.renderer);
  info.hq = hqOn;
  const accent = style.c2 || '#7b3fa3';
  const floorMat = hqOn ? pbr({ map: recolor('graniteCol', '#8d877b', '#d9d3c5'), normalMap: imgTex('graniteNrm', false), roughness: 0.3, emissive: 0.05 }) : mat(floorTexture(style), 0.45);
  const siding = hqOn ? pbr({ map: T.siding, roughness: 0.26, metalness: 0.75, emissive: 0.04, side: THREE.DoubleSide, envI: 1.3 }) : new THREE.MeshStandardMaterial({ map: T.siding, roughness: 0.35, metalness: 0.55, side: THREE.DoubleSide });
  const grate = hqOn ? new THREE.MeshStandardMaterial({ color: 0x8e9398, metalness: 0.7, roughness: 0.35, alphaMap: gratingAlpha(), alphaTest: 0.5, side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ map: T.grate, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
  if (hqOn) { grate.userData.hq = true; grate.alphaMap.repeat.set(1, 1); }
  const purple = hqOn ? pbr({ color: accent, roughness: 0.08, metalness: 0.3, emissive: 0.18, side: THREE.DoubleSide, envI: 1.6 }) : new THREE.MeshStandardMaterial({ color: accent, roughness: 0.15, metalness: 0.2, emissive: new THREE.Color(accent).multiplyScalar(0.25), side: THREE.DoubleSide });
  const glass = new THREE.MeshLambertMaterial({ color: 0xbcd0d8, transparent: true, opacity: 0.25, emissive: 0x1c2628, side: THREE.DoubleSide, depthWrite: false });
  const steel = hqOn ? pbr({ color: 0x9aa0a5, metalness: 0.85, roughness: 0.25, emissive: 0.03, envI: 1.2 }) : new THREE.MeshStandardMaterial({ color: 0x8c9196, roughness: 0.4, metalness: 0.6 });
  const conc = hqOn ? pbr({ map: recolor('graniteCol', '#7d786e', '#c9c3b5'), roughness: 0.5, emissive: 0.04 }) : new THREE.MeshLambertMaterial({ map: concreteTexture('#9a968e') });
  const edgeMat = new THREE.MeshLambertMaterial({ color: 0xd8d6cf, emissive: 0x3a3a38 });
  // пути и балласт между платформами
  straightTrack(grp, 0, -HZ, HZ, 1);
  straightTrack(grp, S, -HZ, HZ, -1);
  const m = sharedMats();
  grp.add(new THREE.Mesh(planeY(-0.33, xP1, xQ0, -HZ, HZ, true, 2, 2), new THREE.MeshLambertMaterial({ color: 0x5f5a52 })));
  // платформы: плита на сплошном основании от уровня земли
  grp.add(new THREE.Mesh(mergeGeoms([planeY(PLAT_Y, xP0, xP1, -PL, PL), planeY(PLAT_Y, xQ0, xQ1, -PL, PL)]), floorMat));
  grp.add(new THREE.Mesh(mergeGeoms([
    wallX(xP1, GY, PLAT_Y, -PL, PL, 1), wallX(xQ0, GY, PLAT_Y, -PL, PL, -1),
    endWallBox(xP0, xP1, GY, PLAT_Y, -PL), endWallBox(xP0, xP1, GY, PLAT_Y, PL),
    endWallBox(xQ0, xQ1, GY, PLAT_Y, -PL), endWallBox(xQ0, xQ1, GY, PLAT_Y, PL),
  ]), conc));
  grp.add(new THREE.Mesh(mergeGeoms([planeY(PLAT_Y + 0.003, xP1 - 0.35, xP1, -PL, PL, true, 1, 1), planeY(PLAT_Y + 0.003, xQ0, xQ0 + 0.35, -PL, PL, true, 1, 1)]), edgeMat));
  grp.add(new THREE.Mesh(mergeGeoms([planeY(PLAT_Y + 0.005, xP1 - 0.95, xP1 - 0.6, -PL, PL, true, 1, 1), planeY(PLAT_Y + 0.005, xQ0 + 0.6, xQ0 + 0.95, -PL, PL, true, 1, 1)]), new THREE.MeshLambertMaterial({ color: 0xe8c22a, emissive: 0x3a3008 })));
  if (style.open) {
    // открытая станция 1950-х («Студенческая», «Кутузовская», «Фили»): у каждой платформы —
    // глухая стена с витражами и навес на колоннах; над путями — открытое небо
    const roofY = ceilY;
    grp.add(new THREE.Mesh(mergeGeoms([wallX(xW0, GY, PLAT_Y + 1.1, -PL, PL, 1, 3), wallX(xW1, GY, PLAT_Y + 1.1, -PL, PL, -1, 3)]), conc));
    grp.add(new THREE.Mesh(mergeGeoms([wallX(xW0, PLAT_Y + 1.1, roofY, -PL, PL, 1), wallX(xW1, PLAT_Y + 1.1, roofY, -PL, PL, -1)]), glass));
    const mull = [];
    for (let z = -PL; z <= PL; z += 2.25) mull.push(boxGeom(0.08, roofY - PLAT_Y - 1.1, 0.08, xW0, (PLAT_Y + 1.1 + roofY) / 2, z), boxGeom(0.08, roofY - PLAT_Y - 1.1, 0.08, xW1, (PLAT_Y + 1.1 + roofY) / 2, z));
    for (const y of [PLAT_Y + 1.1, PLAT_Y + 2.4]) mull.push(boxGeom(0.1, 0.1, 2 * PL, xW0, y, 0), boxGeom(0.1, 0.1, 2 * PL, xW1, y, 0));
    grp.add(new THREE.Mesh(mergeGeoms(mull), steel));
    // цветные вставки витражей (как после реконструкции)
    const acc = [];
    for (let z = -PL + 6; z < PL - 6; z += 13.5) for (const [x, o] of [[xW0 + 0.04, 1], [xW1 - 0.04, -1]]) acc.push(wallX(x, PLAT_Y + 1.25, PLAT_Y + 2.3, z, z + 4.5, o));
    grp.add(new THREE.Mesh(mergeGeoms(acc), purple));
    // навесы: плита на ряду колонн у стены, консоль над краем платформы
    const cols = [], slab = [];
    for (let z = -PL + 4; z <= PL - 4; z += 6.5) for (const x of [xP0 + 1.4, xQ1 - 1.4]) cols.push(boxGeom(0.4, roofY - PLAT_Y, 0.4, x, (roofY + PLAT_Y) / 2, z));
    grp.add(new THREE.Mesh(mergeGeoms(cols), siding));
    slab.push(boxGeom(xP1 + 0.5 - xW0, 0.26, 2 * PL, (xW0 + xP1 + 0.5) / 2, roofY + 0.13, 0), boxGeom(xW1 - xQ0 + 0.5, 0.26, 2 * PL, (xQ0 - 0.5 + xW1) / 2, roofY + 0.13, 0));
    slab.push(boxGeom(0.14, 0.45, 2 * PL, xP1 + 0.45, roofY - 0.1, 0), boxGeom(0.14, 0.45, 2 * PL, xQ0 - 0.45, roofY - 0.1, 0));
    grp.add(new THREE.Mesh(mergeGeoms(slab), conc));
    const lamps = [];
    for (let z = -PL + 5; z < PL - 4; z += 5) for (const x of [xP1 - 1.4, xQ0 + 1.4]) lamps.push(boxGeom(0.2, 0.04, 1.4, x, roofY - 0.02, z));
    grp.add(new THREE.Mesh(mergeGeoms(lamps), new THREE.MeshBasicMaterial({ color: 0xfff6e6 })));
    // остеклённые вестибюли в торцах платформ (выходы)
    const vest = [], vroof = [];
    for (const e of [-1, 1]) {
      const zIn = e * (PL - 9), zOut = e * PL;
      for (const [x0, x1, xe] of [[xW0, xP1 - 1.2, xP1 - 1.2], [xQ0 + 1.2, xW1, xQ0 + 1.2]]) {
        vest.push(wallZ(x0, x1, PLAT_Y, roofY, zIn), wallX(xe, PLAT_Y, roofY, Math.min(zIn, zOut), Math.max(zIn, zOut), 1));
        vroof.push(boxGeom(0.12, 0.12, PL - (PL - 9), xe, roofY - 0.06, (zIn + zOut) / 2));
      }
    }
    grp.add(new THREE.Mesh(mergeGeoms(vest), glass));
    grp.add(new THREE.Mesh(mergeGeoms(vroof), steel));
    // скамейки
    const bs = [];
    for (let z = -PL + 14; z < PL - 12; z += 18) bs.push(boxGeom(0.5, 0.45, 2.4, xP0 + 2.6, PLAT_Y + 0.22, z), boxGeom(0.5, 0.45, 2.4, xQ1 - 2.6, PLAT_Y + 0.22, z));
    grp.add(new THREE.Mesh(mergeGeoms(bs), new THREE.MeshLambertMaterial({ color: 0x6b4a32 })));
    info.stairs = [];
    info.exits.push({ x: (xP0 + xP1) / 2, z: -PL + 3, y: PLAT_Y }, { x: (xP0 + xP1) / 2, z: PL - 3, y: PLAT_Y });
  } else {
  // наружные стены: сайдинг снизу, остекление сверху
    grp.add(new THREE.Mesh(mergeGeoms([
      wallX(xW0, GY, glassY, -HZ, HZ, 1, 3), wallX(xW1, GY, glassY, -HZ, HZ, -1, 3),
    ]), siding));
    grp.add(new THREE.Mesh(mergeGeoms([wallX(xW0, glassY, ceilY + 0.6, -HZ, HZ, 1), wallX(xW1, glassY, ceilY + 0.6, -HZ, HZ, -1)]), glass));
    const mull = [];
    for (let z = -HZ; z <= HZ; z += 3) mull.push(boxGeom(0.1, ceilY + 0.6 - glassY, 0.1, xW0, (glassY + ceilY + 0.6) / 2, z), boxGeom(0.1, ceilY + 0.6 - glassY, 0.1, xW1, (glassY + ceilY + 0.6) / 2, z));
    mull.push(boxGeom(0.14, 0.14, 2 * HZ, xW0, glassY, 0), boxGeom(0.14, 0.14, 2 * HZ, xW1, glassY, 0));
    grp.add(new THREE.Mesh(mergeGeoms(mull), steel));
    // колонны в сайдинге
    const cols = [], cz = [];
    for (let z = -72; z <= 72; z += 9) cz.push(z);
    for (const z of cz) for (const x of [xP0 + 1.3, xQ1 - 1.3]) cols.push(boxGeom(0.55, ceilY - PLAT_Y, 0.55, x, (ceilY + PLAT_Y) / 2, z));
    grp.add(new THREE.Mesh(mergeGeoms(cols), siding));
    // подвесной потолок из решёток с фиолетовыми вставками у каждой второй колонны; проём над лестницей
    const ceil = [];
    const GU = hqOn ? 1.2 : 3; // решётка: ячейки 15 см (8 на 1,2 м)
    const stairX0 = xP0 + 0.3, stairX1 = xP0 + 2.9, stairZ0 = 3.5, stairZ1 = 12.5;
    for (const [a, b] of [[xP0, xP1 + 0.4], [xQ0 - 0.4, xQ1]]) {
      ceil.push(planeY(ceilY, a, b, -HZ, -3.5, false, GU, GU), planeY(ceilY, a, b, stairZ1, HZ, false, GU, GU));
    }
    ceil.push(planeY(ceilY, stairX1, xP1 + 0.4, 3.5, stairZ1, false, GU, GU), planeY(ceilY, xQ0 - 0.4, xQ1 - 2.9, 3.5, stairZ1, false, GU, GU), planeY(ceilY, xP0, stairX0, 3.5, stairZ1, false, GU, GU), planeY(ceilY, xQ1 - 0.3, xQ1, 3.5, stairZ1, false, GU, GU));
    grp.add(new THREE.Mesh(mergeGeoms(ceil), grate));
    const ins = [];
    cz.forEach((z, i) => { if (i % 2 === 0 && Math.abs(z) > 14) for (const x of [xP0 + 2.6, xQ1 - 2.6]) ins.push(boxGeom(4.2, 0.18, 4.2, x, ceilY - 0.1, z)); });
    for (const x of [(xP0 + xP1) / 2, (xQ0 + xQ1) / 2]) ins.push(boxGeom(SIDE_W - 0.3, 0.22, 2.2, x, ceilY - 0.12, -5.0), boxGeom(SIDE_W - 0.3, 0.22, 2.2, x, ceilY - 0.12, 14.2));
    grp.add(new THREE.Mesh(mergeGeoms(ins), purple));
    // светильники-полосы в потолке
    const lamps = [];
    if (hqOn) {
      // сплошные светодиодные линии вдоль платформ (с разрывом у лестниц)
      for (const x of [xP1 - 1.1, xP0 + 2.4, xQ0 + 1.1, xQ1 - 2.4]) for (const [z0, z1] of [[-HZ + 2, -4.5], [13.5, HZ - 2]]) lamps.push(boxGeom(0.1, 0.05, z1 - z0, x, ceilY - 0.06, (z0 + z1) / 2));
      grp.add(new THREE.Mesh(mergeGeoms(lamps), lampMat(4.2, 0xfdfbf4)));
      // тёмное перекрытие над решёткой
      grp.add(new THREE.Mesh(mergeGeoms([planeY(ceilY + 0.45, xW0, xP1 + 0.4, -HZ, HZ, false), planeY(ceilY + 0.45, xQ0 - 0.4, xW1, -HZ, HZ, false)]), pbr({ color: 0x1d1f22, roughness: 0.8, emissive: 0.0, side: THREE.DoubleSide })));
    } else {
      for (let z = -78; z <= 78; z += 6) for (const x of [xP1 - 1.6, xQ0 + 1.6]) if (!(z > -4 && z < 13)) lamps.push(boxGeom(0.18, 0.04, 2.6, x, ceilY - 0.03, z));
      grp.add(new THREE.Mesh(mergeGeoms(lamps), new THREE.MeshBasicMaterial({ color: 0xfff6e6 })));
    }
    // крыша: над платформами — глухая, над путями — стеклянная
    grp.add(new THREE.Mesh(mergeGeoms([planeY(ceilY + 0.7, xW0, xP1 + 0.4, -HZ, HZ, true, 4, 4), planeY(ceilY + 0.7, xQ0 - 0.4, xW1, -HZ, HZ, true, 4, 4)]), new THREE.MeshLambertMaterial({ color: 0x8d9195, side: THREE.DoubleSide })));
    grp.add(new THREE.Mesh(mergeGeoms([wallX(xP1 + 0.4, ceilY, roofY, -HZ, HZ, 1), wallX(xQ0 - 0.4, ceilY, roofY, -HZ, HZ, -1)]), siding));
    grp.add(new THREE.Mesh(planeY(roofY, xP1 + 0.4, xQ0 - 0.4, -HZ, HZ, false), glass));
    const rf = [];
    for (let z = -HZ; z <= HZ; z += 4) rf.push(boxGeom(xQ0 - xP1 - 0.8, 0.22, 0.14, (xP1 + xQ0) / 2, roofY - 0.11, z));
    rf.push(boxGeom(0.16, 0.22, 2 * HZ, (xP1 + xQ0) / 2, roofY - 0.11, 0));
    if (hqOn) {
      // пространственные фермы: нижние пояса и раскосы
      const xa = xP1 + 0.9, xb = xQ0 - 0.9, yb = roofY - 1.3;
      rf.push(boxGeom(0.12, 0.12, 2 * HZ, xa, yb, 0), boxGeom(0.12, 0.12, 2 * HZ, xb, yb, 0));
      for (let z = -HZ; z < HZ; z += 4) for (const x of [xa, xb]) for (const d of [1, -1]) {
        const L = Math.hypot(2, 1.2);
        const g = boxGeom(0.07, 0.07, L, 0, 0, 0);
        g.rotateX(d * Math.atan2(1.2, 2)); g.translate(x, yb + 0.6, z + 1 + d * 0 + (d > 0 ? 0 : 2) - 1);
        rf.push(g);
      }
    }
    grp.add(new THREE.Mesh(mergeGeoms(rf), steel));
    // фронтоны над путями в торцах павильона
    grp.add(new THREE.Mesh(mergeGeoms([wallZ(xP1 + 0.4, xQ0 - 0.4, 5.2, roofY, -HZ), wallZ(xP1 + 0.4, xQ0 - 0.4, 5.2, roofY, HZ), wallZ(xW0, xP1 + 0.4, ceilY, ceilY + 0.7, -HZ), wallZ(xW0, xP1 + 0.4, ceilY, ceilY + 0.7, HZ), wallZ(xQ0 - 0.4, xW1, ceilY, ceilY + 0.7, -HZ), wallZ(xQ0 - 0.4, xW1, ceilY, ceilY + 0.7, HZ)]), siding));
    // торцы платформ: остеклённые стены
    grp.add(new THREE.Mesh(mergeGeoms([wallZ(xW0, xP1 - 0.2, PLAT_Y, ceilY, -PL - 0.2), wallZ(xW0, xP1 - 0.2, PLAT_Y, ceilY, PL + 0.2), wallZ(xQ0 + 0.2, xW1, PLAT_Y, ceilY, -PL - 0.2), wallZ(xQ0 + 0.2, xW1, PLAT_Y, ceilY, PL + 0.2)]), glass));
    // пешеходный мост между платформами и лестницы на него
    const deckY = 6.0, bz = 3.5;
    grp.add(new THREE.Mesh(mergeGeoms([planeY(deckY, xP0, xQ1, -bz, bz, true, 2, 2), planeY(deckY - 0.5, xP0, xQ1, -bz, bz, false, 2, 2)]), floorMat));
    grp.add(new THREE.Mesh(mergeGeoms([wallZ(xP1 + 0.4, xQ0 - 0.4, deckY - 0.5, deckY, -bz), wallZ(xP1 + 0.4, xQ0 - 0.4, deckY - 0.5, deckY, bz)]), steel));
    grp.add(new THREE.Mesh(mergeGeoms([wallZ(xP1 + 0.4, xQ0 - 0.4, deckY, deckY + 2.6, -bz), wallZ(xP1 + 0.4, xQ0 - 0.4, deckY, deckY + 2.6, bz)]), glass));
    grp.add(new THREE.Mesh(planeY(deckY + 2.7, xP1 + 0.4, xQ0 - 0.4, -bz, bz, false), siding));
    const stairs = [];
    const steps = 18;
    for (const [x0, x1] of [[stairX0, stairX1], [xQ1 - 2.9, xQ1 - 0.3]]) {
      for (let i = 0; i < steps; i++) {
        const y = PLAT_Y + (deckY - PLAT_Y) * (i + 1) / steps;
        const z = stairZ1 - (stairZ1 - stairZ0) * (i + 0.5) / steps;
        stairs.push(boxGeom(x1 - x0, (deckY - PLAT_Y) / steps, (stairZ1 - stairZ0) / steps, (x0 + x1) / 2, y - (deckY - PLAT_Y) / steps / 2, z));
      }
    }
    grp.add(new THREE.Mesh(mergeGeoms(stairs), conc));
    const rails = [];
    for (const x of [stairX1, xQ1 - 2.9]) {
      const L = Math.hypot(stairZ1 - stairZ0, deckY - PLAT_Y);
      const g = boxGeom(0.06, 0.06, L, 0, 0, 0);
      g.rotateX(Math.atan2(deckY - PLAT_Y, stairZ1 - stairZ0));
      g.translate(x, (PLAT_Y + deckY) / 2 + 1.0, (stairZ0 + stairZ1) / 2);
      rails.push(g, boxGeom(0.04, (deckY - PLAT_Y) / 2 + 1, 0.04, x, PLAT_Y + ((deckY - PLAT_Y) / 2 + 1) / 2, stairZ1 - 0.2));
    }
    grp.add(new THREE.Mesh(mergeGeoms(rails), steel));
    info.stairs = [{ x0: stairX0, x1: stairX1, zBottom: stairZ1, zTop: stairZ0, yBottom: PLAT_Y, yTop: deckY, zWall: bz, o: -1 }];
    info.exits.push({ x: (stairX0 + stairX1) / 2, z: 1.0, y: deckY });
  }
  // названия станции на наружных стенах (текст отражён заранее)
  const tex = nameTexture(style.n, 'plate');
  const nm = new THREE.MeshBasicMaterial({ map: tex });
  const names = [];
  for (const z of [-60, -32, 32, 60]) {
    const a = new THREE.PlaneGeometry(0.7 * tex.userData.aspect, 0.7); a.rotateY(Math.PI / 2); a.translate(xW0 + 0.03, 2.6, z); names.push(flipU(a));
    const b = new THREE.PlaneGeometry(0.7 * tex.userData.aspect, 0.7); b.rotateY(-Math.PI / 2); b.translate(xW1 - 0.03, 2.6, z); names.push(flipU(b));
  }
  grp.add(new THREE.Mesh(mergeGeoms(names), nm));
  // подвесные указатели
  const sTex = signTexture([st.name], { bg: '#1f2733', w: 1024, h: 128, line });
  const sg = [];
  for (let z = -PL + 20; z < PL; z += 40) for (const x of [xP1 - 0.8, xQ0 + 0.8]) sg.push(...signPair(3.6, 0.45, x, ceilY - 0.6, z).map(flipU));
  grp.add(new THREE.Mesh(mergeGeoms(sg), new THREE.MeshBasicMaterial({ map: sTex })));
  // знак «СТОП» и светофор у наземной станции не ставим: путь под открытым небом, крепить их не к чему
  const SIDE_SIG = false;
  if (SIDE_SIG) {
  const stopTex = signTexture(['СТОП'], { bg: '#ffffff', fg: '#c81e1e', w: 256, h: 128 });
  const stop = new THREE.Mesh(flipU(new THREE.PlaneGeometry(0.6, 0.3)), new THREE.MeshBasicMaterial({ map: stopTex }));
  stop.rotation.y = Math.PI / 2;
  stop.position.set(EDGE_X - 0.4, 2.6, -STOP_OFFSET - 1.5);
  grp.add(stop);
  }
  const sig = new THREE.Group();
  sig.add(new THREE.Mesh(boxGeom(0.3, 0.75, 0.2, 0, 0, 0), m.sigPost));
  const red = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), m.red);
  const green = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), m.off);
  red.position.set(0, 0.17, -0.105); green.position.set(0, -0.17, -0.105);
  red.rotation.y = Math.PI; green.rotation.y = Math.PI;
  sig.add(red, green);
  sig.add(new THREE.Mesh(boxGeom(0.1, 2.3, 0.1, 0, -1.5, 0), m.sigPost));
  sig.position.set(-2.1, 2.6, -HZ - 2);
  if (SIDE_SIG) grp.add(sig);
  info.signal = { set(ok) { red.material = ok ? m.off : m.red; green.material = ok ? m.green : m.off; } };
  const clk = makeClock();
  if (style.open) clk.mesh.position.set((xP0 + xP1) / 2, ceilY - 0.7, -PL + 9);
  else clk.mesh.position.set(0, 5.4, -HZ + 0.05);
  clk.mesh.scale.x = -1;
  grp.add(clk.mesh);
  info.clock = clk;
  // места ожидания, свет, параметры для камеры
  for (let z = -PL + 10; z < PL - 10; z += 9) info.spots.push({ x: xP0 + 2.6, z: z + 4.5 });
  for (let z = -PL + 15; z < PL; z += 33) info.lights.push(new THREE.Vector3((xP0 + xP1) / 2, ceilY - 0.6, z), new THREE.Vector3((xQ0 + xQ1) / 2, ceilY - 0.6, z + 12));
  info.platform = { x0: xP0 + 0.6, x1: xP1 - 0.5, z0: -PL + 3, z1: PL - 3, y: PLAT_Y };
  info.noCam = [];
  info.camX = [xP0 + 0.5, S - 1.6];
  if (hqOn) { info.hemi = 0.9; info.poolI = 8; }
  info.camY = ceilY - 0.4;
  info.colRows = [xP0 + 1.3];
  info.W = SIDE_W;
  info.ceilY = ceilY;
  grp.scale.x = -1;
  grp.updateMatrix();
  grp.matrix.premultiply(route.matrixAt(st.c, new THREE.Matrix4(), true));
  grp.matrix.decompose(grp.position, grp.quaternion, grp.scale);
  grp.updateMatrixWorld(true);
  return { group: grp, info, st };
}

// Открытая наземная станция: навес над островной платформой на одном ряду колонн
// («Измайловская», «Кунцевская»); пути под открытым небом.
function buildCanopy(grp, style) {
  const xFar = EDGE_X - 10, xm = (EDGE_X + xFar) / 2;
  const roofY = PLAT_Y + 3.9;
  const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#b8b4aa'), side: THREE.DoubleSide });
  const colM = mat(columnTexture({ ...style, csh: 'sq' }), 0.5);
  const cols = [];
  for (let z = -PL + 4; z <= PL - 4; z += 6.5) cols.push(boxGeom(0.55, roofY - PLAT_Y, 0.55, xm, (roofY + PLAT_Y) / 2, z));
  grp.add(new THREE.Mesh(mergeGeoms(cols), colM));
  // плита навеса с бортами и консолями
  grp.add(new THREE.Mesh(mergeGeoms([
    boxGeom(10.6, 0.28, 2 * PL - 2, xm, roofY + 0.14, 0),
    boxGeom(0.6, 0.55, 2 * PL - 2, xm, roofY - 0.2, 0),
    boxGeom(0.12, 0.5, 2 * PL - 2, EDGE_X + 0.25, roofY - 0.1, 0), boxGeom(0.12, 0.5, 2 * PL - 2, xFar - 0.25, roofY - 0.1, 0),
  ]), conc));
  const lampM = new THREE.MeshBasicMaterial({ color: 0xfff4dc });
  const lamps = [];
  for (let z = -PL + 6; z < PL - 4; z += 4) for (const x of [xm - 2.6, xm + 2.6]) lamps.push(boxGeom(0.22, 0.04, 1.6, x, roofY - 0.02, z));
  grp.add(new THREE.Mesh(mergeGeoms(lamps), lampM));
  // скамейки у колонн и названия станции на навесе
  const bench = new THREE.MeshLambertMaterial({ color: 0x6b4a32 });
  const bs = [];
  for (let z = -PL + 10; z < PL - 8; z += 19.5) bs.push(boxGeom(0.5, 0.45, 2.4, xm + 0.9, PLAT_Y + 0.22, z), boxGeom(0.5, 0.45, 2.4, xm - 0.9, PLAT_Y + 0.22, z));
  grp.add(new THREE.Mesh(mergeGeoms(bs), bench));
  const tex = nameTexture(style.n, 'plate');
  const nm = new THREE.MeshBasicMaterial({ map: tex });
  grp.add(new THREE.Mesh(mergeGeoms([-50, -10, 30, 70].flatMap((z) => signPair(0.6 * tex.userData.aspect, 0.6, xm, roofY - 0.75, z))), nm));
}

// ---------- Панорама за остеклённой путевой стеной (полуподземные станции) ----------
// x — плоскость стены, o — наружу (+1 вправо, −1 влево), top — верх стены
function buildPanorama(grp, x, o, top, style) {
  const glass = new THREE.MeshLambertMaterial({ color: 0xc8dde4, transparent: true, opacity: 0.2, emissive: 0x1c2a2e, side: THREE.DoubleSide, depthWrite: false });
  const frame = new THREE.MeshLambertMaterial({ color: 0x9aa0a4, emissive: 0x202224 });
  const conc = mat(concreteTexture('#8f8b82'), 0.4);
  const y0 = BED_Y + 0.9; // парапет внизу
  grp.add(new THREE.Mesh(wallX(x, BED_Y - 0.4, y0, -HZ, HZ, -o), conc));
  grp.add(new THREE.Mesh(wallX(x, y0, top, -HZ, HZ, -o), glass));
  const mull = [];
  for (let z = -HZ; z <= HZ; z += 3) mull.push(boxGeom(0.12, top - y0, 0.14, x, (top + y0) / 2, z));
  for (const y of [y0, (y0 + top) / 2, top - 0.1]) mull.push(boxGeom(0.14, 0.12, 2 * HZ, x, y, 0));
  grp.add(new THREE.Mesh(mergeGeoms(mull), frame));
  // снаружи: склон к низине, газон, деревья и небо (без освещения — дневной свет)
  const gY = PLAT_Y - 4.5;
  const grassM = new THREE.MeshBasicMaterial({ color: 0x6f8f4e });
  const slopeM = new THREE.MeshBasicMaterial({ color: 0x7c8a5a });
  const g = new THREE.PlaneGeometry(320, 460); g.rotateX(-Math.PI / 2); g.translate(x + o * (16 + 160), gY, 0);
  grp.add(new THREE.Mesh(g, grassM));
  // откос от стены вниз
  const sh = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x + o * 0.2, BED_Y - 0.4, -230), new THREE.Vector3(x + o * 16, gY, -230), new THREE.Vector3(x + o * 16, gY, 230),
    new THREE.Vector3(x + o * 0.2, BED_Y - 0.4, -230), new THREE.Vector3(x + o * 16, gY, 230), new THREE.Vector3(x + o * 0.2, BED_Y - 0.4, 230),
  ]);
  grp.add(new THREE.Mesh(sh, new THREE.MeshBasicMaterial({ color: slopeM.color, side: THREE.DoubleSide })));
  const rng = mulberry32(hashStr(style.n + ':pano'));
  const crown = new THREE.IcosahedronGeometry(1, 0), trunk = new THREE.CylinderGeometry(0.18, 0.25, 1, 6);
  const N = 220;
  const ci = new THREE.InstancedMesh(crown, new THREE.MeshBasicMaterial({ color: 0x4f7a3a }), N);
  const ti = new THREE.InstancedMesh(trunk, new THREE.MeshBasicMaterial({ color: 0x5a4632 }), N);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    const d = 22 + Math.pow(rng(), 0.7) * 260, z = (rng() - 0.5) * 440, h = 6 + rng() * 9, r = 2.2 + rng() * 2.8;
    const tx = x + o * d;
    M4.compose(V.set(tx, gY + h * 0.4, z), Q.identity(), Sc.set(0.6, h * 0.8, 0.6)); ti.setMatrixAt(i, M4);
    M4.compose(V.set(tx, gY + h * 0.78, z), Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6), Sc.set(r, r * 1.1, r)); ci.setMatrixAt(i, M4);
    ci.setColorAt && ci.setColorAt(i, new THREE.Color().setHSL(0.24 + rng() * 0.06, 0.38, 0.28 + rng() * 0.12));
  }
  if (ci.instanceColor) ci.instanceColor.needsUpdate = true;
  grp.add(ti, ci);
  // небо — полуцилиндр с градиентом
  const c = makeCanvas(4, 256); const ctx = c.getContext('2d');
  const gr = ctx.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#7fa6cf'); gr.addColorStop(0.75, '#cfdde8'); gr.addColorStop(1, '#e6ecef');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 4, 256);
  const skyT = canvasTex(c, { mip: false });
  const cyl = new THREE.CylinderGeometry(330, 330, 160, 32, 1, true, o > 0 ? 0 : Math.PI, Math.PI);
  cyl.translate(x, gY + 70, 0);
  grp.add(new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false })));
}

// ---------- Станция с произвольной раскладкой путей и платформ ----------
// Боковые платформы, зал с одним путём, три и четыре пути, наземная станция с островной и береговой платформами.
// Собирается в системе, где наша платформа слева (как островная); если двери справа — зеркально.
export function* buildMultiSteps(route, st, line, L) {
  const style = st.style;
  const t = style.t;
  const grp = new THREE.Group();
  grp.name = 'station:' + st.name;
  const rng = mulberry32(hashStr(st.name));
  const near = (a, b) => Math.abs(a - b) < 0.06;
  const leftP = L.pl.some((p) => near(p[1], -1.48)), rightP = L.pl.some((p) => near(p[0], 1.48));
  const door = L.door || (leftP ? -1 : 1);
  const mirror = door > 0;
  const m = mirror ? -1 : 1;
  const TR = L.tr.map(([x, k, ln]) => ({ x: x * m, k, ln })).sort((a, b) => a.x - b.x);
  const PLs = L.pl.map(([a, b]) => [Math.min(a * m, b * m), Math.max(a * m, b * m)]).sort((a, b) => a[0] - b[0]);
  const our = PLs.find((p) => near(p[1], -1.48));
  const open = t === 'ground';
  const deep = !!style.deep;
  const info = { spots: [], exits: [], lights: [], signal: { set() {} }, clock: null, side: door, stairs: [], hq: false };
  let xMin = Math.min(...TR.map((r) => r.x - 2.25), ...PLs.map((p) => p[0]));
  let xMax = Math.max(...TR.map((r) => r.x + 2.25), ...PLs.map((p) => p[1]));
  if (L.hall) { const h = L.hall.map((v) => v * m).sort((a, b) => a - b); xMin = h[0]; xMax = h[1]; }
  const BK = st.bkl && HQ.ready && HQ.renderer && !open ? st.bkl : null;
  const vault = t === 'vault' && !open && !BK;
  const ch = BK ? BK.h ?? 5 : style.ch || (t === 'span' ? 4.8 : 4.4);
  const yC = vault ? 3.4 : PLAT_Y + ch;
  const vaultTop = vault ? 3.4 + Math.min(4.6, (xMax - xMin) * 0.45) : yC;
  const topY = vault ? vaultTop : yC;
  yield;
  const wallH = Math.round((yC - (BED_Y - 0.4)) * 10) / 10;
  const wTex = wallTexture(style, wallH, 2.1);
  yield;
  const wallMat = mat(wTex, 0.5);
  const floorMat = mat(floorTexture(style), 0.45);
  const ceilMat = mat(ceilingTexture(style), 0.55, { side: THREE.DoubleSide });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2826 });
  const edgeMat = new THREE.MeshLambertMaterial({ color: 0xd8d6cf, emissive: 0x3a3a38 });
  yield;
  // пути (контактный рельс — со стороны без платформы) и лотки
  for (const r of TR) {
    const plL = PLs.some((p) => near(p[1], r.x - 1.48)), plR = PLs.some((p) => near(p[0], r.x + 1.48));
    straightTrack(grp, r.x, -HZ, HZ, plL && !plR ? 1 : plR && !plL ? -1 : (r.x >= 0 ? 1 : -1));
  }
  grp.add(new THREE.Mesh(planeY(BED_Y, xMin, xMax, -HZ, HZ), new THREE.MeshLambertMaterial({ color: open ? 0x5f5a52 : 0x34312d })));
  // платформы
  const plG = [], sideG = [], edgeG = [], tact = [];
  for (const [a, b] of PLs) {
    plG.push(planeY(PLAT_Y, a, b, -PL, PL));
    for (const r of TR) {
      if (near(r.x - 1.48, b)) { sideG.push(wallX(b, BED_Y, PLAT_Y, -PL, PL, 1)); edgeG.push(planeY(PLAT_Y + 0.003, b - 0.35, b, -PL, PL, true, 1, 1)); tact.push(planeY(PLAT_Y + 0.005, b - 0.95, b - 0.6, -PL, PL, true, 1, 1)); }
      if (near(r.x + 1.48, a)) { sideG.push(wallX(a, BED_Y, PLAT_Y, -PL, PL, -1)); edgeG.push(planeY(PLAT_Y + 0.003, a, a + 0.35, -PL, PL, true, 1, 1)); tact.push(planeY(PLAT_Y + 0.005, a + 0.6, a + 0.95, -PL, PL, true, 1, 1)); }
    }
    sideG.push(endWallBox(a, b, BED_Y, PLAT_Y, -PL), endWallBox(a, b, BED_Y, PLAT_Y, PL));
  }
  if (!BK) grp.add(new THREE.Mesh(mergeGeoms(plG), floorMat));
  grp.add(new THREE.Mesh(mergeGeoms(sideG), darkMat));
  grp.add(new THREE.Mesh(mergeGeoms(edgeG), edgeMat));
  if (style.y >= 2010 && tact.length) grp.add(new THREE.Mesh(mergeGeoms(tact), new THREE.MeshLambertMaterial({ color: 0xe8c22a, emissive: 0x3a3008 })));
  yield;
  // колонны
  const cs = style.cs || 6.5;
  const zsCol = [];
  for (let z = -PL + cs * 0.75; z < PL - cs * 0.5; z += cs) zsCol.push(z);
  const rowsPlat = [], rowsBed = [];
  const me = TR.find((r) => r.k === 'me'), rev = TR.find((r) => r.k === 'rev');
  if (!open && !vault && !BK) {
    if ((L.cols === 'mid' || L.cols === 'alex') && rev) rowsBed.push((me.x + rev.x) / 2);
    if (L.cols === 'alex') for (const [a, b] of PLs) rowsPlat.push((a + b) / 2);
    if (L.cols === 'edge') for (const [a, b] of PLs) for (const r of TR) { if (near(r.x - 1.48, b)) rowsPlat.push(b - 0.9); if (near(r.x + 1.48, a)) rowsPlat.push(a + 0.9); }
    if (L.cols === 'isl') for (const [a, b] of PLs) if (b - a >= 6) rowsPlat.push(a + 2.15, b - 2.15);
  }
  const colRows = [...rowsPlat, ...rowsBed];
  if (rowsPlat.length) grp.add(buildColumns(style, rowsPlat.flatMap((x) => zsCol.map((z) => ({ x, z }))), yC - PLAT_Y, PLAT_Y));
  if (rowsBed.length) {
    // колонны между путями — от лотка; у «Александровского сада» средний ряд не облицован
    const st2 = L.cols === 'alex' ? { ...style, n: style.n + ':mid', c: '#bdb8ac', csh: style.csh } : style;
    grp.add(buildColumns(st2, rowsBed.flatMap((x) => zsCol.map((z) => ({ x, z }))), yC - BED_Y, BED_Y));
  }
  if (colRows.length) {
    const beam = new THREE.MeshLambertMaterial({ color: shade(style.ce || '#e8e8e4', -0.08), emissive: new THREE.Color(style.ce || '#e8e8e4').multiplyScalar(0.4) });
    grp.add(new THREE.Mesh(mergeGeoms(colRows.map((x) => boxGeom(0.7, 0.45, 2 * HZ, x, yC - 0.22, 0))), beam));
  }
  yield;
  // потолок, стены, светильники
  const lampG = style.l === 'led' ? new THREE.BoxGeometry(0.12, 0.04, 6) : new THREE.BoxGeometry(0.25, 0.05, 2.6);
  const lampsP = [];
  if (open) {
    // навесы над платформами (как у «Кунцевской»): плита на ряду колонн, светильники, названия
    const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#b8b4aa'), side: THREE.DoubleSide });
    const roofY = PLAT_Y + 3.9;
    const slabs = [], cols = [];
    for (const [a, b] of PLs) {
      const trackL = TR.some((r) => near(r.x + 1.48, a)), trackR = TR.some((r) => near(r.x - 1.48, b));
      const xc = trackL && trackR ? (a + b) / 2 : trackL ? b - 1.2 : a + 1.2; // у береговой — ряд у задней кромки
      slabs.push(boxGeom(b - a + 0.6, 0.28, 2 * PL - 2, (a + b) / 2, roofY + 0.14, 0), boxGeom(0.6, 0.55, 2 * PL - 2, xc, roofY - 0.2, 0));
      for (let z = -PL + 4; z <= PL - 4; z += 6.5) cols.push(boxGeom(0.55, roofY - PLAT_Y, 0.55, xc, (roofY + PLAT_Y) / 2, z));
      for (let z = -PL + 6; z < PL - 4; z += 4) lampsP.push({ x: (a + b) / 2, y: roofY - 0.02, z });
    }
    grp.add(new THREE.Mesh(mergeGeoms(slabs), conc));
    grp.add(new THREE.Mesh(mergeGeoms(cols), mat(columnTexture({ ...style, csh: 'sq' }), 0.5)));
    grp.add(lampsMesh(new THREE.BoxGeometry(0.22, 0.04, 1.6), lampsP));
    const tex = nameTexture(style.n, 'plate');
    const nm = new THREE.MeshBasicMaterial({ map: tex });
    grp.add(new THREE.Mesh(mergeGeoms(PLs.flatMap(([a, b]) => [-50, -10, 30, 70].flatMap((z) => signPair(0.6 * tex.userData.aspect, 0.6, (a + b) / 2, roofY - 0.75, z)))), nm));
  } else if (BK) {
    yield* buildBKL(grp, { PLs, TR: TR.map((r) => r.x), xMin, xMax, PL, HZ, PLAT_Y, BED_Y, info, name: st.name, title: style.n, our, spots: false }, BK);
  } else {
    if (vault) {
      const xc = (xMin + xMax) / 2, rx = (xMax - xMin) / 2;
      grp.add(new THREE.Mesh(profileZ(arc(xc, 3.4, rx, vaultTop - 3.4, 0, Math.PI, 36), -HZ, HZ, 4, 4), ceilMat));
      for (let z = -PL + 3; z < PL; z += 6) for (const a of [0.6, Math.PI - 0.6]) lampsP.push({ x: xc + Math.cos(a) * rx * 0.985, y: 3.4 + Math.sin(a) * (vaultTop - 3.4) * 0.985, z });
      // бра-шары вдоль платформ
      const balls = [];
      for (const [a, b] of PLs) for (let z = -PL + 6; z < PL; z += 9) balls.push({ x: (a + b) / 2, y: 3.3, z });
      if (balls.length) grp.add(lampsMesh(new THREE.SphereGeometry(0.26, 12, 8), balls));
    } else {
      grp.add(new THREE.Mesh(planeY(yC, xMin, xMax, -HZ, HZ, false), ceilMat));
      for (let z = -PL + 4; z < PL; z += (style.l === 'led' ? 7 : 4)) {
        for (const [a, b] of PLs) lampsP.push({ x: (a + b) / 2, y: yC - 0.03, z });
        for (const r of TR) lampsP.push({ x: r.x, y: yC - 0.03, z });
      }
    }
    grp.add(lampsMesh(lampG, lampsP));
    grp.add(new THREE.Mesh(mergeGeoms([wallX(xMin, BED_Y - 0.4, yC, -HZ, HZ, 1), wallX(xMax, BED_Y - 0.4, yC, -HZ, HZ, -1)]), wallMat));
    const zs = []; for (let z = -PL + 12; z < PL - 5; z += 26) zs.push(z);
    nameBoards(grp, style, xMin, 1, 2.7, zs);
    nameBoards(grp, style, xMax, -1, 2.7, zs);
  }
  yield;
  // торцы: стены с проёмами тоннелей всех путей, у платформ — проходы к выходам
  if (!open) {
    const endMat = mat(concreteTexture('#d4d2cc'), 0.4, { side: THREE.DoubleSide }); // общая текстура, цвет станции — через color
    endMat.color = new THREE.Color(style.w);
    const holes = TR.map((r) => r.x);
    grp.add(new THREE.Mesh(mergeGeoms([
      endWall(-HZ, xMin, xMax, BED_Y - 0.4, topY, holes, deep, 1, []),
      endWall(HZ, xMin, xMax, BED_Y - 0.4, topY, holes, deep, -1, []),
    ]), endMat));
    const ew = mat(wTex, 0.45, { side: THREE.DoubleSide });
    const ends = [], pockets = [], cor = [], corF = [];
    for (const [a, b] of PLs) {
      const xm = (a + b) / 2, hw = Math.min(1.6, (b - a) / 2 - 0.3);
      const rect = [xm - hw, xm + hw, PLAT_Y, PLAT_Y + 2.6];
      for (const zz of [-PL, PL]) {
        ends.push(wallZHole(a, b, BED_Y - 0.4, topY, zz, rect));
        const z1 = zz + Math.sign(zz) * 3;
        corF.push(planeY(PLAT_Y + 0.001, xm - hw, xm + hw, Math.min(zz, z1), Math.max(zz, z1)));
        cor.push(wallX(xm - hw, PLAT_Y, PLAT_Y + 2.6, Math.min(zz, z1), Math.max(zz, z1), 1), wallX(xm + hw, PLAT_Y, PLAT_Y + 2.6, Math.min(zz, z1), Math.max(zz, z1), -1));
        cor.push(planeY(PLAT_Y + 2.6, xm - hw, xm + hw, Math.min(zz, z1), Math.max(zz, z1), false), wallZ(xm - hw, xm + hw, PLAT_Y, PLAT_Y + 2.6, z1));
      }
      for (const r of TR) {
        if (near(r.x - 1.48, b)) pockets.push(wallX(b, BED_Y - 0.4, topY, -HZ, -PL, 1), wallX(b, BED_Y - 0.4, topY, PL, HZ, 1));
        if (near(r.x + 1.48, a)) pockets.push(wallX(a, BED_Y - 0.4, topY, -HZ, -PL, -1), wallX(a, BED_Y - 0.4, topY, PL, HZ, -1));
      }
      if (a - 0.05 > xMin) pockets.push(wallX(a, BED_Y - 0.4, topY, -HZ, -PL, -1), wallX(a, BED_Y - 0.4, topY, PL, HZ, -1));
      if (b + 0.05 < xMax) pockets.push(wallX(b, BED_Y - 0.4, topY, -HZ, -PL, 1), wallX(b, BED_Y - 0.4, topY, PL, HZ, 1));
      // указатель выхода над проходом
      const exitSign = signTexture(['Выход в город'], { bg: '#1f2733', w: 512, h: 96 });
      for (const zz of [-PL, PL]) {
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.45), new THREE.MeshBasicMaterial({ map: exitSign }));
        sg.position.set(xm, PLAT_Y + 2.95, zz + (zz < 0 ? 0.06 : -0.06));
        if (zz > 0) sg.rotation.y = Math.PI;
        grp.add(sg);
      }
    }
    grp.add(new THREE.Mesh(mergeGeoms(ends), ew));
    if (pockets.length) grp.add(new THREE.Mesh(mergeGeoms(pockets), endMat));
    grp.add(new THREE.Mesh(mergeGeoms(cor), new THREE.MeshLambertMaterial({ color: 0x3a3632, side: THREE.DoubleSide })));
    grp.add(new THREE.Mesh(mergeGeoms(corF), floorMat));
    for (const zz of [-PL, PL]) info.exits.push({ x: (our[0] + our[1]) / 2, z: zz + Math.sign(zz) * 1.6, y: PLAT_Y });
    // знак «СТОП» на столбике у края нашей платформы, светофор в устье тоннеля, часы над тоннелем
    const m2 = sharedMats();
    const stopTex = signTexture(['СТОП'], { bg: '#ffffff', fg: '#c81e1e', w: 256, h: 128 });
    const stop = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: stopTex }));
    stop.rotation.y = Math.PI / 2;
    stop.position.set(-1.48 - 0.3, 2.4, -STOP_OFFSET - 1.5);
    grp.add(stop, new THREE.Mesh(boxGeom(0.06, 2.0, 0.06, -1.48 - 0.36, PLAT_Y + 1.0, -STOP_OFFSET - 1.5), m2.sigPost));
    const sig = new THREE.Group();
    sig.add(new THREE.Mesh(boxGeom(0.3, 0.75, 0.2, 0, 0, 0), m2.sigPost));
    const red = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), m2.red);
    const green = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), m2.off);
    red.position.set(0, 0.17, -0.105); green.position.set(0, -0.17, -0.105);
    red.rotation.y = Math.PI; green.rotation.y = Math.PI;
    sig.add(red, green);
    sig.position.set(1.85, 2.6, -HZ - 2);
    grp.add(sig);
    info.signal = { set(ok) { red.material = ok ? m2.off : m2.red; green.material = ok ? m2.green : m2.off; } };
    const clk = makeClock();
    clk.mesh.position.set(0, deep ? 4.75 : Math.min(yC - 0.35, 4.6), -HZ + 0.05);
    grp.add(clk.mesh);
    info.clock = clk;
  } else {
    for (const zz of [-PL, PL]) info.exits.push({ x: (our[0] + our[1]) / 2, z: zz + (zz < 0 ? 3 : -3), y: PLAT_Y });
  }
  yield;
  // подвесные указатели над краями платформ, скамейки
  const sTex = signTexture([st.name], { bg: '#1f2733', w: 1024, h: 128, line });
  const sg = [], bench = [];
  const sy = open ? PLAT_Y + 3.2 : Math.min(yC - 0.7, 4.2);
  for (const [a, b] of PLs) {
    for (let z = -PL + 20; z < PL; z += 40) {
      if (TR.some((r) => near(r.x - 1.48, b))) sg.push(...signPair(3.6, 0.45, b - 0.6, sy, z));
      if (TR.some((r) => near(r.x + 1.48, a))) sg.push(...signPair(3.6, 0.45, a + 0.6, sy, z));
    }
    if (b - a > 2.5) for (let z = -PL + 14; z < PL - 10; z += 18) bench.push(boxGeom(0.5, 0.45, 2.4, (a + b) / 2 + (colRows.some((x) => Math.abs(x - (a + b) / 2) < 0.8) ? 0.9 : 0), PLAT_Y + 0.22, z));
  }
  grp.add(new THREE.Mesh(mergeGeoms(sg), new THREE.MeshBasicMaterial({ map: sTex })));
  if (bench.length) grp.add(new THREE.Mesh(mergeGeoms(bench), new THREE.MeshLambertMaterial({ color: 0x6a4a2e, emissive: 0x1a120a })));
  // для толпы, камеры и пула светильников
  const xm = (our[0] + our[1]) / 2;
  for (let z = -PL + 10; z < PL - 10; z += 9) info.spots.push({ x: xm + (colRows.some((x) => Math.abs(x - xm) < 0.8) ? 0.9 : 0), z: z + 4.5 });
  for (let z = -PL + 15; z < PL; z += 33) { info.lights.push(new THREE.Vector3(xm, (open ? PLAT_Y + 3.4 : yC - 0.6), z)); for (const [a, b] of PLs) if (b !== our[1]) info.lights.push(new THREE.Vector3((a + b) / 2, open ? PLAT_Y + 3.4 : yC - 0.6, z + 12)); }
  info.platform = { x0: our[0] + 0.6, x1: -1.48 - 0.5, z0: -PL + 3, z1: PL - 3, y: PLAT_Y };
  info.noCam = [];
  info.colRows = colRows;
  info.W = our[1] - our[0];
  info.ceilY = open ? PLAT_Y + 3.9 : yC;
  info.camY = open ? 7.5 : yC - 0.4;
  info.camX = [Math.max(xMin + 0.4, our[0] + 0.4), 1.9];
  info.oppX = rev ? rev.x : our[0] - 1.48;
  info.layOpp = rev ? rev.x * m : null;
  info.lay = L;
  placeStation(grp, route, st, mirror);
  return { group: grp, info, st };
}
