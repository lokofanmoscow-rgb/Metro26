import json, re, sys
sys.path.insert(0, 'tools')
prep = json.load(open(sys.argv[1])); pages = json.load(open(sys.argv[2]))
from wikifetch_vars import variants, LN
NUM = {'ln1': ['1'], 'ln2': ['2'], 'ln3': ['3'], 'ln4': ['4', '4А', '4A'], 'ln6': ['6'], 'ln16': ['16'], 'ln5': ['5'], 'ln7': ['7'], 'ln8': ['8', '8А', '8A'], 'ln9': ['9'], 'ln10': ['10'], 'ln11': ['11', '11А'], 'ln12': ['12'], 'ln15': ['15'], 'ln17': ['17', '18']}
def ok(wt, ln):
    if 'Московский метрополитен' not in wt and 'ММ|' not in wt: return False
    m = re.findall(r'\|\s*Линия\d?\s*=\s*\{\{ММ\|([0-9]+[АA]?)', wt)
    return any(x in NUM[ln] for x in m)
res = {}
miss = []
for ln, v in prep.items():
    for seq in v['seqs']:
        for st in seq:
            found = None
            for nm in variants(st['n']):
                lines = [LN[ln]] + (['Солнцевская линия'] if ln == 'ln8' else [])
                for t in [f'{nm} (станция метро, {l})' for l in lines] + [f'{nm} (станция метро, Москва)', f'{nm} (станция метро)']:
                    p = pages.get(t)
                    if p and ok(p['wikitext'], ln): found = p; break
                if found: break
            if found: res[ln + ':' + st['n']] = found
            else: miss.append((ln, st['n']))
print(len(res), 'matched;', len(miss), 'missing:', miss, file=sys.stderr)
json.dump(res, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False)
