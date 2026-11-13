import type { PatternPack, PackProblem, PatternExample } from './types.ts';
import type { PatternContent, PracticeItem } from '../patterns.ts';
import type { PatternMeta } from '../patternMeta.ts';

const g = (id: string, title: string, difficulty: PackProblem['difficulty'], tag: string): PackProblem => ({ id, title, difficulty, tag, category: 'Graph' });

/** Pack p5 — graphs. New problem entries (the animations live in src/problems/groups/pack5*.ts). */
const problems: PackProblem[] = [
  // sub-group a: union-find + spanning trees
  g('990', 'Satisfiability of Equality Equations', 'Medium', 'union-find on letters'),
  g('1319', 'Number of Operations to Make Network Connected', 'Medium', 'union-find, spare cables'),
  g('CP', "Prim's MST with a Heap", 'Medium', "Prim's, lazy heap"),
  g('1168', 'Optimize Water Distribution in a Village', 'Hard', 'MST with a virtual node'),
  g('1135', 'Connecting Cities With Minimum Cost', 'Medium', "Kruskal's MST"),
  g('CP', 'Max Spacing K-Clustering (Kruskal)', 'Medium', 'Kruskal stopped early'),
  g('1489', 'Find Critical and Pseudo-Critical Edges in Minimum Spanning Tree', 'Hard', 'Kruskal with forced / banned edges'),
  // sub-group b: DFS, topo sort, shortest paths
  g('547', 'Number of Provinces', 'Medium', 'DFS components'),
  g('269', 'Alien Dictionary', 'Hard', 'derive edges + topo sort'),
  g('310', 'Minimum Height Trees', 'Medium', 'peel leaves'),
  g('1514', 'Path with Maximum Probability', 'Medium', 'Dijkstra, max-heap'),
  g('1631', 'Path With Minimum Effort', 'Medium', 'grid Dijkstra, bottleneck'),
  g('ALG', 'Bellman-Ford Shortest Paths (Negative Edges)', 'Medium', 'Bellman-Ford rounds'),
  g('CP', 'Negative Cycle Detection (Currency Arbitrage)', 'Medium', 'Bellman-Ford, extra round'),
  // sub-group c: Floyd-Warshall + max flow
  g('ALG', 'Floyd-Warshall All-Pairs Shortest Paths', 'Medium', 'intermediate-node DP'),
  g('1334', 'Find the City With the Smallest Number of Neighbors at a Threshold Distance', 'Medium', 'Floyd-Warshall'),
  g('CP', 'Transitive Closure (Warshall Reachability)', 'Medium', 'boolean Floyd-Warshall'),
  g('ALG', 'Max Flow (Edmonds-Karp)', 'Hard', 'BFS augmenting paths'),
  g('CP', 'Maximum Bipartite Matching (Flow)', 'Medium', 'matching as max flow'),
  g('CP', 'Minimum Cut from Max Flow', 'Hard', 'max-flow min-cut'),
  // sub-group d: bridges + bipartite
  g('1192', 'Critical Connections in a Network', 'Hard', 'Tarjan bridges'),
  g('ALG', 'Articulation Points (Cut Vertices)', 'Hard', 'Tarjan low-link'),
  g('CP', 'Strongly Connected Components (Tarjan)', 'Hard', 'low-link + stack'),
  g('785', 'Is Graph Bipartite?', 'Medium', 'BFS 2-colouring'),
  g('886', 'Possible Bipartition', 'Medium', 'DFS 2-colouring'),
  g('CP', 'Find an Odd Cycle', 'Medium', 'colouring conflict witness'),
];

/** External (non-catalog) practice row; the LeetCode URL is derived from the slug. */
const lc = (id: string, title: string, difficulty: PracticeItem['difficulty'], slug: string, note?: string): PracticeItem => ({
  id, title, difficulty, note, href: `https://leetcode.com/problems/${slug}/`,
});

