// panduan.js — Halaman Panduan Pengguna

import { getProfilEscaped } from '../profil-usaha.js';

export function render(params = {}) {
  return `
    <div class="welcome-card">
      <div class="icon">📖</div>
      <h2>Panduan Pengguna</h2>
      <p>Cara menggunakan aplikasi SIKAT</p>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        ⚙️ 1. Pengaturan Awal
      </h3>
      <p style="font-size:var(--font-size-sm);color:var(--color-text);margin-bottom:var(--space-2);">
        Sebelum memulai, pastikan Anda telah mengatur profil usaha.
      </p>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Klik ikon avatar di pojok kanan atas untuk membuka halaman Profil.</li>
        <li>Isi <strong>Nama BUMKam / Nama Usaha</strong> (wajib).</li>
        <li>Isi <strong>Nama Kampung</strong> (wajib).</li>
        <li>Isi <strong>Dasar Hukum Pendirian</strong> jika ada (opsional), misalnya nomor peraturan kampung atau AD/ART.</li>
        <li>Lengkapi data lain seperti alamat, WhatsApp, email, dan foto profil admin sesuai kebutuhan.</li>
        <li>Simpan profil. Data ini akan muncul di seluruh laporan keuangan.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        ➕ 2. Input Transaksi
      </h3>
      <p style="font-size:var(--font-size-sm);color:var(--color-text);margin-bottom:var(--space-2);">
        Catat semua pemasukan dan pengeluaran kas dengan sistem kategori bertingkat.
      </p>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Buka menu <strong>Input Transaksi</strong> dari Menu Utama.</li>
        <li>Pilih <strong>Tanggal</strong> transaksi.</li>
        <li>Pilih <strong>Kategori</strong> (Penjualan, Modal, Peralatan, Perlengkapan, Persediaan, Utang, Kas, Lainnya).</li>
        <li>Pilih <strong>Sub-kategori</strong> yang sesuai (misalnya: Penjualan → Penjualan Telur).</li>
        <li>Masukkan <strong>Kuantitas</strong> dan <strong>Harga Satuan</strong>. Total nominal akan dihitung otomatis.</li>
        <li>Untuk penjualan telur: gunakan satuan <strong>Rak</strong> (1 Rak = 30 butir) atau <strong>Butir</strong>.</li>
        <li>Isi <strong>Keterangan</strong> untuk detail transaksi (misalnya: nama pembeli atau toko).</li>
        <li>Klik <strong>Simpan</strong>. Data langsung masuk ke rekap dan laporan keuangan.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        💰 3. Rekap Transaksi Harian
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Buka menu <strong>Rekap Kas</strong> dari Menu Utama.</li>
        <li>Lihat <strong>Saldo Kas</strong> terkini di bagian atas.</li>
        <li>Ringkasan harian menampilkan total pemasukan dan pengeluaran hari ini.</li>
        <li>Daftar riwayat transaksi ditampilkan lengkap, pemasukan berwarna hijau dan pengeluaran berwarna merah.</li>
        <li>Data diurutkan dari transaksi terbaru ke terlama.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        🥚 4. Produksi Harian
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Buka menu <strong>Produksi Harian</strong>.</li>
        <li>Pilih <strong>Tanggal</strong> produksi.</li>
        <li>Masukkan <strong>Jumlah Rak</strong> telur yang dipanen (1 Rak = 30 butir).</li>
        <li>Klik <strong>Simpan</strong>. Sistem akan menghitung jumlah butir otomatis.</li>
        <li>Grafik tren produksi 7 hari terakhir akan diperbarui.</li>
        <li>Jika tanggal sudah pernah dicatat, aplikasi akan meminta konfirmasi sebelum menimpa data lama.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        📊 5. Laporan Keuangan
      </h3>
      <p style="font-size:var(--font-size-sm);color:var(--color-text);margin-bottom:var(--space-2);">
        SIKAT menyediakan 5 jenis laporan keuangan lengkap:
      </p>
      <ul style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li><strong>Laba Rugi:</strong> Menampilkan pendapatan, beban, dan laba bersih. Grafik tren keuangan 1 bulan terakhir. Filter periode: minggu, bulan, tahun.</li>
        <li><strong>Neraca:</strong> Posisi aset, kewajiban, dan ekuitas pada tanggal tertentu.</li>
        <li><strong>Arus Kas:</strong> Rincian arus kas dari aktivitas operasi, investasi, dan pendanaan.</li>
        <li><strong>CALK (Catatan Atas Laporan Keuangan):</strong> Penjelasan naratif tentang kebijakan akuntansi, rincian aset, kinerja operasional, dan komitmen.</li>
        <li><strong>Buku Kas:</strong> Jurnal kas harian lengkap dengan saldo berjalan.</li>
      </ul>
      <p style="font-size:var(--font-size-sm);color:var(--color-text);margin-top:var(--space-3);">
        Semua laporan dapat dicetak ke PDF atau diekspor ke Excel untuk arsip dan pelaporan.
      </p>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        🖨️ 6. Cetak dan Ekspor
      </h3>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li>Pada halaman <strong>Laporan Keuangan</strong>, pilih tab yang ingin dicetak.</li>
        <li>Klik tab <strong>Cetak</strong> untuk melihat pratinjau semua laporan.</li>
        <li>Gunakan tombol <strong>Cetak / PDF</strong> untuk mencetak atau menyimpan sebagai PDF.</li>
        <li>Gunakan tombol <strong>Export Excel</strong> untuk mengunduh laporan dalam format .xlsx.</li>
        <li>File Excel akan diunduh otomatis ke perangkat Anda dengan nama berisi periode dan nama usaha.</li>
      </ol>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);background:var(--color-primary-light);border-left:4px solid var(--color-primary);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        📜 Dasar Hukum Penyusunan Laporan
      </h3>
      <p style="font-size:var(--font-size-sm);color:var(--color-text);line-height:1.6;">
        Laporan keuangan yang disusun SIKAT mengacu pada <strong>SAK EMKM</strong> (Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah), 
        <strong>PP Nomor 11 Tahun 2021</strong> tentang Badan Usaha Milik Desa, dan <strong>Keputusan Menteri Desa PDTT Nomor 136 Tahun 2022</strong> 
        tentang Panduan Penyusunan Laporan Keuangan BUM Desa. Untuk detail lengkap mengenai dasar hukum dan standar yang diterapkan, 
        lihat halaman <strong>Fitur &amp; Kebijakan</strong>.
      </p>
    </div>

    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-3);">
        📅 7. Alur Kerja Bulanan
      </h3>
      <p style="font-size:var(--font-size-sm);color:var(--color-text);margin-bottom:var(--space-2);">
        Berikut alur kerja yang direkomendasikan untuk penggunaan SIKAT setiap bulan:
      </p>
      <ol style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <li><strong>Setiap hari:</strong> Catat transaksi keuangan dan produksi harian.</li>
        <li><strong>Setiap minggu:</strong> Periksa rekap kas dan grafik tren produksi.</li>
        <li><strong>Akhir bulan:</strong> Buka halaman Laporan Keuangan, pilih periode bulan berjalan, dan tinjau Laba Rugi, Neraca, dan Arus Kas.</li>
        <li><strong>Akhir bulan:</strong> Ekspor laporan ke Excel untuk arsip dan pelaporan ke pengurus atau pemerintah kampung.</li>
        <li><strong>Berkala:</strong> Backup data dengan mengekspor semua laporan ke Excel, karena data tersimpan lokal di perangkat.</li>
      </ol>
    </div>

    <div class="card" style="text-align:center;">
      <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">
        &copy; 2026 ${getProfilEscaped().namaBumkam} &bull; SIKAT &bull; ${getProfilEscaped().namaKampung}, Papua
      </p>
    </div>
  `;
}

export function attachListeners(params = {}) {}
