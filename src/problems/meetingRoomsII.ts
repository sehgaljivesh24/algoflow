import type { Aux, IntervalBarVM, ProblemDef, Step } from '../engine/types';
import { TONES, parseIntervals } from './graphKit.ts';

interface In { iv: [number, number][] }

const parse = (raw: string): In => ({ iv: parseIntervals(raw, { max: 8, example: '0-30 5-10 15-20' }) });
const fmt = (a: number, b: number) => `[${a}, ${b}]`;

/** Greedy room assignment (earliest-free room first). Returns the room of every meeting, in input order. */
function assign(iv: [number, number][]): number[] {
  const order = iv.map((_, i) => i).sort((a, b) => iv[a][0] - iv[b][0] || iv[a][1] - iv[b][1] || a - b);
  const rooms: { end: number; room: number }[] = [];
  const out = new Array<number>(iv.length).fill(0);
  let count = 0;
  for (const i of order) {
    rooms.sort((a, b) => a.end - b.end || a.room - b.room);
    if (rooms.length && rooms[0].end <= iv[i][0]) {
      rooms[0].end = iv[i][1];
      out[i] = rooms[0].room;
    } else {
      rooms.push({ end: iv[i][1], room: count });
      out[i] = count++;
    }
  }
  return out;
}

function build({ iv }: In): Step[] {
  const n = iv.length;
  const order = iv.map((_, i) => i).sort((a, b) => iv[a][0] - iv[b][0] || iv[a][1] - iv[b][1] || a - b);
  const finalRoom = assign(iv);
  const total = Math.max(...finalRoom) + 1;
  const axis = { min: Math.min(...iv.map((p) => p[0])), max: Math.max(...iv.map((p) => p[1])) };
  const steps: Step[] = [];
  const done = new Array<boolean>(n).fill(false);
  const rooms: { end: number; room: number }[] = []; // min-heap of room end times
  let cur = -1;
  let result = '—';

  const sortHeap = () => rooms.sort((a, b) => a.end - b.end || a.room - b.room);
  const scene = () => {
    const bars: IntervalBarVM[] = iv.map(([s, e], i) => ({
      id: i, start: s, end: e, row: finalRoom[i],
      state: i === cur ? 'active' : undefined,
      tone: done[i] && i !== cur ? TONES[finalRoom[i] % TONES.length] : undefined,
    }));
    return {
      kind: 'intervals' as const, bars, axis,
      rowLabels: Array.from({ length: total }, (_, r) => `room ${r + 1}`),
      marker: cur >= 0 ? { at: iv[cur][0], label: `start = ${iv[cur][0]}` } : undefined,
    };
  };
  const aux = (): Aux[] => {
    sortHeap();
    return [
      { title: 'min-heap of room end times', kind: 'queue', items: rooms.map((r) => `${r.end} (room ${r.room + 1})`) },
      { title: 'sorted by start', kind: 'list', items: order.map((i) => fmt(iv[i][0], iv[i][1])), highlight: cur >= 0 ? order.indexOf(cur) : undefined },
    ];
  };
  const vars = () => ({ meeting: cur >= 0 ? fmt(iv[cur][0], iv[cur][1]) : '—', 'earliest end': rooms.length ? Math.min(...rooms.map((r) => r.end)) : '—', 'rooms used': rooms.length, answer: result });
  const push = (s: Omit<Step, 'vars' | 'aux' | 'scene'>) => steps.push({ ...s, scene: scene(), aux: aux(), vars: vars() });

  push({
    tag: 'INIT', title: 'Start', desc: `${n} meeting${n === 1 ? '' : 's'}: ${iv.map(([x, y]) => fmt(x, y)).join(', ')}. Fewest rooms so no overlapping meetings share one (end 10, start 10 is fine).`,
    note: `intervals.length = ${n}`,
    logic: 'The answer is the largest number of meetings happening at the same moment.', logicTone: 'info',
    javaLines: [0], pyLines: [0], algoStep: 0,
  });
  push({
    tag: 'SORT', title: 'Sort by start time', desc: `Sort by start time: ${order.map((i) => fmt(iv[i][0], iv[i][1])).join(', ')}. The heap of room end times starts empty.`,
    note: `sorted starts → ${order.map((i) => iv[i][0]).join(', ')}; ends = []`,
    logic: 'A min-heap of end times always tells us which room frees up first.', logicTone: 'info',
    javaLines: [1, 2], pyLines: [1, 2], algoStep: 0,
  });

  for (const i of order) {
    cur = i;
    sortHeap();
    const [s, e] = iv[i];
    const free = rooms.length > 0 && rooms[0].end <= s;
    push({
      tag: 'PEEK', title: `Meeting ${fmt(s, e)} arrives`,
      desc: rooms.length === 0 ? `Meeting ${fmt(s, e)} starts at ${s} and the heap is empty: no room exists yet.` : `Meeting ${fmt(s, e)} starts at ${s}. The room freeing first ends at ${rooms[0].end}. Is ${rooms[0].end} ≤ ${s}? ${free ? 'Yes, it is free.' : 'No, every room is busy.'}`,
      note: rooms.length ? `ends.peek()=${rooms[0].end} <= m[0]=${s} → ${free}` : `ends is empty → no free room`,
      logic: 'If even the earliest-ending room is still busy, every room is busy; otherwise we can reuse it.', logicTone: 'info',
      javaLines: [4], pyLines: [4], algoStep: 1,
    });
    if (free) {
      const r = rooms[0];
      const old = r.end;
      r.end = e;
      done[i] = true;
      push({
        tag: 'REUSE', title: `${fmt(s, e)}: reuse room ${r.room + 1}`, desc: `Room ${r.room + 1} was free since ${old} ≤ ${s}. Pop ${old}, push ${e}: the room now frees at ${e}. Rooms in use stay at ${rooms.length}.`,
        note: `poll ${old}, add ${e} → heap size ${rooms.length}`,
        logic: 'Reusing a room replaces its end time; the number of rooms does not grow.', logicTone: 'success',
        javaLines: [5], pyLines: [5, 6], algoStep: 2,
      });
    } else {
      const soonest = rooms.length ? Math.min(...rooms.map((r) => r.end)) : null;
      rooms.push({ end: e, room: rooms.length });
      done[i] = true;
      push({
        tag: 'NEW ROOM', title: `${fmt(s, e)}: open room ${rooms.length}`, desc: rooms.length === 1 ? `No rooms exist yet, so open room 1 (frees at ${e}).` : `Earliest room frees at ${soonest} > ${s}, so open room ${rooms.length} (frees at ${e}).`,
        note: `ends.add(${e}) → heap size ${rooms.length}`,
        ...(rooms.length > 1 ? { alert: `Clash: all ${rooms.length - 1} room${rooms.length > 2 ? 's are' : ' is'} busy at time ${s}, a new room is needed.` } : {}),
        logic: 'The number of rooms only grows when a meeting overlaps every room in use.', logicTone: 'warn',
        javaLines: [7], pyLines: [6], algoStep: 3,
      });
    }
  }
  cur = -1;
  result = String(rooms.length);
  push({
    tag: '✅ Done!', title: 'Done', desc: `The heap holds ${rooms.length} end time${rooms.length === 1 ? '' : 's'}, so ${rooms.length} room${rooms.length === 1 ? ' is' : 's are'} enough.`,
    note: `return ends.size() → ${rooms.length}`,
    logic: 'The heap size is the number of rooms ever needed at once.', logicTone: 'success',
    javaLines: [9], pyLines: [7], algoStep: 4,
    result: { title: result, text: 'Minimum meeting rooms' },
  });
  return steps;
}

