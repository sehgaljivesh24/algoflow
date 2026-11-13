import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arr, bin, find, gc, parseInts, recorder, splitParts } from './dpAdvKit.ts';

interface In { nums: number[]; k: number }

const java = [
  'public boolean canPartitionKSubsets(int[] nums, int k) {',
  '    int n = nums.length, total = Arrays.stream(nums).sum();',
  '    if (total % k != 0) return false;',
  '    int target = total / k;',
  '    int[] dp = new int[1 << n];                    // dp[mask] = amount in the bucket being filled, or -1 if unreachable',
  '    Arrays.fill(dp, -1);',
  '    dp[0] = 0;',
  '    for (int mask = 0; mask < (1 << n); mask++) {',
  '        if (dp[mask] == -1) continue;',
  '        for (int i = 0; i < n; i++) {',
  '            if ((mask & (1 << i)) != 0) continue;  // already used',
  '            int fill = dp[mask] + nums[i];',
  '            if (fill > target) continue;           // would overflow the bucket',
  '            dp[mask | (1 << i)] = fill % target;   // a full bucket resets to 0',
  '        }',
  '    }',
  '    return dp[(1 << n) - 1] == 0;',
  '}',
];
const python = [
  'def can_partition_k_subsets(nums, k):',
  '    n, total = len(nums), sum(nums)',
  '    if total % k:',
  '        return False',
  '    target = total // k',
  '    dp = [-1] * (1 << n)                           # dp[mask] = amount in the bucket being filled, -1 if unreachable',
  '    dp[0] = 0',
  '    for mask in range(1 << n):',
  '        if dp[mask] == -1:',
  '            continue',
  '        for i in range(n):',
  '            if mask & (1 << i):',
  '                continue                           # already used',
  '            fill = dp[mask] + nums[i]',
  '            if fill > target:',
  '                continue                           # would overflow the bucket',
  '            dp[mask | (1 << i)] = fill % target    # a full bucket resets to 0',
  '    return dp[(1 << n) - 1] == 0',
];
const J = { chk: find(java, 'int n = nums.length', 'if (total % k', 'int target'), def: find(java, 'int[] dp', 'Arrays.fill', 'dp[0] = 0'), mask: find(java, 'for (int mask', 'if (dp[mask] == -1)'), tr: find(java, 'for (int i = 0', 'int fill', 'if (fill > target', 'dp[mask | (1 << i)]'), ret: find(java, 'return dp[(1 << n) - 1]') };
const P = { chk: find(python, 'n, total', 'if total % k', 'target ='), def: find(python, 'dp = [-1]', 'dp[0] = 0'), mask: find(python, 'for mask in', 'if dp[mask] == -1'), tr: find(python, 'for i in range(n)', 'fill = ', 'if fill > target', 'dp[mask | (1 << i)]'), ret: find(python, 'return dp[(1 << n) - 1]') };

