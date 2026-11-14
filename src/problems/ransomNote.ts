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
    title: 'Start', tag: 'START —', desc: `Can "${ransom}" be cut out of the ${magazine.length} letters of "${magazine}"? Each magazine letter may be used only once.`,
    scene: grid(magCells(0).map((c) => ({ ...c, state: undefined })), noteCells(-1)), aux: [{ title: 'letters available', kind: 'map', items: [] }], vars: vars('—', ransom.length),
    logic: 'This is a counting problem: for each letter, the magazine must supply at least as many copies as the note needs.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, note: 'count table is empty',
  });

  for (let i = 0; i < magazine.length; i++) {
    count.set(magazine[i], (count.get(magazine[i]) ?? 0) + 1);
    steps.push({
      title: `Count magazine letter '${magazine[i]}'`, tag: 'COUNT:', desc: `read magazine[${i}]='${magazine[i]}', so '${magazine[i]}' now has ${count.get(magazine[i])} cop${count.get(magazine[i]) === 1 ? 'y' : 'ies'} available.`,
      scene: grid(magCells(i), noteCells(-1)), aux: [{ title: 'letters available', kind: 'map', items: mapItems(), highlight: [...count.keys()].indexOf(magazine[i]) }],
      vars: vars(magazine[i], ransom.length),
      logic: 'Build the supply table in one pass over the magazine.', logicTone: 'info', javaLines: [2], pyLines: [1], algoStep: 1,
      note: `count['${magazine[i]}'] = ${count.get(magazine[i])}`,
    });
  }
  steps.push({
    title: 'Supply table complete', tag: 'COUNT:', desc: `the whole magazine is counted (${mapItems().join(', ')}); now spend letters for "${ransom}".`,
    scene: grid(magCells(magazine.length), noteCells(-1)), aux: [{ title: 'letters available', kind: 'map', items: mapItems() }], vars: vars('—', ransom.length),
    logic: 'From here on the magazine is never read again: only the table matters.', logicTone: 'info', javaLines: [3, 4], pyLines: [2, 3], algoStep: 1,
    note: `${magazine.length} letters counted`,
  });

  for (let i = 0; i < ransom.length; i++) {
    const c = ransom[i];
    const have = count.get(c) ?? 0;
    steps.push({
      title: `Look up '${c}'`, tag: 'LOOKUP:', desc: `note[${i}]='${c}' needs a copy: the table says '${c}' has ${have} left.`,
      scene: grid(magCells(magazine.length), noteCells(i)), aux: [{ title: 'letters available', kind: 'map', items: mapItems(), highlight: [...count.keys()].indexOf(c) }],
      vars: vars(c, ransom.length - i),
      logic: 'A letter can be used only while its count is above zero.', logicTone: 'info', javaLines: [4, 6], pyLines: [3, 4], algoStep: 2,
      note: `count['${c}'] = ${have}`,
    });
    if (have === 0) {
      steps.push({
        title: `No '${c}' left`, tag: 'REJECT:', desc: `note[${i}]='${c}' has no copy left, so "${ransom}" cannot be built.`,
        scene: grid(magCells(magazine.length), noteCells(i, true)), aux: [{ title: 'letters available', kind: 'map', items: mapItems(), bad: [...count.keys()].flatMap((k, j) => (k === c ? [j] : [])) }], vars: vars(c, ransom.length - i),
        alert: `Not enough '${c}': the magazine ran out before note[${i}].`,
        logic: 'One missing letter is enough to make the note impossible.', logicTone: 'warn', javaLines: [6, 7], pyLines: [4, 5], algoStep: 3,
        note: `${have} = 0 → return false`,
      });
      steps.push({
        title: 'Cannot construct', tag: '✅ Done!', desc: `the answer is false: '${c}' was needed at note[${i}] but the supply was empty.`,
        scene: grid(magCells(magazine.length), noteCells(i, true)), aux: [{ title: 'letters available', kind: 'map', items: mapItems() }], vars: vars(c, ransom.length - i),
        logic: 'Failing one letter fails the whole note; there is no need to check the rest.', logicTone: 'success', javaLines: [7], pyLines: [5], algoStep: 4,
        note: 'return false',
        result: { title: 'false', text: `Not enough '${c}' in the magazine` },
      });
      return steps;
    }
    count.set(c, have - 1);
    steps.push({
      title: `Use a '${c}'`, tag: 'SPEND:', desc: `cut '${c}' out of the magazine: its count goes ${have} → ${have - 1}, ${ransom.length - i - 1} note letter${ransom.length - i - 1 === 1 ? '' : 's'} to go.`,
      scene: grid(magCells(magazine.length), noteCells(i)), aux: [{ title: 'letters available', kind: 'map', items: mapItems(), highlight: [...count.keys()].indexOf(c) }],
      vars: vars(c, ransom.length - i - 1),
      logic: 'Each note letter consumes exactly one copy from the supply.', logicTone: 'success', javaLines: [8], pyLines: [6], algoStep: 3,
      note: `count['${c}'] = ${have} − 1 = ${have - 1}`,
    });
  }

  steps.push({
    title: 'Note completed', tag: '✅ Done!', desc: `all ${ransom.length} letters of "${ransom}" were available, so the note can be built.`,
    scene: grid(magCells(magazine.length), noteCells(ransom.length)), aux: [{ title: 'letters available', kind: 'map', items: mapItems() }], vars: vars('—', 0),
    logic: 'No letter ran out, so the note can be built.', logicTone: 'success', javaLines: [10], pyLines: [7], algoStep: 4,
    note: 'return true',
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
    { label: '"aab", "baa"', input: { ransom: 'aab', magazine: 'baa' }, output: 'true', answer: 'true (a ×2 and b ×1 are all in the magazine)' },
    { label: '"aaa", "baab"', input: { ransom: 'aaa', magazine: 'baab' }, output: 'false', answer: 'false (only two a in the magazine)' },
    { label: '"aa", "aab"', input: { ransom: 'aa', magazine: 'aab' }, output: 'true' },
    { label: '"a", "b"', input: { ransom: 'a', magazine: 'b' }, output: 'false' },
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
  phases: [
    { icon: '🧰', label: 'Create count table', tone: 'blue' },
    { icon: '📥', label: 'Count magazine', tone: 'cyan' },
    { icon: '🔍', label: 'Look up note letter', tone: 'gold' },
    { icon: '✂️', label: 'Spend / reject', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['assembled from the magazine letters', 'at most once'],
  algorithm: [
    'Create a letter-count table for the magazine',
    'Fill it by scanning every magazine letter',
    'For each letter of the note, look up its count',
    'If the count is zero return false, otherwise spend one copy',
    'Done: return true when the note is finished',
  ],
  complexity: [{ label: 'Time', value: 'O(n + m)' }, { label: 'Space', value: 'O(1) — at most 26 letters' }],
  why: 'The note is buildable exactly when, for every letter, count in magazine ≥ count in note. Decrementing as we consume letters checks that condition one letter at a time: the first time a count is zero while the note still needs it, the inequality is violated.',
};
