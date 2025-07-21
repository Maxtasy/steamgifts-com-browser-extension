const REASON_NOT_ENOUGH_POINTS = 'Not enough points';

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { event, url, appUrl } = message;

  if (event === 'giveaway:join:clicked') {
    chrome.tabs.create({ url, active: false });
  }

  if (event === 'giveaway:join:success') {
    chrome.tabs.remove(sender.tab.id);
  }

  if (event === 'giveaway:join:fail' && message.broadcast) {
    const { reason } = message;
    if (reason === REASON_NOT_ENOUGH_POINTS) {
      chrome.tabs.remove(sender.tab.id);

      chrome.tabs.query({}, function (tabs) {
        for (let tab of tabs) {
          // Don't send to the sender tab
          if (tab.id !== sender.tab.id) {
            chrome.tabs.sendMessage(tab.id, { event: 'not_enough_points_alert' });
          }
        }
      });
    }
  }

  if (event === 'steam:game-info') {
    getSteamGameInfo(appUrl).then(({ ageRestricted, rating, achievements }) => {
      sendResponse({ ageRestricted, rating, achievements });
    });
    return true; // ✅ allow async response
  }
});
