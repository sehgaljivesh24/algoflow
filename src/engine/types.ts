/**
 * Core data model.
 *
 * Every problem animation is described as a pure function: input -> Step[].
 * A Step is a complete, self-contained snapshot of what the UI should show, so
 * playback (play / pause / prev / next / scrub) is just "render steps[i]".
 * That makes rewinding free and keeps problem files free of any DOM code.
 */

export type CellState = 'compare' | 'swap' | 'sorted' | 'active' | 'found' | 'dim' | 'error';
export type Tone = 'blue' | 'orange' | 'green' | 'purple' | 'yellow' | 'red';
export type LogicTone = 'info' | 'warn' | 'success';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Cell {
  /** Stable identity across steps; lets the renderer slide a cell when it moves. */
  key: string | number;
  value: string | number;
  state?: CellState;
  /**
   * Optional colour group, drawn by the array / bars and grid renderers: which island a grid cell belongs to, which piece
   * of a partition a letter is in, which player took a number. It sets the cell's fill, border and text colour and wins
   * over the colour of `state`; the state still supplies the motion (lift / glow / fade) and an active, compare or swap
   * cell keeps a ring in its state colour, so the two read together. Use it for GROUPS, not for "what is happening now".
   */
  tone?: Tone;
}

export interface Pointer {
  id: string;
  label: string;
  /** Position in the scene's node/cell order. */
  index: number;
  tone: Tone;
}

/** Linked-list node. Visual order is fixed; `next` (a node key, or null) draws the arrows. */
export interface ListNodeVM {
  key: number;
  value: string | number;
  next: number | null;
  state?: CellState;
}

/** Binary-tree node, addressed by id; layout is computed by the renderer. */
export interface TreeNodeVM {
  id: number;
  value: string | number;
  left: number | null;
  right: number | null;
}

/** 'matrix' = free-standing square cells (boards, grids); 'table' = a ruled DP table with header row and column. Default: guessed from the headers. */
export type GridVariant = 'matrix' | 'table';

/** Everything besides plain arrays (arrays can use the Step.cells/pointers shorthand). */
export type Scene =
  | { kind: 'array'; cells: Cell[]; pointers: Pointer[]; bars?: boolean }
  | { kind: 'list'; nodes: ListNodeVM[]; pointers: Pointer[] }
  | {
      kind: 'tree';
      nodes: TreeNodeVM[];
      root: number | null;
      states: Record<number, CellState>;
      labels: Record<number, string>;
      /** Optional non-tree links drawn as dashed arrows (e.g. Morris-traversal threads, LCA jumps). from/to are node ids. */
      extraEdges?: { from: number; to: number; label?: string }[];
    }
  | { kind: 'grid'; rows: Cell[][]; rowHeads?: string[]; colHeads?: string[]; variant?: GridVariant }
  | GraphScene
  | IntervalsScene
  | TrieScene
  | NTreeScene
  | PlaneScene
  | SplitScene;

/**
 * Scene: two or more scenes side by side (they wrap onto separate rows on narrow screens), e.g. a board (grid) next
 * to a trie. `parts` may hold any scene kind except another split; pointers inside parts index into that part only.
 */
export interface SplitScene {
  kind: 'split';
  parts: Scene[];
  /** true = parts are stacked top to bottom, each at full width (a tree above an array row, a tree above a table). */
  stack?: boolean;
}

/* ------------------------------------------------------------------ graph */

/** Visual state of a graph edge. 'visited' = already traversed, 'chosen' = part of the answer (tree / path), 'error' = rejected (red). */
export type EdgeState = 'default' | 'active' | 'visited' | 'chosen' | 'dim' | 'error';

/**
 * Graph node. `id` must be unique (usually 0..n-1). `label` is the text inside the circle (defaults to the id).
 * `tag` is a small chip drawn under the node for per-node data such as "d=4" or "parent=2".
 * `tone` colours the node (e.g. one colour per union-find component); a `state` takes precedence over it.
 * `x`/`y` are optional fixed coordinates in the 0..1 unit square; they are used only when EVERY node has both.
 */
