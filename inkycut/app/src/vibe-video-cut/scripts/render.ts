#!/usr/bin/env node
// npx tsx src/vibe-video-cut/scripts/render.ts --data /tmp/data.json
import { readFileSync } from 'fs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to get the path to the Remotion bundle
async function getRemotionBundle() {
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

async function renderProject(project: any, type: string, quality: string): Promise<any> {
  try {
    // Determine rendering settings based on quality
    let width: number, height: number, fps: number;
    switch (quality) {
      case '4k':
        width = 3840;
        height = 2160;
        fps = 30;
        break;
      case '2k':
        width = 2560;
        height = 1440;
        fps = 30;
        break;
      case '1080p':
        width = 1920;
        height = 1080;
        fps = 30;
        break;
      case '720p':
        width = 1280;
        height = 720;
        fps = 30;
        break;
      case '480p':
        width = 854;
        height = 480;
        fps = 30;
        break;
      case '360p':
        width = 640;
        height = 360;
        fps = 30;
        break;
      default:
        width = 1280;
        height = 720;
        fps = 30;
    }
    
    // Create a proper temporary directory for the output
    const tempBaseDir = os.tmpdir();
    const tempDirPrefix = path.join(tempBaseDir, 'inkycut-render-');
    
    // Create a unique temporary directory
    const outputDir = await fs.promises.mkdtemp(tempDirPrefix);
    console.log(`Created temporary directory for rendering: ${outputDir}`);
    
    // Set up the output filename
    const outputFilename = `video_${project.id || 'project'}_${Date.now()}.${type}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Get the path to the pre-built Remotion bundle
    const bundlePath = await getRemotionBundle();
    
    // Set up the composition with the project data
    const inputProps = {
      data: project
    };
    
    const composition = await selectComposition({
      serveUrl: bundlePath,
      id: 'VideoComposition', // Match the ID defined in the Composition component
      inputProps,
    });
    
    console.log(`Starting rendering: ${width}x${height} at ${fps}fps, codec: ${type === 'mp4' ? 'h264' : 'vp9'}`);
    console.log(`Output path: ${outputPath}`);
    
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
          }
        }
      }
    });
    
    console.log(`Rendering completed: ${outputPath}`);
    
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Rendering failed or output file does not exist: ${outputPath}`);
    }
    
    return {
      status: 'completed',
      outputPath,
      outputDir
    };
  } catch (error) {
    console.error(`Error in renderProject:`, error);
    throw error;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsedArgs: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        parsedArgs[key] = value;
        i++; // Skip the value in next iteration
      }
    }
  }
  
  return parsedArgs;
}

async function main() {
  try {
    const args = parseArgs();
    
    if (!args.data) {
      console.error('Error: --data parameter is required');
      console.log('Usage: npx tsx render.ts --data <path-to-json-file> [--type mp4] [--quality 1080p]');
      process.exit(1);
    }
    
    // Read and parse the JSON data file
    let projectData;
    try {
      const jsonContent = readFileSync(args.data, 'utf8');
      projectData = JSON.parse(jsonContent);
    } catch (error: any) {
      console.error(`Error reading or parsing JSON file "${args.data}":`, error.message);
      process.exit(1);
    }
    
    // Default render settings
    const type = args.type || 'mp4';
    const quality = args.quality || '1080p';
    
    console.log(`Starting render with data from: ${args.data}`);
    console.log(`Output format: ${type}, Quality: ${quality}`);
    
    // Call the renderProject function
    const result = await renderProject(projectData, type, quality);
    
    console.log('Render completed successfully!');
    console.log('Output file:', result.outputPath);
    
  } catch (error: any) {
    console.error('Render failed:', error.message);
    process.exit(1);
  }
}

main();