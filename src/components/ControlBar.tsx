import type { KeyboardEvent, MouseEvent } from 'react';
import { SPEED_NAMES } from '../engine/useStepPlayer';

interface Props {
  index: number;
  total: number;
  playing: boolean;
  speed: number;
  onSpeed: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  onReset: () => void;
  onSeek: (i: number) => void;
}

export function ControlBar(p: Props) {
  const last = Math.max(0, p.total - 1);
  const pct = last === 0 ? 100 : (p.index / last) * 100;

  const scrub = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    p.onSeek(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * last));
  };
  const scrubKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Home') p.onSeek(0);
    else if (e.key === 'End') p.onSeek(last);
    else return;
    e.preventDefault();
  };

  return (
    <div className="card vp-ctrl">
      <div className="vp-hint">
        ▸ <b>Prev</b> / <b>Next</b> = step-by-step. <b>Play</b> = auto-advance. <b>Slider</b> = speed.
      </div>
      <div className="vp-ctrl-row">
        <button className="vbtn" onClick={p.onPrev} disabled={p.index === 0} title="Previous step (←)">◀ Prev</button>
        <button className={`vbtn play${p.playing ? ' paused' : ''}`} onClick={p.onToggle} title="Play / pause (Space)">
          {p.playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button className="vbtn" onClick={p.onNext} disabled={p.index >= last} title="Next step (→)">Next ▶</button>
        <button className="vbtn reset" onClick={p.onReset} title="Back to the start (R)">↺ Reset</button>
        <label className="vp-speed">
          <span>Speed</span>
          <input type="range" min={0} max={5} value={p.speed} onChange={(e) => p.onSpeed(+e.target.value)} aria-label="Playback speed" />
          <span className="vp-speed-name">{SPEED_NAMES[p.speed]}</span>
        </label>
      </div>
      <div
        className="vp-scrub"
        role="slider"
        tabIndex={0}
        aria-label="Step position"
        aria-valuemin={1}
        aria-valuemax={p.total}
        aria-valuenow={p.index + 1}
        aria-valuetext={`Step ${p.index + 1} of ${p.total}`}
        onClick={scrub}
        onKeyDown={scrubKey}
      >
        <div className="vp-prog"><div className="vp-prog-fill" style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="vp-ctr-row"><span className="vp-pill">{p.index + 1} / {p.total}</span></div>
    </div>
  );
}
