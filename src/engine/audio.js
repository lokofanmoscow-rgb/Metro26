// Звуки поезда (WebAudio) и голосовые объявления.
// Звук собран из шумовых источников через фильтры (а не из «чистых» генераторов):
// качение колёс, зубчатая передача, тяговые двигатели, реостатный контроллер у 81-717,
// инвертор у новых поездов, тормоза, двери, вентиляция, компрессор. Всё проходит через
// реверберацию тоннеля/зала, громкость которой зависит от того, где находится поезд.

const WHEEL_D = 0.78; // диаметр колеса, м
const GEAR = 5.33; // передаточное число редуктора
const PINION = 15; // зубьев на шестерне

export class Sound {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.voice = true;
    this.enabled = true;
    this.lastJoint = new Map();
    this.rkStep = 0;
    this.prevTr = 0;
    this.compT = 25;
    this.compOn = false;
    this.active = false;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    const sr = ctx.sampleRate;
    // выход: компрессор, «кабина» (лёгкий фильтр), реверберация
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.ratio.value = 4; this.comp.attack.value = 0.01; this.comp.release.value = 0.25;
    this.comp.connect(ctx.destination);
    this.out = ctx.createGain(); this.out.gain.value = this.active === false ? 0 : this.volume;
    this.out.connect(this.comp);
    this.tone = ctx.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 7000; this.tone.Q.value = 0.5;
    this.tone.connect(this.out);
    this.dry = ctx.createGain(); this.dry.gain.value = 1; this.dry.connect(this.tone);
    this.rev = ctx.createConvolver();
    this.rev.buffer = this._impulse(2.4, 2.6);
    this.wet = ctx.createGain(); this.wet.gain.value = 0.35;
    this.rev.connect(this.wet).connect(this.tone);
    this.send = ctx.createGain(); this.send.gain.value = 1; this.send.connect(this.rev);

