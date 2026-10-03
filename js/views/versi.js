import { getProfilEscaped } from '../profil-usaha.js';
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
          <p style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-primary);">v2.6.0</p>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">Rilis: Oktober 2026</p>
        </div>
        <span class="badge badge-success" style="font-size:var(--font-size-sm);padding:var(--space-1) var(--space-3);">
          Stabil
        </span>
      </div>
    </div>

    <!-- Fitur tersedia -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">Fitur yang Tersedia</h3>
      <ul style="display:flex;flex-direction:column;gap:var(--space-2);">
        ${[
          'Input transaksi dengan kategori bertingkat (8 kategori utama, 29 sub-kategori)',
          'Input kuantitas dan harga satuan, perhitungan total nominal otomatis',
          'Konversi telur 1 rak = 30 butir otomatis',
          'Rekap kas dengan saldo otomatis dan riwayat transaksi lengkap',
          'Pencatatan produksi telur harian dalam satuan Rak atau Butir',
          'Grafik tren produksi 7 hari terakhir',
          'Laporan Laba Rugi dengan filter periode (minggu, bulan, tahun)',
          'Grafik tren keuangan 1 bulan terakhir (penjualan vs biaya pakan)',
          'Laporan Neraca dengan posisi aset, kewajiban, dan ekuitas',
          'Laporan Arus Kas dari aktivitas operasi, investasi, dan pendanaan',
          'Catatan Atas Laporan Keuangan (CALK) naratif terstruktur',
          'Buku Kas (jurnal kas harian dengan saldo berjalan)',
          'Cetak semua laporan ke PDF',
          'Export laporan ke file Excel (.xlsx)',
          'Profil usaha dinamis: nama BUMKam, nama kampung, dasar hukum pendirian',
          'Pengaturan profil admin (nama, foto, alamat, WhatsApp, email)',
          'Progressive Web App (PWA) — dapat diinstal di HP Android',
          'Mode offline — semua data tersimpan lokal di perangkat',
          'Autentikasi pengguna (login dan registrasi)',
          'Splash screen dan navigasi SPA dengan hash routing',
        ].map(f => `<li style="display:flex;gap:var(--space-2);align-items:flex-start;font-size:var(--font-size-sm);">
          <span style="color:var(--color-primary);flex-shrink:0;">&#10003;</span>
          <span>${f}</span>
        </li>`).join('')}
      </ul>
    </div>

    <!-- Riwayat Perubahan -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">Riwayat Perubahan</h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        <div>
          <p style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-primary);">v2.6.0 (Oktober 2026)</p>
          <ul style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-1);font-size:var(--font-size-sm);margin-top:var(--space-2);">
            <li>Perbaikan tampilan responsif untuk desktop dan HP</li>
            <li>Implementasi kategori transaksi bertingkat (8 kategori, 29 sub-kategori)</li>
            <li>Grafik Laba Rugi menampilkan tren 1 bulan terakhir (sebelumnya 4 minggu)</li>
            <li>Penghapusan ikon dari semua laporan keuangan untuk tampilan profesional</li>
            <li>Update ikon PWA dengan desain baru</li>
            <li>Perbaikan tampilan halaman Login dan Daftar</li>
            <li>Nama BUMKam dan kampung sekarang dinamis (diambil dari profil usaha)</li>
            <li>Penambahan field dasar hukum pendirian di profil usaha</li>
            <li>Penambahan halaman Dasar Hukum dan Standar di Fitur &amp; Kebijakan</li>
            <li>Perbaikan encoding UTF-8 untuk karakter khusus</li>
            <li>Pembaruan panduan pengguna dengan alur kerja lengkap</li>
          </ul>
        </div>
        <div>
          <p style="font-weight:700;font-size:var(--font-size-sm);color:var(--color-text);">v2.5.0 (September 2026)</p>
          <ul style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-1);font-size:var(--font-size-sm);margin-top:var(--space-2);">
            <li>Rilis awal dengan fitur dasar input transaksi</li>
            <li>Rekap kas dan laporan laba rugi sederhana</li>
            <li>Produksi harian dan grafik tren 7 hari</li>
            <li>Export Excel dan cetak PDF</li>
            <li>PWA offline dengan Service Worker</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Teknologi -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">Teknologi</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);">
        ${[
          ['HTML5', 'Struktur &amp; PWA shell'],
          ['CSS3', 'Desain responsif mobile-first'],
          ['JavaScript ES6+', 'Logika aplikasi (tanpa framework)'],
          ['LocalStorage', 'Penyimpanan data lokal'],
          ['Service Worker', 'Caching &amp; dukungan offline'],
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
        &copy; 2026 ${getProfilEscaped().namaBumkam} &bull; SIKAT &bull; Sistem Informasi Kas Ayam Ternak
      </p>
    </div>
  `;
}

export function attachListeners(params = {}) {}
