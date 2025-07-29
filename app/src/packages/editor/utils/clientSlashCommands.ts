/**
 * Client-side Slash Commands System
 * 
 * This module handles client-side slash commands that execute immediately
 * without sending anything to the server. Commands are processed locally
 * and can interact with the project state through provided context.
 */

import { createDefaultProject, createDefaultPage } from '../atoms';
import { generateKey, exportKey, encryptData, generateShareableKey } from './encryptionUtils';

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

/**
 * Helper function to parse human-readable duration strings
 * Supports: ms (default), s (seconds), m (minutes)
 * Examples: "1000", "1.5s", "2m", "500ms"
 */
function parseDuration(durationStr: string): number | null {
  const trimmed = durationStr.trim();
  
  // If it's just a number, treat as milliseconds
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const ms = parseFloat(trimmed);
    return ms > 0 ? ms : null;
  }
  
  // Parse with unit suffix
  const match = trimmed.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/i);
  if (!match) {
    return null;
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  if (value <= 0) {
    return null;
  }
  
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Helper function to perform direct sharing
 */
async function performDirectShare(project: any, onShare: any): Promise<string> {
  if (!project) {
    throw new Error('No project to share');
  }

  if (!onShare) {
    throw new Error('Share functionality not available');
  }

  try {
    // Generate encryption key
    const key = await generateKey();
    const keyBase64 = await exportKey(key);
    const shareableKey = generateShareableKey(keyBase64);

    // Prepare project data for sharing (include files in encrypted data)
    const projectToShare = {
      ...project,
      // Include files in encrypted data for full project sharing
      files: project.files || [],
      appState: {
        selectedElementId: null,
        selectedPageId: project.composition?.pages?.[0]?.id || null,
        viewMode: 'view' as const,
        zoomLevel: 1,
        showGrid: false,
        isLoading: false,
        error: null,
        history: { past: [], future: [] }
      }
    };

    // Encrypt the project data
    const projectJson = JSON.stringify(projectToShare);
    const { encrypted, iv } = await encryptData(projectJson, key);

    // Combine encrypted data and IV
    const encryptedPayload = JSON.stringify({ encrypted, iv });

    // Call backend API to upload to S3 and get share ID
    const shareResponse = await onShare({
      encryptedData: encryptedPayload,
      projectName: project.name || 'Untitled Project'
    });

    const { shareId } = shareResponse;

    // Generate and return the shareable link
    const shareableLink = `${window.location.origin}/shared/${shareId}#key=${shareableKey}`;
    return shareableLink;
  } catch (error) {
    console.error('Share failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to share project');
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
  setShowShareDialog?: (show: boolean) => void;
  onShare?: (args: { encryptedData: string; projectName: string }) => Promise<{ shareId: string }>;
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
 * Share project command - opens ShareDialog or performs direct sharing
 * Supports auto-share: --yes/-y (skip dialog, share directly and return URL)
 */
const shareCommand: SlashCommand = {
  name: 'share',
  description: 'Share project with a secure link. Supports --yes/-y for direct sharing',
  usage: '/share [--yes]',
  requiresConfirmation: false,
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      let autoShare = false;
      
      // Parse command arguments
      const args = context.args || [];
      
      for (const arg of args) {
        // Handle auto-share options
        if (arg === '--yes' || arg === '-y') {
          autoShare = true;
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /share [--yes]`,
            handled: true
          };
        }
      }
      
      // If auto-share is requested
      if (autoShare) {
        if (!context.onShare) {
          return {
            success: false,
            message: '❌ **Share Unavailable**\n\nShare functionality is not available in this context.',
            handled: true
          };
        }
        
        try {
          const shareableLink = await performDirectShare(context.project, context.onShare);
          return {
            success: true,
            message: `🔗 **Project Shared Successfully**\n\nYour project has been shared with end-to-end encryption. Here's your secure shareable link:\n\n${shareableLink}\n\nAnyone with this link can view your project. The encryption key is embedded in the URL fragment for security.`,
            handled: true
          };
        } catch (error) {
          return {
            success: false,
            message: `❌ **Share Failed**\n\n${error instanceof Error ? error.message : 'Failed to share project'}`,
            handled: true
          };
        }
      }
      
      // Open share dialog
      if (context.setShowShareDialog) {
        context.setShowShareDialog(true);
        return {
          success: true,
          message: '',
          handled: true
        };
      } else {
        return {
          success: false,
          message: '❌ **Share Unavailable**\n\nShare functionality is not available in this context.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to handle share command:', error);
      return {
        success: false,
        message: '❌ **Share Failed**\n\nFailed to open share dialog. Please try using the Share button in the menu.',
        handled: true
      };
    }
  }
};

/**
 * Add new page command - adds blank pages after the selected page
 * Supports --num option to add multiple pages at once
 */
const newPageCommand: SlashCommand = {
  name: 'new-page',
  description: 'Add blank page(s) after the selected page. Supports --num/-n option to add multiple pages',
  usage: '/new-page [--num|-n n]',
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

      let numPages = 1;
      
      // Parse command arguments
      const args = context.args || [];
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        // Handle --num option
        if ((arg === '--num' || arg === '-n') && i + 1 < args.length) {
          const numValue = parseInt(args[i + 1], 10);
          if (isNaN(numValue) || numValue < 1 || numValue > 20) {
            return {
              success: false,
              message: `❌ **Invalid Number**\n\nNumber of pages must be between 1 and 20. Got '${args[i + 1]}'`,
              handled: true
            };
          }
          numPages = numValue;
          i++; // Skip the number value
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /new-page [--num n]`,
            handled: true
          };
        }
      }

      try {
        const updatedProject = { ...context.project };
        
        // Ensure we have pages array
        if (!updatedProject.composition?.pages) {
          updatedProject.composition = {
            ...updatedProject.composition,
            pages: []
          };
        }

        // Find current selected page index
        let insertIndex = 0;
        const selectedPageId = updatedProject.appState?.selectedPageId;
        
        if (selectedPageId && updatedProject.composition.pages.length > 0) {
          const selectedPageIndex = updatedProject.composition.pages.findIndex(
            (page: any) => page.id === selectedPageId
          );
          insertIndex = selectedPageIndex >= 0 ? selectedPageIndex + 1 : updatedProject.composition.pages.length;
        } else {
          // If no page selected, insert after first page (index 1) or at beginning if no pages
          insertIndex = updatedProject.composition.pages.length > 0 ? 1 : 0;
        }

        // Create new pages with sequential naming based on current total
        const newPages: any[] = [];
        const currentTotalPages = updatedProject.composition.pages.length;
        
        // Get existing page IDs to avoid conflicts
        const existingIds = new Set(updatedProject.composition.pages.map((page: any) => page.id));
        
        for (let i = 0; i < numPages; i++) {
          const pageNumber = currentTotalPages + i + 1;
          let newPage = createDefaultPage();
          
          // Set the page name
          newPage.name = `Page ${pageNumber}`;
          
          // Ensure unique ID by regenerating if conflict exists
          while (existingIds.has(newPage.id)) {
            newPage = createDefaultPage();
            newPage.name = `Page ${pageNumber}`;
          }
          
          // Add the new ID to our tracking set
          existingIds.add(newPage.id);
          newPages.push(newPage);
        }

        // Insert new pages at the calculated position
        updatedProject.composition.pages.splice(insertIndex, 0, ...newPages);

        // Update the project
        context.updateProject(updatedProject);

        // Select the first newly created page
        if (context.setSelectedPage && newPages.length > 0) {
          context.setSelectedPage(newPages[0]);
        }

        const pagesText = numPages === 1 ? 'page' : 'pages';
        const insertPosition = insertIndex === 0 ? 'at the beginning' : `after page ${insertIndex}`;
        
        return {
          success: true,
          message: `✅ **${numPages} New ${pagesText.charAt(0).toUpperCase() + pagesText.slice(1)} Added**\n\n${numPages} blank ${pagesText} ${numPages === 1 ? 'has' : 'have'} been added ${insertPosition}. The first new page is now selected.`,
          handled: true
        };
      } catch (error) {
        console.error('Failed to add new page:', error);
        return {
          success: false,
          message: '❌ **Add Page Failed**\n\nFailed to add new page. Please try again.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to handle new-page command:', error);
      return {
        success: false,
        message: '❌ **Command Failed**\n\nFailed to process new-page command. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Delete page command - removes selected page and optionally additional pages
 * Supports --num option to delete multiple consecutive pages
 */
const delPageCommand: SlashCommand = {
  name: 'del-page',
  description: 'Delete the selected page and optionally additional pages after it. Supports --num/-n option',
  usage: '/del-page [--num|-n n]',
  requiresConfirmation: true,
  confirmationMessage: 'Are you sure you want to delete the selected page(s)? This action cannot be undone.',
  execute: async (context: SlashCommandContext): Promise<SlashCommandResult> => {
    try {
      if (!context.project) {
        return {
          success: false,
          message: '❌ **No Project**\n\nNo project is currently loaded. Please create or load a project first.',
          handled: true
        };
      }

      if (!context.project.composition?.pages || context.project.composition.pages.length === 0) {
        return {
          success: false,
          message: '❌ **No Pages**\n\nThere are no pages to delete in this project.',
          handled: true
        };
      }

      let numPages = 1;
      
      // Parse command arguments
      const args = context.args || [];
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        // Handle --num option
        if ((arg === '--num' || arg === '-n') && i + 1 < args.length) {
          const numValue = parseInt(args[i + 1], 10);
          if (isNaN(numValue) || numValue < 1 || numValue > 50) {
            return {
              success: false,
              message: `❌ **Invalid Number**\n\nNumber of pages to delete must be between 1 and 50. Got '${args[i + 1]}'`,
              handled: true
            };
          }
          numPages = numValue;
          i++; // Skip the number value
        }
        // Handle unknown options
        else if (arg.startsWith('-')) {
          return {
            success: false,
            message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /del-page [--num|-n n]`,
            handled: true
          };
        }
      }

      try {
        const updatedProject = { ...context.project };
        const pages = [...updatedProject.composition.pages];
        
        // Find selected page index
        const selectedPageId = updatedProject.appState?.selectedPageId;
        let selectedPageIndex = -1;
        
        if (selectedPageId) {
          selectedPageIndex = pages.findIndex((page: any) => page.id === selectedPageId);
        }
        
        // If no page selected or not found, default to first page
        if (selectedPageIndex === -1) {
          if (pages.length === 0) {
            return {
              success: false,
              message: '❌ **No Pages**\n\nThere are no pages to delete in this project.',
              handled: true
            };
          }
          selectedPageIndex = 0;
        }

        // Calculate how many pages we can actually delete
        const availablePages = pages.length - selectedPageIndex;
        const pagesToDelete = Math.min(numPages, availablePages);
        
        if (pagesToDelete === pages.length) {
          return {
            success: false,
            message: '❌ **Cannot Delete All Pages**\n\nYou cannot delete all pages from the project. At least one page must remain.',
            handled: true
          };
        }

        // Get names of pages being deleted for the success message
        const deletedPageNames = pages.slice(selectedPageIndex, selectedPageIndex + pagesToDelete)
          .map((page: any) => page.name);

        // Remove the pages
        pages.splice(selectedPageIndex, pagesToDelete);
        updatedProject.composition.pages = pages;

        // Update selected page to a valid one
        let newSelectedPage: any = null;
        if (pages.length > 0) {
          // Select the page at the same index, or the last page if index is out of bounds
          const newSelectedIndex = Math.min(selectedPageIndex, pages.length - 1);
          newSelectedPage = pages[newSelectedIndex];
          
          // Update app state
          if (updatedProject.appState && newSelectedPage) {
            updatedProject.appState.selectedPageId = newSelectedPage.id;
          }
        } else {
          // Clear selection if no pages left (though this shouldn't happen due to our check above)
          if (updatedProject.appState) {
            updatedProject.appState.selectedPageId = null;
          }
        }

        // Update the project
        context.updateProject(updatedProject);

        // Select the new page
        if (context.setSelectedPage && newSelectedPage) {
          context.setSelectedPage(newSelectedPage);
        }

        const pagesText = pagesToDelete === 1 ? 'page' : 'pages';
        const pagesList = deletedPageNames.length <= 3 
          ? deletedPageNames.join(', ') 
          : `${deletedPageNames.slice(0, 2).join(', ')} and ${deletedPageNames.length - 2} more`;
        
        return {
          success: true,
          message: `✅ **${pagesToDelete} ${pagesText.charAt(0).toUpperCase() + pagesText.slice(1)} Deleted**\n\nDeleted ${pagesText}: ${pagesList}. ${newSelectedPage ? `"${newSelectedPage.name}" is now selected.` : ''}`,
          handled: true
        };
      } catch (error) {
        console.error('Failed to delete page:', error);
        return {
          success: false,
          message: '❌ **Delete Failed**\n\nFailed to delete page(s). Please try again.',
          handled: true
        };
      }
    } catch (error) {
      console.error('Failed to handle del-page command:', error);
      return {
        success: false,
        message: '❌ **Command Failed**\n\nFailed to process del-page command. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Timeline zoom command - sets timeline zoom to specified percentage
 * Supports percentage parameter (e.g., /zoom-tl 50%)
 */
const zoomTimelineCommand: SlashCommand = {
  name: 'zoom-tl',
  description: 'Set timeline zoom level to specified percentage',
  usage: '/zoom-tl <percentage>',
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
      
      if (args.length === 0) {
        return {
          success: false,
          message: '❌ **Missing Parameter**\n\nPlease specify a zoom percentage. Usage: `/zoom-tl <percentage>`\n\nExample: `/zoom-tl 50%` or `/zoom-tl 150`',
          handled: true
        };
      }

      // Parse percentage parameter
      let percentageStr = args[0];
      let percentage: number;

      // Handle both "50%" and "50" formats
      if (percentageStr.endsWith('%')) {
        percentage = parseFloat(percentageStr.slice(0, -1));
      } else {
        percentage = parseFloat(percentageStr);
      }

      // Validate percentage
      if (isNaN(percentage) || percentage <= 0) {
        return {
          success: false,
          message: `❌ **Invalid Percentage**\n\nInvalid percentage value '${args[0]}'. Please provide a positive number.\n\nExample: \`/zoom-tl 50%\` or \`/zoom-tl 150\``,
          handled: true
        };
      }

      // Clamp percentage to reasonable bounds (10% to 1000%)
      const clampedPercentage = Math.max(10, Math.min(1000, percentage));
      const zoomLevel = clampedPercentage / 100;

      // Update project with new zoom level
      const updatedProject = {
        ...context.project,
        appState: {
          ...context.project.appState,
          zoomLevel: zoomLevel
        }
      };

      context.updateProject(updatedProject);

      // Show success message
      const actualPercentage = Math.round(clampedPercentage);
      let message = `🔍 **Timeline Zoom Updated**\n\nTimeline zoom set to ${actualPercentage}%.`;
      
      if (clampedPercentage !== percentage) {
        message += `\n\n⚠️ *Zoom level was clamped from ${percentage}% to ${actualPercentage}% (valid range: 10%-1000%)*`;
      }

      return {
        success: true,
        message,
        handled: true
      };
    } catch (error) {
      console.error('Failed to set timeline zoom:', error);
      return {
        success: false,
        message: '❌ **Zoom Failed**\n\nFailed to set timeline zoom level. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Set page properties command with support for all Page object properties
 * Supports --id, --name, --duration, --background-color, --after, --before options
 */
const setPageCommand: SlashCommand = {
  name: 'set-page',
  description: 'Set page properties including id, name, duration (supports human-readable formats), background color, and position',
  usage: '/set-page [--id|-i id] [--name|-n name] [--duration|-d duration] [--background-color|-bg color] [--after|-a id|n] [--before|-b id|n]',
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
          message: '❌ **Missing Parameters**\n\nPlease specify at least one option to set.\n\nUsage: `/set-page [--id|-i id] [--name|-n name] [--duration|-d duration] [--background-color|-bg color] [--after|-a id|n] [--before|-b id|n]`\n\nExamples:\n• `/set-page --name "New Title" --duration 3s`\n• `/set-page --duration 1.5m --background-color "#ff0000"`\n• `/set-page --after 1 --name "Moved Page"`',
          handled: true
        };
      }

      // Parse arguments
      const options: {
        id?: string;
        name?: string;
        duration?: number;
        backgroundColor?: string;
        after?: string;
        before?: string;
        targetPageId?: string;
      } = {};

      let targetPageId: string | null = null;
      
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--id':
          case '-i':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id "page-123"`',
                handled: true
              };
            }
            options.id = nextArg;
            i++; // Skip next arg
            break;

          case '--name':
          case '-n':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--name` requires a value.\n\nExample: `--name "Page Title"`',
                handled: true
              };
            }
            options.name = nextArg;
            i++; // Skip next arg
            break;

          case '--duration':
          case '-d':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--duration` requires a value.\n\nExamples:\n• `--duration 5000` (5000ms)\n• `--duration 5s` (5 seconds)\n• `--duration 1.5m` (1.5 minutes)',
                handled: true
              };
            }
            const duration = parseDuration(nextArg);
            if (duration === null || duration <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Duration**\n\nInvalid duration format: '${nextArg}'\n\nSupported formats:\n• Milliseconds: \`5000\` or \`5000ms\`\n• Seconds: \`5s\` or \`1.5s\`\n• Minutes: \`2m\` or \`1.5m\``,
                handled: true
              };
            }
            options.duration = duration;
            i++; // Skip next arg
            break;

          case '--background-color':
          case '-bg':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--background-color` requires a color value.\n\nExample: `--background-color "#ff0000"` or `--background-color "red"`',
                handled: true
              };
            }
            // Basic color validation (hex, rgb, or CSS color names)
            const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgb\(.*\)|rgba\(.*\)|[a-zA-Z]+)$/;
            if (!colorRegex.test(nextArg)) {
              return {
                success: false,
                message: `❌ **Invalid Color**\n\nInvalid color format: '${nextArg}'\n\nSupported formats:\n• Hex: \`#ff0000\`, \`#f00\`\n• RGB: \`rgb(255,0,0)\`\n• CSS names: \`red\`, \`blue\`, \`white\``,
                handled: true
              };
            }
            options.backgroundColor = nextArg;
            i++; // Skip next arg
            break;

          case '--after':
          case '-a':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--after` requires a page ID or relative position.\n\nExample: `--after "page-123"` or `--after 2`',
                handled: true
              };
            }
            options.after = nextArg;
            i++; // Skip next arg
            break;

          case '--before':
          case '-b':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--before` requires a page ID or relative position.\n\nExample: `--before "page-123"` or `--before 1`',
                handled: true
              };
            }
            options.before = nextArg;
            i++; // Skip next arg
            break;

          default:
            // First non-option argument is treated as target page ID
            if (!arg.startsWith('-') && !targetPageId) {
              targetPageId = arg;
            } else {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option: '${arg}'\n\nAvailable options: \`--id\`, \`--name\`, \`--duration\`, \`--background-color\`, \`--after\`, \`--before\``,
                handled: true
              };
            }
            break;
        }
      }

      const pages = [...context.project.composition.pages];
      let targetPageIndex = -1;

      // Find target page (current page if not specified)
      if (targetPageId) {
        targetPageIndex = pages.findIndex(p => p.id === targetPageId);
        if (targetPageIndex === -1) {
          return {
            success: false,
            message: `❌ **Page Not Found**\n\nPage with ID '${targetPageId}' not found.\n\nAvailable pages: ${pages.map(p => `"${p.id}"`).join(', ')}`,
            handled: true
          };
        }
      } else {
        // Use currently selected page or first page
        const selectedPageId = context.project.appState?.selectedPageId;
        if (selectedPageId) {
          targetPageIndex = pages.findIndex(p => p.id === selectedPageId);
        }
        if (targetPageIndex === -1) {
          targetPageIndex = 0; // Default to first page
        }
      }

      if (targetPageIndex === -1 || !pages[targetPageIndex]) {
        return {
          success: false,
          message: '❌ **No Target Page**\n\nNo page found to modify. Ensure the project has at least one page.',
          handled: true
        };
      }

      const targetPage = { ...pages[targetPageIndex] };
      const originalPage = { ...targetPage };
      let changes: string[] = [];

      // Apply property changes
      if (options.id !== undefined) {
        // Check ID uniqueness
        if (options.id !== targetPage.id && pages.some(p => p.id === options.id)) {
          return {
            success: false,
            message: `❌ **Duplicate ID**\n\nPage ID '${options.id}' already exists. Page IDs must be unique.\n\nExisting IDs: ${pages.map(p => `"${p.id}"`).join(', ')}`,
            handled: true
          };
        }
        targetPage.id = options.id;
        changes.push(`ID: "${originalPage.id}" → "${options.id}"`);
      }

      if (options.name !== undefined) {
        targetPage.name = options.name;
        changes.push(`Name: "${originalPage.name}" → "${options.name}"`);
      }

      if (options.duration !== undefined) {
        targetPage.duration = options.duration;
        const formatDuration = (ms: number): string => {
          if (ms >= 60000 && ms % 60000 === 0) {
            return `${ms / 60000}m`;
          } else if (ms >= 1000 && ms % 1000 === 0) {
            return `${ms / 1000}s`;
          }
          return `${ms}ms`;
        };
        changes.push(`Duration: ${formatDuration(originalPage.duration)} → ${formatDuration(options.duration)}`);
      }

      if (options.backgroundColor !== undefined) {
        targetPage.backgroundColor = options.backgroundColor;
        changes.push(`Background: "${originalPage.backgroundColor || 'default'}" → "${options.backgroundColor}"`);
      }

      // Handle positioning
      let newPageIndex = targetPageIndex;
      if (options.after !== undefined || options.before !== undefined) {
        const positionArg = options.after || options.before;
        const isAfter = options.after !== undefined;

        if (!positionArg) {
          return {
            success: false,
            message: '❌ **Missing Position Value**\n\nPosition argument is required for --after or --before options.',
            handled: true
          };
        }

        // Check if it's a numeric relative position
        const numericValue = parseInt(positionArg, 10);
        if (!isNaN(numericValue) && /^\d+$/.test(positionArg)) {
          // For --after: move numericValue positions forward
          // For --before: move numericValue positions backward  
          const offset = isAfter ? numericValue : -numericValue;
          newPageIndex = Math.max(0, Math.min(pages.length - 1, targetPageIndex + offset));
        } else {
          // Try to find page by ID
          const refPageIndex = pages.findIndex(p => p.id === positionArg);
          if (refPageIndex === -1) {
            return {
              success: false,
              message: `❌ **Reference Page Not Found**\n\nPage with ID '${positionArg}' not found for positioning.\n\nAvailable pages: ${pages.map(p => `"${p.id}"`).join(', ')}`,
              handled: true
            };
          }
          newPageIndex = isAfter ? refPageIndex + 1 : refPageIndex;
          newPageIndex = Math.max(0, Math.min(pages.length - 1, newPageIndex));
        }

        if (newPageIndex !== targetPageIndex) {
          changes.push(`Position: ${targetPageIndex + 1} → ${newPageIndex + 1}`);
        }
      }

      // Apply changes
      pages[targetPageIndex] = targetPage;

      // Handle repositioning
      if (newPageIndex !== targetPageIndex) {
        // Remove from old position
        const [pageToMove] = pages.splice(targetPageIndex, 1);
        // Insert at new position
        pages.splice(newPageIndex, 0, pageToMove);
      }

      // Update project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Generate success message
      const changesText = changes.length > 0 ? changes.join('\n• ') : 'No changes made';
      
      return {
        success: true,
        message: `✅ **Page Updated**\n\nPage "${targetPage.name}" has been updated:\n\n• ${changesText}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to set page properties:', error);
      return {
        success: false,
        message: '❌ **Set Page Failed**\n\nFailed to update page properties. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Create a new text element command
 * Supports --text, --font-size, --color, --font-family, --font-weight, --text-align, --left, --top, --width options
 * Height is automatically determined by fontSize and text content
 */
const newTextCommand: SlashCommand = {
  name: 'new-text',
  description: 'Add a new text element to the selected page',
  usage: '/new-text [--text|-t "text"] [--font-size|-fs size] [--color|-c color] [--font-family|-ff family] [--font-weight|-fw weight] [--text-align|-ta align] [--left|-l x] [--top|-tp y] [--width|-w width]',
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
      
      // Default text element properties
      const elementData: any = {
        type: 'text',
        text: 'New Text',
        left: 100,
        top: 100,
        width: 200,
        fontSize: 32,
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
        textAlign: 'left'
      };

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--text':
          case '-t':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--text` requires a value.\n\nExample: `--text "Hello World"`',
                handled: true
              };
            }
            elementData.text = nextArg;
            i++; // Skip next arg
            break;

          case '--font-size':
          case '-fs':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--font-size` requires a value.\n\nExample: `--font-size 24`',
                handled: true
              };
            }
            const fontSize = parseInt(nextArg, 10);
            if (isNaN(fontSize) || fontSize <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Font Size**\n\nFont size must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.fontSize = fontSize;
            i++; // Skip next arg
            break;

          case '--color':
          case '-c':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--color` requires a value.\n\nExamples: `--color "#ff0000"`, `--color "red"`, `--color "rgb(255,0,0)"`',
                handled: true
              };
            }
            elementData.color = nextArg;
            i++; // Skip next arg
            break;

          case '--font-family':
          case '-ff':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--font-family` requires a value.\n\nExample: `--font-family "Arial, sans-serif"`',
                handled: true
              };
            }
            elementData.fontFamily = nextArg;
            i++; // Skip next arg
            break;

          case '--font-weight':
          case '-fw':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--font-weight` requires a value.\n\nExamples: `--font-weight "bold"`, `--font-weight "normal"`, `--font-weight "600"`',
                handled: true
              };
            }
            elementData.fontWeight = nextArg;
            i++; // Skip next arg
            break;

          case '--text-align':
          case '-ta':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--text-align` requires a value.\n\nValid values: `left`, `center`, `right`',
                handled: true
              };
            }
            if (!['left', 'center', 'right'].includes(nextArg)) {
              return {
                success: false,
                message: `❌ **Invalid Text Align**\n\nText align must be 'left', 'center', or 'right'. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.textAlign = nextArg;
            i++; // Skip next arg
            break;

          case '--left':
          case '-l':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                handled: true
              };
            }
            const left = parseInt(nextArg, 10);
            if (isNaN(left)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.left = left;
            i++; // Skip next arg
            break;

          case '--top':
          case '-tp':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                handled: true
              };
            }
            const top = parseInt(nextArg, 10);
            if (isNaN(top)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.top = top;
            i++; // Skip next arg
            break;

          case '--width':
          case '-w':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 300`',
                handled: true
              };
            }
            const width = parseInt(nextArg, 10);
            if (isNaN(width) || width <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.width = width;
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /new-text without arguments to see usage.`,
                handled: true
              };
            }
            break;
        }
      }

      // Get selected page
      const selectedPageId = context.project.appState?.selectedPageId;
      if (!selectedPageId) {
        return {
          success: false,
          message: '❌ **No Page Selected**\n\nPlease select a page first before adding elements.',
          handled: true
        };
      }

      // Find the selected page
      const pages = [...context.project.composition.pages];
      const selectedPage = pages.find(page => page.id === selectedPageId);
      if (!selectedPage) {
        return {
          success: false,
          message: '❌ **Page Not Found**\n\nThe selected page could not be found.',
          handled: true
        };
      }

      // Create new element with unique ID
      const newElement = {
        id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...elementData
      };

      // Add element to page
      selectedPage.elements.push(newElement);

      // Update project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Text Element Added**\n\nAdded text element "${elementData.text}" to page "${selectedPage.name}"\n\n• Position: (${elementData.left}, ${elementData.top})\n• Width: ${elementData.width}px (height auto-calculated)\n• Font: ${elementData.fontSize}px ${elementData.fontFamily}\n• Color: ${elementData.color}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create text element:', error);
      return {
        success: false,
        message: '❌ **Text Creation Failed**\n\nFailed to create text element. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Create a new image element command
 * Supports --src, --left, --top, --width, --height, --opacity, --rotation options
 */
const newImageCommand: SlashCommand = {
  name: 'new-image',
  description: 'Add a new image element to the selected page',
  usage: '/new-image --src|-s url [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees]',
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
      
      // Default image element properties
      const elementData: any = {
        type: 'image',
        src: '',
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        opacity: 1,
        rotation: 0
      };

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
                message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/image.jpg"`',
                handled: true
              };
            }
            elementData.src = nextArg;
            i++; // Skip next arg
            break;

          case '--left':
          case '-l':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                handled: true
              };
            }
            const left = parseInt(nextArg, 10);
            if (isNaN(left)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.left = left;
            i++; // Skip next arg
            break;

          case '--top':
          case '-tp':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                handled: true
              };
            }
            const top = parseInt(nextArg, 10);
            if (isNaN(top)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.top = top;
            i++; // Skip next arg
            break;

          case '--width':
          case '-w':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 300`',
                handled: true
              };
            }
            const width = parseInt(nextArg, 10);
            if (isNaN(width) || width <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.width = width;
            i++; // Skip next arg
            break;

          case '--height':
          case '-h':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 250`',
                handled: true
              };
            }
            const height = parseInt(nextArg, 10);
            if (isNaN(height) || height <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Height**\n\nHeight must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.height = height;
            i++; // Skip next arg
            break;

          case '--opacity':
          case '-o':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--opacity` requires a value.\n\nExample: `--opacity 0.8` (0.0 to 1.0)',
                handled: true
              };
            }
            const opacity = parseFloat(nextArg);
            if (isNaN(opacity) || opacity < 0 || opacity > 1) {
              return {
                success: false,
                message: `❌ **Invalid Opacity**\n\nOpacity must be a number between 0.0 and 1.0. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.opacity = opacity;
            i++; // Skip next arg
            break;

          case '--rotation':
          case '-r':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--rotation` requires a value.\n\nExample: `--rotation 45` (degrees)',
                handled: true
              };
            }
            const rotation = parseInt(nextArg, 10);
            if (isNaN(rotation)) {
              return {
                success: false,
                message: `❌ **Invalid Rotation**\n\nRotation must be a number (degrees). Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.rotation = rotation;
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /new-image without arguments to see usage.`,
                handled: true
              };
            }
            break;
        }
      }

      // Validate required src parameter
      if (!elementData.src) {
        return {
          success: false,
          message: '❌ **Missing Image Source**\n\nImage source is required.\n\nUsage: `/new-image --src "https://example.com/image.jpg"`\n\nExample:\n• `/new-image --src "https://picsum.photos/300/200" --width 300 --height 200`',
          handled: true
        };
      }

      // Get selected page
      const selectedPageId = context.project.appState?.selectedPageId;
      if (!selectedPageId) {
        return {
          success: false,
          message: '❌ **No Page Selected**\n\nPlease select a page first before adding elements.',
          handled: true
        };
      }

      // Find the selected page
      const pages = [...context.project.composition.pages];
      const selectedPage = pages.find(page => page.id === selectedPageId);
      if (!selectedPage) {
        return {
          success: false,
          message: '❌ **Page Not Found**\n\nThe selected page could not be found.',
          handled: true
        };
      }

      // Create new element with unique ID
      const newElement = {
        id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...elementData
      };

      // Add element to page
      selectedPage.elements.push(newElement);

      // Update project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Image Element Added**\n\nAdded image element to page "${selectedPage.name}"\n\n• Source: ${elementData.src}\n• Position: (${elementData.left}, ${elementData.top})\n• Size: ${elementData.width}×${elementData.height}\n• Opacity: ${elementData.opacity}\n• Rotation: ${elementData.rotation}°`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create image element:', error);
      return {
        success: false,
        message: '❌ **Image Creation Failed**\n\nFailed to create image element. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Create a new video element command
 * Supports --src, --left, --top, --width, --height, --opacity, --rotation, --delay options
 */
const newVideoCommand: SlashCommand = {
  name: 'new-video',
  description: 'Add a new video element to the selected page',
  usage: '/new-video --src|-s url [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees] [--delay|-d milliseconds]',
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
      
      // Default video element properties
      const elementData: any = {
        type: 'video',
        src: '',
        left: 100,
        top: 100,
        width: 320,
        height: 240,
        opacity: 1,
        rotation: 0,
        delay: 0
      };

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
                message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/video.mp4"`',
                handled: true
              };
            }
            elementData.src = nextArg;
            i++; // Skip next arg
            break;

          case '--left':
          case '-l':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                handled: true
              };
            }
            const left = parseInt(nextArg, 10);
            if (isNaN(left)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.left = left;
            i++; // Skip next arg
            break;

          case '--top':
          case '-tp':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                handled: true
              };
            }
            const top = parseInt(nextArg, 10);
            if (isNaN(top)) {
              return {
                success: false,
                message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.top = top;
            i++; // Skip next arg
            break;

          case '--width':
          case '-w':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 640`',
                handled: true
              };
            }
            const width = parseInt(nextArg, 10);
            if (isNaN(width) || width <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.width = width;
            i++; // Skip next arg
            break;

          case '--height':
          case '-h':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 480`',
                handled: true
              };
            }
            const height = parseInt(nextArg, 10);
            if (isNaN(height) || height <= 0) {
              return {
                success: false,
                message: `❌ **Invalid Height**\n\nHeight must be a positive number. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.height = height;
            i++; // Skip next arg
            break;

          case '--opacity':
          case '-o':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--opacity` requires a value.\n\nExample: `--opacity 0.8` (0.0 to 1.0)',
                handled: true
              };
            }
            const opacity = parseFloat(nextArg);
            if (isNaN(opacity) || opacity < 0 || opacity > 1) {
              return {
                success: false,
                message: `❌ **Invalid Opacity**\n\nOpacity must be a number between 0.0 and 1.0. Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.opacity = opacity;
            i++; // Skip next arg
            break;

          case '--rotation':
          case '-r':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--rotation` requires a value.\n\nExample: `--rotation 45` (degrees)',
                handled: true
              };
            }
            const rotation = parseInt(nextArg, 10);
            if (isNaN(rotation)) {
              return {
                success: false,
                message: `❌ **Invalid Rotation**\n\nRotation must be a number (degrees). Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.rotation = rotation;
            i++; // Skip next arg
            break;

          case '--delay':
          case '-d':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--delay` requires a value.\n\nExample: `--delay 1000` (milliseconds)',
                handled: true
              };
            }
            const delay = parseInt(nextArg, 10);
            if (isNaN(delay) || delay < 0) {
              return {
                success: false,
                message: `❌ **Invalid Delay**\n\nDelay must be a non-negative number (milliseconds). Got '${nextArg}'`,
                handled: true
              };
            }
            elementData.delay = delay;
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /new-video without arguments to see usage.`,
                handled: true
              };
            }
            break;
        }
      }

      // Validate required src parameter
      if (!elementData.src) {
        return {
          success: false,
          message: '❌ **Missing Video Source**\n\nVideo source is required.\n\nUsage: `/new-video --src "https://example.com/video.mp4"`\n\nExample:\n• `/new-video --src "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" --width 640 --height 360`',
          handled: true
        };
      }

      // Get selected page
      const selectedPageId = context.project.appState?.selectedPageId;
      if (!selectedPageId) {
        return {
          success: false,
          message: '❌ **No Page Selected**\n\nPlease select a page first before adding elements.',
          handled: true
        };
      }

      // Find the selected page
      const pages = [...context.project.composition.pages];
      const selectedPage = pages.find(page => page.id === selectedPageId);
      if (!selectedPage) {
        return {
          success: false,
          message: '❌ **Page Not Found**\n\nThe selected page could not be found.',
          handled: true
        };
      }

      // Create new element with unique ID
      const newElement = {
        id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...elementData
      };

      // Add element to page
      selectedPage.elements.push(newElement);

      // Update project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      return {
        success: true,
        message: `✅ **Video Element Added**\n\nAdded video element to page "${selectedPage.name}"\n\n• Source: ${elementData.src}\n• Position: (${elementData.left}, ${elementData.top})\n• Size: ${elementData.width}×${elementData.height}\n• Opacity: ${elementData.opacity}\n• Rotation: ${elementData.rotation}°\n• Delay: ${elementData.delay}ms`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to create video element:', error);
      return {
        success: false,
        message: '❌ **Video Creation Failed**\n\nFailed to create video element. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Delete element command
 * Supports --id/-i option to specify element ID to delete
 */
const delElementCommand: SlashCommand = {
  name: 'del-elem',
  description: 'Delete an element from the composition by ID or delete the selected element',
  usage: '/del-elem [--id|-i element_id] [--yes|-y]',
  requiresConfirmation: false, // We'll handle confirmation conditionally
  confirmationMessage: 'Are you sure you want to delete this element? This action cannot be undone.',
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
      let elementId: string | null = null;
      let skipConfirmation = false;

      // If no arguments provided, try to use the selected element
      if (args.length === 0) {
        const selectedElementId = context.project.appState?.selectedElementId;
        if (selectedElementId) {
          elementId = selectedElementId;
        } else {
          return {
            success: false,
            message: '❌ **No Element Selected**\n\nNo element ID provided and no element is currently selected.\n\nOptions:\n• Select an element in the editor, then use `/del-elem`\n• Specify an element ID: `/del-elem --id element_id`\n\nExamples:\n• `/del-elem` (deletes selected element)\n• `/del-elem --id text-1234567890-abc123`\n• `/del-elem -i image-1234567890-def456`\n• `/del-elem --yes` (deletes selected element without confirmation)',
            handled: true
          };
        }
      } else {
        // Parse arguments when arguments are provided
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          const nextArg = args[i + 1];

          switch (arg) {
            case '--id':
            case '-i':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id text-1234567890-abc123`',
                  handled: true
                };
              }
              elementId = nextArg;
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
                  message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Usage: /del-elem [--id element_id] [--yes]`,
                  handled: true
                };
              }
              // If it's not an option, treat it as the element ID for convenience
              if (!elementId) {
                elementId = arg;
              }
              break;
          }
        }

        // Final check for element ID after parsing arguments
        if (!elementId) {
          // If --yes was provided but no ID, try to use selected element
          const selectedElementId = context.project.appState?.selectedElementId;
          if (selectedElementId) {
            elementId = selectedElementId;
          } else {
            return {
              success: false,
              message: '❌ **Missing Element ID**\n\nPlease specify an element ID to delete or select an element.\n\nUsage: `/del-elem [--id element_id] [--yes]`\n\nExamples:\n• `/del-elem --yes` (deletes selected element without confirmation)\n• `/del-elem --id text-123 --yes` (deletes specific element without confirmation)',
              handled: true
            };
          }
        }
      }

      // Handle confirmation unless --yes was provided
      if (!skipConfirmation) {
        // Use browser confirmation dialog
        const confirmMessage = 'Are you sure you want to delete this element? This action cannot be undone.';
        if (!confirm(confirmMessage)) {
          return {
            success: false,
            message: '⏸️ **Command Cancelled**\n\nElement deletion was cancelled.',
            handled: true
          };
        }
      }

      // Find the element across all pages
      let foundElement: any = null;
      let foundPage: any = null;
      let elementIndex = -1;

      const pages = context.project.composition.pages || [];
      for (const page of pages) {
        const index = page.elements.findIndex((el: any) => el.id === elementId);
        if (index !== -1) {
          foundElement = page.elements[index];
          foundPage = page;
          elementIndex = index;
          break;
        }
      }

      if (!foundElement) {
        return {
          success: false,
          message: `❌ **Element Not Found**\n\nNo element with ID '${elementId}' was found in the composition.\n\nTip: Use the properties panel to find element IDs, or check the composition structure.`,
          handled: true
        };
      }

      // Remove the element from the page
      foundPage.elements.splice(elementIndex, 1);

      // Update the project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Check if this was the selected element and determine message
      const wasSelected = context.project.appState?.selectedElementId === elementId;
      const deletionMethod = args.length === 0 ? 'selected element' : `element '${elementId}'`;

      // Clear selection if the deleted element was selected
      if (wasSelected) {
        const updatedProjectWithClearedSelection = {
          ...updatedProject,
          appState: {
            ...updatedProject.appState,
            selectedElementId: null
          }
        };
        context.updateProject(updatedProjectWithClearedSelection);
      }

      return {
        success: true,
        message: `✅ **Element Deleted**\n\nDeleted ${deletionMethod} (${foundElement.type}) from page "${foundPage.name}"\n\n• Element ID: ${elementId}\n• Element type: ${foundElement.type}\n• ${foundElement.text ? `Text: "${foundElement.text}"` : foundElement.src ? `Source: ${foundElement.src}` : 'Custom element'}\n• Page: ${foundPage.name}${wasSelected ? '\n• Selection cleared' : ''}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to delete element:', error);
      return {
        success: false,
        message: '❌ **Delete Failed**\n\nFailed to delete element. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Set text element properties command
 * Supports text-specific options and common element properties
 */
const setTextCommand: SlashCommand = {
  name: 'set-text',
  description: 'Modify properties of a text element',
  usage: '/set-text [--id|-i element_id] [--text|-t "text"] [--font-size|-fs size] [--color|-c color] [--font-family|-ff family] [--font-weight|-fw weight] [--text-align|-ta align] [--left|-l x] [--top|-tp y] [--width|-w width] [--opacity|-o opacity] [--rotation|-r degrees]',
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
      let elementId: string | null = null;
      const updates: any = {};

      // If no arguments provided, try to use the selected element
      if (args.length === 0) {
        const selectedElementId = context.project.appState?.selectedElementId;
        if (selectedElementId) {
          elementId = selectedElementId;
        } else {
          return {
            success: false,
            message: '❌ **No Element Selected**\n\nNo element ID provided and no element is currently selected.\n\nOptions:\n• Select a text element in the editor, then use `/set-text`\n• Specify an element ID: `/set-text --id element_id`\n\nExamples:\n• `/set-text --text "New content"`\n• `/set-text --id text-123 --font-size 48`',
            handled: true
          };
        }
      } else {
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
                  message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id text-1234567890-abc123`',
                  handled: true
                };
              }
              elementId = nextArg;
              i++; // Skip next arg
              break;

            case '--text':
            case '-t':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--text` requires a value.\n\nExample: `--text "Hello World"`',
                  handled: true
                };
              }
              updates.text = nextArg;
              i++; // Skip next arg
              break;

            case '--font-size':
            case '-fs':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--font-size` requires a value.\n\nExample: `--font-size 24`',
                  handled: true
                };
              }
              const fontSize = parseInt(nextArg, 10);
              if (isNaN(fontSize) || fontSize <= 0) {
                return {
                  success: false,
                  message: `❌ **Invalid Font Size**\n\nFont size must be a positive number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.fontSize = fontSize;
              i++; // Skip next arg
              break;

            case '--color':
            case '-c':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--color` requires a value.\n\nExample: `--color "#ff0000"`',
                  handled: true
                };
              }
              updates.color = nextArg;
              i++; // Skip next arg
              break;

            case '--font-family':
            case '-ff':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--font-family` requires a value.\n\nExample: `--font-family "Arial, sans-serif"`',
                  handled: true
                };
              }
              updates.fontFamily = nextArg;
              i++; // Skip next arg
              break;

            case '--font-weight':
            case '-fw':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--font-weight` requires a value.\n\nExample: `--font-weight "bold"`',
                  handled: true
                };
              }
              updates.fontWeight = nextArg;
              i++; // Skip next arg
              break;

            case '--text-align':
            case '-ta':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--text-align` requires a value.\n\nValid values: left, center, right',
                  handled: true
                };
              }
              if (!['left', 'center', 'right'].includes(nextArg)) {
                return {
                  success: false,
                  message: `❌ **Invalid Text Align**\n\nText align must be 'left', 'center', or 'right'. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.textAlign = nextArg;
              i++; // Skip next arg
              break;

            case '--left':
            case '-l':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                  handled: true
                };
              }
              const left = parseInt(nextArg, 10);
              if (isNaN(left)) {
                return {
                  success: false,
                  message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.left = left;
              i++; // Skip next arg
              break;

            case '--top':
            case '-tp':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                  handled: true
                };
              }
              const top = parseInt(nextArg, 10);
              if (isNaN(top)) {
                return {
                  success: false,
                  message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.top = top;
              i++; // Skip next arg
              break;

            case '--width':
            case '-w':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 300`',
                  handled: true
                };
              }
              const width = parseInt(nextArg, 10);
              if (isNaN(width) || width <= 0) {
                return {
                  success: false,
                  message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.width = width;
              i++; // Skip next arg
              break;

            case '--opacity':
            case '-o':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--opacity` requires a value.\n\nExample: `--opacity 0.8`',
                  handled: true
                };
              }
              const opacity = parseFloat(nextArg);
              if (isNaN(opacity) || opacity < 0 || opacity > 1) {
                return {
                  success: false,
                  message: `❌ **Invalid Opacity**\n\nOpacity must be between 0.0 and 1.0. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.opacity = opacity;
              i++; // Skip next arg
              break;

            case '--rotation':
            case '-r':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--rotation` requires a value.\n\nExample: `--rotation 45`',
                  handled: true
                };
              }
              const rotation = parseInt(nextArg, 10);
              if (isNaN(rotation)) {
                return {
                  success: false,
                  message: `❌ **Invalid Rotation**\n\nRotation must be a number (degrees). Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.rotation = rotation;
              i++; // Skip next arg
              break;

            default:
              if (arg.startsWith('-')) {
                return {
                  success: false,
                  message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /set-text without arguments to see usage.`,
                  handled: true
                };
              }
              // If it's not an option, treat it as the element ID for convenience
              if (!elementId) {
                elementId = arg;
              }
              break;
          }
        }

        // Final check for element ID after parsing arguments
        if (!elementId) {
          const selectedElementId = context.project.appState?.selectedElementId;
          if (selectedElementId) {
            elementId = selectedElementId;
          } else {
            return {
              success: false,
              message: '❌ **Missing Element ID**\n\nPlease specify an element ID or select an element.\n\nUsage: `/set-text [--id element_id] [options...]`\n\nExample: `/set-text --id text-123 --font-size 32`',
              handled: true
            };
          }
        }
      }

      // Check if we have any updates to apply
      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: '❌ **No Updates Specified**\n\nPlease specify at least one property to update.\n\nAvailable options: --text, --font-size, --color, --font-family, --font-weight, --text-align, --left, --top, --width, --opacity, --rotation',
          handled: true
        };
      }

      // Find the element across all pages
      let foundElement: any = null;
      let foundPage: any = null;
      let elementIndex = -1;

      const pages = context.project.composition.pages || [];
      for (const page of pages) {
        const index = page.elements.findIndex((el: any) => el.id === elementId);
        if (index !== -1) {
          foundElement = page.elements[index];
          foundPage = page;
          elementIndex = index;
          break;
        }
      }

      if (!foundElement) {
        return {
          success: false,
          message: `❌ **Element Not Found**\n\nNo element with ID '${elementId}' was found in the composition.`,
          handled: true
        };
      }

      // Verify it's a text element
      if (foundElement.type !== 'text') {
        return {
          success: false,
          message: `❌ **Wrong Element Type**\n\nElement '${elementId}' is a ${foundElement.type} element, not a text element.\n\nUse:\n• /set-text for text elements\n• /set-image for image elements\n• /set-video for video elements`,
          handled: true
        };
      }

      // Apply updates to the element
      Object.assign(foundElement, updates);

      // Update the project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Create summary of changes
      const changesList = Object.entries(updates).map(([key, value]) => {
        switch (key) {
          case 'text': return `Text: "${value}"`;
          case 'fontSize': return `Font size: ${value}px`;
          case 'color': return `Color: ${value}`;
          case 'fontFamily': return `Font family: ${value}`;
          case 'fontWeight': return `Font weight: ${value}`;
          case 'textAlign': return `Text align: ${value}`;
          case 'left': return `Left: ${value}px`;
          case 'top': return `Top: ${value}px`;
          case 'width': return `Width: ${value}px`;
          case 'opacity': return `Opacity: ${value}`;
          case 'rotation': return `Rotation: ${value}°`;
          default: return `${key}: ${value}`;
        }
      });

      return {
        success: true,
        message: `✅ **Text Element Updated**\n\nUpdated text element '${elementId}' on page "${foundPage.name}"\n\n• ${changesList.join('\n• ')}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update text element:', error);
      return {
        success: false,
        message: '❌ **Update Failed**\n\nFailed to update text element. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Set image element properties command
 * Supports image-specific options and common element properties
 */
const setImageCommand: SlashCommand = {
  name: 'set-image',
  description: 'Modify properties of an image element',
  usage: '/set-image [--id|-i element_id] [--src|-s url] [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees]',
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
      let elementId: string | null = null;
      const updates: any = {};

      // If no arguments provided, try to use the selected element
      if (args.length === 0) {
        const selectedElementId = context.project.appState?.selectedElementId;
        if (selectedElementId) {
          elementId = selectedElementId;
        } else {
          return {
            success: false,
            message: '❌ **No Element Selected**\n\nNo element ID provided and no element is currently selected.\n\nOptions:\n• Select an image element in the editor, then use `/set-image`\n• Specify an element ID: `/set-image --id element_id`\n\nExamples:\n• `/set-image --src "https://example.com/new-image.jpg"`\n• `/set-image --id image-123 --width 300`',
            handled: true
          };
        }
      } else {
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
                  message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id image-1234567890-abc123`',
                  handled: true
                };
              }
              elementId = nextArg;
              i++; // Skip next arg
              break;

            case '--src':
            case '-s':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/image.jpg"`',
                  handled: true
                };
              }
              updates.src = nextArg;
              i++; // Skip next arg
              break;

            case '--left':
            case '-l':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                  handled: true
                };
              }
              const left = parseInt(nextArg, 10);
              if (isNaN(left)) {
                return {
                  success: false,
                  message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.left = left;
              i++; // Skip next arg
              break;

            case '--top':
            case '-tp':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                  handled: true
                };
              }
              const top = parseInt(nextArg, 10);
              if (isNaN(top)) {
                return {
                  success: false,
                  message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.top = top;
              i++; // Skip next arg
              break;

            case '--width':
            case '-w':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 300`',
                  handled: true
                };
              }
              const width = parseInt(nextArg, 10);
              if (isNaN(width) || width <= 0) {
                return {
                  success: false,
                  message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.width = width;
              i++; // Skip next arg
              break;

            case '--height':
            case '-h':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 250`',
                  handled: true
                };
              }
              const height = parseInt(nextArg, 10);
              if (isNaN(height) || height <= 0) {
                return {
                  success: false,
                  message: `❌ **Invalid Height**\n\nHeight must be a positive number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.height = height;
              i++; // Skip next arg
              break;

            case '--opacity':
            case '-o':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--opacity` requires a value.\n\nExample: `--opacity 0.8`',
                  handled: true
                };
              }
              const opacity = parseFloat(nextArg);
              if (isNaN(opacity) || opacity < 0 || opacity > 1) {
                return {
                  success: false,
                  message: `❌ **Invalid Opacity**\n\nOpacity must be between 0.0 and 1.0. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.opacity = opacity;
              i++; // Skip next arg
              break;

            case '--rotation':
            case '-r':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--rotation` requires a value.\n\nExample: `--rotation 45`',
                  handled: true
                };
              }
              const rotation = parseInt(nextArg, 10);
              if (isNaN(rotation)) {
                return {
                  success: false,
                  message: `❌ **Invalid Rotation**\n\nRotation must be a number (degrees). Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.rotation = rotation;
              i++; // Skip next arg
              break;

            default:
              if (arg.startsWith('-')) {
                return {
                  success: false,
                  message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /set-image without arguments to see usage.`,
                  handled: true
                };
              }
              // If it's not an option, treat it as the element ID for convenience
              if (!elementId) {
                elementId = arg;
              }
              break;
          }
        }

        // Final check for element ID after parsing arguments
        if (!elementId) {
          const selectedElementId = context.project.appState?.selectedElementId;
          if (selectedElementId) {
            elementId = selectedElementId;
          } else {
            return {
              success: false,
              message: '❌ **Missing Element ID**\n\nPlease specify an element ID or select an element.\n\nUsage: `/set-image [--id element_id] [options...]`\n\nExample: `/set-image --id image-123 --width 300`',
              handled: true
            };
          }
        }
      }

      // Check if we have any updates to apply
      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: '❌ **No Updates Specified**\n\nPlease specify at least one property to update.\n\nAvailable options: --src, --left, --top, --width, --height, --opacity, --rotation',
          handled: true
        };
      }

      // Find the element across all pages
      let foundElement: any = null;
      let foundPage: any = null;
      let elementIndex = -1;

      const pages = context.project.composition.pages || [];
      for (const page of pages) {
        const index = page.elements.findIndex((el: any) => el.id === elementId);
        if (index !== -1) {
          foundElement = page.elements[index];
          foundPage = page;
          elementIndex = index;
          break;
        }
      }

      if (!foundElement) {
        return {
          success: false,
          message: `❌ **Element Not Found**\n\nNo element with ID '${elementId}' was found in the composition.`,
          handled: true
        };
      }

      // Verify it's an image element
      if (foundElement.type !== 'image') {
        return {
          success: false,
          message: `❌ **Wrong Element Type**\n\nElement '${elementId}' is a ${foundElement.type} element, not an image element.\n\nUse:\n• /set-text for text elements\n• /set-image for image elements\n• /set-video for video elements`,
          handled: true
        };
      }

      // Apply updates to the element
      Object.assign(foundElement, updates);

      // Update the project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Create summary of changes
      const changesList = Object.entries(updates).map(([key, value]) => {
        switch (key) {
          case 'src': return `Source: ${value}`;
          case 'left': return `Left: ${value}px`;
          case 'top': return `Top: ${value}px`;
          case 'width': return `Width: ${value}px`;
          case 'height': return `Height: ${value}px`;
          case 'opacity': return `Opacity: ${value}`;
          case 'rotation': return `Rotation: ${value}°`;
          default: return `${key}: ${value}`;
        }
      });

      return {
        success: true,
        message: `✅ **Image Element Updated**\n\nUpdated image element '${elementId}' on page "${foundPage.name}"\n\n• ${changesList.join('\n• ')}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update image element:', error);
      return {
        success: false,
        message: '❌ **Update Failed**\n\nFailed to update image element. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Set video element properties command
 * Supports video-specific options and common element properties
 */
const setVideoCommand: SlashCommand = {
  name: 'set-video',
  description: 'Modify properties of a video element',
  usage: '/set-video [--id|-i element_id] [--src|-s url] [--left|-l x] [--top|-tp y] [--width|-w width] [--height|-h height] [--opacity|-o opacity] [--rotation|-r degrees] [--delay|-d milliseconds]',
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
      let elementId: string | null = null;
      const updates: any = {};

      // If no arguments provided, try to use the selected element
      if (args.length === 0) {
        const selectedElementId = context.project.appState?.selectedElementId;
        if (selectedElementId) {
          elementId = selectedElementId;
        } else {
          return {
            success: false,
            message: '❌ **No Element Selected**\n\nNo element ID provided and no element is currently selected.\n\nOptions:\n• Select a video element in the editor, then use `/set-video`\n• Specify an element ID: `/set-video --id element_id`\n\nExamples:\n• `/set-video --src "https://example.com/new-video.mp4"`\n• `/set-video --id video-123 --delay 2000`',
            handled: true
          };
        }
      } else {
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
                  message: '❌ **Missing Value**\n\nOption `--id` requires a value.\n\nExample: `--id video-1234567890-abc123`',
                  handled: true
                };
              }
              elementId = nextArg;
              i++; // Skip next arg
              break;

            case '--src':
            case '-s':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--src` requires a value.\n\nExample: `--src "https://example.com/video.mp4"`',
                  handled: true
                };
              }
              updates.src = nextArg;
              i++; // Skip next arg
              break;

            case '--left':
            case '-l':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--left` requires a value.\n\nExample: `--left 150`',
                  handled: true
                };
              }
              const left = parseInt(nextArg, 10);
              if (isNaN(left)) {
                return {
                  success: false,
                  message: `❌ **Invalid Position**\n\nLeft position must be a number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.left = left;
              i++; // Skip next arg
              break;

            case '--top':
            case '-tp':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--top` requires a value.\n\nExample: `--top 200`',
                  handled: true
                };
              }
              const top = parseInt(nextArg, 10);
              if (isNaN(top)) {
                return {
                  success: false,
                  message: `❌ **Invalid Position**\n\nTop position must be a number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.top = top;
              i++; // Skip next arg
              break;

            case '--width':
            case '-w':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 640`',
                  handled: true
                };
              }
              const width = parseInt(nextArg, 10);
              if (isNaN(width) || width <= 0) {
                return {
                  success: false,
                  message: `❌ **Invalid Width**\n\nWidth must be a positive number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.width = width;
              i++; // Skip next arg
              break;

            case '--height':
            case '-h':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 480`',
                  handled: true
                };
              }
              const height = parseInt(nextArg, 10);
              if (isNaN(height) || height <= 0) {
                return {
                  success: false,
                  message: `❌ **Invalid Height**\n\nHeight must be a positive number. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.height = height;
              i++; // Skip next arg
              break;

            case '--opacity':
            case '-o':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--opacity` requires a value.\n\nExample: `--opacity 0.8`',
                  handled: true
                };
              }
              const opacity = parseFloat(nextArg);
              if (isNaN(opacity) || opacity < 0 || opacity > 1) {
                return {
                  success: false,
                  message: `❌ **Invalid Opacity**\n\nOpacity must be between 0.0 and 1.0. Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.opacity = opacity;
              i++; // Skip next arg
              break;

            case '--rotation':
            case '-r':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--rotation` requires a value.\n\nExample: `--rotation 45`',
                  handled: true
                };
              }
              const rotation = parseInt(nextArg, 10);
              if (isNaN(rotation)) {
                return {
                  success: false,
                  message: `❌ **Invalid Rotation**\n\nRotation must be a number (degrees). Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.rotation = rotation;
              i++; // Skip next arg
              break;

            case '--delay':
            case '-d':
              if (!nextArg) {
                return {
                  success: false,
                  message: '❌ **Missing Value**\n\nOption `--delay` requires a value.\n\nExample: `--delay 1000`',
                  handled: true
                };
              }
              const delay = parseInt(nextArg, 10);
              if (isNaN(delay) || delay < 0) {
                return {
                  success: false,
                  message: `❌ **Invalid Delay**\n\nDelay must be a non-negative number (milliseconds). Got '${nextArg}'`,
                  handled: true
                };
              }
              updates.delay = delay;
              i++; // Skip next arg
              break;

            default:
              if (arg.startsWith('-')) {
                return {
                  success: false,
                  message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Use /set-video without arguments to see usage.`,
                  handled: true
                };
              }
              // If it's not an option, treat it as the element ID for convenience
              if (!elementId) {
                elementId = arg;
              }
              break;
          }
        }

        // Final check for element ID after parsing arguments
        if (!elementId) {
          const selectedElementId = context.project.appState?.selectedElementId;
          if (selectedElementId) {
            elementId = selectedElementId;
          } else {
            return {
              success: false,
              message: '❌ **Missing Element ID**\n\nPlease specify an element ID or select an element.\n\nUsage: `/set-video [--id element_id] [options...]`\n\nExample: `/set-video --id video-123 --delay 2000`',
              handled: true
            };
          }
        }
      }

      // Check if we have any updates to apply
      if (Object.keys(updates).length === 0) {
        return {
          success: false,
          message: '❌ **No Updates Specified**\n\nPlease specify at least one property to update.\n\nAvailable options: --src, --left, --top, --width, --height, --opacity, --rotation, --delay',
          handled: true
        };
      }

      // Find the element across all pages
      let foundElement: any = null;
      let foundPage: any = null;
      let elementIndex = -1;

      const pages = context.project.composition.pages || [];
      for (const page of pages) {
        const index = page.elements.findIndex((el: any) => el.id === elementId);
        if (index !== -1) {
          foundElement = page.elements[index];
          foundPage = page;
          elementIndex = index;
          break;
        }
      }

      if (!foundElement) {
        return {
          success: false,
          message: `❌ **Element Not Found**\n\nNo element with ID '${elementId}' was found in the composition.`,
          handled: true
        };
      }

      // Verify it's a video element
      if (foundElement.type !== 'video') {
        return {
          success: false,
          message: `❌ **Wrong Element Type**\n\nElement '${elementId}' is a ${foundElement.type} element, not a video element.\n\nUse:\n• /set-text for text elements\n• /set-image for image elements\n• /set-video for video elements`,
          handled: true
        };
      }

      // Apply updates to the element
      Object.assign(foundElement, updates);

      // Update the project
      const updatedProject = {
        ...context.project,
        composition: {
          ...context.project.composition,
          pages: pages
        }
      };

      context.updateProject(updatedProject);

      // Create summary of changes
      const changesList = Object.entries(updates).map(([key, value]) => {
        switch (key) {
          case 'src': return `Source: ${value}`;
          case 'left': return `Left: ${value}px`;
          case 'top': return `Top: ${value}px`;
          case 'width': return `Width: ${value}px`;
          case 'height': return `Height: ${value}px`;
          case 'opacity': return `Opacity: ${value}`;
          case 'rotation': return `Rotation: ${value}°`;
          case 'delay': return `Delay: ${value}ms`;
          default: return `${key}: ${value}`;
        }
      });

      return {
        success: true,
        message: `✅ **Video Element Updated**\n\nUpdated video element '${elementId}' on page "${foundPage.name}"\n\n• ${changesList.join('\n• ')}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update video element:', error);
      return {
        success: false,
        message: '❌ **Update Failed**\n\nFailed to update video element. Please try again.',
        handled: true
      };
    }
  }
};

