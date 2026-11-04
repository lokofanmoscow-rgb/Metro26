// Список текстов объявлений для всех игровых линий (для tools/voice.py).
// Запуск: npx esbuild tools/voice.mjs --bundle --platform=node --format=esm --outfile=/tmp/v.mjs && node /tmp/v.mjs > texts.json
import { LINES, PLAYABLE } from '../src/data/lines.js';
import { arrivalText, departText, TERMINAL_TEXT } from '../src/engine/announce.js';
const out = new Map();
out.set(TERMINAL_TEXT, 'arr');
for (const id of PLAYABLE) for (const st of LINES[id].stations) {
  out.set(arrivalText(st.n, st.sid), 'arr');
  out.set(departText(st.n), 'dep');
}
console.log(JSON.stringify([...out].map(([text, kind]) => ({ text, kind })), null, 0));
