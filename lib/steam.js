const STORE_ORIGIN = 'https://store.steampowered.com';
const API_ORIGIN = 'https://api.steampowered.com';
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
  const input = {
    ids: [{ appid: Number(appId) }],
    context: { language: 'english', country_code: 'US' },
    data_request: { include_reviews: true },
  };
  return `${API_ORIGIN}/IStoreBrowseService/GetItems/v1?input_json=${encodeURIComponent(JSON.stringify(input))}`;
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
  const summary = json?.response?.store_items?.[0]?.reviews?.summary_filtered;
  if (!summary?.review_count) return null;
  return summary.review_score_label ?? null;
}
