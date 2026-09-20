// js/transaction-form.js — Komponen Form Transaksi Bersama (Input Transaksi & Buku Kas)
// Mendukung kategori bertingkat, kalkulasi otomatis Qty × Harga, konversi telur, dan validasi standar.

import {
  CATEGORIES,
  AVAILABLE_UNITS,
  getCategoryById,
  getSubcategory,
  findCategoryAndSub,
  getKeteranganPlaceholder,
} from './categories.js';
import { StorageService, generateId, StorageError } from './storage.js';
import { Validator } from './validator.js';
import { showNotification } from './app.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render HTML form transaksi terpadu
 * @param {object} options
 * @param {string} [options.formId='form-transaksi'] ID unik form
 * @param {object} [options.initialData] Data transaksi untuk mode edit/prefill
 * @param {'page'|'inline'} [options.mode='page'] Mode tampilan ('page' untuk form halaman penuh, 'inline' untuk kartu edit)
 * @param {boolean} [options.showCancel=false] Tampilkan tombol batal
 * @param {string} [options.submitLabel='💾 Simpan Transaksi'] Label tombol submit
 * @returns {string} HTML string
 */
export function renderTransactionForm({
  formId = 'form-transaksi',
  initialData = {},
  mode = 'page',
  showCancel = false,
  submitLabel = '💾 Simpan Transaksi',
} = {}) {
  // Resolusi kategori & subkategori dari initialData (termasuk legacy data)
  let resolvedCat = initialData.kategori;
  let resolvedSub = initialData.subKategori || initialData.jenis;

  if (resolvedSub && !resolvedCat) {
    const matched = findCategoryAndSub(resolvedSub);
    if (matched) {
      resolvedCat = matched.category.id;
      resolvedSub = matched.subcategory.id;
    }
  }

  // Fallback awal jika belum ditentukan
  const defaultCatId = resolvedCat || 'penjualan';
  const catObj = getCategoryById(defaultCatId) || CATEGORIES[0];
  const defaultSubId = resolvedSub || (catObj.subcategories[0]?.id || '');
  const subObj = getSubcategory(catObj.id, defaultSubId) || catObj.subcategories[0];

  const tanggal = initialData.tanggal || getTodayStr();
  const lokasi = initialData.lokasi || '';
  const keterangan = initialData.keterangan || '';
  const kuantitas = initialData.kuantitas ?? (initialData.jumlahRak ?? (initialData.jumlahButir ?? ''));
  const satuan = initialData.satuan || (subObj?.defaultUnit || 'unit');
  const hargaSatuan = initialData.hargaSatuan ?? '';
  const nominal = initialData.nominal ?? '';

  // Options kategori utama
  const catOptions = CATEGORIES.map(c => `
    <option value="${c.id}" ${c.id === catObj.id ? 'selected' : ''}>
      ${c.icon} ${esc(c.name)}
    </option>
  `).join('');

  // Options sub-kategori awal
  const subOptions = catObj.subcategories.map(s => `
    <option value="${s.id}" ${s.id === subObj?.id ? 'selected' : ''}>
      ${s.icon} ${esc(s.name)}
    </option>
  `).join('');

  // Options satuan umum
  const unitOptions = AVAILABLE_UNITS.map(u => `
    <option value="${u.value}" ${u.value === satuan ? 'selected' : ''}>
      ${esc(u.label)}
    </option>
  `).join('');

  const isEgg = subObj?.isEgg || defaultSubId === 'penjualan_telur';
  const isInline = mode === 'inline';
  const cardTitle = initialData.id ? '✏️ Edit Transaksi' : '➕ Tambah Transaksi Baru';

  return `
    <div class="${isInline ? 'inline-edit-form' : 'transaksi-form'}" id="${formId}-wrap">
      ${isInline ? `<h4>${cardTitle}</h4>` : ''}

      <form id="${formId}" novalidate>
        <!-- Baris 1: Kategori Utama & Sub-kategori -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:var(--space-3);margin-bottom:var(--space-4);">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="${formId}-kategori">Kategori Transaksi</label>
            <select class="form-control" id="${formId}-kategori" name="kategori">
              ${catOptions}
            </select>
            <span class="form-error" id="${formId}-err-kategori" hidden></span>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="${formId}-subkategori">Sub-kategori</label>
            <select class="form-control" id="${formId}-subkategori" name="subKategori">
              ${subOptions}
            </select>
            <span class="form-error" id="${formId}-err-subKategori" hidden></span>
          </div>
        </div>

        <!-- Baris 2: Keterangan / Nama Barang -->
        <div class="form-group" id="${formId}-group-keterangan">
          <label class="form-label" for="${formId}-keterangan" id="${formId}-label-keterangan">
            Nama / Keterangan Transaksi ${subObj?.needKeterangan ? '<span style="color:var(--color-danger)">*</span>' : '(Opsional)'}
          </label>
          <input class="form-control" type="text" id="${formId}-keterangan" name="keterangan"
            placeholder="${esc(getKeteranganPlaceholder(catObj.id, subObj?.id))}"
            maxlength="100" value="${esc(keterangan)}">
          <span class="form-error" id="${formId}-err-keterangan" hidden></span>
        </div>

        <!-- Baris 3: Tanggal & Lokasi -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:var(--space-3);margin-bottom:var(--space-4);">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="${formId}-tanggal">Tanggal</label>
            <input class="form-control" type="date" id="${formId}-tanggal" name="tanggal"
              value="${esc(tanggal)}">
            <span class="form-error" id="${formId}-err-tanggal" hidden></span>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="${formId}-lokasi">Lokasi / Keterangan Tempat</label>
            <input class="form-control" type="text" id="${formId}-lokasi" name="lokasi"
              placeholder=""
              maxlength="100" value="${esc(lokasi)}">
            <span class="form-error" id="${formId}-err-lokasi" hidden></span>
          </div>
        </div>

        <!-- Baris 4: Pemilihan Satuan -->
        <!-- Opsi A: Satuan Khusus Telur (Rak / Butir) -->
        <div class="form-group" id="${formId}-group-satuan-telur" style="${isEgg ? '' : 'display:none;'}">
          <label class="form-label">Satuan Telur</label>
          <div style="display:flex;gap:var(--space-4);align-items:center;padding:var(--space-2) 0;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-sm);font-weight:600;">
              <input type="radio" name="${formId}-satuan-telur" value="rak" ${satuan !== 'butir' ? 'checked' : ''}>
              Per Rak
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-sm);font-weight:600;">
              <input type="radio" name="${formId}-satuan-telur" value="butir" ${satuan === 'butir' ? 'checked' : ''}>
              Per Butir
            </label>
            <span id="${formId}-telur-ratio-hint" style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-left:auto;">
              (1 rak = 30 butir)
            </span>
          </div>
        </div>

        <!-- Opsi B: Satuan Umum -->
        <div class="form-group" id="${formId}-group-satuan-umum" style="${!isEgg ? '' : 'display:none;'}">
          <label class="form-label" for="${formId}-satuan">Satuan</label>
          <select class="form-control" id="${formId}-satuan" name="satuan">
            ${unitOptions}
          </select>
        </div>

        <!-- Baris 5: Kuantitas & Harga Satuan (Kalkulasi Otomatis) -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:var(--space-3);margin-bottom:var(--space-4);">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="${formId}-kuantitas" id="${formId}-label-kuantitas">
              Kuantitas (<span id="${formId}-unit-badge">${esc(satuan)}</span>)
            </label>
            <input class="form-control" type="number" id="${formId}-kuantitas" name="kuantitas"
              min="0.01" step="any" placeholder="Contoh: 10" value="${kuantitas}">
            <span class="form-error" id="${formId}-err-kuantitas" hidden></span>
          </div>

          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" for="${formId}-harga-satuan" id="${formId}-label-harga-satuan">
              Harga Satuan (Rp)
            </label>
            <input class="form-control" type="number" id="${formId}-harga-satuan" name="hargaSatuan"
              min="0" step="1" placeholder="Contoh: 30000" value="${hargaSatuan}">
            <span class="form-error" id="${formId}-err-hargaSatuan" hidden></span>
          </div>
        </div>

        <!-- Info Konversi Stok Telur (Tampil jika transaksi berkaitan dengan telur) -->
        <div id="${formId}-stok-konversi" style="display:none;background:var(--color-citrine-light);border:1px solid var(--color-citrine);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);font-size:var(--font-size-xs);margin-bottom:var(--space-4);color:#713f12;">
        </div>

        <!-- Baris 6: Total Nominal -->
        <div class="form-group" style="margin-bottom:var(--space-4);">
          <label class="form-label" for="${formId}-nominal">
            Total Nominal (Rp)
            <span id="${formId}-calc-hint" style="font-weight:600;color:var(--color-teal);font-size:var(--font-size-xs);margin-left:6px;"></span>
          </label>
          <input class="form-control" type="number" id="${formId}-nominal" name="nominal"
            min="1" max="999999999999" step="1" placeholder="Terisi otomatis atau isi manual" value="${nominal}">
          <span class="form-error" id="${formId}-err-nominal" hidden></span>
        </div>

        <!-- Tombol Aksi -->
        <div class="${isInline ? 'inline-edit-actions' : ''}" style="${!isInline ? 'margin-top:var(--space-3);' : ''}">
          <button type="submit" class="btn btn-primary ${isInline ? '' : 'btn-full'}" id="${formId}-btn-submit">
            ${esc(submitLabel)}
          </button>
          ${showCancel ? `
            <button type="button" class="btn btn-outline" id="${formId}-btn-cancel">
              Batal
            </button>
          ` : ''}
        </div>
      </form>
    </div>
  `;
}

