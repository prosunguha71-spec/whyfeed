import '../../src/styles/main.css';
import './app.css';
import type { Explanation, Prefs, SignalKey, VideoInfo } from '../../src/types';
import { DEFAULT_SETTINGS } from '../../src/storage/local-storage';
import { explain, shouldHide } from '../../src/analysis/recommendation-engine';
import { topEntries } from '../../src/analysis/channel-analyzer';
import { barChart, lineChart, ringChart } from '../../src/dashboard/charts';
import { app, clearAll, exportData, importData, persist, recordRec, setWatch } from './state';
import { parseTakeout } from './takeout';

type Route = 'overview' | 'explain' | 'controls' | 'data';
const ROUTES: [Route, string, string][] = [['overview', '📊', 'Overview'], ['explain', '💡', 'Explain'], ['controls', '🎛️', 'Controls'], ['data', '⚙️', 'Data']];
const $ = (s: string) => document.querySelector(s) as HTMLElement;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const chartCard = (id: string, title: string, cls: string, empty: string) =>
  `<div class="card ${cls}"><h2>${title}</h2><div class="chart"><canvas id="${id}"></canvas></div><div class="empty">${empty}</div></div>`;

interface Result { v: VideoInfo; x: Explanation; hidden: boolean }
let feedText = '', results: Result[] = [], msg = '';
let installEvt: (Event & { prompt: () => Promise<void> }) | null = null;

/* ---------- shared logic ---------- */
function bubble() {
  const s = app.store, total = Object.values(s.recTopics).reduce((a, b) => a + b, 0);
  if (s.recSeen < 20 || !total) return { pct: 0, label: 'Collecting data', cls: 'b-ok', msg: `Analyse ~20 recommended videos in Explain (have ${s.recSeen}).` };
  const pct = Math.round((topEntries(s.recTopics, 3).reduce((a, [, n]) => a + n, 0) / total) * 100);
  const [label, cls] = pct < 25 ? ['Low', 'b-ok'] : pct < 40 ? ['Moderate', 'b-mid'] : ['High', 'b-hi'];
  return { pct, label, cls, msg: `Your top 3 recommended topics make up ${pct}% of topic mentions. A rough local heuristic, not proof of a filter bubble.` };
}
const uniq = (a: string[], v: string) => (v && !a.includes(v) ? [...a, v] : a);
const chips = (items: string[], key: keyof Prefs) => items.length ? items.map((t, i) => `<span class="chip">${esc(t)}<button data-act="rm" data-k="${key}" data-i="${i}">✕</button></span>`).join('') : '<span class="muted">None</span>';

