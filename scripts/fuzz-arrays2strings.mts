/**
 * Fuzz test for the arrays-2 + strings problem group.
 * Run:  node scripts/fuzz-arrays2strings.mts
 * For every problem: ~200 random inputs, run buildSteps, compare the final result with a plain reference,
 * and run structural sanity checks (line ranges, vars coverage, scene shape) on every step.
 */
import { containsDuplicate } from '../src/problems/containsDuplicate.ts';
import { firstMissingPositive } from '../src/problems/firstMissingPositive.ts';
import { productOfArrayExceptSelf } from '../src/problems/productOfArrayExceptSelf.ts';
import { ransomNote } from '../src/problems/ransomNote.ts';
import { subarraySumEqualsK } from '../src/problems/subarraySumEqualsK.ts';
import { majorityElement } from '../src/problems/majorityElement.ts';
import { longestConsecutiveSequence } from '../src/problems/longestConsecutiveSequence.ts';
import { romanToInteger } from '../src/problems/romanToInteger.ts';
import { longestCommonPrefix } from '../src/problems/longestCommonPrefix.ts';
import { encodeAndDecodeStrings } from '../src/problems/encodeAndDecodeStrings.ts';
import { isomorphicStrings } from '../src/problems/isomorphicStrings.ts';
import { reverseString } from '../src/problems/reverseString.ts';
import { longestSubstringWithoutRepeating } from '../src/problems/longestSubstringWithoutRepeating.ts';
import { longestRepeatingCharacterReplacement } from '../src/problems/longestRepeatingCharacterReplacement.ts';
import { minimumWindowSubstring } from '../src/problems/minimumWindowSubstring.ts';
import { permutationInString } from '../src/problems/permutationInString.ts';
import { findAllAnagrams } from '../src/problems/findAllAnagrams.ts';
import { validAnagram } from '../src/problems/validAnagram.ts';
import { groupAnagrams } from '../src/problems/groupAnagrams.ts';
import { maximumNumberOfBalloons } from '../src/problems/maximumNumberOfBalloons.ts';
import { validPalindrome } from '../src/problems/validPalindrome.ts';
import { validPalindromeII } from '../src/problems/validPalindromeII.ts';
import { longestPalindromicSubstring } from '../src/problems/longestPalindromicSubstring.ts';
import { palindromicSubstrings } from '../src/problems/palindromicSubstrings.ts';
import { checkScene } from './check-scenes.mts';

// ---------- tiny seeded PRNG so failures are reproducible
let seed = 20240607;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const pick = <T,>(a: readonly T[]) => a[int(0, a.length - 1)];
const str = (alpha: string, lo: number, hi: number) => Array.from({ length: int(lo, hi) }, () => alpha[int(0, alpha.length - 1)]).join('');
const nums = (lo: number, hi: number, vlo: number, vhi: number) => Array.from({ length: int(lo, hi) }, () => int(vlo, vhi));

let failures = 0;
const N = 200;

