/**
 * Structure check for the edge-case checklist. Run:  node scripts/check-edge.mts
 * (Java correctness of the snippets is verified separately by compiling and running each pair.)
 */
import { EDGE_TOPICS } from '../src/data/edgeCases.ts';

let failures = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (!cond) {
    failures++;
    console.log(`FAIL  ${name} ${extra}`.trim());
  }
};

const EXPECTED_COUNTS = [5, 4, 3, 4, 3, 3, 4, 4, 3, 2, 3, 2, 3, 2, 6];
const nonEmpty = (s: unknown) => typeof s === 'string' && s.trim().length > 0;

ok('topic count', EDGE_TOPICS.length === 15, `got ${EDGE_TOPICS.length}`);
const total = EDGE_TOPICS.reduce((n, t) => n + t.cards.length, 0);
ok('card count >= 48', total >= 48, `got ${total}`);
EDGE_TOPICS.forEach((t, i) => {
  if (EXPECTED_COUNTS[i] !== undefined) ok(`topic ${t.id} card count`, t.cards.length === EXPECTED_COUNTS[i], `got ${t.cards.length}, want ${EXPECTED_COUNTS[i]}`);
});

const topicIds = new Set<string>();
const cardIds = new Set<string>();
const titles = new Set<string>();
for (const t of EDGE_TOPICS) {
  ok(`topic id ${t.id}`, /^[a-z][a-z0-9]*$/.test(t.id));
  ok(`topic id unique ${t.id}`, !topicIds.has(t.id));
  topicIds.add(t.id);
  ok(`topic ${t.id} title`, nonEmpty(t.title));
  ok(`topic ${t.id} blurb`, nonEmpty(t.blurb));
  ok(`topic ${t.id} has cards`, t.cards.length > 0);
  for (const c of t.cards) {
    ok(`card id ${c.id}`, /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(c.id));
    ok(`card id prefix ${c.id}`, c.id.startsWith(`${t.id}-`));
    ok(`card id unique ${c.id}`, !cardIds.has(c.id));
    cardIds.add(c.id);
    for (const f of ['title', 'wrong', 'buggy', 'fixed', 'rule'] as const) ok(`card ${c.id} ${f}`, nonEmpty(c[f]));
    ok(`card ${c.id} title unique`, !titles.has(c.title.toLowerCase()));
    titles.add(c.title.toLowerCase());
    ok(`card ${c.id} buggy != fixed`, c.buggy !== c.fixed);
    ok(`card ${c.id} rule is one line`, !c.rule.includes('\n'));
    ok(`card ${c.id} wrong is 1-3 sentences`, (c.wrong.match(/[.!?](\s|$)/g) ?? []).length <= 4);
    ok(`card ${c.id} snippets are Java-looking`, /[;{}]/.test(c.buggy) && /[;{}]/.test(c.fixed));
    ok(`card ${c.id} no tabs/CRs in code`, !/[\t\r]/.test(c.buggy + c.fixed));
    for (const code of [c.buggy, c.fixed]) {
      const bare = code.replace(/'(?:[^'\\]|\\.)'/g, '').replace(/"(?:[^"\\]|\\.)*"/g, '');
      const opens = (bare.match(/\{/g) ?? []).length;
      const closes = (bare.match(/\}/g) ?? []).length;
      ok(`card ${c.id} braces balanced`, opens === closes);
      ok(`card ${c.id} snippet length`, code.split('\n').length <= 40, `${code.split('\n').length} lines`);
    }
  }
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log(`edge cases OK: ${EDGE_TOPICS.length} topics, ${total} cards`);