/* ---------- views ---------- */
const views: Record<Route, () => string> = {
  overview() {
    const s = app.store;
    const intro = s.watch.length ? '' : `<div class="card hero-card"><h2>Welcome to WhyFeed</h2><p class="muted" style="margin:6px 0 12px">Add your viewing history so WhyFeed can learn your patterns. Everything stays on this device.</p>
      <div class="form"><a class="btn primary" href="#/data">Import watch history</a><a class="btn" href="#/explain">Analyse recommended videos</a></div></div>`;
    return `<div class="head"><div><h1>Feed analysis</h1><p class="muted">Estimates from your local data, not YouTube's real algorithm.</p></div></div>${intro}
      <section class="stats">${[['Videos analysed', s.watch.length], ['Recommendations analysed', s.recSeen], ['Channels tracked', Object.keys(s.channels).length], ['Filtered by your rules', s.hiddenCount]].map(([l, v]) => `<div class="card stat"><h3>${l}</h3><b>${v}</b></div>`).join('')}</section>
      <section class="grid">
        ${chartCard('cActivity', 'Watch activity (14 days)', 'c8', 'No watch activity in the last 14 days.')}${chartCard('cCategory', 'Category distribution', 'c4', 'No data yet.')}
        ${chartCard('cTopics', 'Top 10 watched topics', 'c6', 'No topics yet.')}${chartCard('cChannels', 'Most watched channels', 'c6', 'No channels yet.')}
        ${chartCard('cRecs', 'Recommendation topics', 'c6', 'Analyse recommended videos to see this.')}
        <div class="card c6"><h2>Filter bubble indicator</h2><div id="bubble"></div><h3 style="margin-top:16px">Repeated content patterns</h3><ul class="list" id="patterns"></ul></div>
      </section>`;
  },
  explain() {
    const list = results.map(({ v, x, hidden }) => `<div class="res ${hidden ? 'dim' : ''}"><h3>${esc(v.title)}</h3>
      <div class="tags"><span class="tag">${esc(v.channel || 'Unknown channel')}</span><span class="badge ${x.confidence === 'High' ? 'b-ok' : x.confidence === 'Medium' ? 'b-mid' : 'tag'}">${x.confidence} · ${x.score}/100</span>${x.preferred ? '<span class="tag">★ preferred</span>' : ''}${hidden ? '<span class="tag">Filtered by your rules</span>' : ''}</div>
      <p>${esc(x.reason)}</p><details><summary>Evidence</summary><ul>${x.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></details>
      <div class="tags">${x.topic ? `<button class="btn sm" data-act="less" data-t="${esc(x.topic)}">Show less “${esc(x.topic)}”</button><button class="btn sm" data-act="more" data-t="${esc(x.topic)}">Show more</button>` : ''}${v.channel ? `<button class="btn sm" data-act="chan" data-c="${esc(v.channel)}">Reduce channel</button>` : ''}</div></div>`).join('');
    return `<div class="head"><div><h1>Explain my feed</h1><p class="muted">Paste recommended videos, one per line as <b>Title | Channel</b>.</p></div></div>
      <div class="card"><textarea id="feed" placeholder="Python Algorithms Explained Fast | CodeWithHarry&#10;Top 10 Minecraft Speedrun Tricks | Dream">${esc(feedText)}</textarea>
      <div class="form"><button class="btn primary" data-act="analyze">Analyse</button><button class="btn" data-act="clearfeed">Clear</button></div>
      ${app.store.watch.length < 5 ? '<p class="hint" style="margin-top:12px">Little history so far, so estimates will be rough. Import your watch history in Data for better results.</p>' : ''}</div>
      ${results.length ? `<div style="display:grid;gap:12px">${list}</div>` : ''}`;
  },
  controls() {
    const p = app.prefs;
    return `<div class="head"><div><h1>Feed controls</h1><p class="muted">Rules apply to your Explain results here and locally in the extension. They never change YouTube's algorithm.</p></div></div>
      <div class="card"><div class="form"><input type="text" id="topicIn" placeholder="Topic, e.g. python"><button class="btn sm" data-act="add" data-add="less">Show less</button><button class="btn sm" data-act="add" data-add="more">Show more</button><button class="btn sm" data-act="add" data-add="pref">Add preferred</button></div>
      <div class="form"><input type="text" id="chanIn" placeholder="Channel name"><button class="btn sm" data-act="add" data-add="chan">Reduce channel</button></div>
      <div class="grid" style="margin-top:14px"><div class="c6"><h3>Show less of</h3><div class="chips">${chips(p.lessTopics, 'lessTopics')}</div></div><div class="c6"><h3>Show more of</h3><div class="chips">${chips(p.moreTopics, 'moreTopics')}</div></div>
      <div class="c6"><h3>Preferred topics</h3><div class="chips">${chips(p.preferredTopics, 'preferredTopics')}</div></div><div class="c6"><h3>Reduced channels</h3><div class="chips">${chips(p.lessChannels, 'lessChannels')}</div></div></div>
      <div class="form"><button class="btn danger" data-act="reset">Reset preferences</button></div></div>`;
  },
  data() {
    const N: Record<SignalKey, string> = { channel: 'Channel match', topic: 'Topic match', recent: 'Recent activity', category: 'Category match', popularity: 'Popularity' };
    const w = app.settings.weights, tot = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    return `<div class="head"><div><h1>Data &amp; settings</h1><p class="muted">${esc(msg)}</p></div></div>
      <div class="card"><h2>Import your history</h2><p class="muted" style="margin:6px 0">Download <b>watch-history.json</b> from <a href="https://takeout.google.com" target="_blank" rel="noopener">Google Takeout</a> (YouTube → history, JSON format). It is parsed in your browser and never uploaded.</p>
        <div class="form"><button class="btn primary" data-act="pick" data-f="fTakeout">Import watch-history.json</button><button class="btn" data-act="pick" data-f="fBackup">Import WhyFeed backup</button><button class="btn" data-act="export">Export JSON</button></div>
        <input type="file" id="fTakeout" accept=".json,application/json" hidden><input type="file" id="fBackup" accept=".json,application/json" hidden></div>
      <div class="card"><h2>Scoring weights</h2><p class="muted">Normalised automatically.</p>${(Object.keys(N) as SignalKey[]).map((k) => `<div class="wrow"><span>${N[k]}</span><input type="range" min="0" max="100" value="${w[k]}" data-w="${k}"><b>${Math.round((w[k] / tot) * 100)}%</b></div>`).join('')}
        <div class="form"><button class="btn sm" data-act="wreset">Restore defaults</button></div></div>
      <div class="card"><h2>Install app</h2><p class="muted" style="margin:6px 0">${installEvt ? 'Install WhyFeed for a full-screen, offline-ready app.' : 'Use your browser menu → Install app / Add to Home Screen (iOS: Share → Add to Home Screen).'}</p>${installEvt ? '<button class="btn primary" data-act="install">Install WhyFeed</button>' : ''}</div>
      <div class="card"><h2>Privacy</h2><ul class="list"><li>All analysis runs on this device. There is no server and no analytics.</li><li>Data is stored in this browser's local storage. Clear it any time below.</li><li>Explanations are estimates. WhyFeed cannot see or change YouTube's real algorithm.</li></ul>
        <div class="form"><button class="btn danger" data-act="clear">Clear all data</button></div></div>`;
  }
};