function run(name: string, p: any, gen: () => any, ref: (i: any) => string) {
  let bad = 0;
  for (let t = 0; t < N; t++) {
    const input = gen();
    let steps: any[];
    try {
      steps = p.buildSteps(input);
    } catch (e) {
      if (bad++ < 3) console.log(`FAIL ${name}: threw ${e} for ${JSON.stringify(input)}`);
      continue;
    }
    const got = steps[steps.length - 1]?.result?.title;
    const want = ref(input);
    if (got !== want && bad++ < 3) console.log(`FAIL ${name}: ${JSON.stringify(input)} got ${got} want ${want}`);
    // structural sanity on every step
    const issues: string[] = [];
    if (steps.length < 2 || steps.length > 400) issues.push(`step count ${steps.length}`);
    steps.forEach((s, i) => {
      if (i < steps.length - 1 && s.result) issues.push(`step ${i} has a result before the end`);
      if (!s.javaLines.every((l: number) => l >= 0 && l < p.java.length)) issues.push(`step ${i} java line`);
      if (!s.pyLines.every((l: number) => l >= 0 && l < p.python.length)) issues.push(`step ${i} python line`);
      if (!(s.algoStep >= 0 && s.algoStep < p.algorithm.length)) issues.push(`step ${i} algoStep`);
      if (!p.varLabels.every((k: string) => k in s.vars)) issues.push(`step ${i} vars`);
      checkScene(s, `step ${i}`, (n, c, extra) => { if (!c) issues.push(`${n} ${extra ?? ''}`); });
    });
    if (JSON.stringify(p.buildSteps(input)) !== JSON.stringify(steps)) issues.push('not deterministic');
    if (issues.length && bad++ < 3) console.log(`FAIL ${name}: ${JSON.stringify(input)} -> ${issues.slice(0, 4).join('; ')}`);
  }
  if (bad) failures++;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${name} (${N} cases)`);
}

// ---------- references
const sortedKey = (w: string) => [...w].sort().join('');
const isPal = (s: string) => s === [...s].reverse().join('');
const toRoman = (n: number) => {
  const t: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, r] of t) while (n >= v) { out += r; n -= v; }
  return out;
};

// 217
run('217 contains duplicate', containsDuplicate, () => ({ nums: nums(1, 12, -4, 8) }), ({ nums }) => String(new Set(nums).size < nums.length));

// 41
run('41 first missing positive', firstMissingPositive, () => ({ nums: nums(1, 12, -3, 13) }), ({ nums }) => {
  const set = new Set(nums);
  let m = 1;
  while (set.has(m)) m++;
  return String(m);
});

// 238
run('238 product except self', productOfArrayExceptSelf, () => ({ nums: nums(2, 12, -4, 4) }), ({ nums }) => {
  const res = nums.map((_: number, i: number) => nums.reduce((a: number, v: number, j: number) => (j === i ? a : a * v), 1) || 0);
  return `[${res.join(',')}]`;
});

// 383
run('383 ransom note', ransomNote, () => ({ ransom: str('abc', 1, 8), magazine: str('abc', 1, 12) }), ({ ransom, magazine }) => {
  const c: Record<string, number> = {};
  for (const ch of magazine) c[ch] = (c[ch] ?? 0) + 1;
  for (const ch of ransom) { c[ch] = (c[ch] ?? 0) - 1; if (c[ch] < 0) return 'false'; }
  return 'true';
});

// 560
run('560 subarray sum equals k', subarraySumEqualsK, () => ({ nums: nums(1, 12, -3, 4), k: int(-4, 6) }), ({ nums, k }) => {
  let cnt = 0;
  for (let i = 0; i < nums.length; i++) { let s = 0; for (let j = i; j < nums.length; j++) { s += nums[j]; if (s === k) cnt++; } }
  return String(cnt);
});

// 169
run('169 majority element', majorityElement, () => {
  const n = int(1, 12);
  const m = int(n % 2 === 0 ? n / 2 + 1 : (n + 1) / 2, n);
  const maj = int(0, 5);
  const a = [...Array(m).fill(maj), ...Array.from({ length: n - m }, () => int(0, 5))];
  for (let i = a.length - 1; i > 0; i--) { const j = int(0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return { nums: a };
}, ({ nums }) => {
  const c = new Map<number, number>();
  for (const x of nums) c.set(x, (c.get(x) ?? 0) + 1);
  return String([...c].find(([, v]) => v > nums.length / 2)![0]);
});

// 128
run('128 longest consecutive sequence', longestConsecutiveSequence, () => ({ nums: nums(1, 12, -3, 12) }), ({ nums }) => {
  const u = [...new Set(nums)].sort((a: number, b: number) => a - b);
  let best = 1, cur = 1;
  for (let i = 1; i < u.length; i++) { cur = u[i] === u[i - 1] + 1 ? cur + 1 : 1; best = Math.max(best, cur); }
  return String(best);
});

// 13 (every numeral whose Roman form fits the 12-symbol cap is also covered by parseInput)
run('13 roman to integer', romanToInteger, () => {
  let v: number, r: string;
  do { v = int(1, 3999); r = toRoman(v); } while (r.length > 12);
  return { s: r, v };
}, ({ v }) => String(v));

// 14
run('14 longest common prefix', longestCommonPrefix, () => {
  const base = str('ab', 0, 5);
  return { words: Array.from({ length: int(1, 6) }, () => (rnd() < 0.7 ? base.slice(0, int(1, 9)) : '') + str('ab', 1, 4)).map((w) => w.slice(0, 9)) };
}, ({ words }) => {
  let p = words[0];
  for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1);
  return JSON.stringify(p);
});

// 271
run('271 encode and decode strings', encodeAndDecodeStrings, () => {
  while (true) {
    const words = Array.from({ length: int(1, 4) }, () => str('ab#1x', 1, 6));
    if (words.map((w: string) => `${w.length}#${w}`).join('').length <= 24) return { words };
  }
}, ({ words }) => JSON.stringify(words));

