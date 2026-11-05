# Запись объявлений нейросетевым синтезатором Piper (голоса ru_RU dmitri и denis, наборы данных CC0)
# в Opus (Ogg, 12 кбит/с — речь; так все линии помещаются в один файл) и упаковка в src/assets/voice.json: { текст: base64 }.
# Запуск: python3 voice.py texts.json <каталог с piper и голосами> <выходной json> [потоков]
# Уже записанные тексты из выходного файла не перезаписываются; промежуточный результат сохраняется.
import json, sys, os, subprocess, base64, tempfile
from concurrent.futures import ThreadPoolExecutor
texts = json.load(open(sys.argv[1], encoding='utf-8'))
D, OUT = sys.argv[2], sys.argv[3]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 4
PIPER = os.path.join(D, 'venv', 'bin', 'piper')
VOICE = {'arr': 'ru_RU-denis-medium.onnx', 'dep': 'ru_RU-dmitri-medium.onnx'}
out = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
todo = [t for t in texts if t['text'] not in out]
tmp = tempfile.mkdtemp()
def one(it):
    i, t = it
    say = t['text'].replace('«', '').replace('»', '').replace(' — ', ', ')
    wav = os.path.join(tmp, f'{i}.wav'); ogg = os.path.join(tmp, f'{i}.ogg')
    subprocess.run([PIPER, '-m', os.path.join(D, VOICE[t['kind']]), '-f', wav, '--length-scale', '1.08', '--sentence-silence', '0.35'], input=say.encode('utf-8'), check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ac', '1', '-c:a', 'libopus', '-b:a', '12k', '-application', 'voip', ogg], check=True)
    return t['text'], base64.b64encode(open(ogg, 'rb').read()).decode()
def save():
    json.dump(out, open(OUT + '.tmp', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); os.replace(OUT + '.tmp', OUT)
with ThreadPoolExecutor(N) as ex:
    for k, (txt, b64) in enumerate(ex.map(one, enumerate(todo))):
        out[txt] = b64
        if k % 20 == 0: save(); print(k, len(todo), file=sys.stderr, flush=True)
save()
print('clips', len(out), 'bytes', os.path.getsize(OUT), file=sys.stderr)
