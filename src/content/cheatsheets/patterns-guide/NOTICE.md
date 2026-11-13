# Notice — "Complete DSA Patterns Reference Guide"

- Source: https://thetorangi.github.io/DSA-cheat-sheet/
- Repository: https://github.com/thetorangi/DSA-cheat-sheet
- License: MIT License (full text in `LICENSE.txt`, saved verbatim from the repository)
- Copyright (c) 2025 K A R M A ☯️
- Retrieved: 2026-11-13

## What we changed

- Imported the single `index.html` page: the content (50 pattern rows in two tables, the complexity table, the Pattern
  Selection Guide, the Study Plan Recommendations, 92 LeetCode links) is kept as written, split into
  HTML fragments that are loaded lazily by the React page `src/pages/cheatsheets/PatternsGuidePage.tsx`.
- Sanitized the HTML at import time (no scripts, inline event handlers, `javascript:` URLs, iframes, objects, embeds or
  external link/script/img elements).
- The original `<style>` is kept (`original.scoped.css`) with every selector scoped under `.cs-pg` so it cannot leak into the
  rest of AlgoFlow; the page's `body` margin became wrapper padding. A small hand-written stylesheet
  (`src/styles-cs-patterns-guide.css`) adds the responsive table wrappers, a print stylesheet and the items below.
- The "Download as PDF" button does what the original does (`window.print()`), reimplemented in React with no CDN or library;
  a print stylesheet hides the button and the navigation link and keeps the table colours.
- The original's click-to-highlight behaviour on table rows (a row toggles a yellow background) is re-implemented in React.
- Tables scroll horizontally inside their own wrapper on narrow screens.
- Added (not part of the original): a small "▶ viz" chip after each example problem whose LeetCode number matches an
  animated AlgoFlow problem (52 of the 92 links at import time); it links internally to `/problem/<slug>`.
  The original link text and href are untouched. Also added: a "← AlgoFlow" link and an attribution footer.

## Third-party assets

None. The page uses system fonts ('Segoe UI', Tahoma, Geneva, Verdana, sans-serif) and ships no images, fonts or libraries.
