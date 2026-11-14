import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';

interface In { s: string; t: string }

function parse(raw: string): In {
  const parts = raw.split(';');
  if (parts.length !== 2) throw new Error('Format: s ; t — e.g. anagram ; nagaram');
  const s = parts[0].trim().toLowerCase();
  const t = parts[1].trim().toLowerCase();
  if (!/^[a-z]+$/.test(s) || !/^[a-z]+$/.test(t)) throw new Error('Use lowercase letters a-z only (both strings non-empty)');
  if (s.length > 10 || t.length > 10) throw new Error('Use 10 letters or fewer in each string');
  return { s, t };
}

function build({ s, t }: In): Step[] {
  const steps: Step[] = [];
  const count = new Map<string, number>();
  const items = () => [...count].map(([c, v]) => `${c} → ${v}`);
  const scene = (rowS: number, rowT: number, bad: string[] = []) => {
    const w = Math.max(s.length, t.length);
    const mk = (str: string, tag: string, upto: number): Cell[] => Array.from({ length: w }, (_, i) => {
      const c = i < str.length ? str[i] : '';
      let state: CellState | undefined;
      if (!c) state = 'dim';
      else if (bad.includes(c)) state = 'error';
      else if (i === upto - 1) state = 'active';
      else if (i < upto) state = 'sorted';
      return { key: `${tag}${i}`, value: c, state };
    });
    return { kind: 'grid' as const, rows: [mk(s, 's', rowS), mk(t, 't', rowT)], rowHeads: ['s', 't'] };
  };
  const aux = (hl?: string) => [{ title: 'letter balance (s adds, t removes)', kind: 'map' as const, items: items(), highlight: hl ? [...count.keys()].indexOf(hl) : undefined }];
  const vars = (i: number | string, ch: string, phase: string) => ({ i, char: ch, phase });

  steps.push({
    title: 'Start', desc: `Are "${s}" and "${t}" made of exactly the same letters?`,
    scene: scene(0, 0), aux: aux(), vars: vars('—', '—', 'start'),
    logic: 'Two strings are anagrams exactly when every letter appears equally often in both. We count letters of s up and letters of t down; a perfect cancel-out means anagram.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0, tag: 'READY —', note: `s = "${s}", t = "${t}"`,
  });

  if (s.length !== t.length) {
    steps.push({
      title: 'Different lengths', tag: 'LENGTH CHECK', desc: `"${s}" has ${plural(s.length, 'letter')} and "${t}" has ${t.length}, so they cannot match`,
      scene: scene(0, 0), aux: aux(), vars: vars('—', '—', 'length check'),
      alert: `Lengths differ (${s.length} vs ${t.length}): an anagram needs the same number of letters, so counting is skipped.`,
      logic: 'Anagrams must contain the same number of letters. This quick check avoids all counting.', logicTone: 'warn', javaLines: [1], pyLines: [1, 2], algoStep: 0,
      note: `${s.length} != ${t.length} → return false`,
    });
    steps.push({
      title: 'Not an anagram', tag: '✅ Done!', desc: `the answer is false because the lengths ${s.length} and ${t.length} differ`,
      scene: scene(0, 0), aux: aux(), vars: vars('—', '—', 'verdict'),
      logic: 'The early exit decides the answer without any counting.', logicTone: 'warn', javaLines: [1], pyLines: [2], algoStep: 3, note: 'return false',
      result: { title: 'false', text: 'Lengths differ' },
    });
    return steps;
  }
  steps.push({
    title: 'Lengths match', tag: 'LENGTH CHECK', desc: `both strings have ${plural(s.length, 'letter')}, so counting can begin`,
    scene: scene(0, 0), aux: aux(), vars: vars('—', '—', 'length check'),
    logic: 'Equal lengths are necessary; the counts decide the rest.', logicTone: 'info', javaLines: [1, 2], pyLines: [1, 3], algoStep: 0,
    note: `${s.length} == ${t.length}, count = new int[26]`,
  });

  for (let i = 0; i < s.length; i++) {
    count.set(s[i], (count.get(s[i]) ?? 0) + 1);
    steps.push({
      title: `Count '${s[i]}' from s`, tag: 'COUNT UP', desc: `s[${i}]='${s[i]}' adds one, so the balance of '${s[i]}' becomes ${count.get(s[i])}`,
      scene: scene(i + 1, 0), aux: aux(s[i]), vars: vars(i, s[i], 'count s'),
      logic: 'Letters of s add one each.', logicTone: 'info', javaLines: [3], pyLines: [4, 5], algoStep: 1, note: `count['${s[i]}']++ → ${count.get(s[i])}`,
    });
  }
  for (let i = 0; i < t.length; i++) {
    count.set(t[i], (count.get(t[i]) ?? 0) - 1);
    const neg = count.get(t[i])! < 0;
    steps.push({
      title: `Cancel '${t[i]}' from t`, tag: 'COUNT DOWN', desc: `t[${i}]='${t[i]}' removes one, so the balance of '${t[i]}' becomes ${count.get(t[i])}${neg ? ': negative, t has more of this letter than s' : ''}`,
      scene: scene(s.length, i + 1, neg ? [t[i]] : []), aux: aux(t[i]), vars: vars(i, t[i], 'cancel t'),
      alert: neg ? `'${t[i]}' dropped below zero: t uses it more often than s provides, so this cannot be an anagram.` : undefined,
      logic: neg ? 'A negative balance means t uses a letter more often than s provides — they cannot be anagrams.' : 'Each letter of t removes one, so matching letters cancel back toward 0.', logicTone: neg ? 'warn' : 'info',
      javaLines: [4], pyLines: [6, 7], algoStep: 2, note: `count['${t[i]}']-- → ${count.get(t[i])}`,
    });
  }

  const bad = [...count].filter(([, v]) => v !== 0).map(([c]) => c);
  const ok = bad.length === 0;
  steps.push({
    title: ok ? 'All balances are zero' : 'Some balance is not zero', tag: '✅ Done!',
    desc: ok ? `every letter cancelled out exactly, so "${t}" is an anagram of "${s}"` : `letters left over: ${bad.map((c) => `${c} (${count.get(c)})`).join(', ')}, so the answer is false`,
    scene: scene(s.length, t.length, bad), aux: aux(), vars: vars('—', '—', 'verdict'),
    alert: ok ? undefined : `Non-zero balance: ${bad.map((c) => `${c} (${count.get(c)})`).join(', ')}. The letter counts differ.`,
    note: ok ? 'all counts == 0 → return true' : `count['${bad[0]}'] = ${count.get(bad[0])} != 0 → return false`,
    logic: ok ? 'Same letters with the same counts: valid anagram.' : 'A non-zero balance means the letter counts differ.', logicTone: ok ? 'success' : 'warn',
    javaLines: ok ? [5, 6] : [5], pyLines: [8], algoStep: 3,
    result: { title: String(ok), text: ok ? 'The strings are anagrams' : 'The strings are not anagrams' },
  });
  return steps;
}

