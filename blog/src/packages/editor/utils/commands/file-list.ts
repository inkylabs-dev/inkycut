/**
 * ls-files command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const lsFilesCommand: SlashCommand = {
  name: 'ls-files',
  description: 'List all file metadata from the current project storage',
  usage: '/ls-files',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (!context.fileStorage) {
        return {
          success: false,
          message: '❌ **No File Storage**\n\nFile storage is not available in the current context.',
          handled: true
        };
      }

      // Get all files from storage
      const files = await context.fileStorage.getAllFiles();

      if (!files || files.length === 0) {
        return {
          success: true,
          message: '📁 **No Files**\n\nNo files are currently stored in the project.',
          handled: true
        };
      }

      // Filter out blob/encoded data and keep only useful metadata
      const fileMetadata = files.map((file: any) => {
        const metadata: any = {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified
        };

        // Include dimensions for media files
        if (file.width && file.height) {
          metadata.width = file.width;
          metadata.height = file.height;
        }

        // Include duration for video/audio files
        if (file.duration) {
          metadata.duration = file.duration;
        }

        // Include any other useful metadata but exclude data URLs and blobs
        Object.keys(file).forEach(key => {
          if (!['dataUrl', 'blob', 'data', 'arrayBuffer'].includes(key) && 
              !metadata.hasOwnProperty(key)) {
            metadata[key] = file[key];
          }
        });

        return metadata;
      });

      // Return filtered file metadata
      const message = `\`\`\`json\n${JSON.stringify(fileMetadata, null, 2)}\n\`\`\``;

      return {
        success: true,
        message,
        handled: true
      };

    } catch (error) {
      console.error('Failed to list files:', error);
      return {
        success: false,
        message: '❌ **List Failed**\n\nFailed to list file metadata. Please try again.',
        handled: true
      };
    }
  }
};
