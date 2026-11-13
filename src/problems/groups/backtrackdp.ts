import type { AnyProblem } from '../../engine/types.ts';
import { subsets } from '../subsets.ts';
import { subsetsII } from '../subsetsII.ts';
import { permutations } from '../permutations.ts';
import { combinations } from '../combinations.ts';
import { combinationSum } from '../combinationSum.ts';
import { letterCombinations } from '../letterCombinations.ts';
import { generateParentheses } from '../generateParentheses.ts';
import { nQueens } from '../nQueens.ts';
import { sudokuSolver } from '../sudokuSolver.ts';
import { fibonacciNumber } from '../fibonacciNumber.ts';
import { minCostClimbingStairs } from '../minCostClimbingStairs.ts';
import { uniquePaths } from '../uniquePaths.ts';
import { uniquePathsII } from '../uniquePathsII.ts';
import { triangle } from '../triangle.ts';
import { houseRobber } from '../houseRobber.ts';
import { houseRobberII } from '../houseRobberII.ts';
import { maxProductSubarray } from '../maxProductSubarray.ts';
import { longestIncreasingSubsequence } from '../longestIncreasingSubsequence.ts';
import { decodeWays } from '../decodeWays.ts';
import { coinChange } from '../coinChange.ts';
import { longestCommonSubsequence } from '../longestCommonSubsequence.ts';
import { editDistance } from '../editDistance.ts';
import { longestCommonSubstring } from '../longestCommonSubstring.ts';
import { wordBreak } from '../wordBreak.ts';
import { partitionEqualSubsetSum } from '../partitionEqualSubsetSum.ts';

// Problems owned by one agent. Import each problem file with an explicit .ts extension and add it below.
export const backtrackdp: AnyProblem[] = [
  // Backtracking
  subsets, subsetsII, permutations, combinations, combinationSum,
  letterCombinations, generateParentheses, nQueens, sudokuSolver,
  // Dynamic programming
  fibonacciNumber, minCostClimbingStairs, uniquePaths, uniquePathsII, triangle,
  houseRobber, houseRobberII, maxProductSubarray, longestIncreasingSubsequence,
  decodeWays, coinChange, longestCommonSubsequence, editDistance,
  longestCommonSubstring, wordBreak, partitionEqualSubsetSum,
];