/* ---------- chart wiring ---------- */
function drawOverview() {
  const s = app.store;
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (13 - i)); return d; });
  lineChart('cActivity', days.map((d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })), days.map((d) => s.watch.filter((w) => w.ts >= +d && w.ts < +d + 864e5).length));
  const cat = topEntries(s.categories, 8); ringChart('cCategory', 'doughnut', cat.map((c) => c[0]), cat.map((c) => c[1]));
  const tt = topEntries(s.topics, 10); barChart('cTopics', tt.map((t) => t[0]), tt.map((t) => t[1]));
  const tc = topEntries(s.channels, 8); barChart('cChannels', tc.map((t) => t[0]), tc.map((t) => t[1]), true);
  const rt = topEntries(s.recTopics, 8); ringChart('cRecs', 'pie', rt.map((t) => t[0]), rt.map((t) => t[1]));
  const b = bubble();
  $('#bubble').innerHTML = `<div style="display:flex;justify-content:space-between"><span class="badge ${b.cls}">${b.label}</span><b>${b.pct}%</b></div><div class="meter"><i style="width:${b.pct}%"></i></div><p class="muted">${esc(b.msg)}</p>`;
  const pat = [...topEntries(s.topics, 20).filter(([, n]) => n >= 3).slice(0, 4).map(([t, n]) => `Topic “${t}” appeared in ${n} watched videos`),
    ...topEntries(s.channels, 10).filter(([, n]) => n >= 3).slice(0, 3).map(([c, n]) => `You watched ${c} ${n} times`),
    ...topEntries(s.recChannels, 10).filter(([, n]) => n >= 4).slice(0, 3).map(([c, n]) => `${c} appeared ${n} times in analysed recommendations`)];
  $('#patterns').innerHTML = pat.length ? pat.map((x) => `<li>${esc(x)}</li>`).join('') : '<li class="muted">No repeated patterns detected yet.</li>';
}

function route(): Route { const r = location.hash.replace('#/', '') as Route; return ROUTES.some((x) => x[0] === r) ? r : 'overview'; }
function render() {
  const cur = route();
  $('#nav').innerHTML = ROUTES.map(([r, i, l]) => `<a href="#/${r}" class="${r === cur ? 'on' : ''}"><span>${i}</span>${l}</a>`).join('');
  $('#view').innerHTML = views[cur]();
  if (cur === 'overview') drawOverview();
}

