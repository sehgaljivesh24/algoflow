/**
 * Absolute site URL handling (no browser or Vite APIs, so Node scripts, the Vite plugin and the app can all use it).
 *
 * The URL the site is served from is needed for canonical links, og:url / og:image and sitemap.xml.
 * Set it in the host's environment (Vercel: Project Settings -> Environment Variables -> SITE_URL = https://your-domain.com).
 */

/** Used when nothing is configured. Easy to grep for and replace; the build prints a warning while it is in use. */
export const PLACEHOLDER_SITE_URL = 'https://algoflow.example';

/** "algoflow.vercel.app" -> "https://algoflow.vercel.app"; strips trailing slashes. Returns undefined for empty / invalid input. */
export function normalizeSiteUrl(raw: string | undefined | null): string | undefined {
  const s = (raw ?? '').trim();
  if (!s) return undefined;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return undefined;
  }
}

/** Build-time resolution: SITE_URL, then VITE_SITE_URL, then Vercel's production host, then the placeholder. */
export function resolveSiteUrl(env: Record<string, string | undefined>): string {
  return (
    normalizeSiteUrl(env.SITE_URL) ??
    normalizeSiteUrl(env.VITE_SITE_URL) ??
    normalizeSiteUrl(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    PLACEHOLDER_SITE_URL
  );
}
