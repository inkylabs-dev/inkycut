/**
 * new-page command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

import { createDefaultPage } from '../../atoms';

export const newPageCommand: SlashCommand = {
  name: 'new-page',
  description: 'Add blank page(s) after the selected page. Supports --num/-n option to add multiple pages',
  usage: '/new-page [--num|-n n]',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (!context.project) {
        return {
          success: false,
          message: '❌ **No Project**\n\nNo project is currently loaded. Please create or load a project first.',
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
          if (isNaN(numValue) || numValue < 1 || numValue > 20) {
            return {
              success: false,
              message: `❌ **Invalid Number**\n\nNumber of pages must be between 1 and 20. Got '${args[i + 1]}'`,
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
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /new-page [--num n]`,
            handled: true
          };
        }
      }

      try {
        const updatedProject = { ...context.project };
        
        // Ensure we have pages array
        if (!updatedProject.composition?.pages) {
          updatedProject.composition = {
            ...updatedProject.composition,
            pages: []
          };
        }

        // Find current selected page index
        let insertIndex = 0;
        const selectedPageId = updatedProject.appState?.selectedPageId;
        
        if (selectedPageId && updatedProject.composition.pages.length > 0) {
          const selectedPageIndex = updatedProject.composition.pages.findIndex(
            (page: any) => page.id === selectedPageId
          );
          insertIndex = selectedPageIndex >= 0 ? selectedPageIndex + 1 : updatedProject.composition.pages.length;
        } else {
          // If no page selected, insert after first page (index 1) or at beginning if no pages
          insertIndex = updatedProject.composition.pages.length > 0 ? 1 : 0;
        }

        // Create new pages with sequential naming based on current total
        const newPages: any[] = [];
        const currentTotalPages = updatedProject.composition.pages.length;
        
        // Get existing page IDs to avoid conflicts
        const existingIds = new Set(updatedProject.composition.pages.map((page: any) => page.id));
        
        for (let i = 0; i < numPages; i++) {
          const pageNumber = currentTotalPages + i + 1;
          let newPage = createDefaultPage();
          
          // Set the page name
          newPage.name = `Page ${pageNumber}`;
          
          // Ensure unique ID by regenerating if conflict exists
          while (existingIds.has(newPage.id)) {
            newPage = createDefaultPage();
            newPage.name = `Page ${pageNumber}`;
          }
          
          // Add the new ID to our tracking set
          existingIds.add(newPage.id);
          newPages.push(newPage);
        }

        // Insert new pages at the calculated position
        updatedProject.composition.pages.splice(insertIndex, 0, ...newPages);

        // Update the project
        context.updateProject(updatedProject);

        // Select the first newly created page
        if (context.setSelectedPage && newPages.length > 0) {
          context.setSelectedPage(newPages[0]);
        }

        const pagesText = numPages === 1 ? 'page' : 'pages';
        const insertPosition = insertIndex === 0 ? 'at the beginning' : `after page ${insertIndex}`;
        
        return {
          success: true,
          message: `✅ **${numPages} New ${pagesText.charAt(0).toUpperCase() + pagesText.slice(1)} Added**\n\n${numPages} blank ${pagesText} ${numPages === 1 ? 'has' : 'have'} been added ${insertPosition}. The first new page is now selected.`,
          handled: true
        };
      } catch (error) {
        console.error('Failed to add new page:', error);
        return {
          success: false,
          message: '❌ **Add Page Failed**\n\nFailed to add new page. Please try again.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to handle new-page command:', error);
      return {
        success: false,
        message: '❌ **Command Failed**\n\nFailed to process new-page command. Please try again.',
        handled: true
      };
    }
  }
};;
