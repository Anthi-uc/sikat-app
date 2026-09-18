// produksi.js — View Produksi Harian (Edit + Hapus baris, tanpa window.location.reload)

import { StorageService, generateId } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { Validator } from '../validator.js';
import { ChartManager } from '../charts.js';
import { showNotification } from '../app.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' */
function formatTanggal(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Module-level edit state ─────────────────────────────────────────────────

/** tanggal (ISO) of the row currently being edited, or null */
let _editingTanggal = null;

// ─── HTML builders ───────────────────────────────────────────────────────────

function _buildRiwayatHTML(productions) {
  const sorted = [...productions].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  if (sorted.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🥚</div>
        <p class="empty-state-message">Belum ada data produksi</p>
      </div>`;
  }

  return sorted.map((p) => `
    <div class="produksi-item" data-tanggal="${escHtml(p.tanggal)}">
      <div class="produksi-item-info">
        <span class="produksi-item-date">${formatTanggal(p.tanggal)}</span>
        <span class="produksi-item-rak">${p.jumlahRak} Rak</span>
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
    </div>`).join('');
}

function _buildEditFormHTML(prod) {
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
  let productions = [];
  let rataRata    = 0;
  try {
    productions = StorageService.getProductions();
    rataRata    = CalculationEngine.getRataRataProduksi(productions, 7);
  } catch (e) { /* fallback defaults */ }

  return `
    <div class="welcome-card">
      <div class="icon">🥚</div>
      <h2>Produksi Harian</h2>
      <p>Catat hasil telur hari ini</p>
    </div>

    <div class="produksi-form">
      <form id="form-produksi" novalidate>
        <div class="form-group">
          <label class="form-label" for="prod-tanggal">Tanggal</label>
          <input class="form-control" type="date" id="prod-tanggal" name="tanggal">
          <span class="form-error" id="err-prod-tanggal" hidden></span>
        </div>

        <div class="form-group">
          <label class="form-label" for="prod-rak">Jumlah Rak</label>
          <input class="form-control" type="number" id="prod-rak"
            min="1" max="9999" step="1" placeholder="Contoh: 35">
          <span class="form-error" id="err-prod-rak" hidden></span>
        </div>

        <button type="submit" class="btn btn-primary btn-full">💾 Simpan</button>
      </form>
    </div>

    <!-- Edit form slot (hidden initially) -->
    <div id="edit-prod-slot"></div>

    <div class="card" style="margin-bottom:var(--space-6)">
      <p style="font-weight:700;margin-bottom:var(--space-3)">Tren Produksi 7 Hari Terakhir</p>
      <div class="chart-container">
        <canvas id="chart-produksi" aria-label="Grafik Tren Produksi"></canvas>
      </div>
    </div>

    <div class="summary-box" id="box-prod-ringkasan" style="margin-bottom:var(--space-6)">
      <p class="summary-box-title">Ringkasan 7 Hari Terakhir</p>
      <div class="summary-row">
        <span class="summary-row-label">Rata-rata Produksi/Hari</span>
        <span class="summary-row-value" id="stat-rata-rata">${rataRata} Rak</span>
      </div>
    </div>

    <div class="produksi-list" id="produksi-list-container">
      <p class="produksi-list-title">Riwayat Produksi</p>
      ${_buildRiwayatHTML(productions)}
    </div>
  `;
}

// ─── Full UI refresh ─────────────────────────────────────────────────────────

function _refreshUI() {
  const prods = StorageService.getProductions();

  // Chart
  try {
    const chartData = CalculationEngine.getDataGrafikProduksi(prods, 7);
    ChartManager.renderProductionChart('chart-produksi', chartData);
  } catch (e) { console.error('[Produksi] chart error:', e); }

  // Summary
  const rataEl = document.getElementById('stat-rata-rata');
  if (rataEl) {
    rataEl.textContent = `${CalculationEngine.getRataRataProduksi(prods, 7)} Rak`;
  }

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

// ─── attachListeners ──────────────────────────────────────────────────────────

export function attachListeners(params = {}) {
  _editingTanggal = null;

  // ── Error helpers ──────────────────────────────────────────────────────
  function showErrors(errors) {
    if (errors.tanggal) {
      const el  = document.getElementById('err-prod-tanggal');
      const inp = document.getElementById('prod-tanggal');
      if (el)  { el.textContent = errors.tanggal; el.removeAttribute('hidden'); }
      if (inp) inp.classList.add('is-invalid');
    }
    if (errors.jumlahRak) {
      const el  = document.getElementById('err-prod-rak');
      const inp = document.getElementById('prod-rak');
      if (el)  { el.textContent = errors.jumlahRak; el.removeAttribute('hidden'); }
      if (inp) inp.classList.add('is-invalid');
    }
  }

  function clearErrors() {
    ['err-prod-tanggal','err-prod-rak'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.setAttribute('hidden', ''); }
    });
    ['prod-tanggal','prod-rak'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('is-invalid');
    });
  }

  // ── Initial chart render ───────────────────────────────────────────────
  try {
    const prods     = StorageService.getProductions();
    const chartData = CalculationEngine.getDataGrafikProduksi(prods, 7);
    ChartManager.renderProductionChart('chart-produksi', chartData);
  } catch (e) { console.error('[Produksi] chart init error:', e); }

  // ── Form submit (add new / overwrite) ─────────────────────────────────
  const form = document.getElementById('form-produksi');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearErrors();

      const isoDate  = (document.getElementById('prod-tanggal').value || '').trim();
      const rakInput = document.getElementById('prod-rak').value;

      const errors = {};
      if (!isoDate) errors.tanggal = 'Tanggal wajib diisi.';

      const rakResult = Validator.validateProduksi({ tanggal: '01/01/2000', jumlahRak: rakInput });
      if (rakResult.errors.jumlahRak) errors.jumlahRak = rakResult.errors.jumlahRak;

      if (Object.keys(errors).length > 0) { showErrors(errors); return; }

      const existing    = StorageService.getProductions();
      const isDuplicate = existing.some((p) => p.tanggal === isoDate);

      if (isDuplicate) {
        const label = formatTanggal(isoDate);
        const ok    = window.confirm(`Data produksi untuk tanggal ${label} sudah ada. Timpa data lama?`);
        if (!ok) return;
        StorageService.saveProduction(
          { id: generateId(), tanggal: isoDate, jumlahRak: Number(rakInput), createdAt: new Date().toISOString() },
          true
        );
      } else {
        StorageService.saveProduction(
          { id: generateId(), tanggal: isoDate, jumlahRak: Number(rakInput), createdAt: new Date().toISOString() },
          false
        );
      }

      form.reset();
      clearErrors();
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
  // Replace node to remove stale listeners
  const clone = container.cloneNode(true);
  container.parentNode.replaceChild(clone, container);

  const handler = (e) => {
    // ── Delete ────────────────────────────────────────────────────────
    const deleteBtn = e.target.closest('.btn-delete-prod');
    if (deleteBtn) {
      e.preventDefault();
      const tanggal = deleteBtn.getAttribute('data-tanggal');
      _handleDelete(tanggal);
      return;
    }

    // ── Edit ──────────────────────────────────────────────────────────
    const editBtn = e.target.closest('.btn-edit-prod');
    if (editBtn) {
      e.preventDefault();
      const tanggal = editBtn.getAttribute('data-tanggal');
      _handleEditOpen(tanggal);
      return;
    }
  };

  clone.addEventListener('click', handler);
  clone.addEventListener('touchend', handler, { passive: false });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

function _handleDelete(tanggal) {
  if (!tanggal) return;
  if (!confirm(`Hapus data produksi tanggal ${formatTanggal(tanggal)}? Tindakan tidak dapat dibatalkan.`)) return;

  const ok = StorageService.deleteProduction(tanggal);
  if (ok) {
    showNotification('Data produksi berhasil dihapus!', 'success', 3000);
    _refreshUI();
  } else {
    showNotification('Gagal menghapus data produksi.', 'error');
  }
}

// ─── Edit ────────────────────────────────────────────────────────────────────

function _handleEditOpen(tanggal) {
  if (!tanggal) return;
  const prods = StorageService.getProductions();
  const prod  = prods.find((p) => p.tanggal === tanggal);
  if (!prod) return;

  // Toggle: same row clicked again → close
  if (_editingTanggal === tanggal) {
    _closeEditForm();
    return;
  }
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

  document.getElementById('edit-prod-save')?.addEventListener('click', () => {
    const newTanggal = (document.getElementById('edit-prod-tanggal')?.value || '').trim();
    const newRak     = Number(document.getElementById('edit-prod-rak')?.value || 0);

    // Validate
    if (!newTanggal) {
      showNotification('Tanggal wajib diisi.', 'warning', 3000);
      return;
    }
    if (!newRak || newRak < 1 || newRak > 9999) {
      showNotification('Jumlah rak harus antara 1 dan 9999.', 'warning', 3000);
      return;
    }

    const prods         = StorageService.getProductions();
    const tanggalChanged = newTanggal !== originalProd.tanggal;

    // If date changed, check for conflict
    if (tanggalChanged) {
      const conflict = prods.find((p) => p.tanggal === newTanggal && p.tanggal !== originalProd.tanggal);
      if (conflict) {
        if (!confirm(`Data produksi untuk tanggal ${formatTanggal(newTanggal)} sudah ada. Timpa?`)) return;
        // Delete conflicting entry first
        StorageService.deleteProduction(newTanggal);
      }
      // Delete old entry and save new
      StorageService.deleteProduction(originalProd.tanggal);
      StorageService.saveProduction({
        id:        originalProd.id || generateId(),
        tanggal:   newTanggal,
        jumlahRak: newRak,
        createdAt: originalProd.createdAt || new Date().toISOString(),
      }, false);
    } else {
      // Only rak changed — use updateProduction
      StorageService.updateProduction(originalProd.tanggal, { jumlahRak: newRak });
    }

    showNotification('Data produksi berhasil diperbarui!', 'success', 3000);
    _refreshUI();
  });
}
