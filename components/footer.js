import { esc, safeUrl, waLink } from '../assets/js/utils.js';
import { ICONS } from './icons.js';

const SOCIALS = [['instagram', 'إنستغرام'], ['facebook', 'فيسبوك'], ['tiktok', 'تيك توك'], ['telegram', 'تليجرام']];

export function renderFooter(el, s) {
  const social = [
    ...SOCIALS.map(([k, label]) => [label, safeUrl(s.social?.[k])]),
    ...(s.social?.other || []).map(o => [o.label || 'رابط', safeUrl(o.url)])
  ].filter(([, url]) => url);
  el.innerHTML = `<div class="container foot">
    <div><strong class="foot-name">${esc(s.storeName)}</strong>${s.storeDescription ? `<p>${esc(s.storeDescription)}</p>` : ''}</div>
    <div><h2>تواصل معنا</h2><ul>
      ${s.phone ? `<li><a href="tel:${esc(s.phone)}" dir="ltr">${esc(s.phone)}</a></li>` : ''}
      ${s.email ? `<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>` : ''}
      ${s.address ? `<li>${esc(s.address)}</li>` : ''}
    </ul></div>
    ${social.length ? `<div><h2>تابعنا</h2><ul>${social.map(([l, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a></li>`).join('')}</ul></div>` : ''}
  </div>
  <p class="copy container">© ${new Date().getFullYear()} ${esc(s.storeName)}</p>
  ${s.whatsapp ? `<a class="wa" href="${esc(waLink(s.whatsapp))}" target="_blank" rel="noopener noreferrer" aria-label="تواصل عبر واتساب">${ICONS.chat}<span>واتساب</span></a>` : ''}`;
}
