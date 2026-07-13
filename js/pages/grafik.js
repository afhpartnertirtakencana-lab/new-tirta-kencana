// ============================================================
// GRAFIK — tren omzet harian & perbandingan per sales.
// Dibuat manual pakai SVG (tanpa Chart.js/library eksternal) supaya
// tidak ada request tambahan ke CDN dan tetap ringan/cepat.
// ============================================================
import { api } from '../api.js';
import { formatRp, todayISO, escapeHtml, skeletonCards } from '../utils.js';

function daysAgoISO(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().substring(0, 10); }

function barChartSvg(data, { width = 640, height = 260, color = '#00A8E8' } = {}) {
  const padding = { top: 20, right: 10, bottom: 40, left: 10 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = (width - padding.left - padding.right) / data.length;
  const bars = data.map((d, i) => {
    const h = ((height - padding.top - padding.bottom) * d.value) / max;
    const x = padding.left + i * barW + barW * 0.15;
    const y = height - padding.bottom - h;
    const w = barW * 0.7;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${color}"></rect>
      <text x="${x + w / 2}" y="${height - padding.bottom + 16}" font-size="9" fill="#7ec8e3" text-anchor="middle">${escapeHtml(d.label)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;font-family:inherit">${bars}</svg>`;
}

export async function render(container) {
  container.innerHTML = `
    <h1 style="font-size:var(--fs-lg);margin-bottom:16px">Grafik</h1>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Dari</label><input type="date" id="dateFrom" value="${daysAgoISO(13)}"></div>
        <div class="field"><label>Sampai</label><input type="date" id="dateTo" value="${todayISO()}"></div>
      </div>
      <button class="btn btn-primary" id="btnFilter">Tampilkan</button>
    </div>
    <div id="result">${skeletonCards(2)}</div>`;

  const load = async () => {
    const dateFrom = container.querySelector('#dateFrom').value;
    const dateTo = container.querySelector('#dateTo').value;
    const result = container.querySelector('#result');
    result.innerHTML = skeletonCards(2);

    const [trx, rekap] = await Promise.all([
      api('getTrxList', [{ dateFrom, dateTo }]),
      api('doRekap', [{ dateFrom, dateTo }]),
    ]);

    // Tren omzet per hari
    const byDate = {};
    trx.forEach((t) => { byDate[t.tgl] = (byDate[t.tgl] || 0) + t.nett; });
    const dailyData = Object.keys(byDate).sort().map((tgl) => ({ label: tgl.substring(5), value: byDate[tgl] }));

    // Omzet per sales
    const bySales = {};
    Object.entries(rekap.perSales || {}).forEach(([sales, skuMap]) => {
      bySales[sales] = Object.values(skuMap).reduce((s, v) => s + v.total, 0);
    });
    const salesData = Object.entries(bySales).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

    if (!dailyData.length) { result.innerHTML = `<div class="card"><div class="empty-state"><p>Tidak ada data pada rentang ini</p></div></div>`; return; }

    result.innerHTML = `
      <div class="card">
        <h3>Tren Omzet Harian</h3>
        ${barChartSvg(dailyData, { color: '#00A8E8' })}
      </div>
      <div class="card" style="margin-top:16px">
        <h3>Omzet per Sales</h3>
        ${salesData.length ? barChartSvg(salesData, { color: '#FFD700' }) : '<p class="empty-state">Tidak ada data</p>'}
      </div>`;
  };
  container.querySelector('#btnFilter').addEventListener('click', load);
  load();
}
