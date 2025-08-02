/**
 * new-video command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const newVideoCommand: SlashCommand = {
  name: 'new-video',
  description: 'Add a new video element to the selected page',
  usage: '/new-video --src|-s url [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees] [--delay|-d milliseconds]',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (!context.project || !context.project.composition) {
        return {
          success: false,
          message: '❌ **No Project**\n\nNo project is currently loaded. Please create or load a project first.',
          handled: true
        };
      }

      const args = context.args || [];
      
      // Get canvas dimensions from project composition
      const canvasWidth = context.project.composition.width || 1920;
      const canvasHeight = context.project.composition.height || 1080;
      
      // First pass: extract src to determine dimensions
      let srcValue = '';
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];
        if ((arg === '--src' || arg === '-s') && nextArg) {
          srcValue = nextArg;
          break;
        }
      }
      
      // Determine default dimensions from LocalFile or fallback
      let defaultWidth = 320;
      let defaultHeight = 240;
      
      if (srcValue && context.fileStorage) {
        try {
          const files = await context.fileStorage.getAllFiles();
          const localFile = files.find((file: any) => 
            file.dataUrl === srcValue || file.name === srcValue
          );
          
          if (localFile && localFile.width && localFile.height) {
            defaultWidth = localFile.width;
            defaultHeight = localFile.height;
          }
        } catch (error) {
          console.warn('Failed to load files from storage:', error);
        }
      }
      
      // Video element properties with LocalFile dimensions
      const elementData: any = {
        type: 'video',
        src: srcValue,
        left: Math.floor((canvasWidth - defaultWidth) / 2),
        top: Math.floor((canvasHeight - defaultHeight) / 2),
        width: defaultWidth,
        height: defaultHeight,
        opacity: 1,
        rotation: 0,
        delay: 0
      };

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--src':
          case '-s':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/video.mp4"`',
                handled: true
              };
            }
            elementData.src = nextArg;
            i++; // Skip next arg
            break;

          case '--left':
          case '-l':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                handled: true
              };
            }
            const left = parseInt(nextArg, 10);
            if (isNaN(left)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.left = left;
            i++; // Skip next arg
            break;

          case '--top':
          case '-tp':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                handled: true
              };
            }
            const top = parseInt(nextArg, 10);
            if (isNaN(top)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.top = top;
            i++; // Skip next arg
            break;

          case '--width':
          case '-w':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 640`',
                handled: true
              };
            }
            const width = parseInt(nextArg, 10);
            if (isNaN(width) || width <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.width = width;
            i++; // Skip next arg
            break;

          case '--height':
          case '-h':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 480`',
                handled: true
              };
            }
            const height = parseInt(nextArg, 10);
            if (isNaN(height) || height <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Height**\n\nHeight must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.height = height;
            i++; // Skip next arg
            break;

          case '--opacity':
          case '-o':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--opacity` requires a value.\n\nExample: `--opacity 0.8` (0.0 to 1.0)',
                handled: true
              };
            }
            const opacity = parseFloat(nextArg);
            if (isNaN(opacity) || opacity < 0 || opacity > 1) {
              return {
                success: false,
                message: `❌ **Invalid Opacity**\n\nOpacity must be a number between 0.0 and 1.0. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.opacity = opacity;
            i++; // Skip next arg
            break;

          case '--rotation':
          case '-r':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--rotation` requires a value.\n\nExample: `--rotation 45` (degrees)',
                handled: true
              };
            }
            const rotation = parseInt(nextArg, 10);
            if (isNaN(rotation)) {
              return {
                success: false,
                message: `❌ **Invalid Rotation**\n\nRotation must be a number (degrees). Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.rotation = rotation;
            i++; // Skip next arg
            break;

          case '--delay':
          case '-d':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--delay` requires a value.\n\nExample: `--delay 1000` (milliseconds)',
                handled: true
              };
            }
            const delay = parseInt(nextArg, 10);
            if (isNaN(delay) || delay < 0) {
              return {
                success: false,
                message: `❌ **Invalid Delay**\n\nDelay must be a non-negative number (milliseconds). Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.delay = delay;
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /new-video without arguments to see usage.`,
                handled: true
              };
            }
            break;
        }
      }

      // Validate required src parameter
      if (!elementData.src) {
        return {
          success: false,
          message: '❌ **Missing Video Source**\n\nVideo source is required.\n\nUsage: `/new-video --src "https://example.com/video.mp4"`\n\nExample:\n• `/new-video --src "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" --width 640 --height 360`',
          handled: true
        };
      }

      // Recalculate center position if position wasn't explicitly set
      if (!args.some(arg => arg === '--left' || arg === '-l')) {
        elementData.left = Math.floor((canvasWidth - elementData.width) / 2);
      }
      if (!args.some(arg => arg === '--top' || arg === '-tp')) {
        elementData.top = Math.floor((canvasHeight - elementData.height) / 2);
      }

      // Get selected page
      const selectedPageId = context.project.appState?.selectedPageId;
      if (!selectedPageId) {
        return {
          success: false,
          message: '❌ **No Page Selected**\n\nPlease select a page first before adding elements.',
          handled: true
        };
      }

      // Find the selected page
      const pages = [...context.project.composition.pages];
      const selectedPage = pages.find(page => page.id === selectedPageId);
      if (!selectedPage) {
        return {
          success: false,
          message: '❌ **Page Not Found**\n\nThe selected page could not be found.',
          handled: true
        };
      }

      // Create new element with unique ID
      const newElement = {
        id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...elementData
      };

      // Add element to page
      selectedPage.elements.push(newElement);

      // Update project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Video Element Added**\n\nAdded video element to page "${selectedPage.name}"\n\n• Source: ${elementData.src}\n• Position: (${elementData.left}, ${elementData.top})\n• Size: ${elementData.width}×${elementData.height}\n• Opacity: ${elementData.opacity}\n• Rotation: ${elementData.rotation}°\n• Delay: ${elementData.delay}ms`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create video element:', error);
      return {
        success: false,
        message: '❌ **Video Creation Failed**\n\nFailed to create video element. Please try again.',
        handled: true
      };
    }
  }
};;
