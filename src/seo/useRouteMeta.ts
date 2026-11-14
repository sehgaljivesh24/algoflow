import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND, SITE_URL } from '../config.ts';
import { hasPatternText, loadPatternText, peekPatternText } from '../data/patternText/load.ts';
import { loadProblem } from '../problems/lazy.ts';
import { metaFor } from './meta.ts';
import type { RouteMeta } from './meta.ts';
import { PLACEHOLDER_SITE_URL } from './siteUrl.ts';

/** Absolute base for canonical / og:url / og:image. While SITE_URL is still the placeholder, use the real origin (dev, previews). */
function baseUrl(): string {
  if (SITE_URL === PLACEHOLDER_SITE_URL && typeof window !== 'undefined') return window.location.origin;
  return SITE_URL;
}

function tag(selector: string, create: () => HTMLElement): HTMLElement {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  return el;
}

function setMeta(attr: 'name' | 'property', key: string, content: string | null) {
  const selector = `meta[${attr}="${key}"]`;
  if (content === null) {
    document.head.querySelector(selector)?.remove();
    return;
  }
  const el = tag(selector, () => {
    const m = document.createElement('meta');
    m.setAttribute(attr, key);
    return m;
  });
  el.setAttribute('content', content);
}

function setCanonical(href: string | null) {
  if (href === null) {
    document.head.querySelector('link[rel="canonical"]')?.remove();
    return;
  }
  tag('link[rel="canonical"]', () => {
    const l = document.createElement('link');
    l.setAttribute('rel', 'canonical');
    return l;
  }).setAttribute('href', href);
}

/** Writes title, description, canonical, Open Graph and Twitter tags for a route into <head> (creating missing tags). */
export function applyRouteMeta(m: RouteMeta) {
  const base = baseUrl();
  const url = `${base}${m.canonical === '/' ? '/' : m.canonical}`;
  const image = `${base}${m.image}`;
  document.title = m.title;
  setMeta('name', 'description', m.description);
  setMeta('name', 'robots', m.noindex ? 'noindex, follow' : null);
  // unknown routes are not canonical anywhere
  setCanonical(m.noindex ? null : url);
  setMeta('property', 'og:site_name', BRAND);
  setMeta('property', 'og:type', m.ogType);
  setMeta('property', 'og:title', m.title);
  setMeta('property', 'og:description', m.description);
  setMeta('property', 'og:url', m.noindex ? null : url);
  setMeta('property', 'og:image', image);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', m.title);
  setMeta('name', 'twitter:description', m.description);
  setMeta('name', 'twitter:image', image);
}

/** True when <head> already carries the canonical link of this path (the static per-route HTML, or an earlier apply). */
function headIsFor(canonical: string): boolean {
  const href = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (!href) return false;
  try { return new URL(href, window.location.href).pathname === canonical; } catch { return false; }
}

/**
 * Keeps the document metadata in sync with the route. Mount it ONCE (src/App.tsx).
 * Problem pages first get a catalog-based description, then the animation's own statement once its chunk is loaded
 * (ProblemPage loads the same chunk, so this costs no extra request).
 * Pattern pages work the same way with the hero description of the pattern text (ProblemPage's twin PatternPage loads
 * the same chunks). The title never depends on that text, and when the static HTML already carries this route's tags the
 * hook leaves them alone until the text is in, so a description is never downgraded to the card-only fallback and back.
 */
export function useRouteMeta() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    let live = true;
    const decoded = (raw: string) => {
      try { return decodeURIComponent(raw); } catch { return raw; }
    };
    const problemRaw = /^\/problem\/([^/]+)\/?$/.exec(pathname)?.[1];
    const patternRaw = /^\/patterns\/([^/]+)\/?$/.exec(pathname)?.[1];
    const patternSlug = patternRaw ? decoded(patternRaw) : undefined;
    const fallback = metaFor(pathname, search);

    const have = patternSlug ? peekPatternText(patternSlug) : undefined;
    if (have) {
      applyRouteMeta(metaFor(pathname, search, { heroOf: () => have.meta?.desc }));
    } else if (patternSlug && hasPatternText(patternSlug)) {
      if (!headIsFor(fallback.canonical)) applyRouteMeta(fallback);
      loadPatternText(patternSlug)
        .then((t) => {
          if (live) applyRouteMeta(metaFor(pathname, search, { heroOf: () => t.meta?.desc }));
        })
        .catch(() => {
          if (live) applyRouteMeta(fallback);
        });
    } else {
      applyRouteMeta(fallback);
    }

    if (problemRaw) {
      loadProblem(decoded(problemRaw))
        .then((def) => {
          if (live) applyRouteMeta(metaFor(pathname, search, { statementOf: () => def.statement }));
        })
        .catch(() => undefined);
    }
    return () => {
      live = false;
    };
  }, [pathname, search]);
}
