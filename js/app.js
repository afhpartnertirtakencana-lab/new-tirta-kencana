// ============================================================
// APP ENTRY
// ============================================================
import { registerRoute, initRouter } from './router.js';
import { isLoggedIn, currentName } from './session.js';
import * as Login from './pages/login.js';
import * as Dashboard from './pages/dashboard.js';
import * as Kasir from './pages/kasir.js';
import * as Riwayat from './pages/riwayat.js';
import * as Produk from './pages/produk.js';
import * as Pelanggan from './pages/pelanggan.js';
import * as Pengaturan from './pages/pengaturan.js';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Beranda', icon: '🏠' },
  { path: '/kasir', label: 'Kasir', icon: '🧾' },
  { path: '/riwayat', label: 'Riwayat', icon: '📜' },
  { path: '/produk', label: 'Produk', icon: '📦' },
  { path: '/pelanggan', label: 'Pelanggan', icon: '👥' },
  { path: '/pengaturan', label: 'Atur', icon: '⚙️' },
];

function buildShell() {
  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="brand">Tirta <span class="gold">Kencana</span></div>
        <div class="user-chip" id="userChip"></div>
      </header>
      <div class="app-body">
        <nav class="app-nav" id="appNav">
          ${NAV_ITEMS.map((n) => `<a href="#${n.path}"><span class="icon">${n.icon}</span><span>${n.label}</span></a>`).join('')}
        </nav>
        <main class="app-main" id="appMain"></main>
      </div>
    </div>
    <div id="loginRoot"></div>`;
}

function updateUserChip() {
  const chip = document.getElementById('userChip');
  const nav = document.getElementById('appNav');
  if (!chip) return;
  if (isLoggedIn()) {
    chip.innerHTML = `<span class="avatar">${(currentName() || '?')[0].toUpperCase()}</span><span>${currentName()}</span>`;
    nav.classList.remove('hidden');
  } else {
    chip.innerHTML = '';
    nav.classList.add('hidden');
  }
}

function registerRoutes() {
  registerRoute('/login', { render: (el) => Login.render(el) });
  registerRoute('/dashboard', { render: (el) => Dashboard.render(el) });
  registerRoute('/kasir', { render: (el) => Kasir.render(el), roles: ['admin', 'sales'] });
  registerRoute('/riwayat', { render: (el) => Riwayat.render(el) });
  registerRoute('/produk', { render: (el) => Produk.render(el), roles: ['admin', 'sales'] });
  registerRoute('/pelanggan', { render: (el) => Pelanggan.render(el), roles: ['admin', 'sales'] });
  registerRoute('/pengaturan', { render: (el) => Pengaturan.render(el) });
  registerRoute('/404', { render: (el) => { el.innerHTML = '<div class="empty-state"><p>Halaman tidak ditemukan</p></div>'; } });
}

function boot() {
  buildShell();
  registerRoutes();
  updateUserChip();
  window.addEventListener('hashchange', updateUserChip);
  initRouter(document.getElementById('appMain'), document.getElementById('appNav'));
}

boot();
