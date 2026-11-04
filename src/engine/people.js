// Пассажиры: шарнирная модель (туловище, голова, руки, ноги), ходьба, ожидание,
// посадка в вагон, поездка (сидя/стоя) и выход на следующих станциях.
import * as THREE from 'three';
import { mulberry32, mergeGeoms } from './util.js';
import { EDGE_X, PLAT_Y } from './station.js';

const COATS = ['#2b2f3a', '#3a2d2a', '#5a1f24', '#1f3a5a', '#5d5d5d', '#2a4a3a', '#8a6a3a', '#c9c2b4', '#1d1d1d', '#7a2a4a', '#3d5a8a', '#a8a8a0', '#6b4a2e', '#2f2f46'];
const PANTS = ['#1d1f24', '#2a2f3a', '#3a3a3a', '#4a3a2a', '#20304a', '#2b2b2b', '#46505c'];
const SKIN = ['#e6bea0', '#d8a885', '#c9906c', '#eccbb0', '#b9805c'];
const HAIR = ['#2a1d14', '#4a3020', '#7a5a3a', '#161616', '#b9a27a', '#cfcfcf', '#5a2a1a', '#8a6a4a'];
const BAGS = ['#1a1a1a', '#5a3a22', '#7a1f24', '#2c3e5a'];

const HIP = 0.9, HIP_SIT = 0.5;
const EYE = new THREE.Color('#1c1a18'), LIP = new THREE.Color('#9a5a52');
const DOOR_IN_X = -0.95; // точка у двери внутри вагона (левая сторона)

// ---------- геометрия частей тела ----------
function capsule(r, len, seg = 12) { return new THREE.CapsuleGeometry(r, len, 4, seg); }

const PARTS = [
  // имя, геометрия, цветовой ключ, количество на человека
  ['torso', () => { const g = capsule(0.15, 0.26, 14); g.translate(0, 0.28, 0); g.scale(1.22, 1, 0.74); return g; }, 'coat', 1],
  ['hips', () => { const g = capsule(0.13, 0.1, 12); g.scale(1.15, 1, 0.8); return g; }, 'pants', 1],
  ['neck', () => new THREE.CylinderGeometry(0.048, 0.055, 0.12, 10), 'skin', 1],
  ['head', () => { const g = new THREE.SphereGeometry(0.104, 28, 20); g.scale(0.92, 1.12, 1.0); return g; }, 'skin', 1],
  ['eyes', () => mergeGeoms([-1, 1].map((sx) => { const g = new THREE.SphereGeometry(0.014, 8, 6); g.scale(1.3, 0.8, 0.6); g.translate(sx * 0.034, 0.018, 0.093); return g; })), 'eye', 1],
  ['brows', () => mergeGeoms([-1, 1].map((sx) => { const g = new THREE.BoxGeometry(0.035, 0.007, 0.01); g.rotateZ(sx * -0.12); g.translate(sx * 0.034, 0.042, 0.095); return g; })), 'hair', 1],
  ['ears', () => mergeGeoms([-1, 1].map((sx) => { const g = new THREE.SphereGeometry(0.022, 8, 6); g.scale(0.45, 1, 0.8); g.translate(sx * 0.094, 0.0, 0.0); return g; })), 'skin', 1],
  ['mouth', () => { const g = new THREE.BoxGeometry(0.036, 0.006, 0.008); g.translate(0, -0.045, 0.094); return g; }, 'lip', 1],
  ['hair', () => { const g = new THREE.SphereGeometry(0.112, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.52); g.scale(0.95, 1.1, 1.05); g.rotateX(-0.25); g.translate(0, 0.016, -0.012); return g; }, 'hair', 1],
  ['hairLong', () => { const g = capsule(0.09, 0.16, 10); g.scale(1.15, 1, 0.6); g.translate(0, -0.1, -0.07); return g; }, 'hair', 1],
  ['nose', () => { const g = new THREE.ConeGeometry(0.018, 0.04, 6); g.rotateX(Math.PI / 2); g.translate(0, -0.005, 0.1); return g; }, 'skin', 1],
  ['upperArm', () => { const g = capsule(0.047, 0.2, 10); g.translate(0, -0.15, 0); return g; }, 'coat', 2],
  ['foreArm', () => { const g = capsule(0.041, 0.19, 10); g.translate(0, -0.135, 0); return g; }, 'coat', 2],
  ['hand', () => { const g = new THREE.SphereGeometry(0.044, 10, 8); g.scale(0.8, 1.15, 0.55); return g; }, 'skin', 2],
  ['thigh', () => { const g = capsule(0.072, 0.3, 12); g.translate(0, -0.22, 0); return g; }, 'pants', 2],
  ['shin', () => { const g = capsule(0.056, 0.33, 10); g.translate(0, -0.22, 0); return g; }, 'pants', 2],
  ['shoe', () => { const g = capsule(0.045, 0.17, 8); g.rotateX(Math.PI / 2); g.scale(1.1, 0.85, 1); g.translate(0, -0.035, 0.05); return g; }, 'shoe', 2],
  ['coat', () => { const g = new THREE.CylinderGeometry(0.175, 0.26, 0.5, 14, 1, true); return g; }, 'coat', 1],
  ['bag', () => new THREE.BoxGeometry(0.1, 0.24, 0.3), 'bag', 1],
];

