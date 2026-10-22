# Steamgifts.com Browser Extension

A Chrome (Manifest V3) extension with quality-of-life improvements for [steamgifts.com](https://www.steamgifts.com). It shows Steam info right in the giveaway list and lets you join giveaways with a single click, without leaving the page.

## Features

- **One-click join.** Every giveaway in the list gets a join button. Clicking it opens the giveaway in a background tab, enters it automatically, and closes the tab once Steamgifts confirms the entry.
- **Steam info badges.** Below each giveaway title the extension shows:
  - the Steam review rating (e.g. *Very Positive*), color-coded green, yellow or red, or *No reviews*
  - the number of achievements, or *No achievements*
  - an *Age restricted* badge for games rated 18+
- **Lazy loading and caching.** Info is only fetched for giveaways near the viewport, with at most 4 concurrent requests to Steam. Results are cached locally for 6 hours.
- **Clean list.** Giveaways you have already entered are hidden, and the site header stays pinned to the top of the page.
- **Helpful feedback.** If a giveaway can't be joined (ended, deleted, restricted, or not confirmed in time), a toast explains why and the tab stays open. If you run out of points, auto-joining stops and every open Steamgifts tab shows a notice.

## Installation

The extension isn't published to a store, so load it unpacked:

1. Clone or download this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the repository folder.

It also works in other Chromium-based browsers such as Edge and Brave.

## Usage

1. Browse giveaways on steamgifts.com as usual. Rating and achievement badges appear under each title as you scroll.
2. Click the green check button on a giveaway to join it. A background tab opens, joins, and closes itself.
3. If you see a "Not enough points" toast, collect more points and click the join buttons again.

Opening a giveaway URL with `?autojoin=true` triggers the same auto-join behavior.

## Permissions

- `https://www.steamgifts.com/*`: content script that adds the buttons and badges.
- `https://store.steampowered.com/*`: fetch game details and reviews from Steam's public JSON APIs.
- `tabs`: open and close the background join tabs and notify open Steamgifts tabs.
- `storage`: cache Steam lookups.

No data is sent anywhere except requests to Steam's public store APIs.

## Development

There is no build step. Edit the files and reload the extension on `chrome://extensions`.

| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest |
| `scripts/content.js` | Injected UI, giveaway list and auto-join logic |
| `styles/content.css` | Styling for injected elements and page tweaks |
| `background.js` | Service worker: tab handling, Steam fetching, throttling, cache |
| `lib/steam.js` | Steam URL building and response parsing |
| `test/` | Parser tests and Steam API fixtures |

Run the tests (requires Node.js 18+):

```bash
npm test
```
