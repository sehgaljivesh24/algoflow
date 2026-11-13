/**
 * Fuzz test for pack p11 (union-find: number of provinces with union by rank + path compression): random isConnected
 * matrices, the animation's final answer vs a plain DFS component count, plus structural checks of every step.
 * Run:  node scripts/fuzz-unionfind2.mts        (exits non-zero on any mismatch)
 *   env FUZZ_N=<count>  random matrices (default 400)
 */
import { pack11 } from '../src/problems/groups/pack11.ts';
import { checkScene } from './check-scenes.mts';

let seed = 20261114;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ri = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

/** Reference: connected components by DFS over the adjacency matrix. */
function provincesDfs(m: number[][]): number {
  const n = m.length;
  const seen = new Array<boolean>(n).fill(false);
  let count = 0;
  const dfs = (u: number) => { seen[u] = true; for (let v = 0; v < n; v++) if (m[u][v] === 1 && !seen[v]) dfs(v); };
  for (let i = 0; i < n; i++) if (!seen[i]) { count++; dfs(i); }
  return count;
}

function randMatrix(): number[][] {
  const n = ri(1, 7);
  const p = [0.1, 0.2, 0.35, 0.6][ri(0, 3)];
  const m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rnd() < p) { m[i][j] = 1; m[j][i] = 1; }
  return m;
}
const toRaw = (m: number[][]) => m.map((r) => r.join('')).join('|');
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const N = Number(process.env.FUZZ_N ?? 400);
let failed = 0;
const fail = (msg: string) => { failed++; if (failed <= 8) console.log(`FAIL ${msg}`); };

const p = pack11[0];
if (pack11.length !== 1 || !p) { console.log('FAIL pack11 should hold exactly one problem'); process.exit(1); }
if (p.phases && p.phases.length !== p.algorithm.length) fail('phases and algorithm differ in length');

let sawCompress = 0;
let sawSkip = 0;
let sawShorterUnder = 0;
for (let k = 0; k < N; k++) {
  const m = randMatrix();
  const raw = toRaw(m);
  let input;
  try { input = p.parseInput(raw); } catch (e) { fail(`parseInput rejected "${raw}": ${e}`); continue; }
  const steps = p.buildSteps(input);
  const want = provincesDfs(m);
  const res = steps[steps.length - 1].result;
  const issues: string[] = [];
  if (!res || res.title !== String(want)) issues.push(`expected ${want} got ${res?.title}`);
  const edges = m.flatMap((row, i) => row.flatMap((v, j) => (j > i && v === 1 ? [[i, j]] : [])));
  const last = steps[steps.length - 1];
  if (last.vars.components !== want) issues.push(`final components ${last.vars.components} != ${want}`);
  if (last.vars.unions !== m.length - want) issues.push(`unions ${last.vars.unions} != n - answer ${m.length - want}`);
  if (last.vars.finds !== 2 * edges.length) issues.push(`finds ${last.vars.finds} != ${2 * edges.length}`);
  // the final forest must draw exactly `want` roots (graph part of the split scene) and no cycles
  const forest = (last.scene as any).parts[1];
  const roots = forest.nodes.filter((nd: any) => !forest.edges.some((e: any) => e.from === nd.id));
  if (roots.length !== want) issues.push(`forest shows ${roots.length} roots, expected ${want}`);
  if (forest.edges.length !== m.length - roots.length) issues.push('forest edge count');
  // every step: no early result, tag + note, narration length, valid indices, deterministic
  let prevComponents = m.length;
  steps.forEach((s, i) => {
    if (i < steps.length - 1 && s.result) issues.push(`result before the end (step ${i})`);
    if (!s.tag || !s.note) issues.push(`step ${i} lacks tag/note`);
    if (s.note && s.note.includes('//')) issues.push(`step ${i} note contains //`);
    const w = words(s.desc);
    if (w < 8 || w > 30) issues.push(`step ${i} narration has ${w} words`);
    if (!(s.algoStep >= 0 && s.algoStep < p.algorithm.length)) issues.push(`step ${i} algoStep`);
    if (!s.javaLines.every((l) => l >= 0 && l < p.java.length)) issues.push(`step ${i} java line`);
    if (!s.pyLines.every((l) => l >= 0 && l < p.python.length)) issues.push(`step ${i} python line`);
    if (!p.varLabels.every((v: string) => v in s.vars)) issues.push(`step ${i} vars`);
    if (s.alert && s.tag !== 'SKIP') issues.push(`step ${i} has an alert but is not a skip`);
    if (s.tag === 'SKIP' && !s.alert) issues.push(`step ${i} skip without alert`);
    const comps = Number(s.vars.components);
    if (comps > prevComponents || prevComponents - comps > 1) issues.push(`step ${i} components jumped ${prevComponents} -> ${comps}`);
    prevComponents = comps;
    if (s.tag === 'COMPRESS') sawCompress++;
    if (s.tag === 'SKIP') sawSkip++;
    if (s.tag === 'UNION' && /shorter tree goes under the taller/.test(s.desc)) sawShorterUnder++;
    checkScene(s, `step ${i}`, (nm: string, ok: boolean, extra?: string) => { if (!ok) issues.push(`${nm} ${extra ?? ''}`); });
  });
  if (last.algoStep !== p.algorithm.length - 1) issues.push('last step does not light the Done chip');
  if (steps.length < 2 || steps.length > 400) issues.push(`${steps.length} steps`);
  if (JSON.stringify(p.buildSteps(input)) !== JSON.stringify(steps)) issues.push('not deterministic');
  if (issues.length) fail(`input "${raw}": ${issues.slice(0, 4).join('; ')}`);
}
console.log(`${failed ? 'FAIL' : 'ok  '} ${p.slug} (${N} random matrices; saw ${sawCompress} compressions, ${sawSkip} skips, ${sawShorterUnder} shorter-under-taller unions)`);
if (!sawCompress || !sawSkip || !sawShorterUnder) fail('the random cases never exercised compression / skip / rank comparison');

