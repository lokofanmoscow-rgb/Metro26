// Интерфейс: меню, HUD, карта, сохранения.
import { Game, transfersFor } from './game.js';
import { MetroMap } from './ui/map.js';
import { SCHEME } from './data/scheme.js';
import { LINES, PLAYABLE, TRAINS, lineDirs } from './data/lines.js';
import { LIVERY } from './engine/train.js';
import { fmtTime } from './engine/util.js';
import { loadHQ } from './engine/hq.js';
import { loadOSM } from './engine/osm.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'metro26.saves.v1';
const SET_KEY = 'metro26.settings.v3'; // v3: максимальная графика, эффекты по умолчанию выключены

const store = {
  read(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};

const saves = {
  all() { return store.read(SAVE_KEY, { slots: [null, null, null, null, null], auto: null }); },
  put(slot, data) {
    const a = this.all();
    const rec = { data, date: Date.now() };
    if (slot === 'auto') a.auto = rec; else a.slots[slot] = rec;
    return store.write(SAVE_KEY, a);
  },
  remove(slot) { const a = this.all(); if (slot === 'auto') a.auto = null; else a.slots[slot] = null; store.write(SAVE_KEY, a); },
};

const sel = { line: 'ln1', dir: 0, train: '717', startK: 0 };
let game = null;
let map = null;
let inGame = false;
let hudOn = true;
const hudCache = {};
function hudUpdate(s, T, P, C) {
    T('hudSpeed', String(Math.round(s.speed)));
    T('hudLim', String(s.limit));
    C('hudArs', 'ars' + (s.overspeed ? ' over' : !s.free && s.limit < 80 ? ' low' : ''));
    { const v = s.free ? 'МАКС' : 'АРС'; if (hudCache.arsLbl !== v) { hudCache.arsLbl = v; $('hudArs').querySelector('.lbl').textContent = v; } }
    P('hudTr1', 'width', `${Math.round(s.traction * 100)}%`);
    P('hudBr1', 'width', `${Math.round(s.brake * 100)}%`);
    T('hudDoors', s.doorsClosed ? 'ДВЕРИ ЗАКРЫТЫ' : 'ДВЕРИ ОТКРЫТЫ');
    C('hudDoors', 'doors' + (s.doorsClosed ? '' : ' open'));
    T('hudScore', String(s.score));
    T('hudTime', s.time);
    T('hudNext', s.station ? `стоянка: ${s.station}` : (s.next || '—'));
    T('hudLine', s.line.num); P('hudLine', 'background', s.line.color);
    T('hudDir', `${s.line.name} → ${s.dirTo}`);
    const trs = s.station ? [] : s.nextTransfers;
    { const html = trs.map((t) => `<span class="tr"><span class="dot" style="background:${t.line.color}"></span>${t.station}</span>`).join(''); if (hudCache.tr !== html) { hudCache.tr = html; $('hudTr').innerHTML = html; } }
    const st = $('hudStop');
    if (s.nearStop && s.dist != null && !s.station && s.dist > -15) {
      C('hudStop', 'hud-stop' + (s.dist < -0.5 ? ' over' : ''));
      const m = s.dist;
      T('hudStopTxt', m >= 0 ? 'До остановочной отметки' : 'Проезд отметки');
      T('hudStopM', `${Math.abs(m) < 10 ? Math.abs(m).toFixed(1) : Math.round(Math.abs(m))} м`);
      P('hudStopFill', 'width', `${Math.max(0, Math.min(100, Math.round(100 - m / 4.5)))}%`);
    } else C('hudStop', 'hud-stop hidden');
    if (!$('mapPanel').classList.contains('hidden')) updateMapTrain(false);
  }

let lastHud = null;

// подтверждение внутри страницы (системные диалоги в просмотрщике недоступны)
function ask(text, ok = 'Да') {
  return new Promise((resolve) => {
    $('cfText').textContent = text;
    $('cfOk').textContent = ok;
    $('confirm').classList.remove('hidden');
    const done = (v) => { $('confirm').classList.add('hidden'); $('cfOk').onclick = $('cfNo').onclick = null; resolve(v); };
    $('cfOk').onclick = () => done(true);
    $('cfNo').onclick = () => done(false);
  });
}

function lineBadge(l) { return `<span class="ln-badge" style="background:${l.color}">${l.num}</span>`; }

// ---------- UI для Game ----------
const ui = {
  toggleMap() { if ($('mapPanel').classList.contains('hidden')) openMap(); else closeMap(); },
  toggleHud() { hudOn = !hudOn; $('hud').classList.toggle('hidden', !hudOn); },
  togglePause() {
    if (!$('mapPanel').classList.contains('hidden')) { closeMap(); return; }
    if (!$('dialog').classList.contains('hidden')) { $('dialog').classList.add('hidden'); return; }
    if ($('pause').classList.contains('hidden')) pause(true); else pause(false);
  },
  onView(mode) { $('tView').textContent = mode === 'outside' ? 'КАБИНА' : 'ВИД'; },
  message(text) {
    const t = $('toast');
    if (!text) { t.classList.add('hidden'); return; }
    t.textContent = text; t.classList.remove('hidden');
  },
  onHud(s) {
    lastHud = s;
    // в DOM пишем только изменившееся (каждая запись — перерасчёт и перерисовка панелей)
    const T = (id, v) => { const k = 't:' + id; if (hudCache[k] !== v) { hudCache[k] = v; $(id).textContent = v; } };
    const P = (id, prop, v) => { const k = id + ':' + prop; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[prop] = v; } };
    const C = (id, v) => { const k = 'c:' + id; if (hudCache[k] !== v) { hudCache[k] = v; $(id).className = v; } };
    return hudUpdate(s, T, P, C);
  },
  onFinish(data) {
    const st = data.stats;
    const avg = st.stops ? (st.errSum / st.stops).toFixed(2) : '—';
    $('finBody').innerHTML = `
      <h2>Рейс завершён</h2>
      <p>${lineBadge(data.line)} ${data.line.name}: ${data.from} → ${data.to}</p>
      <p class="muted">${data.train}</p>
      <div class="stats">
        <span>Очки</span><b>${Math.round(st.score)}</b>
        <span>Станций обслужено</span><b>${st.served}</b>
        <span>Идеальных остановок</span><b>${st.perfect}</b>
        <span>Средняя ошибка остановки</span><b>${avg} м</b>
        <span>Проехано станций без остановки</span><b>${st.skipped}</b>
        <span>Превышение скорости</span><b>${Math.round(st.overspeedT)} с</b>
        <span>Перевезено пассажиров</span><b>${st.pax}</b>
        <span>Пройдено</span><b>${(st.dist / 1000).toFixed(1)} км</b>
        <span>Время в пути</span><b>${data.time}</b>
      </div>
      <button class="btn primary" id="fBack">Обратный рейс</button>
      <button class="btn" id="fSave">Сохранить</button>
      <button class="btn" id="fMenu">В главное меню</button>`;
    $('finish').classList.remove('hidden');
    $('fBack').onclick = () => { $('finish').classList.add('hidden'); withLoading(() => game.turnaround()); };
    $('fSave').onclick = () => saveDialog();
    $('fMenu').onclick = () => { $('finish').classList.add('hidden'); toMenu(); };
  },
};

