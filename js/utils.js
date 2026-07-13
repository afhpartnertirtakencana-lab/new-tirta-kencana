// ============================================================
// UTILITAS
// ============================================================
export function formatRp(n) {
  n = Number(n) || 0;
  return 'Rp' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function todayISO() {
  const d = new Date();
  const tz = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return tz.toISOString().substring(0, 10);
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

export function uid(prefix = 'ID') {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- Toast ----
let toastStack = null;
export function toast(message, type = 'info') {
  if (!toastStack) {
    toastStack = document.createElement('div');
    toastStack.className = 'toast-stack';
    document.body.appendChild(toastStack);
  }
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = message;
  toastStack.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---- Modal sederhana ----
export function openModal({ title, bodyHtml, onMount }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" aria-label="Tutup">&times;</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  if (onMount) onMount(overlay, close);
  return { close, el: overlay };
}

// ---- Skeleton loading helper ----
export function skeletonLines(n = 3) {
  return Array.from({ length: n }).map(() => `<div class="skeleton skeleton-line"></div>`).join('');
}
export function skeletonCards(n = 3) {
  return `<div class="grid-cards">` + Array.from({ length: n }).map(() => `<div class="skeleton skeleton-card"></div>`).join('') + `</div>`;
}
