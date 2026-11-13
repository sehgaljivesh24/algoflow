import type { CellState, ProblemDef, Step } from '../engine/types.ts';
import { rng } from './graphKit.ts';
import { recorder } from './stepKit.ts';
import { intIn, intList, semis } from './p4Kit.ts';
import { plainList } from './listheapKit.ts';

interface In { vals: number[]; seed: number }

const FORMAT = 'values ; seed — e.g. 10 20 30 40 50 ; 7';

function parse(raw: string): In {
  const p = semis(raw, 2, FORMAT);
  return { vals: intList(p[0], { what: 'the list', max: 8, lo: -99, hi: 99, example: '10 20 30 40 50' }), seed: intIn(p[1], 0, 999, 'seed') };
}

/** Deterministic reference: the node index getRandom() would return for this seed. */
export function pickNode(n: number, seed: number): number {
  const rand = rng(seed);
  let chosen = 0;
  for (let i = 1; i <= n; i++) if (Math.floor(rand() * i) === 0) chosen = i - 1;
  return chosen;
}

function build({ vals, seed }: In): Step[] {
  const n = vals.length;
  const rand = rng(seed);
  const draws: string[] = [];
  let cur = -1;
  let chosen = -1;
  let seen = 0;
  let draw: number | string = '—';
  const steps: Step[] = [];

  const say = recorder(steps, () => {
    const states: Record<number, CellState> = {};
    for (let j = 0; j < seen; j++) states[j] = 'sorted';
    if (chosen >= 0) states[chosen] = 'found';
    if (cur >= 0 && cur !== chosen) states[cur] = 'active';
    return {
      scene: plainList(vals, [
        ...(cur >= 0 ? [{ id: 'cur', label: 'cur', at: cur, tone: 'blue' as const }] : []),
        ...(chosen >= 0 && chosen !== cur ? [{ id: 'pick', label: 'pick', at: chosen, tone: 'green' as const }] : []),
      ], states),
      aux: [
        { title: `draws (seed ${seed})`, kind: 'list' as const, items: [...draws] },
        { title: 'chance each visited node is the current pick', kind: 'list' as const, items: seen ? vals.slice(0, seen).map((v) => `${v}: 1/${seen}`) : [] },
      ],
      vars: { i: seen, draw, pick: chosen >= 0 ? vals[chosen] : '—', 'chance to replace': seen ? `1/${seen}` : '—' },
    };
  });

  say({
    title: 'Start', desc: `A linked list of ${n} node${n === 1 ? '' : 's'}. getRandom() must return a uniformly random node's value, but the length is not known in advance and we may not store the values.`,
    logic: 'Reservoir sampling with one slot: walk the list once and keep a single candidate, replacing it with decreasing probability.', java: [5], py: [4], algo: 0,
    tag: 'READY —', note: 'chosen = none, i = 0',
  });

  for (let j = 0; j < n; j++) {
    cur = j;
    seen = j + 1;
    const r = Math.floor(rand() * seen);
    draw = r;
    const keep = r === 0;
    if (keep) chosen = j;
    draws.push(`node ${seen}: rand(0..${seen - 1}) = ${r} → ${keep ? 'keep' : 'skip'}`);
    say({
      title: `Node ${seen} (value ${vals[j]}): draw ${r}`,
      tag: `NODE ${seen} —`, note: keep ? `rand.nextInt(${seen}) = ${r} == 0 → chosen = ${vals[j]}` : `rand.nextInt(${seen}) = ${r} ≠ 0 → chosen stays ${vals[chosen]}`,
      desc: keep ? `rand(${seen}) = ${r} is 0 (chance 1/${seen}) → 🎯 ${vals[j]} replaces the pick.` : `rand(${seen}) = ${r} ≠ 0 (chance ${seen - 1}/${seen}) → the pick stays ${vals[chosen]}.`,
      logic: seen === 1 ? 'The first node is always taken: with one node seen, it must be the pick.' : `After this step every one of the ${seen} visited nodes is the pick with probability exactly 1/${seen}.`,
      tone: keep ? 'success' : 'info', java: [6, 7, 8], py: [5, 6, 7, 8, 9], algo: keep ? 2 : 1,
    });
  }

  cur = -1;
  say({
    title: 'Done', tag: '✅ Done!', note: `return ${vals[chosen]}`, desc: `The list ended after ${n} nodes. The pick is node ${chosen + 1}, value ${vals[chosen]} (every node had chance 1/${n}).`,
    logic: `Node j survives if it is taken (1/j) and never replaced (j/(j+1) · … · (n−1)/n), a product that telescopes to 1/${n} for every node.`, tone: 'success', java: [10], py: [10], algo: 3,
    result: { title: String(vals[chosen]), text: 'Value returned by getRandom()' },
  });
  return steps;
}

