// js/charts.js — ChartManager: wrapper Chart.js

// Registry of active chart instances keyed by canvasId
const _charts = {};

export const ChartManager = {

  /**
   * Destroy an existing chart on a canvas before creating a new one.
   * Prevents "Canvas is already in use" errors.
   * @param {string} canvasId
   */
  destroyChart(canvasId) {
    if (_charts[canvasId]) {
      try { _charts[canvasId].destroy(); } catch (e) { /* ignore */ }
      delete _charts[canvasId];
    }
  },

  /**
   * Render a line chart for daily egg production trend.
   * @param {string} canvasId
   * @param {{ label: string, value: number, tanggal: string }[]} data - exactly 7 points
   * @returns {Chart|null} - null if Chart.js not available
   */
  renderProductionChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    // Check Chart.js is loaded
    if (typeof window === 'undefined' || typeof window.Chart === 'undefined') {
      const parent = canvas.parentElement;
      if (parent) parent.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">Grafik tidak tersedia</p>';
      return null;
    }

    this.destroyChart(canvasId);

    const chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Produksi (Rak)',
          data: data.map(d => d.value),
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13,148,136,0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#0d9488',
          pointRadius: 3,
          tension: 0.3,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
          },
          x: {
            ticks: {
              maxTicksLimit: 10,
              maxRotation: 0,
            },
          },
        },
      },
    });

    _charts[canvasId] = chart;
    return chart;
  },

  /**
   * Render a dual-line chart for weekly income vs feed cost.
   * @param {string} canvasId
   * @param {{ label: string, penjualan: number, biayaPakan: number }[]} data
   * @returns {Chart|null}
   */
  renderWeeklyChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    if (typeof window === 'undefined' || typeof window.Chart === 'undefined') {
      const parent = canvas.parentElement;
      if (parent) parent.innerHTML = '<p style="text-align:center;color:#6b7280;padding:2rem;">Grafik tidak tersedia</p>';
      return null;
    }

    this.destroyChart(canvasId);

    const chart = new window.Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Penjualan Telur',
            data: data.map(d => d.penjualan),
            borderColor: '#0d9488',
            backgroundColor: 'rgba(13,148,136,0.08)',
            borderWidth: 2,
            pointBackgroundColor: '#0d9488',
            pointRadius: 4,
            tension: 0.3,
            fill: false,
          },
          {
            label: 'Biaya Pakan',
            data: data.map(d => d.biayaPakan),
            borderColor: '#dc2626',
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            borderWidth: 2,
            pointBackgroundColor: '#dc2626',
            pointRadius: 4,
            tension: 0.3,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'),
            },
          },
        },
      },
    });

    _charts[canvasId] = chart;
    return chart;
  },

  /**
   * Render grafik Pendapatan vs Beban untuk SATU BULAN.
   * Data dikelompokkan per minggu; sumbu Y berformat Rupiah.
   * Jika data kosong, tampilkan pesan "Belum ada data".
   *
   * @param {string} canvasId
   * @param {{ label: string, totalPendapatan: number, totalBeban: number }[]} data
   * @param {string} bulanLabel  – dipakai sebagai judul legend (mis. "September 2026")
   * @returns {Chart|null}
   */
  renderMonthlyLabaRugiChart(canvasId, data, bulanLabel) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    // Destroy stale instance
    this.destroyChart(canvasId);

    // Empty-state: replace canvas with message
    const parent = canvas.parentElement;
    if (!data || data.length === 0) {
      if (parent) {
        parent.innerHTML = `<p style="text-align:center;color:#64748b;padding:2rem 1rem;font-size:0.875rem;">
          Belum ada data pada periode ini</p>`;
      }
      return null;
    }

    // Re-insert canvas if we previously replaced it with text
    if (!document.getElementById(canvasId)) {
      if (parent) {
        const c = document.createElement('canvas');
        c.id        = canvasId;
        c.setAttribute('aria-label', 'Grafik Laba Rugi Bulanan');
        parent.innerHTML = '';
        parent.appendChild(c);
      }
      return null; // will be rendered next tick
    }

    if (typeof window === 'undefined' || typeof window.Chart === 'undefined') {
      if (parent) parent.innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">Grafik tidak tersedia</p>';
      return null;
    }

    const chart = new window.Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(d => d.label),
        datasets: [
          {
            label: 'Total Pendapatan',
            data: data.map(d => d.totalPendapatan),
            backgroundColor: 'rgba(13,148,136,0.75)',
            borderColor: '#0d9488',
            borderWidth: 1.5,
            borderRadius: 4,
          },
          {
            label: 'Total Beban',
            data: data.map(d => d.totalBeban),
            backgroundColor: 'rgba(220,38,38,0.65)',
            borderColor: '#dc2626',
            borderWidth: 1.5,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          title: {
            display: false,
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label(ctx) {
                return `${ctx.dataset.label}: Rp ${Number(ctx.parsed.y).toLocaleString('id-ID')}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { maxRotation: 0, font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => 'Rp ' + Number(v).toLocaleString('id-ID'),
              font: { size: 11 },
              maxTicksLimit: 6,
            },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
        },
      },
    });

    _charts[canvasId] = chart;
    return chart;
  },
};
