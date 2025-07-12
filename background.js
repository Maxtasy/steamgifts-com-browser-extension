chrome.runtime.onMessage.addListener(async (request, sender) => {
  const { event, url } = request;

  if (event === 'giveaway:join:clicked') {
    await chrome.tabs.create({ url, active: false });
  }

  if (event === 'giveaway:join:success') {
    await chrome.tabs.remove(sender.tab.id);
  }
});
