import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BRAND, SITE_URL } from '../config.ts';
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

/**
 * Keeps the document metadata in sync with the route. Mount it ONCE (src/App.tsx).
 * Problem pages first get a catalog-based description, then the animation's own statement once its chunk is loaded
 * (ProblemPage loads the same chunk, so this costs no extra request).
 */
export function useRouteMeta() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    let live = true;
    applyRouteMeta(metaFor(pathname, search));
    const raw = /^\/problem\/([^/]+)\/?$/.exec(pathname)?.[1];
    if (raw) {
      let slug = raw;
      try { slug = decodeURIComponent(raw); } catch { /* keep raw */ }
      loadProblem(slug)
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
