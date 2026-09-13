# Requirements Document

## Introduction

SIKAT (Sistem Informasi Kas Ayam Ternak) adalah aplikasi web Progressive Web App (PWA) untuk BUMKam Torei Natei di Kampung Yakonde, Papua. Aplikasi ini dirancang untuk mendukung usaha ayam petelur dengan mencatat transaksi keuangan, memantau saldo kas, menyajikan laporan laba rugi, dan mencatat produksi telur harian. Aplikasi dibangun menggunakan HTML, CSS, dan JavaScript murni dengan service worker dan localStorage sehingga dapat dipasang di perangkat Android dan digunakan secara offline.

---

## Glossary

- **SIKAT**: Sistem Informasi Kas Ayam Ternak — nama aplikasi ini.
- **BUMKam**: Badan Usaha Milik Kampung — unit usaha milik Kampung Yakonde.
- **Aplikasi**: Keseluruhan sistem SIKAT yang berjalan di browser atau diinstal sebagai PWA.
- **PWA**: Progressive Web App — aplikasi web yang dapat dipasang di layar beranda perangkat dan berjalan offline.
- **Service_Worker**: Skrip JavaScript latar belakang yang memungkinkan caching dan penggunaan offline.
- **LocalStorage**: Mekanisme penyimpanan data berbasis browser yang digunakan untuk menyimpan data transaksi dan produksi secara lokal.
- **Menu_Utama**: Halaman pertama setelah splash screen yang menampilkan ringkasan dan navigasi ke semua modul.
- **Modul_Transaksi**: Halaman Input Transaksi untuk mencatat pemasukan dan pengeluaran.
- **Modul_Rekap_Kas**: Halaman Rekap Kas yang menampilkan saldo dan riwayat transaksi.
- **Modul_Laba_Rugi**: Halaman Laba Rugi yang menampilkan laporan keuangan mingguan.
- **Modul_Produksi**: Halaman Produksi Harian untuk mencatat hasil telur harian.
- **Transaksi**: Satu catatan keuangan berupa pemasukan atau pengeluaran.
- **Rak**: Satuan produksi telur; 1 Rak = 30 butir telur.
- **Saldo_Kas**: Total akumulasi semua pemasukan dikurangi semua pengeluaran yang tercatat di LocalStorage.
- **Untung_Bersih**: Selisih antara total penjualan telur dan total biaya (pakan + biaya lain) dalam periode yang dipilih.
- **Margin_Keuntungan**: Persentase Untung_Bersih terhadap total pendapatan penjualan telur.
- **Splash_Screen**: Layar pembuka sementara yang tampil saat aplikasi pertama kali dimuat.
- **Header**: Bilah navigasi atas yang muncul di semua halaman.
- **Footer**: Bagian bawah halaman yang muncul di semua halaman.
- **Data_Dummy**: Data awal yang disertakan dalam aplikasi sebagai contoh realistis untuk demonstrasi.

---

## Requirements

### Persyaratan 1: Identitas Visual dan Komponen Tata Letak Global

