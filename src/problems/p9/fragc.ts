import type { AnyProblem } from '../../engine/types.ts';
import { sqrtDecompositionRangeSum } from './sqrtDecompositionRangeSum.ts';
import { rangeAddRangeSumBlocks } from './rangeAddRangeSumBlocks.ts';
import { rangeFrequencyQueries } from './rangeFrequencyQueries.ts';
import { persistentSegmentTreeVersionArray } from './persistentSegmentTreeVersionArray.ts';
import { kthSmallestInRangePersistent } from './kthSmallestInRangePersistent.ts';
import { snapshotArray } from './snapshotArray.ts';

/** Problems of fragment c of pack p9: sqrt decomposition + persistent structures. */
export const problems: AnyProblem[] = [sqrtDecompositionRangeSum, rangeAddRangeSumBlocks, rangeFrequencyQueries, persistentSegmentTreeVersionArray, kthSmallestInRangePersistent, snapshotArray];
