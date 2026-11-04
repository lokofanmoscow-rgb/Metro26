// Открытые участки: метромост через Москву-реку и наземный участок на юге Сокольнической линии.
import * as THREE from 'three';
import { sweep, instancesAlong, bakedMaterial } from './geom.js';
import { buildTrack, sharedMats, TUBE_R, TUBE_CY, BED_Y } from './tunnel.js';
import { grassTexture, ballastTexture, buildingTexture, concreteTexture } from './textures.js';
import { mergeGeoms, boxGeom, cylGeom, mulberry32, hashStr } from './util.js';
import { HALL_HALF } from './route.js';

const OPP_X = -12.96;

export function buildSky() {
  const g = new THREE.SphereGeometry(4000, 32, 16);
  const top = new THREE.Color('#5d8fd0'), hor = new THREE.Color('#dfe9f2'), low = new THREE.Color('#b9c4cc');
  const col = [];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) / 4000;
    const c = y > 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : hor.clone().lerp(low, Math.min(1, -y * 4));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

function treeGeom() {
  return mergeGeoms([cylGeom(0.15, 0.22, 2.2, 6, 0, 1.1, 0), cylGeom(0.0, 2.2, 5.5, 8, 0, 4.8, 0), cylGeom(0.0, 1.7, 3.5, 8, 0, 7.4, 0)]);
}

function trees(route, s0, s1, rng, xMin, xMax, step, y = -1) {
  const g = treeGeom();
  const m = new THREE.MeshLambertMaterial({ color: 0x3f6a34 });
  return instancesAlong(route, s0, s1, step, g, m, () => {
    const out = [];
    for (const side of [-1, 1]) {
      if (rng() < 0.25) continue;
      const x = side > 0 ? xMin + rng() * (xMax - xMin) : OPP_X - xMin - rng() * (xMax - xMin);
      const sc = 0.7 + rng() * 0.8;
      out.push({ x, y, sx: sc, sy: sc * (0.8 + rng() * 0.5), sz: sc, color: new THREE.Color().setHSL(0.27 + rng() * 0.08, 0.35 + rng() * 0.2, 0.22 + rng() * 0.12) });
    }
    return out;
  });
}

function buildings(route, s0, s1, rng, step) {
  const grp = new THREE.Group();
  for (let k = 0; k < 4; k++) {
    const tex = buildingTexture(k + 1);
    tex.repeat.set(1, 1);
    const m = new THREE.MeshLambertMaterial({ map: tex, emissiveMap: tex, emissive: 0x222222 });
    const inst = instancesAlong(route, s0, s1, step, new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), m, () => {
      if (rng() < 0.5) return null;
      const side = rng() < 0.5 ? 1 : -1;
      const x = side > 0 ? 110 + rng() * 160 : OPP_X - 110 - rng() * 160;
      const h = 18 + rng() * 55;
      return [{ x, y: -2, sx: 16 + rng() * 30, sy: h, sz: 12 + rng() * 14, ry: (rng() - 0.5) * 0.4 }];
    }, k * step / 4);
    if (inst) grp.add(inst);
  }
  return grp;
}

// Портал тоннеля: стенка с проёмом и насыпь/склон над тоннелем
export function buildPortal(route, s, facingForward, kind) {
  const grp = new THREE.Group();
  const sh = new THREE.Shape();
  const W = 40;
  sh.moveTo(OPP_X - W / 2, -6); sh.lineTo(W / 2, -6); sh.lineTo(W / 2, 9); sh.lineTo(OPP_X - W / 2, 9); sh.lineTo(OPP_X - W / 2, -6);
  for (const hx of [0, OPP_X]) { const p = new THREE.Path(); p.absarc(hx, TUBE_CY, TUBE_R, 0, Math.PI * 2, true); sh.holes.push(p); }
  const g = new THREE.ShapeGeometry(sh, 20);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
  const m = new THREE.MeshLambertMaterial({ map: concreteTexture('#8a857c'), side: THREE.DoubleSide });
  const wall = new THREE.Mesh(g, m);
  grp.add(wall);
  // склон
  const dir = facingForward ? -1 : 1; // склон уходит в сторону тоннеля
  const hill = new THREE.Mesh(boxGeom(W + 30, 12, 60, OPP_X / 2, 3, dir * 30.1), new THREE.MeshLambertMaterial({ map: grassTexture(), color: kind === 'bridge' ? 0x6f8f55 : 0x7f9a5a }));
  hill.material.map.repeat.set(8, 8);
  grp.add(hill);
  // короткая труба тоннеля за порталом
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, 8, 24, 1, true).rotateX(Math.PI / 2).translate(0, TUBE_CY, dir * 4), new THREE.MeshLambertMaterial({ color: 0x3a3733, side: THREE.BackSide }));
  grp.add(tube);
  grp.applyMatrix4(route.matrixAt(s, new THREE.Matrix4(), true));
  return grp;
}

