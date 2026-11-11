import type { Explanation, Prefs, SignalKey, Settings, Store, VideoInfo } from '../types';
import { computeSignals, weightedScore } from './scoring';
import { sameChannel } from './channel-analyzer';

const REASONS: Record<SignalKey, (v: VideoInfo, topic: string, cat: string) => string> = {
  channel: (v) => `Possibly recommended because you frequently watch ${v.channel}.`,
  topic: (_v, t) => `Possibly recommended because it matches topics you watch, like "${t}".`,
  recent: (_v, t) => `Possibly recommended because it relates to your recent activity${t ? ` ("${t}")` : ''}.`,
  category: (_v, _t, c) => `Possibly recommended because you watch a lot of ${c} content.`,
  popularity: () => 'Possibly recommended because this video appears to be popular right now.'
};

export function explain(v: VideoInfo, store: Store, prefs: Prefs, settings: Settings): Explanation {
  const sig = computeSignals(v, store, prefs);
  const { score, parts } = weightedScore(sig.values, settings.weights);
  const keys = Object.keys(parts) as SignalKey[];
  const top = keys.sort((a, b) => parts[b] - parts[a])[0];
  const topic = sig.topics.find((t) => (store.topics[t] ?? 0) > 0 || prefs.preferredTopics.includes(t)) ?? sig.topics[0] ?? '';
  const sparse = store.watch.length < 5;

  let confidence: Explanation['confidence'] = score >= 60 ? 'High' : score >= 30 ? 'Medium' : 'Low';
  if (sparse && confidence === 'High') confidence = 'Medium';

  const evidence = (Object.keys(sig.notes) as SignalKey[]).map((k) => sig.notes[k]).filter(Boolean);
  if (sparse) evidence.push('Limited local history so far, so this estimate is rough.');
  const reason = score < 12
    ? 'No strong match with your local viewing patterns. YouTube may be using signals WhyFeed cannot see.'
    : REASONS[top](v, topic, sig.category);

  return {
    score, confidence, reason, topic, channel: v.channel, category: sig.category, topics: sig.topics,
    evidence: evidence.length ? evidence : ['No overlapping evidence found locally.'],
    breakdown: sig.values, preferred: sig.topics.some((t) => prefs.preferredTopics.includes(t) || prefs.moreTopics.includes(t))
  };
}

/** Local-only filtering. This never changes YouTube's server-side algorithm. */
export function shouldHide(v: VideoInfo, topics: string[], prefs: Prefs): boolean {
  return prefs.lessChannels.some((c) => sameChannel(c, v.channel)) || topics.some((t) => prefs.lessTopics.includes(t));
}
