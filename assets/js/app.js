/** Shared page bootstrap: language, settings, theme, favicon, header/footer, SEO meta. */
import { STORE_CONFIG } from '../../config/store-config.js';
import { loadSettings } from '../../services/settings.js';
import { renderHeader } from '../../components/header.js';
import { renderFooter } from '../../components/footer.js';
import { $, readableOn, safeUrl } from './utils.js';

const RADIUS = { square: '2px', rounded: '10px', pill: '999px' };

export function applyTheme(t) {
  const r = document.documentElement.style;
  r.setProperty('--primary', t.primary); r.setProperty('--on-primary', readableOn(t.primary));
  r.setProperty('--secondary', t.secondary);
  r.setProperty('--accent', t.accent); r.setProperty('--on-accent', readableOn(t.accent));
  r.setProperty('--bg', t.background); r.setProperty('--text', t.text);
  r.setProperty('--radius-btn', RADIUS[t.buttonStyle] || RADIUS.rounded);
  r.setProperty('--font', STORE_CONFIG.fontFamily);
  $('meta[name="theme-color"]')?.setAttribute('content', t.primary);
}

function upsertMeta(attr, key, content) {
  let m = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!m) { m = document.createElement('meta'); m.setAttribute(attr, key); document.head.append(m); }
  m.setAttribute('content', content || '');
}

export function setMeta({ title, description, image, type = 'website' } = {}, s) {
  const fullTitle = title ? `${title} | ${s.storeName}` : (s.seoTitle || s.storeName);
  const desc = description || s.seoDescription || s.storeDescription || '';
  document.title = fullTitle;
  upsertMeta('name', 'description', desc);
  upsertMeta('property', 'og:title', fullTitle);
  upsertMeta('property', 'og:description', desc);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:site_name', s.storeName);
  upsertMeta('property', 'og:locale', 'ar_AR');
  upsertMeta('property', 'og:url', location.href);
  if (image || s.logoUrl) upsertMeta('property', 'og:image', safeUrl(image || s.logoUrl));
}

export function addJsonLd(data) {
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(data);
  document.head.append(el);
}

/** Offline-capable static shell (see sw.js). Skipped silently where unsupported or on file://. */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const reg = () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('[sw]', e));
  document.readyState === 'complete' ? reg() : window.addEventListener('load', reg, { once: true });
}

/** Call once per page. Returns the merged store settings. */
export async function initApp(meta = {}) {
  document.documentElement.lang = STORE_CONFIG.language.lang;
  document.documentElement.dir = STORE_CONFIG.language.dir;
  const s = await loadSettings();
  applyTheme(s.theme);
  if (s.faviconUrl) {
    let l = document.head.querySelector('link[rel="icon"]');
    if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.append(l); }
    l.href = s.faviconUrl;
  }
  renderHeader($('#site-header'), s);
  renderFooter($('#site-footer'), s);
  setMeta(meta, s);
  registerServiceWorker();
  return s;
}
