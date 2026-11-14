import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';

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
    javaLines: [0, 1], pyLines: [0, 1], algoStep: 0, tag: 'READY —', note: 'st = {}, ts = {}',
  });

  for (let i = 0; i < n; i++) {
    const a = s[i];
    const b = t[i];
    steps.push({
      title: `Read position ${i}: '${a}' and '${b}'`, tag: 'READ',
      desc: `position ${i}: s[${i}]='${a}' should become t[${i}]='${b}'`,
      scene: scene(i), aux: aux(), vars: vars(i, a, b),
      logic: 'Each position proposes one pairing of an s-letter with a t-letter.', logicTone: 'info',
      javaLines: [2, 3], pyLines: [2], algoStep: 1, note: `a = s.charAt(${i}) = '${a}', b = t.charAt(${i}) = '${b}'`,
    });
    const conflictA = st.has(a) && st.get(a) !== b;
    const conflictB = !conflictA && ts.has(b) && ts.get(b) !== a;
    if (conflictA || conflictB) {
      const other = conflictA ? st.get(a)! : ts.get(b)!;
      steps.push({
        title: conflictA ? `Conflict: '${a}' already maps to '${other}'` : `Conflict: '${b}' is already taken by '${other}'`, tag: 'CONFLICT',
        desc: conflictA
          ? `'${a}' would map to '${b}', but earlier '${a}' → '${other}', so one letter needs two replacements`
          : `'${a}' would map to '${b}', but '${b}' is already the image of '${other}', so two letters share one replacement`,
        scene: scene(i, true), aux: conflictA ? aux([...st.keys()].indexOf(a)) : aux(undefined, [...ts.keys()].indexOf(b)), vars: vars(i, a, b),
        alert: conflictA ? `'${a}' → '${other}' is already recorded, so '${a}' cannot also map to '${b}'.` : `'${b}' is already used by '${other}', so '${a}' cannot map to it as well.`,
        logic: conflictA ? 'One letter would need two different replacements, so no valid mapping exists.' : 'Two different letters would share one replacement, breaking the one-to-one rule.', logicTone: 'warn',
        javaLines: conflictA ? [4] : [5], pyLines: conflictA ? [3, 4] : [5, 6], algoStep: 2,
        note: conflictA ? `st.get('${a}') = '${other}' != '${b}' → return false` : `ts.get('${b}') = '${other}' != '${a}' → return false`,
      });
      steps.push({
        title: 'Not isomorphic', tag: '✅ Done!',
        desc: conflictA ? `the answer is false: '${a}' cannot map to both '${other}' and '${b}'` : `the answer is false: '${other}' and '${a}' would both map to '${b}'`,
        scene: scene(i, true), aux: conflictA ? aux([...st.keys()].indexOf(a)) : aux(undefined, [...ts.keys()].indexOf(b)), vars: vars(i, a, b),
        logic: 'The scan stops at the first conflict.', logicTone: 'warn', javaLines: conflictA ? [4] : [5], pyLines: conflictA ? [4] : [6], algoStep: 4, note: 'return false',
        result: conflictA ? { title: 'false', text: `'${a}' cannot map to both '${other}' and '${b}'` } : { title: 'false', text: `'${other}' and '${a}' would both map to '${b}'` },
      });
      return steps;
    }
    const known = st.has(a);
    steps.push({
      title: known ? `'${a}' → '${b}' is consistent` : `Neither '${a}' nor '${b}' is used yet`, tag: 'CHECK',
      desc: known ? `st already holds '${a}' → '${b}', and '${b}' belongs to '${a}', so the pairing still holds` : `'${a}' has no partner and '${b}' is not taken, so the pairing is allowed`,
      scene: scene(i), aux: aux([...st.keys()].indexOf(a), [...ts.keys()].indexOf(b)), vars: vars(i, a, b),
      logic: 'Check both directions before recording.', logicTone: 'info', javaLines: [4, 5], pyLines: [3, 5], algoStep: 2,
      note: known ? `st.get('${a}') == '${b}': consistent` : `no conflict in st for '${a}' or in ts for '${b}'`,
    });
    st.set(a, b);
    ts.set(b, a);
    steps.push({
      title: known ? `Keep '${a}' ↔ '${b}'` : `Record '${a}' ↔ '${b}'`, tag: 'RECORD',
      desc: known ? `record again: st['${a}'] = '${b}' and ts['${b}'] = '${a}' (unchanged)` : `record both directions: st['${a}'] = '${b}' and ts['${b}'] = '${a}'`,
      scene: scene(i), aux: aux([...st.keys()].indexOf(a), [...ts.keys()].indexOf(b)), vars: vars(i, a, b),
      logic: 'Store both maps so later positions are checked in both directions.', logicTone: known ? 'info' : 'success', javaLines: [6, 7], pyLines: [7], algoStep: 3,
      note: `st.put('${a}', '${b}'); ts.put('${b}', '${a}')`,
    });
  }

  steps.push({
    title: 'Isomorphic', tag: '✅ Done!', desc: `all ${plural(n, 'position')} agreed with one one-to-one pairing, so the answer is true`,
    scene: scene(n), aux: aux(), vars: vars('—', '—', '—'),
    logic: 'No conflicts in either direction, so the pairing is a valid bijection.', logicTone: 'success', javaLines: [9], pyLines: [8], algoStep: 4, note: 'return true',
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
  emphasis: ['isomorphic', 'no two characters map to the same one'],
  phases: [
    { icon: '🗺', label: 'SETUP two maps', tone: 'blue' },
    { icon: '👀', label: 'READ the pair', tone: 'cyan' },
    { icon: '🔍', label: 'CHECK both maps', tone: 'gold' },
    { icon: '📝', label: 'RECORD both ways', tone: 'green' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
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
    'Otherwise record both directions',
    'Return true after the last position (or false at the first conflict)',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) for a fixed alphabet' }],
  why: 'A valid replacement is a bijection between the letters used. One map alone only guarantees a function (each s-letter has one image); it cannot see two s-letters landing on the same t-letter, as in "badc" vs "baba". The reverse map catches exactly that.',
};
