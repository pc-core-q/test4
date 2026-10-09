/** Admin data layer: generic CRUD + product building + order status/stock logic + dashboard counts. */
import { STORE_CONFIG, DEFAULT_SETTINGS } from '../config/store-config.js';
import { getFirestore, col, toObj, storeId } from './firebase.js';
import { keywordsOf } from './products.js';
import { cacheClear, deepMerge } from '../assets/js/utils.js';

/* constraint builders: pass to list()/count() */
export const W = (f, o, v) => fs => fs.where(f, o, v);
export const O = (f, d = 'asc') => fs => fs.orderBy(f, d);
export const L = n => fs => fs.limit(n);
export const SA = snap => fs => fs.startAfter(snap);

export async function list(name, ...cons) {
  const { db, fs } = await getFirestore();
  const snap = await fs.getDocs(fs.query(col(fs, db, name), ...cons.map(c => c(fs))));
  return snap.docs.map(d => { const o = toObj(d); Object.defineProperty(o, '_snap', { value: d }); return o; });
}
export async function count(name, ...cons) {
  const { db, fs } = await getFirestore();
  return (await fs.getCountFromServer(fs.query(col(fs, db, name), ...cons.map(c => c(fs))))).data().count;
}
/** Create (no id) or merge-update (id). Returns the id. Clears the storefront cache for cached collections. */
export async function save(name, id, data) {
  const { db, fs } = await getFirestore();
  const ref = id ? fs.doc(db, 'stores', storeId, name, id) : fs.doc(col(fs, db, name));
  await fs.setDoc(ref, { ...data, updatedAt: fs.serverTimestamp(), ...(id ? {} : { createdAt: fs.serverTimestamp() }) }, { merge: true });
  cacheClear(name);
  return ref.id;
}
export async function remove(name, id) {
  const { db, fs } = await getFirestore();
  await fs.deleteDoc(fs.doc(db, 'stores', storeId, name, id));
  cacheClear(name);
}
export async function fetchSettings() {
  const { db, fs } = await getFirestore();
  const s = await fs.getDoc(fs.doc(db, 'stores', storeId, 'settings', 'main'));
  return deepMerge(DEFAULT_SETTINGS, s.exists() ? s.data() : {});
}
export async function saveSettings(data) {
  const { db, fs } = await getFirestore();
  await fs.setDoc(fs.doc(db, 'stores', storeId, 'settings', 'main'), { ...data, updatedAt: fs.serverTimestamp() }, { merge: true });
  cacheClear('settings');
}

/* ---------- product form helpers (pure) ---------- */
const splitList = s => String(s).split(/[,،]/).map(x => x.trim()).filter(Boolean);
/** "المقاس: S, M, L" per line -> [{name, values}] */
export function parseOptions(text = '') {
  return text.split('\n').map(l => { const i = l.indexOf(':'); return i < 1 ? null : { name: l.slice(0, i).trim(), values: [...new Set(splitList(l.slice(i + 1)))] }; })
    .filter(o => o && o.name && o.values.length);
}
export const formatOptions = (o = []) => o.map(x => `${x.name}: ${x.values.join(', ')}`).join('\n');
/** "label: value" per line -> [{label, value}] */
export function parseSpecs(text = '') {
  return text.split('\n').map(l => { const i = l.indexOf(':'); return i < 1 ? null : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() }; }).filter(s => s && s.label && s.value);
}
export const formatSpecs = (s = []) => s.map(x => `${x.label}: ${x.value}`).join('\n');
export const parseTags = (t = '') => [...new Set(splitList(t))];

/** Form values -> Firestore product document (adds the search fields the storefront relies on). */
export function buildProductDoc(f) {
  const doc = {
    name: f.name.trim(), nameLower: f.name.trim().toLowerCase(), description: (f.description || '').trim(),
    categoryId: f.categoryId || '', category: f.category || '',
    price: Number(f.price), discountPrice: Number(f.discountPrice) || 0, stock: Math.max(0, Math.floor(Number(f.stock) || 0)),
    status: f.status === 'draft' ? 'draft' : 'active', featured: !!f.featured,
    sku: (f.sku || '').trim(), brand: (f.brand || '').trim(), tags: parseTags(f.tags),
    options: parseOptions(f.options), specs: parseSpecs(f.specs), images: f.images || []
  };
  doc.keywords = keywordsOf(doc);
  return doc;
}
export function validateProduct(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'اسم المنتج مطلوب.';
  if (!(Number(f.price) > 0)) e.price = 'أدخل سعراً صحيحاً.';
  if (f.discountPrice !== '' && Number(f.discountPrice) > 0 && Number(f.discountPrice) >= Number(f.price)) e.discountPrice = 'سعر الخصم يجب أن يكون أقل من السعر.';
  if (f.stock === '' || !(Number(f.stock) >= 0)) e.stock = 'أدخل كمية صحيحة (0 أو أكثر).';
  return e;
}

/* ---------- inventory / orders ---------- */
export const stockBucket = (stock, threshold) => (stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'ok');

/**
 * Changes an order's status in a transaction. With reduceStockOn='confirmed' the stock is deducted once when the
 * order becomes "confirmed"; cancelling an order whose stock was deducted gives the stock back.
 * -> { stockReduced }
 */
export async function updateOrderStatus(orderId, status, reduceStockOn) {
  const { db, fs } = await getFirestore();
  const oref = fs.doc(db, 'stores', storeId, 'orders', orderId);
  let stockReduced = false;
  await fs.runTransaction(db, async tx => {
    const cur = (await tx.get(oref)).data();
    stockReduced = !!cur.stockReduced;
    const reduce = reduceStockOn === 'confirmed' && status === 'confirmed' && !stockReduced;
    const restore = status === 'cancelled' && stockReduced;
    if (reduce || restore) {
      const qty = {};
      cur.items.forEach(i => { qty[i.productId] = (qty[i.productId] || 0) + i.qty; });
      const ids = Object.keys(qty);
      const refs = ids.map(id => fs.doc(db, 'stores', storeId, 'products', id));
      const snaps = await Promise.all(refs.map(r => tx.get(r)));
      snaps.forEach((s, k) => {
        if (s.exists()) tx.update(refs[k], { stock: Math.max(0, (s.data().stock || 0) + (restore ? 1 : -1) * qty[ids[k]]), updatedAt: fs.serverTimestamp() });
      });
      stockReduced = reduce;
    }
    tx.update(oref, { status, stockReduced, updatedAt: fs.serverTimestamp() });
  });
  return { stockReduced };
}

export async function dashboardStats(t) {
  const P = 'products', Or = 'orders';
  const [products, available, low, out, orders, newOrders, pending, completed] = await Promise.all([
    count(P), count(P, W('stock', '>', t)), count(P, W('stock', '>', 0), W('stock', '<=', t)), count(P, W('stock', '==', 0)),
    count(Or), count(Or, W('status', '==', 'new')), count(Or, W('status', 'in', ['reviewing', 'confirmed', 'preparing', 'shipped'])), count(Or, W('status', '==', 'completed'))
  ]);
  return { products, available, low, out, orders, newOrders, pending, completed };
}
export const STATUS_LABELS = Object.fromEntries(STORE_CONFIG.orderStatuses.map(s => [s.key, s.label]));
