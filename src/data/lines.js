// Игровые линии: порядок станций, длины перегонов и оформление станций.
// Оформление описано по статьям русской Википедии о станциях (облицовка путевых стен,
// колонн/пилонов, пола, тип конструкции). Длины перегонов посчитаны по координатам
// станций с поправкой на кривизну трассы.
//
// Поля стиля станции:
//  t   — тип: col (колонная мелкого заложения), pylon (пилонная глубокого заложения),
//        cold (колонная трёхсводчатая глубокого заложения), vault (односводчатая),
//        span (однопролётная с плоским потолком), ground (наземная крытая),
//        bridge (на метромосту)
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
      { n: 'Комсомольская', sid: 's6', d: 1070, y: 1935, dp: 9, t: 'col', cs: 5, csh: 'sq', c: '#d9b25c', c2: '#8a6a2a', w: '#ebdca6', wp: 'tile', wl: '#5a4a32', wa: '#d9c78f', f: ['#8f8f8c', '#8f3a32'], fp: 'check', ce: '#efe9d8', cp: 'coffer', l: 'chand', nm: 'metal', ch: 6.5, info: 'двухъярусный зал с балконами; колонны — золотисто-жёлтый мрамор «чоргунь» с эмблемой КИМ' },
      { n: 'Красные Ворота', sid: 's7', d: 900, y: 1935, dp: 33, t: 'pylon', deep: true, cs: 9, c: '#8e3b2e', c2: '#bdb9b0', w: '#c9b9a8', wp: 'marble', wl: '#6e2a22', wa: '#a65a48', f: ['#9a9a96', '#3a3a3a'], fp: 'check', ce: '#ece8de', cp: 'flat', l: 'ball', nm: 'metal', info: 'пилонная трёхсводчатая глубокого заложения; пилоны — красно-бурый мрамор «старая шроша»' },
      { n: 'Чистые пруды', sid: 's8', d: 1010, y: 1935, dp: 35, t: 'pylon', deep: true, cs: 9, c: '#dedad1', c2: '#93938f', w: '#cfcdc8', wp: 'marble', wl: '#1f1f1f', wa: '#b4b2ad', f: ['#8e8e8c', '#c49a91'], fp: 'check', ce: '#edebe5', cp: 'flat', l: 'cornice', nm: 'metal', info: 'спаренные пилоны из уральского мрамора «коелга» и дымчатого «уфалей»' },
      { n: 'Лубянка', sid: 's9', d: 730, y: 1935, dp: 33, t: 'pylon', deep: true, cs: 7, c: '#a9a9a6', c2: '#1d1d1d', w: '#b8b7b3', wp: 'marble', wl: '#1d1d1d', wa: '#8e8d89', f: ['#8a8a88', '#4a4a48'], fp: 'stripe', ce: '#e2e1dc', cp: 'rings', l: 'ball', nm: 'metal', info: 'двухсводчатая глубокого заложения; свод расчленён поперечными кольцами, мрамор «уфалей»' },
      { n: 'Охотный Ряд', sid: 's10', d: 890, y: 1935, dp: 15, t: 'pylon', deep: true, cs: 8, c: '#dcdcd8', c2: '#8f8f8c', w: '#e3e0d8', wp: 'marble', wl: '#3a3a38', wa: '#cfcbc0', f: ['#8c8c8a', '#6e6e6c'], fp: 'plain', ce: '#eeece6', cp: 'flat', l: 'ball', nm: 'plate', info: 'пилоны в виде сдвоенных многогранных колонн из белого и серого мрамора' },
      { n: 'Библиотека имени Ленина', sid: 's11', d: 940, y: 1935, dp: 12, t: 'vault', c: '#d8b866', w: '#e2c96e', wp: 'tile', wl: '#7a6330', wa: '#d8b866', f: ['#8e8e8b', '#76766f'], fp: 'plain', ce: '#efe9d6', cp: 'coffer', l: 'ball', nm: 'metal', info: 'односводчатая мелкого заложения; свод с кессонами, стены — жёлтая плитка и мрамор' },
      { n: 'Кропоткинская', sid: 's12', d: 1230, y: 1935, dp: 13, t: 'col', cs: 6, csh: 'flare', c: '#e7e5e0', w: '#e2e0da', wp: 'marble', wl: '#9a9893', wa: '#d4d1ca', f: ['#c4958b', '#8f8f8c'], fp: 'check', ce: '#efeee9', cp: 'flat', l: 'capital', nm: 'metal', info: 'десятигранные колонны с раскрывающимися капителями, в которых спрятаны светильники' },
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
      { n: 'Филатов Луг', sid: 's260', d: 3210, y: 2019, dp: 0, t: 'ground', c: '#f4f4f2', c2: '#f2c53d', w: '#bcd8e0', wp: 'glass', wl: '#e9e9e6', wa: '#f2c53d', f: ['#d9d9d6', '#bdbdba'], fp: 'plain', ce: '#f4f4f2', cp: 'arch', l: 'led', nm: 'plate', info: 'наземная крытая станция в стиле старинных вокзалов; стеклянные стены, жёлтые акценты' },
      { n: 'Прокшино', sid: 's261', d: 1960, y: 2019, dp: 0, t: 'ground', c: '#f4f4f2', c2: '#d42a2a', w: '#bcd8e0', wp: 'glass', wl: '#e9e9e6', wa: '#d42a2a', f: ['#d9d9d6', '#bdbdba'], fp: 'plain', ce: '#f4f4f2', cp: 'arch', l: 'led', nm: 'plate', info: 'наземная крытая станция со стеклянными стенами; красные и жёлтые элементы' },
      { n: 'Ольховая', sid: 's262', d: 1240, y: 2019, dp: 12, t: 'span', c: '#f2f0ea', w: '#f3f1ea', wp: 'origami', wl: '#e8862a', wa: '#f2c53d', f: ['#c9c6bf', '#a9a69f'], fp: 'stripe', ce: '#f5f3ee', cp: 'origami', l: 'led', nm: 'plate', info: 'однопролётная; оформление в стиле оригами — белый, жёлтый и оранжевый' },
      { n: 'Новомосковская', sid: 's263', d: 1800, y: 2019, dp: 15, t: 'col', cs: 7, csh: 'rnd', c: '#dcdcd8', w: '#9b1b30', wp: 'panel', wl: '#3a3a3a', wa: '#b5283f', f: ['#bdb6a8', '#8e8e8c'], fp: 'stripe', ce: '#e6e3dc', cp: 'flat', l: 'led', nm: 'plate', info: 'путевые стены — рубиново-красные металлокерамические панели' },
      { n: 'Потапово', sid: 's444', d: 0, y: 2024, dp: 15, t: 'col', cs: 7, csh: 'rnd', c: '#e4e4e0', w: '#5f7f74', wp: 'panel', wl: '#2e3a36', wa: '#86a89c', f: ['#c2c0b9', '#8e8e8c'], fp: 'stripe', ce: '#e9e9e6', cp: 'flat', l: 'led', nm: 'plate', info: 'конечная станция, открыта в 2024 году' },
    ],
    // открытые участки (в «прямых» координатах линии, относительно центров станций)
    outdoor: [
      { from: ['Воробьёвы горы', -620], to: ['Воробьёвы горы', 420], kind: 'bridge' },
      { from: ['Саларьево', 1250], to: ['Прокшино', 760], kind: 'surface' },
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
};

export const PLAYABLE = ['ln1', 'ln6'];

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
