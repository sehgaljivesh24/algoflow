import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BRAND } from '../../config';
import { Header } from './Header';
import { useStoredFlag } from './localState';
import { Sidebar } from './Sidebar';

/**
 * Layout for the library-surface pages: sticky header, dismissible banner, sidebar, content.
 * The animation and pattern detail pages are standalone and never render inside this.
 */
export function Shell() {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useStoredFlag('algoflow.banner.dismissed');

  // close the phone drawer on navigation and on Escape
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) setMenuOpen(false);
    lastPath.current = pathname;
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="shell">
      <a className="skip-link" href="#shell-content">Skip to content</a>
      <Header menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} />
      {!bannerDismissed && (
        <div className="free-banner" role="status">
          <span><span aria-hidden>🎉</span> Everything on {BRAND} is <b>free</b>. Your progress is saved in this browser.</span>
          <button type="button" onClick={() => setBannerDismissed(true)} aria-label="Dismiss this message">✕</button>
        </div>
      )}
      <div className="shell-body">
        <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
        {menuOpen && <button type="button" className="shell-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
        <div className="shell-content" id="shell-content" tabIndex={-1}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
