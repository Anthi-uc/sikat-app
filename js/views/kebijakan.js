// kebijakan.js — Halaman Fitur & Kebijakan

export function render(params = {}) {
  return `
    <div class="welcome-card">
      <div class="icon">📋</div>
      <h2>Fitur &amp; Kebijakan</h2>
      <p>Daftar fitur dan kebijakan penggunaan data</p>
    </div>

    <!-- Fitur -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">🚀 Fitur Aplikasi</h3>
      <ul style="display:flex;flex-direction:column;gap:var(--space-3);">
        ${[
          ['➕', 'Input Transaksi', 'Catat pemasukan (penjualan telur) dan pengeluaran (pakan & biaya lain) dengan detail lengkap.'],
          ['👛', 'Rekap Kas', 'Pantau saldo kas terkini dan riwayat seluruh transaksi secara real-time.'],
          ['📊', 'Laba Rugi', 'Laporan keuangan mingguan/bulanan/tahunan dengan grafik dan export ke Excel.'],
          ['🥚', 'Produksi Harian', 'Catat hasil panen telur harian dan pantau tren produksi 7 hari terakhir.'],
          ['👤', 'Profil Admin', 'Atur nama dan foto profil admin yang ditampilkan di header.'],
          ['📱', 'PWA Offline', 'Aplikasi dapat diinstal di HP Android dan digunakan tanpa koneksi internet.'],
          ['📥', 'Export Excel', 'Unduh laporan laba rugi sebagai file .xlsx langsung dari perangkat.'],
        ].map(([icon, judul, desc]) => `
          <li style="display:flex;gap:var(--space-3);align-items:flex-start;">
            <span style="font-size:1.25rem;flex-shrink:0;">${icon}</span>
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
          <p style="font-weight:700;color:#14532d;margin-bottom:var(--space-2);">✅ Data Anda 100% Disimpan Lokal</p>
          <p style="color:#14532d;">Seluruh data transaksi, produksi, dan profil disimpan <strong>hanya di perangkat Anda</strong> menggunakan mekanisme <em>localStorage</em> browser. Tidak ada data yang dikirim ke server manapun.</p>
        </div>
        <ul style="padding-left:var(--space-5);display:flex;flex-direction:column;gap:var(--space-2);">
          <li>Data hanya tersedia di browser/perangkat yang digunakan saat input.</li>
          <li>Menghapus data browser (clear site data) akan menghapus semua data SIKAT.</li>
          <li>Untuk backup, gunakan fitur Export Excel secara berkala.</li>
          <li>SIKAT tidak mengumpulkan, membagikan, atau menjual data pengguna.</li>
          <li>Aplikasi tidak memerlukan akun atau koneksi internet untuk digunakan (setelah diinstal).</li>
        </ul>
      </div>
    </div>

    <!-- Hak Cipta -->
    <div class="card" style="text-align:center;">
      <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">
        &copy; 2026 BUMKam Torei Natei &bull; SIKAT &bull; Kampung Yakonde, Papua<br>
        Dikembangkan untuk mendukung usaha ayam petelur lokal.
      </p>
    </div>
  `;
}

export function attachListeners(params = {}) {}
