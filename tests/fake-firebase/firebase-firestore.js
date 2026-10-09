const K = 'fakedb';
const load = () => JSON.parse(sessionStorage.getItem(K) || '{}');
const store = d => sessionStorage.setItem(K, JSON.stringify(d));
const rid = () => Math.random().toString(36).slice(2, 12);
const stamp = v => (v && v.__server) ? { __t: Date.now() } : (Array.isArray(v) ? v.map(stamp) : (v && typeof v === 'object' && !v.__t ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, stamp(x)])) : v));
const revive = v => (v && v.__t ? { toMillis: () => v.__t, ms: v.__t } : Array.isArray(v) ? v.map(revive) : (v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)])) : v));
const val = v => (v && v.ms !== undefined ? v.ms : v);
export const getFirestore = () => ({});
export const serverTimestamp = () => ({ __server: true });
export const collection = (db, ...p) => ({ kind: 'col', path: p.join('/') });
export const doc = (a, ...p) => { const path = a.kind === 'col' ? a.path + '/' + (p[0] || rid()) : p.join('/'); return { kind: 'doc', path, id: path.split('/').pop() }; };
const idOf = r => r.path.split('/').pop();
export const where = (f, o, v) => ({ t: 'w', f, o, v });
export const orderBy = (f, d = 'asc') => ({ t: 'o', f, d });
export const limit = n => ({ t: 'l', n });
export const startAfter = x => ({ t: 's', x });
export const query = (c, ...cs) => ({ kind: 'q', c, cs });
const snap = (path, d) => ({ id: path.split('/').pop(), exists: () => d !== undefined, data: () => revive(d), ref: { path } });
function run(q) {
  const db = load(), depth = q.c.path.split('/').length + 1;
  let rows = Object.entries(db).filter(([p]) => p.startsWith(q.c.path + '/') && p.split('/').length === depth).map(([p, d]) => ({ p, d }));
  const ops = { '==': (a, b) => a === b, '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b, in: (a, b) => b.includes(a), 'array-contains': (a, b) => Array.isArray(a) && a.includes(b) };
  for (const c of q.cs.filter(x => x.t === 'w')) rows = rows.filter(r => r.d[c.f] !== undefined && ops[c.o](val(revive(r.d[c.f])), c.v));
  const ord = q.cs.filter(x => x.t === 'o');
  for (const o of [...ord].reverse()) { rows = rows.filter(r => r.d[o.f] !== undefined); rows.sort((a, b) => { const x = val(revive(a.d[o.f])), y = val(revive(b.d[o.f])); return (x > y ? 1 : x < y ? -1 : 0) * (o.d === 'desc' ? -1 : 1); }); }
  const sa = q.cs.find(x => x.t === 's'); if (sa) { const i = rows.findIndex(r => r.p === sa.x.ref.path); rows = rows.slice(i + 1); }
  const lim = q.cs.find(x => x.t === 'l'); if (lim) rows = rows.slice(0, lim.n);
  return rows;
}
export async function getDocs(q) { if (q.kind === 'col') q = query(q); return { docs: run(q).map(r => snap(r.p, r.d)) }; }
export async function getCountFromServer(q) { return { data: () => ({ count: run(q).length }) }; }
export async function getDoc(r) { return snap(r.path, load()[r.path]); }
export async function setDoc(r, data, opt) { const db = load(); db[r.path] = stamp(opt?.merge ? { ...(db[r.path] || {}), ...data } : data); store(db); }
export async function updateDoc(r, data) { return setDoc(r, data, { merge: true }); }
export async function deleteDoc(r) { const db = load(); delete db[r.path]; store(db); }
export async function runTransaction(db, fn) {
  const writes = [];
  const tx = { get: r => getDoc(r), update: (r, d) => writes.push([r, d]), set: (r, d) => writes.push([r, d, true]) };
  await fn(tx); for (const [r, d] of writes) await setDoc(r, d, { merge: true });
}