// Окружение всего открытого участка (строится один раз на зону)
export function buildOutdoorEnv(route, zone) {
  const grp = new THREE.Group();
  const rng = mulberry32(hashStr(route.line.id + zone.s0));
  const mid = (zone.s0 + zone.s1) / 2;
  if (zone.out === 'bridge') {
    const st = route.innerStations.find((c) => c.s0 >= zone.s0 && c.s1 <= zone.s1);
    const sc = st ? (st.s0 + st.s1) / 2 : mid;
    const m = route.matrixAt(sc, new THREE.Matrix4(), true);
    const local = new THREE.Group();
    // река поперёк трассы
    const water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 300).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x4f6f86, emissive: 0x1a2a36 }));
    water.position.set(OPP_X / 2, -16, 0);
    local.add(water);
    const bankM = new THREE.MeshLambertMaterial({ map: grassTexture(), color: 0x8aa070 });
    bankM.map.repeat.set(40, 40);
    const hillM = new THREE.MeshLambertMaterial({ map: grassTexture(), color: 0x6f8f55 });
    const upEnd = route.stations.find((x) => x.name === 'Университет');
    const hillAhead = upEnd && upEnd.c > sc; // Воробьёвы горы — со стороны «Университета»
    for (const sgn of [-1, 1]) {
      // sgn < 0 — вперёд по ходу (локальная -Z)
      const portalD = sgn < 0 ? zone.s1 - sc : sc - zone.s0;
      const isHill = (sgn < 0) === hillAhead;
      // набережная (низкий берег) до портала
      local.add(new THREE.Mesh(boxGeom(4000, 10, portalD - 150 + 2, OPP_X / 2, -11, sgn * (150 + (portalD - 150) / 2)), bankM));
      // за порталом
      const h = isHill ? 70 : 10;
      local.add(new THREE.Mesh(boxGeom(4000, h, 1400, OPP_X / 2, -16 + h / 2, sgn * (portalD + 700)), isHill ? hillM : bankM));
      if (isHill) {
        // лес на склонах и главное здание МГУ вдали
        const tg = treeGeom();
        const tm = new THREE.MeshLambertMaterial({ color: 0x3c6232 });
        const n = 300;
        const inst = new THREE.InstancedMesh(tg, tm, n);
        const mm = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
          const x = (rng() - 0.5) * 1200, z = sgn * (portalD + 5 + rng() * 380);
          const s = 1 + rng() * 1.2;
          mm.makeScale(s, s, s); mm.setPosition(x, -16 + h, z);
          inst.setMatrixAt(i, mm);
          inst.setColorAt(i, new THREE.Color().setHSL(0.26 + rng() * 0.08, 0.4, 0.2 + rng() * 0.12));
        }
        local.add(inst);
        // деревья на склоне к реке
        const inst2 = new THREE.InstancedMesh(tg, tm, 120);
        for (let i = 0; i < 120; i++) {
          const x = (rng() - 0.5) * 1400, z = sgn * (160 + rng() * (portalD - 170));
          if (Math.abs(x - OPP_X / 2) < 24) { mm.makeScale(0, 0, 0); inst2.setMatrixAt(i, mm); continue; }
          const s = 0.9 + rng();
          mm.makeScale(s, s, s); mm.setPosition(x, -6, z);
          inst2.setMatrixAt(i, mm);
        }
        local.add(inst2);
        const msu = new THREE.Group();
        const sm = new THREE.MeshLambertMaterial({ color: 0xd9cfb8, emissive: 0x2a2620 });
        msu.add(new THREE.Mesh(mergeGeoms([
          boxGeom(60, 60, 40, 0, 30, 0), boxGeom(36, 50, 30, 0, 85, 0), boxGeom(22, 40, 20, 0, 130, 0), cylGeom(0.5, 9, 60, 8, 0, 180, 0),
          boxGeom(70, 40, 30, -70, 20, 0), boxGeom(70, 40, 30, 70, 20, 0), boxGeom(20, 30, 20, -110, 50, 0), boxGeom(20, 30, 20, 110, 50, 0),
        ]), sm));
        msu.position.set(320, -16 + h, sgn * (portalD + 650));
        local.add(msu);
      } else {
        // Лужники: Большая спортивная арена и жилые кварталы
        const arena = new THREE.Mesh(new THREE.CylinderGeometry(110, 120, 42, 40, 1, true), new THREE.MeshLambertMaterial({ color: 0xe0dcd2, side: THREE.DoubleSide, emissive: 0x222222 }));
        arena.scale.z = 0.75;
        arena.position.set(-300, -6 + 21, sgn * (portalD + 380));
        local.add(arena);
        const roof = new THREE.Mesh(new THREE.TorusGeometry(110, 14, 6, 40).rotateX(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xf0f0ee }));
        roof.scale.z = 0.75; roof.position.copy(arena.position); roof.position.y += 21;
        local.add(roof);
        for (let i = 0; i < 22; i++) {
          const hh = 30 + rng() * 60;
          const b2 = new THREE.Mesh(boxGeom(30 + rng() * 30, hh, 20, 0, hh / 2, 0), new THREE.MeshLambertMaterial({ map: buildingTexture(i % 5 + 1), emissive: 0x222222 }));
          b2.position.set(-900 + rng() * 1800, -6, sgn * (portalD + 700 + rng() * 400));
          local.add(b2);
        }
      }
    }
    // опоры моста
    const pier = [];
    for (const z of [-260, -130, 0, 130, 260]) pier.push(boxGeom(8, 16, 5, OPP_X / 2, -16 + 8 - 3, z));
    local.add(new THREE.Mesh(mergeGeoms(pier), new THREE.MeshLambertMaterial({ color: 0xa8a49a })));
    local.applyMatrix4(m);
    grp.add(local);
  } else {
    // наземный участок: поле, лес и новостройки Новой Москвы
    grp.add(buildings(route, zone.s0 - 200, zone.s1 + 200, rng, 45));
  }
  return grp;
}

