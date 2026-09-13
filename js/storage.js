// storage.js — StorageService: CRUD ke LocalStorage, serialisasi JSON, data dummy

import { AuthService } from './auth.js';

// KEYS lama dipertahankan sebagai fallback (dipakai saat tidak ada user login / test env)
const KEYS = {
  TRANSACTIONS: 'sikat_transactions',
  PRODUCTIONS: 'sikat_productions',
};

// Helper: dapatkan key aktif (per-user jika login, fallback ke lama)
function txKey()   { try { return AuthService.txKey();   } catch { return KEYS.TRANSACTIONS; } }
function prodKey() { try { return AuthService.prodKey(); } catch { return KEYS.PRODUCTIONS;  } }

// ─── Helper ────────────────────────────────────────────────────────────────

/**
 * Generate a unique ID.
 * Uses crypto.randomUUID() if available, else falls back to timestamp + random.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── StorageError ───────────────────────────────────────────────────────────

/** Custom error for storage-related failures (e.g. quota exceeded). */
export class StorageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StorageError';
  }
}

// ─── Dummy Data ─────────────────────────────────────────────────────────────

/**
 * Build a date string "YYYY-MM-DD" for daysAgo days before today.
 * @param {number} daysAgo
 * @returns {string}
 */
function dateAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const DUMMY_TRANSACTIONS = [
  // penjualan_telur (4 entries)
  {
    id: generateId(),
    jenis: 'penjualan_telur',
    tanggal: dateAgo(1),
    lokasi: 'Pasar Yakonde',
    nominal: 1800000,
    jumlahRak: 18,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    jenis: 'penjualan_telur',
    tanggal: dateAgo(4),
    lokasi: 'Toko Kelontong Pak Ahmad',
    nominal: 1500000,
    jumlahRak: 15,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    jenis: 'penjualan_telur',
    tanggal: dateAgo(9),
    lokasi: 'Pasar Yakonde',
    nominal: 2000000,
    jumlahRak: 20,
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    jenis: 'penjualan_telur',
    tanggal: dateAgo(16),
    lokasi: 'Warung Bu Yanti',
    nominal: 900000,
    jumlahRak: 9,
    createdAt: new Date(Date.now() - 16 * 86400000).toISOString(),
  },
  // pembelian_pakan (3 entries)
  {
    id: generateId(),
    jenis: 'pembelian_pakan',
    tanggal: dateAgo(2),
    lokasi: 'Toko Pakan Ternak Sentosa',
    nominal: 750000,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    jenis: 'pembelian_pakan',
    tanggal: dateAgo(8),
    lokasi: 'Toko Pakan Ternak Sentosa',
    nominal: 600000,
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    jenis: 'pembelian_pakan',
    tanggal: dateAgo(20),
    lokasi: 'Distributor Pakan Jaya Makmur',
    nominal: 800000,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  // biaya_lain (3 entries)
  {
    id: generateId(),
    jenis: 'biaya_lain',
    tanggal: dateAgo(3),
    lokasi: 'Apotek Ternak Sehat',
    nominal: 150000,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    jenis: 'biaya_lain',
    tanggal: dateAgo(11),
    lokasi: 'Toko Bangunan Maju Jaya',
    nominal: 250000,
    createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    jenis: 'biaya_lain',
    tanggal: dateAgo(25),
    lokasi: 'PLN Kampung Yakonde',
    nominal: 300000,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
];

const DUMMY_PRODUCTIONS = [
  {
    id: generateId(),
    tanggal: dateAgo(0),
    jumlahRak: 35,
    createdAt: new Date().toISOString(),
  },
  {
    id: generateId(),
    tanggal: dateAgo(1),
    jumlahRak: 32,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    tanggal: dateAgo(2),
    jumlahRak: 30,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    tanggal: dateAgo(3),
    jumlahRak: 38,
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    tanggal: dateAgo(4),
    jumlahRak: 28,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    tanggal: dateAgo(5),
    jumlahRak: 40,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: generateId(),
    tanggal: dateAgo(6),
    jumlahRak: 25,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
];

// ─── StorageService ─────────────────────────────────────────────────────────

export const StorageService = {
  getTransactions() {
    try {
      const raw = localStorage.getItem(txKey());
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('[StorageService] Gagal membaca transaksi:', e);
      return [];
    }
  },

  getProductions() {
    try {
      const raw = localStorage.getItem(prodKey());
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('[StorageService] Gagal membaca produksi:', e);
      return [];
    }
  },

  saveTransaction(tx) {
    try {
      const transactions = this.getTransactions();
      transactions.push(tx);
      try {
        localStorage.setItem(txKey(), JSON.stringify(transactions));
      } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
          throw new StorageError('Penyimpanan penuh. Hapus data lama atau bersihkan cache browser.');
        }
        throw e;
      }
    } catch (e) {
      if (e instanceof StorageError) throw e;
      console.error('[StorageService] Gagal menyimpan transaksi:', e);
      throw e;
    }
  },

  saveProduction(prod, confirmOverwrite = false) {
    const productions = this.getProductions();
    const existingIndex = productions.findIndex((p) => p.tanggal === prod.tanggal);

    if (existingIndex !== -1) {
      if (!confirmOverwrite) return 'needs_confirmation';
      productions[existingIndex] = prod;
    } else {
      productions.push(prod);
    }

    try {
      localStorage.setItem(prodKey(), JSON.stringify(productions));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        throw new StorageError('Penyimpanan penuh. Hapus data lama atau bersihkan cache browser.');
      }
      console.error('[StorageService] Gagal menyimpan produksi:', e);
      throw e;
    }

    return 'saved';
  },

  initDummyData() {
    const existingTx   = this.getTransactions();
    const existingProd = this.getProductions();
    if (existingTx.length > 0 && existingProd.length > 0) return;

    localStorage.setItem(txKey(),   JSON.stringify(DUMMY_TRANSACTIONS));
    localStorage.setItem(prodKey(), JSON.stringify(DUMMY_PRODUCTIONS));
  },

  clearAll() {
    localStorage.removeItem(txKey());
    localStorage.removeItem(prodKey());
    // juga bersihkan key lama (dipakai di test env)
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.PRODUCTIONS);
  },
};
