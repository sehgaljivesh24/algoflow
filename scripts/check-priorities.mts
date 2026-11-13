/**
 * Priority coverage: every pattern-pack problem has an explicit rating in exactly one of the P1/P2/P3 lists, no list
 * names an unknown slug, and the lists do not overlap.   Run:  node scripts/check-priorities.mts
 */
import { ALL_ENTRIES, slugify } from '../src/data/catalog.ts';
import { PACKS } from '../src/data/packs/index.ts';
import { P1_SLUGS, P2_SLUGS, P3_SLUGS, PRIORITY } from '../src/data/priorities.ts';

let failures = 0;
const fail = (m: string) => {
  failures++;
  console.log(`FAIL  ${m}`);
};

const all = new Set(ALL_ENTRIES.map((e) => e.slug));
const lists: [string, ReadonlySet<string>][] = [['P1', P1_SLUGS], ['P2', P2_SLUGS], ['P3', P3_SLUGS]];

for (const [name, set] of lists) for (const s of set) if (!all.has(s)) fail(`${name} list names unknown slug "${s}"`);
for (let i = 0; i < lists.length; i++)
  for (let j = i + 1; j < lists.length; j++)
    for (const s of lists[i][1]) if (lists[j][1].has(s)) fail(`"${s}" is in both ${lists[i][0]} and ${lists[j][0]}`);
for (const s of Object.keys(PRIORITY)) if (!all.has(s)) fail(`priority map has unknown slug "${s}"`);

let packCount = 0;
for (const pack of PACKS)
  for (const p of pack.problems ?? []) {
    packCount++;
    const slug = `${p.id.toLowerCase()}-${slugify(p.title)}`;
    const n = lists.filter(([, set]) => set.has(slug)).length;
    if (n === 0) fail(`pack problem "${slug}" has no explicit priority`);
  }

const c = { p1: 0, p2: 0, p3: 0 };
for (const e of ALL_ENTRIES) c[PRIORITY[e.slug]]++;
console.log(`${packCount} pack problems checked; library split P1 ${c.p1} / P2 ${c.p2} / P3 ${c.p3} of ${ALL_ENTRIES.length}`);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('priorities OK');
