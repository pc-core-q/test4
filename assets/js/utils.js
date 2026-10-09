import { STORE_CONFIG } from '../../config/store-config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const getParam = k => new URLSearchParams(location.search).get(k);

export function formatPrice(n) {
  const { symbol, locale, position } = STORE_CONFIG.currency;
  const s = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
  return position === 'before' ? `${symbol} ${s}` : `${s} ${symbol}`;
}

/** Arabic-Indic / Persian digits -> Latin digits */
export function normalizeDigits(s = '') {
  return String(s)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}
export const normalizePhone = s => normalizeDigits(s).replace(/[\s\-().]/g, '');

/** Number for wa.me links: digits only, local leading 0 replaced by the country code. */
export function waNumber(n = '') {
  let d = normalizeDigits(n).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = STORE_CONFIG.phoneCountryCode + d.slice(1);
  return d;
}
export const waLink = (number, text = '') => `https://wa.me/${waNumber(number)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export function safeUrl(u = '') {
  u = String(u).trim();
  if (!u) return '';
  return /^https?:\/\//i.test(u) ? u : 'https://' + u;
}

export function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(extra)) {
    const v = extra[k];
    if (v === undefined || v === null || v === '') continue;
    out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') ? deepMerge(base[k], v) : v;
  }
  return out;
}

/* Small TTL cache (localStorage by default) to avoid repeat Firestore reads. */
const P = () => `${STORE_CONFIG.storeId}:`;
export function cacheGet(key, ttlMin, storage = globalThis.localStorage) {
  try { const r = JSON.parse(storage.getItem(P() + key)); if (r && Date.now() - r.t < ttlMin * 60000) return r.v; } catch { /* ignore */ }
  return null;
}
export function cacheSet(key, v, storage = globalThis.localStorage) { try { storage.setItem(P() + key, JSON.stringify({ t: Date.now(), v })); } catch { /* ignore */ } }
export function cacheClear(prefix = '') {
  try { Object.keys(localStorage).filter(k => k.startsWith(P() + prefix)).forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
}

/** Relative luminance based pick of readable text color (#fff or dark) for a hex background. */
export function readableOn(hex = '#000') {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return '#fff';
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#14171c' : '#ffffff';
}

/** Logs the technical error for developers and returns a safe Arabic message for customers. */
export function reportError(context, err) {
  console.error(`[${context}]`, err);
  const code = err?.code || '';
  if (!navigator.onLine || code === 'unavailable' || /network|fetch/i.test(err?.message || '')) return 'تعذر الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.';
  if (code === 'permission-denied') return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.';
  return 'حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.';
}
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
