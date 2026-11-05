// Открытые участки: насыпи, выемки с подпорными стенками, метромосты, порталы тоннелей, небо.
import * as THREE from 'three';
import { sweep, instancesAlong, bakedMaterial } from './geom.js';
import { buildTrack, sharedMats, TUBE_R, TUBE_CY, BED_Y } from './tunnel.js';
import { grassTexture, ballastTexture, buildingTexture, concreteTexture } from './textures.js';
import { mergeGeoms, boxGeom, cylGeom, mulberry32, hashStr } from './util.js';
import { HALL_HALF, BRIDGE_RISE } from './route.js';
import { buildOsmEnv, corridorIndex, GROUND_Y } from './osm.js';

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
export function buildPortal(route, s, facingForward, cut) {
  const Z = cut.zone || {};
  if (Z.osm && (Z.kind === 'open' || Z.kind === 'gallery')) return osmPortal(route, s, facingForward, Z.oppX, Z.pd <= 0.5);
  const kind = cut.out, ox = Z.oppX ?? OPP_X;
  const grp = new THREE.Group();
  const sh = new THREE.Shape();
  const W = 40;
  sh.moveTo(ox - W / 2, -14); sh.lineTo(W / 2, -14); sh.lineTo(W / 2, 9); sh.lineTo(ox - W / 2, 9); sh.lineTo(ox - W / 2, -14);
  for (const hx of [0, ox]) { const p = new THREE.Path(); p.absarc(hx, TUBE_CY, TUBE_R, 0, Math.PI * 2, true); sh.holes.push(p); }
  const g = new THREE.ShapeGeometry(sh, 20);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
  const m = new THREE.MeshLambertMaterial({ map: concreteTexture('#8a857c'), side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(g, m));
  // склон над тоннелем
  const dir = facingForward ? -1 : 1; // склон уходит в сторону тоннеля
  // склон без передней грани (она закрывала бы проёмы тоннелей)
  const gm = new THREE.MeshLambertMaterial({ map: grassTexture(), color: kind === 'bridge' ? 0x6f8f55 : 0x7f9a5a });
  gm.map.repeat.set(8, 8);
  const hide = new THREE.MeshBasicMaterial({ visible: false });
  const mats = [gm, gm, gm, gm, gm, gm];
  mats[dir > 0 ? 5 : 4] = hide;
  grp.add(new THREE.Mesh(boxGeom(W + 30, 23, 150, ox / 2, -2.5, dir * 75.1), mats));
  // встречный тоннель: тёмный тюбинг за проёмом
  const dark = new THREE.MeshLambertMaterial({ color: 0x24221f, side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(new THREE.CylinderGeometry(TUBE_R, TUBE_R, 60, 24, 1, true).rotateX(Math.PI / 2).translate(ox, TUBE_CY, dir * 30), dark));
  grp.applyMatrix4(route.matrixAt(s, new THREE.Matrix4(), true));
  return grp;
}

// Портал двухпутного тоннеля в торце выемки (путь ниже уровня земли)
function osmPortal(route, s, facingForward, ox, hill = false) {
  const grp = new THREE.Group();
  const gy = GROUND_Y - route.y(s); // земля над порталом (локально)
  const xr = 3.0, xl = ox - 3.0, top = hill ? 4.9 : Math.min(4.9, gy - 0.4);
  const X0 = ox - 3.6 - 14, X1 = 3.6 + 14, Y0 = hill ? gy - 0.5 : -1.0, Y1 = hill ? 7.0 : gy + 0.9;
  const sh = new THREE.Shape();
  sh.moveTo(X0, Y0); sh.lineTo(X1, Y0); sh.lineTo(X1, Y1); sh.lineTo(X0, Y1); sh.lineTo(X0, Y0);
  const h = new THREE.Path(); h.moveTo(xl, -0.7); h.lineTo(xr, -0.7); h.lineTo(xr, top); h.lineTo(xl, top); h.lineTo(xl, -0.7); sh.holes.push(h);
  const g = new THREE.ShapeGeometry(sh, 1);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#9c978d'), side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(g, conc));
  // карниз портала
  grp.add(new THREE.Mesh(boxGeom(X1 - X0, 0.5, 1.2, (X0 + X1) / 2, Y1 - 0.25, 0), conc));
  // устье: стены и свод без торцов, в глубине — стенка с проёмом под наш тоннель
  const dir = facingForward ? -1 : 1;
  const D = 16;
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a3833, side: THREE.DoubleSide });
  const walls = [
    new THREE.PlaneGeometry(D, top + 0.7).rotateY(Math.PI / 2).translate(xr, (top - 0.7) / 2, dir * D / 2),
    new THREE.PlaneGeometry(D, top + 0.7).rotateY(Math.PI / 2).translate(xl, (top - 0.7) / 2, dir * D / 2),
    new THREE.PlaneGeometry(xr - xl, D).rotateX(Math.PI / 2).translate((xl + xr) / 2, top, dir * D / 2),
    new THREE.PlaneGeometry(xr - xl, D).rotateX(Math.PI / 2).translate((xl + xr) / 2, -0.66, dir * D / 2),
  ];
  grp.add(new THREE.Mesh(mergeGeoms(walls), dark));
  const deep = route.deepAt ? route.deepAt(s + dir * -30) : true;
  const bs = new THREE.Shape();
  bs.moveTo(xl, -0.7); bs.lineTo(xr, -0.7); bs.lineTo(xr, top); bs.lineTo(xl, top); bs.lineTo(xl, -0.7);
  const hole = new THREE.Path();
  if (deep) hole.absarc(0, TUBE_CY, TUBE_R - 0.02, 0, Math.PI * 2, true);
  else { hole.moveTo(-2.06, BED_Y - 0.2); hole.lineTo(2.06, BED_Y - 0.2); hole.lineTo(2.06, 4.23); hole.lineTo(-2.06, 4.23); hole.lineTo(-2.06, BED_Y - 0.2); }
  bs.holes.push(hole);
  // проём встречного тоннеля
  const oh = new THREE.Path(), oa = ox - 1.9, ob = Math.min(ox + 1.9, deep ? -TUBE_R - 0.1 : -2.2);
  oh.moveTo(oa, BED_Y - 0.2); oh.lineTo(ob, BED_Y - 0.2); oh.lineTo(ob, 4.2); oh.lineTo(oa, 4.2); oh.lineTo(oa, BED_Y - 0.2);
  bs.holes.push(oh);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(bs, 24), dark);
  back.position.z = dir * D;
  grp.add(back);
  grp.applyMatrix4(route.matrixAt(s, new THREE.Matrix4(), true));
  // встречный путь уходит в свой тоннель
  const a0 = facingForward ? s + D - 0.5 : s - D - 120, a1 = facingForward ? s + D + 120 : s - D + 0.5;
  const tm = new THREE.MeshLambertMaterial({ color: 0x2c2a26, side: THREE.DoubleSide });
  if (hill) {
    // путь выходит из тоннеля на уровне земли: портал врезан в насыпной холм (без передней грани)
    const gm = new THREE.MeshLambertMaterial({ map: grassTexture(), color: 0x7f9a5a });
    gm.map.repeat.set(8, 8);
    const mats = [gm, gm, gm, gm, gm, gm];
    mats[dir > 0 ? 5 : 4] = new THREE.MeshBasicMaterial({ visible: false });
    const hb = new THREE.Mesh(boxGeom(X1 - X0 + 16, 21, 150, (X0 + X1) / 2, gy + 10.5 - 4, dir * 75.05), mats);
    hb.applyMatrix4(route.matrixAt(s, new THREE.Matrix4(), true));
    grp.userData.hill = hb;
  }
  const outer = new THREE.Group();
  outer.add(grp);
  if (grp.userData.hill) outer.add(grp.userData.hill);
  outer.add(new THREE.Mesh(sweep(route, a0, a1, [{ x: oa, y: BED_Y - 0.2 }, { x: oa, y: 4.2 }, { x: ob, y: 4.2 }, { x: ob, y: BED_Y - 0.2 }], { step: 4 }), tm));
  outer.add(oppTrack(route, a0, a1, ox));
  return outer;
}

