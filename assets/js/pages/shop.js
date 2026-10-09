import { initApp } from '../app.js';
import { $, esc, getParam, reportError } from '../utils.js';
import { listProducts, searchProducts } from '../../../services/products.js';
import { listCategories } from '../../../services/catalog.js';
import { productCard, skeletonCards } from '../../../components/product-card.js';

async function main() {
  const s = await initApp({ title: 'المتجر' });
  const cat = getParam('cat'), q = (getParam('q') || '').trim(), featured = getParam('featured') === '1';
  const grid = $('#grid'), more = $('#more'), title = $('#title'), box = $('#q');
  box.value = q;
  grid.innerHTML = skeletonCards(8);

  let cats = [];
  try { cats = await listCategories(); } catch (e) { console.error(e); }
  const current = cats.find(c => c.id === cat);
  $('#chips').innerHTML = [`<a class="chip" href="shop.html"${!cat && !q ? ' aria-current="true"' : ''}>الكل</a>`,
    ...cats.map(c => `<a class="chip" href="shop.html?cat=${encodeURIComponent(c.id)}"${c.id === cat ? ' aria-current="true"' : ''}>${esc(c.name)}</a>`)].join('');
  title.textContent = q ? `نتائج البحث عن «${q}»` : current ? current.name : featured ? 'منتجات مميزة' : 'جميع المنتجات';
  if (current || q) document.title = `${title.textContent} | ${s.storeName}`;

  const empty = () => `<div class="empty" style="grid-column:1/-1"><h2>لا توجد منتجات</h2><p>${q ? 'جرّب كلمات بحث أخرى.' : 'لم تتم إضافة منتجات هنا بعد.'}</p><a class="btn btn-outline" href="shop.html">عرض كل المنتجات</a></div>`;
  let cursor = null;
  const show = (items, replace) => { grid.innerHTML = (replace ? '' : grid.innerHTML) + items.map(p => productCard(p, s)).join(''); };

  async function load(first) {
    more.disabled = true;
    try {
      if (q) {
        let items = await searchProducts(q, cats);
        if (cat) items = items.filter(p => p.categoryId === cat);
        if (items.length) show(items, true); else grid.innerHTML = empty();
        more.hidden = true; return;
      }
      const r = await listProducts({ categoryId: cat || undefined, featured, cursor });
      cursor = r.cursor;
      if (first) grid.innerHTML = r.items.length ? '' : empty();
      show(r.items, false);
      more.hidden = !r.hasMore; more.disabled = false;
    } catch (e) { grid.innerHTML = `<p class="empty" style="grid-column:1/-1">${reportError('shop', e)}</p>`; more.hidden = true; }
  }
  more.addEventListener('click', () => load(false));
  load(true);
}
main();
