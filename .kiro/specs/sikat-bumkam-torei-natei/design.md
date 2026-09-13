# Design Document

## SIKAT — Sistem Informasi Kas Ayam Ternak
### BUMKam Torei Natei, Kampung Yakonde, Papua

---

## Overview

SIKAT adalah Progressive Web App (PWA) berbasis HTML/CSS/JavaScript murni yang dirancang untuk membantu pengelolaan usaha ayam petelur BUMKam Torei Natei. Aplikasi ini berjalan sepenuhnya di browser tanpa backend server — semua data disimpan di LocalStorage browser dan semua logika berjalan di sisi klien.

Arsitektur single-page application (SPA) dengan hash-based routing dipilih karena:
- Tidak memerlukan server-side rendering atau framework JavaScript berat
- Dapat di-cache penuh oleh Service Worker untuk penggunaan offline
- Kompatibel dengan perangkat Android entry-level yang umum di Papua
- Mudah dipasang sebagai PWA di layar beranda Android

Aplikasi terdiri dari 5 halaman (views) yang dirender secara dinamis dalam satu file HTML:
`#home` → Menu Utama  
`#transaksi` → Input Transaksi  
`#rekap` → Rekap Kas  
`#labarugi` → Laba Rugi  
`#produksi` → Produksi Harian

Grafik dirender menggunakan Chart.js (CDN) yang di-cache oleh Service Worker.

---

## Architecture

### Arsitektur Tingkat Tinggi

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser / PWA Shell                     │
│                                                              │
│  ┌──────────────┐    ┌───────────────────────────────────┐  │
│  │ Service      │    │           index.html               │  │
│  │ Worker       │◄───┤  ┌─────────────────────────────┐  │  │
│  │ (sw.js)      │    │  │       App Shell (SPA)        │  │  │
│  │              │    │  │  ┌──────────┐ ┌──────────┐   │  │  │
│  │ Cache:       │    │  │  │  Header  │ │  Footer  │   │  │  │
│  │ - HTML       │    │  │  └──────────┘ └──────────┘   │  │  │
│  │ - CSS        │    │  │  ┌──────────────────────────┐ │  │  │
│  │ - JS         │    │  │  │      View Container       │ │  │  │
│  │ - Chart.js   │    │  │  │  (dirender oleh Router)   │ │  │  │
│  │ - Icons      │    │  │  └──────────────────────────┘ │  │  │
│  └──────────────┘    │  └─────────────────────────────┘  │  │
│                      └───────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   LocalStorage                         │  │
│  │   sikat_transactions: [...] │ sikat_productions: [...] │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Lapisan Arsitektur

Aplikasi distrukturkan dalam 4 lapisan logis (semuanya di sisi klien):

```
┌─────────────────────────────────────────────┐
│            Presentation Layer               │
│  Views: home, transaksi, rekap, labarugi,  │
│  produksi + komponen global (header, footer)│
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Controller Layer                 │
│  Router (hash routing), EventHandlers,      │
│  Form validators, Chart renderers           │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Business Logic Layer             │
│  CalculationEngine: saldo, laba rugi,       │
│  margin, rata-rata produksi, konversi rak   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Data Layer                       │
│  StorageService: CRUD ke LocalStorage,      │
│  JSON serialisasi/deserialisasi, error      │
│  handling, inisialisasi data dummy          │
└─────────────────────────────────────────────┘
```

### Struktur File

```
/
├── index.html              # Entry point SPA utama
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── css/
│   ├── main.css            # Style global (variabel, reset, layout)
│   ├── components.css      # Kartu, tombol, form, header, footer
│   └── views.css           # Style spesifik per halaman
├── js/
│   ├── app.js              # Entry point JS, init aplikasi
│   ├── router.js           # Hash-based router
│   ├── storage.js          # StorageService (CRUD LocalStorage)
│   ├── calculator.js       # CalculationEngine (logika bisnis)
│   ├── validator.js        # Validasi input form
│   ├── views/
│   │   ├── home.js         # View Menu Utama
│   │   ├── transaksi.js    # View Input Transaksi
│   │   ├── rekap.js        # View Rekap Kas
│   │   ├── labarugi.js     # View Laba Rugi
│   │   └── produksi.js     # View Produksi Harian
│   └── charts.js           # Wrapper Chart.js
└── assets/
    ├── icons/
    │   ├── icon-16.png
    │   ├── icon-32.png
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   └── apple-touch-icon.png
    └── favicon.ico
```

