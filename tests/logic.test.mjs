import assert from 'node:assert/strict';
import { formatPrice, waNumber, waLink, normalizeDigits, safeUrl, deepMerge, readableOn } from '../assets/js/utils.js';
import { effectivePrice, hasDiscount, discountPercent, stockState, keywordsOf, listProducts, searchProducts, listLowStock, getProduct } from '../services/products.js';
import { validateCustomer, prepareOrder, buildWhatsAppMessage } from '../services/orders.js';
import { ikUrl, imgAttrs } from '../services/images.js';
import { DEFAULT_SETTINGS } from '../config/store-config.js';

let n = 0; const t = (name, fn) => { fn instanceof Promise ? 0 : 0; return Promise.resolve(fn()).then(() => { n++; console.log('ok  ' + name); }); };

await t('price format', () => { assert.equal(formatPrice(25000), '25,000 د.ع'); });
await t('digits + wa number', () => {
  assert.equal(normalizeDigits('٠٧٧٠١٢٣٤٥٦٧'), '07701234567');
  assert.equal(waNumber('0770 123 4567'), '9647701234567');
  assert.equal(waLink('07701234567', 'مرحبا'), 'https://wa.me/9647701234567?text=' + encodeURIComponent('مرحبا'));
});
await t('safeUrl / merge / contrast', () => {
  assert.equal(safeUrl('instagram.com/x'), 'https://instagram.com/x');
  assert.equal(deepMerge({ a: { b: 1, c: 2 } }, { a: { b: 5 }, z: '' }).a.c, 2);
  assert.equal(readableOn('#ffffff'), '#14171c'); assert.equal(readableOn('#1d2b3a'), '#ffffff');
});
await t('product helpers', () => {
  const p = { price: 40000, discountPrice: 30000, stock: 3 };
  assert.equal(effectivePrice(p), 30000); assert.ok(hasDiscount(p)); assert.equal(discountPercent(p), 25);
  assert.equal(effectivePrice({ price: 10, discountPrice: 20 }), 10);
  assert.equal(stockState({ stock: 0 }), 'out'); assert.equal(stockState(p, 5), 'low'); assert.equal(stockState({ stock: 9 }, 5), 'ok');
  assert.deepEqual(keywordsOf({ name: 'تيشيرت أسود', tags: ['قطن'] }), ['تيشيرت', 'أسود', 'قطن']);
});
await t('customer validation', () => {
  assert.deepEqual(validateCustomer({ name: 'محمد أحمد', phone: '٠٧٧٠١٢٣٤٥٦٧', address: 'بغداد - الكرادة', landmark: 'قرب الجامع' }), {});
  const e = validateCustomer({ name: 'م', phone: '123', address: '', landmark: '' });
  assert.deepEqual(Object.keys(e).sort(), ['address', 'landmark', 'name', 'phone']);
  assert.ok(!validateCustomer({ name: 'محمد أحمد', phone: '+9647701234567', address: 'بغداد - الكرادة', landmark: 'x1' }).phone);
});
await t('order + whatsapp message', () => {
  const items = [
    { productId: 'a', name: 'تيشيرت أسود', category: 'ملابس', options: { 'المقاس': 'L', 'اللون': 'أسود' }, qty: 2, price: 25000 },
    { productId: 'b', name: 'منتج آخر', qty: 1, price: 15000 }];
  const o = prepareOrder(items, { name: ' محمد أحمد ', phone: '07701234567', address: 'بغداد', landmark: 'قرب الجامع', notes: '' });
  assert.equal(o.total, 65000); assert.equal(o.status, 'new'); assert.equal(o.stockReduced, false);
  const m = buildWhatsAppMessage(o, 'متجر');
  for (const s of ['طلب جديد من متجر', 'اسم العميل:\nمحمد أحمد', 'أقرب نقطة دالة:\nقرب الجامع', '1. تيشيرت أسود', 'المقاس: L', 'الكمية: 2', 'السعر: 25,000 د.ع', 'الإجمالي: 50,000 د.ع', '2. منتج آخر', 'المجموع الكلي:\n65,000 د.ع'])
    assert.ok(m.includes(s), 'missing: ' + s);
  assert.ok(!m.includes('ملاحظات'));
});
await t('image urls (ImageKit not configured -> original)', () => {
  assert.equal(ikUrl('https://i.ibb.co/x/a.jpg', 480), 'https://i.ibb.co/x/a.jpg');
  assert.equal(imgAttrs('https://i.ibb.co/x/a.jpg').srcset, undefined);
});
await t('demo catalog: list, paginate, search, low stock, get', async () => {
  const p1 = await listProducts({ limit: 3 }); assert.equal(p1.items.length, 3); assert.ok(p1.hasMore);
  const p2 = await listProducts({ limit: 3, cursor: p1.cursor }); assert.notEqual(p2.items[0].id, p1.items[0].id);
  assert.ok((await listProducts({ featured: true })).items.every(p => p.featured));
  assert.ok((await listProducts({ categoryId: 'pants' })).items.every(p => p.categoryId === 'pants'));
  assert.ok((await searchProducts('جينز')).some(p => p.id === 'p3'));
  assert.ok((await searchProducts('أحذية', [{ id: 'shoes', name: 'أحذية' }])).some(p => p.id === 'p5'));
  const low = await listLowStock(DEFAULT_SETTINGS.lowStockThreshold); assert.ok(low.length && low.every(p => p.stock > 0 && p.stock <= 5));
  assert.equal((await getProduct('p4')).stock, 0); assert.equal(await getProduct('nope'), null);
});
console.log(`\n${n} test groups passed`);
