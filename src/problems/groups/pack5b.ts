import type { AnyProblem } from '../../engine/types.ts';
import { numberOfProvinces } from '../numberOfProvinces.ts';
import { alienDictionary } from '../alienDictionary.ts';
import { minimumHeightTrees } from '../minimumHeightTrees.ts';
import { pathWithMaximumProbability } from '../pathWithMaximumProbability.ts';
import { pathWithMinimumEffort } from '../pathWithMinimumEffort.ts';
import { bellmanFordNegativeEdges } from '../bellmanFordNegativeEdges.ts';
import { negativeCycleArbitrage } from '../negativeCycleArbitrage.ts';

// Problem animations for pack p5 (sub-group b): DFS components, topo sort variants, shortest-path variants.
export const pack5b: AnyProblem[] = [
  numberOfProvinces, alienDictionary, minimumHeightTrees,
  pathWithMaximumProbability, pathWithMinimumEffort,
  bellmanFordNegativeEdges, negativeCycleArbitrage,
];