**User Story:** Sebagai pengguna SIKAT, saya ingin setiap halaman memiliki tampilan yang konsisten dengan identitas BUMKam Torei Natei, agar aplikasi terasa profesional dan mudah dinavigasi.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menggunakan warna hijau sebagai warna utama untuk header, tombol aksi utama, dan teks nominal pemasukan di seluruh halaman; nilai warna yang digunakan adalah hijau dengan kecerahan yang cukup untuk memenuhi kontras WCAG AA terhadap teks putih.
2. THE Aplikasi SHALL menggunakan warna merah untuk teks nominal pengeluaran di seluruh halaman; nilai warna yang digunakan adalah merah dengan kecerahan yang cukup untuk memenuhi kontras WCAG AA terhadap latar putih.
3. THE Aplikasi SHALL menampilkan kartu UI dengan sudut melengkung (border-radius minimal 8px), border tipis (1px), dan bayangan lembut (box-shadow dengan blur minimal 4px) di semua komponen kartu.
4. THE Header SHALL menampilkan simbol lingkaran hijau berukuran 32x32px berisi bentuk tetes berwarna putih di bagian kiri atas, diikuti teks tebal "SIKAT" (ukuran font minimum 16px) dan teks lebih kecil "Sistem Informasi Kas Ayam Ternak" (ukuran font minimum 10px) tepat di bawahnya.
5. WHEN pengguna mengklik area logo (simbol dan teks SIKAT) di Header, THE Aplikasi SHALL menavigasi pengguna ke Menu_Utama dalam waktu tidak lebih dari 500ms.
6. THE Header SHALL menampilkan tanggal aktif dalam format "Hari, DD Bulan YYYY" (contoh: "Kamis, 10 September 2026") di bagian kanan, beserta teks "Torei Natei - Admin" di baris kedua dan ikon avatar pengguna berukuran minimal 32x32px.
7. THE Footer SHALL menampilkan dua kolom tautan: kolom "Aplikasi" berisi "Panduan Pengguna" dan "Fitur & Kebijakan", serta kolom "Bantuan" berisi "Kontak" dan "Versi".
8. THE Footer SHALL menampilkan teks hak cipta "2026 BUMKam Torei Natei - SIKAT - Sistem Informasi Kas Ayam Ternak" di bagian bawah footer.
9. THE Aplikasi SHALL merender seluruh antarmuka dengan responsif sehingga dapat digunakan pada perangkat seluler (lebar layar 320px hingga 767px) dan pada browser desktop (lebar layar 1024px hingga 1920px).
10. WHEN pengguna mengklik tautan di Footer, THE Aplikasi SHALL menampilkan konten atau halaman yang sesuai dengan tautan tersebut dalam waktu tidak lebih dari 500ms.

---

### Persyaratan 2: PWA, Manifest, App Icon, dan Service Worker

**User Story:** Sebagai pengguna, saya ingin dapat memasang SIKAT di layar beranda Android saya dan menggunakannya tanpa koneksi internet, agar saya bisa mencatat data kapan saja di lapangan.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menyertakan file manifest.json yang memenuhi spesifikasi PWA dengan properti name, short_name, start_url, display standalone, theme_color, dan background_color, di mana nilai name tidak melebihi 45 karakter dan nilai short_name tidak melebihi 12 karakter.
2. THE manifest.json SHALL mendefinisikan ikon aplikasi dalam ukuran 192x192px dan 512x512px berupa simbol lingkaran hijau dengan bentuk tetes putih di tengah (tanpa teks), dalam format PNG dengan latar belakang tidak transparan.
3. THE Aplikasi SHALL menyertakan tag link rel manifest di head setiap halaman HTML.
4. THE Aplikasi SHALL menyertakan favicon browser dalam ukuran 16x16px dan 32x32px serta apple-touch-icon berukuran 180x180px dengan desain ikon yang sama dengan ikon manifest.
5. WHEN halaman pertama kali dimuat di browser yang mendukung Service Worker, THE Aplikasi SHALL mendaftarkan Service_Worker dalam waktu tidak lebih dari 5 detik setelah event load halaman selesai.
6. WHEN Service_Worker berhasil diinstal, THE Service_Worker SHALL meng-cache seluruh aset statis (HTML, CSS, JavaScript, ikon, manifest) sehingga total ukuran cache tidak melebihi 50 MB dan aplikasi dapat dimuat penuh tanpa koneksi internet.
7. WHEN pengguna mengakses Aplikasi tanpa koneksi internet, THE Aplikasi SHALL memuat antarmuka dari cache Service_Worker dan menampilkan seluruh data yang tersimpan di LocalStorage dalam waktu tidak lebih dari 5 detik sejak permintaan navigasi.
8. IF Service_Worker gagal terdaftar atau gagal diinstal, THEN THE Aplikasi SHALL tetap dapat diakses secara online tanpa menampilkan pesan error kepada pengguna.
9. WHERE browser tidak mendukung Service Worker, THE Aplikasi SHALL tetap berfungsi sepenuhnya dengan membaca data dari LocalStorage tanpa fitur offline caching.

---

### Persyaratan 3: Splash Screen

