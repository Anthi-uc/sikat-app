// transaksi.js — View Input Transaksi

import { StorageService, generateId, StorageError } from '../storage.js';
import { Validator } from '../validator.js';
import { showNotification } from '../app.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

/** Get today's transaction summary from storage. */
function getTodaySummary() {
  try {
    const today = getTodayStr();
    const txs = StorageService.getTransactions().filter(t => t.tanggal === today);
    const total = txs.reduce((s, t) => s + t.nominal, 0);
    return { count: txs.length, total };
  } catch {
    return { count: 0, total: 0 };
  }
}

// ─── render ───────────────────────────────────────────────────────────────────

/**
 * Render the Transaksi view HTML.
 * @param {{ prefillJenis?: string }} params
 * @returns {string}
 */
export function render(params = {}) {
  const { count, total } = getTodaySummary();
  const prefillJenis = params.prefillJenis ?? '';

  // Pre-select jenis option if prefillJenis is provided
  const optionPenjualan = `<option value="penjualan_telur"${prefillJenis === 'penjualan_telur' ? ' selected' : ''}>Penjualan Telur</option>`;
  const optionPakan     = `<option value="pembelian_pakan"${prefillJenis === 'pembelian_pakan' ? ' selected' : ''}>Pembelian Pakan</option>`;
  const optionBiaya     = `<option value="biaya_lain"${prefillJenis === 'biaya_lain' ? ' selected' : ''}>Biaya Lain</option>`;

  return `
    <div class="welcome-card">
      <div class="icon">🧾</div>
      <h2>Catat Transaksi Baru</h2>
      <p>Tambahkan pemasukan atau pengeluaran usaha</p>
    </div>

    <div class="transaksi-form">
      <form id="form-transaksi" novalidate>

        <!-- Jenis Transaksi -->
        <div class="form-group">
          <label class="form-label" for="jenis">Jenis Transaksi</label>
          <select class="form-control" id="jenis" name="jenis">
            <option value="">-- Pilih Jenis --</option>
            ${optionPenjualan}
            ${optionPakan}
            ${optionBiaya}
          </select>
          <span class="form-error" id="err-jenis" hidden></span>
        </div>

        <!-- Tanggal (default today) -->
        <div class="form-group">
          <label class="form-label" for="tanggal">Tanggal</label>
          <input class="form-control" type="date" id="tanggal" name="tanggal"
            value="${getTodayStr()}">
          <span class="form-error" id="err-tanggal" hidden></span>
        </div>

        <!-- Lokasi -->
        <div class="form-group">
          <label class="form-label" for="lokasi">Lokasi</label>
          <input class="form-control" type="text" id="lokasi" name="lokasi"
            placeholder="Pasar Sentani, Besum" maxlength="100">
          <span class="form-error" id="err-lokasi" hidden></span>
        </div>

        <!-- Jumlah Rak (conditional — shown only for penjualan_telur) -->
        <div class="form-group" id="group-jumlah-rak">
          <label class="form-label" for="jumlah-rak">Jumlah Rak</label>
          <input class="form-control" type="number" id="jumlah-rak" name="jumlahRak"
            min="1" max="9999" step="1" placeholder="Contoh: 25">
          <span class="form-error" id="err-jumlah-rak" hidden></span>
        </div>

        <!-- Nominal -->
        <div class="form-group">
          <label class="form-label" for="nominal">Nominal (Rp)</label>
          <input class="form-control" type="number" id="nominal" name="nominal"
            min="1" max="999999999999" step="1" placeholder="Contoh: 500000">
          <span class="form-error" id="err-nominal" hidden></span>
        </div>

        <button type="submit" class="btn btn-primary btn-full">💾 Simpan</button>
      </form>
    </div>

    <div class="summary-box" id="box-ringkasan">
      <p class="summary-box-title">Ringkasan Hari Ini</p>
      <div class="summary-row">
        <span class="summary-row-label">Jumlah Transaksi</span>
        <span class="summary-row-value" id="stat-count">${count}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row-label">Total Nominal</span>
        <span class="summary-row-value" id="stat-total">${formatRupiah(total)}</span>
      </div>
    </div>
  `;
}

// ─── attachListeners ──────────────────────────────────────────────────────────

