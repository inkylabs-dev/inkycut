/**
 * Client-side Slash Commands System
 * 
 * This module handles client-side slash commands that execute immediately
 * without sending anything to the server. Commands are processed locally
 * and can interact with the project state through provided context.
 */

import { createDefaultProject } from '../atoms';

export interface SlashCommandContext {
  project: any;
  updateProject: (project: any) => void;
  addMessage: (content: string) => void;
  clearAllFiles?: () => Promise<void>;
  setChatMessages?: (messages: any[]) => void;
  setSelectedPage?: (page: any) => void;
  setSelectedElement?: (element: any) => void;
  setIsSharedProject?: (isShared: boolean) => void;
  setShowImportDialog?: (show: boolean) => void;
}

export interface SlashCommandResult {
  success: boolean;
  message: string;
  handled: boolean;
}

export interface SlashCommand {
  name: string;
  description: string;
  usage: string;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
  execute: (context: SlashCommandContext) => Promise<SlashCommandResult>;
}

/**
 * Reset project command - equivalent to clicking "Reset Project"
 */
const resetCommand: SlashCommand = {
  name: 'reset',
  description: 'Reset the project to its default state, clearing all files and chat history',
  usage: '/reset',
  requiresConfirmation: true,
  confirmationMessage: 'Are you sure you want to reset the project? All unsaved changes and files will be lost.',
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      // Clear all files from current storage (only for local projects)
      if (context.clearAllFiles) {
        await context.clearAllFiles();
      }
      
      // Create a new project with default settings
      const newProject = createDefaultProject('Untitled Project');
      
      // Keep the current project ID if available
      if (context.project?.id) {
        newProject.id = context.project.id;
      }
      
      // Reset to local project mode
      if (context.setIsSharedProject) {
        context.setIsSharedProject(false);
      }
      
      // Reset the project
      context.updateProject(newProject);
      
      // Update selected page to the first page of the new project
      if (context.setSelectedPage && newProject.composition.pages.length > 0) {
        context.setSelectedPage(newProject.composition.pages[0]);
      }
      
      // Clear selected element
      if (context.setSelectedElement) {
        context.setSelectedElement(null);
      }
      
      // Clear chat history and reset to welcome message
      if (context.setChatMessages) {
        context.setChatMessages([
          {
            id: 1,
            role: 'assistant',
            content: 'Welcome to Vibe Video Cut! I\'m your AI assistant. How can I help you create amazing videos today?',
            timestamp: new Date().toISOString()
          }
        ]);
      }
      
      return {
        success: true,
        message: '',
        handled: true
      };
    } catch (error) {
      console.error('Failed to reset project:', error);
      return {
        success: false,
        message: '❌ **Reset Failed**\n\nFailed to reset project. Please try again or use the Reset Project button in the menu.',
        handled: true
      };
    }
  }
};

/**
 * Import project command - opens the ImportDialog
 */
const importCommand: SlashCommand = {
  name: 'import',
  description: 'Open the import dialog to import a project from JSON file',
  usage: '/import',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (context.setShowImportDialog) {
        context.setShowImportDialog(true);
        return {
          success: true,
          message: '',
          handled: true
        };
      } else {
        return {
          success: false,
          message: '❌ **Import Unavailable**\n\nImport functionality is not available in this context.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to open import dialog:', error);
      return {
        success: false,
        message: '❌ **Import Failed**\n\nFailed to open import dialog. Please try using the Import button in the menu.',
        handled: true
      };
    }
  }
};

/**
 * Registry of available slash commands
 */
const commandRegistry: Map<string, SlashCommand> = new Map([
  ['reset', resetCommand],
  ['import', importCommand]
]);

/**
 * Parse a message to check if it's a slash command
 */
export function parseSlashCommand(message: string): { isCommand: boolean; commandName?: string; args?: string[] } {
  const trimmed = message.trim();
  
  if (!trimmed.startsWith('/')) {
    return { isCommand: false };
  }
  
  const parts = trimmed.slice(1).split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);
  
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
  
  return await command.execute(context);
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