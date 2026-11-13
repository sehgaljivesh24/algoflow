import type { AnyProblem } from '../../engine/types.ts';
import { replaceWords } from './replaceWords.ts';
import { designAddAndSearchWords } from './designAddAndSearchWords.ts';
import { maximumXor } from './maximumXor.ts';
import { weightedUnionFind } from './weightedUnionFind.ts';
import { numberOfIslandsII } from './numberOfIslandsII.ts';
import { unionFindRollback } from './unionFindRollback.ts';

/** Problems of fragment a of pack p9 (tries + advanced union-find). */
export const problems: AnyProblem[] = [replaceWords, designAddAndSearchWords, maximumXor, weightedUnionFind, numberOfIslandsII, unionFindRollback];
