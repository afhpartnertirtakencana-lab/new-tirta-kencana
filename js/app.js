// ============================================================
// APP ENTRY
// ============================================================
import { registerRoute, initRouter } from './router.js';
import { isLoggedIn, currentName, currentRole } from './session.js';
import * as Login from './pages/login.js';
import * as Dashboard from './pages/dashboard.js';
import * as Kasir from './pages/kasir.js';
import * as Riwayat from './pages/riwayat.js';
import * as Produk from './pages/produk.js';
import * as Pelanggan from './pages/pelanggan.js';
import * as Pengaturan from './pages/pengaturan.js';
import * as Setoran from './pages/setoran.js';
import * as RekapSetoran from './pages/rekapsetoran.js';
import * as Rekap from './pages/rekap.js';
import * as Grafik from './pages/grafik.js';
import * as Piutang from './pages/piutang.js';
import * as InputBarang from './pages/inputbarang.js';
import * as RekapInput from './pages/rekapinput.js';
import * as StockBarang from './pages/stockbarang.js';

const SPREADSHEET_ID = '12q8SwBtoww9Y9c6EZ46-SNa1q5TKIXnf9g_3wLbsNK4';

// Menu per role — persis mengikuti struktur aplikasi lama.
const NAV_BY_ROLE = {
  admin: [
    { path: '/dashboard', label: 'Beranda', icon: '🏠' },
    { path: '/kasir', label: 'Jual', icon: '🧾' },
    { path: '/riwayat', label: 'Transaksi', icon: '📜' },
    { path: '/rekap', label: 'Rekap Jual', icon: '📊' },
    { path: '/piutang', label: 'Piutang', icon: '💳' },
    { path: '/setoran', label: 'Setoran', icon: '💰' },
    { path: '/rekapsetoran', label: 'Rekap Setor', icon: '🧮' },
    { path: '/grafik', label: 'Grafik', icon: '📈' },
    { path: '/produk', label: 'Produk', icon: '📦' },
    { path: '/pelanggan', label: 'Pelanggan', icon: '👥' },
    { path: '/inputbarang', label: 'Input Brg', icon: '🚚' },
    { path: '/rekapinput', label: 'Rekap Input', icon: '📋' },
    { path: '/stockbarang', label: 'Stock', icon: '🏬' },
    { path: '/pengaturan', label: 'Atur', icon: '⚙️' },
    { external: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`, label: 'Sheets', icon: '🗂️' },
  ],
  sales: [
    { path: '/dashboard', label: 'Beranda', icon: '🏠' },
    { path: '/kasir', label: 'Jual', icon: '🧾' },
    { path: '/riwayat', label: 'Transaksi', icon: '📜' },
    { path: '/rekap', label: 'Rekap Jual', icon: '📊' },
    { path: '/piutang', label: 'Piutang', icon: '💳' },
    { path: '/setoran', label: 'Setoran', icon: '💰' },
    { path: '/rekapsetoran', label: 'Rekap Setor', icon: '🧮' },
    { path: '/pelanggan', label: 'Pelanggan', icon: '👥' },
    { path: '/pengaturan', label: 'Atur', icon: '⚙️' },
  ],
  driver: [
    { path: '/dashboard', label: 'Beranda', icon: '🏠' },
    { path: '/inputbarang', label: 'Input Brg', icon: '🚚' },
    { path: '/rekapinput', label: 'Rekap Input', icon: '📋' },
    { path: '/stockbarang', label: 'Stock', icon: '🏬' },
    { path: '/pengaturan', label: 'Atur', icon: '⚙️' },
  ],
};

function navItemsForRole() {
  return NAV_BY_ROLE[currentRole()] || NAV_BY_ROLE.sales;
}

function buildShell() {
  document.getElementById('app').innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="brand">Tirta <span class="gold">Kencana</span></div>
        <div class="user-chip" id="userChip"></div>
      </header>
      <div class="app-body">
        <nav class="app-nav" id="appNav"></nav>
        <main class="app-main" id="appMain"></main>
      </div>
    </div>`;
}

function renderNav() {
  const nav = document.getElementById('appNav');
  if (!isLoggedIn()) { nav.innerHTML = ''; nav.classList.add('hidden'); return; }
  nav.classList.remove('hidden');
  nav.innerHTML = navItemsForRole().map((n) => n.external
    ? `<a href="${n.external}" target="_blank" rel="noopener"><span class="icon">${n.icon}</span><span>${n.label}</span></a>`
    : `<a href="#${n.path}"><span class="icon">${n.icon}</span><span>${n.label}</span></a>`
  ).join('');
  const current = '#' + (location.hash.replace('#', '') || '/dashboard');
  nav.querySelectorAll('a[href^="#"]').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === current));
}

function updateUserChip() {
  const chip = document.getElementById('userChip');
  if (!chip) return;
  if (isLoggedIn()) chip.innerHTML = `<span class="avatar">${(currentName() || '?')[0].toUpperCase()}</span><span>${currentName()}</span>`;
  else chip.innerHTML = '';
  renderNav();
}

function registerRoutes() {
  registerRoute('/login', { render: (el) => Login.render(el) });
  registerRoute('/dashboard', { render: (el) => Dashboard.render(el) });
  registerRoute('/kasir', { render: (el) => Kasir.render(el), roles: ['admin', 'sales'] });
  registerRoute('/riwayat', { render: (el) => Riwayat.render(el), roles: ['admin', 'sales'] });
  registerRoute('/rekap', { render: (el) => Rekap.render(el), roles: ['admin', 'sales'] });
  registerRoute('/piutang', { render: (el) => Piutang.render(el), roles: ['admin', 'sales'] });
  registerRoute('/setoran', { render: (el) => Setoran.render(el), roles: ['admin', 'sales'] });
  registerRoute('/rekapsetoran', { render: (el) => RekapSetoran.render(el), roles: ['admin', 'sales'] });
  registerRoute('/grafik', { render: (el) => Grafik.render(el), roles: ['admin'] });
  registerRoute('/produk', { render: (el) => Produk.render(el), roles: ['admin'] });
  registerRoute('/pelanggan', { render: (el) => Pelanggan.render(el), roles: ['admin', 'sales'] });
  registerRoute('/inputbarang', { render: (el) => InputBarang.render(el), roles: ['admin', 'driver'] });
  registerRoute('/rekapinput', { render: (el) => RekapInput.render(el), roles: ['admin', 'driver'] });
  registerRoute('/stockbarang', { render: (el) => StockBarang.render(el), roles: ['admin', 'driver'] });
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
