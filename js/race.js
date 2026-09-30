// Carreras: en el autódromo o en pistas armadas con banderas. Largada con semáforo, vueltas, puntos de
// control, posiciones, récords, varios pilotos de la IA (el instructor y los del campeonato) y el
// campeonato de 5 fechas con puntos.
import * as THREE from 'three';
import { VEHICLE_TYPES } from './entities.js';

export const LEVELS = {
  novato: { name: 'Novato', mul: 0.62, price: [[258, 5]], priceTxt: '5 chatarra' },
  piloto: { name: 'Piloto', mul: 0.8, price: [[260, 2]], priceTxt: '2 lingotes de acero' },
  leyenda: { name: 'Leyenda', mul: 0.93, price: [['beer3', 2]], priceTxt: '2 cervezas de ★★★ o más' },
};
// pilotos del campeonato
export const DRIVERS = [
  { name: 'Rolo', mul: 0.86, veh: 'racecar' },
  { name: 'La Chispa', mul: 0.83, veh: 'racebike' },
  { name: 'Tuerca', mul: 0.79, veh: 'racecar' },
  { name: 'Nafta Gómez', mul: 0.75, veh: 'car' },
];
export const POINTS = [10, 6, 4, 3, 2, 1];
export const CHAMP_ROUNDS = 5;
export const CHAMP_PRICE = 5; // fichas

// posición y rumbo sobre la línea central del autódromo, a una distancia s desde la largada
export function trackAt(c, s) {
  const L = 4 * c.a + 2 * Math.PI * c.R;
  s = ((s % L) + L) % L;
  let x, z, dx, dz, curve = false;
  if (s < c.a) { x = s; z = c.R; dx = 1; dz = 0; }
  else if ((s -= c.a) < Math.PI * c.R) { const t = s / c.R; x = c.a + Math.sin(t) * c.R; z = Math.cos(t) * c.R; dx = Math.cos(t); dz = -Math.sin(t); curve = true; }
  else if ((s -= Math.PI * c.R) < 2 * c.a) { x = c.a - s; z = -c.R; dx = -1; dz = 0; }
  else if ((s -= 2 * c.a) < Math.PI * c.R) { const t = s / c.R; x = -c.a - Math.sin(t) * c.R; z = -Math.cos(t) * c.R; dx = -Math.cos(t); dz = Math.sin(t); curve = true; }
  else { s -= Math.PI * c.R; x = -c.a + s; z = c.R; dx = 1; dz = 0; }
  return { x: c.x + x, z: c.z + z, yaw: Math.atan2(-dx, -dz), curve };
}
export const trackLength = (c) => 4 * c.a + 2 * Math.PI * c.R;

// pista genérica: { id, name, L, cps: [s...], at(s) → {x, y, z, yaw, curve}, desc (para la red) }
export function circuitTrack(c) {
  const L = trackLength(c), N = 24;
  return { id: c.id, name: 'Autódromo', L, cps: Array.from({ length: N }, (_, i) => i / N * L), at: (s) => ({ ...trackAt(c, s), y: c.y + 1.05 }), desc: { kind: 'circuit', cid: c.id }, radius: 14 };
}
export function customTrack(pts) {
  // pts: [[x, y, z], ...] cerrada (vuelve al primero); y = altura de los pies del vehículo
  const seg = [], cps = [];
  let L = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]) || 0.01;
    cps.push(L); seg.push({ a, b, s0: L, len }); L += len;
  }
  const turnAt = (i) => {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length];
    const a1 = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]), a2 = Math.atan2(p2[0] - p1[0], p2[2] - p1[2]);
    return Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
  };
  const at = (s) => {
    s = ((s % L) + L) % L;
    let k = seg.findIndex((g) => s < g.s0 + g.len); if (k < 0) k = seg.length - 1;
    const g = seg[k], t = (s - g.s0) / g.len;
    const dx = g.b[0] - g.a[0], dz = g.b[2] - g.a[2];
    const near = (g.len - (s - g.s0) < 12 && turnAt((k + 1) % pts.length) > 0.6) || (s - g.s0 < 6 && turnAt(k) > 0.6);
    return { x: g.a[0] + dx * t, y: g.a[1] + (g.b[1] - g.a[1]) * t, z: g.a[2] + dz * t, yaw: Math.atan2(-dx, -dz), curve: near };
  };
  return { id: `c:${pts[0][0]},${pts[0][2]}`, name: 'Pista propia', L, cps, at, desc: { kind: 'custom', pts }, radius: 9 };
}

