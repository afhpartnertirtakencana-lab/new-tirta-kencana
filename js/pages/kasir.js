// ============================================================
// KASIR — buat transaksi baru. Produk & pelanggan di-fetch sekali
// saat halaman dibuka (cache 2 menit ada di SERVER, bukan browser),
// keranjang disimpan sementara di memori (state.js) selama halaman
// ini aktif saja.
// ============================================================
import { api } from '../api.js';
import { getState, setState } from '../state.js';
import { formatRp, toast, uid, todayISO, debounce, escapeHtml, skeletonCards } from '../utils.js';
import { currentName } from '../session.js';
import { go } from '../router.js';

export async function render(container) {
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Kasir</h1>
    <div class="grid-cards cols-2" style="align-items:start">
      <div>
        <div class="card">
          <div class="field"><input id="searchProduk" placeholder="🔍 Cari produk (nama/SKU)..." /></div>
          <div id="produkList">${skeletonCards(4)}</div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-title-row"><h2>Keranjang</h2><span id="cartCount" style="font-size:var(--fs-xs);color:var(--color-text-muted)"></span></div>
          <div id="cartList"></div>
          <div class="field" style="margin-top:12px">
            <label for="customerInput">Pelanggan</label>
            <input id="customerInput" list="customerOptions" placeholder="Nama pelanggan" />
            <datalist id="customerOptions"></datalist>
          </div>
          <div class="field">
            <label for="statusSelect">Status Pembayaran</label>
            <select id="statusSelect">
              <option value="belumTransfer">Belum Transfer</option>
              <option value="transfer">Transfer</option>
              <option value="cod">COD / Cash</option>
              <option value="qris">QRIS</option>
            </select>
          </div>
          <div style="display:flex;justify-content:space-between;font-weight:700;padding:12px 0;border-top:1px solid var(--color-border);margin-top:8px">
            <span>Total</span><span id="cartTotal">${formatRp(0)}</span>
          </div>
          <button class="btn btn-primary btn-block" id="btnSimpan" disabled>Simpan Transaksi</button>
        </div>
      </div>
    </div>`;

  setState({ cart: [] });

  const [produk, pelanggan] = await Promise.all([
    getState().produk || api('getProducts'),
    getState().pelanggan || api('getCustomers'),
  ]);
  setState({ produk, pelanggan });

  container.querySelector('#customerOptions').innerHTML = pelanggan.map((p) => `<option value="${escapeHtml(p)}">`).join('');

  renderProdukList(container, produk);
  renderCart(container);

  container.querySelector('#searchProduk').addEventListener('input', debounce((e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = !q ? produk : produk.filter((p) => p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    renderProdukList(container, filtered);
  }, 200));

  container.querySelector('#btnSimpan').addEventListener('click', () => simpanTransaksi(container));
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

function renderCart(container) {
  const cart = getState().cart;
  const el = container.querySelector('#cartList');
  const countEl = container.querySelector('#cartCount');
  const totalEl = container.querySelector('#cartTotal');
  const btnSimpan = container.querySelector('#btnSimpan');
  countEl.textContent = cart.length ? `${cart.length} item` : '';
  btnSimpan.disabled = cart.length === 0;

  if (!cart.length) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🛒</div><p>Keranjang masih kosong</p></div>`;
    totalEl.textContent = formatRp(0);
    return;
  }
  el.innerHTML = cart.map((c, i) => `
    <div class="cart-item">
      <div class="info"><div class="name">${escapeHtml(c.nama)}</div><div class="price">${formatRp(c.harga)}</div></div>
      <div class="qty-stepper">
        <button data-act="minus" data-i="${i}">−</button>
        <span>${c.qty}</span>
        <button data-act="plus" data-i="${i}">+</button>
      </div>
    </div>`).join('');
  el.querySelectorAll('button[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      if (btn.dataset.act === 'plus') cart[i].qty += 1;
      else { cart[i].qty -= 1; if (cart[i].qty <= 0) cart.splice(i, 1); }
      setState({ cart });
      renderCart(container);
    });
  });
  const total = cart.reduce((s, c) => s + (c.harga - c.discRpPer) * c.qty, 0);
  totalEl.textContent = formatRp(total);
}

async function simpanTransaksi(container) {
  const cart = getState().cart;
  if (!cart.length) return;
  const customer = container.querySelector('#customerInput').value.trim() || 'Umum';
  const status = container.querySelector('#statusSelect').value;
  const gross = cart.reduce((s, c) => s + c.harga * c.qty, 0);
  const nett = cart.reduce((s, c) => s + (c.harga - c.discRpPer) * c.qty, 0);

  const trx = { id: uid('TRX'), tgl: todayISO(), customer, sales: currentName(), gross, diskon: gross - nett, nett, status, items: cart };

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
