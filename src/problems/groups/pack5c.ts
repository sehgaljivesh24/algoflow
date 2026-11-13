import type { AnyProblem } from '../../engine/types.ts';
import { floydWarshallAllPairs } from '../floydWarshallAllPairs.ts';
import { findTheCityThreshold } from '../findTheCityThreshold.ts';
import { transitiveClosureWarshall } from '../transitiveClosureWarshall.ts';
import { maxFlowEdmondsKarp } from '../maxFlowEdmondsKarp.ts';
import { maximumBipartiteMatchingFlow } from '../maximumBipartiteMatchingFlow.ts';
import { minimumCutFromMaxFlow } from '../minimumCutFromMaxFlow.ts';

// Problem animations for pack p5 (sub-group c): all-pairs shortest paths + max flow.
export const pack5c: AnyProblem[] = [
  floydWarshallAllPairs, findTheCityThreshold, transitiveClosureWarshall,
  maxFlowEdmondsKarp, maximumBipartiteMatchingFlow, minimumCutFromMaxFlow,
];
