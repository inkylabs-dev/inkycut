/**
 * new-page command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

import { createDefaultPage } from '../../atoms';

export const newPageCommand: SlashCommand = {
  name: 'new-page',
  description: 'Add blank page(s) after the selected page. Supports --num/-n option to add multiple pages and --copy to copy from existing page',
  usage: '/new-page [--num|-n n] [--copy id]',
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
      let copyFromId = '';
      
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
        // Handle --copy option
        else if (arg === '--copy' && i + 1 < args.length) {
          copyFromId = args[i + 1];
          i++; // Skip the ID value
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /new-page [--num n] [--copy id]`,
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
        
        // Find source page for copying if specified
        let sourcePageTemplate: any = null;
        if (copyFromId) {
          sourcePageTemplate = updatedProject.composition.pages.find((page: any) => page.id === copyFromId);
          if (!sourcePageTemplate) {
            return {
              success: false,
              message: `❌ **Source Page Not Found**\n\nCannot find page with ID '${copyFromId}' to copy from.`,
              handled: true
            };
          }
        }
        
        for (let i = 0; i < numPages; i++) {
          const pageNumber = currentTotalPages + i + 1;
          let newPage: any;
          
          if (sourcePageTemplate) {
            // Copy from source page
            newPage = {
              ...sourcePageTemplate,
              // Override properties that must be unique
              id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `${sourcePageTemplate.name} Copy ${i + 1 === 1 ? '' : i + 1}`.trim(),
              // Deep copy elements to avoid shared references
              elements: sourcePageTemplate.elements.map((element: any) => ({
                ...element,
                id: `${element.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
              }))
            };
          } else {
            // Create default page
            newPage = createDefaultPage();
            newPage.name = `Page ${pageNumber}`;
          }
          
          // Ensure unique ID by regenerating if conflict exists
          while (existingIds.has(newPage.id)) {
            newPage.id = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        const copyMessage = copyFromId ? ` (copied from page "${sourcePageTemplate?.name}")` : '';
        
        return {
          success: true,
          message: `✅ **${numPages} New ${pagesText.charAt(0).toUpperCase() + pagesText.slice(1)} Added**\n\n${numPages} ${pagesText} ${numPages === 1 ? 'has' : 'have'} been added ${insertPosition}${copyMessage}. The first new page is now selected.`,
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
