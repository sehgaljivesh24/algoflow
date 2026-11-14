import type { Step } from '../../src/engine/types.ts';
import type { CaseModule, State } from './types.ts';
import { num, ptr, rarr, rint, rstr, sceneOfKind, scenesOf, shown } from './util.ts';

/**
 * Batch d6: tries, segment trees, Fenwick, sqrt decomposition, persistent trees, suffix structures, Aho-Corasick, convex hull.
 * Every oracle below is written from the textbook algorithm (plain sets / arrays / brute force) and never imports a problem module or kit.
 * NOTE on strings: the runner normalises numeric-looking strings to numbers ("0011" -> 11, "0" == "00"), so every string that
 * could look numeric (bit strings, words, indices) is prefixed with '#' by the helpers below.
 */

/* ------------------------------------------------------------------ shared helpers */

type Case = CaseModule['cases'][number];
export const cases: Case[] = [];

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const uniq = <T,>(a: T[]): T[] => [...new Set(a)];
const auxItems = (step: Step, title: string): string[] => (step.aux ?? []).find((a) => a.title === title)?.items ?? [];
const varList = (step: Step, key: string): string[] => {
  const v = String(step.vars[key] ?? '');
  const inner = v.replace(/^\[/, '').replace(/\]$/, '').trim();
  return inner === '' ? [] : inner.split(/,\s*/);
};

/** The trie scene shown by a step as a sorted list of '#string' (+ '*' for an end-of-word node, + '=label' when withLabel). */
function trieShown(step: Step, withLabel = false): string[] {
  const t = sceneOfKind(step, 'trie');
  if (!t) return [];
  const byId = new Map(t.nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  const walk = (id: number, s: string): void => {
    const n = byId.get(id)!;
    if (id !== t.root) out.push('#' + s + (n.end ? '*' + (withLabel && n.label ? '=' + n.label : '') : ''));
    for (const c of n.children) walk(c, s + byId.get(c)!.char);
  };
  walk(t.root, '');
  return out.sort();
}
/** The highlighted walk path of the trie scene as a '#string' of edge letters. */
function trieWalk(step: Step): string {
  const t = sceneOfKind(step, 'trie');
  if (!t) return '#';
  const byId = new Map(t.nodes.map((n) => [n.id, n]));
  return '#' + (t.path ?? []).filter((id) => id !== t.root).map((id) => byId.get(id)!.char).join('');
}
/** Oracle side of trieShown: nodes = set of non-empty prefixes, ends = words, labels optional. */
function trieFmt(nodes: Set<string>, ends: Set<string>, labels?: Map<string, string>): string[] {
  return [...nodes].map((p) => '#' + p + (ends.has(p) ? '*' + (labels && labels.has(p) ? '=' + labels.get(p) : '') : '')).sort();
}
const prefixesOf = (w: string): string[] => Array.from({ length: w.length }, (_, k) => w.slice(0, k + 1));

/* ------------------------------------------------------------------ 208 Implement Trie */
{
  type Op = { op: 'insert' | 'search' | 'startsWith'; word: string };
  type In = { ops: Op[] };
  const gen = (r: () => number): In => {
    const ops: Op[] = [];
    const n = rint(r, 1, 8);
    const pool = uniq(Array.from({ length: 4 }, () => rstr(r, rint(r, 1, 5), 'abc')));
    for (let i = 0; i < n; i++) {
      const k = r();
      ops.push({ op: k < 0.4 ? 'insert' : k < 0.7 ? 'search' : 'startsWith', word: r() < 0.7 ? pool[rint(r, 0, pool.length - 1)] : rstr(r, rint(r, 1, 5), 'abc') });
    }
    return { ops };
  };
  const oracle = ({ ops }: In): State[] => {
    const nodes = new Set<string>(), ends = new Set<string>(), out: string[] = [];
    const S = (walk: string): State => ({ trie: trieFmt(nodes, ends), walk: '#' + walk, out: [...out] });
    const st: State[] = [S('')];
    for (const { op, word: w } of ops) {
      st.push(S(''));
      if (op === 'insert') {
        for (const p of prefixesOf(w)) { nodes.add(p); st.push(S(p)); }
        ends.add(w); out.push('null'); st.push(S(w));
      } else {
        let walk = '', failed = false;
        for (const p of prefixesOf(w)) {
          if (!nodes.has(p)) { failed = true; st.push(S(walk)); break; }
          walk = p; st.push(S(walk));
        }
        const res = failed ? false : op === 'startsWith' ? true : ends.has(w);
        out.push(String(res)); st.push(S(walk));
      }
    }
    st.push(S(''));
    return st;
  };
  cases.push({
    slug: '208-implement-trie', gen, oracle,
    project: (s) => ({ trie: trieShown(s), walk: trieWalk(s), out: varList(s, 'output') }),
    invariants: [(s) => { const w = auxItems(s, 'output so far').length; return w === varList(s, 'output').length ? null : 'aux output differs from vars output'; }],
    notes: 'node colours (active/found/error/compare) and the "words stored" aux are not compared; trie = set of nodes + end flags, walk = highlighted path',
  });
}

/* ------------------------------------------------------------------ 211 Add and Search Words (wildcard DFS) */
{
  type Op = { op: 'add' | 'search'; word: string };
  type In = { ops: Op[] };
  const gen = (r: () => number): In => {
    const ops: Op[] = [];
    const n = rint(r, 2, 9);
    const pool = uniq(Array.from({ length: 3 }, () => rstr(r, rint(r, 1, 4), 'abc')));
    for (let i = 0; i < n; i++) {
      if (r() < 0.45) ops.push({ op: 'add', word: pool[rint(r, 0, pool.length - 1)] });
      else {
        const base = r() < 0.7 ? pool[rint(r, 0, pool.length - 1)] : rstr(r, rint(r, 1, 4), 'abcz');
        ops.push({ op: 'search', word: [...base].map((c) => (r() < 0.35 ? '.' : c)).join('') });
      }
    }
    return { ops };
  };
  const oracle = ({ ops }: In): State[] => {
    const nodes = new Set<string>(), ends = new Set<string>(), out: string[] = [];
    let pos: number | null = null;
    const S = (walk: string): State => ({ trie: trieFmt(nodes, ends), walk: '#' + walk, out: [...out], pos });
    const st: State[] = [S('')];
    for (const { op, word: w } of ops) {
      pos = null; st.push(S(''));
      if (op === 'add') {
        prefixesOf(w).forEach((p, k) => { nodes.add(p); pos = k + 1; st.push(S(p)); });
        ends.add(w); out.push('null'); st.push(S(w));
        continue;
      }
      const dfs = (i: number, p: string): boolean => {
        pos = i;
        if (i === w.length) { st.push(S(p)); return ends.has(p); }
        if (w[i] !== '.') {
          if (!nodes.has(p + w[i])) { st.push(S(p)); return false; }
          st.push(S(p + w[i]));
          return dfs(i + 1, p + w[i]);
        }
        st.push(S(p));
        for (const c of ALPHA) {
          if (!nodes.has(p + c)) continue;
          st.push(S(p + c));
          if (dfs(i + 1, p + c)) return true;
        }
        return false;
      };
      const ok = dfs(0, '');
      out.push(String(ok)); pos = null; st.push(S(''));
    }
    pos = null; st.push(S(''));
    return st;
  };
  cases.push({
    slug: '211-design-add-and-search-words-data-structure', gen, oracle,
    project: (s) => ({ trie: trieShown(s), walk: trieWalk(s), out: varList(s, 'output'), pos: num(s, 'pattern index') }),
    notes: 'node colours not compared; DFS fans out over children in alphabetical order (trie children are drawn alphabetically)',
  });
}

/* ------------------------------------------------------------------ 212 Word Search II */
{
  type In = { board: string[]; words: string[] };
  const gen = (r: () => number): In => {
    const R = rint(r, 1, 3), C = rint(r, 1, 4);
    const board = Array.from({ length: R }, () => rstr(r, C, 'abc'));
    const words = uniq(Array.from({ length: rint(r, 1, 3) }, () => rstr(r, rint(r, 1, 4), 'abc')));
    return { board, words };
  };
  const cellsShown = (s: Step): string[] => {
    const g = sceneOfKind(s, 'grid');
    const o: string[] = [];
    (g?.rows ?? []).forEach((row, ri) => row.forEach((c, ci) => { if (c.state) o.push(`${ri},${ci}`); }));
    return o;
  };
  const oracle = ({ board, words }: In): State[] => {
    const R = board.length, C = board[0].length;
    const prefixes = new Set<string>(), wordSet = new Set(words);
    for (const w of words) for (const p of prefixesOf(w)) prefixes.add(p);
    const found: string[] = [];
    let start: string | null = null;
    let path: [number, number][] = [];
    const S = (): State => ({
      start, prefix: path.length ? '#' + path.map(([r, c]) => board[r][c]).join('') : null,
      cells: path.map(([r, c]) => `${r},${c}`).sort(), found: [...found],
    });
    const st: State[] = [S()];
    const used = new Set<string>();
    const dfs = (r: number, c: number, pre: string): void => {
      if (r < 0 || c < 0 || r >= R || c >= C || used.has(`${r},${c}`)) return;
      const p = pre + board[r][c];
      if (!prefixes.has(p)) return;
      used.add(`${r},${c}`); path.push([r, c]);
      st.push(S());
      if (wordSet.has(p) && !found.includes(p)) { found.push(p); st.push(S()); }
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) dfs(r + dr, c + dc, p);
      used.delete(`${r},${c}`); path.pop();
    };
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      start = `(${r}, ${c})`;
      if (!prefixes.has(board[r][c])) { path = [[r, c]]; st.push(S()); path = []; continue; }
      dfs(r, c, '');
    }
    path = []; start = null; st.push(S());
    return st;
  };
  cases.push({
    slug: '212-word-search-ii', gen, oracle,
    project: (s) => ({ start: shown(s, 'start') as string | null, prefix: shown(s, 'prefix') === null ? null : '#' + shown(s, 'prefix'), cells: cellsShown(s), found: auxItems(s, 'words found') }),
    notes: 'direction order (down, up, right, left) and the whole-word-found flash are taken as shown; the static trie of all words is not compared; backtracking (silent pops) is verified only through the next Enter state',
  });
}

/* ------------------------------------------------------------------ 648 Replace Words */
{
  type In = { roots: string[]; words: string[] };
  const gen = (r: () => number): In => ({
    roots: uniq(Array.from({ length: rint(r, 1, 4) }, () => rstr(r, rint(r, 1, 3), 'abc'))),
    words: Array.from({ length: rint(r, 1, 5) }, () => rstr(r, rint(r, 1, 6), 'abcd')),
  });
  const oracle = ({ roots, words }: In): State[] => {
    const nodes = new Set<string>(), ends = new Set<string>(), stored: string[] = [], out: string[] = [];
    const S = (walk: string): State => ({ trie: trieFmt(nodes, ends), walk: '#' + walk, roots: [...stored], out: [...out] });
    const st: State[] = [S('')];
    for (const rt of roots) { for (const p of prefixesOf(rt)) nodes.add(p); ends.add(rt); stored.push(rt); st.push(S(rt)); }
    for (const w of words) {
      st.push(S(''));
      let walk = '', kept = w, finished = true;
      for (let k = 0; k < w.length; k++) {
        const p = w.slice(0, k + 1);
        if (!nodes.has(p)) { st.push(S(walk)); finished = false; break; }
        walk = p;
        if (ends.has(p)) { kept = p; st.push(S(walk)); finished = false; break; }
        st.push(S(walk));
      }
      if (finished) st.push(S(walk));
      out.push(kept); st.push(S(walk));
    }
    st.push(S(''));
    return st;
  };
  cases.push({
    slug: '648-replace-words', gen, oracle,
    project: (s) => ({ trie: trieShown(s), walk: trieWalk(s), roots: auxItems(s, 'roots stored'), out: auxItems(s, 'sentence out') }),
    notes: 'node colours and the "at" variable not compared; shortest root = first end-of-word met while walking down',
  });
}

/* ------------------------------------------------------------------ 421 Maximum XOR (bit trie) */
{
  type In = { nums: number[] };
  const gen = (r: () => number): In => ({ nums: rarr(r, rint(r, 1, 7), 0, r() < 0.3 ? 3 : 15) });
  const oracle = ({ nums }: In): State[] => {
    const L = Math.max(1, Math.max(...nums).toString(2).length);
    const bits = (x: number) => x.toString(2).padStart(L, '0');
    const nodes = new Set<string>(), ends = new Set<string>(), labels = new Map<string, string>();
    let x: number | null = null, want: number | null = null, cur: number | null = null, best = 0;
    const S = (walk: string): State => ({ trie: trieFmt(nodes, ends, labels), walk: '#' + walk, x, want, cur, best });
    const st: State[] = [S('')];
    for (const n of nums) {
      x = n;
      for (const p of prefixesOf(bits(n))) nodes.add(p);
      ends.add(bits(n)); labels.set(bits(n), String(n));
      st.push(S(bits(n)));
    }
    for (const n of nums) {
      x = n; cur = 0; want = null;
      st.push(S(''));
      let p = '', acc = 0;
      const b = bits(n);
      for (let k = 0; k < L; k++) {
        const bit = Number(b[k]), w = 1 - bit;
        want = w;
        if (nodes.has(p + w)) { p += w; acc |= 1 << (L - 1 - k); cur = acc; } else p += bit;
        st.push(S(p));
      }
      best = Math.max(best, acc);
      st.push(S(p));
    }
    x = null; want = null; cur = null;
    st.push(S(''));
    return st;
  };
  cases.push({
    slug: '421-maximum-xor-of-two-numbers-in-an-array', gen, oracle,
    project: (s) => ({ trie: trieShown(s, true), walk: trieWalk(s), x: num(s, 'x'), want: num(s, 'wanted bit'), cur: num(s, 'xor so far'), best: num(s, 'best') }),
    invariants: [(s, _i, _st, { nums }) => { const b = num(s, 'best'); const m = nums.reduce((a, x) => Math.max(a, ...nums.map((y) => x ^ y)), 0); return b !== null && b > m ? `best ${b} exceeds the true maximum ${m}` : null; }],
    notes: 'node colours and the aux bit list highlight not compared; the greedy walk is checked bit by bit (wanted bit, xor so far, path)',
  });
}

