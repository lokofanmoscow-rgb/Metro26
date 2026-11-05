// Тоннели (круглые из тюбингов и прямоугольные мелкого заложения) и путь.
import * as THREE from 'three';
import { sweep, arcProfile, rectProfile, bakedMaterial, instancesAlong } from './geom.js';
import { tubbingTexture, concreteTexture, trackBedTexture } from './textures.js';
import { mergeGeoms } from './util.js';

export const TUBE_R = 2.75, TUBE_CY = 1.45, BED_Y = -0.26;
export const BOX_W = 2.08, BOX_TOP = 4.25;

let M = null;
export function geomsShared() { return geoms(); }

export function sharedMats() {
  if (M) return M;
  const mk = (m) => { m.userData.shared = true; return m; };
  M = {
    rail: mk(new THREE.MeshLambertMaterial({ color: 0x8b8a86 })),
    railTop: mk(new THREE.MeshLambertMaterial({ color: 0xc9c9c6, emissive: 0x1a1a1a })),
    sleeper: mk(new THREE.MeshLambertMaterial({ color: 0x3a3029 })),
    bed: mk(bakedMaterial({ map: trackBedTexture() })),
    third: mk(new THREE.MeshLambertMaterial({ color: 0x5a5854 })),
    cover: mk(new THREE.MeshLambertMaterial({ color: 0xcdbf86 })),
    lamp: mk(new THREE.MeshBasicMaterial({ color: 0xfff1cf })),
    lampHouse: mk(new THREE.MeshLambertMaterial({ color: 0x2a2a2a })),
    cable: mk(bakedMaterial({ color: 0x1b1b1b })),
    bracket: mk(new THREE.MeshLambertMaterial({ color: 0x2d2b28 })),
    tube: mk(bakedMaterial({ map: tubbingTexture() })),
    box: mk(bakedMaterial({ map: concreteTexture('#5f5b54') })),
    sigPost: mk(new THREE.MeshLambertMaterial({ color: 0x1d1d1d })),
    red: mk(new THREE.MeshBasicMaterial({ color: 0xff2a1a })),
    green: mk(new THREE.MeshBasicMaterial({ color: 0x2aff6a })),
    off: mk(new THREE.MeshBasicMaterial({ color: 0x202020 })),
    white: mk(new THREE.MeshBasicMaterial({ color: 0xf4f4f0 })),
    plate: mk(new THREE.MeshLambertMaterial({ color: 0xe8e8e0, emissive: 0x303030 })),
  };
  return M;
}

const G = {};
function geoms() {
  if (G.sleeper) return G;
  G.sleeper = new THREE.BoxGeometry(2.3, 0.13, 0.24);
  G.lampHouse = new THREE.BoxGeometry(0.16, 0.22, 0.5);
  G.lamp = new THREE.BoxGeometry(0.04, 0.12, 0.38);
  G.bracket = new THREE.BoxGeometry(0.12, 0.05, 0.05);
  G.coverBracket = new THREE.BoxGeometry(0.08, 0.32, 0.08);
  G.plate = new THREE.PlaneGeometry(0.3, 0.2);
  return G;
}

// освещённость тоннеля от светильников (шаг 30 м) и от залов станций
export function tunnelBake(route, lampX, lampY = 2.3) {
  const halls = route.stations.map((st) => [st.c - 84, st.c + 84]);
  return (s, x, y) => {
    let b = 0.03;
    const s0 = Math.round(s / 30) * 30;
    for (let k = -1; k <= 1; k++) {
      const ds = s - (s0 + k * 30);
      const d2 = ds * ds + (x - lampX) * (x - lampX) + (y - lampY) * (y - lampY);
      b += 0.75 * Math.exp(-d2 / 14) + 0.08 * Math.exp(-d2 / 90);
    }
    for (const [a, c] of halls) {
      const d = s < a ? a - s : s > c ? s - c : 0;
      if (d < 60) b += 0.55 * Math.exp(-d / 12);
    }
    return Math.min(b, 1.1);
  };
}

export function buildTrack(route, s0, s1, { bed = true, bake = null, third = true, sleepers = true, bedW = 1.7, sleeperY = -0.22 } = {}) {
  const m = sharedMats(), g = geoms();
  const grp = new THREE.Group();
  const railProf = (x) => [
    { x: x - 0.07, y: -0.16 }, { x: x + 0.07, y: -0.16 }, { x: x + 0.02, y: -0.14 }, { x: x + 0.02, y: -0.04 },
    { x: x + 0.036, y: -0.03 }, { x: x + 0.036, y: 0 },
  ];
  const railProfL = (x) => railProf(x).map((p) => ({ x: 2 * x - p.x, y: p.y })).reverse();
  for (const x of [-0.762, 0.762]) {
    const r1 = sweep(route, s0, s1, railProf(x), { step: 3 });
    const r2 = sweep(route, s0, s1, railProfL(x), { step: 3 });
    grp.add(new THREE.Mesh(r1, m.rail), new THREE.Mesh(r2, m.rail));
    const top = sweep(route, s0, s1, [{ x: x - 0.036, y: 0.001 }, { x: x + 0.036, y: 0.001 }], { step: 3 });
    grp.add(new THREE.Mesh(top, m.railTop));
  }
  if (bed) {
    const bg = sweep(route, s0, s1, [{ x: -bedW, y: BED_Y }, { x: bedW, y: BED_Y }], { step: 3, uScale: 3.2, vScale: 3.2, bake });
    grp.add(new THREE.Mesh(bg, m.bed));
  }
  if (sleepers) {
    const sl = instancesAlong(route, s0, s1, 0.75, g.sleeper, m.sleeper, () => [{ x: 0, y: sleeperY }]);
    if (sl) grp.add(sl);
  }
  if (third) {
    // контактный рельс справа (со стороны, противоположной платформе) с защитным коробом
    const tr = sweep(route, s0, s1, rectProfile(1.47, 0.06, 1.57, 0.17), { step: 3, closed: true });
    grp.add(new THREE.Mesh(tr, m.third));
    const cv = sweep(route, s0, s1, [{ x: 1.4, y: 0.27 }, { x: 1.72, y: 0.27 }, { x: 1.72, y: 0.2 }], { step: 3 });
    grp.add(new THREE.Mesh(cv, m.cover));
    const br = instancesAlong(route, s0, s1, 4.5, g.coverBracket, m.bracket, () => [{ x: 1.75, y: 0.05 }]);
    if (br) grp.add(br);
  }
  return grp;
}

