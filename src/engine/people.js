// Пассажиры на платформе: ожидание, выход из вагонов, посадка.
import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { EDGE_X, PLAT_Y } from './station.js';

const COATS = ['#2b2f3a', '#3a2d2a', '#5a1f24', '#1f3a5a', '#6a6a6a', '#2a4a3a', '#8a6a3a', '#c9c2b4', '#1d1d1d', '#7a2a4a', '#3d5a8a', '#a8a8a0'];
const PANTS = ['#1d1f24', '#2a2f3a', '#3a3a3a', '#4a3a2a', '#20304a'];
const HEADS = ['#e0b896', '#d2a27c', '#c48a64', '#e8c4a4'];
const HAIR = ['#2a1d14', '#4a3020', '#7a5a3a', '#1a1a1a', '#b9a27a', '#d0d0d0', '#5a1f24'];

export class Crowd {
  constructor(scene, cap = 140) {
    this.cap = cap;
    const torso = new THREE.CylinderGeometry(0.2, 0.17, 0.66, 8).translate(0, 1.2, 0);
    torso.scale(1, 1, 0.65);
    const head = new THREE.SphereGeometry(0.115, 10, 8).translate(0, 1.66, 0);
    const hair = new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 1.68, 0.01);
    const leg = new THREE.BoxGeometry(0.13, 0.86, 0.15).translate(0, -0.43, 0);
    const arm = new THREE.BoxGeometry(0.09, 0.6, 0.1).translate(0, -0.3, 0);
    const mk = (g) => {
      const m = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff }), cap);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
      return m;
    };
    this.mTorso = mk(torso); this.mHead = mk(head); this.mHair = mk(hair); this.mLegs = mk(leg); this.mArms = mk(arm);
    this.mLegs.count = 0; this.mArms.count = 0;
    // для ног и рук — по 2 экземпляра на человека
    for (const m of [this.mLegs, this.mArms]) {
      scene.remove(m);
      const m2 = new THREE.InstancedMesh(m.geometry, m.material, cap * 2);
      m2.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m2.frustumCulled = false; m2.count = 0;
      scene.add(m2);
      if (m === this.mLegs) this.mLegs = m2; else this.mArms = m2;
    }
    this.people = [];
    this.station = null;
    this.tmp = new THREE.Matrix4();
    this.tmp2 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.boarded = 0; this.alighted = 0;
    this.rng = mulberry32(1234);
  }

  clear() {
    this.people = [];
    this.station = null;
    this._sync();
  }

  _new(x, z, state) {
    const r = this.rng;
    const p = {
      x, z, state, tx: x, tz: z, speed: 1.1 + r() * 0.5, phase: r() * 6, yaw: Math.PI / 2 + (r() - 0.5) * 0.6,
      wait: 0, door: -1, h: 0.9 + r() * 0.2,
      coat: new THREE.Color(COATS[Math.floor(r() * COATS.length)]),
      pants: new THREE.Color(PANTS[Math.floor(r() * PANTS.length)]),
      skin: new THREE.Color(HEADS[Math.floor(r() * HEADS.length)]),
      hair: new THREE.Color(HAIR[Math.floor(r() * HAIR.length)]),
    };
    this.people.push(p);
    return p;
  }

  // st: результат buildStation; count — сколько людей ждут поезд
  setup(st, count) {
    this.people = [];
    this.station = st;
    this.matrix = st.group.matrixWorld.clone();
    this.inv = this.matrix.clone().invert();
    const info = st.info;
    const pl = info.platform;
    const r = this.rng;
    for (let i = 0; i < count; i++) {
      // большинство ждут у края платформы, часть — в центральной части
      let x, z;
      if (r() < 0.7) { x = EDGE_X - 0.9 - r() * 1.4; z = pl.z0 + 6 + r() * (pl.z1 - pl.z0 - 12); }
      else { const sp = info.spots[Math.floor(r() * info.spots.length)] || { x: -6, z: 0 }; x = sp.x + (r() - 0.5) * 2.5; z = sp.z + (r() - 0.5) * 6; }
      x = Math.min(pl.x1, Math.max(pl.x0, x));
      const p = this._new(x, z, 'wait');
      p.yaw = Math.PI / 2 + (r() - 0.5) * 1.2; // лицом к пути (+X)
    }
    // несколько человек прогуливаются
    for (let i = 0; i < Math.min(8, count / 4); i++) {
      const sp = info.spots[Math.floor(r() * info.spots.length)] || { x: -6, z: 0 };
      const p = this._new(sp.x, sp.z, 'stroll');
      p.tz = pl.z0 + r() * (pl.z1 - pl.z0);
    }
    this.boarded = 0; this.alighted = 0;
    this._sync();
  }

  // двери открылись: doorsWorld — мировые позиции дверей (левая сторона)
  doorsOpened(doorsWorld, loadFactor = 1) {
    if (!this.station) return;
    const v = new THREE.Vector3();
    const doors = doorsWorld.map((d) => { v.copy(d).applyMatrix4(this.inv); return { x: v.x, z: v.z }; });
    const pl = this.station.info.platform;
    this.doors = doors.filter((d) => d.z > pl.z0 - 2 && d.z < pl.z1 + 2);
    const r = this.rng;
    // выходящие
    for (const [i, d] of this.doors.entries()) {
      const n = Math.floor(r() * 3.2 * loadFactor);
      for (let k = 0; k < n; k++) {
        const p = this._new(EDGE_X + 0.7, d.z + (r() - 0.5) * 0.6, 'exit');
        p.door = i; p.wait = k * 0.9 + r() * 0.4;
        p.tx = EDGE_X - 1.2 - r() * 1.5; p.tz = d.z + (r() - 0.5) * 3;
        p.yaw = -Math.PI / 2;
      }
    }
    // ожидающие выбирают ближайшую дверь
    for (const p of this.people) {
      if (p.state !== 'wait' && p.state !== 'stroll') continue;
      let best = -1, bd = 1e9;
      this.doors.forEach((d, i) => { const dd = Math.abs(d.z - p.z) + Math.abs(d.x - p.x) * 0.5; if (dd < bd) { bd = dd; best = i; } });
      if (best >= 0 && bd < 22) {
        p.state = 'toDoor'; p.door = best;
        const d = this.doors[best];
        const side = p.z < d.z ? -1 : 1;
        p.tx = EDGE_X - 0.55 - r() * 0.5; p.tz = d.z + side * (0.75 + r() * 0.5);
        p.wait = 1.2 + r() * 2.0;
      }
    }
  }

  doorsClosing() {
    for (const p of this.people) {
      if (p.state === 'toDoor' || p.state === 'queue') { p.state = 'wait'; p.tx = p.x - 0.8; p.tz = p.z; }
    }
    this.doors = null;
  }

  // идёт ли ещё посадка/высадка
  busy() {
    return this.people.some((p) => p.state === 'exit' || p.state === 'toDoor' || p.state === 'queue' || p.state === 'enter');
  }

  _sync() {
    const n = Math.min(this.people.length, this.cap);
    this.mTorso.count = n; this.mHead.count = n; this.mHair.count = n; this.mLegs.count = n * 2; this.mArms.count = n * 2;
  }

  update(dt) {
    if (!this.station) return;
    const exits = this.station.info.exits;
    const step = (p, spd) => {
      const dx = p.tx - p.x, dz = p.tz - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) return true;
      const s = Math.min(d, spd * dt);
      p.x += dx / d * s; p.z += dz / d * s;
      const want = Math.atan2(dx, dz);
      let da = want - p.yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      p.yaw += da * Math.min(1, dt * 8);
      p.phase += s * 5.5;
      return d < 0.08;
    };
    for (const p of this.people) {
      switch (p.state) {
        case 'wait': if (Math.hypot(p.tx - p.x, p.tz - p.z) > 0.1) step(p, p.speed * 0.6); break;
        case 'stroll':
          if (step(p, p.speed * 0.7)) { const pl = this.station.info.platform; p.tz = pl.z0 + this.rng() * (pl.z1 - pl.z0); p.tx = Math.min(pl.x1, Math.max(pl.x0, p.x + (this.rng() - 0.5) * 3)); }
          break;
        case 'exit':
          if (p.wait > 0) { p.wait -= dt; p.hidden = true; break; }
          p.hidden = false;
          if (step(p, p.speed)) {
            p.state = 'leave';
            let best = exits[0], bd = 1e9;
            for (const e of exits) { const d = Math.abs(e.z - p.z); if (d < bd) { bd = d; best = e; } }
            p.tx = best.x + (this.rng() - 0.5) * 3; p.tz = best.z;
            this.alighted++;
          }
          break;
        case 'leave':
          if (step(p, p.speed)) p.state = 'gone';
          break;
        case 'toDoor':
          if (step(p, p.speed)) { p.state = 'queue'; }
          break;
        case 'queue': {
          p.wait -= dt;
          // ждём, пока выйдут из этой двери
          const exiting = this.people.some((q) => q.state === 'exit' && q.door === p.door);
          if (p.wait <= 0 && !exiting && this.doors) {
            const d = this.doors[p.door];
            p.state = 'enter'; p.tx = EDGE_X + 1.2; p.tz = d.z + (this.rng() - 0.5) * 0.5;
          }
          break;
        }
        case 'enter':
          if (step(p, p.speed * 0.9)) { p.state = 'gone'; this.boarded++; }
          break;
        default: break;
      }
    }
    if (this.people.some((p) => p.state === 'gone')) this.people = this.people.filter((p) => p.state !== 'gone');
    this._render();
  }

  _render() {
    this._sync();
    const n = Math.min(this.people.length, this.cap);
    const M = this.tmp, L = this.tmp2, q = this.q;
    const e = new THREE.Euler();
    const pos = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const p = this.people[i];
      const walking = p.state !== 'wait' && p.state !== 'queue';
      const sw = walking ? Math.sin(p.phase) : 0;
      const bob = walking ? Math.abs(Math.cos(p.phase)) * 0.03 : 0;
      const y = (p.x > EDGE_X + 0.05 ? 1.15 : PLAT_Y) + bob;
      const s = p.hidden ? 0.0001 : p.h;
      // корпус
      e.set(0, p.yaw, 0); q.setFromEuler(e);
      sc.set(s, s, s); pos.set(p.x, y, p.z);
      L.compose(pos, q, sc); M.multiplyMatrices(this.matrix, L);
      this.mTorso.setMatrixAt(i, M); this.mHead.setMatrixAt(i, M); this.mHair.setMatrixAt(i, M);
      this.mTorso.setColorAt(i, p.coat); this.mHead.setColorAt(i, p.skin); this.mHair.setColorAt(i, p.hair);
      // ноги
      for (let k = 0; k < 2; k++) {
        const side = k ? 1 : -1;
        e.set(sw * 0.5 * side, p.yaw, 0, 'YXZ'); q.setFromEuler(e);
        const ox = Math.cos(p.yaw) * 0.09 * side * s, oz = -Math.sin(p.yaw) * 0.09 * side * s;
        pos.set(p.x + ox, y + 0.88 * s, p.z + oz);
        L.compose(pos, q, sc); M.multiplyMatrices(this.matrix, L);
        this.mLegs.setMatrixAt(i * 2 + k, M); this.mLegs.setColorAt(i * 2 + k, p.pants);
        e.set(-sw * 0.45 * side, p.yaw, 0, 'YXZ'); q.setFromEuler(e);
        const ax = Math.cos(p.yaw) * 0.23 * side * s, az = -Math.sin(p.yaw) * 0.23 * side * s;
        pos.set(p.x + ax, y + 1.5 * s, p.z + az);
        L.compose(pos, q, sc); M.multiplyMatrices(this.matrix, L);
        this.mArms.setMatrixAt(i * 2 + k, M); this.mArms.setColorAt(i * 2 + k, p.coat);
      }
      e.set(0, 0, 0, 'XYZ');
    }
    for (const m of [this.mTorso, this.mHead, this.mHair, this.mLegs, this.mArms]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }
}