/* ------------------------------------------------------------------ Aho-Corasick model (textbook, used by 3 cases) */
interface AhoM { str: string[]; par: number[]; dep: number[]; kids: Map<string, number>[]; wlen: number[]; fail: number[]; order: number[] }
function ahoModel(words: string[]): AhoM {
  const m: AhoM = { str: [''], par: [-1], dep: [0], kids: [new Map()], wlen: [0], fail: [0], order: [] };
  for (const w of words) {
    let cur = 0;
    for (const ch of w) {
      if (!m.kids[cur].has(ch)) {
        const id = m.str.length;
        m.str.push(m.str[cur] + ch); m.par.push(cur); m.dep.push(m.dep[cur] + 1); m.kids.push(new Map()); m.wlen.push(0); m.fail.push(0);
        m.kids[cur].set(ch, id);
      }
      cur = m.kids[cur].get(ch)!;
    }
    m.wlen[cur] = w.length;
  }
  // BFS order: level by level, children in alphabetical order of their letter
  const q = [...[...m.kids[0].keys()].sort().map((c) => m.kids[0].get(c)!)];
  for (let h = 0; h < q.length; h++) q.push(...[...m.kids[q[h]].keys()].sort().map((c) => m.kids[q[h]].get(c)!));
  m.order = q;
  for (const v of q) {
    const u = m.par[v];
    if (u === 0) { m.fail[v] = 0; continue; }
    const ch = m.str[v][m.str[v].length - 1];
    let f = m.fail[u];
    while (f !== 0 && !m.kids[f].has(ch)) f = m.fail[f];
    m.fail[v] = m.kids[f].has(ch) ? m.kids[f].get(ch)! : 0;
  }
  return m;
}
/** words ending at v or on its failure chain, longest first */
const ahoOuts = (m: AhoM, v: number): string[] => { const o: string[] = []; for (let x = v; x !== 0; x = m.fail[x]) if (m.wlen[x] > 0) o.push(m.str[x]); return o; };
const ahoStateNum = (s: Step): number => { const v = String(s.vars.state); return v.startsWith('root') ? 0 : parseInt(v, 10); };
/** trie scene as sorted '#str@id' (+ '*' for an end node); id = the number drawn inside the circle */
function trieWithIds(step: Step): string[] {
  const t = sceneOfKind(step, 'trie');
  if (!t) return [];
  const byId = new Map(t.nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  const walk = (id: number, s: string): void => {
    const n = byId.get(id)!;
    if (id !== t.root) out.push('#' + s + '@' + n.text + (n.end ? '*' : ''));
    for (const c of n.children) walk(c, s + byId.get(c)!.char);
  };
  walk(t.root, '');
  return out.sort();
}
/** trie of the first `upTo-1` created nodes (ids 1..upTo-1); a node is an end node when its string is in `ends` */
const ahoTrieFmt = (m: AhoM, upTo: number, ends: Set<string>): string[] => m.str.slice(1, upTo).map((s, i) => '#' + s + '@' + (i + 1) + (ends.has(s) ? '*' : '')).sort();
/** links drawn in the scene: 'from>to' + '!' for an active link, '+' for a found one (dim ones carry no mark), sorted */
const linksShown = (s: Step): string[] => ((sceneOfKind(s, 'trie')?.links ?? []).map((l) => `${l.from}>${l.to}${l.state === 'active' ? '!' : l.state === 'found' ? '+' : ''}`)).sort();
/** chip labels beside trie nodes as sorted 'id=label' */
const chipsShown = (s: Step): string[] => (sceneOfKind(s, 'trie')?.nodes ?? []).filter((n) => n.label).map((n) => `${n.id}=${n.label}`).sort();
const plainLinks = (m: AhoM, ids: number[], except = -1): string[] => ids.filter((v) => m.fail[v] !== 0 && v !== except).map((v) => `${v}>${m.fail[v]}`);
const randWords = (r: () => number, maxW = 5, maxL = 4, alpha = 'abc'): string[] => uniq(Array.from({ length: rint(r, 1, maxW) }, () => rstr(r, rint(r, 1, maxL), alpha)));

/* ------------------------------------------------------------------ cp Aho-Corasick: build failure links */
{
  type In = { words: string[] };
  const oracle = ({ words }: In): State[] => {
    const st: State[] = [];
    const full = ahoModel(words);
    // incremental trie: ids are creation order, so the trie after word k holds exactly the nodes created so far
    let created = 1;
    const inserted = new Set<string>();
    const done: number[] = [];
    const chips = (): string[] => done.filter((v) => ahoOuts(full, v).length).map((v) => `${v}=${ahoOuts(full, v).join(',')}`).sort();
    let queue: string[] = [];
    const base = (): State => ({
      trie: ahoTrieFmt(full, created, inserted), walk: '#', state: null, tried: null, link: null, nset: done.length,
      fails: done.map((v) => `${v}:${full.str[v]}→${full.fail[v]}`), queue: [...queue], links: [], chips: [],
    });
    st.push(base());
    const seen = new Set<string>(['']);
    for (const w of words) {
      for (const p of prefixesOf(w)) if (!seen.has(p)) { seen.add(p); created++; }
      inserted.add(w);
      st.push({ ...base(), walk: '#' + w, state: `"${w}"` });
    }
    const depth1 = full.order.filter((v) => full.dep[v] === 1);
    done.push(...depth1);
    queue = full.order.filter((v) => full.dep[v] > 1).map((v) => `${v}:${full.str[v]}`);
    st.push({ ...base(), links: plainLinks(full, done).sort(), chips: chips() });
    for (const v of full.order) {
      if (full.dep[v] === 1) continue;
      const u = full.par[v], c = full.str[v].slice(-1);
      queue = full.order.slice(full.order.indexOf(v) + 1).filter((x) => full.dep[x] > 1).map((x) => `${x}:${full.str[x]}`);
      const tried: number[] = [];
      let f = full.fail[u];
      for (;;) { tried.push(f); if (full.kids[f].has(c) || f === 0) break; f = full.fail[f]; }
      const triedStr = tried.map((x) => (x === 0 ? 'root' : `${x} "${full.str[x]}"`)).join(' → ');
      st.push({ ...base(), walk: '#' + full.str[v], state: `${v} "${full.str[v]}"`, tried: triedStr, link: '?', links: plainLinks(full, done).sort(), chips: chips() });
      done.push(v);
      const t = full.fail[v];
      const link = t === 0 ? 'root' : `${t} "${full.str[t]}"`;
      st.push({ ...base(), state: `${v} "${full.str[v]}"`, tried: triedStr, link, links: done.filter((x) => full.fail[x] !== 0).map((x) => `${x}>${full.fail[x]}${x === v ? '+' : ''}`).sort(), chips: chips() });
    }
    queue = [];
    st.push({ ...base(), links: plainLinks(full, done).sort(), chips: chips() });
    return st;
  };
  cases.push({
    slug: 'cp-aho-corasick-build-failure-links', gen: (r): In => ({ words: randWords(r, 6, 5, r() < 0.4 ? 'ab' : 'abc') }), oracle,
    project: (s) => ({
      trie: trieWithIds(s), walk: trieWalk(s), state: shown(s, 'state') as string | null, tried: shown(s, 'tried') as string | null, link: shown(s, 'fail link') as string | null, nset: num(s, 'links set'),
      fails: auxItems(s, 'fail[ ] known so far  (state:string → fail state)'), queue: auxItems(s, 'states still to process (BFS order)'), links: linksShown(s), chips: chipsShown(s),
    }),
    invariants: [(s) => { const t = sceneOfKind(s, 'trie'); return t && t.nodes.some((n) => n.text !== String(n.id)) ? 'state number inside a circle differs from the node id' : null; }],
    notes: 'node colours not compared; the trie with state numbers, failure links, BFS queue, chain tried and output chips are compared at every step',
  });
}

/* ------------------------------------------------------------------ cp Multi-keyword search (Aho-Corasick) */
{
  type In = { words: string[]; text: string };
  const gen = (r: () => number): In => ({ words: randWords(r, 6, 4, r() < 0.4 ? 'ab' : 'abc'), text: rstr(r, rint(r, 1, 12), r() < 0.3 ? 'ab' : 'abc') });
  const oracle = ({ words, text }: In): State[] => {
    const m = ahoModel(words);
    const all = m.order;
    const chips = all.filter((v) => ahoOuts(m, v).length).map((v) => `${v}=${ahoOuts(m, v).join(',')}`).sort();
    const links = plainLinks(m, all).sort();
    const hits: string[] = [];
    let s = 0;
    const S = (o: Partial<State>): State => ({ idx: null, state: s, falls: 0, matches: hits.length, hits: [...hits], links, chips, span: null, ...o });
    const st: State[] = [S({})];
    let lastFalls = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      let cur = s, falls = 0;
      while (cur !== 0 && !m.kids[cur].has(ch)) {
        const t = m.fail[cur]; falls++;
        st.push(S({ idx: i, falls, links: [...plainLinks(m, all, cur), `${cur}>${t}!`].sort() }));
        cur = t;
      }
      s = m.kids[cur].has(ch) ? m.kids[cur].get(ch)! : 0;
      lastFalls = falls;
      const outs = ahoOuts(m, s);
      if (outs.length) {
        hits.push(...outs.map((w) => `${w}@${i - w.length + 1}`));
        st.push(S({ idx: i, falls, matches: hits.length, hits: [...hits], span: `${i - outs[0].length + 1}-${i}` }));
      } else st.push(S({ idx: i, falls }));
    }
    // text finished: pointer gone, falls keeps the last letter's count
    st.push(S({ idx: null, falls: lastFalls }));
    return st;
  };
  cases.push({
    slug: 'cp-multi-keyword-search-aho-corasick', gen, oracle,
    project: (s) => {
      const arr = scenesOf(s).find((x) => x.kind === 'array');
      const found = arr && arr.kind === 'array' ? arr.cells.map((c, i) => (c.state === 'found' ? i : -1)).filter((i) => i >= 0) : [];
      return {
        idx: ptr(s, 'i'), state: ahoStateNum(s), falls: num(s, 'fallbacks'), matches: num(s, 'matches'), hits: auxItems(s, 'matches found (word@start)'),
        links: linksShown(s), chips: chipsShown(s), span: found.length ? `${found[0]}-${found[found.length - 1]}` : null,
      };
    },
    invariants: [(s, _i, _st, { text }) => {
      const e = ptr(s, 'i'); if (e === null) return null;
      for (const h of auxItems(s, 'matches found (word@start)')) { const [w, p] = h.split('@'); if (text.slice(Number(p), Number(p) + w.length) !== w || Number(p) + w.length - 1 > e) return `reported ${h} is not an occurrence ending by ${e}`; }
      return null;
    }],
    notes: 'the committed state variable stays on the pre-fallback state during fall-back hops (the hop itself is checked through the highlighted link); node colours not compared',
  });
}

/* ------------------------------------------------------------------ 1032 Stream of Characters (Aho-Corasick suffix check) */
{
  type In = { words: string[]; text: string };
  const gen = (r: () => number): In => ({ words: randWords(r, 5, 4, r() < 0.4 ? 'ab' : 'abc'), text: rstr(r, rint(r, 1, 12), r() < 0.3 ? 'ab' : 'abc') });
  const oracle = ({ words, text }: In): State[] => {
    const m = ahoModel(words);
    const all = m.order;
    const hitFlag = (v: number): boolean => ahoOuts(m, v).length > 0;
    const chips = all.filter(hitFlag).map((v) => `${v}=✓`).sort();
    const links = plainLinks(m, all).sort();
    const ends = new Set(words);
    const ans: string[] = ['null'];
    let s = 0;
    const S = (o: Partial<State>): State => ({ idx: null, state: s, falls: 0, hit: null, ans: [...ans], chips: [], links: [], trie: ahoTrieFmt(m, m.str.length, ends), ...o });
    const st: State[] = [S({})];
    st.push(S({ chips, links }));
    let lastFalls = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      let cur = s, falls = 0;
      while (cur !== 0 && !m.kids[cur].has(ch)) {
        const t = m.fail[cur]; falls++;
        st.push(S({ idx: i, falls, chips, links: [...plainLinks(m, all, cur), `${cur}>${t}!`].sort() }));
        cur = t;
      }
      s = m.kids[cur].has(ch) ? m.kids[cur].get(ch)! : 0;
      const ok = hitFlag(s);
      ans.push(String(ok));
      lastFalls = falls;
      st.push(S({ idx: i, falls, hit: String(ok), chips, links }));
    }
    st.push(S({ falls: lastFalls, chips, links }));
    return st;
  };
  cases.push({
    slug: '1032-stream-of-characters', gen, oracle,
    project: (s) => ({
      idx: ptr(s, 'q'), state: ahoStateNum(s), falls: num(s, 'fallbacks'), hit: shown(s, 'hit[state]') as string | null,
      ans: auxItems(s, 'returned so far'), chips: chipsShown(s), links: linksShown(s), trie: trieWithIds(s),
    }),
    invariants: [(s, _i, _st, { words, text }) => {
      const e = ptr(s, 'q'); const a = auxItems(s, 'returned so far');
      const h = shown(s, 'hit[state]');
      if (e === null || h === null) return null;
      const stream = text.slice(0, e + 1);
      const truth = words.some((w) => stream.endsWith(w));
      return String(truth) === String(h) && a[a.length - 1] === String(h) ? null : `query(${stream[e]}) shows ${h} but a suffix of "${stream}" ${truth ? 'is' : 'is not'} a word`;
    }],
    notes: 'the committed state variable stays on the pre-fallback state during fall-back hops (the hop is checked through the highlighted link); node colours not compared',
  });
}

/* ------------------------------------------------------------------ grid helpers */
const gridOf = (s: Step) => sceneOfKind(s, 'grid');
const gridCol = (s: Step, c: number): (string | number)[] => (gridOf(s)?.rows ?? []).map((r) => r[c].value);

/* ------------------------------------------------------------------ cp Count Distinct Substrings (suffix trie) */
{
  type In = { s: string };
  const oracle = ({ s }: In): State[] => {
    const n = s.length;
    const nodes = new Set<string>(), ends = new Set<string>(), seen: string[] = [];
    let suffix: string | null = null, cur: string | null = null, count = 0;
    const S = (walk: string): State => ({ trie: trieFmt(nodes, ends), walk: '#' + walk, suffix, cur: cur === null ? null : '#' + cur, count, seen: [...seen] });
    const st: State[] = [S('')];
    for (let i = 0; i < n; i++) {
      suffix = `"${s.slice(i)}"`; seen.push(s.slice(i)); cur = '(root)';
      st.push(S(''));
      for (let j = i; j < n; j++) {
        const sub = s.slice(i, j + 1);
        if (!nodes.has(sub)) { nodes.add(sub); count++; }
        if (j === n - 1) ends.add(sub);
        cur = sub;
        st.push(S(sub));
      }
    }
    suffix = null; cur = null;
    st.push(S(''));
    st.push(S(''));
    return st;
  };
  cases.push({
    slug: 'cp-count-distinct-substrings-suffix-trie', gen: (r): In => ({ s: rstr(r, rint(r, 2, 7), r() < 0.4 ? 'ab' : 'abc') }), oracle,
    project: (s) => ({
      trie: trieShown(s), walk: trieWalk(s), suffix: shown(s, 'suffix') as string | null,
      cur: shown(s, 'letter path') === null ? null : '#' + shown(s, 'letter path'), count: num(s, 'new nodes'), seen: auxItems(s, 'suffixes inserted'),
    }),
    invariants: [(s) => { const c = num(s, 'new nodes'); const t = trieShown(s).length; return c === t ? null : `new nodes ${c} != trie size ${t}`; }],
    notes: 'node colours not compared; count of distinct substrings = number of non-root nodes (also asserted against the trie size at every step)',
  });
}

