# DSA Animator (dsaanimator.com) — Teardown Notes

Researched 2026-11-13. Sources: page text of every top-level page, raw HTML + shared JS/CSS of the animation pages, `sitemap.xml` (578 URLs), `llms.txt`, `robots.txt`.
Anything marked **(unverified)** was not visible to our crawler (client-rendered or gated).

---
## 1. What the product is

An interview-prep platform. Core idea: every problem is a **step-by-step animation** with the matching code line highlighted, plus a lot of adjacent interview content. Tagline "Learn DSA with animation". Claims 15,000+ learners. Built by a small team (no names published). Prices are region-based; payment via Razorpay; one-time payments (1 / 3 / 12 months), no auto-renew; 3-day free trial, no card.

### Site map (14 areas)
| Area | URL | What it is |
|---|---|---|
| Landing | `/` | Marketing page: hero, live playground demo, 6 "Beyond DSA" cards, pricing, changelog, 10 testimonials, 9 FAQs |
| Library | `/dsa-animations` | The app's main index (618 KB single page): problems, patterns, Java cheatsheet, edge cases, quiz |
| Problem animations | `/viz/problems/<topic>/<id>-<slug>` | 185 standalone animated pages |
| Pattern pages | `/patterns/<slug>` (+ `/patterns/` index) | 37 animated pattern walkthroughs |
| DSA Revision | `/dsa-revision`, `/dsa-revision/<slug>` | 185 ~2-min videos + transcript pages |
| System Design | `/system-design`, `/system-design/<slug>` | 85 topics (LLD, SOLID, GoF, concurrency, DB, messaging) |
| Scenario Questions | `/interview-questions`, `/interview-questions/<slug>` | 45 senior-level scenario Q&As |
| Java Interview | `/java-interview`, `/java-interview/<slug>` | 30 topics / 570 Qs (home says 286, llms.txt says 550+ — inconsistent) |
| SQL Visualizer | `/sql` | PostgreSQL query stepper, 10 lessons, free (client-rendered; **unverified** in detail) |
| Jobs | `/jobs` | Curated product-company roles, refreshed 2x/day; filters company/country/remote (**unverified**) |
| Mock interviews | `/mockInterview` | Peer matching by topic/level/time (**unverified**; only in llms.txt/about) |
| Pattern quiz | `/pattern/quiz` | Timed MCQ, 10 random Qs, hints, explanations, score tracking (**unverified**) |
| Java course | `/java` | AI-powered Java backend course, sold separately (**unverified**) |
| Static | `/about /contact /privacy /terms` | Refund policy is a modal ("no refunds") |

Sitemap breakdown (578): 185 viz + ~185 revision + 37 patterns + ~85 system-design + 45 interview-questions + 30 java-interview + misc.
External links: desktoptails.com, frommyheart.in, nomorerejection.com (their other products).

---
## 2. Library page (`/dsa-animations`) — section by section

1. **Top bar**: stats "Total 185+ | Easy 60+ | Medium 85+ | Hard 25+", Light/Dark theme toggle, "everything is free, sign in to save progress" banner, mobile Menu button, desktop-recommended notice.
2. **Explore nav** (16 items): Animated Problems, DSA Revision, Common Patterns (43), Interview Questions, System Design, SQL Visualizer, Code Tricks, Edge Cases, Jobs, Pattern Quiz, Java Course, Java Interview, 3 external promos, Focus mode.
3. **Support nav**: About, Contact, Privacy, Terms, Refund (modal), Feedback (modal).
4. **FREE PREVIEW block** + "Unlock every problem" → paywall.
5. **Recommended Learning Sequence** (18 steps, ordered): Arrays → Strings → Matrix → Stack → Queue → Binary Search → Linked List → Greedy → Intervals → Backtracking → Tree → Heap → Graph → DP → Bit Manipulation → Sorting → Trie → Design. **Priority legend**: P1 must-do (red), P2 important (yellow), P3 good-to-know (black).
6. **Filter bar**: Priority (All / P1 only / P1+P2 / P3 only / Free only) · Status (All / In progress / Practice pending / Solved / Needs revision) · Search.
7. **18 category blocks**, 187 problem cards (catalog in §3). Card = `#id`, name, technique tag, difficulty, link chips (LC / GFG / ▶ viz).
8. **Pattern quiz teaser** ("10 random questions with hints, explanations, score tracking") → modal with stats: Attempts, Avg Score, Best, Last Attempt.
9. **Common Patterns**: 14-chip jump bar, 43 cards (catalog in §4). Card = icon, title, subtitle, tag chips, complexity, "Open →" or "▼" expander, "Full Pattern Page →".
10. **Java cheatsheet** ("Code Tricks"): 16 topics / 53 sub-cards with code (catalog §6).
11. **Edge Cases**: 15 topics / 51 sub-cards (catalog §7).
12. **Modals**: sign-in (Google), profile ("how did you hear about us" + phone), contact, refund, feedback (type Feedback/Suggestion/Bug, 1–5 rating, message, optional email/phone), paywall ("Unlock Everything"), quiz.

