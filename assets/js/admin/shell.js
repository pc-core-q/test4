/** Admin bootstrap: demo-mode notice, login, auth guard, sidebar + topbar, then runs the page's callback. */
import { isDemo } from '../../../services/firebase.js';
import { currentAdmin, login, logout, authMessage } from '../../../services/auth.js';
import { fetchSettings } from '../../../services/admin.js';
import { $, esc } from '../utils.js';
import { STORE_CONFIG } from '../../../config/store-config.js';

const NAV = [['index.html', 'الرئيسية'], ['products.html', 'المنتجات'], ['inventory.html', 'المخزون'], ['orders.html', 'الطلبات'],
  ['categories.html', 'التصنيفات'], ['banners.html', 'البانرات'], ['settings.html', 'الإعدادات']];
const root = () => $('#root');

function showLogin(onOk) {
  root().innerHTML = `<div class="login"><form id="lf" novalidate><h1>تسجيل دخول المسؤول</h1>
    <div class="field"><label for="em">البريد الإلكتروني</label><input id="em" name="em" type="email" dir="ltr" autocomplete="username" required></div>
    <div class="field"><label for="pw">كلمة المرور</label><input id="pw" name="pw" type="password" dir="ltr" autocomplete="current-password" required></div>
    <p class="err" id="le" role="alert"></p><button class="btn btn-block" type="submit">دخول</button></form></div>`;
  const f = $('#lf'), err = $('#le'), btn = f.querySelector('button');
  f.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    if (!f.em.value.trim() || !f.pw.value) { err.textContent = 'أدخل البريد الإلكتروني وكلمة المرور.'; return; }
    btn.disabled = true; btn.textContent = 'جارٍ الدخول…';
    try { const u = await login(f.em.value, f.pw.value); onOk(u); }
    catch (x) { err.textContent = authMessage(x); btn.disabled = false; btn.textContent = 'دخول'; }
  });
}

export async function startAdmin(title, run) {
  document.documentElement.lang = STORE_CONFIG.language.lang; document.documentElement.dir = STORE_CONFIG.language.dir;
  document.title = `${title} | لوحة التحكم`;
  if (isDemo) { root().innerHTML = '<div class="notice"><h1>لوحة التحكم</h1><p>أضف إعدادات Firebase في <code dir="ltr">config/firebase-config.js</code> لتفعيل لوحة التحكم.</p></div>'; return; }
  root().innerHTML = '<p class="state" role="status">جارٍ التحميل…</p>';
  let user; try { user = await currentAdmin(); } catch (e) { console.error(e); }
  const boot = async u => {
    let settings; try { settings = await fetchSettings(); } catch (e) { console.error(e); root().innerHTML = '<div class="notice"><p>تعذر تحميل الإعدادات. تحقق من الاتصال ثم أعد تحميل الصفحة.</p></div>'; return; }
    const page = location.pathname.split('/').pop() || 'index.html';
    root().innerHTML = `<div class="shell"><aside class="side" id="side" aria-label="القائمة"><strong>${esc(settings.storeName)}</strong>
      ${NAV.map(([h, t]) => `<a href="${h}"${h === page ? ' aria-current="page"' : ''}>${t}</a>`).join('')}<a href="../index.html" target="_blank" rel="noopener">عرض المتجر ↗</a>
      <span class="sp"></span><button id="out" type="button">تسجيل الخروج</button></aside>
      <div class="scrim" id="scrim" hidden></div>
      <header class="topbar"><button class="icon-btn" id="mb" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="side">☰</button><h1>${esc(title)}</h1><span class="grow"></span><span class="hint" dir="ltr">${esc(u.email || '')}</span></header>
      <main class="content" id="content" tabindex="-1"></main></div>`;
    const side = $('#side'), scrim = $('#scrim'), mb = $('#mb');
    const tog = o => { side.classList.toggle('open', o); scrim.hidden = !o; mb.setAttribute('aria-expanded', o); };
    mb.onclick = () => tog(!side.classList.contains('open')); scrim.onclick = () => tog(false);
    $('#out').onclick = async () => { await logout(); location.reload(); };
    await run({ settings, user: u, content: $('#content') });
  };
  if (user) boot(user); else showLogin(boot);
}