export class Crowd {
  constructor(scene, cap = 520) {
    this.cap = cap;
    this.meshes = {};
    for (const [name, mk, , count] of PARTS) {
      const geo = mk();
      const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: name === 'shoe' ? 0.4 : 0.85, metalness: 0 }), cap * count);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      m.userData.count = count;
      scene.add(m);
      this.meshes[name] = m;
    }
    this.people = [];
    this.station = null;
    this.train = null;
    this.ambient = null;
    this.boarded = 0; this.alighted = 0;
    this.rng = mulberry32(1234);
    this.M = new THREE.Matrix4(); this.B = new THREE.Matrix4(); this.T = new THREE.Matrix4();
    this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.v = new THREE.Vector3(); this.s = new THREE.Vector3();
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0);
  }

  attachTrain(train) {
    this.people = this.people.filter((p) => p.frame !== 'car' || p.train !== this.train);
    this.train = train;
  }

  attachAmbient(train) {
    this.people = this.people.filter((p) => !(p.frame === 'car' && p.train === this.ambient));
    this.ambient = train;
    if (train) this.fillRiders(train, 0.3);
  }

  clear() {
    this.people = this.people.filter((p) => p.frame === 'car');
    this.station = null;
    this._render();
  }

  clearAll() { this.people = []; this.station = null; this._render(); }

  _new(props) {
    const r = this.rng;
    const female = r() < 0.5;
    const p = {
      frame: 'st', x: 0, z: 0, state: 'wait', tx: 0, tz: 0, speed: 1.05 + r() * 0.5, phase: r() * 6,
      yaw: Math.PI / 2, wait: 0, door: -1, h: (female ? 0.93 : 0.99) + r() * 0.08, sit: false, hold: r() < 0.5,
      coat: new THREE.Color(COATS[Math.floor(r() * COATS.length)]),
      pants: new THREE.Color(PANTS[Math.floor(r() * PANTS.length)]),
      skin: new THREE.Color(SKIN[Math.floor(r() * SKIN.length)]),
      hair: new THREE.Color(HAIR[Math.floor(r() * HAIR.length)]),
      shoe: new THREE.Color(r() < 0.7 ? '#151515' : '#4a3424'),
      bag: new THREE.Color(BAGS[Math.floor(r() * BAGS.length)]),
      longHair: female && r() < 0.7, longCoat: r() < (female ? 0.6 : 0.35), hasBag: r() < 0.35, wide: 0.95 + r() * 0.12,
      ...props,
    };
    this.people.push(p);
    return p;
  }

  // случайные сидящие пассажиры в поезде (меню, встречные поезда)
  fillRiders(train, frac) {
    train.sections.forEach((sc, si) => {
      for (const sp of sc.spots) {
        if (sp.sit && !sp.used && this.rng() < frac) {
          sp.used = true;
          this._new({ frame: 'car', train, sec: si, x: sp.x, z: sp.z, yaw: sp.yaw, state: 'ride', sit: true, spot: sp });
        }
      }
    });
  }

  setup(st, count) {
    this.people = this.people.filter((p) => p.frame === 'car');
    this.station = st;
    this.matrix = st.group.matrixWorld.clone();
    this.inv = this.matrix.clone().invert();
    const info = st.info, pl = info.platform, r = this.rng;
    for (let i = 0; i < count; i++) {
      let x, z;
      if (r() < 0.7) { x = EDGE_X - 0.9 - r() * 1.4; z = pl.z0 + 6 + r() * (pl.z1 - pl.z0 - 12); }
      else { const sp = info.spots[Math.floor(r() * info.spots.length)] || { x: -6, z: 0 }; x = sp.x + (r() - 0.5) * 2.5; z = sp.z + (r() - 0.5) * 6; }
      x = Math.min(pl.x1, Math.max(pl.x0, x));
      this._new({ x, z, tx: x, tz: z, state: 'wait', yaw: Math.PI / 2 + (r() - 0.5) * 1.2 });
    }
    for (let i = 0; i < Math.min(8, count / 4); i++) {
      const sp = info.spots[Math.floor(r() * info.spots.length)] || { x: -6, z: 0 };
      this._new({ x: sp.x, z: sp.z, tx: sp.x, tz: pl.z0 + r() * (pl.z1 - pl.z0), state: 'stroll' });
    }
    this.boarded = 0; this.alighted = 0;
  }

  // двери открылись: выходят пассажиры из вагонов, ожидающие идут к дверям
  doorsOpened(doorsWorld, loadFactor = 1) {
    if (!this.station) return;
    const v = new THREE.Vector3();
    const pl = this.station.info.platform;
    this.doors = doorsWorld.map((d) => { v.copy(d).applyMatrix4(this.inv); return { x: v.x, z: v.z, sec: d.sec, lz: d.lz }; })
      .filter((d) => d.z > pl.z0 - 2 && d.z < pl.z1 + 2);
    const r = this.rng;
    const all = loadFactor >= 3;
    // выходящие — из числа едущих в этой секции, ближе к двери
    if (this.train) {
      const riders = this.people.filter((p) => p.frame === 'car' && p.train === this.train && p.state === 'ride');
      for (const p of riders) {
        const doorsHere = this.doors.map((d, i) => ({ d, i })).filter(({ d }) => d.sec === p.sec);
        if (!doorsHere.length) continue;
        if (!all && r() > 0.32 * loadFactor) continue;
        let best = doorsHere[0];
        for (const dd of doorsHere) if (Math.abs(dd.d.lz - p.z) < Math.abs(best.d.lz - p.z)) best = dd;
        p.state = 'toDoorCar'; p.door = best.i; p.wait = r() * 2.5;
        p.tx = DOOR_IN_X + (r() - 0.5) * 0.3; p.tz = best.d.lz + (r() - 0.5) * 0.5;
        if (p.spot) { p.spot.used = false; p.spot = null; }
        p.sit = false;
      }
    }
    if (all) return; // на конечной никто не садится
    for (const p of this.people) {
      if (p.frame !== 'st' || (p.state !== 'wait' && p.state !== 'stroll')) continue;
      let best = -1, bd = 1e9;
      this.doors.forEach((d, i) => { const dd = Math.abs(d.z - p.z) + Math.abs(d.x - p.x) * 0.5; if (dd < bd) { bd = dd; best = i; } });
      if (best >= 0 && bd < 22) {
        p.state = 'toDoor'; p.door = best;
        const d = this.doors[best];
        const side = p.z < d.z ? -1 : 1;
        p.tx = EDGE_X - 0.55 - r() * 0.5; p.tz = d.z + side * (0.75 + r() * 0.5);
        p.wait = 1.5 + r() * 2.0;
      }
    }
  }

  doorsClosing() {
    for (const p of this.people) {
      if (p.frame === 'st' && (p.state === 'toDoor' || p.state === 'queue')) { p.state = 'wait'; p.tx = p.x - 0.8; p.tz = p.z; }
    }
    this.doors = null;
  }

  busy() {
    return this.people.some((p) => (p.frame === 'st' && (p.state === 'exit' || p.state === 'toDoor' || p.state === 'queue' || p.state === 'enter')) || (p.frame === 'car' && p.train === this.train && p.state === 'toDoorCar'));
  }

  // переход человека из системы станции в систему секции вагона и обратно
  _toCar(p, sec) {
    const sc = this.train.sections[sec];
    const w = this.v.set(p.x, 0, p.z).applyMatrix4(this.matrix);
    const inv = this.T.copy(sc.group.matrix).invert();
    w.applyMatrix4(inv);
    p.frame = 'car'; p.train = this.train; p.sec = sec; p.x = w.x; p.z = w.z; p.yaw += Math.PI / 2 * 0;
    // свободное место: сидячее, если есть, иначе стоячее
    const free = sc.spots.filter((s) => !s.used);
    let pick = null;
    const seats = free.filter((s) => s.sit);
    const pool = seats.length && this.rng() < 0.8 ? seats : free;
    let bd = 1e9;
    for (const s of pool) { const d = Math.abs(s.z - p.z) + Math.abs(s.x - p.x) * 0.5 + this.rng() * 1.5; if (d < bd) { bd = d; pick = s; } }
    if (pick) { pick.used = true; p.spot = pick; p.tx = pick.x; p.tz = pick.z; }
    else { p.tx = p.x + 0.4; p.tz = p.z; }
    p.state = 'toSpot';
  }

  _toStation(p) {
    const sc = p.train.sections[p.sec];
    const w = this.v.set(p.x, 0, p.z).applyMatrix4(sc.group.matrix).applyMatrix4(this.inv);
    p.frame = 'st'; p.train = null; p.x = w.x; p.z = w.z; p.sec = -1;
  }

  update(dt) {
    const exits = this.station ? this.station.info.exits : [];
    const step = (p, spd) => {
      const dx = p.tx - p.x, dz = p.tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) return true;
      const s = Math.min(d, spd * dt);
      p.x += dx / d * s; p.z += dz / d * s;
      const want = Math.atan2(dx, dz);
      let da = want - p.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      p.yaw += da * Math.min(1, dt * 8);
      p.phase += s * 5.2;
      p.moving = true;
      return d < 0.08;
    };
    for (const p of this.people) {
      p.moving = false;
      switch (p.state) {
        case 'wait': if (Math.hypot(p.tx - p.x, p.tz - p.z) > 0.1) step(p, p.speed * 0.6); break;
        case 'stroll':
          if (this.station && step(p, p.speed * 0.7)) { const pl = this.station.info.platform; p.tz = pl.z0 + this.rng() * (pl.z1 - pl.z0); p.tx = Math.min(pl.x1, Math.max(pl.x0, p.x + (this.rng() - 0.5) * 3)); }
          break;
        case 'toDoorCar':
          if (p.wait > 0) { p.wait -= dt; break; }
          if (step(p, p.speed * 0.8)) {
            if (!this.station || !this.doors || !this.doors[p.door]) { p.state = 'ride'; break; }
            this._toStation(p);
            p.state = 'exit'; p.tx = EDGE_X - 1.2 - this.rng() * 1.5; p.tz = p.z + (this.rng() - 0.5) * 3;
          }
          break;
        case 'exit':
          if (step(p, p.speed)) {
            p.state = 'leave';
            let best = exits[0], bd = 1e9;
            for (const e of exits) { const d = Math.abs(e.z - p.z); if (d < bd) { bd = d; best = e; } }
            if (!best) { p.state = 'gone'; break; }
            p.tx = best.x + (this.rng() - 0.5) * 3; p.tz = best.z;
            this.alighted++;
          }
          break;
        case 'leave': if (step(p, p.speed)) p.state = 'gone'; break;
        case 'toDoor': if (step(p, p.speed)) p.state = 'queue'; break;
        case 'queue': {
          p.wait -= dt;
          const exiting = this.people.some((q) => (q.state === 'exit' && Math.abs(q.x - EDGE_X) < 1.2) || (q.state === 'toDoorCar' && q.door === p.door));
          if (p.wait <= 0 && !exiting && this.doors) {
            const d = this.doors[p.door];
            p.state = 'enter'; p.tx = EDGE_X + 0.75; p.tz = d.z + (this.rng() - 0.5) * 0.5;
          }
          break;
        }
        case 'enter':
          if (step(p, p.speed * 0.9)) {
            const d = this.doors && this.doors[p.door];
            if (this.train && d) { this._toCar(p, d.sec); this.boarded++; } else { p.state = 'gone'; this.boarded++; }
          }
          break;
        case 'toSpot':
          if (step(p, p.speed * 0.7)) {
            p.state = 'ride';
            if (p.spot) { p.sit = p.spot.sit; p.yaw = p.spot.yaw; }
          }
          break;
        default: break;
      }
    }
    if (this.people.some((p) => p.state === 'gone')) this.people = this.people.filter((p) => p.state !== 'gone');
    this._render();
  }

  _groundY(x, z) {
    const st = this.station && this.station.info.stairs;
    if (!st) return PLAT_Y;
    for (const s of st) {
      if (x < s.x0 || x > s.x1) continue;
      const beyond = (z - s.zWall) * s.o;
      if (beyond >= 0) return s.yTop;
      const t = (z - s.zBottom) / (s.zTop - s.zBottom);
      if (t >= 0) return s.yBottom + Math.min(1, t) * (s.yTop - s.yBottom);
    }
    return PLAT_Y;
  }

  _render() {
    const n = Math.min(this.people.length, this.cap);
    for (const m of Object.values(this.meshes)) m.count = n * m.userData.count;
    const ms = this.meshes;
    const B = this.B, M = this.M, q = this.q, e = this.e, v = this.v, sc3 = this.s;
    const put = (name, idx, local, col) => {
      M.multiplyMatrices(B, local);
      ms[name].setMatrixAt(idx, M);
      ms[name].setColorAt(idx, col);
    };
    const L = new THREE.Matrix4(), A = new THREE.Matrix4(), C = new THREE.Matrix4(), R = new THREE.Matrix4();
    const rotX = (a) => R.makeRotationX(a);
    const TT = this.TT || (this.TT = new THREE.Matrix4()), RZ = this.RZ || (this.RZ = new THREE.Matrix4()), SC = this.SC || (this.SC = new THREE.Matrix4());
    const tr = (x, y, z) => TT.makeTranslation(x, y, z);
    for (let i = 0; i < n; i++) {
      const p = this.people[i];
      let parent;
      if (p.frame === 'car') { const s = p.train && p.train.sections[p.sec]; if (!s) continue; parent = s.group.matrix; }
      else { if (!this.matrix) continue; parent = this.matrix; }
      const walking = p.moving;
      const sw = walking ? Math.sin(p.phase) : 0;
      const bob = walking ? Math.abs(Math.cos(p.phase)) * 0.025 : 0;
      const baseY = p.frame === 'car' ? 1.15 : (p.x > EDGE_X + 0.05 ? 1.15 : this._groundY(p.x, p.z));
      const sit = p.sit && !walking;
      // корневая матрица человека
      e.set(0, p.yaw, 0); q.setFromEuler(e);
      sc3.set(p.h * p.wide, p.h, p.h);
      v.set(p.x, baseY + bob, p.z);
      B.compose(v, q, sc3).premultiply(parent);
      const hipY = sit ? HIP_SIT : HIP;
      const lean = walking ? 0.06 : sit ? -0.08 : 0;
      // туловище и таз
      L.makeTranslation(0, hipY, 0); put('hips', i, L, p.pants);
      L.makeTranslation(0, hipY + 0.04, 0).multiply(rotX(lean)); put('torso', i, L, p.coat);
      L.makeTranslation(0, hipY + 0.6, Math.sin(lean) * 0.5).multiply(rotX(lean)); put('neck', i, L, p.skin);
      const hy = hipY + 0.73;
      L.makeTranslation(0, hy, Math.sin(lean) * 0.6); put('head', i, L, p.skin); put('hair', i, L, p.hair); put('nose', i, L, p.skin);
      put('eyes', i, L, EYE); put('brows', i, L, p.hair); put('ears', i, L, p.skin); put('mouth', i, L, LIP);
      if (p.longHair) put('hairLong', i, L, p.hair); else { ms.hairLong.setMatrixAt(i, this.zero); }
      // пальто/юбка
      if (p.longCoat && !sit) { L.makeTranslation(0, hipY - 0.2, 0).multiply(SC.makeScale(1, 1, 0.85)); put('coat', i, L, p.coat); } else ms.coat.setMatrixAt(i, this.zero);
      // руки
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        let up, fore;
        if (sit) { up = -0.35; fore = -1.1; }
        else if (p.frame === 'car' && p.hold && k === 1 && p.state === 'ride') { up = -2.85; fore = -0.2; }
        else { up = -sw * 0.45 * side; fore = -0.25 - Math.max(0, sw * side) * 0.4; }
        A.makeTranslation(side * 0.2, hipY + 0.46, 0).multiply(rotX(up)).multiply(RZ.makeRotationZ(side * 0.08));
        put('upperArm', i * 2 + k, A, p.coat);
        C.copy(A).multiply(tr(0, -0.3, 0)).multiply(rotX(fore));
        put('foreArm', i * 2 + k, C, p.coat);
        C.multiply(tr(0, -0.29, 0));
        put('hand', i * 2 + k, C, p.skin);
        if (k === 0) {
          if (p.hasBag && !sit) { L.copy(C).multiply(tr(0, -0.14, 0)); put('bag', i, L, p.bag); } else ms.bag.setMatrixAt(i, this.zero);
        }
      }
      // ноги
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        let thigh, knee;
        if (sit) { thigh = -1.5; knee = 1.45; }
        else { thigh = sw * 0.48 * side; knee = walking ? Math.max(0, -Math.sin(p.phase + (side > 0 ? 0 : Math.PI)) ) * 0.7 : 0.02; }
        A.makeTranslation(side * 0.09, hipY - 0.02, 0).multiply(rotX(thigh));
        put('thigh', i * 2 + k, A, p.pants);
        C.copy(A).multiply(tr(0, -0.44, 0)).multiply(rotX(knee));
        put('shin', i * 2 + k, C, p.pants);
        C.multiply(tr(0, -0.44, 0)).multiply(rotX(-knee - thigh));
        put('shoe', i * 2 + k, C, p.shoe);
      }
    }
    for (const m of Object.values(ms)) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
  }
}
