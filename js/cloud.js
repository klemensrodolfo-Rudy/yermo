// Mundo del grupo en la nube (Supabase): cuentas, mundos compartidos y progreso de cada jugador.
// El juego en vivo sigue yendo por PeerJS: el primero que entra hace de anfitrión (lo decide la base,
// de forma atómica) y guarda el mundo; los demás se conectan a él solos. Si el anfitrión se va, otro toma la posta.
import { toVox } from './blocks.js';
const SB_URL = 'https://lvfigwfikckzejykgdeb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2Zmlnd2Zpa2NremVqeWtnZGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4MjIwMzcsImV4cCI6MjEwNjM5ODAzN30.R-Rsvk7RmVWsVCTfL5MZESwLoBbsgXNbvAM5xTMzjRg';

// datos de cada jugador (no del mundo)
export const PLAYER_KEYS = ['player', 'inventory', 'equip', 'selected', 'p6', 'spawn', 'blueprints', 'achievements', 'seenHelp', 'tutorial', 'sens', 'renderDist', 'bucketGift'];
// datos locales que no van a la nube
const LOCAL_KEYS = ['id', 'remote', 'cloud', 'cloudName', 'lastPlayed', 'guests'];

// bloques: comprimidos y en base64 (un chunk modificado ocupa unos pocos KB)
export async function pack(u8) {
  const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const b = new Uint8Array(await new Response(s).arrayBuffer());
  let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(bin);
}
export async function unpack(b64) {
  const bin = atob(b64), b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  const s = new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return toVox(new Uint8Array(await new Response(s).arrayBuffer()));
}
const slug = (u) => u.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._-]/g, '');

