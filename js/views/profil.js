// profil.js — Halaman Pengaturan Profil Admin

import { AuthService } from '../auth.js';
import { showNotification, updateHeaderProfile } from '../app.js';
import { navigate } from '../router.js';

// ─── Konstanta ────────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_MAX_DIM = 300;
const JPEG_QUALITY   = 0.7;

// ─── Avatar SVG default ───────────────────────────────────────────────────────
export const DEFAULT_AVATAR_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23d1fae5'/%3E%3Ccircle cx='20' cy='15' r='7' fill='%2316a34a'/%3E%3Cellipse cx='20' cy='34' rx='12' ry='8' fill='%2316a34a'/%3E%3C/svg%3E`;

// ─── Helpers publik (dipakai app.js untuk header) ─────────────────────────────
export function getNamaAdmin() {
  try {
    const u = AuthService.getCurrentUser();
    return (u && u.namaAdmin) ? u.namaAdmin : (localStorage.getItem('sikat_profil_nama') || 'Admin');
  } catch { return 'Admin'; }
}

export function getFotoProfil() {
  try {
    const u = AuthService.getCurrentUser();
    return (u && u.foto) ? u.foto : (localStorage.getItem('sikat_profil_foto') || null);
  } catch { return null; }
}

// ─── Resize + kompres foto via canvas ────────────────────────────────────────
function resizeDanKompresi(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > AVATAR_MAX_DIM || height > AVATAR_MAX_DIM) {
          if (width >= height) {
            height = Math.round((height / width) * AVATAR_MAX_DIM);
            width  = AVATAR_MAX_DIM;
          } else {
            width  = Math.round((width / height) * AVATAR_MAX_DIM);
            height = AVATAR_MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── render ──────────────────────────────────────────────────────────────────
export function render(params = {}) {
  const u    = AuthService.getCurrentUser() || {};
  const nama  = u.namaAdmin  || '';
  const usaha = u.namaUsaha  || '';
  const alamat= u.alamat     || '';
  const wa    = u.whatsapp   || '';
  const email = u.emailUsaha || '';
  const foto  = u.foto       || null;
  const fotoStyle = foto ? `background-image:url('${foto}');background-size:cover;background-position:center;` : '';

  function val(v) { return v.replace(/"/g, '&quot;'); }

  return `
    <div class="welcome-card">
      <div class="icon">👤</div>
      <h2>Pengaturan Profil</h2>
      <p>Kelola informasi akun dan usaha Anda</p>
    </div>

    <div class="card" style="margin-bottom:var(--space-6);">
      <form id="form-profil" novalidate>

        <!-- Foto profil -->
        <div class="form-group">
          <label class="form-label">Foto Profil</label>
          <div style="display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap;">
            <div id="preview-avatar"
              style="width:80px;height:80px;border-radius:50%;border:2px solid var(--color-border);overflow:hidden;flex-shrink:0;background:#d1fae5;${fotoStyle}">
              ${!foto ? `<img src="${DEFAULT_AVATAR_SVG}" alt="Avatar default" style="width:100%;height:100%;object-fit:cover;">` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-2);">
              <label class="btn btn-outline btn-sm" for="input-foto" style="cursor:pointer;">📷 Pilih Foto</label>
              <input type="file" id="input-foto" accept="image/*" style="display:none;" aria-label="Pilih foto profil">
              <button type="button" class="btn btn-sm" id="btn-hapus-foto"
                style="background:var(--color-danger-light);color:var(--color-danger);border:1px solid var(--color-danger);"
                ${!foto ? 'disabled' : ''}>🗑 Hapus Foto</button>
            </div>
          </div>
          <span class="form-error" id="err-foto" hidden></span>
          <p style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:var(--space-1);">Maks. 5MB · Otomatis di-resize ke 300×300px</p>
        </div>

        <!-- Nama admin -->
        <div class="form-group">
          <label class="form-label" for="input-nama">Nama Admin</label>
          <input class="form-control" type="text" id="input-nama" value="${val(nama)}" maxlength="25" placeholder="Nama Anda">
          <span class="form-error" id="err-nama" hidden></span>
        </div>

        <!-- Nama usaha -->
        <div class="form-group">
          <label class="form-label" for="input-usaha">Nama Usaha / BUMKam</label>
          <input class="form-control" type="text" id="input-usaha" value="${val(usaha)}" maxlength="60" placeholder="BUMKam Torei Natei">
        </div>

        <!-- Alamat -->
        <div class="form-group">
          <label class="form-label" for="input-alamat">Alamat Usaha</label>
          <input class="form-control" type="text" id="input-alamat" value="${val(alamat)}" maxlength="100" placeholder="Kampung, Distrik, Kabupaten">
        </div>

        <!-- WhatsApp -->
        <div class="form-group">
          <label class="form-label" for="input-wa">Nomor WhatsApp Usaha</label>
          <input class="form-control" type="tel" id="input-wa" value="${val(wa)}" maxlength="20" placeholder="+62 812-xxxx-xxxx">
        </div>

        <!-- Email usaha -->
        <div class="form-group">
          <label class="form-label" for="input-email-usaha">Email Usaha</label>
          <input class="form-control" type="email" id="input-email-usaha" value="${val(email)}" maxlength="100" placeholder="usaha@email.com">
        </div>

        <button type="submit" class="btn btn-primary btn-full">💾 Simpan Profil</button>
      </form>
    </div>

    <!-- Tombol Logout -->
    <div class="card" style="margin-bottom:var(--space-6);border-color:var(--color-danger-light);">
      <p style="font-size:var(--font-size-sm);color:var(--color-text-muted);margin-bottom:var(--space-3);">
        Login sebagai: <strong>${val(u.email || '')}</strong>
      </p>
      <button class="btn btn-full" id="btn-logout"
        style="background:var(--color-danger-light);color:var(--color-danger);border:1px solid var(--color-danger);">
        🚪 Keluar / Log Out
      </button>
    </div>
  `;
}

// ─── attachListeners ─────────────────────────────────────────────────────────
export function attachListeners(params = {}) {
  const form      = document.getElementById('form-profil');
  const inputFoto = document.getElementById('input-foto');
  const preview   = document.getElementById('preview-avatar');
  const btnHapus  = document.getElementById('btn-hapus-foto');
  const errFoto   = document.getElementById('err-foto');

  let fotoBaruDataUrl = null; // null = tidak berubah, 'HAPUS' = hapus

  // ── Preview ────────────────────────────────────────────────────────────────
  function updatePreview(src) {
    if (!preview) return;
    if (src) {
      preview.style.backgroundImage   = `url('${src}')`;
      preview.style.backgroundSize    = 'cover';
      preview.style.backgroundPosition= 'center';
      preview.innerHTML = '';
    } else {
      preview.style.backgroundImage = '';
      preview.innerHTML = `<img src="${DEFAULT_AVATAR_SVG}" alt="Avatar default" style="width:100%;height:100%;object-fit:cover;">`;
    }
  }

  // ── Pilih foto ─────────────────────────────────────────────────────────────
  if (inputFoto) {
    inputFoto.addEventListener('change', async () => {
      const file = inputFoto.files[0];
      if (!file) return;
      if (errFoto) errFoto.setAttribute('hidden', '');
      if (file.size > MAX_FILE_BYTES) {
        if (errFoto) { errFoto.textContent = 'Ukuran foto terlalu besar, maksimal 5MB.'; errFoto.removeAttribute('hidden'); }
        inputFoto.value = '';
        return;
      }
      try {
        const dataUrl = await resizeDanKompresi(file);
        fotoBaruDataUrl = dataUrl;
        updatePreview(dataUrl);
        if (btnHapus) btnHapus.disabled = false;
      } catch {
        if (errFoto) { errFoto.textContent = 'Gagal memproses gambar. Coba file lain.'; errFoto.removeAttribute('hidden'); }
      }
      inputFoto.value = '';
    });
  }

  // ── Hapus foto ─────────────────────────────────────────────────────────────
  if (btnHapus) {
    btnHapus.addEventListener('click', () => {
      fotoBaruDataUrl = 'HAPUS';
      updatePreview(null);
      btnHapus.disabled = true;
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nama = (document.getElementById('input-nama')?.value || '').trim();
      if (!nama) {
        const errNama = document.getElementById('err-nama');
        if (errNama) { errNama.textContent = 'Nama admin wajib diisi.'; errNama.removeAttribute('hidden'); }
        return;
      }

      const updates = {
        namaAdmin:  nama,
        namaUsaha:  (document.getElementById('input-usaha')?.value   || '').trim(),
        alamat:     (document.getElementById('input-alamat')?.value   || '').trim(),
        whatsapp:   (document.getElementById('input-wa')?.value       || '').trim(),
        emailUsaha: (document.getElementById('input-email-usaha')?.value || '').trim(),
      };

      if (fotoBaruDataUrl === 'HAPUS') {
        updates.foto = null;
      } else if (fotoBaruDataUrl) {
        updates.foto = fotoBaruDataUrl;
      }

      AuthService.updateProfile(updates);

      // Perbarui header secara parsial — tanggal tidak disentuh
      const fotoFinal = updates.foto !== undefined ? updates.foto : getFotoProfil();
      updateHeaderProfile({ nama: updates.namaAdmin, foto: fotoFinal });

      fotoBaruDataUrl = null;
      showNotification('Profil berhasil disimpan!', 'success', 3000);
    });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (!window.confirm('Yakin ingin keluar?')) return;
      AuthService.logout();
      navigate('#login');
    });
  }
}
