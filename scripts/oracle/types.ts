import type { Step } from '../../src/engine/types.ts';

/** A plain, comparable snapshot of the algorithm's semantic state (numbers, strings, booleans, null, or flat arrays of those). */
export type Scalar = string | number | boolean | null;
export type State = Record<string, Scalar | Scalar[]>;

/**
 * One independent check of one animated problem.
 *
 * The ORACLE re-implements the algorithm from its definition (never by importing the problem's own step builder or its kit) and
 * records the state after every semantic event. The PROJECTION reads the same observable state out of an animation `Step`
 * (vars, pointers, cell values, aux panels, scene nodes). The runner (`scripts/verify-traces.mts`) then requires that the animation's
 * projected states, with steps that carry no state change collapsed, equal the oracle's states, in order. So every step of every
 * example is checked against an independent simulation, on the declared examples AND on many random inputs.
 */
export interface OracleCase<I = any> {
  /** Problem slug (see `src/problems/manifest.ts`). */
  slug: string;
  /** Random valid input, same shape as `ProblemDef.examples[].input`. `r()` returns a float in [0,1). Keep inputs small (the animation caps sizes). */
  gen: (r: () => number) => I;
  /** Independent simulation: ordered states after each semantic event, INCLUDING the initial state and the final state. */
  oracle: (input: I) => State[];
  /**
   * Observable state of one animation step in the SAME shape as the oracle states (same keys). Return null for a step that
   * carries no observable state (intro text, pure explanation). Compare ONLY what the animation really shows; an oracle may
   * emit more keys than you project — the runner compares just the keys present in the projection.
   */
  project: (step: Step, input: I, index: number, steps: Step[]) => State | null;
  /** Optional extra invariants checked on EVERY step: return a message when violated, else null. */
  invariants?: ((step: Step, index: number, steps: Step[], input: I) => string | null)[];
  /** How many random inputs to run besides the declared examples (default 60). */
  runs?: number;
  /** Free-text note on what this case does NOT verify (shown in the coverage report). */
  notes?: string;
}

export type CaseModule = { cases: OracleCase[] };
