import type { ProblemDef, Step, Tone } from '../engine/types.ts';
import { arr, find, recorder, splitParts } from './dpAdvKit.ts';

interface In { m: number; total: number }

const java = [
  'Boolean[] memo;                                 // memo[used] = does the player to move win? (used = bitmask of taken numbers)',
  'public boolean canIWin(int maxChoosableInteger, int desiredTotal) {',
  '    int m = maxChoosableInteger;',
  '    if (desiredTotal <= 0) return true;',
  '    if (m * (m + 1) / 2 < desiredTotal) return false;   // nobody can ever reach the total',
  '    memo = new Boolean[1 << m];',
  '    return win(0, desiredTotal, m);',
  '}',
  'private boolean win(int used, int remaining, int m) {',
  '    if (memo[used] != null) return memo[used];',
  '    for (int i = 1; i <= m; i++) {',
  '        int bit = 1 << (i - 1);',
  '        if ((used & bit) != 0) continue;                // already taken',
  '        if (i >= remaining || !win(used | bit, remaining - i, m)) {',
  '            return memo[used] = true;                   // this move wins outright or leaves the opponent losing',
  '        }',
  '    }',
  '    return memo[used] = false;                          // every move hands the opponent a win',
  '}',
];
const python = [
  'def can_i_win(m, total):',
  '    if total <= 0:',
  '        return True',
  '    if m * (m + 1) // 2 < total:                  # nobody can ever reach the total',
  '        return False',
  '    memo = {}                                     # memo[used] = does the player to move win?',
  '    def win(used, remaining):',
  '        if used in memo:',
  '            return memo[used]',
  '        for i in range(1, m + 1):',
  '            bit = 1 << (i - 1)',
  '            if used & bit:',
  '                continue                          # already taken',
  '            if i >= remaining or not win(used | bit, remaining - i):',
  '                memo[used] = True                 # wins outright or leaves the opponent losing',
  '                return True',
  '        memo[used] = False                        # every move hands the opponent a win',
  '        return False',
  '    return win(0, total)',
];
const J = {
  trivial: find(java, 'if (desiredTotal <= 0)', 'if (m * (m + 1)'), start: find(java, 'memo = new Boolean', 'return win(0'),
  hit: find(java, 'if (memo[used] != null)'), enter: find(java, 'for (int i = 1', 'int bit'), try: find(java, 'if (i >= remaining'),
  win: find(java, 'return memo[used] = true'), lose: find(java, 'return memo[used] = false'),
};
const P = {
  trivial: find(python, 'if total <= 0', 'if m * (m + 1)'), start: find(python, 'memo = {}', 'return win(0'),
  hit: find(python, 'if used in memo'), enter: find(python, 'for i in range(1', 'bit = 1'), try: find(python, 'if i >= remaining'),
  win: find(python, 'memo[used] = True'), lose: find(python, 'memo[used] = False'),
};

const maskSet = (used: number, m: number) => `{${Array.from({ length: m }, (_, i) => i + 1).filter((i) => used & (1 << (i - 1))).join(',') || '∅'}}`;