function build({ nums, k }: In): Step[] {
  const n = nums.length;
  const total = nums.reduce((a, b) => a + b, 0);
  const steps: Step[] = [];
  const target = total % k === 0 ? total / k : 0;
  const lowBits = Math.min(n, 3);
  const highBits = n - lowBits;
  const cols = 1 << lowBits;
  const rows = 1 << highBits;
  const dp: number[] = Array(1 << n).fill(-1);
  let cur = -1;
  let fresh: number[] = [];
  let finished = false;
  let notes: string[] = [];

  const snap = () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        { kind: 'array' as const, cells: arr(nums, (i) => (cur >= 0 && cur & (1 << i) ? 'active' : undefined), undefined, 'n'), pointers: [] },
        {
          kind: 'grid' as const, variant: 'table' as const,
          rows: Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
            const mask = (r << lowBits) | c;
            let s: CellState | undefined;
            if (mask === cur) s = finished ? 'found' : 'active';
            else if (fresh.includes(mask)) s = 'compare';
            else if (dp[mask] < 0) s = 'dim';
            return gc(`m${mask}`, dp[mask] < 0 ? '·' : dp[mask], s);
          })),
          rowHeads: Array.from({ length: rows }, (_, r) => (highBits ? bin(r, highBits) : 'mask')), colHeads: Array.from({ length: cols }, (_, c) => bin(c, lowBits)),
        },
      ],
    },
    aux: [{ title: 'bucket arithmetic', kind: 'list' as const, items: [`sum = ${total}`, total % k === 0 ? `target per bucket = ${target}` : `${total} not divisible by ${k}`, ...notes] }],
    vars: { mask: cur < 0 ? '—' : bin(cur, n), 'dp[mask]': cur < 0 ? '—' : dp[cur], target: total % k === 0 ? target : '—' },
  });
  const say = recorder(steps, snap);

  say({
    title: 'Bucket arithmetic', desc: `The ${n} numbers add to ${total}. Splitting into ${k} equal groups needs ${total} divisible by ${k}${total % k === 0 ? `: each group must sum to ${target}` : ` — it is not`}.`,
    logic: 'This divisibility test and "no number exceeds the target" rule out most impossible inputs before any search.', tone: total % k === 0 ? 'info' : 'warn', java: J.chk, py: P.chk, algo: 0,
    tag: 'ARITHMETIC —', note: total % k === 0 ? `${total} / ${k} = ${target} per bucket` : `${total} % ${k} = ${total % k} ≠ 0`,
  });
  if (total % k !== 0) {
    say({ title: 'Done', desc: `${total} is not a multiple of ${k}, so equal sums are impossible.`, logic: 'Nothing to search.', tone: 'warn', java: J.chk, py: P.chk, algo: 0, tag: '❌ Impossible!', note: `${total} % ${k} ≠ 0 → return false`, alert: `${total} is not divisible by ${k}: equal groups cannot exist.`, result: { title: 'false', text: 'Cannot partition' } });
    return steps;
  }

  dp[0] = 0;
  cur = 0;
  say({
    title: 'State = which numbers are used', desc: `dp[mask] = how much sits in the bucket currently being filled once exactly the numbers in mask are placed (always the mask sum mod ${target}); “·” means that mask cannot be built. Bit i of the mask stands for nums[i].`,
    logic: 'Filling buckets one after another means only the partial fill of the current bucket matters, not the earlier buckets’ contents.', java: J.def, py: P.def, algo: 1,
    tag: 'STATE —', note: `dp[0] = 0, ${1 << n} masks, others unreachable`,
  });

  for (let mask = 0; mask < 1 << n; mask++) {
    if (dp[mask] < 0) continue;
    cur = mask;
    fresh = [];
    notes = [];
    const opts: string[] = [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      const fill = dp[mask] + nums[i];
      if (fill > target) {
        opts.push(`${nums[i]}: ${dp[mask]}+${nums[i]} > ${target}, no`);
        continue;
      }
      const nm = mask | (1 << i);
      dp[nm] = fill % target;
      fresh.push(nm);
      opts.push(`${nums[i]}: → ${bin(nm, n)} = ${dp[nm]}${fill === target ? ' (bucket full)' : ''}`);
    }
    notes = opts;
    if (mask === (1 << n) - 1) {
      finished = true;
      break;
    }
    say({
      title: `Expand mask ${bin(mask, n)}`, desc: `Bucket holds ${dp[mask]}. Try each unused number: ${opts.join('; ') || 'none left'}.`,
      logic: 'A number is added only if it fits in the bucket; a bucket that reaches the target is closed and the next one starts empty (fill % target).', tone: fresh.length ? 'info' : 'warn', java: J.tr, py: P.tr, algo: 2,
      tag: fresh.length ? 'EXPAND MASK —' : 'DEAD END —', note: `mask ${bin(mask, n)}: bucket = ${dp[mask]}, ${fresh.length} number${fresh.length === 1 ? '' : 's'} fit`,
      ...(fresh.length ? {} : { alert: `Mask ${bin(mask, n)}: no unused number fits in the bucket (${dp[mask]} of ${target}).` }),
    });
  }

  const ok = dp[(1 << n) - 1] === 0;
  cur = (1 << n) - 1;
  finished = true;
  fresh = [];
  notes = [];
  say({
    title: 'Done', desc: ok ? `The full mask is reachable with a closed last bucket: ${k} groups of ${target} exist.` : 'The full mask can never be reached without overflowing a bucket, so no equal split exists.',
    logic: 'dp[all] = 0 means every number was placed and every bucket closed exactly at the target.', tone: ok ? 'success' : 'warn', java: J.ret, py: P.ret, algo: 4,
    tag: ok ? '✅ Done!' : '❌ No split!', note: `dp[${bin((1 << n) - 1, n)}] = ${dp[(1 << n) - 1]} → return ${ok}`,
    result: { title: String(ok), text: ok ? 'Can partition' : 'Cannot partition' },
  });
  return steps;
}

