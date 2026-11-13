import type { CellState, Scene, Step } from '../engine/types';
import { ArrayViz } from './ArrayViz';
import { GraphViz } from './GraphViz';
import { IntervalsViz } from './IntervalsViz';
import { NTreeViz } from './NTreeViz';
import { PlaneViz } from './PlaneViz';
import { TrieViz } from './TrieViz';
import { AuxPanels } from './viz/AuxPanels';
import { GridViz, gridKind } from './viz/GridViz';
import { ListViz } from './viz/ListViz';
import { TreeViz } from './viz/TreeViz';

export { AuxPanels };

/**
 * 'sorted' reads as a solid green block when it truly means "sorted / in its final place";
 * for the many problems that use it as "already processed / seen / filled" it is a calm green tint instead.
 */
export function isSortedSolid(legend?: { label: string; state: CellState }[]): boolean {
  const l = legend?.find((x) => x.state === 'sorted');
  if (!l) return true;
  return /sort|final|home|fixed|in place|resolved/i.test(l.label);
}

/** Picks the right renderer for a step. `legend` (optional) tells the renderers what each cell state means in this problem. */
export function SceneView({ step, bars, legend, layout }: { step: Step; bars?: boolean; legend?: { label: string; state: CellState }[]; layout?: 'default' | 'pattern' }) {
  const s: Scene = step.scene ?? { kind: 'array', cells: step.cells ?? [], pointers: step.pointers ?? [], bars };
  return renderScene(s, bars, isSortedSolid(legend), layout);
}

/** Default heading of the picture card for a step's scene. */
export function sceneTitle(step: Step, bars?: boolean): string {
  const s = step.scene;
  if (!s) return bars ? 'Bars' : 'Array';
  switch (s.kind) {
    case 'array': return s.bars ?? bars ? 'Bars' : 'Array';
    case 'list': return 'Linked list';
    case 'tree': return 'Binary tree';
    case 'grid': return gridKind(s.variant, s.rowHeads, s.colHeads) === 'table' ? 'DP table' : 'Grid';
    case 'graph': return 'Graph';
    case 'intervals': return 'Intervals';
    case 'trie': return 'Trie';
    case 'ntree': return 'Tree';
    case 'plane': return 'Plane';
    case 'split': return 'Board';
  }
}

function renderScene(s: Scene, bars: boolean | undefined, solid: boolean, layout?: 'default' | 'pattern'): JSX.Element {
  switch (s.kind) {
    case 'array':
      return <ArrayViz cells={s.cells} pointers={s.pointers} bars={s.bars ?? bars} sortedSolid={solid} layout={layout} />;
    case 'list':
      return <ListViz nodes={s.nodes} pointers={s.pointers} sortedSolid={solid} />;
    case 'tree':
      return <TreeViz scene={s} sortedSolid={solid} />;
    case 'grid':
      return <GridViz rows={s.rows} rowHeads={s.rowHeads} colHeads={s.colHeads} variant={s.variant} sortedSolid={solid} />;
    case 'graph':
      return <GraphViz scene={s} />;
    case 'intervals':
      return <IntervalsViz scene={s} />;
    case 'trie':
      return <TrieViz scene={s} />;
    case 'ntree':
      return <NTreeViz scene={s} />;
    case 'plane':
      return <PlaneViz scene={s} />;
    case 'split':
      return (
        <div className={`split-viz${s.stack ? ' stack' : ''}`}>
          {s.parts.map((p, i) => <div key={i} className="split-part">{renderScene(p, bars, solid, layout)}</div>)}
        </div>
      );
    default: {
      const unreachable: never = s;
      return unreachable;
    }
  }
}
