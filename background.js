const REASON_NOT_ENOUGH_POINTS = 'Not enough points';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_PREFIX = 'steam:';
const MAX_CONCURRENT_FETCHES = 4;

// Steam skips the age gate when these cookies claim a birthdate that is old enough.
const AGE_COOKIES = [
  { name: 'birthtime', value: '-2208988799' },
  { name: 'lastagecheckage', value: '1-January-1900' },
  { name: 'wants_mature_content', value: '1' },
];

// --- Offscreen document (DOM parsing) ---

let offscreenReady = null;

function ensureOffscreen() {
  offscreenReady ??= chrome.offscreen
    .createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Needed to parse HTML from Steam store pages',
    })
    .catch((error) => {
      offscreenReady = null;
      // A document that already exists is fine.
      if (!String(error).includes('Only a single offscreen')) throw error;
    });
  return offscreenReady;
}

// --- Age gate ---

let ageCookiesReady = null;

function ensureAgeCookies() {
  ageCookiesReady ??= Promise.all(
    AGE_COOKIES.map((cookie) =>
      chrome.cookies.set({
        url: 'https://store.steampowered.com',
        path: '/',
        secure: true,
        expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        ...cookie,
      })
    )
  ).catch((error) => {
    ageCookiesReady = null;
    throw error;
  });
  return ageCookiesReady;
}

// --- Fetching, caching and throttling ---

function normalizeAppUrl(appUrl) {
  const url = new URL(appUrl);
  if (url.origin !== 'https://store.steampowered.com') return null;
  const match = url.pathname.match(/^\/(app|sub|bundle)\/(\d+)/);
  return match ? `https://store.steampowered.com/${match[1]}/${match[2]}/` : null;
}

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

async function fetchGameInfo(appUrl) {
  await ensureAgeCookies().catch(() => {});

  const response = await fetch(appUrl, { credentials: 'include' });
  if (!response.ok) throw new Error(`Steam responded with ${response.status}`);
  const html = await response.text();

  await ensureOffscreen();
  return chrome.runtime.sendMessage({ type: 'PARSE_HTML', html });
}

const inFlight = new Map();

async function getSteamGameInfo(rawUrl) {
  const appUrl = normalizeAppUrl(rawUrl);
  if (!appUrl) return { unsupported: true };

  const key = CACHE_PREFIX + appUrl;
  const cached = (await chrome.storage.local.get(key))[key];
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.info;

  if (!inFlight.has(appUrl)) {
    inFlight.set(
      appUrl,
      throttled(() => fetchGameInfo(appUrl))
        .then(async (info) => {
          // Only cache complete results so failures are retried.
          if (info && !info.ageRestricted) {
            await chrome.storage.local.set({ [key]: { savedAt: Date.now(), info } });
          }
          return info;
        })
        .finally(() => inFlight.delete(appUrl))
    );
  }
  return inFlight.get(appUrl);
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

async function notifyNotEnoughPoints(senderTabId) {
  const tabs = await chrome.tabs.query({ url: 'https://www.steamgifts.com/*' });
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== senderTabId)
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id, { event: 'not_enough_points_alert' }).catch(() => {})
      )
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { event, url, appUrl } = message;

  if (event === 'giveaway:join:clicked') {
    chrome.tabs.create({ url, active: false });
  }

  if (event === 'giveaway:join:success') {
    chrome.tabs.remove(sender.tab.id);
  }

  if (event === 'giveaway:join:fail') {
    if (message.reason === REASON_NOT_ENOUGH_POINTS) {
      chrome.tabs.remove(sender.tab.id);
      notifyNotEnoughPoints(sender.tab.id);
    }
  }

  if (event === 'steam:game-info') {
    getSteamGameInfo(appUrl)
      .then(sendResponse)
      .catch(() => sendResponse({ error: true }));
    return true; // keep the channel open for the async response
  }
});
