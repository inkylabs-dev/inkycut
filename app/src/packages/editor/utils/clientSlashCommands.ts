/**
 * Client-side Slash Commands System
 * 
 * This module handles client-side slash commands that execute immediately
 * without sending anything to the server. Commands are processed locally
 * and can interact with the project state through provided context.
 */

import { createDefaultProject } from '../atoms';

/**
 * Helper function to perform JSON export directly
 */
async function performJSONExport(project: any, fileStorage: any): Promise<void> {
  if (!project) {
    throw new Error('No project to export');
  }

  try {
    // Get files from current storage to include in export
    const filesFromStorage = await fileStorage.getAllFiles();
    
    // Ensure the project has all required fields before export
    const completeProject = {
      ...project,
      // Ensure required fields are present
      id: project.id || `project-${Date.now()}`,
      name: project.name || 'Untitled Project',
      createdAt: project.createdAt || new Date().toISOString(),
      updatedAt: project.updatedAt || new Date().toISOString(),
      propertiesEnabled: project.propertiesEnabled ?? true,
      // Ensure composition has all required fields
      composition: project.composition ? {
        pages: project.composition.pages || [],
        fps: project.composition.fps || 30,
        width: project.composition.width || 1920,
        height: project.composition.height || 1080
      } : {
        pages: [],
        fps: 30,
        width: 1920,
        height: 1080
      },
      // Ensure appState exists
      appState: project.appState || {
        selectedElementId: null,
        selectedPageId: null,
        viewMode: 'edit' as const,
        zoomLevel: 1,
        showGrid: false,
        isLoading: false,
        error: null,
        history: { past: [], future: [] }
      },
      // Include files from IndexedDB in the exported JSON
      files: filesFromStorage,
      // Preserve metadata
      metadata: project.metadata || {}
    };

    // Create JSON blob
    const jsonData = JSON.stringify(completeProject, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${completeProject.name}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export project');
  }
}

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
  setShowExportDialog?: (show: boolean) => void;
  setExportFormat?: (format: 'json' | 'mp4' | 'webm') => void;
  triggerExport?: () => void;
  fileStorage?: any;
  args?: string[];
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
 * Export project command - opens ExportDialog or performs direct export
 * Supports format options: --format/-f (json|mp4|webm)
 * Supports auto-export: --yes/-y (skip dialog, export directly)
 */
const exportCommand: SlashCommand = {
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
};

/**
 * Registry of available slash commands
 */
const commandRegistry: Map<string, SlashCommand> = new Map([
  ['reset', resetCommand],
  ['import', importCommand],
  ['export', exportCommand]
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