const $ = (s) => document.querySelector(s);
const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return (m ? m + ':' : '') + s.toFixed(2).padStart(m ? 5 : 4, '0'); };

export class Race {
  constructor(game, net, sfx, flash) {
    this.g = game; this.net = net; this.sfx = sfx; this.flash = flash;
    this.state = null; this.champ = null;
    this.acc = 0;
  }
  get active() { return !!this.state; }

  // banderas de una pista propia: la de largada y las de control a menos de 300 bloques, encadenadas por cercanía
  customFrom(x, y, z) {
    const g = this.g, w = g.world;
    const flags = (g.meta.flags || []).map((k) => k.split(',').map(Number)).filter(([fx, fy, fz]) => {
      const b = w.getBlock(fx, fy, fz);
      return (b === 184 || b === -1) && Math.hypot(fx - x, fz - z) < 300;
    });
    const pts = [[x + 0.5, y + 0.05, z + 0.5]];
    const left = flags.map(([fx, fy, fz]) => [fx + 0.5, fy + 0.05, fz + 0.5]);
    while (left.length) {
      const last = pts[pts.length - 1];
      let bi = 0, bd = Infinity;
      left.forEach((p, i) => { const d = Math.hypot(p[0] - last[0], p[2] - last[2]); if (d < bd) { bd = d; bi = i; } });
      if (bd > 120) break;
      pts.push(left.splice(bi, 1)[0]);
    }
    return pts.length >= 3 ? customTrack(pts) : null;
  }

  // abrir el menú desde el semáforo o la bandera de largada
  openMenu(x, z, y) {
    const g = this.g;
    let track = null;
    if (y != null && g.world.getBlock(x, y, z) === 185) {
      track = this.customFrom(x, y, z);
      if (!track) { this.flash('Pista propia: poné al menos 2 banderas de control (a menos de 120 bloques entre sí) y volvé a la bandera de largada'); return; }
    } else {
      const c = g.gen.circuitNear(x, z);
      if (!c) return;
      track = circuitTrack(c);
    }
    this.menuTrack = track;
    const lvl = g.hiredInstructor;
    $('#raceOpp').textContent = lvl ? `Rival: el instructor (${LEVELS[lvl].name})` : 'Sin rival IA (contratá al instructor) · o corré el campeonato';
    const rec = g.meta.records?.[track.id];
    $('#raceTrack').textContent = `${track.name} · ${Math.round(track.L)} m por vuelta${track.cps.length !== 24 ? ` · ${track.cps.length} banderas` : ''}`;
    $('#raceRecord').textContent = rec ? `Récord de vuelta: ${fmt(rec)}` : 'Todavía no hay récord en esta pista';
    $('#raceChamp').textContent = this.champ ? `Seguir el campeonato (fecha ${this.champ.round + 1} de ${CHAMP_ROUNDS})` : `🏆 Campeonato de ${CHAMP_ROUNDS} fechas contra 4 pilotos (${CHAMP_PRICE} fichas)`;
    $('#raceMenu').hidden = false;
    document.exitPointerLock();
  }

  start(laps) {
    const tr = this.menuTrack;
    $('#raceMenu').hidden = true;
    const ai = this.g.hiredInstructor ? [{ name: `Instructor (${LEVELS[this.g.hiredInstructor].name})`, mul: LEVELS[this.g.hiredInstructor].mul, veh: 'racecar', level: this.g.hiredInstructor }] : [];
    this.launch(tr, laps, ai);
    this.g.hiredInstructor = null; // el instructor cobra por carrera
  }
  launch(tr, laps, ai) {
    const t0 = performance.now() + 4000;
    this.begin(tr, laps, t0, ai, this.net.myId ?? 'local');
    if (this.net.active) this.net.send({ t: 'race', op: 'start', track: tr.desc, laps, delay: 4000, ai, owner: this.net.myId ?? 'host' });
  }
  // campeonato: 5 fechas de 2 vueltas en la misma pista
  startChamp() {
    const g = this.g, tr = this.menuTrack;
    if (!this.champ) {
      if (!g.player.creative && g.inv.count(353) < CHAMP_PRICE) { this.flash(`La inscripción cuesta ${CHAMP_PRICE} fichas (hacelas en la prensa)`); return; }
      if (!g.player.creative) g.inv.remove(353, CHAMP_PRICE);
      this.champ = { round: 0, pts: {}, track: tr.desc };
      this.flash('🏆 ¡Arranca el campeonato! 5 fechas, puntos 10-6-4-3-2-1');
    }
    $('#raceMenu').hidden = true;
    this.nextRound();
  }
  nextRound() {
    const ch = this.champ;
    if (!ch) return;
    const tr = this.trackFromDesc(ch.track);
    if (!tr) { this.champ = null; return; }
    $('#podium').hidden = true;
    if (this.state) this.end(true);
    const ai = DRIVERS.map((d) => ({ ...d, mul: d.mul * (0.96 + Math.random() * 0.06) + ch.round * 0.01 }));
    this.launch(tr, 2, ai);
  }
  trackFromDesc(d) {
    if (d.kind === 'custom') return customTrack(d.pts);
    const [gx, gz] = d.cid.split(',').map(Number);
    const c0 = this.g.gen.circuitAt(gx, gz);
    const c = c0 && this.g.gen.circuitNear(c0.x, c0.z);
    return c ? circuitTrack(c) : null;
  }

