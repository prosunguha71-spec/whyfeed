import type { Prefs, SignalKey, Store, VideoInfo, Weights } from '../types';
import { categorize, extractTopics } from './topic-analyzer';
import { channelWatchCount } from './channel-analyzer';

const DAY = 86_400_000;
export interface Signals { values: Record<SignalKey, number | null>; topics: string[]; category: string; notes: Record<SignalKey, string> }

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Every signal is a 0..1 value. `null` = data unavailable (weight is redistributed). */
export function computeSignals(v: VideoInfo, store: Store, prefs: Prefs): Signals {
  const topics = extractTopics(v.title, 5);
  const category = categorize(v.title);
  const now = Date.now();
  const notes = { channel: '', topic: '', recent: '', category: '', popularity: '' } as Record<SignalKey, string>;

  const cCount = channelWatchCount(store, v.channel);
  const channel = clamp(cCount / 5);
  notes.channel = cCount ? `You've watched ${v.channel} ${cCount}× locally.` : '';

  const matched = topics.map((t) => [t, store.topics[t] ?? 0] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const prefHit = topics.find((t) => prefs.preferredTopics.includes(t) || prefs.moreTopics.includes(t));
  let topic = clamp(matched.slice(0, 2).reduce((s, [, n]) => s + clamp(n / 4), 0) / 2 + (matched.length > 2 ? 0.15 : 0));
  if (prefHit) topic = 1;
  notes.topic = prefHit ? `"${prefHit}" is one of your chosen topics.` :
    matched.length ? `Title shares topics you watched: ${matched.slice(0, 3).map(([t, n]) => `${t} (${n}×)`).join(', ')}.` : '';

  const recentWatch = store.watch.filter((w) => now - w.ts < 7 * DAY);
  const recentHits = recentWatch.filter((w) => w.topics.some((t) => topics.includes(t)) || w.channel === v.channel).length;
  const recent = recentWatch.length ? clamp(recentHits / 3) : 0;
  notes.recent = recentHits ? `${recentHits} of your last ${recentWatch.length} videos (7 days) overlap.` : '';

  const totalCat = Object.values(store.categories).reduce((a, b) => a + b, 0);
  const share = totalCat ? (store.categories[category] ?? 0) / totalCat : 0;
  const cat = category === 'General' ? 0 : clamp(share * 2.5);
  notes.category = share ? `${category} is ${Math.round(share * 100)}% of your watched videos.` : '';

  let popularity: number | null = null;
  if (v.views !== undefined) {
    popularity = v.views >= 1e6 ? 1 : v.views >= 1e5 ? 0.5 : 0;
    notes.popularity = popularity ? `Visible view count is high (${v.views.toLocaleString()}).` : '';
  }
  return { values: { channel, topic, recent, category: cat, popularity }, topics, category, notes };
}

/** Weighted 0-100 score. Unavailable signals are excluded and weights re-normalised. */
export function weightedScore(values: Record<SignalKey, number | null>, w: Weights) {
  let total = 0, used = 0;
  const parts = {} as Record<SignalKey, number>;
  (Object.keys(w) as SignalKey[]).forEach((k) => {
    const val = values[k];
    if (val === null) { parts[k] = 0; return; }
    used += w[k]; total += w[k] * val; parts[k] = w[k] * val;
  });
  const score = used ? (total / used) * 100 : 0;
  (Object.keys(parts) as SignalKey[]).forEach((k) => (parts[k] = used ? (parts[k] / used) * 100 : 0));
  return { score: Math.round(score), parts };
}
