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
  ['set-page', setPageCommand]
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