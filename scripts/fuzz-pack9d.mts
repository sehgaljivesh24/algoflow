/**
 * Fuzz for pack p9 fragment d (suffix structures + Aho-Corasick). Random valid inputs are built as raw strings (so
 * parseInput is exercised), the final result is compared with a brute-force reference, every example's declared
 * output is compared too, and every step's scene goes through checkScene.
 * Run:  node scripts/fuzz-pack9d.mts   (env FUZZ_N=200)
 */
import { rng } from '../src/problems/graphKit.ts';
import { checkScene } from './check-scenes.mts';
import { suffixArrayAndLcpProblem, suffixArrayAndLcp } from '../src/problems/p9/suffixArrayAndLcp.ts';
import { countDistinctSubstrings, countDistinct } from '../src/problems/p9/countDistinctSubstrings.ts';
import { patternSearchSuffixArray, searchPositions } from '../src/problems/p9/patternSearchSuffixArray.ts';
import { ahoCorasickBuild } from '../src/problems/p9/ahoCorasickBuild.ts';
import { multiKeywordSearch, findAll } from '../src/problems/p9/multiKeywordSearch.ts';
import { streamOfCharacters, streamAnswers } from '../src/problems/p9/streamOfCharacters.ts';
import { Aho, bruteFail } from '../src/problems/p9/kitD.ts';

const N = Number(process.env.FUZZ_N ?? 200);
type R = () => number;
const ri = (r: R, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const word = (r: R, len: number, alpha: number) => Array.from({ length: len }, () => String.fromCharCode(97 + ri(r, 0, alpha - 1))).join('');
const fmt = (a: (number | string)[]) => `[${a.join(', ')}]`;

let failures = 0;
const fail = (slug: string, raw: string, msg: string) => {
  failures++;
  if (failures <= 25) console.log(`FAIL ${slug} [${raw}]: ${msg}`);
};

const outOf = (res: { title: string; text: string }, sep: string) => `${res.title}${sep}${res.text}`;

interface Case { slug: string; def: any; gen: (r: R) => string; expect: (raw: string, input: any) => string; sep: string; exampleRaw?: (ex: any) => string }
const cases: Case[] = [
  {
    slug: 'suffix array', def: suffixArrayAndLcpProblem, sep: ', ',
    gen: (r) => word(r, ri(r, 2, 8), ri(r, 1, 4)),
    expect: (_raw, input) => { const { sa, lcp } = suffixArrayAndLcp(input.s); return `SA = ${fmt(sa)}, LCP = ${fmt(lcp)}`; },
  },
  {
    slug: 'distinct substrings', def: countDistinctSubstrings, sep: '|',
    gen: (r) => word(r, ri(r, 2, 7), ri(r, 1, 4)),
    expect: (_raw, input) => `${countDistinct(input.s)}|Distinct non-empty substrings`,
  },
  {
    slug: 'pattern search', def: patternSearchSuffixArray, sep: ' ',
    gen: (r) => { const s = word(r, ri(r, 2, 8), ri(r, 1, 3)); const p = r() < 0.6 ? s.slice(ri(r, 0, s.length - 1), ri(r, 1, s.length)) || 'a' : word(r, ri(r, 1, 4), 3); return `${s} ${p.slice(0, 4)}`; },
    expect: (_raw, input) => { const pos = searchPositions(input.s, input.p); return `${pos.length} match${pos.length === 1 ? '' : 'es'} at ${fmt(pos)}`; },
  },
  {
    slug: 'aho build', def: ahoCorasickBuild, sep: ', ',
    gen: (r) => Array.from({ length: ri(r, 1, 6) }, () => word(r, ri(r, 1, 5), ri(r, 1, 3))).join(' '),
    expect: (_raw, input) => {
      const a = new Aho();
      input.words.forEach((w: string) => a.insert(w));
      const f = a.trie.nodes.map((n) => (n.id === 0 ? 0 : bruteFail(a, n.id)));
      return `${f.length} states, fail = ${fmt(f)}`;
    },
  },
  {
    slug: 'multi keyword', def: multiKeywordSearch, sep: ': ',
    gen: (r) => `${Array.from({ length: ri(r, 1, 6) }, () => word(r, ri(r, 1, 4), ri(r, 1, 3))).join(' ')} | ${word(r, ri(r, 1, 12), ri(r, 1, 3))}`,
    expect: (_raw, input) => { const h = findAll(input.words, input.text); return `${h.length} match${h.length === 1 ? '' : 'es'}: [${h.join(', ')}]`; },
  },
  {
    slug: 'stream', def: streamOfCharacters, sep: '|',
    gen: (r) => `${Array.from({ length: ri(r, 1, 5) }, () => word(r, ri(r, 1, 4), ri(r, 1, 3))).join(' ')} | ${word(r, ri(r, 1, 12), ri(r, 1, 3))}`,
    expect: (_raw, input) => `[${['null', ...streamAnswers(input.words, input.text).map(String)].join(', ')}]|Return values of the constructor and the queries`,
  },
];

// state ids of the automaton: failure links also compared state by state (independent of the step animation)
{
  const r = rng(7);
  for (let k = 0; k < N; k++) {
    const words = Array.from({ length: ri(r, 1, 6) }, () => word(r, ri(r, 1, 5), ri(r, 1, 3)));
    const a = new Aho();
    words.forEach((w) => a.insert(w));
    a.buildAll();
    for (const n of a.trie.nodes) if (n.id !== 0 && a.fail[n.id] !== bruteFail(a, n.id)) fail('aho model', words.join(' '), `fail[${n.id}]`);
  }
}

for (const c of cases) {
  const r = rng(1234 + c.slug.length);
  let maxSteps = 0;
  for (let k = 0; k < N; k++) {
    const raw = c.gen(r);
    let input: any;
    try { input = c.def.parseInput(raw); } catch (e) { fail(c.slug, raw, `parseInput threw: ${e}`); continue; }
    let steps: any[];
    try { steps = c.def.buildSteps(input); } catch (e) { fail(c.slug, raw, `buildSteps threw: ${e}`); continue; }
    maxSteps = Math.max(maxSteps, steps.length);
    if (steps.length > 400) fail(c.slug, raw, `${steps.length} steps`);
    const res = steps[steps.length - 1].result;
    if (!res) { fail(c.slug, raw, 'no result'); continue; }
    const want = c.expect(raw, input);
    const got = outOf(res, c.sep);
    if (want !== got) fail(c.slug, raw, `want ${want} got ${got}`);
    steps.forEach((s, i) => checkScene(s, `${c.slug} [${raw}] step ${i}`, (name, cond, extra) => { if (!cond) fail(c.slug, raw, `${name} ${extra ?? ''}`); }));
  }
  // examples: declared output must equal the computed result
  for (const ex of c.def.examples) {
    const steps = c.def.buildSteps(ex.input);
    const res = steps[steps.length - 1].result;
    const got = outOf(res, c.sep);
    const shown = c.slug === 'stream' ? got.split('|')[0] : c.slug === 'distinct substrings' ? got.split('|')[0] : got;
    if (ex.output !== shown) fail(c.slug, ex.label, `example output "${ex.output}" but animation says "${shown}"`);
  }
  console.log(`${c.slug}: ${N} inputs, max ${maxSteps} steps`);
}

console.log(failures ? `\n${failures} FUZZ FAILURE(S)` : '\nALL FUZZ CHECKS PASSED');
process.exit(failures ? 1 : 0);
