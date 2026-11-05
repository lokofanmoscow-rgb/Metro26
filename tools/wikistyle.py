# Параметры оформления станций из статей Википедии (карточка + раздел об оформлении).
# Эвристика: тип конструкции и глубина — из карточки; цвета колонн, путевых стен, пола и потолка —
# по словам-цветам в предложениях раздела «Оформление/Архитектура».
import json, re, sys
def clean(t):
    t = re.sub(r'<ref[^>]*/>', '', t); t = re.sub(r'<ref.*?</ref>', '', t, flags=re.S)
    t = re.sub(r'\{\{[^{}]*\}\}', '', t); t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    t = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', t)
    t = re.sub(r"'''?", '', t); t = re.sub(r'<[^>]+>', '', t)
    return t
def field(wt, f, raw=False):
    m = re.search(r'\|[ \t]*' + f + r'[ \t]*=[ \t]*([^\n]*)', wt)
    if not m: return ''
    return m.group(1) if raw else clean(m.group(1)).strip()
COL = [('тёмно-сер', '#6e6e6c'), ('темно-сер', '#6e6e6c'), ('светло-сер', '#c9c9c6'), ('серебрист', '#c3c6c9'), ('бело-сер', '#d9d9d6'), ('сер', '#a9a9a6'),
       ('бел', '#ebe9e3'), ('чёрн', '#2a2a2a'), ('черн', '#2a2a2a'), ('бордов', '#7a2a2a'), ('красн', '#9a3a32'), ('розов', '#d9a99b'),
       ('терракот', '#b0584a'), ('оранжев', '#e0782d'), ('охр', '#c9a25a'), ('золот', '#c9a24a'), ('жёлт', '#e3cf7a'), ('желт', '#e3cf7a'),
       ('бежев', '#ddcfb4'), ('песочн', '#d9c49a'), ('кремов', '#efe3c6'), ('коричнев', '#7a5a46'), ('изумруд', '#2f7a5a'), ('салатов', '#9ac25a'),
       ('зелён', '#4f7a5a'), ('зелен', '#4f7a5a'), ('бирюз', '#3aa8a0'), ('голуб', '#9ac2d8'), ('син', '#3d6fa8'), ('фиолет', '#7b3fa3'),
       ('сирен', '#a08ac0'), ('стальн', '#b8bcc0'), ('нержав', '#b8bcc0'), ('алюмин', '#c3c6c9'), ('коелг', '#e8e6e0'), ('уфалей', '#d6d6d2'), ('газган', '#e8e0c6')]
def colors(s):
    s = s.lower(); out = []
    i = 0
    hits = []
    for k, c in COL:
        for m in re.finditer(k, s): hits.append((m.start(), k, c))
    hits.sort()
    used = []
    for pos, k, c in hits:
        if any(pos >= a and pos < b for a, b in used): continue
        used.append((pos, pos + len(k) + 3)); out.append(c)
    return out
def sentences(t): return [x.strip() for x in re.split(r'(?<=[.!?])\s+', t) if x.strip()]
def section(wt):
    out = []
    for m in re.finditer(r'\n(==+)\s*([^=\n]+?)\s*\1\s*\n(.*?)(?=\n==[^=]|\Z)', wt, re.S):
        h = m.group(2).lower()
        if any(k in h for k in ('оформлен', 'архитектур', 'конструкц', 'характеристик')): out.append(m.group(3))
    return clean('\n'.join(out))
