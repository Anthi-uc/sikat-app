// labarugi.js — Modul Laporan Keuangan SIKAT
// 6 tab: Laba Rugi | Arus Kas | Neraca | CALK | Buku Kas | Cetak
// Menggunakan Engine Akuntansi Terpadu (COA & Jurnal) dan Form Bersama

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { ChartManager } from '../charts.js';
import { showNotification } from '../app.js';
import { generateId } from '../storage.js';
import {
  CATEGORIES,
  findCategoryAndSub,
  isIncome as checkIsIncome,
  normalizeTransaction,
} from '../categories.js';
import {
  renderTransactionForm,
  attachTransactionFormListeners,
} from '../transaction-form.js';

// ═══════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

const _BULAN_NAMA = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

const _TABS = [
  { id: 'labarugi',  icon: '📊', label: 'Laba Rugi'  },
  { id: 'aruskas',   icon: '💸', label: 'Arus Kas'   },
  { id: 'neraca',    icon: '⚖️',  label: 'Neraca'     },
  { id: 'calk',      icon: '📝', label: 'CALK'       },
  { id: 'bukukas',   icon: '📒', label: 'Buku Kas'   },
  { id: 'cetak',     icon: '🖨️',  label: 'Cetak'      },
];

function fRp(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function fDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function escH(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isIncome(txOrJenis) {
  return checkIsIncome(txOrJenis);
}

function monthPrefix(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function sortOldest(arr) {
  return [...arr].sort((a, b) =>
    a.tanggal.localeCompare(b.tanggal) || (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function getTxDisplayInfo(t) {
  const norm = normalizeTransaction(t);
  const matched = findCategoryAndSub(norm.kategori, norm.subKategori);
  const icon = matched?.subcategory?.icon || (isIncome(norm) ? '💰' : '💸');
  const catName = matched?.subcategory?.name || norm.subKategori || norm.jenis || 'Transaksi';
  let desc = `${icon} ${catName}`;
  if (norm.keterangan && norm.keterangan !== catName) {
    desc += ` — ${norm.keterangan}`;
  }
  return {
    icon,
    catName,
    desc,
    kategori: norm.kategori,
    subKategori: norm.subKategori,
    kuantitas: norm.kuantitas || 1,
    satuan: norm.satuan || 'unit',
    hargaSatuan: norm.hargaSatuan || norm.nominal,
  };
}

function kopHTML(judulLaporan, periode) {
  return `
    <div class="print-kop">
      <h2>BUMKam Torei Natei</h2>
      <h3>${judulLaporan}</h3>
      <p>Periode: ${periode}</p>
      <p>Kampung Yakonde</p>
    </div>`;
}

function ttdHTML() {
  const today = new Date();
  const tgl = `Yakonde, ${today.getDate()} ${_BULAN_NAMA[today.getMonth()]} ${today.getFullYear()}`;
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

function toolbarHTML(tabId, bulanLabel) {
  return `
    <div class="laporan-toolbar no-print">
      <div></div>
      <div class="laporan-toolbar-right">
        <button class="btn btn-outline btn-sm" id="btn-export-excel-${tabId}" title="Export ke Excel">
          📥 Excel
        </button>
        <button class="btn btn-primary btn-sm" id="btn-cetak-${tabId}" title="Cetak laporan ini">
          🖨️ Cetak
        </button>
      </div>
    </div>`;
}

function monthNavHTML(idPrefix, year, month, nowYear, nowMonth) {
  const isNow = year === nowYear && month === nowMonth;
  return `
    <div class="month-nav no-print" id="${idPrefix}-nav">
      <button class="month-nav-btn" id="${idPrefix}-prev" aria-label="Bulan sebelumnya">&#8592;</button>
      <span class="month-nav-label" id="${idPrefix}-label">${_BULAN_NAMA[month]} ${year}</span>
      <button class="month-nav-btn" id="${idPrefix}-next" ${isNow ? 'disabled' : ''} aria-label="Bulan berikutnya">&#8594;</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// MODULE STATE
// ═══════════════════════════════════════════════════════════════

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
let _bkEditId   = null;

// ═══════════════════════════════════════════════════════════════
// RENDER — Shell (tabs + panel)
// ═══════════════════════════════════════════════════════════════

export function render(params = {}) {
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
      <div class="icon">📋</div>
      <h2>Laporan Keuangan</h2>
      <p>BUMKam Torei Natei — Sistem Informasi Kas Ayam Ternak</p>
    </div>

    <div role="tablist" aria-label="Tab Laporan" class="laporan-tabs">
      ${tabsHTML}
    </div>

    <div class="laporan-panel-wrap" id="laporan-panel">
      ${_renderPanel(_activeTab)}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// PANEL DISPATCHER
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// TAB 1 — LABA RUGI
// ═══════════════════════════════════════════════════════════════

function _renderLabarugi() {
  const txs = StorageService.getTransactions();
  const lr = CalculationEngine.calculateLabaRugi(txs, _lrYear, _lrMonth);
  const bulanLabel = `${_BULAN_NAMA[_lrMonth]} ${_lrYear}`;
  const labaClass = lr.labaBersih > 0 ? 'kredit' : lr.labaBersih < 0 ? 'debit' : '';

  return `
    <div id="print-area-labarugi" class="laporan-print-area">
      <div class="print-only">${kopHTML('Laporan Laba Rugi', bulanLabel)}</div>

      ${toolbarHTML('labarugi', bulanLabel)}
      ${monthNavHTML('lr', _lrYear, _lrMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">📊 Laba Rugi — ${bulanLabel}</p>

      <div class="laporan-table-wrap table-responsive">
        <table class="laporan-table">
          <thead>
            <tr><th>Keterangan</th><th class="text-right">Jumlah</th></tr>
          </thead>
          <tbody id="tbody-lr">
            <tr>
              <td colspan="2" style="font-weight:700;color:var(--color-navy);font-size:var(--font-size-xs);padding-top:var(--space-3);background:var(--color-bg)">
                1. PENDAPATAN OPERASIONAL
              </td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Penjualan Telur</td>
              <td class="text-right kredit">${fRp(lr.pendapatan.penjualanTelur)}</td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Penjualan Ayam / Afkir</td>
              <td class="text-right kredit">${fRp(lr.pendapatan.penjualanAyam)}</td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Penjualan Lainnya</td>
              <td class="text-right kredit">${fRp(lr.pendapatan.penjualanLain)}</td>
            </tr>
            <tr class="row-total">
              <td>Total Pendapatan</td>
              <td class="text-right kredit">${fRp(lr.pendapatan.totalPendapatan)}</td>
            </tr>

            <tr>
              <td colspan="2" style="font-weight:700;color:var(--color-navy);font-size:var(--font-size-xs);padding-top:var(--space-4);background:var(--color-bg)">
                2. BEBAN OPERASIONAL
              </td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Beban Pakan Ayam</td>
              <td class="text-right debit">${fRp(lr.beban.bebanPakan)}</td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Beban Obat & Vaksin</td>
              <td class="text-right debit">${fRp(lr.beban.bebanObat)}</td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Beban Perlengkapan Kandang</td>
              <td class="text-right debit">${fRp(lr.beban.bebanPerlengkapan)}</td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Beban Kebersihan & Sanitasi</td>
              <td class="text-right debit">${fRp(lr.beban.bebanSanitasi)}</td>
            </tr>
            <tr>
              <td style="padding-left:var(--space-4)">Beban Operasional Lain-lain</td>
              <td class="text-right debit">${fRp(lr.beban.bebanLain)}</td>
            </tr>
            <tr class="row-total">
              <td>Total Beban Operasional</td>
              <td class="text-right debit">${fRp(lr.beban.totalBeban)}</td>
            </tr>

            <tr class="row-total" style="border-top:3px double var(--color-navy);background:rgba(13,148,136,0.06);">
              <td style="font-size:var(--font-size-base);font-weight:800;">LABA / (RUGI) BERSIH</td>
              <td class="text-right ${labaClass}" style="font-size:var(--font-size-base);font-weight:800;">${fRp(lr.labaBersih)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background:var(--color-teal-light);border-radius:var(--radius-lg);padding:var(--space-4);text-align:center;margin-bottom:var(--space-5)">
        <p style="font-size:var(--font-size-xs);font-weight:700;color:#134e4a;margin-bottom:4px;">MARGIN KEUNTUNGAN BERSIH</p>
        <p style="font-size:var(--font-size-3xl);font-weight:800;color:var(--color-teal);">${lr.marginKeuntungan.toFixed(2)}%</p>
      </div>

      <!-- Chart -->
      <p class="laporan-section-title no-print">📈 Grafik Pendapatan vs Beban (4 Bulan)</p>
      <div class="chart-container no-print" style="height:220px">
        <canvas id="chart-lr" aria-label="Grafik Laba Rugi"></canvas>
      </div>

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 2 — ARUS KAS
// ═══════════════════════════════════════════════════════════════

function _renderArusKas() {
  const txs = StorageService.getTransactions();
  const bulanLabel = `${_BULAN_NAMA[_akMonth]} ${_akYear}`;
  const pfx = monthPrefix(_akYear, _akMonth);

  const before = txs.filter(t => t.tanggal < pfx);
  const saldoAwal = before.reduce((s, t) => isIncome(t) ? s + (t.nominal || 0) : s - (t.nominal || 0), 0);
  const ak = CalculationEngine.calculateArusKas(txs, _akYear, _akMonth, saldoAwal);

  let rows = '';
  ak.transactions.forEach(t => {
    const streamBadge = `<span class="badge-stream badge-${t.stream}">${t.stream}</span>`;
    const sc = t.runningSaldo >= 0 ? 'saldo-positif' : 'saldo-negatif';
    rows += `
      <tr>
        <td>${fDate(t.date)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            ${streamBadge}
            <span>${escH(t.description)}</span>
          </div>
        </td>
        <td>${escH(t.location)}</td>
        <td class="text-right kredit">${t.masuk > 0 ? fRp(t.masuk) : '—'}</td>
        <td class="text-right debit">${t.keluar > 0 ? fRp(t.keluar) : '—'}</td>
        <td class="text-right ${sc}">${fRp(t.runningSaldo)}</td>
      </tr>`;
  });

  const isEmpty = ak.transactions.length === 0;

  return `
    <div id="print-area-aruskas" class="laporan-print-area">
      <div class="print-only">${kopHTML('Laporan Arus Kas', bulanLabel)}</div>

      ${toolbarHTML('aruskas', bulanLabel)}
      ${monthNavHTML('ak', _akYear, _akMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">💸 Arus Kas — ${bulanLabel}</p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:var(--space-3);margin-bottom:var(--space-4)">
        <div class="summary-box" style="padding:var(--space-3)">
          <p class="summary-box-title" style="font-size:var(--font-size-xs)">Saldo Awal Bulan</p>
          <p style="font-size:var(--font-size-xl);font-weight:700;color:var(--color-navy)">${fRp(ak.saldoAwal)}</p>
        </div>
        <div class="summary-box" style="padding:var(--space-3)">
          <p class="summary-box-title" style="font-size:var(--font-size-xs)">Kenaikan / Penurunan Kas</p>
          <p style="font-size:var(--font-size-xl);font-weight:700;color:${ak.kenaikanBersih >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">
            ${ak.kenaikanBersih >= 0 ? '+' : ''}${fRp(ak.kenaikanBersih)}
          </p>
        </div>
        <div class="summary-box" style="padding:var(--space-3)">
          <p class="summary-box-title" style="font-size:var(--font-size-xs)">Saldo Akhir Bulan</p>
          <p style="font-size:var(--font-size-xl);font-weight:700;color:${ak.saldoAkhir >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">${fRp(ak.saldoAkhir)}</p>
        </div>
      </div>

      <!-- Ringkasan per Aktivitas -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:var(--space-3);margin-bottom:var(--space-5)">
        <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="badge-stream badge-operasi">Operasi</span>
            <strong style="color:${ak.arusOperasi.bersih >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">${fRp(ak.arusOperasi.bersih)}</strong>
          </div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin:0;">
            Masuk: ${fRp(ak.arusOperasi.masuk)} | Keluar: ${fRp(ak.arusOperasi.keluar)}
          </p>
        </div>

        <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="badge-stream badge-investasi">Investasi</span>
            <strong style="color:${ak.arusInvestasi.bersih >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">${fRp(ak.arusInvestasi.bersih)}</strong>
          </div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin:0;">
            Masuk: ${fRp(ak.arusInvestasi.masuk)} | Keluar: ${fRp(ak.arusInvestasi.keluar)}
          </p>
        </div>

        <div style="background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span class="badge-stream badge-pendanaan">Pendanaan</span>
            <strong style="color:${ak.arusPendanaan.bersih >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">${fRp(ak.arusPendanaan.bersih)}</strong>
          </div>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin:0;">
            Masuk: ${fRp(ak.arusPendanaan.masuk)} | Keluar: ${fRp(ak.arusPendanaan.keluar)}
          </p>
        </div>
      </div>

      ${isEmpty
        ? '<div class="empty-state"><div class="empty-state-icon">💸</div><p class="empty-state-message">Belum ada transaksi arus kas bulan ini</p></div>'
        : `<div class="laporan-table-wrap table-responsive">
            <table class="laporan-table" id="tabel-aruskas">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan Transaksi</th>
                  <th>Lokasi</th>
                  <th class="text-right">Kas Masuk</th>
                  <th class="text-right">Kas Keluar</th>
                  <th class="text-right">Saldo Kas</th>
                </tr>
              </thead>
              <tbody>
                <tr style="font-style:italic;color:var(--color-text-muted)">
                  <td>—</td><td colspan="4">Saldo Awal Kas</td>
                  <td class="text-right ${saldoAwal >= 0 ? 'saldo-positif' : 'saldo-negatif'}">${fRp(saldoAwal)}</td>
                </tr>
                ${rows}
              </tbody>
            </table>
           </div>`
      }

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 3 — NERACA
// ═══════════════════════════════════════════════════════════════

function _renderNeraca() {
  const bulanLabel = `${_BULAN_NAMA[_neMonth]} ${_neYear}`;
  const settings   = StorageService.getSettings();
  const txs        = StorageService.getTransactions();
  const prods      = StorageService.getProductions();

  const endOfMonth = `${_neYear}-${String(_neMonth + 1).padStart(2, '0')}-31`;
  const ne = CalculationEngine.calculateNeraca(txs, prods, settings, endOfMonth);

  return `
    <div id="print-area-neraca" class="laporan-print-area">
      <div class="print-only">${kopHTML('Neraca (Posisi Keuangan)', bulanLabel)}</div>

      ${toolbarHTML('neraca', bulanLabel)}
      ${monthNavHTML('ne', _neYear, _neMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">⚖️ Neraca — per akhir ${bulanLabel}</p>

      <!-- Indikator Keseimbangan Akuntansi -->
      <div class="neraca-balance-badge ${ne.balance ? 'balance-ok' : 'balance-diff'}">
        <span>${ne.balance ? '✅' : '⚠️'}</span>
        <div>
          <strong>${ne.balance ? 'Neraca Seimbang (Balance)' : 'Neraca Belum Seimbang'}</strong>
          <p style="margin:0;font-size:var(--font-size-xs);opacity:0.9;">
            Total Aset (${fRp(ne.aset.totalAset)}) = Kewajiban (${fRp(ne.kewajiban.totalKewajiban)}) + Ekuitas (${fRp(ne.ekuitas.totalEkuitas)})
          </p>
        </div>
      </div>

      <div class="neraca-grid">
        <div class="neraca-box neraca-box-aset">
          <p class="neraca-box-label">Total Aset</p>
          <p class="neraca-box-amount">${fRp(ne.aset.totalAset)}</p>
          <p class="neraca-box-sub">Aset Lancar: ${fRp(ne.aset.lancar.totalLancar)}</p>
          <p class="neraca-box-sub">Aset Tetap (Peralatan): ${fRp(ne.aset.tetap.totalTetap)}</p>
        </div>

        <div class="neraca-box neraca-box-kewajiban">
          <p class="neraca-box-label">Total Kewajiban</p>
          <p class="neraca-box-amount">${fRp(ne.kewajiban.totalKewajiban)}</p>
          <p class="neraca-box-sub">Utang Usaha: ${fRp(ne.kewajiban.utangUsaha)}</p>
          <p class="neraca-box-sub">Utang Bank / Lain: ${fRp(ne.kewajiban.utangBank + ne.kewajiban.utangLain)}</p>
        </div>
      </div>

      <div class="neraca-box neraca-box-modal" style="margin-bottom:var(--space-5)">
        <p class="neraca-box-label">Total Ekuitas / Modal Bersih</p>
        <p class="neraca-box-amount">${fRp(ne.ekuitas.totalEkuitas)}</p>
        <p class="neraca-box-sub">
          Modal Disetor: ${fRp(ne.ekuitas.modalAwal + ne.ekuitas.tambahanModal + ne.ekuitas.penyertaanDesa + ne.ekuitas.modalLain)} |
          Akumulasi Laba: ${fRp(ne.ekuitas.akumulasiLaba)}
        </p>
      </div>

      <div class="laporan-table-wrap table-responsive">
        <table class="laporan-table">
          <thead><tr><th>Pos Akun</th><th class="text-right">Jumlah</th></tr></thead>
          <tbody>
            <tr><td colspan="2" style="font-weight:700;color:var(--color-navy);font-size:var(--font-size-xs);background:var(--color-bg)">ASET LANCAR</td></tr>
            <tr><td style="padding-left:var(--space-4)">Kas &amp; Setara Kas</td><td class="text-right">${fRp(ne.aset.lancar.kas)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Persediaan Telur Ayam</td><td class="text-right">${fRp(ne.aset.lancar.persediaanTelur)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Persediaan Ayam Ternak</td><td class="text-right">${fRp(ne.aset.lancar.persediaanAyam)}</td></tr>
            <tr class="row-total"><td>Total Aset Lancar</td><td class="text-right kredit">${fRp(ne.aset.lancar.totalLancar)}</td></tr>

            <tr><td colspan="2" style="font-weight:700;color:var(--color-navy);font-size:var(--font-size-xs);background:var(--color-bg)">ASET TETAP</td></tr>
            <tr><td style="padding-left:var(--space-4)">Peralatan Kandang</td><td class="text-right">${fRp(ne.aset.tetap.peralatanKandang)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Mesin / Alat Produksi</td><td class="text-right">${fRp(ne.aset.tetap.mesinProduksi)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Kendaraan Operasional</td><td class="text-right">${fRp(ne.aset.tetap.kendaraan)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Peralatan Lainnya</td><td class="text-right">${fRp(ne.aset.tetap.peralatanLain)}</td></tr>
            <tr class="row-total"><td>Total Aset Tetap</td><td class="text-right kredit">${fRp(ne.aset.tetap.totalTetap)}</td></tr>

            <tr class="row-total" style="background:rgba(13,148,136,0.08);font-size:var(--font-size-base)">
              <td><strong>TOTAL ASET</strong></td>
              <td class="text-right kredit"><strong>${fRp(ne.aset.totalAset)}</strong></td>
            </tr>

            <tr><td colspan="2" style="font-weight:700;color:var(--color-navy);font-size:var(--font-size-xs);background:var(--color-bg)">KEWAJIBAN (UTANG)</td></tr>
            <tr><td style="padding-left:var(--space-4)">Utang Usaha</td><td class="text-right">${fRp(ne.kewajiban.utangUsaha)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Utang Bank / Pinjaman</td><td class="text-right">${fRp(ne.kewajiban.utangBank)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Utang Lainnya</td><td class="text-right">${fRp(ne.kewajiban.utangLain)}</td></tr>
            <tr class="row-total"><td>Total Kewajiban</td><td class="text-right debit">${fRp(ne.kewajiban.totalKewajiban)}</td></tr>

            <tr><td colspan="2" style="font-weight:700;color:var(--color-navy);font-size:var(--font-size-xs);background:var(--color-bg)">EKUITAS (MODAL)</td></tr>
            <tr><td style="padding-left:var(--space-4)">Modal Awal Disetor</td><td class="text-right">${fRp(ne.ekuitas.modalAwal)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Tambahan Modal</td><td class="text-right">${fRp(ne.ekuitas.tambahanModal)}</td></tr>
            <tr><td style="padding-left:var(--space-4)">Penyertaan Modal Desa</td><td class="text-right">${fRp(ne.ekuitas.penyertaanDesa)}</td></tr>
            ${ne.ekuitas.prive > 0 ? `<tr><td style="padding-left:var(--space-4)">Prive / Penarikan Kas (−)</td><td class="text-right debit">−${fRp(ne.ekuitas.prive)}</td></tr>` : ''}
            <tr><td style="padding-left:var(--space-4)">Akumulasi Laba / (Rugi) Berjalan</td><td class="text-right ${ne.ekuitas.akumulasiLaba >= 0 ? 'kredit' : 'debit'}">${fRp(ne.ekuitas.akumulasiLaba)}</td></tr>
            ${ne.ekuitas.penyesuaianStok !== 0 ? `<tr><td style="padding-left:var(--space-4)">Penyesuaian Nilai Stok Telur</td><td class="text-right">${fRp(ne.ekuitas.penyesuaianStok)}</td></tr>` : ''}
            <tr class="row-total"><td>Total Ekuitas</td><td class="text-right kredit">${fRp(ne.ekuitas.totalEkuitas)}</td></tr>

            <tr class="row-total" style="background:rgba(13,148,136,0.08);font-size:var(--font-size-base)">
              <td><strong>TOTAL KEWAJIBAN &amp; EKUITAS</strong></td>
              <td class="text-right kredit"><strong>${fRp(ne.totalKewajibanDanEkuitas)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 4 — CALK
// ═══════════════════════════════════════════════════════════════

function _renderCalk() {
  const bulanLabel = `${_BULAN_NAMA[_calkMonth]} ${_calkYear}`;
  const settings   = StorageService.getSettings();
  const txs        = StorageService.getTransactions();
  const prods      = StorageService.getProductions();

  const notes = CalculationEngine.calculateCalk(txs, prods, settings, _calkYear, _calkMonth);

  const listHTML = notes.map((item, i) => `
    <li class="calk-item">
      <span class="calk-item-num">${i + 1}</span>
      <div class="calk-item-text">
        <strong>${escH(item.title)}</strong><br>
        <span>${item.body}</span>
      </div>
    </li>`).join('');

  return `
    <div id="print-area-calk" class="laporan-print-area">
      <div class="print-only">${kopHTML('Catatan atas Laporan Keuangan (CALK)', bulanLabel)}</div>

      ${toolbarHTML('calk', bulanLabel)}
      ${monthNavHTML('calk', _calkYear, _calkMonth, _now.getFullYear(), _now.getMonth())}

      <p class="laporan-section-title">📝 CALK — ${bulanLabel}</p>
      <ul class="calk-list" id="calk-list">${listHTML}</ul>

      <div class="print-only">${ttdHTML()}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// TAB 5 — BUKU KAS
// ═══════════════════════════════════════════════════════════════

function _renderBukuKas() {
  const bulanLabel = `${_BULAN_NAMA[_bkMonth]} ${_bkYear}`;
  const txs        = sortOldest(StorageService.getTransactions());
  const pfx        = monthPrefix(_bkYear, _bkMonth);

  const before     = txs.filter(t => t.tanggal < pfx);
  const saldoAwal  = before.reduce((s, t) => isIncome(t) ? s + (t.nominal || 0) : s - (t.nominal || 0), 0);
  const monthTxs   = txs.filter(t => t.tanggal.startsWith(pfx));

  let rows  = '';
  let saldo = saldoAwal;

  monthTxs.forEach(t => {
    const info = getTxDisplayInfo(t);
    const inc = isIncome(t);
    const debit  = inc ? t.nominal : 0; // Kas Masuk (+)
    const kredit = inc ? 0 : t.nominal; // Kas Keluar (−)
    saldo += debit - kredit;
    const sc = saldo >= 0 ? 'saldo-positif' : 'saldo-negatif';

    rows += `
      <tr data-tx-id="${escH(t.id)}">
        <td>${fDate(t.tanggal)}</td>
        <td>
          <strong>${escH(info.desc)}</strong>
        </td>
        <td>${escH(t.lokasi || '—')}</td>
        <td class="text-right" style="font-size:var(--font-size-xs);">
          ${info.kuantitas} ${escH(info.satuan)}
        </td>
        <td class="text-right" style="font-size:var(--font-size-xs);">
          ${fRp(info.hargaSatuan)}
        </td>
        <td class="text-right debit-kas">${debit  > 0 ? fRp(debit)  : '—'}</td>
        <td class="text-right kredit-kas">${kredit > 0 ? fRp(kredit) : '—'}</td>
        <td class="text-right ${sc}">${fRp(saldo)}</td>
        <td class="no-print">
          <div class="buku-kas-actions">
            <button class="btn-edit-tx"   data-id="${escH(t.id)}" title="Edit Transaksi">✏️</button>
            <button class="btn-delete-tx" data-id="${escH(t.id)}" title="Hapus Transaksi">🗑️</button>
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
        <button class="btn btn-primary btn-sm" id="btn-tambah-bk">➕ Tambah Transaksi Baru</button>
        <span style="font-size:var(--font-size-xs);color:var(--color-text-muted)">
          Saldo Awal Bulan: <strong>${fRp(saldoAwal)}</strong>
        </span>
      </div>

      <!-- Slot Form Transaksi Bersama (Tambah / Edit) -->
      <div id="bk-edit-slot"></div>

      <p class="laporan-section-title">📒 Buku Kas — ${bulanLabel}</p>

      ${monthTxs.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">📒</div><p class="empty-state-message">Belum ada transaksi bulan ini</p></div>'
        : `<div class="laporan-table-wrap table-responsive">
            <table class="laporan-table" id="tabel-bukukas">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan / Kategori</th>
                  <th>Lokasi</th>
                  <th class="text-right">Kuantitas</th>
                  <th class="text-right">Harga Satuan</th>
                  <th class="text-right">Debit (+)</th>
                  <th class="text-right">Kredit (−)</th>
                  <th class="text-right">Saldo</th>
                  <th class="no-print text-center">Aksi</th>
                </tr>
              </thead>
              <tbody id="tbody-bukukas">
                <tr style="font-style:italic;color:var(--color-text-muted)">
                  <td>—</td><td colspan="6">Saldo Awal Bulan</td>
                  <td class="text-right ${saldoAwal >= 0 ? 'saldo-positif' : 'saldo-negatif'}">${fRp(saldoAwal)}</td>
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

// ═══════════════════════════════════════════════════════════════
// TAB 6 — CETAK
// ═══════════════════════════════════════════════════════════════

function _renderCetak() {
  return `
    <p class="laporan-section-title">🖨️ Pratinjau &amp; Cetak Laporan</p>
    <p style="color:var(--color-text-muted);font-size:var(--font-size-sm);margin-bottom:var(--space-5)">
      Pilih laporan yang ingin dicetak, lalu klik tombol Cetak. 
      Halaman akan membuka dialog cetak browser. Pilih "Simpan sebagai PDF" untuk menyimpan file laporan.
    </p>

    <div style="display:grid;gap:var(--space-3)">
      ${[
        { tab: 'labarugi', label: '📊 Laba Rugi', desc: 'Laporan pendapatan, beban operasional, dan laba/rugi bersih' },
        { tab: 'aruskas',  label: '💸 Arus Kas',  desc: 'Laporan pergerakan kas operasi, investasi, dan pendanaan' },
        { tab: 'neraca',   label: '⚖️ Neraca',    desc: 'Laporan posisi aset, kewajiban, dan ekuitas' },
        { tab: 'calk',     label: '📝 CALK',      desc: 'Catatan atas Laporan Keuangan standar BUMKam' },
        { tab: 'bukukas',  label: '📒 Buku Kas',  desc: 'Buku kas umum per transaksi dengan saldo berjalan' },
      ].map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    background:var(--color-bg);border:1px solid var(--color-border);
                    border-radius:var(--radius-lg);padding:var(--space-4);gap:var(--space-3)">
          <div>
            <p style="font-weight:700;margin-bottom:2px">${item.label}</p>
            <p style="font-size:var(--font-size-xs);color:var(--color-text-muted)">${item.desc}</p>
          </div>
          <button class="btn btn-primary btn-sm btn-goto-print" data-tab="${item.tab}"
                  style="flex-shrink:0">🖨️ Cetak</button>
        </div>`).join('')}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// ATTACH LISTENERS — main entry point
// ═══════════════════════════════════════════════════════════════

export function attachListeners(params = {}) {
  _activeTab = params.tab ?? _activeTab;

  document.querySelectorAll('.laporan-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.getAttribute('data-tab');
      document.querySelectorAll('.laporan-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === _activeTab);
        b.setAttribute('aria-selected', b.getAttribute('data-tab') === _activeTab);
      });
      const panel = document.getElementById('laporan-panel');
      if (panel) {
        panel.innerHTML = _renderPanel(_activeTab);
        _attachPanelListeners(_activeTab);
      }
    });
  });

  _attachPanelListeners(_activeTab);
}

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

function _triggerPrint(printAreaId) {
  const area = document.getElementById(printAreaId);
  if (!area) { console.warn('[Print] Area not found:', printAreaId); return; }

  let portal = document.getElementById('print-portal');
  if (portal) portal.remove();

  portal = document.createElement('div');
  portal.id = 'print-portal';
  portal.style.cssText = 'display:none;font-family:Segoe UI,Arial,sans-serif;font-size:11pt;color:#000;background:#fff;padding:1cm;';
  portal.innerHTML = area.innerHTML;

  portal.querySelectorAll('.print-only').forEach(el => { el.style.display = 'block'; });
  portal.querySelectorAll('.no-print,.laporan-tabs,.laporan-toolbar,.month-nav').forEach(el => { el.style.display = 'none'; });
  portal.querySelectorAll('button,.btn,.welcome-card').forEach(el => { el.style.display = 'none'; });

  document.body.appendChild(portal);
  document.body.classList.add('is-printing');

  const cleanup = () => {
    document.body.classList.remove('is-printing');
    const p = document.getElementById('print-portal');
    if (p) p.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  window.print();
}

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

// ─── Tab 1: Laba Rugi Listeners ──────────────────────────────────────────────

function _listenLabarugi() {
  _attachMonthNav('lr',
    () => _lrYear, () => _lrMonth,
    (y) => { _lrYear = y; }, (m) => { _lrMonth = m; },
    () => {
      const panel = document.getElementById('laporan-panel');
      if (panel) { panel.innerHTML = _renderPanel('labarugi'); _listenLabarugi(); }
    }
  );

  try {
    const txs  = StorageService.getTransactions();
    const data = CalculationEngine.getDataGrafikMingguan(txs, 4);
    ChartManager.renderWeeklyChart('chart-lr', data);
  } catch(e) { /* chart optional */ }

  document.getElementById('btn-cetak-labarugi')?.addEventListener('click', () => _triggerPrint('print-area-labarugi'));

  document.getElementById('btn-export-excel-labarugi')?.addEventListener('click', () => {
    const txs = StorageService.getTransactions();
    const lr  = CalculationEngine.calculateLabaRugi(txs, _lrYear, _lrMonth);
    const bl  = `${_BULAN_NAMA[_lrMonth]}-${_lrYear}`;
    _exportExcel([
      ['BUMKam Torei Natei — Laporan Laba Rugi', '', ''],
      ['Periode', bl, ''],
      [''],
      ['Keterangan', 'Jumlah (Rp)', ''],
      ['1. PENDAPATAN OPERASIONAL', '', ''],
      ['Penjualan Telur', lr.pendapatan.penjualanTelur],
      ['Penjualan Ayam / Afkir', lr.pendapatan.penjualanAyam],
      ['Penjualan Lainnya', lr.pendapatan.penjualanLain],
      ['Total Pendapatan', lr.pendapatan.totalPendapatan],
      [''],
      ['2. BEBAN OPERASIONAL', '', ''],
      ['Beban Pakan Ayam', lr.beban.bebanPakan],
      ['Beban Obat & Vaksin', lr.beban.bebanObat],
      ['Beban Perlengkapan Kandang', lr.beban.bebanPerlengkapan],
      ['Beban Kebersihan & Sanitasi', lr.beban.bebanSanitasi],
      ['Beban Operasional Lain-lain', lr.beban.bebanLain],
      ['Total Beban Operasional', lr.beban.totalBeban],
      [''],
      ['LABA / (RUGI) BERSIH', lr.labaBersih],
      ['Margin Keuntungan (%)', lr.marginKeuntungan.toFixed(2)],
    ], 'LabaRugi', `SIKAT_LabaRugi_${bl}_${_todayStr()}.xlsx`);
  });
}

// ─── Tab 2: Arus Kas Listeners ───────────────────────────────────────────────

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
    const txs      = StorageService.getTransactions();
    const pfx      = monthPrefix(_akYear, _akMonth);
    const before   = txs.filter(t => t.tanggal < pfx);
    const saldoAwal= before.reduce((s, t) => isIncome(t) ? s + (t.nominal || 0) : s - (t.nominal || 0), 0);
    const ak       = CalculationEngine.calculateArusKas(txs, _akYear, _akMonth, saldoAwal);
    const bl       = `${_BULAN_NAMA[_akMonth]}-${_akYear}`;

    const rows = [
      ['BUMKam Torei Natei — Laporan Arus Kas', '','','','','',''],
      ['Periode', bl,'','','','',''],
      [''],
      ['Tanggal','Keterangan','Aktivitas','Lokasi','Kas Masuk','Kas Keluar','Saldo'],
      ['—','Saldo Awal Kas','','','','',ak.saldoAwal],
    ];

    ak.transactions.forEach(t => {
      rows.push([
        fDate(t.date),
        t.description,
        t.stream.toUpperCase(),
        t.location,
        t.masuk || '',
        t.keluar || '',
        t.runningSaldo,
      ]);
    });

    _exportExcel(rows, 'ArusKas', `SIKAT_ArusKas_${bl}_${_todayStr()}.xlsx`);
  });
}

// ─── Tab 3: Neraca Listeners ─────────────────────────────────────────────────

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
    const prods      = StorageService.getProductions();
    const endOfMonth = `${_neYear}-${String(_neMonth + 1).padStart(2, '0')}-31`;
    const ne         = CalculationEngine.calculateNeraca(txs, prods, settings, endOfMonth);
    const bl         = `${_BULAN_NAMA[_neMonth]}-${_neYear}`;

    _exportExcel([
      ['BUMKam Torei Natei — Neraca (Posisi Keuangan)', ''],
      ['Per akhir', bl],
      ['Status Keseimbangan', ne.balance ? 'SEIMBANG (BALANCE)' : 'BELUM SEIMBANG'],
      [''],
      ['Pos Akun', 'Jumlah (Rp)'],
      ['ASET LANCAR', ''],
      ['Kas & Setara Kas', ne.aset.lancar.kas],
      ['Persediaan Telur', ne.aset.lancar.persediaanTelur],
      ['Persediaan Ayam Ternak', ne.aset.lancar.persediaanAyam],
      ['Total Aset Lancar', ne.aset.lancar.totalLancar],
      ['ASET TETAP', ''],
      ['Peralatan Kandang', ne.aset.tetap.peralatanKandang],
      ['Mesin Produksi', ne.aset.tetap.mesinProduksi],
      ['Kendaraan Operasional', ne.aset.tetap.kendaraan],
      ['Peralatan Lainnya', ne.aset.tetap.peralatanLain],
      ['Total Aset Tetap', ne.aset.tetap.totalTetap],
      ['TOTAL ASET', ne.aset.totalAset],
      [''],
      ['KEWAJIBAN (UTANG)', ''],
      ['Utang Usaha', ne.kewajiban.utangUsaha],
      ['Utang Bank / Pinjaman', ne.kewajiban.utangBank],
      ['Utang Lainnya', ne.kewajiban.utangLain],
      ['Total Kewajiban', ne.kewajiban.totalKewajiban],
      [''],
      ['EKUITAS (MODAL)', ''],
      ['Modal Awal Disetor', ne.ekuitas.modalAwal],
      ['Tambahan Modal', ne.ekuitas.tambahanModal],
      ['Penyertaan Modal Desa', ne.ekuitas.penyertaanDesa],
      ['Prive / Penarikan (−)', ne.ekuitas.prive],
      ['Akumulasi Laba / (Rugi)', ne.ekuitas.akumulasiLaba],
      ['Penyesuaian Nilai Stok Telur', ne.ekuitas.penyesuaianStok],
      ['Total Ekuitas', ne.ekuitas.totalEkuitas],
      ['TOTAL KEWAJIBAN & EKUITAS', ne.totalKewajibanDanEkuitas],
    ], 'Neraca', `SIKAT_Neraca_${bl}_${_todayStr()}.xlsx`);
  });
}

// ─── Tab 4: CALK Listeners ───────────────────────────────────────────────────

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
    showNotification('CALK berformat narasi — gunakan tombol Cetak untuk menyimpan sebagai PDF.', 'info', 4000);
  });
}

// ─── Tab 5: Buku Kas Listeners ───────────────────────────────────────────────

function _listenBukuKas() {
  _attachMonthNav('bk',
    () => _bkYear, () => _bkMonth,
    (y) => { _bkYear = y; }, (m) => { _bkMonth = m; },
    () => { _refreshBukuKasPanel(); }
  );

  document.getElementById('btn-cetak-bukukas')?.addEventListener('click', () => _triggerPrint('print-area-bukukas'));

  document.getElementById('btn-export-excel-bukukas')?.addEventListener('click', () => {
    const txs      = sortOldest(StorageService.getTransactions());
    const pfx      = monthPrefix(_bkYear, _bkMonth);
    const before   = txs.filter(t => t.tanggal < pfx);
    let saldo      = before.reduce((s, t) => isIncome(t) ? s + (t.nominal || 0) : s - (t.nominal || 0), 0);
    const monthTxs = txs.filter(t => t.tanggal.startsWith(pfx));
    const bl       = `${_BULAN_NAMA[_bkMonth]}-${_bkYear}`;

    const rows = [
      ['BUMKam Torei Natei — Buku Kas', '', '', '', '', '', '', ''],
      ['Periode', bl, '', '', '', '', '', ''],
      [''],
      ['Tanggal', 'Keterangan', 'Lokasi', 'Kuantitas', 'Harga Satuan', 'Debit (+)', 'Kredit (−)', 'Saldo'],
      ['—', 'Saldo Awal Bulan', '', '', '', '', '', saldo],
    ];

    monthTxs.forEach(t => {
      const info = getTxDisplayInfo(t);
      const inc = isIncome(t);
      const d = inc ? t.nominal : 0;
      const k = inc ? 0 : t.nominal;
      saldo += d - k;
      rows.push([
        fDate(t.tanggal),
        info.desc,
        t.lokasi || '',
        `${info.kuantitas} ${info.satuan}`,
        info.hargaSatuan,
        d || '',
        k || '',
        saldo,
      ]);
    });

    _exportExcel(rows, 'BukuKas', `SIKAT_BukuKas_${bl}_${_todayStr()}.xlsx`);
  });

  // Tombol Tambah Transaksi Baru di Buku Kas
  document.getElementById('btn-tambah-bk')?.addEventListener('click', () => {
    _bkEditId = null;
    const slot = document.getElementById('bk-edit-slot');
    if (!slot) return;

    // Pasang form bersama di dalam slot
    slot.innerHTML = renderTransactionForm({
      formId: 'form-transaksi-bk',
      initialData: {
        kategori: 'penjualan',
        subKategori: 'penjualan_telur',
        tanggal: `${_bkYear}-${String(_bkMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
      },
      mode: 'inline',
      showCancel: true,
      submitLabel: '💾 Simpan Transaksi',
    });

    slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    attachTransactionFormListeners({
      formId: 'form-transaksi-bk',
      onSaved: () => {
        _closeBkForm();
        _refreshBukuKasPanel();
      },
      onCancel: () => _closeBkForm(),
    });
  });

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

      if (_bkEditId === id) {
        _closeBkForm();
        return;
      }
      _bkEditId = id;

      const slot = document.getElementById('bk-edit-slot');
      if (slot) {
        // Pasang form bersama untuk edit
        slot.innerHTML = renderTransactionForm({
          formId: 'form-transaksi-bk',
          initialData: tx,
          mode: 'inline',
          showCancel: true,
          submitLabel: '💾 Simpan Perubahan',
        });

        slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        attachTransactionFormListeners({
          formId: 'form-transaksi-bk',
          initialData: tx,
          onSaved: () => {
            _closeBkForm();
            _refreshBukuKasPanel();
          },
          onCancel: () => _closeBkForm(),
        });
      }
    }

    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (!confirm('Hapus transaksi ini? Tindakan tidak dapat dibatalkan.')) return;
      const ok = StorageService.deleteTransaction(id);
      if (ok) {
        showNotification('Transaksi berhasil dihapus.', 'success', 3000);
        _refreshBukuKasPanel();
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

function _refreshBukuKasPanel() {
  const panel = document.getElementById('laporan-panel');
  if (panel) {
    panel.innerHTML = _renderPanel('bukukas');
    _listenBukuKas();
  }
}

// ─── Tab 6: Cetak Listeners ───────────────────────────────────────────────────

function _listenCetak() {
  document.querySelectorAll('.btn-goto-print').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      _activeTab = targetTab;
      document.querySelectorAll('.laporan-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === targetTab);
        b.setAttribute('aria-selected', b.getAttribute('data-tab') === targetTab);
      });
      const panel = document.getElementById('laporan-panel');
      if (panel) {
        panel.innerHTML = _renderPanel(targetTab);
        _attachPanelListeners(targetTab);
        setTimeout(() => _triggerPrint(`print-area-${targetTab}`), 150);
      }
    });
  });
}
