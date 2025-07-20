import {bundle} from '@remotion/bundler';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
 
// You only have to create a bundle once, and you may reuse it
// for multiple renders that you can parametrize using input props.
const onProgress = (progress) => {
  console.log(`Webpack bundling progress: ${progress}%`);
};
const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, './entry.tsx'),
    onProgress: onProgress,
    publicPath: '/',
    publicDir: '',
    outDir: path.resolve(__dirname, '../dist/bundle'),
    // If you have a webpack override in remotion.config.ts, pass it here as well.
    webpackOverride: (config) => config,
});

console.log('Bundle created at:', bundleLocation);