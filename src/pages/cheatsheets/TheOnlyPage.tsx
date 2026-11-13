/** One guide of "The Only Cheatsheets" (route /cheatsheets/the-only/:slug). Lazy: the viewer, its CSS and each guide's HTML are separate chunks. */
import { Suspense, lazy } from 'react';

const Guide = lazy(() => import('./the-only/GuidePage.tsx'));

export function TheOnlyPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fafafa' }} />}>
      <Guide />
    </Suspense>
  );
}
