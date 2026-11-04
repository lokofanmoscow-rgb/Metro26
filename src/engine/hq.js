// Детальные станции (пилот): фото-текстуры CC0 с перекраской, процедурный мрамор
// с прожилками (генерируется на видеокарте), PBR-материалы, отражающий пол,
// карта окружения и отдельные модели «Красных Ворот», «Кропоткинской» и «Комсомольской»,
// построенные по фотографиям с Викисклада.
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { mergeGeoms, boxGeom, cylGeom, makeCanvas, mulberry32 } from './util.js';
import checkerCol from '../assets/tex/checker_col.jpg';
import checkerNrm from '../assets/tex/checker_nrm.jpg';
import tileCol from '../assets/tex/tile_col.jpg';
import tileNrm from '../assets/tex/tile_nrm.jpg';
import tileRgh from '../assets/tex/tile_rgh.jpg';
import stoneCol from '../assets/tex/stone_col.jpg';
import stoneNrm from '../assets/tex/stone_nrm.jpg';
import plasterCol from '../assets/tex/plaster_col.jpg';
import plasterNrm from '../assets/tex/plaster_nrm.jpg';
import graniteCol from '../assets/tex/granite_col.jpg';
import graniteNrm from '../assets/tex/granite_nrm.jpg';

const SRC = { checkerCol, checkerNrm, tileCol, tileNrm, tileRgh, stoneCol, stoneNrm, plasterCol, plasterNrm, graniteCol, graniteNrm };

export const HQ = { ready: false, images: {}, renderer: null, fx: true, cache: new Map() };

export function loadHQ() {
  const jobs = Object.entries(SRC).map(([k, url]) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { HQ.images[k] = im; res(); };
    im.onerror = () => res();
    im.src = url;
  }));
  return Promise.all(jobs).then(() => { HQ.ready = Object.keys(HQ.images).length === Object.keys(SRC).length; return HQ.ready; });
}

export function initHQ(renderer) { HQ.renderer = renderer; }

function shared(t) { t.userData.shared = true; return t; }

