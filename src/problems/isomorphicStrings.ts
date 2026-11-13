import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';

interface In { s: string; t: string }

function parse(raw: string): In {
  const parts = raw.split(';');
  if (parts.length !== 2) throw new Error('Format: s ; t — e.g. egg ; add');
  const s = parts[0].trim();
  const t = parts[1].trim();
  if (!s || !t) throw new Error('Both strings must be non-empty');
  if (/\s/.test(s) || /\s/.test(t)) throw new Error('Strings cannot contain spaces');
  if (s.length !== t.length) throw new Error('The two strings must have the same length');
  if (s.length > 10) throw new Error('Use 10 characters or fewer');
  return { s, t };
}

function build({ s, t }: In): Step[] {
  const steps: Step[] = [];
  const n = s.length;
  const st = new Map<string, string>();
  const ts = new Map<string, string>();
  const items = (m: Map<string, string>) => [...m].map(([k, v]) => `${k} → ${v}`);
  const aux = (hlS?: number, hlT?: number) => [
    { title: 's → t', kind: 'map' as const, items: items(st), highlight: hlS },
    { title: 't → s', kind: 'map' as const, items: items(ts), highlight: hlT },
  ];
  const scene = (cur: number, bad = false) => {
    const row = (str: string, tag: string): Cell[] => [...str].map((c, i) => {
      let state: CellState | undefined;
      if (i === cur) state = bad ? 'error' : 'active';
      else if (i < cur) state = 'sorted';
      return { key: `${tag}${i}`, value: c, state };
    });
    return { kind: 'grid' as const, rows: [row(s, 's'), row(t, 't')], rowHeads: ['s', 't'], colHeads: [...s].map((_, i) => String(i)) };
  };
  const vars = (i: number | string, a: string, b: string) => ({ i, a, b });

  steps.push({
    title: 'Start', desc: `Can the letters of "${s}" be consistently replaced to produce "${t}"?`,
    scene: scene(-1), aux: aux(), vars: vars('—', '—', '—'),
    logic: 'Isomorphic means a one-to-one pairing of letters: the same letter always maps to the same partner, and two different letters never share a partner. That needs a map in each direction.', logicTone: 'info',
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0,
  });

  for (let i = 0; i < n; i++) {
    const a = s[i];
    const b = t[i];
    if (st.has(a) && st.get(a) !== b) {
      steps.push({
        title: `Conflict: '${a}' already maps to '${st.get(a)}'`, desc: `Position ${i} would map '${a}' → '${b}', but earlier '${a}' → '${st.get(a)}'.`,
        scene: scene(i, true), aux: aux([...st.keys()].indexOf(a)), vars: vars(i, a, b),
        logic: 'One letter would need two different replacements, so no valid mapping exists.', logicTone: 'warn', javaLines: [4], pyLines: [3, 4], algoStep: 2,
        result: { title: 'false', text: `'${a}' cannot map to both '${st.get(a)}' and '${b}'` },
      });
      return steps;
    }
    if (ts.has(b) && ts.get(b) !== a) {
      steps.push({
        title: `Conflict: '${b}' is already taken by '${ts.get(b)}'`, desc: `Position ${i} would map '${a}' → '${b}', but '${b}' is already the image of '${ts.get(b)}'.`,
        scene: scene(i, true), aux: aux(undefined, [...ts.keys()].indexOf(b)), vars: vars(i, a, b),
        logic: 'Two different letters would share one replacement, breaking the one-to-one rule.', logicTone: 'warn', javaLines: [5], pyLines: [5, 6], algoStep: 2,
        result: { title: 'false', text: `'${ts.get(b)}' and '${a}' would both map to '${b}'` },
      });
      return steps;
    }
    const known = st.has(a);
    st.set(a, b);
    ts.set(b, a);
    steps.push({
      title: known ? `'${a}' → '${b}' is consistent` : `New pair '${a}' ↔ '${b}'`, desc: known ? `The existing pairing '${a}' → '${b}' is repeated, so it still holds.` : `Neither letter has been paired yet; record '${a}' → '${b}' and '${b}' → '${a}'.`,
      scene: scene(i), aux: aux([...st.keys()].indexOf(a), [...ts.keys()].indexOf(b)), vars: vars(i, a, b),
      logic: 'Check both directions before recording, then store both maps.', logicTone: known ? 'info' : 'success', javaLines: [3, 6, 7], pyLines: [2, 7], algoStep: 1,
    });
  }

  steps.push({
    title: 'Isomorphic', desc: 'Every position agreed with a single one-to-one pairing.',
    scene: scene(n), aux: aux(), vars: vars('—', '—', '—'),
    logic: 'No conflicts in either direction, so the pairing is a valid bijection.', logicTone: 'success', javaLines: [9], pyLines: [8], algoStep: 3,
    result: { title: 'true', text: 'The strings are isomorphic' },
  });
  return steps;
}

export const isomorphicStrings: ProblemDef<In> = {
  slug: '205-isomorphic-strings',
  id: '205', title: 'Isomorphic Strings', difficulty: 'Easy', category: 'Strings', tag: 'bijection map',
  statement: 'Two strings are isomorphic if the characters of the first can be replaced to get the second, where every occurrence of a character is replaced by the same character, order is preserved, and no two characters map to the same one.',
  constraints: '1 ≤ length ≤ 5·10⁴, equal lengths (animation: up to 10 characters)',
  examples: [
    { label: '"egg", "add"', input: { s: 'egg', t: 'add' }, output: 'true' },
    { label: '"foo", "bar"', input: { s: 'foo', t: 'bar' }, output: 'false' },
    { label: '"badc", "baba"', input: { s: 'badc', t: 'baba' }, output: 'false' },
  ],
  inputPlaceholder: 'e.g. egg ; add',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current pair', state: 'active' }, { label: 'Checked', state: 'sorted' }, { label: 'Conflict', state: 'error' }],
  varLabels: ['i', 'a', 'b'],
  approach: {
    title: 'Two maps enforce a one-to-one pairing',
    text: 'Walk both strings together. Keep a map s→t and a map t→s. If either map already holds a different partner for the current letter, the strings are not isomorphic.',
  },
  java: [
    'public boolean isIsomorphic(String s, String t) {',
    '    Map<Character, Character> st = new HashMap<>(), ts = new HashMap<>();',
    '    for (int i = 0; i < s.length(); i++) {',
    '        char a = s.charAt(i), b = t.charAt(i);',
    '        if (st.containsKey(a) && st.get(a) != b) return false;',
    '        if (ts.containsKey(b) && ts.get(b) != a) return false;',
    '        st.put(a, b);',
    '        ts.put(b, a);',
    '    }',
    '    return true;',
    '}',
  ],
  python: [
    'def is_isomorphic(s, t):',
    '    st, ts = {}, {}',
    '    for a, b in zip(s, t):',
    '        if a in st and st[a] != b:',
    '            return False',
    '        if b in ts and ts[b] != a:',
    '            return False',
    '        st[a], ts[b] = b, a',
    '    return True',
  ],
  algorithm: [
    'Create two empty maps: s→t and t→s',
    'For each position read a = s[i] and b = t[i]',
    'If a is already mapped elsewhere, or b is already the image of another letter, return false',
    'Otherwise record both directions; return true after the last position',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) for a fixed alphabet' }],
  why: 'A valid replacement is a bijection between the letters used. One map alone only guarantees a function (each s-letter has one image); it cannot see two s-letters landing on the same t-letter, as in "badc" vs "baba". The reverse map catches exactly that.',
};
