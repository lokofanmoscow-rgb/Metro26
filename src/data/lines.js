// Игровые линии: порядок станций, длины перегонов и оформление станций.
// Оформление описано по статьям русской Википедии о станциях (облицовка путевых стен,
// колонн/пилонов, пола, тип конструкции). Длины перегонов посчитаны по координатам
// станций с поправкой на кривизну трассы.
//
// Поля стиля станции:
//  t   — тип: col (колонная мелкого заложения), pylon (пилонная глубокого заложения),
//        cold (колонная трёхсводчатая глубокого заложения), vault (односводчатая),
//        span (однопролётная с плоским потолком), ground (наземная крытая),
//        bridge (на метромосту), side (наземная с боковыми платформами); open — открытая (навес)
//  deep — глубокое заложение (в перегоне круглый тоннель из тюбингов)
//  cs  — шаг колонн/пилонов, м
//  csh — форма колонн: sq, rnd, fac (гранёные), flare (раскрывающаяся капитель), tree, frame
//  c, c2 — цвет облицовки колонн/пилонов и вставок
//  w, wl, wa — путевая стена: основной цвет, цоколь, акцент; wp — рисунок стены
//  f   — [цвет пола 1, цвет пола 2], fp — рисунок пола
//  ce  — цвет потолка/свода, cp — рисунок потолка
//  l   — светильники: strip, ball, chand, cornice, niche, capital, led
//  nm  — оформление названия: metal (металлические буквы), plate (табличка), white
//  ch  — высота зала над платформой, м
//  y   — год открытия, dp — глубина, м
//  d   — расстояние до следующей станции, м

