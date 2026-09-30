// Tutorial interactivo: objetivos que se detectan jugando.
const $ = (s) => document.querySelector(s);

export class Tutorial {
  constructor(game, ui, sfx) {
    this.g = game; this.ui = ui; this.sfx = sfx;
    const t = game.meta.tutorial;
    this.step = t?.step ?? 0;
    this.active = !!t && !t.done;
    this.s = { look: 0, walk: 0, stepTime: 0, ev: {}, crafted: {}, placed: {}, broke: {} };
    this.lastYaw = game.player.yaw; this.lastPitch = game.player.pitch;
    this.lastPos = game.player.pos.clone();
    this.el = $('#tut');
    this.doneTimer = 0;
    const inv = game.inv;
    const has = (id, n = 1) => inv.count(id) >= n;
    this.steps = [
      { t: 'Mirá alrededor', d: 'Mové el <b>mouse</b> para mirar. Si el puntero no está capturado, hacé clic sobre el juego.', ok: (s) => s.look > 2.5 },
      { t: 'Caminá', d: 'Movete con <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>. Mantené <kbd>Shift</kbd> para correr.', ok: (s) => s.walk > 10, p: (s) => `${Math.min(10, s.walk | 0)} / 10 m` },
      { t: 'Saltá', d: 'Apretá <kbd>Espacio</kbd>. Saltando subís un bloque de altura.', ok: (s) => s.ev.jump },
      { t: 'Juntá madera', d: 'Apuntá a un <b>árbol muerto</b> y <b>mantené el clic izquierdo</b> hasta que el tronco se rompa. Lo que rompés va directo a tu mochila.', ok: (s) => has(15, 3) || s.crafted[23], p: () => `Troncos: ${Math.min(3, inv.count(15))} / 3` },
      { t: 'Abrí la mochila', d: 'Apretá <kbd>E</kbd>. A la izquierda están tus cosas; a la derecha, lo que podés <b>fabricar</b>.', ok: () => this.ui.open },
      { t: 'Fabricá tablas', d: 'En la lista de la derecha hacé clic en <b>Tablas</b>. Cada tronco da 4. Las recetas que podés hacer se ven iluminadas; debajo de cada una figuran los materiales.', ok: (s) => s.crafted[23] || has(23, 4) },
      { t: 'Fabricá una mesa de trabajo', d: 'Hacé clic en <b>Mesa de trabajo</b> (4 tablas). Las herramientas sólo se fabrican cerca de una mesa.', ok: (s) => s.crafted[24] || has(24) || s.placed[24] },
      { t: 'Colocá la mesa', d: 'Cerrá la mochila con <kbd>E</kbd>. Elegí la mesa en la barra de abajo con <kbd>1</kbd>–<kbd>9</kbd> o la rueda, apuntá al suelo y hacé <b>clic derecho</b>.', ok: (s) => s.placed[24] },
      { t: 'Fabricá un pico', d: 'Hacé <b>clic derecho sobre la mesa</b> para usarla. Fabricá <b>Palos</b> y después un <b>Pico de madera</b>.', ok: (s) => s.crafted[262] || has(262) || has(265) },
      { t: 'Picá roca', d: 'Elegí el pico en la barra. La <b>roca gris</b> está en laderas y bajo la tierra: cavá hacia abajo. Sin pico la roca tarda mucho y no suelta nada.', ok: () => has(2, 8), p: () => `Roca: ${Math.min(8, inv.count(2))} / 8` },
      { t: 'Encontrá carbón', d: 'El <b>carbón</b> es roca con manchas negras; aparece en laderas y cuevas. También vas a ver <b>chatarra</b> (manchas de óxido) y metal oxidado en autos y ruinas.', ok: (s) => has(257) || s.crafted[26] },
      { t: 'Hacé antorchas', d: 'En la mochila: <b>Antorcha</b> = palo + carbón. Colocala con clic derecho en el piso o <b>contra una pared</b>. Ilumina de noche y <b>los necrófagos no aparecen cerca de la luz</b>.', ok: (s) => s.placed[26] },
      { t: 'Sobrevivir', d: 'Abajo ves <b>vida</b>, <b>hambre</b> y <b>radiación</b>. Comé con <b>clic derecho</b> (cazá jabalíes o abrí <b>cajas de suministros</b>). De noche salen <b>necrófagos</b>: fabricá un <b>Bate con clavos</b>. El agua tóxica, el uranio y los barriles irradian; el <b>Antirad</b> la baja.', ok: (s) => s.stepTime > 22, p: (s) => `Seguí en ${Math.max(0, 22 - s.stepTime | 0)} s` },
      { t: 'Dormí a salvo', d: 'Fabricá un <b>Catre</b> (mesa: 3 tablas + 3 palos), colocalo y usalo con clic derecho: guarda tu <b>punto de reaparición</b> y, de noche, dormís hasta el amanecer.', ok: (s) => s.ev.bed || has(33) || s.stepTime > 40 },
    ];
    this.render();
  }

  event(name, id) {
    const s = this.s;
    if (name === 'jump' || name === 'bed') s.ev[name] = true;
    if (name === 'craft') s.crafted[id] = true;
    if (name === 'place') s.placed[id] = true;
    if (name === 'break') s.broke[id] = true;
  }

  skip() { this.active = false; this.g.meta.tutorial = { step: this.step, done: true }; this.el.hidden = true; }
  restart() { this.step = 0; this.active = true; this.s.stepTime = 0; this.g.meta.tutorial = { step: 0, done: false }; this.render(); }

  update(dt) {
    if (!this.active) {
      if (this.doneTimer > 0) { this.doneTimer -= dt; if (this.doneTimer <= 0) this.el.hidden = true; }
      return;
    }
    const p = this.g.player, s = this.s;
    s.look += Math.abs(p.yaw - this.lastYaw) + Math.abs(p.pitch - this.lastPitch);
    this.lastYaw = p.yaw; this.lastPitch = p.pitch;
    const d = Math.hypot(p.pos.x - this.lastPos.x, p.pos.z - this.lastPos.z);
    if (d < 2) s.walk += d;
    this.lastPos.copy(p.pos);
    s.stepTime += dt;
    const st = this.steps[this.step];
    if (st.ok(s)) {
      this.step++; s.stepTime = 0;
      this.sfx.craft();
      this.el.classList.remove('pop'); void this.el.offsetWidth; this.el.classList.add('pop');
      if (this.step >= this.steps.length) {
        this.active = false;
        this.g.meta.tutorial = { step: this.step, done: true };
        this.el.innerHTML = '<div class="tt">¡Tutorial completo!</div><div class="td">Ya sabés lo básico. Consultá la <b>Guía</b> desde la pausa (<kbd>Esc</kbd>) cuando quieras. Suerte en el yermo.</div>';
        this.doneTimer = 12;
        return;
      }
      this.g.meta.tutorial = { step: this.step, done: false };
    }
    this.renderAcc = (this.renderAcc || 0) + dt;
    if (this.renderAcc > 0.25) { this.renderAcc = 0; this.render(); }
  }

  render() {
    if (!this.active) { this.el.hidden = true; return; }
    this.el.hidden = false;
    const st = this.steps[this.step];
    const prog = st.p ? `<div class="tp">${st.p(this.s)}</div>` : '';
    this.el.innerHTML = `<div class="tn">Tutorial · ${this.step + 1} / ${this.steps.length}</div><div class="tt">${st.t}</div><div class="td">${st.d}</div>${prog}`;
  }
}
