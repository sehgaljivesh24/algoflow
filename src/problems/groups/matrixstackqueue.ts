import type { AnyProblem } from '../../engine/types.ts';
import { spiralMatrix } from '../spiralMatrix.ts';
import { spiralMatrixII } from '../spiralMatrixII.ts';
import { setMatrixZeroes } from '../setMatrixZeroes.ts';
import { wordSearch } from '../wordSearch.ts';
import { searchA2DMatrixII } from '../searchA2DMatrixII.ts';
import { rotateImage } from '../rotateImage.ts';
import { searchA2DMatrix } from '../searchA2DMatrix.ts';
import { validSudoku } from '../validSudoku.ts';
import { evaluateRPN } from '../evaluateRPN.ts';
import { minStack } from '../minStack.ts';
import { nextGreaterElementI } from '../nextGreaterElementI.ts';
import { largestRectangleInHistogram } from '../largestRectangleInHistogram.ts';
import { maximalRectangle } from '../maximalRectangle.ts';
import { basicCalculator } from '../basicCalculator.ts';
import { reverseFirstKQueue } from '../reverseFirstKQueue.ts';
import { slidingWindowMaximum } from '../slidingWindowMaximum.ts';
import { jumpGame } from '../jumpGame.ts';
import { jumpGameII } from '../jumpGameII.ts';
import { candy } from '../candy.ts';
import { gasStation } from '../gasStation.ts';
import { minimumPlatforms } from '../minimumPlatforms.ts';
import { partitionLabels } from '../partitionLabels.ts';

// Problems owned by one agent. Import each problem file with an explicit .ts extension and add it below.
export const matrixstackqueue: AnyProblem[] = [
  spiralMatrix, spiralMatrixII, setMatrixZeroes, wordSearch, searchA2DMatrixII, rotateImage, searchA2DMatrix, validSudoku,
  evaluateRPN, minStack, nextGreaterElementI, largestRectangleInHistogram, maximalRectangle, basicCalculator,
  reverseFirstKQueue, slidingWindowMaximum, jumpGame, jumpGameII, candy, gasStation, minimumPlatforms, partitionLabels,
];
