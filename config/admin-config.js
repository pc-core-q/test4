/**
 * Admin-only configuration. Loaded ONLY by admin pages, never by the storefront.
 * WARNING: anything in a static site is downloadable. The ImgBB key below can be read by anyone who finds this
 * file, so use a dedicated ImgBB account for the store and never reuse the key elsewhere.
 * (Safer upgrade later: a tiny serverless upload proxy that holds the key.)
 */
export const ADMIN_CONFIG = {
  imgbbApiKey: '',
  maxImageSide: 1600,    // images are shrunk in the browser before upload (faster on mobile data)
  imageQuality: 0.85
};
