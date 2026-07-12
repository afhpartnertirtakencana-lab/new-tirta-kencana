// ============================================================
// PELANGGAN
// ============================================================
import { api } from '../api.js';
import { toast, escapeHtml, debounce, skeletonCards } from '../utils.js';
import { setState, getState } from '../state.js';

export async function render(container) {
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Pelanggan</h1>
    <div class="card">
      <form id="addForm" class="field-row" style="align-items:flex-end">
        <div class="field" style="flex:1"><label>Tambah pelanggan baru</label><input name="nama" placeholder="Nama pelanggan" required></div>
        <button class="btn btn-primary" type="submit">Tambah</button>
      </form>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="field"><input id="searchPelanggan" placeholder="🔍 Cari pelanggan..."></div>
      <div id="pelangganList">${skeletonCards(4)}</div>
    </div>`;

  const pelanggan = await api('getCustomers');
  setState({ pelanggan });
  renderList(container, pelanggan);

  container.querySelector('#addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = e.target.nama.value.trim();
    if (!nama) return;
    try {
      await api('addCustomer', [nama]);
      const updated = getState().pelanggan.includes(nama) ? getState().pelanggan : [...getState().pelanggan, nama];
      setState({ pelanggan: updated });
      renderList(container, updated);
      toast('Pelanggan ditambahkan', 'success');
      e.target.reset();
    } catch (err) { toast(err.message, 'error'); }
  });

  container.querySelector('#searchPelanggan').addEventListener('input', debounce((e) => {
    const q = e.target.value.trim().toLowerCase();
    const list = getState().pelanggan;
    renderList(container, !q ? list : list.filter((p) => p.toLowerCase().includes(q)));
  }, 200));
}

function renderList(container, list) {
  const el = container.querySelector('#pelangganList');
  if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="icon">👤</div><p>Belum ada pelanggan</p></div>`; return; }
  el.innerHTML = `<div class="grid-cards cols-3">${list.map((p) => `<div class="card" style="padding:12px 16px">${escapeHtml(p)}</div>`).join('')}</div>`;
}
