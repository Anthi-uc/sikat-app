import { getProfilEscaped } from '../profil-usaha.js';
// kebijakan.js — Halaman Fitur & Kebijakan

export function render(params = {}) {
  return `
    <div class="welcome-card">
      <div class="icon">📋</div>
      <h2>Fitur &amp; Kebijakan</h2>
      <p>Daftar fitur, kebijakan penggunaan data, dan dasar hukum</p>
    </div>

    <!-- Fitur -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">🚀 Fitur Aplikasi</h3>
      <ul style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${[
          ['➕ Input Transaksi Bertingkat', 'Catat pemasukan dan pengeluaran dengan kategori bertingkat (8 kategori utama, 29 sub-kategori). Input kuantitas, harga satuan, dan total otomatis. Konversi telur 1 rak = 30 butir.'],
          ['💰 Rekap Transaksi Harian', 'Pantau saldo kas terkini, ringkasan harian, dan riwayat transaksi lengkap dengan warna hijau (pemasukan) dan merah (pengeluaran).'],
          ['🥚 Produksi Harian', 'Catat hasil panen telur harian dalam satuan Rak atau Butir. Grafik tren produksi 7 hari terakhir.'],
          ['📊 Laporan Laba Rugi', 'Laporan pendapatan, beban, dan laba bersih dengan filter periode (minggu, bulan, tahun). Grafik tren keuangan 1 bulan terakhir.'],
          ['⚖️ Laporan Neraca', 'Posisi aset (kas, persediaan telur, peralatan), kewajiban (utang), dan ekuitas (modal, laba ditahan) pada tanggal tertentu.'],
          ['💸 Laporan Arus Kas', 'Rincian arus kas dari aktivitas operasi, investasi, dan pendanaan.'],
          ['📑 CALK', 'Catatan Atas Laporan Keuangan naratif terstruktur: gambaran umum, dasar penyusunan, kebijakan akuntansi, rincian aset, analisis kinerja, dan komitmen.'],
          ['📒 Buku Kas', 'Jurnal kas harian lengkap dengan saldo berjalan untuk setiap transaksi.'],
          ['🖨️ Cetak dan Ekspor', 'Cetak semua laporan ke PDF atau ekspor ke Excel (.xlsx) dengan nama file dinamis.'],
          ['👤 Profil Usaha Dinamis', 'Atur nama BUMKam, nama kampung, dasar hukum pendirian, alamat, WhatsApp, email, dan foto profil admin. Data muncul di seluruh laporan.'],
          ['📱 PWA Offline', 'Aplikasi dapat diinstal di HP Android dan digunakan tanpa koneksi internet setelah instalasi pertama.'],
          ['🔐 Autentikasi Pengguna', 'Login dan registrasi akun dengan data tersimpan lokal untuk keamanan akses.'],
        ].map(([judul, desc]) => `
          <li style="display:flex;gap:var(--space-3);align-items:flex-start;">
            <span style="font-size:1rem;flex-shrink:0;color:var(--color-primary);">&#10003;</span>
            <div>
              <p style="font-weight:600;font-size:var(--font-size-sm);margin-bottom:2px;">${judul}</p>
              <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);">${desc}</p>
            </div>
          </li>`).join('')}
      </ul>
    </div>

    <!-- Kebijakan Data -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">🔒 Kebijakan Penggunaan Data</h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-4);font-size:var(--font-size-sm);color:var(--color-text);">
        <div style="padding:var(--space-4);background:var(--color-primary-light);border-radius:var(--radius-md);border-left:4px solid var(--color-primary);">
          <p style="font-weight:700;color:#14532d;margin-bottom:var(--space-2);">Data Anda 100% Disimpan Lokal</p>
          <p style="color:#14532d;">Seluruh data transaksi, produksi, dan profil disimpan <strong>hanya di perangkat Anda</strong> menggunakan mekanisme localStorage browser. Tidak ada data yang dikirim ke server manapun.</p>
        </div>
        <ul style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);">
          <li>Data hanya tersedia di browser dan perangkat yang digunakan saat input.</li>
          <li>Menghapus data browser (clear site data / hapus cache) akan menghapus semua data SIKAT secara permanen.</li>
          <li>Untuk backup, gunakan fitur Export Excel secara berkala dan simpan file hasil ekspor di lokasi aman.</li>
          <li>SIKAT tidak mengumpulkan, membagikan, atau menjual data pengguna kepada pihak manapun.</li>
          <li>Aplikasi tidak memerlukan akun eksternal atau koneksi internet untuk digunakan (setelah instalasi pertama).</li>
          <li>Pengguna bertanggung jawab penuh atas keamanan perangkat dan backup data sendiri.</li>
        </ul>
      </div>
    </div>

    <!-- Kebijakan Akuntansi -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">📚 Kebijakan Akuntansi Dasar</h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-3);font-size:var(--font-size-sm);color:var(--color-text);">
        <p><strong>Basis Pencatatan:</strong> Kas yang dimodifikasi. Pendapatan diakui saat kas diterima, beban diakui saat kas dikeluarkan.</p>
        <p><strong>Aset Tetap:</strong> Peralatan kandang, mesin produksi, kendaraan, dan peralatan lainnya dicatat sebagai aset tetap dan dilaporkan di Neraca. Pembelian peralatan tidak mengurangi laba rugi periode berjalan.</p>
        <p><strong>Perlengkapan Habis Pakai:</strong> Tempat pakan/minum, alat kebersihan, dan perlengkapan lainnya yang habis pakai dicatat sebagai beban operasional dan mengurangi laba rugi periode berjalan.</p>
        <p><strong>Persediaan Telur:</strong> Diperhitungkan berdasarkan data produksi harian dikurangi penjualan, dengan harga pasar terkini.</p>
        <p><strong>Persediaan Ayam:</strong> Pembelian bibit atau ayam ternak dicatat sebagai aset persediaan di Neraca.</p>
        <p><strong>Utang dan Modal:</strong> Pencairan utang meningkatkan kewajiban, pembayaran utang mengurangi kewajiban. Setoran modal meningkatkan ekuitas, pengambilan kas (prive) mengurangi ekuitas.</p>
      </div>
    </div>

    <!-- Dasar Hukum dan Standar -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">⚖️ Dasar Hukum dan Standar</h3>
      <p style="font-size:var(--font-size-sm);color:var(--color-text);margin-bottom:var(--space-3);">
        Penyusunan laporan keuangan dalam aplikasi SIKAT mengacu pada peraturan perundang-undangan dan standar akuntansi berikut:
      </p>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">
          <thead>
            <tr style="background:var(--color-bg);border-bottom:2px solid var(--color-border);">
              <th style="padding:var(--space-2);text-align:left;font-weight:700;">Regulasi / Standar</th>
              <th style="padding:var(--space-2);text-align:left;font-weight:700;">Kaitan dengan SIKAT</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">UU No. 6/2014 tentang Desa</td>
              <td style="padding:var(--space-2);">Dasar hukum pendirian BUM Desa sebagai lembaga ekonomi desa.</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">UU No. 3/2024 tentang Perubahan Kedua atas UU No. 6/2014</td>
              <td style="padding:var(--space-2);">Pembaruan ketentuan BUM Desa dan BUM Desa Bersama, termasuk tata kelola dan pelaporan.</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">PP No. 11/2021 tentang BUM Desa</td>
              <td style="padding:var(--space-2);">Pasal 58: kewajiban penyampaian laporan berkala. Pasal 43: penyertaan modal desa. Pasal 48: pinjaman dan utang.</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">Permendesa PDTT No. 3/2021</td>
              <td style="padding:var(--space-2);">Pedoman pengelolaan dan pelaporan keuangan BUM Desa.</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">Kepmendesa PDTT No. 136/2022</td>
              <td style="padding:var(--space-2);">Panduan Penyusunan Laporan Keuangan BUM Desa yang menjadi acuan format dan isi laporan.</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">Permendagri No. 20/2018</td>
              <td style="padding:var(--space-2);">Pengelolaan Keuangan Desa, mengatur transparansi dan akuntabilitas pengelolaan keuangan entitas desa.</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">SAK EMKM (efektif 1 Jan 2018)</td>
              <td style="padding:var(--space-2);">Standar Akuntansi Keuangan untuk Entitas Mikro, Kecil, dan Menengah. Laporan wajib: Neraca, Laba Rugi, CALK. Arus Kas merupakan laporan pelengkap.</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);vertical-align:top;">UU No. 27/2022 tentang Pelindungan Data Pribadi</td>
              <td style="padding:var(--space-2);">Dasar kebijakan privasi SIKAT: data tersimpan lokal, tidak dikirim ke server, pengguna memiliki kontrol penuh.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="font-size:var(--font-size-sm);color:var(--color-text);margin-top:var(--space-4);margin-bottom:var(--space-3);">
        <strong>Kesesuaian Laporan SIKAT dengan SAK EMKM:</strong>
      </p>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:var(--font-size-sm);">
          <thead>
            <tr style="background:var(--color-bg);border-bottom:2px solid var(--color-border);">
              <th style="padding:var(--space-2);text-align:left;font-weight:700;">Laporan</th>
              <th style="padding:var(--space-2);text-align:left;font-weight:700;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);">Laba Rugi</td>
              <td style="padding:var(--space-2);">Wajib (SAK EMKM)</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);">Neraca</td>
              <td style="padding:var(--space-2);">Wajib (SAK EMKM)</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);">Arus Kas</td>
              <td style="padding:var(--space-2);">Laporan Pelengkap</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);">CALK</td>
              <td style="padding:var(--space-2);">Wajib (SAK EMKM)</td>
            </tr>
            <tr style="border-bottom:1px solid var(--color-border);">
              <td style="padding:var(--space-2);">Buku Kas</td>
              <td style="padding:var(--space-2);">Catatan Pembukuan Internal</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-3);font-style:italic;">
        <strong>Catatan:</strong> Rujukan ini bersifat informatif dan bukan nasihat hukum. Periksa naskah resmi pada JDIH Kementerian Desa dan peraturan.bpk.go.id. Terakhir diperiksa: 3 Oktober 2026.
      </p>
    </div>

    <!-- Ketentuan Penggunaan -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">📋 Ketentuan Penggunaan &amp; Batasan Tanggung Jawab</h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-2);font-size:var(--font-size-sm);color:var(--color-text);">
        <p>Aplikasi SIKAT disediakan "apa adanya" untuk membantu BUMKam dalam pencatatan keuangan sederhana.</p>
        <ul style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);">
          <li>Pengguna bertanggung jawab atas keakuratan data yang diinput dan keamanan perangkat.</li>
          <li>Pengembang tidak bertanggung jawab atas kehilangan data akibat penghapusan cache browser, kerusakan perangkat, atau kesalahan input.</li>
          <li>Laporan keuangan yang dihasilkan harus ditinjau oleh pengurus atau konsultan keuangan yang kompeten sebelum digunakan untuk pengambilan keputusan atau pelaporan resmi.</li>
          <li>Untuk interpretasi peraturan atau audit formal, konsultasikan dengan tenaga ahli atau lembaga berwenang.</li>
        </ul>
      </div>
    </div>

    <!-- Hak Cipta -->
    <div class="card" style="text-align:center;">
      <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">
        &copy; 2026 ${getProfilEscaped().namaBumkam} &bull; SIKAT &bull; ${getProfilEscaped().namaKampung}, Papua<br>
        Dikembangkan untuk mendukung usaha ayam petelur lokal.
      </p>
    </div>
  `;
}

export function attachListeners(params = {}) {}
