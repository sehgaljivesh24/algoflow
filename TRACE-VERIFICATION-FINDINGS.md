# Step-by-step trace verification — findings

How to re-run: `node scripts/verify-traces.mts` (all 354 problems, about 20 s). Options: `ONLY=slug1,slug2`, `RUNS=200 SEED=7`, `VERBOSE=1`, `STRICT_COVERAGE=1`, `LIST_UNCOVERED=1`. Contract and rules: `ORACLE-GUIDE.md`.
Every problem has an independent oracle (`scripts/oracle/cases-*.mts`, 354 cases). The animation's observable state at every step (vars, pointers, array/grid cells, aux panels, scene nodes) must equal the oracle's simulation, in order, on all declared examples plus random inputs.
Final combined run (SEED 4242, RUNS 100): 36,489 inputs, 573,351 animation steps, 0 failing cases.

## Real animation bugs found by the oracles (14) — all fixed
| # | Problem | Input that exposed it | What was wrong |
|---|---|---|---|
| 1 | 14-longest-common-prefix | any input ending in a mismatch, e.g. `["dog","racecar","car"]` | Done step lit every row as agreed, including rows never compared |
| 2 | 164-maximum-gap | any input, e.g. `[3,6,9,1]` | the "gaps" panel shared the live array, so early steps already showed later buckets' gaps |
| 3 | 28-find-the-index-of-the-first-occurrence-in-a-string | `leetcode / leeto`, `bbbababababa / bababbb` | final "not found" step drew the pattern under the last character with nothing matched while j > 0 |
| 4 | 50-pow-x-n | n = 0 | ran a round of a loop that the displayed Java never executes |
| 5 | alg-fenwick-tree-binary-indexed-tree | `[0,0]` (zero early in the input) | a parent that received +0 was highlighted but still labelled "not built yet" |
| 6 | 315-count-of-smaller-numbers-after-self | `5 2 6 1` | `counts` showed `?` for the item just recorded, one step late |
| 7 | cp-negative-cycle-detection-currency-arbitrage | declared example 1 (any input ending in a cycle) | round counter ended at n+1: "round 4 of 3" |
| 8 | 1489-find-critical-and-pseudo-critical-edges | declared example 1, step 12 | the verdict list showed `?` on the step whose text names the verdict (written a step late) |
| 9 | bellman-ford-negative-edges (cosmetic) | any | check pass titled "round 5 of 4" |
| 10 | 875-koko-eating-bananas | `piles=[16,11,13,4,15], h=5` | final step showed hours = 6 (last speed tried) instead of 5 (at the answer speed 16) |
| 11 | 79-word-search | `ABCE/SFCS/ADEE`, word `ABCB`, steps 13–14 | stale row/col/letter index shown after a backtrack and on a new start cell |
| 12 | 127-word-ladder | `hot → cog` with `lot dot log dog cog` | siblings queued in word-list order; the displayed Java scans position, then a..z |
| 13 | 1971-find-if-path-exists-in-graph | edges `0-2, 0-1` | adjacency lists were sorted; the displayed Java uses edge order |
| 14 | 664-strange-printer | `abcabc`, Done step | dp[1][n-1] drawn in the "source cell" colour although nothing is read |

Batches with no real bug: d2 (stacks, lists, trees, caches — 49 problems) and e2 (30 simple problems). Every mismatch there was an error in the oracle, which was fixed.

## Documented design choices (oracle aligned to the animation, noted in each case's `notes`)
Tie-breaking: priority-queue ties shown as (weight, node, edge index) for Prim and (distance, node) for Dijkstra; heap ties by list/index (like the shown Python tuples; the Java comparators are value-only); equal start times ordered by end time in interval problems; HLD swaps only when strictly deeper; Manacher ties go to the leftmost centre; Task Scheduler breaks ready ties alphabetically.
Timing of what is shown: KMP/Z/Manacher show state at the moment a comparison resolves (a new len/j appears in the next step); radix sort multiplies `exp` after the collect step; DFS call-stack pops, HLD climbs and a few "next" chips lag one step; Add Two Numbers shows the carry INTO the column.
Representation: hash map / set panels list insertion order, not Java HashMap order; persistent trees compare structure and sharing, not node ids; one-optimal-solution problems (132, matrix chain, 337, TSP, 918) are checked for validity and optimality, not for one specific solution; reservoir sampling replays the page's own fixed-seed draws.

