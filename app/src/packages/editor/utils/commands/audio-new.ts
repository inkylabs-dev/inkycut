/**
 * new-audio command
 */

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

import { parseDuration } from './helpers';

export const newAudioCommand: SlashCommand = {
  name: 'new-audio',
  description: 'Add a new audio track to the composition',
  usage: '/new-audio --src|-s url [--volume|-v 0-1] [--trim-before|-b ms] [--trim-after|-a ms] [--playback-rate|-r rate] [--muted|-m] [--loop|-l] [--tone-frequency|-f 0.01-2] [--delay|-d ms] [--duration|-dr ms]',
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
      
      // Default audio track properties
      const audioData: any = {
        id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        src: '',
        volume: 1.0,
        trimBefore: 0,
        trimAfter: 0,
        playbackRate: 1.0,
        muted: false,
        loop: false,
        toneFrequency: 1.0,
        delay: 0,
        duration: 150 // Default 5 seconds at 30fps
      };

      // Get FPS once at the beginning
      const fps = context.project.composition?.fps || 30;

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--src':
          case '-s':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/audio.mp3"`',
                handled: true
              };
            }
            audioData.src = nextArg;
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
            audioData.volume = volume;
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
            audioData.trimBefore = trimBefore;
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
            audioData.trimAfter = trimAfter;
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
            audioData.playbackRate = playbackRate;
            i++; // Skip next arg
            break;

          case '--muted':
          case '-m':
            audioData.muted = true;
            // No argument needed for this flag
            break;

          case '--loop':
          case '-l':
            audioData.loop = true;
            // No argument needed for this flag
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
            audioData.toneFrequency = toneFrequency;
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
            audioData.delay = Math.round(delay);
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
            audioData.duration = Math.round(duration);
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /new-audio without arguments to see usage.`,
                handled: true
              };
            }
            break;
        }
      }

      // Validate required src parameter
      if (!audioData.src) {
        return {
          success: false,
          message: '❌ **Missing Audio Source**\n\nAudio source is required.\n\nUsage: `/new-audio --src "https://example.com/audio.mp3"`\n\nExample:\n• `/new-audio --src "LocalFile:music.mp3" --volume 0.8 --delay 1s`',
          handled: true
        };
      }

      // Initialize audios array if it doesn't exist
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          audios: context.project.composition.audios || []
        }
      };

      // Add new audio track
      updatedProject.composition.audios.push(audioData);

      context.updateProject(updatedProject);

      const formatDuration = (ms: number): string => {
        if (ms >= 60000 && ms % 60000 === 0) return `${ms / 60000}m`;
        if (ms >= 1000 && ms % 1000 === 0) return `${ms / 1000}s`;
        return `${ms}ms`;
      };

      return {
        success: true,
        message: `✅ **Audio Track Added**\n\nAdded new audio track to composition\n\n• ID: ${audioData.id}\n• Source: ${audioData.src}\n• Volume: ${audioData.volume}\n• Delay: ${formatDuration(audioData.delay)}\n• Duration: ${formatDuration(audioData.duration)}\n• Playback Rate: ${audioData.playbackRate}x\n• Muted: ${audioData.muted ? 'Yes' : 'No'}\n• Loop: ${audioData.loop ? 'Yes' : 'No'}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create audio track:', error);
      return {
        success: false,
        message: '❌ **Audio Creation Failed**\n\nFailed to create audio track. Please try again.',
        handled: true
      };
    }
  }
};;
