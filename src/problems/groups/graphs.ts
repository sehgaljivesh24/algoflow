import type { AnyProblem } from '../../engine/types.ts';
import { redundantConnection } from '../redundantConnection.ts';
import { courseScheduleII } from '../courseScheduleII.ts';
import { networkDelayTime } from '../networkDelayTime.ts';
import { cheapestFlights } from '../cheapestFlights.ts';
import { minCostConnectPoints } from '../minCostConnectPoints.ts';
import { rottingOranges } from '../rottingOranges.ts';
import { mergeIntervals } from '../mergeIntervals.ts';
import { insertInterval } from '../insertInterval.ts';
import { meetingRoomsII } from '../meetingRoomsII.ts';
import { nonOverlappingIntervals } from '../nonOverlappingIntervals.ts';
import { minimumArrows } from '../minimumArrows.ts';
import { implementTrie } from '../implementTrie.ts';
import { wordSearchII } from '../wordSearchII.ts';
import { validPath } from '../validPath.ts';
import { cloneGraph } from '../cloneGraph.ts';
import { courseSchedule } from '../courseSchedule.ts';
import { isGraphATree } from '../isGraphATree.ts';
import { pacificAtlantic } from '../pacificAtlantic.ts';
import { evaluateDivision } from '../evaluateDivision.ts';
import { wordLadder } from '../wordLadder.ts';

// Problems owned by one agent. Import each problem file with an explicit .ts extension and add it below.
export const graphs: AnyProblem[] = [
  redundantConnection, courseScheduleII, networkDelayTime, cheapestFlights, minCostConnectPoints, rottingOranges,
  mergeIntervals, insertInterval, meetingRoomsII, nonOverlappingIntervals, minimumArrows,
  implementTrie, wordSearchII,
  validPath, cloneGraph, courseSchedule, isGraphATree,
  pacificAtlantic, evaluateDivision, wordLadder,
];
