// rekap.js — Rekap Kas (keterangan, penjualan_lain, bulan, edit/hapus)

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { showNotification } from '../app.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const _BULAN_NAMA = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

function formatRupiah(n) { return 'Rp ' + Number(n).toLocaleString('id-ID'); }

function formatTanggal(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Human-readable label for a jenis value */
export function jenisLabel(jenis) {
  const MAP = {
    penjualan_telur: 'Penjualan Telur',
    penjualan_lain:  'Penjualan Lain',
    pembelian_pakan: 'Pembelian Pakan',
    biaya_lain:      'Biaya Lain',
  };
  return MAP[jenis] ?? jenis;
}

/** True for income jenis */
function isIncome(jenis) {
  return jenis === 'penjualan_telur' || jenis === 'penjualan_lain';
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Module-level state ──────────────────────────────────────────────────────

const _now    = new Date();
let _viewYear  = _now.getFullYear();
let _viewMonth = _now.getMonth();
let _editingId = null;

// ─── render ─────────────────────────────────────────────────────────────────

export function render(params = {}) {
  _viewYear  = _now.getFullYear();
  _viewMonth = _now.getMonth();
  _editingId = null;

  let transactions = [];
  let saldo        = 0;
  let lastDate     = '-';
  let errorBanner  = '';

  try {
    transactions = StorageService.getTransactions();
    saldo = CalculationEngine.getSaldoKas(transactions);
    if (transactions.length > 0) {
      const sorted = [...transactions].sort((a, b) =>
        b.tanggal.localeCompare(a.tanggal) || (b.createdAt||'').localeCompare(a.createdAt||''));
      lastDate = formatTanggal(sorted[0].tanggal);
    }
  } catch (e) {
    errorBanner = `<div class="error-banner" role="alert">⚠️ Gagal memuat data: ${escHtml(e.message)}</div>`;
  }

  return `
    ${errorBanner}
    <div class="saldo-card">
      <p class="saldo-label">💰 Saldo Kas</p>
      <p class="saldo-amount" id="rekap-saldo">${formatRupiah(saldo)}</p>
      <p class="saldo-update">Update: ${lastDate}</p>
    </div>

    <div id="edit-tx-slot"></div>

    <div class="month-nav" id="rekap-month-nav">
      <button class="month-nav-btn" id="rekap-prev-month" aria-label="Bulan sebelumnya">&#8592;</button>
      <span class="month-nav-label" id="rekap-month-label">${_BULAN_NAMA[_viewMonth]} ${_viewYear}</span>
      <button class="month-nav-btn" id="rekap-next-month" aria-label="Bulan berikutnya">&#8594;</button>
    </div>

    <div class="rekap-summary-grid" id="rekap-summary-grid">
      ${_buildSummaryHTML(transactions)}
    </div>

    <div class="tx-list" id="tx-list-container">
      <p class="tx-list-title">Riwayat Transaksi</p>
      ${_buildTxListHTML(transactions)}
    </div>
  `;
}

// ─── Partial HTML builders ───────────────────────────────────────────────────

function _buildSummaryHTML(transactions) {
  const prefix = `${_viewYear}-${String(_viewMonth + 1).padStart(2, '0')}`;
  let pemasukan    = 0;
  let pengeluaran  = 0;

  for (const t of transactions) {
    if (!t.tanggal.startsWith(prefix)) continue;
    if (isIncome(t.jenis)) pemasukan   += t.nominal;
    else                   pengeluaran += t.nominal;
  }

  return `
    <div class="rekap-summary-item">
      <p class="rekap-summary-label">Pemasukan Bulan Ini</p>
      <p class="rekap-summary-value amount-income" id="rekap-pemasukan">${formatRupiah(pemasukan)}</p>
    </div>
    <div class="rekap-summary-item">
      <p class="rekap-summary-label">Pengeluaran Bulan Ini</p>
      <p class="rekap-summary-value amount-expense" id="rekap-pengeluaran">${formatRupiah(pengeluaran)}</p>
    </div>`;
}

function _buildTxListHTML(transactions) {
  const prefix   = `${_viewYear}-${String(_viewMonth + 1).padStart(2, '0')}`;
  const filtered = transactions.filter((t) => t.tanggal.startsWith(prefix));

  if (filtered.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-message">Belum ada transaksi untuk bulan ini</p>
      </div>`;
  }

  const sorted = [...filtered].sort((a, b) =>
    b.tanggal.localeCompare(a.tanggal) || (b.createdAt||'').localeCompare(a.createdAt||''));

  return sorted.map((t) => {
    // Build subtitle: tanggal • lokasi [• keterangan]
    let meta = `${formatTanggal(t.tanggal)} &bull; ${escHtml(t.lokasi)}`;
    if (t.keterangan) meta += ` &bull; <em>${escHtml(t.keterangan)}</em>`;

    // Display name: use keterangan as sub-label for flexible types
    let typeDisplay = jenisLabel(t.jenis);
    if (t.keterangan && (t.jenis === 'biaya_lain' || t.jenis === 'penjualan_lain')) {
      typeDisplay = `${jenisLabel(t.jenis)}: ${escHtml(t.keterangan)}`;
    }

    return `
      <div class="tx-item" data-tx-id="${escHtml(t.id)}">
        <div class="tx-item-info">
          <p class="tx-item-type">${typeDisplay}</p>
          <p class="tx-item-meta">${meta}</p>
        </div>
        <p class="tx-item-amount ${isIncome(t.jenis) ? 'amount-income' : 'amount-expense'}">
          ${isIncome(t.jenis) ? '+' : '-'}${formatRupiah(t.nominal)}
        </p>
        <div class="tx-actions">
          <button class="btn-edit-tx"   data-id="${escHtml(t.id)}" title="Edit"   aria-label="Edit ${jenisLabel(t.jenis)}">✏️</button>
          <button class="btn-delete-tx" data-id="${escHtml(t.id)}" title="Hapus"  aria-label="Hapus ${jenisLabel(t.jenis)}">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

// ─── Edit form ───────────────────────────────────────────────────────────────

function _buildEditFormHTML(tx) {
  const JENIS_OPTIONS = [
    { val: 'penjualan_telur', lbl: 'Penjualan Telur' },
    { val: 'penjualan_lain',  lbl: 'Penjualan Lain' },
    { val: 'pembelian_pakan', lbl: 'Pembelian Pakan' },
    { val: 'biaya_lain',      lbl: 'Biaya Lain' },
  ];

  const optionsHTML = JENIS_OPTIONS.map((o) =>
    `<option value="${o.val}"${tx.jenis === o.val ? ' selected' : ''}>${o.lbl}</option>`).join('');

  const needsKet = tx.jenis === 'biaya_lain' || tx.jenis === 'penjualan_lain';

  return `
    <div class="inline-edit-form" id="edit-tx-form-card">
      <h4>✏️ Edit Transaksi</h4>

      <div class="form-group">
        <label class="form-label" for="edit-tx-jenis">Jenis Transaksi</label>
        <select class="form-control" id="edit-tx-jenis">${optionsHTML}</select>
      </div>

      <div class="form-group" id="edit-group-keterangan" style="${needsKet ? '' : 'display:none'}">
        <label class="form-label" for="edit-tx-keterangan" id="edit-label-keterangan">
          ${tx.jenis === 'penjualan_lain' ? 'Nama Penjualan' : 'Nama/Jenis Biaya'}
        </label>
        <input class="form-control" type="text" id="edit-tx-keterangan"
          value="${escHtml(tx.keterangan || '')}" maxlength="100">
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-tx-tanggal">Tanggal</label>
        <input class="form-control" type="date" id="edit-tx-tanggal" value="${escHtml(tx.tanggal)}">
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-tx-lokasi">Lokasi</label>
        <input class="form-control" type="text" id="edit-tx-lokasi"
          value="${escHtml(tx.lokasi)}" maxlength="100">
      </div>

      <div class="form-group">
        <label class="form-label" for="edit-tx-nominal">Nominal (Rp)</label>
        <input class="form-control" type="number" id="edit-tx-nominal"
          min="1" max="999999999999" value="${tx.nominal}">
      </div>

      <div class="inline-edit-actions">
        <button class="btn btn-primary" id="edit-tx-save">💾 Simpan</button>
        <button class="btn btn-outline" id="edit-tx-cancel">Batal</button>
      </div>
    </div>`;
}

// ─── Full UI refresh ─────────────────────────────────────────────────────────

function _refreshUI() {
  const transactions = StorageService.getTransactions();

  const saldoEl = document.getElementById('rekap-saldo');
  if (saldoEl) saldoEl.textContent = formatRupiah(CalculationEngine.getSaldoKas(transactions));

  const labelEl = document.getElementById('rekap-month-label');
  if (labelEl) labelEl.textContent = `${_BULAN_NAMA[_viewMonth]} ${_viewYear}`;

  const nextBtn = document.getElementById('rekap-next-month');
  if (nextBtn) nextBtn.disabled = (_viewYear === _now.getFullYear() && _viewMonth === _now.getMonth());

  const summaryEl = document.getElementById('rekap-summary-grid');
  if (summaryEl) summaryEl.innerHTML = _buildSummaryHTML(transactions);

  const listEl = document.getElementById('tx-list-container');
  if (listEl) {
    listEl.innerHTML = `<p class="tx-list-title">Riwayat Transaksi</p>${_buildTxListHTML(transactions)}`;
    _attachListItemListeners(listEl);
  }

  const slot = document.getElementById('edit-tx-slot');
  if (slot) slot.innerHTML = '';
  _editingId = null;
}

// ─── attachListeners ─────────────────────────────────────────────────────────

export function attachListeners(params = {}) {
  _viewYear  = _now.getFullYear();
  _viewMonth = _now.getMonth();
  _editingId = null;

  document.getElementById('rekap-prev-month')?.addEventListener('click', () => {
    _viewMonth--;
    if (_viewMonth < 0) { _viewMonth = 11; _viewYear--; }
    _refreshUI();
  });

  document.getElementById('rekap-next-month')?.addEventListener('click', () => {
    if (_viewYear === _now.getFullYear() && _viewMonth === _now.getMonth()) return;
    _viewMonth++;
    if (_viewMonth > 11) { _viewMonth = 0; _viewYear++; }
    _refreshUI();
  });

  const nextBtn = document.getElementById('rekap-next-month');
  if (nextBtn) nextBtn.disabled = (_viewYear === _now.getFullYear() && _viewMonth === _now.getMonth());

  const listEl = document.getElementById('tx-list-container');
  if (listEl) _attachListItemListeners(listEl);
}

// ─── List delegation ─────────────────────────────────────────────────────────

function _attachListItemListeners(container) {
  const clone = container.cloneNode(true);
  container.parentNode.replaceChild(clone, container);

  clone.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete-tx');
    if (deleteBtn) { _handleDelete(deleteBtn.getAttribute('data-id')); return; }
    const editBtn = e.target.closest('.btn-edit-tx');
    if (editBtn)   { _handleEditOpen(editBtn.getAttribute('data-id')); return; }
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

function _handleDelete(txId) {
  if (!txId) return;
  if (!confirm('Hapus transaksi ini? Tindakan tidak dapat dibatalkan.')) return;
  const ok = StorageService.deleteTransaction(txId);
  if (ok) { showNotification('Transaksi berhasil dihapus.', 'success', 3000); _refreshUI(); }
  else      showNotification('Gagal menghapus transaksi.', 'error');
}

// ─── Edit ────────────────────────────────────────────────────────────────────

function _handleEditOpen(txId) {
  if (!txId) return;
  const tx = StorageService.getTransactions().find((t) => t.id === txId);
  if (!tx) return;

  if (_editingId === txId) { _closeEditForm(); return; }
  _editingId = txId;

  const slot = document.getElementById('edit-tx-slot');
  if (slot) {
    slot.innerHTML = _buildEditFormHTML(tx);
    slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    _attachEditFormListeners(tx);
  }
}

function _closeEditForm() {
  const slot = document.getElementById('edit-tx-slot');
  if (slot) slot.innerHTML = '';
  _editingId = null;
}

function _attachEditFormListeners(originalTx) {
  document.getElementById('edit-tx-cancel')?.addEventListener('click', _closeEditForm);

  // Toggle keterangan field on jenis change
  document.getElementById('edit-tx-jenis')?.addEventListener('change', (e) => {
    const jenis       = e.target.value;
    const groupKet    = document.getElementById('edit-group-keterangan');
    const labelKet    = document.getElementById('edit-label-keterangan');
    const needsKet    = jenis === 'biaya_lain' || jenis === 'penjualan_lain';
    if (groupKet) groupKet.style.display = needsKet ? '' : 'none';
    if (labelKet) labelKet.textContent   = jenis === 'penjualan_lain' ? 'Nama Penjualan' : 'Nama/Jenis Biaya';
  });

  document.getElementById('edit-tx-save')?.addEventListener('click', () => {
    const jenis      = document.getElementById('edit-tx-jenis')?.value || '';
    const tanggal    = document.getElementById('edit-tx-tanggal')?.value || '';
    const lokasi     = (document.getElementById('edit-tx-lokasi')?.value || '').trim();
    const nominal    = Number(document.getElementById('edit-tx-nominal')?.value || 0);
    const keterangan = (document.getElementById('edit-tx-keterangan')?.value || '').trim();
    const needsKet   = jenis === 'biaya_lain' || jenis === 'penjualan_lain';

    if (!jenis)          { showNotification('Pilih jenis transaksi.', 'warning', 3000); return; }
    if (!tanggal)        { showNotification('Tanggal wajib diisi.', 'warning', 3000); return; }
    if (!lokasi)         { showNotification('Lokasi wajib diisi.', 'warning', 3000); return; }
    if (nominal < 1)     { showNotification('Nominal harus lebih dari 0.', 'warning', 3000); return; }
    if (needsKet && !keterangan) { showNotification('Keterangan wajib diisi.', 'warning', 3000); return; }

    const updates = { jenis, tanggal, lokasi, nominal };
    if (needsKet) updates.keterangan = keterangan;
    else delete updates.keterangan; // clear if jenis changed away from flexible type

    const ok = StorageService.updateTransaction(originalTx.id, updates);
    if (ok) { showNotification('Transaksi berhasil diperbarui.', 'success', 3000); _refreshUI(); }
    else      showNotification('Gagal memperbarui transaksi.', 'error');
  });
}