function withLoading(fn, text = 'Строим тоннели и станции…') {
  $('loadTxt').textContent = text;
  $('loading').classList.remove('hidden');
  setTimeout(() => { try { fn(); } finally { $('loading').classList.add('hidden'); } }, 30);
}

// ---------- меню ----------
function renderLines() {
  const box = $('lineList');
  box.innerHTML = '';
  for (const l of SCHEME.lines) {
    const playable = PLAYABLE.includes(l.id);
    const b = document.createElement('button');
    b.className = 'line-btn' + (playable ? '' : ' off') + (sel.line === l.id ? ' sel' : '');
    b.innerHTML = `${lineBadge(l)}<span>${l.name.replace(/ линия$/i, '').replace(/ Линия$/, '')}${playable ? '' : '<span class="soon">скоро</span>'}</span>`;
    b.title = playable ? l.name : `${l.name} — в разработке`;
    if (playable) b.onclick = () => { sel.line = l.id; sel.startK = 0; if (sel.dir >= lineDirs(l.id).length) sel.dir = 0; renderLines(); renderDirs(); refreshShowroom(); };
    box.appendChild(b);
  }
}

function renderDirs() {
  if ($('stName')) renderStation();
  const L = LINES[sel.line];
  const dirs = lineDirs(sel.line);
  if (sel.dir >= dirs.length) sel.dir = 0;
  $('dirList').innerHTML = '';
  dirs.map((x) => [x.dir, `${x.from} → ${x.to}`]).forEach(([d, txt]) => {
    const e = document.createElement('button');
    e.className = 'dir-btn' + (sel.dir === d ? ' sel' : '');
    e.textContent = txt;
    e.onclick = () => { sel.dir = d; sel.startK = 0; renderDirs(); refreshShowroom(); };
    $('dirList').appendChild(e);
  });
  const st = dirs[sel.dir].line.stations;
  $('menuInfo').innerHTML = `${lineBadge(L)} <b>${L.name}</b><br>${st.length} станций · ${(st.reduce((t, s) => t + s.d, 0) / 1000).toFixed(1)} км${L.branch ? ' · развилка за станцией «' + L.branch.at + '»' : ''}<br><span style="color:#9aa3ad">Станции построены по описаниям оформления из Википедии: тип конструкции, облицовка стен, колонн и пола.</span>`;
}

