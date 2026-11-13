import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
