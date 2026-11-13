import { useEffect, useState } from 'react';
import type { AnyProblem } from '../engine/types.ts';
import { loadProblem } from './lazy.ts';

export type ProblemState =
  | { status: 'loading' }
  | { status: 'ready'; problem: AnyProblem }
  | { status: 'error'; message: string };

/** Loads one problem; resets to 'loading' whenever the slug changes. */
export function useProblem(slug: string): ProblemState {
  const [state, setState] = useState<{ slug: string; res: ProblemState }>({ slug, res: { status: 'loading' } });
  useEffect(() => {
    let live = true;
    loadProblem(slug).then(
      (problem) => live && setState({ slug, res: { status: 'ready', problem } }),
      (e: unknown) => live && setState({ slug, res: { status: 'error', message: e instanceof Error ? e.message : 'Failed to load' } }),
    );
    return () => { live = false; };
  }, [slug]);
  return state.slug === slug ? state.res : { status: 'loading' };
}
