// Генерация станции по описанию оформления (см. data/lines.js).
// Локальная система станции: начало — центр платформы на оси нашего пути, уровень головки рельса;
// вперёд по ходу = -Z, вправо = +X. Платформа островная — слева от поезда.
import * as THREE from 'three';
import { wallTexture, floorTexture, ceilingTexture, columnTexture, pylonTexture, nameTexture, signTexture, glowTexture, concreteTexture } from './textures.js';
import { sharedMats, TUBE_R, TUBE_CY, BED_Y, BOX_W, BOX_TOP } from './tunnel.js';
import { mergeGeoms, boxGeom, cylGeom, shade, mulberry32, hashStr, makeCanvas, canvasTex } from './util.js';
import { HALL_HALF, STOP_OFFSET } from './route.js';

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
function endWall(z, x0, x1, y0, y1, holes, deep, facing) {
  const sh = new THREE.Shape();
  sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.lineTo(x0, y0);
  for (const hx of holes) {
    const p = new THREE.Path();
    if (deep) p.absarc(hx, TUBE_CY, TUBE_R, 0, Math.PI * 2, true);
    else { p.moveTo(hx - BOX_W, BED_Y - 0.5); p.lineTo(hx - BOX_W, BOX_TOP); p.lineTo(hx + BOX_W, BOX_TOP); p.lineTo(hx + BOX_W, BED_Y - 0.5); p.lineTo(hx - BOX_W, BED_Y - 0.5); }
    sh.holes.push(p);
  }
  const g = new THREE.ShapeGeometry(sh, 24);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
  void facing;
  g.translate(0, 0, z);
  return g;
}

function straightTrack(grp, x, z0, z1) {
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
  const sgn = x < -5 ? -1 : 1;
  grp.add(new THREE.Mesh(boxGeom(0.1, 0.11, L, x + sgn * 1.52, 0.115, zc), m.third));
  grp.add(new THREE.Mesh(boxGeom(0.32, 0.03, L, x + sgn * 1.56, 0.27, zc), m.cover));
}

