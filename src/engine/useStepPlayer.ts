import { useCallback, useEffect, useState } from 'react';
import type { Step } from './types';

/** ms per step for each speed level (index 0 is the slowest). */
export const SPEEDS = [4500, 3200, 2200, 1600, 1000, 600];
export const SPEED_NAMES = ['Very slow', 'Slow', 'Relaxed', 'Normal', 'Fast', 'Very fast'];

export function useStepPlayer(steps: Step[]) {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const last = Math.max(0, steps.length - 1);

  // New step list (new example / custom input): start over, paused.
  useEffect(() => {
    setCur(0);
    setPlaying(false);
  }, [steps]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setCur((c) => Math.min(c + 1, last)), SPEEDS[speed]);
    return () => clearInterval(id);
  }, [playing, speed, last]);

  // Stop automatically on the final step.
  useEffect(() => {
    if (playing && cur >= last) setPlaying(false);
  }, [playing, cur, last]);

  const next = useCallback(() => setCur((c) => Math.min(c + 1, last)), [last]);
  const prev = useCallback(() => {
    setPlaying(false);
    setCur((c) => Math.max(c - 1, 0));
  }, []);
  const reset = useCallback(() => {
    setPlaying(false);
    setCur(0);
  }, []);
  const seek = useCallback(
    (i: number) => {
      setPlaying(false);
      setCur(Math.max(0, Math.min(i, last)));
    },
    [last],
  );
  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p && cur >= last) setCur(0);
      return !p;
    });
  }, [cur, last]);

  return {
    step: steps[cur],
    index: cur,
    total: steps.length,
    playing,
    speed,
    setSpeed,
    next,
    prev,
    reset,
    seek,
    toggle,
  };
}