// станции выбранной линии в порядке выбранного направления
function dirStations() {
  const dirs = lineDirs(sel.line);
  return (dirs[sel.dir] || dirs[0]).stations;
}

function trBadges(sid) {
  return transfersFor(sid).map((t) => `<i style="background:${t.line.color}">${t.line.num}</i>`).join('');
}

function renderStation() {
  const L = LINES[sel.line];
  const list = dirStations();
  const k = Math.min(sel.startK, list.length - 2);
  $('stName').textContent = list[k].n;
  $('stHint').textContent = k === 0 ? 'начало линии · нажмите, чтобы выбрать другую' : `${k + 1}-я станция по ходу · до конечной ${list.length - 1 - k}`;
  $('stDot').style.borderColor = L.color;
  $('btnStation').classList.toggle('sel', k > 0);
}

function stationDialog() {
  const L = LINES[sel.line];
  const list = dirStations();
  const body = $('dlgBody');
  body.innerHTML = `<h2>Станция отправления</h2><p class="muted">${L.name}: ${list[0].n} → ${list[list.length - 1].n}</p>`;
  const box = document.createElement('div');
  box.className = 'st-list';
  list.forEach((st, k) => {
    const last = k === list.length - 1;
    const e = document.createElement('button');
    e.className = 'st-item' + (k === sel.startK ? ' sel' : '') + (last ? ' end' : '');
    e.innerHTML = `<span class="rail" style="background:${L.color}"></span><span class="pt" style="border-color:${L.color}"></span><span class="nm">${st.n}${last ? ' <small>(конечная)</small>' : ''}</span><span class="tr">${trBadges(st.sid)}</span>`;
    if (!last) e.onclick = () => { sel.startK = k; renderStation(); $('dialog').classList.add('hidden'); refreshShowroom(); };
    else e.disabled = true;
    box.appendChild(e);
  });
  body.appendChild(box);
  addClose(body);
  $('dialog').classList.remove('hidden');
  const cur = box.children[sel.startK];
  if (cur) cur.scrollIntoView({ block: 'center' });
}

