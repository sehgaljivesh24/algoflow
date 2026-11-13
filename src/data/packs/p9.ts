import type { PatternPack } from './types.ts';
import { frag as a } from './p9a.ts';
import { frag as b } from './p9b.ts';
import { frag as c } from './p9c.ts';
import { frag as d } from './p9d.ts';
import { frag as e } from './p9e.ts';
import { frag as f } from './p9f.ts';

/** Pack p9 "advanced-ds": merged from the fragments p9a..p9f (one per author), see PATTERNS-GUIDE.md. */
const frags = [a, b, c, d, e, f];
export const pack: PatternPack = {
  id: 'p9',
  groups: frags.flatMap((f) => f.groups ?? []),
  content: Object.assign({}, ...frags.map((f) => f.content ?? {})),
  meta: Object.assign({}, ...frags.map((f) => f.meta ?? {})),
  examples: Object.assign({}, ...frags.map((f) => f.examples ?? {})),
  problems: frags.flatMap((f) => f.problems ?? []),
};