export interface GraphNodeVM {
  id: number;
  label?: string | number;
  state?: CellState;
  tone?: Tone;
  tag?: string;
  x?: number;
  y?: number;
}

/** Graph edge between node ids. Undirected unless `directed`. `weight` is drawn as a pill on the edge. */
export interface GraphEdgeVM {
  from: number;
  to: number;
  weight?: number | string;
  directed?: boolean;
  state?: EdgeState;
}

/**
 * Scene: a small graph (readable up to ~10 nodes).
 *  - nodes / edges: see above. Parallel or opposite edges between the same two nodes are drawn as separate arcs.
 *  - layout: automatic layout when nodes have no fixed x/y. 'circle' (default) places nodes round an ellipse in id
 *    order; 'layered' places left-to-right layers (longest-path layers for a DAG, otherwise BFS depth from node 0).
 *  - pointers: chips above nodes; `index` is the position in `nodes` (same convention as list scenes).
 */
export interface GraphScene {
  kind: 'graph';
  nodes: GraphNodeVM[];
  edges: GraphEdgeVM[];
  layout?: 'circle' | 'layered';
  pointers?: Pointer[];
}

/* -------------------------------------------------------------- intervals */

/**
 * One horizontal bar covering [start, end] on a shared numeric axis.
 * `row` pins bars to lanes (e.g. meeting rooms) but only takes effect when EVERY bar in the group sets it;
 * otherwise the renderer packs bars greedily by start time.
 */
export interface IntervalBarVM {
  id: number | string;
  start: number;
  end: number;
  label?: string;
  state?: CellState;
  tone?: Tone;
  row?: number;
}

/**
 * Scene: interval bars on a timeline.
 *  - bars: the input intervals, drawn in lanes (packed so bars that overlap never share a lane).
 *  - result: optional second group drawn below a divider (merged intervals, the kept set, ...), packed independently.
 *  - marker: optional vertical sweep line at x = `at`, with a small caption.
 *  - axis: optional fixed axis range; defaults to the min/max of everything drawn.
 *  - rowLabels: optional lane captions for `bars` (index = row), e.g. "room 1".
 */
export interface IntervalsScene {
  kind: 'intervals';
  bars: IntervalBarVM[];
  result?: IntervalBarVM[];
  resultLabel?: string;
  marker?: { at: number; label?: string };
  axis?: { min: number; max: number };
  rowLabels?: string[];
}

/* ------------------------------------------------------------------- trie */

/**
 * Trie node. `char` is the letter on the edge FROM its parent (use '' for the root). `children` are node ids drawn
 * left-to-right in the given order (sort them alphabetically for a canonical picture). `end` marks end-of-word
 * (drawn with a double ring). `label` is an optional chip beside the node (e.g. the stored word or a count).
 */
export interface TrieNodeVM {
  id: number;
  char: string;
  children: number[];
  end?: boolean;
  state?: CellState;
  label?: string;
  /** Optional text drawn inside the circle instead of the edge character (e.g. a state number such as "3" in an automaton). */
  text?: string;
}

/**
 * Scene: an n-ary trie with a deterministic tidy-tree layout.
 *  - nodes: every node (the root included); `root` is its id.
 *  - path: node ids (root first) whose connecting edges are highlighted as the active path.
 */
export interface TrieScene {
  kind: 'trie';
  nodes: TrieNodeVM[];
  root: number;
  path?: number[];
  /**
   * Extra dashed arrows between node ids (failure / suffix links of an Aho-Corasick automaton, ...). `state` colours
   * one ('active' blue, 'found' green, 'error' red, 'dim' faint, anything else orange).
   * A node whose `char` has MORE than one character (a compressed trie / suffix tree) draws that text as a pill on its
   * incoming edge, and the circle shows `text` (or a plain dot).
   */
  links?: { from: number; to: number; label?: string; state?: CellState }[];
  /** Where a node's `label` chip sits: 'right' of the circle (default) or 'below' it (dense rows of leaves). */
  labelPos?: 'right' | 'below';
}

/* ------------------------------------------------------------------ n-ary tree */

