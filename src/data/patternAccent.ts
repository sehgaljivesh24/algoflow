/**
 * Accent colour of the live animation on a pattern page (heading, Play button, bold terms, stat values, code bar,
 * window frame). Values are names of the surface colour variables, so the light theme follows automatically.
 * Cyan is the default; a pattern can override its family colour by slug.
 */
export type Accent = 'cyan' | 'purple' | 'green' | 'orange' | 'yellow' | 'blue' | 'red';

const BY_FAMILY: Record<string, Accent> = {
  'Sliding Window': 'cyan',
  'Two Pointers': 'green',
  'Prefix Sum & Hashing': 'yellow',
  'Binary Search': 'blue',
  Stack: 'orange',
  'BFS / Grid': 'cyan',
  'Linked List': 'green',
  Tree: 'green',
  Backtracking: 'purple',
  Greedy: 'yellow',
  'Heap / Priority Queue': 'orange',
  Graph: 'blue',
  'Dynamic Programming': 'purple',
  'Bit Manipulation': 'red',
  Design: 'orange',
  Recursion: 'purple',
  Strings: 'blue',
  Sorting: 'orange',
  Math: 'yellow',
};

const BY_SLUG: Record<string, Accent> = {
  'sliding-window-dynamic': 'purple',
};

/** Accent for a pattern: slug override, then family colour, then cyan. */
export function accentFor(slug: string, family?: string): Accent {
  return BY_SLUG[slug] ?? (family ? BY_FAMILY[family] : undefined) ?? 'cyan';
}
