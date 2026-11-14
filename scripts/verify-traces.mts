/**
 * Step-by-step trace verification. For every oracle case (scripts/oracle/cases-*.mts) it runs the problem's animation on all
 * declared examples plus random inputs and requires that the animation's observable state, step by step, equals an INDEPENDENT
 * simulation of the algorithm (the oracle), modulo steps that do not change the observable state.
 *
 *   node scripts/verify-traces.mts                  run everything
 *   ONLY=643-maximum-average-subarray-i,1-two-sum node scripts/verify-traces.mts
 *   RUNS=200 SEED=7 node scripts/verify-traces.mts   more / different random inputs
 *   VERBOSE=1 ...                                    print every case
 *   STRICT_COVERAGE=1 ...                            also fail when a problem has no oracle case
 */
import { readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ALL_PROBLEMS } from '../src/problems/registry.ts';
import type { CaseModule, OracleCase, State } from './oracle/types.ts';
import { rng } from './oracle/util.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const RUNS_OVERRIDE = process.env.RUNS ? Number(process.env.RUNS) : undefined;
const SEED = Number(process.env.SEED ?? 1);
const VERBOSE = !!process.env.VERBOSE;

const norm = (v: unknown): unknown => (Array.isArray(v) ? v.map(norm) : v === undefined || v === '—' ? null : typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : v);
const keyOf = (s: State, keys: string[]): string => JSON.stringify(keys.map((k) => norm(s[k])));
const hash = (s: string): number => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

function compress(states: State[], keys: string[]): State[] {
  const out: State[] = [];
  let last = '';
  for (const s of states) {
    const k = keyOf(s, keys);
    if (k !== last || out.length === 0) { out.push(s); last = k; }
  }
  return out;
}

const files = readdirSync(join(here, 'oracle')).filter((f) => /^cases-.*\.mts$/.test(f)).sort();
const cases: { file: string; c: OracleCase }[] = [];
for (const f of files) {
  const mod = (await import(pathToFileURL(join(here, 'oracle', f)).href)) as CaseModule;
  for (const c of mod.cases) cases.push({ file: f, c });
}

const bySlug = new Map(ALL_PROBLEMS.map((p) => [p.slug, p]));
let failedCases = 0, runsDone = 0, stepsChecked = 0;
const failures: string[] = [];
const seen = new Set<string>();

for (const { file, c } of cases) {
  if (ONLY.length && !ONLY.includes(c.slug)) continue;
  if (seen.has(c.slug)) { failures.push(`${c.slug}: defined twice (${file})`); failedCases++; continue; }
  seen.add(c.slug);
  const problem = bySlug.get(c.slug);
  if (!problem) { failures.push(`${c.slug}: unknown slug (${file})`); failedCases++; continue; }

  const inputs: { input: unknown; label: string }[] = problem.examples.map((e, i) => ({ input: e.input, label: `declared example ${i + 1}` }));
  const runs = RUNS_OVERRIDE ?? c.runs ?? 60;
  const r = rng(hash(c.slug) ^ SEED);
  for (let i = 0; i < runs; i++) inputs.push({ input: c.gen(r), label: `random #${i + 1}` });

  let caseFailed = false;
  for (const { input, label } of inputs) {
    runsDone++;
    const fail = (msg: string) => {
      caseFailed = true;
      if (failures.length < 400) failures.push(`${c.slug} [${label}] input=${JSON.stringify(input)}\n    ${msg}`);
    };
    let steps;
    try { steps = problem.buildSteps(input as never); } catch (e) { fail(`buildSteps threw: ${(e as Error).message}`); continue; }
    stepsChecked += steps.length;

    // 1) invariants on every step
    for (const inv of c.invariants ?? []) {
      for (let i = 0; i < steps.length; i++) {
        const m = inv(steps[i], i, steps, input);
        if (m) { fail(`invariant violated at step ${i + 1} ("${steps[i].title}"): ${m}`); break; }
      }
    }

    // 2) trace equivalence with the oracle
    let expected: State[];
    try { expected = c.oracle(input); } catch (e) { fail(`oracle threw: ${(e as Error).message}`); continue; }
    const projected: { s: State; at: number }[] = [];
    steps.forEach((st, i) => { const p = c.project(st, input, i, steps); if (p) projected.push({ s: p, at: i }); });
    if (!projected.length) { fail('projection returned null for every step'); continue; }
    const keys = Object.keys(projected[0].s);
    const got = compress(projected.map((p) => p.s), keys);
    const want = compress(expected, keys);
    const n = Math.max(got.length, want.length);
    for (let i = 0; i < n; i++) {
      const a = got[i], b = want[i];
      if (!a || !b || keyOf(a, keys) !== keyOf(b, keys)) {
        const stepIdx = a ? projected.find((p) => p.s === a)?.at : undefined;
        const where = stepIdx !== undefined ? ` (animation step ${stepIdx + 1}: "${steps[stepIdx].title}")` : '';
        fail(`trace differs at state #${i + 1}${where}\n      oracle   : ${b ? JSON.stringify(Object.fromEntries(keys.map((k) => [k, b[k]]))) : '(trace ended)'}\n      animation: ${a ? JSON.stringify(Object.fromEntries(keys.map((k) => [k, a[k]]))) : '(trace ended)'}\n      lengths: oracle ${want.length}, animation ${got.length}`);
        break;
      }
    }
    if (caseFailed && !VERBOSE) break; // one failing input per problem is enough to report
  }
  if (caseFailed) failedCases++;
  if (VERBOSE || caseFailed) console.log(`${caseFailed ? 'FAIL' : 'ok  '} ${c.slug} (${inputs.length} inputs)${c.notes ? '  — not verified: ' + c.notes : ''}`);
}

const covered = new Set(cases.map((x) => x.c.slug));
const uncovered = ALL_PROBLEMS.filter((p) => !covered.has(p.slug)).map((p) => p.slug);
console.log(`\ncases: ${seen.size} (${files.length} files) · inputs run: ${runsDone} · animation steps checked: ${stepsChecked} · failing cases: ${failedCases}`);
console.log(`coverage: ${covered.size}/${ALL_PROBLEMS.length} problems have an oracle case; ${uncovered.length} without`);
if (failures.length) console.log('\n' + failures.slice(0, 60).join('\n') + (failures.length > 60 ? `\n... ${failures.length - 60} more` : ''));
if (process.env.LIST_UNCOVERED) console.log('\nuncovered:\n' + uncovered.join('\n'));
if (failedCases || (process.env.STRICT_COVERAGE && uncovered.length)) { console.log('\nTRACE VERIFICATION FAILED'); process.exit(1); }
console.log('\nTRACE VERIFICATION PASSED');
