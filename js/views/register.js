// register.js — Halaman Pendaftaran Akun SIKAT

import { AuthService } from '../auth.js';
import { navigate } from '../router.js';
import { renderHeader, logoSVG } from '../app.js';
import { StorageService } from '../storage.js';
import { getProfilEscaped } from '../profil-usaha.js';

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
          <h2 class="auth-form-title">Daftar Akun Baru</h2>

          <form id="form-register" novalidate>
            <!-- 1. Nama Admin / Peternak -->
            <div class="form-group">
              <label class="form-label" for="reg-nama">Nama Admin / Peternak</label>
              <input class="form-control" type="text" id="reg-nama"
                maxlength="50" autocomplete="name" required>
              <span class="form-error" id="err-reg-nama" hidden></span>
            </div>

            <!-- 2. Nama Usaha / BUMKam -->
            <div class="form-group">
              <label class="form-label" for="reg-usaha">Nama Usaha / BUMKam</label>
              <input class="form-control" type="text" id="reg-usaha"
                maxlength="60" autocomplete="organization">
              <span class="form-error" id="err-reg-usaha" hidden></span>
            </div>

            <!-- 3. Email -->
            <div class="form-group">
              <label class="form-label" for="reg-email">Email</label>
              <input class="form-control" type="email" id="reg-email"
                autocomplete="email" required>
              <span class="form-error" id="err-reg-email" hidden></span>
            </div>

            <!-- 4. Password -->
            <div class="form-group">
              <label class="form-label" for="reg-password">Password</label>
              <input class="form-control" type="password" id="reg-password"
                autocomplete="new-password" required>
              <span class="form-error" id="err-reg-password" hidden></span>
            </div>

            <!-- Tampilkan password (tanpa ikon) -->
            <div class="auth-show-password">
              <label class="checkbox-label" for="reg-toggle-pw">
                <input type="checkbox" id="reg-toggle-pw">
                <span>Tampilkan password</span>
              </label>
            </div>

            <span class="form-error" id="err-reg-global" hidden style="display:none;margin-top:var(--space-2);margin-bottom:var(--space-3);text-align:center;"></span>

            <button type="submit" class="btn btn-primary btn-full auth-submit-btn">
              Daftar &amp; Masuk
            </button>
          </form>

          <p class="auth-footer-prompt">
            Sudah punya akun?
            <a href="#login" id="link-ke-login" class="auth-link">
              Masuk di sini
            </a>
          </p>
        </div>

        <p class="auth-copyright">
          &copy; 2026 ${getProfilEscaped().namaBumkam} &bull; SIKAT
        </p>
      </div>
    </div>
  `;
}

export function attachListeners(params = {}) {
  const form      = document.getElementById('form-register');
  const errGlobal = document.getElementById('err-reg-global');
  const togglePw  = document.getElementById('reg-toggle-pw');
  const pwInput   = document.getElementById('reg-password');

  // Toggle tampilkan password
  if (togglePw && pwInput) {
    togglePw.addEventListener('change', () => {
      pwInput.type = togglePw.checked ? 'text' : 'password';
    });
  }

  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.removeAttribute('hidden'); el.style.display = 'block'; }
    const inputId = id.replace('err-reg-', 'reg-');
    const inp = document.getElementById(inputId);
    if (inp) inp.classList.add('is-invalid');
  }

  function clearErrs() {
    ['err-reg-nama','err-reg-usaha','err-reg-email','err-reg-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.setAttribute('hidden',''); el.style.display = 'none'; }
      const inp = document.getElementById(id.replace('err-reg-', 'reg-'));
      if (inp) inp.classList.remove('is-invalid');
    });
    if (errGlobal) { errGlobal.textContent = ''; errGlobal.setAttribute('hidden',''); errGlobal.style.display = 'none'; }
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrs();

      const nama     = document.getElementById('reg-nama').value.trim();
      const usaha    = document.getElementById('reg-usaha').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      let hasErr = false;
      if (!nama) {
        showErr('err-reg-nama', 'Nama admin / peternak wajib diisi.');
        hasErr = true;
      }

      if (!email) {
        showErr('err-reg-email', 'Email wajib diisi.');
        hasErr = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showErr('err-reg-email', 'Format email tidak valid (contoh: nama@domain.com).');
        hasErr = true;
      }

      if (!password) {
        showErr('err-reg-password', 'Password wajib diisi.');
        hasErr = true;
      } else if (password.length < 6) {
        showErr('err-reg-password', 'Password minimal 6 karakter.');
        hasErr = true;
      }

      if (hasErr) return;

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Mendaftarkan...'; }

      try {
        const result = await AuthService.register({ email, password, namaAdmin: nama, namaUsaha: usaha });
        if (!result.ok) {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Daftar & Masuk'; }
          if (result.field === 'email') {
            showErr('err-reg-email', result.error);
          } else if (result.field === 'password') {
            showErr('err-reg-password', result.error);
          } else if (result.field === 'namaAdmin') {
            showErr('err-reg-nama', result.error);
          } else if (errGlobal) {
            errGlobal.textContent = result.error || 'Pendaftaran gagal.';
            errGlobal.removeAttribute('hidden');
            errGlobal.style.display = 'block';
          }
          return;
        }

        // Registrasi & login berhasil — bersihkan mode auth dan ke #home
        document.body.classList.remove('auth-page');
        try { StorageService.initDummyData(); } catch {}
        renderHeader();
        navigate('#home');
      } catch (err) {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Daftar & Masuk'; }
        if (errGlobal) {
          errGlobal.textContent = 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.';
          errGlobal.removeAttribute('hidden');
          errGlobal.style.display = 'block';
        }
      }
    });
  }

  const linkLogin = document.getElementById('link-ke-login');
  if (linkLogin) {
    linkLogin.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('#login');
    });
  }
}
