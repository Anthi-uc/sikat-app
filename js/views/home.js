// js/views/home.js — View Menu Utama (Ringkasan Bulan Ini + Stok Telur)

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { navigate } from '../router.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _BULAN_NAMA = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

/**
 * Hitung ringkasan bulan.
 * penjualan_lain juga dihitung sebagai pemasukan.
 */
function getMonthStats(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  let produksiButir = 0;
  let penjualan     = 0;
  let pengeluaran   = 0;

  try {
    const productions = StorageService.getProductions();
    const settings    = StorageService.getSettings();
    const ipr         = settings.isiPerRak;
    const totalButir  = productions
      .filter((p) => p.tanggal.startsWith(prefix))
      .reduce((s, p) => s + (p.jumlahButir ?? p.jumlahRak * ipr), 0);
    produksiButir = totalButir;
  } catch (e) { console.error('[Home] Gagal membaca data produksi:', e); }

  try {
    const transactions = StorageService.getTransactions();
    for (const t of transactions) {
      if (!t.tanggal.startsWith(prefix)) continue;
      if (t.jenis === 'penjualan_telur' || t.jenis === 'penjualan_lain') {
        penjualan += t.nominal;
      } else {
        pengeluaran += t.nominal;
      }
    }
  } catch (e) { console.error('[Home] Gagal membaca data transaksi:', e); }

  return { produksiButir, penjualan, pengeluaran };
}

// ─── Module-level state ───────────────────────────────────────────────────────

const _now    = new Date();
let _viewYear  = _now.getFullYear();
let _viewMonth = _now.getMonth();

// ─── render ──────────────────────────────────────────────────────────────────

export function render(params = {}) {
  _viewYear  = _now.getFullYear();
  _viewMonth = _now.getMonth();
  return _buildHTML();
}

function _buildHTML() {
  const { produksiButir, penjualan, pengeluaran } = getMonthStats(_viewYear, _viewMonth);
  const laba        = penjualan - pengeluaran;
  const bulanLabel  = `${_BULAN_NAMA[_viewMonth]} ${_viewYear}`;
  const isCurrentMonth = (_viewYear === _now.getFullYear() && _viewMonth === _now.getMonth());

  const stok     = StorageService.getStokTelur();
  const settings = StorageService.getSettings();

  const sh = 'font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);color:var(--color-text);';

  return `
    <div class="welcome-card">
      <div class="icon">🐔</div>
      <h2>Halo, Peternak!</h2>
      <p>Kelola produksi, kas, dan laporan harian</p>
    </div>

    <!-- Stok telur -->
    <div style="
      background:linear-gradient(135deg,var(--color-citrine) 0%,#ca9a02 100%);
      color:#1e293b; border-radius:var(--radius-lg); padding:var(--space-4) var(--space-5);
      margin-bottom:var(--space-5); box-shadow:var(--shadow-md);
      display:flex; align-items:center; justify-content:space-between; gap:var(--space-3);">
      <div>
        <p style="font-size:var(--font-size-xs);font-weight:600;opacity:0.75;margin-bottom:2px;">📦 STOK TELUR</p>
        <p style="font-size:var(--font-size-2xl);font-weight:800;line-height:1;" id="home-stok-butir">
          ${stok.toLocaleString('id-ID')}
        </p>
        <p style="font-size:var(--font-size-xs);opacity:0.7;">butir tersedia</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:var(--font-size-xs);opacity:0.75;margin-bottom:2px;">≈ SETARA</p>
        <p style="font-size:var(--font-size-lg);font-weight:700;" id="home-stok-rak">
          ${(stok / settings.isiPerRak).toFixed(1)}
        </p>
        <p style="font-size:var(--font-size-xs);opacity:0.7;">rak</p>
      </div>
    </div>

    <section aria-label="Ringkasan Bulan Ini">
      <h3 style="${sh}">Ringkasan Bulan Ini</h3>

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
            style="color:${laba >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">
            ${formatRupiah(laba)}</div>
          <div class="summary-today-unit">bulan ini</div>
        </div>
      </div>
    </section>

    <section aria-label="Menu Utama">
      <h3 style="${sh}">Menu</h3>
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
          <span class="menu-card-desc">Catat produksi &amp; lihat stok</span>
        </div>
      </div>
    </section>

    <section aria-label="Aksi Cepat">
      <h3 style="${sh}">Aksi Cepat</h3>
      <div class="quick-actions">
        <button class="btn btn-primary" id="btn-tambah-penjualan">➕ Tambah Penjualan</button>
        <button class="btn btn-outline"  id="btn-catat-produksi">🥚 Catat Produksi</button>
      </div>
    </section>
  `;
}

// ─── _refreshSummary ─────────────────────────────────────────────────────────

function _refreshSummary() {
  const { produksiButir, penjualan, pengeluaran } = getMonthStats(_viewYear, _viewMonth);
  const laba           = penjualan - pengeluaran;
  const isCurrentMonth = (_viewYear === _now.getFullYear() && _viewMonth === _now.getMonth());

  const label   = document.getElementById('home-month-label');
  if (label)    label.textContent = `${_BULAN_NAMA[_viewMonth]} ${_viewYear}`;

  const nextBtn = document.getElementById('home-next-month');
  if (nextBtn)  nextBtn.disabled = isCurrentMonth;

  _set('home-produksi',   produksiButir.toLocaleString('id-ID'));
  _set('home-penjualan',  formatRupiah(penjualan));
  _set('home-pengeluaran',formatRupiah(pengeluaran));

  const labaEl = document.getElementById('home-laba');
  if (labaEl) {
    labaEl.textContent = formatRupiah(laba);
    labaEl.style.color = laba >= 0 ? 'var(--color-teal)' : 'var(--color-danger)';
  }

  // Stok (always current, not month-filtered)
  const stok     = StorageService.getStokTelur();
  const settings = StorageService.getSettings();
  _set('home-stok-butir', stok.toLocaleString('id-ID'));
  _set('home-stok-rak',   (stok / settings.isiPerRak).toFixed(1));
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ─── attachListeners ─────────────────────────────────────────────────────────

export function attachListeners(params = {}) {
  _viewYear  = _now.getFullYear();
  _viewMonth = _now.getMonth();

  document.querySelectorAll('.menu-card[data-nav]').forEach((card) => {
    const hash = card.getAttribute('data-nav');
    card.addEventListener('click', () => navigate(hash));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(hash); }
    });
  });

  document.getElementById('home-prev-month')?.addEventListener('click', () => {
    _viewMonth--;
    if (_viewMonth < 0) { _viewMonth = 11; _viewYear--; }
    _refreshSummary();
  });

  document.getElementById('home-next-month')?.addEventListener('click', () => {
    if (_viewYear === _now.getFullYear() && _viewMonth >= _now.getMonth()) return;
    _viewMonth++;
    if (_viewMonth > 11) { _viewMonth = 0; _viewYear++; }
    _refreshSummary();
  });

  document.getElementById('btn-tambah-penjualan')?.addEventListener('click', () => {
    navigate('#transaksi', { prefillJenis: 'penjualan_telur' });
  });
  document.getElementById('btn-catat-produksi')?.addEventListener('click', () => navigate('#produksi'));
}
