import type { AnyProblem } from '../../engine/types.ts';
import { unionFindProvinces } from '../unionFindProvinces.ts';

// New problem animations owned by pack p11 (the textbook union-find: union by rank + path compression, counting provinces).
export const pack11: AnyProblem[] = [unionFindProvinces];