/**
 * Node of a general rooted tree (`ntree` scene). `id` is unique. `children` are drawn left to right in the given order.
 *  - label: main text inside the node (defaults to the id). sub: a second, smaller line inside the node (a range such
 *    as "[0,3]"). tag: an orange chip under the node (a stored value: "sum=10", "depth=2", "lazy=+3").
 *  - state: usual cell-state colouring. tone: colour group (a chain, a component) used when there is no state.
 *  - edgeLabel: small pill on the edge from the parent. heavy: draws the edge from the parent thick (a heavy edge).
 *  - x / y: optional fixed position in the 0..1 unit square. Used only when EVERY node has both; that also lets a node
 *    have several parents (a DAG such as the shared nodes of a persistent tree) because edges come from `children`.
 */
export interface NTreeNodeVM {
  id: number;
  label?: string | number;
  sub?: string;
  tag?: string;
  children: number[];
  state?: CellState;
  tone?: Tone;
  edgeLabel?: string;
  heavy?: boolean;
  x?: number;
  y?: number;
}

/**
 * Scene `ntree`: a general rooted tree with a deterministic tidy layout (leaves take consecutive columns, a parent sits
 * above the middle of its children), or fixed positions when every node has x and y.
 *  - nodes / root: every node and the root id.
 *  - shape: 'circle' (default, short labels) or 'box' (rounded rectangle sized to fit label + sub, for ranges and values).
 *  - path: node ids (consecutive pairs must be parent -> child edges) whose edges are drawn as the active path.
 *  - extraEdges: dashed curved arrows between node ids (binary-lifting jumps, links to an ancestor); tone defaults to orange.
 *  - pointers: chips above nodes; `index` is the position in `nodes` (same convention as list / graph scenes).
 */
export interface NTreeScene {
  kind: 'ntree';
  nodes: NTreeNodeVM[];
  root: number;
  shape?: 'circle' | 'box';
  path?: number[];
  extraEdges?: { from: number; to: number; label?: string; tone?: Tone }[];
  pointers?: Pointer[];
  /** Fixed-position mode only: pins the canvas width to this many node columns, so the picture stays still while nodes appear step by step. */
  cols?: number;
}

/* ------------------------------------------------------------------ plane */

/**
 * A labelled point of a `plane` scene at data coordinates (x, y) (y grows upwards, like a maths plot). `id` is unique.
 * `label` defaults to the id; `state` / `tone` colour the dot like graph nodes.
 */
export interface PlanePointVM {
  id: number;
  x: number;
  y: number;
  label?: string;
  state?: CellState;
  tone?: Tone;
}

/**
 * Scene `plane`: points in a 2-D coordinate plane with optional segments, a polygon outline and a sweep line.
 *  - points: the dots; the view box fits ALL points (plus margin), so keep the point set constant across steps.
 *  - segments: straight lines between point ids. state 'default' faint, 'active' blue (the candidate being tested),
 *    'chosen' green (kept: hull edge), 'error' red (rejected), 'dim' dashed faint. `label` is a pill at its middle.
 *  - polygon: point ids in order, drawn as a tinted outline (e.g. the hull so far); `closed` (default true) joins last to first.
 *  - sweep: a dashed line at x = at (axis 'x', default) or y = at (axis 'y') with a caption.
 *  - pointers: chips above points; `index` is the position in `points`.
 *  - grid: false hides the background grid and axis ticks (default true).
 */
export interface PlaneScene {
  kind: 'plane';
  points: PlanePointVM[];
  segments?: { from: number; to: number; state?: EdgeState; label?: string; arrow?: boolean }[];
  polygon?: { ids: number[]; closed?: boolean; state?: CellState };
  sweep?: { at: number; axis?: 'x' | 'y'; label?: string };
  pointers?: Pointer[];
  grid?: boolean;
}

/** A side panel next to the main picture: a stack, a queue or a hash map. */
export interface Aux {
  title: string;
  kind: 'stack' | 'queue' | 'map' | 'list';
  /** For a stack, the LAST item is the top. For a map each item is "key → value". */
  items: string[];
  highlight?: number;
  /**
   * Optional (pattern pages): indexes of items that break the rule right now, e.g. a character whose count is 2 in a
   * "no duplicates" window. They are drawn in the warning colour. An item of the form `'p' ×2` shows the `×2` smaller.
   */
  bad?: number[];
}

