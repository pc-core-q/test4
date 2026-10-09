# Turning the template into a new store

1. **Firebase project** — follow `FIREBASE_SETUP.md`; paste the web config into `config/firebase-config.js`.
2. **Store config** — in `config/store-config.js` set `storeId`; change `currency`/`phoneRegex`/`phoneCountryCode` only if the country differs from Iraq.
3. **Theme** — Admin → Settings → Appearance (primary, secondary, accent, background, text, button shape). Contrast of text on primary/accent is computed automatically. Font: `fontFamily` in `store-config.js` (and the Google Fonts `<link>` in the HTML heads).
4. **WhatsApp** — Admin → Settings → Contact → WhatsApp number (local `07…` or international). It is never hard-coded.
5. **Social links** — Settings → Social. Only filled links appear in the footer.
6. **Logo & favicon** — Settings → Identity → upload both. Also replace `assets/icons/icon-*.png` and `manifest.json` (`name`, `short_name`, `theme_color`) for the installable app.
7. **Categories** — Admin → Categories (any list; nothing is hard-coded).
8. **Products** — Admin → Products. Use "Options" for variants (e.g. `المقاس: S, M, L`), "Specs" for technical details.
9. **ImageKit** — `IMAGE_SYSTEM.md`; set `imageKit.urlEndpoint`.
10. **Deploy** — `DEPLOYMENT.md`.
Delete `config/demo-data.js` if you want no sample data in the repo (demo mode then simply isn't available).

## Store types
- **Clothing**: categories like shirts/pants/shoes; options `المقاس` and `اللون`; show stock per product (stock is per product, not per size — see "Limitations").
- **Cosmetics**: categories makeup/skincare/haircare; options optional (`الدرجة`/`الحجم`); put ingredients/usage in the description; brand field is useful.
- **Electronics**: categories phones/accessories/laptops; no options, use Specs (`المعالج: …`, `الذاكرة: …`); SKU + brand; warranty text in the description.
- **General store**: only name/price/stock/images are needed; every other field is optional.

## Limitations to know before selling to clients
- Stock is one number per product, not per size/color combination.
- Order prices come from the customer's browser; the shop owner must verify totals when reviewing an order (rules cannot cheaply cross-check each item).
- Meta tags/JSON-LD are set by JavaScript: fine for Google, not for link-preview bots (WhatsApp/Facebook). A prerender step would fix that.
- Search matches the start of the name, whole keywords/tags, or category names — not arbitrary substrings.
- Caching: storefront caches settings/categories/banners for ~10 minutes in each visitor's browser, so admin edits may take that long to appear.