**User Story:** Sebagai pengguna, saya ingin melihat layar pembuka beridentitas SIKAT saat aplikasi dimuat, agar pengalaman membuka aplikasi terasa seperti aplikasi native.

#### Kriteria Penerimaan

1. WHEN Aplikasi pertama kali dimuat di browser, THE Aplikasi SHALL menampilkan Splash_Screen berlatar belakang putih selama minimum 1 detik dan maksimum 2 detik sebelum menampilkan Menu_Utama.
2. THE Splash_Screen SHALL menampilkan, secara vertikal di tengah layar: simbol lingkaran hijau berukuran 64x64px, teks "SIKAT" dengan font-size minimum 32px dan font-weight 700, teks "Sistem Informasi Kas Ayam Ternak" dengan font-size lebih kecil dari teks "SIKAT", dan teks "BUMKam Torei Natei - Kampung Yakonde" dengan font-size lebih kecil dari teks "Sistem Informasi Kas Ayam Ternak".
3. WHEN durasi Splash_Screen selesai, THE Aplikasi SHALL menyembunyikan Splash_Screen dan menampilkan Menu_Utama secara otomatis tanpa interaksi pengguna.
4. IF aset yang diperlukan untuk Splash_Screen gagal dimuat dalam 3 detik, THEN THE Aplikasi SHALL menyembunyikan Splash_Screen dan langsung menampilkan Menu_Utama tanpa menampilkan pesan kesalahan.

---

### Persyaratan 4: Menu Utama

**User Story:** Sebagai peternak, saya ingin melihat ringkasan harian dan akses cepat ke semua modul dari satu halaman, agar saya dapat mengelola data dengan efisien.

#### Kriteria Penerimaan

1. THE Menu_Utama SHALL menampilkan kotak sambutan berisi teks "Halo, Peternak!" dan "Kelola produksi, kas, dan laporan harian".
2. THE Menu_Utama SHALL menampilkan empat kartu menu dalam tata letak grid 2 kolom, masing-masing berisi ikon, judul, dan deskripsi singkat: "Input Transaksi" (ikon plus, "Tambah transaksi pengeluaran/pemasukan"), "Rekap Kas" (ikon dompet, "Saldo kas & ringkasan"), "Laba Rugi" (ikon grafik, "Ringkasan laba/rugi mingguan"), dan "Produksi Harian" (ikon telur, "Catat produksi telur harian").
3. WHEN pengguna mengklik kartu menu "Input Transaksi", THE Menu_Utama SHALL menavigasi pengguna ke Modul_Transaksi.
4. WHEN pengguna mengklik kartu menu "Rekap Kas", THE Menu_Utama SHALL menavigasi pengguna ke Modul_Rekap_Kas.
5. WHEN pengguna mengklik kartu menu "Laba Rugi", THE Menu_Utama SHALL menavigasi pengguna ke Modul_Laba_Rugi.
6. WHEN pengguna mengklik kartu menu "Produksi Harian", THE Menu_Utama SHALL menavigasi pengguna ke Modul_Produksi.
7. THE Menu_Utama SHALL menampilkan dua tombol "Aksi Cepat": tombol "Tambah Penjualan" dan tombol "Catat Produksi".
8. WHEN pengguna mengklik tombol "Tambah Penjualan", THE Menu_Utama SHALL menavigasi pengguna ke Modul_Transaksi dengan dropdown "Jenis Transaksi" dipra-isi "Penjualan Telur" dan seluruh field lainnya kosong.
9. WHEN pengguna mengklik tombol "Catat Produksi", THE Menu_Utama SHALL menavigasi pengguna ke Modul_Produksi.
10. THE Menu_Utama SHALL menampilkan kotak "Ringkasan Hari Ini" berisi nilai "Produksi" dalam satuan butir (bilangan bulat non-negatif) dan nilai "Penjualan" dalam satuan Rupiah (dengan pemisah ribuan).
11. WHEN data Produksi_Harian diperbarui, THE Menu_Utama SHALL menghitung nilai Produksi dalam kotak Ringkasan menggunakan rumus jumlah total Rak untuk tanggal hari ini dikalikan 30 butir; jika tidak ada data produksi untuk tanggal hari ini, nilai ditampilkan sebagai 0.
12. WHEN data Transaksi diperbarui, THE Menu_Utama SHALL menghitung nilai Penjualan dalam kotak Ringkasan dari total nominal transaksi berjenis "Penjualan Telur" untuk tanggal hari ini; jika tidak ada transaksi "Penjualan Telur" untuk hari ini, nilai ditampilkan sebagai Rp0.
13. WHEN Menu_Utama pertama kali dimuat, THE Menu_Utama SHALL membaca data dari LocalStorage dan menghitung serta menampilkan nilai Produksi dan Penjualan pada kotak Ringkasan Hari Ini.
14. IF data LocalStorage tidak dapat dibaca saat Menu_Utama dimuat, THEN THE Menu_Utama SHALL menampilkan nilai 0 pada kotak Ringkasan Hari Ini tanpa menampilkan pesan kesalahan yang mengganggu antarmuka.

