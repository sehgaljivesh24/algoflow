# patterns-guide importer

Imports <https://thetorangi.github.io/DSA-cheat-sheet/> (MIT, "Copyright (c) 2025 K A R M A") into
`src/content/cheatsheets/patterns-guide/` (HTML fragments, `meta.json`, `NOTICE.md`, `LICENSE.txt`,
`original.scoped.css`).

Re-run (the dependencies live OUTSIDE the project, in a scratch folder; never `npm install` in the project):

```
set CS_IMPORT_DIR=%TEMP%\cs-import-patterns-guide      (default: <os tmp>/cs-import-patterns-guide)
mkdir %CS_IMPORT_DIR% && cd %CS_IMPORT_DIR% && npm init -y && npm install cheerio postcss
cd <project root>
node scripts/import-cheatsheets/patterns-guide/import.mjs
node scripts/check-cs-patterns-guide.mts
```

The importer downloads `index.html` and `LICENSE` from GitHub raw (falls back to a cached copy in the scratch
folder), parses with cheerio/parse5, sanitizes (no scripts, no `on*` handlers, no `javascript:` URLs, no
iframes/objects/embeds, no external link/script/img), splits the page into lazily loaded fragments, scopes the
original `<style>` under `.cs-pg` with postcss, and prints a source-vs-imported parity report. It is idempotent.
