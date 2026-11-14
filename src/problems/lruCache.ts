import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { annotateRules } from './annotate.ts';
import { emitter, listScene, parseOne, parts } from './listheapKit.ts';

type Op = { t: 'get'; k: number } | { t: 'put'; k: number; v: number };
interface In { cap: number; ops: Op[] }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'capacity ; ops — e.g. 2 ; put 1 1, put 2 2, get 1, put 3 3, get 2');
  const cap = parseOne(a, 1, 4, 'capacity');
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
  // node ids: 0 = HEAD sentinel, 1 = TAIL sentinel, 2.. = real nodes
  const vals: string[] = ['H', 'T'];
  const info: { k: number; v: number }[] = [{ k: -1, v: -1 }, { k: -1, v: -1 }];
  let list: number[] = []; // real node ids, most recently used first
  const map = new Map<number, number>(); // key -> node id
  const outs: number[] = [];
  let label = '—';
  let hl: number | undefined;
  let hot: Record<number, CellState> = {};
  const steps: Step[] = [];
  const text = (id: number) => `${info[id].k}:${info[id].v}`;
  const emit = emitter(steps, () => {
    const chain = [0, ...list, 1];
    const next: (number | null)[] = vals.map(() => null);
    chain.forEach((id, i) => { next[id] = i + 1 < chain.length ? chain[i + 1] : null; });
    const ptrs = list.length
      ? [{ id: 'mru', label: 'MRU', at: list[0], tone: 'green' as const }, { id: 'lru', label: 'LRU', at: list[list.length - 1], tone: 'orange' as const }]
      : [];
    return {
      scene: listScene(vals, next, ptrs, { 0: 'dim', 1: 'dim', ...hot }, chain),
      aux: [
        { title: 'hash map: key → node', kind: 'map' as const, items: [...map].map(([k, id]) => `${k} → ${text(id)}`), highlight: hl },
        { title: 'outputs of get', kind: 'list' as const, items: outs.map(String) },
      ],
      vars: { operation: label, size: `${list.length}/${cap}`, outputs: outs.length ? outs.join(', ') : '—' },
    };
  });
  const mapIndex = (k: number) => [...map.keys()].indexOf(k);
  const create = (k: number, v: number) => { vals.push(`${k}:${v}`); info.push({ k, v }); return vals.length - 1; };

  emit('Start', `Capacity ${cap}. The cache is a doubly linked list (HEAD ⇄ … ⇄ TAIL) kept in recency order, plus a hash map from key to node.`,
    'The map gives O(1) lookup; the list gives O(1) "move to front" and "remove the oldest". Left = most recently used, right = least recently used.', 'info', [5, 6, 7], [5, 6, 7, 8], 0);

  ops.forEach((op) => {
    label = op.t === 'get' ? `get ${op.k}` : `put ${op.k} ${op.v}`;
    hot = {};
    if (op.t === 'get') {
      const id = map.get(op.k);
      if (id === undefined) {
        hl = undefined;
        outs.push(-1);
        emit(`${label} → −1`, `Key ${op.k} is not in the map: a cache miss. Return −1; the order does not change.`, 'A miss costs one O(1) map lookup and touches no list node.', 'warn', [10, 11], [15, 16], 1);
        return;
      }
      hl = mapIndex(op.k);
      hot = { [id]: 'compare' };
      emit(`${label}: found ${text(id)}`, `The map points straight at node ${text(id)}. Using it makes it the most recently used.`, 'The map finds the node instantly, without scanning the list.', 'info', [9, 10], [15, 16, 17], 1);
      list = [id, ...list.filter((x) => x !== id)];
      outs.push(info[id].v);
      hot = { [id]: 'found' };
      emit(`Move ${text(id)} to the front → ${info[id].v}`, `Unlink the node and re-insert it right after HEAD. Return ${info[id].v}.`, 'remove + addFront: both are pointer changes, so recency updates in O(1).', 'success', [12, 13], [18, 19], 1);
      return;
    }
    const id = map.get(op.k);
    if (id !== undefined) {
      info[id].v = op.v;
      vals[id] = text(id);
      hl = mapIndex(op.k);
      hot = { [id]: 'active' };
      emit(`${label}: key exists`, `Key ${op.k} is already cached, so only its value changes to ${op.v}.`, 'Updating a key counts as using it.', 'info', [16, 17], [21, 22], 2);
      list = [id, ...list.filter((x) => x !== id)];
      hot = { [id]: 'found' };
      emit(`Move ${text(id)} to the front`, 'Refresh its recency: unlink the node and re-insert it right after HEAD.', 'The most recently used item always sits next to HEAD.', 'success', [17], [23], 2);
      return;
    }
    if (list.length === cap) {
      const lru = list[list.length - 1];
      hl = mapIndex(info[lru].k);
      hot = { [lru]: 'error' };
      emit(`${label}: cache is full`, `${list.length} of ${cap} slots are used, so the least recently used node ${text(lru)} (next to TAIL) must go first.`, 'TAIL.prev is always the least recently used entry — no search needed.', 'warn', [18, 19], [24, 25], 2);
      map.delete(info[lru].k);
      list = list.slice(0, -1);
      hl = undefined;
      hot = {};
      emit(`Evict ${text(lru)}`, `Remove ${text(lru)} from the list and delete key ${info[lru].k} from the map.`, 'Both structures must forget the key, otherwise the map would hold a dangling node.', 'warn', [20], [26], 2);
    }
    const nid = create(op.k, op.v);
    map.set(op.k, nid);
    list = [nid, ...list];
    hl = mapIndex(op.k);
    hot = { [nid]: 'active' };
    emit(`Insert ${text(nid)} at the front`, `Create node ${text(nid)}, add key ${op.k} to the map and link the node right after HEAD.`, 'A new key is the most recently used one by definition.', 'success', [22, 23], [27, 28], 2);
  });

  hl = undefined;
  hot = {};
  label = 'done';
  emit('Done', `All ${ops.length} operations were processed. Outputs of get: ${outs.length ? outs.join(', ') : 'none'}.`, 'Every get and put took O(1) time.', 'success', [9], [15], 2,
    { title: outs.length ? outs.join(', ') : '(no get calls)', text: `Final cache (MRU → LRU): ${list.length ? list.map(text).join(', ') : 'empty'}` });
  return steps;
}

