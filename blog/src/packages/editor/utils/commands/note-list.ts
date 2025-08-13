/**
 * ls-notes command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

export const lsNotesCommand: SlashCommand = {
  name: 'ls-notes',
  description: 'List all notes in the project with optional text search',
  usage: '/ls-notes [--query|-q <search_text>]',
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
      let queryValue: string | null = null;

      // Parse arguments for query
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--query' || arg === '-q') && i + 1 < args.length) {
          queryValue = args[i + 1];
          i++; // Skip next argument
        }
      }

      if (notes.length === 0) {
        return {
          success: true,
          message: '📝 **No Notes**\n\nNo notes found in the project. Use `/new-note` to add notes.',
          handled: true
        };
      }

      // Filter notes by query if provided
      let filteredNotes = notes;
      if (queryValue) {
        const query = queryValue.toLowerCase();
        filteredNotes = notes.filter((note: any) => 
          note.text && note.text.toLowerCase().includes(query)
        );

        if (filteredNotes.length === 0) {
          return {
            success: true,
            message: `📝 **No Matching Notes**\n\nNo notes found matching query "${queryValue}". Total notes in project: ${notes.length}`,
            handled: true
          };
        }
      }

      // Sort notes by time
      filteredNotes.sort((a: any, b: any) => (a.time || 0) - (b.time || 0));

      // Return notes as JSON
      const message = `\`\`\`json\n${JSON.stringify(filteredNotes, null, 2)}\n\`\`\``;

      const resultInfo = queryValue 
        ? `Found ${filteredNotes.length} notes matching "${queryValue}" (of ${notes.length} total)`
        : `Found ${filteredNotes.length} notes`;

      return {
        success: true,
        message: `📝 **Notes List**\n\n${resultInfo}\n\n${message}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to list notes:', error);
      return {
        success: false,
        message: '❌ **List Failed**\n\nFailed to list notes. Please try again.',
        handled: true
      };
    }
  }
};
