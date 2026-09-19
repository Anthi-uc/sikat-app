// transaksi.js — Input Transaksi dengan kalkulasi otomatis qty×harga, satuan fleksibel

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

export function isIncome(jenis) {
  return jenis === 'penjualan_telur' || jenis === 'penjualan_lain';
}

function isEggSale(jenis)       { return jenis === 'penjualan_telur'; }
function needsKeterangan(jenis) { return jenis === 'biaya_lain' || jenis === 'penjualan_lain'; }

// ─── Ringkasan Bulan Ini ──────────────────────────────────────────────────────

function getMonthSummary() {
  try {
    const d   = new Date();
    const pfx = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const txs = StorageService.getTransactions().filter(t => t.tanggal.startsWith(pfx));
    const totalMasuk  = txs.filter(t => isIncome(t.jenis)).reduce((s, t) => s + t.nominal, 0);
    const totalKeluar = txs.filter(t => !isIncome(t.jenis)).reduce((s, t) => s + t.nominal, 0);
    return { count: txs.length, totalMasuk, totalKeluar };
  } catch {
    return { count: 0, totalMasuk: 0, totalKeluar: 0 };
  }
}

// ─── render ──────────────────────────────────────────────────────────────────

export function render(params = {}) {
  const { count, totalMasuk, totalKeluar } = getMonthSummary();
  const prefillJenis = params.prefillJenis ?? '';
  const settings     = StorageService.getSettings();
  const stok         = StorageService.getStokTelur();

  const opt = (val, lbl) =>
    `<option value="${val}"${prefillJenis === val ? ' selected' : ''}>${lbl}</option>`;

  const now  = new Date();
  const bulanLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  return `
    <div class="welcome-card">
      <div class="icon">🧾</div>
      <h2>Catat Transaksi Baru</h2>
      <p>Tambahkan pemasukan atau pengeluaran usaha</p>
    </div>

    <!-- Stok telur info -->
    <div style="background:var(--color-citrine-light);border:1px solid var(--color-citrine);
                border-radius:var(--radius-lg);padding:var(--space-3) var(--space-4);
                margin-bottom:var(--space-5);display:flex;align-items:center;
                justify-content:space-between;gap:var(--space-3);">
      <div>
        <p style="font-size:var(--font-size-xs);font-weight:700;color:#713f12;margin-bottom:2px;">
          📦 STOK TELUR TERSEDIA
        </p>
        <p style="font-size:var(--font-size-xl);font-weight:800;color:#1e293b;" id="stok-info">
          ${stok.toLocaleString('id-ID')} butir
        </p>
      </div>
      <p style="font-size:var(--font-size-sm);color:#713f12;">
        ≈ ${(stok / settings.isiPerRak).toFixed(1)} rak
      </p>
    </div>

    <div class="transaksi-form">
      <form id="form-transaksi" novalidate>

        <!-- Jenis Transaksi -->
        <div class="form-group">
          <label class="form-label" for="jenis">Jenis Transaksi</label>
          <select class="form-control" id="jenis" name="jenis">
            <option value="">-- Pilih Jenis --</option>
            ${opt('penjualan_telur', '🥚 Penjualan Telur')}
            ${opt('penjualan_lain',  '💰 Penjualan Lain')}
            ${opt('pembelian_pakan', '🌾 Pembelian Pakan')}
            ${opt('biaya_lain',      '💸 Biaya Lain')}
          </select>
          <span class="form-error" id="err-jenis" hidden></span>
        </div>

        <!-- Keterangan (biaya_lain & penjualan_lain) -->
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

        <!-- ═══ KALKULASI OTOMATIS (Qty × Harga Satuan) ═══ -->

        <!-- Satuan jual — hanya untuk penjualan_telur -->
        <div class="form-group" id="group-satuan" style="display:none">
          <label class="form-label">Satuan Jual</label>
          <div style="display:flex;gap:var(--space-4);">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-sm);">
              <input type="radio" name="satuan-jual" value="rak" checked> Per Rak
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-sm);">
              <input type="radio" name="satuan-jual" value="butir"> Per Butir
            </label>
          </div>
        </div>

        <!-- Grid: Kuantitas | Harga Satuan -->
        <div id="group-qty-harga" style="display:none">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);">
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" for="kuantitas" id="label-kuantitas">Kuantitas</label>
              <input class="form-control" type="number" id="kuantitas"
                min="0.01" step="any" placeholder="Contoh: 10">
              <span class="form-error" id="err-kuantitas" hidden></span>
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label class="form-label" for="harga-satuan" id="label-harga-satuan">Harga Satuan (Rp)</label>
              <input class="form-control" type="number" id="harga-satuan"
                min="0" step="1" placeholder="Contoh: 30000">
              <span class="form-error" id="err-harga-satuan" hidden></span>
            </div>
          </div>
          <!-- Konversi stok info (penjualan_telur only) -->
          <div id="stok-konversi" style="display:none;margin-top:6px;
               font-size:var(--font-size-xs);color:var(--color-text-muted);">
          </div>
        </div>

        <!-- Total Nominal (auto-calculated) -->
        <div class="form-group" style="margin-top:var(--space-4)">
          <label class="form-label" for="nominal">
            Total Nominal (Rp)
            <span id="nominal-calc-hint" style="font-weight:400;color:var(--color-teal);
                  font-size:var(--font-size-xs);margin-left:6px;"></span>
          </label>
          <input class="form-control" type="number" id="nominal" name="nominal"
            min="1" max="999999999999" step="1" placeholder="Terisi otomatis atau isi manual">
          <span class="form-error" id="err-nominal" hidden></span>
        </div>

        <button type="submit" class="btn btn-primary btn-full" style="margin-top:var(--space-2)">
          💾 Simpan Transaksi
        </button>
      </form>
    </div>

    <!-- Ringkasan Bulan Ini -->
    <div class="summary-box" id="box-ringkasan">
      <p class="summary-box-title">📅 Ringkasan ${bulanLabel}</p>
      <div class="summary-row">
        <span class="summary-row-label">Jumlah Transaksi</span>
        <span class="summary-row-value" id="stat-count">${count}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row-label">Total Pemasukan</span>
        <span class="summary-row-value amount-income" id="stat-masuk">${formatRupiah(totalMasuk)}</span>
      </div>
      <div class="summary-row">
        <span class="summary-row-label">Total Pengeluaran</span>
        <span class="summary-row-value amount-expense" id="stat-keluar">${formatRupiah(totalKeluar)}</span>
      </div>
    </div>
  `;
}