def style(ln, color, wt, name):
    tc = field(wt, 'Тип конструкции').lower()
    dep = field(wt, 'Глубина заложения')
    year = re.search(r'(19[3-9]\d|20[0-2]\d)', field(wt, 'Дата открытия', raw=True))
    year = int(year.group(1)) if year else 2000
    plat = (field(wt, 'Тип платформы') + ' ' + field(wt, 'Число платформ')).lower()
    deep = 'глубок' in tc
    try: dp = float(re.search(r'[\d,.]+', dep).group(0).replace(',', '.'))
    except Exception: dp = 45 if deep else 12
    st = {}
    side = 'берегов' in plat or 'боков' in plat or re.search(r'\b2\b', plat) is not None
    if 'наземн' in tc or 'эстакад' in tc or 'надземн' in tc:
        t = 'side' if side else 'ground'
        if 'открыт' in tc: st['open'] = True
        dp = 0
        if 'эстакад' in tc or 'надземн' in tc: st['elev'] = True
    elif 'пилон' in tc: t = 'pylon'
    elif 'колонно-стенов' in tc: t = 'cold'
    elif 'колонн' in tc and deep: t = 'cold'
    elif 'колонн' in tc: t = 'col'
    elif 'односвод' in tc or 'однопролёт' in tc or 'однопролет' in tc: t = 'vault'
    else: t = 'cold' if deep else 'col'
    if t in ('col', 'cold', 'pylon', 'vault') and side and not deep and t != 'vault': pass
    txt = section(wt)
    S = sentences(txt)
    def find(keys, excl=()):
        for s in S:
            l = s.lower()
            if any(k in l for k in keys) and not any(e in l for e in excl):
                c = colors(s)
                if c: return c, s
        return [], ''
    cc, cs_ = find(['колонн', 'пилон'])
    wc, ws_ = find(['путевые стены', 'путевых стен', 'путевая стена', 'стены облицованы', 'стены станции', 'стены отделаны', 'стены покрыты', 'путевые стен'])
    fc, fs_ = find(['пол ', 'пол,', 'пол выложен', 'полы', 'покрытие пола', 'пол —', 'пол облицован'])
    ce, ces_ = find(['потол', 'свод'])
    pc, _ = find(['цокол'])
    allc = colors(txt)
    default_w = '#e6e4de'
    c = (cc or allc or ['#d9d6cf'])[0]
    w = (wc or [default_w])[0]
    f1 = (fc or ['#8e8e8c'])[0]; f2 = fc[1] if len(fc) > 1 else ('#6e6e6c' if f1 != '#6e6e6c' else '#8e8e8c')
    low = txt.lower()
    wp = 'marble'
    if re.search(r'плитк', ws_.lower() or low): wp = 'tile'
    if re.search(r'панел|алюмин|стеклоэмал|композит', (ws_ or '').lower()): wp = 'panel'
    if year >= 2010 and wp == 'marble' and 'мрамор' not in (ws_ or '').lower(): wp = 'panel'
    fp = 'check' if 'шахмат' in fs_.lower() else 'stripe' if 'полос' in fs_.lower() else 'plain'
    cp = 'coffer' if 'кессон' in low else 'rib' if ('ребрист' in low or 'рёбр' in low) else 'grid' if ('решётч' in low or 'решетч' in low) else ('rib' if t == 'col' and year < 1990 else 'flat')
    if t == 'vault' and cp == 'flat': cp = 'rib' if year < 2000 else 'flat'
    l = 'chand' if 'люстр' in low else 'cornice' if 'карниз' in low else 'niche' if ('светильник' in low and 'ниш' in low) else 'led' if (year >= 2010 or 'светодиод' in low) else 'strip' if t in ('col', 'cold') else 'cornice' if t == 'pylon' else 'niche' if t == 'vault' else 'strip'
    csh = 'rnd' if re.search(r'кругл|цилиндр', cs_.lower()) else 'fac' if re.search(r'восьмигран|гранён|гранен', cs_.lower()) else 'sq'
    cs = 9 if t == 'pylon' else 6 if t == 'cold' else (4 if year < 1970 else 6.5 if year < 2005 else 8)
    st.update({'t': t, 'deep': deep, 'dp': round(dp, 1), 'y': year, 'cs': cs, 'csh': csh, 'c': c, 'w': w, 'wp': wp, 'wl': (pc or ['#3a3a3a'])[0], 'wa': color,
               'f': [f1, f2], 'fp': fp, 'ce': (ce or ['#ecebe6'])[0], 'cp': cp, 'l': l, 'nm': 'plate' if year >= 2000 else 'metal'})
    if t in ('ground', 'side'): st.pop('deep', None)
    if len(cc) > 1: st['c2'] = cc[1]
    info = (cs_ or ws_ or (S[0] if S else ''))
    info = re.sub(r'\s+', ' ', info)[:170].rstrip(' ,;')
    st['info'] = (tc + ('; ' + info.lower() if info else ''))[:230]
    nm = field(wt, 'Название') or name
    return re.sub(r'\s+', ' ', nm).strip(), st
if __name__ == '__main__':
    prep = json.load(open(sys.argv[1])); wst = json.load(open(sys.argv[2]))
    SCH = json.loads(re.search(r'export const SCHEME = (\{.*\});', open('src/data/scheme.js', encoding='utf-8').read()).group(1))
    colmap = {l['id']: l['color'] for l in SCH['lines']}
    out = {}
    for ln, v in prep.items():
        seqs = []
        for seq in v['seqs']:
            lst = []
            for st in seq:
                p = wst[ln + ':' + st['n']]
                nm, sty = style(ln, colmap[ln], p['wikitext'], st['n'])
                lst.append({'n': nm, 'sid': st['sid'], 'd': st['d'], **sty})
            seqs.append(lst)
        out[ln] = seqs
    json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for ln, seqs in out.items():
        for seq in seqs:
            print(ln, ' | '.join(f"{s['n']}:{s['t']}{'/o' if s.get('open') else ''}{'/e' if s.get('elev') else ''}{'/D' if s.get('deep') else ''}{s['dp']} {s['y']} c{s['c']} w{s['w']}" for s in seq))
