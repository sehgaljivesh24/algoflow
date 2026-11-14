import type { Cell, LogicTone, ProblemDef, Step, Tone } from '../engine/types.ts';
import { plural } from './text.ts';

interface In { m: number[][]; target: number }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: matrix rows, then "|", then the target, e.g. 1 3 5; 7 10 11; 16 20 23 | 3');
  const m = parts[0].split(/[;/\n]+/).map((r) => r.trim()).filter(Boolean).map((r) => r.split(/[\s,]+/).filter(Boolean).map(Number));
  const target = Number(parts[1].trim());
  if (!m.length || m.some((r) => !r.length || r.some((n) => !Number.isInteger(n)))) throw new Error('Rows must be whole numbers separated by ";"');
  if (!Number.isInteger(target)) throw new Error('The target must be a whole number');
  if (m.some((r) => r.length !== m[0].length)) throw new Error('Every row must have the same number of columns');
  if (m.length > 7 || m[0].length > 9) throw new Error('Use at most 7 rows and 9 columns');
  const flat = m.flat();
  if (flat.some((v, i) => i > 0 && v < flat[i - 1])) throw new Error('Rows must be sorted, and each row must start at or above the end of the previous row');
  return { m, target };
}

function build({ m, target }: In): Step[] {
  const R = m.length;
  const C = m[0].length;
  const total = R * C;
  let lo = 0;
  let hi = total - 1;
  let mid = -1;
  let hit = -1;
  const steps: Step[] = [];

  const rows = (): Cell[][] =>
    m.map((row, r) => row.map((v, c) => {
      const k = r * C + c;
      let state: Cell['state'];
      let tone: Tone | undefined;
      if (k === hit) state = 'found';
      else if (k === mid) state = 'active';
      else if (k < lo || k > hi) state = 'dim';
      if (k === lo && k !== mid && k !== hit) tone = 'blue';
      if (k === hi && k !== mid && k !== hit) tone = 'orange';
      return { key: `${r},${c}`, value: v, state, tone };
    }));
  let box: string[] = [];
  let boxHl: number | undefined;
  const push = (title: string, desc: string, logic: string, tone: LogicTone, j: number[], p: number[], a: number, result?: Step['result'], extra?: { tag?: string; note?: string; alert?: string }) =>
    steps.push({
      title, desc, scene: { kind: 'grid', rows: rows(), rowHeads: m.map((_, r) => String(r)), colHeads: m[0].map((_, c) => String(c)) },
      aux: [{ title: 'Compare box — flat index → (row, col)', kind: 'list', items: box, highlight: boxHl }],
      vars: { target, lo, hi, mid: mid >= 0 ? mid : '—' }, logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, result, ...extra,
    });
  const show = (items: string[], hl?: number) => { box = items; boxHl = hl; };
  const span = () => (lo <= hi ? `[${lo}..${hi}]` : 'empty');

  show([`target = ${target}`, `flat range = ${span()}`, `k → (k / ${C}, k % ${C})`]);
  push('Start', `Looking for ${target}. Pretend the ${R}×${C} matrix is one sorted list of ${plural(total, 'number')}: indexes 0..${total - 1}.`,
    'Because each row starts above the previous row\'s end, row-by-row order is a single sorted sequence. Index k lives at row k / n, column k % n.', 'info', [2], [2], 0,
    undefined, { tag: 'INIT —', note: `lo = 0, hi = ${R} * ${C} − 1 = ${total - 1}` });

  let iter = 0;
  while (lo <= hi) {
    iter++;
    mid = Math.floor((lo + hi) / 2);
    const r = Math.floor(mid / C);
    const c = mid % C;
    const v = m[r][c];
    show([`mid = ${mid} → (${mid} / ${C}, ${mid} % ${C}) = (${r}, ${c})`, `m[${r}][${c}] = ${v}`, `target = ${target}`]);
    push(`Check mid = ${mid} → (${r}, ${c})`, `mid = (${lo} + ${hi}) / 2 = ${mid}, so row = ${mid} / ${C} = ${r}, col = ${mid} % ${C} = ${c}: m[${r}][${c}] = ${v}.`, `mid = ⌊(${lo} + ${hi}) / 2⌋ = ${mid}; row = ${mid} / ${C} = ${r}, col = ${mid} % ${C} = ${c}.`, 'info', [4, 5], [4, 5], 1,
      undefined, { tag: `ROUND ${iter} · MID —`, note: `v = m[${r}][${c}] = ${v}` });
    if (v === target) {
      hit = mid;
      show([`m[${r}][${c}] = ${v}`, `${v} == ${target} → hit`, `position = (${r}, ${c})`], 1);
      push(`Found ${target}`, `${v} equals the target at row ${r}, column ${c}.`, 'The binary search landed on the target.', 'success', [6], [6, 7], 4,
        { title: 'true', text: `${target} is at (${r}, ${c})` }, { tag: '✅ Found!', note: `${v} == ${target} → return true` });
      return steps;
    }
    if (v < target) {
      lo = mid + 1;
      show([`m[${r}][${c}] = ${v}`, `${v} < ${target} → go right`, `flat range = ${span()}`], 1);
      push(`${v} < ${target}: search the right part`, `${v} < ${target}: everything up to flat index ${mid} is too small, so lo = ${mid} + 1 = ${lo}.`, 'Discard the lower half of the flattened list.', 'warn', [7], [8, 9], 3,
        undefined, { tag: 'TOO SMALL → DISCARD LEFT —', note: `lo = mid + 1 = ${lo}` });
    } else {
      hi = mid - 1;
      show([`m[${r}][${c}] = ${v}`, `${v} > ${target} → go left`, `flat range = ${span()}`], 1);
      push(`${v} > ${target}: search the left part`, `${v} > ${target}: everything from flat index ${mid} on is too big, so hi = ${mid} − 1 = ${hi}.`, 'Discard the upper half of the flattened list.', 'warn', [8], [10, 11], 3,
        undefined, { tag: 'TOO BIG → DISCARD RIGHT —', note: `hi = mid − 1 = ${hi}` });
    }
  }

  mid = -1;
  show([`target = ${target}`, 'flat range = empty', `lo = ${lo} > hi = ${hi}`], 1);
  push('Range is empty', `lo = ${lo} passed hi = ${hi}, so ${target} is not in the matrix.`, 'The shrinking range ran out of candidates.', 'warn', [10], [12], 4,
    { title: 'false', text: `${target} is not in the matrix` }, { tag: 'NOT FOUND —', note: 'loop ends → return false', alert: `The range is empty: ${target} is not in the matrix.` });
  return steps;
}

