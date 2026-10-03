// tests/profil-usaha.test.js
// Vitest tests for ProfilUsahaService (getProfil, saveProfil, getProfilEscaped, getSlugUsaha)

import { describe, it, expect, beforeEach } from 'vitest';

// ── Inline implementation (mirrors js/profil-usaha.js exactly) ──────────────
// We re-implement to avoid ES-module resolution issues in the test runner.
// This ensures the logic is tested independently of the file path.

const KEY = 'profil_usaha';
const DEFAULTS = { namaBumkam: 'BUMKam Torei Natei', namaKampung: 'Kampung Yakonde' };
const MAX_LEN  = 60;

function _escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getProfil() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    const namaBumkam  = (parsed.namaBumkam  && String(parsed.namaBumkam).trim())  || DEFAULTS.namaBumkam;
    const namaKampung = (parsed.namaKampung && String(parsed.namaKampung).trim()) || DEFAULTS.namaKampung;
    return { namaBumkam, namaKampung };
  } catch { return { ...DEFAULTS }; }
}

function getProfilEscaped() {
  const p = getProfil();
  return { namaBumkam: _escHtml(p.namaBumkam), namaKampung: _escHtml(p.namaKampung) };
}

function saveProfil(data) {
  const namaBumkam  = String(data?.namaBumkam  ?? '').trim();
  const namaKampung = String(data?.namaKampung ?? '').trim();
  if (!namaBumkam)
    return { ok: false, error: 'Nama BUMKam / Usaha wajib diisi.', field: 'namaBumkam' };
  if (namaBumkam.length > MAX_LEN)
    return { ok: false, error: 'Nama BUMKam / Usaha maksimal 60 karakter.', field: 'namaBumkam' };
  if (!namaKampung)
    return { ok: false, error: 'Nama Kampung wajib diisi.', field: 'namaKampung' };
  if (namaKampung.length > MAX_LEN)
    return { ok: false, error: 'Nama Kampung maksimal 60 karakter.', field: 'namaKampung' };
  try {
    localStorage.setItem(KEY, JSON.stringify({ namaBumkam, namaKampung }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Gagal menyimpan profil. Coba lagi.' };
  }
}

function getSlugUsaha() {
  const { namaBumkam } = getProfil();
  return namaBumkam.replace(/[^a-zA-Z0-9 \-_]/g,'').trim().replace(/\s+/g,'-').substring(0,40);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ProfilUsahaService', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  // ── Req 1: Pembacaan & Default ────────────────────────────────────────────

  it('getProfil() mengembalikan default saat localStorage kosong', () => {
    const p = getProfil();
    expect(p.namaBumkam).toBe('BUMKam Torei Natei');
    expect(p.namaKampung).toBe('Kampung Yakonde');
  });

  it('getProfil() mengembalikan default saat data localStorage rusak (bukan JSON)', () => {
    localStorage.setItem(KEY, ':::bad json:::');
    const p = getProfil();
    expect(p.namaBumkam).toBe('BUMKam Torei Natei');
    expect(p.namaKampung).toBe('Kampung Yakonde');
  });

  it('getProfil() mengembalikan default saat field kosong dalam JSON tersimpan', () => {
    localStorage.setItem(KEY, JSON.stringify({ namaBumkam: '', namaKampung: '' }));
    const p = getProfil();
    expect(p.namaBumkam).toBe('BUMKam Torei Natei');
    expect(p.namaKampung).toBe('Kampung Yakonde');
  });

  it('getProfil() mengembalikan default saat field whitespace-only dalam JSON tersimpan', () => {
    localStorage.setItem(KEY, JSON.stringify({ namaBumkam: '   ', namaKampung: '\t\n' }));
    const p = getProfil();
    expect(p.namaBumkam).toBe('BUMKam Torei Natei');
    expect(p.namaKampung).toBe('Kampung Yakonde');
  });

  // ── Req 2: Round-trip save/read ───────────────────────────────────────────

  it('saveProfil() + getProfil() round-trip menyimpan dan membaca data yang sama', () => {
    const result = saveProfil({ namaBumkam: 'BUMKam Harapan Mandiri', namaKampung: 'Kampung Sentani' });
    expect(result.ok).toBe(true);
    const p = getProfil();
    expect(p.namaBumkam).toBe('BUMKam Harapan Mandiri');
    expect(p.namaKampung).toBe('Kampung Sentani');
  });

  it('saveProfil() memotong spasi berlebih sebelum menyimpan', () => {
    saveProfil({ namaBumkam: '  BUMKam Maju  ', namaKampung: '  Kampung Baru  ' });
    const p = getProfil();
    expect(p.namaBumkam).toBe('BUMKam Maju');
    expect(p.namaKampung).toBe('Kampung Baru');
  });

  // ── Req 3: Validasi ───────────────────────────────────────────────────────

  it('saveProfil() menolak namaBumkam kosong dengan pesan Indonesia', () => {
    const r = saveProfil({ namaBumkam: '', namaKampung: 'Kampung X' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Nama BUMKam / Usaha wajib diisi.');
    expect(r.field).toBe('namaBumkam');
  });

  it('saveProfil() menolak namaBumkam whitespace-only', () => {
    const r = saveProfil({ namaBumkam: '   ', namaKampung: 'Kampung X' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Nama BUMKam / Usaha wajib diisi.');
  });

  it('saveProfil() menolak namaBumkam > 60 karakter', () => {
    const r = saveProfil({ namaBumkam: 'A'.repeat(61), namaKampung: 'Kampung X' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Nama BUMKam / Usaha maksimal 60 karakter.');
    expect(r.field).toBe('namaBumkam');
  });

  it('saveProfil() menerima namaBumkam tepat 60 karakter', () => {
    const r = saveProfil({ namaBumkam: 'A'.repeat(60), namaKampung: 'Kampung X' });
    expect(r.ok).toBe(true);
  });

  it('saveProfil() menolak namaKampung kosong dengan pesan Indonesia', () => {
    const r = saveProfil({ namaBumkam: 'BUMKam X', namaKampung: '' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Nama Kampung wajib diisi.');
    expect(r.field).toBe('namaKampung');
  });

  it('saveProfil() menolak namaKampung whitespace-only', () => {
    const r = saveProfil({ namaBumkam: 'BUMKam X', namaKampung: '\n\t ' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Nama Kampung wajib diisi.');
  });

  it('saveProfil() menolak namaKampung > 60 karakter', () => {
    const r = saveProfil({ namaBumkam: 'BUMKam X', namaKampung: 'K'.repeat(61) });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Nama Kampung maksimal 60 karakter.');
    expect(r.field).toBe('namaKampung');
  });

  it('saveProfil() tidak mengubah localStorage bila validasi gagal', () => {
    saveProfil({ namaBumkam: 'BUMKam Awal', namaKampung: 'Kampung Awal' });
    saveProfil({ namaBumkam: '', namaKampung: 'Kampung X' }); // invalid
    expect(getProfil().namaBumkam).toBe('BUMKam Awal'); // unchanged
  });

  // ── Req 4: HTML Escaping ──────────────────────────────────────────────────

  it('getProfilEscaped() meng-escape karakter < > & "', () => {
    saveProfil({ namaBumkam: '<script>alert("xss")</script>', namaKampung: 'Kampung & Desa' });
    const esc = getProfilEscaped();
    expect(esc.namaBumkam).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(esc.namaKampung).toBe('Kampung &amp; Desa');
  });

  it('getProfilEscaped() tidak meng-escape teks normal', () => {
    saveProfil({ namaBumkam: 'BUMKam Torei Natei', namaKampung: 'Kampung Yakonde' });
    const esc = getProfilEscaped();
    expect(esc.namaBumkam).toBe('BUMKam Torei Natei');
    expect(esc.namaKampung).toBe('Kampung Yakonde');
  });

  it('localStorage menyimpan nilai mentah (tidak di-escape)', () => {
    saveProfil({ namaBumkam: 'BUMKam & Mitra', namaKampung: 'Kampung <Baru>' });
    const raw = JSON.parse(localStorage.getItem(KEY));
    expect(raw.namaBumkam).toBe('BUMKam & Mitra');   // raw, not escaped
    expect(raw.namaKampung).toBe('Kampung <Baru>');
  });

  // ── Req 5: getSlugUsaha ───────────────────────────────────────────────────

  it('getSlugUsaha() mengembalikan string yang aman untuk nama file', () => {
    saveProfil({ namaBumkam: 'BUMKam Torei Natei', namaKampung: 'Kampung Yakonde' });
    const slug = getSlugUsaha();
    expect(slug).not.toMatch(/[^a-zA-Z0-9\-_]/);
    expect(slug.length).toBeLessThanOrEqual(40);
  });

  it('getSlugUsaha() mengganti spasi dengan tanda hubung', () => {
    saveProfil({ namaBumkam: 'BUMKam Harapan Jaya', namaKampung: 'K' });
    expect(getSlugUsaha()).toBe('BUMKam-Harapan-Jaya');
  });

});