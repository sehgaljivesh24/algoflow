/**
 * Batch d2 check (stacks, linked lists, trees, cache design pattern pages).
 * Run:  node scripts/check-detail-d2.mts
 *  - every example problem of the 13 patterns: phases (same length as algorithm), a tag on EVERY step, a note on >= 80% of steps,
 *    narration 4..40 words, algoStep in range, the last step lights the last chip, final result present, deterministic steps;
 *  - 20 (valid parentheses) and 739 (daily temperatures) results vs plain reference solutions on random inputs.
 *  - text: 5 bullets (4 allowed only when listed), 6-8 practice items, 3-4 tags, complexity note 28-42 words, tip 18-38 words.
 */
import { examplesFor, CONTENT, ALL_PATTERNS } from '../src/data/patterns.ts';
import { PATTERN_META } from '../src/data/patternMeta.ts';
import { PROBLEMS } from '../src/problems/registry.ts';

const SLUGS = [
  'stack-simple', 'stack-monotonic-dec', 'stack-monotonic-inc',
  'linkedlist-fastslow', 'linkedlist-reversal', 'linkedlist-merge',
  'tree-dfs', 'tree-bfs', 'tree-paths', 'tree-bst', 'morris-traversal', 'tree-construction', 'lru-cache-design',
];
const NARROW = new Set<string>(); // patterns allowed 4 bullets

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.log(`FAIL ${m}`);
};
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

let stepsTotal = 0;
let noteTotal = 0;
for (const slug of SLUGS) {
  const c = CONTENT[slug];
  const card = ALL_PATTERNS.find((p) => p.slug === slug);
  const meta = PATTERN_META[slug];
  if (!c || !card || !meta) { fail(`${slug}: missing content/card/meta`); continue; }
  // ---- text
  const nb = c.whenToUse.length;
  if (!(nb === 5 || (nb === 4 && NARROW.has(slug)))) fail(`${slug}: ${nb} when-to-use bullets`);
  c.whenToUse.forEach((b, i) => {
    const w = words(b.replace(/\*\*/g, ''));
    if (w < 33 || w > 58) fail(`${slug}: bullet ${i + 1} has ${w} words`);
    if (!/\*\*[^*]+\*\*/.test(b)) fail(`${slug}: bullet ${i + 1} has no **bold** phrase`);
  });
  if (c.practice.length < 6 || c.practice.length > 8) fail(`${slug}: ${c.practice.length} practice items`);
  if (card.tags.length < 3 || card.tags.length > 4) fail(`${slug}: ${card.tags.length} hero tags`);
  const cw = words(meta.complexityNote);
  if (cw < 28 || cw > 42) fail(`${slug}: complexity note ${cw} words`);
  const tw = words(c.tip);
  if (tw < 18 || tw > 38) fail(`${slug}: tip ${tw} words`);
  if (!meta.highlight.some((h) => c.whenToUse.some((b) => b.toLowerCase().includes(h.toLowerCase())))) fail(`${slug}: no highlight phrase appears in the bullets`);

  // ---- animations
  const ex = examplesFor(slug);
  if (ex.length < 3) fail(`${slug}: only ${ex.length} examples`);
  if (ex[0]?.slug !== c.animation) fail(`${slug}: first example is not the flagship`);
  for (const e of ex) {
    const p = PROBLEMS.get(e.slug);
    if (!p) { fail(`${slug}: example ${e.slug} is not animated`); continue; }
    if (!p.phases) fail(`${e.slug}: no phases`);
    else if (p.phases.length !== p.algorithm.length) fail(`${e.slug}: phases ${p.phases.length} != algorithm ${p.algorithm.length}`);
    for (const exm of p.examples) {
      const steps = p.buildSteps(exm.input);
      const where = `${e.slug} [${exm.label}]`;
      const issues: string[] = [];
      let notes = 0;
      steps.forEach((s, i) => {
        if (!s.tag) issues.push(`step ${i + 1} has no tag`);
        if (s.note) notes++;
        const w = words(s.desc);
        if (w < 4 || w > 40) issues.push(`step ${i + 1} narration ${w} words`);
        if (!(s.algoStep >= 0 && s.algoStep < p.algorithm.length)) issues.push(`step ${i + 1} algoStep ${s.algoStep}`);
        if (i < steps.length - 1 && s.result) issues.push(`result before the end (step ${i + 1})`);
      });
      const last = steps[steps.length - 1];
      if (!last.result) issues.push('no final result');
      if (p.phases && last.algoStep !== p.phases.length - 1) issues.push(`last step lights chip ${last.algoStep}, not the final one`);
      // the pattern page animates examples[0] only; the other examples are edge cases for the full problem page
      if (exm === p.examples[0] && steps.length < 5) issues.push(`only ${steps.length} steps in the example the page animates`);
      if (JSON.stringify(p.buildSteps(exm.input)) !== JSON.stringify(steps)) issues.push('not deterministic');
      stepsTotal += steps.length;
      noteTotal += notes;
      if (notes < Math.ceil(steps.length * 0.8)) issues.push(`only ${notes}/${steps.length} steps have a note`);
      if (issues.length) fail(`${where}: ${issues.slice(0, 4).join('; ')}`);
    }
  }
}

// ---- reference checks for problems that have no other fuzz script
let seed = 1131;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
{
  const p = PROBLEMS.get('20-valid-parentheses')!;
  const ref = (s: string) => {
    const st: string[] = [];
    const m: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    for (const c of s) {
      if (m[c]) { if (st.pop() !== m[c]) return false; } else st.push(c);
    }
    return st.length === 0;
  };
  for (let t = 0; t < 300; t++) {
    const n = ri(1, 14);
    const s = Array.from({ length: n }, () => '()[]{}'[ri(0, 5)]).join('');
    const got = p.buildSteps(p.parseInput(s)).at(-1)!.result?.title;
    if (got !== String(ref(s))) { fail(`20 "${s}" got ${got}`); break; }
  }
  // a balanced string must end on the green verdict banner
  const steps = p.buildSteps({ s: '({[]})' });
  if (!steps.at(-1)!.alert?.startsWith('✅') || steps.length !== 8) fail('20 "({[]})" should take 8 steps and end on a ✅ verdict banner');
}
{
  const p = PROBLEMS.get('739-daily-temperatures')!;
  for (let t = 0; t < 300; t++) {
    const n = ri(1, 12);
    const a = Array.from({ length: n }, () => ri(30, 100));
    const want = a.map((x, i) => { for (let j = i + 1; j < n; j++) if (a[j] > x) return j - i; return 0; });
    const got = p.buildSteps({ temps: a }).at(-1)!.result?.title;
    if (got !== `[${want.join(', ')}]`) { fail(`739 ${a.join(' ')} got ${got}`); break; }
  }
}

console.log(`checked ${stepsTotal} steps, ${noteTotal} with an authored note (${Math.round((100 * noteTotal) / Math.max(1, stepsTotal))}%)`);
if (failures) {
  console.log(`\n${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('d2 checks passed');