/**
 * Attach all DOM event listeners for the Transaksi view.
 * @param {{ prefillJenis?: string }} params
 */
export function attachListeners(params = {}) {
  const form       = document.getElementById('form-transaksi');
  const jenisEl    = document.getElementById('jenis');
  const groupRak   = document.getElementById('group-jumlah-rak');
  const jumlahRakEl = document.getElementById('jumlah-rak');

  if (!form || !jenisEl || !groupRak || !jumlahRakEl) return;

  // ── Helper: show field-level validation errors ──────────────────────────
  function showFieldErrors(errors) {
    const fieldMap = {
      jenis:     'err-jenis',
      tanggal:   'err-tanggal',
      lokasi:    'err-lokasi',
      nominal:   'err-nominal',
      jumlahRak: 'err-jumlah-rak',
    };
    Object.entries(errors).forEach(([field, msg]) => {
      const errEl   = document.getElementById(fieldMap[field]);
      const inputEl = document.getElementById(field === 'jumlahRak' ? 'jumlah-rak' : field);
      if (errEl) { errEl.textContent = msg; errEl.removeAttribute('hidden'); }
      if (inputEl) inputEl.classList.add('is-invalid');
    });
  }

  function clearFieldError(fieldId) {
    const errId   = fieldId === 'jumlah-rak' ? 'err-jumlah-rak' : `err-${fieldId}`;
    const errEl   = document.getElementById(errId);
    const inputEl = document.getElementById(fieldId);
    if (errEl) { errEl.textContent = ''; errEl.setAttribute('hidden', ''); }
    if (inputEl) inputEl.classList.remove('is-invalid');
  }

  function clearAllErrors() {
    ['jenis', 'tanggal', 'lokasi', 'nominal', 'jumlah-rak'].forEach(clearFieldError);
  }

  function resetForm() {
    document.getElementById('form-transaksi').reset();
    // Re-set date to today after reset
    document.getElementById('tanggal').value = getTodayStr();
    // Hide rak group
    document.getElementById('group-jumlah-rak').classList.remove('visible');
    clearAllErrors();
  }

  function updateRingkasan() {
    const { count, total } = getTodaySummary();
    const countEl = document.getElementById('stat-count');
    const totalEl = document.getElementById('stat-total');
    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = formatRupiah(total);
  }

  // ── 1. Jenis dropdown → show/hide Jumlah Rak ───────────────────────────
  jenisEl.addEventListener('change', () => {
    if (jenisEl.value === 'penjualan_telur') {
      groupRak.classList.add('visible');
    } else {
      groupRak.classList.remove('visible');
      jumlahRakEl.value = '';
      clearFieldError('jumlah-rak');
    }
  });

  // Apply prefill after attaching the change listener
  if (params.prefillJenis) {
    jenisEl.value = params.prefillJenis;
    jenisEl.dispatchEvent(new Event('change'));
  }

  // ── 2. Form submit ──────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors();

    const data = {
      jenis:     jenisEl.value,
      tanggal:   document.getElementById('tanggal').value,
      lokasi:    document.getElementById('lokasi').value.trim(),
      nominal:   document.getElementById('nominal').value,
      jumlahRak: jenisEl.value === 'penjualan_telur'
        ? document.getElementById('jumlah-rak').value
        : undefined,
    };

    const { valid, errors } = Validator.validateTransaksi(data);
    if (!valid) {
      showFieldErrors(errors);
      return;
    }

    // Build transaction object
    const tx = {
      id:        generateId(),
      jenis:     data.jenis,
      tanggal:   data.tanggal,
      lokasi:    data.lokasi,
      nominal:   Number(data.nominal),
      createdAt: new Date().toISOString(),
    };
    if (data.jenis === 'penjualan_telur') {
      tx.jumlahRak = Number(data.jumlahRak);
    }

    try {
      StorageService.saveTransaction(tx);
      resetForm();
      updateRingkasan();
      showNotification('Transaksi berhasil disimpan!', 'success', 3000);
    } catch (err) {
      if (err instanceof StorageError) {
        showNotification(err.message, 'error', false);
      } else {
        showNotification('Data tidak dapat disimpan. Coba lagi.', 'error', false);
      }
    }
  });
}
