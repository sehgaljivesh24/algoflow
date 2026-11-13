import type { PatternPack } from './types.ts';
import { pack as p1 } from './p1.ts';
import { pack as p2 } from './p2.ts';
import { pack as p3 } from './p3.ts';
import { pack as p4 } from './p4.ts';
import { pack as p5 } from './p5.ts';
import { pack as p6 } from './p6.ts';
import { pack as p7 } from './p7.ts';
import { pack as p8 } from './p8.ts';
import { pack as p9 } from './p9.ts';
import { pack as p10 } from './p10.ts';

export type { PatternPack, PatternExample, PackProblem } from './types.ts';

/** All packs, merged into the catalog, the pattern list, the pattern content/meta and the examples. */
export const PACKS: PatternPack[] = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];
