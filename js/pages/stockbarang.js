// ============================================================
// STOCK BARANG — lihat stok awal/masuk/keluar/akhir per tanggal.
// ============================================================
import { api } from '../api.js';
import { toast, todayISO, escapeHtml, skeletonCards } from '../utils.js';
import { currentRole } from '../session.js';

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Stock Barang</h1>
    <div class="card">
      <div class="field"><label>Tanggal</label><input type="date" id="tglInput" value="${todayISO()}"></div>
      <button class="btn btn-primary" id="btnFilter">Tampilkan</button>
    </div>
    <div class="card" style="margin-top:16px" id="result">${skeletonCards(3)}</div>`;

  const load = async () => {
    const date = container.querySelector('#tglInput').value;
    const result = container.querySelector('#result');
    result.innerHTML = skeletonCards(3);
    const list = await api('getMasterStockByDate', [date]);
    if (!list.length) {
      result.innerHTML = `<div class="empty-state"><div class="icon">🏬</div><p>Belum ada data stok untuk tanggal ini</p>${isAdmin ? '<p style="font-size:var(--fs-xs);margin-top:8px">Stok awal akan otomatis dibuat dari rollover harian, atau atur manual lewat tombol Ubah di bawah setelah data pertama ada.</p>' : ''}</div>`;
      return;
    }
    result.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Produk</th><th>Stok Awal</th><th>Masuk</th><th>Keluar</th><th>Stok Akhir</th>${isAdmin ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map((s) => `<tr>
        <td>${escapeHtml(s.nama)}</td><td>${s.stokAwal}</td><td>${s.masuk}</td><td>${s.keluar}</td><td><b>${s.stokAkhir}</b></td>
        ${isAdmin ? `<td><button class="btn btn-ghost btn-sm" data-edit="${escapeHtml(s.sku)}" data-nama="${escapeHtml(s.nama)}" data-awal="${s.stokAwal}">Ubah</button></td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>`;

    if (isAdmin) {
      result.querySelectorAll('button[data-edit]').forEach((btn) => btn.addEventListener('click', async () => {
        const val = prompt(`Stok awal baru untuk ${btn.dataset.nama}:`, btn.dataset.awal);
        if (val === null) return;
        try { await api('updateStockAwal', [{ date, sku: btn.dataset.edit, nama: btn.dataset.nama, stokAwal: Number(val) || 0 }]); toast('Stok awal diperbarui', 'success'); load(); }
        catch (err) { toast(err.message, 'error'); }
      }));
    }
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}
