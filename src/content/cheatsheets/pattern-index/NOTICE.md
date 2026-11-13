# Notice - DSA Pattern Index

This folder holds an imported copy of the cheat-sheet **"DSA Pattern Recognition - Cheat-Sheet"**.

- Source: https://roxoi.github.io/dsa-cheatsheet/
- Repository: https://github.com/roxoi/dsa-cheatsheet
- License: **MIT License** (full text in `LICENSE.txt`, copied verbatim from the repository's `LICENSE`)
- Copyright: **Copyright (c) 2026 roxoi**
- Retrieved: 2026-11-13  (index.html sha256 `c18b97d1854a3e1e...`)

## What we changed
The content and look of the original page were kept; only the packaging changed:
- split the single HTML page into one HTML fragment per section (24 sections + the hero), loaded lazily by the viewer;
- sanitised the markup (no scripts, no inline event handlers, no external assets) and removed the inline `onclick` of the copy buttons (the viewer attaches its own handler);
- pre-highlighted the C++ code blocks at import time with highlight.js 11.9.0 (the original highlights them in the browser with the same library and language, version 11.9.0), so no script or CDN is needed;
- scoped the original stylesheet under `.cs-pi` (`:root`, `html`, `body`, `*` rules were mapped onto that wrapper) and added a few small rules (table scroll wrapper, "back to AlgoFlow" link, attribution footer);
- self-hosted the fonts instead of loading them from Google Fonts;
- kept a quirk of the original markup: it contains an unclosed `<code>` element in the first section, so browsers (and our viewer) nest sections 01-23 inside one `<code>` element, which is why most of the page is set in the monospace font;
- re-implemented the page's behaviour (copy buttons, filter box, active-section highlighting, mobile menu, smooth anchor scrolling) in React/TypeScript.

## Third-party assets
| Asset | License | Copyright line (from the asset's own license file) |
|---|---|---|
| Newsreader (font, woff2 files in `public/fonts/cheatsheets/pattern-index/`) | SIL Open Font License 1.1 (`third-party/OFL-Newsreader.txt`) | Copyright 2020 The Newsreader Project Authors (http://github.com/productiontype/Newsreader) |
| IBM Plex Mono (font, woff2 files in `public/fonts/cheatsheets/pattern-index/`) | SIL Open Font License 1.1 (`third-party/OFL-IBMPlexMono.txt`) | Copyright © 2017 IBM Corp. with Reserved Font Name "Plex" |
| highlight.js 11.9.0 (used at import time only; its generated `hljs-*` class names appear in the HTML) | BSD-3-Clause (`third-party/highlightjs-LICENSE.txt`) | Copyright (c) 2006, Ivan Sagalaev. |

Re-run the importer with `node scripts/import-cheatsheets/pattern-index/import.mjs` (see the README next to it).
