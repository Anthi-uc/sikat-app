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
};
