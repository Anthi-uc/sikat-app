// rekap.js — Rekap Kas (keterangan, penjualan_lain, bulan, edit/hapus)

import { StorageService } from '../storage.js';
import { CalculationEngine } from '../calculator.js';
import { showNotification } from '../app.js';
import { isIncome as catIsIncome, normalizeTransaction, findCategoryAndSub } from '../categories.js';
import { renderTransactionForm, attachTransactionFormListeners } from '../transaction-form.js';

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

/** Label ramah-pengguna untuk satu jenis / sub-kategori */
export function jenisLabel(jenis) {
  return findCategoryAndSub(jenis)?.subcategory?.name ?? String(jenis ?? 'Transaksi');
}

/** Ikon + nama sub-kategori (+ keterangan) untuk satu baris transaksi */
function txLabel(t) {
  const norm = normalizeTransaction(t);
  const sub  = findCategoryAndSub(norm.kategori, norm.subKategori)?.subcategory;
  const nama = sub?.name ?? jenisLabel(norm.jenis);
  const ikon = sub?.icon ?? (isIncome(t) ? '\u{1F4B0}' : '\u{1F4B8}');
  const ket  = norm.keterangan && norm.keterangan !== nama
    ? `: ${escHtml(norm.keterangan)}` : '';
  return `${ikon} ${escHtml(nama)}${ket}`;
}

/** Kas masuk? Mengikuti bagan kategori (mendukung data legacy). */
function isIncome(tx) {
  return catIsIncome(tx);
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
    if (isIncome(t)) pemasukan   += t.nominal;
    else             pengeluaran += t.nominal;
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
    const norm = normalizeTransaction(t);
    const inc  = isIncome(t);

    // Subtitle: tanggal • lokasi [• qty × harga satuan]
    let meta = `${formatTanggal(t.tanggal)} &bull; ${escHtml(t.lokasi || '\u2014')}`;
    if (norm.kuantitas > 0 && norm.hargaSatuan > 0) {
      meta += ` &bull; ${norm.kuantitas} ${escHtml(norm.satuan || 'unit')} \u00D7 ${formatRupiah(norm.hargaSatuan)}`;
    }

    return `
      <div class="tx-item" data-tx-id="${escHtml(t.id)}">
        <div class="tx-item-info">
          <p class="tx-item-type">${txLabel(t)}</p>
          <p class="tx-item-meta">${meta}</p>
        </div>
        <p class="tx-item-amount ${inc ? 'amount-income' : 'amount-expense'}">
          ${inc ? '+' : '-'}${formatRupiah(t.nominal)}
        </p>
        <div class="tx-actions">
          <button class="btn-edit-tx"   data-id="${escHtml(t.id)}" title="Edit"   aria-label="Edit transaksi">\u270F\uFE0F</button>
          <button class="btn-delete-tx" data-id="${escHtml(t.id)}" title="Hapus"  aria-label="Hapus transaksi">\u{1F5D1}\uFE0F</button>
        </div>
      </div>`;
  }).join('');
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
  if (!slot) return;

  // Form bersama: kategori bertingkat, kuantitas x harga satuan, konversi telur
  slot.innerHTML = renderTransactionForm({
    formId: 'edit-tx-form',
    initialData: normalizeTransaction(tx),
    mode: 'inline',
    showCancel: true,
    submitLabel: '\u{1F4BE} Simpan Perubahan',
  });
  slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  attachTransactionFormListeners({
    formId: 'edit-tx-form',
    initialData: tx,
    onSaved: () => _refreshUI(),
    onCancel: _closeEditForm,
  });
}

function _closeEditForm() {
  const slot = document.getElementById('edit-tx-slot');
  if (slot) slot.innerHTML = '';
  _editingId = null;
}
