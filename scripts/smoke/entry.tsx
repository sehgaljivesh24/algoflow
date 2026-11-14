/**
 * Server-side entry for scripts/smoke-ssr.mts. Loaded through Vite's ssrLoadModule, so TSX, CSS imports,
 * `?raw` imports and `import.meta.glob` behave exactly like the real build. Not part of the app bundle.
 *
 * It wraps <App/> in the same providers as src/main.tsx (StrictMode + a router; StaticRouter instead of
 * BrowserRouter because there is no window) and exposes the project data the smoke test enumerates.
 */
import { StrictMode } from 'react';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Writable } from 'node:stream';
import App from '../../src/App';
import { ALL_ENTRIES } from '../../src/data/catalog';
import { ALL_PATTERNS, CONTENT, examplesFor } from '../../src/data/patterns';
import { loadProblem, isAnimated } from '../../src/problems/lazy';
import { MANIFEST } from '../../src/problems/manifest';
import { flatGuides, loadMeta } from '../../src/pages/cheatsheets/the-only/content';

export { ALL_ENTRIES, ALL_PATTERNS, CONTENT, examplesFor, loadProblem, isAnimated, MANIFEST };

export async function theOnlySlugs(): Promise<string[]> {
  return flatGuides(await loadMeta()).map((g) => g.slug);
}

const tree = (url: string) => (
  <StrictMode>
    <StaticRouter location={url}>
      <App />
    </StaticRouter>
  </StrictMode>
);

/** Synchronous render: use for everything that does not suspend (all problem and pattern pages). */
export function renderRoute(url: string): string {
  return renderToString(tree(url));
}

/** Streaming render that waits for every Suspense boundary (the lazily loaded cheatsheet viewers). */
export function renderRouteAsync(url: string): Promise<{ html: string; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const errors: string[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk.toString());
        cb();
      },
      final(cb) {
        resolve({ html: chunks.join(''), errors });
        cb();
      },
    });
    const stream = renderToPipeableStream(tree(url), {
      onAllReady() {
        stream.pipe(sink);
      },
      onShellError: reject,
      onError(e) {
        errors.push(e instanceof Error ? e.message : String(e));
      },
    });
  });
}