// Окружение всего открытого участка (строится один раз на зону)
export function buildOutdoorEnv(route, zone) {
  const Z = zone.zone || {};
  if (Z.osm && Z.envMatrix) {
    // реальное окружение; здания и деревья у самой трассы убираем (их заменяют наши сооружения)
    const index = corridorIndex(Z.osm);
    const L = index.L;
    // s оси в данных OSM → s трассы
    const toRoute = (sd) => Z.s0 + (Z.rev ? L - sd : sd);
    const open = Z.kind === 'open' || Z.kind === 'gallery';
    const corridor = {
      index,
      halfW: 3.6 - (Z.oppX ?? OPP_X) / 2,
      clearB: open ? 16 : 22,
      clearT: open ? 9 : 14,
      cutAt: (sd) => open && route.y(toRoute(sd)) < GROUND_Y + 0.75,
    };
    // путь тоннеля за порталами в OSM-кадре: здания над насыпью портала убираем
    const inv = Z.envMatrix.clone().invert();
    const extra = [];
    const f = {};
    for (const [a0, a1] of [[Z.s0 - 170, Z.s0], [Z.s1, Z.s1 + 170]]) {
      for (let x = a0; x <= a1; x += 10) { route.frameAt(x, f); const p = f.pos.clone().applyMatrix4(inv); extra.push([p.x, p.z]); }
    }
    corridor.extra = extra;
    return buildOsmEnv(Z.osm, Z.envMatrix, { corridor });
  }
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
  const Z = zone.zone || {};
  const OX = Z.oppX ?? OPP_X;
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
  if (Z.osm && (Z.kind === 'open' || Z.kind === 'gallery')) {
    // реальный открытый участок: насыпь/выемка или метромост — по данным OSM
    const br = (Z.brEff || []).map(([x, y]) => [Z.s0 + x, Z.s0 + y]);
    for (const [p0, p1] of parts) {
      if (p1 - p0 < 0.5) continue;
      const cuts = [p0];
      for (const [x, y] of br) { if (x > p0 && x < p1) cuts.push(x); if (y > p0 && y < p1) cuts.push(y); }
      cuts.push(p1); cuts.sort((u, v) => u - v);
      for (let i = 0; i < cuts.length - 1; i++) {
        const u = cuts[i], v = cuts[i + 1];
        if (v - u < 0.5) continue;
        const onBridge = br.some(([x, y]) => (u + v) / 2 > x && (u + v) / 2 < y);
        const OF = Z.oppAt || (() => OX);
        const varies = Math.abs(OF(u) - OX) > 0.01 || Math.abs(OF(v) - OX) > 0.01 || Math.abs(OF((u + v) / 2) - OX) > 0.01;
        grp.add(buildTrack(route, u, v, { bed: false }));
        grp.add(oppTrack(route, u, v, varies ? OF : OX));
        grp.add(onBridge ? openBridge(route, u, v, Math.min(OF(u), OF(v), OF((u + v) / 2))) : embankment(route, u, v, varies ? OF : OX, Z.kind === 'gallery'));
        if (Z.kind === 'gallery') grp.add(groundGallery(route, u, v, OF));
      }
    }
    return grp;
  }
  for (const [p0, p1] of parts) {
    if (p1 - p0 < 0.5) continue;
    grp.add(buildTrack(route, p0, p1, { bed: !bridge }));
    grp.add(oppTrack(route, p0, p1, OX));
    if (bridge) {
      grp.add(bridgeGallery(route, p0, p1, OX));
    } else {
      const bal = new THREE.MeshLambertMaterial({ map: ballastTexture(), side: THREE.DoubleSide });
      grp.add(new THREE.Mesh(sweep(route, p0, p1, [{ x: OX - 2.6, y: -0.62 }, { x: OX - 1.8, y: -0.3 }, { x: 1.8, y: -0.3 }, { x: 2.6, y: -0.62 }], { step: 4, uScale: 2, vScale: 2 }), bal));
    }
  }
  if (!bridge && !Z.osm) {
    const gm = new THREE.MeshLambertMaterial({ map: grassTexture() });
    gm.map.repeat.set(1, 1);
    const prof = [{ x: OX - 150, y: -1.5 }, { x: OX - 30, y: -1.0 }, { x: OX - 2.6, y: -0.62 }];
    const prof2 = [{ x: 2.6, y: -0.62 }, { x: 30, y: -1.0 }, { x: 150, y: -1.5 }];
    grp.add(new THREE.Mesh(mergeGeoms([sweep(route, s0, s1, prof, { step: 5, uScale: 6, vScale: 6 }), sweep(route, s0, s1, prof2, { step: 5, uScale: 6, vScale: 6 })]), gm));
    const tr = trees(route, s0, s1, rng, 9, 45, 7);
    if (tr) grp.add(tr);
  }
  return grp;
}

