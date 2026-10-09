import { esc, reportError } from '../utils.js';
import { ikUrl } from '../../../services/images.js';
import { uploadImage, uploadMessage } from '../../../services/uploads.js';
import { notify } from '../../../components/notifications.js';

export const loading = (t = 'جارٍ التحميل…') => `<p class="state" role="status">${t}</p>`;
export const emptyState = (title, msg = '') => `<div class="empty"><h2>${title}</h2>${msg ? `<p>${msg}</p>` : ''}</div>`;

export function confirmDialog(message, okText = 'حذف') {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.innerHTML = `<form method="dialog"><div class="dlg-body"><p>${esc(message)}</p></div><div class="dlg-foot"><button class="btn btn-outline" value="no">إلغاء</button><button class="btn danger" value="yes">${esc(okText)}</button></div></form>`;
    d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
    document.body.append(d); d.showModal();
  });
}

/** Generic modal form. onSubmit(form, dlg) may throw (shown as toast) or return false to stay open. */
export function openModal(title, bodyHtml, { onSubmit, submitText = 'حفظ' } = {}) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<form novalidate><div class="dlg-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="إغلاق">✕</button></div>
    <div class="dlg-body">${bodyHtml}</div><div class="dlg-foot"><button type="button" class="btn btn-outline" data-close>إلغاء</button><button type="submit" class="btn">${esc(submitText)}</button></div></form>`;
  const form = dlg.querySelector('form'), submit = form.querySelector('[type=submit]');
  dlg.addEventListener('click', e => e.target.closest('[data-close]') && dlg.close());
  dlg.addEventListener('close', () => dlg.remove());
  form.addEventListener('submit', async e => {
    e.preventDefault();
    submit.disabled = true; const txt = submit.textContent; submit.textContent = 'جارٍ الحفظ…';
    try { if ((await onSubmit?.(form, dlg)) !== false) dlg.close(); }
    catch (err) { notify(reportError('admin-save', err), 'error', 5000); }
    submit.disabled = false; submit.textContent = txt;
  });
  document.body.append(dlg); dlg.showModal();
  return dlg;
}

export function setFieldErrors(form, errs) {
  form.querySelectorAll('[data-err]').forEach(el => { el.textContent = errs[el.dataset.err] || ''; });
  form.querySelectorAll('[name]').forEach(i => i.setAttribute('aria-invalid', errs[i.name] ? 'true' : 'false'));
  form.querySelector('[aria-invalid="true"]')?.focus();
  return Object.keys(errs).length === 0;
}
export const fieldErr = n => `<span class="err" data-err="${n}"></span>`;

/** Image uploader (ImgBB). host: element. max: 1 for a single image. -> { get(): string[], busy(): boolean } */
export function imageList(host, urls = [], { max = 8, label = 'إضافة صور' } = {}) {
  let list = urls.filter(Boolean).slice(0, max), busy = 0;
  host.innerHTML = `<div class="thumbs-edit"></div><label class="btn btn-outline sm upl">${label}<input type="file" accept="image/*"${max > 1 ? ' multiple' : ''} aria-label="${label}"></label> <span class="hint" role="status"></span>`;
  const box = host.querySelector('.thumbs-edit'), msg = host.querySelector('.hint'), input = host.querySelector('input');
  const draw = () => {
    box.innerHTML = list.map((u, i) => `<div class="th"><img src="${esc(ikUrl(u, 160))}" alt="">${max > 1 ? (i === 0 ? '<span class="main-tag">الرئيسية</span>' : `<button type="button" data-main="${i}">جعلها رئيسية</button>`) : ''}<button type="button" data-del="${i}">حذف</button></div>`).join('');
    input.parentElement.hidden = list.length >= max && max === 1 ? false : list.length >= max;
  };
  box.addEventListener('click', e => {
    const m = e.target.closest('[data-main]'), d = e.target.closest('[data-del]');
    if (m) { const [x] = list.splice(+m.dataset.main, 1); list.unshift(x); }
    if (d) list.splice(+d.dataset.del, 1);
    draw();
  });
  input.addEventListener('change', async () => {
    const files = [...input.files]; input.value = '';
    for (const f of files) {
      if (list.length >= max && max > 1) { notify(`الحد الأقصى ${max} صور`, 'error'); break; }
      busy++; msg.textContent = 'جارٍ رفع الصورة…';
      try { const url = await uploadImage(f); max === 1 ? (list = [url]) : list.push(url); draw(); }
      catch (err) { notify(uploadMessage(err), 'error', 5000); }
      busy--; msg.textContent = busy ? 'جارٍ رفع الصورة…' : '';
    }
  });
  draw();
  return { get: () => list, busy: () => busy > 0 };
}
