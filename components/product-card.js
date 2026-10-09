import { esc, formatPrice } from '../assets/js/utils.js';
import { imgTag } from '../services/images.js';
import { effectivePrice, hasDiscount, discountPercent, stockState } from '../services/products.js';

export function productCard(p, settings) {
  const state = stockState(p, settings.lowStockThreshold);
  const tag = state === 'out' ? ['out', 'نفد من المخزون'] : hasDiscount(p) ? ['', `خصم ${discountPercent(p)}%`] : state === 'low' ? ['', 'ينفد قريباً'] : null;
  return `<a class="card" href="product.html?id=${encodeURIComponent(p.id)}">
    <div class="card-media">${imgTag(p.images?.[0], { alt: p.name, widths: [240, 360, 480], sizes: '(min-width:1000px) 25vw, (min-width:700px) 33vw, 50vw', width: 480, height: 600 })}${tag ? `<span class="tag ${tag[0]}">${tag[1]}</span>` : ''}</div>
    <h3 class="card-title">${esc(p.name)}</h3>
    <p class="price"><span class="now">${formatPrice(effectivePrice(p))}</span>${hasDiscount(p) ? `<s class="was">${formatPrice(p.price)}</s>` : ''}</p>
  </a>`;
}
export const skeletonCards = n => Array.from({ length: n }, () => '<div class="card" aria-hidden="true"><div class="card-media sk"></div><div class="sk sk-line"></div><div class="sk sk-line short"></div></div>').join('');
