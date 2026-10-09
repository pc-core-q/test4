import { startAdmin } from './shell.js';
import { list, updateOrderStatus, W, O, L, SA, STATUS_LABELS } from '../../../services/admin.js';
import { STORE_CONFIG } from '../../../config/store-config.js';
import { waLink } from '../utils.js';
import { $, esc, formatPrice, reportError } from '../utils.js';
import { notify } from '../../../components/notifications.js';
import { loading, emptyState, confirmDialog } from './ui.js';

const PAGE = 30;
startAdmin('الطلبات', async ({ settings, content }) => {
  let items = [], last = null, more = false;
  content.innerHTML = `<div class="toolbar"><select id="fs" aria-label="حالة الطلب"><option value="">كل الحالات</option>${STORE_CONFIG.orderStatuses.map(s => `<option value="${s.key}">${s.label}</option>`).join('')}</select>
    <input type="search" id="s" placeholder="بحث: رقم الطلب، الاسم، الهاتف" aria-label="بحث"></div><div id="list"></div><p class="more-wrap"><button class="btn btn-outline" id="more" type="button" hidden>عرض المزيد</button></p>`;

  const card = o => `<details class="order" data-id="${esc(o.id)}"><summary><strong dir="ltr">${esc(o.orderNumber || o.id)}</strong><span class="grow">${esc(o.customer?.name)}</span><span>${formatPrice(o.total)}</span><span class="pill ${esc(o.status)}">${esc(STATUS_LABELS[o.status] || o.status)}</span></summary>
    <div class="body"><p class="hint">${esc(o.date || '')} ${esc(o.time || '')}</p>
      <p>📞 <a dir="ltr" href="tel:${esc(o.customer?.phone)}">${esc(o.customer?.phone)}</a> · <a target="_blank" rel="noopener" href="${esc(waLink(o.customer?.phone || ''))}">واتساب العميل</a></p>
      <p><strong>العنوان:</strong> ${esc(o.customer?.address)}<br><strong>أقرب نقطة دالة:</strong> ${esc(o.customer?.landmark)}${o.customer?.notes ? `<br><strong>ملاحظات:</strong> ${esc(o.customer.notes)}` : ''}</p>
      <ul>${(o.items || []).map(i => `<li>${esc(i.name)}${Object.entries(i.options || {}).map(([k, v]) => ` — ${esc(k)}: ${esc(v)}`).join('')} × ${i.qty} = ${formatPrice(i.total)}</li>`).join('')}</ul>
      <p><strong>المجموع:</strong> ${formatPrice(o.total)}${o.stockReduced ? ' · <span class="pill ok">تم خصم المخزون</span>' : ''}</p>
      <div class="field"><label for="st-${esc(o.id)}">تغيير الحالة</label><select id="st-${esc(o.id)}" data-status>${STORE_CONFIG.orderStatuses.map(s => `<option value="${s.key}"${s.key === o.status ? ' selected' : ''}>${s.label}</option>`).join('')}</select></div></div></details>`;

  const view = () => {
    const q = $('#s').value.trim().toLowerCase();
    const rows = items.filter(o => !q || [o.orderNumber, o.customer?.name, o.customer?.phone].some(v => String(v || '').toLowerCase().includes(q)));
    const openIds = new Set([...document.querySelectorAll('.order[open]')].map(d => d.dataset.id));
    $('#list').innerHTML = rows.length ? rows.map(card).join('') : emptyState('لا توجد طلبات', 'ستظهر الطلبات هنا عندما يطلب العملاء من المتجر.');
    $('#list').querySelectorAll('.order').forEach(d => openIds.has(d.dataset.id) && (d.open = true));
    $('#more').hidden = !more;
  };
  async function load(reset) {
    if (reset) { items = []; last = null; $('#list').innerHTML = loading(); }
    const f = $('#fs').value;
    try {
      const r = await list('orders', ...(f ? [W('status', '==', f)] : []), O('createdAt', 'desc'), ...(last ? [SA(last)] : []), L(PAGE + 1));
      more = r.length > PAGE; const page = r.slice(0, PAGE); last = page[page.length - 1]?._snap || last;
      items = items.concat(page); view();
    } catch (e) { $('#list').innerHTML = `<div class="box">${reportError('orders', e)}</div>`; }
  }
  $('#fs').addEventListener('change', () => load(true));
  $('#s').addEventListener('input', view);
  $('#more').addEventListener('click', () => load(false));
  $('#list').addEventListener('change', async e => {
    if (!e.target.matches('[data-status]')) return;
    const o = items.find(x => x.id === e.target.closest('.order').dataset.id), st = e.target.value;
    if (st === 'cancelled' && !(await confirmDialog('إلغاء هذا الطلب؟' + (o.stockReduced ? ' سيتم إرجاع المخزون.' : ''), 'إلغاء الطلب'))) { e.target.value = o.status; return; }
    e.target.disabled = true;
    try {
      const r = await updateOrderStatus(o.id, st, settings.reduceStockOn);
      const msg = st === 'confirmed' && r.stockReduced && !o.stockReduced ? 'تم تأكيد الطلب وخصم المخزون' : st === 'cancelled' && o.stockReduced ? 'تم إلغاء الطلب وإرجاع المخزون' : 'تم تحديث حالة الطلب';
      Object.assign(o, { status: st, stockReduced: r.stockReduced }); notify(msg, 'success'); view();
    } catch (x) { notify(reportError('order-status', x), 'error'); e.target.value = o.status; e.target.disabled = false; }
  });
  load(true);
});
