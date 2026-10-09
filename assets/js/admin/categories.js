import { startAdmin } from './shell.js';
import { list, save, remove, count, W } from '../../../services/admin.js';
import { ikUrl } from '../../../services/images.js';
import { $, esc, reportError } from '../utils.js';
import { notify } from '../../../components/notifications.js';
import { loading, emptyState, confirmDialog, openModal, setFieldErrors, fieldErr, imageList } from './ui.js';

startAdmin('التصنيفات', async ({ content }) => {
  let items = [];
  content.innerHTML = `<div class="toolbar"><button class="btn" id="add" type="button">+ إضافة تصنيف</button></div><div id="list">${loading()}</div>`;
  const view = () => {
    $('#list').innerHTML = items.length ? `<table class="tbl"><thead><tr><th></th><th>الاسم</th><th>الترتيب</th><th>مفعّل</th><th></th></tr></thead><tbody>${items.map(c => `<tr data-id="${esc(c.id)}">
      <td data-label="صورة">${c.imageUrl ? `<img src="${esc(ikUrl(c.imageUrl, 96))}" alt="" loading="lazy">` : ''}</td><td data-label="الاسم"><strong>${esc(c.name)}</strong></td><td data-label="الترتيب">${c.order ?? 0}</td>
      <td data-label="مفعّل"><input type="checkbox" data-act ${c.active ? 'checked' : ''} aria-label="تفعيل ${esc(c.name)}"></td>
      <td class="actions-cell"><button class="btn btn-outline sm" data-edit type="button">تعديل</button><button class="btn btn-outline sm" data-del type="button">حذف</button></td></tr>`).join('')}</tbody></table>` :
      emptyState('لا توجد تصنيفات', 'أضف تصنيفات مثل: قمصان، أحذية، إكسسوارات.');
  };
  function form(c = {}) {
    const dlg = openModal(c.id ? 'تعديل التصنيف' : 'إضافة تصنيف', `<div class="field"><label for="c-name">اسم التصنيف *</label><input id="c-name" name="name" value="${esc(c.name || '')}">${fieldErr('name')}</div>
      <div class="field"><label for="c-ord">الترتيب</label><input id="c-ord" name="order" type="number" value="${c.order ?? items.length + 1}"></div>
      <label class="check"><input type="checkbox" name="active"${c.active !== false ? ' checked' : ''}> مفعّل (يظهر في المتجر)</label><p class="legend">صورة (اختيارية)</p><div id="img"></div>`, {
      onSubmit: async f => {
        if (up.busy()) { notify('انتظر انتهاء رفع الصورة', 'error'); return false; }
        if (!setFieldErrors(f, f.name.value.trim() ? {} : { name: 'اسم التصنيف مطلوب.' })) return false;
        const data = { name: f.name.value.trim(), order: Number(f.order.value) || 0, active: f.active.checked, imageUrl: up.get()[0] || '' };
        await save('categories', c.id, data); notify('تم حفظ التصنيف', 'success'); await load(); 
      }
    });
    const up = imageList($('#img', dlg), c.imageUrl ? [c.imageUrl] : [], { max: 1, label: 'رفع صورة' });
  }
  async function load() { try { items = (await list('categories')).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); view(); } catch (e) { $('#list').innerHTML = `<div class="box">${reportError('categories', e)}</div>`; } }
  $('#add').onclick = () => form();
  $('#list').addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const c = items.find(x => x.id === tr.dataset.id);
    if (e.target.closest('[data-edit]')) form(c);
    if (e.target.closest('[data-del]')) {
      try {
        const n = await count('products', W('categoryId', '==', c.id));
        if (!(await confirmDialog(`حذف التصنيف «${c.name}»؟` + (n ? ` يوجد ${n} منتج مرتبط به وسيبقى بدون تصنيف.` : '')))) return;
        await remove('categories', c.id); notify('تم حذف التصنيف', 'success'); load();
      } catch (x) { notify(reportError('del-category', x), 'error'); }
    }
  });
  $('#list').addEventListener('change', async e => {
    if (!e.target.matches('[data-act]')) return;
    const c = items.find(x => x.id === e.target.closest('tr').dataset.id);
    try { await save('categories', c.id, { active: e.target.checked }); c.active = e.target.checked; notify('تم التحديث', 'success'); } catch (x) { notify(reportError('toggle-category', x), 'error'); e.target.checked = !e.target.checked; }
  });
  load();
});
