/**
 * set-note command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';
import { parseTimeValue, formatTimeValue } from './utils';

export const setNoteCommand: SlashCommand = {
  name: 'set-note',
  description: 'Modify properties of an existing note',
  usage: '/set-note --id <note_id> [--time <time>] [--text <text>]',
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
      const notes = context.project.notes || [];
      let noteId: string | null = null;
      let timeValue: number | null = null;
      let textValue: string | null = null;

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--id' || arg === '-i') && i + 1 < args.length) {
          noteId = args[i + 1];
          i++; // Skip next argument
        } else if ((arg === '--time' || arg === '-t') && i + 1 < args.length) {
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
      if (!noteId) {
        return {
          success: false,
          message: '❌ **Missing Note ID**\n\nNote ID is required.\n\nUsage: `/set-note --id <note_id> [--time <time>] [--text <text>]`\n\nExample: `/set-note --id note-123 --text "Updated text"`',
          handled: true
        };
      }

      // Check if at least one property is being updated
      if (timeValue === null && textValue === null) {
        return {
          success: false,
          message: '❌ **No Changes Specified**\n\nAt least one property must be specified to update.\n\nUsage: `/set-note --id <note_id> [--time <time>] [--text <text>]`',
          handled: true
        };
      }

      // Find the note to update
      const noteIndex = notes.findIndex((note: any) => note.id === noteId);
      if (noteIndex === -1) {
        return {
          success: false,
          message: `❌ **Note Not Found**\n\nNo note with ID "${noteId}" was found in the project.\n\nUse \`/ls-notes\` to see available notes.`,
          handled: true
        };
      }

      // Update the note
      const updatedNote = { ...notes[noteIndex] };
      const changes: string[] = [];

      if (timeValue !== null) {
        updatedNote.time = timeValue;
        changes.push(`time: ${formatTimeValue(timeValue)}`);
      }

      if (textValue !== null) {
        updatedNote.text = textValue;
        changes.push(`text: "${textValue}"`);
      }

      updatedNote.updatedAt = new Date().toISOString();

      // Update the project
      const updatedNotes = [...notes];
      updatedNotes[noteIndex] = updatedNote;

      const updatedProject = {
        ...context.project,
        notes: updatedNotes
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Note Updated**\n\nNote "${noteId}" updated:\n${changes.map(change => `• ${change}`).join('\n')}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update note:', error);
      return {
        success: false,
        message: '❌ **Update Failed**\n\nFailed to update note. Please try again.',
        handled: true
      };
    }
  }
};
