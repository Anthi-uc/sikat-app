// kontak.js — Halaman Kontak (Kartu 1: dinamis dari profil; Kartu 2: statis pengembang)

import { AuthService } from '../auth.js';

export function render(params = {}) {
  // ── Kartu 1: data dari profil pengguna aktif ──────────────────────────────
  const u = AuthService.getCurrentUser() || {};
  const namaUsaha = u.namaUsaha  || 'BUMKam Torei Natei';
  const alamat    = u.alamat     || 'Kampung Yakonde, Distrik Sentani Timur, Kabupaten Jayapura, Papua';
  const wa        = u.whatsapp   || '';
  const emailUs   = u.emailUsaha || '';

  function kontakRow(icon, label, content, href) {
    return `
      <div style="display:flex;align-items:flex-start;gap:var(--space-3);">
        <span style="font-size:1.25rem;flex-shrink:0;">${icon}</span>
        <div>
          <p style="font-weight:600;font-size:var(--font-size-sm);margin-bottom:2px;">${label}</p>
          ${href
            ? `<a href="${href}" style="font-size:var(--font-size-sm);color:var(--color-primary);">${content}</a>`
            : `<p style="font-size:var(--font-size-sm);color:var(--color-text-muted);">${content}</p>`
          }
        </div>
      </div>`;
  }

  const waRow = wa
    ? kontakRow('📱', 'WhatsApp / Telepon', wa, `https://wa.me/${wa.replace(/[^0-9]/g, '')}`)
    : kontakRow('📱', 'WhatsApp / Telepon', 'Belum diatur — atur di halaman Profil', '');

  const emailRow = emailUs
    ? kontakRow('✉️', 'Email Usaha', emailUs, `mailto:${emailUs}`)
    : kontakRow('✉️', 'Email Usaha', 'Belum diatur — atur di halaman Profil', '');

  return `
    <div class="welcome-card">
      <div class="icon">📞</div>
      <h2>Kontak</h2>
      <p>Hubungi kami jika ada pertanyaan atau kendala</p>
    </div>

    <!-- Kartu 1: Identitas Usaha (dinamis dari profil) -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">
        🏢 ${namaUsaha}
      </h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        ${kontakRow('📍', 'Alamat', alamat, '')}
        ${waRow}
        ${emailRow}
        ${kontakRow('🕐', 'Jam Operasional', 'Senin – Jumat, 08.00 – 16.00 WIT', '')}
      </div>
      <p style="margin-top:var(--space-4);font-size:var(--font-size-xs);color:var(--color-text-muted);">
        💡 Perbarui informasi kontak usaha melalui menu
        <a href="#profil" id="link-ke-profil" style="color:var(--color-primary);">Pengaturan Profil</a>.
      </p>
    </div>

    <!-- Kartu 2: Dukungan Teknis & Pengembang (statis) -->
    <div class="card" style="margin-bottom:var(--space-5);">
      <h3 style="font-size:var(--font-size-base);font-weight:700;margin-bottom:var(--space-4);">
        🛠 Dukungan Teknis &amp; Pengembang
      </h3>
      <div style="display:flex;flex-direction:column;gap:var(--space-4);">
        ${kontakRow('👩‍💻', 'Pengembang', 'Tim 4 Pengembang SIKAT (Sofyanti)', '')}
        ${kontakRow('✉️', 'Email Support', 'sofyanti005@gmail.com', 'mailto:sofyanti005@gmail.com')}
        ${kontakRow('📱', 'WhatsApp Support', '+62 852-5446-2279', 'https://wa.me/6285254462279')}
        ${kontakRow('🕐', 'Jam Layanan', 'Senin – Jumat, 08.00 – 17.00 WIT', '')}
      </div>
      <div style="margin-top:var(--space-4);padding:var(--space-3);background:var(--color-primary-light);border-radius:var(--radius-md);">
        <p style="font-size:var(--font-size-xs);color:#14532d;">
          💡 Untuk melaporkan bug atau saran fitur, kirimkan pesan dengan subjek
          <strong>"SIKAT — [Topik]"</strong>.
        </p>
      </div>
    </div>
  `;
}

export function attachListeners(params = {}) {
  const linkProfil = document.getElementById('link-ke-profil');
  if (linkProfil) {
    linkProfil.addEventListener('click', (e) => {
      e.preventDefault();
      import('../router.js').then(({ navigate }) => navigate('#profil'));
    });
  }
}
