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

## Final report (keep it short)
List: files created; problems/pages completed vs skipped (with reasons); commands you ran and their outcomes (`npm run check`, fuzz script, typecheck for your files, screenshots viewed); any shared-file change you need from the lead.
