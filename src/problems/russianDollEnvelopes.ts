import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { capSteps, heads, recorder } from './stepKit.ts';

interface In { env: [number, number][] }

function parse(raw: string): In {
  const tokens = raw.split(/[\s,]+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 8) throw new Error('Use between 1 and 8 envelopes, e.g. 5:4 6:4 6:7 2:3');
  const env = tokens.map((t): [number, number] => {
    const m = /^(\d+):(\d+)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a width:height pair — write envelopes like 5:4`);
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (w < 1 || w > 9 || h < 1 || h > 9) throw new Error('Widths and heights must each be between 1 and 9');
    return [w, h];
  });
  return capSteps(build, { env });
}

function build({ env }: In): Step[] {
  const steps: Step[] = [];
  let order: [number, number][] = env.map((e) => [...e] as [number, number]);
  let cur = -1;
  let tails: number[] = [];
  let tailCol: number[] = [];
  let sortedDone = false;
  let probes: string = '—';
  let pos: number | string = '—';

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      variant: 'table' as const,
      rows: [
        order.map((e, c): Cell => ({ key: `w${sortedDone ? 's' : 'u'}${c}`, value: e[0], state: c === cur ? 'active' : undefined })),
        order.map((e, c): Cell => ({ key: `h${sortedDone ? 's' : 'u'}${c}`, value: e[1], state: c === cur ? 'active' : tailCol.includes(c) ? 'found' : undefined })),
      ],
      rowHeads: ['width', 'height'],
      colHeads: heads(order.length),
    },
    aux: [{ title: 'tails (smallest tail per length)', kind: 'list' as const, items: tails.map(String) }],
    vars: { height: cur >= 0 ? order[cur][1] : '—', probes, pos, size: tails.length },
  });
  const say = recorder(steps, snap);

  say({
    title: 'An envelope fits inside another if both sides are strictly smaller', desc: 'We want the longest chain of nested envelopes. That is a longest increasing subsequence in two dimensions, which a single LIS cannot handle directly.',
    logic: 'Plan: sort by width so that widths already increase, then run LIS on the heights alone.', java: [0], py: [0], algo: 0,
    tag: 'GOAL —', note: `${env.length} envelopes ${env.map((e) => `${e[0]}:${e[1]}`).join(' ')}, chain must grow in width AND height`,
  });

  order = [...env].sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  sortedDone = true;
  say({
    title: 'Sort by width ascending, height descending on ties', desc: 'Envelopes of equal width cannot nest. Putting taller ones first among equal widths means an increasing run of heights can never use two of them.',
    logic: 'Descending heights within a width make "strictly increasing heights" automatically exclude same-width pairs.', tone: 'success', java: [1], py: [1], algo: 1,
    tag: 'SORT —', note: `order = ${order.map((e) => `${e[0]}:${e[1]}`).join(' ')}`,
  });

  order.forEach((e, idx) => {
    cur = idx;
    const h = e[1];
    let lo = 0;
    let hi = tails.length;
    const seen: string[] = [];
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      seen.push(String(tails[mid]));
      if (tails[mid] < h) lo = mid + 1;
      else hi = mid;
    }
    pos = lo;
    probes = seen.length ? seen.join(', ') : '—';
    const extend = lo === tails.length;
    const oldTail = extend ? 0 : tails[lo];
    if (extend) {
      tails.push(h);
      tailCol.push(idx);
    } else {
      tails[lo] = h;
      tailCol[lo] = idx;
    }
    tails = [...tails];
    tailCol = [...tailCol];
    say({
      title: `Height ${h}: ${extend ? 'extend' : 'replace'} at ${lo}`,
      desc: `Binary search over tails${seen.length ? ` (probed ${probes})` : ' (empty)'} finds the first tail ≥ ${h} at position ${lo}. ${extend ? `Nothing is that large, so the chain grows to length ${tails.length}.` : `Replace tails[${lo}] with ${h}: a smaller tail keeps more options open for future envelopes.`}`,
      logic: 'tails[k] is the smallest height that can end a nested chain of length k + 1; the number of tails is the best chain length so far.', tone: extend ? 'success' : 'info',
      java: extend ? [5, 6, 7, 8, 9, 10, 11] : [5, 6, 7, 8, 9, 10], py: extend ? [3, 4, 5, 6] : [3, 4, 7, 8], algo: 2,
      tag: extend ? 'EXTEND —' : 'REPLACE —',
      note: extend ? `h = ${h} ≥ every tail → tails[${lo}] = ${h}, chain = ${tails.length}` : `h = ${h}: first tail ≥ ${h} is tails[${lo}] = ${oldTail} → replace with ${h}`,
    });
  });

  cur = -1;
  probes = '—';
  pos = '—';
  say({
    title: 'Done', desc: `The longest chain of nested envelopes has ${tails.length} envelope${tails.length === 1 ? '' : 's'}.`,
    logic: 'The size of tails is the LIS length of the heights after the special sort.', tone: 'success', java: [13], py: [9], algo: 3,
    tag: '✅ Done!', note: `return tails.size = ${tails.length}`,
    result: { title: String(tails.length), text: 'Maximum nested envelopes' },
  });
  return steps;
}

export const russianDollEnvelopes: ProblemDef<In> = {
  slug: '354-russian-doll-envelopes',
  id: '354', title: 'Russian Doll Envelopes', difficulty: 'Hard', category: 'Dynamic Programming', tag: 'sort + LIS (tails)',
  statement: 'Each envelope has a width and a height. One envelope fits inside another only if both its width and height are strictly smaller. Return the largest number of envelopes that can be nested like Russian dolls (rotation is not allowed).',
  constraints: '1 ≤ envelopes.length ≤ 10⁵ (animation input: ≤ 8 envelopes with sides 1–9)',
  examples: [
    { label: '5:4 6:4 6:7 2:3', input: { env: [[5, 4], [6, 4], [6, 7], [2, 3]] }, output: '3' },
    { label: '1:1 1:1 1:1', input: { env: [[1, 1], [1, 1], [1, 1]] }, output: '1' },
    { label: '4:5 4:6 6:7 2:3 1:1', input: { env: [[4, 5], [4, 6], [6, 7], [2, 3], [1, 1]] }, output: '4' },
  ],
  inputPlaceholder: 'width:height pairs, e.g. 5:4 6:4 6:7 2:3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizCaption: 'envelopes as columns — green height = currently a tail',
  legend: [{ label: 'Envelope being placed', state: 'active' }, { label: 'Currently a tail', state: 'found' }],
  varLabels: ['height', 'probes', 'pos', 'size'],
  emphasis: ['strictly smaller', 'nested', 'rotation is not allowed'],
  phases: [
    { icon: '🎯', label: 'Goal: nest in 2 dimensions', tone: 'blue' },
    { icon: '↕️', label: 'Sort width ↑, height ↓', tone: 'blue' },
    { icon: '🪜', label: 'LIS (tails) on heights', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Sort, then LIS on heights',
    text: 'Sort envelopes by width ascending and, for equal widths, by height descending. Then find the longest strictly increasing subsequence of the heights with the tails array and binary search; its length is the answer.',
  },
  java: [
    'public int maxEnvelopes(int[][] envelopes) {',
    '    Arrays.sort(envelopes, (a, b) -> a[0] != b[0] ? a[0] - b[0] : b[1] - a[1]);   // width asc, height desc on ties',
    '    int[] tails = new int[envelopes.length];',
    '    int size = 0;',
    '    for (int[] e : envelopes) {',
    '        int lo = 0, hi = size;',
    '        while (lo < hi) {                                // first tail >= height',
    '            int mid = (lo + hi) >>> 1;',
    '            if (tails[mid] < e[1]) lo = mid + 1; else hi = mid;',
    '        }',
    '        tails[lo] = e[1];',
    '        if (lo == size) size++;',
    '    }',
    '    return size;',
    '}',
  ],
  python: [
    'def max_envelopes(envelopes):',
    '    envelopes.sort(key=lambda e: (e[0], -e[1]))     # width asc, height desc on ties',
    '    tails = []',
    '    for _, h in envelopes:',
    '        lo = bisect_left(tails, h)                   # first tail >= h',
    '        if lo == len(tails):',
    '            tails.append(h)',
    '        else:',
    '            tails[lo] = h',
    '    return len(tails)',
  ],
  algorithm: [
    'Nesting needs both sides strictly smaller — a 2-D increasing chain',
    'Sort by width ascending, height descending for equal widths',
    'Run LIS on the heights: binary-search each height into the tails array',
    'Return the number of tails',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'After sorting, widths never decrease, so any increasing run of heights picks envelopes of non-decreasing width; the descending-height tie-break guarantees two envelopes of the same width can never both appear in a strictly increasing height run, so every such run is a valid strictly nested chain, and every nested chain is such a run. The tails array then computes the longest strictly increasing run in O(n log n).',
};