---

## Components and Interfaces

### Router

Router mendengarkan event `hashchange` dan `load` pada `window`, lalu merender view yang sesuai.

```javascript
// router.js
const ROUTES = {
  '#home':       views.home,
  '#transaksi':  views.transaksi,
  '#rekap':      views.rekap,
  '#labarugi':   views.labarugi,
  '#produksi':   views.produksi,
};

function navigate(hash) {
  // Simpan ke history API untuk tombol back
  const viewFn = ROUTES[hash] ?? views.notFound;
  document.getElementById('view-container').innerHTML = viewFn();
  attachViewEventListeners(hash);
}

window.addEventListener('hashchange', () => navigate(location.hash));
window.addEventListener('load', () => {
  if (!location.hash) location.hash = '#home';
  navigate(location.hash);
});
```

**Interface publik Router:**
- `navigate(hash: string): void` — render view dan pasang event listener
- `pushState(hash: string): void` — perbarui URL tanpa trigger hashchange

### StorageService

Semua interaksi dengan LocalStorage melewati satu modul ini untuk memastikan penanganan error konsisten dan format data terpusat.

```javascript
// storage.js
const KEYS = {
  TRANSACTIONS: 'sikat_transactions',
  PRODUCTIONS:  'sikat_productions',
};

const StorageService = {
  // Membaca semua transaksi; return [] jika kosong atau error
  getTransactions(): Transaction[],

  // Membaca semua data produksi; return [] jika kosong atau error
  getProductions(): Production[],

  // Menyimpan transaksi baru; throws StorageError jika gagal
  saveTransaction(tx: Transaction): void,

  // Menyimpan data produksi; menimpa jika tanggal sama
  saveProduction(prod: Production, confirmOverwrite?: boolean): OverwriteResult,

  // Inisialisasi data dummy jika storage kosong
  initDummyData(): void,

  // Menghapus semua data (untuk testing)
  clearAll(): void,
};
```

### CalculationEngine

Semua rumus bisnis terpusat di sini agar konsisten lintas view.

```javascript
// calculator.js
const CalculationEngine = {
  // Hitung saldo kas dari semua transaksi
  // saldo = sum(penjualan_telur) - sum(pembelian_pakan) - sum(biaya_lain)
  getSaldoKas(transactions: Transaction[]): number,

  // Hitung total penjualan, pakan, biaya_lain, untung_bersih untuk rentang tanggal
  getLaporanPeriode(transactions: Transaction[], start: Date, end: Date): LaporanPeriode,

  // Hitung margin keuntungan; return 0 jika total penjualan = 0 (mencegah division by zero)
  getMarginKeuntungan(untungBersih: number, totalPenjualan: number): number,

  // Konversi Rak ke Butir: rak * 30
  rakToButir(rak: number): number,

  // Hitung total produksi hari ini (butir)
  getProduksiHariIni(productions: Production[], tanggal: Date): number,

  // Hitung rata-rata produksi harian untuk N hari terakhir
  getRataRataProduksi(productions: Production[], hariTerakhir: number): number,

  // Ambil data per hari untuk N hari kalender terakhir (dengan isi 0 untuk hari kosong)
  getDataGrafikProduksi(productions: Production[], hariTerakhir: number): ChartDataPoint[],

  // Ambil data per minggu untuk M minggu terakhir yang punya data
  getDataGrafikMingguan(transactions: Transaction[], maxMinggu: number): WeeklyChartData[],

  // Dapatkan batas awal minggu berjalan (Senin) dan akhir (Minggu)
  getBatasMingguBerjalan(): { start: Date, end: Date },
};
```

### Validator

