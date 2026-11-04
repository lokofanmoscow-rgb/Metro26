// Процедурные текстуры (canvas): облицовка станций, тоннели, пути, вывески.
import * as THREE from 'three';
import { makeCanvas, canvasTex, mulberry32, hashStr, shade, mixHex } from './util.js';

const cache = new Map();
function cached(key, fn) {
  if (cache.has(key)) return cache.get(key);
  const v = fn();
  if (v && v.userData) v.userData.shared = true;
  cache.set(key, v);
  return v;
}

function noise(ctx, w, h, rng, amount = 0.06, count = 2500, size = 2) {
  for (let i = 0; i < count; i++) {
    const v = rng();
    ctx.fillStyle = v < 0.5 ? `rgba(0,0,0,${amount * rng()})` : `rgba(255,255,255,${amount * rng()})`;
    ctx.fillRect(rng() * w, rng() * h, size * (0.5 + rng()), size * (0.5 + rng()));
  }
}

function veins(ctx, x, y, w, h, rng, color = 'rgba(80,80,80,0.18)', n = 6) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6 + rng() * 2.2;
    ctx.beginPath();
    let px = x + rng() * w, py = y + rng() * h;
    ctx.moveTo(px, py);
    for (let k = 0; k < 4; k++) {
      const nx = px + (rng() - 0.3) * w * 0.7, ny = py + (rng() - 0.5) * h * 0.8;
      ctx.quadraticCurveTo(px + (rng() - 0.5) * w * 0.4, py + (rng() - 0.5) * h * 0.4, nx, ny);
      px = nx; py = ny;
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function marbleFill(ctx, x, y, w, h, color, rng, veinStrength = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.06)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.05)');
  g.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const dark = new THREE.Color(color).getHSL({}).l > 0.5;
  veins(ctx, x, y, w, h, rng, dark ? `rgba(70,70,70,${0.16 * veinStrength})` : `rgba(255,255,255,${0.14 * veinStrength})`, 5);
  veins(ctx, x, y, w, h, rng, dark ? `rgba(120,110,100,${0.12 * veinStrength})` : `rgba(0,0,0,${0.15 * veinStrength})`, 3);
}

function grout(ctx, x, y, w, h, tw, th, color = 'rgba(0,0,0,0.25)', lw = 1.5) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  for (let xx = x; xx <= x + w + 0.1; xx += tw) { ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); }
  for (let yy = y; yy <= y + h + 0.1; yy += th) { ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); }
  ctx.stroke();
}

function tiles(ctx, x, y, w, h, tw, th, color, rng, vary = 0.05) {
  for (let yy = y; yy < y + h; yy += th) {
    for (let xx = x; xx < x + w; xx += tw) {
      ctx.fillStyle = shade(color, (rng() - 0.5) * vary * 2);
      ctx.fillRect(xx, yy, tw, th);
    }
  }
  // блик глазури
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.04)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  grout(ctx, x, y, w, h, tw, th);
}

