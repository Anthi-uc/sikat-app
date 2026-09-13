// calculator.js — CalculationEngine: semua logika kalkulasi bisnis SIKAT

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
};
