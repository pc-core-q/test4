let box;
/** Lightweight accessible toast. type: info | success | error */
export function notify(message, type = 'info', ms = 3200) {
  if (!box) {
    box = document.createElement('div');
    box.className = 'toasts';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.append(box);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  box.append(t);
  setTimeout(() => t.remove(), ms);
}
