/**
 * Text and state helpers shared by the pattern-page animation (PatternAnimation.tsx) and the full problem page
 * (ProblemPage.tsx): how an example input reads, which phase chip is lit, the narration prefix, the alert banner
 * text and the executed code line with its live values.
 */
import type { AnyProblem, Phase, Step } from '../../engine/types';

export type NarrTone = 'blue' | 'cyan' | 'green' | 'orange' | 'gold' | 'accent';

/** One value of an example input in a readable form: strings quoted (letters spaced out for a caption), arrays with ", ". */
function fmtVal(v: unknown, spaced: boolean): string {
  if (typeof v === 'string') return spaced && /^\S{1,20}$/.test(v) ? `"${[...v].join(' ')}"` : `"${v}"`;
  if (Array.isArray(v)) return `[${v.map((x) => fmtVal(x, false)).join(', ')}]`;
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${fmtVal(x, false)}`).join(', ')}}`;
  return String(v);
}

/** `nums = [2, 1, 5], k = 3` from an example's input object (null when it would be unreadably long). */
export function formatInput(input: unknown, spaced = false): string | null {
  let text: string;
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const entries = Object.entries(input as Record<string, unknown>);
    if (entries.length === 0) return null;
    // arrays of objects (operation lists) read badly as JSON-like text: let the caller fall back to the example label
    if (entries.some(([, v]) => Array.isArray(v) && v.some((x) => x !== null && typeof x === 'object'))) return null;
    text = entries.map(([k, v]) => `${k} = ${fmtVal(v, spaced)}`).join(spaced ? '   ' : ', ');
  } else {
    text = `input = ${fmtVal(input, spaced)}`;
  }
  return text.length > 220 ? null : text;
}

/** Left-border colour of the narration bar: green done, orange problem / warning, gold new best, otherwise the phase colour. */
export function narrationTone(step: Step, phases: Phase[] | undefined, final: boolean, cur: number): NarrTone {
  if (final) return 'green';
  if (step.logicTone === 'warn') return 'orange';
  if (step.logicTone === 'success') return 'gold';
  if (phases) {
    if (cur === 0) return 'accent';
    const t = phases[step.algoStep]?.tone;
    return t === 'gold' ? 'green' : t ?? 'accent'; // a gold phase only turns the bar gold on a real record (logicTone success)
  }
  return step.algoStep === 0 ? 'blue' : 'accent';
}

const endsWithMark = (s: string) => /[^\p{L}\p{N}\s]$/u.test(s);

/** Narration prefix: `EXPAND` -> `EXPAND:`; a tag that already ends in a symbol (`BUILDING —`, `✅ Done!`) stays as written. */
export function tagText(step: Step): string {
  return step.tag ? (endsWithMark(step.tag) ? step.tag : `${step.tag}:`) : '';
}

/** Banner text of a step: a leading ⚠ is added unless the text already starts with a symbol or emoji. */
export function alertText(step: Step): string {
  return step.alert ? (/^\p{Extended_Pictographic}/u.test(step.alert) ? step.alert : `⚠ ${step.alert}`) : '';
}

export interface Chip {
  icon: string;
  label: string;
  tone: NarrTone;
  /** Set on derived chips of the problem page: `icon` is the step number, drawn as a small badge. */
  num?: boolean;
}

/** Algorithm text without inline markup (`**bold**`, backticks) and cut to a chip-sized label. */
function plainShort(text: string, max: number): string {
  const t = text.replace(/\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\s][^*]*)\*/g, (_m, a, b, c) => a ?? b ?? c).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * Phase chips: `phases` when the problem has them (index = algoStep), otherwise one chip per algorithm step plus Done.
 * `compact` is the full problem page's version of the fallback: a numbered badge and a short label instead of "Phase n: …".
 * `active` is the lit chip (-1 = none; with `phases` nothing is lit on the first step).
 */
export function phaseChips(problem: AnyProblem, step: Step, cur: number, final: boolean, compact = false): { chips: Chip[]; active: number } {
  if (problem.phases) {
    return { chips: problem.phases, active: cur === 0 ? -1 : step.algoStep };
  }
  const chips: Chip[] = [
    ...problem.algorithm.map((a: string, i: number): Chip =>
      compact
        ? { icon: String(i + 1), label: plainShort(a, 44), tone: i === 0 ? 'blue' : 'accent', num: true }
        : { icon: '', label: `Phase ${i + 1}: ${a}`, tone: i === 0 ? 'blue' : 'accent' },
    ),
    { icon: '✅', label: 'Done', tone: 'green' },
  ];
  return { chips, active: final ? chips.length - 1 : step.algoStep };
}

/**
 * The line being executed with the live values after a comment: an authored `note`, otherwise the variables that changed
 * on this step (up to 3). `lang` picks the Java or Python line of the step; '' when the step highlights no line.
 */
export function execLine(problem: AnyProblem, step: Step, before: Step, cur: number, lang: 'java' | 'python' = 'java'): string {
  const lines: string[] = lang === 'java' ? problem.java : problem.python;
  const active = lang === 'java' ? step.javaLines : step.pyLines;
  const raw = lines[active[0]]?.trim();
  if (!raw) return '';
  const autoNote =
    step.note || cur === 0
      ? ''
      : problem.varLabels
          .filter((k: string) => step.vars[k] !== undefined && String(step.vars[k]) !== String(before.vars[k]))
          .slice(0, 3)
          .map((k: string) => `${k}=${step.vars[k]}`)
          .join(', ');
  const noteText = step.note ?? autoNote;
  const mark = lang === 'java' ? '//' : '#';
  // an authored note replaces a static trailing comment of the code line (its values are more useful than "// choose")
  const bare = step.note ? raw.replace(lang === 'java' ? /\s*\/\/.*$/ : /\s+#.*$/, '') : raw;
  return noteText && !bare.includes(mark) ? `${bare} ${mark} ${noteText}` : bare;
}
