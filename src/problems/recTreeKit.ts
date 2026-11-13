/**
 * Recursion-tree helper for the backtracking pattern pages (no UI code).
 *
 * A backtracking algorithm is run TWICE through `twoPass`: the first run only discovers the shape of the call tree
 * (every `enter` / `leaf` creates a node), the second run replays the same calls and records steps while the nodes
 * change state. That way the finished tree can be drawn from the first step on, with the calls that have not happened
 * yet faded out. Trees with more than GROW_AT nodes are drawn "focused" instead (open calls + their children; finished
 * subtrees collapse to their root), to stay readable and under the 40-node scene limit.
 */
import type { Cell, NTreeNodeVM, NTreeScene, Scene } from '../engine/types.ts';

export type RecState = 'idle' | 'open' | 'done' | 'found' | 'pruned';

export interface RecNode {
  id: number;
  label: string;
  sub?: string;
  /** Text on the edge from the parent (the element that was chosen). */
  edge?: string;
  parent: number | null;
  children: number[];
  /** One-line description of the call for the call-stack panel. */
  call: string;
}

interface NodeOpts { sub?: string; edge?: string; call?: string }

const GROW_AT = 40;

export class RecTree {
  readonly nodes: RecNode[];
  private readonly replay: boolean;
  private readonly st = new Map<number, RecState>();
  private readonly stack: number[] = [];
  private cursor = 0;

  constructor(shape?: RecNode[]) {
    this.replay = !!shape;
    this.nodes = shape ? shape.map((n) => ({ ...n, children: [...n.children] })) : [];
  }

  private make(label: string, o: NodeOpts): number {
    const parent = this.stack.length ? this.stack[this.stack.length - 1] : null;
    if (this.replay) {
      const n = this.nodes[this.cursor++];
      n.label = label;
      n.sub = o.sub;
      n.edge = o.edge;
      n.call = o.call ?? label;
      return n.id;
    }
    const id = this.nodes.length;
    this.nodes.push({ id, label, sub: o.sub, edge: o.edge, parent, children: [], call: o.call ?? label });
    if (parent !== null) this.nodes[parent].children.push(id);
    return id;
  }

  /** A call starts: the node becomes the top of the call stack. */
  enter(label: string, o: NodeOpts = {}): number {
    const id = this.make(label, o);
    this.stack.push(id);
    this.st.set(id, 'open');
    return id;
  }

  /** A child that is never expanded: a pruned candidate (state 'pruned') or a complete answer (state 'found'). */
  leaf(label: string, state: 'pruned' | 'found' | 'done', o: NodeOpts = {}): number {
    const id = this.make(label, o);
    this.st.set(id, state);
    return id;
  }

  /** The current call returns. */
  leave(): void {
    const id = this.stack.pop();
    if (id !== undefined && this.st.get(id) === 'open') this.st.set(id, 'done');
  }

  /** Marks a node (usually the call on top of the stack) as a complete answer. */
  found(id: number): void {
    this.st.set(id, 'found');
  }

  /** Changes the text of an existing node, e.g. to show the answer it returned. */
  relabel(id: number, o: { label?: string; sub?: string }): void {
    const n = this.nodes[id];
    if (!n) return;
    if (o.label !== undefined) n.label = o.label;
    if (o.sub !== undefined) n.sub = o.sub;
  }

  get top(): number {
    return this.stack.length ? this.stack[this.stack.length - 1] : -1;
  }

  get depth(): number {
    return this.stack.length;
  }

  /** Items for a call-stack panel (the last one is the top). */
  callStack(): string[] {
    return this.stack.map((id) => this.nodes[id].call);
  }

  /** `hot`: a leaf to highlight as the edge currently examined (drawn as part of the active path). */
  scene(hot?: number): NTreeScene {
    const grow = this.nodes.length > GROW_AT;
    // big trees: show only the open calls and the children of open calls; finished subtrees collapse to their root (keeps <= 40 nodes)
    const open = new Set(this.stack.length ? this.stack : [0]);
    const visible = (id: number) => !grow || id === 0 || open.has(this.nodes[id].parent ?? -1);
    const nodes: NTreeNodeVM[] = this.nodes.filter((n) => visible(n.id)).map((n) => {
      const s = this.st.get(n.id) ?? 'idle';
      const onStack = this.stack.includes(n.id);
      const state: NTreeNodeVM['state'] =
        s === 'found' ? 'found' : s === 'pruned' ? 'error' : onStack ? (n.id === this.top ? 'active' : 'compare') : s === 'done' ? 'swap' : 'dim';
      return { id: n.id, label: n.label, sub: n.sub, edgeLabel: n.edge, children: n.children.filter(visible), state };
    });
    const path = [...this.stack];
    if (hot !== undefined && this.nodes[hot]?.parent === this.top) path.push(hot);
    return { kind: 'ntree', nodes, root: 0, shape: 'box', path };
  }
}

/** Runs `run` twice: once to learn the call tree, once (with the tree known) to record the steps. */
export function twoPass<T>(run: (t: RecTree) => T): T {
  const probe = new RecTree();
  run(probe);
  return run(new RecTree(probe.nodes));
}

/** Array row below, recursion tree on top (stacked). */
export function treeOverArray(tree: NTreeScene, cells: Cell[], pointers: { id: string; label: string; index: number; tone: 'blue' | 'orange' | 'green' | 'purple' | 'yellow' | 'red' }[]): Scene {
  return { kind: 'split', stack: true, parts: [tree, { kind: 'array', cells, pointers }] };
}