```javascript
// validator.js
const Validator = {
  // Validasi form transaksi; return { valid: boolean, errors: FieldErrors }
  validateTransaksi(data: TransaksiFormData): ValidationResult,

  // Validasi form produksi; return { valid: boolean, errors: FieldErrors }
  validateProduksi(data: ProduksiFormData): ValidationResult,

  // Validasi format tanggal DD/MM/YYYY
  validateDateFormat(value: string): boolean,

  // Validasi nilai nominal (1 - 999_999_999_999)
  validateNominal(value: string): boolean,

  // Validasi jumlah rak (1 - 9999)
  validateJumlahRak(value: string): boolean,
};
```

### Header & Footer Components

Header dan Footer adalah fungsi yang mengembalikan string HTML, dirender sekali saat aplikasi dimuat dan tidak dirender ulang saat navigasi.

```javascript
// Dipanggil sekali di app.js
function renderHeader() {
  document.getElementById('header-container').innerHTML = Header.render();
  Header.attachEventListeners(); // logo click → navigate('#home')
}

function renderFooter() {
  document.getElementById('footer-container').innerHTML = Footer.render();
  Footer.attachEventListeners();
}
```

### Chart.js Integration

Wrapper tipis di atas Chart.js untuk memastikan konfigurasi grafik konsisten.

```javascript
// charts.js
const ChartManager = {
  // Buat/perbarui grafik garis tren produksi
  renderProduktionChart(canvasId: string, data: ChartDataPoint[]): Chart,

  // Buat/perbarui grafik garis mingguan (penjualan vs biaya pakan)
  renderWeeklyChart(canvasId: string, data: WeeklyChartData[]): Chart,

  // Hancurkan instance chart yang ada sebelum render ulang (cegah memory leak)
  destroyChart(canvasId: string): void,
};
```

### Service Worker

Service Worker menggunakan strategi **Cache-First** untuk aset statis dan **Network-First** untuk navigasi.

```javascript
// sw.js
const CACHE_NAME = 'sikat-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/css/views.css',
  '/js/app.js',
  '/js/router.js',
  '/js/storage.js',
  '/js/calculator.js',
  '/js/validator.js',
  // ... semua file JS view
  '/js/charts.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
];

// Install: cache semua aset statis
// Activate: hapus cache lama
// Fetch: Cache-First untuk aset statis, fallback ke cache untuk navigasi offline
```

---

## Data Models

### Transaction

```javascript
/**
 * Merepresentasikan satu entri transaksi keuangan.
 * Disimpan dalam array di LocalStorage dengan key 'sikat_transactions'.
 */
interface Transaction {
  id: string;            // UUID v4, dibuat saat simpan
  jenis: 'penjualan_telur' | 'pembelian_pakan' | 'biaya_lain';
  tanggal: string;       // Format ISO 8601: "YYYY-MM-DD"
  lokasi: string;        // Maks 100 karakter
  nominal: number;       // Integer, rentang 1 - 999_999_999_999
  jumlahRak?: number;    // Hanya ada jika jenis === 'penjualan_telur', rentang 1-9999
  createdAt: string;     // ISO 8601 timestamp saat data dibuat
}
```

### Production

```javascript
/**
 * Merepresentasikan catatan produksi telur harian.
 * Disimpan dalam array di LocalStorage dengan key 'sikat_productions'.
 * Satu entri per tanggal (tanggal bersifat unik).
 */
interface Production {
  id: string;            // UUID v4
  tanggal: string;       // Format ISO 8601: "YYYY-MM-DD"
  jumlahRak: number;     // Integer, rentang 1 - 9999
  createdAt: string;     // ISO 8601 timestamp saat data dibuat
}
```

### Derived Types