/**
 * Set composition properties command
 * Supports --title, --fps, --width, --height options
 */
const setCompCommand: SlashCommand = {
  name: 'set-comp',
  description: 'Set composition properties including title, fps, width, and height',
  usage: '/set-comp [--title|-t "title"] [--fps|-f fps] [--width|-w width] [--height|-h height]',
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
          message: '❌ **Missing Parameters**\n\nPlease specify at least one option to set.\n\nUsage: `/set-comp [--title|-t "title"] [--fps|-f fps] [--width|-w width] [--height|-h height]`\n\nExamples:\n• `/set-comp --title "My Video Project" --fps 60`\n• `/set-comp --width 3840 --height 2160`\n• `/set-comp -t "HD Video" -w 1920 -h 1080 -f 30`',
          handled: true
        };
      }

      const updates: any = {};
      let hasUpdates = false;

      // Parse arguments
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
          case '--title':
          case '-t':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--title` requires a value.\n\nExample: `--title "My Video Project"`',
                handled: true
              };
            }
            updates.title = nextArg;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          case '--fps':
          case '-f':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--fps` requires a value.\n\nExample: `--fps 60`',
                handled: true
              };
            }
            const fps = parseInt(nextArg, 10);
            if (isNaN(fps) || fps <= 0 || fps > 120) {
              return {
                success: false,
                message: `❌ **Invalid FPS**\n\nFPS must be a positive number between 1 and 120. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.fps = fps;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          case '--width':
          case '-w':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--width` requires a value.\n\nExample: `--width 1920`',
                handled: true
              };
            }
            const width = parseInt(nextArg, 10);
            if (isNaN(width) || width <= 0 || width > 7680) {
              return {
                success: false,
                message: `❌ **Invalid Width**\n\nWidth must be a positive number between 1 and 7680. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.width = width;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          case '--height':
          case '-h':
            if (!nextArg) {
              return {
                success: false,
                message: '❌ **Missing Value**\n\nOption `--height` requires a value.\n\nExample: `--height 1080`',
                handled: true
              };
            }
            const height = parseInt(nextArg, 10);
            if (isNaN(height) || height <= 0 || height > 4320) {
              return {
                success: false,
                message: `❌ **Invalid Height**\n\nHeight must be a positive number between 1 and 4320. Got '${nextArg}'`,
                handled: true
              };
            }
            updates.height = height;
            hasUpdates = true;
            i++; // Skip next arg
            break;

          default:
            if (arg.startsWith('-')) {
              return {
                success: false,
                message: `❌ **Unknown Option**\n\nUnknown option '${arg}'. Available options: --title, --fps, --width, --height`,
                handled: true
              };
            }
            break;
        }
      }

      if (!hasUpdates) {
        return {
          success: false,
          message: '❌ **No Updates Specified**\n\nPlease specify at least one property to update.\n\nAvailable options: --title, --fps, --width, --height',
          handled: true
        };
      }

      // Prepare updated project
      const updatedProject = { ...context.project };
      
      // Update project title if specified
      if (updates.title !== undefined) {
        updatedProject.name = updates.title;
      }

      // Update composition properties
      const composition = { ...updatedProject.composition };
      if (updates.fps !== undefined) {
        composition.fps = updates.fps;
      }
      if (updates.width !== undefined) {
        composition.width = updates.width;
      }
      if (updates.height !== undefined) {
        composition.height = updates.height;
      }
      
      updatedProject.composition = composition;

      // Update the project
      context.updateProject(updatedProject);

      // Create summary of changes
      const changesList: string[] = [];
      if (updates.title !== undefined) {
        changesList.push(`Title: "${context.project.name || 'Untitled'}" → "${updates.title}"`);
      }
      if (updates.fps !== undefined) {
        changesList.push(`FPS: ${context.project.composition.fps || 30} → ${updates.fps}`);
      }
      if (updates.width !== undefined) {
        changesList.push(`Width: ${context.project.composition.width || 1920}px → ${updates.width}px`);
      }
      if (updates.height !== undefined) {
        changesList.push(`Height: ${context.project.composition.height || 1080}px → ${updates.height}px`);
      }

      return {
        success: true,
        message: `✅ **Composition Updated**\n\nComposition properties have been updated:\n\n• ${changesList.join('\n• ')}`,
        handled: true
      };

    } catch (error) {
      console.error('Failed to update composition:', error);
      return {
        success: false,
        message: '❌ **Update Failed**\n\nFailed to update composition properties. Please try again.',
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
  ['export', exportCommand],
  ['share', shareCommand],
  ['new-page', newPageCommand],
  ['del-page', delPageCommand],
  ['zoom-tl', zoomTimelineCommand],
  ['set-page', setPageCommand],
  ['set-comp', setCompCommand],
  ['new-text', newTextCommand],
  ['new-image', newImageCommand],
  ['new-video', newVideoCommand],
  ['del-elem', delElementCommand],
  ['set-text', setTextCommand],
  ['set-image', setImageCommand],
  ['set-video', setVideoCommand]
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
    
    if (char === '"' && (i === 0 || argString[i - 1] !== '\\')) {
      // Toggle quote state for unescaped quotes
      inQuotes = !inQuotes;
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