export function buildOutdoorChunk(route, s0, s1, zone) {
  const grp = new THREE.Group();
  const rng = mulberry32(hashStr(route.line.id + ':' + Math.round(s0)));
  const halls = route.innerStations.map((c) => [c.s0, c.s1]);
  // части без станций (путь и галереи строит станция сама)
  const parts = [];
  let a = s0;
  for (const [h0, h1] of halls) {
    if (h1 <= a || h0 >= s1) continue;
    if (h0 > a) parts.push([a, h0]);
    a = Math.max(a, h1);
  }
  if (a < s1) parts.push([a, s1]);
  const bridge = zone.out === 'bridge';
  for (const [p0, p1] of parts) {
    if (p1 - p0 < 0.5) continue;
    grp.add(buildTrack(route, p0, p1, { bed: !bridge }));
    grp.add(oppTrack(route, p0, p1));
    if (bridge) {
      grp.add(bridgeGallery(route, p0, p1));
    } else {
      const bal = new THREE.MeshLambertMaterial({ map: ballastTexture() });
      grp.add(new THREE.Mesh(sweep(route, p0, p1, [{ x: OPP_X - 2.6, y: -0.62 }, { x: OPP_X - 1.8, y: -0.3 }, { x: 1.8, y: -0.3 }, { x: 2.6, y: -0.62 }], { step: 4, uScale: 2, vScale: 2 }), bal));
    }
  }
  if (!bridge) {
    const gm = new THREE.MeshLambertMaterial({ map: grassTexture() });
    gm.map.repeat.set(1, 1);
    const prof = [{ x: OPP_X - 150, y: -1.5 }, { x: OPP_X - 30, y: -1.0 }, { x: OPP_X - 2.6, y: -0.62 }];
    const prof2 = [{ x: 2.6, y: -0.62 }, { x: 30, y: -1.0 }, { x: 150, y: -1.5 }];
    grp.add(new THREE.Mesh(mergeGeoms([sweep(route, s0, s1, prof, { step: 5, uScale: 6, vScale: 6 }), sweep(route, s0, s1, prof2, { step: 5, uScale: 6, vScale: 6 })]), gm));
    // ограждения и опоры освещения
    const post = new THREE.MeshLambertMaterial({ color: 0x5a5a58 });
    const fence = instancesAlong(route, s0, s1, 3, new THREE.BoxGeometry(0.06, 2.0, 0.06).translate(0, 1, 0), post, () => [{ x: 5.5, y: -0.8 }, { x: OPP_X - 5.5, y: -0.8 }]);
    if (fence) grp.add(fence);
    const net = new THREE.MeshLambertMaterial({ color: 0x8a9a8a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
    grp.add(new THREE.Mesh(mergeGeoms([
      sweep(route, s0, s1, [{ x: 5.5, y: -0.8 }, { x: 5.5, y: 1.2 }], { step: 6 }),
      sweep(route, s0, s1, [{ x: OPP_X - 5.5, y: -0.8 }, { x: OPP_X - 5.5, y: 1.2 }], { step: 6 }),
    ]), net));
    const poles = instancesAlong(route, s0, s1, 40, mergeGeoms([cylGeom(0.09, 0.12, 8, 6, 0, 4, 0), boxGeom(1.6, 0.1, 0.1, -0.8, 8, 0)]), post, () => [{ x: 4.2, y: -0.6 }]);
    if (poles) grp.add(poles);
    const tr = trees(route, s0, s1, rng, 9, 45, 7);
    if (tr) grp.add(tr);
  }
  return grp;
}

function oppTrack(route, s0, s1) {
  // встречный путь — смещён на OPP_X
  const m = sharedMats();
  const g2 = new THREE.Group();
  const prof = (x) => [{ x: x - 0.07, y: -0.16 }, { x: x + 0.07, y: -0.16 }, { x: x + 0.036, y: 0 }, { x: x - 0.036, y: 0 }];
  for (const x of [OPP_X - 0.762, OPP_X + 0.762]) g2.add(new THREE.Mesh(sweep(route, s0, s1, prof(x), { step: 4, closed: true }), m.rail));
  const sleep = instancesAlong(route, s0, s1, 0.75, new THREE.BoxGeometry(2.3, 0.13, 0.24), m.sleeper, () => [{ x: OPP_X, y: -0.22 }]);
  if (sleep) g2.add(sleep);
  return g2;
}

function bridgeGallery(route, s0, s1) {
  const grp = new THREE.Group();
  const xr = 2.9, xl = OPP_X - 2.9;
  const conc = bakedMaterial({ map: concreteTexture('#9a968c'), color: 0xdddddd });
  const b = () => 0.55;
  const glass = new THREE.MeshLambertMaterial({ color: 0xa9c9d2, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, emissive: 0x203030 });
  // пол, низ стен, верх стен, потолок, наружные грани
  grp.add(new THREE.Mesh(mergeGeoms([
    sweep(route, s0, s1, [{ x: xr, y: 1.0 }, { x: xr, y: BED_Y - 0.4 }, { x: xl, y: BED_Y - 0.4 }, { x: xl, y: 1.0 }], { step: 4, uScale: 3, vScale: 3, bake: b }),
    sweep(route, s0, s1, [{ x: xl, y: 4.6 }, { x: xl, y: 5.8 }, { x: xr, y: 5.8 }, { x: xr, y: 4.6 }], { step: 4, uScale: 3, vScale: 3, bake: b }),
    sweep(route, s0, s1, [{ x: xr + 0.4, y: 7.4 }, { x: xr + 0.4, y: -2.6 }, { x: xl - 0.4, y: -2.6 }, { x: xl - 0.4, y: 7.4 }], { step: 6, uScale: 3, vScale: 3, bake: b }),
    sweep(route, s0, s1, [{ x: xl - 1.5, y: 7.4 }, { x: xr + 1.5, y: 7.4 }], { step: 6, uScale: 3, vScale: 3, bake: b }),
  ]), conc));
  grp.add(new THREE.Mesh(mergeGeoms([
    sweep(route, s0, s1, [{ x: xr, y: 1.0 }, { x: xr, y: 4.6 }], { step: 6 }),
    sweep(route, s0, s1, [{ x: xl, y: 1.0 }, { x: xl, y: 4.6 }], { step: 6 }),
  ]), glass));
  const mull = instancesAlong(route, s0, s1, 3, new THREE.BoxGeometry(0.14, 3.6, 0.14).translate(0, 2.8, 0), new THREE.MeshLambertMaterial({ color: 0x6a6e70 }), () => [{ x: xr, y: 0 }, { x: xl, y: 0 }]);
  if (mull) grp.add(mull);
  const lamp = instancesAlong(route, s0, s1, 12, new THREE.BoxGeometry(0.3, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: 0xfff4dc }), () => [{ x: 0, y: 5.75 }, { x: OPP_X, y: 5.75 }]);
  if (lamp) grp.add(lamp);
  // ограждение проезжей части сверху
  const rail = instancesAlong(route, s0, s1, 2.5, new THREE.BoxGeometry(0.08, 1.0, 0.08).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0x6a6e70 }), () => [{ x: xr + 1.3, y: 7.4 }, { x: xl - 1.3, y: 7.4 }]);
  if (rail) grp.add(rail);
  void HALL_HALF;
  return grp;
}
