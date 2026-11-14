import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { text: string }

const NEED: Record<string, number> = { b: 1, a: 1, l: 2, o: 2, n: 1 };

function parse(raw: string): In {
  const text = raw.trim().toLowerCase();
  if (!/^[a-z]+$/.test(text)) throw new Error('Use lowercase letters a-z only, e.g. loonbalballpoon');
  if (text.length > 15) throw new Error('Use 15 letters or fewer');
  return { text };
}

function build({ text }: In): Step[] {
  const steps: Step[] = [];
  const cnt: Record<string, number> = { b: 0, a: 0, l: 0, o: 0, n: 0 };
  const mapItems = () => Object.entries(cnt).map(([c, v]) => `${c} → ${v}`);
  const cells = (cur: number, final = false): Cell[] =>
    [...text].map((value, i) => {
      let state: CellState | undefined;
      if (final) state = value in NEED ? 'sorted' : 'dim';
      else if (i === cur) state = value in NEED ? 'found' : 'active';
      else if (i < cur) state = value in NEED ? 'sorted' : 'dim';
      return { key: i, value, state };
    });
  const vars = (i: number | string, ch: string, best: number | string) => ({ i, char: ch, 'max words': best });

  steps.push({
    title: 'Start', desc: `How many copies of "balloon" can be spelled using the letters of "${text}" (each letter used once)?`,
    cells: cells(-1), pointers: [], aux: [{ title: 'counts of b, a, l, o, n', kind: 'map', items: mapItems() }], vars: vars('—', '—', '—'),
    logic: '"balloon" needs b, a, n once each and l, o twice each. Only those five letters matter, so count them and see which one runs out first.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, tag: 'READY —', note: 'c = counts for b, a, l, o, n, all 0',
  });

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const rel = ch in NEED;
    if (rel) cnt[ch]++;
    steps.push({
      title: rel ? `Count '${ch}'` : `'${ch}' is not in "balloon"`, tag: rel ? 'COUNT' : 'SKIP',
      desc: rel ? `s[${i}]='${ch}' is part of "balloon" → count of ${ch} is now ${cnt[ch]}` : `s[${i}]='${ch}' is not in "balloon", so it is ignored`,
      cells: cells(i), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }],
      aux: [{ title: 'counts of b, a, l, o, n', kind: 'map', items: mapItems(), highlight: rel ? Object.keys(cnt).indexOf(ch) : undefined }], vars: vars(i, ch, '—'),
      alert: rel ? undefined : `'${ch}' can never be part of "balloon", so it is skipped.`,
      logic: rel ? 'Relevant letter: tally it.' : 'Letters outside b, a, l, o, n can never be part of the word.', logicTone: rel ? 'info' : 'warn',
      javaLines: [2], pyLines: [1], algoStep: 1, note: rel ? `c['${ch}'] = ${cnt[ch]}` : `'${ch}' not in b, a, l, o, n: no count change`,
    });
  }

  const limits = Object.entries(cnt).map(([c, v]) => ({ c, v, lim: Math.floor(v / NEED[c]) }));
  const best = Math.min(...limits.map((x) => x.lim));
  steps.push({
    title: 'Letters allow how many words?', tag: 'ALLOWANCE',
    desc: limits.map((x) => `${x.c}: ${x.v}${NEED[x.c] > 1 ? ` ÷ ${NEED[x.c]}` : ''} = ${x.lim}`).join(' · '),
    cells: cells(text.length, true), pointers: [],
    aux: [
      { title: 'counts of b, a, l, o, n', kind: 'map', items: mapItems() },
      { title: 'words each letter allows', kind: 'map', items: limits.map((x) => `${x.c} → ${x.lim}`) },
    ], vars: vars('—', '—', '—'),
    logic: 'l and o are needed twice per word, so their allowance is count ÷ 2 (rounded down). The scarcest letter caps the number of words.', logicTone: 'info',
    javaLines: [3, 4], pyLines: [2], algoStep: 2, note: `l: ${cnt.l} / 2 = ${limits[2].lim}, o: ${cnt.o} / 2 = ${limits[3].lim}`,
  });
  const limiting = limits.filter((x) => x.lim === best).map((x) => x.c);
  const lim = limiting.map((c) => `'${c}'`);
  const limText = lim.length > 1 ? `${lim.slice(0, -1).join(', ')} and ${lim[lim.length - 1]}` : lim[0];
  steps.push({
    title: 'Bottleneck letter', tag: 'MINIMUM',
    desc: `the smallest allowance is ${best}, set by ${limText}`,
    cells: cells(text.length, true), pointers: [],
    aux: [
      { title: 'counts of b, a, l, o, n', kind: 'map', items: mapItems() },
      { title: 'words each letter allows', kind: 'map', items: limits.map((x) => `${x.c} → ${x.lim}`), highlight: limits.findIndex((x) => x.lim === best), bad: limits.flatMap((x, k) => (x.lim === best ? [k] : [])) },
    ], vars: vars('—', '—', best),
    alert: best === 0 ? `${limText} allow${lim.length > 1 ? '' : 's'} 0 words, so "balloon" cannot be spelled even once.` : undefined,
    logic: 'Every copy needs all five letters at once, so the scarcest letter decides how many copies exist.', logicTone: best > 0 ? 'info' : 'warn',
    javaLines: [3, 4], pyLines: [2], algoStep: 3, note: `min(${limits.map((x) => x.lim).join(', ')}) = ${best}`,
  });
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `"balloon" can be spelled ${best} time${best === 1 ? '' : 's'}, limited by ${limText}`,
    cells: cells(text.length, true), pointers: [], aux: [{ title: 'counts of b, a, l, o, n', kind: 'map', items: mapItems() }], vars: vars('—', '—', best),
    logic: `You can spell "balloon" ${best} time${best === 1 ? '' : 's'}.`, logicTone: best > 0 ? 'success' : 'warn',
    javaLines: [3, 4], pyLines: [2], algoStep: 4, note: `return ${best}`,
    result: { title: String(best), text: `limited by ${limiting.join(', ')}` },
  });
  return steps;
}

