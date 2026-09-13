// calculator.test.js — Unit tests for CalculationEngine
import { describe, it, expect } from 'vitest';
import { CalculationEngine } from '../js/calculator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(jenis, nominal, tanggal = '2026-09-10') {
  return { id: '1', jenis, tanggal, lokasi: 'Test', nominal, createdAt: '2026-09-10T00:00:00Z' };
}

function makeProd(tanggal, jumlahRak) {
  return { id: '1', tanggal, jumlahRak, createdAt: '2026-09-10T00:00:00Z' };
}

// ---------------------------------------------------------------------------
// getSaldoKas
// ---------------------------------------------------------------------------

describe('getSaldoKas', () => {
  it('returns 0 for empty array', () => {
    expect(CalculationEngine.getSaldoKas([])).toBe(0);
  });

  it('returns 0 for null/undefined', () => {
    expect(CalculationEngine.getSaldoKas(null)).toBe(0);
    expect(CalculationEngine.getSaldoKas(undefined)).toBe(0);
  });

  it('computes correct saldo from mixed transactions', () => {
    const txs = [
      makeTx('penjualan_telur', 1_000_000),
      makeTx('pembelian_pakan',   300_000),
      makeTx('biaya_lain',        200_000),
    ];
    // 1_000_000 - 300_000 - 200_000 = 500_000
    expect(CalculationEngine.getSaldoKas(txs)).toBe(500_000);
  });

  it('handles only income transactions', () => {
    const txs = [
      makeTx('penjualan_telur', 400_000),
      makeTx('penjualan_telur', 600_000),
    ];
    expect(CalculationEngine.getSaldoKas(txs)).toBe(1_000_000);
  });

  it('returns negative saldo when expenses exceed income', () => {
    const txs = [
      makeTx('penjualan_telur', 100_000),
      makeTx('pembelian_pakan', 500_000),
    ];
    expect(CalculationEngine.getSaldoKas(txs)).toBe(-400_000);
  });
});

// ---------------------------------------------------------------------------
// getLaporanPeriode
// ---------------------------------------------------------------------------

describe('getLaporanPeriode', () => {
  const txs = [
    makeTx('penjualan_telur', 1_000_000, '2026-09-01'),
    makeTx('pembelian_pakan',   300_000, '2026-09-05'),
    makeTx('biaya_lain',        200_000, '2026-09-10'),
    makeTx('penjualan_telur',   500_000, '2026-09-15'),
    makeTx('pembelian_pakan',   100_000, '2026-09-20'),
  ];

  it('filters correctly by date range (string dates)', () => {
    const result = CalculationEngine.getLaporanPeriode(txs, '2026-09-01', '2026-09-10');
    // Includes: 1_000_000, 300_000, 200_000 — excludes 15th and 20th
    expect(result.totalPenjualan).toBe(1_000_000);
    expect(result.totalPakan).toBe(300_000);
    expect(result.totalBiayaLain).toBe(200_000);
  });

  it('filters correctly by date range (Date objects)', () => {
    const start = new Date('2026-09-01T00:00:00');
    const end   = new Date('2026-09-10T00:00:00');
    const result = CalculationEngine.getLaporanPeriode(txs, start, end);
    expect(result.totalPenjualan).toBe(1_000_000);
  });

  it('computes untungBersih = penjualan - pakan - biayaLain', () => {
    const result = CalculationEngine.getLaporanPeriode(txs, '2026-09-01', '2026-09-20');
    // totalPenjualan = 1_000_000 + 500_000 = 1_500_000
    // totalPakan     = 300_000 + 100_000  =   400_000
    // totalBiayaLain = 200_000
    // untungBersih   = 1_500_000 - 400_000 - 200_000 = 900_000
    expect(result.untungBersih).toBe(900_000);
  });

  it('returns zeros when no transactions in period', () => {
    const result = CalculationEngine.getLaporanPeriode(txs, '2025-01-01', '2025-01-31');
    expect(result).toEqual({ totalPenjualan: 0, totalPakan: 0, totalBiayaLain: 0, untungBersih: 0 });
  });

  it('includes both boundary dates (inclusive)', () => {
    const result = CalculationEngine.getLaporanPeriode(txs, '2026-09-05', '2026-09-15');
    expect(result.totalPenjualan).toBe(500_000); // only the 15th
    expect(result.totalPakan).toBe(300_000);      // only the 5th
    expect(result.totalBiayaLain).toBe(200_000);  // only the 10th
  });
});

