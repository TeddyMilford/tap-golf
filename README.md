# Tap Golf

A simple, single-player golf scorecard for GitHub Pages. No dependencies, account, backend, analytics, or third-party requests.

## Use it

1. Choose **9 holes** or **18 holes**. The round starts on hole 1.
2. **Par?** shows 3, 4, 5, 6 in a large two-by-two grid. Tap once.
3. **Score?** shows a phone-style numpad: 1–3, 4–6, 7–9, then 0. Tap a single-digit score. The hole is saved and the next hole opens automatically.
4. See your total after 9 holes. An 18-hole round moves straight to hole 10 and quietly displays your front-nine total. At the end, see front-nine, back-nine, and overall totals.

Two taps per hole for scores 1–9. No save button, number-picker popup, scrolling, or halfway confirmation. For scores 10–99, tap the small **10+** key, then the two digits; the second digit saves and advances automatically. **⌫** clears the first digit. Zero alone is disabled because a played hole requires at least one stroke.

The current hole fills the top of the screen with a giant number, with **Hole** above and **of 18** below. The par buttons and score numpad sit toward the bottom for easier thumb reach, with room for the phone's safe area. Tap the hole heading to open the scorecard, then tap a played hole to edit it. Choose its par and score again; the app returns to your current hole. On the score screen, the small **Par number** below the grid returns to the par screen. **New round** lives inside the scorecard and requires confirmation. The app keeps one round at a time.

## Preview locally

Requires Node.js 22 or later. No install step needed.

```sh
npm start
```

Open <http://127.0.0.1:4173>. Open <http://127.0.0.1:4173/golf_score/> to check hosting under a repository path. The basic scorecard can also be opened directly from `index.html`; offline caching requires HTTPS or localhost.

During development, **Full reset** appears below the app. It immediately clears this app's saved round and all in-memory entry/editing state, closes dialogs, and returns to the 9/18-hole choice, so you can test the flow again. It keeps the app's offline cache. The button appears on localhost and when opening the file directly; use `?dev=1` to enable it elsewhere. It is hidden on the normal hosted page.

```sh
npm test
npm run check
```

## Host on GitHub Pages

1. Put these files in a GitHub repository and push to its `main` branch.
2. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source.
3. Run the included **Deploy Tap Golf to GitHub Pages** workflow, or push a change to `main`.

The workflow tests the scoring logic and publishes only the seven public app files and `.nojekyll`. All assets use relative paths, so both `https://USERNAME.github.io/REPOSITORY/` and a custom domain work. If your default branch is different, update `branches` in `.github/workflows/pages.yml`.

Alternatively, use **Deploy from a branch**, with the repository root as the source. No compilation is needed.

## Local saving and privacy

The scorecard is automatically saved after every selection in this browser's local storage. Reloading or reopening restores the current hole; if you already chose par, it resumes on **Score?**. Existing saved rounds from the earlier interface are preserved. Tabs on the same origin update when the scorecard changes. Scores are never sent to a server. Browser data is validated before use, and a Content Security Policy restricts scripts and network requests to the app's own origin.

After the first successful online load on HTTPS or localhost, a service worker caches the app for offline reopening. Keep the same browser and site address. No connection is needed to enter scores. When available, you can add the site to your phone's home screen.

Browser storage is not encrypted or a backup: anyone using the same device/browser can see the round. Clearing site data, private browsing, changing devices or site addresses, or a browser evicting data can remove it. If storage is unavailable, the app shows a warning and continues in memory. No personal information is requested.

Scorecard keys include the app's directory path, so separate GitHub Pages projects have separate rounds. Other pages on the same origin can technically read browser storage; it is suitable for golf scores, not secrets. Offline caches are isolated by service worker scope. If changing the cached asset list or cache strategy, bump the cache version in `sw.js`.
