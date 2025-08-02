/**
 * del-audio command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';






export const delAudioCommand: SlashCommand = {
  name: 'del-audio',
  description: 'Delete an audio track from the composition by ID',
  usage: '/del-audio --id|-i audio_id [--yes|-y]',
  requiresConfirmation: true,
  confirmationMessage: 'Are you sure you want to delete this audio track? This action cannot be undone.',
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
      let audioId: string | null = null;
      let skipConfirmation = false;

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--id':
          case '-i':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id audio-123456789-abc123`',
                handled: true
              };
            }
            audioId = nextArg;
            i++; // Skip next arg
            break;

          case '--yes':
          case '-y':
            skipConfirmation = true;
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /del-audio --id audio_id [--yes]`,
                handled: true
              };
            }
            break;
        }
      }

      // Validate required ID parameter
      if (!audioId) {
        return {
          success: false,
          message: '❌ **Missing Audio ID**\n\nAudio track ID is required.\n\nUsage: `/del-audio --id audio_id`\n\nExample: `/del-audio --id audio-123456789-abc123 --yes` (skip confirmation)',
          handled: true
        };
      }

      // Check if audio tracks exist
      if (!context.project.composition.audios || context.project.composition.audios.length === 0) {
        return {
          success: false,
          message: '❌ **No Audio Tracks**\n\nNo audio tracks found in the composition.',
          handled: true
        };
      }

      // Find audio track by ID
      const audioIndex = context.project.composition.audios.findIndex((audio: any) => audio.id === audioId);
      if (audioIndex === -1) {
        return {
          success: false,
          message: `❌ **Audio Track Not Found**\n\nAudio track with ID '${audioId}' not found.\n\nUse \`/list-audio\` to see available audio tracks.`,
          handled: true
        };
      }

      const audioToDelete = context.project.composition.audios[audioIndex];

      // Update project by removing the audio track
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          audios: context.project.composition.audios.filter((audio: any) => audio.id !== audioId)
        }
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Audio Track Deleted**\n\nDeleted audio track '${audioId}':\n\n• Source: ${audioToDelete.src}\n• Volume: ${audioToDelete.volume}\n• Duration: ${audioToDelete.duration}ms`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to delete audio track:', error);
      return {
        success: false,
        message: '❌ **Audio Deletion Failed**\n\nFailed to delete audio track. Please try again.',
        handled: true
      };
    }
  }
};;
