/**
 * Pack p5 fuzz runner: executes the four sub-group fuzz scripts (each compares every animation's final answer with a
 * brute-force reference — all spanning trees, all partitions, flow conservation + brute-force min cut, bridge /
 * colouring / SCC validation — and runs checkScene on every step). Run:  node scripts/fuzz-pack5.mts
 * (env FUZZ_N=200, FUZZ_ONLY=<slug part>) — exits non-zero if any sub-script fails.
 */
import { spawnSync } from 'node:child_process';

let bad = 0;
for (const part of ['a', 'b', 'c', 'd']) {
  console.log(`\n=== fuzz-pack5${part} ===`);
  const r = spawnSync(process.execPath, [`scripts/fuzz-pack5${part}.mts`], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) bad++;
}
console.log(bad ? `\n${bad} sub-script(s) FAILED` : '\nALL PACK p5 FUZZ CHECKS PASSED');
process.exit(bad ? 1 : 0);
