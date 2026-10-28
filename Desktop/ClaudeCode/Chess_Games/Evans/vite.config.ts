import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // keep the canon data and the libraries in their own cacheable chunks
        manualChunks(id: string) {
          if (id.includes('evans_canon_app.json')) return 'canon';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  // .backup-*: dated copies of files from before a big change; never run them as tests
  test: { environment: 'node', exclude: [...configDefaults.exclude, '.backup-*/**'] },
} as any);