/* ------------------------------------------------------------------ cp Suffix Array and LCP Array (insertion sort + Kasai) */
{
  type In = { s: string };
  const oracle = ({ s }: In): State[] => {
    const n = s.length;
    const sorted: number[] = [];
    let pending: number[] = Array.from({ length: n }, (_, i) => i);
    const lcp: (number | null)[] = Array(n).fill(null);
    let h: number | null = null, suffix: string | null = null;
    let hl: string[] = [];
    const S = (): State => {
      const list = [...sorted.map((p, r) => ({ p, r })), ...pending.map((p) => ({ p, r: -1 }))];
      return {
        suffix, h, sa: sorted.map(String), lcp: lcp.map((v) => (v === null ? '?' : v)),
        order: list.map((e) => e.p), third: list.map((e) => (e.r >= 0 && lcp[e.r] !== null ? lcp[e.r]! : '·')), heads: list.map((e) => (e.r >= 0 ? String(e.r) : '·')), hl: [...hl],
      };
    };
    const st: State[] = [S()];
    for (let k = 0; k < n; k++) {
      pending = pending.filter((p) => p !== k); pending.unshift(k);
      suffix = `"${s.slice(k)}"`;
      let pos = sorted.length;
      while (pos > 0) {
        const other = sorted[pos - 1];
        hl = [`${k}:active`, `${other}:compare`].sort();
        st.push(S());
        if (!(s.slice(other) > s.slice(k))) break;
        pos--;
      }
      sorted.splice(pos, 0, k);
      pending = pending.filter((p) => p !== k);
      hl = [`${k}:found`];
      st.push(S());
    }
    hl = []; suffix = null;
    st.push(S()); // rank[] ready
    const rank = Array(n).fill(0);
    sorted.forEach((p, r) => { rank[p] = r; });
    let hh = 0;
    for (let i = 0; i < n; i++) {
      suffix = `"${s.slice(i)}"`;
      const r = rank[i];
      if (r === 0) {
        lcp[0] = 0; hh = 0; h = 0; hl = [`${i}:active`];
        st.push(S());
        continue;
      }
      const j = sorted[r - 1];
      while (i + hh < n && j + hh < n && s[i + hh] === s[j + hh]) hh++;
      lcp[r] = hh; h = hh; hl = [`${i}:active`, `${j}:compare`].sort();
      st.push(S());
      if (hh > 0) { hh--; h = hh; st.push(S()); }
    }
    hl = []; suffix = null;
    st.push(S());
    return st;
  };
  cases.push({
    slug: 'cp-suffix-array-and-lcp-array', gen: (r): In => ({ s: rstr(r, rint(r, 2, 8), r() < 0.4 ? 'ab' : 'abc') }), oracle,
    project: (s) => {
      const g = gridOf(s);
      const hl: string[] = [];
      (g?.rows ?? []).forEach((row) => { const st = row[0].state; if (st === 'active' || st === 'compare' || st === 'found') hl.push(`${row[0].value}:${st}`); });
      return {
        suffix: shown(s, 'suffix') as string | null, h: num(s, 'h'), sa: auxItems(s, 'SA[ ] so far (start of the suffix at each rank)'), lcp: auxItems(s, 'LCP[ ] (common prefix with the previous rank)'),
        order: gridCol(s, 0), third: gridCol(s, 2), heads: gridOf(s)?.rowHeads ?? [], hl: hl.sort(),
      };
    },
    invariants: [(s, _i, _st, { s: str }) => {
      const sa = auxItems(s, 'SA[ ] so far (start of the suffix at each rank)').map(Number);
      for (let r = 1; r < sa.length; r++) if (!(str.slice(sa[r - 1]) < str.slice(sa[r]))) return `SA so far is not in suffix order: ${sa.join(',')}`;
      return null;
    }],
    notes: 'only active/compare/found row highlights are compared (dim/sorted colouring is not); the final-state "sorted" shade is not checked',
  });
}

/* ------------------------------------------------------------------ cp Pattern Search with a Suffix Array (lower / upper bound) */
{
  type In = { s: string; p: string };
  const oracle = ({ s, p }: In): State[] => {
    const n = s.length, m = p.length;
    const sa = Array.from({ length: n }, (_, i) => i).sort((a, b) => (s.slice(a) < s.slice(b) ? -1 : 1));
    const head = (r: number) => s.slice(sa[r], sa[r] + m);
    let phase = 'build';
    let lo: number | null = null, hi: number | null = null, mid: number | null = null, hd: string | null = null;
    let found: [number, number] | null = null, bounds: [number, number] = [0, n], midRow: number | null = null, boundRow: number | null = null;
    const S = (): State => ({
      phase, lo, hi, mid, head: hd,
      heads: sa.map((_, r) => { const t: string[] = []; if (!found && r === bounds[0]) t.push('lo'); if (!found && r === bounds[1]) t.push('hi'); if (midRow === r) t.push('mid'); return t.length ? `${r} ${t.join('/')}` : String(r); }),
      rows: sa.map((_, r) => (found && r >= found[0] && r < found[1] ? 'found' : midRow === r ? 'active' : boundRow === r ? 'compare' : !found && (r < bounds[0] || r >= bounds[1]) ? 'dim' : '')),
    });
    const st: State[] = [S()];
    const bound = (strict: boolean): number => {
      phase = strict ? 'upper' : 'lower'; boundRow = null;
      let a = 0, b = n;
      while (a < b) {
        const md = Math.floor((a + b) / 2);
        const hh = head(md);
        const goRight = strict ? hh <= p : hh < p;
        bounds = [a, b]; midRow = md; lo = a; hi = b; mid = md; hd = `"${hh}"`;
        st.push(S());
        if (goRight) a = md + 1; else b = md;
      }
      bounds = [a, a]; midRow = null; boundRow = a < n ? a : null; lo = a; hi = a; mid = null;
      st.push(S());
      return a;
    };
    const L = bound(false), U = bound(true);
    found = [L, U]; midRow = null; boundRow = null; lo = L; hi = U;
    st.push(S());
    return st;
  };
  cases.push({
    slug: 'cp-pattern-search-with-a-suffix-array', gen: (r): In => ({ s: rstr(r, rint(r, 2, 8), r() < 0.4 ? 'ab' : 'abc'), p: rstr(r, rint(r, 1, 4), r() < 0.4 ? 'ab' : 'abc') }), oracle,
    project: (s) => {
      const g = gridOf(s);
      return {
        phase: shown(s, 'phase') as string | null, lo: num(s, 'lo'), hi: num(s, 'hi'), mid: num(s, 'mid'), head: shown(s, 'head') as string | null,
        heads: g?.rowHeads ?? [], rows: (g?.rows ?? []).map((r) => r[0].state ?? ''),
      };
    },
    invariants: [(s, _i, _st, { s: str, p }) => {
      const g = gridOf(s); if (!g) return null;
      const f = g.rows.map((r) => (r[0].state === 'found' ? Number(r[0].value) : -1)).filter((x) => x >= 0);
      return f.every((st) => str.startsWith(p, st)) ? null : `a "found" suffix does not start with ${p}`;
    }],
    notes: 'binary-search window (lo/hi/mid), the head string, the lo/hi/mid tags on the rows and the found/active/compare/dim row colours are compared; the suffix array itself is computed by brute force sort (it is the table the animation starts from)',
  });
}

/* ------------------------------------------------------------------ plain segment tree: 307 (sum) and cp range-minimum (min) */
type SegIn = { nums: number[]; ops: { name: string; args: number[] }[] };
const rt = (l: number, r: number): string => (l === r ? `[${l}]` : `[${l},${r}]`);
const sortStr = (a: string[]): string[] => a.sort();

function genSegOps(r: () => number, q: string, u: string, lo = -50, hi = 50): SegIn {
  const n = rint(r, 2, 9);
  const nums = rarr(r, n, lo, hi);
  const ops: { name: string; args: number[] }[] = [];
  for (let i = 0; i < rint(r, 1, 5); i++) {
    if (r() < 0.55) { const l = rint(r, 0, n - 1); ops.push({ name: q, args: [l, rint(r, l, n - 1)] }); }
    else ops.push({ name: u, args: [rint(r, 0, n - 1), rint(r, lo, hi)] });
  }
  return { nums, ops };
}

/** Observable segment-tree state (node values by heap id, node colours, the "here" pointer, the array row). */
function segShown(s: Step, withNode: boolean): State {
  const nt = sceneOfKind(s, 'ntree');
  const arr = sceneOfKind(s, 'array');
  const hereIdx = nt ? (nt.pointers ?? []).find((p) => p.id === 'here')?.index ?? null : null;
  const here = hereIdx === null || !nt ? null : nt.nodes[hereIdx].id;
  const pointers = (arr?.pointers ?? []).map((p) => `${p.id}@${p.index}`).sort();
  return {
    tree: sortStr((nt?.nodes ?? []).map((n) => `${n.id}:${n.label}`)),
    st: sortStr((nt?.nodes ?? []).filter((n) => n.state).map((n) => `${n.id}:${n.state}`)),
    here, node: withNode && here !== null ? String(shown(s, 'node')) : null,
    arr: (arr?.cells ?? []).map((c) => c.value as number), cst: (arr?.cells ?? []).map((c) => c.state ?? ''), ptrs: pointers,
  };
}

function segOracle({ nums, ops }: SegIn, op: 'sum' | 'min'): State[] {
  const a = [...nums], n = a.length;
  const comb = (x: number, y: number) => (op === 'sum' ? x + y : Math.min(x, y));
  const ident = op === 'sum' ? 0 : Infinity;
  const q = op === 'sum' ? 'sum' : 'min';
  const ids: number[] = [];
  const walkIds = (id: number, l: number, r: number): void => { ids.push(id); if (l < r) { const m = (l + r) >> 1; walkIds(2 * id, l, m); walkIds(2 * id + 1, m + 1, r); } };
  walkIds(1, 0, n - 1);
  const val: number[] = new Array(4 * n + 4).fill(0);
  const built = new Set<number>();
  let st: Record<number, string> = {};
  let cst: (k: number) => string = () => '';
  let ptrs: string[] = [];
  let opText = 'build', nodeText = '—';
  let running: number | null = null;
  const answers: string[] = [];
  let pieces: string[] = [];
  const out: State[] = [];
  const emit = (here: number | null): void => {
    out.push({
      tree: sortStr(ids.map((id) => `${id}:${built.has(id) ? val[id] : '·'}`)),
      st: sortStr(ids.filter((id) => (!built.has(id) ? 'dim' : st[id])).map((id) => `${id}:${!built.has(id) ? 'dim' : st[id]}`)),
      here, node: here !== null ? nodeText : null, arr: [...a], cst: a.map((_, k) => cst(k)), ptrs: [...ptrs].sort(),
      op: opText, running, answers: [...answers], pieces: [...pieces],
    });
  };
  emit(null);
  const build = (id: number, l: number, r: number): void => {
    nodeText = rt(l, r);
    if (l === r) { val[id] = a[l]; built.add(id); st = { [id]: 'found' }; emit(id); return; }
    const m = (l + r) >> 1;
    build(2 * id, l, m); build(2 * id + 1, m + 1, r);
    nodeText = rt(l, r);
    val[id] = comb(val[2 * id], val[2 * id + 1]); built.add(id);
    st = { [id]: 'active', [2 * id]: 'compare', [2 * id + 1]: 'compare' };
    emit(id);
  };
  build(1, 0, n - 1);
  const query = (id: number, l: number, r: number, ql: number, qr: number): number => {
    nodeText = rt(l, r);
    if (qr < l || r < ql) { st[id] = 'dim'; emit(id); return ident; }
    if (ql <= l && r <= qr) {
      st[id] = 'found';
      running = comb(running === null ? ident : running, val[id]);
      pieces.push(`${rt(l, r)}=${val[id]}`);
      emit(id);
      return val[id];
    }
    st[id] = 'compare'; emit(id);
    const m = (l + r) >> 1;
    return comb(query(2 * id, l, m, ql, qr), query(2 * id + 1, m + 1, r, ql, qr));
  };
  const update = (id: number, l: number, r: number, i: number, v: number): void => {
    nodeText = rt(l, r);
    if (l === r) { val[id] = v; a[i] = v; st[id] = 'found'; cst = (k) => (k === i ? 'found' : ''); emit(id); return; }
    st[id] = 'active'; emit(id);
    const m = (l + r) >> 1;
    if (i <= m) update(2 * id, l, m, i, v); else update(2 * id + 1, m + 1, r, i, v);
    nodeText = rt(l, r);
    val[id] = comb(val[2 * id], val[2 * id + 1]);
    st[id] = 'found'; emit(id);
  };
  for (const o of ops) {
    pieces = []; st = {}; cst = () => ''; ptrs = [];
    if (o.name === q) {
      const [ql, qr] = o.args;
      opText = `${op === 'sum' ? 'sumRange' : 'minRange'}(${ql}, ${qr})`; running = null;
      cst = (k) => (k >= ql && k <= qr ? 'active' : '');
      ptrs = ql === qr ? [`lr@${ql}`] : [`l@${ql}`, `r@${qr}`];
      emit(null);
      const res = query(1, 0, n - 1, ql, qr);
      running = res; answers.push(String(res)); emit(null);
    } else {
      const [i, v] = o.args;
      opText = `${op === 'sum' ? 'update' : 'set'}(${i}, ${v})`; running = null; ptrs = [`i@${i}`];
      emit(null);
      update(1, 0, n - 1, i, v);
      answers.push('null'); emit(null);
    }
  }
  st = {}; cst = () => ''; ptrs = [];
  emit(null);
  return out;
}
const segProject = (s: Step): State => ({
  ...segShown(s, true), op: shown(s, 'op') as string, running: num(s, 'running'), answers: varList(s, 'answers'),
  pieces: (s.aux ?? []).find((x) => x.title.startsWith('pieces added'))?.items ?? [],
});
const segInvariant = (op: 'sum' | 'min') => (s: Step): string | null => {
  // outside an update (whose ancestors are stale between the leaf write and the repair) and once the tree is fully built,
  // the root value must equal the plain aggregate of the array row shown below it
  const nt = sceneOfKind(s, 'ntree');
  const arr = sceneOfKind(s, 'array');
  if (!nt || !arr || nt.nodes.some((n) => n.label === '·')) return null;
  if (String(shown(s, 'op')).startsWith(op === 'sum' ? 'update' : 'set')) return null;
  const root = nt.nodes.find((n) => n.id === 1)!;
  const vals = arr.cells.map((c) => Number(c.value));
  const want = op === 'sum' ? vals.reduce((x, y) => x + y, 0) : Math.min(...vals);
  return Number(root.label) === want ? null : `root ${root.label} != aggregate ${want} of the array row`;
};
cases.push({
  slug: '307-range-sum-query-mutable', gen: (r) => genSegOps(r, 'sum', 'update'), oracle: (i: SegIn) => segOracle(i, 'sum'), project: segProject,
  invariants: [segInvariant('sum')],
  notes: 'compared: every node value by heap id, node colours, the "here" pointer, node range variable (only while visiting a node), running sum, pieces, answers, array row values/colours/pointers; the Answer step\'s stale "node" variable is not compared',
});
cases.push({
  slug: 'cp-range-minimum-query-segment-tree', gen: (r) => genSegOps(r, 'min', 'set'), oracle: (i: SegIn) => segOracle(i, 'min'), project: segProject,
  invariants: [segInvariant('min')],
  notes: 'same projection as 307 with min as the merge; the Answer step\'s stale "node" variable is not compared',
});

