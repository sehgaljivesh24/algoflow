/**
 * Shared engine for the two "count with a Fenwick tree over ranks" problems of pack p9 fragment b:
 * 315 Count of Smaller Numbers After Self (scan right to left) and Count Inversions (scan left to right).
 * Values are compressed to ranks 1..m, a Fenwick tree counts how many seen items have each rank.
 */
import type { Aux, Cell, CellState, Phase, Pointer, Step } from '../../engine/types.ts';
import { bitScene, lowbit } from './kitB.ts';

export type FenMode = 'smaller' | 'inversions';

/** Phase chips of both counting problems (one per `algorithm` entry; the last one is Done). */
export const fenCountPhases = (record: string): Phase[] => [
  { icon: '🗜️', label: 'Rank the values', tone: 'blue' },
  { icon: '👉', label: 'Take the next item', tone: 'cyan' },
  { icon: '🔍', label: 'Query a prefix', tone: 'gold' },
  { icon: '📝', label: record, tone: 'green' },
  { icon: '➕', label: 'Insert its rank', tone: 'cyan' },
  { icon: '✅', label: 'Done', tone: 'green' },
];

export function parseNumsList(raw: string, example: string): number[] {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (parts.length < 2 || nums.some((x) => !Number.isInteger(x))) throw new Error(`Enter at least 2 whole numbers, e.g. ${example}`);
  if (nums.length > 8) throw new Error('Use at most 8 numbers so the tree stays readable');
  if (nums.some((x) => x < -9 || x > 9)) throw new Error('Numbers must be between -9 and 9');
  return nums;
}

export function fenReference(nums: number[], mode: FenMode): string {
  const n = nums.length;
  if (mode === 'smaller') {
    return `[${nums.map((x, i) => nums.slice(i + 1).filter((y) => y < x).length).join(', ')}]`;
  }
  let c = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (nums[i] > nums[j]) c++;
  return String(c);
}

interface Ln { j: number[]; p: number[] }
export interface FenLines { start: Ln; pick: Ln; query: Ln; qNode: Ln; record: Ln; update: Ln; uNode: Ln; done: Ln }

