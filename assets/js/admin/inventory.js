import { startAdmin } from './shell.js';
import { list, save, W, O, L, count } from '../../../services/admin.js';
import { $, $$, esc, reportError } from '../utils.js';
import { notify } from '../../../components/notifications.js';
import { loading, emptyState } from './ui.js';

const TABS = [['ok', 'مخزون طبيعي'], ['low', 'مخزون منخفض'], ['out', 'نفد من المخزون']];
startAdmin('المخزون', async ({ settings, content }) => {
  const T = settings.lowStockThreshold;
  const cons = { ok: [W('stock', '>', T)], low: [W('stock', '>', 0), W('stock', '<=', T)], out: [W('stock', '==', 0)] };
  let tab = 'low', items = [];
  content.innerHTML = `<p class="hint">حد المخزون المنخفض الحالي: ${T} (يمكن تغييره من الإعدادات).</p><div class="tabs" id="tabs"></div>
    <div class="toolbar"><input type="search" id="s" placeholder="ابحث بالاسم" aria-label="بحث"></div><div id="list"></div>`;
  const drawTabs = counts => { $('#tabs').innerHTML = TABS.map(([k, t]) => `<button type="button" data-t="${k}" aria-pressed="${k === tab}">${t}${counts?.[k] != null ? ` (${counts[k]})` : ''}</button>`).join(''); };
  const view = () => {
    const q = $('#s').value.trim().toLowerCase(), rows = items.filter(p => !q || p.name.toLowerCase().includes(q));
    $('#list').innerHTML = rows.length ? `<table class="tbl"><thead><tr><th>المنتج</th><th>التصنيف</th><th>المخزون</th></tr></thead><tbody>${rows.map(p => `<tr data-id="${esc(p.id)}"><td data-label="المنتج"><strong>${esc(p.name)}</strong>${p.status !== 'active' ? ' <span class="pill">مسودة</span>' : ''}</td><td data-label="التصنيف">${esc(p.category || '—')}</td>
      <td data-label="المخزون"><input class="mini" type="number" min="0" value="${p.stock}" aria-label="مخزون ${esc(p.name)}"></td></tr>`).join('')}</tbody></table>` :
      emptyState(tab === 'low' ? 'لا توجد منتجات بمخزون منخفض' : tab === 'out' ? 'لا توجد منتجات نافدة' : 'لا توجد منتجات', q ? 'جرّب بحثاً آخر.' : '');
  };
  async function load() {
    $('#list').innerHTML = loading(); drawTabs();
    try { items = await list('products', ...cons[tab], O('stock'), L(200)); view(); } catch (e) { $('#list').innerHTML = `<div class="box">${reportError('inventory', e)}</div>`; }
  }
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { tab = b.dataset.t; load(); } });
  $('#s').addEventListener('input', view);
  $('#list').addEventListener('change', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const n = Math.max(0, Math.floor(+e.target.value || 0));
    try { await save('products', tr.dataset.id, { stock: n }); notify('تم تحديث المخزون', 'success'); await load(); refreshCounts(); } catch (x) { notify(reportError('stock', x), 'error'); }
  });
  async function refreshCounts() { try { const [ok, low, out] = await Promise.all(['ok', 'low', 'out'].map(k => count('products', ...cons[k]))); drawTabs({ ok, low, out }); } catch { /* counts are optional */ } }
  await load(); refreshCounts();
});
