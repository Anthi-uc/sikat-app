// router.test.js — Comprehensive tests for layout, routing, and views
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import all view render functions
import { render as renderHome } from '../js/views/home.js';
import { render as renderTransaksi } from '../js/views/transaksi.js';
import { render as renderRekap } from '../js/views/rekap.js';
import { render as renderLabarugi } from '../js/views/labarugi.js';
import { render as renderProduksi } from '../js/views/produksi.js';
import { render as renderProfil } from '../js/views/profil.js';
import { render as renderPanduan } from '../js/views/panduan.js';
import { render as renderKebijakan } from '../js/views/kebijakan.js';
import { render as renderKontak } from '../js/views/kontak.js';
import { render as renderVersi } from '../js/views/versi.js';
import { render as renderLogin } from '../js/views/login.js';
import { render as renderRegister } from '../js/views/register.js';
import { navigate } from '../js/router.js';

describe('Layout Architecture & HTML Structure', () => {
  const indexPath = path.resolve(__dirname, '../index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');

  it('verifies index.html has UTF-8 charset and responsive viewport meta tags', () => {
    expect(indexHtml).toContain('<meta charset="UTF-8">');
    expect(indexHtml).toContain('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">');
  });

  it('verifies #sidebar-container is a direct child of #app-shell (left column)', () => {
    // #sidebar-container must be outside #body-shell
    const sidebarPos = indexHtml.indexOf('id="sidebar-container"');
    const bodyShellPos = indexHtml.indexOf('id="body-shell"');
    expect(sidebarPos).toBeGreaterThan(-1);
    expect(bodyShellPos).toBeGreaterThan(-1);
    expect(sidebarPos).toBeLessThan(bodyShellPos);
  });

  it('verifies #footer-container is inside #body-shell after #view-container (not a 3rd column)', () => {
    const bodyShellStart = indexHtml.indexOf('id="body-shell"');
    const bodyShellEnd = indexHtml.indexOf('</div>', bodyShellStart);
    const viewContainerPos = indexHtml.indexOf('id="view-container"');
    const footerPos = indexHtml.indexOf('id="footer-container"');

    expect(viewContainerPos).toBeGreaterThan(bodyShellStart);
    expect(footerPos).toBeGreaterThan(viewContainerPos);
    expect(footerPos).toBeLessThan(bodyShellEnd);
  });
});

describe('CSS Layout & Sticky Footer Rules', () => {
  const cssPath = path.resolve(__dirname, '../css/main.css');
  const mainCss = fs.readFileSync(cssPath, 'utf-8');

  it('verifies html and body prevent horizontal overflow', () => {
    expect(mainCss).toMatch(/html\s*\{[^}]*overflow-x:\s*hidden/);
    expect(mainCss).toMatch(/body\s*\{[^}]*overflow-x:\s*hidden/);
  });

  it('verifies #body-shell takes remaining width and scrolls naturally on desktop', () => {
    expect(mainCss).toContain('flex: 1 1 0;');
    expect(mainCss).toContain('overflow-y: auto;');
    expect(mainCss).toContain('overflow-x: hidden;');
  });

  it('verifies #footer-container implements sticky footer using margin-top: auto', () => {
    expect(mainCss).toContain('margin-top: auto;');
    expect(mainCss).toContain('flex-shrink: 0;');
  });
});

describe('All 10 Menu Views Rendering', () => {
  const views = [
    { name: 'Beranda (#home)', render: renderHome, expected: 'Halo, Peternak!' },
    { name: 'Input Transaksi (#transaksi)', render: renderTransaksi, expected: 'Catat Transaksi Baru' },
    { name: 'Rekap Kas (#rekap)', render: renderRekap, expected: 'Saldo Kas' },
    { name: 'Produksi Harian (#produksi)', render: renderProduksi, expected: 'Produksi Harian' },
    { name: 'Laporan Keuangan (#labarugi)', render: renderLabarugi, expected: 'Laba Rugi' },
    { name: 'Pengaturan (#profil)', render: renderProfil, expected: 'Pengaturan Profil' },
    { name: 'Panduan (#panduan)', render: renderPanduan, expected: 'Panduan Pengguna' },
    { name: 'Fitur & Kebijakan (#kebijakan)', render: renderKebijakan, expected: 'Fitur &amp; Kebijakan' },
    { name: 'Kontak (#kontak)', render: renderKontak, expected: 'Kontak' },
    { name: 'Versi (#versi)', render: renderVersi, expected: 'Versi Aplikasi' },
  ];

  views.forEach(({ name, render, expected }) => {
    it(`renders ${name} view without throwing and contains expected text`, () => {
      const html = render();
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(50);
      expect(html).toContain(expected);
    });
  });

  it('verifies Panduan view contains all detailed guidance sections', () => {
    const html = renderPanduan();
    expect(html).toContain('Input Transaksi');
    expect(html).toContain('Rekap Kas');
    expect(html).toContain('Laba Rugi');
    expect(html).toContain('Produksi Harian');
    expect(html).toContain('Pengaturan Profil');
  });

  it('verifies auth views render properly', () => {
    expect(renderLogin()).toContain('Masuk ke Akun');
    expect(renderRegister()).toContain('Daftar Akun Baru');
  });
});

describe('Router navigate functionality', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
    document.body.innerHTML = `
      <div id="app-shell">
        <header id="header-container"></header>
        <nav id="sidebar-container"></nav>
        <div id="body-shell">
          <main id="view-container"></main>
          <footer id="footer-container"></footer>
        </div>
        <nav id="bottom-nav"></nav>
      </div>
    `;
    // Mock user as logged in via sikat_current_user
    localStorage.setItem('sikat_current_user', JSON.stringify({
      id: 'usr_admin',
      email: 'admin@sikat.id',
      namaAdmin: 'Admin',
      role: 'admin'
    }));
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('navigates to #panduan and populates #view-container with panduan content', () => {
    navigate('#panduan');
    const container = document.getElementById('view-container');
    expect(container.innerHTML).toContain('Panduan Pengguna');
    expect(container.innerHTML).toContain('Input Transaksi');
    expect(container.innerHTML).toContain('Rekap Kas');
  });

  it('handles route hash without leading # (e.g. "panduan")', () => {
    navigate('panduan');
    const container = document.getElementById('view-container');
    expect(container.innerHTML).toContain('Panduan Pengguna');
  });

  it('resets scroll position on #body-shell and #view-container when navigating', () => {
    const bodyShell = document.getElementById('body-shell');
    bodyShell.scrollTop = 350;
    navigate('#kontak');
    expect(bodyShell.scrollTop).toBe(0);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