function renderTrains() {
  $('trainList').innerHTML = '';
  for (const t of Object.values(TRAINS)) {
    const e = document.createElement('button');
    e.className = 'train-btn' + (sel.train === t.id ? ' sel' : '');
    const lv = LIVERY[t.id];
    e.innerHTML = `<b><span class="sw" style="background:linear-gradient(180deg, ${lv.body} 55%, ${lv.stripe} 55%)"></span>${t.name}</b><span>${t.desc}</span>`;
    e.onclick = () => { sel.train = t.id; renderTrains(); refreshShowroom(); };
    $('trainList').appendChild(e);
  }
}

function refreshShowroom() {
  if (inGame || !game) return;
  game.setup({ line: sel.line, dir: sel.dir, train: sel.train, showroom: true, startK: sel.startK });
}

function toMenu() {
  inGame = false;
  game.sound.setActive(false);
  $('menu').classList.remove('hidden');
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
  $('pause').classList.add('hidden');
  closeMap();
  game.paused = false;
  $('btnContinue').disabled = !saves.all().auto;
  refreshShowroom();
}

function startGame(loadData = null) {
  game.sound.init();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  game.settings.short = false;
  game.settings.free = $('optFree').checked;
  withLoading(() => {
    if (loadData) {
      game.load(loadData);
      sel.line = loadData.line; sel.dir = loadData.dir; sel.train = loadData.train; sel.startK = 0;
      $('optFree').checked = !!loadData.free;
    } else game.setup({ line: sel.line, dir: sel.dir, train: sel.train, startK: sel.startK });
    inGame = true;
    game.paused = false;
    $('menu').classList.add('hidden');
    $('pause').classList.add('hidden');
    $('dialog').classList.add('hidden');
    $('finish').classList.add('hidden');
    $('hud').classList.toggle('hidden', !hudOn);
    $('touch').classList.remove('hidden');
    if (map) map.highlight(sel.line);
  });
}

function pause(on) {
  if (!inGame) return;
  game.paused = on;
  game.keys.up = game.keys.down = false;
  game.sound.setActive(!on);
  $('pause').classList.toggle('hidden', !on);
  if (on) {
    const d = game.serialize();
    const L = LINES[d.line];
    $('pauseInfo').innerHTML = `${lineBadge(L)} ${L.name} → ${game.route.stations[game.route.stations.length - 1].name}<br>Следующая: ${d.next || '—'} · очки: ${Math.round(d.stats.score)} · в пути ${fmtTime(d.elapsed)}`;
    if (window.speechSynthesis) try { window.speechSynthesis.pause(); } catch (e) { /* */ }
  } else if (window.speechSynthesis) try { window.speechSynthesis.resume(); } catch (e) { /* */ }
}

// ---------- сохранения ----------
function slotTitle(rec) {
  if (!rec) return null;
  const d = rec.data, L = LINES[d.line];
  const dd = lineDirs(d.line);
  const to = (dd[d.dir] || dd[0]).to;
  return { html: `${lineBadge(L)} <b>→ ${to}</b><span>${TRAINS[d.train].short} · след.: ${d.next || '—'} · очки ${Math.round(d.stats.score)} · ${new Date(rec.date).toLocaleString('ru-RU')}</span>` };
}

function saveDialog() {
  const a = saves.all();
  const body = $('dlgBody');
  body.innerHTML = '<h2>Сохранить игру</h2><p class="muted">Сохранения хранятся в этом браузере.</p>';
  a.slots.forEach((rec, i) => {
    const t = slotTitle(rec);
    const e = document.createElement('div');
    e.className = 'slot' + (rec ? '' : ' empty');
    e.innerHTML = `<div style="font-weight:700;width:24px">${i + 1}</div><div class="s-main">${t ? t.html : '<b>Пустой слот</b>'}</div>`;
    e.onclick = async () => {
      if (rec && !(await ask(`Перезаписать сохранение в слоте ${i + 1}?`, 'Перезаписать'))) return;
      const ok = saves.put(i, game.serialize());
      game._msg(ok ? `Игра сохранена в слот ${i + 1}` : 'Не удалось сохранить (хранилище браузера недоступно)');
      $('dialog').classList.add('hidden');
    };
    body.appendChild(e);
  });
  addClose(body);
  $('dialog').classList.remove('hidden');
}