---
## 3. Animated problem catalog (187 cards in the library; 185 videos)
Format `#LC name (E/M/H) · technique`. GFG/IB = non-LeetCode. *Library has 187 cards vs 185 videos: library adds Trie(2)+Design(1), omits Merge Two Sorted Lists (#21).*

**Arrays (29)**
- Basics: #1929 Concatenation of Array E · #1480 Running Sum E (prefix) · #1672 Richest Customer Wealth E · #1470 Shuffle the Array E · #832 Flipping an Image E · #2239 Closest Number to Zero E
- Two pointers: #88 Merge Sorted Array E · #26 Remove Duplicates E · #977 Squares of Sorted Array E · #15 3Sum M · #42 Trapping Rain Water H · #167 Two Sum II M · #11 Container With Most Water M · #31 Next Permutation M
- Subarray/window: #53 Max Subarray M (Kadane) · #121 Best Time Buy/Sell Stock E · #643 Max Average Subarray I E (fixed window) · #1004 Max Consecutive Ones III M · #209 Min Size Subarray Sum M
- Hashing: #1 Two Sum E · #217 Contains Duplicate E · #41 First Missing Positive H · #238 Product Except Self M · #383 Ransom Note E · #560 Subarray Sum = K M · #169 Majority Element E (Boyer-Moore) · #128 Longest Consecutive Seq M
- Rotation/sort: #189 Rotate Array M · #75 Sort Colors M (Dutch flag)

**Strings (17)** — #13 Roman to Integer E · #14 Longest Common Prefix E · #271 Encode/Decode Strings M · #205 Isomorphic Strings E · #344 Reverse String E · #3 Longest Substring w/o Repeat M · #424 Longest Repeating Char Replacement M · #76 Min Window Substring H · #567 Permutation in String M · #438 Find All Anagrams M · #242 Valid Anagram E · #49 Group Anagrams M · #1189 Max Number of Balloons E · #125 Valid Palindrome E · #680 Valid Palindrome II M · #5 Longest Palindromic Substring M · #647 Palindromic Substrings M

**Matrix (9)** — #54 Spiral Matrix · #59 Spiral Matrix II · #200 Number of Islands · #73 Set Matrix Zeroes · #79 Word Search · #240 Search 2D Matrix II · #48 Rotate Image · #74 Search 2D Matrix · #36 Valid Sudoku (all M)

**Stack (8)** — #20 Valid Parentheses E · #150 Eval RPN M · #739 Daily Temperatures M · #155 Min Stack M · #496 Next Greater Element I E · #84 Largest Rectangle in Histogram H · #85 Maximal Rectangle H · #224 Basic Calculator H

**Queue (2)** — GFG Reverse First K Elements of Queue M · #239 Sliding Window Maximum H

**Binary Search (14)** — #704 E · #35 Search Insert Pos E · #268 Missing Number E · #34 First/Last Position M · #162 Peak Element M · #153 Min in Rotated M · #33 Search Rotated M · #81 Search Rotated II M · #875 Koko Bananas M · #1011 Ship Packages M · #410 Split Array Largest Sum H · GFG Allocate Min Pages H · IB Painter's Partition H · #4 Median of Two Sorted Arrays H

**Linked List (14 library / 15 revision)** — #83 E · #206 Reverse E · #141 Cycle E · #876 Middle E · #19 Remove Nth M · #138 Copy Random Ptr M · #2 Add Two Numbers M · #202 Happy Number E · #92 Reverse II M · #234 Palindrome LL E · #143 Reorder List M · #23 Merge K Lists H · #25 Reverse K-Group H · #142 Cycle II M · (+#21 Merge Two Sorted Lists E in revision)

**Greedy (6)** — #55 Jump Game · #45 Jump Game II · #135 Candy H · #134 Gas Station · GFG Minimum Platforms · #763 Partition Labels (rest M)

**Intervals (5)** — #56 Merge · #57 Insert · #253 Meeting Rooms II · #435 Non-Overlapping · #452 Min Arrows (all M)

**Backtracking (9)** — #78 Subsets · #90 Subsets II · #46 Permutations · #77 Combinations · #39 Combination Sum · #17 Letter Combos · #22 Generate Parens (all M) · #51 N-Queens H · #37 Sudoku Solver H

**Tree (21)** — #102 Level Order M · #637 Avg of Levels E · #103 Zigzag M · #199 Right Side View M · #101 Symmetric E · #543 Diameter E · #226 Invert E · #104 Max Depth E · #110 Balanced E · #108 Sorted Array→BST E · #114 Flatten to LL M · #98 Validate BST M · #236 LCA M · #230 Kth Smallest BST M · #105 Build from Pre+Inorder M · #297 Serialize/Deserialize H · #112 Path Sum E · #113 Path Sum II M · #129 Sum Root→Leaf M · #124 Max Path Sum H · #94 Inorder Traversal E

**Heap (6)** — #1046 Last Stone Weight E · #215 Kth Largest M · #347 Top K Frequent M · #973 K Closest Points M · #621 Task Scheduler M · #295 Median from Data Stream H

**Graph (13)** — #1971 Path Exists E · #994 Rotting Oranges M · #133 Clone Graph M · #207 Course Schedule M · #210 Course Schedule II M · GFG Is Graph a Tree M · #417 Pacific Atlantic M · #743 Network Delay (Dijkstra) M · #787 Cheapest Flights K Stops (Bellman-Ford) M · #399 Evaluate Division M · #1584 Min Cost Connect Points (Prim) M · #127 Word Ladder H · #684 Redundant Connection M

**DP (17)** — #509 Fibonacci E · #70 Climbing Stairs E · #746 Min Cost Climbing E · #62 Unique Paths · #63 Unique Paths II M · #120 Triangle M · #198 House Robber M · #213 House Robber II M · #152 Max Product Subarray M · #300 LIS M · #91 Decode Ways M · #322 Coin Change M · #1143 LCS M · #72 Edit Distance H · GFG Longest Common Substring M · #139 Word Break M · #416 Partition Equal Subset Sum M

**Bit Manipulation (9)** — #389 Find the Difference E · #191 Number of 1 Bits E · #231 Power of Two E · #338 Counting Bits E · #371 Sum of Two Integers M · #260 Single Number III M · #137 Single Number II M · #287 Find Duplicate M · #136 Single Number E

**Sorting (5, all LC #912)** — Bubble E · Insertion E · Quick M · Merge M · Heap M

**Trie (2)** — #208 Implement Trie M · #212 Word Search II H · **Design (1)** — #146 LRU Cache M

---
## 4. Pattern catalog (43 cards, 14 groups; 37 have animated pages)
Slug in `/patterns/<slug>`.
- **Sliding Window**: `sliding-window-fixed` (#643, #239) · `sliding-window-dynamic` (#209, #3, #76)
- **Two Pointers**: `two-pointers-opposite` (#167,#42,#11) · `two-pointers-same` (#26,#283,#80) · `two-pointers-threesum` (#15,#16,#18)
- **Prefix/Hash**: `prefix-sum` (#1480,#560,#238) · `hashing-frequency` (#1,#49,#128) · `kadane` (#53,#121,#152)
- **Binary Search**: `binary-search-classic` (#35,#34,#162,#33) · `binary-search-on-answer` (#875,#1011,#410)
- **Stack**: `stack-simple` (#20,#150,#155,#224) · `stack-monotonic-dec` (#739,#496,#503) · `stack-monotonic-inc` (#84,#85,#42)
- **BFS**: `bfs-standard` (#102,#200,#127,#133) · `bfs-multisource` (#994,#542,#417)
- **Linked List**: `linkedlist-fastslow` (#141,#876,#287) · `linkedlist-reversal` (#206,#92,#25) · `linkedlist-merge` (#19,#21,#23)
- **Tree**: `tree-dfs` · `tree-bfs` · `tree-paths` · `tree-bst`
- **Backtracking**: `backtrack-subsets` · `backtrack-perms` · `backtrack-combos`
- **Greedy**: `greedy-intervals` · `greedy-jump`
- **Heap**: `heap-topk` · `heap-two-heaps` · `heap-kway`
- **Graph**: `graph-union-find` · `graph-topo-sort` · `graph-dijkstra` · `graph-bellman-ford` · `graph-prims`
- **DP** (5 cards, 2 pages): `dp-1d` (House Robber + Coin Change tabs) · `dp-2d` · cards without page: 2D Grid DP, LIS, Min/Max DP
- **Bits** (3 cards, no pages): XOR tricks, Bit counting, Bit modulo (Single Number II)

**Pattern page template**: breadcrumb → hero (title, tags, Time/Space) → When to Use (4–5 bullets) → tip → Complexity block → **Live Animation** (fixed example, Play/Prev/Next/Reset, speed buttons, phase labels, state readout, idle prompt, Java template) → Practice Problems (LeetCode links). No custom input on pattern pages. Some pages have tabs (dp-1d).

---
## 5. Problem (viz) page — anatomy & engine (verified from source)

**Layout (top→bottom)**: breadcrumb → title row (LC badge · difficulty badge · pattern tag) → **Problem** card (statement, Example, Constraints) → **Try Examples** (preset buttons "input → output" + **Custom** input + ▶ Run, validated, ≤12 items for sorting) → 2-column body:
- **Left**: control card (Prev / Play-Pause / Next / Reset, speed slider 6 levels, progress bar, `n / total` counter) · Approach banner (shown only on step 0) · **Visualization** card(s) with colour legend · **Variables** grid (e.g. pass i, j, comparisons, swaps) · **Step Logic** box (colour-coded info/warn/success) · result banner (🎉) · step title + description.
- **Right**: **Code panel** (Java | Python tabs, Copy button, line numbers, active lines highlighted per step) · Algorithm list (numbered, current item lit) · complexity chips (Best / Avg-Worst / Space) · "Why it works" paragraph.
- Below: long-form SEO article ("Why the obvious approach is slow / The key idea / Remember"), link to the 2-min video, related-problems list.
- Widgets: **notes**, **progress** (mark solved/bookmark), **video** (all separate JS files).

**Engine design (the transferable idea)**
- Each page precomputes `steps[]` by *running the algorithm once*, pushing a snapshot object per event: `{ title, desc, items[{key,val,cls}], ptrs, state{vars}, logic, logicClass, code:[javaLines], pyCode:[pyLines], algoStep, result }`.
- A generic `AnimEngine` just holds `steps/cur/playing/timer`, exposes `load/next/prev/play/pause/reset/setSpeed`, and calls `onRender(step, idx, total)`. Speeds 4500→600 ms.
- Renderers are shared per data structure (e.g. `SortViz`: persistent keyed DOM cells, **FLIP** animation so elements visibly slide on swap, pointer badges slide via CSS transform). Other renderers exist for linked lists (`ll-scene.js`), likely trees/graphs/grids/intervals/DP tables (**unverified**).
- Because steps are precomputed, Prev = re-render a snapshot (free rewind), custom input = rebuild steps.
- Tech: plain static HTML + vanilla JS, FontAwesome 6.5 icons, no framework on viz pages. Landing/SQL/Jobs/Java/System-design pages are a Vite-built SPA (`/assets/main-*.js`, `#root`), Google AdSense on viz pages, Geist font on landing.
- Design tokens: GitHub-dark palette (`--bg #0d1117`, `--bg2 #161b22`, `--border #30363d`, `--blue #388bfd`, `--green #3fb950`, `--yellow #d29922`, `--orange #f0883e`, `--purple #bc8cff`, `--cyan #79c0ff`), Consolas mono. Light theme toggle persisted via `theme-init.js`.
- Access guard code exists but is **disabled** (all viz pages public). Auth token in `localStorage` (`dsa_token`); API under `/dsa/api/`.

---
## 6. Java cheatsheet ("Code Tricks") — 16 topics / 53 sub-cards
1 Type conversions & parsing (4) · 2 Integer/Long/∞ constants (3) · 3 Math (2) · 4 Character (2) · 5 String & StringBuilder (4) · 6 Arrays class (3) · 7 Collections class (3) · 8 HashMap/HashSet tricks (3) · 9 PriorityQueue & Comparator (3) · 10 Deque (3) · 11 Bit-ops cheatsheet (4) · 12 Grid/Matrix utils (3) · 13 DSA building blocks — gcd/lcm/prime, rotated pivot, palindrome, node templates, fast power, compact union-find (6) · 14 Sorting comparator patterns (3) · 15 TreeMap/TreeSet/LinkedHashMap (2) · 16 Common initialization patterns (5)

## 7. Edge-case checklist — 15 topics / 51 sub-cards
1 Integer overflow (5) · 2 Empty/null input (4) · 3 Single/two elements (3) · 4 Array-specific (4) · 5 Sliding window (3) · 6 Binary search (3) · 7 Linked list (4) · 8 Tree (4) · 9 Graph (3) · 10 Stack/queue (2) · 11 DP (3) · 12 Backtracking (2) · 13 String (3) · 14 Bit manipulation (2) · 15 Universal (6: off-by-one, negative modulo, comparator overflow, no-answer return, early-return checklist, ConcurrentModification)

---
## 8. System Design (85 topics, 11 categories; priority tag per topic)
Priority tags: Must Know 40 · Important 28 · Advanced 8 · Specialized 3 · Optional 6. Sidebar "Learning Tree" with collapsible categories + priority filter; each topic page has code, diagrams (SVG class diagrams), follow-ups.
- **LLD Interview Prep (11)**: LRU Cache, Parking Lot, Snake & Ladder, Logger, ATM, Splitwise, BookMyShow, Food Delivery, Rate Limiter, Meeting Scheduler, Elevator
- **Concurrency & Threading (15)**: Concurrency basics, Synchronization, volatile, volatile/atomic/transient, synchronized vs ReentrantLock, Deadlock/Livelock/Starvation, Thread pools & ExecutorService, BlockingQueue, CompletableFuture, ConcurrentHashMap & collections, HashMap vs ConcurrentHashMap, WeakHashMap, Weak/Soft/Phantom refs, Virtual threads (Java 21), JVM/GC overview
- **Networking & Realtime (7)**: REST vs gRPC, gRPC, JWT vs Session/OAuth, AuthN & AuthZ, API Gateway, Webhook, WebSocket
- **Databases & API Data (6)**: Indexing, N+1 & batching, Pagination, Transactions & isolation, Connection pooling (HikariCP), Sharding & partitioning
- **Reliability & Scalability (7)**: Caching patterns, Fault tolerance, Idempotency, Rate limiting, Circuit breaker/retry/bulkhead, Resilience4j, Distributed locks
- **SOLID (6)**: Class relationships, S, O, L, I, D
- **Creational (5)**: Builder, Factory Method, Singleton, Abstract Factory, Prototype
- **Architecture Styles (10)**: Interview framework, Scale from zero to millions, Trade-offs, Docker, JUnit in Spring Boot, Redis, CQRS, SAGA, Zero-downtime deploys, CQRS/Event Sourcing overview
- **Behavioral (9)**: Observer, Strategy, Chain of Responsibility, Command, State, Mediator, Memento, Template Method, Visitor
- **Structural (5)**: Decorator, Adapter, Facade, Proxy, Composite
- **Messaging & Streaming (4)**: Kafka basics, RabbitMQ vs Kafka, SQS basics, SQS vs RabbitMQ

## 9. Scenario interview questions (45)
Tiers: Must Know 14 · Important 19 · Advanced 10 · Optional 2. Badges: Senior (5+ YOE) 37, SDE-2 (3–5 YOE) 8. Tag facets: System Design 14, Database 11, Idempotency 10, Payments 9, Distributed Systems 8, Concurrency 7, E-commerce 6, Caching 5, Consistency 5, Inventory 5, Resilience 4, CAP 3. Search + importance filter + "Start with Must Know". Each answer = framing, core design, walkthrough, weak answers, follow-ups (45–60 min interview style). Free policy: 30-day trial for new users, else first 5 free (configurable by feature flag).
Examples: wallet double-spend, retry storm, duplicate payment double-click, cache stampede, distributed rate limiter, seat booking race, Kafka exactly-once, flash sale, payment timeout, coupon redemption, DLQ poison message, GDPR delete, KYC vendor flakiness, hot-key seller, multi-tenant noisy neighbor, CRDT-like doc edits, ES index lag, offset pagination w/ inserts, etc. (full slugs in sitemap).

## 10. Java interview bank (30 topics / 570 Qs)
Core Java 150 (OOP 25, Strings 15, Collections 30, Exceptions 15, Generics 10, Java 8 25, Modern Java 9–21 20, I/O 10) · Advanced Java 65 (Concurrency 30, JVM/GC 20, Perf tuning 15) · Spring 194 (Core/DI 13, Boot 17, MVC/REST 14, Data JPA 11, Hibernate 28, Security 28, JUnit/Mockito 20, Testing/Actuator/Microservices 8, WebFlux 15, Spring AI 25, Real-world 15) · Distributed 78 (Microservices/Cloud 26, Kafka/RabbitMQ 25, Observability 15, Build/Docker/Deploy 12) · Interview rounds 83 (Coding 37, Patterns & SOLID 22, Senior design 12, Project/behavioural 12). Level tags Fresher/Mid/Experienced; importance levels; diagrams.

## 11. DSA Revision videos (185)
~2-min animated videos (avg 1:34, total 4.8 h). Chapters: Problem · Example · Brute force · Key idea · Dry run · Code · Takeaway. Each item page has: timestamp links (`?t=`), "What you will learn" summary, link to the interactive viz, full prose transcript, "More <topic> videos". Progress saved in browser. Java only.

## 12. Landing page content
Hero ("Stop memorizing DSA…"), problem preview + scrolling pattern-tag strip (16 tags), CTA band, **Playground** (4 demos: Binary Search, Quick Sort, BFS, BST Insert — editable input, clickable nodes, timeline scrub), "the moment it clicks" linked-list explainer, "inside every problem" mock lesson with 5 callouts, "Beyond DSA" 6 cards, pricing (3 plans, 10 features), changelog (Apr–Sep 2026, 5 entries), 10 testimonials (initials only), 9 FAQs, footer.

## 13. Cross-cutting features
Google sign-in · progress (solved / needs-revision / in-progress / bookmark) · private notes per problem · sync across devices · light/dark theme · priority (P1–P3) · free vs paid gating (currently largely open) · promo codes · feedback widget · Razorpay payments · regional pricing · AdSense · SEO (JSON-LD LearningResource, canonical, OG, sitemap, llms.txt, AI crawlers allowed) · "best on desktop" mobile hint · Focus mode.

## 14. Gaps / things to verify before building
- `/sql`, `/jobs`, `/java`, `/mockInterview`, `/pattern/quiz` are SPA routes; contents not captured. Needs a real browser pass.
- Non-sorting renderers (trees, graphs, grids, DP tables, intervals, linked lists) — read `ll-scene.js` etc. if we want to study approach.
- Actual prices (shown as "—", region-based).
- Which problems are truly free vs gated.
- Per-problem difficulty/priority for the library cards (P1/P2/P3 not exposed in text).
- Content inconsistencies on their own site (187 vs 185; 286 vs 570 vs 550+ Java Qs; "43 patterns" vs "40+").