export function fenCountSteps(nums: number[], mode: FenMode, L: FenLines): Step[] {
  const n = nums.length;
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const m = sorted.length;
  const rankOf = (x: number) => sorted.indexOf(x) + 1;
  const tree = new Array<number>(m + 1).fill(0);
  const inserted = new Array<boolean>(n).fill(false);
  const order = mode === 'smaller' ? Array.from({ length: n }, (_, k) => n - 1 - k) : Array.from({ length: n }, (_, k) => k);
  const ans: number[] = new Array(n).fill(0);
  let total = 0;
  let cur = -1;
  let jShow: number | string = '—';
  let sumShow: number | string = '—';
  let rankShow: number | string = '—';
  let st: Record<number, CellState> = {};
  let jumps: { from: number; to: number; label?: string }[] = [];
  let path: number[] = [];
  let here: number | null = null;
  let pieces: string[] = [];
  const steps: Step[] = [];
  const seen = () => inserted.filter(Boolean).length;
  const recorded = new Array<boolean>(n).fill(false); // ans[i] is shown as soon as it is recorded, not only after its rank is inserted
  const outText = () => (mode === 'smaller' ? `[${ans.map((v, i) => (recorded[i] ? v : '?')).join(', ')}]` : String(total));

  const emit = (title: string, desc: string, logic: string, tone: Step['logicTone'], l: Ln, algo: number, tag: string, note: string, alert?: string) => {
    const cells: Cell[] = nums.map((v, i) => {
      const c: Cell = { key: i, value: v };
      if (i === cur) c.state = 'active';
      else if (inserted[i]) c.state = 'sorted';
      return c;
    });
    const ptrs: Pointer[] = cur >= 0 ? [{ id: 'cur', label: mode === 'smaller' ? 'i' : 'i', index: cur, tone: 'orange' }] : [];
    const aux: Aux[] = [{ title: 'rank → value', kind: 'list', items: sorted.map((v, k) => `${k + 1}→${v}`) }];
    if (pieces.length) aux.push({ title: 'tree nodes added in this query', kind: 'list', items: [...pieces] });
    steps.push({
      title, desc, logic, logicTone: tone, javaLines: l.j, pyLines: l.p, algoStep: algo, tag, note, alert,
      scene: bitScene(m, tree, (i) => String(tree[i]), st, path, jumps, { kind: 'array', cells, pointers: ptrs }, here),
      aux,
      vars: { i: cur >= 0 ? `${cur} (value ${nums[cur]})` : '—', rank: rankShow, j: jShow, sum: sumShow, [mode === 'smaller' ? 'counts' : 'inversions']: outText() },
    });
  };
  const rng = (j: number) => (lowbit(j) === 1 ? `[${j}]` : `[${j - lowbit(j) + 1}..${j}]`);

  emit('Start',
    `Compress the values to ranks: ${sorted.map((v, k) => `${v}→${k + 1}`).join(', ')}. The Fenwick tree has ${m} slot${m === 1 ? '' : 's'}; slot r will count how many items with rank r have been seen. We scan ${mode === 'smaller' ? 'right to left' : 'left to right'}.`,
    'Ranks keep the tree small no matter how large or negative the values are, and they keep the order, which is all we compare.', 'info', L.start, 0,
    'SETUP —', `m = ${m} distinct values, tree = new int[${m + 1}] (all 0)`);

  for (const idx of order) {
    cur = idx;
    const x = nums[idx];
    const r = rankOf(x);
    rankShow = r;
    st = {}; jumps = []; path = []; here = null; pieces = []; jShow = '—'; sumShow = '—';
    emit(`Take nums[${idx}] = ${x}`, `Its rank is ${r}. ${seen()} item${seen() === 1 ? ' has' : 's have'} been inserted so far.`, 'Each item is first asked a question about earlier ones, and only then inserted, so it never counts itself.', 'info', L.pick, 1,
      'TAKE —', `i=${idx}: rank = ${r}; ${seen()} item${seen() === 1 ? '' : 's'} inserted so far`);

    const q = mode === 'smaller' ? r - 1 : r;
    let s = 0;
    let j = q;
    if (j === 0) {
      sumShow = 0;
      emit(`prefix(${q}) = 0`, `Rank ${r} is the smallest value, so no inserted item has a smaller rank.`, 'An empty prefix sums to 0 without touching the tree.', 'info', L.query, 2,
        'QUERY —', `prefix(${q}) = 0, nothing to read`);
    }
    while (j > 0) {
      const next = j - lowbit(j);
      st = { ...st };
      st[j] = 'active';
      here = j;
      jShow = j;
      s += tree[j];
      sumShow = s;
      pieces.push(`tree[${j}]=${tree[j]}`);
      jumps = next > 0 ? [{ from: j, to: next, label: `-${lowbit(j)}` }] : [];
      emit(`Query: take tree[${j}] = ${tree[j]}`, `Slot ${j} (binary ${j.toString(2)}) covers ranks ${rng(j)}, so ${tree[j]} item${tree[j] === 1 ? '' : 's'} there. Running sum ${s}. ${next > 0 ? `Strip the lowest set bit: ${j} - ${lowbit(j)} = ${next}.` : 'Stripping the lowest bit leaves 0: done.'}`,
        'Each hop removes the lowest set bit, so a prefix is covered by at most log2(m)+1 slots.', 'info', L.qNode, 2,
        'QUERY —', `sum += tree[${j}] → ${s}; j = ${j} - ${lowbit(j)} = ${next}`);
      st[j] = 'compare';
      j = next;
    }
    jumps = []; here = null; jShow = '—';
    let gain: number;
    if (mode === 'smaller') {
      ans[idx] = s;
      recorded[idx] = true;
      gain = s;
      emit(`ans[${idx}] = ${s}`, `${s} already-inserted item${s === 1 ? ' is' : 's are'} strictly smaller than ${x} and lie to its right.`, 'Because we scan from the right, "inserted" means "to my right".', 'success', L.record, 3,
        'RECORD —', `ans[${idx}] = prefix(${r - 1}) = ${s}`);
    } else {
      gain = seen() - s;
      total += gain;
      emit(`+${gain} inversion${gain === 1 ? '' : 's'}`, `${seen()} earlier item${seen() === 1 ? '' : 's'} minus ${s} that are <= ${x} leaves ${gain} strictly greater earlier item${gain === 1 ? '' : 's'}. Total inversions: ${total}.`, 'An inversion is an earlier, larger item; "all earlier minus not-larger" counts them.', gain > 0 ? 'warn' : 'info', L.record, 3,
        'COUNT —', `inversions += ${seen()} - ${s} = ${gain} → ${total}`,
        gain > 0 ? `${gain} earlier item${gain === 1 ? ' is' : 's are'} larger than ${x}: ${gain} inversion${gain === 1 ? '' : 's'} found` : undefined);
    }

    st = {}; pieces = [];
    emit(`Insert rank ${r}`, `Add 1 at slot ${r} and every slot that covers it: repeatedly add the lowest set bit.`, 'The update path visits every tree node whose range contains this rank.', 'info', L.update, 4,
      'INSERT —', `add(${r}, 1): slots ${(() => { const c: number[] = []; for (let u2 = r; u2 <= m; u2 += lowbit(u2)) c.push(u2); return c.join(' → '); })()}`);
    let u = r;
    const chain: number[] = [];
    while (u <= m) { chain.push(u); u += lowbit(u); }
    for (let k = 0; k < chain.length; k++) {
      const node = chain[k];
      tree[node] += 1;
      here = node;
      jShow = node;
      st = { ...st };
      st[node] = 'active';
      path = chain.slice(0, k + 1).reverse();
      emit(`tree[${node}] += 1 → ${tree[node]}`, `Slot ${node} covers ranks ${rng(node)}, which include ${r}, so it grows by one. ${k + 1 < chain.length ? `Next: ${node} + ${lowbit(node)} = ${chain[k + 1]}.` : `${node} + ${lowbit(node)} = ${node + lowbit(node)} is past ${m}: stop.`}`,
        'The parent in the picture is i + lowbit(i): exactly the next slot whose range also covers this rank.', 'info', L.uNode, 4,
        'INSERT —', `tree[${node}] += 1 → ${tree[node]}; next i = ${node} + ${lowbit(node)} = ${node + lowbit(node)}`);
      st[node] = 'found';
    }
    inserted[idx] = true;
    void gain;
  }
  cur = -1; here = null; path = []; jumps = []; st = {}; pieces = []; jShow = '—'; sumShow = '—'; rankShow = '—';
  emit('Done', mode === 'smaller' ? `Every item was counted against the smaller items to its right: ${outText()}.` : `Every pair (earlier larger, later smaller) was counted exactly once: ${total} inversions.`,
    'Each item cost O(log m) for its query and O(log m) for its insert.', 'success', L.done, 5,
    '✅ Done!', mode === 'smaller' ? `return ${outText()}` : `return ${total}`);
  const last = steps[steps.length - 1];
  last.result = mode === 'smaller' ? { title: outText(), text: 'Smaller numbers after each element' } : { title: String(total), text: 'Number of inversions' };
  return steps;
}
