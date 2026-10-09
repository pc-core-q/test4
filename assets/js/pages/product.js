import { initApp, setMeta, addJsonLd } from '../app.js';
import { $, esc, getParam, formatPrice, waLink, reportError } from '../utils.js';
import { getProduct, effectivePrice, hasDiscount, discountPercent, stockState } from '../../../services/products.js';
import { imgAttrs, imgTag } from '../../../services/images.js';
import { STORE_CONFIG } from '../../../config/store-config.js';
import { addItem } from '../../../components/cart.js';
import { notify } from '../../../components/notifications.js';

function gallery(p) {
  const imgs = p.images?.length ? p.images : [''];
  const big = i => imgTag(imgs[i], { alt: p.name, widths: [480, 720, 1080], sizes: '(min-width:900px) 50vw, 100vw', eager: true, width: 720, height: 900 });
  return `<div class="gallery"><div class="gallery-main" id="gmain">${big(0)}</div>
    ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button type="button" data-i="${i}" aria-label="صورة ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}>${imgTag(u, { alt: '', widths: [96, 160], sizes: '64px', width: 64, height: 80 })}</button>`).join('')}</div>` : ''}</div>`;
}

function renderProduct(p, s) {
  const state = stockState(p, s.lowStockThreshold), out = state === 'out';
  const price = effectivePrice(p);
  const options = (p.options || []).filter(o => o.values?.length);
  $('#product').innerHTML = `${gallery(p)}
  <div class="info">
    <h1>${esc(p.name)}</h1>
    ${p.category ? `<p class="muted">${esc(p.category)}${p.brand ? ` · ${esc(p.brand)}` : ''}</p>` : ''}
    <p class="price big"><span class="now">${formatPrice(price)}</span>${hasDiscount(p) ? `<s class="was">${formatPrice(p.price)}</s><span class="tag inline">خصم ${discountPercent(p)}%</span>` : ''}</p>
    <p class="stock ${state}">${out ? 'نفد من المخزون' : `المتوفر في المخزون: ${p.stock}${state === 'low' ? ' — الكمية محدودة' : ''}`}</p>
    <form id="buy" novalidate>
      ${options.map((o, n) => `<fieldset class="option"><legend>${esc(o.name)}</legend><div class="choices">${o.values.map(v => `<label class="choice"><input type="radio" name="opt${n}" value="${esc(v)}"${out ? ' disabled' : ''}><span>${esc(v)}</span></label>`).join('')}</div></fieldset>`).join('')}
      ${out ? '' : `<div class="option"><label for="qty" class="legend">الكمية</label>
        <div class="qty"><button type="button" data-q="-1" aria-label="إنقاص الكمية">−</button><input id="qty" type="number" inputmode="numeric" min="1" max="${p.stock}" value="1"><button type="button" data-q="1" aria-label="زيادة الكمية">+</button></div></div>`}
      <div class="actions">
        <button class="btn" type="submit" data-go="cart"${out ? ' disabled' : ''}>${out ? 'نفد من المخزون' : 'أضف إلى السلة'}</button>
        <button class="btn btn-outline" type="submit" data-go="checkout"${out ? ' disabled' : ''}>اطلب الآن</button>
        ${s.whatsapp && !out ? '<button class="btn btn-outline" type="button" id="wa">اطلب عبر واتساب</button>' : ''}
      </div>
    </form>
    ${p.description ? `<section class="desc"><h2>الوصف</h2><p>${esc(p.description)}</p></section>` : ''}
    ${p.specs?.length ? `<section class="desc"><h2>المواصفات</h2><table class="specs">${p.specs.map(r => `<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join('')}</table></section>` : ''}
    ${p.sku ? `<p class="muted small">رمز المنتج: <span dir="ltr">${esc(p.sku)}</span></p>` : ''}
  </div>`;

  const form = $('#buy'), qty = $('#qty');
  const clamp = v => Math.max(1, Math.min(p.stock, parseInt(v, 10) || 1));
  const collect = () => {
    const chosen = {};
    for (const [n, o] of options.entries()) {
      const v = form.querySelector(`input[name="opt${n}"]:checked`)?.value;
      if (!v) { notify(`يرجى اختيار ${o.name}`, 'error'); return null; }
      chosen[o.name] = v;
    }
    return { chosen, q: clamp(qty.value) };
  };

  $('#product').addEventListener('click', e => {
    const th = e.target.closest('.thumbs button');
    if (th) {
      const a = imgAttrs(p.images[+th.dataset.i], { widths: [480, 720, 1080], sizes: '(min-width:900px) 50vw, 100vw' });
      const img = $('#gmain img'); img.src = a.src; if (a.srcset) { img.srcset = a.srcset; img.sizes = a.sizes; }
      document.querySelectorAll('.thumbs button').forEach(b => b.removeAttribute('aria-current')); th.setAttribute('aria-current', 'true');
    }
    const q = e.target.closest('[data-q]');
    if (q) qty.value = clamp(+qty.value + +q.dataset.q);
  });
  qty?.addEventListener('change', () => { qty.value = clamp(qty.value); });

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (out) return notify('نفد من المخزون', 'error');
    const c = collect(); if (!c) return;
    const r = addItem({ productId: p.id, name: p.name, category: p.category || '', image: p.images?.[0] || '', price, options: c.chosen, qty: c.q, maxStock: p.stock });
    if (!r.ok) return notify('وصلت إلى أقصى كمية متوفرة لهذا المنتج', 'error');
    if (e.submitter?.dataset.go === 'checkout') location.href = 'checkout.html';
    else notify('تمت إضافة المنتج إلى السلة', 'success');
  });

  $('#wa')?.addEventListener('click', () => {
    const c = collect(); if (!c) return;
    const lines = [`أرغب بطلب المنتج التالي من ${s.storeName}:`, p.name, ...Object.entries(c.chosen).map(([k, v]) => `${k}: ${v}`), `الكمية: ${c.q}`, `السعر: ${formatPrice(price)}`, location.href];
    window.open(waLink(s.whatsapp, lines.join('\n')), '_blank', 'noopener');
  });
}

async function main() {
  const s = await initApp({ title: 'المنتج' });
  try {
    const p = await getProduct(getParam('id'));
    if (!p) { $('#product').innerHTML = '<div class="empty"><h2>المنتج غير موجود</h2><p>ربما تم حذفه أو لم يعد متاحاً.</p><a class="btn" href="shop.html">العودة إلى المتجر</a></div>'; return; }
    renderProduct(p, s);
    setMeta({ title: p.name, description: (p.description || '').slice(0, 160), image: p.images?.[0], type: 'product' }, s);
    addJsonLd({
      '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.description || undefined,
      image: p.images?.length ? p.images : undefined, sku: p.sku || undefined, brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
      offers: { '@type': 'Offer', priceCurrency: STORE_CONFIG.currency.code, price: effectivePrice(p), url: location.href, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' }
    });
  } catch (e) { $('#product').innerHTML = `<p class="empty">${reportError('product', e)}</p>`; }
}
main();
