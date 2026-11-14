import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';
import { annotateRules } from './annotate.ts';
import { emitter, listScene, parseOne, parts } from './listheapKit.ts';

type Op = { t: 'get'; k: number } | { t: 'put'; k: number; v: number };
interface In { cap: number; ops: Op[] }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'capacity ; ops — e.g. 2 ; put 1 1, put 2 2, get 1, put 3 3, get 2, get 3');
  const cap = parseOne(a, 1, 3, 'capacity');
  const ops: Op[] = b.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.split(/\s+/);
    const okNum = (x: string | undefined, hi: number) => x !== undefined && /^\d+$/.test(x) && +x <= hi;
    if (m[0] === 'get' && m.length === 2 && okNum(m[1], 9)) return { t: 'get' as const, k: +m[1] };
    if (m[0] === 'put' && m.length === 3 && okNum(m[1], 9) && okNum(m[2], 99)) return { t: 'put' as const, k: +m[1], v: +m[2] };
    throw new Error(`Bad operation "${s}". Use "get k" or "put k v" with key 0–9 and value 0–99, separated by commas`);
  });
  if (ops.length < 1 || ops.length > 12) throw new Error('Give 1–12 operations');
  return { cap, ops };
}

function build({ cap, ops }: In): Step[] {
  const kv = new Map<number, { v: number; f: number }>();
  const buckets = new Map<number, number[]>(); // uses -> keys, oldest first
  let minFreq = 0;
  const outs: number[] = [];
  let label = '—';
  let hot: Record<number, CellState> = {};
  let hl: number | undefined;
  const steps: Step[] = [];

  const order = (): number[] => [...buckets.keys()].sort((x, y) => x - y).flatMap((f) => buckets.get(f)!);
  const text = (k: number) => `${k}:${kv.get(k)!.v} ×${kv.get(k)!.f}`;
  const emit = emitter(steps, () => {
    const ord = order();
    const vals: string[] = Array.from({ length: 10 }, (_, k) => (kv.has(k) ? text(k) : ''));
    const next: (number | null)[] = Array(10).fill(null);
    ord.forEach((k, i) => { next[k] = i + 1 < ord.length ? ord[i + 1] : null; });
    return {
      scene: listScene(vals, next, ord.length ? [{ id: 'ev', label: 'next evict', at: ord[0], tone: 'orange' }] : [], hot, ord),
      aux: [
        { title: 'key → value, uses', kind: 'map' as const, items: [...kv].map(([k, e]) => `${k} → ${e.v}, ×${e.f}`), highlight: hl },
        { title: 'buckets: uses → keys (oldest first)', kind: 'map' as const, items: [...buckets.keys()].sort((x, y) => x - y).map((f) => `×${f} → ${buckets.get(f)!.join(', ')}`) },
        { title: 'outputs of get', kind: 'list' as const, items: outs.map(String) },
      ],
      vars: { operation: label, size: `${kv.size}/${cap}`, 'min uses': kv.size ? minFreq : '—', outputs: outs.length ? outs.join(', ') : '—' },
    };
  });

  /** move key to the next frequency bucket; returns a description of what happened */
  const touch = (k: number): string => {
    const e = kv.get(k)!;
    const f = e.f;
    const b = buckets.get(f)!;
    b.splice(b.indexOf(k), 1);
    let note = '';
    if (b.length === 0) {
      buckets.delete(f);
      if (minFreq === f) { minFreq = f + 1; note = ` Bucket ×${f} is empty and was the minimum, so min uses becomes ${minFreq}.`; }
    }
    e.f = f + 1;
    if (!buckets.has(f + 1)) buckets.set(f + 1, []);
    buckets.get(f + 1)!.push(k);
    return `Key ${k} moves from bucket ×${f} to ×${f + 1}, at the newest end.${note}`;
  };

  emit('Start', `Capacity ${cap}. Every key remembers how many times it was used. Keys with equal use counts are ordered by recency, and the list below shows the eviction order: least used first, oldest first among ties.`,
    'A map finds entries in O(1); one ordered bucket per use count finds the victim (oldest key of the smallest count) in O(1).', 'info', [1, 2, 3, 4], [2, 3, 4, 5], 0);

  ops.forEach((op) => {
    label = op.t === 'get' ? `get ${op.k}` : `put ${op.k} ${op.v}`;
    hot = {};
    hl = undefined;
    const idx = (k: number) => [...kv.keys()].indexOf(k);
    if (op.t === 'get') {
      if (!kv.has(op.k)) {
        outs.push(-1);
        emit(`${label} → −1`, `Key ${op.k} is not cached: a miss. Nothing changes, and a miss does not count as a use.`, 'Only keys that exist can gain uses.', 'warn', [7], [14], 1);
        return;
      }
      hl = idx(op.k);
      hot = { [op.k]: 'compare' };
      emit(`${label}: hit ${text(op.k)}`, `The map finds key ${op.k} (value ${kv.get(op.k)!.v}, used ${kv.get(op.k)!.f}×).`, 'Using a key raises its use count, which changes its bucket.', 'info', [7, 8], [14, 15], 1);
      const d = touch(op.k);
      outs.push(kv.get(op.k)!.v);
      hot = { [op.k]: 'found' };
      emit(`Touch key ${op.k} → ${kv.get(op.k)!.v}`, d, 'Remove from the old bucket, append to the next one: two O(1) edits.', 'success', [9, 22, 23, 24, 25, 26, 27], [16, 6, 7, 8, 9, 10, 11, 12], 1);
      return;
    }
    if (kv.has(op.k)) {
      kv.get(op.k)!.v = op.v;
      hl = idx(op.k);
      hot = { [op.k]: 'active' };
      emit(`${label}: key exists`, `Key ${op.k} is cached, so only its value changes to ${op.v}. An update counts as a use.`, 'Updating is also a use for LFU.', 'info', [12], [18, 19], 2);
      const d = touch(op.k);
      hot = { [op.k]: 'found' };
      emit(`Touch key ${op.k}`, d, 'Use count rises by one; recency inside the new bucket is "newest".', 'success', [12, 22, 23, 24, 25, 26, 27], [20, 6, 7, 8, 9, 10, 11, 12], 2);
      return;
    }
    if (kv.size === cap) {
      const victim = buckets.get(minFreq)![0];
      hot = { [victim]: 'error' };
      hl = idx(victim);
      emit(`${label}: cache full`, `${kv.size} of ${plural(cap, 'slot')} ${verb(cap, 'is', 'are')} used. The victim is the oldest key in the lowest bucket ×${minFreq}: key ${victim}.`,
        'Smallest use count first; if several keys tie, the one used longest ago goes.', 'warn', [13, 14], [22, 23], 3);
      buckets.get(minFreq)!.shift();
      if (buckets.get(minFreq)!.length === 0) buckets.delete(minFreq);
      const gone = text(victim);
      kv.delete(victim);
      hot = {};
      hl = undefined;
      emit(`Evict ${gone}`, `Key ${victim} is removed from its bucket and from the map.`, 'Both structures forget the key.', 'warn', [15, 16], [24], 3);
    }
    kv.set(op.k, { v: op.v, f: 1 });
    if (!buckets.has(1)) buckets.set(1, []);
    buckets.get(1)!.push(op.k);
    minFreq = 1;
    hl = idx(op.k);
    hot = { [op.k]: 'active' };
    emit(`Insert ${text(op.k)}`, `A new key starts with one use, at the newest end of bucket ×1, so min uses is reset to 1.`, 'A brand-new key has the smallest possible count, so it will be the first victim among strangers.', 'success', [18, 19, 20], [25, 26, 27], 4);
  });

  hot = {};
  hl = undefined;
  label = 'done';
  const ord = order();
  emit('Done', `All ${ops.length} operations were processed. Outputs of get: ${outs.length ? outs.join(', ') : 'none'}.`, 'Every get and put touched a constant number of map and bucket entries.', 'success', [9], [16], 4,
    { title: outs.length ? outs.join(', ') : '(no get calls)', text: `Cache (next evict first): ${ord.length ? ord.map(text).join(', ') : 'empty'}` });
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'map = {}, buckets = {}, minFreq = 0' },
    { on: /^get (-?\d+) → −1$/, tag: '✗ MISS —', note: (m) => `map.get(${m[1]}) == null → return -1`, alert: (m) => `Cache miss: key ${m[1]} is not stored, so get returns -1 and counts as no use.`, algoStep: 1 },
    { on: /^get (-?\d+): hit/, tag: '✔ HIT —', note: (m) => `map.get(${m[1]}) → entry`, algoStep: 1 },
    { on: /^Touch key (-?\d+) → (-?\d+)$/, tag: 'TOUCH —', note: (m, s) => `uses++ (bucket f → f + 1); minFreq = ${s.vars['min uses']}; return ${m[2]}`, algoStep: 1 },
    { on: /^put (-?\d+) (-?\d+): key exists/, tag: 'UPDATE —', note: (m) => `map.get(${m[1]}).val = ${m[2]}`, algoStep: 2 },
    { on: /^Touch key (-?\d+)$/, tag: 'TOUCH —', note: (_m, s) => `uses++ (bucket f → f + 1); minFreq = ${s.vars['min uses']}`, algoStep: 2 },
    { on: /: cache full$/, tag: '⚠ FULL —', note: (_m, s) => `size == cap → victim = oldest key of bucket minFreq = ${s.vars['min uses']}`, alert: () => 'The cache is full: the least frequently used key (oldest among ties) must go first.', algoStep: 3 },
    { on: /^Evict /, tag: '🗑️ EVICT —', note: () => 'bucket(minFreq).removeFirst(); map.remove(key)', algoStep: 3 },
    { on: /^Insert /, tag: '🌱 INSERT —', note: () => 'bucket(1).add(key); minFreq = 1', algoStep: 4 },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `gets returned ${s.result?.title}`, algoStep: 5 },
  ]);
}

