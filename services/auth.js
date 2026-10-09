/** Firebase Authentication (email + password). Admin = signed in AND listed in stores/{storeId}/admins/{uid}. */
import { getApp, getFirestore, storeId, SDK } from './firebase.js';

let authP;
const authMod = () => authP ||= Promise.all([getApp(), import(`${SDK}/firebase-auth.js`)]).then(([app, m]) => ({ auth: m.getAuth(app), m }));

async function isListedAdmin(uid) {
  try {
    const { db, fs } = await getFirestore();
    return (await fs.getDoc(fs.doc(db, 'stores', storeId, 'admins', uid))).exists();
  } catch (e) { console.error('[auth] admin check failed', e); return false; }
}

export async function login(email, password) {
  const { auth, m } = await authMod();
  const { user } = await m.signInWithEmailAndPassword(auth, email.trim(), password);
  if (!(await isListedAdmin(user.uid))) {
    await m.signOut(auth);
    throw Object.assign(new Error('not an admin'), { code: 'app/not-admin' });
  }
  return user;
}
export async function logout() { const { auth, m } = await authMod(); await m.signOut(auth); }

/** -> the admin user, or null when signed out / not an admin */
export async function currentAdmin() {
  const { auth, m } = await authMod();
  return new Promise(resolve => {
    const off = m.onAuthStateChanged(auth, async u => { off?.(); resolve(u && await isListedAdmin(u.uid) ? u : null); });
  });
}

export function authMessage(err) {
  const c = err?.code || '';
  console.error('[auth]', err);
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(c)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (c === 'auth/too-many-requests') return 'محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.';
  if (c === 'app/not-admin') return 'هذا الحساب لا يملك صلاحية الدخول إلى لوحة التحكم.';
  if (c === 'auth/network-request-failed' || !navigator.onLine) return 'تعذر الاتصال بالإنترنت.';
  return 'تعذر تسجيل الدخول. حاول مرة أخرى.';
}
