// Clima (tormentas de ceniza, lluvia ácida) y partículas al romper bloques.
import * as THREE from 'three';

export const WEATHER_NAMES = { clear: 'Despejado', ash: 'Tormenta de ceniza', rain: 'Lluvia ácida', storm: 'Tormenta eléctrica', tornado: 'Tornado', snow: 'Nevada' };

export class Weather {
  constructor(scene, state) {
    this.type = state?.type ?? 'clear';
    this.t = state?.t ?? 200 + Math.random() * 200;
    this.k = this.type === 'clear' ? 0 : 1; // intensidad 0..1
    this.authority = true;
    const N = 1600;
    const pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 50, y = (Math.random() - 0.5) * 40, z = (Math.random() - 0.5) * 50;
      pos.set([x, y, z, x + 0.05, y - 0.7, z], i * 6);
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: 0xa8d060, transparent: true, opacity: 0, depthWrite: false });
    this.rain = new THREE.LineSegments(this.geo, this.mat);
    this.rain.frustumCulled = false;
    scene.add(this.rain);
    this.N = N;
  }
  setRemote(type, k) { this.type = type; this.remoteK = k; }
  update(dt, cam) {
    if (this.authority) {
      this.t -= dt;
      if (this.t <= 0) {
        const r = Math.random();
        if (this.type !== 'clear') { this.type = 'clear'; this.t = 240 + Math.random() * 300; }
        else if (r < 0.36) { this.type = 'ash'; this.t = 120 + Math.random() * 120; }
        else if (r < 0.7) { this.type = this.winter ? 'snow' : 'rain'; this.t = 100 + Math.random() * 100; }
        else if (r < 0.9) { this.type = this.winter ? 'snow' : 'storm'; this.t = 90 + Math.random() * 90; }
        else { this.type = 'tornado'; this.t = 70 + Math.random() * 50; }
      }
      const target = this.type === 'clear' ? 0 : 1;
      this.k += Math.sign(target - this.k) * Math.min(Math.abs(target - this.k), dt / 12);
    } else if (this.remoteK != null) this.k += (this.remoteK - this.k) * Math.min(1, dt * 2);
    // lluvia
    const raining = this.type === 'rain' || this.type === 'storm' || this.type === 'snow' ? this.k : 0;
    const snow = this.type === 'snow';
    this.mat.color.setHex(snow ? 0xf0f0f0 : this.type === 'storm' ? 0x9ab0c8 : 0xa8d060);
    this.mat.opacity = raining * (snow ? 0.8 : 0.45);
    this.rain.visible = raining > 0.02;
    if (this.rain.visible) {
      const a = this.geo.attributes.position.array;
      const y0t = performance.now() / 900;
      const len = snow ? 0.08 : 0.7;
      for (let i = 0; i < this.N; i++) {
        const o = i * 6;
        const wx = this.wx || 0, wz = this.wz || 0;
        let x = a[o] + (snow ? Math.sin(i + y0t) * dt * 0.8 : 0) + wx * dt * (snow ? 3 : 7), y = a[o + 1] - dt * (snow ? 3.5 : 22), z = a[o + 2] + wz * dt * (snow ? 3 : 7);
        if (y - cam.y < -20) y += 40;
        if (x - cam.x > 25) x -= 50; else if (x - cam.x < -25) x += 50;
        if (z - cam.z > 25) z -= 50; else if (z - cam.z < -25) z += 50;
        a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = x + 0.05 - wx * len * 0.3; a[o + 4] = y - len; a[o + 5] = z - wz * len * 0.3;
      }
      this.geo.attributes.position.needsUpdate = true;
    }
  }
  get fogMul() { return 1 - (this.type === 'ash' ? 0.65 : this.type === 'rain' || this.type === 'snow' ? 0.3 : this.type === 'storm' ? 0.45 : this.type === 'tornado' ? 0.15 : 0) * this.k; }
  get ashMul() { return 1 + (this.type === 'ash' ? 4 : this.type === 'tornado' ? 2.5 : 0) * this.k; }
  get rainK() { return this.type === 'rain' || this.type === 'storm' ? this.k : 0; }
  get windK() { return this.type === 'ash' ? this.k : this.type === 'rain' ? this.k * 0.4 : this.type === 'storm' ? this.k * 0.7 : this.type === 'tornado' ? this.k : 0; }
  serialize() { return { type: this.type, t: this.t }; }
}

// ---------- partículas ----------
export class Particles {
  constructor(scene) {
    this.N = 500;
    this.pos = new Float32Array(this.N * 3).fill(-9999);
    this.col = new Float32Array(this.N * 3);
    this.vel = new Float32Array(this.N * 3);
    this.life = new Float32Array(this.N);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ size: 0.13, vertexColors: true }));
    this.pts.frustumCulled = false;
    scene.add(this.pts);
    this.next = 0;
    this.enabled = true;
  }
  burst(x, y, z, rgb, n = 14, spread = 1) {
    if (!this.enabled) return;
    for (let k = 0; k < n; k++) {
      const i = this.next = (this.next + 1) % this.N;
      this.pos.set([x + Math.random(), y + Math.random(), z + Math.random()], i * 3);
      this.vel.set([(Math.random() - 0.5) * 4 * spread, Math.random() * 4 + 1, (Math.random() - 0.5) * 4 * spread], i * 3);
      const s = 0.75 + Math.random() * 0.4;
      this.col.set([rgb[0] / 255 * s, rgb[1] / 255 * s, rgb[2] / 255 * s], i * 3);
      this.life[i] = 0.5 + Math.random() * 0.5;
    }
    this.geo.attributes.color.needsUpdate = true;
  }
  update(dt, light) {
    let any = false;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      const o = i * 3;
      this.vel[o + 1] -= 18 * dt;
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      if (this.life[i] <= 0) this.pos[o + 1] = -9999;
    }
    if (any) this.geo.attributes.position.needsUpdate = true;
    this.pts.material.color.setScalar(0.35 + light * 0.65);
  }
}