/* ------------------------------------------------------------------ sqrt decomposition (plain block sums) and blocks with lazy tags */
type BlkOp = { k: string; l?: number; r?: number; v?: number; i?: number };
type BlkIn = { a: number[]; ops: BlkOp[] };
const signed = (v: number): string => (v >= 0 ? `+${v}` : String(v));

function blkShown(s: Step, lazyAux: boolean): State {
  const g = gridOf(s);
  const cells: (string | number)[] = [], sts: string[] = [];
  (g?.rows ?? []).forEach((row) => row.forEach((c) => { if (typeof c.key === 'number') { cells.push(c.value); sts.push(c.state ?? ''); } }));
  const sums = (s.aux ?? []).find((x) => x.title.startsWith('block sums'));
  return {
    op: shown(s, 'op') as string, range: shown(s, 'range') as string, total: shown(s, 'total') as string | number | null, answers: auxItems(s, 'answers so far'),
    cells, sts, heads: g?.rowHeads ?? [], sums: sums?.items ?? [], hot: sums?.highlight ?? null,
    ...(lazyAux ? { lazyItems: auxItems(s, 'pending lazy adds') } : {}),
  };
}

function blkOracle({ a: input, ops }: BlkIn, lazyMode: boolean): State[] {
  const a = [...input], n = a.length;
  const B = Math.max(1, Math.ceil(Math.sqrt(n)));
  const nb = Math.ceil(n / B);
  const size = (b: number) => Math.min(n, (b + 1) * B) - b * B;
  const sum = Array.from({ length: nb }, (_, b) => a.slice(b * B, b * B + B).reduce((x, y) => x + y, 0));
  const lazy: number[] = Array(nb).fill(0);
  const answers: string[] = [];
  const blk = (i: number) => Math.floor(i / B);
  let st = new Map<number, string>();
  let hot = -1;
  let op: string | null = null, range: string | null = null, total: string | number | null = null;
  const out: State[] = [];
  const emit = (): void => {
    out.push({
      op, range, total, answers: [...answers],
      cells: a.map((v, i) => v + (lazyMode ? lazy[blk(i)] : 0)), sts: a.map((_, i) => st.get(i) ?? ''),
      heads: sum.map((s, b) => (lazyMode ? `blk ${b}: Σ=${s}  lazy ${signed(lazy[b])}` : `blk ${b}: Σ=${s}`)),
      sums: sum.map((s, b) => `b${b}=${s}`), hot: hot >= 0 ? hot : null,
      ...(lazyMode ? { lazyItems: lazy.map((z, b) => `b${b}:${signed(z)}`) } : {}),
    });
  };
  emit();
  for (const o of ops) {
    st = new Map(); hot = -1;
    if (o.k === 'set') {
      const i = o.i!, v = o.v!, b = blk(i), diff = v - a[i];
      op = `set(${i}, ${v})`; range = `a[${i}]`; total = signed(diff);
      st.set(i, 'active'); hot = b; emit();
      sum[b] += diff; a[i] = v;
      for (let k = b * B; k < b * B + size(b); k++) st.set(k, 'swap');
      st.set(i, 'active'); emit();
      continue;
    }
    if (o.k === 'add') {
      const { l, r, v } = o as Required<BlkOp>;
      const bl = blk(l), br = blk(r);
      op = `add(${l}, ${r}, ${signed(v)})`; range = `${l}..${r}`; total = signed(v);
      emit();
      const elem = (i: number): void => { a[i] += v; sum[blk(i)] += v; hot = blk(i); st.set(i, 'active'); emit(); hot = -1; };
      if (bl === br) for (let i = l; i <= r; i++) elem(i);
      else {
        for (let i = l; i < (bl + 1) * B; i++) elem(i);
        for (let b = bl + 1; b < br; b++) {
          lazy[b] += v; sum[b] += v * size(b); hot = b;
          for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'swap');
          emit(); hot = -1;
        }
        for (let i = br * B; i <= r; i++) elem(i);
      }
      continue;
    }
    const l = o.l!, r = o.r!, bl = blk(l), br = blk(r);
    let s = 0;
    op = `sum(${l}, ${r})`; range = `${l}..${r}`; total = 0;
    emit();
    const read = (i: number): void => { st.set(i, 'compare'); s += a[i] + (lazyMode ? lazy[blk(i)] : 0); total = s; emit(); st.set(i, 'found'); };
    if (bl === br) for (let i = l; i <= r; i++) read(i);
    else {
      for (let i = l; i < (bl + 1) * B; i++) read(i);
      for (let b = bl + 1; b < br; b++) {
        for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'compare');
        hot = b; s += sum[b]; total = s; emit();
        for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'found');
        hot = -1;
      }
      for (let i = br * B; i <= r; i++) read(i);
    }
    answers.push(String(s)); emit();
  }
  st = new Map(); hot = -1; op = 'done'; range = null; total = null;
  emit();
  return out;
}
const genBlk = (r: () => number, lazyMode: boolean): BlkIn => {
  const n = rint(r, 3, 12);
  const a = rarr(r, n, -50, 50);
  const ops: BlkOp[] = [];
  for (let i = 0; i < rint(r, 1, 6); i++) {
    const l = rint(r, 0, n - 1), rr = rint(r, l, n - 1);
    const k = r();
    if (k < 0.5) ops.push({ k: 'sum', l, r: rr });
    else if (lazyMode) ops.push({ k: 'add', l, r: rr, v: rint(r, -20, 20) });
    else ops.push({ k: 'set', i: rint(r, 0, n - 1), v: rint(r, -50, 50) });
  }
  return { a, ops };
};
cases.push({
  slug: 'alg-sqrt-decomposition-range-sum-with-updates', gen: (r) => genBlk(r, false), oracle: (i: BlkIn) => blkOracle(i, false), project: (s) => blkShown(s, false),
  invariants: [(s) => {
    // each block sum shown must equal the sum of the cells of that row (set rewrites a[i] and the block sum together; the step that rewrites only a cell does not exist)
    const g = gridOf(s); if (!g) return null;
    const heads = g.rowHeads ?? [];
    for (let b = 0; b < g.rows.length; b++) {
      const m = /Σ=(-?\d+)/.exec(heads[b] ?? ''); if (!m) continue;
      const rowSum = g.rows[b].filter((c) => typeof c.key === 'number').reduce((x, c) => x + Number(c.value), 0);
      if (Number(m[1]) !== rowSum) return `block ${b} heading Σ=${m[1]} != sum of its cells ${rowSum}`;
    }
    return null;
  }],
  notes: 'compared: cell values and colours, block sums (heading and aux), highlighted block, op/range/total variables, answers; block size B = ceil(sqrt n) is taken from the textbook, not read from the animation',
});
cases.push({
  slug: 'cp-range-add-and-range-sum-with-blocks', gen: (r) => genBlk(r, true), oracle: (i: BlkIn) => blkOracle(i, true), project: (s) => blkShown(s, true),
  invariants: [(s) => {
    // the heading sum already includes the lazy tag: Σ = sum of the displayed cells (cells show a[i] + tag)
    const g = gridOf(s); if (!g) return null;
    const heads = g.rowHeads ?? [];
    for (let b = 0; b < g.rows.length; b++) {
      const m = /Σ=(-?\d+)/.exec(heads[b] ?? ''); if (!m) continue;
      const rowSum = g.rows[b].filter((c) => typeof c.key === 'number').reduce((x, c) => x + Number(c.value), 0);
      // while an add is rewriting single elements of a block the Σ is updated together with the element, so the equality always holds
      if (Number(m[1]) !== rowSum) return `block ${b} heading Σ=${m[1]} != sum of displayed cells ${rowSum}`;
    }
    return null;
  }],
  notes: 'compared: displayed cell value (a[i] + block tag) and colour, block sums, lazy tags, highlighted block, op/range/total, answers; the Σ = row-sum invariant is asserted on every step',
});

/* ------------------------------------------------------------------ Fenwick tree family */
const lowbit = (i: number): number => i & -i;
/** ids drawn in a Fenwick scene: 1..n, plus a virtual root 0 labelled "end" (always dim) when there are several tops */
const fenIds = (n: number): { ids: number[]; virtual: boolean } => {
  let tops = 0;
  for (let i = 1; i <= n; i++) if (i + lowbit(i) > n) tops++;
  return { ids: [...(tops > 1 ? [0] : []), ...Array.from({ length: n }, (_, i) => i + 1)], virtual: tops > 1 };
};
function fenShown(s: Step): State {
  const nt = sceneOfKind(s, 'ntree');
  const hereIdx = nt ? (nt.pointers ?? []).find((p) => p.id === 'here')?.index ?? null : null;
  return {
    tree: sortStr((nt?.nodes ?? []).map((n) => `${n.id}:${n.label}`)),
    st: sortStr((nt?.nodes ?? []).filter((n) => n.state).map((n) => `${n.id}:${n.state}`)),
    here: hereIdx === null || !nt ? null : nt.nodes[hereIdx].id,
    path: (nt?.path ?? []).map(Number),
    jumps: sortStr((nt?.extraEdges ?? []).map((e) => `${e.from}>${e.to}:${e.label ?? ''}`)),
  };
}
{
  type In = { nums: number[]; ops: { name: string; args: number[] }[] };
  const gen = (r: () => number): In => {
    const n = rint(r, 2, 8);
    const nums = rarr(r, n, -20, 20);
    if (r() < 0.2) nums.fill(0);
    if (r() < 0.2) for (let i = 0; i < n; i++) if (r() < 0.5) nums[i] = 0;
    const ops: In['ops'] = [];
    for (let i = 0; i < rint(r, 1, 5); i++) ops.push(r() < 0.5 ? { name: 'prefix', args: [rint(r, 1, n)] } : { name: 'add', args: [rint(r, 1, n), rint(r, -20, 20)] });
    return { nums, ops };
  };
  const oracle = ({ nums, ops }: In): State[] => {
    const a = [...nums], n = a.length;
    const { ids } = fenIds(n);
    const tree = new Array<number>(n + 1).fill(0);
    const touched = new Set<number>(); // slots that already hold a (possibly zero) partial sum
    let built = 0;
    let st: Record<number, string> = {}, path: number[] = [], jumps: string[] = [], here: number | null = null;
    let cst: (k: number) => string = () => '';
    let opText = 'build', iShow: number | null = null, sumShow: number | null = null;
    let pieces: string[] = [];
    const answers: string[] = [];
    const out: State[] = [];
    const emit = (): void => {
      const labelOf = (i: number) => (i <= built || touched.has(i) ? String(tree[i]) : '·');
      const stOf = (i: number) => (i <= built || touched.has(i) || st[i] !== undefined ? st[i] : 'dim');
      out.push({
        tree: sortStr(ids.map((i) => (i === 0 ? '0:end' : `${i}:${labelOf(i)}`))),
        st: sortStr(ids.filter((i) => (i === 0 ? 'dim' : stOf(i))).map((i) => `${i}:${i === 0 ? 'dim' : stOf(i)}`)),
        here, path: [...path], jumps: [...jumps].sort(),
        cells: a.slice(), cst: a.map((_, k) => cst(k)), a: a.map((v, k) => `${k + 1}:${v}`), pieces: [...pieces],
        op: opText, i: iShow, sum: sumShow, answers: [...answers],
      });
    };
    emit();
    for (let i = 1; i <= n; i++) {
      tree[i] += a[i - 1]; built = i; touched.add(i);
      const p = i + lowbit(i);
      st = { [i]: 'active' }; here = i; iShow = i;
      if (p <= n) { tree[p] += tree[i]; st[p] = 'found'; touched.add(p); }
      path = p <= n ? [p, i] : [];
      cst = (k) => (k === i - 1 ? 'active' : '');
      emit();
      st = {}; path = [];
    }
    built = n; here = null; cst = () => ''; iShow = null; st = {}; path = [];
    emit();
    for (const o of ops) {
      st = {}; path = []; jumps = []; here = null; pieces = []; sumShow = null; iShow = null; cst = () => '';
      if (o.name === 'add') {
        const [pos, d] = o.args;
        opText = `add(${pos}, ${d})`;
        cst = (k) => (k === pos - 1 ? 'swap' : '');
        emit();
        a[pos - 1] += d;
        const chain: number[] = [];
        for (let j = pos; j <= n; j += lowbit(j)) chain.push(j);
        chain.forEach((j, k) => {
          tree[j] += d; here = j; iShow = j; st = { ...st, [j]: 'active' }; path = chain.slice(0, k + 1).reverse();
          emit();
          st[j] = 'found';
        });
        here = null; path = []; answers.push('null'); emit();
      } else {
        const [pos] = o.args;
        opText = `prefix(${pos})`;
        cst = (k) => (k < pos ? 'active' : '');
        emit();
        let s = 0, j = pos;
        while (j > 0) {
          const nxt = j - lowbit(j);
          s += tree[j]; sumShow = s; iShow = j; here = j; st = { ...st, [j]: 'active' };
          pieces.push(`tree[${j}]=${tree[j]}`);
          jumps = nxt > 0 ? [`${j}>${nxt}:-${lowbit(j)}`] : [];
          emit();
          st[j] = 'compare'; j = nxt;
        }
        jumps = []; here = null; answers.push(String(s)); emit();
      }
    }
    st = {}; path = []; jumps = []; here = null; pieces = []; cst = () => ''; iShow = null; sumShow = null; opText = 'done';
    emit();
    return out;
  };
  const project = (s: Step): State => {
    const grid = gridOf(s);
    const cells = grid?.rows[0] ?? [];
    return {
      ...fenShown(s), cells: cells.map((c) => c.value as number), cst: cells.map((c) => c.state ?? ''), a: auxItems(s, 'a[ ] positions 1..n (the real array)'),
      pieces: auxItems(s, 'tree nodes added by this query'), op: shown(s, 'op') as string, i: num(s, 'i'), sum: num(s, 'sum'), answers: varList(s, 'answers'),
    };
  };
  cases.push({
    slug: 'alg-fenwick-tree-binary-indexed-tree', gen, oracle, project,
    invariants: [(s) => {
      // once built and outside an update, tree[i] must equal the sum of the last lowbit(i) elements of the real array shown at the bottom
      const nt = sceneOfKind(s, 'ntree'); const grid = gridOf(s);
      const op = String(shown(s, 'op'));
      if (!nt || !grid || op === 'build' || op.startsWith('add(') || nt.nodes.some((n) => n.label === '·')) return null;
      const a = grid.rows[0].map((c) => Number(c.value));
      for (const nd of nt.nodes) { if (nd.id === 0) continue; const w = a.slice(nd.id - lowbit(nd.id), nd.id).reduce((x, y) => x + y, 0); if (Number(nd.label) !== w) return `tree[${nd.id}] = ${nd.label} but the block sums to ${w}`; }
      return null;
    }],
    notes: 'compared: every slot label and colour (incl. "not built yet" dots), here pointer, update chain path, query hop arrows with their -lowbit label, array row values and colours, aux lists, op/i/sum/answers; the stale "i" variable on the Answer step is compared as shown (last slot read)',
  });
}
{
  type Mode = 'smaller' | 'inversions';
  const gen = (r: () => number): number[] => rarr(r, rint(r, 2, 8), -9, r() < 0.4 ? -6 : 9);
  const make = (mode: Mode) => (nums: number[]): State[] => {
    const n = nums.length;
    const sorted = [...new Set(nums)].sort((x, y) => x - y);
    const m = sorted.length;
    const { ids } = fenIds(m);
    const tree = new Array<number>(m + 1).fill(0);
    const inserted = new Array<boolean>(n).fill(false);
    const recorded = new Array<boolean>(n).fill(false);
    const ans = new Array<number>(n).fill(0);
    const order = mode === 'smaller' ? Array.from({ length: n }, (_, k) => n - 1 - k) : Array.from({ length: n }, (_, k) => k);
    let total = 0, cur = -1;
    let jShow: number | null = null, sumShow: number | null = null, rankShow: number | null = null;
    let st: Record<number, string> = {}, jumps: string[] = [], path: number[] = [], here: number | null = null, pieces: string[] = [];
    const out: State[] = [];
    const emit = (): void => {
      out.push({
        tree: sortStr(ids.map((i) => (i === 0 ? '0:end' : `${i}:${tree[i]}`))),
        st: sortStr(ids.filter((i) => (i === 0 ? 'dim' : st[i])).map((i) => `${i}:${i === 0 ? 'dim' : st[i]}`)),
        here, path: [...path], jumps: [...jumps].sort(),
        cells: nums.slice(), cst: nums.map((_, i) => (i === cur ? 'active' : inserted[i] ? 'sorted' : '')), cur: cur >= 0 ? cur : null,
        rankval: sorted.map((v, k) => `${k + 1}→${v}`), pieces: [...pieces],
        i: cur >= 0 ? `${cur} (value ${nums[cur]})` : null, rank: rankShow, j: jShow, sum: sumShow,
        out: mode === 'smaller' ? ans.map((v, i) => (recorded[i] ? String(v) : '?')) : String(total),
      });
    };
    emit();
    for (const idx of order) {
      cur = idx;
      const r = sorted.indexOf(nums[idx]) + 1;
      rankShow = r; st = {}; jumps = []; path = []; here = null; pieces = []; jShow = null; sumShow = null;
      emit();
      let j = mode === 'smaller' ? r - 1 : r, s = 0;
      if (j === 0) { sumShow = 0; emit(); }
      while (j > 0) {
        const nxt = j - lowbit(j);
        st = { ...st, [j]: 'active' }; here = j; jShow = j; s += tree[j]; sumShow = s; pieces.push(`tree[${j}]=${tree[j]}`);
        jumps = nxt > 0 ? [`${j}>${nxt}:-${lowbit(j)}`] : [];
        emit();
        st[j] = 'compare'; j = nxt;
      }
      jumps = []; here = null; jShow = null;
      const seen = inserted.filter(Boolean).length;
      if (mode === 'smaller') { ans[idx] = s; recorded[idx] = true; } else total += seen - s;
      emit();
      st = {}; pieces = [];
      emit();
      const chain: number[] = [];
      for (let u = r; u <= m; u += lowbit(u)) chain.push(u);
      chain.forEach((node, k) => {
        tree[node] += 1; here = node; jShow = node; st = { ...st, [node]: 'active' }; path = chain.slice(0, k + 1).reverse();
        emit();
        st[node] = 'found';
      });
      inserted[idx] = true;
    }
    cur = -1; here = null; path = []; jumps = []; st = {}; pieces = []; jShow = null; sumShow = null; rankShow = null;
    emit();
    return out;
  };
  const project = (mode: Mode) => (s: Step): State => {
    const arr = sceneOfKind(s, 'array');
    const o = String(s.vars[mode === 'smaller' ? 'counts' : 'inversions']);
    return {
      ...fenShown(s), cells: (arr?.cells ?? []).map((c) => c.value as number), cst: (arr?.cells ?? []).map((c) => c.state ?? ''), cur: ptr(s, 'cur'),
      rankval: auxItems(s, 'rank → value'), pieces: auxItems(s, 'tree nodes added in this query'),
      i: shown(s, 'i') as string | null, rank: num(s, 'rank'), j: num(s, 'j'), sum: num(s, 'sum'),
      out: mode === 'smaller' ? o.replace(/^\[/, '').replace(/\]$/, '').split(/,\s*/) : o,
    };
  };
  const refInv = (a: number[]): number => { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++; return c; };
  cases.push({
    slug: '315-count-of-smaller-numbers-after-self', gen, oracle: make('smaller'), project: project('smaller'),
    invariants: [(s, _i, _st, nums) => {
      const o = String(s.vars.counts).replace(/^\[/, '').replace(/\]$/, '').split(/,\s*/);
      for (let i = 0; i < o.length; i++) if (o[i] !== '?' && Number(o[i]) !== nums.slice(i + 1).filter((y) => y < nums[i]).length) return `counts[${i}] = ${o[i]} but the true count is ${nums.slice(i + 1).filter((y) => y < nums[i]).length}`;
      return null;
    }],
    notes: 'compared: Fenwick slot counts and colours, here/path/hop arrows, array row with the current-item pointer, rank table, query pieces, i/rank/j/sum variables and the counts array (a count is expected to be visible as soon as it is recorded)',
  });
  cases.push({
    slug: 'cp-count-inversions-with-a-fenwick-tree', gen, oracle: make('inversions'), project: project('inversions'),
    invariants: [(s, _i, _st, nums) => { const t = Number(s.vars.inversions); return t <= refInv(nums) ? null : `running inversions ${t} exceeds the true total ${refInv(nums)}`; }],
    notes: 'same projection as 315; the running inversion total is compared at every step and bounded by the brute-force total',
  });
}