function loadDialog() {
  const a = saves.all();
  const body = $('dlgBody');
  body.innerHTML = '<h2>Загрузить игру</h2>';
  const list = [['auto', a.auto], ...a.slots.map((r, i) => [i, r])];
  let any = false;
  for (const [k, rec] of list) {
    if (!rec) continue;
    any = true;
    const t = slotTitle(rec);
    const e = document.createElement('div');
    e.className = 'slot';
    e.innerHTML = `<div style="font-weight:700;width:24px">${k === 'auto' ? 'А' : k + 1}</div><div class="s-main">${k === 'auto' ? '<span>автосохранение</span>' : ''}${t.html}</div><button class="btn" title="Удалить">✕</button>`;
    e.querySelector('button').onclick = async (ev) => { ev.stopPropagation(); if (await ask('Удалить это сохранение?', 'Удалить')) { saves.remove(k); loadDialog(); } };
    e.onclick = () => { $('dialog').classList.add('hidden'); startGame(rec.data); };
    body.appendChild(e);
  }
  if (!any) body.insertAdjacentHTML('beforeend', '<p>Сохранений пока нет.</p>');
  addClose(body);
  $('dialog').classList.remove('hidden');
}

function settingsDialog() {
  const s = game.settings;
  const body = $('dlgBody');
  body.innerHTML = `<h2>Настройки</h2>
    <div class="row"><span>Громкость</span><input type="range" id="sVol" min="0" max="1" step="0.05" value="${s.volume}"></div>
    <label class="chk"><input type="checkbox" id="sVoice" ${s.voice ? 'checked' : ''}> голосовые объявления на станциях</label>
    <label class="chk"><input type="checkbox" id="sHud" ${hudOn ? 'checked' : ''}> показывать приборы на экране (H)</label>
    <div class="row"><span>Качество графики</span><select id="sQ">
      <option value="0.75">низкое</option><option value="1">среднее</option><option value="1.5">высокое</option><option value="2">максимальное</option></select></div>
    <label class="chk"><input type="checkbox" id="sFx" ${s.fx ? 'checked' : ''}> эффекты: свечение ламп и отражения в полу</label>
    <div class="row"><span>Чувствительность мыши</span><input type="range" id="sSens" min="0.3" max="2.5" step="0.1" value="${s.sens}"></div>`;
  body.querySelector('#sQ').value = String(s.quality);
  const apply = () => {
    hudOn = body.querySelector('#sHud').checked;
    if (inGame) $('hud').classList.toggle('hidden', !hudOn);
    game.applySettings({ volume: +body.querySelector('#sVol').value, voice: body.querySelector('#sVoice').checked, quality: +body.querySelector('#sQ').value, sens: +body.querySelector('#sSens').value, fx: body.querySelector('#sFx').checked });
    store.write(SET_KEY, { ...game.settings, hud: hudOn });
  };
  body.querySelectorAll('input,select').forEach((e) => { e.oninput = apply; e.onchange = apply; });
  addClose(body);
  $('dialog').classList.remove('hidden');
}

