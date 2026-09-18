// js/app.js — Entry point SIKAT; sidebar, mobile header, bottom nav, notifications

import { navigate } from './router.js';
import { StorageService } from './storage.js';
import { getNamaAdmin, getFotoProfil, DEFAULT_AVATAR_SVG } from './views/profil.js';

// ─── SVG Logo ────────────────────────────────────────────────────────────────

/**
 * Returns the inline SVG for the SIKAT "S" logo.
 * @param {number} size  — viewBox/width in px (height auto)
 * @param {'full'|'compact'} variant
 *   full    = S-mark + "SIKAT" text below (used in sidebar)
 *   compact = S-mark only (used in mobile header)
 */
export function logoSVG(size = 48, variant = 'compact') {
  if (variant === 'full') {
    // Full: S shape + SIKAT wordmark below
    return `
      <svg width="${size}" height="${Math.round(size * 1.35)}" viewBox="0 0 80 108"
           xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="sidebar-logo-svg">
        <!-- S shape -->
        <path d="M54 22c0-5.5-4.5-10-10-10H30c-5.5 0-10 4.5-10 10
                 c0 4 2.4 7.5 6 9.2l12.5 6.3c1.7.85 2.5 2.1 2.5 3.75
                 S39.7 44 38 44.8L25.5 51.2C23.5 52.2 22 54.5 22 57
                 c0 5.5 4.5 10 10.3 10H50c5.5 0 10-4.5 10-10"
              stroke="#0d9488" stroke-width="6.5" stroke-linecap="round"
              stroke-linejoin="round" fill="none"/>
        <!-- Citrine accent dot -->
        <circle cx="57" cy="57" r="6" fill="#eab308"/>
        <!-- SIKAT wordmark -->
        <text x="40" y="100" text-anchor="middle"
              font-family="'Inter','Segoe UI',system-ui,sans-serif"
              font-size="22" font-weight="800" letter-spacing="5"
              fill="#ffffff">SIKAT</text>
      </svg>`;
  }

  // compact: mark only — for mobile header
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64"
         xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="header-logo-svg">
      <path d="M44 18c0-4.4-3.6-8-8-8h-8c-4.4 0-8 3.6-8 8
               c0 3.2 1.9 6 4.8 7.4L34 30c1.4.7 2 1.7 2 3
               s-.6 2.4-2 3l-10 5c-2 1-3 2.8-3 4.8C21 50.2 24.8 54 29.3 54H38
               c4.4 0 8-3.6 8-8"
            stroke="#0d9488" stroke-width="5.5" stroke-linecap="round"
            stroke-linejoin="round" fill="none"/>
      <circle cx="44" cy="46" r="5" fill="#eab308"/>
    </svg>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const _BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalIndonesia() {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  return `${_HARI[d.getDay()]}, ${dd} ${_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Nav items definition ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { hash: '#home',      icon: '🏠', label: 'Beranda' },
  { hash: '#transaksi', icon: '➕', label: 'Input Transaksi' },
  { hash: '#rekap',     icon: '👛', label: 'Rekap Kas' },
  { hash: '#produksi',  icon: '🥚', label: 'Produksi Harian' },
  { hash: '#labarugi',  icon: '📊', label: 'Laporan Keuangan' },
  { hash: '#profil',    icon: '⚙️', label: 'Pengaturan' },
];

// ─── Sidebar (desktop/tablet) ─────────────────────────────────────────────────

export function renderSidebar(activeHash = '#home') {
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  const nama = getNamaAdmin();
  const foto = getFotoProfil();

  const avatarInner = foto
    ? `<span style="display:block;width:38px;height:38px;border-radius:50%;background-image:url('${foto}');background-size:cover;background-position:center;"></span>`
    : `<img src="${DEFAULT_AVATAR_SVG}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;

  const navItemsHTML = NAV_ITEMS.map(item => `
    <button class="sidebar-nav-item${activeHash === item.hash ? ' active' : ''}"
            data-hash="${item.hash}" aria-current="${activeHash === item.hash ? 'page' : 'false'}">
      <span class="nav-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </button>`).join('');

  container.innerHTML = `
    <div class="sidebar">
      <!-- Logo -->
      <a class="sidebar-logo" href="#home" id="sidebar-logo-btn" aria-label="SIKAT — Beranda">
        ${logoSVG(56, 'full')}
        <span class="sidebar-brand-tagline">Sistem Informasi Kas<br>Ayam Ternak</span>
      </a>

      <!-- User strip -->
      <div class="sidebar-user">
        <button class="sidebar-avatar" id="sidebar-avatar-btn" aria-label="Buka Pengaturan Profil">
          ${avatarInner}
        </button>
        <div class="sidebar-user-info">
          <p class="sidebar-user-name" id="sidebar-user-name">${escHtml(nama)}</p>
          <p class="sidebar-user-role">Admin</p>
        </div>
      </div>

      <!-- Navigation -->
      <p class="sidebar-section-label">Menu Utama</p>
      <nav class="sidebar-nav" aria-label="Menu utama">
        ${navItemsHTML}
      </nav>

      <div class="sidebar-divider"></div>

      <!-- Keluar -->
      <button class="sidebar-nav-item nav-logout" id="sidebar-logout-btn" aria-label="Keluar dari aplikasi">
        <span class="nav-icon" aria-hidden="true">🚪</span>
        <span>Keluar</span>
      </button>
    </div>
  `;

  // Logo → home
  container.querySelector('#sidebar-logo-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('#home');
  });

  // Avatar → profil
  container.querySelector('#sidebar-avatar-btn')?.addEventListener('click', () => {
    navigate('#profil');
  });

  // Nav items
  container.querySelectorAll('.sidebar-nav-item[data-hash]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hash = btn.getAttribute('data-hash');
      navigate(hash);
    });
  });

  // Logout
  container.querySelector('#sidebar-logout-btn')?.addEventListener('click', () => {
    if (confirm('Yakin ingin keluar dari SIKAT?')) {
      import('./auth.js').then(({ AuthService }) => {
        AuthService.logout();
        renderHeader({ authMode: true });
        navigate('#login');
      });
    }
  });
}

