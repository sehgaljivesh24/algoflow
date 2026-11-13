import type { AnyProblem } from '../../engine/types.ts';
import { ipo } from '../ipo.ts';
import { slidingWindowMedian } from '../slidingWindowMedian.ts';
import { kthSmallestInSortedMatrix } from '../kthSmallestInSortedMatrix.ts';
import { smallestRange } from '../smallestRange.ts';
import { zeroOneMatrix } from '../zeroOneMatrix.ts';
import { maxAreaOfIsland } from '../maxAreaOfIsland.ts';
import { surroundedRegions } from '../surroundedRegions.ts';
import { diagonalTraverse } from '../diagonalTraverse.ts';
import { carPooling } from '../carPooling.ts';
import { theSkylineProblem } from '../theSkylineProblem.ts';
import { linkedListRandomNode } from '../linkedListRandomNode.ts';
import { randomPickIndex } from '../randomPickIndex.ts';
import { reservoirSampling } from '../reservoirSampling.ts';

// New problem animations owned by pack p4. Import each problem file with an explicit .ts extension and add it below.
export const pack4: AnyProblem[] = [
  ipo, slidingWindowMedian, kthSmallestInSortedMatrix, smallestRange,
  zeroOneMatrix, maxAreaOfIsland, surroundedRegions, diagonalTraverse,
  carPooling, theSkylineProblem,
  linkedListRandomNode, randomPickIndex, reservoirSampling,
];
