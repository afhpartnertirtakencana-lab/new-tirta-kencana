// ============================================================
// REKAP PENJUALAN — ringkasan per sales, per produk, per pelanggan,
// dan per status pembayaran, untuk rentang tanggal tertentu.
// ============================================================
import { api } from '../api.js';
import { formatRp, todayISO, escapeHtml, skeletonCards } from '../utils.js';

function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().substring(0, 10); }

function sumGroup(group) {
  let total = 0, qty = 0;
  Object.values(group).forEach((v) => { total += v.total; qty += v.qty; });
  return { total, qty };
}

function renderGroupTable(title, group) {
  const rows = Object.entries(group).map(([name, sub]) => {
    const { total, qty } = sumGroup(sub);
    return { name, total, qty };
  }).sort((a, b) => b.total - a.total);
  if (!rows.length) return '';
  return `<div class="card" style="margin-top:16px">
    <h3>${title}</h3>
    <div class="table-wrap"><table><thead><tr><th>Nama</th><th>Qty</th><th>Total</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${escapeHtml(r.name)}</td><td>${r.qty}</td><td>${formatRp(r.total)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>`;
}

export async function render(container) {
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Rekap Penjualan</h1>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Dari</label><input type="date" id="dateFrom" value="${daysAgoISO(6)}"></div>
        <div class="field"><label>Sampai</label><input type="date" id="dateTo" value="${todayISO()}"></div>
      </div>
      <button class="btn btn-primary" id="btnFilter">Tampilkan</button>
    </div>
    <div id="result">${skeletonCards(3)}</div>`;

  const load = async () => {
    const dateFrom = container.querySelector('#dateFrom').value;
    const dateTo = container.querySelector('#dateTo').value;
    const result = container.querySelector('#result');
    result.innerHTML = skeletonCards(3);
    const rekap = await api('doRekap', [{ dateFrom, dateTo }]);
    if (!rekap.perSales || !Object.keys(rekap.perSales).length) {
      result.innerHTML = `<div class="card"><div class="empty-state"><div class="icon">📊</div><p>Belum ada data penjualan pada rentang ini</p></div></div>`;
      return;
    }
    const payLabels = { cod: '💰 COD', transfer: '🏦 Transfer', qris: '📱 QRIS', belumTransfer: '⏰ Belum Bayar' };
    let payHtml = '<div class="grid-cards cols-4">';
    Object.entries(rekap.pembayaran || {}).forEach(([status, bySales]) => {
      let total = 0;
      Object.values(bySales).forEach((byCust) => Object.values(byCust).forEach((v) => { total += v; }));
      payHtml += `<div class="card stat-card"><span class="label">${payLabels[status] || status}</span><span class="value">${formatRp(total)}</span></div>`;
    });
    payHtml += '</div>';

    result.innerHTML = payHtml
      + renderGroupTable('Per Sales', rekap.perSales)
      + renderGroupTable('Per Produk', rekap.perSku)
      + renderGroupTable('Per Pelanggan', rekap.perCustomer);
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}
