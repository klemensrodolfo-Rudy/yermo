// Construcción v13.2: pincel para teñir bloques, portones automáticos que se abren al acercarte
// y planos compartibles como código de texto.
import { LIQ } from './blocks.js';

export const COLORS = [
  ['Rojo', '#c83a2e'], ['Naranja', '#d86e22'], ['Amarillo', '#e2be30'], ['Lima', '#78ba30'], ['Verde', '#34783a'], ['Cian', '#289296'],
  ['Celeste', '#60a0d6'], ['Azul', '#2c46a0'], ['Violeta', '#7038a0'], ['Rosa', '#de78a0'], ['Negro', '#222226'], ['Blanco', '#e0ded6'],
];
const CONC = [1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035];
const GLASS = [120, 125, 123, 1057, 121, 1052, 1053, 122, 124, 1054, 1056, 1055];
const CONC_SET = new Set([9, ...CONC]), GLASS_SET = new Set([14, ...GLASS]), BED_SET = new Set([1129, 1130, 1131]);
const PORTON = 1147;
const k3 = (x, y, z) => x + ',' + y + ',' + z;
const p3 = (k) => k.split(',').map(Number);

export function createBuild13(ctx) {
  const { game: g, flash, sfx, particles } = ctx;
  const p = g.player, w = g.world, sim = g.sim, inv = g.inv;
  const api = {};
  const auth = () => ctx.isAuthority();

  // ---------- pincel ----------
  function pickColor(hand) {
    ctx.openPanel('🖌 Elegí un color', (list) => {
      const box = document.createElement('div'); box.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px';
      COLORS.forEach(([n, c], i) => {
        const b = document.createElement('button'); b.innerHTML = `<span style="display:inline-block;width:18px;height:18px;background:${c};border:2px solid #000;vertical-align:middle"></span> ${n}`;
        if ((hand.color ?? 0) === i) b.className = 'primary';
        b.onclick = () => { hand.color = i; inv.onChange(); ctx.closeInventory(); flash(`🖌 Pincel ${n.toLowerCase()}: tocá hormigón, vidrio o una cama para pintarlo`); };
        box.appendChild(b);
      });
      list.appendChild(box);
      list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Pinta hormigón, vidrio (también los de color) y camas. Clic derecho al aire para cambiar de color.</p>');
    });
  }
  function paint(t, hand) {
    const ci = hand.color ?? 0, b = t.id;
    let nb = null;
    if (CONC_SET.has(b)) nb = CONC[ci];
    else if (GLASS_SET.has(b)) nb = GLASS[ci];
    else if (BED_SET.has(b)) nb = ci === 7 ? 1130 : ci === 4 || ci === 3 ? 1131 : ci === 0 || ci === 1 || ci === 9 ? 1129 : null;
    if (!nb) { flash('El pincel pinta hormigón, vidrio y camas'); return; }
    if (nb === b) return;
    if (!p.canEdit(t.x, t.z)) return;
    w.setBlock(t.x, t.y, t.z, nb);
    const c = parseInt(COLORS[ci][1].slice(1), 16);
    particles.burst(t.x, t.y + 0.6, t.z, [(c >> 16) & 255, (c >> 8) & 255, c & 255], 8, 0.4);
    sfx.place?.(nb); p.swing = 1;
    if (!p.creative && inv.damageHand()) sfx.toolBreak?.();
    p.onEvent('v13', 'pintor13');
  }
  api.onUseItem = (hand, it, t) => {
    if (!it.brush) return false;
    p.useCd = 0.2; p.mouse.right = false;
    if (!t) pickColor(hand); else paint(t, hand);
    return true;
  };

  // ---------- portones automáticos ----------
  const gates = new Set();
  for (const k of sim.containers.keys()) if (k.startsWith('porton:')) gates.add(k.slice(7));
  function scan(c) { const d = c.data; if (!d) return; for (let i = 0; i < d.length; i++) if (d[i] === PORTON) gates.add(k3(c.cx * 16 + (i & 15), i >> 8, c.cz * 16 + ((i >> 4) & 15))); }
  const prevReady = w.onChunkReady;
  w.onChunkReady = (c) => { prevReady?.(c); scan(c); };
  for (const c of w.chunks.values()) if (c.state === 'ready') scan(c);
  let opening = false;
  const prevChanged = sim.blockChanged.bind(sim);
  sim.blockChanged = (x, y, z, old, id) => {
    prevChanged(x, y, z, old, id);
    const k = k3(x, y, z);
    if (id === PORTON) gates.add(k);
    else if (old === PORTON && !opening) { gates.delete(k); if (sim.containers.delete('porton:' + k) && auth()) sim.touch('porton:' + k); }
  };
  const people = () => { const out = [p.pos]; for (const a of ctx.net.avatars?.values?.() || []) if (a.seen) out.push(a.pos); return out; };
  let acc = 0;
  function tickGates(dt) {
    acc += dt; if (acc < 0.25 || !auth()) return; acc = 0;
    const ps = people();
    for (const k of [...gates]) {
      const [x, y, z] = p3(k), b = w.getBlock(x, y, z);
      if (b < 0) continue;
      const near = ps.some((q) => Math.abs(q.x - x - 0.5) < 3.5 && Math.abs(q.z - z - 0.5) < 3.5 && q.y > y - 3 && q.y < y + 3);
      const inside = ps.some((q) => Math.floor(q.x) === x && Math.floor(q.z) === z && q.y > y - 2 && q.y < y + 1);
      if (b === PORTON && near) { opening = true; w.setBlock(x, y, z, 0); opening = false; sim.containers.set('porton:' + k, { type: 'porton' }); sim.touch('porton:' + k); if ((x - p.pos.x) ** 2 + (z - p.pos.z) ** 2 < 100) sfx.door?.(1); }
      else if (!near && !inside && (b === 0 || LIQ[b]) && sim.containers.has('porton:' + k)) { w.setBlock(x, y, z, PORTON); sim.containers.delete('porton:' + k); sim.touch('porton:' + k); }
      else if (b !== PORTON && b !== 0 && !LIQ[b]) { gates.delete(k); if (sim.containers.delete('porton:' + k)) sim.touch('porton:' + k); }
    }
  }

  // ---------- planos compartibles ----------
  const loadDesigns = () => { try { return JSON.parse(localStorage.getItem('yermo-designs') || '{}'); } catch { return {}; } };
  const saveDesigns = (d) => { try { localStorage.setItem('yermo-designs', JSON.stringify(d)); } catch { flash('No se pudo guardar'); } };
  async function encode(obj) {
    const s = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const b = new Uint8Array(await new Response(s).arrayBuffer());
    let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return 'YERMO1:' + btoa(bin);
  }
  async function decode(code) {
    const raw = code.trim().replace(/^YERMO1:/, '').replace(/\s+/g, '');
    const bin = atob(raw), b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    const s = new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(s).text());
  }
  function openShare() {
    ctx.openPanel('📤 Compartir planos', (list) => {
      const designs = loadDesigns(), names = Object.keys(designs);
      list.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:15px">Convertí un diseño en un código de texto para mandárselo a alguien (por chat, WhatsApp o el buzón). Quien lo pegue acá lo tiene para construir en sus mundos.</p>');
      const sel = document.createElement('select'); sel.innerHTML = names.length ? names.map((n) => `<option>${n.replace(/</g, '')}</option>`).join('') : '<option value="">(no tenés diseños guardados)</option>';
      const out = document.createElement('textarea'); out.rows = 3; out.style.cssText = 'width:100%;font:inherit;font-size:13px'; out.readOnly = true; out.placeholder = 'Acá aparece el código';
      const bE = document.createElement('button'); bE.textContent = '📤 Generar código'; bE.className = 'primary';
      bE.onclick = async () => { const n = sel.value; if (!n) return; const code = await encode({ name: n, d: designs[n] }); out.value = code; out.select(); try { await navigator.clipboard.writeText(code); flash('📋 Código copiado'); } catch { flash('Copiá el código del recuadro'); } };
      list.append(sel, bE, out);
      list.insertAdjacentHTML('beforeend', '<h3 style="margin:12px 0 4px">Pegar un código</h3>');
      const inp = document.createElement('textarea'); inp.rows = 3; inp.style.cssText = 'width:100%;font:inherit;font-size:13px'; inp.placeholder = 'YERMO1:…';
      inp.addEventListener('keydown', (e) => e.stopPropagation());
      const bI = document.createElement('button'); bI.textContent = '📥 Guardar el diseño';
      bI.onclick = async () => {
        try {
          const o = await decode(inp.value);
          if (!o?.d?.size || !o.d.data) throw new Error('código incompleto');
          const all = loadDesigns(); let n = String(o.name || 'Diseño').slice(0, 24); while (all[n]) n += ' (2)';
          all[n] = o.d; saveDesigns(all); flash(`📥 Diseño «${n}» guardado: construilo con el plano de obra`); p.onEvent('v13', 'planos'); ctx.closeInventory();
        } catch (e) { flash('Ese código no sirve (' + e.message + ')'); }
      };
      list.append(inp, bI);
    });
  }
  api.openShare = openShare;
  const prevBuild = ctx.ext.build;
  ctx.ext.build = (list, t) => {
    prevBuild?.(list, t);
    const b = document.createElement('button'); b.textContent = '📤 Compartir o pegar planos'; b.style.margin = '6px 2px';
    b.onclick = () => openShare(); list.appendChild(b);
  };

  api.update = (dt) => tickGates(dt);
  api.dispose = () => { w.onChunkReady = prevReady; sim.blockChanged = prevChanged; ctx.ext.build = prevBuild; };
  return api;
}
