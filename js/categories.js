// js/categories.js — Konfigurasi Kategori Bertingkat & Bagan Akun Akuntansi SIKAT

/**
 * Bagan Akun Standar (Chart of Accounts) BUMKam
 */
export const COA = {
  // Aset (1-xxxx)
  KAS:                     { code: '1-1000', name: 'Kas' },
  PERSEDIAAN_TELUR:        { code: '1-1310', name: 'Persediaan Telur' },
  PERSEDIAAN_PAKAN:        { code: '1-1320', name: 'Persediaan Pakan' },
  PERSEDIAAN_OBAT:         { code: '1-1330', name: 'Persediaan Obat & Vaksin' },
  PERSEDIAAN_AYAM:         { code: '1-1340', name: 'Persediaan Ayam Ternak' },
  PERALATAN_KANDANG:       { code: '1-2010', name: 'Peralatan Kandang (Aset Tetap)' },
  MESIN_PRODUKSI:          { code: '1-2020', name: 'Mesin / Alat Produksi (Aset Tetap)' },
  KENDARAAN:               { code: '1-2030', name: 'Kendaraan Operasional (Aset Tetap)' },
  PERALATAN_LAIN:          { code: '1-2090', name: 'Peralatan Lainnya (Aset Tetap)' },

  // Kewajiban (2-xxxx)
  UTANG_USAHA:             { code: '2-1000', name: 'Utang Usaha' },
  UTANG_BANK:              { code: '2-2000', name: 'Utang Bank / Pinjaman' },
  UTANG_LAIN:              { code: '2-3000', name: 'Utang Lainnya' },

  // Ekuitas (3-xxxx)
  MODAL_AWAL:              { code: '3-1000', name: 'Modal Awal Disetor' },
  PENYERTAAN_DESA:         { code: '3-1100', name: 'Penyertaan Modal Desa' },
  TAMBAHAN_MODAL:          { code: '3-1200', name: 'Tambahan Modal' },
  MODAL_LAIN:              { code: '3-1300', name: 'Modal Lainnya' },
  PRIVE:                   { code: '3-3000', name: 'Prive / Pengambilan Kas' },

  // Pendapatan (4-xxxx)
  PENDAPATAN_TELUR:        { code: '4-1000', name: 'Pendapatan Penjualan Telur' },
  PENDAPATAN_AYAM:         { code: '4-2000', name: 'Pendapatan Penjualan Ayam' },
  PENDAPATAN_LAIN:         { code: '4-9000', name: 'Pendapatan Lain-lain' },

  // Beban (5-xxxx)
  BEBAN_PAKAN:             { code: '5-1010', name: 'Beban Pakan Ayam' },
  BEBAN_OBAT:              { code: '5-1020', name: 'Beban Obat & Vaksin' },
  BEBAN_PERLENGKAPAN:      { code: '5-2010', name: 'Beban Perlengkapan Kandang' },
  BEBAN_SANITASI:          { code: '5-2020', name: 'Beban Kebersihan & Sanitasi' },
  BEBAN_PERLENGKAPAN_LAIN: { code: '5-2090', name: 'Beban Perlengkapan Lain' },
  BEBAN_LAIN:              { code: '5-3000', name: 'Beban Operasional Lain-lain' },
};

/**
 * Daftar Kategori Utama & Sub-kategori
 */
