// ============================================================
// KASIR — sesuai formula versi lama:
//   Gross      = Σ (harga × qty)
//   ItemDisc   = Σ (discRpPer × qty)
//   Diskon     = ItemDisc + DiskonGlobal
//   Nett       = Gross − Diskon + BiayaTambahan
// Harga & diskon per item BISA diedit manual (tidak selalu ikut harga
// produk), sama seperti aplikasi lama.
// ============================================================
import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { formatRp, toast, uid, todayISO, debounce, escapeHtml, skeletonCards } from '../utils.js';
import { currentName, currentRole } from '../session.js';
import { go } from '../router.js';

export async function render(container) {
  const isAdmin = currentRole() === 'admin';
  const trxId = uid('TRX');
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Kasir — Buat Invoice</h1>
    <div class="grid-cards cols-2" style="align-items:start">
      <div>
        <div class="card">
          <div class="field-row">
            <div class="field"><label>ID Transaksi</label><input value="${trxId}" readonly style="font-family:var(--font-mono);opacity:.7"></div>
            <div class="field"><label>Tanggal</label><input type="date" id="trxTgl" value="${todayISO()}"></div>
          </div>
          <div class="field"><label>Pelanggan *</label><input id="customerInput" list="customerOptions" placeholder="Nama pelanggan"><datalist id="customerOptions"></datalist></div>
          <div class="field-row">
            <div class="field"><label>Sales *</label><input id="salesInput" value="${isAdmin ? '' : currentName()}" placeholder="Nama sales"></div>
            <div class="field"><label>Status *</label>
              <select id="statusSelect"><option value="">-- Pilih --</option><option value="belumTransfer">Belum Transfer</option><option value="cod">COD</option><option value="transfer">Transfer</option><option value="qris">QRIS</option></select>
            </div>
          </div>
          <div class="field"><label>Diskon Global (Rp)</label><input type="number" id="discGlobal" value="0" min="0"></div>
        </div>

        <div class="card" style="margin-top:16px">
          <div class="card-title-row"><h2>Cari Produk</h2></div>
          <div class="field"><input id="searchProduk" placeholder="🔍 Cari produk (nama/SKU)..."></div>
          <div id="produkList">${skeletonCards(4)}</div>
        </div>

        <div class="card" style="margin-top:16px;background:var(--color-surface-2)">
          <h3>➕ Biaya Tambahan</h3>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">
            <button type="button" class="btn btn-ghost btn-sm" data-biaya-ket="Ongkir" data-biaya-jml="5000">🚚 Ongkir</button>
            <button type="button" class="btn btn-ghost btn-sm" data-biaya-ket="Tips" data-biaya-jml="2000">💰 Tips</button>
            <button type="button" class="btn btn-ghost btn-sm" data-biaya-ket="Parkir" data-biaya-jml="2000">🅿️ Parkir</button>
            <button type="button" class="btn btn-ghost btn-sm" data-biaya-ket="" data-biaya-jml="0">✕ Kosong</button>
          </div>
          <div class="field-row">
            <div class="field" style="flex:2"><label>Keterangan</label><input id="biayaKet" placeholder="mis. Ongkir"></div>
            <div class="field"><label>Jumlah</label><input type="number" id="biayaJml" value="0" min="0"></div>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-title-row"><h2>Keranjang</h2><span id="cartCount" style="font-size:var(--fs-xs);color:var(--color-text-muted)"></span></div>
          <div id="cartList"></div>
          <div style="border-top:1px solid var(--color-border);margin-top:12px;padding-top:12px">
            <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Gross</span><span id="sumGross">${formatRp(0)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--color-danger)"><span>Diskon</span><span id="sumDisc">${formatRp(0)}</span></div>
            <div id="sumBiayaRow" style="display:none;justify-content:space-between;padding:3px 0;color:var(--color-success)"><span id="sumBiayaLabel">Biaya Tambahan</span><span id="sumBiaya">${formatRp(0)}</span></div>
            <div style="display:flex;justify-content:space-between;padding:8px 0 0;font-weight:800;font-size:var(--fs-md)"><span>TOTAL NETT</span><span id="sumNett" style="color:var(--color-accent)">${formatRp(0)}</span></div>
          </div>
          <button class="btn btn-primary btn-block" id="btnSimpan" style="margin-top:16px" disabled>Simpan Transaksi</button>
        </div>
      </div>
    </div>`;

  setState({ cart: [] });

  const [produk, pelanggan] = await Promise.all([api('getProducts'), api('getCustomers')]);
  setState({ produk, pelanggan });
  container.querySelector('#customerOptions').innerHTML = pelanggan.map((p) => `<option value="${escapeHtml(p)}">`).join('');

  renderProdukList(container, produk);
  renderCart(container);

  container.querySelector('#searchProduk').addEventListener('input', debounce((e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = !q ? produk : produk.filter((p) => p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    renderProdukList(container, filtered);
  }, 200));

  container.querySelectorAll('button[data-biaya-ket]').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelector('#biayaKet').value = btn.dataset.biayaKet;
      container.querySelector('#biayaJml').value = btn.dataset.biayaJml;
      renderCart(container);
    });
  });
  ['#discGlobal', '#biayaKet', '#biayaJml'].forEach((sel) => container.querySelector(sel).addEventListener('input', () => renderCart(container)));

  container.querySelector('#btnSimpan').addEventListener('click', () => simpanTransaksi(container, trxId));
}

function renderProdukList(container, produk) {
  const el = container.querySelector('#produkList');
  if (!produk.length) { el.innerHTML = `<div class="empty-state"><p>Produk tidak ditemukan</p></div>`; return; }
  el.innerHTML = produk.map((p) => `
    <div class="cart-item">
      <div class="info"><div class="name">${escapeHtml(p.nama)}</div><div class="price">${formatRp(p.harga)} / ${escapeHtml(p.satuan)}</div></div>
      <button class="btn btn-primary btn-sm" data-sku="${escapeHtml(p.sku)}">+ Tambah</button>
    </div>`).join('');
  el.querySelectorAll('button[data-sku]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = produk.find((x) => x.sku === btn.dataset.sku);
      addToCart(container, p);
    });
  });
}

function addToCart(container, p) {
  const cart = getState().cart;
  const existing = cart.find((c) => c.sku === p.sku);
  if (existing) existing.qty += 1;
  else cart.push({ sku: p.sku, barcode: p.barcode, nama: p.nama, harga: p.harga, modal: p.modal, qty: 1, discRpPer: 0 });
  setState({ cart });
  renderCart(container);
  toast(`${p.nama} ditambahkan`, 'success');
}

function calcTotals(container) {
  const cart = getState().cart;
  const gross = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  const itemDisc = cart.reduce((s, c) => s + c.discRpPer * c.qty, 0);
  const discGlobal = Number(container.querySelector('#discGlobal')?.value) || 0;
  const biayaJml = Number(container.querySelector('#biayaJml')?.value) || 0;
  const biayaKet = container.querySelector('#biayaKet')?.value.trim() || '';
  const diskon = itemDisc + discGlobal;
  const nett = gross - diskon + biayaJml;
  return { gross, diskon, biayaJml, biayaKet, nett };
}

function renderCart(container) {
  const cart = getState().cart;
  const el = container.querySelector('#cartList');
  const countEl = container.querySelector('#cartCount');
  const btnSimpan = container.querySelector('#btnSimpan');
  countEl.textContent = cart.length ? `${cart.length} item` : '';
  btnSimpan.disabled = cart.length === 0;

  if (!cart.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><p>Keranjang masih kosong</p></div>`;
  } else {
    el.innerHTML = cart.map((c, i) => `
      <div class="cart-item" style="flex-wrap:wrap">
        <div class="info" style="min-width:120px"><div class="name">${escapeHtml(c.nama)}</div></div>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="number" min="1" value="${c.qty}" data-i="${i}" data-f="qty" style="width:50px;padding:6px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
          <input type="number" min="0" value="${c.harga}" data-i="${i}" data-f="harga" title="Harga" style="width:80px;padding:6px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
          <input type="number" min="0" value="${c.discRpPer}" data-i="${i}" data-f="discRpPer" title="Diskon per item" style="width:70px;padding:6px;border-radius:8px;border:1px solid var(--color-border);background:var(--color-surface-2);color:var(--color-text)">
          <button class="btn btn-danger btn-sm btn-icon" data-rm="${i}">✕</button>
        </div>
      </div>`).join('');
    el.querySelectorAll('input[data-i]').forEach((inp) => inp.addEventListener('input', () => {
      const i = Number(inp.dataset.i), f = inp.dataset.f;
      cart[i][f] = Number(inp.value) || 0;
      setState({ cart });
      renderCart(container);
    }));
    el.querySelectorAll('button[data-rm]').forEach((btn) => btn.addEventListener('click', () => {
      cart.splice(Number(btn.dataset.rm), 1);
      setState({ cart });
      renderCart(container);
    }));
  }

  const { gross, diskon, biayaJml, biayaKet, nett } = calcTotals(container);
  container.querySelector('#sumGross').textContent = formatRp(gross);
  container.querySelector('#sumDisc').textContent = formatRp(diskon);
  const biayaRow = container.querySelector('#sumBiayaRow');
  if (biayaJml > 0) { biayaRow.style.display = 'flex'; container.querySelector('#sumBiayaLabel').textContent = biayaKet || 'Biaya Tambahan'; container.querySelector('#sumBiaya').textContent = formatRp(biayaJml); }
  else biayaRow.style.display = 'none';
  container.querySelector('#sumNett').textContent = formatRp(nett);
}

async function simpanTransaksi(container, trxId) {
  const cart = getState().cart;
  if (!cart.length) return;
  const customer = container.querySelector('#customerInput').value.trim();
  const sales = container.querySelector('#salesInput').value.trim();
  const status = container.querySelector('#statusSelect').value;
  const tgl = container.querySelector('#trxTgl').value;
  if (!customer) { toast('Nama pelanggan wajib diisi', 'error'); return; }
  if (!sales) { toast('Sales wajib diisi', 'error'); return; }
  if (!status) { toast('Status transaksi wajib dipilih', 'error'); return; }

  const { gross, diskon, nett } = calcTotals(container);
  const trx = { id: trxId, tgl, customer, sales, gross, diskon, nett, status, items: cart };

  const btn = container.querySelector('#btnSimpan');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Menyimpan...';
  try {
    await api('saveTrx', [trx]);
    toast('Transaksi berhasil disimpan', 'success');
    setState({ cart: [] });
    go('/dashboard');
  } catch (err) {
    toast(err.message || 'Gagal menyimpan transaksi', 'error');
    btn.disabled = false; btn.textContent = 'Simpan Transaksi';
  }
}
