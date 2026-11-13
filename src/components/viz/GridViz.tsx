import { useState } from 'react';
import type { Cell, GridVariant } from '../../engine/types';
import { stateClass } from '../ArrayViz';
import { EmptyScene } from './EmptyScene';

interface Props {
  rows: Cell[][];
  rowHeads?: string[];
  colHeads?: string[];
  variant?: GridVariant;
  sortedSolid?: boolean;
}

const isIndexRun = (heads?: string[]) => !heads || heads.every((h, i) => h === String(i));
const EMPTY = new Set(['', '·', '?', '—', '-', '_']);

/** Cells whose value differs from the previous picture (derived state, computed once per new `rows`). */
function useChangedCells(rows: Cell[][]) {
  const [memo, setMemo] = useState<{ rows: Cell[][]; changed: Set<string> }>({ rows, changed: new Set() });
  if (memo.rows === rows) return memo.changed;
  const changed = new Set<string>();
  if (memo.rows.length === rows.length) {
    rows.forEach((row, r) =>
      row.forEach((c, i) => {
        const was = memo.rows[r]?.[i];
        if (was && String(was.value) !== String(c.value)) changed.add(`${r},${i}`);
      }),
    );
  }
  setMemo({ rows, changed });
  return changed;
}

/** 'table' (ruled DP table) or 'matrix' (free-standing cells); an explicit `variant` wins, otherwise decided by the headers. */
export function gridKind(variant: GridVariant | undefined, rowHeads?: string[], colHeads?: string[]): GridVariant {
  return variant ?? (rowHeads && colHeads && !(isIndexRun(rowHeads) && isIndexRun(colHeads)) ? 'table' : 'matrix');
}

export function GridViz({ rows, rowHeads, colHeads, variant, sortedSolid = false }: Props) {
  const changed = useChangedCells(rows);
  const cols = rows[0]?.length ?? 0;
  if (cols === 0) return <EmptyScene what="grid" />;
  const kind = gridKind(variant, rowHeads, colHeads);
  const cls = (c: Cell, r: number, i: number, base: string) =>
    [base, stateClass(c.state, sortedSolid), c.tone ? `t-${c.tone}` : '', changed.has(`${r},${i}`) ? 'chg' : '', EMPTY.has(String(c.value)) ? 'empty' : '']
      .filter(Boolean).join(' ');

  if (kind === 'table') {
    return (
      <div className="dp-wrap" role="img" aria-label="Table">
        <table className="dp-table">
          {colHeads && (
            <thead>
              <tr>
                {rowHeads && <th className="dp-corner" />}
                {colHeads.map((h, i) => <th key={i} scope="col">{h}</th>)}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {rowHeads && <th scope="row">{rowHeads[r]}</th>}
                {row.map((c, i) => (
                  <td key={i} className={cls(c, r, i, 'dp-cell')} data-state={c.state ?? ''}>{c.value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const size = cols > 12 ? 30 : cols > 9 ? 36 : 44;
  return (
    <div className="mat-wrap" role="img" aria-label="Grid">
      <div
        className="mat-outer"
        style={{ gridTemplateColumns: `${rowHeads ? 'auto ' : ''}repeat(${cols}, ${size}px)`, ['--mat-size' as string]: `${size}px` }}
      >
        {colHeads && (
          <>
            {rowHeads && <div className="mat-corner" />}
            {colHeads.map((h, i) => <div key={i} className="mat-ch">{h}</div>)}
          </>
        )}
        {rows.map((row, r) => (
          <div key={r} className="mat-row">
            {rowHeads && <div className="mat-rh">{rowHeads[r]}</div>}
            {row.map((c, i) => (
              <div key={i} className={cls(c, r, i, 'mat-cell')} data-state={c.state ?? ''}>{c.value}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