export function tubeProfile() {
  const a0 = Math.asin((BED_Y - TUBE_CY) / TUBE_R);
  return arcProfile(0, TUBE_CY, TUBE_R, a0, Math.PI - a0, 36);
}

// fade — [s, где свет ещё полный, s, где темно]: тоннель «уходит в темноту» (второй путь развилки)
export function buildTunnelChunk(route, s0, s1, deep, { fade = null } = {}) {
  const m = sharedMats(), g = geoms();
  const grp = new THREE.Group();
  const lampX = deep ? 2.5 : BOX_W - 0.1;
  const bake0 = tunnelBake(route, lampX);
  const fadeK = (s) => (fade ? Math.max(0, Math.min(1, (s - fade[1]) / (fade[0] - fade[1]))) : 1);
  const bake = fade ? (s, x, y) => bake0(s, x, y) * fadeK(s) : bake0;
  if (deep) {
    const prof = tubeProfile();
    grp.add(new THREE.Mesh(sweep(route, s0, s1, prof, { step: 2, uScale: 2, vScale: 1, bake }), m.tube));
  } else {
    const prof = [{ x: BOX_W, y: BED_Y }, { x: BOX_W, y: BOX_TOP }, { x: -BOX_W, y: BOX_TOP }, { x: -BOX_W, y: BED_Y }];
    grp.add(new THREE.Mesh(sweep(route, s0, s1, prof, { step: 2, uScale: 2, vScale: 2, bake }), m.box));
  }
  grp.add(buildTrack(route, s0, s1, { bake, bedW: deep ? 2.2 : BOX_W }));
  // кабели вдоль стен
  const wallX = (y) => (deep ? Math.sqrt(TUBE_R * TUBE_R - (y - TUBE_CY) ** 2) - 0.12 : BOX_W - 0.08);
  const cables = [];
  const circ = (cx, cy, r) => arcProfile(cx, cy, r, 0, Math.PI * 2, 5);
  for (const y of [0.95, 1.12, 1.29, 1.46, 1.63]) cables.push(sweep(route, s0, s1, circ(wallX(y), y, 0.035), { step: 4, bake }));
  for (const y of [1.25, 1.42, 1.6]) cables.push(sweep(route, s0, s1, circ(-wallX(y), y, 0.03), { step: 4, bake }));
  grp.add(new THREE.Mesh(mergeGeoms(cables), m.cable));
  const br = instancesAlong(route, s0, s1, 3, g.bracket, m.bracket, () => [
    { x: wallX(1.3) + 0.02, y: 0.9 }, { x: wallX(1.3) + 0.02, y: 1.6 }, { x: -wallX(1.4) - 0.02, y: 1.2 },
  ]);
  if (br) grp.add(br);
  // светильники
  const lamps = instancesAlong(route, s0, s1, 30, g.lamp, m.lamp, (s) => (fadeK(s) > 0.35 ? [{ x: lampX - 0.06, y: 2.3 }] : null));
  const houses = instancesAlong(route, s0, s1, 30, g.lampHouse, m.lampHouse, () => [{ x: lampX + 0.02, y: 2.3 }]);
  if (lamps) grp.add(lamps);
  if (houses) grp.add(houses);
  // пикетные таблички
  const pk = instancesAlong(route, s0, s1, 100, g.plate, m.plate, () => [{ x: wallX(1.9) - 0.02, y: 1.9, ry: -Math.PI / 2 }], 15);
  if (pk) grp.add(pk);
  return grp;
}

// Кольцевая стенка на стыке круглого и прямоугольного тоннелей
export function buildTransitionRing(route, s) {
  // стенка на стыке круглого и прямоугольного тоннелей: всё, кроме их общего сечения
  const shape = new THREE.Shape();
  const X = TUBE_R + 0.6, Y0 = TUBE_CY - TUBE_R - 0.6, Y1 = Math.max(BOX_TOP, TUBE_CY + TUBE_R) + 0.6;
  shape.moveTo(-X, Y0); shape.lineTo(X, Y0); shape.lineTo(X, Y1); shape.lineTo(-X, Y1); shape.lineTo(-X, Y0);
  // общее сечение: точки окружности, прижатые внутрь прямоугольника
  const hole = new THREE.Path();
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.max(-BOX_W, Math.min(BOX_W, Math.cos(a) * TUBE_R));
    const y = Math.max(BED_Y - 0.3, Math.min(BOX_TOP, TUBE_CY + Math.sin(a) * TUBE_R));
    if (i === 0) hole.moveTo(x, y); else hole.lineTo(x, y);
  }
  shape.holes.push(hole);
  const geo = new THREE.ShapeGeometry(shape, 1);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x4a4741, side: THREE.DoubleSide }));
  mesh.applyMatrix4(route.matrixAt(s));
  return mesh;
}
