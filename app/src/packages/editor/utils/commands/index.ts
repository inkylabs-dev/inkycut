/**
 * Main index file for slash commands system
 * Re-exports all commands and provides command registry functionality
 */

// Export types
export type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

// Import all commands
import { resetCommand } from './reset';
import { importCommand } from './import';
import { exportCommand } from './export';
import { shareCommand } from './share';
import { newPageCommand } from './page-new';
import { delPageCommand } from './page-delete';
import { zoomTimelineCommand } from './timeline-zoom';
import { setPageCommand } from './page-set';
import { setCompCommand } from './composition-set';
import { lsCompCommand } from './composition-list';
import { lsPageCommand } from './page-list';
import { lsFilesCommand } from './file-list';
import { newNoteCommand } from './note-new';
import { lsNotesCommand } from './note-list';
import { setNoteCommand } from './note-set';
import { delNoteCommand } from './note-delete';
import { newTextCommand } from './text-new';
import { newImageCommand } from './image-new';
import { newVideoCommand } from './video-new';
import { newAudioCommand } from './audio-new';
import { delElementCommand } from './element-delete';
import { setTextCommand } from './text-set';
import { setImageCommand } from './image-set';
import { setVideoCommand } from './video-set';
import { setAudioCommand } from './audio-set';
import { delAudioCommand } from './audio-delete';
import { newChatCommand } from './new-chat';
import { delChatCommand } from './del-chat';

import type { SlashCommand, SlashCommandContext, SlashCommandResult } from './types';

/**
 * Registry of available slash commands
 */
const commandRegistry: Map<string, SlashCommand> = new Map([
  ['reset', resetCommand],
  ['import', importCommand],
  ['export', exportCommand],
  ['share', shareCommand],
  ['new-page', newPageCommand],
  ['del-page', delPageCommand],
  ['zoom-tl', zoomTimelineCommand],
  ['set-page', setPageCommand],
  ['set-comp', setCompCommand],
  ['ls-comp', lsCompCommand],
  ['ls-page', lsPageCommand],
  ['ls-files', lsFilesCommand],
  ['new-note', newNoteCommand],
  ['ls-notes', lsNotesCommand],
  ['set-note', setNoteCommand],
  ['del-note', delNoteCommand],
  ['new-text', newTextCommand],
  ['new-image', newImageCommand],
  ['new-video', newVideoCommand],
  ['new-audio', newAudioCommand],
  ['del-elem', delElementCommand],
  ['set-text', setTextCommand],
  ['set-image', setImageCommand],
  ['set-video', setVideoCommand],
  ['set-audio', setAudioCommand],
  ['del-audio', delAudioCommand],
  ['new-chat', newChatCommand],
  ['del-chat', delChatCommand],
]);

/**
 * Parse command arguments with support for quoted strings
 * Handles double quotes to allow multi-word arguments
 */
function parseCommandArguments(argString: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < argString.length) {
    const char = argString[i];
    
    if (char === '"' && !inQuotes) {
      // Start quoted string - don't include the quote
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      // End quoted string - don't include the quote
      inQuotes = false;
    } else if (char === ' ' && !inQuotes) {
      // Space outside quotes - end current argument
      if (current.trim()) {
        args.push(current.trim());
        current = '';
      }
    } else if (char === '\\' && i + 1 < argString.length && argString[i + 1] === '"') {
      // Escaped quote - add the quote to current argument
      current += '"';
      i++; // Skip the next character (the escaped quote)
    } else {
      // Regular character - add to current argument
      current += char;
    }
    
    i++;
  }
  
  // Add final argument if exists
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

/**
 * Parse a message to check if it's a slash command
 */
export function parseSlashCommand(message: string): { isCommand: boolean; commandName?: string; args?: string[] } {
  const trimmed = message.trim();
  
  if (!trimmed.startsWith('/')) {
    return { isCommand: false };
  }
  
  const commandPart = trimmed.slice(1);
  const spaceIndex = commandPart.search(/\s/);
  
  if (spaceIndex === -1) {
    // No arguments - just command name
    return {
      isCommand: true,
      commandName: commandPart.toLowerCase(),
      args: []
    };
  }
  
  const commandName = commandPart.slice(0, spaceIndex).toLowerCase();
  const argString = commandPart.slice(spaceIndex + 1);
  const args = parseCommandArguments(argString);
  
  return {
    isCommand: true,
    commandName,
    args
  };
}

