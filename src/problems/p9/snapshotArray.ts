import type { Aux, Cell, CellState, ProblemDef, Step } from '../../engine/types.ts';
import { plural } from '../text.ts';
import { lineOf } from './kitC.ts';

type Op = { k: 'set'; i: number; v: number } | { k: 'snap' } | { k: 'get'; i: number; s: number };
interface In { n: number; ops: Op[] }

const EX = '3 | set:0=5 snap set:0=6 snap set:1=9 get:0@0 get:0@1 get:1@1 get:1@0';

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error(`Write the array length, a bar, then the operations, e.g. ${EX}`);
  const n = Number(parts[0].trim());
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error('The array length must be a whole number from 1 to 5');
  const toks = parts[1].split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) throw new Error(`Add operations after the bar, e.g. ${EX}`);
  if (toks.length > 10) throw new Error('Use at most 10 operations');
  let snaps = 0;
  const ops = toks.map((t): Op => {
    if (/^snap$/i.test(t)) {
      snaps++;
      if (snaps > 4) throw new Error('Use at most 4 snap operations');
      return { k: 'snap' };
    }
    let m = /^set:(\d+)=(\d{1,2})$/i.exec(t);
    if (m) {
      const i = Number(m[1]);
      if (i >= n) throw new Error(`"${t}": the index must be between 0 and ${n - 1}`);
      return { k: 'set', i, v: Number(m[2]) };
    }
    m = /^get:(\d+)@(\d+)$/i.exec(t);
    if (m) {
      const i = Number(m[1]);
      const s = Number(m[2]);
      if (i >= n) throw new Error(`"${t}": the index must be between 0 and ${n - 1}`);
      if (s >= snaps) throw new Error(`"${t}": snapshot ${s} has not been taken yet (snapshots so far: ${snaps})`);
      return { k: 'get', i, s };
    }
    throw new Error(`"${t}" is not an operation. Write set:i=v (v is 0..99), snap, or get:i@snapId`);
  });
  return { n, ops };
}

const java = [
  'class SnapshotArray {',
  '    private final List<int[]>[] hist;          // hist[i]: {snapId, value} entries, ascending by snapId',
  '    private int snapId = 0;',
  '',
  '    SnapshotArray(int length) {',
  '        hist = new List[length];',
  '        for (int i = 0; i < length; i++) {',
  '            hist[i] = new ArrayList<>();',
  '            hist[i].add(new int[]{0, 0});         // every cell starts as 0',
  '        }',
  '    }',
  '',
  '    void set(int index, int val) {',
  '        List<int[]> h = hist[index];',
  '        int[] last = h.get(h.size() - 1);',
  '        if (last[0] == snapId) last[1] = val;      // already written since the last snap: overwrite',
  '        else h.add(new int[]{snapId, val});        // first write in this period: new entry',
  '    }',
  '',
  '    int snap() { return snapId++; }                // O(1): no copying at all',
  '',
  '    int get(int index, int snap_id) {',
  '        List<int[]> h = hist[index];',
  '        int lo = 0, hi = h.size() - 1;',
  '        while (lo < hi) {                           // last entry with snapId <= snap_id',
  '            int mid = (lo + hi + 1) / 2;',
  '            if (h.get(mid)[0] <= snap_id) lo = mid;',
  '            else hi = mid - 1;',
  '        }',
  '        return h.get(lo)[1];',
  '    }',
  '}',
];
const python = [
  'class SnapshotArray:',
  '    def __init__(self, length):',
  '        self.hist = [[(0, 0)] for _ in range(length)]   # per index: (snap_id, value), ascending',
  '        self.snap_id = 0',
  '',
  '    def set(self, index, val):',
  '        h = self.hist[index]',
  '        if h[-1][0] == self.snap_id:',
  '            h[-1] = (self.snap_id, val)                  # already written since the last snap',
  '        else:',
  '            h.append((self.snap_id, val))                # first write in this period',
  '',
  '    def snap(self):',
  '        self.snap_id += 1                                # O(1): no copying',
  '        return self.snap_id - 1',
  '',
  '    def get(self, index, snap_id):',
  '        h = self.hist[index]',
  '        lo, hi = 0, len(h) - 1',
  '        while lo < hi:                                   # last entry with snap <= snap_id',
  '            mid = (lo + hi + 1) // 2',
  '            if h[mid][0] <= snap_id: lo = mid',
  '            else: hi = mid - 1',
  '        return h[lo][1]',
];

