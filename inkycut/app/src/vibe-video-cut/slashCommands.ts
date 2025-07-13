import type { User } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3 } from '../file-upload/s3Utils';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a global path variable to the remotion bundle
let remotionBundlePath: string | null = null;

// Function to get the path to the Remotion bundle
async function getRemotionBundle() {
  if (!remotionBundlePath) {
    console.log('Getting Remotion bundle path...');
    // Use the pre-built bundle from public/remotion-bundle
    // Hack: wasp compiles the web app under .wasp/out/web-app, while this file is in .wasp/out/server
    remotionBundlePath = path.resolve(__dirname, '../../web-app/public/remotion-bundle');
    
    // Check if the bundle exists
    try {
      const stat = await fs.promises.stat(remotionBundlePath);
      if (!stat.isDirectory()) {
        throw new Error(`Remotion bundle path exists but is not a directory: ${remotionBundlePath}`);
      }
      console.log(`Remotion bundle found at: ${remotionBundlePath}`);
    } catch (error) {
      console.error(`Remotion bundle not found at ${remotionBundlePath}. Error:`, error);
      throw new Error(`Remotion bundle not found. Please ensure the bundle is generated at ${remotionBundlePath}`);
    }
  }
  return remotionBundlePath;
}

/**
 * Process slash commands for special functionality
 * 
 * @param command The slash command to process (without the leading slash)
 * @param project The project data to use for processing
 * @param user The user who initiated the command
 * @returns Response object with message and any additional data
 */
export async function processSlashCommand(command: string, project: any, user: User, context?: any) {
  // Parse the command and args
  const [mainCommand, ...args] = command.trim().split(/\s+/);
  
  // Convert args like "--type mp4" to an object like {type: "mp4"}
  const argsObj = args.reduce((acc, curr, idx, arr) => {
    if (curr.startsWith('--') && idx + 1 < arr.length && !arr[idx + 1].startsWith('--')) {
      const key = curr.substring(2);
      acc[key] = arr[idx + 1];
    }
    return acc;
  }, {} as Record<string, string>);

  console.log(`Processing slash command: /${mainCommand}`, argsObj);
  
  // Handle different commands
  switch (mainCommand.toLowerCase()) {
    case 'download': {
      // Validate required parameters
      const type = argsObj.type || 'mp4';
      const quality = argsObj.quality || '1080p';
      
      // Start rendering process
      const taskId = await startRendering(project, type, quality, user, context);
      
      return {
        message: `Started rendering your project as ${type} with ${quality} quality. TaskId: ${taskId}`,
        taskId,
        status: 'rendering_started',
        type,
        quality
      };
    }
    
    default:
      throw new HttpError(400, `Unknown command: /${mainCommand}`);
  }
}

/**
 * Start the rendering process for a project
 * 
 * @param project The project data to render
 * @param type The output file type (mp4, webm, etc.)
 * @param quality The quality setting (1080p, 720p, etc.)
 * @param user The user who initiated the render
 * @returns Task ID for tracking render progress
 */
async function startRendering(project: any, type: string, quality: string, user: User, context?: any): Promise<string> {
  // Generate a unique task ID
  const taskId = `render_${Math.random().toString(36).substring(2, 15)}`;
  
  // Create a task to track rendering progress
  const renderTask = {
    id: taskId,
    projectId: project.id,
    userId: user.id,
    status: 'preparing',
    progress: 0,
    type,
    quality,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    videoUrl: null,
    error: null,
  };
  
  // Store the task
  // renderTasks.set(taskId, renderTask);
  
  // Start rendering in the background
  setTimeout(() => {
    renderProject(taskId, project, type, quality, user, context)
      .catch((error: Error) => {
        console.error(`Error rendering project ${project.id}:`, error);
        // const task = renderTasks.get(taskId);
        // if (task) {
        //   task.status = 'failed';
        //   task.error = error.message;
        //   task.updatedAt = new Date().toISOString();
        //   renderTasks.set(taskId, task);
        // }
      });
  }, 0);
  
  return taskId;
}

/**
 * Render a project using Remotion
 * 
 * @param taskId The task ID to update progress
 * @param project The project data to render
 * @param type The output file type
 * @param quality The quality setting
 */
