import { STORE_CONFIG } from '../config/store-config.js';
import { isDemo, getFirestore, col, toObj, demoData } from './firebase.js';

/* ---------- pure helpers (shared by UI + tests) ---------- */
export const effectivePrice = p => (p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price);
export const hasDiscount = p => effectivePrice(p) < p.price;
export const discountPercent = p => Math.round((1 - effectivePrice(p) / p.price) * 100);
export const stockState = (p, threshold = 5) => (p.stock <= 0 ? 'out' : p.stock <= threshold ? 'low' : 'ok');
export const keywordsOf = p => [...new Set([...(p.name || '').toLowerCase().split(/\s+/), ...(p.tags || []).map(t => String(t).toLowerCase()), (p.brand || '').toLowerCase()].filter(Boolean))];

const PAGE = STORE_CONFIG.pageSize;
const demoActive = async () => (await demoData()).products.filter(p => p.status === 'active')
  .map(p => ({ ...p, nameLower: p.name.toLowerCase(), keywords: keywordsOf(p) }))
  .sort((a, b) => b.createdAt - a.createdAt);

/**
 * Paginated list of active products, newest first.
 * -> { items, cursor, hasMore }  (pass `cursor` back to get the next page)
 */
export async function listProducts({ categoryId, featured, limit = PAGE, cursor } = {}) {
  if (isDemo) {
    let items = await demoActive();
    if (categoryId) items = items.filter(p => p.categoryId === categoryId);
    if (featured) items = items.filter(p => p.featured);
    const start = cursor || 0;
    return { items: items.slice(start, start + limit), cursor: start + limit, hasMore: start + limit < items.length };
  }
  const { db, fs } = await getFirestore();
  const c = [fs.where('status', '==', 'active')];
  if (categoryId) c.push(fs.where('categoryId', '==', categoryId));
  if (featured) c.push(fs.where('featured', '==', true));
  c.push(fs.orderBy('createdAt', 'desc'));
  if (cursor) c.push(fs.startAfter(cursor));
  c.push(fs.limit(limit + 1)); // one extra doc tells us whether another page exists
  const docs = (await fs.getDocs(fs.query(col(fs, db, 'products'), ...c))).docs;
  const page = docs.slice(0, limit);
  return { items: page.map(toObj), cursor: page[page.length - 1], hasMore: docs.length > limit };
}

/** Products still in stock but at or below the threshold ("close to selling out"). */
export async function listLowStock(threshold, limit = 8) {
  if (isDemo) return (await demoActive()).filter(p => p.stock > 0 && p.stock <= threshold).sort((a, b) => a.stock - b.stock).slice(0, limit);
  const { db, fs } = await getFirestore();
  const q = fs.query(col(fs, db, 'products'), fs.where('status', '==', 'active'), fs.where('stock', '>', 0), fs.where('stock', '<=', threshold), fs.orderBy('stock'), fs.limit(limit));
  return (await fs.getDocs(q)).docs.map(toObj);
}

export async function getProduct(id) {
  if (!id) return null;
  if (isDemo) return (await demoActive()).find(p => p.id === id) || null;
  try {
    const { db, fs } = await getFirestore();
    const snap = await fs.getDoc(fs.doc(db, 'stores', STORE_CONFIG.storeId, 'products', id));
    return snap.exists() && snap.data().status === 'active' ? toObj(snap) : null;
  } catch (e) { if (e.code === 'permission-denied') return null; throw e; }
}
export async function getProductsByIds(ids) {
  return (await Promise.all([...new Set(ids)].map(id => getProduct(id)))).filter(Boolean);
}

/**
 * Search without downloading the catalog: name prefix + keyword match + category-name match, max ~20 each.
 * Requires `nameLower` and `keywords` fields on products (the admin form writes them).
 */
export async function searchProducts(q, categories = []) {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const first = term.split(/\s+/)[0];
  const cats = categories.filter(c => c.name.toLowerCase().includes(term)).slice(0, 2);
  if (isDemo) {
    return (await demoActive()).filter(p => p.nameLower.includes(term) || p.keywords.includes(first) || cats.some(c => c.id === p.categoryId));
  }
  const { db, fs } = await getFirestore();
  const base = [fs.where('status', '==', 'active')];
  const run = (...c) => fs.getDocs(fs.query(col(fs, db, 'products'), ...base, ...c, fs.limit(20)));
  const results = await Promise.all([
    run(fs.where('nameLower', '>=', term), fs.where('nameLower', '<=', term + '\uf8ff'), fs.orderBy('nameLower')),
    run(fs.where('keywords', 'array-contains', first)),
    ...cats.map(c => run(fs.where('categoryId', '==', c.id)))
  ]);
  const map = new Map();
  results.forEach(s => s.docs.forEach(d => map.set(d.id, toObj(d))));
  return [...map.values()];
}