/* ------------------------------------------------------------------ computational geometry on the plane scene */
type Pt = [number, number];
const crs = (o: Pt, a: Pt, b: Pt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const d2 = (a: Pt, b: Pt): number => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
const fp = (p: Pt): string => `(${p[0]},${p[1]})`;
interface Seg { from: number; to: number; state?: string; label?: string }
interface PlaneO {
  states?: Record<number, string>; tones?: Record<number, string>; labels?: Record<number, string>; segs?: Seg[];
  poly?: { ids: number[]; closed: boolean; state: string } | null; sweep?: { at: number; label: string } | null; ptrs?: { id: string; index: number }[];
}
/** Everything the viewer can read off a plane scene, as comparable strings. */
function planeFmt(pts: Pt[], o: PlaneO): State {
  return {
    pts: pts.map((_, i) => `${i}:${o.states?.[i] ?? ''}/${o.tones?.[i] ?? ''}`),
    labels: pts.map((p, i) => o.labels?.[i] ?? `${p[0]},${p[1]}`),
    segs: (o.segs ?? []).map((g) => `${g.from}>${g.to}:${g.state ?? ''}:${g.label ?? ''}`).sort(),
    poly: o.poly ? `ids=${o.poly.ids.join(',')}|${o.poly.closed}|${o.poly.state}` : null,
    sweep: o.sweep ? `${o.sweep.at}:${o.sweep.label}` : null,
    ptrs: (o.ptrs ?? []).map((p) => `${p.id}@${p.index}`).sort(),
  };
}
function planeShown(s: Step): State {
  const pl = sceneOfKind(s, 'plane');
  const poly = pl?.polygon;
  return {
    pts: (pl?.points ?? []).map((p) => `${p.id}:${p.state ?? ''}/${p.tone ?? ''}`),
    labels: (pl?.points ?? []).map((p) => p.label ?? ''),
    segs: (pl?.segments ?? []).map((g) => `${g.from}>${g.to}:${g.state ?? ''}:${g.label ?? ''}`).sort(),
    poly: poly ? `ids=${poly.ids.join(',')}|${poly.closed ?? true}|${poly.state ?? ''}` : null,
    sweep: pl?.sweep ? `${pl.sweep.at}:${pl.sweep.label ?? ''}` : null,
    ptrs: (pl?.pointers ?? []).map((p) => `${p.id}@${p.index}`).sort(),
  };
}
/** random distinct points, sometimes on a tiny grid so that collinear triples and ties are common */
function genPts(r: () => number, minN = 2): Pt[] {
  const hi = [2, 3, 3, 6, 12][rint(r, 0, 4)];
  const n = rint(r, minN, Math.min(10, (hi + 1) * (hi + 1)));
  const seen = new Set<string>(), out: Pt[] = [];
  while (out.length < n) { const p: Pt = [rint(r, 0, hi), rint(r, 0, hi)]; const k = `${p}`; if (!seen.has(k)) { seen.add(k); out.push(p); } }
  return out;
}
/** textbook monotone chain (counter-clockwise from the leftmost-lowest point); collinear boundary points dropped unless `keep` */
function monotone(pts: Pt[], keep: boolean): Pt[] {
  const ps = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (ps.length <= 2) return ps;
  const bad = (c: number) => (keep ? c < 0 : c <= 0);
  const chain = (seq: Pt[]): Pt[] => { const st: Pt[] = []; for (const p of seq) { while (st.length >= 2 && bad(crs(st[st.length - 2], st[st.length - 1], p))) st.pop(); st.push(p); } return st; };
  const lo = chain(ps), up = chain([...ps].reverse());
  const all = [...lo.slice(0, -1), ...up.slice(0, -1)];
  const seen = new Set<string>();
  return all.filter((p) => { const k = `${p}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
const hullBrute = (pts: Pt[], keep: boolean): Set<string> => {
  // a point is a hull corner when it is not inside / on the segment-fan of the others; brute force by testing every ordered pair as a supporting edge
  const out = new Set<string>();
  for (const a of pts) for (const b of pts) {
    if (a === b) continue;
    const cs = pts.map((c) => crs(a, b, c));
    if (cs.every((c) => c >= 0) || cs.every((c) => c <= 0)) {
      // a-b is a supporting line: the extreme points on it are corners, the points between them are boundary points
      const on = pts.filter((c) => crs(a, b, c) === 0);
      const dir: Pt = [b[0] - a[0], b[1] - a[1]];
      const t = on.map((c) => (c[0] - a[0]) * dir[0] + (c[1] - a[1]) * dir[1]);
      const lo = on[t.indexOf(Math.min(...t))], hi = on[t.indexOf(Math.max(...t))];
      out.add(`${lo}`); out.add(`${hi}`);
      if (keep) on.forEach((c) => out.add(`${c}`));
    }
  }
  return out;
};

/* 'cp-graham-scan-convex-hull' */
{
  type In = { pts: Pt[] };
  const oracle = ({ pts }: In): State[] => {
    const n = pts.length;
    let pivot = 0;
    for (let i = 1; i < n; i++) if (pts[i][1] < pts[pivot][1] || (pts[i][1] === pts[pivot][1] && pts[i][0] < pts[pivot][0])) pivot = i;
    const order = pts.map((_, i) => i).sort((a, b) => { const c = crs(pts[pivot], pts[a], pts[b]); return c !== 0 ? (c > 0 ? -1 : 1) : d2(pts[pivot], pts[a]) - d2(pts[pivot], pts[b]); });
    const rank: Record<number, string> = {};
    order.forEach((id, k) => { rank[id] = `${k}:${pts[id][0]},${pts[id][1]}`; });
    const st: number[] = [];
    let cur: number | null = null, last: number | null = null, sorted = false, final = false;
    const out: State[] = [];
    const emit = (focus: Record<number, string> = {}, segs?: Seg[]): void => {
      const states: Record<number, string> = {}, tones: Record<number, string> = {};
      pts.forEach((_, i) => { if (final) states[i] = st.includes(i) ? 'found' : 'dim'; else if (i === pivot) states[i] = 'compare'; else if (st.includes(i)) tones[i] = 'blue'; });
      Object.assign(states, focus);
      for (const k of Object.keys(states)) if (states[+k] !== 'found' && states[+k] !== 'dim') delete tones[+k];
      const rays = sorted && !final && segs === undefined && cur === null ? order.filter((i) => i !== pivot).map((i) => ({ from: pivot, to: i, state: 'dim' })) : segs;
      out.push({
        ...planeFmt(pts, { states, tones, labels: sorted ? rank : undefined, segs: rays, poly: st.length >= 2 ? { ids: [...st], closed: final, state: final ? 'found' : 'active' } : null, ptrs: cur !== null && !final ? [{ id: 'p', index: cur }] : [] }),
        pivot: fp(pts[pivot]), p: cur === null ? null : fp(pts[cur]), size: st.length, cross: last, stack: sorted ? st.map((i) => fp(pts[i])) : [], hl: sorted ? st.length - 1 : null,
      });
    };
    emit();
    sorted = true; emit();
    for (const id of order) {
      cur = id;
      if (st.length < 2) { st.push(id); emit({ [id]: 'active' }, []); continue; }
      while (st.length >= 2) {
        const a = st[st.length - 2], b = st[st.length - 1];
        const c = crs(pts[a], pts[b], pts[id]);
        last = c;
        const pop = c <= 0;
        emit({ [id]: 'active', [b]: pop ? 'error' : 'compare', [a]: 'compare' }, [{ from: a, to: b, state: 'visited' }, { from: b, to: id, state: pop ? 'error' : 'chosen', label: pop ? (c === 0 ? 'straight' : 'right') : 'left' }]);
        if (!pop) break;
        st.pop();
      }
      st.push(id);
      emit({ [id]: 'active' }, []);
    }
    cur = null; final = true;
    emit({}, []);
    return out;
  };
  cases.push({
    slug: 'cp-graham-scan-convex-hull', gen: (r): In => ({ pts: genPts(r) }), oracle,
    project: (s) => ({
      ...planeShown(s), pivot: shown(s, 'pivot') as string, p: shown(s, 'p') as string | null, size: num(s, 'stack size'), cross: num(s, 'cross'),
      stack: auxItems(s, 'stack (bottom → top)'), hl: (s.aux ?? [])[0]?.highlight ?? null,
    }),
    invariants: [(s, i, steps, { pts }) => {
      if (i !== steps.length - 1) return null;
      const pl = sceneOfKind(s, 'plane'); const poly = pl?.polygon;
      if (!poly) return 'no closed hull polygon at the end';
      const got = new Set(poly.ids.map((id) => `${pts[id]}`)), want = hullBrute(pts, false);
      return got.size === want.size && [...got].every((x) => want.has(x)) ? null : `final hull ${[...got].join(' ')} != brute-force corners ${[...want].join(' ')}`;
    }],
    notes: 'collinear policy: points on a hull edge that are not corners are dropped (pop when cross <= 0), per the problem statement; compared at every step: point colours/tones, rank labels, segments with their turn labels, the stack polygon, pointer, pivot/p/stack size/cross variables and the stack panel; the final hull is also checked against a brute-force supporting-line test',
  });
}

/* 'cp-jarvis-march-gift-wrapping' */
{
  type In = { pts: Pt[] };
  const oracle = ({ pts }: In): State[] => {
    const n = pts.length;
    let start = 0;
    for (let i = 1; i < n; i++) if (pts[i][0] < pts[start][0] || (pts[i][0] === pts[start][0] && pts[i][1] < pts[start][1])) start = i;
    const hull: number[] = [];
    let cur = start, next: number | null = null, cand: number | null = null, last: number | null = null, final = false;
    const out: State[] = [];
    const emit = (focus: Record<number, string> = {}, segs?: Seg[]): void => {
      const states: Record<number, string> = {}, tones: Record<number, string> = {};
      pts.forEach((_, i) => { if (final) states[i] = hull.includes(i) ? 'found' : 'dim'; else if (hull.includes(i)) tones[i] = 'green'; });
      Object.assign(states, focus);
      for (const k of Object.keys(states)) if (states[+k] !== 'found' && states[+k] !== 'dim') delete tones[+k];
      out.push({
        ...planeFmt(pts, { states, tones, segs, poly: hull.length >= 2 ? { ids: [...hull], closed: final, state: 'found' } : null, ptrs: final ? [] : [{ id: 'cur', index: cur }, ...(cand !== null ? [{ id: 'cand', index: cand }] : [])] }),
        cur: fp(pts[cur]), next: next === null ? null : fp(pts[next]), size: hull.length, cross: last,
      });
    };
    emit({ [start]: 'compare' });
    let guard = 0;
    do {
      hull.push(cur);
      next = (cur + 1) % n; cand = null; last = null;
      emit({ [cur]: 'compare', [next]: 'swap' }, [{ from: cur, to: next, state: 'visited' }]);
      for (let i = 0; i < n; i++) {
        if (i === cur || i === next) continue;
        cand = i;
        const c = crs(pts[cur], pts[next], pts[i]);
        last = c;
        const better = c < 0 || (c === 0 && d2(pts[cur], pts[i]) > d2(pts[cur], pts[next]));
        emit({ [cur]: 'compare', [next]: 'swap', [i]: better ? 'active' : 'dim' }, [{ from: cur, to: next, state: 'visited' }, { from: cur, to: i, state: better ? 'active' : 'dim', label: c < 0 ? 'right' : c === 0 ? 'straight' : 'left' }]);
        if (better) next = i;
      }
      cand = null;
      emit({ [cur]: 'compare', [next]: 'found' }, [{ from: cur, to: next, state: 'chosen' }]);
      cur = next;
    } while (cur !== start && ++guard < 40);
    final = true;
    emit({}, []);
    return out;
  };
  cases.push({
    slug: 'cp-jarvis-march-gift-wrapping', gen: (r): In => ({ pts: genPts(r) }), oracle,
    project: (s) => ({ ...planeShown(s), cur: shown(s, 'cur') as string, next: shown(s, 'next') as string | null, size: num(s, 'hull size'), cross: num(s, 'cross') }),
    invariants: [(s, i, steps, { pts }) => {
      if (i !== steps.length - 1) return null;
      const poly = sceneOfKind(s, 'plane')?.polygon;
      if (!poly) return 'no hull polygon at the end';
      const got = new Set(poly.ids.map((id) => `${pts[id]}`)), want = hullBrute(pts, false);
      return got.size === want.size && [...got].every((x) => want.has(x)) ? null : `final hull ${[...got].join(' ')} != brute-force corners ${[...want].join(' ')}`;
    }],
    notes: 'collinear policy: of several collinear candidates the farthest wins, so edge points are not corners; the provisional first candidate is (cur+1) mod n as in the Java; every candidate test (cross value, turn label, replacement) is compared; final hull also checked by brute force',
  });
}

/* 'cp-rotating-calipers-polygon-diameter' */
{
  type In = { pts: Pt[] };
  const oracle = ({ pts }: In): State[] => {
    const hp = monotone(pts, false);
    const id = (p: Pt) => pts.findIndex((q) => q[0] === p[0] && q[1] === p[1]);
    const h = hp.map(id), m = h.length;
    const area2 = (a: Pt, b: Pt, c: Pt) => Math.abs(crs(a, b, c));
    let bestIds: [number, number] | null = null, best = 0;
    let curI: number | null = null, curJ: number | null = null, last: string | number | null = null, final = false;
    const out: State[] = [];
    const emit = (segsIn: Seg[] = []): void => {
      const states: Record<number, string> = {}, tones: Record<number, string> = {};
      pts.forEach((_, i) => { if (!h.includes(i)) states[i] = 'dim'; else tones[i] = 'blue'; });
      if (curI !== null) { states[h[curI]] = 'compare'; states[h[(curI + 1) % m]] = 'compare'; }
      if (curJ !== null) states[h[curJ]] = 'active';
      if (final && bestIds) { states[bestIds[0]] = 'found'; states[bestIds[1]] = 'found'; }
      for (const k of Object.keys(states)) if (states[+k] !== 'dim') delete tones[+k];
      const segs = [...segsIn];
      if (bestIds && best > 0) segs.push({ from: bestIds[0], to: bestIds[1], state: final ? 'chosen' : 'visited', label: `d²=${best}` });
      out.push({
        ...planeFmt(pts, { states, tones, segs, poly: m >= 3 ? { ids: h, closed: true, state: 'active' } : null, ptrs: curJ !== null && !final ? [{ id: 'j', index: h[curJ] }] : [] }),
        edge: curI === null ? null : `${fp(pts[h[curI]])}→${fp(pts[h[(curI + 1) % m]])}`, j: curJ === null ? null : fp(pts[h[curJ]]), best, area: last,
      });
    };
    emit();
    if (m <= 2) {
      best = m === 2 ? d2(pts[h[0]], pts[h[1]]) : 0; bestIds = m === 2 ? [h[0], h[1]] : null; final = true;
      emit();
      return out;
    }
    let j = 1;
    for (let i = 0; i < m; i++) {
      const ni = (i + 1) % m;
      curI = i; curJ = j; last = area2(pts[h[i]], pts[h[ni]], pts[h[j]]);
      emit([{ from: h[i], to: h[ni], state: 'chosen' }, { from: h[i], to: h[j], state: 'dim' }, { from: h[ni], to: h[j], state: 'dim' }]);
      for (;;) {
        const nj = (j + 1) % m;
        const a0 = area2(pts[h[i]], pts[h[ni]], pts[h[j]]), a1 = area2(pts[h[i]], pts[h[ni]], pts[h[nj]]);
        const grow = a1 > a0;
        last = `${a1} vs ${a0}`;
        emit([{ from: h[i], to: h[ni], state: 'chosen' }, { from: h[i], to: h[j], state: 'active' }, { from: h[ni], to: h[nj], state: grow ? 'active' : 'dim' }]);
        if (!grow) break;
        j = nj; curJ = j;
      }
      const e1 = d2(pts[h[i]], pts[h[j]]), e2 = d2(pts[h[ni]], pts[h[j]]);
      const pick: [number, number] = e1 >= e2 ? [h[i], h[j]] : [h[ni], h[j]];
      const dm = Math.max(e1, e2);
      if (dm > best) { best = dm; bestIds = pick; }
      emit([{ from: h[i], to: h[j], state: 'active' }, { from: h[ni], to: h[j], state: 'active' }]);
    }
    curI = null; curJ = null; final = true;
    emit();
    return out;
  };
  cases.push({
    slug: 'cp-rotating-calipers-polygon-diameter', gen: (r): In => ({ pts: genPts(r) }), oracle,
    project: (s) => ({ ...planeShown(s), edge: shown(s, 'edge') as string | null, j: shown(s, 'j') as string | null, best: num(s, "best d²"), area: shown(s, 'area') as string | number | null }),
    invariants: [(s, _i, _st, { pts }) => {
      const b = num(s, 'best d²'); if (b === null) return null;
      let mx = 0; for (const p of pts) for (const q of pts) mx = Math.max(mx, d2(p, q));
      return b <= mx ? null : `best d² ${b} exceeds the true maximum ${mx}`;
    }, (s, i, steps, { pts }) => {
      if (i !== steps.length - 1) return null;
      let mx = 0; for (const p of pts) for (const q of pts) mx = Math.max(mx, d2(p, q));
      return num(s, 'best d²') === mx ? null : `final best d² ${num(s, 'best d²')} != brute-force diameter² ${mx}`;
    }],
    notes: 'the hull is computed silently by the animation (monotone chain) and by the oracle independently; tie rules shown consistently are mirrored: j advances only on a strictly larger area, and on equal endpoint distances the first edge endpoint is paired with j; the final diameter² is also checked by brute force',
  });
}

/* '587-erect-the-fence' */
{
  type In = { pts: Pt[] };
  const oracle = ({ pts }: In): State[] => {
    const order = pts.map((_, i) => i).sort((a, b) => pts[a][0] - pts[b][0] || pts[a][1] - pts[b][1]);
    const hull: number[] = [];
    let pass: string | null = null, cur: number | null = null, last: number | null = null, tone = 'blue', final = false;
    const out: State[] = [];
    const emit = (focus: Record<number, string> = {}, segs?: Seg[]): void => {
      const states: Record<number, string> = {}, tones: Record<number, string> = {};
      pts.forEach((_, i) => { if (final) states[i] = hull.includes(i) ? 'found' : 'dim'; else if (hull.includes(i)) tones[i] = tone; });
      Object.assign(states, focus);
      for (const k of Object.keys(states)) if (states[+k] !== 'found' && states[+k] !== 'dim') delete tones[+k];
      out.push({
        ...planeFmt(pts, {
          states, tones, segs, sweep: cur !== null && !final ? { at: pts[cur][0], label: `x=${pts[cur][0]}` } : null,
          poly: hull.length >= 2 ? { ids: [...hull], closed: final, state: final ? 'found' : tone === 'blue' ? 'active' : 'swap' } : null,
          ptrs: cur !== null && !final ? [{ id: 'p', index: cur }] : [],
        }),
        pass, p: cur === null ? null : fp(pts[cur]), size: hull.length, cross: last,
      });
    };
    emit();
    for (let ps = 0; ps < 2; ps++) {
      pass = ps === 0 ? 'lower' : 'upper'; tone = ps === 0 ? 'blue' : 'purple';
      const seq = ps === 0 ? order : [...order].reverse();
      const start = hull.length;
      cur = null; emit();
      for (const id of seq) {
        cur = id; emit({ [id]: 'active' });
        while (hull.length - start >= 2) {
          const a = hull[hull.length - 2], b = hull[hull.length - 1];
          const c = crs(pts[a], pts[b], pts[id]);
          last = c;
          const right = c < 0;
          emit({ [id]: 'active', [b]: right ? 'error' : 'compare', [a]: 'compare' }, [{ from: a, to: b, state: 'visited' }, { from: b, to: id, state: right ? 'error' : 'chosen', label: right ? 'right' : c === 0 ? 'straight' : 'left' }]);
          if (!right) break;
          hull.pop();
        }
        hull.push(id); emit({ [id]: 'active' });
      }
      cur = null; hull.pop(); emit();
    }
    const seen = new Set<number>();
    const uq = hull.filter((i) => (seen.has(i) ? false : (seen.add(i), true)));
    hull.length = 0; hull.push(...uq);
    final = true; emit();
    return out;
  };
  cases.push({
    slug: '587-erect-the-fence', gen: (r): In => ({ pts: genPts(r) }), oracle,
    project: (s) => ({ ...planeShown(s), pass: shown(s, 'pass') as string | null, p: shown(s, 'p') as string | null, size: num(s, 'hull size'), cross: num(s, 'cross') }),
    invariants: [(s, i, steps, { pts }) => {
      if (i !== steps.length - 1) return null;
      const pl = sceneOfKind(s, 'plane');
      const got = new Set((pl?.points ?? []).filter((p) => p.state === 'found').map((p) => `${pts[p.id]}`));
      const want = hullBrute(pts, true);
      return got.size === want.size && [...got].every((x) => want.has(x)) ? null : `final fence ${[...got].join(' ')} != brute-force boundary points ${[...want].join(' ')}`;
    }],
    notes: 'collinear policy of LeetCode 587: every tree on the hull boundary is kept (pop only on cross < 0), so the chains may share points and the final list is de-duplicated; every sweep step (point, cross, turn label, chain polygon, sweep line) is compared and the final set is checked against a brute-force supporting-line test',
  });
}

/* ------------------------------------------------------------------ persistent segment trees (version DAGs) */
/** A node as drawn: range text, value, creating version, colour state, children (left then right). */
interface DN { range: string; val: number; ver: number; state: string; kids: number[] }
/** Canonical form of a DAG: preorder numbering from the version roots (in order), so node ids / creation order do not matter but sharing does. */
function canonDag(nodes: Map<number, DN>, roots: number[], pointers: { label: string; node: number }[]): State {
  const idx = new Map<number, number>();
  const lines: string[] = [];
  const visit = (id: number): number => {
    if (idx.has(id)) return idx.get(id)!;
    const k = idx.size; idx.set(id, k); lines.push('');
    const n = nodes.get(id)!;
    const kids = n.kids.map(visit);
    lines[k] = `${k}:${n.range}|${n.val}|v${n.ver}|${n.state}|${kids.join(',')}`;
    return k;
  };
  const r = roots.map(visit);
  return { dag: lines, roots: r, ptrs: pointers.map((p) => `${p.label}@${idx.get(p.node) ?? '?'}`) };
}
const VER_TONES = ['orange', 'purple', 'red', 'yellow', 'green'];
/** Reads the DAG a step draws into the same canonical form (tone -> creating version, as the caption "grey v0, orange v1, purple v2, red v3" says). */
function dagShown(s: Step): State {
  const nt = sceneOfKind(s, 'ntree');
  const nodes = new Map<number, DN>();
  let roots: number[] = [];
  for (const n of nt?.nodes ?? []) {
    if (n.id === -1) { roots = n.children; continue; }
    const ver = n.tone ? VER_TONES.indexOf(n.tone) + 1 : 0;
    nodes.set(n.id, { range: n.sub ?? '', val: Number(n.label), ver, state: n.state ?? '', kids: n.children });
  }
  const ptrs = (nt?.pointers ?? []).map((p) => ({ label: p.label, node: nt!.nodes[p.index].id }));
  return canonDag(nodes, roots, ptrs);
}

/* 'cp-persistent-segment-tree-version-array' */
{
  type Op = { k: 'set'; i: number; v: number } | { k: 'get'; ver: number; i: number };
  type In = { a: number[]; ops: Op[] };
  const gen = (r: () => number): In => {
    const n = rint(r, 2, 4);
    const a = rarr(r, n, -50, 50);
    const ops: Op[] = [];
    let versions = 1;
    for (let t = 0; t < rint(r, 1, 6); t++) {
      if (r() < 0.45 && versions < 4) { versions++; ops.push({ k: 'set', i: rint(r, 0, n - 1), v: rint(r, -50, 50) }); }
      else ops.push({ k: 'get', ver: rint(r, 0, versions - 1), i: rint(r, 0, n - 1) });
    }
    return { a, ops };
  };
  const oracle = ({ a, ops }: In): State[] => {
    const n = a.length;
    interface PN { id: number; lo: number; hi: number; val: number; ver: number; l: number | null; r: number | null }
    const pool: PN[] = [];
    const roots: number[] = [];
    const versArr: number[][] = [[...a]];
    const answers: number[] = [];
    let st: Record<number, string> = {};
    let ptrs: { label: string; node: number }[] = [];
    let op: string | null = null, version: number | null = 0, index: number | null = null;
    const out: State[] = [];
    const rl = (x: PN) => (x.lo === x.hi ? `[${x.lo}]` : `[${x.lo},${x.hi}]`);
    const emit = (): void => {
      const m = new Map<number, DN>();
      for (const x of pool) m.set(x.id, { range: rl(x), val: x.val, ver: x.ver, state: st[x.id] ?? '', kids: [x.l, x.r].filter((c): c is number => c !== null) });
      out.push({
        ...canonDag(m, roots, ptrs), versions: versArr.map((v, k) => `v${k}: [${v.join(' ')}]`), hl: roots.length - 1, answers: answers.map(String),
        op, version, index, ans: [...answers],
      });
    };
    const mk = (lo: number, hi: number, l: number | null, r: number | null, val: number, ver: number): PN => { const nd = { id: pool.length, lo, hi, val, ver, l, r }; pool.push(nd); return nd; };
    const build = (l: number, r: number): number => {
      if (l === r) return mk(l, r, null, null, a[l], 0).id;
      const m = (l + r) >> 1;
      const L = build(l, m), R = build(m + 1, r);
      return mk(l, r, L, R, pool[L].val + pool[R].val, 0).id;
    };
    roots.push(build(0, n - 1));
    emit();
    for (const o of ops) {
      st = {}; ptrs = [];
      if (o.k === 'set') {
        const ver = roots.length;
        version = ver; index = o.i; op = `set(${o.i}, ${o.v}) -> v${ver}`;
        emit();
        const copies: PN[] = [];
        let old = pool[roots[roots.length - 1]];
        let l = 0, r = n - 1;
        for (;;) {
          const cp = mk(l, r, old.l, old.r, old.val, ver);
          if (copies.length) { const par = copies[copies.length - 1]; if (par.l === old.id) par.l = cp.id; else par.r = cp.id; } else roots.push(cp.id);
          copies.push(cp);
          st = {}; copies.forEach((c) => { st[c.id] = 'active'; }); st[old.id] = 'compare';
          if (l === r) { cp.val = o.v; emit(); break; }
          emit();
          const m = (l + r) >> 1;
          if (o.i <= m) { old = pool[old.l!]; r = m; } else { old = pool[old.r!]; l = m + 1; }
        }
        versArr.push(versArr[versArr.length - 1].map((x, k) => (k === o.i ? o.v : x)));
        for (let d = copies.length - 2; d >= 0; d--) {
          const c = copies[d];
          c.val = pool[c.l!].val + pool[c.r!].val;
          st = {}; copies.forEach((x) => { st[x.id] = 'active'; }); st[c.id] = 'swap';
          emit();
        }
        st = {};
        const fresh = new Set(copies.map((c) => c.id));
        copies.forEach((c) => { st[c.id] = 'active'; for (const ch of [c.l, c.r]) if (ch !== null && !fresh.has(ch)) st[ch] = 'found'; });
        emit();
        continue;
      }
      version = o.ver; index = o.i; op = `get(v${o.ver}, ${o.i})`;
      let cur = pool[roots[o.ver]];
      let l = 0, r = n - 1;
      const walked: number[] = [cur.id];
      st = { [cur.id]: 'active' }; ptrs = [{ label: `v${o.ver}`, node: cur.id }];
      emit();
      while (l < r) {
        const m = (l + r) >> 1;
        const goLeft = o.i <= m;
        cur = pool[goLeft ? cur.l! : cur.r!];
        if (goLeft) r = m; else l = m + 1;
        walked.push(cur.id);
        st = {}; walked.forEach((w) => { st[w] = 'compare'; }); st[cur.id] = 'active';
        ptrs = [{ label: `v${o.ver}`, node: cur.id }];
        emit();
      }
      answers.push(cur.val);
      st = {}; walked.forEach((w) => { st[w] = 'compare'; }); st[cur.id] = 'found';
      emit();
    }
    st = {}; ptrs = []; op = 'done'; version = null; index = null;
    emit();
    return out;
  };
  cases.push({
    slug: 'cp-persistent-segment-tree-version-array', gen, oracle,
    project: (s) => ({
      ...dagShown(s), versions: auxItems(s, 'versions (array contents)'), hl: (s.aux ?? []).find((x) => x.title.startsWith('versions'))?.highlight ?? null, answers: auxItems(s, 'get answers'),
      op: shown(s, 'op') as string, version: num(s, 'version'), index: num(s, 'index'), ans: varList(s, 'answers').map(String),
    }),
    invariants: [(s, _i, _st, { a, ops }) => {
      // every version listed must equal the plain array after the corresponding prefix of set operations
      const items = auxItems(s, 'versions (array contents)');
      const arrs: number[][] = [[...a]];
      for (const o of ops) if (o.k === 'set') { const nx = [...arrs[arrs.length - 1]]; nx[o.i] = o.v; arrs.push(nx); }
      for (let k = 0; k < items.length; k++) if (items[k] !== `v${k}: [${arrs[k].join(' ')}]`) return `version list entry ${k} is ${items[k]}, expected v${k}: [${arrs[k].join(' ')}]`;
      return null;
    }],
    notes: 'node ids / creation order are abstracted away: the node graph is compared in canonical preorder form (range, value, creating version from the node colour, state colour, child links incl. which nodes are shared) plus the version roots and walk pointers',
  });
}

/* 'cp-kth-smallest-in-a-range-persistent-segment-tree' */
{
  type In = { a: number[]; qs: { l: number; r: number; k: number }[] };
  const gen = (r: () => number): In => {
    const n = rint(r, 2, 5);
    const pool = uniq(Array.from({ length: rint(r, 1, 4) }, () => rint(r, 1, 99)));
    const a = Array.from({ length: n }, () => pool[rint(r, 0, pool.length - 1)]);
    const qs: In['qs'] = [];
    for (let i = 0; i < rint(r, 1, 3); i++) { const l = rint(r, 1, n), rr = rint(r, l, n); qs.push({ l, r: rr, k: rint(r, 1, rr - l + 1) }); }
    return { a, qs };
  };
  const oracle = ({ a, qs }: In): State[] => {
    const vals = [...new Set(a)].sort((x, y) => x - y), m = vals.length;
    interface PN { id: number; lo: number; hi: number; val: number; ver: number; l: number | null; r: number | null }
    const pool: PN[] = [];
    const roots: number[] = [];
    const answers: number[] = [];
    let st: Record<number, string> = {};
    let ptrs: { label: string; node: number }[] = [];
    let op: string | null = null, rangeTxt: string | null = null, kk: number | null = null;
    const out: State[] = [];
    const lab = (x: PN) => (x.lo === x.hi ? `v=${vals[x.lo]}` : `${vals[x.lo]}..${vals[x.hi]}`);
    const prefix = (i: number) => `{${a.slice(0, i).join(' ')}}`;
    const emit = (): void => {
      const mp = new Map<number, DN>();
      for (const x of pool) mp.set(x.id, { range: lab(x), val: x.val, ver: x.ver, state: st[x.id] ?? '', kids: [x.l, x.r].filter((c): c is number => c !== null) });
      out.push({ ...canonDag(mp, roots, ptrs), versions: roots.map((_, i) => `v${i}: ${prefix(i)}`), hl: roots.length - 1, answers: answers.map(String), op, range: rangeTxt, k: kk, ans: answers.map(String) });
    };
    const mk = (lo: number, hi: number, l: number | null, r: number | null, val: number, ver: number): PN => { const nd = { id: pool.length, lo, hi, val, ver, l, r }; pool.push(nd); return nd; };
    const empty = (lo: number, hi: number): number => {
      if (lo === hi) return mk(lo, hi, null, null, 0, 0).id;
      const mid = (lo + hi) >> 1;
      const L = empty(lo, mid), R = empty(mid + 1, hi);
      return mk(lo, hi, L, R, 0, 0).id;
    };
    roots.push(empty(0, m - 1));
    emit();
    a.forEach((x, idx) => {
      const ver = idx + 1, rank = vals.indexOf(x);
      st = {}; op = `insert a[${ver}] = ${x}`; kk = null; rangeTxt = `v${idx} -> v${ver}`;
      emit();
      const copies: PN[] = [];
      let old = pool[roots[roots.length - 1]];
      for (;;) {
        const cp = mk(old.lo, old.hi, old.l, old.r, old.val + 1, ver);
        if (copies.length) { const par = copies[copies.length - 1]; if (par.l === old.id) par.l = cp.id; else par.r = cp.id; } else roots.push(cp.id);
        copies.push(cp);
        st = {}; copies.forEach((c) => { st[c.id] = 'active'; }); st[old.id] = 'compare';
        emit();
        if (old.lo === old.hi) break;
        const mid = (old.lo + old.hi) >> 1;
        old = pool[rank <= mid ? old.l! : old.r!];
      }
      st = {};
      const fresh = new Set(copies.map((c) => c.id));
      copies.forEach((c) => { st[c.id] = 'active'; for (const ch of [c.l, c.r]) if (ch !== null && !fresh.has(ch)) st[ch] = 'found'; });
      emit();
    });
    for (const q of qs) {
      let A = pool[roots[q.r]], B = pool[roots[q.l - 1]];
      let k = q.k;
      op = `kth(${q.l}, ${q.r}, ${q.k})`; rangeTxt = `v${q.r} - v${q.l - 1}`; kk = k;
      st = { [A.id]: 'active', [B.id]: 'compare' };
      ptrs = [{ label: `R:v${q.r}`, node: A.id }, { label: `L:v${q.l - 1}`, node: B.id }];
      emit();
      while (A.lo < A.hi) {
        const inLeft = pool[A.l!].val - pool[B.l!].val;
        if (k <= inLeft) { A = pool[A.l!]; B = pool[B.l!]; } else { k -= inLeft; A = pool[A.r!]; B = pool[B.r!]; }
        kk = k; st = { [A.id]: 'active', [B.id]: 'compare' };
        ptrs = [{ label: `R:v${q.r}`, node: A.id }, { label: `L:v${q.l - 1}`, node: B.id }];
        emit();
      }
      answers.push(vals[A.lo]);
      st = { [A.id]: 'found', [B.id]: 'compare' };
      emit();
    }
    st = {}; ptrs = []; op = 'done'; rangeTxt = null; kk = null;
    emit();
    return out;
  };
  cases.push({
    slug: 'cp-kth-smallest-in-a-range-persistent-segment-tree', gen, oracle,
    project: (s) => ({
      ...dagShown(s), versions: auxItems(s, 'versions (elements inserted so far)'), hl: (s.aux ?? []).find((x) => x.title.startsWith('versions'))?.highlight ?? null, answers: auxItems(s, 'answers'),
      op: shown(s, 'op') as string, range: shown(s, 'range') as string, k: num(s, 'k'), ans: varList(s, 'answers').map(String),
    }),
    invariants: [(s, _i, _st, { a, qs }) => {
      const ans = auxItems(s, 'answers');
      for (let q = 0; q < ans.length; q++) { const sub = a.slice(qs[q].l - 1, qs[q].r).sort((x, y) => x - y); if (Number(ans[q]) !== sub[qs[q].k - 1]) return `answer #${q + 1} is ${ans[q]} but the ${qs[q].k}-th smallest of the range is ${sub[qs[q].k - 1]}`; }
      return null;
    }],
    notes: 'same canonical node-graph comparison as the version-array case; the counts per node, the value ranges, the R/L walk pointers, k after every descent and the answers are all compared; the answers are also checked against a sort of the range',
  });
}

