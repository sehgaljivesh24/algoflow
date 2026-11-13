import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { emitter, listScene } from './listheapKit.ts';

type Op = { t: 'inc' | 'dec'; k: string } | { t: 'max' | 'min' };
interface In { ops: Op[] }

function parse(raw: string): In {
  const counts = new Map<string, number>();
  const ops: Op[] = raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.split(/\s+/);
    const lower = m[0].toLowerCase();
    if ((lower === 'inc' || lower === 'dec') && m.length === 2 && /^[a-e]$/.test(m[1])) {
      const c = counts.get(m[1]) ?? 0;
      if (lower === 'dec' && c === 0) throw new Error(`Cannot "dec ${m[1]}": that key is not in the structure yet`);
      counts.set(m[1], c + (lower === 'inc' ? 1 : -1));
      return { t: lower, k: m[1] } as Op;
    }
    if (lower === 'getmax' && m.length === 1) return { t: 'max' };
    if (lower === 'getmin' && m.length === 1) return { t: 'min' };
    throw new Error(`Bad operation "${s}". Use "inc x", "dec x", "getMax" or "getMin" with keys a–e, separated by commas`);
  });
  if (ops.length < 1 || ops.length > 12) throw new Error('Give 1–12 operations');
  return { ops };
}

function build({ ops }: In): Step[] {
  // bucket ids: 0 = HEAD, 1 = TAIL, 2.. = real buckets
  const count: number[] = [0, 0];
  const keysOf: string[][] = [[], []];
  let chain: number[] = []; // real buckets, ascending count
  const where = new Map<string, number>();
  const outs: string[] = [];
  let label = '—';
  let hot: Record<number, CellState> = {};
  let hl: number | undefined;
  const steps: Step[] = [];

  const text = (id: number) => `×${count[id]}·${keysOf[id].join('')}`;
  const emit = emitter(steps, () => {
    const order = [0, ...chain, 1];
    const vals = count.map((_, id) => (id === 0 ? 'HEAD' : id === 1 ? 'TAIL' : text(id)));
    const next: (number | null)[] = count.map(() => null);
    order.forEach((id, i) => { next[id] = i + 1 < order.length ? order[i + 1] : null; });
    return {
      scene: listScene(vals, next, chain.length ? [{ id: 'min', label: 'min', at: chain[0], tone: 'purple' }, { id: 'max', label: 'max', at: chain[chain.length - 1], tone: 'green' }] : [], { 0: 'dim', 1: 'dim', ...hot }, order),
      aux: [
        { title: 'map: key → bucket (count)', kind: 'map' as const, items: [...where].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, id]) => `${k} → ×${count[id]}`), highlight: hl },
        { title: 'outputs of getMax / getMin', kind: 'list' as const, items: outs.map((o) => (o === '' ? '""' : o)) },
      ],
      vars: { operation: label, buckets: chain.length, keys: where.size, outputs: outs.length ? outs.map((o) => (o === '' ? '""' : o)).join(', ') : '—' },
    };
  });
  const newBucket = (c: number, afterId: number) => {
    count.push(c);
    keysOf.push([]);
    const id = count.length - 1;
    const at = afterId === 0 ? 0 : chain.indexOf(afterId) + 1;
    chain.splice(at, 0, id);
    return id;
  };
  const removeKey = (b: number, k: string) => {
    keysOf[b].splice(keysOf[b].indexOf(k), 1);
    if (keysOf[b].length === 0) chain = chain.filter((x) => x !== b);
  };
  const mapIdx = (k: string) => [...where.keys()].sort().indexOf(k);

  emit('Start', 'Keys have counts. Buckets group the keys that share a count and form a doubly linked list sorted by count (HEAD … TAIL); a map says which bucket holds each key.',
    'inc/dec only ever move a key to the neighbouring bucket (count ± 1), and the min / max keys sit at the two ends of the list.', 'info', [5, 6, 7], [6, 7, 8], 0);

  ops.forEach((op) => {
    hot = {};
    hl = undefined;
    if (!('k' in op)) {
      label = op.t === 'max' ? 'getMaxKey' : 'getMinKey';
      const b = op.t === 'max' ? chain[chain.length - 1] : chain[0];
      const out = b === undefined ? '' : keysOf[b][0];
      outs.push(out);
      hot = b === undefined ? {} : { [b]: 'found' };
      emit(`${label}() → ${out === '' ? '""' : out}`, b === undefined ? 'The list is empty, so the answer is the empty string.' : `The ${op.t === 'max' ? 'last bucket before TAIL' : 'first bucket after HEAD'} is ${text(b)}; any key in it is valid, we return ${out}.`,
        'No search: the ends of the sorted bucket list are the extremes.', 'success', op.t === 'max' ? [29] : [30], op.t === 'max' ? [40, 41] : [42, 43], 4);
      return;
    }
    const k = op.k;
    label = `${op.t} ${k}`;
    const cur = where.get(k);
    if (op.t === 'inc') {
      const c = cur === undefined ? 0 : count[cur];
      hl = cur === undefined ? undefined : mapIdx(k);
      hot = cur === undefined ? {} : { [cur]: 'compare' };
      emit(`${label}: ${cur === undefined ? 'new key' : `currently ×${c}`}`, cur === undefined ? `Key ${k} is not stored yet: its count is 0, so it belongs in a bucket for count 1 right after HEAD.` : `The map says ${k} lives in bucket ${text(cur)}. It must move to count ${c + 1}.`,
        'Only the neighbouring bucket matters, because counts change by exactly 1.', 'info', [9, 10, 11], [20, 21, 22], 1);
      const base = cur === undefined ? 0 : cur;
      const nb = base === 0 ? chain[0] : chain[chain.indexOf(base) + 1];
      let after: number;
      if (nb !== undefined && count[nb] === c + 1) {
        after = nb;
        hot = { [after]: 'active' };
        emit(`Bucket ×${c + 1} already exists`, `The next bucket has count ${c + 1}, so we reuse it.`, 'Reusing the bucket keeps equal counts together.', 'info', [12, 13], [23, 24], 1);
      } else {
        after = newBucket(c + 1, base);
        hot = { [after]: 'active' };
        emit(`Create bucket ×${c + 1}`, `No bucket for count ${c + 1} sits next to it, so a new empty bucket is linked in ${base === 0 ? 'right after HEAD' : `right after ×${c}`}.`, 'Splicing into a doubly linked list is a few pointer edits and keeps the list sorted.', 'warn', [13, 31, 32, 33, 34], [24, 25, 9, 10, 11, 12, 13, 14], 1);
      }
      keysOf[after].push(k);
      where.set(k, after);
      hl = mapIdx(k);
      hot = { [after]: 'found' };
      emit(`Move ${k} into ×${c + 1}`, `Add ${k} to bucket ×${c + 1} and point the map at it.`, 'The key now lives in its new bucket; the old copy is removed next.', 'success', [14, 15], [26, 27], 2);
      if (cur !== undefined) {
        const wasLast = keysOf[cur].length === 1;
        removeKey(cur, k);
        hot = { [after]: 'found' };
        emit(wasLast ? `Bucket ×${c} is empty: unlink it` : `Remove ${k} from ×${c}`, wasLast ? `${k} was the only key in ×${c}, so that bucket is removed from the list.` : `Other keys still have count ${c}, so the bucket stays.`,
          'Empty buckets are always removed, so min / max stay at the ends.', wasLast ? 'warn' : 'info', [16, 36, 37, 38], [28, 15, 16, 17, 18], 3);
      }
      return;
    }
    // dec
    const c = count[cur!];
    hl = mapIdx(k);
    hot = { [cur!]: 'compare' };
    emit(`${label}: currently ×${c}`, `The map says ${k} lives in bucket ${text(cur!)}. It moves to count ${c - 1}${c === 1 ? ', which means it is removed completely' : ''}.`,
      'Again only the neighbouring bucket (now on the left) matters.', 'info', [19], [30], 1);
    if (c === 1) {
      where.delete(k);
      hl = undefined;
      emit(`Forget ${k}`, `Count 0 means the key is gone: delete it from the map.`, 'No bucket exists for count 0.', 'warn', [20], [31, 32], 2);
    } else {
      const bi = chain.indexOf(cur!);
      const prev = bi > 0 ? chain[bi - 1] : undefined;
      let before: number;
      if (prev !== undefined && count[prev] === c - 1) {
        before = prev;
        hot = { [before]: 'active' };
        emit(`Bucket ×${c - 1} already exists`, `The previous bucket has count ${c - 1}, so we reuse it.`, 'Reusing the bucket keeps equal counts together.', 'info', [22, 23], [34, 35], 1);
      } else {
        before = newBucket(c - 1, prev === undefined ? 0 : prev);
        hot = { [before]: 'active' };
        emit(`Create bucket ×${c - 1}`, `No bucket for count ${c - 1} sits just before ×${c}, so a new empty bucket is linked in between.`, 'Splicing into a doubly linked list is a few pointer edits and keeps the list sorted.', 'warn', [23, 31, 32, 33, 34], [36, 9, 10, 11, 12, 13, 14], 1);
      }
      keysOf[before].push(k);
      where.set(k, before);
      hl = mapIdx(k);
      hot = { [before]: 'found' };
      emit(`Move ${k} into ×${c - 1}`, `Add ${k} to bucket ×${c - 1} and point the map at it.`, 'The key now lives in its new bucket; the old copy is removed next.', 'success', [24, 25], [37, 38], 2);
    }
    const wasLast = keysOf[cur!].length === 1;
    removeKey(cur!, k);
    hot = {};
    emit(wasLast ? `Bucket ×${c} is empty: unlink it` : `Remove ${k} from ×${c}`, wasLast ? `${k} was the only key in ×${c}, so that bucket is removed from the list.` : `Other keys still have count ${c}, so the bucket stays.`,
      'Empty buckets are always removed, so min / max stay at the ends.', wasLast ? 'warn' : 'info', [27, 36, 37, 38], [39, 15, 16, 17, 18], 3);
  });

  hot = {};
  hl = undefined;
  label = 'done';
  emit('Done', `All ${ops.length} operations were processed. getMax / getMin outputs: ${outs.length ? outs.map((o) => (o === '' ? '""' : o)).join(', ') : 'none'}.`,
    'Every operation touched at most a handful of nodes, whatever the number of keys.', 'success', [29], [41], 4,
    { title: outs.length ? outs.map((o) => (o === '' ? '""' : o)).join(', ') : '(no queries)', text: `Buckets (min → max): ${chain.length ? chain.map(text).join('  ') : 'empty'}` });
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'buckets = HEAD ⇄ TAIL, map = {}' },
    { on: /^(getMaxKey|getMinKey)\(\) → /, tag: '🔎 QUERY —', note: (m) => `${m[1]} reads the bucket next to ${m[1] === 'getMaxKey' ? 'TAIL' : 'HEAD'}`, algoStep: 4 },
    { on: /^(inc|dec) (\S+): (new key|currently ×(\d+))/, tag: (m) => (m[1] === 'inc' ? '➕ INC —' : '➖ DEC —'), note: (m) => `count(${m[2]}): ${m[3] === 'new key' ? 0 : m[4]} → ${m[1] === 'inc' ? Number(m[4] ?? 0) + 1 : Number(m[4]) - 1}`, algoStep: 1 },
    { on: /^Bucket ×(\d+) already exists/, tag: 'REUSE BUCKET —', note: (m) => `neighbour bucket ×${m[1]} exists → reuse it`, algoStep: 1 },
    { on: /^Create bucket ×(\d+)/, tag: 'NEW BUCKET —', note: (m) => `splice a new bucket ×${m[1]} into the list`, algoStep: 1 },
    { on: /^Move (\S+) into ×(\d+)/, tag: 'MOVE KEY —', note: (m) => `bucket ×${m[2]}.add(${m[1]}); map.put(${m[1]}, bucket)`, algoStep: 2 },
    { on: /^Forget (\S+)/, tag: 'FORGET —', note: (m) => `count 0 → map.remove(${m[1]})`, algoStep: 2 },
    { on: /^Bucket ×(\d+) is empty: unlink it/, tag: '🧹 UNLINK —', note: (m) => `bucket ×${m[1]} is empty → unlink it from the list`, algoStep: 3 },
    { on: /^Remove (\S+) from ×(\d+)/, tag: 'REMOVE OLD —', note: (m) => `bucket ×${m[2]}.remove(${m[1]})`, algoStep: 3 },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `queries returned ${s.result?.title}`, algoStep: 5 },
  ]);
}

