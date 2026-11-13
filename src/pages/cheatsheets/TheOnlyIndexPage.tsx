/** Landing page of "The Only Cheatsheets" (imported from malharchauhan7/the-only-cheatsheets, MIT). The heavy part is lazy: CSS, content and behaviour load as their own chunk. */
import { Suspense, lazy } from 'react';

const Landing = lazy(() => import('./the-only/LandingPage.tsx'));

export function TheOnlyIndexPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fafafa' }} />}>
      <Landing />
    </Suspense>
  );
}
