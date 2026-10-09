# قالب المتجر الإلكتروني — Phases 1 + 2 (Storefront + Admin + Docs + PWA)

Vanilla HTML/CSS/JS + Firebase (Auth + Firestore). No build step, no framework.

## Run it now (demo mode)
`firebase-config.js` is empty, so the storefront runs on sample data (`config/demo-data.js`); nothing is saved.
```
python3 -m http.server 8080      # then open http://localhost:8080
```
ES modules need http(s); opening the files with `file://` will not work.

## Connect a real store
1. Create a Firebase project, enable **Firestore** (and Authentication → Email/Password for phase 2).
2. Paste the web config into `config/firebase-config.js`. These values are public identifiers, not secrets.
3. Set `storeId` in `config/store-config.js` (any slug, e.g. `shop-ali`).
4. Publish `firestore.rules` and `firestore.indexes.json` (Firebase console, or `firebase deploy --only firestore`).
5. Create `stores/{storeId}/admins/{adminUid}` (any field) for the admin's Auth uid — used by the phase 2 panel.
6. Firebase console → Authentication → enable **Email/Password** → add the admin user → copy their **UID**.
7. Firestore → create `stores/{storeId}/admins/{UID}` (any field, e.g. `role: "admin"`). Only listed UIDs are admins.
8. Open `/admin/`, sign in, then: Settings (store name, WhatsApp, logo, theme) → Categories → Products → Banners.
9. Images: create an ImgBB account, put its API key in `config/admin-config.js` (read the warning there). Optional: set `imageKit.urlEndpoint` in `config/store-config.js`
   (ImageKit → add an origin of type *Web server* with base URL `https://i.ibb.co`) to serve resized WebP.

## Admin panel (phase 2) — /admin/
Login (Firebase Auth + admins list), dashboard counts, products (add/edit/delete, search/filter, inline stock, featured, options/specs, multi-image upload),
inventory (available / low / out, inline stock edit), orders (status changes, search, load more), categories, banners (order, enable, image),
store settings (identity, contact, social, theme, logo/favicon, stock threshold, stock-deduction mode, home sections, SEO).
Stock is deducted once when an order becomes **confirmed** (setting: confirmed | never) and restored if that order is cancelled.

## What is in phase 1
Home, shop (category filter, search, "load more"), product page, cart (localStorage), guest checkout with stock/price re-check,
order saved to Firestore, Arabic WhatsApp message, Firestore rules, lazy Firebase loading, TTL caching, SEO meta + Product JSON-LD.

## Tests
- `node tests/logic.test.mjs` and `node tests/admin-logic.test.mjs` — pure logic.
- `python3 tests/pwa.py` — manifest + service worker + offline shell.
- `python3 tests/e2e.py` — browser test of admin + storefront against a fake in-memory Firebase (`tests/fake-firebase/`). Needs `playwright` + Chromium.
  It does NOT test the real Firebase rules; deploy `firestore.rules` and try the flows once against a real project.

## Docs (read in this order)
`docs/PROJECT_STRUCTURE.md` → `docs/FIREBASE_SETUP.md` → `docs/CUSTOMIZATION.md` → `docs/IMAGE_SYSTEM.md` → `docs/DEPLOYMENT.md`.
Give `docs/AI_DEVELOPER_GUIDE.md` to an AI assistant with any feature request (delivery fee, reviews, coupons recipes included).

## PWA
`manifest.json` + `sw.js` (network-first static shell, offline reload of cached pages, never touches `/admin/` or Firestore). Edit the manifest name/colors/icons per client.

## Known limits (documented, to be addressed later)
- Order prices are sent by the browser; the admin must verify them when reviewing (rules cannot cross-check per-item prices cheaply).
- Product/meta tags are set by JS (fine for Google, not for link-preview scrapers). A prerender step can be added later.
- Prefix search matches name start / keywords / category name, not arbitrary substrings.