const groups: PatternPack['groups'] = [
  {
    name: 'Graph',
    cards: [
      { slug: 'graph-dfs', group: 'Graph', title: 'DFS: Components & Cycle Detection', tags: ['Components', 'Cycle detection', 'Recursion'], complexity: 'O(V + E) / O(V)' },
      { slug: 'graph-kruskal', group: 'Graph', title: "Kruskal's Minimum Spanning Tree", tags: ['MST', 'Sort edges', 'Union-Find'], complexity: 'O(E log E) / O(V)' },
      { slug: 'graph-floyd-warshall', group: 'Graph', title: 'Floyd-Warshall (All Pairs)', tags: ['All-pairs', 'Dense graph', 'DP'], complexity: 'O(V³) / O(V²)' },
      { slug: 'graph-bridges', group: 'Graph', title: 'Bridges & Articulation Points', tags: ['Tarjan', 'Low-link', 'Critical links'], complexity: 'O(V + E) / O(V)' },
      { slug: 'graph-max-flow', group: 'Graph', title: 'Max Flow (Edmonds-Karp)', tags: ['Flow network', 'Matching', 'Min cut'], complexity: 'O(V·E²) / O(V + E)' },
      { slug: 'graph-bipartite', group: 'Graph', title: 'Bipartite Check (2-Colouring)', tags: ['Colouring', 'Odd cycle', 'BFS / DFS'], complexity: 'O(V + E) / O(V)' },
    ],
  },
];

