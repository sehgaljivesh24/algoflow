import type { AnyProblem } from '../engine/types.ts';
import { bubbleSort } from './bubbleSort.ts';
import { binarySearch } from './binarySearch.ts';
import { containerWithMostWater } from './containerWithMostWater.ts';
import { twoSum } from './twoSum.ts';
import { validParentheses } from './validParentheses.ts';
import { reverseLinkedList } from './reverseLinkedList.ts';
import { maxDepth } from './maxDepth.ts';
import { numberOfIslands } from './numberOfIslands.ts';
import { climbingStairs } from './climbingStairs.ts';
import { fixedWindow } from './fixedWindow.ts';
import { variableWindow } from './variableWindow.ts';
import { kadane } from './kadane.ts';
import { dailyTemperatures } from './dailyTemperatures.ts';
import { removeDuplicates } from './removeDuplicates.ts';
import { arrays1 } from './groups/arrays1.ts';
import { arrays2strings } from './groups/arrays2strings.ts';
import { matrixstackqueue } from './groups/matrixstackqueue.ts';
import { searchsortbits } from './groups/searchsortbits.ts';
import { listheap } from './groups/listheap.ts';
import { trees } from './groups/trees.ts';
import { backtrackdp } from './groups/backtrackdp.ts';
import { graphs } from './groups/graphs.ts';
import { pack1 } from './groups/pack1.ts';
import { pack2 } from './groups/pack2.ts';
import { pack3 } from './groups/pack3.ts';
import { pack4 } from './groups/pack4.ts';
import { pack5 } from './groups/pack5.ts';
import { pack6 } from './groups/pack6.ts';
import { pack7 } from './groups/pack7.ts';
import { pack8 } from './groups/pack8.ts';
import { pack9 } from './groups/pack9.ts';
import { pack10 } from './groups/pack10.ts';
import { pack11 } from './groups/pack11.ts';

/**
 * Every animated problem.
 *
 * To add one: create a ProblemDef file, then list it in YOUR group file under ./groups
 * (not here — keeping one group file per author avoids merge clashes).
 * The slug must match the catalog's "<id>-<slugified title>".
 */
const CORE: AnyProblem[] = [
  bubbleSort, binarySearch, containerWithMostWater, twoSum, validParentheses,
  reverseLinkedList, maxDepth, numberOfIslands, climbingStairs,
  fixedWindow, variableWindow, kadane, dailyTemperatures, removeDuplicates,
];

export const ALL_PROBLEMS: AnyProblem[] = [
  ...CORE, ...arrays1, ...arrays2strings, ...matrixstackqueue, ...searchsortbits,
  ...listheap, ...trees, ...backtrackdp, ...graphs,
  // new animations for the pattern packs (src/data/packs)
  ...pack1, ...pack2, ...pack3, ...pack4, ...pack5, ...pack6, ...pack7, ...pack8, ...pack9, ...pack10, ...pack11,
];

export const PROBLEMS = new Map<string, AnyProblem>(ALL_PROBLEMS.map((p) => [p.slug, p]));
