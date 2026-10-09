const s = (d, extra = '') => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICONS = {
  menu: s('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  cart: s('<path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>'),
  chat: s('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>')
};
