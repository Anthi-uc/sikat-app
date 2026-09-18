// produksi.js — Produksi Harian: input rak/butir, isiPerRak, harga jual,
//               grafik bulanan, stok telur, edit/hapus baris

import { StorageService, generateId } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { Validator } from '../validator.js';
import { ChartManager } from '../charts.js';
import { showNotification } from '../app.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _BULAN_NAMA = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

function formatTanggal(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatRupiah(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Module-level state ───────────────────────────────────────────────────────

const _now = new Date();
let _chartYear  = _now.getFullYear();
let _chartMonth = _now.getMonth(); // 0-indexed
let _editingTanggal = null;

// ─── HTML builders ────────────────────────────────────────────────────────────

function _buildRiwayatHTML(productions) {
  const { isiPerRak } = StorageService.getSettings();
  const sorted = [...productions].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  if (sorted.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🥚</div>
        <p class="empty-state-message">Belum ada data produksi</p>
      </div>`;
  }

  return sorted.map((p) => {
    const butir = p.jumlahButir ?? (p.jumlahRak * isiPerRak);
    return `
      <div class="produksi-item" data-tanggal="${escHtml(p.tanggal)}">
        <div class="produksi-item-info">
          <span class="produksi-item-date">${formatTanggal(p.tanggal)}</span>
          <span class="produksi-item-rak">${p.jumlahRak} Rak / ${butir.toLocaleString('id-ID')} butir</span>
          <span class="badge badge-success">Terinput</span>
        </div>
        <div class="produksi-item-actions tx-actions">
          <button class="btn-edit-prod"
                  data-tanggal="${escHtml(p.tanggal)}"
                  title="Edit Produksi"
                  aria-label="Edit produksi ${formatTanggal(p.tanggal)}">✏️</button>
          <button class="btn-delete-prod"
                  data-tanggal="${escHtml(p.tanggal)}"
                  title="Hapus Produksi"
                  aria-label="Hapus produksi ${formatTanggal(p.tanggal)}">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function _buildEditFormHTML(prod) {
  const { isiPerRak } = StorageService.getSettings();
  const butir = prod.jumlahButir ?? (prod.jumlahRak * isiPerRak);

  return `
    <div class="inline-edit-form" id="edit-prod-form-card">
      <h4>✏️ Edit Produksi — ${formatTanggal(prod.tanggal)}</h4>

      <div class="form-group">
        <label class="form-label" for="edit-prod-tanggal">Tanggal</label>
        <input class="form-control" type="date" id="edit-prod-tanggal"
               value="${escHtml(prod.tanggal)}">
        <span class="form-error" id="edit-prod-err-tanggal" hidden></span>
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-prod-rak">Jumlah Rak</label>
        <input class="form-control" type="number" id="edit-prod-rak"
               min="1" max="9999" step="1" value="${prod.jumlahRak}">
        <span class="form-error" id="edit-prod-err-rak" hidden></span>
        <span class="form-hint" id="edit-prod-butir-hint"
              style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;">
          = ${butir.toLocaleString('id-ID')} butir
        </span>
      </div>

      <div class="inline-edit-actions">
        <button class="btn btn-primary" id="edit-prod-save">💾 Simpan</button>
        <button class="btn btn-outline" id="edit-prod-cancel">Batal</button>
      </div>
    </div>`;
}

// ─── render ───────────────────────────────────────────────────────────────────

export function render(params = {}) {
  _editingTanggal = null;
  _chartYear  = _now.getFullYear();
  _chartMonth = _now.getMonth();

  let productions   = [];
  let rataRata      = 0;
  const settings    = StorageService.getSettings();

  try {
    productions = StorageService.getProductions();
    rataRata    = CalculationEngine.getRataRataProduksi(productions, 7);
  } catch (e) { /* fallback defaults */ }

  const stok       = StorageService.getStokTelur();
  const bulanLabel = `${_BULAN_NAMA[_chartMonth]} ${_chartYear}`;

  return `
    <div class="welcome-card">
      <div class="icon">🥚</div>
      <h2>Produksi Harian</h2>
      <p>Catat hasil telur &amp; pantau stok</p>
    </div>

    <!-- Stok Telur -->
    <div class="stok-card" id="stok-card" style="
      background: linear-gradient(135deg, var(--color-citrine) 0%, #ca9a02 100%);
      color: #1e293b; border-radius: var(--radius-lg); padding: var(--space-5);
      margin-bottom: var(--space-6); box-shadow: var(--shadow-md);
      display: flex; align-items: center; justify-content: space-between; gap: var(--space-4);">
      <div>
        <p style="font-size:var(--font-size-sm);font-weight:600;opacity:0.8;margin-bottom:4px;">
          📦 Stok Telur Tersedia
        </p>
        <p style="font-size:var(--font-size-3xl);font-weight:800;line-height:1;" id="stok-butir">
          ${stok.toLocaleString('id-ID')}
        </p>
        <p style="font-size:var(--font-size-xs);opacity:0.7;margin-top:2px;">butir</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:var(--font-size-sm);opacity:0.8;margin-bottom:4px;">≈ Setara</p>
        <p style="font-size:var(--font-size-xl);font-weight:700;" id="stok-rak">
          ${(stok / settings.isiPerRak).toFixed(1)}
        </p>
        <p style="font-size:var(--font-size-xs);opacity:0.7;">rak</p>
      </div>
    </div>

    <!-- Pengaturan Produksi -->
    <div class="card" style="margin-bottom:var(--space-6)">
      <p class="card-title">⚙️ Pengaturan Produksi</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4);">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" for="isi-per-rak">Isi per Rak (butir)</label>
          <input class="form-control" type="number" id="isi-per-rak"
                 min="1" max="999" step="1" value="${settings.isiPerRak}"
                 placeholder="Default: 30">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label" for="harga-per-butir">Harga Jual / Butir (Rp)</label>
          <input class="form-control" type="number" id="harga-per-butir"
                 min="0" max="99999" step="1" value="${settings.hargaJualPerButir}"
                 placeholder="Contoh: 2000">
        </div>
      </div>
      <button class="btn btn-outline btn-sm" id="btn-simpan-settings"
              style="margin-top:var(--space-3);">
        💾 Simpan Pengaturan
      </button>
    </div>

    <!-- Form Input Produksi -->
    <div class="produksi-form">
      <form id="form-produksi" novalidate>

        <div class="form-group">
          <label class="form-label" for="prod-tanggal">Tanggal</label>
          <input class="form-control" type="date" id="prod-tanggal" name="tanggal">
          <span class="form-error" id="err-prod-tanggal" hidden></span>
        </div>

        <!-- Input mode toggle -->
        <div class="form-group">
          <label class="form-label">Metode Input</label>
          <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-sm);">
              <input type="radio" name="input-mode" value="rak" checked> Per Rak
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:var(--font-size-sm);">
              <input type="radio" name="input-mode" value="butir"> Per Butir Langsung
            </label>
          </div>
        </div>

        <!-- Rak input (shown in "rak" mode) -->
        <div class="form-group" id="group-rak-input">
          <label class="form-label" for="prod-rak">Jumlah Rak</label>
          <input class="form-control" type="number" id="prod-rak"
            min="1" max="9999" step="1" placeholder="Contoh: 35">
          <span class="form-error" id="err-prod-rak" hidden></span>
          <span id="hint-butir-from-rak"
                style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;display:block;">
          </span>
        </div>

        <!-- Butir input (shown in "butir" mode, hidden by default) -->
        <div class="form-group" id="group-butir-input" style="display:none">
          <label class="form-label" for="prod-butir">Jumlah Butir</label>
          <input class="form-control" type="number" id="prod-butir"
            min="1" max="999999" step="1" placeholder="Contoh: 1050">
          <span class="form-error" id="err-prod-butir" hidden></span>
          <span id="hint-rak-from-butir"
                style="font-size:var(--font-size-xs);color:var(--color-text-muted);margin-top:2px;display:block;">
          </span>
        </div>

        <!-- Estimasi nilai produksi -->
        <div id="est-nilai" style="
          display:none; background:var(--color-teal-light); border-radius:var(--radius-md);
          padding:var(--space-3) var(--space-4); margin-bottom:var(--space-4);
          font-size:var(--font-size-sm); color:#134e4a;">
          💰 Estimasi Nilai: <strong id="est-nilai-rp">—</strong>
        </div>

        <button type="submit" class="btn btn-primary btn-full">💾 Simpan</button>
      </form>
    </div>

    <!-- Edit form slot -->
    <div id="edit-prod-slot"></div>

    <!-- Grafik bulanan -->
    <div class="card" style="margin-bottom:var(--space-6)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
        <p style="font-weight:700;">📈 Tren Produksi Bulanan</p>
        <div style="display:flex;align-items:center;gap:var(--space-2)">
          <button class="month-nav-btn" id="chart-prev-month" aria-label="Bulan sebelumnya" style="width:28px;height:28px;">&#8592;</button>
          <span id="chart-month-label" style="font-size:var(--font-size-sm);font-weight:600;min-width:110px;text-align:center;">${bulanLabel}</span>
          <button class="month-nav-btn" id="chart-next-month" aria-label="Bulan berikutnya"
            ${(_chartYear === _now.getFullYear() && _chartMonth === _now.getMonth()) ? 'disabled' : ''}
            style="width:28px;height:28px;">&#8594;</button>
        </div>
      </div>
      <div class="chart-container">
        <canvas id="chart-produksi" aria-label="Grafik Tren Produksi Bulanan"></canvas>
      </div>
    </div>

    <!-- Ringkasan 7 hari -->
    <div class="summary-box" id="box-prod-ringkasan" style="margin-bottom:var(--space-6)">
      <p class="summary-box-title">Ringkasan 7 Hari Terakhir</p>
      <div class="summary-row">
        <span class="summary-row-label">Rata-rata Produksi/Hari</span>
        <span class="summary-row-value" id="stat-rata-rata">${rataRata} Rak</span>
      </div>
      <div class="summary-row">
        <span class="summary-row-label">Stok Tersedia</span>
        <span class="summary-row-value" id="stat-stok-inline"
              style="color:var(--color-citrine);">${stok.toLocaleString('id-ID')} butir</span>
      </div>
    </div>

    <!-- Riwayat Produksi -->
    <div class="produksi-list" id="produksi-list-container">
      <p class="produksi-list-title">Riwayat Produksi</p>
      ${_buildRiwayatHTML(productions)}
    </div>
  `;
}

// ─── Full UI refresh ──────────────────────────────────────────────────────────

function _refreshUI() {
  const prods    = StorageService.getProductions();
  const settings = StorageService.getSettings();
  const stok     = StorageService.getStokTelur();

  // Stok card
  const stokButirEl = document.getElementById('stok-butir');
  if (stokButirEl) stokButirEl.textContent = stok.toLocaleString('id-ID');
  const stokRakEl = document.getElementById('stok-rak');
  if (stokRakEl) stokRakEl.textContent = (stok / settings.isiPerRak).toFixed(1);
  const stokInline = document.getElementById('stat-stok-inline');
  if (stokInline) stokInline.textContent = `${stok.toLocaleString('id-ID')} butir`;

  // Chart (monthly)
  _renderChart(prods);

  // Summary
  const rataEl = document.getElementById('stat-rata-rata');
  if (rataEl) rataEl.textContent = `${CalculationEngine.getRataRataProduksi(prods, 7)} Rak`;

  // List
  const listEl = document.getElementById('produksi-list-container');
  if (listEl) {
    listEl.innerHTML = `<p class="produksi-list-title">Riwayat Produksi</p>${_buildRiwayatHTML(prods)}`;
    _attachListItemListeners(listEl);
  }

  // Clear edit slot
  const slot = document.getElementById('edit-prod-slot');
  if (slot) slot.innerHTML = '';
  _editingTanggal = null;
}

function _renderChart(prods) {
  try {
    const chartData = CalculationEngine.getDataGrafikProduksiBulanan(prods, _chartYear, _chartMonth);
    ChartManager.renderProductionChart('chart-produksi', chartData);
  } catch (e) { console.error('[Produksi] chart error:', e); }
}

// ─── attachListeners ──────────────────────────────────────────────────────────

export function attachListeners(params = {}) {
  _editingTanggal = null;
  _chartYear  = _now.getFullYear();
  _chartMonth = _now.getMonth();

  const settings = StorageService.getSettings();

  // ── Error helpers ──────────────────────────────────────────────────────
  function showErr(id, msg) {
    const el  = document.getElementById(id);
    const inp = document.getElementById(id.replace('err-',''));
    if (el)  { el.textContent = msg; el.removeAttribute('hidden'); }
    if (inp)  inp.classList.add('is-invalid');
  }
  function clearErr(id) {
    const el  = document.getElementById(id);
    const inp = document.getElementById(id.replace('err-',''));
    if (el)  { el.textContent = ''; el.setAttribute('hidden', ''); }
    if (inp)  inp.classList.remove('is-invalid');
  }
  function clearAllErrors() {
    ['err-prod-tanggal','err-prod-rak','err-prod-butir'].forEach(clearErr);
  }

  // ── Input mode toggle ──────────────────────────────────────────────────
  let inputMode = 'rak';
  const groupRak   = document.getElementById('group-rak-input');
  const groupButir = document.getElementById('group-butir-input');
  const estDiv     = document.getElementById('est-nilai');
  const estRp      = document.getElementById('est-nilai-rp');
  const prodRakEl  = document.getElementById('prod-rak');
  const prodButirEl= document.getElementById('prod-butir');
  const hintButir  = document.getElementById('hint-butir-from-rak');
  const hintRak    = document.getElementById('hint-rak-from-butir');

  function getCurrentIsiPerRak() {
    const v = Number(document.getElementById('isi-per-rak')?.value);
    return (v && v > 0) ? v : settings.isiPerRak;
  }

  function updateHints() {
    const ipr = getCurrentIsiPerRak();
    const harga = Number(document.getElementById('harga-per-butir')?.value || 0);

    if (inputMode === 'rak') {
      const rak = Number(prodRakEl?.value || 0);
      const butir = rak * ipr;
      if (hintButir) hintButir.textContent = rak > 0 ? `= ${butir.toLocaleString('id-ID')} butir` : '';
      if (estDiv && estRp) {
        if (rak > 0 && harga > 0) {
          estRp.textContent = formatRupiah(butir * harga);
          estDiv.style.display = '';
        } else {
          estDiv.style.display = 'none';
        }
      }
    } else {
      const butir = Number(prodButirEl?.value || 0);
      const rak   = ipr > 0 ? (butir / ipr).toFixed(2) : '—';
      if (hintRak) hintRak.textContent = butir > 0 ? `≈ ${rak} rak` : '';
      if (estDiv && estRp) {
        if (butir > 0 && harga > 0) {
          estRp.textContent = formatRupiah(butir * harga);
          estDiv.style.display = '';
        } else {
          estDiv.style.display = 'none';
        }
      }
    }
  }

  document.querySelectorAll('input[name="input-mode"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      inputMode = radio.value;
      if (inputMode === 'rak') {
        groupRak.style.display   = '';
        groupButir.style.display = 'none';
      } else {
        groupRak.style.display   = 'none';
        groupButir.style.display = '';
      }
      clearAllErrors();
      updateHints();
    });
  });

  prodRakEl?.addEventListener('input', updateHints);
  prodButirEl?.addEventListener('input', updateHints);
  document.getElementById('isi-per-rak')?.addEventListener('input', updateHints);
  document.getElementById('harga-per-butir')?.addEventListener('input', updateHints);

  // ── Save settings button ───────────────────────────────────────────────
  document.getElementById('btn-simpan-settings')?.addEventListener('click', () => {
    const isiPerRak       = Number(document.getElementById('isi-per-rak')?.value);
    const hargaJualPerButir = Number(document.getElementById('harga-per-butir')?.value || 0);
    if (!isiPerRak || isiPerRak < 1) {
      showNotification('Isi per rak harus minimal 1 butir.', 'warning', 3000);
      return;
    }
    StorageService.saveSettings({ isiPerRak, hargaJualPerButir });
    showNotification('Pengaturan produksi disimpan!', 'success', 3000);
    updateHints();
  });

  // ── Initial chart render ───────────────────────────────────────────────
  try {
    const prods = StorageService.getProductions();
    _renderChart(prods);
  } catch (e) { console.error('[Produksi] chart init error:', e); }

  // ── Chart month navigation ─────────────────────────────────────────────
  function updateChartMonthLabel() {
    const lbl = document.getElementById('chart-month-label');
    if (lbl) lbl.textContent = `${_BULAN_NAMA[_chartMonth]} ${_chartYear}`;
    const nextBtn = document.getElementById('chart-next-month');
    if (nextBtn) nextBtn.disabled = (_chartYear === _now.getFullYear() && _chartMonth === _now.getMonth());
    _renderChart(StorageService.getProductions());
  }

  document.getElementById('chart-prev-month')?.addEventListener('click', () => {
    _chartMonth--;
    if (_chartMonth < 0) { _chartMonth = 11; _chartYear--; }
    updateChartMonthLabel();
  });

  document.getElementById('chart-next-month')?.addEventListener('click', () => {
    if (_chartYear === _now.getFullYear() && _chartMonth === _now.getMonth()) return;
    _chartMonth++;
    if (_chartMonth > 11) { _chartMonth = 0; _chartYear++; }
    updateChartMonthLabel();
  });

  // ── Form submit ────────────────────────────────────────────────────────
  const form = document.getElementById('form-produksi');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearAllErrors();

      const isoDate = (document.getElementById('prod-tanggal').value || '').trim();
      if (!isoDate) { showErr('err-prod-tanggal', 'Tanggal wajib diisi.'); return; }

      const ipr = getCurrentIsiPerRak();
      let jumlahRak, jumlahButir;

      if (inputMode === 'rak') {
        const rakVal = prodRakEl?.value;
        const result = Validator.validateProduksi({ tanggal: '01/01/2000', jumlahRak: rakVal });
        if (result.errors.jumlahRak) { showErr('err-prod-rak', result.errors.jumlahRak); return; }
        jumlahRak   = Number(rakVal);
        jumlahButir = jumlahRak * ipr;
      } else {
        const butirVal = Number(prodButirEl?.value || 0);
        if (!butirVal || butirVal < 1 || !Number.isInteger(butirVal)) {
          showErr('err-prod-butir', 'Jumlah butir harus bilangan bulat ≥ 1.');
          return;
        }
        jumlahButir = butirVal;
        jumlahRak   = Math.round(butirVal / ipr) || 0;
      }

      const existing    = StorageService.getProductions();
      const isDuplicate = existing.some((p) => p.tanggal === isoDate);
      const newProd = {
        id:         generateId(),
        tanggal:    isoDate,
        jumlahRak,
        jumlahButir,
        createdAt:  new Date().toISOString(),
      };

      if (isDuplicate) {
        const label = formatTanggal(isoDate);
        if (!window.confirm(`Data produksi untuk tanggal ${label} sudah ada. Timpa data lama?`)) return;
        StorageService.saveProduction(newProd, true);
      } else {
        StorageService.saveProduction(newProd, false);
      }

      form.reset();
      clearAllErrors();
      groupButir.style.display = 'none';
      groupRak.style.display   = '';
      inputMode = 'rak';
      document.querySelector('input[name="input-mode"][value="rak"]').checked = true;
      if (hintButir) hintButir.textContent = '';
      if (estDiv)    estDiv.style.display  = 'none';

      _refreshUI();
      showNotification('Data produksi berhasil disimpan!', 'success', 3000);
    });
  }

  // ── List item listeners ────────────────────────────────────────────────
  const listEl = document.getElementById('produksi-list-container');
  if (listEl) _attachListItemListeners(listEl);
}

