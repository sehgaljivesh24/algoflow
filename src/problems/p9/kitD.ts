/**
 * Shared helpers of fragment d (suffix structures + Aho-Corasick). No UI code.
 * - parsing: a lowercase string, or "words ... | text"
 * - Aho: a small Aho-Corasick automaton that keeps the trie model, failure links and word lengths, and draws itself
 *   as a `trie` scene (failure links as dashed arrows, state numbers inside the circles).
 * - suffix helpers: sorted suffixes, brute-force LCP, a table scene.
 */
import type { Cell, CellState, TrieScene } from '../../engine/types.ts';
import { TrieModel } from '../trieKit.ts';

/* ------------------------------------------------------------------ parsing */

export function parseWord(raw: string, o: { min: number; max: number; what: string; example: string }): string {
  const s = raw.trim().toLowerCase();
  if (!/^[a-z]+$/.test(s)) throw new Error(`Enter ${o.what} using lowercase letters only, e.g. ${o.example}`);
  if (s.length < o.min) throw new Error(`${o.what} needs at least ${o.min} letters`);
  if (s.length > o.max) throw new Error(`Use at most ${o.max} letters for ${o.what}`);
  return s;
}

/** "he she his | ushers" -> words (deduplicated, in order) and text. */
export function parseWordsAndText(raw: string, o: { maxWords: number; maxWordLen: number; maxText: number; example: string; textName?: string }): { words: string[]; text: string } {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error(`Write the words, a bar, then the ${o.textName ?? 'text'}, e.g. ${o.example}`);
  const words = [...new Set(parts[0].split(/[\s,;]+/).filter(Boolean).map((w) => w.toLowerCase()))];
  if (words.length === 0) throw new Error(`Give at least one word before the bar, e.g. ${o.example}`);
  if (words.length > o.maxWords) throw new Error(`Use at most ${o.maxWords} different words`);
  for (const w of words) {
    if (!/^[a-z]+$/.test(w)) throw new Error(`"${w}" is not valid: words use lowercase letters only`);
    if (w.length > o.maxWordLen) throw new Error(`Keep every word to ${o.maxWordLen} letters or fewer ("${w}" is longer)`);
  }
  const text = parts[1].trim().toLowerCase();
  if (!/^[a-z]+$/.test(text)) throw new Error(`The ${o.textName ?? 'text'} after the bar must be lowercase letters only`);
  if (text.length > o.maxText) throw new Error(`Keep the ${o.textName ?? 'text'} to ${o.maxText} letters or fewer`);
  return { words, text };
}

/** Words only ("he she his hers"). */
export function parseWords(raw: string, o: { maxWords: number; maxWordLen: number; example: string }): string[] {
  const words = [...new Set(raw.split(/[\s,;]+/).filter(Boolean).map((w) => w.toLowerCase()))];
  if (words.length === 0) throw new Error(`Enter some words separated by spaces, e.g. ${o.example}`);
  if (words.length > o.maxWords) throw new Error(`Use at most ${o.maxWords} different words`);
  for (const w of words) {
    if (!/^[a-z]+$/.test(w)) throw new Error(`"${w}" is not valid: words use lowercase letters only`);
    if (w.length > o.maxWordLen) throw new Error(`Keep every word to ${o.maxWordLen} letters or fewer ("${w}" is longer)`);
  }
  return words;
}

/* --------------------------------------------------------------- Aho-Corasick */

export class Aho {
  trie = new TrieModel();
  /** per state (index = trie node id) */
  parent: number[] = [-1];
  depth: number[] = [0];
  fail: number[] = [0];
  /** length of the word that ends exactly at this state, 0 if none */
  wlen: number[] = [0];
  readonly words: string[] = [];

  insert(w: string): { ids: number[]; created: boolean[] } {
    this.words.push(w);
    let id = 0;
    const ids = [0];
    const created: boolean[] = [];
    for (const ch of w) {
      const [nid, made] = this.trie.ensure(id, ch);
      if (made) {
        this.parent[nid] = id;
        this.depth[nid] = this.depth[id] + 1;
        this.fail[nid] = 0;
        this.wlen[nid] = 0;
      }
      created.push(made);
      id = nid;
      ids.push(id);
    }
    this.trie.nodes[id].end = true;
    this.wlen[id] = w.length;
    return { ids, created };
  }

  child(id: number, ch: string): number | null {
    return this.trie.child(id, ch);
  }

  str(id: number): string {
    let s = '';
    for (let v = id; v > 0; v = this.parent[v]) s = this.trie.nodes[v].char + s;
    return s;
  }

