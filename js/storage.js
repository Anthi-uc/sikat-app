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

const DUMMY_TRANSACTIONS = [];
const DUMMY_PRODUCTIONS = [];

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
    // Only seed when both stores are empty
    const hasTx   = localStorage.getItem(KEYS.TRANSACTIONS);
    const hasProd = localStorage.getItem(KEYS.PRODUCTIONS);
    if (hasTx && hasProd) return;

    // ── 10 Transactions (≥4 penjualan_telur, each with jumlahRak) ─────────
    const DUMMY_TX = [
      { id: '1', jenis: 'penjualan_telur', tanggal: dateAgo(1),  lokasi: 'Pasar Sentani',  nominal: 900000,  jumlahRak: 30, createdAt: new Date().toISOString() },
      { id: '2', jenis: 'penjualan_telur', tanggal: dateAgo(3),  lokasi: 'Pasar Besum',    nominal: 750000,  jumlahRak: 25, createdAt: new Date().toISOString() },
      { id: '3', jenis: 'penjualan_telur', tanggal: dateAgo(5),  lokasi: 'Pasar Sentani',  nominal: 600000,  jumlahRak: 20, createdAt: new Date().toISOString() },
      { id: '4', jenis: 'penjualan_telur', tanggal: dateAgo(7),  lokasi: 'Pasar Besum',    nominal: 450000,  jumlahRak: 15, createdAt: new Date().toISOString() },
      { id: '5', jenis: 'penjualan_telur', tanggal: dateAgo(10), lokasi: 'Pasar Sentani',  nominal: 300000,  jumlahRak: 10, createdAt: new Date().toISOString() },
      { id: '6', jenis: 'pembelian_pakan', tanggal: dateAgo(2),  lokasi: 'Toko Pakan ABC', nominal: 500000,  createdAt: new Date().toISOString() },
      { id: '7', jenis: 'pembelian_pakan', tanggal: dateAgo(6),  lokasi: 'Toko Pakan ABC', nominal: 500000,  createdAt: new Date().toISOString() },
      { id: '8', jenis: 'pembelian_pakan', tanggal: dateAgo(9),  lokasi: 'Toko Pakan XYZ', nominal: 400000,  createdAt: new Date().toISOString() },
      { id: '9', jenis: 'biaya_lain',      tanggal: dateAgo(4),  lokasi: 'Apotek Hewan',   nominal: 150000,  createdAt: new Date().toISOString() },
      { id:'10', jenis: 'biaya_lain',      tanggal: dateAgo(8),  lokasi: 'Transport',       nominal: 80000,   createdAt: new Date().toISOString() },
    ];

    // ── 7 Productions ─────────────────────────────────────────────────────
    const DUMMY_PROD = [
      { id: 'p1', tanggal: dateAgo(0), jumlahRak: 35, createdAt: new Date().toISOString() },
      { id: 'p2', tanggal: dateAgo(1), jumlahRak: 34, createdAt: new Date().toISOString() },
      { id: 'p3', tanggal: dateAgo(2), jumlahRak: 36, createdAt: new Date().toISOString() },
      { id: 'p4', tanggal: dateAgo(3), jumlahRak: 33, createdAt: new Date().toISOString() },
      { id: 'p5', tanggal: dateAgo(4), jumlahRak: 35, createdAt: new Date().toISOString() },
      { id: 'p6', tanggal: dateAgo(5), jumlahRak: 37, createdAt: new Date().toISOString() },
      { id: 'p7', tanggal: dateAgo(6), jumlahRak: 34, createdAt: new Date().toISOString() },
    ];

    if (!hasTx)   localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(DUMMY_TX));
    if (!hasProd) localStorage.setItem(KEYS.PRODUCTIONS,  JSON.stringify(DUMMY_PROD));
  },

  clearAll() {
    localStorage.removeItem(txKey());
    localStorage.removeItem(prodKey());
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.PRODUCTIONS);
  },

deleteProduction(tanggal) {
    try {
      const productions = this.getProductions();
      const filtered = productions.filter((p) => {
        // Cocokkan format ISO langsung (2026-09-13) atau konversi format (13/09/2026)
        if (p.tanggal === tanggal) return false;
        if (p.tanggal && p.tanggal.includes('-')) {
          const [y, m, d] = p.tanggal.split('-');
          const formatted = `${d}/${m}/${y}`;
          if (formatted === tanggal) return false;
        }
        return true;
      });
      localStorage.setItem(prodKey(), JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('[StorageService] Gagal menghapus produksi:', e);
      return false;
    }
  },

deleteTransaction(id) {
    try {
      const transactions = this.getTransactions();
      const filtered = transactions.filter((tx) => tx.id !== id);
      localStorage.setItem(txKey(), JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('[StorageService] Gagal menghapus transaksi:', e);
      return false;
    }
  },

  updateTransaction(id, updates) {
    try {
      const transactions = this.getTransactions();
      const idx = transactions.findIndex((tx) => tx.id === id);
      if (idx === -1) return false;
      transactions[idx] = { ...transactions[idx], ...updates, id };
      localStorage.setItem(txKey(), JSON.stringify(transactions));
      return true;
    } catch (e) {
      console.error('[StorageService] Gagal memperbarui transaksi:', e);
      return false;
    }
  },

  updateProduction(tanggal, updates) {
    try {
      const productions = this.getProductions();
      const idx = productions.findIndex((p) => p.tanggal === tanggal);
      if (idx === -1) return false;
      productions[idx] = { ...productions[idx], ...updates };
      localStorage.setItem(prodKey(), JSON.stringify(productions));
      return true;
    } catch (e) {
      console.error('[StorageService] Gagal memperbarui produksi:', e);
      return false;
    }
  }
};
