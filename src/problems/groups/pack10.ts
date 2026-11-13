import type { AnyProblem } from '../../engine/types.ts';
import { preorderTraversalRecursive } from '../preorderTraversalRecursive.ts';
import { inorderTraversalRecursive } from '../inorderTraversalRecursive.ts';
import { binaryTreePostorderTraversal } from '../binaryTreePostorderTraversal.ts';
import { searchInBst } from '../searchInBst.ts';
import { insertIntoBst } from '../insertIntoBst.ts';

// New problem animations owned by pack p10 (DFS traversal orders and the BST search / insert operations).
export const pack10: AnyProblem[] = [preorderTraversalRecursive, inorderTraversalRecursive, binaryTreePostorderTraversal, searchInBst, insertIntoBst];
