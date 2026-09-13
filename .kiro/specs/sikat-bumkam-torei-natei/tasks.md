# Implementation Plan: SIKAT — Sistem Informasi Kas Ayam Ternak

## Overview

Implementasi Progressive Web App (PWA) berbasis HTML/CSS/JavaScript murni untuk BUMKam Torei Natei. Arsitektur SPA dengan hash-based routing, LocalStorage sebagai penyimpanan data, Service Worker untuk offline support, dan Chart.js untuk visualisasi grafik. Semua logika berjalan di sisi klien tanpa backend server.

Urutan implementasi: infrastruktur & data layer → logika bisnis & validasi → routing & shell SPA → views per modul → grafik & PWA → pengujian integrasi.

---

## Tasks

- [x] 1. Setup struktur proyek dan konfigurasi testing
  - Buat struktur direktori sesuai design: `css/`, `js/views/`, `assets/icons/`
  - Inisialisasi `package.json` dengan dependensi: `vitest`, `fast-check`, `@testing-library/dom`, `@vitest/coverage-v8`
  - Buat `vitest.config.js` dengan environment jsdom
  - Buat file placeholder untuk semua modul JS agar import antar modul tidak error
  - _Requirements: Semua persyaratan (fondasi untuk semua modul)_

- [ ] 2. Implementasi Data Layer — StorageService
  - [ ] 2.1 Implementasi `js/storage.js` — StorageService
    - Implementasi `getTransactions()`: baca `sikat_transactions` dari LocalStorage, parse JSON, return `[]` jika kosong atau error
    - Implementasi `getProductions()`: baca `sikat_productions` dari LocalStorage, parse JSON, return `[]` jika kosong atau error
    - Implementasi `saveTransaction(tx)`: simpan transaksi baru ke array, stringify, tulis ke LocalStorage; lempar `StorageError` jika `QuotaExceededError`
    - Implementasi `saveProduction(prod, confirmOverwrite)`: simpan produksi, cek duplikat tanggal, return `OverwriteResult` (`'saved'` | `'cancelled'` | `'needs_confirmation'`)
    - Implementasi `initDummyData()`: cek apakah storage kosong, jika ya muat 10 transaksi + 7 produksi dummy; jangan timpa data yang sudah ada
    - Implementasi `clearAll()`: hapus kedua key dari LocalStorage (untuk testing)
    - Tangani semua error dengan try/catch, log ke console, return default value
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

  - [ ]* 2.2 Tulis property test untuk StorageService — Property 13
    - **Property 13: Round-Trip Serialisasi Data**
    - Gunakan `fc.array(arbitraryTransaction())` dan `fc.array(arbitraryProduction())`
    - Verifikasi `JSON.parse(JSON.stringify(data))` menghasilkan struktur setara secara nilai
    - **Validates: Requirements 9.1**

  - [ ]* 2.3 Tulis property test untuk StorageService — Property 14
    - **Property 14: Data Existing Tidak Ditimpa saat Inisialisasi**
    - Gunakan arbitrary data yang sudah ada di storage, panggil `initDummyData()`, verifikasi data tidak berubah
    - **Validates: Requirements 9.5**

  - [ ]* 2.4 Tulis unit test untuk StorageService
    - Test `getTransactions()` dengan storage kosong → return `[]`
    - Test `getTransactions()` dengan data corrupt (JSON invalid) → return `[]` dan log error
    - Test `saveTransaction()` dengan storage penuh (`QuotaExceededError`) → lempar error tanpa mengubah state
    - Test `saveProduction()` duplikat tanggal → return `'needs_confirmation'`
    - Test `initDummyData()` dengan storage kosong → 10 transaksi + 7 produksi ter-load
    - _Requirements: 9.1, 9.4, 9.5, 9.6_

