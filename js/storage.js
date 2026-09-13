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
    return;
  },

  clearAll() {
    localStorage.removeItem(txKey());
    localStorage.removeItem(prodKey());
    localStorage.removeItem(KEYS.TRANSACTIONS);
    localStorage.removeItem(KEYS.PRODUCTIONS);
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
  }
};
