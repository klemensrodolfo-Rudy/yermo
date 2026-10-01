// Comodidad v13.0: filtros del mapa grande (con camas y géiseres), descripción de objetos
// manteniendo apretado en la barra (celular) y eventos del cielo: eclipses y lluvias de estrellas.
const CATS = [['lugares', '🏘 Lugares'], ['gente', '🧍 Gente'], ['marcas', '📍 Marcas'], ['tesoros', '🗺 Tesoros'], ['camas', '🛏 Camas'], ['geiseres', '💨 Géiseres']];

export function createQol(ctx) {
  const { game: g, flash, settings } = ctx;
  const p = g.player, meta = g.meta;
  const api = {};
  const off = new Set(settings.mapOff || []);

  // ---------- mapa: categorías y filtros ----------
  const catOf = (m) => m.cat || (m.label?.startsWith('🗺') ? 'tesoros' : m.kind === 'poi' ? 'lugares' : m.kind === 'npc' || m.kind === 'boss' ? 'gente' : m.kind === 'home' ? 'camas' : m.label?.startsWith('🛏') ? 'camas' : m.color && !m.kind && m.label && !m.wp ? 'gente' : 'marcas');
  api.filter = (list) => (off.size ? list.filter((m) => !off.has(catOf(m))) : list);
  api.markers = () => {
    const out = [];
    for (const b of meta.beds || []) if (b.owner === p.name) out.push({ x: b.x, z: b.z, color: '#e06a8a', label: '🛏 ' + (b.name || 'Cama').split(' · ')[0], cat: 'camas' });
    let n = 0;
    for (const G of g.geo?.list?.values() || []) { if (n++ > 40) break; out.push({ x: G.x, z: G.z, color: '#e0f0ff', label: '', cat: 'geiseres' }); }
    return out;
  };
  const wrap = document.querySelector('#bigmapWrap');
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;top:2vh;left:50%;transform:translateX(-50%);display:flex;gap:4px;flex-wrap:wrap;justify-content:center;max-width:94vw;z-index:2';
  function renderBar() {
    bar.innerHTML = '';
    for (const [k, name] of CATS) {
      const b = document.createElement('button'); b.textContent = name; b.style.cssText = `padding:2px 8px;font-size:16px;opacity:${off.has(k) ? 0.45 : 1}`;
      b.onclick = (e) => { e.stopPropagation(); if (off.has(k)) off.delete(k); else off.add(k); settings.mapOff = [...off]; ctx.saveSettings?.(); renderBar(); };
      bar.appendChild(b);
    }
  }
  renderBar();
  wrap?.appendChild(bar);
  bar.addEventListener('mousedown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => e.stopPropagation());

  // ---------- barra: mantener apretado muestra la descripción ----------
  const hb = document.querySelector('#hotbar');
  let lpT = null, lpHide = null;
  const tip = ctx.ui.tooltip;
  hb.addEventListener('touchstart', (e) => {
    const s = e.target.closest('.slot'); if (!s) return;
    clearTimeout(lpT);
    lpT = setTimeout(() => {
      const st = g.inv.slots[+s.dataset.idx]; if (!st) return;
      ctx.ui.showTip(st.id, '', st);
      const r = s.getBoundingClientRect();
      tip.hidden = false;
      tip.style.transform = `translate(${Math.max(6, Math.min(innerWidth - 300, r.left - 80))}px, ${Math.max(6, r.top - tip.offsetHeight - 10)}px)`;
      ctx.input?.buzz?.(8);
      clearTimeout(lpHide); lpHide = setTimeout(() => { tip.hidden = true; }, 3500);
    }, 450);
  }, { passive: true });
  const cancel = () => clearTimeout(lpT);
  hb.addEventListener('touchend', cancel); hb.addEventListener('touchmove', cancel, { passive: true });

  // ---------- cielo: eclipses (de día, raros) y lluvias de estrellas (de noche) ----------
  let lastDay = -1, ecl = null, met = null;
  api.update = (dt) => {
    ctx.uniforms.meP.value.set(p.pos.x, p.pos.y, p.pos.z);
    const day = meta.nights || 0, t = g.time;
    if (day !== lastDay) {
      lastDay = day;
      if (!ecl && Math.random() < 0.05) ecl = { at: 0.45 + Math.random() * 0.1, k: 0 };
      if (!met && Math.random() < 0.12) met = { k: 0 };
    }
    // eclipse: dura un rato alrededor del mediodía
    let ek = 0;
    if (ecl) {
      const d = Math.abs(t - ecl.at);
      ek = d < 0.03 ? 1 - d / 0.03 : 0;
      if (ek > 0.2 && !ecl.told) { ecl.told = true; flash('🌑 ¡Eclipse de sol! La luna tapa el sol por un rato'); p.onEvent('v13', 'cielo'); g.album?.snap('Eclipse de sol'); }
      if (t > ecl.at + 0.05) ecl = null;
    }
    g.eclipse = ek;
    // lluvia de estrellas: toda una noche
    const night = t > 0.8 || t < 0.2;
    if (met) {
      met.k += ((night ? 1 : 0) - met.k) * Math.min(1, dt * 0.2);
      if (night && met.k > 0.3 && !met.told) { met.told = true; flash('🌠 ¡Lluvia de estrellas! Mirá el cielo'); p.onEvent('v13', 'cielo'); }
      if (!night && met.told && met.k < 0.02) met = null;
    }
    g.meteors = met ? met.k : 0;
  };
  api.dispose = () => { bar.remove(); g.eclipse = 0; g.meteors = 0; };
  return api;
}
