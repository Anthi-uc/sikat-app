import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { render as renderLabarugi } from '../js/views/labarugi.js';
import { render as renderLogin } from '../js/views/login.js';
import { render as renderRegister } from '../js/views/register.js';
import { AuthService, hashPassword } from '../js/auth.js';

describe('KELOMPOK 1: Perbaikan Tampilan SIKAT', () => {

  // ══════════════════════════════════════════════════════════════
  // BAGIAN A — TANPA IKON DI LAPORAN KEUANGAN
  // ══════════════════════════════════════════════════════════════
  describe('BAGIAN A: Tanpa Ikon di Laporan Keuangan', () => {
    const labarugiPath = path.resolve(__dirname, '../js/views/labarugi.js');
    const labarugiCode = fs.readFileSync(labarugiPath, 'utf8');

    it('verifies ZERO emojis in js/views/labarugi.js source code', () => {
      const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
      const lines = labarugiCode.split('\n');
      const emojiLines = [];
      lines.forEach((line, idx) => {
        if (emojiRegex.test(line)) {
          emojiLines.push({ lineNum: idx + 1, content: line.trim() });
        }
      });
      expect(emojiLines).toEqual([]);
    });

    it('verifies rendered Laporan Keuangan contains no emojis', () => {
      const html = renderLabarugi();
      const emojiRegex = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
      expect(emojiRegex.test(html)).toBe(false);
      expect(html).toContain('Laba Rugi');
      expect(html).toContain('Arus Kas');
      expect(html).toContain('Neraca');
      expect(html).toContain('CALK');
      expect(html).toContain('Buku Kas');
      expect(html).toContain('Cetak');
      expect(html).toContain('Excel');
    });

    it('verifies buttons use plain text without icons', () => {
      expect(labarugiCode).toContain('id="btn-tambah-bk">Tambah Transaksi Baru</button>');
      expect(labarugiCode).toContain('title="Edit Transaksi">Edit</button>');
      expect(labarugiCode).toContain('title="Hapus Transaksi">Hapus</button>');
      expect(labarugiCode).toContain('Simpan Transaksi');
      expect(labarugiCode).toContain('Simpan Perubahan');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // BAGIAN B — IKON APLIKASI (PWA)
  // ══════════════════════════════════════════════════════════════
  describe('BAGIAN B: Ikon Aplikasi (PWA) Saat Diinstal', () => {
    const iconsDir = path.resolve(__dirname, '../assets/icons');
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    const indexPath = path.resolve(__dirname, '../index.html');
    const swPath = path.resolve(__dirname, '../sw.js');

    it('verifies all required icon files exist with proper dimensions', () => {
      const files = [
        { file: 'icon-512.png', width: 512, height: 512 },
        { file: 'icon-192.png', width: 192, height: 192 },
        { file: 'icon-maskable-512.png', width: 512, height: 512 },
        { file: 'apple-touch-icon.png', width: 180, height: 180 },
        { file: 'icon-32.png', width: 32, height: 32 },
        { file: 'icon-16.png', width: 16, height: 16 },
      ];

      files.forEach(({ file, width, height }) => {
        const filePath = path.join(iconsDir, file);
        expect(fs.existsSync(filePath), `Icon ${file} must exist`).toBe(true);
        const buf = fs.readFileSync(filePath);
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        expect(w).toBe(width);
        expect(h).toBe(height);
      });

      expect(fs.existsSync(path.join(iconsDir, 'favicon.svg'))).toBe(true);
    });

    it('verifies manifest.json contains correct metadata, colors, and icon definitions', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      expect(manifest.name).toBe('SIKAT');
      expect(manifest.short_name).toBe('SIKAT');
      expect(manifest.theme_color).toBe('#1e293b');
      expect(manifest.background_color).toBe('#1e293b');
      expect(manifest.display).toBe('standalone');

      const anyIcon192 = manifest.icons.find(i => i.sizes === '192x192' && i.purpose === 'any');
      const anyIcon512 = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'any');
      const maskableIcon = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'maskable');

      expect(anyIcon192).toBeDefined();
      expect(anyIcon512).toBeDefined();
      expect(maskableIcon).toBeDefined();
      expect(maskableIcon.src).toContain('icon-maskable-512.png');
    });

    it('verifies index.html points to updated favicon and apple-touch-icon', () => {
      const html = fs.readFileSync(indexPath, 'utf8');
      expect(html).toContain('assets/icons/favicon.svg');
      expect(html).toContain('assets/icons/apple-touch-icon.png');
      expect(html).toContain('assets/icons/icon-32.png');
      expect(html).toContain('assets/icons/icon-16.png');
    });

    it('verifies sw.js caches the new icons and bumps cache version', () => {
      const sw = fs.readFileSync(swPath, 'utf8');
      expect(sw).toContain('CACHE_NAME = \'sikat-v2.4\'');
      expect(sw).toContain('./assets/icons/icon-maskable-512.png');
      expect(sw).toContain('./assets/icons/favicon.svg');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // BAGIAN C — TAMPILAN LOGIN DAN DAFTAR AKUN BARU
  // ══════════════════════════════════════════════════════════════
  describe('BAGIAN C: Tampilan Login dan Daftar Akun Baru', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('verifies login view has no placeholders, no emojis, and proper autocomplete', () => {
      const html = renderLogin();
      expect(html).toContain('Masuk ke Akun');
      expect(html).not.toMatch(/placeholder=/i);
      expect(html).toContain('autocomplete="username"');
      expect(html).toContain('autocomplete="current-password"');
      expect(html).toContain('Tampilkan password');
      expect(html).toContain('Masuk</button>');
      expect(html).not.toContain('🔑');
      expect(html).not.toContain('✅');
      expect(html).toContain('SIKAT');
      expect(html).toContain('Sistem Informasi Kas Ayam Ternak');
    });

    it('verifies register view has no placeholders, correct column order, and no emojis', () => {
      const html = renderRegister();
      expect(html).toContain('Daftar Akun Baru');
      expect(html).not.toMatch(/placeholder=/i);
      expect(html).toContain('autocomplete="name"');
      expect(html).toContain('autocomplete="organization"');
      expect(html).toContain('autocomplete="email"');
      expect(html).toContain('autocomplete="new-password"');
      expect(html).toContain('Tampilkan password');
      expect(html).toContain('Daftar &amp; Masuk');
      expect(html).not.toContain('✅');

      // Verify column order: Nama Admin -> Nama Usaha -> Email -> Password
      const posNama = html.indexOf('id="reg-nama"');
      const posUsaha = html.indexOf('id="reg-usaha"');
      const posEmail = html.indexOf('id="reg-email"');
      const posPw = html.indexOf('id="reg-password"');

      expect(posNama).toBeGreaterThan(-1);
      expect(posUsaha).toBeGreaterThan(posNama);
      expect(posEmail).toBeGreaterThan(posUsaha);
      expect(posPw).toBeGreaterThan(posEmail);
    });

    it('verifies AuthService hashes password and saves namaUsaha to profile', async () => {
      const regRes = await AuthService.register({
        email: 'peternak@toreinatei.id',
        password: 'password123',
        namaAdmin: 'Yolanda Wambrauw',
        namaUsaha: 'BUMKam Mandiri Torei'
      });

      expect(regRes.ok).toBe(true);
      expect(regRes.user.password).not.toBe('password123');
      expect(regRes.user.password.length).toBeGreaterThan(20);

      // Verify profile settings saved
      expect(localStorage.getItem('sikat_profil_nama')).toBe('Yolanda Wambrauw');
      expect(localStorage.getItem('sikat_profil_usaha')).toBe('BUMKam Mandiri Torei');

      // Verify login with correct credentials
      const loginRes = await AuthService.login({
        email: 'peternak@toreinatei.id',
        password: 'password123'
      });
      expect(loginRes.ok).toBe(true);
      expect(AuthService.isLoggedIn()).toBe(true);

      // Verify login with wrong credentials
      const badLogin = await AuthService.login({
        email: 'peternak@toreinatei.id',
        password: 'wrongpassword'
      });
      expect(badLogin.ok).toBe(false);
      expect(badLogin.error).toBe('Email atau password salah.');
    });

    it('verifies Indonesian validation errors in AuthService', async () => {
      const resBadEmail = await AuthService.register({
        email: 'invalid-email',
        password: 'password123',
        namaAdmin: 'Admin',
      });
      expect(resBadEmail.ok).toBe(false);
      expect(resBadEmail.error).toContain('Format email tidak valid');

      const resShortPw = await AuthService.register({
        email: 'admin@bumkam.id',
        password: '123',
        namaAdmin: 'Admin',
      });
      expect(resShortPw.ok).toBe(false);
      expect(resShortPw.error).toBe('Password minimal 6 karakter.');

      // Register successfully then test duplicate
      await AuthService.register({
        email: 'admin@bumkam.id',
        password: 'password123',
        namaAdmin: 'Admin',
      });

      const resDuplicate = await AuthService.register({
        email: 'admin@bumkam.id',
        password: 'password123',
        namaAdmin: 'Admin',
      });
      expect(resDuplicate.ok).toBe(false);
      expect(resDuplicate.error).toBe('Akun sudah terdaftar. Silakan login.');
    });
  });
});