---

### Persyaratan 5: Input Transaksi

**User Story:** Sebagai kasir BUMKam, saya ingin mencatat setiap transaksi pemasukan atau pengeluaran dengan detail yang lengkap, agar data keuangan selalu akurat.

#### Kriteria Penerimaan

1. THE Modul_Transaksi SHALL menampilkan kotak sambutan berisi teks "Catat Transaksi Baru" dan "Tambahkan pemasukan atau pengeluaran usaha".
2. THE Modul_Transaksi SHALL menampilkan formulir dengan field: dropdown "Jenis Transaksi" (pilihan: "Penjualan Telur", "Pembelian Pakan", "Biaya Lain"), input tanggal "Tanggal" dengan nilai default tanggal hari ini, input teks "Lokasi" dengan placeholder "Pasar Sentani, Besum" dan panjang maksimal 100 karakter, input angka "Nominal (Rp)" dengan rentang nilai 1 hingga 999.999.999.999, dan tombol hijau "Simpan".
3. WHEN pengguna memilih "Penjualan Telur" pada dropdown Jenis Transaksi, THE Modul_Transaksi SHALL menampilkan field tambahan input angka "Jumlah Rak" dengan rentang nilai 1 hingga 9.999.
4. WHEN pengguna memilih "Pembelian Pakan" atau "Biaya Lain" pada dropdown Jenis Transaksi, THE Modul_Transaksi SHALL menyembunyikan field "Jumlah Rak" dan menghapus nilai yang sudah diisi pada field tersebut.
5. WHEN pengguna mengklik tombol "Simpan" dengan semua field wajib terisi dan bernilai valid, THE Modul_Transaksi SHALL menyimpan data Transaksi ke LocalStorage, memperbarui Saldo_Kas dengan menambahkan Nominal jika Jenis Transaksi adalah "Penjualan Telur" atau mengurangkan Nominal jika Jenis Transaksi adalah "Pembelian Pakan" atau "Biaya Lain", lalu memperbarui tampilan Ringkasan Hari Ini.
6. IF pengguna mengklik tombol "Simpan" dengan satu atau lebih field wajib kosong, THEN THE Modul_Transaksi SHALL menampilkan pesan validasi di bawah setiap field yang kosong yang mengidentifikasi field tersebut, tanpa menyimpan data dan tanpa mengubah Saldo_Kas.
7. IF pengguna memasukkan nilai non-numerik atau nilai di luar rentang yang ditentukan pada field "Nominal (Rp)" atau "Jumlah Rak", THEN THE Modul_Transaksi SHALL menampilkan pesan kesalahan validasi di bawah field yang bermasalah dan mencegah penyimpanan data.
8. WHEN data Transaksi berhasil disimpan, THE Modul_Transaksi SHALL mengosongkan semua field formulir, mengembalikan dropdown "Jenis Transaksi" ke kondisi tidak ada pilihan terpilih, dan menampilkan notifikasi konfirmasi keberhasilan penyimpanan yang hilang otomatis setelah 3 detik.
9. THE Modul_Transaksi SHALL menampilkan kotak "Ringkasan Hari Ini" berisi jumlah total Transaksi dan total nominal seluruh Transaksi untuk tanggal hari ini, dihitung otomatis dari data LocalStorage setiap kali halaman dimuat atau data Transaksi baru disimpan.
10. IF penyimpanan data Transaksi ke LocalStorage gagal, THEN THE Modul_Transaksi SHALL menampilkan pesan kesalahan yang mengindikasikan kegagalan penyimpanan, tidak mengubah Saldo_Kas, dan mempertahankan seluruh nilai yang telah diisi pengguna pada formulir.

