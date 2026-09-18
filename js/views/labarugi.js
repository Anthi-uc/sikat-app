// labarugi.js â€” Modul Laporan Keuangan SIKAT
// 6 tab: Laba Rugi | Arus Kas | Neraca | CALK | Buku Kas | Cetak

import { StorageService }    from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { ChartManager }      from '../charts.js';
import { showNotification }  from '../app.js';
import { generateId }        from '../storage.js';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SHARED HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const _BULAN_NAMA = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

const _TABS = [
  { id: 'labarugi',  icon: 'ðŸ“Š', label: 'Laba Rugi'  },
  { id: 'aruskas',   icon: 'ðŸ’¸', label: 'Arus Kas'   },
  { id: 'neraca',    icon: 'âš–ï¸',  label: 'Neraca'     },
  { id: 'calk',      icon: 'ðŸ“', label: 'CALK'       },
  { id: 'bukukas',   icon: 'ðŸ“’', label: 'Buku Kas'   },
  { id: 'cetak',     icon: 'ðŸ–¨ï¸',  label: 'Cetak'      },
];

function fRp(n)  { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
function fDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function escH(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function isIncome(jenis) {
  return jenis === 'penjualan_telur' || jenis === 'penjualan_lain';
}
function jenisLabel(jenis, keterangan) {
  const MAP = {
    penjualan_telur: 'Penjualan Telur',
    penjualan_lain:  'Penjualan Lain',
    pembelian_pakan: 'Pembelian Pakan',
    biaya_lain:      'Biaya Lain',
  };
  const base = MAP[jenis] ?? jenis;
  return keterangan ? `${base}: ${keterangan}` : base;
}

// Month prefix 'YYYY-MM'
function monthPrefix(year, month) {
  return `${year}-${String(month + 1).padStart(2,'0')}`;
}

// Filter transactions to a month
function txForMonth(txs, year, month) {
  const pfx = monthPrefix(year, month);
  return txs.filter(t => t.tanggal.startsWith(pfx));
}

// Sort transactions oldest-first
function sortOldest(arr) {
  return [...arr].sort((a, b) =>
    a.tanggal.localeCompare(b.tanggal) || (a.createdAt||'').localeCompare(b.createdAt||''));
}

// Print KOP header HTML (used inside print-only divs)
function kopHTML(judulLaporan, periode) {
  return `
    <div class="print-kop">
      <h2>BUMKam Torei Natei</h2>
      <h3>${judulLaporan}</h3>
      <p>Periode: ${periode}</p>
      <p>Kampung Yakonde</p>
    </div>`;
}

// Signature block
function ttdHTML() {
  const today = new Date();
  const tgl   = `Yakonde, ${today.getDate()} ${_BULAN_NAMA[today.getMonth()]} ${today.getFullYear()}`;
  return `
    <div class="tanda-tangan-grid">
      <div class="tanda-tangan-box">
        <p class="ttd-label">Mengetahui,<br>Kepala BUMKam Torei Natei</p>
        <div class="ttd-space"></div>
        <p class="ttd-name">( ________________________ )</p>
      </div>
      <div class="tanda-tangan-box">
        <p class="ttd-label">Dibuat oleh,<br>Bendahara / Admin SIKAT</p>
        <div class="ttd-space"></div>
        <p class="ttd-name">${tgl}</p>
      </div>
    </div>`;
}

// Toolbar with print button
function toolbarHTML(tabId, bulanLabel) {
  return `
    <div class="laporan-toolbar no-print">
      <div></div>
      <div class="laporan-toolbar-right">
        <button class="btn btn-outline btn-sm" id="btn-export-excel-${tabId}" title="Export ke Excel">
          ðŸ“¥ Excel
        </button>
        <button class="btn btn-primary btn-sm" id="btn-cetak-${tabId}" title="Cetak laporan ini">
          ðŸ–¨ï¸ Cetak
        </button>
      </div>
    </div>`;
}

// Month navigator HTML
function monthNavHTML(idPrefix, year, month, nowYear, nowMonth) {
  const isNow = year === nowYear && month === nowMonth;
  return `
    <div class="month-nav no-print" id="${idPrefix}-nav">
      <button class="month-nav-btn" id="${idPrefix}-prev" aria-label="Bulan sebelumnya">&#8592;</button>
      <span class="month-nav-label" id="${idPrefix}-label">${_BULAN_NAMA[month]} ${year}</span>
      <button class="month-nav-btn" id="${idPrefix}-next" ${isNow ? 'disabled' : ''} aria-label="Bulan berikutnya">&#8594;</button>
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MODULE STATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const _now = new Date();
let _activeTab  = 'labarugi';
let _lrYear     = _now.getFullYear();
let _lrMonth    = _now.getMonth();
let _akYear     = _now.getFullYear();
let _akMonth    = _now.getMonth();
let _neYear     = _now.getFullYear();
let _neMonth    = _now.getMonth();
let _calkYear   = _now.getFullYear();
let _calkMonth  = _now.getMonth();
let _bkYear     = _now.getFullYear();
let _bkMonth    = _now.getMonth();
// Buku Kas edit state
let _bkEditId   = null;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RENDER â€” Shell (tabs + panel)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function render(params = {}) {
  // Reset state on fresh navigation
  _activeTab = params.tab ?? 'labarugi';
  _lrYear = _akYear = _neYear = _calkYear = _bkYear = _now.getFullYear();
  _lrMonth = _akMonth = _neMonth = _calkMonth = _bkMonth = _now.getMonth();
  _bkEditId = null;

  const tabsHTML = _TABS.map(t => `
    <button class="laporan-tab-btn${_activeTab === t.id ? ' active' : ''}"
            data-tab="${t.id}" aria-selected="${_activeTab === t.id}"
            role="tab" aria-controls="panel-${t.id}">
      ${t.icon} ${t.label}
    </button>`).join('');

  return `
    <div class="welcome-card">
      <div class="icon">ðŸ“‹</div>
      <h2>Laporan Keuangan</h2>
      <p>BUMKam Torei Natei â€” Sistem Informasi Kas Ayam Ternak</p>
    </div>

    <div role="tablist" aria-label="Tab Laporan" class="laporan-tabs">
      ${tabsHTML}
    </div>

    <div class="laporan-panel-wrap" id="laporan-panel">
      ${_renderPanel(_activeTab)}
    </div>
  `;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PANEL DISPATCHER
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function _renderPanel(tab) {
  switch (tab) {
    case 'labarugi': return _renderLabarugi();
    case 'aruskas':  return _renderArusKas();
    case 'neraca':   return _renderNeraca();
    case 'calk':     return _renderCalk();
    case 'bukukas':  return _renderBukuKas();
    case 'cetak':    return _renderCetak();
    default:         return '<p>Tab tidak ditemukan.</p>';
  }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 1 â€” LABA RUGI
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function _calcLabarugi(year, month) {
  const txs     = StorageService.getTransactions();
  const start   = new Date(year, month, 1, 0, 0, 0);
  const end     = new Date(year, month + 1, 0, 23, 59, 59);
  const laporan = CalculationEngine.getLaporanPeriode(txs, start, end);
  const margin  = CalculationEngine.getMarginKeuntungan(laporan.untungBersih, laporan.totalPenjualan);

  // Penjualan Lain
  const pfx         = monthPrefix(year, month);
  const penjualanLain = txs
    .filter(t => t.tanggal.startsWith(pfx) && t.jenis === 'penjualan_lain')
    .reduce((s,t) => s+t.nominal, 0);
  const totalPendapatan = laporan.totalPenjualan + penjualanLain;
  const laba = totalPendapatan - laporan.totalPakan - laporan.totalBiayaLain;

  return { laporan, penjualanLain, totalPendapatan, laba, margin };
}

function _renderLabarugi() {
  const { laporan, penjualanLain, totalPendapatan, laba, margin } = _calcLabarugi(_lrYear, _lrMonth);
  const labaClass = laba > 0 ? 'kredit' : laba < 0 ? 'debit' : '';
  const bulanLabel = `${_BULAN_NAMA[_lrMonth]} ${_lrYear}`;

  return `
    <div id="print-area-labarugi" class="laporan-print-area">
      <div class="print-only">${kopHTML('Laporan Laba Rugi', bulanLabel)}</div>

      ${toolbarHTML('labarugi', bulanLabel)}
      ${monthNavHTML('lr', _lrYear, _lrMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">ðŸ“Š Laba Rugi â€” ${bulanLabel}</p>

      <table class="laporan-table">
        <thead><tr><th>Keterangan</th><th class="text-right">Jumlah</th></tr></thead>
        <tbody id="tbody-lr">
          <tr><td colspan="2" style="font-weight:600;color:var(--color-text-muted);font-size:var(--font-size-xs);padding-top:var(--space-3)">PENDAPATAN</td></tr>
          <tr><td style="padding-left:var(--space-4)">Penjualan Telur</td>
              <td class="text-right kredit">${fRp(laporan.totalPenjualan)}</td></tr>
          <tr><td style="padding-left:var(--space-4)">Penjualan Lain</td>
              <td class="text-right kredit">${fRp(penjualanLain)}</td></tr>
          <tr class="row-total"><td>Total Pendapatan</td>
              <td class="text-right kredit">${fRp(totalPendapatan)}</td></tr>

          <tr><td colspan="2" style="font-weight:600;color:var(--color-text-muted);font-size:var(--font-size-xs);padding-top:var(--space-3)">BEBAN</td></tr>
          <tr><td style="padding-left:var(--space-4)">Pembelian Pakan</td>
              <td class="text-right debit">${fRp(laporan.totalPakan)}</td></tr>
          <tr><td style="padding-left:var(--space-4)">Biaya Lain-lain</td>
              <td class="text-right debit">${fRp(laporan.totalBiayaLain)}</td></tr>
          <tr class="row-total"><td>Total Beban</td>
              <td class="text-right debit">${fRp(laporan.totalPakan + laporan.totalBiayaLain)}</td></tr>

          <tr class="row-total">
            <td style="font-size:var(--font-size-base)">Laba / Rugi Bersih</td>
            <td class="text-right ${labaClass}" style="font-size:var(--font-size-base)">${fRp(laba)}</td>
          </tr>
        </tbody>
      </table>

      <div style="background:var(--color-teal-light);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center;margin-bottom:var(--space-5)">
        <p style="font-size:var(--font-size-xs);font-weight:700;color:#134e4a;margin-bottom:4px;">MARGIN KEUNTUNGAN</p>
        <p style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-teal);">${margin.toFixed(2)}%</p>
      </div>

      <!-- Chart -->
      <p class="laporan-section-title no-print">ðŸ“ˆ Grafik Pendapatan vs Beban (4 Bulan)</p>
      <div class="chart-container no-print" style="height:220px">
        <canvas id="chart-lr" aria-label="Grafik Laba Rugi"></canvas>
      </div>

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 2 â€” ARUS KAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function _renderArusKas() {
  const txs          = StorageService.getTransactions();
  const allSorted    = sortOldest(txs);
  const bulanLabel   = `${_BULAN_NAMA[_akMonth]} ${_akYear}`;

  // Running balance up to start of this month
  const pfx     = monthPrefix(_akYear, _akMonth);
  const before  = allSorted.filter(t => t.tanggal < pfx);
  const saldoAwal = before.reduce((s,t) => isIncome(t.jenis) ? s+t.nominal : s-t.nominal, 0);

  const monthTxs = allSorted.filter(t => t.tanggal.startsWith(pfx));

  let rows = '';
  let running = saldoAwal;
  monthTxs.forEach(t => {
    const inc  = isIncome(t.jenis) ? t.nominal : 0;
    const exp  = isIncome(t.jenis) ? 0 : t.nominal;
    running += inc - exp;
    const saldoClass = running >= 0 ? 'saldo-positif' : 'saldo-negatif';
    rows += `
      <tr>
        <td>${fDate(t.tanggal)}</td>
        <td>${escH(jenisLabel(t.jenis, t.keterangan))}</td>
        <td>${escH(t.lokasi)}</td>
        <td class="text-right kredit">${inc > 0 ? fRp(inc) : 'â€”'}</td>
        <td class="text-right debit">${exp > 0 ? fRp(exp) : 'â€”'}</td>
        <td class="text-right ${saldoClass}">${fRp(running)}</td>
      </tr>`;
  });

  const isEmpty = monthTxs.length === 0;

  return `
    <div id="print-area-aruskas" class="laporan-print-area">
      <div class="print-only">${kopHTML('Laporan Arus Kas', bulanLabel)}</div>

      ${toolbarHTML('aruskas', bulanLabel)}
      ${monthNavHTML('ak', _akYear, _akMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">ðŸ’¸ Arus Kas â€” ${bulanLabel}</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
        <div class="summary-box" style="padding:var(--space-3)">
          <p class="summary-box-title" style="font-size:var(--font-size-xs)">Saldo Awal Bulan</p>
          <p style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-navy)">${fRp(saldoAwal)}</p>
        </div>
        <div class="summary-box" style="padding:var(--space-3)">
          <p class="summary-box-title" style="font-size:var(--font-size-xs)">Saldo Akhir Bulan</p>
          <p style="font-size:var(--font-size-xl);font-weight:700;color:${running>=0?'var(--color-teal)':'var(--color-danger)'}">${fRp(running)}</p>
        </div>
      </div>

      ${isEmpty
        ? '<div class="empty-state"><div class="empty-state-icon">ðŸ’¸</div><p class="empty-state-message">Belum ada transaksi bulan ini</p></div>'
        : `<div style="overflow-x:auto">
            <table class="laporan-table" id="tabel-aruskas">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Lokasi</th>
                  <th class="text-right">Kas Masuk</th>
                  <th class="text-right">Kas Keluar</th>
                  <th class="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr style="font-style:italic;color:var(--color-text-muted)">
                  <td>â€”</td><td colspan="4">Saldo Awal</td>
                  <td class="text-right ${saldoAwal>=0?'saldo-positif':'saldo-negatif'}">${fRp(saldoAwal)}</td>
                </tr>
                ${rows}
              </tbody>
            </table>
           </div>`
      }

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 3 â€” NERACA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function _renderNeraca() {
  const bulanLabel = `${_BULAN_NAMA[_neMonth]} ${_neYear}`;
  const settings   = StorageService.getSettings();
  const txs        = StorageService.getTransactions();
  const prods      = StorageService.getProductions();

  // Kas = saldo sampai akhir bulan yang dipilih
  const endOfMonth = `${_neYear}-${String(_neMonth+1).padStart(2,'0')}-31`;
  const txsUpTo    = txs.filter(t => t.tanggal <= endOfMonth);
  const kas        = txsUpTo.reduce((s,t) => isIncome(t.jenis) ? s+t.nominal : s-t.nominal, 0);

  // Nilai stok: stok butir Ã— hargaJualPerButir
  const stok        = StorageService.getStokTelur();
  const nilaiStok   = stok * settings.hargaJualPerButir;

  const totalAset      = Math.max(0, kas) + nilaiStok;
  const totalKewajiban = 0; // default; bisa dikembangkan
  const modal          = totalAset - totalKewajiban;

  return `
    <div id="print-area-neraca" class="laporan-print-area">
      <div class="print-only">${kopHTML('Neraca (Posisi Keuangan)', bulanLabel)}</div>

      ${toolbarHTML('neraca', bulanLabel)}
      ${monthNavHTML('ne', _neYear, _neMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">âš–ï¸ Neraca â€” per akhir ${bulanLabel}</p>

      <div class="neraca-grid">
        <div class="neraca-box neraca-box-aset">
          <p class="neraca-box-label">Aset Lancar</p>
          <p class="neraca-box-amount">${fRp(totalAset)}</p>
          <p class="neraca-box-sub">Kas: ${fRp(Math.max(0,kas))}</p>
          <p class="neraca-box-sub">Stok Telur: ${fRp(nilaiStok)}</p>
          <p class="neraca-box-sub" style="font-size:0.65rem;opacity:0.7">(${stok.toLocaleString('id-ID')} butir Ã— ${fRp(settings.hargaJualPerButir)})</p>
        </div>
        <div class="neraca-box neraca-box-kewajiban">
          <p class="neraca-box-label">Kewajiban</p>
          <p class="neraca-box-amount">${fRp(totalKewajiban)}</p>
          <p class="neraca-box-sub">Tidak ada kewajiban tercatat</p>
        </div>
      </div>

      <div class="neraca-box neraca-box-modal" style="margin-bottom:var(--space-5)">
        <p class="neraca-box-label">Modal / Ekuitas</p>
        <p class="neraca-box-amount">${fRp(modal)}</p>
        <p class="neraca-box-sub">Modal = Aset âˆ’ Kewajiban</p>
      </div>

      <table class="laporan-table">
        <thead><tr><th>Pos</th><th class="text-right">Jumlah</th></tr></thead>
        <tbody>
          <tr><td>Kas &amp; Setara Kas</td><td class="text-right">${fRp(Math.max(0,kas))}</td></tr>
          <tr><td>Nilai Persediaan Telur</td><td class="text-right">${fRp(nilaiStok)}</td></tr>
          <tr class="row-total"><td>Total Aset</td><td class="text-right">${fRp(totalAset)}</td></tr>
          <tr><td>Total Kewajiban</td><td class="text-right">${fRp(totalKewajiban)}</td></tr>
          <tr class="row-total"><td>Modal Bersih</td><td class="text-right">${fRp(modal)}</td></tr>
        </tbody>
      </table>

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 4 â€” CALK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function _renderCalk() {
  const bulanLabel = `${_BULAN_NAMA[_calkMonth]} ${_calkYear}`;
  const settings   = StorageService.getSettings();
  const txs        = StorageService.getTransactions();
  const prods      = StorageService.getProductions();
  const stok       = StorageService.getStokTelur();

  // Produksi bulan ini
  const pfx       = monthPrefix(_calkYear, _calkMonth);
  const prodsMonth = prods.filter(p => p.tanggal.startsWith(pfx));
  const totalButir = prodsMonth.reduce((s,p) => s + (p.jumlahButir ?? p.jumlahRak * settings.isiPerRak), 0);
  const totalRak   = prodsMonth.reduce((s,p) => s + p.jumlahRak, 0);

  // Biaya lain terbesar
  const biayaLain = txs
    .filter(t => t.tanggal.startsWith(pfx) && t.jenis === 'biaya_lain')
    .sort((a,b) => b.nominal - a.nominal);
  const topBiaya = biayaLain.slice(0,3);

  // Penjualan telur bulan ini
  const penjualan = txs.filter(t => t.tanggal.startsWith(pfx) && isIncome(t.jenis));
  const totalJual = penjualan.reduce((s,t) => s+t.nominal, 0);

  const items = [
    {
      title: 'Dasar Penyusunan Laporan',
      body:  `Laporan keuangan ini disusun menggunakan <strong>basis kas</strong> (cash basis), 
              artinya pendapatan dan beban diakui pada saat kas diterima atau dibayarkan. 
              Laporan mencakup periode <strong>${bulanLabel}</strong>.`,
    },
    {
      title: 'Kebijakan Pencatatan Produksi',
      body:  `Konversi produksi: <strong>1 rak = ${settings.isiPerRak} butir</strong>. 
              Bulan ini tercatat <strong>${totalRak} rak</strong> 
              (â‰ˆ <strong>${totalButir.toLocaleString('id-ID')} butir</strong>) dari 
              ${prodsMonth.length} entri produksi.`,
    },
    {
      title: 'Persediaan Telur',
      body:  `Saldo persediaan telur per saat ini: <strong>${stok.toLocaleString('id-ID')} butir</strong> 
              (â‰ˆ ${(stok / settings.isiPerRak).toFixed(1)} rak). 
              Dinilai berdasarkan harga jual <strong>${fRp(settings.hargaJualPerButir)}/butir</strong>, 
              total nilai persediaan: <strong>${fRp(stok * settings.hargaJualPerButir)}</strong>.`,
    },
    {
      title: 'Pendapatan',
      body:  penjualan.length > 0
        ? `Total pendapatan bulan ini <strong>${fRp(totalJual)}</strong> dari 
           ${penjualan.length} transaksi, terdiri atas penjualan telur dan penjualan lainnya.`
        : `Tidak ada pendapatan yang tercatat pada bulan ${bulanLabel}.`,
    },
    {
      title: 'Rincian Biaya Lain-lain',
      body:  biayaLain.length === 0
        ? `Tidak ada biaya lain-lain yang tercatat pada bulan ${bulanLabel}.`
        : topBiaya.map(t =>
            `â€¢ <strong>${escH(t.keterangan || 'Tidak berketerangan')}</strong> â€” ${fRp(t.nominal)} 
             (${fDate(t.tanggal)}, ${escH(t.lokasi)})`
          ).join('<br>') + (biayaLain.length > 3
            ? `<br>... dan ${biayaLain.length - 3} entri lainnya.` : ''),
    },
    {
      title: 'Catatan Lain',
      body:  `Semua data disimpan secara lokal di perangkat pengguna (LocalStorage). 
              Tidak ada transfer data ke server eksternal. 
              Laporan ini dicetak oleh sistem <strong>SIKAT</strong> â€” 
              Sistem Informasi Kas Ayam Ternak, BUMKam Torei Natei.`,
    },
  ];

  const listHTML = items.map((item, i) => `
    <li class="calk-item">
      <span class="calk-item-num">${i + 1}</span>
      <div class="calk-item-text">
        <strong>${item.title}</strong><br>
        <span>${item.body}</span>
      </div>
    </li>`).join('');

  return `
    <div id="print-area-calk" class="laporan-print-area">
      <div class="print-only">${kopHTML('Catatan atas Laporan Keuangan (CALK)', bulanLabel)}</div>

      ${toolbarHTML('calk', bulanLabel)}
      ${monthNavHTML('calk', _calkYear, _calkMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">ðŸ“ CALK â€” ${bulanLabel}</p>
      <ul class="calk-list" id="calk-list">${listHTML}</ul>

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 5 â€” BUKU KAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function _renderBukuKas() {
  const bulanLabel = `${_BULAN_NAMA[_bkMonth]} ${_bkYear}`;
  const txs        = sortOldest(StorageService.getTransactions());
  const pfx        = monthPrefix(_bkYear, _bkMonth);

  const before     = txs.filter(t => t.tanggal < pfx);
  const saldoAwal  = before.reduce((s,t) => isIncome(t.jenis) ? s+t.nominal : s-t.nominal, 0);
  const monthTxs   = txs.filter(t => t.tanggal.startsWith(pfx));

  let rows  = '';
  let saldo = saldoAwal;
  monthTxs.forEach(t => {
    const debit  = isIncome(t.jenis) ? 0 : t.nominal;
    const kredit = isIncome(t.jenis) ? t.nominal : 0;
    saldo += kredit - debit;
    const sc = saldo >= 0 ? 'saldo-positif' : 'saldo-negatif';
    rows += `
      <tr data-tx-id="${escH(t.id)}">
        <td>${fDate(t.tanggal)}</td>
        <td>${escH(jenisLabel(t.jenis, t.keterangan))}</td>
        <td>${escH(t.lokasi)}</td>
        <td class="text-right debit">${debit  > 0 ? fRp(debit)  : 'â€”'}</td>
        <td class="text-right kredit">${kredit > 0 ? fRp(kredit) : 'â€”'}</td>
        <td class="text-right ${sc}">${fRp(saldo)}</td>
        <td class="no-print">
          <div class="buku-kas-actions">
            <button class="btn-edit-tx"   data-id="${escH(t.id)}" title="Edit">âœï¸</button>
            <button class="btn-delete-tx" data-id="${escH(t.id)}" title="Hapus">ðŸ—‘ï¸</button>
          </div>
        </td>
      </tr>`;
  });

  return `
    <div id="print-area-bukukas" class="laporan-print-area">
      <div class="print-only">${kopHTML('Buku Kas', bulanLabel)}</div>

      ${toolbarHTML('bukukas', bulanLabel)}
      ${monthNavHTML('bk', _bkYear, _bkMonth, _now.getFullYear(), _now.getMonth())}

      <div class="laporan-toolbar no-print" style="margin-top:0;margin-bottom:var(--space-3)">
        <button class="btn btn-primary btn-sm" id="btn-tambah-bk">âž• Tambah Transaksi Baru</button>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted)">
          Saldo Awal Bulan: <strong>${fRp(saldoAwal)}</strong>
        </span>
      </div>

      <!-- Edit form slot -->
      <div id="bk-edit-slot"></div>

      <p class="laporan-section-title">ðŸ“’ Buku Kas â€” ${bulanLabel}</p>

      ${monthTxs.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">ðŸ“’</div><p class="empty-state-message">Belum ada transaksi bulan ini</p></div>'
        : `<div style="overflow-x:auto">
            <table class="laporan-table" id="tabel-bukukas">
              <thead>
                <tr>
                  <th>Tanggal</th><th>Keterangan</th><th>Lokasi</th>
                  <th class="text-right">Debit (âˆ’)</th>
                  <th class="text-right">Kredit (+)</th>
                  <th class="text-right">Saldo</th>
                  <th class="no-print text-center">Aksi</th>
                </tr>
              </thead>
              <tbody id="tbody-bukukas">
                <tr style="font-style:italic;color:var(--color-text-muted)">
                  <td>â€”</td><td colspan="4">Saldo Awal Bulan</td>
                  <td class="text-right ${saldoAwal>=0?'saldo-positif':'saldo-negatif'}">${fRp(saldoAwal)}</td>
                  <td class="no-print"></td>
                </tr>
                ${rows}
              </tbody>
            </table>
           </div>`
      }

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// â”€â”€ Buku Kas edit form HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _buildBkEditFormHTML(tx) {
  const OPTS = [
    { val: 'penjualan_telur', lbl: 'Penjualan Telur' },
    { val: 'penjualan_lain',  lbl: 'Penjualan Lain' },
    { val: 'pembelian_pakan', lbl: 'Pembelian Pakan' },
    { val: 'biaya_lain',      lbl: 'Biaya Lain' },
  ];
  const opts    = OPTS.map(o => `<option value="${o.val}"${tx.jenis===o.val?' selected':''}>${o.lbl}</option>`).join('');
  const needsKet = tx.jenis === 'biaya_lain' || tx.jenis === 'penjualan_lain';

  return `
    <div class="inline-edit-form" id="bk-edit-card">
      <h4>âœï¸ ${tx.id ? 'Edit' : 'Tambah'} Transaksi</h4>
      <div class="form-group">
        <label class="form-label" for="bk-jenis">Jenis</label>
        <select class="form-control" id="bk-jenis">${opts}</select>
      </div>
      <div class="form-group" id="bk-group-ket" style="${needsKet?'':'display:none'}">
        <label class="form-label" for="bk-keterangan" id="bk-label-ket">
          ${tx.jenis==='penjualan_lain'?'Nama Penjualan':'Nama/Jenis Biaya'}
        </label>
        <input class="form-control" type="text" id="bk-keterangan"
          value="${escH(tx.keterangan||'')}" maxlength="100">
      </div>
      <div class="form-group">
        <label class="form-label" for="bk-tanggal">Tanggal</label>
        <input class="form-control" type="date" id="bk-tanggal" value="${escH(tx.tanggal||'')}">
      </div>
      <div class="form-group">
        <label class="form-label" for="bk-lokasi">Lokasi</label>
        <input class="form-control" type="text" id="bk-lokasi" value="${escH(tx.lokasi||'')}" maxlength="100">
      </div>
      <div class="form-group">
        <label class="form-label" for="bk-nominal">Nominal (Rp)</label>
        <input class="form-control" type="number" id="bk-nominal" min="1" max="999999999999" value="${tx.nominal||''}">
      </div>
      <div class="inline-edit-actions">
        <button class="btn btn-primary" id="bk-save">ðŸ’¾ Simpan</button>
        <button class="btn btn-outline"  id="bk-cancel">Batal</button>
      </div>
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 6 â€” CETAK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function _renderCetak() {
  return `
    <p class="laporan-section-title">ðŸ–¨ï¸ Pratinjau &amp; Cetak Laporan</p>
    <p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin-bottom:var(--space-5)">
      Pilih laporan yang ingin dicetak, lalu klik tombol Cetak. 
      Halaman akan membuka dialog cetak browser. Pilih "Simpan sebagai PDF" untuk menyimpan file.
    </p>

    <div style="display:grid;gap:var(--space-3)">
      ${[
        { tab: 'labarugi', label: 'ðŸ“Š Laba Rugi',             desc: 'Tabel pendapatan, beban, dan laba bersih' },
        { tab: 'aruskas',  label: 'ðŸ’¸ Arus Kas',              desc: 'Pergerakan kas masuk/keluar + saldo berjalan' },
        { tab: 'neraca',   label: 'âš–ï¸ Neraca',                desc: 'Posisi aset, kewajiban, dan modal' },
        { tab: 'calk',     label: 'ðŸ“ CALK',                  desc: 'Catatan atas Laporan Keuangan' },
        { tab: 'bukukas',  label: 'ðŸ“’ Buku Kas',              desc: 'Semua transaksi dengan saldo berjalan' },
      ].map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    background:var(--color-bg);border:1px solid var(--color-border);
                    border-radius:var(--radius-lg);padding:var(--space-4);gap:var(--space-3)">
          <div>
            <p style="font-weight:700;margin-bottom:2px">${item.label}</p>
            <p style="font-size:var(--font-size-xs);color:var(--color-text-muted)">${item.desc}</p>
          </div>
          <button class="btn btn-primary btn-sm btn-goto-print" data-tab="${item.tab}"
                  style="flex-shrink:0">ðŸ–¨ï¸ Cetak</button>
        </div>`).join('')}
    </div>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ATTACH LISTENERS â€” main entry point
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export function attachListeners(params = {}) {
  _activeTab = params.tab ?? _activeTab;

  // â”€â”€ Tab switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  document.querySelectorAll('.laporan-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.getAttribute('data-tab');
      // Update active class
      document.querySelectorAll('.laporan-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === _activeTab);
        b.setAttribute('aria-selected', b.getAttribute('data-tab') === _activeTab);
      });
      // Re-render panel
      const panel = document.getElementById('laporan-panel');
      if (panel) {
        panel.innerHTML = _renderPanel(_activeTab);
        _attachPanelListeners(_activeTab);
      }
    });
  });

  // Attach listeners for the initial panel
  _attachPanelListeners(_activeTab);
}

// â”€â”€â”€ Panel-specific listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _attachPanelListeners(tab) {
  switch (tab) {
    case 'labarugi': _listenLabarugi(); break;
    case 'aruskas':  _listenArusKas();  break;
    case 'neraca':   _listenNeraca();   break;
    case 'calk':     _listenCalk();     break;
    case 'bukukas':  _listenBukuKas();  break;
    case 'cetak':    _listenCetak();    break;
  }
}

// â”€â”€â”€ Shared: month nav helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _attachMonthNav(prefix, getYear, getMonth, setYear, setMonth, onRefresh) {
  const prevBtn = document.getElementById(`${prefix}-prev`);
  const nextBtn = document.getElementById(`${prefix}-next`);
  const label   = document.getElementById(`${prefix}-label`);

  prevBtn?.addEventListener('click', () => {
    let m = getMonth() - 1, y = getYear();
    if (m < 0) { m = 11; y--; }
    setYear(y); setMonth(m);
    if (label) label.textContent = `${_BULAN_NAMA[m]} ${y}`;
    const nowOk = y === _now.getFullYear() && m === _now.getMonth();
    if (nextBtn) nextBtn.disabled = nowOk;
    onRefresh();
  });

  nextBtn?.addEventListener('click', () => {
    let m = getMonth(), y = getYear();
    if (y === _now.getFullYear() && m === _now.getMonth()) return;
    m++; if (m > 11) { m = 0; y++; }
    setYear(y); setMonth(m);
    if (label) label.textContent = `${_BULAN_NAMA[m]} ${y}`;
    const nowOk = y === _now.getFullYear() && m === _now.getMonth();
    if (nextBtn) nextBtn.disabled = nowOk;
    onRefresh();
  });
}

// â”€â”€â”€ Shared: print trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _triggerPrint(printAreaId) {
  const area = document.getElementById(printAreaId);
  if (!area) { console.warn('[Print] Area not found:', printAreaId); return; }

  // Remove stale portal
  let portal = document.getElementById('print-portal');
  if (portal) portal.remove();

  // Build fresh portal at <body> level (top-level, outside app-shell)
  portal = document.createElement('div');
  portal.id = 'print-portal';
  portal.style.cssText = 'display:none;font-family:Segoe UI,Arial,sans-serif;font-size:11pt;color:#000;background:#fff;padding:1cm;';
  portal.innerHTML = area.innerHTML;

  // Make print-only sections visible inside portal
  portal.querySelectorAll('.print-only').forEach(el => { el.style.display = 'block'; });
  // Hide screen-only UI chrome inside portal
  portal.querySelectorAll('.no-print,.laporan-tabs,.laporan-toolbar,.month-nav').forEach(el => { el.style.display = 'none'; });
  portal.querySelectorAll('button,.btn,.welcome-card').forEach(el => { el.style.display = 'none'; });

  document.body.appendChild(portal);
  document.body.classList.add('is-printing');

  // Clean up after print dialog closes
  const cleanup = () => {
    document.body.classList.remove('is-printing');
    const p = document.getElementById('print-portal');
    if (p) p.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  window.print();
}

// â”€â”€â”€ Shared: Excel export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _exportExcel(rows, sheetName, fileName) {
  if (typeof window === 'undefined' || typeof window.XLSX === 'undefined') {
    alert('Library Excel (SheetJS) belum tersedia. Pastikan terhubung ke internet.');
    return;
  }
  const ws = window.XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = rows[0].map(() => ({ wch: 18 }));
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
  window.XLSX.writeFile(wb, fileName);
}

function _todayStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

// â”€â”€â”€ Tab 1: Laba Rugi listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _listenLabarugi() {
  _attachMonthNav('lr',
    () => _lrYear, () => _lrMonth,
    (y) => { _lrYear = y; }, (m) => { _lrMonth = m; },
    () => {
      const panel = document.getElementById('laporan-panel');
      if (panel) { panel.innerHTML = _renderPanel('labarugi'); _listenLabarugi(); }
    }
  );

  // Weekly chart (4 months rolling)
  try {
    const txs  = StorageService.getTransactions();
    const data = CalculationEngine.getDataGrafikMingguan(txs, 4);
    ChartManager.renderWeeklyChart('chart-lr', data);
  } catch(e) { /* chart optional */ }

  document.getElementById('btn-cetak-labarugi')?.addEventListener('click', () => _triggerPrint('print-area-labarugi'));

  document.getElementById('btn-export-excel-labarugi')?.addEventListener('click', () => {
    const { laporan, penjualanLain, totalPendapatan, laba, margin } = _calcLabarugi(_lrYear, _lrMonth);
    const bl = `${_BULAN_NAMA[_lrMonth]}-${_lrYear}`;
    _exportExcel([
      ['BUMKam Torei Natei â€” Laporan Laba Rugi', '', ''],
      ['Periode', bl, ''],
      [''],
      ['Keterangan', 'Jumlah (Rp)', ''],
      ['Penjualan Telur', laporan.totalPenjualan],
      ['Penjualan Lain',  penjualanLain],
      ['Total Pendapatan',totalPendapatan],
      ['Pembelian Pakan', laporan.totalPakan],
      ['Biaya Lain-lain', laporan.totalBiayaLain],
      ['Laba/Rugi Bersih',laba],
      ['Margin (%)',      margin.toFixed(2)],
    ], 'LabaRugi', `SIKAT_LabaRugi_${bl}_${_todayStr()}.xlsx`);
  });
}

// â”€â”€â”€ Tab 2: Arus Kas listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _listenArusKas() {
  _attachMonthNav('ak',
    () => _akYear, () => _akMonth,
    (y) => { _akYear = y; }, (m) => { _akMonth = m; },
    () => {
      const panel = document.getElementById('laporan-panel');
      if (panel) { panel.innerHTML = _renderPanel('aruskas'); _listenArusKas(); }
    }
  );

  document.getElementById('btn-cetak-aruskas')?.addEventListener('click', () => _triggerPrint('print-area-aruskas'));

  document.getElementById('btn-export-excel-aruskas')?.addEventListener('click', () => {
    const txs       = sortOldest(StorageService.getTransactions());
    const pfx       = monthPrefix(_akYear, _akMonth);
    const before    = txs.filter(t => t.tanggal < pfx);
    let saldo       = before.reduce((s,t) => isIncome(t.jenis)?s+t.nominal:s-t.nominal, 0);
    const monthTxs  = txs.filter(t => t.tanggal.startsWith(pfx));
    const bl        = `${_BULAN_NAMA[_akMonth]}-${_akYear}`;

    const rows = [
      ['BUMKam Torei Natei â€” Laporan Arus Kas', '','','','',''],
      ['Periode', bl,'','','',''],
      [''],
      ['Tanggal','Keterangan','Lokasi','Kas Masuk','Kas Keluar','Saldo'],
      ['â€”','Saldo Awal','','','',saldo],
    ];
    monthTxs.forEach(t => {
      const inc = isIncome(t.jenis) ? t.nominal : 0;
      const exp = isIncome(t.jenis) ? 0 : t.nominal;
      saldo += inc - exp;
      rows.push([fDate(t.tanggal), jenisLabel(t.jenis,t.keterangan), t.lokasi, inc||'', exp||'', saldo]);
    });
    _exportExcel(rows, 'ArusKas', `SIKAT_ArusKas_${bl}_${_todayStr()}.xlsx`);
  });
}

// â”€â”€â”€ Tab 3: Neraca listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _listenNeraca() {
  _attachMonthNav('ne',
    () => _neYear, () => _neMonth,
    (y) => { _neYear = y; }, (m) => { _neMonth = m; },
    () => {
      const panel = document.getElementById('laporan-panel');
      if (panel) { panel.innerHTML = _renderPanel('neraca'); _listenNeraca(); }
    }
  );

  document.getElementById('btn-cetak-neraca')?.addEventListener('click', () => _triggerPrint('print-area-neraca'));

  document.getElementById('btn-export-excel-neraca')?.addEventListener('click', () => {
    const settings   = StorageService.getSettings();
    const txs        = StorageService.getTransactions();
    const stok       = StorageService.getStokTelur();
    const end        = `${_neYear}-${String(_neMonth+1).padStart(2,'0')}-31`;
    const txsUpTo    = txs.filter(t => t.tanggal <= end);
    const kas        = Math.max(0, txsUpTo.reduce((s,t)=>isIncome(t.jenis)?s+t.nominal:s-t.nominal,0));
    const nilaiStok  = stok * settings.hargaJualPerButir;
    const totalAset  = kas + nilaiStok;
    const modal      = totalAset;
    const bl         = `${_BULAN_NAMA[_neMonth]}-${_neYear}`;
    _exportExcel([
      ['BUMKam Torei Natei â€” Neraca',''],
      ['Per akhir', bl],[''],
      ['Pos','Jumlah (Rp)'],
      ['Kas & Setara Kas', kas],
      ['Nilai Persediaan Telur', nilaiStok],
      ['Total Aset', totalAset],
      ['Total Kewajiban', 0],
      ['Modal Bersih', modal],
    ], 'Neraca', `SIKAT_Neraca_${bl}_${_todayStr()}.xlsx`);
  });
}

// â”€â”€â”€ Tab 4: CALK listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _listenCalk() {
  _attachMonthNav('calk',
    () => _calkYear, () => _calkMonth,
    (y) => { _calkYear = y; }, (m) => { _calkMonth = m; },
    () => {
      const panel = document.getElementById('laporan-panel');
      if (panel) { panel.innerHTML = _renderPanel('calk'); _listenCalk(); }
    }
  );

  document.getElementById('btn-cetak-calk')?.addEventListener('click', () => _triggerPrint('print-area-calk'));

  document.getElementById('btn-export-excel-calk')?.addEventListener('click', () => {
    showNotification('CALK berformat narasi â€” gunakan Cetak untuk menyimpan sebagai PDF.', 'info', 4000);
  });
}

// â”€â”€â”€ Tab 5: Buku Kas listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _listenBukuKas() {
  _attachMonthNav('bk',
    () => _bkYear, () => _bkMonth,
    (y) => { _bkYear = y; }, (m) => { _bkMonth = m; },
    () => {
      const panel = document.getElementById('laporan-panel');
      if (panel) { panel.innerHTML = _renderPanel('bukukas'); _listenBukuKas(); }
    }
  );

  document.getElementById('btn-cetak-bukukas')?.addEventListener('click', () => _triggerPrint('print-area-bukukas'));

  document.getElementById('btn-export-excel-bukukas')?.addEventListener('click', () => {
    const txs      = sortOldest(StorageService.getTransactions());
    const pfx      = monthPrefix(_bkYear, _bkMonth);
    const before   = txs.filter(t => t.tanggal < pfx);
    let saldo      = before.reduce((s,t)=>isIncome(t.jenis)?s+t.nominal:s-t.nominal,0);
    const monthTxs = txs.filter(t => t.tanggal.startsWith(pfx));
    const bl       = `${_BULAN_NAMA[_bkMonth]}-${_bkYear}`;
    const rows = [
      ['BUMKam Torei Natei â€” Buku Kas','','','','',''],
      ['Periode', bl,'','','',''],[''],
      ['Tanggal','Keterangan','Lokasi','Debit (âˆ’)','Kredit (+)','Saldo'],
      ['â€”','Saldo Awal','','','',saldo],
    ];
    monthTxs.forEach(t => {
      const d = isIncome(t.jenis)?0:t.nominal;
      const k = isIncome(t.jenis)?t.nominal:0;
      saldo += k - d;
      rows.push([fDate(t.tanggal), jenisLabel(t.jenis,t.keterangan), t.lokasi, d||'', k||'', saldo]);
    });
    _exportExcel(rows, 'BukuKas', `SIKAT_BukuKas_${bl}_${_todayStr()}.xlsx`);
  });

  // Tambah transaksi baru
  document.getElementById('btn-tambah-bk')?.addEventListener('click', () => {
    _bkEditId = null;
    const slot = document.getElementById('bk-edit-slot');
    if (!slot) return;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    slot.innerHTML = _buildBkEditFormHTML({ jenis:'penjualan_telur', tanggal:todayStr, lokasi:'', nominal:'', keterangan:'' });
    slot.scrollIntoView({ behavior:'smooth', block:'nearest' });
    _attachBkFormListeners(null);
  });

  // Delegation: edit/delete on tbody
  const tbody = document.getElementById('tbody-bukukas');
  if (tbody) _attachBkTableListeners(tbody);
}

function _attachBkTableListeners(tbody) {
  const clone = tbody.cloneNode(true);
  tbody.parentNode.replaceChild(clone, tbody);
  clone.addEventListener('click', (e) => {
    const editBtn   = e.target.closest('.btn-edit-tx');
    const deleteBtn = e.target.closest('.btn-delete-tx');
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      const tx = StorageService.getTransactions().find(t => t.id === id);
      if (!tx) return;
      if (_bkEditId === id) { _closeBkForm(); return; }
      _bkEditId = id;
      const slot = document.getElementById('bk-edit-slot');
      if (slot) {
        slot.innerHTML = _buildBkEditFormHTML(tx);
        slot.scrollIntoView({ behavior:'smooth', block:'nearest' });
        _attachBkFormListeners(tx);
      }
    }
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (!confirm('Hapus transaksi ini? Tindakan tidak dapat dibatalkan.')) return;
      const ok = StorageService.deleteTransaction(id);
      if (ok) {
        showNotification('Transaksi dihapus.', 'success', 3000);
        const panel = document.getElementById('laporan-panel');
        if (panel) { panel.innerHTML = _renderPanel('bukukas'); _listenBukuKas(); }
      } else {
        showNotification('Gagal menghapus transaksi.', 'error');
      }
    }
  });
}

function _closeBkForm() {
  const slot = document.getElementById('bk-edit-slot');
  if (slot) slot.innerHTML = '';
  _bkEditId = null;
}

function _attachBkFormListeners(originalTx) {
  // Jenis change â†’ toggle keterangan
  document.getElementById('bk-jenis')?.addEventListener('change', (e) => {
    const jenis    = e.target.value;
    const group    = document.getElementById('bk-group-ket');
    const lbl      = document.getElementById('bk-label-ket');
    const needsKet = jenis === 'biaya_lain' || jenis === 'penjualan_lain';
    if (group) group.style.display = needsKet ? '' : 'none';
    if (lbl) lbl.textContent = jenis === 'penjualan_lain' ? 'Nama Penjualan' : 'Nama/Jenis Biaya';
  });

  document.getElementById('bk-cancel')?.addEventListener('click', _closeBkForm);

  document.getElementById('bk-save')?.addEventListener('click', () => {
    const jenis      = document.getElementById('bk-jenis')?.value || '';
    const tanggal    = document.getElementById('bk-tanggal')?.value || '';
    const lokasi     = (document.getElementById('bk-lokasi')?.value || '').trim();
    const nominal    = Number(document.getElementById('bk-nominal')?.value || 0);
    const keterangan = (document.getElementById('bk-keterangan')?.value || '').trim();
    const needsKet   = jenis === 'biaya_lain' || jenis === 'penjualan_lain';

    if (!jenis)          { showNotification('Pilih jenis transaksi.', 'warning', 3000); return; }
    if (!tanggal)        { showNotification('Tanggal wajib diisi.', 'warning', 3000); return; }
    if (!lokasi)         { showNotification('Lokasi wajib diisi.', 'warning', 3000); return; }
    if (nominal < 1)     { showNotification('Nominal harus > 0.', 'warning', 3000); return; }
    if (needsKet && !keterangan) { showNotification('Keterangan wajib diisi.', 'warning', 3000); return; }

    const updates = { jenis, tanggal, lokasi, nominal };
    if (needsKet) updates.keterangan = keterangan;

    if (originalTx) {
      StorageService.updateTransaction(originalTx.id, updates);
      showNotification('Transaksi diperbarui.', 'success', 3000);
    } else {
      const settings = StorageService.getSettings();
      const tx = { id: generateId(), ...updates, createdAt: new Date().toISOString() };
      if (jenis === 'penjualan_telur') {
        tx.jumlahRak   = 0;
        tx.jumlahButir = 0;
      }
      StorageService.saveTransaction(tx);
      showNotification('Transaksi disimpan.', 'success', 3000);
    }

    const panel = document.getElementById('laporan-panel');
    if (panel) { panel.innerHTML = _renderPanel('bukukas'); _listenBukuKas(); }
  });
}

// â”€â”€â”€ Tab 6: Cetak listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function _listenCetak() {
  document.querySelectorAll('.btn-goto-print').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      // Switch to the target tab, then print
      _activeTab = targetTab;
      document.querySelectorAll('.laporan-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === targetTab);
        b.setAttribute('aria-selected', b.getAttribute('data-tab') === targetTab);
      });
      const panel = document.getElementById('laporan-panel');
      if (panel) {
        panel.innerHTML = _renderPanel(targetTab);
        _attachPanelListeners(targetTab);
        // Give DOM a tick to render, then print
        setTimeout(() => _triggerPrint(`print-area-${targetTab}`), 150);
      }
    });
  });
}
