// Jugador: física AABB, controles, romper/colocar, supervivencia, combate y uso de ítems.
import * as THREE from 'three';
import {
  BLOCKS, ITEMS, SOLID, PLACEABLE, LOOT_TABLES, LIQ, LIQ_LEVEL, CROPS, isBlock, isWater,
  wallTorchFor, ladderFor, doorId, collBox, ORIENTED,
} from './blocks.js';
import { VEHICLE_TYPES, tuneStats } from './entities.js';

const HW = 0.3, H = 1.8, EYE = 1.62;
const GRAV = 28, JUMP = 8.6, WALK = 4.3, SPRINT = 6.2, FLY = 11;
const BUFF_TIME = 90;
// orientación a partir del yaw: índice en [-z, +x, +z, -x]
const facingIndex = (yaw) => { const fx = -Math.sin(yaw), fz = -Math.cos(yaw); return Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 1 : 3) : (fz > 0 ? 2 : 0); };

export class Player {
  constructor(world, inv, camera, meta, sfx) {
    this.world = world; this.inv = inv; this.cam = camera; this.sfx = sfx; this.meta = meta;
    this.creative = meta.mode === 'creative';
    const p = meta.player;
    this.pos = new THREE.Vector3(p.x, p.y, p.z);
    this.vel = new THREE.Vector3();
    this.yaw = p.yaw ?? 0; this.pitch = p.pitch ?? 0;
    this.onGround = false; this.inWater = false; this.headInWater = false; this.inLava = false; this.onLadder = false;
    this.flying = false;
    this.keys = {};
    this.mouse = { left: false, right: false };
    this.target = null;
    this.breaking = null;
    this.placeCooldown = 0;
    this.lastSpace = 0;
    this.stepAcc = 0;
    this.swing = 0;
    this.sens = meta.sens ?? 0.0022;
    // supervivencia
    const st = p.stats || {};
    this.health = st.health ?? 20; this.hunger = st.hunger ?? 20; this.rad = st.rad ?? 0;
    this.air = 10; this.invuln = 0; this.dead = false;
    this.acc = { regen: 0, starve: 0, drown: 0, rad: 0, scan: 0, lava: 0 };
    this.radExposure = 0;
    this.extraRad = 0; // clima (lluvia ácida)
    this.attackCd = 0; this.useCd = 0; this.shootCd = 0;
    this.buffs = Object.assign({ coraje: 0, coraza: 0, plomo: 0, humo: 0, acido: 0, frescura: 0, furia: 0, abrigo: 0, vision: 0 }, st.buffs);
    this.drunk = st.drunk ?? 0;
    this.thirst = st.thirst ?? 20;
    this.temp = st.temp ?? 20; this.targetTemp = 20;
    this.disease = Object.assign({ infeccion: 0, intoxicacion: 0 }, st.disease);
    this.sitting = null;
    this.name = 'Superviviente'; this.team = 'none';
    this.vehicles = null; this.vehTarget = null;
    this.mobs = null; this.mobTarget = null; this.playerTarget = null;
    this.riding = null;
    this.sim = null;
    // ganchos
    const noop = () => {};
    this.onBreakStage = noop; this.onStation = noop; this.onDamage = noop; this.onDeath = noop; this.onEvent = noop; this.onBed = noop;
    this.onContainer = noop; this.onShoot = noop; this.onSpawnVehicle = noop; this.onLearn = noop; this.onHitPlayer = noop;
    this.onDrop = noop; this.onBreakParticles = noop;
    this.onGun = noop; this.onReadNote = noop; this.onLever = noop; this.onClaim = noop; this.onBlocked = noop;
    this.onInteractMob = noop; this.onVehicleStorage = noop; this.onRace = noop;
    this.onUseBlock = () => false; this.onUseItem = () => false; // v6
    this.nitroOn = false;
    this.pvpRaycast = () => null;
  }

  get armorDef() {
    let d = 0;
    for (const s of Object.values(this.inv.equip)) if (s) d += ITEMS[s.id]?.def ?? 0;
    if (this.buffs.coraza > 0) d += 0.2;
    if (this.buffs.furia > 0) d += 0.2;
    return Math.min(0.8, d);
  }
  get radRes() {
    let r = 0;
    for (const s of Object.values(this.inv.equip)) if (s) r += ITEMS[s.id]?.radRes ?? 0;
    if (this.buffs.plomo > 0) r += 0.5;
    return Math.min(0.9, r);
  }

  damage(amount, cause, radAdd = 0, knock = null) {
    if (this.noRad) radAdd = 0;
    if (this.creative || this.dead || (amount <= 0 && !radAdd)) return;
    this.rad = Math.min(100, this.rad + radAdd * (1 - this.radRes));
    if (amount <= 0) return;
    if (this.invuln > 0) return;
    const real = cause === 'hambre' || cause === 'radiación' || cause === 'ahogo' ? amount : Math.max(1, Math.round(amount * (1 - this.armorDef)));
    this.health = Math.max(0, this.health - real);
    this.shake = Math.min(1.2, (this.shake || 0) + 0.35 + real * 0.08);
    this.invuln = 0.45;
    // desgaste de armadura
    if (real !== amount) for (const slot of ['head', 'body']) { const s = this.inv.equip[slot]; if (s) { s.dur--; if (s.dur <= 0) { this.inv.equip[slot] = null; this.sfx?.toolBreak(); } } }
    if (knock) this.lastHit = { x: -knock.x, z: -knock.z, t: performance.now() };
    if (knock) { this.vel.x += knock.x * 7; this.vel.z += knock.z * 7; this.vel.y = Math.max(this.vel.y, 4.5); }
    this.onDamage(real, cause);
    // mordidas que infectan
    if ((cause === 'Rata gigante' || cause === 'Necrófago' || cause === 'Reina de las ratas') && Math.random() < 0.12 && !this.disease.infeccion) { this.disease.infeccion = 1; this.onEvent('sick', 'infeccion'); }
    this.inv.onChange();
    if (this.health <= 0) {
      this.dead = true; this.mouse.left = this.mouse.right = false;
      if (this.riding) this.dismount();
      this.onDeath(cause);
    }
  }

  respawn(p) {
    this.pos.set(p.x, p.y, p.z); this.vel.set(0, 0, 0);
    this.health = 20; this.hunger = 20; this.rad = 0; this.air = 10; this.dead = false; this.invuln = 2; this.drunk = 0;
    this.thirst = 20; this.temp = 20; this.disease = { infeccion: 0, intoxicacion: 0 };
  }

