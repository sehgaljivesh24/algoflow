/** Shape and count checks for the Java cheatsheet data. Run: node scripts/check-cheatsheet.mts */
import { CHEATSHEET } from '../src/data/cheatsheet.ts';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (!cond) {
    failed++;
    console.error(`FAIL ${name}${extra ? ' :: ' + extra : ''}`);
  }
};
const filled = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

const TAGS = new Set(['must know', 'very common', 'gotcha']);
ok('16 topics', CHEATSHEET.length === 16, String(CHEATSHEET.length));

const topicIds = new Set<string>();
const cardIds = new Set<string>();
let total = 0;
for (const t of CHEATSHEET) {
  ok(`topic ${t.id}: id/title/blurb`, filled(t.id) && filled(t.title) && filled(t.blurb));
  ok(`topic ${t.id}: unique id`, !topicIds.has(t.id));
  ok(`topic ${t.id}: id is url-safe`, /^[a-z0-9-]+$/.test(t.id));
  topicIds.add(t.id);
  ok(`topic ${t.id}: 2-6 cards`, t.cards.length >= 2 && t.cards.length <= 6, String(t.cards.length));
  for (const c of t.cards) {
    total++;
    ok(`card ${c.id}: id/title/text/code`, filled(c.id) && filled(c.title) && filled(c.text) && filled(c.code));
    ok(`card ${c.id}: unique id`, !cardIds.has(c.id));
    cardIds.add(c.id);
    ok(`card ${c.id}: tag valid`, c.tag === undefined || TAGS.has(c.tag), String(c.tag));
    ok(`card ${c.id}: pitfall not blank`, c.pitfall === undefined || filled(c.pitfall));
    ok(`card ${c.id}: code has no tabs or trailing newline`, !c.code.includes('\t') && !c.code.endsWith('\n'));
    ok(`card ${c.id}: code is multi-line`, c.code.includes('\n'));
  }
}
ok('at least 50 cards', total >= 50, String(total));
ok('every tag used', [...TAGS].every((tag) => CHEATSHEET.some((t) => t.cards.some((c) => c.tag === tag))));

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log(`cheatsheet OK: ${CHEATSHEET.length} topics, ${total} cards`);
