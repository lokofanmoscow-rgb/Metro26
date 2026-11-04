// Интерфейс: меню, HUD, карта, сохранения.
import { Game } from './game.js';
import { MetroMap } from './ui/map.js';
import { SCHEME } from './data/scheme.js';
import { LINES, PLAYABLE, TRAINS } from './data/lines.js';
import { LIVERY } from './engine/train.js';
import { fmtTime } from './engine/util.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'metro26.saves.v1';
const SET_KEY = 'metro26.settings.v1';

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

const sel = { line: 'ln1', dir: 0, train: '717' };
let game = null;
let map = null;
let inGame = false;
let hudOn = true;
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
  stationBanner(st, tr, last) {
    const b = $('banner');
    b.classList.remove('hidden');
    const l = game.line;
    $('bLine').style.background = l.color;
    $('bLine').textContent = `${l.num} · ${l.name}`;
    $('bName').textContent = st.name;
    const parts = [];
    if (tr.length) parts.push('Переход: ' + tr.map((t) => `${t.station} (${t.line.num})`).join(', '));
    if (last) parts.push('Конечная');
    if (st.style.y) parts.push(`открыта в ${st.style.y} г.`);
    $('bTr').innerHTML = parts.join(' · ') + (st.style.info ? `<br><span style="opacity:.85">${st.style.info}</span>` : '');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.add('hidden'), 4600);
  },
  onHud(s) {
    lastHud = s;
    $('hudSpeed').textContent = Math.round(s.speed);
    $('hudLim').textContent = s.limit;
    $('hudArs').className = 'ars' + (s.overspeed ? ' over' : s.limit < 80 ? ' low' : '');
    $('hudTr1').style.width = `${s.traction * 100}%`;
    $('hudBr1').style.width = `${s.brake * 100}%`;
    const d = $('hudDoors');
    d.textContent = s.doorsClosed ? 'ДВЕРИ ЗАКРЫТЫ' : 'ДВЕРИ ОТКРЫТЫ';
    d.className = 'doors' + (s.doorsClosed ? '' : ' open');
    $('hudScore').textContent = s.score;
    $('hudTime').textContent = s.time;
    $('hudNext').textContent = s.station ? `стоянка: ${s.station}` : (s.next || '—');
    $('hudLine').textContent = s.line.num; $('hudLine').style.background = s.line.color;
    $('hudDir').textContent = `${s.line.name} → ${s.dirTo}`;
    const trs = s.station ? [] : s.nextTransfers;
    $('hudTr').innerHTML = trs.map((t) => `<span class="tr"><span class="dot" style="background:${t.line.color}"></span>${t.station}</span>`).join('');
    const st = $('hudStop');
    if (s.nearStop && s.dist != null && !s.station && s.dist > -15) {
      st.classList.remove('hidden');
      const m = s.dist;
      $('hudStopTxt').textContent = m >= 0 ? 'До остановочной отметки' : 'Проезд отметки';
      $('hudStopM').textContent = `${Math.abs(m) < 10 ? Math.abs(m).toFixed(1) : Math.round(Math.abs(m))} м`;
      $('hudStopFill').style.width = `${Math.max(0, Math.min(100, 100 - m / 4.5))}%`;
      st.classList.toggle('over', m < -0.5);
    } else st.classList.add('hidden');
    if (!$('mapPanel').classList.contains('hidden')) updateMapTrain(false);
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
    if (playable) b.onclick = () => { sel.line = l.id; renderLines(); renderDirs(); refreshShowroom(); };
    box.appendChild(b);
  }
}

function renderDirs() {
  const L = LINES[sel.line];
  const a = L.stations[0].n, b = L.stations[L.stations.length - 1].n;
  $('dirList').innerHTML = '';
  [[0, `${a} → ${b}`], [1, `${b} → ${a}`]].forEach(([d, txt]) => {
    const e = document.createElement('button');
    e.className = 'dir-btn' + (sel.dir === d ? ' sel' : '');
    e.textContent = txt;
    e.onclick = () => { sel.dir = d; renderDirs(); refreshShowroom(); };
    $('dirList').appendChild(e);
  });
  const st = L.stations;
  $('menuInfo').innerHTML = `${lineBadge(L)} <b>${L.name}</b><br>${st.length} станций · ${(st.reduce((t, s) => t + s.d, 0) / 1000).toFixed(1)} км<br><span style="color:#9aa3ad">Станции построены по описаниям оформления из Википедии: тип конструкции, облицовка стен, колонн и пола.</span>`;
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
  if (inGame) return;
  game.setup({ line: sel.line, dir: sel.dir, train: sel.train, showroom: true });
}

function toMenu() {
  inGame = false;
  game.sound.stopAll();
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
  game.settings.short = $('optShort').checked;
  withLoading(() => {
    if (loadData) {
      game.load(loadData);
      sel.line = loadData.line; sel.dir = loadData.dir; sel.train = loadData.train;
    } else game.setup({ line: sel.line, dir: sel.dir, train: sel.train });
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
  const R = L.stations;
  const to = d.dir === 0 ? R[R.length - 1].n : R[0].n;
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
    e.onclick = () => { $('dialog').classList.add('hidden'); $('optShort').checked = !!rec.data.short; startGame(rec.data); };
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
    <div class="row"><span>Чувствительность мыши</span><input type="range" id="sSens" min="0.3" max="2.5" step="0.1" value="${s.sens}"></div>`;
  body.querySelector('#sQ').value = String(s.quality);
  const apply = () => {
    hudOn = body.querySelector('#sHud').checked;
    if (inGame) $('hud').classList.toggle('hidden', !hudOn);
    game.applySettings({ volume: +body.querySelector('#sVol').value, voice: body.querySelector('#sVoice').checked, quality: +body.querySelector('#sQ').value, sens: +body.querySelector('#sSens').value });
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
function boot() {
  game = new Game($('view'), ui);
  const st = store.read(SET_KEY, null);
  if (st) { hudOn = st.hud !== false; game.applySettings(st); }
  else if (/Android|iPhone|iPad/i.test(navigator.userAgent) || window.AndroidTTS) game.applySettings({ quality: 1 });
  renderLines(); renderDirs(); renderTrains();
  $('btnStart').onclick = () => startGame();
  $('btnContinue').onclick = () => { const a = saves.all().auto; if (a) { $('optShort').checked = !!a.data.short; startGame(a.data); } };
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
    if (data && data.save) { $('optShort').checked = !!data.save.short; startGame(data.save); } else refreshShowroom();
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
