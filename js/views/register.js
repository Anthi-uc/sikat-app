// register.js — Halaman Registrasi

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
          <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">Buat akun baru</p>
        </div>

        <div class="card">
          <h2 style="font-size:var(--font-size-lg);font-weight:700;margin-bottom:var(--space-5);text-align:center;">Daftar Akun Baru</h2>

          <form id="form-register" novalidate>
            <div class="form-group">
              <label class="form-label" for="reg-nama">Nama Admin / Peternak</label>
              <input class="form-control" type="text" id="reg-nama"
                placeholder="Contoh: Yolanda Wambrauw" maxlength="50" autocomplete="name">
              <span class="form-error" id="err-reg-nama" hidden></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-usaha">Nama Usaha / BUMKam</label>
              <input class="form-control" type="text" id="reg-usaha"
                placeholder="Contoh: BUMKam Torei Natei" maxlength="60">
              <span class="form-error" id="err-reg-usaha" hidden></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-email">Email</label>
              <input class="form-control" type="email" id="reg-email"
                placeholder="contoh@email.com" autocomplete="email">
              <span class="form-error" id="err-reg-email" hidden></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="reg-password">Password</label>
              <input class="form-control" type="password" id="reg-password"
                placeholder="Minimal 6 karakter" autocomplete="new-password">
              <span class="form-error" id="err-reg-password" hidden></span>
            </div>

            <span class="form-error" id="err-reg-global" hidden style="display:block;margin-bottom:var(--space-3);"></span>

            <button type="submit" class="btn btn-primary btn-full" style="margin-top:var(--space-2);">
              ✅ Daftar &amp; Masuk
            </button>
          </form>

          <p style="text-align:center;margin-top:var(--space-4);font-size:var(--font-size-sm);color:var(--color-text-muted);">
            Sudah punya akun?
            <a href="#login" id="link-ke-login" style="color:var(--color-primary);font-weight:600;cursor:pointer;">
              Masuk di sini
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
  const form      = document.getElementById('form-register');
  const errGlobal = document.getElementById('err-reg-global');

  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.removeAttribute('hidden'); }
    const inputId = id.replace('err-reg-', 'reg-');
    const inp = document.getElementById(inputId);
    if (inp) inp.classList.add('is-invalid');
  }
  function clearErrs() {
    ['err-reg-nama','err-reg-usaha','err-reg-email','err-reg-password'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.setAttribute('hidden',''); }
      const inp = document.getElementById(id.replace('err-reg-', 'reg-'));
      if (inp) inp.classList.remove('is-invalid');
    });
    if (errGlobal) { errGlobal.textContent = ''; errGlobal.setAttribute('hidden',''); errGlobal.style.display = 'none'; }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrs();

      const nama     = document.getElementById('reg-nama').value.trim();
      const usaha    = document.getElementById('reg-usaha').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      let hasErr = false;
      if (!nama)     { showErr('err-reg-nama',     'Nama admin wajib diisi.'); hasErr = true; }
      if (!email)    { showErr('err-reg-email',    'Email wajib diisi.'); hasErr = true; }
      if (!password) { showErr('err-reg-password', 'Password wajib diisi.'); hasErr = true; }
      if (hasErr) return;

      const result = AuthService.register({ email, password, namaAdmin: nama, namaUsaha: usaha });
      if (!result.ok) {
        if (errGlobal) {
          errGlobal.textContent = result.error;
          errGlobal.removeAttribute('hidden');
          errGlobal.style.display = 'block';
        }
        return;
      }

      // Registrasi & login otomatis berhasil
      try { StorageService.initDummyData(); } catch {}
      renderHeader();
      navigate('#home');
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
