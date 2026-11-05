# Статьи русской Википедии о станциях (пачками по 50 заголовков, с перенаправлениями).
# Запуск: python3 wikifetch.py <lines_prep.json> <выход.json>
import json, sys, time, re, urllib.request, urllib.parse
UA = {'User-Agent': 'Metro26-game-research/1.0 (educational hobby game; one-off batch)'}
def api(**p):
    p['format'] = 'json'
    data = urllib.parse.urlencode(p).encode()
    for i in range(7):
        try:
            with urllib.request.urlopen(urllib.request.Request('https://ru.wikipedia.org/w/api.php', data=data, headers=UA), timeout=60) as r:
                return json.loads(r.read().decode())
        except Exception as e:
            print('retry', e, file=sys.stderr); time.sleep(5 * 2 ** i)
    return None
LN = {'ln1': 'Сокольническая линия', 'ln2': 'Замоскворецкая линия', 'ln3': 'Арбатско-Покровская линия', 'ln4': 'Филёвская линия', 'ln6': 'Калужско-Рижская линия', 'ln16': 'Троицкая линия', 'ln5': 'Кольцевая линия', 'ln7': 'Таганско-Краснопресненская линия', 'ln8': 'Калининская линия', 'ln9': 'Серпуховско-Тимирязевская линия',
      'ln10': 'Люблинско-Дмитровская линия', 'ln11': 'Большая кольцевая линия', 'ln12': 'Бутовская линия', 'ln15': 'Некрасовская линия', 'ln17': 'Рублёво-Архангельская линия'}
GENERIC = {'парк', 'проспект', 'бульвар', 'шоссе', 'площадь', 'улица', 'поле', 'центр', 'роща', 'мост', 'аллея', 'затон', 'сад', 'вокзал', 'город', 'застава', 'пруды', 'лихоборы', 'ворота'}
def variants(n):
    w = n.split(' ')
    low = ' '.join([w[0]] + [x.lower() for x in w[1:]])
    gen = ' '.join([w[0]] + [x.lower() if x.lower() in GENERIC else x for x in w[1:]])
    return list(dict.fromkeys([gen, n, low]))
prep = json.load(open(sys.argv[1]))
want = {}  # заголовок -> список (линия, станция)
for ln, v in prep.items():
    for seq in v['seqs']:
        for st in seq:
            for nm in variants(st['n']):
                lines = [LN[ln]] + (['Солнцевская линия'] if ln == 'ln8' else [])
                for t in [f'{nm} (станция метро, {l})' for l in lines] + [f'{nm} (станция метро, Москва)', f'{nm} (станция метро)']:
                    want.setdefault(t, set()).add((ln, st['n']))
titles = list(want)
pages = {}
for i in range(0, len(titles), 50):
    chunk = titles[i:i + 50]
    d = api(action='query', prop='revisions', rvprop='content', rvslots='main', titles='|'.join(chunk), redirects=1)
    if not d: print('FAIL chunk', i, file=sys.stderr); continue
    q = d['query']
    rd = {r['from']: r['to'] for r in q.get('redirects', [])}
    nz = {r['from']: r['to'] for r in q.get('normalized', [])}
    byt = {}
    for pg in q['pages'].values():
        if 'missing' in pg or 'revisions' not in pg: continue
        byt[pg['title']] = pg['revisions'][0]['slots']['main']['*']
    for t in chunk:
        t2 = nz.get(t, t); t3 = rd.get(t2, t2)
        if t3 in byt: pages[t] = {'title': t3, 'wikitext': byt[t3]}
    print('chunk', i, len(pages), file=sys.stderr)
    time.sleep(3)
json.dump(pages, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False)