function texFromCanvas(c, { srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return shared(t);
}

function imgTex(key, srgb) {
  const ck = 'img:' + key;
  if (HQ.cache.has(ck)) return HQ.cache.get(ck);
  const t = new THREE.Texture(HQ.images[key]);
  t.needsUpdate = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  shared(t);
  HQ.cache.set(ck, t);
  return t;
}

// перекраска фото-текстуры: светлые и тёмные участки — в заданные цвета (с сохранением фактуры)
function recolor(key, dark, light, { contrast = 1, split = null } = {}) {
  const ck = `rc:${key}:${dark}:${light}:${contrast}`;
  if (HQ.cache.has(ck)) return HQ.cache.get(ck);
  const im = HQ.images[key];
  const c = makeCanvas(im.width, im.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  const A = new THREE.Color(dark), B = new THREE.Color(light);
  const a = [A.r, A.g, A.b].map((v) => Math.pow(v, 1 / 2.2) * 255), b = [B.r, B.g, B.b].map((v) => Math.pow(v, 1 / 2.2) * 255);
  // яркость по изображению: нормируем к [0..1]
  let mn = 255, mx = 0;
  for (let i = 0; i < p.length; i += 16) { const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; if (l < mn) mn = l; if (l > mx) mx = l; }
  const s = split != null ? split : (mn + mx) / 2;
  for (let i = 0; i < p.length; i += 4) {
    const l = 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2];
    let t = (l - mn) / Math.max(1, mx - mn);
    // двухтоновая карта: резкий переход у порога, внутри тона — мелкая фактура
    const hi = l > s ? 1 : 0;
    const local = hi ? (l - s) / Math.max(1, mx - s) : (l - mn) / Math.max(1, s - mn);
    const f = 0.82 + 0.36 * (local - 0.5) * contrast;
    const base = hi ? b : a;
    p[i] = Math.max(0, Math.min(255, base[0] * f));
    p[i + 1] = Math.max(0, Math.min(255, base[1] * f));
    p[i + 2] = Math.max(0, Math.min(255, base[2] * f));
    void t;
  }
  ctx.putImageData(d, 0, 0);
  const tex = texFromCanvas(c);
  HQ.cache.set(ck, tex);
  return tex;
}

// тонирование: сохраняет фактуру, меняет цвет
function tint(key, color, { amount = 1, gain = 1 } = {}) {
  const ck = `tn:${key}:${color}:${amount}:${gain}`;
  if (HQ.cache.has(ck)) return HQ.cache.get(ck);
  const im = HQ.images[key];
  const c = makeCanvas(im.width, im.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(im, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height);
  const p = d.data;
  let avg = 0, n = 0;
  for (let i = 0; i < p.length; i += 64) { avg += 0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]; n++; }
  avg /= n;
  const C = new THREE.Color(color);
  const t = [C.r, C.g, C.b].map((v) => Math.pow(v, 1 / 2.2) * 255);
  for (let i = 0; i < p.length; i += 4) {
    const l = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / avg * gain;
    for (let k = 0; k < 3; k++) p[i + k] = Math.max(0, Math.min(255, (t[k] * l) * amount + p[i + k] * (1 - amount)));
  }
  ctx.putImageData(d, 0, 0);
  const tex = texFromCanvas(c);
  HQ.cache.set(ck, tex);
  return tex;
}

// ---------- процедурный мрамор на видеокарте ----------
const MARBLE_FS = `
precision highp float;
varying vec2 vUv;
uniform vec3 cBase, cVein, cDark, cSeam;
uniform float seed, veinSharp, veinAmt, darkAmt, slabX, slabY, seam, scale, dir;
float hash(vec2 p, float per) { p = mod(p, per); p = fract(p * vec2(123.34, 456.21) + seed); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p, float per) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i, per), hash(i + vec2(1.0, 0.0), per), u.x), mix(hash(i + vec2(0.0, 1.0), per), hash(i + vec2(1.0, 1.0), per), u.x), u.y);
}
float fbm(vec2 p, float per) { float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * noise(p, per); p *= 2.0; per *= 2.0; a *= 0.5; } return v; }
void main() {
  vec2 uv = vUv;
  vec2 slab = floor(vec2(uv.x / slabX, uv.y / slabY));
  float sv = fract(sin(dot(slab, vec2(12.9898, 78.233)) + seed) * 43758.5453);
  vec2 p = uv * scale;
  float per = scale;
  vec2 q = vec2(fbm(p, per), fbm(p + vec2(5.0, 1.0), per));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.0, 9.0), per), fbm(p + 4.0 * q + vec2(8.0, 2.0), per));
  float f = fbm(p + 4.0 * r, per);
  float ang = 6.2831853 * (uv.x * dir + uv.y * (3.0 - dir)) + f * 7.0 + sv * 6.28;
  float veins = pow(1.0 - abs(sin(ang)), veinSharp);
  float veins2 = pow(1.0 - abs(sin(ang * 2.0 + r.x * 9.0)), veinSharp * 2.0);
  float clouds = smoothstep(0.35, 0.8, fbm(p * 0.5 + r * 1.5 + sv, per * 0.5));
  vec3 col = cBase * (0.86 + 0.28 * f);
  col = mix(col, cDark, clouds * darkAmt);
  col = mix(col, cVein, clamp(veins * veinAmt + veins2 * veinAmt * 0.5, 0.0, 1.0));
  col *= 0.93 + 0.14 * sv;
  vec2 g = fract(vec2(uv.x / slabX, uv.y / slabY));
  float e = min(min(g.x, 1.0 - g.x) * slabX, min(g.y, 1.0 - g.y) * slabY);
  col = mix(cSeam, col, smoothstep(0.0, seam, e));
  gl_FragColor = vec4(col, 1.0);
}`;

function marble(name, { base, vein, dark, seamColor = null, slabX = 0.5, slabY = 0.25, scale = 4, veinSharp = 14, veinAmt = 0.75, darkAmt = 0.35, seed = 1, dir = 1, size = 1024 }) {
  const ck = 'mb:' + name;
  if (HQ.cache.has(ck)) return HQ.cache.get(ck);
  const r = HQ.renderer;
  const rt = new THREE.WebGLRenderTarget(size, size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  rt.texture.anisotropy = 8;
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: MARBLE_FS,
    uniforms: {
      cBase: { value: new THREE.Color(base) }, cVein: { value: new THREE.Color(vein) }, cDark: { value: new THREE.Color(dark) },
      cSeam: { value: new THREE.Color(seamColor || dark).multiplyScalar(0.6) },
      seed: { value: seed }, veinSharp: { value: veinSharp }, veinAmt: { value: veinAmt }, darkAmt: { value: darkAmt },
      slabX: { value: slabX }, slabY: { value: slabY }, seam: { value: 0.006 }, scale: { value: scale }, dir: { value: dir },
    },
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const sc = new THREE.Scene(); sc.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const prev = r.getRenderTarget();
  const prevTM = r.toneMapping;
  r.toneMapping = THREE.NoToneMapping;
  r.setRenderTarget(rt); r.render(sc, cam); r.setRenderTarget(prev);
  r.toneMapping = prevTM;
  quad.geometry.dispose(); mat.dispose();
  const t = shared(rt.texture);
  t.userData.rt = rt;
  HQ.cache.set(ck, t);
  return t;
}

// ---------- карты рельефа из «высоты», нарисованной на canvas ----------
function heightCanvasToNormal(c, strength = 2) {
  const w = c.width, h = c.height;
  const src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const out = makeCanvas(w, h);
  const octx = out.getContext('2d');
  const od = octx.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    od.data[i] = (-dx / l * 0.5 + 0.5) * 255; od.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; od.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; od.data[i + 3] = 255;
  }
  octx.putImageData(od, 0, 0);
  return texFromCanvas(out, { srgb: false });
}

// кессоны свода (ромбы/шестиугольники, как на проекте «Красных Ворот»)
function cofferMaps(kind = 'hex') {
  const ck = 'coffer:' + kind;
  if (HQ.cache.has(ck)) return HQ.cache.get(ck);
  const S = 512;
  const c = makeCanvas(S, S); const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
  const ao = makeCanvas(S, S); const actx = ao.getContext('2d');
  actx.fillStyle = '#ffffff'; actx.fillRect(0, 0, S, S);
  const cell = kind === 'rect' ? [S / 2, S / 4] : [S / 2, S / 2];
  for (let y = -1; y < S / cell[1] + 1; y++) for (let x = -1; x < S / cell[0] + 1; x++) {
    const cx = x * cell[0] + (kind === 'hex' && (y & 1) ? cell[0] / 2 : 0) + cell[0] / 2, cy = y * cell[1] + cell[1] / 2;
    for (let k = 0; k < 6; k++) {
      const r = (cell[0] * 0.44) * (1 - k / 7);
      const v = 128 - k * 14;
      ctx.fillStyle = `rgb(${v},${v},${v})`; actx.fillStyle = `rgb(${255 - k * 10},${255 - k * 10},${255 - k * 10})`;
      ctx.beginPath(); actx.beginPath();
      if (kind === 'rect') { ctx.rect(cx - cell[0] * 0.44 * (1 - k / 7), cy - cell[1] * 0.42 * (1 - k / 7), cell[0] * 0.88 * (1 - k / 7), cell[1] * 0.84 * (1 - k / 7)); actx.rect(cx - cell[0] * 0.44 * (1 - k / 7), cy - cell[1] * 0.42 * (1 - k / 7), cell[0] * 0.88 * (1 - k / 7), cell[1] * 0.84 * (1 - k / 7)); }
      else for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i) { ctx.lineTo(px, py); actx.lineTo(px, py); } else { ctx.moveTo(px, py); actx.moveTo(px, py); } }
      ctx.closePath(); ctx.fill(); actx.closePath(); actx.fill();
    }
  }
  const res = { normal: heightCanvasToNormal(c, 3), ao: texFromCanvas(ao, { srgb: false }) };
  HQ.cache.set(ck, res);
  return res;
}

// ---------- материалы ----------
export function pbr({ map = null, normalMap = null, roughnessMap = null, aoMap = null, color = 0xffffff, roughness = 0.5, metalness = 0, normalScale = 1, emissive = 0.12, side = THREE.FrontSide, bake = false, envI = 1 }) {
  const m = new THREE.MeshStandardMaterial({ map, normalMap, roughnessMap, aoMap, color, roughness, metalness, side });
  if (normalMap) m.normalScale.set(normalScale, normalScale);
  // небольшое самосвечение, чтобы зал не проваливался в темноту там, где не достают лампы
  if (map) { m.emissiveMap = map; m.emissive = new THREE.Color(emissive, emissive, emissive); }
  else m.emissive = new THREE.Color(color).multiplyScalar(emissive);
  m.envMapIntensity = envI;
  m.userData.hq = true;
  if (bake) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float bake;\nvarying float vBake;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBake = bake;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vBake;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vBake;');
    };
    m.customProgramCacheKey = () => 'hq-baked';
  }
  return m;
}

