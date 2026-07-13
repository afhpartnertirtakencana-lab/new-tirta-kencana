// ============================================================
// REKAP SETORAN — semua kolom (kecuali Grand Total/Total/Selisih yang
// otomatis dihitung) bisa diedit langsung di tabel, lalu klik Simpan
// per baris. Rumus sama persis dengan halaman Setoran.
// ============================================================
import { api } from '../api.js';
import { formatRp, formatTanggal, toast, todayISO, escapeHtml, skeletonCards } from '../utils.js';
import { currentRole, currentName } from '../session.js';

const EDIT_FIELDS = ['makan', 'tips', 'parkir', 'bensin', 'flazz', 'transfer', 'cicilan', 'tagihan', 'jml1', 'jml2'];
const PENGURANG = ['makan', 'tips', 'parkir', 'bensin', 'flazz', 'transfer'];

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
    <div class="card" style="margin-top:16px;padding:0;overflow:hidden" id="result">${skeletonCards(3)}</div>`;

  let dataList = [];

  const load = async () => {
    const dateFrom = container.querySelector('#dateFrom').value;
    const dateTo = container.querySelector('#dateTo').value;
    const result = container.querySelector('#result');
    result.innerHTML = skeletonCards(3);
    dataList = await api('getSetoranHistory', [{ dateFrom, dateTo }]);
    if (!isAdmin) dataList = dataList.filter((s) => s.sales === currentName());
    dataList = dataList.slice().sort((a, b) => b.tgl.localeCompare(a.tgl));
    renderTable(container, result, dataList);
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}

function renderTable(container, result, dataList) {
  if (!dataList.length) { result.innerHTML = `<div class="empty-state"><div class="icon">💰</div><p>Tidak ada setoran pada rentang ini</p></div>`; return; }

  const inp = (idx, field, val, width = '64px') => `<input type="number" data-idx="${idx}" data-field="${field}" value="${val || 0}" min="0" style="width:${width};padding:4px 6px;font-size:11px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface-2);color:var(--color-text)">`;
  const txt = (idx, field, val, width = '80px') => `<input type="text" data-idx="${idx}" data-field="${field}" value="${escapeHtml(val || '')}" style="width:${width};padding:4px 6px;font-size:11px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface-2);color:var(--color-text)">`;

  result.innerHTML = `<div class="table-wrap"><table style="font-size:11px;white-space:nowrap">
    <thead><tr><th>Tgl</th><th>Sales</th><th>Grand COD</th><th>Makan</th><th>Tips</th><th>Parkir</th><th>Bensin</th><th>Flazz</th><th>Transfer</th><th>Cicilan</th><th>Tagihan</th><th>Ket1</th><th>Jml1</th><th>Ket2</th><th>Jml2</th><th>Total</th><th>Setor</th><th>Selisih</th><th></th></tr></thead>
    <tbody>${dataList.map((s, idx) => `
      <tr data-row="${idx}">
        <td>${formatTanggal(s.tgl)}</td>
        <td><b>${escapeHtml(s.sales)}</b></td>
        <td style="text-align:right;font-weight:600">${formatRp(s.grandTotal)}</td>
        <td>${inp(idx, 'makan', s.makan)}</td>
        <td>${inp(idx, 'tips', s.tips)}</td>
        <td>${inp(idx, 'parkir', s.parkir)}</td>
        <td>${inp(idx, 'bensin', s.bensin)}</td>
        <td>${inp(idx, 'flazz', s.flazz)}</td>
        <td>${inp(idx, 'transfer', s.transfer)}</td>
        <td>${inp(idx, 'cicilan', s.cicilan)}</td>
        <td>${inp(idx, 'tagihan', s.tagihan)}</td>
        <td>${txt(idx, 'ket1', s.ket1)}</td>
        <td>${inp(idx, 'jml1', s.jml1)}</td>
        <td>${txt(idx, 'ket2', s.ket2)}</td>
        <td>${inp(idx, 'jml2', s.jml2)}</td>
        <td data-total-disp="${idx}" style="text-align:right;font-weight:700;color:var(--color-accent)">${formatRp(s.total)}</td>
        <td>${inp(idx, 'setor', s.setor)}</td>
        <td data-selisih-disp="${idx}" style="text-align:right;font-weight:700">${formatRp(s.selisih)}</td>
        <td><button class="btn btn-primary btn-sm" data-save="${idx}">💾</button></td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;

  const recalcRow = (idx) => {
    const row = result.querySelector(`tr[data-row="${idx}"]`);
    const gv = (f) => Number(row.querySelector(`input[data-field="${f}"]`)?.value) || 0;
    const grand = dataList[idx].grandTotal || 0;
    const pengeluaran = PENGURANG.reduce((s, k) => s + gv(k), 0) + gv('jml1') + gv('jml2');
    const total = grand + gv('tagihan') + gv('cicilan') - pengeluaran;
    const selisih = total - gv('setor');
    result.querySelector(`[data-total-disp="${idx}"]`).textContent = formatRp(total);
    const selisihEl = result.querySelector(`[data-selisih-disp="${idx}"]`);
    selisihEl.textContent = formatRp(selisih);
    selisihEl.style.color = selisih >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    return { total, selisih };
  };

  result.querySelectorAll('input[data-field]').forEach((inpEl) => inpEl.addEventListener('input', () => recalcRow(Number(inpEl.dataset.idx))));

  result.querySelectorAll('button[data-save]').forEach((btn) => btn.addEventListener('click', async () => {
    const idx = Number(btn.dataset.save);
    const row = result.querySelector(`tr[data-row="${idx}"]`);
    const gv = (f) => Number(row.querySelector(`input[data-field="${f}"]`)?.value) || 0;
    const tv = (f) => (row.querySelector(`input[data-field="${f}"]`)?.value || '').trim();
    const { total, selisih } = recalcRow(idx);
    const s = dataList[idx];
    const payload = {
      tgl: s.tgl, sales: s.sales, grandTotal: s.grandTotal,
      makan: gv('makan'), tips: gv('tips'), parkir: gv('parkir'), bensin: gv('bensin'),
      flazz: gv('flazz'), transfer: gv('transfer'), cicilan: gv('cicilan'), tagihan: gv('tagihan'),
      ket1: tv('ket1'), jml1: gv('jml1'), ket2: tv('ket2'), jml2: gv('jml2'),
      total, setor: gv('setor'), selisih,
    };
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try { await api('saveSetoran', [payload]); dataList[idx] = payload; toast('Setoran diperbarui', 'success'); }
    catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '💾'; }
  }));
}
