import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Shell } from './components/shell/Shell';
import { Cheatsheet } from './pages/Cheatsheet';
import { CheatsheetsHub } from './pages/cheatsheets/CheatsheetsHub';
import { CreditsPage } from './pages/cheatsheets/CreditsPage';
import { PatternIndexPage } from './pages/cheatsheets/PatternIndexPage';
import { PatternsGuidePage } from './pages/cheatsheets/PatternsGuidePage';
import { TheOnlyIndexPage } from './pages/cheatsheets/TheOnlyIndexPage';
import { TheOnlyPage } from './pages/cheatsheets/TheOnlyPage';
import { EdgeCases } from './pages/EdgeCases';
import { Library } from './pages/Library';
import { PatternsIndex } from './pages/PatternsIndex';
import { PatternPage } from './pages/PatternPages';
import { ProblemPage } from './pages/ProblemPage';
import { Quiz } from './pages/Quiz';
import { surfaceFor } from './surface';

export default function App() {
  const { pathname } = useLocation();
  const surface = surfaceFor(pathname);

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
        <Route path="/patterns" element={<PatternsIndex />} />
        <Route path="/cheatsheet" element={<Cheatsheet />} />
        <Route path="/cheatsheets" element={<CheatsheetsHub />} />
        <Route path="/cheatsheets/credits" element={<CreditsPage />} />
        <Route path="/edge-cases" element={<EdgeCases />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="*" element={<main className="page narrow"><h1>Page not found</h1><Link to="/">Back to library</Link></main>} />
      </Route>
    </Routes>
  );
}
