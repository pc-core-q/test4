/** Lazy Firebase loader: the SDK is downloaded only when data is actually needed (and never in demo mode). */
import { FIREBASE_CONFIG } from '../config/firebase-config.js';
import { STORE_CONFIG } from '../config/store-config.js';

export const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
export const isDemo = !FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId;
export const storeId = STORE_CONFIG.storeId;

let appPromise, fsPromise;
export function getApp() {
  return appPromise ||= import(`${SDK}/firebase-app.js`).then(m => m.initializeApp(FIREBASE_CONFIG));
}
/** -> { db, fs } where fs is the Firestore module namespace (collection, doc, getDocs, ...) */
export function getFirestore() {
  return fsPromise ||= Promise.all([getApp(), import(`${SDK}/firebase-firestore.js`)])
    .then(([app, fs]) => ({ db: fs.getFirestore(app), fs }));
}
export const col = (fs, db, name) => fs.collection(db, 'stores', storeId, name);

/** Firestore doc -> plain object (timestamps become milliseconds so results are cacheable). */
export function toObj(d) {
  const o = { id: d.id, ...d.data() };
  for (const k of ['createdAt', 'updatedAt']) if (o[k]?.toMillis) o[k] = o[k].toMillis();
  return o;
}
export const demoData = () => import('../config/demo-data.js').then(m => m.DEMO_DATA);