async function renderProject(taskId: string, project: any, type: string, quality: string, user?: User, context?: any): Promise<any> {
  let downloadUrl: string | undefined;
  
  // Update task status
//   const updateTaskStatus = (status: string, progress: number, url?: string) => {
//     const task = renderTasks.get(taskId);
//     if (task) {
//       task.status = status;
//       task.progress = progress;
//       if (url) {
//         task.videoUrl = url;
//         downloadUrl = url;
//       }
//       task.updatedAt = new Date().toISOString();
//       renderTasks.set(taskId, task);
//     }
//   };
  
  try {
    // updateTaskStatus('bundling', 10);
    
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
    const outputFilename = `video_${project.id}_${Date.now()}.${type}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Get the path to the pre-built Remotion bundle
    let renderingSuccessful = false;
    try {
    //   updateTaskStatus('bundling', 15);
      const bundlePath = await getRemotionBundle();
      
      // Set up the composition with the project data
      const inputProps = {
        projectData: project
      };
      
    //   updateTaskStatus('preparing_composition', 25);
      const composition = await selectComposition({
        serveUrl: bundlePath,
        id: 'VideoComposition', // Match the ID defined in the Composition component
        inputProps,
      });
      
      // Perform real rendering with Remotion
    //   updateTaskStatus('rendering', 30);
      
      console.log(`Starting real rendering: ${width}x${height} at ${fps}fps, codec: ${type === 'mp4' ? 'h264' : 'vp9'}`);
      console.log(`Output path: ${outputPath}`);
      
      try {
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
                // updateTaskStatus('rendering', 30 + Math.floor(percentage / 2)); // Removed, no longer needed
              }
            } 
            // Disabled object progress logging to avoid excessive console output
            // else {
            //   console.log(`Rendering in progress (raw value: ${progress})`);
            // }
          }
        });
        
        console.log(`Rendering completed: ${outputPath}`);
        // updateTaskStatus('rendered', 80);
        renderingSuccessful = true;
      } catch (renderError) {
        console.error('Error during Remotion rendering:', renderError);
        // updateTaskStatus('rendering_failed', 30);
      }
    } catch (setupError) {
      console.error('Error in Remotion setup:', setupError);
    //   updateTaskStatus('setup_failed', 10);
      // Continue with simulation
    }
    
    // If we get here, real rendering has failed or been skipped
    // Fall back to simulation if needed
    
    if (renderingSuccessful && fs.existsSync(outputPath)) {
      // If the file exists and rendering was marked successful
    //   updateTaskStatus('finalizing', 70);
    } else {
      throw new Error(`Rendering failed or output file does not exist: ${outputPath}`);
    }
    
    // Prepare to upload file to S3
    const fileType = type === 'mp4' ? 'video/mp4' : type === 'webm' ? 'video/webm' : 'video/mp4';
    const fileName = outputFilename;
    
    try {
      // Get signed URL from S3 for uploading
      // Using "tmp" as the user ID to create a tmp directory in S3 bucket
      const { s3UploadUrl, s3UploadFields, key } = await getUploadFileSignedURLFromS3({
        fileType,
        fileName,
        userId: "tmp" // Using "tmp" as a folder name instead of user ID
      });
      
      console.log(`File will be uploaded to S3 with key: ${key} (no File record needed)`);
      
      // No File record creation - simplified approach
      
      // Upload the rendered file to S3
      console.log(`Uploading rendered file to S3: ${outputPath}`);
      try {
        if (fs.existsSync(outputPath)) {
          // Create a form-data instance for file upload
          const formData = new FormData();
          
          // Add the S3 fields to the form data
          Object.entries(s3UploadFields).forEach(([fieldName, fieldValue]) => {
            formData.append(fieldName, fieldValue as string);
          });
          
          // Add the file content as the last field - using stream to avoid memory issues with large files
          const fileStream = fs.createReadStream(outputPath);
          formData.append('file', fileStream, {
            filename: fileName,
            contentType: fileType,
            knownLength: fs.statSync(outputPath).size
          });
          
          // Upload using fetch with specific headers to avoid warnings
          // Using direct pipe to avoid deprecation warnings
          const response = await fetch(s3UploadUrl, {
            method: 'POST',
            body: formData,
            // Disable the internal content-type setting to let form-data handle it correctly
            headers: formData.getHeaders(),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to upload file to S3: ${response.statusText}`);
          }
          
          console.log('File uploaded to S3 successfully');
        } else {
          throw new Error(`Rendered file does not exist: ${outputPath}`);
        }
      } catch (uploadError) {
        console.error('Error uploading file to S3:', uploadError);
        // Continue with getting the download URL even if upload fails
      }
      
      // Get a signed URL for downloading the file
      const s3DownloadUrl = await getDownloadFileSignedURLFromS3({ key });
      
      // Clean up the temporary directory and rendered file
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
      
      // Update task with completed status
    //   updateTaskStatus('completed', 100, s3DownloadUrl);
      
      return {
        taskId,
        status: 'completed',
        videoUrl: downloadUrl || s3DownloadUrl,
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      // Use a fallback URL
      const fallbackUrl = `/api/renders/${outputFilename}`;
    //   updateTaskStatus('completed', 100, fallbackUrl);
      return {
        taskId,
        status: 'completed',
        videoUrl: downloadUrl || fallbackUrl,
      };
    }
  } catch (error) {
    console.error(`Error in renderProject for task ${taskId}:`, error);
    // updateTaskStatus('failed', 0);
    throw error;
  }
}
