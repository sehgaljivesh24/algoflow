/**
 * Shared engine for the "minimise the largest group sum" family:
 * #1011 Capacity to Ship Packages, #410 Split Array Largest Sum,
 * GFG Allocate Minimum Pages, IB Painter's Partition Problem.
 * Binary search on the answer in [max(nums), sum(nums)] with a greedy feasibility check.
 */
import type { Cell, Step, Tone } from '../engine/types.ts';
import { parseInt1, parseNums, parseParts, TONES } from './ssbShared.ts';

export interface PartIn { nums: number[]; k: number }

export function parsePartition(raw: string, hint: string, kLo: number, kHi: number, kName: string, what: string, requireKAtMostN = false): PartIn {
  const [a, b] = parseParts(raw, 2, hint);
  const nums = parseNums(a, { maxLen: 10, lo: 1, hi: 99, what });
  const k = parseInt1(b, kLo, kHi, kName);
  if (requireKAtMostN && k > nums.length) throw new Error(`${kName} cannot be larger than the number of ${what} (${nums.length})`);
  return { nums, k };
}

/** Greedy packing: start a new group whenever the next item would exceed `cap`. */
export function greedy(nums: number[], cap: number) {
  const group: number[] = [];
  const sums: number[] = [0];
  for (const x of nums) {
    if (sums[sums.length - 1] + x > cap) sums.push(0);
    sums[sums.length - 1] += x;
    group.push(sums.length - 1);
  }
  return { group, sums };
}

export const minLargest = (nums: number[], k: number) => {
  let lo = Math.max(...nums);
  let hi = nums.reduce((a, b) => a + b, 0);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (greedy(nums, mid).sums.length <= k) hi = mid;
    else lo = mid + 1;
  }
  return lo;
};

interface Lines { init: number[]; mid: number[]; check: number[]; ok: number[]; bad: number[]; ret: number[] }

export interface PartCfg {
  itemName: string; // row head, e.g. "weight"
  groupName: string; // e.g. "day"
  groupTag: string; // e.g. "D"
  capName: string; // e.g. "capacity"
  kName: string; // e.g. "days"
  startDesc: string;
  resultText: (ans: number) => string;
  java: Lines;
  py: Lines;
  /** Pattern pages: the problem lists 5 algorithm steps / phases (bound, guess, test, narrow, done) so the final step lights chip 4. */
  fiveStep?: boolean;
}

