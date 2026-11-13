import type { DetailMap } from './types.ts';
import type { PracticeItem } from '../patterns.ts';

// Batch d4 (graph algorithms, union-find advanced, LCA, HLD) — see PATTERN-DETAIL-PLAN.md. Keyed by pattern slug.

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

export const d4: DetailMap = {
  'graph-union-find': {
    tags: ['Connectivity', 'Cycle detection', 'Path compression', 'Union by size'],
    content: {
      whenToUse: [
        'You add edges one at a time and must answer **"are these two nodes already connected?"** after each addition. A fresh DFS per query costs O(V + E) every time, while union-find answers with two finds in near-constant time.',
        'The task asks for the **edge that closes a cycle** in an undirected graph: the first edge whose endpoints already share a leader is the culprit. Redundant Connection, "is this graph a tree?" and spare-cable counting all reduce to that single test.',
        'You must count or label **connected components as they merge**: start with n groups and subtract one for every successful union. Number of Provinces, network connectivity and counting islands after each new land cell all reuse this counter.',
        'The relation is **transitive but never given as a graph**: equal letters (a==b), accounts sharing an email, stones sharing a row or column. Treat every item as a node, union what is related, then read the groups; do all unions before any not-equal check.',
        'You need a **minimum spanning tree by sorting edges** (Kruskal) or a quick connectivity filter inside a larger algorithm. Each accept-or-reject decision is one find pair, so sorting dominates and the structure itself never becomes the bottleneck.',
      ],
      tip: 'Always link roots, never plain nodes, and flatten with path compression plus union by size. If find(a) equals find(b) before the union, that edge closes a cycle; every successful union removes exactly one component.',
      practice: [
        '1971-find-if-path-exists-in-graph',
        { slug: '547-number-of-provinces', note: 'count the groups left after all unions' },
        { slug: '684-redundant-connection', note: 'the first edge inside one group' },
        { slug: '1319-number-of-operations-to-make-network-connected', note: 'failed unions are spare cables' },
        { slug: '990-satisfiability-of-equality-equations', note: 'union ==, then check !=' },
        lc('721', 'Accounts Merge', 'Medium', 'accounts-merge', 'union accounts that share an email'),
        lc('1202', 'Smallest String With Swaps', 'Medium', 'smallest-string-with-swaps', 'sort the letters inside each group'),
        lc('947', 'Most Stones Removed with Same Row or Column', 'Medium', 'most-stones-removed-with-same-row-or-column', 'union rows with columns'),
      ],
    },
    meta: {
      useNote: 'Always link roots, never plain nodes, and flatten with path compression plus union by size. If find(a) equals find(b) before the union, that edge closes a cycle; every successful union removes exactly one component.',
      complexityNote: 'Path compression plus union by size keep every tree almost flat, so one find or union costs inverse-Ackermann time, under 5 for any real input. The parent and size arrays take O(n); m operations run in O(m·α(n)).',
      highlight: ['are these two nodes already connected?', 'edge that closes a cycle', 'connected components as they merge', 'transitive but never given as a graph', 'minimum spanning tree by sorting edges'],
    },
  },

  'graph-topo-sort': {
    tags: ['DAG', 'In-degree', 'BFS queue', 'Cycle detection'],
    content: {
      whenToUse: [
        'Tasks have **prerequisites** and you must output a valid order: courses, build targets, package installs. Kahn\'s algorithm repeatedly takes anything with no unmet dependency, so the finished order respects every edge by construction.',
        'You only need a **yes or no on feasibility**: can all courses be finished? If fewer nodes leave the queue than exist, a cycle blocked the rest. Course Schedule and deadlock checks are exactly this count comparison.',
        'The edges are **hidden in the input**, not given: Alien Dictionary compares neighbouring words and turns the first differing letter into an edge x → y before the same queue process runs. A word placed before its own prefix is another way to fail.',
        'You are **peeling layers** from a graph: leaves of a tree (Minimum Height Trees), safe nodes found on the reversed graph, or build stages computed level by level. In-degree zero, or degree one in a tree, marks what can be removed next.',
        'The graph is **directed and acyclic** and several valid orders exist, any of them accepted. If the smallest order is required, swap the queue for a heap; dynamic programming on a DAG (longest path, path counts) also runs in topological order.',
      ],
      tip: 'Point each edge from prerequisite to dependent and track in-degrees. If you emit fewer nodes than exist, a cycle blocked the rest. Reverse the graph when the question asks for safe nodes.',
      practice: [
        '207-course-schedule',
        '210-course-schedule-ii',
        { slug: '269-alien-dictionary', note: 'derive the edges from word pairs first' },
        { slug: '310-minimum-height-trees', note: 'peel leaves like a topological sort' },
        lc('802', 'Find Eventual Safe States', 'Medium', 'find-eventual-safe-states', 'topological sort on the reversed graph'),
        lc('2115', 'Find All Possible Recipes from Given Supplies', 'Medium', 'find-all-possible-recipes-from-given-supplies', 'ingredients are prerequisites'),
        lc('1857', 'Largest Color Value in a Directed Graph', 'Hard', 'largest-color-value-in-a-directed-graph', 'DP in topological order, cycle means -1'),
        lc('1203', 'Sort Items by Groups Respecting Dependencies', 'Hard', 'sort-items-by-groups-respecting-dependencies', 'two layered topological sorts'),
      ],
    },
    meta: {
      useNote: 'Point each edge from prerequisite to dependent and track in-degrees. If you emit fewer nodes than exist, a cycle blocked the rest. Reverse the graph when the question asks for safe nodes.',
      complexityNote: 'Each vertex enters and leaves the queue once and each edge lowers one in-degree once: O(V + E) time with O(V) extra memory. Swapping the queue for a heap, to get the smallest order, makes it O((V + E) log V).',
      highlight: ['prerequisites', 'yes or no on feasibility', 'hidden in the input', 'peeling layers', 'directed and acyclic'],
    },
  },

  'graph-dijkstra': {
    tags: ['Weighted graph', 'Min-heap', 'Greedy', 'Non-negative weights'],
    content: {
      whenToUse: [
        'Edges carry **different non-negative weights** (minutes, cost, distance) and you want the cheapest route. BFS counts hops and fails as soon as one road is longer than another, while Dijkstra settles the closest unfinished node first.',
        'You need the **shortest distance from one source to every node**, for example the signal delay time, which is the largest finished distance. One heap-driven run produces the whole distance table, so later questions are lookups.',
        'The path value is a **monotone combination**, not necessarily a sum: the maximum step on a route (Path With Minimum Effort), a product of probabilities with a max-heap, or the highest cell crossed. Any value that cannot improve when extended keeps the greedy valid.',
        'The graph is a **grid or implicit state space** where moves have costs: swimming in rising water, a minimum-cost valid path, or states such as (node, stops used). The heap holds states, and a stale-entry check keeps it correct.',
        '**No edge may be negative.** Dijkstra finalises a node when it pops, which a later negative edge would invalidate. With negative weights or a stop limit use Bellman-Ford; with unit weights plain BFS is simpler and faster.',
      ],
      tip: 'When a popped (distance, node) pair is worse than the stored best, skip it: it is stale. A node popped with its final distance never improves, which is exactly why negative edges break the method.',
      practice: [
        '743-network-delay-time',
        '1514-path-with-maximum-probability',
        '1631-path-with-minimum-effort',
        '1971-find-if-path-exists-in-graph',
        lc('778', 'Swim in Rising Water', 'Hard', 'swim-in-rising-water', 'minimise the highest cell on the path'),
        lc('1976', 'Number of Ways to Arrive at Destination', 'Medium', 'number-of-ways-to-arrive-at-destination', 'count shortest paths while relaxing'),
        lc('1368', 'Minimum Cost to Make at Least One Valid Path in a Grid', 'Hard', 'minimum-cost-to-make-at-least-one-valid-path-in-a-grid', 'edge costs of 0 or 1 on a grid'),
        lc('2092', 'Find All People With Secret', 'Hard', 'find-all-people-with-secret', 'earliest time each person learns it'),
      ],
    },
    meta: {
      useNote: 'When a popped (distance, node) pair is worse than the stored best, skip it: it is stale. A node popped with its final distance never improves, which is exactly why negative edges break the method.',
      complexityNote: 'Each edge may push one heap entry and every push or pop costs a logarithm, so the run is O(E log V). Distances take O(V), the lazy heap up to O(E). On a dense graph an array scan gives O(V²) instead.',
      highlight: ['different non-negative weights', 'shortest distance from one source to every node', 'monotone combination', 'grid or implicit state space', 'No edge may be negative.'],
    },
  },

  'graph-bellman-ford': {
    tags: ['Negative weights', 'K stops', 'Edge relaxation', 'Negative cycle'],
    content: {
      whenToUse: [
        'Some **edge weights are negative**: refunds, discounts, currency gains. Dijkstra commits to a node too early and returns wrong answers, while Bellman-Ford simply relaxes every edge again and again until nothing improves, so a discounted ticket is handled correctly.',
        'The path may use **at most k edges**: k stops, k hops, k transfers. Round r holds the best cost using at most r edges, so run k + 1 rounds and read from a copy of the previous round to stop chains inside one round.',
        'You must **detect a negative cycle**: an extra round that still improves a distance proves one exists, and the parent pointers then show the loop. Currency arbitrage and "can the score shrink forever" are this check.',
        'Edges arrive as a **plain list** and the graph is small, so V·E work is affordable and the code is two nested loops with no adjacency lists or heap. The edge relaxation table makes each round easy to follow.',
        'You want **early stopping**: if a whole round changes no distance, the table is final and the loop ends before V − 1 rounds. Typical inputs finish fast even though the worst case stays V·E.',
      ],
      tip: 'For at most k stops, run k + 1 rounds and relax from a copy of the previous round, or a round could chain two edges. After V − 1 rounds, any improvement exposes a negative cycle.',
      practice: [
        '787-cheapest-flights-within-k-stops',
        { slug: 'alg-bellman-ford-shortest-paths-negative-edges', note: 'rounds, early stop, negative cycle' },
        { slug: 'cp-negative-cycle-detection-currency-arbitrage', note: 'extra round plus parent pointers' },
        { slug: '743-network-delay-time', note: 'Bellman-Ford also works when weights are small' },
        { slug: '399-evaluate-division', note: 'ratios as edge weights; a cycle that disagrees is a contradiction' },
        lc('1334', 'Find the City With the Smallest Number of Neighbors at a Threshold Distance', 'Medium', 'find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance', 'all-pairs variant (Floyd-Warshall)'),
        lc('1928', 'Minimum Cost to Reach Destination in Time', 'Hard', 'minimum-cost-to-reach-destination-in-time', 'rounds indexed by time used'),
        { slug: '1514-path-with-maximum-probability', note: 'solvable by relaxing rounds too' },
      ],
    },
    meta: {
      useNote: 'For at most k stops, run k + 1 rounds and relax from a copy of the previous round, or a round could chain two edges. After V − 1 rounds, any improvement exposes a negative cycle.',
      complexityNote: 'Every round tries all E edges, and V − 1 rounds suffice since a shortest path repeats no node: O(V·E). A k-stop limit makes it O(k·E). One distance array, plus a copy for the limited version, needs O(V).',
      highlight: ['edge weights are negative', 'at most k edges', 'detect a negative cycle', 'plain list', 'early stopping'],
    },
  },

  'graph-prims': {
    tags: ['MST', 'Min-heap', 'Greedy', 'Weighted undirected'],
    content: {
      whenToUse: [
        'You must connect **all nodes at the minimum total cost**: cables, roads, pipes. The answer is a tree with n − 1 edges, not a shortest path between two nodes, so every node is joined exactly once.',
        'The graph is **dense or implicit**, for example every pair of points with a Manhattan distance. The array version picks the cheapest outside node in O(V) and updates keys in O(V), giving O(V²) with no heap and no edge list.',
        'You grow the answer **from one start node** and care about the order of additions: an "MST edges added" list, fresh versus stale queue entries. A lazy heap keeps (weight, node) pairs and skips nodes already in the tree.',
        'A second kind of cost can be folded in with a **virtual node**: digging a well in house i becomes a pipe from a source node to i, so Optimize Water Distribution turns into an ordinary MST with one extra vertex.',
        'The key of a node is **its cheapest edge into the tree**, not its distance from the start. Mixing this up with Dijkstra is the classic bug; use Prim when the graph is dense, Kruskal when it arrives as a sorted edge list.',
      ],
      tip: 'Each outside node keeps only its cheapest single edge into the tree. Add the smallest key, then lower its neighbours\' keys. A popped entry for a node already in the tree is stale and skipped.',
      practice: [
        '1584-min-cost-to-connect-all-points',
        { slug: 'cp-prims-mst-with-a-heap', note: 'lazy heap with stale entries' },
        { slug: '1168-optimize-water-distribution-in-a-village', note: 'virtual source node' },
        { slug: '1135-connecting-cities-with-minimum-cost', note: 'the Kruskal view of the same problem' },
        { slug: '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree', note: 'MST with forced or banned edges' },
        { slug: '1631-path-with-minimum-effort', note: 'bottleneck path, MST-like' },
        lc('1579', 'Remove Max Number of Edges to Keep Graph Fully Traversable', 'Hard', 'remove-max-number-of-edges-to-keep-graph-fully-traversable', 'spanning structure for two walkers'),
      ],
    },
    meta: {
      useNote: 'Each outside node keeps only its cheapest single edge into the tree. Add the smallest key, then lower its neighbours\' keys. A popped entry for a node already in the tree is stale and skipped.',
      complexityNote: 'A binary heap gives O(E log V): each edge may push one entry. The array version scans all nodes each round for O(V²), better on dense graphs. Keys and in-tree flags take O(V); the heap up to O(E).',
      highlight: ['all nodes at the minimum total cost', 'dense or implicit', 'from one start node', 'virtual node', 'its cheapest edge into the tree'],
    },
  },

  'graph-dfs': {
    tags: ['Components', 'Cycle detection', 'Recursion', 'Visited array'],
    content: {
      whenToUse: [
        'You must **count or label connected components**: provinces, islands, groups of accounts. Loop over all nodes, start a DFS from every unvisited one, and the number of launches equals the number of components, with each DFS painting one whole group.',
        'You need to know whether the graph has a **cycle**: in an undirected graph ignore the edge back to the parent, in a directed graph a node still on the current path closes a loop. Course Schedule and Is Graph a Tree both live here.',
        'The answer is **built while returning** from the recursion: reachability, every path from source to target, eventual safe nodes with three colours, or cloning a graph with a map from old nodes to new ones.',
        'You only need **"can I get there?"**, not the shortest route. DFS uses little memory on deep thin graphs and the recursion mirrors the structure, so flood fills and region sizes are short to write.',
        'You want a **discovery or finishing order** for later steps: topological order from reversed finishing times, bridges and articulation points from discovery times, strongly connected components with Tarjan. DFS is the engine under all of them.',
      ],
      tip: 'Keep one visited array outside the loop over start nodes and count the DFS launches. For directed cycles use three states, new, on path, finished: meeting an on-path node is a cycle.',
      practice: [
        '547-number-of-provinces',
        '207-course-schedule',
        'gfg-is-graph-a-tree',
        { slug: '133-clone-graph', note: 'DFS plus a map from old to new nodes' },
        lc('802', 'Find Eventual Safe States', 'Medium', 'find-eventual-safe-states', 'nodes that cannot reach a cycle'),
        lc('797', 'All Paths From Source to Target', 'Medium', 'all-paths-from-source-to-target', 'DFS with a path stack'),
        lc('200', 'Number of Islands', 'Medium', 'number-of-islands', 'components on a grid'),
        lc('332', 'Reconstruct Itinerary', 'Hard', 'reconstruct-itinerary', 'DFS that builds the answer on the way back'),
      ],
    },
    meta: {
      useNote: 'Keep one visited array outside the loop over start nodes and count the DFS launches. For directed cycles use three states, new, on path, finished: meeting an on-path node is a cycle.',
      complexityNote: 'Each node is entered once and each edge examined once: O(V + E), or O(V²) on an adjacency matrix. The visited array needs O(V), and recursion can reach depth V on a path-shaped graph.',
      highlight: ['count or label connected components', 'cycle', 'built while returning', '"can I get there?"', 'discovery or finishing order'],
    },
  },

  'graph-kruskal': {
    tags: ['MST', 'Sort edges', 'Union-Find', 'Greedy'],
    content: {
      whenToUse: [
        'You need the **cheapest set of edges connecting every node** (a minimum spanning tree) and the graph arrives as an edge list. Sort once, then each accept-or-skip decision is a union-find check on two endpoints.',
        'The graph is **sparse**, so the E log E sort is cheap and a heap or array version of Prim would be no better. Connecting Cities With Minimum Cost is the pure form, answering -1 when fewer than n − 1 edges are kept.',
        'You want to **stop early**: k clusters with maximum spacing means stopping after n − k merges, and the next edge that crosses two groups is the answer. Single-linkage clustering is Kruskal halted part-way.',
        'You must reason about **forced and forbidden edges**: re-run Kruskal with an edge banned to see whether the tree gets heavier (critical) or with it forced to see whether the weight stays equal (pseudo-critical).',
        'You need the **rejected or spare edges**: an edge skipped because both ends share a leader would close a cycle. Redundant Connection and Remove Max Edges to Keep Graph Traversable use exactly that rejection.',
      ],
      tip: 'Keep an edge only when its endpoints have different leaders; fewer than n − 1 kept edges means the graph is disconnected. Kruskal and Prim give equal totals, so choose by input shape.',
      practice: [
        '1135-connecting-cities-with-minimum-cost',
        { slug: 'cp-max-spacing-k-clustering-kruskal', note: 'stop after n - k merges' },
        '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree',
        '1584-min-cost-to-connect-all-points',
        { slug: '684-redundant-connection', note: 'the rejected edge is the answer' },
        '1168-optimize-water-distribution-in-a-village',
        lc('1202', 'Smallest String With Swaps', 'Medium', 'smallest-string-with-swaps', 'union-find groups, sort inside each group'),
        lc('1579', 'Remove Max Number of Edges to Keep Graph Fully Traversable', 'Hard', 'remove-max-number-of-edges-to-keep-graph-fully-traversable', 'shared edges first, then each walker'),
      ],
    },
    meta: {
      useNote: 'Keep an edge only when its endpoints have different leaders; fewer than n − 1 kept edges means the graph is disconnected. Kruskal and Prim give equal totals, so choose by input shape.',
      complexityNote: 'Sorting dominates at O(E log E); each of the E find and union checks costs inverse-Ackermann time, practically constant. Memory is O(V) beyond the edge list. Integer weights allow a counting sort that removes the logarithm.',
      highlight: ['cheapest set of edges connecting every node', 'sparse', 'stop early', 'forced and forbidden edges', 'rejected or spare edges'],
    },
  },

  'graph-floyd-warshall': {
    tags: ['All-pairs', 'Dense graph', 'DP', 'Transitive closure'],
    content: {
      whenToUse: [
        'The question involves distances or reachability between **many pairs of nodes**, not one source: build a table of all shortest paths once, then answer by lookup. Dijkstra from every node needs more code for no gain on small graphs.',
        'The graph is **small**, a few hundred nodes at most, so V³ operations are acceptable and three nested loops are the whole program. Find the City With the Smallest Number of Neighbours at a Threshold Distance fits this exactly.',
        'Edge weights may be **negative** as long as no negative cycle exists; a negative number on the diagonal after the run reveals one. The same loop gives shortest paths where Dijkstra would be wrong.',
        'You need **reachability for all pairs** (transitive closure): replace min and plus with or and and, and the table says who can reach whom. Course Schedule IV queries are answered straight from it.',
        'The relation is **composed through intermediate items**: unit or currency conversions over 26 letters, ratios in Evaluate Division, the minimum cost to convert one string into another. Each k round allows one more stop-over.',
      ],
      tip: 'Keep k as the outermost loop: it allows node k as a stop-over. Set the diagonal to 0 and missing edges to a halved INF to avoid overflow. A negative diagonal entry exposes a negative cycle.',
      practice: [
        'alg-floyd-warshall-all-pairs-shortest-paths',
        { slug: '1334-find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance', note: 'count each row of the finished table' },
        { slug: 'cp-transitive-closure-warshall-reachability', note: 'or and and instead of min and plus' },
        lc('1462', 'Course Schedule IV', 'Medium', 'course-schedule-iv', 'prerequisite queries via transitive closure'),
        lc('2976', 'Minimum Cost to Convert String I', 'Medium', 'minimum-cost-to-convert-string-i', 'all-pairs over 26 letters'),
        lc('2977', 'Minimum Cost to Convert String II', 'Hard', 'minimum-cost-to-convert-string-ii', 'all-pairs on words, then a DP over positions'),
        { slug: '399-evaluate-division', note: 'ratios are path products; closure works too' },
      ],
    },
    meta: {
      useNote: 'Keep k as the outermost loop: it allows node k as a stop-over. Set the diagonal to 0 and missing edges to a halved INF to avoid overflow. A negative diagonal entry exposes a negative cycle.',
      complexityNote: 'Three nested loops over V nodes perform V³ constant-time updates, and the distance matrix holds V² entries. The update can run in place because row k and column k do not change during round k. Use it only when V is small.',
      highlight: ['many pairs of nodes', 'small', 'negative', 'reachability for all pairs', 'composed through intermediate items'],
    },
  },

  'graph-bridges': {
    tags: ['Tarjan', 'Low-link', 'Critical links', 'Cut vertices'],
    content: {
      whenToUse: [
        'You must find **bridges (critical connections)**: cables whose failure splits the network. One DFS records discovery time and low-link, and a tree edge u–v is a bridge exactly when low[v] is still greater than disc[u].',
        'You need **articulation points (cut vertices)**: nodes whose removal, together with their edges, disconnects the graph. Use the non-strict test low[v] ≥ disc[u] for non-root nodes, and count the DFS children for the root, which has no ancestors.',
        'The graph is **undirected** and every answer must come from one O(V + E) pass. Brute force that removes each edge and re-runs a DFS costs O(E·(V + E)), far too slow beyond a few thousand edges.',
        'You need **strongly connected components** of a directed graph: Tarjan adds a stack of open nodes and pops one component whenever low equals disc. The same low-link bookkeeping appears in all three problems, so learning one transfers to the others.',
        'A solution depends on **which edges lie on a cycle**: bridges are exactly the edges on no cycle, so 2-edge-connected components, minimum days to disconnect an island, or "is any link redundant" reduce to this DFS.',
      ],
      tip: 'Skip the edge back to the parent when lowering low. A child escapes above u only via a back edge, so low[v] > disc[u] marks a bridge. Cut vertices use ≥; the root needs two children.',
      practice: [
        '1192-critical-connections-in-a-network',
        { slug: 'alg-articulation-points-cut-vertices', note: 'non-strict test plus the root rule' },
        { slug: 'cp-strongly-connected-components-tarjan', note: 'low-link on a directed graph with a stack' },
        lc('1568', 'Minimum Number of Days to Disconnect Island', 'Hard', 'minimum-number-of-days-to-disconnect-island', 'an articulation point on a grid'),
        { slug: '684-redundant-connection', note: 'the edge that is on a cycle' },
        { slug: '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree', note: 'critical edges in an MST, a related idea' },
      ],
    },
    meta: {
      useNote: 'Skip the edge back to the parent when lowering low. A child escapes above u only via a back edge, so low[v] > disc[u] marks a bridge. Cut vertices use ≥; the root needs two children.',
      complexityNote: 'One DFS touches each node and edge a constant number of times: O(V + E). The disc and low arrays take O(V), and recursion can reach depth V on a long path, so very deep graphs need an iterative DFS.',
      highlight: ['bridges (critical connections)', 'articulation points (cut vertices)', 'undirected', 'strongly connected components', 'which edges lie on a cycle'],
    },
  },

  'graph-max-flow': {
    tags: ['Flow network', 'Matching', 'Min cut', 'Residual graph'],
    content: {
      whenToUse: [
        'You have **supplies and capacities** and want the maximum amount routed from a source to a sink: pipes, traffic, bandwidth. Every edge shows flow over capacity, and the answer is the total leaving the source.',
        'The problem is an **assignment or matching** between two groups: workers and jobs, invitations and people, students and seats. Add a source and a sink with unit capacities, and the matched pairs are the edges that carry flow.',
        'You need the **cheapest set of edges whose removal separates** two nodes. By max-flow equals min-cut, run the flow, then the nodes still reachable from the source in the residual graph give the cut.',
        '**Greedy path choices could block** better routes, so earlier flow must be reversible: every edge gets a backward residual arc that cancels flow already sent, and BFS paths use it to re-route a match.',
        'You need a **bound that does not depend on the capacities**: choosing the shortest augmenting path with BFS (Edmonds-Karp) limits the run to V·E augmentations, even when capacities are huge numbers, because the augmentation count no longer depends on their values.',
      ],
      tip: 'Every edge gets a backward residual arc that starts at 0 and grows as flow is pushed; using it cancels earlier flow. Choosing paths by BFS bounds the run at V·E augmentations, whatever the capacities.',
      practice: [
        'alg-max-flow-edmonds-karp',
        { slug: 'cp-maximum-bipartite-matching-flow', note: 'unit capacities from source and to sink' },
        { slug: 'cp-minimum-cut-from-max-flow', note: 'residual reachability gives the cut' },
        lc('1820', 'Maximum Number of Accepted Invitations', 'Medium', 'maximum-number-of-accepted-invitations', 'bipartite matching'),
        lc('1947', 'Maximum Compatibility Score Sum', 'Medium', 'maximum-compatibility-score-sum', 'assignment between two groups'),
        lc('1349', 'Maximum Students Taking Exam', 'Hard', 'maximum-students-taking-exam', 'seats as a matching problem'),
      ],
    },
    meta: {
      useNote: 'Every edge gets a backward residual arc that starts at 0 and grows as flow is pushed; using it cancels earlier flow. Choosing paths by BFS bounds the run at V·E augmentations, whatever the capacities.',
      complexityNote: 'BFS finds a shortest augmenting path in O(E), and Edmonds-Karp needs at most V·E augmentations, so the total is O(V·E²) whatever the capacities. The residual graph stores two arcs per edge, so memory is O(V + E).',
      highlight: ['supplies and capacities', 'assignment or matching', 'cheapest set of edges whose removal separates', 'Greedy path choices could block', 'bound that does not depend on the capacities'],
    },
  },

  'graph-bipartite': {
    tags: ['Colouring', 'Odd cycle', 'BFS / DFS', 'Conflict graph'],
    content: {
      whenToUse: [
        'The nodes must be split into **two sides with no conflict** inside a side: teams, enemies, two-party splits. A BFS or DFS gives each neighbour the opposite colour and stops at the first clash, so one pass over the edges decides the whole question.',
        'You must know whether the graph has an **odd-length cycle**: it is bipartite exactly when none exists, and the first same-coloured edge plus the BFS-tree paths above its two ends gives the cycle itself, with an odd number of edges.',
        'The input is a **dislike or conflict relation**, such as Possible Bipartition: people who dislike each other must be in different groups, so the question is whether a valid division into two groups exists at all, however many pairs conflict.',
        'The graph may be **disconnected**: start a fresh colouring from every uncoloured node, because each component picks its own first colour and the answer is true only if every component succeeds. Forgetting the outer loop over start nodes is the usual bug.',
        'You are preparing for **bipartite matching**, which needs the two sides known first: colour the graph, then match left nodes to right nodes with augmenting paths or max flow. Maximum Number of Accepted Invitations is a typical follow-up.',
      ],
      tip: 'Restart the colouring from every uncoloured node. Give each neighbour the opposite colour; if it already has the same colour as the current node, stop with false. In BFS, colour equals depth parity.',
      practice: [
        '785-is-graph-bipartite',
        { slug: '886-possible-bipartition', note: 'the same test as a dislike graph' },
        { slug: 'cp-find-an-odd-cycle', note: 'turn the clash into the explicit cycle' },
        lc('1042', 'Flower Planting With No Adjacent', 'Medium', 'flower-planting-with-no-adjacent', 'colouring with more than two colours'),
        lc('1820', 'Maximum Number of Accepted Invitations', 'Medium', 'maximum-number-of-accepted-invitations', 'matching needs the two sides'),
        lc('2493', 'Divide Nodes Into the Maximum Number of Groups', 'Hard', 'divide-nodes-into-the-maximum-number-of-groups', 'bipartite check, then BFS depth per component'),
      ],
    },
    meta: {
      useNote: 'Restart the colouring from every uncoloured node. Give each neighbour the opposite colour; if it already has the same colour as the current node, stop with false. In BFS, colour equals depth parity.',
      complexityNote: 'Each node is coloured once and each edge is checked from both ends, so time is O(V + E). The colour array holds O(V) and the queue or recursion stack at most O(V) more. The result never depends on the start colour.',
      highlight: ['two sides with no conflict', 'odd-length cycle', 'dislike or conflict relation', 'disconnected', 'bipartite matching'],
    },
  },

  'union-find-advanced': {
    tags: ['Weighted DSU', 'Ratios', 'Online', 'Rollback'],
    content: {
      whenToUse: [
        'Facts relate two items by a **quantity**, not just a yes: a / b = 2, or "same team" versus "different team". A weight on every link stores the ratio to the parent, so any two connected items compare through their leader.',
        'Connections arrive **online** and you must report the component count after each one: Number of Islands II adds one per new land cell and subtracts one per successful union, with no recount of the grid.',
        'You must **undo the latest merge**: offline dynamic connectivity, divide and conquer over time, or backtracking over a set of edges. Skip path compression, use union by size, and log each union on a stack so one pop restores one pointer.',
        '**Equalities and inequalities** must be checked together: merge everything that is related first, then test the not-equal pairs against the finished groups, because a later equality can still join two groups and flip an earlier verdict.',
        'Anything stored on a link must be **updated whenever the link changes**: path compression multiplies the skipped weights, parity labels add modulo two, and sizes are summed at the new leader. A structure that forgets this returns wrong ratios after the first compression.',
      ],
      tip: 'Anything attached to a link must change whenever the link is rewritten: path compression multiplies the skipped weights, while a rollback structure skips compression so each union changes exactly one pointer.',
      practice: [
        'cp-weighted-union-find-ratios',
        { slug: '305-number-of-islands-ii', note: 'online +1 per cell, -1 per merge' },
        { slug: 'cp-union-find-with-rollback', note: 'undo with a stack of unions' },
        { slug: '399-evaluate-division', note: 'the weighted-DSU version of the ratio queries' },
        { slug: '684-redundant-connection', note: 'plain DSU warm-up' },
        lc('990', 'Satisfiability of Equality Equations', 'Medium', 'satisfiability-of-equality-equations', 'merge on ==, then check !='),
        lc('721', 'Accounts Merge', 'Medium', 'accounts-merge', 'union accounts that share an email'),
        lc('947', 'Most Stones Removed with Same Row or Column', 'Medium', 'most-stones-removed-with-same-row-or-column', 'union rows with columns'),
      ],
    },
    meta: {
      complexityNote: 'Weighted find with path compression and union by size is near O(1) amortised, inverse-Ackermann. The rollback variant skips compression, so a find climbs O(log n) levels but each undo is O(1). Arrays take O(n) plus one stack entry per union.',
      highlight: ['quantity', 'online', 'undo the latest merge', 'Equalities and inequalities', 'updated whenever the link changes'],
    },
  },

  'tree-lca-binary-lifting': {
    tags: ['Tree', 'Ancestors', 'Jump pointers', 'LCA'],
    content: {
      whenToUse: [
        'You must repeatedly ask for the **k-th ancestor** of a node, or for the lowest common ancestor of two nodes. After O(n log n) preprocessing each query is O(log n) table jumps, one per set bit of k.',
        '**Distances and path properties** reduce to depth plus LCA: dist(u, v) = depth[u] + depth[v] − 2·depth[lca]. Edge counts, weights and colour counts along a path all start from the meeting node, so one LCA call unlocks many path questions.',
        'Walking up **one parent at a time** costs O(depth) per query, which is O(n) on a path-shaped tree and too slow for tens of thousands of queries; the jump table replaces k steps by at most log k lookups.',
        'The tree is **static and queries are many**, so the table is built once from the recurrence up[j][v] = up[j−1][up[j−1][v]] with the root pointing to itself, and every later query only reads it.',
        'You need an LCA that is **simple to code and answers online**, with no offline sorting as in Tarjan\'s algorithm. The two-phase routine, equalise depths then jump while ancestors differ, works for any query order.',
      ],
      practice: [
        '1483-kth-ancestor-of-a-tree-node',
        '236-lowest-common-ancestor',
        { slug: 'cp-lowest-common-ancestor-via-binary-lifting', note: 'equalise depths, then jump together' },
        { slug: 'cp-distance-between-two-nodes-in-a-tree', note: 'distance from depths and the LCA' },
        lc('235', 'Lowest Common Ancestor of a Binary Search Tree', 'Medium', 'lowest-common-ancestor-of-a-binary-search-tree', 'the BST shortcut, for contrast'),
        lc('1123', 'Lowest Common Ancestor of Deepest Leaves', 'Medium', 'lowest-common-ancestor-of-deepest-leaves', 'LCA of a set of nodes'),
        lc('2846', 'Minimum Edge Weight Equilibrium Queries in a Tree', 'Hard', 'minimum-edge-weight-equilibrium-queries-in-a-tree', 'LCA plus edge-weight counts per jump'),
      ],
    },
    meta: {
      complexityNote: 'log n rows of n entries, each built from the previous row, give O(n log n) preprocessing time and space. A query then costs one lookup per bit of k, or one per level for the LCA: O(log n).',
      highlight: ['k-th ancestor', 'Distances and path properties', 'one parent at a time', 'static and queries are many', 'simple to code and answers online'],
    },
  },

  'heavy-light-decomposition': {
    tags: ['Tree', 'Path queries', 'Chains', 'Segment tree'],
    content: {
      whenToUse: [
        'You need **path queries or path updates** on a tree (maximum, sum, add) and the tree is static. Cut the path into chain pieces; each piece is one consecutive range on a position array.',
        'Node or edge **values can change**, so a plain LCA table is not enough: a segment tree or Fenwick tree over the positions supports point updates and range queries, and HLD lifts it from arrays to trees.',
        'Climbing **one node at a time** is too slow on a deep tree, O(path length) per query. A root path crosses at most log n light edges, so only O(log n) chain pieces are ever cut.',
        'You want an **LCA with O(n) memory** and no jump table: move the node with the deeper chain head to the parent of its head until both heads agree, then the shallower node is the LCA.',
        'The decomposition is itself the question: **subtree sizes, heavy children, chain heads and positions**, with the heavy child numbered right after its parent so every chain is one consecutive block that later range queries can use directly.',
      ],
      tip: 'Number nodes by a DFS visiting the heavy child first so each chain is a consecutive block. Cut the deeper head\'s piece, hop to its parent, and finish with one range.',
      practice: [
        'cp-heavy-light-decomposition-chains',
        'cp-hld-path-maximum-query',
        'cp-lca-via-heavy-light-decomposition',
        { slug: 'cp-lowest-common-ancestor-via-binary-lifting', note: 'the O(n log n)-memory alternative for LCA' },
        { slug: '1483-kth-ancestor-of-a-tree-node', note: 'jump pointers instead of chains' },
        { slug: '236-lowest-common-ancestor', note: 'the same question on a binary tree, by plain DFS' },
        lc('2846', 'Minimum Edge Weight Equilibrium Queries in a Tree', 'Hard', 'minimum-edge-weight-equilibrium-queries-in-a-tree', 'path counts per query; chains can replace the jump table'),
      ],
    },
    meta: {
      useNote: 'Number nodes by a DFS visiting the heavy child first so each chain is a consecutive block. Cut the deeper head\'s piece, hop to its parent, and finish with one range.',
      complexityNote: 'Sizes, heavy children and positions are built in O(n). A path crosses O(log n) light edges, so it splits into O(log n) chain pieces, each answered in O(log n) by a segment tree: O(log² n) per query, O(n) space.',
      highlight: ['path queries or path updates', 'values can change', 'one node at a time', 'LCA with O(n) memory', 'subtree sizes, heavy children, chain heads and positions'],
    },
  },
};
