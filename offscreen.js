chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PARSE_HTML') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, 'text/html');

    const ageRestricted = doc.querySelector('.age_gate');

    // TODO: Select date of birth and submit form.
    if (ageRestricted) {
      sendResponse({ ageRestricted: true });
      return;
    }

    const reviewSummaryElement = doc.querySelector('.user_reviews .game_review_summary');
    const rating = reviewSummaryElement ? reviewSummaryElement.textContent.trim() : 'Not found';
    const achievementsTitleElement = doc.querySelector('#achievement_block .block_title');
    const achievements = achievementsTitleElement
      ? achievementsTitleElement.textContent.trim()
      : 'No achievements';

    sendResponse({ rating, achievements });
  }
});