// Путевая стена. Текстура покрывает 4 м по длине и всю высоту стены H (м).
// cokol — высота цоколя (м) от низа стены.
export function wallTexture(style, H = 6, cokol = 2.0) {
  const key = `wall:${style.n}:${H}:${cokol}`;
  return cached(key, () => {
    const PX = 128; // px на метр
    const W = 4 * PX, Hp = Math.round(H * PX);
    const c = makeCanvas(W, Hp);
    const ctx = c.getContext('2d');
    const rng = mulberry32(hashStr(key));
    const top = 0, ck = Hp - cokol * PX; // y (px) начала цоколя
    const w = style.w, wa = style.wa || shade(w, -0.15), wl = style.wl || '#2a2a2a';
    const mainH = ck;
    switch (style.wp) {
      case 'tile': tiles(ctx, 0, top, W, mainH, 19, 19, w, rng, 0.04); break;
      case 'bigtile': tiles(ctx, 0, top, W, mainH, 64, 64, w, rng, 0.06); break;
      case 'rhomb': {
        ctx.fillStyle = w; ctx.fillRect(0, 0, W, mainH);
        const s = 32;
        for (let yy = -s; yy < mainH + s; yy += s) for (let xx = -s; xx < W + s; xx += s * 2) {
          const off = ((yy / s) & 1) * s;
          ctx.fillStyle = shade(w, (rng() - 0.5) * 0.12);
          ctx.beginPath(); ctx.moveTo(xx + off, yy); ctx.lineTo(xx + off + s, yy + s / 2 * 2 / 2); ctx.lineTo(xx + off, yy + s); ctx.lineTo(xx + off - s, yy + s / 2); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1.2; ctx.stroke();
        }
        break;
      }
      case 'marble': {
        const sw = 160, sh = 112;
        for (let yy = 0; yy < mainH; yy += sh) for (let xx = 0; xx < W; xx += sw) marbleFill(ctx, xx, yy, sw, sh, shade(w, (rng() - 0.5) * 0.06), rng);
        grout(ctx, 0, mainH % sh, W, mainH, sw, sh, 'rgba(0,0,0,0.18)', 1);
        break;
      }
      case 'metal': {
        ctx.fillStyle = w; ctx.fillRect(0, 0, W, mainH);
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(0.5, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0.08)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, mainH);
        ctx.strokeStyle = wa; ctx.lineWidth = 6;
        const step = 64;
        for (let xx = 0; xx < W; xx += step) {
          ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx + step / 2, mainH * 0.5); ctx.lineTo(xx, mainH); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
        for (let yy = 0; yy < mainH; yy += 48) { ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke(); }
        break;
      }
      case 'panel': case 'corr': {
        const pw = style.wp === 'corr' ? 16 : 77;
        for (let xx = 0; xx < W; xx += pw) {
          const gg = ctx.createLinearGradient(xx, 0, xx + pw, 0);
          gg.addColorStop(0, shade(w, 0.1)); gg.addColorStop(0.5, w); gg.addColorStop(1, shade(w, -0.12));
          ctx.fillStyle = gg; ctx.fillRect(xx, 0, pw, mainH);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(xx, 0, 1.5, mainH);
        }
        if (style.wp === 'panel') { ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let yy = 0; yy < mainH; yy += 154) ctx.fillRect(0, yy, W, 1.5); }
        break;
      }
      case 'stripes': case 'stripes5': case 'stripes2': {
        tiles(ctx, 0, 0, W, mainH, 19, 19, w, rng, 0.03);
        ctx.fillStyle = wa;
        if (style.wp === 'stripes5') {
          for (let i = 0; i < 5; i++) ctx.fillRect(0, mainH * 0.18 + i * 22, W, 8);
        } else if (style.wp === 'stripes2') {
          ctx.fillRect(0, mainH * 0.25, W, 16); ctx.fillRect(0, mainH * 0.25 + 30, W, 16);
        } else {
          ctx.fillRect(0, mainH * 0.12, W, 30); ctx.fillStyle = shade(wa, 0.3); ctx.fillRect(0, mainH * 0.12 + 40, W, 12);
        }
        grout(ctx, 0, 0, W, mainH, 19, 19, 'rgba(0,0,0,0.18)', 1);
        break;
      }
      case 'mondrian': {
        ctx.fillStyle = w; ctx.fillRect(0, 0, W, mainH);
        const cols = ['#d42a2a', '#f2c53d', '#2256a8', w, w, w];
        const split = (x, y, ww, hh, depth) => {
          if (depth > 3 || ww < 60 || hh < 60) {
            ctx.fillStyle = cols[Math.floor(rng() * cols.length)];
            ctx.fillRect(x, y, ww, hh);
            ctx.strokeStyle = '#151515'; ctx.lineWidth = 7; ctx.strokeRect(x, y, ww, hh);
            return;
          }
          if (rng() < 0.5) { const k = ww * (0.3 + rng() * 0.4); split(x, y, k, hh, depth + 1); split(x + k, y, ww - k, hh, depth + 1); }
          else { const k = hh * (0.3 + rng() * 0.4); split(x, y, ww, k, depth + 1); split(x, y + k, ww, hh - k, depth + 1); }
        };
        split(0, 0, W / 2, mainH, 0); split(W / 2, 0, W / 2, mainH, 0);
        break;
      }
      case 'squares': {
        const s = 128;
        for (let yy = 0; yy < mainH; yy += s) for (let xx = 0; xx < W; xx += s) {
          ctx.fillStyle = shade(rng() < 0.5 ? w : wa, (rng() - 0.5) * 0.1);
          ctx.fillRect(xx, yy, s, s);
        }
        grout(ctx, 0, 0, W, mainH, s, s, 'rgba(40,30,20,0.6)', 5);
        break;
      }
      case 'origami': {
        ctx.fillStyle = w; ctx.fillRect(0, 0, W, mainH);
        const s = 96;
        for (let yy = 0; yy < mainH; yy += s) for (let xx = 0; xx < W; xx += s) {
          for (let k = 0; k < 4; k++) {
            ctx.fillStyle = `rgba(${k & 1 ? 0 : 255},${k & 1 ? 0 : 255},${k & 1 ? 0 : 240},${0.05 + rng() * 0.07})`;
            ctx.beginPath(); ctx.moveTo(xx + s / 2, yy + s / 2);
            const pts = [[xx, yy], [xx + s, yy], [xx + s, yy + s], [xx, yy + s], [xx, yy]];
            ctx.lineTo(...pts[k]); ctx.lineTo(...pts[k + 1]); ctx.closePath(); ctx.fill();
          }
        }
        ctx.fillStyle = wa; ctx.fillRect(0, mainH * 0.1, W, 10);
        ctx.fillStyle = wl; ctx.fillRect(0, mainH * 0.1 + 14, W, 6);
        break;
      }
      case 'pyramid': {
        const sw = 160, sh = 112;
        for (let yy = 0; yy < mainH; yy += sh) for (let xx = 0; xx < W; xx += sw) marbleFill(ctx, xx, yy, sw, sh, shade(w, (rng() - 0.5) * 0.08), rng);
        const s = 40;
        for (let yy = mainH * 0.1; yy < mainH * 0.5; yy += s) for (let xx = 0; xx < W; xx += s) {
          ctx.fillStyle = wa; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + s, yy); ctx.lineTo(xx + s / 2, yy + s / 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = shade(wa, -0.25); ctx.beginPath(); ctx.moveTo(xx, yy + s); ctx.lineTo(xx + s, yy + s); ctx.lineTo(xx + s / 2, yy + s / 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = shade(wa, 0.2); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy + s); ctx.lineTo(xx + s / 2, yy + s / 2); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'frieze': {
        const sw = 160, sh = 112;
        for (let yy = 0; yy < mainH; yy += sh) for (let xx = 0; xx < W; xx += sw) marbleFill(ctx, xx, yy, sw, sh, shade(w, (rng() - 0.5) * 0.05), rng);
        const fy = mainH * 0.06, fh = 110;
        for (let xx = 0; xx < W; xx += 256) {
          ctx.fillStyle = '#d9cfae'; ctx.fillRect(xx + 18, fy, 220, fh);
          for (let i = 0; i < 260; i++) {
            ctx.fillStyle = ['#3d6fa8', '#c9a24a', '#8f3a32', '#3f6b4f', '#efe6cf', '#6a5a8a'][Math.floor(rng() * 6)];
            ctx.fillRect(xx + 24 + rng() * 206, fy + 6 + rng() * (fh - 14), 7, 7);
          }
          ctx.strokeStyle = '#7a6a4a'; ctx.lineWidth = 4; ctx.strokeRect(xx + 18, fy, 220, fh);
        }
        break;
      }
      case 'inserts': {
        tiles(ctx, 0, 0, W, mainH, 24, 24, w, rng, 0.03);
        for (let xx = 40; xx < W; xx += 256) {
          const iy = mainH * 0.15;
          ctx.fillStyle = shade(wa, 0.15); ctx.fillRect(xx, iy, 170, 180);
          ctx.strokeStyle = shade(wa, -0.3); ctx.lineWidth = 4; ctx.strokeRect(xx, iy, 170, 180);
          ctx.strokeStyle = shade(wa, -0.2); ctx.lineWidth = 3;
          for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(xx + 30 + rng() * 110, iy + 30 + rng() * 120, 8 + rng() * 26, 0, Math.PI * (1 + rng())); ctx.stroke(); }
        }
        break;
      }
      case 'cells': {
        ctx.fillStyle = shade(w, -0.2); ctx.fillRect(0, 0, W, mainH);
        const s = 32;
        for (let yy = 0; yy < mainH; yy += s) for (let xx = 0; xx < W; xx += s) {
          const g = ctx.createLinearGradient(xx, yy, xx + s, yy + s);
          g.addColorStop(0, shade(w, 0.18)); g.addColorStop(1, shade(w, -0.12));
          ctx.fillStyle = g; ctx.fillRect(xx + 2, yy + 2, s - 4, s - 4);
        }
        break;
      }
      case 'glass': {
        const g = ctx.createLinearGradient(0, 0, 0, mainH);
        g.addColorStop(0, shade(w, 0.25)); g.addColorStop(1, w);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, mainH);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let xx = 0; xx < W; xx += 192) ctx.fillRect(xx, 0, 8, mainH);
        ctx.fillRect(0, mainH * 0.5, W, 6);
        break;
      }
      default: tiles(ctx, 0, 0, W, mainH, 19, 19, w, rng, 0.04);
    }
    // цоколь
    if (style.wp === 'glass') {
      ctx.fillStyle = wl; ctx.fillRect(0, ck, W, Hp - ck);
    } else {
      const sw = 128;
      for (let xx = 0; xx < W; xx += sw) marbleFill(ctx, xx, ck, sw, Hp - ck, shade(wl, (rng() - 0.5) * 0.08), rng, 0.6);
      grout(ctx, 0, ck, W, Hp - ck, sw, 1000, 'rgba(0,0,0,0.3)', 1);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, ck, W, 3);
    }
    // карниз сверху
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, W, 6);
    noise(ctx, W, Hp, rng, 0.04, 3000, 2);
    const t = canvasTex(c);
    t.userData.mPerRepeat = 4;
    return t;
  });
}