/* ------------------------------------------------------------------ 2080 Range Frequency Queries (blocks + per-block count tables) */
{
  type In = { a: number[]; qs: { l: number; r: number; v: number }[] };
  const gen = (r: () => number): In => {
    const n = rint(r, 3, 12);
    const a = rarr(r, n, 0, r() < 0.5 ? 2 : 9);
    const qs: In['qs'] = [];
    for (let i = 0; i < rint(r, 1, 5); i++) { const l = rint(r, 0, n - 1); qs.push({ l, r: rint(r, l, n - 1), v: rint(r, 0, 3) }); }
    return { a, qs };
  };
  const oracle = ({ a, qs }: In): State[] => {
    const n = a.length, B = Math.max(1, Math.ceil(Math.sqrt(n))), nb = Math.ceil(n / B);
    const size = (b: number) => Math.min(n, (b + 1) * B) - b * B;
    const cnt: Map<number, number>[] = Array.from({ length: nb }, () => new Map());
    a.forEach((x, i) => { const m = cnt[Math.floor(i / B)]; m.set(x, (m.get(x) ?? 0) + 1); });
    const table = cnt.map((m, b) => `b${b} → ${[...m.entries()].sort((x, y) => x[0] - y[0]).map(([k, v]) => `${k}×${v}`).join(' ')}`);
    const answers: string[] = [];
    let st = new Map<number, string>(), hot = -1;
    let op: string | null = null, range: string | null = null, c: number | null = null;
    const out: State[] = [];
    const emit = (): void => { out.push({ cells: a.slice(), sts: a.map((_, i) => st.get(i) ?? ''), table: [...table], hot: hot >= 0 ? hot : null, answers: [...answers], op, range, c }); };
    emit();
    for (const { l, r, v } of qs) {
      st = new Map(); hot = -1;
      const bl = Math.floor(l / B), br = Math.floor(r / B);
      let total = 0;
      op = `query(${l}, ${r}, ${v})`; range = `${l}..${r}`; c = 0; emit();
      const scan = (i: number): void => { const hit = a[i] === v; if (hit) total++; c = total; st.set(i, hit ? 'found' : 'dim'); emit(); };
      if (bl === br) for (let i = l; i <= r; i++) scan(i);
      else {
        for (let i = l; i < (bl + 1) * B; i++) scan(i);
        for (let b = bl + 1; b < br; b++) {
          total += cnt[b].get(v) ?? 0; c = total; hot = b;
          for (let i = b * B; i < b * B + size(b); i++) st.set(i, 'swap');
          emit(); hot = -1;
        }
        for (let i = br * B; i <= r; i++) scan(i);
      }
      answers.push(String(total)); emit();
    }
    st = new Map(); hot = -1; op = 'done'; range = null; c = null; emit();
    return out;
  };
  cases.push({
    slug: '2080-range-frequency-queries', gen, oracle,
    project: (s) => {
      const g = gridOf(s);
      const cells: (string | number)[] = [], sts: string[] = [];
      (g?.rows ?? []).forEach((row) => row.forEach((x) => { if (typeof x.key === 'number') { cells.push(x.value); sts.push(x.state ?? ''); } }));
      const t = (s.aux ?? []).find((x) => x.title.startsWith('count table'));
      return { cells, sts, table: t?.items ?? [], hot: t?.highlight ?? null, answers: auxItems(s, 'answers so far'), op: shown(s, 'query') as string, range: shown(s, 'range') as string, c: num(s, 'count') };
    },
    invariants: [(s, _i, _st, { a, qs }) => {
      const ans = auxItems(s, 'answers so far');
      for (let k = 0; k < ans.length; k++) { const q = qs[k]; const t = a.slice(q.l, q.r + 1).filter((x) => x === q.v).length; if (Number(ans[k]) !== t) return `answer #${k + 1} is ${ans[k]} but a[${q.l}..${q.r}] holds ${t} copies of ${q.v}`; }
      return null;
    }],
    notes: 'compared: every array cell value/colour, the per-block count table (static) and its highlighted block, op/range/count/answers; block size B = ceil(sqrt n) is taken from the textbook',
  });
}

