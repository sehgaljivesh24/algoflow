/**
 * Builds the text of ONE pattern from the source layers that mention it. Shared by the browser loader (./load.ts, which
 * fetches only the layers a slug needs) and by scripts/check.mts, which proves the result equals the eager reference in
 * ../patternsFull.ts for every pattern. Pure: no imports of data, so it stays tiny in the main bundle.
 */
import type { PatternContent } from '../patterns.ts';
import type { PatternPack } from '../packs/types.ts';
import type { PatternMeta } from '../patternMeta.ts';
import type { PatternDetail } from '../detail/types.ts';
import type { PatternText } from './types.ts';

/** The raw pieces of one slug, one field per source module (a missing field means that source does not mention the slug). */
export interface Layers {
  /** patterns.ts BASE_CONTENT[slug] */
  base?: PatternContent;
  /** patternTemplates.ts TEMPLATES[slug] (fills `template` of a BASE page) */
  template?: string;
  /** patternContent.ts EXTRA_CONTENT[slug] */
  extra?: PatternContent;
  /** The packs that mention the slug (content, meta or examples), in PACKS order. */
  packs: PatternPack[];
  /** patternMeta.ts BASE_META[slug] */
  baseMeta?: PatternMeta;
  /** The detail batch entry for the slug (a later batch replaces an earlier one as a whole). */
  detail?: PatternDetail;
}

export function resolveText(slug: string, L: Layers): PatternText {
  let content: PatternContent | undefined;
  for (const p of L.packs) if (p.content?.[slug]) content = p.content[slug];
  content ??= L.extra ?? (L.base ? { ...L.base, template: L.base.template ?? L.template } : undefined);
  if (content && L.detail?.content) content = { ...content, ...L.detail.content };

  let meta: PatternMeta | undefined;
  for (const p of L.packs) if (p.meta?.[slug]) meta = p.meta[slug];
  meta ??= L.baseMeta;
  if (meta && L.detail?.meta) meta = { ...meta, ...L.detail.meta };

  let examples = L.detail?.examples?.length ? L.detail.examples : L.packs.flatMap((p) => p.examples?.[slug] ?? []);
  if (!examples.length) examples = content ? [{ slug: content.animation, why: '' }] : [];

  return { content, meta, examples };
}