function helpDialog() {
  const body = $('dlgBody');
  body.innerHTML = `<h2>Управление</h2>
    <div class="keys">
      <kbd>W</kbd><span>ход — держите, чтобы разгоняться (или ↑)</span>
      <kbd>S</kbd><span>тормоз — держите, чтобы тормозить (или ↓)</span>
      <kbd>Пробел</kbd><span>открыть / закрыть двери</span>
      <kbd>Мышь</kbd><span>зажмите и двигайте — осмотреться по сторонам; колесо — зум</span>
      <kbd>C</kbd><span>вид снаружи на станции: поезд и посадка пассажиров</span>
      <kbd>M</kbd><span>схема метро с вашим положением</span>
      <kbd>H</kbd><span>скрыть/показать приборы</span>
      <kbd>Esc</kbd><span>пауза, сохранение и загрузка</span>
    </div>
    <p style="margin-top:10px">Остановите поезд так, чтобы голова оказалась у отметки «СТОП» в конце платформы: точность до 0,5 м — «идеальная остановка». Откройте двери, дождитесь посадки, закройте двери и отправляйтесь. Не превышайте ограничение АРС — иначе сработает автоторможение.</p>`;
  addClose(body);
  $('dialog').classList.remove('hidden');
}

function addClose(body) {
  const b = document.createElement('button');
  b.className = 'btn'; b.textContent = 'Закрыть';
  b.onclick = () => $('dialog').classList.add('hidden');
  body.appendChild(b);
}

// ---------- карта ----------
function ensureMap() { if (!map) map = new MetroMap($('mapBox')); return map; }

function updateMapTrain(center) {
  if (!inGame || !game.route) { map.setTrain(null); $('mapWhere').textContent = 'Выберите линию и отправляйтесь в путь'; return; }
  const R = game.route;
  const s = game.s;
  let i = 0;
  while (i < R.stations.length - 1 && R.stations[i + 1].stop <= s) i++;
  const A = R.stations[i], B = R.stations[i + 1];
  let pos, where;
  if (!B || s <= A.stop + 1) {
    pos = map.trainPos(A.sid, null, 0);
    where = `Станция «${A.name}»`;
  } else {
    const f = (s - A.stop) / (B.stop - A.stop);
    if (f > 0.985) { pos = map.trainPos(B.sid, null, 0); where = `Прибытие на станцию «${B.name}»`; }
    else { pos = map.trainPos(A.sid, B.sid, f); where = `Перегон «${A.name}» — «${B.name}» · ${Math.round(B.stop - s)} м до станции`; }
  }
  const L = game.line;
  $('mapWhere').innerHTML = `${lineBadge(L)} ${where}`;
  map.setTrain(pos);
  if (center && pos) map.centerOn(pos.x, pos.y, 560);
}

function openMap() {
  ensureMap();
  $('mapPanel').classList.remove('hidden');
  map.highlight(inGame ? game.lineId : null);
  requestAnimationFrame(() => {
    if (inGame) updateMapTrain(true); else { map.showAll(); updateMapTrain(false); }
  });
}
function closeMap() { $('mapPanel').classList.add('hidden'); }

// ---------- запуск ----------
function fatal(title, msg) {
  $('fatal').classList.remove('hidden');
  $('fatalT').textContent = title;
  $('fatalM').textContent = msg;
  for (const el of document.querySelectorAll('.step, .menu-row, #btnStart')) el.classList.add('hidden');
}

function webgl2() {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
}

