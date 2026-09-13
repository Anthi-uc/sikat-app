// produksi.js — View Produksi Harian

import { StorageService, generateId } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { Validator } from '../validator.js';
import { ChartManager } from '../charts.js';
import { showNotification } from '../app.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * 'YYYY-MM-DD' → 'DD/MM/YYYY'
 * @param {string} iso
 * @returns {string}
 */
function formatTanggal(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Format 'YYYY-MM-DD' (ISO) → label lokal yang mudah dibaca, misal '07/09/2026'.
 * Digunakan di pesan konfirmasi duplikat.
 * @param {string} iso
 * @returns {string}
 */
function isoToLabel(iso) {
  if (!iso) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Build the riwayat HTML — shared between render & refreshUI.
 * @param {Array} productions
 * @returns {string}
 */
function buildRiwayatHTML(productions) {
  const sorted = [...productions].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  if (sorted.length === 0) {
    return `<div class="empty-state">
      <div class="empty-state-icon">🥚</div>
      <p class="empty-state-message">Belum ada data produksi</p>
    </div>`;
  }
  return sorted.map(p => `
    <div class="produksi-item">
      <span class="produksi-item-date">${formatTanggal(p.tanggal)}</span>
      <span class="produksi-item-rak">${p.jumlahRak} Rak</span>
      <span class="badge badge-success">Terinput</span>
    </div>`).join('');
}

// ─── render ───────────────────────────────────────────────────────────────────

/**
 * Render the Produksi Harian view HTML.
 * @param {object} params
 * @returns {string}
 */
export function render(params = {}) {
  let productions = [];
  let rataRata = 0;
  try {
    productions = StorageService.getProductions();
    rataRata = CalculationEngine.getRataRataProduksi(productions, 7);
  } catch (e) { /* fallback to defaults */ }

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
      ${buildRiwayatHTML(productions)}
    </div>
  `;
}

// ─── attachListeners ──────────────────────────────────────────────────────────

/**
 * Attach all DOM event listeners for the Produksi Harian view.
 * @param {object} params
 */
export function attachListeners(params = {}) {

  // ── Error helpers ────────────────────────────────────────────────────────
  function showErrors(errors) {
    if (errors.tanggal) {
      const el = document.getElementById('err-prod-tanggal');
      const inp = document.getElementById('prod-tanggal');
      if (el) { el.textContent = errors.tanggal; el.removeAttribute('hidden'); }
      if (inp) inp.classList.add('is-invalid');
    }
    if (errors.jumlahRak) {
      const el = document.getElementById('err-prod-rak');
      const inp = document.getElementById('prod-rak');
      if (el) { el.textContent = errors.jumlahRak; el.removeAttribute('hidden'); }
      if (inp) inp.classList.add('is-invalid');
    }
  }

  function clearErrors() {
    ['err-prod-tanggal', 'err-prod-rak'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.setAttribute('hidden', ''); }
    });
    ['prod-tanggal', 'prod-rak'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('is-invalid');
    });
  }

  // ── refreshUI ────────────────────────────────────────────────────────────
  function refreshUI() {
    const prods = StorageService.getProductions();

    // chart
    try {
      const chartData = CalculationEngine.getDataGrafikProduksi(prods, 7);
      ChartManager.renderProductionChart('chart-produksi', chartData);
    } catch (e) { console.error('[Produksi] chart error:', e); }

    // summary
    const rataEl = document.getElementById('stat-rata-rata');
    if (rataEl) {
      const avg = CalculationEngine.getRataRataProduksi(prods, 7);
      rataEl.textContent = `${avg} Rak`;
    }

    // list
    const listEl = document.getElementById('produksi-list-container');
    if (listEl) {
      listEl.innerHTML = `
        <p class="produksi-list-title">Riwayat Produksi</p>
        ${buildRiwayatHTML(prods)}
      `;
    }
  }

  // ── Initial chart render ─────────────────────────────────────────────────
  try {
    const prods = StorageService.getProductions();
    const chartData = CalculationEngine.getDataGrafikProduksi(prods, 7);
    ChartManager.renderProductionChart('chart-produksi', chartData);
  } catch (e) { console.error('[Produksi] chart init error:', e); }

  // ── Form submit ──────────────────────────────────────────────────────────
  const form = document.getElementById('form-produksi');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    // type="date" returns 'YYYY-MM-DD' directly; empty string if nothing selected
    const isoDate = (document.getElementById('prod-tanggal').value || '').trim();
    const rakInput = document.getElementById('prod-rak').value;

    // Manual validation: date required + jumlahRak via Validator
    const errors = {};
    if (!isoDate) {
      errors.tanggal = 'Tanggal wajib diisi.';
    }
    const rakResult = Validator.validateProduksi({ tanggal: '01/01/2000', jumlahRak: rakInput });
    if (rakResult.errors.jumlahRak) errors.jumlahRak = rakResult.errors.jumlahRak;

    if (Object.keys(errors).length > 0) { showErrors(errors); return; }

    // Check duplicate date
    const existing = StorageService.getProductions();
    const isDuplicate = existing.some(p => p.tanggal === isoDate);

    if (isDuplicate) {
      const label = isoToLabel(isoDate);
      const ok = window.confirm(`Data produksi untuk tanggal ${label} sudah ada. Timpa data lama?`);
      if (!ok) return;
      const prod = { id: generateId(), tanggal: isoDate, jumlahRak: Number(rakInput), createdAt: new Date().toISOString() };
      StorageService.saveProduction(prod, true);
    } else {
      const prod = { id: generateId(), tanggal: isoDate, jumlahRak: Number(rakInput), createdAt: new Date().toISOString() };
      StorageService.saveProduction(prod, false);
    }

    form.reset();
    clearErrors();
    refreshUI();
    showNotification('Data produksi berhasil disimpan!', 'success', 3000);
  });
}
