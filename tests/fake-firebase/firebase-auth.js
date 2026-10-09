const K = 'fakeauth';
export const getAuth = () => ({});
export async function signInWithEmailAndPassword(a, e, p) {
  const users = { 'admin@test.com': { uid: 'u1', pw: 'secret1' }, 'other@test.com': { uid: 'u2', pw: 'secret2' } };
  if (!users[e] || users[e].pw !== p) throw Object.assign(new Error('bad'), { code: 'auth/invalid-credential' });
  const u = { uid: users[e].uid, email: e }; sessionStorage.setItem(K, JSON.stringify(u)); return { user: u };
}
export const signOut = async () => sessionStorage.removeItem(K);
export const onAuthStateChanged = (a, cb) => { setTimeout(() => cb(JSON.parse(sessionStorage.getItem(K) || 'null')), 0); return () => {}; };
