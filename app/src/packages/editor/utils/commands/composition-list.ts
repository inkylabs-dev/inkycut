/**
 * ls-comp command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const lsCompCommand: SlashCommand = {
  name: 'ls-comp',
  description: 'List composition overview with basic page information (IDs only) or open interactive JSON editor',
  usage: '/ls-comp [--interactive | -i]',
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
      const isInteractive = args.includes('--interactive') || args.includes('-i');

      if (isInteractive) {
        // Open interactive JSON model dialog
        if (context.setShowJsonModelDialog) {
          context.setShowJsonModelDialog(true);
          return {
            success: true,
            message: '📝 **JSON Model Editor Opened**\n\nThe interactive JSON editor has been opened. You can now edit your composition directly.',
            handled: true
          };
        } else {
          return {
            success: false,
            message: '❌ **Interactive Mode Unavailable**\n\nInteractive JSON editing is not available in this context.',
            handled: true
          };
        }
      }

      // Return project.composition as-is
      const composition = context.project.composition;
      const message = `\`\`\`json\n${JSON.stringify(composition, null, 2)}\n\`\`\``;

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
