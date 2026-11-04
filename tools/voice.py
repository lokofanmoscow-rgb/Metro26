# Запись объявлений нейросетевым синтезатором Piper (голоса ru_RU dmitri и denis, наборы данных CC0)
# в MP3 и упаковка в src/assets/voice.json: { текст: base64 }.
# Запуск: python3 voice.py texts.json <каталог с piper и голосами> <выходной json>
import json, sys, os, subprocess, base64, tempfile, re
texts = json.load(open(sys.argv[1], encoding='utf-8'))
D = sys.argv[2]
PIPER = os.path.join(D, 'venv', 'bin', 'piper')
VOICE = {'arr': 'ru_RU-denis-medium.onnx', 'dep': 'ru_RU-dmitri-medium.onnx'}
out = {}
tmp = tempfile.mkdtemp()
for i, t in enumerate(texts):
    say = t['text'].replace('«', '').replace('»', '').replace(' — ', ', ')
    wav = os.path.join(tmp, f'{i}.wav'); mp3 = os.path.join(tmp, f'{i}.mp3')
    subprocess.run([PIPER, '-m', os.path.join(D, VOICE[t['kind']]), '-f', wav, '--length-scale', '1.08', '--sentence-silence', '0.35'], input=say.encode('utf-8'), check=True, capture_output=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ac', '1', '-ar', '22050', '-b:a', '32k', mp3], check=True)
    out[t['text']] = base64.b64encode(open(mp3, 'rb').read()).decode()
    if i % 20 == 0: print(i, len(texts), file=sys.stderr)
json.dump(out, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('clips', len(out), 'bytes', os.path.getsize(sys.argv[3]), file=sys.stderr)
