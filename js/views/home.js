// js/views/home.js — View Menu Utama

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { navigate } from '../router.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns today's date as 'YYYY-MM-DD' string (local time).
 * @returns {string}
 */
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format angka ke format Rupiah Indonesia.
 * @param {number} angka
 * @returns {string}
 */
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

/**
 * Baca data hari ini dari LocalStorage dan hitung ringkasan.
 * @returns {{ produksiButir: number, penjualan: number }}
 */
function getTodayStats() {
  let produksiButir = 0;
  let penjualan = 0;

  try {
    const todayStr = getTodayStr();
    const productions = StorageService.getProductions();
    const todayProds = productions.filter((p) => p.tanggal === todayStr);
    const totalRak = todayProds.reduce((s, p) => s + p.jumlahRak, 0);
    produksiButir = CalculationEngine.rakToButir(totalRak);
  } catch (e) {
    console.error('[Home] Gagal membaca data produksi:', e);
    produksiButir = 0;
  }

  try {
    const todayStr = getTodayStr();
    const transactions = StorageService.getTransactions();
    penjualan = transactions
      .filter((t) => t.tanggal === todayStr && t.jenis === 'penjualan_telur')
      .reduce((s, t) => s + t.nominal, 0);
  } catch (e) {
    console.error('[Home] Gagal membaca data transaksi:', e);
    penjualan = 0;
  }

  return { produksiButir, penjualan };
}

// ─── render ──────────────────────────────────────────────────────────────────

/**
 * Render HTML string untuk view Menu Utama.
 * @param {Object} params
 * @returns {string}
 */
export function render(params = {}) {
  const { produksiButir, penjualan } = getTodayStats();

  const sectionHeadingStyle =
    'font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);color:var(--color-text);';

  return `
    <div class="welcome-card">
      <div class="icon">🐔</div>
      <h2>Halo, Peternak!</h2>
      <p>Kelola produksi, kas, dan laporan harian</p>
    </div>

    <section aria-label="Ringkasan Hari Ini">
      <h3 style="${sectionHeadingStyle}">Ringkasan Hari Ini</h3>
      <div class="summary-today">
        <div class="summary-today-item">
          <div class="summary-today-label">Produksi</div>
          <div class="summary-today-value" id="today-produksi">${produksiButir}</div>
          <div class="summary-today-unit">butir</div>
        </div>
        <div class="summary-today-item">
          <div class="summary-today-label">Penjualan</div>
          <div class="summary-today-value" id="today-penjualan">${formatRupiah(penjualan)}</div>
          <div class="summary-today-unit">hari ini</div>
        </div>
      </div>
    </section>

    <section aria-label="Menu Utama">
      <h3 style="${sectionHeadingStyle}">Menu</h3>
      <div class="menu-grid" role="list">
        <div class="menu-card" role="listitem" tabindex="0" data-nav="#transaksi" aria-label="Input Transaksi">
          <span class="menu-card-icon" aria-hidden="true">➕</span>
          <span class="menu-card-title">Input Transaksi</span>
          <span class="menu-card-desc">Tambah transaksi pengeluaran/pemasukan</span>
        </div>
        <div class="menu-card" role="listitem" tabindex="0" data-nav="#rekap" aria-label="Rekap Kas">
          <span class="menu-card-icon" aria-hidden="true">👛</span>
          <span class="menu-card-title">Rekap Kas</span>
          <span class="menu-card-desc">Saldo kas &amp; ringkasan</span>
        </div>
        <div class="menu-card" role="listitem" tabindex="0" data-nav="#labarugi" aria-label="Laba Rugi">
          <span class="menu-card-icon" aria-hidden="true">📊</span>
          <span class="menu-card-title">Laba Rugi</span>
          <span class="menu-card-desc">Ringkasan laba/rugi mingguan</span>
        </div>
        <div class="menu-card" role="listitem" tabindex="0" data-nav="#produksi" aria-label="Produksi Harian">
          <span class="menu-card-icon" aria-hidden="true">🥚</span>
          <span class="menu-card-title">Produksi Harian</span>
          <span class="menu-card-desc">Catat produksi telur harian</span>
        </div>
      </div>
    </section>

    <section aria-label="Aksi Cepat">
      <h3 style="${sectionHeadingStyle}">Aksi Cepat</h3>
      <div class="quick-actions">
        <button class="btn btn-primary" id="btn-tambah-penjualan">
          ➕ Tambah Penjualan
        </button>
        <button class="btn btn-outline" id="btn-catat-produksi">
          🥚 Catat Produksi
        </button>
      </div>
    </section>
  `;
}

// ─── attachListeners ─────────────────────────────────────────────────────────

/**
 * Pasang semua event listener setelah HTML di-render ke DOM.
 * @param {Object} params
 */
export function attachListeners(params = {}) {
  // Menu cards — click dan keyboard navigation
  document.querySelectorAll('.menu-card[data-nav]').forEach((card) => {
    const hash = card.getAttribute('data-nav');

    card.addEventListener('click', () => navigate(hash));

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(hash);
      }
    });
  });

  // Tombol "Tambah Penjualan" — navigasi ke #transaksi dengan prefill
  const btnPenjualan = document.getElementById('btn-tambah-penjualan');
  if (btnPenjualan) {
    btnPenjualan.addEventListener('click', () => {
      navigate('#transaksi', { prefillJenis: 'penjualan_telur' });
    });
  }

  // Tombol "Catat Produksi" — navigasi ke #produksi
  const btnProduksi = document.getElementById('btn-catat-produksi');
  if (btnProduksi) {
    btnProduksi.addEventListener('click', () => navigate('#produksi'));
  }
}
