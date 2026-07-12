// ============================================================
// RIWAYAT — WAJIB pilih rentang tanggal untuk data lama (default:
// 7 hari terakhir). Ini yang membuat laporan tetap cepat walau
// histori sudah sangat panjang, karena backend hanya membaca baris
// dalam rentang yang diminta.
// ============================================================
import { api } from '../api.js';
import { formatRp, formatTanggal, toast, todayISO, skeletonCards } from '../utils.js';
import { currentRole } from '../session.js';

function daysAgoISO(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().substring(0, 10);
}

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Riwayat Transaksi</h1>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Dari</label><input type="date" id="dateFrom" value="${daysAgoISO(6)}"></div>
        <div class="field"><label>Sampai</label><input type="date" id="dateTo" value="${todayISO()}"></div>
      </div>
      <button class="btn btn-primary" id="btnFilter">Tampilkan</button>
    </div>
    <div class="card" style="margin-top:16px" id="resultCard">${skeletonCards(3)}</div>`;

  const load = async () => {
    const dateFrom = container.querySelector('#dateFrom').value;
    const dateTo = container.querySelector('#dateTo').value;
    const resultCard = container.querySelector('#resultCard');
    resultCard.innerHTML = skeletonCards(3);
    const trx = await api('getTrxList', [{ dateFrom, dateTo }]);
    if (!trx.length) { resultCard.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Tidak ada transaksi pada rentang ini</p></div>`; return; }
    const total = trx.reduce((s, t) => s + t.nett, 0);
    resultCard.innerHTML = `
      <div style="margin-bottom:12px;color:var(--color-text-muted);font-size:var(--fs-sm)">${trx.length} transaksi · Total ${formatRp(total)}</div>
      <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Customer</th><th>Sales</th><th>Nett</th><th>Status</th>${isAdmin ? '<th></th>' : ''}</tr></thead><tbody>
      ${trx.slice().reverse().map((t) => `
        <tr><td>${formatTanggal(t.tgl)}</td><td>${t.customer || '-'}</td><td>${t.sales || '-'}</td><td>${formatRp(t.nett)}</td>
        <td><span class="badge badge-${t.status}">${t.status}</span></td>
        ${isAdmin ? `<td><button class="btn btn-danger btn-sm" data-del="${t.id}">Hapus</button></td>` : ''}</tr>`).join('')}
      </tbody></table></div>`;

    if (isAdmin) {
      resultCard.querySelectorAll('button[data-del]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Hapus transaksi ini? Tindakan tidak bisa dibatalkan.')) return;
          try { await api('deleteTrx', [btn.dataset.del]); toast('Transaksi dihapus', 'success'); load(); }
          catch (err) { toast(err.message, 'error'); }
        });
      });
    }
  };

  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}
