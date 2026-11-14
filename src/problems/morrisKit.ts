/**
 * Shared engine for the three Morris-traversal animations (inorder, preorder, recover BST).
 * The tree itself is never mutated visually: a temporary thread (predecessor.right -> cur) is drawn as a dashed arrow
 * through the scene's `extraEdges`, exactly where the real algorithm would temporarily overwrite a null right pointer.
 */
import type { Aux, CellState, Step } from '../engine/types.ts';
import { buildTree, emitter, listAux } from './treeKit.ts';
import type { Token } from './treeKit.ts';
import { annotateRules } from './annotate.ts';
import type { TitleRule } from './annotate.ts';

export type MorrisMode = 'inorder' | 'preorder' | 'recover';

/** 0-based code lines to highlight for each phase of the loop (one set per language). */
export interface MorrisLines {
  start: number[];
  /** left child is null: visit (inorder/recover) or record (preorder) and go right */
  leaf: number[];
  /** pred = cur.left */
  find: number[];
  /** while (pred.right != null && pred.right != cur) pred = pred.right */
  hop: number[];
  /** pred.right == null: create the thread, go left (preorder also records cur here) */
  link: number[];
  /** pred.right == cur: cut the thread, visit (inorder/recover), go right */
  cut: number[];
  /** the swap of the two bad values (recover) / the final return */
  fix: number[];
  ret: number[];
}

export interface MorrisRun {
  tokens: Token[];
  mode: MorrisMode;
  J: MorrisLines;
  P: MorrisLines;
  /** name of the produced sequence, e.g. "In-order traversal" */
  orderName: string;
}

