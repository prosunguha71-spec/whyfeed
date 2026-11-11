import '../styles/main.css';
import { getSettings, getStore, setSettings } from '../storage/local-storage';
import { topEntries } from '../analysis/channel-analyzer';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
async function render() {
  const [s, st] = await Promise.all([getSettings(), getStore()]);
  $<HTMLInputElement>('on').checked = s.enabled;
  $('state').textContent = s.enabled ? 'Active on YouTube — estimating why videos appear.' : 'Paused — WhyFeed is not reading YouTube.';
  $('stats').innerHTML = [['Watched', st.watch.length], ['Recs seen', st.recSeen], ['Hidden', st.hiddenCount]].map(([l, v]) => `<div class="card"><b>${v}</b><span class="muted" style="font-size:11px">${l}</span></div>`).join('');
  const top = topEntries(st.topics, 1)[0];
  $('top').textContent = top ? `${top[0]} (${top[1]}×)` : 'Not enough data yet';
  const cats = topEntries(st.categories, 1)[0];
  $('bubble').textContent = cats ? `Most watched category: ${cats[0]}` : 'Watch some videos to start learning.';
}
$('on').addEventListener('change', async (e) => { const s = await getSettings(); await setSettings({ ...s, enabled: (e.target as HTMLInputElement).checked }); void render(); });
$('dash').addEventListener('click', () => { void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') }); window.close(); });
$('set').addEventListener('click', () => { void chrome.runtime.openOptionsPage(); window.close(); });
void render();
