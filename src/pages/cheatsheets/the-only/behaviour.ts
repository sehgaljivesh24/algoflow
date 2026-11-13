import { useEffect, useLayoutEffect, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Finds an element by id inside `root` only (a document-wide lookup could hit the app's own ids such as #root). */
function findId(root: HTMLElement, id: string): HTMLElement | null {
  for (const el of root.querySelectorAll<HTMLElement>('[id]')) if (el.id === id) return el;
  return null;
}

/**
 * Behaviour for an imported HTML fragment:
 *  - `#hash` links and `location.hash` scroll to the heading (BrowserRouter: hashes are handled here)
 *  - links to other cheatsheet routes use the router instead of reloading the page
 *  - a "Copy" button on every code block
 * `html` changes whenever new content is injected.
 */
export function useFragmentBehaviour(rootRef: RefObject<HTMLElement>, html: string | null) {
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();

  // copy buttons (injected once per fragment)
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !html) return;
    root.querySelectorAll<HTMLElement>('div.highlighter-rouge').forEach((block) => {
      if (block.querySelector(':scope > .cs-copy')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cs-copy';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      block.appendChild(btn);
    });
  }, [rootRef, html]);

  // scroll to the hash (on arrival and on hash change) or to the top for a new page
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !html) return;
    const id = decode(hash.replace(/^#/, ''));
    const target = id ? findId(root, id) : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else if (!id) window.scrollTo(0, 0);
  }, [rootRef, html, hash, pathname]);

  // delegated clicks
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const copy = el.closest<HTMLButtonElement>('button.cs-copy');
      if (copy) {
        const code = copy.parentElement?.querySelector('pre')?.textContent ?? '';
        const done = () => {
          copy.textContent = 'Copied';
          copy.classList.add('done');
          window.setTimeout(() => {
            copy.textContent = 'Copy';
            copy.classList.remove('done');
          }, 1400);
        };
        const fallback = () => {
          const ta = document.createElement('textarea');
          ta.value = code;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
            done();
          } catch {
            /* clipboard unavailable */
          }
          ta.remove();
        };
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done, fallback);
        else fallback();
        return;
      }
      const a = el.closest<HTMLAnchorElement>('a[href]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href') ?? '';
      if (href.startsWith('#')) {
        e.preventDefault();
        const id = decode(href.slice(1));
        const target = findId(root, id);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (decode(window.location.hash.replace(/^#/, '')) !== id) navigate({ hash: href }, { replace: false });
      } else if (href.startsWith('/cheatsheets/') && a.target !== '_blank') {
        e.preventDefault();
        navigate(href);
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [rootRef, navigate]);
}
