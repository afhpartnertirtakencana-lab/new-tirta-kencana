// ============================================================
// SETORAN — mengikuti rumus versi lama persis:
//   GrandTotal   = total transaksi COD sales ybs pada tanggal ybs
//   Pengeluaran  = makan+tips+parkir+bensin+flazz+transfer+jml1+jml2
//   TOTAL        = GrandTotal + Tagihan + Cicilan − Pengeluaran
//   SELISIH      = TOTAL − Setor
// Kalau data untuk tanggal & sales ini sudah pernah disimpan, form otomatis
// masuk mode EDIT (update, bukan bikin duplikat).
// ============================================================
import { api } from '../api.js';
import { formatRp, toast, todayISO } from '../utils.js';
import { currentName, currentRole } from '../session.js';

const FIELDS = [
  ['makan', '🍽️ Uang Makan'], ['tips', '🎁 Tips'], ['parkir', '🅿️ Parkir'], ['bensin', '⛽ Bensin'],
  ['flazz', '💳 Flazz'], ['transfer', '🏦 Transfer'], ['cicilan', '💵 Cicilan'], ['tagihan', '📄 Tagihan'],
];
const PENGURANG = ['makan', 'tips', 'parkir', 'bensin', 'flazz', 'transfer']; // cicilan & tagihan sengaja TIDAK di sini — itu menambah

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Setoran</h1>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Tanggal</label><input type="date" id="tglInput" value="${todayISO()}"></div>
        <div class="field"><label>Sales</label><input id="salesInput" value="${isAdmin ? '' : currentName()}" ${isAdmin ? '' : 'readonly'}></div>
      </div>
      <button class="btn btn-primary" id="btnTampilkan">💰 Tampilkan</button>
    </div>
    <div id="formArea" style="margin-top:16px"></div>`;

  container.querySelector('#btnTampilkan').addEventListener('click', () => loadForm(container));
}

async function loadForm(container) {
  const tgl = container.querySelector('#tglInput').value;
  const sales = container.querySelector('#salesInput').value.trim();
  if (!tgl || !sales) { toast('Pilih tanggal & isi nama sales', 'error'); return; }
  const formArea = container.querySelector('#formArea');
  formArea.innerHTML = `<div class="card"><div class="skeleton skeleton-card"></div></div>`;

  const [trx, riwayat] = await Promise.all([
    api('getTrxList', [{ dateFrom: tgl, dateTo: tgl }]),
    api('getSetoranHistory', [{ dateFrom: tgl, dateTo: tgl }]),
  ]);
  const grandTotal = trx.filter((t) => t.sales === sales && t.status === 'cod').reduce((s, t) => s + t.nett, 0);
  const existing = riwayat.find((s) => s.sales.toLowerCase().trim() === sales.toLowerCase().trim());

  formArea.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <div><b>💰 Setoran: ${sales}</b><div style="font-size:var(--fs-xs);color:var(--color-text-muted)">${tgl}</div></div>
        <div style="font-size:var(--fs-md);font-weight:800;color:var(--color-accent)">Grand Total COD: ${formatRp(grandTotal)}</div>
      </div>
      ${existing ? `<div class="badge badge-cod" style="display:block;padding:8px 12px;margin-bottom:12px">ℹ️ Data untuk tanggal & sales ini sudah pernah disimpan — form terisi otomatis, klik Simpan untuk memperbarui.</div>` : ''}
      <div class="grid-cards cols-4">
        ${FIELDS.map(([key, label]) => `<div class="field"><label>${label}</label><input type="number" id="f_${key}" value="${existing ? existing[key] || 0 : 0}" min="0" class="setoran-input"></div>`).join('')}
      </div>
      <div class="field-row">
        <div class="field" style="flex:2"><label>Keterangan 1</label><input id="f_ket1" value="${existing ? existing.ket1 || '' : ''}" placeholder="contoh: Bonus"></div>
        <div class="field"><label>Jumlah 1</label><input type="number" id="f_jml1" value="${existing ? existing.jml1 || 0 : 0}" min="0" class="setoran-input"></div>
      </div>
      <div class="field-row">
        <div class="field" style="flex:2"><label>Keterangan 2</label><input id="f_ket2" value="${existing ? existing.ket2 || '' : ''}" placeholder="contoh: Lain-lain"></div>
        <div class="field"><label>Jumlah 2</label><input type="number" id="f_jml2" value="${existing ? existing.jml2 || 0 : 0}" min="0" class="setoran-input"></div>
      </div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:700;border-top:1px solid var(--color-border);margin-top:8px">
        <span>TOTAL</span><span id="f_totalDisp">${formatRp(0)}</span>
      </div>
      <div class="field"><label>✅ SETOR</label><input type="number" id="f_setor" value="${existing ? existing.setor || 0 : 0}" min="0"></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;font-weight:800" id="f_selisihRow">
        <span>SELISIH</span><span id="f_selisihDisp">${formatRp(0)}</span>
      </div>
      <button class="btn btn-primary btn-block" id="btnSimpanSetoran" style="margin-top:8px">💾 Simpan Setoran</button>
    </div>`;

  const recalc = () => {
    const gv = (id) => Number(formArea.querySelector('#' + id)?.value) || 0;
    const pengeluaran = PENGURANG.reduce((s, k) => s + gv('f_' + k), 0) + gv('f_jml1') + gv('f_jml2');
    const total = grandTotal + gv('f_tagihan') + gv('f_cicilan') - pengeluaran;
    const setor = gv('f_setor');
    const selisih = total - setor;
    formArea.querySelector('#f_totalDisp').textContent = formatRp(total);
    const selisihDisp = formArea.querySelector('#f_selisihDisp');
    selisihDisp.textContent = formatRp(selisih);
    selisihDisp.style.color = selisih >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
    return { total, selisih };
  };
  formArea.querySelectorAll('input').forEach((inp) => inp.addEventListener('input', recalc));
  recalc();

  formArea.querySelector('#btnSimpanSetoran').addEventListener('click', async () => {
    const gv = (id) => Number(formArea.querySelector('#' + id)?.value) || 0;
    const tv = (id) => (formArea.querySelector('#' + id)?.value || '').trim();
    const { total, selisih } = recalc();
    const payload = {
      tgl, sales, grandTotal,
      makan: gv('f_makan'), tips: gv('f_tips'), parkir: gv('f_parkir'), bensin: gv('f_bensin'),
      flazz: gv('f_flazz'), transfer: gv('f_transfer'), cicilan: gv('f_cicilan'), tagihan: gv('f_tagihan'),
      ket1: tv('f_ket1'), jml1: gv('f_jml1'), ket2: tv('f_ket2'), jml2: gv('f_jml2'),
      total, setor: gv('f_setor'), selisih,
    };
    const btn = formArea.querySelector('#btnSimpanSetoran');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
    try { await api('saveSetoran', [payload]); toast('Setoran berhasil disimpan', 'success'); }
    catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '💾 Simpan Setoran'; }
  });
}