- [ ] 3. Implementasi Business Logic Layer — CalculationEngine & Helpers
  - [ ] 3.1 Implementasi `js/calculator.js` — CalculationEngine
    - Implementasi `getSaldoKas(transactions)`: `sum(penjualan_telur.nominal) - sum(pembelian_pakan.nominal) - sum(biaya_lain.nominal)`
    - Implementasi `getLaporanPeriode(transactions, start, end)`: filter transaksi dalam rentang tanggal, hitung `totalPenjualan`, `totalPakan`, `totalBiayaLain`, `untungBersih`
    - Implementasi `getMarginKeuntungan(untungBersih, totalPenjualan)`: jika `totalPenjualan === 0` return `0`; else return `(untungBersih / totalPenjualan) * 100` dibulatkan dua desimal
    - Implementasi `rakToButir(rak)`: return `rak * 30`
    - Implementasi `getProduksiHariIni(productions, tanggal)`: filter produksi bertanggal sama, sum jumlahRak, kali 30
    - Implementasi `getRataRataProduksi(productions, hariTerakhir)`: ambil N hari terakhir, `sum(jumlahRak) / hariTerakhir` dibulatkan dua desimal (pembagi selalu N, bukan hanya hari yang ada data)
    - Implementasi `getDataGrafikProduksi(productions, hariTerakhir)`: hasilkan array tepat N titik data mewakili N hari kalender terakhir, nilai `0` untuk hari tanpa data, label format `"DD/MM"`
    - Implementasi `getDataGrafikMingguan(transactions, maxMinggu)`: kelompokkan transaksi per minggu, ambil hingga M minggu terakhir yang punya data, format label `"DD/MM - DD/MM"`
    - Implementasi `getBatasMingguBerjalan()`: return `{ start: Date (Senin), end: Date (Minggu) }` untuk minggu berjalan
    - Implementasi `formatTanggalHeader(date)`: return string format `"<NamaHari>, DD <NamaBulan> YYYY"` dalam Bahasa Indonesia
    - _Requirements: 4.11, 4.12, 6.1, 6.2, 7.4, 7.5, 7.7, 7.8, 8.7, 8.9, 9.2, 9.3_

  - [ ]* 3.2 Tulis property test untuk CalculationEngine — Property 1
    - **Property 1: Format Tanggal Header Konsisten**
    - Gunakan `fc.date()`, verifikasi output `formatTanggalHeader(date)` cocok dengan pola `"<NamaHari>, DD <NamaBulan> YYYY"` (Bahasa Indonesia)
    - **Validates: Requirements 1.6**

  - [ ]* 3.3 Tulis property test untuk CalculationEngine — Property 2
    - **Property 2: Kalkulasi Saldo Kas**
    - Gunakan `fc.array(arbitraryTransaction())`, verifikasi `getSaldoKas(txs)` sama dengan perhitungan manual
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 3.4 Tulis property test untuk CalculationEngine — Property 3
    - **Property 3: Kalkulasi Untung Bersih**
    - Gunakan `fc.array(arbitraryTransaction())` + `fc.date()` pasangan start/end, verifikasi `untungBersih === totalPenjualan - totalPakan - totalBiayaLain`
    - **Validates: Requirements 7.4, 7.5**

  - [ ]* 3.5 Tulis property test untuk CalculationEngine — Property 4
    - **Property 4: Konversi Rak ke Butir Konsisten**
    - Gunakan `fc.integer({ min: 1, max: 9999 })`, verifikasi `rakToButir(rak) === rak * 30`
    - **Validates: Requirements 9.2**

  - [ ]* 3.6 Tulis property test untuk CalculationEngine — Property 5
    - **Property 5: Ringkasan Harian Menu Utama Konsisten dengan Data**
    - Gunakan `fc.array(arbitraryProduction())` + `fc.array(arbitraryTransaction())`, verifikasi konsistensi nilai Produksi dan Penjualan
    - **Validates: Requirements 4.10, 4.11, 4.12**

  - [ ]* 3.7 Tulis property test untuk CalculationEngine — Property 10
    - **Property 10: Data Grafik Produksi Mencakup Tepat 7 Hari Kalender**
    - Gunakan `fc.array(arbitraryProduction())`, verifikasi `getDataGrafikProduksi(prods, 7).length === 7`
    - **Validates: Requirements 8.7**

  - [ ]* 3.8 Tulis property test untuk CalculationEngine — Property 11
    - **Property 11: Rata-Rata Produksi Benar**
    - Gunakan `fc.array(arbitraryProduction())`, verifikasi `getRataRataProduksi(prods, 7) === sum(rak_7_hari) / 7`
    - **Validates: Requirements 8.9**

  - [ ]* 3.9 Tulis property test untuk CalculationEngine — Property 12
    - **Property 12: Margin Keuntungan Aman dari Pembagian Nol**
    - Gunakan `fc.integer()` + `fc.constant(0)`, verifikasi `getMarginKeuntungan(x, 0) === 0` tanpa exception; jika `totalPenjualan > 0`, verifikasi rumus benar
    - **Validates: Requirements 7.7, 7.8**

