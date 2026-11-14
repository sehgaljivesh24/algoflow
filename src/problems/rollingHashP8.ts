/** Pack p8 rolling-hash problems: Rabin-Karp search, Repeated DNA Sequences (#187), Longest Duplicate Substring (#1044, simplified). */
import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { Rec, arr, blank, idx, int, parts, ptr, word } from './p8Kit.ts';
import { aNum, plural } from './text.ts';

const val = (c: string) => c.charCodeAt(0) - 96;

/* ------------------------------------------------------------------ Rabin-Karp search */
interface SIn { text: string; pat: string }
const B = 26;
const M = 17;

function parseRK(raw: string): SIn {
  const [t, p] = parts(raw, 2, 'text ; pattern, e.g. aabbabcbaa ; aab');
  const text = word(t, { max: 14, what: 'text' });
  const pat = word(p, { max: 5, what: 'pattern' });
  if (pat.length > text.length) throw new Error('The pattern must not be longer than the text');
  return { text, pat };
}

function buildRK({ text, pat }: SIn): Step[] {
  const rec = new Rec();
  const n = text.length;
  const m = pat.length;
  let pow = 1;
  for (let i = 0; i < m - 1; i++) pow = (pow * B) % M;
  let hp = 0;
  let hw = 0;
  for (let i = 0; i < m; i++) { hp = (hp * B + val(pat[i])) % M; hw = (hw * B + val(text[i])) % M; }
  const windows = n - m + 1;
  const shown: (number | undefined)[] = Array(n).fill(undefined);
  const hits: number[] = [];
  const aux = (h: number | string) => [{ title: 'hashes (mod 17)', kind: 'map' as const, items: [`pattern → ${hp}`, `window → ${h}`] }];
  const grid = (w: number, st: 'cmp' | 'same' | 'hit' | 'miss' | 'none') => {
    const tc: Cell[] = [...text].map((ch, k) => ({ key: `t${k}`, value: ch, state: w >= 0 && k >= w && k < w + m ? (st === 'hit' ? 'found' : st === 'miss' ? 'error' : st === 'same' ? 'swap' : 'compare') : w >= 0 && k < w ? 'dim' : undefined }));
    const pc: Cell[] = Array.from({ length: n }, (_, c) => (w >= 0 && c >= w && c < w + m ? { key: `p${c}`, value: pat[c - w], state: st === 'hit' ? 'found' : st === 'miss' ? 'error' : undefined } : blank(`b${c}`)));
    const hc: Cell[] = shown.map((v, k) => ({ key: `h${k}`, value: v === undefined ? '?' : v, state: v === undefined ? 'dim' : k === w ? (v === hp ? 'swap' : 'compare') : undefined }));
    return { kind: 'grid' as const, variant: 'table' as const, rows: [tc, pc, hc], rowHeads: ['text', 'pattern', 'window hash'], colHeads: idx(n) };
  };
  const vars = (i: number | string, h: number | string) => ({ i, 'window hash': h, 'pattern hash': hp, matches: hits.length });
  rec.push({ t: 'Start: hash the pattern', d: `Letters a=1…z=26; a window hashes as a base-${B} number mod ${M}: hash("${pat}") = ${hp}. (${M} is tiny on purpose, so false alarms stay visible.)`, scene: grid(-1, 'none'), aux: aux('—'), v: vars('—', '—'), why: 'Two equal strings always have equal hashes. The reverse is not guaranteed, so a hash hit is only a candidate and must be verified.', j: [1, 2, 3, 4, 5, 6, 7], p: [1, 2, 3, 4, 5, 6, 7], a: 0, tag: 'HASH PATTERN —', note: `hp = ${hp}, first window "${text.slice(0, m)}" → hw = ${hw} (mod ${M})` });
  let h = hw;
  for (let i = 0; i < windows; i++) {
    shown[i] = h;
    const eq = h === hp;
    const real = text.startsWith(pat, i);
    if (!eq) {
      rec.push({ t: `Window ${i} ("${text.slice(i, i + m)}"): hash ${h} ≠ ${hp}`, d: `hash ${h} ≠ ${hp}: different hashes prove the strings differ, so no character comparison is needed.`, scene: grid(i, 'cmp'), aux: aux(h), v: vars(i, h), why: 'A hash mismatch is conclusive: equal strings always hash equally. This skips the O(m) comparison.', j: [9, 10], p: [9, 10], a: 1, tag: `WINDOW ${i} — SKIP`, note: `hw ${h} != hp ${hp} → no verify` });
    } else if (real) {
      hits.push(i);
      rec.push({ t: `Window ${i}: hash ${h} = ${hp}, characters verified: match`, d: `Hashes agree (${h}) and "${text.slice(i, i + m)}" equals the pattern, so index ${i} is an occurrence.`, scene: grid(i, 'hit'), aux: aux(h), v: vars(i, h), why: 'Hashes agree and the direct comparison confirms it: a real occurrence.', tone: 'success', j: [9, 10], p: [9, 10, 11], a: 1, tag: `WINDOW ${i} — MATCH`, note: `hw ${h} == hp ${hp} and startsWith → hits.add(${i})` });
    } else {
      rec.push({ t: `Window ${i}: hash ${h} = ${hp}, but "${text.slice(i, i + m)}" ≠ "${pat}"`, d: `Hash ${h} = ${hp} but "${text.slice(i, i + m)}" ≠ "${pat}": a collision, rejected by the character check.`, scene: grid(i, 'miss'), aux: aux(h), v: vars(i, h), why: 'This is why a hash hit must be verified. With a large modulus collisions are rare, and expected time stays O(n + m).', tone: 'warn', j: [9, 10], p: [9, 10], a: 1, tag: `WINDOW ${i} — COLLISION`, alert: `Hash collision: ${h} = ${hp}, yet "${text.slice(i, i + m)}" ≠ "${pat}". Verifying the characters rejects it.`, note: `hw ${h} == hp ${hp} but startsWith is false → no hit` });
    }
    if (i + m < n) {
      const out = val(text[i]);
      const inn = val(text[i + m]);
      const before = h;
      h = (((h - ((out * pow) % M) + M) % M) * B + inn) % M;
      shown[i + 1] = h;
      rec.push({ t: `Roll: drop '${text[i]}', add '${text[i + m]}'`, d: `hash = ((${before} − ${out}·${pow}) · ${B} + ${inn}) mod ${M} = ${h}: one subtract, one multiply, one add, O(1).`, scene: grid(i + 1, 'cmp'), aux: aux(h), v: vars(i + 1, h), why: 'Removing the leading letter\'s contribution (out · B^(m−1)) and shifting everything by one place turns the old hash into the new one without rehashing m letters.', j: [11, 12, 13], p: [12, 13, 14], a: 2, tag: 'ROLL —', note: `hw = ((${before} - ${out}*${pow}) * ${B} + ${inn}) % ${M} = ${h}` });
    }
  }
  rec.push({ t: `Matches: ${arr(hits)}`, d: `${plural(windows, 'window')} hashed in O(n) total; only windows whose hash equalled the pattern's were compared character by character.`, scene: grid(-1, 'none'), aux: aux('—'), v: vars('—', '—'), why: 'Expected O(n + m); the worst case O(nm) needs adversarial collisions.', tone: 'success', j: [16], p: [15], a: 3, tag: '✅ Done!', note: `return hits = ${arr(hits)}`, result: { title: arr(hits), text: hits.length ? `Pattern occurs at indices ${arr(hits)}` : 'Pattern does not occur' } });
  return rec.steps;
}

