// ============================================================
// REKAP SETORAN — riwayat setoran dengan filter tanggal.
// ============================================================
import { api } from '../api.js';
import { formatRp, formatTanggal, todayISO, skeletonCards } from '../utils.js';
import { currentRole, currentName } from '../session.js';

function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().substring(0, 10); }

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Rekap Setoran</h1>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Dari</label><input type="date" id="dateFrom" value="${daysAgoISO(29)}"></div>
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
    let list = await api('getSetoranHistory', [{ dateFrom, dateTo }]);
    if (!isAdmin) list = list.filter((s) => s.sales === currentName());
    if (!list.length) { result.innerHTML = `<div class="empty-state"><div class="icon">💰</div><p>Tidak ada setoran pada rentang ini</p></div>`; return; }
    const totalSetor = list.reduce((s, x) => s + x.setor, 0);
    const totalSelisih = list.reduce((s, x) => s + x.selisih, 0);
    result.innerHTML = `
      <div style="margin-bottom:12px;color:var(--color-text-muted);font-size:var(--fs-sm)">${list.length} setoran · Total disetor ${formatRp(totalSetor)} · Selisih ${formatRp(totalSelisih)}</div>
      <div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Sales</th><th>Omzet</th><th>Total Seharusnya</th><th>Disetor</th><th>Selisih</th></tr></thead><tbody>
      ${list.slice().reverse().map((s) => `<tr>
        <td>${formatTanggal(s.tgl)}</td><td>${s.sales}</td><td>${formatRp(s.grandTotal)}</td><td>${formatRp(s.total)}</td><td>${formatRp(s.setor)}</td>
        <td style="color:${s.selisih < 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${formatRp(s.selisih)}</td>
      </tr>`).join('')}
      </tbody></table></div>`;
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}
