import type { AnyProblem } from '../../engine/types.ts';
import { knapsack01 } from '../knapsack01.ts';
import { lastStoneWeightII } from '../lastStoneWeightII.ts';
import { unboundedKnapsack } from '../unboundedKnapsack.ts';
import { coinChangeII } from '../coinChangeII.ts';
import { perfectSquares } from '../perfectSquares.ts';
import { longestPalindromicSubsequence } from '../longestPalindromicSubsequence.ts';
import { palindromePartitioningII } from '../palindromePartitioningII.ts';
import { minInsertionStepsPalindrome } from '../minInsertionStepsPalindrome.ts';
import { memoizedFibonacci } from '../memoizedFibonacci.ts';
import { gridPathsMemo } from '../gridPathsMemo.ts';
import { targetSum } from '../targetSum.ts';
import { stockCooldown } from '../stockCooldown.ts';
import { stockFee } from '../stockFee.ts';
import { stockAtMostK } from '../stockAtMostK.ts';
import { numberOfLongestIncreasingSubsequence } from '../numberOfLongestIncreasingSubsequence.ts';
import { russianDollEnvelopes } from '../russianDollEnvelopes.ts';
import { maximumSumCircularSubarray } from '../maximumSumCircularSubarray.ts';

// New problem animations owned by pack p6 (dp-core). Import each problem file with an explicit .ts extension and add it below.
export const pack6: AnyProblem[] = [
  // 0/1 knapsack
  knapsack01, lastStoneWeightII,
  // unbounded knapsack
  unboundedKnapsack, coinChangeII, perfectSquares,
  // palindromic interval DP
  longestPalindromicSubsequence, palindromePartitioningII, minInsertionStepsPalindrome,
  // memoization
  memoizedFibonacci, gridPathsMemo, targetSum,
  // state machine
  stockCooldown, stockFee, stockAtMostK,
  // existing patterns: LIS and min/max
  numberOfLongestIncreasingSubsequence, russianDollEnvelopes, maximumSumCircularSubarray,
];
