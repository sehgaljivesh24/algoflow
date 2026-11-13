import { lazy, Suspense } from 'react';

/**
 * "Complete DSA Patterns Reference Guide" (imported from thetorangi/DSA-cheat-sheet, MIT, Copyright (c) 2025 K A R M A).
 * The viewer, its stylesheets and the content fragments are all lazy chunks (see ./patterns-guide/PatternsGuideViewer.tsx):
 * nothing from this feature except this wrapper is part of the main bundle.
 */
const PatternsGuideViewer = lazy(() => import('./patterns-guide/PatternsGuideViewer'));

export function PatternsGuidePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} aria-busy="true" />}>
      <PatternsGuideViewer />
    </Suspense>
  );
}
