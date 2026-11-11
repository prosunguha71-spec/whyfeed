import type { Prefs, RecBatchItem, Settings, Store } from '../types';
import { DEFAULT_PREFS, DEFAULT_SETTINGS, STORAGE_KEYS, emptyStore, getPrefs, getSettings, getStore, recordRecs, recordWatch, setPrefs } from '../storage/local-storage';
import { categorize, extractTopics } from '../analysis/topic-analyzer';
import { explain, shouldHide } from '../analysis/recommendation-engine';
import { findCards, readCard, readCurrentVideo } from './recommendation-reader';
import { ensureStyles, injectCard, removeAll, type CardActions } from './explanation-injector';

let settings: Settings = DEFAULT_SETTINGS, prefs: Prefs = DEFAULT_PREFS, store: Store = emptyStore();
const seenThisSession = new Set<string>();
let pending: RecBatchItem[] = [];
let scanTimer: number | undefined, watchTimer: number | undefined, flushTimer: number | undefined;

const addUnique = (arr: string[], v: string) => (v && !arr.includes(v) ? [...arr, v] : arr);
const without = (arr: string[], v: string) => arr.filter((x) => x !== v);

const actions: CardActions = {
  lessTopic: (t) => setPrefs({ ...prefs, lessTopics: addUnique(prefs.lessTopics, t), moreTopics: without(prefs.moreTopics, t) }),
  moreTopic: (t) => setPrefs({ ...prefs, moreTopics: addUnique(prefs.moreTopics, t), lessTopics: without(prefs.lessTopics, t) }),
  lessChannel: (c) => setPrefs({ ...prefs, lessChannels: addUnique(prefs.lessChannels, c) }),
  openDashboard: () => { chrome.runtime.sendMessage({ type: 'open-dashboard' }); }
};

async function loadAll() { [settings, prefs, store] = await Promise.all([getSettings(), getPrefs(), getStore()]); }

function flushSoon() {
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { const batch = pending; pending = []; void recordRecs(batch); }, 2500);
}

function scan() {
  if (!settings.enabled || !location.hostname.includes('youtube.com')) return;
  ensureStyles();
  for (const el of findCards()) {
    const v = readCard(el);
    if (!v || el.dataset.wfId === v.id) continue;
    el.dataset.wfId = v.id;
    const x = explain(v, store, prefs, settings);
    const hide = settings.hideMode && shouldHide(v, x.topics, prefs);
    el.classList.toggle('wf-hidden', hide);
    if (!hide && settings.explanations) injectCard(el, v, x, actions);
    if (settings.analyzeHistory && !seenThisSession.has(v.id)) {
      seenThisSession.add(v.id);
      pending.push({ id: v.id, channel: v.channel, topics: x.topics, hidden: hide });
      flushSoon();
    }
  }
}
const scanSoon = () => { window.clearTimeout(scanTimer); scanTimer = window.setTimeout(scan, 350); };

function onNavigate() {
  window.clearTimeout(watchTimer);
  scanSoon();
  if (!settings.enabled || !settings.analyzeHistory || location.pathname !== '/watch') return;
  // Count a video as "watched" after ~15 seconds on the page.
  watchTimer = window.setTimeout(() => {
    const v = readCurrentVideo();
    if (!v) return;
    void recordWatch({ ts: Date.now(), id: v.id, title: v.title, channel: v.channel, topics: extractTopics(v.title, 5), category: categorize(v.title) });
  }, 15_000);
}

async function init() {
  await loadAll();
  new MutationObserver(scanSoon).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('yt-navigate-finish', onNavigate); // YouTube SPA navigation
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local' || !Object.values(STORAGE_KEYS).some((k) => k in changes)) return;
    const prefsChanged = STORAGE_KEYS.prefs in changes || STORAGE_KEYS.settings in changes;
    await loadAll();
    if (prefsChanged || !settings.enabled) { removeAll(); }
    scanSoon();
  });
  onNavigate();
}
void init();
