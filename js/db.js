// Tiny IndexedDB wrapper. Falls back to memory if the browser blocks storage (private windows).
let db = null, mem = { days: new Map(), tracks: new Map(), meta: new Map() };
export let persistent = false;

export function open() {
  return new Promise((res) => {
    try {
      const r = indexedDB.open("bible-hours", 1);
      r.onupgradeneeded = () => { ["days", "tracks", "meta"].forEach((n) => r.result.createObjectStore(n)); };
      r.onsuccess = () => { db = r.result; persistent = true; res(true); };
      r.onerror = () => res(false);
      r.onblocked = () => res(false);
    } catch (e) { res(false); }
  });
}
const store = (s, m) => db.transaction(s, m).objectStore(s);
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export async function get(s, k) { return db ? wrap(store(s, "readonly").get(k)) : mem[s].get(k); }
export async function put(s, k, v) { if (db) await wrap(store(s, "readwrite").put(v, k)); else mem[s].set(k, v); }
export async function del(s, k) { if (db) await wrap(store(s, "readwrite").delete(k)); else mem[s].delete(k); }
export async function clearAll() { if (db) { for (const s of ["days", "tracks", "meta"]) await wrap(store(s, "readwrite").clear()); } else mem = { days: new Map(), tracks: new Map(), meta: new Map() }; }
export async function entries(s) {
  if (!db) return Array.from(mem[s].entries());
  return new Promise((res, rej) => {
    const out = [], c = store(s, "readonly").openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } else res(out); };
    c.onerror = () => rej(c.error);
  });
}