---

### Persyaratan 6: Rekap Kas

**User Story:** Sebagai admin BUMKam, saya ingin melihat saldo kas terkini dan riwayat semua transaksi, agar saya dapat memantau kondisi keuangan usaha setiap saat.

#### Kriteria Penerimaan

1. THE Modul_Rekap_Kas SHALL menampilkan kotak "Saldo Kas" berisi nilai Saldo_Kas yang dihitung otomatis dari seluruh data Transaksi di LocalStorage, beserta teks "Update: [tanggal transaksi terakhir]" dalam format DD/MM/YYYY; jika tidak ada Transaksi, Saldo_Kas ditampilkan sebagai 0 dan teks "Update: -".
2. THE Modul_Rekap_Kas SHALL menghitung Saldo_Kas dengan rumus: total semua nominal Transaksi berjenis "Penjualan Telur" dikurangi total semua nominal Transaksi berjenis "Pembelian Pakan" dan "Biaya Lain"; nilai Saldo_Kas dapat bernilai negatif dan ditampilkan hingga dua desimal.
3. THE Modul_Rekap_Kas SHALL menampilkan daftar riwayat Transaksi diurutkan dari tanggal terbaru ke terlama, setiap entri menampilkan tanggal dalam format DD/MM/YYYY, jenis transaksi, lokasi, dan nominal; jika tidak ada Transaksi, daftar menampilkan pesan "Belum ada transaksi".
4. THE Modul_Rekap_Kas SHALL menampilkan nominal Transaksi pemasukan ("Penjualan Telur") dengan warna hijau diawali tanda "+", dan nominal Transaksi pengeluaran ("Pembelian Pakan" dan "Biaya Lain") dengan warna merah diawali tanda "-", keduanya diformat dengan pemisah ribuan.
5. THE Modul_Rekap_Kas SHALL menampilkan kotak "Ringkasan" berisi total Pemasukan Hari Ini dan total Pengeluaran Hari Ini dihitung otomatis dari Transaksi bertanggal sama dengan tanggal perangkat saat halaman dimuat; jika tidak ada Transaksi pada hari tersebut, nilai masing-masing ditampilkan sebagai 0.
6. WHEN data Transaksi baru ditambahkan melalui Modul_Transaksi, THE Modul_Rekap_Kas SHALL memperbarui Saldo_Kas, riwayat Transaksi, dan kotak Ringkasan secara otomatis saat halaman Modul_Rekap_Kas dimuat ulang berikutnya.
7. IF data Transaksi di LocalStorage tidak dapat dibaca atau rusak, THEN THE Modul_Rekap_Kas SHALL menampilkan pesan kesalahan yang menginformasikan bahwa data tidak tersedia, dan menampilkan Saldo_Kas sebagai 0 tanpa memproses perhitungan lebih lanjut.

---

### Persyaratan 7: Laba Rugi

**User Story:** Sebagai pengurus BUMKam, saya ingin melihat laporan laba rugi mingguan dengan grafik, agar saya dapat mengevaluasi kinerja keuangan usaha secara berkala.

#### Kriteria Penerimaan

