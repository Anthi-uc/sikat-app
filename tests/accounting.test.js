// tests/accounting.test.js — Pengujian Menyeluruh Modul Akuntansi & Kategori SIKAT
import { describe, it, expect } from 'vitest';
import {
  COA,
  CATEGORIES,
  getCategoryById,
  getSubcategory,
  findCategoryAndSub,
  isIncome,
  normalizeTransaction,
  TRANSACTION_PLACEHOLDERS,
  DEFAULT_KETERANGAN_PLACEHOLDER,
  getKeteranganPlaceholder,
} from '../js/categories.js';
import { CalculationEngine } from '../js/calculator.js';
import { Validator } from '../js/validator.js';

describe('Bagan Akun (COA) & Kategori Bertingkat', () => {
  it('1. Memiliki 8 kategori utama', () => {
    expect(CATEGORIES.length).toBe(8);
    const catIds = CATEGORIES.map(c => c.id);
    expect(catIds).toContain('penjualan');
    expect(catIds).toContain('modal');
    expect(catIds).toContain('peralatan');
    expect(catIds).toContain('perlengkapan');
    expect(catIds).toContain('persediaan');
    expect(catIds).toContain('utang');
    expect(catIds).toContain('kas');
    expect(catIds).toContain('lainnya');
  });

  it('2. Setiap sub-kategori memiliki akun debit, kredit, dan konfigurasi laporan yang valid', () => {
    CATEGORIES.forEach(cat => {
      expect(cat.subcategories.length).toBeGreaterThan(0);
      cat.subcategories.forEach(sub => {
        expect(sub.debitAccount).toBeDefined();
        expect(sub.debitAccount.code).toMatch(/^[1-5]-\d{4}$/);
        expect(sub.creditAccount).toBeDefined();
        expect(sub.creditAccount.code).toMatch(/^[1-5]-\d{4}$/);
        expect(sub.report).toBeDefined();
        expect(['operasi', 'investasi', 'pendanaan']).toContain(sub.report.arusKas);
      });
    });
  });

  it('3. getCategoryById dan getSubcategory berfungsi akurat', () => {
    const modalCat = getCategoryById('modal');
    expect(modalCat).toBeDefined();
    expect(modalCat.name).toBe('Modal');

    const sub = getSubcategory('modal', 'modal_awal');
    expect(sub).toBeDefined();
    expect(sub.name).toBe('Setoran Modal Awal');
    expect(sub.report.arusKas).toBe('pendanaan');
    expect(sub.report.labaRugi).toBe(false);
  });

  it('4. isIncome mengidentifikasi kas masuk vs kas keluar dengan tepat', () => {
    expect(isIncome('penjualan', 'penjualan_telur')).toBe(true);
    expect(isIncome({ kategori: 'penjualan', subKategori: 'penjualan_telur' })).toBe(true);
    expect(isIncome({ kategori: 'modal', subKategori: 'modal_awal' })).toBe(true);
    expect(isIncome({ kategori: 'utang', subKategori: 'pencairan_utang_bank' })).toBe(true);

    expect(isIncome({ kategori: 'peralatan', subKategori: 'peralatan_kandang' })).toBe(false);
    expect(isIncome({ kategori: 'persediaan', subKategori: 'pakan' })).toBe(false);
    expect(isIncome({ kategori: 'utang', subKategori: 'bayar_utang_bank' })).toBe(false);
    expect(isIncome({ kategori: 'kas', subKategori: 'tarik_kas' })).toBe(false);
  });
});

