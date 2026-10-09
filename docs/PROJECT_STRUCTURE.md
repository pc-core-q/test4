# Project Structure

Vanilla HTML/CSS/ES-module JavaScript. No build step, no framework. Firebase (Auth + Firestore) is loaded lazily from the gstatic CDN.
Customer-facing UI is Arabic/RTL; code and docs are English.

```
/
├── index.html shop.html product.html cart.html checkout.html   storefront pages (thin HTML shells)
├── admin/                      index (dashboard) products inventory orders categories banners settings  (.html shells)
├── assets/
│   ├── css/main.css            storefront + shared tokens/components (theme variables are set at runtime)
│   ├── css/admin.css           admin-only styles (sidebar, tables, dialogs)
│   ├── icons/                  favicon.svg + PWA icons
│   └── js/
│       ├── app.js              storefront bootstrap: initApp(), setMeta(), addJsonLd(), applyTheme(), SW registration
│       ├── utils.js            esc, formatPrice, waLink, cache*, deepMerge, reportError, readableOn, ...
│       ├── pages/              one module per storefront page (home, shop, product, cart-page, checkout)
│       └── admin/              shell.js (auth guard + layout), ui.js (modal, confirm, imageList), one module per admin page
├── components/                 header.js footer.js product-card.js cart.js notifications.js icons.js
├── services/                   ALL data access lives here (pages never call Firestore directly)
│   ├── firebase.js             lazy SDK loader, isDemo flag, col(), toObj()
│   ├── settings.js             loadSettings() = DEFAULT_SETTINGS + Firestore settings/main (cached)
│   ├── catalog.js              listCategories(), listBanners() (active only, cached)
│   ├── products.js             listProducts/getProduct/searchProducts/listLowStock + pure price/stock helpers
│   ├── orders.js               validateCustomer, prepareOrder, createOrder, buildWhatsAppMessage
│   ├── images.js               ImageKit URL builder (imgAttrs/imgTag); falls back to the original URL
│   ├── auth.js                 login/logout/currentAdmin (admin pages only)
│   ├── admin.js                admin CRUD (list/count/save/remove), product doc builder, order status + stock transaction, dashboard counts
│   └── uploads.js              ImgBB upload with in-browser resize (admin only)
├── config/
│   ├── store-config.js         STORE_CONFIG (code-level) + DEFAULT_SETTINGS (fallbacks, no client data)
│   ├── firebase-config.js      Firebase web config (public identifiers). Empty => storefront runs in DEMO MODE
│   ├── admin-config.js         ImgBB key + upload limits. Loaded only by admin pages
│   └── demo-data.js            sample catalog used only in demo mode (safe to delete)
├── firestore.rules             security rules       firestore.indexes.json  composite indexes
├── firebase.json               hosting headers + rules/index deploy targets
├── manifest.json sw.js         PWA     robots.txt   SEO
├── tests/                      logic tests (node), e2e.py + pwa.py (playwright), fake-firebase/ (in-memory Firebase for e2e)
└── docs/                       this folder
```

## How modules talk
```
page module ──> assets/js/app.js initApp() ──> services/settings.js ──> services/firebase.js ──> Firestore
     │                    └──> components/header.js, footer.js (render settings)
     ├──> services/products.js | catalog.js | orders.js   (data)
     ├──> components/product-card.js, cart.js, notifications.js  (UI/state)
     └──> assets/js/utils.js                               (helpers)
admin page ──> admin/shell.js startAdmin() ──> services/auth.js ──> login form or boot ──> page callback({settings,user,content})
     └──> services/admin.js (writes) , admin/ui.js (modals, uploads) , services/uploads.js (ImgBB)
```
Rules: services never touch the DOM; components/pages never import the Firebase SDK; only `services/firebase.js` knows the SDK URL.

## Where to change things
| Want to change | Edit |
|---|---|
| Colors, button shape, store text | Admin → Settings (stored in Firestore). Defaults: `config/store-config.js` |
| Currency symbol/locale, phone validation, page size, order statuses | `config/store-config.js` |
| Layout / look of storefront | `assets/css/main.css` (use the CSS variables) |
| Product card markup | `components/product-card.js` |
| Header / footer | `components/header.js`, `components/footer.js` |
| WhatsApp message text | `services/orders.js` → `buildWhatsAppMessage` |
| Checkout fields / validation | `checkout.html`, `services/orders.js` (`validateCustomer`), `assets/js/pages/checkout.js`, and `firestore.rules` (`validOrder`) |
| Product fields | `services/admin.js` (`buildProductDoc`, `validateProduct`), `assets/js/admin/products.js` (form), `assets/js/pages/product.js` (display) |
| Admin sidebar links | `NAV` in `assets/js/admin/shell.js` |
| Who is admin | Firestore doc `stores/{storeId}/admins/{uid}` (created manually) |
