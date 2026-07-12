// ============================================================
// PRODUK — kelola daftar produk (harga, modal, satuan).
// ============================================================
import { api } from '../api.js';
import { formatRp, toast, escapeHtml, openModal, skeletonCards } from '../utils.js';
import { setState, getState } from '../state.js';

export async function render(container) {
  container.innerHTML = `
    <div class="card-title-row" style="margin-bottom:16px">
      <h1 style="font-size:var(--fs-lg)">Produk</h1>
      <button class="btn btn-primary btn-sm" id="btnTambah">+ Produk</button>
    </div>
    <div id="produkList">${skeletonCards(4)}</div>`;

  const produk = await api('getProducts');
  setState({ produk });
  renderList(container, produk);
  container.querySelector('#btnTambah').addEventListener('click', () => openForm(container, null));
}

function renderList(container, produk) {
  const el = container.querySelector('#produkList');
  if (!produk.length) { el.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Belum ada produk</p></div>`; return; }
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nama</th><th>SKU</th><th>Harga</th><th>Modal</th><th>Satuan</th><th></th></tr></thead><tbody>
    ${produk.map((p, i) => `<tr>
      <td>${escapeHtml(p.nama)}</td><td>${escapeHtml(p.sku)}</td><td>${formatRp(p.harga)}</td><td>${formatRp(p.modal)}</td><td>${escapeHtml(p.satuan)}</td>
      <td><button class="btn btn-ghost btn-sm" data-edit="${i}">Ubah</button></td>
    </tr>`).join('')}
  </tbody></table></div>`;
  el.querySelectorAll('button[data-edit]').forEach((btn) => btn.addEventListener('click', () => openForm(container, produk[Number(btn.dataset.edit)], Number(btn.dataset.edit))));
}

function openForm(container, produkItem, index) {
  const isEdit = !!produkItem;
  const { close } = openModal({
    title: isEdit ? 'Ubah Produk' : 'Tambah Produk',
    bodyHtml: `
      <form id="produkForm">
        <div class="field"><label>Nama</label><input name="nama" required value="${escapeHtml(produkItem?.nama || '')}"></div>
        <div class="field"><label>SKU</label><input name="sku" required value="${escapeHtml(produkItem?.sku || '')}" ${isEdit ? 'readonly' : ''}></div>
        <div class="field-row">
          <div class="field"><label>Harga Jual</label><input name="harga" type="number" required value="${produkItem?.harga || ''}"></div>
          <div class="field"><label>Modal</label><input name="modal" type="number" required value="${produkItem?.modal || ''}"></div>
        </div>
        <div class="field"><label>Satuan</label><input name="satuan" value="${escapeHtml(produkItem?.satuan || 'Pcs')}"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button type="submit" class="btn btn-primary btn-block">Simpan</button>
          ${isEdit ? `<button type="button" class="btn btn-danger" id="btnHapusProduk">Hapus</button>` : ''}
        </div>
      </form>`,
    onMount: (overlay) => {
      overlay.querySelector('#produkForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const produk = getState().produk.slice();
        const item = { sku: f.sku.value.trim(), nama: f.nama.value.trim(), harga: Number(f.harga.value), modal: Number(f.modal.value), satuan: f.satuan.value.trim() || 'Pcs', stokAwal: produkItem?.stokAwal || 0, barcode: produkItem?.barcode || '', hasBarcode: produkItem?.hasBarcode || false };
        if (isEdit) produk[index] = item; else produk.push(item);
        try { await api('saveProducts', [produk]); setState({ produk }); toast('Produk disimpan', 'success'); close(); renderList(container, produk); }
        catch (err) { toast(err.message, 'error'); }
      });
      const btnHapus = overlay.querySelector('#btnHapusProduk');
      if (btnHapus) btnHapus.addEventListener('click', async () => {
        if (!confirm('Hapus produk ini?')) return;
        const produk = getState().produk.slice(); produk.splice(index, 1);
        try { await api('saveProducts', [produk]); setState({ produk }); toast('Produk dihapus', 'success'); close(); renderList(container, produk); }
        catch (err) { toast(err.message, 'error'); }
      });
    },
  });
}