export const CATEGORIES = [
  {
    id: 'penjualan',
    name: 'Penjualan',
    icon: '💰',
    type: 'in', // Pemasukan
    subcategories: [
      {
        id: 'penjualan_telur',
        name: 'Penjualan Telur',
        icon: '🥚',
        type: 'in',
        defaultUnit: 'rak',
        isEgg: true,
        debitAccount: COA.KAS,
        creditAccount: COA.PENDAPATAN_TELUR,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
      {
        id: 'penjualan_ayam',
        name: 'Penjualan Ayam / Afkir',
        icon: '🐔',
        type: 'in',
        defaultUnit: 'ekor',
        debitAccount: COA.KAS,
        creditAccount: COA.PENDAPATAN_AYAM,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
      {
        id: 'penjualan_lain',
        name: 'Penjualan Lainnya',
        icon: '📦',
        type: 'in',
        defaultUnit: 'item',
        needKeterangan: true,
        debitAccount: COA.KAS,
        creditAccount: COA.PENDAPATAN_LAIN,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
    ],
  },
  {
    id: 'modal',
    name: 'Modal',
    icon: '🏛️',
    type: 'in',
    subcategories: [
      {
        id: 'modal_awal',
        name: 'Setoran Modal Awal',
        icon: '🏛️',
        type: 'in',
        defaultUnit: 'paket',
        debitAccount: COA.KAS,
        creditAccount: COA.MODAL_AWAL,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'modal_awal' },
      },
      {
        id: 'tambahan_modal',
        name: 'Tambahan Modal',
        icon: '📈',
        type: 'in',
        defaultUnit: 'paket',
        debitAccount: COA.KAS,
        creditAccount: COA.TAMBAHAN_MODAL,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'tambahan_modal' },
      },
      {
        id: 'penyertaan_desa',
        name: 'Penyertaan Desa',
        icon: '🤝',
        type: 'in',
        defaultUnit: 'tahap',
        debitAccount: COA.KAS,
        creditAccount: COA.PENYERTAAN_DESA,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'penyertaan_desa' },
      },
      {
        id: 'modal_lain',
        name: 'Modal Lainnya',
        icon: '📑',
        type: 'in',
        defaultUnit: 'paket',
        needKeterangan: true,
        debitAccount: COA.KAS,
        creditAccount: COA.MODAL_LAIN,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'modal_lain' },
      },
    ],
  },
  {
    id: 'peralatan',
    name: 'Peralatan (Aset Tetap)',
    icon: '🛠️',
    type: 'out', // Pengeluaran
    subcategories: [
      {
        id: 'peralatan_kandang',
        name: 'Peralatan Kandang',
        icon: '🛖',
        type: 'out',
        defaultUnit: 'unit',
        debitAccount: COA.PERALATAN_KANDANG,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'investasi', neraca: 'aset_tetap' },
      },
      {
        id: 'mesin_produksi',
        name: 'Mesin / Alat Produksi',
        icon: '⚙️',
        type: 'out',
        defaultUnit: 'unit',
        debitAccount: COA.MESIN_PRODUKSI,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'investasi', neraca: 'aset_tetap' },
      },
      {
        id: 'kendaraan',
        name: 'Kendaraan',
        icon: '🛵',
        type: 'out',
        defaultUnit: 'unit',
        debitAccount: COA.KENDARAAN,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'investasi', neraca: 'aset_tetap' },
      },
      {
        id: 'peralatan_lain',
        name: 'Peralatan Lainnya',
        icon: '📦',
        type: 'out',
        defaultUnit: 'unit',
        needKeterangan: true,
        debitAccount: COA.PERALATAN_LAIN,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'investasi', neraca: 'aset_tetap' },
      },
    ],
  },
  {
    id: 'perlengkapan',
    name: 'Perlengkapan (Habis Pakai)',
    icon: '🧹',
    type: 'out',
    subcategories: [
      {
        id: 'tempat_pakan_minum',
        name: 'Tempat Pakan / Minum',
        icon: '🥣',
        type: 'out',
        defaultUnit: 'buah',
        debitAccount: COA.BEBAN_PERLENGKAPAN,
        creditAccount: COA.KAS,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
      {
        id: 'alat_kebersihan',
        name: 'Alat Kebersihan & Sanitasi',
        icon: '🧹',
        type: 'out',
        defaultUnit: 'buah',
        debitAccount: COA.BEBAN_SANITASI,
        creditAccount: COA.KAS,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
      {
        id: 'perlengkapan_lain',
        name: 'Perlengkapan Lain',
        icon: '🪣',
        type: 'out',
        defaultUnit: 'item',
        needKeterangan: true,
        debitAccount: COA.BEBAN_PERLENGKAPAN_LAIN,
        creditAccount: COA.KAS,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
    ],
  },
  {
    id: 'persediaan',
    name: 'Persediaan',
    icon: '🌾',
    type: 'out',
    subcategories: [
      {
        id: 'pakan',
        name: 'Pakan Ayam',
        icon: '🌾',
        type: 'out',
        defaultUnit: 'karung',
        debitAccount: COA.BEBAN_PAKAN,
        creditAccount: COA.KAS,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
      {
        id: 'obat_vaksin',
        name: 'Obat & Vaksin',
        icon: '💉',
        type: 'out',
        defaultUnit: 'botol',
        debitAccount: COA.BEBAN_OBAT,
        creditAccount: COA.KAS,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
      {
        id: 'ayam',
        name: 'Bibit / Pembelian Ayam',
        icon: '🐣',
        type: 'out',
        defaultUnit: 'ekor',
        debitAccount: COA.PERSEDIAAN_AYAM,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'investasi', neraca: 'aset_ayam' },
      },
      {
        id: 'telur',
        name: 'Pembelian / Retur Telur',
        icon: '🥚',
        type: 'out',
        defaultUnit: 'rak',
        isEgg: true,
        debitAccount: COA.PERSEDIAAN_TELUR,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'operasi', neraca: 'aset_telur' },
      },
    ],
  },
  {
    id: 'utang',
    name: 'Utang',
    icon: '💳',
    type: 'both', // Bisa Kas Masuk (Pencairan) atau Kas Keluar (Pembayaran)
    subcategories: [
      {
        id: 'pencairan_utang_bank',
        name: 'Pencairan Utang Bank / Pinjaman',
        icon: '🏦',
        type: 'in',
        defaultUnit: 'transaksi',
        debitAccount: COA.KAS,
        creditAccount: COA.UTANG_BANK,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'utang_bank_tambah' },
      },
      {
        id: 'utang_usaha',
        name: 'Utang Usaha (Pinjaman Kas/Pakan)',
        icon: '🤝',
        type: 'in',
        defaultUnit: 'transaksi',
        debitAccount: COA.KAS,
        creditAccount: COA.UTANG_USAHA,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'utang_usaha_tambah' },
      },
      {
        id: 'bayar_utang_usaha',
        name: 'Pembayaran Utang Usaha',
        icon: '💳',
        type: 'out',
        defaultUnit: 'transaksi',
        debitAccount: COA.UTANG_USAHA,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'utang_usaha_kurang' },
      },
      {
        id: 'bayar_utang_bank',
        name: 'Pembayaran Utang Bank',
        icon: '🏛️',
        type: 'out',
        defaultUnit: 'transaksi',
        debitAccount: COA.UTANG_BANK,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'utang_bank_kurang' },
      },
      {
        id: 'utang_lain',
        name: 'Utang Lainnya',
        icon: '📑',
        type: 'in',
        defaultUnit: 'transaksi',
        needKeterangan: true,
        debitAccount: COA.KAS,
        creditAccount: COA.UTANG_LAIN,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'utang_lain_tambah' },
      },
    ],
  },
  {
    id: 'kas',
    name: 'Kas',
    icon: '💵',
    type: 'both',
    subcategories: [
      {
        id: 'setor_kas',
        name: 'Setoran Kas Awal',
        icon: '💵',
        type: 'in',
        defaultUnit: 'transaksi',
        debitAccount: COA.KAS,
        creditAccount: COA.MODAL_AWAL,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'modal_awal' },
      },
      {
        id: 'tambah_kas',
        name: 'Tambahan Kas',
        icon: '📥',
        type: 'in',
        defaultUnit: 'transaksi',
        debitAccount: COA.KAS,
        creditAccount: COA.TAMBAHAN_MODAL,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'tambahan_modal' },
      },
      {
        id: 'tarik_kas',
        name: 'Pengambilan Kas (Prive)',
        icon: '📤',
        type: 'out',
        defaultUnit: 'transaksi',
        debitAccount: COA.PRIVE,
        creditAccount: COA.KAS,
        report: { labaRugi: false, arusKas: 'pendanaan', neraca: 'prive' },
      },
    ],
  },
  {
    id: 'lainnya',
    name: 'Lainnya',
    icon: '✨',
    type: 'both',
    subcategories: [
      {
        id: 'pemasukan_lain',
        name: 'Pemasukan Lain-lain',
        icon: '➕',
        type: 'in',
        defaultUnit: 'transaksi',
        needKeterangan: true,
        debitAccount: COA.KAS,
        creditAccount: COA.PENDAPATAN_LAIN,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
      {
        id: 'pengeluaran_lain',
        name: 'Pengeluaran Lain-lain',
        icon: '➖',
        type: 'out',
        defaultUnit: 'transaksi',
        needKeterangan: true,
        debitAccount: COA.BEBAN_LAIN,
        creditAccount: COA.KAS,
        report: { labaRugi: true, arusKas: 'operasi', neraca: 'laba' },
      },
    ],
  },
];

