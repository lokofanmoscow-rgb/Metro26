// Оформление станций Большой кольцевой линии (и «Шелепихи», «Делового центра» на 17-й линии) —
// по сферическим панорамам станций (i.transport.mos.ru/bkl). Описание для генератора src/engine/bkl.js:
//  W — ширина островной платформы, h — высота зала над платформой (м)
//  floor — пол: g — перекрашенный гранит [тёмный, светлый], pat — рисунок, gl — сила отражения
//  wall — полосы путевой стены (у береговых платформ — стены за платформой) снизу вверх: [верх, материал]
//  soffit — тёмный короб над путём со светодиодной линией (y — низ короба), box — световая панель на его грани
//  cols — колонны: shape (rect, tilt — расширяется кверху, round, oct, facet — гранёная «скрученная»),
//         rows (isl — по краям островной, mid — между путями, edge — у края береговых), step — шаг
//  ceil — потолок: kind (slatsX, slatsZ, coffer, tilt, discs, facets, hanging, vault, lace)
//  lights — светильники: lines, zig, cross, down, squares, rings, ovals, tri, cove, under, wall
//  name — название: fg, bg (табличка), y, h; особые: fish, figures, portholes, balcony, wallSeg, baseGlow
// Материал: '#цвет' | { c, r, m } | { g: [...] } | { mb: {...} } — мрамор | { t: генератор, ... }
const tileW = { t: 'tile', c: '#f1f0ec', grout: '#c9c7c0', tw: 0.6, th: 0.3, r: 0.18 };
const lightFloor = ['#8c8c8a', '#d8d8d4'];
const tubbing = { t: 'tubbing', c: '#18191b', rib: '#2c2e31', r: 0.3, ns: 1.2 };

