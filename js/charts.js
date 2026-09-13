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
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          borderWidth: 2,
          pointBackgroundColor: '#16a34a',
          pointRadius: 4,
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
            borderColor: '#16a34a',
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            borderWidth: 2,
            pointBackgroundColor: '#16a34a',
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
};
