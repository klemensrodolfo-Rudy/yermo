import { maxStack, ITEMS, RECIPES } from './blocks.js';

export class Inventory {
  constructor(saved, equip) {
    this.slots = new Array(36).fill(null);
    if (saved) saved.forEach((s, i) => { if (s) this.slots[i] = { ...s }; });
    this.equip = { head: equip?.head ? { ...equip.head } : null, body: equip?.body ? { ...equip.body } : null };
    this.selected = 0;
    this.onChange = () => {};
  }
  get hand() { return this.slots[this.selected]; }

  // extra: { q (calidad de cerveza), dur (durabilidad), note (índice de nota) }
  add(id, n = 1, extra = {}) {
    const ms = maxStack(id);
    const q = extra.q ?? null, label = extra.label ?? null;
    // primero apilar (hotbar → mochila), luego huecos
    for (const pass of [0, 1]) {
      for (let i = 0; i < 36 && n > 0; i++) {
        const s = this.slots[i];
        if (pass === 0 && s && s.id === id && s.count < ms && (s.q ?? null) === q && (s.label ?? null) === label) {
          const k = Math.min(n, ms - s.count); s.count += k; n -= k;
        } else if (pass === 1 && !s) {
          const k = Math.min(n, ms);
          this.slots[i] = { id, count: k };
          if (q != null) this.slots[i].q = q;
          if (extra.dur != null) this.slots[i].dur = extra.dur; else if (ITEMS[id]?.durability) this.slots[i].dur = ITEMS[id].durability;
          if (extra.note != null) this.slots[i].note = extra.note;
          if (extra.art != null) this.slots[i].art = extra.art;
          if (label != null) this.slots[i].label = label;
          n -= k;
        }
      }
    }
    this.onChange();
    return n; // sobrante
  }
  count(id) { let c = 0; for (const s of this.slots) if (s && s.id === id) c += s.count; return c; }
  remove(id, n) {
    for (let i = 35; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) { const k = Math.min(n, s.count); s.count -= k; n -= k; if (!s.count) this.slots[i] = null; }
    }
    this.onChange();
  }
  consumeHand() {
    const s = this.hand; if (!s) return;
    s.count--; if (s.count <= 0) this.slots[this.selected] = null;
    this.onChange();
  }
  damageHand() {
    const s = this.hand; if (!s || s.dur == null) return false;
    s.dur--; if (s.dur <= 0) { this.slots[this.selected] = null; this.onChange(); return true; }
    this.onChange();
    return false;
  }
  canCraft(r, stations, known) {
    if (r.station && !stations.has(r.station)) return false;
    if (r.bp && known && !known.has(r.bp)) return false;
    return r.in.every(([id, n]) => this.count(id) >= n);
  }
  craft(r, stations, known) {
    if (!this.canCraft(r, stations, known)) return false;
    for (const [id, n] of r.in) this.remove(id, n);
    const left = this.add(r.out[0], r.out[1]);
    return left === 0 ? true : left;
  }
  serialize() { return this.slots.map((s) => (s ? { ...s } : null)); }
  serializeEquip() { return { head: this.equip.head ? { ...this.equip.head } : null, body: this.equip.body ? { ...this.equip.body } : null }; }
}

export { RECIPES };
