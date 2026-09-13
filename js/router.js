// router.js — Hash-based SPA router

import { render as renderHome, attachListeners as attachListenersHome } from './views/home.js';
import { render as renderTransaksi, attachListeners as attachListenersTransaksi } from './views/transaksi.js';
import { render as renderRekap, attachListeners as attachListenersRekap } from './views/rekap.js';
import { render as renderLabarugi, attachListeners as attachListenersLabarugi } from './views/labarugi.js';
import { render as renderProduksi, attachListeners as attachListenersProduksi } from './views/produksi.js';
import { render as renderProfil, attachListeners as attachListenersProfil } from './views/profil.js';
import { render as renderPanduan, attachListeners as attachListenersPanduan } from './views/panduan.js';
import { render as renderKebijakan, attachListeners as attachListenersKebijakan } from './views/kebijakan.js';
import { render as renderKontak, attachListeners as attachListenersKontak } from './views/kontak.js';
import { render as renderVersi, attachListeners as attachListenersVersi } from './views/versi.js';
import { render as renderLogin, attachListeners as attachListenersLogin } from './views/login.js';
import { render as renderRegister, attachListeners as attachListenersRegister } from './views/register.js';
import { AuthService } from './auth.js';

// ─── Route Maps ─────────────────────────────────────────────────────────────

const ROUTES = {
  '#home':      renderHome,
  '#transaksi': renderTransaksi,
  '#rekap':     renderRekap,
  '#labarugi':  renderLabarugi,
  '#produksi':  renderProduksi,
  '#profil':    renderProfil,
  '#panduan':   renderPanduan,
  '#kebijakan': renderKebijakan,
  '#kontak':    renderKontak,
  '#versi':     renderVersi,
  '#login':     renderLogin,
  '#register':  renderRegister,
};

const LISTENERS = {
  '#home':      attachListenersHome,
  '#transaksi': attachListenersTransaksi,
  '#rekap':     attachListenersRekap,
  '#labarugi':  attachListenersLabarugi,
  '#produksi':  attachListenersProduksi,
  '#profil':    attachListenersProfil,
  '#panduan':   attachListenersPanduan,
  '#kebijakan': attachListenersKebijakan,
  '#kontak':    attachListenersKontak,
  '#versi':     attachListenersVersi,
  '#login':     attachListenersLogin,
  '#register':  attachListenersRegister,
};

// Route yang boleh diakses tanpa login
const PUBLIC_ROUTES = new Set(['#login', '#register']);

// ─── 404 View ────────────────────────────────────────────────────────────────

function render404(params = {}) {
  return `
    <div class="not-found-container" style="text-align:center;padding:3rem 1rem;">
      <h2 style="font-size:2rem;margin-bottom:0.5rem;">404</h2>
      <h3 style="margin-bottom:1rem;">Halaman Tidak Ditemukan</h3>
      <p style="color:#6b7280;margin-bottom:2rem;">
        Halaman yang Anda cari tidak tersedia atau alamat tidak valid.
      </p>
      <button
        class="btn-primary"
        onclick="import('./router.js').then(m => m.navigate('#home'))"
        style="padding:0.75rem 1.5rem;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:1rem;"
      >
        ← Kembali ke Menu Utama
      </button>
    </div>
  `;
}

// ─── attachViewListeners ─────────────────────────────────────────────────────

/**
 * Call the correct view's attachListeners function, if it exists.
 * @param {string} hash
 * @param {Object} params
 */
function attachViewListeners(hash, params = {}) {
  const listenerFn = LISTENERS[hash];
  if (typeof listenerFn === 'function') {
    try {
      listenerFn(params);
    } catch (e) {
      console.error(`[Router] Gagal memasang event listener untuk ${hash}:`, e);
    }
  }
}

// ─── navigate ────────────────────────────────────────────────────────────────

/**
 * Navigate to a hash route, rendering the appropriate view.
 * @param {string} hash  - e.g. '#home'
 * @param {Object} params - optional params passed to the view's render/attachListeners
 */
export function navigate(hash, params = {}) {
  // ── Navigation Guard ────────────────────────────────────────────────────
  if (!PUBLIC_ROUTES.has(hash) && !AuthService.isLoggedIn()) {
    hash = '#login';
    params = {};
  }
  // Jika sudah login dan coba akses login/register, redirect ke #home
  if (PUBLIC_ROUTES.has(hash) && AuthService.isLoggedIn()) {
    hash = '#home';
    params = {};
  }

  const renderFn = ROUTES[hash] ?? render404;

  // Render the view
  const container = document.getElementById('view-container');
  if (container) {
    container.innerHTML = renderFn(params);
  }

  // Push to browser history only when the URL is actually changing
  if (location.hash !== hash) {
    history.pushState({ hash, params }, '', hash);
  }

  // Attach view-specific event listeners
  attachViewListeners(hash, params);

  // Scroll to top
  window.scrollTo(0, 0);
}

// ─── pushState ───────────────────────────────────────────────────────────────

/**
 * Update the URL to hash without triggering a navigation/re-render.
 * @param {string} hash
 */
export function pushState(hash) {
  history.pushState({ hash, params: {} }, '', hash);
}

// ─── Event Listeners (module-level) ─────────────────────────────────────────

window.addEventListener('hashchange', () => {
  navigate(location.hash || '#home');
});

window.addEventListener('popstate', (e) => {
  const hash = e.state?.hash || location.hash || '#home';
  const params = e.state?.params || {};

  // Re-render WITHOUT pushing to history again
  const renderFn = ROUTES[hash] ?? render404;
  const container = document.getElementById('view-container');
  if (container) {
    container.innerHTML = renderFn(params);
  }
  attachViewListeners(hash, params);
  window.scrollTo(0, 0);
});