export const LINES = {
  ln1: {
    id: 'ln1',
    num: '1',
    name: 'Сокольническая линия',
    short: 'Красная',
    color: '#E42313',
    stations: [
      { n: 'Бульвар Рокоссовского', sid: 's1', d: 1570, y: 1990, dp: 8, t: 'col', cs: 6.5, csh: 'sq', c: '#e9e7e1', w: '#9ea3a8', wp: 'metal', wl: '#2b2b2b', wa: '#c9ccd0', f: ['#bdbdb8', '#7a1f1f'], fp: 'stripe', ce: '#e8e8e4', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; путевые стены — металлический геометрический орнамент' },
      { n: 'Черкизовская', sid: 's2', d: 2120, y: 1990, dp: 8, t: 'vault', c: '#e9e9e4', w: '#3b3e43', wp: 'metal', wl: '#26282b', wa: '#55595e', f: ['#8e8e8c', '#6d6d6b'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; путевые стены облицованы тёмным металлом' },
      { n: 'Преображенская площадь', sid: 's3', d: 2540, y: 1965, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#dfe4dc', c2: '#4d7a5c', w: '#c9cdd1', wp: 'panel', wl: '#4a4d50', wa: '#b5babf', f: ['#9b9b98', '#8a3a33'], fp: 'stripe', ce: '#e6e6e2', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка»: два ряда по 38 колонн с шагом 4 м' },
      { n: 'Сокольники', sid: 's4', d: 1430, y: 1935, dp: 9, t: 'col', cs: 4.5, csh: 'sq', c: '#9fabb4', w: '#e9daa2', wp: 'tile', wl: '#1e1e1e', wa: '#d8c88c', f: ['#8c8c8a', '#2a2a2a'], fp: 'check', ce: '#e4e0d2', cp: 'coffer', l: 'strip', nm: 'metal', info: 'колонны облицованы серо-голубым мрамором, путевые стены — светло-жёлтой плиткой' },
      { n: 'Красносельская', sid: 's5', d: 700, y: 1935, dp: 8, t: 'col', cs: 4.5, csh: 'fac', c: '#c9a46b', w: '#e6c95a', wp: 'tile', wl: '#a8322d', wa: '#d4b54a', f: ['#e9e6df', '#cfccc4'], fp: 'plain', ce: '#ebe6d6', cp: 'coffer', l: 'ball', nm: 'metal', info: 'гранёные колонны — крымский известняк «биюк-янкой»; стены — жёлтая и красная плитка' },
      { n: 'Комсомольская', hq: 'koms', sid: 's6', d: 1070, y: 1935, dp: 9, t: 'col', cs: 5, csh: 'sq', c: '#d9b25c', c2: '#8a6a2a', w: '#ebdca6', wp: 'tile', wl: '#5a4a32', wa: '#d9c78f', f: ['#8f8f8c', '#8f3a32'], fp: 'check', ce: '#efe9d8', cp: 'coffer', l: 'chand', nm: 'metal', ch: 6.5, info: 'двухъярусный зал с балконами; колонны — золотисто-жёлтый мрамор «чоргунь» с эмблемой КИМ' },
      { n: 'Красные Ворота', hq: 'kv', sid: 's7', d: 900, y: 1935, dp: 33, t: 'pylon', deep: true, cs: 9, c: '#8e3b2e', c2: '#bdb9b0', w: '#c9b9a8', wp: 'marble', wl: '#6e2a22', wa: '#a65a48', f: ['#9a9a96', '#3a3a3a'], fp: 'check', ce: '#ece8de', cp: 'flat', l: 'ball', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; пилоны — красно-бурый мрамор «старая шроша»' },
      { n: 'Чистые пруды', sid: 's8', d: 1010, y: 1935, dp: 35, t: 'pylon', deep: true, cs: 9, c: '#dedad1', c2: '#93938f', w: '#cfcdc8', wp: 'marble', wl: '#1f1f1f', wa: '#b4b2ad', f: ['#8e8e8c', '#c49a91'], fp: 'check', ce: '#edebe5', cp: 'flat', l: 'cornice', nm: 'metal', info: 'спаренные пилоны из уральского мрамора «коелга» и дымчатого «уфалей»' },
      { n: 'Лубянка', sid: 's9', d: 730, y: 1935, dp: 33, t: 'pylon', deep: true, cs: 7, c: '#a9a9a6', c2: '#1d1d1d', w: '#b8b7b3', wp: 'marble', wl: '#1d1d1d', wa: '#8e8d89', f: ['#8a8a88', '#4a4a48'], fp: 'stripe', ce: '#e2e1dc', cp: 'rings', l: 'ball', nm: 'metal', info: 'двухсводчатая глубокого заложения; свод расчленён поперечными кольцами, мрамор «уфалей»' },
      { n: 'Охотный Ряд', sid: 's10', d: 890, y: 1935, dp: 15, t: 'pylon', deep: true, cs: 8, c: '#dcdcd8', c2: '#8f8f8c', w: '#e3e0d8', wp: 'marble', wl: '#3a3a38', wa: '#cfcbc0', f: ['#8c8c8a', '#6e6e6c'], fp: 'plain', ce: '#eeece6', cp: 'flat', l: 'ball', nm: 'plate', info: 'пилоны в виде сдвоенных многогранных колонн из белого и серого мрамора' },
      { n: 'Библиотека имени Ленина', sid: 's11', d: 940, y: 1935, dp: 12, t: 'vault', c: '#d8b866', w: '#e2c96e', wp: 'tile', wl: '#7a6330', wa: '#d8b866', f: ['#8e8e8b', '#76766f'], fp: 'plain', ce: '#efe9d6', cp: 'coffer', l: 'ball', nm: 'metal', info: 'односводчатая мелкого заложения; свод с кессонами, стены — жёлтая плитка и мрамор' },
      { n: 'Кропоткинская', hq: 'krop', sid: 's12', d: 1230, y: 1935, dp: 13, t: 'col', cs: 6, csh: 'flare', c: '#e7e5e0', w: '#e2e0da', wp: 'marble', wl: '#9a9893', wa: '#d4d1ca', f: ['#c4958b', '#8f8f8c'], fp: 'check', ce: '#efeee9', cp: 'flat', l: 'capital', nm: 'metal', info: 'десятигранные колонны с раскрывающимися капителями, в которых спрятаны светильники' },
      { n: 'Парк культуры', sid: 's13', d: 1550, y: 1935, dp: 10, t: 'col', cs: 4.5, csh: 'sq', c: '#c4a36e', w: '#ecebe6', wp: 'tile', wl: '#8a3a2e', wa: '#d8d6cf', f: ['#2b2b2b', '#3a3a3a'], fp: 'plain', ce: '#e9e6dc', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонны — крымский жёлто-коричневый известняк, пол — чёрный гранит' },
      { n: 'Фрунзенская', sid: 's14', d: 1060, y: 1957, dp: 42, t: 'pylon', deep: true, cs: 9, c: '#8a2f2a', c2: '#ece9e2', w: '#e9dfc4', wp: 'tile', wl: '#1e1e1e', wa: '#d9cfb2', f: ['#2a2a2a', '#7c2c27'], fp: 'check', ce: '#efebe0', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилоны — красный мрамор с поясками из белого мрамора, решётки со звёздами' },
      { n: 'Спортивная', sid: 's15', d: 1550, y: 1957, dp: 34, t: 'pylon', deep: true, cs: 9, c: '#ebe9e4', c2: '#3f6b4f', w: '#f0efea', wp: 'tile', wl: '#1e1e1e', wa: '#dcdad4', f: ['#2b2b2b', '#8f3a32'], fp: 'border', ce: '#eceae3', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилоны из белого мрамора с бордюром из зелёного мрамора, хрустальные светильники' },
      { n: 'Воробьёвы горы', sid: 's16', d: 2790, y: 1959, dp: 0, t: 'bridge', c: '#e8e8e4', c2: '#3b7a5a', w: '#9fc7c0', wp: 'glass', wl: '#5b6b6a', wa: '#3b7a5a', f: ['#8f8f8c', '#7a7a78'], fp: 'plain', ce: '#d9dcdc', cp: 'flat', l: 'strip', nm: 'plate', info: 'на нижнем ярусе Лужнецкого метромоста, через стеклянные стены видна Москва-река' },
      { n: 'Университет', sid: 's17', d: 2550, y: 1959, dp: 26, t: 'pylon', deep: true, cs: 9, c: '#e2dfd7', c2: '#b9b4a8', w: '#e3cf7c', wp: 'tile', wl: '#1e1e1e', wa: '#d1bd6a', f: ['#8e8e8c', '#c49a91'], fp: 'check', ce: '#efece4', cp: 'flat', l: 'cornice', nm: 'metal', info: 'массивные пилоны из светлого мрамора — переход от «сталинского» стиля к «хрущёвскому»' },
      { n: 'Проспект Вернадского', sid: 's18', d: 2230, y: 1963, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#ece6d6', w: '#d9e3ec', wp: 'stripes', wl: '#1e1e1e', wa: '#e3c95a', f: ['#8e8e8c', '#2b2b2b'], fp: 'stripe', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка»; путевые стены — жёлтая, белая и голубая плитка' },
      { n: 'Юго-Западная', sid: 's19', d: 2220, y: 1963, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#eeede8', w: '#3fa3a3', wp: 'panel', wl: '#1e1e1e', wa: '#57b8b5', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка»; путевые стены — бирюзовые композитные панели' },
      { n: 'Тропарёво', sid: 's196', d: 2560, y: 2014, dp: 12, t: 'vault', c: '#c4c8cc', csh: 'tree', w: '#dcdcd8', wp: 'panel', wl: '#5e6266', wa: '#b0b4b8', f: ['#9a9a98', '#6a6a68'], fp: 'stripe', ce: '#e8e8e8', cp: 'flat', l: 'led', nm: 'plate', info: 'односводчатая; по оси зала — металлические «деревья» в память о Тропарёвском лесопарке' },
      { n: 'Румянцево', sid: 's199', d: 1720, y: 2016, dp: 12, t: 'col', cs: 6, csh: 'frame', c: '#f2f2f2', c2: '#151515', w: '#f2f2f0', wp: 'mondrian', wl: '#151515', wa: '#d42a2a', f: ['#cfcfcc', '#3a3a3a'], fp: 'stripe', ce: '#f0f0ee', cp: 'flat', l: 'led', nm: 'plate', info: 'путевые стены в духе картин Мондриана, чёрно-белые колонны, красные скамейки' },
      { n: 'Саларьево', sid: 's200', d: 2860, y: 2016, dp: 12, t: 'col', cs: 6, csh: 'frame', c: '#d6d0c6', c2: '#6f6a62', w: '#b0643a', wp: 'squares', wl: '#5a3a26', wa: '#c98a5c', f: ['#c9c2b6', '#8c857a'], fp: 'check', ce: '#d7d3cc', cp: 'grid', l: 'led', nm: 'plate', info: 'каркасная станция: квадраты на стенах, потолке и полу; оранжево-коричневые панели' },
      { n: 'Филатов Луг', sid: 's260', d: 2370, y: 2019, dp: 0, t: 'ground', c: '#f4f4f2', c2: '#f2c53d', w: '#bcd8e0', wp: 'glass', wl: '#e9e9e6', wa: '#f2c53d', f: ['#d9d9d6', '#bdbdba'], fp: 'plain', ce: '#f4f4f2', cp: 'arch', l: 'led', nm: 'plate', info: 'наземная крытая станция в стиле старинных вокзалов: стеклянные стены, белые арки, жёлтые акценты' },
      { n: 'Прокшино', sid: 's261', d: 2580, y: 2019, dp: 0, t: 'ground', c: '#f4f4f2', c2: '#d42a2a', w: '#bcd8e0', wp: 'glass', wl: '#e9e9e6', wa: '#d42a2a', f: ['#d9d9d6', '#bdbdba'], fp: 'plain', ce: '#f4f4f2', cp: 'arch', l: 'led', nm: 'plate', info: 'наземная крытая станция со стеклянными стенами; красные элементы' },
      { n: 'Ольховая', sid: 's262', d: 1240, y: 2019, dp: 12, t: 'span', c: '#f2f0ea', w: '#f3f1ea', wp: 'origami', wl: '#e8862a', wa: '#f2c53d', f: ['#c9c6bf', '#a9a69f'], fp: 'stripe', ce: '#f5f3ee', cp: 'origami', l: 'led', nm: 'plate', info: 'однопролётная; оформление в стиле оригами — белый, жёлтый и оранжевый' },
      { n: 'Новомосковская', hq: 'novomosk', sid: 's263', d: 1800, y: 2019, dp: 15, t: 'col', cs: 7, csh: 'rnd', c: '#dcdcd8', w: '#9b1b30', wp: 'panel', wl: '#3a3a3a', wa: '#b5283f', f: ['#bdb6a8', '#8e8e8c'], fp: 'stripe', ce: '#e6e3dc', cp: 'flat', l: 'led', nm: 'plate', info: 'путевые стены — рубиново-красные металлокерамические панели' },
      { n: 'Потапово', sid: 's444', d: 0, y: 2024, dp: 15, t: 'col', cs: 7, csh: 'rnd', c: '#e4e4e0', w: '#5f7f74', wp: 'panel', wl: '#2e3a36', wa: '#86a89c', f: ['#c2c0b9', '#8e8e8c'], fp: 'stripe', ce: '#e9e9e6', cp: 'flat', l: 'led', nm: 'plate', info: 'конечная станция, открыта в 2024 году' },
    ],
    // открытые участки: osm — участок с реальной осью и окружением, привязанный к станции anchor
    outdoor: [
      // Лужнецкий метромост с крытой галереей; ось и окружение — по данным OpenStreetMap
      // Преображенский метромост через Яузу
      { osm: 'preo', rev: false, anchor: 'Преображенская площадь', kind: 'open', portal: 0, rise: 0 },
      { osm: 'luzh', rev: true, anchor: 'Воробьёвы горы', kind: 'bridge' },
      // наземный короб-тоннель Саларьево — Филатов Луг — Прокшино — Ольховая (по схеме путевого развития)
      { osm: 'sal', rev: false, anchor: 'Филатов Луг', kind: 'gallery', portal: 0, rise: 0 },
    ],
  },

  ln2: {
    id: 'ln2',
    num: '2',
    name: 'Замоскворецкая линия',
    short: 'Зелёная',
    color: '#4BAF4F',
    stations: [
      { n: 'Ховрино', sid: 's243', d: 1470, y: 2017, dp: 12, t: 'col', cs: 7, csh: 'rnd', c: '#ecebe7', w: '#dfe3e6', wp: 'panel', wl: '#4a4d50', wa: '#4BAF4F', f: ['#bdbdba', '#8e8e8c'], fp: 'stripe', ce: '#ecebe7', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения, открыта в 2017 году' },
      { n: 'Беломорская', sid: 's254', d: 1280, y: 2018, dp: 12, t: 'col', cs: 7, csh: 'sq', c: '#f1f0ec', w: '#f1f0ec', wp: 'marble', wl: '#3a3a3a', wa: '#3d6fa8', f: ['#9a9a96', '#5a5a58'], fp: 'check', ce: '#efeee9', cp: 'flat', l: 'led', nm: 'metal', info: 'колонны и стены облицованы белым полоцким мрамором; панно с видами Валаама' },
      { n: 'Речной вокзал', sid: 's20', d: 1850, y: 1964, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#e9e8e2', w: '#eef0ee', wp: 'stripes', wl: '#1e1e1e', wa: '#5b8fc2', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка»: два ряда по 40 колонн с шагом 4 м' },
      { n: 'Водный стадион', sid: 's21', d: 2470, y: 1964, dp: 6, t: 'col', cs: 4, csh: 'sq', c: '#a9a9a6', w: '#f0efea', wp: 'tile', wl: '#1e1e1e', wa: '#dcdbd6', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонны — серый полосчатый мрамор, путевые стены — белая керамическая плитка' },
      { n: 'Войковская', sid: 's22', d: 2020, y: 1964, dp: 7, t: 'col', cs: 4, csh: 'sq', c: '#e9e8e2', w: '#7fa6c8', wp: 'stripes', wl: '#1e1e1e', wa: '#1e1e1e', f: ['#a6a6a2', '#1e1e1e'], fp: 'check', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: 'путевые стены — голубая и чёрная плитка; пол — яйцевский гранит и габбро' },
      { n: 'Сокол', sid: 's23', d: 1230, y: 1938, dp: 10, t: 'col', cs: 7.4, csh: 'flare', c: '#e6dccb', w: '#e6dcc4', wp: 'tile', wl: '#7a6a56', wa: '#cbbd9e', f: ['#8e8e8c', '#c9bba0'], fp: 'check', ce: '#ece6d8', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная двухпролётная: два свода опираются на средний ряд колонн' },
      { n: 'Аэропорт', sid: 's24', d: 2060, y: 1938, dp: 10, t: 'vault', c: '#efe9dc', w: '#efe5cf', wp: 'marble', wl: '#7a5a46', wa: '#c9a46b', f: ['#a6413a', '#8e8e8c'], fp: 'check', ce: '#efeadf', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая; свод с рёбрами напоминает каркас дирижабля' },
      { n: 'Динамо', sid: 's25', d: 2230, y: 1938, dp: 40, t: 'pylon', deep: true, cs: 9, c: '#c9b6a0', c2: '#5a5050', w: '#e9e2d0', wp: 'tile', wl: '#4a3a30', wa: '#b8a080', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#ece8de', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилоны облицованы мрамором «уфалей» с фарфоровыми медальонами на спортивные темы' },
      { n: 'Белорусская', sid: 's26', d: 1210, y: 1938, dp: 33, t: 'pylon', deep: true, cs: 9, c: '#f0efea', c2: '#bdb9b0', w: '#efede6', wp: 'marble', wl: '#3a3a3a', wa: '#c9c4b8', f: ['#8f3a32', '#2a2a2a'], fp: 'check', ce: '#efede8', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилоны из белого мрамора; пол выложен белорусским орнаментом' },
      { n: 'Маяковская', sid: 's27', d: 770, y: 1938, dp: 33, t: 'cold', deep: true, cs: 6, csh: 'rnd', c: '#b8b9bb', c2: '#c97b84', w: '#d8c8bd', wp: 'marble', wl: '#7a3a3a', wa: '#c97b84', f: ['#f0efea', '#7a4a4a'], fp: 'check', ce: '#f0ebe0', cp: 'coffer', l: 'niche', nm: 'metal', info: 'колонны из нержавеющей стали и родонита; в овальных куполах свода — мозаики Дейнеки' },
      { n: 'Тверская', sid: 's28', d: 1190, y: 1979, dp: 42, t: 'pylon', deep: true, cs: 8, c: '#d9d8d4', c2: '#8a8a86', w: '#d9d8d4', wp: 'marble', wl: '#3a3a38', wa: '#a6a6a2', f: ['#8f3a32', '#6e2a24'], fp: 'stripe', ce: '#e6e5e0', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая (42 м); светло-серый мрамор, пол из красного гранита' },
      { n: 'Театральная', sid: 's29', d: 1900, y: 1938, dp: 35, t: 'pylon', deep: true, cs: 9, c: '#efe6d6', c2: '#b98c4a', w: '#efe6d6', wp: 'marble', wl: '#7a5a46', wa: '#c9a46b', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#efe9dc', cp: 'coffer', l: 'cornice', nm: 'metal', info: 'фарфоровые барельефы танцоров в национальных костюмах на пилонах' },
      { n: 'Новокузнецкая', sid: 's30', d: 1440, y: 1943, dp: 38, t: 'pylon', deep: true, cs: 9, c: '#d8cdbd', c2: '#8a7a6a', w: '#e6dcc8', wp: 'marble', wl: '#5a4a3a', wa: '#b8a080', f: ['#8e8e8c', '#c9bba0'], fp: 'check', ce: '#ece6d8', cp: 'coffer', l: 'chand', nm: 'metal', info: 'массивные пилоны из прохоро-баландинского мрамора, мозаики на своде' },
      { n: 'Павелецкая', sid: 's31', d: 3020, y: 1943, dp: 33, t: 'cold', deep: true, cs: 6, csh: 'fac', c: '#ece9e1', c2: '#c9a46b', w: '#efede6', wp: 'marble', wl: '#4a3a30', wa: '#c9a46b', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#efebe2', cp: 'coffer', l: 'chand', nm: 'metal', info: 'колонная трёхсводчатая, перестроена из пилонной в 1950-х' },
      { n: 'Автозаводская', sid: 's32', d: 1470, y: 1943, dp: 11, t: 'col', cs: 6.5, csh: 'fac', c: '#d8c2b0', w: '#e4dacb', wp: 'marble', wl: '#5a4a3a', wa: '#b8a080', f: ['#8e8e8c', '#8f3a32'], fp: 'check', ce: '#ece6d8', cp: 'coffer', l: 'chand', nm: 'metal', ch: 6.2, info: 'высокий колонный зал; мозаики на тему Великой Отечественной войны' },
      { n: 'Технопарк', hq: 'tech', sid: 's198', d: 1980, y: 2015, dp: 0, t: 'side', c: '#b9bec2', c2: '#7b3fa3', w: '#c9cdd1', wp: 'panel', wl: '#8c8f92', wa: '#7b3fa3', f: ['#a3a39f', '#8e8e8c'], fp: 'plain', ce: '#5d6166', cp: 'flat', l: 'led', nm: 'plate', info: 'наземная крытая станция с двумя боковыми платформами; решётчатый потолок с фиолетовыми вставками, пешеходный мост над путями' },
      { n: 'Коломенская', hq: 'kolom', sid: 's33', d: 2800, y: 1969, dp: 9, t: 'col', cs: 4, csh: 'fac', c: '#e8e6e0', w: '#efeee9', wp: 'inserts', wl: '#2a2a2a', wa: '#9a9a96', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка» с восьмигранными колоннами' },
      { n: 'Каширская', sid: 's34', d: 2260, y: 1969, dp: 7, t: 'col', cs: 4, csh: 'sq', c: '#cfcfcc', w: '#e9e9e6', wp: 'tile', wl: '#3a3a38', wa: '#4BAF4F', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: 'двухзальная колонная станция мелкого заложения' },
      { n: 'Кантемировская', sid: 's35', d: 1840, y: 1984, dp: 8, t: 'vault', c: '#e6e1d6', w: '#8a5a42', wp: 'marble', wl: '#3a2a22', wa: '#c9a46b', f: ['#2a2a2a', '#8f3a32'], fp: 'check', ce: '#ece8df', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая; коричневый мрамор с орнаментальными вставками военно-исторической темы' },
      { n: 'Царицыно', sid: 's36', d: 1940, y: 1984, dp: 8, t: 'col', cs: 6.5, csh: 'sq', c: '#eceae4', w: '#d9b25c', wp: 'marble', wl: '#8f3a32', wa: '#b0472f', f: ['#8e8e8c', '#8f3a32'], fp: 'stripe', ce: '#ece8df', cp: 'rib', l: 'strip', nm: 'metal', info: 'путевые стены — жёлтый и красный мрамор с мозаичными вставками' },
      { n: 'Орехово', sid: 's37', d: 1650, y: 1984, dp: 9, t: 'col', cs: 6.5, csh: 'sq', c: '#efefea', w: '#e6e6e1', wp: 'marble', wl: '#6e6e6c', wa: '#b4b4ae', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'niche', nm: 'metal', info: 'белый и серый мрамор; светильники в кессонах потолка' },
      { n: 'Домодедовская', sid: 's38', d: 1690, y: 1985, dp: 9, t: 'col', cs: 6.5, csh: 'sq', c: '#e6e6e2', w: '#b9b9b4', wp: 'marble', wl: '#3a3a3a', wa: '#b87333', f: ['#3a3a3a', '#8e8e8c'], fp: 'check', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'серый полосатый мрамор; медные панно с летящими самолётами' },
      { n: 'Красногвардейская', sid: 's39', d: 2570, y: 1985, dp: 9, t: 'vault', c: '#e9e4da', w: '#8f3a32', wp: 'marble', wl: '#4a2a22', wa: '#b0472f', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#efebe3', cp: 'coffer', l: 'niche', nm: 'metal', info: 'односводчатая с кессонированным сводом; путевые стены — красный мрамор' },
      { n: 'Алма-Атинская', sid: 's187', d: 0, y: 2012, dp: 9, t: 'vault', c: '#d6d6d2', w: '#8e8f90', wp: 'panel', wl: '#3a3a3a', wa: '#c4282b', f: ['#d9d9d6', '#5a5a58'], fp: 'check', ce: '#e9e9e6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая; серый гранит, граница свода отмечена красной линией' },
    ],
    // открытый участок Автозаводская — Технопарк — Нагатинский метромост — Коломенская (OpenStreetMap)
    outdoor: [
      { osm: 'nag', rev: false, anchor: 'Технопарк', kind: 'open' },
    ],
  },

  ln3: {
    id: 'ln3',
    num: '3',
    name: 'Арбатско-Покровская линия',
    short: 'Синяя',
    color: '#0071B9',
    stations: [
      { n: 'Пятницкое шоссе', sid: 's188', d: 1440, y: 2012, dp: 12, t: 'col', cs: 7, csh: 'rnd', c: '#e9e4da', w: '#d8d2c6', wp: 'marble', wl: '#3a3a3a', wa: '#0071B9', f: ['#bdbab2', '#7a7a78'], fp: 'stripe', ce: '#d9dde0', cp: 'cells', l: 'led', nm: 'metal', info: 'колонная двухпролётная мелкого заложения; потолок из ячеистых алюминиевых панелей' },
      { n: 'Митино', sid: 's40', d: 1720, y: 2009, dp: 12, t: 'vault', c: '#e9e4d8', w: '#d9cfbd', wp: 'marble', wl: '#4a4036', wa: '#b8a888', f: ['#a6a39c', '#5a5a58'], fp: 'check', ce: '#ece8de', cp: 'coffer', l: 'niche', nm: 'metal', info: 'односводчатая; ниши свода с мелкими кессонами подсвечены прожекторами' },
      { n: 'Волоколамская', sid: 's41', d: 1180, y: 2009, dp: 12, t: 'col', cs: 9, csh: 'flare', c: '#d6d1c6', w: '#cfc9bc', wp: 'marble', wl: '#4a4a48', wa: '#9a958a', f: ['#bdbab2', '#5a5a58'], fp: 'check', ce: '#e8e4da', cp: 'arch', l: 'led', nm: 'metal', ch: 6.8, info: 'трёхсводчатая с аркадами высотой 8 м — «неоготическая» композиция' },
      { n: 'Мякинино', sid: 's42', d: 3010, y: 2009, dp: 0, t: 'side', c: '#c9ccd0', c2: '#2f6fa8', w: '#d9dcdf', wp: 'panel', wl: '#8c8f92', wa: '#2f6fa8', f: ['#a3a39f', '#8e8e8c'], fp: 'plain', ce: '#6b6f74', cp: 'flat', l: 'led', nm: 'plate', info: 'наземная крытая станция с двумя береговыми платформами, встроена в комплекс «Крокус Сити»' },
      { n: 'Строгино', sid: 's43', d: 6470, y: 2008, dp: 10, t: 'vault', c: '#e8e8e4', w: '#e6e6e2', wp: 'marble', wl: '#3a3a3a', wa: '#9ea3a8', f: ['#a6a6a2', '#3a3a3a'], fp: 'stripe', ce: '#e4e6e8', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения, белый мрамор' },
      { n: 'Крылатское', sid: 's44', d: 1940, y: 1989, dp: 9, t: 'vault', c: '#e8e6e0', w: '#e4e2dc', wp: 'marble', wl: '#6e6e6c', wa: '#b4b4ae', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'plate', info: 'односводчатая с асимметричным сводом; название — в центре зала' },
      { n: 'Молодёжная', sid: 's45', d: 2230, y: 1965, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#e9e8e2', w: '#e9ece8', wp: 'tile', wl: '#1e1e1e', wa: '#c9cdd1', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка» 1965 года' },
      { n: 'Кунцевская', sid: 's46', d: 1620, y: 1965, dp: 0, t: 'ground', open: true, c: '#efefea', w: '#cfd2d4', wp: 'panel', wl: '#5a5a58', wa: '#0071B9', f: ['#a6a6a2', '#7a7a78'], fp: 'plain', ce: '#d9d9d6', cp: 'flat', l: 'strip', nm: 'plate', info: 'наземная открытая станция; навес на колоннах, облицованных белым мрамором' },
      { n: 'Славянский бульвар', sid: 's47', d: 3080, y: 2008, dp: 12, t: 'vault', c: '#e6e2d8', w: '#2f5e4a', wp: 'marble', wl: '#1e2a24', wa: '#b8b8b4', f: ['#c9c2b6', '#5a5a58'], fp: 'check', ce: '#ece8de', cp: 'coffer', l: 'niche', nm: 'plate', info: 'кессонированный свод с коваными орнаментами из листьев; стены — зелёный мрамор «Верде Гватемала»' },
      { n: 'Парк Победы', sid: 's48', d: 3290, y: 2003, dp: 84, t: 'pylon', deep: true, cs: 9, c: '#8a5a42', c2: '#c9b8a0', w: '#c9b8a0', wp: 'marble', wl: '#4a2e22', wa: '#8a5a42', f: ['#8e8e8c', '#6e2a24'], fp: 'check', ce: '#ece6da', cp: 'flat', l: 'cornice', nm: 'metal', info: 'самая глубокая станция Москвы (84 м); панно об Отечественной войне 1812 года' },
      { n: 'Киевская', sid: 's49', d: 1190, y: 1953, dp: 30, t: 'pylon', deep: true, cs: 9, c: '#d6d6d2', c2: '#b8862e', w: '#d6d6d2', wp: 'marble', wl: '#4a4a48', wa: '#b8862e', f: ['#8e8e8c', '#6e6e6c'], fp: 'stripe', ce: '#efe9dc', cp: 'coffer', l: 'chand', nm: 'metal', info: 'мрамор «коелга», керамический фриз с украинскими орнаментами' },
      { n: 'Смоленская', sid: 's50', d: 1660, y: 1953, dp: 50, t: 'pylon', deep: true, cs: 9, c: '#efeee9', c2: '#b8b4aa', w: '#efeee9', wp: 'marble', wl: '#1e1e1e', wa: '#8f3a32', f: ['#1e1e1e', '#efefea'], fp: 'border', ce: '#efede6', cp: 'coffer', l: 'chand', nm: 'metal', info: 'пилоны из белого мрамора с полуколоннами; чёрный мраморный пол с орнаментом' },
      { n: 'Арбатская', sid: 's51', d: 1140, y: 1953, dp: 41, t: 'pylon', deep: true, cs: 9, c: '#9a4a3a', c2: '#d9c8a6', w: '#e8dcc8', wp: 'marble', wl: '#5a2a22', wa: '#b8862e', f: ['#8e8e8c', '#8f3a32'], fp: 'check', ce: '#f0e8d6', cp: 'coffer', l: 'chand', nm: 'metal', info: 'длинный зал с лепным сводом, люстрами и пилонами из красного мрамора' },
      { n: 'Площадь Революции', sid: 's52', d: 2570, y: 1938, dp: 34, t: 'pylon', deep: true, cs: 9, c: '#8e3b2e', c2: '#b08d57', w: '#d9b8a0', wp: 'marble', wl: '#4a2a22', wa: '#b08d57', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#ece4d4', cp: 'flat', l: 'cornice', nm: 'metal', info: 'арки из красного и жёлтого мрамора, 76 бронзовых скульптур Манизера' },
      { n: 'Курская', sid: 's53', d: 1920, y: 1938, dp: 30, t: 'pylon', deep: true, cs: 9, c: '#e8e2d6', c2: '#a6a29a', w: '#e8e2d6', wp: 'marble', wl: '#3a3a3a', wa: '#b8b4aa', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#efebe2', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения' },
      { n: 'Бауманская', sid: 's54', d: 1880, y: 1944, dp: 32, t: 'pylon', deep: true, cs: 9, c: '#e2ddd2', c2: '#8f3a32', w: '#e2ddd2', wp: 'marble', wl: '#3a3a3a', wa: '#8f3a32', f: ['#8e8e8c', '#8f3a32'], fp: 'check', ce: '#ece8de', cp: 'flat', l: 'cornice', nm: 'metal', info: 'бронзовые скульптуры защитников Родины и вставки из красного шокшинского кварцита' },
      { n: 'Электрозаводская', sid: 's55', d: 1110, y: 1944, dp: 30, t: 'pylon', deep: true, cs: 9, c: '#e6dfcf', c2: '#a69a80', w: '#e6dfcf', wp: 'marble', wl: '#4a4036', wa: '#b8a888', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#f0ebe0', cp: 'coffer', l: 'niche', nm: 'metal', info: 'свод с рядами круглых светильников в нишах; прохоро-баландинский мрамор' },
      { n: 'Семёновская', sid: 's56', d: 1970, y: 1944, dp: 47, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#e6e2d8', c2: '#8a6a4a', w: '#e6e2d8', wp: 'marble', wl: '#4a4036', wa: '#a69a80', f: ['#8e8e8c', '#6e6e6c'], fp: 'check', ce: '#ece8de', cp: 'coffer', l: 'chand', nm: 'metal', info: 'колонная трёхсводчатая: каждый пилон заменён четырьмя колоннами из мрамора «коелга»' },
      { n: 'Партизанская', sid: 's57', d: 1950, y: 1944, dp: 10, t: 'col', cs: 4.5, csh: 'fac', c: '#e9e0cf', w: '#e6dcc8', wp: 'marble', wl: '#5a4a3a', wa: '#b8a080', f: ['#8e8e8c', '#8f3a32'], fp: 'check', ce: '#ece6d8', cp: 'coffer', l: 'chand', nm: 'metal', info: 'трёхпутная станция со скульптурами партизан' },
      { n: 'Измайловская', sid: 's58', d: 1740, y: 1961, dp: 0, t: 'ground', open: true, c: '#e9e8e2', w: '#cfd2d4', wp: 'panel', wl: '#5a5a58', wa: '#0071B9', f: ['#a6a6a2', '#7a7a78'], fp: 'plain', ce: '#d9d9d6', cp: 'flat', l: 'strip', nm: 'plate', info: 'наземная открытая станция в Измайловском парке; навес на 25 колоннах в один ряд' },
      { n: 'Первомайская', sid: 's59', d: 1640, y: 1961, dp: 8, t: 'col', cs: 4, csh: 'flare', c: '#b0584a', w: '#f0efea', wp: 'tile', wl: '#1e1e1e', wa: '#dcdbd6', f: ['#8e8e8c', '#8f3a32'], fp: 'check', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонны из красного мрамора «салиэти», путевые стены — белая и чёрная плитка' },
      { n: 'Щёлковская', sid: 's60', d: 0, y: 1963, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#e9e8e2', w: '#e8eef2', wp: 'tile', wl: '#1e1e1e', wa: '#3d6fa8', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка»: два ряда по 40 колонн с шагом 4 м' },
    ],
    // открытые участки по схеме путевого развития: метромост и «Мякинино», «Кунцевская», «Измайловская»
    outdoor: [
      { osm: 'myak', rev: true, anchor: 'Мякинино', kind: 'open', portal: 0, rise: 0 },
      { osm: 'kunc', rev: false, anchor: 'Кунцевская', kind: 'open', portal: 0 },
      { osm: 'izm', rev: false, anchor: 'Измайловская', kind: 'open', rise: 0 },
    ],
  },

  ln4: {
    id: 'ln4',
    num: '4',
    name: 'Филёвская линия',
    short: 'Голубая',
    color: '#1DBBEE',
    // длины перегонов — по оси путей OpenStreetMap (без округления); короткие перегоны в центре
    exactD: true,
    minSpan: 440,
    stations: [
      { n: 'Александровский сад', sid: 's73', d: 450, y: 1935, dp: 7.4, t: 'col', cs: 4, csh: 'fac', c: '#d8a99b', w: '#efece4', wp: 'marble', wl: '#c99484', wa: '#e3c3b6', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#efeee9', cp: 'flat', l: 'strip', nm: 'metal', ch: 4.6, info: 'колонная четырёхпролётная мелкого заложения 1935 года; стены и колонны — розовый мрамор, восьмигранные колонны' },
      { n: 'Арбатская', sid: 's72', d: 1200, y: 1935, dp: 8, t: 'col', cs: 4.5, csh: 'fac', c: '#e2c4a2', w: '#efe3c6', wp: 'tile', wl: '#8a5a44', wa: '#e8d8b4', f: ['#9a4a3a', '#86402f'], fp: 'plain', ce: '#ece8dc', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонны — жёлто-розовый мраморовидный известняк, пол — красная метлахская плитка, путевые стены — кремовая плитка' },
      { n: 'Смоленская', sid: 's71', d: 1346, y: 1935, dp: 9.2, t: 'col', cs: 4.5, csh: 'sq', c: '#a9aaa8', w: '#e4d7b9', wp: 'tile', wl: '#8e8e8c', wa: '#d9ccae', f: ['#c49a8c', '#b48a7c'], fp: 'plain', ce: '#ece9e0', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонны — серый мрамор, пол — розовый гранит; путевые стены — бежевая шестигранная плитка вверху и серая внизу' },
      { n: 'Киевская', sid: 's70', d: 1220, y: 1937, dp: 7, t: 'col', cs: 4.5, csh: 'rnd', c: '#e8e0c6', c2: '#c9a25a', w: '#efe7d0', wp: 'tile', wl: '#8f3a32', wa: '#e2d6b4', f: ['#8e8e8c', '#b88a80'], fp: 'border', ce: '#efe9dc', cp: 'coffer', l: 'chand', nm: 'metal', info: 'круглые колонны из мрамора «газган» с капителями-колосьями; пол — серый и розовый гранит с украинским орнаментом' },
      { n: 'Студенческая', sid: 's67', d: 1092, y: 1958, dp: 0, t: 'side', open: true, c: '#c9ccc8', c2: '#2f7fb8', w: '#dcdcd6', wp: 'panel', wl: '#8c8f92', wa: '#1DBBEE', f: ['#a6a6a2', '#8e8e8c'], fp: 'plain', ce: '#d6d6d2', cp: 'flat', l: 'strip', nm: 'plate', info: 'наземная открытая с двумя боковыми платформами; на стенах — панно об учёбе и образовании' },
      { n: 'Кутузовская', sid: 's66', d: 1588, y: 1958, dp: 0, t: 'side', open: true, c: '#c9ccc8', c2: '#8a3a2e', w: '#dcdcd6', wp: 'panel', wl: '#8c8f92', wa: '#1DBBEE', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#d6d6d2', cp: 'flat', l: 'strip', nm: 'plate', info: 'наземная открытая с боковыми платформами под Можайским путепроводом Кутузовского проспекта' },
      { n: 'Фили', sid: 's65', d: 1442, y: 1959, dp: 0, t: 'side', open: true, c: '#c9ccc8', c2: '#3d6fa8', w: '#dcdcd6', wp: 'panel', wl: '#8c8f92', wa: '#1DBBEE', f: ['#a6a6a2', '#8e8e8c'], fp: 'plain', ce: '#d6d6d2', cp: 'flat', l: 'strip', nm: 'plate', info: 'наземная открытая с боковыми платформами; поезд въезжает на неё из тоннеля; витражное остекление стен' },
      { n: 'Багратионовская', sid: 's64', d: 1014, y: 1961, dp: 0, t: 'ground', open: true, c: '#a8aaa8', w: '#cfd2d4', wp: 'panel', wl: '#5a5a58', wa: '#1DBBEE', f: ['#7a7a78', '#6e6e6c'], fp: 'plain', ce: '#d9d9d6', cp: 'rib', l: 'strip', nm: 'plate', info: 'наземная открытая с островной платформой под эстакадой улицы Барклая; колонны — серый мрамор' },
      { n: 'Филёвский парк', sid: 's63', d: 1091, y: 1961, dp: 0, t: 'ground', open: true, c: '#d2d3d0', w: '#cfd2d4', wp: 'panel', wl: '#5a5a58', wa: '#1DBBEE', f: ['#7a7a78', '#6e6e6c'], fp: 'plain', ce: '#d9d9d6', cp: 'rib', l: 'strip', nm: 'plate', info: 'наземная открытая с островной платформой под эстакадой Минской улицы; колонны — светло-серый мрамор' },
      { n: 'Пионерская', sid: 's62', d: 1452, y: 1961, dp: 0, t: 'ground', open: true, c: '#ecebe6', w: '#cfd2d4', wp: 'panel', wl: '#5a5a58', wa: '#1DBBEE', f: ['#7a7a78', '#6e6e6c'], fp: 'plain', ce: '#d9d9d6', cp: 'rib', l: 'strip', nm: 'plate', info: 'наземная открытая с островной платформой; колонны эстакады — белый мрамор' },
      { n: 'Кунцевская', sid: 's61', d: 0, y: 1965, dp: 0, t: 'ground', open: true, c: '#efefea', w: '#cfd2d4', wp: 'panel', wl: '#5a5a58', wa: '#1DBBEE', f: ['#a6a6a2', '#7a7a78'], fp: 'plain', ce: '#d9d9d6', cp: 'flat', l: 'strip', nm: 'plate', info: 'наземная открытая станция, общая с Арбатско-Покровской линией' },
      // ответвление от «Киевской» (см. branch)
      { n: 'Деловой центр', sid: 's69', d: 496, y: 2005, dp: 25, t: 'cold', deep: true, cs: 7.8, csh: 'sq', c: '#e8e8e4', c2: '#3a3a3a', w: '#d9d9d6', wp: 'panel', wl: '#3a3a3a', wa: '#9ea3a8', f: ['#bdbdba', '#5a5a58'], fp: 'stripe', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная глубокого заложения (бывшая «Выставочная»)' },
      { n: 'Москва-Сити', sid: 's68', d: 0, y: 2006, dp: 25, t: 'pylon', deep: true, cs: 7.8, c: '#ecebe6', c2: '#c9ccd0', w: '#cfd2d4', wp: 'panel', wl: '#5a3a2e', wa: '#9ea3a8', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#e9e9e5', cp: 'flat', l: 'led', nm: 'plate', info: 'пилонная трёхсводчатая; пилоны — белый мрамор «Бьянка Карара», торцы — шлифованная сталь, путевые стены — алюминиевые панели (бывшая «Международная»)' },
    ],
    // вилочное движение: за «Киевской» линия делится на основной ход (к «Кунцевской») и ответвление
    branch: { at: 'Киевская', d: 2393, names: ['Деловой центр', 'Москва-Сити'] },
    // открытые участки по OpenStreetMap: Смоленский метромост; Киевская — Студенческая — Кутузовская;
    // между тоннелями под железной дорогой; Фили — Багратионовская — Филёвский парк — Пионерская — Кунцевская
    outdoor: [
      { osm: 'fsmol', rev: false, anchor: 'Смоленская', kind: 'open', portal: 0, rise: 0, portalBuilding: true },
      { osm: 'fstud', rev: true, anchor: 'Студенческая', kind: 'open', portal: [0, 6.5] },
      { osm: 'fkut', rev: true, anchor: 'Кутузовская', kind: 'open' },
      { osm: 'ffili', rev: false, anchor: 'Фили', kind: 'open', portal: [0, 0] },
    ],
  },

  ln6: {
    id: 'ln6',
    num: '6',
    name: 'Калужско-Рижская линия',
    short: 'Оранжевая',
    color: '#EF7E24',
    stations: [
      { n: 'Медведково', sid: 's109', d: 2130, y: 1978, dp: 8, t: 'col', cs: 6.5, csh: 'sq', c: '#e2c8b4', c2: '#c9ccd0', w: '#8c3a32', wp: 'pyramid', wl: '#7a7a78', wa: '#c7a46a', f: ['#2a2a2a', '#8e8e8c'], fp: 'check', ce: '#e7e4dd', cp: 'rib', l: 'strip', nm: 'metal', info: 'стены — красный мрамор и алюминиевые «пирамидки», символизирующие ледяные глыбы' },
      { n: 'Бабушкинская', hq: 'babush', sid: 's108', d: 1860, y: 1978, dp: 10, t: 'vault', c: '#e4e1da', w: '#e4e1da', wp: 'marble', wl: '#2a2a2a', wa: '#c8c4ba', f: ['#2a2a2a', '#8e8e8c'], fp: 'stripe', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; светильники в пазах эллиптического свода' },
      { n: 'Свиблово', sid: 's107', d: 1550, y: 1978, dp: 8, t: 'col', cs: 6.5, csh: 'sq', c: '#e6e3dc', c2: '#c9a24a', w: '#e7e5e0', wp: 'frieze', wl: '#2a2a2a', wa: '#3d6fa8', f: ['#2a2a2a', '#8e8e8c'], fp: 'check', ce: '#e9e7e1', cp: 'flat', l: 'strip', nm: 'metal', info: 'мрамор «коелга»; на путевых стенах — фриз из 48 мозаик с городами России' },
      { n: 'Ботанический сад', sid: 's106', d: 2710, y: 1978, dp: 7, t: 'col', cs: 6.5, csh: 'sq', c: '#eeece6', w: '#eeece6', wp: 'marble', wl: '#3a3a3a', wa: '#7aa05a', f: ['#9a9a96', '#2a2a2a'], fp: 'check', ce: '#c9a24a', cp: 'gold', l: 'strip', nm: 'metal', info: 'белый мрамор; потолок из ячеистых секций анодированного «под золото» алюминия' },
      { n: 'ВДНХ', sid: 's105', d: 1740, y: 1958, dp: 53, t: 'pylon', deep: true, cs: 9, c: '#e4e2dc', c2: '#3d6b4a', w: '#e8e0c6', wp: 'tile', wl: '#1e1e1e', wa: '#d6cdb0', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#eeece6', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая (53,5 м); шестирожковые хрустальные люстры, зелёные грани пилонов' },
      { n: 'Алексеевская', sid: 's104', d: 1830, y: 1958, dp: 51, t: 'pylon', deep: true, cs: 8, c: '#f0efe9', c2: '#2f4f3f', w: '#ebe7dc', wp: 'tile', wl: '#1e1e1e', wa: '#d9d4c6', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#f0efe9', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилоны облицованы мрамором «коелга» со вставками тёмно-зелёного серпентинита' },
      { n: 'Рижская', sid: 's103', d: 1410, y: 1958, dp: 46, t: 'pylon', deep: true, cs: 9, c: '#e8cf55', c2: '#6e3226', w: '#e8c84c', wp: 'tile', wl: '#1e1e1e', wa: '#d4b23c', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#efeadb', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилоны — балтийская керамика лимонно-жёлтого и бордово-коричневого цветов, «янтарь»' },
      { n: 'Проспект Мира', sid: 's102', d: 930, y: 1958, dp: 50, t: 'pylon', deep: true, cs: 9, c: '#eeece6', c2: '#bdb9ae', w: '#efe6cf', wp: 'stripes5', wl: '#1e1e1e', wa: '#1e1e1e', f: ['#6e6e6c', '#9a9a96'], fp: 'stripe', ce: '#efece4', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилоны из белого мрамора расширяются кверху; стены — плитка цвета слоновой кости с чёрными полосами' },
      { n: 'Сухаревская', sid: 's101', d: 920, y: 1972, dp: 43, t: 'pylon', deep: true, cs: 8, c: '#e6d6a6', c2: '#c8b27a', w: '#e9e6df', wp: 'marble', wl: '#6d5a48', wa: '#b38b45', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#efece4', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилоны из мрамора «газган» стилизованы под перевязанные снопы' },
      { n: 'Тургеневская', sid: 's100', d: 1270, y: 1972, dp: 49, t: 'pylon', deep: true, cs: 8, c: '#e8e6e0', c2: '#6d5a48', w: '#e8e6e0', wp: 'marble', wl: '#6d5a48', wa: '#b38b45', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#efede8', cp: 'flat', l: 'cornice', nm: 'metal', info: 'мрамор «коелга», латунные чеканные панно на путевых стенах' },
      { n: 'Китай-город', sid: 's99', d: 1790, y: 1971, dp: 29, t: 'cold', deep: true, cs: 5, c: '#cdc7b8', c2: '#b5b5b5', w: '#d6cfbe', wp: 'marble', wl: '#e9e6df', wa: '#9a9a9a', f: ['#d9cfb8', '#b9ae96'], fp: 'plain', ce: '#ece8de', cp: 'flat', l: 'cornice', nm: 'metal', info: 'колонная трёхсводчатая; чеканные алюминиевые карнизы с «пирамидками»' },
      { n: 'Третьяковская', sid: 's98', d: 1630, y: 1971, dp: 46, t: 'pylon', deep: true, cs: 8, c: '#a8a8a4', c2: '#8a6a3a', w: '#d7b3a8', wp: 'marble', wl: '#4a4a48', wa: '#8a6a3a', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e6e4de', cp: 'flat', l: 'capital', nm: 'metal', info: 'пилоны из серого мрамора, бронзовые портреты русских художников' },
      { n: 'Октябрьская', sid: 's97', d: 1420, y: 1962, dp: 50, t: 'pylon', deep: true, cs: 9, c: '#cfcfcc', c2: '#a6a6a2', w: '#f0efea', wp: 'tile', wl: '#1e1e1e', wa: '#dcdbd6', f: ['#8f3a32', '#8e8e8c'], fp: 'stripe', ce: '#efefeb', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилоны — светло-серый мрамор, светильники в карнизах' },
      { n: 'Шаболовская', sid: 's96', d: 1950, y: 1980, dp: 46, t: 'pylon', deep: true, cs: 8, c: '#e6e4de', c2: '#8f3a32', w: '#b9bdc2', wp: 'corr', wl: '#4a4d50', wa: '#9ea3a8', f: ['#8e8e8c', '#8f3a32'], fp: 'stripe', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилоны — мрамор «коелга», путевые стены — гофрированный алюминий' },
      { n: 'Ленинский проспект', sid: 's95', d: 2510, y: 1962, dp: 16, t: 'col', cs: 4, csh: 'sq', c: '#ece4cf', w: '#e3d6bc', wp: 'marble', wl: '#4a3e30', wa: '#d2c4a6', f: ['#8e8e8c', '#7a5a46'], fp: 'stripe', ce: '#ebe8e0', cp: 'rib', l: 'strip', nm: 'metal', info: '80 колонн с шагом 4 м, облицованных белым и желтоватым мрамором' },
      { n: 'Академическая', sid: 's94', d: 1360, y: 1962, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#e9e7e0', w: '#e9eef2', wp: 'stripes', wl: '#1e1e1e', wa: '#5b8fc2', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка»; путевые стены — белая, голубая и чёрная плитка' },
      { n: 'Профсоюзная', sid: 's93', d: 1080, y: 1962, dp: 7, t: 'col', cs: 4, csh: 'sq', c: '#a9a7a3', w: '#d8d2c4', wp: 'rhomb', wl: '#3a3a38', wa: '#b9b2a2', f: ['#8f3a32', '#8e8e8c'], fp: 'check', ce: '#e7e6e1', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонны — серый мрамор с прожилками, стены — ромбовидная плитка' },
      { n: 'Новые Черёмушки', sid: 's92', d: 1820, y: 1962, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#e4d7b5', w: '#e0782d', wp: 'stripes2', wl: '#1e1e1e', wa: '#6b3e22', f: ['#8e8e8c', '#8f3a32'], fp: 'check', ce: '#e9e7e1', cp: 'rib', l: 'strip', nm: 'metal', info: 'путевые стены — оранжевая плитка с двумя коричневыми полосами' },
      { n: 'Калужская', sid: 's91', d: 1960, y: 1974, dp: 10, t: 'col', cs: 6.5, csh: 'sq', c: '#d4a49a', w: '#eeeeea', wp: 'inserts', wl: '#3a3a38', wa: '#9a9a96', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#ebeae6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонны — розовый байкальский мрамор, стены — белая плитка с металлическими вставками' },
      { n: 'Беляево', sid: 's90', d: 1220, y: 1974, dp: 12, t: 'col', cs: 6.5, csh: 'sq', c: '#eeede8', w: '#efe5cc', wp: 'inserts', wl: '#3a3a38', wa: '#a8885a', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#ebeae6', cp: 'rib', l: 'strip', nm: 'metal', info: 'стены — светло-кремовая плитка с металлическими вставками по мотивам русских сказок' },
      { n: 'Коньково', sid: 's89', d: 1880, y: 1987, dp: 8, t: 'vault', c: '#d7d2c4', w: '#d7d2c4', wp: 'marble', wl: '#5a4a3a', wa: '#a8885a', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#ebe9e3', cp: 'rib', l: 'niche', nm: 'plate', info: 'односводчатая; название станции расположено в центре зала' },
      { n: 'Тёплый Стан', sid: 's88', d: 2280, y: 1987, dp: 8, t: 'col', cs: 6.5, csh: 'sq', c: '#eeede8', w: '#8f4a33', wp: 'bigtile', wl: '#2a2a2a', wa: '#a85a3f', f: ['#8e8e8c', '#2a2a2a'], fp: 'check', ce: '#e9e7e1', cp: 'rib', l: 'niche', nm: 'metal', info: 'путевые стены — красно-коричневая керамическая плитка большого размера' },
      { n: 'Ясенево', sid: 's87', d: 1540, y: 1990, dp: 8, t: 'col', cs: 6.5, csh: 'rnd', c: '#a9b8a0', w: '#b4b85a', wp: 'cells', wl: '#3a3a38', wa: '#cfd27a', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#e7e7e1', cp: 'rib', l: 'strip', nm: 'metal', info: 'цилиндрические колонны из зеленоватого мрамора, ячеистая металлическая плитка' },
      { n: 'Новоясеневская', sid: 's86', d: 0, y: 1990, dp: 7, t: 'col', cs: 6, csh: 'sq', c: '#d7a9a0', w: '#2f5e45', wp: 'cells', wl: '#1e1e1e', wa: '#4a7e62', f: ['#8e8e8c', '#7a7a78'], fp: 'plain', ce: '#e7e7e1', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонны — розовый мрамор, стены — тёмно-зелёная ячеистая металлическая плитка' },
    ],
    outdoor: [],
  },

  ln5: {
    id: 'ln5',
    num: '5',
    name: 'Кольцевая линия',
    short: 'Кольцевая',
    color: '#925233',
    exactD: true,
    minSpan: 600,
    ring: true,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Комсомольская', sid: 's81', d: 2009, y: 1952, dp: 37, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#e8e0c6', w: '#ddcfb4', wp: 'marble', wl: '#3a3a3a', wa: '#925233', f: ['#9a3a32', '#6e6e6c'], fp: 'plain', ce: '#c9a24a', cp: 'flat', l: 'chand', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; колонны украшены мраморными капителями и отделаны светлым узбекским мрамором «газган», как и стены станции.' },
      { n: 'Курская', sid: 's80', d: 1796, y: 1950, dp: 40, t: 'cold', deep: true, cs: 6, csh: 'rnd', c: '#9a3a32', c2: '#efe3c6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#925233', f: ['#2a2a2a', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'chand', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; эти колонны — круглые, каннелированные, облицованные сургучно-красным мрамором, и квадратные, облицованные светло-кремовым мрамором.' },
      { n: 'Таганская', sid: 's79', d: 1337, y: 1950, dp: 53, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#e8e0c6', c2: '#9a3a32', w: '#ebe9e3', wp: 'marble', wl: '#ebe9e3', wa: '#925233', f: ['#a9a9a6', '#2a2a2a'], fp: 'plain', ce: '#3d6fa8', cp: 'coffer', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; колонны и стены кассового зала снизу отделаны светлым мрамором прохоро-баландинского и газганского месторождений, пол — плитами красного гранита с полосами чёрного диабаз' },
      { n: 'Павелецкая', sid: 's78', d: 938, y: 1950, dp: 40, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#e8e6e0', c2: '#7a5a46', w: '#e8e6e0', wp: 'marble', wl: '#3a3a3a', wa: '#925233', f: ['#2a2a2a', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; массивные кубические пилоны облицованы светлым мрамором «коелга» и коричневым мрамором; по углам они украшены декоративными трёхчетвертными колоннами светлого мрамора с к' },
      { n: 'Добрынинская', sid: 's77', d: 966, y: 1950, dp: 35.5, t: 'pylon', deep: true, cs: 9, csh: 'rnd', c: '#ebe9e3', w: '#a9a9a6', wp: 'marble', wl: '#a9a9a6', wa: '#925233', f: ['#2a2a2a', '#9a3a32'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; между проёмами в каждой паре расположены круглые беломраморные колонны коринфского ордера.' },
      { n: 'Октябрьская', sid: 's76', d: 1315, y: 1950, dp: 40, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#b8bcc0', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#925233', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; 3 января 2010 года был закрыт на реконструкцию вестибюль станции.' },
      { n: 'Парк культуры', sid: 's75', d: 1993, y: 1950, dp: 40, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#925233', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения' },
      { n: 'Киевская', sid: 's74', d: 2117, y: 1954, dp: 53, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', c2: '#e8e6e0', w: '#ebe9e3', wp: 'marble', wl: '#ebe9e3', wa: '#925233', f: ['#ebe9e3', '#e8e6e0'], fp: 'plain', ce: '#ebe9e3', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; цоколи пилонов и путевые стены облицованы белым коелгинским мрамором, пол выложен серым гранитом с красной каймой.' },
      { n: 'Краснопресненская', sid: 's85', d: 1759, y: 1954, dp: 35.5, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#9a3a32', w: '#ebe9e3', wp: 'marble', wl: '#ebe9e3', wa: '#925233', f: ['#ebe9e3', '#6e6e6c'], fp: 'plain', ce: '#9a3a32', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; === станция === «краснопресненская» — трёхсводчатая пилонная станция глубокого заложения (глубина — 35,5 метра).' },
      { n: 'Белорусская', sid: 's84', d: 1303, y: 1952, dp: 42.5, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', w: '#ebe9e3', wp: 'tile', wl: '#3a3a3a', wa: '#925233', f: ['#9a3a32', '#2a2a2a'], fp: 'plain', ce: '#ebe9e3', cp: 'coffer', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; свод опирается на шесть декоративных колонн, отделанных белым мрамором, с дорическими капителями.' },
      { n: 'Новослободская', sid: 's83', d: 1784, y: 1952, dp: 40, t: 'pylon', deep: true, cs: 9, csh: 'rnd', c: '#b8bcc0', w: '#a9a9a6', wp: 'marble', wl: '#3a3a3a', wa: '#925233', f: ['#ebe9e3', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; крайние колонны квадратные, остальные круглые.' },
      { n: 'Проспект Мира', sid: 's82', d: 1802, y: 1952, dp: 40, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#efe3c6', w: '#9a3a32', wp: 'marble', wl: '#3a3a3a', wa: '#925233', f: ['#a9a9a6', '#2a2a2a'], fp: 'check', ce: '#ecebe6', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; массивные кубические пилоны с неширокими карнизами облицованы кремовым мрамором.' },
    ],
    outdoor: [],
  },
  ln7: {
    id: 'ln7',
    num: '7',
    name: 'Таганско-Краснопресненская линия',
    short: 'Фиолетовая',
    color: '#943F90',
    exactD: true,
    minSpan: 600,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Планерная', sid: 's128', d: 1124, y: 1975, dp: 6, t: 'col', cs: 6.5, csh: 'sq', c: '#ebe9e3', c2: '#e8e6e0', w: '#ebe9e3', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ebe9e3', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; свод станции поддерживают 26 пар квадратных колонн шириной 0,6 м, облицованных белым мрамором «коелга».' },
      { n: 'Сходненская', sid: 's127', d: 2669, y: 1975, dp: 6, t: 'vault', cs: 6.5, csh: 'sq', c: '#d9a99b', w: '#d9a99b', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ebe9e3', cp: 'coffer', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; путевые стены облицованы розоватым мрамором «слюдянка», украшены геометрическим рисунком из алюминиевого литья.' },
      { n: 'Тушинская', sid: 's126', d: 911, y: 1975, dp: 10.5, t: 'col', cs: 6.5, csh: 'sq', c: '#a9a9a6', c2: '#9a3a32', w: '#e8e6e0', wp: 'marble', wl: '#e8e6e0', wa: '#943F90', f: ['#a9a9a6', '#9a3a32'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; в центральной части платформы пол выложен «жежелевским» серым гранитом, под рядами колонн — «капустянским» красно-коричневым.' },
      { n: 'Спартак', sid: 's195', d: 2262, y: 2014, dp: 10, t: 'col', cs: 8, csh: 'sq', c: '#ebe9e3', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#9a3a32', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; колонны облицованы белым мрамором.' },
      { n: 'Щукинская', sid: 's125', d: 2461, y: 1975, dp: 13, t: 'col', cs: 6.5, csh: 'sq', c: '#a9a9a6', c2: '#e8e0c6', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#d9a99b'], fp: 'stripe', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; на станции — 38 пар железобетонных колонн с шагом 4 м, отделанных серо-жёлтым мрамором «газган» и украшенных алюминиевыми вставками.' },
      { n: 'Октябрьское Поле', sid: 's124', d: 2621, y: 1972, dp: 9, t: 'col', cs: 6.5, csh: 'sq', c: '#e8e0c6', c2: '#d9a99b', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#943F90', f: ['#e8e0c6', '#d9a99b'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; пол выложен светлым газганским мрамором, вдоль колонн проложена дорожка из розового мрамора буровщина.' },
      { n: 'Полежаевская', sid: 's123', d: 1797, y: 1972, dp: 10, t: 'col', cs: 6.5, csh: 'fac', c: '#ebe9e3', c2: '#e3cf7a', w: '#ebe9e3', wp: 'tile', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; восьмигранные колонны станционного зала располагаются по центру каждой платформы и покрыты белым и жёлтым волнистым мрамором различных оттенков, а путевые стены облицован' },
      { n: 'Беговая', sid: 's122', d: 1409, y: 1972, dp: 9, t: 'col', cs: 6.5, csh: 'sq', c: '#ebe9e3', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#943F90', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; путевые стены сейчас облицованы большими прямоугольными плитами белого мрамора сорта коелга.' },
      { n: 'Улица 1905 года', sid: 's121', d: 1252, y: 1972, dp: 11, t: 'col', cs: 6.5, csh: 'sq', c: '#d9a99b', w: '#c9c9c6', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; покрытие колонн — розовый мрамор «буровщина» различных тонов.' },
      { n: 'Баррикадная', sid: 's120', d: 1974, y: 1972, dp: 30, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#d9a99b', w: '#a9a9a6', wp: 'marble', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#9a3a32'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; массивные, трапециевидные в профиле, расширяющиеся кверху пилоны отделаны розовым мрамором «буровщина».' },
      { n: 'Пушкинская', sid: 's119', d: 1285, y: 1975, dp: 51, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#e8e6e0', w: '#e8e6e0', wp: 'marble', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'chand', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; колонны, торцевые и путевые стены — мрамором «коелга».' },
      { n: 'Кузнецкий Мост', sid: 's118', d: 741, y: 1975, dp: 39.5, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#b8bcc0', w: '#ebe9e3', wp: 'panel', wl: '#ebe9e3', wa: '#943F90', f: ['#d9a99b', '#2a2a2a'], fp: 'stripe', ce: '#b8bcc0', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; свод опирается на стальные колонны через фасонные клинчатые перемычки.' },
      { n: 'Китай-город', sid: 's117', d: 2129, y: 1971, dp: 29, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#c3c6c9', c2: '#a9a9a6', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#efe3c6'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; станции обязаны своим художественным оформлением (чеканные карнизы из алюминия, находящиеся над колоннами, металлические вставки на путевых стенах с изображением зажжённо' },
      { n: 'Таганская', sid: 's116', d: 1396, y: 1966, dp: 36, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#ebe9e3', c2: '#7a5a46', w: '#ebe9e3', wp: 'tile', wl: '#3a3a3a', wa: '#943F90', f: ['#9a3a32', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'глубокого заложения; пилоны станции облицованы белым мрамором и украшены двумя бордюрами из коричневого мрамора.' },
      { n: 'Пролетарская', sid: 's115', d: 1525, y: 1966, dp: 9, t: 'col', cs: 4, csh: 'sq', c: '#ebe9e3', c2: '#e3cf7a', w: '#ebe9e3', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'мелкого заложения; колонны станции облицованы белым мрамором; их верхние части окаймлены полосой жёлтого цвета и расширяются, имитируя капители.' },
      { n: 'Волгоградский проспект', sid: 's114', d: 3365, y: 1966, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#ebe9e3', w: '#ebe9e3', wp: 'tile', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; колонны облицованы белым мрамором.' },
      { n: 'Текстильщики', sid: 's113', d: 2182, y: 1966, dp: 13, t: 'col', cs: 4, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#943F90', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'мелкого заложения; станция «текстильщики» — колонная трёхпролётная мелкого заложения (глубина — 13 метров).' },
      { n: 'Кузьминки', sid: 's112', d: 2447, y: 1966, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#ebe9e3', c2: '#a9a9a6', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#ebe9e3', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'мелкого заложения; колонны станции облицованы белым мрамором, а пол выложен серым и красным гранитом.' },
      { n: 'Рязанский проспект', sid: 's111', d: 1890, y: 1966, dp: 6, t: 'col', cs: 4, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'tile', wl: '#3a3a3a', wa: '#943F90', f: ['#a9a9a6', '#d9a99b'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; колонны облицованы серо-голубым волнистым мрамором.' },
      { n: 'Выхино', sid: 's110', d: 2649, y: 1966, dp: 0, t: 'side', open: true, cs: 4, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#943F90', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'niche', nm: 'metal', info: 'наземная открытая; станция сооружена из стандартных железобетонных конструкций по специальному проекту.' },
      { n: 'Лермонтовский проспект', sid: 's190', d: 2054, y: 2013, dp: 12, t: 'vault', cs: 8, csh: 'sq', c: '#e3cf7a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'односводчатая мелкого заложения; архитектурный проект станции был подготовлен архитекторами л.' },
      { n: 'Жулебино', sid: 's189', d: 1583, y: 2013, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#9a3a32', c2: '#4f7a5a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; поэтому и цветовая гамма станционного зала варьируется: по направлению к центру москвы цвет колонн — красно-оранжевый, а по направлению из центра — зелёный; колонны посте' },
      { n: 'Котельники', sid: 's197', d: 0, y: 2015, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#4f7a5a', c2: '#ebe9e3', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#943F90', f: ['#9a3a32', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; стоит также заметить, что с 2010 по 2013 годы для станции использовался проект, ранее распределённый под «жулебино», — зелёно-голубой цвет стен и белые v-образные колонны' },
    ],
    outdoor: [
      { osm: 'tkuz', rev: false, anchor: 'Текстильщики', kind: 'open' },
      { osm: 'vykh', rev: true, anchor: 'Выхино', kind: 'open' },
    ],
  },
  ln8: {
    id: 'ln8',
    num: '8',
    name: 'Калининско-Солнцевская линия',
    short: 'Жёлтая',
    color: '#FFCD1E',
    exactD: true,
    minSpan: 600,
    parts: [['Новокосино', 'Новогиреево', 'Перово', 'Шоссе Энтузиастов', 'Авиамоторная', 'Площадь Ильича', 'Марксистская', 'Третьяковская'],
      ['Деловой центр', 'Парк Победы', 'Минская', 'Ломоносовский проспект', 'Раменки', 'Мичуринский проспект', 'Озёрная', 'Говорово', 'Солнцево', 'Боровское шоссе', 'Новопеределкино', 'Рассказовка', 'Пыхтино', 'Аэропорт Внуково']],
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Новокосино', sid: 's129', d: 3177, y: 2012, dp: 9, t: 'vault', cs: 8, csh: 'sq', c: '#b8bcc0', w: '#6e6e6c', wp: 'panel', wl: '#6e6e6c', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#6e6e6c', cp: 'coffer', l: 'niche', nm: 'plate', info: 'односводчатая мелкого заложения; путевая стена представляет собой высокий цоколь у основания свода, облицованный перфорированными тёмно-серыми панелями с шумопоглощающим слоем, с отделкой из тёмного гран' },
      { n: 'Новогиреево', sid: 's130', d: 1965, y: 1979, dp: 9, t: 'col', cs: 6.5, csh: 'sq', c: '#a9a9a6', w: '#a9a9a6', wp: 'marble', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#9a3a32', '#7a5a46'], fp: 'stripe', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; путевые стены отделаны светлым мрамором в верхней части и серо-голубым мрамором «уфалей» в нижней части, на них также размещён цветной фриз.' },
      { n: 'Перово', sid: 's131', d: 3019, y: 1979, dp: 9, t: 'vault', cs: 6.5, csh: 'sq', c: '#4f7a5a', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#7a5a46', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; путевые стены облицованы: вверху — белым мрамором, снизу — чёрным габбро.' },
      { n: 'Шоссе Энтузиастов', sid: 's132', d: 1929, y: 1979, dp: 53, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#e8e0c6', c2: '#e3cf7a', w: '#9a3a32', wp: 'marble', wl: '#9a3a32', wa: '#FFCD1E', f: ['#9a3a32', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; массивные пилоны станции облицованы газганским мрамором различных оттенков, их цвет меняется по длине станции от глухой стены в торце до выхода в город от светло-жёлтого' },
      { n: 'Авиамоторная', sid: 's133', d: 2386, y: 1979, dp: 53, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#e8e6e0', w: '#e8e6e0', wp: 'marble', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#c9a24a', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; колонны и путевые стены облицованы светлым мрамором «коелга».' },
      { n: 'Площадь Ильича', sid: 's134', d: 2041, y: 1979, dp: 46, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#9a3a32', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#a9a9a6', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; пилоны станции облицованы красным мрамором «салиети».' },
      { n: 'Марксистская', sid: 's135', d: 1639, y: 1979, dp: 60, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#9a3a32', w: '#e8e0c6', wp: 'marble', wl: '#e8e0c6', wa: '#FFCD1E', f: ['#a9a9a6', '#9a3a32'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; колонны станции облицованы красным мрамором «буровщина».' },
      { n: 'Третьяковская', sid: 's136', d: 0, y: 1971, dp: 46, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#a9a9a6', c2: '#a9a9a6', w: '#a9a9a6', wp: 'marble', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#a9a9a6', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; пилоны и путевые стены южного зала отделаны серым мрамором, пол выложен серым гранитом.' },
      { n: 'Деловой центр', sid: 's193', d: 2456, y: 2014, dp: 30, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная глубокого заложения' },
      { n: 'Парк Победы', sid: 's194', d: 2668, y: 2003, dp: 73, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', c2: '#7a5a46', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения (два зала); расцветка двух залов «зеркальна» — в одном из них белые пилоны и коричневые путевые стены, в другом — наоборот.' },
      { n: 'Минская', sid: 's240', d: 3054, y: 2000, dp: 15, t: 'col', cs: 6.5, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонная двухпролётная станция мелкого заложения.' },
      { n: 'Ломоносовский проспект', sid: 's241', d: 1532, y: 2017, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#a9a9a6', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#a9a9a6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; на потолке, путевых стенах и обращённых к ним гранях колонн предложены многослойные металлические панели с ячеистым заполнением и шлифованной поверхностью нейтрального се' },
      { n: 'Раменки', sid: 's242', d: 1343, y: 2017, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#a9a9a6', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#a9a9a6', cp: 'flat', l: 'led', nm: 'plate', info: 'мелкого заложения; на потолке, путевых стенах и обращённых к ним гранях колонн расположены многослойные металлические панели с ячеистым заполнением и шлифованной поверхностью нейтрального с' },
      { n: 'Мичуринский проспект', sid: 's247', d: 3008, y: 2018, dp: 12, t: 'col', cs: 8, csh: 'sq', c: '#c3c6c9', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения полуподземная; колонная трёхпролётная станция мелкого заложения.' },
      { n: 'Озёрная', sid: 's248', d: 2504, y: 2018, dp: 25, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#a9a9a6', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#a9a9a6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; на потолке, путевых стенах и обращённых к ним гранях колонн размещены многослойные металлические панели с ячеистым заполнением и шлифованной поверхностью нейтрального сер' },
      { n: 'Говорово', sid: 's249', d: 2119, y: 2018, dp: 14, t: 'col', cs: 8, csh: 'sq', c: '#2a2a2a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#a9a9a6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; точечно светятся чёрные колонны, где свет спрятан за перфорированными каменными плитами.' },
      { n: 'Солнцево', sid: 's250', d: 1541, y: 2018, dp: 13, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонная двухпролётная станция мелкого заложения.' },
      { n: 'Боровское шоссе', sid: 's251', d: 1311, y: 2018, dp: 20, t: 'col', cs: 8, csh: 'sq', c: '#e0782d', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонная двухпролётная станция мелкого заложения.' },
      { n: 'Новопеределкино', sid: 's252', d: 1493, y: 2018, dp: 16, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#b8bcc0', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; thumb|визуализация кассового зала, стадия технического проекта thumb|аксонометрическая схема сводов кассового зала: каркас и перфорированные модули thumb|монтаж сводов ка' },
      { n: 'Рассказовка', sid: 's253', d: 2740, y: 2018, dp: 12, t: 'col', cs: 8, csh: 'sq', c: '#6e6e6c', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#6e6e6c', '#ebe9e3'], fp: 'check', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонная двухпролётная станция мелкого заложения с одной островной платформой.' },
      { n: 'Пыхтино', sid: 's439', d: 2297, y: 2023, dp: 12, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'полуподземная; в июне 2020 года был утверждён проект станции, по которому из-за сложного рельефа одна путевая стена будет глухой — на ней разместится хронологическая лента с чертежами с' },
      { n: 'Аэропорт Внуково', sid: 's440', d: 0, y: 2023, dp: 12, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#FFCD1E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; «мы решили продолжить архитектурную концепцию терминала и завершить композицию уникального транспортного узла „внуково“.' },
    ],
    outdoor: [
      { osm: 'pykh', rev: false, anchor: 'Пыхтино', kind: 'open', portal: 0, rise: 0 },
    ],
  },
  ln9: {
    id: 'ln9',
    num: '9',
    name: 'Серпуховско-Тимирязевская линия',
    short: 'Серая',
    color: '#ADACAC',
    exactD: true,
    minSpan: 600,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Алтуфьево', sid: 's161', d: 1971, y: 1994, dp: 9, t: 'vault', cs: 6.5, csh: 'sq', c: '#2a2a2a', w: '#2a2a2a', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#2a2a2a', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; путевые стены облицованы чёрным мрамором, пол выложен чёрным и серым гранитом.' },
      { n: 'Бибирево', sid: 's160', d: 2534, y: 1992, dp: 9.5, t: 'col', cs: 6.5, csh: 'sq', c: '#ebe9e3', c2: '#a9a9a6', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#6e6e6c', '#9a3a32'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; путевые стены и колонны облицованы белым мрамором, снизу и сверху окаймлены серым уфалейским мрамором.' },
      { n: 'Отрадное', sid: 's159', d: 2004, y: 1991, dp: 9, t: 'vault', cs: 6.5, csh: 'sq', c: '#2a2a2a', w: '#2a2a2a', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#2a2a2a', '#6e6e6c'], fp: 'plain', ce: '#2a2a2a', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; свод выполнен из монолитного железобетона, пол выложен тёмным гранитом, путевые стены отделаны чёрным мрамором.' },
      { n: 'Владыкино', sid: 's158', d: 1708, y: 1991, dp: 10.5, t: 'col', cs: 6.5, csh: 'sq', c: '#c9a24a', c2: '#ebe9e3', w: '#7a5a46', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; * венеция — церковь сан-джорджо маджоре * япония — замок мацумото * индия — мавзолей тадж-махал * владыкино — храм рождества богородицы * кижи — часовня михаила архангела' },
      { n: 'Петровско-Разумовская', sid: 's157', d: 1989, y: 1991, dp: 61, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#ebe9e3', c2: '#a9a9a6', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; колонны и путевые стены облицованы белым и серым мрамором, а также датолит-волластонитовым геденбергитовым скарном.' },
      { n: 'Тимирязевская', sid: 's156', d: 1217, y: 1991, dp: 63.5, t: 'vault', deep: true, cs: 6.5, csh: 'sq', c: '#e3cf7a', w: '#e3cf7a', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая глубокого заложения; путевые стены отделаны жёлто-серым мрамором «газан» и продольной полосой из чёрного камня.' },
      { n: 'Дмитровская', sid: 's155', d: 1632, y: 1991, dp: 59, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#9a3a32', w: '#9a3a32', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#9a3a32', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; в отделке путевых стен и станционного зала использован красный мрамор.' },
      { n: 'Савёловская', sid: 's154', d: 1555, y: 1988, dp: 52, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'chand', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; пилоны отделаны светлым мрамором и рассечены узкими прорезями, выложенными серым крупнозернистым гранитом.' },
      { n: 'Менделеевская', sid: 's153', d: 1691, y: 1988, dp: 48.5, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#ebe9e3', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#ebe9e3', '#e8e6e0'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; в отделке станционного зала использован белый мрамор «коелга», пол выложен серым и чёрным гранитом.' },
      { n: 'Цветной бульвар', sid: 's152', d: 876, y: 1988, dp: 50, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#e3cf7a', w: '#e3cf7a', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; путевые стены мрамором жёлто-коричневых тонов.' },
      { n: 'Чеховская', sid: 's151', d: 1605, y: 1987, dp: 62, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; пилоны облицованы белым мрамором, путевые стены украшены мозаичными панно по мотивам произведений а.' },
      { n: 'Боровицкая', sid: 's150', d: 1581, y: 1986, dp: 46.5, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', c2: '#e8e6e0', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; колонны и часть стен вестибюля облицованы белым мрамором коелгинского месторождения.' },
      { n: 'Полянка', sid: 's149', d: 1238, y: 1986, dp: 36.5, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#c9c9c6', w: '#c9c9c6', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; путевые стены и пилоны облицованы мрамором светло-серых оттенков.' },
      { n: 'Серпуховская', sid: 's148', d: 2198, y: 1983, dp: 43, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', c2: '#e8e0c6', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; путевые стены станции облицованы белым мрамором, пилоны — мрамором «газган» тёплых тонов с металлическими вставками.' },
      { n: 'Тульская', sid: 's147', d: 3064, y: 1983, dp: 9.5, t: 'vault', cs: 6.5, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; односводчатая мелкого заложения (глубина — 9,5 метра).' },
      { n: 'Нагатинская', sid: 's146', d: 1454, y: 1983, dp: 13.5, t: 'col', cs: 6.5, csh: 'rnd', c: '#ebe9e3', c2: '#e8e6e0', w: '#9a3a32', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; необычные для метростанций круглые белые колонны собраны из отдельных сегментов самого мягкого и легкообрабатываемого мрамора «коелга».' },
      { n: 'Нагорная', sid: 's145', d: 1081, y: 1983, dp: 9, t: 'col', cs: 6.5, csh: 'sq', c: '#c3c6c9', c2: '#e8e0c6', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; колонны облицованы анодированным алюминием и тёмным мрамором «садахло», путевые стены — мрамором «газган» светло-коричневых тонов.' },
      { n: 'Нахимовский проспект', sid: 's144', d: 1225, y: 1983, dp: 9.5, t: 'vault', cs: 6.5, csh: 'sq', c: '#ebe9e3', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#ebe9e3', '#e8e6e0'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; её стены облицованы белым мрамором «коелга», а полы изготовлены из гранита.' },
      { n: 'Севастопольская', sid: 's143', d: 1540, y: 1983, dp: 13, t: 'col', cs: 6.5, csh: 'sq', c: '#ebe9e3', c2: '#ebe9e3', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ebe9e3', cp: 'coffer', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; колонны и путевые стены облицованы белым мрамором, над платформой — белый кессонированный потолок с люминесцентными светильниками.' },
      { n: 'Чертановская', sid: 's142', d: 2172, y: 1983, dp: 10.5, t: 'col', cs: 6.5, csh: 'sq', c: '#ebe9e3', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; колонны и путевые стены облицованы белым мрамором.' },
      { n: 'Южная', sid: 's141', d: 1104, y: 1983, dp: 10, t: 'vault', cs: 6.5, csh: 'sq', c: '#ebe9e3', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#9ac2d8', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; станция односводчатая.' },
      { n: 'Пражская', sid: 's140', d: 1967, y: 1985, dp: 9.5, t: 'col', cs: 6.5, csh: 'sq', c: '#c9a25a', c2: '#7a5a46', w: '#e6e4de', wp: 'tile', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#2a2a2a', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; весь комплекс станции — подземный вестибюль, кассовые залы, подземные переходы и их входные павильоны — был выполнен в едином стиле — с использованием оригинальной чешско' },
      { n: 'Улица Академика Янгеля', sid: 's139', d: 1374, y: 2000, dp: 8, t: 'vault', cs: 6.5, csh: 'sq', c: '#ebe9e3', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#ebe9e3', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'niche', nm: 'plate', info: 'односводчатая мелкого заложения; пол выложен белым и чёрным мрамором.' },
      { n: 'Аннино', sid: 's138', d: 2081, y: 2001, dp: 8, t: 'vault', cs: 6.5, csh: 'sq', c: '#a9a9a6', w: '#a9a9a6', wp: 'marble', wl: '#3a3a3a', wa: '#ADACAC', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'niche', nm: 'plate', info: 'односводчатая мелкого заложения; путевые стены облицованы серым, пол — серым и чёрным мрамором.' },
      { n: 'Бульвар Дмитрия Донского', sid: 's137', d: 0, y: 2002, dp: 10, t: 'col', cs: 6.5, csh: 'sq', c: '#ebe9e3', c2: '#4f7a5a', w: '#ebe9e3', wp: 'marble', wl: '#ebe9e3', wa: '#ADACAC', f: ['#2a2a2a', '#a9a9a6'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; цоколь колонн облицован гранитом «возрождение», а их верхняя часть — белыми плитами мрамора «каррара», которые раздвинуты вертикальной полосой из зелёного мрамора «верде' },
    ],
    outdoor: [],
  },
  ln10: {
    id: 'ln10',
    num: '10',
    name: 'Люблинско-Дмитровская линия',
    short: 'Салатовая',
    color: '#BED12E',
    exactD: true,
    minSpan: 600,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Физтех', sid: 's443', d: 2640, y: 2023, dp: 12, t: 'vault', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'односводчатая мелкого заложения' },
      { n: 'Лианозово', sid: 's442', d: 2036, y: 2023, dp: 12, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения' },
      { n: 'Яхромская', sid: 's441', d: 1456, y: 2023, dp: 12, t: 'col', cs: 8, csh: 'sq', c: '#9a3a32', w: '#c9c9c6', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ebe9e3', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; одна из путевых стен станции — светло-серая — занята историческим панно (160 х 5 м), посвящённым празднованию 800-летия москвы в 1947 году (станция имеет выходы на одноим' },
      { n: 'Селигерская', sid: 's244', d: 1460, y: 2018, dp: 20, t: 'col', cs: 8, csh: 'sq', c: '#b8bcc0', w: '#2a2a2a', wp: 'panel', wl: '#2a2a2a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#b8bcc0', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; нижняя половина колонн облицовывается травертином со вставками вертикальных молдингов из нержавеющей стали, верхняя — композитными панелями того же цвета, что и травертин' },
      { n: 'Верхние Лихоборы', sid: 's245', d: 1370, y: 2018, dp: 65, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; все станции участка — «верхние лихоборы» выполнены в едином стиле: пилоны со стороны центрального зала облицованы белым саянским мрамором, со стороны боковых залов — цвет' },
      { n: 'Окружная', sid: 's246', d: 1270, y: 2018, dp: 65, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; все станции участка «бутырская» — «верхние лихоборы» выполнены в едином стиле: пилоны со стороны центрального зала облицовывают белым саянским мрамором, со стороны боковы' },
      { n: 'Петровско-Разумовская', sid: 's234', d: 1722, y: 1991, dp: 61, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#ebe9e3', c2: '#a9a9a6', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; колонны и путевые стены облицованы белым и серым мрамором, а также датолит-волластонитовым геденбергитовым скарном.' },
      { n: 'Фонвизинская', sid: 's233', d: 1403, y: 2016, dp: 65, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#ebe9e3', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; пилоны со стороны центрального зала облицованы белым мрамором, а в боковых залах облицованы плитами гранатового амфиболита.' },
      { n: 'Бутырская', sid: 's232', d: 2133, y: 2016, dp: 60, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#7a5a46', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; в отличие от них, часть облицовки пилонов выполнена из коричневого мрамора.' },
      { n: 'Марьина Роща', sid: 's178', d: 1617, y: 2010, dp: 60, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#7a5a46', c2: '#ddcfb4', w: '#ddcfb4', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; тёмно-коричневый гранит прямоугольной формы и полированные плиты бежевого оттенка образуют на поверхности пола геометрический рисунок, подчёркивающий ритм пилонов и прохо' },
      { n: 'Достоевская', sid: 's177', d: 1437, y: 2010, dp: 60, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'chand', nm: 'plate', info: 'колонная глубокого заложения; опубликованные в интернете фотографии элементов отделки станции вызвали неоднозначную реакцию общественности.' },
      { n: 'Трубная', sid: 's176', d: 1392, y: 2007, dp: 60, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#4f7a5a', w: '#4f7a5a', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ebe9e3', cp: 'flat', l: 'cornice', nm: 'plate', info: 'колонная трёхсводчатая глубокого заложения; путевые стены, порталы и карнизы облицованы итальянским мрамором светлых тонов, колонны и вставки между порталами — тёмно-зелёным мрамором.' },
      { n: 'Сретенский бульвар', sid: 's175', d: 1627, y: 2007, dp: 60, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#c9c9c6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложенияконструкции центрального зала опираются на монолитную железобетонную плиту.; путевые стены и пилоны станции облицованы светлым мрамором.' },
      { n: 'Чкаловская', sid: 's174', d: 2099, y: 1995, dp: 51, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#a9a9a6', c2: '#2a2a2a', w: '#ebe9e3', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#a9a9a6', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; пилоны отделаны серо-голубым мрамором, пол выложен чёрным, серым и розовым гранитом.' },
      { n: 'Римская', sid: 's173', d: 1823, y: 1995, dp: 54, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; станция «римская» — колонная трёхсводчатая глубокого заложения.' },
      { n: 'Крестьянская Застава', sid: 's172', d: 1856, y: 1995, dp: 47, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#a9a9a6', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'metal', info: 'колонно-стеновая трёхсводчатая глубокого заложения; конструкция станции — колонно-стеновая трёхсводчатая глубокого заложения.' },
      { n: 'Дубровка', sid: 's171', d: 1420, y: 1999, dp: 62, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#a9a9a6', '#9a3a32'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхсводчатая глубокого заложения; станция «дубровка» — колонно-стеновая трёхсводчатая глубокого заложения (глубина — 62 метра), сооружена по новому проекту без подплатформенных помещений, колонны и путевы' },
      { n: 'Кожуховская', sid: 's170', d: 3106, y: 1995, dp: 12, t: 'vault', cs: 6.5, csh: 'sq', c: '#c3c6c9', w: '#9a3a32', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#9a3a32', cp: 'rib', l: 'cornice', nm: 'metal', info: 'односводчатая мелкого заложения, из монолитного железобетона; путевые стены, отделанные мрамором, плавно переходят в свод, к которому крепятся оригинальные светильники с кожухами из красного металла.' },
      { n: 'Печатники', sid: 's169', d: 1728, y: 1995, dp: 5, t: 'col', cs: 6.5, csh: 'sq', c: '#d9a99b', c2: '#a9a9a6', w: '#d9a99b', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#d9a99b', '#a9a9a6'], fp: 'plain', ce: '#c3c6c9', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; колонны облицованы розовым мрамором, путевые стены — серым и чёрным мрамором, пол выложен разноцветным (чёрным, красным и серым) гранитом, образующим орнамент правильной' },
      { n: 'Волжская', sid: 's168', d: 2071, y: 1995, dp: 8, t: 'vault', cs: 6.5, csh: 'sq', c: '#c3c6c9', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#c9c9c6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'metal', info: 'однопролётная мелкого заложения; путевые стены облицованы эмалированным алюминием белого (вверху) и красного (посередине) цветов и мрамором (внизу).' },
      { n: 'Люблино', sid: 's167', d: 2006, y: 1996, dp: 8, t: 'vault', cs: 6.5, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#a9a9a6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая станция мелкого заложения; станция сооружена из железобетона.' },
      { n: 'Братиславская', sid: 's166', d: 1330, y: 1996, dp: 8, t: 'col', cs: 6.5, csh: 'sq', c: '#c9a25a', w: '#9ac2d8', wp: 'marble', wl: '#9ac2d8', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'metal', info: 'колонная двухпролётная мелкого заложения; один ряд колонн по оси зала делит станцию на две части, в то же время сохраняется свобода перемещения по всей платформе.' },
      { n: 'Марьино', sid: 's165', d: 1919, y: 1996, dp: 8, t: 'vault', cs: 6.5, csh: 'sq', c: '#2a2a2a', w: '#2a2a2a', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'chand', nm: 'metal', info: 'однопролётная мелкого заложения; путевые стены отделаны чёрным и тёмно-синим мрамором и плиткой из штампованного алюминия.' },
      { n: 'Борисово', sid: 's164', d: 1380, y: 2011, dp: 10, t: 'vault', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'niche', nm: 'plate', info: 'односводчатая мелкого заложения; конструкция платформенной части — односводчатая мелкого заложения, из монолитного железобетона.' },
      { n: 'Шипиловская', sid: 's163', d: 959, y: 2011, dp: 10, t: 'vault', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'led', nm: 'plate', info: 'односводчатая мелкого заложения; станция односводчатая, с платформой островного типа.' },
      { n: 'Зябликово', sid: 's162', d: 0, y: 2011, dp: 14.3, t: 'vault', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#BED12E', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'односводчатая мелкого заложения; конструкция станции — односводчатая мелкого заложения (глубина заложения — 14,3 метра).' },
    ],
    outdoor: [],
  },
  ln11: {
    id: 'ln11',
    num: '11',
    name: 'Большая кольцевая линия',
    short: 'БКЛ',
    color: '#78C7C9',
    exactD: true,
    minSpan: 600,
    ring: true,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Савёловская', sid: 's255', d: 1791, y: 2018, dp: 63, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#c3c6c9', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; отделка путевых стен и части поверхностей пилонов представлена в виде необлицованных тюбингов, покрытых прозрачными панелями, что по замыслу проектировщиков должно напоми' },
      { n: 'Марьина Роща', sid: 's353', d: 1327, y: 2023, dp: 72, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#3d6fa8', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; проект станции «марьина роща» планировался типовым, как и у других станций большой кольцевой линии, построенных «испанским» методом — с использованием большого 9-метровог' },
      { n: 'Рижская', sid: 's352', d: 2901, y: 2023, dp: 63.5, t: 'pylon', deep: true, cs: 9, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'пилонная трёхсводчатая глубокого заложения; пилонная трёхсводчатая станция глубокого заложения с островной платформой.' },
      { n: 'Сокольники', sid: 's351', d: 1918, y: 2023, dp: 34, t: 'col', cs: 8, csh: 'sq', c: '#c9a25a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#c3c6c9', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; в 2016 году, вслед за постепенным отказом от применения испанского типа станций, было принято решение об очередном изменении проекта с возвратом к платформе островного ти' },
      { n: 'Электрозаводская', sid: 's330', d: 1760, y: 2020, dp: 17.2, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; «электрозаводская» — колонная, трёхпролётная станция мелкого заложения.' },
      { n: 'Лефортово', sid: 's269', d: 1633, y: 2020, dp: 12, t: 'col', cs: 8, csh: 'sq', c: '#2a2a2a', c2: '#ebe9e3', w: '#e6e4de', wp: 'tile', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонны облицованы плитками чёрного и белого цвета.' },
      { n: 'Авиамоторная', sid: 's268', d: 2865, y: 2020, dp: 19, t: 'col', cs: 8, csh: 'sq', c: '#b8bcc0', w: '#b8bcc0', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#b8bcc0', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; путевые стены выполнены из нержавеющей стали, пол — из натурального камня, а потолок — из алюминия.' },
      { n: 'Нижегородская', sid: 's354', d: 3077, y: 2020, dp: 25.8, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#e3cf7a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#a9a9a6', '#7a5a46'], fp: 'plain', ce: '#c3c6c9', cp: 'flat', l: 'cornice', nm: 'plate', info: 'колонная пятипролётная мелкого заложения или глубокого; «нижегородская» входит в одноимённый тпу, архитектурой всего комплекса занималось ооо «архитектурное бюро тимура башкаева», именно под их контролем непосредственно проект' },
      { n: 'Текстильщики', sid: 's355', d: 1499, y: 2023, dp: 22, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#a9a9a6', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#c3c6c9', cp: 'flat', l: 'cornice', nm: 'plate', info: 'колонная мелкого заложения; станция «текстильщики» большой кольцевой линии является одной из нескольких станций московского метрополитена, на которой название расположено не на путевых стенах, а в с' },
      { n: 'Печатники', sid: 's347', d: 1870, y: 2023, dp: 30, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#3d6fa8', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная глубокого заложения; колонная станция мелкого заложения с двумя береговыми платформами.' },
      { n: 'Нагатинский Затон', sid: 's350', d: 1879, y: 2023, dp: 27, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная, двухпролётная, мелкого заложения; thumb|left|270px|платформа станции в 2024 году «нагатинский затон» — станция мелкого заложения с двумя береговыми платформами.' },
      { n: 'Кленовый бульвар', sid: 's349', d: 3059, y: 2023, dp: 24.3, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная мелкого заложения; 22 ноября 2017 года был объявлен открытый конкурс на архитектурный облик станций метро «нагатинский затон» и «кленовый бульвар».' },
      { n: 'Каширская', sid: 's181', d: 2004, y: 1969, dp: 7, t: 'col', cs: 4, csh: 'sq', c: '#a9a9a6', c2: '#9a3a32', w: '#ebe9e3', wp: 'tile', wl: '#3a3a3a', wa: '#78C7C9', f: ['#a9a9a6', '#9a3a32'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'мелкого заложения; изначально колонны восточного зала были облицованы серым мрамором, пол был выложен красно-алым гранитом.' },
      { n: 'Варшавская', sid: 's180', d: 1326, y: 1969, dp: 13, t: 'col', cs: 4, csh: 'sq', c: '#a9a9a6', c2: '#9ac2d8', w: '#9ac2d8', wp: 'tile', wl: '#3a3a3a', wa: '#78C7C9', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; четырёхугольные, расширяющиеся кверху колонны были облицованы серо-жёлтым мрамором с голубыми вкраплениями.' },
      { n: 'Каховская', sid: 's179', d: 1691, y: 1969, dp: 8, t: 'col', cs: 4, csh: 'sq', c: '#9a3a32', w: '#ebe9e3', wp: 'tile', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'rib', l: 'strip', nm: 'metal', info: 'колонная трёхпролётная мелкого заложения; изначально колонны были облицованы красным мрамором салиэти (утрачен при реконструкции).' },
      { n: 'Зюзино', sid: 's342', d: 2369, y: 2021, dp: 17.5, t: 'col', cs: 8, csh: 'sq', c: '#c9c9c6', c2: '#2a2a2a', w: '#2a2a2a', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#c9c9c6', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонны на платформе облицованы светло-серым мрамором, пол выложен гранитом в тон и чёрным габбро-диабазом.' },
      { n: 'Воронцовская', sid: 's341', d: 1685, y: 2021, dp: 23, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения' },
      { n: 'Новаторская', sid: 's340', d: 1225, y: 2021, dp: 11, t: 'col', cs: 8, csh: 'sq', c: '#e0782d', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e0782d', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; при типовой конструкции для станций южного участка большой кольцевой линии «новаторская» имеет ярко выраженный образ с узнаваемым колористическим решением.' },
      { n: 'Проспект Вернадского', sid: 's339', d: 1876, y: 2021, dp: 16, t: 'col', cs: 8, csh: 'sq', c: '#c9a25a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#c9a25a', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; она имеет индивидуальный образ, основанный на сочетании геометрических форм теплого монохрома отделки потолка, пола, колонн и графически яркой темы путевой стены, переход' },
      { n: 'Мичуринский проспект', sid: 's338', d: 1679, y: 2021, dp: 19, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролетная мелкого заложения; построенная китайскими специалистами, станция имеет прямые отсылки к искусству этой страны.' },
      { n: 'Аминьевская', sid: 's337', d: 2181, y: 2021, dp: 14, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: '' },
      { n: 'Давыдково', sid: 's343', d: 1559, y: 2021, dp: 33, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: '' },
      { n: 'Кунцевская', sid: 's344', d: 2379, y: 2021, dp: 37.6, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения или глубокого' },
      { n: 'Терехово', sid: 's345', d: 1643, y: 2021, dp: 22.5, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'мелкого заложения или глубокого; 30 января 2016 года был завершён архитектурный конкурс на дизайн станций метро «нижние мнёвники» и «терехово».' },
      { n: 'Мнёвники', sid: 's332', d: 2011, y: 2021, dp: 27, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения или глубокого; колонная трёхпролётная станция мелкого заложения — согласно определению строительных норм и правил (снипов), как построенная открытым способом, или, согласно другой класс' },
      { n: 'Народное Ополчение', sid: 's331', d: 2126, y: 2021, dp: 26, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#c3c6c9', c2: '#b8bcc0', w: '#c3c6c9', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#6e6e6c', '#8e8e8c'], fp: 'plain', ce: '#c3c6c9', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения или глубокого; стены облицованы алюминиевыми панелями, а колонны — шлифованной нержавеющей сталью.' },
      { n: 'Хорошёвская', sid: 's237', d: 1534, y: 2018, dp: 21, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#7b3fa3', c2: '#9a3a32', w: '#7b3fa3', wp: 'marble', wl: '#3a3a3a', wa: '#78C7C9', f: ['#c9c9c6', '#6e6e6c'], fp: 'plain', ce: '#ebe9e3', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения или глубокого; колонны и часть путевых стен станции облицованы фиолетовым мрамором, по цвету таганско-краснопресненской линии, на которую осуществляется пересадка.' },
      { n: 'ЦСКА', sid: 's238', d: 1798, y: 2018, dp: 28, t: 'cold', deep: true, cs: 6, csh: 'rnd', c: '#c9c9c6', w: '#c9c9c6', wp: 'panel', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения или глубокого; их установили на круглые постаменты-колонны из светло-серого гранита, на каждый из которых нанесён фирменный символ-эмблема цска с аббревиатурой клуба.' },
      { n: 'Петровский парк', sid: 's239', d: 2173, y: 2018, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', c2: '#2a2a2a', w: '#a9a9a6', wp: 'marble', wl: '#3a3a3a', wa: '#78C7C9', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'мелкого заложения; платформа станции отделана серым и чёрным гранитом, путевые стены — белым мрамором, колонны — зелёным мрамором.' },
    ],
    outdoor: [],
  },
  ln12: {
    id: 'ln12',
    num: '12',
    name: 'Бутовская линия',
    short: 'Бутовская',
    color: '#ACBFE3',
    exactD: true,
    minSpan: 600,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Битцевский парк', sid: 's191', d: 2476, y: 2014, dp: 10, t: 'vault', cs: 8, csh: 'sq', c: '#c9a24a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#ACBFE3', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'led', nm: 'plate', info: 'односводчатая мелкого заложения; колонны интерьера вестибюля облицованы плитами из полированного индийского мрамора, цвет которого призван напоминать осеннюю позолоту окружающего леса.' },
      { n: 'Лесопарковая', sid: 's192', d: 1880, y: 2014, dp: 10, t: 'vault', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#ACBFE3', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'coffer', l: 'niche', nm: 'plate', info: 'односводчатая мелкого заложения; мини|станция в день открытия целиком архитектурный проект был разработан в 2009 году архитекторами оао «метрогипротранс» владимиром филипповым и светланой петросян.' },
      { n: 'Улица Старокачаловская', sid: 's182', d: 2796, y: 2003, dp: 10, t: 'vault', cs: 6.5, csh: 'sq', c: '#c9c9c6', w: '#e8e6e0', wp: 'marble', wl: '#3a3a3a', wa: '#ACBFE3', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'niche', nm: 'plate', info: 'два однопролётных зала с боковыми платформами; путевые стены облицованы мрамором «коелга» и серо-розовым выборгским гранитом.' },
      { n: 'Улица Скобелевская', sid: 's183', d: 778, y: 2003, dp: 0, t: 'ground', open: true, elev: true, cs: 6.5, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ACBFE3', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'plate', info: 'эстакадная открытая; конструкция станции — надземная с островной платформой, сооружена на эстакаде, типовой проект.' },
      { n: 'Бульвар Адмирала Ушакова', sid: 's184', d: 890, y: 2003, dp: 0, t: 'ground', open: true, elev: true, cs: 6.5, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ACBFE3', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'plate', info: 'эстакадная открытая; конструкция станции — надземная с островной платформой, сооружена на эстакаде, типовой проект.' },
      { n: 'Улица Горчакова', sid: 's185', d: 976, y: 2003, dp: 0, t: 'ground', open: true, elev: true, cs: 6.5, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ACBFE3', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'plate', info: 'эстакадная открытая; конструкция станции — надземная с островной платформой, сооружена на эстакаде, типовой проект.' },
      { n: 'Бунинская аллея', sid: 's186', d: 0, y: 2003, dp: 0, t: 'ground', open: true, elev: true, cs: 6.5, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'marble', wl: '#3a3a3a', wa: '#ACBFE3', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'strip', nm: 'plate', info: 'эстакадная открытая; конструкция станции — надземная с островной платформой, сооружена на эстакаде, типовой проект.' },
    ],
    outdoor: [
      { osm: 'butv', rev: false, anchor: 'Бульвар Адмирала Ушакова', kind: 'open', rise: 7, elev: true, portal: [0, 0] },
    ],
  },
  ln15: {
    id: 'ln15',
    num: '15',
    name: 'Некрасовская линия',
    short: 'Розовая',
    color: '#F088B6',
    exactD: true,
    minSpan: 600,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Нижегородская', sid: 's264', d: 1656, y: 2020, dp: 25.8, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#e3cf7a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#a9a9a6', '#7a5a46'], fp: 'plain', ce: '#c3c6c9', cp: 'flat', l: 'cornice', nm: 'plate', info: 'колонная пятипролётная мелкого заложения или глубокого; «нижегородская» входит в одноимённый тпу, архитектурой всего комплекса занималось ооо «архитектурное бюро тимура башкаева», именно под их контролем непосредственно проект' },
      { n: 'Стахановская', sid: 's265', d: 2050, y: 2020, dp: 19, t: 'col', cs: 8, csh: 'sq', c: '#ebe9e3', w: '#a9a9a6', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#a9a9a6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонны из гранита вдоль путевых стен сделаны похожими на станки советских рабочих, белые плафоны-трубки на потолках напоминают перекрытия заводских помещений.' },
      { n: 'Окская', sid: 's266', d: 2767, y: 2020, dp: 21, t: 'col', cs: 8, csh: 'sq', c: '#c9c9c6', w: '#c9c9c6', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#c9c9c6', '#6e6e6c'], fp: 'plain', ce: '#3d6fa8', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонны между путями имеют общее горизонтальное основание и окрашены в светло-серый цвет, над ними расположены горизонтальные световые линии.' },
      { n: 'Юго-Восточная', sid: 's267', d: 2107, y: 2020, dp: 20, t: 'col', cs: 8, csh: 'sq', c: '#ddcfb4', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#7a5a46', '#2a2a2a'], fp: 'plain', ce: '#7a5a46', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; колонная двухпролётная станция мелкого заложения с двумя береговыми платформами.' },
      { n: 'Косино', sid: 's256', d: 2107, y: 2019, dp: 27, t: 'col', cs: 8, csh: 'sq', c: '#c3c6c9', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#c3c6c9', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; пол станции покрыт гранитом, колонны — алюминиевыми панелями цвета «бриллиантово-шампанский металлик».' },
      { n: 'Улица Дмитриевского', sid: 's257', d: 1323, y: 2019, dp: 18, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#2f7a5a', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#e3cf7a', '#2a2a2a'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; путевые стены облицованы металлокерамическими панелями изумрудного цвета.' },
      { n: 'Лухмановская', sid: 's258', d: 1950, y: 2019, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#a9a9a6', w: '#e0782d', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#c3c6c9', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; путевые стены отделаны оранжевыми декоративными панелями.' },
      { n: 'Некрасовка', sid: 's259', d: 0, y: 2019, dp: 16, t: 'col', cs: 8, csh: 'sq', c: '#9a3a32', c2: '#a9a9a6', w: '#9a3a32', wp: 'panel', wl: '#3a3a3a', wa: '#F088B6', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения; в облицовке использованы металлокерамические панели: рубиново-красного цвета для путевых стен, жемчужно-серого и белого цветов — для колонн.' },
    ],
    outdoor: [],
  },
  ln17: {
    id: 'ln17',
    num: '17',
    name: 'Рублёво-Архангельская линия',
    short: 'Рублёвская',
    color: '#27303F',
    exactD: true,
    minSpan: 600,
    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
      { n: 'Деловой центр', sid: 's235', d: 1995, y: 2018, dp: 24.5, t: 'cold', deep: true, cs: 6, csh: 'sq', c: '#9ac2d8', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#27303F', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#9ac2d8', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная глубокого заложения; колонная трёхпролётная станция глубокого заложения.' },
      { n: 'Шелепиха', sid: 's236', d: 1381, y: 2018, dp: 20, t: 'col', cs: 8, csh: 'sq', c: '#ebe9e3', c2: '#2a2a2a', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#27303F', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ebe9e3', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения; шестиметровые белые колонны неправильной формы создают иллюзию высоких потолков, сами потолки отделаны чёрными и жёлтыми пластинами.' },
      { n: 'Звенигородская', sid: 's463', d: 2002, y: 2026, dp: 28.4, t: 'col', cs: 8, csh: 'sq', c: '#d9d6cf', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#27303F', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная, трёхпролётная, мелкого заложения; === вестибюли === * количество вестибюлей: 2 * тип вестибюлей: подземные, с выходами к: ** улице шеногина, ** шелепихинскому шоссе, ** 1-му силикатному проезду и проектир' },
      { n: 'Народное ополчение', sid: 's464', d: 1337, y: 2026, dp: 24, t: 'col', cs: 8, csh: 'sq', c: '#9a3a32', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#27303F', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'cornice', nm: 'plate', info: 'колонная, трёхпролётная, мелкого заложения; 15 апреля 2020 года был объявлен открытый международный конкурс на разработку архитектурного облика двух проектируемых станций метро — «карамышевская» (на тот момент под' },
      { n: 'Бульвар Генерала Карбышева', sid: 's465', d: 0, y: 2026, dp: 18.6, t: 'col', cs: 8, csh: 'sq', c: '#e0782d', w: '#e6e4de', wp: 'panel', wl: '#3a3a3a', wa: '#27303F', f: ['#a9a9a6', '#6e6e6c'], fp: 'plain', ce: '#ecebe6', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная, двухпролётная, мелкого заложения; на станцию организован доступ для людей с ограниченными возможностями.' },
    ],
    outdoor: [],
  },
  ln16: {
    id: 'ln16',
    num: '16',
    name: 'Троицкая линия',
    short: 'Троицкая',
    color: '#03795F',
    stations: [
      { n: 'ЗИЛ', sid: 's445', d: 2760, y: 2025, dp: 15, t: 'col', cs: 8, csh: 'rnd', c: '#d9d9d6', w: '#c9cacb', wp: 'panel', wl: '#3a3a3a', wa: '#c4282b', f: ['#bdbdba', '#8e8e8c'], fp: 'stripe', ce: '#e6e6e3', cp: 'flat', l: 'led', nm: 'plate', info: 'на путевых стенах — автомобили ЗИЛ разных лет; название — в виде эмблемы завода' },
      { n: 'Крымская', sid: 's446', d: 2290, y: 2025, dp: 15, t: 'col', cs: 8, csh: 'rnd', c: '#bfc4c8', w: '#d2d4d4', wp: 'cells', wl: '#4a4d50', wa: '#9ea3a8', f: ['#c2c4c4', '#6e6e6c'], fp: 'stripe', ce: '#c9cdd1', cp: 'grid', l: 'led', nm: 'plate', info: 'стальные оттенки: потолок из алюминиевых сотовых панелей, светло-серый гранит' },
      { n: 'Академическая', sid: 's447', d: 2230, y: 2025, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#e8e4dc', w: '#d8cbb8', wp: 'frieze', wl: '#4a3e30', wa: '#b0302a', f: ['#c9c2b6', '#8c857a'], fp: 'stripe', ce: '#ece8e0', cp: 'flat', l: 'led', nm: 'plate', info: 'античные сюжеты на путевых стенах, анфилада красных «порталов»' },
      { n: 'Вавиловская', sid: 's448', d: 1880, y: 2025, dp: 15, t: 'col', cs: 8, csh: 'frame', c: '#e9e9e6', c2: '#f2c53d', w: '#efefea', wp: 'marble', wl: '#1e1e1e', wa: '#f2c53d', f: ['#efefea', '#1e1e1e'], fp: 'check', ce: '#ecebe8', cp: 'flat', l: 'led', nm: 'plate', info: 'колонны-«галочки» с жёлтыми вставками; белый мрамор и чёрный гранит' },
      { n: 'Новаторская', sid: 's449', d: 2760, y: 2024, dp: 15, t: 'col', cs: 8, csh: 'rnd', c: '#e8e8e4', w: '#e6e8ea', wp: 'panel', wl: '#3a3a3a', wa: '#3d9a8a', f: ['#bdbdba', '#8e8e8c'], fp: 'stripe', ce: '#ececea', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения' },
      { n: 'Университет Дружбы Народов', sid: 's450', d: 2930, y: 2024, dp: 15, t: 'col', cs: 8, csh: 'rnd', c: '#e8e4dc', w: '#b8bec4', wp: 'panel', wl: '#3a3a3a', wa: '#2f6fa8', f: ['#c2c0b9', '#8e8e8c'], fp: 'stripe', ce: '#ececea', cp: 'flat', l: 'led', nm: 'plate', info: 'алюминиевые панели с названием на путевых стенах, колонны в мраморе' },
      { n: 'Генерала Тюленева', sid: 's451', d: 1190, y: 2024, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#dedcd6', w: '#8a8e90', wp: 'panel', wl: '#2a2a2a', wa: '#a8322d', f: ['#bdbdba', '#5a5a58'], fp: 'stripe', ce: '#e6e6e2', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения' },
      { n: 'Тютчевская', sid: 's452', d: 2100, y: 2024, dp: 15, t: 'col', cs: 8, csh: 'rnd', c: '#e4e2dc', w: '#2f3e5c', wp: 'panel', wl: '#1e2433', wa: '#c9a46b', f: ['#bdbdba', '#5a5a58'], fp: 'stripe', ce: '#e6e6e2', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения' },
      { n: 'Корниловская', sid: 's453', d: 2860, y: 2024, dp: 15, t: 'col', cs: 8, csh: 'sq', c: '#e8e4dc', w: '#c9b89a', wp: 'panel', wl: '#5a4a3a', wa: '#8a6a3a', f: ['#c9c2b6', '#8c857a'], fp: 'stripe', ce: '#ece8e0', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная трёхпролётная мелкого заложения' },
      { n: 'Коммунарка', sid: 's454', d: 1470, y: 2024, dp: 15, t: 'col', cs: 8, csh: 'rnd', c: '#e8e8e4', w: '#d6d0c6', wp: 'squares', wl: '#5a4a3a', wa: '#4a9a7a', f: ['#c9c2b6', '#8c857a'], fp: 'check', ce: '#e9e7e2', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная двухпролётная мелкого заложения' },
      { n: 'Новомосковская', sid: 's455', d: 0, y: 2024, dp: 15, t: 'vault', c: '#efefea', w: '#efefea', wp: 'panel', wl: '#3a3a3a', wa: '#03795F', f: ['#bdbdba', '#8e8e8c'], fp: 'stripe', ce: '#efefea', cp: 'rib', l: 'niche', nm: 'plate', info: 'односводчатая мелкого заложения; пересадка на Сокольническую линию' },
    ],
    outdoor: [],
  },
};

export const PLAYABLE = ['ln1', 'ln2', 'ln3', 'ln4', 'ln5', 'ln6', 'ln7', 'ln8', 'ln9', 'ln10', 'ln11', 'ln12', 'ln15', 'ln16', 'ln17'];

// ---------- маршруты и направления ----------
// У линии с ответвлением (вилочное движение) два маршрута: основной и на ответвление.
// Направления в меню: «начало → конец ответвления», «начало → конец основного хода» и обратные.
const _var = new Map();
export function lineVariants(id) {
  if (_var.has(id)) return _var.get(id);
  const L = LINES[id];
  let out;
  const anchored = (stations) => (L.outdoor || []).filter((o) => stations.some((x) => x.n === o.anchor));
  if (L.parts) {
    // отдельные участки линии (не соединены путями): у каждого свои два направления
    const parts = L.parts.map((names, i) => {
      const st = names.map((n) => L.stations.find((x) => x.n === n));
      st[st.length - 1] = { ...st[st.length - 1], d: 0 };
      return { ...L, key: 'p' + i, stations: st, outdoor: anchored(st) };
    });
    out = { main: parts[0], branch: null, parts };
  } else if (L.ring) {
    // кольцо: маршрут — полный круг с возвращением на исходную станцию
    out = { main: { ...L, stations: [...L.stations, { ...L.stations[0], d: 0 }] }, branch: null };
  } else if (!L.branch) out = { main: L, branch: null };
  else {
    const B = L.branch;
    const bset = new Set(B.names);
    const main = L.stations.filter((s) => !bset.has(s.n));
    const k = main.findIndex((s) => s.n === B.at);
    const br = L.stations.filter((s) => bset.has(s.n));
    const mk = (key, stations, turn) => ({ ...L, key, stations, outdoor: (L.outdoor || []).filter((o) => stations.some((s) => s.n === o.anchor)), fork: { at: B.at, turn } });
    // основной ход прямо, ответвление уходит вправо (по ходу от начала линии)
    const m = mk('m', main, 0);
    const b = mk('b', [...main.slice(0, k), { ...main[k], d: B.d }, ...br], -1);
    m.fork.ghost = b; b.fork.ghost = m;
    out = { main: m, branch: b };
  }
  _var.set(id, out);
  return out;
}

// направление dir (номер в меню) → маршрут и его ход (0 — от начала линии, 1 — к началу)
export function resolveDir(id, dir) {
  const V = lineVariants(id);
  if (V.parts) return { line: V.parts[Math.min(V.parts.length - 1, dir >> 1)], d: dir & 1 };
  if (!V.branch) return { line: V.main, d: dir ? 1 : 0 };
  const line = dir === 0 || dir === 2 ? V.branch : V.main;
  return { line, d: dir >= 2 ? 1 : 0 };
}
export function lineDirs(id) {
  const V = lineVariants(id);
  const n = V.parts ? V.parts.length * 2 : V.branch ? 4 : 2;
  const out = [];
  for (let dir = 0; dir < n; dir++) {
    const { line, d } = resolveDir(id, dir);
    const st = d === 0 ? line.stations : [...line.stations].reverse();
    const label = line.ring ? `${d === 0 ? 'По часовой стрелке' : 'Против часовой стрелки'}: ${st[0].n} → ${st[1].n} → …` : `${st[0].n} → ${st[st.length - 1].n}`;
    out.push({ dir, stations: st, from: st[0].n, to: st[st.length - 1].n, line, label });
  }
  return out;
}
export function reverseDir(id, dir) { const L = LINES[id]; return L.branch ? dir ^ 2 : L.parts ? dir ^ 1 : 1 - dir; }

export const TRAINS = {
  '717': {
    id: '717',
    name: '81-717/714 «Номерной»',
    short: 'Номерной',
    desc: 'Классический советский вагон: сине-зелёный кузов, четыре фары в ряд, жёлтый маршрутный указатель.',
    cars: 8, carLen: 19.3, sections: 1, doors: 4, doorW: 1.2,
    vmax: 90, acc: 1.1, dec: 1.25,
  },
  '775': {
    id: '775',
    name: '81-775/776 «Москва-2020»',
    short: 'Москва-2020',
    desc: 'Современный поезд: широкие двери, панорамная кабина, красная «улыбка» на лобовой маске.',
    cars: 8, carLen: 19.3, sections: 1, doors: 4, doorW: 1.4,
    vmax: 90, acc: 1.3, dec: 1.35,
  },
  '740': {
    id: '740',
    name: '81-740/741 «Русич»',
    short: 'Русич',
    desc: 'Сочленённый поезд: серебристый кузов с синей полосой, зелёное светодиодное табло маршрута.',
    cars: 5, carLen: 30.8, sections: 2, doors: 4, doorW: 1.3,
    vmax: 90, acc: 1.2, dec: 1.3,
  },
};
