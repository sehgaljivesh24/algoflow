import type { Cell, LogicTone, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';

interface In { gas: number[]; cost: number[] }

function parse(raw: string): In {
  const parts = raw.split('|');
  if (parts.length !== 2) throw new Error('Format: gas | cost, e.g. 1 2 3 4 5 | 3 4 5 1 2');
  const toNums = (s: string) => s.split(/[\s,]+/).filter(Boolean).map(Number);
  const gas = toNums(parts[0]);
  const cost = toNums(parts[1]);
  if (!gas.length || [...gas, ...cost].some((n) => !Number.isInteger(n) || n < 0 || n > 99)) throw new Error('Use whole numbers from 0 to 99 on both sides of the "|"');
  if (gas.length !== cost.length) throw new Error('gas and cost must have the same length');
  if (gas.length > 10) throw new Error('Use 10 stations or fewer');
  return { gas, cost };
}

function build({ gas, cost }: In): Step[] {
  const n = gas.length;
  const net = gas.map((g, i) => g - cost[i]);
  let total = 0;
  let tank = 0;
  let start = 0;
  const steps: Step[] = [];

  const scene = (cur: number, bad = false) => {
    const cell = (v: number, i: number, kind: string): Cell => {
      let state: Cell['state'];
      if (i === cur) state = bad ? 'error' : 'active';
      else if (i < start) state = 'dim';
      return { key: `${kind}${i}`, value: v, state, tone: i === start && i !== cur ? 'green' : undefined };
    };
    return {
      kind: 'grid' as const,
      rows: [gas.map((v, i) => cell(v, i, 'g')), cost.map((v, i) => cell(v, i, 'c')), net.map((v, i) => cell(v, i, 'n'))],
      rowHeads: ['gas', 'cost', 'gas − cost'], colHeads: gas.map((_, i) => `st ${i}`),
    };
  };
  const vars = (i: number | string) => ({ i, 'current tank': tank, 'total net': total, 'candidate start': start });
  const add = (title: string, tag: string, desc: string, note: string, logic: string, tone: LogicTone, cur: number, bad: boolean, j: number[], p: number[], a: number, extra: { result?: Step['result']; alert?: string } = {}) =>
    steps.push({
      title, tag, desc, note, scene: scene(cur, bad), vars: vars(cur >= 0 ? cur : '—'), logic, logicTone: tone, javaLines: j, pyLines: p, algoStep: a, ...extra,
      aux: [{ title: 'trip so far', kind: 'map', items: [`candidate start → ${start}`, `tank since start → ${tank}`, `total net of all stations → ${total}`], bad: tank < 0 ? [1] : undefined }],
    });

  add('Start', 'INIT', `${plural(n, 'station')} on a circle: gain gas[i], pay cost[i] to reach the next. Which start completes a lap? Total supply ${gas.reduce((x, y) => x + y, 0)}, total cost ${cost.reduce((x, y) => x + y, 0)}.`,
    'total = 0, tank = 0, start = 0',
    'Look at the net gain gas − cost of each station. Total net < 0 means no start works; otherwise a start exists and we can find it in one pass.', 'info', -1, false, [1], [1], 0);

  for (let i = 0; i < n; i++) {
    total += net[i];
    tank += net[i];
    if (tank < 0) {
      add(`Station ${i}: tank would be ${tank}`, 'DRY', `net = ${gas[i]} − ${cost[i]} = ${net[i]}. Starting from station ${start}, the tank drops to ${tank} and runs dry before station ${i + 1}.`,
        `tank += ${net[i]} → ${tank} < 0`,
        `No station between ${start} and ${i} can be a start either: each would have arrived at the failure point with even less fuel. Skip them all.`, 'warn', i, true, [6], [6], 1,
        { alert: `Tank = ${tank} at station ${i}: start ${start} fails, and so does every station from ${start} to ${i}.` });
      start = i + 1;
      tank = 0;
      add(`New candidate start: station ${i + 1 < n ? i + 1 : 'none left'}`, 'RESET', `Reset the tank to 0 and try starting right after the failure (candidate = ${start}${start >= n ? ', past the last station' : ''}).`,
        `start = ${i}+1 = ${start}; tank = 0`,
        'The failed stretch cost more than it gave, so starting later is the only hope.', 'info', i, false, [7, 8], [7, 8], 2);
    } else {
      add(`Station ${i}: tank = ${tank}`, 'DRIVE', `net = ${gas[i]} − ${cost[i]} = ${net[i]}. The tank is ${tank} ≥ 0, so start ${start} still works so far; total net = ${total}.`,
        `tank += ${net[i]} → ${tank}; total → ${total}`,
        'Keep going while the running tank is non-negative.', 'success', i, false, [5], [5], 1);
    }
  }

  const ans = total >= 0 ? start : -1;
  add('Done', ans === -1 ? '🚫 No start.' : '✅ Found!', total >= 0 ? `Total net = ${total} ≥ 0, so a full lap is possible starting at station ${ans}.` : `Total net = ${total} < 0: there is not enough gas in total, so no start works.`,
    `total = ${total} → return ${ans}`,
    total >= 0 ? 'Enough gas overall, and the last failure point proves the candidate start works for the remaining stretch.' : 'The circuit costs more than it supplies.', total >= 0 ? 'success' : 'warn', -1, false, [11], [9], 3,
    { result: { title: String(ans), text: ans === -1 ? 'No valid starting station' : `Start at station ${ans}` }, ...(ans === -1 ? { alert: `Total net ${total} < 0: the whole circle costs more than it supplies.` } : {}) });
  return steps;
}

export const gasStation: ProblemDef<In> = {
  slug: '134-gas-station',
  id: '134', title: 'Gas Station', difficulty: 'Medium', category: 'Greedy', tag: 'greedy circular',
  emphasis: ['circular route', 'full lap', 'unique'],
  statement: 'There are n gas stations on a circular route. Station i gives gas[i] units and driving to the next station costs cost[i]. Starting with an empty tank, return the index of the station from which you can complete one full lap clockwise, or −1 if impossible. If a solution exists it is unique.',
  constraints: '1 ≤ n ≤ 10⁵, 0 ≤ gas[i], cost[i] ≤ 10⁴ (animation input: at most 10 stations, values 0-99)',
  examples: [
    { label: '1 2 3 4 5 | 3 4 5 1 2', input: { gas: [1, 2, 3, 4, 5], cost: [3, 4, 5, 1, 2] }, output: '3' },
    { label: '2 3 4 | 3 4 3', input: { gas: [2, 3, 4], cost: [3, 4, 3] }, output: '-1' },
    { label: '5 1 2 3 4 | 4 4 1 5 1', input: { gas: [5, 1, 2, 3, 4], cost: [4, 4, 1, 5, 1] }, output: '4' },
  ],
  inputPlaceholder: 'gas | cost, e.g. 1 2 3 4 5 | 3 4 5 1 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  phases: [
    { icon: '⛽', label: 'Init', tone: 'blue' },
    { icon: '🚗', label: 'Drive / add net', tone: 'cyan' },
    { icon: '🔄', label: 'Tank dry: new start', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  legend: [{ label: 'Station being processed', state: 'active' }, { label: 'Tank ran dry here', state: 'error' }, { label: 'Ruled out as a start', state: 'dim' }],
  varLabels: ['i', 'current tank', 'total net', 'candidate start'],
  approach: {
    title: 'One pass with a candidate start',
    text: 'Track the running tank from a candidate start. If it ever goes negative at station i, no station from the candidate up to i can be a start, so move the candidate to i + 1 and reset the tank. Also sum all nets: if the total is negative the answer is −1, otherwise the final candidate works.',
  },
  java: [
    'public int canCompleteCircuit(int[] gas, int[] cost) {',
    '    int total = 0, tank = 0, start = 0;',
    '    for (int i = 0; i < gas.length; i++) {',
    '        int net = gas[i] - cost[i];',
    '        total += net;',
    '        tank += net;',
    '        if (tank < 0) {',
    '            start = i + 1;',
    '            tank = 0;',
    '        }',
    '    }',
    '    return total >= 0 ? start : -1;',
    '}',
  ],
  python: [
    'def can_complete_circuit(gas, cost):',
    '    total = tank = start = 0',
    '    for i in range(len(gas)):',
    '        net = gas[i] - cost[i]',
    '        total += net',
    '        tank += net',
    '        if tank < 0:',
    '            start = i + 1',
    '            tank = 0',
    '    return start if total >= 0 else -1',
  ],
  algorithm: [
    'Compute net = gas[i] − cost[i]; keep total, tank and a candidate start',
    'Add each net to both total and tank',
    'If tank < 0, the candidate fails: set start = i + 1 and reset tank to 0',
    'Return start if total ≥ 0, otherwise −1',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(1)' }],
  why: 'If a trip from s first runs dry at station i, then every station between s and i also fails, because each would reach i carrying no more fuel than the trip from s did (the trip from s had a non-negative tank at each of those stations). So the next candidate is i + 1. If the total net is non-negative, the last candidate covers the stretch to the end with fuel to spare, and the earlier stretches all had a combined deficit that the surplus after the candidate repays around the circle.',
};
