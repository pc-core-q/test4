import { initApp } from '../app.js';
import { $, esc, formatPrice, reportError } from '../utils.js';
import { getCart, replaceCart, clearCart, cartSubtotal } from '../../../components/cart.js';
import { getProductsByIds, effectivePrice } from '../../../services/products.js';
import { validateCustomer, prepareOrder, createOrder, whatsappOrderUrl } from '../../../services/orders.js';
import { notify } from '../../../components/notifications.js';

const FIELDS = ['name', 'phone', 'address', 'landmark', 'notes'];

function renderSummary() {
  const items = getCart();
  $('#summary-list').innerHTML = items.map(i => `<li><div><strong>${esc(i.name)}</strong>
    <p class="muted small">${[i.category, ...Object.entries(i.options || {}).map(([k, v]) => `${k}: ${v}`)].filter(Boolean).map(esc).join(' · ')}</p>
    <p class="muted small">${i.qty} × ${formatPrice(i.price)}</p></div><span>${formatPrice(i.price * i.qty)}</span></li>`).join('');
  $('#grand').textContent = formatPrice(cartSubtotal());
}

/** Re-checks stock & prices against the database. Returns false (and updates the cart) if anything changed. */
async function verifyCart() {
  const items = getCart();
  const map = new Map((await getProductsByIds(items.map(i => i.productId))).map(p => [p.id, p]));
  const problems = [];
  const fresh = items.map(i => {
    const p = map.get(i.productId);
    if (!p) { problems.push(`«${i.name}» لم يعد متوفراً وتمت إزالته.`); return null; }
    if (p.stock <= 0) { problems.push(`«${i.name}» نفد من المخزون وتمت إزالته.`); return null; }
    let qty = i.qty;
    if (qty > p.stock) { qty = p.stock; problems.push(`الكمية المتوفرة من «${i.name}» هي ${p.stock} فقط.`); }
    const price = effectivePrice(p);
    if (price !== i.price) problems.push(`تم تحديث سعر «${i.name}».`);
    return { ...i, name: p.name, qty, price, maxStock: p.stock };
  }).filter(Boolean);
  if (problems.length) { replaceCart(fresh); problems.forEach(m => notify(m, 'error', 5000)); }
  return !problems.length;
}

async function main() {
  const s = await initApp({ title: 'إتمام الطلب' });
  const form = $('#checkout'), btn = $('#submit');
  if (!getCart().length) {
    $('#checkout-wrap').innerHTML = '<div class="empty"><h2>سلتك فارغة</h2><p>أضف منتجات قبل إتمام الطلب.</p><a class="btn" href="shop.html">تابع التسوق</a></div>';
    return;
  }
  renderSummary();
  window.addEventListener('cart:change', () => { if (getCart().length) renderSummary(); });

  const showErrors = errs => FIELDS.forEach(f => {
    const input = form.elements[f], msg = $(`#err-${f}`);
    if (!msg) return;
    msg.textContent = errs[f] || ''; input.setAttribute('aria-invalid', errs[f] ? 'true' : 'false');
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(FIELDS.map(f => [f, form.elements[f].value]));
    const errs = validateCustomer(data);
    showErrors(errs);
    if (Object.keys(errs).length) { form.querySelector('[aria-invalid="true"]').focus(); return notify('يرجى تعبئة الحقول المطلوبة بشكل صحيح', 'error'); }
    if (!getCart().length) return notify('السلة فارغة', 'error');

    btn.disabled = true; btn.textContent = 'جارٍ إرسال الطلب…';
    let order;
    try {
      if (!(await verifyCart())) { renderSummary(); btn.disabled = false; btn.textContent = 'تأكيد الطلب عبر واتساب'; if (!getCart().length) location.reload(); return; }
      order = prepareOrder(getCart(), data);
      await createOrder(order);
    } catch (err) {
      notify(reportError('checkout', err), 'error', 5000);
      btn.disabled = false; btn.textContent = 'تأكيد الطلب عبر واتساب';
      if (order && s.whatsapp) { $('#fallback').hidden = false; $('#fallback-link').href = whatsappOrderUrl(order, s); }
      return;
    }
    clearCart();
    const url = s.whatsapp ? whatsappOrderUrl(order, s) : '';
    $('#checkout-wrap').innerHTML = `<div class="empty done"><h2>تم استلام طلبك</h2><p>رقم الطلب: <strong dir="ltr">${esc(order.orderNumber)}</strong></p>
      ${url ? `<p>سيتم تحويلك إلى واتساب لإرسال تفاصيل الطلب.</p><a class="btn" href="${esc(url)}">إرسال الطلب عبر واتساب</a>` : '<p>سنتواصل معك قريباً لتأكيد الطلب.</p>'}
      <a class="btn btn-outline" href="shop.html">العودة إلى المتجر</a></div>`;
    notify('تم إنشاء الطلب بنجاح', 'success');
    if (url) setTimeout(() => { location.href = url; }, 900);
  });
}
main();
