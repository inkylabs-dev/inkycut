import { URL } from 'url';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import chalk from 'chalk';
import { renderMedia, selectComposition } from '@remotion/renderer';

export interface RenderOptions {
  output: string;
  quality: string;
  format: string;
  bundle?: string;
  verbose?: boolean;
}

export async function renderFromUrl(shareUrl: string, options: RenderOptions): Promise<void> {
  // Parse the share URL to extract the share ID
  const shareId = extractShareId(shareUrl);
  if (!shareId) {
    throw new Error('Invalid share URL format. Expected format: https://inkycut.com/vibe#share=xxxxxxxx');
  }

  if (options.verbose) {
    console.log(chalk.gray(`Extracted share ID: ${shareId}`));
  }

  // Fetch the project data from the share ID
  const projectData = await fetchProjectData(shareUrl, shareId, options.verbose);

  // Process the project data for rendering
  const processedProject = await processProjectData(projectData, options.verbose);

  // Render the video
  await renderVideo(processedProject, options);
}

export async function renderFromFile(filePath: string, options: RenderOptions): Promise<void> {
  if (options.verbose) {
    console.log(chalk.gray(`Reading project file: ${filePath}`));
  }

  // Read and parse the JSON file
  const projectData = await readProjectFile(filePath, options.verbose);

  // Process the project data for rendering
  const processedProject = await processProjectData(projectData, options.verbose);

  // Render the video
  await renderVideo(processedProject, options);
}