// Лента с переменным сечением: fn(s) → массив точек [x, y] (одинаковой длины)
function ribbon(route, s0, s1, step, fn, uScale = 2) {
  const n = Math.max(2, Math.ceil((s1 - s0) / step) + 1);
  const pos = [], uv = [], idx = [];
  const f = {};
  let m = 0;
  for (let i = 0; i < n; i++) {
    const s = s0 + (s1 - s0) * i / (n - 1);
    route.frameAt(s, f);
    const pts = fn(s);
    m = pts.length;
    let u = 0;
    for (let j = 0; j < m; j++) {
      const [x, y] = pts[j];
      if (j) u += Math.hypot(x - pts[j - 1][0], y - pts[j - 1][1]);
      pos.push(f.pos.x + f.right.x * x + f.up.x * y, f.pos.y + f.right.y * x + f.up.y * y, f.pos.z + f.right.z * x + f.up.z * y);
      uv.push(u / uScale, s / uScale);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) {
    const a = i * m + j, b = a + 1, c = a + m, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// Насыпь (путь выше земли) или выемка с подпорными стенками (рампа к порталу)
function embankment(route, s0, s1, OXv, bare = false) {
  const grp = new THREE.Group();
  const O = typeof OXv === 'function' ? OXv : () => OXv;
  const bal = new THREE.MeshLambertMaterial({ map: ballastTexture(), side: THREE.DoubleSide });
  // уровень земли в локальной системе пути
  const gy = (s) => GROUND_Y - route.y(s);
  const H = (s) => -0.62 - gy(s); // > 0 — насыпь, < 0 — выемка
  const xr = 2.6, XL = (s) => O(s) - 2.6;
  grp.add(new THREE.Mesh(ribbon(route, s0, s1, 3, (s) => [[XL(s), -0.62], [O(s) - 1.8, -0.3], [1.8, -0.3], [xr, -0.62]]), bal));
  // откосы насыпи (травяные)
  const gm = new THREE.MeshLambertMaterial({ map: grassTexture(), color: 0x9aa880, side: THREE.DoubleSide });
  const slope = (s) => Math.max(0, H(s)) * 1.6;
  grp.add(new THREE.Mesh(mergeGeoms([
    ribbon(route, s0, s1, 4, (s) => [[xr, -0.62], [xr + 0.3 + slope(s), Math.min(-0.62, gy(s))]]),
    ribbon(route, s0, s1, 4, (s) => [[XL(s) - 0.3 - slope(s), Math.min(-0.62, gy(s))], [XL(s), -0.62]]),
  ]), gm));
  // выемка: дно и подпорные стенки с парапетом
  const cutH = (s) => Math.max(0, -H(s));
  const wr = xr + 1.0, WL = (s) => XL(s) - 1.0;
  if ([s0, (s0 + s1) / 2, s1].some((s) => cutH(s) > 0.05)) {
    const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#a29d93'), side: THREE.DoubleSide });
    const top = (s) => (cutH(s) > 0.05 ? gy(s) + 0.9 : -0.62);
    grp.add(new THREE.Mesh(mergeGeoms([
      ribbon(route, s0, s1, 4, (s) => [[WL(s), -0.65], [XL(s), -0.64]]),
      ribbon(route, s0, s1, 4, (s) => [[xr, -0.64], [wr, -0.65]]),
      ribbon(route, s0, s1, 4, (s) => [[wr, -0.65], [wr, top(s)], [wr + 0.35, top(s)], [wr + 0.35, Math.min(top(s), gy(s) + 0.05)]], 3),
      ribbon(route, s0, s1, 4, (s) => [[WL(s) - 0.35, Math.min(top(s), gy(s) + 0.05)], [WL(s) - 0.35, top(s)], [WL(s), top(s)], [WL(s), -0.65]], 3),
    ]), conc));
  }
  if (bare) return grp;
  // ограждение полосы отвода по бровке
  const post = new THREE.MeshLambertMaterial({ color: 0x4a4c4a });
  const fx = (s) => (cutH(s) > 0.05 ? wr + 1.2 : xr + 1.5 + slope(s));
  const fy = (s) => Math.max(gy(s), -0.62);
  const fence = instancesAlong(route, s0, s1, 3, new THREE.BoxGeometry(0.06, 2.0, 0.06).translate(0, 1, 0), post, (s) => [{ x: fx(s), y: fy(s) }, { x: O(s) - fx(s), y: fy(s) }]);
  if (fence) grp.add(fence);
  const net = new THREE.MeshLambertMaterial({ color: 0x8a9a8a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  grp.add(new THREE.Mesh(mergeGeoms([
    ribbon(route, s0, s1, 6, (s) => [[fx(s), fy(s)], [fx(s), fy(s) + 2]]),
    ribbon(route, s0, s1, 6, (s) => [[O(s) - fx(s), fy(s)], [O(s) - fx(s), fy(s) + 2]]),
  ]), net));
  // опоры контактной сети здесь не нужны (третий рельс); столбы освещения
  const lampM = new THREE.MeshLambertMaterial({ color: 0x6b6e70 });
  const lamps = instancesAlong(route, s0, s1, 40, mergeGeoms([cylGeom(0.08, 0.11, 7, 6, 0, 3.5, 0), boxGeom(1.2, 0.12, 0.12, -0.6, 7, 0)]), lampM, (s) => [{ x: fx(s) - 0.4, y: fy(s) }]);
  if (lamps) grp.add(lamps);
  return grp;
}

// Наземный короб-тоннель с ленточным остеклением (юг Сокольнической линии): цоколь, окна, перекрытие
function groundGallery(route, s0, s1, OF) {
  const grp = new THREE.Group();
  const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#a7a39a'), side: THREE.DoubleSide });
  const glass = new THREE.MeshLambertMaterial({ color: 0xa9c9d2, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, emissive: 0x203030 });
  const XR = 3.0, XL = (s) => OF(s) - 3.0, W0 = 1.0, W1 = 3.9, TOP = 5.1;
  grp.add(new THREE.Mesh(mergeGeoms([
    ribbon(route, s0, s1, 4, () => [[XR, GROUND_Y - 0.2], [XR, W0]], 3),
    ribbon(route, s0, s1, 4, (s) => [[XL(s), W0], [XL(s), GROUND_Y - 0.2]], 3),
    ribbon(route, s0, s1, 4, () => [[XR, W1], [XR, TOP]], 3),
    ribbon(route, s0, s1, 4, (s) => [[XL(s), TOP], [XL(s), W1]], 3),
    ribbon(route, s0, s1, 4, (s) => [[XL(s) - 0.5, TOP + 0.35], [XR + 0.5, TOP + 0.35]], 3),
    ribbon(route, s0, s1, 4, (s) => [[XR + 0.5, TOP + 0.35], [XR + 0.5, TOP - 0.1], [XR, TOP - 0.1]], 3),
    ribbon(route, s0, s1, 4, (s) => [[XL(s), TOP - 0.1], [XL(s) - 0.5, TOP - 0.1], [XL(s) - 0.5, TOP + 0.35]], 3),
    ribbon(route, s0, s1, 4, (s) => [[XR, TOP - 0.1], [XL(s), TOP - 0.1]], 3),
  ]), conc));
  grp.add(new THREE.Mesh(mergeGeoms([
    ribbon(route, s0, s1, 6, () => [[XR, W0], [XR, W1]]),
    ribbon(route, s0, s1, 6, (s) => [[XL(s), W0], [XL(s), W1]]),
  ]), glass));
  const frame = new THREE.MeshLambertMaterial({ color: 0x5f6466 });
  const mull = instancesAlong(route, s0, s1, 3, new THREE.BoxGeometry(0.16, W1 - W0, 0.16).translate(0, (W0 + W1) / 2, 0), frame, (s) => [{ x: XR, y: 0 }, { x: XL(s), y: 0 }]);
  if (mull) grp.add(mull);
  const lamp = instancesAlong(route, s0, s1, 9, new THREE.BoxGeometry(0.3, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: 0xfff4dc }), (s) => [{ x: 0, y: TOP - 0.15 }, { x: OF(s), y: TOP - 0.15 }]);
  if (lamp) grp.add(lamp);
  return grp;
}

// открытый метромост: плита проезжей части, коробчатые балки, перила, опоры до земли/дна
function openBridge(route, s0, s1, OX) {
  const grp = new THREE.Group();
  const xr = 3.2, xl = OX - 3.2;
  const conc = new THREE.MeshLambertMaterial({ map: concreteTexture('#9a968c'), color: 0xd8d8d8, side: THREE.DoubleSide });
  const steel = new THREE.MeshLambertMaterial({ color: 0x5f7a86, side: THREE.DoubleSide });
  grp.add(new THREE.Mesh(mergeGeoms([
    sweep(route, s0, s1, [{ x: xr, y: -0.3 }, { x: xl, y: -0.3 }], { step: 4, uScale: 3, vScale: 3 }),
    sweep(route, s0, s1, [{ x: xl, y: -0.3 }, { x: xl, y: -0.75 }, { x: xr, y: -0.75 }, { x: xr, y: -0.3 }], { step: 4, uScale: 3, vScale: 3 }),
  ]), conc));
  // две коробчатые балки пролётного строения
  grp.add(new THREE.Mesh(mergeGeoms([
    sweep(route, s0, s1, [{ x: xr - 0.6, y: -0.75 }, { x: xr - 0.6, y: -3.0 }, { x: xr - 2.4, y: -3.0 }, { x: xr - 2.4, y: -0.75 }], { step: 6, uScale: 3, vScale: 3 }),
    sweep(route, s0, s1, [{ x: xl + 2.4, y: -0.75 }, { x: xl + 2.4, y: -3.0 }, { x: xl + 0.6, y: -3.0 }, { x: xl + 0.6, y: -0.75 }], { step: 6, uScale: 3, vScale: 3 }),
  ]), steel));
  // перила
  const rail = new THREE.MeshLambertMaterial({ color: 0x3e4446, side: THREE.DoubleSide });
  const posts = instancesAlong(route, s0, s1, 2.5, new THREE.BoxGeometry(0.07, 1.1, 0.07).translate(0, 0.25, 0), rail, () => [{ x: xr - 0.1, y: 0 }, { x: xl + 0.1, y: 0 }]);
  if (posts) grp.add(posts);
  grp.add(new THREE.Mesh(mergeGeoms([
    sweep(route, s0, s1, [{ x: xr - 0.1, y: 0.8 }, { x: xr - 0.1, y: 0.86 }], { step: 6 }),
    sweep(route, s0, s1, [{ x: xl + 0.1, y: 0.8 }, { x: xl + 0.1, y: 0.86 }], { step: 6 }),
    sweep(route, s0, s1, [{ x: xr - 0.1, y: 0.35 }, { x: xr - 0.1, y: 0.4 }], { step: 6 }),
    sweep(route, s0, s1, [{ x: xl + 0.1, y: 0.35 }, { x: xl + 0.1, y: 0.4 }], { step: 6 }),
  ]), rail));
  // опоры: от низа балок до дна (уходят в рельеф на берегу)
  const pierM = new THREE.MeshLambertMaterial({ map: concreteTexture('#a39e94') });
  const first = Math.ceil(s0 / 42) * 42;
  const pg = [];
  const f = {};
  for (let s = first; s < s1; s += 42) {
    route.frameAt(s, f);
    const h = route.y(s) - (GROUND_Y - 11) - 3; // до дна реки / в грунт
    const g = new THREE.BoxGeometry(OX * -1 + 2, h, 2.4);
    g.translate(OX / 2, -3 - h / 2, 0);
    g.applyMatrix4(route.matrixAt(s, new THREE.Matrix4(), true));
    pg.push(g);
  }
  if (pg.length) grp.add(new THREE.Mesh(mergeGeoms(pg), pierM));
  return grp;
}

function oppTrack(route, s0, s1, OPP_X = -12.96) {
  // встречный путь — смещён на OPP_X (число или функция от s)
  const m = sharedMats();
  const g2 = new THREE.Group();
  const fx = typeof OPP_X === 'function' ? OPP_X : null;
  const x0 = fx ? 0 : OPP_X;
  const shift = fx ? (s) => fx(s) : null;
  const prof = (x) => [{ x: x - 0.07, y: -0.16 }, { x: x + 0.07, y: -0.16 }, { x: x + 0.036, y: 0 }, { x: x - 0.036, y: 0 }];
  for (const x of [x0 - 0.762, x0 + 0.762]) g2.add(new THREE.Mesh(sweep(route, s0, s1, prof(x), { step: fx ? 2 : 4, closed: true, shift }), m.rail));
  const sleep = instancesAlong(route, s0, s1, 0.75, new THREE.BoxGeometry(2.3, 0.13, 0.24), m.sleeper, (s) => [{ x: fx ? fx(s) : OPP_X, y: -0.22 }]);
  if (sleep) g2.add(sleep);
  return g2;
}

function bridgeGallery(route, s0, s1, OPP_X = -12.96) {
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
