import type { ExportFile, Prefs, RecBatchItem, Settings, Store, WatchEntry } from '../types';

const K = { settings: 'wf_settings', store: 'wf_store', prefs: 'wf_prefs' } as const;
const MAX_WATCH = 2000;

export const DEFAULT_SETTINGS: Settings = {
  enabled: true, explanations: true, analyzeHistory: true, hideMode: true,
  weights: { channel: 35, topic: 30, recent: 20, category: 10, popularity: 5 }
};
export const DEFAULT_PREFS: Prefs = { lessTopics: [], moreTopics: [], lessChannels: [], preferredTopics: [] };
export const emptyStore = (): Store => ({
  watch: [], channels: {}, topics: {}, categories: {}, recTopics: {}, recChannels: {}, recSeen: 0, hiddenCount: 0
});

async function read<T extends object>(key: string, def: T): Promise<T> {
  const r = await chrome.storage.local.get(key);
  return { ...def, ...((r[key] as Partial<T>) ?? {}) };
}
export const getSettings = () => read(K.settings, DEFAULT_SETTINGS);
export const getPrefs = () => read(K.prefs, DEFAULT_PREFS);
export const getStore = () => read(K.store, emptyStore());
export const setSettings = (s: Settings) => chrome.storage.local.set({ [K.settings]: s });
export const setPrefs = (p: Prefs) => chrome.storage.local.set({ [K.prefs]: p });
export const setStore = (s: Store) => chrome.storage.local.set({ [K.store]: s });
export const STORAGE_KEYS = K;

const bump = (m: Record<string, number>, k: string, n = 1) => { if (k) m[k] = (m[k] ?? 0) + n; };

/** Record a watched video (aggregated counters + capped log). */
export async function recordWatch(e: WatchEntry): Promise<void> {
  const s = await getStore();
  const dupe = s.watch.find((w) => w.id === e.id && e.ts - w.ts < 30 * 60 * 1000);
  if (dupe) return;
  s.watch.push(e);
  if (s.watch.length > MAX_WATCH) s.watch.splice(0, s.watch.length - MAX_WATCH);
  bump(s.channels, e.channel);
  e.topics.forEach((t) => bump(s.topics, t));
  bump(s.categories, e.category);
  await setStore(s);
}

/** Record a batch of recommendations that were displayed (single read-modify-write). */
export async function recordRecs(items: RecBatchItem[]): Promise<void> {
  if (!items.length) return;
  const s = await getStore();
  for (const it of items) {
    s.recSeen++;
    bump(s.recChannels, it.channel);
    it.topics.forEach((t) => bump(s.recTopics, t));
    if (it.hidden) s.hiddenCount++;
  }
  await setStore(s);
}

export async function clearAll(): Promise<void> {
  await chrome.storage.local.remove([K.store, K.prefs]);
}
export async function exportAll(): Promise<ExportFile> {
  return { app: 'WhyFeed', version: 1, exportedAt: new Date().toISOString(),
    settings: await getSettings(), prefs: await getPrefs(), store: await getStore() };
}
export async function importAll(raw: unknown): Promise<void> {
  const d = raw as Partial<ExportFile>;
  if (!d || d.app !== 'WhyFeed' || !d.store || !d.prefs || !d.settings) throw new Error('Not a valid WhyFeed export file.');
  await chrome.storage.local.set({
    [K.settings]: { ...DEFAULT_SETTINGS, ...d.settings },
    [K.prefs]: { ...DEFAULT_PREFS, ...d.prefs },
    [K.store]: { ...emptyStore(), ...d.store }
  });
}
