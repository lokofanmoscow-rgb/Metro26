import xml.etree.ElementTree as ET, glob, os, json, math
def load(area, d):
    nodes, ways, rels = {}, {}, {}
    for fn in sorted(glob.glob(os.path.join(d, area + '_*.osm'))):
        root = ET.parse(fn).getroot()
        for el in root:
            if el.tag == 'node':
                nid = int(el.get('id'))
                tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
                nodes[nid] = (float(el.get('lat')), float(el.get('lon')), tags)
            elif el.tag == 'way':
                wid = int(el.get('id'))
                ways[wid] = ([int(n.get('ref')) for n in el.findall('nd')], {t.get('k'): t.get('v') for t in el.findall('tag')})
            elif el.tag == 'relation':
                rid = int(el.get('id'))
                rels[rid] = ([(m.get('type'), int(m.get('ref')), m.get('role')) for m in el.findall('member')], {t.get('k'): t.get('v') for t in el.findall('tag')})
    return nodes, ways, rels
