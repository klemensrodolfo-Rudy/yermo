// Funciones de la v5 conectadas al juego: entorno (temperatura), hordas, NPC (comercio, misiones,
// instructor, mascotas), notas, armas de fuego, vehículos (bocina, faros, baúl), cámara en tercera
// persona, modo foto, sombras del sol, fases lunares y HUD extra.
import * as THREE from 'three';
import { BLOCKS, ITEMS, itemName } from './blocks.js';
import { BIOME } from './worldgen.js';
import { VEHICLE_TYPES } from './entities.js';
import { traderOffers, makeQuest, questText, noteFor, BEERS } from './npc.js';
import { LEVELS } from './race.js';
import { Avatar } from './net.js';

const $ = (s) => document.querySelector(s);

export function createFeatures(ctx) {
  const { game: g, ui, net, sfx, flash, scene, camera, renderer, uniforms, skyUniforms } = ctx;
  const p = g.player;
  const api = { thirdPerson: 0, photo: false, wantPhoto: false };
  const tracers = [];
  let envAcc = 0, bossAcc = 0, alarmT = 0;
  g.meta.kills = g.meta.kills || {};
  g.meta.quests = g.meta.quests || {};
  g.meta.notesRead = g.meta.notesRead || [];

  // ---------- utilidades de inventario ----------
  const inv = g.inv;
  function has(id, n) { return inv.count(id) >= n; }
  function beersOf(minQ) { const out = []; inv.slots.forEach((s, i) => { if (s && BEERS.includes(s.id) && (s.q ?? 1) >= minQ) out.push(i); }); return out; }
  function beerCount(minQ) { return beersOf(minQ).reduce((n, i) => n + inv.slots[i].count, 0); }
  function takeBeers(n, minQ) {
    // primero las de menor calidad que cumplan
    const idx = beersOf(minQ).sort((a, b) => (inv.slots[a].q ?? 1) - (inv.slots[b].q ?? 1));
    let best = 0;
    for (const i of idx) { while (n > 0 && inv.slots[i]) { best = Math.max(best, inv.slots[i].q ?? 1); inv.slots[i].count--; n--; if (!inv.slots[i].count) inv.slots[i] = null; } }
    inv.onChange();
    return best;
  }
  function pay(list) {
    for (const [id, n] of list) {
      if (id === 'beer' && beerCount(1) < n) return false;
      if (id === 'beer3' && beerCount(3) < n) return false;
      if (typeof id === 'number' && !has(id, n)) return false;
    }
    let q = 0;
    for (const [id, n] of list) {
      if (id === 'beer') q = takeBeers(n, 1); else if (id === 'beer3') q = takeBeers(n, 3); else inv.remove(id, n);
    }
    return q || true;
  }
  const iconImg = (id) => (typeof id === 'number' ? `<img class="gi" src="${ui.icon(id).toDataURL()}">` : `<img class="gi" src="${ui.icon(296).toDataURL()}">`);
  const giveTxt = (id, n) => `${n} × ${id === 'beer' ? 'cerveza (cualquiera)' : id === 'beer3' ? 'cerveza ★★★+' : itemName(id)}`;
  const hasTavern = () => [...g.sim.containers.values()].some((c) => c.type === 'tap' && c.bar && c.seats);

  // ---------- NPC ----------
  api.onInteractMob = (m, hand) => {
    const t = m.type;
    if (t === 'dog') {
      if (m.owner === p.name) { m.sit = !m.sit; flash(m.sit ? 'Tu perro se sienta y espera' : 'Tu perro te sigue'); sfx.bark(); return; }
      if (m.owner) { flash('Este perro ya tiene dueño'); return; }
      if (hand && (hand.id === 271 || hand.id === 272)) {
        inv.consumeHand();
        if (hand.id === 272 || Math.random() < 0.4) { m.owner = p.name; m.fleeT = 0; sfx.bark(); flash('¡Domesticaste al perro! Clic derecho para que se siente o te siga'); p.onEvent('tame'); }
        else { sfx.bark(); flash('El perro come, pero todavía desconfía… (la carne asada ayuda)'); }
      } else flash('Parece hambriento. Probá darle carne.');
      return;
    }
    if (t === 'trader') return openTrader(m);
    if (t === 'leader') return openLeader(m);
    if (t === 'instructor') return openInstructor(m);
    if (t === 'settler') {
      const lines = ['Cuidado de noche, cada siete noches viene la horda.', 'El líder tiene trabajo para los que ayudan.', '¿Tenés cerveza? Hace años que no pruebo una buena.', 'Dicen que en el autódromo hay autos que todavía andan.', 'Los hongos gigantes brillan de noche, muy lindo pero no te acerques mucho.'];
      flash(`Superviviente: «${lines[Math.floor(Math.random() * lines.length)]}»`);
    }
  };

  function tradeRows(list, offers) {
    for (const o of offers) {
      const row = document.createElement('div');
      row.className = 'trade';
      const ok = o.give.every(([id, n]) => (id === 'beer' ? beerCount(1) >= n : id === 'beer3' ? beerCount(3) >= n : has(id, n)));
      row.innerHTML = `<div class="tgive">${o.give.map(([id, n]) => `${iconImg(id)} ${giveTxt(id, n)}`).join('<br>')}</div><div class="tarrow">→</div><div class="tget">${iconImg(o.get[0])} ${o.get[1]} × ${itemName(o.get[0])}${o.note ? `<small>${o.note}</small>` : ''}</div>`;
      const b = document.createElement('button'); b.textContent = 'Cambiar'; b.disabled = !ok;
      b.onclick = () => {
        const r = pay(o.give);
        if (!r) return;
        const extra = o.beer && typeof r === 'number' ? r : 0;
        p.give(o.get[0], o.get[1] + extra);
        sfx.craft(); p.onEvent('trade', o.get[0]);
        if (o.beer) p.onEvent('sellBeer', r);
        ui.refresh();
      };
      row.appendChild(b);
      list.appendChild(row);
    }
  }
  function openTrader(m) {
    const bonus = hasTavern();
    m.offers = m.offers || traderOffers(m.id * 7919 + Math.floor(g.time * 4), bonus);
    ctx.openPanel(`Comerciante errante${bonus ? ' · paga +50% (tenés taberna)' : ''}`, (list) => {
      list.insertAdjacentHTML('beforeend', '<p class="muted">«Compro y vendo de todo. La chatarra es la moneda del yermo.»</p>');
      tradeRows(list, m.offers);
      ctx.ext?.trader?.(list, m);
    });
  }
  function openLeader(m) {
    if (!m.quest) m.quest = makeQuest((m.id * 131 + (g.meta.questsDone || 0) * 17) >>> 0);
    const q = m.quest;
    const key = String(q.id);
    const st = g.meta.quests[key] = g.meta.quests[key] || { base: g.meta.kills[q.mob] ?? 0 };
    if (q.kind === 'kill') q.progress = (g.meta.kills[q.mob] ?? 0) - st.base;
    ctx.openPanel('Líder del asentamiento', (list) => {
      const { need, rew } = questText(q);
      list.insertAdjacentHTML('beforeend', `<div class="quest"><p>«${q.text}»</p><p><b>Tarea:</b> ${need}</p><p><b>Recompensa:</b> ${rew}</p></div>`);
      const b = document.createElement('button'); b.className = 'primary';
      const done = q.kind === 'kill' ? q.progress >= q.n : q.kind === 'beer' ? beerCount(q.q) >= q.n : has(q.item, q.n);
      b.textContent = done ? 'Entregar' : 'Todavía no está';
      b.disabled = !done;
      b.onclick = () => {
        if (q.kind === 'fetch') inv.remove(q.item, q.n);
        if (q.kind === 'beer') takeBeers(q.n, q.q);
        for (const [id, n] of q.reward) p.give(id, n);
        g.meta.questsDone = (g.meta.questsDone || 0) + 1;
        delete g.meta.quests[key];
        m.quest = null;
        sfx.achievement(); flash('¡Misión cumplida! El líder te da tu recompensa.');
        p.onEvent('quest');
        openLeader(m);
      };
      list.appendChild(b);
      list.insertAdjacentHTML('beforeend', '<h3>Intercambios del asentamiento</h3>');
      m.offers = m.offers || traderOffers(m.id * 3571, hasTavern()).slice(0, 5);
      tradeRows(list, m.offers);
      ctx.ext?.leader?.(list, m);
    });
  }
  function openInstructor() {
    ctx.openPanel('Instructor de manejo', (list) => {
      list.insertAdjacentHTML('beforeend', `<p>«¿Querés correr contra mí? Pagame y te espero en la largada. Subite a un vehículo, andá al <b>semáforo</b> de la pista y hacé clic derecho.»</p>${g.hiredInstructor ? `<p class="hint">Ya me contrataste: nivel ${LEVELS[g.hiredInstructor].name}.</p>` : ''}`);
      for (const [k, L] of Object.entries(LEVELS)) {
        const row = document.createElement('div'); row.className = 'trade';
        row.innerHTML = `<div class="tgive"><b>${L.name}</b><br><small>Paga: ${L.priceTxt}</small></div><div class="tget">${k === 'leyenda' ? 'Si le ganás: Plano del Auto de carrera + trofeo' : 'Si le ganás: trofeo'}</div>`;
        const b = document.createElement('button'); b.textContent = 'Contratar';
        b.onclick = () => { if (!pay(L.price)) { flash('No te alcanza'); return; } g.hiredInstructor = k; sfx.craft(); flash(`Contrataste al instructor (${L.name}). Andá al semáforo de largada.`); openInstructor(); };
        row.appendChild(b); list.appendChild(row);
      }
      const rec = Object.values(g.meta.records || {});
      if (rec.length) list.insertAdjacentHTML('beforeend', `<p class="muted">Tu mejor vuelta: ${Math.min(...rec).toFixed(2)} s</p>`);
    });
  }

  // ---------- marcadores del mundo ----------
  api.onMarker = (type, x, y, z) => {
    if (type === 'racecar' || type === 'racebike' || type === 'truck') {
      g.vehicles.spawn(new THREE.Vector3(x + 0.5, y + 1.02, z + 0.5), 0, type);
    } else if (type === 'leader' || type === 'instructor') {
      for (const m of g.mobs.list.values()) if (m.type === type && m.pos.distanceTo(new THREE.Vector3(x, y, z)) < 25) return;
      let sx = x + 0.5, sy = y + 1, sz = z + 0.5;
      if (type === 'instructor') {
        // a la vista: en la calle de boxes, al lado del semáforo de largada
        const c = g.gen.circuitNear(x, z);
        if (c) { sx = c.x + 4.5; sy = c.y + 1; sz = c.z + c.R + 8.5; }
      }
      const m = g.mobs.add(type, sx, sy, sz); m.home = m.pos.clone(); m.marker = `${x},${y},${z}`;
      if (type === 'leader') for (let i = 0; i < 3; i++) { const s = g.mobs.add('settler', x + 0.5 + (i - 1) * 5, y + 1, z + 5.5); s.home = s.pos.clone(); }
    }
  };

  // ---------- armas de fuego ----------
  function tracer(a, b, color = 0xffe08a) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z)]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    scene.add(line); tracers.push({ line, t: 0.12 });
  }
  api.onGun = (o, dir, gun, mul) => {
    sfx.gun(gun.pellets);
    const muzzle = o.clone().add(new THREE.Vector3(Math.cos(p.yaw) * 0.2, -0.15, -Math.sin(p.yaw) * 0.2));
    for (let i = 0; i < gun.pellets; i++) {
      const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * gun.spread * 2, (Math.random() - 0.5) * gun.spread * 2, (Math.random() - 0.5) * gun.spread * 2)).normalize();
      const hm = g.mobs.raycast(o, d, gun.range), hb = g.world.raycast(o, d, gun.range), hp = net.pvpRaycast(o, d, gun.range);
      const best = [hm && { t: 'm', d: hm.dist, h: hm }, hb && { t: 'b', d: hb.dist, h: hb }, hp && { t: 'p', d: hp.dist, h: hp }].filter(Boolean).sort((a, b) => a.d - b.d)[0];
      const end = o.clone().addScaledVector(d, best ? best.d : gun.range);
      tracer(muzzle, end);
      if (best?.t === 'm') { g.mobs.hit(best.h.mob, Math.round(gun.dmg * mul), d, p); p.onEvent('shotHit', best.h.mob.type); }
      else if (best?.t === 'p') net.hitPlayer(best.h.id, Math.round(gun.dmg * mul), d);
      else if (best?.t === 'b') ctx.particles.burst(best.h.x, best.h.y, best.h.z, [120, 110, 100], 4, 0.4);
    }
  };
  g.sim.onTurretShot = (o, t) => { tracer(o, t, 0xff8a4a); if (p.pos.distanceTo(new THREE.Vector3(o.x, o.y, o.z)) < 40) sfx.turret(); };
  g.sim.onAlarm = (x, y, z) => { if (performance.now() < alarmT) return; if (p.pos.distanceTo(new THREE.Vector3(x, y, z)) < 45) { alarmT = performance.now() + 1500; sfx.alarm(); } };

  // ---------- notas ----------
  api.readNote = (i) => {
    const [title, body] = noteFor(i);
    $('#noteTitle').textContent = title; $('#noteBody').textContent = body;
    $('#noteReader').hidden = false;
    document.exitPointerLock();
    const k = ((i % 20) + 20) % 20;
    if (!g.meta.notesRead.includes(k)) { g.meta.notesRead.push(k); p.onEvent('note', g.meta.notesRead.length); }
  };

  // ---------- vehículos ----------
  api.onVehicleStorage = (v) => {
    const VT = VEHICLE_TYPES[v.type];
    const k = 'veh:' + v.id;
    let c = g.sim.containers.get(k);
    if (!c) { c = { type: 'chest', slots: new Array(VT.storage).fill(null) }; g.sim.containers.set(k, c); }
    ctx.openInventory(null, { key: k, c, title: `Baúl · ${VT.name}` });
  };

  // ---------- teclas ----------
  api.key = (e) => {
    if (e.code === 'KeyH' && p.riding) { sfx.horn(); return true; }
    if (e.code === 'KeyL' && p.riding) { p.riding.lights = !p.riding.lights; sfx.click(); flash(p.riding.lights ? 'Faros encendidos' : 'Faros apagados'); return true; }
    if (e.code === 'KeyV' || e.code === 'F5') { e.preventDefault(); api.thirdPerson = (api.thirdPerson + 1) % 3; flash(['Primera persona', 'Tercera persona', 'Cámara frontal'][api.thirdPerson]); return true; }
    if (e.code === 'F2') { e.preventDefault(); api.photo = !api.photo; $('#hud').style.visibility = api.photo ? 'hidden' : ''; flash(api.photo ? 'Modo foto: P saca la captura · F2 para salir' : 'Modo foto desactivado'); return true; }
    if (e.code === 'KeyP' && api.photo) { api.wantPhoto = true; return true; }
    return false;
  };
  api.capture = () => {
    api.wantPhoto = false;
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `yermo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.png`; a.click();
    sfx.photo(); p.onEvent('photo');
    const f = $('#photoFlash'); f.hidden = false; f.style.opacity = 1; setTimeout(() => { f.style.opacity = 0; setTimeout(() => (f.hidden = true), 400); }, 60);
  };

  // ---------- cámara en tercera persona ----------
  let me = null;
  api.camera = () => {
    const mode = api.thirdPerson;
    if (!me) { me = new Avatar(scene, 'me', '', 0); me.tag.visible = false; }
    me.setSkin(net.skin || ctx.skin());
    if (ctx.ext?.pendingEmote) { me.emote(ctx.ext.pendingEmote); ctx.ext.pendingEmote = null; }
    me.group.visible = mode > 0 && !p.dead;
    if (!mode) return;
    me.target.copy(p.pos); me.pos.copy(p.pos); me.tyaw = me.yaw = p.yaw; me.pitch = p.pitch; me.riding = p.riding ? 1 : 0; me.seen = true;
    me.update(0.016);
    if (p.riding) me.group.position.y = p.pos.y + VEHICLE_TYPES[p.riding.type].eye * 0.5 + 0.1;
    const head = new THREE.Vector3(p.pos.x, p.pos.y + 1.6 + (p.riding ? VEHICLE_TYPES[p.riding.type].eye : 0), p.pos.z);
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(p.pitch, p.yaw, 0, 'YXZ'));
    const back = fwd.clone().multiplyScalar(mode === 1 ? -1 : 1);
    const want = p.riding ? (p.riding.type === 'truck' ? 8 : 6) : 4.2;
    const hit = g.world.raycast(head, back, want);
    const dist = hit ? Math.max(0.6, hit.dist - 0.3) : want;
    camera.position.copy(head).addScaledVector(back, dist);
    camera.lookAt(head);
  };

  // ---------- sombras del sol (calidad alta) ----------
  const shadowRT = new THREE.WebGLRenderTarget(2048, 2048, { depthBuffer: true });
  shadowRT.depthTexture = new THREE.DepthTexture(2048, 2048);
  const sunCam = new THREE.OrthographicCamera(-48, 48, 48, -48, 1, 220);
  sunCam.layers.set(1);
  const depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
  uniforms.shadowMap.value = shadowRT.depthTexture;
  api.preRender = () => {
    const on = ctx.settings.quality === 'alto' && uniforms.daylight.value > 0.25 && !p.headInWater;
    uniforms.shadowOn.value = on ? 1 : 0;
    if (!on) return;
    const sd = uniforms.sunDir.value;
    if (sd.y < 0.1) { uniforms.shadowOn.value = 0; return; }
    // personajes, criaturas y vehículos también proyectan sombra
    const mark = (o) => { if (o && !o.userData.shadowed) { o.traverse((c) => c.layers.enable(1)); o.userData.shadowed = true; } };
    for (const m of g.mobs.list.values()) mark(m.group);
    for (const v of g.vehicles.list.values()) mark(v.mesh);
    for (const a of net.avatars.values()) mark(a.group);
    if (me) mark(me.group);
    // encajar a la grilla para evitar parpadeos
    const cx = Math.round(p.pos.x / 4) * 4, cy = Math.round(p.pos.y / 4) * 4, cz = Math.round(p.pos.z / 4) * 4;
    sunCam.position.set(cx + sd.x * 110, cy + sd.y * 110, cz + sd.z * 110);
    sunCam.lookAt(cx, cy, cz);
    sunCam.updateMatrixWorld(); sunCam.updateProjectionMatrix();
    uniforms.shadowMatrix.value.multiplyMatrices(sunCam.projectionMatrix, sunCam.matrixWorldInverse);
    scene.overrideMaterial = depthMat;
    renderer.setRenderTarget(shadowRT);
    renderer.clear();
    renderer.render(scene, sunCam);
    renderer.setRenderTarget(null);
    scene.overrideMaterial = null;
  };

  // ---------- entorno: temperatura, hordas, jefes, faros, fases lunares ----------
  function envTemp() {
    const w = g.world, x = Math.floor(p.pos.x), y = Math.floor(p.pos.y + 1), z = Math.floor(p.pos.z);
    const c = g.gen.column(x, z);
    const day = uniforms.daylight.value;
    let t;
    if (c.biome === BIOME.TUNDRA) t = -12 + day * 10;
    else if (c.biome === BIOME.DESERT) t = 6 + day * 32;
    else if (c.biome === BIOME.MUSHROOM) t = 13 + day * 4;
    else t = 8 + day * 12;
    t -= Math.max(0, p.pos.y - 70) * 0.15;
    if (p.inWater) t -= 6;
    if (g.weather.type === 'rain') t -= 4 * g.weather.k;
    if (!g.sim.skyOpen(x, y, z)) t += 5;
    let heat = 0;
    for (let dx = -3; dx <= 3; dx++) for (let dy = -2; dy <= 2; dy++) for (let dz = -3; dz <= 3; dz++) {
      const b = w.getBlock(x + dx, y + dy, z + dz);
      if (b === 108) heat = Math.max(heat, 17 - Math.hypot(dx, dz) * 3);
      else if (b === 25) heat = Math.max(heat, 10);
      else if (b === 55) heat = Math.max(heat, 18);
      else if (BLOCKS[b]?.render === 'torch' && Math.hypot(dx, dy, dz) < 2.5) heat = Math.max(heat, 6);
    }
    t += heat;
    t += ctx.ext?.tempOffset?.() ?? 0;
    for (const s of Object.values(inv.equip)) if (s && ITEMS[s.id]?.warm) t += 18;
    if (p.riding && (p.riding.type === 'car' || p.riding.type === 'truck')) t += 6;
    p.targetTemp = t;
  }

  api.update = (dt) => {
    // trazadoras
    for (const tr of [...tracers]) { tr.t -= dt; tr.line.material.opacity = Math.max(0, tr.t / 0.12); if (tr.t <= 0) { scene.remove(tr.line); tr.line.geometry.dispose(); tracers.splice(tracers.indexOf(tr), 1); } }
    envAcc += dt;
    if (envAcc > 1) {
      envAcc = 0;
      envTemp();
      // visitas de comerciantes: la primera al minuto de empezar, después cada 5 a 8 minutos
      if (ctx.isAuthority() && !p.dead) {
        g.meta.traderT = (g.meta.traderT ?? 70) - 1;
        const hasTrader = [...g.mobs.list.values()].some((m) => m.type === 'trader');
        if (g.meta.traderT <= 0 && !hasTrader) {
          for (let tries = 0; tries < 10; tries++) {
            const a = Math.random() * Math.PI * 2, tx = Math.floor(p.pos.x + Math.cos(a) * 12), tz = Math.floor(p.pos.z + Math.sin(a) * 12);
            const ty = g.mobs.surfaceY(tx, tz);
            if (ty == null || Math.abs(ty - p.pos.y) > 2.5) continue;
            g.mobs.add('trader', tx + 0.5, ty, tz + 0.5);
            flash('🛒 Se acerca un comerciante errante (mirá el mapa)'); sfx.craft();
            g.meta.traderT = 300 + Math.random() * 180;
            break;
          }
        } else if (hasTrader && g.meta.traderT < 0) g.meta.traderT = 300 + Math.random() * 180;
      }
      // hordas: cada 7 noches
      const nights = g.meta.nights || 0;
      const hordeNight = (nights + 1) % 7 === 0;
      if (ctx.isAuthority()) {
        const t = g.time;
        if (hordeNight && t > 0.76 && t < 0.8 && g.meta.hordeWarned !== nights) { g.meta.hordeWarned = nights; flash('⚠ Esta noche viene la horda. Prepará las defensas.'); sfx.horde(); if (net.active) net.sendChat('⚠ Esta noche viene la horda'); }
        const on = hordeNight && (t > 0.84 || t < 0.2);
        if (on && !g.mobs.horde) { flash('¡LA HORDA ATACA!'); sfx.horde(); }
        if (!on && g.mobs.horde) p.onEvent('hordeSurvived');
        g.mobs.horde = on;
      }
      // jefe del laboratorio
      bossAcc++;
      if (ctx.isAuthority()) for (const [k, c] of g.sim.containers) {
        if (c.type !== 'marker' || !c.boss || c.done) continue;
        const [x, y, z] = k.split(',').map(Number);
        if (Math.hypot(p.pos.x - x, p.pos.y - y, p.pos.z - z) < 11) {
          c.done = true; g.sim.touch(k);
          g.mobs.add('alpha', x + 2.5, y + 1, z + 0.5); sfx.boss(); flash('¡El Mutante alfa despertó!');
        }
      }
      // fases lunares (8 noches por ciclo)
      const k8 = nights % 8;
      const phase = 1 - Math.abs(4 - k8) / 4;
      skyUniforms.moonPhase.value = phase;
      uniforms.moonLight.value = 0.45 + phase * 0.8;
      uniforms.fogHeight.value = g.weather.type === 'ash' ? 0.4 : 1;
    }
    // faros: el vehículo con luces más cercano a la cámara ilumina
    let hl = null, hd = 60;
    for (const v of g.vehicles.list.values()) { if (!v.lights) continue; const d = v.pos.distanceTo(camera.position); if (d < hd) { hd = d; hl = v; } }
    uniforms.hlOn.value = hl && uniforms.daylight.value < 0.7 ? 1 : 0;
    if (hl) {
      const f = new THREE.Vector3(-Math.sin(hl.yaw), -0.18, -Math.cos(hl.yaw)).normalize();
      uniforms.hlPos.value.set(hl.pos.x, hl.pos.y + 0.9, hl.pos.z).addScaledVector(f, 1.2);
      uniforms.hlDir.value.copy(f);
    }
    ctx.voice?.update(p.pos);
    renderExtraHud();
  };

  // ---------- HUD extra ----------
  const cache = {};
  function renderExtraHud() {
    const show = !p.creative;
    // sed (gotas)
    const th = Math.ceil(p.thirst);
    if (cache.th !== th && show) {
      cache.th = th;
      const el = $('#thirst'); el.innerHTML = '';
      for (let i = 0; i < 10; i++) { const v = th - i * 2; const s = document.createElement('i'); s.className = v >= 2 ? 'full' : v === 1 ? 'half' : ''; el.appendChild(s); }
    }
    const tt = Math.round(p.temp);
    const tempTxt = `🌡 ${tt}°${p.temp < 5 ? ' ¡frío!' : p.temp > 36 ? ' ¡calor!' : ''}`;
    if (cache.temp !== tempTxt) { cache.temp = tempTxt; const el = $('#temp'); el.textContent = tempTxt; el.className = p.temp < 5 ? 'cold' : p.temp > 36 ? 'hot' : ''; }
    const sick = [p.disease.infeccion > 0 && '🦠 Infección (antibióticos)', p.disease.intoxicacion > 0 && '🤢 Intoxicación'].filter(Boolean).join(' · ');
    if (cache.sick !== sick) { cache.sick = sick; $('#sick').textContent = sick; }
    // vehículo
    const R = p.riding;
    $('#vehHud').hidden = !R;
    if (R) {
      const VT = VEHICLE_TYPES[R.type];
      $('#vehName').textContent = VT.name + (R.lights ? ' · 💡' : '');
      $('#vehSpeed').textContent = Math.round((R.speed || 0) * 3.6) + ' km/h';
      $('#vehFuel').style.width = VT.tank ? Math.round((R.fuel ?? VT.tank) / VT.tank * 100) + '%' : '0%';
      $('#vehFuelRow').hidden = !VT.tank;
      $('#vehHp').style.width = Math.round((R.hp ?? VT.hp) / VT.hp * 100) + '%';
    }
    $('#hordeBanner').hidden = !g.mobs.horde;
  }

  // ---------- puntos de interés (para el mapa) ----------
  let poiCache = { t: -1e9, list: [] };
  api.pois = () => {
    const now = performance.now();
    if (now - poiCache.t < 5000 && Math.hypot(p.pos.x - poiCache.x, p.pos.z - poiCache.z) < 64) return poiCache.list;
    const gen = g.gen, list = [], R = 700;
    const scan = (cell, fn, label, color, kind) => {
      const gx0 = Math.floor((p.pos.x - R) / cell), gx1 = Math.floor((p.pos.x + R) / cell);
      const gz0 = Math.floor((p.pos.z - R) / cell), gz1 = Math.floor((p.pos.z + R) / cell);
      for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) { const s = fn(gx, gz); if (s) list.push({ x: s.x, z: s.z, label, color, kind }); }
    };
    scan(260, (a, b) => gen.settlementAt(a, b), 'Asentamiento', '#ff8a4a', 'poi');
    scan(330, (a, b) => gen.labAt(a, b), 'Laboratorio', '#9cff3a', 'poi');
    scan(640, (a, b) => gen.circuitAt(a, b), 'Autódromo', '#ff5a4a', 'poi');
    scan(90, (a, b) => gen.breweryAt(a, b), 'Cervecería', '#e0c23a', 'poi');
    scan(176, (a, b) => gen.bunkerAt(a, b), 'Búnker', '#8a9aaa', 'poi');
    // los 2 más cercanos de cada tipo (y todo lo que esté a menos de 200 bloques)
    const d = (m) => Math.hypot(m.x - p.pos.x, m.z - p.pos.z);
    list.sort((a, b) => d(a) - d(b));
    const per = {}, out = [];
    for (const m of list) { per[m.label] = (per[m.label] || 0) + 1; if (per[m.label] <= 2 || d(m) < 200) out.push(m); }
    poiCache = { t: now, x: p.pos.x, z: p.pos.z, list: out };
    return out;
  };

  // mundos creados antes: el instructor quedó guardado adentro de la torre → llevarlo al semáforo
  for (const m of g.mobs.list.values()) {
    if (m.type !== 'instructor') continue;
    const c = g.gen.circuitNear(m.pos.x, m.pos.z);
    if (c) { m.pos.set(c.x + 4.5, c.y + 1, c.z + c.R + 8.5); m.home = m.pos.clone(); }
  }

  // guardar lo propio en la partida
  api.save = (meta) => { meta.npcs = g.mobs.saveKeep(); };
  api.dispose = () => { if (me) me.dispose(); for (const tr of tracers) scene.remove(tr.line); shadowRT.dispose(); uniforms.shadowOn.value = 0; uniforms.hlOn.value = 0; };
  return api;
}
