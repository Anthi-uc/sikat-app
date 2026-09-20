import { describe, it, expect, beforeEach } from 'vitest';
import {
  cleanMojibakeString,
  migrateLocalStorageUtf8,
  MIGRATION_FLAG_KEY,
  StorageService
} from '../js/storage.js';

describe('cleanMojibakeString()', () => {
  it('returns clean strings unmodified', () => {
    expect(cleanMojibakeString('Kas Masuk')).toBe('Kas Masuk');
    expect(cleanMojibakeString('Rp 1.000.000')).toBe('Rp 1.000.000');
    expect(cleanMojibakeString('')).toBe('');
    expect(cleanMojibakeString(null)).toBe(null);
  });

  it('cleans dashes and symbols', () => {
    expect(cleanMojibakeString('Laba â€” Rugi')).toBe('Laba — Rugi');
    expect(cleanMojibakeString('2024 â€“ 2026')).toBe('2024 – 2026');
    expect(cleanMojibakeString('â€¢ Item 1')).toBe('• Item 1');
    expect(cleanMojibakeString('A âˆ’ B')).toBe('A − B');
    expect(cleanMojibakeString('â‰ˆ 10')).toBe('≈ 10');
    expect(cleanMojibakeString('2 Ã— 3')).toBe('2 × 3');
    expect(cleanMojibakeString('Menu â†’ Submenu')).toBe('Menu → Submenu');
  });

  it('cleans box drawings lines', () => {
    expect(cleanMojibakeString('// â• â• â• ')).toBe('// ═══');
    expect(cleanMojibakeString('/* â”€â”€ */')).toBe('/* ── */');
  });

  it('cleans emojis', () => {
    expect(cleanMojibakeString('ðŸ“Š Laba Rugi')).toBe('📊 Laba Rugi');
    expect(cleanMojibakeString('ðŸ’¸ Arus Kas')).toBe('💸 Arus Kas');
    expect(cleanMojibakeString('âš–ï¸  Neraca')).toBe('⚖️ Neraca');
    expect(cleanMojibakeString('ðŸ“’ Buku Kas')).toBe('📒 Buku Kas');
    expect(cleanMojibakeString('ðŸ“  CALK')).toBe('📑 CALK');
    expect(cleanMojibakeString('ðŸ–¨ï¸  Cetak')).toBe('🖨️ Cetak');
    expect(cleanMojibakeString('ðŸ“¥ Excel')).toBe('📥 Excel');
    expect(cleanMojibakeString('ðŸ“‹ Clipboard')).toBe('📋 Clipboard');
    expect(cleanMojibakeString('ðŸ“ˆ Grafik')).toBe('📈 Grafik');
    expect(cleanMojibakeString('ðŸ’¾ Simpan')).toBe('💾 Simpan');
    expect(cleanMojibakeString('âœ ï¸  Edit')).toBe('✏️ Edit');
    expect(cleanMojibakeString('ðŸ—‘ï¸  Hapus')).toBe('🗑️ Hapus');
    expect(cleanMojibakeString('âž• Tambah')).toBe('➕ Tambah');
  });
});

describe('migrateLocalStorageUtf8()', () => {
  class MockStorage {
    constructor() {
      this._store = new Map();
    }
    getItem(key) {
      return this._store.has(key) ? this._store.get(key) : null;
    }
    setItem(key, value) {
      this._store.set(key, String(value));
    }
    removeItem(key) {
      this._store.delete(key);
    }
    clear() {
      this._store.clear();
    }
    key(index) {
      return Array.from(this._store.keys())[index] ?? null;
    }
    get length() {
      return this._store.size;
    }
  }

  let mockStore;

  beforeEach(() => {
    mockStore = new MockStorage();
  });

  it('migrates corrupted strings and sets migration flag', () => {
    mockStore.setItem('tx_notes', 'Pembayaran â€” Ayam Telur â€¢ Selesai');
    mockStore.setItem('json_data', JSON.stringify([
      { title: 'ðŸ“Š Laba Rugi', desc: 'Nilai: 10 Ã— 20 â‰ˆ 200' },
      { label: 'ðŸ’¸ Arus Kas â€” Bulan Mei' }
    ]));
    mockStore.setItem('clean_key', 'Nilai Bersih');

    const result = migrateLocalStorageUtf8(mockStore);
    expect(result.migrated).toBe(true);
    expect(result.count).toBe(2);

    expect(mockStore.getItem(MIGRATION_FLAG_KEY)).toBe('true');
    expect(mockStore.getItem('tx_notes')).toBe('Pembayaran — Ayam Telur • Selesai');
    expect(mockStore.getItem('clean_key')).toBe('Nilai Bersih');

    const parsedJson = JSON.parse(mockStore.getItem('json_data'));
    expect(parsedJson[0].title).toBe('📊 Laba Rugi');
    expect(parsedJson[0].desc).toBe('Nilai: 10 × 20 ≈ 200');
    expect(parsedJson[1].label).toBe('💸 Arus Kas — Bulan Mei');
  });

  it('runs only once when flag is already set', () => {
    mockStore.setItem(MIGRATION_FLAG_KEY, 'true');
    mockStore.setItem('corrupted', 'ðŸ“Š Test');

    const result = migrateLocalStorageUtf8(mockStore);
    expect(result.migrated).toBe(false);
    expect(result.reason).toBe('already_migrated');
    // Content remains as is because migration already ran once previously
    expect(mockStore.getItem('corrupted')).toBe('ðŸ“Š Test');
  });

  it('can be called via StorageService.migrateUtf8()', () => {
    mockStore.setItem('status', 'BUMKam â€” Torei Natei');
    const res = StorageService.migrateUtf8(mockStore);
    expect(res.migrated).toBe(true);
    expect(mockStore.getItem('status')).toBe('BUMKam — Torei Natei');
  });
});
