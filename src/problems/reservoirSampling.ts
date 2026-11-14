import type { Cell, ProblemDef, Step } from '../engine/types.ts';
import { plural } from './text.ts';
import { rng } from './graphKit.ts';
import { recorder } from './stepKit.ts';
import { intIn, intList, semis } from './p4Kit.ts';

interface In { stream: number[]; k: number; seed: number }

const FORMAT = 'stream ; k ; seed — e.g. 11 22 33 44 55 66 77 ; 3 ; 4';

function parse(raw: string): In {
  const p = semis(raw, 3, FORMAT);
  const stream = intList(p[0], { what: 'the stream', max: 12, lo: -99, hi: 99, example: '11 22 33 44 55 66 77' });
  return { stream, k: intIn(p[1], 1, Math.min(6, stream.length), 'k'), seed: intIn(p[2], 0, 999, 'seed') };
}

/** Deterministic reference: the final reservoir (slot order) for this seed. */
export function sampleReservoir(stream: number[], k: number, seed: number): number[] {
  const rand = rng(seed);
  const res: number[] = [];
  stream.forEach((x, idx) => {
    const seen = idx + 1;
    if (seen <= k) res.push(x);
    else {
      const j = Math.floor(rand() * seen);
      if (j < k) res[j] = x;
    }
  });
  return res;
}

function build({ stream, k, seed }: In): Step[] {
  const rand = rng(seed);
  const res: (number | null)[] = Array.from({ length: k }, () => null);
  const draws: string[] = [];
  let i = -1;
  let slot = -1;
  let tone: 'found' | 'swap' = 'found';
  let draw: number | string = '—';
  const steps: Step[] = [];

  const say = recorder(steps, () => ({
    scene: {
      kind: 'split' as const,
      parts: [
        {
          kind: 'array' as const,
          cells: stream.map((v, j): Cell => ({ key: `s${j}`, value: v, state: j === i ? 'active' : j < i ? 'sorted' : undefined })),
          pointers: i >= 0 ? [{ id: 'x', label: 'next', index: i, tone: 'blue' as const }] : [],
        },
        {
          kind: 'array' as const,
          cells: res.map((v, j): Cell => ({ key: `r${j}`, value: v === null ? '_' : v, state: j === slot ? tone : v === null ? 'dim' : undefined })),
          pointers: slot >= 0 ? [{ id: 'slot', label: 'slot', index: slot, tone: 'green' as const }] : [],
        },
      ],
    },
    aux: [
      { title: `draws (seed ${seed})`, kind: 'list' as const, items: [...draws] },
      { title: 'chance that each seen item is in the sample', kind: 'list' as const, items: i >= 0 ? [`${Math.min(k, i + 1)} / ${i + 1}  (min(k, seen) / seen)`] : [] },
    ],
    vars: { seen: i + 1, draw, slot: slot >= 0 ? slot : '—', 'sample size': res.filter((v) => v !== null).length },
  }));

  say({
    title: 'Start', desc: `A stream of ${plural(stream.length, 'value')} arrives one at a time and its length is unknown. Keep a sample of ${plural(k, 'value')}, each seen element equally likely to be in it.`,
    logic: 'Fill a reservoir with the first k items, then let each later item compete for a random slot with probability k / seen.', java: [1, 2, 3], py: [1, 2], algo: 0,
    tag: 'READY —', note: `reservoir = new int[${k}], seen = 0`,
  });

  for (let idx = 0; idx < stream.length; idx++) {
    i = idx;
    const seen = idx + 1;
    const x = stream[idx];
    if (seen <= k) {
      slot = idx;
      tone = 'found';
      res[idx] = x;
      draw = '—';
      say({
        title: `Fill slot ${idx} with ${x}`, tag: `ITEM ${seen} — FILL`, note: `seen = ${seen} ≤ ${k} → reservoir[${idx}] = ${x}`,
        desc: `Item ${seen} is within the first ${k}, so ${x} goes straight into slot ${idx}.`,
        logic: 'With at most k items seen, every item is in the sample with probability 1.', java: [7, 8], py: [3, 4], algo: 1,
      });
      continue;
    }
    const j = Math.floor(rand() * seen);
    draw = j;
    draws.push(`item ${seen}: rand(0..${seen - 1}) = ${j} → ${j < k ? `replace slot ${j}` : 'skip'}`);
    if (j < k) {
      const old = res[j];
      slot = j;
      tone = 'swap';
      res[j] = x;
      say({
        title: `Item ${seen} (${x}): draw ${j} < ${k}`, tag: `ITEM ${seen} — KEEP`, note: `j = ${j} < ${k} → reservoir[${j}] = ${x} (was ${old})`,
        desc: `j = ${j} lands in slot ${j} (chance ${k}/${seen}) → ${x} replaces ${old}.`,
        logic: `The new item is kept with probability ${k}/${seen}, and the evicted slot is chosen uniformly among the k slots.`, tone: 'success', java: [10, 11], py: [6, 7, 8], algo: 2,
      });
    } else {
      slot = -1;
      say({
        title: `Item ${seen} (${x}): draw ${j} ≥ ${k}`, tag: `ITEM ${seen} — SKIP`, note: `j = ${j} ≥ ${k} → reservoir unchanged`,
        alert: `Draw ${j} falls outside the ${plural(k, 'slot')}: item ${x} is discarded.`,
        desc: `j = ${j} is outside the ${plural(k, 'slot')} (chance ${seen - k}/${seen}) → ${x} is discarded.`,
        logic: 'Most items are dropped once the stream is long: the sample stays small and uniform.', java: [10, 11], py: [6, 7], algo: 2,
      });
    }
  }
  slot = -1;
  i = stream.length - 1;
  const final = res.map((v) => v as number);
  say({
    title: 'Done', tag: '✅ Done!', note: `return [${final.join(', ')}]`, desc: `The stream ended after ${plural(stream.length, 'item')}. The sample is [${final.join(', ')}] (each item had chance ${k}/${stream.length}).`,
    logic: `Every one of the ${plural(stream.length, 'item')} had the same probability ${k}/${stream.length} of being in the sample.`, tone: 'success', java: [14], py: [9], algo: 3,
    result: { title: `[${final.join(',')}]`, text: `Uniform sample of ${k}` },
  });
  return steps;
}

