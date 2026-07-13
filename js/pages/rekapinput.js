// ============================================================
// REKAP INPUT — riwayat input barang, dengan filter tanggal, dan
// hapus untuk admin.
// ============================================================
import { api } from '../api.js';
import { formatRp, formatTanggal, toast, todayISO, escapeHtml, skeletonCards } from '../utils.js';
import { currentRole } from '../session.js';

function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().substring(0, 10); }

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Rekap Input Barang</h1>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Dari</label><input type="date" id="dateFrom" value="${daysAgoISO(6)}"></div>
        <div class="field"><label>Sampai</label><input type="date" id="dateTo" value="${todayISO()}"></div>
      </div>
      <button class="btn btn-primary" id="btnFilter">Tampilkan</button>
    </div>
    <div class="card" style="margin-top:16px" id="result">${skeletonCards(3)}</div>`;

  const load = async () => {
    const dateFrom = container.querySelector('#dateFrom').value;
    const dateTo = container.querySelector('#dateTo').value;
    const result = container.querySelector('#result');
    result.innerHTML = skeletonCards(3);
    const list = await api('getInputBarangHistory', [{ dateFrom, dateTo }]);
    if (!list.length) { result.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Tidak ada input barang pada rentang ini</p></div>`; return; }
    result.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Qty</th><th>Modal Bersih</th><th>Driver</th><th>Rit</th><th>Status</th>${isAdmin ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.slice().reverse().map((it) => `<tr>
        <td>${formatTanggal(it.date)}</td><td>${escapeHtml(it.nama)}</td><td>${it.qty}</td><td>${formatRp(it.netModal)}</td>
        <td>${escapeHtml(it.driver)}</td><td>${escapeHtml(it.rit)}</td><td>${escapeHtml(it.status)}</td>
        ${isAdmin ? `<td><button class="btn btn-danger btn-sm" data-del="${it.id}">Hapus</button></td>` : ''}
      </tr>`).join('')}
    </tbody></table></div>`;

    if (isAdmin) {
      result.querySelectorAll('button[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
        if (!confirm('Hapus data ini?')) return;
        try { await api('deleteInputBarang', [btn.dataset.del]); toast('Data dihapus', 'success'); load(); }
        catch (err) { toast(err.message, 'error'); }
      }));
    }
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}
