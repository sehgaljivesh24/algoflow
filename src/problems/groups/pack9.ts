import type { AnyProblem } from '../../engine/types.ts';
import { problems as a } from '../p9/fraga.ts';
import { problems as b } from '../p9/fragb.ts';
import { problems as c } from '../p9/fragc.ts';
import { problems as d } from '../p9/fragd.ts';
import { problems as e } from '../p9/frage.ts';
import { problems as f } from '../p9/fragf.ts';

// New problem animations owned by pack p9, collected from the fragments src/problems/p9/frag{a..f}.ts.
export const pack9: AnyProblem[] = [...a, ...b, ...c, ...d, ...e, ...f];