  begin(tr, laps, t0, aiList, owner) {
    const g = this.g, p = g.player;
    const N = tr.cps.length;
    this.state = { tr, laps, t0, N, L: tr.L, owner, phase: 'countdown', parts: new Map(), me: null, ais: [], lastBeep: 4 };
    // participo si estoy en un vehículo cerca de la largada
    const start = tr.at(0);
    const near = Math.hypot(p.pos.x - start.x, p.pos.z - start.z) < 40;
    if (p.riding && near) {
      this.state.me = { lap: 0, cp: 1, done: false, time: 0, lapStart: 0, best: null, name: this.net.myName || 'Vos' };
      const v = p.riding, s0 = tr.at(-6 - Math.random() * 3);
      const rx = Math.cos(s0.yaw), rz = -Math.sin(s0.yaw), lane = (Math.random() - 0.5) * 3;
      p.pos.set(s0.x + rx * lane, s0.y + 0.2, s0.z + rz * lane); v.pos.copy(p.pos); v.yaw = s0.yaw; p.vel.set(0, 0, 0);
      while (p.collides(p.pos.x, p.pos.y, p.pos.z) && p.pos.y < s0.y + 4) p.pos.y += 0.25;
    } else this.flash('Carrera iniciada: subite a un vehículo en la largada para competir');
    // rivales de la IA (los simula quien largó la carrera)
    if (aiList?.length && owner === (this.net.myId ?? 'local')) {
      aiList.forEach((d, i) => {
        const s = -3 - i * 5, lane = (i % 2 ? 1 : -1) * (1.2 + (i >> 1) * 0.8);
        const pos = tr.at(s);
        const veh = g.vehicles.spawn(new THREE.Vector3(pos.x, pos.y, pos.z), pos.yaw, d.veh || 'racecar');
        veh.rider = 'ai';
        this.state.ais.push({ ...d, veh, s, v: 0, lane, lap: 0, cp: 1, done: false, time: 0, best: null, lapStart: 0 });
      });
    }
    $('#raceHud').hidden = false;
    $('#raceLights').hidden = false;
  }

  // mensajes de otros jugadores
  onNet(m) {
    if (m.op === 'start') {
      const tr = m.track ? this.trackFromDesc(m.track) : null;
      if (tr) { if (this.state) this.end(true); this.begin(tr, m.laps, performance.now() + m.delay - 300, m.ai, m.owner); }
    } else if (m.op === 'prog' && this.state) {
      this.state.parts.set(m.id, m);
    }
  }

  progress(e, N) { return e.done ? 1e6 - e.time : e.lap * N + (e.cp - 1) + (e.frac ?? 0); }

