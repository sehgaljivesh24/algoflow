// Prints each example's computed result next to its declared output (eyeball helper).
import { graphs } from '../src/problems/groups/graphs.ts';
for (const p of graphs) {
  for (const ex of p.examples) {
    const steps = p.buildSteps(ex.input);
    const got = steps[steps.length - 1].result?.title ?? '(none)';
    const norm = (s: string) => s.replace(/\s*\(.*\)\s*$/, '').replace(/\s+/g, ' ').trim();
    const same = norm(got) === norm(ex.output) || (norm(ex.output).toLowerCase() === 'no' && got === 'No');
    console.log(`${same ? 'ok  ' : 'DIFF'} ${p.slug} [${ex.label}] expected "${ex.output}" got "${got}"`);
  }
}
