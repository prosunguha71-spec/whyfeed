import type { Store } from '../types';
export const normChannel = (name: string) => name.replace(/\s+/g, ' ').trim();
const key = (s: string) => normChannel(s).toLowerCase();

export function channelWatchCount(store: Store, channel: string): number {
  const k = key(channel);
  return Object.entries(store.channels).reduce((n, [c, v]) => (key(c) === k ? n + v : n), 0);
}
export function topEntries(map: Record<string, number>, n = 8): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
}
export const sameChannel = (a: string, b: string) => key(a) === key(b);
