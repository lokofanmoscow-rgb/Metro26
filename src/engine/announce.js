// Тексты объявлений в вагоне и пересадки со станций (по схеме метро).
// Записи объявлений готовятся заранее (tools/voice.mjs + tools/voice.py) и лежат в assets/voice.json.
import { SCHEME } from '../data/scheme.js';

function accusative(name) {
  return name.split(' ').map((w) => {
    const lw = w.toLowerCase();
    if (lw === 'линия') return 'линию';
    if (/ая$/.test(lw)) return w.slice(0, -2) + 'ую';
    return w;
  }).join(' ').replace(/Линию/g, 'линию');
}

// пересадки со станции (по схеме)
export function transfersFor(sid) {
  const grp = SCHEME.transfers.find((g) => g.includes(sid));
  if (!grp) return [];
  const st = Object.fromEntries(SCHEME.stations.map((s) => [s.id, s]));
  const me = st[sid];
  const out = [];
  for (const id of grp) {
    if (id === sid || !st[id] || st[id].uc) continue;
    if (st[id].line === me.line) continue;
    const ln = SCHEME.lines.find((l) => l.id === st[id].line);
    if (ln && !out.some((o) => o.line.id === ln.id)) out.push({ station: st[id].name, line: ln });
  }
  return out;
}

export function arrivalText(name, sid) {
  const tr = transfersFor(sid);
  let text = `Станция «${name}».`;
  if (tr.length) text += ` Переход на ${tr.map((t) => accusative(t.line.name)).join(' и ')}.`;
  return text;
}
export const TERMINAL_TEXT = 'Конечная. Поезд дальше не идёт, просьба выйти из вагонов.';
export function departText(nextName) { return `Осторожно, двери закрываются. Следующая станция — ${nextName}.`; }
