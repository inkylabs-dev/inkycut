import type { User } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3 } from '../../file-upload/s3Utils';
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
 * Render a project using Remotion
 * 
 * @param taskId The task ID to update progress
 * @param project The project data to render
 * @param type The output file type
 * @param quality The quality setting
 */
export async function renderProject(project: any, type: string, quality: string, user?: User, context?: any): Promise<any> {
  let downloadUrl: string | undefined;
  
  try {
    // Process the project to replace image/video src URLs with data URIs
    project = await replaceMediaSourcesWithDataURIs(project);
    
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
        data: project
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
        status: 'completed',
        videoUrl: downloadUrl || s3DownloadUrl,
      };
    } catch (error) {
      console.error('Error uploading to S3:', error);
      // Use a fallback URL
      const fallbackUrl = `/api/renders/${outputFilename}`;
    //   updateTaskStatus('completed', 100, fallbackUrl);
      return {
        status: 'completed',
        videoUrl: downloadUrl || fallbackUrl,
      };
    }
  } catch (error) {
    console.error(`Error in renderProject for task:`, error);
    // updateTaskStatus('failed', 0);
    throw error;
  }
}

/**
 * Replaces image and video source URLs with data URIs containing base64-encoded strings
 * This ensures all media is embedded within the project for rendering
 * 
 * @param project The project to process
 * @returns The project with media sources replaced with data URIs
 */
async function replaceMediaSourcesWithDataURIs(project: any): Promise<any> {
  // Create a deep copy of the project to avoid mutating the original
  const processedProject = JSON.parse(JSON.stringify(project));
  
  // Check if project has files available to use for data URIs
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
    // Use Promise.all to process all tracks in parallel
    await Promise.all(processedProject.pages.map(async (track: any) => {
      // Process all clips in this track
      if (track.elements) {
        await Promise.all(track.elements.map(async (clip: any) => {
          console.log(`Processing clip: ${clip.id} of type ${clip.src}`);
          try {
            // Process image elements
            if (clip.type === 'image' && clip.src) {
              // If it's already a data URI, skip it
              if (clip.src.startsWith('data:')) {
                return;
              }
              
              // Check if we have this file in our file map first
              if (clip.src && fileMap.has(clip.src)) {
                clip.src = fileMap.get(clip.src);
                console.log(`Replaced image URL with data URI from file map: ${clip.src}`);
              } else {
                // Fall back to external conversion
                console.log(`Converting external image URL to data URI: ${clip.src}`);
                clip.src = await convertUrlToDataURI(clip.src);
              }
            }
            
            // Process video elements
            if (clip.type === 'video' && clip.src) {
              // If it's already a data URI, skip it
              if (clip.src.startsWith('data:')) {
                return;
              }
              
              // Check if we have this file in our file map first
              if (clip.src && fileMap.has(clip.src)) {
                clip.src = fileMap.get(clip.src);
                console.log(`Replaced video URL with data URI from file map: ${clip.src}`);
              } else {
                // Fall back to external conversion
                console.log(`Converting external video URL to data URI: ${clip.src}`);
                clip.src = await convertUrlToDataURI(clip.src);
              }
            }
            
            // Process any nested elements if needed
            if (clip.elements && Array.isArray(clip.elements)) {
              await Promise.all(clip.elements.map(async (element: any) => {
                if (element.type === 'image' && element.src && !element.src.startsWith('data:')) {
                  if (element.fileId && fileMap.has(element.src)) {
                    element.src = fileMap.get(element.fileId);
                  } else {
                    element.src = await convertUrlToDataURI(element.src);
                  }
                }
                
                if (element.type === 'video' && element.src && !element.src.startsWith('data:')) {
                  if (element.fileId && fileMap.has(element.src)) {
                    element.src = fileMap.get(element.fileId);
                  } else {
                    element.src = await convertUrlToDataURI(element.src);
                  }
                }
              }));
            }
          } catch (error) {
            console.error(`Failed to process media element:`, error);
          }
        }));
      }
    }));
  }
  // write processed project to /tmp/data.json
  const tempFilePath = path.join(os.tmpdir(), 'data.json');
  try {
    await fs.promises.writeFile(tempFilePath, JSON.stringify(processedProject, null, 2));
    console.log(`Processed project saved to temporary file: ${tempFilePath}`);
  } catch (writeError) {
    console.error(`Failed to write processed project to temporary file:`, writeError);
    throw new HttpError(500, 'Failed to write processed project to temporary file');
  }
  
  return processedProject;
}

/**
 * Convert a URL to a data URI with base64-encoded content
 * Note: This is a stub function. In a real implementation, it would fetch the file
 * and convert it to a base64 data URI.
 * 
 * @param url The URL to convert
 * @returns A data URI containing base64-encoded content
 */
async function convertUrlToDataURI(url: string): Promise<string> {
  // In a real implementation, this function would:
  // 1. Fetch the file from the URL
  // 2. Convert the file to a base64 string
  // 3. Create and return a data URI
  
  // Sample implementation for browser environment:
  // const response = await fetch(url);
  // const blob = await response.blob();
  // return new Promise((resolve, reject) => {
  //   const reader = new FileReader();
  //   reader.onloadend = () => resolve(reader.result as string);
  //   reader.onerror = reject;
  //   reader.readAsDataURL(blob);
  // });
  
  console.log(`Converting URL to data URI: ${url}`);
  return url; // Return original URL for now as a placeholder
}
