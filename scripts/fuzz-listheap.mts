/**
 * Fuzz test for the linked-list / design / heap animations.
 * Run:  node scripts/fuzz-listheap.mts      (exit code 0 = every random input matched its reference solution)
 *
 * For each problem we generate ~200 random valid inputs, run buildSteps, and compare the final step's `result`
 * (and, for list problems, the node order drawn in the last scene) with a plain reference implementation.
 */
import { removeDuplicatesSortedList } from '../src/problems/removeDuplicatesSortedList.ts';
import { linkedListCycle } from '../src/problems/linkedListCycle.ts';
import { middleOfLinkedList } from '../src/problems/middleOfLinkedList.ts';
import { removeNthFromEnd } from '../src/problems/removeNthFromEnd.ts';
import { copyListRandomPointer } from '../src/problems/copyListRandomPointer.ts';
import { addTwoNumbers } from '../src/problems/addTwoNumbers.ts';
import { happyNumber } from '../src/problems/happyNumber.ts';
import { reverseLinkedListII } from '../src/problems/reverseLinkedListII.ts';
import { palindromeLinkedList } from '../src/problems/palindromeLinkedList.ts';
import { reorderList } from '../src/problems/reorderList.ts';
import { mergeTwoSortedLists } from '../src/problems/mergeTwoSortedLists.ts';
import { mergeKSortedLists } from '../src/problems/mergeKSortedLists.ts';
import { reverseNodesInKGroup } from '../src/problems/reverseNodesInKGroup.ts';
import { linkedListCycleII } from '../src/problems/linkedListCycleII.ts';
import { lruCache } from '../src/problems/lruCache.ts';
import { lastStoneWeight } from '../src/problems/lastStoneWeight.ts';
import { kthLargestElement } from '../src/problems/kthLargestElement.ts';
import { topKFrequentElements } from '../src/problems/topKFrequentElements.ts';
import { kClosestPoints } from '../src/problems/kClosestPoints.ts';
import { taskScheduler } from '../src/problems/taskScheduler.ts';
import { findMedianFromDataStream } from '../src/problems/findMedianFromDataStream.ts';

let seed = 12345;
const rnd = (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1));
const arr = (len: number, lo: number, hi: number): number[] => Array.from({ length: len }, () => int(lo, hi));
const sortedArr = (len: number, lo: number, hi: number): number[] => arr(len, lo, hi).sort((a, b) => a - b);
const arrow = (xs: (number | string)[]): string => (xs.length ? xs.join(' → ') : '(empty)');

let failures = 0;
let total = 0;

type Step = any;
const last = (steps: Step[]): Step => steps[steps.length - 1];

/** Values along the final list scene, starting from the node nothing points to (dummy 'D' skipped). */
function sceneChain(step: Step): (number | string)[] {
  const nodes: { key: number; value: number | string; next: number | null }[] = step.scene.nodes;
  const incoming = new Set(nodes.map((n) => n.next).filter((x) => x !== null));
  const heads = nodes.filter((n) => !incoming.has(n.key));
  if (heads.length !== 1) throw new Error(`final scene has ${heads.length} list heads`);
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const out: (number | string)[] = [];
  const seen = new Set<number>();
  let c: any = heads[0];
  while (c && !seen.has(c.key)) {
    seen.add(c.key);
    if (c.value !== 'D') out.push(c.value);
    c = c.next === null ? null : byKey.get(c.next);
  }
  if (seen.size !== nodes.length) throw new Error('final scene has nodes not on the list');
  return out;
}

