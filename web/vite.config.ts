import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@xterm')) return 'xterm';
          if (id.includes('node_modules/@codemirror') || id.includes('node_modules/codemirror')) return 'codemirror';
          if (id.includes('node_modules/isomorphic-git') || id.includes('node_modules/@isomorphic-git')) return 'git';
          return undefined;
        }
      }
    }
  }
});
