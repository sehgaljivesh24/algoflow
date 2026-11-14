import type { IntervalBarVM, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { recorder } from './stepKit.ts';
import { intIn, semis } from './p4Kit.ts';

interface In { trips: [number, number, number][]; capacity: number }

const FORMAT = 'passengers-from-to trips ; capacity — e.g. 2-1-5 3-3-7 ; 4';

function parse(raw: string): In {
  const p = semis(raw, 2, FORMAT);
  const toks = p[0].split(/[\s,]+/).filter(Boolean);
  if (!toks.length || toks.length > 6) throw new Error('Give 1 to 6 trips written passengers-from-to, e.g. 2-1-5 3-3-7');
  const trips = toks.map((t): [number, number, number] => {
    const m = /^(\d+)-(\d+)-(\d+)$/.exec(t);
    if (!m) throw new Error(`"${t}" is not a trip. Write passengers-from-to, e.g. 2-1-5`);
    const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (a < 1 || a > 9) throw new Error('Passengers per trip must be between 1 and 9');
    if (b >= c || c > 20) throw new Error(`"${t}": the drop-off must be after the pick-up and at most 20`);
    return [a, b, c];
  });
  return { trips, capacity: intIn(p[1], 1, 20, 'capacity') };
}

interface Ev { pos: number; change: number; trip: number }

function build({ trips, capacity }: In): Step[] {
  const events: Ev[] = [];
  trips.forEach(([p, f, t], i) => { events.push({ pos: f, change: p, trip: i }); events.push({ pos: t, change: -p, trip: i }); });
  const sorted = [...events].sort((a, b) => a.pos - b.pos || a.change - b.change || a.trip - b.trip);
  const axis = { min: Math.min(...trips.map((t) => t[1])), max: Math.max(...trips.map((t) => t[2])) };
  const onboard = new Set<number>();
  const dropped = new Set<number>();
  let load = 0;
  let at = -1; // index of the current event
  let phase = 0; // 0 = raw list, 1 = sorted
  let answer = '—';
  const steps: Step[] = [];

  const evText = (e: Ev) => `${e.pos}: ${e.change > 0 ? '+' : '−'}${Math.abs(e.change)}`;
  const say = recorder(steps, () => ({
    scene: {
      kind: 'intervals' as const, axis,
      bars: trips.map(([p, f, t], i): IntervalBarVM => ({
        id: i, start: f, end: t, label: `${p} ppl`,
        state: onboard.has(i) ? (load > capacity ? 'error' : 'active') : dropped.has(i) ? 'dim' : undefined,
      })),
      marker: at >= 0 ? { at: sorted[at].pos, label: `x = ${sorted[at].pos}` } : undefined,
    },
    aux: [
      { title: 'seats', kind: 'map' as const, items: [`on board → ${load}`, `capacity → ${capacity}`], bad: load > capacity ? [0] : undefined },
      { title: phase ? 'events sorted by position (drop-offs first on ties)' : 'events (pick-up +, drop-off −)', kind: 'list' as const, items: (phase ? sorted : events).map(evText), highlight: phase && at >= 0 ? at : undefined },
    ],
    vars: { position: at >= 0 ? sorted[at].pos : '—', load, capacity, answer },
  }));

  say({
    tag: 'INIT', title: 'Start', desc: `${trips.length} trip${trips.length === 1 ? '' : 's'} along one road; the car holds ${capacity} passengers. Each trip is (passengers, pick-up, drop-off).`,
    note: `capacity = ${capacity}, trips = ${trips.length}`,
    logic: 'The car is overloaded at some point exactly when the number of passengers on board exceeds the capacity at some position — only the pick-up and drop-off points can change that.', java: [0], py: [0], algo: 0,
  });
  say({
    tag: 'EVENTS', title: 'Turn trips into events', desc: `Every trip gives two events: +passengers at its pick-up and −passengers at its drop-off, ${plural(events.length, 'event')} for ${plural(trips.length, 'trip')}.`,
    note: `events = ${events.map(evText).join(', ')}`,
    logic: 'A sweep line only needs to stop where something changes.', java: [2, 3, 4], py: [2, 3, 4], algo: 1,
  });
  phase = 1;
  say({
    tag: 'SORT', title: 'Sort the events', desc: `Order by position: ${sorted.map(evText).join('  ·  ')}. At equal positions the drop-off (negative change) comes first.`,
    note: `sorted by position, then change`,
    logic: 'A passenger leaving at x makes room for one arriving at x, so a drop-off at x must be processed before a pick-up at x.', java: [6], py: [5], algo: 1,
  });

  let ok = true;
  for (let i = 0; i < sorted.length; i++) {
    at = i;
    const e = sorted[i];
    const before = load;
    load += e.change;
    if (e.change > 0) onboard.add(e.trip); else { onboard.delete(e.trip); dropped.add(e.trip); }
    if (load > capacity) {
      ok = false;
      answer = 'false';
      say({
        tag: 'OVERLOAD', title: `Overload at ${e.pos}: ${load} > ${capacity}`, desc: `${plural(e.change, 'passenger')} ${e.change === 1 ? 'boards' : 'board'} at ${e.pos}: ${before} → ${load}, more than the ${plural(capacity, 'seat')}.`,
        note: `load = ${before} + ${e.change} = ${load} > ${capacity} → return false`, alert: `Over capacity at position ${e.pos}: ${plural(load, 'passenger')} but only ${plural(capacity, 'seat')}!`,
        logic: 'The first moment the load exceeds the capacity proves the plan is impossible, so we can stop.', tone: 'warn', java: [10], py: [9, 10], algo: 3,
      });
      break;
    }
    say({
      tag: e.change > 0 ? 'PICK UP' : 'DROP OFF', title: `Position ${e.pos}: ${e.change > 0 ? 'pick up' : 'drop off'} ${Math.abs(e.change)}`, desc: `At position ${e.pos} ${Math.abs(e.change)} passenger${Math.abs(e.change) === 1 ? '' : 's'} ${e.change > 0 ? 'board' : 'leave'}: load ${before} ${e.change > 0 ? '+' : '−'} ${Math.abs(e.change)} = ${load} ≤ ${capacity}.`,
      note: `load = ${before} ${e.change > 0 ? '+' : '−'} ${Math.abs(e.change)} = ${load} ≤ ${capacity}`,
      logic: 'Between two consecutive events the load stays constant, so checking it at each event covers the whole road.', tone: e.change > 0 ? 'info' : 'success', java: [9, 10], py: [8, 9], algo: 2,
    });
  }
  if (ok) answer = 'true';
  at = -1;
  say({
    tag: ok ? '✅ Done!' : '🚫 Rejected', title: 'Done', desc: ok ? `The load never exceeded ${capacity} over ${sorted.length} events, so every trip can be served.` : `The car would be over capacity, so the trips cannot all be served.`,
    note: `return ${answer}`,
    logic: 'Sorting dominates: O(n log n) for 2n events.', tone: ok ? 'success' : 'warn', java: [ok ? 12 : 10], py: [ok ? 11 : 10], algo: 3,
    result: { title: answer, text: ok ? 'All trips fit within the capacity' : 'Capacity is exceeded' },
  });
  return steps;
}

const T = (s: string): [number, number, number][] => s.split(' ').map((t) => t.split('-').map(Number) as [number, number, number]);

export const carPooling: ProblemDef<In> = {
  slug: '1094-car-pooling',
  id: '1094', title: 'Car Pooling', difficulty: 'Medium', category: 'Intervals', tag: 'line sweep',
  emphasis: ['fixed number of seats', 'never carrying more people than there are seats'],
  statement: 'A car drives in one direction with a fixed number of seats. Each trip is (passengers, from, to): that many people board at "from" and leave at "to". Return true if every trip can be served without ever carrying more people than there are seats.',
  constraints: '1 ≤ trips ≤ 1000, 1 ≤ passengers ≤ 100, 0 ≤ from < to ≤ 1000 (animation input: ≤ 6 trips, positions ≤ 20; write passengers-from-to)',
  examples: [
    { label: '2-1-5 3-3-7 ; capacity 4', input: { trips: T('2-1-5 3-3-7'), capacity: 4 }, output: 'false' },
    { label: '2-1-5 3-3-7 ; capacity 5', input: { trips: T('2-1-5 3-3-7'), capacity: 5 }, output: 'true' },
    { label: '3-2-4 4-4-6 2-3-8 ; capacity 5', input: { trips: T('3-2-4 4-4-6 2-3-8'), capacity: 5 }, output: 'false' },
  ],
  inputPlaceholder: FORMAT,
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '📥', label: 'Init', tone: 'blue' },
    { icon: '📅', label: 'Events + sort', tone: 'blue' },
    { icon: '🧹', label: 'Sweep: update load', tone: 'cyan' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Trip on board', state: 'active' }, { label: 'Trip finished', state: 'dim' }, { label: 'Overloaded', state: 'error' }],
  varLabels: ['position', 'load', 'capacity', 'answer'],
  approach: {
    title: 'Sweep over pick-up and drop-off events',
    text: 'Turn every trip into two events: +passengers at its start and −passengers at its end. Sort the events by position, with drop-offs before pick-ups at the same position. Walk through them keeping a running load; if it ever goes above the capacity, the answer is false. If the sweep finishes, the answer is true.',
  },
  java: [
    'public boolean carPooling(int[][] trips, int capacity) {',
    '    List<int[]> events = new ArrayList<>();                    // {position, change}',
    '    for (int[] t : trips) {',
    '        events.add(new int[]{t[1], t[0]});                     // pick up',
    '        events.add(new int[]{t[2], -t[0]});                    // drop off',
    '    }',
    '    events.sort((a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);   // drop-offs first on ties',
    '    int load = 0;',
    '    for (int[] e : events) {',
    '        load += e[1];',
    '        if (load > capacity) return false;',
    '    }',
    '    return true;',
    '}',
  ],
  python: [
    'def car_pooling(trips, capacity):',
    '    events = []                                  # (position, change)',
    '    for people, start, end in trips:',
    '        events.append((start, people))           # pick up',
    '        events.append((end, -people))            # drop off',
    '    events.sort()                                # at equal positions the negative change comes first',
    '    load = 0',
    '    for _, change in events:',
    '        load += change',
    '        if load > capacity:',
    '            return False',
    '    return True',
  ],
  algorithm: [
    'Read the trips and the seat capacity',
    'Create a +passengers event at each pick-up and a −passengers event at each drop-off; sort by position (drop-offs first on ties)',
    'Sweep the events, adding each change to a running load',
    'Return false the moment the load exceeds the capacity, otherwise true',
  ],
  complexity: [{ label: 'Time', value: 'O(n log n)' }, { label: 'Space', value: 'O(n)' }],
  why: 'The number of passengers on board only changes at event positions and is constant in between, so the maximum load over the whole road is the maximum of the running sum taken after each event. Putting drop-offs before pick-ups at the same position models that a passenger leaving at x and one boarding at x never share a seat.',
};
