import type { Step } from '../engine/types.ts';

/** Pattern-page fields a problem can add to a step after its snapshot was built (narration prefix, code-line values, banner). */
export type StepExtras = Partial<Pick<Step, 'tag' | 'note' | 'alert' | 'desc' | 'logicTone' | 'algoStep'>>;

/**
 * Returns copies of `steps` with whatever `f` returns merged in. Lets a problem keep its existing step builder and add the
 * pattern-page extras (`tag`, `note`, `alert`) in one small function that looks at the step's title, vars and aux panels.
 * `f` gets the step, its index and the whole list (read-only).
 */
export function annotate(steps: Step[], f: (s: Step, i: number, all: readonly Step[]) => StepExtras | undefined | void): Step[] {
  return steps.map((s, i) => {
    const extra = f(s, i, steps);
    return extra ? { ...s, ...extra } : s;
  });
}

/** Last item of an aux panel by title prefix (e.g. the top of the stack), or undefined. */
export function auxItems(s: Step, titlePrefix: string): string[] {
  return s.aux?.find((a) => a.title.startsWith(titlePrefix))?.items ?? [];
}

type Val<T> = T | ((m: RegExpExecArray, s: Step, i: number, all: readonly Step[]) => T);

/**
 * One rule of `annotateRules`: matches a step by its title (a RegExp), or the 'first' / 'last' step, and sets the extras.
 * Every field may be a plain value or a function of (regex match, step, index, all steps).
 */
export interface TitleRule {
  on: RegExp | 'first' | 'last';
  tag: Val<string>;
  note: Val<string>;
  desc?: Val<string>;
  alert?: Val<string | undefined>;
  algoStep?: Val<number>;
  logicTone?: Step['logicTone'];
}

/** Applies the first matching rule to each step (steps no rule matches are returned unchanged). */
export function annotateRules(steps: Step[], rules: TitleRule[]): Step[] {
  return annotate(steps, (s, i, all) => {
    for (const r of rules) {
      let m: RegExpExecArray | null;
      if (r.on === 'first') m = i === 0 ? (/^/.exec('') as RegExpExecArray) : null;
      else if (r.on === 'last') m = i === all.length - 1 ? (/^/.exec('') as RegExpExecArray) : null;
      else m = r.on.exec(s.title);
      if (!m) continue;
      const v = <T,>(x: Val<T> | undefined): T | undefined => (typeof x === 'function' ? (x as (m: RegExpExecArray, s: Step, i: number, all: readonly Step[]) => T)(m!, s, i, all) : x);
      const out: StepExtras = { tag: v(r.tag), note: v(r.note) };
      const d = v(r.desc);
      if (d !== undefined) out.desc = d;
      const a = v(r.alert);
      if (a !== undefined) out.alert = a;
      const g = v(r.algoStep);
      if (g !== undefined) out.algoStep = g;
      if (r.logicTone) out.logicTone = r.logicTone;
      return out;
    }
  });
}
