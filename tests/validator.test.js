// validator.test.js — Unit tests for Validator
import { describe, it, expect } from 'vitest';
import { Validator } from '../js/validator.js';

const { validateDateFormat, validateNominal, validateJumlahRak, validateTransaksi, validateProduksi } = Validator;

// ---------------------------------------------------------------------------
// validateDateFormat
// ---------------------------------------------------------------------------
describe('validateDateFormat', () => {
  // 1. Valid date
  it('returns true for valid date "10/09/2026"', () => {
    expect(validateDateFormat('10/09/2026')).toBe(true);
  });

  // 2. Wrong separator format
  it('returns false for ISO format "2026-09-10"', () => {
    expect(validateDateFormat('2026-09-10')).toBe(false);
  });

  // 3. Feb 31 — non-existent date
  it('returns false for "31/02/2026" (Feb has no 31st)', () => {
    expect(validateDateFormat('31/02/2026')).toBe(false);
  });

  // 4. Leap year — Feb 29 valid
  it('returns true for "29/02/2024" (2024 is a leap year)', () => {
    expect(validateDateFormat('29/02/2024')).toBe(true);
  });

  // 5. Non-leap year — Feb 29 invalid
  it('returns false for "29/02/2023" (2023 is not a leap year)', () => {
    expect(validateDateFormat('29/02/2023')).toBe(false);
  });

  // 6. Empty string
  it('returns false for empty string', () => {
    expect(validateDateFormat('')).toBe(false);
  });

  // 7. Day 00
  it('returns false for "00/05/2026" (day 0 is invalid)', () => {
    expect(validateDateFormat('00/05/2026')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateNominal
// ---------------------------------------------------------------------------
describe('validateNominal', () => {
  // 8. Minimum valid value
  it('returns true for "1"', () => {
    expect(validateNominal('1')).toBe(true);
  });

  // 9. Maximum valid value
  it('returns true for "999999999999"', () => {
    expect(validateNominal('999999999999')).toBe(true);
  });

  // 10. Zero
  it('returns false for "0"', () => {
    expect(validateNominal('0')).toBe(false);
  });

  // 11. Negative value
  it('returns false for "-5"', () => {
    expect(validateNominal('-5')).toBe(false);
  });

  // 12. Decimal / float
  it('returns false for "1.5"', () => {
    expect(validateNominal('1.5')).toBe(false);
  });

  // 13. Empty string
  it('returns false for empty string', () => {
    expect(validateNominal('')).toBe(false);
  });

  // 14. Above maximum
  it('returns false for "1000000000000" (exceeds max)', () => {
    expect(validateNominal('1000000000000')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateJumlahRak
// ---------------------------------------------------------------------------
describe('validateJumlahRak', () => {
  // 15. Minimum valid value
  it('returns true for "1"', () => {
    expect(validateJumlahRak('1')).toBe(true);
  });

  // 16. Maximum valid value
  it('returns true for "9999"', () => {
    expect(validateJumlahRak('9999')).toBe(true);
  });

  // 17. Zero
  it('returns false for "0"', () => {
    expect(validateJumlahRak('0')).toBe(false);
  });

  // 18. Above maximum
  it('returns false for "10000"', () => {
    expect(validateJumlahRak('10000')).toBe(false);
  });

  // 19. Decimal
  it('returns false for "12.5"', () => {
    expect(validateJumlahRak('12.5')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateTransaksi
// ---------------------------------------------------------------------------
describe('validateTransaksi', () => {
  // 20. All valid with jenis=penjualan_telur
  it('returns valid:true when all fields are valid and jenis=penjualan_telur', () => {
    const result = validateTransaksi({
      jenis: 'penjualan_telur',
      tanggal: '2026-09-10',
      lokasi: 'Pasar Sentani',
      nominal: '500000',
      jumlahRak: '25',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // 21. All valid with jenis=pembelian_pakan (no jumlahRak required)
  it('returns valid:true when jenis=pembelian_pakan and no jumlahRak provided', () => {
    const result = validateTransaksi({
      jenis: 'pembelian_pakan',
      tanggal: '2026-09-10',
      lokasi: 'Toko Pakan',
      nominal: '200000',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // 22. Missing jenis
  it('returns errors.jenis when jenis is missing', () => {
    const result = validateTransaksi({
      jenis: '',
      tanggal: '2026-09-10',
      lokasi: 'Pasar',
      nominal: '100000',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.jenis).toBeDefined();
    expect(result.errors.jenis).toBe('Jenis transaksi wajib dipilih.');
  });

  // 23. Missing lokasi
  it('returns errors.lokasi when lokasi is empty', () => {
    const result = validateTransaksi({
      jenis: 'pembelian_pakan',
      tanggal: '2026-09-10',
      lokasi: '',
      nominal: '100000',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.lokasi).toBeDefined();
    expect(result.errors.lokasi).toBe('Lokasi wajib diisi.');
  });

  // 24. Invalid nominal
  it('returns errors.nominal when nominal is invalid (e.g. "0")', () => {
    const result = validateTransaksi({
      jenis: 'pembelian_pakan',
      tanggal: '2026-09-10',
      lokasi: 'Toko',
      nominal: '0',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.nominal).toBeDefined();
    expect(result.errors.nominal).toBe('Nominal harus berupa angka antara 1 dan 999.999.999.999.');
  });

  // 25. jenis=penjualan_telur but jumlahRak missing
  it('returns errors.jumlahRak when jenis=penjualan_telur and jumlahRak is missing', () => {
    const result = validateTransaksi({
      jenis: 'penjualan_telur',
      tanggal: '2026-09-10',
      lokasi: 'Pasar',
      nominal: '500000',
      jumlahRak: '',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.jumlahRak).toBeDefined();
    expect(result.errors.jumlahRak).toBe('Jumlah rak wajib diisi untuk penjualan telur.');
  });

  // 26. jenis=pembelian_pakan with jumlahRak missing → still valid
  it('returns valid:true when jenis=pembelian_pakan and jumlahRak is absent', () => {
    const result = validateTransaksi({
      jenis: 'pembelian_pakan',
      tanggal: '2026-09-10',
      lokasi: 'Toko Pakan',
      nominal: '300000',
      jumlahRak: '',
    });
    expect(result.valid).toBe(true);
    expect(result.errors.jumlahRak).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// validateProduksi
// ---------------------------------------------------------------------------
describe('validateProduksi', () => {
  // 27. All valid
  it('returns valid:true for { tanggal: "10/09/2026", jumlahRak: "25" }', () => {
    const result = validateProduksi({ tanggal: '10/09/2026', jumlahRak: '25' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  // 28. Empty tanggal → wajib message
  it('returns errors.tanggal with wajib message when tanggal is empty', () => {
    const result = validateProduksi({ tanggal: '', jumlahRak: '25' });
    expect(result.valid).toBe(false);
    expect(result.errors.tanggal).toBe('Tanggal wajib diisi.');
  });

  // 29. Wrong format tanggal → format message
  it('returns errors.tanggal with format message for wrong format "2026-09-10"', () => {
    const result = validateProduksi({ tanggal: '2026-09-10', jumlahRak: '25' });
    expect(result.valid).toBe(false);
    expect(result.errors.tanggal).toBe('Format tanggal harus DD/MM/YYYY (contoh: 10/09/2026).');
  });

  // 30. Invalid jumlahRak "0"
  it('returns errors.jumlahRak when jumlahRak is "0"', () => {
    const result = validateProduksi({ tanggal: '10/09/2026', jumlahRak: '0' });
    expect(result.valid).toBe(false);
    expect(result.errors.jumlahRak).toBeDefined();
    expect(result.errors.jumlahRak).toBe('Jumlah rak harus berupa angka antara 1 dan 9.999.');
  });
});
