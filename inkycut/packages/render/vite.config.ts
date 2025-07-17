import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import pkg from './package.json' assert { type: 'json' };

function getAllTsFiles(dir: string): Record<string, string> {
  const entries: Record<string, string> = {};
  
  function scanDir(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (item.endsWith('.ts')) {
        const relativePath = fullPath.replace(dir + '/', '');
        const name = relativePath.replace(/\.ts$/, '');
        entries[name] = fullPath;
      }
    }
  }
  
  scanDir(dir);
  return entries;
}

const entries = getAllTsFiles(resolve(__dirname, 'src'));

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'fs',
  'fs/promises',
  'path',
  'url',
  'os',
  'util',
  'crypto',
  'events',
  'stream',
  'buffer',
  'child_process'
];

export default defineConfig({
  build: {
    lib: {
      entry: entries,
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: {
      external: (id) => external.some(dep => id === dep || id.startsWith(dep + '/'))
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