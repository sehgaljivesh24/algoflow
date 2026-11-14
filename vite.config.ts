import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveSiteUrl } from './src/seo/siteUrl.ts';
import { seoPlugin } from './scripts/vite-seo-plugin.mts';

// Absolute site URL for canonical links / og tags / sitemap: SITE_URL, VITE_SITE_URL or Vercel's production host (src/seo/siteUrl.ts).
// Exported to the browser bundle as import.meta.env.VITE_SITE_URL (read in src/config.ts).
const SITE_URL = resolveSiteUrl(process.env);
process.env.VITE_SITE_URL = SITE_URL;

export default defineConfig({
  plugins: [react(), seoPlugin({ siteUrl: SITE_URL })],
  build: {
    rollupOptions: {
      output: {
        // keep the framework in its own long-cached chunk; problem animations are lazy chunks (src/problems/manifest.ts)
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|@remix-run|scheduler)[\\/]/.test(id)) return 'vendor';
        },
      },
    },
  },
});
