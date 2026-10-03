# Dokumen Persyaratan: Profil Usaha Dinamis

## Pendahuluan

Fitur ini memungkinkan admin BUMKam untuk mengubah nama organisasi dan nama kampung melalui halaman Pengaturan Profil. Setelah disimpan, perubahan nama tersebut langsung tercermin di seluruh tampilan aplikasi SIKAT tanpa reload — meliputi header, sidebar, footer, semua laporan keuangan, letterhead cetak/PDF, ekspor Excel, halaman statis (Panduan, Kebijakan, Kontak, Versi), serta judul browser — dan tetap tersimpan setelah aplikasi ditutup dan dibuka kembali. Nama yang tersimpan di `manifest.json` tetap statis ("SIKAT") karena keterbatasan PWA.

## Glosarium

- **ProfilUsahaService**: Modul JavaScript yang menyediakan fungsi baca/tulis profil usaha ke localStorage.
- **Profil Usaha**: Objek `{ namaBumkam: string, namaKampung: string }` yang tersimpan di localStorage.
- **Key `profil_usaha`**: Kunci localStorage utama untuk menyimpan profil usaha.
- **Default Profil**: Nilai bawaan — `namaBumkam: "BUMKam Torei Natei"`, `namaKampung: "Kampung Yakonde"`.
- **Komponen Dinamis**: Setiap elemen UI yang menampilkan nama BUMKam atau nama kampung dari profil usaha.
- **Escaping HTML**: Proses mengubah karakter `<`, `>`, `&`, `"` menjadi entitas HTML sebelum disisipkan ke DOM.
- **BroadcastChannel**: API browser untuk komunikasi antar tab/jendela pada origin yang sama.
- **cache version**: String di `sw.js` yang menentukan nama cache Service Worker; harus di-bump saat ada perubahan aset.

---

## Persyaratan

### Persyaratan 1: Penyimpanan dan Pembacaan Profil Usaha

**User Story:** Sebagai admin, saya ingin menyimpan nama BUMKam dan nama kampung di pengaturan, agar seluruh aplikasi menggunakan nama yang benar tanpa hardcode.

#### Kriteria Penerimaan

1. THE `ProfilUsahaService` SHALL menyimpan profil usaha sebagai objek JSON di localStorage dengan kunci `profil_usaha`.
2. WHEN `ProfilUsahaService.getProfil()` dipanggil dan kunci `profil_usaha` tidak ada di localStorage, THE `ProfilUsahaService` SHALL mengembalikan nilai default `{ namaBumkam: "BUMKam Torei Natei", namaKampung: "Kampung Yakonde" }`.
3. WHEN `ProfilUsahaService.getProfil()` dipanggil dan data di localStorage rusak atau tidak dapat di-parse sebagai JSON, THE `ProfilUsahaService` SHALL mengembalikan nilai default tanpa melempar exception.
4. WHEN `ProfilUsahaService.saveProfil(data)` dipanggil dengan data valid, THE `ProfilUsahaService` SHALL menyimpan data yang sudah di-trim ke localStorage dan mengembalikan `true`.
5. WHEN `ProfilUsahaService.getProfil()` dipanggil setelah `saveProfil(data)` berhasil, THE `ProfilUsahaService` SHALL mengembalikan nilai yang sama dengan data yang disimpan.
6. WHERE fitur multi-user aktif, THE `ProfilUsahaService` SHALL menggunakan kunci `profil_usaha` yang sama untuk semua pengguna pada perangkat yang sama (profil usaha bersifat per-perangkat, bukan per-akun).

---

### Persyaratan 2: Validasi Input Profil Usaha

**User Story:** Sebagai admin, saya ingin mendapat pesan error yang jelas dalam Bahasa Indonesia jika memasukkan nama yang tidak valid, agar data profil usaha selalu berisi nilai yang bermakna.

#### Kriteria Penerimaan

1. WHEN admin mencoba menyimpan profil dengan `namaBumkam` kosong atau hanya whitespace, THE `ProfilUsahaService` SHALL menolak penyimpanan dan mengembalikan pesan error `"Nama BUMKam / Usaha wajib diisi."`.
2. WHEN admin mencoba menyimpan profil dengan `namaKampung` kosong atau hanya whitespace, THE `ProfilUsahaService` SHALL menolak penyimpanan dan mengembalikan pesan error `"Nama Kampung wajib diisi."`.
3. WHEN admin memasukkan `namaBumkam` dengan panjang melebihi 60 karakter setelah di-trim, THE `ProfilUsahaService` SHALL menolak penyimpanan dan mengembalikan pesan error `"Nama BUMKam / Usaha maksimal 60 karakter."`.
4. WHEN admin memasukkan `namaKampung` dengan panjang melebihi 60 karakter setelah di-trim, THE `ProfilUsahaService` SHALL menolak penyimpanan dan mengembalikan pesan error `"Nama Kampung maksimal 60 karakter."`.
5. WHEN input `namaBumkam` atau `namaKampung` berisi spasi berlebih di awal atau akhir, THE `ProfilUsahaService` SHALL memotong (trim) spasi tersebut sebelum menyimpan.

