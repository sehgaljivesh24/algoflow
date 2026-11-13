import type { AnyProblem } from '../../engine/types.ts';
import { equalityEquations } from '../equalityEquations.ts';
import { networkConnectedOperations } from '../networkConnectedOperations.ts';
import { primsMstHeap } from '../primsMstHeap.ts';
import { optimizeWaterDistribution } from '../optimizeWaterDistribution.ts';
import { connectingCities } from '../connectingCities.ts';
import { maxSpacingKClustering } from '../maxSpacingKClustering.ts';
import { criticalPseudoCriticalEdges } from '../criticalPseudoCriticalEdges.ts';

// Problem animations for pack p5 (sub-group a: union-find + spanning trees).
export const cp5aProblems: AnyProblem[] = [
  equalityEquations, networkConnectedOperations, primsMstHeap, optimizeWaterDistribution,
  connectingCities, maxSpacingKClustering, criticalPseudoCriticalEdges,
];
