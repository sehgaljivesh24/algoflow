import { PLACEHOLDER_SITE_URL, normalizeSiteUrl } from './seo/siteUrl.ts';

/** Single place to rebrand the app. */
export const BRAND = 'AlgoFlow';
export const TAGLINE = 'Watch algorithms run, step by step.';

/**
 * Absolute URL the site is served from (canonical links, og:url / og:image, sitemap).
 * vite.config.ts resolves SITE_URL / VITE_SITE_URL / VERCEL_PROJECT_PRODUCTION_URL at build time and exposes it as
 * VITE_SITE_URL; without any of them this is a placeholder (see src/seo/siteUrl.ts). `?.` keeps Node scripts importing this file safe.
 */
export const SITE_URL: string = normalizeSiteUrl(import.meta.env?.VITE_SITE_URL) ?? PLACEHOLDER_SITE_URL;
