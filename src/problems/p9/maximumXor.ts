import type { Aux, ProblemDef, Step } from '../../engine/types.ts';
import { TrieModel } from '../trieKit.ts';
import { recorder } from '../stepKit.ts';

interface In { nums: number[] }

function parse(raw: string): In {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(Number);
  if (!parts.length || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter whole numbers separated by spaces, e.g. 3 10 5 25 2 8 (here: 0 to 15)');
  if (nums.length > 7) throw new Error('Use at most 7 numbers');
  if (nums.some((n) => n < 0 || n > 15)) throw new Error('Keep every number between 0 and 15 so the bit trie has at most 4 levels');
  return { nums };
}

const bitsOf = (x: number, L: number) => x.toString(2).padStart(L, '0');

function build({ nums }: In): Step[] {
  const L = Math.max(1, Math.max(...nums).toString(2).length);
  const trie = new TrieModel();
  const sceneOf = (...a: Parameters<TrieModel['scene']>) => ({ ...trie.scene(...a), labelPos: 'below' as const });
  const labels: Record<number, string> = {};
  const steps: Step[] = [];
  let scene = sceneOf();
  let x: string | number = '—';
  let bits = '—';
  let want: string | number = '—';
  let cur: string | number = '—';
  let best = 0;
  let hi = -1; // highlighted bit position (index into the printed bits)
  const aux = (): Aux[] => [
    { title: `numbers (${L}-bit)`, kind: 'list', items: nums.map((n) => `${n}=${bitsOf(n, L)}`) },
    { title: 'bits of x (high first)', kind: 'list', items: bits === '—' ? [] : bits.split(''), highlight: hi >= 0 ? hi : undefined },
  ];
  const say = recorder(steps, () => ({ scene, aux: aux(), vars: { x, bits, 'wanted bit': want, 'xor so far': cur, best } }));

  say({ title: 'Start', desc: `Every number is written with ${L} bits. Insert them all into a binary trie, high bit first; then for each number walk the trie preferring the OPPOSITE bit at every level.`, logic: 'XOR gives a 1 exactly where the bits differ, and a higher 1 outweighs every lower bit, so being greedy from the top is optimal.', java: [1, 2, 3], py: [1, 2], algo: 0, tag: 'START —', note: `L = ${L} bits for max ${Math.max(...nums)}, empty trie, best = 0` });

  for (const n of nums) {
    x = n;
    bits = bitsOf(n, L);
    let id = 0;
    const path = [0];
    let created = 0;
    for (const ch of bits) { const [nid, c] = trie.ensure(id, ch); id = nid; path.push(id); if (c) created++; }
    trie.nodes[id].end = true;
    labels[id] = String(n);
    scene = sceneOf(path, { [id]: 'found' }, labels);
    hi = -1;
    say({ title: `Insert ${n} = ${bits}`, desc: `Walk the bits ${bits.split('').join(' → ')}; ${created ? `${created} new node${created === 1 ? '' : 's'} created` : 'the whole path already existed'}. The leaf remembers the number.`, logic: 'Each root-to-leaf path spells one number in binary.', tone: 'info', java: [4, 5, 6, 7, 8, 9], py: [3, 4, 5, 6], algo: 1, tag: 'INSERT —', note: `x = ${n} = ${bits}: ${created} new node${created === 1 ? '' : 's'}, leaf labelled ${n}` });
  }

  for (const n of nums) {
    x = n;
    bits = bitsOf(n, L);
    cur = 0;
    want = '—';
    hi = -1;
    let id = 0;
    let acc = 0;
    const path = [0];
    scene = sceneOf(path, { 0: 'active' }, labels);
    say({ title: `Find the best partner for ${n} = ${bits}`, desc: 'Start at the root. At each bit try the child that differs from x\'s bit.', logic: 'A differing bit turns into a 1 in the XOR; take it whenever the trie allows.', java: [13, 14], py: [8, 9], algo: 2, tag: 'QUERY —', note: `x = ${n} = ${bits}, node = root, cur = 0` });
    for (let k = 0; k < L; k++) {
      const b = Number(bits[k]);
      const w = 1 - b;
      want = w;
      hi = k;
      const wantChild = trie.child(id, String(w));
      if (wantChild !== null) {
        id = wantChild;
        acc |= 1 << (L - 1 - k);
        cur = acc;
        path.push(id);
        scene = sceneOf(path, { [id]: 'active' }, labels);
        say({ title: `Bit ${k + 1}: x has ${b}, go ${w}`, desc: `A '${w}' child exists, so this XOR bit becomes 1 (xor so far ${acc}).`, logic: 'Opposite bit available: the XOR gains a 1 at this position.', tone: 'info', java: [15, 16, 17], py: [10, 11, 12, 13, 14], algo: 3, tag: 'FLIP —', note: `b=${L - 1 - k}: want = 1 − ${b} = ${w}, child exists → cur |= ${1 << (L - 1 - k)} → ${acc}` });
      } else {
        id = trie.child(id, String(b))!;
        path.push(id);
        scene = sceneOf(path, { [id]: 'compare' }, labels);
        say({ title: `Bit ${k + 1}: x has ${b}, no ${w} below`, desc: `No '${w}' child here, so we are forced to follow '${b}'; this XOR bit stays 0 (xor so far ${acc}).`, logic: 'Every stored number below this node agrees with x here: nothing better exists.', tone: 'warn', java: [15, 16, 18], py: [10, 11, 15, 16], algo: 3, tag: 'FORCED —', alert: `No '${w}' child at bit ${k + 1}: every stored number below agrees with x here`, note: `b=${L - 1 - k}: want = ${w}, missing → node = next[${b}], cur stays ${acc}` });
      }
    }
    hi = -1;
    const partner = Number(labels[id]);
    const prevBest = best;
    best = Math.max(best, acc);
    const record = acc > prevBest;
    scene = sceneOf(path, { [id]: 'found' }, labels);
    say({ title: `${n} ^ ${partner} = ${acc}`, desc: `The leaf is ${partner} (${bitsOf(partner, L)}). Best XOR for ${n} is ${acc}; ${record ? `new overall best ${best}` : `overall best stays ${best}`}.`, logic: 'The overall answer is the largest of these per-number maxima.', tone: record ? 'success' : 'info', java: [19, 20], py: [17], algo: 4, tag: record ? 'NEW BEST —' : 'KEEP BEST —', note: `${n} ^ ${partner} = ${acc}; best = max(${prevBest}, ${acc}) = ${best}` });
  }
  x = '—'; bits = '—'; want = '—'; cur = '—'; hi = -1;
  scene = sceneOf([], {}, labels);
  say({ title: 'Done', desc: `Every number has its best partner. The maximum XOR is ${best}.`, logic: 'The greedy descent never needed to compare against all n numbers: L steps per query were enough.', tone: 'success', java: [21], py: [18], algo: 5, tag: '✅ Done!', note: `return best = ${best}` });
  steps[steps.length - 1].result = { title: String(best), text: 'Maximum XOR of any two numbers' };
  return steps;
}

export const maximumXor: ProblemDef<In> = {
  slug: '421-maximum-xor-of-two-numbers-in-an-array',
  id: '421', title: 'Maximum XOR of Two Numbers in an Array', difficulty: 'Medium', category: 'Trie', tag: 'bit trie',
  statement: 'Given an integer array, return the maximum value of nums[i] XOR nums[j] over all pairs (i may equal j). Hint: store every number in a trie of bits and, for each number, look for the stored number that disagrees with it as early as possible.',
  constraints: '0 ≤ nums[i] (animation input: at most 7 numbers between 0 and 15)',
  examples: [
    { label: '3 10 5 8 2', input: { nums: [3, 10, 5, 8, 2] }, output: '15' },
    { label: '14 7 9 1 6 12', input: { nums: [14, 7, 9, 1, 6, 12] }, output: '15' },
    { label: '5 5 4', input: { nums: [5, 5, 4] }, output: '1' },
  ],
  inputPlaceholder: 'e.g. 3 10 5 8 2   (numbers 0 to 15)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Node on the current walk', state: 'active' }, { label: 'Inserted / best partner', state: 'found' }, { label: 'Forced same bit', state: 'compare' }],
  emphasis: ['maximum', 'XOR', 'trie of bits'],
  varLabels: ['x', 'bits', 'wanted bit', 'xor so far', 'best'],
  phases: [
    { icon: '📏', label: 'Phase 1: Pick bit width', tone: 'blue' },
    { icon: '🌳', label: 'Phase 2: Insert bits', tone: 'green' },
    { icon: '🎯', label: 'Phase 3: Query next x', tone: 'cyan' },
    { icon: '🔀', label: 'Phase 4: Flip bit (greedy)', tone: 'orange' },
    { icon: '🏆', label: 'Phase 5: Update best', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  vizTitle: 'Bit trie (0 left, 1 right)',
  approach: {
    title: 'Greedy descent through a trie of bits',
    text: 'Write all numbers with the same number of bits and insert them into a trie, most significant bit first. For each x, walk down choosing the child whose bit is the opposite of x\'s bit whenever it exists; each such choice sets that bit of the XOR. The best x over all numbers is the answer.',
  },
  java: [
    'static int findMaximumXOR(int[] nums) {',
    '    int L = Math.max(1, 32 - Integer.numberOfLeadingZeros(Arrays.stream(nums).max().getAsInt()));',
    '    int[][] next = new int[L * nums.length + 1][2];   // bit trie, node 0 = root',
    '    int size = 1;',
    '    for (int x : nums) {                              // insert, high bit first',
    '        int node = 0;',
    '        for (int b = L - 1; b >= 0; b--) {',
    '            int bit = (x >> b) & 1;',
    '            if (next[node][bit] == 0) next[node][bit] = size++;',
    '            node = next[node][bit];',
    '        }',
    '    }',
    '    int best = 0;',
    '    for (int x : nums) {                              // best partner for x',
    '        int node = 0, cur = 0;',
    '        for (int b = L - 1; b >= 0; b--) {',
    '            int want = 1 - ((x >> b) & 1);            // opposite bit gives a 1',
    '            if (next[node][want] != 0) { cur |= 1 << b; node = next[node][want]; }',
    '            else node = next[node][1 - want];',
    '        }',
    '        best = Math.max(best, cur);',
    '    }',
    '    return best;',
    '}',
  ],
  python: [
    'def find_maximum_xor(nums):',
    '    L = max(max(nums).bit_length(), 1)',
    '    root = {}',
    '    for x in nums:                                # insert, high bit first',
    '        node = root',
    '        for b in range(L - 1, -1, -1):',
    '            node = node.setdefault((x >> b) & 1, {})',
    '    best = 0',
    '    for x in nums:                                # best partner for x',
    '        node, cur = root, 0',
    '        for b in range(L - 1, -1, -1):',
    '            want = 1 - ((x >> b) & 1)             # opposite bit gives a 1',
    '            if want in node:',
    '                cur |= 1 << b',
    '                node = node[want]',
    '            else:',
    '                node = node[1 - want]',
    '        best = max(best, cur)',
    '    return best',
  ],
  algorithm: [
    'Pick the bit width L and start an empty bit trie',
    'Insert every number as a path of L bits, high bit first',
    'For each x start again at the root',
    'At each bit go to the child with the opposite bit if it exists (that XOR bit becomes 1), otherwise follow the same bit',
    'Keep the largest XOR found over all x',
    'Done: return the best XOR',
  ],
  complexity: [{ label: 'Time', value: 'O(n · L)' }, { label: 'Space', value: 'O(n · L)' }],
  why: 'Comparing two XOR results is decided at the highest bit where they differ, so a 1 in a higher position beats any combination of lower bits. For a fixed x the trie lets us ask at every level "does any stored number have the opposite bit here, given that all earlier choices were already the best possible?" Taking the opposite child whenever it exists therefore maximises x XOR y, and trying every x covers every pair.',
};
