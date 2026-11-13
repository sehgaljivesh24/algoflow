/**
 * Shared animation for "state machine" DP: rows are states (holding, sold, resting, ...), columns are days.
 * Each cell is computed from the previous day's cells, and the cells it reads are highlighted.
 */
import type { Cell, Step } from '../engine/types.ts';
import { recorder } from './stepKit.ts';

export interface StockState {
  name: string;
  /** value on day 0 */
  init: number;
  /** `prev` = every state's value on the previous day. `from` = indexes of the states that were read. `moved` = value came from a different state (a transition fired). */
  step: (prev: number[], price: number) => { value: number; from: number[]; moved: boolean; desc: string };
}

type Lines = { j: number[]; p: number[] };

export interface StockSpec {
  intro: { title: string; desc: string; logic: string };
  baseDesc: string;
  baseLogic: string;
  /** rows whose last-day maximum is the answer */
  answerRows: number[];
  logicPerState: string[];
  doneDesc: (ans: number) => string;
  doneLogic: string;
  resultText: string;
  lines: { intro: Lines; base: Lines; state: Lines[]; done: Lines };
}

export function parsePrices(raw: string, max = 8): number[] {
  const nums = raw.split(/[\s,]+/).filter(Boolean).map(Number);
  if (nums.length < 2 || nums.some((n) => !Number.isInteger(n))) throw new Error('Enter at least two whole-number prices, e.g. 1 2 3 0 2');
  if (nums.length > max) throw new Error(`Use ${max} prices or fewer`);
  if (nums.some((n) => n < 0 || n > 30)) throw new Error('Each price must be between 0 and 30');
  return nums;
}

export function buildStock(prices: number[], states: StockState[], spec: StockSpec): Step[] {
  const D = prices.length;
  const tab: (number | null)[][] = states.map(() => Array(D).fill(null));
  const moved: boolean[][] = states.map(() => Array(D).fill(false));
  const steps: Step[] = [];
  let cur: [number, number] | null = null;
  let src: [number, number][] = [];
  let done = false;
  let ansCol = false;

  const snap = () => ({
    scene: {
      kind: 'grid' as const,
      variant: 'table' as const,
      rows: tab.map((row, r) => row.map((v, c): Cell => ({
        key: `${r},${c}`, value: v === null ? '?' : v,
        state: cur && cur[0] === r && cur[1] === c ? (done ? 'found' : 'active')
          : src.some(([a, b]) => a === r && b === c) ? 'compare'
            : ansCol && c === D - 1 && spec.answerRows.includes(r) ? 'found' : v === null ? 'dim' : undefined,
        tone: moved[r][c] ? 'green' : undefined,
      }))),
      rowHeads: states.map((s) => s.name),
      colHeads: prices.map((p, i) => `d${i}: ${p}`),
    },
    vars: {
      day: cur ? cur[1] : '—', price: cur ? prices[cur[1]] : '—', state: cur ? states[cur[0]].name : '—',
      value: cur && tab[cur[0]][cur[1]] !== null ? tab[cur[0]][cur[1]]! : '—',
    },
  });
  const say = recorder(steps, snap);

  const short = (name: string) => name.replace(/\s*\(.*\)\s*$/, '');
  say({ ...spec.intro, java: spec.lines.intro.j, py: spec.lines.intro.p, algo: 0, tag: 'STATES —', note: `${states.map((s) => short(s.name)).join(' / ')} × ${D} days` });

  states.forEach((s, r) => { tab[r][0] = s.init; });
  cur = [0, 0];
  src = [];
  done = true;
  say({
    title: `Day 0 (price ${prices[0]}): start values`, desc: spec.baseDesc, logic: spec.baseLogic, tone: 'success', java: spec.lines.base.j, py: spec.lines.base.p, algo: 1,
    tag: 'DAY 0 —', note: states.map((s) => `${short(s.name)} = ${s.init}`).join(', '),
  });

  for (let d = 1; d < D; d++) {
    const prev = states.map((_, r) => tab[r][d - 1]!);
    states.forEach((s, r) => {
      const res = s.step(prev, prices[d]);
      cur = [r, d];
      src = res.from.map((f) => [f, d - 1] as [number, number]);
      done = false;
      tab[r][d] = res.value;
      moved[r][d] = res.moved;
      done = true;
      say({
        title: `Day ${d} (price ${prices[d]}): ${s.name} = ${res.value}`, desc: res.desc,
        logic: spec.logicPerState[r], tone: res.moved ? 'success' : 'info', java: spec.lines.state[r].j, py: spec.lines.state[r].p, algo: 2,
        tag: `DAY ${d} · ${short(s.name).toUpperCase()} —`,
        note: `${short(s.name)}[${d}] = ${res.value}, reads ${res.from.map((f) => `${short(states[f].name)}[${d - 1}] = ${prev[f]}`).join(', ')}, price ${prices[d]}`,
      });
    });
  }

  ansCol = true;
  cur = null;
  src = [];
  const ans = Math.max(...spec.answerRows.map((r) => tab[r][D - 1]!));
  say({
    title: 'Done', tag: '✅ Done!', note: `max(${spec.answerRows.map((r) => `${short(states[r].name)} = ${tab[r][D - 1]}`).join(', ')}) = ${ans}`,
    desc: spec.doneDesc(ans), logic: spec.doneLogic, tone: 'success', java: spec.lines.done.j, py: spec.lines.done.p, algo: 3,
    result: { title: String(ans), text: spec.resultText },
  });
  return steps;
}
