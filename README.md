# Youbin He's personal homepage

A static academic homepage published at <https://palestyhr.github.io/>.
The browser loads the HTML, CSS and JavaScript directly; no build step or
runtime dependencies are required.

## Preview locally

Use Python 3 from the repository directory:

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000/> for the homepage and
<http://127.0.0.1:8000/journey.html> for the background story.
Stop the server with `Ctrl+C`.

## Edit content and behavior

| File           | Responsibility                                                           |
| -------------- | ------------------------------------------------------------------------ |
| `index.html`   | Biography, News, education, experience and publications                  |
| `journey.html` | Background story and research beginnings                                 |
| `style.css`    | Theme, component styles, breakpoints and motion preferences              |
| `site.js`      | Greeting, page titles, section entrance, pointer tilt and News scrolling |
| `analytics.js` | Production-only analytics, opt-out and public visitor count              |
| `assets/`      | Portrait, logos, figures, CVs and corner decorations                     |

The stylesheet is grouped by component. Keep a component's responsive and
interaction rules beside its main rules instead of appending overrides at the
end. Shared theme colors live in `:root`.

Add News entries as `<li>` elements in `.news-list`, newest first. Keep the date
in `.news-date` and use links or emphasis for the important information. The
scroll thumb updates when the list or viewport changes. A short list keeps a
visible disabled rail; a long list supports wheel scrolling, dragging, track
clicks and keyboard navigation.

Adjust tilt amplitude and shadow response in `TILT_OPTIONS` in `site.js`.
The current maximum angle is 0.75 degrees. CSS owns transition timing and
hover translation. Reduced-motion and touch preferences are respected.

Keep the shared header, footer and asset versions consistent in both HTML
pages. After changing a shared stylesheet or script, update its `?v=` value in
both pages so browsers request the new version.

## Check changes

Development checks require Node.js 20 or newer and npm:

```sh
npm ci
npx playwright install chromium
npm test
npm run format:check
```

Use `npm run format` to apply the repository formatting settings. These tools
are development dependencies only. The website still runs without Node.js.

The browser tests serve the actual pages over local HTTP and check local
assets, desktop/mobile layouts, navigation, greetings, hover and tilt behavior,
reduced motion, touch input, News scrolling and analytics behavior. Analytics
responses are mocked; tests do not send visits to the production service.

## Analytics

Tracking runs only on `palestyhr.github.io`. Local previews do not record
visits. The public total is fetched independently of tracking and remains
hidden when unavailable or invalid. No account credentials belong in this
repository.

- Open `/#analytics-off` to disable tracking in the current browser.
- Open `/#toggle-goatcounter` to toggle the saved preference.

The preference is stored in local storage. An explicit opt-out still applies
to the current load when browser storage is unavailable.
Open these URLs in a new tab or reload after changing the hash in an existing tab;
the preference command is processed when the page loads.

## Publish and restore

Commit and push the reviewed changes to `main`. GitHub Pages publishes the
repository root; `.nojekyll` keeps it a plain static site. Wait for the Pages
build to finish, then confirm both page URLs load the updated asset versions.

Before a broad refactor, copy the complete checkout, including `.git`, to a
backup directory outside the repository. A published change can be undone
with a normal `git revert` commit and push, without rewriting branch history.
Keep temporary screenshots, comparison reports and backup archives outside
the website repository.