const P = (s: string): In => ({ iv: s.split(' ').map((t) => t.split('-').map(Number) as [number, number]) });

export const meetingRoomsII: ProblemDef<In> = {
  slug: '253-meeting-rooms-ii',
  id: '253', title: 'Meeting Rooms II', difficulty: 'Medium', category: 'Intervals', tag: 'min-heap / sweep',
  emphasis: ['minimum number of conference rooms', 'overlapping'],
  statement: 'Given meeting time intervals [start, end), return the minimum number of conference rooms needed so that no two overlapping meetings use the same room.',
  constraints: '1 ≤ intervals ≤ 10⁴ (animation input: ≤ 8 meetings with times ≤ 30, written like 0-30 5-10 15-20)',
  examples: [
    { label: '0-30 5-10 15-20', input: P('0-30 5-10 15-20'), output: '2' },
    { label: '7-10 2-4', input: P('7-10 2-4'), output: '1' },
    { label: '1-5 2-6 3-7 4-8 10-12', input: P('1-5 2-6 3-7 4-8 10-12'), output: '4' },
  ],
  inputPlaceholder: 'e.g. 0-30 5-10 15-20   (start-end pairs)',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '📅', label: 'Sort by start', tone: 'blue' },
    { icon: '👀', label: 'Peek earliest end', tone: 'cyan' },
    { icon: '♻️', label: 'Reuse room', tone: 'green' },
    { icon: '🚪', label: 'Open new room', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Meeting being placed', state: 'active' }],
  varLabels: ['meeting', 'earliest end', 'rooms used', 'answer'],
  approach: {
    title: 'Sort by start, track room end times in a min-heap',
    text: 'Process meetings by start time. The heap holds the end time of each room in use. If the smallest end time is at or before the new start, that room is free: reuse it by replacing its end time. Otherwise open a new room. The heap size at the end is the answer.',
  },
  java: [
    'public int minMeetingRooms(int[][] intervals) {',
    '    Arrays.sort(intervals, (a, b) -> a[0] - b[0]);',
    '    PriorityQueue<Integer> ends = new PriorityQueue<>();',
    '    for (int[] m : intervals) {',
    '        if (!ends.isEmpty() && ends.peek() <= m[0]) {',
    '            ends.poll();                 // reuse the room that frees first',
    '        }',
    '        ends.add(m[1]);',
    '    }',
    '    return ends.size();',
    '}',
  ],
  python: [
    'def min_meeting_rooms(intervals):',
    '    intervals.sort()',
    '    ends = []',
    '    for s, e in intervals:',
    '        if ends and ends[0] <= s:',
    '            heapq.heappop(ends)          # reuse the room that frees first',
    '        heapq.heappush(ends, e)',
    '    return len(ends)',
  ],
  algorithm: [
    'Sort the meetings by start time; the heap of room end times is empty',
    'For each meeting, peek at the smallest end time in the heap',
    'If that end ≤ this start, the room is free: pop it and reuse the room',
    'Otherwise every room is busy: a new room is needed',
    'Push this meeting’s end time; the heap size is the answer',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'At any moment the heap holds exactly the end times of the meetings still running when the current meeting starts (after reusing at most one). Its size therefore equals the number of simultaneous meetings, and the maximum size reached is the least number of rooms any schedule needs. Taking the earliest-ending room is always safe because any other free room would work equally well.',
};