- [ ] 4. Implementasi Validator
  - [ ] 4.1 Implementasi `js/validator.js` — Validator
    - Implementasi `validateDateFormat(value)`: validasi string format `DD/MM/YYYY` dan tanggal kalender yang valid
    - Implementasi `validateNominal(value)`: validasi angka integer `1 - 999_999_999_999`
    - Implementasi `validateJumlahRak(value)`: validasi angka integer `1 - 9999`
    - Implementasi `validateTransaksi(data)`: validasi semua field form transaksi; field `jumlahRak` wajib hanya jika `jenis === 'penjualan_telur'`; return `{ valid, errors }` dengan pesan error Bahasa Indonesia
    - Implementasi `validateProduksi(data)`: validasi semua field form produksi; return `{ valid, errors }`
    - _Requirements: 5.6, 5.7, 8.4, 8.5, 8.6_

  - [ ]* 4.2 Tulis property test untuk Validator — Property 7
    - **Property 7: Validasi Penolakan Input Transaksi Tidak Valid**
    - Gunakan `fc.record()` dengan field sengaja invalid (nominal di luar range, jumlahRak di luar range, field kosong), verifikasi `validateTransaksi()` selalu return `valid: false`
    - **Validates: Requirements 5.6, 5.7**

  - [ ]* 4.3 Tulis property test untuk Validator — Property 8
    - **Property 8: Validasi Form Produksi**
    - Gunakan kombinasi field produksi invalid (jumlahRak di luar range, format tanggal salah, field kosong), verifikasi `validateProduksi()` selalu return `valid: false`
    - **Validates: Requirements 8.4, 8.5, 8.6**

  - [ ]* 4.4 Tulis unit test untuk Validator
    - Test `validateDateFormat()`: format benar, format salah, tanggal tidak ada (31/02), string kosong
    - Test `validateNominal()`: batas bawah (1), batas atas (999_999_999_999), nol, negatif, non-numerik
    - Test `validateJumlahRak()`: batas 1-9999, nol, 10000, desimal, string
    - Test `validateTransaksi()`: semua field valid + jenis penjualan_telur (jumlahRak wajib), jenis pembelian_pakan (jumlahRak opsional)
    - _Requirements: 5.6, 5.7, 8.4, 8.5, 8.6_

- [ ] 5. Checkpoint — Verifikasi data layer dan logika bisnis
  - Pastikan semua test untuk `storage.js`, `calculator.js`, dan `validator.js` lulus
  - Jalankan: `npx vitest --run`
  - Tanya pengguna jika ada pertanyaan sebelum melanjutkan.