function lampMat(i = 3.2, col = 0xfff1d6) {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(i) });
  m.userData.hq = true;
  return m;
}

// ---------- геометрия ----------
function setUVmeters(g, axis = 'zy', su = 1, sv = 1) {
  // UV в метрах по выбранным осям (для стен/полов) — текстуры потом масштабируются repeat
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const v = { x: p.getX(i), y: p.getY(i), z: p.getZ(i) };
    uv.setXY(i, v[axis[0]] / su, v[axis[1]] / sv);
  }
  return g;
}

function plane(w, h) { return new THREE.PlaneGeometry(w, h); }

// UV в метрах для коробок: грани по X — (z, y), по Z — (x, y), по Y — (x, z)
function uvBox(g, s = 1) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ax > 0.5) uv.setXY(i, p.getZ(i) / s, p.getY(i) / s);
    else if (ay > 0.5) uv.setXY(i, p.getX(i) / s, p.getZ(i) / s);
    else uv.setXY(i, p.getX(i) / s, p.getY(i) / s);
  }
  return g;
}

function scaleUV(g, su, sv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }

// плоский потолок полосами по Z с запечённым светом (bake(x, z))
function ceilingStrip(x0, x1, zList, y, bake, su = 2) {
  const xs = [x0, (x0 + x1) / 2, x1];
  const pos = [], uv = [], bk = [], idx = [];
  zList.forEach((z) => xs.forEach((x) => { pos.push(x, y, z); uv.push(x / su, z / su); bk.push(bake(x, z)); }));
  for (let j = 0; j < zList.length - 1; j++) for (let i = 0; i < 2; i++) {
    const a = j * 3 + i, b = a + 1, c = a + 3, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('bake', new THREE.Float32BufferAttribute(bk, 1));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function wall(x, y0, y1, z0, z1, facing, su, sv) {
  const g = plane(z1 - z0, y1 - y0);
  g.rotateY(facing > 0 ? Math.PI / 2 : -Math.PI / 2);
  g.translate(x, (y0 + y1) / 2, (z0 + z1) / 2);
  return setUVmeters(g, 'zy', su, sv);
}

function floorG(y, x0, x1, z0, z1, su, sv = su, up = true) {
  const g = plane(x1 - x0, z1 - z0);
  g.rotateX(up ? -Math.PI / 2 : Math.PI / 2);
  g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  return setUVmeters(g, 'xz', su, sv);
}

// поверхность свода/профиля, вытянутая по Z; UV: u — длина дуги (м/su), v — z (м/sv)
function profZ(pts, z0, z1, su = 1, sv = 1, bake = null) {
  const m = pts.length;
  const pos = [], uv = [], idx = [], bk = [];
  let ul = 0;
  for (let j = 0; j < m; j++) {
    if (j) ul += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
    for (const z of [z0, z1]) { pos.push(pts[j].x, pts[j].y, z); uv.push(ul / su, z / sv); bk.push(bake ? bake(pts[j].x, pts[j].y, z) : 0); }
  }
  for (let j = 0; j < m - 1; j++) { const a = j * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('bake', new THREE.Float32BufferAttribute(bk, 1));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function arcPts(cx, cy, rx, ry, a0, a1, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }); }
  return pts;
}

function inst(geom, mat, positions, rotY = 0) {
  const im = new THREE.InstancedMesh(geom, mat, positions.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
  positions.forEach((p, i) => {
    q.setFromEuler(new THREE.Euler(0, p.ry != null ? p.ry : rotY, 0));
    m.compose(new THREE.Vector3(p.x, p.y || 0, p.z), q, s);
    im.setMatrixAt(i, m);
  });
  im.computeBoundingSphere();
  return im;
}

// отражающий пол: зеркальное отражение, размытое и ослабленное по Френелю
const GlossyShader = {
  name: 'GlossyReflector',
  uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, strength: { value: 0.32 }, blur: { value: 0.006 } },
  vertexShader: `
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld; varying vec3 vNormalW;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() { vUv = textureMatrix * vec4(position, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vNormalW = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0)); gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `
    uniform vec3 color; uniform sampler2D tDiffuse; uniform float strength; uniform float blur; varying vec4 vUv; varying vec3 vWorld; varying vec3 vNormalW;
    #include <logdepthbuf_pars_fragment>
    void main() {
      #include <logdepthbuf_fragment>
      vec2 uv = vUv.xy / vUv.w;
      vec3 c = vec3(0.0);
      c += texture2D(tDiffuse, uv).rgb * 0.28;
      c += texture2D(tDiffuse, uv + vec2(blur, 0.0)).rgb * 0.18;
      c += texture2D(tDiffuse, uv - vec2(blur, 0.0)).rgb * 0.18;
      c += texture2D(tDiffuse, uv + vec2(0.0, blur)).rgb * 0.18;
      c += texture2D(tDiffuse, uv - vec2(0.0, blur)).rgb * 0.18;
      vec3 V = normalize(cameraPosition - vWorld);
      float fres = 0.12 + 0.88 * pow(1.0 - clamp(dot(V, vNormalW), 0.0, 1.0), 4.0);
      gl_FragColor = vec4(c * color * strength * fres, 1.0);
    }`,
};

function glossyFloor(x0, x1, z0, z1, y, strength = 0.3) {
  const w = Math.min(1024, Math.round(window.innerWidth * 0.5)), h = Math.min(768, Math.round(window.innerHeight * 0.5));
  const r = new Reflector(new THREE.PlaneGeometry(x1 - x0, z1 - z0), { textureWidth: w, textureHeight: h, clipBias: 0.003, shader: GlossyShader, multisample: 0, color: 0xffffff });
  r.material.transparent = true;
  r.material.blending = THREE.AdditiveBlending;
  r.material.depthWrite = false;
  r.material.uniforms.strength.value = strength;
  r.rotateX(-Math.PI / 2);
  r.position.set((x0 + x1) / 2, y + 0.004, (z0 + z1) / 2);
  r.renderOrder = 2;
  r.userData.reflector = true;
  return r;
}

// звёздчатая раскрывающаяся капитель «Кропоткинской»
function flaredCapital(h, r0, rIn, rOut, lobes = 4, segU = 48, segV = 14) {
  const pos = [], idx = [], uv = [], bk = [];
  for (let j = 0; j <= segV; j++) {
    const t = j / segV;
    const e = Math.pow(t, 2.3);
    for (let i = 0; i <= segU; i++) {
      const a = (i / segU) * Math.PI * 2;
      const star = rIn + (rOut - rIn) * Math.pow(Math.abs(Math.cos(a * lobes / 2)), 0.55);
      const r = r0 + (star - r0) * e;
      pos.push(Math.cos(a) * r, t * h, Math.sin(a) * r);
      uv.push(i / segU * 4, t * 2);
      // подсветка снизу: ярче у кольца со светильниками, к потолку слабее
      bk.push(1.1 * Math.pow(1 - t, 1.5) + 0.05);
    }
  }
  for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
    const a = j * (segU + 1) + i, b = a + 1, c = a + segU + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('bake', new THREE.Float32BufferAttribute(bk, 1));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function decagon(r, h, y0 = 0) {
  const g = new THREE.CylinderGeometry(r, r, h, 10, 1, false);
  g.translate(0, y0 + h / 2, 0);
  return scaleUV(g, (2 * Math.PI * r) / 1.0, h / 1.0);
}

function sphereLamp(r) { return new THREE.SphereGeometry(r, 20, 14); }

// ---------- «Красные Ворота» ----------
function buildKV(grp, c) {
  const { PLAT_Y, EDGE_X, xFar, rightWall, leftWall, PL, HZ, BED_Y } = c;
  const lights = [];
  const pylonRed = marble('kv-red', { base: '#5e2119', vein: '#8f4f3f', dark: '#2e0e09', slabX: 0.5, slabY: 0.3333, scale: 3, veinSharp: 7, veinAmt: 0.32, darkAmt: 0.6, seed: 3.1 });
  const niche = marble('kv-koelga', { base: '#c9c6bf', vein: '#efeee9', dark: '#8f8c86', slabX: 0.5, slabY: 0.5, scale: 4, veinSharp: 18, veinAmt: 0.35, darkAmt: 0.25, seed: 7.7 });
  const mRed = pbr({ map: pylonRed, roughness: 0.2, emissive: 0.05, envI: 0.9 });
  pylonRed.repeat.set(1, 1);
  const mNiche = pbr({ map: niche, roughness: 0.28, emissive: 0.07 });
  const mBlack = pbr({ color: 0x141414, roughness: 0.18, emissive: 0.02 });
  // пол — шахматка из светлого и тёмного камня, плиты 0.75 м
  const chk = recolor('checkerCol', '#232221', '#7f7d78');
  const mFloor = pbr({ map: chk, normalMap: imgTex('checkerNrm', false), roughness: 0.3, emissive: 0.05 });
  const fl = floorG(PLAT_Y, xFar, EDGE_X, -PL, PL, 3, 3);
  grp.add(new THREE.Mesh(fl, mFloor));
  // путевые стены: светлая плитка, снизу чёрная глазурованная
  const cream = tint('tileCol', '#e9dcc0', { amount: 0.85 });
  const blackT = tint('tileCol', '#1c1c1c', { amount: 0.95, gain: 1.0 });
  const mCream = pbr({ map: cream, normalMap: imgTex('tileNrm', false), roughnessMap: imgTex('tileRgh', false), roughness: 0.6, emissive: 0.08 });
  const mBlackT = pbr({ map: blackT, normalMap: imgTex('tileNrm', false), roughness: 0.25, emissive: 0.03 });
  const bandY = PLAT_Y + 0.85;
  grp.add(new THREE.Mesh(mergeGeoms([wall(rightWall, bandY, 4.2, -HZ, HZ, -1, 1.27, 1.27), wall(leftWall, bandY, 4.2, -HZ, HZ, 1, 1.27, 1.27)]), mCream));
  grp.add(new THREE.Mesh(mergeGeoms([wall(rightWall, BED_Y - 0.4, bandY, -HZ, HZ, -1, 1.27, 1.27), wall(leftWall, BED_Y - 0.4, bandY, -HZ, HZ, 1, 1.27, 1.27)]), mBlackT));
  // своды: штукатурка с поперечными рёбрами-кессонами
  const plast = tint('plasterCol', '#eeebe3', { amount: 0.7, gain: 1.05 });
  const cof = cofferMaps('rect');
  const mVault = pbr({ map: plast, normalMap: cof.normal, roughness: 0.85, emissive: 0.08, side: THREE.DoubleSide, bake: true, envI: 0.6 });
  const xPy0 = -4.3, xPy1 = -7.0, xPy2 = xFar + 2.7, xPy3 = xFar + 5.4;
  const xc = (rightWall + xPy0) / 2, rS = (rightWall - xPy0) / 2;
  const xc2 = (leftWall + xPy2) / 2, rS2 = (xPy2 - leftWall) / 2;
  const cx = (xPy1 + xPy3) / 2, cr = (xPy1 - xPy3) / 2;
  // свет от ламп на своде — запекаем мягкие пятна
  const bakeSide = (x, y, z) => 0.03 + 0.16 * Math.exp(-(((z % 6 + 6) % 6 - 3) ** 2) / 4);
  const vR = arcPts(xc, 4.2, rS, rS * 0.85, 0, Math.PI, 28), vL = arcPts(xc2, 4.2, rS2, rS2 * 0.85, 0, Math.PI, 28), vC = arcPts(cx, 4.5, cr, cr * 0.9, 0, Math.PI, 32);
  grp.add(new THREE.Mesh(mergeGeoms([profZ(vR, -HZ, HZ, 2.0, 2.0, bakeSide), profZ(vL, -HZ, HZ, 2.0, 2.0, bakeSide), profZ(vC, -PL, PL, 2.0, 2.0, (x, y, z) => 0.03 + 0.16 * Math.exp(-(((z % 9 + 9) % 9 - 4.5) ** 2) / 6))]), mVault));
  // поперечные рёбра свода
  const ribs = [];
  for (let z = -HZ + 1; z < HZ; z += 2) {
    ribs.push(profZ(arcPts(xc, 4.2, rS - 0.07, rS * 0.85 - 0.07, 0.05, Math.PI - 0.05, 24), z, z + 0.22));
    ribs.push(profZ(arcPts(xc2, 4.2, rS2 - 0.07, rS2 * 0.85 - 0.07, 0.05, Math.PI - 0.05, 24), z, z + 0.22));
  }
  for (let z = -PL + 1.5; z < PL; z += 3) ribs.push(profZ(arcPts(cx, 4.5, cr - 0.1, cr * 0.9 - 0.1, 0.04, Math.PI - 0.04, 28), z, z + 0.3));
  grp.add(new THREE.Mesh(mergeGeoms(ribs), pbr({ color: 0xf2efe8, roughness: 0.8, emissive: 0.1, side: THREE.DoubleSide, envI: 0.6 })));
  // карниз у пяты сводов
  const cornice = [];
  for (const x of [rightWall - 0.08, leftWall + 0.08]) cornice.push(boxGeom(0.22, 0.18, 2 * HZ, x, 4.2, 0));
  grp.add(new THREE.Mesh(mergeGeoms(cornice), mNiche));

  // ряды пилонов с арочными проходами (красный мрамор)
  const cs = 9, pass = 3.0, hTop = 3.4;
  const rows = [[xPy1, xPy0], [xPy2, xPy3]];
  const pyl = [], nichesG = [], nicheBack = [], plinth = [], cap = [];
  for (const [xa, xb] of rows) {
    const sh = new THREE.Shape();
    // низ фигуры и проёмов уходит под пол, чтобы дно проёма не легло поверх пола
    sh.moveTo(-PL, PLAT_Y - 0.3); sh.lineTo(PL, PLAT_Y - 0.3); sh.lineTo(PL, 7.6); sh.lineTo(-PL, 7.6); sh.lineTo(-PL, PLAT_Y - 0.3);
    const passZ = [];
    for (let z = -PL + cs; z < PL - cs * 0.4; z += cs) {
      passZ.push(z);
      const h = new THREE.Path();
      const a = z - pass / 2, b = z + pass / 2;
      h.moveTo(a, PLAT_Y - 0.2); h.lineTo(b, PLAT_Y - 0.2); h.lineTo(b, PLAT_Y + hTop - pass / 2);
      h.absarc(z, PLAT_Y + hTop - pass / 2, pass / 2, 0, Math.PI, false);
      h.lineTo(a, PLAT_Y - 0.2);
      sh.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: xb - xa, bevelEnabled: false, curveSegments: 12 });
    g.rotateY(-Math.PI / 2); g.translate(xb, 0, 0);
    // UV в метрах по z/y для граней пилонов
    const p = g.attributes.position, uvA = g.attributes.uv, nA = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(nA.getX(i)) > 0.5;
      uvA.setXY(i, (ax ? p.getZ(i) : p.getX(i) + p.getZ(i)) / 1.5, p.getY(i) / 1.0);
    }
    pyl.push(g);
    // выступы с нишами на гранях пилонов (к боковому и к центральному залу)
    const zPy = [];
    for (let z = -PL; z < PL; z += cs) zPy.push(z);
    const pylonCenters = [];
    for (let i = 0; i < passZ.length + 1; i++) {
      const zA = i === 0 ? -PL : passZ[i - 1] + pass / 2;
      const zB = i === passZ.length ? PL : passZ[i] - pass / 2;
      if (zB - zA > 3) pylonCenters.push([zA, zB]);
    }
    for (const [zA, zB] of pylonCenters) {
      const L = zB - zA;
      const pw = Math.min(1.5, L * 0.26);
      for (const face of [xa, xb]) {
        const dirX = face === xb ? 1 : -1; // наружу от пилона
        for (const zc of [zA + pw / 2, zB - pw / 2]) {
          // выступ с арочной нишей
          const ns = new THREE.Shape();
          ns.moveTo(-pw / 2, 0); ns.lineTo(pw / 2, 0); ns.lineTo(pw / 2, 3.3); ns.lineTo(-pw / 2, 3.3); ns.lineTo(-pw / 2, 0);
          const nh = new THREE.Path();
          const nw = pw * 0.52, ny0 = 0.75, ny1 = 2.55;
          nh.moveTo(-nw / 2, ny0); nh.lineTo(nw / 2, ny0); nh.lineTo(nw / 2, ny1); nh.absarc(0, ny1, nw / 2, 0, Math.PI, false); nh.lineTo(-nw / 2, ny0);
          ns.holes.push(nh);
          const eg = new THREE.ExtrudeGeometry(ns, { depth: 0.28, bevelEnabled: false, curveSegments: 10 });
          // фигура в плоскости (z, y), выдавливание — по x наружу
          eg.rotateY(dirX > 0 ? Math.PI / 2 : -Math.PI / 2);
          eg.translate(face, PLAT_Y, zc);
          const pp = eg.attributes.position, uu = eg.attributes.uv;
          for (let i = 0; i < pp.count; i++) uu.setXY(i, pp.getZ(i) / 1.5, pp.getY(i) / 1.0);
          pyl.push(eg);
          // задняя стенка ниши — светлый мрамор с полукуполом
          const back = new THREE.ShapeGeometry(new THREE.Shape(nh.getPoints(10)), 10);
          back.rotateY(dirX > 0 ? Math.PI / 2 : -Math.PI / 2);
          back.translate(face + dirX * 0.01, PLAT_Y, zc);
          nicheBack.push(setUVmeters(back, 'zy', 1, 1));
          const dome = new THREE.SphereGeometry(nw / 2, 16, 8, 0, Math.PI, 0, Math.PI / 2);
          dome.rotateY(dirX > 0 ? -Math.PI / 2 : Math.PI / 2);
          dome.rotateX(0);
          dome.translate(face + dirX * 0.01, PLAT_Y + ny1, zc);
          nichesG.push(dome);
        }
        // цоколь из чёрного камня
        plinth.push(boxGeom(0.06, 0.22, L, face + dirX * 0.03, PLAT_Y + 0.11, (zA + zB) / 2));
      }
      // капитель-пояс над пилоном
      cap.push(boxGeom(xb - xa + 0.3, 0.22, L + 0.1, (xa + xb) / 2, PLAT_Y + 3.36, (zA + zB) / 2));
    }
  }
  grp.add(new THREE.Mesh(mergeGeoms(pyl), mRed));
  grp.add(new THREE.Mesh(mergeGeoms(nicheBack.concat(nichesG.map((g) => setUVmeters(g, 'zy', 1, 1)))), mNiche));
  grp.add(new THREE.Mesh(mergeGeoms(plinth), mBlack));
  grp.add(new THREE.Mesh(mergeGeoms(cap), mNiche));
  // шаровые светильники: по оси боковых сводов и на подвесах в центральном зале
  const lm = lampMat(3.0);
  const balls = [], stems = [];
  for (let z = -PL + 3; z < PL; z += 6) {
    for (const [x, r, top] of [[xc, rS, 4.2 + rS * 0.85], [xc2, rS2, 4.2 + rS2 * 0.85]]) {
      balls.push({ x, y: top - 0.55, z });
      stems.push(cylGeom(0.02, 0.02, 0.3, 6, x, top - 0.2, z));
      void r;
    }
  }
  const cTop = 4.5 + cr * 0.9;
  const bigBalls = [];
  for (let z = -PL + cs / 2; z < PL; z += cs) {
    bigBalls.push({ x: cx, y: cTop - 1.9, z });
    stems.push(cylGeom(0.025, 0.025, 1.5, 6, cx, cTop - 0.85, z));
    lights.push(new THREE.Vector3(cx, cTop - 2.3, z));
  }
  grp.add(inst(sphereLamp(0.24), lm, balls));
  grp.add(inst(sphereLamp(0.42), lm, bigBalls));
  grp.add(new THREE.Mesh(mergeGeoms(stems), pbr({ color: 0x3a3226, metalness: 0.8, roughness: 0.4, emissive: 0.02 })));
  for (let z = -PL + 6; z < PL; z += 18) lights.push(new THREE.Vector3(xc, 6.0, z), new THREE.Vector3(xc2, 6.0, z + 9));
  c.info.hemi = 0.5;
  c.info.reflector = glossyFloor(xFar, EDGE_X, -PL, PL, PLAT_Y, 0.36);
  grp.add(c.info.reflector);
  c.info.lights = lights;
  for (let z = -PL + 8; z < PL; z += 12) c.info.spots.push({ x: cx, z });
}

// ---------- «Кропоткинская» ----------
function buildKrop(grp, c) {
  const { PLAT_Y, EDGE_X, xFar, rightWall, leftWall, PL, HZ, BED_Y } = c;
  const yTop = PLAT_Y + 5.4;
  c.info.ceilY = yTop;
  const lights = [];
  const koelga = marble('krop-koelga', { base: '#c4bdb0', vein: '#f2efe8', dark: '#a39d92', slabX: 0.5, slabY: 0.3333, scale: 4, veinSharp: 16, veinAmt: 0.45, darkAmt: 0.3, seed: 11.3 });
  const mCol = pbr({ map: koelga, roughness: 0.25, emissive: 0.05, envI: 0.8 });
  const wallM = marble('krop-wall', { base: '#c9c2b5', vein: '#f4f1ea', dark: '#aaa397', slabX: 0.5, slabY: 0.25, scale: 3, veinSharp: 14, veinAmt: 0.4, darkAmt: 0.25, seed: 5.2 });
  const mWall = pbr({ map: wallM, roughness: 0.3, emissive: 0.06 });
  const mBlack = pbr({ color: 0x1a1918, roughness: 0.2, emissive: 0.02 });
  // пол: шахматка из розового и серого гранита
  const chk = recolor('checkerCol', '#6c6a66', '#a46f66');
  const mFloor = pbr({ map: chk, normalMap: imgTex('checkerNrm', false), roughness: 0.32, emissive: 0.04 });
  grp.add(new THREE.Mesh(floorG(PLAT_Y, xFar, EDGE_X, -PL, PL, 3, 3), mFloor));
  // путевые стены: мрамор «коелга», внизу тёмная полоса
  const bandY = PLAT_Y + 0.45;
  grp.add(new THREE.Mesh(mergeGeoms([wall(rightWall, bandY, yTop, -HZ, HZ, -1, 2, 2), wall(leftWall, bandY, yTop, -HZ, HZ, 1, 2, 2)]), mWall));
  grp.add(new THREE.Mesh(mergeGeoms([wall(rightWall, BED_Y - 0.4, bandY, -HZ, HZ, -1, 2, 2), wall(leftWall, BED_Y - 0.4, bandY, -HZ, HZ, 1, 2, 2)]), mBlack));
  // белые своды и потолок
  const plast = tint('plasterCol', '#dcd8cf', { amount: 0.75, gain: 1.0 });
  const mPl = pbr({ map: plast, normalMap: imgTex('plasterNrm', false), normalScale: 0.4, roughness: 0.9, emissive: 0.03, side: THREE.DoubleSide, bake: true, envI: 0.35 });
  const cs = 6.5;
  const xr = [EDGE_X - 2.15, xFar + 2.15];
  const zs = [];
  for (let z = -PL + cs * 0.75; z < PL - cs * 0.4; z += cs) zs.push(z);
  // потолок центрального нефа — плоский, светлее у капителей (свет из колец)
  const near = (z) => { let d = 1e9; for (const zc of zs) d = Math.min(d, Math.abs(z - zc)); return d; };
  const zl = [-HZ];
  for (const z of zs) zl.push(z - cs / 2, z - cs / 4, z, z + cs / 4);
  zl.push(zs[zs.length - 1] + cs / 2, HZ);
  const zList = [...new Set(zl.map((z) => Math.max(-HZ, Math.min(HZ, z))))].sort((p, q) => p - q);
  const bakeC = (x, z) => 0.02 + 0.2 * Math.exp(-(near(z) ** 2) / 3);
  grp.add(new THREE.Mesh(ceilingStrip(xr[1], xr[0], zList, yTop, bakeC), mPl));
  // над путями — череда поперечных сводов: пяты на капителях и путевой стене, вершина между колоннами
  const bays = [];
  const edges = [-HZ, ...zs, HZ];
  for (const [x0, x1] of [[xr[0], rightWall], [leftWall, xr[1]]]) {
    const colX = x0 === xr[0] ? x0 : x1;
    for (let i = 0; i < edges.length - 1; i++) {
      const z0 = edges[i], z1 = edges[i + 1];
      const n = 14;
      const pos = [], uv = [], idx = [], bka = [];
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const z = z0 + (z1 - z0) * t, y = yTop - 1.25 + 1.25 * Math.sin(Math.PI * t);
        for (const x of [x0, (x0 + x1) / 2, x1]) {
          pos.push(x, y, z); uv.push(x / 2, z / 2);
          const dz = Math.min(Math.abs(z - z0), Math.abs(z - z1));
          const nearCol = (i > 0 && dz === Math.abs(z - z0)) || (i < edges.length - 2 && dz === Math.abs(z - z1));
          bka.push(0.02 + (nearCol ? 0.22 * Math.exp(-dz * dz / 2.5) * Math.exp(-((x - colX) ** 2) / 8) : 0));
        }
      }
      for (let k = 0; k < n; k++) for (let j = 0; j < 2; j++) { const a2 = k * 3 + j, b2 = a2 + 1, c2 = a2 + 3, d2 = c2 + 1; idx.push(a2, c2, b2, b2, c2, d2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute('bake', new THREE.Float32BufferAttribute(bka, 1));
      g.setIndex(idx); g.computeVertexNormals();
      bays.push(g);
    }
  }
  grp.add(new THREE.Mesh(mergeGeoms(bays), mPl));
  // колонны: гранёный ствол, светящееся кольцо, звёздчатая капитель
  const shaftH = 2.75;
  const shaft = decagon(0.38, shaftH, 0);
  const base = mergeGeoms([cylGeom(0.5, 0.52, 0.25, 10, 0, 0.125, 0)]);
  const collar = mergeGeoms([cylGeom(0.47, 0.42, 0.12, 20, 0, shaftH + 0.06, 0)]);
  const capH = yTop - PLAT_Y - shaftH - 0.12;
  const capG = flaredCapital(capH, 0.44, 2.0, Math.min(cs, 5.7) / 2 + 0.05, 4);
  capG.translate(0, shaftH + 0.12, 0);
  const cols = [];
  for (const z of zs) for (const x of xr) cols.push({ x, y: PLAT_Y, z, ry: Math.PI / 4 * 0 });
  grp.add(inst(shaft, mCol, cols));
  grp.add(inst(base, mBlack, cols));
  grp.add(inst(collar, lampMat(4.5, 0xfff0d2), cols));
  grp.add(inst(capG, mPl, cols));
  // свет капителей — точечные источники пула (выбираются ближайшие к камере)
  for (const z of zs) for (const x of xr) lights.push(new THREE.Vector3(x, PLAT_Y + shaftH + 0.45, z));
  c.info.lights = lights;
  c.info.hemi = 0.14;
  c.info.poolI = 7;
  c.info.reflector = glossyFloor(xFar, EDGE_X, -PL, PL, PLAT_Y, 0.3);
  grp.add(c.info.reflector);
  for (let i = 0; i < zs.length; i += 3) c.info.spots.push({ x: (xr[0] + xr[1]) / 2, z: zs[i] + cs / 2 });
}

// ---------- «Комсомольская» ----------
function buildKoms(grp, c) {
  const { PLAT_Y, EDGE_X, xFar, rightWall, leftWall, PL, HZ, BED_Y, oppX } = c;
  const yTop = PLAT_Y + 6.6;
  c.info.ceilY = yTop;
  const lights = [];
  const gold = marble('koms-chorgun', { base: '#b98d48', vein: '#e3c98e', dark: '#7a5726', slabX: 0.5, slabY: 0.25, scale: 5, veinSharp: 9, veinAmt: 0.5, darkAmt: 0.45, seed: 21.7, dir: 2 });
  const mCol = pbr({ map: gold, roughness: 0.2, emissive: 0.06, envI: 0.9 });
  const bronze = pbr({ color: 0x7a5a2c, metalness: 0.85, roughness: 0.38, emissive: 0.04 });
  const cream = tint('tileCol', '#efe3c2', { amount: 0.85 });
  const mCream = pbr({ map: cream, normalMap: imgTex('tileNrm', false), roughnessMap: imgTex('tileRgh', false), roughness: 0.55, emissive: 0.08 });
  const gazgan = marble('koms-gazgan', { base: '#e2d5b7', vein: '#f6efdd', dark: '#b5a582', slabX: 0.5, slabY: 0.3333, scale: 3, veinSharp: 16, veinAmt: 0.4, darkAmt: 0.25, seed: 4.4 });
  const mGaz = pbr({ map: gazgan, roughness: 0.3, emissive: 0.07 });
  const mDark = pbr({ color: 0x2a241c, roughness: 0.3, emissive: 0.02 });
  // пол: серый и красный гранит
  const chk = recolor('checkerCol', '#5a3029', '#8e8c87');
  const mFloor = pbr({ map: chk, normalMap: imgTex('checkerNrm', false), roughness: 0.34, emissive: 0.04 });
  grp.add(new THREE.Mesh(floorG(PLAT_Y, xFar, EDGE_X, -PL, PL, 3, 3), mFloor));
  // балконы-галереи над путями
  const balY = 5.05;
  const balEdgeR = 0.35, balEdgeL = oppX - 0.35;
  // путевые стены: плитка до балкона, мрамор выше
  grp.add(new THREE.Mesh(mergeGeoms([wall(rightWall, BED_Y - 0.4, balY, -HZ, HZ, -1, 1.27, 1.27), wall(leftWall, BED_Y - 0.4, balY, -HZ, HZ, 1, 1.27, 1.27)]), mCream));
  grp.add(new THREE.Mesh(mergeGeoms([wall(rightWall, balY, yTop, -HZ, HZ, -1, 2, 2), wall(leftWall, balY, yTop, -HZ, HZ, 1, 2, 2)]), mGaz));
  const plast = tint('plasterCol', '#f1ead6', { amount: 0.75, gain: 1.05 });
  const mPl = pbr({ map: plast, normalMap: imgTex('plasterNrm', false), normalScale: 0.4, roughness: 0.9, emissive: 0.09, side: THREE.DoubleSide, envI: 0.6 });
  const slab = [];
  slab.push(boxGeom(rightWall - balEdgeR, 0.3, 2 * HZ, (rightWall + balEdgeR) / 2, balY + 0.15, 0));
  slab.push(boxGeom(balEdgeL - leftWall, 0.3, 2 * HZ, (balEdgeL + leftWall) / 2, balY + 0.15, 0));
  grp.add(new THREE.Mesh(mergeGeoms(slab), mPl));
  grp.add(new THREE.Mesh(mergeGeoms([floorG(balY + 0.305, balEdgeR, rightWall, -HZ, HZ, 3, 3), floorG(balY + 0.305, leftWall, balEdgeL, -HZ, HZ, 3, 3)]), mFloor));
  // чугунные решётки балконов: поручень, стойки, ромбы-медальоны
  const iron = pbr({ color: 0x1b1a19, metalness: 0.6, roughness: 0.5, emissive: 0.01 });
  const rail = [], posts = [], meds = [];
  for (const [x, s] of [[balEdgeR + 0.05, 1], [balEdgeL - 0.05, -1]]) {
    rail.push(boxGeom(0.08, 0.06, 2 * HZ, x, balY + 1.35, 0), boxGeom(0.05, 0.05, 2 * HZ, x, balY + 0.42, 0), boxGeom(0.05, 0.05, 2 * HZ, x, balY + 1.2, 0));
    for (let z = -HZ + 0.1; z < HZ; z += 0.16) posts.push({ x, y: balY + 0.3, z });
    for (let z = -HZ + 1.6; z < HZ; z += 3.2) {
      const g = boxGeom(0.05, 0.5, 0.5, 0, 0, 0, Math.PI / 4, 0, 0);
      g.translate(x, balY + 0.82, z); meds.push(g);
    }
    void s;
  }
  grp.add(new THREE.Mesh(mergeGeoms(rail.concat(meds)), iron));
  grp.add(inst(new THREE.BoxGeometry(0.025, 1.05, 0.025).translate(0, 0.525, 0), iron, posts));
  // колонны на балконах
  const balCols = [];
  for (let z = -PL + 2.5; z < PL; z += 5) balCols.push({ x: (rightWall + balEdgeR) / 2 + 0.2, y: balY + 0.3, z }, { x: (leftWall + balEdgeL) / 2 - 0.2, y: balY + 0.3, z });
  grp.add(inst(uvBox(boxGeom(0.42, yTop - balY - 0.3 - 0.35, 0.42, 0, (yTop - balY - 0.65) / 2, 0), 1.2), mGaz, balCols));
  grp.add(inst(boxGeom(0.6, 0.35, 0.6, 0, yTop - balY - 0.3 - 0.175, 0), bronze, balCols));
  // главные колонны: «чоргунь» и бронзовые капители с эмблемой КИМ
  const cs = 5;
  const xr = [EDGE_X - 2.15, xFar + 2.15];
  const cols = [];
  for (let z = -PL + cs * 0.75; z < PL - cs * 0.4; z += cs) for (const x of xr) cols.push({ x, y: PLAT_Y, z });
  const colH = yTop - PLAT_Y - 0.95;
  const shaftG = uvBox(boxGeom(0.86, colH, 0.86, 0, colH / 2, 0), 2.0);
  // UV для граней по x тоже
  const capG = mergeGeoms([
    boxGeom(0.92, 0.12, 0.92, 0, colH + 0.06, 0), cylGeom(0.62, 0.48, 0.45, 4, 0, colH + 0.345, 0, 0, Math.PI / 4, 0),
    boxGeom(1.32, 0.12, 1.32, 0, colH + 0.63, 0), boxGeom(1.46, 0.2, 1.46, 0, colH + 0.79, 0),
  ]);
  const kim = mergeGeoms([0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => { const g = cylGeom(0.16, 0.16, 0.04, 20, 0, 0, 0, Math.PI / 2, 0, 0); g.translate(0, colH + 0.36, 0.5); g.applyMatrix4(new THREE.Matrix4().makeRotationY(a)); return g; }));
  grp.add(inst(shaftG, mCol, cols));
  grp.add(inst(capG, bronze, cols));
  grp.add(inst(kim, pbr({ color: 0xc9a24a, metalness: 0.9, roughness: 0.3, emissive: 0.05 }), cols));
  grp.add(inst(boxGeom(1.0, 0.18, 1.0, 0, 0.09, 0), mDark, cols));
  // кессонированный потолок
  const cof = cofferMaps('rect');
  const mCeil = pbr({ map: plast, normalMap: cof.normal, aoMap: null, roughness: 0.9, emissive: 0.1, side: THREE.DoubleSide, envI: 0.6 });
  grp.add(new THREE.Mesh(floorG(yTop, leftWall, rightWall, -HZ, HZ, 2.5, 2.5, false), mCeil));
  const beams = [];
  for (const x of [...xr, (rightWall + balEdgeR) / 2 + 0.2, (leftWall + balEdgeL) / 2 - 0.2]) beams.push(boxGeom(0.55, 0.5, 2 * HZ, x, yTop - 0.25, 0));
  for (let z = -PL + cs * 0.75; z < PL; z += cs / 2) beams.push(boxGeom(rightWall - leftWall, 0.32, 0.35, (rightWall + leftWall) / 2, yTop - 0.16, z));
  grp.add(new THREE.Mesh(mergeGeoms(beams), mPl));
  // подвесные светильники-колпаки
  const shade = mergeGeoms([cylGeom(0.12, 0.42, 0.32, 18, 0, 0, 0, 0, 0, 0, true), cylGeom(0.015, 0.015, 1.0, 6, 0, 0.66, 0)]);
  const bulbs = [];
  const sh = [];
  const xm = (xr[0] + xr[1]) / 2;
  for (let z = -PL + 2.5; z < PL; z += 5) {
    for (const x of [xm, xr[0] + 1.2, xr[1] - 1.2]) { sh.push({ x, y: yTop - 1.4, z }); bulbs.push({ x, y: yTop - 1.5, z }); }
    for (const x of [(rightWall + balEdgeR) / 2, (leftWall + balEdgeL) / 2]) { sh.push({ x, y: yTop - 1.0, z }); bulbs.push({ x, y: yTop - 1.1, z }); }
  }
  grp.add(inst(shade, pbr({ color: 0xf4f1ea, roughness: 0.6, emissive: 0.35, side: THREE.DoubleSide }), sh));
  grp.add(inst(sphereLamp(0.13), lampMat(4.0), bulbs));
  for (let z = -PL + 7.5; z < PL; z += 20) lights.push(new THREE.Vector3(xm, yTop - 1.7, z), new THREE.Vector3((rightWall + balEdgeR) / 2, balY - 0.4, z + 10));
  c.info.lights = lights;
  c.info.hemi = 0.5;
  c.info.reflector = glossyFloor(xFar, EDGE_X, -PL, PL, PLAT_Y, 0.22);
  grp.add(c.info.reflector);
  for (let z = -PL + 6; z < PL; z += 10) c.info.spots.push({ x: xm, z });
}

export const HQ_BUILDERS = { kv: buildKV, krop: buildKrop, koms: buildKoms };

// карта окружения станции для отражений и рассеянного света (снимается один раз после постройки)
export function captureEnv(renderer, scene, built) {
  const g = built.group;
  const refl = built.info.reflector;
  if (refl) refl.visible = false;
  const rt = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const cam = new THREE.CubeCamera(0.1, 400, rt);
  const p = new THREE.Vector3((built.info.platform.x0 + built.info.platform.x1) / 2, 3.2, 0).applyMatrix4(g.matrixWorld);
  cam.position.copy(p);
  // на время съёмки — «включаем свет» станции
  const boosted = [];
  g.traverse((o) => { const m = o.material; if (m && m.userData && m.userData.hq && m.emissive) { boosted.push([m, m.emissive.clone()]); m.emissive.multiplyScalar(2.0); } });
  const tm = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  cam.update(renderer, scene);
  renderer.toneMapping = tm;
  for (const [m, e] of boosted) m.emissive.copy(e);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromCubemap(rt.texture).texture;
  pm.dispose(); rt.dispose();
  g.traverse((o) => { const m = o.material; if (m && m.isMeshStandardMaterial) { m.envMap = env; m.needsUpdate = true; } });
  built.info.env = env;
  if (refl) refl.visible = HQ.fx;
  void mulberry32;
}
