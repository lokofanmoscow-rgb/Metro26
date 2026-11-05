import { transfersFor, arrivalText, departText, TERMINAL_TEXT } from './engine/announce.js';
// Ядро игры: сцена, подгрузка мира по ходу движения, физика поезда, станции, камеры.
import * as THREE from 'three';
import { Route } from './engine/route.js';
import { buildTunnelChunk, buildTransitionRing } from './engine/tunnel.js';
import { buildStation } from './engine/station.js';
import { buildOutdoorChunk, buildOutdoorEnv, buildPortal, buildSky } from './engine/outdoor.js';
import { Train, drawPanel } from './engine/train.js';
import { Crowd } from './engine/people.js';
import { Sound } from './engine/audio.js';
import { releaseTextures } from './engine/textures.js';
import { HQ, initHQ, captureEnv } from './engine/hq.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { disposeObject, clamp, lerp, fmtTime, mulberry32 } from './engine/util.js';
import { LINES, TRAINS } from './data/lines.js';
import { SCHEME } from './data/scheme.js';

const CHUNK = 200;
const clockStr = (t) => { t = Math.floor(t % 86400); const p = (n) => String(n).padStart(2, '0'); return `${p(Math.floor(t / 3600))}:${p(Math.floor(t / 60) % 60)}`; };