function annotated(input: Parameters<typeof build>[0]): Step[] {
  return annotateRules(build(input), [
    { on: 'first', tag: 'INIT —', note: 'map = {}, list = HEAD ⇄ TAIL' },
    { on: /^get (-?\d+) → −1$/, tag: '✗ MISS —', note: (m) => `map.get(${m[1]}) == null → return -1`, alert: (m) => `Cache miss: key ${m[1]} is not stored, so get returns -1.`, algoStep: 1 },
    { on: /^get (-?\d+): found/, tag: '✔ HIT —', note: (m) => `map.get(${m[1]}) → node (O(1) lookup)`, algoStep: 1 },
    { on: /^Move .* to the front → (-?\d+)$/, tag: 'MOVE TO FRONT —', note: (m) => `unlink(n); pushFront(n) → return ${m[1]}`, algoStep: 1 },
    { on: /^put (-?\d+) (-?\d+): key exists/, tag: 'UPDATE —', note: (m) => `map.get(${m[1]}).val = ${m[2]}`, algoStep: 2 },
    { on: /^Move .* to the front$/, tag: 'MOVE TO FRONT —', note: () => 'unlink(n); pushFront(n)', algoStep: 2 },
    { on: /: cache is full$/, tag: '⚠ FULL —', note: () => 'map.size() == cap → evict the node before TAIL', alert: () => 'The cache is full: the least recently used entry (next to TAIL) must be evicted first.', algoStep: 3 },
    { on: /^Evict /, tag: '🗑️ EVICT LRU —', note: () => 'unlink(tail.prev); map.remove(old.key)', algoStep: 3 },
    { on: /^Insert .* at the front$/, tag: '🌱 INSERT —', note: () => 'map.put(key, n); pushFront(n)', algoStep: 3 },
    { on: 'last', tag: '✅ Done!', note: (_m, s) => `gets returned ${s.result?.title}`, algoStep: 4 },
  ]);
}