/**
 * Update the active state on sidebar nav items without re-rendering.
 * @param {string} hash
 */
export function setSidebarActive(hash) {
  document.querySelectorAll('#sidebar-container .sidebar-nav-item[data-hash]').forEach(btn => {
    const isActive = btn.getAttribute('data-hash') === hash;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

// ─── Bottom Navigation (mobile) ───────────────────────────────────────────────

// Only the 5 most important items fit in bottom nav
const BOTTOM_NAV_ITEMS = [
  { hash: '#home',      icon: '🏠', label: 'Beranda' },
  { hash: '#transaksi', icon: '➕', label: 'Transaksi' },
  { hash: '#rekap',     icon: '👛', label: 'Rekap' },
  { hash: '#produksi',  icon: '🥚', label: 'Produksi' },
  { hash: '#labarugi',  icon: '📊', label: 'Laporan' },
];

export function renderBottomNav(activeHash = '#home') {
  const container = document.getElementById('bottom-nav');
  if (!container) return;

  container.innerHTML = BOTTOM_NAV_ITEMS.map(item => `
    <button class="bottom-nav-item${activeHash === item.hash ? ' active' : ''}"
            data-hash="${item.hash}" aria-label="${item.label}"
            aria-current="${activeHash === item.hash ? 'page' : 'false'}">
      <span class="bn-icon" aria-hidden="true">${item.icon}</span>
      <span>${item.label}</span>
    </button>`).join('');

  container.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate(btn.getAttribute('data-hash'));
    });
  });
}

