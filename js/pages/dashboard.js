// ============================================================
// DASHBOARD — ringkasan HARI INI saja (default backend v2), jadi
// selalu cepat walau data transaksi sudah ribuan baris di sheet.
// ============================================================
import { api } from '../api.js';
import { formatRp, skeletonCards } from '../utils.js';
import { currentName } from '../session.js';

export async function render(container) {
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:4px">Halo, ${currentName()} 👋</h1>
    <p style="color:var(--color-text-muted);font-size:var(--fs-sm);margin-bottom:20px">Ringkasan transaksi hari ini</p>
    <div id="statGrid">${skeletonCards(3)}</div>
    <div class="card" style="margin-top:20px">
      <div class="card-title-row"><h2>Transaksi Terbaru</h2></div>
      <div id="trxList">${skeletonCards(3)}</div>
    </div>`;

  const trx = await api('getTrxList', [{}]); // {} = default: hari ini saja

  const totalOmzet = trx.reduce((s, t) => s + t.nett, 0);
  const totalTrx = trx.length;
  const belumBayar = trx.filter((t) => t.status === 'belumTransfer').length;

  container.querySelector('#statGrid').outerHTML = `
    <div class="grid-cards cols-3" id="statGrid">
      <div class="card stat-card"><span class="label">Omzet Hari Ini</span><span class="value">${formatRp(totalOmzet)}</span></div>
      <div class="card stat-card"><span class="label">Jumlah Transaksi</span><span class="value">${totalTrx}</span></div>
      <div class="card stat-card"><span class="label">Belum Bayar</span><span class="value" style="color:var(--color-danger)">${belumBayar}</span></div>
    </div>`;

  const listEl = container.querySelector('#trxList');
  if (!trx.length) {
    listEl.innerHTML = `<div class="empty-state"><div class="icon">🧾</div><p>Belum ada transaksi hari ini</p></div>`;
    return;
  }
  listEl.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Customer</th><th>Sales</th><th>Nett</th><th>Status</th></tr></thead><tbody>
    ${trx.slice().reverse().slice(0, 8).map((t) => `
      <tr><td>${t.customer || '-'}</td><td>${t.sales || '-'}</td><td>${formatRp(t.nett)}</td>
      <td><span class="badge badge-${t.status}">${t.status}</span></td></tr>`).join('')}
  </tbody></table></div>`;
}
