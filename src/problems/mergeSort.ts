import type { Cell, CellState, Pointer, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { parseNums, ptr } from './ssbShared.ts';
import { treeOverArray, twoPass, type RecTree } from './recTreeKit.ts';

interface In { nums: number[] }

type Raw = Omit<Step, 'scene' | 'cells' | 'pointers'> & { cells: Cell[]; pointers: Pointer[]; plain?: boolean };

function run({ nums }: In, tree: RecTree): Step[] {
  const arr = [...nums];
  const keys = arr.map((_, i) => i);
  const n = arr.length;
  const steps: Step[] = [];
  const merged = arr.map(() => false);
  const stack: string[] = [];
  let compares = 0;
  let writes = 0;
  let buffer: number[] = [];
  /** Every step is drawn as the recursion tree of ranges above the array (the final step is the plain sorted array). */
  const emit = ({ cells: cs, pointers: ps, plain, ...rest }: Raw): void => {
    steps.push(plain ? { ...rest, cells: cs, pointers: ps } : { ...rest, scene: treeOverArray(tree.scene(), cs, ps) });
  };

  /** [lo, hi] is the active range; cells outside it are dim (or green if they belong to a finished run). */
  const cells = (lo: number, hi: number, mark: Record<number, CellState> = {}): Cell[] =>
    arr.map((value, i) => ({ key: keys[i], value, state: mark[i] ?? (i < lo || i > hi ? (merged[i] ? 'found' : 'dim') : undefined) }));
  const aux = () => [
    { title: 'Active ranges (recursion stack)', kind: 'stack' as const, items: [...stack] },
    { title: 'Merge buffer', kind: 'list' as const, items: buffer.map(String) },
  ];
  const vars = (lo: number | string, mid: number | string, hi: number | string, p: number | string, q: number | string) => ({ lo, mid, hi, p, q, compares });

  emit({
    title: 'Merge Sort', tag: 'INIT', desc: `n = ${n}. Split the array in halves until single elements remain, then merge sorted halves back together.`,
    note: `mergeSort(nums, 0, ${n - 1}) on [${arr.join(', ')}]`,
    cells: cells(0, n - 1), pointers: [], vars: vars(0, '—', n - 1, '—', '—'), aux: aux(),
    logic: 'A single element is already sorted. Merging two sorted lists is easy: repeatedly take the smaller front element.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) {
      tree.leaf(`${lo}`, 'done', { call: `sort(${lo}..${lo})` });
      return;
    }
    stack.push(`${lo}..${hi}`);
    tree.enter(`${lo}..${hi}`, { call: `sort(${lo}..${hi})` });
    const mid = lo + Math.floor((hi - lo) / 2);
    emit({
      title: `Split ${lo}..${hi} at mid = ${mid}`, tag: 'SPLIT',
      desc: `Range ${lo}..${hi} [${arr.slice(lo, hi + 1).join(', ')}] splits into ${lo}..${mid} and ${mid + 1}..${hi}. Sort each half first.`,
      note: `mid = ${lo} + (${hi} - ${lo}) / 2 = ${mid}`,
      cells: cells(lo, hi, Object.fromEntries(Array.from({ length: mid - lo + 1 }, (_, k) => [lo + k, 'active' as const]))), pointers: [], vars: vars(lo, mid, hi, '—', '—'), aux: aux(),
      logic: 'Blue cells are the left half; the other cells in range are the right half.', logicTone: 'info', javaLines: [2], pyLines: [3], algoStep: 0,
    });
    sort(lo, mid);
    sort(mid + 1, hi);

    // ---- merge
    buffer = [];
    let p = lo;
    let q = mid + 1;
    const leftMarks = (from: number): Record<number, CellState> => {
      const m: Record<number, CellState> = {};
      for (let i = lo; i < from; i++) m[i] = 'dim';
      for (let i = mid + 1; i < q; i++) m[i] = 'dim';
      return m;
    };
    emit({
      title: `Merge ${lo}..${mid} and ${mid + 1}..${hi}`, tag: 'MERGE',
      desc: `Both halves are sorted: [${arr.slice(lo, mid + 1).join(', ')}] and [${arr.slice(mid + 1, hi + 1).join(', ')}]. Compare their fronts and copy the smaller one into the buffer.`,
      note: `p = ${p}, q = ${q}, buf = new int[${hi - lo + 1}]`,
      cells: cells(lo, hi, { ...leftMarks(p), ...Object.fromEntries(Array.from({ length: mid - lo + 1 }, (_, k) => [lo + k, 'active' as const])) }),
      pointers: [ptr('p', 'p', p, 'blue'), ptr('q', 'q', q, 'orange')], vars: vars(lo, mid, hi, p, q), aux: aux(),
      logic: 'p walks the left run, q walks the right run; the buffer collects the merged order.', logicTone: 'info', javaLines: [9], pyLines: [9], algoStep: 1,
    });
    while (p <= mid && q <= hi) {
      compares++;
      const takeLeft = arr[p] <= arr[q];
      const from = takeLeft ? p : q;
      buffer.push(arr[from]);
      const marks = { ...leftMarks(p), [p]: takeLeft ? 'swap' : 'compare', [q]: takeLeft ? 'compare' : 'swap' } as Record<number, CellState>;
      emit({
        title: `Compare ${arr[p]} and ${arr[q]}: take ${arr[from]}`, tag: takeLeft ? 'TAKE LEFT' : 'TAKE RIGHT',
        desc: takeLeft ? `${arr[p]} ≤ ${arr[q]}, so take ${arr[p]} from the left run (ties go left to keep the sort stable).` : `${arr[q]} < ${arr[p]}, so take ${arr[q]} from the right run.`,
        note: takeLeft ? `${arr[p]} <= ${arr[q]}: buf[${buffer.length - 1}] = ${arr[p]}, p++` : `${arr[q]} < ${arr[p]}: buf[${buffer.length - 1}] = ${arr[q]}, q++`,
        cells: cells(lo, hi, marks), pointers: [ptr('p', 'p', p, 'blue'), ptr('q', 'q', q, 'orange')], vars: vars(lo, mid, hi, p, q), aux: aux(),
        logic: `Buffer is now [${buffer.join(', ')}].`, logicTone: 'success', javaLines: takeLeft ? [11] : [12], pyLines: takeLeft ? [11, 12] : [13, 14], algoStep: 2,
      });
      if (takeLeft) p++;
      else q++;
    }
    if (p <= mid || q <= hi) {
      const leftRest = p <= mid;
      const rest = leftRest ? arr.slice(p, mid + 1) : arr.slice(q, hi + 1);
      const marks = leftMarks(p);
      for (let i = leftRest ? p : q; i <= (leftRest ? mid : hi); i++) marks[i] = 'swap';
      buffer.push(...rest);
      emit({
        title: `${leftRest ? 'Right' : 'Left'} run is used up: copy the rest`, tag: 'COPY REST',
        desc: `The ${leftRest ? 'right' : 'left'} run is empty, so append the remaining ${rest.length} value${rest.length === 1 ? '' : 's'} [${rest.join(', ')}] from the ${leftRest ? 'left' : 'right'} run as they are.`,
        note: `buf += [${rest.join(', ')}] → [${buffer.join(', ')}]`,
        cells: cells(lo, hi, marks), pointers: [], vars: vars(lo, mid, hi, Math.min(p, mid + 1), Math.min(q, hi + 1)), aux: aux(),
        logic: 'The other run is exhausted, so nothing competes with what is left. It is already sorted and is copied as is.', logicTone: 'info',
        javaLines: leftRest ? [14] : [15], pyLines: leftRest ? [15] : [16], algoStep: 2,
      });
    }
    // write back: reorder keys so cells slide into place
    const idx = Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
    // stable order of original positions consistent with the buffer
    const order: number[] = [];
    let a = lo;
    let b = mid + 1;
    while (a <= mid && b <= hi) order.push(arr[a] <= arr[b] ? a++ : b++);
    while (a <= mid) order.push(a++);
    while (b <= hi) order.push(b++);
    const newArr = order.map((o) => arr[o]);
    const newKeys = order.map((o) => keys[o]);
    idx.forEach((pos, k) => { arr[pos] = newArr[k]; keys[pos] = newKeys[k]; writes++; });
    for (const pos of idx) merged[pos] = true;
    emit({
      title: `Write back: ${lo}..${hi} is sorted`, tag: 'WRITE BACK',
      desc: `Copy the buffer over nums[${lo}..${hi}]: that range is now sorted as [${arr.slice(lo, hi + 1).join(', ')}].`,
      note: `arraycopy(buf → nums[${lo}..${hi}]) = [${arr.slice(lo, hi + 1).join(', ')}]`,
      cells: cells(lo, hi, Object.fromEntries(idx.map((i) => [i, 'found' as const]))), pointers: [], vars: vars(lo, mid, hi, '—', '—'), aux: aux(),
      logic: 'The two halves became one sorted run (watch the cells slide into place).', logicTone: 'success', javaLines: [16], pyLines: [17], algoStep: 3,
    });
    buffer = [];
    stack.pop();
    tree.leave();
  };
  sort(0, n - 1);

  emit({
    title: 'Done', tag: '✅ Done!', desc: `Sorted [${arr.join(', ')}] with ${compares} comparison${compares === 1 ? '' : 's'} and ${writes} write-backs.`,
    note: `return nums = [${arr.join(', ')}]`, plain: true,
    cells: arr.map((value, i) => ({ key: keys[i], value, state: 'sorted' as const })), pointers: [], vars: vars('—', '—', '—', '—', '—'), aux: aux(),
    logic: `Final array: [${arr.join(', ')}]`, logicTone: 'success', javaLines: [0], pyLines: [0], algoStep: 4,
    result: { title: `[${arr.join(', ')}]`, text: plural(compares, 'comparison') },
  });
  return steps;
}

const build = (input: In): Step[] => twoPass((t) => run(input, t));

export const mergeSort: ProblemDef<In> = {
  slug: '912-merge-sort', id: '912', title: 'Merge Sort', difficulty: 'Medium', category: 'Sorting', tag: 'merge, divide & conquer',
  statement: 'Sort an array with merge sort: recursively sort each half, then merge the two sorted halves into one sorted run by always taking the smaller front element. Runs in O(n log n) in every case and is stable.',
  constraints: '1 ≤ n ≤ 5·10⁴ · −5·10⁴ ≤ nums[i] ≤ 5·10⁴ (animation input is limited to 12 numbers)',
  examples: [
    { label: '[5,2,9,1,5,6]', input: { nums: [5, 2, 9, 1, 5, 6] }, output: '[1,2,5,5,6,9]', answer: '[1,2,5,5,6,9] (stable: the two 5s keep their original order)' },
    { label: '[38,27,43,3,9,82,10]', input: { nums: [38, 27, 43, 3, 9, 82, 10] }, output: '[3,9,10,27,38,43,82]' },
    { label: '[4,3,2,1]', input: { nums: [4, 3, 2, 1] }, output: '[1,2,3,4]' },
  ],
  inputPlaceholder: 'e.g. 5 2 9 1 5 6',
  parseInput: (raw) => ({ nums: parseNums(raw, { maxLen: 12, lo: -9999, hi: 9999 }) }), buildSteps: build, viz: 'cells',
  emphasis: ['merge sort', 'merge the two sorted halves', 'O(n log n)'],
  phases: [
    { icon: '✂️', label: 'Split in halves', tone: 'blue' },
    { icon: '🔀', label: 'Start merge', tone: 'cyan' },
    { icon: '⚖️', label: 'Take smaller front', tone: 'orange' },
    { icon: '📝', label: 'Write back', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Left half / current call', state: 'active' }, { label: 'Value taken / finished call', state: 'swap' }, { label: 'Other front value / open call', state: 'compare' }, { label: 'Merged run', state: 'found' }, { label: 'Outside range / not reached', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'p', 'q', 'compares'],
  approach: {
    title: 'Split in halves, merge sorted halves',
    text: 'Keep splitting until each piece has one element. Then merge pairs of sorted pieces: put one finger at the start of each, repeatedly copy the smaller front value into a buffer, and copy the buffer back.',
  },
  java: [
    'void mergeSort(int[] nums, int lo, int hi) {',
    '    if (lo >= hi) return;',
    '    int mid = lo + (hi - lo) / 2;',
    '    mergeSort(nums, lo, mid);',
    '    mergeSort(nums, mid + 1, hi);',
    '    merge(nums, lo, mid, hi);',
    '}',
    'void merge(int[] nums, int lo, int mid, int hi) {',
    '    int[] buf = new int[hi - lo + 1];',
    '    int p = lo, q = mid + 1, k = 0;',
    '    while (p <= mid && q <= hi) {',
    '        if (nums[p] <= nums[q]) buf[k++] = nums[p++];',
    '        else buf[k++] = nums[q++];',
    '    }',
    '    while (p <= mid) buf[k++] = nums[p++];',
    '    while (q <= hi) buf[k++] = nums[q++];',
    '    System.arraycopy(buf, 0, nums, lo, buf.length);',
    '}',
  ],
  python: [
    'def merge_sort(nums, lo, hi):',
    '    if lo >= hi:',
    '        return',
    '    mid = lo + (hi - lo) // 2',
    '    merge_sort(nums, lo, mid)',
    '    merge_sort(nums, mid + 1, hi)',
    '    merge(nums, lo, mid, hi)',
    'def merge(nums, lo, mid, hi):',
    '    buf = []',
    '    p, q = lo, mid + 1',
    '    while p <= mid and q <= hi:',
    '        if nums[p] <= nums[q]:',
    '            buf.append(nums[p]); p += 1',
    '        else:',
    '            buf.append(nums[q]); q += 1',
    '    buf.extend(nums[p:mid + 1])',
    '    buf.extend(nums[q:hi + 1])',
    '    nums[lo:hi + 1] = buf',
  ],
  algorithm: [
    'Split the range at mid and sort both halves recursively (a single element is sorted)',
    'Merge: put p at the start of the left run and q at the start of the right run',
    'Copy the smaller front value into the buffer (ties go left); copy any leftovers',
    'Write the buffer back over nums[lo..hi]',
    'When the top-level merge is written back, the whole array is sorted',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n) always' }, { label: 'Space', value: 'O(n) buffer' }],
  why: 'If both halves are sorted, the smallest remaining value overall is always one of the two front elements, so repeatedly taking the smaller front produces a sorted merge in linear time. There are log₂ n levels of splitting and each level does O(n) merge work. Taking the left value on ties keeps equal elements in their original order (stability).',
};