export class Game {
  constructor(canvas, ui) {
    this.ui = ui;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030303);
    this.scene.fog = new THREE.FogExp2(0x050505, 0.012);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 5000);
    initHQ(this.renderer);
    // нейтральная «студийная» карта окружения для лакированных кузовов вне детальных станций
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.defaultEnv = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.hemi = new THREE.HemisphereLight(0xfff4e2, 0x4a4238, 0.2);
    this.scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0.04);
    this.scene.add(this.amb);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 0);
    this.sun.position.set(300, 500, 200);
    this.scene.add(this.sun);
    this.pool = [];
    for (let i = 0; i < 8; i++) {
      const l = new THREE.PointLight(0xfff1d8, 0, 34, 1.3);
      this.scene.add(l);
      this.pool.push(l);
    }
    this.sky = buildSky();
    this.scene.add(this.sky);
    this.sound = new Sound();
    this.crowd = new Crowd(this.scene);
    this.loaded = new Map();
    this.ambientPool = {};
    this.settings = { volume: 0.8, voice: true, hud: true, short: false, quality: 2, sens: 1, fx: true };
    this.keys = { up: false, down: false };
    this.view = { yaw: 0, pitch: -0.04, mode: 'cab', oyaw: -0.9, opitch: 0.14, odist: 13 };
    this.mode = 'idle';
    this.paused = false;
    this.clock = new THREE.Clock();
    this.msgTimer = 0;
    this._bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.renderer.setAnimationLoop(() => this._frame());
  }

  // постобработка: свечение ламп (bloom); отражения пола включаются вместе с ней
  _setupFx() {
    HQ.fx = !!this.settings.fx;
    if (this.settings.fx && !this.composer) {
      const c = new EffectComposer(this.renderer);
      c.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.45, 1.0);
      c.addPass(this.bloom);
      c.addPass(new OutputPass());
      this.composer = c;
    } else if (!this.settings.fx && this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
    this.camera.aspect = w / h;
    this._applyFov();
  }

  // вертикальный угол обзора: на узких (портретных) экранах расширяем, чтобы был виден путь
  _applyFov() {
    const base = this.fovBase || 70;
    const a = this.camera.aspect;
    let f = base;
    if (a < 1.3) f = Math.min(100, 2 * Math.atan(Math.tan((base / 2) * Math.PI / 180) * 1.3 / a) * 180 / Math.PI);
    this.camera.fov = f;
    this.camera.updateProjectionMatrix();
  }

  applySettings(s) {
    Object.assign(this.settings, s);
    this.sound.setVolume(this.settings.volume);
    this.sound.voice = this.settings.voice;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.settings.quality));
    this._setupFx();
    this.resize();
  }

  // ---------- запуск ----------
  setup({ line, dir = 0, train = '717', s = null, v = 0, state = null, showroom = false, startK = 0 }) {
    this._clearWorld();
    this.lineId = line;
    this.line = LINES[line];
    this.dir = dir;
    this.trainId = train;
    this.route = new Route(this.line, dir, { shortSpans: this.settings.short });
    const R = this.route;
    const first = R.stations[0];
    const last = R.stations[R.stations.length - 1];
    if (this.train) { this.scene.remove(this.train.group); this.train.dispose(); }
    this.train = new Train(TRAINS[train], last.name);
    this.scene.add(this.train.group);
    this.crowd.attachTrain(this.train);
    if (showroom) this.crowd.fillRiders(this.train, 0.35);
    else if (state || startK > 0) this.crowd.fillRiders(this.train, 0.25);
    startK = clamp(startK | 0, 0, R.stations.length - 2);
    this.startK = startK;
    this.s = s != null ? s : R.stations[startK].stop;
    this.v = v;
    this.traction = 0; this.brake = 0;
    this.doorF = 0; this.doorTarget = 0; this.doorsMoving = false;
    this.stats = state?.stats || { score: 0, served: 0, perfect: 0, skipped: 0, overspeedT: 0, pax: 0, dist: 0, errSum: 0, stops: 0 };
    this.gameTime = state?.gameTime ?? (6 * 3600 + 12 * 60);
    this.elapsed = state?.elapsed ?? 0;
    this.servedSet = new Set(state?.served || []);
    this.announced = new Set(state?.announced || []);
    this.atStation = null;
    // уже пройденные станции (при загрузке сохранения) повторно не штрафуем
    this._skipNoted = new Set(state?.skipped || []);
    if (state) for (const st of this.route.stations) if (this.s > st.stop + 30) this._skipNoted.add(st.k);
    // старт с выбранной станции: предыдущие станции не считаются пропущенными
    for (const st of this.route.stations) if (st.k < startK) { this._skipNoted.add(st.k); this.announced.add(st.k); }
    this.finished = false;
    this.overspeed = false;
    this.intervals = new Map();
    this.ambient = null;
    this.rng = mulberry32(Date.now() & 0xffff);
    this._warmAmbient();
    this.train.update(R, this.s);
    this._stream(true);
    this.crowd.clear();
    this.mode = showroom ? 'menu' : 'drive';
    this.sound.setActive(!showroom);
    this.view.mode = showroom ? 'menu' : 'cab';
    this.view.yaw = 0; this.view.pitch = -0.08;
    this.train.cab.group.visible = !showroom;
    if (state?.doorsOpen) { this.doorF = 1; this.doorTarget = 1; this.train.setDoors(1, this._doorSide()); }
    // на старте — посадка на первой станции
    const stNow = this._stationNear();
    if (!showroom && stNow && Math.abs(this.s - stNow.st.stop) < 1 && !state) {
      this._prepareCrowd(stNow, true);
      this.doorTarget = 1; this.doorF = 1; this.train.setDoors(1, this._doorSide());
      this.atStation = stNow.st.k;
      this._dwellStart = this.elapsed;
      this.servedSet.add(stNow.st.k);
      this.crowd.doorsOpened(this.train.doorWorld(this._doorSide()), 0, this._doorSide());
      this._msg(`Станция «${stNow.st.name}». Идёт посадка. Закройте двери [Пробел] и начинайте движение [W].`, 7);
    } else if (showroom && stNow) {
      this._prepareCrowd(stNow, true);
    } else if (stNow && state?.doorsOpen) {
      this.atStation = stNow.st.k;
      this._prepareCrowd(stNow, false);
    }
    this._updateLights(0, true);
    this.sound.lastJoint.clear();
  }

  _clearWorld() {
    for (const [, it] of this.loaded) this._unloadItem(it);
    this.loaded.clear();
    this._hideAmbient();
  }

  _unloadItem(it) {
    this.scene.remove(it.obj);
    if (it.built && it.built.info) {
      if (it.built.info.reflector && it.built.info.reflector.dispose) it.built.info.reflector.dispose();
      if (it.built.info.env) it.built.info.env.dispose();
    }
    disposeObject(it.obj);
    if (it.kind === 'st') releaseTextures(it.st.name);
  }

  // ---------- подгрузка мира ----------
  _needed() {
    const R = this.route;
    const s = this.mode === 'menu' ? R.stations[this.startK || 0].c : this.s;
    const lo = s - 420, hi = s + 950;
    const need = new Map();
    R.stations.forEach((st, k) => {
      if (st.c + 84 > lo && st.c - 84 < hi) need.set('st:' + k, { kind: 'st', k, a: st.c - 84, b: st.c + 84 });
    });
    R.zones.forEach((z, zi) => {
      if (z.s1 < lo || z.s0 > hi) return;
      if (z.kind === 'station') return;
      const c0 = Math.floor(Math.max(z.s0, lo) / CHUNK), c1 = Math.floor(Math.min(z.s1, hi) / CHUNK);
      for (let c = c0; c <= c1; c++) {
        const a = Math.max(z.s0, c * CHUNK), b = Math.min(z.s1, (c + 1) * CHUNK);
        if (b - a < 0.5) continue;
        if (z.kind === 'tunnel') need.set(`tu:${zi}:${c}`, { kind: 'tu', a, b, deep: z.deep });
        else need.set(`od:${zi}:${c}`, { kind: 'od', a, b, zone: z });
      }
      if (z.kind === 'outdoor') {
        need.set(`env:${zi}`, { kind: 'env', a: z.s0, b: z.s1, zone: z });
        if (z.s0 > 1) need.set(`po:${zi}:0`, { kind: 'po', a: z.s0 - 10, b: z.s0 + 10, at: z.s0, fwd: false, zone: z });
        if (z.s1 < R.length - 1) need.set(`po:${zi}:1`, { kind: 'po', a: z.s1 - 10, b: z.s1 + 10, at: z.s1, fwd: true, zone: z });
      }
      if (z.kind === 'tunnel' && zi > 0) {
        const p = R.zones[zi - 1];
        if (p.kind === 'tunnel' && p.deep !== z.deep) need.set(`tr:${zi}`, { kind: 'tr', a: z.s0 - 1, b: z.s0 + 1, at: z.s0 });
      }
    });
    return { need, lo, hi };
  }

  _build(key, it) {
    const R = this.route;
    let obj = null;
    if (it.kind === 'st') {
      const st = R.stations[it.k];
      const built = buildStation(R, st, this.line);
      obj = built.group;
      it.st = st; it.built = built;
      if (!this.intervals.has(it.k)) this.intervals.set(it.k, 40 + this.rng() * 100);
    } else if (it.kind === 'tu') obj = buildTunnelChunk(R, it.a, it.b, it.deep);
    else if (it.kind === 'od') obj = buildOutdoorChunk(R, it.a, it.b, it.zone);
    else if (it.kind === 'env') obj = buildOutdoorEnv(R, it.zone);
    else if (it.kind === 'po') obj = buildPortal(R, it.at, it.fwd, it.zone);
    else if (it.kind === 'tr') obj = buildTransitionRing(R, it.at);
    if (!obj) return;
    it.obj = obj;
    this.scene.add(obj);
    this.loaded.set(key, it);
    // детальные станции: снимаем карту окружения для отражений мрамора и рассеянного света
    if (it.kind === 'st' && it.built.info.hq) { try { captureEnv(this.renderer, this.scene, it.built); } catch (e) { console.warn('env', e); } }
  }

  _stream(sync = false) {
    const { need, lo, hi } = this._needed();
    for (const [k, it] of this.loaded) {
      if (!need.has(k) && (it.b < lo - 150 || it.a > hi + 150 || sync)) { this._unloadItem(it); this.loaded.delete(k); }
    }
    const todo = [...need].filter(([k]) => !this.loaded.has(k));
    if (!todo.length) return;
    const s = this.s;
    todo.sort((x, y) => {
      const dx = Math.max(0, x[1].a - s, s - x[1].b - 160), dy = Math.max(0, y[1].a - s, s - y[1].b - 160);
      return dx - dy;
    });
    const t0 = performance.now();
    for (const [k, it] of todo) {
      this._build(k, it);
      if (!sync && performance.now() - t0 > 10) break;
    }
  }

  _stationObj(k) { return this.loaded.get('st:' + k)?.built || null; }
  // сторона посадки: -1 — слева (островная платформа), +1 — справа (боковая платформа)
  _doorSide() {
    const near = this._stationNear();
    return (near && near.obj && near.obj.info.side) || -1;
  }

  _stationNear() {
    const R = this.route;
    let best = null, bd = 1e9;
    R.stations.forEach((st, k) => {
      const d = Math.abs(this.s - st.stop);
      if (d < bd) { bd = d; best = k; }
    });
    if (best == null) return null;
    const o = this._stationObj(best);
    return o ? { st: R.stations[best], obj: o, d: bd } : null;
  }

  _prepareCrowd(near, start) {
    const st = near.st;
    const R = this.route;
    const last = st.k === R.stations.length - 1;
    const big = transfersFor(st.sid).length > 0;
    const n = last ? 2 : Math.round((big ? 28 : 14) + this.rng() * (big ? 34 : 20));
    this.crowd.setup(near.obj, start ? n : n);
    this._crowdStation = st.k;
  }

  // ---------- ввод ----------
  _bindInput() {
    const down = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (this.mode !== 'drive') return;
      const c = e.code;
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (c === 'KeyW' || c === 'ArrowUp') { this.keys.up = true; e.preventDefault(); }
      else if (c === 'KeyS' || c === 'ArrowDown') { this.keys.down = true; e.preventDefault(); }
      else if (c === 'Space' || c === 'KeyE') { if (!e.repeat) this.toggleDoors(); e.preventDefault(); }
      else if (c === 'KeyC') { if (!e.repeat) this.toggleOutside(); }
      else if (c === 'KeyM') { if (!e.repeat) this.ui.toggleMap(); }
      else if (c === 'KeyH') { if (!e.repeat) this.ui.toggleHud(); }
      else if (c === 'Escape') { if (!e.repeat) this.ui.togglePause(); }
    };
    const up = (e) => {
      const c = e.code;
      if (c === 'Space' && this.mode === 'drive') e.preventDefault();
      if (c === 'KeyW' || c === 'ArrowUp') this.keys.up = false;
      if (c === 'KeyS' || c === 'ArrowDown') this.keys.down = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', () => { this.keys.up = this.keys.down = false; });
    // обзор мышью / пальцем
    let drag = null;
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => {
      this.sound.init();
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      this._look(dx, dy);
    });
    const end = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', (e) => {
      if (this.view.mode === 'outside' || this.view.mode === 'menu') this.view.odist = clamp(this.view.odist * (1 + Math.sign(e.deltaY) * 0.1), 3.5, 40);
      else { this.fovBase = clamp((this.fovBase || 70) + Math.sign(e.deltaY) * 4, 35, 90); this._applyFov(); }
      e.preventDefault();
    }, { passive: false });
  }

  _look(dx, dy) {
    const k = 0.0042 * this.settings.sens;
    if (this.view.mode === 'cab') {
      this.view.yaw -= dx * k;
      this.view.pitch = clamp(this.view.pitch - dy * k, -1.2, 1.1);
    } else if (this.view.mode === 'menu') {
      this.view.mOff = (this.view.mOff || 0) - dx * k;
      this.view.opitch = clamp(this.view.opitch + dy * k, -0.15, 1.2);
    } else {
      this.view.oyaw -= dx * k;
      this.view.opitch = clamp(this.view.opitch + dy * k, -0.15, 1.2);
    }
  }

  setKey(name, v) { this.keys[name] = v; if (v) this.sound.init(); }

  // ---------- двери ----------
  toggleDoors() {
    if (this.mode !== 'drive' || this.finished && this.doorTarget === 0) return;
    this.sound.init();
    if (this.doorsMoving) return;
    if (this.doorTarget === 0) {
      if (this.v > 0.05) { this._msg('Сначала остановите поезд'); return; }
      const R = this.route;
      const k = R.stations.findIndex((st) => Math.abs(this.s - st.stop) <= 14);
      if (k < 0) {
        const near = R.stations.find((st) => this.s > st.p0 - 120 && this.s < st.stop);
        if (near) this._msg(`Не доехали до остановочной отметки ${Math.round(near.stop - this.s)} м`);
        else this._msg('Двери можно открывать только на платформе');
        return;
      }
      const st = R.stations[k];
      const err = this.s - st.stop;
      if (err > 6) { this._msg(`Проезд остановочной отметки на ${err.toFixed(1)} м — первый вагон вне платформы`); return; }
      if (err < -12) { this._msg(`Не доехали до остановочной отметки ${(-err).toFixed(1)} м`); return; }
      this.doorTarget = 1; this.doorsMoving = true;
      this.sound.doors(true, this.trainId);
      if (!this.servedSet.has(k)) {
        this.servedSet.add(k);
        const a = Math.abs(err);
        let pts = 10, label = 'Неточная остановка';
        if (a <= 0.5) { pts = 100; label = 'Идеальная остановка!'; this.stats.perfect++; }
        else if (a <= 1.5) { pts = 75; label = 'Отличная остановка'; }
        else if (a <= 3) { pts = 50; label = 'Хорошая остановка'; }
        else if (a <= 6) { pts = 25; label = 'Остановка с отклонением'; }
        this.stats.score += pts; this.stats.served++; this.stats.stops++; this.stats.errSum += a;
        this._msg(`${label}: ${err >= 0 ? '+' : '−'}${a.toFixed(1)} м  (+${pts})`, 4);
      }
      this.atStation = k;
      this._dwellStart = this.elapsed;
      const near = this._stationNear();
      if (near && this._crowdStation !== k) this._prepareCrowd(near, false);
      const last = k === R.stations.length - 1;
      setTimeout(() => this.crowd.doorsOpened(this.train.doorWorld(this._doorSide()), last ? 3.5 : 1, this._doorSide()), 900);
      if (last) setTimeout(() => this._msg('Конечная. Дождитесь высадки пассажиров.', 5), 1500);
    } else {
      const R = this.route;
      const k = this.atStation;
      const last = k === R.stations.length - 1;
      if (last) {
        if (this.crowd.busy()) { this._msg('Пассажиры ещё выходят'); return; }
        this._finish();
        return;
      }
      this.doorTarget = 0; this.doorsMoving = true;
      if (this.crowd.busy()) { this.stats.score = Math.max(0, this.stats.score - 15); this._msg('Двери закрыты до окончания посадки (−15)'); }
      this.crowd.doorsClosing();
      const next = R.stations[(k ?? R.nextStationIndex(this.s)) + 1];
      if (next) this.sound.say(departText(next.name));
      this.sound.doors(false, this.trainId);
    }
  }

  toggleOutside() {
    if (this.mode !== 'drive') return;
    if (this.view.mode === 'outside') { this.view.mode = 'cab'; this.train.cab.group.visible = true; this.ui.onView('cab'); return; }
    const near = this.route.stationAt(this.s);
    if (!near || this.v > 0.1) { this._msg('Вид снаружи доступен на станции во время стоянки'); return; }
    this.view.mode = 'outside';
    this.view.oyaw = -1.05; this.view.opitch = 0.16; this.view.odist = 11;
    this.train.cab.group.visible = false;
    this.ui.onView('outside');
  }

  _finish() {
    this.finished = true;
    this.keys.up = this.keys.down = false;
    const R = this.route;
    this.ui.onFinish({
      line: this.line, from: R.stations[0].name, to: R.stations[R.stations.length - 1].name,
      stats: this.stats, time: fmtTime(this.elapsed), train: TRAINS[this.trainId].name,
    });
  }

  // обратный рейс
  turnaround() {
    const st = { stats: this.stats, gameTime: this.gameTime, elapsed: this.elapsed };
    this.setup({ line: this.lineId, dir: 1 - this.dir, train: this.trainId, state: st });
    const R = this.route;
    this.s = R.stations[0].stop;
    this.train.update(R, this.s);
    this._stream(true);
    const near = this._stationNear();
    if (near) {
      this._prepareCrowd(near, true);
      this.doorTarget = 1; this.doorF = 1; this.train.setDoors(1, this._doorSide());
      this.atStation = 0; this.servedSet.add(0);
      this.crowd.doorsOpened(this.train.doorWorld(this._doorSide()), 0, this._doorSide());
      this._msg(`Обратный рейс до станции «${R.stations[R.stations.length - 1].name}». Идёт посадка.`, 6);
    }
  }

  // ---------- сохранение ----------
  serialize() {
    return {
      v: 1, line: this.lineId, dir: this.dir, train: this.trainId, short: this.settings.short, free: !!this.settings.free,
      s: this.s, speed: this.v, doorsOpen: this.doorTarget === 1,
      stats: this.stats, gameTime: this.gameTime, elapsed: this.elapsed,
      served: [...this.servedSet], announced: [...this.announced], skipped: [...(this._skipNoted || [])],
      next: this.route.stations[this.route.nextStationIndex(this.s)]?.name,
    };
  }

  load(data) {
    this.settings.short = !!data.short;
    this.settings.free = !!data.free;
    this.setup({ line: data.line, dir: data.dir, train: data.train, s: data.s, v: data.speed || 0, state: data });
  }

  // ---------- кадр ----------
  _frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.route) { this.renderer.render(this.scene, this.camera); return; }
    if (this.mode === 'drive' && !this.paused) this._sim(dt);
    if (this.mode === 'menu') this._menuTick(dt);
    if (!this.paused) this.crowd.update(dt);
    this._ambientTrain(this.paused ? 0 : dt);
    this._camera(dt);
    this._updateLights(dt);
    this._stream(false);
    this._reflectors();
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  // отражающие полы рисуются только рядом с камерой (каждое отражение — ещё один проход рендера)
  _reflectors() {
    const cp = this.camera.position;
    let best = null, bd = 1e9;
    for (const [, it] of this.loaded) {
      const r = it.built && it.built.info.reflector;
      if (!r) continue;
      r.visible = false;
      const d = it.obj.position.distanceTo(cp);
      const c = new THREE.Vector3().setFromMatrixPosition(it.obj.matrixWorld);
      const dd = Math.min(d, c.distanceTo(cp));
      if (dd < bd) { bd = dd; best = r; }
    }
    if (best && HQ.fx && bd < 150) best.visible = true;
  }

  _menuTick(dt) {
    this.view.oyaw = -1.25 + Math.sin(this.elapsedMenu = (this.elapsedMenu || 0) + dt * 0.12) * 0.55 + (this.view.mOff || 0);
    this.gameTime += dt;
  }

  _sim(dt) {
    const R = this.route;
    const def = TRAINS[this.trainId];
    this.elapsed += dt; this.gameTime += dt;
    // двери
    if (this.doorF !== this.doorTarget) {
      const sp = this.doorTarget > this.doorF ? 1 / 2.2 : 1 / 3.0;
      const lagged = this.doorTarget === 0 && this._closeDelay == null;
      if (lagged) this._closeDelay = 1.4;
      if (this._closeDelay > 0) this._closeDelay -= dt;
      else this.doorF = clamp(this.doorF + Math.sign(this.doorTarget - this.doorF) * sp * dt, 0, 1);
      this.train.setDoors(this.doorF, this._doorSide());
      if (this.doorF === this.doorTarget) {
        this.doorsMoving = false; this._closeDelay = null;
        if (this.doorTarget === 0) { this._msg('Двери закрыты. Можно отправляться.', 2.5); this.intervals.set(this.atStation, 0); }
      }
    }
    const doorsClosed = this.doorF === 0 && this.doorTarget === 0;
    // органы управления
    // режим «без ограничений»: АРС не ограничивает скорость, предел — только конструкционная скорость поезда
    const free = !!this.settings.free;
    const lim = free ? def.vmax : R.speedLimit(this.s);
    const kmh = this.v * 3.6;
    let wantTr = this.keys.up && !this.finished;
    if (wantTr && !doorsClosed) { if (!this._warnDoors) this._msg('Двери не закрыты — ход заблокирован'); this._warnDoors = true; wantTr = false; } else if (!this.keys.up) this._warnDoors = false;
    const wantBr = this.keys.down;
    const prevBr = this.brake;
    this.traction = clamp(this.traction + (wantTr && !wantBr ? 1.1 : -2.5) * dt, 0, 1);
    this.brake = clamp(this.brake + (wantBr ? 1.0 : -1.6) * dt, 0, 1);
    if (wantBr && prevBr < 0.05 && this.v > 0.5) this.sound.brakeHiss(0.6);
    // АРС
    const over = !free && kmh > lim + 2;
    if (over && !this.overspeed) this._msg(lim === 0 ? 'АРС: «0» — экстренное торможение!' : `АРС: превышение скорости ${lim} км/ч — автоторможение`);
    this.overspeed = over;
    let autoBr = 0;
    if (over) { autoBr = lim === 0 ? 1.15 : 0.75; this.traction = 0; this.stats.overspeedT += dt; this.stats.score = Math.max(0, this.stats.score - dt * 3); }
    // физика
    const v = this.v;
    const aTr = this.traction * def.acc * (v < 12 ? 1 : 12 / v) * (kmh > def.vmax ? 0 : 1);
    const aBr = Math.max(this.brake * def.dec, autoBr * def.dec);
    const aRes = 0.012 + 0.0003 * v * v;
    const grade = R.grade(this.s - this.train.length / 2);
    const aG = -9.81 * grade * 0.9;
    let a = aTr - (v > 0 ? aBr + aRes : 0) + aG;
    if (v <= 0 && a < 0) a = 0;
    if (v <= 0.01 && aTr < aG * -1 + 0.01 && this.traction < 0.01) a = Math.max(0, a); // стояночный тормоз
    this.v = Math.max(0, v + a * dt);
    if (this.v < 0.02 && this.traction < 0.02 && (this.brake > 0 || autoBr > 0 || aG <= 0.05)) this.v = 0;
    const ds = this.v * dt;
    this.s += ds;
    this.stats.dist += ds;
    // конец пути
    const last = R.stations[R.stations.length - 1];
    if (this.s > last.stop + 14) { this.s = last.stop + 14; this.v = 0; this._msg('Упор! Проезд конечной — штраф −100'); this.stats.score = Math.max(0, this.stats.score - 100); }
    this.train.update(R, this.s);
    // станции
    this._stationLogic(dt);
    // кабина, звук, HUD
    const nextK = R.nextStationIndex(this.s);
    const next = R.stations[nextK];
    const outdoor = R.isOutdoor(this.s);
    const st = {
      speed: this.v * 3.6, limit: lim, traction: this.traction, brake: Math.max(this.brake, autoBr),
      doorsClosed, overspeed: over, next: next?.name, dist: next ? next.stop - this.s : null,
      cars: def.cars, time: clockStr(this.gameTime),
    };
    this._panelT = (this._panelT || 0) - dt;
    if (this._panelT <= 0 && this.train.cab.group.visible) { drawPanel(this.train.cab, st); this._panelT = 0.1; }
    // рукоятка контроллера
    const ctrl = this.train.cab.ctrl;
    const pos = this.traction - Math.max(this.brake, autoBr);
    if (this.trainId === '717') ctrl.rotation.y = -pos * 0.9; else ctrl.rotation.x = -pos * 0.6;
    this.sound.update({ v: this.v, traction: this.traction, brake: Math.max(this.brake, autoBr), type: this.trainId, overspeed: over, cab: this.view.mode === 'cab', atStation: !!R.stationAt(this.s) && this.v < 3, outdoor, env: outdoor ? 'outdoor' : R.stationAt(this.s) ? 'station' : 'tunnel' });
    const axles = [];
    for (const sc of this.train.sections.slice(0, 2)) for (const bz of sc.bogieZ) { const c = sc.off + sc.Lb / 2 + bz; axles.push(c - 1.05, c + 1.05); }
    this.sound.joints(this.s, this.v, axles, outdoor);
    this.ui.onHud({
      ...st, score: Math.round(this.stats.score), station: this.atStation != null && this.doorF > 0 ? R.stations[this.atStation].name : null,
      line: this.line, dirTo: last.name, nextTransfers: next ? transfersFor(next.sid) : [], outsideOk: !!R.stationAt(this.s) && this.v < 0.1,
      view: this.view.mode, doorsOpen: this.doorTarget === 1, nearStop: next && next.stop - this.s < 450, free,
    });
    if (this.msgTimer > 0) { this.msgTimer -= dt; if (this.msgTimer <= 0) this.ui.message(null); }
    if (this.view.mode === 'outside' && this.v > 0.2) { this.view.mode = 'cab'; this.train.cab.group.visible = true; this.ui.onView('cab'); }
  }

  _stationLogic(dt) {
    const R = this.route;
    // интервальные часы
    for (const [k, iv] of this.intervals) this.intervals.set(k, iv + dt);
    for (const [, it] of this.loaded) {
      if (it.kind !== 'st') continue;
      const info = it.built.info;
      if (info.clock) info.clock.draw(this.gameTime % 86400, this.intervals.get(it.k) || 0);
      if (info.signal) info.signal.set(!(this.atStation === it.k && this.doorTarget === 1));
    }
    // подготовка толпы на приближающейся станции
    const nk = R.nextStationIndex(this.s);
    const nst = R.stations[nk];
    if (nst && this._crowdStation !== nk && nst.stop - this.s < 500 && this.doorTarget === 0) {
      const o = this._stationObj(nk);
      if (o) this._prepareCrowd({ st: nst, obj: o }, false);
    }
    // объявление при въезде на станцию
    if (nst && !this.announced.has(nk) && this.s > nst.p0 - 10 && this.s < nst.stop) {
      this.announced.add(nk);
      const last = nk === R.stations.length - 1;
      this.sound.say(arrivalText(nst.name, nst.sid), { male: false, then: last ? TERMINAL_TEXT : null });
      if (this.rng() < 0.65) this._spawnAmbient(nk);
    }
    // отправление: пропуск станции
    if (this.atStation != null && this.doorTarget === 0 && this.s > R.stations[this.atStation].p1 + 40) this.atStation = null;
    for (const st of R.stations) {
      if (!this.servedSet.has(st.k) && this.s > st.stop + 30 && st.k !== R.stations.length - 1 && !this._skipNoted.has(st.k)) {
        this._skipNoted.add(st.k);
        this.stats.skipped++; this.stats.score = Math.max(0, this.stats.score - 150);
        this._msg(`Станция «${st.name}» проехана без остановки (−150)`, 4);
      }
    }
    // посадка/высадка — счётчики пассажиров
    if (this.crowd.boarded || this.crowd.alighted) {
      this.stats.pax += this.crowd.boarded;
      this.crowd.boarded = 0; this.crowd.alighted = 0;
    }
    if (this.doorTarget === 1 && this.doorF === 1 && this.atStation != null && !this.crowd.busy() && !this._hintShown) {
      this._hintShown = true;
      if (this.atStation === R.stations.length - 1) this._msg('Высадка окончена. Нажмите [Пробел], чтобы завершить рейс.', 6);
      else this._msg('Посадка окончена. Закройте двери [Пробел].', 4);
    }
    if (this.doorTarget === 0) this._hintShown = false;
  }

  // встречные поезда: по одному каждого типа строятся заранее (в паузах между кадрами)
  // и потом переиспользуются — иначе создание поезда при въезде на станцию даёт рывок
  _warmAmbient() {
    if (this._warmT) return;
    const types = Object.keys(TRAINS);
    const next = () => {
      this._warmT = null;
      const t = types.find((x) => !this.ambientPool[x]);
      if (!t) return;
      if (this.mode === 'drive' && this.v > 3) { this._warmT = setTimeout(next, 1500); return; }
      const tr = new Train(TRAINS[t], '');
      tr.cab.group.visible = false;
      tr.group.visible = false;
      this.scene.add(tr.group);
      this.ambientPool[t] = tr;
      this._warmT = setTimeout(next, 400);
    };
    this._warmT = setTimeout(next, 1200);
  }

  _spawnAmbient(k) {
    const o = this._stationObj(k);
    if (!o || this.ambient) return;
    const ready = Object.keys(this.ambientPool);
    if (!ready.length) return;
    const tr = this.ambientPool[ready[Math.floor(this.rng() * ready.length)]];
    tr.setDestination(this.route.stations[0].name);
    tr.setEnv(o.info.env || this.defaultEnv, 1);
    tr.group.visible = true;
    this.crowd.attachAmbient(tr);
    const arriving = this.rng() < 0.6;
    this.ambient = { train: tr, st: o, k, z: arriving ? -420 : 78, v: arriving ? 16 : 0, state: arriving ? 'arrive' : 'dwell', t: arriving ? 0 : 8 + this.rng() * 10 };
  }

  _hideAmbient() {
    if (!this.ambient) return;
    this.ambient.train.setDoors(0, -1);
    this.ambient.train.group.visible = false;
    this.ambient = null;
    this.crowd.attachAmbient(null);
  }

  _ambientTrain(dt) {
    const a = this.ambient;
    if (!a) return;
    const stop = 78;
    if (a.state === 'arrive') {
      const d = stop - a.z;
      const vt = Math.sqrt(Math.max(0, 2 * 1.1 * d));
      a.v = Math.min(a.v, vt, 18);
      if (d < 0.3) { a.v = 0; a.z = stop; a.state = 'dwell'; a.t = 18 + this.rng() * 10; }
    } else if (a.state === 'dwell') {
      a.t -= dt;
      a.train.setDoors(clamp(Math.min(a.t - 3, 20 - a.t) / 2, 0, 1), -1);
      if (a.t <= 0) { a.state = 'depart'; a.train.setDoors(0, -1); }
    } else if (a.state === 'depart') {
      a.v = Math.min(22, a.v + 1.0 * dt);
      if (a.z > 600) { this._hideAmbient(); return; }
    }
    a.z += a.v * dt;
    if (!this.loaded.has('st:' + a.k)) { this._hideAmbient(); return; }
    // встречный поезд едет по пути oppX в сторону +Z локальной системы станции
    const M = a.st.group.matrixWorld;
    const base = new THREE.Matrix4().makeRotationY(Math.PI);
    a.train.placeSections((sc) => {
      const zc = a.z - sc.off - sc.Lb / 2;
      // за торцами зала поезд прячем, чтобы не торчал сквозь тоннель
      sc.group.visible = Math.abs(zc) < 84 + sc.Lb / 2 + 30;
      return new THREE.Matrix4().multiplyMatrices(M, new THREE.Matrix4().makeTranslation(a.st.info.oppX, 0, zc).multiply(base));
    });
  }

  // ---------- камера ----------
  _camera(dt) {
    if (this.view.mode === 'frozen') return; // для отладочных снимков
    const cam = this.camera;
    const tr = this.train;
    const R = this.route;
    if (this.view.mode === 'cab') {
      const g = tr.sections[0].group;
      const eye = tr.cab.eye.clone();
      eye.z += tr.cab.group.position.z;
      // покачивание кабины
      const t = performance.now() / 1000;
      const amp = Math.min(1, this.v / 20) * 0.012;
      eye.x += Math.sin(t * 5.3) * amp; eye.y += Math.sin(t * 7.9) * amp * 0.8;
      cam.position.copy(eye).applyMatrix4(g.matrix);
      const q = new THREE.Quaternion().setFromRotationMatrix(g.matrix);
      const look = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.view.pitch, this.view.yaw, 0, 'YXZ'));
      cam.quaternion.copy(q).multiply(look);
    } else {
      // орбита вокруг поезда на станции / в меню
      const near = this._stationNear();
      let M;
      let target;
      if (near) {
        M = near.obj.group.matrixWorld;
        const zMid = this.view.mode === 'menu' ? -60 : clamp(near.st.c - (this.s - 40), -70, 70);
        target = new THREE.Vector3(-0.6, 2.0, zMid);
      } else {
        M = R.matrixAt(this.s - 40, new THREE.Matrix4(), true);
        target = new THREE.Vector3(0, 2, 0);
      }
      const d = this.view.odist;
      const off = new THREE.Vector3(Math.sin(this.view.oyaw) * Math.cos(this.view.opitch) * d, Math.sin(this.view.opitch) * d, Math.cos(this.view.oyaw) * Math.cos(this.view.opitch) * d);
      const p = target.clone().add(off);
      // не выходить за пределы зала
      p.y = clamp(p.y, 1.7, (near && near.obj.info.camY) || 7.5);
      // камера остаётся на платформе (со стороны посадки), перед головой поезда — может выйти на путь
      p.z = clamp(p.z, -83.2, 83);
      const headZ = near ? near.st.c - this.s : -78;
      const cx = near && near.obj.info.camX;
      p.x = cx ? clamp(p.x, cx[0], p.z < headZ - 1.2 ? cx[1] : -1.75) : clamp(p.x, near ? near.obj.info.oppX + 1.6 : -14, p.z < headZ - 1.2 ? 1.9 : -1.75);
      // не ставим камеру внутрь пилонов
      if (near && near.obj.info.noCam) for (const [a0, a1] of near.obj.info.noCam) if (p.x > a0 && p.x < a1) p.x = (p.x - a0 < a1 - p.x) ? a0 : a1;
      cam.position.copy(p).applyMatrix4(M);
      cam.lookAt(target.clone().applyMatrix4(M));
    }
  }

  _updateLights(dt, force = false) {
    const R = this.route;
    const s = this.view.mode === 'cab' ? this.s - 1.2 : this.s - 40;
    let best = null, bd = 1e9;
    for (const st of R.stations) { const d = Math.max(0, Math.abs(s - st.c) - 84); if (d < bd) { bd = d; best = st; } }
    const inSt = clamp(1 - bd / 70, 0, 1);
    const od = R.outdoorAt(s);
    const outF = od ? 1 : 0;
    const hqInfo = best && this._stationObj(best.k)?.info;
    this.hemi.intensity = lerp(0.12, hqInfo && hqInfo.hq ? (hqInfo.hemi || 0.5) : 1.05, inSt) + outF * 1.0;
    this.sun.intensity = outF * 1.4;
    const fogD = outF ? 0.0011 : lerp(0.011, 0.0035, inSt);
    this.scene.fog.density = force ? fogD : lerp(this.scene.fog.density, fogD, Math.min(1, dt * 3));
    const fc = outF ? new THREE.Color(0xc9d6e0) : new THREE.Color(0x050505).lerp(new THREE.Color(0x2a2620), inSt);
    this.scene.fog.color.copy(fc);
    this.scene.background.copy(outF ? fc : new THREE.Color(0x020202));
    this.sky.visible = !!od || R.outdoor.some((o) => Math.abs(s - o.s0) < 600 || Math.abs(s - o.s1) < 600);
    // окружение улицы видно только снаружи и у самого портала: из глубины тоннеля его не видно,
    // а рельеф и дома над тоннелем не должны попадать внутрь
    for (const it of this.loaded.values()) {
      if (it.kind === 'env' && it.obj) it.obj.visible = s > it.zone.s0 - 35 && s < it.zone.s1 + 35;
    }
    this.sky.position.copy(this.camera.position);
    // пул точечных источников — на ближайшей станции
    const o = best ? this._stationObj(best.k) : null;
    if (o && bd < 250) {
      const M = o.group.matrixWorld;
      const ls = o.info.lights;
      // ближайшие к камере
      const cp = this.camera.position;
      const pts = ls.map((l) => l.clone().applyMatrix4(M)).sort((a, b) => a.distanceToSquared(cp) - b.distanceToSquared(cp));
      this.pool.forEach((l, i) => {
        if (i < pts.length) { l.position.copy(pts[i]); l.intensity = (o.info.hq ? (o.info.poolI || 18) : 26) * (['ground', 'bridge', 'side'].includes(best.style.t) ? 0.4 : 1); }
        else l.intensity = 0;
      });
    } else this.pool.forEach((l) => { l.intensity = 0; });
    this.train.head.intensity = od ? 2 : 5;
    // отражения на кузове: карта детальной станции или нейтральная
    const envSt = o && bd < 200 && o.info.env;
    this.train.setEnv(envSt || this.defaultEnv, envSt ? 1 : (od ? 1 : lerp(0.25, 0.8, inSt)));
  }

  _msg(text, t = 3) { this.ui.message(text); this.msgTimer = t; }
}

export { transfersFor };