```javascript
interface LaporanPeriode {
  totalPenjualan: number;
  totalPakan: number;
  totalBiayaLain: number;
  untungBersih: number;  // = totalPenjualan - totalPakan - totalBiayaLain
}

interface ChartDataPoint {
  label: string;         // Format "DD/MM" untuk label sumbu X
  value: number;         // Nilai sumbu Y (jumlah rak atau nominal)
  tanggal: string;       // ISO date untuk sorting
}

interface WeeklyChartData {
  label: string;         // Format "Minggu N" atau "DD/MM - DD/MM"
  penjualan: number;
  biayaPakan: number;
}

type OverwriteResult = 'saved' | 'cancelled' | 'needs_confirmation';

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;  // key: nama field, value: pesan error
}

interface FieldErrors {
  jenis?: string;
  tanggal?: string;
  lokasi?: string;
  nominal?: string;
  jumlahRak?: string;
}
```

### LocalStorage Schema

```
sikat_transactions  →  JSON.stringify(Transaction[])
sikat_productions   →  JSON.stringify(Production[])
```

Contoh data dummy yang diinisialisasi saat storage kosong:

```javascript
// 10 entri transaksi contoh (tanggal dalam 30 hari terakhir)
const DUMMY_TRANSACTIONS: Transaction[] = [
  { id: '...', jenis: 'penjualan_telur', tanggal: '2026-09-01', lokasi: 'Pasar Sentani', nominal: 750000, jumlahRak: 25, createdAt: '...' },
  { id: '...', jenis: 'pembelian_pakan', tanggal: '2026-09-02', lokasi: 'Toko Sentani', nominal: 450000, createdAt: '...' },
  // ... 8 entri lagi
];

// 7 entri produksi contoh (7 hari terakhir)
const DUMMY_PRODUCTIONS: Production[] = [
  { id: '...', tanggal: '2026-09-04', jumlahRak: 32, createdAt: '...' },
  { id: '...', tanggal: '2026-09-05', jumlahRak: 28, createdAt: '...' },
  // ... 5 entri lagi
];
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Format Tanggal Header Konsisten

*Untuk sembarang* objek `Date` yang valid, fungsi `formatTanggalHeader(date)` harus menghasilkan string yang cocok dengan pola `"<NamaHari>, DD <NamaBulan> YYYY"` menggunakan nama hari dan bulan dalam Bahasa Indonesia.

**Validates: Requirements 1.6**

---

### Property 2: Kalkulasi Saldo Kas

*Untuk sembarang* array transaksi yang valid, `CalculationEngine.getSaldoKas(transactions)` harus mengembalikan nilai yang sama dengan `sum(nominal | jenis === penjualan_telur) - sum(nominal | jenis === pembelian_pakan) - sum(nominal | jenis === biaya_lain)`.

**Validates: Requirements 6.1, 6.2**

---

### Property 3: Kalkulasi Untung Bersih

*Untuk sembarang* array transaksi dalam satu periode, `CalculationEngine.getLaporanPeriode(transactions, start, end).untungBersih` harus sama dengan `totalPenjualan - totalPakan - totalBiayaLain` dari transaksi dalam periode tersebut.

**Validates: Requirements 7.4, 7.5**

---

### Property 4: Konversi Rak ke Butir Konsisten

*Untuk sembarang* nilai integer `rak` dalam rentang `[1, 9999]`, `CalculationEngine.rakToButir(rak)` harus selalu mengembalikan `rak * 30`, dan nilai yang sama harus digunakan secara konsisten di seluruh modul (Menu Utama, Rekap Kas, Produksi).

**Validates: Requirements 9.2**

---

### Property 5: Ringkasan Harian Menu Utama Konsisten dengan Data

*Untuk sembarang* set data produksi hari ini dengan tanggal sama dengan tanggal perangkat, nilai "Produksi" yang ditampilkan di Ringkasan Hari Ini harus sama dengan `sum(jumlahRak untuk tanggal hari ini) * 30`. *Untuk sembarang* set transaksi hari ini berjenis "Penjualan Telur", nilai "Penjualan" harus sama dengan `sum(nominal)`.

**Validates: Requirements 4.10, 4.11, 4.12**

---

### Property 6: Transaksi Valid Mengubah Saldo Kas dengan Benar

*Untuk sembarang* transaksi valid yang disimpan, Saldo_Kas setelah penyimpanan harus sama dengan Saldo_Kas sebelumnya ditambah `nominal` jika `jenis === penjualan_telur`, atau dikurangi `nominal` jika `jenis === pembelian_pakan` atau `jenis === biaya_lain`.

**Validates: Requirements 5.5**

---

### Property 7: Validasi Penolakan Input Tidak Valid

*Untuk sembarang* kombinasi field form yang mengandung satu atau lebih field kosong, atau nilai `nominal` di luar `[1, 999_999_999_999]`, atau nilai `jumlahRak` di luar `[1, 9999]`, `Validator.validateTransaksi()` harus mengembalikan `valid: false` dan tidak ada data yang tersimpan ke LocalStorage.

**Validates: Requirements 5.6, 5.7**

---

### Property 8: Validasi Form Produksi

*Untuk sembarang* kombinasi field produksi yang mengandung field kosong, nilai `jumlahRak` di luar `[1, 9999]`, atau format tanggal bukan `DD/MM/YYYY`, `Validator.validateProduksi()` harus mengembalikan `valid: false` dan tidak ada data yang tersimpan ke LocalStorage.

**Validates: Requirements 8.4, 8.5, 8.6**

---

### Property 9: Riwayat Transaksi Diurutkan Terbaru ke Terlama

*Untuk sembarang* array transaksi dengan tanggal yang berbeda, daftar riwayat yang dirender di Modul_Rekap_Kas harus menampilkan transaksi dalam urutan `tanggal` menurun (terbaru di atas), dan tidak ada transaksi yang hilang.

**Validates: Requirements 6.3**

---

### Property 10: Data Grafik Produksi Mencakup Tepat 7 Hari Kalender

*Untuk sembarang* set data produksi, data yang dikirim ke grafik tren produksi harus selalu berisi tepat 7 titik data yang mewakili 7 hari kalender terakhir dari hari ini, dengan nilai `0` untuk hari yang tidak memiliki data produksi.

**Validates: Requirements 8.7**

---

### Property 11: Rata-Rata Produksi Benar

*Untuk sembarang* set data produksi dalam 7 hari terakhir, `CalculationEngine.getRataRataProduksi(productions, 7)` harus mengembalikan `sum(jumlahRak dalam 7 hari terakhir) / 7`, dibulatkan ke dua desimal.

**Validates: Requirements 8.9**

---

### Property 12: Margin Keuntungan Aman dari Pembagian Nol

*Untuk sembarang* nilai `untungBersih` dan `totalPenjualan`, jika `totalPenjualan === 0`, `CalculationEngine.getMarginKeuntungan()` harus mengembalikan `0` tanpa melempar exception. Jika `totalPenjualan > 0`, harus mengembalikan `(untungBersih / totalPenjualan) * 100` dibulatkan dua desimal.

**Validates: Requirements 7.7, 7.8**

---

### Property 13: Round-Trip Serialisasi Data

*Untuk sembarang* array `Transaction[]` atau `Production[]` yang valid, `JSON.parse(JSON.stringify(data))` harus menghasilkan struktur yang setara secara nilai (semua field bertipe, nilai, dan isi yang sama), sehingga data yang disimpan ke LocalStorage identik dengan data yang dibaca kembali.

**Validates: Requirements 9.1**

---

### Property 14: Data Existing Tidak Ditimpa saat Inisialisasi

*Untuk sembarang* data yang sudah ada di LocalStorage (`sikat_transactions` atau `sikat_productions`), memanggil `StorageService.initDummyData()` tidak boleh mengubah, menghapus, atau menambahkan entri ke data yang sudah ada tersebut.

**Validates: Requirements 9.5**

---

### Property 15: Hash Routing Konsisten

*Untuk sembarang* hash URL yang terdaftar (`#home`, `#transaksi`, `#rekap`, `#labarugi`, `#produksi`), navigasi langsung ke hash tersebut harus selalu merender view yang tepat dan memasang event listener yang sesuai, tanpa bergantung pada state sebelumnya.

