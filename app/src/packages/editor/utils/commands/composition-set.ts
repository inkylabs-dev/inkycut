/**
 * set-comp command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';






export const setCompCommand: SlashCommand = {
  name: 'set-comp',
  description: 'Set composition properties including title, fps, width, and height',
  usage: '/set-comp [--title|-t "title"] [--fps|-f fps] [--width|-w width] [--height|-h height]',
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
      
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ **Missing Parameters**\n\nPlease specify at least one option to set.\n\nUsage: `/set-comp [--title|-t "title"] [--fps|-f fps] [--width|-w width] [--height|-h height]`\n\nExamples:\n• `/set-comp --title "My Video Project" --fps 60`\n• `/set-comp --width 3840 --height 2160`\n• `/set-comp -t "HD Video" -w 1920 -h 1080 -f 30`',
          handled: true
        };
      }

      const updates: any = {};
      let hasUpdates = false;

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--title':
          case '-t':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--title` requires a value.\n\nExample: `--title "My Video Project"`',
                handled: true
              };
            }
            updates.title = nextArg;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          case '--fps':
          case '-f':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--fps` requires a value.\n\nExample: `--fps 60`',
                handled: true
              };
            }
            const fps = parseInt(nextArg, 10);
            if (isNaN(fps) || fps <= 0 || fps > 120) {
              return {
                success: false,
                message: `❌ **Invalid FPS**\n\nFPS must be a positive number between 1 and 120. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.fps = fps;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          case '--width':
          case '-w':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 1920`',
                handled: true
              };
            }
            const width = parseInt(nextArg, 10);
            if (isNaN(width) || width <= 0 || width > 7680) {
              return {
                success: false,
                message: `❌ **Invalid Width**\n\nWidth must be a positive number between 1 and 7680. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.width = width;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          case '--height':
          case '-h':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 1080`',
                handled: true
              };
            }
            const height = parseInt(nextArg, 10);
            if (isNaN(height) || height <= 0 || height > 4320) {
              return {
                success: false,
                message: `❌ **Invalid Height**\n\nHeight must be a positive number between 1 and 4320. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.height = height;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Available options: --title, --fps, --width, --height`,
                handled: true
              };
            }
            break;
        }
      }

      if (!hasUpdates) {
        return {
          success: false,
          message: '❌ **No Updates Specified**\n\nPlease specify at least one property to update.\n\nAvailable options: --title, --fps, --width, --height',
          handled: true
        };
      }

      // Prepare updated project
      const updatedProject = { ...context.project };
      
      // Update project title if specified
      if (updates.title !== undefined) {
        updatedProject.name = updates.title;
      }

      // Update composition properties
      const composition = { ...updatedProject.composition };
      if (updates.fps !== undefined) {
        composition.fps = updates.fps;
      }
      if (updates.width !== undefined) {
        composition.width = updates.width;
      }
      if (updates.height !== undefined) {
        composition.height = updates.height;
      }
      
      updatedProject.composition = composition;

      // Update the project
      context.updateProject(updatedProject);

      // Create summary of changes
      const changesList: string[] = [];
      if (updates.title !== undefined) {
        changesList.push(`Title: "${context.project.name || 'Untitled'}" → "${updates.title}"`);
      }
      if (updates.fps !== undefined) {
        changesList.push(`FPS: ${context.project.composition.fps || 30} → ${updates.fps}`);
      }
      if (updates.width !== undefined) {
        changesList.push(`Width: ${context.project.composition.width || 1920}px → ${updates.width}px`);
      }
      if (updates.height !== undefined) {
        changesList.push(`Height: ${context.project.composition.height || 1080}px → ${updates.height}px`);
      }

      return {
        success: true,
        message: `✅ **Composition Updated**\n\nComposition properties have been updated:\n\n• ${changesList.join('\n• ')}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update composition:', error);
      return {
        success: false,
        message: '❌ **Update Failed**\n\nFailed to update composition properties. Please try again.',
        handled: true
      };
    }
  }
};;
