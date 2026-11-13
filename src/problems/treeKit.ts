/**
 * Shared helpers for the binary-tree problems (owned by the "trees" group).
 * Every tree problem takes the same level-order input as #104 ("3 9 20 null null 15 7").
 */
import type { Aux, CellState, LogicTone, Scene, Step, TreeNodeVM } from '../engine/types.ts';
import { buildTree } from './maxDepth.ts';

export { buildTree };

export type Token = number | null;
export interface TreeIn { tokens: Token[] }
export const TREE_HINT = 'Level-order numbers with "null" for gaps, e.g. 3 9 20 null null 15 7';
export const MAX_NODES = 12;

/** Parse "3 9 20 null null 15 7" (commas or spaces; "null" or "#" for a gap). */
export function parseTokens(raw: string): Token[] {
  const tokens = raw
    .split(/[\s,\[\]]+/)
    .filter(Boolean)
    .map((t) => (t.toLowerCase() === 'null' || t === '#' ? null : Number(t)));
  if (!tokens.length || tokens[0] === null || tokens.some((t) => t !== null && !Number.isInteger(t))) throw new Error(TREE_HINT);
  if (tokens.length > 40) throw new Error('That tree is too long to animate — use 12 nodes or fewer');
  if (buildTree(tokens).length > MAX_NODES) throw new Error('Use 12 nodes or fewer');
  return tokens;
}

export function parseTree(raw: string): TreeIn {
  return { tokens: parseTokens(raw) };
}

/** Whole numbers separated by spaces/commas. */
export function parseInts(raw: string, what: string): number[] {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (!nums.length || nums.some((n) => !Number.isInteger(n))) throw new Error(`${what} must be whole numbers separated by spaces`);
  return nums;
}

/** Split "<tree> ; <rest>" into exactly `parts` pieces. */
export function splitParts(raw: string, parts: number, format: string): string[] {
  const out = raw.split(';').map((s) => s.trim());
  if (out.length !== parts || out.some((s) => !s)) throw new Error(`Expected ${parts} parts separated by ";", e.g. ${format}`);
  return out;
}

export interface TreeAndNumber { tokens: Token[]; target: number }

/** "<tree> ; <number>" (target sum, k, ...). */
export function parseTreeAndNumber(raw: string, what: string, format: string): TreeAndNumber {
  const [t, n] = splitParts(raw, 2, format);
  const tokens = parseTokens(t);
  const nums = parseInts(n, what);
  if (nums.length !== 1 || Math.abs(nums[0]) > 9999) throw new Error(`After ";" give a single whole number for the ${what}`);
  return { tokens, target: nums[0] };
}

/** True if the inorder values are strictly increasing (a valid BST with distinct keys). */
export function isStrictBst(nodes: TreeNodeVM[]): boolean {
  const seq = inorderValues(nodes, 0);
  return seq.every((v, i) => i === 0 || v > seq[i - 1]);
}

export function inorderValues(nodes: TreeNodeVM[], root: number | null): number[] {
  const out: number[] = [];
  const go = (id: number | null) => {
    if (id === null) return;
    go(nodes[id].left);
    out.push(Number(nodes[id].value));
    go(nodes[id].right);
  };
  go(root);
  return out;
}

/** LeetCode-style level order with trailing nulls trimmed, e.g. "[1,2,3,null,4]". */
export function toLevelOrder(nodes: TreeNodeVM[], root: number | null): string {
  if (root === null || !nodes.length) return '[]';
  const out: (number | string | null)[] = [];
  const q: (number | null)[] = [root];
  for (let i = 0; i < q.length; i++) {
    const id = q[i];
    if (id === null) {
      out.push(null);
      continue;
    }
    out.push(nodes[id].value);
    q.push(nodes[id].left, nodes[id].right);
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return `[${out.map((v) => (v === null ? 'null' : v)).join(',')}]`;
}

export const fmtList = (xs: (number | string)[]) => `[${xs.join(',')}]`;
export const fmtLists = (xss: (number | string)[][]) => `[${xss.map(fmtList).join(',')}]`;

export function treeScene(
  nodes: TreeNodeVM[],
  states: Record<number, CellState>,
  labels: Record<number, string>,
  root: number | null = nodes.length ? 0 : null,
): Scene {
  return { kind: 'tree', nodes: nodes.map((n) => ({ ...n })), root, states: { ...states }, labels: { ...labels } };
}

export const stackAux = (title: string, items: (string | number)[]): Aux => ({ title, kind: 'stack', items: items.map(String) });
export const listAux = (title: string, items: (string | number)[], highlight?: number): Aux => ({ title, kind: 'list', items: items.map(String), highlight });
export const queueAux = (title: string, items: (string | number)[]): Aux => ({ title, kind: 'queue', items: items.map(String) });

export interface Frame {
  title: string;
  desc: string;
  logic: string;
  tone?: LogicTone;
  j: number[];
  p: number[];
  a: number;
  vars: Record<string, string | number>;
  aux?: Aux[];
  result?: { title: string; text: string };
  /** Pattern pages: narration prefix, code-line values, warning banner (see Step). */
  tag?: string;
  note?: string;
  alert?: string;
}

/** Collects steps; `scene` is read at the moment each step is added, so it is always a fresh snapshot. */
export function emitter(scene: () => Scene) {
  const steps: Step[] = [];
  const add = (f: Frame) => {
    steps.push({
      title: f.title, desc: f.desc, logic: f.logic, logicTone: f.tone ?? 'info',
      javaLines: f.j, pyLines: f.p, algoStep: f.a, vars: f.vars, scene: scene(), aux: f.aux, result: f.result,
      ...(f.tag ? { tag: f.tag } : {}),
      ...(f.note ? { note: f.note } : {}),
      ...(f.alert ? { alert: f.alert } : {}),
    });
  };
  return { steps, add };
}

export type Needle = string | [string, number];

/** Indexes of the first line (or the nth, 1-based) that contains each needle — keeps highlights in sync with the code. */
export function find(code: string[], ...needles: Needle[]): number[] {
  return needles.map((nd) => {
    const [text, nth] = typeof nd === 'string' ? [nd, 1] : nd;
    let seen = 0;
    for (let i = 0; i < code.length; i++) {
      if (code[i].includes(text) && ++seen === nth) return i;
    }
    throw new Error(`code line not found: ${text}`);
  });
}