**Validates: Requirements 10.3**

---

## Error Handling

### Strategi Umum

Semua error ditangani secara diam-diam (tanpa melempar ke pengguna berupa stack trace) dengan prinsip **graceful degradation**: aplikasi tetap fungsional semaksimal mungkin meski terjadi kegagalan parsial.

```javascript
// Pola umum untuk semua operasi StorageService
try {
  const raw = localStorage.getItem(KEYS.TRANSACTIONS);
  return raw ? JSON.parse(raw) : [];
} catch (e) {
  console.error('[StorageService] Gagal membaca transaksi:', e);
  return [];  // Return default, jangan lempar error ke view
}
```

### Tabel Error dan Penanganannya

| Skenario | Penanganan |
|---|---|
| LocalStorage tidak dapat dibaca (corrupt/parseerror) | Return `[]`, tampilkan banner error non-blocking, log ke console |
| LocalStorage penuh (QuotaExceededError) | Tampilkan pesan error modal, pertahankan nilai form yang sudah diisi |
| Service Worker gagal didaftarkan | Silent fail (log ke console), aplikasi tetap berjalan online |
| Chart.js gagal dimuat (offline pertama kali) | Tampilkan pesan "Grafik tidak tersedia", data teks tetap ditampilkan |
| URL hash tidak dikenal | Render halaman `404 - Halaman Tidak Ditemukan` dengan tombol kembali ke `#home` |
| Aset splash screen gagal dimuat > 3 detik | Timeout handler langsung tampilkan `#home` |
| Pembagian dengan nol (margin keuntungan) | Return `0` secara eksplisit sebelum kalkulasi |
| Data LocalStorage kosong | Muat Data_Dummy (10 transaksi + 7 produksi) |

