# AlgoFlow — contributor guide (for the parallel build agents)

AlgoFlow is a React + Vite + TypeScript app that teaches DSA through step-by-step animations, patterns, and study aids.
Background research on the reference product is in `NOTES-dsaanimator-teardown.md` (read §3 catalog, §4 patterns, §5 page anatomy).

## Hard rules
1. **Own words, own code.** The reference site (dsaanimator.com) is a feature reference only. Never copy its text, code, CSS, or wording; never fetch its pages to copy from them. Write all explanations, tips, questions and code yourself.
2. **Stay in your lane.** Only create/edit the files your assignment says you own (table below). Never edit shared files: `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/engine/*`, `src/components/*`, `src/pages/ProblemPage.tsx`, `src/pages/Library.tsx`, `src/pages/PatternPages.tsx`, `src/data/catalog.ts`, `src/data/patterns.ts`, `src/problems/registry.ts`, `scripts/check.mts`, `package.json`, `tsconfig.json` — **unless your assignment explicitly lists it**. If you believe a shared file needs a change (a catalog typo, a missing scene kind), do NOT edit it; describe the needed change in your final report.
3. **No git, no `npm install`, no `npm run build`/`vite build`** (several agents share one folder; builds clobber `dist/`). Use `npm run typecheck`, `npm run check`, and `node` scripts only.
4. Other agents are editing other files at the same time. If `npm run typecheck` shows errors in files you don't own, ignore them (filter to your files) — don't fix them.
5. Code must be correct. Every animation's final answer must equal a plain reference solution on random inputs (see Testing).

## Architecture in one minute
- A problem is a pure function: `ProblemDef.buildSteps(input) -> Step[]`. The UI just renders `steps[i]`; Prev/Next/scrub/speed are free. See `src/engine/types.ts` (read it fully: `Step`, `Scene`, `Cell`, `Pointer`, `Aux`, `ProblemDef`).
- Visual kinds available now:
  - **Array / bars** (shorthand `cells` + `pointers` on the Step, `viz: 'bars'` for bar heights). Example: `src/problems/binarySearch.ts`, `containerWithMostWater.ts`.
  - **Linked list** (`scene: {kind:'list', nodes, pointers}`; `next` may point backwards so reversals and cycles draw as arcs). Example: `reverseLinkedList.ts`.
  - **Binary tree** (`scene: {kind:'tree', nodes, root, states, labels}`; `buildTree(tokens)` is exported from `maxDepth.ts` — import with `./maxDepth.ts`). Example: `maxDepth.ts`.
  - **Grid / table** (`scene: {kind:'grid', rows: Cell[][], rowHeads, colHeads}`; use it for matrices and 2-D DP tables; `Cell.tone` colours groups). Example: `numberOfIslands.ts`.
  - **Aux panels** (`aux: [{title, kind:'stack'|'queue'|'map'|'list', items, highlight}]`) next to any scene — call stacks, queues, hash maps, result arrays. Examples: `twoSum.ts`, `validParentheses.ts`, `dailyTemperatures.ts`.
  - Cell states: `compare | swap | sorted | active | found | dim | error`. Pointer tones: `blue orange green purple yellow red`.
- A **catalog entry** already exists for every problem (`src/data/catalog.ts`). Your `ProblemDef.slug` must equal the catalog slug: `"<id lowercased>-<slugified title>"` (e.g. `#146 LRU Cache` -> `146-lru-cache`; `GFG Minimum Platforms` -> `gfg-minimum-platforms`). Your `difficulty` and `category` must equal the catalog entry's (the check enforces it). The catalog title is authoritative.
- Register a problem by importing it (**with the `.ts` extension**) in **your group file** under `src/problems/groups/` and adding it to that array. Do not touch `registry.ts`.
- **Lazy loading:** the browser never imports `registry.ts`; it uses `src/problems/manifest.ts` (generated slug -> dynamic import, via `src/problems/lazy.ts` / `useProblem.ts`) so each animation is its own chunk. After adding a problem, run `node scripts/gen-manifest.mts` (`npm run check` fails with "manifest lists exactly the registry slugs" if it is stale). Node scripts keep importing `registry.ts` directly.

