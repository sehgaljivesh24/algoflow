import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { noun, plural } from './text.ts';
import { emitter, parseOne, parts } from './listheapKit.ts';
import { parseNums, ptr } from './ssbShared.ts';

interface In { arr: number[]; k: number; x: number }

function parse(raw: string): In {
  const [a, b, c] = parts(raw, 3, 'sorted values ; k ; x — e.g. 1 2 3 4 5 ; 4 ; 3');
  const arr = parseNums(a, { maxLen: 12, lo: -99, hi: 99, what: 'values' });
  if (arr.some((v, i) => i > 0 && v < arr[i - 1])) throw new Error('The values must be sorted in non-decreasing order');
  const k = parseOne(b, 1, arr.length, 'k');
  const x = parseOne(c, -99, 99, 'x');
  return { arr, k, x };
}

function build({ arr, k, x }: In): Step[] {
  const n = arr.length;
  const steps: Step[] = [];
  let lo = 0;
  let hi = n - k;
  let mid: number | null = null;
  let final = false;
  let iter = 0;
  let box: string[] = [];
  let boxHl: number | undefined;
  const show = (items: string[], hl?: number) => { box = items; boxHl = hl; };

  const emit = emitter(steps, () => {
    const cells: Cell[] = arr.map((value, i) => {
      let state: Cell['state'];
      if (final) state = i >= lo && i < lo + k ? 'found' : 'dim';
      else if (i < lo || i > hi + k - 1) state = 'dim';
      else if (mid !== null && (i === mid || i === mid + k)) state = 'compare';
      else if (mid !== null && i > mid && i < mid + k) state = 'active';
      return { key: i, value, state };
    });
    const pointers = final
      ? [ptr('lo', 'start', lo, 'green')]
      : [
          ptr('lo', 'lo', lo, 'blue'),
          ...(mid !== null ? [ptr('mid', 'mid', mid, 'orange'), ...(mid + k < n ? [ptr('end', 'mid+k', mid + k, 'purple')] : [])] : []),
        ];
    return {
      cells,
      pointers,
      aux: [{ title: 'Compare box — leaving vs entering', kind: 'list' as const, items: box, highlight: boxHl }],
      vars: {
        lo, mid: mid ?? '—', hi,
        'x − arr[mid]': mid === null ? '—' : x - arr[mid],
        'arr[mid+k] − x': mid === null ? '—' : arr[mid + k] - x,
      },
    };
  });

  show([`x = ${x}`, `k = ${k}`, `start range = [${lo}..${hi}]`]);
  emit('Start', `Pick the k = ${plural(k, 'value')} closest to x = ${x} from a sorted array. The answer is a block of k neighbours, so we search for where that block starts: between 0 and n − k = ${hi}.`,
    'The k closest elements are always contiguous in a sorted array, so only the start index is unknown.', 'info', [1], [1], 0,
    undefined, { tag: 'INIT —', note: `lo = 0, hi = ${n} − ${k} = ${hi}` });

  while (lo < hi) {
    iter++;
    mid = lo + Math.floor((hi - lo) / 2);
    show([`block = arr[${mid}..${mid + k - 1}]`, `leaving: arr[${mid}] = ${arr[mid]}`, `entering: arr[${mid + k}] = ${arr[mid + k]}`]);
    emit(`Try the block starting at ${mid}`, `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}: block = indexes ${mid}..${mid + k - 1}; the first value outside it is arr[${mid + k}] = ${arr[mid + k]}.`,
      'Decide whether the block should slide right: compare its leftmost value with the value just past its right edge.', 'info', [3], [3], 1,
      undefined, { tag: `ROUND ${iter} · BLOCK —`, note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}` });
    const d1 = x - arr[mid];
    const d2 = arr[mid + k] - x;
    const right = d1 > d2;
    show([`x − arr[${mid}] = ${d1}`, `arr[${mid + k}] − x = ${d2}`, `${d1} ${right ? '>' : '≤'} ${d2} → ${right ? 'slide right' : 'keep mid'}`], 2);
    emit(`Compare ${d1} with ${d2}`, `x − arr[${mid}] = ${d1} and arr[${mid + k}] − x = ${d2}. ${right ? `The right neighbour ${arr[mid + k]} is strictly closer than the left end ${arr[mid]}.` : `The left end ${arr[mid]} is at least as close as ${arr[mid + k]} (ties favour the smaller value).`}`,
      right ? 'Swapping the far-left value for the closer one on the right improves the block: the start must be to the right of mid.' : 'The block cannot be improved by sliding right, so the best start is mid or earlier.', 'info', [4], [4], 2,
      undefined, { tag: right ? 'RIGHT IS CLOSER —' : 'LEFT IS CLOSER —', note: `${d1} > ${d2}? ${right ? 'yes → lo = mid + 1' : 'no → hi = mid'}` });
    if (right) lo = mid + 1;
    else hi = mid;
    const keepMid = mid;
    mid = null;
    show([`start range = [${lo}..${hi}]`, right ? `lo = ${keepMid} + 1 = ${lo}` : `hi = mid = ${hi}`]);
    emit(right ? `Slide right: lo = ${lo}` : `Keep: hi = ${hi}`, right ? `Starts up to ${keepMid} are ruled out: lo = ${lo}. Start lies in [${lo}, ${hi}].` : `Starts after ${keepMid} are ruled out: hi = ${hi}. Start lies in [${lo}, ${hi}].`,
      'The range of possible start indexes halves each round.', 'warn', right ? [4] : [5], right ? [5] : [6, 7], 3,
      undefined, { tag: right ? 'DISCARD LEFT STARTS —' : 'DISCARD RIGHT STARTS —', note: right ? `lo = mid + 1 = ${lo}` : `hi = mid = ${hi}` });
  }

  mid = null;
  final = true;
  const res = arr.slice(lo, lo + k);
  show([`start = ${lo}`, `answer = [${res.join(', ')}]`], 1);
  emit(`Block starts at ${lo}`, `The start range collapsed to ${lo}, so the answer is arr[${lo}..${lo + k - 1}] = [${res.join(', ')}].`,
    'Those k values are the ones with the smallest distance to x, listed in sorted order.', 'success', [7, 8, 9], [8], 4,
    { title: `[${res.join(', ')}]`, text: `The ${k} closest ${noun(k, 'value')} to ${x}` }, { tag: '✅ Done!', note: `return arr[${lo}..${lo + k - 1}]` });
  return steps;
}

export const findKClosestElements: ProblemDef<In> = {
  slug: '658-find-k-closest-elements',
  id: '658', title: 'Find K Closest Elements', difficulty: 'Medium', category: 'Binary Search', tag: 'binary search on window start',
  statement: 'Given a sorted array, an integer k and a target x, return the k values closest to x (by absolute difference; on a tie the smaller value wins), in ascending order.',
  constraints: '1 ≤ k ≤ n ≤ 10⁴, array sorted ascending (animation: up to 12 values between −99 and 99)',
  examples: [
    { label: '1 2 3 4 5 ; 4 ; 3', input: { arr: [1, 2, 3, 4, 5], k: 4, x: 3 }, output: '[1,2,3,4]' },
    { label: '1 2 3 4 5 ; 4 ; -1', input: { arr: [1, 2, 3, 4, 5], k: 4, x: -1 }, output: '[1,2,3,4]' },
    { label: '1 3 8 10 15 20 ; 3 ; 9', input: { arr: [1, 3, 8, 10, 15, 20], k: 3, x: 9 }, output: '[3,8,10]' },
  ],
  inputPlaceholder: 'sorted values ; k ; x — e.g. 1 2 3 4 5 ; 4 ; 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Ends compared (arr[mid], arr[mid+k])', state: 'compare' }, { label: 'Inside the candidate block', state: 'active' }, { label: 'Final block', state: 'found' }, { label: 'Ruled out', state: 'dim' }],
  varLabels: ['lo', 'mid', 'hi', 'x − arr[mid]', 'arr[mid+k] − x'],
  approach: {
    title: 'Binary search the start of the block',
    text: 'The answer is k consecutive values, so search for its first index in [0, n − k]. For a candidate start mid, compare the distance from x to arr[mid] (leaving the block) with the distance to arr[mid + k] (entering it). If the entering value is strictly closer, the block belongs further right.',
  },
  java: [
    'public List<Integer> findClosestElements(int[] arr, int k, int x) {',
    '    int lo = 0, hi = arr.length - k;',
    '    while (lo < hi) {',
    '        int mid = lo + (hi - lo) / 2;',
    '        if (x - arr[mid] > arr[mid + k] - x) lo = mid + 1;',
    '        else hi = mid;',
    '    }',
    '    List<Integer> res = new ArrayList<>();',
    '    for (int i = lo; i < lo + k; i++) res.add(arr[i]);',
    '    return res;',
    '}',
  ],
  python: [
    'def find_closest_elements(arr, k, x):',
    '    lo, hi = 0, len(arr) - k',
    '    while lo < hi:',
    '        mid = lo + (hi - lo) // 2',
    '        if x - arr[mid] > arr[mid + k] - x:',
    '            lo = mid + 1',
    '        else:',
    '            hi = mid',
    '    return arr[lo:lo + k]',
  ],
  algorithm: [
    'The answer is a block of k neighbours: search its start in [0, n − k]',
    'Take mid and look at the block mid … mid + k − 1',
    'Compare x − arr[mid] with arr[mid + k] − x',
    'Right value closer → lo = mid + 1; otherwise hi = mid',
    'Return arr[lo … lo + k − 1]',
  ],
  phases: [
    { icon: '🎬', label: 'Init start range', tone: 'blue' },
    { icon: '📍', label: 'Pick a block (mid)', tone: 'cyan' },
    { icon: '⚖️', label: 'Compare leaving vs entering', tone: 'gold' },
    { icon: '✂️', label: 'Move the range', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['k values closest', 'sorted array', 'ascending order'],
  complexity: [{ label: 'Time', value: 'O(log(n − k) + k)' }, { label: 'Space', value: 'O(1) extra' }],
  why: 'Define bad(s) = "x − arr[s] > arr[s+k] − x", meaning the block starting at s can be improved by sliding right. Because the array is sorted, once a block no longer wants to move right no later block wants it either, so bad flips from true to false exactly once. The first start where it is false is the best block, which is why the search can keep hi = mid and the tie rule (strict >) prefers the smaller values.',
};