const content: Record<string, PatternContent> = {
  'graph-dfs': {
    animation: '547-number-of-provinces',
    summary: 'Walk as deep as possible along one edge before backing up. One DFS from an unvisited node finds exactly one connected component, and colouring nodes by "on the current path" exposes cycles.',
    whenToUse: [
      'You must count, label or measure the connected components of a graph',
      'You need to know whether a graph has a cycle, in an undirected graph (ignore the parent) or a directed one (watch for a node still on the path)',
      'The answer is built while returning from recursion (reachability, safe nodes, all paths)',
      'You do not need shortest distances, only "can I get there" or "what does this region contain"',
    ],
    tip: 'Keep a visited array outside the loop over start nodes and count how many times the outer loop launches a DFS. For directed cycles use three states (new, on path, finished): meeting an "on path" node is the cycle.',
    template: `static int countComponents(int n, List<List<Integer>> graph) {   // graph.get(u) = neighbours of u
    boolean[] seen = new boolean[n];
    int components = 0;

    // ── Phase 1: every unvisited start opens a new component ──
    for (int start = 0; start < n; start++) {
        if (seen[start]) continue;
        components++;
        dfs(graph, start, seen);                         // paints the whole component
    }
    return components;                                   // O(V + E) time, O(V) space
}

static void dfs(List<List<Integer>> graph, int node, boolean[] seen) {
    seen[node] = true;
    for (int next : graph.get(node)) {
        if (!seen[next]) dfs(graph, next, seen);
    }
}

// ── Directed cycle test: state 0 = new, 1 = on the current path, 2 = finished ──
static boolean hasCycle(List<List<Integer>> graph, int node, int[] state) {
    state[node] = 1;
    for (int next : graph.get(node)) {
        if (state[next] == 1) return true;               // back to the path: cycle
        if (state[next] == 0 && hasCycle(graph, next, state)) return true;
    }
    state[node] = 2;                                     // fully explored, safe
    return false;
}`,
    practice: [
      '547-number-of-provinces',
      '207-course-schedule',
      'gfg-is-graph-a-tree',
      lc('802', 'Find Eventual Safe States', 'Medium', 'find-eventual-safe-states', 'nodes that cannot reach a cycle'),
      lc('797', 'All Paths From Source to Target', 'Medium', 'all-paths-from-source-to-target', 'DFS with a path stack'),
      { slug: '133-clone-graph', note: 'DFS plus a map from old to new nodes' },
    ],
  },
  'graph-kruskal': {
    animation: '1135-connecting-cities-with-minimum-cost',
    summary: 'Sort all edges by weight and sweep through them, keeping an edge only when its endpoints are still in different groups. Union-find answers that question in near-constant time.',
    whenToUse: [
      'You need the cheapest set of edges that connects every node (a minimum spanning tree)',
      'The graph is given as an edge list and is sparse, so sorting the edges is cheap',
      'You want to stop early: k clusters, or "is it connected yet?", rather than finishing the whole tree',
      'You must reason about which edges are forced or forbidden in some optimal tree',
    ],
    tip: 'A kept edge is exactly one whose endpoints have different leaders. If you finish with fewer than n - 1 kept edges the graph is disconnected. Kruskal and Prim give the same total weight; choose Kruskal for edge lists, Prim for dense adjacency data.',
    template: `static int kruskal(int n, int[][] edges) {              // edges[i] = {u, v, weight}, nodes 0..n-1
    Arrays.sort(edges, (a, b) -> Integer.compare(a[2], b[2]));   // ── Phase 1: cheapest first ──
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;

    int total = 0, used = 0;
    // ── Phase 2: keep an edge only if it joins two different groups ──
    for (int[] e : edges) {
        int a = find(parent, e[0]), b = find(parent, e[1]);
        if (a == b) continue;                            // would close a cycle
        parent[a] = b;                                   // merge the groups
        total += e[2];
        if (++used == n - 1) break;                      // tree complete
    }
    return used == n - 1 ? total : -1;                   // -1 = graph not connected; O(E log E)
}

static int find(int[] parent, int x) {
    while (parent[x] != x) {
        parent[x] = parent[parent[x]];                   // path halving
        x = parent[x];
    }
    return x;
}`,
    practice: [
      '1135-connecting-cities-with-minimum-cost',
      '1584-min-cost-to-connect-all-points',
      '684-redundant-connection',
      '1168-optimize-water-distribution-in-a-village',
      '1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree',
      lc('1202', 'Smallest String With Swaps', 'Medium', 'smallest-string-with-swaps', 'union-find groups, sort inside each group'),
    ],
  },
  'graph-floyd-warshall': {
    animation: 'alg-floyd-warshall-all-pairs-shortest-paths',
    summary: 'Compute the shortest distance between every pair of nodes by allowing one more intermediate node at a time: dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]).',
    whenToUse: [
      'The question involves distances or reachability between many pairs of nodes, not just from one source',
      'The graph is small (a few hundred nodes at most) so V cubed is acceptable',
      'Edge weights may be negative (but no negative cycle)',
      'You need a full table for later queries: transitive closure, threshold counts, ratios',
    ],
    tip: 'The loop order matters: the intermediate node k must be the OUTERMOST loop. Initialise dist[i][i] = 0 and missing edges to a large value (halved to avoid overflow). A negative dist[i][i] at the end reveals a negative cycle.',
    template: `static int[][] floydWarshall(int n, int[][] edges) {   // edges[i] = {u, v, weight}, directed
    final int INF = Integer.MAX_VALUE / 2;                // half, so INF + INF does not overflow
    int[][] dist = new int[n][n];
    for (int[] row : dist) Arrays.fill(row, INF);
    for (int i = 0; i < n; i++) dist[i][i] = 0;
    for (int[] e : edges) dist[e[0]][e[1]] = Math.min(dist[e[0]][e[1]], e[2]);

    // ── Phase 1: k = the newest node allowed as a stop-over ──
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];  // going through k is shorter
                }
            }
        }
    }
    return dist;                                          // O(V^3) time, O(V^2) space
}`,
    practice: [
      'alg-floyd-warshall-all-pairs-shortest-paths',
      '1334-find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance',
      'cp-transitive-closure-warshall-reachability',
      lc('1462', 'Course Schedule IV', 'Medium', 'course-schedule-iv', 'prerequisite queries via transitive closure'),
      lc('2976', 'Minimum Cost to Convert String I', 'Medium', 'minimum-cost-to-convert-string-i', 'all-pairs over 26 letters'),
      { slug: '399-evaluate-division', note: 'ratios are path products; closure by FW works too' },
    ],
  },
  'graph-bridges': {
    animation: '1192-critical-connections-in-a-network',
    summary: 'During one DFS record when each node was first reached (disc) and the earliest node reachable from its subtree using at most one back edge (low). A tree edge u-v is a bridge when low[v] is still greater than disc[u].',
    whenToUse: [
      'You must find links whose failure would split the network (bridges / critical connections)',
      'You must find nodes whose removal disconnects the graph (articulation points / cut vertices)',
      'The graph is undirected and you need an answer in a single O(V + E) pass',
      'You need strongly connected components of a directed graph (the same low-link idea plus a stack)',
    ],
    tip: 'Skip the edge back to the parent when updating low. A child v can reach above u only through a back edge; if low[v] > disc[u] the subtree of v hangs by that one edge. For articulation points the test is low[v] >= disc[u] (and the root needs two children).',
    template: `static List<List<Integer>> bridges(int n, List<List<Integer>> graph) {
    int[] disc = new int[n], low = new int[n];
    Arrays.fill(disc, -1);
    List<List<Integer>> out = new ArrayList<>();
    int[] timer = {0};

    // ── Phase 1: one DFS per component fills disc[] and low[] ──
    for (int s = 0; s < n; s++) if (disc[s] == -1) dfs(graph, s, -1, disc, low, timer, out);
    return out;                                          // O(V + E) time, O(V) space
}

static void dfs(List<List<Integer>> g, int u, int parent, int[] disc, int[] low, int[] timer, List<List<Integer>> out) {
    disc[u] = low[u] = timer[0]++;                       // first-visit time
    for (int v : g.get(u)) {
        if (v == parent) continue;                       // do not walk straight back
        if (disc[v] == -1) {                             // tree edge
            dfs(g, v, u, disc, low, timer, out);
            low[u] = Math.min(low[u], low[v]);           // child's reach also counts for u
            if (low[v] > disc[u]) out.add(List.of(u, v)); // v cannot get above u: bridge
        } else {
            low[u] = Math.min(low[u], disc[v]);          // back edge to an ancestor
        }
    }
}`,
    practice: [
      '1192-critical-connections-in-a-network',
      'alg-articulation-points-cut-vertices',
      'cp-strongly-connected-components-tarjan',
      lc('1568', 'Minimum Number of Days to Disconnect Island', 'Hard', 'minimum-number-of-days-to-disconnect-island', 'an articulation point on a grid'),
      '684-redundant-connection',
    ],
  },
  'graph-max-flow': {
    animation: 'alg-max-flow-edmonds-karp',
    summary: 'Push as much as possible from a source to a sink through edges with capacities. Repeatedly find an augmenting path in the residual graph (BFS gives Edmonds-Karp) and push its bottleneck amount.',
    whenToUse: [
      'You have supplies and capacities and want the maximum amount that can be routed (pipes, traffic, bandwidth)',
      'The problem is an assignment or matching between two groups, which becomes flow with unit capacities',
      'You need the cheapest set of edges whose removal separates two nodes (max-flow = min-cut)',
      'Greedy path choices could block better routes, so earlier flow must be reversible',
    ],
    tip: 'Every edge u->v with capacity c also gets a reverse residual edge v->u that starts at 0 and grows as flow is pushed; pushing along it cancels earlier flow. Using BFS for the path guarantees at most V*E augmentations regardless of capacities.',
    template: `static int maxFlow(int n, int[][] cap, int source, int sink) {   // cap[u][v] = residual capacity
    int flow = 0;
    while (true) {
        // ── Phase 1: BFS for the shortest augmenting path in the residual graph ──
        int[] prev = new int[n];
        Arrays.fill(prev, -1);
        prev[source] = source;
        Queue<Integer> queue = new ArrayDeque<>();
        queue.add(source);
        while (!queue.isEmpty() && prev[sink] == -1) {
            int u = queue.poll();
            for (int v = 0; v < n; v++) {
                if (prev[v] == -1 && cap[u][v] > 0) { prev[v] = u; queue.add(v); }
            }
        }
        if (prev[sink] == -1) return flow;               // no path left: flow is maximum

        // ── Phase 2: push the bottleneck, update forward and reverse capacities ──
        int push = Integer.MAX_VALUE;
        for (int v = sink; v != source; v = prev[v]) push = Math.min(push, cap[prev[v]][v]);
        for (int v = sink; v != source; v = prev[v]) { cap[prev[v]][v] -= push; cap[v][prev[v]] += push; }
        flow += push;                                    // O(V * E^2) overall
    }
}`,
    practice: [
      'alg-max-flow-edmonds-karp',
      'cp-maximum-bipartite-matching-flow',
      'cp-minimum-cut-from-max-flow',
      lc('1820', 'Maximum Number of Accepted Invitations', 'Medium', 'maximum-number-of-accepted-invitations', 'bipartite matching'),
      lc('1947', 'Maximum Compatibility Score Sum', 'Medium', 'maximum-compatibility-score-sum', 'assignment between two groups'),
    ],
  },
  'graph-bipartite': {
    animation: '785-is-graph-bipartite',
    summary: 'Try to colour every node with one of two colours so that each edge joins different colours. BFS or DFS does it greedily; the first edge whose ends already share a colour proves an odd cycle.',
    whenToUse: [
      'The nodes must be split into two sides with no conflict inside a side (teams, enemies, two-party splits)',
      'You need to know whether a graph has an odd-length cycle',
      'The problem is a "dislike" or "conflict" relation and asks whether a valid division exists',
      'You are preparing for bipartite matching, which needs the two sides identified first',
    ],
    tip: 'The graph may be disconnected: start a new colouring from every uncoloured node. Colour the neighbour with the opposite colour; if it already has the same colour as the current node, stop with false.',
    template: `static boolean isBipartite(int n, List<List<Integer>> graph) {
    int[] color = new int[n];
    Arrays.fill(color, -1);                              // -1 = not coloured yet

    // ── Phase 1: colour each component starting from any uncoloured node ──
    for (int start = 0; start < n; start++) {
        if (color[start] != -1) continue;
        color[start] = 0;
        Queue<Integer> queue = new ArrayDeque<>();
        queue.add(start);

        // ── Phase 2: neighbours must take the opposite colour ──
        while (!queue.isEmpty()) {
            int u = queue.poll();
            for (int v : graph.get(u)) {
                if (color[v] == -1) { color[v] = 1 - color[u]; queue.add(v); }
                else if (color[v] == color[u]) return false;   // same colour on an edge: odd cycle
            }
        }
    }
    return true;                                         // O(V + E) time, O(V) space
}`,
    practice: [
      '785-is-graph-bipartite',
      '886-possible-bipartition',
      'cp-find-an-odd-cycle',
      lc('1042', 'Flower Planting With No Adjacent', 'Medium', 'flower-planting-with-no-adjacent', 'colouring with more than two colours'),
      lc('1820', 'Maximum Number of Accepted Invitations', 'Medium', 'maximum-number-of-accepted-invitations', 'matching needs the two sides'),
    ],
  },
};