  /** The failure link of a child (reached by `c` from `u`): the failure-chain nodes tried (starting at fail[u]) and the target. */
  failOf(u: number, c: string): { chain: number[]; target: number } {
    const chain: number[] = [];
    let f = this.fail[u];
    for (;;) {
      chain.push(f);
      if (this.child(f, c) !== null && this.depth[f] < this.depth[u]) return { chain, target: this.child(f, c)! };
      if (f === 0) return { chain, target: 0 };
      f = this.fail[f];
    }
  }

  /** Non-root states in BFS order (depth, then alphabetical children). */
  order(): number[] {
    const out: number[] = [];
    const q = [...this.trie.nodes[0].children];
    for (let h = 0; h < q.length; h++) {
      out.push(q[h]);
      q.push(...this.trie.nodes[q[h]].children);
    }
    return out;
  }

  /** Builds every failure link (no animation). */
  buildAll(): void {
    for (const v of this.order()) {
      const u = this.parent[v];
      this.fail[v] = u === 0 ? 0 : this.failOf(u, this.trie.nodes[v].char).target;
    }
  }

  /** Words that end at this state or at any state on its failure chain, longest first. */
  outputs(id: number): string[] {
    const out: string[] = [];
    for (let v = id; v !== 0; v = this.fail[v]) if (this.wlen[v] > 0) out.push(this.str(v));
    return out;
  }

  /** Transition used by the search: follow failure links until an edge exists. Returns the hops and the new state. */
  step(state: number, c: string): { hops: number[]; next: number } {
    const hops: number[] = [];
    let s = state;
    while (s !== 0 && this.child(s, c) === null) {
      s = this.fail[s];
      hops.push(s);
    }
    const nx = this.child(s, c);
    return { hops, next: nx === null ? 0 : nx };
  }

  /**
   * Scene. `done` = states whose failure link is known (those links are drawn dashed; links into the root are left out
   * to keep the picture calm unless they are `hot`). `hot` is one extra highlighted link.
   */
  scene(o: { done?: number[]; hot?: { from: number; to: number; state: CellState }; states?: Record<number, CellState>; labels?: Record<number, string>; path?: number[]; showEnds?: boolean } = {}): TrieScene {
    const states = o.states ?? {};
    const labels = o.labels ?? {};
    const base = this.trie.scene(o.path ?? [], states, labels);
    base.nodes = base.nodes.map((n) => ({ ...n, text: n.id === 0 ? '0' : String(n.id) }));
    const links = (o.done ?? [])
      .filter((v) => this.fail[v] !== 0 && !(o.hot && o.hot.from === v))
      .map((v) => ({ from: v, to: this.fail[v], state: 'dim' as CellState }));
    if (o.hot) links.push({ from: o.hot.from, to: o.hot.to, state: o.hot.state });
    base.links = links;
    return base;
  }
}

/** Brute-force failure link: longest proper suffix of the state's string that is also a trie prefix (state id). */
export function bruteFail(model: Aho, id: number): number {
  const s = model.str(id);
  for (let k = 1; k < s.length; k++) {
    const suf = s.slice(k);
    let cur: number | null = 0;
    for (const ch of suf) {
      cur = cur === null ? null : model.child(cur, ch);
      if (cur === null) break;
    }
    if (cur !== null) return cur;
  }
  return 0;
}

/* ---------------------------------------------------------------- suffix helpers */

export function suffixesSorted(s: string): number[] {
  return Array.from({ length: s.length }, (_, i) => i).sort((a, b) => (s.slice(a) < s.slice(b) ? -1 : s.slice(a) > s.slice(b) ? 1 : 0));
}

export function lcpOf(a: string, b: string): number {
  let h = 0;
  while (h < a.length && h < b.length && a[h] === b[h]) h++;
  return h;
}

export function bruteLcp(s: string, sa: number[]): number[] {
  return sa.map((p, r) => (r === 0 ? 0 : lcpOf(s.slice(sa[r - 1]), s.slice(p))));
}

export const fmtArr = (a: (number | string)[]): string => `[${a.join(', ')}]`;

/** A ruled table: one row per entry, `heads` as column headings, `rowHeads` as row headings. */
export function tableScene(rows: { cells: (string | number)[]; state?: CellState; tones?: (Cell['tone'] | undefined)[]; cellStates?: (CellState | undefined)[] }[], heads: string[], rowHeads: string[]) {
  return {
    kind: 'grid' as const,
    variant: 'table' as const,
    colHeads: heads,
    rowHeads,
    rows: rows.map((r, ri): Cell[] =>
      r.cells.map((v, ci): Cell => {
        const c: Cell = { key: `${ri},${ci}`, value: v };
        const st = r.cellStates?.[ci] ?? r.state;
        if (st) c.state = st;
        const tone = r.tones?.[ci];
        if (tone) c.tone = tone;
        return c;
      }),
    ),
  };
}
