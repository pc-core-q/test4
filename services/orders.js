import { STORE_CONFIG } from '../config/store-config.js';
import { isDemo, getFirestore, col } from './firebase.js';
import { formatPrice, normalizePhone, waLink } from '../assets/js/utils.js';

export const orderNumber = () => {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Math.floor(100 + Math.random() * 900)}`;
};

/** -> { field: 'Arabic message' } (empty object when valid) */
export function validateCustomer({ name = '', phone = '', address = '', landmark = '' }) {
  const e = {};
  if (name.trim().length < 3) e.name = 'يرجى إدخال الاسم الكامل.';
  if (!new RegExp(STORE_CONFIG.phoneRegex).test(normalizePhone(phone))) e.phone = 'رقم الهاتف غير صحيح. مثال: 07701234567';
  if (address.trim().length < 5) e.address = 'يرجى إدخال العنوان بالتفصيل.';
  if (landmark.trim().length < 2) e.landmark = 'يرجى إدخال أقرب نقطة دالة.';
  return e;
}

/** Cart lines + customer -> order document (without createdAt, which the server sets). */
export function prepareOrder(items, customer) {
  const now = new Date();
  const lines = items.map(i => ({
    productId: i.productId, name: i.name, category: i.category || '', options: i.options || {},
    qty: i.qty, unitPrice: i.price, total: i.price * i.qty, image: i.image || ''
  }));
  const total = lines.reduce((s, l) => s + l.total, 0);
  return {
    orderNumber: orderNumber(),
    customer: {
      name: customer.name.trim(), phone: normalizePhone(customer.phone), address: customer.address.trim(),
      landmark: customer.landmark.trim(), notes: (customer.notes || '').trim()
    },
    items: lines, subtotal: total, total, currency: STORE_CONFIG.currency.code,
    status: 'new', stockReduced: false,
    date: now.toLocaleDateString('en-GB'), time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  };
}

/** Saves the order in Firestore. Customers can create orders but never read them (see firestore.rules). */
export async function createOrder(order) {
  if (isDemo) { console.info('[demo] order not saved', order); return 'demo-order'; }
  const { db, fs } = await getFirestore();
  const ref = fs.doc(col(fs, db, 'orders'));
  await fs.setDoc(ref, { ...order, createdAt: fs.serverTimestamp() });
  return ref.id;
}

export function buildWhatsAppMessage(order, storeName = '') {
  const L = [`طلب جديد من ${storeName || 'المتجر'}`, `رقم الطلب: ${order.orderNumber}`, '',
    'اسم العميل:', order.customer.name, '', 'رقم الهاتف:', order.customer.phone, '',
    'العنوان:', order.customer.address, '', 'أقرب نقطة دالة:', order.customer.landmark, '', 'الطلبات:', ''];
  order.items.forEach((it, n) => {
    L.push(`${n + 1}. ${it.name}`);
    if (it.category) L.push(`   النوع: ${it.category}`);
    Object.entries(it.options || {}).forEach(([k, v]) => L.push(`   ${k}: ${v}`));
    L.push(`   الكمية: ${it.qty}`, `   السعر: ${formatPrice(it.unitPrice)}`);
    if (it.qty > 1) L.push(`   الإجمالي: ${formatPrice(it.total)}`);
    L.push('');
  });
  L.push('---', 'المجموع الكلي:', formatPrice(order.total));
  if (order.customer.notes) L.push('', 'ملاحظات:', order.customer.notes);
  return L.join('\n');
}
export const whatsappOrderUrl = (order, settings) => waLink(settings.whatsapp, buildWhatsAppMessage(order, settings.storeName));
