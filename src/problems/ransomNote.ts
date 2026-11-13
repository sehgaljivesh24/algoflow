import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { ransom: string; magazine: string }

function parse(raw: string): In {
  const parts = raw.split(';');
  if (parts.length !== 2) throw new Error('Format: ransomNote ; magazine — e.g. aab ; baa');
  const ransom = parts[0].trim().toLowerCase();
  const magazine = parts[1].trim().toLowerCase();
  if (!ransom || !magazine) throw new Error('Both strings must be non-empty');
  if (!/^[a-z]+$/.test(ransom) || !/^[a-z]+$/.test(magazine)) throw new Error('Use lowercase letters a-z only');
  if (ransom.length > 8 || magazine.length > 12) throw new Error('Use a note of 8 letters or fewer and a magazine of 12 or fewer');
  return { ransom, magazine };
}

function build({ ransom, magazine }: In): Step[] {
  const steps: Step[] = [];
  const count = new Map<string, number>();
  const mapItems = () => [...count].map(([c, k]) => `${c} → ${k}`);
  const vars = (c: string, left: number | string) => ({ char: c, 'magazine letters': magazine.length, 'note left': left });

  const magCells = (upto: number): Cell[] => [...magazine].map((c, i) => ({ key: i, value: c, state: (i < upto ? 'sorted' : i === upto ? 'active' : undefined) as CellState | undefined }));
  const noteCells = (cur: number, bad = false): Cell[] => [...ransom].map((c, i) => {
    let state: CellState | undefined;
    if (bad && i === cur) state = 'error';
    else if (i === cur) state = 'active';
    else if (i < cur) state = 'found';
    return { key: `r${i}`, value: c, state };
  });
  const grid = (mag: Cell[], note: Cell[]) => {
    const w = Math.max(mag.length, note.length);
    const pad = (row: Cell[], tag: string): Cell[] => [...row, ...Array.from({ length: w - row.length }, (_, k) => ({ key: `${tag}pad${k}`, value: '', state: 'dim' as CellState }))];
    return { kind: 'grid' as const, rows: [pad(mag, 'm'), pad(note, 'n')], rowHeads: ['magazine', 'note'] };
  };

  steps.push({
    title: 'Start', desc: `Can "${ransom}" be cut out of the letters of "${magazine}"? Each magazine letter may be used once.`,
    scene: grid(magCells(0).map((c) => ({ ...c, state: undefined })), noteCells(-1)), aux: [{ title: 'letters available', kind: 'map', items: [] }], vars: vars('—', ransom.length),
    logic: 'This is a counting problem: for each letter, the magazine must supply at least as many copies as the note needs.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 0; i < magazine.length; i++) {
    count.set(magazine[i], (count.get(magazine[i]) ?? 0) + 1);
    steps.push({
      title: `Count magazine letter '${magazine[i]}'`, desc: `'${magazine[i]}' now has ${count.get(magazine[i])} available.`,
      scene: grid(magCells(i), noteCells(-1)), aux: [{ title: 'letters available', kind: 'map', items: mapItems(), highlight: [...count.keys()].indexOf(magazine[i]) }],
      vars: vars(magazine[i], ransom.length),
      logic: 'Build the supply table in one pass over the magazine.', logicTone: 'info', javaLines: [2], pyLines: [1], algoStep: 1,
    });
  }

  for (let i = 0; i < ransom.length; i++) {
    const c = ransom[i];
    const have = count.get(c) ?? 0;
    if (have === 0) {
      steps.push({
        title: `No '${c}' left`, desc: `The note needs '${c}' (position ${i}), but the magazine has none left.`,
        scene: grid(magCells(magazine.length), noteCells(i, true)), aux: [{ title: 'letters available', kind: 'map', items: mapItems() }], vars: vars(c, ransom.length - i),
        logic: 'One missing letter is enough to make the note impossible.', logicTone: 'warn', javaLines: [6, 7], pyLines: [4, 5], algoStep: 3,
        result: { title: 'false', text: `Not enough '${c}' in the magazine` },
      });
      return steps;
    }
    count.set(c, have - 1);
    steps.push({
      title: `Use a '${c}'`, desc: `Spend one '${c}': ${have} → ${have - 1} left.`,
      scene: grid(magCells(magazine.length), noteCells(i)), aux: [{ title: 'letters available', kind: 'map', items: mapItems(), highlight: [...count.keys()].indexOf(c) }],
      vars: vars(c, ransom.length - i - 1),
      logic: 'Each note letter consumes exactly one copy from the supply.', logicTone: 'success', javaLines: [5, 6, 8], pyLines: [3, 4, 6], algoStep: 2,
    });
  }

  steps.push({
    title: 'Note completed', desc: 'Every letter of the note was available.',
    scene: grid(magCells(magazine.length), noteCells(ransom.length)), aux: [{ title: 'letters available', kind: 'map', items: mapItems() }], vars: vars('—', 0),
    logic: 'No letter ran out, so the note can be built.', logicTone: 'success', javaLines: [10], pyLines: [7], algoStep: 3,
    result: { title: 'true', text: 'The note can be constructed' },
  });
  return steps;
}

export const ransomNote: ProblemDef<In> = {
  slug: '383-ransom-note',
  id: '383', title: 'Ransom Note', difficulty: 'Easy', category: 'Arrays', tag: 'frequency map',
  statement: 'Given a ransom note and a magazine (both lowercase strings), decide whether the note can be assembled from the magazine letters. Every magazine letter can be used at most once.',
  constraints: '1 ≤ lengths ≤ 10⁵, lowercase letters (animation: note ≤ 8, magazine ≤ 12)',
  examples: [
    { label: '"a", "b"', input: { ransom: 'a', magazine: 'b' }, output: 'false' },
    { label: '"aa", "aab"', input: { ransom: 'aa', magazine: 'aab' }, output: 'true' },
    { label: '"aab", "baa"', input: { ransom: 'aab', magazine: 'baa' }, output: 'true' },
    { label: '"aaa", "baab"', input: { ransom: 'aaa', magazine: 'baab' }, output: 'false' },
  ],
  inputPlaceholder: 'e.g. aab ; baa',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Reading', state: 'active' }, { label: 'Counted', state: 'sorted' }, { label: 'Letter satisfied', state: 'found' }, { label: 'Missing letter', state: 'error' }],
  varLabels: ['char', 'magazine letters', 'note left'],
  approach: {
    title: 'Count the supply, then spend it',
    text: 'Tally how many of each letter the magazine has. Then walk through the note and subtract one for each letter; if any count would go below zero, the note cannot be built.',
  },
  java: [
    'public boolean canConstruct(String ransomNote, String magazine) {',
    '    int[] count = new int[26];',
    '    for (char c : magazine.toCharArray()) count[c - \'a\']++;',
    '    // count[c] = how many copies of c are available',
    '    for (char c : ransomNote.toCharArray()) {',
    '        // spend one copy of c',
    '        if (count[c - \'a\'] == 0)',
    '            return false;',
    '        count[c - \'a\']--;',
    '    }',
    '    return true;',
    '}',
  ],
  python: [
    'def can_construct(ransom_note, magazine):',
    '    count = Counter(magazine)',
    '    # count[c] = how many copies of c are available',
    '    for c in ransom_note:',
    '        if count[c] == 0:',
    '            return False',
    '        count[c] -= 1',
    '    return True',
  ],
  algorithm: [
    'Create a letter-count table for the magazine',
    'Fill it by scanning every magazine letter',
    'For each letter of the note, decrement its count',
    'If a count is already zero return false; if the note ends return true',
  ],
  complexity: [{ label: 'Time', value: 'O(n + m)' }, { label: 'Space', value: 'O(1) — at most 26 letters' }],
  why: 'The note is buildable exactly when, for every letter, count in magazine ≥ count in note. Decrementing as we consume letters checks that condition one letter at a time: the first time a count is zero while the note still needs it, the inequality is violated.',
};
