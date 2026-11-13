/**
 * Structural checks for one Step's visual scene. Called by check.mts for every step.
 * The agent that adds a new scene kind (graph / intervals / trie) extends this file.
 */
export type Ok = (name: string, cond: boolean, extra?: string) => void;

const TONES = ['blue', 'orange', 'green', 'purple', 'yellow', 'red'];
/** Cell.tone (array / bars / grid cells) must be one of the Tone names the renderers have a colour class for. */
const tonesValid = (cells: any[]) => cells.every((c: any) => c.tone === undefined || TONES.includes(c.tone));

export function checkScene(step: any, where: string, ok: Ok): void {
  const sc = step.scene;
  if (!sc) {
    // array shorthand
    ok(`${where}: cells present`, Array.isArray(step.cells) && step.cells.length > 0);
    if (!Array.isArray(step.cells)) return;
    ok(`${where}: cell keys unique`, new Set(step.cells.map((c: any) => c.key)).size === step.cells.length);
    ok(`${where}: cell tones valid`, tonesValid(step.cells));
    ok(`${where}: pointers in range`, (step.pointers ?? []).every((q: any) => q.index >= 0 && q.index < step.cells.length), JSON.stringify(step.pointers));
    return;
  }
  switch (sc.kind) {
    case 'array':
      ok(`${where}: array cells unique`, new Set(sc.cells.map((c: any) => c.key)).size === sc.cells.length);
      ok(`${where}: array cell tones valid`, tonesValid(sc.cells));
      ok(`${where}: array pointers in range`, sc.pointers.every((q: any) => q.index >= 0 && q.index < sc.cells.length));
      break;
    case 'list': {
      const keys = new Set(sc.nodes.map((n: any) => n.key));
      ok(`${where}: list keys unique`, keys.size === sc.nodes.length);
      ok(`${where}: list next keys valid`, sc.nodes.every((n: any) => n.next === null || keys.has(n.next)));
      ok(`${where}: list pointers in range`, sc.pointers.every((q: any) => q.index >= 0 && q.index < sc.nodes.length));
      break;
    }
    case 'tree': {
      const ids = new Set(sc.nodes.map((n: any) => n.id));
      ok(`${where}: tree ids unique`, ids.size === sc.nodes.length);
      ok(`${where}: tree children exist`, sc.nodes.every((n: any) => [n.left, n.right].every((c: any) => c === null || ids.has(c))));
      ok(`${where}: tree root exists`, sc.root === null || ids.has(sc.root));
      ok(`${where}: tree extraEdges endpoints exist`, (sc.extraEdges ?? []).every((e: any) => ids.has(e.from) && ids.has(e.to)));
      ok(`${where}: tree state/label ids valid`, Object.keys(sc.states).every((k) => ids.has(+k)) && Object.keys(sc.labels).every((k) => ids.has(+k)));
      break;
    }
    case 'grid':
      ok(`${where}: grid non-empty & rectangular`, sc.rows.length > 0 && sc.rows.every((r: any[]) => r.length === sc.rows[0].length));
      ok(`${where}: grid cell tones valid`, sc.rows.every(tonesValid));
      break;
    case 'graph': {
      const ids = new Set(sc.nodes.map((n: any) => n.id));
      ok(`${where}: graph has <= 12 nodes`, sc.nodes.length <= 12, String(sc.nodes.length));
      ok(`${where}: graph node ids unique`, ids.size === sc.nodes.length);
      ok(`${where}: graph edge endpoints exist, no self loops`, sc.edges.every((e: any) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to), JSON.stringify(sc.edges.filter((e: any) => !ids.has(e.from) || !ids.has(e.to) || e.from === e.to)));
      ok(`${where}: graph edge states valid`, sc.edges.every((e: any) => e.state === undefined || ['default', 'active', 'visited', 'chosen', 'dim', 'error'].includes(e.state)));
      ok(`${where}: graph fixed coords in 0..1`, sc.nodes.every((n: any) => (n.x === undefined && n.y === undefined) || (n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1)));
      ok(`${where}: graph layout valid`, sc.layout === undefined || sc.layout === 'circle' || sc.layout === 'layered');
      ok(`${where}: graph pointers in range`, (sc.pointers ?? []).every((q: any) => q.index >= 0 && q.index < sc.nodes.length));
      break;
    }
    case 'intervals': {
      const groupOk = (bars: any[]) => bars.every((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.start <= b.end);
      ok(`${where}: intervals bars non-empty`, sc.bars.length > 0 && sc.bars.length <= 14, String(sc.bars.length));
      ok(`${where}: intervals have start <= end`, groupOk(sc.bars) && groupOk(sc.result ?? []));
      ok(`${where}: interval bar ids unique per group`, new Set(sc.bars.map((b: any) => b.id)).size === sc.bars.length && new Set((sc.result ?? []).map((b: any) => b.id)).size === (sc.result ?? []).length);
      ok(`${where}: interval marker finite`, !sc.marker || Number.isFinite(sc.marker.at));
      ok(`${where}: interval axis valid`, !sc.axis || sc.axis.min <= sc.axis.max);
      break;
    }
    case 'trie': {
      const ids = new Set(sc.nodes.map((n: any) => n.id));
      ok(`${where}: trie ids unique`, ids.size === sc.nodes.length);
      ok(`${where}: trie root exists`, ids.has(sc.root));
      ok(`${where}: trie children exist`, sc.nodes.every((n: any) => n.children.every((c: any) => ids.has(c))));
      const parents = new Map<number, number>();
      let single = true;
      for (const n of sc.nodes) for (const c of n.children) { if (parents.has(c)) single = false; parents.set(c, n.id); }
      ok(`${where}: trie is a tree (one parent each, root has none)`, single && !parents.has(sc.root));
      ok(`${where}: trie edge chars set (1 letter, or a longer label for compressed tries)`, sc.nodes.every((n: any) => n.id === sc.root || (typeof n.char === 'string' && n.char.length >= 1 && n.char.length <= 12)));
      ok(`${where}: trie links endpoints exist`, (sc.links ?? []).every((l: any) => ids.has(l.from) && ids.has(l.to)));
      ok(`${where}: trie path ids valid`, (sc.path ?? []).every((i: any) => ids.has(i)));
      break;
    }
    case 'ntree': {
      const ids = new Set(sc.nodes.map((n: any) => n.id));
      ok(`${where}: ntree has 1..40 nodes`, sc.nodes.length >= 1 && sc.nodes.length <= 40, String(sc.nodes.length));
      ok(`${where}: ntree ids unique`, ids.size === sc.nodes.length);
      ok(`${where}: ntree root exists`, ids.has(sc.root));
      ok(`${where}: ntree children exist, no self child`, sc.nodes.every((n: any) => n.children.every((c: any) => ids.has(c) && c !== n.id)));
      const fixed = sc.nodes.every((n: any) => typeof n.x === 'number' && typeof n.y === 'number');
      const parents = new Map<number, number>();
      let single = true;
      for (const n of sc.nodes) for (const c of n.children) { if (parents.has(c)) single = false; parents.set(c, n.id); }
      ok(`${where}: ntree is a tree (one parent each, root has none) unless fixed coordinates are given (DAG)`, (single || fixed) && !parents.has(sc.root));
      // every node is reachable from the root
      const seen = new Set<number>();
      const stack = [sc.root];
      const byId = new Map<number, any>(sc.nodes.map((n: any) => [n.id, n]));
      while (stack.length) { const u = stack.pop()!; if (seen.has(u)) continue; seen.add(u); for (const c of byId.get(u)?.children ?? []) stack.push(c); }
      ok(`${where}: ntree nodes all reachable from the root`, seen.size === sc.nodes.length, `${seen.size}/${sc.nodes.length}`);
      ok(`${where}: ntree fixed coords all-or-none and in 0..1`, sc.nodes.every((n: any) => (n.x === undefined) === (n.y === undefined)) && sc.nodes.every((n: any) => n.x === undefined || (n.x >= 0 && n.x <= 1 && n.y >= 0 && n.y <= 1)));
      ok(`${where}: ntree path is a chain of parent->child edges`, (sc.path ?? []).every((id: any, i: number, a: any[]) => ids.has(id) && (i === 0 || byId.get(a[i - 1]).children.includes(id))));
      ok(`${where}: ntree extraEdges endpoints exist`, (sc.extraEdges ?? []).every((e: any) => ids.has(e.from) && ids.has(e.to)));
      ok(`${where}: ntree shape valid`, sc.shape === undefined || sc.shape === 'circle' || sc.shape === 'box');
      ok(`${where}: ntree pointers in range`, (sc.pointers ?? []).every((q: any) => q.index >= 0 && q.index < sc.nodes.length));
      break;
    }
    case 'plane': {
      const ids = new Set(sc.points.map((p: any) => p.id));
      ok(`${where}: plane has 1..30 points`, sc.points.length >= 1 && sc.points.length <= 30, String(sc.points.length));
      ok(`${where}: plane point ids unique, coordinates finite`, ids.size === sc.points.length && sc.points.every((p: any) => Number.isFinite(p.x) && Number.isFinite(p.y)));
      ok(`${where}: plane segment endpoints exist`, (sc.segments ?? []).every((e: any) => ids.has(e.from) && ids.has(e.to)));
      ok(`${where}: plane segment states valid`, (sc.segments ?? []).every((e: any) => e.state === undefined || ['default', 'active', 'visited', 'chosen', 'dim', 'error'].includes(e.state)));
      ok(`${where}: plane polygon ids exist`, !sc.polygon || sc.polygon.ids.every((i: any) => ids.has(i)));
      ok(`${where}: plane sweep finite`, !sc.sweep || (Number.isFinite(sc.sweep.at) && (sc.sweep.axis === undefined || sc.sweep.axis === 'x' || sc.sweep.axis === 'y')));
      ok(`${where}: plane pointers in range`, (sc.pointers ?? []).every((q: any) => q.index >= 0 && q.index < sc.points.length));
      break;
    }
    case 'split':
      ok(`${where}: split has 2-3 parts, none nested`, Array.isArray(sc.parts) && sc.parts.length >= 2 && sc.parts.length <= 3 && sc.parts.every((p: any) => p && p.kind !== 'split'));
      (sc.parts ?? []).forEach((p: any, i: number) => checkScene({ scene: p }, `${where} part ${i}`, ok));
      break;
    default:
      ok(`${where}: unknown scene kind "${sc.kind}" (extend scripts/check-scenes.mts)`, false);
  }
}
