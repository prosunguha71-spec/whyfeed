import type { VideoInfo } from '../types';
import { normChannel } from '../analysis/channel-analyzer';
import { parseViews } from '../analysis/topic-analyzer';

const CARD_SEL = 'ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, yt-lockup-view-model';
const TITLE_SEL = '#video-title, a#video-title-link, .yt-lockup-metadata-view-model-wiz__title, h3 a[title], h3';
const CHANNEL_SEL = 'ytd-channel-name a, ytd-channel-name #text, #channel-name a, #channel-name, .yt-content-metadata-view-model-wiz__metadata-text';
const META_SEL = '#metadata-line, .yt-content-metadata-view-model-wiz__metadata-row, ytd-video-meta-block';

const txt = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const idFromHref = (href: string | null) => { try { return href ? new URL(href, location.origin).searchParams.get('v') : null; } catch { return null; } };

/** Outermost recommendation cards only, so nested renderers don't produce duplicates. */
export function findCards(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(CARD_SEL)).filter((el) => !el.parentElement?.closest(CARD_SEL));
}

/** Reads only visible information. Returns null when data is missing (e.g. Shorts, ads, skeletons). */
export function readCard(el: HTMLElement): VideoInfo | null {
  const link = el.querySelector<HTMLAnchorElement>('a[href*="/watch?v="]');
  const id = idFromHref(link?.getAttribute('href') ?? null);
  if (!id) return null;
  const titleEl = el.querySelector(TITLE_SEL);
  const title = titleEl?.getAttribute('title') || txt(titleEl) || link?.getAttribute('aria-label') || '';
  if (!title) return null;
  const channel = normChannel(txt(el.querySelector(CHANNEL_SEL)));
  const meta = txt(el.querySelector(META_SEL));
  return { id, title, channel, meta, views: parseViews(meta || txt(el)) };
}

/** The video currently open on a /watch page. */
export function readCurrentVideo(): VideoInfo | null {
  const id = new URL(location.href).searchParams.get('v');
  const title = txt(document.querySelector('h1.ytd-watch-metadata yt-formatted-string, h1.title, ytd-watch-metadata h1'));
  const channel = normChannel(txt(document.querySelector('ytd-watch-metadata ytd-channel-name a, #owner ytd-channel-name a, #owner #channel-name a')));
  return id && title ? { id, title, channel, meta: '' } : null;
}
