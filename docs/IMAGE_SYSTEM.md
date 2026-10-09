# Image System

```
Admin picks file ─> browser shrinks (max 1600px, WebP 0.85) ─> ImgBB upload ─> original URL stored in Firestore
                                                                                        │
Storefront ─> services/images.js builds an ImageKit URL (resize + WebP) ─> ImageKit fetches from ImgBB once, then serves from its CDN
```
If ImageKit is not configured, the original ImgBB URL is used unchanged (works, just heavier).

## ImgBB
- Create an account at imgbb.com → API → get a key. Use a **dedicated account** for the store.
- Put it in `config/admin-config.js` (`imgbbApiKey`). Only admin pages import this file, but it is still a public static file — treat the key as semi-public (worst case: someone uploads to your ImgBB account). Upgrade path: a small serverless function that holds the key and proxies uploads.
- Upload code: `services/uploads.js` (`uploadImage(file)`), UI: `imageList()` in `assets/js/admin/ui.js`. Uploaded images have no expiry.
- The URL saved in Firestore looks like `https://i.ibb.co/<id>/image.webp`.

## ImageKit (delivery + optimization)
1. Create an ImageKit account → copy the **URL endpoint** (`https://ik.imagekit.io/<your_id>`).
2. Dashboard → External storage / Origins → add an origin of type **Web server** with base URL `https://i.ibb.co` (labels in the dashboard may differ slightly; the goal is that `endpoint/<path>` maps to `https://i.ibb.co/<path>`).
3. Set in `config/store-config.js`:
   ```js
   imageKit: { urlEndpoint: 'https://ik.imagekit.io/<your_id>', originBase: 'https://i.ibb.co/' }
   ```
4. Check it: take a stored URL `https://i.ibb.co/abc/image.webp` and open `https://ik.imagekit.io/<your_id>/abc/image.webp?tr=w-480,q-70,f-webp`. It should load a smaller WebP.

Generated URL format (`ikUrl` in `services/images.js`): `{endpoint}/{path-after-originBase}?tr=w-{width},q-70,f-webp`.
Only the endpoint is used. **Never** put the ImageKit private key in this project.

## Responsive images & thumbnails
`imgAttrs/imgTag` output `src`, `srcset` (several widths) and `sizes`, plus `width`/`height` (prevents layout shift), `decoding="async"` and `loading="lazy"`. The first hero banner and the main product image use `fetchpriority="high"` instead of lazy.
Widths used: cards 240/360/480, product 480/720/1080, hero 480–1440, cart 84/168, admin thumbnails 96–176.
Change widths in the call sites (`product-card.js`, `product.js`, `home.js`), not in the service.

## Verifying WebP
Network tab → an image request to `ik.imagekit.io` → response `content-type: image/webp`.
