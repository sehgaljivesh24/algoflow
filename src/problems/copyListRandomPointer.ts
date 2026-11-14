import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { arrow, emitter, listScene } from './listheapKit.ts';

interface In { vals: number[]; random: (number | null)[] }

/** "7 null, 13 0, 11 4": each node is "value randomIndex". */
function parse(raw: string): In {
  const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (items.length < 1 || items.length > 6) throw new Error('Give 1–6 nodes, each as "value randomIndex", e.g. 7 null, 13 0, 11 4');
  const vals: number[] = [];
  const random: (number | null)[] = [];
  for (const it of items) {
    const m = it.split(/\s+/);
    if (m.length !== 2 || !/^-?\d+$/.test(m[0]) || !(m[1].toLowerCase() === 'null' || /^\d+$/.test(m[1]))) {
      throw new Error('Each node must look like "value randomIndex" (index or null), e.g. 13 0');
    }
    vals.push(+m[0]);
    random.push(m[1].toLowerCase() === 'null' ? null : +m[1]);
  }
  if (vals.some((v) => v < -99 || v > 99)) throw new Error('Keep values between -99 and 99');
  if (random.some((r) => r !== null && r >= vals.length)) throw new Error('A random index must point at an existing node (0 … n−1)');
  return { vals, random };
}

function build({ vals, random }: In): Step[] {
  const n = vals.length;
  const all = [...vals, ...vals]; // keys 0..n-1 originals, n..2n-1 copies
  const copyNext: (number | null)[] = vals.map(() => null);
  const copyRand: (number | null)[] = vals.map(() => null);
  const wired: boolean[] = vals.map(() => false);
  let created = 0;
  let cur: number | null = null;
  let hot: Record<number, CellState> = {};
  const steps: Step[] = [];
  const nm = (i: number | null) => (i === null ? 'null' : `[${i}] ${vals[i]}`);

  const emit = emitter(steps, () => {
    const next = [...vals.map((_, i) => (i + 1 < n ? i + 1 : null)), ...copyNext.map((c) => (c === null ? null : c + n))];
    const order = [...vals.map((_, i) => i), ...Array.from({ length: created }, (_, i) => n + i)];
    const states: Record<number, CellState> = {};
    for (let i = 0; i < created; i++) states[n + i] = 'sorted';
    Object.assign(states, hot);
    return {
      scene: listScene(all, next, [{ id: 'p', label: 'p', at: cur, tone: 'blue' }], states, order),
      aux: [
        { title: 'map: original → copy', kind: 'map' as const, items: Array.from({ length: created }, (_, i) => `[${i}] ${vals[i]} → copy ${vals[i]}′`), highlight: cur !== null && cur < created ? cur : undefined },
        { title: 'original random links', kind: 'map' as const, items: vals.map((_, i) => `${nm(i)} ⇢ ${nm(random[i])}`), highlight: cur ?? undefined },
        { title: 'copy random links (built)', kind: 'map' as const, items: vals.flatMap((_, i) => (wired[i] ? [`[${i}] ${vals[i]} ⇢ ${copyRand[i] === null ? 'null' : `[${copyRand[i]}]`}`] : [])) },
      ],
      vars: { p: cur === null ? 'null' : `[${cur}] ${vals[cur]}`, 'map size': created, 'copies wired': wired.filter(Boolean).length },
    };
  });

  emit('Start', `The list has ${n} node${n === 1 ? '' : 's'}; each also has a random pointer (shown in the side panel, since a random pointer can aim anywhere).`,
    'The difficulty: a random pointer may point to a node whose copy does not exist yet. A map from original to copy solves that.', 'info', [1], [1], 0,
    undefined, { tag: 'READY —', note: `map = {}, ${n} node${n === 1 ? '' : 's'} to copy` });

  for (let i = 0; i < n; i++) {
    cur = i;
    created++;
    hot = { [i]: 'compare', [n + i]: 'active' };
    emit(`Pass 1: copy node [${i}] ${vals[i]}`, `node [${i}] has value ${vals[i]}: create a new node ${vals[i]}′ and store original → copy in the map`,
      'First create every copy (without links), so that every original has a partner in the map.', 'info', [2, 3], [3, 4, 5], 1,
      undefined, { tag: 'COPY NODE', note: `map.put([${i}], new Node(${vals[i]})), map size ${created}` });
  }

  for (let i = 0; i < n; i++) {
    cur = i;
    const nx = i + 1 < n ? i + 1 : null;
    copyNext[i] = nx;
    hot = { [i]: 'compare', [n + i]: 'active', ...(nx !== null ? { [n + nx]: 'swap' } : {}) };
    emit(`Pass 2: wire next of copy ${i}`, `copy of [${i}]: next = map[orig.next] = ${nx === null ? 'null (it is the tail)' : `the copy of [${nx}] ${vals[nx]}`}`,
      'Looking the original neighbour up in the map gives the neighbour’s copy.', 'info', [5, 6], [7, 8], 2,
      undefined, { tag: 'WIRE NEXT', note: `map.get([${i}]).next = ${nx === null ? 'null' : `map.get([${nx}]) = ${vals[nx]}′`}` });
    const r = random[i];
    copyRand[i] = r;
    wired[i] = true;
    hot = { [i]: 'compare', [n + i]: 'active', ...(r !== null ? { [r]: 'swap', [n + r]: 'swap' } : {}) };
    emit(`Pass 2: wire random of copy ${i}`, `orig.random is ${nm(r)}, so copy.random = map[orig.random] = ${r === null ? 'null' : `the copy of ${nm(r)}`}`,
      'The map turns "where the original points" into "where the copy must point".', 'info', [7], [9], 2,
      undefined, { tag: 'WIRE RANDOM', note: `map.get([${i}]).random = ${r === null ? 'null' : `map.get([${r}]) = ${vals[r]}′`}` });
  }

  cur = null;
  hot = {};
  emit('Done', `return map.get(head): the copy list [${vals.join(', ')}] has next and random pointers that stay entirely inside the copy`,
    'No pointer of the new list reaches into the original list, so it is a true deep copy.', 'success', [9], [11], 3,
    { title: arrow(vals), text: `Deep copy of ${n} node${n === 1 ? '' : 's'} with ${random.filter((r) => r !== null).length} random link${random.filter((r) => r !== null).length === 1 ? '' : 's'}` },
    { tag: '✅ Done!', note: `return map.get([0]) = ${vals[0]}′` });
  return steps;
}

