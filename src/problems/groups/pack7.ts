import type { AnyProblem } from '../../engine/types.ts';
import { uniqueBinarySearchTrees } from '../uniqueBinarySearchTrees.ts';
import { countValidParenthesesSequences } from '../countValidParenthesesSequences.ts';
import { triangulateConvexPolygon } from '../triangulateConvexPolygon.ts';
import { predictTheWinner } from '../predictTheWinner.ts';
import { canIWin } from '../canIWin.ts';
import { stoneGameIII } from '../stoneGameIII.ts';
import { shortestPathVisitingAllNodes } from '../shortestPathVisitingAllNodes.ts';
import { partitionToKEqualSumSubsets } from '../partitionToKEqualSumSubsets.ts';
import { travellingSalesmanBitmask } from '../travellingSalesmanBitmask.ts';
import { burstBalloons } from '../burstBalloons.ts';
import { matrixChainMultiplication } from '../matrixChainMultiplication.ts';
import { strangePrinter } from '../strangePrinter.ts';
import { houseRobberIII } from '../houseRobberIII.ts';
import { binaryTreeCameras } from '../binaryTreeCameras.ts';
import { numbersAtMostNGivenDigitSet } from '../numbersAtMostNGivenDigitSet.ts';
import { countSpecialIntegers } from '../countSpecialIntegers.ts';
import { countNumbersWithDigitSum } from '../countNumbersWithDigitSum.ts';

// New problem animations owned by pack p7 (advanced DP).
export const pack7: AnyProblem[] = [
  uniqueBinarySearchTrees, countValidParenthesesSequences, triangulateConvexPolygon,
  predictTheWinner, canIWin, stoneGameIII,
  shortestPathVisitingAllNodes, partitionToKEqualSumSubsets, travellingSalesmanBitmask,
  burstBalloons, matrixChainMultiplication, strangePrinter,
  houseRobberIII, binaryTreeCameras,
  numbersAtMostNGivenDigitSet, countSpecialIntegers, countNumbersWithDigitSum,
];
