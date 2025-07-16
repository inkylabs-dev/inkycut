// Legacy renderProject function for backward compatibility
// This is moved from the original app's exportUtils.ts

import path from 'path';
import fs from 'fs';
import os from 'os';
import { renderMedia } from '@remotion/renderer';

/**
 * Render a project using Remotion - Legacy version for backward compatibility
 * 
 * @param project The project data to render
 * @param type The output file type
 * @param quality The quality setting
 * @param user The user (optional)
 * @param context The context (optional)
 */
export async function renderProject(project: any, type: string = 'mp4', quality: string = '1080p', user?: any, context?: any): Promise<any> {
  try {
    // Process the project to replace image/video src URLs with data URIs
    const processedProject = await replaceMediaSourcesWithDataURIs(project);
    
    // Create a temporary directory for the output
    const outputDir = await createTempDirectory();
    
    // Set up the output filename
    const outputFilename = generateOutputFilename(project, type);
    const outputPath = path.join(outputDir, outputFilename);
    
    // Create a simple composition for rendering
    const composition = {
      id: 'Main',
      fps: 30,
      durationInFrames: calculateDurationInFrames(processedProject),
      width: 1920,
      height: 1080,
      defaultProps: {},
      props: {},
      defaultCodec: 'h264' as const,
      defaultOutName: 'out.mp4',
      defaultVideoImageFormat: 'jpeg' as const,
      defaultPixelFormat: 'yuv420p' as const,
    };
    
    // Create a basic bundle for rendering
    const bundlePath = await createBasicBundle(outputDir, processedProject);
    
    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundlePath,
      codec: type === 'webm' ? 'vp8' : 'h264',
      outputLocation: outputPath,
      onProgress: ({ progress }) => {
        console.log(`Rendering progress: ${Math.round(progress * 100)}%`);
      },
    });
    
    // For now, just return the local path
    // In a real implementation, you would upload to S3 and return the URL
    return {
      status: 'completed',
      videoUrl: outputPath,
      localPath: outputPath,
    };
  } catch (error) {
    console.error('Error in renderProject:', error);
    throw error;
  }
}

async function createTempDirectory(): Promise<string> {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'inkycut-render-'));
}

function generateOutputFilename(project: any, type: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectName = project.name || 'inkycut-project';
  return `${projectName}-${timestamp}.${type}`;
}

function calculateDurationInFrames(project: any): number {
  const defaultDuration = 30 * 10; // 10 seconds at 30fps
  
  if (!project.pages || project.pages.length === 0) {
    return defaultDuration;
  }
  
  // Find the maximum end time among all elements
  let maxEndTime = 0;
  project.pages.forEach((page: any) => {
    if (page.elements) {
      page.elements.forEach((element: any) => {
        const endTime = (element.startTime || 0) + (element.duration || 5);
        maxEndTime = Math.max(maxEndTime, endTime);
      });
    }
  });
  
  return maxEndTime > 0 ? Math.ceil(maxEndTime * 30) : defaultDuration;
}

async function createBasicBundle(outputDir: string, projectData: any): Promise<string> {
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
      InkyCut Video Render
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
  
  const bundlePath = path.join(outputDir, 'index.tsx');
  await fs.promises.writeFile(bundlePath, compositionCode);
  
  return bundlePath;
}

async function replaceMediaSourcesWithDataURIs(project: any): Promise<any> {
  const processedProject = JSON.parse(JSON.stringify(project));
  
  if (!processedProject.files || processedProject.files.length === 0) {
    console.warn('No files found in project for data URI conversion');
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
              }
            }
            
            // Process video elements
            if (clip.type === 'video' && clip.src && !clip.src.startsWith('data:')) {
              if (fileMap.has(clip.src)) {
                clip.src = fileMap.get(clip.src);
              }
            }
          } catch (error) {
            console.error('Failed to process media element:', error);
          }
        }));
      }
    }));
  }
  
  return processedProject;
}