import type { JavaCaseModule } from './types.ts';

/**
 * MODEL CASE — Fixed Sliding Window (LC 643): compiles and runs the Java shown on the code panel.
 * Copy this shape. `main` emits Java statements (inside a try block) that build the arguments from the JS input, call the displayed
 * method through `new Solution()` and print ONE canonical line; `expected` derives the same line from the animation's verified final answer.
 */
type In = { nums: number[]; k: number };

export const cases: JavaCaseModule['cases'] = [
  {
    slug: '643-maximum-average-subarray-i',
    main: ({ nums, k }: In) =>
      `            int[] nums = {${nums.join(', ')}};\n            System.out.println(String.format("%.2f", new Solution().findMaxAverage(nums, ${k})));`,
    // the animation tracks the maximum window SUM: its final `maxSum` var divided by k is the average
    expected: ({ k }: In, steps) => (Number(steps[steps.length - 1].vars.maxSum) / k).toFixed(2),
  },
];