describe('Normalisasi Data Transaksi Historis (Legacy)', () => {
  it('1. Menormalisasi penjualan_telur lama', () => {
    const legacy = {
      id: 'tx1',
      jenis: 'penjualan_telur',
      tanggal: '2025-01-15',
      lokasi: 'Pasar Sentani',
      nominal: 300000,
      jumlahRak: 5,
    };
    const norm = normalizeTransaction(legacy);
    expect(norm.kategori).toBe('penjualan');
    expect(norm.subKategori).toBe('penjualan_telur');
    expect(norm.kuantitas).toBe(5);
    expect(norm.satuan).toBe('rak');
    expect(norm.hargaSatuan).toBe(60000);
    expect(norm.jenis).toBe('penjualan_telur');
  });

  it('2. Menormalisasi pembelian_pakan lama', () => {
    const legacy = {
      id: 'tx2',
      jenis: 'pembelian_pakan',
      tanggal: '2025-01-20',
      lokasi: 'Toko Pakan',
      nominal: 750000,
    };
    const norm = normalizeTransaction(legacy);
    expect(norm.kategori).toBe('persediaan');
    expect(norm.subKategori).toBe('pakan');
    expect(norm.kuantitas).toBe(1);
    expect(norm.hargaSatuan).toBe(750000);
  });

  it('3. Menormalisasi biaya_lain lama', () => {
    const legacy = {
      id: 'tx3',
      jenis: 'biaya_lain',
      tanggal: '2025-01-25',
      lokasi: 'Kandang',
      nominal: 50000,
      keterangan: 'Beli paku & bambu',
    };
    const norm = normalizeTransaction(legacy);
    expect(norm.kategori).toBe('lainnya');
    expect(norm.subKategori).toBe('pengeluaran_lain');
    expect(norm.keterangan).toBe('Beli paku & bambu');
  });
});

describe('Jurnal Umum Akuntansi (getJournalEntry)', () => {
  it('1. Penjualan Telur: Debit Kas (1-1000), Credit Pendapatan Telur (4-1000)', () => {
    const tx = {
      kategori: 'penjualan',
      subKategori: 'penjualan_telur',
      nominal: 120000,
      tanggal: '2025-01-10',
    };
    const j = CalculationEngine.getJournalEntry(tx);
    expect(j.debitAccount.code).toBe(COA.KAS.code);
    expect(j.creditAccount.code).toBe(COA.PENDAPATAN_TELUR.code);
    expect(j.nominal).toBe(120000);
  });

  it('2. Pembelian Peralatan Kandang (Aset Tetap): Debit Peralatan (1-2010), Credit Kas (1-1000)', () => {
    const tx = {
      kategori: 'peralatan',
      subKategori: 'peralatan_kandang',
      nominal: 2500000,
      tanggal: '2025-01-12',
    };
    const j = CalculationEngine.getJournalEntry(tx);
    expect(j.debitAccount.code).toBe(COA.PERALATAN_KANDANG.code);
    expect(j.creditAccount.code).toBe(COA.KAS.code);
    expect(j.nominal).toBe(2500000);
  });

  it('3. Setoran Modal Awal: Debit Kas (1-1000), Credit Modal Awal (3-1000)', () => {
    const tx = {
      kategori: 'modal',
      subKategori: 'modal_awal',
      nominal: 10000000,
      tanggal: '2025-01-01',
    };
    const j = CalculationEngine.getJournalEntry(tx);
    expect(j.debitAccount.code).toBe(COA.KAS.code);
    expect(j.creditAccount.code).toBe(COA.MODAL_AWAL.code);
  });

  it('4. Pencairan Utang Bank: Debit Kas (1-1000), Credit Utang Bank (2-2000)', () => {
    const tx = {
      kategori: 'utang',
      subKategori: 'pencairan_utang_bank',
      nominal: 5000000,
      tanggal: '2025-01-05',
    };
    const j = CalculationEngine.getJournalEntry(tx);
    expect(j.debitAccount.code).toBe(COA.KAS.code);
    expect(j.creditAccount.code).toBe(COA.UTANG_BANK.code);
  });
});

