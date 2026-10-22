import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAppId, parseAppDetails, parseAppReviews } from '../lib/steam.js';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

test('parseAppId accepts store app urls only', () => {
  assert.equal(parseAppId('https://store.steampowered.com/app/620/Portal_2/'), '620');
  assert.equal(parseAppId('https://store.steampowered.com/sub/123/'), null);
  assert.equal(parseAppId('https://example.com/app/620/'), null);
  assert.equal(parseAppId('not a url'), null);
});

test('parseAppDetails reads the achievement count', () => {
  assert.deepEqual(parseAppDetails(fixture('appdetails-portal2'), '620'), {
    ageRestricted: false,
    achievements: 51,
  });
});

test('parseAppDetails flags adult games', () => {
  const result = parseAppDetails(fixture('appdetails-mature'), '1091500');
  assert.equal(result.ageRestricted, true);
  assert.equal(result.achievements, 57);
});

test('parseAppDetails reports zero achievements when the field is missing', () => {
  assert.equal(parseAppDetails(fixture('appdetails-no-achievements'), '10').achievements, 0);
});

test('parseAppDetails treats unavailable apps as unknown', () => {
  assert.deepEqual(parseAppDetails(fixture('appdetails-unavailable'), '999'), {
    ageRestricted: false,
    achievements: null,
  });
});

test('parseAppReviews returns the summary text', () => {
  assert.equal(parseAppReviews(fixture('appreviews-portal2')), 'Overwhelmingly Positive');
});

test('parseAppReviews returns null without reviews', () => {
  assert.equal(parseAppReviews(fixture('appreviews-none')), null);
  assert.equal(parseAppReviews(null), null);
});