export const validAnagram: ProblemDef<In> = {
  slug: '242-valid-anagram',
  id: '242', title: 'Valid Anagram', difficulty: 'Easy', category: 'Strings', tag: 'frequency count',
  statement: 'Given two strings s and t, return true if t is a rearrangement of the letters of s, using every letter exactly once.',
  constraints: '1 ≤ length ≤ 5·10⁴, lowercase letters (animation: up to 10 letters each)',
  examples: [
    { label: '"anagram", "nagaram"', input: { s: 'anagram', t: 'nagaram' }, output: 'true' },
    { label: '"rat", "car"', input: { s: 'rat', t: 'car' }, output: 'false' },
    { label: '"listen", "silent"', input: { s: 'listen', t: 'silent' }, output: 'true' },
  ],
  inputPlaceholder: 'e.g. anagram ; nagaram',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current letter', state: 'active' }, { label: 'Counted', state: 'sorted' }, { label: 'Unbalanced letter', state: 'error' }],
  varLabels: ['i', 'char', 'phase'],
  emphasis: ['rearrangement', 'every letter exactly once'],
  phases: [
    { icon: '📏', label: 'LENGTH check', tone: 'blue' },
    { icon: '⬆', label: 'COUNT UP letters of s', tone: 'cyan' },
    { icon: '⬇', label: 'COUNT DOWN letters of t', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Count up for s, count down for t',
    text: 'If the lengths differ, answer false. Otherwise add 1 for each letter of s and subtract 1 for each letter of t in one table; the strings are anagrams exactly when every entry ends at 0.',
  },
  java: [
    'public boolean isAnagram(String s, String t) {',
    '    if (s.length() != t.length()) return false;',
    '    int[] count = new int[26];',
    '    for (char c : s.toCharArray()) count[c - \'a\']++;',
    '    for (char c : t.toCharArray()) count[c - \'a\']--;',
    '    for (int x : count) if (x != 0) return false;',
    '    return true;',
    '}',
  ],
  python: [
    'def is_anagram(s, t):',
    '    if len(s) != len(t):',
    '        return False',
    '    count = defaultdict(int)',
    '    for a in s:',
    '        count[a] += 1',
    '    for b in t:',
    '        count[b] -= 1',
    '    return all(v == 0 for v in count.values())',
  ],
  algorithm: [
    'Return false at once if the lengths differ',
    'For every letter of s, add 1 to its count',
    'For every letter of t, subtract 1 from its count',
    'Return true only if all counts are 0',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1) — 26 letters' }],
  why: 'The final count of a letter is (occurrences in s) − (occurrences in t). All counts being zero means the two multisets of letters are identical, which is the definition of an anagram. The length check is just an early exit; it also guarantees the totals could balance.',
};