export const Cloud = {
  sb: null, user: null,
  async init() {
    if (this.sb) return this.user;
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    this.sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'yermo-cloud-auth' } });
    const { data } = await this.sb.auth.getSession();
    this.user = data.session?.user ?? null;
    return this.user;
  },
  get username() { return this.user?.user_metadata?.username || this.user?.email?.split('@')[0] || 'Superviviente'; },
  async signUp(username, pass) {
    const u = slug(username);
    if (u.length < 3) throw new Error('El usuario tiene que tener al menos 3 letras o números.');
    if (pass.length < 6) throw new Error('La contraseña tiene que tener al menos 6 caracteres.');
    const { data, error } = await this.sb.auth.signUp({ email: `${u}@yermo.game`, password: pass, options: { data: { username: username.trim().slice(0, 20) } } });
    if (error) throw new Error(/registered|exists/i.test(error.message) ? 'Ese usuario ya existe: probá con «Entrar».' : error.message);
    if (!data.session) throw new Error('Falta un ajuste en Supabase: desactivá «Confirm email» (ver instrucciones).');
    this.user = data.user;
    return this.user;
  },
  async signIn(username, pass) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: `${slug(username)}@yermo.game`, password: pass });
    if (error) throw new Error(/invalid/i.test(error.message) ? 'Usuario o contraseña incorrectos.' : error.message);
    this.user = data.user;
    return this.user;
  },
  async signOut() { await this.sb.auth.signOut(); this.user = null; },

  // ---------- mundos ----------
  async listWorlds() {
    const { data, error } = await this.sb.rpc('yermo_list_worlds');
    if (error) throw new Error(error.message);
    return data || [];
  },
  async createWorld(m) {
    const { error } = await this.sb.from('yermo_worlds').insert({ id: m.id, name: m.name, seed: m.seed, world_type: m.worldType || 'normal', mode: m.mode || 'survival', meta: m.meta || {} });
    if (error) throw new Error(error.message);
  },
  async deleteWorld(id) { const { error } = await this.sb.from('yermo_worlds').delete().eq('id', id); if (error) throw new Error(error.message); },
  async loadWorld(id) {
    const { data, error } = await this.sb.from('yermo_worlds').select('id, name, seed, world_type, mode, meta, owner, updated_at').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  },
  worldPart(meta) {
    const out = {};
    for (const [k, v] of Object.entries(meta)) if (!PLAYER_KEYS.includes(k) && !LOCAL_KEYS.includes(k)) out[k] = v;
    return out;
  },
  playerPart(meta) {
    const out = {};
    for (const k of PLAYER_KEYS) if (meta[k] !== undefined) out[k] = meta[k];
    return out;
  },
  async saveWorldMeta(id, meta) {
    const { error } = await this.sb.from('yermo_worlds').update({ meta: this.worldPart(meta), updated_at: new Date().toISOString() }).eq('id', id);
    if (error) console.warn('nube: no se guardó el mundo', error.message);
  },
  async chunkKeys(id) {
    const keys = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.sb.from('yermo_chunks').select('key').eq('world_id', id).range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const r of data) keys.push(r.key);
      if (data.length < 1000) break;
    }
    return keys;
  },
  async loadChunk(id, key) {
    const { data, error } = await this.sb.from('yermo_chunks').select('data').eq('world_id', id).eq('key', key).maybeSingle();
    if (error || !data) return null;
    return unpack(data.data);
  },
  async saveChunks(id, list) {
    if (!list.length) return;
    const rows = await Promise.all(list.map(async (c) => ({ world_id: id, key: c.cx + ',' + c.cz, data: await pack(c.data), updated_at: new Date().toISOString() })));
    for (let i = 0; i < rows.length; i += 40) {
      const { error } = await this.sb.from('yermo_chunks').upsert(rows.slice(i, i + 40));
      if (error) console.warn('nube: no se guardaron bloques', error.message);
    }
  },

  // ---------- miembros e invitaciones ----------
  async joinByCode(code) {
    const { data, error } = await this.sb.rpc('yermo_join_world', { code });
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('No hay ningún mundo con ese código.');
    return data[0];
  },
  async getInvite(id) { const { data } = await this.sb.rpc('yermo_get_invite', { w: id }); return data; },
  async newInvite(id) { const { data } = await this.sb.rpc('yermo_new_invite', { w: id }); return data; },
  async members(id) {
    const { data, error } = await this.sb.from('yermo_members').select('user_id, name, role, joined_at').eq('world_id', id).order('joined_at');
    if (error) throw new Error(error.message);
    return data || [];
  },
  async removeMember(id, uid) {
    const { error } = await this.sb.from('yermo_members').delete().eq('world_id', id).eq('user_id', uid);
    if (error) throw new Error(error.message);
  },

  // ---------- jugadores ----------
  async loadPlayer(id) {
    const { data } = await this.sb.from('yermo_players').select('data').eq('world_id', id).eq('user_id', this.user.id).maybeSingle();
    return data?.data ?? null;
  },
  async savePlayer(id, data) {
    const { error } = await this.sb.from('yermo_players').upsert({ world_id: id, user_id: this.user.id, name: this.username, data, updated_at: new Date().toISOString() });
    if (error) console.warn('nube: no se guardó el jugador', error.message);
  },

  // ---------- buzón ----------
  async inbox(worldId) {
    const { data, error } = await this.sb.from('yermo_mail').select('id, from_name, text, items, taken, created_at').eq('world_id', worldId).eq('to_user', this.user.id).order('created_at', { ascending: false }).limit(40);
    if (error) throw new Error(error.message);
    return data || [];
  },
  async sendMail(worldId, toUser, text, items) {
    const { error } = await this.sb.from('yermo_mail').insert({ world_id: worldId, to_user: toUser, from_name: this.username, text: text || null, items: items || null });
    if (error) throw new Error(error.message);
  },
  async takeMail(id) {
    const { data, error } = await this.sb.from('yermo_mail').update({ taken: true }).eq('id', id).eq('taken', false).select('items');
    if (error) throw new Error(error.message);
    return data?.[0]?.items ?? null; // null si ya lo habían tomado
  },
  async deleteMail(id) { await this.sb.from('yermo_mail').delete().eq('id', id); },
  // ---------- marcas del mapa ----------
  async marks(worldId) {
    const { data, error } = await this.sb.from('yermo_marks').select('id, user_id, name, label, icon, x, z').eq('world_id', worldId).limit(300);
    if (error) throw new Error(error.message);
    return data || [];
  },
  async addMark(worldId, m) { const { error } = await this.sb.from('yermo_marks').insert({ world_id: worldId, name: this.username, label: m.label, icon: m.icon, x: m.x, z: m.z }); if (error) throw new Error(error.message); },
  async deleteMark(id) { const { error } = await this.sb.from('yermo_marks').delete().eq('id', id); if (error) throw new Error(error.message); },
  // ---------- galería ----------
  async photos(n = 30) {
    const { data, error } = await this.sb.from('yermo_photos').select('id, user_id, name, caption, world, image, created_at').order('created_at', { ascending: false }).limit(n);
    if (error) throw new Error(error.message);
    return data || [];
  },
  async addPhoto(image, caption, world) { const { error } = await this.sb.from('yermo_photos').insert({ name: this.username, image, caption: caption || null, world: world || null }); if (error) throw new Error(error.message); },
  async deletePhoto(id) { const { error } = await this.sb.from('yermo_photos').delete().eq('id', id); if (error) throw new Error(error.message); },
  // ---------- aventuras ----------
  async adventures() {
    const { data, error } = await this.sb.from('yermo_adventures').select('id, user_id, author, title, description, world_type, trophies, plays, finishes, created_at').order('created_at', { ascending: false }).limit(60);
    if (error) throw new Error(error.message);
    return data || [];
  },
  async adventure(id) { const { data, error } = await this.sb.from('yermo_adventures').select('*').eq('id', id).single(); if (error) throw new Error(error.message); return data; },
  async publishAdventure(a) {
    const row = { author: this.username, title: a.title, description: a.description || null, seed: a.seed, world_type: a.world_type, trophies: a.trophies, data: a.data };
    if (a.id) { const { error } = await this.sb.from('yermo_adventures').update({ ...row, updated_at: new Date().toISOString() }).eq('id', a.id); if (error) throw new Error(error.message); return a.id; }
    const { data, error } = await this.sb.from('yermo_adventures').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    return data.id;
  },
  async deleteAdventure(id) { const { error } = await this.sb.from('yermo_adventures').delete().eq('id', id); if (error) throw new Error(error.message); },
  async countAdventure(id, done) { await this.sb.rpc('yermo_adv_count', { a: id, done }); },

  // ---------- ranking de «una sola vida» ----------
  async submitScore(r) {
    const { error } = await this.sb.from('yermo_scores').insert({ name: (r.name || this.username).slice(0, 20), score: r.score | 0, days: r.days | 0, kills: r.kills | 0, world_type: r.world_type || 'normal', seed: r.seed ?? null, cause: r.cause || null });
    if (error) throw new Error(error.message);
  },
  async topScores(n = 25) {
    const { data, error } = await this.sb.from('yermo_scores').select('name, score, days, kills, world_type, cause, created_at').order('score', { ascending: false }).limit(n);
    if (error) throw new Error(/does not exist|schema cache/i.test(error.message) ? 'falta correr el SQL nuevo en Supabase' : error.message);
    return data || [];
  },

  // ---------- anfitrión ----------
  async aliveHost(id) { const { data } = await this.sb.rpc('yermo_alive_host', { w: id }); return data?.[0] ?? null; },
  async claimHost(id, tok) { const { data, error } = await this.sb.rpc('yermo_claim_host', { w: id, tok, hname: this.username }); if (error) throw new Error(error.message); return !!data; },
  async setHostCode(id, tok, code) { await this.sb.rpc('yermo_set_host_code', { w: id, tok, code }); },
  async beat(id, tok) { const { data } = await this.sb.rpc('yermo_host_beat', { w: id, tok }); return !!data; },
  async release(id, tok) { await this.sb.rpc('yermo_release_host', { w: id, tok }); },
};
