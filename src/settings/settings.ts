import '../styles/main.css';
import type { SignalKey, Settings } from '../types';
import { DEFAULT_SETTINGS, clearAll, exportAll, getSettings, importAll, setSettings } from '../storage/local-storage';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const say = (t: string) => { $('msg').textContent = t; };
const NAMES: Record<SignalKey, string> = { channel: 'Channel match', topic: 'Topic match', recent: 'Recent activity', category: 'Category match', popularity: 'Popularity' };
let s: Settings = DEFAULT_SETTINGS;

function drawWeights() {
  const total = Object.values(s.weights).reduce((a, b) => a + b, 0) || 1;
  $('weights').innerHTML = (Object.keys(NAMES) as SignalKey[]).map((k) =>
    `<div class="wrow"><span>${NAMES[k]}</span><input type="range" min="0" max="100" value="${s.weights[k]}" data-w="${k}"><b>${Math.round((s.weights[k] / total) * 100)}%</b></div>`).join('');
}
async function load() {
  s = await getSettings();
  document.querySelectorAll<HTMLInputElement>('[data-s]').forEach((i) => { i.checked = Boolean(s[i.dataset.s as keyof Settings]); });
  drawWeights();
}
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.s) { s = { ...s, [t.dataset.s]: t.checked }; await setSettings(s); }
  if (t.dataset.w) { s = { ...s, weights: { ...s.weights, [t.dataset.w]: Number(t.value) } }; await setSettings(s); drawWeights(); }
});
$('wreset').onclick = async () => { s = { ...s, weights: DEFAULT_SETTINGS.weights }; await setSettings(s); drawWeights(); };
$('exp').onclick = async () => {
  const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `whyfeed-export-${new Date().toISOString().slice(0, 10)}.json` });
  a.click(); URL.revokeObjectURL(a.href); say('Exported.');
};
$('imp').onclick = () => $('file').click();
$('file').onchange = async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
  try { await importAll(JSON.parse(await f.text())); await load(); say('Import complete.'); } catch (err) { say((err as Error).message || 'Import failed.'); }
};
$('clear').onclick = async () => { if (confirm('Erase all WhyFeed analysis data and preferences? This cannot be undone.')) { await clearAll(); say('All data cleared.'); } };
void load();
