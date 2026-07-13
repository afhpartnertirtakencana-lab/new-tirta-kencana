// ============================================================
// REKAP INPUT — qty & status bisa diedit langsung inline (dropdown
// Kiriman/Titipan), sama seperti versi lama. Hapus untuk admin.
// ============================================================
import { api } from '../api.js';
import { formatRp, formatTanggal, toast, todayISO, escapeHtml, skeletonCards } from '../utils.js';
import { currentRole } from '../session.js';

function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().substring(0, 10); }

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Rekap Input Barang</h1>
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
    const list = await api('getInputBarangHistory', [{ dateFrom, dateTo }]);
    renderTable(result, list.slice().reverse(), isAdmin, load);
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}

function renderTable(result, list, isAdmin, reload) {
  if (!list.length) { result.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>Tidak ada input barang pada rentang ini</p></div>`; return; }

  result.innerHTML = `<div class="table-wrap"><table style="font-size:12px">
    <thead><tr><th>Tanggal</th><th>Produk</th><th>Qty</th><th>Disc</th><th>Harga Modal</th><th>Net Modal</th><th>Driver</th><th>Rit</th><th>Status</th>${isAdmin ? '<th></th>' : ''}</tr></thead>
    <tbody>${list.map((it) => {
      const netModal = (it.hargaModal - it.disc) * it.qty;
      return `<tr data-id="${escapeHtml(it.id)}">
        <td>${formatTanggal(it.date)}</td>
        <td>${escapeHtml(it.nama)}</td>
        <td><input type="number" min="1" value="${it.qty}" data-qty style="width:56px;padding:4px 6px;font-size:12px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface-2);color:var(--color-text)"></td>
        <td>${formatRp(it.disc)}</td>
        <td>${formatRp(it.hargaModal)}</td>
        <td data-netmodal style="font-weight:700;color:var(--color-accent)">${formatRp(netModal)}</td>
        <td>${escapeHtml(it.driver)}</td>
        <td>${escapeHtml(it.rit)}</td>
        <td><select data-status style="font-size:11px;padding:4px 6px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface-2);color:var(--color-text)">
          <option value="kiriman" ${it.status === 'kiriman' ? 'selected' : ''}>Kiriman</option>
          <option value="titipan" ${it.status === 'titipan' ? 'selected' : ''}>Titipan</option>
        </select></td>
        ${isAdmin ? `<td><button class="btn btn-danger btn-sm" data-del>🗑</button></td>` : ''}
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  result.querySelectorAll('tr[data-id]').forEach((row) => {
    const id = row.dataset.id;
    const item = list.find((it) => it.id === id);
    const qtyInput = row.querySelector('[data-qty]');
    const statusSelect = row.querySelector('[data-status]');

    qtyInput.addEventListener('change', async () => {
      const qty = Number(qtyInput.value) || 0;
      row.querySelector('[data-netmodal]').textContent = formatRp((item.hargaModal - item.disc) * qty);
      try { await api('updateInputBarang', [{ id, qty }]); toast('Qty diperbarui', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    });
    statusSelect.addEventListener('change', async () => {
      try { await api('updateInputBarang', [{ id, status: statusSelect.value }]); toast('Status diperbarui', 'success'); }
      catch (err) { toast(err.message, 'error'); }
    });
    const delBtn = row.querySelector('[data-del]');
    if (delBtn) delBtn.addEventListener('click', async () => {
      if (!confirm('Hapus data ini?')) return;
      try { await api('deleteInputBarang', [id]); toast('Data dihapus', 'success'); reload(); }
      catch (err) { toast(err.message, 'error'); }
    });
  });
}