// 205
run('205 isomorphic strings', isomorphicStrings, () => { const n = int(1, 10); return { s: str('abc', n, n), t: str('xyz', n, n) }; }, ({ s, t }) => {
  const a = new Map<string, string>(), b = new Map<string, string>();
  for (let i = 0; i < s.length; i++) {
    if ((a.has(s[i]) && a.get(s[i]) !== t[i]) || (b.has(t[i]) && b.get(t[i]) !== s[i])) return 'false';
    a.set(s[i], t[i]); b.set(t[i], s[i]);
  }
  return 'true';
});

// 344
run('344 reverse string', reverseString, () => ({ s: str('abcdefgh', 1, 12) }), ({ s }) => JSON.stringify([...s].reverse().join('')));

// 3
run('3 longest substring without repeating', longestSubstringWithoutRepeating, () => ({ s: str('abcd', 1, 12) }), ({ s }) => {
  let best = 0;
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (new Set(s.slice(i, j + 1)).size === j - i + 1) best = Math.max(best, j - i + 1);
  return String(best);
});

// 424
run('424 longest repeating character replacement', longestRepeatingCharacterReplacement, () => ({ s: str('ABC', 1, 12).toUpperCase(), k: int(0, 4) }), ({ s, k }) => {
  let best = 0;
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) {
    const c: Record<string, number> = {};
    for (const ch of s.slice(i, j + 1)) c[ch] = (c[ch] ?? 0) + 1;
    if (j - i + 1 - Math.max(...Object.values(c)) <= k) best = Math.max(best, j - i + 1);
  }
  return String(best);
});

// 76
run('76 minimum window substring', minimumWindowSubstring, () => ({ s: str('abc', 1, 12), t: str('abc', 1, 5) }), ({ s, t }) => {
  const need = sortedKey(t);
  let best = '';
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) {
    const w = s.slice(i, j + 1);
    if (best && w.length >= best.length) continue;
    const c: Record<string, number> = {};
    for (const ch of w) c[ch] = (c[ch] ?? 0) + 1;
    if ([...t].every((ch) => { c[ch]--; return c[ch] >= 0; }) && (!best || w.length < best.length)) best = w;
  }
  void need;
  return JSON.stringify(best);
});

// 567
run('567 permutation in string', permutationInString, () => ({ p: str('abc', 1, 5), s: str('abc', 1, 12) }), ({ p, s }) => {
  const key = sortedKey(p);
  for (let i = 0; i + p.length <= s.length; i++) if (sortedKey(s.slice(i, i + p.length)) === key) return 'true';
  return 'false';
});

// 438
run('438 find all anagrams', findAllAnagrams, () => ({ s: str('abc', 1, 12), p: str('abc', 1, 4) }), ({ s, p }) => {
  const key = sortedKey(p);
  const out: number[] = [];
  for (let i = 0; i + p.length <= s.length; i++) if (sortedKey(s.slice(i, i + p.length)) === key) out.push(i);
  return JSON.stringify(out);
});

// 242
run('242 valid anagram', validAnagram, () => ({ s: str('abc', 1, 10), t: str('abc', 1, 10) }), ({ s, t }) => String(sortedKey(s) === sortedKey(t)));
// make sure the true branch is exercised often
run('242 valid anagram (shuffled)', validAnagram, () => { const s = str('abcd', 1, 10); return { s, t: [...s].sort(() => rnd() - 0.5).join('') }; }, ({ s, t }) => String(sortedKey(s) === sortedKey(t)));

// 49
run('49 group anagrams', groupAnagrams, () => ({ words: Array.from({ length: int(1, 8) }, () => str('abc', 1, 4)) }), ({ words }) => {
  const m = new Map<string, string[]>();
  for (const w of words) m.set(sortedKey(w), [...(m.get(sortedKey(w)) ?? []), w]);
  return JSON.stringify([...m.values()]);
});

