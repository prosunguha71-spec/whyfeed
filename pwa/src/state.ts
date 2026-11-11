import type { ExportFile, Prefs, Settings, Store, WatchEntry } from '../../src/types';
import { DEFAULT_PREFS, DEFAULT_SETTINGS, emptyStore } from '../../src/storage/local-storage';

const KEY = 'whyfeed_pwa_v1';
export interface AppState { settings: Settings; prefs: Prefs; store: Store }

function load(): AppState {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<AppState> | null;
    return { settings: { ...DEFAULT_SETTINGS, ...r?.settings }, prefs: { ...DEFAULT_PREFS, ...r?.prefs }, store: { ...emptyStore(), ...r?.store } };
  } catch { return { settings: { ...DEFAULT_SETTINGS }, prefs: { ...DEFAULT_PREFS }, store: emptyStore() }; }
}
export const app: AppState = load();
export const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(app)); } catch { alert('Storage is full. Export your data, then clear some.'); } };

const bump = (m: Record<string, number>, k: string) => { if (k) m[k] = (m[k] ?? 0) + 1; };
/** Replace the watch log and rebuild aggregate counters (recommendation stats are kept). */
export function setWatch(watch: WatchEntry[]) {
  const s = app.store; s.watch = watch; s.channels = {}; s.topics = {}; s.categories = {};
  for (const w of watch) { bump(s.channels, w.channel); w.topics.forEach((t) => bump(s.topics, t)); bump(s.categories, w.category); }
  persist();
}
export function recordRec(channel: string, topics: string[], hidden: boolean) {
  const s = app.store; s.recSeen++; bump(s.recChannels, channel); topics.forEach((t) => bump(s.recTopics, t)); if (hidden) s.hiddenCount++;
}
export const exportData = (): ExportFile => ({ app: 'WhyFeed', version: 1, exportedAt: new Date().toISOString(), settings: app.settings, prefs: app.prefs, store: app.store });
/** Accepts a WhyFeed export (from this app or the Chrome extension). */
export function importData(raw: unknown) {
  const d = raw as Partial<ExportFile>;
  if (!d || d.app !== 'WhyFeed' || !d.store || !d.prefs || !d.settings) throw new Error('Not a valid WhyFeed export file.');
  app.settings = { ...DEFAULT_SETTINGS, ...d.settings }; app.prefs = { ...DEFAULT_PREFS, ...d.prefs }; app.store = { ...emptyStore(), ...d.store }; persist();
}
export function clearAll() { app.prefs = { ...DEFAULT_PREFS }; app.store = emptyStore(); persist(); }
