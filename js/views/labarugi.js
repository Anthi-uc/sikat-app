// labarugi.js — View Laba Rugi (dengan filter periode dan export Excel)

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { ChartManager } from '../charts.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

/**
 * Hitung rentang tanggal (start, end) berdasarkan pilihan periode.
 * @param {'minggu'|'bulan'|'tahun'} periode
 * @returns {{ start: Date, end: Date, label: string }}
 */
function getRentangPeriode(periode) {
  const now = new Date();

  if (periode === 'bulan') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const namaBulan = ['Januari','Februari','Maret','April','Mei','Juni',
                       'Juli','Agustus','September','Oktober','November','Desember'];
    return { start, end, label: `${namaBulan[now.getMonth()]} ${now.getFullYear()}` };
  }

  if (periode === 'tahun') {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    return { start, end, label: `Tahun ${now.getFullYear()}` };
  }

  // default: minggu berjalan (Senin–Minggu)
  const { start, end } = CalculationEngine.getBatasMingguBerjalan();
  return { start, end, label: 'Minggu Ini' };
}

/**
 * Hitung data laporan dan kelas warna Untung Bersih.
 * @param {'minggu'|'bulan'|'tahun'} periode
 */
function hitungLaporan(periode) {
  const { start, end, label } = getRentangPeriode(periode);
  const transactions = StorageService.getTransactions();
  const laporan = CalculationEngine.getLaporanPeriode(transactions, start, end);
  const margin  = CalculationEngine.getMarginKeuntungan(laporan.untungBersih, laporan.totalPenjualan);

  let untungClass;
  if (laporan.untungBersih > 0)      untungClass = 'untung-positif';
  else if (laporan.untungBersih < 0) untungClass = 'untung-negatif';
  else                               untungClass = 'untung-netral';

  return { laporan, margin, untungClass, label };
}

// ─── render ──────────────────────────────────────────────────────────────────

export function render(params = {}) {
  // Hitung data periode default (minggu) untuk render awal
  const { laporan, margin, untungClass, label } = hitungLaporan('minggu');

  return `
    <div class="welcome-card">
      <div class="icon">📊</div>
      <h2>Laba Rugi</h2>
      <p>Pendapatan vs biaya usaha</p>
    </div>

    <!-- Grafik mingguan (selalu tampilkan 4 minggu terakhir) -->
    <div class="card" style="margin-bottom:var(--space-6);">
      <p style="font-weight:700;margin-bottom:var(--space-3);">Grafik 4 Minggu Terakhir</p>
      <div class="chart-container">
        <canvas id="chart-weekly" aria-label="Grafik Laba Rugi Mingguan"></canvas>
      </div>
    </div>

    <!-- Filter periode + tombol export -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-4);">
      <div class="form-group" style="margin-bottom:0;flex:1;min-width:160px;max-width:280px;">
        <label class="form-label" for="filter-periode" style="font-size:var(--font-size-sm);">Filter Periode</label>
        <select class="form-control" id="filter-periode" aria-label="Pilih periode laporan">
          <option value="minggu" selected>Minggu Ini</option>
          <option value="bulan">Bulan Ini</option>
          <option value="tahun">Tahun Ini</option>
        </select>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-export-excel" style="white-space:nowrap;" title="Unduh tabel sebagai file Excel">
        📥 Export ke Excel
      </button>
    </div>

    <!-- Tabel ringkasan (diperbarui saat filter berubah) -->
    <div class="card" id="card-laporan" style="margin-bottom:var(--space-6);">
      <p style="font-weight:700;margin-bottom:var(--space-4);" id="laporan-judul">${label}</p>
      <table class="labarugi-table" id="tabel-laporan">
        <thead>
          <tr><th>Keterangan</th><th style="text-align:right;">Jumlah</th></tr>
        </thead>
        <tbody id="tbody-laporan">
          <tr><td>Penjualan Telur</td><td style="text-align:right;">${formatRupiah(laporan.totalPenjualan)}</td></tr>
          <tr><td>Biaya Pakan</td><td style="text-align:right;">${formatRupiah(laporan.totalPakan)}</td></tr>
          <tr><td>Biaya Lain</td><td style="text-align:right;">${formatRupiah(laporan.totalBiayaLain)}</td></tr>
          <tr class="row-untung">
            <td>Untung Bersih</td>
            <td class="${untungClass}" style="text-align:right;">${formatRupiah(laporan.untungBersih)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Margin keuntungan -->
    <div class="margin-box" id="margin-box">
      <p class="margin-box-label" id="margin-label">Margin Keuntungan — ${label}</p>
      <p class="margin-box-value" id="margin-value">${margin.toFixed(2)}%</p>
    </div>
  `;
}

