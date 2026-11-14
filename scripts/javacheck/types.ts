import type { Step } from '../../src/engine/types.ts';

/**
 * One check that the JAVA SHOWN on a problem's code panel (`problem.java`) really compiles and returns the right answer.
 * The runner (`scripts/java-check.mts`) wraps the displayed lines in `class Solution { ... }`, appends a generated `Main` that
 * calls it once per input, compiles everything with javac and compares each printed result with the expected string.
 */
export interface JavaCase<I = any> {
  /** Problem slug. */
  slug: string;
  /**
   * Java STATEMENTS for the inside of one `try { ... }` block in `main`: build the arguments from the JS `input`
   * (emit Java literals), call `new Solution().method(...)`, and `System.out.println(<canonical string of the result>)`.
   * Exactly ONE println per input. Helper constructors for list/tree inputs belong in `extra`.
   */
  main: (input: I) => string;
  /**
   * The canonical string the Java must print for this input. Derive it from the animation's final answer
   * (`steps[steps.length-1]` — its `vars`/`result`) or from an independent reference in TS; the animation's answers are already
   * fuzz-verified against references, so this checks the DISPLAYED CODE against the animation's verified result.
   */
  expected: (input: I, steps: Step[]) => string;
  /** Top-level Java declarations needed by the harness or the snippet (ListNode, TreeNode, Node, helper builders). Default prelude: `import java.util.*;`. */
  extra?: string;
  /** Set when the displayed lines already contain their own `class ...` declarations: they are then NOT wrapped in `class Solution`. */
  noWrap?: boolean;
  /** Number of random inputs besides the declared examples (default 12). Uses the oracle generator of the same slug when available. */
  runs?: number;
  /** Own random generator (otherwise the oracle case's `gen` is reused). */
  gen?: (r: () => number) => I;
  /** What this check does NOT cover / known deviations of the displayed code (shown in the report). */
  notes?: string;
}
export type JavaCaseModule = { cases: JavaCase[] };