/* ------------------------------------------------------------------ 1146 Snapshot Array */
{
  type Op = { k: 'set'; i: number; v: number } | { k: 'snap' } | { k: 'get'; i: number; s: number };
  type In = { n: number; ops: Op[] };
  const gen = (r: () => number): In => {
    const n = rint(r, 1, 5);
    const ops: Op[] = [];
    let snaps = 0;
    for (let t = 0; t < rint(r, 1, 10); t++) {
      const k = r();
      if (k < 0.4) ops.push({ k: 'set', i: rint(r, 0, n - 1), v: rint(r, 0, 99) });
      else if (k < 0.6 && snaps < 4) { snaps++; ops.push({ k: 'snap' }); }
      else if (snaps > 0) ops.push({ k: 'get', i: rint(r, 0, n - 1), s: rint(r, 0, snaps - 1) });
      else ops.push({ k: 'set', i: rint(r, 0, n - 1), v: rint(r, 0, 99) });
    }
    return { n, ops };
  };
  const oracle = ({ n, ops }: In): State[] => {
    const cols = ops.filter((o) => o.k === 'snap').length + 1;
    const hist: { snap: number; val: number }[][] = Array.from({ length: n }, () => [{ snap: 0, val: 0 }]);
    let snapId = 0;
    const outs: string[] = [];
    let st = new Map<string, string>();
    let op: string | null = null, result: string | number | null = null;
    const out: State[] = [];
    const emit = (): void => {
      const cells: (string | number)[] = [], sts: string[] = [];
      hist.forEach((h, i) => { for (let c = 0; c < cols; c++) { const e = h.find((x) => x.snap === c); const s = st.get(`${i},${c}`); if (!e) { cells.push('·'); sts.push(s ?? 'dim'); } else { cells.push(e.val); sts.push(s ?? (c === snapId ? 'swap' : '')); } } });
      out.push({
        cells, sts, heads: Array.from({ length: cols }, (_, c) => (c === snapId ? `snap ${c} ◂ now` : `snap ${c}`)),
        stored: hist.map((h, i) => `a[${i}] → ${h.map((e) => `(${e.snap},${e.val})`).join(' ')}`), outs: [...outs], op, snapId, result,
      });
    };
    emit();
    for (const o of ops) {
      st = new Map();
      if (o.k === 'set') {
        const h = hist[o.i], last = h[h.length - 1];
        op = `set(${o.i}, ${o.v})`; result = 'null';
        if (last.snap === snapId) last.val = o.v; else h.push({ snap: snapId, val: o.v });
        st.set(`${o.i},${snapId}`, 'active'); outs.push('null'); emit();
      } else if (o.k === 'snap') {
        op = 'snap()'; result = snapId; outs.push(String(snapId)); snapId++; emit();
      } else {
        const h = hist[o.i];
        op = `get(${o.i}, ${o.s})`; result = '?';
        let lo = 0, hi = h.length - 1;
        const paint = (mid: number | null, final = false): void => {
          st = new Map();
          h.forEach((e, k) => { const key = `${o.i},${e.snap}`; if (final && k === lo) st.set(key, 'found'); else if (k === mid) st.set(key, 'compare'); else if (k < lo || k > hi) st.set(key, 'dim'); });
        };
        paint(null); emit();
        while (lo < hi) {
          const mid = Math.floor((lo + hi + 1) / 2);
          paint(mid); emit();
          if (h[mid].snap <= o.s) lo = mid; else hi = mid - 1;
        }
        result = h[lo].val; outs.push(String(result)); paint(null, true); emit();
      }
    }
    st = new Map(); op = 'done'; emit();
    return out;
  };
  cases.push({
    slug: '1146-snapshot-array', gen, oracle,
    project: (s) => {
      const g = gridOf(s);
      const cells: (string | number)[] = [], sts: string[] = [];
      (g?.rows ?? []).forEach((row) => row.forEach((c) => { cells.push(c.value); sts.push(c.state ?? ''); }));
      return {
        cells, sts, heads: g?.colHeads ?? [], stored: auxItems(s, 'stored (snapId, value) per index'), outs: auxItems(s, 'outputs so far'),
        op: shown(s, 'op') as string, snapId: num(s, 'snapId'), result: shown(s, 'result') as string | number | null,
      };
    },
    invariants: [(s, _i, _st, { n, ops }) => {
      // every get answer already in the output list must equal the value at that snapshot, recomputed by brute force with full array copies
      const outs = auxItems(s, 'outputs so far');
      const copies: number[][] = [];
      const cur = new Array(n).fill(0);
      const expect: string[] = [];
      for (const o of ops) {
        if (o.k === 'set') { cur[o.i] = o.v; expect.push('null'); }
        else if (o.k === 'snap') { expect.push(String(copies.length)); copies.push([...cur]); }
        else expect.push(String(copies[o.s][o.i]));
      }
      for (let k = 0; k < outs.length; k++) if (outs[k] !== expect[k]) return `output #${k + 1} is ${outs[k]} but a full-copy simulation gives ${expect[k]}`;
      return null;
    }],
    notes: 'compared: every grid cell value/colour (incl. the "no entry" dots), snapshot column headings, stored (snapId,value) lists, outputs, op/snapId/result; outputs are also checked against a brute-force simulation that copies the whole array at every snap',
  });
}

