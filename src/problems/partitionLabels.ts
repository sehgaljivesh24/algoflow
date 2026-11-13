import type { Cell, CellState, LogicTone, ProblemDef, Step, Tone } from '../engine/types.ts';

interface In { s: string }

const TONES: Tone[] = ['blue', 'orange', 'purple', 'green', 'yellow', 'red'];

function parse(raw: string): In {
  const s = raw.replace(/\s+/g, '').toLowerCase();
  if (!s || /[^a-z]/.test(s)) throw new Error('Use lowercase letters only, e.g. ababcbacadefegde');
  if (s.length > 16) throw new Error('Use 16 letters or fewer');
  return { s };
}

function build({ s }: In): Step[] {
  const n = s.length;
  const last = new Map<string, number>();
  [...s].forEach((ch, i) => last.set(ch, i));
  const parts: number[] = [];
  const cutEnds: number[] = [];
  let start = 0;
  let end = 0;
  const steps: Step[] = [];

  const cells = (cur: number): Cell[] =>
    [...s].map((value, i) => {
      let state: CellState | undefined;
      let tone: Tone | undefined;
      const part = cutEnds.findIndex((e) => i <= e);
      if (part !== -1) { state = 'sorted'; tone = TONES[part % TONES.length]; }
      else if (i === cur) state = 'active';
      else if (cur >= 0 && i >= start && i <= cur) state = 'compare';
      return { key: i, value, state, tone };
    });
  const aux = () => [
    { title: 'last index of each letter', kind: 'map' as const, items: [...last].map(([k, v]) => `${k} → ${v}`) },
    { title: 'partition sizes', kind: 'list' as const, items: parts.map(String) },
  ];
  const vars = (i: number | string) => ({ i, start, end, parts: parts.length });
  const add = (title: string, desc: string, logic: string, tone: LogicTone, cur: number, j: number[], p: number[], a: number) =>
    steps.push({
      title, desc, cells: cells(cur), aux: aux(), vars: vars(cur >= 0 ? cur : '—'), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a,
      pointers: cur >= 0 ? [
        { id: 'i', label: 'i', index: cur, tone: 'blue' as const },
        { id: 'end', label: 'end', index: Math.min(end, n - 1), tone: 'orange' as const },
        ...(start <= cur ? [{ id: 'start', label: 'start', index: start, tone: 'green' as const }] : []),
      ] : [],
    });

  add('Start', 'Cut the string into as many pieces as possible so that every letter appears in only one piece.',
    'A piece that contains a letter must also contain that letter\'s last occurrence. First record the last index of every letter.', 'info', -1, [1, 2], [1], 0);

  for (let i = 0; i < n; i++) {
    const ch = s[i];
    const old = end;
    end = Math.max(end, last.get(ch)!);
    add(`Read '${ch}' at ${i}: last '${ch}' is at ${last.get(ch)}`, end > old ? `The current piece must reach index ${last.get(ch)}, so end moves from ${old} to ${end}.` : `'${ch}' does not extend the piece: end stays ${end}.`,
      'end is the farthest last-occurrence of any letter inside the piece so far.', 'info', i, [6], [4], 1);
    if (i === end) {
      parts.push(end - start + 1);
      cutEnds.push(end);
      const from = start;
      start = i + 1;
      add(`Cut after index ${i}`, `We have reached end, so no letter in [${from}, ${i}] appears later. Piece size = ${i} − ${from} + 1 = ${parts[parts.length - 1]}.`,
        'Cutting as soon as i meets end makes this piece as short as possible, which maximises the number of pieces.', 'success', i, [7, 8, 9], [5, 6, 7], 2);
    }
  }

  const text = JSON.stringify(parts);
  add('Done', `The string splits into ${parts.length} piece${parts.length === 1 ? '' : 's'}: ${parts.join(', ')}.`, `Result: ${text}`, 'success', -1, [12], [8], 3);
  steps[steps.length - 1].result = { title: text, text: 'Sizes of the partitions' };
  return steps;
}

export const partitionLabels: ProblemDef<In> = {
  slug: '763-partition-labels',
  id: '763', title: 'Partition Labels', difficulty: 'Medium', category: 'Greedy', tag: 'last occurrence',
  statement: 'Split a string into as many parts as possible so that each letter appears in at most one part. Return the sizes of the parts in order.',
  constraints: '1 ≤ s.length ≤ 500, lowercase letters only (animation input is limited to 16 letters)',
  examples: [
    { label: 'ababcbacadefegde', input: { s: 'ababcbacadefegde' }, output: '[9,7]' },
    { label: 'eccbbbbdec', input: { s: 'eccbbbbdec' }, output: '[10]' },
    { label: 'abcabcdd', input: { s: 'abcabcdd' }, output: '[6,2]' },
  ],
  inputPlaceholder: 'lowercase letters, e.g. abcabcdd',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current letter', state: 'active' }, { label: 'Inside the current piece', state: 'compare' }, { label: 'Finished piece (colour = piece)', state: 'sorted' }],
  varLabels: ['i', 'start', 'end', 'parts'],
  approach: {
    title: 'Last occurrence decides the cut',
    text: 'Precompute the last index of each letter. Scan left to right, keeping end = the farthest last-occurrence among letters seen in the current piece. When the scan index reaches end, nothing in the piece appears later, so cut there and start a new piece.',
  },
  java: [
    'public List<Integer> partitionLabels(String s) {',
    '    int[] last = new int[26];',
    "    for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;",
    '    List<Integer> parts = new ArrayList<>();',
    '    int start = 0, end = 0;',
    '    for (int i = 0; i < s.length(); i++) {',
    "        end = Math.max(end, last[s.charAt(i) - 'a']);",
    '        if (i == end) {',
    '            parts.add(end - start + 1);',
    '            start = i + 1;',
    '        }',
    '    }',
    '    return parts;',
    '}',
  ],
  python: [
    'def partition_labels(s):',
    '    last = {ch: i for i, ch in enumerate(s)}',
    '    parts, start, end = [], 0, 0',
    '    for i, ch in enumerate(s):',
    '        end = max(end, last[ch])',
    '        if i == end:',
    '            parts.append(end - start + 1)',
    '            start = i + 1',
    '    return parts',
  ],
  algorithm: [
    'Record the last index of every letter',
    'Scan i from left to right; set end = max(end, last[s[i]])',
    'When i == end, close the piece (size end − start + 1) and set start = i + 1',
    'Return the list of piece sizes',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) (26 letters)' }],
  why: 'A piece may only be closed after the last occurrence of every letter inside it, so end is exactly the earliest legal cut point and it only moves right as new letters join the piece. Cutting at the first index where i equals end yields the shortest valid piece, and a shorter first piece never hurts the pieces after it, so the number of pieces is maximal.',
};