/* ---------- actions ---------- */
function analyse() {
  feedText = ($('#feed') as HTMLTextAreaElement).value;
  results = feedText.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 60).map((line, i) => {
    const [title, ...rest] = line.split(/\s*[|–—]\s*/);
    const v: VideoInfo = { id: `m${i}`, title: title.trim(), channel: rest.join(' ').trim(), meta: '' };
    const x = explain(v, app.store, app.prefs, app.settings);
    const hidden = shouldHide(v, x.topics, app.prefs);
    recordRec(v.channel, x.topics, hidden);
    return { v, x, hidden };
  });
  persist(); render();
}
const setPrefs = (p: Prefs) => { app.prefs = p; persist(); render(); };
const readJson = async (f: File) => JSON.parse(await f.text()) as unknown;

document.addEventListener('click', async (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!t) return;
  const p = app.prefs, a = t.dataset.act;
  if (a === 'analyze') analyse();
  else if (a === 'clearfeed') { feedText = ''; results = []; render(); }
  else if (a === 'less') setPrefs({ ...p, lessTopics: uniq(p.lessTopics, t.dataset.t!), moreTopics: p.moreTopics.filter((x) => x !== t.dataset.t) });
  else if (a === 'more') setPrefs({ ...p, moreTopics: uniq(p.moreTopics, t.dataset.t!), lessTopics: p.lessTopics.filter((x) => x !== t.dataset.t) });
  else if (a === 'chan') setPrefs({ ...p, lessChannels: uniq(p.lessChannels, t.dataset.c!) });
  else if (a === 'add') {
    const topic = ($('#topicIn') as HTMLInputElement).value.trim().toLowerCase(), chan = ($('#chanIn') as HTMLInputElement).value.trim(), k = t.dataset.add;
    if (k === 'less' && topic) setPrefs({ ...p, lessTopics: uniq(p.lessTopics, topic), moreTopics: p.moreTopics.filter((x) => x !== topic) });
    else if (k === 'more' && topic) setPrefs({ ...p, moreTopics: uniq(p.moreTopics, topic), lessTopics: p.lessTopics.filter((x) => x !== topic) });
    else if (k === 'pref' && topic) setPrefs({ ...p, preferredTopics: uniq(p.preferredTopics, topic) });
    else if (k === 'chan' && chan) setPrefs({ ...p, lessChannels: uniq(p.lessChannels, chan) });
  } else if (a === 'rm') { const k = t.dataset.k as keyof Prefs; setPrefs({ ...p, [k]: p[k].filter((_, i) => i !== Number(t.dataset.i)) }); }
  else if (a === 'reset' && confirm('Reset all feed preferences?')) setPrefs({ lessTopics: [], moreTopics: [], lessChannels: [], preferredTopics: [] });
  else if (a === 'wreset') { app.settings.weights = { ...DEFAULT_SETTINGS.weights }; persist(); render(); }
  else if (a === 'pick') ($('#' + t.dataset.f) as HTMLInputElement).click();
  else if (a === 'export') {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: `whyfeed-export-${new Date().toISOString().slice(0, 10)}.json` }).click(); URL.revokeObjectURL(url);
  } else if (a === 'clear' && confirm('Erase all WhyFeed data on this device? This cannot be undone.')) { clearAll(); results = []; feedText = ''; msg = 'All data cleared.'; render(); }
  else if (a === 'install' && installEvt) { await installEvt.prompt(); installEvt = null; render(); }
});
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.w) { app.settings.weights[t.dataset.w as SignalKey] = Number(t.value); persist(); render(); return; }
  const f = t.files?.[0]; if (!f) return;
  try {
    if (t.id === 'fTakeout') { const w = parseTakeout(await readJson(f)); setWatch(w); msg = `Imported ${w.length} watched videos.`; }
    else if (t.id === 'fBackup') { importData(await readJson(f)); msg = 'Backup imported.'; }
  } catch (err) { msg = (err as Error).message || 'Import failed.'; }
  render();
});
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e as typeof installEvt; if (route() === 'data') render(); });
if ('serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js'); });
render();
