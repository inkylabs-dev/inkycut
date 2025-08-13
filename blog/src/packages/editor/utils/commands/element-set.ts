/**
 * set-element command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const setElementCommand: SlashCommand = {
  name: 'set-element',
  description: 'Set element properties including position within the page',
  usage: '/set-element [id] [--id|-i id] [--after|-a id|n] [--before|-b id|n]',
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
          message: '❌ **Missing Parameters**\n\nPlease specify at least one option to set.\n\nUsage: `/set-element [--id|-i id] [--after|-a id|n] [--before|-b id|n]`\n\nExamples:\n• `/set-element --after 1` (move selected element after position 1)\n• `/set-element --id text-123 --before 2` (move specific element before position 2)',
          handled: true
        };
      }

      // Parse arguments
      const options: {
        id?: string;
        after?: string;
        before?: string;
        targetElementId?: string;
      } = {};

      let targetElementId: string | null = null;
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--id':
          case '-i':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id "text-123"`',
                handled: true
              };
            }
            options.id = nextArg;
            i++; // Skip next arg
            break;

          case '--after':
          case '-a':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--after` requires an element ID or position number.\n\nExample: `--after "text-123"` or `--after 2`',
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
                message: '❌ **Missing Value**\n\nOption `--before` requires an element ID or position number.\n\nExample: `--before "text-123"` or `--before 1`',
                handled: true
              };
            }
            options.before = nextArg;
            i++; // Skip next arg
            break;

          default:
            // First non-option argument is treated as target element ID
            if (!arg.startsWith('-') && !targetElementId) {
              targetElementId = arg;
            } else {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option: '${arg}'\n\nAvailable options: \`--id\`, \`--after\`, \`--before\``,
                handled: true
              };
            }
            break;
        }
      }

      // Determine target element ID
      const elementId = options.id || targetElementId || context.project.appState?.selectedElementId;
      
      if (!elementId) {
        return {
          success: false,
          message: '❌ **No Element Specified**\n\nPlease specify an element ID or select an element.\n\nExamples:\n• Select an element and use `/set-element --after 1`\n• Specify ID: `/set-element --id text-123 --before 2`',
          handled: true
        };
      }

      // Find the element and its page
      let foundElement: any = null;
      let foundPage: any = null;
      let elementIndex = -1;
      let pageIndex = -1;

      const pages = [...context.project.composition.pages];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const index = page.elements.findIndex((el: any) => el.id === elementId);
        if (index !== -1) {
          foundElement = page.elements[index];
          foundPage = { ...page };
          elementIndex = index;
          pageIndex = i;
          break;
        }
      }

      if (!foundElement || !foundPage) {
        return {
          success: false,
          message: `❌ **Element Not Found**\n\nElement with ID '${elementId}' not found in the composition.\n\nTip: Check the element ID in the composition structure.`,
          handled: true
        };
      }

      let changes: string[] = [];
      let newElementIndex = elementIndex;

      // Handle positioning
      if (options.after || options.before) {
        const positionArg = options.after || options.before;
        const isAfter = !!options.after;

        if (options.after && options.before) {
          return {
            success: false,
            message: '❌ **Conflicting Options**\n\nCannot specify both `--after` and `--before`. Choose one positioning option.',
            handled: true
          };
        }

        // Check if it's a numeric position
        const numericPosition = parseInt(positionArg!);
        if (!isNaN(numericPosition)) {
          // Position-based (1-indexed)
          const targetPosition = numericPosition - 1; // Convert to 0-indexed
          newElementIndex = isAfter ? Math.min(foundPage.elements.length - 1, targetPosition + 1) : Math.max(0, targetPosition);
        } else {
          // Try to find element by ID within the same page
          const refElementIndex = foundPage.elements.findIndex((el: any) => el.id === positionArg);
          if (refElementIndex === -1) {
            return {
              success: false,
              message: `❌ **Reference Element Not Found**\n\nElement with ID '${positionArg}' not found in the same page for positioning.\n\nAvailable elements: ${foundPage.elements.map((el: any) => `"${el.id}"`).join(', ')}`,
              handled: true
            };
          }
          newElementIndex = isAfter ? refElementIndex + 1 : refElementIndex;
          newElementIndex = Math.max(0, Math.min(foundPage.elements.length - 1, newElementIndex));
        }

        if (newElementIndex !== elementIndex) {
          changes.push(`Position: ${elementIndex + 1} → ${newElementIndex + 1}`);
        }
      }

      // Apply repositioning if needed
      if (newElementIndex !== elementIndex) {
        // Create new elements array with reordered element
        const elements = [...foundPage.elements];
        // Remove from old position
        const [elementToMove] = elements.splice(elementIndex, 1);
        // Insert at new position
        elements.splice(newElementIndex, 0, elementToMove);
        
        // Update the page
        foundPage.elements = elements;
        pages[pageIndex] = foundPage;

        // Update project
        const updatedProject = {
          ...context.project,
          composition: {
            ...context.project.composition,
            pages: pages
          }
        };

        context.updateProject(updatedProject);
      }

      // Generate success message
      const changesText = changes.length > 0 ? changes.join('\n• ') : 'No changes made';
      const elementName = foundElement.type === 'text' ? 
        (foundElement.text ? `"${foundElement.text}"` : 'Text element') :
        (foundElement.src ? foundElement.src.split('/').pop() : `${foundElement.type} element`);
      
      return {
        success: true,
        message: `✅ **Element Updated**\n\nElement ${elementName} (${foundElement.type}) has been updated:\n\n• ${changesText}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to set element properties:', error);
      return {
        success: false,
        message: '❌ **Set Element Failed**\n\nFailed to update element properties. Please try again.',
        handled: true
      };
    }
  }
};