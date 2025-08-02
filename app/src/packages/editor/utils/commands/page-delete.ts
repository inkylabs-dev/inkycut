/**
 * del-page command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';






export const delPageCommand: SlashCommand = {
  name: 'del-page',
  description: 'Delete the selected page and optionally additional pages after it. Supports --num/-n option',
  usage: '/del-page [--num|-n n]',
  requiresConfirmation: true,
  confirmationMessage: 'Are you sure you want to delete the selected page(s)? This action cannot be undone.',
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (!context.project) {
        return {
          success: false,
          message: '❌ **No Project**\n\nNo project is currently loaded. Please create or load a project first.',
          handled: true
        };
      }

      if (!context.project.composition?.pages || context.project.composition.pages.length === 0) {
        return {
          success: false,
          message: '❌ **No Pages**\n\nThere are no pages to delete in this project.',
          handled: true
        };
      }

      let numPages = 1;
      
      // Parse command arguments
      const args = context.args || [];
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        // Handle --num option
        if ((arg === '--num' || arg === '-n') && i + 1 < args.length) {
          const numValue = parseInt(args[i + 1], 10);
          if (isNaN(numValue) || numValue < 1 || numValue > 50) {
            return {
              success: false,
              message: `❌ **Invalid Number**\n\nNumber of pages to delete must be between 1 and 50. Got '${args[i + 1]}'`,
              handled: true
            };
          }
          numPages = numValue;
          i++; // Skip the number value
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /del-page [--num|-n n]`,
            handled: true
          };
        }
      }

      try {
        const updatedProject = { ...context.project };
        const pages = [...updatedProject.composition.pages];
        
        // Find selected page index
        const selectedPageId = updatedProject.appState?.selectedPageId;
        let selectedPageIndex = -1;
        
        if (selectedPageId) {
          selectedPageIndex = pages.findIndex((page: any) => page.id === selectedPageId);
        }
        
        // If no page selected or not found, default to first page
        if (selectedPageIndex === -1) {
          if (pages.length === 0) {
            return {
              success: false,
              message: '❌ **No Pages**\n\nThere are no pages to delete in this project.',
              handled: true
            };
          }
          selectedPageIndex = 0;
        }

        // Calculate how many pages we can actually delete
        const availablePages = pages.length - selectedPageIndex;
        const pagesToDelete = Math.min(numPages, availablePages);
        
        if (pagesToDelete === pages.length) {
          return {
            success: false,
            message: '❌ **Cannot Delete All Pages**\n\nYou cannot delete all pages from the project. At least one page must remain.',
            handled: true
          };
        }

        // Get names of pages being deleted for the success message
        const deletedPageNames = pages.slice(selectedPageIndex, selectedPageIndex + pagesToDelete)
          .map((page: any) => page.name);

        // Remove the pages
        pages.splice(selectedPageIndex, pagesToDelete);
        updatedProject.composition.pages = pages;

        // Update selected page to a valid one
        let newSelectedPage: any = null;
        if (pages.length > 0) {
          // Select the page at the same index, or the last page if index is out of bounds
          const newSelectedIndex = Math.min(selectedPageIndex, pages.length - 1);
          newSelectedPage = pages[newSelectedIndex];
          
          // Update app state
          if (updatedProject.appState && newSelectedPage) {
            updatedProject.appState.selectedPageId = newSelectedPage.id;
          }
        } else {
          // Clear selection if no pages left (though this shouldn't happen due to our check above)
          if (updatedProject.appState) {
            updatedProject.appState.selectedPageId = null;
          }
        }

        // Update the project
        context.updateProject(updatedProject);

        // Select the new page
        if (context.setSelectedPage && newSelectedPage) {
          context.setSelectedPage(newSelectedPage);
        }

        const pagesText = pagesToDelete === 1 ? 'page' : 'pages';
        const pagesList = deletedPageNames.length <= 3 
          ? deletedPageNames.join(', ') 
          : `${deletedPageNames.slice(0, 2).join(', ')} and ${deletedPageNames.length - 2} more`;
        
        return {
          success: true,
          message: `✅ **${pagesToDelete} ${pagesText.charAt(0).toUpperCase() + pagesText.slice(1)} Deleted**\n\nDeleted ${pagesText}: ${pagesList}. ${newSelectedPage ? `"${newSelectedPage.name}" is now selected.` : ''}`,
          handled: true
        };
      } catch (error) {
        console.error('Failed to delete page:', error);
        return {
          success: false,
          message: '❌ **Delete Failed**\n\nFailed to delete page(s). Please try again.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to handle del-page command:', error);
      return {
        success: false,
        message: '❌ **Command Failed**\n\nFailed to process del-page command. Please try again.',
        handled: true
      };
    }
  }
};;
