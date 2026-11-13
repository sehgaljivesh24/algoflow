/**
 * The reference product uses three different looks, and so do we:
 *  - 'library': the app shell pages (library, patterns roadmap, cheatsheet, edge cases, quiz) — slate + indigo
 *  - 'viz':     a problem animation page — GitHub-dark palette
 *  - 'pattern': a single pattern page — GitHub-dark with a cyan accent
 * App sets `document.body.dataset.surface`; tokens per surface live in src/styles-surfaces.css.
 */
/** 'cheat': an imported cheatsheet viewer (/cheatsheets/pattern-index, patterns-guide, the-only[/slug]); each viewer carries its own palette. */
export type Surface = 'library' | 'viz' | 'pattern' | 'cheat';

export function surfaceFor(pathname: string): Surface {
  if (pathname.startsWith('/problem/')) return 'viz';
  if (/^\/patterns\/[^/]+/.test(pathname)) return 'pattern';
  if (/^\/cheatsheets\/(pattern-index|patterns-guide|the-only)(\/|$)/.test(pathname)) return 'cheat';
  return 'library';
}
