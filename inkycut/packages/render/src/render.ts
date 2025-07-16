import { URL } from 'url';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import chalk from 'chalk';
import { renderMedia } from '@remotion/renderer';

export interface RenderOptions {
  output: string;
  quality: string;
  format: string;
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
      console.log(chalk.yellow('No files found in project for data URI conversion'));
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

  // Create a temporary directory for the output
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'inkycut-render-'));
  const tempDataPath = path.join(tempDir, 'project.json');
  
  try {
    // Write project data to temporary file
    await fs.writeFile(tempDataPath, JSON.stringify(projectData, null, 2));
    
    // Create bundled script that can be used with Remotion
    const bundlePath = await createRemotionBundle(tempDir, projectData, options.verbose);
    
    if (options.verbose) {
      console.log(chalk.gray('Rendering with Remotion...'));
    }
    
    // Render using Remotion
    await renderMedia({
      composition: {
        id: 'Main',
        fps: 30,
        durationInFrames: calculateDurationInFrames(projectData),
        width: 1920,
        height: 1080,
        defaultProps: {},
        props: {},
        defaultCodec: 'h264' as const,
        defaultOutName: 'out.mp4',
        defaultVideoImageFormat: 'jpeg' as const,
        defaultPixelFormat: 'yuv420p' as const,
      },
      serveUrl: bundlePath,
      codec: options.format === 'webm' ? 'vp8' : 'h264',
      outputLocation: options.output,
      onProgress: ({ progress }) => {
        if (options.verbose) {
          console.log(chalk.blue(`Rendering progress: ${Math.round(progress * 100)}%`));
        }
      },
    });
    
    if (options.verbose) {
      console.log(chalk.gray('Video rendered successfully'));
    }
    
  } finally {
    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
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
        const endTime = (element.startTime || 0) + (element.duration || 5);
        maxEndTime = Math.max(maxEndTime, endTime);
      });
    }
  });
  
  return maxEndTime > 0 ? Math.ceil(maxEndTime * 30) : defaultDuration;
}

async function createRemotionBundle(tempDir: string, projectData: any, verbose?: boolean): Promise<string> {
  if (verbose) {
    console.log(chalk.gray('Creating Remotion bundle...'));
  }
  
  // Create a simple Remotion composition
  const compositionCode = `
import { registerRoot } from 'remotion';
import { Composition } from 'remotion';

const projectData = ${JSON.stringify(projectData, null, 2)};

const MainComposition = () => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: 48,
    }}>
      InkyCut Video
    </div>
  );
};

registerRoot(() => {
  return (
    <Composition
      id="Main"
      component={MainComposition}
      durationInFrames={${calculateDurationInFrames(projectData)}}
      fps={30}
      width={1920}
      height={1080}
    />
  );
});
`;
  
  const bundlePath = path.join(tempDir, 'index.tsx');
  await fs.writeFile(bundlePath, compositionCode);
  
  return bundlePath;
}