import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
Chart.defaults.color = '#A0AEC0';
Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
Chart.defaults.borderColor = 'rgba(160,174,192,.12)';

export const PALETTE = ['#7C5CFC', '#20C997', '#F6AD55', '#4FACFE', '#F472B6', '#A78BFA', '#34D399', '#FB7185', '#60A5FA', '#FBBF24'];
const live = new Map<string, Chart>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mount(id: string, cfg: any) {
  live.get(id)?.destroy();
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (canvas) live.set(id, new Chart(canvas, cfg));
}
const noData = (labels: string[]) => labels.length === 0;
export function toggleEmpty(id: string, empty: boolean) {
  const c = document.getElementById(id)?.parentElement; if (!c) return;
  c.style.display = empty ? 'none' : ''; const e = c.nextElementSibling as HTMLElement | null;
  if (e?.classList.contains('empty')) e.style.display = empty ? '' : 'none';
}

export function barChart(id: string, labels: string[], data: number[], horizontal = false) {
  toggleEmpty(id, noData(labels)); if (noData(labels)) return;
  mount(id, { type: 'bar', data: { labels, datasets: [{ data, backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 8, maxBarThickness: 28 }] },
    options: { indexAxis: horizontal ? 'y' : 'x', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, animation: { duration: 700 } } });
}
export function ringChart(id: string, type: 'doughnut' | 'pie', labels: string[], data: number[]) {
  toggleEmpty(id, noData(labels)); if (noData(labels)) return;
  mount(id, { type, data: { labels, datasets: [{ data, backgroundColor: PALETTE, borderColor: '#192438', borderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: type === 'doughnut' ? '62%' : 0, plugins: { legend: { position: 'right', labels: { boxWidth: 10, usePointStyle: true } } } } });
}
export function lineChart(id: string, labels: string[], data: number[]) {
  toggleEmpty(id, data.every((n) => n === 0));
  mount(id, { type: 'line', data: { labels, datasets: [{ data, label: 'Videos watched', borderColor: '#7C5CFC', backgroundColor: 'rgba(124,92,252,.18)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#20C997' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}
