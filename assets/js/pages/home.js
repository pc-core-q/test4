import { initApp } from '../app.js';
import { $, esc, reportError } from '../utils.js';
import { listProducts, listLowStock } from '../../../services/products.js';
import { listBanners, listCategories } from '../../../services/catalog.js';
import { productCard, skeletonCards } from '../../../components/product-card.js';
import { imgTag } from '../../../services/images.js';

function renderHero(el, banners, s) {
  if (!banners.length) {
    el.innerHTML = `<div class="hero-fallback"><div class="container"><h1>${esc(s.storeName)}</h1>${s.storeDescription ? `<p>${esc(s.storeDescription)}</p>` : ''}<a class="btn btn-light" href="shop.html">تسوّق الآن</a></div></div>`;
    return;
  }
  const slide = (b, i) => `<article class="slide" id="slide-${i}">
    ${b.imageUrl ? imgTag(b.imageUrl, { alt: '', widths: [480, 768, 1080, 1440], sizes: '100vw', eager: i === 0, width: 1440, height: 900 }) : ''}
    ${b.title || b.description || b.buttonText ? `<div class="slide-text">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${b.description ? `<p>${esc(b.description)}</p>` : ''}${b.buttonText ? `<a class="btn btn-light" href="${esc(b.link || 'shop.html')}">${esc(b.buttonText)}</a>` : ''}</div>` : ''}
  </article>`;
  el.innerHTML = `<h1 class="visually-hidden">${esc(s.storeName)}</h1><div class="slides" tabindex="0" aria-label="العروض">${banners.map(slide).join('')}</div>` +
    (banners.length > 1 ? `<div class="dots">${banners.map((_, i) => `<button type="button" aria-label="العرض ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}</div>` : '');
  if (banners.length < 2) return;

  const slides = el.querySelector('.slides'), dots = [...el.querySelectorAll('.dots button')];
  const go = i => el.querySelector(`#slide-${i}`).scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { const i = +e.target.id.slice(6); dots.forEach((d, k) => k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')); }
  }), { root: slides, threshold: 0.6 });
  slides.querySelectorAll('.slide').forEach(x => io.observe(x));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let cur = 0, timer = setInterval(() => go(cur = (cur + 1) % banners.length), 5500);
    ['pointerdown', 'focusin'].forEach(ev => el.addEventListener(ev, () => clearInterval(timer), { once: true }));
  }
}

async function fill(secSel, gridSel, loader, s) {
  const sec = $(secSel), grid = $(gridSel);
  try {
    const items = await loader();
    if (!items.length) { sec.hidden = true; return; }
    grid.innerHTML = items.map(p => productCard(p, s)).join('');
    sec.hidden = false;
  } catch (e) { grid.innerHTML = `<p class="empty">${reportError('home', e)}</p>`; sec.hidden = false; }
}

async function main() {
  const s = await initApp();
  const on = s.homeSections;
  const tasks = [];

  if (on.banners) tasks.push(listBanners().then(b => renderHero($('#hero'), b, s)).catch(e => { console.error(e); renderHero($('#hero'), [], s); }));
  else renderHero($('#hero'), [], s);

  if (on.categories) tasks.push(listCategories().then(cats => {
    if (!cats.length) return;
    $('#categories').innerHTML = cats.map(c => `<a class="chip" href="shop.html?cat=${encodeURIComponent(c.id)}">${c.imageUrl ? imgTag(c.imageUrl, { alt: '', widths: [56, 112], sizes: '28px', width: 28, height: 28 }) : ''}${esc(c.name)}</a>`).join('');
    $('#sec-categories').hidden = false;
  }).catch(e => console.error(e)));

  if (on.featured) { $('#featured').innerHTML = skeletonCards(4); tasks.push(fill('#sec-featured', '#featured', async () => (await listProducts({ featured: true, limit: 8 })).items, s)); } else $('#sec-featured').hidden = true;
  if (on.latest) { $('#latest').innerHTML = skeletonCards(4); tasks.push(fill('#sec-latest', '#latest', async () => (await listProducts({ limit: 8 })).items, s)); } else $('#sec-latest').hidden = true;
  if (on.lowStock) tasks.push(fill('#sec-low', '#low', () => listLowStock(s.lowStockThreshold, 4), s));
  await Promise.all(tasks);
}
main();
