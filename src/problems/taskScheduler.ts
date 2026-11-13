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

  emit('Start', `${tasks.length} tasks, cooldown n = ${n}: two runs of the same letter need at least ${n} other slots between them. Each time unit runs one task or idles.`,
    'Greedy rule: always run the ready task with the most copies left — the most frequent letter is the bottleneck.', 'info', [1, 2, 3, 4, 5, 6], [1, 2, 3, 4], 0);

  while (ready.length || cool.length) {
    t++;
    const released = cool.filter((c) => c.at <= t);
    cool = cool.filter((c) => c.at > t);
    for (const c of released) ready.push([c.letter, c.rem]);
    ready.sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1));
    const relText = released.length ? `${released.map((c) => c.letter).join(', ')} finished cooling and returns to the ready list. ` : '';
    if (!ready.length) {
      idle++;
      line.push('·');
      emit(`t = ${t}: idle`, `${relText}Nothing is ready (everything is cooling down), so the CPU idles.`, 'Idle slots appear only when too few different tasks can fill the cooldown gap.', 'warn', [8, 13], [6, 11, 12], 2);
      continue;
    }
    const [letter, rem] = ready.shift() as [string, number];
    line.push(letter);
    if (rem - 1 > 0) cool.push({ letter, rem: rem - 1, at: t + n + 1 });
    emit(`t = ${t}: run ${letter}`, `${relText}Run ${letter} (${rem} left, the most among ready tasks). ${rem - 1 > 0 ? `It must now cool for ${n} unit${n === 1 ? '' : 's'}: ready again at t = ${t + n + 1}.` : `${letter} is finished.`}`,
      'The task with the most copies left is the hardest to place later, so it goes first.', 'success', [8, 9, 10, 11, 13], [6, 7, 8, 9, 10, 11, 12], 1);
  }

  const formula = (maxF - 1) * (n + 1) + countMax;
  emit('Done', `Total time = ${t}. Check with the formula: (maxFreq − 1) × (n + 1) + countMax = (${maxF} − 1) × ${n + 1} + ${countMax} = ${formula}; the answer is max(formula, #tasks) = max(${formula}, ${tasks.length}) = ${Math.max(formula, tasks.length)}.`,
    `${idle} idle slot${idle === 1 ? '' : 's'}. Frame view: (maxFreq − 1) full frames of n + 1 slots plus a last row holding the ${countMax} most frequent letter${countMax === 1 ? '' : 's'}.`, 'success', [15], [13], 3,
    { title: String(t), text: `${tasks.length} tasks + ${idle} idle slot${idle === 1 ? '' : 's'}` });
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
  algorithm: [
    'Count each task and put the counts in a max-heap',
    'Each time unit: pop the largest count, run that task, and move it to a cooldown queue',
    'When a task finishes cooling, push it back into the heap; if the heap is empty, idle',
    'Stop when heap and queue are empty; the time equals (maxFreq − 1)(n + 1) + countMax or the task count',
  ],
  complexity: [{ label: 'Time', value: 'O(T log 26) ≈ O(T)' }, { label: 'Space', value: 'O(1)' }],
  why: 'The most frequent task forces the structure: its maxFreq runs are separated by n slots, giving (maxFreq − 1)(n + 1) slots plus a final row for every task tied at that frequency. Everything else can be tucked into the gaps, so the answer is that frame length — unless there are more tasks than the frame can hold, in which case no idling is needed and the answer is the task count. Greedily picking the largest remaining count realises exactly that schedule.',
};
