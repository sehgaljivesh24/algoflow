import type { Cell, CellState, ProblemDef, Step } from '../engine/types.ts';
import { plural, verb } from './text.ts';

interface In { words: string[] }

function parse(raw: string): In {
  const words = raw.split(/[\s,]+/).filter(Boolean).map((w) => w.toLowerCase());
  if (!words.length) throw new Error('Enter words separated by spaces, e.g. eat tea tan ate nat bat');
  if (words.some((w) => !/^[a-z]+$/.test(w))) throw new Error('Use lowercase letters a-z only');
  if (words.length > 8) throw new Error('Use 8 words or fewer');
  if (words.some((w) => w.length > 6)) throw new Error('Keep each word to 6 letters or fewer');
  return { words };
}

const keyOf = (w: string) => [...w].sort().join('');

function build({ words }: In): Step[] {
  const steps: Step[] = [];
  const groups = new Map<string, string[]>();
  const items = () => [...groups].map(([k, g]) => `${k} → ${g.join(', ')}`);
  const cells = (cur: number, placed: number): Cell[] =>
    words.map((value, i) => {
      let state: CellState | undefined;
      if (i === cur) state = 'active';
      else if (i < placed) state = 'sorted';
      return { key: i, value, state };
    });
  const vars = (i: number | string, w: string, key: string) => ({ i, word: w, key, groups: groups.size });

  steps.push({
    title: 'Start', tag: 'SETUP —', desc: `Group the ${plural(words.length, 'word')} ${verb(words.length, 'with its anagrams', 'that are anagrams of each other')}. The map groups starts empty.`,
    cells: cells(-1, 0), pointers: [], aux: [{ title: 'groups (sorted key → words)', kind: 'map', items: [] }], vars: vars('—', '—', '—'),
    logic: 'Anagrams become identical when their letters are sorted. That sorted string is a canonical key: words with the same key belong together.', logicTone: 'info',
    javaLines: [1], pyLines: [1], algoStep: 0, note: 'groups = {}',
  });

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const key = keyOf(w);
    steps.push({
      title: `Sort the letters of "${w}"`, tag: 'SORT —', desc: `sort the letters of "${w}" → key "${key}". Is "${key}" already a key?`,
      cells: cells(i, i), pointers: [{ id: 'i', label: 'i', index: i, tone: 'blue' }], aux: [{ title: 'groups (sorted key → words)', kind: 'map', items: items(), highlight: groups.has(key) ? [...groups.keys()].indexOf(key) : undefined }], vars: vars(i, w, key),
      logic: 'Compute the canonical key for this word.', logicTone: 'info', javaLines: [3, 4, 5], pyLines: [3], algoStep: 1,
      note: `key = sorted("${w}") = "${key}"${groups.has(key) ? ' (exists)' : ' (new)'}`,
    });
    const isNew = !groups.has(key);
    if (isNew) groups.set(key, []);
    groups.get(key)!.push(w);
    steps.push({
      title: isNew ? `New group "${key}"` : `Add to group "${key}"`, tag: isNew ? 'NEW GROUP —' : 'JOIN —',
      desc: isNew ? `no word has key "${key}" yet → start a group with "${w}" (${groups.size} group${groups.size > 1 ? 's' : ''})` : `key "${key}" exists → "${w}" joins it: ${groups.get(key)!.join(', ')}`,
      cells: cells(i, i + 1), pointers: [{ id: 'i', label: 'i', index: i, tone: 'green' }], aux: [{ title: 'groups (sorted key → words)', kind: 'map', items: items(), highlight: [...groups.keys()].indexOf(key) }], vars: vars(i, w, key),
      logic: isNew ? 'First word with this key opens a new bucket.' : 'Same key means same letters, so this word is an anagram of the bucket.', logicTone: isNew ? 'info' : 'success',
      javaLines: [6], pyLines: [4], algoStep: 2, note: `groups["${key}"] = [${groups.get(key)!.join(', ')}]`,
    });
  }

  const out = [...groups.values()];
  steps.push({
    title: 'Done', tag: '✅ Done!', desc: `${out.length} group${out.length > 1 ? 's' : ''}: ${out.map((g) => `[${g.join(', ')}]`).join(' ')}`,
    cells: cells(-1, words.length), pointers: [], aux: [{ title: 'result groups', kind: 'list', items: out.map((g) => `[${g.join(', ')}]`) }], vars: vars('—', '—', '—'),
    logic: 'The bucket values are the answer; their order does not matter.', logicTone: 'success', javaLines: [8], pyLines: [5], algoStep: 3,
    note: `return groups.values() → ${out.length} list${out.length > 1 ? 's' : ''}`,
    result: { title: JSON.stringify(out), text: `${out.length} group${out.length > 1 ? 's' : ''} of anagrams` },
  });
  return steps;
}

