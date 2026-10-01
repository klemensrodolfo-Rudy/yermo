// Mecanismos v12.3: compuertas de agua, molinos de viento con aspas que giran, baterías,
// cintas que también llevan al jugador y el rocío de los regadores.
import * as THREE from 'three';
import { BLOCKS, LIQ } from './blocks.js';
import { BATTERY_MAX } from './sim.js';

const GATE = 1118, BATTERY = 1120, TURBINE = 1121, WATERER = 1127;
const k3 = (x, y, z) => x + ',' + y + ',' + z;
const p3 = (k) => k.split(',').map(Number);
const N6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const CONDUCTS = new Set([75, 78, 136, 138, 241, 243, 244, 76, 77, 1120, 1121]);

export function createMachines(ctx) {
  const { game: g, flash, sfx, particles } = ctx;
  const w = g.world, sim = g.sim, p = g.player;
  const api = {};
  const auth = () => ctx.isAuthority();

  // ---------- registro de compuertas y molinos ----------
  const gates = new Set(), turbines = new Set();
  for (const k of sim.containers.keys()) if (k.startsWith('gate:')) gates.add(k.slice(5));
  function scan(c) {
    const d = c.data; if (!d) return;
    for (let i = 0; i < d.length; i++) {
      const b = d[i]; if (b !== GATE && b !== TURBINE) continue;
      const k = k3(c.cx * 16 + (i & 15), i >> 8, c.cz * 16 + ((i >> 4) & 15));
      if (b === GATE) gates.add(k); else turbines.add(k);
    }
  }
  const prevReady = w.onChunkReady;
  w.onChunkReady = (c) => { prevReady?.(c); scan(c); };
  for (const c of w.chunks.values()) if (c.state === 'ready') scan(c);
  let opening = false;
  const prevChanged = sim.blockChanged.bind(sim);
  sim.blockChanged = (x, y, z, old, id) => {
    prevChanged(x, y, z, old, id);
    const k = k3(x, y, z);
    if (id === GATE) gates.add(k);
    else if (old === GATE && !opening) { gates.delete(k); if (sim.containers.delete('gate:' + k) && auth()) sim.touch('gate:' + k); }
    if (id === TURBINE) turbines.add(k); else if (old === TURBINE) turbines.delete(k);
  };

  // una compuerta está «con energía» si toca un cable, palanca, sensor o fuente encendidos
  const gatePowered = (x, y, z) => N6.some(([dx, dy, dz]) => sim.powered.has(k3(x + dx, y + dy, z + dz)) && CONDUCTS.has(w.getBlock(x + dx, y + dy, z + dz)));
  function tickGates() {
    if (!auth()) return;
    for (const k of [...gates]) {
      const [x, y, z] = p3(k), b = w.getBlock(x, y, z);
      if (b < 0) continue; // sector sin cargar
      const on = gatePowered(x, y, z);
      if (b === GATE && on) {
        opening = true; w.setBlock(x, y, z, 0); opening = false;
        sim.containers.set('gate:' + k, { type: 'gate' }); sim.touch('gate:' + k);
        sfx.door?.(1);
      } else if (!on && (b === 0 || LIQ[b]) && sim.containers.has('gate:' + k)) {
        w.setBlock(x, y, z, GATE); sim.containers.delete('gate:' + k); sim.touch('gate:' + k);
        sfx.door?.(0);
      } else if (b !== GATE && b !== 0 && !LIQ[b]) { gates.delete(k); if (sim.containers.delete('gate:' + k)) sim.touch('gate:' + k); }
    }
  }

  // ---------- aspas de los molinos ----------
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0xeef0f2 });
  const hubMat = new THREE.MeshLambertMaterial({ color: 0x9aa0a8 });
  const bladeGeo = new THREE.BoxGeometry(0.12, 1.5, 0.04); bladeGeo.translate(0, 0.75, 0);
  const hubGeo = new THREE.BoxGeometry(0.3, 0.3, 0.5);
  const rotors = new Map();
  function rotorFor(k) {
    let r = rotors.get(k);
    if (r) return r;
    const [x, y, z] = p3(k);
    const grp = new THREE.Group(), spin = new THREE.Group();
    grp.add(new THREE.Mesh(hubGeo, hubMat));
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(bladeGeo, bladeMat); m.rotation.z = (i / 3) * Math.PI * 2; spin.add(m); }
    spin.position.z = 0.28; grp.add(spin);
    grp.position.set(x + 0.5, y + 1.05, z + 0.5);
    ctx.scene.add(grp);
    r = { grp, spin, a: Math.random() * 6 }; rotors.set(k, r);
    return r;
  }
  function tickRotors(dt) {
    const wind = ctx.uniforms?.wind?.value, wk = wind ? wind.length() : 0.3;
    const ang = wind ? Math.atan2(wind.x, wind.y) : 0;
    for (const k of turbines) {
      const [x, y, z] = p3(k);
      const near = (x - p.pos.x) ** 2 + (z - p.pos.z) ** 2 < 70 * 70;
      if (!near || w.getBlock(x, y, z) !== TURBINE) { const r = rotors.get(k); if (r) { ctx.scene.remove(r.grp); rotors.delete(k); } continue; }
      const r = rotorFor(k);
      r.grp.rotation.y += ((ang + Math.PI) - r.grp.rotation.y) * Math.min(1, dt * 0.5);
      r.spin.rotation.z += dt * (0.4 + wk * 9);
    }
  }

  // ---------- cintas: también llevan al jugador ----------
  function belts(dt) {
    if (!p.onGround || p.flying) return;
    const b = BLOCKS[w.getBlock(Math.floor(p.pos.x), Math.floor(p.pos.y - 0.1), Math.floor(p.pos.z))];
    if (!b?.belt || !b.facing) return;
    p.moveAxis('x', b.facing[0] * 2.2 * dt); p.moveAxis('z', b.facing[1] * 2.2 * dt);
  }

  // ---------- rocío de los regadores que tienen agua ----------
  let sprayT = 0;
  function spray(dt) {
    sprayT += dt; if (sprayT < 0.35) return; sprayT = 0;
    for (const k of sim.wet || []) {
      const [x, y, z] = p3(k);
      if ((x - p.pos.x) ** 2 + (z - p.pos.z) ** 2 > 30 * 30) continue;
      particles.burst(x, y + 0.4, z, [170, 210, 240], 4, 1.4);
    }
  }

  // ---------- batería: clic derecho muestra la carga ----------
  api.onUseBlock = (t) => {
    if (t.id !== BATTERY) return false;
    const c = sim.containers.get(k3(t.x, t.y, t.z));
    const pct = Math.round(((c?.charge || 0) / BATTERY_MAX) * 100);
    flash(`🔋 Batería: ${pct}% · ${pct > 0 ? `alcanza para unos ${Math.round((c.charge || 0) / 60)} min` : 'conectala a un panel solar, molino o generador para cargarla'}`);
    return true;
  };

  let acc = 0;
  api.update = (dt) => {
    sim.windK = ctx.uniforms?.wind?.value?.length() ?? 0.3;
    acc += dt; if (acc > 0.5) { acc = 0; tickGates(); }
    tickRotors(dt); belts(dt); spray(dt);
  };
  api.dispose = () => {
    w.onChunkReady = prevReady; sim.blockChanged = prevChanged;
    for (const r of rotors.values()) ctx.scene.remove(r.grp);
    rotors.clear(); bladeGeo.dispose(); hubGeo.dispose(); bladeMat.dispose(); hubMat.dispose();
  };
  return api;
}
