function parseGameInfo(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  if (doc.querySelector('.age_gate')) {
    return { ageRestricted: true };
  }

  // Prefer the "All Reviews" row; the first summary on the page is "Recent Reviews".
  const allReviewsRow = doc.querySelector('.user_reviews_summary_row .subtitle.all')?.closest(
    '.user_reviews_summary_row'
  );
  const reviewSummaryElement = (allReviewsRow ?? doc).querySelector(
    '.user_reviews .game_review_summary'
  );
  const rating = reviewSummaryElement ? reviewSummaryElement.textContent.trim() : null;

  // Steam renders the achievements block client-side and reuses #achievement_block
  // for the Points Shop, so rely on the "Steam Achievements" store category instead.
  const hasAchievements = Boolean(doc.querySelector('a[href*="category2=22"]'));

  return { rating, hasAchievements };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'PARSE_HTML') return;

  sendResponse(parseGameInfo(message.html));
});
