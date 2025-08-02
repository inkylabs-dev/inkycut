/**
 * ls-comp command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';






export const lsCompCommand: SlashCommand = {
  name: 'ls-comp',
  description: 'List composition overview with basic page information (IDs only)',
  usage: '/ls-comp',
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

      const composition = context.project.composition;
      const pages = composition.pages || [];

      // Build composition overview as JSON
      const compositionData = {
        project: {
          name: context.project.name || 'Untitled Project',
          id: context.project.id
        },
        composition: {
          width: composition.width || 1920,
          height: composition.height || 1080,
          fps: composition.fps || 30,
          totalPages: pages.length
        },
        pages: pages.map((page: any, index: number) => ({
          index: index + 1,
          id: page.id,
          name: page.name || 'Untitled Page',
          duration: page.duration || null,
          durationSeconds: page.duration ? (page.duration / 1000) : null,
          elementCount: page.elements ? page.elements.length : 0
        }))
      };

      const message = `\`\`\`json\n${JSON.stringify(compositionData, null, 2)}\n\`\`\``;

      return {
        success: true,
        message,
        handled: true
      };

    } catch (error) {
      console.error('Failed to list composition:', error);
      return {
        success: false,
        message: '❌ **List Failed**\n\nFailed to list composition information. Please try again.',
        handled: true
      };
    }
  }
};;
