// auth.js — AuthService: manajemen akun multi-user offline-first

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
 * Hash sederhana (non-kriptografis) untuk password offline.
 * Cukup untuk mencegah tampilan plain-text di localStorage.
 */
function hashPassword(password) {
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
   * @returns {{ ok: boolean, error?: string, user?: object }}
   */
  register(data) {
    const { email, password, namaAdmin, namaUsaha } = data;

    if (!email || !password || !namaAdmin) {
      return { ok: false, error: 'Email, password, dan nama admin wajib diisi.' };
    }
    if (password.length < 6) {
      return { ok: false, error: 'Password minimal 6 karakter.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'Format email tidak valid.' };
    }

    const users = this.getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'Email sudah terdaftar. Silakan login.' };
    }

    const user = {
      id:        genId(),
      email:     email.toLowerCase().trim(),
      password:  hashPassword(password),
      namaAdmin: namaAdmin.trim(),
      namaUsaha: (namaUsaha || 'BUMKam Torei Natei').trim(),
      alamat:    'Kampung Yakonde, Papua',
      whatsapp:  '',
      emailUsaha:'',
      foto:      null,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    this._saveUsers(users);
    this._setSession(user);
    return { ok: true, user };
  },

  // ── Login ──────────────────────────────────────────────────────────────────
  /**
   * @param {{ email, password }} data
   * @returns {{ ok: boolean, error?: string, user?: object }}
   */
  login(data) {
    const { email, password } = data;
    if (!email || !password) {
      return { ok: false, error: 'Email dan password wajib diisi.' };
    }

    const users = this.getUsers();
    const user = users.find(u => u.email === email.toLowerCase().trim());
    if (!user) {
      return { ok: false, error: 'Email tidak ditemukan.' };
    }
    if (user.password !== hashPassword(password)) {
      return { ok: false, error: 'Password salah.' };
    }

    this._setSession(user);
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
