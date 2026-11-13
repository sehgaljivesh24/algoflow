import type { ProblemDef } from '../../engine/types.ts';
import { fmtOps, parseOps } from './kitB.ts';
import type { ParsedOps } from './kitB.ts';
import { segCode, segPhases, segReference, segSteps } from './segEngine.ts';

export function parseSegOps(raw: string, q: 'sum' | 'min'): ParsedOps {
  const u = q === 'sum' ? 'update' : 'set';
  return parseOps(raw, {
    spec: { [q]: 2, [u]: 2 },
    example: q === 'sum' ? '1 3 5 7 9 11 | sum 1 4 | update 2 10 | sum 1 4' : '5 2 8 6 3 7 | min 1 4 | set 2 1 | min 0 3',
    maxN: 9, maxOps: 5, lo: -50, hi: 50,
    check: (name, args, n) => {
      if (name === q) return args[0] < 0 || args[1] >= n || args[0] > args[1] ? `need 0 <= left <= right <= ${n - 1}` : null;
      return args[0] < 0 || args[0] >= n ? `the index must be between 0 and ${n - 1}` : null;
    },
  });
}

const P = (s: string): ParsedOps => parseSegOps(s, 'sum');
const code = segCode('sum');

export const rangeSumQueryMutable: ProblemDef<ParsedOps> = {
  slug: '307-range-sum-query-mutable',
  id: '307', title: 'Range Sum Query - Mutable', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'segment tree',
  statement: 'Design a structure over an integer array that supports update(index, val), which overwrites one element, and sumRange(left, right), which returns the sum of nums[left..right] inclusive. Both operations are called many times, so each must be much faster than a plain loop.',
  constraints: 'Animation input: 2 to 9 numbers in [-50, 50] and at most 5 operations, written as "numbers | sum l r | update i v | ...".',
  examples: [
    { label: '1 3 5 7 9 11 | sum 1 4 | update 2 10 | sum 1 4', input: P('1 3 5 7 9 11 | sum 1 4 | update 2 10 | sum 1 4'), output: '[24, null, 29]' },
    { label: '2 4 6 8 | sum 0 3 | update 3 1 | sum 2 3', input: P('2 4 6 8 | sum 0 3 | update 3 1 | sum 2 3'), output: '[20, null, 7]' },
    { label: '5 -2 4 1 7 3 2 | sum 2 5 | update 4 0 | sum 0 6 | sum 5 5', input: P('5 -2 4 1 7 3 2 | sum 2 5 | update 4 0 | sum 0 6 | sum 5 5'), output: '[15, null, 13, 3]' },
  ],
  inputPlaceholder: 'e.g. 1 3 5 7 9 11 | sum 1 4 | update 2 10 | sum 1 4',
  parseInput: (raw) => parseSegOps(raw, 'sum'),
  buildSteps: (i) => segSteps(i, 'sum'),
  viz: 'cells',
  vizTitle: 'Segment tree (value over range)',
  legend: [{ label: 'Node in use / current', state: 'active' }, { label: 'Piece taken / updated', state: 'found' }, { label: 'Partial overlap', state: 'compare' }, { label: 'Not built / pruned', state: 'dim' }],
  varLabels: ['op', 'node', 'running', 'answers'],
  approach: {
    title: 'A binary tree of range sums',
    text: 'Store the sum of a range in every node: the root covers the whole array, each node splits its range in half, the leaves are single items. An update rewrites one leaf and repairs its ancestors. A query walks down, takes every node fully inside the range as a ready-made piece, skips disjoint nodes and splits partial ones.',
  },
  java: code.java,
  python: code.python,
  algorithm: [
    'Build: leaves hold array items, each inner node holds the sum of its two children',
    'Update: walk to the leaf of the index and overwrite it',
    'Update: on the way back recompute every ancestor from its two children',
    'Query: skip disjoint nodes, take fully covered nodes whole, split partial ones',
    'Return the answers of all operations in order',
  ],
  phases: segPhases,
  emphasis: ['update(index, val)', 'sumRange(left, right)', 'sum', 'many times'],
  complexity: [{ label: 'Time', value: 'O(n) build, O(log n) per op' }, { label: 'Space', value: 'O(n)' }],
  why: 'Every node always equals the sum of its range, because the only way an element changes is through an update, and that update recomputes exactly the nodes whose range contains the index. A query range splits into at most two partially-overlapping nodes per level, and everything else is either disjoint or fully covered, so only O(log n) nodes are visited and the covered ones tile the range exactly once.',
  naive: 'Summing nums[left..right] with a loop makes each query O(n); a prefix-sum array makes queries O(1) but every update costs O(n) to rebuild. With many mixed updates and queries both break down.',
};

export { fmtOps, segReference };