  update(dt) {
    const S = this.state;
    if (!S) return;
    const now = performance.now(), p = this.g.player;
    const tRace = (now - S.t0) / 1000;
    if (S.phase === 'countdown') {
      const left = Math.ceil(-tRace);
      const lights = $('#raceLights').children;
      for (let i = 0; i < 3; i++) lights[i].className = left <= 3 - i && left > 0 ? 'red' : '';
      if (left < S.lastBeep && left > 0) { S.lastBeep = left; this.sfx.beep?.(440); }
      if (S.me && p.riding) { p.vel.set(0, 0, 0); }
      if (tRace >= 0) {
        S.phase = 'running';
        for (const l of lights) l.className = 'green';
        this.sfx.beep?.(880);
        setTimeout(() => { $('#raceLights').hidden = true; }, 1200);
      }
    }
    if (S.phase === 'running') {
      if (S.me && !S.me.done) {
        const e = S.me;
        const cp = S.tr.at(S.tr.cps[e.cp % S.N]);
        const seg = S.L / S.N;
        const d = Math.hypot(p.pos.x - cp.x, p.pos.z - cp.z);
        e.frac = Math.max(0, 1 - d / seg);
        if (d < S.tr.radius) {
          if (e.cp % S.N === 0) {
            const lapTime = tRace - e.lapStart;
            e.best = e.best == null ? lapTime : Math.min(e.best, lapTime);
            e.lap++; e.lapStart = tRace;
            this.sfx.beep?.(660);
            if (e.lap >= S.laps) { e.done = true; e.time = tRace; this.finishCheck(); }
            else this.flash(`Vuelta ${e.lap + 1} de ${S.laps} · ${fmt(lapTime)}`);
          }
          e.cp++;
        }
        if (!p.riding && !e.done) { this.flash('Te bajaste del vehículo: abandonaste la carrera'); e.done = true; e.time = Infinity; this.finishCheck(); }
      }
      // pilotos de la IA: siguen la línea central en su carril y frenan en las curvas
      for (const A of S.ais) {
        if (A.done) continue;
        const here = S.tr.at(A.s);
        const target = VEHICLE_TYPES.racecar.speed * A.mul * (here.curve ? 0.72 : 1) * (0.97 + Math.sin(tRace * 0.7 + A.lane) * 0.03);
        A.v += (target - A.v) * Math.min(1, dt * 0.9);
        A.s += A.v * dt;
        const pos = S.tr.at(A.s);
        const rx = Math.cos(pos.yaw), rz = -Math.sin(pos.yaw);
        A.veh.pos.set(pos.x + rx * A.lane, pos.y, pos.z + rz * A.lane); A.veh.yaw = pos.yaw; A.veh.speed = A.v;
        const lap = Math.floor(A.s / S.L);
        if (lap > A.lap) { A.best = A.best == null ? tRace - A.lapStart : Math.min(A.best, tRace - A.lapStart); A.lap = lap; A.lapStart = tRace; }
        const sl = ((A.s % S.L) + S.L) % S.L;
        let ci = S.tr.cps.findIndex((c) => c > sl); if (ci < 0) ci = S.N;
        A.cp = ci;
        if (A.lap >= S.laps) { A.done = true; A.time = tRace; this.finishCheck(); }
      }
      this.acc += dt;
      if (this.acc > 0.5 && this.net.active) {
        this.acc = 0;
        if (S.me) this.net.send({ t: 'race', op: 'prog', id: this.net.myId, name: S.me.name, lap: S.me.lap, cp: S.me.cp, frac: S.me.frac, done: S.me.done, time: S.me.time });
        S.ais.forEach((A, i) => this.net.send({ t: 'race', op: 'prog', id: 'ai' + i, name: A.name, lap: A.lap, cp: A.cp, frac: 0, done: A.done, time: A.time }));
      }
      // nadie corre y los IA terminaron (o no hay)
      if (!S.me && S.ais.length && S.ais.every((a) => a.done)) this.finish();
    }
    this.renderHud(tRace);
  }

  standings() {
    const S = this.state;
    const list = [];
    if (S.me) list.push({ id: 'me', ...S.me, name: 'Vos' });
    S.ais.forEach((A, i) => list.push({ id: 'ai' + i, name: A.name, lap: A.lap, cp: A.cp, frac: 0, done: A.done, time: A.time }));
    for (const [id, e] of S.parts) if (id !== this.net.myId && !(id.startsWith?.('ai') && S.ais.length)) list.push({ ...e, id });
    return list.sort((a, b) => this.progress(b, S.N) - this.progress(a, S.N));
  }

  renderHud(tRace) {
    const S = this.state;
    const st = this.standings();
    const pos = st.findIndex((e) => e.id === 'me') + 1;
    const me = S.me;
    const champ = this.champ ? `🏆 Fecha ${this.champ.round + 1}/${CHAMP_ROUNDS} · ` : '';
    const nitro = this.g.player.riding?.tune?.nitro ? ` · Nitro ${Math.round((this.g.player.riding.nitro ?? 0) / 5 * 100)}% (Shift)` : '';
    $('#raceInfo').innerHTML = champ + (me ? `<b>${me.done ? 'Terminaste' : `Vuelta ${Math.min(me.lap + 1, S.laps)}/${S.laps}`}</b> · Posición ${pos}/${st.length}<br>` : '<b>Espectador</b><br>') +
      `Tiempo ${fmt(Math.max(0, me?.done && isFinite(me.time) ? me.time : tRace))}${me?.best ? ` · Mejor vuelta ${fmt(me.best)}` : ''}${nitro}`;
    $('#raceTable').innerHTML = st.map((e, i) => `<div>${i + 1}. ${e.name}${e.done && isFinite(e.time) ? ' · ' + fmt(e.time) : ''}</div>`).join('');
  }

