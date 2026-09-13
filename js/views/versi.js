// versi.js — Halaman Versi Aplikasi

export function render(params = {}) {
  return `
    <div class="welcome-card">
      <div class="icon">ℹ️</div>
      <h2>Versi Aplikasi</h2>
      <p>Informasi versi dan riwayat perubahan SIKAT</p>
    </div>

    <!-- Info versi -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3);">
        <div>
          <p style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-primary);">v1.0.0</p>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Rilis: September 2026</p>
        </div>
        <span class="badge badge-success" style="font-size:var(--font-size-sm);padding:var(--space-1) var(--space-3);">
          ✅ Stabil
        </span>
      </div>
    </div>

    <!-- Fitur tersedia -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">📦 Fitur yang Tersedia</h3>
      <ul style="display:flex;flex-direction:column;gap:var(--space-2);">
        ${[
          'Input & simpan transaksi keuangan (pemasukan & pengeluaran)',
          'Rekap kas dengan saldo otomatis dan riwayat transaksi',
          'Laporan laba rugi dengan filter periode (minggu / bulan / tahun)',
          'Grafik tren keuangan mingguan (penjualan vs biaya pakan)',
          'Export laporan ke file Excel (.xlsx)',
          'Pencatatan produksi telur harian (satuan Rak, konversi ke butir otomatis)',
          'Grafik tren produksi 7 hari terakhir',
          'Progressive Web App (PWA) — dapat diinstal di HP Android',
          'Mode offline — semua data tersimpan lokal di perangkat',
          'Pengaturan profil admin (nama + foto)',
          'Splash screen dan navigasi SPA dengan hash routing',
        ].map(f => `<li style="display:flex;gap:var(--space-2);align-items:flex-start;font-size:var(--font-size-sm);">
          <span style="color:var(--color-primary);flex-shrink:0;">✓</span>
          <span>${f}</span>
        </li>`).join('')}
      </ul>
    </div>

    <!-- Teknologi -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">🛠 Teknologi</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
        ${[
          ['HTML5', 'Struktur & PWA shell'],
          ['CSS3', 'Desain responsif mobile-first'],
          ['JavaScript ES6+', 'Logika aplikasi (tanpa framework)'],
          ['LocalStorage', 'Penyimpanan data lokal'],
          ['Service Worker', 'Caching & dukungan offline'],
          ['Chart.js 4.4', 'Grafik interaktif'],
          ['SheetJS (xlsx)', 'Export Excel'],
          ['Web Manifest', 'Instalasi PWA Android'],
        ].map(([nama, desk]) => `
          <div style="font-size:var(--font-size-xs);">
            <p style="font-weight:600;color:var(--color-text);">${nama}</p>
            <p style="color:var(--color-text-muted);">${desk}</p>
          </div>`).join('')}
      </div>
    </div>

    <!-- Copyright -->
    <div class="card" style="text-align:center;">
      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
        &copy; 2026 BUMKam Torei Natei &bull; SIKAT &bull; Sistem Informasi Kas Ayam Ternak
      </p>
    </div>
  `;
}

export function attachListeners(params = {}) {}
