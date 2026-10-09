import { initApp } from '../app.js';
import { $, esc, formatPrice } from '../utils.js';
import { getCart, setQty, removeItem, cartSubtotal } from '../../../components/cart.js';
import { imgTag } from '../../../services/images.js';
import { notify } from '../../../components/notifications.js';

const optText = o => Object.entries(o || {}).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ');

function render() {
  const items = getCart(), el = $('#cart');
  if (!items.length) {
    el.innerHTML = '<div class="empty"><h2>سلتك فارغة</h2><p>أضف منتجات لتظهر هنا.</p><a class="btn" href="shop.html">تابع التسوق</a></div>';
    return;
  }
  el.innerHTML = `<div class="layout-2"><ul class="cart-list">${items.map(i => `<li class="cart-row" data-key="${esc(i.key)}">
      <a href="product.html?id=${encodeURIComponent(i.productId)}">${imgTag(i.image, { alt: i.name, widths: [84, 168], sizes: '84px', width: 84, height: 105 })}</a>
      <div><a class="cart-name" href="product.html?id=${encodeURIComponent(i.productId)}">${esc(i.name)}</a>
        ${optText(i.options) ? `<p class="muted small">${optText(i.options)}</p>` : ''}
        <p class="muted small">سعر الوحدة: ${formatPrice(i.price)}</p>
        <div class="cart-actions">
          <div class="qty"><button type="button" data-act="dec" aria-label="إنقاص الكمية">−</button><output aria-label="الكمية">${i.qty}</output><button type="button" data-act="inc" aria-label="زيادة الكمية"${i.qty >= (i.maxStock ?? Infinity) ? ' disabled' : ''}>+</button></div>
          <strong>${formatPrice(i.price * i.qty)}</strong>
        </div>
        <button class="link-btn" type="button" data-act="rm">حذف</button>
      </div></li>`).join('')}</ul>
    <aside class="summary" aria-label="ملخص الطلب"><h2>ملخص الطلب</h2>
      <div class="row"><span>المجموع الفرعي</span><span>${formatPrice(cartSubtotal())}</span></div>
      <div class="total"><span>المجموع الكلي</span><span>${formatPrice(cartSubtotal())}</span></div>
      <a class="btn btn-block" href="checkout.html">إتمام الطلب</a>
      <a class="btn btn-outline btn-block" href="shop.html">تابع التسوق</a>
    </aside></div>`;
}

async function main() {
  await initApp({ title: 'سلة التسوق' });
  render();
  $('#cart').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const key = b.closest('.cart-row').dataset.key, it = getCart().find(i => i.key === key);
    if (b.dataset.act === 'inc') setQty(key, it.qty + 1);
    if (b.dataset.act === 'dec') it.qty > 1 ? setQty(key, it.qty - 1) : (removeItem(key), notify('تم حذف المنتج من السلة'));
    if (b.dataset.act === 'rm') { removeItem(key); notify('تم حذف المنتج من السلة'); }
    render();
  });
}
main();
