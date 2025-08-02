/**
 * del-elem command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';






export const delElementCommand: SlashCommand = {
  name: 'del-elem',
  description: 'Delete an element from the composition by ID or delete the selected element',
  usage: '/del-elem [--id|-i element_id] [--yes|-y]',
  requiresConfirmation: false, // We'll handle confirmation conditionally
  confirmationMessage: 'Are you sure you want to delete this element? This action cannot be undone.',
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
      let skipConfirmation = false;

      // If no arguments provided, try to use the selected element
      if (args.length === 0) {
        const selectedElementId = context.project.appState?.selectedElementId;
        if (selectedElementId) {
          elementId = selectedElementId;
        } else {
          return {
            success: false,
            message: '❌ **No Element Selected**\n\nNo element ID provided and no element is currently selected.\n\nOptions:\n• Select an element in the editor, then use `/del-elem`\n• Specify an element ID: `/del-elem --id element_id`\n\nExamples:\n• `/del-elem` (deletes selected element)\n• `/del-elem --id text-1234567890-abc123`\n• `/del-elem -i image-1234567890-def456`\n• `/del-elem --yes` (deletes selected element without confirmation)',
            handled: true
          };
        }
      } else {
        // Parse arguments when arguments are provided
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          const nextArg = args[i + 1];

          switch (arg) {
            case '--id':
            case '-i':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id text-1234567890-abc123`',
                  handled: true
                };
              }
              elementId = nextArg;
              i++; // Skip next arg
              break;

            case '--yes':
            case '-y':
              skipConfirmation = true;
              break;

            default:
              if (arg.startsWith('-')) {
                return {
                  success: false,
                  message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /del-elem [--id element_id] [--yes]`,
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
          // If --yes was provided but no ID, try to use selected element
          const selectedElementId = context.project.appState?.selectedElementId;
          if (selectedElementId) {
            elementId = selectedElementId;
          } else {
            return {
              success: false,
              message: '❌ **Missing Element ID**\n\nPlease specify an element ID to delete or select an element.\n\nUsage: `/del-elem [--id element_id] [--yes]`\n\nExamples:\n• `/del-elem --yes` (deletes selected element without confirmation)\n• `/del-elem --id text-123 --yes` (deletes specific element without confirmation)',
              handled: true
            };
          }
        }
      }

      // Handle confirmation unless --yes was provided
      if (!skipConfirmation) {
        // Use browser confirmation dialog
        const confirmMessage = 'Are you sure you want to delete this element? This action cannot be undone.';
        if (!confirm(confirmMessage)) {
          return {
            success: false,
            message: '⏸️ **Command Cancelled**\n\nElement deletion was cancelled.',
            handled: true
          };
        }
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
          message: `❌ **Element Not Found**\n\nNo element with ID '${elementId}' was found in the composition.\n\nTip: Use the properties panel to find element IDs, or check the composition structure.`,
          handled: true
        };
      }

      // Remove the element from the page
      foundPage.elements.splice(elementIndex, 1);

      // Update the project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Check if this was the selected element and determine message
      const wasSelected = context.project.appState?.selectedElementId === elementId;
      const deletionMethod = args.length === 0 ? 'selected element' : `element '${elementId}'`;

      // Clear selection if the deleted element was selected
      if (wasSelected) {
        const updatedProjectWithClearedSelection = {
          ...updatedProject,
          appState: {
            ...updatedProject.appState,
            selectedElementId: null
          }
        };
        context.updateProject(updatedProjectWithClearedSelection);
      }

      return {
        success: true,
        message: `✅ **Element Deleted**\n\nDeleted ${deletionMethod} (${foundElement.type}) from page "${foundPage.name}"\n\n• Element ID: ${elementId}\n• Element type: ${foundElement.type}\n• ${foundElement.text ? `Text: "${foundElement.text}"` : foundElement.src ? `Source: ${foundElement.src}` : 'Custom element'}\n• Page: ${foundPage.name}${wasSelected ? '\n• Selection cleared' : ''}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to delete element:', error);
      return {
        success: false,
        message: '❌ **Delete Failed**\n\nFailed to delete element. Please try again.',
        handled: true
      };
    }
  }
};;
