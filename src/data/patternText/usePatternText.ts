import { useEffect, useState } from 'react';
import { loadPatternText, peekPatternText } from './load.ts';
import type { PatternText } from './types.ts';

export type PatternTextState =
  | { status: 'loading' }
  | { status: 'ready'; text: PatternText }
  | { status: 'error'; message: string };

const initial = (slug: string): PatternTextState => {
  const text = peekPatternText(slug);
  return text ? { status: 'ready', text } : { status: 'loading' };
};

/**
 * Loads the text of one pattern; resets whenever the slug changes (same shape as problems/useProblem.ts). Text that is
 * already in memory is returned on the first render, so revisiting a pattern shows no loading frame.
 */
export function usePatternText(slug: string): PatternTextState {
  const [state, setState] = useState<{ slug: string; res: PatternTextState }>(() => ({ slug, res: initial(slug) }));
  useEffect(() => {
    let live = true;
    loadPatternText(slug).then(
      (text) => live && setState({ slug, res: { status: 'ready', text } }),
      (e: unknown) => live && setState({ slug, res: { status: 'error', message: e instanceof Error ? e.message : 'Failed to load' } }),
    );
    return () => { live = false; };
  }, [slug]);
  return state.slug === slug ? state.res : initial(slug);
}
