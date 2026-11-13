import type { AnyProblem } from '../../engine/types.ts';
import { nextGreaterElementII } from '../nextGreaterElementII.ts';
import { removeKDigits } from '../removeKDigits.ts';
import { singleElementInSortedArray } from '../singleElementInSortedArray.ts';
import { findKClosestElements } from '../findKClosestElements.ts';
import { lfuCache } from '../lfuCache.ts';
import { allOneDataStructure } from '../allOneDataStructure.ts';

// New problem animations owned by pack p2. Import each problem file with an explicit .ts extension and add it below.
export const pack2: AnyProblem[] = [
  nextGreaterElementII,
  removeKDigits,
  singleElementInSortedArray,
  findKClosestElements,
  lfuCache,
  allOneDataStructure,
];