export const groupAnagrams: ProblemDef<In> = {
  slug: '49-group-anagrams',
  id: '49', title: 'Group Anagrams', difficulty: 'Medium', category: 'Strings', tag: 'sorted key / count key',
  statement: 'Given an array of strings, group together the strings that are anagrams of each other. The groups may be returned in any order.',
  constraints: '1 ≤ n ≤ 10⁴, 0 ≤ length ≤ 100, lowercase letters (animation: up to 8 words of up to 6 letters)',
  examples: [
    { label: 'eat tea tan ate nat bat', input: { words: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'] }, output: '[["eat","tea","ate"],["tan","nat"],["bat"]]' },
    { label: 'abc', input: { words: ['abc'] }, output: '[["abc"]]' },
    { label: 'listen silent enlist google gogole', input: { words: ['listen', 'silent', 'enlist', 'google', 'gogole'] }, output: '[["listen","silent","enlist"],["google","gogole"]]' },
  ],
  inputPlaceholder: 'e.g. eat tea tan ate nat bat',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Current word', state: 'active' }, { label: 'Already grouped', state: 'sorted' }],
  varLabels: ['i', 'word', 'key', 'groups'],
  emphasis: ['anagrams', 'group'],
  phases: [
    { icon: '🗂️', label: 'Setup: empty map', tone: 'blue' },
    { icon: '🔤', label: 'Sort: build the key', tone: 'cyan' },
    { icon: '🧺', label: 'Place: add to its bucket', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Bucket by sorted letters',
    text: 'For every word, sort its letters to get a key and drop the word into the list stored under that key in a hash map. The map\'s lists are the answer.',
  },
  java: [
    'public List<List<String>> groupAnagrams(String[] strs) {',
    '    Map<String, List<String>> groups = new LinkedHashMap<>();',
    '    for (String w : strs) {',
    '        char[] arr = w.toCharArray();',
    '        Arrays.sort(arr);',
    '        String key = new String(arr);',
    '        groups.computeIfAbsent(key, x -> new ArrayList<>()).add(w);',
    '    }',
    '    return new ArrayList<>(groups.values());',
    '}',
  ],
  python: [
    'def group_anagrams(strs):',
    '    groups = defaultdict(list)',
    '    for w in strs:',
    "        key = ''.join(sorted(w))",
    '        groups[key].append(w)',
    '    return list(groups.values())',
  ],
  algorithm: [
    'Create an empty map from sorted-letters key to a list of words',
    'For each word, sort its letters to build the key',
    'Append the word to the list stored under that key',
    'Return all lists in the map',
  ],
  complexity: [{ label: 'Time', value: 'O(n · k log k)' }, { label: 'Space', value: 'O(n · k)' }],
  why: 'Two words are anagrams iff their sorted letter sequences are equal, so the sorted word is a perfect fingerprint: equal fingerprints imply anagrams and vice versa. With a hash map keyed on that fingerprint, each word is placed in one O(1) lookup after its O(k log k) sort. For long words a 26-slot count tuple can replace the sort and cut the key cost to O(k).',
};
