// Развилка (вилочное движение, «Киевская» Филёвской линии): камера съезда, где от нашего пути
// стрелкой отходит второй путь, разделительная стенка («нос») и уходящий в сторону тоннель
// второго направления. Второй путь — это трасса другого маршрута той же линии (G), совмещённая
// с нашей (R) в точке стрелки.
import * as THREE from 'three';
import { sharedMats, geomsShared, buildTrack, buildTunnelChunk, BOX_W, BOX_TOP, BED_Y } from './tunnel.js';
import { FORK_LC, FORK_FIX } from './route.js';
import { mergeGeoms } from './util.js';

// матрица, переводящая трассу G в систему R (стрелки совпадают), и боковое смещение второго пути
export function forkAlign(R, G) {
  if (R._forkAl && R._forkAl.G === G) return R._forkAl;
  const F = R.fork, FG = G.fork;
  const M = R.matrixAt(F.J, new THREE.Matrix4()).multiply(G.matrixAt(FG.J, new THREE.Matrix4()).invert());
  const fo = {}, fg = {}, v = new THREE.Vector3();
  // точка второго пути при том же удалении от стрелки
  const gs = (s) => FG.J + (s - F.J);
  const ghostFrame = (s, out = {}) => {
    G.frameAt(gs(s), fg);
    out.pos = (out.pos || new THREE.Vector3()).copy(fg.pos).applyMatrix4(M);
    const n3 = new THREE.Matrix3().setFromMatrix4(M);
    out.right = (out.right || new THREE.Vector3()).copy(fg.right).applyMatrix3(n3);
    out.up = (out.up || new THREE.Vector3()).copy(fg.up).applyMatrix3(n3);
    return out;
  };
  const off = (s) => { R.frameAt(s, fo); const g = ghostFrame(s); return v.copy(g.pos).sub(fo.pos).dot(fo.right); };
  const side = Math.sign(off(F.J + F.sg * FORK_LC)) || 1;
  R._forkAl = { G, M, gs, ghostFrame, off, side };
  return R._forkAl;
}