const meta: Record<string, PatternMeta> = {
  'graph-dfs': {
    icon: '🧭', label: 'DFS',
    desc: 'Follow one path as deep as it goes, then back up. One DFS paints a whole component, and a path-state colouring exposes cycles.',
    useNote: 'Count how many times the outer loop starts a fresh DFS to get the components. For directed cycles keep three states: new, on path, finished.',
    complexityNote: 'Each node is entered once and each edge looked at once. The visited array and the recursion stack take O(V).',
    highlight: ['DFS', 'connected components', 'cycle', 'directed', 'on the current path'],
  },
  'graph-kruskal': {
    icon: '🌲', label: 'Kruskal',
    desc: 'Sort the edges and keep each one whose ends are still in different groups, until the groups have merged into a single tree.',
    useNote: 'The union-find test is the whole algorithm. Stop after n - 1 kept edges, or after the cluster count you want.',
    complexityNote: 'Sorting dominates at E log E; the union-find operations are close to constant each. Memory is O(V) beyond the edge list.',
    highlight: ["Kruskal", 'minimum spanning tree', 'cheapest set of edges', 'edge list', 'k clusters'],
  },
  'graph-floyd-warshall': {
    icon: '🧮', label: 'All pairs',
    desc: 'Grow the set of allowed stop-over nodes one at a time and let every pair improve its distance by going through the newcomer.',
    useNote: 'Keep k as the outer loop. Use a large-but-halved INF and read a negative diagonal as a negative cycle.',
    complexityNote: 'Three nested loops over V give V cubed time; the distance matrix is V squared.',
    highlight: ['every pair', 'all-pairs', 'V cubed', 'negative', 'transitive closure'],
  },
  'graph-bridges': {
    icon: '🔗', label: 'Bridges',
    desc: 'One DFS records discovery times and the earliest reachable ancestor (low-link). An edge whose subtree cannot climb above it is a bridge.',
    useNote: 'Ignore the parent edge when lowering low. Bridges test low[child] > disc[parent]; cut vertices test the non-strict version.',
    complexityNote: 'A single DFS touches every node and edge once. disc, low and the recursion stack are O(V).',
    highlight: ['bridges', 'critical connections', 'articulation points', 'low-link', 'single O(V + E) pass'],
  },
  'graph-max-flow': {
    icon: '🚰', label: 'Max flow',
    desc: 'Send flow along augmenting paths in the residual graph, with reverse edges that let later paths undo earlier choices.',
    useNote: 'Pick paths by BFS (Edmonds-Karp) for a capacity-independent bound. At the end the nodes still reachable from the source define a minimum cut.',
    complexityNote: 'At most V·E augmentations, each a BFS of O(E): O(V·E²) in total. The residual capacities need O(V + E).',
    highlight: ['maximum amount', 'capacities', 'matching', 'max-flow = min-cut', 'reversible'],
  },
  'graph-bipartite': {
    icon: '🎨', label: '2-colour',
    desc: 'Colour nodes with two colours so every edge crosses between them. A same-coloured edge is proof of an odd cycle.',
    useNote: 'Restart the colouring from every uncoloured node, since the graph may have several components.',
    complexityNote: 'Each node is coloured once and each edge checked once. The colour array and the queue (or stack) are O(V).',
    highlight: ['two sides', 'odd-length cycle', 'conflict', 'bipartite', 'valid division'],
  },
};

