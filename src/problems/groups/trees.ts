import type { AnyProblem } from '../../engine/types.ts';
import { levelOrderTraversal } from '../levelOrderTraversal.ts';
import { averageOfLevels } from '../averageOfLevels.ts';
import { zigzagLevelOrder } from '../zigzagLevelOrder.ts';
import { rightSideView } from '../rightSideView.ts';
import { symmetricTree } from '../symmetricTree.ts';
import { diameterOfBinaryTree } from '../diameterOfBinaryTree.ts';
import { invertBinaryTree } from '../invertBinaryTree.ts';
import { balancedBinaryTree } from '../balancedBinaryTree.ts';
import { sortedArrayToBst } from '../sortedArrayToBst.ts';
import { flattenBinaryTree } from '../flattenBinaryTree.ts';
import { validateBst } from '../validateBst.ts';
import { lowestCommonAncestor } from '../lowestCommonAncestor.ts';
import { kthSmallestInBst } from '../kthSmallestInBst.ts';
import { inorderTraversal } from '../inorderTraversal.ts';
import { constructTreePreIn } from '../constructTreePreIn.ts';
import { serializeDeserializeTree } from '../serializeDeserializeTree.ts';
import { pathSum } from '../pathSum.ts';
import { pathSumII } from '../pathSumII.ts';
import { sumRootToLeafNumbers } from '../sumRootToLeafNumbers.ts';
import { binaryTreeMaxPathSum } from '../binaryTreeMaxPathSum.ts';

// Problems owned by one agent. Import each problem file with an explicit .ts extension and add it below.
export const trees: AnyProblem[] = [
  levelOrderTraversal,
  averageOfLevels,
  zigzagLevelOrder,
  rightSideView,
  symmetricTree,
  diameterOfBinaryTree,
  invertBinaryTree,
  balancedBinaryTree,
  sortedArrayToBst,
  flattenBinaryTree,
  validateBst,
  lowestCommonAncestor,
  kthSmallestInBst,
  inorderTraversal,
  constructTreePreIn,
  serializeDeserializeTree,
  pathSum,
  pathSumII,
  sumRootToLeafNumbers,
  binaryTreeMaxPathSum,
];
