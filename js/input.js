// Joystick (Gamepad API) y controles táctiles para celular/tablet.
const DEAD = 0.18;
const dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));

export class Input {
  constructor(actions) {
    this.a = actions; // {look(dx,dy), setKey(code,on), mouse(btn,on), press(name)}
    this.padActive = false;
    this.lastPad = 0;
    this.prevButtons = [];
    this.touch = matchMedia('(pointer: coarse)').matches && 'ontouchstart' in window;
    this.analog = null;
    if (this.touch) this.setupTouch();
  }

  // ---------- joystick ----------
  updatePad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = [...pads].find((x) => x && x.connected);
    if (!p) { if (this.padActive) { this.padActive = false; this.analog = null; } return; }
    const ax = p.axes.map(dz);
    const bt = p.buttons.map((b) => b.pressed || b.value > 0.5);
    if (ax.some((v) => v !== 0) || bt.some(Boolean)) { this.lastPad = performance.now(); this.padActive = true; }
    if (!this.padActive) return;
    this.analog = { x: -(ax[1] || 0), y: ax[0] || 0 };
    if (ax[2] || ax[3]) this.a.look((ax[2] || 0) * 900 * dt, (ax[3] || 0) * 700 * dt);
    const edge = (i) => bt[i] && !this.prevButtons[i];
    const held = (i, code) => { if (bt[i] !== this.prevButtons[i]) this.a.setKey(code, bt[i]); };
    held(0, 'Space'); held(10, 'ShiftLeft'); held(1, 'ControlLeft');
    if (bt[7] !== this.prevButtons[7]) this.a.mouse(0, bt[7]);
    if (bt[6] !== this.prevButtons[6]) this.a.mouse(2, bt[6]);
    if (edge(2)) this.a.press('inventory');
    if (edge(3)) this.a.press('map');
    if (edge(4)) this.a.press('prev');
    if (edge(5)) this.a.press('next');
    if (edge(9)) this.a.press('pause');
    if (edge(11)) this.a.press('mount');
    if (edge(8)) this.a.press('drop');
    this.prevButtons = bt;
  }

  // ---------- táctil ----------
  // joystick flotante (aparece donde apoyás el pulgar izquierdo), mirar con el derecho, botones con íconos
  setupTouch() {
    document.body.classList.add('touch');
    const root = document.getElementById('touch');
    root.hidden = false;
    const opt = () => this.a.opts?.() || {};
    const buzz = (ms = 8) => { if (opt().haptics !== false) navigator.vibrate?.(ms); };
    this.buzz = buzz;
    const stick = root.querySelector('.stick'), knob = stick.querySelector('i'), zone = root.querySelector('.stickzone');
    let stickId = null, sx = 0, sy = 0;
    const place = (x, y) => { const r = stick.getBoundingClientRect(); stick.style.left = (x - r.width / 2) + 'px'; stick.style.top = (y - r.height / 2) + 'px'; stick.style.bottom = 'auto'; };
    const home = () => { stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; };
    zone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; stickId = t.identifier;
      if (opt().fixedStick) { const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; }
      else { sx = t.clientX; sy = t.clientY; place(sx, sy); }
      stick.classList.add('on');
      e.preventDefault();
    }, { passive: false });
    const lookZone = root.querySelector('.look');
    let lookId = null, lx = 0, ly = 0;
    lookZone.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          const R = stick.getBoundingClientRect().width / 2 * 0.8;
          let dx = (t.clientX - sx) / R, dy = (t.clientY - sy) / R;
          const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
          knob.style.transform = `translate(${dx * R}px, ${dy * R}px)`;
          this.analog = { x: -dy, y: dx };
          // empujar a fondo hacia adelante: corre solo
          this.autoRun = l > 1.35 && dy < -0.7;
        } else if (t.identifier === lookId) {
          const k = 2.2 * (opt().touchSens ?? 100) / 100;
          this.a.look((t.clientX - lx) * k, (t.clientY - ly) * k);
          lx = t.clientX; ly = t.clientY;
        }
      }
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; this.analog = null; this.autoRun = false; knob.style.transform = ''; stick.classList.remove('on'); home(); }
        if (t.identifier === lookId) lookId = null;
      }
    });
    const hold = (sel, down, up) => {
      const el = root.querySelector(sel);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); el.classList.add('on'); buzz(); down(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('on'); up?.(); }, { passive: false });
      el.addEventListener('touchcancel', () => { el.classList.remove('on'); up?.(); });
    };
    hold('.b-jump', () => this.a.setKey('Space', true), () => this.a.setKey('Space', false));
    hold('.b-down', () => this.a.setKey('KeyC', true), () => this.a.setKey('KeyC', false));
    hold('.b-break', () => this.a.mouse(0, true), () => this.a.mouse(0, false));
    hold('.b-use', () => this.a.mouse(2, true), () => this.a.mouse(2, false));
    hold('.b-inv', () => this.a.press('inventory'));
    hold('.b-pause', () => this.a.press('pause'));
    hold('.b-map', () => this.a.press('map'));
    hold('.b-mount', () => this.a.press('mount'));
    hold('.b-drop', () => this.a.press('drop'));
    hold('.b-wp', () => this.a.press('waypoint'));
    hold('.b-emote', () => this.a.press('emotes'));
    hold('.b-cam', () => this.a.press('camera'));
    hold('.b-photo', () => this.a.press('photo'));
    hold('.b-chat', () => this.a.press('chat'));
    hold('.b-voice', () => this.a.press('voice'));
    let run = false;
    hold('.b-run', () => { run = !run; this.a.setKey('ShiftLeft', run); root.querySelector('.b-run').classList.toggle('lock', run); });
  }
  // ajustes de tamaño y transparencia
  applyTouchOpts(o) {
    const root = document.getElementById('touch'); if (!root) return;
    root.style.setProperty('--ts', (o.touchSize ?? 100) / 100);
    root.style.setProperty('--to', (o.touchAlpha ?? 85) / 100);
  }
}
