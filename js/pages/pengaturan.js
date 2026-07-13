// ============================================================
// PENGATURAN — ganti password, kelola user (admin), info toko (admin),
// konfigurasi URL backend, dan logout.
// ============================================================
import { api } from '../api.js';
import { toast, escapeHtml } from '../utils.js';
import { currentName, currentRole, clearSession } from '../session.js';
import { getGasUrl, setGasUrl } from '../config.js';
import { resetState } from '../state.js';
import { go } from '../router.js';

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Pengaturan</h1>

    <div class="card">
      <h2>Akun</h2>
      <p style="color:var(--color-text-muted);font-size:var(--fs-sm);margin-bottom:12px">Login sebagai <b>${escapeHtml(currentName())}</b> (${escapeHtml(currentRole())})</p>
      <form id="pwForm">
        <div class="field-row">
          <div class="field"><label>Password lama</label><input type="password" name="old" required></div>
          <div class="field"><label>Password baru</label><input type="password" name="new" required minlength="4"></div>
        </div>
        <button class="btn btn-ghost" type="submit">Ganti Password</button>
      </form>
    </div>

    ${isAdmin ? `<div class="card" style="margin-top:16px">
      <h2>Kelola User</h2>
      <div id="userList"><div class="skeleton skeleton-card"></div></div>
      <form id="userForm" style="margin-top:12px">
        <div class="field-row">
          <div class="field"><label>Nama</label><input name="name" required></div>
          <div class="field"><label>Role</label>
            <select name="role"><option value="sales">Sales</option><option value="driver">Driver</option><option value="admin">Admin</option></select>
          </div>
        </div>
        <div class="field"><label>Password</label><input name="password" type="password" required minlength="4"></div>
        <button class="btn btn-primary btn-block" type="submit">Tambah / Perbarui User</button>
      </form>
    </div>` : ''}

    <div class="card" style="margin-top:16px">
      <h2>Koneksi Server</h2>
      <div class="field"><label>URL Backend (Apps Script)</label><input id="gasUrlInput" value="${escapeHtml(getGasUrl())}"></div>
      <button class="btn btn-ghost btn-sm" id="btnSaveUrl">Simpan URL</button>
    </div>

    <button class="btn btn-danger btn-block" id="btnLogout" style="margin-top:20px">Keluar</button>`;

  container.querySelector('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await api('changePassword', [e.target.old.value, e.target.new.value]); toast('Password berhasil diganti', 'success'); e.target.reset(); }
    catch (err) { toast(err.message, 'error'); }
  });

  container.querySelector('#gasUrlInput').addEventListener('change', () => {});
  container.querySelector('#btnSaveUrl').addEventListener('click', () => {
    setGasUrl(container.querySelector('#gasUrlInput').value.trim());
    toast('URL backend disimpan', 'success');
  });

  container.querySelector('#btnLogout').addEventListener('click', async () => {
    try { await api('logout'); } catch (e) {}
    clearSession(); resetState(); go('/login');
  });

  if (isAdmin) {
    const users = await api('getUsersAdmin');
    renderUsers(container, users);
    container.querySelector('#userForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        await api('saveUser', [{ name: f.name.value.trim(), role: f.role.value, password: f.password.value }]);
        toast('User disimpan', 'success');
        f.reset();
        renderUsers(container, await api('getUsersAdmin'));
      } catch (err) { toast(err.message, 'error'); }
    });
  }
}

function renderUsers(container, users) {
  const el = container.querySelector('#userList');
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nama</th><th>Role</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.role)}</td>
      <td><button class="btn btn-danger btn-sm" data-del="${escapeHtml(u.name)}">Hapus</button></td></tr>`).join('')}
  </tbody></table></div>`;
  el.querySelectorAll('button[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
    if (!confirm(`Hapus user ${btn.dataset.del}?`)) return;
    try { await api('deleteUser', [btn.dataset.del]); toast('User dihapus', 'success'); renderUsers(container, await api('getUsersAdmin')); }
    catch (err) { toast(err.message, 'error'); }
  }));
}
