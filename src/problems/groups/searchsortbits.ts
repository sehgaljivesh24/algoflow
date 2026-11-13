import type { AnyProblem } from '../../engine/types.ts';
import { searchInsertPosition } from '../searchInsertPosition.ts';
import { missingNumber } from '../missingNumber.ts';
import { findFirstAndLastPosition } from '../findFirstAndLastPosition.ts';
import { findPeakElement } from '../findPeakElement.ts';
import { findMinimumInRotatedSortedArray } from '../findMinimumInRotatedSortedArray.ts';
import { searchInRotatedSortedArray } from '../searchInRotatedSortedArray.ts';
import { searchInRotatedSortedArrayIi } from '../searchInRotatedSortedArrayIi.ts';
import { kokoEatingBananas } from '../kokoEatingBananas.ts';
import { capacityToShipPackages } from '../capacityToShipPackages.ts';
import { splitArrayLargestSum } from '../splitArrayLargestSum.ts';
import { allocateMinimumPages } from '../allocateMinimumPages.ts';
import { paintersPartitionProblem } from '../paintersPartitionProblem.ts';
import { medianOfTwoSortedArrays } from '../medianOfTwoSortedArrays.ts';
import { insertionSort } from '../insertionSort.ts';
import { quickSort } from '../quickSort.ts';
import { mergeSort } from '../mergeSort.ts';
import { heapSort } from '../heapSort.ts';
import { singleNumber } from '../singleNumber.ts';
import { singleNumberIi } from '../singleNumberIi.ts';
import { singleNumberIii } from '../singleNumberIii.ts';
import { numberOf1Bits } from '../numberOf1Bits.ts';
import { powerOfTwo } from '../powerOfTwo.ts';
import { countingBits } from '../countingBits.ts';
import { sumOfTwoIntegers } from '../sumOfTwoIntegers.ts';
import { findTheDifference } from '../findTheDifference.ts';
import { findTheDuplicateNumber } from '../findTheDuplicateNumber.ts';

// Problems owned by one agent. Import each problem file with an explicit .ts extension and add it below.
export const searchsortbits: AnyProblem[] = [
  searchInsertPosition, missingNumber, findFirstAndLastPosition, findPeakElement, findMinimumInRotatedSortedArray,
  searchInRotatedSortedArray, searchInRotatedSortedArrayIi, kokoEatingBananas, capacityToShipPackages, splitArrayLargestSum,
  allocateMinimumPages, paintersPartitionProblem, medianOfTwoSortedArrays,
  insertionSort, quickSort, mergeSort, heapSort,
  findTheDifference, numberOf1Bits, powerOfTwo, countingBits, sumOfTwoIntegers,
  singleNumberIii, singleNumberIi, findTheDuplicateNumber, singleNumber,
];