- [ ] 6. Implementasi Router dan App Shell
  - [ ] 6.1 Buat `index.html` — App Shell SPA
    - Buat struktur HTML dengan `<div id="splash-screen">`, `<div id="header-container">`, `<div id="view-container">`, `<div id="footer-container">`
    - Sertakan tag `<link rel="manifest" href="/manifest.json">` di `<head>`
    - Sertakan tag favicon (`icon-16.png`, `icon-32.png`) dan apple-touch-icon (`180x180px`) di `<head>`
    - Muat Chart.js dari CDN (`https://cdn.jsdelivr.net/npm/chart.js`) via `<script>`
    - Muat semua file JS aplikasi (`app.js`, `router.js`, dll.) dengan urutan dependensi yang benar
    - _Requirements: 2.3, 2.4_

  - [ ] 6.2 Implementasi `js/router.js` — Hash-based Router
    - Definisikan `ROUTES` mapping hash ke fungsi view
    - Implementasi `navigate(hash)`: render HTML view ke `#view-container`, pasang event listener view
    - Implementasi `pushState(hash)`: perbarui URL tanpa memicu `hashchange`
    - Pasang listener `hashchange` dan `load` pada `window`
    - Tangani hash tidak dikenal → render halaman 404 dengan tombol kembali ke `#home`
    - Saat `load`, jika tidak ada hash, set default `#home`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 6.3 Tulis property test untuk Router — Property 15
    - **Property 15: Hash Routing Konsisten**
    - Gunakan `fc.constantFrom('#home', '#transaksi', '#rekap', '#labarugi', '#produksi')`, verifikasi navigasi ke tiap hash selalu render view yang tepat tanpa bergantung state sebelumnya
    - **Validates: Requirements 10.3**

  - [ ]* 6.4 Tulis unit test untuk Router
    - Test navigasi ke hash dikenal → view container terisi HTML yang benar
    - Test navigasi ke hash tidak dikenal → halaman 404 dengan tautan ke `#home`
    - Test tombol back browser → halaman sebelumnya
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 7. Implementasi Komponen Global — Header, Footer, Splash Screen, Notifikasi
  - [ ] 7.1 Implementasi Header di `js/app.js`
    - Fungsi `renderHeader()`: render HTML header ke `#header-container`
    - Header menampilkan simbol lingkaran hijau 32x32px dengan tetes putih, teks "SIKAT" (≥16px bold), teks "Sistem Informasi Kas Ayam Ternak" (≥10px)
    - Header menampilkan tanggal aktif format `"Hari, DD Bulan YYYY"` (Bahasa Indonesia) di kanan, teks "Torei Natei - Admin", ikon avatar ≥32x32px
    - Event listener: klik area logo → `navigate('#home')` dalam ≤500ms
    - _Requirements: 1.4, 1.5, 1.6_

  - [ ] 7.2 Implementasi Footer di `js/app.js`
    - Fungsi `renderFooter()`: render HTML footer ke `#footer-container`
    - Footer menampilkan dua kolom: "Aplikasi" (Panduan Pengguna, Fitur & Kebijakan) dan "Bantuan" (Kontak, Versi)
    - Footer menampilkan teks hak cipta "2026 BUMKam Torei Natei - SIKAT - Sistem Informasi Kas Ayam Ternak"
    - Event listener: klik tautan footer → navigasi/tampilkan konten sesuai dalam ≤500ms
    - _Requirements: 1.7, 1.8, 1.10_

  - [ ] 7.3 Implementasi Splash Screen di `js/app.js`
    - Tampilkan `#splash-screen` saat app dimuat: simbol 64x64px, teks "SIKAT" (≥32px, bold), subtitle, nama BUMKam
    - Timer minimum 1000ms, maksimum 2000ms → sembunyikan splash, tampilkan `#home`
    - Timeout handler: jika aset gagal dimuat dalam 3 detik → langsung tampilkan `#home`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 7.4 Implementasi komponen notifikasi di `js/app.js`
    - Fungsi `showNotification(message, type, autoHide)`: render toast/banner
    - `success`: auto-hide 3 detik (hijau); `error`: tidak auto-hide + tombol tutup (merah); `warning`: auto-hide 5 detik (kuning)
    - Pesan error dalam Bahasa Indonesia sesuai design (gagal simpan, gagal baca, storage penuh, validasi)
    - _Requirements: 5.8, 5.10, 9.6_

  - [ ]* 7.5 Tulis unit test untuk komponen global
    - Test Header: keberadaan logo, format tanggal, avatar, klik logo → navigate `#home`
    - Test Footer: keberadaan dua kolom tautan, teks copyright
    - Test Splash Screen: tampil saat load, sembunyikan otomatis 1000-2000ms, fallback timeout 3 detik
    - Test Notifikasi: success auto-hide 3 detik, error tetap tampil + tombol tutup
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 1.8, 3.1, 3.2, 3.3, 3.4_