const J = {
  init: [lineOf(java, 'hist = new List'), lineOf(java, 'hist[i].add(new int[]{0, 0})')],
  setHead: [lineOf(java, 'void set'), lineOf(java, 'int[] last')],
  over: [lineOf(java, 'if (last[0] == snapId)')],
  append: [lineOf(java, 'else h.add(new int[]{snapId, val})')],
  snap: [lineOf(java, 'int snap()')],
  getHead: [lineOf(java, 'int get('), lineOf(java, 'int lo = 0, hi')],
  mid: [lineOf(java, 'int mid')],
  right: [lineOf(java, 'if (h.get(mid)[0] <= snap_id) lo = mid')],
  left: [lineOf(java, 'else hi = mid - 1')],
  ret: [lineOf(java, 'return h.get(lo)[1]')],
};
const P = {
  init: [lineOf(python, 'self.hist = '), lineOf(python, 'self.snap_id = 0')],
  setHead: [lineOf(python, 'def set'), lineOf(python, 'h = self.hist[index]')],
  over: [lineOf(python, 'if h[-1][0] == self.snap_id'), lineOf(python, 'h[-1] = (self.snap_id, val)')],
  append: [lineOf(python, 'else:'), lineOf(python, 'h.append(')],
  snap: [lineOf(python, 'def snap'), lineOf(python, 'self.snap_id += 1')],
  getHead: [lineOf(python, 'def get('), lineOf(python, 'lo, hi = 0')],
  mid: [lineOf(python, 'mid = (lo + hi + 1)')],
  right: [lineOf(python, 'if h[mid][0] <= snap_id: lo = mid')],
  left: [lineOf(python, 'else: hi = mid - 1')],
  ret: [lineOf(python, 'return h[lo][1]')],
};

