// js/views/home.js — View Menu Utama (Ringkasan Bulan Ini + Stok Telur)

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { navigate } from '../router.js';
import { isIncome, normalizeTransaction, findCategoryAndSub } from '../categories.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _BULAN_NAMA = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

function formatRupiah(angka) {
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

/**
 * Hitung ringkasan bulan: pemasukan vs pengeluaran kas.
 * Klasifikasi mengikuti bagan kategori (mendukung data legacy).
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
      if (isIncome(t)) penjualan   += t.nominal;
      else             pengeluaran += t.nominal;
    }
  } catch (e) { console.error('[Home] Gagal membaca data transaksi:', e); }

  return { produksiButir, penjualan, pengeluaran };
}


// ─── Widget: Buku Kas Berjalan ────────────────────────────────────────────────

const _LAPORAN_SHORTCUTS = [
  { tab: 'labarugi', icon: '📊', label: 'Laba Rugi' },
  { tab: 'aruskas',  icon: '💸', label: 'Arus Kas'  },
  { tab: 'neraca',   icon: '⚖️',  label: 'Neraca'    },
  { tab: 'calk',     icon: '📝', label: 'CALK'      },
  { tab: 'bukukas',  icon: '📒', label: 'Buku Kas'  },
];

function escH(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fDate(iso) {
  if (!iso) return '-';
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

/** Nama sub-kategori + keterangan untuk satu baris buku kas */
function _txDesc(t) {
  const norm = normalizeTransaction(t);
  const sub  = findCategoryAndSub(norm.kategori, norm.subKategori)?.subcategory;
  const nama = sub?.name ?? norm.subKategori ?? norm.jenis ?? 'Transaksi';
  const ikon = sub?.icon ?? (isIncome(t) ? '💰' : '💸');
  const ket  = norm.keterangan && norm.keterangan !== nama ? ` — ${escH(norm.keterangan)}` : '';
  return `${ikon} ${escH(nama)}${ket}`;
}

/**
 * 5 transaksi terakhir bulan yang dilihat + saldo berjalan (running balance),
 * memakai sumber data yang sama dengan Buku Kas di Laporan Keuangan.
 */
function _buildBukuKasWidget(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const txs = [...StorageService.getTransactions()].sort((a, b) =>
    String(a.tanggal).localeCompare(String(b.tanggal)) ||
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

  // Saldo awal bulan = akumulasi seluruh transaksi sebelum bulan ini
  let saldo = txs
    .filter(t => t.tanggal < prefix)
    .reduce((s, t) => isIncome(t) ? s + (t.nominal || 0) : s - (t.nominal || 0), 0);

  const rows = [];
  for (const t of txs.filter(t => String(t.tanggal).startsWith(prefix))) {
    const inc = isIncome(t);
    saldo += inc ? (t.nominal || 0) : -(t.nominal || 0);
    rows.push({ t, inc, saldo });
  }

  if (rows.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📒</div>
        <p class="empty-state-message">Belum ada transaksi bulan ini</p>
      </div>`;
  }

  const last = rows.slice(-5).reverse();

  return `
    <div class="table-responsive">
      <table class="laporan-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Keterangan</th>
            <th class="text-right">Masuk</th>
            <th class="text-right">Keluar</th>
            <th class="text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${last.map(({ t, inc, saldo }) => `
            <tr>
              <td>${fDate(t.tanggal)}</td>
              <td>${_txDesc(t)}</td>
              <td class="text-right amount-income">${inc ? formatRupiah(t.nominal) : '—'}</td>
              <td class="text-right amount-expense">${inc ? '—' : formatRupiah(t.nominal)}</td>
              <td class="text-right" style="font-weight:700;color:${saldo >= 0 ? 'var(--color-teal)' : 'var(--color-danger)'}">
                ${formatRupiah(saldo)}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-2)">
      Menampilkan ${last.length} dari ${rows.length} transaksi bulan ini.
    </p>`;
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

    <section aria-label="Buku Kas Berjalan">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-3)">
        <h3 style="${sh}margin-bottom:0;">Buku Kas Berjalan</h3>
        <button class="btn btn-outline btn-sm" id="btn-lihat-bukukas">Lihat semua →</button>
      </div>
      <div class="card" id="home-bukukas-widget">
        ${_buildBukuKasWidget(_viewYear, _viewMonth)}
      </div>
    </section>

    <section aria-label="Pintasan Laporan Keuangan">
      <h3 style="${sh}">Laporan Keuangan</h3>
      <div class="quick-actions" style="flex-wrap:wrap">
        ${_LAPORAN_SHORTCUTS.map(l => `
          <button class="btn btn-outline btn-sm" data-laporan-tab="${l.tab}">
            ${l.icon} ${l.label}
          </button>`).join('')}
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

  const widget = document.getElementById('home-bukukas-widget');
  if (widget) widget.innerHTML = _buildBukuKasWidget(_viewYear, _viewMonth);

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

  document.getElementById('btn-lihat-bukukas')?.addEventListener('click', () => {
    navigate('#labarugi', { tab: 'bukukas' });
  });

  document.querySelectorAll('[data-laporan-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate('#labarugi', { tab: btn.getAttribute('data-laporan-tab') });
    });
  });
}
