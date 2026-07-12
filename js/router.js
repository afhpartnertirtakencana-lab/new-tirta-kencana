// ============================================================
// ROUTER — hash based (#/dashboard, #/kasir, dst), tanpa dependency.
// ============================================================
import { isLoggedIn, currentRole } from './session.js';
import { toast } from './utils.js';

const routes = {}; // path -> { render(container), roles?: string[] }
let mainEl = null;
let navEl = null;

export function registerRoute(path, def) { routes[path] = def; }
export function initRouter(main, nav) {
  mainEl = main; navEl = nav;
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}

export async function renderRoute() {
  let path = location.hash.replace('#', '') || '/dashboard';
  const loggedIn = isLoggedIn();

  if (!loggedIn && path !== '/login') { location.hash = '#/login'; return; }
  if (loggedIn && path === '/login') { location.hash = '#/dashboard'; return; }

  const def = routes[path] || routes['/404'];
  if (def.roles && !def.roles.includes(currentRole())) {
    toast('Anda tidak punya akses ke halaman ini', 'error');
    location.hash = '#/dashboard';
    return;
  }

  document.querySelectorAll('.app-nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + path));
  document.body.classList.toggle('is-login', path === '/login');

  mainEl.innerHTML = '<div class="grid-cards"><div class="skeleton skeleton-card"></div></div>';
  try { await def.render(mainEl); }
  catch (err) { mainEl.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${err.message || 'Gagal memuat halaman'}</p></div>`; }
}

export function go(path) { location.hash = '#' + path; }