/**
 * Pilihan Satuan yang Tersedia
 */
export const AVAILABLE_UNITS = [
  { value: 'rak', label: 'Rak' },
  { value: 'butir', label: 'Butir' },
  { value: 'ekor', label: 'Ekor' },
  { value: 'karung', label: 'Karung' },
  { value: 'kg', label: 'Kg' },
  { value: 'botol', label: 'Botol' },
  { value: 'unit', label: 'Unit' },
  { value: 'buah', label: 'Buah' },
  { value: 'paket', label: 'Paket' },
  { value: 'transaksi', label: 'Transaksi' },
];

/**
 * Ambil kategori berdasarkan ID
 */
export function getCategoryById(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId) || null;
}

/**
 * Ambil sub-kategori berdasarkan categoryId dan subcategoryId
 */
export function getSubcategory(categoryId, subcategoryId) {
  const cat = getCategoryById(categoryId);
  if (!cat) return null;
  return cat.subcategories.find(s => s.id === subcategoryId) || null;
}

/**
 * Temukan kategori dan subkategori dari identifier apa pun
 */
export function findCategoryAndSub(catIdOrSubId, subId) {
  if (subId) {
    const sub = getSubcategory(catIdOrSubId, subId);
    if (sub) return { category: getCategoryById(catIdOrSubId), subcategory: sub };
  }
  for (const cat of CATEGORIES) {
    if (cat.id === catIdOrSubId) {
      return { category: cat, subcategory: cat.subcategories[0] };
    }
    const foundSub = cat.subcategories.find(s => s.id === catIdOrSubId);
    if (foundSub) {
      return { category: cat, subcategory: foundSub };
    }
  }
  return null;
}

