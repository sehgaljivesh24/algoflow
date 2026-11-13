# the-only importer

Imports <https://malharchauhan7.github.io/the-only-cheatsheets/> (repo `malharchauhan7/the-only-cheatsheets`, MIT,
"Copyright (c) 2025 Malhar") into AlgoFlow.

It reads the Markdown sources (the site is Jekyll rendering those files), converts them to HTML fragments with
`marked` (GitHub-flavoured), pre-highlights code with highlight.js, sanitizes, and writes:

- `src/content/cheatsheets/the-only/<slug>.html` (18 guides) and `landing.html` (from `README.md`)
- `src/content/cheatsheets/the-only/{meta.json,parity.json,NOTICE.md,LICENSE.txt,third-party/*,img/*}`
- `public/fonts/cheatsheets/the-only/*.woff2` (Architects Daughter, OFL-1.1) and its licence

## Re-run

The npm dependencies live in a scratch folder **outside** the project (never `npm install` in the project):

```powershell
$d = "$env:TEMP\cs-import-the-only"
mkdir $d; cd $d
npm init -y
npm install marked@12 marked-smartypants@1 highlight.js@11 cheerio@1 mdast-util-from-markdown@2 mdast-util-gfm@3 micromark-extension-gfm@3 unist-util-visit@5
cd "<project root>"
node scripts/import-cheatsheets/the-only/import.mjs            # uses cached downloads in the scratch folder
node scripts/import-cheatsheets/the-only/import.mjs --refresh  # re-download everything from GitHub / the live site
```

`CS_IMPORT_DIR` overrides the scratch folder. The run is idempotent and prints a parity report (Markdown AST counts
via micromark+GFM versus counts taken from the generated HTML via cheerio) and exits non-zero on any mismatch.
`node scripts/check-cs-the-only.mts` re-checks the committed output.
