import { esc } from '../assets/js/utils.js';
import { ICONS } from './icons.js';
import { cartCount } from './cart.js';
import { imgAttrs } from '../services/images.js';

const LINKS = [['index.html', 'الرئيسية'], ['shop.html', 'المتجر'], ['cart.html', 'السلة']];

export function renderHeader(el, s) {
  const page = location.pathname.split('/').pop() || 'index.html';
  const logo = s.logoUrl ? imgAttrs(s.logoUrl, { widths: [160, 240, 320] }) : null;
  const n = cartCount();
  el.innerHTML = `<div class="container bar">
    <button class="icon-btn menu-btn" type="button" aria-label="القائمة" aria-expanded="false" aria-controls="nav">${ICONS.menu}</button>
    <a class="brand" href="index.html">${logo ? `<img src="${esc(logo.src)}"${logo.srcset ? ` srcset="${esc(logo.srcset)}" sizes="160px"` : ''} alt="${esc(s.storeName)}" height="40">` : esc(s.storeName)}</a>
    <nav id="nav" class="nav" aria-label="القائمة الرئيسية">${LINKS.map(([h, t]) => `<a href="${h}"${h === page ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <form class="search" action="shop.html" role="search">
      <input name="q" type="search" placeholder="ابحث عن منتج" aria-label="ابحث عن منتج" autocomplete="off" enterkeyhint="search">
      <button type="submit" aria-label="بحث">${ICONS.search}</button>
    </form>
    <a class="icon-btn cart-link" href="cart.html" aria-label="السلة">${ICONS.cart}<span class="badge" id="cart-count"${n ? '' : ' hidden'}>${n}</span></a>
  </div>`;

  const btn = el.querySelector('.menu-btn'), nav = el.querySelector('.nav');
  const toggle = open => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); };
  btn.addEventListener('click', () => toggle(!nav.classList.contains('open')));
  nav.addEventListener('click', e => e.target.closest('a') && toggle(false));
  document.addEventListener('keydown', e => e.key === 'Escape' && toggle(false));

  const badge = el.querySelector('#cart-count');
  const sync = () => { const c = cartCount(); badge.textContent = c; badge.hidden = !c; };
  window.addEventListener('cart:change', sync);
  window.addEventListener('storage', sync);
}
