import type { AnyProblem } from '../../engine/types.ts';
import { rangeSumQueryMutable } from './rangeSumQueryMutable.ts';
import { rangeMinimumQuerySegTree } from './rangeMinimumQuerySegTree.ts';
import { rangeAddRangeSumLazy } from './rangeAddRangeSumLazy.ts';
import { fenwickTree } from './fenwickTree.ts';
import { countOfSmallerNumbersAfterSelf } from './countOfSmallerNumbersAfterSelf.ts';
import { countInversionsFenwick } from './countInversionsFenwick.ts';

/** Problems of fragment b of pack p9: segment tree + Fenwick tree. */
export const problems: AnyProblem[] = [
  rangeSumQueryMutable,
  rangeMinimumQuerySegTree,
  rangeAddRangeSumLazy,
  fenwickTree,
  countOfSmallerNumbersAfterSelf,
  countInversionsFenwick,
];
