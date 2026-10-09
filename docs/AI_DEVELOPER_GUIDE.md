# AI Developer Guide

Give this file to an AI coding assistant together with a feature request ("add product reviews", "add delivery fee", "add coupon codes").
Goal: the assistant can say exactly which files to create/change without seeing the whole project. Read `PROJECT_STRUCTURE.md` and `FIREBASE_SETUP.md` (data model) for details.

## 1. Architecture in one paragraph
Static multi-page site, vanilla ES modules, no bundler. Each HTML file is a thin shell that loads one page module (`assets/js/pages/*.js` or `assets/js/admin/*.js`).
Page modules call `initApp()` (storefront) or `startAdmin()` (admin), then use **services** for data and **components** for UI. All Firestore access is in `services/`.
Store-specific values live in Firestore (`stores/{storeId}/settings/main`) or `config/*.js` — never in page code. If `config/firebase-config.js` is empty the storefront runs on `config/demo-data.js` (demo mode); the admin shows a notice.

## 2. Data flow
- **Settings**: `services/settings.js` → DEFAULT_SETTINGS deep-merged with `settings/main` (localStorage cache 10 min, key `{storeId}:settings`) → `initApp()` applies theme (CSS variables), favicon, header, footer, meta tags.
- **Products**: `services/products.js`. Lists are paginated (`listProducts({categoryId, featured, limit, cursor}) -> {items, cursor, hasMore}`), always filtered by `status == 'active'` (required by the rules). Search = `searchProducts(q, categories)` using `nameLower` prefix + `keywords` array-contains + matching category ids; never loads the whole catalog.
- **Categories/banners**: `services/catalog.js` (active only, cached; sorted client-side by `order`).
- **Cart**: `components/cart.js`, localStorage key `cart:{storeId}`, fires `window` event `cart:change`. Line shape: `{key, productId, name, category, image, price(unit, effective), options:{name:value}, qty, maxStock}`; `key = productId|opt=value;...`.
- **Orders**: `services/orders.js`.
- **Admin writes**: `services/admin.js` (`list/count/save/remove`), which also clears the storefront caches (`cacheClear(name)`) in the admin's own browser.

## 3. Flows
**Authentication (admin)**: `admin/*.html` → `startAdmin()` in `assets/js/admin/shell.js` → `currentAdmin()` (Firebase Auth state + check that `stores/{storeId}/admins/{uid}` exists). Not signed in → inline login form (`login()` signs in, then verifies the admins doc, signs out if missing). Every admin page repeats this check; the real enforcement is `firestore.rules` (`isAdmin(storeId)`), not the UI.
**Product flow**: admin form → `buildProductDoc()` (adds `nameLower`, `keywords`) → `save('products', id, doc)` → storefront reads via `products.js` → card (`components/product-card.js`) → `product.html?id=` (`pages/product.js`: options radios, qty bounded by stock, JSON-LD).
**Cart flow**: product page `addItem()` (clamped to `maxStock`) → `cart.html` (`pages/cart-page.js`: qty ±, remove) → `checkout.html`.
**Checkout flow** (`pages/checkout.js`): `validateCustomer()` → `verifyCart()` re-reads each product (removes unavailable items, clamps qty to stock, refreshes prices; if anything changed it updates the cart, toasts, and stops so the customer can review) → `prepareOrder(cart, customer)` → `createOrder(order)` (Firestore doc, `status:'new'`, server timestamp) → `clearCart()` → success screen → redirect to WhatsApp after 900 ms. If saving fails and a WhatsApp number exists, a fallback link sends the message without saving.
**WhatsApp order flow**: `buildWhatsAppMessage(order, storeName)` (Arabic text) → `waLink(settings.whatsapp, text)` → `https://wa.me/<digits>?text=...` (`waNumber()` turns a leading 0 into `phoneCountryCode`). The number comes only from settings.
**Inventory flow**: stock is one integer per product. Admin can edit it inline (products/inventory pages). Buckets: out = 0, low = `1..lowStockThreshold`, ok = above (`stockBucket()` / Firestore range queries). Deduction: when admin sets an order to `confirmed` and `settings.reduceStockOn == 'confirmed'`, `updateOrderStatus()` runs a Firestore transaction that decrements stock once and sets `order.stockReduced = true`; moving to `cancelled` restores it. `never` = manual only.
**Image upload flow**: admin `imageList()` → `uploadImage()` (resize → ImgBB) → URL stored in the doc. **ImageKit delivery flow**: `imgAttrs()/imgTag()` rewrite `https://i.ibb.co/<path>` to `{endpoint}/<path>?tr=w-N,q-70,f-webp` with `srcset`. See `IMAGE_SYSTEM.md`.
**Admin permissions**: admin = signed in + doc at `stores/{storeId}/admins/{uid}` (created by hand in the console; no client can write `admins`). Public can only read active catalog data and *create* shape-validated orders.

