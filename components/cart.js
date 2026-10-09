/** Cart state in localStorage. Every change fires `cart:change` on window. */
import { STORE_CONFIG } from '../config/store-config.js';

const KEY = `cart:${STORE_CONFIG.storeId}`;
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const write = items => {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full/blocked */ }
  window.dispatchEvent(new CustomEvent('cart:change'));
};

export const lineKey = (id, options = {}) => id + '|' + Object.entries(options).sort().map(([k, v]) => `${k}=${v}`).join(';');
export const getCart = read;
export const cartCount = () => read().reduce((s, i) => s + i.qty, 0);
export const cartSubtotal = () => read().reduce((s, i) => s + i.price * i.qty, 0);
export const replaceCart = items => write(items);
export const clearCart = () => write([]);

/** item: { productId, name, category, image, price, options, qty, maxStock } -> { ok, reason? } */
export function addItem(item) {
  const items = read();
  const key = lineKey(item.productId, item.options);
  const max = item.maxStock ?? Infinity;
  const ex = items.find(i => i.key === key);
  if (ex) {
    if (ex.qty >= max) return { ok: false, reason: 'max' };
    ex.qty = Math.min(ex.qty + item.qty, max);
    Object.assign(ex, { maxStock: item.maxStock, price: item.price });
  } else {
    items.push({ ...item, key, qty: Math.min(item.qty, max) });
  }
  write(items);
  return { ok: true };
}
export function setQty(key, qty) {
  const items = read();
  const it = items.find(i => i.key === key);
  if (!it) return;
  it.qty = Math.max(1, Math.min(qty, it.maxStock ?? Infinity));
  write(items);
}
export const removeItem = key => write(read().filter(i => i.key !== key));
