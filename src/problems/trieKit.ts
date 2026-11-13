import type { CellState, TrieNodeVM, TrieScene } from '../engine/types';

/** Small mutable trie used to drive the `trie` scene. Children are kept in alphabetical order. */
export class TrieModel {
  nodes: TrieNodeVM[] = [{ id: 0, char: '', children: [], end: false }];

  child(id: number, ch: string): number | null {
    for (const c of this.nodes[id].children) if (this.nodes[c].char === ch) return c;
    return null;
  }

  /** Creates the child if needed and returns [id, created]. */
  ensure(id: number, ch: string): [number, boolean] {
    const have = this.child(id, ch);
    if (have !== null) return [have, false];
    const nid = this.nodes.length;
    this.nodes.push({ id: nid, char: ch, children: [], end: false });
    const kids = this.nodes[id].children;
    kids.push(nid);
    kids.sort((a, b) => (this.nodes[a].char < this.nodes[b].char ? -1 : 1));
    return [nid, true];
  }

  insert(word: string): void {
    let id = 0;
    for (const ch of word) id = this.ensure(id, ch)[0];
    this.nodes[id].end = true;
  }

  /** Snapshot as a scene. `states` colours nodes, `labels` adds chips, `path` highlights edges. */
  scene(path: number[] = [], states: Record<number, CellState> = {}, labels: Record<number, string> = {}): TrieScene {
    return {
      kind: 'trie', root: 0, path: [...path],
      nodes: this.nodes.map((n) => ({
        id: n.id, char: n.char, children: [...n.children], end: n.end || undefined,
        state: states[n.id], label: labels[n.id],
      })),
    };
  }
}