## 4. Important config files
- `config/store-config.js` — `STORE_CONFIG` (storeId, currency, phone regex/country code, font, page size, cache minutes, ImageKit endpoint, order statuses) and `DEFAULT_SETTINGS` (the list of admin-editable fields with fallbacks).
- `config/firebase-config.js` — web config. `config/admin-config.js` — ImgBB key (admin pages only).
- `firestore.rules`, `firestore.indexes.json`, `firebase.json`.
**New admin-editable setting** = add to `DEFAULT_SETTINGS` + a field in `assets/js/admin/settings.js` (form and the object passed to `saveSettings`). No other plumbing is needed; `loadSettings()` merges it automatically.

## 5. Conventions (follow these)
- ES modules only; no globals, no frameworks, no new dependencies. Keep first load small; lazy-load anything optional.
- Pages never import the Firebase SDK or call Firestore; add/extend a function in `services/`.
- Anything inserted with `innerHTML` must pass through `esc()` (or be a number/trusted constant). Prefer `textContent` where possible.
- UI strings are Arabic. Use CSS logical properties (`margin-inline-start`, `inset-inline-end`) and the CSS variables in `:root` (never hard-code brand colors). Respect `prefers-reduced-motion`. Touch targets ≥ 44px. `[hidden]` is globally `display:none !important`.
- Money: integers in IQD; format only via `formatPrice()`. Currency comes from `STORE_CONFIG.currency`.
- Errors: log with `console.error` through `reportError(context, err)` and show its **Arabic** message via `notify(msg, 'error')`. Never show raw Firebase errors.
- Feedback: `notify()` toasts (`components/notifications.js`). Destructive admin actions use `confirmDialog()`. Async actions show a loading state and disable their button.
- Queries: always paginate/limit; no real-time listeners; any new query shape that mixes filters/orderBy needs an entry in `firestore.indexes.json`.
- Every new Firestore field written by customers must be allowed in `firestore.rules`; every new collection needs rules (default is deny).
- Cached reads use `cacheGet/cacheSet` with a TTL; admin writes call `cacheClear(name)` (done inside `save()`).

## 6. Where new features go
| Kind | Location |
|---|---|
| New storefront page | `x.html` (copy a shell, add `robots`/manifest links), `assets/js/pages/x.js`, link in `components/header.js` (`LINKS`) and add to `SHELL` in `sw.js` if it should work offline |
| New admin page | `admin/x.html` (copy a shell), `assets/js/admin/x.js` using `startAdmin(title, async ({settings, user, content}) => {...})`, entry in `NAV` in `assets/js/admin/shell.js` |
| New collection | functions in a new `services/x.js` (public reads) and/or `services/admin.js` (admin CRUD via `list/save/remove`), rules + indexes, a section in `FIREBASE_SETUP.md` data model |
| New order field | `prepareOrder()` (`services/orders.js`), `validOrder()` `hasOnly([...])` + type checks in `firestore.rules`, `buildWhatsAppMessage()`, admin `orders.js` card |
| New product field | `buildProductDoc`/`validateProduct` (`services/admin.js`), admin product form (`assets/js/admin/products.js`), display in `pages/product.js`/`product-card.js` |
| Shared UI piece | `components/` |

