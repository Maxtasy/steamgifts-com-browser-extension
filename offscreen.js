chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PARSE_HTML') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, 'text/html');
    const el = doc.querySelector('.user_reviews .game_review_summary');
    const rating = el ? el.textContent.trim() : 'Not found';
    sendResponse({ rating });
  }
});
