/**
 * Build-time SEO for the static deploy (imported by vite.config.ts; runs for `vite build` only).
 *
 * The app is a single-page app, so every URL would otherwise answer with the same index.html (same <title>, no description).
 * After the bundle is written this plugin takes the built dist/index.html and, for every route in src/seo/meta.ts, writes
 *   dist/<route>/index.html   - identical page (same hashed /assets/... files, the SPA boots and renders as usual)
 *                               with that route's <title>, description, canonical and Open Graph / Twitter tags in <head>
 *   dist/sitemap.xml          - all indexable routes, lastmod = build date
 *   dist/robots.txt           - allow all + sitemap link
 * Static hosts (Vercel, Netlify, Cloudflare Pages) serve existing files before applying the "everything -> /index.html"
 * rewrite, so /patterns/kadane returns its own tags while unknown paths still get the app (and its client-side 404 page).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { PLACEHOLDER_SITE_URL } from '../src/seo/siteUrl.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Meta {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  image: string;
  noindex?: boolean;
}

/** The <head> tags of one route. */
export function headBlock(m: Meta, site: string, brand: string, jsonLd?: object): string {
  const url = `${site}${m.canonical}`;
  const image = `${site}${m.image}`;
  const lines = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    ...(m.noindex ? ['<meta name="robots" content="noindex, follow" />'] : [`<link rel="canonical" href="${esc(url)}" />`]),
    `<meta property="og:site_name" content="${esc(brand)}" />`,
    `<meta property="og:type" content="${esc(m.ogType)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    ...(m.noindex ? [] : [`<meta property="og:url" content="${esc(url)}" />`]),
    `<meta property="og:image" content="${esc(image)}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ];
  if (jsonLd) lines.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`);
  return lines.map((l) => `    ${l}`).join('\n');
}

/** Removes the tags headBlock() writes (so the source index.html may carry defaults) and inserts a fresh block after the viewport meta. */
export function withHead(html: string, block: string): string {
  const stripped = html
    .replace(/[ \t]*<!--[\s\S]*?Default head tags[\s\S]*?-->[ \t]*\r?\n?/gi, '') // the explanatory comment in index.html
    .replace(/[ \t]*<title>[\s\S]*?<\/title>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<meta\s[^>]*?(?:name|property)\s*=\s*["'](?:description|robots|og:[^"']*|twitter:[^"']*)["'][^>]*>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<link\s[^>]*?rel\s*=\s*["']canonical["'][^>]*>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>[ \t]*\r?\n?/gi, '');
  const viewport = /<meta\s+name=["']viewport["'][^>]*>/i;
  if (viewport.test(stripped)) return stripped.replace(viewport, (m) => `${m}\n${block}`);
  return stripped.replace(/<head[^>]*>/i, (m) => `${m}\n${block}`);
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function seoPlugin(options: { siteUrl: string }) {
  const site = options.siteUrl.replace(/\/+$/, '');
  let outDir = '';
  return {
    name: 'algoflow-seo',
    apply: 'build' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const indexPath = join(outDir, 'index.html');
      if (!outDir || !existsSync(indexPath)) return; // failed / partial build
      const { metaFor, allRoutes } = await import('../src/seo/meta.ts');
      const { ALL_PROBLEMS } = await import('../src/problems/registry.ts');
      const { BRAND } = await import('../src/config.ts');

      const statements = new Map<string, string>(ALL_PROBLEMS.map((p: { slug: string; statement: string }) => [p.slug, p.statement]));
      const statementOf = (slug: string) => statements.get(slug);

      const base = readFileSync(indexPath, 'utf8');
      const jsonLd = (m: Meta) => ({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: BRAND,
        url: `${site}/`,
        description: m.description,
        inLanguage: 'en',
      });

      const routes: string[] = allRoutes();
      let written = 0;
      for (const route of routes) {
        const m: Meta = metaFor(route, '', { statementOf });
        const html = withHead(base, headBlock(m, site, BRAND, route === '/' ? jsonLd(m) : undefined));
        const file = route === '/' ? indexPath : join(outDir, ...route.split('/').filter(Boolean), 'index.html');
        if (relative(outDir, file).startsWith('..')) throw new Error(`[seo] refusing to write outside dist: ${route}`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, html);
        written++;
      }

      const lastmod = new Date().toISOString().slice(0, 10);
      const urls = routes.filter((r) => !metaFor(r, '', { statementOf }).noindex);
      const sitemap =
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls
          .map((r) => `  <url><loc>${xml(site + (r === '/' ? '/' : r))}</loc><lastmod>${lastmod}</lastmod></url>`)
          .join('\n') +
        '\n</urlset>\n';
      writeFileSync(join(outDir, 'sitemap.xml'), sitemap);
      writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);

      console.log(`[seo] ${written} pages with their own head tags, sitemap.xml (${urls.length} urls), robots.txt; site URL ${site}`);
      if (site === PLACEHOLDER_SITE_URL) {
        console.warn(
          `[seo] WARNING: SITE_URL is not set, canonical / og:url / og:image / sitemap use the placeholder ${PLACEHOLDER_SITE_URL}.\n` +
            '      Set SITE_URL=https://your-domain (Vercel: Project Settings -> Environment Variables) and rebuild.',
        );
      }
    },
  };
}
