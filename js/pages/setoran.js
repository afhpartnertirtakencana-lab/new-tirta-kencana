// ============================================================
// SETORAN — sales input setoran harian (uang yang disetor ke kantor).
// ============================================================
import { api } from '../api.js';
import { formatRp, toast, todayISO } from '../utils.js';
import { currentName, currentRole } from '../session.js';

const FIELDS = [
  ['makan', 'Makan'], ['tips', 'Tips'], ['parkir', 'Parkir'], ['bensin', 'Bensin'],
  ['flazz', 'Flazz'], ['transfer', 'Transfer'], ['cicilan', 'Cicilan'], ['tagihan', 'Tagihan'],
];

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Setoran</h1>
    <form class="card" id="setoranForm">
      <div class="field-row">
        <div class="field"><label>Tanggal</label><input type="date" name="tgl" value="${todayISO()}" required></div>
        <div class="field"><label>Sales</label><input name="sales" value="${currentName()}" ${isAdmin ? '' : 'readonly'} required></div>
      </div>
      <div class="field"><label>Omzet / Grand Total Hari Ini</label><input type="number" name="grandTotal" id="grandTotal" required></div>

      <div style="font-size:var(--fs-xs);color:var(--color-text-muted);margin:12px 0 6px;font-weight:700">PENGELUARAN</div>
      <div class="grid-cards cols-4">
        ${FIELDS.map(([key, label]) => `
          <div class="field"><label>${label}</label><input type="number" name="${key}" value="0" class="komponen"></div>`).join('')}
      </div>

      <div style="font-size:var(--fs-xs);color:var(--color-text-muted);margin:12px 0 6px;font-weight:700">LAIN-LAIN (OPSIONAL)</div>
      <div class="field-row">
        <div class="field"><label>Keterangan 1</label><input name="ket1"></div>
        <div class="field"><label>Jumlah 1</label><input type="number" name="jml1" value="0" class="komponen"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Keterangan 2</label><input name="ket2"></div>
        <div class="field"><label>Jumlah 2</label><input type="number" name="jml2" value="0" class="komponen"></div>
      </div>

      <div class="card" style="margin-top:12px;background:var(--color-surface-2)">
        <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Total Seharusnya Disetor</span><b id="totalCalc">${formatRp(0)}</b></div>
        <div class="field" style="margin-top:8px"><label>Uang yang Benar-Benar Disetor</label><input type="number" name="setor" id="setorInput" value="0" required></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-weight:700"><span>Selisih</span><b id="selisihCalc">${formatRp(0)}</b></div>
      </div>

      <button class="btn btn-primary btn-block" style="margin-top:16px" type="submit">Simpan Setoran</button>
    </form>`;

  const form = container.querySelector('#setoranForm');
  const recalc = () => {
    const fd = new FormData(form);
    const grandTotal = Number(fd.get('grandTotal')) || 0;
    let pengeluaran = 0;
    FIELDS.forEach(([key]) => { pengeluaran += Number(fd.get(key)) || 0; });
    pengeluaran += (Number(fd.get('jml1')) || 0) + (Number(fd.get('jml2')) || 0);
    const total = grandTotal - pengeluaran;
    const setor = Number(fd.get('setor')) || 0;
    container.querySelector('#totalCalc').textContent = formatRp(total);
    container.querySelector('#selisihCalc').textContent = formatRp(setor - total);
    const selisihEl = container.querySelector('#selisihCalc');
    selisihEl.style.color = (setor - total) < 0 ? 'var(--color-danger)' : 'var(--color-success)';
    return total;
  };
  form.addEventListener('input', recalc);

  // Isi otomatis grandTotal dari omzet hari ini (bisa diubah manual)
  try {
    const trx = await api('getTrxList', [{ dateFrom: todayISO(), dateTo: todayISO() }]);
    const filtered = isAdmin ? trx : trx.filter((t) => t.sales === currentName());
    const omzet = filtered.reduce((s, t) => s + t.nett, 0);
    form.grandTotal.value = omzet;
    recalc();
  } catch (e) { /* biarkan user isi manual kalau gagal */ }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const total = recalc();
    const data = {
      tgl: fd.get('tgl'), sales: fd.get('sales'), grandTotal: Number(fd.get('grandTotal')) || 0,
      makan: Number(fd.get('makan')) || 0, tips: Number(fd.get('tips')) || 0, parkir: Number(fd.get('parkir')) || 0,
      bensin: Number(fd.get('bensin')) || 0, flazz: Number(fd.get('flazz')) || 0, transfer: Number(fd.get('transfer')) || 0,
      cicilan: Number(fd.get('cicilan')) || 0, tagihan: Number(fd.get('tagihan')) || 0,
      ket1: fd.get('ket1') || '', jml1: Number(fd.get('jml1')) || 0, ket2: fd.get('ket2') || '', jml2: Number(fd.get('jml2')) || 0,
      total, setor: Number(fd.get('setor')) || 0, selisih: (Number(fd.get('setor')) || 0) - total,
    };
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    try {
      await api('saveSetoran', [data]);
      toast('Setoran berhasil disimpan', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Simpan Setoran'; }
  });
}
