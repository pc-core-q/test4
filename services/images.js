/**
 * Image delivery. Originals live on ImgBB; ImageKit (with ImgBB as origin) serves resized WebP.
 * If ImageKit isn't configured the original URL is used as-is, so nothing breaks.
 */
import { STORE_CONFIG } from '../config/store-config.js';
import { esc } from '../assets/js/utils.js';

const { urlEndpoint, originBase } = STORE_CONFIG.imageKit;
export const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><rect width="4" height="5" fill="#e3e6ea"/></svg>');

const viaImageKit = src => Boolean(urlEndpoint) && typeof src === 'string' && src.startsWith(originBase);
export function ikUrl(src, w, q = 70) {
  if (!src) return PLACEHOLDER;
  if (!viaImageKit(src)) return src;
  return `${urlEndpoint.replace(/\/$/, '')}/${src.slice(originBase.length)}?tr=w-${w},q-${q},f-webp`;
}

/** -> { src, srcset?, sizes? } */
export function imgAttrs(src, { widths = [320, 480, 720], sizes = '100vw', q = 70 } = {}) {
  if (!src) return { src: PLACEHOLDER };
  if (!viaImageKit(src)) return { src };
  return {
    src: ikUrl(src, widths[Math.min(1, widths.length - 1)], q),
    srcset: widths.map(w => `${ikUrl(src, w, q)} ${w}w`).join(', '),
    sizes
  };
}

export function imgTag(src, { alt = '', widths, sizes, eager = false, width, height, cls = '' } = {}) {
  const a = imgAttrs(src, { widths, sizes });
  return `<img src="${esc(a.src)}"${a.srcset ? ` srcset="${esc(a.srcset)}" sizes="${esc(a.sizes)}"` : ''} alt="${esc(alt)}"` +
    `${width ? ` width="${width}" height="${height}"` : ''} decoding="async" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}${cls ? ` class="${cls}"` : ''}>`;
}