    // буферы шума
    const mk = (fn) => {
      const len = sr * 3, b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0);
      fn(d, len);
      return b;
    };
    this.white = mk((d, n) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
    this.brown = mk((d, n) => { let l = 0; for (let i = 0; i < n; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } });
    this.pink = mk((d, n) => {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + w * 0.5362) * 0.11;
      }
    });
    const loop = (buf, rate = 1) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = rate; s.start(0, Math.random() * 2); return s; };
    // цепочка: источник -> фильтры -> гейн -> (dry + send)
    const chain = (src, filters, sendAmt = 0.5) => {
      let node = src;
      for (const f of filters) { node.connect(f); node = f; }
      const g = ctx.createGain(); g.gain.value = 0;
      node.connect(g);
      g.connect(this.dry);
      const s = ctx.createGain(); s.gain.value = sendAmt; g.connect(s).connect(this.send);
      return g;
    };
    const bq = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

    // качение: низкий гул тележек и шорох колёс по рельсам
    this.rumbleF = bq('lowpass', 90, 0.8);
    this.rumble = chain(loop(this.brown), [this.rumbleF], 0.6);
    this.rollF = bq('bandpass', 400, 0.6);
    this.roll = chain(loop(this.pink), [this.rollF], 0.5);
    this.hissF = bq('bandpass', 2600, 1.2);
    this.hiss = chain(loop(this.white), [this.hissF, bq('lowpass', 6000)], 0.3);
    // поток воздуха в тоннеле
    this.windF = bq('lowpass', 500, 0.5);
    this.wind = chain(loop(this.pink, 0.7), [this.windF], 0.8);

    // зубчатая передача: узкополосный шум + слабый тон (вой редуктора)
    this.gearF = bq('bandpass', 300, 22);
    this.gear = chain(loop(this.white), [this.gearF], 0.5);
    this.gearF2 = bq('bandpass', 600, 30);
    this.gear2 = chain(loop(this.white), [this.gearF2], 0.4);
    this.gearO = ctx.createOscillator(); this.gearO.type = 'sine';
    this.gearOg = chain(this.gearO, [bq('lowpass', 3000)], 0.4);
    this.gearO.start();

    // коллекторные двигатели 81-717: «рычащий» гул, промодулированный вращением ротора
    this.motF = bq('bandpass', 120, 2.5);
    this.motAM = ctx.createGain(); this.motAM.gain.value = 0.7;
    this.mot = chain(loop(this.brown), [this.motF, this.motAM], 0.5);
    this.motLfo = ctx.createOscillator(); this.motLfo.frequency.value = 8;
    this.motLfoG = ctx.createGain(); this.motLfoG.gain.value = 0.3;
    this.motLfo.connect(this.motLfoG).connect(this.motAM.gain); this.motLfo.start();
    this.hum = ctx.createOscillator(); this.hum.type = 'triangle';
    this.humG = chain(this.hum, [bq('lowpass', 400)], 0.4);
    this.hum.start();

    // асинхронный привод (775/740): тон инвертора и его гармоники
    this.inv = []; this.invG = [];
    for (const [k, type] of [[1, 'sine'], [2, 'sine'], [3, 'triangle']]) {
      const o = ctx.createOscillator(); o.type = type; o.start();
      const g = chain(o, [bq('lowpass', 4500)], 0.35);
      this.inv.push({ o, k }); this.invG.push(g);
    }
    this.carrierF = bq('bandpass', 1800, 18);
    this.carrier = chain(loop(this.white), [this.carrierF], 0.2);

    // тормозные колодки (скрип на малой скорости)
    this.squealF = bq('bandpass', 3100, 45);
    this.squeal = chain(loop(this.white), [this.squealF], 0.5);
    // вентиляция кабины и мотор-компрессор
    this.fanF = bq('lowpass', 700, 0.6);
    this.fan = chain(loop(this.pink, 0.5), [this.fanF], 0.1);
    this.compF = bq('bandpass', 160, 3);
    this.compAM = ctx.createGain(); this.compAM.gain.value = 0.6;
    this.compr = chain(loop(this.brown), [this.compF, this.compAM], 0.3);
    const cl = ctx.createOscillator(); cl.frequency.value = 14; const clg = ctx.createGain(); clg.gain.value = 0.4;
    cl.connect(clg).connect(this.compAM.gain); cl.start();
    // сигнал АРС
    this.ars = ctx.createOscillator(); this.ars.type = 'sine'; this.ars.frequency.value = 1050;
    this.arsG = chain(this.ars, [bq('lowpass', 3000)], 0.2); this.ars.start();
    // гул платформы
    this.crowdF = bq('bandpass', 380, 0.9);
    this.crowd = chain(loop(this.pink), [this.crowdF], 1.0);
  }

  // синтетическая импульсная характеристика: ранние отражения стен тоннеля + затухание
  _impulse(sec, decay) {
    const ctx = this.ctx, sr = ctx.sampleRate, n = Math.floor(sr * sec);
    const b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / sec, decay) * Math.exp(-t * 1.5);
      }
      for (let k = 1; k < 12; k++) {
        const i = Math.floor(sr * (0.011 * k + ch * 0.003));
        if (i < n) d[i] += (0.5 / k) * (k % 2 ? 1 : -1);
      }
    }
    return b;
  }

  setVolume(v) { this.volume = v; if (this.out) this.out.gain.setTargetAtTime(this.active ? v : 0, this.ctx.currentTime, 0.02); }

  // в меню и на паузе поезд не должен звучать: глушим общий выход
  setActive(on) {
    this.active = on;
    if (!on) this.stopAll();
    if (this.out) this.out.gain.setTargetAtTime(on ? this.volume : 0, this.ctx.currentTime, on ? 0.15 : 0.02);
  }

  burst({ dur = 0.08, freq = 1800, q = 1.2, gain = 0.3, type = 'bandpass', delay = 0, src = 'white', send = 0.5 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this[src];
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g); g.connect(this.dry);
    const sg = ctx.createGain(); sg.gain.value = send; g.connect(sg).connect(this.send);
    s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
  }

  thump(gain = 0.5, freq = 70, delay = 0, dur = 0.25) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.8, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.dry);
    const sg = ctx.createGain(); sg.gain.value = 0.6; g.connect(sg).connect(this.send);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // щелчок контактора/реостатного контроллера
  click(gain = 0.25) {
    this.burst({ dur: 0.035, freq: 2400, q: 3, gain, send: 0.3 });
    this.burst({ dur: 0.06, freq: 700, q: 2, gain: gain * 0.6, src: 'brown', send: 0.3 });
  }

  // стук колёс на стыках рельсов: удар + звон рельса
  joints(s, v, axles, outdoor) {
    if (!this.ctx || v < 0.4) return;
    const g = Math.min(0.55, 0.06 + v * 0.02) * (outdoor ? 0.75 : 1);
    axles.forEach((off, i) => {
      const k = Math.floor((s - off) / 25);
      const prev = this.lastJoint.get(i);
      if (prev !== undefined && k !== prev) {
        const near = i < 4 ? 1 : 0.55;
        this.thump(g * 0.9 * near, 55 + Math.random() * 15, 0, 0.18);
        this.burst({ dur: 0.05, freq: 650 + Math.random() * 250, q: 1.6, gain: g * 0.55 * near, src: 'brown' });
        this.burst({ dur: 0.12, freq: 3200 + Math.random() * 600, q: 6, gain: g * 0.08 * near });
      }
      this.lastJoint.set(i, k);
    });
  }

  update(st) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = st.v; // м/с
    const kmh = v * 3.6;
    const sm = (p, val, tc = 0.08) => p.setTargetAtTime(val, t, tc);
    const tr = st.traction, br = st.brake;
    const env = st.env || 'tunnel';
    // среда: тоннель — сильная реверберация, станция — длиннее и тише, улица — почти сухо
    sm(this.wet.gain, env === 'outdoor' ? 0.06 : env === 'station' ? 0.42 : 0.55, 0.6);
    sm(this.tone.frequency, st.cab ? 5200 : 8000, 0.3);
    const inside = st.cab ? 1 : 0.6;
    // качение
    const vv = Math.min(1, v / 22);
    sm(this.rumble.gain, (0.05 + 0.5 * vv) * Math.min(1, v / 1.5) * inside);
    sm(this.rumbleF.frequency, 60 + v * 4);
    sm(this.roll.gain, 0.22 * vv * Math.min(1, v / 2));
    sm(this.rollF.frequency, 250 + v * 22);
    sm(this.hiss.gain, 0.035 * vv * vv * (env === 'outdoor' ? 0.6 : 1));
    sm(this.wind.gain, env === 'outdoor' ? 0.02 * vv : 0.16 * vv * vv);
    sm(this.windF.frequency, 250 + v * 25);
    // частоты вращения
    const wheelHz = v / (Math.PI * WHEEL_D);
    const motorHz = wheelHz * GEAR;
    const gearHz = motorHz * PINION;
    const load = Math.max(tr, br > 0.2 && v > 2 ? br * 0.8 : 0);
    const gearOn = Math.min(1, v / 3);
    sm(this.gearF.frequency, Math.max(40, gearHz));
    sm(this.gearF2.frequency, Math.max(80, gearHz * 2));
    sm(this.gearO.frequency, Math.max(40, gearHz));
    sm(this.gear.gain, (0.05 + 0.32 * load) * gearOn * inside);
    sm(this.gear2.gain, (0.02 + 0.12 * load) * gearOn * inside);
    sm(this.gearOg.gain, (0.004 + 0.012 * load) * gearOn * inside);
    if (st.type === '717') {
      // коллекторные ТЭД: гул растёт с током, «рычание» — от оборотов
      sm(this.motF.frequency, 70 + motorHz * 2.2);
      sm(this.motLfo.frequency, Math.max(2, motorHz * 0.5));
      sm(this.mot.gain, (0.04 + 0.55 * load) * Math.min(1, 0.3 + v / 4) * inside);
      sm(this.hum.frequency, Math.max(30, motorHz * 4));
      sm(this.humG.gain, 0.03 * load * Math.min(1, v / 2) * inside);
      for (const g of this.invG) sm(g.gain, 0);
      sm(this.carrier.gain, 0);
      // реостатный контроллер: щелчки при разгоне до выхода на автоматическую характеристику
      if (tr > 0.3 && v < 15) {
        const step = Math.floor(v / 0.85);
        if (step !== this.rkStep && step > this.rkStep) this.click(0.12 + tr * 0.1);
        this.rkStep = step;
      } else this.rkStep = Math.floor(v / 0.85);
    } else {
      // асинхронный привод: плавно растущий «вой» двигателя + высокая несущая ШИМ на трогании
      const f = (st.type === '740' ? 42 : 50) + kmh * (st.type === '740' ? 7.5 : 8.5);
      const ig = (0.01 + 0.045 * load) * Math.min(1, v / 0.4 + tr) * inside;
      this.inv.forEach(({ o, k }, i) => { sm(o.frequency, f * k); sm(this.invG[i].gain, ig / (k * k)); });
      const carr = kmh < 18 ? 1 : Math.max(0, 1 - (kmh - 18) / 18);
      sm(this.carrier.gain, 0.06 * load * carr * inside);
      sm(this.carrierF.frequency, (st.type === '740' ? 1050 : 1250) + kmh * 6);
      sm(this.mot.gain, 0.06 * load * Math.min(1, v / 3) * inside);
      sm(this.motF.frequency, 60 + motorHz * 2);
      sm(this.humG.gain, 0);
    }
    // контакторы при наборе/сбросе тяги
    if (tr > 0.05 && this.prevTr <= 0.05) this.click(0.3);
    if (tr <= 0.05 && this.prevTr > 0.05) this.click(0.2);
    this.prevTr = tr;
    // колодочный тормоз на малой скорости
    sm(this.squeal.gain, br > 0.25 && v > 0.1 && v < 4 ? 0.12 * br * (1 - v / 4) : 0, 0.05);
    sm(this.squealF.frequency, 2900 + v * 80);
    // вентиляция и мотор-компрессор (включается периодически)
    sm(this.fan.gain, st.cab ? 0.05 : 0.015, 0.5);
    this.compT -= 1 / 60;
    if (this.compT <= 0) { this.compOn = !this.compOn; this.compT = this.compOn ? 14 + Math.random() * 6 : 40 + Math.random() * 40; }
    sm(this.compr.gain, this.compOn ? (st.cab ? 0.07 : 0.03) : 0, 0.6);
    // АРС — прерывистый сигнал
    sm(this.arsG.gain, st.overspeed && (Math.floor(t * 3) % 2 === 0) ? 0.05 : 0, 0.01);
    sm(this.crowd.gain, st.atStation ? 0.06 : 0, 0.6);
  }

  brakeHiss(strength = 1) {
    this.burst({ dur: 0.9, freq: 4200, q: 0.5, gain: 0.12 * strength, type: 'highpass', send: 0.6 });
  }

  doors(open, type = '717') {
    if (!this.ctx) return;
    // пневматика дверей, движение створок и удар в конце хода
    if (open) {
      this.burst({ dur: 0.8, freq: 3800, q: 0.5, gain: 0.14, type: 'highpass', send: 0.6 });
      this.burst({ dur: 1.8, freq: 450, q: 1, gain: 0.1, src: 'brown', delay: 0.15 });
      this.thump(0.35, 75, 2.15);
      this.burst({ dur: 0.1, freq: 900, q: 1, gain: 0.15, delay: 2.15 });
    } else {
      if (type !== '717') {
        // у новых поездов перед закрытием — короткие звуковые сигналы
        for (let i = 0; i < 3; i++) this._beep(1650, 0.12, 0.06, i * 0.35);
      }
      this.burst({ dur: 0.8, freq: 3800, q: 0.5, gain: 0.14, type: 'highpass', send: 0.6, delay: 1.35 });
      this.burst({ dur: 2.8, freq: 450, q: 1, gain: 0.1, src: 'brown', delay: 1.5 });
      this.thump(0.8, 55, 4.35, 0.35);
      this.burst({ dur: 0.12, freq: 900, q: 1, gain: 0.3, delay: 4.35 });
    }
  }

  _beep(freq, dur, gain, delay) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.01); g.gain.setValueAtTime(gain, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    o.connect(g); g.connect(this.dry); o.start(t); o.stop(t + dur + 0.05);
  }

  say(text, { male = true, rate = 1.0 } = {}) {
    if (!this.voice) return;
    // в приложении для Android объявления читает системный синтезатор речи
    if (window.AndroidTTS && window.AndroidTTS.speak) { try { window.AndroidTTS.speak(text, male ? 1 : 0); } catch (e) { /* */ } return; }
    if (!window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU'; u.rate = rate; u.pitch = male ? 0.85 : 1.1; u.volume = Math.min(1, this.volume + 0.1);
      const vs = window.speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('ru'));
      if (vs.length) {
        const pick = vs.find((v) => (male ? /male|dmitri|pavel|yuri|муж/i : /female|irina|milena|anna|жен/i).test(v.name)) || vs[0];
        u.voice = pick;
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* речь недоступна */ }
  }

  stopAll() {
    if (window.AndroidTTS && window.AndroidTTS.stop) try { window.AndroidTTS.stop(); } catch (e) { /* */ }
    if (window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
  }
}