describe('Laporan Laba Rugi — Pemisahan Modal, Utang & Aset Tetap', () => {
  it('1. Modal dan Pinjaman Utang TIDAK masuk ke pendapatan Laba Rugi', () => {
    const txs = [
      { id: '1', kategori: 'modal', subKategori: 'modal_awal', nominal: 10000000, tanggal: '2025-02-01' },
      { id: '2', kategori: 'utang', subKategori: 'pencairan_utang_bank', nominal: 5000000, tanggal: '2025-02-02' },
      { id: '3', kategori: 'penjualan', subKategori: 'penjualan_telur', nominal: 2000000, tanggal: '2025-02-05' },
    ];
    const lr = CalculationEngine.calculateLabaRugi(txs, 2025, 1); // Feb (index 1)
    expect(lr.pendapatan.penjualanTelur).toBe(2000000);
    expect(lr.pendapatan.totalPendapatan).toBe(2000000); // Bukan 17.000.000!
  });

  it('2. Pembelian Peralatan (Aset Tetap) TIDAK masuk ke beban operasional Laba Rugi', () => {
    const txs = [
      { id: '1', kategori: 'penjualan', subKategori: 'penjualan_telur', nominal: 2000000, tanggal: '2025-02-05' },
      { id: '2', kategori: 'persediaan', subKategori: 'pakan', nominal: 500000, tanggal: '2025-02-06' },
      { id: '3', kategori: 'peralatan', subKategori: 'peralatan_kandang', nominal: 1000000, tanggal: '2025-02-07' },
    ];
    const lr = CalculationEngine.calculateLabaRugi(txs, 2025, 1);
    expect(lr.beban.bebanPakan).toBe(500000);
    expect(lr.beban.totalBeban).toBe(500000); // 1.000.000 peralatan tetap tidak dihitung beban periode berjalan
    expect(lr.labaBersih).toBe(1500000); // 2.000.000 - 500.000 = 1.500.000
    expect(lr.marginKeuntungan).toBe(75);
  });
});

describe('Laporan Arus Kas — Pemisahan Operasi, Investasi, dan Pendanaan', () => {
  it('1. Mengelompokkan transaksi ke 3 aktivitas arus kas dengan tepat', () => {
    const txs = [
      { id: '1', kategori: 'modal', subKategori: 'modal_awal', nominal: 10000000, tanggal: '2025-03-01' }, // Pendanaan
      { id: '2', kategori: 'peralatan', subKategori: 'mesin_produksi', nominal: 3000000, tanggal: '2025-03-02' }, // Investasi
      { id: '3', kategori: 'penjualan', subKategori: 'penjualan_telur', nominal: 1500000, tanggal: '2025-03-03' }, // Operasi
      { id: '4', kategori: 'persediaan', subKategori: 'pakan', nominal: 500000, tanggal: '2025-03-04' }, // Operasi
    ];
    const ak = CalculationEngine.calculateArusKas(txs, 2025, 2, 0); // Maret (index 2)

    expect(ak.arusPendanaan.masuk).toBe(10000000);
    expect(ak.arusPendanaan.bersih).toBe(10000000);

    expect(ak.arusInvestasi.keluar).toBe(3000000);
    expect(ak.arusInvestasi.bersih).toBe(-3000000);

    expect(ak.arusOperasi.masuk).toBe(1500000);
    expect(ak.arusOperasi.keluar).toBe(500000);
    expect(ak.arusOperasi.bersih).toBe(1000000);

    expect(ak.totalMasuk).toBe(11500000);
    expect(ak.totalKeluar).toBe(3500000);
    expect(ak.kenaikanBersih).toBe(8000000);
    expect(ak.saldoAkhir).toBe(8000000);
  });
});

