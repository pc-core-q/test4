import { startAdmin } from './shell.js';
import { list, save, remove } from '../../../services/admin.js';
import { ikUrl } from '../../../services/images.js';
import { $, esc, reportError } from '../utils.js';
import { notify } from '../../../components/notifications.js';
import { loading, emptyState, confirmDialog, openModal, setFieldErrors, fieldErr, imageList } from './ui.js';

startAdmin('البانرات والإعلانات', async ({ content }) => {
  let items = [];
  content.innerHTML = `<div class="toolbar"><button class="btn" id="add" type="button">+ إضافة بانر</button></div><div id="list">${loading()}</div>`;
  const view = () => {
    $('#list').innerHTML = items.length ? `<table class="tbl"><thead><tr><th>الصورة</th><th>العنوان</th><th>مفعّل</th><th>الترتيب</th><th></th></tr></thead><tbody>${items.map((b, i) => `<tr data-id="${esc(b.id)}">
      <td data-label="الصورة">${b.imageUrl ? `<img style="width:88px;aspect-ratio:16/9" src="${esc(ikUrl(b.imageUrl, 176))}" alt="" loading="lazy">` : '—'}</td><td data-label="العنوان">${esc(b.title || '(بدون عنوان)')}</td>
      <td data-label="مفعّل"><input type="checkbox" data-act ${b.active ? 'checked' : ''} aria-label="تفعيل البانر"></td>
      <td data-label="الترتيب"><button class="btn btn-outline sm" data-up type="button" aria-label="أعلى"${i === 0 ? ' disabled' : ''}>▲</button> <button class="btn btn-outline sm" data-dn type="button" aria-label="أسفل"${i === items.length - 1 ? ' disabled' : ''}>▼</button></td>
      <td class="actions-cell"><button class="btn btn-outline sm" data-edit type="button">تعديل</button><button class="btn btn-outline sm" data-del type="button">حذف</button></td></tr>`).join('')}</tbody></table>` :
      emptyState('لا توجد بانرات', 'أضف بانراً ليظهر في أعلى الصفحة الرئيسية.');
  };
  function form(b = {}) {
    const dlg = openModal(b.id ? 'تعديل البانر' : 'إضافة بانر', `<p class="legend">صورة البانر * (يفضّل عرضية)</p><div id="img"></div><span class="err" data-err="image"></span>
      <div class="field"><label for="b-t">العنوان (اختياري)</label><input id="b-t" name="title" value="${esc(b.title || '')}"></div>
      <div class="field"><label for="b-d">الوصف (اختياري)</label><textarea id="b-d" name="description">${esc(b.description || '')}</textarea></div>
      <div class="grid2"><div class="field"><label for="b-bt">نص الزر (اختياري)</label><input id="b-bt" name="buttonText" value="${esc(b.buttonText || '')}"></div>
      <div class="field"><label for="b-l">رابط الزر (اختياري)</label><input id="b-l" name="link" dir="ltr" placeholder="shop.html" value="${esc(b.link || '')}"></div></div>
      <label class="check"><input type="checkbox" name="active"${b.active !== false ? ' checked' : ''}> مفعّل</label>`, {
      onSubmit: async f => {
        if (up.busy()) { notify('انتظر انتهاء رفع الصورة', 'error'); return false; }
        if (!up.get()[0]) { f.querySelector('[data-err=image]').textContent = 'صورة البانر مطلوبة.'; return false; }
        const data = { imageUrl: up.get()[0], title: f.title.value.trim(), description: f.description.value.trim(), buttonText: f.buttonText.value.trim(), link: f.link.value.trim(), active: f.active.checked };
        if (!b.id) data.order = items.length + 1;
        await save('banners', b.id, data); notify('تم حفظ البانر', 'success'); await load();
      }
    }, { submitText: 'حفظ' });
    const up = imageList($('#img', dlg), b.imageUrl ? [b.imageUrl] : [], { max: 1, label: 'رفع صورة' });
  }
  async function load() { try { items = (await list('banners')).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); view(); } catch (e) { $('#list').innerHTML = `<div class="box">${reportError('banners', e)}</div>`; } }
  async function move(id, d) {
    const i = items.findIndex(x => x.id === id), j = i + d; if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    try { await Promise.all(items.map((b, k) => b.order !== k + 1 ? save('banners', b.id, { order: k + 1 }).then(() => { b.order = k + 1; }) : null)); view(); } catch (x) { notify(reportError('reorder', x), 'error'); load(); }
  }
  $('#add').onclick = () => form();
  $('#list').addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const b = items.find(x => x.id === tr.dataset.id);
    if (e.target.closest('[data-edit]')) form(b);
    if (e.target.closest('[data-up]')) move(b.id, -1);
    if (e.target.closest('[data-dn]')) move(b.id, 1);
    if (e.target.closest('[data-del]') && await confirmDialog('حذف هذا البانر؟')) { try { await remove('banners', b.id); notify('تم حذف البانر', 'success'); load(); } catch (x) { notify(reportError('del-banner', x), 'error'); } }
  });
  $('#list').addEventListener('change', async e => {
    if (!e.target.matches('[data-act]')) return;
    const b = items.find(x => x.id === e.target.closest('tr').dataset.id);
    try { await save('banners', b.id, { active: e.target.checked }); b.active = e.target.checked; notify('تم التحديث', 'success'); } catch (x) { notify(reportError('toggle-banner', x), 'error'); e.target.checked = !e.target.checked; }
  });
  load();
});