export function runMorris({ tokens, mode, J, P, orderName }: MorrisRun): Step[] {
  const nodes = buildTree(tokens);
  const done: Record<number, CellState> = {}; // persistent: visited ('found') or suspicious ('error')
  const labels: Record<number, string> = {};
  const threads = new Map<number, number>(); // predecessor id -> the node it points back to
  const val = (id: number) => Number(nodes[id].value);
  const out: number[] = [];
  let cur: number | null = 0;
  let pred: number | null = null;
  let prev: number | null = null;
  let first: number | null = null;
  let second: number | null = null;

  const scene = () => {
    const states: Record<number, CellState> = { ...done };
    if (pred !== null) states[pred] = 'compare';
    if (cur !== null && states[cur] !== 'error') states[cur] = 'active';
    return {
      kind: 'tree' as const, nodes: nodes.map((n) => ({ ...n })), root: 0, states, labels: { ...labels },
      extraEdges: [...threads].map(([from, to]) => ({ from, to })),
    };
  };
  const { steps, add } = emitter(scene);
  const nm = (id: number | null) => (id === null ? 'null' : String(val(id)));
  const aux = (): Aux[] => {
    const a: Aux[] = [listAux(`${orderName} so far`, out, out.length - 1), listAux('threads (pred → cur)', [...threads].map(([f, t]) => `${val(f)} → ${val(t)}`))];
    if (mode === 'recover') a.push(listAux('prev / first / second', [`prev ${nm(prev)}`, `first ${nm(first)}`, `second ${nm(second)}`]));
    return a;
  };
  const vars = () => ({ cur: nm(cur), pred: nm(pred), threads: threads.size, visited: out.length, ...(mode === 'recover' ? { prev: nm(prev), first: nm(first), second: nm(second) } : {}) });
  const frame = (title: string, desc: string, logic: string, j: number[], p: number[], a: number, tone: 'info' | 'warn' | 'success' = 'info') => {
    if (steps.length > 400) throw new Error('Morris animation exceeded 400 steps (runaway loop guard)');
    add({ title, desc, logic, tone, j, p, a, vars: vars(), aux: aux() });
  };

  /** Effective right pointer: the real right child, or the temporary thread if one was written there. */
  const er = (id: number): number | null => threads.get(id) ?? nodes[id].right;
  const record = (id: number) => {
    out.push(val(id));
    labels[id] = `#${out.length}`;
    done[id] = 'found';
  };
  /** In-order visit; for recover also compares with the previous in-order node. Returns a sentence about the check. */
  const visit = (id: number): string => {
    record(id);
    if (mode !== 'recover') return '';
    let note = '';
    if (prev !== null && val(prev) > val(id)) {
      const wasFirst = first === null;
      if (first === null) first = prev;
      if (second !== null && second !== id) done[second] = 'found'; // an earlier candidate was only the middle of a longer jump
      second = id;
      done[first] = 'error';
      done[second] = 'error';
      note = ` ${val(prev)} > ${val(id)} breaks the increasing order: ${wasFirst ? `first = ${val(prev)}, second = ${val(id)}` : `second moves to ${val(id)}`}.`;
    } else if (prev !== null) note = ` ${val(prev)} < ${val(id)}, so the order is fine here.`;
    prev = id;
    return note;
  };

  const startDesc = {
    inorder: 'Morris traversal visits every node in-order with no stack and no recursion. Instead of remembering ancestors, it leaves a temporary thread from the in-order predecessor back up to the node.',
    preorder: 'Morris preorder uses the same threading trick, but a node is recorded the first time we reach it (when its thread is created), before its left subtree.',
    recover: 'Two values of a BST were swapped. An in-order walk of a BST must be increasing, so a Morris in-order walk can spot the two out-of-place values using O(1) extra space.',
  }[mode];
  frame('Start', startDesc, 'The predecessor of a node, taken inside its left subtree, is the rightmost node there. Its right pointer is null, so it can hold a thread back to the node.', J.start, P.start, 0);

  while (cur !== null) {
    const c: number = cur;
    pred = null;
    const left = nodes[c].left;
    if (left === null) {
      const viaThread = threads.get(c);
      const note = mode === 'preorder' ? (record(c), '') : visit(c);
      const next: number | null = viaThread ?? nodes[c].right;
      frame(
        `${nm(c)} has no left child`,
        `Nothing to explore on the left, so ${mode === 'preorder' ? 'record' : 'visit'} ${val(c)}.${note} Then move to ${next === null ? 'the right child: null, so the traversal ends' : viaThread !== undefined ? `${val(next)} by following the thread back up (no stack needed)` : `its right child ${val(next)}`}.`,
        'With no left subtree the node is next in line, so it is handled immediately.',
        J.leaf, P.leaf, 1, 'success',
      );
      cur = next;
      continue;
    }
    pred = left;
    frame(
      `At ${nm(c)}: find its predecessor`,
      `${val(c)} has a left subtree. Start at pred = ${val(left)} and keep going right to reach the rightmost node of that subtree.`,
      'That rightmost node is the one visited just before cur in in-order, so it is where the thread belongs.',
      J.find, P.find, 2,
    );
    while (er(pred) !== null && er(pred) !== c) {
      pred = er(pred)!;
      frame(
        `pred moves right to ${val(pred)}`,
        `pred.right is not null and does not point at ${val(c)}, so keep walking right.`,
        'We stop at a null right pointer (first visit) or at one that already points back at cur (second visit).',
        J.hop, P.hop, 2,
      );
    }
    if (er(pred) === null) {
      threads.set(pred, c);
      let note = '';
      if (mode === 'preorder') { record(c); note = ` ${val(c)} is recorded now, before its left subtree.`; }
      frame(
        `Thread ${val(pred)} → ${val(c)}`,
        `pred.right is null, so point it at ${val(c)} (dashed arrow) and descend into the left subtree.${note}`,
        'The thread replaces a stack frame: when the left subtree is finished, following it brings us straight back.',
        J.link, P.link, 3, 'warn',
      );
      cur = left;
    } else {
      threads.delete(pred);
      const note = mode === 'preorder' ? '' : visit(c);
      frame(
        `Thread found at ${val(pred)}: cut it`,
        `pred.right already points at ${val(c)}, so the whole left subtree is done. Remove the thread${mode === 'preorder' ? '' : ` and visit ${val(c)}`}.${note} Then go right.`,
        'Cutting the thread restores the tree exactly as it was. Morris leaves no trace.',
        J.cut, P.cut, 3, 'success',
      );
      cur = er(c);
    }
    pred = null;
  }

  let text: string;
  if (mode === 'recover') {
    const a = first!, b = second!;
    const va = val(a), vb = val(b);
    nodes[a].value = vb;
    nodes[b].value = va;
    delete done[a]; delete done[b];
    done[a] = 'swap'; done[b] = 'swap';
    text = `[${out.map((v) => (v === va ? vb : v === vb ? va : v)).join(',')}]`;
    frame(
      `Swap ${va} and ${vb} back`,
      `The walk produced ${out.join(', ')}. The first descent began at ${va} and the last one ended at ${vb}, so those two nodes exchange values.`,
      'After the swap the in-order sequence is strictly increasing again, which is exactly the BST property.',
      J.fix, P.fix, 3, 'success',
    );
  } else text = `[${out.join(',')}]`;
  add({
    title: 'Done', desc: mode === 'recover' ? `The BST is repaired. Its in-order values are now ${text}.` : `cur is null: every node was visited. ${orderName}: ${text}.`,
    logic: 'Each edge is walked at most twice (once to find a predecessor, once more to confirm it), so the total work is O(n).', tone: 'success',
    j: J.ret, p: P.ret, a: 3, vars: vars(), aux: aux(),
    result: { title: text, text: mode === 'recover' ? 'In-order values after recovery' : orderName },
  });
  return annotateRules(steps, morrisRules(mode));
}