/**
 * Pasang seluruh event listener untuk form transaksi terpadu
 * @param {object} options
 * @param {string} [options.formId='form-transaksi'] ID unik form
 * @param {object} [options.initialData] Data transaksi awal jika edit
 * @param {Function} [options.onSaved] Callback setelah simpan sukses (menerima data tx tersimpan)
 * @param {Function} [options.onCancel] Callback jika tombol batal ditekan
 */
export function attachTransactionFormListeners({
  formId = 'form-transaksi',
  initialData = null,
  onSaved = null,
  onCancel = null,
} = {}) {
  const form = document.getElementById(formId);
  if (!form) return;

  const kategoriEl   = document.getElementById(`${formId}-kategori`);
  const subkategoriEl= document.getElementById(`${formId}-subkategori`);
  const keteranganEl = document.getElementById(`${formId}-keterangan`);
  const labelKetEl   = document.getElementById(`${formId}-label-keterangan`);
  const tanggalEl    = document.getElementById(`${formId}-tanggal`);
  const lokasiEl     = document.getElementById(`${formId}-lokasi`);
  const groupTelurEl = document.getElementById(`${formId}-group-satuan-telur`);
  const groupUmumEl  = document.getElementById(`${formId}-group-satuan-umum`);
  const satuanEl     = document.getElementById(`${formId}-satuan`);
  const unitBadgeEl  = document.getElementById(`${formId}-unit-badge`);
  const kuantitasEl  = document.getElementById(`${formId}-kuantitas`);
  const hargaSatEl   = document.getElementById(`${formId}-harga-satuan`);
  const nominalEl    = document.getElementById(`${formId}-nominal`);
  const hintEl       = document.getElementById(`${formId}-calc-hint`);
  const konversiEl   = document.getElementById(`${formId}-stok-konversi`);
  const ratioHintEl  = document.getElementById(`${formId}-telur-ratio-hint`);
  const cancelBtn    = document.getElementById(`${formId}-btn-cancel`);

  const settings = StorageService.getSettings();
  const isiPerRak = settings.isiPerRak || 30;

  if (ratioHintEl) {
    ratioHintEl.textContent = `(1 rak = ${isiPerRak} butir)`;
  }

  // ── Error Helpers ──────────────────────────────────────────────────────────
  const FIELD_IDS = {
    kategori:    `${formId}-err-kategori`,
    subKategori: `${formId}-err-subKategori`,
    jenis:       `${formId}-err-subKategori`,
    tanggal:     `${formId}-err-tanggal`,
    lokasi:      `${formId}-err-lokasi`,
    keterangan:  `${formId}-err-keterangan`,
    kuantitas:   `${formId}-err-kuantitas`,
    hargaSatuan: `${formId}-err-hargaSatuan`,
    nominal:     `${formId}-err-nominal`,
  };

  const INPUT_IDS = {
    kategori:    `${formId}-kategori`,
    subKategori: `${formId}-subkategori`,
    jenis:       `${formId}-subkategori`,
    tanggal:     `${formId}-tanggal`,
    lokasi:      `${formId}-lokasi`,
    keterangan:  `${formId}-keterangan`,
    kuantitas:   `${formId}-kuantitas`,
    hargaSatuan: `${formId}-harga-satuan`,
    nominal:     `${formId}-nominal`,
  };

  function showFieldErrors(errors) {
    clearAllErrors();
    Object.entries(errors).forEach(([field, msg]) => {
      const errEl = document.getElementById(FIELD_IDS[field]);
      const inpEl = document.getElementById(INPUT_IDS[field]);
      if (errEl) {
        errEl.textContent = msg;
        errEl.removeAttribute('hidden');
      }
      if (inpEl) {
        inpEl.classList.add('is-invalid');
      }
    });
  }

  function clearFieldError(field) {
    const errEl = document.getElementById(FIELD_IDS[field]);
    const inpEl = document.getElementById(INPUT_IDS[field]);
    if (errEl) {
      errEl.textContent = '';
      errEl.setAttribute('hidden', '');
    }
    if (inpEl) {
      inpEl.classList.remove('is-invalid');
    }
  }

  function clearAllErrors() {
    Object.keys(FIELD_IDS).forEach(clearFieldError);
  }

  // ── Ambil Satuan Aktif ─────────────────────────────────────────────────────
  function getActiveSubcategory() {
    const catId = kategoriEl?.value || '';
    const subId = subkategoriEl?.value || '';
    return getSubcategory(catId, subId);
  }

  function isCurrentEgg() {
    const sub = getActiveSubcategory();
    return sub?.isEgg || sub?.id === 'penjualan_telur' || sub?.id === 'telur';
  }

  function getActiveUnit() {
    if (isCurrentEgg()) {
      const r = form.querySelector(`input[name="${formId}-satuan-telur"]:checked`);
      return r ? r.value : 'rak';
    }
    return satuanEl?.value || 'unit';
  }

  function updateUnitBadge() {
    const u = getActiveUnit();
    if (unitBadgeEl) unitBadgeEl.textContent = u;
  }

  // ── Konversi Info Stok Telur ──────────────────────────────────────────────
  function updateEggConversionHint() {
    if (!isCurrentEgg() || !konversiEl) {
      if (konversiEl) konversiEl.style.display = 'none';
      return;
    }

    const qty = parseFloat(kuantitasEl?.value) || 0;
    const unit = getActiveUnit();
    const stok = StorageService.getStokTelur();
    const isPenjualan = getActiveSubcategory()?.type === 'in';

    if (unit === 'rak') {
      const butir = Math.round(qty * isiPerRak);
      const sisa = isPenjualan ? stok - butir : stok + butir;
      const warn = isPenjualan && sisa < 0 ? ' ⚠️ Melebihi stok tersedia!' : '';
      konversiEl.innerHTML = `
        <strong>Info Telur:</strong> ${qty} rak = ${butir.toLocaleString('id-ID')} butir.<br>
        Stok saat ini: <strong>${stok.toLocaleString('id-ID')} butir</strong> (≈ ${(stok / isiPerRak).toFixed(1)} rak).
        ${qty > 0 ? `<br>Perkiraan stok akhir: <strong>${Math.max(0, sisa).toLocaleString('id-ID')} butir</strong>${warn}` : ''}
      `;
      konversiEl.style.display = '';
      konversiEl.style.borderColor = (isPenjualan && sisa < 0) ? 'var(--color-danger)' : 'var(--color-citrine)';
    } else {
      const rak = (qty / isiPerRak).toFixed(1);
      const sisa = isPenjualan ? stok - qty : stok + qty;
      const warn = isPenjualan && sisa < 0 ? ' ⚠️ Melebihi stok tersedia!' : '';
      konversiEl.innerHTML = `
        <strong>Info Telur:</strong> ${qty.toLocaleString('id-ID')} butir = ${rak} rak.<br>
        Stok saat ini: <strong>${stok.toLocaleString('id-ID')} butir</strong>.
        ${qty > 0 ? `<br>Perkiraan stok akhir: <strong>${Math.max(0, sisa).toLocaleString('id-ID')} butir</strong>${warn}` : ''}
      `;
      konversiEl.style.display = '';
      konversiEl.style.borderColor = (isPenjualan && sisa < 0) ? 'var(--color-danger)' : 'var(--color-citrine)';
    }
  }

  // ── Kalkulasi Otomatis (Qty × Harga Satuan -> Total) ──────────────────────
  function recalcFromQtyAndPrice() {
    const qty = parseFloat(kuantitasEl?.value) || 0;
    const hrg = parseFloat(hargaSatEl?.value) || 0;

    if (qty > 0 && hrg >= 0) {
      const total = Math.round(qty * hrg);
      if (nominalEl) nominalEl.value = total;
      if (hintEl) hintEl.textContent = `= ${qty} × ${formatRupiah(hrg)}`;
      clearFieldError('nominal');
    } else {
      if (hintEl) hintEl.textContent = '';
    }
    updateEggConversionHint();
  }

  // ── Kalkulasi Otomatis (Total -> Harga Satuan / Qty) ───────────────────────
  function recalcFromTotal() {
    const total = parseFloat(nominalEl?.value) || 0;
    let qty = parseFloat(kuantitasEl?.value) || 0;

    if (total > 0) {
      if (qty <= 0) {
        qty = 1;
        if (kuantitasEl) kuantitasEl.value = 1;
      }
      const hrg = Math.round(total / qty);
      if (hargaSatEl) hargaSatEl.value = hrg;
      if (hintEl) hintEl.textContent = `= ${qty} × ${formatRupiah(hrg)}`;
      clearFieldError('hargaSatuan');
    } else {
      if (hintEl) hintEl.textContent = '';
    }
    updateEggConversionHint();
  }

  // ── Update Tampilan Sub-kategori saat Kategori Berubah ─────────────────────
  function updateSubcategoryOptions(selectedSubId) {
    const catId = kategoriEl?.value;
    const cat = getCategoryById(catId);
    if (!cat || !subkategoriEl) return;

    subkategoriEl.innerHTML = cat.subcategories.map(s => `
      <option value="${s.id}" ${s.id === selectedSubId ? 'selected' : ''}>
        ${s.icon} ${esc(s.name)}
      </option>
    `).join('');

    onSubcategoryChanged();
  }

  function onSubcategoryChanged() {
    const sub = getActiveSubcategory();
    if (!sub) return;

    // Sesuaikan visibilitas dan label satuan
    const isEgg = isCurrentEgg();
    if (groupTelurEl) groupTelurEl.style.display = isEgg ? '' : 'none';
    if (groupUmumEl)  groupUmumEl.style.display  = !isEgg ? '' : 'none';

    if (!isEgg && satuanEl) {
      satuanEl.value = sub.defaultUnit || 'unit';
    }

    updateUnitBadge();

    // Sesuaikan label & placeholder keterangan secara dinamis
    const catId = kategoriEl?.value || '';
    const dynamicPlaceholder = getKeteranganPlaceholder(catId, sub.id);
    if (keteranganEl) {
      keteranganEl.placeholder = dynamicPlaceholder;
    }

    if (labelKetEl) {
      if (sub.needKeterangan) {
        labelKetEl.innerHTML = `Nama / Keterangan Transaksi <span style="color:var(--color-danger)">*</span>`;
      } else {
        labelKetEl.textContent = 'Nama / Keterangan Transaksi (Opsional)';
      }
    }

    // Perbarui kalkulasi & stok hint
    updateEggConversionHint();
    recalcFromQtyAndPrice();
  }

  // ── Event Listeners Input ──────────────────────────────────────────────────

  kategoriEl?.addEventListener('change', () => {
    clearFieldError('kategori');
    const cat = getCategoryById(kategoriEl.value);
    const firstSubId = cat?.subcategories[0]?.id || '';
    updateSubcategoryOptions(firstSubId);
  });

  subkategoriEl?.addEventListener('change', () => {
    clearFieldError('subKategori');
    onSubcategoryChanged();
  });

  form.querySelectorAll(`input[name="${formId}-satuan-telur"]`).forEach(radio => {
    radio.addEventListener('change', () => {
      updateUnitBadge();
      updateEggConversionHint();
    });
  });

  satuanEl?.addEventListener('change', () => {
    updateUnitBadge();
  });

  kuantitasEl?.addEventListener('input', () => {
    clearFieldError('kuantitas');
    recalcFromQtyAndPrice();
  });

  hargaSatEl?.addEventListener('input', () => {
    clearFieldError('hargaSatuan');
    recalcFromQtyAndPrice();
  });

  nominalEl?.addEventListener('input', () => {
    clearFieldError('nominal');
    recalcFromTotal();
  });

  ['tanggal', 'lokasi', 'keterangan'].forEach(field => {
    const inp = document.getElementById(`${formId}-${field}`);
    inp?.addEventListener('input', () => clearFieldError(field));
  });

  // Tombol Batal
  cancelBtn?.addEventListener('click', () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  });

  // ── Submit Handler ─────────────────────────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const kategori    = kategoriEl?.value || '';
    const subKategori = subkategoriEl?.value || '';
    const jenis       = subKategori; // legacy mapping
    const tanggal     = tanggalEl?.value || '';
    const lokasi      = (lokasiEl?.value || '').trim();
    const keterangan  = (keteranganEl?.value || '').trim();
    const satuan      = getActiveUnit();
    const kuantitas   = parseFloat(kuantitasEl?.value) || 0;
    const hargaSatuan = parseFloat(hargaSatEl?.value) || 0;
    const nominal     = parseFloat(nominalEl?.value) || 0;

    // Hitung rak & butir jika transaksi telur
    let jumlahRak = 0;
    let jumlahButir = 0;
    if (isCurrentEgg()) {
      if (satuan === 'rak') {
        jumlahRak = kuantitas;
        jumlahButir = Math.round(kuantitas * isiPerRak);
      } else {
        jumlahButir = Math.round(kuantitas);
        jumlahRak = parseFloat((kuantitas / isiPerRak).toFixed(2));
      }
    }

    const txPayload = {
      kategori,
      subKategori,
      jenis,
      tanggal,
      lokasi,
      keterangan,
      satuan,
      kuantitas,
      hargaSatuan,
      nominal,
      jumlahRak,
      jumlahButir,
    };

    // Validasi menggunakan validator pusat
    const validation = Validator.validateTransaksi(txPayload);
    if (!validation.isValid) {
      showFieldErrors(validation.errors);
      showNotification('Mohon lengkapi kolom yang diperlukan.', 'warning', 3000);
      return;
    }

    clearAllErrors();

    try {
      let savedTx;
      if (initialData?.id) {
        // Mode edit
        const updates = {
          ...txPayload,
          updatedAt: new Date().toISOString(),
        };
        const ok = StorageService.updateTransaction(initialData.id, updates);
        if (!ok) throw new Error('Gagal memperbarui transaksi');
        savedTx = { ...initialData, ...updates };
        showNotification('Transaksi berhasil diperbarui.', 'success', 3000);
      } else {
        // Mode transaksi baru
        savedTx = {
          id: generateId(),
          ...txPayload,
          createdAt: new Date().toISOString(),
        };
        StorageService.saveTransaction(savedTx);
        showNotification('Transaksi berhasil disimpan.', 'success', 3000);
      }

      if (typeof onSaved === 'function') {
        onSaved(savedTx);
      }
    } catch (err) {
      console.error('[TransactionForm] Simpan gagal:', err);
      if (err instanceof StorageError) {
        showNotification(err.message, 'error', 5000);
      } else {
        showNotification('Terjadi kesalahan saat menyimpan transaksi.', 'error', 4000);
      }
    }
  });

  // Inisialisasi awal saat listener dipasang
  onSubcategoryChanged();
}
