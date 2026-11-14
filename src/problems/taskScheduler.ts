import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { emitter, parseOne, parts } from './listheapKit.ts';

interface In { tasks: string[]; n: number }

function parse(raw: string): In {
  const [a, b] = parts(raw, 2, 'tasks ; n — e.g. A A A B B B ; 2 (letters A–Z, n = cooldown)');
  const tasks = a.split(/[\s,]+/).filter(Boolean).map((t) => t.toUpperCase());
  if (tasks.length < 1 || tasks.some((t) => !/^[A-Z]$/.test(t))) throw new Error('Tasks are single letters A–Z, e.g. A A A B B B');
  if (tasks.length > 12) throw new Error('Use 12 tasks or fewer');
  return { tasks, n: parseOne(b, 0, 4, 'n (cooldown)') };
}

interface Cool { letter: string; rem: number; at: number }

function build({ tasks, n }: In): Step[] {
  const cnt = new Map<string, number>();
  for (const t of tasks) cnt.set(t, (cnt.get(t) ?? 0) + 1);
  const maxF = Math.max(...cnt.values());
  const countMax = [...cnt.values()].filter((c) => c === maxF).length;
  let ready: [string, number][] = [...cnt].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1));
  let cool: Cool[] = [];
  const line: string[] = [];
  let t = 0;
  let idle = 0;
  const steps: Step[] = [];
  const emit = emitter(steps, () => {
    const cells: Cell[] = line.length
      ? line.map((l, i) => ({ key: i, value: l, state: l === '·' ? 'dim' as const : i === line.length - 1 ? 'active' as const : 'found' as const }))
      : tasks.map((l, i) => ({ key: i, value: l }));
    return {
      cells,
      pointers: line.length ? [{ id: 't', label: `t=${line.length}`, index: line.length - 1, tone: 'blue' as const }] : [],
      aux: [
        { title: 'ready (most remaining first)', kind: 'list' as const, items: ready.map(([l, r]) => `${l}×${r}`) },
        { title: 'cooling down', kind: 'queue' as const, items: cool.map((c) => `${c.letter}×${c.rem} @t${c.at}`) },
      ],
      vars: { time: t, 'idle slots': idle, 'most frequent': `${maxF}×` },
    };
  });

  emit('Start', `${tasks.length} tasks, cooldown n = ${n}: two runs of the same letter need at least ${n} other slot${n === 1 ? '' : 's'} between them. Each time unit runs one task or idles.`,
    'Greedy rule: always run the ready task with the most copies left — the most frequent letter is the bottleneck.', 'info', [0, 6], [0, 4], 0, undefined,
    { tag: 'START —', note: `n = ${n}, time = 0` });
  emit('Count the tasks', `tally the letters: ${ready.map(([l, r]) => `${l}×${r}`).join(', ')}; the most frequent task appears ${maxF} times and ${countMax} task${countMax === 1 ? ' ties' : 's tie'} for it.`,
    'The most frequent letter is the bottleneck, so it will be scheduled first whenever it is ready.', 'info', [1, 2, 3, 4], [1, 2, 3], 0, undefined,
    { tag: 'COUNT:', note: `maxFreq = ${maxF}, countMax = ${countMax}` });

  while (ready.length || cool.length) {
    t++;
    const released = cool.filter((c) => c.at <= t);
    cool = cool.filter((c) => c.at > t);
    for (const c of released) ready.push([c.letter, c.rem]);
    ready.sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1));
    const relText = released.length ? `${released.map((c) => c.letter).join(', ')} finished cooling and is ready again. ` : '';
    if (!ready.length) {
      idle++;
      line.push('·');
      emit(`t = ${t}: idle`, `${relText}nothing is ready (${cool.map((c) => c.letter).join(', ')} still cooling until t = ${Math.min(...cool.map((c) => c.at))}), so the CPU idles for this unit.`,
        'Idle slots appear only when too few different tasks can fill the cooldown gap.', 'warn', [7, 13], [5, 11, 12], 2, undefined,
        { tag: 'IDLE:', note: `t = ${t}: ready list empty, idle = ${idle}`, alert: `Idle slot at t = ${t}: every remaining task is cooling down.` });
      continue;
    }
    const [letter, rem] = ready.shift() as [string, number];
    line.push(letter);
    if (rem - 1 > 0) cool.push({ letter, rem: rem - 1, at: t + n + 1 });
    emit(`t = ${t}: run ${letter}`, `${relText}run ${letter} (${rem} left, the most among ready tasks). ${rem - 1 > 0 ? `${rem - 1} copies remain, so it cools for ${n} unit${n === 1 ? '' : 's'} and is ready again at t = ${t + n + 1}.` : `${letter} is finished.`}`,
      'The task with the most copies left is the hardest to place later, so it goes first.', 'success', [7, 8, 9, 10, 11, 13], [5, 6, 7, 8, 9, 10, 11, 12], 1, undefined,
      { tag: 'RUN:', note: rem - 1 > 0 ? `${letter}×${rem} → ${letter}×${rem - 1}, back at t = ${t + n + 1}` : `${letter}×${rem} → done` });
  }

  const formula = (maxF - 1) * (n + 1) + countMax;
  emit('Cross-check with the formula', `(maxFreq − 1) × (n + 1) + countMax = (${maxF} − 1) × ${n + 1} + ${countMax} = ${formula}, and max(${formula}, ${tasks.length} tasks) = ${Math.max(formula, tasks.length)}, which equals the ${t} units simulated.`,
    `Frame view: (maxFreq − 1) full frames of n + 1 slots plus a last row holding the ${countMax} most frequent letter${countMax === 1 ? '' : 's'}.`, 'info', [14], [5], 3, undefined,
    { tag: 'CHECK:', note: `max(${formula}, ${tasks.length}) = ${Math.max(formula, tasks.length)}` });
  emit('Done', `all ${tasks.length} tasks are scheduled in ${t} time units, with ${idle} idle slot${idle === 1 ? '' : 's'}.`,
    `${idle} idle slot${idle === 1 ? '' : 's'}: ${tasks.length} task units plus ${idle} idle units make ${t}.`, 'success', [15], [13], 4,
    { title: String(t), text: `${tasks.length} tasks + ${idle} idle slot${idle === 1 ? '' : 's'}` },
    { tag: '✅ Done!', note: `return ${t}` });
  return steps;
}

