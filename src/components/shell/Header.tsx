import { Link } from 'react-router-dom';
import { BRAND } from '../../config';
import { ALL_ENTRIES } from '../../data/catalog';
import { useTheme } from '../../data/storage';

const count = (d: string) => ALL_ENTRIES.filter((e) => e.difficulty === d).length;
const STATS = [
  { label: 'Total', n: ALL_ENTRIES.length, cls: 'total' },
  { label: 'Easy', n: count('Easy'), cls: 'easy' },
  { label: 'Medium', n: count('Medium'), cls: 'medium' },
  { label: 'Hard', n: count('Hard'), cls: 'hard' },
];

export function Header({ menuOpen, onMenu }: { menuOpen: boolean; onMenu: () => void }) {
  const [theme, toggleTheme] = useTheme();
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button" className="menu-btn" onClick={onMenu}
          aria-label="Menu" aria-expanded={menuOpen} aria-controls="shell-sidebar"
        >
          <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
        </button>
        <h1 className="brand"><Link to="/"><span aria-hidden>🧠</span> {BRAND}</Link></h1>
      </div>
      <div className="header-stats" aria-label="Library totals">
        {STATS.map((s, i) => (
          <span key={s.label} className="hs">
            {i > 0 && <span className="hs-sep" aria-hidden>|</span>}
            <span className="hs-label">{s.label}:</span> <b className={`hs-num ${s.cls}`}>{s.n}</b>
          </span>
        ))}
      </div>
      <div className="header-right">
        <button type="button" className="theme-toggle-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          <span aria-hidden>{theme === 'dark' ? '🌞' : '🌙'}</span> {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}