export interface Step {
  title: string;
  desc: string;
  /** Array shorthand. Ignored when `scene` is set. */
  cells?: Cell[];
  pointers?: Pointer[];
  scene?: Scene;
  aux?: Aux[];
  /** Values for the "Variables" panel, keyed by ProblemDef.varLabels. */
  vars: Record<string, string | number>;
  logic: string;
  logicTone: LogicTone;
  /** 0-based line indexes to highlight in each language. */
  javaLines: number[];
  pyLines: number[];
  /** Which entry of ProblemDef.algorithm is "current". */
  algoStep: number;
  result?: { title: string; text: string };
  /**
   * Optional, pattern pages only: uppercase prefix of the narration bar, e.g. `EXPAND` renders "EXPAND: <desc>". A tag that
   * already ends in punctuation or a symbol (`BUILDING —`, `✅ Done!`) is shown as written. When a tag is set the bar shows
   * the tag plus `desc` (put the concrete values in `desc`); without a tag it shows `title — desc` as before.
   */
  tag?: string;
  /** Optional, pattern pages only: comment with the concrete values, appended to the executed code line (`// 8 + 1 − 2 = 7`). Give it without the slashes. */
  note?: string;
  /** Optional, pattern pages only: warning banner above the picture for this step (a leading ⚠ is added for you). Also turns the window frame orange. */
  alert?: string;
}

/** Colour of a phase chip on pattern pages: blue = build / setup, cyan = work, green = expand / done, orange = shrink / problem, gold = record / update. */
export type PhaseTone = 'blue' | 'cyan' | 'green' | 'orange' | 'gold';

/** One chip of the phase bar on a pattern page. */
export interface Phase {
  icon: string;
  label: string;
  tone: PhaseTone;
}

export interface Example<I> {
  label: string;
  input: I;
  output: string;
  /** Optional, pattern pages only: the text after "Answer:" when it should say more than the bare output (e.g. 3 (substring "wke", indices 2–4)). */
  answer?: string;
}

export interface ProblemDef<I> {
  slug: string;
  /** LeetCode number, or a short label like "GFG" for non-LeetCode problems. */
  id: string;
  title: string;
  difficulty: Difficulty;
  category: string;
  /** Technique, e.g. "two pointers". */
  tag: string;
  statement: string;
  constraints: string;
  examples: Example<I>[];
  inputPlaceholder: string;
  /** Throws an Error with a user-friendly message on bad input. */
  parseInput: (raw: string) => I;
  buildSteps: (input: I) => Step[];
  viz: 'cells' | 'bars';
  legend: { label: string; state: CellState }[];
  varLabels: string[];
  approach: { title: string; text: string };
  java: string[];
  python: string[];
  algorithm: string[];
  complexity: { label: string; value: string }[];
  why: string;
  /** Optional title of the picture card (defaults to a name derived from the scene kind). */
  vizTitle?: string;
  /** Optional mono caption above the picture, e.g. "nums[] - current state". */
  vizCaption?: string;
  /** Optional article text: why the brute-force approach is too slow. */
  naive?: string;
  /**
   * Optional, pattern pages only: one chip per phase of the animation, in the order of `algorithm`; `Step.algoStep` picks
   * the highlighted chip, so include a final `✅ Done` entry if the last step should light one up. No chip is lit on the
   * very first step. Without `phases` the chips are derived from `algorithm` (plus a trailing Done chip).
   */
  phases?: Phase[];
  /** Optional, pattern pages only: words of `statement` to print in bold accent colour (case-insensitive). Names of the example's input fields (`nums`, `k`, `s`) are emphasised automatically. */
  emphasis?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyProblem = ProblemDef<any>;

/** todo = not set; matches the reference's status menu (In progress / Practice pending / Solved / Needs revision). */
export type Status = 'todo' | 'progress' | 'pending' | 'solved' | 'revise';