/**
 * Mengetahui apakah suatu transaksi bernilai Pemasukan Kas (Kas Masuk)
 * @param {string|object} txOrJenis
 * @param {string} [subKategori]
 * @returns {boolean}
 */
export function isIncome(txOrJenis, subKategori) {
  if (typeof txOrJenis === 'object' && txOrJenis !== null) {
    const { kategori, subKategori: sub, jenis } = txOrJenis;
    if (kategori && sub) {
      const s = getSubcategory(kategori, sub);
      if (s) return s.type === 'in';
    }
    if (jenis) {
      if (jenis === 'penjualan_telur' || jenis === 'penjualan_lain' || jenis === 'pemasukan_lain') return true;
      if (jenis === 'pembelian_pakan' || jenis === 'biaya_lain' || jenis === 'pengeluaran_lain') return false;
      const match = findCategoryAndSub(jenis);
      if (match?.subcategory) return match.subcategory.type === 'in';
    }
    return false;
  }

  const str = String(txOrJenis);
  if (str === 'penjualan_telur' || str === 'penjualan_lain' || str === 'pemasukan_lain') return true;
  if (str === 'pembelian_pakan' || str === 'biaya_lain' || str === 'pengeluaran_lain') return false;
  const match = findCategoryAndSub(str, subKategori);
  return match?.subcategory?.type === 'in';
}

/**
 * Memetakan transaksi lama (legacy jenis) ke struktur bertingkat baru
 * Menjamin kompatibilitas data historis 100%.
 */
export function normalizeTransaction(tx) {
  if (!tx) return tx;
  const copy = { ...tx };

  if (!copy.kategori || !copy.subKategori) {
    switch (copy.jenis) {
      case 'penjualan_telur':
        copy.kategori = 'penjualan';
        copy.subKategori = 'penjualan_telur';
        copy.satuan = copy.satuan || 'rak';
        break;
      case 'penjualan_lain':
        copy.kategori = 'penjualan';
        copy.subKategori = 'penjualan_lain';
        copy.satuan = copy.satuan || 'item';
        break;
      case 'pembelian_pakan':
        copy.kategori = 'persediaan';
        copy.subKategori = 'pakan';
        copy.satuan = copy.satuan || 'karung';
        break;
      case 'biaya_lain':
        copy.kategori = 'lainnya';
        copy.subKategori = 'pengeluaran_lain';
        copy.satuan = copy.satuan || 'transaksi';
        break;
      default:
        // Coba cocokkan jika jenis adalah salah satu subcategory ID
        const matched = findCategoryAndSub(copy.jenis);
        if (matched) {
          copy.kategori = matched.category.id;
          copy.subKategori = matched.subcategory.id;
        } else {
          // Fallback umum
          const inFlow = isIncome(copy.jenis);
          copy.kategori = 'lainnya';
          copy.subKategori = inFlow ? 'pemasukan_lain' : 'pengeluaran_lain';
        }
    }
  }

  // Lengkapi kuantitas dan harga satuan jika belum ada
  if (copy.kuantitas == null) {
    if (copy.jumlahRak != null && copy.jumlahRak > 0) {
      copy.kuantitas = copy.jumlahRak;
      copy.satuan = 'rak';
    } else if (copy.jumlahButir != null && copy.jumlahButir > 0) {
      copy.kuantitas = copy.jumlahButir;
      copy.satuan = 'butir';
    } else {
      copy.kuantitas = 1;
    }
  }

  if (copy.hargaSatuan == null) {
    copy.hargaSatuan = copy.kuantitas > 0 ? Math.round(copy.nominal / copy.kuantitas) : copy.nominal;
  }

  // Pertahankan field legacy jenis agar kode lama tetap aman
  if (!copy.jenis) {
    copy.jenis = copy.subKategori;
  }

  return copy;
}

