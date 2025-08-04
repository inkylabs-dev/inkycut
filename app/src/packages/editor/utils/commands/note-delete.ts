/**
 * del-note command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';
import { formatTimeValue } from './utils';

export const delNoteCommand: SlashCommand = {
  name: 'del-note',
  description: 'Delete a note from the project by ID',
  usage: '/del-note --id <note_id>',
  requiresConfirmation: true,
  confirmationMessage: 'Are you sure you want to delete this note? This action cannot be undone.',
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

      // Parse arguments for note ID
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--id' || arg === '-i') && i + 1 < args.length) {
          noteId = args[i + 1];
          i++; // Skip next argument
        }
      }

      // Validate required arguments
      if (!noteId) {
        return {
          success: false,
          message: '❌ **Missing Note ID**\n\nNote ID is required.\n\nUsage: `/del-note --id <note_id>`\n\nExample: `/del-note --id note-123`\n\nUse `/ls-notes` to see available notes.',
          handled: true
        };
      }

      if (notes.length === 0) {
        return {
          success: false,
          message: '❌ **No Notes**\n\nNo notes found in the project. Use `/new-note` to add notes.',
          handled: true
        };
      }

      // Find the note to delete
      const noteIndex = notes.findIndex((note: any) => note.id === noteId);
      if (noteIndex === -1) {
        return {
          success: false,
          message: `❌ **Note Not Found**\n\nNo note with ID "${noteId}" was found in the project.\n\nAvailable notes: ${notes.map((n: any) => n.id).join(', ')}\n\nUse \`/ls-notes\` to see all notes.`,
          handled: true
        };
      }

      // Get note details for confirmation message
      const noteToDelete = notes[noteIndex];
      const noteText = noteToDelete.text || 'No text';
      const noteTime = noteToDelete.time || 0;

      // Remove the note
      const updatedNotes = notes.filter((note: any) => note.id !== noteId);

      const updatedProject = {
        ...context.project,
        notes: updatedNotes
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Note Deleted**\n\nNote "${noteId}" has been deleted.\n\nDeleted note details:\n• Time: ${formatTimeValue(noteTime)}\n• Text: "${noteText}"\n\nRemaining notes: ${updatedNotes.length}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to delete note:', error);
      return {
        success: false,
        message: '❌ **Delete Failed**\n\nFailed to delete note. Please try again.',
        handled: true
      };
    }
  }
};
