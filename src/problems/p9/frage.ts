import type { AnyProblem } from '../../engine/types.ts';
import { kthAncestorOfTreeNode } from './kthAncestorOfTreeNode.ts';
import { lcaViaBinaryLifting } from './lcaViaBinaryLifting.ts';
import { distanceBetweenNodesInTree } from './distanceBetweenNodesInTree.ts';
import { hldChains } from './hldChains.ts';
import { hldPathMax } from './hldPathMax.ts';
import { hldLca } from './hldLca.ts';

/** Problems of fragment e of pack p9 (binary lifting / LCA, heavy-light decomposition). */
export const problems: AnyProblem[] = [kthAncestorOfTreeNode, lcaViaBinaryLifting, distanceBetweenNodesInTree, hldChains, hldPathMax, hldLca];
