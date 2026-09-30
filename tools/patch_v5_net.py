import sys
sys.path.insert(0, 'tools')
from rep import rep

p = 'js/net.js'
# avatares con skin
rep(p, """    const jacket = M(col), pants = M(0x3a3530), skin = M(0xb08a6a), mask = M(0x2a2a2a), lens = new THREE.MeshBasicMaterial({ color: 0x9cff3a });""",
    """    const jacket = M(col), pants = M(0x3a3530), skin = M(0xb08a6a), mask = M(0x2a2a2a), lens = new THREE.MeshBasicMaterial({ color: 0x9cff3a });
    this.mats = { jacket, pants, skin, mask, lens };""")
rep(p, """    this.head.add(B(0.46, 0.2, 0.1, mask, 0, 0.05, -0.2));
    this.head.add(B(0.1, 0.08, 0.02, lens, 0.1, 0.12, -0.26));
    this.head.add(B(0.1, 0.08, 0.02, lens, -0.1, 0.12, -0.26));
    g.add(this.head);""", """    this.maskMeshes = [B(0.46, 0.2, 0.1, mask, 0, 0.05, -0.2), B(0.1, 0.08, 0.02, lens, 0.1, 0.12, -0.26), B(0.1, 0.08, 0.02, lens, -0.1, 0.12, -0.26)];
    this.maskMeshes.forEach((m) => this.head.add(m));
    this.hat = B(0.5, 0.14, 0.5, M(0x5a5048), 0, 0.36, 0); this.hat.visible = false; this.head.add(this.hat);
    g.add(this.head);""")
rep(p, """  setTeam(team) {""", """  setSkin(s) {
    if (!s || s === this.skinKey) return;
    this.skinKey = s;
    const [jacket, pants, mask, hat, skinTone] = s.split('|');
    this.mats.jacket.color.set('#' + jacket); this.mats.pants.color.set('#' + pants); this.mats.skin.color.set('#' + skinTone);
    this.maskMeshes.forEach((m) => (m.visible = mask === 'gas'));
    this.hat.visible = hat !== 'none';
    if (hat === 'casco') this.hat.material.color.set(0x8a8e94); else if (hat === 'gorro') this.hat.material.color.set(0xc8302a); else if (hat === 'sombrero') this.hat.material.color.set(0x6a4a2a);
  }
  setTeam(team) {""")

rep(p, """    this.onChat = () => {}; this.onClosed = () => {}; this.onAuthority = () => {};""", """    this.onChat = () => {}; this.onClosed = () => {}; this.onAuthority = () => {}; this.onRace = () => {};
    this.skin = ''; this.hostPeerId = null; this.public = false; this.lobbyAcc = 0;""")
rep(p, """    this.role = 'host'; this.transport = 'peer'; this.authority = true;""", """    this.role = 'host'; this.transport = 'peer'; this.authority = true;
    this.hostPeerId = this.peer.id;""")
rep(p, """    this.role = 'client'; this.transport = 'peer'; this.authority = false;""", """    this.role = 'client'; this.transport = 'peer'; this.authority = false;
    this.hostPeerId = PREFIX + this.code;""")

# el anfitrión valida la protección de terreno y reparte las carreras
rep(p, """      case 'set':
        g.world.applyEdit(m.x, m.y, m.z, m.id);
        this.broadcast(m, from);
        break;
      case 'pos': this.applyPos(from, c.name, m); break;""", """      case 'set': {
        const a = this.avatars.get(from);
        if (!g.sim.canEdit(m.x, m.z, c.name, a?.team)) { const cur = g.world.getBlock(m.x, m.y, m.z); if (cur >= 0) conn.send({ t: 'set', x: m.x, y: m.y, z: m.z, id: cur }); break; }
        g.world.applyEdit(m.x, m.y, m.z, m.id);
        this.broadcast(m, from);
        break;
      }
      case 'race': this.onRace(m); this.broadcast(m, from); break;
      case 'pos': this.applyPos(from, c.name, m); break;""")
