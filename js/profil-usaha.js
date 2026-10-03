// js/profil-usaha.js
// ProfilUsahaService — satu sumber data untuk nama BUMKam & nama kampung.
// Dipakai di seluruh aplikasi; JANGAN hardcode nama entitas di file lain.

const KEY = 'profil_usaha';

const DEFAULTS = {
  namaBumkam:  'BUMKam Torei Natei',
  namaKampung: 'Kampung Yakonde',
  dasarHukumPendirian: '',
};

const MAX_LEN = 60;
const MAX_LEN_DASAR_HUKUM = 200;

// ── Helpers ────────────────────────────────────────────────────────────────────

function _escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Read the business profile from localStorage.
 * Always returns a complete object; falls back to defaults on any error.
 * @returns {{ namaBumkam: string, namaKampung: string, dasarHukumPendirian: string }}
 */
export function getProfil() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    const namaBumkam  = (parsed.namaBumkam  && String(parsed.namaBumkam).trim())  || DEFAULTS.namaBumkam;
    const namaKampung = (parsed.namaKampung && String(parsed.namaKampung).trim()) || DEFAULTS.namaKampung;
    const dasarHukumPendirian = (parsed.dasarHukumPendirian && String(parsed.dasarHukumPendirian).trim()) || DEFAULTS.dasarHukumPendirian;
    return { namaBumkam, namaKampung, dasarHukumPendirian };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Like getProfil(), but values are HTML-escaped for safe insertion into innerHTML.
 * Raw (unescaped) values are stored in localStorage; escaping is render-time only.
 * @returns {{ namaBumkam: string, namaKampung: string, dasarHukumPendirian: string }}
 */
export function getProfilEscaped() {
  const p = getProfil();
  return {
    namaBumkam:  _escHtml(p.namaBumkam),
    namaKampung: _escHtml(p.namaKampung),
    dasarHukumPendirian: _escHtml(p.dasarHukumPendirian),
  };
}

/**
 * Validate and save the business profile.
 * @param {{ namaBumkam: string, namaKampung: string, dasarHukumPendirian?: string }} data
 * @returns {{ ok: boolean, error?: string, field?: 'namaBumkam'|'namaKampung'|'dasarHukumPendirian' }}
 */
export function saveProfil(data) {
  const namaBumkam  = String(data?.namaBumkam  ?? '').trim();
  const namaKampung = String(data?.namaKampung ?? '').trim();
  const dasarHukumPendirian = String(data?.dasarHukumPendirian ?? '').trim();

  if (!namaBumkam) {
    return { ok: false, error: 'Nama BUMKam / Usaha wajib diisi.', field: 'namaBumkam' };
  }
  if (namaBumkam.length > MAX_LEN) {
    return { ok: false, error: 'Nama BUMKam / Usaha maksimal 60 karakter.', field: 'namaBumkam' };
  }
  if (!namaKampung) {
    return { ok: false, error: 'Nama Kampung wajib diisi.', field: 'namaKampung' };
  }
  if (namaKampung.length > MAX_LEN) {
    return { ok: false, error: 'Nama Kampung maksimal 60 karakter.', field: 'namaKampung' };
  }
  if (dasarHukumPendirian.length > MAX_LEN_DASAR_HUKUM) {
    return { ok: false, error: 'Dasar Hukum Pendirian maksimal 200 karakter.', field: 'dasarHukumPendirian' };
  }

  try {
    localStorage.setItem(KEY, JSON.stringify({ namaBumkam, namaKampung, dasarHukumPendirian }));

    // Broadcast change so other components (and other tabs) can react
    try {
      const bc = new BroadcastChannel('sikat_profil_usaha');
      bc.postMessage({ type: 'profil-usaha-updated', namaBumkam, namaKampung, dasarHukumPendirian });
      bc.close();
    } catch {
      // BroadcastChannel not available (test env / old browser) — silent
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Gagal menyimpan profil. Coba lagi.' };
  }
}

/**
 * Returns namaBumkam suitable for use in file/Excel names:
 * spaces → hyphens, special characters stripped, max 40 chars.
 * @returns {string}
 */
export function getSlugUsaha() {
  const { namaBumkam } = getProfil();
  return namaBumkam
    .replace(/[^a-zA-Z0-9 \-_]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .substring(0, 40);
}

/**
 * Register a listener that fires whenever the profile is updated in this tab
 * (via saveProfil) OR from another tab (via BroadcastChannel).
 * Returns a cleanup function — call it to unsubscribe.
 * @param {(profil: { namaBumkam: string, namaKampung: string, dasarHukumPendirian: string }) => void} cb
 * @returns {() => void}
 */
export function onProfilUpdated(cb) {
  let bc = null;
  try {
    bc = new BroadcastChannel('sikat_profil_usaha');
    bc.addEventListener('message', (ev) => {
      if (ev.data?.type === 'profil-usaha-updated') {
        cb({ 
          namaBumkam: ev.data.namaBumkam, 
          namaKampung: ev.data.namaKampung,
          dasarHukumPendirian: ev.data.dasarHukumPendirian || ''
        });
      }
    });
  } catch {
    // BroadcastChannel unavailable — no cross-tab updates
  }
  return () => { try { bc?.close(); } catch { /* ignore */ } };
}