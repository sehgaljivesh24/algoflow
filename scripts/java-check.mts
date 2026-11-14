/**
 * Compiles and runs the Java shown on each problem's code panel.
 *   node scripts/java-check.mts                 all cases in scripts/javacheck/cases-*.mts
 *   ONLY=slug1,slug2 node scripts/java-check.mts
 *   RUNS=20 SEED=3 node scripts/java-check.mts  random inputs per problem (default: the case's `runs` or 12)
 *   KEEP=1 ...                                  keep the generated sources in the temp folder
 * Needs a JDK (javac/java): found via JAVA_HOME, PATH, or C:\Program Files\Common Files\Oracle\Java\javapath.
 * Each problem is compiled as its own package, so class names (Solution, ListNode, Main...) never collide.
 */
import { readdirSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { ALL_PROBLEMS } from '../src/problems/registry.ts';
import type { JavaCase, JavaCaseModule } from './javacheck/types.ts';
import type { CaseModule } from './oracle/types.ts';
import { rng } from './oracle/util.ts';

const here = dirname(fileURLToPath(import.meta.url));
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const SEED = Number(process.env.SEED ?? 1);
const win = process.platform === 'win32';
const home = process.env.JAVA_HOME;
const fallback = 'C:\\Program Files\\Common Files\\Oracle\\Java\\javapath';
const tool = (n: string): string => {
  const exe = n + (win ? '.exe' : '');
  for (const dir of [home ? join(home, 'bin') : '', fallback]) if (dir && existsSync(join(dir, exe))) return join(dir, exe);
  return n;
};
const JAVAC = tool('javac'), JAVA = tool('java');

const hash = (s: string): number => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

// oracle generators (reused for random inputs)
const gens = new Map<string, (r: () => number) => unknown>();
for (const f of readdirSync(join(here, 'oracle')).filter((x) => /^cases-.*\.mts$/.test(x))) {
  const mod = (await import(pathToFileURL(join(here, 'oracle', f)).href)) as CaseModule;
  for (const c of mod.cases) gens.set(c.slug, c.gen);
}
const cases: JavaCase[] = [];
const dir = join(here, 'javacheck');
if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => /^cases-.*\.mts$/.test(x)).sort()) cases.push(...((await import(pathToFileURL(join(dir, f)).href)) as JavaCaseModule).cases);

const bySlug = new Map(ALL_PROBLEMS.map((p) => [p.slug, p]));
const work = join(tmpdir(), `algoflow-javacheck-${process.pid}`); // one folder per process: parallel runs must never share or delete each other's files
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'src'), { recursive: true });

interface Job { c: JavaCase; pkg: string; inputs: unknown[]; labels: string[]; steps: unknown[][]; expected: string[] }
const jobs: Job[] = [];
const problems: string[] = [];
const seen = new Set<string>();
let idx = 0;
for (const c of cases) {
  if (ONLY.length && !ONLY.includes(c.slug)) continue;
  if (seen.has(c.slug)) { problems.push(`${c.slug}: defined twice`); continue; }
  seen.add(c.slug);
  const p = bySlug.get(c.slug);
  if (!p) { problems.push(`${c.slug}: unknown slug`); continue; }
  const inputs: unknown[] = p.examples.map((e) => e.input);
  const labels = p.examples.map((_, i) => `declared example ${i + 1}`);
  const g = c.gen ?? gens.get(c.slug);
  const runs = process.env.RUNS ? Number(process.env.RUNS) : c.runs ?? 12;
  if (g) { const r = rng(hash(c.slug) ^ SEED); for (let i = 0; i < runs; i++) { inputs.push(g(r)); labels.push(`random #${i + 1}`); } }
  const steps: unknown[][] = [], expected: string[] = [];
  let ok = true;
  for (const input of inputs) {
    try { const st = p.buildSteps(input as never); steps.push(st); expected.push(c.expected(input, st)); }
    catch (e) { problems.push(`${c.slug}: cannot build expected for ${JSON.stringify(input)}: ${(e as Error).message}`); ok = false; break; }
  }
  if (!ok) continue;
  jobs.push({ c, pkg: `p${idx++}`, inputs, labels, steps, expected });
}