describe('Laporan Neraca — Keseimbangan Akuntansi (Aset = Kewajiban + Ekuitas)', () => {
  it('1. Neraca selalu seimbang (balance === true) pada berbagai transaksi majemuk', () => {
    const txs = [
      // 1. Setoran Modal Awal Rp 10.000.000
      { id: '1', kategori: 'modal', subKategori: 'modal_awal', nominal: 10000000, tanggal: '2025-01-01' },
      // 2. Utang Bank Rp 5.000.000
      { id: '2', kategori: 'utang', subKategori: 'pencairan_utang_bank', nominal: 5000000, tanggal: '2025-01-02' },
      // 3. Beli Peralatan Kandang (Aset Tetap) Rp 4.000.000
      { id: '3', kategori: 'peralatan', subKategori: 'peralatan_kandang', nominal: 4000000, tanggal: '2025-01-05' },
      // 4. Penjualan Telur Rp 3.000.000 (Laba)
      { id: '4', kategori: 'penjualan', subKategori: 'penjualan_telur', nominal: 3000000, tanggal: '2025-01-10' },
      // 5. Beban Pakan Rp 1.000.000 (Beban)
      { id: '5', kategori: 'persediaan', subKategori: 'pakan', nominal: 1000000, tanggal: '2025-01-12' },
      // 6. Bayar cicilan utang bank Rp 1.000.000
      { id: '6', kategori: 'utang', subKategori: 'bayar_utang_bank', nominal: 1000000, tanggal: '2025-01-20' },
    ];
    const prods = [];
    const settings = { isiPerRak: 30, hargaJualPerButir: 2000 };

    const ne = CalculationEngine.calculateNeraca(txs, prods, settings, '2025-01-31');

    // Kas tersisa: 10.000.000 + 5.000.000 - 4.000.000 + 3.000.000 - 1.000.000 - 1.000.000 = 12.000.000
    expect(ne.aset.lancar.kas).toBe(12000000);
    // Peralatan tetap: 4.000.000
    expect(ne.aset.tetap.totalTetap).toBe(4000000);
    // Total Aset: 12.000.000 + 4.000.000 = 16.000.000
    expect(ne.aset.totalAset).toBe(16000000);

    // Utang tersisa: 5.000.000 - 1.000.000 = 4.000.000
    expect(ne.kewajiban.totalKewajiban).toBe(4000000);

    // Modal: 10.000.000, Laba bersih: 3.000.000 - 1.000.000 = 2.000.000
    // Total Ekuitas = 10.000.000 + 2.000.000 = 12.000.000
    expect(ne.ekuitas.totalEkuitas).toBe(12000000);

    // Total Kewajiban + Ekuitas = 4.000.000 + 12.000.000 = 16.000.000
    expect(ne.totalKewajibanDanEkuitas).toBe(16000000);
    expect(ne.balance).toBe(true);
  });
});

describe('Validasi Transaksi Kategori Bertingkat (Validator)', () => {
  it('1. Menerima transaksi valid dengan kategori dan sub-kategori baru', () => {
    const data = {
      kategori: 'peralatan',
      subKategori: 'peralatan_kandang',
      tanggal: '2025-02-10',
      lokasi: 'Kandang Yakonde',
      kuantitas: 2,
      hargaSatuan: 500000,
      nominal: 1000000,
    };
    const res = Validator.validateTransaksi(data);
    expect(res.isValid).toBe(true);
    expect(Object.keys(res.errors)).toHaveLength(0);
  });

  it('2. Menolak kuantitas non-positif', () => {
    const data = {
      kategori: 'penjualan',
      subKategori: 'penjualan_ayam',
      tanggal: '2025-02-10',
      lokasi: 'Kandang',
      kuantitas: -5,
      nominal: 500000,
    };
    const res = Validator.validateTransaksi(data);
    expect(res.isValid).toBe(false);
    expect(res.errors.kuantitas).toBeDefined();
  });
});