// ─── attachListeners ──────────────────────────────────────────────────────────

export function attachListeners(params = {}) {
  const form         = document.getElementById('form-transaksi');
  const jenisEl      = document.getElementById('jenis');
  const groupKet     = document.getElementById('group-keterangan');
  const labelKet     = document.getElementById('label-keterangan');
  const groupSatuan  = document.getElementById('group-satuan');
  const groupQtyHrg  = document.getElementById('group-qty-harga');
  const kuantitasEl  = document.getElementById('kuantitas');
  const hargaSatEl   = document.getElementById('harga-satuan');
  const nominalEl    = document.getElementById('nominal');
  const keteranganEl = document.getElementById('keterangan');
  const hintEl       = document.getElementById('nominal-calc-hint');
  const konversiEl   = document.getElementById('stok-konversi');
  const labelQty     = document.getElementById('label-kuantitas');
  const labelHrg     = document.getElementById('label-harga-satuan');

  if (!form || !jenisEl) return;

  // ── Error helpers ──────────────────────────────────────────────────────
  const FIELD_MAP = {
    jenis:       'err-jenis',
    tanggal:     'err-tanggal',
    lokasi:      'err-lokasi',
    nominal:     'err-nominal',
    kuantitas:   'err-kuantitas',
    hargaSatuan: 'err-harga-satuan',
    keterangan:  'err-keterangan',
  };

  function showFieldErrors(errors) {
    Object.entries(errors).forEach(([field, msg]) => {
      const errEl   = document.getElementById(FIELD_MAP[field] ?? `err-${field}`);
      const inputEl = document.getElementById(field === 'hargaSatuan' ? 'harga-satuan' : field);
      if (errEl)   { errEl.textContent = msg; errEl.removeAttribute('hidden'); }
      if (inputEl)  inputEl.classList.add('is-invalid');
    });
  }

  function clearFieldError(key) {
    const errEl   = document.getElementById(FIELD_MAP[key] ?? `err-${key}`);
    const inputEl = document.getElementById(key === 'hargaSatuan' ? 'harga-satuan' : key);
    if (errEl)   { errEl.textContent = ''; errEl.setAttribute('hidden', ''); }
    if (inputEl)  inputEl.classList.remove('is-invalid');
  }

  function clearAllErrors() {
    Object.keys(FIELD_MAP).forEach(clearFieldError);
  }

  // ── Get active satuan ──────────────────────────────────────────────────
  function getSatuan() {
    const r = document.querySelector('input[name="satuan-jual"]:checked');
    return r ? r.value : 'rak';
  }

  // ── Auto-calculate total nominal ───────────────────────────────────────
  function recalcNominal() {
    const jenis  = jenisEl.value;
    const qty    = parseFloat(kuantitasEl?.value) || 0;
    const harga  = parseFloat(hargaSatEl?.value)  || 0;
    const satuan = getSatuan();

    if (!jenis || !groupQtyHrg || groupQtyHrg.style.display === 'none') return;
    if (qty <= 0 || harga <= 0) {
      if (hintEl) hintEl.textContent = '';
      if (konversiEl) konversiEl.style.display = 'none';
      return;
    }

    const total = Math.round(qty * harga);
    if (nominalEl) nominalEl.value = total;
    if (hintEl)    hintEl.textContent = `= ${qty} × ${formatRupiah(harga)}`;
    clearFieldError('nominal');

    // Stok conversion hint for penjualan_telur
    if (isEggSale(jenis) && konversiEl) {
      const { isiPerRak } = StorageService.getSettings();
      const butirTerjual = satuan === 'rak' ? Math.round(qty * isiPerRak) : Math.round(qty);
      const stok         = StorageService.getStokTelur();
      const sisa         = stok - butirTerjual;
      const warn         = sisa < 0 ? ' ⚠️ Melebihi stok!' : '';
      konversiEl.textContent =
        `Stok berkurang: ${butirTerjual.toLocaleString('id-ID')} butir → Sisa: ${Math.max(0,sisa).toLocaleString('id-ID')} butir${warn}`;
      konversiEl.style.display = '';
      konversiEl.style.color   = sisa < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)';
    }
  }

  // ── Apply labels and visibility based on jenis ─────────────────────────
  function applyJenis(jenis) {
    // Keterangan field
    const showKet = needsKeterangan(jenis);
    if (groupKet) groupKet.style.display = showKet ? '' : 'none';
    if (!showKet && keteranganEl) { keteranganEl.value = ''; clearFieldError('keterangan'); }
    if (labelKet) {
      labelKet.textContent =
        jenis === 'penjualan_lain' ? 'Nama / Jenis Penjualan' : 'Nama / Jenis Biaya';
    }

    // Satuan (rak/butir) — only for penjualan_telur
    if (groupSatuan) groupSatuan.style.display = isEggSale(jenis) ? '' : 'none';

    // Qty + harga grid — all jenis except empty
    const showQtyHrg = !!jenis;
    if (groupQtyHrg) groupQtyHrg.style.display = showQtyHrg ? '' : 'none';

    // Adjust labels per jenis
    const labels = {
      penjualan_telur: { qty: 'Kuantitas (Rak)',       hrg: 'Harga per Rak (Rp)'   },
      penjualan_lain:  { qty: 'Kuantitas',             hrg: 'Harga Satuan (Rp)'    },
      pembelian_pakan: { qty: 'Kuantitas (Karung/Kg)', hrg: 'Harga Satuan (Rp)'    },
      biaya_lain:      { qty: 'Kuantitas (opsional)',  hrg: 'Harga / Biaya (Rp)'   },
    };
    const lbl = labels[jenis] ?? { qty: 'Kuantitas', hrg: 'Harga Satuan (Rp)' };
    if (labelQty) labelQty.textContent = lbl.qty;
    if (labelHrg) labelHrg.textContent = lbl.hrg;

    // If jenis changes, re-apply satuan label for penjualan_telur
    if (isEggSale(jenis)) {
      _updateSatuanLabel(getSatuan());
    }

    // Clear stok konversi if not egg sale
    if (!isEggSale(jenis) && konversiEl) konversiEl.style.display = 'none';

    // Recompute
    recalcNominal();
  }

  function _updateSatuanLabel(satuan) {
    if (!labelQty) return;
    const lbl = satuan === 'butir' ? 'Kuantitas (Butir)' : 'Kuantitas (Rak)';
    labelQty.textContent = lbl;
    if (labelHrg) {
      labelHrg.textContent = satuan === 'butir' ? 'Harga per Butir (Rp)' : 'Harga per Rak (Rp)';
    }
  }

  // ── Initial hide ───────────────────────────────────────────────────────
  if (groupKet)    groupKet.style.display    = 'none';
  if (groupSatuan) groupSatuan.style.display  = 'none';
  if (groupQtyHrg) groupQtyHrg.style.display  = 'none';
  if (konversiEl)  konversiEl.style.display   = 'none';

  // ── Event listeners ────────────────────────────────────────────────────
  jenisEl.addEventListener('change', () => applyJenis(jenisEl.value));

  // Satuan radio change
  document.querySelectorAll('input[name="satuan-jual"]').forEach(r => {
    r.addEventListener('change', () => {
      _updateSatuanLabel(r.value);
      recalcNominal();
    });
  });

  // Qty + harga → recalc
  kuantitasEl?.addEventListener('input', recalcNominal);
  hargaSatEl?.addEventListener('input', recalcNominal);

  // Allow manual override of nominal (clears the hint)
  nominalEl?.addEventListener('input', () => {
    if (hintEl) hintEl.textContent = '(diisi manual)';
  });

  // Apply prefill
  if (params.prefillJenis) {
    jenisEl.value = params.prefillJenis;
    applyJenis(params.prefillJenis);
    // Pre-fill harga from settings for egg sale
    if (isEggSale(params.prefillJenis)) {
      const { hargaJualPerButir, isiPerRak } = StorageService.getSettings();
      const hargaPerRak = hargaJualPerButir * isiPerRak;
      if (hargaPerRak > 0 && hargaSatEl) hargaSatEl.value = hargaPerRak;
    }
  }

  // ── Ringkasan update helpers ───────────────────────────────────────────
  function updateRingkasan() {
    const { count, totalMasuk, totalKeluar } = getMonthSummary();
    const cEl = document.getElementById('stat-count');
    const mEl = document.getElementById('stat-masuk');
    const kEl = document.getElementById('stat-keluar');
    if (cEl) cEl.textContent = count;
    if (mEl) mEl.textContent = formatRupiah(totalMasuk);
    if (kEl) kEl.textContent = formatRupiah(totalKeluar);
  }

  function updateStokDisplay() {
    const stok     = StorageService.getStokTelur();
    const settings = StorageService.getSettings();
    const el       = document.getElementById('stok-info');
    if (el) {
      el.textContent = `${stok.toLocaleString('id-ID')} butir  ≈ ${(stok / settings.isiPerRak).toFixed(1)} rak`;
    }
    // Also rerun stok conversion hint
    recalcNominal();
  }

  function resetForm() {
    form.reset();
    document.getElementById('tanggal').value = getTodayStr();
    if (groupKet)    groupKet.style.display    = 'none';
    if (groupSatuan) groupSatuan.style.display  = 'none';
    if (groupQtyHrg) groupQtyHrg.style.display  = 'none';
    if (konversiEl)  konversiEl.style.display   = 'none';
    if (hintEl)      hintEl.textContent          = '';
    clearAllErrors();
  }

  // ── Form submit ────────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors();

    const jenis      = jenisEl.value;
    const tanggal    = document.getElementById('tanggal').value;
    const lokasi     = document.getElementById('lokasi').value.trim();
    const nominalRaw = document.getElementById('nominal').value;
    const keterangan = keteranganEl?.value.trim() ?? '';
    const kuantitas  = parseFloat(kuantitasEl?.value || 0);
    const hargaSat   = parseFloat(hargaSatEl?.value  || 0);
    const satuan     = getSatuan();

    // ── Validate ──────────────────────────────────────────────────────
    const errors = {};

    if (!jenis) {
      errors.jenis = 'Jenis transaksi wajib dipilih.';
    }
    if (!tanggal) {
      errors.tanggal = 'Tanggal wajib diisi.';
    }
    if (!lokasi) {
      errors.lokasi = 'Lokasi wajib diisi.';
    } else if (lokasi.length > 100) {
      errors.lokasi = 'Lokasi maksimal 100 karakter.';
    }
    if (needsKeterangan(jenis) && !keterangan) {
      errors.keterangan = 'Keterangan wajib diisi.';
    }

    // Qty validation: required for all jenis (biaya_lain qty is optional — default 1)
    const minQty  = jenis === 'biaya_lain' ? 0 : 0.01;
    const qtyFinal = (jenis === 'biaya_lain' && kuantitas <= 0) ? 1 : kuantitas;
    if (jenis !== 'biaya_lain' && kuantitas <= 0) {
      errors.kuantitas = 'Kuantitas harus lebih dari 0.';
    }

    // Harga satuan required for all jenis
    if (hargaSat <= 0 && jenis) {
      errors.hargaSatuan = 'Harga satuan harus lebih dari 0.';
    }

    // Nominal: accept auto-calculated or manually entered
    const nominalFinal = Number(nominalRaw);
    if (!nominalRaw || nominalFinal < 1) {
      errors.nominal = 'Total nominal wajib diisi dan harus > 0.';
    }

    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    // ── Build transaction object ───────────────────────────────────────
    const { isiPerRak } = StorageService.getSettings();

    const tx = {
      id:         generateId(),
      jenis,
      tanggal,
      lokasi,
      nominal:    nominalFinal,
      kuantitas:  qtyFinal,
      hargaSatuan: hargaSat,
      createdAt:  new Date().toISOString(),
    };

    // Egg-sale specific: store butir count for stok deduction
    if (isEggSale(jenis)) {
      if (satuan === 'rak') {
        tx.jumlahRak   = qtyFinal;
        tx.jumlahButir = Math.round(qtyFinal * isiPerRak);
        tx.satuanJual  = 'rak';
      } else {
        tx.jumlahButir = Math.round(qtyFinal);
        tx.jumlahRak   = Math.round(qtyFinal / isiPerRak) || 0;
        tx.satuanJual  = 'butir';
      }
    }

    if (needsKeterangan(jenis)) {
      tx.keterangan = keterangan;
    }

    try {
      StorageService.saveTransaction(tx);
      resetForm();
      updateRingkasan();
      updateStokDisplay();
      showNotification('Transaksi berhasil disimpan! Saldo & stok telah diperbarui.', 'success', 3000);
    } catch (err) {
      if (err instanceof StorageError) {
        showNotification(err.message, 'error', false);
      } else {
        showNotification('Data tidak dapat disimpan. Coba lagi.', 'error', false);
      }
    }
  });
}