- [ ] 8. Implementasi CSS Global dan Responsivitas
  - [ ] 8.1 Implementasi `css/main.css` — Style Global
    - Definisikan CSS custom properties: warna hijau utama (kontras WCAG AA terhadap putih), warna merah (kontras WCAG AA terhadap putih/latar putih)
    - CSS reset / normalize dasar
    - Layout responsif: mobile (320px–767px) dan desktop (1024px–1920px) menggunakan media queries atau CSS Grid/Flexbox
    - _Requirements: 1.1, 1.2, 1.9_

  - [ ] 8.2 Implementasi `css/components.css` — Komponen UI
    - Kartu UI: `border-radius ≥ 8px`, `border: 1px`, `box-shadow` dengan blur ≥4px
    - Tombol hijau aksi utama
    - Styling form (input, dropdown, label, pesan error di bawah field)
    - Styling header dan footer
    - Styling notifikasi (success/error/warning)
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 8.3 Implementasi `css/views.css` — Style Per Halaman
    - Kotak sambutan per modul
    - Grid 2 kolom kartu menu utama
    - Tabel ringkasan laba rugi
    - Daftar riwayat transaksi dan produksi
    - Grafik container (canvas wrapper)
    - _Requirements: 1.9, 4.1, 4.2, 7.1, 8.1_

- [ ] 9. Implementasi View — Menu Utama
  - [ ] 9.1 Implementasi `js/views/home.js`
    - Render kotak sambutan "Halo, Peternak!" + deskripsi
    - Render grid 2 kolom, 4 kartu menu (Input Transaksi, Rekap Kas, Laba Rugi, Produksi Harian) dengan ikon, judul, deskripsi
    - Render 2 tombol Aksi Cepat: "Tambah Penjualan" (navigate ke `#transaksi` + pra-isi dropdown "Penjualan Telur") dan "Catat Produksi" (navigate ke `#produksi`)
    - Render kotak "Ringkasan Hari Ini": baca LocalStorage → hitung Produksi (sum Rak hari ini × 30) dan Penjualan (sum nominal penjualan_telur hari ini)
    - Pasang event listener pada 4 kartu menu dan 2 tombol Aksi Cepat
    - Jika LocalStorage tidak bisa dibaca → tampilkan nilai 0 tanpa pesan error mengganggu
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12, 4.13, 4.14_

  - [ ]* 9.2 Tulis unit test untuk View Menu Utama
    - Test 4 kartu menu ter-render dengan teks dan ikon yang benar
    - Test klik kartu → navigate ke hash yang tepat
    - Test tombol "Tambah Penjualan" → `#transaksi` dengan dropdown pra-isi "Penjualan Telur"
    - Test ringkasan hari ini: data ada → nilai benar; storage error → nilai 0
    - _Requirements: 4.1, 4.2, 4.3–4.14_

- [ ] 10. Implementasi View — Input Transaksi
  - [ ] 10.1 Implementasi `js/views/transaksi.js`
    - Render kotak sambutan "Catat Transaksi Baru" + deskripsi
    - Render form: dropdown Jenis Transaksi (3 opsi), input tanggal (default hari ini), input Lokasi (max 100 char), input Nominal (range 1–999.999.999.999), tombol "Simpan" hijau
    - Logika kondisional: tampilkan/sembunyikan field "Jumlah Rak" berdasarkan pilihan Jenis Transaksi
    - Handler `Simpan`: jalankan `Validator.validateTransaksi()` → jika valid, panggil `StorageService.saveTransaction()` → kosongkan form + reset dropdown + tampilkan notifikasi sukses (auto-hide 3 detik) → perbarui Ringkasan Hari Ini; jika tidak valid, tampilkan pesan validasi di bawah field yang bermasalah
    - Tangani `StorageError` (storage penuh): tampilkan pesan error + pertahankan nilai form
    - Render kotak "Ringkasan Hari Ini": jumlah total transaksi + total nominal hari ini dari LocalStorage
    - Mendukung pra-isi dropdown dari navigasi Menu Utama (parameter navigasi)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [ ]* 10.2 Tulis property test untuk View Transaksi — Property 6
    - **Property 6: Transaksi Valid Mengubah Saldo Kas dengan Benar**
    - Gunakan `arbitraryTransaction()`, simpan ke storage, verifikasi saldo sesudah = saldo sebelum ± nominal sesuai jenis
    - **Validates: Requirements 5.5**

  - [ ]* 10.3 Tulis unit test untuk View Input Transaksi
    - Test field Jumlah Rak: tampil saat "Penjualan Telur", tersembunyi + nilai terhapus saat ganti jenis
    - Test validasi: field kosong → pesan error di bawah field; data valid → form dikosongkan + notifikasi sukses
    - Test storage error → pesan error + nilai form dipertahankan
    - Test ringkasan hari ini diperbarui setelah simpan berhasil
    - _Requirements: 5.1–5.10_

