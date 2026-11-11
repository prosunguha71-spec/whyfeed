const STOP = new Set(('this that with from your have what when will they them their about into more than then just like over only some very much best full video videos official new '+
  'part episode how why who our all you are was were been being can could would should does did not but and the for out one two top most every first last make made '+
  'watch live short shorts hindi english trailer review reaction ft feat free update latest today ever never after before again also really here there these those '+
  'amp 2022 2023 2024 2025 2026').split(' '));

export const CATEGORIES: Record<string, string[]> = {
  Gaming: ['game', 'gaming', 'gameplay', 'minecraft', 'fortnite', 'valorant', 'roblox', 'playthrough', 'walkthrough', 'gta', 'esports', 'speedrun', 'console'],
  Music: ['music', 'song', 'songs', 'lyrics', 'remix', 'album', 'concert', 'acoustic', 'cover', 'playlist', 'beats', 'lofi', 'guitar', 'piano'],
  Technology: ['tech', 'iphone', 'android', 'laptop', 'software', 'gadget', 'smartphone', 'chrome', 'linux', 'hardware', 'gpu', 'robot', 'chip'],
  Programming: ['python', 'javascript', 'typescript', 'coding', 'programming', 'code', 'developer', 'react', 'java', 'algorithm', 'algorithms', 'tutorial', 'leetcode', 'api', 'sql', 'rust', 'github'],
  AI: ['chatgpt', 'claude', 'gemini', 'openai', 'neural', 'llm', 'machine', 'learning', 'artificial', 'intelligence', 'agents', 'copilot'],
  Education: ['learn', 'course', 'lecture', 'explained', 'study', 'exam', 'university', 'lesson', 'guide', 'basics', 'beginners', 'physics', 'maths', 'math', 'chemistry'],
  Science: ['science', 'space', 'nasa', 'biology', 'quantum', 'universe', 'experiment', 'astronomy', 'climate'],
  News: ['news', 'election', 'breaking', 'politics', 'government', 'minister', 'president', 'war', 'debate'],
  Sports: ['football', 'cricket', 'soccer', 'nba', 'match', 'goals', 'highlights', 'tennis', 'league', 'worldcup', 'ipl', 'fifa', 'olympics'],
  Cooking: ['recipe', 'cooking', 'food', 'kitchen', 'chef', 'baking', 'street', 'biryani', 'dessert', 'meal'],
  Fitness: ['workout', 'fitness', 'gym', 'yoga', 'diet', 'exercise', 'muscle', 'running', 'health'],
  Travel: ['travel', 'trip', 'vlog', 'tour', 'journey', 'hotel', 'beach', 'mountains', 'flight'],
  Finance: ['stock', 'stocks', 'invest', 'investing', 'crypto', 'bitcoin', 'finance', 'money', 'trading', 'market', 'economy'],
  Comedy: ['funny', 'comedy', 'meme', 'memes', 'prank', 'standup', 'roast', 'hilarious'],
  Entertainment: ['movie', 'movies', 'film', 'series', 'netflix', 'anime', 'celebrity', 'show', 'drama', 'bollywood']
};

export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^\p{L}\p{N}#+]+/u).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !STOP.has(w));
}

/** Up to `max` distinct keyword topics from a title. */
export function extractTopics(title: string, max = 4): string[] {
  const out: string[] = [];
  for (const w of tokenize(title)) if (w.length >= 4 && !out.includes(w)) out.push(w);
  return out.slice(0, max);
}

/** Best-matching category from the lexicon, or "General". */
export function categorize(title: string): string {
  const words = new Set(tokenize(title));
  let best = 'General', hits = 0;
  for (const [cat, keys] of Object.entries(CATEGORIES)) {
    const n = keys.filter((k) => words.has(k)).length;
    if (n > hits) { best = cat; hits = n; }
  }
  return best;
}

export function parseViews(text: string): number | undefined {
  const m = text.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?\s*views?/i);
  if (!m) return undefined;
  const mult = ({ K: 1e3, M: 1e6, B: 1e9 } as Record<string, number>)[(m[2] ?? '').toUpperCase()] ?? 1;
  return Math.round(parseFloat(m[1]) * mult);
}
