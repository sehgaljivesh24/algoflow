import { useState } from 'react';
import type { Aux } from '../../engine/types';

function splitEntry(item: string): [string, string] | null {
  for (const sep of [' → ', '→', ' -> ', ': ', '=']) {
    const at = item.indexOf(sep);
    if (at > 0) return [item.slice(0, at).trim(), item.slice(at + sep.length).trim()];
  }
  return null;
}

const NONE: Aux[] = [];

/** Indexes of items that are new since the previous picture, per panel title (derived state: computed once per new `aux`). */
function useAdded(aux: Aux[]) {
  const [memo, setMemo] = useState<{ aux: Aux[]; added: Map<string, number> }>({ aux, added: new Map() });
  if (memo.aux === aux) return memo.added;
  const before = new Map(memo.aux.map((a) => [a.title, a.items.length] as const));
  const added = new Map<string, number>();
  aux.forEach((a) => {
    const was = before.get(a.title);
    // first index that is new; panels that did not grow have none
    if (was !== undefined && a.items.length > was) added.set(a.title, was);
  });
  setMemo({ aux, added });
  return added;
}

/**
 * Side panels next to the picture: stack (vertical column, top = last item), queue, hash map (key → value entries) and plain list.
 * `tone` is the step's logic tone: on a "success" step the highlighted hash-map entry reads as a hit (green), otherwise as the entry being searched (yellow).
 */
export function AuxPanels({ aux, tone }: { aux?: Aux[]; tone?: 'info' | 'warn' | 'success' }) {
  const added = useAdded(aux ?? NONE);
  if (!aux?.length) return null;
  return (
    <div className="aux-row">
      {aux.map((a) => {
        const firstNew = added.get(a.title) ?? Infinity;
        return (
          <div key={a.title} className={`aux-card aux-${a.kind}`}>
            <div className="aux-head">
              <span className={a.kind === 'map' ? 'aux-title map' : 'aux-title'}>{a.title}</span>
              {a.kind === 'map' && <span className="aux-count">{a.items.length} {a.items.length === 1 ? 'entry' : 'entries'}</span>}
            </div>
            {a.kind === 'stack' ? (
              a.items.length === 0 ? (
                <div className="stk-empty">empty stack</div>
              ) : (
                <div className="stk-col" role="list" aria-label={`${a.title}, top last`}>
                  <div className="stk-base" aria-hidden>bottom</div>
                  {a.items.map((it, i) => {
                    const top = i === a.items.length - 1;
                    return (
                      <div
                        key={i}
                        role="listitem"
                        className={`stk-item${top ? ' top' : ''}${a.highlight === i ? ' hl' : ''}${i >= firstNew ? ' pushed' : ''}`}
                      >
                        {it}
                      </div>
                    );
                  })}
                </div>
              )
            ) : a.kind === 'map' ? (
              a.items.length === 0 ? (
                <div className="hm-empty">no entries yet</div>
              ) : (
                <div className="hm-grid">
                  {a.items.map((it, i) => {
                    const kv = splitEntry(it);
                    const state = a.highlight === i ? (tone === 'success' ? 'hit' : 'srch') : i >= firstNew ? 'added' : '';
                    return (
                      <div key={i} className={`hm-entry ${state}`}>
                        {kv ? (
                          <>
                            <span className="hm-key">{kv[0]}</span>
                            <span className="hm-arr">→</span>
                            <span className="hm-val">{kv[1]}</span>
                          </>
                        ) : (
                          <span className="hm-key">{it}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : a.items.length === 0 ? (
              <div className="hm-empty">empty</div>
            ) : (
              <div className={`aux-chips ${a.kind}`}>
                {a.kind === 'queue' && <span className="aux-end">front</span>}
                {a.items.map((it, i) => (
                  <span key={i} className={`aux-chip${a.highlight === i ? ' hl' : ''}${i >= firstNew ? ' pushed' : ''}`}>{it}</span>
                ))}
                {a.kind === 'queue' && <span className="aux-end">back</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
