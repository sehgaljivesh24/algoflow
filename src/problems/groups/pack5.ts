import type { AnyProblem } from '../../engine/types.ts';
import { pack5b } from './pack5b.ts';
import { pack5c } from './pack5c.ts';
import { pack5d } from './pack5d.ts';
import { cp5aProblems } from './pack5a.ts';

// New problem animations owned by pack p5 (split in sub-groups a-d so that several authors can work in parallel).
export const pack5: AnyProblem[] = [...cp5aProblems, ...pack5b, ...pack5c, ...pack5d];
