import type { AnyProblem } from '../../engine/types.ts';
import { criticalConnections } from '../criticalConnections.ts';
import { articulationPoints } from '../articulationPoints.ts';
import { stronglyConnectedComponents } from '../stronglyConnectedComponents.ts';
import { isGraphBipartite } from '../isGraphBipartite.ts';
import { possibleBipartition } from '../possibleBipartition.ts';
import { findAnOddCycle } from '../findAnOddCycle.ts';

// Problem animations for pack p5 (sub-group d: bridges, cut vertices, SCC, bipartite checks).
export const pack5d: AnyProblem[] = [
  criticalConnections, articulationPoints, stronglyConnectedComponents, isGraphBipartite, possibleBipartition, findAnOddCycle,
];
