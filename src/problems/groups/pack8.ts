import type { AnyProblem } from '../../engine/types.ts';
import { countPrimes, powXN, euclidGcdLcm } from '../numberTheoryP8.ts';
import { countingSort, radixSort, maximumGap } from '../linearSortP8.ts';
import { strStr, longestHappyPrefix, repeatedSubstringPattern } from '../kmpP8.ts';
import { zPatternSearch, sumOfScores, stringPeriods } from '../zP8.ts';
import { rabinKarp, repeatedDnaSequences, longestDuplicateSubstring } from '../rollingHashP8.ts';
import { manachersAlgorithm, palindromicSubstringsManacher, shortestPalindrome } from '../manacherP8.ts';
import { rankTransform, relativeRanks, maxOverlapWideIntervals } from '../compressionP8.ts';
import { closestSubsequenceSum, minimizeSumDifference, fourSumII } from '../meetMiddleP8.ts';
import { xorQueriesOfASubarray, totalHammingDistance, largestCombinationAndPositive } from '../bitsP8.ts';

// New problem animations owned by pack p8. Import each problem file with an explicit .ts extension and add it below.
export const pack8: AnyProblem[] = [
  // bits
  xorQueriesOfASubarray, totalHammingDistance, largestCombinationAndPositive,
  // math
  countPrimes, powXN, euclidGcdLcm,
  // linear sorts
  countingSort, radixSort, maximumGap,
  // KMP
  strStr, longestHappyPrefix, repeatedSubstringPattern,
  // Z algorithm
  zPatternSearch, sumOfScores, stringPeriods,
  // rolling hash
  rabinKarp, repeatedDnaSequences, longestDuplicateSubstring,
  // Manacher
  manachersAlgorithm, palindromicSubstringsManacher, shortestPalindrome,
  // coordinate compression
  rankTransform, relativeRanks, maxOverlapWideIntervals,
  // meet in the middle
  closestSubsequenceSum, minimizeSumDifference, fourSumII,
];