## Writing a good ProblemDef (all enforced by `npm run check`)
- `examples`: at least 2 (3 is better), each `{label, input, output}`; `inputPlaceholder` shows the custom-input format; `parseInput(raw)` must **throw `Error` with a friendly message** on bad input and **cap sizes** so the animation stays readable (arrays ≤ 12, grids ≤ 7×9, trees ≤ 12 nodes). Validate every precondition your algorithm relies on (sorted, positive, in range…).
- `buildSteps`: run the real algorithm once while pushing a snapshot per meaningful event (typically 8–60 steps; hard limit 400). Never mutate a previously pushed step's data (copy arrays when snapshotting). Same input -> identical steps.
- Every step needs: `title`, `desc`, `logic` (the "why"), `logicTone`, `javaLines`, `pyLines` (0-based indexes into `java[]` / `python[]`), `algoStep` (index into `algorithm[]`), `vars` covering **every** entry of `varLabels`, and a scene (`cells`+`pointers`, or `scene`). Pointer `index` is the position in that scene's cell/node order. The **final step carries `result`** (`{title, text}`).
- Code: provide idiomatic, runnable-looking Java **and** Python (plain strings, one per line, no HTML). Highlight the lines that the step is executing.
- `legend` explains every cell state you use; `approach`, `algorithm` (3–6 plain-English steps), `complexity`, and `why` (a real invariant/argument, not filler) are required. `statement` should paraphrase the problem in your own words with the key constraints.
- Keep files self-contained and ~80–200 lines; export one named const per problem (`export const lruCache: ProblemDef<In> = {...}`). Non-type imports need the `.ts` extension (`import { buildTree } from './maxDepth.ts'`); type imports use `import type { … } from '../engine/types.ts'`.
- File name: camelCase of the problem, e.g. `src/problems/threeSum.ts`. If your problem is a variant that could clash, make the name specific.

## Testing (required)
1. `npm run check` — structure of every registered problem (use `CHECK_ONLY=<slug-part> npm run check` while iterating).
2. `npm run typecheck` — look only at errors in files you own.
3. **Fuzz for correctness**: write `scripts/fuzz-<yourgroup>.mts` that, for each of your problems, generates ~200 random valid inputs, runs `buildSteps`, and compares the final `result` with a straightforward reference implementation (brute force where possible). Import problems directly: `import { x } from '../src/problems/x.ts'`. Run with `node scripts/fuzz-<yourgroup>.mts`; it must exit 0. Keep these scripts in the repo.
4. (Strongly recommended) one visual check per *kind* of scene you use:
   - Serve: `Start-Process npx.cmd -ArgumentList 'vite','--port','<YOUR_PORT>','--strictPort' -WindowStyle Hidden` (wait ~6 s; use the port from your assignment; stop it when done).
   - Shoot: `chrome.exe --headless=new --disable-gpu --no-sandbox --no-first-run --user-data-dir=<fresh temp dir> --hide-scrollbars --window-size=1400,1300 --virtual-time-budget=6000 --screenshot=<file.png> "http://localhost:<port>/problem/<slug>?step=8"` with `chrome.exe` at `C:\Program Files\Google\Chrome\Application\chrome.exe`; the process returns immediately, so poll for the file. Then read the PNG. `?step=N` opens the animation paused at step N (1-based).
   - Look for: clipped text, overlapping pointers, unreadable colours, empty visuals, wrong highlighted lines.
   - Put screenshots under your scratchpad/temp dir, not in the project.
5. **Server-side render smoke test**: `node scripts/smoke-ssr.mts` (about 30-60 s, no port, no browser). Options: `ONLY=<slug,slug>` (pattern/problem slugs; skips the fixed pages), `FAST=1` (flagship example only), `VERBOSE=1`, `DUMP=<route substring>` (prints the markup).
   - How: Vite in middleware mode loads `scripts/smoke/entry.tsx`; every route renders with `react-dom/server` in a `StaticRouter` (about 4,200 renders: fixed pages, every pattern x example tab x first/middle/last step via `?ex=&step=`, every problem x example x first/middle/last step). Three in-memory Vite patches (never written to disk) make the server render reflect state that the real page sets in effects: `useProblem` returns the preloaded problem, `useStepPlayer` starts at `globalThis.__SMOKE_STEP`, `ProblemPage` starts at example `__SMOKE_EX`. They throw when their target text changes, so update the patch after refactoring those hooks.
   - Catches: a component that throws, any `console.error`/`console.warn` from React (missing keys, invalid DOM nesting ...), empty pages, `NaN` / `undefined` / `[object Object]` / `null null` / `Infinity` in markup or attributes (code panels and `<pre>` skipped; per-route allowances live in `ALLOW`), duplicate ids, dangling `aria-*` references, dead internal links, wrong deep-link step, missing phase-chip row / narration bar / stat boxes, a code panel whose numbered lines differ from `problem.java.length`, a missing result card or Done chip on the last step, an example tab that silently disappeared because its problem is not animated.
   - Whitelisted output: `useLayoutEffect does nothing on the server`, anything about hydration, Node's own `localStorage` ExperimentalWarning.
   - Cannot catch: real layout and overflow, CSS (it is not parsed or applied), anything done in effects (keyboard shortcuts, auto-play, the window-frame overlay measured from the DOM, scroll and focus), browser APIs, animation timing and CSS transitions, the lazily fetched HTML of the imported cheatsheet viewers (those routes only prove the shell renders), theme switching. Keep step 4 for visual work.