export const taskScheduler: ProblemDef<In> = {
  slug: '621-task-scheduler',
  id: '621', title: 'Task Scheduler', difficulty: 'Medium', category: 'Heap', tag: 'greedy formula',
  statement: 'Tasks are labelled A–Z and each takes one time unit. Between two runs of the same task there must be at least n units where the CPU runs other tasks or idles. Return the least number of units needed to finish all tasks.',
  constraints: '1 ≤ tasks.length ≤ 10⁴, 0 ≤ n ≤ 100 (animation input: up to 12 tasks, n ≤ 4)',
  examples: [
    { label: 'A A A B B B, n = 2', input: { tasks: ['A', 'A', 'A', 'B', 'B', 'B'], n: 2 }, output: '8' },
    { label: 'A A A B B B, n = 0', input: { tasks: ['A', 'A', 'A', 'B', 'B', 'B'], n: 0 }, output: '6' },
    { label: 'A A A A B C, n = 2', input: { tasks: ['A', 'A', 'A', 'A', 'B', 'C'], n: 2 }, output: '10' },
  ],
  inputPlaceholder: 'tasks ; n — e.g. A A A B B B ; 2',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Task just run', state: 'active' }, { label: 'Task run earlier', state: 'found' }, { label: 'Idle slot', state: 'dim' }],
  varLabels: ['time', 'idle slots', 'most frequent'],
  approach: {
    title: 'Run the most frequent ready task',
    text: 'Each unit, pick the ready task with the most copies left, then park it in a cooldown queue for n units. If nothing is ready, idle. The total time also equals max(#tasks, (maxFreq − 1)(n + 1) + countMax), which the animation confirms at the end.',
  },
  java: [
    'public int leastInterval(char[] tasks, int n) {',
    '    int[] cnt = new int[26];',
    '    for (char c : tasks) cnt[c - \'A\']++;',
    '    PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());',
    '    for (int c : cnt) if (c > 0) pq.offer(c);',
    '    Queue<int[]> cool = new ArrayDeque<>();',
    '    int time = 0;',
    '    while (!pq.isEmpty() || !cool.isEmpty()) {',
    '        time++;',
    '        if (!pq.isEmpty()) {',
    '            int left = pq.poll() - 1;',
    '            if (left > 0) cool.offer(new int[]{left, time + n});',
    '        }',
    '        if (!cool.isEmpty() && cool.peek()[1] == time) pq.offer(cool.poll()[0]);',
    '    }',
    '    return time;',
    '}',
  ],
  python: [
    'def least_interval(tasks, n):',
    '    heap = [-c for c in Counter(tasks).values()]',
    '    heapq.heapify(heap)',
    '    cool = deque()',
    '    time = 0',
    '    while heap or cool:',
    '        time += 1',
    '        if heap:',
    '            left = 1 + heapq.heappop(heap)',
    '            if left < 0:',
    '                cool.append((left, time + n))',
    '        if cool and cool[0][1] == time:',
    '            heapq.heappush(heap, cool.popleft()[0])',
    '    return time',
  ],
  phases: [
    { icon: '📊', label: 'Count tasks', tone: 'blue' },
    { icon: '▶️', label: 'Run most frequent ready task', tone: 'green' },
    { icon: '💤', label: 'Idle (all cooling)', tone: 'orange' },
    { icon: '🧮', label: 'Cross-check formula', tone: 'gold' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  emphasis: ['least number of units', 'at least n units'],
  algorithm: [
    'Count each task and keep the counts in a max-heap (the ready list)',
    'Each time unit: pop the largest count, run that task, and move it to a cooldown queue; when it cools, push it back',
    'If the ready list is empty while tasks are cooling, idle for the unit',
    'When heap and queue are empty, the time equals (maxFreq − 1)(n + 1) + countMax or the task count',
    'Done: return the total time',
  ],
  complexity: [{ label: 'Time', value: 'O(T log 26) ≈ O(T)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The most frequent task forces the structure: its maxFreq runs are separated by n slots, giving (maxFreq − 1)(n + 1) slots plus a final row for every task tied at that frequency. Everything else can be tucked into the gaps, so the answer is that frame length — unless there are more tasks than the frame can hold, in which case no idling is needed and the answer is the task count. Greedily picking the largest remaining count realises exactly that schedule.',
};
