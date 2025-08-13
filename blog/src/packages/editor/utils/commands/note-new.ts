/**
 * new-note command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';
import { parseTimeValue, formatTimeValue } from './utils';

export const newNoteCommand: SlashCommand = {
  name: 'new-note',
  description: 'Add a new note to the project at the specified time (defaults to current player time)',
  usage: '/new-note --text <text> [--time <time>]',
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

      const args = context.args || [];
      let timeValue: number | null = null;
      let textValue: string | null = null;

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--time' || arg === '-t') && i + 1 < args.length) {
          try {
            timeValue = parseTimeValue(args[i + 1]);
          } catch (error) {
            return {
              success: false,
              message: '❌ **Invalid Time**\n\nTime value must be a number (milliseconds) or end with "s" (seconds).\n\nExample: `--time 1000` or `--time 1.5s`',
              handled: true
            };
          }
          i++; // Skip next argument
        } else if ((arg === '--text' || arg === '-txt') && i + 1 < args.length) {
          textValue = args[i + 1];
          i++; // Skip next argument
        }
      }

      // Validate required arguments
      if (!textValue) {
        return {
          success: false,
          message: '❌ **Missing Text**\n\nNote text is required.\n\nUsage: `/new-note --text <text> [--time <time>]`\n\nExample: `/new-note --text "Add sound effect here"` (uses current player time)\nExample: `/new-note --text "Important scene" --time 1.5s`',
          handled: true
        };
      }

      // Use player current time as default if no time specified
      if (timeValue === null) {
        // Get current player time from project app state
        const currentPlayerTime = context.project.appState?.currentTime || 0;
        timeValue = currentPlayerTime;
      }

      // At this point timeValue should never be null, but add safety check
      const finalTimeValue = timeValue || 0;

      // Generate unique ID for the note
      const noteId = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create new note
      const newNote = {
        id: noteId,
        time: finalTimeValue,
        text: textValue,
        createdAt: new Date().toISOString()
      };

      // Add note to project
      const updatedProject = {
        ...context.project,
        notes: [...(context.project.notes || []), newNote]
      };

      context.updateProject(updatedProject);

      const timeSource = timeValue === (context.project.appState?.currentTime || 0) ? ' (current player time)' : '';

      return {
        success: true,
        message: `✅ **Note Added**\n\nNote "${textValue}" added at time ${formatTimeValue(finalTimeValue)}${timeSource}.\n\nNote ID: \`${noteId}\``,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create note:', error);
      return {
        success: false,
        message: '❌ **Create Failed**\n\nFailed to create note. Please try again.',
        handled: true
      };
    }
  }
};
