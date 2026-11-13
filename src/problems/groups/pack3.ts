import type { AnyProblem } from '../../engine/types.ts';
import { morrisInorder } from '../morrisInorder.ts';
import { morrisPreorder } from '../morrisPreorder.ts';
import { recoverBst } from '../recoverBst.ts';
import { maxSubarrayDC } from '../maxSubarrayDC.ts';
import { reversePairs } from '../reversePairs.ts';
import { differentWaysToAddParentheses } from '../differentWaysToAddParentheses.ts';
import { palindromePartitioning } from '../palindromePartitioning.ts';
import { permutationsII } from '../permutationsII.ts';
import { lcaOfBst } from '../lcaOfBst.ts';
import { maximumBinaryTree } from '../maximumBinaryTree.ts';
import { bstFromPreorder } from '../bstFromPreorder.ts';

// New problem animations owned by pack p3 (trees + backtracking). The Morris problems share morrisKit.ts, whose frame()
// throws after 400 steps, so a thread-bookkeeping bug can never run away again.
export const pack3: AnyProblem[] = [
  morrisInorder, morrisPreorder, recoverBst,
  maxSubarrayDC, reversePairs, differentWaysToAddParentheses,
  palindromePartitioning, permutationsII,
  lcaOfBst, maximumBinaryTree, bstFromPreorder,
];