function parse(raw: string): In {
  const [a, b] = splitParts(raw, 2, 'numbers ; k — e.g. 1 5 2 4 3 3 ; 3');
  const nums = parseInts(a, { what: 'the numbers', example: '4 3 2 3', minLen: 1, maxLen: 6, lo: 1, hi: 9 });
  const k = Number(b);
  if (!Number.isInteger(k) || k < 1 || k > nums.length) throw new Error(`k must be a whole number from 1 to ${nums.length}`);
  return { nums, k };
}

export const partitionToKEqualSumSubsets: ProblemDef<In> = {
  slug: '698-partition-to-k-equal-sum-subsets',
  id: '698', title: 'Partition to K Equal Sum Subsets', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'bitmask DP',
  statement: 'Given an integer array and k, decide whether the array can be split into k non-empty groups whose sums are all equal; every element belongs to exactly one group.',
  constraints: '1 ≤ k ≤ nums.length ≤ 16, 1 ≤ nums[i] ≤ 10⁴ (animation input: ≤ 6 numbers, 1–9)',
  examples: [
    { label: '1 5 2 4 3 3 ; 3', input: { nums: [1, 5, 2, 4, 3, 3], k: 3 }, output: 'true' },
    { label: '1 2 3 4 ; 3', input: { nums: [1, 2, 3, 4], k: 3 }, output: 'false' },
    { label: '2 2 2 2 3 4 ; 3', input: { nums: [2, 2, 2, 2, 3, 4], k: 3 }, output: 'false' },
  ],
  inputPlaceholder: 'numbers ; k, e.g. 1 5 2 4 3 3 ; 3',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Mask being expanded / numbers in it', state: 'active' }, { label: 'Newly reached mask', state: 'compare' }, { label: 'Full mask', state: 'found' }, { label: 'Unreached', state: 'dim' }],
  varLabels: ['mask', 'dp[mask]', 'target'],
  emphasis: ['k groups', 'sums are all equal', 'exactly one group'],
  phases: [
    { icon: '➗', label: 'Target = sum / k', tone: 'blue' },
    { icon: '🧮', label: 'State = mask of used numbers', tone: 'blue' },
    { icon: '🪣', label: 'Expand: add a number that fits', tone: 'cyan' },
    { icon: '🔒', label: 'Close a full bucket (mod target)', tone: 'gold' },
    { icon: '✅', label: 'Done: full mask reachable?', tone: 'green' },
  ],
  approach: {
    title: 'Fill buckets one number at a time over subsets',
    text: 'The target per group is sum / k. dp[mask] is the amount sitting in the bucket currently being filled after placing the numbers in mask, or −1 if no valid order exists. From each reachable mask add any unused number that still fits; hitting the target closes the bucket (fill mod target). If the full mask is reachable, the split exists.',
  },
  java, python,
  algorithm: [
    'If sum % k ≠ 0, return false; target = sum / k',
    'dp[mask] = fill of the current bucket, −1 if unreachable; dp[0] = 0',
    'For each reachable mask, try every unused number that fits in the bucket',
    'Set dp[mask | bit] = (dp[mask] + num) % target',
    'The answer is whether the full mask is reachable',
  ],
  complexity: [{ label: 'Time', value: 'O(2ⁿ · n)' }, { label: 'Space', value: 'O(2ⁿ)' }],
  why: 'Placing numbers in an order that fills one bucket completely before opening the next covers every valid partition. After placing a set of numbers in such an order, the open bucket’s fill is forced to be the set’s sum modulo the target, so the mask alone determines the state — no need to remember which numbers share a bucket. A mask is reachable exactly when some number can be appended to a reachable smaller mask without overflowing the bucket, which is what the loop checks.',
};
