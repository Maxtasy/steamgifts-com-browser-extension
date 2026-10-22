const STORE_ORIGIN = 'https://store.steampowered.com';
const ADULT_AGE = 18;

export function parseAppId(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.origin !== STORE_ORIGIN) return null;
  return url.pathname.match(/^\/app\/(\d+)/)?.[1] ?? null;
}

export function appDetailsUrl(appId) {
  return `${STORE_ORIGIN}/api/appdetails?appids=${appId}&filters=basic,achievements`;
}

export function appReviewsUrl(appId) {
  return `${STORE_ORIGIN}/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`;
}

/** Returns { ageRestricted, achievements } where achievements is a count, or null if unknown. */
export function parseAppDetails(json, appId) {
  const entry = json?.[appId];
  if (!entry?.success) return { ageRestricted: false, achievements: null };

  const { data } = entry;
  return {
    ageRestricted: Number(data.required_age) >= ADULT_AGE,
    achievements: data.achievements?.total ?? 0,
  };
}

/** Returns the review summary text (e.g. "Very Positive"), or null if there are no reviews. */
export function parseAppReviews(json) {
  const summary = json?.query_summary;
  if (!json?.success || !summary?.total_reviews) return null;
  return summary.review_score_desc ?? null;
}
