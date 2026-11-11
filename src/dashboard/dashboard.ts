import '../styles/main.css';
import type { Prefs, Store } from '../types';
import { STORAGE_KEYS, DEFAULT_PREFS, getPrefs, getStore, setPrefs } from '../storage/local-storage';
import { topEntries } from '../analysis/channel-analyzer';
import { barChart, lineChart, ringChart } from './charts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
let prefs: Prefs = DEFAULT_PREFS;

function bubble(s: Store) {
  const total = Object.values(s.recTopics).reduce((a, b) => a + b, 0);
  if (s.recSeen < 20 || !total) return { pct: 0, label: 'Collecting data', cls: 'b-ok', msg: `Need ~20 observed recommendations (have ${s.recSeen}). Browse the YouTube home page.` };
  const top3 = topEntries(s.recTopics, 3).reduce((a, [, n]) => a + n, 0);
  const pct = Math.round((top3 / total) * 100);
  const cats = Object.keys(s.categories).length;
  const [label, cls] = pct < 25 ? ['Low', 'b-ok'] : pct < 40 ? ['Moderate', 'b-mid'] : ['High', 'b-hi'];
  return { pct, label, cls, msg: `Your top 3 recommended topics make up ${pct}% of all topic mentions, across ${cats} watched categories. This is a rough, local heuristic, not proof of a filter bubble.` };
}

function chips(id: string, items: string[], key: keyof Prefs) {
  $(id).innerHTML = items.length ? items.map((t, i) => `<span class="chip">${esc(t)}<button data-k="${key}" data-i="${i}" title="Remove">✕</button></span>`).join('') : '<span class="muted">None</span>';
}

async function render() {
  const [s, p] = await Promise.all([getStore(), getPrefs()]); prefs = p;
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i)); return d; });
  const counts = days.map((d) => s.watch.filter((w) => w.ts >= +d && w.ts < +d + 864e5).length);
  $('stats').innerHTML = [['Videos analysed', s.watch.length], ['Recommendations seen', s.recSeen], ['Channels tracked', Object.keys(s.channels).length], ['Hidden locally', s.hiddenCount]]
    .map(([l, v]) => `<div class="card stat"><h3>${l}</h3><b>${v}</b></div>`).join('');

  lineChart('cActivity', days.map((d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })), counts);
  const cat = topEntries(s.categories, 8); ringChart('cCategory', 'doughnut', cat.map((c) => c[0]), cat.map((c) => c[1]));
  const tt = topEntries(s.topics, 10); barChart('cTopics', tt.map((t) => t[0]), tt.map((t) => t[1]));
  const tc = topEntries(s.channels, 8); barChart('cChannels', tc.map((t) => t[0]), tc.map((t) => t[1]), true);
  const rt = topEntries(s.recTopics, 8); ringChart('cRecs', 'pie', rt.map((t) => t[0]), rt.map((t) => t[1]));

  const b = bubble(s);
  $('bubble').innerHTML = `<div style="display:flex;justify-content:space-between"><span class="badge ${b.cls}">${b.label}</span><b>${b.pct}%</b></div><div class="meter"><i style="width:${b.pct}%"></i></div><p class="muted">${esc(b.msg)}</p>`;
  const pat = [...topEntries(s.topics, 20).filter(([, n]) => n >= 3).slice(0, 4).map(([t, n]) => `Topic “${t}” appeared in ${n} watched videos`),
    ...topEntries(s.channels, 10).filter(([, n]) => n >= 3).slice(0, 3).map(([c, n]) => `You watched ${c} ${n} times`),
    ...topEntries(s.recChannels, 10).filter(([, n]) => n >= 6).slice(0, 3).map(([c, n]) => `${c} appeared ${n} times in your recommendations`)];
  $('patterns').innerHTML = pat.length ? pat.map((x) => `<li>${esc(x)}</li>`).join('') : '<li class="muted">No repeated patterns detected yet.</li>';

  chips('lessT', p.lessTopics, 'lessTopics'); chips('moreT', p.moreTopics, 'moreTopics'); chips('prefT', p.preferredTopics, 'preferredTopics'); chips('lessC', p.lessChannels, 'lessChannels');
}

const uniq = (a: string[], v: string) => (a.includes(v) ? a : [...a, v]);
document.addEventListener('click', async (e) => {
  const t = e.target as HTMLElement;
  const add = t.dataset.add, rm = t.dataset.k;
  if (add) {
    const topic = $<HTMLInputElement>('topicIn').value.trim().toLowerCase(), chan = $<HTMLInputElement>('chanIn').value.trim();
    const n = { ...prefs };
    if (add === 'less' && topic) { n.lessTopics = uniq(n.lessTopics, topic); n.moreTopics = n.moreTopics.filter((x) => x !== topic); }
    else if (add === 'more' && topic) { n.moreTopics = uniq(n.moreTopics, topic); n.lessTopics = n.lessTopics.filter((x) => x !== topic); }
    else if (add === 'pref' && topic) n.preferredTopics = uniq(n.preferredTopics, topic);
    else if (add === 'chan' && chan) n.lessChannels = uniq(n.lessChannels, chan);
    else return;
    await setPrefs(n); $<HTMLInputElement>('topicIn').value = ''; $<HTMLInputElement>('chanIn').value = '';
  } else if (rm) {
    const key = rm as keyof Prefs; const n = { ...prefs, [key]: prefs[key].filter((_, i) => i !== Number(t.dataset.i)) }; await setPrefs(n);
  } else if (t.id === 'reset' && confirm('Reset all feed preferences?')) await setPrefs({ ...DEFAULT_PREFS });
});
chrome.storage.onChanged.addListener((_c, a) => { if (a === 'local' && Object.values(STORAGE_KEYS).some((k) => k in _c)) void render(); });
void render();