export const linkedListRandomNode: ProblemDef<In> = {
  slug: '382-linked-list-random-node',
  id: '382', title: 'Linked List Random Node', difficulty: 'Medium', category: 'Randomized & Streaming', tag: 'reservoir sampling (k = 1)',
  statement: 'Design a class built from the head of a singly linked list whose getRandom() returns the value of a node chosen uniformly at random. Every node must be equally likely, and the length of the list may not be assumed known (a stream-friendly solution is preferred).',
  constraints: '1 ≤ nodes ≤ 10⁴, getRandom called up to 10⁴ times (animation: ≤ 8 nodes; a seeded generator makes the "random" run repeatable — the seed is part of the input)',
  examples: [
    { label: '10 20 30 40 50 60 ; seed 7', input: { vals: [10, 20, 30, 40, 50, 60], seed: 7 }, output: String([10, 20, 30, 40, 50, 60][pickNode(6, 7)]) },
    { label: '10 20 30 40 50 ; seed 7', input: { vals: [10, 20, 30, 40, 50], seed: 7 }, output: String([10, 20, 30, 40, 50][pickNode(5, 7)]) },
    { label: '1 2 3 ; seed 3', input: { vals: [1, 2, 3], seed: 3 }, output: String([1, 2, 3][pickNode(3, 3)]) },
    { label: '5 6 7 8 9 4 3 2 ; seed 21', input: { vals: [5, 6, 7, 8, 9, 4, 3, 2], seed: 21 }, output: String([5, 6, 7, 8, 9, 4, 3, 2][pickNode(8, 21)]) },
  ],
  inputPlaceholder: FORMAT,
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node being visited', state: 'active' }, { label: 'Already visited', state: 'sorted' }, { label: 'Current pick', state: 'found' }],
  varLabels: ['i', 'draw', 'pick', 'chance to replace'],
  emphasis: ['uniformly at random', 'length of the list', 'may not be assumed known'],
  phases: [
    { icon: '🏁', label: 'Phase 1: Start (no pick, i = 0)', tone: 'blue' },
    { icon: '🎲', label: 'Phase 2: Draw rand(0..i−1)', tone: 'cyan' },
    { icon: '🎯', label: 'Phase 3: Draw 0 → replace pick', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Keep one candidate, replace it with probability 1/i',
    text: 'Walk the list once. For the i-th node draw a random integer in [0, i); if it is 0 (probability 1/i) the current node becomes the pick, otherwise the old pick stays. After the last node every node has been the survivor with probability exactly 1/n, and no length or extra storage was needed.',
  },
  java: [
    'class Solution {',
    '    private final ListNode head;',
    '    private final Random rand = new Random();',
    '    public Solution(ListNode head) { this.head = head; }',
    '    public int getRandom() {',
    '        int chosen = 0, i = 0;',
    '        for (ListNode cur = head; cur != null; cur = cur.next) {',
    '            i++;',
    '            if (rand.nextInt(i) == 0) chosen = cur.val;    // keep this node with probability 1/i',
    '        }',
    '        return chosen;',
    '    }',
    '}',
  ],
  python: [
    'class Solution:',
    '    def __init__(self, head):',
    '        self.head = head',
    '    def get_random(self):',
    '        chosen, i, cur = None, 0, self.head',
    '        while cur:',
    '            i += 1',
    '            if random.randrange(i) == 0:        # keep this node with probability 1/i',
    '                chosen = cur.val',
    '            cur = cur.next',
    '        return chosen',
  ],
  algorithm: [
    'Start with no candidate and a counter i = 0',
    'At each node, increment i and draw a random integer in [0, i)',
    'If the draw is 0, replace the candidate with this node',
    'After the last node, return the candidate (each node had probability 1/n)',
  ],
  complexity: [{ label: 'Time', value: 'O(n) per call' }, { label: 'Space', value: 'O(1)' }],
  why: 'Induction on i: after i nodes each of them is the candidate with probability 1/i. Node i + 1 replaces the candidate with probability 1/(i + 1); every older node keeps its place with probability i/(i + 1), so its chance becomes (1/i) · (i/(i + 1)) = 1/(i + 1), and the new node also has 1/(i + 1). The distribution therefore stays uniform without knowing the length.',
};
