/**
 * new-image command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';
import { findElementById, copyElementProperties, generateElementId } from './helpers';

export const newImageCommand: SlashCommand = {
  name: 'new-image',
  description: 'Add a new image element to the selected page. Supports --copy to copy from existing element',
  usage: '/new-image [--src|-s url] [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees] [--copy id]',
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
      
      // Check for --copy option first
      let copyFromId = '';
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--copy' && i + 1 < args.length) {
          copyFromId = args[i + 1];
          break;
        }
      }
      
      // First pass: extract src to determine dimensions (or get from copy source)
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
      let defaultWidth = 200;
      let defaultHeight = 150;
      
      // If copying from existing element, get its properties first
      if (copyFromId) {
        const sourceElement = findElementById(context.project, copyFromId);
        if (!sourceElement) {
          return {
            success: false,
            message: `❌ **Source Element Not Found**\n\nCannot find element with ID '${copyFromId}' to copy from.`,
            handled: true
          };
        }
        
        // Use source element dimensions as defaults
        defaultWidth = sourceElement.width || defaultWidth;
        defaultHeight = sourceElement.height || defaultHeight;
        srcValue = srcValue || sourceElement.src || '';
      }
      
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
      
      // Image element properties with LocalFile dimensions
      const elementData: any = {
        type: 'image',
        src: srcValue,
        left: Math.floor((canvasWidth - defaultWidth) / 2),
        top: Math.floor((canvasHeight - defaultHeight) / 2),
        width: defaultWidth,
        height: defaultHeight,
        opacity: 1,
        rotation: 0
      };

      // If copying, apply source element properties
      if (copyFromId) {
        const sourceElement = findElementById(context.project, copyFromId);
        if (sourceElement) {
          // Copy all compatible properties using helper
          copyElementProperties(sourceElement, elementData, 'image');
        }
      }

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
                message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/image.jpg"`',
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
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 300`',
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
                message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 250`',
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

          case '--copy':
            // Skip --copy since we handled it earlier
            if (nextArg) {
              i++; // Skip the ID value
            }
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /new-image without arguments to see usage.`,
                handled: true
              };
            }
            break;
        }
      }

      // Validate required src parameter (unless copying from element that has src)
      if (!elementData.src) {
        return {
          success: false,
          message: '❌ **Missing Image Source**\n\nImage source is required.\n\nUsage: `/new-image --src "https://example.com/image.jpg"` or `/new-image --copy element-id`\n\nExample:\n• `/new-image --src "https://picsum.photos/300/200" --width 300 --height 200`',
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
        id: generateElementId('image'),
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

      const copyMessage = copyFromId ? ` (copied from element ID: ${copyFromId})` : '';

      return {
        success: true,
        message: `✅ **Image Element Added**\n\nAdded image element to page "${selectedPage.name}"${copyMessage}\n\n• Source: ${elementData.src}\n• Position: (${elementData.left}, ${elementData.top})\n• Size: ${elementData.width}×${elementData.height}\n• Opacity: ${elementData.opacity}\n• Rotation: ${elementData.rotation}°`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create image element:', error);
      return {
        success: false,
        message: '❌ **Image Creation Failed**\n\nFailed to create image element. Please try again.',
        handled: true
      };
    }
  }
};;
