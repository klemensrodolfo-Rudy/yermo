// Sonido procedural con Web Audio (sin archivos).
import { BLOCKS } from './blocks.js';

export class Sfx {
  constructor() { this.ctx = null; this.vol = 0.6; this.musicVol = 0.5; this.night = 0; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    try { this.ctx = new AudioContext(); } catch { return; }
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.wind();
    this.music();
  }
  mat(id) {
    const b = BLOCKS[id]; if (!b) return 'stone';
    if (b.tool === 'shovel') return 'soft';
    if (b.tool === 'axe') return 'wood';
    if (id === 12 || id === 27 || id === 29 || id === 19) return 'metal';
    if (id === 14) return 'glass';
    return 'stone';
  }
  burst({ freq = 800, q = 1, dur = 0.12, gain = 0.4, type = 'bandpass', pitch = 1 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.playbackRate.value = pitch;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.02);
  }
  tone({ freq = 200, dur = 0.1, gain = 0.2, type = 'triangle', slide = 0.6 }) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  sound(m, strength) {
    const r = 0.9 + Math.random() * 0.2;
    switch (m) {
      case 'soft': this.burst({ freq: 500 * r, q: 0.7, dur: 0.12 * strength, gain: 0.35 * strength, type: 'lowpass' }); break;
      case 'wood': this.burst({ freq: 700 * r, q: 3, dur: 0.1 * strength, gain: 0.5 * strength }); this.tone({ freq: 180 * r, dur: 0.08, gain: 0.15 * strength }); break;
      case 'metal': this.burst({ freq: 3000 * r, q: 8, dur: 0.18 * strength, gain: 0.3 * strength }); this.tone({ freq: 900 * r, dur: 0.2 * strength, gain: 0.06 * strength, type: 'square', slide: 0.97 }); break;
      case 'glass': this.burst({ freq: 5000 * r, q: 4, dur: 0.3, gain: 0.35 * strength, type: 'highpass' }); break;
      default: this.burst({ freq: 1200 * r, q: 1.5, dur: 0.09 * strength, gain: 0.45 * strength });
    }
  }
  hit(id) { this.sound(this.mat(id), 0.6); }
  broke(id) { this.sound(this.mat(id), 1.3); }
  place(id) { this.sound(this.mat(id), 0.9); this.tone({ freq: 120, dur: 0.06, gain: 0.15 }); }
  step(id) { if (id > 0) this.sound(this.mat(id), 0.35); }
  click() { this.tone({ freq: 660, dur: 0.05, gain: 0.08, type: 'square', slide: 0.9 }); }
  craft() { this.tone({ freq: 440, dur: 0.08, gain: 0.1, type: 'square', slide: 1.5 }); setTimeout(() => this.tone({ freq: 660, dur: 0.12, gain: 0.1, type: 'square', slide: 1.3 }), 70); }
  toolBreak() { this.burst({ freq: 2500, q: 5, dur: 0.4, gain: 0.5 }); this.tone({ freq: 300, dur: 0.3, gain: 0.2, type: 'sawtooth', slide: 0.3 }); }
  eat() { for (let i = 0; i < 3; i++) setTimeout(() => this.burst({ freq: 900 + Math.random() * 400, q: 2, dur: 0.07, gain: 0.3 }), i * 110); }
  hurt() { this.tone({ freq: 220, dur: 0.18, gain: 0.25, type: 'sawtooth', slide: 0.5 }); this.burst({ freq: 400, q: 1, dur: 0.12, gain: 0.3, type: 'lowpass' }); }
  mobHurt(type) {
    if (type === 'boar') this.tone({ freq: 380, dur: 0.15, gain: 0.2, type: 'square', slide: 0.6 });
    else if (type === 'ghoul') this.tone({ freq: 140, dur: 0.25, gain: 0.25, type: 'sawtooth', slide: 0.7 });
    else this.burst({ freq: 3500, q: 6, dur: 0.15, gain: 0.3 });
    this.burst({ freq: 600, q: 1, dur: 0.08, gain: 0.3 });
  }
  mobDie(type) { this.mobHurt(type); setTimeout(() => this.tone({ freq: type === 'boar' ? 300 : 110, dur: 0.5, gain: 0.2, type: 'sawtooth', slide: 0.4 }), 120); }
  mobIdle(type, dist) {
    const g = Math.max(0.03, 0.22 * (1 - dist / 22));
    if (type === 'boar') { this.tone({ freq: 160, dur: 0.12, gain: g, type: 'square', slide: 0.8 }); setTimeout(() => this.tone({ freq: 150, dur: 0.12, gain: g, type: 'square', slide: 0.8 }), 160); }
    else if (type === 'ghoul') this.tone({ freq: 95 + Math.random() * 30, dur: 1.2, gain: g, type: 'sawtooth', slide: 0.8 });
    else if (type === 'lion' || type === 'bear') { this.tone({ freq: type === 'lion' ? 140 : 110, dur: 1.1, gain: g * 1.4, type: 'sawtooth', slide: 0.55 }); this.burst({ freq: 300, q: 0.6, dur: 0.9, gain: g * 0.8, type: 'lowpass' }); }
    else if (type === 'elephant') { this.tone({ freq: 420, dur: 0.7, gain: g, type: 'square', slide: 1.5 }); this.tone({ freq: 640, dur: 0.6, gain: g * 0.6, type: 'sawtooth', slide: 1.2 }); }
    else if (type === 'monkey') for (let i = 0; i < 4; i++) setTimeout(() => this.tone({ freq: 700 + Math.random() * 500, dur: 0.08, gain: g, type: 'square', slide: 1.4 }), i * 90);
    else if (type === 'snake') this.burst({ freq: 5000, q: 1, dur: 0.7, gain: g, type: 'highpass' });
    else if (type === 'hippo' || type === 'rhino' || type === 'gorilla') this.tone({ freq: 80, dur: 0.5, gain: g * 1.3, type: 'sawtooth', slide: 0.7 });
    else if (type === 'penguin' || type === 'flamingo' || type === 'ostrich') { this.tone({ freq: 500, dur: 0.15, gain: g, type: 'square', slide: 0.7 }); setTimeout(() => this.tone({ freq: 450, dur: 0.2, gain: g, type: 'square', slide: 0.6 }), 180); }
    else if (type === 'zebra' || type === 'giraffe' || type === 'kangaroo') this.tone({ freq: 300, dur: 0.3, gain: g * 0.8, type: 'triangle', slide: 1.3 });
    else if (type === 'crocodile') this.tone({ freq: 60, dur: 0.6, gain: g, type: 'sawtooth', slide: 0.9 });
    else this.burst({ freq: 4000, q: 10, dur: 0.4, gain: g });
  }
  door(open) { this.tone({ freq: open ? 180 : 140, dur: 0.18, gain: 0.18, type: 'square', slide: open ? 1.4 : 0.7 }); this.burst({ freq: 900, q: 3, dur: 0.12, gain: 0.25 }); }
  drink() { for (let i = 0; i < 4; i++) setTimeout(() => this.tone({ freq: 300 + Math.random() * 120, dur: 0.07, gain: 0.12, type: 'sine', slide: 1.6 }), i * 120); }
  shoot() { this.tone({ freq: 900, dur: 0.12, gain: 0.2, type: 'triangle', slide: 0.3 }); this.burst({ freq: 2500, q: 2, dur: 0.08, gain: 0.3 }); }
  splash() { this.burst({ freq: 700, q: 0.8, dur: 0.35, gain: 0.35, type: 'lowpass' }); }
  pickup() { this.tone({ freq: 880, dur: 0.06, gain: 0.08, type: 'sine', slide: 1.5 }); }
  zap() { this.burst({ freq: 4000, q: 2, dur: 0.15, gain: 0.3, type: 'highpass' }); this.tone({ freq: 120, dur: 0.15, gain: 0.15, type: 'sawtooth', slide: 1 }); }
  achievement() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.18, gain: 0.1, type: 'square', slide: 1 }), i * 110)); }
  boss() { this.tone({ freq: 55, dur: 2, gain: 0.35, type: 'sawtooth', slide: 0.8 }); this.tone({ freq: 82, dur: 2, gain: 0.25, type: 'sawtooth', slide: 0.75 }); }
  // lluvia (0..1) y motor (0 apagado .. 1 a fondo)
  setRain(v) {
    if (!this.ctx) return;
    if (!this.rainGain) {
      const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200;
      this.rainGain = c.createGain(); this.rainGain.gain.value = 0;
      src.connect(f); f.connect(this.rainGain); this.rainGain.connect(this.master); src.start();
    }
    this.rainGain.gain.setTargetAtTime(v * 0.12, this.ctx.currentTime, 0.8);
  }
  setWind(v) { if (this.windGain) this.windGain.gain.setTargetAtTime(0.05 + v * 0.18, this.ctx.currentTime, 1); }
  setEngine(v) {
    if (!this.ctx) return;
    if (!this.engine) {
      const c = this.ctx, o = c.createOscillator(); o.type = 'sawtooth';
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      const g = c.createGain(); g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(this.master); o.start();
      this.engine = { o, g };
    }
    const t = this.ctx.currentTime;
    this.engine.g.gain.setTargetAtTime(v > 0 ? 0.05 + v * 0.05 : 0, t, 0.1);
    this.engine.o.frequency.setTargetAtTime(45 + v * 90, t, 0.1);
  }
  gun(pellets) { this.burst({ freq: 900, q: 0.7, dur: pellets > 1 ? 0.35 : 0.2, gain: 0.6, type: 'lowpass' }); this.tone({ freq: 90, dur: 0.15, gain: 0.35, type: 'square', slide: 0.4 }); }
  horn() { this.tone({ freq: 392, dur: 0.45, gain: 0.18, type: 'square', slide: 1 }); this.tone({ freq: 494, dur: 0.45, gain: 0.14, type: 'square', slide: 1 }); }
  crash(sp) { this.burst({ freq: 400, q: 0.6, dur: 0.4, gain: Math.min(0.8, sp / 25), type: 'lowpass' }); this.burst({ freq: 3000, q: 3, dur: 0.3, gain: 0.3 }); }
  beep(f) { this.tone({ freq: f, dur: 0.25, gain: 0.15, type: 'square', slide: 1 }); }
  alarm() { this.tone({ freq: 880, dur: 0.3, gain: 0.12, type: 'sawtooth', slide: 0.6 }); setTimeout(() => this.tone({ freq: 660, dur: 0.3, gain: 0.12, type: 'sawtooth', slide: 1.3 }), 320); }
  turret() { this.burst({ freq: 1800, q: 1.5, dur: 0.08, gain: 0.3 }); this.tone({ freq: 220, dur: 0.06, gain: 0.12, type: 'square', slide: 0.5 }); }
  bark() { this.tone({ freq: 500, dur: 0.1, gain: 0.15, type: 'square', slide: 0.6 }); setTimeout(() => this.tone({ freq: 480, dur: 0.1, gain: 0.15, type: 'square', slide: 0.6 }), 150); }
  horde() { [110, 104, 98].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 1.2, gain: 0.25, type: 'sawtooth', slide: 0.8 }), i * 600)); }
  photo() { this.burst({ freq: 3000, q: 1, dur: 0.1, gain: 0.3, type: 'highpass' }); }
  geiger() { this.burst({ freq: 3000, q: 0.5, dur: 0.012, gain: 0.35, type: 'highpass' }); }
  sleep() { [440, 370, 294].forEach((f, i) => setTimeout(() => this.tone({ freq: f, dur: 0.5, gain: 0.08, type: 'sine', slide: 0.99 }), i * 250)); }
  setMusicVol(v) { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = v * 0.6; }

  // música dinámica: el estado (explorar, peligro, carrera, taberna, abismo) y el bioma eligen la armonía y el ritmo
  setMood(mood, biome) { this.mood = mood; this.biome = biome ?? this.biome; }
  music() {
    const c = this.ctx;
    this.mood = this.mood || 'explore'; this.biome = this.biome ?? 0;
    this.musicGain = c.createGain(); this.musicGain.gain.value = this.musicVol * 0.6; this.musicGain.connect(this.master);
    const delay = c.createDelay(1); delay.delayTime.value = 0.45;
    const fb = c.createGain(); fb.gain.value = 0.38;
    delay.connect(fb); fb.connect(delay); delay.connect(this.musicGain);
    this.echo = delay;
    const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
    // armonías por bioma: [acordes, escala]
    const minor = [[[38, 45, 53, 57], [34, 41, 50, 53], [31, 38, 46, 50], [33, 40, 49, 52]], [62, 65, 67, 69, 72, 74, 77]];
    const HARM = {
      0: minor,
      1: [[[40, 47, 52, 53], [41, 48, 53, 56], [40, 47, 52, 55], [38, 45, 50, 53]], [64, 65, 68, 69, 71, 72, 76]], // desierto: frigio
      2: [[[36, 43, 51, 55], [35, 42, 50, 54], [33, 40, 48, 52]], [60, 63, 65, 66, 67, 70, 72]], // pantano
      3: [[[38, 45, 53, 57], [36, 43, 51, 55], [34, 41, 50, 53], [33, 40, 49, 52]], [62, 64, 65, 69, 70, 74]], // ciudad
      5: [[[38, 45, 54, 57], [43, 50, 55, 59], [45, 52, 57, 61], [38, 45, 54, 57]], [62, 64, 66, 69, 71, 74, 76]], // valle: mayor
      6: [[[36, 43, 52, 56], [38, 45, 54, 58], [40, 47, 56, 60]], [60, 62, 64, 66, 68, 70, 72]], // hongos: tonos enteros
      7: [[[33, 40, 48, 52], [29, 36, 45, 48], [31, 38, 47, 50]], [69, 71, 72, 76, 79, 81]], // tundra
      9: [[[38, 45, 53, 57], [36, 43, 50, 55], [34, 41, 50, 53]], [62, 65, 67, 69, 72, 74]],
      10: [[[35, 42, 50, 54], [33, 40, 48, 52], [31, 38, 47, 50]], [59, 62, 64, 66, 67, 71]],
      11: [[[26, 33, 38, 44], [25, 32, 37, 43]], [50, 51, 55, 56, 58, 62]],
      13: [[[43, 50, 55, 59], [48, 55, 60, 64], [45, 52, 57, 60], [50, 57, 62, 66]], [67, 69, 71, 72, 74, 76, 79]], // Valverde: mayor pastoral
      14: [[[38, 45, 52, 57], [43, 50, 57, 62], [40, 47, 55, 59]], [62, 64, 66, 69, 71, 73, 74]], // Lunaria: lidio
      15: [[[33, 40, 45, 52], [31, 38, 43, 50], [36, 43, 48, 55]], [57, 59, 60, 62, 64, 65, 69]], // Hierroalto: dórico grave
      16: [[[35, 42, 47, 50], [34, 41, 46, 49]], [59, 60, 62, 63, 66, 67, 71]], // Ciénaga
      17: [[[28, 35, 40, 46], [29, 36, 41, 47]], [52, 53, 56, 57, 59, 60, 64]], // Brasa
    };
    const harm = () => HARM[this.biome] || minor;
    let ci = 0;
    const pad = () => {
      if (!this.ctx) return;
      const mood = this.mood;
      if (mood === 'explore' || mood === 'abyss') {
        const chords = mood === 'abyss' ? HARM[11][0] : harm()[0];
        const ch = chords[ci++ % chords.length];
        const t = c.currentTime, dur = 11;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = (mood === 'abyss' ? 320 : 500) - this.night * 200; lp.Q.value = 0.5;
        const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 3.5); g.gain.linearRampToValueAtTime(0, t + dur);
        lp.connect(g); g.connect(this.musicGain);
        for (const m of ch) for (const det of [-7, 7]) {
          const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(m); o.detune.value = det;
          o.connect(lp); o.start(t); o.stop(t + dur + 0.1);
        }
      }
      setTimeout(pad, 9000);
    };
    const note = (m, dur, gain, type = 'triangle', echo = true) => {
      const t = c.currentTime;
      const o = c.createOscillator(); o.type = type; o.frequency.value = N(m);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.musicGain); if (echo) g.connect(this.echo); o.start(t); o.stop(t + dur + 0.05);
    };
    const drum = (freq, dur, gain, noise = false) => {
      const t = c.currentTime;
      if (noise) { this.burstTo(this.musicGain, { freq, q: 1, dur, gain, type: 'highpass' }); return; }
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 2.5, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.08);
      const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.musicGain); o.start(t); o.stop(t + dur + 0.02);
    };
    let step = 0;
    const beat = () => {
      if (!this.ctx) return;
      const mood = this.mood;
      let next = 400;
      if (mood === 'explore' || mood === 'abyss') {
        // notas sueltas con eco, cada tanto
        if (Math.random() < (mood === 'abyss' ? 0.25 : 0.35)) { const sc = mood === 'abyss' ? HARM[11][1] : harm()[1]; note(sc[Math.floor(Math.random() * sc.length)] - (this.night > 0.5 || mood === 'abyss' ? 12 : 0), 1.6, 0.06); }
        next = 1800 + Math.random() * 2000;
      } else if (mood === 'danger') {
        // pulso grave y ostinato menor
        const bass = [38, 38, 41, 38, 36, 38, 43, 41];
        if (step % 2 === 0) drum(50, 0.25, 0.35);
        note(bass[step % 8], 0.22, 0.07, 'sawtooth', false);
        if (step % 8 === 6) note(62 + (step % 16 === 6 ? 3 : 1), 0.3, 0.04, 'square', true);
        next = 190;
      } else if (mood === 'race') {
        // 140 bpm: bombo, platillo y bajo arpegiado
        const arp = [40, 47, 52, 47, 43, 50, 55, 50];
        if (step % 4 === 0) drum(55, 0.2, 0.4);
        if (step % 4 === 2) drum(6000, 0.05, 0.08, true);
        if (step % 8 === 4) drum(1800, 0.12, 0.12, true);
        note(arp[step % 8] + (Math.floor(step / 32) % 2 ? 5 : 0), 0.16, 0.06, 'square', false);
        next = 107;
      } else if (mood === 'tavern') {
        // vals de taberna: bajo - acorde - acorde
        const prog = [[50, 57, 62, 66], [55, 59, 62, 67], [57, 61, 64, 69], [50, 57, 62, 66]];
        const ch = prog[Math.floor(step / 3) % 4];
        if (step % 3 === 0) note(ch[0] - 12, 0.35, 0.09, 'triangle', false);
        else { note(ch[1], 0.18, 0.04, 'square', false); note(ch[2], 0.18, 0.035, 'square', false); note(ch[3], 0.18, 0.03, 'square', false); }
        if (step % 6 === 0 && Math.random() < 0.7) { const mel = [74, 76, 78, 79, 81, 83]; note(mel[Math.floor(Math.random() * mel.length)], 0.5, 0.05, 'triangle', true); }
        next = 230;
      }
      step++;
      setTimeout(beat, next);
    };
    setTimeout(pad, 1500); setTimeout(beat, 4000);
  }
  burstTo(dest, { freq = 800, q = 1, dur = 0.12, gain = 0.4, type = 'bandpass' }) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random()); src.stop(t + dur + 0.02);
  }
  // v6
  thunder(dist = 20) { const g = Math.max(0.15, 0.8 - dist / 80); setTimeout(() => { this.burst({ freq: 180, q: 0.5, dur: 2.2, gain: g, type: 'lowpass' }); this.burst({ freq: 900, q: 0.8, dur: 0.4, gain: g * 0.6, type: 'lowpass' }); }, dist * 8); }
  explode(dist = 5) { const g = Math.max(0.1, 0.9 - dist / 50); this.burst({ freq: 300, q: 0.4, dur: 1.2, gain: g, type: 'lowpass' }); this.tone({ freq: 70, dur: 0.6, gain: g * 0.6, type: 'sine', slide: 0.4 }); }
  fire() { this.burst({ freq: 2500, q: 1, dur: 0.05, gain: 0.06, type: 'highpass' }); }
  flame() { this.burst({ freq: 700, q: 0.5, dur: 0.18, gain: 0.18, type: 'lowpass' }); }
  bow() { this.tone({ freq: 220, dur: 0.12, gain: 0.15, type: 'triangle', slide: 1.8 }); this.burst({ freq: 1500, q: 2, dur: 0.1, gain: 0.15 }); }
  coin() { this.tone({ freq: 1320, dur: 0.08, gain: 0.08, type: 'square', slide: 1 }); setTimeout(() => this.tone({ freq: 1760, dur: 0.15, gain: 0.08, type: 'square', slide: 1 }), 70); }
  ding() { this.tone({ freq: 880, dur: 0.4, gain: 0.1, type: 'sine', slide: 1 }); setTimeout(() => this.tone({ freq: 660, dur: 0.5, gain: 0.1, type: 'sine', slide: 1 }), 200); }
  portal() { this.tone({ freq: 110, dur: 1.5, gain: 0.25, type: 'sawtooth', slide: 3 }); this.burst({ freq: 3000, q: 0.5, dur: 1.2, gain: 0.2, type: 'highpass' }); }
  emote() { this.tone({ freq: 700, dur: 0.1, gain: 0.08, type: 'sine', slide: 1.3 }); }
  cheer() { for (let i = 0; i < 6; i++) setTimeout(() => this.burst({ freq: 1200 + Math.random() * 800, q: 1, dur: 0.25, gain: 0.12 }), i * 90); }

  wind() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
    const lg = c.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency);
    const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.11;
    const lg2 = c.createGain(); lg2.gain.value = 0.035; lfo2.connect(lg2); lg2.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start(); lfo2.start();
    this.windGain = g;
  }
}