// ---------------------------------------------------------------------------
// getMarginKeuntungan
// ---------------------------------------------------------------------------

describe('getMarginKeuntungan', () => {
  it('returns 0 when totalPenjualan is 0 (no division by zero)', () => {
    expect(CalculationEngine.getMarginKeuntungan(500, 0)).toBe(0);
    expect(CalculationEngine.getMarginKeuntungan(0, 0)).toBe(0);
  });

  it('computes 25% margin correctly', () => {
    expect(CalculationEngine.getMarginKeuntungan(500, 2000)).toBe(25);
  });

  it('returns negative margin for a loss', () => {
    expect(CalculationEngine.getMarginKeuntungan(-100, 1000)).toBe(-10);
  });

  it('rounds to 2 decimal places', () => {
    // 1/3 * 100 = 33.333... → 33.33
    expect(CalculationEngine.getMarginKeuntungan(1, 3)).toBe(33.33);
  });
});

// ---------------------------------------------------------------------------
// rakToButir
// ---------------------------------------------------------------------------

describe('rakToButir', () => {
  it('converts 12 rak to 360 butir', () => {
    expect(CalculationEngine.rakToButir(12)).toBe(360);
  });

  it('converts 1 rak to 30 butir', () => {
    expect(CalculationEngine.rakToButir(1)).toBe(30);
  });

  it('converts 0 rak to 0 butir', () => {
    expect(CalculationEngine.rakToButir(0)).toBe(0);
  });

  it('always returns rak * 30 for any integer', () => {
    for (const n of [5, 50, 100, 9999]) {
      expect(CalculationEngine.rakToButir(n)).toBe(n * 30);
    }
  });
});

// ---------------------------------------------------------------------------
// getProduksiHariIni
// ---------------------------------------------------------------------------

describe('getProduksiHariIni', () => {
  it('returns correct butir when date matches', () => {
    const prods = [makeProd('2026-09-10', 10), makeProd('2026-09-10', 5)];
    // (10 + 5) * 30 = 450
    expect(CalculationEngine.getProduksiHariIni(prods, '2026-09-10')).toBe(450);
  });

  it('returns 0 when no production on given date', () => {
    const prods = [makeProd('2026-09-09', 10)];
    expect(CalculationEngine.getProduksiHariIni(prods, '2026-09-10')).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(CalculationEngine.getProduksiHariIni([], '2026-09-10')).toBe(0);
  });

  it('accepts Date object as tanggal', () => {
    const prods = [makeProd('2026-09-10', 8)];
    const date = new Date('2026-09-10T00:00:00');
    expect(CalculationEngine.getProduksiHariIni(prods, date)).toBe(8 * 30);
  });
});

// ---------------------------------------------------------------------------
// getRataRataProduksi
// ---------------------------------------------------------------------------