export const BKL = {
  'ln11:Савёловская': {
    type: 'pylon', wallH: 2.6, wall: [[2.6, tubbing]],
    vault: { t: 'panel', c: '#efefec', seam: 'rgba(30,30,30,0.6)', pw: 1.5, ph: 1.0, r: 0.4, e: 0.14 },
    center: { t: 'panel', c: '#f1f1ee', seam: 'rgba(30,30,30,0.5)', pw: 1.5, ph: 1.0, r: 0.45, e: 0.16 },
    pylon: { mb: { base: '#ecebe6', vein: '#bdb8ad', dark: '#dcd7cc', veinAmt: 0.45 }, r: 0.22 },
    lining: { mb: { base: '#19191b', vein: '#d4d4d4', dark: '#0c0c0c', veinAmt: 0.5, veinSharp: 9 }, r: 0.12 },
    opening: 'rect', pass: 4.6, openH: 3.6, floor: { g: ['#55565a', '#9c9d9f'] }, name: { fg: '#cfcfcc', y: 2.0 },
  },
  'ln11:Марьина Роща': {
    type: 'pylon', wallH: 2.6, wall: [[2.6, tubbing]], vault: tubbing,
    center: { c: '#f3f3f1', r: 0.6, e: 0.18 }, pylon: { c: '#f0f0ee', r: 0.35, e: 0.14 }, opening: 'pill', pass: 5.0, openH: 3.9, ring: true,
    floor: { g: ['#8a8a88', '#d8d8d4'] }, name: { fg: '#d4d7db', y: 2.1 },
  },
  'ln11:Рижская': {
    type: 'pylon', wallH: 2.6, wall: [[2.6, tubbing]], vault: tubbing, center: { c: '#f2f2f0', r: 0.6, e: 0.18 },
    pylon: { t: 'terrazzo', base: '#e9e8e4', chips: ['#1e1e1e', '#7a7a7a', '#bdbab4'], dens: 16000, sz: 1.5, r: 0.45 },
    lining: { c: '#9a5232', m: 0.9, r: 0.16, e: 0.05 }, opening: 'arch', led: true, pass: 4.2, openH: 4.0,
    floor: { g: ['#4e2218', '#a65a46'], gl: 0.34 }, name: { fg: '#d9d9d6', y: 2.1 },
  },
  'ln11:Сокольники': {
    W: 12, h: 7.4, balcony: { y: 4.4, d: 2.3, mat: { c: '#2c2f35', r: 0.4 } },
    wall: [[0.3, 'black'], [2.9, { t: 'posters', r: 0.45 }], [3.3, 'black'], ['top', { c: '#2a3550', r: 0.5 }]],
    cols: { shape: 'rect', w: 1.0, mat: { mb: { base: '#a2a6a9', vein: '#dadcdd', dark: '#808487', veinAmt: 0.5 }, r: 0.2 }, step: 8, full: true },
    ceil: { mat: { c: '#1f2f5c', r: 0.5, e: 0.06 } }, lights: [{ k: 'down', r: 0.32, n: 3, step: 3.2, i: 4.2 }],
    floor: { g: lightFloor }, name: { fg: '#f2f2f0', bg: '#1b1b1d', y: 1.5, h: 0.42 },
  },
  'ln11:Электрозаводская': {
    W: 12, h: 5.8,
    wall: [[0.3, 'black'], [2.9, { t: 'mosaic', kind: 'swirl', pal: ['#151a2e', '#1f3570', '#2f56a8', '#6a4a28', '#9a7434', '#c9a24e', '#e2c77a'], cell: 7, r: 0.25 }], [3.3, { c: '#1a1a1c', r: 0.2 }], ['top', { c: '#ecebe8', r: 0.5, e: 0.12 }]],
    portholes: { y: 4.55, r: 0.62, step: 5.5 },
    cols: { shape: 'rect', w: 1.0, mat: { mb: { base: '#1b1b1d', vein: '#e6e6e6', dark: '#0d0d0d', veinAmt: 0.55, veinSharp: 10 }, r: 0.12 }, base: 'black', step: 8 },
    ceil: { mat: 'whiteP' }, lights: [{ k: 'lines', n: 2, sp: 2.4, i: 4.2 }, { k: 'wall', ys: [3.35], i: 3 }],
    floor: { g: ['#1c1c1d', '#4a4a4c'], r: 0.12, gl: 0.4 }, name: { fg: '#131313', y: 1.6, h: 0.42 },
  },
  'ln11:Лефортово': {
    W: 12, h: 5.0, wall: [[1.1, { c: '#121214', r: 0.1 }], ['top', { t: 'stripesV', pal: ['#e9e9e6', '#cfcfcc', '#a9a9a6', '#8a8a88', '#f4f4f2'], r: 0.35 }]],
    soffit: { y: 4.0, mat: { c: '#232428', r: 0.5 } },
    cols: { shape: 'rect', w: 1.0, mat: { c: '#ecebe7', r: 0.35, e: 0.12 }, slit: true, step: 8.5 },
    ceil: { kind: 'slatsZ', mat: { c: '#2b2c30', r: 0.6 }, slat: { c: '#5c5f64', m: 0.5, r: 0.4 }, step: 0.22 },
    lights: [{ k: 'zig', per: 9, i: 4.5 }], floor: { g: ['#9a9a97', '#e4e4e0'], r: 0.12 }, name: { fg: '#2a2a2a', y: 2.4, h: 0.45 },
  },
  'ln11:Авиамоторная': {
    W: 12, h: 5.2, wall: [[0.35, 'black'], [3.8, { t: 'stripesH', pal: ['#3c3f43', '#5f6368', '#8a8e93', '#b4b7bb', '#d8dadc', '#eceeef'], r: 0.3 }], ['top', 'black']],
    soffit: { y: 3.9, mat: { c: '#15161a', r: 0.45 } },
    cols: { shape: 'tilt', w: 1.1, d: 0.9, top: 1.5, mat: { c: '#eeeeeb', r: 0.3, e: 0.12 }, edge: 'steel', step: 9 },
    ceil: { mat: { c: '#2a2c31', r: 0.55, e: 0.05 } }, lights: [{ k: 'lines', n: 6, sp: 0.35, i: 4.8 }, { k: 'tri', i: 3.6 }],
    floor: { g: ['#2b2b2c', '#555557'], r: 0.12, gl: 0.4 }, name: { fg: '#2a2a2c', y: 2.4, h: 0.5 },
  },
  'ln11:Нижегородская': {
    h: 5.4, wall: [[0.3, 'black'], [3.6, { c: '#a9a6a0', r: 0.4 }], ['top', { g: ['#7a7874', '#bdb9b2'], r: 0.4, gs: 2 }]],
    wallSeg: { y0: 0.3, y1: 3.6, cols: ['#e8781c', '#f2c21a', '#1f9a6a', '#1f63c4'], len: 42 },
    soffit: { y: 4.0, mat: { g: ['#77746f', '#b5b1aa'], r: 0.45, gs: 2 }, box: 0.55, bi: 2.6 },
    cols: { shape: 'rect', w: 1.1, mat: { g: ['#8f8c86', '#c9c5bd'], r: 0.4, gs: 2 }, step: 8 },
    ceil: { mat: { t: 'panel', c: '#b6b3ad', pw: 2.4, ph: 1.2, r: 0.45 } }, lights: [{ k: 'lines', n: 2, sp: 3.0, i: 4.4 }],
    floor: { g: ['#8f8f8c', '#dadad6'] }, name: { fg: '#3a3a3a', y: 3.0, h: 0.55, metal: true },
  },
  'ln11:Текстильщики': {
    h: 5.4, wall: [[0.08, 'black'], ['top', { mb: { base: '#ecebe8', vein: '#c9c9c6', dark: '#dcdbd7', veinAmt: 0.4 }, r: 0.2 }]], baseGlow: '#36d6f0',
    cols: { rows: 'mid', shape: 'rect', w: 1.4, d: 4.0, mat: { c: '#2a2c30', r: 0.35 }, tubes: true, step: 8.5 },
    ceil: { mat: 'whiteP' }, lights: [{ k: 'ovals', step: 3.0, i: 3.6 }, { k: 'cove', i: 3 }],
    floor: { g: ['#9a9a97', '#e1e1dd'] }, name: { fg: '#1e1e1e', y: 2.6, h: 0.45, sp: 0.35 },
  },
  'ln11:Печатники': {
    h: 5.4, wall: [[0.15, 'black'], ['top', { t: 'concrete', c: '#cfcecb', pw: 2.4, ph: 1.6, r: 0.6 }]],
    cols: { rows: 'mid', shape: 'tilt', w: 1.3, d: 1.0, top: 1.6, mat: { t: 'concrete', c: '#d2d1ce', pw: 2, ph: 2, r: 0.6 }, step: 9 },
    ceil: { mat: 'whiteP' }, lights: [{ k: 'lines', n: 3, sp: 0.25, i: 4.6 }, { k: 'wall', ys: [3.6], i: 3 }],
    floor: { g: lightFloor }, name: { fg: '#1f1f1f', h: 0.55, y: 3.0 },
  },
  'ln11:Нагатинский Затон': {
    h: 5.4, wall: [[0.9, { g: ['#111112', '#333335'], r: 0.2 }], ['top', { mb: { base: '#efeeea', vein: '#cfcfcb', dark: '#e2e1dc', veinAmt: 0.35 }, r: 0.25 }]], fish: true,
    cols: { rows: 'mid', shape: 'tilt', w: 1.5, d: 2.6, top: 1.25, mat: { c: '#232427', r: 0.4 }, step: 9 },
    ceil: { mat: 'whiteP' }, lights: [{ k: 'cove', i: 4 }, { k: 'lines', n: 1, i: 3.8 }],
    floor: { g: lightFloor }, name: { fg: '#2a2a2a', y: 1.9, h: 0.4 },
  },
  'ln11:Кленовый бульвар': {
    h: 5.6, wall: [[0.1, 'black'], ['top', { t: 'rhomb', r: 0.25 }]],
    cols: { rows: 'mid', shape: 'rect', w: 1.2, d: 3.0, mat: { c: '#1c1d20', r: 0.2 }, step: 8 },
    ceil: { kind: 'vault' }, lights: [{ k: 'cove', i: 4.2 }], floor: { g: lightFloor }, name: { fg: '#8a8c8f', metal: true, y: 3.2, h: 0.6 },
  },
  'ln11:Каширская': {
    W: 12, h: 5.0, wall: [[0.25, 'black'], ['top', { mb: { base: '#e9e9e7', vein: '#9a9a98', dark: '#d4d4d1', veinAmt: 0.55, veinSharp: 10 }, r: 0.25 }]],
    cols: { shape: 'rect', w: 0.9, mat: { c: '#0f0f10', r: 0.08, e: 0.02 }, step: 7 },
    ceil: { kind: 'coffer', beam: 'whiteP' }, lights: [{ k: 'squares', n: 2, s: 0.9, step: 3.5, i: 3.8 }],
    floor: { g: lightFloor }, name: { fg: '#1a1a1a', h: 0.45, sp: 0.4 },
  },
  'ln2:Каширская': {
    h: 5.0, wall: [[0.25, 'black'], ['top', { c: '#0e0e10', r: 0.08, e: 0.03 }]],
    cols: { shape: 'rect', w: 0.9, mat: { mb: { base: '#ecebe8', vein: '#9a9a98', dark: '#d8d8d4', veinAmt: 0.5 }, r: 0.2 }, step: 7 },
    ceil: { kind: 'coffer', beam: 'whiteP' }, lights: [{ k: 'squares', n: 2, s: 0.9, step: 3.5, i: 3.8 }],
    floor: { g: lightFloor, pat: 'center', w: 1.5 }, name: { fg: '#e6e6e6', h: 0.45, sp: 0.4, metal: true },
  },
  'ln11:Варшавская': {
    W: 12, h: 5.0, wall: [[0.25, 'black'], ['top', { mb: { base: '#dcdcd8', vein: '#a7a7a3', dark: '#c7c7c3' }, r: 0.3 }]],
    cols: { shape: 'tilt', w: 0.95, top: 1.45, topD: 1.25, mat: { g: ['#121213', '#3a3a3d'], r: 0.1 }, step: 8 },
    ceil: { kind: 'coffer' }, lights: [{ k: 'squares', n: 2, s: 0.7, step: 4, i: 3.8 }],
    floor: { g: lightFloor }, name: { fg: '#ffffff', bg: '#141414', h: 0.45, y: 2.8 },
  },
  'ln11:Каховская': {
    W: 12, h: 4.8, wall: [[0.5, 'black'], ['top', { t: 'tile', c: '#efede6', grout: '#cfcdc5', tw: 0.6, th: 0.3, r: 0.25 }]],
    cols: { shape: 'round', w: 0.75, mat: { mb: { base: '#4a3326', vein: '#c9b8a6', dark: '#2a1c14', veinAmt: 0.6 }, r: 0.15 }, step: 7 },
    ceil: { mat: { t: 'panel', c: '#ecebe8', pw: 1.2, ph: 2.4, r: 0.5 } }, lights: [{ k: 'lines', at: 'rows', i: 4.6, w: 0.12 }, { k: 'lines', n: 2, sp: 2.2, i: 4 }],
    floor: { g: ['#7c7c7a', '#c9c9c5'], r: 0.12 }, name: { fg: '#d2d2d2', bg: '#0e0e10', h: 0.5, y: 2.4 },
  },
  'ln11:Зюзино': {
    W: 12, h: 5.2, wall: [[0.4, { g: ['#121212', '#333333'] }], [1.4, { c: '#a8a83a', r: 0.12, e: 0.1 }], [3.4, { c: '#18191b', r: 0.2 }], ['top', { t: 'wood', c1: '#4a3a2e', c2: '#3a2c22', gap: '#111111', n: 20, r: 0.55 }]],
    cols: { shape: 'rect', w: 0.95, mat: { mb: { base: '#e6e4df', vein: '#bdbab3', dark: '#d4d1ca', veinAmt: 0.4 }, r: 0.25 }, step: 8 },
    ceil: { kind: 'facets', mat: { c: '#3a332e', r: 0.6 }, facet: { c: '#5e5148', r: 0.55 } }, lights: [{ k: 'squares', n: 2, s: 0.75, step: 3.6, i: 3.8, dy: -0.32 }, { k: 'wall', ys: [3.4], i: 3.2 }],
    floor: { g: lightFloor }, name: { fg: '#f0f0ee', bg: '#121212', y: 1.7, h: 0.45 },
  },
  'ln11:Воронцовская': {
    W: 12, h: 5.4, wall: [[0.3, { g: ['#0f0f10', '#2a2a2c'] }], [1.0, { c: '#e07a1c', r: 0.1, e: 0.1 }], [3.6, { c: '#111214', r: 0.15 }], ['top', { t: 'wood', c1: '#26272a', c2: '#1e1f22', gap: '#0a0a0a', n: 24, r: 0.5 }]],
    cols: { shape: 'facet', w: 1.1, twist: 0.5, mat: { t: 'terrazzo', base: '#d9d8d4', chips: ['#9a9a96', '#b5b4af', '#7a7a77'], dens: 12000, sz: 1.2, r: 0.55 }, step: 8.5 },
    soffit: { y: 4.2, mat: { c: '#e9e9e7', r: 0.5 }, i: 4.6 }, ceil: { kind: 'discs', mat: { c: '#18191b', r: 0.6 } },
    lights: [{ k: 'down', n: 3, r: 0.12, step: 2.5, i: 4, dy: -0.02 }],
    floor: { g: ['#9a9a97', '#e2e2de'], pat: 'sides', w: 3.2, g2: ['#1e1e1f', '#3e3e40'] }, name: { fg: '#d0d0d0', metal: true, y: 2.4, h: 0.45 },
  },
  'ln11:Новаторская': {
    W: 12, h: 5.4, wall: [[2.4, { c: '#121214', r: 0.08 }], ['top', { t: 'wood', c1: '#7a5236', c2: '#6a4430', gap: '#24160e', n: 14, r: 0.5 }]],
    cols: { shape: 'rect', w: 1.0, mat: { mb: { base: '#ece4d6', vein: '#cbbfa9', dark: '#ddd2bf', veinAmt: 0.45 }, r: 0.2 }, step: 9 },
    ceil: { kind: 'hanging', mat: { c: '#1a1a1c', r: 0.6 } }, lights: [{ k: 'lines', n: 4, sp: 1.4, i: 4.2, dy: -0.02 }],
    floor: { t: 'zebra', c1: '#ecebe7', c2: '#1f1f21', ang: 0.5, frac: 0.45, pu: 2.4, pv: 2.4, r: 0.15 }, name: { fg: '#c9c9c9', metal: true, y: 1.9, h: 0.4 },
  },
  'ln11:Проспект Вернадского': {
    W: 12, h: 5.2, wall: [[2.0, { c: '#0f0f11', r: 0.08 }], [2.25, 'black'], [3.9, { t: 'copper', m: 0.6, r: 0.3 }], ['top', { c: '#111111', r: 0.3 }]],
    soffit: { y: 4.0, mat: { c: '#121315', r: 0.4 } }, cols: { shape: 'rect', w: 1.0, mat: { g: ['#0d0d0e', '#2e2e30'], r: 0.08 }, step: 8.5 },
    ceil: { mat: { t: 'checker', r: 0.35, m: 0.5 } }, lights: [{ k: 'squares', n: 2, s: 0.8, step: 3, i: 4 }],
    floor: { g: ['#7c7c7a', '#cfcfcb'], r: 0.12 }, name: { fg: '#cfcfcf', metal: true, y: 1.4, h: 0.38 },
  },
  'ln11:Мичуринский проспект': {
    W: 12, h: 5.6, wall: [[1.9, { t: 'panel', c: '#ddd6c8', seam: 'rgba(40,40,40,0.6)', pw: 0.6, ph: 1.9, r: 0.3 }], [2.3, 'black'], ['top', { t: 'zebra', c1: '#f0efea', c2: '#1d1d1f', ang: 0, frac: 0.5, pu: 0.5, pv: 1, r: 0.35 }]],
    cols: { shape: 'rect', w: 1.0, d: 0.8, mat: { c: '#c33a1c', r: 0.08, e: 0.1 }, step: 8 },
    ceil: { kind: 'lace', mat: 'whiteP' }, lights: [{ k: 'lines', n: 2, sp: 2.6, i: 4 }],
    floor: { g: ['#7c7c7a', '#cfcfcb'], pat: 'edge' }, name: { fg: '#2a2a2a', y: 2.1, h: 0.32 },
  },
  'ln11:Аминьевская': {
    W: 12, h: 5.0, wall: [[0.3, 'black'], [1.2, { t: 'pixel', r: 0.25 }], [1.45, 'black'], [2.6, { t: 'pixel', seed: 9, r: 0.25 }], [2.85, 'black'], ['top', { c: '#1a1b1d', r: 0.4 }]],
    soffit: { y: 3.6, mat: { c: '#161719', r: 0.45 } }, cols: { shape: 'rect', w: 1.0, mat: { g: ['#1e1410', '#4a3426'], r: 0.1 }, step: 8 },
    ceil: { kind: 'slatsX', mat: { c: '#111111', r: 0.7 }, slat: { c: '#3a3c40', m: 0.6, r: 0.4 }, step: 0.28 }, lights: [{ k: 'lines', n: 1, i: 3.5 }],
    floor: { g: lightFloor }, name: { fg: '#f0f0f0', bg: '#121212', h: 0.38, y: 3.2 },
  },
  'ln11:Давыдково': {
    h: 5.4, wall: [[0.1, 'black'], [2.6, { t: 'panel', c: '#2252a8', pw: 1.2, ph: 2.6, r: 0.1, e: 0.08 }], ['top', { t: 'relief', r: 0.6 }]],
    cols: { rows: 'mid', shape: 'tilt', w: 1.6, d: 3.2, top: 1.25, topD: 1.1, mat: { c: '#e0701c', r: 0.12, e: 0.1 }, names: '#7a3008', emblem: true, step: 8 },
    ceil: { mat: 'whiteP' }, lights: [{ k: 'lines', n: 1, i: 4.5 }, { k: 'cove', i: 3 }],
    floor: { g: ['#9a9a97', '#e1e1dd'] }, name: { fg: '#f0f0f0', y: 1.4, h: 0.4 },
  },
  'ln11:Кунцевская': {
    h: 4.8, wall: [[0.1, 'black'], ['top', { t: 'terrazzo', base: '#9a9ca1', chips: ['#6e7075', '#85878c', '#b4b6ba'], dens: 26000, sz: 0.9, r: 0.35 }]],
    cols: { rows: 'edge', shape: 'rect', w: 0.9, mat: { t: 'terrazzo', base: '#9a9ca1', chips: ['#6e7075', '#85878c', '#b4b6ba'], dens: 26000, sz: 0.9, r: 0.35 }, step: 8 },
    ceil: { mat: { t: 'panel', c: '#8f9196', pw: 2.0, ph: 2.0, r: 0.5 } }, lights: [{ k: 'down', n: 1, r: 0.65, step: 8, i: 3.6 }, { k: 'under', i: 3 }],
    floor: { g: ['#8c8c8a', '#d0d0cc'] }, name: { fg: '#e6e6e6', metal: true, y: 3.0, h: 0.55 }, benches: false,
  },
  'ln11:Терехово': {
    h: 5.2, wall: [[0.1, 'black'], ['top', { t: 'flutes', c: '#e6e6e3', r: 0.45, ns: 0.8 }]],
    cols: { rows: 'mid', shape: 'rect', w: 0.8, d: 1.2, mat: { t: 'concrete', c: '#b9b8b4', pw: 1, ph: 2, r: 0.6 }, step: 9 },
    ceil: { mat: { c: '#9fa1a3', r: 0.5 } }, lights: [{ k: 'rings', step: 9, i: 4.2 }, { k: 'cove', i: 2.8 }],
    floor: { g: lightFloor }, name: { fg: '#c9a04a', metal: true, y: 2.6, h: 0.6 },
  },
  'ln11:Мнёвники': {
    W: 12, h: 5.2, wall: [[0.3, 'black'], ['top', { t: 'concrete', c: '#5d6066', pw: 2.4, ph: 1.2, blot: 0.12, r: 0.45 }]],
    cols: { shape: 'rect', w: 1.0, mat: { mb: { base: '#e1dccf', vein: '#cbc4b3', dark: '#d6d0c1', veinAmt: 0.3 }, r: 0.35 }, ends: { c: '#d4561c', r: 0.08, e: 0.1 }, step: 8 },
    ceil: { mat: { c: '#2e3034', r: 0.55 } }, lights: [{ k: 'lines', n: 2, sp: 4.5, i: 4.6 }, { k: 'wall', ys: [3.5], i: 3.2 }],
    floor: { g: ['#7c7c7a', '#cfcfcb'] }, name: { fg: '#8a8e94', y: 2.6, h: 0.75, sp: 0.5 },
  },
  'ln11:Народное Ополчение': {
    W: 12, h: 5.2, wall: [[0.3, 'black'], [2.2, { t: 'panel', c: '#d6d6d3', pw: 1.2, ph: 2.0, r: 0.3 }], [2.5, { c: '#141416', r: 0.2 }], [3.9, { t: 'panel', c: '#ececea', pw: 1.2, ph: 1.4, r: 0.35 }], ['top', { c: '#2a2c30' }]],
    soffit: { y: 4.0, mat: { c: '#2a2c30', r: 0.5 } }, cols: { shape: 'rect', w: 0.95, mat: 'steel', step: 8 },
    ceil: { mat: { t: 'terrazzo', base: '#3a3c40', chips: ['#1e1f22', '#55585c'], dens: 6000, sz: 1.4, r: 0.6 } }, lights: [{ k: 'lines', n: 4, sp: 0.9, i: 4.6 }],
    floor: { g: ['#7c7c7a', '#cfcfcb'], r: 0.12 }, name: { fg: '#3a3c40', y: 1.6, h: 0.45, sp: 0.4 },
  },
  'ln11:Хорошёвская': {
    W: 12, h: 5.0, wall: [[0.6, 'black'], ['top', tileW]], soffit: { y: 3.8, mat: 'black', box: 0.3 },
    cols: { shape: 'tilt', w: 0.95, top: 1.35, mat: { mb: { base: '#4a2420', vein: '#d8c8c0', dark: '#2a1410', veinAmt: 0.6 }, r: 0.1 }, step: 8 },
    ceil: { kind: 'tilt', panel: { t: 'panel', c: '#f2f2f0', pw: 2.4, ph: 2.4, r: 0.5, e: 0.16 }, frame: 'black', lift: 0.9 },
    floor: { g: ['#9a948a', '#e0dbd0'] }, name: { fg: '#f0f0f0', bg: '#8a2a24', h: 0.38, y: 3.0 },
  },
  'ln11:ЦСКА': {
    W: 12, h: 5.0, wall: [[1.0, 'black'], ['top', tileW]], soffit: { y: 3.8, mat: 'black', box: 0.3 },
    cols: { shape: 'tilt', w: 1.0, top: 1.3, mat: { g: ['#0d0d0e', '#2a2a2c'], r: 0.08 }, step: 8 },
    ceil: { kind: 'tilt', panel: 'whiteP', frame: 'black', art: { t: 'mosaic', kind: 'bands', pal: ['#2d6fc4', '#8fc4ea', '#f2f2f2', '#e8742a', '#f0d040', '#2d6fc4'], cell: 6, r: 0.4, e: 0.2 } },
    figures: true, floor: { g: lightFloor }, name: { fg: '#ffffff', bg: '#e05a1a', h: 0.55, y: 2.7, font: '800 110px "PT Sans",Arial,sans-serif', sp: 0.5 },
  },
  'ln11:Петровский парк': {
    W: 12, h: 7.0, balcony: { y: 4.6, d: 2.2, mat: { c: '#1a1b1d', r: 0.3 } },
    wall: [[0.8, 'black'], [3.4, tileW], [4.3, { c: '#121214', r: 0.1 }], ['top', { c: '#e9e9e7' }]],
    cols: { shape: 'rect', w: 1.0, mat: { g: ['#1e2622', '#4a524c'], r: 0.12 }, step: 8, full: true },
    ceil: { kind: 'tilt', panel: 'whiteP', frame: 'black', lift: 0.8 }, lights: [{ k: 'lines', n: 2, sp: 3.0, i: 4 }],
    floor: { g: ['#a39b8e', '#e2dcd0'] }, name: { fg: '#e9e9e7', bg: '#4a4a48', h: 0.42, y: 2.3 },
  },
  'ln17:Шелепиха': {
    W: 12, h: 5.2, wall: [[0.6, 'black'], ['top', tileW]], soffit: { y: 3.9, mat: 'black', box: 0.35 },
    cols: { shape: 'tilt', w: 1.0, top: 1.35, mat: { mb: { base: '#ecebe6', vein: '#c3bfb5', dark: '#dad6cc', veinAmt: 0.4 }, r: 0.2 }, base: 'black', step: 8 },
    ceil: { kind: 'tilt', panel: { c: '#f2c21a', r: 0.15, e: 0.18 }, frame: 'black', lift: 0.9 },
    floor: { g: ['#a39a86', '#e8dfca'] }, name: { fg: '#1e1e1e', y: 2.4, h: 0.4 },
  },
  'ln17:Деловой центр': {
    W: 14, h: 7.6, balcony: { y: 4.8, d: 2.6, mat: 'steel', name: '#2a2a2a' },
    wall: [[0.4, 'black'], [4.2, { t: 'tile', c: '#efeeea', grout: '#d2d0c9', tw: 1.2, th: 0.6, r: 0.2 }], ['top', { c: '#d9c9a6', r: 0.5 }]],
    cols: { shape: 'oct', w: 1.2, mat: 'steel', step: 9, full: true },
    ceil: { kind: 'slatsX', mat: { c: '#1f2b4a', r: 0.5 }, slat: { c: '#c9b48a', m: 0.4, r: 0.4 }, step: 0.45 },
    lights: [{ k: 'zig', per: 12, i: 4.6 }], floor: { g: ['#6a5e52', '#b3a796'], r: 0.1 }, name: { fg: '#2a2a2a', y: 2.5, h: 0.45 },
  },
};
BKL['ln15:Нижегородская'] = BKL['ln11:Нижегородская'];

export function bklSpec(lineId, name) { return BKL[lineId + ':' + name] || null; }