/**
 * Execute a slash command with the given context
 */
export async function executeSlashCommand(
  commandName: string, 
  args: string[], 
  context: SlashCommandContext
): Promise<SlashCommandResult> {
  const command = commandRegistry.get(commandName.toLowerCase());
  
  if (!command) {
    return {
      success: false,
      message: `❌ **Unknown Command**\n\nCommand \`/${commandName}\` not found. Available commands:\n\n${getAvailableCommandsHelp()}`,
      handled: true
    };
  }
  
  // Handle confirmation if required
  if (command.requiresConfirmation) {
    const confirmMessage = command.confirmationMessage || `Are you sure you want to execute /${commandName}?`;
    if (!window.confirm(confirmMessage)) {
      return {
        success: false,
        message: `⏸️ **Command Cancelled**\n\nThe \`/${commandName}\` command was cancelled.`,
        handled: true
      };
    }
  }
  
  // Add args to context for command execution
  const contextWithArgs = { ...context, args };
  
  return await command.execute(contextWithArgs);
}

/**
 * Get help text for all available commands
 */
export function getAvailableCommandsHelp(): string {
  const commands = Array.from(commandRegistry.values());
  
  return commands.map(cmd => 
    `• \`${cmd.usage}\` - ${cmd.description}`
  ).join('\n');
}

/**
 * Get list of available command names for autocomplete
 */
export function getAvailableCommands(): string[] {
  return Array.from(commandRegistry.keys());
}

/**
 * Get command details for autocomplete
 */
export function getAvailableCommandDetails(): Array<{ name: string; description: string; usage: string }> {
  return Array.from(commandRegistry.values()).map(cmd => ({
    name: cmd.name,
    description: cmd.description,
    usage: cmd.usage
  }));
}

/**
 * Fuzzy match slash commands based on user input
 */
export function matchSlashCommands(input: string): Array<{ name: string; description: string; usage: string; score: number }> {
  if (!input.startsWith('/')) {
    return [];
  }
  
  const query = input.slice(1).toLowerCase(); // Remove '/' and convert to lowercase
  
  if (query === '') {
    // Return all commands if no query
    return getAvailableCommandDetails().map(cmd => ({ ...cmd, score: 1 }));
  }
  
  const results = getAvailableCommandDetails()
    .map(cmd => {
      const name = cmd.name.toLowerCase();
      let score = 0;
      
      // Exact match gets highest score
      if (name === query) {
        score = 100;
      }
      // Starts with query gets high score
      else if (name.startsWith(query)) {
        score = 90 - (name.length - query.length); // Prefer shorter matches
      }
      // Contains query gets medium score
      else if (name.includes(query)) {
        score = 70 - name.indexOf(query); // Prefer earlier matches
      }
      // Fuzzy matching - check if all characters of query exist in order
      else {
        let queryIndex = 0;
        for (let i = 0; i < name.length && queryIndex < query.length; i++) {
          if (name[i] === query[queryIndex]) {
            queryIndex++;
          }
        }
        if (queryIndex === query.length) {
          score = 50 - (name.length - query.length); // Prefer shorter matches
        }
      }
      
      return { ...cmd, score };
    })
    .filter(cmd => cmd.score > 0)
    .sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Register a new slash command
 */
export function registerSlashCommand(command: SlashCommand): void {
  commandRegistry.set(command.name.toLowerCase(), command);
}

/**
 * Unregister a slash command
 */
export function unregisterSlashCommand(commandName: string): boolean {
  return commandRegistry.delete(commandName.toLowerCase());
}

/**
 * Check if a command exists
 */
export function hasSlashCommand(commandName: string): boolean {
  return commandRegistry.has(commandName.toLowerCase());
}

// Export individual commands for direct use if needed
export {
  resetCommand,
  importCommand,
  exportCommand,
  shareCommand,
  newPageCommand,
  delPageCommand,
  zoomTimelineCommand,
  setPageCommand,
  setCompCommand,
  lsCompCommand,
  lsPageCommand,
  lsFilesCommand,
  newNoteCommand,
  lsNotesCommand,
  setNoteCommand,
  delNoteCommand,
  newTextCommand,
  newImageCommand,
  newVideoCommand,
  newAudioCommand,
  delElementCommand,
  setTextCommand,
  setImageCommand,
  setVideoCommand,
  setAudioCommand,
  delAudioCommand,
  newChatCommand,
};