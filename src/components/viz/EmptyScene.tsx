/** Placeholder for a scene that has nothing to draw yet (an empty list, tree, array or grid), so the card never looks blank. */
export function EmptyScene({ what, hint }: { what: string; hint?: string }) {
  return (
    <div className="viz-empty" role="img" aria-label={`Empty ${what}`}>
      <span className="viz-empty-box" aria-hidden>∅</span>
      <span className="viz-empty-txt">
        <b>empty {what}</b>
        {hint && <span>{hint}</span>}
      </span>
    </div>
  );
}