export const lfuCache: ProblemDef<In> = {
  slug: '460-lfu-cache',
  id: '460', title: 'LFU Cache', difficulty: 'Hard', category: 'Design', tag: 'hash map + frequency buckets of ordered lists',
  statement: 'Design a cache with fixed capacity supporting get(key) and put(key, value) in O(1). When it is full, evict the least frequently used key; if several keys share the lowest use count, evict the least recently used among them. Both get and put on an existing key count as a use.',
  constraints: '1 ≤ capacity ≤ 10⁴, up to 2 × 10⁵ calls (animation: capacity 1–3, up to 12 operations, keys 0–9, values 0–99)',
  examples: [
    { label: 'cap 2: put 1 1, put 2 2, get 1, put 3 3, get 2, get 3', input: { cap: 2, ops: [{ t: 'put', k: 1, v: 1 }, { t: 'put', k: 2, v: 2 }, { t: 'get', k: 1 }, { t: 'put', k: 3, v: 3 }, { t: 'get', k: 2 }, { t: 'get', k: 3 }] }, output: '1, -1, 3' },
    { label: 'cap 2: tie on frequency (LRU breaks it)', input: { cap: 2, ops: [{ t: 'put', k: 1, v: 10 }, { t: 'put', k: 2, v: 20 }, { t: 'get', k: 1 }, { t: 'get', k: 2 }, { t: 'put', k: 3, v: 30 }, { t: 'get', k: 1 }, { t: 'get', k: 3 }] }, output: '10, 20, -1, 30' },
    { label: 'cap 1: put 0 0, get 0, put 1 1, get 0, get 1', input: { cap: 1, ops: [{ t: 'put', k: 0, v: 0 }, { t: 'get', k: 0 }, { t: 'put', k: 1, v: 1 }, { t: 'get', k: 0 }, { t: 'get', k: 1 }] }, output: '0, -1, 1' },
  ],
  inputPlaceholder: 'capacity ; ops — e.g. 2 ; put 1 1, put 2 2, get 1, put 3 3, get 2, get 3',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Looked up', state: 'compare' }, { label: 'New / updated', state: 'active' }, { label: 'Just used', state: 'found' }, { label: 'About to be evicted', state: 'error' }],
  varLabels: ['operation', 'size', 'min uses', 'outputs'],
  emphasis: ['least frequently used', 'O(1)', 'evict'],
  phases: [
    { icon: '🚀', label: 'Map + use-count buckets', tone: 'blue' },
    { icon: '📖', label: 'get: bump the use count', tone: 'cyan' },
    { icon: '✏️', label: 'put existing: update + touch', tone: 'gold' },
    { icon: '🗑️', label: 'Evict oldest of min bucket', tone: 'orange' },
    { icon: '🌱', label: 'Insert into bucket ×1', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  vizCaption: 'node = key:value ×uses · left = next to be evicted',
  approach: {
    title: 'Map plus one ordered bucket per use count',
    text: 'Keep key → (value, uses) in a hash map and, for every use count, an insertion-ordered set of keys. A use moves the key from bucket f to f + 1. Remember the smallest non-empty count; the victim is the oldest key of that bucket.',
  },
  java: [
    'class LFUCache {',
    '    private final int cap;',
    '    private int minFreq = 0;',
    '    private final Map<Integer, int[]> kv = new HashMap<>(); // key -> {value, uses}',
    '    private final Map<Integer, LinkedHashSet<Integer>> buckets = new HashMap<>(); // uses -> keys, oldest first',
    '    public LFUCache(int capacity) { cap = capacity; }',
    '    public int get(int key) {',
    '        if (!kv.containsKey(key)) return -1;',
    '        touch(key);',
    '        return kv.get(key)[0];',
    '    }',
    '    public void put(int key, int value) {',
    '        if (kv.containsKey(key)) { kv.get(key)[0] = value; touch(key); return; }',
    '        if (kv.size() == cap) {',
    '            int victim = buckets.get(minFreq).iterator().next();',
    '            buckets.get(minFreq).remove(victim);',
    '            kv.remove(victim);',
    '        }',
    '        kv.put(key, new int[]{value, 1});',
    '        buckets.computeIfAbsent(1, f -> new LinkedHashSet<>()).add(key);',
    '        minFreq = 1;',
    '    }',
    '    private void touch(int key) {',
    '        int[] e = kv.get(key);',
    '        int f = e[1]++;',
    '        buckets.get(f).remove(key);',
    '        if (buckets.get(f).isEmpty() && minFreq == f) minFreq++;',
    '        buckets.computeIfAbsent(f + 1, g -> new LinkedHashSet<>()).add(key);',
    '    }',
    '}',
  ],
  python: [
    'from collections import defaultdict, OrderedDict',
    'class LFUCache:',
    '    def __init__(self, capacity):',
    '        self.cap, self.min_freq = capacity, 0',
    '        self.kv = {}                              # key -> [value, uses]',
    '        self.buckets = defaultdict(OrderedDict)   # uses -> keys, oldest first',
    '    def _touch(self, key):',
    '        f = self.kv[key][1]',
    '        del self.buckets[f][key]',
    '        if not self.buckets[f] and self.min_freq == f:',
    '            self.min_freq += 1',
    '        self.kv[key][1] = f + 1',
    '        self.buckets[f + 1][key] = None',
    '    def get(self, key):',
    '        if key not in self.kv: return -1',
    '        self._touch(key)',
    '        return self.kv[key][0]',
    '    def put(self, key, value):',
    '        if key in self.kv:',
    '            self.kv[key][0] = value',
    '            self._touch(key)',
    '            return',
    '        if len(self.kv) == self.cap:',
    '            victim, _ = self.buckets[self.min_freq].popitem(last=False)',
    '            del self.kv[victim]',
    '        self.kv[key] = [value, 1]',
    '        self.buckets[1][key] = None',
    '        self.min_freq = 1',
  ],
  algorithm: [
    'Keep a map key → (value, uses) and a bucket (ordered set) of keys for each use count, plus minFreq',
    'get: on a hit move the key from bucket f to f + 1 (bump minFreq if bucket f was the minimum and is now empty); on a miss return −1',
    'put on an existing key: update the value and touch it the same way',
    'put on a new key when full: evict the oldest key of bucket minFreq',
    'Insert the new key into bucket 1 and set minFreq = 1',
    'Every get and put cost O(1): a few map and bucket edits, no searching',
  ],
  complexity: [{ label: 'Time', value: 'O(1) per operation' }, { label: 'Space', value: 'O(capacity)' }],
  why: 'Eviction needs "smallest use count, then oldest". Bucketing keys by use count with insertion order inside each bucket puts that key at the front of the minimum bucket, so no search is needed. minFreq only changes in two ways: it moves up by one when the last key leaves the minimum bucket during a touch (the touched key is now in the next bucket), or it drops to 1 when a new key arrives. So it never has to be searched for either.',
};