export const copyListRandomPointer: ProblemDef<In> = {
  slug: '138-copy-list-with-random-pointer',
  id: '138', title: 'Copy List with Random Pointer', difficulty: 'Medium', category: 'Linked List', tag: 'hash map',
  statement: 'Every node of a linked list has a next pointer and a random pointer that may point to any node (or null). Build a deep copy: brand-new nodes whose next and random pointers reproduce the same structure.',
  constraints: '0 ≤ n ≤ 1000 (animation input: 1–6 nodes, each written as "value randomIndex")',
  examples: [
    { label: '7 null, 13 0, 11 4, 10 2, 1 0', input: { vals: [7, 13, 11, 10, 1], random: [null, 0, 4, 2, 0] }, output: 'copy with the same links' },
    { label: '1 1, 2 1', input: { vals: [1, 2], random: [1, 1] }, output: 'copy with the same links' },
    { label: '3 null, 3 0, 3 null', input: { vals: [3, 3, 3], random: [null, 0, null] }, output: 'copy with the same links' },
  ],
  inputPlaceholder: 'value randomIndex, … — e.g. 7 null, 13 0, 11 4',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current original', state: 'compare' }, { label: 'Copy node', state: 'sorted' }, { label: 'Current copy', state: 'active' }, { label: 'Random target / next copy', state: 'swap' }],
  varLabels: ['p', 'map size', 'copies wired'],
  emphasis: ['random pointer', 'deep copy'],
  phases: [
    { icon: '🗺', label: 'EMPTY MAP', tone: 'blue' },
    { icon: '🧬', label: 'PASS 1: copy nodes', tone: 'cyan' },
    { icon: '🔗', label: 'PASS 2: wire next + random', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Two passes with a map',
    text: 'Pass 1 creates one new node per original and stores original → copy in a hash map. Pass 2 walks the originals again and sets copy.next = map[orig.next] and copy.random = map[orig.random].',
  },
  java: [
    'public Node copyRandomList(Node head) {',
    '    Map<Node, Node> map = new HashMap<>();',
    '    for (Node p = head; p != null; p = p.next) {',
    '        map.put(p, new Node(p.val));',
    '    }',
    '    for (Node p = head; p != null; p = p.next) {',
    '        map.get(p).next = map.get(p.next);',
    '        map.get(p).random = map.get(p.random);',
    '    }',
    '    return map.get(head);',
    '}',
  ],
  python: [
    'def copy_random_list(head):',
    '    m = {None: None}',
    '    p = head',
    '    while p:',
    '        m[p] = Node(p.val)',
    '        p = p.next',
    '    p = head',
    '    while p:',
    '        m[p].next = m[p.next]',
    '        m[p].random = m[p.random]',
    '        p = p.next',
    '    return m[head]',
  ],
  algorithm: [
    'Create an empty map original → copy',
    'Pass 1: for every original node, create a copy and store it in the map',
    'Pass 2: set copy.next and copy.random by looking the targets up in the map',
    'Return the copy of the head',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'A random pointer can target a node that is later in the list, whose copy would not exist yet in a single pass. Creating all copies first guarantees that every lookup in pass 2 succeeds, and because the map keys are the original node objects (not values), duplicate values cause no confusion.',
};
