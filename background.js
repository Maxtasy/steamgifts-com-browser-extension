import {
  appDetailsUrl,
  appReviewsUrl,
  parseAppDetails,
  parseAppId,
  parseAppReviews,
} from './lib/steam.js';

const REASON_NOT_ENOUGH_POINTS = 'Not enough points';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_PREFIX = 'steam:v3:';
const MAX_CONCURRENT_FETCHES = 4;


let activeFetches = 0;
const fetchQueue = [];

function throttled(task) {
  return new Promise((resolve, reject) => {
    const run = async () => {
      activeFetches++;
      try {
        resolve(await task());
      } catch (error) {
        reject(error);
      } finally {
        activeFetches--;
        fetchQueue.shift()?.();
      }
    };
    if (activeFetches < MAX_CONCURRENT_FETCHES) run();
    else fetchQueue.push(run);
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Steam responded with ${response.status}`);
  return response.json();
}

async function fetchGameInfo(appId) {
  const [details, reviews] = await Promise.all([
    fetchJson(appDetailsUrl(appId)),
    fetchJson(appReviewsUrl(appId)).catch(() => null),
  ]);

  return { ...parseAppDetails(details, appId), rating: parseAppReviews(reviews) };
}

const inFlight = new Map();

async function getSteamGameInfo(rawUrl) {
  const appId = parseAppId(rawUrl);
  if (!appId) return { unsupported: true };

  const key = CACHE_PREFIX + appId;
  const cached = (await chrome.storage.local.get(key))[key];
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.info;

  if (!inFlight.has(appId)) {
    inFlight.set(
      appId,
      throttled(() => fetchGameInfo(appId))
        .then(async (info) => {
          await chrome.storage.local.set({ [key]: { savedAt: Date.now(), info } });
          return info;
        })
        .finally(() => inFlight.delete(appId))
    );
  }
  return inFlight.get(appId);
}

async function pruneCache() {
  const entries = await chrome.storage.local.get(null);
  const expired = Object.keys(entries).filter(
    (key) => key.startsWith(CACHE_PREFIX) && Date.now() - entries[key].savedAt >= CACHE_TTL_MS
  );
  if (expired.length) await chrome.storage.local.remove(expired);
}

chrome.runtime.onStartup.addListener(pruneCache);
chrome.runtime.onInstalled.addListener(pruneCache);

// --- Messaging ---

async function broadcastToSteamgifts(senderTabId, message) {
  const tabs = await chrome.tabs.query({ url: 'https://www.steamgifts.com/*' });
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== senderTabId)
      .map((tab) => chrome.tabs.sendMessage(tab.id, message).catch(() => {}))
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { event, url, appUrl } = message;

  if (event === 'giveaway:join:clicked') {
    chrome.tabs.create({ url, active: false });
  }

  if (event === 'giveaway:join:success') {
    chrome.tabs.remove(sender.tab.id);
    if (message.cost > 0) {
      broadcastToSteamgifts(sender.tab.id, { event: 'points_spent', cost: message.cost });
    }
  }

  if (event === 'giveaway:join:fail') {
    if (message.reason === REASON_NOT_ENOUGH_POINTS) {
      chrome.tabs.remove(sender.tab.id);
      broadcastToSteamgifts(sender.tab.id, { event: 'not_enough_points_alert' });
    }
  }

  if (event === 'steam:game-info') {
    getSteamGameInfo(appUrl)
      .then(sendResponse)
      .catch(() => sendResponse({ error: true }));
    return true; // keep the channel open for the async response
  }
});
