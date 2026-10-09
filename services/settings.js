import { STORE_CONFIG, DEFAULT_SETTINGS } from '../config/store-config.js';
import { isDemo, getFirestore, storeId, demoData } from './firebase.js';
import { cacheGet, cacheSet, deepMerge } from '../assets/js/utils.js';

let memo;
/** Store settings = DEFAULT_SETTINGS merged with stores/{id}/settings/main (cached for a few minutes). */
export function loadSettings() {
  return memo ||= (async () => {
    let remote = isDemo ? (await demoData()).settings : cacheGet('settings', STORE_CONFIG.cacheMinutes.settings);
    if (!remote) {
      try {
        const { db, fs } = await getFirestore();
        const snap = await fs.getDoc(fs.doc(db, 'stores', storeId, 'settings', 'main'));
        remote = snap.exists() ? snap.data() : {};
        cacheSet('settings', remote);
      } catch (e) { console.error('[settings]', e); remote = {}; }
    }
    return deepMerge(DEFAULT_SETTINGS, remote);
  })();
}
