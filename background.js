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

async function getSteamRating(appUrl) {
  const response = await fetch(appUrl);
  const html = await response.text();
  await ensureOffscreen();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'PARSE_HTML', html }, (res) => {
      resolve(res.rating || 'No rating found');
    });
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

  if (event === 'steam:rating') {
    getSteamRating(appUrl).then((rating) => {
      sendResponse({ rating });
    });
    return true; // ✅ allow async response
  }
});
