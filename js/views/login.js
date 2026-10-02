// login.js — Halaman Login SIKAT

import { AuthService } from '../auth.js';
import { navigate } from '../router.js';
import { renderHeader, logoSVG } from '../app.js';
import { StorageService } from '../storage.js';

export function render(params = {}) {
  return `
    <div class="auth-page-wrapper">
      <div class="auth-card">

        <!-- Logo & Header SIKAT -->
        <div class="auth-brand">
          <div class="auth-logo-badge" aria-hidden="true">
            ${logoSVG(52, 'compact')}
          </div>
          <h1 class="auth-brand-name">SIKAT</h1>
          <p class="auth-brand-subtitle">Sistem Informasi Kas Ayam Ternak</p>
        </div>

        <div class="auth-form-card">
          <h2 class="auth-form-title">Masuk ke Akun</h2>

          <form id="form-login" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-email">Email</label>
              <input class="form-control" type="email" id="login-email"
                autocomplete="username" required>
              <span class="form-error" id="err-login-email" hidden></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <input class="form-control" type="password" id="login-password"
                autocomplete="current-password" required>
              <span class="form-error" id="err-login-password" hidden></span>
            </div>

            <!-- Tampilkan password (tanpa ikon) -->
            <div class="auth-show-password">
              <label class="checkbox-label" for="login-toggle-pw">
                <input type="checkbox" id="login-toggle-pw">
                <span>Tampilkan password</span>
              </label>
            </div>

            <span class="form-error" id="err-login-global" hidden style="display:none;margin-top:var(--space-2);margin-bottom:var(--space-3);text-align:center;"></span>

            <button type="submit" class="btn btn-primary btn-full auth-submit-btn">Masuk</button>
          </form>

          <p class="auth-footer-prompt">
            Belum punya akun?
            <a href="#register" id="link-ke-register" class="auth-link">
              Daftar di sini
            </a>
          </p>
        </div>

        <p class="auth-copyright">
          &copy; 2026 BUMKam Torei Natei &bull; SIKAT
        </p>
      </div>
    </div>
  `;
}

export function attachListeners(params = {}) {
  const form       = document.getElementById('form-login');
  const errGlobal  = document.getElementById('err-login-global');
  const togglePw   = document.getElementById('login-toggle-pw');
  const pwInput    = document.getElementById('login-password');

  // Toggle tampilkan password
  if (togglePw && pwInput) {
    togglePw.addEventListener('change', () => {
      pwInput.type = togglePw.checked ? 'text' : 'password';
    });
  }

  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.removeAttribute('hidden'); el.style.display = 'block'; }
    const inp = document.getElementById(id.replace('err-login-', 'login-'));
    if (inp) inp.classList.add('is-invalid');
  }

  function clearErrs() {
    ['err-login-email','err-login-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.setAttribute('hidden',''); el.style.display = 'none'; }
      const inp = document.getElementById(id.replace('err-login-', 'login-'));
      if (inp) inp.classList.remove('is-invalid');
    });
    if (errGlobal) { errGlobal.textContent = ''; errGlobal.setAttribute('hidden',''); errGlobal.style.display = 'none'; }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrs();

      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      let hasErr = false;
      if (!email) {
        showErr('err-login-email', 'Email wajib diisi.');
        hasErr = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showErr('err-login-email', 'Format email tidak valid (contoh: nama@domain.com).');
        hasErr = true;
      }

      if (!password) {
        showErr('err-login-password', 'Password wajib diisi.');
        hasErr = true;
      }

      if (hasErr) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Memproses...'; }

      try {
        const result = await AuthService.login({ email, password });
        if (!result.ok) {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Masuk'; }
          showErr('err-login-password', result.error || 'Email atau password salah.');
          return;
        }

        // Login berhasil — bersihkan mode auth dan ke #home
        document.body.classList.remove('auth-page');
        try { StorageService.initDummyData(); } catch {}
        renderHeader();
        navigate('#home');
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Masuk'; }
        if (errGlobal) {
          errGlobal.textContent = 'Terjadi kesalahan saat masuk. Silakan coba lagi.';
          errGlobal.removeAttribute('hidden');
          errGlobal.style.display = 'block';
        }
      }
    });
  }

  // Link ke halaman register
  const linkRegister = document.getElementById('link-ke-register');
  if (linkRegister) {
    linkRegister.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('#register');
    });
  }
}
