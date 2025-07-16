import fs from 'fs';
import path from 'path';
import os from 'os';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a global path variable to the remotion bundle
let remotionBundlePath: string | null = null;

/**
 * Function to get the path to the Remotion bundle
 * Supports both environment variable override and default path resolution
 */
export async function getRemotionBundle(): Promise<string> {
  if (!remotionBundlePath) {
    // Check if REMOTION_BUNDLE_URI is set in environment
    // In production, this should be set to the URL where the Remotion bundle is hosted
    const bundleUri = process.env.REMOTION_BUNDLE_URI;
    
    if (bundleUri && bundleUri.trim() !== '') {
      // Use the provided URI directly
      remotionBundlePath = bundleUri;
    } else {
      // Use the pre-built bundle from public/remotion-bundle
      // Hack: wasp compiles the web app under .wasp/out/web-app, while this file is in .wasp/out/server
      // This only works on local or if you deploy client/server on the same server.
      remotionBundlePath = path.resolve(__dirname, '../../web-app/public/remotion-bundle');
      
      // Check if the bundle exists
      try {
        const stat = await fs.promises.stat(remotionBundlePath);
        if (!stat.isDirectory()) {
          throw new Error(`Remotion bundle path exists but is not a directory: ${remotionBundlePath}`);
        }
      } catch (error) {
        console.error(`Remotion bundle not found at ${remotionBundlePath}. Error:`, error);
        throw new Error(`Remotion bundle not found. Please ensure the bundle is generated at ${remotionBundlePath}`);
      }
    }
  }
  return remotionBundlePath;
}

/**
 * Function to get the path to the Remotion bundle for CLI scripts
 * Uses a different path resolution for scripts outside the server context
 */
export async function getRemotionBundleForCLI(): Promise<string> {
  // Check if REMOTION_BUNDLE_URI is set in environment
  const bundleUri = process.env.REMOTION_BUNDLE_URI;
  
  if (bundleUri && bundleUri.trim() !== '') {
    // Use the provided URI directly
    return bundleUri;
  }
  
  // Use the pre-built bundle from public/remotion-bundle
  const remotionBundlePath = path.resolve(__dirname, '../../../public/remotion-bundle');
  
  // Check if the bundle exists
  try {
    const stat = await fs.promises.stat(remotionBundlePath);
    if (!stat.isDirectory()) {
      throw new Error(`Remotion bundle path exists but is not a directory: ${remotionBundlePath}`);
    }
    console.log(`Remotion bundle found at: ${remotionBundlePath}`);
    return remotionBundlePath;
  } catch (error) {
    console.error(`Remotion bundle not found at ${remotionBundlePath}. Error:`, error);
    throw new Error(`Remotion bundle not found. Please ensure the bundle is generated at ${remotionBundlePath}`);
  }
}

/**
 * Quality settings for video rendering
 */
export interface QualitySettings {
  width: number;
  height: number;
  fps: number;
}

/**
 * Get rendering settings based on quality string
 */
export function getQualitySettings(quality: string): QualitySettings {
  switch (quality) {
    case '4k':
      return { width: 3840, height: 2160, fps: 30 };
    case '2k':
      return { width: 2560, height: 1440, fps: 30 };
    case '1080p':
      return { width: 1920, height: 1080, fps: 30 };
    case '720p':
      return { width: 1280, height: 720, fps: 30 };
    case '480p':
      return { width: 854, height: 480, fps: 30 };
    case '360p':
      return { width: 640, height: 360, fps: 30 };
    default:
      return { width: 1280, height: 720, fps: 30 };
  }
}

/**
 * Create a temporary directory for rendering output
 */
export async function createTempDirectory(): Promise<string> {
  const tempBaseDir = os.tmpdir();
  const tempDirPrefix = path.join(tempBaseDir, 'inkycut-render-');
  
  // Create a unique temporary directory
  const outputDir = await fs.promises.mkdtemp(tempDirPrefix);
  console.log(`Created temporary directory for rendering: ${outputDir}`);
  
  return outputDir;
}

/**
 * Generate output filename based on project and settings
 */
export function generateOutputFilename(project: any, type: string): string {
  return `video_${project.id || 'project'}_${Date.now()}.${type}`;
}

/**
 * Core rendering function that handles Remotion composition and rendering
 */
export async function renderVideoComposition(
  project: any,
  type: string,
  quality: string,
  bundlePath: string,
  outputPath: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { width, height, fps } = getQualitySettings(quality);
  
  // Set up the composition with the project data
  const inputProps = {
    data: project
  };
  
  console.log(`Starting rendering: ${width}x${height} at ${fps}fps, codec: ${type === 'mp4' ? 'h264' : 'vp9'}`);
  console.log(`Output path: ${outputPath}`);
  
  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'VideoComposition', // Match the ID defined in the Composition component
    inputProps,
  });
  
  // Render the media with the selected configuration and report progress
  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: type === 'mp4' ? 'h264' : 'vp9',
    outputLocation: outputPath,
    inputProps,
    imageFormat: 'jpeg',
    pixelFormat: 'yuv420p',
    overwrite: true,
    timeoutInMilliseconds: 300000, // 5 minutes timeout
    onProgress: (progress) => {
      // progress might not be a number in some cases
      if (typeof progress === 'number') {
        // progress is a value between 0 and 1
        const percentage = Math.round(progress * 100);
        if (percentage % 5 === 0) { // Update every 5%
          console.log(`Rendering progress: ${percentage}%`);
          if (onProgress) {
            onProgress(percentage);
          }
        }
      }
    }
  });
  
  console.log(`Rendering completed: ${outputPath}`);
  
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Rendering failed or output file does not exist: ${outputPath}`);
  }
}

/**
 * Clean up temporary directory and rendered files
 */
export async function cleanupTempFiles(outputPath: string, outputDir: string): Promise<void> {
  try {
    // First ensure the rendered file is removed
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
      console.log(`Deleted local rendered file: ${outputPath}`);
    }
    
    // Then remove the entire temporary directory
    if (fs.existsSync(outputDir)) {
      await fs.promises.rm(outputDir, { recursive: true, force: true });
      console.log(`Deleted temporary directory: ${outputDir}`);
    }
  } catch (cleanupError) {
    console.warn('Failed to clean up temporary directory or files:', cleanupError);
  }
}