export function floorTexture(style) {
  const key = `floor:${style.n}`;
  return cached(key, () => {
    const W = 512; // 4 x 4 м
    const c = makeCanvas(W, W);
    const ctx = c.getContext('2d');
    const rng = mulberry32(hashStr(key));
    const [a, b] = style.f || ['#8e8e8c', '#6e6e6c'];
    const slab = 64; // 0.5 м
    const granite = (x, y, w, h, col) => {
      ctx.fillStyle = shade(col, (rng() - 0.5) * 0.06); ctx.fillRect(x, y, w, h);
      for (let i = 0; i < (w * h) / 40; i++) {
        const r = rng();
        ctx.fillStyle = r < 0.33 ? 'rgba(0,0,0,0.25)' : r < 0.66 ? 'rgba(255,255,255,0.18)' : 'rgba(120,90,80,0.2)';
        ctx.fillRect(x + rng() * w, y + rng() * h, 1.5, 1.5);
      }
    };
    for (let y = 0; y < W; y += slab) for (let x = 0; x < W; x += slab) {
      let col = a;
      if (style.fp === 'check') col = ((x / slab + y / slab) & 1) ? b : a;
      else if (style.fp === 'stripe') col = (x / slab) % 4 === 0 ? b : a;
      else if (style.fp === 'border') col = (x / slab) % 8 === 0 || (x / slab) % 8 === 7 ? b : ((x / slab + y / slab) & 1 ? a : mixHex(a, b, 0.35));
      granite(x, y, slab, slab, col);
    }
    grout(ctx, 0, 0, W, W, slab, slab, 'rgba(0,0,0,0.28)', 1.2);
    // блеск (отражения ламп)
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.02)'); g.addColorStop(0.5, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    return canvasTex(c);
  });
}

