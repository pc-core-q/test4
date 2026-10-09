/**
 * Code-level configuration (rarely changes per client).
 * Anything the store owner edits from the admin panel lives in Firestore:
 *   stores/{storeId}/settings/main   -> merged over DEFAULT_SETTINGS at runtime.
 */
export const STORE_CONFIG = {
  storeId: 'my-store',                       // Firestore namespace: stores/{storeId}/...
  language: { lang: 'ar', dir: 'rtl' },
  currency: { code: 'IQD', symbol: 'د.ع', locale: 'en-US', position: 'after' },
  phoneCountryCode: '964',                   // used to build wa.me numbers from local format (07...)
  phoneRegex: '^(?:\\+?964|0)7[3-9]\\d{8}$', // customer phone validation (Iraqi mobile)
  fontFamily: "'IBM Plex Sans Arabic', system-ui, 'Segoe UI', Tahoma, sans-serif",
  pageSize: 12,
  cacheMinutes: { settings: 10, catalog: 10, home: 5 },
  // ImageKit: URL endpoint of your account, with ImgBB (https://i.ibb.co/) added as an origin. See docs/IMAGE_SYSTEM.md
  imageKit: { urlEndpoint: '', originBase: 'https://i.ibb.co/' },
  orderStatuses: [
    { key: 'new', label: 'جديد' },
    { key: 'reviewing', label: 'قيد المراجعة' },
    { key: 'confirmed', label: 'تم التأكيد' },
    { key: 'preparing', label: 'قيد التجهيز' },
    { key: 'shipped', label: 'تم الشحن' },
    { key: 'completed', label: 'مكتمل' },
    { key: 'cancelled', label: 'ملغي' }
  ]
};

/** Fallbacks used until/unless Firestore provides values. Contains no client data. */
export const DEFAULT_SETTINGS = {
  storeName: 'اسم المتجر',
  storeDescription: '',
  seoTitle: '',
  seoDescription: '',
  logoUrl: '',
  faviconUrl: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  social: { instagram: '', facebook: '', tiktok: '', telegram: '', other: [] },
  theme: {
    primary: '#1d2b3a', secondary: '#e8ecf0', accent: '#0f766e',
    background: '#f5f6f7', text: '#171b21', buttonStyle: 'rounded' // square | rounded | pill
  },
  lowStockThreshold: 5,
  reduceStockOn: 'confirmed', // never | confirmed  (applied by the admin panel when an order becomes confirmed)
  homeSections: { banners: true, categories: true, featured: true, latest: true, lowStock: true }
};
