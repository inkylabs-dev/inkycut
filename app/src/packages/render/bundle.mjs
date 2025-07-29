import {bundle} from '@remotion/bundler';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
 
const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, './entry.tsx'),
    publicPath: '/',
    publicDir: '',
    outDir: path.resolve(__dirname, './bundle'),
    // If you have a webpack override in remotion.config.ts, pass it here as well.
    webpackOverride: (config) => config,
});

console.log('Bundle created at:', bundleLocation);