- [ ] 11. Implementasi View — Rekap Kas
  - [ ] 11.1 Implementasi `js/views/rekap.js`
    - Render kotak "Saldo Kas": hitung dengan `CalculationEngine.getSaldoKas()`, tampilkan dengan pemisah ribuan, teks "Update: [tanggal transaksi terakhir DD/MM/YYYY]" (atau "-" jika kosong)
    - Render daftar riwayat transaksi diurutkan terbaru → terlama: tanggal `DD/MM/YYYY`, jenis, lokasi, nominal (+hijau / -merah dengan pemisah ribuan)
    - Render kotak "Ringkasan": Pemasukan Hari Ini + Pengeluaran Hari Ini dihitung dari tanggal perangkat
    - Jika tidak ada transaksi → tampilkan "Belum ada transaksi" di daftar riwayat
    - Tangani LocalStorage corrupt → pesan error + Saldo_Kas = 0
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 11.2 Tulis property test untuk Rekap Kas — Property 9
    - **Property 9: Riwayat Transaksi Diurutkan Terbaru ke Terlama**
    - Gunakan `fc.array(arbitraryTransaction(), { minLength: 2 })`, verifikasi daftar render dalam urutan tanggal menurun dan tidak ada transaksi hilang
    - **Validates: Requirements 6.3**

  - [ ]* 11.3 Tulis unit test untuk View Rekap Kas
    - Test saldo kas: tanpa transaksi → 0; campuran pemasukan/pengeluaran → nilai benar
    - Test warna nominal: penjualan_telur → hijau dengan "+"; pengeluaran → merah dengan "-"
    - Test ringkasan hari ini: hanya transaksi hari ini yang dihitung
    - Test LocalStorage corrupt → pesan error + saldo 0
    - _Requirements: 6.1–6.7_

- [ ] 12. Implementasi View — Laba Rugi + Grafik Mingguan
  - [ ] 12.1 Implementasi `js/charts.js` — ChartManager
    - Implementasi `renderProductionChart(canvasId, data)`: buat grafik garis (Chart.js) tren produksi harian
    - Implementasi `renderWeeklyChart(canvasId, data)`: buat grafik garis dua dataset (Penjualan Telur vs Biaya Pakan) per minggu
    - Implementasi `destroyChart(canvasId)`: hancurkan instance chart yang ada sebelum render ulang (cegah memory leak)
    - Tangani Chart.js gagal dimuat (CDN offline): tampilkan pesan "Grafik tidak tersedia", data teks tetap ditampilkan
    - _Requirements: 7.2, 8.7_

  - [ ] 12.2 Implementasi `js/views/labarugi.js`
    - Render kotak sambutan "Laba Rugi Mingguan" + deskripsi
    - Render grafik garis mingguan menggunakan `ChartManager.renderWeeklyChart()` dengan data dari `CalculationEngine.getDataGrafikMingguan(transactions, 4)`: tampilkan hingga 4 minggu terakhir yang punya data
    - Render tabel ringkasan untuk minggu berjalan: Penjualan Telur, Biaya Pakan, Biaya Lain, Untung Bersih — data dari `CalculationEngine.getLaporanPeriode()` + `getBatasMingguBerjalan()`
    - Render nilai Untung Bersih dengan font-size ≥20px, bold; hijau jika positif, merah jika negatif, abu-abu jika nol
    - Render kotak "Ringkasan": Margin Keuntungan dengan `CalculationEngine.getMarginKeuntungan()`, dibulatkan 2 desimal
    - Jika tidak ada data minggu ini → semua nilai = 0
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 12.3 Tulis unit test untuk View Laba Rugi
    - Test tabel: tanpa transaksi minggu ini → semua nilai 0
    - Test Untung Bersih: warna hijau (positif), merah (negatif), abu-abu (nol)
    - Test Margin Keuntungan: total penjualan = 0 → tampilkan "0%"
    - Test grafik: Chart.js tidak tersedia → pesan "Grafik tidak tersedia" + tabel tetap tampil
    - _Requirements: 7.1–7.8_

