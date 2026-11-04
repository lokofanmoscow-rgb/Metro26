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
      { n: 'Саларьево', sid: 's200', d: 2800, y: 2016, dp: 12, t: 'col', cs: 6, csh: 'frame', c: '#d6d0c6', c2: '#6f6a62', w: '#b0643a', wp: 'squares', wl: '#5a3a26', wa: '#c98a5c', f: ['#c9c2b6', '#8c857a'], fp: 'check', ce: '#d7d3cc', cp: 'grid', l: 'led', nm: 'plate', info: 'каркасная станция: квадраты на стенах, потолке и полу; оранжево-коричневые панели' },
      { n: 'Филатов Луг', sid: 's260', d: 3210, y: 2019, dp: 12, t: 'span', c: '#f4f4f2', c2: '#f2c53d', w: '#eef1f2', wp: 'panel', wl: '#d9dcdd', wa: '#f2c53d', f: ['#d9d9d6', '#bdbdba'], fp: 'plain', ce: '#f4f4f2', cp: 'arch', l: 'led', nm: 'plate', info: 'однопролётная мелкого заложения в стиле старинных вокзалов: белые арки и жёлтые акценты' },
      { n: 'Прокшино', sid: 's261', d: 1960, y: 2019, dp: 12, t: 'col', cs: 7, csh: 'rnd', c: '#f4f4f2', c2: '#d42a2a', w: '#eceae6', wp: 'panel', wl: '#d42a2a', wa: '#d42a2a', f: ['#d9d9d6', '#bdbdba'], fp: 'plain', ce: '#f4f4f2', cp: 'flat', l: 'led', nm: 'plate', info: 'колонная мелкого заложения; светлый зал с красными и жёлтыми элементами' },
      { n: 'Ольховая', sid: 's262', d: 1240, y: 2019, dp: 12, t: 'span', c: '#f2f0ea', w: '#f3f1ea', wp: 'origami', wl: '#e8862a', wa: '#f2c53d', f: ['#c9c6bf', '#a9a69f'], fp: 'stripe', ce: '#f5f3ee', cp: 'origami', l: 'led', nm: 'plate', info: 'однопролётная; оформление в стиле оригами — белый, жёлтый и оранжевый' },
      { n: 'Новомосковская', sid: 's263', d: 1800, y: 2019, dp: 15, t: 'col', cs: 7, csh: 'rnd', c: '#dcdcd8', w: '#9b1b30', wp: 'panel', wl: '#3a3a3a', wa: '#b5283f', f: ['#bdb6a8', '#8e8e8c'], fp: 'stripe', ce: '#e6e3dc', cp: 'flat', l: 'led', nm: 'plate', info: 'путевые стены — рубиново-красные металлокерамические панели' },
      { n: 'Потапово', sid: 's444', d: 0, y: 2024, dp: 15, t: 'col', cs: 7, csh: 'rnd', c: '#e4e4e0', w: '#5f7f74', wp: 'panel', wl: '#2e3a36', wa: '#86a89c', f: ['#c2c0b9', '#8e8e8c'], fp: 'stripe', ce: '#e9e9e6', cp: 'flat', l: 'led', nm: 'plate', info: 'конечная станция, открыта в 2024 году' },
    ],
    // открытые участки: osm — участок с реальной осью и окружением, привязанный к станции anchor
    outdoor: [
      // Лужнецкий метромост с крытой галереей; ось и окружение — по данным OpenStreetMap
      // Преображенский метромост через Яузу
      { osm: 'preo', rev: false, anchor: 'Преображенская площадь', kind: 'open', portal: 0, rise: 0 },
      { osm: 'luzh', rev: true, anchor: 'Воробьёвы горы', kind: 'bridge' },
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
      { n: 'Технопарк', sid: 's198', d: 1980, y: 2015, dp: 0, t: 'side', c: '#b9bec2', c2: '#7b3fa3', w: '#c9cdd1', wp: 'panel', wl: '#8c8f92', wa: '#7b3fa3', f: ['#a3a39f', '#8e8e8c'], fp: 'plain', ce: '#5d6166', cp: 'flat', l: 'led', nm: 'plate', info: 'наземная крытая станция с двумя боковыми платформами; решётчатый потолок с фиолетовыми вставками, пешеходный мост над путями' },
      { n: 'Коломенская', sid: 's33', d: 2800, y: 1969, dp: 9, t: 'col', cs: 4, csh: 'fac', c: '#e8e6e0', w: '#efeee9', wp: 'inserts', wl: '#2a2a2a', wa: '#9a9a96', f: ['#8e8e8c', '#6e6e6c'], fp: 'plain', ce: '#e9e9e5', cp: 'rib', l: 'strip', nm: 'metal', info: '«сороконожка» с восьмигранными колоннами' },
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

  ln6: {
    id: 'ln6',
    num: '6',
    name: 'Калужско-Рижская линия',
    short: 'Оранжевая',
    color: '#EF7E24',
    stations: [
      { n: 'Медведково', sid: 's109', d: 2130, y: 1978, dp: 8, t: 'col', cs: 6.5, csh: 'sq', c: '#e2c8b4', c2: '#c9ccd0', w: '#8c3a32', wp: 'pyramid', wl: '#7a7a78', wa: '#c7a46a', f: ['#2a2a2a', '#8e8e8c'], fp: 'check', ce: '#e7e4dd', cp: 'rib', l: 'strip', nm: 'metal', info: 'стены — красный мрамор и алюминиевые «пирамидки», символизирующие ледяные глыбы' },
      { n: 'Бабушкинская', sid: 's108', d: 1860, y: 1978, dp: 10, t: 'vault', c: '#e4e1da', w: '#e4e1da', wp: 'marble', wl: '#2a2a2a', wa: '#c8c4ba', f: ['#2a2a2a', '#8e8e8c'], fp: 'stripe', ce: '#ecebe6', cp: 'rib', l: 'niche', nm: 'metal', info: 'односводчатая мелкого заложения; светильники в пазах эллиптического свода' },
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

export const PLAYABLE = ['ln1', 'ln2', 'ln3', 'ln6', 'ln16'];

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
