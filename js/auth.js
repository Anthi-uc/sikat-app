// auth.js — AuthService: manajemen akun multi-user offline-first
import { getProfil } from './profil-usaha.js';

const KEY_USERS   = 'sikat_users';
const KEY_SESSION = 'sikat_current_user';

// ─── Helper ───────────────────────────────────────────────────────────────────

function genId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Salt tetap untuk hashing offline-first di browser.
 */
const AUTH_SALT = 'sikat_bumkam_torei_natei_v1';

/**
 * Hash password menggunakan Web Crypto API (SHA-256) dengan salt.
 * Memiliki fallback jika Web Crypto tidak tersedia.
 * @param {string} password
 * @param {string} [salt]
 * @returns {Promise<string>}
 */
export async function hashPassword(password, salt = AUTH_SALT) {
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(`${salt}:${password}`);
      const hashBuf = await crypto.subtle.digest('SHA-256', data);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  return legacyHashPassword(password, salt);
}

function legacyHashPassword(password, salt = AUTH_SALT) {
  let h = 0x811c9dc5;
  const combined = `${salt}:${password}`;
  for (let i = 0; i < combined.length; i++) {
    h ^= combined.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return 'sha_fallback_' + h.toString(16).padStart(8, '0');
}

/**
 * Hash lama (v1 tanpa salt) untuk kompatibilitas akun lama
 */
function oldV1HashPassword(password) {
  let h = 0x811c9dc5;
  for (let i = 0; i < password.length; i++) {
    h ^= password.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0') + '_' + btoa(password.split('').reverse().join('')).slice(0, 12);
}

// ─── AuthService ──────────────────────────────────────────────────────────────

export const AuthService = {

  // ── Baca semua user ────────────────────────────────────────────────────────
  getUsers() {
    try {
      const raw = localStorage.getItem(KEY_USERS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  // ── Simpan semua user ──────────────────────────────────────────────────────
  _saveUsers(users) {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  },

  // ── Baca sesi aktif ────────────────────────────────────────────────────────
  getCurrentUser() {
    try {
      const raw = localStorage.getItem(KEY_SESSION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  // ── Cek apakah ada sesi aktif ──────────────────────────────────────────────
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  // ── Register ───────────────────────────────────────────────────────────────
  /**
   * @param {{ email, password, namaAdmin, namaUsaha }} data
   * @returns {Promise<{ ok: boolean, error?: string, field?: string, user?: object }>}
   */
  async register(data) {
    const { email, password, namaAdmin, namaUsaha } = data;

    if (!namaAdmin || !namaAdmin.trim()) {
      return { ok: false, error: 'Nama admin / peternak wajib diisi.', field: 'namaAdmin' };
    }
    if (!email || !email.trim()) {
      return { ok: false, error: 'Email wajib diisi.', field: 'email' };
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, error: 'Format email tidak valid (contoh: nama@domain.com).', field: 'email' };
    }
    if (!password) {
      return { ok: false, error: 'Password wajib diisi.', field: 'password' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password minimal 6 karakter.', field: 'password' };
    }

    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === cleanEmail)) {
      return { ok: false, error: 'Akun sudah terdaftar. Silakan login.', field: 'email' };
    }

    const hashedPassword = await hashPassword(password);
    const finalNamaUsaha = (namaUsaha && namaUsaha.trim()) ? namaUsaha.trim() : getProfil().namaBumkam;

    const user = {
      id:        genId(),
      email:     cleanEmail,
      password:  hashedPassword,
      namaAdmin: namaAdmin.trim(),
      namaUsaha: finalNamaUsaha,
      alamat:    getProfil().namaKampung + ', Papua',
      whatsapp:  '',
      emailUsaha:'',
      foto:      null,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this._saveUsers(users);
    this._setSession(user);

    // Simpan data usaha dan admin ke Pengaturan > Profil
    try {
      localStorage.setItem('sikat_profil_nama', user.namaAdmin);
      localStorage.setItem('sikat_profil_usaha', user.namaUsaha);
    } catch {}

    return { ok: true, user };
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  /**
   * @param {{ email, password }} data
   * @returns {Promise<{ ok: boolean, error?: string, field?: string, user?: object }>}
   */
  async login(data) {
    const { email, password } = data;
    if (!email || !email.trim()) {
      return { ok: false, error: 'Email wajib diisi.', field: 'email' };
    }
    const cleanEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { ok: false, error: 'Format email tidak valid (contoh: nama@domain.com).', field: 'email' };
    }
    if (!password) {
      return { ok: false, error: 'Password wajib diisi.', field: 'password' };
    }

    const users = this.getUsers();
    const user = users.find(u => u.email === cleanEmail);
    if (!user) {
      return { ok: false, error: 'Email atau password salah.', field: 'password' };
    }

    const hashedInput = await hashPassword(password);
    const isValid = (user.password === hashedInput) || (user.password === oldV1HashPassword(password));
    if (!isValid) {
      return { ok: false, error: 'Email atau password salah.', field: 'password' };
    }

    // Jika user memakai hash lama, upgrade ke SHA-256 dengan salt
    if (user.password !== hashedInput) {
      user.password = hashedInput;
      this._saveUsers(users);
    }

    this._setSession(user);
    try {
      if (user.namaAdmin) localStorage.setItem('sikat_profil_nama', user.namaAdmin);
      if (user.namaUsaha) localStorage.setItem('sikat_profil_usaha', user.namaUsaha);
    } catch {}

    return { ok: true, user };
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout() {
    try { localStorage.removeItem(KEY_SESSION); } catch {}
  },

  // ── Perbarui profil user aktif ─────────────────────────────────────────────
  /**
   * @param {Partial<{namaAdmin, namaUsaha, alamat, whatsapp, emailUsaha, foto}>} updates
   * @returns {{ ok: boolean, user?: object }}
   */
  updateProfile(updates) {
    const current = this.getCurrentUser();
    if (!current) return { ok: false };

    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === current.id);
    if (idx === -1) return { ok: false };

    const ALLOWED = ['namaAdmin', 'namaUsaha', 'alamat', 'whatsapp', 'emailUsaha', 'foto'];
    ALLOWED.forEach(k => {
      if (updates[k] !== undefined) users[idx][k] = updates[k];
    });

    this._saveUsers(users);
    this._setSession(users[idx]);
    return { ok: true, user: users[idx] };
  },

  // ── Storage keys per user ──────────────────────────────────────────────────
  /**
   * Kembalikan localStorage key untuk transaksi milik user aktif.
   */
  txKey() {
    const u = this.getCurrentUser();
    return u ? `sikat_transactions_${u.id}` : 'sikat_transactions';
  },

  prodKey() {
    const u = this.getCurrentUser();
    return u ? `sikat_productions_${u.id}` : 'sikat_productions';
  },

  // ── Private ────────────────────────────────────────────────────────────────
  _setSession(user) {
    // Simpan salinan tanpa password untuk sesi
    const { password: _pw, ...safe } = user;
    localStorage.setItem(KEY_SESSION, JSON.stringify(safe));
  },
};