// 1189
run('1189 maximum number of balloons', maximumNumberOfBalloons, () => ({ text: str('balonxy', 1, 15) }), ({ text }) => {
  let k = 0;
  const pool = text.split('');
  outer: while (true) {
    for (const ch of 'balloon') {
      const i = pool.indexOf(ch);
      if (i < 0) break outer;
      pool.splice(i, 1);
    }
    k++;
  }
  return String(k);
});
run('1189 maximum number of balloons (rich)', maximumNumberOfBalloons, () => ({ text: str('balloonba', 7, 15) }), ({ text }) => {
  const c = (ch: string) => [...text].filter((x) => x === ch).length;
  return String(Math.min(c('b'), c('a'), Math.floor(c('l') / 2), Math.floor(c('o') / 2), c('n')));
});

// 125
run('125 valid palindrome', validPalindrome, () => ({ s: str('aAbB ,:1', 1, 15) }), ({ s }) => {
  const t = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return String(isPal(t));
});
run('125 valid palindrome (mirrored)', validPalindrome, () => {
  const h = str('abAB1', 1, 5);
  const mid = rnd() < 0.5 ? '' : str('ab', 1, 1);
  const mirror = [...h].reverse().join('').toUpperCase();
  let s = `${h}${mid}${mirror}`;
  if (rnd() < 0.5) s = s.split('').map((c) => (rnd() < 0.2 ? c + ' ' : c)).join('');
  if (rnd() < 0.3) { const i = int(0, s.length - 1); s = s.slice(0, i) + 'z' + s.slice(i + 1); }
  return { s: s.trim().slice(0, 15) || 'a' };
}, ({ s }) => String(isPal(s.toLowerCase().replace(/[^a-z0-9]/g, ''))));

// 680
run('680 valid palindrome II', validPalindromeII, () => ({ s: str('ab', 1, 12) }), ({ s }) => {
  if (isPal(s)) return 'true';
  for (let i = 0; i < s.length; i++) if (isPal(s.slice(0, i) + s.slice(i + 1))) return 'true';
  return 'false';
});
run('680 valid palindrome II (near-palindromes)', validPalindromeII, () => {
  const h = str('abc', 1, 5);
  const s = h + (rnd() < 0.5 ? str('abc', 1, 1) : '') + [...h].reverse().join('');
  const i = int(0, s.length);
  return { s: (rnd() < 0.7 ? s.slice(0, i) + str('abc', 1, 1) + s.slice(i) : s).slice(0, 12) };
}, ({ s }) => {
  if (isPal(s)) return 'true';
  for (let i = 0; i < s.length; i++) if (isPal(s.slice(0, i) + s.slice(i + 1))) return 'true';
  return 'false';
});

// 5
run('5 longest palindromic substring', longestPalindromicSubstring, () => ({ s: str('abc', 1, 10) }), ({ s }) => {
  let best = s[0];
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (j - i + 1 > best.length && isPal(s.slice(i, j + 1))) best = s.slice(i, j + 1);
  return JSON.stringify(best);
});

// 647
run('647 palindromic substrings', palindromicSubstrings, () => ({ s: str('ab', 1, 8) }), ({ s }) => {
  let c = 0;
  for (let i = 0; i < s.length; i++) for (let j = i; j < s.length; j++) if (isPal(s.slice(i, j + 1))) c++;
  return String(c);
});

// ---------- every example must run through parseInput-free buildSteps and report its documented output
import { arrays2strings } from '../src/problems/groups/arrays2strings.ts';
for (const p of arrays2strings) {
  for (const ex of p.examples) {
    const steps = p.buildSteps(ex.input);
    const got = steps[steps.length - 1].result?.title;
    const norm = (x: string) => x.replace(/\s+/g, '');
    const o = norm(ex.output);
    // example outputs for 49 are written in "any order" form; compare as sorted group lists
    const same = p.slug.startsWith('49-')
      ? JSON.stringify(JSON.parse(got).map((g: string[]) => [...g].sort()).sort()) === JSON.stringify(JSON.parse(o).map((g: string[]) => [...g].sort()).sort())
      : norm(got) === o;
    if (!same) { failures++; console.log(`FAIL example ${p.slug} [${ex.label}]: got ${got} expected ${ex.output}`); }
  }
}
console.log(`registered problems in group: ${arrays2strings.length}`);

console.log(failures ? `\n${failures} FUZZ GROUP(S) FAILED` : '\nALL FUZZ TESTS PASSED');
process.exit(failures ? 1 : 0);
