// ============================================================
// STATE — murni di memori JavaScript (variabel biasa).
// Hilang total begitu tab di-refresh/ditutup. Setiap halaman yang
// butuh data selalu fetch ulang ke server saat dibuka — TIDAK ada
// mirror database di browser seperti versi lama (tirtaFullData).
// ============================================================
const state = {
  produk: null,
  pelanggan: null,
  settings: null,
  cart: [], // keranjang kasir aktif — wajar disimpan di memori selama sesi kasir berjalan
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach((fn) => fn(state)); }

export function getState() { return state; }
export function setState(patch) { Object.assign(state, patch); notify(); }

export function resetState() {
  state.produk = null; state.pelanggan = null; state.settings = null; state.cart = [];
  notify();
}
