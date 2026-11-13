/**
 * Fuzz test for the two flagship sliding-window animations of the pattern pages.
 * Run:  node scripts/fuzz-windows.mts
 *  - 643 (fixed window): final result = best average of a plain O(n·k) reference; exactly n + 2 steps (1 start + k build + n-k slide + 1 done);
 *    the first example reproduces the reference animation (8 steps, maxSum 9, best window [2..4]).
 *  - 3 (dynamic window): final result = brute force; one step per expand / shrink / update; "pwwkew" gives exactly 17 steps.
 */
import { fixedWindow } from '../src/problems/fixedWindow.ts';
import { longestSubstringWithoutRepeating } from '../src/problems/longestSubstringWithoutRepeating.ts';
import { checkScene } from './check-scenes.mts';

let seed = 643003;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`FAIL ${msg}`);
};

function structural(name: string, p: any, steps: any[], input: unknown) {
  const issues: string[] = [];
  steps.forEach((s, i) => {
    if (i < steps.length - 1 && s.result) issues.push(`step ${i} has a result before the end`);
    if (!s.javaLines.every((l: number) => l >= 0 && l < p.java.length)) issues.push(`step ${i} java line`);
    if (!s.pyLines.every((l: number) => l >= 0 && l < p.python.length)) issues.push(`step ${i} python line`);
    if (!(s.algoStep >= 0 && s.algoStep < p.algorithm.length)) issues.push(`step ${i} algoStep`);
    if (p.phases && p.phases.length !== p.algorithm.length) issues.push('phases and algorithm differ in length');
    if (!p.varLabels.every((k: string) => k in s.vars)) issues.push(`step ${i} vars`);
    if (!s.tag || !s.note) issues.push(`step ${i} lacks tag / note`);
    checkScene(s, `step ${i}`, (n, c, extra) => { if (!c) issues.push(`${n} ${extra ?? ''}`); });
  });
  if (JSON.stringify(p.buildSteps(input)) !== JSON.stringify(steps)) issues.push('not deterministic');
  if (issues.length) fail(`${name} ${JSON.stringify(input)} -> ${issues.slice(0, 4).join('; ')}`);
}

// ---- 643
for (let t = 0; t < 200; t++) {
  const n = int(1, 12);
  const nums = Array.from({ length: n }, () => int(-9, 12));
  const k = int(1, n);
  const input = { nums, k };
  const steps = fixedWindow.buildSteps(input);
  let best = -Infinity;
  for (let i = 0; i + k <= n; i++) best = Math.max(best, nums.slice(i, i + k).reduce((a, b) => a + b, 0));
  const want = (best / k).toFixed(2);
  const got = steps[steps.length - 1].result?.title;
  if (got !== want) fail(`643 ${JSON.stringify(input)} got ${got} want ${want}`);
  if (steps.length !== n + 2) fail(`643 ${JSON.stringify(input)} has ${steps.length} steps, expected ${n + 2}`);
  structural('643', fixedWindow, steps, input);
}
{
  const steps = fixedWindow.buildSteps(fixedWindow.examples[0].input);
  const shown = steps.map((s) => `${s.vars.windowSum}/${s.vars.maxSum}/${s.vars.window}`).join(' | ');
  const expect = '0/—/— | 2/—/[0..0] | 3/—/[0..1] | 8/8/[0..2] | 7/8/[1..3] | 9/9/[2..4] | 6/9/[3..5] | 9/9/[2..4]';
  if (steps.length !== 8 || shown !== expect) fail(`643 example 1 steps differ from the reference: ${shown}`);
}

// ---- 3
for (let t = 0; t < 200; t++) {
  const n = int(1, 12);
  const s = Array.from({ length: n }, () => 'abcd'[int(0, 3)]).join('');
  const steps = longestSubstringWithoutRepeating.buildSteps({ s });
  let best = 0;
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) if (new Set(s.slice(i, j + 1)).size === j - i + 1) best = Math.max(best, j - i + 1);
  const got = steps[steps.length - 1].result?.title;
  if (got !== String(best)) fail(`3 "${s}" got ${got} want ${best}`);
  const expands = steps.filter((x) => x.tag === 'EXPAND:').length;
  const updates = steps.filter((x) => x.tag === 'UPDATE:').length;
  if (expands !== n || updates !== n) fail(`3 "${s}" expected ${n} expand and ${n} update steps, got ${expands} / ${updates}`);
  structural('3', longestSubstringWithoutRepeating, steps, { s });
}
{
  const steps = longestSubstringWithoutRepeating.buildSteps(longestSubstringWithoutRepeating.examples[0].input);
  const tags = steps.map((s) => s.tag?.replace(/[:!—]/g, '').trim()).join(',');
  const expect = 'READY,EXPAND,UPDATE,EXPAND,UPDATE,EXPAND,SHRINK,SHRINK,UPDATE,EXPAND,UPDATE,EXPAND,UPDATE,EXPAND,SHRINK,UPDATE,✅ Done';
  if (steps.length !== 17 || tags !== expect) fail(`3 "pwwkew" sequence differs from the reference: ${steps.length} steps: ${tags}`);
  if (steps.filter((s) => s.alert).length !== 3) fail('3 "pwwkew" should show the duplicate banner on exactly 3 steps (6, 7, 14)');
  if (steps[steps.length - 1].result?.title !== '3') fail('3 "pwwkew" must give 3');
}

// every example output equals the final result title (whitespace aside)
for (const p of [fixedWindow, longestSubstringWithoutRepeating] as any[]) {
  for (const ex of p.examples) {
    const steps = p.buildSteps(ex.input);
    if (steps[steps.length - 1].result?.title.replace(/\s+/g, '') !== ex.output.replace(/\s+/g, '')) fail(`example ${p.slug} [${ex.label}] output ${ex.output}`);
  }
}

console.log(failures ? `\n${failures} FUZZ CHECK(S) FAILED` : '\nALL FUZZ TESTS PASSED');
process.exit(failures ? 1 : 0);
