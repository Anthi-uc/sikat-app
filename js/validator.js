// validator.js — Validator: validasi input form transaksi dan produksi

/**
 * Validates a date string in DD/MM/YYYY format, including calendar validity.
 * @param {string} value
 * @returns {boolean}
 */
function validateDateFormat(value) {
  if (typeof value !== 'string' || value === '') return false;

  // Must match exactly DD/MM/YYYY
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1) return false;

  // Determine max days in month (handles leap years)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;

  return true;
}

/**
 * Validates a nominal value string (integer, 1 – 999_999_999_999).
 * @param {string} value
 * @returns {boolean}
 */
function validateNominal(value) {
  if (typeof value !== 'string' || value === '') return false;

  // Must be an integer string (no decimal point, no leading + allowed for negative check)
  if (!/^-?\d+$/.test(value)) return false;

  const num = Number(value);
  if (!Number.isInteger(num)) return false;
  if (num < 1) return false;
  if (num > 999_999_999_999) return false;

  return true;
}

/**
 * Validates a jumlahRak value string (integer, 1 – 9999).
 * @param {string} value
 * @returns {boolean}
 */
function validateJumlahRak(value) {
  if (typeof value !== 'string' || value === '') return false;

  if (!/^-?\d+$/.test(value)) return false;

  const num = Number(value);
  if (!Number.isInteger(num)) return false;
  if (num < 1) return false;
  if (num > 9999) return false;

  return true;
}

/**
 * Validates transaksi form data.
 * @param {{ jenis: string, tanggal: string, lokasi: string, nominal: string, jumlahRak?: string }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
function validateTransaksi(data) {
  const errors = {};
  const VALID_JENIS = ['penjualan_telur', 'pembelian_pakan', 'biaya_lain'];

  // jenis
  if (!data.jenis || !VALID_JENIS.includes(data.jenis)) {
    errors.jenis = 'Jenis transaksi wajib dipilih.';
  }

  // tanggal
  if (!data.tanggal || data.tanggal.trim() === '') {
    errors.tanggal = 'Tanggal wajib diisi.';
  }

  // lokasi
  if (!data.lokasi || data.lokasi.trim() === '') {
    errors.lokasi = 'Lokasi wajib diisi.';
  } else if (data.lokasi.length > 100) {
    errors.lokasi = 'Lokasi maksimal 100 karakter.';
  }

  // nominal
  if (!data.nominal || data.nominal.trim() === '') {
    errors.nominal = 'Nominal wajib diisi.';
  } else if (!validateNominal(data.nominal)) {
    errors.nominal = 'Nominal harus berupa angka antara 1 dan 999.999.999.999.';
  }

  // jumlahRak — required only for penjualan_telur
  if (data.jenis === 'penjualan_telur') {
    if (!data.jumlahRak || data.jumlahRak.trim() === '') {
      errors.jumlahRak = 'Jumlah rak wajib diisi untuk penjualan telur.';
    } else if (!validateJumlahRak(data.jumlahRak)) {
      errors.jumlahRak = 'Jumlah rak harus berupa angka antara 1 dan 9.999.';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates produksi form data.
 * @param {{ tanggal: string, jumlahRak: string }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
function validateProduksi(data) {
  const errors = {};

  // tanggal
  if (!data.tanggal || data.tanggal.trim() === '') {
    errors.tanggal = 'Tanggal wajib diisi.';
  } else if (!validateDateFormat(data.tanggal)) {
    errors.tanggal = 'Format tanggal harus DD/MM/YYYY (contoh: 10/09/2026).';
  }

  // jumlahRak
  if (!data.jumlahRak || data.jumlahRak.trim() === '') {
    errors.jumlahRak = 'Jumlah rak wajib diisi.';
  } else if (!validateJumlahRak(data.jumlahRak)) {
    errors.jumlahRak = 'Jumlah rak harus berupa angka antara 1 dan 9.999.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export const Validator = {
  validateDateFormat,
  validateNominal,
  validateJumlahRak,
  validateTransaksi,
  validateProduksi,
};
