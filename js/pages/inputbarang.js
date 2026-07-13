// ============================================================
// INPUT BARANG — status: Kiriman / Titipan (bukan "retur").
// Harga Modal otomatis terisi dari data Produk (readonly, seperti versi
// lama) — yang manual diedit hanya Diskon per item.
// ============================================================
import { api } from '../api.js';
import { toast, uid, todayISO, escapeHtml, formatRp } from '../utils.js';
import { currentName, currentRole } from '../session.js';

let items = []; // baris item yang sedang diisi dalam 1 input (1 groupId)

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  items = [];
  const inpId = uid('INP');
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Input Barang Masuk</h1>
    <div class="card">
      <div class="field"><label>ID Input</label><input value="${inpId}" readonly style="font-family:var(--font-mono);opacity:.7"></div>
      <div class="field-row">
        <div class="field"><label>Driver *</label><input id="driverInput" value="${isAdmin ? '' : currentName()}" placeholder="Nama driver"></div>
        <div class="field"><label>Rit *</label><input id="ritInput" placeholder="mis. 1"></div>
      </div>
      <div class="field"><label>Status *</label>
        <select id="statusInput"><option value="">-- Pilih Status --</option><option value="kiriman">Kiriman</option><option value="titipan">Titipan</option></select>
      </div>
      <div class="field"><label>Tanggal</label><input type="date" id="tglInput" value="${todayISO()}"></div>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card-title-row"><h2>📦 Item</h2><button class="btn btn-ghost btn-sm" id="btnAddRow">+ Item</button></div>
      <div id="itemRows"></div>
      <div style="border-top:1px solid var(--color-border);margin-top:12px;padding-top:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Total Qty</span><span id="sumQty">0</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Gross Modal</span><span id="sumGross">${formatRp(0)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--color-danger)"><span>Total Disc</span><span id="sumDisc">${formatRp(0)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-weight:800"><span>TOTAL MODAL BERSIH</span><span id="sumNet" style="color:var(--color-accent)">${formatRp(0)}</span></div>
      </div>
      <button class="btn btn-primary btn-block" id="btnSimpan" style="margin-top:16px">💾 Simpan Input Barang</button>
    </div>`;

  const produk = await api('getProducts');
  container.dataset.ready = '1';
  addRow(container, produk);
  container.querySelector('#btnAddRow').addEventListener('click', () => addRow(container, produk));
  container.querySelector('#btnSimpan').addEventListener('click', () => simpan(container, inpId));
}

function addRow(container, produk) {
  const rowId = items.length;
  items.push({ sku: '', nama: '', qty: 1, hargaModal: 0, disc: 0 });
  const wrap = container.querySelector('#itemRows');
  const row = document.createElement('div');
  row.className = 'cart-item';
  row.style.flexWrap = 'wrap';
  row.dataset.row = rowId;
  row.innerHTML = `
    <select data-f="sku" style="flex:2;min-width:140px;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
      <option value="">-- pilih produk --</option>
      ${produk.map((p) => `<option value="${escapeHtml(p.sku)}" data-modal="${p.modal}" data-nama="${escapeHtml(p.nama)}">${escapeHtml(p.nama)}</option>`).join('')}
    </select>
    <input type="number" data-f="qty" min="1" value="1" placeholder="Qty" style="width:56px;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
    <input type="number" data-f="hargaModal" value="0" readonly placeholder="Harga Modal" style="width:90px;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text-muted)">
    <input type="number" data-f="disc" min="0" value="0" placeholder="Disc" style="width:70px;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
    <button class="btn btn-danger btn-sm btn-icon" data-remove>✕</button>`;
  wrap.appendChild(row);

  const sel = row.querySelector('[data-f="sku"]');
  sel.addEventListener('change', () => {
    const opt = sel.selectedOptions[0];
    items[rowId].sku = sel.value;
    items[rowId].nama = opt?.dataset.nama || '';
    items[rowId].hargaModal = Number(opt?.dataset.modal) || 0;
    row.querySelector('[data-f="hargaModal"]').value = items[rowId].hargaModal;
    recalc(container);
  });
  row.querySelector('[data-f="qty"]').addEventListener('input', (e) => { items[rowId].qty = Number(e.target.value) || 1; recalc(container); });
  row.querySelector('[data-f="disc"]').addEventListener('input', (e) => { items[rowId].disc = Number(e.target.value) || 0; recalc(container); });
  row.querySelector('[data-remove]').addEventListener('click', () => { items[rowId] = null; row.remove(); recalc(container); });

  recalc(container);
}

function recalc(container) {
  const active = items.filter(Boolean);
  const qty = active.reduce((s, it) => s + it.qty, 0);
  const gross = active.reduce((s, it) => s + it.hargaModal * it.qty, 0);
  const disc = active.reduce((s, it) => s + it.disc * it.qty, 0);
  container.querySelector('#sumQty').textContent = qty;
  container.querySelector('#sumGross').textContent = formatRp(gross);
  container.querySelector('#sumDisc').textContent = formatRp(disc);
  container.querySelector('#sumNet').textContent = formatRp(gross - disc);
}

async function simpan(container, inpId) {
  const active = items.filter(Boolean);
  const driver = container.querySelector('#driverInput').value.trim();
  const rit = container.querySelector('#ritInput').value.trim();
  const status = container.querySelector('#statusInput').value;
  const tgl = container.querySelector('#tglInput').value;

  if (!driver) { toast('Driver wajib diisi', 'error'); return; }
  if (!rit) { toast('Rit wajib diisi', 'error'); return; }
  if (!status) { toast('Status wajib dipilih', 'error'); return; }
  if (!active.length || active.some((it) => !it.sku)) { toast('Semua item harus dipilih produknya', 'error'); return; }

  const btn = container.querySelector('#btnSimpan');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    for (let i = 0; i < active.length; i++) {
      const it = active[i];
      const netModal = (it.hargaModal - it.disc) * it.qty;
      await api('saveInputBarang', [{ id: inpId + '-' + (i + 1), groupId: inpId, sku: it.sku, nama: it.nama, qty: it.qty, hargaModal: it.hargaModal, disc: it.disc, netModal, driver, rit, status, date: tgl }]);
    }
    toast(`${active.length} item berhasil disimpan`, 'success');
    render(container);
  } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '💾 Simpan Input Barang'; }
}