// ─── List-item event delegation ───────────────────────────────────────────────

function _attachListItemListeners(container) {
  const clone = container.cloneNode(true);
  container.parentNode.replaceChild(clone, container);

  const handler = (e) => {
    const deleteBtn = e.target.closest('.btn-delete-prod');
    if (deleteBtn) { e.preventDefault(); _handleDelete(deleteBtn.getAttribute('data-tanggal')); return; }
    const editBtn = e.target.closest('.btn-edit-prod');
    if (editBtn)   { e.preventDefault(); _handleEditOpen(editBtn.getAttribute('data-tanggal')); return; }
  };

  clone.addEventListener('click', handler);
  clone.addEventListener('touchend', handler, { passive: false });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

function _handleDelete(tanggal) {
  if (!tanggal) return;
  if (!confirm(`Hapus data produksi tanggal ${formatTanggal(tanggal)}? Tindakan tidak dapat dibatalkan.`)) return;
  const ok = StorageService.deleteProduction(tanggal);
  if (ok) { showNotification('Data produksi berhasil dihapus!', 'success', 3000); _refreshUI(); }
  else      showNotification('Gagal menghapus data produksi.', 'error');
}

// ─── Edit ────────────────────────────────────────────────────────────────────

function _handleEditOpen(tanggal) {
  if (!tanggal) return;
  const prod = StorageService.getProductions().find((p) => p.tanggal === tanggal);
  if (!prod) return;

  if (_editingTanggal === tanggal) { _closeEditForm(); return; }
  _editingTanggal = tanggal;

  const slot = document.getElementById('edit-prod-slot');
  if (slot) {
    slot.innerHTML = _buildEditFormHTML(prod);
    slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    _attachEditFormListeners(prod);
  }
}

function _closeEditForm() {
  const slot = document.getElementById('edit-prod-slot');
  if (slot) slot.innerHTML = '';
  _editingTanggal = null;
}

function _attachEditFormListeners(originalProd) {
  document.getElementById('edit-prod-cancel')?.addEventListener('click', _closeEditForm);

  // Live hint update in edit form
  const editRakEl   = document.getElementById('edit-prod-rak');
  const hintEl      = document.getElementById('edit-prod-butir-hint');
  const updateHint  = () => {
    const { isiPerRak } = StorageService.getSettings();
    const rak = Number(editRakEl?.value || 0);
    if (hintEl) hintEl.textContent = rak > 0 ? `= ${(rak * isiPerRak).toLocaleString('id-ID')} butir` : '';
  };
  editRakEl?.addEventListener('input', updateHint);

  document.getElementById('edit-prod-save')?.addEventListener('click', () => {
    const newTanggal = (document.getElementById('edit-prod-tanggal')?.value || '').trim();
    const newRak     = Number(document.getElementById('edit-prod-rak')?.value || 0);

    if (!newTanggal)            { showNotification('Tanggal wajib diisi.', 'warning', 3000); return; }
    if (!newRak || newRak < 1 || newRak > 9999) {
      showNotification('Jumlah rak harus antara 1 dan 9999.', 'warning', 3000); return;
    }

    const { isiPerRak }   = StorageService.getSettings();
    const newButir        = newRak * isiPerRak;
    const tanggalChanged  = newTanggal !== originalProd.tanggal;

    if (tanggalChanged) {
      const prods    = StorageService.getProductions();
      const conflict = prods.find((p) => p.tanggal === newTanggal);
      if (conflict) {
        if (!confirm(`Data produksi untuk tanggal ${formatTanggal(newTanggal)} sudah ada. Timpa?`)) return;
        StorageService.deleteProduction(newTanggal);
      }
      StorageService.deleteProduction(originalProd.tanggal);
      StorageService.saveProduction({
        id: originalProd.id || generateId(), tanggal: newTanggal,
        jumlahRak: newRak, jumlahButir: newButir,
        createdAt: originalProd.createdAt || new Date().toISOString(),
      }, false);
    } else {
      StorageService.updateProduction(originalProd.tanggal, { jumlahRak: newRak, jumlahButir: newButir });
    }

    showNotification('Data produksi berhasil diperbarui!', 'success', 3000);
    _refreshUI();
  });
}