export function setBottomNavActive(hash) {
  document.querySelectorAll('#bottom-nav .bottom-nav-item').forEach(btn => {
    const isActive = btn.getAttribute('data-hash') === hash;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

// ─── Mobile Header ────────────────────────────────────────────────────────────

export function renderHeader(opts = {}) {
  const container = document.getElementById('header-container');
  if (!container) return;

  if (opts.authMode) {
    container.innerHTML = `
      <nav class="header header--auth" role="navigation" aria-label="Navigasi utama">
        <div class="header-logo" aria-label="SIKAT">
          ${logoSVG(34, 'compact')}
          <div class="header-brand">
            <span class="header-brand-name">SIKAT</span>
            <span class="header-brand-tagline">Sistem Informasi Kas Ayam Ternak</span>
          </div>
        </div>
      </nav>`;
    return;
  }

  const tanggal = formatTanggalIndonesia();
  const nama    = getNamaAdmin();
  const foto    = getFotoProfil();

  const avatarInner = foto
    ? `<span id="avatar-img" style="display:block;width:36px;height:36px;border-radius:50%;background-image:url('${foto}');background-size:cover;background-position:center;" aria-hidden="true"></span>`
    : `<img id="avatar-img" src="${DEFAULT_AVATAR_SVG}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;

  container.innerHTML = `
    <nav class="header" role="navigation" aria-label="Navigasi utama">
      <a class="header-logo" id="logo-btn" href="#home" aria-label="SIKAT — Beranda">
        ${logoSVG(34, 'compact')}
        <div class="header-brand">
          <span class="header-brand-name">SIKAT</span>
          <span class="header-brand-tagline">Kas Ayam Ternak</span>
        </div>
      </a>
      <div class="header-user">
        <div class="header-user-info" aria-live="polite">
          <div class="user-date" id="header-tanggal">${tanggal}</div>
          <div class="user-name" id="header-nama">${escHtml(nama)} &bull; Admin</div>
        </div>
        <button class="header-avatar" id="avatar-btn" aria-label="Pengaturan profil">
          ${avatarInner}
        </button>
      </div>
    </nav>`;

  container.querySelector('#logo-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigate('#home');
  });
  container.querySelector('#avatar-btn')?.addEventListener('click', () => {
    navigate('#profil');
  });
}

export function updateHeaderProfile(updates = {}) {
  if (updates.nama !== undefined) {
    const el = document.getElementById('header-nama');
    if (el) el.textContent = `${updates.nama} \u2022 Admin`;
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = updates.nama;
  }
  if (updates.foto !== undefined) {
    const btn = document.getElementById('avatar-btn');
    if (btn) {
      btn.innerHTML = updates.foto
        ? `<span id="avatar-img" style="display:block;width:36px;height:36px;border-radius:50%;background-image:url('${updates.foto}');background-size:cover;background-position:center;" aria-hidden="true"></span>`
        : `<img id="avatar-img" src="${DEFAULT_AVATAR_SVG}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;
    }
  }
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function renderFooter() {
  const container = document.getElementById('footer-container');
  if (!container) return;

  container.innerHTML = `
    <footer class="footer" role="contentinfo">
      <div class="footer-links">
        <div class="footer-col">
          <p class="footer-col-title">Aplikasi</p>
          <ul>
            <li><a href="#panduan" data-nav="#panduan">Panduan Pengguna</a></li>
            <li><a href="#kebijakan" data-nav="#kebijakan">Fitur &amp; Kebijakan</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <p class="footer-col-title">Bantuan</p>
          <ul>
            <li><a href="#kontak" data-nav="#kontak">Kontak</a></li>
            <li><a href="#versi" data-nav="#versi">Versi</a></li>
          </ul>
        </div>
      </div>
      <p class="footer-copyright">
        &copy; 2026 BUMKam Torei Natei &bull; SIKAT &bull; Sistem Informasi Kas Ayam Ternak
      </p>
    </footer>`;

  container.querySelectorAll('a[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.getAttribute('data-nav'));
    });
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function showNotification(message, type = 'success', autoHide = 3000) {
  const container = document.getElementById('notification-container');
  if (!container) { console.warn('[Notification]', type, message); return; }

  const toast = document.createElement('div');
  toast.className = `notification notification-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `
    <span class="notification-icon" aria-hidden="true">${icons[type] ?? 'ℹ️'}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close" aria-label="Tutup notifikasi">&times;</button>`;

  toast.querySelector('.notification-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  if (type === 'success' && autoHide !== false)
    setTimeout(() => toast.remove(), autoHide === true ? 3000 : (autoHide || 3000));
  else if (type === 'warning' && autoHide !== false)
    setTimeout(() => toast.remove(), autoHide === true ? 5000 : (autoHide || 5000));
  else if (type !== 'error' && autoHide && autoHide !== false)
    setTimeout(() => toast.remove(), autoHide);
}

// ─── App Initialisation ───────────────────────────────────────────────────────

function initApp() {
  renderFooter();

  const splash   = document.getElementById('splash-screen');
  const appShell = document.getElementById('app-shell');

  function afterSplash() {
    if (splash)   splash.setAttribute('hidden', '');
    if (appShell) appShell.removeAttribute('hidden');

    import('./auth.js').then(({ AuthService }) => {
      if (!AuthService.isLoggedIn()) {
        // Auth mode: show minimal mobile header, hide sidebar + bottom nav
        renderHeader({ authMode: true });
        document.getElementById('bottom-nav')?.setAttribute('hidden', '');
        navigate('#login');
        return;
      }

      // Logged in — render full navigation
      renderHeader();
      renderSidebar('#home');
      renderBottomNav('#home');
      document.getElementById('bottom-nav')?.removeAttribute('hidden');

      try { StorageService.initDummyData(); } catch (e) { console.error('Init error:', e); }

      const targetHash = (location.hash && location.hash !== '#') ? location.hash : '#home';
      navigate(targetHash);
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .catch(e => console.warn('[SW] Registration failed:', e));
      });
    }
  }

  const splashTimeout = setTimeout(afterSplash, 3000);
  setTimeout(() => { clearTimeout(splashTimeout); afterSplash(); }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
