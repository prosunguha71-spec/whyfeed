export interface Weights { channel: number; topic: number; recent: number; category: number; popularity: number }
export type SignalKey = keyof Weights;
export type Confidence = 'Low' | 'Medium' | 'High';

export interface Settings {
  enabled: boolean;
  explanations: boolean;
  analyzeHistory: boolean;
  hideMode: boolean; // local visual hiding of "show less" items
  weights: Weights;
}
export interface WatchEntry { ts: number; id: string; title: string; channel: string; topics: string[]; category: string }
export interface Prefs { lessTopics: string[]; moreTopics: string[]; lessChannels: string[]; preferredTopics: string[] }
export interface Store {
  watch: WatchEntry[];
  channels: Record<string, number>;
  topics: Record<string, number>;
  categories: Record<string, number>;
  recTopics: Record<string, number>;
  recChannels: Record<string, number>;
  recSeen: number;
  hiddenCount: number;
}
export interface VideoInfo { id: string; title: string; channel: string; views?: number; meta: string }
export interface Explanation {
  score: number;
  confidence: Confidence;
  reason: string;
  topic: string;
  channel: string;
  category: string;
  topics: string[];
  evidence: string[];
  breakdown: Record<SignalKey, number | null>;
  preferred: boolean;
}
export interface RecBatchItem { id: string; channel: string; topics: string[]; hidden: boolean }
export interface ExportFile { app: 'WhyFeed'; version: 1; exportedAt: string; settings: Settings; prefs: Prefs; store: Store }
