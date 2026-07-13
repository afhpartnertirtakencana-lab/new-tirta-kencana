// ============================================================
// SERVICE WORKER
// Tujuannya HANYA supaya app shell (HTML/CSS/JS/font/ikon) tetap
// bisa dibuka cepat & terasa seperti app native. Ini TIDAK sama
// dengan menyimpan DATA di browser: tidak ada satupun respons dari
// backend (produk, transaksi, pelanggan, dsb) yang disentuh di sini.
// Setiap request ke domain backend (script.google.com) SENGAJA
// dilewati (network only) supaya data selalu fresh dari server.
// ============================================================
const CACHE_NAME = 'tirta-shell-v2';
const SHELL_FILES = [
  './index.html', './manifest.json',
  './css/tokens.css', './css/layout.css', './css/components.css',
  './js/app.js', './js/api.js', './js/config.js', './js/router.js',
  './js/session.js', './js/state.js', './js/utils.js',
  './js/pages/login.js', './js/pages/dashboard.js', './js/pages/kasir.js',
  './js/pages/riwayat.js', './js/pages/produk.js', './js/pages/pelanggan.js',
  './js/pages/pengaturan.js', './js/pages/setoran.js', './js/pages/rekapsetoran.js',
  './js/pages/rekap.js', './js/pages/grafik.js', './js/pages/piutang.js',
  './js/pages/inputbarang.js', './js/pages/rekapinput.js', './js/pages/stockbarang.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // JANGAN PERNAH cache permintaan ke backend/API — selalu ambil dari jaringan.
  if (url.hostname.includes('script.google.com') || event.request.method !== 'GET') {
    return; // biarkan browser menangani seperti biasa (network only)
  }

  // App shell: cache-first, lalu perbarui cache di latar belakang.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((resp) => {
        if (resp && resp.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resp.clone()));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