const ex = (slug: string, why: string): PatternExample => ({ slug, why });

const examples: Record<string, PatternExample[]> = {
  // ---------------------------------------------------------------- existing patterns
  'graph-union-find': [
    ex('684-redundant-connection', 'The classic cycle test: the first edge whose endpoints already share a leader closes the loop, so union-find doubles as an online cycle detector.'),
    ex('1319-number-of-operations-to-make-network-connected', 'Counts both sides of the same coin: the unions that fail are spare cables and the groups left over need that many links. Shows union-find as a component counter.'),
    ex('990-satisfiability-of-equality-equations', 'The nodes are letters and the edges are statements, not roads. Equalities are united first and inequalities are checked afterwards, so the order of the two passes matters.'),
  ],
  'graph-topo-sort': [
    ex('210-course-schedule-ii', 'The standard Kahn walk on a given prerequisite list: in-degrees, a ready queue, and a count that exposes a cycle.'),
    ex('269-alien-dictionary', 'The edges are not given. They have to be inferred from the first differing letter of neighbouring words before the same queue process can run, and a prefix mistake is another way to fail.'),
    ex('310-minimum-height-trees', 'The same peel-off-the-ready-nodes idea on an undirected tree: leaves play the role of zero in-degree and the last survivors are the best roots.'),
  ],
  'graph-dijkstra': [
    ex('743-network-delay-time', 'Plain Dijkstra with sums of non-negative times; the answer is the largest finished distance.'),
    ex('1514-path-with-maximum-probability', 'Maximising a product of probabilities with a max-heap shows that Dijkstra works for any monotone path value, not only for sums.'),
    ex('1631-path-with-minimum-effort', 'A grid where a path costs its single worst step. The distance combines with max instead of plus, which is the bottleneck variant of the same greedy.'),
  ],
  'graph-bellman-ford': [
    ex('787-cheapest-flights-within-k-stops', 'Rounds act as a hop budget: round r gives the best price using at most r flights, copied from the previous round.'),
    ex('alg-bellman-ford-shortest-paths-negative-edges', 'Negative edge weights, where Dijkstra would commit too early. Watch the distances settle round by round and stop once a round changes nothing.'),
    ex('cp-negative-cycle-detection-currency-arbitrage', 'One round more than needed: if something still improves, a negative cycle exists. A profitable currency-trading loop is exactly a cycle of negative total cost, and the animation reads the cycle off the parent pointers.'),
  ],
  'graph-prims': [
    ex('1584-min-cost-to-connect-all-points', 'Prim on a complete graph where edges are Manhattan distances, with an O(V squared) array instead of a heap.'),
    ex('cp-prims-mst-with-a-heap', 'The sparse-graph version: a lazy min-heap of candidate edges, with stale entries skipped when they surface.'),
    ex('1168-optimize-water-distribution-in-a-village', 'A virtual node turns wells into ordinary edges, so a problem with two kinds of costs becomes a minimum spanning tree.'),
  ],
  // ---------------------------------------------------------------- new patterns
  'graph-dfs': [
    ex('547-number-of-provinces', 'The basic use: loop over the nodes, start a DFS from each unvisited one and count how many starts were needed.'),
    ex('207-course-schedule', 'Directed cycle detection with three colours: meeting a node that is still on the current path means the prerequisites loop.'),
    ex('gfg-is-graph-a-tree', 'Undirected cycle detection needs the parent to be skipped, and a tree additionally requires that one DFS reaches every node.'),
  ],
  'graph-kruskal': [
    ex('1135-connecting-cities-with-minimum-cost', 'Kruskal in its pure form: sort, union-find, keep n - 1 edges, and report -1 if the cities cannot all be joined.'),
    ex('cp-max-spacing-k-clustering-kruskal', 'Stopping the algorithm early gives clusters: after n - k merges, the next edge that crosses two groups is the spacing.'),
    ex('1489-find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree', 'Re-run Kruskal with an edge banned or forced to learn whether it is in every, some, or no minimum tree.'),
  ],
  'graph-floyd-warshall': [
    ex('alg-floyd-warshall-all-pairs-shortest-paths', 'The whole distance table improving as each node is allowed as a stop-over, including a negative edge.'),
    ex('1334-find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance', 'Use the finished table: count, for every city, how many others lie within the threshold and pick the smallest count.'),
    ex('cp-transitive-closure-warshall-reachability', 'Replace min and plus with or and and: the same triple loop now computes who can reach whom.'),
  ],
  'graph-bridges': [
    ex('1192-critical-connections-in-a-network', 'Edge version: disc and low values decide which links are bridges in a single DFS.'),
    ex('alg-articulation-points-cut-vertices', 'The vertex version needs the non-strict comparison and a special rule for the DFS root.'),
    ex('cp-strongly-connected-components-tarjan', 'The same low-link idea on a directed graph, now with a stack that pops one strongly connected component at a time.'),
  ],
  'graph-max-flow': [
    ex('alg-max-flow-edmonds-karp', 'The core algorithm: BFS augmenting paths, bottleneck pushes and residual edges drawn as flow over capacity.'),
    ex('cp-maximum-bipartite-matching-flow', 'A matching is a flow in disguise: add a source and sink with unit capacities and the matched pairs are the edges that carry flow.'),
    ex('cp-minimum-cut-from-max-flow', 'After the flow is finished, the nodes still reachable in the residual graph mark the minimum cut, whose capacity equals the flow.'),
  ],
  'graph-bipartite': [
    ex('785-is-graph-bipartite', 'BFS two-colouring on an adjacency list, restarted from every uncoloured node for disconnected graphs.'),
    ex('886-possible-bipartition', 'The same test dressed as people who dislike each other, coloured with DFS instead of a queue.'),
    ex('cp-find-an-odd-cycle', 'When colouring fails, climb the parent links from both ends of the bad edge to show the odd cycle that blocks a split.'),
  ],
};

export const pack: PatternPack = { id: 'p5', problems, groups, content, meta, examples };
