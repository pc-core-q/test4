/** Admin image upload: shrink in browser -> ImgBB. Store the returned URL; ImageKit serves it optimized. */
import { ADMIN_CONFIG } from '../config/admin-config.js';

async function shrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, ADMIN_CONFIG.maxImageSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/webp', ADMIN_CONFIG.imageQuality));
  } catch { return file; }
}

export async function uploadImage(file) {
  if (!ADMIN_CONFIG.imgbbApiKey) throw Object.assign(new Error('missing ImgBB key'), { code: 'app/no-imgbb-key' });
  if (!file.type.startsWith('image/')) throw Object.assign(new Error('not an image'), { code: 'app/bad-file' });
  if (file.size > 20 * 1024 * 1024) throw Object.assign(new Error('too large'), { code: 'app/too-large' });
  const fd = new FormData();
  fd.append('image', await shrink(file), 'image.webp');
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(ADMIN_CONFIG.imgbbApiKey)}`, { method: 'POST', body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) throw new Error(j?.error?.message || `ImgBB HTTP ${res.status}`);
  return j.data.url;
}
export function uploadMessage(err) {
  console.error('[upload]', err);
  if (err?.code === 'app/no-imgbb-key') return 'مفتاح ImgBB غير مضبوط في config/admin-config.js';
  if (err?.code === 'app/bad-file') return 'الملف المختار ليس صورة.';
  if (err?.code === 'app/too-large') return 'حجم الصورة كبير جداً (الحد 20 ميغابايت).';
  return 'فشل رفع الصورة. تحقق من الاتصال وحاول مرة أخرى.';
}