export const allOneDataStructure: ProblemDef<In> = {
  slug: '432-all-o-1-data-structure',
  id: '432', title: 'All O(1) Data Structure', difficulty: 'Hard', category: 'Design', tag: 'hash map + linked list of count buckets',
  statement: 'Design a structure that stores string keys with counts and supports inc(key), dec(key) (removing the key when its count reaches 0), getMaxKey() and getMinKey() (any key with the largest / smallest count, or "" when empty) — every operation in O(1).',
  constraints: '1 ≤ key.length ≤ 10, up to 5 × 10⁴ calls, dec is only called on existing keys (animation: keys a–e, up to 12 operations)',
  examples: [
    { label: 'inc a, inc b, inc b, getMax, getMin', input: { ops: [{ t: 'inc', k: 'a' }, { t: 'inc', k: 'b' }, { t: 'inc', k: 'b' }, { t: 'max' }, { t: 'min' }] }, output: 'b, a' },
    { label: 'inc a, inc a, inc b, dec a, getMax, dec a, getMax', input: { ops: [{ t: 'inc', k: 'a' }, { t: 'inc', k: 'a' }, { t: 'inc', k: 'b' }, { t: 'dec', k: 'a' }, { t: 'max' }, { t: 'dec', k: 'a' }, { t: 'max' }] }, output: 'a or b, b' },
    { label: 'getMax, inc c, getMin, dec c, getMin', input: { ops: [{ t: 'max' }, { t: 'inc', k: 'c' }, { t: 'min' }, { t: 'dec', k: 'c' }, { t: 'min' }] }, output: '"", c, ""' },
  ],
  inputPlaceholder: 'e.g. inc a, inc b, inc b, getMax, getMin, dec b, getMax',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Sentinel (HEAD / TAIL)', state: 'dim' }, { label: 'Bucket of the key', state: 'compare' }, { label: 'Target bucket', state: 'active' }, { label: 'Updated / answer', state: 'found' }],
  varLabels: ['operation', 'buckets', 'keys', 'outputs'],
  emphasis: ['O(1)', 'inc', 'dec', 'minimum', 'maximum'],
  phases: [
    { icon: '🚀', label: 'Bucket list + map', tone: 'blue' },
    { icon: '🔍', label: 'Neighbour bucket: reuse or create', tone: 'cyan' },
    { icon: '➡️', label: 'Move the key', tone: 'gold' },
    { icon: '🧹', label: 'Unlink empty bucket', tone: 'orange' },
    { icon: '🔎', label: 'getMax / getMin', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  vizCaption: 'bucket = ×count·keys, sorted by count; min at the left end, max at the right end',
  approach: {
    title: 'Sorted list of count buckets',
    text: 'Group keys by count into buckets kept in a doubly linked list sorted by count, and map every key to its bucket. inc and dec move a key into the neighbouring bucket (creating it if needed, deleting the old one if it empties); the extremes are the buckets next to the sentinels.',
  },
  java: [
    'class AllOne {',
    '    private static class Bucket {',
    '        int count; Set<String> keys = new LinkedHashSet<>(); Bucket prev, next;',
    '        Bucket(int c) { count = c; }',
    '    }',
    '    private final Bucket head = new Bucket(0), tail = new Bucket(0);',
    '    private final Map<String, Bucket> where = new HashMap<>();',
    '    public AllOne() { head.next = tail; tail.prev = head; }',
    '    public void inc(String key) {',
    '        Bucket cur = where.get(key);',
    '        int c = cur == null ? 0 : cur.count;',
    '        Bucket base = cur == null ? head : cur;',
    '        Bucket after = base.next;',
    '        if (after == tail || after.count != c + 1) after = insertAfter(base, c + 1);',
    '        after.keys.add(key);',
    '        where.put(key, after);',
    '        if (cur != null) drop(cur, key);',
    '    }',
    '    public void dec(String key) {',
    '        Bucket cur = where.get(key);',
    '        if (cur.count == 1) where.remove(key);',
    '        else {',
    '            Bucket before = cur.prev;',
    '            if (before == head || before.count != cur.count - 1) before = insertAfter(cur.prev, cur.count - 1);',
    '            before.keys.add(key);',
    '            where.put(key, before);',
    '        }',
    '        drop(cur, key);',
    '    }',
    '    public String getMaxKey() { return tail.prev == head ? "" : tail.prev.keys.iterator().next(); }',
    '    public String getMinKey() { return head.next == tail ? "" : head.next.keys.iterator().next(); }',
    '    private Bucket insertAfter(Bucket p, int c) {',
    '        Bucket b = new Bucket(c);',
    '        b.prev = p; b.next = p.next; p.next.prev = b; p.next = b;',
    '        return b;',
    '    }',
    '    private void drop(Bucket b, String key) {',
    '        b.keys.remove(key);',
    '        if (b.keys.isEmpty()) { b.prev.next = b.next; b.next.prev = b.prev; }',
    '    }',
    '}',
  ],
  python: [
    'class Bucket:',
    '    def __init__(self, c):',
    '        self.count, self.keys = c, {}        # dict used as an ordered set',
    '        self.prev = self.next = None',
    'class AllOne:',
    '    def __init__(self):',
    '        self.head, self.tail = Bucket(0), Bucket(0)',
    '        self.head.next, self.tail.prev = self.tail, self.head',
    '        self.where = {}',
    '    def _insert_after(self, p, c):',
    '        b = Bucket(c)',
    '        b.prev, b.next = p, p.next',
    '        p.next.prev = b',
    '        p.next = b',
    '        return b',
    '    def _drop(self, b, key):',
    '        del b.keys[key]',
    '        if not b.keys:',
    '            b.prev.next, b.next.prev = b.next, b.prev',
    '    def inc(self, key):',
    '        cur = self.where.get(key)',
    '        c = cur.count if cur else 0',
    '        base = cur or self.head',
    '        after = base.next',
    '        if after is self.tail or after.count != c + 1:',
    '            after = self._insert_after(base, c + 1)',
    '        after.keys[key] = None',
    '        self.where[key] = after',
    '        if cur: self._drop(cur, key)',
    '    def dec(self, key):',
    '        cur = self.where[key]',
    '        if cur.count == 1:',
    '            del self.where[key]',
    '        else:',
    '            before = cur.prev',
    '            if before is self.head or before.count != cur.count - 1:',
    '                before = self._insert_after(cur.prev, cur.count - 1)',
    '            before.keys[key] = None',
    '            self.where[key] = before',
    '        self._drop(cur, key)',
    '    def get_max_key(self):',
    '        return "" if self.tail.prev is self.head else next(iter(self.tail.prev.keys))',
    '    def get_min_key(self):',
    '        return "" if self.head.next is self.tail else next(iter(self.head.next.keys))',
  ],
  algorithm: [
    'Keep a doubly linked list of buckets sorted by count (between HEAD and TAIL) and a map key → bucket',
    'inc / dec: look at the neighbouring bucket for count ± 1; reuse it or splice in a new one',
    'Add the key to that bucket and update the map (dec to 0 removes the key)',
    'If the old bucket is now empty, unlink it from the list',
    'getMaxKey / getMinKey read a key from the bucket next to TAIL / HEAD',
    'Every operation cost O(1): neighbouring buckets are adjacent, so nothing is ever searched',
  ],
  complexity: [{ label: 'Time', value: 'O(1) per operation' }, { label: 'Space', value: 'O(number of keys)' }],
  why: 'Because every update changes a count by exactly one, the destination bucket is always adjacent to the current one, so no search or sorting is ever needed. Keeping the bucket list sorted and free of empty buckets makes the first and last bucket the true minimum and maximum. The doubly linked list is needed so a bucket can be spliced in or removed from the middle in constant time.',
};