## 7. Files you should NOT modify unnecessarily
- `services/firebase.js` (SDK version pin, lazy loading, `toObj`), `components/cart.js` (line key + clamping logic), `assets/js/utils.js` helpers (used everywhere), `sw.js` rules for `/admin/` bypass and Firestore pass-through.
- `firestore.rules`: change only deliberately and re-read section 5. Loosening a rule exposes customer data (orders contain names/phones/addresses).
- `config/demo-data.js` is sample data only.

## 8. Testing
`node tests/logic.test.mjs`, `node tests/admin-logic.test.mjs` (pure logic); `python3 tests/e2e.py` (admin + storefront in a browser against `tests/fake-firebase/`, no network; extend its fake if you use a new Firestore API); `python3 tests/pwa.py`. Serve with `python3 -m http.server 8080` (modules need http).
The fake does not enforce rules: test rule changes in the Firebase console Rules Playground or the emulator.

## 9. Feature recipes (what to change)
### A. Delivery fee
1. `config/store-config.js` → `DEFAULT_SETTINGS`: `deliveryFee: 0`, optional `freeDeliveryOver: 0`.
2. `assets/js/admin/settings.js`: number inputs + include in `saveSettings({...})`.
3. `services/orders.js`: add pure `deliveryFeeFor(subtotal, settings)`; make `prepareOrder(items, customer, settings)` store `deliveryFee` and `total = subtotal + deliveryFee`; add a "التوصيل:" line to `buildWhatsAppMessage`.
4. `assets/js/pages/checkout.js` (+ `checkout.html` summary) and `pages/cart-page.js`: show fee row and grand total; pass `s` to `prepareOrder`.
5. `firestore.rules` `validOrder()`: add `'deliveryFee'` to `hasOnly([...])` and `d.deliveryFee is number && d.deliveryFee >= 0`.
6. `assets/js/admin/orders.js`: show the fee. Add a case to `tests/logic.test.mjs`.
(Per-governorate fees: store `deliveryZones:[{name,fee}]` in settings and add a `<select>` to the checkout form + order `customer.zone`.)

### B. Product reviews
1. Data: `stores/{id}/reviews/{rid}` = `{productId, name, rating(1-5), text, approved:false, createdAt}`.
2. Rules: `create` for anyone if keys ⊆ those fields, `approved == false`, rating 1..5, text ≤ 500, `createdAt == request.time`; `read` if `resource.data.approved == true` (query must include `where('approved','==',true)`) or admin; admin update/delete.
3. Index: `reviews` → `productId ASC, approved ASC, createdAt DESC`.
4. New `services/reviews.js` (`listReviews(productId)`, `addReview(...)`); render a section + form in `assets/js/pages/product.js` (escape all text; add a hidden honeypot field against spam).
5. Admin: `admin/reviews.html` + `assets/js/admin/reviews.js` (list pending, approve = `save('reviews', id, {approved:true})`, delete) + `NAV` entry.
6. Only add `aggregateRating` to the Product JSON-LD from approved reviews.

### C. Coupon codes
1. Data: `stores/{id}/coupons/{CODE}` (doc id = uppercase code) = `{type:'percent'|'fixed', value, active, minSubtotal, expiresAt}`.
2. Rules: public `get` only (no `list`) when `resource.data.active == true`; admin full access.
3. `services/coupons.js`: `getCoupon(code)` + pure `applyCoupon(subtotal, coupon)` (check active/expiry/min).
4. Checkout: code input + "تطبيق" button, show discount row; `prepareOrder` stores `coupon:{code,discount}` and `total = subtotal - discount (+ fee)`; add keys to `validOrder()`; add a line to the WhatsApp message and admin order card.
5. Admin: `admin/coupons.html` + `assets/js/admin/coupons.js` (CRUD with `save('coupons', CODE, data)`) + `NAV`.
6. **Caveat to tell the owner**: totals are computed in the browser, so a determined customer could tamper with a discount; the owner verifies totals when reviewing orders. Real enforcement (usage limits, server-side totals) needs a Cloud Function (Blaze plan) — out of scope for this template.

## 10. Known limitations (don't "fix" by accident)
Per-product (not per-variant) stock; browser-computed order totals; JS-set meta tags; prefix/keyword search; 10-minute client cache of settings/categories/banners; ImgBB key is semi-public; offline mode covers the static shell only (products need a connection).
