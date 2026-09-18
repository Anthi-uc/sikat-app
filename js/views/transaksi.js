// transaksi.js — View Input Transaksi (kategori fleksibel: Biaya Lain + Penjualan Lain)

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

/** Jenis yang dianggap sebagai pemasukan */
export function isIncome(jenis) {
  return jenis === 'penjualan_telur' || jenis === 'penjualan_lain';
}

/** Jenis yang memerlukan jumlahRak (untuk auto-kurang stok telur) */
function isEggSale(jenis) { return jenis === 'penjualan_telur'; }

/** Jenis yang memerlukan field keterangan */
function needsKeterangan(jenis) {
  return jenis === 'biaya_lain' || jenis === 'penjualan_lain';
}

function getTodaySummary() {
  try {
    const today = getTodayStr();
    const txs   = StorageService.getTransactions().filter(t => t.tanggal === today);
    const total = txs.reduce((s, t) => s + t.nominal, 0);
    return { count: txs.length, total };
  } catch {
    return { count: 0, total: 0 };
  }
}

// ─── render ──────────────────────────────────────────────────────────────────

export function render(params = {}) {
  const { count, total } = getTodaySummary();
  const prefillJenis = params.prefillJenis ?? '';

  const opt = (val, lbl) =>
    `<option value="${val}"${prefillJenis === val ? ' selected' : ''}>${lbl}</option>`;

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
            ${opt('penjualan_telur', 'Penjualan Telur')}
            ${opt('penjualan_lain',  'Penjualan Lain')}
            ${opt('pembelian_pakan', 'Pembelian Pakan')}
            ${opt('biaya_lain',      'Biaya Lain')}
          </select>
          <span class="form-error" id="err-jenis" hidden></span>
        </div>

        <!-- Keterangan (tampil untuk biaya_lain & penjualan_lain) -->
        <div class="form-group" id="group-keterangan" style="display:none">
          <label class="form-label" for="keterangan" id="label-keterangan">Keterangan</label>
          <input class="form-control" type="text" id="keterangan" name="keterangan"
            placeholder="Contoh: Servis Kandang, Transportasi" maxlength="100">
          <span class="form-error" id="err-keterangan" hidden></span>
        </div>

        <!-- Tanggal -->
        <div class="form-group">
          <label class="form-label" for="tanggal">Tanggal</label>
          <input class="form-control" type="date" id="tanggal" name="tanggal"
            value="${getTodayStr()}">
          <span class="form-error" id="err-tanggal" hidden></span>
        </div>

        <!-- Lokasi -->
        <div class="form-group">
          <label class="form-label" for="lokasi">Lokasi / Keterangan Tempat</label>
          <input class="form-control" type="text" id="lokasi" name="lokasi"
            placeholder="Pasar Sentani, Besum" maxlength="100">
          <span class="form-error" id="err-lokasi" hidden></span>
        </div>

        <!-- Jumlah Rak (hanya untuk penjualan_telur) -->
        <div class="form-group" id="group-jumlah-rak">
          <label class="form-label" for="jumlah-rak">Jumlah Rak Terjual</label>
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

        <button type="submit" class="btn btn-primary btn-full">💾 Simpan Transaksi</button>
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

export function attachListeners(params = {}) {
  const form          = document.getElementById('form-transaksi');
  const jenisEl       = document.getElementById('jenis');
  const groupRak      = document.getElementById('group-jumlah-rak');
  const groupKet      = document.getElementById('group-keterangan');
  const labelKet      = document.getElementById('label-keterangan');
  const jumlahRakEl   = document.getElementById('jumlah-rak');
  const keteranganEl  = document.getElementById('keterangan');

  if (!form || !jenisEl || !groupRak || !groupKet) return;

  // ── Error helpers ──────────────────────────────────────────────────────
  const FIELD_MAP = {
    jenis:      'err-jenis',
    tanggal:    'err-tanggal',
    lokasi:     'err-lokasi',
    nominal:    'err-nominal',
    jumlahRak:  'err-jumlah-rak',
    keterangan: 'err-keterangan',
  };

  function showFieldErrors(errors) {
    Object.entries(errors).forEach(([field, msg]) => {
      const errEl   = document.getElementById(FIELD_MAP[field]);
      const inputId = field === 'jumlahRak' ? 'jumlah-rak' : field;
      const inputEl = document.getElementById(inputId);
      if (errEl)   { errEl.textContent = msg; errEl.removeAttribute('hidden'); }
      if (inputEl)  inputEl.classList.add('is-invalid');
    });
  }

  function clearFieldError(fieldId) {
    const errId   = FIELD_MAP[fieldId] ?? `err-${fieldId}`;
    const errEl   = document.getElementById(errId);
    const inputEl = document.getElementById(fieldId === 'jumlahRak' ? 'jumlah-rak' : fieldId);
    if (errEl)   { errEl.textContent = ''; errEl.setAttribute('hidden', ''); }
    if (inputEl)  inputEl.classList.remove('is-invalid');
  }

  function clearAllErrors() {
    Object.keys(FIELD_MAP).forEach(clearFieldError);
  }

  // ── Update dependent fields on jenis change ────────────────────────────
  function applyJenis(jenis) {
    // Jumlah Rak: only for penjualan_telur
    const showRak = isEggSale(jenis);
    groupRak.style.display = showRak ? '' : 'none';
    if (!showRak) { jumlahRakEl.value = ''; clearFieldError('jumlahRak'); }

    // Keterangan: for biaya_lain and penjualan_lain
    const showKet = needsKeterangan(jenis);
    groupKet.style.display = showKet ? '' : 'none';
    if (!showKet) { keteranganEl.value = ''; clearFieldError('keterangan'); }

    if (labelKet) {
      labelKet.textContent =
        jenis === 'penjualan_lain' ? 'Nama / Jenis Penjualan' : 'Nama / Jenis Biaya';
    }
  }

  // Hide rak by default (CSS had it hidden; we control via JS now)
  groupRak.style.display = 'none';
  groupKet.style.display = 'none';

  jenisEl.addEventListener('change', () => applyJenis(jenisEl.value));

  // Apply prefill
  if (params.prefillJenis) {
    jenisEl.value = params.prefillJenis;
    applyJenis(params.prefillJenis);
  }

  // ── Ringkasan helpers ──────────────────────────────────────────────────
  function resetForm() {
    form.reset();
    document.getElementById('tanggal').value = getTodayStr();
    groupRak.style.display = 'none';
    groupKet.style.display = 'none';
    clearAllErrors();
  }

  function updateRingkasan() {
    const { count, total } = getTodaySummary();
    const cEl = document.getElementById('stat-count');
    const tEl = document.getElementById('stat-total');
    if (cEl) cEl.textContent = count;
    if (tEl) tEl.textContent = formatRupiah(total);
  }

  // ── Form submit ────────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors();

    const jenis      = jenisEl.value;
    const tanggal    = document.getElementById('tanggal').value;
    const lokasi     = document.getElementById('lokasi').value.trim();
    const nominal    = document.getElementById('nominal').value;
    const keterangan = keteranganEl.value.trim();

    // Build validation data
    const data = { jenis, tanggal, lokasi, nominal,
      jumlahRak: isEggSale(jenis) ? jumlahRakEl.value : undefined };

    // Validate core fields via Validator
    const { valid, errors } = Validator.validateTransaksi(data);

    // Extra: keterangan required for biaya_lain and penjualan_lain
    if (needsKeterangan(jenis) && !keterangan) {
      errors.keterangan = 'Keterangan wajib diisi.';
    }

    if (!valid || errors.keterangan) {
      showFieldErrors(errors);
      return;
    }

    const { isiPerRak } = StorageService.getSettings();

    // Build transaction object
    const tx = {
      id:        generateId(),
      jenis,
      tanggal,
      lokasi,
      nominal:   Number(nominal),
      createdAt: new Date().toISOString(),
    };

    if (isEggSale(jenis)) {
      tx.jumlahRak   = Number(jumlahRakEl.value);
      tx.jumlahButir = tx.jumlahRak * isiPerRak;
    }

    if (needsKeterangan(jenis)) {
      tx.keterangan = keterangan;
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
