# Pattern detail plan — bring every pattern to the reference level

Source: measured audits of the 37 reference pattern pages vs ours (raw data + per-slug tables in the scratchpad: `audit-1\audit.md`, `audit-2\audit.md`, `audit-3\audit.md`, under `C:\Users\JIVSEH~1\AppData\Local\Temp\claude\0a017eea43eb9414\2a5ff90a-9071-4fcf-9b6d-5e9b25bf7059\scratchpad\`; saved reference HTML in each `ref\` folder — for measuring only, never copy its text/code).
The user's requirement: EVERY pattern (all 92) needs (a) a detailed step-by-step animation and (b) a full "When to Use" part. Read `REFERENCE-VIZ-SPEC.md` (look + frame + how to enrich a pattern) first.

## The bar every pattern must reach (derived from the reference)
When to Use (text, in `src/data/patterns.ts` `BASE_CONTENT`, `src/data/patternContent.ts`, `src/data/packs/p*.ts` `content`, hero copy in `src/data/patternMeta.ts`):
- 5 bullets (4 allowed only if the pattern is truly narrow), 35–55 words each, key phrases in bold (`**…**`), naming concrete sub-problems/signals ("find the k-th …", "sorted array + pair sum"), not generic advice.
- one "key insight" tip box (20–35 words).
- complexity note 30–40 words explaining WHY (reference averages ~36 words; ours ~20).
- hero: emoji, one-line description, 3–4 tag chips, Time/Space pills.
- practice list: 6–8 problems (reference 5–8; ours 3–5), tagged.
Animation (per example, in the problem file):
- one step per meaningful event; ≥ 8 steps for the flagship, no filler; narration 8–25 words with REAL values and a short uppercase prefix (`Step.tag`).
- code line shows the executed line WITH step values (`Step.note`), on ≥ 80% of steps.
- named phase chips with icons and tones (`ProblemDef.phases`) — replace generic "Phase n: …".
- legend row (ours already has one on every page), stat boxes with real values, aux panels where the algorithm has a structure (stack/queue/map/PQ/call stack), alert banner (`Step.alert`) only where something is rejected/pruned/violated.
- the picture shows the structure the reference shows (see gaps below).

## Content mismatches (more important than polish)
- tree-dfs: page must animate pre-order, in-order AND post-order (reference has 3 order tabs, call-stack panel, result row, visit badges, comparison section). Catalog has 144 (inorder) and 94; 145 (postorder) is missing; add it, add pre-order; make them the example tabs.
- tree-bst: needs search + insert + build examples (reference 3 tabs); catalog has 108 build but it isn't listed; 235 (LCA) has only 2 steps.
- two-pointers-opposite: flagship should be the sorted two-sum (LC 167) with L/R pointer cards + running sum box; 167 collapsed to 4 steps — rebuild to ~7+ steps. (Reference quirk: its statement says [2,4] while the animation ends [2,5] — do NOT copy that inconsistency.)
- two-pointers-same: coarser than the reference (no setup steps; no found/advance/write sub-steps); rebuild finer, with an array snapshot + invariant box.
- backtrack-combos / subsets / perms: reference draws a recursion tree + call-stack panel + candidate/used/input row; ours shows a path/results chips only. Add a tree scene (`tree`/`ntree`) beside the array (`split`), a call-stack aux panel, `used[]` row for permutations, "break vs continue" callout for combos.
- bfs-multisource: per-node wavefront with a time counter (reference) vs our per-minute grid — add the per-node view as an example.
- binary-search-classic: compare box (mid vs target) + greyed-out discarded halves; 5 phases with icons.
- bellman-ford: Edge Relaxation table (u→v, w, dist[u]+w, dist[v], update?). prims: "MST edges added" list; PQ entries marked fresh/stale. dijkstra: stale PQ entries marked.
- dp-1d: add a Coin Change tab; state boxes; flagship has only 4 steps → ≥ 8. Slug mismatch: the reference's `dp-2d` ≈ our `dp-two-sequence` (grid DP is our `dp-2d-grid`) — keep our slugs; nothing to rename, but make `dp-two-sequence` carry the same teaching content as the reference's dp-2d page.
- hashing-frequency 5 steps → ~12; linkedlist-fastslow 5 → 8 + "math proof sketch" box (why fast meets slow); greedy-jump 4 → 6+ with a "JUMP #n" toast; prefix-sum: build + range query sum(l,r) example; linkedlist-reversal: 4th stat (iteration) + more hero tags; linkedlist-merge: key-insight box (offset formula) + 7-item legend; heap-topk: key-invariant box; graph-union-find: reference default is LC 547 with rank + path compression — add it as an example; graph-topo-sort: stats.
- stack-simple: verdict banner, TOP badge, match box; stack-monotonic-dec: bars + NGE row + stack + compare box; stack-monotonic-inc: "Area computation" box + "New max" chip.
- (Reference quirk: stack-simple labels "({[]}})" but animates "({[]})" — don't copy.)
- Everything else (the other 54 patterns we added beyond the reference): apply the same bar. They have no reference page; the bar above defines done.

## Universal changes (all 92; most are data/text, a few need the new frame fields)
1. `ProblemDef.phases` with icon + tone for every pattern example problem.
2. `Step.tag` + `Step.note` on ≥ 80% of steps of every example.
3. When-to-Use rewrite to the bar above for all 92 (many of the 54 extras are thinner).
4. Complexity notes ~30–40 words; hero tags 3–4; practice list 6–8.
5. Missing explainer boxes where the reference has them (proof sketch, key invariant, offset formula, comparison section) — add as optional `PatternContent.insight`-style data if the frame agent provides a field, otherwise as the existing tip box.

## Batch plan (≤ 6 agents at once; each owns disjoint files)
Batches are by family; each agent handles the text (When to Use, complexity, hero, practice) AND the example animations (phases/tag/note, plus content mismatches above) for its patterns, and verifies with `npm run typecheck`, the strict check, the fuzz scripts for edited problems, and screenshots (one headless Chrome at a time).
(The lead fills in the batches after the frame agent finishes and the field names are final.)