- [ ] 13. Implementasi View — Produksi Harian + Grafik Tren
  - [ ] 13.1 Implementasi `js/views/produksi.js`
    - Render kotak sambutan "Produksi Harian" + deskripsi
    - Render form: input tanggal (format DD/MM/YYYY), input angka Jumlah Rak, tombol "Simpan"
    - Handler `Simpan`: jalankan `Validator.validateProduksi()` → jika valid, panggil `StorageService.saveProduction()` → jika `'needs_confirmation'`, tampilkan dialog konfirmasi overwrite → jika dikonfirmasi simpan, kosongkan form; jika tidak valid, tampilkan pesan validasi
    - Render grafik tren produksi 7 hari kalender terakhir menggunakan `ChartManager.renderProductionChart()` dengan data dari `CalculationEngine.getDataGrafikProduksi(productions, 7)` — hari tanpa data = nilai 0
    - Render daftar riwayat produksi terbaru → terlama: tanggal, jumlah Rak, label "Terinput"
    - Render kotak "Ringkasan": rata-rata Rak/hari 7 hari terakhir dari `CalculationEngine.getRataRataProduksi(productions, 7)` — jika tidak ada data = 0
    - Setelah simpan berhasil: perbarui grafik, daftar, dan ringkasan tanpa reload halaman
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

  - [ ]* 13.2 Tulis unit test untuk View Produksi Harian
    - Test simpan valid → form dikosongkan, grafik + daftar + ringkasan diperbarui tanpa reload
    - Test simpan dengan field kosong → pesan validasi, tidak tersimpan
    - Test jumlahRak = 0 atau > 9999 atau desimal → pesan error
    - Test format tanggal salah → pesan error format DD/MM/YYYY
    - Test duplikat tanggal → dialog konfirmasi overwrite muncul; konfirmasi → tersimpan; batal → tidak tersimpan
    - Test grafik 7 hari: hari tanpa data = nilai 0 pada grafik
    - _Requirements: 8.1–8.11_

- [ ] 14. Implementasi PWA — manifest.json, Ikon, dan Service Worker
  - [ ] 14.1 Buat ikon aplikasi di `assets/icons/`
    - Buat/sediakan `icon-16.png`, `icon-32.png` (favicon browser)
    - Buat/sediakan `icon-192.png`, `icon-512.png` (ikon PWA manifest): lingkaran hijau dengan tetes putih di tengah, latar tidak transparan, format PNG
    - Buat/sediakan `apple-touch-icon.png` berukuran 180x180px dengan desain sama
    - _Requirements: 2.2, 2.4_

  - [ ] 14.2 Buat `manifest.json`
    - Properti wajib: `name` (≤45 karakter), `short_name` (≤12 karakter), `start_url`, `display: "standalone"`, `theme_color`, `background_color`
    - Properti `icons`: array dengan ukuran 192x192 dan 512x512 (path ke `assets/icons/`)
    - _Requirements: 2.1, 2.2_

  - [ ] 14.3 Implementasi `sw.js` — Service Worker
    - Definisikan `CACHE_NAME = 'sikat-v1'` dan `STATIC_ASSETS` (semua HTML, CSS, JS, ikon, manifest, Chart.js CDN URL)
    - Event `install`: cache semua aset statis (total ≤50MB)
    - Event `activate`: hapus cache dengan nama lama
    - Event `fetch`: strategi Cache-First untuk aset statis; fallback cache untuk navigasi offline
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

  - [ ] 14.4 Daftarkan Service Worker di `js/app.js`
    - Daftarkan `sw.js` dalam event `load` window dalam ≤5 detik
    - Tangani kegagalan registrasi secara silent (log ke console, tidak tampilkan error ke pengguna)
    - Deteksi jika browser tidak mendukung Service Worker → skip registrasi, aplikasi tetap berjalan
    - _Requirements: 2.5, 2.8, 2.9_

  - [ ]* 14.5 Tulis unit test untuk PWA dan konfigurasi
    - Test `manifest.json`: semua properti wajib ada, `short_name ≤ 12` karakter, `name ≤ 45` karakter
    - Test `index.html`: tag `<link rel="manifest">` ada di `<head>`
    - Test keberadaan file ikon: `icon-16.png`, `icon-32.png`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
    - Test Service Worker: registrasi dipanggil setelah load event; jika browser tidak support → tidak error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.8, 2.9_

