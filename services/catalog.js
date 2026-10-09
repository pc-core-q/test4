/** Categories & banners: small collections, public read of active docs only, cached. */
import { STORE_CONFIG } from '../config/store-config.js';
import { isDemo, getFirestore, col, toObj, demoData } from './firebase.js';
import { cacheGet, cacheSet } from '../assets/js/utils.js';

async function listActive(name) {
  if (isDemo) return (await demoData())[name].filter(x => x.active);
  const cached = cacheGet(name, STORE_CONFIG.cacheMinutes.catalog);
  if (cached) return cached;
  const { db, fs } = await getFirestore();
  const snap = await fs.getDocs(fs.query(col(fs, db, name), fs.where('active', '==', true)));
  const items = snap.docs.map(toObj).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  cacheSet(name, items);
  return items;
}
export const listCategories = () => listActive('categories');
export const listBanners = () => listActive('banners');