// the declared examples: outputs truthful, and the page's flagship example is rich enough
for (const e of p.examples) {
  const steps = p.buildSteps(e.input);
  const got = steps.at(-1)!.result?.title;
  if (got !== e.output || got !== String(provincesDfs(e.input.isConnected))) fail(`[${e.label}] declared ${e.output}, animation says ${got}, reference ${provincesDfs(e.input.isConnected)}`);
  if (e.answer && !e.answer.startsWith(`${e.output} `)) fail(`[${e.label}] answer text should start with the output`);
}
{
  const e = p.examples[0];
  const steps = p.buildSteps(e.input);
  const tags = steps.map((s) => s.tag);
  const n = e.input.isConnected.length;
  if (steps.length < 10) fail(`flagship example has only ${steps.length} steps`);
  if (n < 4 || n > 6) fail(`flagship example has ${n} cities (want 4-6)`);
  if (!tags.includes('COMPRESS')) fail('flagship example never compresses a path');
  if (!tags.includes('SKIP')) fail('flagship example has no already-connected skip');
  if (!steps.some((s) => s.tag === 'UNION' && /shorter tree goes under the taller/.test(s.desc))) fail('flagship example never attaches a shorter tree under a taller one');
  if (!steps.some((s) => s.tag === 'UNION' && /equal heights/.test(s.desc))) fail('flagship example has no equal-rank union');
  console.log(`flagship example: ${steps.length} steps, answer ${steps.at(-1)!.result?.title}`);
}
// custom input parsing: friendly errors
for (const bad of ['', '12|21', '10|01|11', '110|100|001', '11|1', '10101010|01010101']) {
  let threw = false;
  try { p.parseInput(bad); } catch (e) { threw = e instanceof Error && e.message.length > 5; }
  if (!threw) fail(`parseInput accepted bad input "${bad}"`);
}
try {
  const ok = p.parseInput('1 1 0 | 1 1 0 | 0 0 1');
  if (JSON.stringify(ok.isConnected) !== '[[1,1,0],[1,1,0],[0,0,1]]') fail('spaced input parsed wrongly');
} catch (e) { fail(`spaced input rejected: ${e}`); }

if (failed) { console.log(`\n${failed} problem(s) failed`); process.exit(1); }
console.log('\nALL OK');
