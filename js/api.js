// ============================================================
// API CLIENT
// Menggantikan pola JSONP (<script src=...&callback=...>) lama.
// Sekarang murni fetch() POST dengan body JSON — tidak ada lagi
// eksekusi <script> dari respons server (lebih aman), dan tidak
// ada limit panjang URL (aman untuk payload besar seperti foto).
// ============================================================
import { getGasUrl } from './config.js';
import { getToken, clearSession } from './session.js';

export class ApiError extends Error {
  constructor(message, code) { super(message); this.code = code || 'ERROR'; }
}

const TIMEOUT_MS = 20000;

/**
 * Panggil fungsi backend. `requireAuth=false` hanya dipakai untuk login.
 */
export async function api(fn, args = [], { requireAuth = true, retries = 1 } = {}) {
  const token = requireAuth ? getToken() : '';
  if (requireAuth && !token) {
    clearSession();
    location.hash = '#/login';
    throw new ApiError('Sesi berakhir, silakan login ulang', 'NO_TOKEN');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(getGasUrl(), {
      method: 'POST',
      // text/plain sengaja dipakai (bukan application/json) supaya browser
      // tidak mengirim CORS preflight (OPTIONS) — Apps Script Web App tidak
      // bisa menjawab preflight, jadi ini teknik standar yang tetap dipakai.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn, token, args }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) throw new ApiError('Server merespons HTTP ' + resp.status, 'HTTP_ERROR');
    let json;
    try { json = await resp.json(); }
    catch (parseErr) {
      throw new ApiError('Alamat server salah atau belum ter-deploy dengan benar (respons bukan JSON). Cek URL backend di halaman Login / Pengaturan.', 'BAD_RESPONSE');
    }
    if (!json.ok) {
      if (['NO_TOKEN', 'INVALID_TOKEN', 'SESSION_EXPIRED'].includes(json.code)) {
        clearSession();
        try { sessionStorage.setItem('tirta_last_auth_error', JSON.stringify({ fn, code: json.code, message: json.error, at: new Date().toISOString() })); } catch (e) {}
        location.hash = '#/login';
      }
      throw new ApiError(json.error || 'Terjadi kesalahan', json.code);
    }
    return json.data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError' && retries > 0) {
      return api(fn, args, { requireAuth, retries: retries - 1 });
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError('Tidak bisa menghubungi server. Cek koneksi internet.', 'NETWORK_ERROR');
  }
}
