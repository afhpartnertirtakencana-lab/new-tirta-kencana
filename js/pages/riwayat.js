// ============================================================
// RIWAYAT / TRANSAKSI — status bisa diganti langsung dari dropdown di
// tabel, dan tombol Edit membuka form lengkap (customer, sales, status,
// item & qty) — sama seperti versi lama. Simpan ulang otomatis meng-update
// baris yang sama di server (bukan bikin transaksi baru), karena backend
// sekarang upsert berdasarkan ID.
// ============================================================
import { api } from '../api.js';
import { formatRp, formatTanggal, toast, todayISO, escapeHtml, openModal, skeletonCards } from '../utils.js';
import { currentRole } from '../session.js';

function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().substring(0, 10); }

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
    <div class="card" style="margin-top:16px;padding:0;overflow:hidden" id="result">${skeletonCards(3)}</div>`;

  const load = async () => {
    const dateFrom = container.querySelector('#dateFrom').value;
    const dateTo = container.querySelector('#dateTo').value;
    const result = container.querySelector('#result');
    result.innerHTML = skeletonCards(3);
    const trx = await api('getTrxList', [{ dateFrom, dateTo }]);
    renderTable(result, trx.slice().reverse(), isAdmin, load);
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}

function renderTable(result, trx, isAdmin, reload) {
  if (!trx.length) { result.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Tidak ada transaksi pada rentang ini</p></div>`; return; }
  const total = trx.reduce((s, t) => s + t.nett, 0);
  result.innerHTML = `
    <div style="padding:12px 16px;color:var(--color-text-muted);font-size:var(--fs-sm);border-bottom:1px solid var(--color-border)">${trx.length} transaksi · Total ${formatRp(total)}</div>
    <div class="table-wrap"><table><thead><tr><th>ID</th><th>Tgl</th><th>Customer</th><th>Sales</th><th>Gross</th><th>Diskon</th><th>Nett</th><th>Status</th><th></th></tr></thead><tbody>
    ${trx.map((t) => `<tr data-id="${escapeHtml(t.id)}">
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--color-accent)">${escapeHtml(t.id)}</td>
      <td>${formatTanggal(t.tgl)}</td><td>${escapeHtml(t.customer || '-')}</td><td>${escapeHtml(t.sales || '-')}</td>
      <td>${formatRp(t.gross)}</td><td style="color:var(--color-danger)">${formatRp(t.diskon)}</td><td style="font-weight:700">${formatRp(t.nett)}</td>
      <td><select data-status style="font-size:11px;padding:4px 6px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface-2);color:var(--color-text)">
        <option value="cod" ${t.status === 'cod' ? 'selected' : ''}>COD</option>
        <option value="transfer" ${t.status === 'transfer' ? 'selected' : ''}>Transfer</option>
        <option value="qris" ${t.status === 'qris' ? 'selected' : ''}>QRIS</option>
        <option value="belumTransfer" ${t.status === 'belumTransfer' ? 'selected' : ''}>Belum Transfer</option>
      </select></td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" data-edit>✏️</button>
        ${isAdmin ? `<button class="btn btn-danger btn-sm" data-del>🗑</button>` : ''}
      </td>
    </tr>`).join('')}
    </tbody></table></div>`;

  result.querySelectorAll('tr[data-id]').forEach((row) => {
    const id = row.dataset.id;
    const t = trx.find((x) => x.id === id);

    row.querySelector('[data-status]').addEventListener('change', async (e) => {
      try { await api('updateStatus', [id, e.target.value]); toast('Status diperbarui', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    });

    row.querySelector('[data-edit]').addEventListener('click', () => openEditModal(t, reload));

    const delBtn = row.querySelector('[data-del]');
    if (delBtn) delBtn.addEventListener('click', async () => {
      if (!confirm(`Hapus transaksi ${id}? Tindakan tidak bisa dibatalkan.`)) return;
      try { await api('deleteTrx', [id]); toast('Transaksi dihapus', 'success'); reload(); }
      catch (err) { toast(err.message, 'error'); }
    });
  });
}

async function openEditModal(t, reload) {
  const [detail, produk] = await Promise.all([api('getTrxDetail', [t.id]), api('getProducts')]);
  const items = detail.items && detail.items.length ? detail.items : [];

  const { close } = openModal({
    title: `✏️ Edit Transaksi ${t.id}`,
    bodyHtml: `
      <form id="editTrxForm">
        <div class="field"><label>Customer</label><input name="customer" value="${escapeHtml(t.customer || '')}" required></div>
        <div class="field"><label>Sales</label><input name="sales" value="${escapeHtml(t.sales || '')}" required></div>
        <div class="field"><label>Status</label>
          <select name="status">
            <option value="cod" ${t.status === 'cod' ? 'selected' : ''}>COD</option>
            <option value="transfer" ${t.status === 'transfer' ? 'selected' : ''}>Transfer</option>
            <option value="qris" ${t.status === 'qris' ? 'selected' : ''}>QRIS</option>
            <option value="belumTransfer" ${t.status === 'belumTransfer' ? 'selected' : ''}>Belum Transfer</option>
          </select>
        </div>
        <label style="font-size:var(--fs-xs);font-weight:600;color:var(--color-text-muted);display:block;margin:10px 0 6px">Item (produk & qty bisa diubah)</label>
        <div id="editItemsWrap" style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
          ${items.length ? items.map((it, i) => `
            <div style="display:flex;gap:6px" data-item-row="${i}">
              <select data-f="sku" style="flex:2;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
                ${produk.map((p) => `<option value="${escapeHtml(p.sku)}" data-harga="${p.harga}" data-modal="${p.modal}" data-nama="${escapeHtml(p.nama)}" ${p.sku === it.sku ? 'selected' : ''}>${escapeHtml(p.nama)}</option>`).join('')}
              </select>
              <input data-f="qty" type="number" min="1" value="${it.qty}" style="width:64px;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
              <input data-f="harga" type="number" min="0" value="${it.harga}" style="width:80px;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
              <input data-f="discRpPer" type="number" min="0" value="${it.discRpPer || 0}" title="Diskon" style="width:70px;padding:8px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
            </div>`).join('') : '<p style="font-size:var(--fs-xs);color:var(--color-text-muted)">Detail item tidak tersedia (transaksi lama tanpa rincian).</p>'}
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:14px">💾 Simpan Perubahan</button>
      </form>`,
    onMount: (overlay) => {
      overlay.querySelector('#editTrxForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = e.target;
        const newItems = [...overlay.querySelectorAll('[data-item-row]')].map((row) => {
          const sel = row.querySelector('[data-f="sku"]');
          const opt = sel.selectedOptions[0];
          const qty = Number(row.querySelector('[data-f="qty"]').value) || 1;
          const harga = Number(row.querySelector('[data-f="harga"]').value) || 0;
          const discRpPer = Number(row.querySelector('[data-f="discRpPer"]').value) || 0;
          return { sku: sel.value, nama: opt?.dataset.nama || '', harga, discRpPer, modal: Number(opt?.dataset.modal) || 0, qty };
        });
        const gross = newItems.reduce((s, it) => s + it.harga * it.qty, 0);
        const diskon = newItems.reduce((s, it) => s + it.discRpPer * it.qty, 0);
        const nett = gross - diskon;
        const trxUpdated = { id: t.id, tgl: t.tgl, customer: f.customer.value.trim(), sales: f.sales.value.trim(), gross, diskon, nett, status: f.status.value, items: newItems };
        const btn = f.querySelector('button[type=submit]');
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
        try {
          await api('saveTrx', [trxUpdated]);
          toast('Transaksi berhasil diperbarui', 'success');
          close();
          reload();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.textContent = '💾 Simpan Perubahan'; }
      });
    },
  });
}
