# Загрузка данных OpenStreetMap небольшими квадратами через основной API (лёгкое разовое использование)
import sys, os, time, urllib.request
OUT = sys.argv[1]
AREAS = {
  # Замоскворецкая: Коломенская — Нагатинский метромост — Технопарк — Автозаводская
  'nag': (55.677, 55.707, 37.648, 37.678),
  # Сокольническая: Лужнецкий метромост, «Воробьёвы горы»
  'luzh': (55.700, 55.718, 37.535, 37.575),
  # Сокольническая: наземные крытые «Филатов Луг» и «Прокшино»
  'fil': (55.595, 55.607, 37.395, 37.415),
  'prok': (55.577, 55.589, 37.432, 37.452),
}
DLAT, DLON = 0.006, 0.010
UA = {'User-Agent': 'Metro26-hobby-game/1.0 (one-off download of small areas for 3D scenery; github lokofanmoscow-rgb/Metro26)'}
for name, (la0, la1, lo0, lo1) in AREAS.items():
    i = 0
    la = la0
    while la < la1 - 1e-9:
        lo = lo0
        while lo < lo1 - 1e-9:
            fn = os.path.join(OUT, f'{name}_{la:.3f}_{lo:.3f}.osm')
            if not os.path.exists(fn) or os.path.getsize(fn) < 500:
                bbox = f'{lo:.4f},{la:.4f},{min(lo + DLON, lo1):.4f},{min(la + DLAT, la1):.4f}'
                url = 'https://api.openstreetmap.org/api/0.6/map?bbox=' + bbox
                for t in range(4):
                    try:
                        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                            data = r.read()
                        open(fn, 'wb').write(data); break
                    except Exception as e:
                        print('retry', name, bbox, e, file=sys.stderr); time.sleep(10 * (t + 1))
                print(name, bbox, os.path.getsize(fn) // 1024, 'KB', file=sys.stderr)
                time.sleep(1.5)
            i += 1
            lo += DLON
        la += DLAT
