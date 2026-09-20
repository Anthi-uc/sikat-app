// calculator.js — CalculationEngine: semua logika kalkulasi bisnis & akuntansi SIKAT

import {
  COA,
  CATEGORIES,
  getSubcategory,
  findCategoryAndSub,
  isIncome,
  normalizeTransaction,
} from './categories.js';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Normalizes a Date object or 'YYYY-MM-DD' string to a 'YYYY-MM-DD' string.
 * @param {Date|string} dateOrStr
 * @returns {string}
 */
function toDateStr(dateOrStr) {
  if (typeof dateOrStr === 'string') {
    // Already a string — return as-is (assume YYYY-MM-DD format)
    return dateOrStr;
  }
  // Date object — format manually to avoid timezone issues
  const y = dateOrStr.getFullYear();
  const m = String(dateOrStr.getMonth() + 1).padStart(2, '0');
  const d = String(dateOrStr.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's date as a 'YYYY-MM-DD' string (local time).
 * @returns {string}
 */
function todayStr() {
  return toDateStr(new Date());
}

/**
 * Returns a 'YYYY-MM-DD' string for a date offset by `deltaDays` from today.
 * Negative values go into the past.
 * @param {number} deltaDays
 * @returns {string}
 */
function offsetDayStr(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return toDateStr(d);
}

/**
 * Given a 'YYYY-MM-DD' string, returns 'DD/MM'.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDDMM(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
}

/**
 * Returns the ISO week number (Monday = first day) for a 'YYYY-MM-DD' string.
 * Returns a key in the form 'YYYY-Www' to uniquely identify a week.
 * @param {string} dateStr
 * @returns {string}
 */
function isoWeekKey(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  // ISO week: Thursday of the current week's year determines the year
  const jan4 = new Date(date.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));

  // Monday of the week containing `date`
  const dayOfWeek = (date.getDay() + 6) % 7; // 0=Mon, 6=Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);

  const diff = monday - startOfWeek1;
  const weekNo = Math.round(diff / (7 * 24 * 60 * 60 * 1000)) + 1;

  // Determine ISO year (the year of the Thursday of this week)
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the Monday 'YYYY-MM-DD' string for the week containing `dateStr`.
 * @param {string} dateStr
 * @returns {string}
 */
function getMondayOfWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = (date.getDay() + 6) % 7; // 0=Mon, 6=Sun
  const monday = new Date(date);
  monday.setDate(date.getDate() - dayOfWeek);
  return toDateStr(monday);
}

/**
 * Returns the Sunday 'YYYY-MM-DD' string for the week containing `dateStr`.
 * @param {string} dateStr
 * @returns {string}
 */
function getSundayOfWeek(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = (date.getDay() + 6) % 7; // 0=Mon, 6=Sun
  const sunday = new Date(date);
  sunday.setDate(date.getDate() + (6 - dayOfWeek));
  return toDateStr(sunday);
}

export const CalculationEngine = {

  /**
   * Hitung saldo kas dari semua transaksi.
   * saldo = sum(penjualan_telur) - sum(pembelian_pakan) - sum(biaya_lain)
   * @param {Array} transactions
   * @returns {number}
   */
  getSaldoKas(transactions) {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.reduce((acc, t) => {
      if (t.jenis === 'penjualan_telur') return acc + t.nominal;
      if (t.jenis === 'pembelian_pakan') return acc - t.nominal;
      if (t.jenis === 'biaya_lain') return acc - t.nominal;
      return acc;
    }, 0);
  },

  /**
   * Hitung laporan periode: filter transaksi dalam rentang [start, end].
   * @param {Array} transactions
   * @param {Date|string} start - inclusive
   * @param {Date|string} end   - inclusive
   * @returns {{ totalPenjualan: number, totalPakan: number, totalBiayaLain: number, untungBersih: number }}
   */
  getLaporanPeriode(transactions, start, end) {
    const empty = { totalPenjualan: 0, totalPakan: 0, totalBiayaLain: 0, untungBersih: 0 };
    if (!transactions || transactions.length === 0) return empty;

    const startStr = toDateStr(start);
    const endStr = toDateStr(end);

    const filtered = transactions.filter(
      (t) => t.tanggal >= startStr && t.tanggal <= endStr,
    );

    if (filtered.length === 0) return empty;

    let totalPenjualan = 0;
    let totalPakan = 0;
    let totalBiayaLain = 0;

    for (const t of filtered) {
      if (t.jenis === 'penjualan_telur') totalPenjualan += t.nominal;
      else if (t.jenis === 'pembelian_pakan') totalPakan += t.nominal;
      else if (t.jenis === 'biaya_lain') totalBiayaLain += t.nominal;
    }

    const untungBersih = totalPenjualan - totalPakan - totalBiayaLain;
    return { totalPenjualan, totalPakan, totalBiayaLain, untungBersih };
  },

  /**
   * Hitung margin keuntungan (persen, 2 desimal).
   * Mencegah pembagian dengan nol — return 0 jika totalPenjualan === 0.
   * @param {number} untungBersih
   * @param {number} totalPenjualan
   * @returns {number}
   */
  getMarginKeuntungan(untungBersih, totalPenjualan) {
    if (totalPenjualan === 0) return 0;
    return Math.round((untungBersih / totalPenjualan) * 100 * 100) / 100;
  },

  /**
   * Konversi Rak ke Butir: rak * 30.
   * @param {number} rak
   * @returns {number}
   */
  rakToButir(rak) {
    return rak * 30;
  },

  /**
   * Hitung total produksi pada tanggal tertentu (butir = jumlahRak * 30).
   * @param {Array} productions
   * @param {Date|string} tanggal
   * @returns {number}
   */
  getProduksiHariIni(productions, tanggal) {
    if (!productions || productions.length === 0) return 0;
    const targetStr = toDateStr(tanggal);
    const totalRak = productions
      .filter((p) => p.tanggal === targetStr)
      .reduce((acc, p) => acc + p.jumlahRak, 0);
    return totalRak * 30;
  },

  /**
   * Hitung rata-rata produksi harian (dalam Rak) untuk N hari kalender terakhir.
   * Selalu bagi dengan N, bukan dengan jumlah entri yang ada.
   * @param {Array} productions
   * @param {number} hariTerakhir
   * @returns {number}
   */
  getRataRataProduksi(productions, hariTerakhir) {
    if (!productions || productions.length === 0) return 0;

    // Build set of date strings for the last `hariTerakhir` days (including today)
    const windowDates = new Set();
    for (let i = 0; i < hariTerakhir; i++) {
      windowDates.add(offsetDayStr(-i));
    }

    const totalRak = productions
      .filter((p) => windowDates.has(p.tanggal))
      .reduce((acc, p) => acc + p.jumlahRak, 0);

    return Math.round((totalRak / hariTerakhir) * 100) / 100;
  },

  /**
   * Ambil data per hari untuk N hari kalender terakhir (hari ini = last).
   * Selalu mengembalikan tepat N titik data, hari tanpa data = value 0.
   * @param {Array} productions
   * @param {number} hariTerakhir
   * @returns {{ label: string, value: number, tanggal: string }[]}
   */
  getDataGrafikProduksi(productions, hariTerakhir) {
    // Build lookup map: tanggal → total jumlahRak
    const rakByDate = {};
    if (productions && productions.length > 0) {
      for (const p of productions) {
        rakByDate[p.tanggal] = (rakByDate[p.tanggal] ?? 0) + p.jumlahRak;
      }
    }

    const result = [];
    // oldest first → index 0 = (hariTerakhir-1) days ago, last = today
    for (let i = hariTerakhir - 1; i >= 0; i--) {
      const dateStr = offsetDayStr(-i);
      result.push({
        label: formatDDMM(dateStr),
        tanggal: dateStr,
        value: rakByDate[dateStr] ?? 0,
      });
    }
    return result;
  },

  /**
   * Ambil data produksi harian untuk setiap hari dalam bulan tertentu.
   * Selalu mengembalikan tepat N titik data (N = jumlah hari dalam bulan),
   * hari tanpa data = value 0.
   * @param {Array} productions
   * @param {number} year
   * @param {number} month   0-indexed (0=Januari, 11=Desember)
   * @returns {{ label: string, value: number, tanggal: string }[]}
   */
  getDataGrafikProduksiBulanan(productions, year, month) {
    // Build lookup: tanggal → jumlahRak
    const rakByDate = {};
    if (productions && productions.length > 0) {
      for (const p of productions) {
        rakByDate[p.tanggal] = (rakByDate[p.tanggal] ?? 0) + p.jumlahRak;
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const mm      = String(month + 1).padStart(2, '0');
      const dd      = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      result.push({
        label:   `${dd}/${mm}`,
        tanggal: dateStr,
        value:   rakByDate[dateStr] ?? 0,
      });
    }
    return result;
  },

  /**
   * Ambil data per minggu (ISO week) untuk maxMinggu minggu terakhir yang punya data.
   * Hanya minggu yang memiliki setidaknya satu transaksi yang dimasukkan.
   * @param {Array} transactions
   * @param {number} maxMinggu
   * @returns {{ label: string, penjualan: number, biayaPakan: number }[]}
   */
  getDataGrafikMingguan(transactions, maxMinggu) {
    if (!transactions || transactions.length === 0) return [];

    // Accumulate by ISO week key
    const weekMap = {};
    for (const t of transactions) {
      const wk = isoWeekKey(t.tanggal);
      if (!weekMap[wk]) {
        weekMap[wk] = { penjualan: 0, biayaPakan: 0, mondayStr: getMondayOfWeek(t.tanggal) };
      }
      if (t.jenis === 'penjualan_telur') weekMap[wk].penjualan += t.nominal;
      else if (t.jenis === 'pembelian_pakan') weekMap[wk].biayaPakan += t.nominal;
    }

    // Sort weeks chronologically and take the most recent maxMinggu
    const sortedKeys = Object.keys(weekMap).sort();
    const recentKeys = sortedKeys.slice(-maxMinggu);

    return recentKeys.map((wk) => {
      const { penjualan, biayaPakan, mondayStr } = weekMap[wk];
      const sundayStr = getSundayOfWeek(mondayStr);
      const label = `${formatDDMM(mondayStr)} - ${formatDDMM(sundayStr)}`;
      return { label, penjualan, biayaPakan };
    });
  },

  /**
   * Dapatkan batas minggu berjalan: Senin (start) dan Minggu (end) dalam waktu lokal.
   * @returns {{ start: Date, end: Date }}
   */
  getBatasMingguBerjalan() {
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // 0=Mon, 6=Sun

    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - dayOfWeek), 23, 59, 59);

    return { start: monday, end: sunday };
  },

  /**
   * Format tanggal ke format header Indonesia: 'NamaHari, DD NamaBulan YYYY'.
   * Contoh: 'Kamis, 10 September 2026'
   * @param {Date} date
   * @returns {string}
   */
  formatTanggalHeader(date) {
    const namaHari = HARI[date.getDay()];
    const dd = String(date.getDate()).padStart(2, '0');
    const namaBulan = BULAN[date.getMonth()];
    const yyyy = date.getFullYear();
    return `${namaHari}, ${dd} ${namaBulan} ${yyyy}`;
  },

  /**
   * Hasilkan entri jurnal debit dan kredit untuk suatu transaksi
   * @param {object} rawTx
   * @returns {{ tanggal: string, keterangan: string, nominal: number, debit: { code: string, name: string, amount: number }, credit: { code: string, name: string, amount: number }, debitAccount: object, creditAccount: object }}
   */
  getJournalEntry(rawTx) {
    const tx = normalizeTransaction(rawTx);
    const sub = getSubcategory(tx.kategori, tx.subKategori) || findCategoryAndSub(tx.jenis)?.subcategory;
    const amount = Number(tx.nominal) || 0;

    const debitAcc = sub?.debitAccount || COA.KAS;
    const creditAcc = sub?.creditAccount || COA.PENDAPATAN_LAIN;

    return {
      tanggal: tx.tanggal,
      keterangan: tx.keterangan || sub?.name || tx.jenis || 'Transaksi',
      nominal: amount,
      debitAccount: debitAcc,
      creditAccount: creditAcc,
      debit: {
        code: debitAcc.code,
        name: debitAcc.name,
        amount,
      },
      credit: {
        code: creditAcc.code,
        name: creditAcc.name,
        amount,
      },
    };
  },

  /**
   * Hitung Laba Rugi komprehensif untuk bulan tertentu
   * @param {Array} transactions
   * @param {number} year
   * @param {number} month  0-indexed
   */
  calculateLabaRugi(transactions, year, month) {
    const pfx = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthTxs = (transactions || [])
      .filter(t => t.tanggal && t.tanggal.startsWith(pfx))
      .map(normalizeTransaction);

    // Detail pos pendapatan
    let pendapatanTelur = 0;
    let pendapatanAyam = 0;
    let pendapatanLain = 0;

    // Detail pos beban
    let bebanPakan = 0;
    let bebanObat = 0;
    let bebanPerlengkapan = 0;
    let bebanSanitasi = 0;
    let bebanLain = 0;

    for (const tx of monthTxs) {
      const sub = getSubcategory(tx.kategori, tx.subKategori);
      const creditCode = sub?.creditAccount?.code;
      const debitCode = sub?.debitAccount?.code;

      if (creditCode && creditCode.startsWith('4-')) {
        if (creditCode === COA.PENDAPATAN_TELUR.code) pendapatanTelur += tx.nominal;
        else if (creditCode === COA.PENDAPATAN_AYAM.code) pendapatanAyam += tx.nominal;
        else pendapatanLain += tx.nominal;
      } else if (debitCode && debitCode.startsWith('5-')) {
        if (debitCode === COA.BEBAN_PAKAN.code) bebanPakan += tx.nominal;
        else if (debitCode === COA.BEBAN_OBAT.code) bebanObat += tx.nominal;
        else if (debitCode === COA.BEBAN_SANITASI?.code) bebanSanitasi += tx.nominal;
        else if (debitCode.startsWith('5-20')) bebanPerlengkapan += tx.nominal;
        else bebanLain += tx.nominal;
      } else {
        // Fallback untuk data legacy
        if (tx.jenis === 'penjualan_telur') pendapatanTelur += tx.nominal;
        else if (tx.jenis === 'penjualan_lain') pendapatanLain += tx.nominal;
        else if (tx.jenis === 'pembelian_pakan') bebanPakan += tx.nominal;
        else if (tx.jenis === 'biaya_lain') bebanLain += tx.nominal;
      }
    }

    const totalPendapatan = pendapatanTelur + pendapatanAyam + pendapatanLain;
    const totalBeban = bebanPakan + bebanObat + bebanPerlengkapan + bebanSanitasi + bebanLain;
    const labaBersih = totalPendapatan - totalBeban;
    const margin = totalPendapatan > 0 ? Math.round((labaBersih / totalPendapatan) * 100 * 100) / 100 : 0;

    return {
      pendapatan: {
        penjualanTelur: pendapatanTelur,
        penjualanAyam: pendapatanAyam,
        penjualanLain: pendapatanLain,
        totalPendapatan,
      },
      beban: {
        bebanPakan,
        bebanObat,
        bebanPerlengkapan,
        bebanSanitasi,
        bebanLain,
        totalBeban,
      },
      totalPendapatan,
      totalBeban,
      labaBersih,
      marginKeuntungan: margin,
      margin,
      // Flat aliases for backwards compatibility
      pendapatanTelur,
      pendapatanAyam,
      pendapatanLain,
      bebanPakan,
      bebanObat,
      bebanPerlengkapan,
      bebanSanitasi,
      bebanLain,
    };
  },

  /**
   * Hitung Arus Kas periode bulanan
   */
  calculateArusKas(transactions, year, month, saldoAwal = 0) {
    const pfx = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthTxs = (transactions || [])
      .filter(t => t.tanggal && t.tanggal.startsWith(pfx))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal) || (a.createdAt || '').localeCompare(b.createdAt || ''))
      .map(normalizeTransaction);

    let opMasuk = 0;
    let opKeluar = 0;
    let invMasuk = 0;
    let invKeluar = 0;
    let finMasuk = 0;
    let finKeluar = 0;

    let totalKasMasuk = 0;
    let totalKasKeluar = 0;
    let runningSaldo = saldoAwal;

    const rows = monthTxs.map((tx, idx) => {
      const masuk = isIncome(tx);
      const inc = masuk ? tx.nominal : 0;
      const exp = masuk ? 0 : tx.nominal;

      totalKasMasuk += inc;
      totalKasKeluar += exp;
      runningSaldo += (inc - exp);

      const sub = getSubcategory(tx.kategori, tx.subKategori);
      const activity = sub?.report?.arusKas || 'operasi';

      if (activity === 'investasi') {
        invMasuk += inc;
        invKeluar += exp;
      } else if (activity === 'pendanaan') {
        finMasuk += inc;
        finKeluar += exp;
      } else {
        opMasuk += inc;
        opKeluar += exp;
      }

      return {
        no: idx + 1,
        id: tx.id,
        tanggal: tx.tanggal,
        keterangan: tx.keterangan || sub?.name || tx.jenis,
        lokasi: tx.lokasi || '-',
        kasMasuk: inc,
        kasKeluar: exp,
        saldo: runningSaldo,
        kategori: tx.kategori,
        subKategori: tx.subKategori,
        activity,
      };
    });

    const netArusKas = totalKasMasuk - totalKasKeluar;

    return {
      saldoAwal,
      totalKasMasuk,
      totalKasKeluar,
      totalMasuk: totalKasMasuk,
      totalKeluar: totalKasKeluar,
      netArusKas,
      kenaikanBersih: netArusKas,
      saldoAkhir: runningSaldo,
      arusOperasi: { masuk: opMasuk, keluar: opKeluar, bersih: opMasuk - opKeluar },
      arusInvestasi: { masuk: invMasuk, keluar: invKeluar, bersih: invMasuk - invKeluar },
      arusPendanaan: { masuk: finMasuk, keluar: finKeluar, bersih: finMasuk - finKeluar },
      rows,
      transactions: rows.map(r => ({
        date: r.tanggal,
        description: r.keterangan,
        stream: r.activity,
        location: r.lokasi,
        masuk: r.kasMasuk,
        keluar: r.kasKeluar,
        runningSaldo: r.saldo,
      })),
    };
  },

  /**
   * Hitung Posisi Neraca (Posisi Keuangan) per akhir bulan/tanggal
   */
  calculateNeraca(transactions, productions, settings, upToDateStr) {
    const txsUpTo = (transactions || [])
      .filter(t => !upToDateStr || t.tanggal <= upToDateStr)
      .map(normalizeTransaction);

    let kas = 0;
    let peralatan = 0;
    let persediaanAyam = 0;
    let utangUsaha = 0;
    let utangBank = 0;
    let utangLain = 0;
    let modalAwal = 0;
    let tambahanModal = 0;
    let penyertaanDesa = 0;
    let modalLain = 0;
    let prive = 0;
    let totalPendapatanKumulatif = 0;
    let totalBebanKumulatif = 0;

    for (const tx of txsUpTo) {
      const masuk = isIncome(tx);
      kas += masuk ? tx.nominal : -tx.nominal;

      const sub = getSubcategory(tx.kategori, tx.subKategori);
      const debitCode = sub?.debitAccount?.code;
      const creditCode = sub?.creditAccount?.code;

      // Peralatan (Aset Tetap)
      if (debitCode && debitCode.startsWith('1-20')) peralatan += tx.nominal;
      // Persediaan Ayam
      if (debitCode === COA.PERSEDIAAN_AYAM.code) persediaanAyam += tx.nominal;

      // Utang
      if (creditCode === COA.UTANG_USAHA.code) utangUsaha += tx.nominal;
      if (creditCode === COA.UTANG_BANK.code) utangBank += tx.nominal;
      if (creditCode === COA.UTANG_LAIN.code) utangLain += tx.nominal;
      // Pembayaran Utang
      if (debitCode === COA.UTANG_USAHA.code) utangUsaha -= tx.nominal;
      if (debitCode === COA.UTANG_BANK.code) utangBank -= tx.nominal;

      // Modal & Ekuitas
      if (creditCode === COA.MODAL_AWAL.code) modalAwal += tx.nominal;
      if (creditCode === COA.TAMBAHAN_MODAL.code) tambahanModal += tx.nominal;
      if (creditCode === COA.PENYERTAAN_DESA.code) penyertaanDesa += tx.nominal;
      if (creditCode === COA.MODAL_LAIN.code) modalLain += tx.nominal;
      if (debitCode === COA.PRIVE.code) prive += tx.nominal;

      // Pendapatan & Beban Kumulatif (Saldo Laba)
      if (creditCode && creditCode.startsWith('4-')) totalPendapatanKumulatif += tx.nominal;
      else if (debitCode && debitCode.startsWith('5-')) totalBebanKumulatif += tx.nominal;
      else {
        if (tx.jenis === 'penjualan_telur' || tx.jenis === 'penjualan_lain') totalPendapatanKumulatif += tx.nominal;
        else if (tx.jenis === 'pembelian_pakan' || tx.jenis === 'biaya_lain') totalBebanKumulatif += tx.nominal;
      }
    }

    // Stok Telur
    const isiPerRak = settings?.isiPerRak || 30;
    const hargaJualPerButir = settings?.hargaJualPerButir || 0;

    const prodsUpTo = (productions || []).filter(p => !upToDateStr || p.tanggal <= upToDateStr);
    const totalProdButir = prodsUpTo.reduce((sum, p) => sum + (p.jumlahButir ?? (p.jumlahRak * isiPerRak)), 0);
    const totalJualButir = txsUpTo
      .filter(t => t.jenis === 'penjualan_telur' || t.subKategori === 'penjualan_telur')
      .reduce((sum, t) => sum + (t.jumlahButir ?? (t.jumlahRak != null ? t.jumlahRak * isiPerRak : (t.satuan === 'butir' ? t.kuantitas : t.kuantitas * isiPerRak))), 0);

    const stokButir = Math.max(0, totalProdButir - totalJualButir);
    const nilaiStokTelur = stokButir * hargaJualPerButir;

    const totalAsetLancar = Math.max(0, kas) + nilaiStokTelur + persediaanAyam;
    const totalAsetTetap = peralatan;
    const totalAset = totalAsetLancar + totalAsetTetap;

    const totalKewajiban = Math.max(0, utangUsaha) + Math.max(0, utangBank) + Math.max(0, utangLain);

    const akumulasiLaba = totalPendapatanKumulatif - totalBebanKumulatif;
    const modalDisetor = modalAwal + tambahanModal + penyertaanDesa + modalLain;
    const totalEkuitas = modalDisetor - prive + akumulasiLaba + nilaiStokTelur;
    const totalKewajibanDanEkuitas = totalKewajiban + totalEkuitas;
    const balance = Math.abs(totalAset - totalKewajibanDanEkuitas) < 1;

    return {
      aset: {
        lancar: {
          kas: Math.max(0, kas),
          persediaanTelur: nilaiStokTelur,
          persediaanPakan: 0,
          persediaanObat: 0,
          persediaanAyam,
          totalLancar: totalAsetLancar,
        },
        tetap: {
          peralatanKandang: peralatan,
          mesinProduksi: 0,
          kendaraan: 0,
          peralatanLain: 0,
          totalTetap: totalAsetTetap,
        },
        totalAset,
      },
      kewajiban: {
        utangUsaha: Math.max(0, utangUsaha),
        utangBank: Math.max(0, utangBank),
        utangLain: Math.max(0, utangLain),
        totalKewajiban,
      },
      ekuitas: {
        modalAwal,
        tambahanModal,
        penyertaanDesa,
        modalLain,
        prive,
        akumulasiLaba,
        penyesuaianStok: nilaiStokTelur,
        totalEkuitas,
      },
      totalAset,
      totalKewajiban,
      totalEkuitas,
      totalKewajibanDanEkuitas,
      balance,

      // Flat aliases
      kas: Math.max(0, kas),
      stokButir,
      stokRak: stokButir / isiPerRak,
      nilaiStokTelur,
      persediaanAyam,
      totalAsetLancar,
      peralatan,
      totalAsetTetap,
      utangUsaha: Math.max(0, utangUsaha),
      utangBank: Math.max(0, utangBank),
      utangLain: Math.max(0, utangLain),
      modalAwal,
      tambahanModal,
      penyertaanDesa,
      modalLain,
      modalDisetor,
      prive,
      akumulasiLaba,
    };
  },

  /**
   * Catatan Atas Laporan Keuangan (CALK) naratif terstruktur
   */
  calculateCalk(transactions, productions, settings, year, month) {
    const pfx = `${year}-${String(month + 1).padStart(2, '0')}`;
    const endOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const neraca = this.calculateNeraca(transactions, productions, settings, endOfMonth);
    const labaRugi = this.calculateLabaRugi(transactions, year, month);

    const monthTxs = (transactions || [])
      .filter(t => t.tanggal && t.tanggal.startsWith(pfx))
      .map(normalizeTransaction);

    const notes = [
      {
        title: 'Gambaran Umum Entitas',
        body: 'BUMKam Torei Natei merupakan Badan Usaha Milik Kampung yang berkedudukan di Kampung Yakonde. Unit usaha utama saat ini adalah peternakan ayam petelur yang memproduksi dan memasarkan telur segar untuk kebutuhan masyarakat lokal dan sekitarnya.',
      },
      {
        title: 'Dasar Penyusunan & Kebijakan Akuntansi',
        body: 'Laporan Keuangan disusun berdasarkan prinsip pembukuan sederhana BUMKam berbasis kas yang dimodifikasi. Pendapatan diakui saat kas diterima dan beban diakui saat kas dikeluarkan, dengan pencatatan aset tetap peralatan dan pengakuan nilai persediaan telur.',
      },
      {
        title: 'Rincian Kas dan Aset',
        body: `Posisi kas dan setara kas per akhir periode tercatat sebesar Rp ${Number(neraca.aset.lancar.kas).toLocaleString('id-ID')}. Persediaan telur tercatat sebanyak ${neraca.stokButir.toLocaleString('id-ID')} butir (≈ ${neraca.stokRak.toFixed(1)} rak) dengan nilai estimasi Rp ${Number(neraca.nilaiStokTelur).toLocaleString('id-ID')}. Nilai aset tetap peralatan tercatat Rp ${Number(neraca.aset.tetap.totalTetap).toLocaleString('id-ID')}.`,
      },
      {
        title: 'Analisis Kinerja Operasional & Margin Keuntungan',
        body: `Total pendapatan bulan ini sebesar Rp ${Number(labaRugi.pendapatan.totalPendapatan).toLocaleString('id-ID')} dengan total beban operasional Rp ${Number(labaRugi.beban.totalBeban).toLocaleString('id-ID')}. Laba bersih operasional yang dibukukan sebesar Rp ${Number(labaRugi.labaBersih).toLocaleString('id-ID')} dengan margin keuntungan ${labaRugi.marginKeuntungan.toFixed(2)}%.`,
      },
      {
        title: 'Kewajiban dan Komitmen',
        body: `Total kewajiban tercatat sebesar Rp ${Number(neraca.kewajiban.totalKewajiban).toLocaleString('id-ID')}. Seluruh kewajiban operasional dikelola secara berkala sesuai ketentuan BUMKam.`,
      },
    ];

    notes.neraca = neraca;
    notes.labaRugi = labaRugi;
    notes.monthTxs = monthTxs;
    notes.transaksiMaterial = monthTxs.filter(t => t.nominal >= 500000);

    return notes;
  },
};
