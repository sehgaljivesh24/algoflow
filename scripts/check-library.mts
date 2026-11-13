/**
 * Validates the library data: every catalog slug has a priority, P1/P3 lists only name real slugs, the P1/P2/P3 split is
 * sensible, every topic / pattern family has presentation metadata (or a default), and pattern examples resolve.
 * Problems added by the pattern packs are not in the P1/P3 lists and therefore default to P2 (so the exact 25/40/35 split
 * of the original 188 is no longer asserted; only loose bounds are).   Run:  node scripts/check-library.mts
 */
import { ALL_ENTRIES, CATALOG } from '../src/data/catalog.ts';
import { P1_SLUGS, P3_SLUGS, PRIORITY } from '../src/data/priorities.ts';
import { ALL_PATTERNS, CONTENT, examplesFor, PATTERN_GROUPS } from '../src/data/patterns.ts';
import { familyId, familyMeta } from '../src/components/shell/familyMeta.ts';
import { TOPIC_META, topicTitle } from '../src/components/shell/topicMeta.ts';

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log(`FAIL  ${msg}`);
};

const slugs = new Set(ALL_ENTRIES.map((e) => e.slug));
if (slugs.size !== ALL_ENTRIES.length) fail('catalog has duplicate slugs');

for (const e of ALL_ENTRIES) {
  const p = PRIORITY[e.slug];
  if (p !== 'p1' && p !== 'p2' && p !== 'p3') fail(`no priority for ${e.slug}`);
}
for (const s of P1_SLUGS) if (!slugs.has(s)) fail(`P1 list names unknown slug "${s}"`);
for (const s of P3_SLUGS) if (!slugs.has(s)) fail(`P3 list names unknown slug "${s}"`);
for (const s of P1_SLUGS) if (P3_SLUGS.has(s)) fail(`"${s}" is in both the P1 and P3 lists`);
for (const s of Object.keys(PRIORITY)) if (!slugs.has(s)) fail(`priority map has unknown slug "${s}"`);

// ---- priority split: loose bounds (new pack problems default to P2) ----
const n = ALL_ENTRIES.length;
const count = { p1: 0, p2: 0, p3: 0 };
for (const e of ALL_ENTRIES) count[PRIORITY[e.slug]]++;
const pct = (x: number) => Math.round((x / n) * 100);
const unlisted = ALL_ENTRIES.filter((e) => !P1_SLUGS.has(e.slug) && !P3_SLUGS.has(e.slug)).length;
console.log(`${n} problems: P1 ${count.p1} (${pct(count.p1)}%), P2 ${count.p2} (${pct(count.p2)}%), P3 ${count.p3} (${pct(count.p3)}%); ${unlisted} unlisted (default P2)`);
if (count.p1 < 20) fail(`only ${count.p1} P1 problems`);
if (count.p3 < 20) fail(`only ${count.p3} P3 problems`);
if (pct(count.p1) < 10 || pct(count.p1) > 35) fail(`P1 share ${pct(count.p1)}% is outside 10-35%`);
if (pct(count.p3) > 45) fail(`P3 share ${pct(count.p3)}% is above 45%`);
if (count.p2 === 0) fail('no P2 problems');

// ---- topics: every category is displayable and tier filters are not empty for the classic topics ----
const CLASSIC = new Set([
  'Arrays', 'Strings', 'Matrix', 'Stack', 'Queue', 'Binary Search', 'Linked List', 'Greedy', 'Intervals', 'Backtracking',
  'Tree', 'Heap', 'Graph', 'Dynamic Programming', 'Bit Manipulation', 'Sorting', 'Trie', 'Design',
]);
const noP1: string[] = [];
for (const c of CATALOG) {
  if (!c.name.trim() || !c.id) fail(`category with empty name/id: ${JSON.stringify(c.name)}`);
  if (c.entries.length === 0) fail(`category "${c.name}" has no problems`);
  const meta = TOPIC_META[c.name];
  if (!meta || !meta.icon) fail(`no topic icon (or default) for "${c.name}"`);
  if (!topicTitle(c.name)) fail(`no topic title for "${c.name}"`);
  if (CLASSIC.has(c.name) && !c.entries.some((e) => PRIORITY[e.slug] === 'p1')) noP1.push(c.name);
}
if (noP1.length > 4) fail(`too many classic topics without a P1 problem: ${noP1.join(', ')}`);
const ids = CATALOG.map((c) => c.id);
if (new Set(ids).size !== ids.length) fail('two categories share an anchor id');
const extra = CATALOG.filter((c) => !CLASSIC.has(c.name)).map((c) => `${c.name} (${c.entries.length})`);
if (extra.length) console.log(`extra categories: ${extra.join(', ')}`);

// ---- pattern families ----
const famIds = PATTERN_GROUPS.map((g) => familyId(g.name));
if (new Set(famIds).size !== famIds.length) fail('two pattern families share an anchor id');
for (const g of PATTERN_GROUPS) {
  const m = familyMeta(g.name);
  if (!m.icon || !m.accent) fail(`family "${g.name}" has no icon / accent (and no default)`);
  if (g.cards.length === 0) fail(`family "${g.name}" has no cards`);
}
if (new Set(ALL_PATTERNS.map((p) => p.slug)).size !== ALL_PATTERNS.length) fail('duplicate pattern slugs');
let exampleTotal = 0;
for (const p of ALL_PATTERNS) {
  if (!CONTENT[p.slug]) continue;
  const ex = examplesFor(p.slug);
  exampleTotal += ex.length;
  if (ex.length === 0) fail(`pattern ${p.slug} has content but no examples`);
  for (const e of ex) if (!slugs.has(e.slug)) fail(`pattern ${p.slug}: example "${e.slug}" is not in the catalog`);
}
console.log(`${ALL_PATTERNS.length} patterns in ${PATTERN_GROUPS.length} families, ${exampleTotal} worked examples`);

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('library data OK');