---

### Persyaratan 3: Formulir Pengaturan Profil Usaha

**User Story:** Sebagai admin, saya ingin mengisi nama BUMKam dan nama kampung di halaman Pengaturan Profil, agar saya dapat mengelola identitas usaha langsung dari aplikasi.

#### Kriteria Penerimaan

1. THE halaman Pengaturan Profil SHALL menampilkan field input "Nama BUMKam / Nama Usaha" dengan nilai saat ini dari `ProfilUsahaService.getProfil()`.
2. THE halaman Pengaturan Profil SHALL menampilkan field input "Nama Kampung" dengan nilai saat ini dari `ProfilUsahaService.getProfil()`.
3. WHEN admin mengklik tombol simpan profil, THE Halaman Profil SHALL memanggil `ProfilUsahaService.saveProfil()` dengan nilai dari kedua field tersebut.
4. WHEN `ProfilUsahaService.saveProfil()` mengembalikan error, THE Halaman Profil SHALL menampilkan pesan error tersebut di bawah field yang bersangkutan menggunakan Bahasa Indonesia.
5. WHEN penyimpanan berhasil, THE Halaman Profil SHALL menampilkan notifikasi sukses "Profil usaha berhasil disimpan."

---

### Persyaratan 4: Pembaruan Langsung Seluruh UI

**User Story:** Sebagai admin, saya ingin melihat nama BUMKam yang baru segera muncul di seluruh halaman setelah menyimpan, tanpa harus reload manual.

#### Kriteria Penerimaan

1. WHEN profil usaha berhasil disimpan, THE `ProfilUsahaService` SHALL menerbitkan event `profil-usaha-updated` melalui `BroadcastChannel` dengan nama channel `"sikat_profil_usaha"`.
2. WHEN event `profil-usaha-updated` diterima, THE Aplikasi SHALL memperbarui semua Komponen Dinamis yang sedang ditampilkan tanpa full page reload.
3. THE header dan sidebar SHALL selalu membaca nama dari `ProfilUsahaService.getProfil()` setiap kali di-render.
4. THE footer SHALL selalu membaca nama dari `ProfilUsahaService.getProfil()` setiap kali di-render.
5. THE judul browser (`document.title`) SHALL diperbarui untuk mencerminkan `namaBumkam` terbaru setiap kali navigasi terjadi dan setiap kali event `profil-usaha-updated` diterima.
6. WHEN tab browser lain (pada origin yang sama) menerima event `profil-usaha-updated` melalui `BroadcastChannel`, THE tab tersebut SHALL memperbarui semua Komponen Dinamis yang sedang ditampilkan.

---

### Persyaratan 5: Laporan Keuangan Menggunakan Nama Dinamis

**User Story:** Sebagai admin, saya ingin laporan keuangan selalu menampilkan nama BUMKam dan nama kampung yang tersimpan, agar laporan yang dicetak mencerminkan identitas usaha yang benar.

#### Kriteria Penerimaan

1. THE header kop laporan pada tab Laba Rugi, Arus Kas, Neraca, CALK, dan Buku Kas SHALL membaca `namaBumkam` dan `namaKampung` dari `ProfilUsahaService.getProfil()` setiap kali di-render.
2. THE blok tanda tangan (ttd) pada area cetak setiap laporan SHALL membaca `namaBumkam` dari `ProfilUsahaService.getProfil()` setiap kali di-render.
3. THE header baris pertama pada setiap ekspor Excel SHALL membaca `namaBumkam` dari `ProfilUsahaService.getProfil()`.
4. THE nama file Excel yang diekspor SHALL menyertakan singkatan atau identifikasi usaha, menggunakan string statis "SIKAT" (bukan nama dinamis) untuk kompatibilitas nama file.
5. WHEN profil usaha diperbarui dan admin beralih ke tab laporan, THE laporan SHALL menampilkan nama terbaru karena setiap render tab membaca profil secara langsung.

---

### Persyaratan 6: Halaman Statis Menggunakan Nama Dinamis

**User Story:** Sebagai admin, saya ingin halaman Panduan, Fitur & Kebijakan, Kontak, dan Versi menampilkan nama BUMKam yang benar, agar informasi aplikasi konsisten dengan identitas usaha.

#### Kriteria Penerimaan