async function readProjectFile(filePath: string, verbose?: boolean): Promise<any> {
  try {
    // Check if file exists and is accessible
    await fs.access(filePath);
    
    if (verbose) {
      console.log(chalk.gray('Reading project file...'));
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const projectData = JSON.parse(fileContent);
    
    if (verbose) {
      console.log(chalk.gray('Project file read successfully'));
    }
    
    return projectData;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Project file not found: ${filePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in project file: ${filePath}`);
    }
    throw new Error(`Failed to read project file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function extractShareId(shareUrl: string): string | null {
  try {
    const url = new URL(shareUrl);
    const hash = url.hash.substring(1); // Remove the #
    const params = new URLSearchParams(hash);
    return params.get('share');
  } catch (error) {
    return null;
  }
}

async function fetchProjectData(shareUrl: string, shareId: string, verbose?: boolean): Promise<any> {
  if (verbose) {
    console.log(chalk.gray('Fetching project data...'));
  }

  // Try to fetch from the API endpoint
  try {
    const apiUrl = shareUrl.replace('#share=', '/api/share/');
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch project data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (verbose) {
      console.log(chalk.gray('Project data fetched successfully'));
    }
    
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch project data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function processProjectData(projectData: any, verbose?: boolean): Promise<any> {
  if (verbose) {
    console.log(chalk.gray('Processing project data...'));
  }

  // Process the project to replace media sources with data URIs if needed
  const processedProject = await replaceMediaSourcesWithDataURIs(projectData, verbose);

  if (verbose) {
    console.log(chalk.gray('Project data processed'));
  }

  return processedProject;
}

async function replaceMediaSourcesWithDataURIs(project: any, verbose?: boolean): Promise<any> {
  const processedProject = JSON.parse(JSON.stringify(project));
  
  if (!processedProject.files || processedProject.files.length === 0) {
    if (verbose) {
      console.log(chalk.gray('No files found in project for data URI conversion'));
    }
    return processedProject;
  }
  
  // Create a map of file references for easy lookup
  const fileMap = new Map();
  processedProject.files.forEach((file: any) => {
    if (file.name && file.dataUrl) {
      fileMap.set(file.name, file.dataUrl);
    }
  });
  
  // Process media elements if they exist
  if (processedProject.pages) {
    await Promise.all(processedProject.pages.map(async (track: any) => {
      if (track.elements) {
        await Promise.all(track.elements.map(async (clip: any) => {
          try {
            // Process image elements
            if (clip.type === 'image' && clip.src && !clip.src.startsWith('data:')) {
              if (fileMap.has(clip.src)) {
                clip.src = fileMap.get(clip.src);
              } else {
                clip.src = await convertUrlToDataURI(clip.src, verbose);
              }
            }
            
            // Process video elements
            if (clip.type === 'video' && clip.src && !clip.src.startsWith('data:')) {
              if (fileMap.has(clip.src)) {
                clip.src = fileMap.get(clip.src);
              } else {
                clip.src = await convertUrlToDataURI(clip.src, verbose);
              }
            }
          } catch (error) {
            if (verbose) {
              console.error(chalk.red(`Failed to process media element:`), error);
            }
          }
        }));
      }
    }));
  }
  
  return processedProject;
}

async function convertUrlToDataURI(url: string, verbose?: boolean): Promise<string> {
  if (verbose) {
    console.log(chalk.gray(`Converting URL to data URI: ${url}`));
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const base64 = buffer.toString('base64');
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    if (verbose) {
      console.error(chalk.red(`Failed to convert URL to data URI: ${url}`), error);
    }
    return url; // Return original URL as fallback
  }
}

async function renderVideo(projectData: any, options: RenderOptions): Promise<void> {
  if (options.verbose) {
    console.log(chalk.gray('Starting video rendering...'));
  }

  const bundleUrl = options.bundle || 'https://inkycut.com/remotion-bundle/';
  
  if (options.verbose) {
    console.log(chalk.gray(`Using bundle: ${bundleUrl}`));
  }
  
  // Set up the input props to match renderUtils structure
  const inputProps = {
    data: projectData
  };
  
  if (options.verbose) {
    console.log(chalk.gray('Selecting composition...'));
  }
  
  // Select the composition using the correct ID
  const composition = await selectComposition({
    serveUrl: bundleUrl,
    id: 'VideoComposition', // Match the ID from renderUtils
    inputProps,
  });
  
  if (options.verbose) {
    console.log(chalk.gray('Rendering...'));
  }
  
  // Render using Remotion with the selected composition
  await renderMedia({
    composition,
    serveUrl: bundleUrl,
    codec: options.format === 'webm' ? 'vp9' : 'h264',
    outputLocation: options.output,
    inputProps,
    imageFormat: 'jpeg',
    pixelFormat: 'yuv420p',
    overwrite: true,
    timeoutInMilliseconds: 300000, // 5 minutes timeout
    onProgress: (progress) => {
      if (options.verbose && typeof progress === 'number') {
        const percentage = Math.round(progress * 100);
        console.log(chalk.blue(`Rendering progress: ${percentage}%`));
      }
    },
  });
  
  if (options.verbose) {
    console.log(chalk.gray('Video rendered successfully'));
  }
}

function calculateDurationInFrames(projectData: any): number {
  // Default duration if no timing information is available
  const defaultDuration = 30 * 10; // 10 seconds at 30fps
  
  if (!projectData.pages || projectData.pages.length === 0) {
    return defaultDuration;
  }
  
  // Find the maximum end time among all elements
  let maxEndTime = 0;
  projectData.pages.forEach((page: any) => {
    if (page.elements) {
      page.elements.forEach((element: any) => {
        // Convert duration from frames to seconds if it's a large number (likely frames)
        let durationInSeconds = element.duration || 5;
        if (durationInSeconds > 100) {
          durationInSeconds = durationInSeconds / 30; // Convert frames to seconds
        }
        const endTime = (element.startTime || 0) + durationInSeconds;
        maxEndTime = Math.max(maxEndTime, endTime);
      });
    }
  });
  
  const result = maxEndTime > 0 ? Math.ceil(maxEndTime * 30) : defaultDuration;
  console.log(`Calculated duration: ${result} frames (${result/30} seconds)`);
  return result;
}

