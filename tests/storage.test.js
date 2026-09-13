// storage.test.js — Tests for StorageService
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService, StorageError, generateId } from '../js/storage.js';

beforeEach(() => {
  StorageService.clearAll();
});

// ─── generateId ─────────────────────────────────────────────────────────────

describe('generateId()', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string');
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('returns unique values on successive calls', () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });
});

// ─── StorageError ────────────────────────────────────────────────────────────

describe('StorageError', () => {
  it('is an instance of Error with name StorageError', () => {
    const err = new StorageError('test pesan');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('StorageError');
    expect(err.message).toBe('test pesan');
  });
});

// ─── getTransactions() ───────────────────────────────────────────────────────

describe('StorageService.getTransactions()', () => {
  it('1. returns [] when storage is empty', () => {
    expect(StorageService.getTransactions()).toEqual([]);
  });

  it('2. returns [] and does not throw when JSON is corrupt', () => {
    localStorage.setItem('sikat_transactions', '{corrupt json[[');
    expect(() => StorageService.getTransactions()).not.toThrow();
    expect(StorageService.getTransactions()).toEqual([]);
  });

  it('3. returns the parsed array when valid data is stored', () => {
    const tx = [
      {
        id: '1',
        jenis: 'penjualan_telur',
        tanggal: '2025-01-01',
        lokasi: 'Pasar',
        nominal: 500000,
        jumlahRak: 5,
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem('sikat_transactions', JSON.stringify(tx));
    expect(StorageService.getTransactions()).toEqual(tx);
  });
});

// ─── getProductions() ────────────────────────────────────────────────────────

describe('StorageService.getProductions()', () => {
  it('4. returns [] when storage is empty', () => {
    expect(StorageService.getProductions()).toEqual([]);
  });

  it('returns [] and does not throw when JSON is corrupt', () => {
    localStorage.setItem('sikat_productions', ':::bad json:::');
    expect(() => StorageService.getProductions()).not.toThrow();
    expect(StorageService.getProductions()).toEqual([]);
  });

  it('returns the parsed array when valid data is stored', () => {
    const prod = [
      { id: '1', tanggal: '2025-01-01', jumlahRak: 30, createdAt: new Date().toISOString() },
    ];
    localStorage.setItem('sikat_productions', JSON.stringify(prod));
    expect(StorageService.getProductions()).toEqual(prod);
  });
});

// ─── saveTransaction() ───────────────────────────────────────────────────────

describe('StorageService.saveTransaction()', () => {
  it('5. adds the transaction and persists it', () => {
    const tx = {
      id: generateId(),
      jenis: 'pembelian_pakan',
      tanggal: '2025-01-10',
      lokasi: 'Toko Pakan',
      nominal: 300000,
      createdAt: new Date().toISOString(),
    };
    StorageService.saveTransaction(tx);

    const stored = StorageService.getTransactions();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(tx);
  });

  it('appends to existing transactions', () => {
    const tx1 = {
      id: generateId(),
      jenis: 'biaya_lain',
      tanggal: '2025-01-09',
      lokasi: 'PLN',
      nominal: 100000,
      createdAt: new Date().toISOString(),
    };
    const tx2 = {
      id: generateId(),
      jenis: 'penjualan_telur',
      tanggal: '2025-01-10',
      lokasi: 'Pasar',
      nominal: 700000,
      jumlahRak: 7,
      createdAt: new Date().toISOString(),
    };
    StorageService.saveTransaction(tx1);
    StorageService.saveTransaction(tx2);

    const stored = StorageService.getTransactions();
    expect(stored).toHaveLength(2);
  });
});

// ─── saveProduction() ────────────────────────────────────────────────────────

describe('StorageService.saveProduction()', () => {
  const makeProd = (tanggal, jumlahRak = 30) => ({
    id: generateId(),
    tanggal,
    jumlahRak,
    createdAt: new Date().toISOString(),
  });

  it('6. returns "needs_confirmation" when tanggal is duplicate and confirmOverwrite=false', () => {
    const prod = makeProd('2025-01-01');
    StorageService.saveProduction(prod);

    const duplicate = makeProd('2025-01-01', 40);
    const result = StorageService.saveProduction(duplicate, false);
    expect(result).toBe('needs_confirmation');
  });

  it('7. returns "saved" and overwrites when tanggal is duplicate and confirmOverwrite=true', () => {
    const prod = makeProd('2025-01-01', 30);
    StorageService.saveProduction(prod);

    const updated = makeProd('2025-01-01', 40);
    const result = StorageService.saveProduction(updated, true);
    expect(result).toBe('saved');

    const stored = StorageService.getProductions();
    expect(stored).toHaveLength(1);
    expect(stored[0].jumlahRak).toBe(40);
  });

  it('returns "saved" and appends when there is no duplicate', () => {
    const prod = makeProd('2025-01-01');
    const result = StorageService.saveProduction(prod);
    expect(result).toBe('saved');

    const stored = StorageService.getProductions();
    expect(stored).toHaveLength(1);
  });

  it('does NOT overwrite when duplicate and confirmOverwrite=false', () => {
    const original = makeProd('2025-01-01', 30);
    StorageService.saveProduction(original);

    const duplicate = makeProd('2025-01-01', 99);
    StorageService.saveProduction(duplicate, false);

    const stored = StorageService.getProductions();
    // Should still be the original
    expect(stored).toHaveLength(1);
    expect(stored[0].jumlahRak).toBe(30);
  });
});

// ─── initDummyData() ─────────────────────────────────────────────────────────

describe('StorageService.initDummyData()', () => {
  it('8. loads 10 transactions and 7 productions when storage is empty', () => {
    StorageService.initDummyData();

    const txs = StorageService.getTransactions();
    const prods = StorageService.getProductions();

    expect(txs).toHaveLength(10);
    expect(prods).toHaveLength(7);
  });

  it('dummy transactions include at least 4 penjualan_telur', () => {
    StorageService.initDummyData();
    const txs = StorageService.getTransactions();
    const penjualan = txs.filter((t) => t.jenis === 'penjualan_telur');
    expect(penjualan.length).toBeGreaterThanOrEqual(4);
  });

  it('each penjualan_telur entry has jumlahRak defined', () => {
    StorageService.initDummyData();
    const txs = StorageService.getTransactions();
    txs
      .filter((t) => t.jenis === 'penjualan_telur')
      .forEach((t) => {
        expect(t.jumlahRak).toBeDefined();
        expect(typeof t.jumlahRak).toBe('number');
      });
  });

  it('9. does NOT overwrite existing data when both keys are present and non-empty', () => {
    // Seed custom data first
    const customTx = [
      {
        id: 'custom-1',
        jenis: 'biaya_lain',
        tanggal: '2020-01-01',
        lokasi: 'Custom',
        nominal: 999,
        createdAt: new Date().toISOString(),
      },
    ];
    const customProd = [
      { id: 'custom-2', tanggal: '2020-01-01', jumlahRak: 1, createdAt: new Date().toISOString() },
    ];
    localStorage.setItem('sikat_transactions', JSON.stringify(customTx));
    localStorage.setItem('sikat_productions', JSON.stringify(customProd));

    StorageService.initDummyData();

    expect(StorageService.getTransactions()).toEqual(customTx);
    expect(StorageService.getProductions()).toEqual(customProd);
  });
});

// ─── clearAll() ──────────────────────────────────────────────────────────────

describe('StorageService.clearAll()', () => {
  it('10. removes both localStorage keys', () => {
    StorageService.initDummyData();
    expect(StorageService.getTransactions().length).toBeGreaterThan(0);
    expect(StorageService.getProductions().length).toBeGreaterThan(0);

    StorageService.clearAll();

    expect(StorageService.getTransactions()).toEqual([]);
    expect(StorageService.getProductions()).toEqual([]);
    expect(localStorage.getItem('sikat_transactions')).toBeNull();
    expect(localStorage.getItem('sikat_productions')).toBeNull();
  });
});