function fuzz<I>(name: string, p: { buildSteps: (i: I) => Step[] }, gen: () => I, verify: (input: I, steps: Step[]) => string | null, count = 200): void {
  let bad = 0;
  for (let t = 0; t < count; t++) {
    const input = gen();
    total++;
    try {
      const steps = p.buildSteps(input);
      if (steps.length > 400) throw new Error(`too many steps: ${steps.length}`);
      if (!last(steps).result) throw new Error('final step has no result');
      const err = verify(input, steps);
      if (err) throw new Error(err);
    } catch (e) {
      bad++;
      failures++;
      if (bad <= 3) console.log(`FAIL ${name}: input=${JSON.stringify(input)}\n     ${String((e as Error).message)}`);
    }
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name} (${count - bad}/${count})`);
}

const eq = (got: string, want: string): string | null => (got === want ? null : `got "${got}" want "${want}"`);
const title = (steps: Step[]): string => last(steps).result.title;
/** result title and the drawn final list must both equal `want` (array of values). */
const listCheck = (steps: Step[], want: (number | string)[]): string | null =>
  eq(title(steps), arrow(want)) ?? eq(arrow(sceneChain(last(steps))), arrow(want));

// ---------------------------------------------------------------- linked lists
fuzz('83 remove duplicates', removeDuplicatesSortedList, () => ({ vals: sortedArr(int(1, 10), -3, 4) }),
  ({ vals }, s) => listCheck(s, [...new Set(vals)]));

fuzz('141 cycle', linkedListCycle, () => { const n = int(1, 10); return { vals: arr(n, -9, 9), pos: int(-1, n - 1) }; },
  ({ pos }, s) => eq(title(s), String(pos >= 0)));

fuzz('876 middle', middleOfLinkedList, () => ({ vals: arr(int(1, 11), -9, 9) }),
  ({ vals }, s) => eq(title(s), arrow(vals.slice(Math.floor(vals.length / 2)))));

fuzz('19 remove nth', removeNthFromEnd, () => { const vals = arr(int(1, 10), -9, 9); return { vals, n: int(1, vals.length) }; },
  ({ vals, n }, s) => { const w = [...vals]; w.splice(vals.length - n, 1); return listCheck(s, w); });

fuzz('138 copy random', copyListRandomPointer, () => {
  const n = int(1, 6);
  return { vals: arr(n, -9, 9), random: Array.from({ length: n }, () => (rnd() < 0.3 ? null : int(0, n - 1))) };
}, ({ vals, random }, s) => {
  const n = vals.length;
  const sc = last(s).scene;
  const copies = sc.nodes.filter((x: any) => x.key >= n);
  if (copies.length !== n) return `copy has ${copies.length} nodes, want ${n}`;
  for (let i = 0; i < n; i++) {
    const c = sc.nodes.find((x: any) => x.key === n + i);
    if (c.value !== vals[i]) return `copy ${i} value ${c.value}`;
    if (c.next !== (i + 1 < n ? n + i + 1 : null)) return `copy ${i} next ${c.next}`;
  }
  const rl: string[] = last(s).aux.find((a: any) => a.title.startsWith('copy random')).items;
  if (rl.length !== n) return `copy random panel has ${rl.length} items`;
  for (let i = 0; i < n; i++) {
    const m = /^\[(\d+)\] (-?\d+) ⇢ (\[(\d+)\]|null)$/.exec(rl[i]);
    if (!m || +m[1] !== i || +m[2] !== vals[i]) return `bad panel row ${rl[i]}`;
    const got = m[4] === undefined ? null : +m[4];
    if (got !== random[i]) return `copy ${i}.random = ${got}, want ${random[i]}`;
  }
  return null;
});

fuzz('2 add two numbers', addTwoNumbers, () => { const num = () => { const d = arr(int(1, 6), 0, 9); if (d.length > 1 && d[d.length - 1] === 0) d[d.length - 1] = int(1, 9); return d; }; return { a: num(), b: num() }; },
  ({ a, b }, s) => {
    const val = (d: number[]) => BigInt([...d].reverse().join(''));
    const sum = (val(a) + val(b)).toString().split('').reverse().map(Number);
    return listCheck(s, sum);
  });

fuzz('202 happy number', happyNumber, () => ({ n: int(1, 400) }),
  ({ n }, s) => {
    const f = (x: number) => String(x).split('').reduce((q, d) => q + Number(d) ** 2, 0);
    const seen = new Set<number>();
    let x = n;
    while (x !== 1 && !seen.has(x)) { seen.add(x); x = f(x); }
    return eq(title(s), String(x === 1));
  });

fuzz('92 reverse list II', reverseLinkedListII, () => {
  const vals = arr(int(1, 10), -9, 9);
  const left = int(1, vals.length);
  return { vals, left, right: int(left, vals.length) };
}, ({ vals, left, right }, s) => {
  const w = [...vals.slice(0, left - 1), ...vals.slice(left - 1, right).reverse(), ...vals.slice(right)];
  return listCheck(s, w);
});

fuzz('234 palindrome', palindromeLinkedList, () => {
  const half = arr(int(1, 5), 0, 3);
  const mid = rnd() < 0.5 ? [int(0, 3)] : [];
  const pal = [...half, ...mid, ...[...half].reverse()];
  if (rnd() < 0.5) return { vals: pal };
  if (rnd() < 0.5) { const q = [...pal]; q[int(0, q.length - 1)] = int(0, 3); return { vals: q }; }
  return { vals: arr(int(1, 10), 0, 3) };
}, ({ vals }, s) => eq(title(s), String(vals.every((v, i) => v === vals[vals.length - 1 - i]))));

fuzz('143 reorder list', reorderList, () => ({ vals: arr(int(1, 10), -9, 9) }),
  ({ vals }, s) => {
    const w: number[] = [];
    let i = 0;
    let j = vals.length - 1;
    while (i <= j) { w.push(vals[i++]); if (i <= j) w.push(vals[j--]); }
    return listCheck(s, w);
  });

fuzz('21 merge two lists', mergeTwoSortedLists, () => {
  const a = sortedArr(int(0, 6), -5, 5);
  const b = sortedArr(a.length ? int(0, 6) : int(1, 6), -5, 5);
  return { a, b };
}, ({ a, b }, s) => listCheck(s, [...a, ...b].sort((x, y) => x - y)));

fuzz('23 merge k lists', mergeKSortedLists, () => {
  for (;;) {
    const k = int(2, 4);
    const lists = Array.from({ length: k }, () => sortedArr(int(0, 4), -5, 5));
    const tot = lists.reduce((q, l) => q + l.length, 0);
    if (tot >= 1 && tot <= 12) return { lists };
  }
}, ({ lists }, s) => listCheck(s, lists.flat().sort((x, y) => x - y)));

fuzz('25 reverse k-group', reverseNodesInKGroup, () => { const vals = arr(int(1, 9), -9, 9); return { vals, k: int(1, vals.length) }; },
  ({ vals, k }, s) => {
    const w: number[] = [];
    for (let i = 0; i < vals.length; i += k) {
      const g = vals.slice(i, i + k);
      w.push(...(g.length === k ? g.reverse() : g));
    }
    return listCheck(s, w);
  });

fuzz('142 cycle II', linkedListCycleII, () => { const n = int(1, 10); return { vals: arr(n, -9, 9), pos: int(-1, n - 1) }; },
  ({ pos }, s) => eq(title(s), pos < 0 ? 'null' : `index ${pos}`));

// ---------------------------------------------------------------- design
fuzz('146 LRU cache', lruCache, () => {
  const cap = int(1, 4);
  const ops = Array.from({ length: int(1, 12) }, () => (rnd() < 0.5 ? { t: 'get' as const, k: int(0, 5) } : { t: 'put' as const, k: int(0, 5), v: int(0, 99) }));
  return { cap, ops };
}, ({ cap, ops }, s) => {
  const m = new Map<number, number>(); // insertion order = LRU first
  const outs: number[] = [];
  for (const op of ops) {
    if (op.t === 'get') {
      if (!m.has(op.k)) { outs.push(-1); continue; }
      const v = m.get(op.k)!;
      m.delete(op.k);
      m.set(op.k, v);
      outs.push(v);
    } else {
      if (m.has(op.k)) m.delete(op.k);
      else if (m.size === cap) m.delete(m.keys().next().value as number);
      m.set(op.k, op.v);
    }
  }
  const mru = [...m].reverse().map(([k, v]) => `${k}:${v}`);
  const want = outs.length ? outs.join(', ') : '(no get calls)';
  const e1 = eq(title(s), want);
  if (e1) return e1;
  const drawn = sceneChain(last(s)).filter((v) => v !== 'H' && v !== 'T').map(String);
  return eq(drawn.join(','), mru.join(',')) ?? eq(last(s).result.text, `Final cache (MRU → LRU): ${mru.length ? mru.join(', ') : 'empty'}`);
});

// ---------------------------------------------------------------- heaps
fuzz('1046 last stone weight', lastStoneWeight, () => ({ stones: arr(int(1, 8), 1, 99) }),
  ({ stones }, s) => {
    const a = [...stones];
    while (a.length > 1) {
      a.sort((x, y) => y - x);
      const y = a.shift()!;
      const x = a.shift()!;
      if (y !== x) a.push(y - x);
    }
    return eq(title(s), String(a.length ? a[0] : 0));
  });

fuzz('215 kth largest', kthLargestElement, () => { const nums = arr(int(1, 10), -9, 9); return { nums, k: int(1, nums.length) }; },
  ({ nums, k }, s) => eq(title(s), String([...nums].sort((a, b) => b - a)[k - 1])));

fuzz('347 top k frequent', topKFrequentElements, () => { const nums = arr(int(1, 10), 0, 5); return { nums, k: int(1, new Set(nums).size) }; },
  ({ nums, k }, s) => {
    const f = new Map<number, number>();
    for (const x of nums) f.set(x, (f.get(x) ?? 0) + 1);
    const got = (title(s).match(/-?\d+/g) ?? []).map(Number);
    if (got.length !== k || new Set(got).size !== k || got.some((g) => !f.has(g))) return `bad answer ${title(s)}`;
    const wantF = [...f.values()].sort((a, b) => b - a).slice(0, k).join(',');
    const gotF = got.map((g) => f.get(g)!).sort((a, b) => b - a).join(',');
    return eq(gotF, wantF);
  });

fuzz('973 k closest points', kClosestPoints, () => {
  const n = int(1, 8);
  return { points: Array.from({ length: n }, () => [int(-9, 9), int(-9, 9)] as [number, number]), k: int(1, n) };
}, ({ points, k }, s) => {
  const got = [...title(s).matchAll(/\[(-?\d+),(-?\d+)\]/g)].map((m) => [+m[1], +m[2]]);
  if (got.length !== k) return `got ${got.length} points, want ${k}`;
  const pool = points.map((p) => p.join(','));
  for (const g of got) { const i = pool.indexOf(g.join(',')); if (i < 0) return 'answer contains a point that is not in the input'; pool.splice(i, 1); }
  const d = (p: number[]) => p[0] * p[0] + p[1] * p[1];
  const want = points.map(d).sort((a, b) => a - b).slice(0, k).join(',');
  return eq(got.map(d).sort((a, b) => a - b).join(','), want);
});

fuzz('621 task scheduler', taskScheduler, () => ({
  tasks: Array.from({ length: int(1, 12) }, () => 'ABCDEF'[int(0, int(0, 5))]),
  n: int(0, 4),
}), ({ tasks, n }, s) => {
  const c = new Map<string, number>();
  for (const t of tasks) c.set(t, (c.get(t) ?? 0) + 1);
  const mx = Math.max(...c.values());
  const cm = [...c.values()].filter((v) => v === mx).length;
  return eq(title(s), String(Math.max(tasks.length, (mx - 1) * (n + 1) + cm)));
});

fuzz('295 find median', findMedianFromDataStream, () => ({ nums: arr(int(1, 8), -20, 20) }),
  ({ nums }, s) => {
    const meds: number[] = [];
    nums.forEach((_, i) => {
      const a = nums.slice(0, i + 1).sort((x, y) => x - y);
      const m = a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
      meds.push(m);
    });
    return eq(last(s).result.text, `Medians after each add: ${meds.join(', ')}`);
  });

console.log(`\n${total} random inputs, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
