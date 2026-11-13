import type { IntervalBarVM, IntervalsScene } from '../engine/types';

const W = 620;
const LANE = 26;
const GAP = 8;
const TOP = 30;

/** Bar colour roles (CSS classes in styles-visuals.css). */
const STATE_CLASS: Record<string, string> = {
  active: 'vz-current', compare: 'vz-queued', swap: 'vz-visited', found: 'vz-result', sorted: 'vz-result', error: 'vz-rejected', dim: 'vz-dim',
};
const TONE_CLASS: Record<string, string> = {
  blue: 'vz-current', orange: 'vz-tone-orange', purple: 'vz-visited', green: 'vz-result', yellow: 'vz-queued', red: 'vz-rejected',
};

/** Lane for every bar: pinned rows when ALL bars set `row`, otherwise greedy packing by start time. */
export function packLanes(bars: IntervalBarVM[]): number[] {
  if (bars.length && bars.every((b) => typeof b.row === 'number')) return bars.map((b) => b.row!);
  const idx = bars.map((_, i) => i).sort((i, j) => bars[i].start - bars[j].start || bars[i].end - bars[j].end || i - j);
  const laneEnd: number[] = [];
  const lane = new Array<number>(bars.length).fill(0);
  for (const i of idx) {
    let l = laneEnd.findIndex((e) => e < bars[i].start);
    if (l < 0) { l = laneEnd.length; laneEnd.push(-Infinity); }
    laneEnd[l] = bars[i].end;
    lane[i] = l;
  }
  return lane;
}

export function IntervalsViz({ scene }: { scene: IntervalsScene }) {
  const all = [...scene.bars, ...(scene.result ?? [])];
  let min = scene.axis?.min ?? Math.min(...all.map((b) => b.start), scene.marker?.at ?? Infinity);
  let max = scene.axis?.max ?? Math.max(...all.map((b) => b.end), scene.marker?.at ?? -Infinity);
  if (!Number.isFinite(min) || !Number.isFinite(max)) { min = 0; max = 1; }
  if (max === min) max = min + 1;
  const gutter = scene.rowLabels?.length ? 58 : 14;
  const x0 = gutter + 8;
  const x1 = W - 16;
  const sx = (v: number) => x0 + ((v - min) / (max - min)) * (x1 - x0);

  const lanesA = packLanes(scene.bars);
  const nA = scene.bars.length ? Math.max(...lanesA) + 1 : 0;
  const res = scene.result ?? [];
  const lanesB = packLanes(res);
  const nB = res.length ? Math.max(...lanesB) + 1 : 0;
  const laneY = (l: number, base: number) => base + l * (LANE + GAP);
  const yA = TOP;
  const hasRes = scene.result !== undefined;
  const rowsA = Math.max(nA, 1);
  const rowsB = Math.max(nB, 1);
  const yDivider = yA + rowsA * (LANE + GAP) + 4;
  const yB = hasRes ? yDivider + 22 : 0;
  const yAxis = (hasRes ? yB + rowsB * (LANE + GAP) : yA + rowsA * (LANE + GAP)) + 4;
  const H = yAxis + 26;

  const step = Math.max(1, Math.ceil((max - min) / 14));
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(t);

  const track = (rows: number, base: number) =>
    Array.from({ length: rows }, (_, l) => (
      <rect key={l} x={x0 - 6} y={laneY(l, base) - 3} width={x1 - x0 + 12} height={LANE + 6} rx="8" className="iv-track" />
    ));

  const bar = (b: IntervalBarVM, lane: number, base: number) => {
    const cls = (b.tone && TONE_CLASS[b.tone]) || (b.state && STATE_CLASS[b.state]) || '';
    const xa = sx(b.start);
    const xb = sx(b.end);
    const w = Math.max(10, xb - xa);
    const x = xb - xa < 10 ? xa - (10 - (xb - xa)) / 2 : xa;
    const label = b.label ?? `${b.start}–${b.end}`;
    const y = laneY(lane, base);
    const fits = label.length * 6.8 + 8 <= w;
    // the group keeps its identity between steps, so bars glide to a new lane / grow when two intervals merge
    return (
      <g key={String(b.id)} className={`iv-bar${b.state === 'dim' ? ' vz-faded' : ''}`} style={{ transform: `translate(${x}px, ${y}px)` }}>
        <rect x="0" y="0" height={LANE} rx="7" className={`iv-rect ${cls}`} style={{ width: w }} />
        {fits && <text x={w / 2} y={LANE / 2 + 4} textAnchor="middle" className="iv-label">{label}</text>}
      </g>
    );
  };

  const mk = scene.marker;
  return (
    <div className="iv-wrap">
      <svg className="svg-viz iv" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: Math.round(W * 1.15) }} role="img" aria-label="Intervals on a timeline">
        {track(rowsA, yA)}
        {hasRes && track(rowsB, yB)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} y1={TOP - 6} x2={sx(t)} y2={yAxis} className="iv-grid" />
            <text x={sx(t)} y={yAxis + 16} textAnchor="middle" className="iv-tick">{t}</text>
          </g>
        ))}
        <line x1={x0} y1={yAxis} x2={x1} y2={yAxis} className="iv-axis" />
        {(scene.rowLabels ?? []).slice(0, nA).map((r, l) => (
          <text key={l} x={gutter - 4} y={laneY(l, yA) + LANE / 2 + 4} textAnchor="end" className="iv-rowlabel">{r}</text>
        ))}
        {scene.bars.map((b, i) => bar(b, lanesA[i], yA))}
        {hasRes && (
          <g>
            <line x1={x0 - 6} y1={yDivider} x2={x1 + 6} y2={yDivider} className="iv-divider" />
            <text x={x0 - 6} y={yDivider + 15} className="iv-rowlabel iv-reslabel">{scene.resultLabel ?? 'result'}</text>
            {res.length === 0 && <text x={x0 + 8} y={yB + LANE / 2 + 4} className="iv-tick iv-empty">nothing yet</text>}
            {res.map((b, i) => bar(b, lanesB[i], yB))}
          </g>
        )}
        {mk && (
          <g className="iv-marker" style={{ transform: `translate(${sx(mk.at)}px, 0px)` }}>
            <line x1="0" y1={TOP - 12} x2="0" y2={yAxis} />
            {mk.label && (
              <text x={Math.min(Math.max(sx(mk.at), x0 + 30), x1 - 30) - sx(mk.at)} y={TOP - 15} textAnchor="middle">{mk.label}</text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