## Ownership
| Agent | Owns (create/edit) |
|---|---|
| arrays-1 | `src/problems/groups/arrays1.ts`, its problem files, `scripts/fuzz-arrays1.mts` |
| arrays-2 + strings | `src/problems/groups/arrays2strings.ts`, its problem files, `scripts/fuzz-arrays2strings.mts` |
| matrix / stack / queue / greedy | `src/problems/groups/matrixstackqueue.ts`, problem files, `scripts/fuzz-matrixstackqueue.mts` |
| binary search / sorting / bits | `src/problems/groups/searchsortbits.ts`, problem files, `scripts/fuzz-searchsortbits.mts` |
| linked list / design / heap | `src/problems/groups/listheap.ts`, problem files, `scripts/fuzz-listheap.mts` |
| trees | `src/problems/groups/trees.ts`, problem files, `scripts/fuzz-trees.mts` |
| backtracking / DP | `src/problems/groups/backtrackdp.ts`, problem files, `scripts/fuzz-backtrackdp.mts` |
| visuals + graph / intervals / trie | `src/problems/groups/graphs.ts`, problem files, `src/engine/types.ts` (add scene kinds only), `src/components/SceneView.tsx` and new files in `src/components/`, `src/styles-visuals.css`, `scripts/check-scenes.mts`, `scripts/fuzz-graphs.mts` |
| patterns + quiz | `src/data/patternContent.ts`, `src/data/quiz.ts`, `src/pages/Quiz.tsx`, `src/styles-quiz.css`, `scripts/fuzz-patterns.mts` (optional) |
| Java cheatsheet | `src/data/cheatsheet.ts`, `src/pages/Cheatsheet.tsx`, `src/styles-cheatsheet.css` |
| edge cases | `src/data/edgeCases.ts`, `src/pages/EdgeCases.tsx`, `src/styles-edge.css` |

Only the visuals agent adds new scene kinds. If you need something the existing scenes cannot show (a graph, interval bars, a multi-way trie), **skip that problem**, list it in your report, and continue.

## Style
Match the existing look: use CSS variables from `src/styles.css` (`--bg --bg2 --bg3 --border --text --muted --blue --cyan --green --yellow --orange --red --purple` and `*-bg` tints) so both dark and light themes work. Reuse existing classes (`card pad`, `card-title`, `badge`, `chip-btn`, `seg`, `btn`, `mono`, `muted`, `small`). New CSS goes only in your own `styles-*.css`. Headings: sentence case. Fonts: no external imports. Keep pages usable at phone width and keyboard-accessible.

## SEO: page titles, descriptions and share previews
The app is a single-page app, so search engines and link previews (Slack, WhatsApp, X) only see the HTML the host sends. Three pieces make every URL describe itself:
- **`src/seo/meta.ts`** — pure `metaFor(pathname, search?, { statementOf? })` -> `{ title, description, canonical, ogType, image, noindex? }` for every route (library, patterns index + 92 patterns, 354 problems, cheatsheets + guides, quiz, edge cases, unknown = noindex). Titles are <= 60 characters and descriptions <= 160, unique per page. Text comes from the data (pattern card + `PATTERN_META` hero line + complexity; catalog title/difficulty/id + the problem's `statement`; cheatsheet `meta.json`). New pattern/problem/guide pages are picked up automatically; to change wording edit `meta.ts`. `allRoutes()` lists every indexable path.
- **`src/seo/useRouteMeta.ts`** — hook mounted once in `App.tsx`; on every navigation it sets `document.title`, description, canonical, `og:*` and `twitter:*` tags. Do not set titles in individual pages (the three imported cheatsheet viewers still do; their titles win once they have loaded).
- **`scripts/vite-seo-plugin.mts`** (used by `vite.config.ts`, `vite build` only) — after the bundle is written, copies the built `index.html` to `dist/<route>/index.html` for every route with that route's head tags, and writes `dist/sitemap.xml` and `dist/robots.txt`. Vercel/Netlify serve existing files before the "everything -> /index.html" rewrite, so `/patterns/kadane` returns its own tags while unknown paths still reach the app. Per-route files load the same absolute `/assets/...` files.
- **Site URL.** Canonical, `og:url`, `og:image` and the sitemap need an absolute URL. Set **`SITE_URL`** (for example `https://algoflow.app`, no path) in the host: Vercel -> Project Settings -> Environment Variables -> `SITE_URL`, then redeploy. Resolution order at build: `SITE_URL`, `VITE_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL` (a bare host gets `https://`), else the placeholder `https://algoflow.example` (`src/seo/siteUrl.ts`; the build prints a warning). The browser reads it as `SITE_URL` from `src/config.ts`; while it is the placeholder the hook uses `location.origin`.
- **Share image** `public/og-default.png` (1200x630, < 200 KB) and `public/favicon.svg`. `index.html` holds default tags, the plugin replaces them per route.
- **Check:** `node scripts/check-seo.mts` validates `metaFor` for all routes (lengths, uniqueness, no `undefined`/`NaN`) and, when a build exists, `dist/<route>/index.html`, the sitemap and robots (`SEO_REQUIRE_DIST=1` makes a missing build fail). Run it after `npm run build`.

## Final report (keep it short)
List: files created; problems/pages completed vs skipped (with reasons); commands you ran and their outcomes (`npm run check`, fuzz script, typecheck for your files, screenshots viewed); any shared-file change you need from the lead.
