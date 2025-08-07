/**
 * set-audio command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

import { parseDuration, formatFramesToDuration } from './helpers';

export const setAudioCommand: SlashCommand = {
  name: 'set-audio',
  description: 'Update properties of an existing audio track by ID',
  usage: '/set-audio --id|-i audio_id [--src|-s url] [--volume|-v 0-1] [--trim-before|-b ms] [--trim-after|-a ms] [--playback-rate|-r rate] [--muted|-m true|false] [--loop|-l true|false] [--tone-frequency|-f 0.01-2] [--delay|-d ms] [--duration|-dr ms] [--before|-be positions] [--after|-af positions]',
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
      
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ **Missing Parameters**\n\nPlease specify audio track ID and at least one property to update.\n\nUsage: `/set-audio --id audio_id [options]`\n\nExample: `/set-audio --id audio-123456789-abc123 --volume 0.5 --delay 2s`',
          handled: true
        };
      }

      let audioId: string | null = null;
      const updates: any = {};
      let moveOperation: { type: 'before' | 'after'; positions: number } | null = null;

      // Get FPS once at the beginning
      const fps = context.project.composition?.fps || 30;

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

          case '--src':
          case '-s':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/audio.mp3"`',
                handled: true
              };
            }
            updates.src = nextArg;
            i++; // Skip next arg
            break;

          case '--volume':
          case '-v':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--volume` requires a value between 0 and 1.\n\nExample: `--volume 0.8`',
                handled: true
              };
            }
            const volume = parseFloat(nextArg);
            if (isNaN(volume) || volume < 0 || volume > 1) {
              return {
                success: false,
                message: `❌ **Invalid Volume**\n\nVolume must be between 0 and 1. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.volume = volume;
            i++; // Skip next arg
            break;

          case '--trim-before':
          case '-b':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--trim-before` requires a value in milliseconds.\n\nExample: `--trim-before 1000`',
                handled: true
              };
            }
            const trimBefore = parseDuration(nextArg, fps);
            if (trimBefore === null || trimBefore < 0) {
              return {
                success: false,
                message: `❌ **Invalid Trim Before**\n\nTrim before must be a non-negative duration. Got '${nextArg}'\n\nSupported formats: \`1000\`, \`1s\`, \`1.5s\``,
                handled: true
              };
            }
            updates.trimBefore = trimBefore;
            i++; // Skip next arg
            break;

          case '--trim-after':
          case '-a':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--trim-after` requires a value in milliseconds.\n\nExample: `--trim-after 1000`',
                handled: true
              };
            }
            const trimAfter = parseDuration(nextArg, fps);
            if (trimAfter === null || trimAfter < 0) {
              return {
                success: false,
                message: `❌ **Invalid Trim After**\n\nTrim after must be a non-negative duration. Got '${nextArg}'\n\nSupported formats: \`1000\`, \`1s\`, \`1.5s\``,
                handled: true
              };
            }
            updates.trimAfter = trimAfter;
            i++; // Skip next arg
            break;

          case '--playback-rate':
          case '-r':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--playback-rate` requires a value.\n\nExample: `--playback-rate 1.5` (1.5x speed)',
                handled: true
              };
            }
            const playbackRate = parseFloat(nextArg);
            if (isNaN(playbackRate) || playbackRate <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Playback Rate**\n\nPlayback rate must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.playbackRate = playbackRate;
            i++; // Skip next arg
            break;

          case '--muted':
          case '-m':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--muted` requires a value (true or false).\n\nExample: `--muted true`',
                handled: true
              };
            }
            if (nextArg === 'true') {
              updates.muted = true;
            } else if (nextArg === 'false') {
              updates.muted = false;
            } else {
              return {
                success: false,
                message: `❌ **Invalid Muted Value**\n\nMuted must be 'true' or 'false'. Got '${nextArg}'`,
                handled: true
              };
            }
            i++; // Skip next arg
            break;

          case '--loop':
          case '-l':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--loop` requires a value (true or false).\n\nExample: `--loop true`',
                handled: true
              };
            }
            if (nextArg === 'true') {
              updates.loop = true;
            } else if (nextArg === 'false') {
              updates.loop = false;
            } else {
              return {
                success: false,
                message: `❌ **Invalid Loop Value**\n\nLoop must be 'true' or 'false'. Got '${nextArg}'`,
                handled: true
              };
            }
            i++; // Skip next arg
            break;

          case '--tone-frequency':
          case '-f':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--tone-frequency` requires a value between 0.01 and 2.\n\nExample: `--tone-frequency 1.2`',
                handled: true
              };
            }
            const toneFrequency = parseFloat(nextArg);
            if (isNaN(toneFrequency) || toneFrequency < 0.01 || toneFrequency > 2) {
              return {
                success: false,
                message: `❌ **Invalid Tone Frequency**\n\nTone frequency must be between 0.01 and 2. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.toneFrequency = toneFrequency;
            i++; // Skip next arg
            break;

          case '--delay':
          case '-d':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--delay` requires a value in milliseconds.\n\nExample: `--delay 2000` (2 seconds)',
                handled: true
              };
            }
            const delay = parseDuration(nextArg, fps);
            if (delay === null || delay < 0) {
              return {
                success: false,
                message: `❌ **Invalid Delay**\n\nDelay must be a non-negative duration. Got '${nextArg}'\n\nSupported formats: \`1000\`, \`1s\`, \`2m\``,
                handled: true
              };
            }
            updates.delay = Math.round(delay);
            i++; // Skip next arg
            break;

          case '--duration':
          case '-dr':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--duration` requires a value in milliseconds.\n\nExample: `--duration 10000` (10 seconds)',
                handled: true
              };
            }
            const duration = parseDuration(nextArg, fps);
            if (duration === null || duration <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Duration**\n\nDuration must be a positive duration. Got '${nextArg}'\n\nSupported formats: \`5000\`, \`5s\`, \`1.5m\``,
                handled: true
              };
            }
            updates.duration = Math.round(duration);
            i++; // Skip next arg
            break;

          case '--before':
          case '-be':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--before` requires a number of positions.\n\nExample: `--before 1`',
                handled: true
              };
            }
            const beforePositions = parseInt(nextArg);
            if (isNaN(beforePositions) || beforePositions <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Before Positions**\n\nBefore positions must be a positive integer. Got '${nextArg}'`,
                handled: true
              };
            }
            moveOperation = { type: 'before', positions: beforePositions };
            i++; // Skip next arg
            break;

          case '--after':
          case '-af':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--after` requires a number of positions.\n\nExample: `--after 1`',
                handled: true
              };
            }
            const afterPositions = parseInt(nextArg);
            if (isNaN(afterPositions) || afterPositions <= 0) {
              return {
                success: false,
                message: `❌ **Invalid After Positions**\n\nAfter positions must be a positive integer. Got '${nextArg}'`,
                handled: true
              };
            }
            moveOperation = { type: 'after', positions: afterPositions };
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /set-audio without arguments to see usage.`,
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
          message: '❌ **Missing Audio ID**\n\nAudio track ID is required.\n\nUsage: `/set-audio --id audio_id [options]`',
          handled: true
        };
      }

      // Check if we have updates or move operations
      if (Object.keys(updates).length === 0 && !moveOperation) {
        return {
          success: false,
          message: '❌ **No Updates Specified**\n\nPlease specify at least one property to update or movement operation.\n\nAvailable options: --src, --volume, --trim-before, --trim-after, --playback-rate, --muted, --loop, --tone-frequency, --delay, --duration, --before, --after',
          handled: true
        };
      }

      // Check if audio tracks exist
      if (!context.project.composition.audios || context.project.composition.audios.length === 0) {
        return {
          success: false,
          message: '❌ **No Audio Tracks**\n\nNo audio tracks found in the composition. Use `/new-audio` to create one first.',
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

      // Create updated project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          audios: [...context.project.composition.audios]
        }
      };

      let message = '';
      let changesList: string[] = [];

      // Handle move operations
      if (moveOperation) {
        const audios = updatedProject.composition.audios;
        const audioToMove = audios[audioIndex];
        
        // Remove the audio from its current position
        audios.splice(audioIndex, 1);
        
        // Calculate new index based on the move operation
        let newIndex: number;
        if (moveOperation.type === 'before') {
          newIndex = Math.max(0, audioIndex - moveOperation.positions);
        } else { // 'after'
          newIndex = Math.min(audios.length, audioIndex + moveOperation.positions);
        }
        
        // Insert the audio at the new position
        audios.splice(newIndex, 0, audioToMove);
        
        message = `✅ **Audio Track Moved**\n\nMoved audio track '${audioId}' ${moveOperation.positions} position${moveOperation.positions !== 1 ? 's' : ''} ${moveOperation.type}.\n\nNew position: ${newIndex + 1} of ${audios.length}`;
      }

      // Handle property updates
      if (Object.keys(updates).length > 0) {
        const originalAudio = updatedProject.composition.audios.find((audio: any) => audio.id === audioId);
        const audioIndex = updatedProject.composition.audios.findIndex((audio: any) => audio.id === audioId);
        
        if (originalAudio && audioIndex !== -1) {
          updatedProject.composition.audios[audioIndex] = {
            ...originalAudio,
            ...updates
          };

          // Create summary of property changes
          Object.keys(updates).forEach(key => {
            const oldValue = (originalAudio as any)[key];
            const newValue = updates[key];
            
            if (key === 'delay' || key === 'duration' || key === 'trimBefore' || key === 'trimAfter') {
              changesList.push(`${key}: ${formatFramesToDuration(oldValue, fps)} → ${formatFramesToDuration(newValue, fps)}`);
            } else {
              changesList.push(`${key}: ${oldValue} → ${newValue}`);
            }
          });
          
          if (moveOperation) {
            message += `\n\n**Properties Updated:**\n\n• ${changesList.join('\n• ')}`;
          } else {
            message = `✅ **Audio Track Updated**\n\nUpdated audio track '${audioId}' properties:\n\n• ${changesList.join('\n• ')}`;
          }
        }
      }

      context.updateProject(updatedProject);

      return {
        success: true,
        message,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update audio track:', error);
      return {
        success: false,
        message: '❌ **Audio Update Failed**\n\nFailed to update audio track. Please try again.',
        handled: true
      };
    }
  }
};;
