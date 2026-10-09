import { startAdmin } from './shell.js';
import { dashboardStats } from '../../../services/admin.js';
import { ADMIN_CONFIG } from '../../../config/admin-config.js';
import { STORE_CONFIG } from '../../../config/store-config.js';
import { reportError, esc } from '../utils.js';
import { loading } from './ui.js';

startAdmin('لوحة التحكم', async ({ settings, content }) => {
  content.innerHTML = loading();
  const todo = [
    !settings.whatsapp && 'رقم واتساب غير مضبوط (الإعدادات).',
    !ADMIN_CONFIG.imgbbApiKey && 'مفتاح ImgBB غير مضبوط في config/admin-config.js — لن يعمل رفع الصور.',
    !STORE_CONFIG.imageKit.urlEndpoint && 'ImageKit غير مضبوط في config/store-config.js — الصور تُعرض بحجمها الأصلي.'
  ].filter(Boolean);
  try {
    const s = await dashboardStats(settings.lowStockThreshold);
    const card = (n, label, cls = '', href = '') => `<${href ? `a href="${href}"` : 'div'} class="stat ${cls}" ${href ? 'style="text-decoration:none"' : ''}><b>${n}</b><span>${label}</span></${href ? 'a' : 'div'}>`;
    content.innerHTML = `<h2>المنتجات</h2><div class="stats">${card(s.products, 'إجمالي المنتجات', '', 'products.html')}${card(s.available, 'مخزون طبيعي', '', 'inventory.html')}${card(s.low, 'مخزون منخفض', s.low ? 'warn' : '', 'inventory.html')}${card(s.out, 'نفد من المخزون', s.out ? 'bad' : '', 'inventory.html')}</div>
      <h2>الطلبات</h2><div class="stats">${card(s.orders, 'إجمالي الطلبات', '', 'orders.html')}${card(s.newOrders, 'طلبات جديدة', s.newOrders ? 'warn' : '', 'orders.html')}${card(s.pending, 'قيد المعالجة', '', 'orders.html')}${card(s.completed, 'مكتملة', '', 'orders.html')}</div>
      ${todo.length ? `<div class="box"><h2>خطوات إعداد متبقية</h2><ul>${todo.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}`;
  } catch (e) { content.innerHTML = `<div class="box"><p>${reportError('dashboard', e)}</p></div>`; }
});
