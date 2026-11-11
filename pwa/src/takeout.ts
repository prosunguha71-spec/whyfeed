import type { WatchEntry } from '../../src/types';
import { categorize, extractTopics } from '../../src/analysis/topic-analyzer';

interface TakeoutItem { header?: string; title?: string; titleUrl?: string; subtitles?: { name?: string }[]; time?: string }

/** Parses Google Takeout "watch-history.json" into WatchEntry[] (newest `max` entries). Runs fully offline. */
export function parseTakeout(raw: unknown, max = 3000): WatchEntry[] {
  if (!Array.isArray(raw)) throw new Error('Expected the watch-history.json array from Google Takeout.');
  const out: WatchEntry[] = [];
  for (const r of raw as TakeoutItem[]) {
    if (!r || typeof r !== 'object' || (r.header && r.header !== 'YouTube')) continue;
    const id = String(r.titleUrl ?? '').match(/[?&]v=([\w-]{6,})/)?.[1];
    const title = String(r.title ?? '').replace(/^Watched\s+/i, '').trim();
    const ts = Date.parse(String(r.time ?? ''));
    if (!id || !title || Number.isNaN(ts)) continue;
    out.push({ ts, id, title, channel: String(r.subtitles?.[0]?.name ?? '').trim(), topics: extractTopics(title, 5), category: categorize(title) });
  }
  if (!out.length) throw new Error('No watched videos found in that file.');
  return out.sort((a, b) => a.ts - b.ts).slice(-max);
}