const ex = (stream: number[], k: number, seed: number): { label: string; input: In; output: string } => ({
  label: `${stream.join(' ')} ; k = ${k} ; seed ${seed}`, input: { stream, k, seed }, output: `[${sampleReservoir(stream, k, seed).join(',')}]`,
});

export const reservoirSampling: ProblemDef<In> = {
  slug: 'alg-reservoir-sampling-k-items',
  id: 'ALG', title: 'Reservoir Sampling (k Items)', difficulty: 'Medium', category: 'Randomized & Streaming', tag: 'reservoir sampling (k items)',
  statement: 'Items arrive from a stream whose length is not known in advance. Maintain a sample of k items so that, whenever the stream ends, every item that appeared is in the sample with the same probability k / n. Use only O(k) memory.',
  constraints: 'stream length unbounded in practice; animation: ≤ 12 values in −99..99, 1 ≤ k ≤ min(6, length); a seeded generator makes the random draws repeatable',
  examples: [
    ex([11, 22, 33, 44, 55, 66, 77], 3, 4),
    ex([5, 10, 15, 20, 25, 30, 35, 40, 45, 50], 2, 17),
    ex([1, 2, 3, 4], 4, 9),
  ],
  inputPlaceholder: FORMAT,
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Item being processed', state: 'active' }, { label: 'Processed', state: 'sorted' }, { label: 'Slot just filled', state: 'found' }, { label: 'Slot just replaced', state: 'swap' }, { label: 'Empty slot', state: 'dim' }],
  varLabels: ['seen', 'draw', 'slot', 'sample size'],
  emphasis: ['length is not known in advance', 'sample of k items', 'same probability k / n', 'O(k) memory'],
  phases: [
    { icon: '🏁', label: 'Phase 1: Create k slots', tone: 'blue' },
    { icon: '🪣', label: 'Phase 2: Fill the first k', tone: 'cyan' },
    { icon: '🎲', label: 'Phase 3: Draw j in [0, n)', tone: 'orange' },
    { icon: '✅', label: 'Done', tone: 'green' },
  ],
  approach: {
    title: 'Fill k slots, then replace at random',
    text: 'Store the first k items. For the n-th item (n > k) draw a random integer j in [0, n). If j < k, overwrite slot j with the new item; otherwise ignore it. After every item, each of the n items seen so far sits in the reservoir with probability k / n.',
  },
  java: [
    'public int[] sample(Iterator<Integer> stream, int k) {',
    '    int[] reservoir = new int[k];',
    '    Random rand = new Random();',
    '    int seen = 0;',
    '    while (stream.hasNext()) {',
    '        int x = stream.next();',
    '        seen++;',
    '        if (seen <= k) {',
    '            reservoir[seen - 1] = x;                  // fill phase',
    '        } else {',
    '            int j = rand.nextInt(seen);               // 0 .. seen-1',
    '            if (j < k) reservoir[j] = x;              // keep with probability k / seen',
    '        }',
    '    }',
    '    return reservoir;',
    '}',
  ],
  python: [
    'def sample(stream, k):',
    '    reservoir = []',
    '    for seen, x in enumerate(stream, start=1):',
    '        if seen <= k:',
    '            reservoir.append(x)                       # fill phase',
    '        else:',
    '            j = random.randrange(seen)                # 0 .. seen-1',
    '            if j < k:',
    '                reservoir[j] = x                      # keep with probability k / seen',
    '    return reservoir',
  ],
  algorithm: [
    'Create a reservoir of k slots and a counter of items seen',
    'For the first k items, copy them into the reservoir',
    'For item number n > k, draw j in [0, n); if j < k overwrite slot j',
    'When the stream ends the reservoir is the sample',
  ],
  complexity: [{ label: 'Time', value: 'O(n)' }, { label: 'Space', value: 'O(k)' }],
  why: 'Invariant: after n items, each item seen so far is in the reservoir with probability k / n. When item n + 1 arrives it enters with probability k / (n + 1). An old item survives if it is not evicted: it is evicted with probability (k / (n + 1)) · (1 / k) = 1 / (n + 1), so it stays with probability n / (n + 1). Its chance becomes (k / n) · (n / (n + 1)) = k / (n + 1), as required.',
};
