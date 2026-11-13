import type { AnyProblem } from '../../engine/types.ts';
import { erectTheFence } from './erectTheFence.ts';
import { grahamScan } from './grahamScan.ts';
import { jarvisMarch } from './jarvisMarch.ts';
import { rotatingCalipers } from './rotatingCalipers.ts';

/** Problems of fragment f of pack p9: convex hull / computational geometry. */
export const problems: AnyProblem[] = [erectTheFence, grahamScan, jarvisMarch, rotatingCalipers];
