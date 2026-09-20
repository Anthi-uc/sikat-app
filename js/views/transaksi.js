// transaksi.js — Input Transaksi SIKAT menggunakan komponen form bersama
// Mendukung kategori bertingkat, kalkulasi otomatis Qty × Harga, dan stok telur real-time.

import { StorageService } from '../storage.js';
import { isIncome as checkIsIncome, findCategoryAndSub } from '../categories.js';
import { renderTransactionForm, attachTransactionFormListeners } from '../transaction-form.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function isIncome(txOrJenis) {
  return checkIsIncome(txOrJenis);
}

// ─── Ringkasan Bulan Ini ──────────────────────────────────────────────────────

function getMonthSummary() {
  try {
    const d   = new Date();
    const pfx = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const txs = StorageService.getTransactions().filter(t => t.tanggal.startsWith(pfx));
    const totalMasuk  = txs.filter(t => checkIsIncome(t)).reduce((s, t) => s + (t.nominal || 0), 0);
    const totalKeluar = txs.filter(t => !checkIsIncome(t)).reduce((s, t) => s + (t.nominal || 0), 0);
    return { count: txs.length, totalMasuk, totalKeluar };
  } catch {
    return { count: 0, totalMasuk: 0, totalKeluar: 0 };
  }
}

// ─── render ──────────────────────────────────────────────────────────────────

export function render(params = {}) {
  const { count, totalMasuk, totalKeluar } = getMonthSummary();
  const prefillJenis = params.prefillJenis ?? '';
  const settings     = StorageService.getSettings();
  const stok         = StorageService.getStokTelur();

  // Resolusi jika prefill adalah jenis atau kategori lama
  let initialData = {};
  if (prefillJenis) {
    const matched = findCategoryAndSub(prefillJenis);
    if (matched) {
      initialData = {
        kategori: matched.category.id,
        subKategori: matched.subcategory.id,
        jenis: matched.subcategory.id,
      };
    } else {
      initialData = { jenis: prefillJenis };
    }
  }

  const now  = new Date();
  const bulanLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return `
    <div class="welcome-card">
      <div class="icon">🧾</div>
      <h2>Catat Transaksi Baru</h2>
      <p>Tambahkan pemasukan atau pengeluaran usaha BUMKam Torei Natei</p>
    </div>

    <!-- Stok telur info banner -->
    <div style="background:var(--color-citrine-light);border:1px solid var(--color-citrine);
                border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4);
                margin-bottom:var(--space-5);display:flex;align-items:center;
                justify-content:space-between;gap:var(--space-3);" id="box-stok-telur">
      <div>
        <p style="font-size:var(--font-size-xs);font-weight:700;color:#713f12;margin-bottom:2px;">
          📦 STOK TELUR TERSEDIA
        </p>
        <p style="font-size:var(--font-size-xl);font-weight:800;color:#1e293b;" id="stok-info">
          ${stok.toLocaleString('id-ID')} butir
        </p>
      </div>
      <p style="font-size:var(--font-size-sm);color:#713f12;" id="stok-rak-info">
        ≈ ${(stok / settings.isiPerRak).toFixed(1)} rak
      </p>
    </div>

    <!-- Unified Form Component -->
    ${renderTransactionForm({
      formId: 'form-transaksi',
      initialData,
      mode: 'page',
      showCancel: false,
      submitLabel: '💾 Simpan Transaksi',
    })}

    <!-- Ringkasan Bulan Ini -->
    <div class="summary-box" id="box-ringkasan">
      <p class="summary-box-title">📅 Ringkasan ${bulanLabel}</p>
      <div class="summary-row">
        <span class="summary-row-label">Jumlah Transaksi</span>
        <span class="summary-row-value" id="stat-count">${count}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row-label">Total Pemasukan</span>
        <span class="summary-row-value amount-income" id="stat-masuk">${formatRupiah(totalMasuk)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row-label">Total Pengeluaran</span>
        <span class="summary-row-value amount-expense" id="stat-keluar">${formatRupiah(totalKeluar)}</span>
      </div>
    </div>
  `;
}

// ─── attachListeners ──────────────────────────────────────────────────────────

export function attachListeners(params = {}) {
  function refreshSummaryAndStock() {
    const { count, totalMasuk, totalKeluar } = getMonthSummary();
    const statCount  = document.getElementById('stat-count');
    const statMasuk  = document.getElementById('stat-masuk');
    const statKeluar = document.getElementById('stat-keluar');
    if (statCount)  statCount.textContent  = count;
    if (statMasuk)  statMasuk.textContent  = formatRupiah(totalMasuk);
    if (statKeluar) statKeluar.textContent = formatRupiah(totalKeluar);

    const stok = StorageService.getStokTelur();
    const settings = StorageService.getSettings();
    const stokInfo = document.getElementById('stok-info');
    const stokRakInfo = document.getElementById('stok-rak-info');
    if (stokInfo) stokInfo.textContent = `${stok.toLocaleString('id-ID')} butir`;
    if (stokRakInfo) stokRakInfo.textContent = `≈ ${(stok / settings.isiPerRak).toFixed(1)} rak`;
  }

  attachTransactionFormListeners({
    formId: 'form-transaksi',
    onSaved: () => {
      refreshSummaryAndStock();
      // Reset form fields
      const form = document.getElementById('form-transaksi');
      if (form) {
        form.reset();
        const hintEl = document.getElementById('form-transaksi-calc-hint');
        if (hintEl) hintEl.textContent = '';
        const konversiEl = document.getElementById('form-transaksi-stok-konversi');
        if (konversiEl) konversiEl.style.display = 'none';
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const tglEl = document.getElementById('form-transaksi-tanggal');
        if (tglEl) tglEl.value = todayStr;
      }
    },
  });
}