1. THE Modul_Laba_Rugi SHALL menampilkan kotak sambutan berisi teks "Laba Rugi Mingguan" dan "Pendapatan vs biaya pakan".
2. THE Modul_Laba_Rugi SHALL menampilkan grafik garis yang menggambarkan nilai Penjualan Telur (pendapatan) dan Biaya Pakan per minggu; grafik menampilkan hingga 4 minggu terakhir yang memiliki data; jika data tersedia kurang dari 4 minggu, grafik menampilkan hanya minggu-minggu yang memiliki data tanpa mengisi minggu kosong dengan nilai nol.
3. THE Modul_Laba_Rugi SHALL menampilkan tabel ringkasan berisi baris: "Penjualan Telur", "Biaya Pakan", "Biaya Lain", dan "Untung Bersih"; jika tidak ada Transaksi pada minggu berjalan, semua nilai ditampilkan sebagai 0.
4. THE Modul_Laba_Rugi SHALL menghitung nilai setiap baris tabel dari data Transaksi di LocalStorage untuk periode minggu berjalan (Senin hingga Minggu); "Biaya Lain" mencakup seluruh Transaksi berjenis "Biaya Lain" dalam periode tersebut.
5. THE Modul_Laba_Rugi SHALL menghitung Untung_Bersih dengan rumus: total Penjualan Telur dikurangi total Biaya Pakan dikurangi total Biaya Lain untuk periode minggu berjalan.
6. THE Modul_Laba_Rugi SHALL menampilkan nilai Untung_Bersih dengan font-size minimum 20px dan font-weight 700, berwarna hijau jika nilainya positif, berwarna merah jika nilainya negatif, dan berwarna abu-abu netral jika nilainya nol.
7. THE Modul_Laba_Rugi SHALL menampilkan kotak "Ringkasan" berisi Margin_Keuntungan dalam persentase dibulatkan dua desimal, dihitung otomatis dengan rumus: (Untung_Bersih dibagi total Penjualan Telur) dikali 100 persen untuk periode minggu berjalan.
8. IF total Penjualan Telur untuk minggu berjalan adalah nol, THEN THE Modul_Laba_Rugi SHALL menampilkan Margin_Keuntungan sebagai "0%" tanpa melakukan pembagian dengan nol.

---

### Persyaratan 8: Produksi Harian

**User Story:** Sebagai peternak, saya ingin mencatat hasil telur setiap hari dalam satuan Rak dan melihat tren produksi mingguan, agar saya dapat memantau produktivitas kandang.

#### Kriteria Penerimaan

1. THE Modul_Produksi SHALL menampilkan kotak sambutan berisi teks "Produksi Harian" dan "Catat hasil telur hari ini".
2. THE Modul_Produksi SHALL menampilkan formulir dengan field input tanggal "Tanggal" (format DD/MM/YYYY), input angka "Jumlah Rak", dan tombol "Simpan".
3. WHEN pengguna mengklik tombol "Simpan" dengan semua field terisi valid, THE Modul_Produksi SHALL menyimpan data produksi ke LocalStorage dengan mencatat tanggal dan jumlah Rak, lalu mengosongkan field formulir.
4. IF pengguna mengklik tombol "Simpan" dengan satu atau lebih field kosong, THEN THE Modul_Produksi SHALL menampilkan pesan validasi yang menunjukkan field mana yang belum diisi tanpa menyimpan data.
5. IF pengguna memasukkan nilai non-numerik, nilai negatif, nilai nol, atau nilai lebih dari 9.999 pada field "Jumlah Rak", THEN THE Modul_Produksi SHALL menampilkan pesan kesalahan validasi yang menunjukkan kriteria nilai yang valid dan mencegah penyimpanan data.
6. IF pengguna memasukkan tanggal dengan format selain DD/MM/YYYY atau tanggal yang tidak valid, THEN THE Modul_Produksi SHALL menampilkan pesan kesalahan validasi yang menunjukkan format tanggal yang benar dan mencegah penyimpanan data.
7. THE Modul_Produksi SHALL menampilkan grafik garis tren produksi (jumlah Rak per hari) untuk 7 hari kalender terakhir dihitung mundur dari tanggal hari ini, berdasarkan data di LocalStorage; hari tanpa data ditampilkan sebagai nilai nol pada grafik.
8. THE Modul_Produksi SHALL menampilkan daftar riwayat produksi diurutkan dari tanggal terbaru ke terlama, setiap entri menampilkan tanggal, jumlah Rak, dan label status "Terinput".
9. THE Modul_Produksi SHALL menampilkan kotak "Ringkasan" berisi rata-rata jumlah Rak per hari untuk 7 hari kalender terakhir dihitung mundur dari tanggal hari ini, dihitung otomatis dari LocalStorage; jika tidak ada data dalam 7 hari terakhir, ditampilkan nilai nol.
10. WHEN data produksi berhasil disimpan, THE Modul_Produksi SHALL memperbarui grafik tren, daftar riwayat, dan kotak Ringkasan secara otomatis tanpa perlu memuat ulang halaman.
11. IF pengguna memasukkan tanggal yang sudah memiliki data produksi tersimpan di LocalStorage, THEN THE Modul_Produksi SHALL menampilkan pesan konfirmasi yang menanyakan apakah pengguna ingin menimpa data yang ada, dan hanya menyimpan jika pengguna mengonfirmasi.