function build({ n, ops }: In): Step[] {
  const totalSnaps = ops.filter((o) => o.k === 'snap').length;
  const cols = totalSnaps + 1;
  const hist: { snap: number; val: number }[][] = Array.from({ length: n }, () => [{ snap: 0, val: 0 }]);
  let snapId = 0;
  const out: string[] = [];
  const steps: Step[] = [];
  let st = new Map<string, CellState>();
  let op = '—';
  let result: number | string = '—';

  const scene = () => {
    const rows: Cell[][] = hist.map((h, i) => Array.from({ length: cols }, (_, c) => {
      const e = h.find((x) => x.snap === c);
      const key = `${i},${c}`;
      const state = st.get(key);
      if (!e) return { key, value: '·', state: state ?? 'dim' } as Cell;
      return { key, value: e.val, ...(state ? { state } : c === snapId ? { state: 'swap' as CellState } : {}) } as Cell;
    }));
    return {
      kind: 'grid' as const, rows, variant: 'matrix' as const,
      rowHeads: Array.from({ length: n }, (_, i) => `a[${i}]`),
      colHeads: Array.from({ length: cols }, (_, c) => (c === snapId ? `snap ${c} ◂ now` : `snap ${c}`)),
    };
  };
  const aux = (): Aux[] => [
    { title: 'stored (snapId, value) per index', kind: 'map', items: hist.map((h, i) => `a[${i}] → ${h.map((e) => `(${e.snap},${e.val})`).join(' ')}`) },
    { title: 'outputs so far', kind: 'list', items: [...out] },
  ];
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => {
    steps.push({ ...s, scene: scene(), aux: aux(), vars: { op, snapId, result, outputs: `[${out.join(', ')}]` } });
  };

  push({
    title: 'Start: one tiny history per index', desc: `${plural(n, 'cell')}, all 0. Each row keeps only the (snapshot id, value) pairs where the cell actually changed; a dot means "no entry in that snapshot".`,
    logic: 'Instead of copying the array at every snap, remember a cell\'s value only when it is written.', logicTone: 'info',
    javaLines: J.init, pyLines: P.init, algoStep: 0,
    tag: 'INIT —', note: `hist[0..${n - 1}] = [(0, 0)], snapId = 0`,
  });

  for (const o of ops) {
    st = new Map();
    if (o.k === 'set') {
      const h = hist[o.i];
      const last = h[h.length - 1];
      op = `set(${o.i}, ${o.v})`;
      result = 'null';
      if (last.snap === snapId) {
        last.val = o.v;
        st.set(`${o.i},${snapId}`, 'active');
        out.push('null');
        push({ title: `${op}: overwrite`, desc: `a[${o.i}] already has an entry for snapshot ${snapId} (written since the last snap), so just replace its value with ${o.v}.`, logic: 'Writes between two snaps only need to remember the newest value.', logicTone: 'info', javaLines: [...J.setHead, ...J.over], pyLines: [...P.setHead, ...P.over], algoStep: 1, tag: 'OVERWRITE:', note: `last.snap = ${snapId} == snapId → last.val = ${o.v}` });
      } else {
        h.push({ snap: snapId, val: o.v });
        st.set(`${o.i},${snapId}`, 'active');
        out.push('null');
        push({ title: `${op}: new entry (${snapId}, ${o.v})`, desc: `The last entry of a[${o.i}] belongs to an older snapshot, so append a new entry (${snapId}, ${o.v}). The old entry stays: older snapshots still need it.`, logic: 'A write creates at most one new pair, so memory grows with the number of writes, not with snaps x length.', logicTone: 'success', javaLines: [...J.setHead, ...J.append], pyLines: [...P.setHead, ...P.append], algoStep: 1, tag: 'APPEND:', note: `last.snap = ${h[h.length - 2].snap} ≠ ${snapId} → h.add(${snapId}, ${o.v}); ${h.length} entries for a[${o.i}]` });
      }
    } else if (o.k === 'snap') {
      op = 'snap()';
      result = snapId;
      out.push(String(snapId));
      const taken = snapId;
      snapId++;
      push({ title: `snap() returns ${taken}`, desc: `Only the counter moves: snapshot ${taken} is now frozen and writes go to snapshot ${snapId}. Nothing was copied.`, logic: 'The snapshot is implicit: it is the set of entries with snapId <= the id.', logicTone: 'success', javaLines: J.snap, pyLines: P.snap, algoStep: 2, tag: 'SNAP —', note: `return snapId++ → ${taken}, snapId is now ${snapId}` });
    } else {
      const h = hist[o.i];
      op = `get(${o.i}, ${o.s})`;
      let lo = 0;
      let hi = h.length - 1;
      result = '?';
      const paint = (mid: number | null, final = false) => {
        st = new Map();
        h.forEach((e, k) => {
          const key = `${o.i},${e.snap}`;
          if (final && k === lo) st.set(key, 'found');
          else if (k === mid) st.set(key, 'compare');
          else if (k < lo || k > hi) st.set(key, 'dim');
        });
      };
      paint(null);
      push({ title: `${op}: binary search row a[${o.i}]`, desc: `Find the LAST entry of a[${o.i}] whose snapshot id is at most ${o.s}. The row has ${h.length} entr${h.length === 1 ? 'y' : 'ies'}, sorted by snapshot id.`, logic: 'The value at snapshot s is the value of the most recent write at or before s.', logicTone: 'info', javaLines: J.getHead, pyLines: P.getHead, algoStep: 3, tag: 'GET —', note: `lo = 0, hi = ${h.length - 1}, want last snapId ≤ ${o.s}` });
      while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        const ok = h[mid].snap <= o.s;
        paint(mid);
        push({ title: `Probe entry (${h[mid].snap}, ${h[mid].val})`, desc: `mid = ${mid}. Snapshot id ${h[mid].snap} ${ok ? '<=' : '>'} ${o.s}, so ${ok ? 'this entry could be the answer: keep it and look right' : 'it is too new: discard it and everything after'}.`, logic: 'Entries are sorted by snapshot id, so one comparison halves the candidates.', logicTone: 'info', javaLines: [...J.mid, ...(ok ? J.right : J.left)], pyLines: [...P.mid, ...(ok ? P.right : P.left)], algoStep: 3, tag: ok ? 'KEEP:' : 'DISCARD:', note: `mid = (${lo} + ${hi} + 1) / 2 = ${mid}, snap ${h[mid].snap} ${ok ? '≤' : '>'} ${o.s} → ${ok ? `lo = ${mid}` : `hi = ${mid - 1}`}` });
        if (ok) lo = mid; else hi = mid - 1;
      }
      result = h[lo].val;
      out.push(String(result));
      paint(null, true);
      push({ title: `${op} = ${result}`, desc: `The surviving entry is (${h[lo].snap}, ${h[lo].val}): the last write to a[${o.i}] at or before snapshot ${o.s}.`, logic: 'O(log w) per get, where w is the number of writes to that index.', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 3, tag: 'FOUND —', note: `return h.get(${lo})[1] = ${h[lo].val}` });
    }
  }
  st = new Map();
  op = 'done';
  push({ title: 'All operations done', desc: `Outputs in order: [${out.join(', ')}].`, logic: 'set is O(1), snap is O(1), get is O(log w).', logicTone: 'success', javaLines: J.ret, pyLines: P.ret, algoStep: 4, tag: '✅ Done!', note: `${plural(ops.length, 'operation')}, ${totalSnaps} snapshot${totalSnaps === 1 ? '' : 's'}, no array was ever copied` });
  steps[steps.length - 1].result = { title: `[${out.join(', ')}]`, text: 'Outputs of the operations in order' };
  return steps;
}