export const lruCache: ProblemDef<In> = {
  slug: '146-lru-cache',
  id: '146', title: 'LRU Cache', difficulty: 'Medium', category: 'Design', tag: 'hash map + doubly linked list',
  statement: 'Design a cache with a fixed capacity supporting get(key) and put(key, value) in O(1) time. get returns the value or −1 when the key is absent. When put would exceed the capacity, the least recently used key is evicted. Both get and put count as a use.',
  constraints: '1 ≤ capacity ≤ 3000, up to 2 × 10⁵ calls (animation input: capacity 1–4, up to 12 operations, keys 0–9, values 0–99)',
  examples: [
    { label: 'cap 2: put 1 1, put 2 2, get 1, put 3 3, get 2', input: { cap: 2, ops: [{ t: 'put', k: 1, v: 1 }, { t: 'put', k: 2, v: 2 }, { t: 'get', k: 1 }, { t: 'put', k: 3, v: 3 }, { t: 'get', k: 2 }] }, output: '1, -1' },
    { label: 'cap 2: put 2 1, put 2 2, get 2, put 1 1, put 4 1, get 2', input: { cap: 2, ops: [{ t: 'put', k: 2, v: 1 }, { t: 'put', k: 2, v: 2 }, { t: 'get', k: 2 }, { t: 'put', k: 1, v: 1 }, { t: 'put', k: 4, v: 1 }, { t: 'get', k: 2 }] }, output: '2, -1' },
    { label: 'cap 1: put 1 5, put 2 6, get 1, get 2', input: { cap: 1, ops: [{ t: 'put', k: 1, v: 5 }, { t: 'put', k: 2, v: 6 }, { t: 'get', k: 1 }, { t: 'get', k: 2 }] }, output: '-1, 6' },
  ],
  inputPlaceholder: 'capacity ; ops — e.g. 2 ; put 1 1, put 2 2, get 1, put 3 3, get 2',
  parseInput: parse, buildSteps: annotated, viz: 'cells',
  legend: [{ label: 'Sentinel (HEAD / TAIL)', state: 'dim' }, { label: 'Looked up', state: 'compare' }, { label: 'New / updated', state: 'active' }, { label: 'Just used', state: 'found' }, { label: 'About to be evicted', state: 'error' }],
  varLabels: ['operation', 'size', 'outputs'],
  emphasis: ['least recently used', 'O(1)', 'capacity'],
  phases: [
    { icon: '🚀', label: 'Map + doubly linked list', tone: 'blue' },
    { icon: '📖', label: 'get: hit → front, miss → −1', tone: 'cyan' },
    { icon: '✏️', label: 'put: update existing key', tone: 'gold' },
    { icon: '🗑️', label: 'put new: evict LRU, insert', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Hash map + doubly linked list',
    text: 'The map finds a node by key in O(1). The doubly linked list orders nodes by recency: most recent next to HEAD, least recent next to TAIL. A use moves a node to the front; overflow removes the node before TAIL.',
  },
  java: [
    'class LRUCache {',
    '    class Node { int key, val; Node prev, next; Node() {} Node(int k, int v) { key = k; val = v; } }',
    '    private final Map<Integer, Node> map = new HashMap<>();',
    '    private final Node head = new Node(), tail = new Node();',
    '    private final int cap;',
    '    public LRUCache(int capacity) {',
    '        cap = capacity;',
    '        head.next = tail; tail.prev = head;',
    '    }',
    '    public int get(int key) {',
    '        Node n = map.get(key);',
    '        if (n == null) return -1;',
    '        remove(n); addFront(n);',
    '        return n.val;',
    '    }',
    '    public void put(int key, int value) {',
    '        Node n = map.get(key);',
    '        if (n != null) { n.val = value; remove(n); addFront(n); return; }',
    '        if (map.size() == cap) {',
    '            Node lru = tail.prev;',
    '            remove(lru); map.remove(lru.key);',
    '        }',
    '        n = new Node(key, value);',
    '        map.put(key, n); addFront(n);',
    '    }',
    '    private void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }',
    '    private void addFront(Node n) {',
    '        n.next = head.next; n.prev = head;',
    '        head.next.prev = n; head.next = n;',
    '    }',
    '}',
  ],
  python: [
    'class Node:',
    '    def __init__(self, k=0, v=0):',
    '        self.k, self.v = k, v',
    '        self.prev = self.next = None',
    'class LRUCache:',
    '    def __init__(self, capacity):',
    '        self.cap, self.map = capacity, {}',
    '        self.head, self.tail = Node(), Node()',
    '        self.head.next, self.tail.prev = self.tail, self.head',
    '    def _remove(self, n):',
    '        n.prev.next, n.next.prev = n.next, n.prev',
    '    def _add_front(self, n):',
    '        n.next, n.prev = self.head.next, self.head',
    '        self.head.next.prev = n',
    '        self.head.next = n',
    '    def get(self, key):',
    '        if key not in self.map: return -1',
    '        n = self.map[key]',
    '        self._remove(n); self._add_front(n)',
    '        return n.v',
    '    def put(self, key, value):',
    '        if key in self.map:',
    '            n = self.map[key]; n.v = value',
    '            self._remove(n); self._add_front(n); return',
    '        if len(self.map) == self.cap:',
    '            lru = self.tail.prev',
    '            self._remove(lru); del self.map[lru.k]',
    '        n = Node(key, value)',
    '        self.map[key] = n; self._add_front(n)',
  ],
  algorithm: [
    'Keep a map key → node and a doubly linked list with HEAD and TAIL sentinels',
    'get: look the key up; on a hit move its node to the front, otherwise return −1',
    'put: update an existing key and move it to the front',
    'put (new key): if the cache is full evict the node before TAIL, then insert the new node at the front',
    'Every get and put cost O(1): one map lookup plus a few pointer edits',
  ],
  complexity: [{ label: 'Time', value: 'O(1) per operation' }, { label: 'Space', value: 'O(capacity)' }],
  why: 'A hash map alone cannot order keys by recency, and a list alone cannot find a key quickly. Together each operation is a map lookup plus a constant number of pointer changes. The doubly linked list is essential: removing a node from the middle needs its predecessor, which a singly linked list could only find by scanning. Sentinels remove all empty-list and end-of-list special cases.',
};