/**
 * Objek Konfigurasi Placeholder Keterangan Transaksi Dinamis
 * Disesuaikan secara realistis untuk konteks operasional ternak ayam & telur BUMDes Torei Natei
 */
export const TRANSACTION_PLACEHOLDERS = {
  penjualan: {
    penjualan_telur: 'Contoh: Penjualan ke Warung Bu Yanti',
    penjualan_ayam:  'Contoh: Penjualan 15 ekor ayam afkir',
    penjualan_lain:  'Contoh: Penjualan pupuk kotoran ayam / karung bekas',
  },
  modal: {
    modal_awal:      'Contoh: Penyertaan modal dari desa',
    tambahan_modal:  'Contoh: Tambahan modal usaha dari pengurus',
    penyertaan_desa: 'Contoh: Penyertaan modal APBDes Tahap II',
    modal_lain:      'Contoh: Hibah peralatan / dana bantuan',
  },
  peralatan: {
    peralatan_kandang: 'Contoh: Rak baterai dan lampu kandang',
    mesin_produksi:    'Contoh: Mesin pencampur pakan / alat grading telur',
    kendaraan:         'Contoh: Motor gerobak roda tiga untuk operasional',
    peralatan_lain:    'Contoh: Terpal penutup kandang dan timbangan digital',
  },
  perlengkapan: {
    tempat_pakan_minum: 'Contoh: Tempat pakan gantung dan nipple drinker',
    alat_kebersihan:    'Contoh: Sapu, sikat, dan desinfektan kandang',
    perlengkapan_lain:  'Contoh: Sarung tangan, ember, dan sekop',
  },
  persediaan: {
    pakan:       'Contoh: Konsentrat 5 karung dari Toko Tani Jaya',
    obat_vaksin: 'Contoh: Vaksin ND dan vitamin ayam',
    ayam:        'Contoh: Pembelian bibit pullet 200 ekor',
    telur:       'Contoh: Pembelian stok telur tambahan',
  },
  utang: {
    pencairan_utang_bank: 'Contoh: Pencairan kredit modal kerja Bank Papua',
    utang_usaha:          'Contoh: Utang pakan ke Toko Tani Jaya',
    bayar_utang_usaha:    'Contoh: Pembayaran utang pakan Toko Tani Jaya',
    bayar_utang_bank:     'Contoh: Pembayaran cicilan pokok pinjaman bank',
    utang_lain:           'Contoh: Pinjaman dana talangan operasional',
  },
  kas: {
    setor_kas:  'Contoh: Setoran kas awal bulan',
    tambah_kas: 'Contoh: Penyetoran dana tunai ke kas bendahara',
    tarik_kas:  'Contoh: Pengambilan prive pengurus / kas kecil',
  },
  lainnya: {
    pemasukan_lain:   'Contoh: Pendapatan bunga bank / jasa giro',
    pengeluaran_lain: 'Contoh: Biaya konsumsi rapat dan transportasi',
  },
};

export const DEFAULT_KETERANGAN_PLACEHOLDER = 'Contoh: Keterangan transaksi operasional';

/**
 * Dapatkan placeholder dinamis untuk kolom nama/keterangan transaksi
 * @param {string} categoryId
 * @param {string} subcategoryId
 * @returns {string}
 */
export function getKeteranganPlaceholder(categoryId, subcategoryId) {
  if (categoryId && subcategoryId && TRANSACTION_PLACEHOLDERS[categoryId]?.[subcategoryId]) {
    return TRANSACTION_PLACEHOLDERS[categoryId][subcategoryId];
  }
  if (subcategoryId) {
    for (const catKey in TRANSACTION_PLACEHOLDERS) {
      if (TRANSACTION_PLACEHOLDERS[catKey][subcategoryId]) {
        return TRANSACTION_PLACEHOLDERS[catKey][subcategoryId];
      }
    }
  }
  return DEFAULT_KETERANGAN_PLACEHOLDER;
}

