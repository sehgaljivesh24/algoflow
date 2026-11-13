# Pattern animation — reference spec (from dsaanimator.com screenshots)

The user supplied screenshots of two reference pattern animations. Our pattern pages (`/patterns/<slug>`, one shared component `src/components/pattern/PatternAnimation.tsx`, styles `src/styles-patterns.css`) must reach this level of detail and look, for ALL 92 patterns. Do NOT copy the reference's text, JS or CSS; reproduce the look and the information design in our own code and wording.

Screenshots (view them with the Read tool; they are the ground truth):
- Fixed Sliding Window (LC #643, nums=[2,1,5,1,3,2], k=3, 8 steps): `C:\Users\JIVSEH~1\AppData\Local\Temp\claude\0a017eea43eb9414\2a5ff90a-9071-4fcf-9b6d-5e9b25bf7059\images\1.png` … `7.png` (steps 2–8).
- Dynamic Sliding Window (LC #3, s="pwwkew", 17 steps): same folder, `8.png` … `20.png` (steps 1–13 are shown; step 6 and 7 show the warning banner).

## Elements, top to bottom (both references)
1. Heading: tiny uppercase letter-spaced "▶ LIVE ANIMATION · <PATTERN NAME> · LC #n", coloured by the pattern's ACCENT (fixed window = cyan, dynamic window = purple). The accent also colours the big Play button, bold words in the problem text, the `Input:`/`Answer:` labels, stat values and the code-line bar.
2. "Problem" card with the statement (key terms bold in the accent colour) and `Input: … · Answer: …` with concrete values (e.g. `s = "pwwkew" · Answer: 3 (substring "wke", indices 2–4)`).
3. Controls: large filled accent Play, then Prev / Next / Reset, speed select, `Step i / N` at the right. Thin progress bar under it (accent → blue gradient).
4. Phase chips, uppercase with an icon: e.g. `🔨 Phase 1: Build (i = 0 → k-1)`, `🪟 Phase 2: Slide (i = k → n-1)`, `✅ Done` (fixed window) and `➡ EXPAND (R →)`, `⬅ SHRINK (← L)`, `★ UPDATE best`, `✅ Done` (dynamic). Only the active chip is highlighted and each chip type has its own colour (expand = green, shrink = orange/red, update = gold, build = blue, slide = cyan, done = green).
5. Legend row (dynamic window): coloured dots with labels: `● R entering (expand)` green, `● L leaving (shrink)` orange, `● Window contents` accent, `● Best window` gold. Same idea for other patterns: a one-line legend of what each colour means.
6. Warning banner (only on special steps, above the array): `⚠ Duplicate detected! Must shrink from left until window is valid again.` in a red/orange tinted box. Generic: an optional per-step alert line.
7. Caption line in mono, muted: `nums = [2, 1, 5, 1, 3, 2]   k = 3` / `s = "p w w k e w"` (variable name = values, letters spaced out for strings).
8. The picture. Arrays: big rounded-square cells (~72 px), index number ABOVE each cell (small, muted); pointers UNDER the cells as coloured triangles: `L` blue, `R` orange (fixed window shows letter labels; dynamic window shows ▲ with the index number under it, L blue and R green); when two pointers coincide one merged purple label `L=R`. A window frame (rounded outline, accent coloured, soft glow) around the window cells with a small centred label `k=3` on top. Cell colours: window cells = faint accent tint; entering cell (right edge) = green fill/outline; leaving/evicted cell = orange fill/outline; best/final window = gold outlines. No lifting/hovering of cells.
9. Stat boxes (mono, `name = value`, value in accent colour, `—` when unset): fixed window `windowSum`, `maxSum`, `window = [0..1]`; dynamic window `L`, `R`, `len`, `result`.
10. Aux panel with an uppercase muted title, e.g. `WINDOW CONTENTS (CHAR → COUNT)` containing chips `'p' ×1`; a chip that violates the rule (count 2) is highlighted orange/red. Generic: our existing `aux` panels (stack / queue / map / list) restyled the same way.
11. Narration bar with a coloured 3 px left border and an uppercase prefix: `EXPAND: add s[2]='w' → count=2 ⚠ DUPLICATE! Shrink from left.` (orange border when it flags a problem), `SHRINK: remove s[0]='p' → L moves to 1 · still dup` (orange), `UPDATE: len=3 → 🏆 NEW BEST! result = 3 (window "wke")` (gold), `EXPAND: add s[3]='k' → window [L=2, R=3]` (green), `BUILDING — add nums[0] = 2 → windowSum = 2` (blue), `SLIDING — +nums[3](1) −nums[0](2) → windowSum = 7 maxSum = 8` (cyan), `Done! maxSum = 9 (best window [2..4] = [5, 1, 3])` (green). Every narration cites the actual values at that step.
12. Code-line bar: mono, accent coloured, `▶` prefix, the line being executed WITH the concrete values after a comment: `▶ windowSum += nums[3] - nums[0]; // 8+1-2 = 7`, `▶ window.merge(s.charAt(2), 1, Integer::sum); // 'w' count = 2`, `▶ result = Math.max(result, right - left + 1); // = 3`.

## Step model
- One step per meaningful event, no filler: fixed window = 1 start + k build steps + (n−k) slide steps + 1 done (n=6,k=3 → 8). Dynamic window = one step per expand / shrink / update (17 for "pwwkew").
- A step's narration, stats, code line and highlighted cells must all describe the same moment.

## What exists already vs. what must be added (see the exploration notes in the conversation)
Exists in `PatternAnimation.tsx`: heading, problem card, controls, progress, phase chips (4 plain), caption (example label), SceneView + window overlay (only for `slug.startsWith('sliding-window')`), stat boxes, narration (`title — desc`), code bar (one raw Java line).
To add (all optional/additive fields; every current problem must keep working unchanged):
- Per-pattern ACCENT colour.
- Index labels above cells and pointers under cells (uppercase, merged `L=R`) — scoped to pattern pages (opt-in prop / `.pp-picture` scope), NOT changing the full problem page.
- Cells in the window do not lift.
- Phase chips with icon + tone per phase, e.g. optional `ProblemDef.phases?: { icon: string; label: string; tone: 'blue'|'cyan'|'green'|'orange'|'gold' }[]` (falls back to `algorithm`).
- Legend row (the `ProblemDef.legend` array already exists — render it on the pattern page).
- Optional `Step.alert?: string` banner; optional `Step.tag?: string` (uppercase narration prefix) and `Step.note?: string` (comment appended to the code line); optional caption `ProblemDef.vizCaption` (already exists) used for the caption line.
- Aux panel restyle (uppercase title, chips, optional per-item `bad` highlight if feasible).
- Narration and code bar use the new fields when present, fall back to current behaviour otherwise.
- Data pass per pattern (flagship example first): captions, phase list, narration with real values, code comments. 59 of 92 patterns draw grids/trees/graphs/lists instead of arrays; they get the same frame, and only the array-specific parts (index above, pointers under, window frame) are array-only.

## How to enrich a pattern
The shared frame is done (`PatternAnimation.tsx`, `styles-patterns.css`, `ArrayViz layout="pattern"`). To bring one pattern up to the reference, edit only its flagship problem file (the `examples[0]` input is what the page animates); every field below is optional and falls back to the old look.
- `examples[0]`: put the example you want to show first; `answer?: string` is the text after `Answer:` (keep `output` equal to the final `result.title`, the fuzz scripts compare it). The `Input:` line and the caption are derived from the input object (`nums = [..], k = 3`; strings are quoted, letters spaced in the caption); set `vizCaption` only to override the caption.
- `statement` + `emphasis?: string[]`: key terms printed bold in the accent colour; input field names (`nums`, `k`, `s`) are bolded automatically.
- `phases?: {icon, label, tone}[]` (same length as `algorithm`; tones blue/cyan/green/orange/gold; include a final `✅ Done`). `Step.algoStep` picks the lit chip (the final step points at Done; nothing is lit on step 1). Without `phases` the chips come from `algorithm`.
- `legend`: states used by the cells; on window patterns active = accent, compare = green (entering), swap = orange (leaving), error = orange, found = gold (best).
- Per step: `tag` (`EXPAND:`; a tag ending in a symbol such as `BUILDING —` or `✅ Done!` is shown as written) + `desc` with the concrete values (the bar shows `TAG desc`; without a tag it shows `title — desc`); `note` = values appended to the executed code line (`// 8 + 1 − 2 = 7`, `javaLines[0]` is the line shown); `alert` = warning banner above the picture and orange window frame; `logicTone` colours the bar (`warn` orange, `success` gold = new best, otherwise the phase colour; final = green).
- Pointers: `id` `l`/`r` (or `lo`/`hi` on binary search) frame the window; labels are drawn under the cells (single letters upper-cased, several on one cell merge to `L=R`, identical labels collapse to one). Use `Aux.bad` for items that break the rule and items like `'p' ×2` for counts.
- Accent colour per family/pattern: `src/data/patternAccent.ts`.

```ts
phases: [{ icon: '🔨', label: 'Phase 1: Build', tone: 'blue' }, { icon: '🪟', label: 'Phase 2: Slide', tone: 'cyan' }, { icon: '✅', label: 'Done', tone: 'green' }],
// inside buildSteps, per event:
steps.push({
  title: 'Slide', tag: 'SLIDING —', desc: `+nums[${i}](${nums[i]}) −nums[${i - k}](${out}) → windowSum = ${sum}`,
  cells, pointers: [{ id: 'l', label: 'L', index: i - k + 1, tone: 'blue' }, { id: 'r', label: 'R', index: i, tone: 'orange' }],
  note: `i=${i}: ${prev} + ${nums[i]} − ${out} = ${sum}`, alert: undefined, logicTone: improved ? 'success' : 'info',
  vars, logic, javaLines: [5, 6], pyLines: [4, 5], algoStep: 1,
});
```
Reference implementations: `src/problems/fixedWindow.ts` (8 steps) and `src/problems/longestSubstringWithoutRepeating.ts` (17 steps for "pwwkew"); guard them with `node scripts/fuzz-windows.mts`.
