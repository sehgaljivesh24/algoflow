import type { ProblemDef } from '../../engine/types.ts';
import type { ParsedOps } from './kitB.ts';
import { segCode, segPhases, segSteps } from './segEngine.ts';
import { parseSegOps } from './rangeSumQueryMutable.ts';

const P = (s: string): ParsedOps => parseSegOps(s, 'min');
const code = segCode('min');

export const rangeMinimumQuerySegTree: ProblemDef<ParsedOps> = {
  slug: 'cp-range-minimum-query-segment-tree',
  id: 'CP', title: 'Range Minimum Query (Segment Tree)', difficulty: 'Medium', category: 'Advanced Data Structures', tag: 'segment tree (min)',
  statement: 'Given an array, answer many minRange(left, right) questions (the smallest value in nums[left..right]) while set(index, val) keeps changing single elements. Use a segment tree whose nodes store the minimum of their range.',
  constraints: 'Animation input: 2 to 9 numbers in [-50, 50] and at most 5 operations, written as "numbers | min l r | set i v | ...".',
  examples: [
    { label: '5 2 8 6 3 7 | min 1 4 | set 2 1 | min 0 3', input: P('5 2 8 6 3 7 | min 1 4 | set 2 1 | min 0 3'), output: '[2, null, 1]' },
    { label: '9 4 7 1 8 | min 0 2 | set 3 10 | min 2 4 | min 0 4', input: P('9 4 7 1 8 | min 0 2 | set 3 10 | min 2 4 | min 0 4'), output: '[4, null, 7, 4]' },
    { label: '3 3 3 3 | min 0 3 | set 1 -4 | min 2 3 | min 0 1', input: P('3 3 3 3 | min 0 3 | set 1 -4 | min 2 3 | min 0 1'), output: '[3, null, 3, -4]' },
  ],
  inputPlaceholder: 'e.g. 5 2 8 6 3 7 | min 1 4 | set 2 1 | min 0 3',
  parseInput: (raw) => parseSegOps(raw, 'min'),
  buildSteps: (i) => segSteps(i, 'min'),
  viz: 'cells',
  vizTitle: 'Segment tree (minimum over range)',
  legend: [{ label: 'Node in use / current', state: 'active' }, { label: 'Piece taken / updated', state: 'found' }, { label: 'Partial overlap', state: 'compare' }, { label: 'Not built / pruned', state: 'dim' }],
  varLabels: ['op', 'node', 'running', 'answers'],
  approach: {
    title: 'Same tree, a different merge',
    text: 'The shape of the segment tree does not care what it stores. Replace "sum" by "min" and every node keeps the minimum of its range. Disjoint nodes return infinity (the neutral element of min) so they never win, and a prefix-minimum trick is impossible because values can go back up after an update.',
  },
  java: code.java,
  python: code.python,
  algorithm: [
    'Build: each leaf holds an item, each inner node the min of its two children',
    'Set: walk to the leaf and overwrite it',
    'Set: recompute the min of every ancestor on the way back',
    'Query: disjoint nodes give +infinity, covered nodes give their stored min, partial nodes split',
    'Return the answers of all operations in order',
  ],
  phases: segPhases,
  emphasis: ['minRange(left, right)', 'set(index, val)', 'minimum', 'segment tree'],
  complexity: [{ label: 'Time', value: 'O(n) build, O(log n) per op' }, { label: 'Space', value: 'O(n)' }],
  why: 'Min is associative and has a neutral element (+infinity), which is all a segment tree needs: any range is a disjoint union of O(log n) node ranges, and combining their stored minima gives the minimum of the union. Unlike a sum, a minimum cannot be undone by subtraction, which is why a plain prefix array cannot handle updates here and the tree is the right tool.',
  naive: 'Scanning nums[left..right] costs O(n) per query. A sparse table answers in O(1) but cannot absorb updates without a full rebuild.',
};
