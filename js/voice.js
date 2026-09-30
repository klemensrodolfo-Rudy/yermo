// Chat de voz por proximidad (partidas por código, WebRTC con PeerJS).
// Cada jugador llama a los demás; el volumen baja con la distancia (a 40 bloques no se oye).
export class Voice {
  constructor(net) {
    this.net = net;
    this.stream = null;
    this.calls = new Map(); // peerId -> {call, gain, audio}
    this.on = false;
    this.ctx = null;
  }
  // id de PeerJS de un jugador remoto
  peerIdOf(id) { return id === 'host' ? this.net.hostPeerId : id; }

  async enable() {
    if (this.on) return true;
    if (!this.net.peer) throw new Error('El chat de voz funciona en partidas por código de sala.');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.ctx = new AudioContext();
    this.on = true;
    this.net.peer.on('call', (call) => { call.answer(this.stream); this.attach(call.peer, call); });
    this.sync();
    return true;
  }
  disable() {
    this.on = false;
    for (const c of this.calls.values()) { try { c.call.close(); } catch { /* ignorar */ } }
    this.calls.clear();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close(); this.ctx = null;
  }
  setMuted(m) { this.stream?.getAudioTracks().forEach((t) => (t.enabled = !m)); }

  attach(peerId, call) {
    if (this.calls.has(peerId)) return;
    const entry = { call, gain: null };
    this.calls.set(peerId, entry);
    call.on('stream', (remote) => {
      // Chrome necesita un <audio> para que el stream remoto suene a través de Web Audio
      const a = new Audio(); a.srcObject = remote; a.muted = true; a.play().catch(() => {});
      const src = this.ctx.createMediaStreamSource(remote);
      entry.gain = this.ctx.createGain(); entry.gain.gain.value = 0;
      src.connect(entry.gain); entry.gain.connect(this.ctx.destination);
      entry.audio = a;
    });
    call.on('close', () => this.calls.delete(peerId));
    call.on('error', () => this.calls.delete(peerId));
  }

  // llamar a jugadores nuevos (el de id menor llama, para no duplicar)
  sync() {
    if (!this.on) return;
    const me = this.net.peer.id;
    for (const id of this.net.avatars.keys()) {
      const pid = this.peerIdOf(id);
      if (!pid || this.calls.has(pid) || me > pid) continue;
      const call = this.net.peer.call(pid, this.stream);
      if (call) this.attach(pid, call);
    }
  }

  update(myPos) {
    if (!this.on) return;
    this.acc = (this.acc || 0) + 1;
    if (this.acc % 60 === 0) this.sync();
    for (const [id, a] of this.net.avatars) {
      const e = this.calls.get(this.peerIdOf(id));
      if (!e?.gain) continue;
      const d = a.pos.distanceTo(myPos);
      e.gain.gain.value = Math.max(0, 1 - d / 40) ** 1.5;
    }
  }
}
