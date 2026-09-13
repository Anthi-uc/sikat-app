// js/app.js — Entry point aplikasi SIKAT; inisialisasi header, footer, router, dan service worker

import { navigate } from './router.js';
import { StorageService } from './storage.js';
import { getNamaAdmin, getFotoProfil, DEFAULT_AVATAR_SVG } from './views/profil.js';

// ─── Helpers tanggal ─────────────────────────────────────────────────────────
const _HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const _BULAN = ['Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalIndonesia() {
  const d  = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  return `${_HARI[d.getDay()]}, ${dd} ${_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Header ───────────────────────────────────────────────────────────────────

/**
 * Render (atau re-render) seluruh header.
 * @param {{ authMode?: boolean }} opts
 *   authMode = true → tampilkan header minimalis tanpa info profil (untuk #login / #register)
 */
export function renderHeader(opts = {}) {
  const container = document.getElementById('header-container');
  if (!container) return;

  if (opts.authMode) {
    // ── Mode auth: header bersih tanpa zona user ──────────────────────────
    container.innerHTML = `
      <nav class="header header--auth" role="navigation" aria-label="Navigasi utama">
        <div class="header-logo" aria-label="SIKAT">
          <div class="header-logo-icon" aria-hidden="true"></div>
          <div class="header-brand">
            <span class="header-brand-name">SIKAT</span>
            <span class="header-brand-tagline">Sistem Informasi Kas Ayam Ternak</span>
          </div>
        </div>
      </nav>
    `;
    return;
  }

  // ── Mode dashboard: header lengkap dengan profil ──────────────────────────
  const tanggal = formatTanggalIndonesia();
  const nama    = getNamaAdmin();
  const foto    = getFotoProfil();

  const avatarInner = foto
    ? `<span id="avatar-img" style="display:block;width:36px;height:36px;border-radius:50%;background-image:url('${foto}');background-size:cover;background-position:center;" aria-hidden="true"></span>`
    : `<img id="avatar-img" src="${DEFAULT_AVATAR_SVG}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;

  container.innerHTML = `
    <nav class="header" role="navigation" aria-label="Navigasi utama">
      <a class="header-logo" id="logo-btn" href="#home" aria-label="Kembali ke Menu Utama">
        <div class="header-logo-icon" aria-hidden="true"></div>
        <div class="header-brand">
          <span class="header-brand-name">SIKAT</span>
          <span class="header-brand-tagline">Sistem Informasi Kas Ayam Ternak</span>
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
    </nav>
  `;

  container.querySelector('#logo-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    import('./router.js').then(({ navigate: nav }) => nav('#home'));
  });
  container.querySelector('#avatar-btn')?.addEventListener('click', () => {
    import('./router.js').then(({ navigate: nav }) => nav('#profil'));
  });
}

/**
 * Perbarui zona profil header secara parsial — TIDAK menyentuh teks tanggal/nama.
 * Dipanggil setelah simpan profil berhasil.
 * @param {{ nama?: string, foto?: string|null }} updates
 */
export function updateHeaderProfile(updates = {}) {
  // Nama
  if (updates.nama !== undefined) {
    const el = document.getElementById('header-nama');
    if (el) el.textContent = `${updates.nama} \u2022 Admin`;
  }

  // Avatar foto
  if (updates.foto !== undefined) {
    const btn = document.getElementById('avatar-btn');
    if (!btn) return;
    if (updates.foto) {
      btn.innerHTML = `<span id="avatar-img" style="display:block;width:36px;height:36px;border-radius:50%;background-image:url('${updates.foto}');background-size:cover;background-position:center;" aria-hidden="true"></span>`;
    } else {
      btn.innerHTML = `<img id="avatar-img" src="${DEFAULT_AVATAR_SVG}" alt="Avatar" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;
    }
  }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Task 7.2 — Footer ───────────────────────────────────────────────────────

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
    </footer>
  `;

  // Footer link navigation
  container.querySelectorAll('a[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const hash = link.getAttribute('data-nav');
      import('./router.js').then(({ navigate }) => navigate(hash));
    });
  });
}

// ─── Task 7.4 — Notifications ────────────────────────────────────────────────

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number|false} autoHide - ms before auto-dismiss; false = never auto-hide
 */
export function showNotification(message, type = 'success', autoHide = 3000) {
  const container = document.getElementById('notification-container');
  if (!container) {
    console.warn('[Notification]', type, message);
    return;
  }

  const toast = document.createElement('div');
  toast.className = `notification notification-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const icon = icons[type] ?? 'ℹ️';

  toast.innerHTML = `
    <span class="notification-icon" aria-hidden="true">${icon}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close" aria-label="Tutup notifikasi">&times;</button>
  `;

  // Close button removes the toast
  toast.querySelector('.notification-close').addEventListener('click', () => {
    toast.remove();
  });

  container.appendChild(toast);

  // Auto-hide logic per type
  if (type === 'success' && autoHide !== false) {
    setTimeout(() => toast.remove(), autoHide === true ? 3000 : (autoHide || 3000));
  } else if (type === 'warning' && autoHide !== false) {
    setTimeout(() => toast.remove(), autoHide === true ? 5000 : (autoHide || 5000));
  } else if (type === 'error') {
    // errors do NOT auto-hide — user must close manually
  } else if (autoHide && autoHide !== false) {
    setTimeout(() => toast.remove(), autoHide);
  }
}

// ─── App Initialisation ──────────────────────────────────────────────────────

function initApp() {
  // 1. Render footer (selalu tampil); header dirender setelah auth check
  renderFooter();

  // 2. Splash screen
  const splash   = document.getElementById('splash-screen');
  const appShell = document.getElementById('app-shell');

  function afterSplash() {
    if (splash)   splash.setAttribute('hidden', '');
    if (appShell) appShell.removeAttribute('hidden');

    // 3. Auth check: jika belum login → header bersih + #login
    import('./auth.js').then(({ AuthService }) => {
      if (!AuthService.isLoggedIn()) {
        renderHeader({ authMode: true });
        navigate('#login');
        return;
      }
      // Sudah login — header dengan profil
      renderHeader();
      // Init dummy data untuk user aktif
      try { StorageService.initDummyData(); } catch (e) { console.error('Init error:', e); }

      const targetHash = (location.hash && location.hash !== '#') ? location.hash : '#home';
      navigate(targetHash);
    });

    // Register service worker
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

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