### User-Facing Error Messages

Semua pesan error menggunakan komponen notifikasi yang konsisten:

```javascript
// Tipe notifikasi
type NotificationType = 'success' | 'error' | 'warning' | 'info';

showNotification(message: string, type: NotificationType, autoHide?: number): void;
// success: auto-hide 3 detik (hijau)
// error: tidak auto-hide, ada tombol tutup (merah)
// warning: auto-hide 5 detik (kuning)
```

Pesan error dalam Bahasa Indonesia yang ditetapkan:
- Gagal simpan: *"Data tidak dapat disimpan. Coba lagi."*
- Gagal baca: *"Data tidak dapat dimuat. Silakan muat ulang halaman."*
- Storage penuh: *"Penyimpanan penuh. Hapus data lama atau bersihkan cache browser."*
- Validasi kosong: *"[Nama Field] wajib diisi."*
- Validasi rentang: *"[Nama Field] harus antara [min] dan [max]."*
- Validasi format tanggal: *"Format tanggal harus DD/MM/YYYY (contoh: 10/09/2026)."*

---

## Testing Strategy

### Pendekatan Dual Testing

Strategi pengujian menggunakan dua pendekatan komplementer:
- **Unit tests (example-based)**: Memverifikasi perilaku spesifik dengan contoh konkret, kondisi tepi, dan interaksi UI
- **Property-based tests (PBT)**: Memverifikasi properti universal yang harus berlaku untuk semua input yang valid

### Framework Testing

| Layer | Tool | Alasan |
|---|---|---|
| Unit & PBT | **Vitest** | Zero-config, kompatibel browser environment via jsdom, cepat |
| PBT Library | **fast-check** | Library PBT JavaScript yang matang dan aktif dikembangkan |
| DOM Testing | **@testing-library/dom** | Testing interaksi DOM yang mendekati perilaku pengguna |
| Coverage | **@vitest/coverage-v8** | Built-in coverage di Vitest |

### Konfigurasi Property-Based Tests

Setiap property test dikonfigurasi dengan minimal **100 iterasi** dan diberi tag sesuai konvensi:

```javascript
// Contoh PBT dengan fast-check
import * as fc from 'fast-check';

// Feature: sikat-bumkam-torei-natei, Property 2: Kalkulasi Saldo Kas
test('Property 2: Kalkulasi Saldo Kas', () => {
  fc.assert(
    fc.property(
      fc.array(arbitraryTransaction()),
      (transactions) => {
        const saldo = CalculationEngine.getSaldoKas(transactions);
        const expected =
          transactions.filter(t => t.jenis === 'penjualan_telur').reduce((s, t) => s + t.nominal, 0)
          - transactions.filter(t => t.jenis !== 'penjualan_telur').reduce((s, t) => s + t.nominal, 0);
        return saldo === expected;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Arbitrary Generators (fast-check)

```javascript
const arbitraryTransaction = () =>
  fc.record({
    id: fc.uuid(),
    jenis: fc.constantFrom('penjualan_telur', 'pembelian_pakan', 'biaya_lain'),
    tanggal: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().split('T')[0]),
    lokasi: fc.string({ minLength: 1, maxLength: 100 }),
    nominal: fc.integer({ min: 1, max: 999_999_999_999 }),
    createdAt: fc.date().map(d => d.toISOString()),
  });

const arbitraryProduction = () =>
  fc.record({
    id: fc.uuid(),
    tanggal: fc.date().map(d => d.toISOString().split('T')[0]),
    jumlahRak: fc.integer({ min: 1, max: 9999 }),
    createdAt: fc.date().map(d => d.toISOString()),
  });
```

### Pemetaan Property ke Test

| Property | Test File | Tag |
|---|---|---|
| Property 1: Format Tanggal | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 1` |
| Property 2: Kalkulasi Saldo Kas | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 2` |
| Property 3: Kalkulasi Untung Bersih | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 3` |
| Property 4: Konversi Rak ke Butir | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 4` |
| Property 5: Ringkasan Harian | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 5` |
| Property 6: Saldo Kas Berubah Benar | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 6` |
| Property 7: Validasi Transaksi | `validator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 7` |
| Property 8: Validasi Produksi | `validator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 8` |
| Property 9: Urutan Riwayat | `rekap.test.js` | `Feature: sikat-bumkam-torei-natei, Property 9` |
| Property 10: Data Grafik 7 Hari | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 10` |
| Property 11: Rata-rata Produksi | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 11` |
| Property 12: Margin Aman Divisi Nol | `calculator.test.js` | `Feature: sikat-bumkam-torei-natei, Property 12` |
| Property 13: Round-Trip Serialisasi | `storage.test.js` | `Feature: sikat-bumkam-torei-natei, Property 13` |
| Property 14: Data Existing Terlindungi | `storage.test.js` | `Feature: sikat-bumkam-torei-natei, Property 14` |
| Property 15: Hash Routing | `router.test.js` | `Feature: sikat-bumkam-torei-natei, Property 15` |

### Unit Tests Tambahan (Example-Based)

Selain property tests, unit tests berbasis contoh diperlukan untuk:

**Komponen UI & Rendering:**
- Header: keberadaan logo, tanggal, avatar
- Footer: tautan dan teks copyright
- Splash screen: durasi (1000-2000ms), transisi otomatis
- Kartu menu: teks, ikon, navigasi onclick
- Form transaksi: visibilitas field jumlah rak kondisional
- Notifikasi: auto-hide 3 detik untuk success

**Kondisi Error:**
- LocalStorage corrupt → tampilkan pesan error, nilai default 0
- Storage penuh → pesan error, nilai form dipertahankan
- Service Worker gagal → tidak ada error UI
- URL hash tidak dikenal → halaman 404

**PWA & Konfigurasi:**
- manifest.json: properti wajib, ukuran short_name ≤ 12 karakter
- HTML: tag `<link rel="manifest">` hadir
- Favicon 16px, 32px, apple-touch-icon 180px hadir

**Integrasi:**
- Service Worker: registrasi berhasil setelah load event
- Cache: semua aset statis ter-cache setelah instalasi
- Offline: aplikasi memuat dari cache

### Menjalankan Tests

```bash
# Jalankan semua test sekali (tanpa watch mode)
npx vitest --run

# Jalankan dengan coverage
npx vitest --run --coverage

# Jalankan file test tertentu
npx vitest --run calculator.test.js
```
