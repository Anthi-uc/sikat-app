// login.js — Halaman Login

import { AuthService } from '../auth.js';
import { navigate } from '../router.js';
import { renderHeader } from '../app.js';
import { StorageService } from '../storage.js';

export function render(params = {}) {
  return `
    <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;padding:var(--space-4);">
      <div style="width:100%;max-width:400px;">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:var(--space-6);">
          <div style="width:64px;height:64px;background:var(--color-primary);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:var(--space-3);position:relative;">
            <span style="width:28px;height:28px;background:white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:block;"></span>
          </div>
          <h1 style="font-size:var(--font-size-2xl);font-weight:700;color:var(--color-primary);">SIKAT</h1>
          <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">Sistem Informasi Kas Ayam Ternak</p>
        </div>

        <div class="card">
          <h2 style="font-size:var(--font-size-lg);font-weight:700;margin-bottom:var(--space-5);text-align:center;">Masuk ke Akun</h2>

          <form id="form-login" novalidate>
            <div class="form-group">
              <label class="form-label" for="login-email">Email</label>
              <input class="form-control" type="email" id="login-email"
                placeholder="contoh@email.com" autocomplete="email">
              <span class="form-error" id="err-login-email" hidden></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="login-password">Password</label>
              <input class="form-control" type="password" id="login-password"
                placeholder="Minimal 6 karakter" autocomplete="current-password">
              <span class="form-error" id="err-login-password" hidden></span>
            </div>

            <span class="form-error" id="err-login-global" hidden style="display:block;margin-bottom:var(--space-3);"></span>

            <button type="submit" class="btn btn-primary btn-full" style="margin-top:var(--space-2);">
              🔑 Masuk
            </button>
          </form>

          <p style="text-align:center;margin-top:var(--space-4);font-size:var(--font-size-sm);color:var(--color-text-muted);">
            Belum punya akun?
            <a href="#register" id="link-ke-register" style="color:var(--color-primary);font-weight:600;cursor:pointer;">
              Daftar di sini
            </a>
          </p>
        </div>

        <p style="text-align:center;margin-top:var(--space-4);font-size:var(--font-size-xs);color:var(--color-text-muted);">
          &copy; 2026 BUMKam Torei Natei &bull; SIKAT
        </p>
      </div>
    </div>
  `;
}

export function attachListeners(params = {}) {
  const form       = document.getElementById('form-login');
  const errGlobal  = document.getElementById('err-login-global');

  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.removeAttribute('hidden'); }
    const inp = document.getElementById(id.replace('err-login-', 'login-'));
    if (inp) inp.classList.add('is-invalid');
  }
  function clearErrs() {
    ['err-login-email','err-login-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.setAttribute('hidden',''); }
      const inp = document.getElementById(id.replace('err-login-', 'login-'));
      if (inp) inp.classList.remove('is-invalid');
    });
    if (errGlobal) { errGlobal.textContent = ''; errGlobal.setAttribute('hidden',''); errGlobal.style.display = 'none'; }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrs();

      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email)    { showErr('err-login-email',    'Email wajib diisi.'); return; }
      if (!password) { showErr('err-login-password', 'Password wajib diisi.'); return; }

      const result = AuthService.login({ email, password });
      if (!result.ok) {
        if (errGlobal) {
          errGlobal.textContent = result.error;
          errGlobal.removeAttribute('hidden');
          errGlobal.style.display = 'block';
        }
        return;
      }

      // Login berhasil — perbarui header lalu ke #home
      try { StorageService.initDummyData(); } catch {}
      renderHeader();
      navigate('#home');
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