export const maximumNumberOfBalloons: ProblemDef<In> = {
  slug: '1189-maximum-number-of-balloons',
  id: '1189', title: 'Maximum Number of Balloons', difficulty: 'Easy', category: 'Strings', tag: 'frequency map',
  statement: 'Given a string, return the maximum number of times the word "balloon" can be formed from its characters, using each character at most once.',
  constraints: '1 ≤ length ≤ 10⁴, lowercase letters (animation: up to 15 letters)',
  examples: [
    { label: '"nlaebolko"', input: { text: 'nlaebolko' }, output: '1' },
    { label: '"loonbalballpoon"', input: { text: 'loonbalballpoon' }, output: '2' },
    { label: '"leetcode"', input: { text: 'leetcode' }, output: '0' },
  ],
  inputPlaceholder: 'e.g. loonbalballpoon',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Counted letter', state: 'found' }, { label: 'Current (ignored)', state: 'active' }, { label: 'Counted before', state: 'sorted' }, { label: 'Ignored letter', state: 'dim' }],
  varLabels: ['i', 'char', 'max words'],
  emphasis: ['maximum number of times', 'balloon', 'at most once'],
  phases: [
    { icon: '🧮', label: 'SETUP counters', tone: 'blue' },
    { icon: '🔍', label: 'COUNT letters', tone: 'cyan' },
    { icon: '➗', label: 'ALLOWANCE per letter', tone: 'orange' },
    { icon: '⚖', label: 'BOTTLENECK (min)', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Count five letters, find the bottleneck',
    text: 'Tally b, a, l, o, n. Each word needs one b, a, n and two l, o, so divide the l and o counts by 2 and take the minimum over the five allowances.',
  },
  java: [
    'public int maxNumberOfBalloons(String text) {',
    '    int[] c = new int[26];',
    '    for (char ch : text.toCharArray()) c[ch - \'a\']++;',
    '    return Math.min(Math.min(c[\'b\' - \'a\'], c[\'a\' - \'a\']),',
    '           Math.min(Math.min(c[\'l\' - \'a\'] / 2, c[\'o\' - \'a\'] / 2), c[\'n\' - \'a\']));',
    '}',
  ],
  python: [
    'def max_number_of_balloons(text):',
    '    c = Counter(text)',
    "    return min(c['b'], c['a'], c['l'] // 2, c['o'] // 2, c['n'])",
  ],
  algorithm: [
    'Create counters for the letters b, a, l, o, n',
    'Scan the text and count only those letters',
    'Divide the l and o counts by 2 (they are needed twice)',
    'Take the minimum of the five allowances',
    'Return that minimum',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'Each copy of "balloon" consumes a fixed bundle of letters (b, a, n once; l, o twice). Letter x alone can supply ⌊count(x) / need(x)⌋ copies, and every copy needs all letters simultaneously, so the true maximum is the smallest of those independent limits.',
};