export const rabinKarp: ProblemDef<SIn> = {
  slug: 'alg-rabin-karp-substring-search', id: 'ALG', title: 'Rabin-Karp Substring Search', difficulty: 'Medium', category: 'Strings', tag: 'rolling hash + verify',
  statement: 'Find every occurrence of a pattern in a text by comparing hashes of the pattern and of every window of the text. The window hash is updated in constant time as the window slides; equal hashes are confirmed with a direct comparison because hashes can collide.',
  constraints: 'Lowercase letters (animation input: text ≤ 14, pattern ≤ 5, pattern no longer than the text; modulus 17 is tiny on purpose)',
  examples: [
    { label: 'aabbabcbaa ; aab (hash collision)', input: { text: 'aabbabcbaa', pat: 'aab' }, output: '[0]' },
    { label: 'aabaabaa ; aab', input: { text: 'aabaabaa', pat: 'aab' }, output: '[0,3]' },
    { label: 'cabbage ; age', input: { text: 'cabbage', pat: 'age' }, output: '[4]' },
  ],
  inputPlaceholder: 'text ; pattern   e.g. aabbabcbaa ; aab', parseInput: parseRK, buildSteps: buildRK, viz: 'cells', vizTitle: 'Windows and their hashes',
  legend: [{ label: 'Window being hashed', state: 'compare' }, { label: 'Hash equals pattern hash (candidate)', state: 'swap' }, { label: 'Verified match', state: 'found' }, { label: 'Collision (hash equal, text different)', state: 'error' }, { label: 'Passed / not computed', state: 'dim' }],
  varLabels: ['i', 'window hash', 'pattern hash', 'matches'],
  emphasis: ['every occurrence', 'hashes', 'constant time', 'hashes can collide'],
  phases: [
    { icon: '#️⃣', label: 'Phase 1: Hash pattern + window', tone: 'blue' },
    { icon: '⚖', label: 'Phase 2: Compare, verify on a hit', tone: 'cyan' },
    { icon: '🎞', label: 'Phase 3: Roll the hash', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Compare numbers, not strings', text: 'Turn each window of the text into a number (a hash) and compare it to the pattern\'s hash. Sliding the window by one letter updates the hash with a single subtract, multiply and add. Only equal hashes are checked letter by letter, which discards a collision and confirms a true match.' },
  java: [
    'static List<Integer> rabinKarp(String text, String pat) {',
    '    int n = text.length(), m = pat.length(), B = 26, M = 17;',
    '    int pow = 1, hp = 0, hw = 0;',
    '    for (int i = 0; i < m - 1; i++) pow = pow * B % M;',
    '    for (int i = 0; i < m; i++) {',
    '        hp = (hp * B + val(pat.charAt(i))) % M;',
    '        hw = (hw * B + val(text.charAt(i))) % M;',
    '    }',
    '    List<Integer> hits = new ArrayList<>();',
    '    for (int i = 0; i + m <= n; i++) {',
    '        if (hw == hp && text.startsWith(pat, i)) hits.add(i);',
    '        if (i + m < n) {',
    '            hw = (hw - val(text.charAt(i)) * pow % M + M) % M;',
    '            hw = (hw * B + val(text.charAt(i + m))) % M;',
    '        }',
    '    }',
    '    return hits;',
    '}',
    '',
    'static int val(char c) { return c - \'a\' + 1; }       // a=1 ... z=26',
  ],
  python: [
    'def rabin_karp(text, pat):',
    '    n, m, B, M = len(text), len(pat), 26, 17',
    '    val = lambda c: ord(c) - 96',
    '    pow_ = pow(B, m - 1, M)',
    '    hp = hw = 0',
    '    for i in range(m):',
    '        hp = (hp * B + val(pat[i])) % M',
    '        hw = (hw * B + val(text[i])) % M',
    '    hits = []',
    '    for i in range(n - m + 1):',
    '        if hw == hp and text.startswith(pat, i):',
    '            hits.append(i)',
    '        if i + m < n:',
    '            hw = (hw - val(text[i]) * pow_) % M',
    '            hw = (hw * B + val(text[i + m])) % M',
    '    return hits',
  ],
  algorithm: ['Hash the pattern and the first window', 'If the window hash equals the pattern hash, verify the characters (a collision is possible)', 'Roll: subtract the leading letter, shift, add the new letter', 'Repeat for every window and collect verified starts'],
  complexity: [{ label: 'Time', value: 'O(n + m) expected, O(nm) worst' }, { label: 'Space', value: 'O(1)' }],
  why: 'hash(s) = Σ val(sᵢ)·B^(m−1−i) mod M, so dropping the leading term and appending a letter gives hash(next) = (hash − val(out)·B^(m−1))·B + val(in) (mod M). Equal strings have equal hashes, therefore a mismatch of hashes safely rejects a window; a match is only a candidate and is verified, so the output is always exact. Collisions only cost time.',
};

/* ------------------------------------------------------------ #187 Repeated DNA Sequences */
interface DIn { s: string; L: number }
const CODE: Record<string, number> = { A: 0, C: 1, G: 2, T: 3 };

function parseDna(raw: string): DIn {
  const [a, b] = parts(raw, 2, 'DNA ; window length, e.g. AAAAACCCCCAAAAACCCCCC ; 10');
  const s = word(a, { max: 21, re: /^[ACGT]+$/, what: 'DNA string', hint: 'the letters A, C, G, T' });
  const L = int(b, 2, 10, 'The window length');
  if (L > s.length) throw new Error('The window length must not exceed the DNA length');
  return { s, L };
}

function buildDna({ s, L }: DIn): Step[] {
  const rec = new Rec();
  const n = s.length;
  const mask = (1 << (2 * L)) - 1;
  let h = 0;
  const seen = new Map<number, number>();
  const added: string[] = [];
  const bits = (v: number) => v.toString(2).padStart(2 * L, '0');
  const cells = (i: number, prior = -1): Cell[] => [...s].map((ch, k) => ({ key: k, value: ch, state: i >= L - 1 && k > i - L && k <= i ? (prior >= 0 ? 'found' : 'compare') : prior >= 0 && k >= prior && k < prior + L ? 'swap' : i < 0 || k <= i ? undefined : 'dim' }));
  const aux = () => [
    { title: 'seen: hash → first start', kind: 'map' as const, items: [...seen.entries()].map(([k, v]) => `${k} → ${v}`) },
    { title: 'repeated', kind: 'list' as const, items: [...added] },
  ];
  const vars = (i: number | string, w: string, hv: number | string, b: string) => ({ i, window: w, hash: hv, bits: b });
  rec.push({ t: 'Start', d: `Slide ${aNum(L)}-letter window over the DNA. Each letter is 2 bits (A=00, C=01, G=10, T=11), so a window is an exact ${2 * L}-bit number: no collisions.`, cells: cells(-1), pointers: [], aux: aux(), v: vars('—', '—', 0, '—'), why: 'Packing a small alphabet into bits gives an exact, O(1)-updatable key, so we can use a hash set of integers instead of storing substrings.', j: [0, 1, 2, 3], p: [0, 1, 2, 3], a: 0, tag: 'ENCODE —', note: `mask = (1 << ${2 * L}) - 1 = ${mask}; h = 0` });
  for (let i = 0; i < n; i++) {
    const hOld = h;
    h = ((h << 2) | CODE[s[i]]) & mask;
    if (i < L - 1) {
      rec.push({ t: `Fill: shift in '${s[i]}'`, d: `h = (h << 2 | ${CODE[s[i]]}) & mask = ${h}. The window is not full yet (${i + 1} of ${L} letters).`, cells: cells(i), pointers: [ptr('i', 'i', i, 'blue')], aux: aux(), v: vars(i, '—', h, bits(h)), why: 'The mask keeps only the newest L letters, so once full the oldest letter falls off the top automatically.', j: [4, 5, 6], p: [4, 5, 6, 7], a: 1, tag: `FILL i=${i} —`, note: `h = (${hOld} << 2 | ${CODE[s[i]]}) & mask = ${h}  (${bits(h)})` });
      continue;
    }
    const w = s.slice(i - L + 1, i + 1);
    const prev = seen.get(h);
    if (prev === undefined) {
      seen.set(h, i - L + 1);
      rec.push({ t: `Window "${w}": hash ${h}, new`, d: `h = (h << 2 | ${CODE[s[i]]}) & mask = ${h} = ${bits(h)}₂. Not seen before: remember it.`, cells: cells(i), pointers: [ptr('i', 'i', i, 'blue')], aux: aux(), v: vars(i, w, h, bits(h)), why: 'One shift, one OR and one AND update the window; the set lookup is O(1).', j: [5, 7], p: [5, 8, 11], a: 2, tag: `WINDOW ${i - L + 1} — NEW`, note: `h = (${hOld} << 2 | ${CODE[s[i]]}) & mask = ${h}; seen.add(${h}) ok` });
    } else if (!added.includes(w)) {
      added.push(w);
      rec.push({ t: `Window "${w}": hash ${h} seen at ${prev}: repeat!`, d: `The same hash appeared at start ${prev}; hashes here are exact, so "${w}" really occurs twice. Add it to the answer.`, cells: cells(i, prev), pointers: [ptr('i', 'i', i, 'blue')], aux: aux(), v: vars(i, w, h, bits(h)), why: 'Equal exact keys mean equal substrings. Recording the string once avoids reporting it again on a third occurrence.', tone: 'success', j: [7], p: [8, 9, 10], a: 3, tag: `WINDOW ${i - L + 1} — REPEAT`, note: `h = ${h}; seen.add(${h}) is false → added "${w}"` });
    } else {
      rec.push({ t: `Window "${w}": already reported`, d: `"${w}" was already added to the answer; skip.`, cells: cells(i, prev), pointers: [ptr('i', 'i', i, 'blue')], aux: aux(), v: vars(i, w, h, bits(h)), why: 'The answer lists each repeated sequence once.', j: [7], p: [8, 9], a: 3, tag: `WINDOW ${i - L + 1} — SKIP`, note: `h = ${h} seen again, "${w}" already in added` });
    }
  }
  const res = `[${added.map((x) => `"${x}"`).join(',')}]`;
  rec.push({ t: `Repeated sequences: ${res}`, d: `${added.length} sequence${added.length === 1 ? '' : 's'} of length ${L} ${added.length === 1 ? 'occurs' : 'occur'} more than once.`, cells: cells(n - 1), pointers: [], aux: aux(), v: vars('—', '—', '—', '—'), why: 'One pass over the string, O(1) per window: O(n) overall.', tone: 'success', j: [9], p: [12], a: 4, tag: '✅ Done!', note: `return ${res}`, result: { title: res, text: added.length ? `Repeated ${L}-letter sequences: ${res}` : `No ${L}-letter sequence repeats` } });
  return rec.steps;
}

export const repeatedDnaSequences: ProblemDef<DIn> = {
  slug: '187-repeated-dna-sequences', id: '187', title: 'Repeated DNA Sequences', difficulty: 'Medium', category: 'Strings', tag: 'rolling hash (2 bits / base)',
  statement: 'A DNA string uses the letters A, C, G, T. Return every sequence of a given length (10 in the original problem) that occurs more than once in the DNA string, each reported once.',
  constraints: 'n ≤ 10⁵ in the original with window 10 (animation input: DNA ≤ 21 letters, window length 2–10, given after a semicolon)',
  examples: [
    { label: 'AAAAACCCCCAAAAACCCCCC ; 10', input: { s: 'AAAAACCCCCAAAAACCCCCC', L: 10 }, output: '["AAAAACCCCC"]' },
    { label: 'AAAAAAAAAAAAA ; 4', input: { s: 'AAAAAAAAAAAAA', L: 4 }, output: '["AAAA"]' },
    { label: 'ACGTACGTAC ; 3', input: { s: 'ACGTACGTAC', L: 3 }, output: '["ACG","CGT","GTA","TAC"]' },
  ],
  inputPlaceholder: 'DNA ; length   e.g. AAAAACCCCCAAAAACCCCCC ; 10', parseInput: parseDna, buildSteps: buildDna, viz: 'cells', vizTitle: 'DNA and window hashes',
  legend: [{ label: 'Current window', state: 'compare' }, { label: 'Window repeats an earlier one', state: 'found' }, { label: 'Earlier occurrence', state: 'swap' }, { label: 'Not reached yet', state: 'dim' }],
  varLabels: ['i', 'window', 'hash', 'bits'],
  emphasis: ['DNA string', 'more than once', 'each reported once'],
  phases: [
    { icon: '🧬', label: 'Phase 1: Encode 2 bits per base', tone: 'blue' },
    { icon: '⇥', label: 'Phase 2: Shift in a base', tone: 'cyan' },
    { icon: '🔎', label: 'Phase 3: Look up h in seen', tone: 'green' },
    { icon: '🔁', label: 'Phase 4: Record a repeat', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'A window is a number', text: 'Encode each base with 2 bits. A window of L bases is then a 2L-bit integer that can be updated with h = (h << 2 | code) & mask. Keep the integers already seen in a hash set; a second sighting means the sequence repeats.' },
  java: [
    'public List<String> findRepeatedDnaSequences(String s, int L) {',
    '    int mask = (1 << (2 * L)) - 1, h = 0;',
    '    Set<Integer> seen = new HashSet<>();',
    '    Set<String> added = new LinkedHashSet<>();',
    '    for (int i = 0; i < s.length(); i++) {',
    '        h = ((h << 2) | code(s.charAt(i))) & mask;',
    '        if (i < L - 1) continue;',
    '        if (!seen.add(h)) added.add(s.substring(i - L + 1, i + 1));',
    '    }',
    '    return new ArrayList<>(added);',
    '}',
    '',
    'private int code(char c) { return "ACGT".indexOf(c); }       // A=0, C=1, G=2, T=3',
  ],
  python: [
    'def find_repeated(s, L):',
    "    code = {'A': 0, 'C': 1, 'G': 2, 'T': 3}",
    '    mask = (1 << (2 * L)) - 1',
    '    h, seen, added = 0, set(), []',
    '    for i, ch in enumerate(s):',
    '        h = ((h << 2) | code[ch]) & mask',
    '        if i < L - 1:',
    '            continue',
    '        if h in seen:',
    '            if s[i - L + 1:i + 1] not in added:',
    '                added.append(s[i - L + 1:i + 1])',
    '        seen.add(h)',
    '    return added',
  ],
  algorithm: ['Encode a base in 2 bits and keep a mask of the newest L bases', 'Shift each new base into h and apply the mask', 'Once the window is full, test h against the set of hashes seen', 'A repeated hash means a repeated sequence: record it once', 'Return the recorded sequences'],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The 2-bit encoding is injective on strings of fixed length L, so equal hashes mean equal substrings: there is no collision to verify. The mask discards the oldest letter in constant time, so each window costs O(1) and the total is linear instead of the O(n·L) of hashing substrings.',
};

/* ------------------------------------------------- #1044 Longest Duplicate Substring (simplified) */
interface WIn { s: string }
const B2 = 26;
const M2 = 101;

function buildDup({ s }: WIn): Step[] {
  const rec = new Rec();
  const n = s.length;
  let lo = 1;
  let hi = n - 1;
  let best = '';
  let L = 0;
  let hash: number | string = '—';
  const seen = new Map<number, number[]>();
  const vars = () => ({ lo, hi, L: L || '—', hash, best: best || '—' });
  const cells = (start: number, other = -1, st: 'cur' | 'dup' | 'col' = 'cur'): Cell[] => [...s].map((ch, k) => ({ key: k, value: ch, state: start >= 0 && k >= start && k < start + L ? (st === 'dup' ? 'found' : 'compare') : other >= 0 && k >= other && k < other + L ? (st === 'dup' ? 'found' : 'error') : undefined }));
  const aux = () => [{ title: `hashes of length-${L || '?'} windows`, kind: 'map' as const, items: [...seen.entries()].map(([k, v]) => `${k} → start ${v.join(', ')}`) }];
  rec.push({ t: 'Start', d: `Longest substring of "${s}" that occurs twice: duplicates are monotone in length, so binary search L and test each length with a rolling hash.`, cells: cells(-1), pointers: [], aux: aux(), v: vars(), why: 'If a duplicate of length L exists, so does one of length L − 1 (drop the last letter of both copies). That monotonicity is what allows binary search on the answer.', j: [0, 1, 2], p: [0, 1], a: 0, tag: 'READY —', note: `lo = 1, hi = ${n - 1}, best = ""` });
  while (lo <= hi) {
    L = Math.floor((lo + hi) / 2);
    seen.clear();
    hash = '—';
    rec.push({ t: `Try length L = ${L} (lo=${lo}, hi=${hi})`, d: `Is there a substring of length ${L} that appears twice? Hash every window of length ${L} and look for equal hashes.`, cells: cells(-1), pointers: [], aux: aux(), v: vars(), why: 'Each test is a single O(n) rolling-hash pass.', j: [3, 4, 5], p: [2, 3, 4], a: 0, tag: `TRY L = ${L} —`, note: `L = (${lo} + ${hi}) / 2 = ${L}` });
    let pow = 1;
    for (let i = 0; i < L - 1; i++) pow = (pow * B2) % M2;
    let h = 0;
    let dup: string | null = null;
    for (let i = 0; i < n && dup === null; i++) {
      if (i >= L) h = (((h - ((val(s[i - L]) * pow) % M2)) % M2) + M2) % M2;
      h = (h * B2 + val(s[i])) % M2;
      if (i < L - 1) continue;
      const start = i - L + 1;
      const w = s.slice(start, i + 1);
      hash = h;
      const others = seen.get(h) ?? [];
      const same = others.find((o) => s.startsWith(w, o));
      if (same !== undefined) {
        dup = w;
        rec.push({ t: `Window ${start} ("${w}"): hash ${h} matches start ${same}: verified duplicate`, d: `The characters are compared too, and "${w}" really occurs at ${same} and ${start}.`, cells: cells(start, same, 'dup'), pointers: [], aux: aux(), v: vars(), why: 'A hash hit is only a candidate; the direct comparison turns it into proof.', tone: 'success', j: [22, 23], p: [20, 21, 22, 23], a: 2, tag: `WINDOW ${start} — DUPLICATE`, note: `h = ${h} seen at ${same}; startsWith true → return "${w}"` });
        break;
      }
      if (others.length) {
        rec.push({ t: `Window ${start} ("${w}"): hash ${h} equals another window but the text differs`, d: `Collision with start ${others[0]}: "${s.slice(others[0], others[0] + L)}" ≠ "${w}". The mod-${M2} hash is tiny, so this happens; the check rejects it.`, cells: cells(start, others[0], 'col'), pointers: [], aux: aux(), v: vars(), why: 'Verification protects correctness: a collision can only waste time, never produce a wrong answer.', tone: 'warn', j: [22], p: [21, 22], a: 2, tag: `WINDOW ${start} — COLLISION`, note: `h = ${h} equals start ${others[0]}, but startsWith is false`, alert: `Hash collision: "${w}" and "${s.slice(others[0], others[0] + L)}" share hash ${h} but differ.` });
      } else {
        rec.push({ t: `Window ${start} ("${w}"): hash ${h}, new`, d: `"${w}" rolls to hash ${h} (mod ${M2}); no earlier window has it, so remember start ${start}.`, cells: cells(start), pointers: [], aux: aux(), v: vars(), why: 'Rolling update: remove the leading letter, shift, add the new letter, all mod 101.', j: [17, 18, 19, 24], p: [15, 16, 17, 24], a: 1, tag: `WINDOW ${start} — NEW`, note: `h = ${h} (mod ${M2}); seen[${h}] = [${start}]` });
      }
      seen.set(h, [...others, start]);
    }
    if (dup !== null) {
      best = dup;
      lo = L + 1;
      rec.push({ t: `Length ${L} works: best = "${best}"`, d: `A duplicate exists, so try longer: lo = ${lo}.`, cells: cells(-1), pointers: [], aux: aux(), v: vars(), why: 'A feasible length moves the lower bound up, looking for a longer duplicate.', tone: 'success', j: [6], p: [5, 6], a: 3, tag: `L = ${L} WORKS —`, note: `dup != null → best = "${best}", lo = ${L} + 1 = ${lo}` });
    } else {
      hi = L - 1;
      rec.push({ t: `Length ${L} fails`, d: `All ${n - L + 1} windows are distinct, so no duplicate this long: hi = ${hi}.`, cells: cells(-1), pointers: [], aux: aux(), v: vars(), why: 'Longer lengths cannot work either (monotonicity), so the upper bound moves down.', tone: 'warn', j: [7], p: [7, 8], a: 3, tag: `L = ${L} FAILS —`, note: `dup == null → hi = ${L} - 1 = ${hi}`, alert: `No duplicate of length ${L}: every window is distinct, so longer lengths are out too.` });
    }
  }
  L = best.length;
  seen.clear();
  hash = '—';
  rec.push({ t: `Longest duplicate substring: "${best}"`, d: best ? `Binary search converged: the longest repeated substring has length ${best.length}.` : 'No substring occurs twice.', cells: cells(-1), pointers: [], aux: aux(), v: vars(), why: 'O(n log n) expected: log n lengths, each tested in one linear hash pass.', tone: 'success', j: [9], p: [9], a: 4, tag: '✅ Done!', note: `return "${best}"`, result: { title: `"${best}"`, text: best ? `Longest duplicate substring: "${best}"` : 'No duplicated substring (empty string)' } });
  return rec.steps;
}

export const longestDuplicateSubstring: ProblemDef<WIn> = {
  slug: '1044-longest-duplicate-substring', id: '1044', title: 'Longest Duplicate Substring', difficulty: 'Hard', category: 'Strings', tag: 'binary search + rolling hash',
  statement: 'Return any longest substring of s that occurs at least twice (the copies may overlap), or the empty string if none exists. This version binary-searches the length and uses a small rolling hash with verification to test each length.',
  constraints: '2 ≤ s.length ≤ 3·10⁴ in the original (animation input: 2–10 lowercase letters; modulus 101 so collisions can show up)',
  examples: [
    { label: 'banana', input: { s: 'banana' }, output: '"ana"' },
    { label: 'abcd', input: { s: 'abcd' }, output: '""' },
    { label: 'aabcaab', input: { s: 'aabcaab' }, output: '"aab"' },
  ],
  inputPlaceholder: 'e.g. banana', parseInput: (raw) => ({ s: word(raw, { min: 2, max: 10, what: 'string' }) }), buildSteps: buildDup, viz: 'cells', vizTitle: 'String and window hashes',
  legend: [{ label: 'Window being hashed', state: 'compare' }, { label: 'Verified duplicate pair', state: 'found' }, { label: 'Hash collision (different text)', state: 'error' }],
  varLabels: ['lo', 'hi', 'L', 'hash', 'best'],
  emphasis: ['longest substring', 'at least twice', 'rolling hash'],
  phases: [
    { icon: '✂', label: 'Phase 1: Binary search on L', tone: 'blue' },
    { icon: '🎞', label: 'Phase 2: Roll hash over windows', tone: 'cyan' },
    { icon: '⚖', label: 'Phase 3: Verify equal hashes', tone: 'orange' },
    { icon: '↕', label: 'Phase 4: Move lo / hi', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: { title: 'Binary search on length, rolling hash to test it', text: 'Whether a duplicate of length L exists only goes from yes to no as L grows, so binary search L. To test one L, hash all windows of that length in O(n) with a rolling hash and look for repeats, verifying the text whenever two hashes agree.' },
  java: [
    'public String longestDupSubstring(String s) {',
    '    int lo = 1, hi = s.length() - 1;',
    '    String best = "";',
    '    while (lo <= hi) {',
    '        int L = (lo + hi) / 2;',
    '        String dup = findDuplicate(s, L);',
    '        if (dup != null) { best = dup; lo = L + 1; }',
    '        else hi = L - 1;',
    '    }',
    '    return best;',
    '}',
    '// rolling-hash test: one pass over all windows of length L',
    'static String findDuplicate(String s, int L) {',
    '    final int B = 26, M = 101;',
    '    long pow = 1, h = 0;',
    '    for (int i = 0; i < L - 1; i++) pow = pow * B % M;',
    '    Map<Long, List<Integer>> seen = new HashMap<>();',
    '    for (int i = 0; i < s.length(); i++) {',
    "        if (i >= L) h = (h - (s.charAt(i - L) - 'a' + 1) * pow % M + M) % M;",
    "        h = (h * B + (s.charAt(i) - 'a' + 1)) % M;",
    '        if (i < L - 1) continue;',
    '        int start = i - L + 1;',
    '        for (int other : seen.getOrDefault(h, List.of()))',
    '            if (s.startsWith(s.substring(start, i + 1), other)) return s.substring(start, i + 1);',
    '        seen.computeIfAbsent(h, k -> new ArrayList<>()).add(start);',
    '    }',
    '    return null;',
    '}',
  ],
  python: [
    'def longest_dup_substring(s):',
    '    lo, hi, best = 1, len(s) - 1, ""',
    '    while lo <= hi:',
    '        L = (lo + hi) // 2',
    '        dup = find_duplicate(s, L)',
    '        if dup is not None:',
    '            best, lo = dup, L + 1',
    '        else:',
    '            hi = L - 1',
    '    return best',
    '',
    'def find_duplicate(s, L, B=26, M=101):',
    '    pow_ = pow(B, L - 1, M)',
    '    h, seen = 0, {}',
    '    for i, ch in enumerate(s):',
    '        if i >= L:',
    '            h = (h - (ord(s[i - L]) - 96) * pow_) % M',
    '        h = (h * B + ord(ch) - 96) % M',
    '        if i < L - 1:',
    '            continue',
    '        start = i - L + 1',
    '        for other in seen.get(h, []):',
    '            if s[other:other + L] == s[start:i + 1]:',
    '                return s[start:i + 1]',
    '        seen.setdefault(h, []).append(start)',
    '    return None',
  ],
  algorithm: ['Binary search the length L between 1 and n − 1', 'For one L, roll a hash over every window of length L', 'When two windows share a hash, verify the text (collisions happen)', 'A verified duplicate moves lo up (try longer), otherwise hi down; keep the best', 'Return the best duplicate found'],
  complexity: [{ label: 'Time', value: 'O(n log n) expected' }, { label: 'Space', value: 'O(n)' }],
  why: 'Monotonicity: a duplicate of length L yields a duplicate of every shorter length, so the set of feasible lengths is a prefix of 1..n−1 and binary search finds its end. Each feasibility test is exact because hash equality is always confirmed by comparing the substrings; collisions only cost extra comparisons.',
};