/**
 * Pattern-page extras shared by the three Morris animations: narration prefix, values on the code line and the phase chip.
 * Chips (inorder / preorder): 0 init, 1 no left child, 2 find predecessor, 3 thread or cut, 4 done.
 * Chips (recover): 0 Morris walk, 1 compare prev with cur, 2 mark first / second, 3 swap, 4 done.
 */
function morrisRules(mode: MorrisMode): TitleRule[] {
  const rec = mode === 'recover';
  const visitWord = mode === 'preorder' ? 'record' : 'visit';
  return [
    { on: 'first', tag: 'INIT —', note: (_m, s) => `cur = root (${s.vars.cur}), ${rec ? 'prev = first = second = null' : 'res = []'}` },
    {
      on: /^(\S+) has no left child$/,
      tag: 'NO LEFT —',
      note: (m) => `cur.left == null → ${visitWord} ${m[1]}; cur = cur.right`,
      algoStep: (_m, s) => (rec ? (s.desc.includes('breaks the increasing order') ? 2 : 1) : 1),
    },
    { on: /^At (\S+): find its predecessor/, tag: 'FIND PRED —', note: (_m, s) => `pred = cur.left → ${s.vars.pred}`, algoStep: rec ? 0 : 2 },
    { on: /^pred moves right to (\S+)/, tag: 'PRED → —', note: (m) => `pred = pred.right → ${m[1]}`, algoStep: rec ? 0 : 2 },
    {
      on: /^Thread (\S+) → (\S+)/,
      tag: '🧵 THREAD —',
      note: (m) => `pred.right = cur (${m[1]} → ${m[2]})${mode === 'preorder' ? '; record cur' : ''}; cur = cur.left`,
      algoStep: rec ? 0 : 3,
    },
    {
      on: /^Thread found at (\S+): cut it/,
      tag: '✂️ CUT —',
      note: (m) => `pred.right = null (cut ${m[1]}'s thread)${mode === 'preorder' ? '' : '; visit cur'}; cur = cur.right`,
      algoStep: (_m, s) => (rec ? (s.desc.includes('breaks the increasing order') ? 2 : 1) : 3),
    },
    { on: /^Swap (\S+) and (\S+) back/, tag: '🔁 SWAP —', note: (m) => `swap values ${m[1]} ↔ ${m[2]}`, algoStep: 3 },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `return ${s.result?.title}`, algoStep: 4 },
  ];
}
