# Deployment

The site is static files. There is no build step: upload the folder as-is.

## Pre-flight checklist
- [ ] `config/firebase-config.js` filled; `storeId` set
- [ ] `firestore.rules` and `firestore.indexes.json` published (indexes show "Enabled", not "Building")
- [ ] Admin user created and `stores/{storeId}/admins/{uid}` exists
- [ ] Production domain added to Firebase Auth → Authorized domains
- [ ] Settings saved once in the admin (store name, WhatsApp, logo)
- [ ] `config/admin-config.js` contains only the dedicated ImgBB key; no private keys anywhere
- [ ] `manifest.json` name/theme and `assets/icons/*` match the brand
- [ ] Place a test order and confirm the WhatsApp message + the Firestore order

## Option 1 — Firebase Hosting (recommended)
```
npm i -g firebase-tools && firebase login
firebase init hosting      # choose the existing project; public dir = .   ; do NOT overwrite firebase.json
firebase deploy            # hosting + firestore rules/indexes (see firebase.json)
```
`firebase.json` already sets cache headers (HTML/JS/CSS revalidate, images cached 30 days, `/sw.js` never cached) and ignores `docs/`, `tests/`, `README.md`.
Connect a custom domain in Hosting → Add custom domain.

## Option 2 — Netlify / Cloudflare Pages / any static host
Upload the folder (publish directory = repo root, no build command). Add the same cache rules if the host supports headers; make sure `/sw.js` is served with `Cache-Control: no-cache`.
Remember to add the domain to Firebase Auth → Authorized domains.

## After go-live
- **Sitemap**: products live in Firestore, so generate `sitemap.xml` from your product IDs (`https://domain/product.html?id=<id>`) with any small script or spreadsheet, upload it, and add the `Sitemap:` line to `robots.txt`. Submit it in Google Search Console.
- **Updating code**: redeploy; users get new files on next load (network-first service worker). If you change cached shell assets in a breaking way, bump `VERSION` in `sw.js`.
- **Rules/index changes**: `firebase deploy --only firestore`.
- **Admin protection**: `/admin/` is protected by Firebase Auth + rules, not by hiding the URL. It is `noindex` and excluded from the service worker.
- **Backups**: managed Firestore exports require the Blaze plan. On the free Spark plan there are no automatic backups, so consider upgrading for production stores.
- **Quotas (Spark plan)**: ~50k reads/day. The storefront caches settings/categories/banners and paginates products to stay well below this for small shops.