const mk = (s: string): In => parse(s);

export const snapshotArray: ProblemDef<In> = {
  slug: '1146-snapshot-array',
  id: '1146', title: 'Snapshot Array', difficulty: 'Medium', category: 'Design', tag: 'versioned values',
  statement: 'Implement an array of given length (all zeros) with set(index, val), snap() which freezes the current contents and returns a snapshot id (0, 1, 2, ...), and get(index, snap_id) which returns the value that cell had when that snapshot was taken. Copying the array on every snap is too slow, so store versions per cell.',
  constraints: 'Animation input: length 1..5, then up to 10 operations written set:i=v (v in 0..99), snap (at most 4) and get:i@snapId (the snapshot must already exist)',
  examples: [
    { label: EX, input: mk(EX), output: '[null, 0, null, 1, null, 5, 6, 0, 0]' },
    { label: '2 | set:0=7 snap snap set:0=8 get:0@1 get:0@0 snap get:1@2 get:0@2', input: mk('2 | set:0=7 snap snap set:0=8 get:0@1 get:0@0 snap get:1@2 get:0@2'), output: '[null, 0, 1, null, 7, 7, 2, 0, 8]' },
    { label: '1 | set:0=1 set:0=2 snap set:0=3 snap get:0@0 get:0@1', input: mk('1 | set:0=1 set:0=2 snap set:0=3 snap get:0@0 get:0@1'), output: '[null, null, 0, null, 1, 2, 3]' },
  ],
  inputPlaceholder: `e.g. ${EX}`,
  parseInput: parse, buildSteps: build, viz: 'cells',
  vizTitle: 'Version history per index',
  vizCaption: 'rows = indices, columns = snapshot ids; a number is a stored (snapId, value) entry, a dot means no write in that snapshot',
  legend: [{ label: 'Entry written in the current period', state: 'swap' }, { label: 'Entry just written', state: 'active' }, { label: 'Binary-search probe', state: 'compare' }, { label: 'Answer entry', state: 'found' }],
  varLabels: ['op', 'snapId', 'result', 'outputs'],
  approach: {
    title: 'Record a value only when it is written, then binary search',
    text: 'Keep, for every index, a list of (snapId, value) pairs sorted by snapId. set updates the pair for the current snapshot period (or appends one), snap just increments a counter, and get binary-searches the list of that index for the last pair whose snapId is at most the requested id.',
  },
  java, python,
  algorithm: [
    'Give every index a list holding (0, 0) and keep a counter snapId = 0',
    'set: overwrite the last pair if it is from this period, otherwise append (snapId, val)',
    'snap: return snapId and increment it, with no copying',
    'get: binary search the index\'s pairs for the last one with snapId <= the requested id',
    'Return the outputs of all operations',
  ],
  emphasis: ['set(index, val)', 'snap()', 'get(index, snap_id)', 'store versions per cell'],
  phases: [
    { icon: '🧱', label: 'Init: one history per index', tone: 'blue' },
    { icon: '✏️', label: 'set: overwrite or append', tone: 'cyan' },
    { icon: '📸', label: 'snap: bump the counter', tone: 'green' },
    { icon: '🔎', label: 'get: binary search', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  complexity: [{ label: 'Time', value: 'O(1) set and snap, O(log w) get' }, { label: 'Space', value: 'O(length + writes)' }],
  why: 'A snapshot never stores values; it is just a number. The value of index i at snapshot s is the value of the latest write to i that happened before s was taken, i.e. the pair with the largest snapId <= s. Because pairs are appended in time order their snapIds are non-decreasing, so binary search finds that pair. Each write adds at most one pair, so memory depends on the number of writes and not on the number of snapshots.',
  naive: 'Copying the whole array on every snap costs O(length) time and memory per snapshot. Versioning each cell separately makes snap free.',
};
