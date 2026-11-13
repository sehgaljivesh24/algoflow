import { lazy, Suspense } from 'react';

/**
 * "DSA Pattern Index" (imported from roxoi/dsa-cheatsheet, MIT). The viewer, its stylesheet and the content are
 * all lazy chunks: nothing from this feature is part of the main bundle.
 */
const PatternIndexViewer = lazy(() => import('./pattern-index/PatternIndexViewer'));

export function PatternIndexPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#030303' }} aria-busy="true" />}>
      <PatternIndexViewer />
    </Suspense>
  );
}