export function buildPartition({ nums, k }: PartIn, cfg: PartCfg): Step[] {
  const steps: Step[] = [];
  const total = nums.reduce((a, b) => a + b, 0);
  let lo = Math.max(...nums);
  let hi = total;
  let need: number | string = '—';
  const cols = nums.map((_, i) => String(i));

  const grid = (cap?: number) => {
    const top: Cell[] = [];
    const bottom: Cell[] = [];
    if (cap === undefined) {
      nums.forEach((v, i) => { top.push({ key: i, value: v }); bottom.push({ key: i, value: '·', state: 'dim' }); });
    } else {
      const { group } = greedy(nums, cap);
      nums.forEach((v, i) => {
        const g = group[i];
        const bad = g >= k;
        const tone: Tone | undefined = bad ? undefined : TONES[g % TONES.length];
        top.push({ key: i, value: v, tone, state: bad ? 'error' : undefined });
        bottom.push({ key: i, value: `${cfg.groupTag}${g + 1}`, tone, state: bad ? 'error' : undefined });
      });
    }
    return { kind: 'grid' as const, rows: [top, bottom], rowHeads: [cfg.itemName, cfg.groupName], colHeads: cols };
  };
  const space = (mid?: number) => ({
    title: `Search space on the ${cfg.capName}`, kind: 'map' as const,
    items: [`lo → ${lo}`, ...(mid !== undefined ? [`mid → ${mid}`] : []), `hi → ${hi}`], highlight: mid !== undefined ? 1 : undefined,
  });
  const vars = (mid: number | string) => ({ lo, mid, hi, [`${cfg.groupName}s needed`]: need, [cfg.kName]: k });

  const plural = (n: number) => `${n} ${cfg.groupName}${n === 1 ? '' : 's'}`;

  steps.push({
    title: `Start: binary search the ${cfg.capName}`, desc: cfg.startDesc,
    scene: grid(), aux: [space()], vars: vars('—'),
    logic: `Smallest possible ${cfg.capName} = ${lo} (the biggest single item must fit somewhere). Largest useful = ${hi} (everything in one ${cfg.groupName}). The answer is somewhere in [${lo}, ${hi}].`, logicTone: 'info',
    javaLines: cfg.java.init, pyLines: cfg.py.init, algoStep: 0,
    tag: 'BOUND —', note: `lo = max = ${lo}, hi = sum = ${hi}`,
  });

  let iter = 0;
  while (lo < hi) {
    iter++;
    const mid = lo + Math.floor((hi - lo) / 2);
    need = '—';
    steps.push({
      title: `Try ${cfg.capName} mid = ${mid}`, desc: `Range [${lo}, ${hi}] → test mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}. Can the items fit in ${k} ${cfg.groupName}${k === 1 ? '' : 's'}?`,
      scene: grid(), aux: [space(mid)], vars: vars(mid),
      logic: `Question: can the items be split into at most ${k} ${cfg.groupName}${k === 1 ? '' : 's'} if no ${cfg.groupName} may exceed ${mid}?`, logicTone: 'info',
      javaLines: cfg.java.mid, pyLines: cfg.py.mid, algoStep: 1,
      tag: `ROUND ${iter} · GUESS —`, note: `mid = ${lo} + (${hi} − ${lo}) / 2 = ${mid}`,
    });
    const { sums } = greedy(nums, mid);
    need = sums.length;
    const ok = sums.length <= k;
    steps.push({
      title: `Feasibility check at ${mid}`,
      desc: `Greedy packing with limit ${mid} needs ${plural(sums.length)}: sums [${sums.join(', ')}]. ${sums.length} ${ok ? '≤' : '>'} ${k}, so ${mid} is ${ok ? 'feasible' : 'too small'}.`,
      scene: grid(mid), vars: vars(mid),
      aux: [
        space(mid),
        { title: `${cfg.groupName[0].toUpperCase()}${cfg.groupName.slice(1)} sums vs limit ${mid}`, kind: 'list', items: sums.map((s, i) => `${cfg.groupTag}${i + 1}: ${s}`), bad: sums.flatMap((_, i) => (i >= k ? [i] : [])) },
      ],
      alert: ok ? undefined : `${cfg.capName} ${mid} needs ${plural(sums.length)}, more than the allowed ${k}: too small.`,
      logic: ok ? `Feasible with ${sums.length} ≤ ${k}. A smaller ${cfg.capName} might work too, so keep mid and search lower.` : `Needs ${sums.length} > ${k} ${cfg.groupName}s (red cells overflow). Any limit ≤ ${mid} is worse, so move up.`, logicTone: ok ? 'success' : 'warn',
      javaLines: cfg.java.check, pyLines: cfg.py.check, algoStep: 2,
      tag: ok ? 'TEST · FEASIBLE —' : 'TEST · TOO SMALL —', note: `${sums.length} ${cfg.groupName}${sums.length === 1 ? '' : 's'} ${ok ? '≤' : '>'} ${k}${ok ? ' ✓' : ''}`,
    });
    if (ok) hi = mid;
    else lo = mid + 1;
    steps.push({
      title: ok ? `Feasible: hi = ${mid}` : `Too small: lo = ${mid + 1}`,
      desc: ok ? `${mid} works, so a smaller ${cfg.capName} may too: hi = ${mid}. Range is now [${lo}, ${hi}].` : `${mid} fails, so everything up to ${mid} is ruled out: lo = ${mid + 1}. Range is now [${lo}, ${hi}].`,
      scene: grid(), aux: [space()], vars: vars(mid),
      logic: 'The range of possible answers is cut roughly in half.', logicTone: ok ? 'info' : 'warn',
      javaLines: ok ? cfg.java.ok : cfg.java.bad, pyLines: ok ? cfg.py.ok : cfg.py.bad, algoStep: 3,
      tag: ok ? 'FEASIBLE → hi = mid —' : 'TOO SMALL → lo = mid + 1 —', note: ok ? `hi = mid = ${mid}` : `lo = mid + 1 = ${lo}`,
    });
  }

  need = greedy(nums, lo).sums.length;
  steps.push({
    title: `Answer = ${lo}`, desc: `lo = hi = ${lo}. Packing with limit ${lo} needs ${plural(need)} (limit ${k}), and ${lo - 1} was ruled out.`,
    scene: grid(lo), aux: [{ title: 'Final split', kind: 'list', items: greedy(nums, lo).sums.map((s, i) => `${cfg.groupTag}${i + 1}: ${s}`) }], vars: vars('—'),
    logic: `${lo} works, and anything smaller was proven infeasible, so it is the minimum.`, logicTone: 'success',
    javaLines: cfg.java.ret, pyLines: cfg.py.ret, algoStep: cfg.fiveStep ? 4 : 3,
    tag: '✅ Done!', note: `lo == hi → return ${lo}`,
    result: { title: String(lo), text: cfg.resultText(lo) },
  });
  return steps;
}
