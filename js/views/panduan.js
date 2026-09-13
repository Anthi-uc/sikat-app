// panduan.js — Halaman Panduan Pengguna

export function render(params = {}) {
  return `
    <div class="welcome-card">
      <div class="icon">📖</div>
      <h2>Panduan Pengguna</h2>
      <p>Cara menggunakan aplikasi SIKAT</p>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-2);">
        ➕ Input Transaksi
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Buka menu <strong>Input Transaksi</strong> dari Menu Utama.</li>
        <li>Pilih <strong>Jenis Transaksi</strong>: Penjualan Telur, Pembelian Pakan, atau Biaya Lain.</li>
        <li>Isi <strong>Tanggal</strong>, <strong>Lokasi</strong>, dan <strong>Nominal (Rp)</strong>.</li>
        <li>Jika memilih Penjualan Telur, isi juga <strong>Jumlah Rak</strong>.</li>
        <li>Tekan tombol <strong>Simpan</strong>. Data langsung masuk ke Rekap Kas.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-2);">
        👛 Rekap Kas
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Buka menu <strong>Rekap Kas</strong> dari Menu Utama.</li>
        <li>Lihat <strong>Saldo Kas</strong> terkini di bagian atas halaman.</li>
        <li>Gulir ke bawah untuk melihat <strong>Riwayat Transaksi</strong> lengkap, diurutkan dari terbaru.</li>
        <li>Pemasukan ditampilkan dengan warna <span style="color:var(--color-primary);font-weight:600;">hijau (+)</span>, pengeluaran dengan warna <span style="color:var(--color-danger);font-weight:600;">merah (−)</span>.</li>
        <li>Kotak Ringkasan menampilkan total pemasukan dan pengeluaran hari ini.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-2);">
        📊 Laba Rugi
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Buka menu <strong>Laba Rugi</strong> dari Menu Utama.</li>
        <li>Grafik garis menampilkan penjualan vs biaya pakan untuk 4 minggu terakhir.</li>
        <li>Gunakan dropdown <strong>Filter Periode</strong> untuk memilih Minggu Ini, Bulan Ini, atau Tahun Ini.</li>
        <li>Tabel ringkasan menampilkan Penjualan Telur, Biaya Pakan, Biaya Lain, dan <strong>Untung Bersih</strong>.</li>
        <li>Klik <strong>Export ke Excel</strong> untuk mengunduh laporan sebagai file .xlsx.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-2);">
        🥚 Produksi Harian
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Buka menu <strong>Produksi Harian</strong> dari Menu Utama.</li>
        <li>Pilih <strong>Tanggal</strong> dan masukkan <strong>Jumlah Rak</strong> yang dipanen hari itu.</li>
        <li>Tekan <strong>Simpan</strong>. Grafik tren 7 hari dan daftar riwayat langsung diperbarui.</li>
        <li>1 Rak = 30 butir telur. Konversi ditampilkan otomatis di Menu Utama.</li>
        <li>Jika tanggal sudah ada data, aplikasi meminta konfirmasi sebelum menimpa.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-2);">
        👤 Pengaturan Profil
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Klik ikon avatar di pojok kanan header untuk membuka halaman Profil.</li>
        <li>Ganti nama admin (maks. 25 karakter) dan foto profil.</li>
        <li>Foto otomatis di-resize ke 300×300px sebelum disimpan.</li>
        <li>Tekan <strong>Simpan Profil</strong> — header langsung diperbarui tanpa perlu refresh.</li>
      </ol>
    </div>
  `;
}

export function attachListeners(params = {}) {}