rep(p, """    if (m.sw) a.swing = 1;
    if (m.team) a.setTeam(m.team);
  }""", """    if (m.sw) a.swing = 1;
    if (m.team) a.setTeam(m.team);
    if (m.skin) a.setSkin(m.skin);
  }""")
rep(p, """    for (const [id, a] of this.avatars) if (a.seen) out.push({ id, pos: a.pos, dead: a.dead, creative: a.creative, local: false });""",
    """    for (const [id, a] of this.avatars) if (a.seen) out.push({ id, name: a.name, pos: a.pos, dead: a.dead, creative: a.creative, local: false });""")
rep(p, """      case 'chat': this.onChat(m.name, m.text); break;
      case 'cont': g.sim.setRemote(m.k, m.c); g.onRemoteContainer?.(m.k); break;""", """      case 'chat': this.onChat(m.name, m.text); break;
      case 'race': this.onRace(m); break;
      case 'cont': g.sim.setRemote(m.k, m.c); g.onRemoteContainer?.(m.k); break;""")
rep(p, """        for (const [id, name, x, y, z, yaw, pitch, dead, cr, sw, team, ride] of m.players) {
          if (id === this.myId) continue;
          seen.add(id);
          this.applyPos(id, name, { p: [x, y, z, yaw, pitch], dead, cr, sw, team, ride });""", """        for (const [id, name, x, y, z, yaw, pitch, dead, cr, sw, team, ride, skin] of m.players) {
          if (id === this.myId) continue;
          seen.add(id);
          this.applyPos(id, name, { p: [x, y, z, yaw, pitch], dead, cr, sw, team, ride, skin });""")
rep(p, """      const players = [['host', this.myName, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.yaw.toFixed(2), +p.pitch.toFixed(2), p.dead ? 1 : 0, p.creative ? 1 : 0, swing, this.team, ride]];
      for (const [id, a] of this.avatars) players.push([id, a.name, +a.target.x.toFixed(2), +a.target.y.toFixed(2), +a.target.z.toFixed(2), +a.tyaw.toFixed(2), +a.pitch.toFixed(2), a.dead ? 1 : 0, a.creative ? 1 : 0, a.swing > 0.8 ? 1 : 0, a.team, a.riding]);""",
    """      const players = [['host', this.myName, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.yaw.toFixed(2), +p.pitch.toFixed(2), p.dead ? 1 : 0, p.creative ? 1 : 0, swing, this.team, ride, this.skin]];
      for (const [id, a] of this.avatars) players.push([id, a.name, +a.target.x.toFixed(2), +a.target.y.toFixed(2), +a.target.z.toFixed(2), +a.tyaw.toFixed(2), +a.pitch.toFixed(2), a.dead ? 1 : 0, a.creative ? 1 : 0, a.swing > 0.8 ? 1 : 0, a.team, a.riding, a.skinKey]);""")
rep(p, """      const pos = { t: 'pos', p: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.yaw.toFixed(2), +p.pitch.toFixed(2)], dead: p.dead ? 1 : 0, cr: p.creative ? 1 : 0, sw: swing, team: this.team, ride, name: this.myName };""",
    """      const pos = { t: 'pos', p: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.yaw.toFixed(2), +p.pitch.toFixed(2)], dead: p.dead ? 1 : 0, cr: p.creative ? 1 : 0, sw: swing, team: this.team, ride, name: this.myName, skin: this.skin };""")
# publicar la sala en la lista pública (si el sitio tiene lobby)
rep(p, """  // ---------- por frame ----------
  update(dt) {
    if (!this.active || !this.game) return;""", """  async announce() {
    if (!this.isHost || !this.public) return;
    try {
      await fetch('/api/lobby', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: this.code, name: this.myName, world: this.game.meta.name, players: this.conns.size + 1, type: this.game.meta.worldType, mode: this.game.meta.mode }) });
    } catch { /* sin lobby en este sitio */ }
  }

  // ---------- por frame ----------
  update(dt) {
    if (!this.active || !this.game) return;
    this.lobbyAcc += dt;
    if (this.lobbyAcc > 30) { this.lobbyAcc = 0; this.announce(); }""")
print('ok')
