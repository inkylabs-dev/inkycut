/**
 * share command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

import { performDirectShare } from './helpers';

export const shareCommand: SlashCommand = {
  name: 'share',
  description: 'Share project with a secure link. Supports --yes/-y for direct sharing',
  usage: '/share [--yes]',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      let autoShare = false;
      
      // Parse command arguments
      const args = context.args || [];
      
      for (const arg of args) {
        // Handle auto-share options
        if (arg === '--yes' || arg === '-y') {
          autoShare = true;
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /share [--yes]`,
            handled: true
          };
        }
      }
      
      // If auto-share is requested
      if (autoShare) {
        if (!context.onShare) {
          return {
            success: false,
            message: '❌ **Share Unavailable**\n\nShare functionality is not available in this context.',
            handled: true
          };
        }
        
        try {
          const shareableLink = await performDirectShare(context.project, context.onShare);
          return {
            success: true,
            message: `🔗 **Project Shared Successfully**\n\nYour project has been shared with end-to-end encryption. Here's your secure shareable link:\n\n${shareableLink}\n\nAnyone with this link can view your project. The encryption key is embedded in the URL fragment for security.`,
            handled: true
          };
        } catch (error) {
          return {
            success: false,
            message: `❌ **Share Failed**\n\n${error instanceof Error ? error.message : 'Failed to share project'}`,
            handled: true
          };
        }
      }
      
      // Open share dialog
      if (context.setShowShareDialog) {
        context.setShowShareDialog(true);
        return {
          success: true,
          message: '',
          handled: true
        };
      } else {
        return {
          success: false,
          message: '❌ **Share Unavailable**\n\nShare functionality is not available in this context.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to handle share command:', error);
      return {
        success: false,
        message: '❌ **Share Failed**\n\nFailed to open share dialog. Please try using the Share button in the menu.',
        handled: true
      };
    }
  }
};;
