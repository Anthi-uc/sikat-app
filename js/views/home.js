// js/views/home.js — View Menu Utama (Ringkasan Bulan Ini dengan navigasi bulan)

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { navigate } from '../router.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _BULAN_NAMA = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

/** Format Rupiah */
function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

/**
 * Hitung ringkasan untuk bulan tertentu (tahun, bulan 0-indexed).
 * @param {number} year
 * @param {number} month  0-indexed
 * @returns {{ produksiButir: number, penjualan: number, pengeluaran: number }}
 */
function getMonthStats(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`; // e.g. "2026-09"

  let produksiButir = 0;
  let penjualan     = 0;
  let pengeluaran   = 0;

  try {
    const productions = StorageService.getProductions();
    const totalRak = productions
      .filter((p) => p.tanggal.startsWith(prefix))
      .reduce((s, p) => s + p.jumlahRak, 0);
    produksiButir = CalculationEngine.rakToButir(totalRak);
  } catch (e) {
    console.error('[Home] Gagal membaca data produksi:', e);
  }

  try {
    const transactions = StorageService.getTransactions();
    for (const t of transactions) {
      if (!t.tanggal.startsWith(prefix)) continue;
      if (t.jenis === 'penjualan_telur') penjualan += t.nominal;
      else pengeluaran += t.nominal;
    }
  } catch (e) {
    console.error('[Home] Gagal membaca data transaksi:', e);
  }

  return { produksiButir, penjualan, pengeluaran };
}

// ─── Module-level state (navigasi bulan) ─────────────────────────────────────

const _now   = new Date();
let _viewYear  = _now.getFullYear();
let _viewMonth = _now.getMonth(); // 0-indexed

// ─── render ──────────────────────────────────────────────────────────────────

export function render(params = {}) {
  // Reset to current month on fresh render
  _viewYear  = _now.getFullYear();
  _viewMonth = _now.getMonth();

  return _buildHTML();
}

function _buildHTML() {
  const { produksiButir, penjualan, pengeluaran } = getMonthStats(_viewYear, _viewMonth);
  const bulanLabel = `${_BULAN_NAMA[_viewMonth]} ${_viewYear}`;

  const nowYear  = _now.getFullYear();
  const nowMonth = _now.getMonth();
  const isCurrentMonth = (_viewYear === nowYear && _viewMonth === nowMonth);

  const sectionHeadingStyle =
    'font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);color:var(--color-text);';

  return `
    <div class="welcome-card">
      <div class="icon">🐔</div>
      <h2>Halo, Peternak!</h2>
      <p>Kelola produksi, kas, dan laporan harian</p>
    </div>

    <section aria-label="Ringkasan Bulan Ini">
      <h3 style="${sectionHeadingStyle}">Ringkasan Bulan Ini</h3>

      <!-- Month navigator -->
      <div class="month-nav" id="home-month-nav">
        <button class="month-nav-btn" id="home-prev-month" aria-label="Bulan sebelumnya">&#8592;</button>
        <span class="month-nav-label" id="home-month-label">${bulanLabel}</span>
        <button class="month-nav-btn" id="home-next-month"
          ${isCurrentMonth ? 'disabled' : ''} aria-label="Bulan berikutnya">&#8594;</button>
      </div>

      <div class="summary-today" id="home-summary-grid">
        <div class="summary-today-item">
          <div class="summary-today-label">Produksi</div>
          <div class="summary-today-value" id="home-produksi">${produksiButir.toLocaleString('id-ID')}</div>
          <div class="summary-today-unit">butir</div>
        </div>
        <div class="summary-today-item">
          <div class="summary-today-label">Penjualan</div>
          <div class="summary-today-value" id="home-penjualan">${formatRupiah(penjualan)}</div>
          <div class="summary-today-unit">bulan ini</div>
        </div>
        <div class="summary-today-item">
          <div class="summary-today-label">Pengeluaran</div>
          <div class="summary-today-value" id="home-pengeluaran"
            style="color:var(--color-danger)">${formatRupiah(pengeluaran)}</div>
          <div class="summary-today-unit">bulan ini</div>
        </div>
        <div class="summary-today-item">
          <div class="summary-today-label">Laba Bersih</div>
          <div class="summary-today-value" id="home-laba"
            style="color:${penjualan - pengeluaran >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">
            ${formatRupiah(penjualan - pengeluaran)}</div>
          <div class="summary-today-unit">bulan ini</div>
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
        <div class="menu-card" role="listitem" tabindex="0" data-nav="#labarugi" aria-label="Laporan Keuangan">
          <span class="menu-card-icon" aria-hidden="true">📊</span>
          <span class="menu-card-title">Laporan Keuangan</span>
          <span class="menu-card-desc">Ringkasan laba/rugi</span>
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

// ─── refreshSummary (DOM update — no full re-render) ─────────────────────────

function _refreshSummary() {
  const { produksiButir, penjualan, pengeluaran } = getMonthStats(_viewYear, _viewMonth);
  const bulanLabel = `${_BULAN_NAMA[_viewMonth]} ${_viewYear}`;
  const laba       = penjualan - pengeluaran;

  const nowYear  = _now.getFullYear();
  const nowMonth = _now.getMonth();
  const isCurrentMonth = (_viewYear === nowYear && _viewMonth === nowMonth);

  const label = document.getElementById('home-month-label');
  if (label) label.textContent = bulanLabel;

  const nextBtn = document.getElementById('home-next-month');
  if (nextBtn) nextBtn.disabled = isCurrentMonth;

  const elProd = document.getElementById('home-produksi');
  if (elProd) elProd.textContent = produksiButir.toLocaleString('id-ID');

  const elPenjualan = document.getElementById('home-penjualan');
  if (elPenjualan) elPenjualan.textContent = formatRupiah(penjualan);

  const elPengeluaran = document.getElementById('home-pengeluaran');
  if (elPengeluaran) elPengeluaran.textContent = formatRupiah(pengeluaran);

  const elLaba = document.getElementById('home-laba');
  if (elLaba) {
    elLaba.textContent = formatRupiah(laba);
    elLaba.style.color = laba >= 0 ? 'var(--color-teal)' : 'var(--color-danger)';
  }
}

// ─── attachListeners ─────────────────────────────────────────────────────────

export function attachListeners(params = {}) {
  // Reset month state whenever view is loaded
  _viewYear  = _now.getFullYear();
  _viewMonth = _now.getMonth();

  // Menu cards
  document.querySelectorAll('.menu-card[data-nav]').forEach((card) => {
    const hash = card.getAttribute('data-nav');
    card.addEventListener('click', () => navigate(hash));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(hash); }
    });
  });

  // Month navigation — prev
  document.getElementById('home-prev-month')?.addEventListener('click', () => {
    _viewMonth--;
    if (_viewMonth < 0) { _viewMonth = 11; _viewYear--; }
    _refreshSummary();
  });

  // Month navigation — next (disabled when current month)
  document.getElementById('home-next-month')?.addEventListener('click', () => {
    const nowYear  = _now.getFullYear();
    const nowMonth = _now.getMonth();
    if (_viewYear > nowYear || (_viewYear === nowYear && _viewMonth >= nowMonth)) return;
    _viewMonth++;
    if (_viewMonth > 11) { _viewMonth = 0; _viewYear++; }
    _refreshSummary();
  });

  // Quick actions
  document.getElementById('btn-tambah-penjualan')?.addEventListener('click', () => {
    navigate('#transaksi', { prefillJenis: 'penjualan_telur' });
  });
  document.getElementById('btn-catat-produksi')?.addEventListener('click', () => navigate('#produksi'));
}