// ─── attachListeners ─────────────────────────────────────────────────────────

export function attachListeners(params = {}) {

  // ── Render grafik mingguan (selalu 4 minggu, tidak berubah per filter) ──
  try {
    const transactions = StorageService.getTransactions();
    const weeklyData = CalculationEngine.getDataGrafikMingguan(transactions, 4);
    ChartManager.renderWeeklyChart('chart-weekly', weeklyData);
  } catch (e) {
    console.error('[LabaRugi] Gagal render grafik:', e);
    const container = document.querySelector('.chart-container');
    if (container) container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:2rem;">Grafik tidak tersedia</p>';
  }

  // ── refreshLaporan: update tabel + margin saat filter berubah ─────────
  function refreshLaporan(periode) {
    const { laporan, margin, untungClass, label } = hitungLaporan(periode);

    // Judul kartu
    const judulEl = document.getElementById('laporan-judul');
    if (judulEl) judulEl.textContent = label;

    // Isi tabel
    const tbody = document.getElementById('tbody-laporan');
    if (tbody) {
      tbody.innerHTML = `
        <tr><td>Penjualan Telur</td><td style="text-align:right;">${formatRupiah(laporan.totalPenjualan)}</td></tr>
        <tr><td>Biaya Pakan</td><td style="text-align:right;">${formatRupiah(laporan.totalPakan)}</td></tr>
        <tr><td>Biaya Lain</td><td style="text-align:right;">${formatRupiah(laporan.totalBiayaLain)}</td></tr>
        <tr class="row-untung">
          <td>Untung Bersih</td>
          <td class="${untungClass}" style="text-align:right;">${formatRupiah(laporan.untungBersih)}</td>
        </tr>
      `;
    }

    // Margin
    const marginLabelEl = document.getElementById('margin-label');
    const marginValueEl = document.getElementById('margin-value');
    if (marginLabelEl) marginLabelEl.textContent = `Margin Keuntungan — ${label}`;
    if (marginValueEl) marginValueEl.textContent = `${margin.toFixed(2)}%`;
  }

  // ── Listener filter dropdown ───────────────────────────────────────────
  const filterEl = document.getElementById('filter-periode');
  if (filterEl) {
    filterEl.addEventListener('change', () => {
      refreshLaporan(filterEl.value);
    });
  }

  // ── Export ke Excel ────────────────────────────────────────────────────
  const btnExport = document.getElementById('btn-export-excel');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      // Cek SheetJS tersedia
      if (typeof window === 'undefined' || typeof window.XLSX === 'undefined') {
        alert('Library Excel (SheetJS) belum tersedia. Pastikan terhubung ke internet saat pertama kali membuka aplikasi.');
        return;
      }

      const periode = filterEl ? filterEl.value : 'minggu';
      const { laporan, label } = hitungLaporan(periode);

      // Susun data untuk sheet
      const rows = [
        ['Keterangan', 'Jumlah (Rp)'],
        ['Penjualan Telur', laporan.totalPenjualan],
        ['Biaya Pakan', laporan.totalPakan],
        ['Biaya Lain', laporan.totalBiayaLain],
        ['Untung Bersih', laporan.untungBersih],
      ];

      const ws = window.XLSX.utils.aoa_to_sheet(rows);

      // Lebar kolom
      ws['!cols'] = [{ wch: 22 }, { wch: 18 }];

      // Format sel nominal sebagai angka (kolom B baris 2–5)
      for (let r = 1; r <= 4; r++) {
        const cellAddr = window.XLSX.utils.encode_cell({ c: 1, r });
        if (ws[cellAddr]) {
          ws[cellAddr].t = 'n';
          ws[cellAddr].z = '#,##0';
        }
      }

      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Laba Rugi');

      // Nama file: SIKAT_LabaRugi_<periode>_<tanggal>.xlsx
      const today = new Date();
      const tgl = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
      const namaFile = `SIKAT_LabaRugi_${label.replace(/\s+/g,'-')}_${tgl}.xlsx`;

      window.XLSX.writeFile(wb, namaFile);
    });
  }
}