const prelude = 'import java.util.*;\n';
const files: string[] = [];
for (const j of jobs) {
  const p = bySlug.get(j.c.slug)!;
  const code = (p.java as string[]).join('\n');
  const body = j.inputs.map((inp, i) => `        try {\n${j.c.main(inp)}\n        } catch (Throwable t) { System.out.println("EXC " + t); }\n        System.out.println("~~CASE~~${i}~~");`).join('\n');
  const src = `package ${j.pkg};\n${prelude}${j.c.extra ?? ''}\n${j.c.noWrap ? code : `class Solution {\n${code}\n}`}\npublic class Main {\n    public static void main(String[] args) {\n${body}\n    }\n}\n`;
  mkdirSync(join(work, 'src', j.pkg), { recursive: true });
  const f = join(work, 'src', j.pkg, 'Main.java');
  writeFileSync(f, src);
  files.push(f);
}

const out = join(work, 'out');
mkdirSync(out, { recursive: true });
const failed = new Set<string>();
const messages: string[] = [];
let compileErrors = '';
if (files.length) {
  const r = spawnSync(JAVAC, ['-nowarn', '-encoding', 'UTF-8', '-d', out, ...files], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    compileErrors = (r.stderr || r.stdout || '').toString();
    // attribute errors to packages
    for (const m of compileErrors.matchAll(/src[\\/](p\d+)[\\/]Main\.java:(\d+): error: ([^\n]*)/g)) {
      const j = jobs.find((x) => x.pkg === m[1]);
      if (j) { failed.add(j.c.slug); if (messages.length < 80) messages.push(`${j.c.slug}: COMPILE ERROR line ${m[2]}: ${m[3]}`); }
    }
    if (!failed.size) messages.push('javac failed: ' + compileErrors.slice(0, 600));
  }
}

let runsDone = 0;
for (const j of jobs) {
  if (failed.has(j.c.slug)) continue;
  const classDir = join(out, j.pkg);
  if (!existsSync(classDir)) { // some other file failed to compile; retry this one alone
    const f = join(work, 'src', j.pkg, 'Main.java');
    const r1 = spawnSync(JAVAC, ['-nowarn', '-encoding', 'UTF-8', '-d', out, f], { encoding: 'utf8' });
    if (r1.status !== 0) { failed.add(j.c.slug); messages.push(`${j.c.slug}: COMPILE ERROR: ${(r1.stderr || '').split('\n')[0]}`); continue; }
  }
  const r = spawnSync(JAVA, ['-Xss16m', '-cp', out, `${j.pkg}.Main`], { encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0 && !r.stdout) { failed.add(j.c.slug); messages.push(`${j.c.slug}: run failed: ${r.error?.message ?? (r.stderr || '').slice(0, 200)}`); continue; }
  const chunks = (r.stdout as string).split(/~~CASE~~\d+~~\r?\n?/);
  for (let i = 0; i < j.inputs.length; i++) {
    runsDone++;
    const got = norm(chunks[i] ?? '');
    const want = norm(j.expected[i]);
    if (got !== want) {
      failed.add(j.c.slug);
      if (messages.length < 80) messages.push(`${j.c.slug} [${j.labels[i]}] input=${JSON.stringify(j.inputs[i])}\n    expected: ${want}\n    java    : ${got}`);
      break;
    }
  }
}

const covered = new Set(jobs.map((j) => j.c.slug));
const uncovered = ALL_PROBLEMS.filter((p) => !covered.has(p.slug) && !ONLY.length).map((p) => p.slug);
console.log(`java cases: ${jobs.length} · inputs run: ${runsDone} · failing problems: ${failed.size}${problems.length ? ` · setup problems: ${problems.length}` : ''}`);
console.log(`coverage: ${covered.size}/${ALL_PROBLEMS.length} problems have a Java case; ${uncovered.length} without`);
for (const j of jobs) if (j.c.notes && (process.env.VERBOSE || failed.has(j.c.slug))) console.log(`  note ${j.c.slug}: ${j.c.notes}`);
if (problems.length) console.log('\nSETUP PROBLEMS:\n' + problems.slice(0, 30).join('\n'));
if (messages.length) console.log('\n' + messages.slice(0, 40).join('\n'));
if (process.env.LIST_UNCOVERED) console.log('\nuncovered:\n' + uncovered.join('\n'));
if (!process.env.KEEP) { /* keep sources only on request */ rmSync(join(work), { recursive: true, force: true }); }
if (failed.size || problems.length || (process.env.STRICT_COVERAGE && uncovered.length)) { console.log('\nJAVA CHECK FAILED'); process.exit(1); }
console.log('\nJAVA CHECK PASSED');