  survival(dt, sprinting) {
    for (const k in this.buffs) this.buffs[k] = Math.max(0, this.buffs[k] - dt);
    this.drunk = Math.max(0, this.drunk - dt / 60);
    if (this.creative || this.dead) return;
    if (this.kids) { this.hunger = 20; this.thirst = 20; this.targetTemp = 20; this.temp = 20; this.disease.infeccion = 0; this.disease.intoxicacion = 0; }
    const a = this.acc;
    const moving = Math.hypot(this.vel.x, this.vel.z) > 1;
    const intox = this.disease.intoxicacion > 0;
    this.hunger = Math.max(0, this.hunger - dt * (1 / 70 + (sprinting && moving && this.buffs.frescura <= 0 ? 1 / 35 : 0)) * (intox ? 3 : 1) * (this.temp < 8 ? 1.5 : 1));
    // sed: más rápida con calor
    this.thirst = Math.max(0, this.thirst - dt / 60 * (this.temp > 32 ? 2.2 : 1) * (sprinting && moving ? 1.5 : 1));
    if (this.thirst <= 0) { a.thirst = (a.thirst || 0) + dt; if (a.thirst > 5) { a.thirst = 0; this.damage(1, 'sed'); } }
    // temperatura: se acerca de a poco a la del entorno
    this.temp += (this.targetTemp - this.temp) * Math.min(1, dt / 25);
    if (this.temp < 4 && !(this.buffs.abrigo > 0)) { a.cold = (a.cold || 0) + dt; if (a.cold > 6 * (this.perkCold || 1)) { a.cold = 0; this.damage(1, 'frío'); } }
    if (this.temp > 40) { a.heat = (a.heat || 0) + dt; if (a.heat > 8 * (this.perkCold || 1)) { a.heat = 0; this.damage(1, 'calor'); } }
    // enfermedades
    if (this.disease.infeccion > 0) { this.disease.infeccion += dt; a.inf = (a.inf || 0) + dt; if (a.inf > 20) { a.inf = 0; if (this.health > 2) this.damage(1, 'infección'); } }
    if (intox) this.disease.intoxicacion = Math.max(0, this.disease.intoxicacion - dt);
    // púas
    const under = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.1), Math.floor(this.pos.z));
    if (BLOCKS[under]?.spikes) { a.spike = (a.spike || 0) + dt; if (a.spike > 0.8) { a.spike = 0; this.invuln = 0; this.damage(2, 'púas'); } }
    const regenOk = this.disease.infeccion <= 0 && this.thirst > 3;
    if (this.buffs.acido > 0 && this.health < 20) { a.acid = (a.acid || 0) + dt; if (a.acid > 2) { a.acid = 0; this.health = Math.min(20, this.health + 1); } }
    if (this.hunger >= 15 && this.health < 20 && this.rad < 60 && regenOk) {
      a.regen += dt;
      if (a.regen > 3 / (this.perkRegen || 1)) { a.regen = 0; this.health = Math.min(20, this.health + 1); this.hunger = Math.max(0, this.hunger - 0.5); }
    } else a.regen = 0;
    if (this.hunger <= 0) { a.starve += dt; if (a.starve > 4) { a.starve = 0; if (this.health > 1) this.damage(1, 'hambre'); } }
    const maxAir = 10 * (this.inv.equip.head ? ITEMS[this.inv.equip.head.id]?.air ?? 1 : 1) * (this.perkAir || 1);
    if (this.headInWater) {
      this.air = Math.max(0, this.air - dt);
      if (this.air <= 0) { a.drown += dt; if (a.drown > 1) { a.drown = 0; this.damage(2, 'ahogo'); } }
    } else this.air = Math.min(maxAir, this.air + dt * 4);
    if (this.inLava && !(this.riding && VEHICLE_TYPES[this.riding.type].boat)) { a.lava += dt; if (a.lava > 0.5) { a.lava = 0; this.invuln = 0; this.damage(3, 'lava', 3); } }
    a.scan += dt;
    if (a.scan > 0.5) {
      a.scan = 0;
      let e = 0;
      const w = this.world, x0 = Math.floor(this.pos.x), y0 = Math.floor(this.pos.y + 0.5), z0 = Math.floor(this.pos.z);
      for (let dx = -4; dx <= 4; dx++) for (let dy = -3; dy <= 3; dy++) for (let dz = -4; dz <= 4; dz++) {
        const b = w.getBlock(x0 + dx, y0 + dy, z0 + dz);
        if (b === 21) e += 1.2; else if (b === 29) e += 0.8; else if (b === 22) e += 0.12; else if (LIQ[b] === 3) e += 0.3;
      }
      const feet = w.getBlock(x0, Math.floor(this.pos.y + 0.4), z0);
      const inBoat = this.riding && VEHICLE_TYPES[this.riding.type].boat;
      this.radExposure = this.noRad ? 0 : (Math.min(6, e) + (LIQ[feet] === 1 && !inBoat ? 2.5 : 0) + this.extraRad) * (1 - this.radRes);
    }
    if (this.radExposure > 0) this.rad = Math.min(100, this.rad + this.radExposure * dt);
    else this.rad = Math.max(0, this.rad - 0.35 * dt);
    if (this.rad > 60) {
      a.rad += dt;
      if (a.rad > (this.rad > 85 ? 1.2 : 2.5)) { a.rad = 0; this.damage(1, 'radiación'); }
    } else a.rad = 0;
  }

  look(dx, dy) {
    this.yaw -= dx * this.sens;
    this.pitch -= dy * this.sens * (this.invertY ? -1 : 1);
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  keyDown(code) {
    if (code === 'Space' && this.creative && !this.riding) {
      const now = performance.now();
      if (now - this.lastSpace < 300) { this.flying = !this.flying; this.vel.y = 0; }
      this.lastSpace = now;
    }
    this.keys[code] = true;
  }
  keyUp(code) { this.keys[code] = false; }

  get hw() { return this.riding ? VEHICLE_TYPES[this.riding.type].hw : HW; }

  collides(x, y, z) {
    const hw = this.hw;
    const x0 = Math.floor(x - hw), x1 = Math.floor(x + hw - 1e-6);
    const y0 = Math.floor(y), y1 = Math.floor(y + H - 1e-6);
    const z0 = Math.floor(z - hw), z1 = Math.floor(z + hw - 1e-6);
    for (let bx = x0; bx <= x1; bx++) for (let by = y0; by <= y1; by++) for (let bz = z0; bz <= z1; bz++) {
      const b = this.world.getBlock(bx, by, bz);
      if (b === -1) return true;
      if (!SOLID[b]) continue;
      const cbs = collBox(b, bx, by, bz);
      if (!cbs) return true;
      for (const cb of cbs) if (x + hw > bx + cb[0] && x - hw < bx + cb[3] && y + H > by + cb[1] && y < by + cb[4] && z + hw > bz + cb[2] && z - hw < bz + cb[5]) return true;
    }
    return false;
  }

  moveAxis(axis, d) {
    if (d === 0) return false;
    const p = this.pos;
    const steps = Math.ceil(Math.abs(d) / 0.25);
    const s = d / steps;
    for (let i = 0; i < steps; i++) {
      p[axis] += s;
      if (this.collides(p.x, p.y, p.z)) {
        // subir escalones (losas) o un bloque entero con la moto
        if (axis !== 'y' && this.onGround) {
          const up = this.riding ? VEHICLE_TYPES[this.riding.type].step : 0.55;
          if (!this.collides(p.x, p.y + up, p.z)) {
            let yy = p.y + up;
            while (!this.collides(p.x, yy - 0.05, p.z) && yy > p.y) yy -= 0.05;
            p.y = yy; continue;
          }
        }
        p[axis] -= s;
        if (axis === 'y') {
          if (s < 0) { let yy = p.y; while (!this.collides(p.x, yy - 0.01, p.z) && yy - p.y > s) yy -= 0.01; p.y = yy + 0.0001; }
          else p.y = Math.ceil(p.y + H) - H - 0.0001;
        }
        return true;
      }
    }
    return false;
  }

  // vagonetas y trenes: siguen las vías (bloque 101), doblan en las esquinas y frenan al final
  railSteer(R) {
    const w = this.world, isRail = (x, y, z) => w.getBlock(x, y, z) === 101;
    const bx = Math.floor(this.pos.x), by = Math.floor(this.pos.y + 0.1), bz = Math.floor(this.pos.z);
    const ry = [by, by - 1].find((y) => isRail(bx, y, bz));
    this.onRail = ry != null;
    if (!this.onRail) return;
    const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    let fi = facingIndex(R.yaw);
    const ahead = (i) => [ry, ry + 1, ry - 1].some((y) => isRail(bx + D[i][0], y, bz + D[i][1]));
    const cx = bx + 0.5, cz = bz + 0.5;
    const along = (this.pos.x - cx) * D[fi][0] + (this.pos.z - cz) * D[fi][1];
    const vAlong = this.vel.x * D[fi][0] + this.vel.z * D[fi][1];
    if (!ahead(fi) && along > -0.05 && vAlong >= 0) {
      const side = [(fi + 1) % 4, (fi + 3) % 4].find(ahead);
      if (side != null) {
        fi = side; this.pos.x = cx; this.pos.z = cz;
        const sp = Math.hypot(this.vel.x, this.vel.z); this.vel.x = D[fi][0] * sp; this.vel.z = D[fi][1] * sp;
      } else if (along > 0) { this.pos.x -= D[fi][0] * along; this.pos.z -= D[fi][1] * along; this.vel.x = this.vel.z = 0; }
    }
    R.yaw = Math.atan2(-D[fi][0], -D[fi][1]);
    if (D[fi][0] === 0) { this.pos.x += (cx - this.pos.x) * 0.5; this.vel.x = 0; } else { this.pos.z += (cz - this.pos.z) * 0.5; this.vel.z = 0; }
  }

  mount(v) {
    this.riding = v; this.flying = false; this.pos.copy(v.pos); this.yaw = v.yaw;
    // si la moto quedó pegada a algo, subirla un poco
    for (const up of [0.3, 0.6, 1.0, 1.4]) { if (!this.collides(this.pos.x, this.pos.y, this.pos.z)) break; this.pos.y = v.pos.y + up; }
    this.onEvent('ride');
  }
  dismount() {
    const v = this.riding; this.riding = null;
    if (!v) return;
    // bajarse al costado
    const sx = Math.cos(v.yaw), sz = -Math.sin(v.yaw);
    for (const k of [1.2, -1.2, 0]) if (!this.collides(v.pos.x + sx * k, v.pos.y, v.pos.z + sz * k)) { this.pos.set(v.pos.x + sx * k, v.pos.y, v.pos.z + sz * k); break; }
    return v;
  }

  update(dt, active) {
    const w = this.world;
    const k = this.keys;
    let mx = 0, mz = 0;
    const R = this.riding;
    const VT = R ? VEHICLE_TYPES[R.type] : null;
    const TS = R ? tuneStats(R) : null;
    if (this.sitting) {
      if (active && (k.Space || k.KeyW || k.KeyS)) this.sitting = null;
      else { this.pos.set(this.sitting.x, this.sitting.y, this.sitting.z); this.vel.set(0, 0, 0); this.updateCamera(dt, false, 0); this.afterMove(dt, active); return; }
    }
    if (R) {
      // el vehículo va hacia donde apunta; A/D doblan (más fuerte a baja velocidad)
      const sp = Math.hypot(this.vel.x, this.vel.z);
      const turn = VT.turn * TS.turn * dt * Math.min(1, 0.35 + sp / 6) * (k.KeyS && sp < 3 ? -1 : 1);
      if (VT.rail) this.railSteer(R);
      if (active && (k.KeyA || (this.analog && this.analog.y < -0.3))) R.yaw += turn;
      if (active && (k.KeyD || (this.analog && this.analog.y > 0.3))) R.yaw -= turn;
      let f = active && (k.KeyW || (this.analog && this.analog.x > 0.3)) ? 1 : active && (k.KeyS || (this.analog && this.analog.x < -0.3)) ? -0.35 : 0;
      if (this.aiThrottle != null) f = this.aiThrottle;
      mx = -Math.sin(R.yaw) * f; mz = -Math.cos(R.yaw) * f;
      // combustible
      if (f !== 0 && !this.creative && VT.tank) R.fuel = Math.max(0, (R.fuel ?? VT.tank) - Math.abs(f) * dt * VT.use);
      if (VT.fly && !this.onGround && !this.creative) R.fuel = Math.max(0, (R.fuel ?? VT.tank) - dt * VT.use * 0.4);
    } else if (active) {
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      if (k.KeyW) { mx += fx; mz += fz; }
      if (k.KeyS) { mx -= fx; mz -= fz; }
      if (k.KeyA) { mx -= rx; mz -= rz; }
      if (k.KeyD) { mx += rx; mz += rz; }
      if (this.analog) { mx += this.analog.x * fx + this.analog.y * rx; mz += this.analog.x * fz + this.analog.y * rz; }
    }
    const len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }

    const fx0 = Math.floor(this.pos.x), fz0 = Math.floor(this.pos.z);
    const feet = w.getBlock(fx0, Math.floor(this.pos.y + 0.4), fz0);
    const head = w.getBlock(fx0, Math.floor(this.pos.y + EYE), fz0);
    this.inWater = isWater(feet); this.headInWater = isWater(head);
    this.inLava = LIQ[feet] === 3 || LIQ[head] === 3;
    const liquid = this.inWater || this.inLava;
    this.onLadder = !R && (!!BLOCKS[feet]?.ladder || !!BLOCKS[w.getBlock(fx0, Math.floor(this.pos.y + 1.2), fz0)]?.ladder);

    const sprint = active && (k.ShiftLeft || k.ShiftRight || this.autoRun) && !liquid;
    let speed = R ? VT.speed : this.flying ? FLY * (sprint ? 1.8 : 1) : sprint ? SPRINT : WALK;
    if (!R && this.buffs.frescura > 0) speed *= 1.15;
    this.nitroOn = false;
    if (R) {
      speed *= TS.speed;
      if (TS.nitro && active && (k.ShiftLeft || k.ShiftRight) && (R.nitro ?? 0) > 0 && !VT.fly) { speed *= 1.5; R.nitro = Math.max(0, R.nitro - dt); this.nitroOn = true; }
      else if (TS.nitro) R.nitro = Math.min(5, (R.nitro ?? 0) + dt * 0.12);
      if (VT.fly && this.onGround) speed = 3;
      if (VT.rail && !this.onRail) speed *= 0.15;
      if (VT.tank && (R.fuel ?? VT.tank) <= 0) speed *= 0.12;
      if ((R.hp ?? VT.hp) <= 0) speed *= 0.3;
      if (VT.boat) speed = liquid ? VT.speed : 1.2;
      else if (liquid) speed *= 0.4;
    } else if (liquid && !this.flying) speed *= this.inLava ? 0.35 : 0.55;
    if (!R) speed *= (this.speedMul ?? 1) * (this.perkSpeed ?? 1);
    if (this.drunk >= 3 && !R) { const t = performance.now() / 700; mx += Math.sin(t) * 0.25; mz += Math.cos(t * 1.3) * 0.25; }

    if (w.getBlock(fx0, 1, fz0) === -1) { this.vel.set(0, 0, 0); this.updateCamera(dt, sprint, 0); return; }

    const accel = R ? (this.onGround || (VT.boat && liquid) || VT.fly ? VT.accel * TS.accel : 1) : this.onGround || this.flying || this.onLadder ? 14 : liquid ? 6 : 3.5;
    this.vel.x += (mx * speed - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (mz * speed - this.vel.z) * Math.min(1, accel * dt);

    if (this.flying) {
      let vy = 0;
      if (active && k.Space) vy += FLY; if (active && (k.ControlLeft || k.KeyC)) vy -= FLY;
      this.vel.y += (vy - this.vel.y) * Math.min(1, 12 * dt);
    } else if (this.onLadder) {
      const climbing = active && (k.Space || k.KeyW);
      this.vel.y = climbing ? 3.2 : active && (k.ControlLeft || k.KeyC) ? -3 : Math.max(this.vel.y - GRAV * dt, -2);
    } else if (R && VT.fly) {
      // helicóptero: Espacio sube, Ctrl/C baja; sin nafta planea hacia abajo
      const fuelOk = this.creative || (R.fuel ?? VT.tank) > 0;
      if (fuelOk) {
        let vy = 0;
        if (active && k.Space) vy = 6; else if (active && (k.ControlLeft || k.KeyC)) vy = -6;
        this.vel.y += (vy - this.vel.y) * Math.min(1, 4 * dt);
      } else this.vel.y = Math.max(this.vel.y - GRAV * 0.3 * dt, -6);
    } else if (R && VT.boat && liquid) {
      // el bote flota en la superficie
      const top = this.world.getBlock(fx0, Math.floor(this.pos.y + 0.9), fz0);
      this.vel.y = LIQ[top] ? 2.5 : Math.max(this.vel.y - GRAV * dt, -0.5);
    } else if (liquid) {
      this.vel.y -= GRAV * 0.25 * dt;
      this.vel.y *= Math.pow(0.15, dt);
      if (active && k.Space) this.vel.y = Math.min(this.vel.y + 22 * dt, 3.2);
    } else {
      this.vel.y -= GRAV * dt;
      if (this.vel.y < -50) this.vel.y = -50;
      if (active && k.Space && this.onGround && (!R || VT.jump)) { this.vel.y = R ? VT.jump : JUMP; this.onGround = false; this.onEvent('jump'); }
    }

    const spBefore = Math.hypot(this.vel.x, this.vel.z);
    const hitX = this.moveAxis('x', this.vel.x * dt);
    if (hitX) { if (liquid && active && k.Space && !R) this.vel.y = 5.5; this.vel.x = 0; }
    const hitZ = this.moveAxis('z', this.vel.z * dt);
    if (hitZ) { if (liquid && active && k.Space && !R) this.vel.y = 5.5; this.vel.z = 0; }
    // choques: dañan el vehículo (y un poco al conductor)
    if (R && (hitX || hitZ) && spBefore > 8) {
      R.hp = Math.max(0, (R.hp ?? VT.hp) - (spBefore - 6) * 2 / TS.armor);
      if (spBefore > 14) this.damage(Math.round((spBefore - 12) / 2), 'choque');
      this.sfx?.crash?.(spBefore);
    }
    const vy = this.vel.y;
    const hitY = this.moveAxis('y', vy * dt);
    this.onGround = hitY && vy < 0;
    if (this.onGround && !this.flying && !liquid && !this.onLadder && vy < -12 && !(this.softLand > performance.now())) {
      const dmg = Math.round(vy * vy / 56 - 3.5 - (R ? 2 : 0));
      if (dmg > 0) this.damage(dmg, 'caída');
    }
    if (hitY) { if (vy < 0 && this.flying) this.flying = false; this.vel.y = 0; }
    if (this.pos.y < -20) { this.pos.y = 120; this.vel.set(0, 0, 0); }
    if (R) {
      R.pos.copy(this.pos); R.speed = Math.hypot(this.vel.x, this.vel.z);
      // los autos y camiones atropellan criaturas
      if (VT.ram && R.speed > 6 && this.mobs) for (const m of this.mobs.list.values()) {
        if (m.dying || m.def.boss && VT.ram < 2) continue;
        if (Math.abs(m.pos.x - this.pos.x) < VT.hw + m.def.hw + 0.2 && Math.abs(m.pos.z - this.pos.z) < VT.hw + m.def.hw + 0.2 && Math.abs(m.pos.y - this.pos.y) < 2) {
          if ((m.ramCd || 0) > performance.now()) continue;
          m.ramCd = performance.now() + 600;
          this.mobs.hit(m, Math.round(R.speed * 0.6 * VT.ram), new THREE.Vector3(this.vel.x, 0, this.vel.z).normalize(), this);
        }
      }
    }

    const hsp = Math.hypot(this.vel.x, this.vel.z);
    if (this.onGround && hsp > 1 && !R) {
      this.stepAcc += hsp * dt;
      if (this.stepAcc > 2.1) {
        this.stepAcc = 0;
        this.sfx?.step(w.getBlock(fx0, Math.floor(this.pos.y - 0.1), fz0));
      }
    }
    this.updateCamera(dt, sprint, hsp);
    this.afterMove(dt, active, sprint);
  }

  afterMove(dt, active, sprint = false) {
    const w = this.world;
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(this.cam.rotation);
    this.target = w.raycast(this.cam.position, dir, 6);
    this.swing = Math.max(0, this.swing - dt * 4);
    this.placeCooldown -= dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackCd -= dt; this.useCd -= dt; this.shootCd -= dt;
    this.survival(dt, sprint);
    this.mobTarget = this.mobs ? this.mobs.raycast(this.cam.position, dir, 3.6) : null;
    if (this.mobTarget && this.target && this.target.dist < this.mobTarget.dist) this.mobTarget = null;
    this.playerTarget = this.pvpRaycast(this.cam.position, dir, 3.6);
    this.vehTarget = this.vehicles && !this.riding ? this.vehicles.raycast(this.cam.position, dir, 4) : null;
    if (this.vehTarget && this.target && this.target.dist < this.vehTarget.dist) this.vehTarget = null;
    if (this.playerTarget && ((this.target && this.target.dist < this.playerTarget.dist) || (this.mobTarget && this.mobTarget.dist < this.playerTarget.dist))) this.playerTarget = null;
    if (active && !this.dead) this.interact(dt, dir);
    else { this.breaking = null; this.onBreakStage(-1); }
  }

  updateCamera(dt, sprint, hsp) {
    const bob = this.onGround && !this.riding ? Math.sin(performance.now() / 1000 * hsp * 2.2) * 0.04 * Math.min(1, hsp / 4) * (this.bobMul ?? 1) : 0;
    // sacudón al recibir daño o con explosiones
    this.shake = Math.max(0, (this.shake || 0) - dt * 2.5);
    const sh = this.shake * this.shake * (this.shakeMul ?? 1), sx = (Math.random() - 0.5) * sh * 0.25, sy = (Math.random() - 0.5) * sh * 0.25;
    this.cam.position.set(this.pos.x + sx, this.pos.y + EYE + bob + sy + (this.riding ? VEHICLE_TYPES[this.riding.type].eye : 0) - (this.sitting ? 0.5 : 0), this.pos.z);
    const roll = (this.drunk >= 2 ? Math.sin(performance.now() / 900) * 0.04 * Math.min(3, this.drunk - 1) : 0) + (this.disease.intoxicacion > 0 ? Math.sin(performance.now() / 600) * 0.03 : 0);
    this.cam.rotation.set(this.pitch, this.yaw, roll, 'YXZ');
    const base = this.baseFov || 75;
    const targetFov = (sprint && hsp > 5) || (this.riding && hsp > 8) ? base + 9 : base;
    this.cam.fov += (targetFov - this.cam.fov) * Math.min(1, dt * 8);
    this.cam.updateProjectionMatrix();
  }

  breakTime(id) {
    const b = BLOCKS[id];
    if (b.hardness < 0) return Infinity;
    if (this.creative) return 0.12;
    const hand = this.inv.hand;
    const it = hand && ITEMS[hand.id];
    let t = b.hardness * 1.5;
    const good = it && it.tool && it.tool === b.tool;
    if (good) t /= it.speed;
    const tier = good ? it.tier : 0;
    if (b.tier > 0 && tier < b.tier) t *= 3.3;
    return Math.max(0.05, t / (this.perkMine || 1));
  }
  canHarvest(id) {
    const b = BLOCKS[id];
    if (!b.tier) return true;
    const hand = this.inv.hand; const it = hand && ITEMS[hand.id];
    return !!(it && it.tool === b.tool && it.tier >= b.tier);
  }

  get dmgMul() { return (this.buffs.coraje > 0 ? 1.3 : 1) * (this.buffs.furia > 0 ? 1.6 : 1) * (this.perkDmg || 1); }
  weaponDamage() {
    const it = this.inv.hand && ITEMS[this.inv.hand.id];
    return (it?.weapon ?? 1) * this.dmgMul;
  }

  give(id, n, extra) { const left = this.inv.add(id, n, extra); if (left > 0) this.onDrop(id, left, extra); }
  canEdit(x, z) {
    if (!this.sim || this.creative && !this.sim.claimAt(x, z)) return true;
    const ok = this.sim.canEdit(x, z, this.name, this.team);
    if (!ok) this.onBlocked();
    return ok;
  }

  interact(dt, dir) {
    const t = this.target;
    const hand0 = this.inv.hand, it0 = hand0 && ITEMS[hand0.id];
    // atacar criaturas / jugadores
    if (this.mobTarget || this.playerTarget) {
      if (this.breaking) { this.breaking = null; this.onBreakStage(-1); }
      if (this.mouse.left && this.attackCd <= 0) {
        this.attackCd = 0.45; this.swing = 1;
        const dmg = this.weaponDamage();
        if (this.mobTarget) this.mobs.hit(this.mobTarget.mob, dmg, dir, this);
        else this.onHitPlayer(this.playerTarget.id, Math.round(dmg), dir);
        if (it0?.durability && !it0.armor && !this.creative && this.inv.damageHand()) this.sfx?.toolBreak();
      }
    }
    // clic derecho sobre criaturas/NPC (comerciar, domesticar, hablar)
    if (this.mouse.right && this.mobTarget && this.useCd <= 0) { this.useCd = 0.4; this.mouse.right = false; this.onInteractMob(this.mobTarget.mob, hand0); return; }
    // clic derecho sobre vehículos: cargar nafta, reparar o abrir el baúl
    if (this.mouse.right && this.vehTarget && this.useCd <= 0) {
      this.useCd = 0.4; this.mouse.right = false;
      const v = this.vehTarget.veh, VT = VEHICLE_TYPES[v.type];
      if (it0?.fuel && VT.tank) {
        v.fuel = Math.min(VT.tank, (v.fuel ?? VT.tank) + it0.fuel);
        if (!this.creative) { this.inv.consumeHand(); if (hand0.id === 339) this.give(338, 1); }
        this.sfx?.splash(); this.onEvent('refuel');
      } else if (hand0?.id === 258 && (v.hp ?? VT.hp) < VT.hp) {
        v.hp = Math.min(VT.hp, (v.hp ?? VT.hp) + VT.hp * 0.25); if (!this.creative) this.inv.consumeHand(); this.sfx?.hit(12);
      } else if (VT.storage) this.onVehicleStorage(v);
      return;
    }
    // usar ítems con clic derecho
    if (this.mouse.right && it0 && this.useCd <= 0 && this.useItem(hand0, it0, t, dir)) return;
    if (this.mobTarget || this.playerTarget) return;

    // romper
    if (this.mouse.left && t && !this.breaking && !this.canEdit(t.x, t.z)) { this.mouse.left = false; return; }
    if (this.mouse.left && t) {
      const b = this.breaking;
      if (!b || b.x !== t.x || b.y !== t.y || b.z !== t.z) {
        this.breaking = { x: t.x, y: t.y, z: t.z, id: t.id, progress: 0, time: this.breakTime(t.id), hitAcc: 0 };
      }
      const br = this.breaking;
      br.progress += dt;
      br.hitAcc += dt;
      if (br.hitAcc > 0.25) { br.hitAcc = 0; this.swing = 1; this.sfx?.hit(br.id); }
      const frac = br.progress / br.time;
      if (frac >= 1) {
        this.finishBreak(br);
        this.breaking = null;
        this.onBreakStage(-1);
        if (this.creative) this.mouse.left = false;
      } else this.onBreakStage(Math.min(9, Math.floor(frac * 10)));
    } else if (this.breaking) { this.breaking = null; this.onBreakStage(-1); }

    // colocar / usar bloques
    if (this.mouse.right && t && this.placeCooldown <= 0) {
      this.placeCooldown = 0.25;
      const tb = BLOCKS[t.id];
      const shift = this.keys.ShiftLeft;
      if (!shift) {
        if (this.onUseBlock(t, tb, this.inv.hand)) { this.mouse.right = false; return; }
        if (tb.station) { this.mouse.right = false; this.onStation(tb.station); return; }
        if (tb.bed) { this.mouse.right = false; this.onBed(t.x, t.y, t.z); return; }
        if (tb.container) { this.mouse.right = false; this.onContainer(t.x, t.y, t.z); return; }
        if (tb.door) { this.toggleDoor(t.x, t.y, t.z); this.mouse.right = false; return; }
        if (tb.elec === 'switch') { this.mouse.right = false; this.onLever(t.x, t.y, t.z); this.sfx?.click(); return; }
        if (tb.seat) { this.mouse.right = false; this.sitting = { x: t.x + 0.5, y: t.y + 0.5, z: t.z + 0.5 }; this.yaw = Math.atan2(-tb.facing[0], -tb.facing[1]) + Math.PI; return; }
        if (tb.race) { this.mouse.right = false; this.onRace(t.x, t.y, t.z); return; }
      }
      // beber de una fuente de agua con la mano vacía
      if (!this.inv.hand) {
        const lt = this.world.raycast(this.cam.position, dir, 4, true);
        if (lt && (lt.id === 17 || lt.id === 47) && this.thirst < 20) {
          this.thirst = Math.min(20, this.thirst + 4); this.sfx?.drink();
          if (lt.id === 17) { if (!this.noRad) this.rad = Math.min(100, this.rad + 8 * (1 - this.radRes)); if (Math.random() < 0.2) this.disease.intoxicacion = 60; }
          return;
        }
      }
      const hand = this.inv.hand;
      if (!hand) return;
      const hit = ITEMS[hand.id];
      // azada improvisada: pala sobre tierra → tierra de cultivo
      if (hit?.tool === 'shovel' && (t.id === 4 || t.id === 5 || t.id === 84) && t.face[1] === 1 && this.world.getBlock(t.x, t.y + 1, t.z) === 0) {
        this.world.setBlock(t.x, t.y, t.z, 39); this.swing = 1; this.sfx?.place(4);
        if (!this.creative) this.inv.damageHand();
        return;
      }
      // sembrar
      if (hit?.plant && t.face[1] === 1 && t.id === 39 && this.world.getBlock(t.x, t.y + 1, t.z) === 0) {
        this.world.setBlock(t.x, t.y + 1, t.z, CROPS[hit.plant].base);
        this.swing = 1; this.sfx?.place(4); this.onEvent('plant', hand.id);
        if (!this.creative) this.inv.consumeHand();
        return;
      }
      if (!PLACEABLE(hand.id)) return;
      const px = t.x + t.face[0], py = t.y + t.face[1], pz = t.z + t.face[2];
      if (!this.canEdit(px, pz)) return;
      const cur = this.world.getBlock(px, py, pz);
      if (cur !== 0 && !LIQ[cur] && cur !== 16) return;
      let placeId = hand.id;
      if (hand.id === 26 || hand.id === 61) {
        // antorchas y escaleras: piso o pared sólida (nunca el techo)
        if (!SOLID[t.id] || t.face[1] === -1) return;
        if (hand.id === 61 && t.face[1] !== 0) return;
        if (t.face[1] === 0) placeId = hand.id === 26 ? wallTorchFor(t.face[0], t.face[2]) : ladderFor(t.face[0], t.face[2]);
      }
      if (BLOCKS[hand.id]?.door) return this.placeDoor(px, py, pz, hand);
      // bloques orientados: escaleras, sillas y cintas miran hacia donde mira el jugador
      if (ORIENTED[hand.id]) {
        let fi = facingIndex(this.yaw);
        if (BLOCKS[hand.id].seat) fi = (fi + 2) % 4;
        placeId = ORIENTED[hand.id][fi];
      }
      if (hand.id === 116) { if (t.face[1] !== 0 || !SOLID[t.id]) return; placeId = [116, 117, 118, 119].find((i) => BLOCKS[i].wall2[0] === t.face[0] && BLOCKS[i].wall2[1] === t.face[2]); }
      if (hand.id === 126 && (facingIndex(this.yaw) % 2 === 1)) placeId = 127;
      if (SOLID[placeId] && this.overlapsMe(px, py, pz)) return;
      if (this.world.setBlock(px, py, pz, placeId)) {
        this.swing = 1;
        this.sfx?.place(hand.id);
        this.onEvent('place', hand.id);
        this.onPlace?.(px, py, pz, placeId);
        if (BLOCKS[placeId]?.claim) this.onClaim(px, py, pz);
        if (!this.creative) this.inv.consumeHand();
      }
    }
  }

  overlapsMe(px, py, pz) {
    const p = this.pos, hw = this.hw;
    return px + 1 > p.x - hw && px < p.x + hw && py + 1 > p.y && py < p.y + H && pz + 1 > p.z - hw && pz < p.z + hw;
  }

  placeDoor(x, y, z, hand) {
    const w = this.world;
    if (w.getBlock(x, y + 1, z) !== 0 || !SOLID[w.getBlock(x, y - 1, z)]) return;
    if (this.overlapsMe(x, y, z) || this.overlapsMe(x, y + 1, z)) return;
    // el panel queda perpendicular a la dirección en que mira el jugador
    const axis = Math.abs(Math.sin(this.yaw)) > Math.abs(Math.cos(this.yaw)) ? 'z' : 'x';
    const base = BLOCKS[hand.id].door.base ?? 65;
    w.setBlock(x, y, z, doorId(0, axis, 0, base));
    w.setBlock(x, y + 1, z, doorId(0, axis, 1, base));
    this.swing = 1; this.sfx?.place(base === 65 ? 27 : 23); this.onEvent('place', base);
    if (!this.creative) this.inv.consumeHand();
  }
  toggleDoor(x, y, z) {
    const w = this.world, d = BLOCKS[w.getBlock(x, y, z)].door;
    const by = d.top ? y - 1 : y;
    const open = d.open ? 0 : 1;
    if (!open && (this.overlapsMe(x, by, z) || this.overlapsMe(x, by + 1, z))) return;
    w.setBlock(x, by, z, doorId(open, d.axis, 0, d.base));
    if (BLOCKS[w.getBlock(x, by + 1, z)]?.door) w.setBlock(x, by + 1, z, doorId(open, d.axis, 1, d.base));
    this.sfx?.door(open);
  }

  // clic derecho con un ítem en la mano; devuelve true si lo usó
  useItem(hand, it, t, dir) {
    const w = this.world;
    if (t && !this.canEdit(t.x, t.z) && (it.bucket || hand.id === 277 || it.plant)) return true;
    const consume = () => { if (!this.creative) this.inv.consumeHand(); };
    if (this.onUseItem(hand, it, t, dir)) return true;
    // armaduras: equipar
    if (it.armor) {
      this.useCd = 0.4;
      const slot = it.armor, old = this.inv.equip[slot];
      this.inv.equip[slot] = { ...hand };
      this.inv.slots[this.inv.selected] = old;
      this.inv.onChange(); this.sfx?.place(27); this.onEvent('equip', hand.id);
      return true;
    }
    // cantimplora
    if (it.drink) {
      this.useCd = 0.5;
      if (this.thirst >= 20) return true;
      this.thirst = Math.min(20, this.thirst + it.drink); this.sfx?.drink();
      if (!this.creative) { hand.dur = (hand.dur ?? it.durability) - 1; if (hand.dur <= 0) this.inv.slots[this.inv.selected] = { id: 328, count: 1 }; this.inv.onChange(); }
      return true;
    }
    if (hand.id === 328) {
      const lt = w.raycast(this.cam.position, dir, 4, true);
      if (!lt || lt.id !== 47) { if (lt?.id === 17) this.onBlocked('El agua tóxica no se puede cargar: destilala primero'); return false; }
      this.useCd = 0.4; this.inv.slots[this.inv.selected] = { id: 329, count: 1, dur: 5 }; this.inv.onChange(); this.sfx?.splash();
      return true;
    }
    // notas y libros
    if (it.note) { this.useCd = 0.5; this.mouse.right = false; this.onReadNote(hand.note ?? 0); return true; }
    // comida, cerveza, remedios
    if (it.food || it.antirad || it.heal || it.cures || it.thirst) {
      this.useCd = 0.5;
      if (it.food && this.hunger >= 20 && !it.heal && !it.beer && !it.cures && !this.creative) return true;
      const q = hand.q ?? 1;
      if (it.food) this.hunger = Math.min(20, this.hunger + it.food);
      if (it.thirst) this.thirst = Math.min(20, this.thirst + it.thirst);
      if (it.heal) this.health = Math.min(20, this.health + it.heal + (it.beer ? q - 1 : 0));
      if (it.antirad) this.rad = Math.max(0, this.rad - it.antirad);
      if (it.buff) this.buffs[it.buff] = BUFF_TIME * 0.6 + q * 18;
      if (it.cures === 'infeccion') this.disease.infeccion = hand.id === 323 && Math.random() < 0.5 ? this.disease.infeccion : 0;
      if (it.cures === 'intoxicacion') this.disease.intoxicacion = 0;
      if (hand.id === 271 && Math.random() < 0.3) this.disease.intoxicacion = 60;
      if (it.beer) { this.drunk += it.strong ? 2 : 1; this.lastQ = q; this.onEvent('drink', hand.id); this.sfx?.drink(); if (!this.creative) this.give(295, 1); }
      else this.sfx?.eat();
      consume(); this.onEvent('eat', hand.id);
      return true;
    }
    // armas de fuego
    if (it.gun) {
      if (this.shootCd > 0) return true;
      if (!this.creative && this.inv.count(332) < 1) { this.useCd = 0.5; this.sfx?.click(); this.onBlocked('Sin munición'); return true; }
      this.shootCd = it.gun.cd; this.useCd = 0.1; this.swing = 1;
      if (!this.creative) { this.inv.remove(332, 1); this.inv.damageHand(); }
      this.onGun(this.cam.position.clone(), dir.clone(), it.gun, this.dmgMul);
      return true;
    }
    // planos
    if (it.learn) {
      this.useCd = 0.6;
      this.onLearn(it.learn); consume();
      return true;
    }
    // ballesta
    if (it.ranged) {
      const w = this.world; void w;
      if (this.shootCd > 0) return true;
      if (!this.creative && this.inv.count(300) < 1) { this.useCd = 0.5; this.sfx?.click(); return true; }
      this.shootCd = 0.9; this.useCd = 0.2; this.swing = 1;
      if (!this.creative) { this.inv.remove(300, 1); this.inv.damageHand(); }
      this.onShoot(this.cam.position.clone(), dir.clone(), it.ranged * this.dmgMul);
      this.sfx?.shoot();
      return true;
    }
    // vehículo
    if (it.vehicle) {
      if (!t || t.face[1] !== 1) return false;
      this.useCd = 0.5;
      this.onSpawnVehicle(new THREE.Vector3(t.x + 0.5, t.y + 1.01, t.z + 0.5), this.yaw, it.vehicle);
      consume();
      return true;
    }
    // baldes
    if (hand.id === 277) {
      const lt = w.raycast(this.cam.position, dir, 5, true);
      if (!lt || !LIQ[lt.id] || LIQ_LEVEL[lt.id] !== 0) return false;
      this.useCd = 0.4;
      w.setBlock(lt.x, lt.y, lt.z, 0);
      const filled = LIQ[lt.id] === 1 ? 278 : LIQ[lt.id] === 2 ? 279 : 280;
      if (!this.creative) { this.inv.consumeHand(); this.give(filled, 1); }
      this.sfx?.splash();
      return true;
    }
    if (it.bucket) {
      if (!t) return false;
      const px = t.x + t.face[0], py = t.y + t.face[1], pz = t.z + t.face[2];
      const cur = w.getBlock(px, py, pz);
      if (cur !== 0 && !LIQ[cur]) return false;
      this.useCd = 0.4;
      w.setBlock(px, py, pz, it.bucket);
      if (!this.creative) { this.inv.consumeHand(); this.give(277, 1); }
      this.sfx?.splash();
      return true;
    }
    return false;
  }

  finishBreak(br) {
    const w = this.world;
    const id = w.getBlock(br.x, br.y, br.z);
    if (id <= 0) return;
    const b = BLOCKS[id];
    // puertas: se rompen las dos mitades
    if (b.door) {
      const oy = b.door.top ? br.y - 1 : br.y + 1;
      if (BLOCKS[w.getBlock(br.x, oy, br.z)]?.door) w.setBlock(br.x, oy, br.z, 0);
    }
    // contenedores: soltar su contenido
    let contents = [];
    if (b.container && this.sim) contents = this.sim.removeContainer(br.x, br.y, br.z);
    w.setBlock(br.x, br.y, br.z, 0);
    this.sfx?.broke(id);
    this.onBreakParticles(br.x, br.y, br.z, id);
    this.onEvent('break', id);
    const giveOrDrop = (gid, n) => { if (this.creative) return; this.give(gid, n); };
    for (const s of contents) this.give(s.id, s.count);
    // lo que estaba apoyado en este bloque se cae
    const pop = (x, y, z, dropId) => { w.setBlock(x, y, z, 0); if (dropId) giveOrDrop(dropId, 1); };
    const up = w.getBlock(br.x, br.y + 1, br.z);
    if (up === 26) pop(br.x, br.y + 1, br.z, 26);
    if (BLOCKS[up]?.crop) this.harvest(br.x, br.y + 1, br.z, up, pop);
    if (BLOCKS[up]?.door && !BLOCKS[id]?.door) { pop(br.x, br.y + 1, br.z, BLOCKS[up].door.base); if (BLOCKS[w.getBlock(br.x, br.y + 2, br.z)]?.door) pop(br.x, br.y + 2, br.z, 0); }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = w.getBlock(br.x + dx, br.y, br.z + dz);
      if (n === wallTorchFor(dx, dz)) pop(br.x + dx, br.y, br.z + dz, 26);
      if (n === ladderFor(dx, dz)) pop(br.x + dx, br.y, br.z + dz, 61);
    }
    if (b.crop) { this.harvest(br.x, br.y, br.z, id, () => {}); return; }
    if (this.creative) return;
    if (b.loot) {
      for (const [lid, a, bb, p] of LOOT_TABLES[b.loot]) if (Math.random() < p) this.give(lid, a + Math.floor(Math.random() * (bb - a + 1)), lid === 337 ? { note: this.storyNote?.(br.x, br.z) ?? Math.floor(Math.random() * 1000) } : ITEMS[lid]?.beer ? { q: 1 + Math.floor(Math.random() * 3) } : undefined);
      // suertudo: a veces sale algo de más
      if (this.perkLuck && Math.random() < this.perkLuck) { const T = LOOT_TABLES[b.loot], e = T[Math.floor(Math.random() * T.length)]; if (e[0] !== 337) this.give(e[0], e[1]); }
      this.onEvent('loot', id);
    }
    const dropOv = this.dropFor?.(br.x, br.y, br.z, id);
    if (dropOv) this.give(dropOv, 1);
    else if (this.canHarvest(id) && b.drop) {
      if (!b.dropChance || Math.random() < b.dropChance) this.give(b.drop, b.dropCount);
    }
    if (b.extra) for (const [eid, n, p] of b.extra) if (Math.random() < p) this.give(eid, n, eid === 337 ? { note: this.storyNote?.(br.x, br.z) ?? Math.floor(Math.random() * 1000) } : undefined);
    const hand = this.inv.hand;
    if (hand && ITEMS[hand.id]?.tool) {
      if (this.inv.damageHand()) this.sfx?.toolBreak();
    }
  }

  harvest(x, y, z, id, pop) {
    const c = BLOCKS[id].crop, def = CROPS[c.kind];
    pop(x, y, z, 0);
    if (this.creative) return;
    if (c.stage === 3) {
      if (c.kind === 'potato') this.give(285, 2 + Math.floor(Math.random() * 3));
      else {
        this.give(def.product, 1 + Math.floor(Math.random() * 3));
        this.give(def.seed, 1 + (Math.random() < 0.5 ? 1 : 0));
      }
      this.onEvent('harvest', def.product);
    } else this.give(def.seed, 1);
  }

  serialize() {
    return {
      x: this.pos.x, y: this.pos.y, z: this.pos.z, yaw: this.yaw, pitch: this.pitch,
      stats: { health: this.health, hunger: this.hunger, rad: this.rad, buffs: this.buffs, drunk: this.drunk, thirst: this.thirst, temp: this.temp, disease: this.disease },
    };
  }
}
export { isBlock };
