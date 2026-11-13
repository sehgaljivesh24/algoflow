import type { DetailMap } from './types.ts';
import { d1 } from './d1.ts';
import { d2 } from './d2.ts';
import { d3 } from './d3.ts';
import { d4 } from './d4.ts';
import { d5 } from './d5.ts';
import { d6 } from './d6.ts';
import { d7 } from './d7.ts';

export type { PatternDetail, DetailMap } from './types.ts';

/** All per-pattern overrides, merged last. A slug should appear in exactly one batch file. */
export const DETAIL: DetailMap = { ...d1, ...d2, ...d3, ...d4, ...d5, ...d6, ...d7 };
