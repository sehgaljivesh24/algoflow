/**
 * Validates the quiz bank. Run:  node scripts/check-quiz.mts
 */
import { QUIZ_QUESTIONS, QUIZ_LENGTH } from '../src/data/quiz.ts';
import { ALL_PATTERNS, PATTERN_GROUPS } from '../src/data/patternsFull.ts';

let failures = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (!cond) {
    failures++;
    console.log(`FAIL  ${name} ${extra}`.trim());
  }
};

const slugs = new Set(ALL_PATTERNS.map((p) => p.slug));
const ids = new Set<string>();
const texts = new Set<string>();
const perPattern = new Map<string, number>();
const diffs = { Easy: 0, Medium: 0, Hard: 0 } as Record<string, number>;
const answerPos = [0, 0, 0, 0];

ok(`at least 2 questions per pattern (${QUIZ_QUESTIONS.length} total for ${ALL_PATTERNS.length} patterns)`, QUIZ_QUESTIONS.length >= 2 * ALL_PATTERNS.length);
ok('bank is larger than one run', QUIZ_QUESTIONS.length > QUIZ_LENGTH);

for (const q of QUIZ_QUESTIONS) {
  const w = q.id;
  ok(`${w}: unique id`, !ids.has(q.id));
  ids.add(q.id);
  const key = q.question.trim().toLowerCase();
  ok(`${w}: unique question text`, !texts.has(key));
  texts.add(key);
  ok(`${w}: pattern slug exists (${q.pattern})`, slugs.has(q.pattern));
  ok(`${w}: difficulty valid`, q.difficulty in diffs);
  ok(`${w}: question text is a real scenario`, q.question.trim().length >= 40);
  ok(`${w}: exactly 4 options`, Array.isArray(q.options) && q.options.length === 4);
  ok(`${w}: options non-empty`, q.options.every((o) => typeof o === 'string' && o.trim().length > 0));
  ok(`${w}: options distinct`, new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4);
  ok(`${w}: answer index valid`, Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3);
  ok(`${w}: hint present`, q.hint.trim().length >= 10);
  ok(`${w}: explanation present and substantial`, q.explanation.trim().length >= 80);
  perPattern.set(q.pattern, (perPattern.get(q.pattern) ?? 0) + 1);
  diffs[q.difficulty]++;
  if (q.answer >= 0 && q.answer <= 3) answerPos[q.answer]++;
}

for (const g of PATTERN_GROUPS) {
  const n = g.cards.reduce((s, c) => s + (perPattern.get(c.slug) ?? 0), 0);
  ok(`family "${g.name}" has >= 2 questions (got ${n})`, n >= 2);
}
const uncovered = ALL_PATTERNS.filter((p) => !perPattern.get(p.slug)).map((p) => p.slug);
ok(`every pattern has a question (missing: ${uncovered.join(', ')})`, uncovered.length === 0);
const thin = ALL_PATTERNS.filter((p) => (perPattern.get(p.slug) ?? 0) === 1).map((p) => p.slug);
ok(`every pattern has >= 2 questions (only 1: ${thin.join(', ')})`, thin.length === 0 && uncovered.length === 0);
ok('correct answer is not always in the same slot', answerPos.every((c) => c < QUIZ_QUESTIONS.length * 0.5));

console.log(`questions: ${QUIZ_QUESTIONS.length} · patterns covered: ${perPattern.size}/${ALL_PATTERNS.length} · families: ${PATTERN_GROUPS.length}`);
console.log(`difficulty: ${JSON.stringify(diffs)} · answer slots: ${answerPos.join('/')}`);
if (failures) {
  console.log(`${failures} failure(s)`);
  process.exit(1);
}
console.log('quiz data OK');
