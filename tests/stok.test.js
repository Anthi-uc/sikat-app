// stok.test.js — Stok telur real-time & klasifikasi kas masuk/keluar
import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../js/storage.js';
import { isIncome } from '../js/categories.js';

const prod = (tanggal, rak) => ({
  id: `p-${tanggal}`, tanggal, jumlahRak: rak, jumlahButir: rak * 30,
});

const tx = (id, kategori, subKategori, extra = {}) => ({
  id, kategori, subKategori, jenis: subKategori,
  tanggal: '2026-09-02', lokasi: 'Pasar', nominal: 100000, ...extra,
});

beforeEach(() => {
  StorageService.clearAll();
});

describe('StorageService.getStokTelur()', () => {
  it('produksi menambah stok', () => {
    StorageService.saveProduction(prod('2026-09-01', 10));
    expect(StorageService.getStokTelur()).toBe(300);
  });

  it('penjualan telur mengurangi stok', () => {
    StorageService.saveProduction(prod('2026-09-01', 10));
    StorageService.saveTransaction(
      tx('t1', 'penjualan', 'penjualan_telur', { jumlahRak: 2, jumlahButir: 60 }));
    expect(StorageService.getStokTelur()).toBe(240);
  });

  it('pembelian / retur telur menambah stok', () => {
    StorageService.saveProduction(prod('2026-09-01', 10));
    StorageService.saveTransaction(
      tx('t2', 'persediaan', 'telur', { jumlahRak: 1, jumlahButir: 30 }));
    expect(StorageService.getStokTelur()).toBe(330);
  });

  it('transaksi non-telur tidak mengubah stok', () => {
    StorageService.saveProduction(prod('2026-09-01', 10));
    StorageService.saveTransaction(tx('t3', 'persediaan', 'pakan', { kuantitas: 5 }));
    StorageService.saveTransaction(tx('t4', 'modal', 'modal_awal'));
    expect(StorageService.getStokTelur()).toBe(300);
  });

  it('transaksi legacy (hanya field jenis) tetap terhitung', () => {
    StorageService.saveProduction(prod('2026-09-01', 10));
    StorageService.saveTransaction({
      id: 't5', jenis: 'penjualan_telur', tanggal: '2026-09-02',
      lokasi: 'Pasar', nominal: 90000, jumlahRak: 3, jumlahButir: 90,
    });
    expect(StorageService.getStokTelur()).toBe(210);
  });

  it('tidak pernah negatif', () => {
    StorageService.saveTransaction(
      tx('t6', 'penjualan', 'penjualan_telur', { jumlahRak: 5, jumlahButir: 150 }));
    expect(StorageService.getStokTelur()).toBe(0);
  });
});

describe('klasifikasi kas (dipakai Beranda, Rekap & Buku Kas)', () => {
  it('setoran modal & pencairan utang = kas masuk', () => {
    expect(isIncome({ kategori: 'modal', subKategori: 'modal_awal' })).toBe(true);
    expect(isIncome({ kategori: 'utang', subKategori: 'pencairan_utang_bank' })).toBe(true);
  });

  it('pembelian peralatan & bayar utang = kas keluar', () => {
    expect(isIncome({ kategori: 'peralatan', subKategori: 'peralatan_kandang' })).toBe(false);
    expect(isIncome({ kategori: 'utang', subKategori: 'bayar_utang_bank' })).toBe(false);
  });
});

describe('Beranda: widget buku kas berjalan', () => {
  it('menampilkan saldo berjalan bulan ini', async () => {
    const d = new Date();
    const pfx = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 500.000 masuk − 200.000 keluar = saldo berjalan 300.000
    StorageService.saveTransaction(tx('w1', 'penjualan', 'penjualan_telur',
      { tanggal: `${pfx}-05`, nominal: 500000, jumlahRak: 5, jumlahButir: 150 }));
    StorageService.saveTransaction(tx('w2', 'persediaan', 'pakan',
      { tanggal: `${pfx}-06`, nominal: 200000 }));

    const { render } = await import('../js/views/home.js');
    const html = render();

    expect(html).toContain('Buku Kas Berjalan');
    expect(html).toContain('Rp 300.000');       // saldo berjalan setelah 2 transaksi
    expect(html).toContain('data-laporan-tab="neraca"'); // pintasan laporan
  });
});