// полоса между двумя линиями точек (стена/потолок/пол камеры) с плоской нормалью
function strip(rows, normal, { uScale = 2, vScale = 2, bake = null }) {
  const n = rows.length;
  const pos = new Float32Array(n * 2 * 3), nor = new Float32Array(n * 2 * 3), uv = new Float32Array(n * 2 * 2), bk = new Float32Array(n * 2);
  rows.forEach((r, i) => {
    const w = r.a.distanceTo(r.b);
    for (let j = 0; j < 2; j++) {
      const p = j ? r.b : r.a, k = i * 2 + j;
      pos.set([p.x, p.y, p.z], k * 3);
      const N = normal(r);
      nor.set([N.x, N.y, N.z], k * 3);
      uv.set([j ? w / uScale : 0, r.s / vScale], k * 2);
      bk[k] = bake ? bake(r.s, j ? r.xb : r.xa, j ? r.yb : r.ya) : 0;
    }
  });
  // порядок обхода — по заданной нормали (материалы двусторонние, но свет считается по лицевой стороне)
  let flip = false;
  if (n > 1) {
    const p0 = rows[0].a, p1 = rows[0].b, p2 = rows[1].a;
    const gN = new THREE.Vector3().subVectors(p2, p0).cross(new THREE.Vector3().subVectors(p1, p0));
    flip = gN.dot(normal(rows[0])) < 0;
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('bake', new THREE.BufferAttribute(bk, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function buildFork(R, G) {
  const F = R.fork;
  const A = forkAlign(R, G);
  const side = A.side; // +1 — второй путь справа от нашего
  const m = sharedMats(), gm = geomsShared();
  const grp = new THREE.Group();
  grp.name = 'fork';
  const a = F.a, b = F.b; // камера съезда (наши s)
  const sN = F.sg > 0 ? b : a; // «нос» — конец камеры, где пути расходятся по тоннелям
  // светильники камеры — на обеих наружных стенах через 12 м
  const lampS = [];
  for (let s = Math.ceil(a / 12) * 12; s <= b; s += 12) lampS.push(s);
  const bake = (s, x, y) => {
    let v = 0.04;
    for (const q of lampS) {
      const ds = s - q;
      v += 0.7 * Math.exp(-(ds * ds + (y - 2.3) ** 2) / 16) + 0.1 * Math.exp(-(ds * ds) / 120);
    }
    const dJ = Math.abs(s - F.J);
    return Math.min(1.1, v + (dJ > FORK_LC ? 0 : 0.03));
  };
  // ряды точек вдоль камеры
  const fo = {}, gf = {};
  const N = Math.max(2, Math.ceil((b - a) / 1.5) + 1);
  const rows = [];
  for (let i = 0; i < N; i++) {
    const s = a + (b - a) * (i / (N - 1));
    R.frameAt(s, fo);
    A.ghostFrame(s, gf);
    const inner = (y) => fo.pos.clone().addScaledVector(fo.right, -side * BOX_W).addScaledVector(fo.up, y); // наша дальняя стена
    const outer = (y) => gf.pos.clone().addScaledVector(gf.right, side * BOX_W).addScaledVector(gf.up, y); // стена второго пути
    const d = A.off(s);
    rows.push({ s, inB: inner(BED_Y), inT: inner(BOX_TOP), outB: outer(BED_Y), outT: outer(BOX_TOP), d, right: fo.right.clone(), up: fo.up.clone(), gRight: gf.right.clone() });
  }
  const conc = m.box;
  const wallIn = strip(rows.map((r) => ({ s: r.s, a: r.inB, b: r.inT, xa: -side * BOX_W, xb: -side * BOX_W, ya: BED_Y, yb: BOX_TOP, n: r.right.clone().multiplyScalar(side) })), (r) => r.n, { bake });
  const wallOut = strip(rows.map((r) => ({ s: r.s, a: r.outB, b: r.outT, xa: r.d + side * BOX_W, xb: r.d + side * BOX_W, ya: BED_Y, yb: BOX_TOP, n: r.gRight.clone().multiplyScalar(-side) })), (r) => r.n, { bake });
  const ceil = strip(rows.map((r) => ({ s: r.s, a: r.inT, b: r.outT, xa: -side * BOX_W, xb: r.d + side * BOX_W, ya: BOX_TOP, yb: BOX_TOP, n: r.up.clone().negate() })), (r) => r.n, { bake });
  grp.add(new THREE.Mesh(mergeGeoms([wallIn, wallOut, ceil]), conc));
  const floor = strip(rows.map((r) => ({ s: r.s, a: r.inB, b: r.outB, xa: -side * BOX_W, xb: r.d + side * BOX_W, ya: BED_Y, yb: BED_Y, n: r.up.clone() })), (r) => r.n, { bake, uScale: 3.2, vScale: 3.2 });
  grp.add(new THREE.Mesh(floor, m.bed));
  // «нос»: торец разделительной стенки между тоннелями
  {
    R.frameAt(sN, fo);
    const d = A.off(sN);
    const x0 = side * BOX_W, x1 = d - side * BOX_W;
    const P = (x, y) => fo.pos.clone().addScaledVector(fo.right, x).addScaledVector(fo.up, y);
    const nrm = fo.fwd.clone().multiplyScalar(-F.sg);
    let pts = [P(x0, BED_Y), P(x1, BED_Y), P(x1, BOX_TOP), P(x0, BOX_TOP)];
    if (new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).dot(nrm) < 0) pts = [pts[1], pts[0], pts[3], pts[2]];
    const g = new THREE.BufferGeometry().setFromPoints([pts[0], pts[1], pts[2], pts[0], pts[2], pts[3]]);
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, 1, 2, 3, 4, 5].flatMap(() => [nrm.x, nrm.y, nrm.z])), 3));
    const w = Math.abs(x1 - x0);
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, w / 2, 0, w / 2, 2.2, 0, 0, w / 2, 2.2, 0, 2.2]), 2));
    g.setAttribute('bake', new THREE.BufferAttribute(new Float32Array([0, 1, 2, 3, 4, 5].map((i) => bake(sN, 0, i === 2 || i === 4 || i === 5 ? BOX_TOP : BED_Y))), 1));
    grp.add(new THREE.Mesh(g, conc));
    // сигнальные полосы на носу
    const stripeM = new THREE.MeshBasicMaterial({ color: 0xd8c23a });
    const sg2 = [];
    for (let k = 0; k < 3; k++) {
      const y = 0.4 + k * 0.5;
      const q = [P(x0, y), P(x1, y), P(x1, y + 0.18), P(x0, y + 0.18)].map((p) => p.addScaledVector(fo.fwd, -F.sg * 0.02));
      sg2.push(new THREE.BufferGeometry().setFromPoints([q[0], q[1], q[2], q[0], q[2], q[3]]));
    }
    grp.add(new THREE.Mesh(mergeGeoms(sg2), stripeM));
  }
  // наш путь: без контактного рельса со стороны второго пути, балласт — пол камеры
  grp.add(buildTrack(R, a, b, { bed: false, bake, third: side < 0 }));
  // второй путь: от остряков стрелки до носа (шпалы чуть ниже наших — без мерцания)
  const g0 = A.gs(F.J + F.sg * 6), g1 = A.gs(sN);
  const gt = buildTrack(G, Math.min(g0, g1), Math.max(g0, g1), { bed: false, third: side > 0, sleeperY: -0.236 });
  gt.applyMatrix4(A.M);
  grp.add(gt);
  // стрелочный привод
  {
    R.frameAt(F.J + F.sg * 2.5, fo);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.9), new THREE.MeshLambertMaterial({ color: 0x3d4a3a }));
    box.position.copy(fo.pos).addScaledVector(fo.right, -side * 1.32).addScaledVector(fo.up, -0.1);
    box.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fo.right, fo.up, fo.back));
    grp.add(box);
    const rod = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.05), m.bracket);
    rod.position.copy(fo.pos).addScaledVector(fo.right, -side * 0.6).addScaledVector(fo.up, -0.12);
    rod.quaternion.copy(box.quaternion);
    grp.add(rod);
  }
  // светильники и кабели на стенах камеры
  const lampGeo = [], houseGeo = [];
  for (const s of lampS) {
    R.frameAt(s, fo); A.ghostFrame(s, gf);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fo.right, fo.up, fo.back));
    for (const [p, dir] of [[fo.pos.clone().addScaledVector(fo.right, -side * (BOX_W - 0.08)), -side], [gf.pos.clone().addScaledVector(gf.right, side * (BOX_W - 0.08)), side]]) {
      const l = gm.lamp.clone(); l.applyQuaternion(q); l.translate(p.x - fo.right.x * dir * 0.04, p.y + 2.3, p.z - fo.right.z * dir * 0.04);
      const h = gm.lampHouse.clone(); h.applyQuaternion(q); h.translate(p.x, p.y + 2.3, p.z);
      lampGeo.push(l); houseGeo.push(h);
    }
  }
  if (lampGeo.length) { grp.add(new THREE.Mesh(mergeGeoms(lampGeo), m.lamp)); grp.add(new THREE.Mesh(mergeGeoms(houseGeo), m.lampHouse)); }
  // тоннель второго пути за носом — уходит в темноту
  const ga = A.gs(sN) - F.sg * 0.6;
  const gb = FG(G).J + F.sg * FORK_FIX;
  const t0 = Math.min(ga, gb), t1 = Math.max(ga, gb);
  const far = F.sg > 0 ? t1 : t0, near = F.sg > 0 ? t1 - 70 : t0 + 70;
  const gtun = buildTunnelChunk(G, t0, t1, false, { fade: [near, far] });
  // торец в глубине — чёрный
  {
    const f2 = G.frameAt(far);
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(BOX_W * 2 + 0.2, BOX_TOP - BED_Y + 0.2), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }));
    cap.position.copy(f2.pos).addScaledVector(f2.up, (BOX_TOP + BED_Y) / 2);
    cap.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f2.right, f2.up, f2.back));
    gtun.add(cap);
  }
  gtun.applyMatrix4(A.M);
  grp.add(gtun);
  return grp;
}
function FG(G) { return G.fork; }