---

### Persyaratan 9: Penyimpanan Data dan Konsistensi Perhitungan

**User Story:** Sebagai pengguna, saya ingin semua angka yang tampil di aplikasi selalu konsisten dan dihitung otomatis dari data yang saya input, agar saya tidak perlu menghitung ulang secara manual.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL menyimpan semua data Transaksi dan data produksi harian ke LocalStorage dalam format JSON setiap kali data baru ditambahkan atau diubah.
2. THE Aplikasi SHALL menggunakan rumus konversi 1 Rak = 30 butir secara konsisten di seluruh modul yang menampilkan jumlah butir telur, sehingga nilai butir yang ditampilkan selalu sama dengan nilai Rak dikalikan 30.
3. WHEN Aplikasi dimuat, THE Aplikasi SHALL membaca semua data dari LocalStorage dan menghitung ulang seluruh nilai turunan (Saldo_Kas, Untung_Bersih, Margin_Keuntungan, rata-rata produksi, ringkasan harian) dalam waktu tidak lebih dari 3 detik, tanpa menampilkan angka statis yang tidak berasal dari data aktual.
4. IF LocalStorage belum berisi data Transaksi maupun data produksi harian, THEN THE Aplikasi SHALL memuat Data_Dummy awal berupa tepat 10 entri Transaksi dan tepat 7 entri produksi harian ke LocalStorage, di mana setiap entri menggunakan konversi 1 Rak = 30 butir dan nilai numeriknya berada dalam rentang yang realistis (jumlah produksi antara 1 hingga 500 Rak per hari, nilai transaksi antara Rp 1 hingga Rp 999.999.999 per entri).
5. IF LocalStorage sudah berisi data Transaksi atau data produksi harian, THEN THE Aplikasi SHALL tidak menimpa atau menghapus data tersebut dengan Data_Dummy.
6. IF terjadi kegagalan membaca atau menulis data ke LocalStorage, THEN THE Aplikasi SHALL menampilkan pesan kesalahan yang menginformasikan pengguna bahwa data tidak dapat disimpan atau dimuat, dan mempertahankan data yang sudah ditampilkan di layar tanpa perubahan.

---

### Persyaratan 10: Navigasi Antar Halaman

**User Story:** Sebagai pengguna, saya ingin berpindah antar halaman dengan mudah dan intuitif, agar pengalaman menggunakan aplikasi tidak membingungkan.

#### Kriteria Penerimaan

1. THE Aplikasi SHALL mengimplementasikan navigasi antar halaman tanpa memuat ulang seluruh browser, sehingga konten halaman baru tampil dalam waktu tidak lebih dari 1 detik setelah pengguna memicu perpindahan halaman.
2. WHEN pengguna menekan tombol kembali pada browser atau perangkat, THE Aplikasi SHALL menavigasi pengguna ke halaman yang dikunjungi sebelumnya dalam sesi yang sama, tanpa kehilangan data yang sudah diinput pada halaman sebelumnya.
3. THE Aplikasi SHALL memastikan setiap halaman dapat diakses langsung melalui URL unik yang dapat di-bookmark, sehingga membuka URL tersebut langsung menampilkan halaman yang dimaksud beserta seluruh fungsionalitasnya.
4. IF pengguna mengakses URL halaman yang tidak dikenal atau tidak terdaftar, THEN THE Aplikasi SHALL menampilkan halaman tidak ditemukan beserta tautan untuk kembali ke halaman utama.
