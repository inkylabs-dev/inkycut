/**
 * import command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const importCommand: SlashCommand = {
  name: 'import',
  description: 'Open the import dialog to import a project from JSON file',
  usage: '/import',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (context.setShowImportDialog) {
        context.setShowImportDialog(true);
        return {
          success: true,
          message: '',
          handled: true
        };
      } else {
        return {
          success: false,
          message: '❌ **Import Unavailable**\n\nImport functionality is not available in this context.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to open import dialog:', error);
      return {
        success: false,
        message: '❌ **Import Failed**\n\nFailed to open import dialog. Please try using the Import button in the menu.',
        handled: true
      };
    }
  }
};;
