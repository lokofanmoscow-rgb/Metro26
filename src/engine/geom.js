// Построение геометрии вдоль трассы (протяжка сечения), запечённое освещение.
import * as THREE from 'three';

// Материал Ламберта с дополнительным «запечённым» светом (атрибут bake),
// который добавляется как самосвечение: так в тоннеле видны пятна от светильников,
// а фары поезда освещают стены обычным образом.
export function bakedMaterial(params = {}) {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, ...params });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float bake;\nvarying float vBake;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBake = bake;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBake;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vBake;');
  };
  m.customProgramCacheKey = () => 'baked';
  return m;
}

// Протяжка 2D-сечения (точки {x,y} в локальной системе: x вправо, y вверх)
// вдоль трассы от s0 до s1. u — по сечению (м / uScale), v — по длине (м / vScale).
export function sweep(route, s0, s1, profile, { step = 2, uScale = 1, vScale = 1, bake = null, closed = false, frames = null, shift = null } = {}) {
  const n = Math.max(2, Math.ceil((s1 - s0) / step) + 1);
  const m = profile.length;
  const pos = new Float32Array(n * m * 3);
  const nor = new Float32Array(n * m * 3);
  const uv = new Float32Array(n * m * 2);
  const bk = new Float32Array(n * m);
  // длины по сечению и 2D-нормали
  const ul = [0];
  for (let j = 1; j < m; j++) ul.push(ul[j - 1] + Math.hypot(profile[j].x - profile[j - 1].x, profile[j].y - profile[j - 1].y));
  const pn = profile.map((p, j) => {
    const a = profile[Math.max(0, j - 1)], b = profile[Math.min(m - 1, j + 1)];
    const tx = b.x - a.x, ty = b.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    return { x: -ty / l, y: tx / l };
  });
  const f = {};
  for (let i = 0; i < n; i++) {
    const s = s0 + (s1 - s0) * (i / (n - 1));
    if (frames) frames(s, f); else route.frameAt(s, f);
    const sx = shift ? shift(s) : 0;
    for (let j = 0; j < m; j++) {
      const p = sx ? { x: profile[j].x + sx, y: profile[j].y } : profile[j];
      const k = (i * m + j);
      pos[k * 3] = f.pos.x + f.right.x * p.x + f.up.x * p.y;
      pos[k * 3 + 1] = f.pos.y + f.right.y * p.x + f.up.y * p.y;
      pos[k * 3 + 2] = f.pos.z + f.right.z * p.x + f.up.z * p.y;
      const q = pn[j];
      nor[k * 3] = f.right.x * q.x + f.up.x * q.y;
      nor[k * 3 + 1] = f.right.y * q.x + f.up.y * q.y;
      nor[k * 3 + 2] = f.right.z * q.x + f.up.z * q.y;
      uv[k * 2] = ul[j] / uScale;
      uv[k * 2 + 1] = s / vScale;
      bk[k] = bake ? bake(s, p.x, p.y) : 0;
    }
  }
  const idx = [];
  const mm = closed ? m : m - 1;
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < mm; j++) {
    const j2 = (j + 1) % m;
    const a = i * m + j, b = i * m + j2, c = (i + 1) * m + j, d = (i + 1) * m + j2;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('bake', new THREE.BufferAttribute(bk, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export function arcProfile(cx, cy, r, a0, a1, segs) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = a0 + (a1 - a0) * (i / segs);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

export function rectProfile(x0, y0, x1, y1) {
  return [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
}

// Размещение экземпляров вдоль трассы: fn(s) => [{x,y,z?,ry?,sx?,sy?,sz?}]
export function instancesAlong(route, s0, s1, step, geom, mat, place, offset = 0) {
  const items = [];
  const f = {};
  const first = Math.ceil((s0 - offset) / step) * step + offset;
  for (let s = first; s < s1; s += step) {
    const list = place ? place(s) : [{ x: 0, y: 0 }];
    if (!list) continue;
    for (const it of list) items.push({ s, ...it });
  }
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geom, mat, items.length);
  const m = new THREE.Matrix4(), basis = new THREE.Matrix4(), local = new THREE.Matrix4();
  const q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  items.forEach((it, i) => {
    route.frameAt(it.s + (it.z || 0), f);
    basis.makeBasis(f.right, f.up, f.back);
    basis.setPosition(f.pos);
    e.set(it.rx || 0, it.ry || 0, it.rz || 0);
    q.setFromEuler(e);
    sc.set(it.sx || 1, it.sy || 1, it.sz || 1);
    p.set(it.x || 0, it.y || 0, 0);
    local.compose(p, q, sc);
    m.multiplyMatrices(basis, local);
    mesh.setMatrixAt(i, m);
    if (it.color && mesh.setColorAt) mesh.setColorAt(i, it.color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}
