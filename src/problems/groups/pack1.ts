import type { AnyProblem } from '../../engine/types.ts';
import { longestSubarrayAbsDiffLimit } from '../longestSubarrayAbsDiffLimit.ts';
import { jumpGameVI } from '../jumpGameVI.ts';
import { shortestSubarraySumAtLeastK } from '../shortestSubarraySumAtLeastK.ts';
import { majorityElementII } from '../majorityElementII.ts';
import { majorityWithVerification } from '../majorityWithVerification.ts';
import { cyclicSort } from '../cyclicSort.ts';
import { findAllDuplicates } from '../findAllDuplicates.ts';
import { threeSumClosest } from '../threeSumClosest.ts';
import { validTriangleNumber } from '../validTriangleNumber.ts';

// New problem animations owned by pack p1 (windows, pointers, hashing, array techniques).
export const pack1: AnyProblem[] = [
  longestSubarrayAbsDiffLimit,
  jumpGameVI,
  shortestSubarraySumAtLeastK,
  majorityElementII,
  majorityWithVerification,
  cyclicSort,
  findAllDuplicates,
  threeSumClosest,
  validTriangleNumber,
];
