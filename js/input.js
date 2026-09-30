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
  setupTouch() {
    document.body.classList.add('touch');
    const root = document.getElementById('touch');
    root.hidden = false;
    const stick = root.querySelector('.stick'), knob = stick.querySelector('i');
    let stickId = null, sx = 0, sy = 0;
    stick.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; stickId = t.identifier;
      const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2;
      e.preventDefault();
    }, { passive: false });
    const lookZone = root.querySelector('.look');
    let lookId = null, lx = 0, ly = 0;
    lookZone.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = (t.clientX - sx) / 50, dy = (t.clientY - sy) / 50;
          const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
          knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
          this.analog = { x: -dy, y: dx };
        } else if (t.identifier === lookId) {
          this.a.look((t.clientX - lx) * 2.2, (t.clientY - ly) * 2.2);
          lx = t.clientX; ly = t.clientY;
        }
      }
    }, { passive: true });
    window.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; this.analog = null; knob.style.transform = ''; }
        if (t.identifier === lookId) lookId = null;
      }
    });
    const hold = (sel, down, up) => {
      const el = root.querySelector(sel);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); el.classList.add('on'); down(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('on'); up?.(); }, { passive: false });
    };
    hold('.b-jump', () => this.a.setKey('Space', true), () => this.a.setKey('Space', false));
    hold('.b-break', () => this.a.mouse(0, true), () => this.a.mouse(0, false));
    hold('.b-use', () => this.a.mouse(2, true), () => this.a.mouse(2, false));
    hold('.b-inv', () => this.a.press('inventory'));
    hold('.b-pause', () => this.a.press('pause'));
    hold('.b-map', () => this.a.press('map'));
    hold('.b-mount', () => this.a.press('mount'));
    let run = false;
    hold('.b-run', () => { run = !run; this.a.setKey('ShiftLeft', run); root.querySelector('.b-run').classList.toggle('lock', run); });
  }
}