function build({ m, total }: In): Step[] {
  const steps: Step[] = [];
  const memo = new Map<number, boolean>();
  const memoOrder: number[] = [];
  const path: { num: number; by: 'A' | 'B' }[] = []; // numbers taken on the current line of play
  let ret: string = '—';
  let mover: string = '—';
  let rem: number | string = '—';
  let usedShow: string = '∅';

  const snap = () => ({
    cells: arr(
      Array.from({ length: m }, (_, i) => i + 1),
      (i) => (path.some((p) => p.num === i + 1) ? 'dim' : undefined),
      (i) => {
        const p = path.find((q) => q.num === i + 1);
        return p ? (p.by === 'A' ? ('blue' as Tone) : ('orange' as Tone)) : undefined;
      },
    ),
    pointers: [],
    aux: [
      { title: 'line of play (A moves first)', kind: 'stack' as const, items: path.map((p) => `${p.by} takes ${p.num}`) },
      { title: 'memo: used set → mover wins?', kind: 'map' as const, items: [...memoOrder.slice(-9)].map((u) => `${maskSet(u, m)} → ${memo.get(u) ? 'win' : 'lose'}`) },
    ],
    vars: { 'player to move': mover, remaining: rem, used: usedShow, returns: ret },
  });
  const say = recorder(steps, snap);

  say({
    title: 'The game', desc: `Numbers 1..${m} are on the table; players A and B take turns picking one unused number and adding it to a shared running total. Whoever first makes the total reach ${total} or more wins.`,
    logic: 'The set of numbers still available (a bitmask) fully determines the position: the remaining target is total − sum of the taken numbers.',
    java: J.start, py: P.start, algo: 0, tag: 'THE GAME —', note: `numbers 1..${m}, target ${total}, state = bitmask of taken numbers`,
  });
  if (total <= 0) {
    say({ title: 'Target already met', desc: 'A non-positive target is reached before anyone moves: the first player wins.', logic: 'Trivial case handled before any search.', tone: 'success', java: J.trivial, py: P.trivial, algo: 0, tag: '✅ Done!', note: `desiredTotal ${total} ≤ 0 → true`, result: { title: 'true', text: 'First player wins' } });
    return steps;
  }
  if ((m * (m + 1)) / 2 < total) {
    say({ title: 'Target unreachable', desc: `Even all numbers together sum to ${(m * (m + 1)) / 2}, below ${total}. Nobody can ever win, so the first player cannot.`, logic: 'Pigeonhole shortcut: checked first so the recursion never loops on a game that cannot end.', tone: 'warn', java: J.trivial, py: P.trivial, algo: 0, tag: '❌ Unreachable!', note: `${m} · ${m + 1} / 2 = ${(m * (m + 1)) / 2} < ${total} → false`, alert: `All numbers sum to ${(m * (m + 1)) / 2} < ${total}: nobody can ever reach the target.`, result: { title: 'false', text: 'Cannot force a win' } });
    return steps;
  }

  const win = (used: number, remaining: number, depth: number, via: number | null): boolean => {
    const who = depth % 2 === 0 ? 'A' : 'B';
    mover = who;
    rem = remaining;
    usedShow = maskSet(used, m);
    if (memo.has(used)) {
      const r = memo.get(used)!;
      ret = r ? 'win' : 'lose';
      say({
        title: `Memo hit ${maskSet(used, m)}`, desc: `This exact set of taken numbers was solved before (via another move order): the mover wins = ${r}. Reuse it.`,
        logic: 'Different move orders reaching the same set of numbers give identical futures, so the memo cuts the 2^m states out of m! orderings.', tone: 'info', java: J.hit, py: P.hit, algo: 2,
        tag: 'MEMO HIT —', note: `memo[${maskSet(used, m)}] = ${r ? 'win' : 'lose'} → return at once`,
      });
      return r;
    }
    ret = '…';
    say({
      title: `Player ${who} to move, ${remaining} to go`, desc: `${via === null ? 'Start: nothing taken.' : `A move just took ${via}.`} Taken: ${maskSet(used, m)}. Player ${who} needs ${remaining} more and will try each free number.`,
      logic: 'The mover wins if some number reaches the target, or if some number leaves the opponent in a losing position.', java: J.enter, py: P.enter, algo: 1,
      tag: `PLAYER ${who} TO MOVE —`, note: `used = ${maskSet(used, m)}, remaining = ${remaining}`,
    });
    for (let i = 1; i <= m; i++) {
      const bit = 1 << (i - 1);
      if (used & bit) continue;
      if (i >= remaining) {
        memo.set(used, true);
        memoOrder.push(used);
        mover = who;
        rem = remaining;
        usedShow = maskSet(used, m);
        ret = 'win';
        say({
          title: `${who} takes ${i} and wins`, desc: `${i} ≥ remaining ${remaining}: the total reaches the target right now. Player ${who} wins from ${maskSet(used, m)}.`,
          logic: 'An immediate finish needs no further look-ahead.', tone: 'success', java: J.win, py: P.win, algo: 2,
          tag: `${who} WINS —`, note: `${i} ≥ remaining ${remaining} → memo[${maskSet(used, m)}] = true`,
        });
        return true;
      }
      path.push({ num: i, by: who === 'A' ? 'A' : 'B' });
      const oppWins = win(used | bit, remaining - i, depth + 1, i);
      path.pop();
      mover = who;
      rem = remaining;
      usedShow = maskSet(used, m);
      if (!oppWins) {
        memo.set(used, true);
        memoOrder.push(used);
        ret = 'win';
        say({
          title: `${who} takes ${i}: opponent loses`, desc: `After ${who} takes ${i} the opponent loses with best play, so Player ${who} wins from ${maskSet(used, m)}. Remaining numbers are not tried.`,
          logic: 'One winning reply is enough, so the mover stops searching (that choice is the optimal move).', tone: 'success', java: J.win, py: P.win, algo: 2,
          tag: `${who} WINS —`, note: `win(${maskSet(used | bit, m)}) = false → memo[${maskSet(used, m)}] = true`,
        });
        return true;
      }
    }
    memo.set(used, false);
    memoOrder.push(used);
    ret = 'lose';
    say({
      title: `Player ${who} loses from ${maskSet(used, m)}`, desc: `Every number the mover can take leaves the opponent with a winning position, so Player ${who} loses here.`,
      logic: 'All moves checked and none works: this state is a loss for whoever is on move.', tone: 'warn', java: J.lose, py: P.lose, algo: 2,
      tag: `${who} LOSES —`, note: `every move leaves a winning reply → memo[${maskSet(used, m)}] = false`,
      alert: `Player ${who} loses from ${maskSet(used, m)}: every free number hands the opponent a win.`,
    });
    return false;
  };

  const res = win(0, total, 0, null);
  mover = 'A';
  rem = total;
  usedShow = '∅';
  ret = res ? 'win' : 'lose';
  say({
    title: 'Done', tag: '✅ Done!', note: `return win(∅) = ${res}`, desc: res ? `The first player can force a win from the empty board.` : `Whatever the first player picks, the second player can answer to win.`,
    logic: 'The memo entry for the empty set is the answer.', tone: res ? 'success' : 'warn', java: J.start, py: P.start, algo: 3,
    result: { title: String(res), text: res ? 'First player wins' : 'First player loses' },
  });
  return steps;
}

