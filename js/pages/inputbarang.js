// ============================================================
// INPUT BARANG — driver mencatat barang yang dibawa/masuk per rit.
// Beberapa item bisa dimasukkan sekaligus dalam satu "rit" (groupId sama).
// ============================================================
import { api } from '../api.js';
import { toast, uid, todayISO, escapeHtml, formatRp } from '../utils.js';
import { currentName, currentRole } from '../session.js';

let draft = []; // item-item dalam rit yang sedang diisi

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  draft = [];
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Input Barang</h1>
    <div class="grid-cards cols-2" style="align-items:start">
      <div class="card">
        <div class="field-row">
          <div class="field"><label>Tanggal</label><input type="date" id="tglInput" value="${todayISO()}"></div>
          <div class="field"><label>Driver</label><input id="driverInput" value="${isAdmin ? '' : currentName()}" placeholder="Nama driver"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Rit ke</label><input id="ritInput" type="number" value="1" min="1"></div>
          <div class="field"><label>Status</label>
            <select id="statusInput"><option value="kiriman">Kiriman (stok masuk)</option><option value="retur">Retur (stok keluar)</option></select>
          </div>
        </div>
        <hr style="border-color:var(--color-border);margin:12px 0">
        <div class="field-row">
          <div class="field" style="flex:2"><label>Produk</label><select id="produkSelect"></select></div>
          <div class="field"><label>Qty</label><input id="qtyInput" type="number" value="1" min="1"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Harga Modal</label><input id="hargaModalInput" type="number" value="0"></div>
          <div class="field"><label>Diskon</label><input id="discInput" type="number" value="0"></div>
        </div>
        <button class="btn btn-ghost btn-block" id="btnAddItem">+ Tambah ke Rit</button>
      </div>
      <div class="card">
        <h3>Item dalam Rit Ini</h3>
        <div id="draftList"><div class="empty-state"><p>Belum ada item</p></div></div>
        <button class="btn btn-primary btn-block" id="btnSimpanRit" style="margin-top:12px" disabled>Simpan Semua</button>
      </div>
    </div>`;

  const produk = await api('getProducts');
  const sel = container.querySelector('#produkSelect');
  sel.innerHTML = produk.map((p) => `<option value="${escapeHtml(p.sku)}" data-modal="${p.modal}">${escapeHtml(p.nama)}</option>`).join('');
  sel.addEventListener('change', () => {
    const opt = sel.selectedOptions[0];
    if (opt) container.querySelector('#hargaModalInput').value = opt.dataset.modal || 0;
  });
  if (sel.options.length) container.querySelector('#hargaModalInput').value = sel.selectedOptions[0]?.dataset.modal || 0;

  container.querySelector('#btnAddItem').addEventListener('click', () => {
    const opt = sel.selectedOptions[0];
    if (!opt) { toast('Pilih produk dulu', 'error'); return; }
    const qty = Number(container.querySelector('#qtyInput').value) || 1;
    const hargaModal = Number(container.querySelector('#hargaModalInput').value) || 0;
    const disc = Number(container.querySelector('#discInput').value) || 0;
    draft.push({ sku: opt.value, nama: opt.textContent, qty, hargaModal, disc, netModal: (hargaModal - disc) * qty });
    renderDraft(container);
  });

  container.querySelector('#btnSimpanRit').addEventListener('click', () => simpanRit(container));
}

function renderDraft(container) {
  const el = container.querySelector('#draftList');
  const btn = container.querySelector('#btnSimpanRit');
  btn.disabled = draft.length === 0;
  if (!draft.length) { el.innerHTML = `<div class="empty-state"><p>Belum ada item</p></div>`; return; }
  el.innerHTML = draft.map((it, i) => `
    <div class="cart-item">
      <div class="info"><div class="name">${escapeHtml(it.nama)}</div><div class="price">${it.qty} x ${formatRp(it.hargaModal)}</div></div>
      <button class="btn btn-danger btn-sm" data-rm="${i}">Hapus</button>
    </div>`).join('');
  el.querySelectorAll('button[data-rm]').forEach((b) => b.addEventListener('click', () => { draft.splice(Number(b.dataset.rm), 1); renderDraft(container); }));
}

async function simpanRit(container) {
  if (!draft.length) return;
  const tgl = container.querySelector('#tglInput').value;
  const driver = container.querySelector('#driverInput').value.trim() || currentName();
  const rit = container.querySelector('#ritInput').value;
  const status = container.querySelector('#statusInput').value;
  const groupId = uid('RIT');
  const btn = container.querySelector('#btnSimpanRit');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    for (const it of draft) {
      await api('saveInputBarang', [{ id: uid('IB'), groupId, sku: it.sku, nama: it.nama, qty: it.qty, hargaModal: it.hargaModal, disc: it.disc, netModal: it.netModal, driver, rit, status, date: tgl }]);
    }
    toast(`${draft.length} item berhasil disimpan`, 'success');
    draft = [];
    renderDraft(container);
  } catch (err) { toast(err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Simpan Semua'; }
}