export const searchA2DMatrix: ProblemDef<In> = {
  slug: '74-search-a-2d-matrix',
  id: '74', title: 'Search a 2D Matrix', difficulty: 'Medium', category: 'Matrix', tag: 'binary search',
  statement: 'Each row of an m × n matrix is sorted ascending, and the first number of each row is greater than the last number of the previous row. Decide whether a target is present, in O(log(m·n)) time.',
  constraints: '1 ≤ m, n ≤ 100 (animation input is limited to 7 × 9); rows sorted and chained in order',
  examples: [
    { label: '1 3 5 7; 10 11 16 20; 23 30 34 60 | 3', input: { m: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 3 }, output: 'true' },
    { label: '1 3 5 7; 10 11 16 20; 23 30 34 60 | 13', input: { m: [[1, 3, 5, 7], [10, 11, 16, 20], [23, 30, 34, 60]], target: 13 }, output: 'false' },
    { label: '1 3 | 3', input: { m: [[1, 3]], target: 3 }, output: 'true' },
  ],
  inputPlaceholder: 'matrix | target, e.g. 1 3 5; 7 10 11; 16 20 23 | 10',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Middle being tested', state: 'active' }, { label: 'Outside the search range', state: 'dim' }, { label: 'Target found', state: 'found' }],
  varLabels: ['target', 'lo', 'hi', 'mid'],
  approach: {
    title: 'Binary search on a flattened matrix',
    text: 'Treat the matrix as one sorted array of m·n values. Binary search on indexes 0 … m·n−1 and convert each middle index into a cell with row = mid / n and col = mid % n.',
  },
  java: [
    'public boolean searchMatrix(int[][] m, int target) {',
    '    int R = m.length, C = m[0].length;',
    '    int lo = 0, hi = R * C - 1;',
    '    while (lo <= hi) {',
    '        int mid = (lo + hi) / 2;',
    '        int v = m[mid / C][mid % C];',
    '        if (v == target) return true;',
    '        if (v < target) lo = mid + 1;',
    '        else hi = mid - 1;',
    '    }',
    '    return false;',
    '}',
  ],
  python: [
    'def search_matrix(m, target):',
    '    R, C = len(m), len(m[0])',
    '    lo, hi = 0, R * C - 1',
    '    while lo <= hi:',
    '        mid = (lo + hi) // 2',
    '        v = m[mid // C][mid % C]',
    '        if v == target:',
    '            return True',
    '        if v < target:',
    '            lo = mid + 1',
    '        else:',
    '            hi = mid - 1',
    '    return False',
  ],
  algorithm: [
    'View the matrix as a sorted list of R × C numbers (index k = row k / C, column k % C)',
    'Take the middle index and read its cell',
    'If it equals the target, return true',
    'If smaller, discard the left half; if larger, discard the right half',
    'Equal → true; empty range → false',
  ],
  phases: [
    { icon: '📋', label: 'Flatten (index k → row, col)', tone: 'blue' },
    { icon: '📍', label: 'Read mid cell', tone: 'cyan' },
    { icon: '⚖️', label: 'Compare with target', tone: 'gold' },
    { icon: '✂️', label: 'Discard half', tone: 'orange' },
    { icon: '✅', label: 'Found / Done', tone: 'green' },
  ],
  emphasis: ['sorted ascending', 'greater than the last number of the previous row', 'O(log(m·n))'],
  complexity: [{ label: 'Time', value: 'O(log(m · n))' }, { label: 'Space', value: 'O(1)' }],
  why: 'The chaining condition makes row-major order globally sorted, so the flattened list is an ordinary sorted array and binary search is valid. The index arithmetic mid / C and mid % C is an exact bijection between flat indexes and cells, so no cell is lost or duplicated.',
};
