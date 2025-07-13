import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
 
// The composition you want to render
const compositionId = 'VideoComposition';
 
// You only have to create a bundle once, and you may reuse it
// for multiple renders that you can parametrize using input props.
const onProgress = (progress) => {
  console.log(`Webpack bundling progress: ${progress}%`);
};
const bundleLocation = await bundle({
  entryPoint: path.resolve(__dirname, '../components/remotionEntrypoint.tsx'),
  onProgress: onProgress,
  publicPath: '/',
  publicDir: '',
  outDir: '/tmp/remotion-bundle/',
  // If you have a webpack override in remotion.config.ts, pass it here as well.
  webpackOverride: (config) => config,
});

console.log('Bundle created at:', bundleLocation);

// Delete the public directory if it exists
try {
  const publicDirPath = path.join('/tmp/remotion-bundle/', 'public');
  
  // Check if public directory exists before attempting deletion
  await fs.stat(publicDirPath).then(async () => {
    // Directory exists, recursively remove it
    await fs.rm(publicDirPath, { recursive: true, force: true });
    console.log('Successfully deleted public directory');
  }).catch((err) => {
    if (err.code === 'ENOENT') {
      console.log('Public directory does not exist, skipping deletion');
    } else {
      console.error('Error checking public directory:', err);
    }
  });
} catch (error) {
  console.error('Error during cleanup:', error);
}

// Copy the bundle directory to the public folder
try {
  const sourcePath = '/tmp/remotion-bundle/';
  const targetPath = path.resolve(__dirname, '../../../public/remotion-bundle/');
  
  // Ensure parent directory exists
  await fs.mkdir(path.dirname(targetPath), { recursive: true }).catch(() => {});
  
  // Explicitly delete the public/remotion-bundle directory if it exists
  console.log(`Removing existing directory at ${targetPath}...`);
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
    console.log(`Successfully removed existing directory at ${targetPath}`);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`Directory ${targetPath} does not exist, no need to delete`);
    } else {
      console.error(`Error removing directory ${targetPath}:`, err);
    }
  }
  
  // Copy the directory
  console.log(`Copying bundle from ${sourcePath} to ${targetPath}...`);
  
  // Create the target directory
  await fs.mkdir(targetPath, { recursive: true });
  
  // Read all files from source directory
  const files = await fs.readdir(sourcePath, { withFileTypes: true });
  
  // Copy each file/directory
  for (const file of files) {
    const srcPath = path.join(sourcePath, file.name);
    const destPath = path.join(targetPath, file.name);
    
    if (file.isDirectory()) {
      // Use recursive function to copy directories
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
  
  console.log('Bundle successfully copied to public folder');
} catch (error) {
  console.error('Error copying bundle to public folder:', error);
}

// Helper function to recursively copy directories
async function copyDir(src, dest) {
  // Create destination directory
  await fs.mkdir(dest, { recursive: true });
  
  // Read all files from source directory
  const files = await fs.readdir(src, { withFileTypes: true });
  
  // Copy each file/directory
  for (const file of files) {
    const srcPath = path.join(src, file.name);
    const destPath = path.join(dest, file.name);
    
    if (file.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}