describe('Placeholder Keterangan Transaksi Dinamis', () => {
  it('1. Semua kategori dan sub-kategori memiliki entri placeholder dengan format "Contoh: ..."', () => {
    CATEGORIES.forEach(cat => {
      expect(TRANSACTION_PLACEHOLDERS[cat.id]).toBeDefined();
      cat.subcategories.forEach(sub => {
        const ph = TRANSACTION_PLACEHOLDERS[cat.id][sub.id];
        expect(ph).toBeDefined();
        expect(ph.startsWith('Contoh: ')).toBe(true);
        expect(ph.length).toBeGreaterThan(10);
      });
    });
  });

  it('2. Placeholder spesifik sesuai acuan contoh dari pengguna', () => {
    expect(getKeteranganPlaceholder('penjualan', 'penjualan_telur')).toBe('Contoh: Penjualan ke Warung Bu Yanti');
    expect(getKeteranganPlaceholder('persediaan', 'pakan')).toBe('Contoh: Konsentrat 5 karung dari Toko Tani Jaya');
    expect(getKeteranganPlaceholder('persediaan', 'obat_vaksin')).toBe('Contoh: Vaksin ND dan vitamin ayam');
    expect(getKeteranganPlaceholder('perlengkapan', 'alat_kebersihan')).toBe('Contoh: Sapu, sikat, dan desinfektan kandang');
    expect(getKeteranganPlaceholder('peralatan', 'peralatan_kandang')).toBe('Contoh: Rak baterai dan lampu kandang');
    expect(getKeteranganPlaceholder('modal', 'modal_awal')).toBe('Contoh: Penyertaan modal dari desa');
    expect(getKeteranganPlaceholder('utang', 'utang_usaha')).toBe('Contoh: Utang pakan ke Toko Tani Jaya');
    expect(getKeteranganPlaceholder('kas', 'setor_kas')).toBe('Contoh: Setoran kas awal bulan');
  });

  it('3. Menyediakan placeholder default jika kategori / sub-kategori tidak ditemukan', () => {
    expect(getKeteranganPlaceholder('unknown_cat', 'unknown_sub')).toBe(DEFAULT_KETERANGAN_PLACEHOLDER);
    expect(getKeteranganPlaceholder('', '')).toBe(DEFAULT_KETERANGAN_PLACEHOLDER);
  });
});

describe('Buku Kas — Kaidah Pencatatan Kas Debit (+) dan Kredit (−)', () => {
  it('1. Pemasukan kas dicatat di Debit (+) dan pengeluaran kas dicatat di Kredit (−)', () => {
    const txs = [
      { id: '1', kategori: 'modal', subKategori: 'modal_awal', nominal: 5000000 },
      { id: '2', kategori: 'peralatan', subKategori: 'peralatan_kandang', nominal: 2000000 },
      { id: '3', kategori: 'penjualan', subKategori: 'penjualan_telur', nominal: 1500000 },
      { id: '4', kategori: 'persediaan', subKategori: 'pakan', nominal: 800000 },
    ];

    let saldo = 0;
    const ledger = txs.map(t => {
      const inc = isIncome(t);
      const debit = inc ? t.nominal : 0;   // Kas Masuk (+)
      const kredit = inc ? 0 : t.nominal; // Kas Keluar (−)
      saldo += debit - kredit;
      return { debit, kredit, saldo };
    });

    // 1. Modal awal Rp 5.000.000: Debit 5.000.000, Kredit 0, Saldo 5.000.000
    expect(ledger[0].debit).toBe(5000000);
    expect(ledger[0].kredit).toBe(0);
    expect(ledger[0].saldo).toBe(5000000);

    // 2. Beli peralatan Rp 2.000.000: Debit 0, Kredit 2.000.000, Saldo 3.000.000
    expect(ledger[1].debit).toBe(0);
    expect(ledger[1].kredit).toBe(2000000);
    expect(ledger[1].saldo).toBe(3000000);

    // 3. Penjualan telur Rp 1.500.000: Debit 1.500.000, Kredit 0, Saldo 4.500.000
    expect(ledger[2].debit).toBe(1500000);
    expect(ledger[2].kredit).toBe(0);
    expect(ledger[2].saldo).toBe(4500000);

    // 4. Beli pakan Rp 800.000: Debit 0, Kredit 800.000, Saldo 3.700.000
    expect(ledger[3].debit).toBe(0);
    expect(ledger[3].kredit).toBe(800000);
    expect(ledger[3].saldo).toBe(3700000);
  });
});


