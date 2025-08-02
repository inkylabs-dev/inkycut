/**
 * ls-page command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const lsPageCommand: SlashCommand = {
  name: 'ls-page',
  description: 'List detailed information for a specific page or the currently selected page',
  usage: '/ls-page [--id|-i page_id]',
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
      const composition = context.project.composition;
      const pages = composition.pages || [];

      if (pages.length === 0) {
        return {
          success: false,
          message: '❌ **No Pages**\n\nThe composition has no pages. Use `/new-page` to add pages.',
          handled: true
        };
      }

      let targetPageId: string | null = null;
      
      // Parse arguments for page ID
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--id' || arg === '-i') && i + 1 < args.length) {
          targetPageId = args[i + 1];
          break;
        }
      }

      // If no ID provided, use selected page
      if (!targetPageId) {
        targetPageId = context.project.appState?.selectedPageId;
        if (!targetPageId) {
          return {
            success: false,
            message: '❌ **No Page Specified**\n\nNo page ID provided and no page is currently selected.\n\nOptions:\n• Select a page in the editor, then use `/ls-page`\n• Specify a page ID: `/ls-page --id page_id`',
            handled: true
          };
        }
      }

      // Find the target page
      const targetPage = pages.find((page: any) => page.id === targetPageId);
      if (!targetPage) {
        return {
          success: false,
          message: `❌ **Page Not Found**\n\nNo page with ID "${targetPageId}" was found in the composition.\n\nAvailable pages: ${pages.map((p: any) => p.id).join(', ')}`,
          handled: true
        };
      }

      // Return raw page data model
      const message = `\`\`\`json\n${JSON.stringify(targetPage, null, 2)}\n\`\`\``;

      return {
        success: true,
        message,
        handled: true
      };

    } catch (error) {
      console.error('Failed to list page:', error);
      return {
        success: false,
        message: '❌ **List Failed**\n\nFailed to list page information. Please try again.',
        handled: true
      };
    }
  }
};;