  finishCheck() {
    const S = this.state;
    if (S.me && !S.me.done) return;
    // termino cuando llego yo (y le doy unos segundos a la IA si está en campeonato)
    if (S.me?.done) {
      if (this.champ && S.ais.some((a) => !a.done) && isFinite(S.me.time)) {
        // la IA que falta termina con su ritmo estimado
        for (const A of S.ais) if (!A.done) { A.done = true; const rest = (S.laps * S.L - A.s) / Math.max(5, A.v); A.time = (performance.now() - S.t0) / 1000 + Math.max(0.5, rest); }
      }
      return this.finish();
    }
    if (!S.me && S.ais.every((a) => a.done)) this.finish();
  }

  finish() {
    const S = this.state;
    if (!S || S.finished) return;
    const st = this.standings();
    const mePos = st.findIndex((e) => e.id === 'me') + 1;
    const g = this.g;
    if (S.me?.best) {
      g.meta.records = g.meta.records || {};
      const prev = g.meta.records[S.tr.id];
      if (!prev || S.me.best < prev) { g.meta.records[S.tr.id] = S.me.best; this.flash(`¡Nuevo récord de vuelta: ${fmt(S.me.best)}!`); }
    }
    let reward = '';
    const inst = S.ais.find((a) => a.level);
    if (inst && S.me && isFinite(S.me.time) && mePos === 1) {
      g.player.give(352, 1);
      reward = 'Ganaste el Trofeo del autódromo.';
      if (inst.level === 'leyenda') { g.player.give(348, 1); reward += ' El instructor te regala el Plano: Auto de carrera.'; }
      g.player.onEvent('raceWin', inst.level);
    }
    if (S.me) g.player.onEvent('raceDone', mePos);
    S.finished = true;
    $('#podium').hidden = false;
    $('#podiumList').innerHTML = st.slice(0, 5).map((e, i) => `<div class="p${i + 1}">${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${e.name}${isFinite(e.time) && e.done ? ' · ' + fmt(e.time) : ''}</div>`).join('');
    $('#podiumMsg').textContent = S.me ? (mePos === 1 ? '¡Ganaste! ' + reward : `Terminaste ${mePos}°.`) : 'Carrera terminada.';
    $('#podiumNext').hidden = true; $('#podiumChamp').innerHTML = '';
    const ch = this.champ;
    if (ch && S.me) {
      st.forEach((e, i) => { const n = e.id === 'me' ? 'Vos' : e.name; ch.pts[n] = (ch.pts[n] || 0) + (isFinite(e.time) ? POINTS[i] || 0 : 0); });
      ch.round++;
      const table = Object.entries(ch.pts).sort((a, b) => b[1] - a[1]);
      $('#podiumChamp').innerHTML = `<h3>🏆 Campeonato · fecha ${ch.round} de ${CHAMP_ROUNDS}</h3>` + table.map(([n, pt], i) => `<div>${i + 1}. ${n} · ${pt} pts</div>`).join('');
      if (ch.round >= CHAMP_ROUNDS) {
        const winner = table[0][0];
        if (winner === 'Vos') { g.player.give(352, 1); g.player.give(353, 30); g.player.onEvent('champion'); this.sfx.cheer?.(); $('#podiumMsg').textContent = '¡CAMPEÓN DEL YERMO! Trofeo + 30 fichas.'; }
        else $('#podiumMsg').textContent = `Campeonato terminado. Ganó ${winner}.`;
        this.champ = null;
        setTimeout(() => this.end(), 9000);
      } else {
        $('#podiumNext').hidden = false;
        this.autoNext = setTimeout(() => this.nextRound(), 15000);
      }
    } else setTimeout(() => this.end(), 7000);
  }

  end(keepChamp) {
    const S = this.state;
    clearTimeout(this.autoNext);
    if (!S) return;
    for (const A of S.ais) this.g.vehicles.remove(A.veh);
    this.state = null;
    if (!keepChamp && S.finished !== true) this.champ = null;
    $('#raceHud').hidden = true; $('#raceLights').hidden = true; $('#podium').hidden = true;
  }
}
