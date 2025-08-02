/**
 * set-image command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const setImageCommand: SlashCommand = {
  name: 'set-image',
  description: 'Modify properties of an image element',
  usage: '/set-image [--id|-i element_id] [--src|-s url] [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees]',
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
      let elementId: string | null = null;
      const updates: any = {};

      // If no arguments provided, try to use the selected element
      if (args.length === 0) {
        const selectedElementId = context.project.appState?.selectedElementId;
        if (selectedElementId) {
          elementId = selectedElementId;
        } else {
          return {
            success: false,
            message: '❌ **No Element Selected**\n\nNo element ID provided and no element is currently selected.\n\nOptions:\n• Select an image element in the editor, then use `/set-image`\n• Specify an element ID: `/set-image --id element_id`\n\nExamples:\n• `/set-image --src "https://example.com/new-image.jpg"`\n• `/set-image --id image-123 --width 300`',
            handled: true
          };
        }
      } else {
        // Parse arguments
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          const nextArg = args[i + 1];

          switch (arg) {
            case '--id':
            case '-i':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id image-1234567890-abc123`',
                  handled: true
                };
              }
              elementId = nextArg;
              i++; // Skip next arg
              break;

            case '--src':
            case '-s':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/image.jpg"`',
                  handled: true
                };
              }
              updates.src = nextArg;
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
              updates.left = left;
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
              updates.top = top;
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
              updates.width = width;
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
              updates.height = height;
              i++; // Skip next arg
              break;

            case '--opacity':
            case '-o':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--opacity` requires a value.\n\nExample: `--opacity 0.8`',
                  handled: true
                };
              }
              const opacity = parseFloat(nextArg);
              if (isNaN(opacity) || opacity < 0 || opacity > 1) {
                return {
                  success: false,
                  message: `❌ **Invalid Opacity**\n\nOpacity must be between 0.0 and 1.0. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.opacity = opacity;
              i++; // Skip next arg
              break;

            case '--rotation':
            case '-r':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--rotation` requires a value.\n\nExample: `--rotation 45`',
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
              updates.rotation = rotation;
              i++; // Skip next arg
              break;

            default:
              if (arg.startsWith('-')) {
                return {
                  success: false,
                  message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /set-image without arguments to see usage.`,
                  handled: true
                };
              }
              // If it's not an option, treat it as the element ID for convenience
              if (!elementId) {
                elementId = arg;
              }
              break;
          }
        }

        // Final check for element ID after parsing arguments
        if (!elementId) {
          const selectedElementId = context.project.appState?.selectedElementId;
          if (selectedElementId) {
            elementId = selectedElementId;
          } else {
            return {
              success: false,
              message: '❌ **Missing Element ID**\n\nPlease specify an element ID or select an element.\n\nUsage: `/set-image [--id element_id] [options...]`\n\nExample: `/set-image --id image-123 --width 300`',
              handled: true
            };
          }
        }
      }

      // Check if we have any updates to apply
      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: '❌ **No Updates Specified**\n\nPlease specify at least one property to update.\n\nAvailable options: --src, --left, --top, --width, --height, --opacity, --rotation',
          handled: true
        };
      }

      // Find the element across all pages
      let foundElement: any = null;
      let foundPage: any = null;
      let elementIndex = -1;

      const pages = context.project.composition.pages || [];
      for (const page of pages) {
        const index = page.elements.findIndex((el: any) => el.id === elementId);
        if (index !== -1) {
          foundElement = page.elements[index];
          foundPage = page;
          elementIndex = index;
          break;
        }
      }

      if (!foundElement) {
        return {
          success: false,
          message: `❌ **Element Not Found**\n\nNo element with ID '${elementId}' was found in the composition.`,
          handled: true
        };
      }

      // Verify it's an image element
      if (foundElement.type !== 'image') {
        return {
          success: false,
          message: `❌ **Wrong Element Type**\n\nElement '${elementId}' is a ${foundElement.type} element, not an image element.\n\nUse:\n• /set-text for text elements\n• /set-image for image elements\n• /set-video for video elements`,
          handled: true
        };
      }

      // Apply updates to the element
      Object.assign(foundElement, updates);

      // Update the project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Create summary of changes
      const changesList = Object.entries(updates).map(([key, value]) => {
        switch (key) {
          case 'src': return `Source: ${value}`;
          case 'left': return `Left: ${value}px`;
          case 'top': return `Top: ${value}px`;
          case 'width': return `Width: ${value}px`;
          case 'height': return `Height: ${value}px`;
          case 'opacity': return `Opacity: ${value}`;
          case 'rotation': return `Rotation: ${value}°`;
          default: return `${key}: ${value}`;
        }
      });

      return {
        success: true,
        message: `✅ **Image Element Updated**\n\nUpdated image element '${elementId}' on page "${foundPage.name}"\n\n• ${changesList.join('\n• ')}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update image element:', error);
      return {
        success: false,
        message: '❌ **Update Failed**\n\nFailed to update image element. Please try again.',
        handled: true
      };
    }
  }
};;
