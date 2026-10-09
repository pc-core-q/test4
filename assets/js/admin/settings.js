import { startAdmin } from './shell.js';
import { saveSettings } from '../../../services/admin.js';
import { $, esc, reportError } from '../utils.js';
import { notify } from '../../../components/notifications.js';
import { imageList } from './ui.js';

startAdmin('إعدادات المتجر', async ({ settings: s, content }) => {
  const inp = (name, label, val, extra = '') => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" value="${esc(val ?? '')}" ${extra}></div>`;
  const color = (k, label) => `<div class="field"><label for="theme.${k}">${label}</label><input id="theme.${k}" name="theme.${k}" type="color" value="${esc(s.theme[k])}" style="padding:2px;width:100%"></div>`;
  const hs = (k, label) => `<label class="check"><input type="checkbox" name="home.${k}"${s.homeSections[k] ? ' checked' : ''}> ${label}</label>`;
  const other = (s.social.other || []).map(o => `${o.label} | ${o.url}`).join('\n');
  content.innerHTML = `<form id="sf" novalidate>
    <fieldset class="sect"><legend>هوية المتجر</legend><div class="grid2">${inp('storeName', 'اسم المتجر', s.storeName)}${inp('email', 'البريد الإلكتروني', s.email, 'type="email" dir="ltr"')}</div>
      <div class="field"><label for="storeDescription">وصف المتجر</label><textarea id="storeDescription" name="storeDescription">${esc(s.storeDescription)}</textarea></div>
      <p class="legend">الشعار</p><div id="logo"></div><p class="legend">أيقونة المتصفح (Favicon)</p><div id="fav"></div></fieldset>
    <fieldset class="sect"><legend>التواصل</legend><div class="grid2">${inp('phone', 'رقم الهاتف', s.phone, 'type="tel" dir="ltr"')}${inp('whatsapp', 'رقم واتساب (لاستقبال الطلبات)', s.whatsapp, 'type="tel" dir="ltr" placeholder="07XXXXXXXXX"')}</div>${inp('address', 'العنوان / الموقع', s.address)}</fieldset>
    <fieldset class="sect"><legend>التواصل الاجتماعي (يظهر ما له رابط فقط)</legend><div class="grid2">${['instagram', 'facebook', 'tiktok', 'telegram'].map(k => inp('social.' + k, { instagram: 'إنستغرام', facebook: 'فيسبوك', tiktok: 'تيك توك', telegram: 'تليجرام' }[k], s.social[k], 'dir="ltr"')).join('')}</div>
      <div class="field"><label for="social.other">روابط أخرى (سطر لكل رابط: الاسم | الرابط)</label><textarea id="social.other" name="social.other" dir="ltr">${esc(other)}</textarea></div></fieldset>
    <fieldset class="sect"><legend>المظهر</legend><div class="grid2">${color('primary', 'اللون الأساسي')}${color('secondary', 'اللون الثانوي')}${color('accent', 'لون التمييز')}${color('background', 'لون الخلفية')}${color('text', 'لون النص')}
      <div class="field"><label for="theme.buttonStyle">شكل الأزرار</label><select id="theme.buttonStyle" name="theme.buttonStyle">${[['square', 'حادة'], ['rounded', 'مستديرة قليلاً'], ['pill', 'بيضاوية']].map(([v, t]) => `<option value="${v}"${s.theme.buttonStyle === v ? ' selected' : ''}>${t}</option>`).join('')}</select></div></div></fieldset>
    <fieldset class="sect"><legend>المخزون</legend><div class="grid2">${inp('lowStockThreshold', 'حد المخزون المنخفض', s.lowStockThreshold, 'type="number" min="0" inputmode="numeric"')}
      <div class="field"><label for="reduceStockOn">خصم المخزون</label><select id="reduceStockOn" name="reduceStockOn"><option value="confirmed"${s.reduceStockOn === 'confirmed' ? ' selected' : ''}>عند تأكيد الطلب</option><option value="never"${s.reduceStockOn === 'never' ? ' selected' : ''}>يدوياً فقط (لا يُخصم تلقائياً)</option></select></div></div></fieldset>
    <fieldset class="sect"><legend>الصفحة الرئيسية</legend>${hs('banners', 'البانرات')}${hs('categories', 'التصنيفات')}${hs('featured', 'المنتجات المميزة')}${hs('latest', 'وصل حديثاً')}${hs('lowStock', 'على وشك النفاد')}</fieldset>
    <fieldset class="sect"><legend>SEO</legend>${inp('seoTitle', 'عنوان الصفحة الرئيسية', s.seoTitle)}<div class="field"><label for="seoDescription">وصف محركات البحث</label><textarea id="seoDescription" name="seoDescription">${esc(s.seoDescription)}</textarea></div></fieldset>
    <p><button class="btn" id="save" type="submit">حفظ الإعدادات</button></p></form>`;
  const logo = imageList($('#logo'), s.logoUrl ? [s.logoUrl] : [], { max: 1, label: 'رفع الشعار' });
  const fav = imageList($('#fav'), s.faviconUrl ? [s.faviconUrl] : [], { max: 1, label: 'رفع الأيقونة' });
  const f = $('#sf'), v = n => f.elements[n].value.trim();
  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (logo.busy() || fav.busy()) return notify('انتظر انتهاء رفع الصور', 'error');
    if (!v('storeName')) { f.elements.storeName.focus(); return notify('اسم المتجر مطلوب', 'error'); }
    const th = Number(v('lowStockThreshold'));
    if (!(th >= 0)) return notify('حد المخزون المنخفض غير صحيح', 'error');
    const btn = $('#save'); btn.disabled = true; btn.textContent = 'جارٍ الحفظ…';
    try {
      await saveSettings({
        storeName: v('storeName'), storeDescription: v('storeDescription'), email: v('email'), phone: v('phone'), whatsapp: v('whatsapp'), address: v('address'),
        logoUrl: logo.get()[0] || '', faviconUrl: fav.get()[0] || '', seoTitle: v('seoTitle'), seoDescription: v('seoDescription'),
        social: { instagram: v('social.instagram'), facebook: v('social.facebook'), tiktok: v('social.tiktok'), telegram: v('social.telegram'),
          other: v('social.other').split('\n').map(l => l.split('|').map(x => x.trim())).filter(([a, b]) => a && b).map(([label, url]) => ({ label, url })) },
        theme: Object.fromEntries(['primary', 'secondary', 'accent', 'background', 'text', 'buttonStyle'].map(k => [k, v('theme.' + k)])),
        lowStockThreshold: th, reduceStockOn: v('reduceStockOn'),
        homeSections: Object.fromEntries(['banners', 'categories', 'featured', 'latest', 'lowStock'].map(k => [k, f.elements['home.' + k].checked]))
      });
      notify('تم حفظ الإعدادات', 'success');
    } catch (x) { notify(reportError('settings', x), 'error', 5000); }
    btn.disabled = false; btn.textContent = 'حفظ الإعدادات';
  });
});
