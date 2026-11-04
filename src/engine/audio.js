// Синтезированные звуки поезда (WebAudio) и голосовые объявления (Web Speech API).
export class Sound {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.voice = true;
    this.enabled = true;
    this.lastJoint = new Map();
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(ctx.destination);
    // шум
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    this.brown = buf;
    const wb = ctx.createBuffer(1, len, ctx.sampleRate);
    const wd = wb.getChannelData(0);
    for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    this.white = wb;
    const loop = (b) => { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.start(); return s; };
    // качение
    this.roll = loop(this.brown);
    this.rollF = ctx.createBiquadFilter(); this.rollF.type = 'lowpass'; this.rollF.frequency.value = 300;
    this.rollG = ctx.createGain(); this.rollG.gain.value = 0;
    this.roll.connect(this.rollF).connect(this.rollG).connect(this.master);
    // шум тоннеля (ветер)
    this.wind = loop(this.white);
    this.windF = ctx.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.frequency.value = 600; this.windF.Q.value = 0.6;
    this.windG = ctx.createGain(); this.windG.gain.value = 0;
    this.wind.connect(this.windF).connect(this.windG).connect(this.master);
    // тяговые двигатели
    this.motorG = ctx.createGain(); this.motorG.gain.value = 0;
    this.motorF = ctx.createBiquadFilter(); this.motorF.type = 'lowpass'; this.motorF.frequency.value = 1200;
    this.m1 = ctx.createOscillator(); this.m1.type = 'sawtooth';
    this.m2 = ctx.createOscillator(); this.m2.type = 'square';
    this.m1.connect(this.motorF); this.m2.connect(this.motorF);
    this.motorF.connect(this.motorG).connect(this.master);
    this.m1.start(); this.m2.start();
    // тормоз (визг на малой скорости)
    this.sq = ctx.createOscillator(); this.sq.type = 'sine'; this.sq.frequency.value = 2900;
    this.sqG = ctx.createGain(); this.sqG.gain.value = 0;
    this.sq.connect(this.sqG).connect(this.master); this.sq.start();
    // сигнал АРС
    this.ars = ctx.createOscillator(); this.ars.type = 'square'; this.ars.frequency.value = 1150;
    this.arsG = ctx.createGain(); this.arsG.gain.value = 0;
    this.ars.connect(this.arsG).connect(this.master); this.ars.start();
    // гул платформы
    this.crowd = loop(this.brown);
    this.crowdF = ctx.createBiquadFilter(); this.crowdF.type = 'bandpass'; this.crowdF.frequency.value = 420; this.crowdF.Q.value = 0.9;
    this.crowdG = ctx.createGain(); this.crowdG.gain.value = 0;
    this.crowd.connect(this.crowdF).connect(this.crowdG).connect(this.master);
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  burst({ dur = 0.08, freq = 1800, q = 1.2, gain = 0.3, type = 'bandpass', delay = 0, src = 'white' } = {}) {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = src === 'white' ? this.white : this.brown;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  thump(gain = 0.5, freq = 70, delay = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 1.6, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.12);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.35);
  }

  // стук колёс: axles — смещения осей от головы поезда; s — положение головы
  joints(s, v, axles, outdoor) {
    if (!this.ctx || v < 0.5) return;
    const g = Math.min(0.5, 0.08 + v * 0.018) * (outdoor ? 0.7 : 1);
    axles.forEach((off, i) => {
      const k = Math.floor((s - off) / 25);
      const prev = this.lastJoint.get(i);
      if (prev !== undefined && k !== prev) {
        this.burst({ dur: 0.05, freq: 1400 + Math.random() * 600, q: 2, gain: g * (i < 4 ? 1 : 0.5) });
        this.thump(g * 0.5, 90 + Math.random() * 30);
      }
      this.lastJoint.set(i, k);
    });
  }

  update(st) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const v = st.v; // м/с
    const sm = (p, val, tc = 0.08) => p.setTargetAtTime(val, t, tc);
    sm(this.rollG.gain, Math.min(0.5, v * 0.022) * (st.outdoor ? 0.6 : 1));
    sm(this.rollF.frequency, 200 + v * 28);
    sm(this.windG.gain, st.outdoor ? 0.01 + v * 0.0015 : Math.min(0.18, v * v * 0.00025));
    sm(this.windF.frequency, 300 + v * 30);
    // двигатели
    const tr = st.traction, br = st.brake;
    let mg = 0, f1 = 40, f2 = 80;
    if (st.type === '717') { f1 = 35 + v * 7.5; f2 = f1 * 2.01; mg = (0.05 + tr * 0.11) * Math.min(1, v / 1.5 + tr * 0.4) + (br > 0.1 && v > 2 ? 0.04 : 0); }
    else {
      // асинхронный привод: «поющий» инвертор
      const steps = [0, 6, 12, 18, 30];
      const k = steps.findIndex((x) => v < x);
      f1 = 180 + (v - (steps[Math.max(0, k - 1)] || 0)) * 55 + (k > 1 ? 120 : 0);
      if (v > 22) f1 = 95 + v * 6;
      f2 = f1 * 1.5;
      mg = (0.03 + tr * 0.06) * Math.min(1, v / 1 + tr) + (br > 0.1 && v > 1 ? 0.035 : 0);
    }
    sm(this.m1.frequency, f1); sm(this.m2.frequency, f2);
    sm(this.motorG.gain, mg * (st.cab ? 1 : 0.55));
    sm(this.motorF.frequency, st.type === '717' ? 600 + v * 25 : 1600);
    sm(this.sqG.gain, br > 0.25 && v > 0.15 && v < 3.5 ? 0.015 * br : 0, 0.05);
    sm(this.arsG.gain, st.overspeed && (Math.floor(t * 4) % 2 === 0) ? 0.06 : 0, 0.01);
    sm(this.crowdG.gain, st.atStation ? 0.05 : 0, 0.5);
  }

  brakeHiss(strength = 1) { this.burst({ dur: 0.7, freq: 4500, q: 0.4, gain: 0.08 * strength, type: 'highpass' }); }

  doors(open) {
    if (!this.ctx) return;
    this.burst({ dur: 0.9, freq: 3500, q: 0.5, gain: 0.12, type: 'highpass' });
    if (!open) { this.thump(0.7, 60, 1.9); this.burst({ dur: 0.15, freq: 900, q: 1, gain: 0.25, delay: 1.9 }); }
    else this.thump(0.35, 80, 0.6);
  }

  say(text, { male = true, rate = 1.0 } = {}) {
    if (!this.voice || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU'; u.rate = rate; u.pitch = male ? 0.85 : 1.15; u.volume = Math.min(1, this.volume + 0.1);
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
    if (window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
  }
}
