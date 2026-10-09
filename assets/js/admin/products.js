import { startAdmin } from './shell.js';
import { list, save, remove, O, L, buildProductDoc, validateProduct, formatOptions, formatSpecs, stockBucket } from '../../../services/admin.js';
import { ikUrl } from '../../../services/images.js';
import { $, esc, formatPrice, reportError } from '../utils.js';
import { notify } from '../../../components/notifications.js';
import { loading, emptyState, confirmDialog, openModal, setFieldErrors, fieldErr, imageList } from './ui.js';

startAdmin('المنتجات', async ({ settings, content }) => {
  const T = settings.lowStockThreshold;
  let items = [], cats = [];
  content.innerHTML = `<div class="toolbar"><input type="search" id="s" placeholder="ابحث بالاسم أو الرمز" aria-label="بحث"><select id="fc" aria-label="التصنيف"><option value="">كل التصنيفات</option></select>
    <select id="fs" aria-label="الحالة"><option value="">كل الحالات</option><option value="active">منشور</option><option value="draft">مسودة</option><option value="out">نفد المخزون</option><option value="low">مخزون منخفض</option><option value="featured">مميز</option></select>
    <button class="btn" id="add" type="button">+ إضافة منتج</button></div><div id="list">${loading()}</div>`;

  const view = () => {
    const q = $('#s').value.trim().toLowerCase(), c = $('#fc').value, st = $('#fs').value;
    const rows = items.filter(p => (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)) && (!c || p.categoryId === c) &&
      (!st || (st === 'featured' ? p.featured : st === 'out' || st === 'low' ? stockBucket(p.stock, T) === st : p.status === st)));
    $('#list').innerHTML = !items.length ? emptyState('لا توجد منتجات بعد', 'اضغط «إضافة منتج» للبدء.') : !rows.length ? emptyState('لا نتائج مطابقة') :
      `<table class="tbl"><thead><tr><th></th><th>المنتج</th><th>التصنيف</th><th>السعر</th><th>المخزون</th><th>مميز</th><th>الحالة</th><th></th></tr></thead><tbody>${rows.map(p => `<tr data-id="${esc(p.id)}">
        <td data-label="صورة"><img src="${esc(ikUrl(p.images?.[0], 96))}" alt="" loading="lazy"></td><td data-label="المنتج"><strong>${esc(p.name)}</strong></td><td data-label="التصنيف">${esc(p.category || '—')}</td>
        <td data-label="السعر">${formatPrice(p.discountPrice > 0 ? p.discountPrice : p.price)}</td>
        <td data-label="المخزون"><input class="mini" type="number" min="0" value="${p.stock}" data-stock aria-label="مخزون ${esc(p.name)}"></td>
        <td data-label="مميز"><input type="checkbox" data-feat ${p.featured ? 'checked' : ''} aria-label="مميز"></td>
        <td data-label="الحالة"><span class="pill ${p.status === 'active' ? 'ok' : ''}">${p.status === 'active' ? 'منشور' : 'مسودة'}</span></td>
        <td class="actions-cell"><button class="btn btn-outline sm" data-edit type="button">تعديل</button><button class="btn btn-outline sm" data-del type="button">حذف</button></td></tr>`).join('')}</tbody></table>`;
  };

  function form(p = {}) {
    const isNew = !p.id;
    const dlg = openModal(isNew ? 'إضافة منتج' : 'تعديل المنتج', `
      <div class="grid2">
        <div class="field span2"><label for="f-name">اسم المنتج *</label><input id="f-name" name="name" value="${esc(p.name || '')}">${fieldErr('name')}</div>
        <div class="field"><label for="f-cat">التصنيف</label><select id="f-cat" name="categoryId"><option value="">— بدون —</option>${cats.map(c => `<option value="${esc(c.id)}"${c.id === p.categoryId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="f-st">الحالة</label><select id="f-st" name="status"><option value="active"${p.status !== 'draft' ? ' selected' : ''}>منشور</option><option value="draft"${p.status === 'draft' ? ' selected' : ''}>مسودة (مخفي)</option></select></div>
        <div class="field"><label for="f-price">السعر *</label><input id="f-price" name="price" type="number" inputmode="numeric" min="0" value="${p.price ?? ''}">${fieldErr('price')}</div>
        <div class="field"><label for="f-disc">سعر بعد الخصم (اختياري)</label><input id="f-disc" name="discountPrice" type="number" inputmode="numeric" min="0" value="${p.discountPrice || ''}">${fieldErr('discountPrice')}</div>
        <div class="field"><label for="f-stock">الكمية في المخزون *</label><input id="f-stock" name="stock" type="number" inputmode="numeric" min="0" value="${p.stock ?? ''}">${fieldErr('stock')}</div>
        <div class="field"><label for="f-sku">رمز المنتج SKU</label><input id="f-sku" name="sku" dir="ltr" value="${esc(p.sku || '')}"></div>
        <div class="field"><label for="f-brand">العلامة التجارية</label><input id="f-brand" name="brand" value="${esc(p.brand || '')}"></div>
        <div class="field"><label for="f-tags">وسوم (مفصولة بفاصلة)</label><input id="f-tags" name="tags" value="${esc((p.tags || []).join('، '))}"></div>
      </div>
      <div class="field"><label for="f-desc">الوصف</label><textarea id="f-desc" name="description">${esc(p.description || '')}</textarea></div>
      <label class="check"><input type="checkbox" name="featured"${p.featured ? ' checked' : ''}> منتج مميز (يظهر في الرئيسية)</label>
      <div class="field"><label for="f-opt">الخيارات (اختياري)</label><textarea id="f-opt" name="options" placeholder="المقاس: S, M, L&#10;اللون: أسود, أبيض">${esc(formatOptions(p.options))}</textarea><span class="hint">سطر لكل خيار: الاسم ثم نقطتان ثم القيم. للملابس: المقاس واللون. للإلكترونيات اتركه فارغاً.</span></div>
      <div class="field"><label for="f-spec">المواصفات (اختياري)</label><textarea id="f-spec" name="specs" placeholder="المعالج: Snapdragon&#10;الذاكرة: 8GB">${esc(formatSpecs(p.specs))}</textarea></div>
      <p class="legend">الصور (الأولى هي الرئيسية)</p><div id="imgs"></div>`, {
      onSubmit: async f => {
        if (up.busy()) { notify('انتظر انتهاء رفع الصور', 'error'); return false; }
        const v = Object.fromEntries(new FormData(f)); v.featured = f.featured.checked;
        if (!setFieldErrors(f, validateProduct(v))) return false;
        v.category = cats.find(c => c.id === v.categoryId)?.name || ''; v.images = up.get();
        const id = await save('products', p.id, buildProductDoc(v));
        notify('تم حفظ المنتج', 'success');
        const doc = { ...(p || {}), ...buildProductDoc(v), id };
        const i = items.findIndex(x => x.id === id); i >= 0 ? (items[i] = doc) : items.unshift({ ...doc, createdAt: Date.now() });
        view();
      }
    });
    const up = imageList($('#imgs', dlg), p.images || []);
  }

  async function load() {
    try {
      [cats, items] = await Promise.all([list('categories'), list('products', O('createdAt', 'desc'), L(300))]);
      cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      $('#fc').innerHTML += cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      view();
    } catch (e) { $('#list').innerHTML = `<div class="box">${reportError('products', e)}</div>`; }
  }
  const L$ = $('#list');
  ['#s', '#fc', '#fs'].forEach(s => $(s).addEventListener('input', view));
  $('#add').onclick = () => form();
  L$.addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const p = items.find(x => x.id === tr.dataset.id);
    if (e.target.closest('[data-edit]')) form(p);
    if (e.target.closest('[data-del]') && await confirmDialog(`حذف المنتج «${p.name}» نهائياً؟`)) {
      try { await remove('products', p.id); items = items.filter(x => x.id !== p.id); view(); notify('تم حذف المنتج', 'success'); } catch (x) { notify(reportError('delete-product', x), 'error'); }
    }
  });
  L$.addEventListener('change', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const p = items.find(x => x.id === tr.dataset.id);
    try {
      if (e.target.matches('[data-stock]')) { const n = Math.max(0, Math.floor(+e.target.value || 0)); await save('products', p.id, { stock: n }); p.stock = n; notify('تم تحديث المخزون', 'success'); }
      if (e.target.matches('[data-feat]')) { await save('products', p.id, { featured: e.target.checked }); p.featured = e.target.checked; notify('تم التحديث', 'success'); }
    } catch (x) { notify(reportError('quick-edit', x), 'error'); view(); }
  });
  load();
});