// Часы-интервальник над тоннелем
export function makeClock() {
  const c = makeCanvas(352, 64);
  const tex = canvasTex(c, { mip: false });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
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

export function buildStation(route, st, line) {
  const style = st.style;
  const grp = new THREE.Group();
  grp.name = 'station:' + st.name;
  const rng = mulberry32(hashStr(st.name));
  const t = style.t;
  const deep = !!style.deep;
  const info = { spots: [], exits: [], lights: [], signal: null, clock: null, oppX: 0 };

  // геометрия поперечника по типу
  let W = 10; // ширина платформы
  if (t === 'pylon' || t === 'cold') W = 19;
  if (t === 'bridge') W = 14;
  const xFar = EDGE_X - W; // дальний край платформы
  const oppX = xFar - 1.48; // ось встречного пути
  info.oppX = oppX;
  const ch = style.ch || (t === 'span' ? 4.8 : 4.2);
  const yC = PLAT_Y + ch;
  const rightWall = t === 'pylon' || t === 'cold' ? 2.3 : 2.25;
  const leftWall = oppX - (rightWall);

  const wallH = (t === 'pylon' || t === 'cold') ? 4.2 - (BED_Y - 0.4) : (t === 'vault' ? 3.4 - (BED_Y - 0.4) : yC - (BED_Y - 0.4));
  const wTex = wallTexture(style, Math.round(wallH * 10) / 10, 2.1);
  const wallMat = style.wp === 'glass'
    ? new THREE.MeshLambertMaterial({ color: style.w, transparent: true, opacity: 0.28, emissive: 0x223333, side: THREE.DoubleSide, depthWrite: false })
    : mat(wTex, 0.5);
  const floorMat = mat(floorTexture(style), 0.45);
  const ceilMat = mat(ceilingTexture(style), 0.55, { side: THREE.DoubleSide });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2826 });
  const edgeMat = new THREE.MeshLambertMaterial({ color: 0xd8d6cf, emissive: 0x3a3a38 });

  // пути
  straightTrack(grp, 0, -HZ, HZ);
  straightTrack(grp, oppX, -HZ, HZ);
  // лотки путей
  const pitMat = new THREE.MeshLambertMaterial({ color: 0x34312d });
  grp.add(new THREE.Mesh(mergeGeoms([planeY(BED_Y, EDGE_X, rightWall, -HZ, HZ), planeY(BED_Y, leftWall, xFar, -HZ, HZ)]), pitMat));

  // платформа
  grp.add(new THREE.Mesh(planeY(PLAT_Y, xFar, EDGE_X, -PL, PL), floorMat));
  const edgeG = [planeY(PLAT_Y + 0.003, EDGE_X - 0.35, EDGE_X, -PL, PL, true, 1, 1), planeY(PLAT_Y + 0.003, xFar, xFar + 0.35, -PL, PL, true, 1, 1)];
  grp.add(new THREE.Mesh(mergeGeoms(edgeG), edgeMat));
  grp.add(new THREE.Mesh(mergeGeoms([
    wallX(EDGE_X, BED_Y, PLAT_Y, -PL, PL, 1), wallX(xFar, BED_Y, PLAT_Y, -PL, PL, -1),
    endWallBox(xFar, EDGE_X, BED_Y, PLAT_Y, -PL), endWallBox(xFar, EDGE_X, BED_Y, PLAT_Y, PL),
  ]), darkMat));
  // тактильная полоса на новых станциях
  if (style.y >= 2010) grp.add(new THREE.Mesh(mergeGeoms([planeY(PLAT_Y + 0.005, EDGE_X - 0.95, EDGE_X - 0.6, -PL, PL, true, 1, 1), planeY(PLAT_Y + 0.005, xFar + 0.6, xFar + 0.95, -PL, PL, true, 1, 1)]), new THREE.MeshLambertMaterial({ color: 0xe8c22a, emissive: 0x3a3008 })));

  // путевые стены
  if (t !== 'ground' && t !== 'bridge') {
    const top = (t === 'pylon' || t === 'cold') ? 4.2 : t === 'vault' ? 3.4 : yC;
    grp.add(new THREE.Mesh(mergeGeoms([wallX(rightWall, BED_Y - 0.4, top, -HZ, HZ, -1), wallX(leftWall, BED_Y - 0.4, top, -HZ, HZ, 1)]), wallMat));
  }

  const colRows = [];
  const lampsP = [];
  const lampGeom = { strip: new THREE.BoxGeometry(0.25, 0.05, 2.6), ball: new THREE.SphereGeometry(0.28, 12, 8), led: new THREE.BoxGeometry(0.12, 0.04, 6) };

  if (t === 'col' || t === 'span' || t === 'ground' || t === 'bridge') {
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

  if (t === 'pylon' || t === 'cold') {
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

  if (t === 'vault') {
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

  // торцевые стены с проёмами тоннелей
  if (t !== 'ground' && t !== 'bridge') {
    const topY = (t === 'pylon' || t === 'cold') ? 9.5 : t === 'vault' ? 8.2 : yC;
    const endMat = mat(concreteTexture(shade(style.w, -0.1).slice(0, 7)), 0.4, { side: THREE.DoubleSide });
    endMat.color = new THREE.Color(style.wp === 'glass' ? '#cccccc' : style.w);
    grp.add(new THREE.Mesh(mergeGeoms([
      endWall(-HZ, leftWall, rightWall, BED_Y - 0.4, topY, [0, oppX], deep, 1),
      endWall(HZ, leftWall, rightWall, BED_Y - 0.4, topY, [0, oppX], deep, -1),
    ]), endMat));
    // торцы платформы (стены за платформой)
    const ew = mat(wTex, 0.45, { side: THREE.DoubleSide });
    grp.add(new THREE.Mesh(mergeGeoms([wallZ(xFar, EDGE_X, PLAT_Y, topY, -PL), wallZ(xFar, EDGE_X, PLAT_Y, topY, PL)]), ew));
    // выходы-лестницы у торцов
    for (const zz of [-PL, PL]) {
      const dir = zz < 0 ? 1 : -1;
      const xm = (EDGE_X + xFar) / 2;
      const steps = [];
      for (let i = 0; i < 12; i++) steps.push(boxGeom(4.2, 0.17 * (i + 1), 0.32, xm, PLAT_Y + 0.085 * (i + 1), zz + dir * (8 - i * 0.32)));
      grp.add(new THREE.Mesh(mergeGeoms(steps), floorMat));
      grp.add(new THREE.Mesh(boxGeom(4.4, 2.4, 0.1, xm, PLAT_Y + 2.04 + 1.2, zz + dir * 0.06), new THREE.MeshBasicMaterial({ color: 0xf6efe0 })));
      info.exits.push({ x: xm, z: zz + dir * 4.5, y: PLAT_Y + 1.0 });
      const exitSign = signTexture(['Выход в город'], { bg: '#1f2733', w: 512, h: 96 });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.48), new THREE.MeshBasicMaterial({ map: exitSign }));
      sg.position.set(xm, PLAT_Y + 3.0, zz + dir * 9);
      if (dir < 0) sg.rotation.y = Math.PI;
      grp.add(sg);
    }
  } else {
    for (const zz of [-PL, PL]) info.exits.push({ x: (EDGE_X + xFar) / 2, z: zz + (zz < 0 ? 3 : -3), y: PLAT_Y });
  }

  // название станции на путевых стенах
  const nameY = t === 'vault' ? 2.6 : 2.7;
  const zs = [];
  for (let z = -PL + 12; z < PL - 5; z += 26) zs.push(z);
  if (t !== 'ground' && t !== 'bridge') {
    nameBoards(grp, style, rightWall, -1, nameY, zs);
    nameBoards(grp, style, leftWall, 1, nameY, zs);
  }
  // подвесные указатели над краем платформы
  const sTex = signTexture([st.name], { bg: '#1f2733', w: 1024, h: 128, line });
  const signMat = new THREE.MeshBasicMaterial({ map: sTex });
  const sgns = [];
  const sy = (t === 'pylon' || t === 'cold') ? 3.85 : Math.min(yC - 0.7, 4.2);
  for (let z = -PL + 20; z < PL; z += 40) {
    sgns.push(...signPair(3.6, 0.45, EDGE_X - 0.6, sy, z), ...signPair(3.6, 0.45, xFar + 0.6, sy, z));
  }
  grp.add(new THREE.Mesh(mergeGeoms(sgns), signMat));

  // остановочный знак «СТОП» и выходной светофор
  const stopTex = signTexture(['СТОП'], { bg: '#ffffff', fg: '#c81e1e', w: 256, h: 128 });
  const stop = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: stopTex }));
  stop.rotation.y = -Math.PI / 2;
  stop.position.set(rightWall - 0.05, 2.4, -STOP_OFFSET - 1.5);
  grp.add(stop);
  if (t === 'ground' || t === 'bridge') { stop.position.x = 2.0; stop.position.y = 2.2; }
  const m = sharedMats();
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
  // часы над тоннелем
  if (t !== 'ground' && t !== 'bridge') {
    const clk = makeClock();
    clk.mesh.position.set(0, deep ? 4.75 : Math.min(yC - 0.35, 4.6), -HZ + 0.05);
    grp.add(clk.mesh);
    info.clock = clk;
  }

  // позиции точечных светильников для пула освещения
  const xm = (EDGE_X + xFar) / 2;
  for (let z = -PL + 15; z < PL; z += 33) info.lights.push(new THREE.Vector3(xm, yC - 0.6, z), new THREE.Vector3(1.0, Math.min(yC, 5) - 0.6, z + 12));
  info.platform = { x0: xFar + 0.6, x1: EDGE_X - 0.5, z0: -PL + 3, z1: PL - 3, y: PLAT_Y };
  info.colRows = colRows;
  info.W = W;
  info.ceilY = yC;

  grp.applyMatrix4(route.matrixAt(st.c, new THREE.Matrix4(), true));
  grp.updateMatrixWorld(true);
  return { group: grp, info, st };
}

// табличка, читаемая с обеих сторон (две односторонние плоскости вдоль Z)
function signPair(w, h, x, y, z) {
  const a = new THREE.PlaneGeometry(w, h); a.rotateY(Math.PI / 2); a.translate(x + 0.01, y, z);
  const b = new THREE.PlaneGeometry(w, h); b.rotateY(-Math.PI / 2); b.translate(x - 0.01, y, z);
  return [a, b];
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
