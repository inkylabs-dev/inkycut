#!/usr/bin/env node
// npx tsx src/vibe-video-cut/scripts/render.ts --data /tmp/data.json
import { readFileSync } from 'fs';
import path from 'path';
import {
  getRemotionBundleForCLI,
  createTempDirectory,
  generateOutputFilename,
  renderVideoComposition
} from '../utils/renderUtils.js';

async function renderProject(project: any, type: string, quality: string): Promise<any> {
  try {
    // Create a temporary directory for the output
    const outputDir = await createTempDirectory();
    
    // Set up the output filename
    const outputFilename = generateOutputFilename(project, type);
    const outputPath = path.join(outputDir, outputFilename);
    
    // Get the path to the pre-built Remotion bundle
    const bundlePath = await getRemotionBundleForCLI();
    
    // Render the video composition
    await renderVideoComposition(project, type, quality, bundlePath, outputPath);
    
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