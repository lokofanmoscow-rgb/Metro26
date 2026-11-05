# Генерация записей LINES для новых линий (src/data/lines.js) из lines_style.json.
import json, re, sys
sty = json.load(open(sys.argv[1]))
META = {
  'ln5': ('5', 'Кольцевая линия', 'Кольцевая', '#925233'), 'ln7': ('7', 'Таганско-Краснопресненская линия', 'Фиолетовая', '#943F90'),
  'ln8': ('8', 'Калининско-Солнцевская линия', 'Жёлтая', '#FFCD1E'), 'ln9': ('9', 'Серпуховско-Тимирязевская линия', 'Серая', '#ADACAC'),
  'ln10': ('10', 'Люблинско-Дмитровская линия', 'Салатовая', '#BED12E'), 'ln11': ('11', 'Большая кольцевая линия', 'БКЛ', '#78C7C9'),
  'ln12': ('12', 'Бутовская линия', 'Бутовская', '#ACBFE3'), 'ln15': ('15', 'Некрасовская линия', 'Розовая', '#F088B6'),
  'ln17': ('17', 'Рублёво-Архангельская линия', 'Рублёвская', '#27303F'),
}
RING = {'ln5', 'ln11'}
OUT = {
  'ln7': "[\n      { osm: 'tkuz', rev: false, anchor: 'Волгоградский проспект', kind: 'open' },\n      { osm: 'vykh', rev: false, anchor: 'Выхино', kind: 'open' },\n    ]",
  'ln8': "[\n      { osm: 'pykh', rev: false, anchor: 'Рассказовка', kind: 'open' },\n    ]",
  'ln12': "[\n      { osm: 'butv', rev: false, anchor: 'Бульвар Адмирала Ушакова', kind: 'open', rise: 7, elev: true },\n    ]",
}
def js(v):
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return str(int(v)) if float(v).is_integer() else str(v)
    if isinstance(v, list): return '[' + ', '.join(js(x) for x in v) + ']'
    return "'" + str(v).replace("\\", "\\\\").replace("'", "\\'") + "'"
ORDER = ['n', 'sid', 'd', 'y', 'dp', 't', 'open', 'elev', 'deep', 'cs', 'csh', 'c', 'c2', 'w', 'wp', 'wl', 'wa', 'f', 'fp', 'ce', 'cp', 'l', 'nm', 'info']
out = []
for ln, seqs in sty.items():
    num, name, short, color = META[ln]
    parts = None
    if ln in RING: stations = seqs[0][:-1]
    elif len(seqs) > 1:
        stations = [s for q in seqs for s in q]; parts = [[s['n'] for s in q] for q in seqs]
    else: stations = seqs[0]
    lines = []
    for s in stations:
        s = dict(s)
        if s.get('t') in ('ground', 'side'): s.pop('deep', None)
        if not s.get('deep'): s.pop('deep', None)
        kv = ', '.join(f'{k}: {js(s[k])}' for k in ORDER if k in s and s[k] is not None)
        lines.append('      { ' + kv + ' },')
    extra = ''
    if ln in RING: extra += "    ring: true,\n"
    if parts: extra += '    parts: ' + js(parts).replace("'], ['", "'],\n      ['") + ',\n'
    out.append(f"""  {ln}: {{
    id: '{ln}',
    num: '{num}',
    name: '{name}',
    short: '{short}',
    color: '{color}',
    exactD: true,
    minSpan: 600,
{extra}    // станции: оформление — по статьям Википедии, длины перегонов — по оси путей OpenStreetMap
    stations: [
{chr(10).join(lines)}
    ],
    outdoor: {OUT.get(ln, '[]')},
  }},
""")
src = open('src/data/lines.js', encoding='utf-8').read()
mark = "  ln16: {\n    id: 'ln16',"
assert mark in src
for ln in sty:
    if f"\n  {ln}: {{\n" in src: raise SystemExit(f'{ln} already present')
src = src.replace(mark, ''.join(out) + mark, 1)
src = src.replace("export const PLAYABLE = ['ln1', 'ln2', 'ln3', 'ln4', 'ln6', 'ln16'];", "export const PLAYABLE = ['ln1', 'ln2', 'ln3', 'ln4', 'ln5', 'ln6', 'ln7', 'ln8', 'ln9', 'ln10', 'ln11', 'ln12', 'ln15', 'ln16', 'ln17'];")
open('src/data/lines.js', 'w', encoding='utf-8').write(src)
print('ok', sum(len(q) for v in sty.values() for q in v))
