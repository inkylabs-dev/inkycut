import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

/**
 * New chat command - clears chat history with optional --yes flag
 * Supports --yes/-y for direct clearing without confirmation
 */
export const newChatCommand: SlashCommand = {
  name: 'new-chat',
  description: 'Clear chat history and start fresh. Supports --yes/-y for direct clearing',
  usage: '/new-chat [--yes|-y]',
  requiresConfirmation: false, // We handle confirmation ourselves based on --yes flag
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      let autoConfirm = false;
      
      // Parse command arguments
      const args = context.args || [];
      
      for (const arg of args) {
        // Handle auto-confirm options
        if (arg === '--yes' || arg === '-y') {
          autoConfirm = true;
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /new-chat [--yes]`,
            handled: true
          };
        }
      }
      
      // If --yes flag was provided, clear immediately
      if (autoConfirm) {
        if (context.setChatMessages) {
          context.setChatMessages([
            {
              id: 1,
              role: 'assistant',
              content: 'Chat history cleared! How can I help you with your video project?',
              timestamp: new Date().toISOString()
            }
          ]);
          
          return {
            success: true,
            message: '🗑️ **Chat History Cleared**\n\nChat history has been cleared successfully. Ready for a fresh start!',
            handled: true
          };
        } else {
          return {
            success: false,
            message: '❌ **Clear Failed**\n\nChat clearing functionality is not available in this context.',
            handled: true
          };
        }
      }
      
      // If no --yes flag, ask for confirmation
      return {
        success: false,
        message: '🤔 **Confirm Chat Clear**\n\nThis will clear all chat history and start fresh. Use `/new-chat --yes` to confirm.\n\n💡 *Tip: You can use `/new-chat -y` as a shortcut.*',
        handled: true
      };
      
    } catch (error) {
      console.error('Failed to handle new-chat command:', error);
      return {
        success: false,
        message: '❌ **Command Failed**\n\nFailed to process new-chat command. Please try again.',
        handled: true
      };
    }
  }
};