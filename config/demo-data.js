/** Sample data used ONLY when firebase-config.js is empty (demo mode). Safe to delete in production. */
const day = 86400000, now = Date.now();
const sizes = { name: 'المقاس', values: ['S', 'M', 'L', 'XL'] };
const colors = (v) => ({ name: 'اللون', values: v });
export const DEMO_DATA = {
  settings: {
    storeName: 'متجر تجريبي',
    storeDescription: 'نسخة عرض تجريبية — بيانات وهمية لا تُحفظ.',
    whatsapp: '07700000000', phone: '07700000000', email: 'hello@example.com', address: 'بغداد، العراق',
    social: { instagram: 'instagram.com', facebook: 'facebook.com' }
  },
  categories: [
    { id: 'shirts', name: 'قمصان', active: true, order: 1 },
    { id: 'pants', name: 'بناطيل', active: true, order: 2 },
    { id: 'shoes', name: 'أحذية', active: true, order: 3 },
    { id: 'acc', name: 'إكسسوارات', active: true, order: 4 }
  ],
  banners: [
    { id: 'b1', title: 'تشكيلة الموسم الجديد', description: 'قطع أنيقة بأسعار مناسبة', buttonText: 'تسوّق الآن', link: 'shop.html', imageUrl: '', active: true, order: 1 },
    { id: 'b2', title: 'خصومات على المنتجات المختارة', description: '', buttonText: 'شاهد العروض', link: 'shop.html?featured=1', imageUrl: '', active: true, order: 2 }
  ],
  products: [
    { id: 'p1', name: 'تيشيرت قطني أسود', description: 'قطن ناعم بقصّة مريحة.\nمناسب للاستخدام اليومي.', categoryId: 'shirts', category: 'قمصان', price: 25000, discountPrice: 0, stock: 24, featured: true, tags: ['تيشيرت', 'قطن'], options: [sizes, colors(['أسود', 'أبيض'])], sku: 'TS-001', brand: '' },
    { id: 'p2', name: 'قميص كتان بأكمام طويلة', description: 'كتان خفيف يناسب الصيف.', categoryId: 'shirts', category: 'قمصان', price: 38000, discountPrice: 32000, stock: 3, featured: true, tags: ['كتان'], options: [sizes] },
    { id: 'p3', name: 'بنطال جينز مستقيم', description: 'جينز بخامة متينة.', categoryId: 'pants', category: 'بناطيل', price: 45000, discountPrice: 0, stock: 15, featured: true, options: [{ name: 'المقاس', values: ['30', '32', '34', '36'] }] },
    { id: 'p4', name: 'بنطال قماش رمادي', description: '', categoryId: 'pants', category: 'بناطيل', price: 42000, discountPrice: 0, stock: 0, featured: false },
    { id: 'p5', name: 'حذاء رياضي أبيض', description: 'نعل مريح وخفيف.', categoryId: 'shoes', category: 'أحذية', price: 65000, discountPrice: 55000, stock: 9, featured: true, options: [{ name: 'المقاس', values: ['40', '41', '42', '43'] }] },
    { id: 'p6', name: 'حزام جلد', description: '', categoryId: 'acc', category: 'إكسسوارات', price: 15000, discountPrice: 0, stock: 40, featured: false },
    { id: 'p7', name: 'قبعة قطنية', description: '', categoryId: 'acc', category: 'إكسسوارات', price: 12000, discountPrice: 0, stock: 2, featured: false, options: [colors(['أسود', 'كحلي'])] },
    { id: 'p8', name: 'هودي بسحاب', description: 'تدفئة خفيفة للأجواء المعتدلة.', categoryId: 'shirts', category: 'قمصان', price: 52000, discountPrice: 0, stock: 12, featured: false, options: [sizes, colors(['رمادي', 'كحلي'])] }
  ].map((p, i) => ({ status: 'active', images: [], createdAt: now - i * day, ...p }))
};
