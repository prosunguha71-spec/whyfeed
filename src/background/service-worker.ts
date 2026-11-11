import { DEFAULT_SETTINGS, STORAGE_KEYS, getSettings } from '../storage/local-storage';

async function refreshBadge() {
  const s = await getSettings();
  await chrome.action.setBadgeBackgroundColor({ color: '#7C5CFC' });
  await chrome.action.setBadgeText({ text: s.enabled ? '' : 'OFF' });
}

chrome.runtime.onInstalled.addListener(async (d) => {
  const r = await chrome.storage.local.get(STORAGE_KEYS.settings);
  if (!r[STORAGE_KEYS.settings]) await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  if (d.reason === 'install') await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  await refreshBadge();
});
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.storage.onChanged.addListener((c, a) => { if (a === 'local' && STORAGE_KEYS.settings in c) void refreshBadge(); });

chrome.runtime.onMessage.addListener((msg: { type?: string }, sender) => {
  if (sender.id !== chrome.runtime.id) return; // ignore foreign senders
  if (msg?.type === 'open-dashboard') void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
});