function boot() {
  // скрипты работают: убираем подсказку для просмотрщиков без JavaScript
  $('app').classList.remove('no-js');
  // меню заполняем до запуска 3D-графики, чтобы оно работало, даже если графика не стартует
  renderLines(); renderDirs(); renderStation(); renderTrains();
  if (!webgl2()) {
    fatal('Браузер не поддерживает WebGL 2', 'Для 3D-графики нужен браузер с WebGL 2: Safari на iOS 15 и новее, свежий Chrome, Firefox или Edge. Обновите систему или браузер и откройте игру снова.');
    return () => {};
  }
  try {
    game = new Game($('view'), ui);
  } catch (e) {
    fatal('Не удалось запустить 3D-графику', `Браузер отказал в создании WebGL-контекста (${e && e.message ? e.message : e}). Закройте другие вкладки с 3D или перезапустите браузер.`);
    return () => {};
  }
  let st = store.read(SET_KEY, null);
  if (!st) { const old = store.read('metro26.settings.v2', null); if (old) st = { ...old, fx: false }; }
  if (st) { hudOn = st.hud !== false; game.applySettings(st); }
  // фото-текстуры детальных станций декодируются в фоне
  loadHQ();
  loadOSM();
  $('btnStart').onclick = () => startGame();
  $('btnStation').onclick = stationDialog;
  $('btnContinue').onclick = () => { const a = saves.all().auto; if (a) { startGame(a.data); } };
  $('btnContinue').disabled = !saves.all().auto;
  $('btnLoad').onclick = loadDialog;
  $('btnMap').onclick = openMap;
  $('btnSettings').onclick = settingsDialog;
  $('btnHelp').onclick = helpDialog;
  $('pResume').onclick = () => { pause(false); document.activeElement?.blur?.(); };
  $('pSave').onclick = saveDialog;
  $('pLoad').onclick = loadDialog;
  $('pMap').onclick = () => { openMap(); };
  $('pSettings').onclick = settingsDialog;
  $('pHelp').onclick = helpDialog;
  $('pExit').onclick = async () => { if (await ask('Выйти в главное меню? Прогресс после последней станции не сохранится — автосохранение делается на каждой остановке.', 'Выйти')) toMenu(); };
  $('mapClose').onclick = closeMap;
  $('mapZoomIn').onclick = () => map.zoomBy(1 / 1.3);
  $('mapZoomOut').onclick = () => map.zoomBy(1.3);
  $('mapAll').onclick = () => map.showAll();
  $('mapTrain').onclick = () => updateMapTrain(true);
  // сенсорные кнопки
  const hold = (id, key) => {
    const b = $(id);
    const on = (e) => { e.preventDefault(); game.setKey(key, true); b.classList.add('on'); };
    const off = () => { game.setKey(key, false); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  };
  hold('tGo', 'up'); hold('tBr', 'down');
  $('tDoor').onclick = () => game.toggleDoors();
  $('tView').onclick = () => game.toggleOutside();
  $('tMap').onclick = () => ui.toggleMap();
  $('tMenu').onclick = () => pause(true);
  // автосохранение на каждой станции
  const origToggle = game.toggleDoors.bind(game);
  game.toggleDoors = () => {
    const was = game.doorTarget;
    origToggle();
    if (inGame && was === 0 && game.doorTarget === 1) saves.put('auto', game.serialize());
  };
  window.addEventListener('beforeunload', () => { if (inGame && !game.finished) saves.put('auto', game.serialize()); });
  document.addEventListener('keydown', (e) => {
    if (!inGame && e.code === 'Escape') { if (!$('mapPanel').classList.contains('hidden')) closeMap(); else $('dialog').classList.add('hidden'); }
    if (!inGame && e.code === 'KeyM' && e.target.tagName !== 'INPUT') ui.toggleMap();
  });
  document.body.addEventListener('pointerdown', () => game.sound.init(), { once: true });
  window.__game = game;
  window.claude?.hot?.snapshot?.(() => (inGame && !game.finished ? { save: game.serialize() } : {}));
  return (data) => {
    if (data && data.save) { startGame(data.save); } else refreshShowroom();
  };
}

// Android: кнопка «Назад» и сворачивание приложения
window.__androidBack = () => {
  const open = (id) => !$(id).classList.contains('hidden');
  if (open('confirm')) { $('cfNo').click(); return 'ok'; }
  if (open('mapPanel')) { closeMap(); return 'ok'; }
  if (open('dialog')) { $('dialog').classList.add('hidden'); return 'ok'; }
  if (inGame) {
    if (open('finish')) { $('finish').classList.add('hidden'); toMenu(); return 'ok'; }
    pause(!game.paused);
    return 'ok';
  }
  return 'exit';
};
window.__androidPause = () => {
  if (inGame && !game.finished) {
    saves.put('auto', game.serialize());
    if (!game.paused) pause(true);
  }
};

const start = boot();
if (window.claude?.hot?.ready) window.claude.hot.ready(start); else start(window.claude?.hot?.data ?? {});