- [ ] 15. Inisialisasi Data Dummy dan Integrasi App Entry Point
  - [ ] 15.1 Implementasi inisialisasi aplikasi di `js/app.js`
    - Panggil `StorageService.initDummyData()` saat app pertama kali dimuat
    - Panggil `renderHeader()`, `renderFooter()` sekali saat app dimuat
    - Tampilkan Splash Screen, lalu navigate ke `#home` setelah timer selesai
    - Daftarkan Service Worker
    - Tangani seluruh error init secara graceful (no uncaught exceptions)
    - _Requirements: 3.1, 3.3, 9.4, 9.5_

  - [ ] 15.2 Lengkapi data dummy di `js/storage.js`
    - Definisikan `DUMMY_TRANSACTIONS`: tepat 10 entri dengan nilai numerik realistis (1–500 Rak/hari, Rp1–Rp999.999.999/entri), tanggal dalam 30 hari terakhir
    - Definisikan `DUMMY_PRODUCTIONS`: tepat 7 entri produksi (7 hari terakhir), menggunakan konversi 1 Rak = 30 butir
    - _Requirements: 9.4_

- [ ] 16. Checkpoint Akhir — Verifikasi Integrasi dan Semua Test
  - Jalankan semua test: `npx vitest --run`
  - Verifikasi semua 15 property test lulus
  - Verifikasi navigasi antar halaman berfungsi (≤1 detik per transisi)
  - Verifikasi data dummy dimuat saat storage kosong dan tidak menimpa data yang ada
  - Verifikasi aplikasi berfungsi jika LocalStorage gagal dibaca (tampilkan nilai 0 / pesan error yang sesuai)
  - Tanya pengguna jika ada pertanyaan sebelum dianggap selesai.

---

## Notes

- Task bertanda `*` bersifat opsional dan dapat dilewati untuk iterasi MVP lebih cepat
- Setiap task mereferensikan persyaratan spesifik untuk keterlacakan
- Semua property test menggunakan **fast-check** dengan minimal **100 iterasi** per properti
- Vitest digunakan untuk unit test dan property test; jalankan dengan `npx vitest --run` (tanpa watch mode)
- Aplikasi menggunakan JavaScript murni tanpa framework; jangan introdusikan dependensi baru selain yang sudah didefinisikan di design
- Semua pesan error dan antarmuka dalam **Bahasa Indonesia**
- Konversi 1 Rak = 30 butir harus konsisten di seluruh modul (Property 4)
- Pastikan tidak ada pembagian dengan nol di kalkulasi margin keuntungan (Property 12)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8", "3.9", "4.2", "4.3", "4.4"] },
    { "id": 3, "tasks": ["6.1", "6.2", "8.1", "8.2", "8.3"] },
    { "id": 4, "tasks": ["6.3", "6.4", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 5, "tasks": ["7.5", "9.1", "12.1", "15.2"] },
    { "id": 6, "tasks": ["9.2", "10.1", "11.1", "12.2", "13.1"] },
    { "id": 7, "tasks": ["10.2", "10.3", "11.2", "11.3", "12.3", "13.2", "14.1", "14.2"] },
    { "id": 8, "tasks": ["14.3", "14.4"] },
    { "id": 9, "tasks": ["14.5", "15.1"] }
  ]
}
```
