/**
 * Pack p9 fuzz: runs the per-fragment fuzz scripts (fuzz-pack9a..f.mts) one after another and fails if any of them fails.
 * Run: node scripts/fuzz-pack9.mts   (env FUZZ_N=200 is passed through)
 */
import { spawnSync } from 'node:child_process';

let failed = 0;
for (const x of ['a', 'b', 'c', 'd', 'e', 'f']) {
  const file = `scripts/fuzz-pack9${x}.mts`;
  const r = spawnSync(process.execPath, [file], { stdio: 'inherit', env: process.env });
  console.log(`== ${file}: ${r.status === 0 ? 'ok' : 'FAILED'}`);
  if (r.status !== 0) failed++;
}
console.log(failed ? `\n${failed} fragment fuzz script(s) FAILED` : '\nPACK 9 FUZZ PASSED (a-f)');
process.exit(failed ? 1 : 0);
