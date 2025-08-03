/**
 * set-page command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

import { parseDuration } from './helpers';

export const setPageCommand: SlashCommand = {
  name: 'set-page',
  description: 'Set page properties including id, name, duration (supports human-readable formats), background color, and position',
  usage: '/set-page [--id|-i id] [--name|-n name] [--duration|-d duration] [--background-color|-bg color] [--after|-a id|n] [--before|-b id|n]',
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
          message: '❌ **Missing Parameters**\n\nPlease specify at least one option to set.\n\nUsage: `/set-page [--id|-i id] [--name|-n name] [--duration|-d duration] [--background-color|-bg color] [--after|-a id|n] [--before|-b id|n]`\n\nExamples:\n• `/set-page --name "New Title" --duration 3s`\n• `/set-page --duration 1.5m --background-color "#ff0000"`\n• `/set-page --after 1 --name "Moved Page"`',
          handled: true
        };
      }

      // Parse arguments
      const options: {
        id?: string;
        name?: string;
        duration?: number;
        backgroundColor?: string;
        after?: string;
        before?: string;
        targetPageId?: string;
      } = {};

      let targetPageId: string | null = null;
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--id':
          case '-i':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id "page-123"`',
                handled: true
              };
            }
            options.id = nextArg;
            i++; // Skip next arg
            break;

          case '--name':
          case '-n':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--name` requires a value.\n\nExample: `--name "Page Title"`',
                handled: true
              };
            }
            options.name = nextArg;
            i++; // Skip next arg
            break;

          case '--duration':
          case '-d':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--duration` requires a value.\n\nExamples:\n• `--duration 5000` (5000ms)\n• `--duration 5s` (5 seconds)\n• `--duration 1.5m` (1.5 minutes)',
                handled: true
              };
            }
            const duration = parseDuration(nextArg);
            if (duration === null || duration <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Duration**\n\nInvalid duration format: '${nextArg}'\n\nSupported formats:\n• Milliseconds: \`5000\` or \`5000ms\`\n• Seconds: \`5s\` or \`1.5s\`\n• Minutes: \`2m\` or \`1.5m\``,
                handled: true
              };
            }
            options.duration = duration;
            i++; // Skip next arg
            break;

          case '--background-color':
          case '-bg':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--background-color` requires a color value.\n\nExample: `--background-color "#ff0000"` or `--background-color "red"`',
                handled: true
              };
            }
            // Basic color validation (hex, rgb, or CSS color names)
            const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(.*\)|rgba\(.*\)|[a-zA-Z]+)$/;
            if (!colorRegex.test(nextArg)) {
              return {
                success: false,
                message: `❌ **Invalid Color**\n\nInvalid color format: '${nextArg}'\n\nSupported formats:\n• Hex: \`#ff0000\`, \`#f00\`\n• RGB: \`rgb(255,0,0)\`\n• CSS names: \`red\`, \`blue\`, \`white\``,
                handled: true
              };
            }
            options.backgroundColor = nextArg;
            i++; // Skip next arg
            break;

          case '--after':
          case '-a':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--after` requires a page ID or relative position.\n\nExample: `--after "page-123"` or `--after 2`',
                handled: true
              };
            }
            options.after = nextArg;
            i++; // Skip next arg
            break;

          case '--before':
          case '-b':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--before` requires a page ID or relative position.\n\nExample: `--before "page-123"` or `--before 1`',
                handled: true
              };
            }
            options.before = nextArg;
            i++; // Skip next arg
            break;

          default:
            // First non-option argument is treated as target page ID
            if (!arg.startsWith('-') && !targetPageId) {
              targetPageId = arg;
            } else {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option: '${arg}'\n\nAvailable options: \`--id\`, \`--name\`, \`--duration\`, \`--background-color\`, \`--after\`, \`--before\``,
                handled: true
              };
            }
            break;
        }
      }

      const pages = [...context.project.composition.pages];
      let targetPageIndex = -1;

      // Find target page (current page if not specified)
      if (targetPageId) {
        targetPageIndex = pages.findIndex(p => p.id === targetPageId);
        if (targetPageIndex === -1) {
          return {
            success: false,
            message: `❌ **Page Not Found**\n\nPage with ID '${targetPageId}' not found.\n\nAvailable pages: ${pages.map(p => `"${p.id}"`).join(', ')}`,
            handled: true
          };
        }
      } else {
        // Use currently selected page or first page
        const selectedPageId = context.project.appState?.selectedPageId;
        if (selectedPageId) {
          targetPageIndex = pages.findIndex(p => p.id === selectedPageId);
        }
        if (targetPageIndex === -1) {
          targetPageIndex = 0; // Default to first page
        }
      }

      if (targetPageIndex === -1 || !pages[targetPageIndex]) {
        return {
          success: false,
          message: '❌ **No Target Page**\n\nNo page found to modify. Ensure the project has at least one page.',
          handled: true
        };
      }

      const targetPage = { ...pages[targetPageIndex] };
      const originalPage = { ...targetPage };
      let changes: string[] = [];

      // Apply property changes
      if (options.id !== undefined) {
        // Check ID uniqueness
        if (options.id !== targetPage.id && pages.some(p => p.id === options.id)) {
          return {
            success: false,
            message: `❌ **Duplicate ID**\n\nPage ID '${options.id}' already exists. Page IDs must be unique.\n\nExisting IDs: ${pages.map(p => `"${p.id}"`).join(', ')}`,
            handled: true
          };
        }
        targetPage.id = options.id;
        changes.push(`ID: "${originalPage.id}" → "${options.id}"`);
      }

      if (options.name !== undefined) {
        targetPage.name = options.name;
        changes.push(`Name: "${originalPage.name}" → "${options.name}"`);
      }

      if (options.duration !== undefined) {
        targetPage.duration = options.duration;
        const formatDuration = (ms: number): string => {
          if (ms >= 60000 && ms % 60000 === 0) {
            return `${ms / 60000}m`;
          } else if (ms >= 1000 && ms % 1000 === 0) {
            return `${ms / 1000}s`;
          }
          return `${ms}ms`;
        };
        changes.push(`Duration: ${formatDuration(originalPage.duration)} → ${formatDuration(options.duration)}`);
      }

      if (options.backgroundColor !== undefined) {
        targetPage.backgroundColor = options.backgroundColor;
        changes.push(`Background: "${originalPage.backgroundColor || 'default'}" → "${options.backgroundColor}"`);
      }

      // Handle positioning
      let newPageIndex = targetPageIndex;
      if (options.after !== undefined || options.before !== undefined) {
        const positionArg = options.after || options.before;
        const isAfter = options.after !== undefined;

        if (!positionArg) {
          return {
            success: false,
            message: '❌ **Missing Position Value**\n\nPosition argument is required for --after or --before options.',
            handled: true
          };
        }

        // Check if it's a numeric relative position
        const numericValue = parseInt(positionArg, 10);
        if (!isNaN(numericValue) && /^\d+$/.test(positionArg)) {
          // For --after: move numericValue positions forward
          // For --before: move numericValue positions backward  
          const offset = isAfter ? numericValue : -numericValue;
          newPageIndex = Math.max(0, Math.min(pages.length - 1, targetPageIndex + offset));
        } else {
          // Try to find page by ID
          const refPageIndex = pages.findIndex(p => p.id === positionArg);
          if (refPageIndex === -1) {
            return {
              success: false,
              message: `❌ **Reference Page Not Found**\n\nPage with ID '${positionArg}' not found for positioning.\n\nAvailable pages: ${pages.map(p => `"${p.id}"`).join(', ')}`,
              handled: true
            };
          }
          newPageIndex = isAfter ? refPageIndex + 1 : refPageIndex;
          newPageIndex = Math.max(0, Math.min(pages.length - 1, newPageIndex));
        }

        if (newPageIndex !== targetPageIndex) {
          changes.push(`Position: ${targetPageIndex + 1} → ${newPageIndex + 1}`);
        }
      }

      // Apply changes
      pages[targetPageIndex] = targetPage;

      // Handle repositioning
      if (newPageIndex !== targetPageIndex) {
        // Remove from old position
        const [pageToMove] = pages.splice(targetPageIndex, 1);
        // Insert at new position
        pages.splice(newPageIndex, 0, pageToMove);
      }

      // Update project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Generate success message
      const changesText = changes.length > 0 ? changes.join('\n• ') : 'No changes made';
      
      return {
        success: true,
        message: `✅ **Page Updated**\n\nPage "${targetPage.name}" has been updated:\n\n• ${changesText}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to set page properties:', error);
      return {
        success: false,
        message: '❌ **Set Page Failed**\n\nFailed to update page properties. Please try again.',
        handled: true
      };
    }
  }
};;
