// ============================================================
// PIUTANG — semua transaksi berstatus "belumTransfer", dikelompokkan
// per pelanggan, dengan info umur piutang (aging).
// ============================================================
import { api } from '../api.js';
import { formatRp, formatTanggal, escapeHtml, skeletonCards } from '../utils.js';
import { todayISO } from '../utils.js';

function agingInfo(tgl) {
  const diff = Math.floor((new Date(todayISO()) - new Date(tgl)) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return { label: 'Hari ini', cls: 'badge-transfer' };
  if (diff <= 7) return { label: diff + ' hari', cls: 'badge-cod' };
  if (diff <= 30) return { label: diff + ' hari', cls: 'badge-cod' };
  return { label: diff + ' hari ⚠️', cls: 'badge-belumTransfer' };
}

export async function render(container) {
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Piutang</h1>
    <div id="result">${skeletonCards(3)}</div>`;

  const list = await api('getPiutang');
  const result = container.querySelector('#result');
  if (!list.length) { result.innerHTML = `<div class="card"><div class="empty-state"><div class="icon">✅</div><p>Tidak ada piutang — semua sudah lunas</p></div></div>`; return; }

  const byCustomer = {};
  list.forEach((t) => {
    if (!byCustomer[t.customer]) byCustomer[t.customer] = { total: 0, count: 0, oldest: t.tgl, items: [] };
    const c = byCustomer[t.customer];
    c.total += t.nett; c.count += 1; c.items.push(t);
    if (t.tgl < c.oldest) c.oldest = t.tgl;
  });
  const rows = Object.entries(byCustomer).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  result.innerHTML = `
    <div class="card stat-card" style="margin-bottom:16px">
      <span class="label">Total Piutang</span><span class="value" style="color:var(--color-danger)">${formatRp(grandTotal)}</span>
      <span class="sub">${rows.length} pelanggan · ${list.length} transaksi</span>
    </div>
    ${rows.map((r) => {
      const aging = agingInfo(r.oldest);
      return `<div class="card" style="margin-bottom:12px">
        <div class="card-title-row">
          <h3>${escapeHtml(r.name)}</h3>
          <span class="badge ${aging.cls}">${aging.label}</span>
        </div>
        <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Sales</th><th>Nett</th></tr></thead><tbody>
          ${r.items.map((t) => `<tr><td>${formatTanggal(t.tgl)}</td><td>${escapeHtml(t.sales)}</td><td>${formatRp(t.nett)}</td></tr>`).join('')}
        </tbody></table></div>
        <div style="display:flex;justify-content:space-between;padding-top:10px;font-weight:700">
          <span>Subtotal</span><span>${formatRp(r.total)}</span>
        </div>
      </div>`;
    }).join('')}`;
}
