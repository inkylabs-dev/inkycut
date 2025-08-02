/**
 * export command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';


import { performJSONExport } from './helpers';



export const exportCommand: SlashCommand = {
  name: 'export',
  description: 'Export project as JSON, MP4, or WebM. Supports --format/-f and --yes/-y options',
  usage: '/export [--format json|mp4|webm] [--yes]',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      // Default format is json
      let format: 'json' | 'mp4' | 'webm' = 'json';
      let autoExport = false;
      
      // Parse command arguments
      const args = context.args || [];
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        // Handle format options
        if ((arg === '--format' || arg === '-f') && i + 1 < args.length) {
          const formatValue = args[i + 1].toLowerCase();
          if (formatValue === 'json' || formatValue === 'mp4' || formatValue === 'webm') {
            format = formatValue;
          } else {
            return {
              success: false,
              message: `❌ **Invalid Format**\n\nUnsupported format '${formatValue}'. Supported formats: json, mp4, webm`,
              handled: true
            };
          }
          i++; // Skip the format value
        }
        // Handle auto-export options
        else if (arg === '--yes' || arg === '-y') {
          autoExport = true;
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /export [--format json|mp4|webm] [--yes]`,
            handled: true
          };
        }
      }
      
      // If auto-export is requested
      if (autoExport) {
        if (format === 'json') {
          // Perform direct JSON export
          if (!context.fileStorage) {
            return {
              success: false,
              message: '❌ **Export Failed**\n\nFile storage not available for direct export.',
              handled: true
            };
          }
          
          try {
            await performJSONExport(context.project, context.fileStorage);
            return {
              success: true,
              message: `✅ **Export Complete**\n\nProject exported as ${format.toUpperCase()} file and downloaded successfully.`,
              handled: true
            };
          } catch (error) {
            return {
              success: false,
              message: `❌ **Export Failed**\n\n${error instanceof Error ? error.message : 'Failed to export project'}`,
              handled: true
            };
          }
        } else {
          // Video formats not supported for direct export yet
          return {
            success: false,
            message: `❌ **Format Not Supported**\n\n${format.toUpperCase()} direct export is not yet supported. Use \`/export --format ${format}\` to open the export dialog with this format pre-selected.`,
            handled: true
          };
        }
      }
      
      // Open export dialog with pre-selected format
      if (context.setShowExportDialog) {
        // Set the format if provided
        if (context.setExportFormat) {
          context.setExportFormat(format);
        }
        
        context.setShowExportDialog(true);
        
        // Show message only if format was specified
        if (format !== 'json' || args.length > 0) {
          return {
            success: true,
            message: `📤 **Export Dialog Opened**\n\n${format.toUpperCase()} format pre-selected in export dialog.`,
            handled: true
          };
        } else {
          return {
            success: true,
            message: '',
            handled: true
          };
        }
      } else {
        return {
          success: false,
          message: '❌ **Export Unavailable**\n\nExport functionality is not available in this context.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to handle export command:', error);
      return {
        success: false,
        message: '❌ **Export Failed**\n\nFailed to open export dialog. Please try using the Export button in the menu.',
        handled: true
      };
    }
  }
};;
