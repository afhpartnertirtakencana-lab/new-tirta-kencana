// ============================================================
// KONFIGURASI
// GAS_URL adalah URL Web App backend (Tahap 1). Ini alamat teknis
// aplikasi, BUKAN data bisnis — beda dengan localStorage 'tirtaFullData'
// di versi lama yang menyimpan seluruh database. Disimpan di localStorage
// hanya supaya admin tidak perlu ketik ulang URL setiap buka browser baru,
// boleh dikosongkan/direset kapan saja dari menu Pengaturan.
// ============================================================
export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbwWooKDfJlXHln9cEw2IMGQLTyGafsK9jrxE86tRIjwqbUdEi8UgceAfH0FB2wV_bIg/exec';

export function getGasUrl() {
  return localStorage.getItem('tirta_gas_url') || DEFAULT_GAS_URL;
}
export function setGasUrl(url) {
  localStorage.setItem('tirta_gas_url', url);
}
