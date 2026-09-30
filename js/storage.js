// Guardado en IndexedDB: metadatos de mundos + chunks modificados.
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open('yermo', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('worlds', { keyPath: 'id' });
      d.createObjectStore('chunks');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const tx = async (store, mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => res(out && 'result' in out ? out.result : out);
    t.onerror = () => rej(t.error);
  });
};

export const Storage = {
  async listWorlds() {
    try { const all = await tx('worlds', 'readonly', (s) => s.getAll()); return all.sort((a, b) => b.lastPlayed - a.lastPlayed); }
    catch { return []; }
  },
  saveWorld: (w) => tx('worlds', 'readwrite', (s) => s.put(w)).catch(() => {}),
  async deleteWorld(id) {
    await tx('worlds', 'readwrite', (s) => s.delete(id));
    await tx('chunks', 'readwrite', (s) => s.delete(IDBKeyRange.bound(id + ':', id + ':￿')));
  },
  chunkKeys: (id) => tx('chunks', 'readonly', (s) => s.getAllKeys(IDBKeyRange.bound(id + ':', id + ':￿'))).catch(() => []),
  loadChunk: (id, cx, cz) => tx('chunks', 'readonly', (s) => s.get(`${id}:${cx},${cz}`)),
  saveChunks: (id, list) => tx('chunks', 'readwrite', (s) => { for (const c of list) s.put(c.data, `${id}:${c.cx},${c.cz}`); }),
};