export function ceilingTexture(style) {
  const key = `ceil:${style.n}`;
  return cached(key, () => {
    const W = 512; // 4 x 4 м
    const c = makeCanvas(W, W);
    const ctx = c.getContext('2d');
    const rng = mulberry32(hashStr(key));
    const col = style.ce || '#e8e8e4';
    ctx.fillStyle = col; ctx.fillRect(0, 0, W, W);
    switch (style.cp) {
      case 'coffer': {
        const s = 128;
        for (let y = 0; y < W; y += s) for (let x = 0; x < W; x += s) {
          const g = ctx.createRadialGradient(x + s / 2, y + s / 2, 8, x + s / 2, y + s / 2, s * 0.7);
          g.addColorStop(0, shade(col, 0.05)); g.addColorStop(1, shade(col, -0.25));
          ctx.fillStyle = g; ctx.fillRect(x + 10, y + 10, s - 20, s - 20);
          ctx.strokeStyle = shade(col, -0.35); ctx.lineWidth = 3; ctx.strokeRect(x + 10, y + 10, s - 20, s - 20);
        }
        break;
      }
      case 'rib': {
        for (let y = 0; y < W; y += 32) {
          const g = ctx.createLinearGradient(0, y, 0, y + 32);
          g.addColorStop(0, shade(col, 0.06)); g.addColorStop(0.5, shade(col, -0.18)); g.addColorStop(1, shade(col, 0.06));
          ctx.fillStyle = g; ctx.fillRect(0, y, W, 32);
        }
        break;
      }
      case 'grid': {
        grout(ctx, 0, 0, W, W, 128, 128, shade(col, -0.45), 10);
        break;
      }
      case 'gold': {
        ctx.fillStyle = '#6a5426'; ctx.fillRect(0, 0, W, W);
        const s = 32;
        for (let y = 0; y < W; y += s) for (let x = 0; x < W; x += s) {
          const g = ctx.createLinearGradient(x, y, x + s, y + s);
          g.addColorStop(0, '#f0d27a'); g.addColorStop(1, '#a8812e');
          ctx.fillStyle = g; ctx.fillRect(x + 3, y + 3, s - 6, s - 6);
        }
        break;
      }
      case 'origami': {
        const s = 128;
        for (let y = 0; y < W; y += s) for (let x = 0; x < W; x += s) {
          ctx.fillStyle = shade(col, -0.08); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s / 2, y + s); ctx.closePath(); ctx.fill();
          ctx.fillStyle = shade(col, -0.16); ctx.beginPath(); ctx.moveTo(x, y + s); ctx.lineTo(x + s / 2, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'rings': case 'arch': {
        for (let y = 0; y < W; y += 128) { ctx.fillStyle = shade(col, -0.18); ctx.fillRect(0, y, W, 18); ctx.fillStyle = shade(col, 0.06); ctx.fillRect(0, y + 18, W, 4); }
        break;
      }
      default: {
        grout(ctx, 0, 0, W, W, 256, 256, 'rgba(0,0,0,0.06)', 1);
      }
    }
    noise(ctx, W, W, rng, 0.03, 1500, 2);
    return canvasTex(c);
  });
}

export function columnTexture(style) {
  const key = `col:${style.n}`;
  return cached(key, () => {
    const W = 256, H = 512; // по окружности x высота
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(hashStr(key));
    for (let y = 0; y < H; y += 128) marbleFill(ctx, 0, y, W, 128, shade(style.c, (rng() - 0.5) * 0.05), rng, 1.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    if (style.c2 && style.t !== 'pylon') {
      ctx.fillStyle = style.c2;
      if (style.csh === 'frame') { ctx.fillRect(0, 0, W, 40); ctx.fillRect(0, H - 60, W, 60); }
      else { ctx.fillRect(W * 0.46, 0, W * 0.08, H); ctx.fillRect(0, H * 0.06, W, 10); }
    }
    // база колонны
    ctx.fillStyle = shade(style.c, -0.3); ctx.fillRect(0, H - 22, W, 22);
    return canvasTex(c);
  });
}

export function pylonTexture(style) {
  const key = `pyl:${style.n}`;
  return cached(key, () => {
    const W = 512, H = 512; // 4 м x 4 м
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(hashStr(key));
    for (let y = 0; y < H; y += 128) for (let x = 0; x < W; x += 128) marbleFill(ctx, x, y, 128, 128, shade(style.c, (rng() - 0.5) * 0.07), rng, 1.1);
    grout(ctx, 0, 0, W, H, 128, 128, 'rgba(0,0,0,0.15)', 1);
    if (style.c2) {
      ctx.fillStyle = style.c2;
      ctx.fillRect(0, H * 0.18, W, 22);
      ctx.fillRect(0, H - 40, W, 40);
      ctx.fillStyle = shade(style.c2, 0.25); ctx.fillRect(0, H * 0.18 + 22, W, 4);
    }
    return canvasTex(c);
  });
}

// Тюбинги круглого тоннеля: u — по окружности (1 повтор = 2 м дуги), v — по длине (1 повтор = 1 кольцо = 1 м)
export function tubbingTexture() {
  return cached('tubbing', () => {
    const W = 256, H = 128;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(77);
    ctx.fillStyle = '#4e4a45'; ctx.fillRect(0, 0, W, H);
    noise(ctx, W, H, rng, 0.12, 2500, 3);
    // рёбра колец
    ctx.fillStyle = '#2c2a27'; ctx.fillRect(0, 0, W, 10);
    ctx.fillStyle = '#6a655e'; ctx.fillRect(0, 10, W, 3);
    // продольные рёбра
    ctx.fillStyle = '#34312d'; ctx.fillRect(0, 0, 8, H); ctx.fillRect(W / 2, 0, 6, H);
    // болты
    ctx.fillStyle = '#1e1d1b';
    for (let x = 16; x < W; x += 32) { ctx.beginPath(); ctx.arc(x, 6, 3, 0, 7); ctx.fill(); }
    // потёки
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(${rng() < 0.5 ? '90,70,40' : '20,20,20'},0.15)`;
      ctx.fillRect(rng() * W, 0, 3 + rng() * 6, H);
    }
    return canvasTex(c);
  });
}

export function concreteTexture(tint = '#77736c') {
  return cached('concrete:' + tint, () => {
    const W = 256;
    const c = makeCanvas(W, W);
    const ctx = c.getContext('2d');
    const rng = mulberry32(hashStr(tint));
    ctx.fillStyle = tint; ctx.fillRect(0, 0, W, W);
    noise(ctx, W, W, rng, 0.12, 3500, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, W, W);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(30,25,20,0.12)';
      ctx.fillRect(rng() * W, rng() * W * 0.5, 4 + rng() * 10, W * (0.3 + rng() * 0.6));
    }
    return canvasTex(c);
  });
}

export function trackBedTexture() {
  return cached('trackbed', () => {
    const W = 256, H = 256; // 3.2 м поперёк x 3.2 м вдоль
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(5);
    ctx.fillStyle = '#3e3b37'; ctx.fillRect(0, 0, W, H);
    noise(ctx, W, H, rng, 0.18, 4000, 2);
    // водоотводный лоток по оси
    ctx.fillStyle = '#26241f'; ctx.fillRect(W / 2 - 10, 0, 20, H);
    ctx.fillStyle = 'rgba(70,60,40,0.25)';
    for (let i = 0; i < 30; i++) ctx.fillRect(rng() * W, rng() * H, 6 + rng() * 20, 2 + rng() * 4);
    return canvasTex(c);
  });
}

export function grassTexture() {
  return cached('grass', () => {
    const W = 256;
    const c = makeCanvas(W, W);
    const ctx = c.getContext('2d');
    const rng = mulberry32(9);
    ctx.fillStyle = '#5d7a3a'; ctx.fillRect(0, 0, W, W);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `hsl(${80 + rng() * 30},${30 + rng() * 25}%,${22 + rng() * 22}%)`;
      ctx.fillRect(rng() * W, rng() * W, 1.5, 3);
    }
    return canvasTex(c);
  });
}

export function ballastTexture() {
  return cached('ballast', () => {
    const W = 256;
    const c = makeCanvas(W, W);
    const ctx = c.getContext('2d');
    const rng = mulberry32(19);
    ctx.fillStyle = '#6b6660'; ctx.fillRect(0, 0, W, W);
    for (let i = 0; i < 2600; i++) {
      const l = 30 + rng() * 40;
      ctx.fillStyle = `hsl(30,6%,${l}%)`;
      ctx.beginPath(); ctx.arc(rng() * W, rng() * W, 1.5 + rng() * 3, 0, 7); ctx.fill();
    }
    return canvasTex(c);
  });
}

export function buildingTexture(seed = 1) {
  return cached('bld:' + seed, () => {
    const W = 256, H = 512;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(seed * 31 + 7);
    const base = ['#d9d4c7', '#c9c2b4', '#b9bcc0', '#e2dccd', '#cfc6b0'][seed % 5];
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    for (let y = 12; y < H - 10; y += 26) for (let x = 10; x < W - 10; x += 22) {
      ctx.fillStyle = rng() < 0.25 ? '#e9d79a' : `rgb(${60 + rng() * 40},${80 + rng() * 40},${100 + rng() * 40})`;
      ctx.fillRect(x, y, 13, 16);
    }
    return canvasTex(c);
  });
}

// Табличка/надпись с названием станции
export function nameTexture(text, kind = 'metal', bg = null) {
  const key = `name:${text}:${kind}:${bg}`;
  return cached(key, () => {
    const H = 128;
    const ctx0 = makeCanvas(8, 8).getContext('2d');
    const font = kind === 'metal' ? `700 84px "PT Sans Narrow","Arial Narrow",Arial,sans-serif` : `700 76px "PT Sans","Arial",sans-serif`;
    ctx0.font = font;
    const label = kind === 'metal' ? text.toUpperCase() : text;
    const tw = Math.ceil(ctx0.measureText(label).width);
    const W = tw + 80;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    if (kind === 'plate') {
      ctx.fillStyle = bg || '#1f2733'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ffffff';
    } else if (kind === 'white') {
      ctx.fillStyle = bg || '#1d1d1d'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f4f4f4';
    } else {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 20, 0, 110);
      g.addColorStop(0, '#f6e7b0'); g.addColorStop(0.45, '#c9a24a'); g.addColorStop(1, '#7a5a1e');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4; ctx.shadowBlur = 4;
    }
    ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(label, W / 2, H / 2 + 4);
    const t = canvasTex(c, { aniso: 8 });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.userData.aspect = W / H;
    t.userData.transparent = kind === 'metal';
    return t;
  });
}

export function signTexture(lines, { bg = '#1f2733', fg = '#ffffff', w = 512, h = 128, line = null } = {}) {
  const key = `sign:${lines.join('|')}:${bg}:${line}`;
  return cached(key, () => {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    let x0 = 20;
    if (line) {
      ctx.fillStyle = line.color; ctx.beginPath(); ctx.arc(64, h / 2, 40, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 46px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(line.num, 64, h / 2 + 2);
      x0 = 120;
    }
    ctx.fillStyle = fg; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const fs = lines.length > 1 ? 40 : 52;
    ctx.font = `700 ${fs}px "PT Sans",Arial,sans-serif`;
    lines.forEach((l, i) => ctx.fillText(l, x0, h / 2 + (i - (lines.length - 1) / 2) * (fs + 6)));
    const t = canvasTex(c, { aniso: 8 });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

export function glowTexture() {
  return cached('glow', () => {
    const c = makeCanvas(128, 128);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,250,230,0.6)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const t = canvasTex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}

// Освобождение текстур станции при её выгрузке
export function releaseTextures(name) {
  for (const [k, t] of cache) {
    if (k.includes(':' + name + ':') || k.endsWith(':' + name)) {
      if (t && t.dispose) t.dispose();
      cache.delete(k);
    }
  }
}