function parse(raw: string): In {
  const [a, b] = splitParts(raw, 2, 'max number ; target total — e.g. 5 ; 9');
  const m = Number(a);
  const total = Number(b);
  if (!Number.isInteger(m) || m < 1 || m > 6) throw new Error('The largest number must be a whole number from 1 to 6');
  if (!Number.isInteger(total) || total < 0 || total > 21) throw new Error('The target total must be a whole number from 0 to 21');
  if (build({ m, total }).length > 400) throw new Error('That game needs more than 400 animation steps. Try a smaller maximum or total.');
  return { m, total };
}

export const canIWin: ProblemDef<In> = {
  slug: '464-can-i-win',
  id: '464', title: 'Can I Win', difficulty: 'Medium', category: 'Dynamic Programming', tag: 'game · bitmask memo',
  statement: 'Two players take turns choosing an unused integer from 1 to maxChoosableInteger (no repeats) and adding it to a running total. The player whose pick makes the total reach desiredTotal or more wins. Assuming optimal play, can the first player force a win?',
  constraints: '1 ≤ maxChoosableInteger ≤ 20, 0 ≤ desiredTotal ≤ 300 (animation input: max ≤ 6, total ≤ 21)',
  examples: [
    { label: 'max 4, total 6', input: { m: 4, total: 6 }, output: 'true' },
    { label: 'max 3, total 5', input: { m: 3, total: 5 }, output: 'true' },
    { label: 'max 4, total 10 (exactly all numbers)', input: { m: 4, total: 10 }, output: 'false' },
  ],
  inputPlaceholder: 'max ; total, e.g. 5 ; 9',
  parseInput: parse, buildSteps: build, viz: 'cells',
  legend: [{ label: 'Taken on this line of play (border colour: blue = A, orange = B)', state: 'dim' }],
  varLabels: ['player to move', 'remaining', 'used', 'returns'],
  emphasis: ['unused integer', 'running total', 'optimal play', 'first player'],
  phases: [
    { icon: '🎲', label: 'Trivial cases & the game', tone: 'blue' },
    { icon: '🧮', label: 'State = bitmask of taken numbers', tone: 'blue' },
    { icon: '⚡', label: 'Memo lookup', tone: 'cyan' },
    { icon: '⚔️', label: 'Try each free number', tone: 'gold' },
    { icon: '✅', label: 'Done: win(0)', tone: 'green' },
  ],
  approach: {
    title: 'Minimax over bitmask states, memoised',
    text: 'A position is the set of numbers already taken, stored as a bitmask. The mover wins if some free number i reaches the remaining target, or leaves the opponent in a losing position. Cache each mask’s verdict so the 2^m sets are solved once each.',
  },
  java, python,
  algorithm: [
    'Handle trivial cases: target ≤ 0 wins; unreachable target cannot be won',
    'State = bitmask of taken numbers (remaining = total − their sum)',
    'win(mask): return the cached verdict if there is one',
    'Try each free number: it wins if it reaches the target or if win(next mask) is false',
    'Cache and return; the answer is win(0)',
  ],
  complexity: [{ label: 'Time', value: 'O(2^m · m)' }, { label: 'Space', value: 'O(2^m)' }],
  why: 'The remaining target depends only on which numbers are gone, not on who took them or in what order, so the bitmask is a complete state and there are only 2^m of them. In a finite game with no draws, a position is winning exactly when at least one move reaches the goal or leads to a losing position for the opponent; this recursive definition is well founded because each move removes a number. Memoising turns the m! move orders into 2^m states.',
};
