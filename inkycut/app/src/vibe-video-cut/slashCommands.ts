import type { User } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3 } from '../file-upload/s3Utils';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { renderProject } from './utils/exportUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      
      // Extract composition data and merge files if present
      let compositionData = project.composition || project;
      if (project.files) {
        compositionData.files = project.files;
      }
      
      // Start rendering process
      const result = await renderProject(compositionData, type, quality, user, context);
      
      return {
        message: `Well done! Click to this
<a href="${result.videoUrl}" target="_blank" class="text-blue-600">temporary link</a> to download the video:
<video src="${result.videoUrl}" controls></video>`,
        status: 'download_complete',
        type,
        quality
      };
    }
    
    default:
      throw new HttpError(400, `Unknown command: /${mainCommand}`);
  }
}
