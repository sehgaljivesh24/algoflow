# The Only Cheatsheets — import notice

- **Source:** https://malharchauhan7.github.io/the-only-cheatsheets/
- **Repository:** https://github.com/malharchauhan7/the-only-cheatsheets
- **License:** MIT License (full text in `LICENSE.txt`, copied verbatim from the repository)
- **Copyright:** Copyright (c) 2025 Malhar
- **Retrieved:** 2026-11-13

## What was imported

The site is a Jekyll site (GitHub "Architect" theme) rendering Markdown. The Markdown sources of the landing page
(`README.md`) and of the 18 guides (`core-guides/programming-prerequisites.md`, `core-guides/developer-guide-framework.md`, `web-development/frontend-development.md`, `web-development/javascript.md`, `web-development/typescript.md`, `web-development/reactjs.md`, `web-development/nextjs.md`, `web-development/tailwindcss.md`, `web-development/backend-development.md`, `web-development/api-development.md`, `dsa/data-structure-algorithms.md`, `dsa/basic-dsa-questions.md`, `dsa/dsa-patterns.md`, `dbms/dbms-interview-questions.md`, `dbms/sql-postgresql-cheatsheet.md`, `system-design/system-design.md`, `git-github/git-github-cheatsheet.md`, `aptitude/aptitude-guide.md`) were fetched from
`https://raw.githubusercontent.com/malharchauhan7/the-only-cheatsheets/main/` and converted into the HTML fragments in this folder. Nothing under `downloads/` (PDF/PNG/HTML exports) was
copied; the "Download PDF" links point to the upstream files on GitHub instead.

## What we changed

- Converted the Markdown to HTML fragments with a GitHub-flavoured Markdown engine (`marked`), with heading ids
  generated the way the original Jekyll/kramdown site generates them so every in-page Table of Contents link works.
- Pre-highlighted fenced code at import time with highlight.js 11.12.0 (the original used Jekyll's Rouge) and
  mapped the token colours to the original theme's code colours; no highlighter runs in the browser.
- Sanitized the output (no scripts, inline event handlers, `javascript:` URLs, iframes/objects/embeds, remote images or
  stylesheets). The README's two dynamic badge images (shields.io stars, komarev visitor counter) were not fetched: the
  stars badge is a static local look-alike without a count and the visitor counter was dropped.
- "Download PDF" links (Google-Drive short links) were replaced by links to the upstream PDF file on GitHub.
- Landing-page links to `/<dir>/<guide>.md` were rewritten to AlgoFlow's `/cheatsheets/the-only/<slug>` routes; `CONTRIBUTING.md` and
  `LICENSE` links point at the upstream repository.
- Task-list items (`- [ ]`) are rendered as disabled checkboxes (kramdown shows the literal brackets).
- Scoped the theme's CSS under `.cs-to`, self-hosted the font, added copy buttons, a guide navigation menu and the
  "back to AlgoFlow" link and attribution footer, and made tables scroll sideways on narrow screens.
- Static images used by the theme (header, body and sidebar backgrounds, GitHub and download button graphics) and the
  README's owl image were downloaded once and are served locally from `public/fonts/cheatsheets/the-only/img/`.

## Third-party assets

- **Architects Daughter** (font, two woff2 subsets served from `public/fonts/cheatsheets/the-only/`) — SIL Open Font
  License 1.1, Copyright (c) 2010, Kimberly Geswein (kimberlygeswein.com). License: `third-party/OFL-ArchitectsDaughter.txt`.
- **GitHub "Architect" Jekyll theme** (pages-themes/architect — layout, colours and the five background/button images) —
  CC0 1.0 Universal. License: `third-party/Architect-theme-CC0.txt`.
- **normalize.css v3.0.2** (included in the theme's stylesheet; the relevant rules were carried into our scoped CSS) — MIT,
  Copyright (c) Nicolas Gallagher and Jonathan Neal. License: `third-party/normalize.css-MIT.txt`.
- **highlight.js 11.12.0** (used only at import time to pre-highlight code) — BSD-3-Clause, Copyright (c) 2006,
  Ivan Sagalaev. License: `third-party/highlight.js-BSD-3-Clause.txt`.