## What this verification does NOT cover
- Colours, tones, cell/node/edge states (except where noted in a case), layout coordinates, pointer-chip tones.
- Narration text, `tag`, `note`, `alert`, titles and the highlighted Java/Python lines (reviewed separately by agents and heuristics, not mechanically).
- Large inputs beyond the animation's own caps (trees about 12 nodes, graphs 12 nodes, Sudoku up to 20 empty cells, N-Queens up to n = 6); Word Search drops steps after 360 and the oracle mirrors that cap.
- A state that is wrong in BOTH the animation and the oracle (the oracles were written from the textbook definition without importing any problem module or kit, to make that unlikely).
- Scene sizes: the oracle files are not type-checked by `npm run typecheck` (tsconfig includes only `src`); they run correctly under Node.

---

# Code-panel verification (Java executed, Python audited)

## Java (all 354 problems): `node scripts/java-check.mts`
The Java shown on each code panel is wrapped in `class Solution`, compiled with javac (JDK 25) and run on the declared examples plus random inputs (5,337 inputs); results must equal the animation's verified final answer or an independent TS reference. Cases: `scripts/javacheck/cases-*.mts` (contract in `scripts/javacheck/types.ts`). Final run: 0 failing problems.
No snippet that compiled returned a wrong answer. 31 snippets did NOT compile for a reader who pasted them; each was fixed without moving any line (missing code was appended after the last line, so `Step.javaLines` indexes stay valid):
- missing `swap`: 442 Find All Duplicates, 75 Sort Colors, Heap Sort, Quick Sort, Next Permutation (`swap`, `reverse`)
- missing helper methods: Valid Parentheses (`matches`), Palindrome Partitioning (`isPalindrome`), Sliding Window Median (`peek`, `pop`), Reverse Pairs (`merge`), N-Queens (`draw`), Triangle (`copy`), Count Special Integers (`perm`), Strange Printer (`compress`), Critical Connections (`buildAdjacency`), Network Connected (`find`), Possible Bipartition (`buildGraph`), partition-into-two-arrays (`bySize`), 187 Repeated DNA (`code`), Rabin-Karp (`val`), Stream of Characters (`insert`, `build`), Word Search II (`TrieNode`, `buildTrie`)
- missing declarations: LRU Cache `Node` constructors, TSP `INF`, HLD path-max/LCA fields, Replace Words (`Trie` made `static`)
- missing geometry helpers: Graham scan, Jarvis march, rotating calipers (`cross`, `dist2`, `area`, `convexHull`), multi-keyword search (`AhoCorasick` class)
- placeholder line: 1514 Path with Maximum Probability (`{ /* add {v, p} both ways */ }` replaced by real code)

## Python (all 354 panels): `node scripts/check-python-panels.mts`
Python is not installed on this machine, so Python was not executed. A static scanner (undefined calls/names incl. `self.`, syntax, Java-isms) found 18 real defects, all fixed (missing helpers/classes in 15 panels, bare `inf` in 2, and a logic bug in 137 Single Number II where Python ints do not wrap, so negatives came back as 4294967294-style values). All 354 panels also compile under Pyodide (a Python build that runs in Node, installed in a scratch folder only): 0 syntax errors. About 85 panels were read against the verified Java. NOT done: executing the Python on inputs (needs about 354 call adapters; Pyodide makes it feasible). About 58 panels use `deque`/`heapq`/`Counter`/`math` without imports, like LeetCode's preloaded environment; the Java panels likewise omit `import java.util.*`.

## Other checks added
`scripts/smoke-ssr.mts` (server-renders 4,178 page/step combinations in Node; one real defect found: duplicate SVG marker ids), `scripts/check-seo.mts`, `scripts/check-python-panels.mts`, `scripts/gen-pattern-text.mts --check`. Motion/phone QA by scripted iframe harness: see `PHONE-TEST-CHECKLIST.md` for what only a real phone can verify.
