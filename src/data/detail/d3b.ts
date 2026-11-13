import type { DetailMap } from './types.ts';

// Batch d3 part b: bfs-standard, bfs-multisource, grid-flood-fill, matrix-traversal (text overrides, merged by d3.ts).
export const d3b: DetailMap = {
  'bfs-standard': {
    tags: ['Shortest path', 'Level order', 'Queue + visited', 'Tree / graph'],
    content: {
      summary: 'Explore a graph or tree in rings around the start. A FIFO queue hands out nodes in order of distance, so the first time you reach a node is by a shortest route, and the queue length at the start of a round is exactly one level.',
      whenToUse: [
        'You need the **minimum number of steps, moves or edges** between two states in an unweighted graph: a route through a maze, the fewest word changes, the fewest knight jumps. The first time BFS reaches the target is by a shortest route, so nothing else needs checking.',
        'Results must be **grouped by level or depth**: level-order traversal, right-side view, zigzag order, the average of each level. Reading the queue size at the start of a round isolates one level, so the boundary costs nothing extra.',
        'The state space is an **implicit graph** that no input lists for you: words one letter apart, lock combinations, puzzle boards, grid positions. Generate the neighbours on the fly and mark every state when it is enqueued so none is expanded twice.',
        'DFS would find a path but you need the **shortest one**. DFS may dive down a very long branch first, while BFS expands rings of equal distance and stops at the first hit, never touching longer routes.',
        'The question is **reachability or connectivity** on a graph that may contain cycles, such as "is there a path from source to destination" or "which nodes are within k edges". A visited set stops cycles from looping, and the queue size shows how wide the frontier grows.',
      ],
      tip: 'Freeze the queue size at the start of each round and process exactly that many nodes; the round count is your distance. Mark a node visited when you enqueue it, not when you dequeue it.',
      practice: [
        '102-binary-tree-level-order-traversal',
        { slug: '199-binary-tree-right-side-view', note: 'last node of each level' },
        { slug: '637-average-of-levels-in-binary-tree', note: 'sum each level, divide by its size' },
        '1971-find-if-path-exists-in-graph',
        { slug: '127-word-ladder', note: 'implicit graph of words' },
        { id: '111', title: 'Minimum Depth of Binary Tree', difficulty: 'Easy', note: 'the first leaf found is the answer', href: 'https://leetcode.com/problems/minimum-depth-of-binary-tree/' },
        { id: '752', title: 'Open the Lock', difficulty: 'Medium', note: 'implicit graph of 4-digit states', href: 'https://leetcode.com/problems/open-the-lock/' },
        { id: '1091', title: 'Shortest Path in Binary Matrix', difficulty: 'Medium', note: 'grid BFS with 8 directions', href: 'https://leetcode.com/problems/shortest-path-in-binary-matrix/' },
      ],
    },
    meta: {
      useNote: 'Mark a node as visited when it is enqueued, not when it is dequeued, or duplicates flood the queue. The queue size at the start of a round is one level.',
      complexityNote: 'Every vertex is queued once and every edge examined once, so time is O(V + E). The visited set holds every vertex and the queue can hold a whole frontier, so space is O(V), as in a star graph.',
      highlight: ['minimum number of steps, moves or edges', 'grouped by level or depth', 'implicit graph', 'shortest one', 'reachability or connectivity'],
    },
  },

  'bfs-multisource': {
    tags: ['Many sources', 'Simultaneous wave', 'Nearest source', 'Time counter'],
    examples: [
      { slug: '994-rotting-oranges', why: 'Every rotten orange starts in the queue together, so each BFS level is one minute and the number of levels is the answer; the count of fresh oranges decides between a time and -1.' },
      { slug: '542-01-matrix', why: 'A per-cell wavefront: each popped cell stamps distance + 1 on its unknown neighbours while a time counter ticks up level by level, so every cell ends with its distance to the nearest 0.' },
      { slug: '417-pacific-atlantic-water-flow', why: 'The sources are the border cells of each ocean and the search runs uphill in reverse; the answer is the intersection of two multi-source searches.' },
    ],
    content: {
      summary: 'Seed the queue with every source at once. The wavefronts advance together, one ring per tick of the clock, so each cell is labelled with the distance to its nearest source in a single pass.',
      whenToUse: [
        'Many sources **spread at the same time** (fire, rot, infection, flood water, a rumour) and you need the time until everything is reached. Rotting Oranges is the classic: queue every rotten orange in round zero and each BFS round becomes one minute.',
        'Every cell needs its **distance to the nearest special cell**: the nearest 0 in 01 Matrix, the nearest land, gate or exit. All sources start together, so the first touch of a cell comes from its closest source and one pass fills the grid.',
        'Running one BFS per source would cost **O(sources × cells)**. A single combined search with all sources in the starting queue does the same job in O(cells), which is the whole reason this pattern exists.',
        'The answer is the **number of rounds until the wave dies**, or -1 when something stays unreachable. Keep a counter of targets not yet reached; if it is non-zero when the queue empties, a region is isolated and the answer is impossible.',
        'The sources sit on the **border or boundary of a region** and the search moves inward or uphill: Pacific Atlantic Water Flow and Surrounded Regions seed the queue with edge cells, then intersect or complement the reached sets.',
      ],
      tip: 'Count the targets you still need to reach before the loop and decrement as the wave touches them. If the counter is above zero when the queue empties, report impossible instead of the time.',
      practice: [
        '994-rotting-oranges',
        { slug: '542-01-matrix', note: 'all zeros are the sources' },
        { slug: '417-pacific-atlantic-water-flow', note: 'border cells of each ocean, climb uphill' },
        { slug: '130-surrounded-regions', note: 'seed from the border O cells' },
        { id: '1162', title: 'As Far from Land as Possible', difficulty: 'Medium', note: 'all land cells are the sources', href: 'https://leetcode.com/problems/as-far-from-land-as-possible/' },
        { id: '1765', title: 'Map of Highest Peak', difficulty: 'Medium', note: 'water cells start the wave at height 0', href: 'https://leetcode.com/problems/map-of-highest-peak/' },
        { id: '1020', title: 'Number of Enclaves', difficulty: 'Medium', note: 'flood inward from the border land', href: 'https://leetcode.com/problems/number-of-enclaves/' },
        { id: '934', title: 'Shortest Bridge', difficulty: 'Medium', note: 'DFS one island, then multi-source BFS to the other', href: 'https://leetcode.com/problems/shortest-bridge/' },
      ],
    },
    meta: {
      useNote: 'Count what is left to reach, decrement as the wave touches it, and report "impossible" if the queue dies first.',
      complexityNote: 'All sources are queued once, then every cell is enqueued at most once and checks four neighbours, so time is O(R×C) rather than O(sources × cells). The queue holds one frontier and the distance grid needs O(R×C).',
      highlight: ['spread at the same time', 'distance to the nearest special cell', 'O(sources × cells)', 'number of rounds until the wave dies', 'border or boundary of a region'],
    },
  },

  'grid-flood-fill': {
    tags: ['Connected regions', 'DFS / BFS', 'Mark on entry', '4 directions'],
    content: {
      summary: 'Treat a grid as a graph: from a cell, spread to its up, down, left and right neighbours and mark every cell you reach as visited. One flood covers exactly one connected region, so counting floods counts regions.',
      whenToUse: [
        'You must **count or label connected regions** in a matrix: islands, rooms, clusters of 1s, blobs of one colour. Scan every cell, start a flood on each unvisited region cell, and the number of floods is the region count.',
        'You must **measure a region** such as its area, its perimeter or the largest one. Let the recursion return 1 plus the areas of the four neighbours, or count the cells popped from a stack; one flood measures one region.',
        'Moves go **up, down, left and right** (sometimes eight directions) between cells that match: paint-bucket fill, Number of Islands, Max Area of Island. A direction array plus a bounds check makes all of them the same short loop.',
        'The regions of interest are found by **starting from the border**: whatever the border can reach is safe and the rest is enclosed. Surrounded Regions and Number of Enclaves flood inward from the edge cells instead of hunting for enclosed groups.',
        'Every cell should be processed **exactly once**, giving O(R×C) time with no repeated work. Mark a cell the moment you enter it, by writing into the grid or a seen array; without that mark the search loops forever.',
      ],
      tip: 'Mark a cell visited the moment you enter it, not when you leave, and test bounds before reading the cell. On a big grid switch from recursion to an explicit stack to avoid overflow.',
      practice: [
        { id: '733', title: 'Flood Fill', difficulty: 'Easy', note: 'the plain paint bucket', href: 'https://leetcode.com/problems/flood-fill/' },
        '200-number-of-islands',
        '695-max-area-of-island',
        { id: '463', title: 'Island Perimeter', difficulty: 'Easy', note: 'count land-water edges, no flood needed', href: 'https://leetcode.com/problems/island-perimeter/' },
        '130-surrounded-regions',
        { id: '1254', title: 'Number of Closed Islands', difficulty: 'Medium', note: 'islands that never touch the border', href: 'https://leetcode.com/problems/number-of-closed-islands/' },
        { id: '1020', title: 'Number of Enclaves', difficulty: 'Medium', note: 'count land left after a border flood', href: 'https://leetcode.com/problems/number-of-enclaves/' },
        { slug: '79-word-search', note: 'flood fill that also un-marks (backtracking)' },
      ],
    },
    meta: {
      useNote: 'Mark a cell the moment you step on it and test bounds first. Otherwise the search never terminates.',
      complexityNote: 'Each cell is entered once and checks four neighbours, so time is O(R×C). The recursion or explicit stack can grow to the size of the largest region, up to R×C cells when the whole grid is one island.',
      highlight: ['count or label connected regions', 'measure a region', 'up, down, left and right', 'starting from the border', 'exactly once'],
    },
  },

  'matrix-traversal': {
    tags: ['Spiral / diagonal', 'In place', 'Boundaries', 'Index identities'],
    content: {
      summary: 'Many matrix problems are about a movement rule rather than a clever algorithm: walk the rings of a spiral, ride the diagonals, rotate with two swap passes, or leave notes in the first row and column. The skill is keeping boundaries and directions exact.',
      whenToUse: [
        'The output order is a **pattern over the grid**: spiral, zigzag, diagonal, layer by layer. Spiral Matrix and Diagonal Traverse are pure simulation, so write the four walls or the bounce rule once and trust it for every shape.',
        'You must **transform a square matrix in place**: rotate 90 degrees, transpose, flip or reverse rows. Rotate Image splits into two swap passes (transpose, then reverse each row), so O(1) extra space is enough and no second matrix is ever allocated.',
        'Rows or columns must be **marked or cleared using the matrix itself** as storage. Set Matrix Zeroes writes its notes into the first row and column, then a second pass acts on them while two booleans remember what the note pad held.',
        'The coordinates satisfy a **simple identity**: r + c is constant along an anti-diagonal, and a clockwise turn sends (r, c) to (c, n-1-r). Spotting the identity replaces a long simulation by a short formula.',
        'Edge shapes decide correctness: **1×n, n×1 and 1×1 matrices** (and non-square ones) break most first attempts. Whenever walls shrink or a walk bounces, add guards for the collapsed ring and test those tiny inputs before the big ones.',
      ],
      tip: 'Write down the invariant for your walk (the four walls, or "diagonal d holds the cells with r + c = d") and test the 1×n, n×1 and 1×1 matrices; they break most first attempts.',
      practice: [
        '54-spiral-matrix',
        '59-spiral-matrix-ii',
        '498-diagonal-traverse',
        '48-rotate-image',
        '73-set-matrix-zeroes',
        { id: '867', title: 'Transpose Matrix', difficulty: 'Easy', note: 'the first half of Rotate Image, for any shape', href: 'https://leetcode.com/problems/transpose-matrix/' },
        { id: '289', title: 'Game of Life', difficulty: 'Medium', note: 'encode old and new state in the same cell', href: 'https://leetcode.com/problems/game-of-life/' },
        { id: '885', title: 'Spiral Matrix III', difficulty: 'Medium', note: 'spiral outward, skipping cells outside the grid', href: 'https://leetcode.com/problems/spiral-matrix-iii/' },
      ],
    },
    meta: {
      useNote: 'Pick the invariant first (four walls, r + c = d, transpose then reverse) and the loops follow. Check 1×n, n×1 and 1×1 inputs.',
      complexityNote: 'Every cell is read or written a constant number of times, so time is O(R×C). Spiral and diagonal walks need only a few index variables beside the output list, and rotate and zeroes work in place with O(1) extra space.',
      highlight: ['pattern over the grid', 'transform a square matrix in place', 'marked or cleared using the matrix itself', 'simple identity', '1×n, n×1 and 1×1 matrices'],
    },
  },
};