1. THE halaman Panduan SHALL membaca `namaBumkam` dan `namaKampung` dari `ProfilUsahaService.getProfil()` setiap kali di-render.
2. THE halaman Fitur & Kebijakan SHALL membaca `namaBumkam` dari `ProfilUsahaService.getProfil()` setiap kali di-render.
3. THE halaman Kontak SHALL membaca `namaBumkam` dan `namaKampung` dari `ProfilUsahaService.getProfil()` setiap kali di-render.
4. THE halaman Versi SHALL membaca `namaBumkam` dari `ProfilUsahaService.getProfil()` setiap kali di-render.

---

### Persyaratan 7: Halaman Login dan Register Menggunakan Nama Dinamis

**User Story:** Sebagai pengguna, saya ingin halaman login dan register menampilkan nama BUMKam yang sesuai, agar identitas aplikasi konsisten sejak halaman pertama yang dilihat.

#### Kriteria Penerimaan

1. THE halaman Login SHALL membaca `namaBumkam` dari `ProfilUsahaService.getProfil()` dan menampilkannya sebagai subtitle atau deskripsi organisasi.
2. THE halaman Register SHALL membaca `namaBumkam` dari `ProfilUsahaService.getProfil()` dan menampilkannya sebagai subtitle atau deskripsi organisasi.
3. THE splash screen di `index.html` SHALL tetap menggunakan teks statis "BUMKam Torei Natei" dan "Kampung Yakonde" karena dibuat sebelum JavaScript dimuat — ini adalah keterbatasan yang diketahui dan diterima.

---

### Persyaratan 8: Keamanan Tampilan Nama

**User Story:** Sebagai pengembang, saya ingin memastikan nama usaha yang dimasukkan pengguna tidak dapat menyebabkan XSS, agar keamanan aplikasi tetap terjaga.

#### Kriteria Penerimaan

1. THE `ProfilUsahaService` SHALL menyediakan fungsi `getProfilEscaped()` yang mengembalikan `namaBumkam` dan `namaKampung` setelah di-escape HTML (`<`, `>`, `&`, `"` diubah ke entitas HTML).
2. WHEN `namaBumkam` atau `namaKampung` dimasukkan ke template literal HTML (innerHTML), THE kode pemanggil SHALL menggunakan nilai dari `getProfilEscaped()` atau fungsi escaping tersendiri, bukan nilai mentah dari `getProfil()`.
3. THE `ProfilUsahaService` SHALL tidak menyimpan nilai yang sudah di-escape ke localStorage; escaping SHALL dilakukan hanya pada saat rendering.

---

### Persyaratan 9: Persistensi dan Kompatibilitas

**User Story:** Sebagai admin, saya ingin profil usaha tetap tersimpan setelah menutup dan membuka kembali browser, dan tidak mengganggu fitur lain yang sudah berjalan.

#### Kriteria Penerimaan

1. WHEN admin menutup browser dan membuka kembali aplikasi, THE `ProfilUsahaService.getProfil()` SHALL mengembalikan profil yang terakhir disimpan.
2. THE kunci `profil_usaha` di localStorage SHALL tidak bentrok dengan kunci lain yang ada (`sikat_transactions`, `sikat_productions`, `sikat_settings`, `sikat_profil_nama`, `sikat_profil_foto`, `sikat_migrated_utf8`).
3. WHEN kunci `profil_usaha` tidak ada (pengguna lama / fresh install), THE `ProfilUsahaService` SHALL mengembalikan nilai default tanpa error, sehingga semua tampilan yang bergantung tetap berfungsi.
4. THE service worker cache version di `sw.js` SHALL di-bump setelah fitur ini diimplementasi untuk memastikan aset terbaru dimuat.

---

### Persyaratan 10: Pengujian Otomatis

**User Story:** Sebagai pengembang, saya ingin ada tes Vitest untuk `ProfilUsahaService`, agar logika inti penyimpanan, pembacaan, validasi, dan fallback dapat diverifikasi secara otomatis.

#### Kriteria Penerimaan

1. THE test suite SHALL berisi tes yang memverifikasi bahwa `getProfil()` mengembalikan nilai default saat localStorage kosong.
2. THE test suite SHALL berisi tes yang memverifikasi round-trip: setelah `saveProfil(data)` berhasil, `getProfil()` mengembalikan data yang ekuivalen.
3. THE test suite SHALL berisi tes yang memverifikasi bahwa `getProfil()` mengembalikan nilai default saat data localStorage rusak (bukan JSON valid).
4. THE test suite SHALL berisi tes yang memverifikasi setiap aturan validasi pada Persyaratan 2 (kosong, whitespace, melebihi 60 karakter).
5. THE test suite SHALL berisi tes yang memverifikasi bahwa `getProfilEscaped()` meng-escape karakter HTML berbahaya (`<`, `>`, `&`, `"`) dengan benar.
