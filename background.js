async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Needed to parse HTML from Steam store pages',
    });
  }
}

async function getSteamGameInfo(appUrl) {
  const response = await fetch(appUrl);
  const html = await response.text();
  await ensureOffscreen();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'PARSE_HTML', html },
      ({ ageRestricted, rating, achievements }) => {
        resolve({ ageRestricted, rating, achievements });
      }
    );
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { event, url, appUrl } = request;

  if (event === 'giveaway:join:clicked') {
    chrome.tabs.create({ url, active: false });
  }

  if (event === 'giveaway:join:success') {
    chrome.tabs.remove(sender.tab.id);
  }

  if (event === 'steam:game-info') {
    getSteamGameInfo(appUrl).then(({ ageRestricted, rating, achievements }) => {
      sendResponse({ ageRestricted, rating, achievements });
    });
    return true; // ✅ allow async response
  }
});
