// rekap.js — View Rekap Kas

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// Format 'YYYY-MM-DD' → 'DD/MM/YYYY'
function formatTanggal(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Label for jenis
function jenisLabel(jenis) {
  if (jenis === 'penjualan_telur') return 'Penjualan Telur';
  if (jenis === 'pembelian_pakan') return 'Pembelian Pakan';
  if (jenis === 'biaya_lain') return 'Biaya Lain';
  return jenis;
}

// ─── render ─────────────────────────────────────────────────────────────────

export function render(params = {}) {
  let transactions = [];
  let errorBanner = '';
  let saldo = 0;
  let lastDate = '-';

  try {
    transactions = StorageService.getTransactions();

    // Saldo Kas
    saldo = CalculationEngine.getSaldoKas(transactions);

    // Last transaction date (sorted by tanggal desc)
    if (transactions.length > 0) {
      const sorted = [...transactions].sort((a, b) => {
        if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      lastDate = formatTanggal(sorted[0].tanggal);
    }
  } catch (e) {
    saldo = 0;
    lastDate = '-';
    errorBanner = `<div class="error-banner">⚠️ Gagal memuat data: ${e.message}</div>`;
  }

  // ── Ringkasan Hari Ini ───────────────────────────────────────────────────
  const today = getTodayStr();
  let pemasukanHariIni = 0;
  let pengeluaranHariIni = 0;

  for (const t of transactions) {
    if (t.tanggal === today) {
      if (t.jenis === 'penjualan_telur') {
        pemasukanHariIni += t.nominal;
      } else {
        pengeluaranHariIni += t.nominal;
      }
    }
  }

  // ── Riwayat Transaksi (newest first) ────────────────────────────────────
  const sorted = [...transactions].sort((a, b) => {
    if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  let txListContent = '';
  if (sorted.length === 0) {
    txListContent = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-message">Belum ada transaksi</p>
      </div>`;
  } else {
    txListContent = sorted
      .map(
        (t) => `
      <div class="tx-item">
        <div class="tx-item-info">
          <p class="tx-item-type">${jenisLabel(t.jenis)}</p>
          <p class="tx-item-meta">${formatTanggal(t.tanggal)} &bull; ${t.lokasi}</p>
        </div>
        <p class="tx-item-amount ${t.jenis === 'penjualan_telur' ? 'amount-income' : 'amount-expense'}">
          ${t.jenis === 'penjualan_telur' ? '+' : '-'}${formatRupiah(t.nominal)}
        </p>
      </div>`,
      )
      .join('');
  }

  return `
    ${errorBanner}
    <div class="saldo-card">
      <p class="saldo-label">💰 Saldo Kas</p>
      <p class="saldo-amount">${formatRupiah(saldo)}</p>
      <p class="saldo-update">Update: ${lastDate}</p>
    </div>

    <div class="rekap-summary-grid">
      <div class="rekap-summary-item">
        <p class="rekap-summary-label">Pemasukan Hari Ini</p>
        <p class="rekap-summary-value amount-income">${formatRupiah(pemasukanHariIni)}</p>
      </div>
      <div class="rekap-summary-item">
        <p class="rekap-summary-label">Pengeluaran Hari Ini</p>
        <p class="rekap-summary-value amount-expense">${formatRupiah(pengeluaranHariIni)}</p>
      </div>
    </div>

    <div class="tx-list">
      <p class="tx-list-title">Riwayat Transaksi</p>
      ${txListContent}
    </div>
  `;
}

// ─── attachListeners ─────────────────────────────────────────────────────────

export function attachListeners(params = {}) {}