/* ------------------------------------------------------------------ range add / range sum with lazy propagation */
{
  const gen = (r: () => number): SegIn => {
    const n = rint(r, 2, 8);
    const nums = rarr(r, n, -30, 30);
    const ops: SegIn['ops'] = [];
    for (let i = 0; i < rint(r, 1, 4); i++) {
      const l = rint(r, 0, n - 1), rr = rint(r, l, n - 1);
      if (r() < 0.5) ops.push({ name: 'sum', args: [l, rr] });
      else { let v = rint(r, -20, 20); if (v === 0) v = 1; ops.push({ name: 'add', args: [l, rr, v] }); }
    }
    return { nums, ops };
  };
  const oracle = ({ nums, ops }: SegIn): State[] => {
    const real = [...nums], n = real.length;
    const ids: number[] = [];
    const walkIds = (id: number, l: number, r: number): void => { ids.push(id); if (l < r) { const m = (l + r) >> 1; walkIds(2 * id, l, m); walkIds(2 * id + 1, m + 1, r); } };
    walkIds(1, 0, n - 1);
    const sum: number[] = new Array(4 * n + 4).fill(0), lazy: number[] = new Array(4 * n + 4).fill(0);
    const built = new Set<number>();
    let st: Record<number, string> = {};
    let cst: (k: number) => string = () => '';
    let ptrs: string[] = [];
    let opText = 'build', nodeText = '—';
    let running: number | null = null;
    const answers: string[] = [];
    const out: State[] = [];
    const tagOf = (id: number): string => (lazy[id] !== 0 ? `lazy ${lazy[id] > 0 ? '+' : ''}${lazy[id]}` : '');
    const emit = (here: number | null): void => {
      out.push({
        tree: sortStr(ids.map((id) => `${id}:${built.has(id) ? sum[id] : '·'}`)),
        tags: sortStr(ids.filter((id) => built.has(id) && tagOf(id)).map((id) => `${id}:${tagOf(id)}`)),
        st: sortStr(ids.filter((id) => (!built.has(id) ? 'dim' : st[id])).map((id) => `${id}:${!built.has(id) ? 'dim' : st[id]}`)),
        here, node: here !== null ? nodeText : null, arr: [...real], cst: real.map((_, k) => cst(k)), ptrs: [...ptrs].sort(),
        op: opText, running, answers: [...answers], real: real.map(String),
      });
    };
    emit(null);
    const build = (id: number, l: number, r: number): void => {
      nodeText = rt(l, r);
      if (l === r) { sum[id] = real[l]; built.add(id); st = { [id]: 'found' }; emit(id); return; }
      const m = (l + r) >> 1;
      build(2 * id, l, m); build(2 * id + 1, m + 1, r);
      nodeText = rt(l, r);
      sum[id] = sum[2 * id] + sum[2 * id + 1]; built.add(id);
      st = { [id]: 'active', [2 * id]: 'compare', [2 * id + 1]: 'compare' };
      emit(id);
    };
    build(1, 0, n - 1);
    const apply = (id: number, l: number, r: number, v: number): void => { sum[id] += v * (r - l + 1); lazy[id] += v; };
    const push = (id: number, l: number, r: number): void => {
      const m = (l + r) >> 1;
      if (lazy[id] === 0) { st[id] = 'compare'; emit(id); return; }
      const v = lazy[id];
      apply(2 * id, l, m, v); apply(2 * id + 1, m + 1, r, v); lazy[id] = 0;
      st = { ...st, [id]: 'compare', [2 * id]: 'swap', [2 * id + 1]: 'swap' };
      emit(id);
    };
    const add = (id: number, l: number, r: number, ql: number, qr: number, v: number): void => {
      nodeText = rt(l, r);
      if (qr < l || r < ql) { st[id] = 'dim'; emit(id); return; }
      if (ql <= l && r <= qr) { apply(id, l, r, v); st[id] = 'found'; emit(id); return; }
      st[id] = 'active'; emit(id);
      push(id, l, r);
      const m = (l + r) >> 1;
      add(2 * id, l, m, ql, qr, v); add(2 * id + 1, m + 1, r, ql, qr, v);
      nodeText = rt(l, r);
      sum[id] = sum[2 * id] + sum[2 * id + 1]; st[id] = 'found'; emit(id);
    };
    const query = (id: number, l: number, r: number, ql: number, qr: number): number => {
      nodeText = rt(l, r);
      if (qr < l || r < ql) { st[id] = 'dim'; emit(id); return 0; }
      if (ql <= l && r <= qr) { st[id] = 'found'; running = (running === null ? 0 : running) + sum[id]; emit(id); return sum[id]; }
      st[id] = 'active'; emit(id);
      push(id, l, r);
      const m = (l + r) >> 1;
      return query(2 * id, l, m, ql, qr) + query(2 * id + 1, m + 1, r, ql, qr);
    };
    for (const o of ops) {
      st = {}; cst = () => ''; nodeText = rt(0, n - 1); running = null;
      if (o.name === 'sum') {
        const [ql, qr] = o.args;
        opText = `sum(${ql}, ${qr})`;
        cst = (k) => (k >= ql && k <= qr ? 'active' : '');
        ptrs = ql === qr ? [`l@${ql}`] : [`l@${ql}`, `r@${qr}`];
        emit(null);
        const res = query(1, 0, n - 1, ql, qr);
        running = res; answers.push(String(res)); emit(null);
      } else {
        const [ql, qr, v] = o.args;
        opText = `add(${ql}, ${qr}, ${v})`;
        for (let k = ql; k <= qr; k++) real[k] += v;
        cst = (k) => (k >= ql && k <= qr ? 'swap' : '');
        ptrs = ql === qr ? [`l@${ql}`] : [`l@${ql}`, `r@${qr}`];
        emit(null);
        add(1, 0, n - 1, ql, qr, v);
        answers.push('null'); emit(null);
      }
    }
    st = {}; cst = () => ''; ptrs = [];
    emit(null);
    return out;
  };
  cases.push({
    slug: 'cp-range-add-range-sum-lazy-propagation', gen, oracle,
    project: (s) => {
      const nt = sceneOfKind(s, 'ntree');
      return {
        ...segShown(s, true), tags: sortStr((nt?.nodes ?? []).filter((n) => n.tag).map((n) => `${n.id}:${n.tag}`)),
        op: shown(s, 'op') as string, running: num(s, 'running'), answers: varList(s, 'answers'), real: auxItems(s, 'actual array values (what the tree must reproduce)'),
      };
    },
    invariants: [(s) => {
      // every node's sum, corrected by the lazy tags of its strict ancestors, must equal the true sum of its range (checked on nodes whose ancestors' tags are all shown)
      const nt = sceneOfKind(s, 'ntree');
      const real = auxItems(s, 'actual array values (what the tree must reproduce)').map(Number);
      if (!nt || nt.nodes.some((n) => n.label === '·')) return null;
      const parent = new Map<number, number>();
      for (const n of nt.nodes) for (const c of n.children) parent.set(c, n.id);
      const range = new Map<number, [number, number]>();
      for (const n of nt.nodes) { const m = /\[(\d+)(?:,(\d+))?\]/.exec(n.sub ?? ''); if (m) range.set(n.id, [Number(m[1]), Number(m[2] ?? m[1])]); }
      const lz = (id: number): number => { const t = nt.nodes.find((x) => x.id === id)?.tag; return t ? Number(t.replace('lazy ', '')) : 0; };
      // mid-update the array row already holds the new values while stale nodes are still being repaired, so only the Answer step of a query is checked
      if (!/^Answer/.test(s.title)) return null;
      for (const n of nt.nodes) {
        const [l, r] = range.get(n.id)!;
        let owed = 0;
        for (let p = parent.get(n.id); p !== undefined; p = parent.get(p)) owed += lz(p);
        const truth = real.slice(l, r + 1).reduce((x, y) => x + y, 0);
        if (Number(n.label) + owed * (r - l + 1) !== truth) return `node ${n.id} ${n.sub}: stored ${n.label} + owed ${owed} x len != true sum ${truth}`;
      }
      return null;
    }],
    notes: 'compared: node sums, lazy tags, node colours (incl. push markers), here pointer, true-array row, pointers, running sum, answers; a node\'s sum + the lazy tags owed by its ancestors is also checked against the true array at every Answer step',
  });
}
