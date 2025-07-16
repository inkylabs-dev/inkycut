import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
        render: resolve(__dirname, 'src/render.ts'),
        legacy: resolve(__dirname, 'src/legacy.ts')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: [
        '@remotion/cli',
        '@remotion/renderer', 
        'chalk',
        'commander',
        'node-fetch',
        'fs',
        'fs/promises',
        'path',
        'url',
        'os',
        'util'
      ]
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node18',
    ssr: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});