describe('getRataRataProduksi', () => {
  it('divides by N (hariTerakhir), not by number of entries with data', () => {
    // Today only has data; if we ask for 7 days, should divide by 7
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const prods = [makeProd(todayStr, 70)]; // 70 rak today only
    const avg = CalculationEngine.getRataRataProduksi(prods, 7);
    // 70 / 7 = 10
    expect(avg).toBe(10);
  });

  it('returns 0 for empty array', () => {
    expect(CalculationEngine.getRataRataProduksi([], 7)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const prods = [makeProd(todayStr, 10)]; // 10 / 7 ≈ 1.43
    const avg = CalculationEngine.getRataRataProduksi(prods, 7);
    expect(avg).toBe(1.43);
  });
});

// ---------------------------------------------------------------------------
// getDataGrafikProduksi
// ---------------------------------------------------------------------------

describe('getDataGrafikProduksi', () => {
  it('always returns exactly N points', () => {
    const result = CalculationEngine.getDataGrafikProduksi([], 7);
    expect(result).toHaveLength(7);
  });

  it('returns exactly N points for N=14', () => {
    const result = CalculationEngine.getDataGrafikProduksi([], 14);
    expect(result).toHaveLength(14);
  });

  it('fills missing days with value 0', () => {
    const result = CalculationEngine.getDataGrafikProduksi([], 7);
    for (const point of result) {
      expect(point.value).toBe(0);
    }
  });

  it('fills in actual data for matching dates', () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const prods = [makeProd(todayStr, 15)];
    const result = CalculationEngine.getDataGrafikProduksi(prods, 7);

    // Last element should be today
    const last = result[result.length - 1];
    expect(last.tanggal).toBe(todayStr);
    expect(last.value).toBe(15);
  });

  it('orders points oldest first (today last)', () => {
    const result = CalculationEngine.getDataGrafikProduksi([], 7);
    // Dates should be ascending
    for (let i = 1; i < result.length; i++) {
      expect(result[i].tanggal >= result[i - 1].tanggal).toBe(true);
    }
  });

  it('label is in DD/MM format', () => {
    const result = CalculationEngine.getDataGrafikProduksi([], 7);
    for (const point of result) {
      expect(point.label).toMatch(/^\d{2}\/\d{2}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// getBatasMingguBerjalan
// ---------------------------------------------------------------------------

describe('getBatasMingguBerjalan', () => {
  it('returns an object with start (Monday) and end (Sunday)', () => {
    const { start, end } = CalculationEngine.getBatasMingguBerjalan();
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
  });

  it('start is a Monday (getDay() === 1)', () => {
    const { start } = CalculationEngine.getBatasMingguBerjalan();
    expect(start.getDay()).toBe(1); // Monday
  });

  it('end is a Sunday (getDay() === 0)', () => {
    const { end } = CalculationEngine.getBatasMingguBerjalan();
    expect(end.getDay()).toBe(0); // Sunday
  });

  it('end is exactly 6 days after start', () => {
    const { start, end } = CalculationEngine.getBatasMingguBerjalan();
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThan(7);
  });

  it('start is at 00:00:00 and end is at 23:59:59 local time', () => {
    const { start, end } = CalculationEngine.getBatasMingguBerjalan();
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });
});

// ---------------------------------------------------------------------------
// formatTanggalHeader
// ---------------------------------------------------------------------------

describe('formatTanggalHeader', () => {
  it('returns correct Indonesian format for a known date (Kamis, 10 September 2026)', () => {
    // 2026-09-10 is a Thursday
    const date = new Date(2026, 8, 10); // Month is 0-indexed: 8 = September
    expect(CalculationEngine.formatTanggalHeader(date)).toBe('Kamis, 10 September 2026');
  });

  it('zero-pads the day to 2 digits', () => {
    // 2026-09-01 — day = 01
    const date = new Date(2026, 8, 1);
    const result = CalculationEngine.formatTanggalHeader(date);
    expect(result).toMatch(/^.+, 01 .+/);
  });

  it('uses Indonesian month names', () => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    months.forEach((bulan, i) => {
      const date = new Date(2026, i, 1);
      expect(CalculationEngine.formatTanggalHeader(date)).toContain(bulan);
    });
  });

  it('uses Indonesian day names', () => {
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    hari.forEach((namaHari, i) => {
      // Find a date with getDay() === i
      const base = new Date(2026, 8, 6); // Sunday 6 Sep 2026 (getDay()===0)
      const date = new Date(base);
      date.setDate(base.getDate() + i);
      expect(CalculationEngine.formatTanggalHeader(date).startsWith(namaHari + ',')).toBe(true);
    });
  });

  it('format matches pattern NamaHari, DD NamaBulan YYYY', () => {
    const date = new Date(2026, 0, 1); // 1 Januari 2026 (Kamis)
    const result = CalculationEngine.formatTanggalHeader(date);
    expect(result).toMatch(/^[A-Za-z]+, \d{2} [A-Za-z]+ \d{4}$/);
  });
});
