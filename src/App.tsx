import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/shell/Shell';
import { CheatsheetsHub } from './pages/cheatsheets/CheatsheetsHub';
import { CreditsPage } from './pages/cheatsheets/CreditsPage';
import { PatternIndexPage } from './pages/cheatsheets/PatternIndexPage';
import { PatternsGuidePage } from './pages/cheatsheets/PatternsGuidePage';
import { TheOnlyIndexPage } from './pages/cheatsheets/TheOnlyIndexPage';
import { TheOnlyPage } from './pages/cheatsheets/TheOnlyPage';
import { Library } from './pages/Library';
import { PatternPage } from './pages/PatternPages';
import { ProblemPage } from './pages/ProblemPage';
import { useRouteMeta } from './seo/useRouteMeta';
import { surfaceFor } from './surface';

// Pages that are not part of the first load: each is a separate chunk together with the data only it reads
// (quiz bank 120 kB, Java cheatsheet 63 kB, edge cases 51 kB, pattern roadmap digest 62 kB). The home page, the problem
// page and the pattern page (whose text loads lazily itself, see src/data/patternText) stay eager.
const PatternsIndex = lazy(() => import('./pages/PatternsIndex').then((m) => ({ default: m.PatternsIndex })));
const Cheatsheet = lazy(() => import('./pages/Cheatsheet').then((m) => ({ default: m.Cheatsheet })));
const EdgeCases = lazy(() => import('./pages/EdgeCases').then((m) => ({ default: m.EdgeCases })));
const Quiz = lazy(() => import('./pages/Quiz').then((m) => ({ default: m.Quiz })));

/** Shown inside the shell while a lazy page's chunk is on its way (the header and sidebar are already there). */
const later = (page: ReactNode) => (
  <Suspense fallback={<main className="page narrow" aria-busy="true"><p className="muted" role="status">Loading…</p></main>}>{page}</Suspense>
);

export default function App() {
  const { pathname } = useLocation();
  const surface = surfaceFor(pathname);
  useRouteMeta(); // title / description / canonical / og tags per route (src/seo/meta.ts)

  // The page type decides the colour palette (src/styles-surfaces.css).
  useEffect(() => {
    document.body.dataset.surface = surface;
  }, [surface]);

  return (
    <Routes>
      {/* Animation and pattern detail pages are standalone: they draw their own header, like the reference. */}
      <Route path="/problem/:slug" element={<ProblemPage />} />
      <Route path="/patterns/:slug" element={<PatternPage />} />
      {/* Imported cheatsheet viewers are standalone too: each keeps the look of its source. */}
      <Route path="/cheatsheets/pattern-index" element={<PatternIndexPage />} />
      <Route path="/cheatsheets/patterns-guide" element={<PatternsGuidePage />} />
      <Route path="/cheatsheets/the-only" element={<TheOnlyIndexPage />} />
      <Route path="/cheatsheets/the-only/:slug" element={<TheOnlyPage />} />
      {/* Everything else lives in the shell (header + sidebar + content). */}
      <Route element={<Shell />}>
        <Route path="/" element={<Library />} />
        <Route path="/patterns" element={later(<PatternsIndex />)} />
        <Route path="/cheatsheet" element={later(<Cheatsheet />)} />
        <Route path="/cheatsheets" element={<CheatsheetsHub />} />
        <Route path="/cheatsheets/credits" element={<CreditsPage />} />
        <Route path="/edge-cases" element={later(<EdgeCases />)} />
        <Route path="/quiz" element={later(<Quiz />)} />
        <Route path="*" element={<main className="page narrow"><h1>Page not found</h1><Link to="/">Back to library</Link></main>} />
      </Route>
    </Routes>
  );
}
