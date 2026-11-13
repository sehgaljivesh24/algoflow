# pattern-index importer

Imports https://roxoi.github.io/dsa-cheatsheet/ (repo `roxoi/dsa-cheatsheet`, MIT, "Copyright (c) 2026 roxoi") into AlgoFlow at `/cheatsheets/pattern-index`.

## Re-run
1. Dependencies live outside the project (never `npm install` in the project):
   ```
   mkdir %TEMP%\cs-import-pattern-index && cd %TEMP%\cs-import-pattern-index
   npm init -y
   npm install cheerio highlight.js@11.9.0 postcss postcss-selector-parser
   ```
   (override the folder with the `CS_IMPORT_DEPS` environment variable).
2. From the project root: `node scripts/import-cheatsheets/pattern-index/import.mjs` (add `--offline` to reuse the downloads cached in the scratch folder, `--date YYYY-MM-DD` to pin the retrieval date).
3. `node scripts/check-cs-pattern-index.mts` verifies the result.

## What it writes
- `src/content/cheatsheets/pattern-index/`: one sanitised, pre-highlighted HTML fragment per section (`<id>.html`), `hero.html`, `meta.json`, `NOTICE.md`, `LICENSE.txt`, `third-party/` licence texts.
- `public/fonts/cheatsheets/pattern-index/`: self-hosted woff2 files (Newsreader, IBM Plex Mono) and their OFL texts.
- `src/styles-cs-pattern-index.css`: the original stylesheet scoped under `.cs-pi`, followed by `extra.css` (our additions).
- `parity-report.txt` (this folder): source vs imported counts; the importer exits non-zero on any mismatch.

`section-heights.json` holds the measured rendered height of each section of the original; the viewer reserves that space until a section's HTML has loaded.
