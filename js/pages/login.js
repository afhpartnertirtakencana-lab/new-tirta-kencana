// ============================================================
// LOGIN — kredensial dicek di server (Tahap 1). Tidak ada daftar
// user/password apapun tersimpan atau terlihat di kode frontend.
// ============================================================
import { api, ApiError } from '../api.js';
import { setSession } from '../session.js';
import { toast, escapeHtml } from '../utils.js';
import { go } from '../router.js';
import { getGasUrl, setGasUrl } from '../config.js';

export function render(container) {
  container.innerHTML = `
    <div class="center-screen">
      <form class="card" id="loginForm" style="max-width:360px;width:100%">
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:1.6rem;font-weight:800">Tirta <span style="color:var(--color-gold)">Kencana</span></div>
          <div style="font-size:var(--fs-xs);color:var(--color-text-muted)">Masuk untuk melanjutkan</div>
        </div>
        <div class="field">
          <label for="loginName">Nama</label>
          <input id="loginName" name="name" autocomplete="username" required autocapitalize="none" />
        </div>
        <div class="field">
          <label for="loginPass">Password</label>
          <input id="loginPass" name="password" type="password" autocomplete="current-password" required />
        </div>
        <button class="btn btn-primary btn-block" type="submit" id="loginBtn">Masuk</button>
        <button type="button" class="btn btn-ghost btn-sm btn-block" id="toggleServerCfg" style="margin-top:10px">⚙️ Atur alamat server</button>
        <div class="field hidden" id="serverCfgBox" style="margin-top:10px">
          <label for="gasUrlField">URL Backend (Apps Script /exec)</label>
          <input id="gasUrlField" value="${escapeHtml(getGasUrl())}" placeholder="https://script.google.com/macros/s/XXXX/exec">
          <button type="button" class="btn btn-ghost btn-sm" id="saveGasUrl" style="margin-top:8px">Simpan Alamat Server</button>
        </div>
      </form>
    </div>`;

  container.querySelector('#toggleServerCfg').addEventListener('click', () => {
    container.querySelector('#serverCfgBox').classList.toggle('hidden');
  });
  container.querySelector('#saveGasUrl').addEventListener('click', () => {
    const url = container.querySelector('#gasUrlField').value.trim();
    if (!url.startsWith('https://script.google.com/')) { toast('URL harus dari script.google.com', 'error'); return; }
    setGasUrl(url);
    toast('Alamat server disimpan', 'success');
  });

  // Diagnostik: kalau tadi sempat login lalu terlempar balik ke sini,
  // tunjukkan alasannya (bukan cuma diam-diam kembali ke login).
  try {
    const lastErr = JSON.parse(sessionStorage.getItem('tirta_last_auth_error') || 'null');
    if (lastErr) {
      toast(`Terputus otomatis: [${lastErr.code}] ${lastErr.message} (saat memanggil "${lastErr.fn}")`, 'error');
      sessionStorage.removeItem('tirta_last_auth_error');
    }
  } catch (e) {}

  const form = container.querySelector('#loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('#loginBtn');
    const name = form.name.value.trim();
    const password = form.password.value;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Memeriksa...';
    try {
      const data = await api('login', [name, password], { requireAuth: false });
      setSession(data);
      toast(`Selamat datang, ${data.name}`, 'success');
      go('/dashboard');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Gagal login';
      toast(msg, 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Masuk';
    }
  });
}
